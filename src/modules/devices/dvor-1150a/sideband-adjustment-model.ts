/** UI-only training model. Never writes to the RF engine, evidence or server.
 * Manual: Model 1150A Rev. E, Table 3-14 (3-74 / PDF 192): R3/R6
 * clockwise increases power. Other trims' direction/rates are NOT specified.
 * All angle scales below are educational conventions, not hardware transfer functions.
 */
import { DVOR_BLOCK_BY_ID } from "./block-diagram-data";

export type SidebandTrimId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6";
export type SidebandAngles = Partial<Record<SidebandTrimId, number>>;
export interface SidebandAdjustmentControl {
  occurrenceId: string;
  angles: SidebandAngles;
  transmitterData: SidebandTransmitterData | null;
  onTurn: (id: SidebandTrimId, delta: number) => void;
}
export const SIDEBAND_TRIMS = {
  R1: { label: "PHS OFFSET", kind: "phase", powerTrim: "R3", point: "TP4" },
  R2: { label: "PWR CAL", kind: "calibration", powerTrim: "R3", point: "TP2" },
  R3: { label: "PWR ADJ", kind: "power", powerTrim: "R3", point: null },
  R4: { label: "PHS OFFSET", kind: "phase", powerTrim: "R6", point: "TP10" },
  R5: { label: "PWR CAL", kind: "calibration", powerTrim: "R6", point: "TP8" },
  R6: { label: "PWR ADJ", kind: "power", powerTrim: "R6", point: null },
} as const;

export interface SidebandTransmitterData {
  tx: 1 | 2;
  upper: 1 | 3;
  readings: { sideband: number; power: number; indicatedPower: number }[];
}

/** Project both assemblies of the selected TX from the schematic catalog.
 * Unknown occurrences never fall back to TX1; no RF/store/global PMDT writes.
 */
export function readSidebandTransmitter(states: Record<string, SidebandAngles>, occurrenceId: string): SidebandTransmitterData | null {
  const assemblies = DVOR_BLOCK_BY_ID.get("sideband")!.diagramHotspots;
  const selected = assemblies.find((entry) => entry.targetCabinetHotspotId === occurrenceId)?.sidebandChannels;
  if (!selected) return null;
  const readings = assemblies.filter((entry) => entry.sidebandChannels?.tx === selected.tx).flatMap((entry) => {
    const angles = states[entry.targetCabinetHotspotId!] ?? {};
    return (["R2", "R5"] as const).map((id, offset) => {
      const reading = readSidebandTrim(angles, id);
      return { sideband: entry.sidebandChannels!.upper + offset, power: reading.power, indicatedPower: reading.calibratedPower };
    });
  }).sort((a, b) => a.sideband - b.sideband);
  return { ...selected, readings };
}

// User-approved training conventions, not manufacturer transfer functions.
// Only PWR ADJ spans ten turns; CAL and PHS retain their own ±180° scales.
export const SIDEBAND_TRAINING = { minPower: 0, maxPower: 5, defaultPower: 2.5, step: 15 } as const;
export const SIDEBAND_SCALES = {
  power: { minAngle: -1800, maxAngle: 1800, degreesPerWatt: 720, coarseStep: 360 },
  calibration: { minAngle: -180, maxAngle: 180, degreesPerFactor: 900 },
  phase: { minAngle: -180, maxAngle: 180, defaultVoltage: 6, degreesPerVolt: 45 },
} as const;
function clampAngle(angle: number, id: SidebandTrimId) {
  const scale = SIDEBAND_SCALES[SIDEBAND_TRIMS[id].kind];
  return Math.max(scale.minAngle, Math.min(scale.maxAngle, angle));
}
export function turnSidebandTrim(angles: SidebandAngles, id: SidebandTrimId, delta: number): SidebandAngles {
  return { ...angles, [id]: clampAngle(clampAngle(angles[id] ?? 0, id) + delta, id) };
}
export function readSidebandTrim(angles: SidebandAngles, id: SidebandTrimId) {
  const trim = SIDEBAND_TRIMS[id];
  const angle = clampAngle(angles[id] ?? 0, id);
  const power = SIDEBAND_TRAINING.defaultPower + clampAngle(angles[trim.powerTrim] ?? 0, trim.powerTrim) / SIDEBAND_SCALES.power.degreesPerWatt;
  const calTrim = trim.powerTrim === "R3" ? "R2" : "R5";
  const calAngle = clampAngle(angles[calTrim] ?? 0, calTrim);
  const phaseTrim = trim.powerTrim === "R3" ? "R1" : "R4";
  const phaseAngle = clampAngle(angles[phaseTrim] ?? 0, phaseTrim);
  return {
    angle, power,
    calibratedPower: power * (1 + calAngle / SIDEBAND_SCALES.calibration.degreesPerFactor),
    controlVoltage: SIDEBAND_SCALES.phase.defaultVoltage + phaseAngle / SIDEBAND_SCALES.phase.degreesPerVolt,
  };
}
