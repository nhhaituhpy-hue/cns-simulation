import { configurationsEqual, mergeDvor220Patch } from "./configuration";
import { cloneDvor220, createInitialDvor220State } from "./defaults";
import {
  appendDvor220Log,
  deriveDvor220Snapshot,
  getDvor220GroundCheckDurationMs,
  reconcileDvor220State,
} from "./engine";
import {
  getDvor220PermissionDecision,
  isDvor220LocalConnection,
  isDvor220MonitorEffectivelyBypassed,
} from "./permissions";
import {
  DVOR220_MONITOR_IDS,
  DVOR220_RF_OUTPUT_IDS,
  DVOR220_TRANSMITTER_IDS,
  type Dvor220Command,
  type Dvor220CommandResult,
  type Dvor220Configuration,
  type Dvor220DeviceState,
  type Dvor220Permission,
  type Dvor220TransmitterId,
  type Dvor220UserAccount,
} from "./types";
import { hasDvor220ConfigurationErrors, validateDvor220Configuration } from "./validation";

function failure(state: Dvor220DeviceState, error: string): Dvor220CommandResult {
  return { ok: false, state, error };
}

function success(state: Dvor220DeviceState): Dvor220CommandResult {
  return { ok: true, state };
}

function requirePermission(
  state: Dvor220DeviceState,
  permission: Dvor220Permission,
): string | null {
  const decision = getDvor220PermissionDecision(state, permission);
  return decision.allowed ? null : decision.reason ?? "Permission denied.";
}

function userSource(state: Dvor220DeviceState) {
  return state.session.username ? "PMDT" as const : "SYSTEM" as const;
}

function recordControl(state: Dvor220DeviceState, message: string) {
  appendDvor220Log(state, "control", message, userSource(state));
  if (state.session.username) state.session.lastActivityAtMs = state.nowMs;
}

function setAllRfOutputs(state: Dvor220DeviceState, transmitterId: Dvor220TransmitterId, on: boolean) {
  for (const output of DVOR220_RF_OUTPUT_IDS) state.transmitters[transmitterId].rfOutputs[output] = on;
}

function mainTransmitterId(state: Dvor220DeviceState): Dvor220TransmitterId {
  return DVOR220_TRANSMITTER_IDS.find((id) => state.transmitters[id].designation === "main") ?? "tx1";
}

function synchronizeRuntimeWithConfiguration(state: Dvor220DeviceState) {
  const running = state.configuration.running;
  if (running.station.equipmentVersion === "single") {
    state.transmitters.tx2.powerOn = false;
    state.transmitters.tx2.path = "disconnected";
    setAllRfOutputs(state, "tx2", false);
    state.transmitters.tx1.designation = "main";
    state.transmitters.tx2.designation = "standby";
  }
  state.power.batteryCapacityMs = running.battery.backupRuntimeMinutes * 60_000;
  state.power.batteryRemainingMs = Math.min(state.power.batteryRemainingMs, state.power.batteryCapacityMs);
  state.power.batteryPresent = running.optionalUnits.battery;
}

function restoreAfterReset(state: Dvor220DeviceState) {
  const mainId = mainTransmitterId(state);
  const standbyId = mainId === "tx1" ? "tx2" : "tx1";
  const configuration = state.configuration.running;
  const outputOn = configuration.station.transmitterOutputOnBoot;

  state.transmitters[mainId].powerOn = true;
  state.transmitters[mainId].path = "antenna";
  state.transmitters[mainId].reverseFaultLatched = false;
  setAllRfOutputs(state, mainId, outputOn);

  const standbyAvailable = configuration.station.equipmentVersion === "dual";
  const standbyOn = standbyAvailable && configuration.station.standbyMode === "hot";
  state.transmitters[standbyId].powerOn = standbyOn;
  state.transmitters[standbyId].path = standbyOn ? "load" : "disconnected";
  state.transmitters[standbyId].reverseFaultLatched = false;
  setAllRfOutputs(state, standbyId, standbyOn && outputOn);

  state.executive = {
    phase: "idle",
    pendingSinceMs: null,
    powerOnHoldoffUntilMs: configuration.monitor.powerOnHoldoffMs > 0
      ? state.nowMs + configuration.monitor.powerOnHoldoffMs
      : null,
    postChangeoverUntilMs: null,
    shutdownLockedUntilMs: null,
    changeoverCountSinceReset: 0,
    changeoverFlag: false,
    shutdownReason: null,
  };
}

function validateAccount(account: Dvor220UserAccount): string | null {
  if (!/^[A-Za-z][A-Za-z0-9]{0,15}$/.test(account.username)) {
    return "Username must start with a letter and contain at most 16 alphanumeric characters.";
  }
  if (account.password.length > 16) return "Password is limited to 16 characters.";
  if (account.level < 1 || account.level > 3) return "User level must be 1, 2 or 3.";
  return null;
}

function login(
  state: Dvor220DeviceState,
  username: string,
  password: string,
): Dvor220CommandResult {
  if (!state.connection.connected) return failure(state, "Connect to an equipment profile before login.");
  const normalized = username.trim().toLocaleLowerCase();
  const account = state.accounts.find(
    (candidate) => candidate.username.toLocaleLowerCase() === normalized && candidate.password === password,
  );
  if (!account) {
    state.session.failedLoginCount += 1;
    appendDvor220Log(state, "event", `Failed login attempt for ${username.trim() || "<blank>"}`, "PMDT");
    return failure(state, "Invalid username or password.");
  }
  state.session = {
    username: account.username,
    level: account.level,
    loggedInAtMs: state.nowMs,
    lastActivityAtMs: state.nowMs,
    failedLoginCount: state.session.failedLoginCount,
  };
  appendDvor220Log(state, "event", `User logged in: ${account.username}`, "PMDT");
  return success(state);
}

function applyCalibration(
  state: Dvor220DeviceState,
  command: Extract<Dvor220Command, { type: "calibrate" }>["calibration"],
): string | null {
  if (!Number.isFinite(command.indicatedValue) || !Number.isFinite(command.referenceValue)) {
    return "Calibration values must be finite numbers.";
  }
  if (command.kind !== "monitor" && command.indicatedValue === 0) {
    return "The indicated calibration value must not be zero.";
  }

  if (command.kind === "transmitter-reading") {
    const current = state.calibration.transmitterReadingFactors[command.transmitterId][command.output];
    state.calibration.transmitterReadingFactors[command.transmitterId][command.output] =
      current * command.referenceValue / command.indicatedValue;
    return null;
  }
  if (command.kind === "transmitter-setpoint") {
    const current = state.calibration.transmitterSetpointFactors[command.transmitterId][command.parameter];
    state.calibration.transmitterSetpointFactors[command.transmitterId][command.parameter] =
      current * command.referenceValue / command.indicatedValue;
    return null;
  }
  const offsets = state.calibration.monitorOffsets[command.monitorId][command.channelId];
  offsets[command.parameter] = (offsets[command.parameter] ?? 0) + command.referenceValue - command.indicatedValue;
  return null;
}

export function reduceDvor220Command(
  currentState: Dvor220DeviceState,
  command: Dvor220Command,
): Dvor220CommandResult {
  let state = cloneDvor220(currentState);

  switch (command.type) {
    case "connect": {
      state.connection = {
        connected: true,
        profile: cloneDvor220(command.profile),
        connectedAtMs: state.nowMs,
        txActive: true,
        rxActive: true,
      };
      appendDvor220Log(state, "event", `Connected to ${command.profile.name}`, "PMDT");
      if (command.profile.automaticLogin) {
        return login(
          state,
          command.profile.automaticLogin.username,
          command.profile.automaticLogin.password,
        );
      }
      return success(state);
    }

    case "disconnect": {
      if (state.connection.connected) appendDvor220Log(state, "event", "PMDT disconnected", "PMDT");
      state.connection = {
        connected: false,
        profile: null,
        connectedAtMs: null,
        txActive: false,
        rxActive: false,
      };
      state.session = {
        username: null,
        level: 0,
        loggedInAtMs: null,
        lastActivityAtMs: null,
        failedLoginCount: state.session.failedLoginCount,
      };
      return success(state);
    }

    case "login":
      return login(state, command.username, command.password);

    case "login-guest": {
      if (!state.connection.connected) return failure(state, "Connect before using guest access.");
      if (!state.configuration.running.system.allowGuestAccess) return failure(state, "Guest access is disabled.");
      state.session = {
        username: "Guest",
        level: 0,
        loggedInAtMs: state.nowMs,
        lastActivityAtMs: state.nowMs,
        failedLoginCount: state.session.failedLoginCount,
      };
      appendDvor220Log(state, "event", "Guest session opened", "PMDT");
      return success(state);
    }

    case "logout": {
      if (state.session.username) appendDvor220Log(state, "event", `User logged out: ${state.session.username}`, "PMDT");
      state.session = {
        username: null,
        level: 0,
        loggedInAtMs: null,
        lastActivityAtMs: null,
        failedLoginCount: state.session.failedLoginCount,
      };
      return success(state);
    }

    case "touch-activity":
      if (state.session.username) state.session.lastActivityAtMs = state.nowMs;
      return success(state);

    case "set-keylock": {
      state.keylock = command.mode;
      appendDvor220Log(state, "control", `Keylock changed to ${command.mode}`, "LMI");
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "select-main": {
      const denied = requirePermission(state, "control");
      if (denied) return failure(state, denied);
      if (state.configuration.running.station.equipmentVersion === "single" && command.transmitterId === "tx2") {
        return failure(state, "TX2 is unavailable in single-equipment configuration.");
      }
      for (const transmitterId of DVOR220_TRANSMITTER_IDS) {
        state.transmitters[transmitterId].designation = transmitterId === command.transmitterId ? "main" : "standby";
      }
      recordControl(state, `${command.transmitterId.toUpperCase()} selected as Main transmitter`);
      return success(state);
    }

    case "changeover": {
      const denied = requirePermission(state, "control");
      if (denied) return failure(state, denied);
      if (state.configuration.running.station.equipmentVersion === "single") {
        return failure(state, "Changeover is unavailable in single-equipment configuration.");
      }
      const snapshot = deriveDvor220Snapshot(state);
      const current = snapshot.activeTransmitterId;
      const next = DVOR220_TRANSMITTER_IDS.find((id) => id !== current);
      if (!current || !next) return failure(state, "No valid transmitter path is available for changeover.");
      state.transmitters[current].path = "load";
      state.transmitters[next].powerOn = true;
      state.transmitters[next].path = "antenna";
      if (!Object.values(state.transmitters[next].rfOutputs).some(Boolean)) setAllRfOutputs(state, next, true);
      state.executive.changeoverFlag = true;
      state.executive.phase = "post-changeover-holdoff";
      state.executive.pendingSinceMs = null;
      state.executive.postChangeoverUntilMs = state.nowMs + state.configuration.running.monitor.postChangeoverHoldoffMs;
      recordControl(state, `Manual changeover: ${current.toUpperCase()} to ${next.toUpperCase()}`);
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "set-transmitter-power": {
      const denied = requirePermission(state, "control");
      if (denied) return failure(state, denied);
      const runtime = state.transmitters[command.transmitterId];
      runtime.powerOn = command.on;
      if (!command.on) {
        runtime.path = "disconnected";
        setAllRfOutputs(state, command.transmitterId, false);
      } else if (runtime.path === "disconnected") {
        runtime.path = "load";
      }
      if (command.on && state.configuration.running.monitor.powerOnHoldoffMs > 0) {
        state.executive.powerOnHoldoffUntilMs = state.nowMs + state.configuration.running.monitor.powerOnHoldoffMs;
      }
      recordControl(state, `${command.transmitterId.toUpperCase()} power ${command.on ? "On" : "Off"}`);
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "set-rf-output": {
      const denied = requirePermission(state, "control");
      if (denied) return failure(state, denied);
      const runtime = state.transmitters[command.transmitterId];
      if (!runtime.powerOn && command.on) return failure(state, "Turn on transmitter DC power first.");
      runtime.rfOutputs[command.output] = command.on;
      recordControl(state, `${command.transmitterId.toUpperCase()} ${command.output} RF ${command.on ? "On" : "Off"}`);
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "set-monitor-bypass": {
      const denied = requirePermission(state, "control");
      if (denied) return failure(state, denied);
      const monitorIds = command.monitorId ? [command.monitorId] : DVOR220_MONITOR_IDS;
      for (const monitorId of monitorIds) state.monitors[monitorId].bypassRequested = command.bypass;
      recordControl(state, `${command.monitorId?.toUpperCase() ?? "All monitors"} set to ${command.bypass ? "Bypass" : "Auto"}`);
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "reset": {
      const denied = requirePermission(state, "control");
      if (denied) return failure(state, denied);
      if (
        state.executive.phase === "shutdown-locked" &&
        (state.executive.shutdownLockedUntilMs ?? Infinity) > state.nowMs
      ) return failure(state, "Reset is locked for at least 20 seconds after shutdown.");
      restoreAfterReset(state);
      recordControl(state, "System Reset");
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "fault-clear": {
      const denied = requirePermission(state, "control");
      if (denied) return failure(state, denied);
      const targets = command.transmitterId ? [command.transmitterId] : DVOR220_TRANSMITTER_IDS;
      for (const transmitterId of targets) state.transmitters[transmitterId].reverseFaultLatched = false;
      recordControl(state, `Fault Clear${command.transmitterId ? ` ${command.transmitterId.toUpperCase()}` : ""}`);
      return success(state);
    }

    case "patch-draft": {
      const denied = requirePermission(state, "configure");
      if (denied) return failure(state, denied);
      state.configuration.draft = mergeDvor220Patch<Dvor220Configuration>(
        state.configuration.draft,
        command.patch,
      );
      state.configuration.draftDirty = !configurationsEqual(state.configuration.draft, state.configuration.running);
      if (state.session.username) state.session.lastActivityAtMs = state.nowMs;
      return success(state);
    }

    case "replace-draft": {
      const denied = requirePermission(state, "configure");
      if (denied) return failure(state, denied);
      state.configuration.draft = cloneDvor220(command.configuration);
      state.configuration.draftDirty = !configurationsEqual(state.configuration.draft, state.configuration.running);
      return success(state);
    }

    case "reset-draft": {
      const denied = requirePermission(state, "configure");
      if (denied) return failure(state, denied);
      state.configuration.draft = cloneDvor220(state.configuration.running);
      state.configuration.draftDirty = false;
      return success(state);
    }

    case "apply-draft": {
      const denied = requirePermission(state, "configure");
      if (denied) return failure(state, denied);
      const issues = validateDvor220Configuration(state.configuration.draft);
      const firstError = issues.find((item) => item.severity === "error");
      if (firstError) return failure(state, `${firstError.path}: ${firstError.message}`);
      state.configuration.running = cloneDvor220(state.configuration.draft);
      state.configuration.draftDirty = false;
      state.configuration.flashDirty = !configurationsEqual(state.configuration.running, state.configuration.flash);
      synchronizeRuntimeWithConfiguration(state);
      recordControl(state, "Running configuration applied");
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "save-profile": {
      const denied = requirePermission(state, "configure");
      if (denied) return failure(state, denied);
      if (!state.configuration.flashDirty) return failure(state, "No running configuration changes require Profile Save.");
      state.configuration.flash = cloneDvor220(state.configuration.running);
      state.configuration.flashDirty = false;
      recordControl(state, "Running profile saved to non-volatile flash");
      return success(state);
    }

    case "load-configuration": {
      const denied = requirePermission(state, "configure");
      if (denied) return failure(state, denied);
      if (hasDvor220ConfigurationErrors(command.configuration)) {
        return failure(state, "The loaded configuration contains validation errors.");
      }
      state.configuration.running = cloneDvor220(command.configuration);
      state.configuration.draft = cloneDvor220(command.configuration);
      state.configuration.draftDirty = false;
      state.configuration.flashDirty = !configurationsEqual(command.configuration, state.configuration.flash);
      synchronizeRuntimeWithConfiguration(state);
      recordControl(state, "Configuration loaded into running memory");
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "power-cycle": {
      const flash = cloneDvor220(state.configuration.flash);
      const fresh = createInitialDvor220State({ nowMs: state.nowMs, configuration: flash });
      fresh.connection = cloneDvor220(state.connection);
      fresh.session = cloneDvor220(state.session);
      fresh.accounts = cloneDvor220(state.accounts);
      fresh.history = cloneDvor220(state.history);
      fresh.calibration = cloneDvor220(state.calibration);
      fresh.faults = cloneDvor220(state.faults);
      appendDvor220Log(fresh, "event", "Equipment power cycle restored the non-volatile profile");
      state = reconcileDvor220State(fresh);
      return success(state);
    }

    case "set-ac-available": {
      state.power.acAvailable = command.available;
      appendDvor220Log(state, command.available ? "event" : "alarm", `AC mains ${command.available ? "restored" : "failed"}`);
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "set-battery-remaining-minutes": {
      if (!Number.isFinite(command.minutes) || command.minutes < 0) return failure(state, "Battery time must be non-negative.");
      state.power.batteryRemainingMs = Math.min(command.minutes * 60_000, state.power.batteryCapacityMs);
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "set-temperature": {
      if (!Number.isFinite(command.temperatureC)) return failure(state, "Temperature must be a finite number.");
      state.transmitters[command.transmitterId].temperaturesC[command.unit] = command.temperatureC;
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "inject-fault": {
      if (command.fault.kind === "antenna-vswr" && (command.fault.antenna < 1 || command.fault.antenna > 48)) {
        return failure(state, "Antenna number must be from 1 to 48.");
      }
      state.faults = [...state.faults.filter((fault) => fault.id !== command.fault.id), cloneDvor220(command.fault)];
      if (
        command.fault.kind === "transmitter-unit" &&
        ["cma", "smaUsb", "smaLsb"].includes(command.fault.unit) &&
        ["alarm", "fault"].includes(command.fault.condition)
      ) state.transmitters[command.fault.transmitterId].reverseFaultLatched = true;
      appendDvor220Log(state, "alarm", `Injected fault: ${command.fault.id}`);
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "clear-fault": {
      const exists = state.faults.some((fault) => fault.id === command.faultId);
      state.faults = state.faults.filter((fault) => fault.id !== command.faultId);
      if (!exists) return failure(state, `Unknown fault: ${command.faultId}`);
      appendDvor220Log(state, "event", `Cleared fault: ${command.faultId}`);
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "clear-all-faults": {
      state.faults = [];
      state.environment.smoke = false;
      state.environment.intrusion = false;
      state.environment.temperatureC = 24;
      appendDvor220Log(state, "event", "All injected faults cleared");
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "inject-measurement": {
      const denied = requirePermission(state, "configure");
      if (denied) return failure(state, denied);
      if (!Number.isFinite(command.override.value)) {
        return failure(state, "Simulation measurement must be a finite number.");
      }
      const matches = (candidate: typeof command.override) => (
        candidate.monitorId === command.override.monitorId
        && candidate.channelId === command.override.channelId
        && candidate.parameter === command.override.parameter
      );
      state.measurementOverrides = [
        ...state.measurementOverrides.filter((candidate) => !matches(candidate)),
        cloneDvor220(command.override),
      ];
      recordControl(state, `Simulation parameter override applied: ${command.override.parameter}`);
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "clear-measurement": {
      const denied = requirePermission(state, "configure");
      if (denied) return failure(state, denied);
      state.measurementOverrides = state.measurementOverrides.filter(
        (override) => !(
          override.monitorId === command.monitorId
          && override.channelId === command.channelId
          && override.parameter === command.parameter
        ),
      );
      recordControl(state, `Simulation parameter reset: ${command.parameter}`);
      state = reconcileDvor220State(state);
      return success(state);
    }

    case "calibrate": {
      const denied = requirePermission(state, "calibrate");
      if (denied) return failure(state, denied);
      const error = applyCalibration(state, command.calibration);
      if (error) return failure(state, error);
      recordControl(state, `Calibration applied: ${command.calibration.kind}`);
      return success(state);
    }

    case "start-ground-check": {
      const denied = requirePermission(state, "calibrate");
      if (denied) return failure(state, denied);
      if (!isDvor220LocalConnection(state) || state.keylock !== "MAINT") {
        return failure(state, "Automatic ground check requires a local PMDT with the keylock in MAINT.");
      }
      if (!isDvor220MonitorEffectivelyBypassed(state)) return failure(state, "Ground check requires monitor bypass.");
      if (state.groundCheck.status === "running") return failure(state, "A ground check is already running.");
      const transmitterId = command.transmitterId ?? deriveDvor220Snapshot(state).activeTransmitterId;
      if (!transmitterId) return failure(state, "No transmitter is available for ground check.");
      state.groundCheck = {
        status: "running",
        transmitterId,
        startedAtMs: state.nowMs,
        completesAtMs: state.nowMs + getDvor220GroundCheckDurationMs(),
        points: [],
        withinTolerance: null,
      };
      recordControl(state, `Automatic ground error check started for ${transmitterId.toUpperCase()}`);
      return success(state);
    }

    case "add-user": {
      const denied = requirePermission(state, "manage-users");
      if (denied) return failure(state, denied);
      const error = validateAccount(command.account);
      if (error) return failure(state, error);
      if (state.accounts.length >= 16) return failure(state, "The maximum of 16 user accounts has been reached.");
      if (state.accounts.some((account) => account.username.toLocaleLowerCase() === command.account.username.toLocaleLowerCase())) {
        return failure(state, "Username already exists.");
      }
      state.accounts.push(cloneDvor220(command.account));
      recordControl(state, `User added: ${command.account.username} (Level ${command.account.level})`);
      return success(state);
    }

    case "delete-user": {
      const denied = requirePermission(state, "manage-users");
      if (denied) return failure(state, denied);
      if (state.session.username?.toLocaleLowerCase() === command.username.toLocaleLowerCase()) {
        return failure(state, "The active user cannot delete their own account.");
      }
      const before = state.accounts.length;
      state.accounts = state.accounts.filter(
        (account) => account.username.toLocaleLowerCase() !== command.username.toLocaleLowerCase(),
      );
      if (state.accounts.length === before) return failure(state, "User not found.");
      recordControl(state, `User deleted: ${command.username}`);
      return success(state);
    }

    case "change-password": {
      const denied = requirePermission(state, "manage-users");
      if (denied) return failure(state, denied);
      if (command.password.length > 16) return failure(state, "Password is limited to 16 characters.");
      const account = state.accounts.find(
        (candidate) => candidate.username.toLocaleLowerCase() === command.username.toLocaleLowerCase(),
      );
      if (!account) return failure(state, "User not found.");
      account.password = command.password;
      recordControl(state, `Password changed: ${account.username}`);
      return success(state);
    }
  }
}

export function getDvor220ConfigurationWarnings(configuration: Dvor220Configuration) {
  return validateDvor220Configuration(configuration).filter((item) => item.severity === "warning");
}
