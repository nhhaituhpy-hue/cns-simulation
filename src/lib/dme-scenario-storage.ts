import {
  DME_INDICATOR_COLORS,
  DME_PARAMETER_STATUSES,
  type DmeExpectedCheckpoint,
  type DmeFieldOverride,
  type DmeScenario,
  type DmeViewId,
} from "./dme-types";
import { isHardwareDiagnosisTask, type HardwareDiagnosisTask } from "./equipment-diagram-types";
import { normalizeHardwareDiagnosisTask } from "./equipment-diagram-compatibility";

export const DME_SCENARIO_STORAGE_KEY = "cns-training:dme-scenarios";
export const DME_SCENARIO_STORAGE_VERSION = 1 as const;

interface DmeScenarioEnvelope {
  version: typeof DME_SCENARIO_STORAGE_VERSION;
  scenarios: DmeScenario[];
}

export interface DmeStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const validViews: readonly DmeViewId[] = [
  "home", "rms-status-main", "rms-status-monitor-tx",
  "rms-power-supply", "rms-ad-data", "rms-digital-io",
  "rms-logs-alarms", "rms-logs-maintenance",
  "rms-config-general", "rms-config-station", "rms-config-power-limits", "rms-config-ad-limits",
  "monitor-integral", "monitor-standby", "monitor-config-general", "monitor-alarm-limits",
  "monitor-1-decoder-results", "monitor-2-decoder-results",
  "monitor-1-offsets", "monitor-2-offsets",
  "monitor-1-data-detail-integral", "monitor-1-data-detail-standby",
  "monitor-2-data-detail-integral", "monitor-2-data-detail-standby",
  "monitor-1-calibration", "monitor-2-calibration",
  "tx-data-main", "tx-rtc-data", "tx-config-nominal", "tx-config-offsets",
  "disabled",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isEditableValue(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isOverride(value: unknown): value is DmeFieldOverride {
  if (!isRecord(value) || !isString(value.fieldId) || !isEditableValue(value.value)) {
    return false;
  }
  if (value.status === undefined) return true;
  return (
    isString(value.status) &&
    ([...DME_INDICATOR_COLORS, ...DME_PARAMETER_STATUSES] as readonly string[]).includes(
      value.status,
    )
  );
}

function isCheckpoint(value: unknown): value is DmeExpectedCheckpoint {
  return (
    isRecord(value) &&
    isString(value.id) &&
    typeof value.order === "number" &&
    Number.isInteger(value.order) &&
    value.order > 0 &&
    isString(value.viewId) &&
    validViews.includes(value.viewId as DmeViewId) &&
    value.viewId !== "disabled" &&
    Array.isArray(value.menuPath) &&
    value.menuPath.every(isString) &&
    isString(value.title) &&
    isString(value.guidance) &&
    typeof value.required === "boolean" &&
    typeof value.points === "number" &&
    Number.isFinite(value.points) &&
    value.points >= 0
  );
}

export function isDmeScenario(value: unknown): value is DmeScenario {
  return (
    isRecord(value) &&
    isString(value.id) && value.id.trim().length > 0 &&
    isString(value.title) && value.title.trim().length >= 3 &&
    isString(value.description) &&
    ["easy", "medium", "hard"].includes(String(value.difficulty)) &&
    isString(value.prompt) && value.prompt.trim().length > 0 &&
    isString(value.createdAt) &&
    (value.updatedAt === undefined || isString(value.updatedAt)) &&
    Array.isArray(value.overrides) && value.overrides.every(isOverride) &&
    Array.isArray(value.expectedCheckpoints) &&
    value.expectedCheckpoints.every(isCheckpoint) &&
    (value.hardwareTask === undefined || isHardwareDiagnosisTask(value.hardwareTask))
  );
}

export function cloneDmeScenario(scenario: DmeScenario): DmeScenario {
  const clone = structuredClone(scenario);
  if (clone.hardwareTask) {
    clone.hardwareTask = normalizeHardwareDiagnosisTask("dme", clone.hardwareTask);
  }
  return clone;
}

export function serializeDmeScenarios(
  scenarios: readonly DmeScenario[],
): string {
  if (!scenarios.every(isDmeScenario)) {
    throw new Error("DME scenario data is invalid.");
  }
  const envelope: DmeScenarioEnvelope = {
    version: DME_SCENARIO_STORAGE_VERSION,
    scenarios: scenarios.map(cloneDmeScenario),
  };
  return JSON.stringify(envelope);
}

export function deserializeDmeScenarios(rawValue: string | null): DmeScenario[] {
  if (!rawValue) return [];
  const parsed = JSON.parse(rawValue) as unknown;
  if (
    !isRecord(parsed) ||
    parsed.version !== DME_SCENARIO_STORAGE_VERSION ||
    !Array.isArray(parsed.scenarios) ||
    !parsed.scenarios.every(isDmeScenario)
  ) {
    throw new Error("Stored DME scenarios use an unsupported or invalid format.");
  }
  return parsed.scenarios.map(cloneDmeScenario);
}

function jsonField(row: Record<string, unknown>, field: string): unknown {
  const value = row[field];
  if (typeof value === "string") return JSON.parse(value) as unknown;
  return value;
}

function requiredString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (!isString(value)) throw new Error(`DME database field "${field}" is invalid.`);
  return value;
}

export function mapRowToDmeScenario(row: unknown): DmeScenario {
  if (!isRecord(row)) throw new Error("DME database row must be an object.");
  const difficulty = requiredString(row, "difficulty");
  const candidate: DmeScenario = {
    id: requiredString(row, "id"),
    title: requiredString(row, "title"),
    description: requiredString(row, "description"),
    difficulty: difficulty as DmeScenario["difficulty"],
    prompt: requiredString(row, "prompt"),
    overrides: jsonField(row, "overrides") as DmeFieldOverride[],
    expectedCheckpoints: jsonField(row, "expected_checkpoints") as DmeExpectedCheckpoint[],
    ...(row.hardware_task ? { hardwareTask: normalizeHardwareDiagnosisTask("dme", jsonField(row, "hardware_task") as HardwareDiagnosisTask) } : {}),
    createdAt: requiredString(row, "created_at"),
    ...(row.updated_at ? { updatedAt: requiredString(row, "updated_at") } : {}),
  };
  if (!isDmeScenario(candidate)) throw new Error("DME database scenario is invalid.");
  return candidate;
}

export function dmeScenarioToRow(scenario: DmeScenario) {
  if (!isDmeScenario(scenario)) throw new Error("Cannot persist an invalid DME scenario.");
  return {
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    difficulty: scenario.difficulty,
    prompt: scenario.prompt,
    overrides: scenario.overrides,
    expected_checkpoints: scenario.expectedCheckpoints,
    hardware_task: scenario.hardwareTask ?? null,
    created_at: scenario.createdAt,
    updated_at: scenario.updatedAt ?? null,
  };
}

export function saveDmeScenarios(
  storage: DmeStorageLike,
  scenarios: readonly DmeScenario[],
): void {
  storage.setItem(DME_SCENARIO_STORAGE_KEY, serializeDmeScenarios(scenarios));
}

export function loadDmeScenarios(storage: DmeStorageLike): DmeScenario[] {
  return deserializeDmeScenarios(storage.getItem(DME_SCENARIO_STORAGE_KEY));
}

