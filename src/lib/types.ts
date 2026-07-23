import type {
  HardwareComponent,
  HardwareFaultType,
  SignalPath,
} from "./hardware-model";
export const SENSOR_STATUSES = [
  "green",
  "orange",
  "yellow",
  "red",
  "turquoise",
  "magenta",
  "grey",
] as const;

export type SensorStatus = (typeof SENSOR_STATUSES)[number];
export type SensorLabel = "A" | "B";
export type LoginUser = "sysadmin" | "maintenance";
export type ScenarioDifficulty = "easy" | "medium" | "hard";

export interface SensorVoltages {
  v3_3: number;
  v5: number;
  v12: number;
}

export interface SensorMonitoringData {
  lastSnmpResponseAt: string;
  temperatureC: number;
  cpuLoadPercent: number;
  voltages: SensorVoltages;
  receiverConfidencePercent: number;
  crcErrorCount: number;
  gpsStatus: "synchronized" | "unsynchronized" | "unavailable";
}

export interface SensorState {
  id: string;
  sensorLabel: SensorLabel;
  status: SensorStatus;
  ipAddress: string;
  name: string;
  monitoring?: SensorMonitoringData;
  dataProfile?: SensorDataProfile;
}

export interface SiteState {
  id: string;
  name: string;
  sensorA: SensorState | null;
  sensorB: SensorState | null;
}

export interface QcmsEvent {
  timestamp: string;
  type: "snmp" | "qcms" | "selfmon" | "error" | "line";
  message: string;
}

export type RecordedActionKind =
  | "menu-selection"
  | "value-input"
  | "authentication";

export interface RecordedAction {
  step: number;
  kind: RecordedActionKind;
  menuId: string;
  menuTitle: string;
  input: string;
  resultLabel: string;
  timestamp: number;
}

export interface ScenarioHardwareFault {
  faultyComponentIds: string[];
  faultType: HardwareFaultType;
  faultDescription: string;
  hardwareLayout: HardwareComponent[];
  signalPaths: SignalPath[];
  expectedSensorStatus: SensorStatus;
  terminalSymptoms: string[];
  qcmsSymptoms: string[];
  diagnosticSteps: string[];
}

export type RecordableAction = Omit<RecordedAction, "step" | "timestamp">;

export interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: ScenarioDifficulty;
  createdAt: string;
  updatedAt?: string;
  sites: SiteState[];
  eventLog?: QcmsEvent[];
  targetSensorId: string;
  targetLoginUser: LoginUser;
  hardwareFault?: ScenarioHardwareFault;
  expectedActions: RecordedAction[];
}

export type StepComparisonStatus =
  | "correct"
  | "incorrect"
  | "missing"
  | "redundant";

export interface StepComparison {
  stepNumber: number;
  expected: RecordedAction | null;
  submitted: RecordedAction | null;
  status: StepComparisonStatus;
}

export interface GradingResult {
  passed: boolean;
  score: number;
  correctSteps: number;
  totalExpected: number;
  totalSubmitted: number;
  steps: StepComparison[];
}

export interface HardwareSelectionResult {
  exactMatch: boolean;
  expectedComponentIds: string[];
  submittedComponentIds: string[];
  correctComponentIds: string[];
  missedComponentIds: string[];
  extraComponentIds: string[];
  score: number;
}

export interface CombinedGradingResult {
  passed: boolean;
  score: number;
  authenticatedCorrectly: boolean;
  terminalScore: number;
  terminalResult: GradingResult;
  hardwareResult: HardwareSelectionResult;
}

export interface NetworkConfig {
  ip: string;
  subnet: string;
  gateway: string;
  dhcp: boolean;
  macAddress: string;
  ntpServer: string;
  bitRate: string;
}

export interface ReceiverStats {
  shortSquitter: { total: number; passed: number; failed: number };
  extendedSquitter: { total: number; passed: number; failed: number };
  totalTargetsDetected: number;
  currentTargets: number;
}

export interface SurveillanceClient {
  id: number;
  name: string;
  ip: string;
  port: number;
  protocol: "UDP" | "TCP";
  messageType: string;
  enabled: boolean;
  messagesSent: number;
}

export interface SnmpUserConfig {
  name: string;
  authType: "noAuth" | "authNoPriv" | "authPriv";
}

export interface SnmpTrapDest {
  ip: string;
  port: number;
  enabled: boolean;
}

export interface GpsConfig {
  enabled: boolean;
  ntpEnabled: boolean;
  ntpServer: string;
  latitude: string;
  longitude: string;
  altitude: string;
  deviation: string;
}

export interface FilterConfig {
  altitudeEnabled: boolean;
  altitudeMin: number;
  altitudeMax: number;
  addressFilterEnabled: boolean;
  addressFilter: string;
  positionFilterEnabled: boolean;
  positionFilterRadius: number;
}

export interface AsterixConfig {
  sac: number;
  sic: number;
  cat21Version: string;
  cat21Enabled: boolean;
  nonOpEnabled: boolean;
  mlatEnabled: boolean;
  rawEnabled: boolean;
  dataBlockSize: number;
  ttl: number;
}

export interface GeneralSettings {
  crcCorrection: boolean;
  groundTargets: boolean;
  targetOverloadLimit: number;
}

export interface SyslogConfig {
  localDestination: string;
  remoteEnabled: boolean;
  remoteServerIp: string;
}

export interface SiteMonitorConfig {
  enabled: boolean;
  ip: string;
  port: number;
  name: string;
}

export interface SensorDataProfile {
  sensorVersion: string;
  configVersion: string;
  sensorName: string;
  operationMode?: "OPERATIONAL" | "MAINTENANCE";
  endToEnd?: {
    alertPower: number;
    failurePower: number;
    interrogationPeriodMs: number;
    replyDelayNs: number;
  };
  network: NetworkConfig;
  receiverStats: ReceiverStats;
  clients: SurveillanceClient[];
  snmpUsers: SnmpUserConfig[];
  snmpTraps: SnmpTrapDest[];
  snmpHeartbeatPeriod: number;
  snmpAlarmPeriod: number;
  gps: GpsConfig;
  filters: FilterConfig;
  asterix: AsterixConfig;
  general: GeneralSettings;
  syslog: SyslogConfig;
  siteMonitors: SiteMonitorConfig[];
}

