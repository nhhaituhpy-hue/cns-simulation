import type { DvorConfigFieldDefinition } from "@/lib/dvor1150a/config-utils";

/** UI-only navigation; never changes catalog identifiers or permission semantics. */
export function dvor1150aScenarioPolicyGroupPath(field: DvorConfigFieldDefinition): readonly string[] {
  const { id, section } = field;
  if (id.startsWith("station.")) return ["RMS", "Configuration", "Station"];
  const tx = /^transmitters\.tx([12])\.(.+)$/.exec(id);
  if (tx) {
    const transmitter = `Transmitter ${tx[1]}`;
    if (tx[2].startsWith("nominal.")) return ["Transmitters", "Configuration", "Nominal", transmitter];
    if (tx[2].startsWith("offsets.")) return ["Transmitters", "Configuration", "Offsets and Scale Factors", transmitter];
    if (["enabled", "onAir", "load"].includes(tx[2])) return ["Transmitters", "Commands", transmitter];
    return ["Tham số mô phỏng", transmitter, tx[2].startsWith("faults.") ? "Fault injection" : "Giá trị đầu vào"];
  }
  if (id.startsWith("monitor.routing.")) return ["Monitors", "Configuration", "General"];
  if (id === "monitor.votingLogic" || id === "monitor.transfer" || id === "monitor.integrity.enabled") return ["RMS", "Configuration", "General"];
  if (/^monitor\.(alarmLimits|azimuthLimits|timers|sidebandVswr|antennas)\./.test(id) || id === "monitor.notchTolerance") {
    return ["Monitors", "Configuration", "Alarm Limits", ...(id.startsWith("monitor.antennas.") ? ["Antennas"] : [])];
  }
  const calibration = /^monitor\.(calibration|standbyCalibration|testGeneratorCalibration)\.mon([12])\./.exec(id);
  if (calibration) return [`Monitor ${calibration[2]}`, "Offsets & Scale Factors", calibration[1] === "calibration" ? "Integral" : calibration[1] === "standbyCalibration" ? "Standby" : "Test Generator / Certification"];
  if (id.startsWith("monitor.testGenerator.")) return ["Monitor 1 / Monitor 2", "Test Results", "Test Generator Setup"];
  if (id.startsWith("monitor.rawMeasurements.")) return ["Tham số mô phỏng", "Monitor raw measurements"];
  return ["Tham số mô phỏng", section];
}
