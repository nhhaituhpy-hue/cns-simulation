import { defaultDmePmdtData } from "../dme-pmdt-defaults";
import type {
  DmeAlarmLimitRow,
  DmeDecoderResultRow,
  DmeDualValueRow,
  DmeIndicatorColor,
  DmeParameterStatus,
  DmePmdtData,
} from "../dme-types";
import {
  getDmeStationChannelAllocation,
  type DmeChannelAllocation,
} from "./channel-allocation";

export type MeasurementKind = "integral" | "standby";
export type TransmitterId = "tx1" | "tx2";

/**
 * §6.4.3 gives the LDES equations in terms of SRE/FUD.  The PMDT training
 * model has no SRE/FUD input fields, so it deliberately does not invent a
 * site value.  Operators edit Window/Threshold directly; the equations are
 * exposed here for a future flight-inspection input and the deterministic
 * traffic model uses the configured values as its source.
 */
export const DME_LDES_TRAINING_MODEL = Object.freeze({
  sreNmi: null as number | null,
  fudNmi: null as number | null,
  assumption: "No SRE/FUD controls exist in this PMDT build; configured LDES Window/Threshold are authoritative.",
});

export function calculateLdesWindowUs(sreNmi: number): number {
  return Number((Math.abs(sreNmi) * 12.36 + 10).toFixed(2));
}

export function calculateLdesThresholdDbm(fudNmi: number): number {
  return Number((-0.385 * Math.abs(fudNmi) - 20).toFixed(3));
}

const referenceChannel = getDmeStationChannelAllocation(defaultDmePmdtData.rmsConfigStation);

/*
 * The supplied PMDT captures are the calibrated zero point for the training
 * model.  The manual defines how each configuration input moves a reading,
 * but does not publish a complete RF propagation model for arbitrary values.
 */
const referencePowerByTransmitter: Record<TransmitterId, readonly [number, number]> = {
  tx1: [1011, 1033],
  tx2: [968, 963],
};
const referencePrfByTransmitter: Record<TransmitterId, readonly [number, number]> = {
  tx1: [792, 798],
  tx2: [819, 810],
};
const referencePowerScale: Record<TransmitterId, number> = { tx1: 51.3, tx2: 53.4 };
const referenceMonitorPowerScale: Record<MeasurementKind, number> = { integral: 100, standby: 175 };
const referenceMonitorAttenuation = 22;
const referenceDirectionalCouplerLoss = -29.67;
const referenceVswr = 1.3;
const hardwareMaximumPrf = 5500;
const defaultDeadTime = defaultDmePmdtData.txConfigNominal.rtcParameters.deadTime;

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function numeric(value: string | number | null | undefined): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number, digits: number): string {
  return value.toFixed(digits);
}

function transmitterForMonitor(data: DmePmdtData, kind: MeasurementKind): TransmitterId {
  const antenna = data.monitorTransmitterStatus.antennaSelect === 2 ? "tx2" : "tx1";
  return kind === "integral" ? antenna : antenna === "tx1" ? "tx2" : "tx1";
}

/** Monitor 1 is calibrated against TX1 and Monitor 2 against TX2 in §6.4.5.2. */
function transmitterForMonitorNumber(data: DmePmdtData, monitorNumber: 1 | 2): TransmitterId {
  if (data.rmsConfigStation.transmitterConfig === "Single Transmitter") {
    return data.monitorTransmitterStatus.antennaSelect === 2 ? "tx2" : "tx1";
  }
  return monitorNumber === 1 ? "tx1" : "tx2";
}

function monitorAvailable(data: DmePmdtData, kind: MeasurementKind, monitorNumber: 1 | 2): boolean {
  if (monitorNumber === 1 && !data.monitorTransmitterStatus.enabledMonitors.monitor1) return false;
  if (monitorNumber === 2 && !data.monitorTransmitterStatus.enabledMonitors.monitor2) return false;
  if (kind === "standby" && data.rmsConfigStation.transmitterConfig === "Single Transmitter") return false;
  if (kind === "standby" && data.rmsConfigStation.monitorConfig === "Single Monitor") return false;
  if (kind === "standby" && !data.rmsConfigStation.hotStandby) return false;
  if (monitorNumber === 2 && data.rmsConfigStation.monitorConfig === "Single Monitor") return false;
  return true;
}

function transmitterAvailable(data: DmePmdtData, transmitterId: TransmitterId): boolean {
  if (transmitterId === "tx2" && data.rmsConfigStation.transmitterConfig === "Single Transmitter") return false;
  return Boolean(data.monitorTransmitterStatus.transmitterOn[transmitterId]);
}

function monitorOffsetsFor(data: DmePmdtData, monitorNumber: 1 | 2) {
  return monitorNumber === 1 ? data.monitorOffsets.monitor1 : data.monitorOffsets.monitor2;
}

function monitorOffset(
  data: DmePmdtData,
  monitorNumber: 1 | 2,
  parameter: string,
  kind: MeasurementKind,
): number {
  const row = monitorOffsetsFor(data, monitorNumber).find((item) => item.parameter === parameter);
  const value = row?.[kind];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Frequency offsets are calibration deltas, not an additional copy of the
 * captured absolute frequency error.  The channel allocation in Table 9-5 is
 * therefore the absolute source of truth; editing an offset moves that value
 * by the difference from the factory baseline (in ppm).
 */
function monitorOffsetDelta(
  data: DmePmdtData,
  monitorNumber: 1 | 2,
  parameter: string,
  kind: MeasurementKind,
): number {
  const configured = monitorOffset(data, monitorNumber, parameter, kind);
  const baseline = monitorOffset(defaultDmePmdtData, monitorNumber, parameter, kind);
  return configured - baseline;
}

function monitorPowerScale(data: DmePmdtData, monitorNumber: 1 | 2, kind: MeasurementKind): number {
  const row = monitorOffsetsFor(data, monitorNumber).find((item) => item.parameter === "Tx Power Scale");
  const value = row?.[kind];
  return typeof value === "number" && value > 0 ? value : referenceMonitorPowerScale[kind];
}

function transmitterOffset(data: DmePmdtData, parameter: string, transmitterId: TransmitterId): number {
  const row = data.txOffsets.find((item) => item.parameter === parameter);
  const value = row?.[transmitterId];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function baseRow(kind: MeasurementKind, label: string): DmeDualValueRow | undefined {
  const rows = kind === "integral" ? defaultDmePmdtData.integralData : defaultDmePmdtData.standbyData;
  return rows.find((row) => row.label === label);
}

function baseValue(kind: MeasurementKind, label: string, monitorNumber: 1 | 2): number | null {
  const row = baseRow(kind, label);
  return numeric(monitorNumber === 1 ? row?.mon1Value : row?.mon2Value);
}

function referenceValueError(
  kind: MeasurementKind,
  label: string,
  monitorNumber: 1 | 2,
  allocationValue: number,
): number {
  const value = baseValue(kind, label, monitorNumber);
  return value === null ? 0 : value - allocationValue;
}

function getAlarmLimit(data: DmePmdtData, label: string): DmeAlarmLimitRow | undefined {
  const parameter = label === "Rx LO Frequency Error" ? "Rx Frequency Error" : label;
  return data.alarmLimits.find((item) => item.parameter === parameter);
}

function measurementStatus(
  data: DmePmdtData,
  label: string,
  value: number,
  outputBelowTarget = false,
): DmeParameterStatus {
  const limit = getAlarmLimit(data, label);
  let status: DmeParameterStatus = "normal";
  if (limit) {
    // §3.6.8.2.2: Delay and Spacing values are offsets from their nominal;
    // other rows retain their configured absolute thresholds.
    const isOffsetLimit = label === "Delay" || label === "Spacing";
    const nominal = isOffsetLimit ? limit.nominal : 0;
    const alarmLow = limit.alarmLow === null ? null : nominal + limit.alarmLow;
    const preAlarmLow = limit.preAlarmLow === null ? null : nominal + limit.preAlarmLow;
    const preAlarmHigh = limit.preAlarmHigh === null ? null : nominal + limit.preAlarmHigh;
    const alarmHigh = limit.alarmHigh === null ? null : nominal + limit.alarmHigh;
    if ((alarmLow !== null && value < alarmLow) || (alarmHigh !== null && value > alarmHigh)) status = "alarm";
    else if ((preAlarmLow !== null && value < preAlarmLow) || (preAlarmHigh !== null && value > preAlarmHigh)) status = "warning";
  }
  if (label === "Tx Power" && outputBelowTarget) status = "alarm";
  // §3.6.9.2.1: disabling monitor integrity does not erase a failed
  // condition; it downgrades the integrity alarm to a yellow alert.
  if (status === "alarm" && !data.rmsConfigGeneral.monitorIntegrityTestsEnabled) return "warning";
  return status;
}

function vswrToReturnLoss(vswr: number): number {
  const safeVswr = Math.max(1.0001, vswr);
  return 20 * Math.log10((safeVswr + 1) / (safeVswr - 1));
}

function returnLossToVswr(returnLoss: number): number {
  const reflectionCoefficient = clamp(Math.pow(10, -returnLoss / 20), 0, 0.9999);
  return Math.max(1, (1 + reflectionCoefficient) / (1 - reflectionCoefficient));
}

/**
 * HPA #1 and HPA #2 are the independent high-power paths for TX1/TX2.
 * Keeping this factor keyed by transmitter is important: disabling one PA or
 * changing one transmitter's scale must never attenuate the other RTC.
 */
function amplifierFactor(data: DmePmdtData, transmitterId: TransmitterId): number {
  if (data.rmsConfigStation.powerLevel === "Low Power") return 1;
  return transmitterId === "tx1"
    ? Number(data.txConfigNominal.powerAmplifiers.hpa1Enabled)
    : Number(data.txConfigNominal.powerAmplifiers.hpa2Enabled);
}

function powerRatio(data: DmePmdtData): number {
  const reference = defaultDmePmdtData.txConfigNominal.rtcParameters.powerOutput;
  return Math.pow(10, (data.txConfigNominal.rtcParameters.powerOutput - reference) / 10);
}

function powerScaleRatio(data: DmePmdtData, transmitterId: TransmitterId): number {
  return transmitterOffset(data, "Power Output Scale", transmitterId) / referencePowerScale[transmitterId];
}

function powerTargetDeltaDb(data: DmePmdtData, transmitterId: TransmitterId): number {
  const scaleRatio = powerScaleRatio(data, transmitterId);
  const scaleDelta = scaleRatio > 0 ? 10 * Math.log10(scaleRatio) : -60;
  return data.txConfigNominal.rtcParameters.powerOutput
    - defaultDmePmdtData.txConfigNominal.rtcParameters.powerOutput
    + scaleDelta;
}

function targetPowerWatts(data: DmePmdtData, transmitterId: TransmitterId, monitorNumber: 1 | 2): number {
  const stationRatio = data.rmsConfigStation.powerLevel === "High Power" ? 1 : 0.1;
  return referencePowerByTransmitter[transmitterId][monitorNumber - 1] * stationRatio * powerRatio(data) * powerScaleRatio(data, transmitterId);
}

function measuredPowerWatts(
  data: DmePmdtData,
  transmitterId: TransmitterId,
  monitorNumber: 1 | 2,
  kind: MeasurementKind,
): number {
  if (!transmitterAvailable(data, transmitterId)) return 0;
  const target = targetPowerWatts(data, transmitterId, monitorNumber);
  const monitorScale = monitorPowerScale(data, monitorNumber, kind) / referenceMonitorPowerScale[kind];
  return target * amplifierFactor(data, transmitterId) * monitorScale + monitorOffset(data, monitorNumber, "Tx Power Offset", kind);
}

function outputBelowTarget(data: DmePmdtData, transmitterId: TransmitterId, monitorNumber: 1 | 2): boolean {
  if (!transmitterAvailable(data, transmitterId)) return true;
  const target = targetPowerWatts(data, transmitterId, monitorNumber);
  if (target <= 0) return true;
  const actual = target * amplifierFactor(data, transmitterId);
  // Manual §3.6.10.3.1: the RTC must reach at least target minus two percent.
  return actual < target * 0.98;
}

function paOutputBelowAlertLimit(data: DmePmdtData, transmitterId: TransmitterId): boolean {
  const target = targetPowerWatts(data, transmitterId, 1);
  if (!transmitterAvailable(data, transmitterId) || target <= 0) return false;
  const actual = target * amplifierFactor(data, transmitterId);
  // §6.4.5.3 deliberately exercises the exact 100% setting.  Treat equality
  // as an alert so the threshold is observable instead of silently green.
  return (actual / target) * 100 <= data.txConfigNominal.powerAmplifiers.lowOutputPowerAlertLimit;
}

interface PrfState {
  requested: number;
  capacity: number;
  effective: number;
  gainReduction: boolean;
  overload: boolean;
}

function derivePrfState(data: DmePmdtData, transmitterId: TransmitterId, monitorNumber: 1 | 2): PrfState {
  const parameters = data.txConfigNominal.rtcParameters;
  const reference = referencePrfByTransmitter[transmitterId][monitorNumber - 1];
  const requested = data.txConfigNominal.operation.squitterEnabled
    ? reference * Math.max(0, parameters.minimumSquitter) / Math.max(1, defaultDmePmdtData.txConfigNominal.rtcParameters.minimumSquitter)
    : reference * 0.7;
  const configuredCapacity = clamp(parameters.maximumPrf, 0, hardwareMaximumPrf);
  const deadTimeCapacity = clamp(1_000_000 / Math.max(1, parameters.deadTime), 0, hardwareMaximumPrf);
  const capacity = Math.max(0, Math.min(configuredCapacity, deadTimeCapacity));
  const gainReduction = requested > capacity * 0.9;
  const effective = gainReduction
    ? Math.min(requested, capacity * 0.95)
    : Math.min(requested, capacity);
  return {
    requested,
    capacity,
    effective: transmitterAvailable(data, transmitterId) ? Math.max(0, effective) : 0,
    gainReduction,
    overload: gainReduction || requested > hardwareMaximumPrf,
  };
}

function ldesSuppressionFactor(windowUs: number, thresholdDbm: number): number {
  // Deterministic training approximation: a wider window and a more
  // sensitive (higher) threshold blank more receiver time. Site-specific SRE
  // and FUD are intentionally not guessed (see DME_LDES_TRAINING_MODEL).
  const windowPenalty = clamp((windowUs - 10) / 1000, 0, 1);
  const thresholdPenalty = clamp((thresholdDbm + 120) / 100, 0, 1);
  return clamp(1 - windowPenalty * 0.2 - thresholdPenalty * 0.15, 0.5, 1);
}

function identCodeFor(data: DmePmdtData, kind: MeasurementKind, transmitterId: TransmitterId): string {
  const ident = data.txConfigNominal.ident;
  if (kind === "standby" && ident.standbyIdent === "Disabled") return "";
  if (kind === "standby" && ident.standbyIdent === "Secondary Ident") {
    return ident.secondaryIdentEnabled ? ident.secondaryIdentCode : ident.primaryIdentCode;
  }
  if (transmitterId === "tx2" && ident.secondaryIdentEnabled) return ident.secondaryIdentCode;
  return ident.primaryIdentCode;
}

function identStatusColor(data: DmePmdtData, kind: MeasurementKind, transmitterId: TransmitterId): DmeIndicatorColor {
  const code = identCodeFor(data, kind, transmitterId);
  if (!code) return "red";
  if (data.identMode !== "normal") return "yellow";
  // The PMDT model has no external key-contact input.  Treat an external
  // keyer without self-key-on-loss as a visible warning, and a configured
  // shutdown-on-loss as an alarm; enabling self-key-on-loss keeps the
  // training station available deterministically.
  const ident = data.txConfigNominal.ident;
  if (ident.keyerSource === "External Keying" && ident.shutdownOnLoss) return "red";
  if (ident.keyerSource === "External Keying" && !ident.selfKeyOnLoss) return "yellow";
  return "green";
}

function numericValueForRow(
  data: DmePmdtData,
  kind: MeasurementKind,
  row: DmeDualValueRow,
  monitorNumber: 1 | 2,
  allocation: DmeChannelAllocation,
): number | null {
  const label = row.label;
  const transmitterId = transmitterForMonitor(data, kind);
  const base = baseValue(kind, label, monitorNumber);
  const parameter = data.txConfigNominal.rtcParameters;

  if (label === "Delay") {
    const channelDelta = allocation.nominalReplyDelayUs - (referenceChannel?.nominalReplyDelayUs ?? 50);
    const timingDelta = data.txConfigNominal.operation.timing === "2nd Pulse" ? 0.05 : 0;
    return round(
      (base ?? allocation.nominalReplyDelayUs)
      + channelDelta
      + timingDelta
      + parameter.replyDelayOffset
      + transmitterOffset(data, "Base Offset", transmitterId)
      + monitorOffset(data, monitorNumber, "Delay Offset", kind),
    );
  }

  if (label === "Spacing") {
    const channelDelta = allocation.transmitterReplyPulseSpacingUs
      - (referenceChannel?.transmitterReplyPulseSpacingUs ?? 12);
    return round(
      (base ?? allocation.transmitterReplyPulseSpacingUs)
      + channelDelta
      + monitorOffset(data, monitorNumber, "Spacing Offset", kind),
    );
  }

  if (label === "Tx Power") {
    const raw = measuredPowerWatts(data, transmitterId, monitorNumber, kind);
    return round(raw, 0);
  }

  if (label === "ERP") {
    const attenuationDelta = referenceMonitorAttenuation
      - (monitorNumber === 1
        ? data.monitorSystemSettings.monitor1ReplyAttenuation
        : data.monitorSystemSettings.monitor2ReplyAttenuation);
    const couplerLossDelta = data.monitorSystemSettings.directionalCouplerLoss - referenceDirectionalCouplerLoss;
    const referenceOffset = numeric(monitorOffsetsFor(defaultDmePmdtData, monitorNumber)
      .find((item) => item.parameter === "ERP Offset")?.[kind]) ?? 0;
    return round(
      (base ?? 0)
      + powerTargetDeltaDb(data, transmitterId)
      + attenuationDelta
      + couplerLossDelta
      + monitorOffset(data, monitorNumber, "ERP Offset", kind)
      - referenceOffset,
      1,
    );
  }

  if (label === "Efficiency") {
    return round((base ?? 0) + monitorOffset(data, monitorNumber, "Efficiency Offset", kind), 1);
  }

  if (label === "PRF") {
    const state = derivePrfState(data, transmitterId, monitorNumber);
    return round(Math.max(0, state.effective + monitorOffset(data, monitorNumber, "PRF Offset", kind)), 0);
  }

  if (label === "Tx Frequency") {
    const replyFrequency = allocation.transmitterReplyFrequencyMHz;
    const ppmOffset = monitorOffsetDelta(data, monitorNumber, "Tx Frequency Offset", kind);
    return round(replyFrequency + (replyFrequency * ppmOffset) / 1_000_000, 3);
  }

  if (label === "Rx LO Frequency") {
    const ppmOffset = monitorOffsetDelta(data, monitorNumber, "Rx Frequency Offset", kind);
    return round(allocation.receiverLoFrequencyMHz + (allocation.receiverLoFrequencyMHz * ppmOffset) / 1_000_000, 3);
  }

  if (label === "Rx Frequency") {
    const ppmOffset = monitorOffsetDelta(data, monitorNumber, "Rx Frequency Offset", kind);
    return round(allocation.receiverFrequencyMHz + (allocation.receiverFrequencyMHz * ppmOffset) / 1_000_000, 3);
  }

  if (label === "Tx Frequency Error") {
    return round((base ?? 0) + monitorOffset(data, monitorNumber, "Tx Frequency Offset", kind), 0);
  }

  if (label === "Rx LO Frequency Error") {
    const reference = base ?? 0;
    const referenceOffset = numeric(monitorOffsetsFor(defaultDmePmdtData, monitorNumber)
      .find((item) => item.parameter === "Rx Frequency Offset")?.[kind]) ?? 0;
    return round(reference + monitorOffset(data, monitorNumber, "Rx Frequency Offset", kind) - referenceOffset, 0);
  }

  if (label === "VSWR") {
    const referenceReturnLoss = vswrToReturnLoss(referenceVswr);
    const referenceOffset = numeric(monitorOffsetsFor(defaultDmePmdtData, monitorNumber)
      .find((item) => item.parameter === "Return Loss Offset")?.[kind]) ?? 0;
    const currentOffset = monitorOffset(data, monitorNumber, "Return Loss Offset", kind);
    return round(returnLossToVswr(referenceReturnLoss + currentOffset - referenceOffset), 2);
  }

  if (label === "Ident Status" || label === "Ident Code") return null;
  return base;
}

function stringValueForRow(data: DmePmdtData, kind: MeasurementKind, row: DmeDualValueRow): string | null {
  const transmitterId = transmitterForMonitor(data, kind);
  if (row.label === "Ident Status") {
    if (data.identMode === "off") return "Off";
    if (data.identMode === "continuous") return "Continuous";
    return data.txConfigNominal.ident.keyerSource === "External Keying"
      ? data.txConfigNominal.ident.windowedKeying ? "Windowed External" : "External Keying"
      : "Normal";
  }
  if (row.label === "Ident Code") return identCodeFor(data, kind, transmitterId);
  return null;
}

function formatDerivedValue(label: string, value: number): string {
  if (label === "Tx Power" || label === "PRF" || label.endsWith("Error")) return formatNumber(value, 0);
  if (label === "ERP" || label === "Efficiency") return formatNumber(value, 1);
  if (label.includes("Frequency")) return formatNumber(value, 3);
  if (label === "VSWR") return formatNumber(Math.max(1, value), 2);
  return formatNumber(value, 2);
}

function deriveRows(data: DmePmdtData, kind: MeasurementKind, allocation: DmeChannelAllocation): DmeDualValueRow[] {
  const sourceRows = kind === "integral" ? defaultDmePmdtData.integralData : defaultDmePmdtData.standbyData;
  return sourceRows.map((sourceRow) => {
    const values = ([1, 2] as const).map((monitorNumber) => {
      if (!monitorAvailable(data, kind, monitorNumber)) {
        return { value: "—", status: "gray" as DmeIndicatorColor };
      }
      const transmitterId = transmitterForMonitor(data, kind);
      if (!transmitterAvailable(data, transmitterId)) {
        // An explicitly Off RTC has no meaningful frequency/timing/ident
        // sample.  Keep power/PRF numerically zero for traffic accounting and
        // blank the other monitor rows instead of retaining stale captures.
        const zeroWhenOff = sourceRow.label === "Tx Power" || sourceRow.label === "PRF";
        return { value: zeroWhenOff ? "0" : "—", status: "gray" as DmeIndicatorColor };
      }
      const stringValue = stringValueForRow(data, kind, sourceRow);
      if (stringValue !== null) {
        return {
          value: stringValue,
          status: identStatusColor(data, kind, transmitterForMonitor(data, kind)),
        };
      }
      const measured = numericValueForRow(data, kind, sourceRow, monitorNumber, allocation);
      const fallback = monitorNumber === 1 ? sourceRow.mon1Value : sourceRow.mon2Value;
      const value = measured === null ? fallback : formatDerivedValue(sourceRow.label, measured);
      const status = measured === null
        ? "normal" as const
        : measurementStatus(
            data,
            sourceRow.label,
            measured,
            sourceRow.label === "Tx Power"
              && outputBelowTarget(data, transmitterForMonitor(data, kind), monitorNumber),
          );
      return { value, status };
    });

    return {
      label: sourceRow.label,
      mon1Value: values[0].value,
      mon1Status: values[0].status,
      mon2Value: values[1].value,
      mon2Status: values[1].status,
      unit: sourceRow.unit,
    };
  });
}

function deriveDecoderResults(data: DmePmdtData, allocation: DmeChannelAllocation): DmePmdtData["decoderResults"] {
  const efficiencyLimit = data.monitorSystemSettings.efficiencyCertificationLevel;
  const spacingDelta = allocation.interrogatorPulseSpacingUs - (referenceChannel?.interrogatorPulseSpacingUs ?? 12);

  const update = (
    rows: DmePmdtData["decoderResults"]["monitor1"],
    monitorNumber: 1 | 2,
  ): DmeDecoderResultRow[] => rows.map((row, index): DmeDecoderResultRow => {
    const tx = transmitterForMonitorNumber(data, monitorNumber);
    const sensitivity = data.txConfigNominal.rtcParameters.rxSensitivity
      + transmitterOffset(data, "Rx Sensitivity Offset", tx)
      - 0.1;
    if (index === 0) {
      const referenceRow = defaultDmePmdtData.decoderResults.monitor1[0];
      const lowLimit = round(sensitivity - 3, 1);
      const highLimit = round(sensitivity + 3, 1);
      return {
        ...row,
        parameter: `Receiver Sensitivity @ ${allocation.interrogatorPulseSpacingUs.toFixed(1)} us (R)`,
        lowLimit,
        data: round(sensitivity, 1),
        highLimit,
        result: sensitivity >= -94 && sensitivity <= -72 && sensitivity >= lowLimit && sensitivity <= highLimit
          ? "Updated"
          : "In Process",
        unit: referenceRow.unit,
      };
    }

    const match = row.parameter.match(/Spacing ([0-9.]+) us/);
    const parameter = match
      ? row.parameter.replace(`Spacing ${match[1]} us`, `Spacing ${(Number(match[1]) + spacingDelta).toFixed(1)} us`)
      : row.parameter;
    const isPositiveEfficiencyTest = row.highLimit === 100;
    const dataValue = row.data;
    const lowLimit = isPositiveEfficiencyTest ? efficiencyLimit : 0;
    const highLimit = isPositiveEfficiencyTest ? 100 : 5;
    return {
      ...row,
      parameter,
      lowLimit,
      highLimit,
      result: dataValue >= lowLimit && dataValue <= highLimit ? "Updated" : "In Process",
    };
  });

  return {
    monitor1: update(defaultDmePmdtData.decoderResults.monitor1, 1),
    monitor2: update(defaultDmePmdtData.decoderResults.monitor2, 2),
  };
}

function deriveDelayControl(data: DmePmdtData): DmePmdtData["delayControl"] {
  const parameters = data.txConfigNominal.rtcParameters;
  const referenceParameters = defaultDmePmdtData.txConfigNominal.rtcParameters;
  const tx1Bias = defaultDmePmdtData.delayControl.rtc1.propagationDelay - referenceParameters.nominalPropagationDelay;
  const tx2Bias = defaultDmePmdtData.delayControl.rtc2.propagationDelay - referenceParameters.nominalPropagationDelay;
  const tx1Center = parameters.nominalPropagationDelay + transmitterOffset(data, "Base Offset", "tx1");
  const tx2Center = parameters.nominalPropagationDelay
    + parameters.standbyPropagationOffset
    + transmitterOffset(data, "Base Offset", "tx2");
  return {
    rtc1: {
      low: round(tx1Center - parameters.maxPropagationVariance, 2),
      propagationDelay: round(tx1Center + tx1Bias, 2),
      high: round(tx1Center + parameters.maxPropagationVariance, 2),
      fixed: data.delayControl.rtc1.fixed,
    },
    rtc2: {
      low: round(tx2Center - parameters.maxPropagationVariance, 2),
      propagationDelay: round(tx2Center + tx2Bias, 2),
      high: round(tx2Center + parameters.maxPropagationVariance, 2),
      fixed: data.delayControl.rtc2.fixed,
    },
  };
}

function ldesTrafficFactor(data: DmePmdtData): { suppression: number; triggerRate: number } {
  const operation = data.txConfigNominal.operation;
  if (!operation.ldesEnabled) return { suppression: 1, triggerRate: 0 };
  const suppression = ldesSuppressionFactor(
    data.txConfigNominal.rtcParameters.ldesWindow,
    data.txConfigNominal.rtcParameters.ldesThreshold,
  );
  return { suppression, triggerRate: 1 - suppression };
}

function deriveTrafficLoad(data: DmePmdtData): DmePmdtData["trafficLoad"] {
  const operation = data.txConfigNominal.operation;
  const ldes = ldesTrafficFactor(data);
  const sdesFactor = operation.sdesEnabled ? 0.99 : 1;
  const equalizationFactor = operation.equalizationPulsesEnabled ? 1 : 0.98;
  const baseBands = defaultDmePmdtData.trafficLoad.slice(0, 4);
  const perTxFactor = (tx: TransmitterId): number => {
    const state = derivePrfState(data, tx, 1);
    const referencePrf = referencePrfByTransmitter[tx][0];
    const deadTimeFactor = clamp(defaultDeadTime / Math.max(1, data.txConfigNominal.rtcParameters.deadTime), 0.1, 1.5);
    return Math.max(0, (state.effective / Math.max(1, referencePrf)) * deadTimeFactor * sdesFactor * equalizationFactor * ldes.suppression);
  };
  const bands = baseBands.map((row) => ({
    ...row,
    tx1: Math.round(row.tx1 * perTxFactor("tx1") * (transmitterAvailable(data, "tx1") ? 1 : 0)),
    tx2: Math.round(row.tx2 * perTxFactor("tx2") * (transmitterAvailable(data, "tx2") ? 1 : 0)),
  }));
  const totalReplies = {
    band: "Total Replies",
    tx1: bands.reduce((sum, row) => sum + row.tx1, 0),
    tx2: bands.reduce((sum, row) => sum + row.tx2, 0),
  };
  const monitorReplies = {
    band: "Monitor Replies",
    tx1: Math.round((defaultDmePmdtData.trafficLoad.find((row) => row.band === "Monitor Replies")?.tx1 ?? 0)
      * perTxFactor("tx1") * (transmitterAvailable(data, "tx1") ? 1 : 0)),
    tx2: Math.round((defaultDmePmdtData.trafficLoad.find((row) => row.band === "Monitor Replies")?.tx2 ?? 0)
      * perTxFactor("tx2") * (transmitterAvailable(data, "tx2") ? 1 : 0)),
  };
  const rows = [totalReplies, monitorReplies];
  if (operation.ldesEnabled) {
    rows.push({
      band: "LDES Triggers",
      tx1: Math.round(totalReplies.tx1 * ldes.triggerRate),
      tx2: Math.round(totalReplies.tx2 * ldes.triggerRate),
    });
  }
  return [...bands, ...rows];
}

function derivePaStatus(data: DmePmdtData): DmePmdtData["paStatus"] {
  const parameters = data.txConfigNominal.powerAmplifiers;
  return data.paStatus.map((row) => {
    const isHpa = row.name.startsWith("HPA");
    const amplifierNumber = row.name.endsWith("#2") ? 2 : 1;
    const tx: TransmitterId = amplifierNumber === 1 ? "tx1" : "tx2";
    const available = transmitterAvailable(data, tx);
    const enabled = isHpa ? (amplifierNumber === 1 ? parameters.hpa1Enabled : parameters.hpa2Enabled) : true;
    const target = targetPowerWatts(data, tx, 1);
    const actual = target * amplifierFactor(data, tx);
    const lowPower = paOutputBelowAlertLimit(data, tx);
    const notApplicable = isHpa && data.rmsConfigStation.powerLevel === "Low Power";
    const stateColor: DmeIndicatorColor = !available || notApplicable ? "gray" : !enabled || lowPower ? "red" : "green";
    return {
      ...row,
      vswr: stateColor,
      longPulseFault: stateColor,
      powerSupply: stateColor,
      outputPower: stateColor,
      rmsTemperature: stateColor,
      userEnabled: stateColor,
      rmsRtcEnabled: stateColor,
      control: available && enabled ? "On" : "Off",
    };
  });
}

function deriveTransmitterStates(data: DmePmdtData): void {
  const dual = data.rmsConfigStation.transmitterConfig === "Dual Transmitters";
  for (const tx of ["tx1", "tx2"] as const) {
    const state = data.transmitters[tx];
    state.main = "gray";
    state.antenna = "gray";
    state.load = "gray";
    state.off = "gray";
    if (tx === "tx2" && !dual) continue;
    if (!data.monitorTransmitterStatus.transmitterOn[tx]) {
      state.off = "green";
    } else if ((data.monitorTransmitterStatus.antennaSelect === 1 && tx === "tx1")
      || (data.monitorTransmitterStatus.antennaSelect === 2 && tx === "tx2")) {
      state.main = "green";
      state.antenna = "green";
    } else {
      state.load = "green";
    }
  }
}

function deriveCalibrationData(data: DmePmdtData, allocation: DmeChannelAllocation): DmePmdtData["monitorCalibrationData"] {
  const update = (rows: DmePmdtData["monitorCalibrationData"]["monitor1"], monitorNumber: 1 | 2) => rows.map((row) => {
    const referenceRow = (monitorNumber === 1 ? defaultDmePmdtData.monitorCalibrationData.monitor1 : defaultDmePmdtData.monitorCalibrationData.monitor2)
      .find((candidate) => candidate.parameter === row.parameter);
    const defaultDelta = referenceRow ? referenceRow.actual - referenceRow.baseline : 0;
    const tx = transmitterForMonitorNumber(data, monitorNumber);
    const baseline = row.parameter === "Delay"
      ? allocation.nominalReplyDelayUs
      : row.parameter === "Spacing"
        ? allocation.transmitterReplyPulseSpacingUs
        : row.parameter === "Peak Power"
          ? targetPowerWatts(data, tx, monitorNumber)
          : row.parameter === "PRF"
            ? referencePrfByTransmitter[tx][monitorNumber - 1]
            : row.baseline;
    const extraOffset = row.parameter === "Delay"
      ? transmitterOffset(data, "Base Offset", tx) + data.txConfigNominal.rtcParameters.replyDelayOffset + monitorOffset(data, monitorNumber, "Delay Offset", "integral")
      : row.parameter === "Spacing"
        ? monitorOffset(data, monitorNumber, "Spacing Offset", "integral")
        : row.parameter === "Peak Power"
          ? monitorOffset(data, monitorNumber, "Tx Power Offset", "integral")
          : row.parameter === "Efficiency"
            ? monitorOffset(data, monitorNumber, "Efficiency Offset", "integral")
            : row.parameter === "PRF"
              ? monitorOffset(data, monitorNumber, "PRF Offset", "integral")
              : 0;
    const actual = round(baseline + defaultDelta + extraOffset, row.parameter === "Peak Power" || row.parameter === "PRF" ? 0 : 2);
    return { ...row, baseline: round(baseline, row.parameter === "Peak Power" || row.parameter === "PRF" ? 0 : 2), actual, offset: round(actual - baseline, 2) };
  });
  return {
    monitor1: update(data.monitorCalibrationData.monitor1, 1),
    monitor2: update(data.monitorCalibrationData.monitor2, 2),
  };
}

function deriveMonitorStates(data: DmePmdtData, integralData: DmeDualValueRow[], standbyData: DmeDualValueRow[]): DmePmdtData["monitors"] {
  const next = structuredClone(data.monitors);
  const integrityEnabled = data.rmsConfigGeneral.monitorIntegrityTestsEnabled;
  const voting = data.rmsConfigGeneral.votingLogic;
  const stateFor = (kind: MeasurementKind, rows: DmeDualValueRow[], key: "integral" | "standby") => {
    const availableIndexes = ([1, 2] as const).filter((monitorNumber) => monitorAvailable(data, kind, monitorNumber));
    const alarmsFor = (role: "primary" | "secondary") => {
      const configured = data.monitorConfigGeneral.filter((item) => item[role]).map((item) => item.parameter);
      const values = availableIndexes.map((monitorNumber) => {
        const statusKey = monitorNumber === 1 ? "mon1Status" : "mon2Status";
        return rows.some((row) => configured.includes(row.label) && row[statusKey] === "alarm");
      });
      if (values.length === 0) return false;
      return voting === "AND" ? values.every(Boolean) : values.some(Boolean);
    };
    const hasWarning = availableIndexes.some((monitorNumber) => {
      const statusKey = monitorNumber === 1 ? "mon1Status" : "mon2Status";
      return rows.some((row) => row[statusKey] === "warning" || row[statusKey] === "yellow");
    });
    const rawPrimary = alarmsFor("primary");
    const rawSecondary = alarmsFor("secondary");
    const primary = integrityEnabled && rawPrimary;
    const secondary = integrityEnabled && rawSecondary;
    // When integrity is disabled the rows stay yellow, but voting does not
    // disable the monitor or silently remove the failure.
    const integrityAlert = !integrityEnabled && (rawPrimary || rawSecondary || hasWarning);
    next[key] = {
      ...next[key],
      normal: availableIndexes.length > 0 && !next[key].bypass && !primary && !secondary && !integrityAlert,
      priAlarm: primary,
      secAlarm: secondary,
    };
    return { primary, secondary, integrityAlert, rawPrimary, rawSecondary };
  };
  stateFor("integral", integralData, "integral");
  stateFor("standby", standbyData, "standby");
  return next;
}

function deriveSidebar(data: DmePmdtData, integralData: DmeDualValueRow[]): DmePmdtData["sidebarParams"] {
  const firstMonitor = new Map(integralData.map((row) => [row.label, row]));
  const valueFor = (label: string, fallback: number): number => numeric(firstMonitor.get(label)?.mon1Value) ?? fallback;
  const statusFor = (label: string): DmeParameterStatus => {
    const status = firstMonitor.get(label)?.mon1Status;
    return status === "warning" || status === "alarm" ? status : "normal";
  };
  return {
    delay: { value: valueFor("Delay", data.sidebarParams.delay.value), status: statusFor("Delay"), digits: 2 },
    spacing: { value: valueFor("Spacing", data.sidebarParams.spacing.value), status: statusFor("Spacing"), digits: 2 },
    txPower: { value: valueFor("Tx Power", data.sidebarParams.txPower.value), status: statusFor("Tx Power"), digits: 0 },
    erp: { value: valueFor("ERP", data.sidebarParams.erp.value), status: statusFor("ERP"), digits: 1 },
    efficiency: { value: valueFor("Efficiency", data.sidebarParams.efficiency.value), status: statusFor("Efficiency"), digits: 1 },
    prf: { value: valueFor("PRF", data.sidebarParams.prf.value), status: statusFor("PRF"), digits: 0 },
  };
}

function deriveDigitalIo(data: DmePmdtData): DmePmdtData["digitalInputs"] {
  const general = data.rmsConfigGeneral;
  return data.digitalInputs.map((row, index) => {
    if (index === 0) {
      const enabled = general.smokeAlarmInstalled;
      return { ...row, configuration: enabled ? "Enabled" : "Disabled", status: enabled ? (data.alert ? "Alarm" : "Normal") : "" };
    }
    if (index === 1) {
      const enabled = general.intrusionAlarmInstalled;
      return { ...row, configuration: enabled ? "Enabled" : "Disabled", status: enabled ? (data.alert ? "Alarm" : "Normal") : "" };
    }
    const spareIndex = index - 2;
    if (spareIndex >= 0 && spareIndex < general.spareInputs.length) return { ...row, configuration: general.spareInputs[spareIndex] };
    return row;
  });
}

function deriveRtcStatus(data: DmePmdtData): void {
  for (const tx of ["tx1", "tx2"] as const) {
    const available = transmitterAvailable(data, tx);
    const state = derivePrfState(data, tx, 1);
    // An intentionally unavailable/off transmitter is represented as gray,
    // not as a false low-power measurement.  A low-power alarm applies only
    // while that RTC is expected to be producing output.
    const powerAlarm = available && (outputBelowTarget(data, tx, 1) || paOutputBelowAlertLimit(data, tx));
    const hpaApplicable = data.rmsConfigStation.powerLevel === "High Power";
    const scaleAlarm = hpaApplicable && (tx === "tx1"
      ? !data.txConfigNominal.powerAmplifiers.hpa1Enabled
      : !data.txConfigNominal.powerAmplifiers.hpa2Enabled);
    const isIntegralTransmitter = data.monitorTransmitterStatus.antennaSelect === (tx === "tx1" ? 1 : 2);
    const identKind: MeasurementKind = isIntegralTransmitter ? "integral" : "standby";
    const identCode = identCodeFor(data, identKind, tx);
    const standbyIdentDisabled = identKind === "standby" && data.txConfigNominal.ident.standbyIdent === "Disabled";
    const identAlarm = data.identMode === "off"
      || (!standbyIdentDisabled && identCode.length < 2)
      || identStatusColor(data, identKind, tx) === "red";
    data.rtcStatus.overload[tx] = available && state.overload;
    // This is derived state, not a latched fault.  Recomputing a draft after
    // an operator fixes the source condition must clear the old alert.
    data.txStatus.maintenanceAlert[tx] = Boolean(
      powerAlarm
      || scaleAlarm
      || identAlarm
      || data.delayControl[tx === "tx1" ? "rtc1" : "rtc2"].fixed,
    );
    data.rtcStatus.cpuShutdown[tx] = available ? "Normal" : "Shutdown";
    const overloadRow = data.rtcMaintenanceAlerts.find((row) => row.label === "RTC Overload");
    if (overloadRow) overloadRow[tx] = state.overload ? "yellow" : available ? "green" : "gray";
    const enabledRow = data.rtcMaintenanceAlerts.find((row) => row.label === "Tx Enabled");
    if (enabledRow) enabledRow[tx] = available ? "green" : "red";
    const vswrRow = data.rtcMaintenanceAlerts.find((row) => row.label === "Monitor VSWR Fault");
    if (vswrRow) {
      const vswr = numeric((data.integralData.find((row) => row.label === "VSWR")?.[tx === "tx1" ? "mon1Value" : "mon2Value"])) ?? 1;
      vswrRow[tx] = vswr >= 4 ? "red" : vswr >= 3 ? "yellow" : available ? "green" : "gray";
    }
  }
}

/**
 * Formula from §3.6.9.2.1 / printed p132. Null limits stay null because the
 * corresponding integrity test is not present on that monitor row.
 */
export function deriveIntegrityTestTargets(limit: DmeAlarmLimitRow) {
  const offsetBased = limit.parameter === "Delay" || limit.parameter === "Spacing";
  const lower = limit.alarmLow === null ? null : offsetBased ? limit.nominal + limit.alarmLow : limit.alarmLow;
  const high = limit.alarmHigh === null ? null : offsetBased ? limit.nominal + limit.alarmHigh : limit.alarmHigh;
  const lowLow = lower === null ? null : lower - (limit.nominal - lower) / 10;
  const lowHigh = lower === null ? null : lower + (limit.nominal - lower) / 10;
  const highLow = high === null ? null : high - (high - limit.nominal) / 10;
  const highHigh = high === null ? null : high + (high - limit.nominal) / 10;
  return { lowLow, lowHigh, highLow, highHigh };
}

/** Used by Apply(F7) to reproduce the §6.2.8 alarm-transfer action. */
export function dmeTransferRequested(data: DmePmdtData): boolean {
  if (data.rmsConfigStation.transmitterConfig !== "Dual Transmitters" || !data.rmsConfigStation.hotStandby) return false;
  // Bypass leaves the monitor's alarm visible to the operator, but removes
  // that monitor from the automatic-transfer voting path.
  const integral = data.monitors.integral.bypass ? null : data.monitors.integral;
  const standby = data.monitors.standby.bypass ? null : data.monitors.standby;
  const primaryAlarm = Boolean(integral?.priAlarm || standby?.priAlarm);
  const secondaryAlarm = Boolean(integral?.secAlarm || standby?.secAlarm);
  if (data.rmsConfigGeneral.transfer === "on Primary Alarm") return primaryAlarm;
  if (data.rmsConfigGeneral.transfer === "on Secondary Alarm") return secondaryAlarm;
  return primaryAlarm || secondaryAlarm;
}

export function recomputeDmeDerivedData(source: DmePmdtData): DmePmdtData {
  const data = structuredClone(source);
  const allocation = getDmeStationChannelAllocation(data.rmsConfigStation);
  if (!allocation || !referenceChannel) return data;

  if (data.rmsConfigStation.transmitterConfig === "Single Transmitter") {
    data.monitorTransmitterStatus.transmitterOn.tx2 = false;
  } else if (!data.rmsConfigStation.hotStandby) {
    const standby = data.monitorTransmitterStatus.antennaSelect === 1 ? "tx2" : "tx1";
    data.monitorTransmitterStatus.transmitterOn[standby] = false;
  }
  deriveTransmitterStates(data);
  // Delay/Spacing nominal values are channel-derived in §3.6.8.2.2. Keep
  // the editable offset fields, but never let a stale absolute nominal from a
  // previous channel reinterpret the alarm thresholds.
  data.alarmLimits = data.alarmLimits.map((limit) => (
    limit.parameter === "Delay"
      ? { ...limit, nominal: allocation.nominalReplyDelayUs }
      : limit.parameter === "Spacing"
        ? { ...limit, nominal: allocation.transmitterReplyPulseSpacingUs }
        : limit
  ));
  data.integralData = deriveRows(data, "integral", allocation);
  data.standbyData = deriveRows(data, "standby", allocation);
  const detailLabels = new Set(["Delay", "Spacing", "Tx Power", "ERP", "Efficiency", "PRF"]);
  const detailRows = data.integralData.filter((row) => detailLabels.has(row.label));
  data.monitorDetailData = {
    monitor1: detailRows,
    monitor2: detailRows.map((row) => ({ ...row })),
  };
  data.decoderResults = deriveDecoderResults(data, allocation);
  data.delayControl = deriveDelayControl(data);
  data.trafficLoad = deriveTrafficLoad(data);
  data.paStatus = derivePaStatus(data);
  data.monitorCalibrationData = deriveCalibrationData(data, allocation);
  data.monitors = deriveMonitorStates(data, data.integralData, data.standbyData);
  data.sidebarParams = deriveSidebar(data, data.integralData);
  data.digitalInputs = deriveDigitalIo(data);
  data.rmsStatus.rcsuConnectionEnabled = data.rmsConfigGeneral.rcsuPresent;
  deriveRtcStatus(data);

  const rowAlert = [...data.integralData, ...data.standbyData].some((row) => (
    row.mon1Status === "warning" || row.mon1Status === "alarm" || row.mon1Status === "yellow"
    || row.mon2Status === "warning" || row.mon2Status === "alarm" || row.mon2Status === "yellow"
  ));
  const monitorAlarm = data.monitors.integral.priAlarm
    || data.monitors.integral.secAlarm
    || data.monitors.standby.priAlarm
    || data.monitors.standby.secAlarm;
  data.alert = Boolean(data.manualAlertOverride || rowAlert || monitorAlarm || data.txStatus.maintenanceAlert.tx1 || data.txStatus.maintenanceAlert.tx2);
  data.rmsStatus.maintenanceAlert = Boolean(
    data.local
    || data.txStatus.maintenanceAlert.tx1
    || data.txStatus.maintenanceAlert.tx2
    || rowAlert,
  );
  return data;
}
