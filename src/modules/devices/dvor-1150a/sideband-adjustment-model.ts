/** UI-only training model. Never writes to the RF engine, evidence or server.
 * Manual: Model 1150A Rev. E, Table 3-14 (3-74 / PDF 192): R3/R6
 * clockwise increases power. Other trims' direction/rates are NOT specified.
 * All angle scales below are educational conventions, not hardware transfer functions.
 */
export type SidebandTrimId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6";
export type SidebandAngles = Partial<Record<SidebandTrimId, number>>;
export interface SidebandAdjustmentControl {
  occurrenceId: string;
  angles: SidebandAngles;
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

// User-selected training range, not manufacturer minimum/maximum.
export const SIDEBAND_TRAINING = { minPower: 1, maxPower: 5, defaultPower: 3, minAngle: -180, maxAngle: 180, step: 15 } as const;
export function turnSidebandTrim(angles: SidebandAngles, id: SidebandTrimId, delta: number): SidebandAngles {
  return { ...angles, [id]: Math.max(SIDEBAND_TRAINING.minAngle, Math.min(SIDEBAND_TRAINING.maxAngle, (angles[id] ?? 0) + delta)) };
}
export function readSidebandTrim(angles: SidebandAngles, id: SidebandTrimId) {
  const trim = SIDEBAND_TRIMS[id];
  const angle = angles[id] ?? 0;
  const power = SIDEBAND_TRAINING.defaultPower + (angles[trim.powerTrim] ?? 0) / 90;
  return { angle, power, calibratedPower: power * (1 + angle / 900), controlVoltage: 6 + angle / 45 };
}
