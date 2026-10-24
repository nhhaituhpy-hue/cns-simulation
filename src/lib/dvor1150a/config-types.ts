import type { VorIndicatorColor, VorMonitorAntennaConfig, VorMonitorOffsetRow, VorParameterStatus } from "@/lib/vor-types";
import type { DvorKeyerConfiguration, DvorKeyerContext, DvorKeyerProjection } from "./keyer";

/** Session-only instructor observations, separate from station settings and RF. */
export type DvorKeyerObservations = Partial<Record<DvorTransmitterId, Omit<DvorKeyerContext, "role">>>;

export const DVOR_TRANSMITTER_IDS = ["tx1", "tx2"] as const;
export type DvorTransmitterId = (typeof DVOR_TRANSMITTER_IDS)[number];

export const DVOR_MONITOR_IDS = ["mon1", "mon2"] as const;
export type DvorMonitorId = (typeof DVOR_MONITOR_IDS)[number];

export const DVOR_MONITOR_PARAMETERS = [
  "azimuth",
  "hz30Modulation",
  "hz9960Modulation",
  "deviation",
  "rfLevel",
  "identModulation",
  "identStatus",
  "identCode",
  "txPower",
  "txFrequencyError",
  "notchMonitor",
  "sidebandVswr",
] as const;
export type DvorMonitorParameter = (typeof DVOR_MONITOR_PARAMETERS)[number];

export type DvorConfigValue = string | number | boolean | null;
export type DvorAlarmState = "normal" | "warning" | "alarm";
export type DvorTransmitterMode = "main" | "load" | "off";

export interface DvorAlarmBand {
  alarmLow: number;
  preAlarmLow: number;
  nominal: number;
  preAlarmHigh: number;
  alarmHigh: number;
  unit: string;
}

export interface DvorRawMonitorMeasurement {
  azimuth: number;
  hz30Modulation: number;
  hz9960Modulation: number;
  deviation: number;
  rfLevel: number;
  identModulation: number;
  identStatus: "Normal" | "No Ident" | "Continuous Ident";
  identCode: string;
  txFrequencyError: number;
  notchMonitor: number;
  sidebandVswr: number[];
}

export interface DvorMonitorCalibration {
  azimuthOffset: number;
  hz30ModulationScale: number;
  hz9960ModulationScale: number;
  deviationScale: number;
  rfLevelOffset: number;
  identModulationScale: number;
  txPowerScale: number;
  txPowerOffset: number;
  txFrequencyErrorOffset: number;
  notchScale: number;
  oddAntennaReturnLossOffset: number;
  evenAntennaReturnLossOffset: number;
}

export interface DvorMonitorRouting {
  primary: boolean;
  secondary: boolean;
}

export type DvorTestGeneratorCalibration = Pick<DvorMonitorCalibration,
  "azimuthOffset" | "hz30ModulationScale" | "hz9960ModulationScale" | "deviationScale"
  | "identModulationScale">;

export interface DvorTestGeneratorConfig {
  azimuth: number;
  hz30Modulation: number;
  hz9960Modulation: number;
  deviation: number;
  identModulation: number;
  identStatus: DvorRawMonitorMeasurement["identStatus"];
  audioModulation: number;
  audioFrequency: number;
}

export interface DvorMonitorConfig {
  rawMeasurements: Record<DvorMonitorId, DvorRawMonitorMeasurement>;
  alarmLimits: Record<Exclude<DvorMonitorParameter, "azimuth" | "identStatus" | "identCode" | "notchMonitor" | "sidebandVswr">, DvorAlarmBand>;
  azimuthLimits: { preAlarm: number; alarm: number };
  timers: { shutdown: number; continuousIdent: number; noIdent: number };
  antennas: Record<DvorMonitorId, VorMonitorAntennaConfig & {
    secondAntennaEnabled: boolean;
    secondInputAttenuation: number;
    secondAzimuthAngle: number;
  }>;
  calibration: Record<DvorMonitorId, DvorMonitorCalibration>;
  routing: Record<DvorMonitorParameter, DvorMonitorRouting>;
  /** Additive v1 extension; absent in profiles saved before certification editing. */
  testGeneratorCalibration?: Record<DvorMonitorId, DvorTestGeneratorCalibration>;
  testGenerator?: DvorTestGeneratorConfig;
  standbyCalibration?: Record<DvorMonitorId, Pick<DvorMonitorCalibration, "txPowerScale" | "txPowerOffset" | "txFrequencyErrorOffset">>;
  votingLogic: "AND" | "OR";
  transfer: "on Primary Alarm" | "on Any Alarm" | "disabled";
  sidebandVswr: {
    numberAntennasInAlarm: number;
    preAlarm: number;
    alarm: number;
  };
  notchTolerance: number;
  integrity: {
    enabled: boolean;
    maxConsecutiveFailures: number;
  };
}

export interface DvorTransmitterNominal extends DvorKeyerConfiguration {
  azimuthIndex: number;
  outputPower: number;
  voiceModulation: number;
  identModulation: number;
  referenceModulation: number;
  sboRfLevel: number;
  mainIdentCode: string;
  standbyIdentCode: string;
  keyerMode: "disabled" | "external";
}

export interface DvorTransmitterOffsets {
  azimuthAngleOffset: number;
  outputPowerScale: number;
  voiceModulationScale: number;
  identModulationScale: number;
  referenceModulationScale: number;
  carrierPllControl: number;
  carrierSidebandPhaseOffsetCoarse: number;
  carrierSidebandPhaseOffsetFine: number;
  sideband1PhaseOffset: number;
  sideband2PhaseOffset: number;
  sideband3PhaseOffset: number;
  sideband4PhaseOffset: number;
  txSidebandRfLevelScale: number;
  sideband1RfLevelScale: number;
  sideband2RfLevelScale: number;
  sideband3RfLevelScale: number;
  sideband4RfLevelScale: number;
  sideband1VswrOffset: number;
  sideband2VswrOffset: number;
  sideband3VswrOffset: number;
  sideband4VswrOffset: number;
}

export interface DvorTransmitterConfig {
  enabled: boolean;
  onAir: boolean;
  load: boolean;
  frequencyErrorPpm: number;
  nominal: DvorTransmitterNominal;
  offsets: DvorTransmitterOffsets;
  vswr: { carrier: number; sidebands: number[] };
  faults: {
    disabled: boolean;
    carrierVswr: boolean;
    overtemperature: boolean;
    frequencyError: boolean;
  };
}

export interface Dvor1150aConfig {
  station: {
    stationDescription: string;
    frequencyMHz: number;
    stationType: "DVOR";
    transmitterConfig: "Dual Transmitters" | "Single Transmitter";
    monitorConfig: "Dual Monitors" | "Single Monitor";
  };
  transmitters: Record<DvorTransmitterId, DvorTransmitterConfig>;
  monitor: DvorMonitorConfig;
  simulation: {
    connected: boolean;
    local: boolean;
    integralMonitorBypass: boolean;
    alert: boolean;
    timestamp: string;
  };
}

export interface DvorEffectiveTransmitter {
  id: DvorTransmitterId;
  enabled: boolean;
  onAir: boolean;
  load: boolean;
  effectiveAzimuthIndex: number;
  effectiveOutputPower: number;
  effectiveVoiceModulation: number;
  effectiveIdentModulation: number;
  effectiveReferenceModulation: number;
  effectiveSboRfLevel: number;
  identCode: string;
  carrierFrequencyMHz: number;
  sidebandPower: number[];
  carrierVswr: number;
  sidebandVswr: number[];
  status: VorIndicatorColor;
}

export interface DvorMonitorParameterResult {
  value: number | string;
  unit: string;
  /** Detector limit violation before Primary/Secondary colour projection. */
  executiveAlarm?: boolean;
  status: DvorAlarmState;
  indicator: VorIndicatorColor;
}

export interface DvorMonitorResult {
  id: DvorMonitorId;
  enabled: boolean;
  healthy: boolean;
  primaryAlarm: boolean;
  secondaryAlarm: boolean;
  parameters: Record<DvorMonitorParameter, DvorMonitorParameterResult>;
  sidebandVswr: number[];
}

export interface DvorIntegrityTestResult {
  lowLimitLowTest: number;
  lowLimitHighTest: number;
  highLimitLowTest: number;
  highLimitHighTest: number;
}

export interface DvorGroundCheckResult {
  stationErrors: number[];
  errorSpread: number;
  quadrantal: { amplitude: number; phase: number };
  octantal: { amplitude: number; phase: number };
  bias: number;
}

export interface DvorVotingResult {
  logic: "AND" | "OR";
  primaryHealthy: boolean;
  secondaryHealthy: boolean;
  systemHealthy: boolean;
  transferRequested: boolean;
  activeTransmitter: DvorTransmitterId | null;
}

export interface Dvor1150aSnapshot {
  data: import("@/lib/vor-types").VorPmdtData;
  /** Logical Main selection; it can remain TX1 while the antenna is on TX2 after an automatic transfer. */
  mainTransmitter: DvorTransmitterId | null;
  effectiveTransmitters: Record<DvorTransmitterId, DvorEffectiveTransmitter>;
  transmitterStatus: Record<DvorTransmitterId, Pick<import("@/lib/vor-types").VorPmdtData, "txSystemAlerts" | "txCarrierPaAlerts" | "txSynthesizerAlerts" | "txSidebandPaAlerts">>;
  keyers: Record<DvorTransmitterId, DvorKeyerProjection>;
  monitors: Record<DvorMonitorId, DvorMonitorResult>;
  /** Measurement annunciation, independent of relay voting and Bypass. */
  monitorAnnunciation: { preAlarm: boolean; alarm: boolean };
  monitorOffsets: Record<DvorMonitorId, VorMonitorOffsetRow[]>;
  groundChecks: Record<DvorTransmitterId, DvorGroundCheckResult>;
  testGeneratorResults: Record<DvorMonitorId, { azimuth: number; hz30Modulation: number; hz9960Modulation: number; deviation: number; identModulation: number }>;
  standbyMonitors: Record<DvorMonitorId, { transmitter: DvorTransmitterId | null; txPower: number; txFrequencyError: number }>;
  voting: DvorVotingResult;
  integrity: Record<"30HzModulation" | "9960HzModulation" | "9960HzDeviation" | "RFLevel" | "TxPower" | "TxFrequencyError" | "IdentModulation", DvorIntegrityTestResult>;
  validation: DvorConfigValidationIssue[];
}

export interface DvorConfigValidationIssue {
  fieldId: string;
  message: string;
  severity: "error" | "warning";
}

export function dvorAlarmToIndicator(state: DvorAlarmState): VorIndicatorColor {
  if (state === "alarm") return "red";
  if (state === "warning") return "yellow";
  return "green";
}

export function dvorAlarmToParameterStatus(state: DvorAlarmState): VorParameterStatus {
  if (state === "alarm") return "alarm";
  if (state === "warning") return "warning";
  return "normal";
}
