import {
  VOR_INDICATOR_COLORS,
  VOR_PARAMETER_STATUSES,
  type VorExpectedCheckpoint,
  type VorFieldOverride,
  type VorScenario,
  type VorViewId,
} from "./vor-types";
import { isHardwareDiagnosisTask, type HardwareDiagnosisTask } from "./equipment-diagram-types";

export const VOR_SCENARIO_STORAGE_KEY = "cns-training:vor-scenarios";
export const VOR_SCENARIO_STORAGE_VERSION = 1 as const;

interface VorScenarioEnvelope {
  version: typeof VOR_SCENARIO_STORAGE_VERSION;
  scenarios: VorScenario[];
}

export interface VorStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const validViews: readonly VorViewId[] = [
  "home", "rms-maintenance-alerts", "rms-digital-io", "rms-logs-alarms",
  "rms-logs-maintenance", "monitor-integral", "monitor-sideband-vswr",
  "monitor-alarm-limits", "monitor-1-offsets", "monitor-2-offsets",
  "tx-data-main", "tx-status-1", "tx-config-nominal", "tx-config-offsets",
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

function isOverride(value: unknown): value is VorFieldOverride {
  if (!isRecord(value) || !isString(value.fieldId) || !isEditableValue(value.value)) {
    return false;
  }
  if (value.status === undefined) return true;
  return (
    isString(value.status) &&
    ([...VOR_INDICATOR_COLORS, ...VOR_PARAMETER_STATUSES] as readonly string[]).includes(
      value.status,
    )
  );
}

function isCheckpoint(value: unknown): value is VorExpectedCheckpoint {
  return (
    isRecord(value) &&
    isString(value.id) &&
    typeof value.order === "number" &&
    Number.isInteger(value.order) &&
    value.order > 0 &&
    isString(value.viewId) &&
    validViews.includes(value.viewId as VorViewId) &&
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

export function isVorScenario(value: unknown): value is VorScenario {
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

export function cloneVorScenario(scenario: VorScenario): VorScenario {
  return structuredClone(scenario);
}

export function serializeVorScenarios(
  scenarios: readonly VorScenario[],
): string {
  if (!scenarios.every(isVorScenario)) {
    throw new Error("VOR scenario data is invalid.");
  }
  const envelope: VorScenarioEnvelope = {
    version: VOR_SCENARIO_STORAGE_VERSION,
    scenarios: scenarios.map(cloneVorScenario),
  };
  return JSON.stringify(envelope);
}

export function deserializeVorScenarios(rawValue: string | null): VorScenario[] {
  if (!rawValue) return [];
  const parsed = JSON.parse(rawValue) as unknown;
  if (
    !isRecord(parsed) ||
    parsed.version !== VOR_SCENARIO_STORAGE_VERSION ||
    !Array.isArray(parsed.scenarios) ||
    !parsed.scenarios.every(isVorScenario)
  ) {
    throw new Error("Stored VOR scenarios use an unsupported or invalid format.");
  }
  return parsed.scenarios.map(cloneVorScenario);
}

function jsonField(row: Record<string, unknown>, field: string): unknown {
  const value = row[field];
  if (typeof value === "string") return JSON.parse(value) as unknown;
  return value;
}

function requiredString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (!isString(value)) throw new Error(`VOR database field "${field}" is invalid.`);
  return value;
}

export function mapRowToVorScenario(row: unknown): VorScenario {
  if (!isRecord(row)) throw new Error("VOR database row must be an object.");
  const difficulty = requiredString(row, "difficulty");
  const candidate: VorScenario = {
    id: requiredString(row, "id"),
    title: requiredString(row, "title"),
    description: requiredString(row, "description"),
    difficulty: difficulty as VorScenario["difficulty"],
    prompt: requiredString(row, "prompt"),
    overrides: jsonField(row, "overrides") as VorFieldOverride[],
    expectedCheckpoints: jsonField(row, "expected_checkpoints") as VorExpectedCheckpoint[],
    ...(row.hardware_task ? { hardwareTask: jsonField(row, "hardware_task") as HardwareDiagnosisTask } : {}),
    createdAt: requiredString(row, "created_at"),
    ...(row.updated_at ? { updatedAt: requiredString(row, "updated_at") } : {}),
  };
  if (!isVorScenario(candidate)) throw new Error("VOR database scenario is invalid.");
  return candidate;
}

export function vorScenarioToRow(scenario: VorScenario) {
  if (!isVorScenario(scenario)) throw new Error("Cannot persist an invalid VOR scenario.");
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

export function saveVorScenarios(
  storage: VorStorageLike,
  scenarios: readonly VorScenario[],
): void {
  storage.setItem(VOR_SCENARIO_STORAGE_KEY, serializeVorScenarios(scenarios));
}

export function loadVorScenarios(storage: VorStorageLike): VorScenario[] {
  return deserializeVorScenarios(storage.getItem(VOR_SCENARIO_STORAGE_KEY));
}
