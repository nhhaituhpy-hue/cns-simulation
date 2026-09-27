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
  DVOR_MONITOR_IDS,
  dvorConfigFieldCatalog,
  getDvorConfigValue,
  type Dvor1150aConfig,
  type Dvor1150aSnapshot,
  type DvorConfigValue,
  type DvorTransmitterMode,
  type DvorTransmitterId,
} from "@/lib/dvor1150a";
import {
  configurationForDvor1150aScenario,
  createDefaultDvor1150aScenarioDefinition,
  isDvor1150aScenarioStudentEditable,
  getDvor1150aScenarioProtectedFieldChanges,
  type Dvor1150aScenarioDefinition,
  type Dvor1150aScenarioRuntime,
  validateDvor1150aScenarioDefinition,
} from "@/lib/dvor1150a/scenario";
import {
  collectChangedConfigFields,
  createParameterChangeLogEntries,
  prependParameterChangeLogEntries,
  type SimulatorParameterChangeLogEntry,
} from "@/lib/simulator-config/parameter-change";
import { extractDvor1150aConfig } from "@/lib/simulator-config/dvor-1150a";
import type {
  ScenarioParameterChange,
  ScenarioActionEvent,
  ScenarioEvidenceStats,
  ScenarioEvidenceSnapshot,
  ScenarioEvidenceValue,
} from "@/lib/scenario-evidence";
import {
  appendScenarioEvidenceEvent,
  createScenarioEvidenceStats,
} from "@/lib/scenario-evidence";
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
  revisionKey?: string;
  userId?: string;
  studentName?: string;
  workUnit?: string;
  overrides?: readonly VorFieldOverride[];
  expectedCheckpoints?: readonly VorExpectedCheckpoint[];
}

export interface VorReviewSessionContext {
  userId?: string;
  sessionKey?: string;
  revisionKey?: string;
}

export type DvorScenarioStage = "pmdt" | "hardware" | "complete";
export type DvorDiagnosticRun = "full" | "on-air";

export interface VorDiagnosticState {
  run: DvorDiagnosticRun | null;
  completed: boolean;
  subsystem: string | null;
  result: string | null;
}

export interface VorPmdtStoreState {
  mode: VorPmdtMode;
  configPanelOpen: boolean;
  scenarioParametersOpen: boolean;
  scenarioAuthoringEnabled: boolean;
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
  scenarioRevisionKey: string | null;
  userId: string;
  studentName: string;
  workUnit: string;
  overrides: VorFieldOverride[];
  expectedCheckpoints: VorExpectedCheckpoint[];
  studentFieldStates: VorFieldOverride[];
  attemptEvents: VorAttemptEvent[];
  actionHistory: ScenarioActionEvent[];
  evidenceStats: ScenarioEvidenceStats;
  answer: VorStudentAnswer;
  scenario: Dvor1150aScenarioRuntime;
  scenarioDraft: Dvor1150aScenarioDefinition;
  scenarioStage: DvorScenarioStage;
  scenarioHardwareSelection: string[];
  scenarioHardwareInspected: string[];
  scenarioHardwareReasoning: string;
  scenarioHardwareDispositionConfirmed: boolean;
  diagnosticState: VorDiagnosticState;
}

export interface VorPmdtStoreActions {
  initializeSession: (initialization: VorSessionInitialization) => void;
  setMode: (mode: VorPmdtMode) => void;
  setConfigPanelOpen: (open: boolean) => void;
  setScenarioParametersOpen: (open: boolean) => void;
  setScenarioAuthoringEnabled: (enabled: boolean) => void;
  replaceScenarioDraft: (definition: Dvor1150aScenarioDefinition) => void;
  applyScenario: () => boolean;
  startReviewScenario: (definition: Dvor1150aScenarioDefinition, context?: VorReviewSessionContext) => boolean;
  setScenarioStage: (stage: DvorScenarioStage) => void;
  toggleScenarioHardware: (occurrenceKey: string) => void;
  inspectScenarioHardware: (occurrenceKey: string) => void;
  setScenarioHardwareReasoning: (reasoning: string) => void;
  confirmScenarioSoftwareResolution: () => void;
  runDiagnostics: (run: DvorDiagnosticRun) => boolean;
  cancelDiagnostics: () => void;
  restoreScenario: () => boolean;
  endScenario: () => boolean;
  setAboutDialogOpen: (open: boolean) => void;
  openLogin: () => void;
  login: (userId: string, password: string) => boolean;
  logout: () => void;
  setConfigValue: (fieldId: string, value: DvorConfigValue, mirrorFieldIds?: readonly string[]) => void;
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
  restoreScenarioEvidence: (evidence: {
    actionHistory: readonly ScenarioActionEvent[];
    attemptEvents: readonly VorAttemptEvent[];
    answer?: Partial<VorStudentAnswer>;
    scenarioHardwareSelection?: readonly string[];
    scenarioHardwareInspected?: readonly string[];
    scenarioHardwareReasoning?: string;
    scenarioHardwareDispositionConfirmed?: boolean;
    evidenceStats?: ScenarioEvidenceStats;
    checkpoint?: {
      config: Dvor1150aConfig;
      configDraft: Dvor1150aConfig;
      configurationBackup: Dvor1150aConfig;
      configDirty: boolean;
      needBackup: boolean;
      scenarioStage: DvorScenarioStage;
      diagnosticState: VorDiagnosticState;
    };
  }) => void;
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
    scenarioParametersOpen: false,
    scenarioAuthoringEnabled: false,
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
    scenarioRevisionKey: null,
    userId: "",
    studentName: "",
    workUnit: "",
    overrides: [],
    expectedCheckpoints: [],
    studentFieldStates: [],
    attemptEvents: [],
    actionHistory: [],
    evidenceStats: createScenarioEvidenceStats(),
    answer: { ...emptyAnswer },
    scenario: { active: false, definition: null, startedAt: null },
    scenarioDraft: createDefaultDvor1150aScenarioDefinition(),
    scenarioStage: "pmdt",
    scenarioHardwareSelection: [],
    scenarioHardwareInspected: [],
    scenarioHardwareReasoning: "",
    scenarioHardwareDispositionConfirmed: false,
    diagnosticState: {
      run: null,
      completed: false,
      subsystem: null,
      result: null,
    },
  };
}

interface AutomaticMonitorTransfer {
  config: Dvor1150aConfig;
  snapshot: Dvor1150aSnapshot;
  target: DvorTransmitterId | null;
  action: "transfer" | "shutdown" | null;
}

function allEnabledMonitorsReportAlarm(snapshot: Dvor1150aSnapshot): boolean {
  const enabledMonitors = DVOR_MONITOR_IDS
    .map((monitorId) => snapshot.monitors[monitorId])
    .filter((monitor) => monitor.enabled);

  return enabledMonitors.length > 0 && enabledMonitors.every((monitor) =>
    Object.values(monitor.parameters).some((parameter) => parameter.status === "alarm"),
  );
}

/**
 * Evaluates the relay at most once for a configuration change. The engine
 * remains a pure snapshot builder; this store-level operation is the single,
 * explicit state transition that can move the physical main route. A monitor
 * calibration alarm can remain visible after the route changes because it is
 * independent of the transmitter. Only shut down when every enabled monitor
 * path still reports an alarm after the transfer; this keeps that persistent
 * calibration alarm from being mistaken for a bad standby transmitter.
 */
function applyAutomaticMonitorTransfer(
  config: Dvor1150aConfig,
  mainTransmitter?: DvorTransmitterId | null,
): AutomaticMonitorTransfer {
  const snapshot = buildDvor1150aSnapshot(config, undefined, mainTransmitter ?? undefined);
  const active = snapshot.voting.activeTransmitter;
  const noAction = { config, snapshot, target: null, action: null } as const;

  if (
    !snapshot.voting.transferRequested
    || !active
    || config.station.transmitterConfig !== "Dual Transmitters"
    || (mainTransmitter && active !== mainTransmitter)
  ) {
    return noAction;
  }

  const target: DvorTransmitterId = active === "tx1" ? "tx2" : "tx1";
  const standby = config.transmitters[target];
  if (!standby.enabled || standby.faults.disabled) {
    return noAction;
  }

  const result = applyDvorConfigPatches(config, [
    { fieldId: `transmitters.${target}.onAir`, value: true },
  ]);
  if (!result.ok) return noAction;
  const transferredSnapshot = buildDvor1150aSnapshot(
    result.config,
    undefined,
    mainTransmitter ?? active,
  );

  if (allEnabledMonitorsReportAlarm(transferredSnapshot)) {
    const shutdown = applyDvorConfigPatches(result.config, [
      { fieldId: "transmitters.tx1.enabled", value: false },
      { fieldId: "transmitters.tx1.onAir", value: false },
      { fieldId: "transmitters.tx1.load", value: false },
      { fieldId: "transmitters.tx2.enabled", value: false },
      { fieldId: "transmitters.tx2.onAir", value: false },
      { fieldId: "transmitters.tx2.load", value: false },
    ]);
    return shutdown.ok
      ? {
          config: shutdown.config,
          snapshot: buildDvor1150aSnapshot(shutdown.config, undefined, mainTransmitter ?? active),
          target: null,
          action: "shutdown",
        }
      : noAction;
  }

  return { config: result.config, snapshot: transferredSnapshot, target, action: "transfer" };
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

function vorEvidenceSnapshot(state: VorPmdtStoreState): ScenarioEvidenceSnapshot {
  return {
    screen: state.activeScreen,
    view: state.activeView,
    local: state.config.simulation.local,
    monitorBypass: state.data.monitorIntegral.bypass,
    monitorNormal: state.data.monitorIntegral.normal,
    primaryMonitorAlarm: state.data.monitorIntegral.priAlarm,
    secondaryMonitorAlarm: state.data.monitorIntegral.secAlarm,
    activeTransmitter: state.derived.voting.activeTransmitter,
    sidebandVswrAlarm: Object.values(state.derived.monitors).some(
      (monitor) => monitor.enabled && monitor.parameters.sidebandVswr.status === "alarm",
    ),
    activeAlerts: state.data.generalAlerts.filter((alert) => alert.checked).map((alert) => alert.label),
    scenarioStage: state.scenarioStage,
    diagnosticRun: state.diagnosticState.run,
    diagnosticCompleted: state.diagnosticState.completed,
    hardwareDispositionConfirmed: state.scenarioHardwareDispositionConfirmed,
  };
}

function dvorParameterChanges(
  before: Dvor1150aConfig,
  after: Dvor1150aConfig,
  fieldIds: readonly string[],
  phase: ScenarioParameterChange["phase"],
): ScenarioParameterChange[] {
  return [...new Set(fieldIds)].flatMap((fieldId) => {
    const beforeValue = getDvorConfigValue(before, fieldId);
    const afterValue = getDvorConfigValue(after, fieldId);
    if (Object.is(beforeValue, afterValue)) return [];
    return [{
      fieldId,
      label: dvorConfigFieldCatalog.find((field) => field.id === fieldId)?.label ?? fieldId,
      before: beforeValue,
      after: afterValue,
      phase,
      accepted: true,
    }];
  });
}

export function createVorPmdtStore(
  options: VorPmdtStoreOptions = {},
): UseBoundStore<StoreApi<VorPmdtStore>> {
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? defaultId;

  return create<VorPmdtStore>()((set, get) => {
    const recordAction = (input: {
      actor?: ScenarioActionEvent["actor"];
      kind: ScenarioActionEvent["kind"];
      controlId?: string;
      menuPath?: readonly string[];
      label: string;
      input?: ScenarioEvidenceValue;
      accepted: boolean;
      reason?: string;
      before?: ScenarioEvidenceSnapshot;
      parameterChanges?: readonly ScenarioParameterChange[];
    }) => {
      const state = get();
      if (state.mode !== "student" && input.actor !== "system") return;
      const draftOnly = input.accepted
        && input.kind === "configuration"
        && input.label.startsWith("Stage ")
        && (!input.parameterChanges?.length || input.parameterChanges.every((change) => change.phase === "draft"));
      // Keystrokes update the draft continuously. They are not independent
      // business events and must not consume the capped evidence slots.
      if (draftOnly) return;
      const sequence = state.evidenceStats.totalEventCount + 1;
      const event: ScenarioActionEvent = {
        id: generateId(),
        sequence,
        occurredAt: now().toISOString(),
        actor: input.actor ?? "student",
        kind: input.kind,
        ...(input.controlId ? { controlId: input.controlId } : {}),
        menuPath: [...(input.menuPath ?? state.activeMenuPath)],
        label: input.label,
        ...(input.input !== undefined ? { input: structuredClone(input.input) } : {}),
        accepted: input.accepted,
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.before ? { before: structuredClone(input.before) } : {}),
        after: vorEvidenceSnapshot(state),
        ...(input.parameterChanges?.length ? { parameterChanges: structuredClone(input.parameterChanges) } : {}),
      };
      const appended = appendScenarioEvidenceEvent(state.actionHistory, event, state.evidenceStats);
      set({ actionHistory: appended.history, evidenceStats: appended.stats });
    };

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

    const applyScenarioBaseline = (
      definition: Dvor1150aScenarioDefinition,
      message: string,
      startedAt: string | null,
    ) => {
      const state = get();
      const config = configurationForDvor1150aScenario(definition, state.config);
      const derived = buildDvor1150aSnapshot(config);
      set({
        config,
        configDraft: cloneDvor1150aConfig(config),
        configurationBackup: cloneDvor1150aConfig(config),
        configDirty: false,
        needBackup: false,
        data: derived.data,
        derived,
        scenario: {
          active: true,
          definition: structuredClone(definition),
          startedAt: startedAt ?? now().toISOString(),
        },
        scenarioDraft: structuredClone(definition),
        scenarioStage: "pmdt",
        scenarioHardwareSelection: [],
        scenarioHardwareInspected: [],
        scenarioHardwareReasoning: "",
        scenarioHardwareDispositionConfirmed: false,
        diagnosticState: {
          run: null,
          completed: false,
          subsystem: null,
          result: null,
        },
        lastCommand: message,
      });
      return true;
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
          scenarioRevisionKey: initialization.revisionKey?.trim()
            || initialization.sessionKey
            || initialization.scenarioId
            || null,
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

      setConfigPanelOpen: (open) => set((state) => ({
        configPanelOpen: open,
        scenarioParametersOpen: open ? false : state.scenarioParametersOpen,
      })),

      setScenarioParametersOpen: (open) => set((state) => ({
        scenarioParametersOpen: open && state.scenarioAuthoringEnabled,
        configPanelOpen: open ? false : state.configPanelOpen,
        lastCommand: open && !state.scenarioAuthoringEnabled
          ? "Scenario Parameters are restricted to Examiner accounts."
          : state.lastCommand,
      })),

      setScenarioAuthoringEnabled: (enabled) => set((state) => ({
        scenarioAuthoringEnabled: enabled,
        scenarioParametersOpen: enabled ? state.scenarioParametersOpen : false,
      })),

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
        const issues = validateDvor1150aScenarioDefinition(state.scenarioDraft);
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

      startReviewScenario: (definition, context) => {
        const previous = get();
        const issues = validateDvor1150aScenarioDefinition(definition);
        if (issues.length > 0) {
          set({ lastCommand: `Review scenario initialization failed: ${issues[0]}` });
          return false;
        }
        const applied = applyScenarioBaseline(
          definition,
          `Review scenario started: ${definition.name}`,
          null,
        );
        if (applied) {
          set({
            mode: "student",
            scenarioParametersOpen: false,
            userId: context?.userId?.trim() || previous.userId,
            sessionKey: context?.sessionKey?.trim() || previous.sessionKey || definition.id,
            scenarioRevisionKey: context?.revisionKey?.trim()
              || previous.scenarioRevisionKey
              || definition.id,
          });
        }
        return applied;
      },

      setScenarioStage: (stage) => {
        const state = get();
        if (!state.scenario.active || !state.scenario.definition?.diagnosis) return;
        const before = vorEvidenceSnapshot(state);
        set({ scenarioStage: stage });
        recordAction({
          kind: "control",
          controlId: `scenario-stage-${stage}`,
          label: stage === "hardware" ? "Continue to hardware identification" : `Scenario stage: ${stage}`,
          accepted: true,
          before,
        });
      },

      toggleScenarioHardware: (occurrenceKey) => {
        const state = get();
        if (!state.scenario.active || !state.scenario.definition?.diagnosis) return;
        const before = vorEvidenceSnapshot(state);
        const selected = state.scenarioHardwareSelection.includes(occurrenceKey);
        set({
          scenarioHardwareSelection: selected
            ? state.scenarioHardwareSelection.filter((key) => key !== occurrenceKey)
            : [...state.scenarioHardwareSelection, occurrenceKey],
        });
        recordAction({
          kind: "control",
          controlId: `hardware-occurrence-${occurrenceKey}`,
          label: selected ? "Unselect hardware occurrence" : "Select hardware occurrence",
          input: { occurrenceKey, selected: !selected },
          accepted: true,
          before,
        });
      },

      inspectScenarioHardware: (occurrenceKey) => {
        const state = get();
        if (!state.scenario.active || !state.scenario.definition?.diagnosis) return;
        if (state.scenarioHardwareInspected.includes(occurrenceKey)) return;
        set({ scenarioHardwareInspected: [...state.scenarioHardwareInspected, occurrenceKey] });
      },

      setScenarioHardwareReasoning: (reasoning) => set({ scenarioHardwareReasoning: reasoning }),

      confirmScenarioSoftwareResolution: () => {
        const state = get();
        if (state.scenario.definition?.diagnosis?.disposition !== "software-adjustment") return;
        const before = vorEvidenceSnapshot(state);
        set({ scenarioHardwareDispositionConfirmed: true });
        recordAction({
          kind: "control",
          controlId: "hardware-no-replacement",
          label: "Confirm no hardware replacement",
          accepted: true,
          before,
        });
      },

      runDiagnostics: (run) => {
        const state = get();
        const before = vorEvidenceSnapshot(state);
        const diagnosis = state.scenario.definition?.diagnosis;
        if (!state.scenario.active || !diagnosis) return false;
        if (diagnosis.diagnosticRun !== run) {
          recordAction({
            kind: "control",
            controlId: `diagnostics-run-${run}`,
            label: `Run ${run} diagnostics`,
            accepted: false,
            reason: "This diagnostic mode is not part of the scenario contract.",
            before,
          });
          return false;
        }
        if (state.securityLevel < 3 || !state.config.simulation.local) {
          recordAction({
            kind: "control",
            controlId: `diagnostics-run-${run}`,
            label: `Run ${run} diagnostics`,
            accepted: false,
            reason: run === "full"
              ? "Full diagnostics require Local mode and Security Level 3 or higher."
              : "On-Air diagnostics require an authenticated maintenance account.",
            before,
          });
          return false;
        }
        set({
          diagnosticState: {
            run,
            completed: true,
            subsystem: diagnosis.diagnosticSubsystem,
            result: diagnosis.diagnosticResult,
          },
          lastCommand: `${run === "full" ? "Full" : "On-Air"} Diagnostics completed`,
        });
        recordAction({
          kind: "control",
          controlId: `diagnostics-run-${run}`,
          label: `Run ${run} diagnostics`,
          accepted: true,
          input: { run },
          before,
        });
        return true;
      },

      cancelDiagnostics: () => {
        const state = get();
        if (!state.diagnosticState.run) return;
        set({
          diagnosticState: {
            run: null,
            completed: false,
            subsystem: null,
            result: null,
          },
          lastCommand: "Diagnostics canceled",
        });
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
        if (!state.scenarioAuthoringEnabled || !state.scenario.active) {
          if (!state.scenarioAuthoringEnabled) {
            set({ lastCommand: "Scenario end is restricted to Examiner accounts." });
          }
          return false;
        }
        const config = createDefaultDvor1150aConfig();
        config.simulation = {
          ...state.config.simulation,
          local: false,
          integralMonitorBypass: false,
        };
        const derived = buildDvor1150aSnapshot(config);
        set({
          config,
          configDraft: cloneDvor1150aConfig(config),
          configurationBackup: cloneDvor1150aConfig(config),
          configDirty: false,
          needBackup: false,
          data: derived.data,
          derived,
          scenario: { active: false, definition: null, startedAt: null },
          scenarioDraft: createDefaultDvor1150aScenarioDefinition(),
          scenarioStage: "pmdt",
          scenarioHardwareSelection: [],
          scenarioHardwareInspected: [],
          scenarioHardwareReasoning: "",
          scenarioHardwareDispositionConfirmed: false,
          diagnosticState: {
            run: null,
            completed: false,
            subsystem: null,
            result: null,
          },
          lastCommand: "Scenario ended; Đài TEST/TST defaults restored",
        });
        return true;
      },

      setAboutDialogOpen: (open) => set({ aboutDialogOpen: open }),

      openLogin: () => set({
        loginDialogOpen: true,
        authenticatedUserId: null,
        securityLevel: 0,
        loginError: null,
      }),

      login: (userId, password) => {
        const before = vorEvidenceSnapshot(get());
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
          recordAction({
            kind: "authentication",
            controlId: "pmdt-login",
            label: "PMDT login",
            input: { userId: userId.trim() },
            accepted: false,
            reason: "Invalid User ID or Password.",
            before,
          });
          return false;
        }
        set({
          loginDialogOpen: false,
          authenticatedUserId: identity.userId,
          securityLevel: identity.securityLevel,
          loginError: null,
        });
        recordAction({
          kind: "authentication",
          controlId: "pmdt-login",
          label: "PMDT login",
          input: { userId: identity.userId, securityLevel: identity.securityLevel },
          accepted: true,
          before,
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

      setConfigValue: (fieldId, value, mirrorFieldIds = []) => {
        const state = get();
        const isLocalModeField = fieldId === "simulation.local";
        const isBypassField = fieldId === "simulation.integralMonitorBypass";
        const before = vorEvidenceSnapshot(state);

        if (state.securityLevel < 3) {
          recordAction({ kind: "configuration", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: false, reason: "Security level is insufficient.", before });
          return;
        }

        if (isLocalModeField || isBypassField) {
          if (isBypassField && value === true && !state.config.simulation.local) {
            recordAction({ kind: "control", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: false, reason: "Local mode is required before enabling Monitor Bypass.", before });
            return;
          }
          const patches = [{ fieldId, value }];
          const shouldEvaluateAutomaticTransfer = (isBypassField && value === false)
            || (isLocalModeField && value === false);
          if (isLocalModeField && value === false) {
            patches.push({ fieldId: "simulation.integralMonitorBypass", value: false });
          }
          const result = applyDvorConfigPatches(state.config, patches);
          if (!result.ok) {
            recordAction({ kind: "configuration", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: false, reason: "PMDT rejected the configuration value.", before });
            return;
          }
          const automaticTransfer = shouldEvaluateAutomaticTransfer
            ? applyAutomaticMonitorTransfer(result.config, state.derived.mainTransmitter)
            : null;
          const nextConfig = automaticTransfer?.config ?? result.config;
          const nextSnapshot = automaticTransfer?.snapshot
            ?? buildDvor1150aSnapshot(result.config, undefined, state.derived.mainTransmitter ?? undefined);
          const draftResult = applyDvorConfigPatches(state.configDraft, patches);
          let nextDraft = draftResult.ok
            ? draftResult.config
            : cloneDvor1150aConfig(nextConfig);
          if (automaticTransfer?.action === "transfer" && automaticTransfer.target) {
            const draftTransfer = applyDvorConfigPatches(nextDraft, [
              { fieldId: `transmitters.${automaticTransfer.target}.onAir`, value: true },
            ]);
            nextDraft = draftTransfer.ok
              ? draftTransfer.config
              : cloneDvor1150aConfig(nextConfig);
          } else if (automaticTransfer?.action === "shutdown") {
            const draftShutdown = applyDvorConfigPatches(nextDraft, [
              { fieldId: "transmitters.tx1.enabled", value: false },
              { fieldId: "transmitters.tx1.onAir", value: false },
              { fieldId: "transmitters.tx1.load", value: false },
              { fieldId: "transmitters.tx2.enabled", value: false },
              { fieldId: "transmitters.tx2.onAir", value: false },
              { fieldId: "transmitters.tx2.load", value: false },
            ]);
            nextDraft = draftShutdown.ok
              ? draftShutdown.config
              : cloneDvor1150aConfig(nextConfig);
          }
          set({
            config: nextConfig,
            configDraft: nextDraft,
            configDirty: state.configDirty,
            data: nextSnapshot.data,
            derived: nextSnapshot,
            ...(automaticTransfer?.action === "transfer" && automaticTransfer.target
              ? { lastCommand: `Automatic monitor transfer to ${automaticTransfer.target.toUpperCase()}` }
              : automaticTransfer?.action === "shutdown"
                ? { lastCommand: "Automatic monitor shutdown: both transmitters off" }
                : {}),
          });
          recordAction({ kind: "control", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: true, before });
          if (automaticTransfer?.action) {
            recordAction({ actor: "system", kind: "system", controlId: "automatic-monitor-transfer", label: automaticTransfer.action === "transfer" && automaticTransfer.target ? `Automatic monitor transfer to ${automaticTransfer.target.toUpperCase()}` : "Automatic monitor shutdown", accepted: true, reason: "PMDT automatic protection response.", before: vorEvidenceSnapshot(get()) });
          }
          return;
        }

        if (!state.config.simulation.local) {
          recordAction({ kind: "configuration", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: false, reason: "Local mode is disabled.", before });
          return;
        }
        const fieldIds = [...new Set([fieldId, ...mirrorFieldIds])];
        if (
          state.scenario.active
          && fieldIds.some((id) => !isDvor1150aScenarioStudentEditable(state.scenario.definition, id))
        ) {
          set({ lastCommand: "Scenario control locked: examiner recovery controls only" });
          recordAction({ kind: "configuration", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: false, reason: "Scenario recovery controls only.", before });
          return;
        }
        // Shared Nominal controls stage both transmitters atomically. Keep the
        // engine untouched until Apply, and never bypass either scenario lock.
        const result = applyDvorConfigPatches(
          state.configDraft,
          fieldIds.map((id) => ({ fieldId: id, value })),
        );
        if (!result.ok) {
          recordAction({ kind: "configuration", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: false, reason: "PMDT rejected the configuration value.", before });
          return;
        }
        set({
          configDraft: result.config,
          configDirty: JSON.stringify(result.config) !== JSON.stringify(state.config),
        });
        recordAction({
          kind: "configuration",
          controlId: fieldId,
          label: `Stage ${fieldId}`,
          input: { fieldId, value: String(value) },
          accepted: true,
          before,
          parameterChanges: dvorParameterChanges(state.configDraft, result.config, fieldIds, "draft"),
        });
      },

      applyConfigChanges: () => {
        const state = get();
        const before = vorEvidenceSnapshot(state);
        if (
          !state.configDirty
          || state.securityLevel < 3
          || !state.config.simulation.local
        ) {
          recordAction({ kind: "configuration", controlId: "config-apply", label: "Configuration Apply", accepted: false, reason: "PMDT is not ready to Apply the draft.", before });
          return false;
        }
        const result = applyDvorConfigPatches(state.configDraft);
        if (!result.ok) {
          recordAction({ kind: "configuration", controlId: "config-apply", label: "Configuration Apply", accepted: false, reason: "Configuration validation failed.", before });
          return false;
        }
        if (state.scenario.active && state.scenario.definition) {
          const protectedChanges = getDvor1150aScenarioProtectedFieldChanges(
            state.scenario.definition,
            result.config,
          );
          if (protectedChanges.length > 0) {
            set({ lastCommand: `Apply blocked: ${protectedChanges[0].label} is protected by the scenario.` });
            recordAction({ kind: "configuration", controlId: "config-apply", label: "Configuration Apply", accepted: false, reason: `Protected field: ${protectedChanges[0].label}.`, before });
            return false;
          }
        }
        const automaticTransfer = result.config.simulation.integralMonitorBypass
          ? null
          : applyAutomaticMonitorTransfer(result.config, state.derived.mainTransmitter);
        const nextConfig = automaticTransfer?.config ?? result.config;
        const nextSnapshot = automaticTransfer?.snapshot
          ?? buildDvor1150aSnapshot(result.config, undefined, state.derived.mainTransmitter ?? undefined);
        set({
          config: nextConfig,
          configDraft: cloneDvor1150aConfig(nextConfig),
          configDirty: false,
          // A scenario is session-only and must never create a profile backup.
          needBackup: state.scenario.active ? false : true,
          data: nextSnapshot.data,
          derived: nextSnapshot,
          lastCommand: automaticTransfer?.action === "transfer" && automaticTransfer.target
            ? `Automatic monitor transfer to ${automaticTransfer.target.toUpperCase()}`
            : automaticTransfer?.action === "shutdown"
              ? "Automatic monitor shutdown: both transmitters off"
              : "Configuration Apply",
        });
        const appliedFields = collectChangedConfigFields(
          extractDvor1150aConfig(state.config),
          extractDvor1150aConfig(nextConfig),
        );
        recordAction({
          kind: "configuration",
          controlId: "config-apply",
          label: "Configuration Apply",
          accepted: true,
          before,
          parameterChanges: dvorParameterChanges(state.config, nextConfig, appliedFields, "apply"),
        });
        if (automaticTransfer?.action) {
          recordAction({ actor: "system", kind: "system", controlId: "automatic-monitor-transfer", label: automaticTransfer.action === "transfer" && automaticTransfer.target ? `Automatic monitor transfer to ${automaticTransfer.target.toUpperCase()}` : "Automatic monitor shutdown", accepted: true, reason: "PMDT automatic protection response.", before: vorEvidenceSnapshot(get()) });
        }
        return true;
      },

      discardConfigChanges: () => {
        const state = get();
        set({ configDraft: cloneDvor1150aConfig(state.config), configDirty: false });
      },

      resetConfigDraft: () => {
        const state = get();
        if (state.scenario.active) return get().restoreScenario();
        if (
          state.securityLevel < 3
          || !state.config.simulation.local
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
        if (state.scenario.active) return get().restoreScenario();
        if (
          state.securityLevel < 3
          || !state.config.simulation.local
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
        if (state.securityLevel < 3 || !state.needBackup || state.scenario.active) return false;
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
        // A delayed user-profile hydration must never overwrite a loaded
        // examiner scenario or a student's recovery attempt.
        if (get().scenario.active) return;
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
        const before = vorEvidenceSnapshot(state);
        if (state.securityLevel < 3) {
          recordAction({ kind: "control", controlId: `transmitter-${transmitterId}-${mode}`, label: `TX ${transmitterId.toUpperCase()} ${mode}`, accepted: false, reason: "Security level is insufficient.", before });
          return false;
        }
        if (state.config.station.transmitterConfig === "Single Transmitter" && transmitterId === "tx2") {
          recordAction({ kind: "control", controlId: `transmitter-${transmitterId}-${mode}`, label: `TX ${transmitterId.toUpperCase()} ${mode}`, accepted: false, reason: "TX2 is unavailable in Single Transmitter mode.", before });
          return false;
        }
        if (
          mode !== "main"
          && !state.config.simulation.local
        ) {
          recordAction({ kind: "control", controlId: `transmitter-${transmitterId}-${mode}`, label: `TX ${transmitterId.toUpperCase()} ${mode}`, accepted: false, reason: "Local mode is required for this routing command.", before });
          return false;
        }

        const target = state.config.transmitters[transmitterId];
        if (mode !== "off" && (!target.enabled || target.faults.disabled)) {
          recordAction({ kind: "control", controlId: `transmitter-${transmitterId}-${mode}`, label: `TX ${transmitterId.toUpperCase()} ${mode}`, accepted: false, reason: "Target transmitter is unavailable.", before });
          return false;
        }

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
        if (!result.ok) {
          recordAction({ kind: "control", controlId: `transmitter-${transmitterId}-${mode}`, label: `TX ${transmitterId.toUpperCase()} ${mode}`, accepted: false, reason: "PMDT rejected the routing command.", before });
          return false;
        }
        const draftResult = applyDvorConfigPatches(state.configDraft, patches);
        const mainTransmitter = mode === "main" ? transmitterId : state.derived.mainTransmitter;
        const snapshot = buildDvor1150aSnapshot(result.config, undefined, mainTransmitter ?? undefined);
        set({
          config: result.config,
          configDraft: draftResult.ok ? draftResult.config : cloneDvor1150aConfig(result.config),
          data: snapshot.data,
          derived: snapshot,
        });
        recordAction({ kind: "control", controlId: `transmitter-${transmitterId}-${mode}`, label: `TX ${transmitterId.toUpperCase()} ${mode}`, input: { transmitterId, mode }, accepted: true, before });
        return true;
      },

      selectMainTransmitter: (transmitterId) => get().setTransmitterMode(transmitterId, "main"),

      openScreen: (screenId, menuPath, title) => {
        const viewId = defaultViews[screenId];
        const before = vorEvidenceSnapshot(get());
        set({
          activeScreen: screenId,
          activeView: viewId,
          activeMenuPath: [...menuPath],
          attemptEvents: recordVisit(screenId, viewId, menuPath, title),
        });
        recordAction({ kind: "view", controlId: viewId, menuPath, label: title, accepted: true, before });
      },

      openView: (screenId, viewId, menuPath, title) => {
        const before = vorEvidenceSnapshot(get());
        set({
          activeScreen: screenId,
          activeView: viewId,
          activeMenuPath: [...menuPath],
          attemptEvents: recordVisit(screenId, viewId, menuPath, title),
        });
        recordAction({ kind: "view", controlId: viewId, menuPath, label: title, accepted: true, before });
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
        const before = vorEvidenceSnapshot(state);
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
        recordAction({ kind: "control", controlId: fieldId, menuPath: ["Sidebar", title], label: title, input: { fieldId, value: String(resultValue), status: resultStatus }, accepted: true, before });
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

      restoreScenarioEvidence: (evidence) => {
        const state = get();
        if (!state.scenario.active) return;
        const checkpointSnapshot = evidence.checkpoint
          ? buildDvor1150aSnapshot(evidence.checkpoint.config)
          : null;
        set({
          actionHistory: [...evidence.actionHistory].slice(0, 500),
          evidenceStats: evidence.evidenceStats ?? createScenarioEvidenceStats(evidence.actionHistory),
          attemptEvents: [...evidence.attemptEvents],
          ...(evidence.answer ? { answer: { ...state.answer, ...evidence.answer } } : {}),
          ...(evidence.scenarioHardwareSelection ? { scenarioHardwareSelection: [...evidence.scenarioHardwareSelection] } : {}),
          ...(evidence.scenarioHardwareInspected ? { scenarioHardwareInspected: [...evidence.scenarioHardwareInspected] } : {}),
          ...(evidence.scenarioHardwareReasoning !== undefined ? { scenarioHardwareReasoning: evidence.scenarioHardwareReasoning } : {}),
          ...(evidence.scenarioHardwareDispositionConfirmed !== undefined
            ? { scenarioHardwareDispositionConfirmed: evidence.scenarioHardwareDispositionConfirmed }
            : {}),
          ...(evidence.checkpoint && checkpointSnapshot ? {
            config: structuredClone(evidence.checkpoint.config),
            configDraft: structuredClone(evidence.checkpoint.configDraft),
            configurationBackup: structuredClone(evidence.checkpoint.configurationBackup),
            configDirty: evidence.checkpoint.configDirty,
            needBackup: evidence.checkpoint.needBackup,
            scenarioStage: evidence.checkpoint.scenarioStage,
            diagnosticState: structuredClone(evidence.checkpoint.diagnosticState),
            data: checkpointSnapshot.data,
            derived: checkpointSnapshot,
          } : {}),
        });
      },

      updateAnswer: (changes) =>
        set((state) => ({ answer: { ...state.answer, ...changes } })),

      reset: () => set(initialState()),
    };
  });
}

export const useVorPmdtStore = createVorPmdtStore();
