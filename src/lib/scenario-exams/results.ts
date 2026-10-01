import { isScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { CandidateScenarioExamResult } from "./types";

const sensitiveKey = /password|secret|token|privatekey|api.?key|encryption.?key|securityaccounts/i;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Only JSON data, with bounded nesting, may enter candidate evidence. */
function safeJson(value: unknown, depth = 0): boolean {
  if (depth > 30) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((entry) => safeJson(entry, depth + 1));
  return isRecord(value) && Object.entries(value).every(([key, entry]) => !sensitiveKey.test(key) && safeJson(entry, depth + 1));
}

export function sanitizeScenarioExamPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeScenarioExamPayload);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key, entry]) => !sensitiveKey.test(key) && key !== "definition" && entry !== undefined && typeof entry !== "function")
    .map(([key, entry]) => [key, sanitizeScenarioExamPayload(entry)]));
}

export function parseCandidateScenarioExamResult(value: unknown): CandidateScenarioExamResult | null {
  if (!isRecord(value) || value.version !== 1
    || typeof value.sessionItemId !== "string" || !value.sessionItemId
    || typeof value.moduleId !== "string" || !isScenarioParametersModuleId(value.moduleId)
    || typeof value.scenarioId !== "string" || !value.scenarioId
    || typeof value.revision !== "number" || !Number.isInteger(value.revision) || value.revision < 1
    || typeof value.capturedAt !== "string" || Number.isNaN(Date.parse(value.capturedAt))
    || !isRecord(value.payload) || !Object.keys(value.payload).length || !safeJson(value.payload)) return null;
  const serialized = JSON.stringify({ version: 1, sessionItemId: value.sessionItemId,
    moduleId: value.moduleId, scenarioId: value.scenarioId, revision: value.revision,
    capturedAt: value.capturedAt, payload: value.payload });
  if (new TextEncoder().encode(serialized).length > 750_000) return null;
  return JSON.parse(serialized) as CandidateScenarioExamResult;
}
