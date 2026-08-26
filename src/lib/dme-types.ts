import type { HardwareDiagnosisAnswer, HardwareDiagnosisTask } from "./equipment-diagram-types";

export const DME_INDICATOR_COLORS = ["green", "yellow", "red", "gray"] as const;
export type DmeIndicatorColor = (typeof DME_INDICATOR_COLORS)[number];

export const DME_PARAMETER_STATUSES = ["normal", "warning", "alarm"] as const;
export type DmeParameterStatus = (typeof DME_PARAMETER_STATUSES)[number];

export type DmePmdtMode = "preview" | "author" | "student";
/**
 * PMDT security levels documented by the 1118A/1119A operations manual.
 * Level 0 is the pre-login state; Levels 1-4 match the RMS permission model.
 */
export type DmeSecurityLevel = 0 | 1 | 2 | 3 | 4;
export type DmeAccountSecurityLevel = Exclude<DmeSecurityLevel, 0>;
export type DmeTransmitterId = "tx1" | "tx2";
export type DmeTransmitterMode = "antenna" | "load" | "off";
export type DmeFanControlMode = "Automatic" | "On" | "Off";
export type DmeMonitorTriggerSource =
  | "Integral Delay"
  | "Integral Delay - Normal"
  | "Integral Delay - 1st Pulse Delay"
  | "Integral Delay - 2nd Pulse Delay"
  | "Integral Delay - Interrogation Spacing"
  | "Integral Delay - Reply Spacing"
  | "Standby Delay"
  | "Standby Delay - Normal"
  | "Standby Delay - 1st Pulse Delay"
  | "Standby Delay - 2nd Pulse Delay"
  | "Standby Delay - Interrogation Spacing"
  | "Standby Delay - Reply Spacing"
  | "Integral Efficiency"
  | "Reflected Power"
  | "Forward Power";
export type DmeEditableValue = string | number | boolean | null;
export type DmeSubmissionStatus = "draft" | "submitted" | "reviewed";

/**
 * Session-only physical stimuli used by examiner-controlled scenarios.
 * These values are deliberately separate from the persisted PMDT
 * configuration so an injected fault cannot leak into the operator profile.
 */
export interface Dme1119aSimulationFaults {
  transmitters: Record<DmeTransmitterId, {
    powerLossDb: number;
    replyDelayDriftUs: number;
    pulseSpacingDriftUs: number;
    frequencyErrorPpm: number;
    hpaFault: boolean;
    rtcCommFault: boolean;
    antennaVswr: number | null;
  }>;
  identSignal: "normal" | "missing" | "continuous";
  temperature: Record<string, number | null>;
  acPowerFailed: boolean;
}

export type DmeScreenId =
  | "home"
  | "rms-status"
  | "rms-data"
  | "rms-logs"
  | "rms-config"
  | "monitor-data"
  | "monitor-config"
  | "monitor-special-tests"
  | "monitor-fault-history"
  | "monitor-1-test-results"
  | "monitor-2-test-results"
  | "monitor-1-offsets"
  | "monitor-2-offsets"
  | "monitor-1-data"
  | "monitor-2-data"
  | "monitor-1-calibration"
  | "monitor-2-calibration"
  | "tx-data"
  | "tx-config"
  | "diagnostics"
  | "disabled";

export type DmeViewId =
  | "home"
  | "rms-status-main"
  | "rms-status-monitor-tx"
  | "rms-maintenance-alerts"
  | "rms-power-supply"
  | "rms-ad-data"
  | "rms-digital-io"
  | "rms-logs-alarms"
  | "rms-logs-maintenance"
  | "rms-logs-operational-summary"
  | "rms-logs-command-activity"
  | "rms-logs-parameter-change"
  | "rms-config-general"
  | "rms-config-station"
  | "rms-config-power-limits"
  | "rms-config-ad-limits"
  | "rms-config-security-codes"
  | "monitor-integral"
  | "monitor-standby"
  | "monitor-config-general"
  | "monitor-alarm-limits"
  | "monitor-special-tests"
  | "monitor-fault-history"
  | "monitor-1-test-alarm-limits"
  | "monitor-1-test-interrogator"
  | "monitor-1-test-transponder"
  | "monitor-1-decoder-results"
  | "monitor-2-test-alarm-limits"
  | "monitor-2-test-interrogator"
  | "monitor-2-test-transponder"
  | "monitor-2-decoder-results"
  | "monitor-1-offsets"
  | "monitor-2-offsets"
  | "monitor-1-data-detail-integral"
  | "monitor-1-data-detail-standby"
  | "monitor-1-data-detail-maintenance"
  | "monitor-1-data-detail-status"
  | "monitor-2-data-detail-integral"
  | "monitor-2-data-detail-standby"
  | "monitor-2-data-detail-maintenance"
  | "monitor-2-data-detail-status"
  | "monitor-1-calibration"
  | "monitor-2-calibration"
  | "tx-data-main"
  | "tx-rtc-data"
  | "tx-config-nominal"
  | "tx-config-offsets"
  | "tx-config-integral-monitor"
  | "tx-config-standby-monitor"
  | "diagnostics-power-up"
  | "diagnostics-fault-isolation"
  | "disabled";

export interface DmeMenuItem {
  id: string;
  label: string;
  enabled: boolean;
  screenId?: DmeScreenId;
  viewId?: DmeViewId;
  action?:
    | "open-config"
    | "open-about"
    | "open-password-dialog"
    | "open-login"
    | "logoff"
    | "config-save"
    | "config-load"
    | "config-print"
    | "config-backup"
    | "config-restore"
    | "set-transmitter-mode"
    | "set-delay-mode"
    | "set-monitor-bypass"
    | "rms-command";
  transmitterId?: "tx1" | "tx2";
  transmitterMode?: "antenna" | "load" | "off";
  monitorId?: "integral" | "standby";
  bypassEnabled?: boolean;
  delayMode?: "automatic" | "fixed";
  checked?: boolean;
  children?: readonly DmeMenuItem[];
}

export interface DmeMenuGroup {
  id: string;
  label: string;
  items: readonly DmeMenuItem[];
}

export interface DmeTransmitterSidebarState {
  main: DmeIndicatorColor;
  antenna: DmeIndicatorColor;
  load: DmeIndicatorColor;
  off: DmeIndicatorColor;
}

export interface DmeMonitorSidebarState {
  normal: boolean;
  priAlarm: boolean;
  secAlarm: boolean;
  bypass: boolean;
}

export interface DmeSidebarParameter {
  value: number;
  status: DmeParameterStatus;
  digits: number;
}

export interface DmeDualValueRow {
  label: string;
  mon1Value: string;
  mon1Status: DmeIndicatorColor | DmeParameterStatus;
  mon2Value: string;
  mon2Status: DmeIndicatorColor | DmeParameterStatus;
  unit: string;
}

export interface DmeAlarmLogEntry {
  timeTag: string;
  type: string;
  alarm: string;
  state: "Normal" | "Pre-Alarm" | "Primary Alarm Low" | "Alarm";
}

export interface DmeMaintenanceLogEntry {
  timeTag: string;
  type: string;
  alert: string;
  state: "Normal" | "Pre-Alert" | "Alert";
}

export interface DmeAlarmLimitRow {
  parameter: string;
  alarmLow: number | null;
  preAlarmLow: number | null;
  nominal: number;
  preAlarmHigh: number | null;
  alarmHigh: number | null;
  unit: string;
}

export interface DmeDecoderResultRow {
  parameter: string;
  lowLimit: number;
  data: number;
  highLimit: number;
  unit: string;
  result: "Updated" | "In Process";
}

export interface DmeMonitorOffsetRow {
  parameter: string;
  integral: number | null;
  standby: number | null;
  unit: string;
}

export interface DmePaStatusRow {
  name: string;
  vswr: DmeIndicatorColor;
  longPulseFault: DmeIndicatorColor;
  powerSupply: DmeIndicatorColor;
  outputPower: DmeIndicatorColor;
  rmsTemperature: DmeIndicatorColor;
  userEnabled: DmeIndicatorColor;
  rmsRtcEnabled: DmeIndicatorColor;
  control: "On" | "Off";
}

export interface DmeRtcMaintenanceAlertRow {
  label: string;
  tx1: DmeIndicatorColor;
  tx2: DmeIndicatorColor;
}

export interface DmeTrafficLoadRow {
  band: string;
  tx1: number;
  tx2: number;
}

export interface DmeTxConfigNominal {
  rtcParameters: {
    powerOutput: number;
    minimumSquitter: number;
    maximumPrf: number;
    ldesWindow: number;
    ldesThreshold: number;
    deadTime: number;
    replyDelayOffset: number;
    rxSensitivity: number;
    nominalPropagationDelay: number;
    maxPropagationVariance: number;
    standbyPropagationOffset: number;
  };
  operation: {
    timing: "1st Pulse" | "2nd Pulse";
    squitterEnabled: boolean;
    sdesEnabled: boolean;
    ldesEnabled: boolean;
    equalizationPulsesEnabled: boolean;
  };
  powerAmplifiers: {
    lowOutputPowerAlertLimit: number;
    hpa1Enabled: boolean;
    hpa2Enabled: boolean;
  };
  ident: {
    keyerIo: "Active High/Open" | "Active Low/Ground";
    windowedKeying: boolean;
    keyerSource: "External Keying" | "Internal Keying";
    selfKeyOnLoss: boolean;
    shutdownOnLoss: boolean;
    restartWhenSignalResumes: boolean;
    primaryIdentCode: string;
    secondaryIdentEnabled: boolean;
    secondaryIdentCode: string;
    standbyIdent: "Same as Main Ident" | "Secondary Ident" | "Disabled";
  };
}

export interface DmeDigitalInput {
  name: string;
  configuration: string;
  status: string;
}

export interface DmeDigitalOutput {
  name: string;
  status: string;
  altStatus?: string;
}

export interface DmeDualIndicatorRow {
  name: string;
  tx1: DmeIndicatorColor;
  tx2: DmeIndicatorColor;
}

export interface DmeRmsVoltageRow {
  parameter: string;
  enabled: boolean;
  low: number;
  preLow: number;
  volts: number;
  preHigh: number;
  high: number;
}

export interface DmeRmsCurrentRow {
  parameter: string;
  enabled: boolean;
  low: number;
  preLow: number;
  amps: number;
  preHigh: number;
  high: number;
}

export interface DmeRmsTemperatureRow {
  parameter: string;
  enabled: boolean;
  low: number | null;
  preLow: number | null;
  value: number;
  preHigh: number;
  high: number;
}

export interface DmeRmsAdDataRow {
  parameter: string;
  enabled: boolean;
  low: number;
  preLow: number;
  volts: number;
  preHigh: number;
  high: number;
}

export interface DmeRmsConfigGeneral {
  monitorIntegrityTestsEnabled: boolean;
  votingLogic: "OR" | "AND";
  transfer: string;
  automaticRestartsEnabled: boolean;
  firstRestartDelay: number;
  numberOfAutomaticRestarts: number;
  rcsuPresent: boolean;
  rcsuConnectionType: string;
  interlockControl: "Not Applicable" | "External Interlock Input" | "From RCSU";
  spiFilterType: string;
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

export interface DmeRmsConfigStation {
  powerLevel: "Low Power" | "High Power";
  transmitterConfig: "Dual Transmitters" | "Single Transmitter";
  monitorConfig: "Dual Monitors" | "Single Monitor";
  hotStandby: boolean;
  channelType: "X" | "Y";
  channelNumber: number;
  stationDescription: string;
}

export interface DmeSecurityAccount {
  userId: string;
  password: string;
  securityLevel: DmeAccountSecurityLevel;
}

export interface DmeMonitorConfigGeneralRow {
  parameter: string;
  primary: boolean;
  secondary: boolean;
  isCheckbox?: boolean;
  checked?: boolean;
}

export interface DmeMonitorCalibrationRow {
  parameter: string;
  baseline: number;
  actual: number;
  offset: number;
  scale: number;
  unit: string;
}

export interface DmePmdtData {
  connected: boolean;
  alert: boolean;
  /** Explicit simulator alert override; derived monitor alarms remain separate. */
  manualAlertOverride: boolean;
  /** Session-only examiner stimuli; never extracted into simulator-config. */
  simulationFaults: Dme1119aSimulationFaults;
  local: boolean;
  timestamp: string;
  transmitters: { tx1: DmeTransmitterSidebarState; tx2: DmeTransmitterSidebarState };
  monitors: { integral: DmeMonitorSidebarState; standby: DmeMonitorSidebarState };
  sidebarParams: Record<"delay" | "spacing" | "txPower" | "erp" | "efficiency" | "prf", DmeSidebarParameter>;
  rmsStatus: {
    logonLevel: number;
    localControlMode: boolean;
    maintenanceAlert: boolean;
    onBattery: boolean;
    acFailure: boolean;
    remoteControlEnabled: boolean;
    interlocked: boolean;
    rcsuConnectionEnabled: boolean;
    rcsuCommunicationError: boolean;
    approachType: string;
    audioSelect: DmeTransmitterId;
    fanControl: DmeFanControlMode;
  };
  revisionLevels: Record<"rms" | "monitor1" | "monitor2" | "rtc1" | "rtc2" | "bcps1" | "bcps2" | "lcu", string>;
  monitorTransmitterStatus: {
    monitorAlarmShutdown: boolean;
    enabledMonitors: { monitor1: boolean; monitor2: boolean };
    antennaSelect: 1 | 2;
    mainSelect: 1 | 2;
    transmitterOn: { tx1: boolean; tx2: boolean };
  };
  monitorTrigger: { monitor1: DmeMonitorTriggerSource; monitor2: DmeMonitorTriggerSource };
  identMode: "normal" | "off" | "continuous";
  alarmLogs: DmeAlarmLogEntry[];
  maintenanceLogs: DmeMaintenanceLogEntry[];
  integralData: DmeDualValueRow[];
  standbyData: DmeDualValueRow[];
  alarmLimits: DmeAlarmLimitRow[];
  monitorTimers: {
    integralShutdownDelay: number;
    standbyShutdownDelay: number;
    continuousIdent: number;
    noIdent: number;
  };
  monitorSystemSettings: {
    efficiencyCertificationLevel: number;
    monitor1ReplyAttenuation: number;
    monitor2ReplyAttenuation: number;
    directionalCouplerLoss: number;
  };
  decoderResults: { monitor1: DmeDecoderResultRow[]; monitor2: DmeDecoderResultRow[] };
  monitorOffsets: { monitor1: DmeMonitorOffsetRow[]; monitor2: DmeMonitorOffsetRow[] };
  paStatus: DmePaStatusRow[];
  txStatus: {
    commFault: { tx1: boolean; tx2: boolean };
    maintenanceAlert: { tx1: boolean; tx2: boolean };
  };
  rtcMaintenanceAlerts: DmeRtcMaintenanceAlertRow[];
  rtcStatus: {
    commFault: { tx1: boolean; tx2: boolean };
    overload: { tx1: boolean; tx2: boolean };
    cpuShutdown: { tx1: string; tx2: string };
  };
  trafficLoad: DmeTrafficLoadRow[];
  delayControl: {
    rtc1: { low: number; propagationDelay: number; high: number; fixed: boolean };
    rtc2: { low: number; propagationDelay: number; high: number; fixed: boolean };
  };
  txConfigNominal: DmeTxConfigNominal;
  txOffsets: Array<{ parameter: string; tx1: number; tx2: number; unit: string }>;

  // Missing PMDT Screens Data
  rmsVoltageData: DmeRmsVoltageRow[];
  rmsCurrentData: DmeRmsCurrentRow[];
  bcpsCommFaults: { bcps1: boolean; bcps2: boolean };
  bcpsChargerEnabled: { bcps1: boolean; bcps2: boolean };
  rmsTemperatureData: DmeRmsTemperatureRow[];
  rmsAdData: DmeRmsAdDataRow[];
  rmsConfigGeneral: DmeRmsConfigGeneral;
  rmsConfigStation: DmeRmsConfigStation;
  securityAccounts: DmeSecurityAccount[];
  monitorConfigGeneral: DmeMonitorConfigGeneralRow[];
  monitorCalibrationData: { monitor1: DmeMonitorCalibrationRow[]; monitor2: DmeMonitorCalibrationRow[] };
  monitorDetailData: { monitor1: DmeDualValueRow[]; monitor2: DmeDualValueRow[] };
  digitalInputs: DmeDigitalInput[];
  digitalOutputs: DmeDigitalOutput[];
  systemPowerStatus: DmeDualIndicatorRow[];
  txAlerts: DmeDualIndicatorRow[];
}

export interface DmeFieldOverride {
  fieldId: string;
  value: DmeEditableValue;
  status?: DmeIndicatorColor | DmeParameterStatus;
}

export interface DmeExpectedCheckpoint {
  id: string;
  order: number;
  viewId: Exclude<DmeViewId, "disabled">;
  menuPath: string[];
  title: string;
  guidance: string;
  required: boolean;
  points: number;
}

export interface DmeScenario {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  prompt: string;
  createdAt: string;
  updatedAt?: string;
  overrides: DmeFieldOverride[];
  expectedCheckpoints: DmeExpectedCheckpoint[];
  hardwareTask?: HardwareDiagnosisTask;
}

export interface DmeAttemptEvent {
  id: string;
  sequence: number;
  eventType?: "view" | "sidebar";
  screenId: DmeScreenId;
  viewId: DmeViewId;
  menuPath: string[];
  title: string;
  visitedAt: string;
  annotation: string;
  fieldId?: string;
  resultValue?: DmeEditableValue;
  resultStatus?: DmeIndicatorColor | DmeParameterStatus;
}

export interface DmeStudentAnswer {
  suspectedFault: string;
  reasoning: string;
  remediation: string;
}

export interface DmeSubmission {
  id: string;
  scenarioId: string;
  userId: string;
  studentName: string;
  workUnit: string;
  status: DmeSubmissionStatus;
  startedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  events: DmeAttemptEvent[];
  answer: DmeStudentAnswer;
  hardwareAnswer?: HardwareDiagnosisAnswer;
  score?: number;
  examinerComment?: string;
}
