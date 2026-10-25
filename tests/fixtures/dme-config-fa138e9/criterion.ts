// Frozen guard bodies from fa138e9; only types/exports adapted.
import type { DmeTransmitterId } from "@/lib/dme-types";
import type { Dme1119aScenarioCriterion } from "@/lib/dme1119a/scenario";
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}


function isTransmitter(value: unknown): value is DmeTransmitterId {
  return value === "tx1" || value === "tx2";
}


function isCriterion(value: unknown): value is Dme1119aScenarioCriterion {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim() || typeof value.kind !== "string") return false;
  if (value.kind === "monitor-normal") return value.monitor === "integral" || value.monitor === "standby";
  if (value.kind === "monitor-alarm-clear") return value.severity === "primary" || value.severity === "secondary" || value.severity === "both";
  if (value.kind === "active-transmitter") return value.expected === "any" || isTransmitter(value.expected);
  if (value.kind === "active-path-healthy") return true;
  if (value.kind === "parameter-status") return (value.monitor === "integral" || value.monitor === "standby")
    && typeof value.parameter === "string"
    && (value.expected === "normal" || value.expected === "warning" || value.expected === "alarm");
  if (value.kind === "rtc-overload-clear") return value.transmitter === "active" || value.transmitter === "both" || isTransmitter(value.transmitter);
  if (value.kind === "bypass-cleared") return value.monitor === "integral" || value.monitor === "standby" || value.monitor === "both";
  if (value.kind === "ident-normal") return true;
  if (value.kind === "fan-control") return value.expected === "Automatic" || value.expected === "On" || value.expected === "Off";
  if (value.kind === "ac-power-normal") return true;
  return false;
}

export { isCriterion as legacyIsCriterion };
