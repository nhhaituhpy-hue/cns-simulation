export type Dme320ChannelSuffix = "X" | "Y";
export type Dme320TransponderId = "tx1" | "tx2";
export type Dme320MonitorId = "mon1" | "mon2";
export type Dme320MonitorChannel = "executive" | "standby";
export type Dme320KeylockMode = "LOCAL" | "REM" | "MAINT";
export type Dme320ControlOrigin = "local" | "remote";
export type Dme320SecurityLevel = 0 | 1 | 2 | 3;
export type Dme320MonitorMode = "auto" | "bypass";
export type Dme320IdentKeyingMode = "on" | "off" | "continuous";
export type Dme320ShutdownCause = "monitor" | "thermal" | "power" | "communication";
export type Dme320VotingLogic = "AND" | "OR";
export type Dme320AlarmClassification = "primary" | "secondary";
export type Dme320AlarmPhase = "normal" | "warning" | "pending" | "active";
export type Dme320OverallStatus =
  | "normal"
  | "warning"
  | "alarm"
  | "inactive"
  | "unplugged";

export interface Dme320Channel {
  number: number;
  suffix: Dme320ChannelSuffix;
}

export interface Dme320ChannelAllocation {
  channel: Dme320Channel;
  interrogationFrequencyMhz: number;
  replyFrequencyMhz: number;
  interrogationSpacingUs: number;
  replySpacingUs: number;
  nominalDelayUs: number;
}

export type Dme320MonitorParameter =
  | "timeDelayUs"
  | "replyEfficiencyPct"
  | "transmissionRatePps"
  | "pulseRiseUs"
  | "pulseDurationUs"
  | "pulseDecayUs"
  | "pulseSpacingUs"
  | "frequencyMhz"
  | "peakPowerWatts"
  | "vswr"
  | "erpDb"
  | "identCode";

export const DME320_MONITOR_PARAMETERS = [
  "timeDelayUs",
  "replyEfficiencyPct",
  "transmissionRatePps",
  "pulseRiseUs",
  "pulseDurationUs",
  "pulseDecayUs",
  "pulseSpacingUs",
  "frequencyMhz",
  "peakPowerWatts",
  "vswr",
  "erpDb",
  "identCode",
] as const satisfies readonly Dme320MonitorParameter[];

export interface Dme320MonitorLimit {
  alarmLow: number | null;
  warningLow: number | null;
  nominal: number | string;
  warningHigh: number | null;
  alarmHigh: number | null;
  classification: Dme320AlarmClassification;
  alarmDelayMs: number;
  unit: string;
}

export type Dme320MonitorLimits = Record<
  Dme320MonitorParameter,
  Dme320MonitorLimit
>;

export interface Dme320StationConfig {
  stationName: string;
  runwayDesignator: string;
  channel: Dme320Channel;
  powerOutputWatts: number;
  delayOffsetUs: number;
  autoDelayCalibration: "always" | "never";
  sensitivityDbm: number;
  minimumPulseRatePps: number;
  sdesEnabled: boolean;
  sdesDurationUs: number;
  ldesEnabled: boolean;
  ldesDurationUs: number;
  ldesThresholdDbm: number;
  deadTimeUs: number;
  identCode: string;
  identKeyer: "none" | "independent" | "master" | "slave" | "continuous";
  identSync: "code" | "pulse";
  identSound:
    | "MON1"
    | "MON2"
    | "STB MON"
    | "TX1"
    | "TX2"
    | "ON ANTENNA"
    | "OFF";
  equalizerPulseEnabled: boolean;
  interlockEnabled: boolean;
  standbyMode: "hot" | "cold";
  bypassMonitorsOnBoot: boolean;
  transmitterOutputOnBoot: boolean;
}

export interface Dme320TransponderConfig {
  outputPowerPercent: number;
  useStationPulseRate: boolean;
  useStationEchoSuppression: boolean;
  useStationIdent: boolean;
}

export interface Dme320ThermalConfig {
  fanMode: "auto" | "on" | "off";
  fanStartC: number;
  fanStopC: number;
  txuShutdownC: number;
  txuRestartC: number;
}

export interface Dme320MonitorConfig {
  votingLogic: Dme320VotingLogic;
  monitorActionDelayMs: number;
  postChangeoverHoldoffMs: number;
  identFaultDelayMs: number;
  selfTestHoldoffMs: number;
  powerOnHoldoffMs: number;
  limits: Dme320MonitorLimits;
}

export interface Dme320SystemConfig {
  allowSimultaneousLogin: boolean;
  allowGuestAccess: boolean;
  automaticLogoutMinutes: number;
  modifyOnlyWhenBypassed: boolean;
  modifyOnlyAtLocal: boolean;
  shutdownOnRcuFault: boolean;
  shutdownOnLmiFault: boolean;
  shutdownOnCspFault: boolean;
  communicationFaultShutdownDelayMs: number;
}

export interface Dme320CommunicationConfig {
  remoteConnectionLimit: number;
  localConnectionLimit: number;
  localPmdtBaudRate: number;
  scu1RemoteType: "RS-232" | "Leased Line" | "Dialup";
  scu1BaudRate: number;
  scu1FlowControl: boolean;
  scu2RemoteType: "RS-232" | "Leased Line" | "Dialup";
  scu2BaudRate: number;
  scu2FlowControl: boolean;
  rcuLineType: "Ethernet" | "Modem" | "RS-232";
  localIpStart: string;
  localIpEnd: string;
}

export interface Dme320BatteryConfig {
  warningVoltage: number;
  alarmVoltage: number;
  warningTemperatureC: number;
  alarmTemperatureC: number;
  chargingCurrentLimitA: number;
  cutoffVoltage: number;
  fullyChargedVoltage: number;
  simulatedDischargeVoltsPerHour: number;
  simulatedChargeVoltsPerHour: number;
}

export interface Dme320EnvironmentConfig {
  emuEnabled: boolean;
  analogInputsEnabled: boolean[];
  digitalInputsEnabled: boolean[];
  expansionDigitalInputsEnabled: boolean[];
  digitalOutputsEnabled: boolean[];
}

export interface Dme320Config {
  station: Dme320StationConfig;
  transmitters: Record<Dme320TransponderId, Dme320TransponderConfig>;
  thermal: Dme320ThermalConfig;
  monitor: Dme320MonitorConfig;
  system: Dme320SystemConfig;
  communication: Dme320CommunicationConfig;
  battery: Dme320BatteryConfig;
  environment: Dme320EnvironmentConfig;
}

export interface Dme320ConfigProfiles {
  draft: Dme320Config;
  running: Dme320Config;
  flash: Dme320Config;
  draftDirty: boolean;
  flashDirty: boolean;
}

export interface Dme320SecurityAccount {
  userId: string;
  password: string;
  level: Exclude<Dme320SecurityLevel, 0>;
}

export interface Dme320Session {
  userId: string | null;
  level: Dme320SecurityLevel;
  origin: Dme320ControlOrigin;
  loggedInAtMs: number | null;
  lastActivityAtMs: number;
  failedLoginCount: number;
}

export interface Dme320TransponderState {
  dcPower: "on" | "off";
  rfEnabled: boolean;
  route: "antenna" | "load";
  shutdown: boolean;
  shutdownCause: Dme320ShutdownCause | null;
  interlocked: boolean;
  temperatureC: number;
  fanRunning: boolean;
  present: boolean;
  squitterEnabled: boolean;
  identKeying: Dme320IdentKeyingMode;
  rfLoopbackEnabled: boolean;
  spacingOffsetUs: number;
}

export interface Dme320MeasurementReading {
  value: number | string | null;
  masked: boolean;
  valid: boolean;
  updatedAtMs: number;
}

export type Dme320MonitorReadings = Record<
  Dme320MonitorParameter,
  Dme320MeasurementReading
>;

export interface Dme320AlarmState {
  phase: Dme320AlarmPhase;
  classification: Dme320AlarmClassification;
  pendingSinceMs: number | null;
  activeSinceMs: number | null;
  lastTransitionAtMs: number;
}

export type Dme320AlarmStates = Record<
  Dme320MonitorParameter,
  Dme320AlarmState
>;

export interface Dme320MonitorChannelState {
  sourceTransponder: Dme320TransponderId;
  readings: Dme320MonitorReadings;
  alarms: Dme320AlarmStates;
  overallStatus: Dme320OverallStatus;
}

export interface Dme320MonitorSelfTestState {
  timeDelayUs: number;
  pulseSpacingUs: number;
  normalResult: Dme320OverallStatus;
  erroneousResult: Dme320OverallStatus;
  pulseRiseUs: number;
  pulseDurationUs: number;
  pulseDecayUs: number;
  updatedAtMs: number;
}

export interface Dme320MonitorState {
  mode: Dme320MonitorMode;
  present: boolean;
  hardwareFault: boolean;
  channels: Record<Dme320MonitorChannel, Dme320MonitorChannelState>;
  selfTest: Dme320MonitorSelfTestState;
}

export interface Dme320BatteryState {
  connected: boolean;
  voltage: number;
  currentA: number;
  temperatureC: number;
  charging: boolean;
  status: "normal" | "warning" | "alarm" | "cutoff" | "unplugged";
}

export interface Dme320PowerState {
  acAvailable: boolean;
  source: "ac" | "battery" | "off";
  batteries: { battery1: Dme320BatteryState; battery2: Dme320BatteryState };
  lastUpdatedAtMs: number;
}

export interface Dme320EnvironmentState {
  present: boolean;
  smokeDetected: boolean;
  intrusionDetected: boolean;
  temperatureC: number;
  analogInputsV: number[];
  digitalInputs: boolean[];
  expansionDigitalInputs: boolean[];
  digitalOutputs: boolean[];
}

export type Dme320FaultKind =
  | "hpa-low-output"
  | "txu-failure"
  | "rxu-sensitivity"
  | "tcu-failure"
  | "dcdc-failure"
  | "fan-failure"
  | "rfg-failure"
  | "monitor-failure"
  | "antenna-vswr"
  | "rf-detector-failure"
  | "vswr-monitor-failure"
  | "coax-relay-failure"
  | "dummy-load-failure"
  | "ac-mains-failure"
  | "battery-low"
  | "battery-overtemperature"
  | "rcu-link-failure"
  | "lmi-link-failure"
  | "csp-link-failure"
  | "emu-smoke"
  | "emu-intrusion";

export type Dme320FaultTarget =
  | Dme320TransponderId
  | Dme320MonitorId
  | "antenna"
  | "system"
  | "battery1"
  | "battery2";

export interface Dme320Fault {
  id: string;
  kind: Dme320FaultKind;
  target: Dme320FaultTarget;
  active: boolean;
  injectedAtMs: number;
}

export interface Dme320MeasurementOverride {
  monitorId: Dme320MonitorId;
  channel: Dme320MonitorChannel;
  parameter: Dme320MonitorParameter;
  value: number | string | null;
  valid?: boolean;
}

export interface Dme320MonitorActionState {
  votePendingSinceMs: number | null;
  automaticActionLatched: boolean;
  suppressedUntilMs: number;
  automaticChangeovers: number;
  automaticShutdowns: number;
}

export type Dme320CalibrationStepStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "skipped";

export interface Dme320CalibrationStep {
  number: number;
  name: string;
  skippable: boolean;
  status: Dme320CalibrationStepStatus;
  completedAtMs: number | null;
  message: string | null;
}

export interface Dme320CalibrationState {
  status: "idle" | "running" | "completed" | "failed";
  transponderId: Dme320TransponderId | null;
  currentStep: number | null;
  steps: Dme320CalibrationStep[];
}

export interface Dme320ManualTestInput {
  monitorId: Dme320MonitorId;
  transponderId: Dme320TransponderId;
  interrogationLevelDbm: number;
  interrogationPulseRatePps: number;
  interrogationCount: number;
  frequencyOffsetKhz: number;
  spacingUs: number;
}

export interface Dme320ManualTestResult {
  input: Dme320ManualTestInput;
  replyCount: number;
  efficiencyPct: number;
  passed: boolean;
  executedAtMs: number;
}

export interface Dme320CertificationResult {
  monitorId: Dme320MonitorId;
  parameter: Dme320MonitorParameter;
  testValue: number | string;
  startAtMs: number;
  alarmDetectedAtMs: number;
  actionAtMs: number;
  expectedActionDelayMs: number;
  passed: boolean;
  message: string;
}

export type Dme320LogCategory =
  | "control"
  | "alarm"
  | "event"
  | "authentication"
  | "configuration"
  | "maintenance";

export interface Dme320LogEntry {
  sequence: number;
  timestampMs: number;
  category: Dme320LogCategory;
  message: string;
  userId: string;
}

export interface Dme320SimulationState {
  nowMs: number;
  /** Monotonic equipment reset/reboot generation for state consumers and diagnostics. */
  equipmentResetRevision: number;
  keylock: Dme320KeylockMode;
  session: Dme320Session;
  accounts: Dme320SecurityAccount[];
  config: Dme320ConfigProfiles;
  mainTransponder: Dme320TransponderId;
  transmitters: Record<Dme320TransponderId, Dme320TransponderState>;
  monitors: Record<Dme320MonitorId, Dme320MonitorState>;
  monitorAction: Dme320MonitorActionState;
  power: Dme320PowerState;
  environment: Dme320EnvironmentState;
  interlockActive: boolean;
  systemShutdown: boolean;
  serviceStatus: "normal" | "warning" | "alarm" | "shutdown";
  faults: Dme320Fault[];
  measurementOverrides: Dme320MeasurementOverride[];
  calibration: Dme320CalibrationState;
  lastManualTest: Dme320ManualTestResult | null;
  lastCertification: Dme320CertificationResult | null;
  logs: Dme320LogEntry[];
}

export type Dme320Command =
  | { type: "advance-time"; toMs: number }
  | { type: "set-keylock"; mode: Dme320KeylockMode }
  | { type: "login"; userId: string; password: string; origin: Dme320ControlOrigin }
  | { type: "login-as-guest"; origin: Dme320ControlOrigin }
  | { type: "logout" }
  | { type: "add-account"; account: Dme320SecurityAccount }
  | { type: "delete-account"; userId: string }
  | { type: "set-monitor-mode"; monitorId: Dme320MonitorId; mode: Dme320MonitorMode }
  | { type: "select-main"; transponderId: Dme320TransponderId }
  | { type: "changeover" }
  | { type: "reset-system" }
  | { type: "set-transponder-power"; transponderId: Dme320TransponderId; on: boolean }
  | { type: "set-transponder-rf"; transponderId: Dme320TransponderId; enabled: boolean }
  | { type: "set-transponder-squitter"; transponderId: Dme320TransponderId; enabled: boolean }
  | { type: "set-transponder-ident-keying"; transponderId: Dme320TransponderId; mode: Dme320IdentKeyingMode }
  | { type: "set-transponder-rf-loopback"; transponderId: Dme320TransponderId; enabled: boolean }
  | { type: "set-transponder-spacing-offset"; transponderId: Dme320TransponderId; offsetUs: number }
  | { type: "set-interlock"; active: boolean }
  | { type: "set-ac-available"; available: boolean }
  | {
      type: "set-battery";
      batteryId: "battery1" | "battery2";
      changes: Partial<Pick<Dme320BatteryState, "connected" | "voltage" | "temperatureC">>;
    }
  | { type: "set-environment"; changes: Partial<Dme320EnvironmentState> }
  | { type: "set-draft-config"; config: Dme320Config }
  | { type: "restore-draft" }
  | { type: "apply-draft" }
  | { type: "load-running-config"; config: Dme320Config }
  | { type: "save-running-to-flash" }
  | { type: "reboot" }
  | { type: "inject-fault"; fault: Omit<Dme320Fault, "active" | "injectedAtMs"> }
  | { type: "clear-fault"; faultId: string }
  | { type: "inject-measurement"; override: Dme320MeasurementOverride }
  | {
      type: "clear-measurement";
      monitorId: Dme320MonitorId;
      channel: Dme320MonitorChannel;
      parameter: Dme320MonitorParameter;
    }
  | { type: "start-calibration"; transponderId: Dme320TransponderId }
  | { type: "run-calibration-step"; measuredValue?: number }
  | { type: "skip-calibration-step" }
  | { type: "run-manual-test"; input: Dme320ManualTestInput }
  | {
      type: "run-certification";
      monitorId: Dme320MonitorId;
      parameter: Dme320MonitorParameter;
      testValue: number | string;
    };

export interface Dme320CommandResult {
  state: Dme320SimulationState;
  accepted: boolean;
  message: string;
}
