import type { DmePmdtData } from "../dme-types";

/**
 * Free-run Diagnostics lifecycle (Stage 2 G05, manual §3.6.11).
 *
 * Durations are the owner-approved trainer-model values (audit §6/Q5):
 * Full Diagnostics 60 s, On-Air Diagnostics 30 s on the simulated clock.
 * The outcome is derived live from the active fault/alarm state at the
 * moment the run completes; it is a training model, not the equipment's
 * real BITE.
 */
export const DME_DIAGNOSTIC_DURATIONS_SECONDS = Object.freeze({
  full: 60,
  "on-air": 30,
} as const);

export type DmeDiagnosticRunMode = keyof typeof DME_DIAGNOSTIC_DURATIONS_SECONDS;

/** Fault Isolation rows, in the order the workspace renders them. */
export const DME_FAULT_ISOLATION_SUBSYSTEMS = [
  "Logon / RMM",
  "Power Supplies",
  "Monitor",
  "Rx/Tx Controller",
  "Power Amplifiers",
  "Transponder",
  "Control",
] as const;

export interface DmeDiagnosticOutcome {
  faultedSubsystems: string[];
  result: string;
}

export function deriveDmeDiagnosticOutcome(data: DmePmdtData): DmeDiagnosticOutcome {
  const faults = data.simulationFaults;
  const txFaults = [faults?.transmitters.tx1, faults?.transmitters.tx2];
  const faulted = new Set<string>();

  if (faults?.acPowerFailed) faulted.add("Power Supplies");
  if (txFaults.some((fault) => fault && (fault.hpaFault || fault.powerLossDb > 0))) {
    faulted.add("Power Amplifiers");
  }
  if (txFaults.some((fault) => fault?.rtcCommFault)) faulted.add("Rx/Tx Controller");
  if (txFaults.some((fault) => fault && fault.antennaVswr !== null && fault.antennaVswr >= 3)) {
    faulted.add("Transponder");
  }
  if (faults && faults.identSignal !== "normal") faulted.add("Control");
  if (faults && Object.values(faults.temperature).some((value) => value !== null)) {
    faulted.add("Control");
  }

  // A monitor alarm that no injected transmitter/power fault explains is
  // isolated to the Monitor subsystem itself (e.g. a monitor offset fault).
  const monitorAlarmed = data.monitors.integral.priAlarm
    || data.monitors.integral.secAlarm
    || data.monitors.standby.priAlarm
    || data.monitors.standby.secAlarm;
  if (monitorAlarmed && faulted.size === 0) faulted.add("Monitor");

  const faultedSubsystems = DME_FAULT_ISOLATION_SUBSYSTEMS.filter((name) => faulted.has(name));
  return {
    faultedSubsystems,
    result: faultedSubsystems.length > 0
      ? `Fault isolated: ${faultedSubsystems.join(", ")}`
      : "NO FAULT FOUND",
  };
}
