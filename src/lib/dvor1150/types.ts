export const DVOR1150_TRANSMITTER_IDS = ["tx1", "tx2"] as const;
export type Dvor1150TransmitterId = (typeof DVOR1150_TRANSMITTER_IDS)[number];

export const DVOR1150_MONITOR_IDS = ["mon1", "mon2"] as const;
export type Dvor1150MonitorId = (typeof DVOR1150_MONITOR_IDS)[number];

export const DVOR1150_MONITOR_PARAMETERS = [
  "azimuth",
  "hz30Modulation",
  "hz9960Modulation",
  "deviation",
  "rfLevel",
] as const;
export type Dvor1150MonitorParameter = (typeof DVOR1150_MONITOR_PARAMETERS)[number];

export type Dvor1150ConfigValue = string | number | boolean | null;
export type Dvor1150PmdtMode = "preview" | "author" | "student";
export type Dvor1150SecurityLevel = 0 | 1 | 2 | 3 | 4;
export type Dvor1150TransmitterMode = "main" | "load" | "off";
export type Dvor1150IndicatorColor = "green" | "yellow" | "red" | "gray";
export type Dvor1150ParameterStatus = "normal" | "warning" | "alarm";

export type Dvor1150ScreenId =
  | "home"
  | "rms-status"
  | "rms-data"
  | "rms-logs"
  | "rms-config"
  | "monitor-data"
  | "monitor-config"
  | "tx-data"
  | "tx-config"
  | "diagnostics"
  | "disabled";

export type Dvor1150ViewId =
  | "home"
  | "rms-status"
  | "rms-maintenance-alerts"
  | "rms-ad-data"
  | "rms-logs"
  | "rms-config-general"
  | "rms-config-station"
  | "rms-config-ad-limits"
  | "monitor-integrity"
  | "monitor-sideband-vswr"
  | "monitor-alarm-limits"
  | "monitor-offsets"
  | "tx-data-main"
  | "tx-config-nominal"
  | "tx-config-offsets"
  | "diagnostics-power-up"
  | "diagnostics-fault-isolation"
  | "disabled";

export type Dvor1150MenuAction =
  | "open-config"
  | "open-login"
  | "logoff"
  | "config-restore"
  | "config-backup"
  | "set-local"
  | "set-bypass"
  | "set-transmitter-mode"
  | "execute-command";

export interface Dvor1150MenuItem {
  id: string;
  label: string;
  enabled: boolean;
  checked?: boolean;
  screenId?: Dvor1150ScreenId;
  viewId?: Dvor1150ViewId;
  action?: Dvor1150MenuAction;
  transmitterId?: Dvor1150TransmitterId;
  transmitterMode?: Dvor1150TransmitterMode;
  commandId?: string;
  children?: readonly Dvor1150MenuItem[];
}

export interface Dvor1150MenuGroup {
  id: string;
  label: string;
  items: readonly Dvor1150MenuItem[];
}

export interface Dvor1150AlarmBand {
  alarmLow: number;
  preAlarmLow: number;
  nominal: number;
  preAlarmHigh: number;
  alarmHigh: number;
}

export interface Dvor1150TransmitterNominal {
  azimuthIndex: number;
  outputPower: number;
  voiceModulation: number;
  identModulation: number;
  referenceModulation: number;
  sboRfLevel: number;
  identCode: string;
}

export interface Dvor1150TransmitterOffsets {
  azimuthAngle: number;
  outputPowerScale: number;
  voiceModulationScale: number;
  identModulationScale: number;
  referenceModulationScale: number;
  sideband1RfLevelScale: number;
  sideband2RfLevelScale: number;
  sideband3RfLevelScale: number;
  sideband4RfLevelScale: number;
}

export interface Dvor1150TransmitterConfig {
  enabled: boolean;
  onAir: boolean;
  load: boolean;
  nominal: Dvor1150TransmitterNominal;
  offsets: Dvor1150TransmitterOffsets;
}

export interface Dvor1150Config {
  station: {
    stationDescription: string;
    stationType: "CVOR" | "DVOR";
    transmitterConfig: "Dual Transmitters" | "Single Transmitter";
    monitorConfig: "Dual Monitors" | "Single Monitor";
    frequencyMHz: number;
  };
  transmitters: Record<Dvor1150TransmitterId, Dvor1150TransmitterConfig>;
  monitor: {
    votingLogic: "AND" | "OR";
    monitorStartupDelay: number;
    monitorShutdownDelay: number;
    identMonitoringEnabled: boolean;
    alarmLimits: Record<Dvor1150MonitorParameter, Dvor1150AlarmBand>;
    offsets: Record<Dvor1150MonitorId, Record<Dvor1150MonitorParameter, number>>;
    sidebandVswrTolerance: number;
    sidebandVswrExecutiveAlarm: boolean;
    numberOfAntennasInAlarm: number;
  };
  rms: {
    rcsuPresent: boolean;
    rcsuConnectionType: "Hard Wired" | "Radio Modem";
    smokeAlarmInstalled: boolean;
    intrusionAlarmInstalled: boolean;
    automaticRestartsEnabled: boolean;
    firstRestartDelay: number;
    dmePresent: boolean;
    dualDme: boolean;
    keyingOutputEnabled: boolean;
  };
  simulation: {
    connected: boolean;
    local: boolean;
    integralMonitorBypass: boolean;
    alert: boolean;
    timestamp: string;
  };
}

export interface Dvor1150EffectiveTransmitter {
  id: Dvor1150TransmitterId;
  enabled: boolean;
  onAir: boolean;
  load: boolean;
  active: boolean;
  outputPower: number;
  voiceModulation: number;
  identModulation: number;
  referenceModulation: number;
  sboRfLevel: number;
  carrierFrequency: number;
  lowerSidebandFrequency: number;
  upperSidebandFrequency: number;
  sidebandPower: number[];
  sidebandVswr: number[];
}

export interface Dvor1150MonitorParameterResult {
  value: number;
  status: Dvor1150ParameterStatus;
  indicator: Dvor1150IndicatorColor;
}

export interface Dvor1150MonitorResult {
  id: Dvor1150MonitorId;
  healthy: boolean;
  controlling: boolean;
  commStatus: Dvor1150IndicatorColor;
  parameters: Record<Dvor1150MonitorParameter, Dvor1150MonitorParameterResult>;
}

export interface Dvor1150SidebarParameter {
  value: number;
  status: Dvor1150ParameterStatus;
}

export interface Dvor1150TransmitterSidebarState {
  main: Dvor1150IndicatorColor;
  antenna: Dvor1150IndicatorColor;
  load: Dvor1150IndicatorColor;
  off: Dvor1150IndicatorColor;
}

export interface Dvor1150RmsStatus {
  maintenanceAlert: boolean;
  onBattery: boolean;
  acFailure: boolean;
  localControlMode: boolean;
  monitorCertificationRunning: boolean;
  groundCheckRunning: boolean;
  testGeneratorRunning: boolean;
  holdCommutatorEnabled: boolean;
}

export interface Dvor1150MaintenanceAlert {
  label: string;
  indicator: Dvor1150IndicatorColor;
}

export interface Dvor1150AdRow {
  parameter: string;
  low: number;
  preLow: number;
  value: number;
  preHigh: number;
  high: number;
  unit: string;
}

export interface Dvor1150VswrRow {
  antenna: number;
  value: number;
  tolerance: number;
  indicator: Dvor1150IndicatorColor;
}

export interface Dvor1150TxPowerRow {
  parameter: string;
  tx1: number;
  tx2: number;
  unit: string;
}

export interface Dvor1150TxFrequencyRow {
  parameter: string;
  tx1: number | null;
  tx2: number | null;
  unit: string;
}

export interface Dvor1150TxVswrRow {
  parameter: string;
  tx1: number | null;
  tx2: number | null;
}

export interface Dvor1150LogEntry {
  timeTag: string;
  user: string;
  message: string;
  severity: Dvor1150IndicatorColor;
}

export interface Dvor1150PmdtData {
  connected: boolean;
  local: boolean;
  alert: boolean;
  timestamp: string;
  transmitters: Record<Dvor1150TransmitterId, Dvor1150TransmitterSidebarState>;
  monitorIntegral: {
    normal: boolean;
    alarm: boolean;
    bypass: boolean;
  };
  sidebarParams: Record<"azimuth" | "hz30Mod" | "hz9960Mod" | "deviation" | "rfLevel", Dvor1150SidebarParameter>;
  rmsStatus: Dvor1150RmsStatus;
  maintenanceAlerts: Dvor1150MaintenanceAlert[];
  adData: Dvor1150AdRow[];
  logs: Dvor1150LogEntry[];
  sidebandVswr: Dvor1150VswrRow[];
  txPower: Dvor1150TxPowerRow[];
  txFrequency: Dvor1150TxFrequencyRow[];
  txVswr: Dvor1150TxVswrRow[];
}

export interface Dvor1150ConfigValidationIssue {
  fieldId: string;
  message: string;
  severity: "error" | "warning";
}

export interface Dvor1150Snapshot {
  data: Dvor1150PmdtData;
  activeTransmitter: Dvor1150TransmitterId | null;
  effectiveTransmitters: Record<Dvor1150TransmitterId, Dvor1150EffectiveTransmitter>;
  monitors: Record<Dvor1150MonitorId, Dvor1150MonitorResult>;
  validation: Dvor1150ConfigValidationIssue[];
}
