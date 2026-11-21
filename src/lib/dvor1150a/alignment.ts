import type { Dvor1150aConfig, Dvor1150aSnapshot, DvorMonitorId } from "./config-types";
import { createDefaultDvor1150aConfig } from "./defaults";
import { buildDvorMonitorCalibrationInput } from "./engine";
import { dvorSidebandAssembly } from "./sideband";

export interface DvorAlignmentReading {
  id: string;
  value: number | null;
  unit: string;
  min: number;
  max: number;
  status: "pass" | "fail" | "unavailable";
}

// Transfer rates and neutral settings are training conventions, not measured hardware characteristics.
export const DVOR_ALIGNMENT_TRAINING = {
  detectorNeutral: 0.925, detectorDegreesPerVolt: 3600,
  errorNeutral: 0.9, errorDegreesPerVolt: 9000,
  meanNeutral: 6, meanDegreesPerVolt: 45,
  differenceVoltsPerDegree: 0.05,
  pllErrorVoltsPerPercent: 0.02, pllOffsetVoltsPerPercent: 0.1,
} as const;
const references = createDefaultDvor1150aConfig().transmitters;

export function alignmentReading(id: string, value: number | null, min: number, max: number, unit = "VDC"): DvorAlignmentReading {
  const measured = value !== null && Number.isFinite(value) ? value : null;
  return { id, value: measured, min, max, unit,
    status: measured === null ? "unavailable" : measured >= min - 1e-9 && measured <= max + 1e-9 ? "pass" : "fail" };
}

export function readSidebandAlignment(config: Dvor1150aConfig, snapshot: Dvor1150aSnapshot, occurrence: string): DvorAlignmentReading[] {
  const assembly = dvorSidebandAssembly(occurrence);
  if (!assembly) return [];
  const tx = snapshot.effectiveTransmitters[assembly.tx];
  const trims = config.sidebandTrims?.[assembly.id];
  const offsets = config.transmitters[assembly.tx].offsets;
  const reference = references[assembly.tx].offsets;
  const training = DVOR_ALIGNMENT_TRAINING;
  const branches = ([0, 1] as const).flatMap(branch => {
    const angle = trims?.[branch === 0 ? "R1" : "R4"] ?? 0;
    const available = tx.sidebandPower[assembly.first + branch] > 0;
    return [
      alignmentReading(branch === 0 ? "TP1" : "TP7", available ? training.detectorNeutral + angle / training.detectorDegreesPerVolt : null, 0.9, 0.95),
      alignmentReading(branch === 0 ? "TP4" : "TP10", available ? training.meanNeutral + angle / training.meanDegreesPerVolt : null, 2, 9),
      alignmentReading(branch === 0 ? "TP5" : "TP11", available ? training.errorNeutral + angle / training.errorDegreesPerVolt : null, 0.89, 0.91),
    ];
  });
  const a = assembly.first === 0 ? "sideband1PhaseOffset" : "sideband3PhaseOffset";
  const b = assembly.first === 0 ? "sideband2PhaseOffset" : "sideband4PhaseOffset";
  const difference = ((offsets[a] - offsets[b]) - (reference[a] - reference[b])) * training.differenceVoltsPerDegree;
  return [...branches, alignmentReading("TP6", tx.sidebandPower[assembly.first] > 0 && tx.sidebandPower[assembly.first + 1] > 0 ? difference : null, -0.05, 0.05)];
}

export function readSynthesizerAlignment(config: Dvor1150aConfig, snapshot: Dvor1150aSnapshot, occurrence: string): DvorAlignmentReading[] {
  const id = occurrence === "synth-1a3a1" ? "tx1" : occurrence === "synth-1a3a11" ? "tx2" : null;
  if (!id) return [];
  const tx = config.transmitters[id];
  const effective = snapshot.effectiveTransmitters[id];
  const available = (effective.onAir || effective.load) && effective.effectiveOutputPower > 0;
  const error = tx.offsets.carrierPllControl - references[id].offsets.carrierPllControl;
  const nominal = config.station.frequencyMHz;
  return [
    alignmentReading("TP1", available ? error * DVOR_ALIGNMENT_TRAINING.pllErrorVoltsPerPercent : null, -0.05, 0.05),
    alignmentReading("TP2", available ? Math.max(0, Math.min(10, 5 + error * DVOR_ALIGNMENT_TRAINING.pllOffsetVoltsPerPercent)) : null, 2, 8),
    alignmentReading("J2", available ? nominal * (1 + tx.frequencyErrorPpm / 1e6) : null, nominal * (1 - 20 / 1e6), nominal * (1 + 20 / 1e6), "MHz"),
  ];
}

export function readMonitorAlignment(config: Dvor1150aConfig, snapshot: Dvor1150aSnapshot, monitor: DvorMonitorId) {
  const active = snapshot.voting.activeTransmitter;
  const available = active !== null && snapshot.monitors[monitor].enabled;
  const input = buildDvorMonitorCalibrationInput(config, monitor, active ? snapshot.effectiveTransmitters[active] : null);
  return (["azimuth", "hz30Modulation", "hz9960Modulation", "deviation", "rfLevel"] as const).map(parameter => ({
    parameter,
    input: available ? Number(input[parameter]) : null,
    indicated: available ? snapshot.monitors[monitor].parameters[parameter].value : null,
    unit: snapshot.monitors[monitor].parameters[parameter].unit,
  }));
}
