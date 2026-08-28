import {
  applyDvor1150ConfigPatches,
  buildDvor1150Snapshot,
  cloneDvor1150Config,
  configurationForDvor1150Scenario,
  createDefaultDvor1150ScenarioDefinition,
  defaultDvor1150Config,
  getDvor1150ScenarioProtectedFieldChanges,
  type Dvor1150ScenarioDefinition,
  type Dvor1150ScenarioRuntime,
  formatDvor1150Timestamp,
  getDvor1150ConfigValue,
  setDvor1150ConfigValue,
  validateDvor1150Config,
  validateDvor1150ScenarioDefinition,
  type Dvor1150Config,
  type Dvor1150ConfigValue,
  type Dvor1150MonitorId,
  type Dvor1150PmdtMode,
  type Dvor1150ScreenId,
  type Dvor1150SecurityLevel,
  type Dvor1150Snapshot,
  type Dvor1150TransferState,
  type Dvor1150TransmitterId,
  type Dvor1150TransmitterMode,
  type Dvor1150ViewId,
} from "@/lib/dvor1150";
import {
  collectChangedConfigFields,
  createParameterChangeLogEntries,
  prependParameterChangeLogEntries,
  type SimulatorParameterChangeLogEntry,
} from "@/lib/simulator-config/parameter-change";
import { create, type StoreApi, type UseBoundStore } from "zustand";

const defaultViews: Record<Dvor1150ScreenId, Dvor1150ViewId> = {
  home: "home",
  "rms-status": "rms-status",
  "rms-data": "rms-maintenance-alerts",
  "rms-logs": "rms-logs-operational-summary",
  "rms-config": "rms-config-general",
  "monitor-data": "monitor-integrity",
  "monitor-config": "monitor-alarm-limits",
  "tx-data": "tx-data-tx1",
  "tx-config": "tx-config-nominal",
  diagnostics: "diagnostics-power-up",
  disabled: "disabled",
};

const viewGroups: Record<Dvor1150ScreenId, readonly Dvor1150ViewId[]> = {
  home: ["home"],
  "rms-status": ["rms-status"],
  "rms-data": ["rms-maintenance-alerts", "rms-ad-data"],
  "rms-config": ["rms-config-general", "rms-config-station", "rms-config-ad-limits", "rms-config-security-codes"],
  "rms-logs": ["rms-logs-operational-summary", "rms-logs-alarms", "rms-logs-maintenance-alerts", "rms-logs-command-activity", "rms-logs-parameter-change"],
  "monitor-data": ["monitor-integrity", "monitor-ground-check", "monitor-certification", "monitor-test-data", "monitor-notch", "monitor-sideband-vswr", "monitor-standby", "monitor-fault-history-data", "monitor-fault-history-system-status"],
  "monitor-config": ["monitor-alarm-limits", "monitor-offsets"],
  "tx-data": ["tx-data-tx1", "tx-data-tx2"],
  "tx-config": ["tx-config-nominal", "tx-config-offsets"],
  diagnostics: ["diagnostics-power-up", "diagnostics-fault-isolation"],
  disabled: ["disabled"],
};

const accounts: readonly { id: string; password: string; level: Dvor1150SecurityLevel }[] = [
  { id: "GUEST", password: "", level: 1 },
  { id: "SEC3", password: "THREE", level: 3 },
  { id: "SEC4", password: "FOUR", level: 4 },
];

export interface Dvor1150PmdtStoreState {
  mode: Dvor1150PmdtMode;
  config: Dvor1150Config;
  configDraft: Dvor1150Config;
  configurationBackup: Dvor1150Config | null;
  configDirty: boolean;
  needBackup: boolean;
  parameterChangeLogs: SimulatorParameterChangeLogEntry[];
  derived: Dvor1150Snapshot;
  loginDialogOpen: boolean;
  authenticatedUserId: string | null;
  securityLevel: Dvor1150SecurityLevel;
  loginError: string | null;
  failedLoginAttempts: number;
  loginBlockedUntil: number | null;
  activeScreen: Dvor1150ScreenId;
  activeView: Dvor1150ViewId;
  activeMenuPath: string[];
  simulationParametersOpen: boolean;
  scenarioParametersOpen: boolean;
  scenarioAuthoringEnabled: boolean;
  scenario: Dvor1150ScenarioRuntime;
  scenarioDraft: Dvor1150ScenarioDefinition;
  lastCommand: string | null;
}

export interface Dvor1150PmdtStoreActions {
  setMode: (mode: Dvor1150PmdtMode) => void;
  initializeStudentScenario: (definition: Dvor1150ScenarioDefinition) => boolean;
  openLogin: () => void;
  login: (userId: string, password: string) => boolean;
  logout: () => void;
  refreshClock: () => void;
  setLocalMode: (enabled: boolean) => boolean;
  setMonitorBypass: (monitor: Dvor1150MonitorId, enabled: boolean) => boolean;
  setConfigValue: (fieldId: string, value: Dvor1150ConfigValue) => void;
  applyConfigChanges: () => boolean;
  resetConfigDraft: () => boolean;
  restoreConfig: () => boolean;
  backupConfig: () => boolean;
  replaceConfig: (
    config: Dvor1150Config,
    backupConfig?: Dvor1150Config,
    parameterChangeLogs?: readonly SimulatorParameterChangeLogEntry[],
  ) => void;
  setTransmitterMode: (transmitterId: Dvor1150TransmitterId, mode: Dvor1150TransmitterMode) => boolean;
  executeCommand: (commandId: string) => boolean;
  openScreen: (screenId: Dvor1150ScreenId, menuPath: readonly string[], title?: string) => void;
  openView: (screenId: Dvor1150ScreenId, viewId: Dvor1150ViewId, menuPath: readonly string[], title?: string) => void;
  setSimulationParametersOpen: (open: boolean) => void;
  setScenarioParametersOpen: (open: boolean) => void;
  setScenarioAuthoringEnabled: (enabled: boolean) => void;
  replaceScenarioDraft: (definition: Dvor1150ScenarioDefinition) => void;
  applyScenario: () => boolean;
  restoreScenario: () => boolean;
  endScenario: () => boolean;
  nextView: () => void;
  closeScreen: () => void;
  reset: () => void;
}

export type Dvor1150PmdtStore = Dvor1150PmdtStoreState & Dvor1150PmdtStoreActions;

export interface Dvor1150PmdtStoreOptions {
  now?: () => Date;
}

function buildInitialState(now: () => Date): Dvor1150PmdtStoreState {
  const config = cloneDvor1150Config(defaultDvor1150Config);
  config.simulation.connected = false;
  const derived = buildDvor1150Snapshot(config, now());
  return {
    mode: "preview",
    config,
    configDraft: cloneDvor1150Config(config),
    configurationBackup: cloneDvor1150Config(defaultDvor1150Config),
    configDirty: false,
    needBackup: false,
    parameterChangeLogs: [],
    derived,
    loginDialogOpen: true,
    authenticatedUserId: null,
    securityLevel: 0,
    loginError: null,
    failedLoginAttempts: 0,
    loginBlockedUntil: null,
    activeScreen: "home",
    activeView: "home",
    activeMenuPath: [],
    simulationParametersOpen: false,
    scenarioParametersOpen: false,
    scenarioAuthoringEnabled: false,
    scenario: { active: false, definition: null, startedAt: null },
    scenarioDraft: createDefaultDvor1150ScenarioDefinition(),
    lastCommand: null,
  };
}

function preserveLiveSimulation(next: Dvor1150Config, current: Dvor1150Config): Dvor1150Config {
  next.simulation = { ...current.simulation };
  return next;
}

function initialConfigurationForSession(current: Dvor1150Config): Dvor1150Config {
  const initial = cloneDvor1150Config(defaultDvor1150Config);
  // Connection and clock belong to the active PMDT session. All configurable
  // station values and maintenance flags return to Simulation Parameters.
  initial.simulation.connected = current.simulation.connected;
  initial.simulation.timestamp = current.simulation.timestamp;
  return initial;
}

function persistentConfigValue(config: Dvor1150Config): Dvor1150Config {
  const next = cloneDvor1150Config(config);
  next.simulation = { ...defaultDvor1150Config.simulation };
  return next;
}

interface AutomaticDvor1150Transfer {
  config: Dvor1150Config;
  snapshot: Dvor1150Snapshot;
  target: Dvor1150TransmitterId | null;
  action: "transfer" | "shutdown" | null;
  transfer: Dvor1150TransferState;
}

/**
 * Performs one automatic relay attempt. If the standby path is also in
 * alarm, both transmitters are explicitly taken Off; the helper never calls
 * itself again, so TX1/TX2 cannot oscillate indefinitely.
 */
function applyAutomaticDvor1150Transfer(
  config: Dvor1150Config,
  mainTransmitter?: Dvor1150TransmitterId | null,
): AutomaticDvor1150Transfer {
  const snapshot = buildDvor1150Snapshot(config, undefined, mainTransmitter ?? undefined);
  const active = snapshot.activeTransmitter;
  const noAction = { config, snapshot, target: null, action: null, transfer: snapshot.transfer } as const;

  if (
    config.simulation.integralMonitorBypass
    || !snapshot.data.monitorIntegral.alarm
    || !active
    || config.station.transmitterConfig !== "Dual Transmitters"
  ) {
    return noAction;
  }

  const target: Dvor1150TransmitterId = active === "tx1" ? "tx2" : "tx1";
  if (!config.transmitters[target].enabled) return noAction;

  const transferred = cloneDvor1150Config(config);
  transferred.transmitters[active].onAir = false;
  transferred.transmitters[active].load = false;
  transferred.transmitters[target].enabled = true;
  transferred.transmitters[target].onAir = true;
  transferred.transmitters[target].load = false;
  const transferMain = mainTransmitter ?? active;
  const transfer: Dvor1150TransferState = {
    cause: "monitor-alarm",
    phase: "transferred",
    from: active,
    to: target,
    message: `Automatic transfer from ${active.toUpperCase()} to ${target.toUpperCase()} after monitor alarm`,
  };
  const transferredSnapshot = buildDvor1150Snapshot(transferred, undefined, transferMain, transfer);

  if (transferredSnapshot.data.monitorIntegral.alarm) {
    const shutdown = cloneDvor1150Config(transferred);
    for (const transmitterId of ["tx1", "tx2"] as const) {
      shutdown.transmitters[transmitterId].enabled = false;
      shutdown.transmitters[transmitterId].onAir = false;
      shutdown.transmitters[transmitterId].load = false;
    }
    return {
      config: shutdown,
      snapshot: buildDvor1150Snapshot(shutdown, undefined, transferMain, {
        cause: "monitor-alarm",
        phase: "shutdown",
        from: active,
        to: null,
        message: "Automatic monitor shutdown: both transmitters off",
      }),
      target: null,
      action: "shutdown",
      transfer: {
        cause: "monitor-alarm",
        phase: "shutdown",
        from: active,
        to: null,
        message: "Automatic monitor shutdown: both transmitters off",
      },
    };
  }

  return { config: transferred, snapshot: transferredSnapshot, target, action: "transfer", transfer };
}

function copyTransmitterRoutes(source: Dvor1150Config, target: Dvor1150Config): Dvor1150Config {
  const next = cloneDvor1150Config(target);
  for (const transmitterId of ["tx1", "tx2"] as const) {
    next.transmitters[transmitterId].enabled = source.transmitters[transmitterId].enabled;
    next.transmitters[transmitterId].onAir = source.transmitters[transmitterId].onAir;
    next.transmitters[transmitterId].load = source.transmitters[transmitterId].load;
  }
  return next;
}

export function createDvor1150PmdtStore(
  options: Dvor1150PmdtStoreOptions = {},
): UseBoundStore<StoreApi<Dvor1150PmdtStore>> {
  const now = options.now ?? (() => new Date());
  return create<Dvor1150PmdtStore>()((set, get) => {
    const recompute = (
      config: Dvor1150Config,
      previous?: Dvor1150Snapshot,
      mainTransmitter?: Dvor1150TransmitterId | null,
      transfer?: Dvor1150TransferState,
    ): Dvor1150Snapshot => {
      const next = buildDvor1150Snapshot(
        config,
        now(),
        mainTransmitter ?? previous?.mainTransmitter ?? undefined,
        transfer ?? previous?.transfer,
      );
      if (previous?.data.logs.length) next.data.logs = [...previous.data.logs];
      return next;
    };

    const applyScenarioBaseline = (
      definition: Dvor1150ScenarioDefinition,
      command: string,
      startedAt: string | null,
    ) => {
      const state = get();
      const storedDefinition = structuredClone(definition);
      const config = configurationForDvor1150Scenario(storedDefinition, state.config);
      const derived = recompute(config, state.derived, storedDefinition.startPolicy.mainTransmitterId);
      derived.data.logs = [...derived.data.logs, {
        timeTag: config.simulation.timestamp,
        user: state.authenticatedUserId ?? "SYSTEM",
        message: command,
        severity: "yellow",
      }];
      set({
        config,
        configDraft: cloneDvor1150Config(config),
        configurationBackup: cloneDvor1150Config(config),
        configDirty: false,
        needBackup: false,
        derived,
        scenario: { active: true, definition: storedDefinition, startedAt: startedAt ?? config.simulation.timestamp },
        scenarioDraft: structuredClone(storedDefinition),
        lastCommand: command,
      });
      return true;
    };

    const initial = buildInitialState(now);
    return {
      ...initial,
      setMode: (mode) => set({ mode }),
      initializeStudentScenario: (definition) => {
        const issues = validateDvor1150ScenarioDefinition(definition);
        if (issues.length > 0) {
          set({ lastCommand: `Student scenario initialization failed: ${issues[0]}` });
          return false;
        }
        const studentState = buildInitialState(now);
        const config = configurationForDvor1150Scenario(definition, studentState.config);
        const derived = buildDvor1150Snapshot(config, now());
        set({
          ...studentState,
          mode: "student",
          config,
          configDraft: cloneDvor1150Config(config),
          configurationBackup: cloneDvor1150Config(config),
          derived,
          scenario: {
            active: true,
            definition: structuredClone(definition),
            startedAt: config.simulation.timestamp,
          },
          scenarioDraft: structuredClone(definition),
          lastCommand: null,
        });
        return true;
      },
      openLogin: () => set({
        loginDialogOpen: true,
        loginError: null,
        simulationParametersOpen: false,
        scenarioParametersOpen: false,
      }),
      login: (rawUserId, password) => {
        const state = get();
        const currentTime = Date.now();
        if (state.loginBlockedUntil && currentTime < state.loginBlockedUntil) {
          set({ loginError: "Đăng nhập đang tạm khóa sau nhiều lần sai." });
          return false;
        }
        const userId = rawUserId.trim().toUpperCase();
        const account = accounts.find((item) => item.id === userId && item.password === password);
        if (!account) {
          const attempts = state.failedLoginAttempts + 1;
          set({
            loginError: attempts >= 3 ? "Sai thông tin. Đăng nhập bị khóa trong 5 phút." : "Sai User ID hoặc Password.",
            failedLoginAttempts: attempts >= 3 ? 0 : attempts,
            loginBlockedUntil: attempts >= 3 ? currentTime + 5 * 60 * 1000 : null,
          });
          return false;
        }
        const config = cloneDvor1150Config(state.config);
        config.simulation.connected = true;
        config.simulation.timestamp = formatDvor1150Timestamp(now());
        const derived = recompute(config, state.derived);
        set({
          config,
          configDraft: cloneDvor1150Config(config),
          derived,
          loginDialogOpen: false,
          authenticatedUserId: account.id,
          securityLevel: account.level,
          loginError: null,
          failedLoginAttempts: 0,
          loginBlockedUntil: null,
        });
        return true;
      },
      logout: () => {
        const state = get();
        const config = cloneDvor1150Config(state.config);
        config.simulation.connected = false;
        config.simulation.local = false;
        config.simulation.integralMonitorBypass = false;
        set({
          config,
          configDraft: cloneDvor1150Config(config),
          derived: recompute(config, state.derived),
          configDirty: false,
          loginDialogOpen: true,
          authenticatedUserId: null,
          securityLevel: 0,
          loginError: null,
          activeScreen: "home",
          activeView: "home",
          activeMenuPath: [],
          simulationParametersOpen: false,
          scenarioParametersOpen: false,
        });
      },
      refreshClock: () => {
        const state = get();
        const config = cloneDvor1150Config(state.config);
        config.simulation.timestamp = formatDvor1150Timestamp(now());
        const configDraft = cloneDvor1150Config(state.configDraft);
        configDraft.simulation.timestamp = config.simulation.timestamp;
        set({ config, configDraft, derived: recompute(config, state.derived) });
      },
      setLocalMode: (enabled) => {
        const state = get();
        if (state.securityLevel < 3) return false;
        const config = cloneDvor1150Config(state.config);
        config.simulation.local = enabled;
        if (!enabled) config.simulation.integralMonitorBypass = false;
        const automaticTransfer = !enabled
          ? applyAutomaticDvor1150Transfer(config, state.derived.mainTransmitter)
          : null;
        const nextConfig = automaticTransfer?.config ?? config;
        const derived = automaticTransfer?.snapshot ?? recompute(nextConfig, state.derived);
        let configDraft = cloneDvor1150Config(state.configDraft);
        configDraft.simulation.local = config.simulation.local;
        configDraft.simulation.integralMonitorBypass = config.simulation.integralMonitorBypass;
        if (automaticTransfer?.action) configDraft = copyTransmitterRoutes(nextConfig, configDraft);
        if (automaticTransfer?.action) {
          derived.data.logs = [...derived.data.logs, {
            timeTag: nextConfig.simulation.timestamp,
            user: "Op System",
            message: automaticTransfer.transfer.message,
            severity: automaticTransfer.action === "shutdown" ? "red" : "yellow",
          }];
        }
        set({
          config: nextConfig,
          configDraft,
          derived,
          lastCommand: automaticTransfer?.action === "transfer" && automaticTransfer.target
            ? `Automatic monitor transfer to ${automaticTransfer.target.toUpperCase()}`
            : automaticTransfer?.action === "shutdown"
              ? "Automatic monitor shutdown: both transmitters off"
              : enabled ? "Local On" : "Local Off",
        });
        return true;
      },
      setMonitorBypass: (_monitor, enabled) => {
        const state = get();
        if (state.securityLevel < 3 || (enabled && !state.config.simulation.local)) return false;
        const config = cloneDvor1150Config(state.config);
        config.simulation.integralMonitorBypass = enabled;
        const automaticTransfer = !enabled
          ? applyAutomaticDvor1150Transfer(config, state.derived.mainTransmitter)
          : null;
        const nextConfig = automaticTransfer?.config ?? config;
        const derived = automaticTransfer?.snapshot ?? recompute(nextConfig, state.derived);
        let configDraft = cloneDvor1150Config(state.configDraft);
        configDraft.simulation.integralMonitorBypass = enabled;
        if (automaticTransfer?.action) configDraft = copyTransmitterRoutes(nextConfig, configDraft);
        if (automaticTransfer?.action) {
          derived.data.logs = [...derived.data.logs, {
            timeTag: nextConfig.simulation.timestamp,
            user: "Op System",
            message: automaticTransfer.transfer.message,
            severity: automaticTransfer.action === "shutdown" ? "red" : "yellow",
          }];
        }
        set({
          config: nextConfig,
          configDraft,
          derived,
          lastCommand: automaticTransfer?.action === "transfer" && automaticTransfer.target
            ? `Automatic monitor transfer to ${automaticTransfer.target.toUpperCase()}`
            : automaticTransfer?.action === "shutdown"
              ? "Automatic monitor shutdown: both transmitters off"
              : enabled ? "Integral Monitor Bypass On" : "Integral Monitor Bypass Off",
        });
        return true;
      },
      setConfigValue: (fieldId, value) => {
        const state = get();
        if (state.securityLevel < 3 || !state.config.simulation.local) return;
        if (
          state.scenario.active
          && !state.scenario.definition?.studentEditableFieldIds.includes(fieldId)
        ) {
          set({ lastCommand: "Scenario control locked: examiner recovery controls only" });
          return;
        }
        const configDraft = setDvor1150ConfigValue(state.configDraft, fieldId, value);
        set({
          configDraft,
          configDirty: JSON.stringify(configDraft) !== JSON.stringify(state.config),
        });
      },
      applyConfigChanges: () => {
        const state = get();
        if (!state.configDirty || state.securityLevel < 3 || !state.config.simulation.local) return false;
        const errors = validateDvor1150Config(state.configDraft);
        if (errors.length > 0) {
          set({ lastCommand: `Apply failed: ${errors[0]}` });
          return false;
        }
        if (state.scenario.active && state.scenario.definition) {
          const protectedChanges = getDvor1150ScenarioProtectedFieldChanges(
            state.scenario.definition,
            state.configDraft,
          );
          if (protectedChanges.length > 0) {
            set({ lastCommand: `Apply blocked: ${protectedChanges[0].label} is protected by the scenario.` });
            return false;
          }
        }
        const config = cloneDvor1150Config(state.configDraft);
        const automaticTransfer = config.simulation.integralMonitorBypass
          ? null
          : applyAutomaticDvor1150Transfer(config, state.derived.mainTransmitter);
        const nextConfig = automaticTransfer?.config ?? config;
        const derived = automaticTransfer?.snapshot ?? recompute(nextConfig, state.derived);
        derived.data.logs = [...derived.data.logs, { timeTag: config.simulation.timestamp, user: state.authenticatedUserId ?? "", message: "Configuration applied", severity: "yellow" }];
        const changedFields = collectChangedConfigFields(
          persistentConfigValue(state.config),
          persistentConfigValue(config),
        );
        const nextParameterLogs = createParameterChangeLogEntries({
          changedFields,
          timeTag: config.simulation.timestamp,
          userName: state.authenticatedUserId,
          file: "Monitor / Transmitter / RMS",
          actionLabel: "Configuration Apply",
        });
        set({
          config: nextConfig,
          configDraft: cloneDvor1150Config(nextConfig),
          derived,
          configDirty: false,
          // Training changes must be contained in the current browser session.
          needBackup: state.scenario.active ? false : true,
          parameterChangeLogs: prependParameterChangeLogEntries(state.parameterChangeLogs, nextParameterLogs),
          lastCommand: automaticTransfer?.action === "transfer" && automaticTransfer.target
            ? `Automatic monitor transfer to ${automaticTransfer.target.toUpperCase()}`
            : automaticTransfer?.action === "shutdown"
              ? "Automatic monitor shutdown: both transmitters off"
              : "Apply (F7)",
        });
        return true;
      },
      resetConfigDraft: () => {
        const state = get();
        if (state.scenario.active) return get().restoreScenario();
        if (state.securityLevel < 3 || !state.config.simulation.local) return false;
        const config = initialConfigurationForSession(state.config);
        set({
          config,
          configDraft: cloneDvor1150Config(config),
          configurationBackup: cloneDvor1150Config(config),
          derived: recompute(config),
          configDirty: false,
          needBackup: false,
          lastCommand: "Reset (F8): Simulation Parameters baseline",
        });
        return true;
      },
      restoreConfig: () => {
        const state = get();
        if (state.scenario.active) return get().restoreScenario();
        if (state.securityLevel < 3 || !state.config.simulation.local) return false;
        const config = initialConfigurationForSession(state.config);
        set({
          config,
          configDraft: cloneDvor1150Config(config),
          configurationBackup: cloneDvor1150Config(config),
          derived: recompute(config),
          configDirty: false,
          needBackup: false,
          lastCommand: "RMS Config Restore: Simulation Parameters baseline",
        });
        return true;
      },
      backupConfig: () => {
        const state = get();
        if (state.securityLevel < 3 || !state.needBackup || state.scenario.active) return false;
        const previousBackup = state.configurationBackup ?? defaultDvor1150Config;
        const changedFields = collectChangedConfigFields(
          persistentConfigValue(previousBackup),
          persistentConfigValue(state.config),
        );
        const nextLogs = createParameterChangeLogEntries({
          changedFields,
          timeTag: state.derived.data.timestamp,
          userName: state.authenticatedUserId,
          file: "RMS",
          actionLabel: "RMS Configuration Backup",
        });
        set({
          configurationBackup: cloneDvor1150Config(state.config),
          parameterChangeLogs: prependParameterChangeLogEntries(state.parameterChangeLogs, nextLogs),
          needBackup: false,
          lastCommand: "RMS Config Backup",
        });
        return true;
      },
      replaceConfig: (persistedConfig, persistedBackup = persistedConfig, parameterChangeLogs) => {
        const state = get();
        // A delayed persistence hydration must never overwrite a loaded exercise.
        if (state.scenario.active) return;
        const config = preserveLiveSimulation(cloneDvor1150Config(persistedConfig), state.config);
        const configurationBackup = preserveLiveSimulation(
          cloneDvor1150Config(persistedBackup),
          state.config,
        );
        const derived = recompute(config, state.derived);
        set({
          config,
          configDraft: cloneDvor1150Config(config),
          configurationBackup,
          configDirty: false,
          needBackup: JSON.stringify(persistentConfigValue(config)) !== JSON.stringify(persistentConfigValue(configurationBackup)),
          parameterChangeLogs: parameterChangeLogs ? [...parameterChangeLogs] : state.parameterChangeLogs,
          derived,
          lastCommand: "User configuration loaded",
        });
      },
      setTransmitterMode: (transmitterId, mode) => {
        const state = get();
        if (state.securityLevel < 3) return false;
        if (mode === "main" && state.config.station.transmitterConfig === "Single Transmitter" && transmitterId === "tx2") return false;
        if (mode !== "main" && !state.config.simulation.local) return false;
        const config = cloneDvor1150Config(state.config);
        if (mode === "main") {
          for (const id of ["tx1", "tx2"] as const) {
            const isSelected = id === transmitterId;
            config.transmitters[id].enabled = isSelected;
            config.transmitters[id].onAir = isSelected;
            config.transmitters[id].load = false;
          }
        } else if (mode === "load") {
          config.transmitters[transmitterId].enabled = true;
          config.transmitters[transmitterId].onAir = false;
          config.transmitters[transmitterId].load = true;
        } else {
          config.transmitters[transmitterId].enabled = false;
          config.transmitters[transmitterId].onAir = false;
          config.transmitters[transmitterId].load = false;
        }
        const configDraft = cloneDvor1150Config(state.configDraft);
        configDraft.transmitters = cloneDvor1150Config(config).transmitters;
        const derived = recompute(
          config,
          state.derived,
          mode === "main" ? transmitterId : state.derived.mainTransmitter,
        );
        const transfer: Dvor1150TransferState = {
          cause: "manual",
          phase: "manual",
          from: state.derived.activeTransmitter,
          to: mode === "main" ? transmitterId : null,
          message: mode === "main"
            ? `Manual transfer to ${transmitterId.toUpperCase()}`
            : `Manual ${transmitterId.toUpperCase()} ${mode}`,
        };
        derived.transfer = transfer;
        derived.data.logs = [...derived.data.logs, {
          timeTag: config.simulation.timestamp,
          user: state.authenticatedUserId ?? "",
          message: transfer.message,
          severity: "green",
        }];
        set({
          config,
          configDraft,
          derived,
          lastCommand: transfer.message,
        });
        return true;
      },
      executeCommand: (commandId) => {
        const state = get();
        if (commandId === "enable-command-mode" || commandId === "disable-command-mode") {
          return get().setLocalMode(commandId === "enable-command-mode");
        }
        if (state.securityLevel < 2) return false;
        if (commandId === "set-time") {
          get().refreshClock();
          set({ lastCommand: "Set Time and Date" });
          return true;
        }
        if (commandId === "reset-rms" || commandId === "reset-intrusion" || commandId === "reset-smoke" || commandId === "abort-tests" || commandId === "dme-1-on" || commandId === "dme-2-on" || commandId === "dme-off" || commandId === "dme-transfer" || commandId === "ident-normal" || commandId === "ident-off" || commandId === "ident-continuous" || commandId === "run-ground-check" || commandId === "run-monitor-test" || commandId === "run-on-air-diagnostics" || commandId.startsWith("run-certification-") || commandId === "record-notch-baseline") {
          set({ lastCommand: commandId });
          return true;
        }
        return false;
      },
      openScreen: (screenId, menuPath) => set({ activeScreen: screenId, activeView: defaultViews[screenId], activeMenuPath: [...menuPath] }),
      openView: (screenId, viewId, menuPath) => set({ activeScreen: screenId, activeView: viewId, activeMenuPath: [...menuPath] }),
      setSimulationParametersOpen: (open) => set((state) => ({
        simulationParametersOpen: open,
        scenarioParametersOpen: open ? false : state.scenarioParametersOpen,
      })),
      setScenarioParametersOpen: (open) => set((state) => ({
        scenarioParametersOpen: open && state.scenarioAuthoringEnabled,
        simulationParametersOpen: open ? false : state.simulationParametersOpen,
        lastCommand: open && !state.scenarioAuthoringEnabled
          ? "Scenario Parameters are restricted to Examiner accounts."
          : state.lastCommand,
      })),
      setScenarioAuthoringEnabled: (enabled) => set({
        scenarioAuthoringEnabled: enabled,
        scenarioParametersOpen: enabled ? get().scenarioParametersOpen : false,
      }),
      replaceScenarioDraft: (definition) => {
        if (!get().scenarioAuthoringEnabled) {
          set({ lastCommand: "Scenario editing is restricted to Examiner accounts." });
          return;
        }
        set({ scenarioDraft: structuredClone(definition) });
      },
      applyScenario: () => {
        const state = get();
        if (!state.scenarioAuthoringEnabled) {
          set({ lastCommand: "Scenario apply is restricted to Examiner accounts." });
          return false;
        }
        const issues = validateDvor1150ScenarioDefinition(state.scenarioDraft);
        if (issues.length > 0) {
          set({ lastCommand: `Scenario apply failed: ${issues[0]}` });
          return false;
        }
        return applyScenarioBaseline(
          state.scenarioDraft,
          `Scenario applied: ${state.scenarioDraft.name}`,
          null,
        );
      },
      restoreScenario: () => {
        const state = get();
        if (!state.scenario.active || !state.scenario.definition) return false;
        return applyScenarioBaseline(
          state.scenario.definition,
          `Scenario restored: ${state.scenario.definition.name}`,
          state.scenario.startedAt,
        );
      },
      endScenario: () => {
        const state = get();
        if (!state.scenarioAuthoringEnabled) {
          set({ lastCommand: "Scenario end is restricted to Examiner accounts." });
          return false;
        }
        if (!state.scenario.active) return false;
        const config = initialConfigurationForSession(state.config);
        const derived = recompute(config, state.derived);
        derived.data.logs = [...derived.data.logs, {
          timeTag: config.simulation.timestamp,
          user: state.authenticatedUserId ?? "SYSTEM",
          message: "Scenario ended; Đài TEST/TST defaults restored",
          severity: "green",
        }];
        set({
          config,
          configDraft: cloneDvor1150Config(config),
          configurationBackup: cloneDvor1150Config(config),
          configDirty: false,
          needBackup: false,
          derived,
          scenario: { active: false, definition: null, startedAt: null },
          scenarioDraft: createDefaultDvor1150ScenarioDefinition(),
          lastCommand: "Scenario ended; Đài TEST/TST defaults restored",
        });
        return true;
      },
      nextView: () => {
        const state = get();
        const views = viewGroups[state.activeScreen];
        const index = views.indexOf(state.activeView);
        const next = views[(index + 1) % views.length] ?? views[0];
        set({ activeView: next });
      },
      closeScreen: () => set({ activeScreen: "home", activeView: "home", activeMenuPath: [] }),
      reset: () => set(buildInitialState(now)),
    };
  });
}

export const useDvor1150PmdtStore = createDvor1150PmdtStore();

export function getDvor1150DisplayValue(config: Dvor1150Config, fieldId: string): Dvor1150ConfigValue {
  return getDvor1150ConfigValue(config, fieldId);
}

export function applyDvor1150Patches(config: Dvor1150Config, patches: readonly { fieldId: string; value: Dvor1150ConfigValue }[]) {
  return applyDvor1150ConfigPatches(config, patches);
}
