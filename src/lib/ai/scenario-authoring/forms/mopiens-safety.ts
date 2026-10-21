import type { JsonValue } from "../types";
import { assertSafeJson } from "./helpers";
import { protectedMopiensPath } from "./mopiens-schema";
/** Traverse the trusted native factory, never untrusted keys to build controls. */
export function assertMopiensShape(input: unknown, reference: unknown, path = ""): void {
  if (!path) assertSafeJson(input);
  if (protectedMopiensPath(path) || /configuration\.monitor\.limits\.[^.]+\.unit$/.test(path) || path === "schemaVersion") {
    if (input !== reference) throw new Error(`Trường được bảo vệ: ${path}.`);
    return;
  }
  if (Array.isArray(reference)) {
    if (!Array.isArray(input)) throw new Error(`Cần danh sách: ${path}.`);
    if (path.startsWith("configuration.environment.")) {
      if (input.length !== reference.length || input.some(x => typeof x !== "boolean")) throw new Error(`Số kênh native không hợp lệ: ${path}.`);
    }
    return;
  }
  if (reference !== null && typeof reference === "object") {
    if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error(`Cấu trúc không hợp lệ: ${path}.`);
    const expected = Object.keys(reference), keys = Object.keys(input);
    if (keys.length !== expected.length || keys.some(k => !Object.hasOwn(reference, k))) throw new Error(`Trường thiếu hoặc không được hỗ trợ: ${path}.`);
    for (const key of expected) assertMopiensShape((input as Record<string, unknown>)[key], (reference as Record<string, unknown>)[key], path ? `${path}.${key}` : key);
    return;
  }
  const nullableThreshold = /\.(lowerAlarm|lowerWarning|upperWarning|upperAlarm|alarmLow|warningLow|warningHigh|alarmHigh)$/.test(path);
  if (nullableThreshold && (input === null || typeof input === "number")) return;
  if (typeof input !== typeof reference || (reference === null && input !== null)) throw new Error(`Sai kiểu native: ${path}.`);
}
export function mopiensListIssues(runtime: Record<string, JsonValue>): Array<{ fieldId: string; message: string }> {
  const issues: Array<{fieldId: string; message: string}> = [];
  const unique = (field: string, key: (v: Record<string, JsonValue>) => string) => {
    const seen = new Set<string>();
    for (const item of runtime[field] as Record<string, JsonValue>[]) {
      const id = key(item);
      if (seen.has(id)) issues.push({fieldId: `runtime.${field}`, message: `Mục trùng: ${field}.`});
      seen.add(id);
    }
  };
  unique("faults", v => String(v.id));
  unique("faults", v => [v.kind, v.target ?? v.transmitterId ?? v.monitorId ?? v.antenna ?? v.endpoint ?? v.sensor ?? "", v.unit ?? "", v.channelId ?? "", v.parameter ?? ""].join(":"));
  unique("measurementOverrides", v => [v.monitorId, v.channelId ?? v.channel, v.parameter].join(":"));
  if (runtime.antennaVswr) unique("antennaVswr", v => String(v.antenna));
  return issues;
}
