import type { HardwareDiagnosisAnswer, HardwareDiagnosisTask } from "./equipment-diagram-types";
import type { ScenarioActionEvent, ScenarioResolution } from "./scenario-evidence";

export const VOR_INDICATOR_COLORS = ["green", "yellow", "red", "gray"] as const;
export type VorIndicatorColor = (typeof VOR_INDICATOR_COLORS)[number];

export const VOR_PARAMETER_STATUSES = ["normal", "warning", "alarm"] as const;
export type VorParameterStatus = (typeof VOR_PARAMETER_STATUSES)[number];

export type VorPmdtMode = "preview" | "author" | "student";
export type VorSecurityLevel = 0 | 1 | 3 | 4;
export type VorEditableValue = string | number | boolean | null;
export type VorSubmissionStatus = "draft" | "submitted" | "reviewed";

export type VorScreenId =
  | "home"
  | "rms-status"
  | "rms-data"
  | "rms-logs"
  | "rms-config"
  | "monitor-data"
  | "monitor-config"
  | "monitor-test-results"
  | "monitor-fault-history"
  | "monitor-1-offsets"
  | "monitor-2-offsets"
  | "tx-data"
  | "tx-config"
  | "diagnostics"
  | "disabled";

export type VorViewId =
  | "home"
  | "rms-status-main"
  | "rms-status-monitor-tx"
  | "rms-status-software"
  | "rms-status-hardware"
  | "rms-logs-operational-summary"
  | "rms-logs-commands"
  | "rms-logs-parameters"
  | "rms-maintenance-alerts"
  | "rms-digital-io"
  | "rms-power-supply"
  | "rms-temperature"
  | "rms-ad-data"
  | "rms-logs-alarms"
  | "rms-logs-maintenance"
  | "rms-config-general"
  | "rms-config-station"
  | "rms-config-power-limits"
  | "rms-config-ad-limits"
  | "monitor-integral"
  | "monitor-status"
  | "monitor-sideband-vswr"
  | "monitor-notch"
  | "monitor-alarm-limits"
  | "monitor-config-general"
  | "monitor-test-results"
  | "monitor-fault-history"
  | "monitor-1-offsets"
  | "monitor-2-offsets"
  | "tx-data-main"
  | "tx-ground-check-1"
  | "tx-ground-check-2"
  | "tx-status-1"
  | "tx-status-2"
  | "tx-config-nominal"
  | "tx-config-offsets"
  | "diagnostics-power-up"
  | "diagnostics-fault-isolation"
  | "disabled";

export interface VorMenuItem {
  id: string;
  label: string;
  enabled: boolean;
  checked?: boolean;
  screenId?: VorScreenId;
  viewId?: VorViewId;
  action?: "open-config" | "open-about" | "open-login" | "logoff" | "config-restore" | "config-backup" | "set-transmitter-mode";
  transmitterId?: "tx1" | "tx2";
  transmitterMode?: "main" | "load" | "off";
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
  secondAntennaEnabled?: boolean;
  secondInputAttenuation?: number;
  secondAzimuthAngle?: number;
}

export interface VorTxDualValueRow {
  parameter: string;
  tx1: number;
  tx2: number;
  unit: string;
}

export interface VorTxFrequencyRow {
  parameter: string;
  value1: number | null;
  value2: number | null;
  unit: string;
}

export interface VorTxVswrRow {
  parameter: string;
  value1: number | null;
  value2: number | null;
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

export interface VorRmsVoltageRow {
  parameter: string;
  low: number;
  preLow: number;
  volts: number;
  preHigh: number;
  high: number;
}

export interface VorRmsCurrentRow {
  parameter: string;
  low: number;
  preLow: number;
  amps: number;
  preHigh: number;
  high: number;
}

export interface VorRmsTemperatureRow {
  parameter: string;
  low: number | null;
  preLow: number | null;
  value: number;
  preHigh: number;
  high: number;
}

export interface VorRmsAdDataRow {
  parameter: string;
  low: number;
  preLow: number;
  volts: number;
  preHigh: number;
  high: number;
}

export interface VorRmsConfigGeneral {
  monitorIntegrityTestsEnabled: boolean;
  votingLogic: "OR" | "AND";
  transfer: string;
  automaticRestartsEnabled: boolean;
  firstRestartDelay: number;
  numberOfAutomaticRestarts: number;
  rcsuPresent: boolean;
  rcsuConnectionType: string;
  spiFilterType: string;
  coLocatedType: string;
  smokeAlarmInstalled: boolean;
  intrusionAlarmInstalled: boolean;
  exitDelay: number;
  entryDelay: number;
  remoteResetEnabledSmoke: boolean;
  remoteResetEnabledIntrusion: boolean;
  spareInputs: string[];
  rmmConnectionType: string;
  dialInRings: number;
  dialOutOnStatusChange: string;
  dialOutPhoneNumber: string;
  toneDialOut: boolean;
}

export interface VorRmsConfigStation {
  stationType: "CVOR" | "DVOR";
  transmitterConfig: "Dual Transmitters" | "Single Transmitter";
  monitorConfig: "Dual Monitors" | "Single Monitor";
  stationDescription: string;
  transmitterFrequency: string;
}

export interface VorRmsStatus {
  logonLevel: number;
  softwareRevisionTimestamp: string;
  hardwareRevisionTimestamp: string;
  localControlMode: boolean;
  maintenanceAlert: boolean;
  onBattery: boolean;
  acFailure: boolean;
  remoteControlEnabled: boolean;
  groundCheckRunning: boolean;
  holdCommutatorEnabled: boolean;
  rcsuConnectionEnabled: boolean;
  rcsuCommunicationError: boolean;
}

export interface VorRmsMonitorStatusRow {
  name: "Integral" | "Standby";
  bypass: boolean;
  primaryAlarm: boolean;
  secondaryAlarm: boolean;
  primaryMismatch: boolean;
  secondaryMismatch: boolean;
}

export interface VorRmsMonitorTransmitterStatus {
  monitorAlarmShutdown: boolean;
  enabledMonitors: { monitor1: boolean; monitor2: boolean };
  monitors: VorRmsMonitorStatusRow[];
  antennaSelect: 1 | 2;
  mainSelect: 1 | 2;
  transmitterOn: { tx1: boolean; tx2: boolean };
}

export interface VorSoftwareRevisionRow {
  component: string;
  revision: string;
}

export interface VorHardwareRevisionRow {
  module: string;
  partNumber: string;
  revision: string;
  serialNumber: string;
  notes: string;
}

export interface VorRmsOperationalSummaryRow {
  parameter: string;
  tx1: number;
  tx2: number;
  unit: string;
}

export interface VorRmsOperationalSummary {
  rows: VorRmsOperationalSummaryRow[];
  availabilityTx1: number;
  availabilityTx2: number;
  startTime: string;
  endTime: string;
  hoursElapsed: number;
}

export interface VorRmsCommandLogEntry {
  timeTag: string;
  userName: string;
  command: string;
}

export interface VorRmsParameterLogEntry {
  timeTag: string;
  userName: string;
  file: string;
}

export interface VorMonitorConfigGeneralRow {
  parameter: string;
  primary: boolean;
  secondary: boolean;
  isCheckbox?: boolean;
  checked?: boolean;
}

export interface VorNotchMonitorRow {
  antenna: number;
  baseline: number;
  mon1: number;
  mon2: number;
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

  // Missing PMDT Screens Data
  rmsVoltageData: VorRmsVoltageRow[];
  rmsCurrentData: VorRmsCurrentRow[];
  bcpsCommFaults: { bcps1: boolean; bcps2: boolean };
  rmsTemperatureData: VorRmsTemperatureRow[];
  rmsAdData: VorRmsAdDataRow[];
  rmsConfigGeneral: VorRmsConfigGeneral;
  rmsConfigStation: VorRmsConfigStation;
  rmsStatus: VorRmsStatus;
  rmsMonitorTransmitterStatus: VorRmsMonitorTransmitterStatus;
  softwareRevisions: VorSoftwareRevisionRow[];
  hardwareRevisions: VorHardwareRevisionRow[];
  rmsOperationalSummary: VorRmsOperationalSummary;
  rmsCommandLogs: VorRmsCommandLogEntry[];
  rmsParameterLogs: VorRmsParameterLogEntry[];
  monitorConfigGeneral: VorMonitorConfigGeneralRow[];
  notchData: VorNotchMonitorRow[];
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
  hardwareTask?: HardwareDiagnosisTask;
}

export interface VorAttemptEvent {
  id: string;
  sequence: number;
  eventType?: "view" | "sidebar";
  screenId: VorScreenId;
  viewId: VorViewId;
  menuPath: string[];
  title: string;
  visitedAt: string;
  annotation: string;
  fieldId?: string;
  resultValue?: VorEditableValue;
  resultStatus?: VorIndicatorColor | VorParameterStatus;
}

export interface VorStudentAnswer {
  suspectedFault: string;
  reasoning: string;
  remediation: string;
}

export interface VorSubmission {
  id: string;
  scenarioId: string;
  userId: string;
  studentName: string;
  workUnit: string;
  status: VorSubmissionStatus;
  startedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  events: VorAttemptEvent[];
  /** Technical PMDT audit trail; unlike editable journal annotations it is append-only during the session. */
  actionHistory?: ScenarioActionEvent[];
  resolution?: ScenarioResolution;
  answer: VorStudentAnswer;
  hardwareAnswer?: HardwareDiagnosisAnswer;
  score?: number;
  examinerComment?: string;
}
