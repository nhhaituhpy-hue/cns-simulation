import {
  applyDvor1150ConfigPatches,
  buildDvor1150Snapshot,
  cloneDvor1150Config,
  defaultDvor1150Config,
  formatDvor1150Timestamp,
  getDvor1150ConfigValue,
  setDvor1150ConfigValue,
  validateDvor1150Config,
  type Dvor1150Config,
  type Dvor1150ConfigValue,
  type Dvor1150MonitorId,
  type Dvor1150PmdtMode,
  type Dvor1150ScreenId,
  type Dvor1150SecurityLevel,
  type Dvor1150Snapshot,
  type Dvor1150TransmitterId,
  type Dvor1150TransmitterMode,
  type Dvor1150ViewId,
} from "@/lib/dvor1150";
import { create, type StoreApi, type UseBoundStore } from "zustand";

const defaultViews: Record<Dvor1150ScreenId, Dvor1150ViewId> = {
  home: "home",
  "rms-status": "rms-status",
  "rms-data": "rms-maintenance-alerts",
  "rms-logs": "rms-logs",
  "rms-config": "rms-config-general",
  "monitor-data": "monitor-integrity",
  "monitor-config": "monitor-alarm-limits",
  "tx-data": "tx-data-main",
  "tx-config": "tx-config-nominal",
  diagnostics: "diagnostics-power-up",
  disabled: "disabled",
};

const viewGroups: Record<Dvor1150ScreenId, readonly Dvor1150ViewId[]> = {
  home: ["home"],
  "rms-status": ["rms-status"],
  "rms-data": ["rms-maintenance-alerts", "rms-ad-data"],
  "rms-logs": ["rms-logs"],
  "rms-config": ["rms-config-general", "rms-config-station", "rms-config-ad-limits"],
  "monitor-data": ["monitor-integrity", "monitor-sideband-vswr"],
  "monitor-config": ["monitor-alarm-limits", "monitor-offsets"],
  "tx-data": ["tx-data-main"],
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
  lastCommand: string | null;
}

export interface Dvor1150PmdtStoreActions {
  setMode: (mode: Dvor1150PmdtMode) => void;
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
  setTransmitterMode: (transmitterId: Dvor1150TransmitterId, mode: Dvor1150TransmitterMode) => boolean;
  executeCommand: (commandId: string) => boolean;
  openScreen: (screenId: Dvor1150ScreenId, menuPath: readonly string[], title?: string) => void;
  openView: (screenId: Dvor1150ScreenId, viewId: Dvor1150ViewId, menuPath: readonly string[], title?: string) => void;
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
    lastCommand: null,
  };
}

function preserveLiveSimulation(next: Dvor1150Config, current: Dvor1150Config): Dvor1150Config {
  next.simulation = { ...current.simulation };
  return next;
}

export function createDvor1150PmdtStore(
  options: Dvor1150PmdtStoreOptions = {},
): UseBoundStore<StoreApi<Dvor1150PmdtStore>> {
  const now = options.now ?? (() => new Date());
  return create<Dvor1150PmdtStore>()((set, get) => {
    const recompute = (config: Dvor1150Config, previous?: Dvor1150Snapshot): Dvor1150Snapshot => {
      const next = buildDvor1150Snapshot(config, now());
      if (previous?.data.logs.length) next.data.logs = [...previous.data.logs];
      return next;
    };

    const initial = buildInitialState(now);
    return {
      ...initial,
      setMode: (mode) => set({ mode }),
      openLogin: () => set({ loginDialogOpen: true, loginError: null }),
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
        const configDraft = cloneDvor1150Config(state.configDraft);
        configDraft.simulation.local = config.simulation.local;
        configDraft.simulation.integralMonitorBypass = config.simulation.integralMonitorBypass;
        set({ config, configDraft, derived: recompute(config, state.derived), lastCommand: enabled ? "Local On" : "Local Off" });
        return true;
      },
      setMonitorBypass: (_monitor, enabled) => {
        const state = get();
        if (state.securityLevel < 3 || (enabled && !state.config.simulation.local)) return false;
        const config = cloneDvor1150Config(state.config);
        config.simulation.integralMonitorBypass = enabled;
        const configDraft = cloneDvor1150Config(state.configDraft);
        configDraft.simulation.integralMonitorBypass = enabled;
        set({ config, configDraft, derived: recompute(config, state.derived), lastCommand: enabled ? "Integral Monitor Bypass On" : "Integral Monitor Bypass Off" });
        return true;
      },
      setConfigValue: (fieldId, value) => {
        const state = get();
        if (state.securityLevel < 3 || !state.config.simulation.local || !state.config.simulation.integralMonitorBypass || value === null) return;
        const configDraft = setDvor1150ConfigValue(state.configDraft, fieldId, value);
        set({ configDraft, configDirty: true });
      },
      applyConfigChanges: () => {
        const state = get();
        if (!state.configDirty || state.securityLevel < 3 || !state.config.simulation.local || !state.config.simulation.integralMonitorBypass) return false;
        const errors = validateDvor1150Config(state.configDraft);
        if (errors.length > 0) {
          set({ lastCommand: `Apply failed: ${errors[0]}` });
          return false;
        }
        const config = cloneDvor1150Config(state.configDraft);
        const derived = recompute(config, state.derived);
        derived.data.logs = [...derived.data.logs, { timeTag: config.simulation.timestamp, user: state.authenticatedUserId ?? "", message: "Configuration applied", severity: "yellow" }];
        set({ config, configDraft: cloneDvor1150Config(config), derived, configDirty: false, needBackup: true, lastCommand: "Apply (F7)" });
        return true;
      },
      resetConfigDraft: () => {
        const state = get();
        set({ configDraft: cloneDvor1150Config(state.config), configDirty: false, lastCommand: "Reset (F8)" });
        return true;
      },
      restoreConfig: () => {
        const state = get();
        if (state.securityLevel < 3 || !state.config.simulation.local || !state.config.simulation.integralMonitorBypass) return false;
        const restored = preserveLiveSimulation(cloneDvor1150Config(state.configurationBackup ?? defaultDvor1150Config), state.config);
        const derived = recompute(restored, state.derived);
        set({ config: restored, configDraft: cloneDvor1150Config(restored), derived, configDirty: false, needBackup: false, lastCommand: "RMS Config Restore" });
        return true;
      },
      backupConfig: () => {
        const state = get();
        if (state.securityLevel < 3 || !state.needBackup || !state.config.simulation.local || !state.config.simulation.integralMonitorBypass) return false;
        set({ configurationBackup: cloneDvor1150Config(state.config), needBackup: false, lastCommand: "RMS Config Backup" });
        return true;
      },
      setTransmitterMode: (transmitterId, mode) => {
        const state = get();
        if (state.securityLevel < 3) return false;
        if (mode !== "main" && (!state.config.simulation.local || !state.config.simulation.integralMonitorBypass)) return false;
        if (mode === "main" && state.config.station.transmitterConfig === "Single Transmitter" && transmitterId === "tx2") return false;
        const config = cloneDvor1150Config(state.config);
        if (mode === "main") {
          for (const id of ["tx1", "tx2"] as const) {
            config.transmitters[id].onAir = id === transmitterId;
            config.transmitters[id].load = false;
          }
        } else if (mode === "load") {
          config.transmitters[transmitterId].onAir = false;
          config.transmitters[transmitterId].load = true;
        } else {
          config.transmitters[transmitterId].onAir = false;
          config.transmitters[transmitterId].load = false;
        }
        const configDraft = cloneDvor1150Config(state.configDraft);
        configDraft.transmitters = cloneDvor1150Config(config).transmitters;
        set({ config, configDraft, derived: recompute(config, state.derived), lastCommand: `${transmitterId.toUpperCase()} ${mode}` });
        return true;
      },
      executeCommand: (commandId) => {
        const state = get();
        if (state.securityLevel < 2) return false;
        if (commandId === "set-time") {
          get().refreshClock();
          set({ lastCommand: "Set Time and Date" });
          return true;
        }
        if (commandId === "reset-rms" || commandId === "reset-intrusion" || commandId === "reset-smoke" || commandId === "abort-tests") {
          set({ lastCommand: commandId });
          return true;
        }
        return false;
      },
      openScreen: (screenId, menuPath) => set({ activeScreen: screenId, activeView: defaultViews[screenId], activeMenuPath: [...menuPath] }),
      openView: (screenId, viewId, menuPath) => set({ activeScreen: screenId, activeView: viewId, activeMenuPath: [...menuPath] }),
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
