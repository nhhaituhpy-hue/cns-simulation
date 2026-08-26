import type { SimulatorParameterChangeLogEntry } from "@/lib/simulator-config/parameter-change";

export const DVOR220_TRANSMITTER_IDS = ["tx1", "tx2"] as const;
export type Dvor220TransmitterId = (typeof DVOR220_TRANSMITTER_IDS)[number];

export const DVOR220_MONITOR_IDS = ["mon1", "mon2"] as const;
export type Dvor220MonitorId = (typeof DVOR220_MONITOR_IDS)[number];

export const DVOR220_MONITOR_CHANNEL_IDS = ["cha", "chb1", "chb2", "standby"] as const;
export type Dvor220MonitorChannelId = (typeof DVOR220_MONITOR_CHANNEL_IDS)[number];

export const DVOR220_MONITOR_PARAMETERS = [
  "bearingError",
  "fmIndex",
  "am30Hz",
  "am9960Hz",
  "ident1020Hz",
  "rfLevel",
  "distortion9960Hz",
  "carrierFrequency",
  "subcarrierFrequency",
] as const;
export type Dvor220MonitorParameter = (typeof DVOR220_MONITOR_PARAMETERS)[number];

export const DVOR220_RF_OUTPUT_IDS = ["carrier", "usbCos", "usbSin", "lsbCos", "lsbSin"] as const;
export type Dvor220RfOutputId = (typeof DVOR220_RF_OUTPUT_IDS)[number];
export type Dvor220PdcCalibrationParameter = "carrierPower" | "carrierVswr";

export const DVOR220_TRANSMITTER_UNIT_IDS = [
  "msg",
  "syn",
  "cma",
  "smaUsb",
  "smaLsb",
  "dcdc",
  "fan",
] as const;
export type Dvor220TransmitterUnitId = (typeof DVOR220_TRANSMITTER_UNIT_IDS)[number];

export type Dvor220SecurityLevel = 0 | 1 | 2 | 3;
export type Dvor220KeylockMode = "LOCAL" | "REM" | "MAINT";
export type Dvor220ConnectionLocation = "local" | "remote";
export type Dvor220ConnectionKind = "ethernet" | "rs232" | "leased-line" | "dial-up" | "usb" | "demo";
export type Dvor220StandbyMode = "hot" | "cold";
export type Dvor220VotingLogic = "AND" | "OR";
export type Dvor220AlarmSeverity = "primary" | "secondary";
export type Dvor220TransmitterDesignation = "main" | "standby";
export type Dvor220TransmitterPath = "antenna" | "load" | "disconnected";
export type Dvor220Status =
  | "normal"
  | "warning"
  | "alarm"
  | "fault"
  | "off"
  | "unplugged"
  | "unknown"
  | "bypassed"
  | "not-present";

export type Dvor220LogCategory = "control" | "alarm" | "event";
export type Dvor220LogSource = "PMDT" | "LMI" | "SYSTEM";

export interface Dvor220AlarmBand {
  lowerAlarm: number | null;
  lowerWarning: number | null;
  nominal: number;
  upperWarning: number | null;
  upperAlarm: number | null;
  severity: Dvor220AlarmSeverity;
}

export interface Dvor220StationConfiguration {
  stationName: string;
  equipmentVersion: "single" | "dual";
  frequencyMHz: number;
  carrierPowerW: number;
  am30HzPercent: number;
  identModulationPercent: number;
  voiceModulationPercent: number;
  azimuthOffsetDeg: number;
  identCode: string;
  identKeyer: "independent" | "associated-master" | "associated-slave" | "none" | "continuous";
  identSync: "pulse" | "code";
  playbackSource: "mon1" | "mon2" | "standby" | "tx1" | "tx2" | "on-antenna" | "none";
  standbyMode: Dvor220StandbyMode;
  bypassMonitorsOnBoot: boolean;
  transmitterOutputOnBoot: boolean;
}

export interface Dvor220TransmitterConfiguration {
  carrierScalePercent: number;
  sidebandPowerW: Record<Exclude<Dvor220RfOutputId, "carrier">, number>;
  trackingEnabled: boolean;
  rfPhaseDeg: {
    usbCosToSin: number;
    lsbCosToSin: number;
    carrierToSideband: number;
  };
  standbyRfPhaseDeg: {
    usbCosToSin: number;
    lsbCosToSin: number;
    carrierToSideband: number;
  };
  useStationModulation: boolean;
  useStationAzimuth: boolean;
  useStationIdent: boolean;
  am30HzPercent: number;
  identModulationPercent: number;
  voiceModulationPercent: number;
  azimuthOffsetDeg: number;
  identCode: string;
  identKeyer: Dvor220StationConfiguration["identKeyer"];
  identSync: Dvor220StationConfiguration["identSync"];
}

export interface Dvor220TransmitterLimitConfiguration {
  carrierPower: Dvor220AlarmBand;
  sidebandPower: Dvor220AlarmBand;
  vswrUpperWarning: number;
  vswrUpperAlarm: number;
}

export interface Dvor220ThermalConfiguration {
  fanMode: "auto" | "on" | "off";
  fanStartC: number;
  fanStopC: number;
  shutdownC: {
    cma: number;
    usb: number;
    lsb: number;
  };
  restartC: {
    cma: number;
    usb: number;
    lsb: number;
  };
}

export interface Dvor220MonitorChannelConfiguration {
  type: "FFM" | "NFM" | "disabled";
  referenceAzimuthDeg: number;
  executiveAction: boolean;
  limits: Record<Dvor220MonitorParameter, Dvor220AlarmBand>;
}

export interface Dvor220MonitorConfiguration {
  votingLogic: Dvor220VotingLogic;
  executiveAlarmDelayMs: number;
  postChangeoverHoldoffMs: number;
  powerOnHoldoffMs: number;
  measurementAverageCount: number;
  warningRangePercent: number;
  dcdcAlarmSeverity: Dvor220AlarmSeverity;
  identCodeAlarmSeverity: Dvor220AlarmSeverity;
  identCodeAlarmDelayMs: number;
  channels: Record<Dvor220MonitorChannelId, Dvor220MonitorChannelConfiguration>;
  rfGainDb: Record<Dvor220MonitorId, Record<Dvor220MonitorChannelId | "tsg", number>>;
}

export interface Dvor220SystemConfiguration {
  allowSimultaneousLogin: boolean;
  allowGuestAccess: boolean;
  automaticLogoutMinutes: number;
  identWhenMonitorBypassed: "remove" | "itst" | "no-change";
  settingsOnlyWhenMonitorBypassed: boolean;
  settingsOnlyAtLocal: boolean;
  shutdownOnRcuFault: boolean;
  shutdownOnLmiFault: boolean;
  shutdownOnCspFault: boolean;
  controlFaultShutdownDelayMs: number;
}

export interface Dvor220CommunicationConfiguration {
  remoteConnectionLimit: number;
  localConnectionLimit: number;
  pmdtRs232BaudRate: number;
  scuRemote: Record<"scu1" | "scu2", {
    type: "rs232" | "leased-line" | "dial-up";
    baudRate: number;
    flowControl: boolean;
  }>;
  rcuLineType: "ethernet" | "modem" | "rs232";
  localIpStart: string;
  localIpEnd: string;
}

export interface Dvor220BatteryConfiguration {
  voltageWarningV: number;
  voltageAlarmV: number;
  temperatureWarningC: number;
  temperatureAlarmC: number;
  chargingCurrentA: number;
  cutoffVoltageV: number;
  backupRuntimeMinutes: number;
}

export interface Dvor220OptionalUnitsConfiguration {
  emu: boolean;
  niu: boolean;
  vau: boolean;
  battery: boolean;
  standbyMonitor: boolean;
}

export interface Dvor220Configuration {
  station: Dvor220StationConfiguration;
  transmitters: Record<Dvor220TransmitterId, Dvor220TransmitterConfiguration>;
  transmitterLimits: Dvor220TransmitterLimitConfiguration;
  thermal: Record<Dvor220TransmitterId, Dvor220ThermalConfiguration>;
  monitor: Dvor220MonitorConfiguration;
  system: Dvor220SystemConfiguration;
  communication: Dvor220CommunicationConfiguration;
  battery: Dvor220BatteryConfiguration;
  optionalUnits: Dvor220OptionalUnitsConfiguration;
}

export type Dvor220DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: Dvor220DeepPartial<T[K]> }
    : T;

export interface Dvor220ConfigurationLayers {
  draft: Dvor220Configuration;
  running: Dvor220Configuration;
  flash: Dvor220Configuration;
  draftDirty: boolean;
  flashDirty: boolean;
}

export interface Dvor220ConnectionProfile {
  id: string;
  name: string;
  description: string;
  kind: Dvor220ConnectionKind;
  location: Dvor220ConnectionLocation;
  timeoutMs: number;
  ipAddress?: string;
  port?: number;
  serialPort?: string;
  baudRate?: number;
  phoneNumber?: string;
  automaticLogin?: {
    username: string;
    password: string;
  };
}

export interface Dvor220ConnectionState {
  connected: boolean;
  profile: Dvor220ConnectionProfile | null;
  connectedAtMs: number | null;
  txActive: boolean;
  rxActive: boolean;
}

export interface Dvor220UserAccount {
  username: string;
  password: string;
  level: Exclude<Dvor220SecurityLevel, 0>;
}

export interface Dvor220SessionState {
  username: string | null;
  level: Dvor220SecurityLevel;
  loggedInAtMs: number | null;
  lastActivityAtMs: number | null;
  failedLoginCount: number;
}

export interface Dvor220TransmitterRuntime {
  powerOn: boolean;
  designation: Dvor220TransmitterDesignation;
  path: Dvor220TransmitterPath;
  rfOutputs: Record<Dvor220RfOutputId, boolean>;
  temperaturesC: {
    cma: number;
    usb: number;
    lsb: number;
  };
  thermalTrips: {
    cma: boolean;
    usb: boolean;
    lsb: boolean;
  };
  fanOn: boolean;
  reverseFaultLatched: boolean;
}

export interface Dvor220MonitorRuntime {
  bypassRequested: boolean;
}

export interface Dvor220PowerRuntime {
  acAvailable: boolean;
  source: "ac" | "battery" | "off";
  batteryPresent: boolean;
  batteryRemainingMs: number;
  batteryCapacityMs: number;
  batteryVoltageV: number;
  batteryTemperatureC: number;
  batteryCurrentA: number;
  charging: boolean;
}

export interface Dvor220EnvironmentRuntime {
  temperatureC: number;
  smoke: boolean;
  intrusion: boolean;
  analogInputsV: number[];
  digitalInputs: boolean[];
  expansionDigitalInputs: boolean[];
}

export interface Dvor220ScenarioAntennaVswr {
  antenna: number;
  usbVswr: number;
  lsbVswr: number;
}

export interface Dvor220ScenarioDefinition {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  difficulty: "basic" | "intermediate" | "advanced";
  configuration: Dvor220Configuration;
  runtime: {
    mainTransmitterId: Dvor220TransmitterId;
    startMonitorBypassed: boolean;
    acAvailable: boolean;
    batteryRemainingMinutes: number;
    temperaturesC: Record<Dvor220TransmitterId, {
      cma: number;
      usb: number;
      lsb: number;
    }>;
    environment: {
      temperatureC: number;
      smoke: boolean;
      intrusion: boolean;
    };
    antennaVswr: Dvor220ScenarioAntennaVswr[];
    faults: Dvor220InjectedFault[];
    measurementOverrides: Dvor220MeasurementOverride[];
  };
  successCriteria: {
    requireServiceNormal: boolean;
    requireEnabledMonitorChannelsNormal: boolean;
    requireNoPrimaryAlarm: boolean;
  };
}

export interface Dvor220ScenarioRuntime {
  active: boolean;
  definition: Dvor220ScenarioDefinition | null;
  startedAtMs: number | null;
}

export interface Dvor220ScenarioEvaluation {
  solved: boolean;
  correctable: boolean;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    detail: string;
  }>;
  blockers: string[];
}

export type Dvor220UnitFaultCondition = "warning" | "alarm" | "fault" | "unplugged";

export type Dvor220InjectedFault =
  | {
      id: string;
      kind: "transmitter-unit";
      transmitterId: Dvor220TransmitterId;
      unit: Dvor220TransmitterUnitId;
      condition: Dvor220UnitFaultCondition;
    }
  | {
      id: string;
      kind: "monitor-hardware";
      monitorId: Dvor220MonitorId;
      condition: "fault" | "unplugged";
    }
  | {
      id: string;
      kind: "monitor-parameter";
      monitorId: Dvor220MonitorId;
      channelId: Dvor220MonitorChannelId;
      parameter: Dvor220MonitorParameter;
      value: number;
    }
  | {
      id: string;
      kind: "pdc";
      condition: Dvor220UnitFaultCondition;
    }
  | {
      id: string;
      kind: "antenna-vswr";
      antenna: number;
      usbVswr?: number;
      lsbVswr?: number;
    }
  | {
      id: string;
      kind: "communication";
      endpoint: "rcu" | "lmi" | "csp";
      condition: "fault";
    }
  | {
      id: string;
      kind: "environment";
      sensor: "smoke" | "intrusion" | "temperature";
      value: boolean | number;
    };

export interface Dvor220CalibrationValues {
  transmitterReadingFactors: Record<Dvor220TransmitterId, Record<Dvor220RfOutputId, number>>;
  transmitterSetpointFactors: Record<Dvor220TransmitterId, Record<Dvor220RfOutputId | "am30Hz" | "ident1020Hz", number>>;
  pdcFactors: Record<Dvor220PdcCalibrationParameter, number>;
  monitorFactors: Record<
    Dvor220MonitorId,
    Record<Dvor220MonitorChannelId, Record<Exclude<Dvor220MonitorParameter, "rfLevel">, number>>
  >;
  monitorRfLevelOffsets: Record<Dvor220MonitorId, Record<Dvor220MonitorChannelId, number>>;
}

export interface Dvor220CalibrationState extends Dvor220CalibrationValues {
  saved: Dvor220CalibrationValues;
}

export type Dvor220MonitorSampleBuffers = Record<
  Dvor220MonitorId,
  Record<Dvor220MonitorChannelId, Record<Dvor220MonitorParameter, number[]>>
>;

export interface Dvor220MonitorAveragingState {
  nextSampleAtMs: number;
  buffers: Dvor220MonitorSampleBuffers;
}

export interface Dvor220GroundCheckPoint {
  azimuthDeg: number;
  bearingErrorDeg: number;
}

export interface Dvor220GroundCheckState {
  status: "idle" | "running" | "completed" | "failed";
  transmitterId: Dvor220TransmitterId | null;
  startedAtMs: number | null;
  completesAtMs: number | null;
  points: Dvor220GroundCheckPoint[];
  withinTolerance: boolean | null;
}

export type Dvor220ExecutivePhase =
  | "idle"
  | "pending-changeover"
  | "post-changeover-holdoff"
  | "pending-shutdown"
  | "shutdown-locked"
  | "shutdown";

export interface Dvor220ExecutiveState {
  phase: Dvor220ExecutivePhase;
  pendingSinceMs: number | null;
  powerOnHoldoffUntilMs: number | null;
  postChangeoverUntilMs: number | null;
  shutdownLockedUntilMs: number | null;
  changeoverCountSinceReset: number;
  changeoverFlag: boolean;
  shutdownReason: string | null;
}

export interface Dvor220LogEntry {
  id: number;
  timestampMs: number;
  category: Dvor220LogCategory;
  source: Dvor220LogSource;
  userId: string;
  message: string;
}

export interface Dvor220HistoryState {
  pmdt: Dvor220LogEntry[];
  lmi: Dvor220LogEntry[];
  parameterChanges: SimulatorParameterChangeLogEntry[];
  nextId: number;
}

export interface Dvor220DeviceState {
  nowMs: number;
  keylock: Dvor220KeylockMode;
  connection: Dvor220ConnectionState;
  accounts: Dvor220UserAccount[];
  session: Dvor220SessionState;
  configuration: Dvor220ConfigurationLayers;
  transmitters: Record<Dvor220TransmitterId, Dvor220TransmitterRuntime>;
  monitors: Record<Dvor220MonitorId, Dvor220MonitorRuntime>;
  power: Dvor220PowerRuntime;
  environment: Dvor220EnvironmentRuntime;
  faults: Dvor220InjectedFault[];
  measurementOverrides: Dvor220MeasurementOverride[];
  calibration: Dvor220CalibrationState;
  monitorAveraging: Dvor220MonitorAveragingState;
  groundCheck: Dvor220GroundCheckState;
  executive: Dvor220ExecutiveState;
  scenario: Dvor220ScenarioRuntime;
  history: Dvor220HistoryState;
}

export interface Dvor220ValidationIssue {
  path: string;
  severity: "error" | "warning";
  message: string;
}

export interface Dvor220ParameterReading {
  value: number;
  status: "normal" | "warning" | "alarm" | "unplugged" | "disabled" | "stabilizing";
  severity: Dvor220AlarmSeverity;
  unit: string;
}

/**
 * Instructor-controlled raw monitor input used by the in-memory simulator.
 * It is deliberately separate from the equipment configuration/profile layers
 * so a training scenario cannot silently become a saved station setting.
 */
export interface Dvor220MeasurementOverride {
  monitorId: Dvor220MonitorId;
  channelId: Dvor220MonitorChannelId;
  parameter: Dvor220MonitorParameter;
  value: number;
}

export interface Dvor220MonitorChannelSnapshot {
  channelId: Dvor220MonitorChannelId;
  enabled: boolean;
  readings: Record<Dvor220MonitorParameter, Dvor220ParameterReading>;
  status: Dvor220Status;
  primaryAlarm: boolean;
  secondaryAlarm: boolean;
  stabilizing: boolean;
  sampleCount: number;
  requiredSamples: number;
}

export interface Dvor220MonitorSnapshot {
  monitorId: Dvor220MonitorId;
  status: Dvor220Status;
  effectiveBypass: boolean;
  hardwareStatus: Dvor220Status;
  channels: Record<Dvor220MonitorChannelId, Dvor220MonitorChannelSnapshot>;
  executiveVote: boolean;
}

export interface Dvor220TransmitterSnapshot {
  transmitterId: Dvor220TransmitterId;
  designation: Dvor220TransmitterDesignation;
  path: Dvor220TransmitterPath;
  status: Dvor220Status;
  powerOn: boolean;
  rfOutputs: Record<Dvor220RfOutputId, boolean>;
  units: Record<Dvor220TransmitterUnitId, Dvor220Status>;
  forwardPowerW: Record<Dvor220RfOutputId, number>;
  frequencies: Record<Dvor220RfOutputId, number>;
  temperaturesC: Dvor220TransmitterRuntime["temperaturesC"];
  fanOn: boolean;
}

export interface Dvor220AntennaSnapshot {
  antenna: number;
  usbVswr: number;
  lsbVswr: number;
  phaseDeg: number;
  status: "normal" | "warning" | "alarm";
}

export interface Dvor220PdcSnapshot {
  status: Dvor220Status;
  carrierPowerW: number;
  carrierVswr: number;
  antennas: Dvor220AntennaSnapshot[];
}

export interface Dvor220PowerSnapshot {
  status: Dvor220Status;
  source: Dvor220PowerRuntime["source"];
  batteryStatus: Dvor220Status;
  batteryRemainingMinutes: number;
  batteryVoltageV: number;
}

export interface Dvor220Snapshot {
  timestampMs: number;
  serviceStatus: "normal" | "warning" | "alarm" | "off";
  controlAvailable: boolean;
  effectiveMonitorBypass: boolean;
  activeTransmitterId: Dvor220TransmitterId | null;
  transmitters: Record<Dvor220TransmitterId, Dvor220TransmitterSnapshot>;
  monitors: Record<Dvor220MonitorId, Dvor220MonitorSnapshot>;
  pdc: Dvor220PdcSnapshot;
  power: Dvor220PowerSnapshot;
  executiveAlarm: boolean;
  configurationIssues: Dvor220ValidationIssue[];
}

export type Dvor220Permission =
  | "read"
  | "control"
  | "configure"
  | "calibrate"
  | "manage-users"
  | "firmware-update";

export interface Dvor220CommandResult {
  ok: boolean;
  state: Dvor220DeviceState;
  error?: string;
}

export type Dvor220CalibrationCommand =
  | {
      kind: "transmitter-reading";
      transmitterId: Dvor220TransmitterId;
      output: Dvor220RfOutputId;
      indicatedValue: number;
      referenceValue: number;
    }
  | {
      kind: "transmitter-setpoint";
      transmitterId: Dvor220TransmitterId;
      parameter: Dvor220RfOutputId | "am30Hz" | "ident1020Hz";
      indicatedValue: number;
      referenceValue: number;
    }
  | {
      kind: "monitor";
      monitorId: Dvor220MonitorId;
      channelId: Dvor220MonitorChannelId;
      parameter: Dvor220MonitorParameter;
      indicatedValue: number;
      referenceValue: number;
    }
  | {
      kind: "pdc";
      parameter: Dvor220PdcCalibrationParameter;
      indicatedValue: number;
      referenceValue: number;
    };

export type Dvor220CalibrationTarget =
  | Pick<Extract<Dvor220CalibrationCommand, { kind: "transmitter-reading" }>, "kind" | "transmitterId" | "output">
  | Pick<Extract<Dvor220CalibrationCommand, { kind: "transmitter-setpoint" }>, "kind" | "transmitterId" | "parameter">
  | Pick<Extract<Dvor220CalibrationCommand, { kind: "monitor" }>, "kind" | "monitorId" | "channelId" | "parameter">
  | Pick<Extract<Dvor220CalibrationCommand, { kind: "pdc" }>, "kind" | "parameter">;

export type Dvor220Command =
  | { type: "connect"; profile: Dvor220ConnectionProfile }
  | { type: "disconnect" }
  | { type: "login"; username: string; password: string }
  | { type: "login-guest" }
  | { type: "logout" }
  | { type: "touch-activity" }
  | { type: "set-keylock"; mode: Dvor220KeylockMode }
  | { type: "select-main"; transmitterId: Dvor220TransmitterId }
  | { type: "changeover" }
  | { type: "set-transmitter-power"; transmitterId: Dvor220TransmitterId; on: boolean }
  | { type: "set-rf-output"; transmitterId: Dvor220TransmitterId; output: Dvor220RfOutputId; on: boolean }
  | { type: "set-monitor-bypass"; monitorId?: Dvor220MonitorId; bypass: boolean }
  | { type: "reset" }
  | { type: "fault-clear"; transmitterId?: Dvor220TransmitterId }
  | { type: "patch-draft"; patch: Dvor220DeepPartial<Dvor220Configuration> }
  | { type: "replace-draft"; configuration: Dvor220Configuration }
  | { type: "reset-draft" }
  | { type: "apply-draft" }
  | { type: "save-profile" }
  | {
      type: "apply-transmitter-helper";
      transmitterIds: Dvor220TransmitterId[];
      settings: Pick<Dvor220TransmitterConfiguration, "carrierScalePercent" | "sidebandPowerW" | "trackingEnabled">;
    }
  | { type: "save-transmitter-helper"; transmitterIds: Dvor220TransmitterId[] }
  | { type: "load-configuration"; configuration: Dvor220Configuration }
  | { type: "power-cycle" }
  | { type: "set-ac-available"; available: boolean }
  | { type: "set-battery-remaining-minutes"; minutes: number }
  | {
      type: "set-temperature";
      transmitterId: Dvor220TransmitterId;
      unit: "cma" | "usb" | "lsb";
      temperatureC: number;
    }
  | { type: "inject-fault"; fault: Dvor220InjectedFault }
  | { type: "clear-fault"; faultId: string }
  | { type: "clear-all-faults" }
  | { type: "inject-measurement"; override: Dvor220MeasurementOverride }
  | { type: "clear-measurement"; monitorId: Dvor220MonitorId; channelId: Dvor220MonitorChannelId; parameter: Dvor220MonitorParameter }
  | { type: "apply-scenario"; scenario: Dvor220ScenarioDefinition }
  | { type: "restart-scenario" }
  | { type: "end-scenario" }
  | { type: "calibrate"; calibration: Dvor220CalibrationCommand }
  | { type: "initialize-calibration"; target: Dvor220CalibrationTarget }
  | { type: "save-calibration" }
  | { type: "close-calibration"; target: Dvor220CalibrationTarget }
  | { type: "start-ground-check"; transmitterId?: Dvor220TransmitterId }
  | { type: "add-user"; account: Dvor220UserAccount }
  | { type: "delete-user"; username: string }
  | { type: "change-password"; username: string; password: string };

export interface Dvor220HistoryFilter {
  fromMs?: number;
  toMs?: number;
  categories?: Dvor220LogCategory[];
  query?: string;
}
