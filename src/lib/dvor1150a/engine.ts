import { cloneDefaultVorPmdtData } from "@/lib/vor-pmdt-defaults";
import type {
  VorAlarmLimitRow,
  VorIndicatorColor,
  VorIntegralDataRow,
  VorMonitorOffsetRow,
  VorParameterStatus,
  VorPmdtData,
  VorTxConfigNominal,
  VorTxDualValueRow,
  VorTxFrequencyRow,
  VorTxVswrRow,
} from "@/lib/vor-types";
import {
  DVOR_MONITOR_IDS,
  DVOR_MONITOR_PARAMETERS,
  DVOR_TRANSMITTER_IDS,
  dvorAlarmToIndicator,
  type Dvor1150aConfig,
  type Dvor1150aSnapshot,
  type DvorAlarmBand,
  type DvorAlarmState,
  type DvorConfigValidationIssue,
  type DvorEffectiveTransmitter,
  type DvorGroundCheckResult,
  type DvorIntegrityTestResult,
  type DvorMonitorId,
  type DvorMonitorParameter,
  type DvorMonitorParameterResult,
  type DvorMonitorResult,
  type DvorTransmitterId,
} from "./config-types";
import { createDefaultDvor1150aConfig, testGeneratorDvor1150aCalibration } from "./defaults";

const monitorParameterLabels: Record<DvorMonitorParameter, string> = {
  azimuth: "Azimuth",
  hz30Modulation: "30 Hz Modulation",
  hz9960Modulation: "9960 Hz Modulation",
  deviation: "9960 Hz Deviation",
  rfLevel: "RF Level",
  identModulation: "Ident Modulation",
  identStatus: "Ident Status",
  identCode: "Ident Code",
  txPower: "Tx Power",
  txFrequencyError: "Tx Frequency Error",
  notchMonitor: "Notch Monitor",
  sidebandVswr: "Sideband VSWR",
};

const monitorParameterUnits: Record<DvorMonitorParameter, string> = {
  azimuth: "°",
  hz30Modulation: "%",
  hz9960Modulation: "%",
  deviation: "Ratio",
  rfLevel: "dB",
  identModulation: "%",
  identStatus: "",
  identCode: "",
  txPower: "Watts",
  txFrequencyError: "ppm",
  notchMonitor: "dB",
  sidebandVswr: ":1",
};

const numericLimitParameters = [
  "hz30Modulation",
  "hz9960Modulation",
  "deviation",
  "rfLevel",
  "identModulation",
  "txPower",
  "txFrequencyError",
] as const;

type NumericLimitParameter = (typeof numericLimitParameters)[number];

const alarmLimitParameters: readonly NumericLimitParameter[] = [
  "hz30Modulation",
  "hz9960Modulation",
  "deviation",
  "rfLevel",
  "txPower",
  "txFrequencyError",
  "identModulation",
];

// The reference PMDT's antenna VSWR profile is a 48-antenna measurement. The
// transmitter VSWR values are the source-side four-sideband measurements, so
// a change in transmitter VSWR is reflected across the antenna profile by the
// change from the reference transmitter average. Keeping the reference value
// explicit preserves the screenshot defaults while still making the screens
// respond to transmitter configuration changes.
const referenceTransmitterSidebandVswr = (1.11 + 1.17 + 1.08 + 1.11) / 4;
const groundCheckAzimuths = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function formatValue(value: number, digits: number): string {
  return value.toFixed(digits);
}

function formatMonitorValue(parameter: DvorMonitorParameter, value: number | string): string {
  if (typeof value === "string") return value;
  if (parameter === "azimuth") return formatValue(value, 2);
  if (parameter === "deviation") return formatValue(value, 2);
  if (parameter === "txPower") return formatValue(value, 1);
  if (parameter === "txFrequencyError") return formatValue(value, 0);
  return formatValue(value, 1);
}

function statusForValue(value: number, limits: DvorAlarmBand): DvorAlarmState {
  if (value <= limits.alarmLow || value >= limits.alarmHigh) return "alarm";
  if (value <= limits.preAlarmLow || value >= limits.preAlarmHigh) return "warning";
  return "normal";
}

function statusForAzimuth(value: number, nominal: number, limits: Dvor1150aConfig["monitor"]["azimuthLimits"]): DvorAlarmState {
  const delta = Math.abs(value - nominal);
  if (delta >= limits.alarm) return "alarm";
  if (delta >= limits.preAlarm) return "warning";
  return "normal";
}

function statusForText(parameter: "identStatus" | "identCode", value: string): DvorAlarmState {
  if (parameter === "identStatus") return value === "Normal" ? "normal" : "alarm";
  return value.trim().length >= 2 ? "normal" : "alarm";
}

function statusForVswr(values: number[], config: Dvor1150aConfig["monitor"]["sidebandVswr"]): DvorAlarmState {
  const alarmCount = values.filter((value) => value >= config.alarm).length;
  if (alarmCount >= config.numberAntennasInAlarm) return "alarm";
  if (values.some((value) => value >= config.preAlarm)) return "warning";
  return "normal";
}

function statusForNotchMonitor(
  config: Dvor1150aConfig,
  monitorId: DvorMonitorId,
  baselineRows: VorPmdtData["notchData"],
): DvorAlarmState {
  const rawScale = config.monitor.rawMeasurements[monitorId].notchMonitor / 100;
  const calibrationScale = config.monitor.calibration[monitorId].notchScale / 100;
  const maximumDeviation = baselineRows.reduce((maximum, row) => {
    const baseline = Math.max(Math.abs(row.baseline), 1);
    const current = row[monitorId] * rawScale * calibrationScale;
    return Math.max(maximum, Math.abs(current - row.baseline) / baseline * 100);
  }, 0);
  return maximumDeviation >= config.monitor.notchTolerance ? "alarm" : "normal";
}

function isInstalledMonitor(config: Dvor1150aConfig, monitorId: DvorMonitorId): boolean {
  return config.station.monitorConfig !== "Single Monitor" || monitorId === "mon1";
}

function effectiveIdentCode(config: Dvor1150aConfig, transmitterId: DvorTransmitterId): string {
  const nominal = config.transmitters[transmitterId].nominal;
  // The standby transmitter must keep the station identification after a
  // transfer. "Different Ident" remains an explicit training override; the
  // normal "Same as Main Ident" route takes TX1's station-ident source.
  if (transmitterId === "tx2" && nominal.standbyIdentCode === "Same as Main Ident") {
    return config.transmitters.tx1.nominal.mainIdentCode;
  }
  return nominal.mainIdentCode;
}

function effectiveTransmitter(
  config: Dvor1150aConfig,
  transmitterId: DvorTransmitterId,
): DvorEffectiveTransmitter {
  // The manual describes the nominal CSB output setting as also affecting the
  // SBO level proportionally. Keep the reference at the supplied station
  // setting so the default PMDT values remain aligned with the sample screen.
  const referenceNominalOutputPower = 70;
  const tx = config.transmitters[transmitterId];
  const nominal = tx.nominal;
  const offsets = tx.offsets;
  // A single-transmitter station keeps TX2's stored settings for a later
  // return to dual operation, but TX2 must not contribute an on-air/load
  // route or any live measurement while that station mode is active.
  const enabled = tx.enabled
    && !tx.faults.disabled
    && !(config.station.transmitterConfig === "Single Transmitter" && transmitterId === "tx2");
  const onAir = tx.onAir && enabled;
  const load = tx.load && !onAir && enabled;
  const effectiveOutputPower = enabled ? nominal.outputPower * offsets.outputPowerScale / 100 : 0;
  const effectiveVoiceModulation = enabled ? nominal.voiceModulation * offsets.voiceModulationScale / 100 : 0;
  const effectiveIdentModulation = enabled ? nominal.identModulation * offsets.identModulationScale / 100 : 0;
  const effectiveReferenceModulation = enabled ? nominal.referenceModulation * offsets.referenceModulationScale / 100 : 0;
  const effectiveSboRfLevel = enabled
    ? nominal.sboRfLevel
      * (nominal.outputPower / referenceNominalOutputPower)
      * offsets.txSidebandRfLevelScale / 100
    : 0;
  const sidebandScale = [
    offsets.sideband1RfLevelScale,
    offsets.sideband2RfLevelScale,
    offsets.sideband3RfLevelScale,
    offsets.sideband4RfLevelScale,
  ];
  const sidebandPower = onAir
    ? sidebandScale.map((scale) => {
        // The individual sideband RF level settings are voltage scale
        // factors: 70.7% therefore produces approximately 50% power.
        const voltageScale = scale / 100;
        return effectiveSboRfLevel
          * voltageScale ** 2
          / 41;
      })
    : [0, 0, 0, 0];
  const carrierFrequencyMHz = config.station.frequencyMHz * (1 + tx.frequencyErrorPpm / 1_000_000);
  const txHasFault = tx.faults.carrierVswr || tx.faults.overtemperature || tx.faults.frequencyError;
  const status: VorIndicatorColor = !enabled || txHasFault ? "red" : onAir || load ? "green" : "gray";
  const sidebandVswrOffsets = [
    offsets.sideband1VswrOffset,
    offsets.sideband2VswrOffset,
    offsets.sideband3VswrOffset,
    offsets.sideband4VswrOffset,
  ];

  return {
    id: transmitterId,
    enabled,
    onAir,
    load,
    effectiveAzimuthIndex: nominal.azimuthIndex + offsets.azimuthAngleOffset,
    effectiveOutputPower,
    effectiveVoiceModulation,
    effectiveIdentModulation,
    effectiveReferenceModulation,
    effectiveSboRfLevel,
    identCode: effectiveIdentCode(config, transmitterId),
    carrierFrequencyMHz,
    sidebandPower,
    carrierVswr: tx.faults.carrierVswr ? 3 : Math.max(1, tx.vswr.carrier),
    sidebandVswr: tx.faults.carrierVswr
      ? tx.vswr.sidebands.map((value) => Math.max(value, 3))
      : tx.vswr.sidebands.map((value, index) => Math.max(1, value + sidebandVswrOffsets[index])),
    status,
  };
}

function chooseActiveTransmitter(
  transmitters: Record<DvorTransmitterId, DvorEffectiveTransmitter>,
): DvorTransmitterId | null {
  return DVOR_TRANSMITTER_IDS.find((id) => transmitters[id].onAir) ?? null;
}

const referenceSidebandSettings: Record<DvorTransmitterId, { sboRfLevel: number; phaseCoarse: number; phaseFine: number }> = {
  tx1: { sboRfLevel: 62.075, phaseCoarse: 180, phaseFine: 33 },
  tx2: { sboRfLevel: 61.75, phaseCoarse: 90, phaseFine: -16 },
};

// Training-model calibration: preserve the reference snapshot at the default
// 0% voice modulation while matching the established DVOR 1150 response.
const voiceToDeviationFactor = 0.12;

function wrapPhaseDegrees(value: number): number {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

/**
 * The manual tunes SBO RF level and carrier-to-sideband phase against the
 * monitor's 9960 Hz reading.  This calibrated relationship keeps the supplied
 * PMDT reference value unchanged while exposing both tuning controls in the
 * simulator.
 */
function sidebandModulationAdjustment(
  config: Dvor1150aConfig,
  transmitter: DvorEffectiveTransmitter,
): number {
  const offsets = config.transmitters[transmitter.id].offsets;
  const reference = referenceSidebandSettings[transmitter.id];
  const phaseError = wrapPhaseDegrees(
    offsets.carrierSidebandPhaseOffsetCoarse
      - reference.phaseCoarse
      + offsets.carrierSidebandPhaseOffsetFine
      - reference.phaseFine,
  );
  const phaseEfficiency = Math.cos((phaseError * Math.PI) / 180);
  const sboRfAdjustment = (transmitter.effectiveSboRfLevel - reference.sboRfLevel) * 0.12;
  const phaseAdjustment = (phaseEfficiency - 1) * 2;
  return sboRfAdjustment + phaseAdjustment;
}

function sourceMeasurement(
  config: Dvor1150aConfig,
  monitorId: DvorMonitorId,
  transmitter: DvorEffectiveTransmitter | null,
): Record<DvorMonitorParameter, number | string | number[]> {
  const raw = config.monitor.rawMeasurements[monitorId];
  const antenna = config.monitor.antennas[monitorId];
  const calibration = config.monitor.calibration[monitorId];
  const txAzimuthDelta = transmitter ? transmitter.effectiveAzimuthIndex - 5 : 0;
  const referenceDelta = transmitter ? transmitter.effectiveReferenceModulation - 27.72 : 0;
  const identDelta = transmitter ? transmitter.effectiveIdentModulation - 8 : 0;
  const sboDelta = transmitter ? transmitter.effectiveSboRfLevel - 62.075 : 0;
  const voiceDeviationDelta = transmitter
    ? transmitter.effectiveVoiceModulation * voiceToDeviationFactor
    : 0;
  const effectiveDefaultOutputPower = 70 * 84 / 100;
  const monitorReferencePower = 70.8 / 0.99;
  const inputAttenuationDelta = 14 - antenna.inputAttenuation;
  const primaryAzimuth = raw.azimuth + txAzimuthDelta;
  const primaryRfLevel = raw.rfLevel + sboDelta * 0.02 + inputAttenuationDelta;
  // The manual allows a second field-monitor antenna with its own radial and
  // input attenuation.  The simulator represents the two receiver paths as
  // an equal-weight measurement; the default (antenna 2 disabled) remains
  // exactly the supplied reference trace.
  const secondAntennaEnabled = antenna.secondAntennaEnabled;
  const secondAzimuth = primaryAzimuth + (antenna.secondAzimuthAngle - antenna.azimuthAngle);
  const secondRfLevel = raw.rfLevel + sboDelta * 0.02 + (14 - antenna.secondInputAttenuation);
  const measuredAzimuth = secondAntennaEnabled
    ? (primaryAzimuth + secondAzimuth) / 2
    : primaryAzimuth;
  const measuredRfLevel = secondAntennaEnabled
    ? (primaryRfLevel + secondRfLevel) / 2
    : primaryRfLevel;
  const sidebandVswrDelta = transmitter
    ? transmitter.sidebandVswr.reduce((total, value) => total + value, 0) / transmitter.sidebandVswr.length - referenceTransmitterSidebandVswr
    : 0;

  return {
    azimuth: measuredAzimuth,
    hz30Modulation: raw.hz30Modulation + referenceDelta,
    hz9960Modulation: raw.hz9960Modulation + referenceDelta + (transmitter ? sidebandModulationAdjustment(config, transmitter) : 0),
    deviation: raw.deviation + sboDelta * 0.01 + voiceDeviationDelta,
    rfLevel: measuredRfLevel,
    identModulation: raw.identModulation + identDelta * 0.9,
    identStatus: transmitter?.id && config.transmitters[transmitter.id].faults.frequencyError ? "No Ident" : raw.identStatus,
    identCode: transmitter?.identCode ?? raw.identCode,
    txPower: transmitter
      ? monitorReferencePower * transmitter.effectiveOutputPower / effectiveDefaultOutputPower
      : 0,
    txFrequencyError: transmitter?.id ? config.transmitters[transmitter.id].frequencyErrorPpm : raw.txFrequencyError,
    notchMonitor: raw.notchMonitor,
    sidebandVswr: raw.sidebandVswr.map((value, index) => {
      const returnLossOffset = index % 2 === 0
        ? calibration.oddAntennaReturnLossOffset
        : calibration.evenAntennaReturnLossOffset;
      return clamp(value + sidebandVswrDelta + returnLossOffset, 1, 10);
    }),
  };
}

function calibratedMeasurement(
  config: Dvor1150aConfig,
  monitorId: DvorMonitorId,
  source: Record<DvorMonitorParameter, number | string | number[]>,
): Record<DvorMonitorParameter, number | string | number[]> {
  const calibration = config.monitor.calibration[monitorId];
  return {
    azimuth: Number(source.azimuth) + calibration.azimuthOffset,
    hz30Modulation: Number(source.hz30Modulation) * calibration.hz30ModulationScale / 100,
    hz9960Modulation: Number(source.hz9960Modulation) * calibration.hz9960ModulationScale / 100,
    deviation: Number(source.deviation) * calibration.deviationScale / 100,
    rfLevel: Number(source.rfLevel) + calibration.rfLevelOffset,
    identModulation: Number(source.identModulation) * calibration.identModulationScale / 100,
    identStatus: source.identStatus,
    identCode: source.identCode,
    txPower: Number(source.txPower) * calibration.txPowerScale / 100 + calibration.txPowerOffset,
    txFrequencyError: Number(source.txFrequencyError) + calibration.txFrequencyErrorOffset,
    notchMonitor: Number(source.notchMonitor) * calibration.notchScale / 100,
    sidebandVswr: [...(source.sidebandVswr as number[])],
  };
}

function monitorResult(
  config: Dvor1150aConfig,
  monitorId: DvorMonitorId,
  transmitter: DvorEffectiveTransmitter | null,
  notchBaselineRows: VorPmdtData["notchData"],
): DvorMonitorResult {
  const antenna = config.monitor.antennas[monitorId];
  const enabled = antenna.enabled && isInstalledMonitor(config, monitorId);
  const calibrated = calibratedMeasurement(config, monitorId, sourceMeasurement(config, monitorId, transmitter));
  const nominalAzimuth = antenna.secondAntennaEnabled
    ? (antenna.azimuthAngle + antenna.secondAzimuthAngle) / 2
    : antenna.azimuthAngle;
  const statuses: Record<DvorMonitorParameter, DvorMonitorParameterResult> = {
    azimuth: {
      value: Number(calibrated.azimuth),
      unit: monitorParameterUnits.azimuth,
      status: statusForAzimuth(Number(calibrated.azimuth), nominalAzimuth, config.monitor.azimuthLimits),
      indicator: "green",
    },
    hz30Modulation: { value: Number(calibrated.hz30Modulation), unit: monitorParameterUnits.hz30Modulation, status: "normal", indicator: "green" },
    hz9960Modulation: { value: Number(calibrated.hz9960Modulation), unit: monitorParameterUnits.hz9960Modulation, status: "normal", indicator: "green" },
    deviation: { value: Number(calibrated.deviation), unit: monitorParameterUnits.deviation, status: "normal", indicator: "green" },
    rfLevel: { value: Number(calibrated.rfLevel), unit: monitorParameterUnits.rfLevel, status: "normal", indicator: "green" },
    identModulation: { value: Number(calibrated.identModulation), unit: monitorParameterUnits.identModulation, status: "normal", indicator: "green" },
    identStatus: { value: String(calibrated.identStatus), unit: monitorParameterUnits.identStatus, status: "normal", indicator: "green" },
    identCode: { value: String(calibrated.identCode), unit: monitorParameterUnits.identCode, status: "normal", indicator: "green" },
    txPower: { value: Number(calibrated.txPower), unit: monitorParameterUnits.txPower, status: "normal", indicator: "green" },
    txFrequencyError: { value: Number(calibrated.txFrequencyError), unit: monitorParameterUnits.txFrequencyError, status: "normal", indicator: "green" },
    notchMonitor: { value: Number(calibrated.notchMonitor), unit: monitorParameterUnits.notchMonitor, status: "normal", indicator: "green" },
    sidebandVswr: { value: Number((calibrated.sidebandVswr as number[]).reduce((max, value) => Math.max(max, value), 0)), unit: monitorParameterUnits.sidebandVswr, status: "normal", indicator: "green" },
  };

  for (const parameter of numericLimitParameters) {
    const limits = config.monitor.alarmLimits[parameter];
    const state = statusForValue(Number(calibrated[parameter]), limits);
    statuses[parameter] = {
      ...statuses[parameter],
      status: state,
      indicator: dvorAlarmToIndicator(state),
    };
  }

  const azimuthState = statuses.azimuth.status;
  statuses.azimuth.indicator = dvorAlarmToIndicator(azimuthState);
  const identStatusState = statusForText("identStatus", String(calibrated.identStatus));
  statuses.identStatus = {
    ...statuses.identStatus,
    status: identStatusState,
    indicator: dvorAlarmToIndicator(identStatusState),
  };
  const identCodeState = statusForText("identCode", String(calibrated.identCode));
  statuses.identCode = {
    ...statuses.identCode,
    status: identCodeState,
    indicator: dvorAlarmToIndicator(identCodeState),
  };
  const notchAlarmState = statusForNotchMonitor(config, monitorId, notchBaselineRows);
  const notchRoute = config.monitor.routing.notchMonitor;
  const notchState: DvorAlarmState = notchAlarmState === "alarm"
    ? notchRoute.primary
      ? "alarm"
      : notchRoute.secondary
        ? "warning"
        : "normal"
    : "normal";
  statuses.notchMonitor = {
    ...statuses.notchMonitor,
    status: notchState,
    indicator: dvorAlarmToIndicator(notchState),
  };
  const sidebandValues = calibrated.sidebandVswr as number[];
  const sidebandState = statusForVswr(sidebandValues, config.monitor.sidebandVswr);
  statuses.sidebandVswr = {
    ...statuses.sidebandVswr,
    status: sidebandState,
    indicator: dvorAlarmToIndicator(sidebandState),
  };

  const routedParameters = DVOR_MONITOR_PARAMETERS.filter(
    (parameter) => monitorId === "mon1"
      ? config.monitor.routing[parameter].primary
      : config.monitor.routing[parameter].secondary,
  );
  const healthy = enabled && routedParameters.every((parameter) => statuses[parameter].status !== "alarm");

  return { id: monitorId, enabled, healthy, parameters: statuses, sidebandVswr: sidebandValues };
}

function toParameterStatus(indicator: VorIndicatorColor): VorParameterStatus {
  if (indicator === "red") return "alarm";
  if (indicator === "yellow") return "warning";
  return "normal";
}

function buildIntegralData(
  monitors: Record<DvorMonitorId, DvorMonitorResult>,
  activeTransmitter: DvorEffectiveTransmitter | null,
): VorIntegralDataRow[] {
  const rows = [
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
  ].map((parameter) => {
    const key = parameter as Exclude<DvorMonitorParameter, "notchMonitor" | "sidebandVswr">;
    const mon1 = monitors.mon1.parameters[key];
    const mon2 = monitors.mon2.parameters[key];
    return {
      label: monitorParameterLabels[key],
      mon1Value: typeof mon1.value === "string" ? mon1.value : formatMonitorValue(key, mon1.value),
      mon1Status: mon1.indicator,
      mon2Value: typeof mon2.value === "string" ? mon2.value : formatMonitorValue(key, mon2.value),
      mon2Status: mon2.indicator,
      unit: mon1.unit,
    };
  });
  const txFrequencyRow: VorIntegralDataRow = {
    label: "Tx Frequency",
    mon1Value: activeTransmitter ? formatValue(activeTransmitter.carrierFrequencyMHz, 4) : "0.0000",
    mon1Status: activeTransmitter ? "green" : "red",
    mon2Value: activeTransmitter ? formatValue(activeTransmitter.carrierFrequencyMHz, 4) : "0.0000",
    mon2Status: activeTransmitter ? "green" : "red",
    unit: "MHz",
  };
  return [...rows.slice(0, 9), txFrequencyRow, rows[9]];
}

function buildAlarmLimits(config: Dvor1150aConfig): VorAlarmLimitRow[] {
  return alarmLimitParameters.map((parameter) => {
    const band = config.monitor.alarmLimits[parameter];
    return {
      parameter: monitorParameterLabels[parameter],
      alarmLow: band.alarmLow,
      preAlarmLow: band.preAlarmLow,
      nominal: band.nominal,
      preAlarmHigh: band.preAlarmHigh,
      alarmHigh: band.alarmHigh,
      unit: band.unit,
    };
  });
}

function buildMonitorOffsets(config: Dvor1150aConfig, monitorId: DvorMonitorId): VorMonitorOffsetRow[] {
  const calibration = config.monitor.calibration[monitorId];
  const testGen = testGeneratorDvor1150aCalibration;
  return [
    { parameter: "Azimuth Angle Offset", integral: calibration.azimuthOffset, standby: null, testGen: testGen.azimuthOffset, unit: "°" },
    { parameter: "30 Hz Modulation Scale", integral: calibration.hz30ModulationScale, standby: null, testGen: testGen.hz30ModulationScale, unit: "%" },
    { parameter: "9960 Hz Modulation Scale", integral: calibration.hz9960ModulationScale, standby: null, testGen: testGen.hz9960ModulationScale, unit: "%" },
    { parameter: "9960 Hz Deviation Scale", integral: calibration.deviationScale, standby: null, testGen: testGen.deviationScale, unit: "%" },
    { parameter: "RF Level Offset", integral: calibration.rfLevelOffset, standby: null, testGen: null, unit: "dB" },
    { parameter: "Ident Modulation Scale", integral: calibration.identModulationScale, standby: null, testGen: testGen.identModulationScale, unit: "%" },
    { parameter: "Tx Power Scale", integral: calibration.txPowerScale, standby: 100, testGen: testGen.txPowerScale, unit: "%" },
    { parameter: "Tx Power Offset", integral: calibration.txPowerOffset, standby: 0, testGen: testGen.txPowerOffset, unit: "%" },
    { parameter: "Tx Frequency Error Offset", integral: calibration.txFrequencyErrorOffset, standby: 0, testGen: testGen.txFrequencyErrorOffset, unit: "ppm" },
    { parameter: "Notch Monitor Scale", integral: calibration.notchScale, standby: null, testGen: null, unit: "" },
    { parameter: "Odd Antenna Sideband Return Loss Offset", integral: calibration.oddAntennaReturnLossOffset, standby: null, testGen: null, unit: "dB" },
    { parameter: "Even Antenna Sideband Return Loss Offset", integral: calibration.evenAntennaReturnLossOffset, standby: null, testGen: null, unit: "dB" },
  ];
}

function buildTxNominal(config: Dvor1150aConfig, txId: DvorTransmitterId): VorTxConfigNominal {
  const tx = config.transmitters[txId];
  return {
    audioGenParams: {
      azimuthIndex: tx.nominal.azimuthIndex,
      outputPower: tx.nominal.outputPower,
      voiceModulation: tx.nominal.voiceModulation,
      identModulation: tx.nominal.identModulation,
      referenceModulation: tx.nominal.referenceModulation,
      sboRfLevel: tx.nominal.sboRfLevel,
    },
    ident: { mainIdentCode: tx.nominal.mainIdentCode, standbyIdentCode: tx.nominal.standbyIdentCode },
    keyerInput: {
      mode: tx.nominal.keyerMode,
      keyerInputLevel: "Active Low/Closed",
      windowedKeyingInput: false,
      selfKeyOnLoss: false,
      shutdownOnLoss: false,
      restartWhenResumed: false,
    },
    keyerOutput: { externalKeying: "Disabled", suppressOnShutdown: false },
  };
}

function buildTxOffsets(config: Dvor1150aConfig): VorTxDualValueRow[] {
  const rows: Array<[string, keyof Dvor1150aConfig["transmitters"]["tx1"]["offsets"], string]> = [
    ["Azimuth Angle Offset", "azimuthAngleOffset", "°"],
    ["Output Power Scale", "outputPowerScale", "%"],
    ["Voice Modulation Scale", "voiceModulationScale", "%"],
    ["Ident Modulation Scale", "identModulationScale", "%"],
    ["Reference Modulation Scale", "referenceModulationScale", "%"],
    ["Carrier PLL Control", "carrierPllControl", "%"],
    ["Carrier-Sideband Phase Offset (Coarse)", "carrierSidebandPhaseOffsetCoarse", "°"],
    ["Carrier-Sideband Phase Offset (Fine)", "carrierSidebandPhaseOffsetFine", "°"],
    ["Sideband 1 Phase Offset", "sideband1PhaseOffset", "°"],
    ["Sideband 2 Phase Offset", "sideband2PhaseOffset", "°"],
    ["Sideband 3 Phase Offset", "sideband3PhaseOffset", "°"],
    ["Sideband 4 Phase Offset", "sideband4PhaseOffset", "°"],
    ["Tx Sideband RF Level Scale", "txSidebandRfLevelScale", "%"],
    ["Sideband 1 RF Level Scale", "sideband1RfLevelScale", "%"],
    ["Sideband 2 RF Level Scale", "sideband2RfLevelScale", "%"],
    ["Sideband 3 RF Level Scale", "sideband3RfLevelScale", "%"],
    ["Sideband 4 RF Level Scale", "sideband4RfLevelScale", "%"],
    ["Sideband 1 VSWR Offset", "sideband1VswrOffset", ":1"],
    ["Sideband 2 VSWR Offset", "sideband2VswrOffset", ":1"],
    ["Sideband 3 VSWR Offset", "sideband3VswrOffset", ":1"],
    ["Sideband 4 VSWR Offset", "sideband4VswrOffset", ":1"],
  ];
  return rows.map(([parameter, key, unit]) => ({
    parameter,
    tx1: config.transmitters.tx1.offsets[key],
    tx2: config.transmitters.tx2.offsets[key],
    unit,
  }));
}

function buildTxPower(
  transmitters: Record<DvorTransmitterId, DvorEffectiveTransmitter>,
  monitors: Record<DvorMonitorId, DvorMonitorResult>,
): VorTxDualValueRow[] {
  const monitorTxPower = monitors.mon1.parameters.txPower.value;
  const measuredCarrier = typeof monitorTxPower === "number" ? monitorTxPower : 0;
  return [
    { parameter: "Carrier", tx1: transmitters.tx1.onAir ? measuredCarrier : 0, tx2: transmitters.tx2.onAir ? measuredCarrier : 0, unit: "Watts" },
    ...[0, 1, 2, 3].map((index) => ({
      parameter: `Sideband #${index + 1}`,
      tx1: transmitters.tx1.sidebandPower[index],
      tx2: transmitters.tx2.sidebandPower[index],
      unit: "Watts",
    })),
  ];
}

function buildTxFrequency(transmitters: Record<DvorTransmitterId, DvorEffectiveTransmitter>): VorTxFrequencyRow[] {
  const tx1 = transmitters.tx1.onAir ? transmitters.tx1 : null;
  const tx2 = transmitters.tx2.onAir ? transmitters.tx2 : null;
  return [
    { parameter: "Carrier Frequency", value1: tx1?.carrierFrequencyMHz ?? null, value2: tx2?.carrierFrequencyMHz ?? null, unit: "MHz" },
    { parameter: "Tx Lower Sideband", value1: tx1 ? tx1.carrierFrequencyMHz - 0.0099 : null, value2: tx2 ? tx2.carrierFrequencyMHz - 0.0099 : null, unit: "MHz" },
    { parameter: "Tx Upper Sideband", value1: tx1 ? tx1.carrierFrequencyMHz + 0.0100 : null, value2: tx2 ? tx2.carrierFrequencyMHz + 0.0100 : null, unit: "MHz" },
    { parameter: "30 Hz AM", value1: tx1 ? 30 : null, value2: tx2 ? 30 : null, unit: "Hz" },
    { parameter: "30 Hz FM", value1: tx1 ? 30 : null, value2: tx2 ? 30 : null, unit: "Hz" },
    { parameter: "Sideband Frequency", value1: tx1 ? 9961 : null, value2: tx2 ? 9961 : null, unit: "Hz" },
  ];
}

function buildTxVswr(transmitters: Record<DvorTransmitterId, DvorEffectiveTransmitter>): VorTxVswrRow[] {
  const activeId = chooseActiveTransmitter(transmitters);
  const active = activeId ? transmitters[activeId] : null;
  return [
    {
      parameter: "Carrier",
      value1: activeId === "tx1" ? active?.carrierVswr ?? null : null,
      value2: activeId === "tx2" ? active?.carrierVswr ?? null : null,
    },
    ...[0, 1, 2, 3].map((index) => ({
      parameter: `Sideband #${index + 1}`,
      value1: activeId === "tx1" ? active?.sidebandVswr[index] ?? null : null,
      value2: activeId === "tx2" ? active?.sidebandVswr[index] ?? null : null,
    })),
  ];
}

function transmitterAlertIndicator(
  parameter: string,
  transmitterId: DvorTransmitterId,
  config: Dvor1150aConfig,
  transmitter: DvorEffectiveTransmitter,
): VorIndicatorColor {
  const tx = config.transmitters[transmitterId];
  if (parameter === "Carrier VSWR") return tx.faults.carrierVswr ? "red" : "green";
  if (parameter === "Carrier Overtemp") return tx.faults.overtemperature ? "red" : "green";
  if (parameter === "Carrier Overpower") {
    return transmitter.effectiveOutputPower > config.monitor.alarmLimits.txPower.alarmHigh ? "red" : "green";
  }
  if (parameter.startsWith("SB") && parameter.endsWith("PLL")) {
    return tx.faults.frequencyError ? "red" : "green";
  }
  return "green";
}

function buildTransmitterAlertRows(
  rows: VorPmdtData["txAlerts"],
  config: Dvor1150aConfig,
  transmitters: Record<DvorTransmitterId, DvorEffectiveTransmitter>,
): VorPmdtData["txAlerts"] {
  return rows.map((row) => ({
    ...row,
    tx1: transmitterAlertIndicator(row.name, "tx1", config, transmitters.tx1),
    tx2: transmitterAlertIndicator(row.name, "tx2", config, transmitters.tx2),
  }));
}

function buildSystemPowerRows(
  rows: VorPmdtData["systemPowerStatus"],
  config: Dvor1150aConfig,
  transmitters: Record<DvorTransmitterId, DvorEffectiveTransmitter>,
): VorPmdtData["systemPowerStatus"] {
  const powerIndicator = (rowName: string, transmitterId: DvorTransmitterId): VorIndicatorColor => {
    const tx = config.transmitters[transmitterId];
    if (rowName === "Carrier PA") {
      return tx.faults.carrierVswr || tx.faults.overtemperature ? "red" : "green";
    }
    return transmitterAlertIndicator("SB1 PLL", transmitterId, config, transmitters[transmitterId]);
  };
  return rows.map((row) => ({
    ...row,
    tx1: row.name === "Carrier PA" || row.name === "Sideband 1/2 PA" || row.name === "Sideband 3/4 PA"
      ? powerIndicator(row.name, "tx1")
      : row.tx1,
    tx2: row.name === "Carrier PA" || row.name === "Sideband 1/2 PA" || row.name === "Sideband 3/4 PA"
      ? powerIndicator(row.name, "tx2")
      : row.tx2,
  }));
}

function applyActiveTransmitterAlerts(
  data: VorPmdtData,
  config: Dvor1150aConfig,
  transmitters: Record<DvorTransmitterId, DvorEffectiveTransmitter>,
  groundChecks: Record<DvorTransmitterId, DvorGroundCheckResult>,
): void {
  const activeId = chooseActiveTransmitter(transmitters) ?? "tx1";
  const tx = config.transmitters[activeId];
  const transmitter = transmitters[activeId];
  const groundCheck = groundChecks[activeId];
  const sidebandAlarm = config.monitor.sidebandVswr.alarm;
  const phaseFault = groundCheck.errorSpread > 0.5;
  const txPowerFault = transmitter.effectiveOutputPower > config.monitor.alarmLimits.txPower.alarmHigh;

  data.txSystemAlerts = data.txSystemAlerts.map((alert) => ({
    ...alert,
    indicator: ["Audio Generator Disabled", "Transmitter Disabled"].includes(alert.label) && !transmitter.enabled
      ? "red"
      : alert.indicator,
  }));
  data.txCarrierPaAlerts = data.txCarrierPaAlerts.map((alert) => ({
    ...alert,
    indicator:
      (alert.label === "Carrier Reflected Power" && tx.faults.carrierVswr)
      || (alert.label === "Carrier Frequency" && tx.faults.frequencyError)
      || (alert.label === "PA Thermal Shutdown" && tx.faults.overtemperature)
      || (alert.label === "Carrier Forward Power" && txPowerFault)
      || (alert.label === "CSB to SBO Phase Control" && phaseFault)
        ? "red"
        : alert.indicator,
  }));
  data.txSynthesizerAlerts = data.txSynthesizerAlerts.map((alert) => ({
    ...alert,
    indicator: tx.faults.frequencyError && ["Carrier Phase Error", "LSB Unlocked", "USB Unlocked"].includes(alert.label)
      ? "red"
      : alert.indicator,
  }));
  data.txSidebandPaAlerts = data.txSidebandPaAlerts.map((alert) => {
    const sidebandMatch = alert.label.match(/^Sideband (\d+)/);
    const sidebandIndex = sidebandMatch ? Number(sidebandMatch[1]) - 1 : -1;
    const sidebandFault = sidebandIndex >= 0 && transmitter.sidebandVswr[sidebandIndex] >= sidebandAlarm;
    const phaseOrForwardFault = sidebandIndex >= 0 && (
      (alert.label.endsWith("Phase") && phaseFault)
      || (alert.label.endsWith("Forward Power") && transmitter.onAir && transmitter.sidebandPower[sidebandIndex] <= 0)
    );
    return {
      ...alert,
      indicator: tx.faults.carrierVswr || sidebandFault || phaseOrForwardFault ? "red" : alert.indicator,
    };
  });
}

function buildIntegrity(config: Dvor1150aConfig): Dvor1150aSnapshot["integrity"] {
  const result = {} as Dvor1150aSnapshot["integrity"];
  for (const parameter of numericLimitParameters) {
    const band = config.monitor.alarmLimits[parameter];
    // The manual treats integrity testing as a configurable monitor function.
    // When it is disabled there is no completed test value to display; NaN is
    // intentionally converted to --- by the test-results screen.
    result[integrityKey(parameter)] = config.monitor.integrity.enabled
      ? calculateIntegrityTestValues(band)
      : {
          lowLimitLowTest: Number.NaN,
          lowLimitHighTest: Number.NaN,
          highLimitLowTest: Number.NaN,
          highLimitHighTest: Number.NaN,
        };
  }
  return result;
}

function integrityKey(parameter: NumericLimitParameter): keyof Dvor1150aSnapshot["integrity"] {
  const map: Record<NumericLimitParameter, keyof Dvor1150aSnapshot["integrity"]> = {
    hz30Modulation: "30HzModulation",
    hz9960Modulation: "9960HzModulation",
    deviation: "9960HzDeviation",
    rfLevel: "RFLevel",
    txPower: "TxPower",
    txFrequencyError: "TxFrequencyError",
    identModulation: "IdentModulation",
  };
  return map[parameter];
}

export function calculateIntegrityTestValues(band: DvorAlarmBand): DvorIntegrityTestResult {
  return {
    lowLimitLowTest: band.alarmLow - (band.nominal - band.alarmLow) / 10,
    lowLimitHighTest: band.alarmLow + (band.nominal - band.alarmLow) / 10,
    highLimitLowTest: band.alarmHigh - (band.alarmHigh - band.nominal) / 10,
    highLimitHighTest: band.alarmHigh + (band.alarmHigh - band.nominal) / 10,
  };
}

function buildValidation(config: Dvor1150aConfig): DvorConfigValidationIssue[] {
  const issues: DvorConfigValidationIssue[] = [];
  if (config.station.frequencyMHz < 108 || config.station.frequencyMHz > 118) {
    issues.push({ fieldId: "station.frequencyMHz", message: "DVOR frequency must be between 108 and 118 MHz.", severity: "error" });
  }
  for (const parameter of numericLimitParameters) {
    const band = config.monitor.alarmLimits[parameter];
    if (!(band.alarmLow < band.preAlarmLow && band.preAlarmLow <= band.nominal && band.nominal <= band.preAlarmHigh && band.preAlarmHigh < band.alarmHigh)) {
      issues.push({ fieldId: `monitor.alarmLimits.${parameter}`, message: `${monitorParameterLabels[parameter]} limits must follow Alarm < Pre-alarm ≤ Nominal ≤ Pre-alarm < Alarm.`, severity: "error" });
    }
  }
  if (config.monitor.azimuthLimits.preAlarm <= 0 || config.monitor.azimuthLimits.alarm <= config.monitor.azimuthLimits.preAlarm) {
    issues.push({ fieldId: "monitor.azimuthLimits", message: "Azimuth pre-alarm must be positive and lower than the alarm range.", severity: "error" });
  }
  const active = DVOR_TRANSMITTER_IDS.filter((id) => (
    !(config.station.transmitterConfig === "Single Transmitter" && id === "tx2")
    && config.transmitters[id].onAir
    && config.transmitters[id].enabled
    && !config.transmitters[id].faults.disabled
  ));
  if (active.length > 1) {
    issues.push({ fieldId: "transmitters", message: "Only one transmitter can be on-air in a dual-DVOR configuration.", severity: "warning" });
  }
  if (active.length === 0) {
    issues.push({ fieldId: "transmitters", message: "No healthy transmitter is currently on-air.", severity: "warning" });
  }
  return issues;
}

/**
 * Ground-check error is modelled as the usual quadrantal/octantal harmonics.
 * The zero-offset defaults remain a flat trace like the reference PMDT, while
 * phase, PLL and azimuth offsets become visible immediately in the test view.
 */
export function buildDvorGroundCheck(
  config: Dvor1150aConfig,
  transmitterId: DvorTransmitterId,
): DvorGroundCheckResult {
  const offsets = config.transmitters[transmitterId].offsets;
  // The supplied PMDT capture is a calibrated zero-error ground-check view.
  // Keep that reference state flat while still exposing changes to the
  // transmitter phase/azimuth controls as measurable ground-check errors.
  const reference = transmitterId === "tx1"
    ? {
        sideband1PhaseOffset: -1,
        sideband2PhaseOffset: 1,
        sideband3PhaseOffset: 0,
        sideband4PhaseOffset: 0,
        carrierSidebandPhaseOffsetCoarse: 180,
        carrierSidebandPhaseOffsetFine: 33,
        azimuthAngleOffset: 0,
        carrierPllControl: 12.5,
      }
    : {
        sideband1PhaseOffset: 0,
        sideband2PhaseOffset: 0,
        sideband3PhaseOffset: 2,
        sideband4PhaseOffset: -2,
        carrierSidebandPhaseOffsetCoarse: 90,
        carrierSidebandPhaseOffsetFine: -16,
        azimuthAngleOffset: 0,
        carrierPllControl: 11.5,
      };
  const quadrantal = {
    amplitude: (
      (offsets.sideband1PhaseOffset - offsets.sideband3PhaseOffset)
      - (reference.sideband1PhaseOffset - reference.sideband3PhaseOffset)
    ) / 10,
    phase: offsets.carrierSidebandPhaseOffsetCoarse - reference.carrierSidebandPhaseOffsetCoarse,
  };
  const octantal = {
    amplitude: (
      (offsets.sideband2PhaseOffset - offsets.sideband4PhaseOffset)
      - (reference.sideband2PhaseOffset - reference.sideband4PhaseOffset)
    ) / 10,
    phase: offsets.carrierSidebandPhaseOffsetFine - reference.carrierSidebandPhaseOffsetFine,
  };
  const bias = (offsets.azimuthAngleOffset - reference.azimuthAngleOffset) * 0.1
    + (offsets.carrierPllControl - reference.carrierPllControl) * 0.01;
  const stationErrors = groundCheckAzimuths.map((azimuth) => {
    const radians = Math.PI / 180;
    return bias
      + quadrantal.amplitude * Math.cos((2 * azimuth + quadrantal.phase) * radians)
      + octantal.amplitude * Math.cos((4 * azimuth + octantal.phase) * radians);
  });
  const errorSpread = Math.max(...stationErrors) - Math.min(...stationErrors);
  return { stationErrors, errorSpread, quadrantal, octantal, bias };
}

export function buildDvor1150aSnapshot(
  config: Dvor1150aConfig,
  baseline = cloneDefaultVorPmdtData(),
): Dvor1150aSnapshot {
  const data = structuredClone(baseline);
  const effectiveTransmitters = {
    tx1: effectiveTransmitter(config, "tx1"),
    tx2: effectiveTransmitter(config, "tx2"),
  };
  const activeId = chooseActiveTransmitter(effectiveTransmitters);
  const active = activeId ? effectiveTransmitters[activeId] : null;
  const monitors = {
    mon1: monitorResult(config, "mon1", active, baseline.notchData),
    mon2: monitorResult(config, "mon2", active, baseline.notchData),
  };
  const monitorOffsets = {
    mon1: buildMonitorOffsets(config, "mon1"),
    mon2: buildMonitorOffsets(config, "mon2"),
  };
  const groundChecks = {
    tx1: buildDvorGroundCheck(config, "tx1"),
    tx2: buildDvorGroundCheck(config, "tx2"),
  };
  const primaryHealthy = monitors.mon1.healthy;
  const hasSecondaryMonitor = config.station.monitorConfig === "Dual Monitors";
  // An absent second monitor is excluded from voting; represent it as healthy
  // in the aggregate result while preserving `monitors.mon2.enabled = false`.
  const secondaryHealthy = hasSecondaryMonitor ? monitors.mon2.healthy : true;
  const systemHealthy = !hasSecondaryMonitor
    ? primaryHealthy
    : config.monitor.votingLogic === "AND"
    ? primaryHealthy && secondaryHealthy
    : primaryHealthy || secondaryHealthy;
  const alarmRequestsTransfer = config.monitor.transfer === "on Any Alarm"
    ? !primaryHealthy || (hasSecondaryMonitor && !monitors.mon2.healthy)
    : config.monitor.transfer === "on Primary Alarm" && !primaryHealthy;
  // Bypass is a maintenance interlock: alarms remain visible, but they must
  // not request an automatic transmitter transfer until the bypass is released.
  const transferRequested = !config.simulation.integralMonitorBypass && alarmRequestsTransfer;

  data.connected = config.simulation.connected;
  data.alert = config.simulation.alert || !systemHealthy;
  data.local = config.simulation.local;
  data.timestamp = config.simulation.timestamp;
  data.integralData = buildIntegralData(monitors, active);
  data.vswrData = [...monitors.mon1.sidebandVswr];
  data.alarmLimits = buildAlarmLimits(config);
  data.monitorAzimuthLimits = { ...config.monitor.azimuthLimits };
  data.monitorTimers = { ...config.monitor.timers };
  data.monitorAntennas = (["mon1", "mon2"] as const).map((monitorId) => {
    const antenna = config.monitor.antennas[monitorId];
    return {
      monitor: antenna.monitor,
      enabled: monitors[monitorId].enabled,
      inputAttenuation: antenna.inputAttenuation,
      azimuthAngle: antenna.azimuthAngle,
      secondAntennaEnabled: antenna.secondAntennaEnabled,
      secondInputAttenuation: antenna.secondInputAttenuation,
      secondAzimuthAngle: antenna.secondAzimuthAngle,
    };
  });
  data.monitorOffsets = monitorOffsets.mon1;
  data.notchData = data.notchData.map((row) => ({
    ...row,
    // Raw notch is a normalized detector level (100% is the reference
    // detector gain); calibration is then applied per monitor CCA.
    mon1: row.mon1
      * config.monitor.rawMeasurements.mon1.notchMonitor / 100
      * config.monitor.calibration.mon1.notchScale / 100,
    mon2: row.mon2
      * config.monitor.rawMeasurements.mon2.notchMonitor / 100
      * config.monitor.calibration.mon2.notchScale / 100,
  }));
  data.monitorConfigGeneral = Object.entries(config.monitor.routing)
    .filter(([parameter]) => parameter !== "azimuth")
    .map(([parameter, routing]) => ({
    parameter: monitorParameterLabels[parameter as DvorMonitorParameter],
    primary: routing.primary,
    secondary: routing.secondary,
    ...(parameter === "notchMonitor" || parameter === "sidebandVswr" ? { isCheckbox: true, checked: routing.primary || routing.secondary } : {}),
    }));
  data.systemPowerStatus = buildSystemPowerRows(data.systemPowerStatus, config, effectiveTransmitters);
  data.txAlerts = buildTransmitterAlertRows(data.txAlerts, config, effectiveTransmitters);
  applyActiveTransmitterAlerts(data, config, effectiveTransmitters, groundChecks);
  data.txPower = buildTxPower(effectiveTransmitters, monitors);
  data.txFrequency = buildTxFrequency(effectiveTransmitters);
  data.txVswr = buildTxVswr(effectiveTransmitters);
  data.txConfigNominal = buildTxNominal(config, "tx1");
  data.txOffsets = buildTxOffsets(config);
  data.rmsConfigGeneral = {
    ...data.rmsConfigGeneral,
    monitorIntegrityTestsEnabled: config.monitor.integrity.enabled,
    votingLogic: config.monitor.votingLogic,
    transfer: config.monitor.transfer,
  };
  data.rmsConfigStation = {
    stationType: config.station.stationType,
    transmitterConfig: config.station.transmitterConfig,
    monitorConfig: config.station.monitorConfig,
    stationDescription: config.station.stationDescription,
    transmitterFrequency: `${config.station.frequencyMHz.toFixed(1)} MHz`,
  };
  data.rmsStatus = {
    ...data.rmsStatus,
    localControlMode: config.simulation.local,
    maintenanceAlert: config.simulation.alert || !systemHealthy,
    remoteControlEnabled: config.simulation.connected,
    rcsuConnectionEnabled: config.simulation.connected,
    rcsuCommunicationError: !config.simulation.connected,
  };
  data.rmsMonitorTransmitterStatus = {
    ...data.rmsMonitorTransmitterStatus,
    monitorAlarmShutdown: !systemHealthy,
    enabledMonitors: {
      monitor1: monitors.mon1.enabled,
      monitor2: monitors.mon2.enabled,
    },
    monitors: data.rmsMonitorTransmitterStatus.monitors.map((row) => ({
      ...row,
      primaryAlarm: !primaryHealthy,
      secondaryAlarm: !secondaryHealthy,
    })),
    antennaSelect: activeId === "tx2" ? 2 : 1,
    mainSelect: activeId === "tx2" ? 2 : 1,
    transmitterOn: {
      tx1: effectiveTransmitters.tx1.onAir,
      tx2: effectiveTransmitters.tx2.onAir,
    },
  };

  for (const monitorId of DVOR_MONITOR_IDS) {
    const result = monitors[monitorId];
    for (const parameter of DVOR_MONITOR_PARAMETERS) {
      const row = result.parameters[parameter];
      const key = parameterToSidebarKey(parameter);
      if (key && typeof row.value === "number" && monitorId === "mon1") {
        data.sidebarParams[key] = { value: row.value, status: toParameterStatus(row.indicator) };
      }
    }
  }

  data.monitorIntegral = {
    normal: systemHealthy,
    priAlarm: !primaryHealthy,
    secAlarm: !secondaryHealthy,
    bypass: config.simulation.integralMonitorBypass,
  };
  data.transmitters = {
    tx1: transmitterSidebarState(effectiveTransmitters.tx1),
    tx2: transmitterSidebarState(effectiveTransmitters.tx2),
  };

  return {
    data,
    effectiveTransmitters,
    monitors,
    monitorOffsets,
    groundChecks,
    voting: {
      logic: config.monitor.votingLogic,
      primaryHealthy,
      secondaryHealthy,
      systemHealthy,
      transferRequested,
      activeTransmitter: activeId,
    },
    integrity: buildIntegrity(config),
    validation: buildValidation(config),
  };
}

function parameterToSidebarKey(parameter: DvorMonitorParameter): string | null {
  const map: Partial<Record<DvorMonitorParameter, string>> = {
    azimuth: "azimuth",
    hz30Modulation: "hz30Mod",
    hz9960Modulation: "hz9960Mod",
    deviation: "deviation",
    rfLevel: "rfLevel",
  };
  return map[parameter] ?? null;
}

function transmitterSidebarState(transmitter: DvorEffectiveTransmitter) {
  if (!transmitter.enabled) {
    return { main: "gray" as const, antenna: "gray" as const, load: "gray" as const, off: "red" as const };
  }
  if (transmitter.status === "red") {
    return { main: "red" as const, antenna: "red" as const, load: "gray" as const, off: "red" as const };
  }
  if (transmitter.onAir) {
    return { main: "green" as const, antenna: "green" as const, load: "gray" as const, off: "gray" as const };
  }
  if (transmitter.load) {
    return { main: "gray" as const, antenna: "gray" as const, load: "green" as const, off: "gray" as const };
  }
  return { main: "gray" as const, antenna: "gray" as const, load: "gray" as const, off: "red" as const };
}

export function createDefaultDvor1150aSnapshot(): Dvor1150aSnapshot {
  return buildDvor1150aSnapshot(createDefaultDvor1150aConfig());
}
