import { AC_REFERENCE } from "./ac-monitor";

export const HARDWARE_TRIMS = {
  rf: ["R1", "R2", "R3"],
  bcps1: ["R30", "R56"],
  bcps2: ["R30", "R56"],
} as const;
export type HardwareAssembly = keyof typeof HARDWARE_TRIMS;
export type HardwareTrim = "R1" | "R2" | "R3" | "R30" | "R56";
export interface HardwareCalibration {
  rf: { R1: number; R2: number; R3: number };
  bcps1: { R30: number; R56: number };
  bcps2: { R30: number; R56: number };
}

export function initialHardwareCalibration(): HardwareCalibration {
  return { rf: { R1: 0, R2: 0, R3: 0 }, bcps1: { R30: 0, R56: 0 }, bcps2: { R30: 0, R56: 0 } };
}

export function indicatedCarrier(forward: number, load: boolean, calibration?: HardwareCalibration) {
  return forward * (1 + (calibration?.rf[load ? "R3" : "R1"] ?? 0) / 180);
}

export function indicatedCarrierVswr(vswr: number, calibration?: HardwareCalibration): number | null {
  const forwardGain = 1 + (calibration?.rf.R1 ?? 0) / 180;
  if (forwardGain <= 0) return null;
  const reflectedGain = 1 + (calibration?.rf.R2 ?? 0) / 180;
  if (forwardGain === reflectedGain) return vswr;
  const rho = Math.min(0.999, (vswr - 1) / (vswr + 1) * Math.sqrt(reflectedGain / forwardGain));
  return (1 + rho) / (1 - rho);
}

export function indicatedAc(assembly: "bcps1" | "bcps2", calibration?: HardwareCalibration) {
  return {
    volts: AC_REFERENCE.volts * (1 + (calibration?.[assembly].R30 ?? 0) / 900),
    amps: AC_REFERENCE.amps * (1 + (calibration?.[assembly].R56 ?? 0) / 900),
  };
}
