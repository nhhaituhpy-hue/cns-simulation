import { createDvorSecuritySession, type SecurityField, type SecurityUser } from "@/lib/dvor1150a/security";
import { dvorConfigurationLoadBlock, parseDvorConfigurationFile } from "@/lib/dvor1150a/configuration-file";
import { dvorSidebandAssembly, DVOR_SIDEBAND_TRIM_IDS, type DvorSidebandTrimId } from "@/lib/dvor1150a/sideband";
import { HARDWARE_TRIMS, type HardwareAssembly, type HardwareTrim } from "@/lib/dvor1150a/hardware-calibration";
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
  advanceDvorProtection,
  initialDvorProtectionState,
  type DvorProtectionState,
  buildDvor1150aSnapshot,
  cloneDvor1150aConfig,
  createDefaultDvor1150aConfig,
  DVOR_TRANSMITTER_IDS,
  dvorConfigFieldCatalog,
  getDvorConfigValue,
  type Dvor1150aConfig,
  type Dvor1150aSnapshot,
  type DvorConfigValue,
  projectDvor1150aKeyers,
  type DvorKeyerObservations,
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
  ScenarioEvidenceScope,
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
import { advanceDvorLcuTime, initialDvorLcuState, projectDvorHardware, type DvorLcuState } from "@/lib/dvor1150a/hardware";

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
  lcu: DvorLcuState;
  mode: VorPmdtMode;
  configPanelOpen: boolean;
  scenarioParametersOpen: boolean;
  scenarioAuthoringEnabled: boolean;
  aboutDialogOpen: boolean;
  config: Dvor1150aConfig;
  configDraft: Dvor1150aConfig;
  configurationBackup: Dvor1150aConfig;
  hasConfigurationBackup: boolean;
  configDirty: boolean;
  needBackup: boolean;
  parameterChangeLogs: SimulatorParameterChangeLogEntry[];
  lastCommand: string | null;
  monitorElapsed: number;
  protectionState: DvorProtectionState;
  loginDialogOpen: boolean;
  authenticatedUserId: string | null;
  securityLevel: VorSecurityLevel;
  loginError: string | null;
  loginLockRemaining: number;
  securityRevision: number;
  securityDraftDirty: boolean;
  securityNeedsBackup: boolean;
  securityError: string | null;
  changePasswordDialogOpen: boolean;
  data: VorPmdtData;
  derived: Dvor1150aSnapshot;
  /** Instructor stimulus; never persisted as a station setting/profile. */
  keyerObservations?: DvorKeyerObservations;
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
  turnSidebandTrim: (occurrenceId: string, trim: DvorSidebandTrimId, delta: number) => boolean;
  turnHardwareTrim: (assembly: HardwareAssembly, trim: HardwareTrim, delta: number) => boolean;
  lcuCommand: (command: "local" | "bypass" | "main" | "antenna" | "load" | "off" | "reset" | "silence" | "lamp-test", transmitterId?: DvorTransmitterId) => boolean;
  setLcuVolume: (volume: number) => void;
  setLcuInterlockedOff: (interlocked: boolean) => void;
  initializeSession: (initialization: VorSessionInitialization) => void;
  setMode: (mode: VorPmdtMode) => void;
  setConfigPanelOpen: (open: boolean) => void;
  setScenarioParametersOpen: (open: boolean) => void;
  setScenarioAuthoringEnabled: (enabled: boolean) => void;
  setKeyerObservation: (transmitterId: DvorTransmitterId, observation?: DvorKeyerObservations[DvorTransmitterId]) => boolean;
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
  advanceSecurityTime: (seconds: number) => void;
  noteSecurityActivity: () => void;
  getSecurityRows: () => SecurityUser[];
  stageSecurityField: (index: number, field: SecurityField, value: string | number) => boolean;
  applySecurityUsers: () => boolean;
  setChangePasswordDialogOpen: (open: boolean) => void;
  changeOwnPassword: (current: string, password: string, confirmation: string) => boolean;
  setConfigValue: (fieldId: string, value: DvorConfigValue, mirrorFieldIds?: readonly string[]) => void;
  applyConfigChanges: () => boolean;
  /** Explicit deterministic clock used by the native PMDT ticker and tests. */
  advanceMonitorTime: (seconds: number) => void;
  discardConfigChanges: () => void;
  resetConfigDraft: () => boolean;
  restoreBackupConfig: () => boolean;
  restoreDefaultConfig: () => boolean;
  backupConfig: () => boolean;
  loadConfigurationFile: (text: string) => boolean;
  replaceConfig: (
    config: Dvor1150aConfig,
    backupConfig?: Dvor1150aConfig,
    parameterChangeLogs?: readonly SimulatorParameterChangeLogEntry[],
  ) => void;
  setTransmitterMode: (transmitterId: DvorTransmitterId, mode: DvorTransmitterMode, preserveMainSelection?: boolean) => boolean;
  transferTransmitter: () => boolean;
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
      scenarioId?: string;
      scenarioRunId?: string;
      scenarioStartedAt?: string | null;
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
    hasConfigurationBackup: false,
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
    monitorElapsed: 0,
    protectionState: initialDvorProtectionState(),
    lcu: initialDvorLcuState(),
    loginDialogOpen: true,
    authenticatedUserId: null,
    securityLevel: 0,
    loginError: null,
    loginLockRemaining: 0,
    securityRevision: 0,
    securityDraftDirty: false,
    securityNeedsBackup: false,
    securityError: null,
    changePasswordDialogOpen: false,
    data: derived.data,
    derived,
    keyerObservations: undefined,
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
  const security = createDvorSecuritySession();

  return create<VorPmdtStore>()((setState, get) => {
    // Decorate only digital keyer results on every native snapshot update.
    // RF measurements, monitor protection and its clock remain untouched.
    const set = (update: Partial<VorPmdtStore> | ((state: VorPmdtStore) => Partial<VorPmdtStore>)) => {
      setState(state => {
        const next = typeof update === "function" ? update(state) : update;
        const merged = { ...state, ...next };
        const relayRoutes = { ...merged.lcu.relayRoutes };
        for (const id of DVOR_TRANSMITTER_IDS) {
          if (merged.config.transmitters[id].onAir) {
            relayRoutes[id] = "antenna";
            relayRoutes[id === "tx1" ? "tx2" : "tx1"] = "load";
          } else if (merged.config.transmitters[id].load) relayRoutes[id] = "load";
        }
        const projection = projectDvorHardware(merged);
        const alarms = projection.alarms;
        const alarmElapsed = Object.fromEntries(Object.entries(merged.lcu.alarmElapsed).filter(([key]) => projection.detectors.some(detector => detector.key === key)));
        const silencedAlarms = merged.lcu.silencedAlarms.filter(alarm => alarms.includes(alarm));
        if (DVOR_TRANSMITTER_IDS.some(id => relayRoutes[id] !== merged.lcu.relayRoutes[id]) || silencedAlarms.length !== merged.lcu.silencedAlarms.length || Object.keys(alarmElapsed).length !== Object.keys(merged.lcu.alarmElapsed).length) {
          next.lcu = { ...merged.lcu, relayRoutes, silencedAlarms, alarmElapsed };
        }
        if (!next.derived && !("keyerObservations" in next)) return next;
        const derived = next.derived ?? state.derived;
        const observations = "keyerObservations" in next ? next.keyerObservations : state.keyerObservations;
        const antennaSelect: 1 | 2 = relayRoutes.tx1 === "antenna" ? 1 : relayRoutes.tx2 === "antenna" ? 2 : derived.data.rmsMonitorTransmitterStatus.antennaSelect;
        const data = derived.data.rmsMonitorTransmitterStatus.antennaSelect === antennaSelect ? derived.data
          : { ...derived.data, rmsMonitorTransmitterStatus: { ...derived.data.rmsMonitorTransmitterStatus, antennaSelect } };
        return { ...next, ...(next.derived ? { data } : {}), derived: { ...derived, data, keyers: projectDvor1150aKeyers(
          next.config ?? state.config, derived.mainTransmitter, observations,
        ) } };
      });
    };
    // Only lifecycle entrypoints mint proof scope, never a generic setState payload.
    let nativeEvidenceScope: ScenarioEvidenceScope | undefined;
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
        ...(nativeEvidenceScope ? { scope: { ...nativeEvidenceScope } } : {}),
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
      nativeEvidenceScope = { moduleId: "dvor-1150a", scenarioId: definition.id, runId: defaultId(), startedAt: startedAt ?? now().toISOString() };
      set({
        config,
        configDraft: cloneDvor1150aConfig(config),
        configurationBackup: cloneDvor1150aConfig(config),
        hasConfigurationBackup: false,
        configDirty: false,
        needBackup: false,
        monitorElapsed: 0,
        protectionState: initialDvorProtectionState(),
        keyerObservations: undefined,
        actionHistory: [],
        attemptEvents: [],
        evidenceStats: createScenarioEvidenceStats(),
        data: derived.data,
        derived,
        scenario: {
          active: true,
          definition: structuredClone(definition),
          scenarioId: nativeEvidenceScope.scenarioId,
          runId: nativeEvidenceScope.runId,
          startedAt: nativeEvidenceScope.startedAt,
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

      turnSidebandTrim: (occurrenceId, trim, delta) => {
        const state = get();
        const before = vorEvidenceSnapshot(state);
        const assembly = dvorSidebandAssembly(occurrenceId);
        const fieldId = assembly ? `sidebandTrims.${assembly.id}.${trim}` : "sideband-trim";
        const reject = (reason: string) => {
          set({ lastCommand: `Sideband trim rejected: ${reason}` });
          recordAction({ kind: "configuration", controlId: fieldId, label: "Physical sideband trim", accepted: false, reason, before });
          return false;
        };
        if (!assembly || !DVOR_SIDEBAND_TRIM_IDS.includes(trim) || !Number.isFinite(delta)) return reject("Invalid assembly, trim or angle.");
        if (assembly.tx === "tx2" && state.config.station.transmitterConfig === "Single Transmitter") return reject("TX2 is not installed.");
        if (state.scenario.active && !isDvor1150aScenarioStudentEditable(state.scenario.definition, fieldId)) return reject("Protected scenario field.");
        const limit = trim === "R3" || trim === "R6" ? 1800 : 180;
        const angle = Number(getDvorConfigValue(state.config, fieldId));
        const value = Math.max(-limit, Math.min(limit, angle + delta));
        if (value === angle) return reject("Trim limit or unchanged angle.");
        const patch = [{ fieldId, value }];
        const result = applyDvorConfigPatches(state.config, patch);
        const draft = applyDvorConfigPatches(state.configDraft, patch);
        if (!result.ok || !draft.ok) return reject("Invalid calibration configuration.");
        const snapshot = buildDvor1150aSnapshot(result.config, undefined, state.derived.mainTransmitter ?? undefined);
        const logs = createParameterChangeLogEntries({ changedFields: [fieldId], timeTag: state.data.timestamp,
          userName: state.authenticatedUserId || state.studentName || "LOCAL", actionLabel: "Physical sideband trim", idPrefix: generateId() });
        set({ config: result.config, configDraft: draft.config, derived: snapshot, data: snapshot.data,
          needBackup: !state.scenario.active, lastCommand: "Physical sideband trim",
          parameterChangeLogs: prependParameterChangeLogEntries(state.parameterChangeLogs, logs) });
        recordAction({ kind: "configuration", controlId: fieldId, label: "Physical sideband trim", accepted: true, before,
          input: { occurrenceId, trim, delta }, parameterChanges: dvorParameterChanges(state.config, result.config, [fieldId], "apply") });
        return true;
      },

      turnHardwareTrim: (assembly, trim, delta) => {
        const state = get();
        const before = vorEvidenceSnapshot(state);
        const fieldId = `hardwareCalibration.${assembly}.${trim}`;
        const reject = (reason: string) => {
          set({ lastCommand: `Hardware trim rejected: ${reason}` });
          recordAction({ kind: "configuration", controlId: fieldId, label: "Physical detector trim", accepted: false, reason, before });
          return false;
        };
        if (!Object.hasOwn(HARDWARE_TRIMS, assembly) || !(HARDWARE_TRIMS[assembly] as readonly string[]).includes(trim) || !Number.isFinite(delta)) return reject("Invalid assembly, trim or angle.");
        if (assembly === "bcps2" && state.config.station.transmitterConfig === "Single Transmitter") return reject("BCPS2 is not installed.");
        if (!state.config.simulation.local || !state.config.simulation.integralMonitorBypass) return reject("Local and Monitor Bypass are required for calibration.");
        if (state.scenario.active && !isDvor1150aScenarioStudentEditable(state.scenario.definition, fieldId)) return reject("Protected scenario field.");
        const angle = Number(getDvorConfigValue(state.config, fieldId));
        const value = Math.max(-180, Math.min(180, angle + delta));
        if (value === angle) return reject("Trim limit or unchanged angle.");
        const patch = [{ fieldId, value }];
        const result = applyDvorConfigPatches(state.config, patch);
        const draft = applyDvorConfigPatches(state.configDraft, patch);
        if (!result.ok || !draft.ok) return reject("Invalid calibration configuration.");
        const snapshot = buildDvor1150aSnapshot(result.config, undefined, state.derived.mainTransmitter ?? undefined);
        const logs = createParameterChangeLogEntries({ changedFields: [fieldId], timeTag: state.data.timestamp,
          userName: state.authenticatedUserId || state.studentName || "LOCAL", actionLabel: "Physical detector trim", idPrefix: generateId() });
        set({ config: result.config, configDraft: draft.config, derived: snapshot, data: snapshot.data,
          needBackup: !state.scenario.active, lastCommand: "Physical detector trim",
          parameterChangeLogs: prependParameterChangeLogEntries(state.parameterChangeLogs, logs) });
        recordAction({ kind: "configuration", controlId: fieldId, label: "Physical detector trim", accepted: true, before,
          input: { assembly, trim, delta }, parameterChanges: dvorParameterChanges(state.config, result.config, [fieldId], "apply") });
        return true;
      },

      setLcuVolume: (volume) => {
        if (Number.isFinite(volume)) set({ lcu: { ...get().lcu, volume: Math.min(100, Math.max(0, volume)) } });
      },

      setLcuInterlockedOff: (interlocked) => {
        if (typeof interlocked !== "boolean") return;
        const state = get();
        const config = cloneDvor1150aConfig(state.config);
        if (interlocked) for (const id of DVOR_TRANSMITTER_IDS) {
          config.transmitters[id].onAir = false;
          config.transmitters[id].load = false;
        }
        const snapshot = buildDvor1150aSnapshot(config, undefined, state.derived.mainTransmitter ?? undefined);
        const draft = cloneDvor1150aConfig(state.configDraft);
        if (interlocked) for (const id of DVOR_TRANSMITTER_IDS) {
          draft.transmitters[id].onAir = false;
          draft.transmitters[id].load = false;
        }
        set({ lcu: { ...state.lcu, interlockedOff: interlocked, ...(interlocked ? { initializing: false } : {}) }, config, configDraft: draft, derived: snapshot, data: snapshot.data,
          ...(interlocked ? { protectionState: { ...initialDvorProtectionState(), phase: "lockout", remaining: 0 }, monitorElapsed: 0 } : {}) });
      },

      lcuCommand: (command, transmitterId) => {
        const state = get();
        const before = vorEvidenceSnapshot(state);
        const finish = (accepted: boolean, reason?: string) => {
          recordAction({ kind: "control", controlId: `lcu-${command}${transmitterId ? `-${transmitterId}` : ""}`,
            label: `LCU ${command}${transmitterId ? ` ${transmitterId}` : ""}`, accepted, reason, before });
          return accepted;
        };
        if (!projectDvorHardware(state).lcuPower) return finish(false, "LCU power is unavailable.");
        if (state.lcu.interlockedOff && ["main", "antenna", "load", "reset"].includes(command)) return finish(false, "Remote interlock is active.");
        if (["main", "antenna", "load"].includes(command) && state.protectionState.phase !== "monitoring" && state.protectionState.remaining > 0) return finish(false, "RF is inhibited by protection delay.");
        if (command === "lamp-test" || command === "silence") {
          set({ lcu: { ...state.lcu, ...(command === "lamp-test" ? { lampTest: !state.lcu.lampTest }
            : { silencedAlarms: projectDvorHardware(state).alarms }) } });
          return finish(true);
        }
        if (!["local", "reset"].includes(command) && !state.config.simulation.local) return finish(false, "Local control is required.");
        const config = cloneDvor1150aConfig(state.config);
        let main = state.derived.mainTransmitter;
        if (command === "local") {
          config.simulation.local = !config.simulation.local;
          if (!config.simulation.local) config.simulation.integralMonitorBypass = false;
        } else if (command === "bypass") {
          config.simulation.integralMonitorBypass = !config.simulation.integralMonitorBypass;
        } else if (command === "reset") {
          security.restore();
          config.simulation.local = false;
          config.simulation.integralMonitorBypass = false;
          for (const id of DVOR_TRANSMITTER_IDS) {
            config.transmitters[id].onAir = false;
            config.transmitters[id].load = false;
          }
        } else {
          if (!transmitterId || (transmitterId === "tx2" && config.station.transmitterConfig === "Single Transmitter")) return finish(false, "Transmitter is not installed.");
          const target = config.transmitters[transmitterId];
          if (command !== "off" && (!target.enabled || target.faults.disabled)) return finish(false, "Transmitter is unavailable.");
          if (command === "main" || command === "antenna") {
            const previous = transmitterId === "tx1" ? "tx2" : "tx1";
            config.transmitters[previous].onAir = false;
            config.transmitters[previous].load = config.station.standbyMode === "Hot Standby"
              && config.transmitters[previous].enabled && !config.transmitters[previous].faults.disabled;
            target.onAir = true;
            target.load = false;
            if (command === "main") main = transmitterId;
          } else {
            target.onAir = false;
            target.load = command === "load";
          }
        }
        const draft = command === "reset" ? cloneDvor1150aConfig(config) : cloneDvor1150aConfig(state.configDraft);
        draft.simulation.local = config.simulation.local;
        draft.simulation.integralMonitorBypass = config.simulation.integralMonitorBypass;
        for (const id of DVOR_TRANSMITTER_IDS) {
          draft.transmitters[id].onAir = config.transmitters[id].onAir;
          draft.transmitters[id].load = config.transmitters[id].load;
        }
        const snapshot = buildDvor1150aSnapshot(config, undefined, main ?? undefined);
        set({ config, configDraft: draft, derived: snapshot, data: snapshot.data, monitorElapsed: 0,
          lastCommand: `LCU ${command}`,
          ...(["main", "antenna", "load", "off"].includes(command) ? { protectionState: command === "off" && state.protectionState.phase !== "monitoring"
            ? { ...state.protectionState, phase: "lockout", remaining: Math.min(20, state.protectionState.remaining), target: null } : initialDvorProtectionState() } : {}),
          ...(command === "reset" ? { lcu: { ...state.lcu, lampTest: false, silencedAlarms: [], alarmElapsed: {}, initializing: true }, configDirty: false,
            securityDraftDirty: false, securityNeedsBackup: false, securityError: null, changePasswordDialogOpen: false, securityRevision: state.securityRevision + 1,
            protectionState: { ...initialDvorProtectionState(), phase: "cold-transfer", remaining: 20, target: main },
            loginDialogOpen: true, securityLevel: 0, authenticatedUserId: null } : {}),
        });
        return finish(true);
      },

      initializeSession: (initialization) => {
        nativeEvidenceScope = undefined;
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

      setKeyerObservation: (transmitterId, observation) => {
        const state = get();
        if (!state.scenarioAuthoringEnabled || state.mode === "student"
          || !["tx1", "tx2"].includes(transmitterId)) return false;
        if (observation !== undefined) {
          if (!observation || typeof observation !== "object" || Array.isArray(observation)
            || Object.keys(observation).some(key => !["externalSignal", "shutdownCause"].includes(key))) return false;
          const { externalSignal: signal, shutdownCause } = observation;
          if (shutdownCause !== undefined && shutdownCause !== "keying-loss" && shutdownCause !== "other") return false;
          if (signal !== undefined && (!signal || typeof signal !== "object" || Array.isArray(signal)
            || (signal.state === "lost" ? Object.keys(signal).some(key => key !== "state")
              : !["present", "resumed"].includes(signal.state)
                || !["high/open", "low/closed"].includes(signal.level)
                || Object.keys(signal).some(key => !["state", "level", "decodedIdentCode"].includes(key))
                || (signal.decodedIdentCode !== undefined && (typeof signal.decodedIdentCode !== "string" || !/^[A-Za-z0-9]{2,4}$/.test(signal.decodedIdentCode)))))) return false;
        }
        const keyerObservations = { ...state.keyerObservations };
        if (observation === undefined) delete keyerObservations[transmitterId];
        else keyerObservations[transmitterId] = structuredClone(observation);
        set({ keyerObservations });
        return true;
      },

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
          null,
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
          hasConfigurationBackup: false,
          configDirty: false,
          needBackup: false,
          data: derived.data,
          derived,
          scenario: { active: false, definition: null, startedAt: null },
          protectionState: initialDvorProtectionState(),
          monitorElapsed: 0,
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

      openLogin: () => { security.discard(); set({
        loginDialogOpen: true,
        authenticatedUserId: null,
        securityLevel: 0,
        loginError: null,
        securityDraftDirty: false, securityError: null, changePasswordDialogOpen: false, securityRevision: get().securityRevision + 1,
        ...(get().activeView === "rms-config-security" ? { activeView: "rms-config-general" as const } : {}),
      }); },

      login: (userId, password) => {
        const before = vorEvidenceSnapshot(get());
        security.discard();
        const identity = security.login(userId.trim(), password);
        if (!identity) {
          get().logout();
          const remaining = security.remaining();
          set({ loginLockRemaining: remaining, loginError: remaining > 0 ? "Logon blocked for 5 minutes after 3 failed attempts." : "Invalid User ID or Password." });
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
          loginLockRemaining: 0,
          securityDraftDirty: false, securityError: null, changePasswordDialogOpen: false, securityRevision: get().securityRevision + 1,
          ...(identity.securityLevel !== 4 && get().activeView === "rms-config-security" ? { activeView: "rms-config-general" as const } : {}),
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

      logout: () => { security.discard(); set({
        loginDialogOpen: true,
        authenticatedUserId: null,
        securityLevel: 0,
        loginError: null,
        configPanelOpen: false,
        aboutDialogOpen: false,
        securityDraftDirty: false, securityError: null, changePasswordDialogOpen: false, securityRevision: get().securityRevision + 1,
        ...(get().activeView === "rms-config-security" ? { activeView: "rms-config-general" as const } : {}),
      }); },

      noteSecurityActivity: () => security.activity(),
      advanceSecurityTime: (seconds) => {
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        const state = get();
        if (security.advance(seconds, state.securityLevel > 0, state.config.simulation.local)) {
          const before = vorEvidenceSnapshot(state);
          get().logout();
          set({ loginError: "Logged off after 15 minutes of inactivity." });
          recordAction({ kind: "authentication", controlId: "pmdt-idle-logoff", label: "PMDT inactivity logoff", accepted: true, before });
        }
        const remaining = security.remaining();
        if (remaining !== get().loginLockRemaining) set({ loginLockRemaining: remaining,
          ...(remaining === 0 && state.loginLockRemaining > 0 ? { loginError: null } : {}) });
      },
      getSecurityRows: () => get().securityLevel === 4 ? security.rows() : [],
      stageSecurityField: (index, field, value) => {
        const state = get();
        if (state.securityLevel !== 4 || !state.config.simulation.local || !state.config.simulation.connected || state.scenario.active) return false;
        if (!security.edit(index, field, value)) return false;
        set({ securityDraftDirty: true, securityError: null });
        return true;
      },
      applySecurityUsers: () => {
        const state = get(), before = vorEvidenceSnapshot(state);
        let error: string | undefined;
        if (state.securityLevel !== 4 || !state.config.simulation.local || !state.config.simulation.connected || state.scenario.active) error = "Requires Level 4, Local and a direct maintenance connection, outside scenarios.";
        if (!state.securityDraftDirty && !error) return false;
        const result = error ? { error, identity: null } : security.apply(state.authenticatedUserId);
        if (result.error) set({ securityError: result.error });
        else {
          if (!result.identity) get().logout();
          set({ ...(result.identity ? { authenticatedUserId: result.identity.userId, securityLevel: result.identity.securityLevel } : {}),
            securityRevision: state.securityRevision + 1, securityDraftDirty: false, securityNeedsBackup: true, securityError: null,
            ...(result.identity?.securityLevel !== 4 && state.activeView === "rms-config-security" ? { activeView: "rms-config-general" as const } : {}),
            lastCommand: "Security Codes Apply" });
        }
        recordAction({ kind: "authentication", controlId: "security-codes-apply", label: "Security Codes Apply", accepted: !result.error, reason: result.error, before });
        return !result.error;
      },
      setChangePasswordDialogOpen: (open) => {
        const state = get();
        if (open && (state.securityLevel < 1 || state.authenticatedUserId === "GUEST" || !state.config.simulation.local || !state.config.simulation.connected || state.scenario.active)) return;
        set({ changePasswordDialogOpen: open, securityError: null });
      },
      changeOwnPassword: (current, password, confirmation) => {
        const state = get(), before = vorEvidenceSnapshot(state);
        const error = state.securityLevel < 1 || !state.authenticatedUserId || !state.config.simulation.local || !state.config.simulation.connected || state.scenario.active
          ? "Requires an authenticated user and a direct Local maintenance connection, outside scenarios."
          : security.changePassword(state.authenticatedUserId, current, password, confirmation);
        set({ securityError: error, ...(!error ? { securityNeedsBackup: true, changePasswordDialogOpen: false, lastCommand: "Password changed" } : {}) });
        recordAction({ kind: "authentication", controlId: "change-own-password", label: "Change own password", accepted: !error, reason: error ?? undefined, before });
        return !error;
      },

      setConfigValue: (fieldId, value, mirrorFieldIds = []) => {
        const state = get();
        const isLocalModeField = fieldId === "simulation.local";
        const isBypassField = fieldId === "simulation.integralMonitorBypass";
        const before = vorEvidenceSnapshot(state);

        if (state.securityLevel < (isLocalModeField ? 2 : 3)) {
          recordAction({ kind: "configuration", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: false, reason: "Security level is insufficient.", before });
          return;
        }

        if (isLocalModeField || isBypassField) {
          if (isBypassField && value === true && !state.config.simulation.local) {
            recordAction({ kind: "control", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: false, reason: "Local mode is required before enabling Monitor Bypass.", before });
            return;
          }
          const patches = [{ fieldId, value }];
          if (isLocalModeField && value === false) {
            patches.push({ fieldId: "simulation.integralMonitorBypass", value: false });
          }
          const result = applyDvorConfigPatches(state.config, patches);
          if (!result.ok) {
            recordAction({ kind: "configuration", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: false, reason: "PMDT rejected the configuration value.", before });
            return;
          }
          const nextConfig = result.config;
          const nextSnapshot = buildDvor1150aSnapshot(nextConfig, undefined, state.derived.mainTransmitter ?? undefined);
          const draftResult = applyDvorConfigPatches(state.configDraft, patches);
          const nextDraft = draftResult.ok ? draftResult.config : cloneDvor1150aConfig(nextConfig);
          set({
            config: nextConfig,
            configDraft: nextDraft,
            configDirty: state.configDirty,
            monitorElapsed: 0,
            data: nextSnapshot.data,
            derived: nextSnapshot,
          });
          recordAction({ kind: "control", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: true, before });
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
        if (get().activeView === "rms-config-security") return get().applySecurityUsers();
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
        if (state.protectionState.phase !== "monitoring" && state.protectionState.remaining > 0
          && DVOR_TRANSMITTER_IDS.some(id => result.config.transmitters[id].onAir !== state.config.transmitters[id].onAir
            || result.config.transmitters[id].load !== state.config.transmitters[id].load)) {
          set({ lastCommand: "Apply blocked: RF inhibited by protection delay." });
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
        const nextConfig = result.config;
        const nextSnapshot = buildDvor1150aSnapshot(nextConfig, undefined, state.derived.mainTransmitter ?? undefined);
        set({
          config: nextConfig,
          configDraft: cloneDvor1150aConfig(nextConfig),
          configDirty: false,
          monitorElapsed: 0,
          // A scenario is session-only and must never create a profile backup.
          needBackup: state.scenario.active ? false : true,
          data: nextSnapshot.data,
          derived: nextSnapshot,
          lastCommand: "Configuration Apply",
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
        return true;
      },

      advanceMonitorTime: (seconds) => {
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        const state = get();
        const initializing = state.lcu.initializing && state.protectionState.phase === "cold-transfer";
        const bootSeconds = initializing ? Math.min(seconds, state.protectionState.remaining) : seconds;
        let next = advanceDvorProtection(state.config, { ...state.protectionState, alarmElapsed: state.monitorElapsed },
          bootSeconds, state.derived.mainTransmitter);
        let lcu = initializing ? { ...state.lcu, alarmElapsed: {} } : advanceDvorLcuTime(state, seconds);
        if (initializing && next.events.length) {
          const config = cloneDvor1150aConfig(next.config);
          if (next.state.phase === "monitoring") for (const id of DVOR_TRANSMITTER_IDS) {
            if (id !== next.snapshot.voting.activeTransmitter) config.transmitters[id].load = config.station.standbyMode === "Hot Standby"
              && config.transmitters[id].enabled && !config.transmitters[id].faults.disabled
              && !(id === "tx2" && config.station.transmitterConfig === "Single Transmitter");
          }
          const snapshot = buildDvor1150aSnapshot(config, undefined, state.derived.mainTransmitter ?? undefined);
          lcu = { ...lcu, initializing: false };
          const remaining = seconds - bootSeconds;
          if (remaining > 0) {
            lcu = advanceDvorLcuTime({ ...state, config, derived: snapshot, data: snapshot.data, lcu }, remaining);
            const continued = advanceDvorProtection(config, next.state, remaining, state.derived.mainTransmitter);
            next = { ...continued, events: [...next.events, ...continued.events] };
          } else next = { ...next, config, snapshot };
        }
        const events = next.events.map((label, index) => initializing && index === 0
          ? label.startsWith("Automatic monitor transfer") ? "LCU/RMS/MON initialization complete" : "LCU initialization: transmitter unavailable"
          : label);
        if (lcu.initializing && next.state.phase !== "cold-transfer") lcu = { ...lcu, initializing: false };
        const before = vorEvidenceSnapshot(state);
        const draft = next.config === state.config ? state.configDraft : cloneDvor1150aConfig(state.configDraft);
        if (next.config !== state.config) for (const id of DVOR_TRANSMITTER_IDS) {
          draft.transmitters[id].onAir = next.config.transmitters[id].onAir;
          draft.transmitters[id].load = next.config.transmitters[id].load;
        }
        set({
          lcu,
          ...(next.config !== state.config ? {
            config: next.config, configDraft: draft,
            derived: next.snapshot, data: next.snapshot.data,
          } : {}),
          protectionState: next.state,
          monitorElapsed: next.state.alarmElapsed,
          ...(events.length ? { lastCommand: events[events.length - 1] } : {}),
        });
        for (const [index, label] of events.entries()) recordAction({
          actor: "system", kind: "system", controlId: initializing && index === 0 ? "lcu-initialization" : "automatic-monitor-transfer",
          label, accepted: true, before,
        });
      },

      discardConfigChanges: () => {
        if (get().activeView === "rms-config-security") {
          security.discard();
          set({ securityDraftDirty: false, securityError: null, securityRevision: get().securityRevision + 1 });
          return;
        }
        const state = get();
        set({ configDraft: cloneDvor1150aConfig(state.config), configDirty: false });
      },

      resetConfigDraft: () => {
        const state = get();
        if (state.scenario.active) return false;
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

      restoreDefaultConfig: () => get().restoreBackupConfig(),

      restoreBackupConfig: () => {
        const state = get();
        if (state.scenario.active) return false;
        if (
          state.securityLevel < 3
          || !state.config.simulation.local
        ) {
          return false;
        }

        if (!state.hasConfigurationBackup) {
          set({ lastCommand: "RMS Config Restore unavailable: no backup. Use Config Backup first." });
          return false;
        }
        const backup = cloneDvor1150aConfig(state.configurationBackup);
        if (state.protectionState.phase !== "monitoring" && state.protectionState.remaining > 0) {
          set({ lastCommand: "Restore blocked: RF inhibited by protection delay." });
          return false;
        }
        backup.simulation = { ...state.config.simulation };
        const result = applyDvorConfigPatches(backup);
        if (!result.ok) return false;
        set({
          config: result.config,
          configDraft: cloneDvor1150aConfig(result.config),
          configDirty: false,
          needBackup: false,
          data: result.snapshot.data,
          derived: result.snapshot,
          lastCommand: "RMS Config Restore",
          protectionState: initialDvorProtectionState(),
          monitorElapsed: 0,
        });
        return true;
      },

      loadConfigurationFile: (text) => {
        const state = get();
        const before = vorEvidenceSnapshot(state);
        let reason = dvorConfigurationLoadBlock(state);
        let config: Dvor1150aConfig | undefined;
        if (!reason) {
          try { config = parseDvorConfigurationFile(text); }
          catch (error) { reason = error instanceof Error ? error.message : "Invalid configuration file."; }
        }
        if (reason || !config) {
          set({ lastCommand: reason ?? "Invalid configuration file." });
          recordAction({ kind: "configuration", controlId: "configuration-file-load", label: "Configuration Load", accepted: false, reason, before });
          return false;
        }
        config.simulation = { ...state.config.simulation };
        for (const id of DVOR_TRANSMITTER_IDS) {
          config.transmitters[id].onAir = false;
          config.transmitters[id].load = false;
        }
        const result = applyDvorConfigPatches(config);
        if (!result.ok) { set({ lastCommand: "Configuration Load: validation failed." }); return false; }
        const changedFields = collectChangedConfigFields(extractDvor1150aConfig(state.config), extractDvor1150aConfig(config));
        const logs = createParameterChangeLogEntries({ changedFields, timeTag: state.data.timestamp,
          userName: state.authenticatedUserId, file: "RMS", actionLabel: "Configuration Load" });
        set({ config: result.config, configDraft: cloneDvor1150aConfig(result.config), configDirty: false,
          data: result.snapshot.data, derived: result.snapshot, needBackup: true, monitorElapsed: 0,
          lastCommand: "Configuration Load",
          parameterChangeLogs: prependParameterChangeLogEntries(logs, state.parameterChangeLogs) });
        recordAction({ kind: "configuration", controlId: "configuration-file-load", label: "Configuration Load", accepted: true,
          before, parameterChanges: dvorParameterChanges(state.config, result.config, changedFields, "apply") });
        return true;
      },

      backupConfig: () => {
        const state = get();
        if (state.securityLevel < 3 || (state.hasConfigurationBackup && !state.needBackup && !state.securityNeedsBackup) || state.scenario.active) return false;
        security.backup();
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
          hasConfigurationBackup: true,
          parameterChangeLogs: prependParameterChangeLogEntries(state.parameterChangeLogs, nextLogs),
          needBackup: false,
          lastCommand: "RMS Config Backup",
          securityNeedsBackup: false,
        });
        return true;
      },

      replaceConfig: (config, backupConfig, parameterChangeLogs) => {
        // A delayed user-profile hydration must never overwrite a loaded
        // examiner scenario or a student's recovery attempt.
        if (get().scenario.active) return;
        const nextConfig = cloneDvor1150aConfig(config);
        const nextBackupConfig = cloneDvor1150aConfig(backupConfig ?? config);
        const derived = buildDvor1150aSnapshot(nextConfig);
        set({
          config: nextConfig,
          configDraft: cloneDvor1150aConfig(nextConfig),
          configurationBackup: nextBackupConfig,
          hasConfigurationBackup: backupConfig !== undefined,
          configDirty: false,
          monitorElapsed: 0,
          needBackup: JSON.stringify(extractDvor1150aConfig(nextConfig)) !== JSON.stringify(extractDvor1150aConfig(nextBackupConfig)),
          parameterChangeLogs: parameterChangeLogs ? [...parameterChangeLogs] : get().parameterChangeLogs,
          data: derived.data,
          derived,
          lastCommand: "User configuration loaded",
          protectionState: initialDvorProtectionState(),
        });
      },

      setTransmitterMode: (transmitterId, mode, preserveMainSelection = false) => {
        const state = get();
        const before = vorEvidenceSnapshot(state);
        if (mode !== "off" && state.protectionState.phase !== "monitoring" && state.protectionState.remaining > 0) {
          recordAction({ kind: "control", controlId: `transmitter-${transmitterId}-${mode}`, label: "RF inhibited by protection delay", accepted: false, before });
          return false;
        }
        if (state.lcu.interlockedOff && mode !== "off") {
          recordAction({ kind: "control", controlId: `transmitter-${transmitterId}-${mode}`, label: "Remote interlock is active", accepted: false, before });
          return false;
        }
        if (state.securityLevel < 2) {
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
          ? DVOR_TRANSMITTER_IDS.flatMap(id => [
              { fieldId: `transmitters.${id}.onAir`, value: id === transmitterId },
              { fieldId: `transmitters.${id}.load`, value: id !== transmitterId
                && state.config.station.standbyMode === "Hot Standby"
                && state.config.station.transmitterConfig === "Dual Transmitters"
                && state.config.transmitters[id].enabled && !state.config.transmitters[id].faults.disabled },
            ])
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
        const mainTransmitter = mode === "main" && !preserveMainSelection ? transmitterId : state.derived.mainTransmitter;
        const protectionState = mode === "off" && state.protectionState.phase !== "monitoring"
          ? { ...state.protectionState, phase: "lockout" as const, remaining: Math.min(20, state.protectionState.remaining), target: null }
          : initialDvorProtectionState();
        set({ protectionState, monitorElapsed: 0 });
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
      transferTransmitter: () => {
        const active = get().derived.voting.activeTransmitter;
        return active ? get().setTransmitterMode(active === "tx1" ? "tx2" : "tx1", "main", true) : false;
      },

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
        if (viewId === "rms-config-security" && get().securityLevel !== 4) return;
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
        const checkpoint = evidence.checkpoint;
        const savedScope = checkpoint && typeof checkpoint.scenarioId === "string" && checkpoint.scenarioId === state.scenario.scenarioId
          && typeof checkpoint.scenarioRunId === "string" && !!checkpoint.scenarioRunId.trim()
          && typeof checkpoint.scenarioStartedAt === "string" && Number.isFinite(Date.parse(checkpoint.scenarioStartedAt))
          ? { moduleId: "dvor-1150a", scenarioId: checkpoint.scenarioId, runId: checkpoint.scenarioRunId, startedAt: checkpoint.scenarioStartedAt } : undefined;
        if (checkpoint?.scenarioId !== undefined && checkpoint.scenarioId !== state.scenario.scenarioId) return;
        nativeEvidenceScope = savedScope;
        const checkpointSnapshot = evidence.checkpoint
          ? buildDvor1150aSnapshot(evidence.checkpoint.config)
          : null;
        set({
          scenario: { ...state.scenario, scenarioId: state.scenario.scenarioId, runId: savedScope?.runId, startedAt: savedScope?.startedAt ?? null },
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

      reset: () => { nativeEvidenceScope = undefined; security.reset(); set(initialState()); },
    };
  });
}

export const useVorPmdtStore = createVorPmdtStore();
