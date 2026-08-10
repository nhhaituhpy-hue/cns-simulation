import type {
  VorAttemptEvent,
  VorEditableValue,
  VorExpectedCheckpoint,
  VorFieldOverride,
  VorIndicatorColor,
  VorParameterStatus,
  VorPmdtData,
  VorPmdtMode,
  VorSecurityLevel,
  VorScreenId,
  VorStudentAnswer,
  VorViewId,
} from "@/lib/vor-types";
import {
  applyDvorConfigPatches,
  buildDvor1150aSnapshot,
  cloneDvor1150aConfig,
  createDefaultDvor1150aConfig,
  type Dvor1150aConfig,
  type Dvor1150aSnapshot,
  type DvorConfigValue,
  type DvorTransmitterMode,
  type DvorTransmitterId,
} from "@/lib/dvor1150a";
import {
  collectChangedConfigFields,
  createParameterChangeLogEntries,
  prependParameterChangeLogEntries,
  type SimulatorParameterChangeLogEntry,
} from "@/lib/simulator-config/parameter-change";
import { extractDvor1150aConfig } from "@/lib/simulator-config/dvor-1150a";
import { create, type StoreApi, type UseBoundStore } from "zustand";

const emptyAnswer: VorStudentAnswer = {
  suspectedFault: "",
  reasoning: "",
  remediation: "",
};

const defaultViews: Record<VorScreenId, VorViewId> = {
  home: "home",
  "rms-status": "rms-status-main",
  "rms-data": "rms-maintenance-alerts",
  "rms-logs": "rms-logs-operational-summary",
  "rms-config": "rms-config-general",
  "monitor-data": "monitor-integral",
  "monitor-config": "monitor-alarm-limits",
  "monitor-test-results": "monitor-test-results",
  "monitor-fault-history": "monitor-fault-history",
  "monitor-1-offsets": "monitor-1-offsets",
  "monitor-2-offsets": "monitor-2-offsets",
  "tx-data": "tx-data-main",
  "tx-config": "tx-config-nominal",
  diagnostics: "diagnostics-power-up",
  disabled: "disabled",
};

export interface VorSessionInitialization {
  mode: VorPmdtMode;
  scenarioId?: string;
  sessionKey?: string;
  userId?: string;
  studentName?: string;
  workUnit?: string;
  overrides?: readonly VorFieldOverride[];
  expectedCheckpoints?: readonly VorExpectedCheckpoint[];
}

export interface VorPmdtStoreState {
  mode: VorPmdtMode;
  configPanelOpen: boolean;
  aboutDialogOpen: boolean;
  config: Dvor1150aConfig;
  configDraft: Dvor1150aConfig;
  configurationBackup: Dvor1150aConfig;
  configDirty: boolean;
  needBackup: boolean;
  parameterChangeLogs: SimulatorParameterChangeLogEntry[];
  lastCommand: string | null;
  loginDialogOpen: boolean;
  authenticatedUserId: string | null;
  securityLevel: VorSecurityLevel;
  loginError: string | null;
  data: VorPmdtData;
  derived: Dvor1150aSnapshot;
  activeScreen: VorScreenId;
  activeView: VorViewId;
  activeMenuPath: string[];
  scenarioId: string | null;
  sessionKey: string | null;
  userId: string;
  studentName: string;
  workUnit: string;
  overrides: VorFieldOverride[];
  expectedCheckpoints: VorExpectedCheckpoint[];
  studentFieldStates: VorFieldOverride[];
  attemptEvents: VorAttemptEvent[];
  answer: VorStudentAnswer;
}

export interface VorPmdtStoreActions {
  initializeSession: (initialization: VorSessionInitialization) => void;
  setMode: (mode: VorPmdtMode) => void;
  setConfigPanelOpen: (open: boolean) => void;
  setAboutDialogOpen: (open: boolean) => void;
  openLogin: () => void;
  login: (userId: string, password: string) => boolean;
  logout: () => void;
  setConfigValue: (fieldId: string, value: DvorConfigValue) => void;
  applyConfigChanges: () => boolean;
  discardConfigChanges: () => void;
  resetConfigDraft: () => boolean;
  restoreDefaultConfig: () => boolean;
  backupConfig: () => boolean;
  replaceConfig: (
    config: Dvor1150aConfig,
    backupConfig?: Dvor1150aConfig,
    parameterChangeLogs?: readonly SimulatorParameterChangeLogEntry[],
  ) => void;
  setTransmitterMode: (transmitterId: DvorTransmitterId, mode: DvorTransmitterMode) => boolean;
  selectMainTransmitter: (transmitterId: DvorTransmitterId) => boolean;
  openScreen: (screenId: VorScreenId, menuPath: readonly string[], title: string) => void;
  openView: (screenId: VorScreenId, viewId: VorViewId, menuPath: readonly string[], title: string) => void;
  setOverride: (
    fieldId: string,
    value: VorEditableValue,
    status?: VorIndicatorColor | VorParameterStatus,
  ) => void;
  removeOverride: (fieldId: string) => void;
  applyOverlay: (overrides: readonly VorFieldOverride[]) => void;
  clearOverlay: () => void;
  addCurrentViewAsCheckpoint: (guidance?: string, points?: number) => void;
  removeCheckpoint: (checkpointId: string) => void;
  interactWithSidebar: (
    fieldId: string,
    title: string,
    resultValue: VorEditableValue,
    resultStatus: VorIndicatorColor | VorParameterStatus,
  ) => void;
  updateEventAnnotation: (eventId: string, annotation: string) => void;
  removeEvent: (eventId: string) => void;
  updateAnswer: (changes: Partial<VorStudentAnswer>) => void;
  reset: () => void;
}

export type VorPmdtStore = VorPmdtStoreState & VorPmdtStoreActions;

export interface VorPmdtStoreOptions {
  now?: () => Date;
  generateId?: () => string;
}

function defaultId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `vor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function initialState(): VorPmdtStoreState {
  const config = createDefaultDvor1150aConfig();
  const derived = buildDvor1150aSnapshot(config);
  return {
    mode: "preview",
    configPanelOpen: false,
    aboutDialogOpen: false,
    config,
    configDraft: cloneDvor1150aConfig(config),
    configurationBackup: cloneDvor1150aConfig(config),
    configDirty: false,
    needBackup: false,
    parameterChangeLogs: derived.data.rmsParameterLogs.map((entry, index) => ({
      id: `default-vor-parameter-${index}`,
      timeTag: entry.timeTag,
      userName: entry.userName,
      file: entry.file,
      parameter: entry.file,
      state: "normal",
    })),
    lastCommand: null,
    loginDialogOpen: true,
    authenticatedUserId: null,
    securityLevel: 0,
    loginError: null,
    data: derived.data,
    derived,
    activeScreen: "home",
    activeView: "home",
    activeMenuPath: ["Home"],
    scenarioId: null,
    sessionKey: null,
    userId: "",
    studentName: "",
    workUnit: "",
    overrides: [],
    expectedCheckpoints: [],
    studentFieldStates: [],
    attemptEvents: [],
    answer: { ...emptyAnswer },
  };
}

export function resolveVorField<T extends VorEditableValue>(
  baseValue: T,
  fieldId: string,
  overrides: readonly VorFieldOverride[],
): T {
  const override = overrides.find((item) => item.fieldId === fieldId);
  return (override ? override.value : baseValue) as T;
}

export function resolveVorStatus<T extends VorIndicatorColor | VorParameterStatus>(
  baseStatus: T,
  fieldId: string,
  overrides: readonly VorFieldOverride[],
): T {
  const override = overrides.find((item) => item.fieldId === fieldId);
  const status = override?.status ?? baseStatus;

  // Map green/yellow/red to normal/warning/alarm when context requires parameter status
  if (baseStatus === "normal" || baseStatus === "warning" || baseStatus === "alarm") {
    if (status === "green") return "normal" as T;
    if (status === "yellow") return "warning" as T;
    if (status === "red") return "alarm" as T;
    if (status === "gray") return "normal" as T;
  }

  // Map normal/warning/alarm to green/yellow/red when context requires indicator color
  if (baseStatus === "green" || baseStatus === "yellow" || baseStatus === "red" || baseStatus === "gray") {
    if (status === "normal") return "green" as T;
    if (status === "warning") return "yellow" as T;
    if (status === "alarm") return "red" as T;
  }

  return status as T;
}

export function createVorPmdtStore(
  options: VorPmdtStoreOptions = {},
): UseBoundStore<StoreApi<VorPmdtStore>> {
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? defaultId;

  return create<VorPmdtStore>()((set, get) => {
    const recordVisit = (
      screenId: VorScreenId,
      viewId: VorViewId,
      menuPath: readonly string[],
      title: string,
    ): VorAttemptEvent[] => {
      const state = get();
      if (state.mode !== "student" || viewId === "disabled") {
        return state.attemptEvents;
      }
      const event: VorAttemptEvent = {
        id: generateId(),
        sequence: state.attemptEvents.length + 1,
        eventType: "view",
        screenId,
        viewId,
        menuPath: [...menuPath],
        title,
        visitedAt: now().toISOString(),
        annotation: "",
      };
      return [...state.attemptEvents, event];
    };

    return {
      ...initialState(),

      initializeSession: (initialization) => {
        const config = createDefaultDvor1150aConfig();
        const derived = buildDvor1150aSnapshot(config);
        set({
          ...initialState(),
          config,
          data: derived.data,
          derived,
          mode: initialization.mode,
          scenarioId: initialization.scenarioId ?? null,
          sessionKey: initialization.sessionKey ?? initialization.scenarioId ?? null,
          userId: initialization.userId?.trim() ?? "",
          studentName: initialization.studentName?.trim() ?? "",
          workUnit: initialization.workUnit?.trim() ?? "",
          overrides: initialization.overrides?.map((item) => ({ ...item })) ?? [],
          expectedCheckpoints:
            initialization.expectedCheckpoints?.map((item) => ({
              ...item,
              menuPath: [...item.menuPath],
            })) ?? [],
        });
      },

      setMode: (mode) => set({ mode }),

      setConfigPanelOpen: (open) => set({ configPanelOpen: open }),

      setAboutDialogOpen: (open) => set({ aboutDialogOpen: open }),

      openLogin: () => set({
        loginDialogOpen: true,
        authenticatedUserId: null,
        securityLevel: 0,
        loginError: null,
      }),

      login: (userId, password) => {
        const credentials: Array<{ userId: string; password: string; securityLevel: VorSecurityLevel }> = [
          { userId: "GUEST", password: "", securityLevel: 1 },
          { userId: "SEC3", password: "THREE", securityLevel: 3 },
          { userId: "SEC4", password: "FOUR", securityLevel: 4 },
        ];
        const identity = credentials.find(
          (item) => item.userId === userId.trim() && item.password === password,
        );
        if (!identity) {
          set({ loginError: "Invalid User ID or Password." });
          return false;
        }
        set({
          loginDialogOpen: false,
          authenticatedUserId: identity.userId,
          securityLevel: identity.securityLevel,
          loginError: null,
        });
        return true;
      },

      logout: () => set({
        loginDialogOpen: true,
        authenticatedUserId: null,
        securityLevel: 0,
        loginError: null,
        configPanelOpen: false,
        aboutDialogOpen: false,
      }),

      setConfigValue: (fieldId, value) => {
        const state = get();
        const isLocalModeField = fieldId === "simulation.local";
        const isBypassField = fieldId === "simulation.integralMonitorBypass";

        if (state.securityLevel < 3) return;

        if (isLocalModeField || isBypassField) {
          if (isBypassField && value === true && !state.config.simulation.local) return;
          const patches = [{ fieldId, value }];
          if (isLocalModeField && value === false) {
            patches.push({ fieldId: "simulation.integralMonitorBypass", value: false });
          }
          const result = applyDvorConfigPatches(state.config, patches);
          if (!result.ok) return;
          const draftResult = applyDvorConfigPatches(state.configDraft, patches);
          set({
            config: result.config,
            configDraft: draftResult.ok ? draftResult.config : cloneDvor1150aConfig(result.config),
            configDirty: state.configDirty,
            data: result.snapshot.data,
            derived: result.snapshot,
          });
          return;
        }

        if (!state.config.simulation.local || !state.config.simulation.integralMonitorBypass) return;
        const result = applyDvorConfigPatches(state.configDraft, [{ fieldId, value }]);
        if (!result.ok) return;
        set({
          configDraft: result.config,
          configDirty: JSON.stringify(result.config) !== JSON.stringify(state.config),
        });
      },

      applyConfigChanges: () => {
        const state = get();
        if (
          !state.configDirty
          || state.securityLevel < 3
          || !state.config.simulation.local
          || !state.config.simulation.integralMonitorBypass
        ) {
          return false;
        }
        const result = applyDvorConfigPatches(state.configDraft);
        if (!result.ok) return false;
        set({
          config: result.config,
          configDraft: cloneDvor1150aConfig(result.config),
          configDirty: false,
          needBackup: true,
          data: result.snapshot.data,
          derived: result.snapshot,
          lastCommand: "Configuration Apply",
        });
        return true;
      },

      discardConfigChanges: () => {
        const state = get();
        set({ configDraft: cloneDvor1150aConfig(state.config), configDirty: false });
      },

      resetConfigDraft: () => {
        const state = get();
        if (
          state.securityLevel < 3
          || !state.config.simulation.local
          || !state.config.simulation.integralMonitorBypass
        ) {
          return false;
        }
        const defaults = createDefaultDvor1150aConfig();
        defaults.simulation = { ...state.config.simulation };
        set({
          configDraft: defaults,
          configDirty: JSON.stringify(defaults) !== JSON.stringify(state.config),
        });
        return true;
      },

      restoreDefaultConfig: () => {
        const state = get();
        if (
          state.securityLevel < 3
          || !state.config.simulation.local
          || !state.config.simulation.integralMonitorBypass
        ) {
          return false;
        }

        // Restore persistent station/transmitter/monitor parameters while
        // keeping the live maintenance session available for the operator.
        const defaults = createDefaultDvor1150aConfig();
        defaults.simulation = { ...state.config.simulation };
        const result = applyDvorConfigPatches(defaults);
        if (!result.ok) return false;
        set({
          config: result.config,
          configDraft: cloneDvor1150aConfig(result.config),
          configDirty: false,
          needBackup: false,
          data: result.snapshot.data,
          derived: result.snapshot,
          lastCommand: "RMS Config Restore",
        });
        return true;
      },

      backupConfig: () => {
        const state = get();
        if (state.securityLevel < 3 || !state.needBackup) return false;
        const changedFields = collectChangedConfigFields(
          extractDvor1150aConfig(state.configurationBackup),
          extractDvor1150aConfig(state.config),
        );
        const nextLogs = createParameterChangeLogEntries({
          changedFields,
          timeTag: state.data.timestamp,
          userName: state.authenticatedUserId,
          file: "RMS",
          actionLabel: "RMS Configuration Backup",
        });
        set({
          configurationBackup: cloneDvor1150aConfig(state.config),
          parameterChangeLogs: prependParameterChangeLogEntries(state.parameterChangeLogs, nextLogs),
          needBackup: false,
          lastCommand: "RMS Config Backup",
        });
        return true;
      },

      replaceConfig: (config, backupConfig = config, parameterChangeLogs) => {
        const nextConfig = cloneDvor1150aConfig(config);
        const nextBackupConfig = cloneDvor1150aConfig(backupConfig);
        const derived = buildDvor1150aSnapshot(nextConfig);
        set({
          config: nextConfig,
          configDraft: cloneDvor1150aConfig(nextConfig),
          configurationBackup: nextBackupConfig,
          configDirty: false,
          needBackup: JSON.stringify(extractDvor1150aConfig(nextConfig)) !== JSON.stringify(extractDvor1150aConfig(nextBackupConfig)),
          parameterChangeLogs: parameterChangeLogs ? [...parameterChangeLogs] : get().parameterChangeLogs,
          data: derived.data,
          derived,
          lastCommand: "User configuration loaded",
        });
      },

      setTransmitterMode: (transmitterId, mode) => {
        const state = get();
        if (state.securityLevel < 3) return false;
        if (
          mode !== "main"
          && (!state.config.simulation.local || !state.config.simulation.integralMonitorBypass)
        ) {
          return false;
        }

        const target = state.config.transmitters[transmitterId];
        if (mode !== "off" && (!target.enabled || target.faults.disabled)) return false;

        const patches = mode === "main"
          ? [
              { fieldId: "transmitters.tx1.onAir", value: transmitterId === "tx1" },
              { fieldId: "transmitters.tx1.load", value: false },
              { fieldId: "transmitters.tx2.onAir", value: transmitterId === "tx2" },
              { fieldId: "transmitters.tx2.load", value: false },
            ]
          : [
              { fieldId: `transmitters.${transmitterId}.onAir`, value: false },
              { fieldId: `transmitters.${transmitterId}.load`, value: mode === "load" },
            ];

        const result = applyDvorConfigPatches(state.config, patches);
        if (!result.ok) return false;
        const draftResult = applyDvorConfigPatches(state.configDraft, patches);
        set({
          config: result.config,
          configDraft: draftResult.ok ? draftResult.config : cloneDvor1150aConfig(result.config),
          data: result.snapshot.data,
          derived: result.snapshot,
        });
        return true;
      },

      selectMainTransmitter: (transmitterId) => get().setTransmitterMode(transmitterId, "main"),

      openScreen: (screenId, menuPath, title) => {
        const viewId = defaultViews[screenId];
        set({
          activeScreen: screenId,
          activeView: viewId,
          activeMenuPath: [...menuPath],
          attemptEvents: recordVisit(screenId, viewId, menuPath, title),
        });
      },

      openView: (screenId, viewId, menuPath, title) => {
        set({
          activeScreen: screenId,
          activeView: viewId,
          activeMenuPath: [...menuPath],
          attemptEvents: recordVisit(screenId, viewId, menuPath, title),
        });
      },

      setOverride: (fieldId, value, status) => {
        const override: VorFieldOverride = { fieldId, value, ...(status ? { status } : {}) };
        set((state) => ({
          overrides: [
            ...state.overrides.filter((item) => item.fieldId !== fieldId),
            override,
          ],
        }));
      },

      removeOverride: (fieldId) =>
        set((state) => ({
          overrides: state.overrides.filter((item) => item.fieldId !== fieldId),
        })),

      applyOverlay: (overrides) =>
        set({ overrides: overrides.map((item) => ({ ...item })) }),

      clearOverlay: () => set({ overrides: [] }),

      addCurrentViewAsCheckpoint: (guidance = "", points = 10) => {
        const state = get();
        if (state.activeView === "disabled") return;
        const existing = state.expectedCheckpoints.find(
          (item) => item.viewId === state.activeView,
        );
        if (existing) return;
        const checkpoint: VorExpectedCheckpoint = {
          id: generateId(),
          order: state.expectedCheckpoints.length + 1,
          viewId: state.activeView,
          menuPath: [...state.activeMenuPath],
          title: state.activeMenuPath.at(-1) ?? state.activeView,
          guidance,
          required: true,
          points,
        };
        set({ expectedCheckpoints: [...state.expectedCheckpoints, checkpoint] });
      },

      removeCheckpoint: (checkpointId) =>
        set((state) => ({
          expectedCheckpoints: state.expectedCheckpoints
            .filter((item) => item.id !== checkpointId)
            .map((item, index) => ({ ...item, order: index + 1 })),
        })),

      interactWithSidebar: (fieldId, title, resultValue, resultStatus) => {
        const state = get();
        if (state.mode !== "student") return;
        const event: VorAttemptEvent = {
          id: generateId(),
          sequence: state.attemptEvents.length + 1,
          eventType: "sidebar",
          screenId: state.activeScreen,
          viewId: state.activeView,
          menuPath: ["Sidebar", title],
          title,
          visitedAt: now().toISOString(),
          annotation: "",
          fieldId,
          resultValue,
          resultStatus,
        };
        set({
          studentFieldStates: [
            ...state.studentFieldStates.filter((item) => item.fieldId !== fieldId),
            { fieldId, value: resultValue, status: resultStatus },
          ],
          attemptEvents: [...state.attemptEvents, event],
        });
      },

      updateEventAnnotation: (eventId, annotation) =>
        set((state) => ({
          attemptEvents: state.attemptEvents.map((event) =>
            event.id === eventId ? { ...event, annotation } : event,
          ),
        })),
      
      removeEvent: (eventId) =>
        set((state) => {
          const filtered = state.attemptEvents.filter((event) => event.id !== eventId);
          return {
            attemptEvents: filtered.map((event, index) => ({
              ...event,
              sequence: index + 1,
            })),
          };
        }),

      updateAnswer: (changes) =>
        set((state) => ({ answer: { ...state.answer, ...changes } })),

      reset: () => set(initialState()),
    };
  });
}

export const useVorPmdtStore = createVorPmdtStore();
