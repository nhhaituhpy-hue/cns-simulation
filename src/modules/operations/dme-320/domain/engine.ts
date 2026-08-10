import {
  cloneDme320Config,
  createDefaultDme320Config,
  createEmptyReadings,
  createIdleDme320Calibration,
  createNormalAlarmStates,
  DEFAULT_DME320_ACCOUNTS,
} from "./defaults";
import { getDme320ChannelAllocation } from "./channel-allocation";
import { dme320FaultBlocksCalibrationStep } from "./faults";
import {
  deriveDme320MonitorReadings,
  deriveDme320OverallStatus,
  getDme320AntennaTransponder,
  maskDme320ReadingsForErpAlarm,
  nextDme320AlarmState,
} from "./measurements";
import {
  getDme320PermissionDenial,
  type Dme320Permission,
} from "./permissions";
import type {
  Dme320AlarmPhase,
  Dme320AlarmStates,
  Dme320BatteryState,
  Dme320Command,
  Dme320CommandResult,
  Dme320Config,
  Dme320Fault,
  Dme320LogCategory,
  Dme320ManualTestInput,
  Dme320ManualTestResult,
  Dme320MonitorChannel,
  Dme320MonitorChannelState,
  Dme320MonitorId,
  Dme320MonitorParameter,
  Dme320MonitorSelfTestState,
  Dme320MonitorState,
  Dme320SimulationState,
  Dme320TransponderId,
  Dme320TransponderState,
} from "./types";
import {
  assertValidDme320Config,
  validateDme320Account,
} from "./validation";

const MONITOR_IDS = ["mon1", "mon2"] as const;
const MONITOR_CHANNELS = ["executive", "standby"] as const;
const TRANSPONDER_IDS = ["tx1", "tx2"] as const;

function otherTransponder(id: Dme320TransponderId): Dme320TransponderId {
  return id === "tx1" ? "tx2" : "tx1";
}

function appendLog(
  state: Dme320SimulationState,
  category: Dme320LogCategory,
  message: string,
  userId = state.session.userId ?? "GUEST",
): void {
  state.logs.push({
    sequence: (state.logs.at(-1)?.sequence ?? 0) + 1,
    timestampMs: state.nowMs,
    category,
    message,
    userId,
  });
}

function createTransmitter(
  route: "antenna" | "load",
  powered: boolean,
): Dme320TransponderState {
  return {
    dcPower: powered ? "on" : "off",
    rfEnabled: powered,
    route,
    shutdown: false,
    shutdownCause: null,
    interlocked: false,
    temperatureC: 35,
    fanRunning: powered,
    present: true,
    squitterEnabled: true,
    identKeying: "on",
    rfLoopbackEnabled: false,
    spacingOffsetUs: 0,
  };
}

function createMonitorChannel(
  sourceTransponder: Dme320TransponderId,
  config: Dme320Config,
  nowMs: number,
): Dme320MonitorChannelState {
  return {
    sourceTransponder,
    readings: createEmptyReadings(nowMs),
    alarms: createNormalAlarmStates(config.monitor.limits, nowMs),
    overallStatus: "normal",
  };
}

function createMonitorSelfTest(
  config: Dme320Config,
  nowMs: number,
): Dme320MonitorSelfTestState {
  const allocation = getDme320ChannelAllocation(config.station.channel);
  return {
    timeDelayUs: allocation.nominalDelayUs + config.station.delayOffsetUs,
    pulseSpacingUs: allocation.replySpacingUs,
    normalResult: "normal",
    erroneousResult: "normal",
    pulseRiseUs: 2.5,
    pulseDurationUs: 3.5,
    pulseDecayUs: 2.5,
    updatedAtMs: nowMs,
  };
}

function createMonitor(
  mode: "auto" | "bypass",
  config: Dme320Config,
  nowMs: number,
): Dme320MonitorState {
  return {
    mode,
    present: true,
    hardwareFault: false,
    channels: {
      executive: createMonitorChannel("tx1", config, nowMs),
      standby: createMonitorChannel("tx2", config, nowMs),
    },
    selfTest: createMonitorSelfTest(config, nowMs),
  };
}

function createBattery(voltage: number): Dme320BatteryState {
  return {
    connected: true,
    voltage,
    currentA: 0,
    temperatureC: 25,
    charging: true,
    status: "normal",
  };
}

export interface CreateDme320SimulationOptions {
  nowMs?: number;
  config?: Dme320Config;
}

export function createDme320SimulationState(
  options: CreateDme320SimulationOptions = {},
): Dme320SimulationState {
  const nowMs = options.nowMs ?? 0;
  const config = cloneDme320Config(options.config ?? createDefaultDme320Config());
  assertValidDme320Config(config);
  const hotStandby = config.station.standbyMode === "hot";
  const monitorMode = config.station.bypassMonitorsOnBoot ? "bypass" : "auto";
  const outputOn = config.station.transmitterOutputOnBoot;

  const state: Dme320SimulationState = {
    nowMs,
    equipmentResetRevision: 0,
    keylock: "LOCAL",
    session: {
      userId: null,
      level: 0,
      origin: "local",
      loggedInAtMs: null,
      lastActivityAtMs: nowMs,
      failedLoginCount: 0,
    },
    accounts: DEFAULT_DME320_ACCOUNTS.map((account) => ({ ...account })),
    config: {
      draft: cloneDme320Config(config),
      running: cloneDme320Config(config),
      flash: cloneDme320Config(config),
      draftDirty: false,
      flashDirty: false,
    },
    mainTransponder: "tx1",
    transmitters: {
      tx1: createTransmitter("antenna", outputOn),
      tx2: createTransmitter("load", outputOn && hotStandby),
    },
    monitors: {
      mon1: createMonitor(monitorMode, config, nowMs),
      mon2: createMonitor(monitorMode, config, nowMs),
    },
    monitorAction: {
      votePendingSinceMs: null,
      automaticActionLatched: false,
      suppressedUntilMs: nowMs + config.monitor.powerOnHoldoffMs,
      automaticChangeovers: 0,
      automaticShutdowns: 0,
    },
    power: {
      acAvailable: true,
      source: "ac",
      batteries: {
        battery1: createBattery(config.battery.fullyChargedVoltage),
        battery2: createBattery(config.battery.fullyChargedVoltage),
      },
      lastUpdatedAtMs: nowMs,
    },
    environment: {
      present: config.environment.emuEnabled,
      smokeDetected: false,
      intrusionDetected: false,
      temperatureC: 24,
      analogInputsV: Array.from({ length: 8 }, () => 0),
      digitalInputs: Array.from({ length: 16 }, () => false),
      expansionDigitalInputs: Array.from({ length: 8 }, () => false),
      digitalOutputs: Array.from({ length: 8 }, () => false),
    },
    interlockActive: false,
    systemShutdown: false,
    serviceStatus: "normal",
    faults: [],
    measurementOverrides: [],
    calibration: createIdleDme320Calibration(),
    lastManualTest: null,
    lastCertification: null,
    logs: [],
  };

  return refreshDme320Simulation(state, false);
}

function batteryStatus(
  battery: Dme320BatteryState,
  config: Dme320Config["battery"],
): Dme320BatteryState["status"] {
  if (!battery.connected) return "unplugged";
  if (battery.voltage <= config.cutoffVoltage) return "cutoff";
  if (
    battery.voltage <= config.alarmVoltage ||
    battery.temperatureC >= config.alarmTemperatureC
  ) {
    return "alarm";
  }
  if (
    battery.voltage <= config.warningVoltage ||
    battery.temperatureC >= config.warningTemperatureC
  ) {
    return "warning";
  }
  return "normal";
}

function updatePowerForElapsedTime(
  state: Dme320SimulationState,
  elapsedMs: number,
): void {
  const config = state.config.running.battery;
  const hours = elapsedMs / 3_600_000;
  const batteries = Object.values(state.power.batteries);

  if (state.power.acAvailable) {
    state.power.source = "ac";
    for (const battery of batteries) {
      battery.charging = battery.connected && battery.voltage < config.fullyChargedVoltage;
      battery.currentA = battery.charging ? Math.min(5, config.chargingCurrentLimitA) : 0;
      if (battery.connected) {
        battery.voltage = Math.min(
          config.fullyChargedVoltage,
          battery.voltage + config.simulatedChargeVoltsPerHour * hours,
        );
      }
      battery.status = batteryStatus(battery, config);
    }
  } else {
    for (const battery of batteries) {
      battery.charging = false;
      if (battery.connected && battery.voltage > config.cutoffVoltage) {
        battery.currentA = -12;
        battery.voltage = Math.max(
          0,
          battery.voltage - config.simulatedDischargeVoltsPerHour * hours,
        );
      } else {
        battery.currentA = 0;
      }
      battery.status = batteryStatus(battery, config);
    }
    state.power.source = batteries.some(
      (battery) => battery.connected && battery.status !== "cutoff",
    )
      ? "battery"
      : "off";
  }

  if (state.power.source === "off" && !state.systemShutdown) {
    state.systemShutdown = true;
    for (const transmitter of Object.values(state.transmitters)) {
      transmitter.shutdown = true;
      transmitter.shutdownCause = "power";
      transmitter.dcPower = "off";
      transmitter.rfEnabled = false;
    }
    appendLog(state, "event", "Backup batteries reached cutoff; equipment shut down.", "SYSTEM");
  }
  state.power.lastUpdatedAtMs = state.nowMs;
}

function updateThermalState(
  state: Dme320SimulationState,
  elapsedMs: number,
): void {
  const hours = elapsedMs / 3_600_000;
  const thermal = state.config.running.thermal;
  for (const transmitterId of TRANSPONDER_IDS) {
    const transmitter = state.transmitters[transmitterId];
    const fanFault = state.faults.some(
      (fault) => fault.active && fault.kind === "fan-failure" && fault.target === transmitterId,
    );
    transmitter.fanRunning =
      transmitter.dcPower === "on" &&
      !fanFault &&
      (thermal.fanMode === "on" ||
        (thermal.fanMode === "auto" && transmitter.temperatureC >= thermal.fanStartC));

    if (transmitter.dcPower === "on") {
      transmitter.temperatureC += (transmitter.fanRunning ? -5 : 30) * hours;
      transmitter.temperatureC = Math.max(20, transmitter.temperatureC);
    }

    if (!transmitter.shutdown && transmitter.temperatureC >= thermal.txuShutdownC) {
      transmitter.shutdown = true;
      transmitter.shutdownCause = "thermal";
      transmitter.rfEnabled = false;
      appendLog(
        state,
        "alarm",
        `${transmitterId.toUpperCase()} thermal shutdown at ${transmitter.temperatureC.toFixed(1)} °C.`,
        "SYSTEM",
      );
    } else if (
      transmitter.shutdown &&
      transmitter.shutdownCause === "thermal" &&
      transmitter.temperatureC <= thermal.txuRestartC &&
      !fanFault &&
      state.power.source !== "off"
    ) {
      transmitter.shutdown = false;
      transmitter.shutdownCause = null;
      transmitter.rfEnabled = transmitter.dcPower === "on";
      appendLog(state, "event", `${transmitterId.toUpperCase()} thermal restart.`, "SYSTEM");
    }
  }
}

function transitionAlarmLogs(
  state: Dme320SimulationState,
  monitorId: Dme320MonitorId,
  channel: Dme320MonitorChannel,
  parameter: Dme320MonitorParameter,
  previousPhase: Dme320AlarmPhase,
  nextPhase: Dme320AlarmPhase,
): void {
  if (previousPhase === nextPhase) return;
  if (nextPhase === "active") {
    appendLog(
      state,
      "alarm",
      `${monitorId.toUpperCase()} ${channel} ${parameter} alarm active.`,
      "ALARM",
    );
  } else if (previousPhase === "active") {
    appendLog(
      state,
      "alarm",
      `${monitorId.toUpperCase()} ${channel} ${parameter} alarm cleared.`,
      "ALARM",
    );
  }
}

function updateMonitorSelfTest(
  state: Dme320SimulationState,
  monitorId: Dme320MonitorId,
): void {
  const monitor = state.monitors[monitorId];
  const generatorFault = state.faults.some(
    (fault) => fault.active && fault.kind === "rfg-failure" && fault.target === monitorId,
  );
  const result: Dme320MonitorSelfTestState["normalResult"] = !monitor.present
    ? "unplugged"
    : monitor.hardwareFault || generatorFault
      ? "alarm"
      : "normal";

  monitor.selfTest = {
    ...createMonitorSelfTest(state.config.running, state.nowMs),
    normalResult: result,
    erroneousResult: result,
  };
}

function evaluateMonitors(
  state: Dme320SimulationState,
  recordTransitions: boolean,
): void {
  for (const monitorId of MONITOR_IDS) {
    const monitor = state.monitors[monitorId];
    monitor.hardwareFault = state.faults.some(
      (fault) => fault.active && fault.kind === "monitor-failure" && fault.target === monitorId,
    );
    for (const channel of MONITOR_CHANNELS) {
      const previous = monitor.channels[channel];
      const derived = deriveDme320MonitorReadings(state, monitorId, channel);
      const nextAlarms = {} as Dme320AlarmStates;
      for (const parameter of Object.keys(state.config.running.monitor.limits) as Dme320MonitorParameter[]) {
        const limit = state.config.running.monitor.limits[parameter];
        const previousAlarm = previous.alarms[parameter];
        const nextAlarm = nextDme320AlarmState(
          previousAlarm,
          derived.readings[parameter],
          limit,
          state.nowMs,
          parameter === "identCode"
            ? state.config.running.monitor.identFaultDelayMs
            : undefined,
        );
        nextAlarms[parameter] = nextAlarm;
        if (recordTransitions) {
          transitionAlarmLogs(
            state,
            monitorId,
            channel,
            parameter,
            previousAlarm.phase,
            nextAlarm.phase,
          );
        }
      }
      const readings = maskDme320ReadingsForErpAlarm(
        derived.readings,
        nextAlarms.erpDb.phase,
      );
      monitor.channels[channel] = {
        sourceTransponder: derived.sourceTransponder,
        readings,
        alarms: nextAlarms,
        overallStatus: deriveDme320OverallStatus(
          Object.values(nextAlarms).map((alarm) => alarm.phase),
          monitor.present,
        ),
      };
    }
    updateMonitorSelfTest(state, monitorId);
  }
}

function monitorHasPrimaryVote(
  state: Dme320SimulationState,
  monitorId: Dme320MonitorId,
): boolean {
  const monitor = state.monitors[monitorId];
  if (monitor.mode !== "auto" || !monitor.present) return false;
  return Object.values(monitor.channels.executive.alarms).some(
    (alarm) => alarm.phase === "active" && alarm.classification === "primary",
  );
}

function severeFaultOnTransponder(
  state: Dme320SimulationState,
  transmitterId: Dme320TransponderId,
): boolean {
  return state.faults.some(
    (fault) =>
      fault.active &&
      fault.target === transmitterId &&
      ["txu-failure", "tcu-failure", "dcdc-failure"].includes(fault.kind),
  );
}

function automaticChangeoverAvailable(
  state: Dme320SimulationState,
  standbyId: Dme320TransponderId,
): boolean {
  const standby = state.transmitters[standbyId];
  return (
    state.power.source !== "off" &&
    standby.present &&
    !standby.shutdown &&
    !standby.interlocked &&
    !severeFaultOnTransponder(state, standbyId)
  );
}

function performAutomaticMonitorAction(state: Dme320SimulationState): void {
  const onAntenna = getDme320AntennaTransponder(state);
  const standbyId = otherTransponder(onAntenna);
  if (automaticChangeoverAvailable(state, standbyId)) {
    const failed = state.transmitters[onAntenna];
    const standby = state.transmitters[standbyId];
    failed.shutdown = true;
    failed.shutdownCause = "monitor";
    failed.rfEnabled = false;
    failed.dcPower = "off";
    failed.route = "load";
    standby.shutdown = false;
    standby.shutdownCause = null;
    standby.dcPower = "on";
    standby.rfEnabled = true;
    standby.route = "antenna";
    state.monitorAction.automaticChangeovers += 1;
    appendLog(
      state,
      "event",
      `Automatic changeover from ${onAntenna.toUpperCase()} to ${standbyId.toUpperCase()}.`,
      "SYSTEM",
    );
  } else {
    state.systemShutdown = true;
    for (const transmitter of Object.values(state.transmitters)) {
      transmitter.shutdown = true;
      transmitter.shutdownCause = "monitor";
      transmitter.dcPower = "off";
      transmitter.rfEnabled = false;
    }
    state.monitorAction.automaticShutdowns += 1;
    appendLog(state, "event", "Primary monitor alarm caused complete shutdown.", "SYSTEM");
  }
  state.monitorAction.automaticActionLatched = true;
  state.monitorAction.votePendingSinceMs = null;
  state.monitorAction.suppressedUntilMs =
    state.nowMs + state.config.running.monitor.postChangeoverHoldoffMs;
}

function evaluateMonitorAction(state: Dme320SimulationState): boolean {
  if (state.nowMs < state.monitorAction.suppressedUntilMs || state.systemShutdown) {
    return false;
  }
  const votes = MONITOR_IDS.map((monitorId) => monitorHasPrimaryVote(state, monitorId));
  const voteSatisfied = state.config.running.monitor.votingLogic === "AND"
    ? votes.every(Boolean)
    : votes.some(Boolean);

  if (!voteSatisfied) {
    state.monitorAction.votePendingSinceMs = null;
    state.monitorAction.automaticActionLatched = false;
    return false;
  }
  if (state.monitorAction.automaticActionLatched) return false;
  if (state.monitorAction.votePendingSinceMs === null) {
    state.monitorAction.votePendingSinceMs = state.nowMs;
    return false;
  }
  if (
    state.nowMs - state.monitorAction.votePendingSinceMs <
    state.config.running.monitor.monitorActionDelayMs
  ) {
    return false;
  }
  performAutomaticMonitorAction(state);
  return true;
}

function communicationFaultRequiresShutdown(state: Dme320SimulationState): boolean {
  const config = state.config.running.system;
  return state.faults.some((fault) => {
    if (!fault.active) return false;
    if (state.nowMs - fault.injectedAtMs < config.communicationFaultShutdownDelayMs) {
      return false;
    }
    return (
      (fault.kind === "rcu-link-failure" && config.shutdownOnRcuFault) ||
      (fault.kind === "lmi-link-failure" && config.shutdownOnLmiFault) ||
      (fault.kind === "csp-link-failure" && config.shutdownOnCspFault)
    );
  });
}

function enforceCommunicationShutdown(state: Dme320SimulationState): void {
  if (state.systemShutdown || !communicationFaultRequiresShutdown(state)) return;
  state.systemShutdown = true;
  for (const transmitter of Object.values(state.transmitters)) {
    transmitter.shutdown = true;
    transmitter.shutdownCause = "communication";
    transmitter.dcPower = "off";
    transmitter.rfEnabled = false;
  }
  appendLog(state, "event", "Configured communication fault shutdown executed.", "SYSTEM");
}

function updateServiceStatus(state: Dme320SimulationState): void {
  const antennaId = getDme320AntennaTransponder(state);
  const antennaTx = state.transmitters[antennaId];
  if (
    state.systemShutdown ||
    state.power.source === "off" ||
    antennaTx.dcPower === "off" ||
    !antennaTx.rfEnabled ||
    antennaTx.shutdown ||
    antennaTx.interlocked
  ) {
    state.serviceStatus = "shutdown";
    return;
  }
  const environmentEnabled = state.config.running.environment.emuEnabled;
  const environmentalAlarm = environmentEnabled && (
    state.environment.smokeDetected ||
    state.environment.intrusionDetected ||
    state.environment.temperatureC < -10 ||
    state.environment.temperatureC > 55 ||
    state.faults.some(
      (fault) => fault.active && ["emu-smoke", "emu-intrusion"].includes(fault.kind),
    )
  );
  if (environmentalAlarm) {
    state.serviceStatus = "alarm";
    return;
  }
  const executiveStatuses = MONITOR_IDS.map(
    (monitorId) => state.monitors[monitorId].channels.executive.overallStatus,
  );
  if (executiveStatuses.includes("alarm")) {
    state.serviceStatus = "alarm";
  } else if (
    executiveStatuses.includes("warning") ||
    state.power.source === "battery" ||
    (environmentEnabled && !state.environment.present) ||
    state.keylock === "MAINT"
  ) {
    state.serviceStatus = "warning";
  } else {
    state.serviceStatus = "normal";
  }
}

function enforceAutomaticLogout(state: Dme320SimulationState): void {
  const minutes = state.config.running.system.automaticLogoutMinutes;
  if (
    minutes <= 0 ||
    state.session.level === 0 ||
    state.nowMs - state.session.lastActivityAtMs < minutes * 60_000
  ) {
    return;
  }
  appendLog(state, "authentication", "Session logged out automatically.", state.session.userId ?? "SYSTEM");
  state.session.userId = null;
  state.session.level = 0;
  state.session.loggedInAtMs = null;
}

export function refreshDme320Simulation(
  source: Dme320SimulationState,
  recordTransitions = true,
): Dme320SimulationState {
  const state = structuredClone(source);
  evaluateMonitors(state, recordTransitions);
  const actionExecuted = evaluateMonitorAction(state);
  if (actionExecuted) evaluateMonitors(state, recordTransitions);
  enforceCommunicationShutdown(state);
  enforceAutomaticLogout(state);
  updateServiceStatus(state);
  return state;
}

export function advanceDme320Simulation(
  source: Dme320SimulationState,
  toMs: number,
): Dme320SimulationState {
  if (!Number.isFinite(toMs) || toMs < source.nowMs) {
    throw new RangeError("Simulation time can only advance to a finite future timestamp.");
  }
  const state = structuredClone(source);
  const elapsedMs = toMs - state.nowMs;
  state.nowMs = toMs;
  updatePowerForElapsedTime(state, elapsedMs);
  updateThermalState(state, elapsedMs);
  return refreshDme320Simulation(state);
}

function permissionForCommand(command: Dme320Command): Dme320Permission | null {
  switch (command.type) {
    case "add-account":
    case "delete-account":
      return "user-administration";
    case "start-calibration":
    case "run-calibration-step":
    case "skip-calibration-step":
    case "run-manual-test":
    case "run-certification":
    case "set-transponder-squitter":
    case "set-transponder-ident-keying":
    case "set-transponder-rf-loopback":
    case "set-transponder-spacing-offset":
      return "maintenance";
    case "set-draft-config":
    case "restore-draft":
    case "apply-draft":
    case "load-running-config":
      return "setup";
    case "save-running-to-flash":
    case "reboot":
      return "profile";
    case "set-monitor-mode":
    case "select-main":
    case "changeover":
    case "reset-system":
    case "set-transponder-power":
    case "set-transponder-rf":
    case "set-interlock":
      return "basic-control";
    default:
      return null;
  }
}

function reject(
  state: Dme320SimulationState,
  message: string,
): Dme320CommandResult {
  return { state, accepted: false, message };
}

function accept(
  state: Dme320SimulationState,
  message: string,
  refresh = true,
): Dme320CommandResult {
  return {
    state: refresh ? refreshDme320Simulation(state) : state,
    accepted: true,
    message,
  };
}

function touchSession(state: Dme320SimulationState): void {
  if (state.session.level > 0) state.session.lastActivityAtMs = state.nowMs;
}

function resetEquipmentFromRunningConfig(state: Dme320SimulationState): void {
  const config = state.config.running;
  state.equipmentResetRevision += 1;
  const mainId = state.mainTransponder;
  const standbyId = otherTransponder(mainId);
  const outputOn = config.station.transmitterOutputOnBoot && state.power.source !== "off";
  const hot = config.station.standbyMode === "hot";
  state.transmitters[mainId] = createTransmitter("antenna", outputOn);
  state.transmitters[standbyId] = createTransmitter("load", outputOn && hot);
  state.systemShutdown = false;
  state.monitorAction.votePendingSinceMs = null;
  state.monitorAction.automaticActionLatched = false;
  state.monitorAction.suppressedUntilMs =
    state.nowMs + config.monitor.powerOnHoldoffMs;
  if (config.station.bypassMonitorsOnBoot) {
    state.monitors.mon1.mode = "bypass";
    state.monitors.mon2.mode = "bypass";
  }
  if (state.interlockActive && config.station.interlockEnabled && state.keylock !== "MAINT") {
    for (const transmitter of Object.values(state.transmitters)) {
      transmitter.interlocked = true;
      transmitter.rfEnabled = false;
    }
  }
}

export function replaceDme320Configuration(
  source: Dme320SimulationState,
  running: Dme320Config,
  flash: Dme320Config,
): Dme320SimulationState {
  const state = structuredClone(source);
  state.config = {
    draft: cloneDme320Config(running),
    running: cloneDme320Config(running),
    flash: cloneDme320Config(flash),
    draftDirty: false,
    flashDirty: JSON.stringify(running) !== JSON.stringify(flash),
  };
  resetEquipmentFromRunningConfig(state);
  return refreshDme320Simulation(state, false);
}

function manualChangeover(state: Dme320SimulationState): boolean {
  if (state.faults.some((fault) => fault.active && fault.kind === "coax-relay-failure")) {
    appendLog(state, "event", "Changeover command failed: coaxial relay fault.", "SYSTEM");
    return false;
  }
  const current = getDme320AntennaTransponder(state);
  const nextId = otherTransponder(current);
  const next = state.transmitters[nextId];
  if (
    !next.present ||
    next.shutdown ||
    next.interlocked ||
    severeFaultOnTransponder(state, nextId)
  ) {
    appendLog(state, "event", `Changeover to ${nextId.toUpperCase()} rejected: transmitter unavailable.`);
    return false;
  }
  state.transmitters[current].route = "load";
  next.route = "antenna";
  next.dcPower = "on";
  next.rfEnabled = true;
  next.shutdown = false;
  next.shutdownCause = null;
  state.monitorAction.suppressedUntilMs =
    state.nowMs + state.config.running.monitor.postChangeoverHoldoffMs;
  appendLog(state, "control", `Manual changeover to ${nextId.toUpperCase()}.`);
  return true;
}

function normalizeAccountId(userId: string): string {
  return userId.trim().toLowerCase();
}

function environmentChangesError(
  changes: Partial<Dme320SimulationState["environment"]>,
): string | null {
  if (
    changes.temperatureC !== undefined &&
    (!Number.isFinite(changes.temperatureC) || changes.temperatureC < -100 || changes.temperatureC > 200)
  ) {
    return "Environment temperature must be between -100 and 200 degrees Celsius.";
  }
  const arrays: Array<[unknown, number, string, "boolean" | "number"]> = [
    [changes.analogInputsV, 8, "analogInputsV", "number"],
    [changes.digitalInputs, 16, "digitalInputs", "boolean"],
    [changes.expansionDigitalInputs, 8, "expansionDigitalInputs", "boolean"],
    [changes.digitalOutputs, 8, "digitalOutputs", "boolean"],
  ];
  for (const [value, length, label, itemType] of arrays) {
    if (value === undefined) continue;
    if (
      !Array.isArray(value) ||
      value.length !== length ||
      value.some((item) => typeof item !== itemType || (itemType === "number" && !Number.isFinite(item)))
    ) {
      return `${label} must contain exactly ${length} valid values.`;
    }
  }
  return null;
}

function manualTestResult(
  state: Dme320SimulationState,
  input: Dme320ManualTestInput,
): Dme320ManualTestResult {
  const tx = state.transmitters[input.transponderId];
  const nominalSpacing = state.config.running.station.channel.suffix === "X" ? 12 : 36;
  const levelPass = input.interrogationLevelDbm >= state.config.running.station.sensitivityDbm;
  const spacingPass = Math.abs(input.spacingUs - nominalSpacing) <= 1;
  const ratePass = input.interrogationPulseRatePps >= 0 && input.interrogationPulseRatePps <= 5_400;
  const monitorPass = state.monitors[input.monitorId].present && !state.monitors[input.monitorId].hardwareFault;
  const txPass = tx.present && tx.dcPower === "on" && !severeFaultOnTransponder(state, input.transponderId);
  let efficiencyPct = levelPass && spacingPass && ratePass && monitorPass && txPass ? 98 : 0;
  if (
    state.faults.some(
      (fault) => fault.active && fault.kind === "rxu-sensitivity" && fault.target === input.transponderId,
    )
  ) {
    efficiencyPct = Math.min(efficiencyPct, 50);
  }
  return {
    input: structuredClone(input),
    replyCount: Math.round(input.interrogationCount * (efficiencyPct / 100)),
    efficiencyPct,
    passed: efficiencyPct >= 70,
    executedAtMs: state.nowMs,
  };
}

function valueIsOutsideAlarmRange(
  value: number | string,
  limit: Dme320Config["monitor"]["limits"][Dme320MonitorParameter],
): boolean {
  if (typeof limit.nominal === "string") {
    return String(value).toUpperCase() !== limit.nominal.toUpperCase();
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return true;
  return (
    (limit.alarmLow !== null && value < limit.alarmLow) ||
    (limit.alarmHigh !== null && value > limit.alarmHigh)
  );
}

export function executeDme320Command(
  source: Dme320SimulationState,
  command: Dme320Command,
): Dme320CommandResult {
  if (command.type === "advance-time") {
    try {
      return {
        state: advanceDme320Simulation(source, command.toMs),
        accepted: true,
        message: `Simulation advanced to ${command.toMs} ms.`,
      };
    } catch (error) {
      return reject(source, error instanceof Error ? error.message : "Invalid simulation time.");
    }
  }

  const state = structuredClone(source);
  const permission = permissionForCommand(command);
  if (permission) {
    const denial = getDme320PermissionDenial(state, permission);
    if (denial) return reject(source, denial);
  }
  touchSession(state);

  switch (command.type) {
    case "set-keylock": {
      state.keylock = command.mode;
      if (command.mode === "MAINT") {
        state.monitors.mon1.mode = "bypass";
        state.monitors.mon2.mode = "bypass";
        for (const transmitter of Object.values(state.transmitters)) {
          transmitter.interlocked = false;
        }
      } else if (state.interlockActive && state.config.running.station.interlockEnabled) {
        for (const transmitter of Object.values(state.transmitters)) {
          transmitter.interlocked = true;
          transmitter.rfEnabled = false;
        }
      }
      appendLog(state, "control", `Keylock changed to ${command.mode}.`, "LOCAL");
      return accept(state, `Keylock is ${command.mode}.`);
    }

    case "login": {
      const userId = normalizeAccountId(command.userId);
      const account = state.accounts.find(
        (candidate) => normalizeAccountId(candidate.userId) === userId,
      );
      if (!account || account.password !== command.password) {
        state.session.failedLoginCount += 1;
        appendLog(state, "authentication", `Failed login for ${command.userId}.`, command.userId || "UNKNOWN");
        return reject(state, "Invalid user ID or password.");
      }
      state.session = {
        userId: account.userId,
        level: account.level,
        origin: command.origin,
        loggedInAtMs: state.nowMs,
        lastActivityAtMs: state.nowMs,
        failedLoginCount: state.session.failedLoginCount,
      };
      appendLog(state, "authentication", `${account.userId} logged in at level ${account.level}.`);
      return accept(state, "Login successful.", false);
    }

    case "login-as-guest": {
      if (!state.config.running.system.allowGuestAccess) {
        return reject(source, "Guest access is disabled.");
      }
      state.session = {
        userId: null,
        level: 0,
        origin: command.origin,
        loggedInAtMs: state.nowMs,
        lastActivityAtMs: state.nowMs,
        failedLoginCount: state.session.failedLoginCount,
      };
      appendLog(state, "authentication", "Guest session opened.", "GUEST");
      return accept(state, "Guest session opened.", false);
    }

    case "logout": {
      appendLog(state, "authentication", "Session logged out.");
      state.session.userId = null;
      state.session.level = 0;
      state.session.loggedInAtMs = null;
      return accept(state, "Logged out.", false);
    }

    case "add-account": {
      const issues = validateDme320Account(command.account);
      if (issues.length > 0) return reject(source, issues.map((issue) => issue.message).join(" "));
      const normalized = normalizeAccountId(command.account.userId);
      if (state.accounts.some((account) => normalizeAccountId(account.userId) === normalized)) {
        return reject(source, "User ID already exists.");
      }
      state.accounts.push({ ...command.account, userId: command.account.userId.trim() });
      appendLog(state, "control", `User ${command.account.userId} added at level ${command.account.level}.`);
      return accept(state, "Account added.", false);
    }

    case "delete-account": {
      const normalized = normalizeAccountId(command.userId);
      const target = state.accounts.find((account) => normalizeAccountId(account.userId) === normalized);
      if (!target) return reject(source, "Account was not found.");
      if (normalizeAccountId(state.session.userId ?? "") === normalized) {
        return reject(source, "The active account cannot delete itself.");
      }
      if (target.level === 3 && state.accounts.filter((account) => account.level === 3).length === 1) {
        return reject(source, "The final level-3 account cannot be deleted.");
      }
      state.accounts = state.accounts.filter(
        (account) => normalizeAccountId(account.userId) !== normalized,
      );
      appendLog(state, "control", `User ${target.userId} deleted.`);
      return accept(state, "Account deleted.", false);
    }

    case "set-monitor-mode": {
      if (state.keylock === "MAINT" && command.mode === "auto") {
        return reject(source, "Monitors remain bypassed while keylock is MAINT.");
      }
      state.monitors[command.monitorId].mode = command.mode;
      state.monitorAction.votePendingSinceMs = null;
      state.monitorAction.automaticActionLatched = false;
      appendLog(state, "control", `${command.monitorId.toUpperCase()} set to ${command.mode}.`);
      return accept(state, "Monitor mode changed.");
    }

    case "select-main": {
      state.mainTransponder = command.transponderId;
      appendLog(state, "control", `${command.transponderId.toUpperCase()} selected as main.`);
      return accept(state, "Main transponder selected.", false);
    }

    case "changeover": {
      const changed = manualChangeover(state);
      return changed
        ? accept(state, "Changeover completed.")
        : reject(refreshDme320Simulation(state), "Changeover failed.");
    }

    case "reset-system": {
      resetEquipmentFromRunningConfig(state);
      appendLog(state, "control", "System reset executed.");
      return accept(state, "System reset completed.");
    }

    case "set-transponder-power": {
      const transmitter = state.transmitters[command.transponderId];
      if (command.on && state.power.source === "off") return reject(source, "No power source is available.");
      if (command.on && (state.systemShutdown || transmitter.shutdown)) {
        return reject(source, "A latched shutdown must be cleared with System Reset before power is restored.");
      }
      transmitter.dcPower = command.on ? "on" : "off";
      if (!command.on) transmitter.rfEnabled = false;
      appendLog(state, "control", `${command.transponderId.toUpperCase()} power ${command.on ? "ON" : "OFF"}.`);
      return accept(state, "Transponder power changed.");
    }

    case "set-transponder-rf": {
      const transmitter = state.transmitters[command.transponderId];
      if (
        command.enabled &&
        (transmitter.dcPower === "off" || transmitter.shutdown || transmitter.interlocked)
      ) {
        return reject(source, "RF cannot be enabled while the transponder is off, shutdown, or interlocked.");
      }
      transmitter.rfEnabled = command.enabled;
      appendLog(state, "control", `${command.transponderId.toUpperCase()} RF ${command.enabled ? "ON" : "OFF"}.`);
      return accept(state, "RF state changed.");
    }

    case "set-transponder-squitter": {
      const transmitter = state.transmitters[command.transponderId];
      transmitter.squitterEnabled = command.enabled;
      appendLog(
        state,
        "maintenance",
        `${command.transponderId.toUpperCase()} squitter pulse ${command.enabled ? "ON" : "OFF"}.`,
      );
      return accept(state, "Squitter pulse control applied.");
    }

    case "set-transponder-ident-keying": {
      const transmitter = state.transmitters[command.transponderId];
      transmitter.identKeying = command.mode;
      appendLog(
        state,
        "maintenance",
        `${command.transponderId.toUpperCase()} IDENT keying ${command.mode.toUpperCase()}.`,
      );
      return accept(state, "IDENT keying control applied.");
    }

    case "set-transponder-rf-loopback": {
      const transmitter = state.transmitters[command.transponderId];
      transmitter.rfLoopbackEnabled = command.enabled;
      appendLog(
        state,
        "maintenance",
        `${command.transponderId.toUpperCase()} RF loopback ${command.enabled ? "ON" : "OFF"}.`,
      );
      return accept(state, "RF loopback control applied.");
    }

    case "set-transponder-spacing-offset": {
      if (!Number.isFinite(command.offsetUs)) {
        return reject(source, "Spacing offset must be a finite number.");
      }
      const transmitter = state.transmitters[command.transponderId];
      transmitter.spacingOffsetUs = command.offsetUs;
      appendLog(
        state,
        "maintenance",
        `${command.transponderId.toUpperCase()} spacing offset set to ${command.offsetUs} us.`,
      );
      return accept(state, "Spacing offset control applied.");
    }

    case "set-interlock": {
      state.interlockActive = command.active;
      const applies =
        command.active &&
        state.config.running.station.interlockEnabled &&
        state.keylock !== "MAINT";
      for (const transmitter of Object.values(state.transmitters)) {
        transmitter.interlocked = applies;
        if (applies) transmitter.rfEnabled = false;
      }
      appendLog(state, "control", `Interlock ${command.active ? "active" : "clear"}.`);
      return accept(state, "Interlock state changed.");
    }

    case "set-ac-available": {
      state.power.acAvailable = command.available;
      updatePowerForElapsedTime(state, 0);
      appendLog(state, "event", `AC mains ${command.available ? "restored" : "failed"}.`, "SYSTEM");
      return accept(state, "AC state changed.");
    }

    case "set-battery": {
      Object.assign(state.power.batteries[command.batteryId], command.changes);
      updatePowerForElapsedTime(state, 0);
      appendLog(state, "event", `${command.batteryId} state updated.`, "SYSTEM");
      return accept(state, "Battery state changed.");
    }

    case "set-environment": {
      const error = environmentChangesError(command.changes);
      if (error) return reject(source, error);
      state.environment = {
        ...state.environment,
        ...structuredClone(command.changes),
      };
      appendLog(state, "event", "Environmental telemetry updated.", "INSTRUCTOR");
      return accept(state, "Environmental state changed.");
    }

    case "set-draft-config": {
      try {
        assertValidDme320Config(command.config);
      } catch (error) {
        return reject(source, error instanceof Error ? error.message : "Invalid configuration.");
      }
      state.config.draft = cloneDme320Config(command.config);
      state.config.draftDirty = true;
      return accept(state, "Draft configuration updated.", false);
    }

    case "restore-draft": {
      state.config.draft = cloneDme320Config(state.config.running);
      state.config.draftDirty = false;
      return accept(state, "Draft restored from running configuration.", false);
    }

    case "apply-draft": {
      try {
        assertValidDme320Config(state.config.draft);
      } catch (error) {
        return reject(source, error instanceof Error ? error.message : "Invalid configuration.");
      }
      state.config.running = cloneDme320Config(state.config.draft);
      state.config.draftDirty = false;
      state.config.flashDirty = true;
      appendLog(state, "configuration", "Draft configuration applied to running equipment.");
      return accept(state, "Running configuration updated.");
    }

    case "load-running-config": {
      try {
        assertValidDme320Config(command.config);
      } catch (error) {
        return reject(source, error instanceof Error ? error.message : "Invalid configuration.");
      }
      state.config.running = cloneDme320Config(command.config);
      state.config.draft = cloneDme320Config(command.config);
      state.config.draftDirty = false;
      state.config.flashDirty = true;
      appendLog(state, "configuration", "Configuration loaded into running equipment.");
      return accept(state, "Configuration loaded; Save to Flash is still required.");
    }

    case "save-running-to-flash": {
      state.config.flash = cloneDme320Config(state.config.running);
      state.config.flashDirty = false;
      appendLog(state, "configuration", "Running profile saved to non-volatile flash.");
      return accept(state, "Profile saved to flash.", false);
    }

    case "reboot": {
      state.config.running = cloneDme320Config(state.config.flash);
      state.config.draft = cloneDme320Config(state.config.flash);
      state.config.draftDirty = false;
      state.config.flashDirty = false;
      state.measurementOverrides = [];
      resetEquipmentFromRunningConfig(state);
      state.calibration = createIdleDme320Calibration();
      state.session.userId = null;
      state.session.level = 0;
      state.session.loggedInAtMs = null;
      appendLog(state, "event", "Equipment rebooted from flash profile.", "SYSTEM");
      return accept(state, "Equipment rebooted.");
    }

    case "inject-fault": {
      const fault: Dme320Fault = {
        ...command.fault,
        active: true,
        injectedAtMs: state.nowMs,
      };
      state.faults = [...state.faults.filter((candidate) => candidate.id !== fault.id), fault];
      if (fault.kind === "ac-mains-failure") {
        state.power.acAvailable = false;
        updatePowerForElapsedTime(state, 0);
      }
      if (fault.kind === "battery-low" && (fault.target === "battery1" || fault.target === "battery2")) {
        state.power.batteries[fault.target].voltage = state.config.running.battery.alarmVoltage;
        updatePowerForElapsedTime(state, 0);
      }
      if (
        fault.kind === "battery-overtemperature" &&
        (fault.target === "battery1" || fault.target === "battery2")
      ) {
        state.power.batteries[fault.target].temperatureC =
          state.config.running.battery.alarmTemperatureC;
        updatePowerForElapsedTime(state, 0);
      }
      if (fault.kind === "emu-smoke") state.environment.smokeDetected = true;
      if (fault.kind === "emu-intrusion") state.environment.intrusionDetected = true;
      appendLog(state, "event", `Fault ${fault.id} injected on ${fault.target}.`, "INSTRUCTOR");
      return accept(state, "Fault injected.");
    }

    case "clear-fault": {
      const fault = state.faults.find((candidate) => candidate.id === command.faultId && candidate.active);
      if (!fault) return reject(source, "Active fault was not found.");
      fault.active = false;
      if (
        fault.kind === "ac-mains-failure" &&
        !state.faults.some((candidate) => candidate.active && candidate.kind === "ac-mains-failure")
      ) {
        state.power.acAvailable = true;
        updatePowerForElapsedTime(state, 0);
      }
      if (
        fault.kind === "emu-smoke" &&
        !state.faults.some((candidate) => candidate.active && candidate.kind === "emu-smoke")
      ) {
        state.environment.smokeDetected = false;
      }
      if (
        fault.kind === "emu-intrusion" &&
        !state.faults.some((candidate) => candidate.active && candidate.kind === "emu-intrusion")
      ) {
        state.environment.intrusionDetected = false;
      }
      appendLog(state, "event", `Fault ${fault.id} cleared.`, "INSTRUCTOR");
      return accept(state, "Fault cleared.");
    }

    case "inject-measurement": {
      const keyMatches = (candidate: typeof command.override) =>
        candidate.monitorId === command.override.monitorId &&
        candidate.channel === command.override.channel &&
        candidate.parameter === command.override.parameter;
      state.measurementOverrides = [
        ...state.measurementOverrides.filter((candidate) => !keyMatches(candidate)),
        structuredClone(command.override),
      ];
      return accept(state, "Measurement override injected.");
    }

    case "clear-measurement": {
      state.measurementOverrides = state.measurementOverrides.filter(
        (candidate) =>
          !(
            candidate.monitorId === command.monitorId &&
            candidate.channel === command.channel &&
            candidate.parameter === command.parameter
          ),
      );
      return accept(state, "Measurement override cleared.");
    }

    case "start-calibration": {
      state.calibration = createIdleDme320Calibration();
      state.calibration.status = "running";
      state.calibration.transponderId = command.transponderId;
      state.calibration.currentStep = 1;
      appendLog(state, "maintenance", `Calibration started for ${command.transponderId.toUpperCase()}.`);
      return accept(state, "Calibration started.", false);
    }

    case "run-calibration-step": {
      const calibration = state.calibration;
      if (calibration.status !== "running" || calibration.currentStep === null || !calibration.transponderId) {
        return reject(source, "No calibration step is active.");
      }
      const step = calibration.steps[calibration.currentStep - 1];
      const blockingFault = dme320FaultBlocksCalibrationStep(
        state,
        calibration.transponderId,
        step.number,
      );
      const invalidMeasuredValue =
        command.measuredValue !== undefined &&
        (!Number.isFinite(command.measuredValue) || command.measuredValue < 0);
      if (blockingFault || invalidMeasuredValue) {
        step.status = "failed";
        step.completedAtMs = state.nowMs;
        step.message = blockingFault
          ? `Blocked by ${blockingFault.kind}.`
          : "Measured value is invalid.";
        calibration.status = "failed";
        appendLog(state, "maintenance", `Calibration step ${step.number} failed: ${step.message}`);
        return accept(state, "Calibration step failed.", false);
      }
      step.status = "passed";
      step.completedAtMs = state.nowMs;
      step.message = "Completed deterministically.";
      const next = calibration.steps.find((candidate) => candidate.status === "pending");
      calibration.currentStep = next?.number ?? null;
      if (!next) calibration.status = "completed";
      appendLog(state, "maintenance", `Calibration step ${step.number} passed.`);
      return accept(state, next ? `Calibration advanced to step ${next.number}.` : "Calibration completed.", false);
    }

    case "skip-calibration-step": {
      const calibration = state.calibration;
      if (calibration.status !== "running" || calibration.currentStep === null) {
        return reject(source, "No calibration step is active.");
      }
      const step = calibration.steps[calibration.currentStep - 1];
      if (!step.skippable) return reject(source, `Calibration step ${step.number} cannot be skipped.`);
      step.status = "skipped";
      step.completedAtMs = state.nowMs;
      step.message = "Skipped by operator.";
      const next = calibration.steps.find((candidate) => candidate.status === "pending");
      calibration.currentStep = next?.number ?? null;
      if (!next) calibration.status = "completed";
      appendLog(state, "maintenance", `Calibration step ${step.number} skipped.`);
      return accept(state, next ? `Calibration advanced to step ${next.number}.` : "Calibration completed.", false);
    }

    case "run-manual-test": {
      const input = command.input;
      if (
        !Number.isInteger(input.interrogationCount) ||
        input.interrogationCount <= 0 ||
        input.interrogationLevelDbm < -95 ||
        input.interrogationLevelDbm > -10 ||
        input.interrogationPulseRatePps < 0 ||
        input.interrogationPulseRatePps > 5_400 ||
        input.spacingUs < 10 ||
        input.spacingUs > 49
      ) {
        return reject(source, "Manual test input is outside the supported MOPIENS range.");
      }
      state.lastManualTest = manualTestResult(state, input);
      appendLog(
        state,
        "maintenance",
        `Manual test ${state.lastManualTest.passed ? "passed" : "failed"} at ${state.lastManualTest.efficiencyPct}% efficiency.`,
      );
      return accept(state, state.lastManualTest.passed ? "Manual test passed." : "Manual test failed.", false);
    }

    case "run-certification": {
      const limit = state.config.running.monitor.limits[command.parameter];
      if (limit.classification !== "primary") {
        return reject(source, "Certification Test is enabled only for a primary alarm parameter.");
      }
      if (!valueIsOutsideAlarmRange(command.testValue, limit)) {
        return reject(source, "Certification value must be outside the alarm range.");
      }
      const alarmDelayMs = command.parameter === "identCode"
        ? state.config.running.monitor.identFaultDelayMs
        : limit.alarmDelayMs;
      const expectedActionDelayMs =
        alarmDelayMs + state.config.running.monitor.monitorActionDelayMs;
      const monitorHealthy =
        state.monitors[command.monitorId].present &&
        !state.monitors[command.monitorId].hardwareFault;
      state.lastCertification = {
        monitorId: command.monitorId,
        parameter: command.parameter,
        testValue: command.testValue,
        startAtMs: state.nowMs,
        alarmDetectedAtMs: state.nowMs + alarmDelayMs,
        actionAtMs: state.nowMs + expectedActionDelayMs,
        expectedActionDelayMs,
        passed: monitorHealthy,
        message: monitorHealthy
          ? "Action timing is within the manual's ±10% acceptance window."
          : "Monitor hardware fault prevents certification.",
      };
      appendLog(
        state,
        "maintenance",
        `Monitor certification ${state.lastCertification.passed ? "passed" : "failed"} for ${command.parameter}.`,
      );
      return accept(
        state,
        state.lastCertification.passed ? "Certification passed." : "Certification failed.",
        false,
      );
    }
  }
}
