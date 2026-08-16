import type { DmeDualValueRow, DmeRmsConfigStation } from "../dme-types";
import { getDmeChannelAllocation, type DmeChannelAllocation } from "./channel-allocation";

const referenceAllocation = getDmeChannelAllocation(117, "X");

const assignedMeasurements: Record<
  string,
  { getNominal: (allocation: DmeChannelAllocation) => number; precision: 2 | 3 }
> = {
  Delay: { getNominal: (allocation) => allocation.nominalReplyDelayUs, precision: 2 },
  Spacing: { getNominal: (allocation) => allocation.transmitterReplyPulseSpacingUs, precision: 2 },
  "Tx Frequency": { getNominal: (allocation) => allocation.transmitterReplyFrequencyMHz, precision: 3 },
  "Rx LO Frequency": { getNominal: (allocation) => allocation.receiverLoFrequencyMHz, precision: 3 },
  "Rx Frequency": { getNominal: (allocation) => allocation.receiverFrequencyMHz, precision: 3 },
};

function shiftValue(
  value: string,
  measurement: (typeof assignedMeasurements)[string],
  allocation: DmeChannelAllocation,
): string {
  if (!referenceAllocation || !measurement) return value;
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) return value;

  const referenceNominal = measurement.getNominal(referenceAllocation);
  const assignedNominal = measurement.getNominal(allocation);
  return (assignedNominal + parsedValue - referenceNominal).toFixed(measurement.precision);
}

/**
 * Keeps screenshot-calibrated monitor snapshots while moving channel-derived
 * measurements when the station channel assignment is changed.
 */
export function withAssignedDmeMeasurements(
  rows: readonly DmeDualValueRow[],
  station: Pick<DmeRmsConfigStation, "channelNumber" | "channelType">,
): DmeDualValueRow[] {
  const allocation = getDmeChannelAllocation(station.channelNumber, station.channelType);
  if (!allocation) return rows.map((row) => ({ ...row }));

  return rows.map((row) => {
    const measurement = assignedMeasurements[row.label];
    if (!measurement) return { ...row };
    return {
      ...row,
      mon1Value: shiftValue(row.mon1Value, measurement, allocation),
      mon2Value: shiftValue(row.mon2Value, measurement, allocation),
    };
  });
}
