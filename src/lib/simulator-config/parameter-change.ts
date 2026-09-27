import { collectChangedConfigFields } from "./diff";
import type { SimulatorConfigHistoryRecord } from "./types";

export type SimulatorParameterChangeState = "normal" | "warning" | "alarm";

export interface SimulatorParameterChangeLogEntry {
  id: string;
  timeTag: string;
  userName: string;
  file: string;
  parameter: string;
  state: SimulatorParameterChangeState;
}

/** Hard cap for the parameter-change view/history retained in one session. */
export const MAX_PARAMETER_CHANGE_LOG_ROWS = 500;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatParameterChangeTimeTag(value: number | string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)} - ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function humanizeSegment(segment: string): string {
  if (/^\d+$/.test(segment)) return `#${Number(segment) + 1}`;
  return segment
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatParameterChangeField(field: string): string {
  return field
    .split(".")
    .filter(Boolean)
    .map(humanizeSegment)
    .join(" / ");
}

export function parameterChangeFile(field: string, fallback = "RMS"): string {
  const parts = field.split(".");
  const transmitter = parts.find((part) => /^tx[12]$/i.test(part));
  if (transmitter) return `Transmitter #${transmitter.slice(-1)}`;
  const monitor = parts.find((part) => /^mon(?:itor)?[12]$/i.test(part));
  if (monitor) return `Monitor #${monitor.slice(-1)}`;
  return fallback;
}

export function createParameterChangeLogEntries({
  changedFields,
  timestampMs,
  timeTag,
  userName,
  file = "RMS",
  actionLabel,
  idPrefix,
}: {
  changedFields: readonly string[];
  timestampMs?: number;
  timeTag?: string;
  userName?: string | null;
  file?: string;
  actionLabel: string;
  idPrefix?: string;
}): SimulatorParameterChangeLogEntry[] {
  const fields = [...new Set(changedFields.filter((field) => field.trim().length > 0))];
  if (!fields.length) return [];

  const resolvedTimeTag = timeTag ?? formatParameterChangeTimeTag(timestampMs ?? Date.now());
  const resolvedUserName = userName?.trim() || "SYSTEM";
  const prefix = idPrefix ?? `${resolvedTimeTag}-${actionLabel}`;
  const entries = fields.map((field, index) => ({
    id: `${prefix}-${index}`,
    timeTag: resolvedTimeTag,
    userName: resolvedUserName,
    file: parameterChangeFile(field, file),
    parameter: formatParameterChangeField(field),
    state: "normal" as const,
  }));

  entries.push({
    id: `${prefix}-backup`,
    timeTag: resolvedTimeTag,
    userName: resolvedUserName,
    file,
    parameter: actionLabel,
    state: "normal",
  });
  return entries;
}

export function prependParameterChangeLogEntries(
  existing: readonly SimulatorParameterChangeLogEntry[],
  next: readonly SimulatorParameterChangeLogEntry[],
): SimulatorParameterChangeLogEntry[] {
  return [...next, ...existing].slice(0, MAX_PARAMETER_CHANGE_LOG_ROWS);
}

export function parameterChangesFromHistory(
  history: readonly SimulatorConfigHistoryRecord[],
  file = "RMS",
): SimulatorParameterChangeLogEntry[] {
  const entries = history.flatMap((record) => {
    if (record.action !== "backup" && record.action !== "flash-save") return [];
    return createParameterChangeLogEntries({
      changedFields: record.changedFields,
      timeTag: formatParameterChangeTimeTag(record.createdAt),
      userName: record.operatorUserId,
      file,
      actionLabel: record.action === "backup" ? "RMS Configuration Backup" : "Profile Save",
      idPrefix: record.id,
    });
  });
  return entries.slice(0, MAX_PARAMETER_CHANGE_LOG_ROWS);
}

export { collectChangedConfigFields };
