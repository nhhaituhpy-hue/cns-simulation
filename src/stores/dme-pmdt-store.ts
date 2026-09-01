import { cloneDefaultDmePmdtData } from "@/lib/dme-pmdt-defaults";
import {
  hydrateDme1119aData,
  extractDme1119aConfig,
  type Dme1119aPersistedConfig,
} from "@/lib/simulator-config/dme-1119a";
import {
  collectChangedConfigFields,
  createParameterChangeLogEntries,
  prependParameterChangeLogEntries,
  type SimulatorParameterChangeLogEntry,
} from "@/lib/simulator-config/parameter-change";
import {
  dmeParameterFieldCatalog,
  dmeTransferRequested,
  applyDme1119aScenarioFaults,
  cloneDme1119aScenarioDefinition,
  configurationForDme1119aScenario,
  createDefaultDme1119aScenarioDefinition,
  evaluateDme1119aScenario,
  getDme1119aScenarioProtectedFieldChanges,
  previewDme1119aScenario,
  validateDme1119aScenarioDefinition,
  getDmeParameterValue,
  recomputeDmeDerivedData,
  setDmeParameterValue,
  validateDmeParameterField,
  type DmeParameterValue,
  type Dme1119aScenarioDefinition,
  type Dme1119aScenarioRuntime,
} from "@/lib/dme1119a";
import type {
  DmeAttemptEvent,
  DmeEditableValue,
  DmeExpectedCheckpoint,
  DmeFanControlMode,
  DmeFieldOverride,
  DmeIndicatorColor,
  DmeMonitorTriggerSource,
  DmeParameterStatus,
  DmePmdtData,
  DmePmdtMode,
  DmeSecurityAccount,
  DmeSecurityLevel,
  DmeScreenId,
  DmeStudentAnswer,
  DmeTransmitterId,
  DmeTransmitterMode,
  DmeViewId,
} from "@/lib/dme-types";
import type {
  ScenarioActionEvent,
  ScenarioEvidenceSnapshot,
  ScenarioEvidenceValue,
} from "@/lib/scenario-evidence";
import { create, type StoreApi, type UseBoundStore } from "zustand";

const emptyAnswer: DmeStudentAnswer = {
  suspectedFault: "",
  reasoning: "",
  remediation: "",
};

const defaultViews: Record<DmeScreenId, DmeViewId> = {
  home: "home",
  "rms-status": "rms-status-main",
  "rms-data": "rms-maintenance-alerts",
  "rms-logs": "rms-logs-operational-summary",
  "rms-config": "rms-config-general",
  "monitor-data": "monitor-integral",
  "monitor-config": "monitor-config-general",
  "monitor-special-tests": "monitor-special-tests",
  "monitor-fault-history": "monitor-fault-history",
  "monitor-1-test-results": "monitor-1-test-alarm-limits",
  "monitor-2-test-results": "monitor-2-test-alarm-limits",
  "monitor-1-offsets": "monitor-1-offsets",
  "monitor-2-offsets": "monitor-2-offsets",
  "monitor-1-data": "monitor-1-data-detail-integral",
  "monitor-2-data": "monitor-2-data-detail-integral",
  "monitor-1-calibration": "monitor-1-calibration",
  "monitor-2-calibration": "monitor-2-calibration",
  "tx-data": "tx-data-main",
  "tx-config": "tx-config-nominal",
  diagnostics: "diagnostics-power-up",
  disabled: "disabled",
};

export interface DmeSessionInitialization {
  mode: DmePmdtMode;
  scenarioId?: string;
  sessionKey?: string;
  userId?: string;
  studentName?: string;
  workUnit?: string;
  overrides?: readonly DmeFieldOverride[];
  expectedCheckpoints?: readonly DmeExpectedCheckpoint[];
}

export interface DmePmdtStoreState {
  mode: DmePmdtMode;
  configPanelOpen: boolean;
  scenarioParametersOpen: boolean;
  scenarioAuthoringEnabled: boolean;
  scenarioDraft: Dme1119aScenarioDefinition;
  scenario: Dme1119aScenarioRuntime;
  data: DmePmdtData;
  configDraft: DmePmdtData;
  configDirty: boolean;
  needBackup: boolean;
  configurationBackup: DmePmdtData | null;
  parameterChangeLogs: SimulatorParameterChangeLogEntry[];
  savedConfiguration: DmePmdtData | null;
  specialTestRunning: boolean;
  diagnosticsRunning: boolean;
  diagnosticsMode: "full" | "on-air" | null;
  loginDialogOpen: boolean;
  passwordDialogOpen: boolean;
  authenticatedUserId: string | null;
  securityLevel: DmeSecurityLevel;
  loginError: string | null;
  failedLoginAttempts: number;
  loginBlockedUntil: number | null;
  lastActivityAt: number | null;
  lastCommand: string | null;
  activeScreen: DmeScreenId;
  activeView: DmeViewId;
  activeMenuPath: string[];
  aboutDialogOpen: boolean;
  scenarioId: string | null;
  sessionKey: string | null;
  userId: string;
  studentName: string;
  workUnit: string;
  overrides: DmeFieldOverride[];
  expectedCheckpoints: DmeExpectedCheckpoint[];
  studentFieldStates: DmeFieldOverride[];
  attemptEvents: DmeAttemptEvent[];
  actionHistory: ScenarioActionEvent[];
  answer: DmeStudentAnswer;
}

export interface DmePmdtStoreActions {
  initializeSession: (initialization: DmeSessionInitialization) => void;
  replaceConfig: (
    config: Dme1119aPersistedConfig,
    backupConfig?: Dme1119aPersistedConfig,
    parameterChangeLogs?: readonly SimulatorParameterChangeLogEntry[],
  ) => void;
  setMode: (mode: DmePmdtMode) => void;
  setConfigPanelOpen: (open: boolean) => void;
  setScenarioParametersOpen: (open: boolean) => void;
  setScenarioAuthoringEnabled: (enabled: boolean) => void;
  replaceScenarioDraft: (definition: Dme1119aScenarioDefinition) => void;
  applyScenario: () => boolean;
  restoreScenario: () => boolean;
  endScenario: () => boolean;
  setAboutDialogOpen: (open: boolean) => void;
  setPasswordDialogOpen: (open: boolean) => void;
  openLogin: () => void;
  login: (userId: string, password: string) => boolean;
  changePassword: (currentPassword: string, nextPassword: string, confirmation: string) => boolean;
  updateSecurityAccount: (index: number, changes: Partial<Pick<DmeSecurityAccount, "userId" | "password" | "securityLevel">>) => boolean;
  addSecurityAccount: () => boolean;
  removeSecurityAccount: (index: number) => boolean;
  logout: () => void;
  recordActivity: () => void;
  checkActivity: () => void;
  setLocalMode: (enabled: boolean) => boolean;
  refreshClock: () => void;
  setParameterValue: (fieldId: string, value: DmeParameterValue) => void;
  applyConfigChanges: () => boolean;
  discardConfigChanges: () => void;
  resetConfigDraft: () => boolean;
  restoreDefaultConfig: () => boolean;
  backupConfig: () => boolean;
  saveConfig: () => boolean;
  loadConfig: () => boolean;
  restoreConfig: () => boolean;
  resetParameters: () => void;
  setTransmitterMode: (transmitterId: DmeTransmitterId, mode: DmeTransmitterMode) => boolean;
  setMonitorBypass: (monitor: "integral" | "standby", enabled: boolean) => boolean;
  setDelayMode: (transmitterId: DmeTransmitterId, mode: "automatic" | "fixed") => boolean;
  executeRmsCommand: (commandId: string) => boolean;
  refreshLogs: () => boolean;
  resetLog: (kind: "alarms" | "maintenance") => boolean;
  setSpecialTestRunning: (running: boolean) => boolean;
  runDiagnostics: (mode: "full" | "on-air") => boolean;
  cancelDiagnostics: () => void;
  nextView: () => void;
  closeScreen: () => void;
  openScreen: (screenId: DmeScreenId, menuPath: readonly string[], title: string) => void;
  openView: (screenId: DmeScreenId, viewId: DmeViewId, menuPath: readonly string[], title: string) => void;
  setOverride: (
    fieldId: string,
    value: DmeEditableValue,
    status?: DmeIndicatorColor | DmeParameterStatus,
  ) => void;
  removeOverride: (fieldId: string) => void;
  applyOverlay: (overrides: readonly DmeFieldOverride[]) => void;
  clearOverlay: () => void;
  addCurrentViewAsCheckpoint: (guidance?: string, points?: number) => void;
  removeCheckpoint: (checkpointId: string) => void;
  interactWithSidebar: (
    fieldId: string,
    title: string,
    resultValue: DmeEditableValue,
    resultStatus: DmeIndicatorColor | DmeParameterStatus,
  ) => void;
  updateEventAnnotation: (eventId: string, annotation: string) => void;
  removeEvent: (eventId: string) => void;
  updateAnswer: (changes: Partial<DmeStudentAnswer>) => void;
  reset: () => void;
}

export type DmePmdtStore = DmePmdtStoreState & DmePmdtStoreActions;

export interface DmePmdtStoreOptions {
  now?: () => Date;
  generateId?: () => string;
}

function defaultId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `dme-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatDmeTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const triggerDelayLabels = {
  normal: "Normal",
  "first-pulse-delay": "1st Pulse Delay",
  "second-pulse-delay": "2nd Pulse Delay",
  "interrogation-spacing": "Interrogation Spacing",
  "reply-spacing": "Reply Spacing",
} as const;

type DmeTriggerDelayId = keyof typeof triggerDelayLabels;

const directTriggerLabels = {
  "integral-efficiency": "Integral Efficiency",
  "reflected-power": "Reflected Power",
  "forward-power": "Forward Power",
} as const satisfies Record<string, DmeMonitorTriggerSource>;

function resolveMonitorTriggerCommand(commandId: string): {
  monitor: 1 | 2;
  source: DmeMonitorTriggerSource;
} | null {
  const delayMatch = commandId.match(/^monitor-(1|2)-(integral|standby)-(.+)$/);
  if (delayMatch && delayMatch[3] in triggerDelayLabels) {
    const monitor = Number(delayMatch[1]) as 1 | 2;
    const delayKind = delayMatch[2] === "integral" ? "Integral Delay" : "Standby Delay";
    const delayId = delayMatch[3] as DmeTriggerDelayId;
    const label = triggerDelayLabels[delayId];
    return {
      monitor,
      source: (delayId === "normal" ? delayKind : `${delayKind} - ${label}`) as DmeMonitorTriggerSource,
    };
  }

  const directMatch = commandId.match(/^monitor-(1|2)-trigger-(integral-efficiency|reflected-power|forward-power)$/);
  if (directMatch) {
    const label = directTriggerLabels[directMatch[2] as keyof typeof directTriggerLabels];
    return { monitor: Number(directMatch[1]) as 1 | 2, source: label };
  }
  return null;
}

function initialState(): DmePmdtStoreState {
  const data = cloneDefaultDmePmdtData();
  data.rmsStatus.logonLevel = 0;
  return {
    mode: "preview",
    configPanelOpen: false,
    scenarioParametersOpen: false,
    scenarioAuthoringEnabled: false,
    scenarioDraft: createDefaultDme1119aScenarioDefinition(),
    scenario: { active: false, definition: null, startedAt: null },
    data,
    configDraft: structuredClone(data),
    configDirty: false,
    needBackup: false,
    configurationBackup: structuredClone(data),
    parameterChangeLogs: [],
    specialTestRunning: false,
    diagnosticsRunning: false,
    diagnosticsMode: null,
    loginDialogOpen: true,
    passwordDialogOpen: false,
    authenticatedUserId: null,
    securityLevel: 0,
    loginError: null,
    failedLoginAttempts: 0,
    loginBlockedUntil: null,
    lastActivityAt: null,
    lastCommand: null,
    activeScreen: "home",
    activeView: "home",
    activeMenuPath: ["Home"],
    aboutDialogOpen: false,
    scenarioId: null,
    sessionKey: null,
    userId: "",
    studentName: "",
    workUnit: "",
    overrides: [],
    expectedCheckpoints: [],
    studentFieldStates: [],
    attemptEvents: [],
    actionHistory: [],
    answer: { ...emptyAnswer },
    // A disk/file save is only available after the explicit System
    // Configuration Save command. Keep it distinct from the simulated RMS
    // NVRAM backup so Config Restore selects the correct source.
    savedConfiguration: null,
  };
}

function setLogonLevel(data: DmePmdtData, securityLevel: DmeSecurityLevel): DmePmdtData {
  const next = structuredClone(data);
  next.rmsStatus.logonLevel = securityLevel;
  return next;
}

function syncMaintenanceAlert(data: DmePmdtData): void {
  data.rmsStatus.maintenanceAlert = data.local
    || data.txStatus.maintenanceAlert.tx1
    || data.txStatus.maintenanceAlert.tx2;
}

function setTransmitterState(
  data: DmePmdtData,
  transmitterId: DmeTransmitterId,
  mode: DmeTransmitterMode,
): void {
  const transmitter = data.transmitters[transmitterId];
  transmitter.main = "gray";
  transmitter.antenna = "gray";
  transmitter.load = "gray";
  transmitter.off = "gray";
  if (mode === "antenna") {
    transmitter.main = "green";
    transmitter.antenna = "green";
  } else if (mode === "load") {
    transmitter.load = "green";
  } else {
    transmitter.off = "green";
  }
}

/**
 * Apply the DME relay invariant used by the dual 1119A installation:
 * the selected transmitter is Main + Antenna and the other transmitter is
 * powered on and routed to the dummy Load.  The LCU's Off command is a
 * separate maintenance operation: it turns only that transmitter off and
 * deliberately leaves the relay selectors unchanged (manual §3.9.1.2).
 */
function routeTransmitter(
  source: DmePmdtData,
  transmitterId: DmeTransmitterId,
  mode: DmeTransmitterMode,
): DmePmdtData {
  const data = structuredClone(source);
  const otherId: DmeTransmitterId = transmitterId === "tx1" ? "tx2" : "tx1";
  const otherMode: DmeTransmitterMode = mode === "antenna" ? "load" : "antenna";

  if (mode === "off") {
    setTransmitterState(data, transmitterId, "off");
    data.monitorTransmitterStatus.transmitterOn[transmitterId] = false;
    return recomputeDmeDerivedData(data);
  }

  setTransmitterState(data, transmitterId, mode);
  setTransmitterState(data, otherId, otherMode);
  data.monitorTransmitterStatus.mainSelect = mode === "antenna"
    ? (transmitterId === "tx1" ? 1 : 2)
    : (otherId === "tx1" ? 1 : 2);
  data.monitorTransmitterStatus.antennaSelect = data.monitorTransmitterStatus.mainSelect;
  data.monitorTransmitterStatus.transmitterOn.tx1 = true;
  data.monitorTransmitterStatus.transmitterOn.tx2 = true;
  return recomputeDmeDerivedData(data);
}

interface AutomaticDmeTransfer {
  data: DmePmdtData;
  target: DmeTransmitterId | null;
  action: "transfer" | "shutdown" | null;
}

/**
 * Performs one DME hot-standby relay attempt. MainSelect remains the logical
 * primary transmitter while AntennaSelect moves to the standby. If the new
 * antenna path also alarms, both RTCs are powered Off and the function stops;
 * it never retries in the opposite direction.
 */
function applyAutomaticDmeTransfer(source: DmePmdtData): AutomaticDmeTransfer {
  const data = recomputeDmeDerivedData(source);
  const noAction = { data, target: null, action: null } as const;
  if (!dmeTransferRequested(data)) return noAction;

  const current: DmeTransmitterId = data.monitorTransmitterStatus.antennaSelect === 2 ? "tx2" : "tx1";
  const target: DmeTransmitterId = current === "tx1" ? "tx2" : "tx1";
  if (!data.monitorTransmitterStatus.transmitterOn[target]) return noAction;

  const transferred = structuredClone(data);
  transferred.monitorTransmitterStatus.antennaSelect = target === "tx1" ? 1 : 2;
  transferred.monitorTransmitterStatus.transmitterOn[current] = false;
  transferred.monitorTransmitterStatus.transmitterOn[target] = true;
  const transferredData = recomputeDmeDerivedData(transferred);

  if (dmeTransferRequested(transferredData)) {
    const shutdown = structuredClone(transferredData);
    shutdown.monitorTransmitterStatus.transmitterOn.tx1 = false;
    shutdown.monitorTransmitterStatus.transmitterOn.tx2 = false;
    return {
      data: recomputeDmeDerivedData(shutdown),
      target: null,
      action: "shutdown",
    };
  }

  return { data: transferredData, target, action: "transfer" };
}

function copyDmeTransmitterRoute(source: DmePmdtData, target: DmePmdtData): DmePmdtData {
  const next = structuredClone(target);
  next.monitorTransmitterStatus.mainSelect = source.monitorTransmitterStatus.mainSelect;
  next.monitorTransmitterStatus.antennaSelect = source.monitorTransmitterStatus.antennaSelect;
  next.monitorTransmitterStatus.transmitterOn = { ...source.monitorTransmitterStatus.transmitterOn };
  return recomputeDmeDerivedData(next);
}

function setIdentMode(data: DmePmdtData, mode: "normal" | "off" | "continuous"): DmePmdtData {
  const next = structuredClone(data);
  next.identMode = mode;
  for (const rows of [next.integralData, next.standbyData]) {
    const statusRow = rows.find((row) => row.label === "Ident Status");
    if (statusRow) statusRow.mon1Value = mode === "normal" ? "Normal" : mode === "off" ? "Off" : "Continuous";
    if (statusRow) statusRow.mon2Value = mode === "normal" ? "Normal" : mode === "off" ? "Off" : "Continuous";
  }
  return recomputeDmeDerivedData(next);
}

function defaultConfigForSession(
  state: DmePmdtStoreState,
  mainTransmitterId?: DmeTransmitterId,
): DmePmdtData {
  const defaults = cloneDefaultDmePmdtData();
  defaults.connected = state.data.connected;
  defaults.local = state.data.local;
  defaults.timestamp = state.data.timestamp;
  defaults.rmsStatus = {
    ...defaults.rmsStatus,
    localControlMode: state.data.local,
    logonLevel: state.securityLevel,
  };
  const routed = routeTransmitter(
    defaults,
    mainTransmitterId ?? (state.data.monitorTransmitterStatus.mainSelect === 2 ? "tx2" : "tx1"),
    "antenna",
  );
  syncMaintenanceAlert(routed);
  return routed;
}

function restoreConfigForSession(source: DmePmdtData, state: DmePmdtStoreState): DmePmdtData {
  const restored = structuredClone(source);
  restored.connected = state.data.connected;
  restored.local = state.data.local;
  restored.timestamp = state.data.timestamp;
  restored.rmsStatus.localControlMode = state.data.local;
  restored.rmsStatus.logonLevel = state.securityLevel;
  syncMaintenanceAlert(restored);
  return recomputeDmeDerivedData(restored);
}

function validateSecurityAccounts(accounts: readonly DmeSecurityAccount[]): string | null {
  const seen = new Set<string>();
  for (const account of accounts) {
    const userId = account.userId.trim();
    if (!userId) continue;
    if (userId.length < 4 || userId.length > 32) return "User ID must be 4-32 characters";
    if (seen.has(userId)) return "User IDs must be unique";
    seen.add(userId);
    // The supplied PMDT reference uses the factory SEC2/TWO credential even
    // though operator passwords created by the UI must be 4-32 characters.
    // Keep that documented training credential usable while validating all
    // other configured accounts against the manual's password rule.
    const isFactoryCredential = (userId === "GUEST" && account.password.length === 0)
      || (userId === "SEC2" && account.password === "TWO");
    if (!isFactoryCredential
      && (account.password.length < 4 || account.password.length > 32)) {
      return "Passwords must be 4-32 characters";
    }
    if (![1, 2, 3, 4].includes(account.securityLevel)) return "Security level must be 1-4";
  }
  return null;
}

function validateDmeConfiguration(data: DmePmdtData): string | null {
  const invalidField = dmeParameterFieldCatalog.find((field) => (
    !field.readOnly && validateDmeParameterField(field, getDmeParameterValue(data, field.id)) !== null
  ));
  if (invalidField) {
    return invalidField.label;
  }
  return validateSecurityAccounts(data.securityAccounts);
}

function isLiveDmeOperationalField(fieldId: string): boolean {
  return fieldId === "monitorTransmitterStatus.mainSelect"
    || fieldId === "monitorTransmitterStatus.antennaSelect"
    || fieldId.startsWith("monitorTransmitterStatus.transmitterOn.");
}

const screenViewGroups: Partial<Record<DmeScreenId, readonly DmeViewId[]>> = {
  "rms-status": ["rms-status-main", "rms-status-monitor-tx"],
  "rms-data": ["rms-maintenance-alerts", "rms-power-supply", "rms-ad-data", "rms-digital-io"],
  "rms-logs": ["rms-logs-operational-summary", "rms-logs-alarms", "rms-logs-maintenance", "rms-logs-command-activity", "rms-logs-parameter-change"],
  "rms-config": ["rms-config-general", "rms-config-station", "rms-config-power-limits", "rms-config-ad-limits", "rms-config-security-codes"],
  "monitor-data": ["monitor-integral", "monitor-standby"],
  "monitor-config": ["monitor-config-general", "monitor-alarm-limits"],
  "monitor-special-tests": ["monitor-special-tests"],
  "monitor-fault-history": ["monitor-fault-history"],
  "monitor-1-test-results": ["monitor-1-test-alarm-limits", "monitor-1-test-interrogator", "monitor-1-test-transponder", "monitor-1-decoder-results"],
  "monitor-2-test-results": ["monitor-2-test-alarm-limits", "monitor-2-test-interrogator", "monitor-2-test-transponder", "monitor-2-decoder-results"],
  "monitor-1-offsets": ["monitor-1-offsets"],
  "monitor-2-offsets": ["monitor-2-offsets"],
  "monitor-1-data": ["monitor-1-data-detail-integral", "monitor-1-data-detail-standby", "monitor-1-data-detail-maintenance", "monitor-1-data-detail-status"],
  "monitor-2-data": ["monitor-2-data-detail-integral", "monitor-2-data-detail-standby", "monitor-2-data-detail-maintenance", "monitor-2-data-detail-status"],
  "monitor-1-calibration": ["monitor-1-calibration"],
  "monitor-2-calibration": ["monitor-2-calibration"],
  "tx-data": ["tx-data-main", "tx-rtc-data"],
  "tx-config": ["tx-config-nominal", "tx-config-offsets", "tx-config-integral-monitor", "tx-config-standby-monitor"],
  diagnostics: ["diagnostics-power-up", "diagnostics-fault-isolation"],
};

export function resolveDmeField<T extends DmeEditableValue>(
  baseValue: T,
  fieldId: string,
  overrides: readonly DmeFieldOverride[],
): T {
  const override = overrides.find((item) => item.fieldId === fieldId);
  return (override ? override.value : baseValue) as T;
}

export function resolveDmeStatus<T extends DmeIndicatorColor | DmeParameterStatus>(
  baseStatus: T,
  fieldId: string,
  overrides: readonly DmeFieldOverride[],
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

function dmeEvidenceSnapshot(state: DmePmdtStoreState): ScenarioEvidenceSnapshot {
  return {
    screen: state.activeScreen,
    view: state.activeView,
    local: state.data.local,
    monitorIntegralBypass: state.data.monitors.integral.bypass,
    monitorStandbyBypass: state.data.monitors.standby.bypass,
    monitorIntegralNormal: state.data.monitors.integral.normal,
    monitorStandbyNormal: state.data.monitors.standby.normal,
    primaryMonitorAlarm: state.data.monitors.integral.priAlarm || state.data.monitors.standby.priAlarm,
    secondaryMonitorAlarm: state.data.monitors.integral.secAlarm || state.data.monitors.standby.secAlarm,
    activeTransmitter: `TX${state.data.monitorTransmitterStatus.mainSelect}`,
    transmitterOn: {
      tx1: state.data.monitorTransmitterStatus.transmitterOn.tx1,
      tx2: state.data.monitorTransmitterStatus.transmitterOn.tx2,
    },
    identMode: state.data.identMode,
    alarm: state.data.alert,
    activeAlarms: state.data.alarmLogs.filter((entry) => entry.state !== "Normal").map((entry) => entry.alarm),
  };
}

export function createDmePmdtStore(
  options: DmePmdtStoreOptions = {},
): UseBoundStore<StoreApi<DmePmdtStore>> {
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? defaultId;

  return create<DmePmdtStore>()((set, get) => {
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
    }) => {
      const state = get();
      if (state.mode !== "student" && input.actor !== "system") return;
      const event: ScenarioActionEvent = {
        id: generateId(),
        sequence: state.actionHistory.length + 1,
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
        after: dmeEvidenceSnapshot(state),
      };
      set({ actionHistory: [...state.actionHistory, event] });
    };

    const recordVisit = (
      screenId: DmeScreenId,
      viewId: DmeViewId,
      menuPath: readonly string[],
      title: string,
    ): DmeAttemptEvent[] => {
      const state = get();
      if (state.mode !== "student" || viewId === "disabled") {
        return state.attemptEvents;
      }
      const event: DmeAttemptEvent = {
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
        const fresh = initialState();
        set({
          ...fresh,
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

      replaceConfig: (persistedConfig, persistedBackup = persistedConfig, parameterChangeLogs) => {
        const state = get();
        // Scenario Parameters is a session-only overlay. A profile hydrate
        // must never replace an active examiner scenario or write it back to
        // the persistent simulator configuration.
        if (state.scenario.active) return;
        const data = hydrateDme1119aData(persistedConfig);
        const backupData = hydrateDme1119aData(persistedBackup);
        data.rmsStatus.logonLevel = state.securityLevel;
        data.rmsStatus.localControlMode = data.local;
        set({
          data,
          configDraft: structuredClone(data),
          configDirty: false,
          needBackup: JSON.stringify(extractDme1119aConfig(data)) !== JSON.stringify(extractDme1119aConfig(backupData)),
          configurationBackup: backupData,
          parameterChangeLogs: parameterChangeLogs ? [...parameterChangeLogs] : state.parameterChangeLogs,
          savedConfiguration: structuredClone(data),
          lastCommand: "User configuration loaded",
        });
      },

      setMode: (mode) => set({ mode }),

      setConfigPanelOpen: (configPanelOpen) => set({ configPanelOpen }),

      setScenarioParametersOpen: (scenarioParametersOpen) => {
        const state = get();
        if (scenarioParametersOpen && !state.scenarioAuthoringEnabled) return;
        set({ scenarioParametersOpen });
      },

      setScenarioAuthoringEnabled: (scenarioAuthoringEnabled) => set({
        scenarioAuthoringEnabled,
        ...(scenarioAuthoringEnabled ? {} : { scenarioParametersOpen: false }),
      }),

      replaceScenarioDraft: (definition) => set({
        scenarioDraft: cloneDme1119aScenarioDefinition(definition),
      }),

      applyScenario: () => {
        const state = get();
        if (!state.scenarioAuthoringEnabled || state.securityLevel < 3 || state.loginDialogOpen || !state.data.local) {
          return false;
        }
        const definition = cloneDme1119aScenarioDefinition(state.scenarioDraft);
        const issues = validateDme1119aScenarioDefinition(definition);
        if (issues.length > 0) {
          set({ lastCommand: `Scenario validation failed: ${issues[0]}` });
          return false;
        }
        const preview = previewDme1119aScenario(definition);
        const startingEvaluation = evaluateDme1119aScenario(
          { active: true, definition, startedAt: null },
          preview.data,
        );
        if (startingEvaluation.solved) {
          set({ lastCommand: "Scenario validation failed: starting state is already solved" });
          return false;
        }
        const baseline = configurationForDme1119aScenario(definition, state.data);
        const data = applyDme1119aScenarioFaults(baseline, definition.faultInjections);
        data.connected = state.data.connected;
        data.timestamp = state.data.timestamp;
        data.rmsStatus.logonLevel = state.securityLevel;
        data.rmsStatus.localControlMode = data.local;
        const startedAt = now().toISOString();
        set({
          data,
          configDraft: structuredClone(data),
          configDirty: false,
          needBackup: false,
          configurationBackup: state.configurationBackup,
          scenario: { active: true, definition, startedAt },
          scenarioParametersOpen: false,
          lastCommand: `Scenario Apply: ${definition.name}`,
        });
        return true;
      },

      restoreScenario: () => {
        const state = get();
        if (!state.scenario.active || !state.scenario.definition) return false;
        const baseline = configurationForDme1119aScenario(state.scenario.definition, state.data);
        const data = applyDme1119aScenarioFaults(baseline, state.scenario.definition.faultInjections);
        data.connected = state.data.connected;
        data.timestamp = state.data.timestamp;
        data.rmsStatus.logonLevel = state.securityLevel;
        data.rmsStatus.localControlMode = data.local;
        set({
          data,
          configDraft: structuredClone(data),
          configDirty: false,
          needBackup: false,
          lastCommand: `Scenario Restore: ${state.scenario.definition.name}`,
        });
        return true;
      },

      endScenario: () => {
        const state = get();
        if (!state.scenario.active) return false;
        const data = defaultConfigForSession(state, "tx1");
        data.rmsStatus.logonLevel = state.securityLevel;
        set({
          data,
          configDraft: structuredClone(data),
          configDirty: false,
          needBackup: false,
          scenario: { active: false, definition: null, startedAt: null },
          scenarioDraft: createDefaultDme1119aScenarioDefinition(),
          scenarioParametersOpen: false,
          lastCommand: "Scenario End - Restore TST",
        });
        return true;
      },

      setAboutDialogOpen: (aboutDialogOpen) => set({ aboutDialogOpen }),

      setPasswordDialogOpen: (passwordDialogOpen) => set({ passwordDialogOpen }),

      openLogin: () => set({
        loginDialogOpen: true,
        passwordDialogOpen: false,
        authenticatedUserId: null,
        securityLevel: 0,
        loginError: null,
      }),

      login: (userId, password) => {
        const currentTime = now().getTime();
        const state = get();
        const before = dmeEvidenceSnapshot(state);
        if (state.loginBlockedUntil !== null && currentTime < state.loginBlockedUntil) {
          const remainingMinutes = Math.max(1, Math.ceil((state.loginBlockedUntil - currentTime) / 60000));
          set({ loginError: `Logon blocked. Try again in ${remainingMinutes} minute(s).` });
          recordAction({ kind: "authentication", controlId: "pmdt-login", label: "PMDT login", input: { userId: userId.trim() }, accepted: false, reason: "Logon is temporarily blocked.", before });
          return false;
        }
        const blockExpired = state.loginBlockedUntil !== null && currentTime >= state.loginBlockedUntil;
        const attemptsBeforeLogin = blockExpired ? 0 : state.failedLoginAttempts;
        if (blockExpired) {
          set({ failedLoginAttempts: attemptsBeforeLogin, loginBlockedUntil: null });
        }
        const identity = state.data.securityAccounts.find(
          (item) => item.userId === userId.trim() && item.password === password,
        );
        if (!identity) {
          const failedAttempts = attemptsBeforeLogin + 1;
          const blockedUntil = failedAttempts >= 3 ? currentTime + 5 * 60 * 1000 : null;
          set({
            loginError: blockedUntil === null
              ? "Invalid User ID or Password."
              : "Logon blocked for 5 minutes after 3 failed attempts.",
            failedLoginAttempts: failedAttempts,
            loginBlockedUntil: blockedUntil,
          });
          recordAction({ kind: "authentication", controlId: "pmdt-login", label: "PMDT login", input: { userId: userId.trim() }, accepted: false, reason: "Invalid User ID or Password.", before });
          return false;
        }
        const data = setLogonLevel(state.data, identity.securityLevel);
        const configDraft = setLogonLevel(state.configDraft, identity.securityLevel);
        const securityViewIsUnavailable = state.activeView === "rms-config-security-codes"
          && identity.securityLevel < 4;
        set({
          loginDialogOpen: false,
          authenticatedUserId: identity.userId,
          securityLevel: identity.securityLevel,
          loginError: null,
          failedLoginAttempts: 0,
          loginBlockedUntil: null,
          lastActivityAt: currentTime,
          data,
          configDraft,
          ...(securityViewIsUnavailable
            ? {
              activeView: "rms-config-general" as const,
              activeMenuPath: ["RMS", "Configuration", "General"],
            }
            : {}),
        });
        recordAction({ kind: "authentication", controlId: "pmdt-login", label: "PMDT login", input: { userId: identity.userId, securityLevel: identity.securityLevel }, accepted: true, before });
        return true;
      },

      logout: () => {
        const state = get();
        const data = setLogonLevel(state.data, 0);
        set({
          loginDialogOpen: true,
          authenticatedUserId: null,
          securityLevel: 0,
          loginError: null,
          passwordDialogOpen: false,
          lastActivityAt: null,
          configPanelOpen: false,
          scenarioParametersOpen: false,
          scenarioAuthoringEnabled: false,
          scenarioDraft: createDefaultDme1119aScenarioDefinition(),
          scenario: { active: false, definition: null, startedAt: null },
          aboutDialogOpen: false,
          data,
          configDraft: structuredClone(data),
          configDirty: false,
        });
      },

      changePassword: (currentPassword, nextPassword, confirmation) => {
        const state = get();
        if (state.loginDialogOpen || state.authenticatedUserId === null || state.securityLevel < 1 || !state.data.local) {
          return false;
        }
        if (currentPassword !== (state.data.securityAccounts.find((account) => account.userId === state.authenticatedUserId)?.password ?? "")) {
          set({ loginError: "Current password is invalid." });
          return false;
        }
        if (nextPassword.length < 4 || nextPassword.length > 32 || nextPassword !== confirmation) {
          set({ loginError: "New password must match and contain 4-32 characters." });
          return false;
        }
        const update = (source: DmePmdtData): DmePmdtData => {
          const next = structuredClone(source);
          const account = next.securityAccounts.find((item) => item.userId === state.authenticatedUserId);
          if (account) account.password = nextPassword;
          return next;
        };
        const data = update(state.data);
        const configDraft = update(state.configDraft);
        set({
          data,
          configDraft,
          configDirty: JSON.stringify(configDraft) !== JSON.stringify(data),
          needBackup: true,
          passwordDialogOpen: false,
          loginError: null,
          lastCommand: "Change Password",
        });
        return true;
      },

      updateSecurityAccount: (index, changes) => {
        const state = get();
        if (state.loginDialogOpen || state.securityLevel < 4 || !state.data.local) return false;
        const configDraft = structuredClone(state.configDraft);
        const account = configDraft.securityAccounts[index];
        if (!account) return false;
        const nextLevel = changes.securityLevel;
        if (nextLevel !== undefined && ![1, 2, 3, 4].includes(nextLevel)) return false;
        Object.assign(account, changes);
        configDraft.securityAccounts[index] = account;
        set({
          configDraft,
          configDirty: JSON.stringify(configDraft) !== JSON.stringify(state.data),
        });
        return true;
      },

      addSecurityAccount: () => {
        const state = get();
        if (state.loginDialogOpen || state.securityLevel < 4 || !state.data.local) return false;
        const configDraft = structuredClone(state.configDraft);
        configDraft.securityAccounts.push({ userId: "", password: "", securityLevel: 1 });
        set({ configDraft, configDirty: true });
        return true;
      },

      removeSecurityAccount: (index) => {
        const state = get();
        if (state.loginDialogOpen || state.securityLevel < 4 || !state.data.local) return false;
        const configDraft = structuredClone(state.configDraft);
        if (!configDraft.securityAccounts[index]) return false;
        configDraft.securityAccounts[index] = { userId: "", password: "", securityLevel: 1 };
        set({ configDraft, configDirty: JSON.stringify(configDraft) !== JSON.stringify(state.data) });
        return true;
      },

      recordActivity: () => {
        const state = get();
        if (state.loginDialogOpen || state.authenticatedUserId === null || state.data.local) return;
        const currentTime = now().getTime();
        if (state.lastActivityAt !== null && currentTime - state.lastActivityAt >= 15 * 60 * 1000) {
          get().logout();
          return;
        }
        set({ lastActivityAt: currentTime });
      },

      checkActivity: () => {
        const state = get();
        if (state.loginDialogOpen || state.authenticatedUserId === null || state.data.local || state.lastActivityAt === null) return;
        if (now().getTime() - state.lastActivityAt >= 15 * 60 * 1000) get().logout();
      },

      setLocalMode: (enabled) => {
        const state = get();
        const before = dmeEvidenceSnapshot(state);
        if (state.securityLevel < 3 || state.loginDialogOpen) {
          recordAction({ kind: "control", controlId: enabled ? "local-on" : "local-off", label: enabled ? "Local Mode" : "Remote Mode", accepted: false, reason: "Security level or login state does not allow this command.", before });
          return false;
        }
        let data = structuredClone(state.data);
        data.local = enabled;
        data.rmsStatus.localControlMode = enabled;
        if (!enabled) {
          data.monitors.integral.bypass = false;
          data.monitors.standby.bypass = false;
        }
        data = recomputeDmeDerivedData(data);
        // Examiner scenarios intentionally let the trainee choose the
        // recovery sequence (for example, manual changeover before releasing
        // the standby bypass). Automatic transfer remains the normal PMDT
        // behavior outside a scenario, but must not immediately undo a
        // scenario's explicit TX selection because the injected fault is
        // still present on the standby path.
        const automaticTransfer = !enabled && !state.scenario.active ? applyAutomaticDmeTransfer(data) : null;
        data = automaticTransfer?.data ?? data;
        let configDraft = structuredClone(state.configDraft);
        configDraft.local = enabled;
        configDraft.rmsStatus.localControlMode = enabled;
        if (!enabled) {
          configDraft.monitors.integral.bypass = false;
          configDraft.monitors.standby.bypass = false;
        }
        configDraft = recomputeDmeDerivedData(configDraft);
        if (automaticTransfer?.action) configDraft = copyDmeTransmitterRoute(data, configDraft);
        syncMaintenanceAlert(data);
        syncMaintenanceAlert(configDraft);
        set({
          data,
          configDraft,
          // Changing Local/Remote is an operational command. Do not hide a
          // separate configuration draft that was edited before Local was
          // toggled; it must remain available for Apply (F7) after Local is
          // enabled again.
          configDirty: JSON.stringify(configDraft) !== JSON.stringify(data),
          lastCommand: automaticTransfer?.action === "transfer" && automaticTransfer.target
            ? `Automatic monitor transfer to ${automaticTransfer.target.toUpperCase()}`
            : automaticTransfer?.action === "shutdown"
              ? "Automatic monitor shutdown: both transmitters off"
              : enabled ? "Local Mode" : "Remote Mode",
        });
        recordAction({ kind: "control", controlId: enabled ? "local-on" : "local-off", label: enabled ? "Local Mode" : "Remote Mode", accepted: true, before });
        if (automaticTransfer?.action) {
          recordAction({ actor: "system", kind: "system", controlId: "automatic-monitor-transfer", label: automaticTransfer.action === "transfer" && automaticTransfer.target ? `Automatic monitor transfer to ${automaticTransfer.target.toUpperCase()}` : "Automatic monitor shutdown", accepted: true, reason: "PMDT automatic protection response.", before });
        }
        return true;
      },

      refreshClock: () => {
        const state = get();
        const timestamp = formatDmeTimestamp(now());
        if (state.data.timestamp === timestamp && state.configDraft.timestamp === timestamp) return;
        const data = structuredClone(state.data);
        const configDraft = structuredClone(state.configDraft);
        data.timestamp = timestamp;
        configDraft.timestamp = timestamp;
        set({ data, configDraft });
      },

      setParameterValue: (fieldId, value) => {
        const state = get();
        const before = dmeEvidenceSnapshot(state);
        if (state.securityLevel < 3 || state.loginDialogOpen || !state.data.local) {
          recordAction({ kind: "configuration", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: false, reason: "Local mode, login or security requirement is not satisfied.", before });
          return;
        }
        if (
          state.scenario.active
          && !isLiveDmeOperationalField(fieldId)
          && !state.scenario.definition?.studentEditableFieldIds.includes(fieldId)
        ) {
          recordAction({ kind: "configuration", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: false, reason: "Scenario recovery controls only.", before });
          return;
        }
        if (
          fieldId.startsWith("monitorTransmitterStatus.transmitterOn.")
          && value === false
          && state.configDraft.rmsConfigStation.transmitterConfig === "Dual Transmitters"
          && state.configDraft.rmsConfigStation.hotStandby
        ) {
          // The dual 1119A normal state keeps both RTCs powered. Use the
          // Transmitters >> Commands menu for an explicit maintenance Off.
          recordAction({ kind: "control", controlId: fieldId, label: `Set ${fieldId}`, input: { fieldId, value: String(value) }, accepted: false, reason: "Hot-standby transmitter power is controlled from the Commands menu.", before });
          return;
        }
        let nextDraft = setDmeParameterValue(state.configDraft, fieldId, value);
        const monitorRoutingMatch = fieldId.match(/^monitorConfigGeneral\.(\d+)\.(primary|secondary)$/);
        if (monitorRoutingMatch && value === true) {
          const row = nextDraft.monitorConfigGeneral[Number(monitorRoutingMatch[1])];
          if (row) {
            row.primary = monitorRoutingMatch[2] === "primary";
            row.secondary = monitorRoutingMatch[2] === "secondary";
          }
        }
        if (fieldId === "rmsConfigStation.transmitterConfig") {
          const selectedId: DmeTransmitterId = nextDraft.monitorTransmitterStatus.mainSelect === 2 ? "tx2" : "tx1";
          const otherId: DmeTransmitterId = selectedId === "tx1" ? "tx2" : "tx1";
          if (value === "Dual Transmitters") {
            // Returning to the normal 1119A dual installation restores the
            // selected Main/Antenna transmitter and keeps the other TX on
            // the dummy Load.
            nextDraft = routeTransmitter(nextDraft, selectedId, "antenna");
          } else if (value === "Single Transmitter") {
            // A single-transmitter configuration must not leave the second
            // RTC powered or shown as a second on-air path.
            setTransmitterState(nextDraft, selectedId, "antenna");
            setTransmitterState(nextDraft, otherId, "off");
            nextDraft.monitorTransmitterStatus.transmitterOn[selectedId] = true;
            nextDraft.monitorTransmitterStatus.transmitterOn[otherId] = false;
            nextDraft.monitorTransmitterStatus.mainSelect = selectedId === "tx1" ? 1 : 2;
            nextDraft.monitorTransmitterStatus.antennaSelect = nextDraft.monitorTransmitterStatus.mainSelect;
          }
        }
        if ((fieldId === "monitorTransmitterStatus.mainSelect" || fieldId === "monitorTransmitterStatus.antennaSelect") && (value === 1 || value === 2)) {
          nextDraft = routeTransmitter(nextDraft, value === 1 ? "tx1" : "tx2", "antenna");
        }
        nextDraft = recomputeDmeDerivedData(nextDraft);
        set({
          configDraft: nextDraft,
          configDirty: JSON.stringify(nextDraft) !== JSON.stringify(state.data),
        });
        recordAction({ kind: "configuration", controlId: fieldId, label: `Stage ${fieldId}`, input: { fieldId, value: String(value) }, accepted: true, before });
      },

      applyConfigChanges: () => {
        const state = get();
        const before = dmeEvidenceSnapshot(state);
        if (!state.configDirty || state.securityLevel < 3 || state.loginDialogOpen || !state.data.local) {
          recordAction({ kind: "configuration", controlId: "config-apply", label: "Configuration Apply", accepted: false, reason: "PMDT is not ready to Apply the draft.", before });
          return false;
        }
        if (state.scenario.active) {
          const protectedChanges = getDme1119aScenarioProtectedFieldChanges(state.scenario.definition!, state.configDraft);
          if (protectedChanges.length > 0) {
            set({ lastCommand: `Scenario protected field blocked: ${protectedChanges[0].label}` });
            recordAction({ kind: "configuration", controlId: "config-apply", label: "Configuration Apply", accepted: false, reason: `Protected field: ${protectedChanges[0].label}.`, before });
            return false;
          }
        }
        const validationError = validateDmeConfiguration(state.configDraft);
        if (validationError) {
          set({ lastCommand: `Configuration validation failed: ${validationError}` });
          recordAction({ kind: "configuration", controlId: "config-apply", label: "Configuration Apply", accepted: false, reason: validationError, before });
          return false;
        }
        // §6.2.8: a primary monitor alarm requests one dual hot-standby
        // transfer. If the target is also in alarm, the helper takes both
        // transmitters Off and deliberately does not retry in reverse.
        const automaticTransfer = applyAutomaticDmeTransfer(state.configDraft);
        const data = automaticTransfer.data;
        data.rmsStatus.logonLevel = state.securityLevel;
        set({
          data,
          configDraft: structuredClone(data),
          configDirty: false,
          needBackup: state.scenario.active ? false : true,
          lastCommand: automaticTransfer.action === "transfer" && automaticTransfer.target
            ? `Automatic monitor transfer to ${automaticTransfer.target.toUpperCase()}`
            : automaticTransfer.action === "shutdown"
              ? "Automatic monitor shutdown: both transmitters off"
              : "Configuration Apply",
        });
        recordAction({ kind: "configuration", controlId: "config-apply", label: "Configuration Apply", accepted: true, before });
        if (automaticTransfer.action) {
          recordAction({ actor: "system", kind: "system", controlId: "automatic-monitor-transfer", label: automaticTransfer.action === "transfer" && automaticTransfer.target ? `Automatic monitor transfer to ${automaticTransfer.target.toUpperCase()}` : "Automatic monitor shutdown", accepted: true, reason: "PMDT automatic protection response.", before });
        }
        return true;
      },

      discardConfigChanges: () => {
        const state = get();
        set({ configDraft: structuredClone(state.data), configDirty: false, lastCommand: "Configuration Reset" });
      },

      resetConfigDraft: () => {
        const state = get();
        if (state.securityLevel < 3 || state.loginDialogOpen || !state.data.local) return false;
        set({ configDraft: structuredClone(state.data), configDirty: false, lastCommand: "Configuration Reset" });
        return true;
      },

      restoreDefaultConfig: () => {
        const state = get();
        if (state.securityLevel < 3 || state.loginDialogOpen) return false;
        if (state.scenario.active) return state.restoreScenario();
        if (!state.data.local) return false;
        const data = defaultConfigForSession(state);
        data.rmsStatus.logonLevel = state.securityLevel;
        set({
          data,
          configDraft: structuredClone(data),
          configDirty: false,
          needBackup: false,
          lastCommand: "Restore Default Configuration",
        });
        return true;
      },

      backupConfig: () => {
        const state = get();
        if (state.scenario.active) return false;
        if (state.securityLevel < 3 || state.loginDialogOpen || !state.data.local || !state.needBackup) return false;
        const previousBackup = state.configurationBackup ?? state.data;
        const changedFields = collectChangedConfigFields(
          extractDme1119aConfig(previousBackup),
          extractDme1119aConfig(state.data),
        );
        const nextLogs = createParameterChangeLogEntries({
          changedFields,
          timeTag: state.data.timestamp,
          userName: state.authenticatedUserId,
          file: "RMS",
          actionLabel: "RMS Configuration Backup",
        });
        set({
          configurationBackup: structuredClone(state.data),
          parameterChangeLogs: prependParameterChangeLogEntries(state.parameterChangeLogs, nextLogs),
          needBackup: false,
          lastCommand: "RMS Config Backup",
        });
        return true;
      },

      saveConfig: () => {
        const state = get();
        if (state.scenario.active) return false;
        if (state.securityLevel < 1 || state.loginDialogOpen) return false;
        set({ savedConfiguration: structuredClone(state.data), lastCommand: "System Configuration Save" });
        return true;
      },

      loadConfig: () => {
        const state = get();
        if (state.scenario.active) return false;
        if (state.securityLevel < 3 || state.loginDialogOpen || !state.data.local || !state.savedConfiguration) return false;
        const data = restoreConfigForSession(state.savedConfiguration, state);
        set({ data, configDraft: structuredClone(data), configDirty: false, needBackup: true, lastCommand: "System Configuration Load" });
        return true;
      },

      restoreConfig: () => {
        const state = get();
        if (state.scenario.active) return false;
        if (state.securityLevel < 3 || state.loginDialogOpen || !state.data.local) return false;
        const source = state.configurationBackup ?? cloneDefaultDmePmdtData();
        const data = restoreConfigForSession(source, state);
        set({ data, configDraft: structuredClone(data), configDirty: false, needBackup: false, lastCommand: "RMS Config Restore" });
        return true;
      },

      resetParameters: () => {
        const state = get();
        if (state.securityLevel >= 3 && state.data.local) {
          state.restoreDefaultConfig();
        }
      },

      setTransmitterMode: (transmitterId, mode) => {
        const state = get();
        const before = dmeEvidenceSnapshot(state);
        const requiresLocal = mode !== "antenna";
        if (state.securityLevel < 2 || state.loginDialogOpen || (requiresLocal && !state.data.local)) {
          recordAction({ kind: "control", controlId: `transmitter-${transmitterId}-${mode}`, label: `TX${transmitterId === "tx1" ? "1" : "2"} ${mode}`, accepted: false, reason: "Security level, login or Local requirement is not satisfied.", before });
          return false;
        }
        if (transmitterId === "tx2" && state.data.rmsConfigStation.transmitterConfig === "Single Transmitter") {
          recordAction({ kind: "control", controlId: `transmitter-${transmitterId}-${mode}`, label: `TX2 ${mode}`, accepted: false, reason: "TX2 is unavailable in Single Transmitter mode.", before });
          return false;
        }
        const data = routeTransmitter(state.data, transmitterId, mode);
        const configDraft = routeTransmitter(state.configDraft, transmitterId, mode);
        set({
          data,
          configDraft,
          lastCommand: `TX${transmitterId === "tx1" ? "1" : "2"} ${mode}`,
        });
        recordAction({ kind: "control", controlId: `transmitter-${transmitterId}-${mode}`, label: `TX${transmitterId === "tx1" ? "1" : "2"} ${mode}`, input: { transmitterId, mode }, accepted: true, before });
        return true;
      },

      setMonitorBypass: (monitor, enabled) => {
        const state = get();
        const before = dmeEvidenceSnapshot(state);
        if (state.securityLevel < 2 || state.loginDialogOpen || !state.data.local) {
          recordAction({ kind: "control", controlId: `${monitor}-monitor-bypass`, label: `${monitor === "integral" ? "Integral" : "Standby"} Monitor Bypass ${enabled ? "On" : "Off"}`, accepted: false, reason: "Security level, login or Local requirement is not satisfied.", before });
          return false;
        }
        let data = structuredClone(state.data);
        data.monitors[monitor].bypass = enabled;
        data = recomputeDmeDerivedData(data);
        const automaticTransfer = !enabled && !state.scenario.active ? applyAutomaticDmeTransfer(data) : null;
        data = automaticTransfer?.data ?? data;
        let configDraft = structuredClone(state.configDraft);
        configDraft.monitors[monitor].bypass = enabled;
        configDraft = recomputeDmeDerivedData(configDraft);
        if (automaticTransfer?.action) configDraft = copyDmeTransmitterRoute(data, configDraft);
        set({
          data,
          configDraft,
          lastCommand: automaticTransfer?.action === "transfer" && automaticTransfer.target
            ? `Automatic monitor transfer to ${automaticTransfer.target.toUpperCase()}`
            : automaticTransfer?.action === "shutdown"
              ? "Automatic monitor shutdown: both transmitters off"
              : `${monitor === "integral" ? "Integral" : "Standby"} Monitor Bypass ${enabled ? "On" : "Off"}`,
        });
        recordAction({ kind: "control", controlId: `${monitor}-monitor-bypass`, label: `${monitor === "integral" ? "Integral" : "Standby"} Monitor Bypass ${enabled ? "On" : "Off"}`, input: { monitor, enabled }, accepted: true, before });
        if (automaticTransfer?.action) {
          recordAction({ actor: "system", kind: "system", controlId: "automatic-monitor-transfer", label: automaticTransfer.action === "transfer" && automaticTransfer.target ? `Automatic monitor transfer to ${automaticTransfer.target.toUpperCase()}` : "Automatic monitor shutdown", accepted: true, reason: "PMDT automatic protection response.", before });
        }
        return true;
      },

      setDelayMode: (transmitterId, mode) => {
        const state = get();
        const before = dmeEvidenceSnapshot(state);
        if (state.securityLevel < 2 || state.loginDialogOpen || !state.data.local) {
          recordAction({ kind: "control", controlId: `delay-${transmitterId}`, label: `TX${transmitterId === "tx1" ? "1" : "2"} Delay ${mode}`, accepted: false, reason: "Security level, login or Local requirement is not satisfied.", before });
          return false;
        }
        const data = structuredClone(state.data);
        const rtcKey = transmitterId === "tx1" ? "rtc1" : "rtc2";
        data.delayControl[rtcKey].fixed = mode === "fixed";
        data.txStatus.maintenanceAlert[transmitterId] = mode === "fixed";
        const configDraft = structuredClone(state.configDraft);
        configDraft.delayControl[rtcKey].fixed = mode === "fixed";
        configDraft.txStatus.maintenanceAlert[transmitterId] = mode === "fixed";
        syncMaintenanceAlert(data);
        syncMaintenanceAlert(configDraft);
        set({ data, configDraft, lastCommand: `TX${transmitterId === "tx1" ? "1" : "2"} Delay ${mode}` });
        recordAction({ kind: "control", controlId: `delay-${transmitterId}`, label: `TX${transmitterId === "tx1" ? "1" : "2"} Delay ${mode}`, input: { transmitterId, mode }, accepted: true, before });
        return true;
      },

      executeRmsCommand: (commandId) => {
        const state = get();
        const before = dmeEvidenceSnapshot(state);
        if (state.securityLevel < 2 || state.loginDialogOpen) {
          recordAction({ kind: "control", controlId: commandId, label: commandId, accepted: false, reason: "Security level or login state does not allow this command.", before });
          return false;
        }
        if (commandId === "rms-command-enable-mode") return state.setLocalMode(true);
        if (commandId === "rms-command-disable-mode") return state.setLocalMode(false);
        if (commandId === "tx-command-transfer") {
          if (state.data.rmsConfigStation.transmitterConfig === "Single Transmitter") {
            recordAction({ kind: "control", controlId: commandId, label: "TX Transfer", accepted: false, reason: "TX Transfer is unavailable in Single Transmitter mode.", before });
            return false;
          }
          const current = state.data.monitorTransmitterStatus.mainSelect;
          const target: DmeTransmitterId = current === 1 ? "tx2" : "tx1";
          const data = routeTransmitter(state.data, target, "antenna");
          const configDraft = routeTransmitter(state.configDraft, target, "antenna");
          set({
            data,
            configDraft,
            lastCommand: `TX Transfer -> TX${target === "tx1" ? "1" : "2"}`,
          });
          recordAction({ kind: "control", controlId: commandId, label: `TX Transfer -> TX${target === "tx1" ? "1" : "2"}`, accepted: true, before });
          return true;
        }
        if (!state.data.local) {
          recordAction({ kind: "control", controlId: commandId, label: commandId, accepted: false, reason: "Local mode is disabled.", before });
          return false;
        }

        const updateOperationalState = (mutate: (data: DmePmdtData) => void, lastCommand: string) => {
          const data = structuredClone(state.data);
          const configDraft = structuredClone(state.configDraft);
          mutate(data);
          mutate(configDraft);
          set({ data, configDraft, lastCommand });
          recordAction({ kind: "control", controlId: commandId, label: lastCommand, accepted: true, input: { commandId }, before });
          return true;
        };

        if (commandId === "rms-command-set-time") {
          const timestamp = formatDmeTimestamp(now());
          return updateOperationalState((data) => {
            data.timestamp = timestamp;
          }, "Set Time and Date");
        }

        if (commandId === "rms-command-select-audio-tx1" || commandId === "rms-command-select-audio-tx2") {
          const audioSelect = commandId.endsWith("tx1") ? "tx1" : "tx2";
          return updateOperationalState((data) => {
            data.rmsStatus.audioSelect = audioSelect;
          }, `Select Audio TX${audioSelect === "tx1" ? "1" : "2"}`);
        }

        if (commandId === "rms-command-fan-auto" || commandId === "rms-command-fan-on" || commandId === "rms-command-fan-off") {
          const fanControl: DmeFanControlMode = commandId.endsWith("auto")
            ? "Automatic"
            : commandId.endsWith("-on")
              ? "On"
              : "Off";
          return updateOperationalState((data) => {
            data.rmsStatus.fanControl = fanControl;
            const fanOutput = data.digitalOutputs.find((row) => row.name === "Fan Control");
            if (fanOutput) fanOutput.status = fanControl === "Automatic" ? "Automatic - Off" : fanControl;
          }, `System Fan ${fanControl}`);
        }

        const spareOutputMatch = commandId.match(/^rms-command-spare-output-(\d+)-(high|low)$/);
        if (spareOutputMatch) {
          const outputNumber = Number(spareOutputMatch[1]);
          const outputState = spareOutputMatch[2] === "high" ? "High" : "Low";
          return updateOperationalState((data) => {
            const output = data.digitalOutputs.find((row) => row.name === `Spare Output ${outputNumber}`);
            if (output) output.status = outputState;
          }, `Spare Output ${outputNumber} ${outputState}`);
        }

        const bcpsCommandMatch = commandId.match(/^rms-command-bcps-(1|2)-(enable|disable)$/);
        if (bcpsCommandMatch) {
          const bcpsKey = bcpsCommandMatch[1] === "1" ? "bcps1" : "bcps2";
          const enabled = bcpsCommandMatch[2] === "enable";
          return updateOperationalState((data) => {
            data.bcpsChargerEnabled[bcpsKey] = enabled;
            const batteryCharger = data.digitalOutputs.find((row) => row.name === "Battery Charger");
            if (batteryCharger) {
              batteryCharger.status = data.bcpsChargerEnabled.bcps1 || data.bcpsChargerEnabled.bcps2 ? "On" : "Off";
            }
          }, `BCPS ${bcpsCommandMatch[1]} Charger ${enabled ? "Enable" : "Disable"}`);
        }

        const triggerSelection = resolveMonitorTriggerCommand(commandId);
        if (triggerSelection) {
          return updateOperationalState((data) => {
            data.monitorTrigger[triggerSelection.monitor === 1 ? "monitor1" : "monitor2"] = triggerSelection.source;
          }, `Monitor ${triggerSelection.monitor} Trigger ${triggerSelection.source}`);
        }

        if (commandId === "tx-command-ident-normal" || commandId === "tx-command-ident-off" || commandId === "tx-command-ident-continuous") {
          const mode = commandId.endsWith("normal") ? "normal" : commandId.endsWith("off") ? "off" : "continuous";
          const data = setIdentMode(state.data, mode);
          const configDraft = setIdentMode(state.configDraft, mode);
          set({ data, configDraft, lastCommand: `Transmitter Ident ${mode}` });
          recordAction({ kind: "control", controlId: commandId, label: `Transmitter Ident ${mode}`, input: { mode }, accepted: true, before });
          return true;
        }
        if (commandId === "rms-command-bcps-1-reset" || commandId === "rms-command-bcps-2-reset") {
          const data = structuredClone(state.data);
          if (commandId.endsWith("1-reset")) data.bcpsCommFaults.bcps1 = false;
          else data.bcpsCommFaults.bcps2 = false;
          set({ data, configDraft: structuredClone(data), lastCommand: commandId });
          recordAction({ kind: "control", controlId: commandId, label: commandId, accepted: true, before });
          return true;
        }
        if (commandId === "rms-command-reset-intrusion" || commandId === "rms-command-reset-smoke") {
          const data = structuredClone(state.data);
          data.alert = false;
          set({ data, configDraft: structuredClone(data), lastCommand: commandId });
          recordAction({ kind: "control", controlId: commandId, label: commandId, accepted: true, before });
          return true;
        }
        if (commandId === "rms-command-reset-rms"
          || commandId === "rms-command-reset-rms-cpu"
          || commandId === "rms-command-reset-station-hardware") {
          // A hardware reset returns operational state to the last backed-up
          // configuration.  It does not manufacture a new backup and always
          // leaves the station in the documented normal state.
          const persisted = state.configurationBackup ?? state.data;
          let data = restoreConfigForSession(persisted, state);
          data.local = false;
          data.rmsStatus.localControlMode = false;
          data.monitors.integral.bypass = false;
          data.monitors.standby.bypass = false;
          data.monitorTrigger = { monitor1: "Integral Delay", monitor2: "Integral Delay" };
          data.identMode = "normal";
          const selectedId: DmeTransmitterId = data.monitorTransmitterStatus.mainSelect === 2 ? "tx2" : "tx1";
          data = routeTransmitter(data, selectedId, "antenna");
          data.rmsStatus.localControlMode = false;
          data.rmsStatus.logonLevel = state.securityLevel;
          set({
            data,
            configDraft: structuredClone(data),
            configDirty: false,
            needBackup: false,
            specialTestRunning: false,
            diagnosticsRunning: false,
            diagnosticsMode: null,
            lastCommand: commandId === "rms-command-reset-rms-cpu"
              ? "Reset RMS CPU"
              : commandId === "rms-command-reset-station-hardware"
                ? "Reset Station Hardware"
                : "Reset RMS Hardware",
          });
          recordAction({ kind: "control", controlId: commandId, label: commandId === "rms-command-reset-rms-cpu" ? "Reset RMS CPU" : commandId === "rms-command-reset-station-hardware" ? "Reset Station Hardware" : "Reset RMS Hardware", accepted: true, before });
          return true;
        }
        set({ lastCommand: commandId });
        recordAction({ kind: "control", controlId: commandId, label: commandId, accepted: true, before });
        return true;
      },

      refreshLogs: () => {
        const state = get();
        if (state.securityLevel < 1 || state.loginDialogOpen) return false;
        set({ lastCommand: "RMS Logs Update" });
        return true;
      },

      resetLog: (kind) => {
        const state = get();
        if (state.securityLevel < 2 || state.loginDialogOpen) return false;
        const data = structuredClone(state.data);
        if (kind === "alarms") data.alarmLogs = [];
        else data.maintenanceLogs = [];
        set({ data, configDraft: structuredClone(data), lastCommand: `RMS ${kind} log reset` });
        return true;
      },

      setSpecialTestRunning: (running) => {
        const state = get();
        if (state.securityLevel < 3 || state.loginDialogOpen || !state.data.local) return false;
        set({ specialTestRunning: running, lastCommand: running ? "Monitor Special Tests Start" : "Monitor Special Tests Stop" });
        return true;
      },

      runDiagnostics: (mode) => {
        const state = get();
        if (state.loginDialogOpen || (mode === "full" ? state.securityLevel < 3 || !state.data.local : state.securityLevel < 2)) return false;
        set({ diagnosticsRunning: true, diagnosticsMode: mode, lastCommand: mode === "full" ? "Run Full Diagnostics" : "Run On Air Diagnostics" });
        return true;
      },

      cancelDiagnostics: () => set({ diagnosticsRunning: false, diagnosticsMode: null, lastCommand: "Cancel Diagnostics" }),

      nextView: () => {
        const state = get();
        const views = screenViewGroups[state.activeScreen]?.filter((viewId) => (
          viewId !== "rms-config-security-codes" || state.securityLevel >= 4
        ));
        if (!views || views.length < 2) return;
        const currentIndex = views.indexOf(state.activeView);
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % views.length;
        const nextView = views[nextIndex];
        const menuPath = state.activeMenuPath.length > 1
          ? [...state.activeMenuPath.slice(0, -1), nextView]
          : [nextView];
        const before = dmeEvidenceSnapshot(state);
        set({
          activeView: nextView,
          activeMenuPath: menuPath,
          attemptEvents: recordVisit(state.activeScreen, nextView, menuPath, nextView),
        });
        recordAction({ kind: "view", controlId: nextView, menuPath, label: nextView, accepted: true, before });
      },

      closeScreen: () => {
        const before = dmeEvidenceSnapshot(get());
        set({
          activeScreen: "home",
          activeView: "home",
          activeMenuPath: ["Home"],
          attemptEvents: recordVisit("home", "home", ["Home"], "Home"),
        });
        recordAction({ kind: "view", controlId: "home", menuPath: ["Home"], label: "Home", accepted: true, before });
      },

      openScreen: (screenId, menuPath, title) => {
        const viewId = defaultViews[screenId];
        const before = dmeEvidenceSnapshot(get());
        set({
          activeScreen: screenId,
          activeView: viewId,
          activeMenuPath: [...menuPath],
          attemptEvents: recordVisit(screenId, viewId, menuPath, title),
        });
        recordAction({ kind: "view", controlId: viewId, menuPath, label: title, accepted: true, before });
      },

      openView: (screenId, viewId, menuPath, title) => {
        const before = dmeEvidenceSnapshot(get());
        set({
          activeScreen: screenId,
          activeView: viewId,
          activeMenuPath: [...menuPath],
          attemptEvents: recordVisit(screenId, viewId, menuPath, title),
        });
        recordAction({ kind: "view", controlId: viewId, menuPath, label: title, accepted: true, before });
      },

      setOverride: (fieldId, value, status) => {
        const override: DmeFieldOverride = { fieldId, value, ...(status ? { status } : {}) };
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
        const checkpoint: DmeExpectedCheckpoint = {
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
        const before = dmeEvidenceSnapshot(state);
        const event: DmeAttemptEvent = {
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

      updateAnswer: (changes) =>
        set((state) => ({ answer: { ...state.answer, ...changes } })),

      reset: () => set(initialState()),
    };
  });
}

export const useDmePmdtStore = createDmePmdtStore();

