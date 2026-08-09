import type { MopiensVisualTone } from "@/modules/operations/mopiens-pmdt";
import type {
  Dme320AlarmPhase,
  Dme320MonitorLimit,
  Dme320MonitorParameter,
  Dme320OverallStatus,
  Dme320SimulationState,
} from "../domain/types";

export const DME320_PARAMETER_LABELS: Record<Dme320MonitorParameter, string> = {
  timeDelayUs: "Time Delay",
  replyEfficiencyPct: "Reply Efficiency",
  transmissionRatePps: "Transmission Rate",
  pulseRiseUs: "Pulse Rise Time",
  pulseDurationUs: "Pulse Duration",
  pulseDecayUs: "Pulse Decay Time",
  pulseSpacingUs: "Pulse Spacing",
  frequencyMhz: "Radio Frequency",
  peakPowerWatts: "Peak Power Output",
  vswr: "Antenna VSWR",
  erpDb: "Effective Radiated Power",
  identCode: "IDENT Code",
};

export function toneForServiceStatus(
  status: Dme320SimulationState["serviceStatus"],
): MopiensVisualTone {
  if (status === "normal") return "normal";
  if (status === "warning") return "warning";
  if (status === "alarm" || status === "shutdown") return "alarm";
  return "inactive";
}

export function toneForOverallStatus(status: Dme320OverallStatus): MopiensVisualTone {
  if (status === "normal") return "normal";
  if (status === "warning") return "warning";
  if (status === "alarm") return "alarm";
  return "inactive";
}

export function toneForAlarmPhase(phase: Dme320AlarmPhase): MopiensVisualTone {
  if (phase === "normal") return "normal";
  if (phase === "warning") return "warning";
  if (phase === "pending") return "pending";
  return "alarm";
}

export function toneForBatteryStatus(
  status: Dme320SimulationState["power"]["batteries"]["battery1"]["status"],
): MopiensVisualTone {
  if (status === "normal") return "normal";
  if (status === "warning") return "warning";
  if (status === "alarm" || status === "cutoff") return "alarm";
  return "inactive";
}

export function formatStatus(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatReading(value: number | string | null, unit = ""): string {
  if (value === null) return "N/A";
  if (typeof value === "number") {
    const precision = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
    return `${value.toFixed(precision)}${unit ? ` ${unit}` : ""}`;
  }
  return `${value}${unit ? ` ${unit}` : ""}`;
}

export function numericReading(value: number | string | null, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function gaugeRange(limit: Dme320MonitorLimit, value: number): { min: number; max: number } {
  const candidates = [
    limit.alarmLow,
    limit.warningLow,
    typeof limit.nominal === "number" ? limit.nominal : null,
    value,
    limit.warningHigh,
    limit.alarmHigh,
  ].filter((candidate): candidate is number => typeof candidate === "number" && Number.isFinite(candidate));
  const low = Math.min(...candidates);
  const high = Math.max(...candidates);
  const span = Math.max(1, high - low);
  return { min: low - span * 0.08, max: high + span * 0.08 };
}

export function gaugeSegments(limit: Dme320MonitorLimit, min: number, max: number) {
  const alarmLow = limit.alarmLow ?? min;
  const warningLow = limit.warningLow ?? alarmLow;
  const warningHigh = limit.warningHigh ?? max;
  const alarmHigh = limit.alarmHigh ?? warningHigh;
  return [
    { from: min, to: alarmLow, tone: "alarm" as const },
    { from: alarmLow, to: warningLow, tone: "warning" as const },
    { from: warningLow, to: warningHigh, tone: "normal" as const },
    { from: warningHigh, to: alarmHigh, tone: "warning" as const },
    { from: alarmHigh, to: max, tone: "alarm" as const },
  ].filter((segment) => segment.to > segment.from);
}
