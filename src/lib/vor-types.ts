export const VOR_INDICATOR_COLORS = ["green", "yellow", "red", "gray"] as const;
export type VorIndicatorColor = (typeof VOR_INDICATOR_COLORS)[number];

export const VOR_PARAMETER_STATUSES = ["normal", "warning", "alarm"] as const;
export type VorParameterStatus = (typeof VOR_PARAMETER_STATUSES)[number];

export type VorPmdtMode = "preview" | "author" | "student";
export type VorEditableValue = string | number | boolean | null;
export type VorSubmissionStatus = "draft" | "submitted" | "reviewed";

export type VorScreenId =
  | "home"
  | "rms-data"
  | "rms-logs"
  | "monitor-data"
  | "monitor-config"
  | "monitor-1-offsets"
  | "monitor-2-offsets"
  | "tx-data"
  | "tx-config"
  | "disabled";

export type VorViewId =
  | "home"
  | "rms-maintenance-alerts"
  | "rms-digital-io"
  | "rms-logs-alarms"
  | "rms-logs-maintenance"
  | "monitor-integral"
  | "monitor-sideband-vswr"
  | "monitor-alarm-limits"
  | "monitor-1-offsets"
  | "monitor-2-offsets"
  | "tx-data-main"
  | "tx-status-1"
  | "tx-config-nominal"
  | "tx-config-offsets"
  | "disabled";

export interface VorMenuItem {
  id: string;
  label: string;
  enabled: boolean;
  screenId?: VorScreenId;
  children?: readonly VorMenuItem[];
}

export interface VorMenuGroup {
  id: string;
  label: string;
  items: readonly VorMenuItem[];
}

export interface VorTransmitterSidebarState {
  main: VorIndicatorColor;
  antenna: VorIndicatorColor;
  load: VorIndicatorColor;
  off: VorIndicatorColor;
}

export interface VorSidebarParameter {
  value: number;
  status: VorParameterStatus;
}

export interface VorGeneralAlert {
  id: string;
  label: string;
  checked: boolean;
}

export interface VorMonitorAgenAlert {
  label: string;
  mon1: boolean;
  mon2: boolean;
  agen1: boolean;
  agen2: boolean;
}

export interface VorDigitalInput {
  name: string;
  configuration: string;
  status: string;
}

export interface VorDigitalOutput {
  name: string;
  status: string;
  altStatus?: string;
}

export interface VorDualIndicatorRow {
  name: string;
  tx1: VorIndicatorColor;
  tx2: VorIndicatorColor;
}

export interface VorAlarmLogEntry {
  timeTag: string;
  type: string;
  alarm: string;
  state: "Normal" | "Alarm";
}

export interface VorMaintenanceLogEntry {
  timeTag: string;
  type: string;
  alert: string;
  state: "Normal" | "Alert";
}

export interface VorIntegralDataRow {
  label: string;
  mon1Value: string;
  mon1Status: VorIndicatorColor;
  mon2Value: string;
  mon2Status: VorIndicatorColor;
  unit: string;
}

export interface VorAlarmLimitRow {
  parameter: string;
  alarmLow: number;
  preAlarmLow: number;
  nominal: number;
  preAlarmHigh: number;
  alarmHigh: number;
  unit: string;
}

export interface VorMonitorOffsetRow {
  parameter: string;
  integral: number | null;
  standby: number | null;
  testGen: number | null;
  unit: string;
}

export interface VorMonitorAntennaConfig {
  monitor: 1 | 2;
  enabled: boolean;
  inputAttenuation: number;
  azimuthAngle: number;
}

export interface VorTxDualValueRow {
  parameter: string;
  tx1: number;
  tx2: number;
  unit: string;
}

export interface VorTxFrequencyRow {
  parameter: string;
  value1: number;
  value2: number | null;
  unit: string;
}

export interface VorTxVswrRow {
  parameter: string;
  value: number;
}

export interface VorIndicatorAlert {
  label: string;
  indicator: VorIndicatorColor;
}

export interface VorTxConfigNominal {
  audioGenParams: {
    azimuthIndex: number;
    outputPower: number;
    voiceModulation: number;
    identModulation: number;
    referenceModulation: number;
    sboRfLevel: number;
  };
  ident: { mainIdentCode: string; standbyIdentCode: string };
  keyerInput: {
    mode: "disabled" | "external";
    keyerInputLevel: string;
    windowedKeyingInput: boolean;
    selfKeyOnLoss: boolean;
    shutdownOnLoss: boolean;
    restartWhenResumed: boolean;
  };
  keyerOutput: { externalKeying: string; suppressOnShutdown: boolean };
}

export interface VorPmdtData {
  connected: boolean;
  alert: boolean;
  local: boolean;
  timestamp: string;
  transmitters: {
    tx1: VorTransmitterSidebarState;
    tx2: VorTransmitterSidebarState;
  };
  monitorIntegral: {
    normal: boolean;
    priAlarm: boolean;
    secAlarm: boolean;
    bypass: boolean;
  };
  sidebarParams: Record<string, VorSidebarParameter>;
  generalAlerts: VorGeneralAlert[];
  monitorAgenAlerts: VorMonitorAgenAlert[];
  digitalInputs: VorDigitalInput[];
  digitalOutputs: VorDigitalOutput[];
  systemPowerStatus: VorDualIndicatorRow[];
  txAlerts: VorDualIndicatorRow[];
  alarmLogs: VorAlarmLogEntry[];
  maintenanceLogs: VorMaintenanceLogEntry[];
  integralData: VorIntegralDataRow[];
  vswrData: number[];
  alarmLimits: VorAlarmLimitRow[];
  monitorAzimuthLimits: { preAlarm: number; alarm: number };
  monitorTimers: {
    shutdown: number;
    continuousIdent: number;
    noIdent: number;
  };
  monitorAntennas: VorMonitorAntennaConfig[];
  monitorOffsets: VorMonitorOffsetRow[];
  txPower: VorTxDualValueRow[];
  txFrequency: VorTxFrequencyRow[];
  txVswr: VorTxVswrRow[];
  txSystemAlerts: VorIndicatorAlert[];
  txCarrierPaAlerts: VorIndicatorAlert[];
  txSynthesizerAlerts: VorIndicatorAlert[];
  txSidebandPaAlerts: VorIndicatorAlert[];
  txConfigNominal: VorTxConfigNominal;
  txOffsets: VorTxDualValueRow[];
}

export interface VorFieldOverride {
  fieldId: string;
  value: VorEditableValue;
  status?: VorIndicatorColor | VorParameterStatus;
}

export interface VorExpectedCheckpoint {
  id: string;
  order: number;
  viewId: Exclude<VorViewId, "disabled">;
  menuPath: string[];
  title: string;
  guidance: string;
  required: boolean;
  points: number;
}

export interface VorScenario {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  prompt: string;
  createdAt: string;
  updatedAt?: string;
  overrides: VorFieldOverride[];
  expectedCheckpoints: VorExpectedCheckpoint[];
}

export interface VorAttemptEvent {
  id: string;
  sequence: number;
  screenId: VorScreenId;
  viewId: VorViewId;
  menuPath: string[];
  title: string;
  visitedAt: string;
  annotation: string;
}

export interface VorStudentAnswer {
  suspectedFault: string;
  reasoning: string;
  remediation: string;
}

export interface VorSubmission {
  id: string;
  scenarioId: string;
  studentName: string;
  studentCode: string;
  status: VorSubmissionStatus;
  startedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  events: VorAttemptEvent[];
  answer: VorStudentAnswer;
  score?: number;
  examinerComment?: string;
}
