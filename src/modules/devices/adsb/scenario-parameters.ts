import { normalizeScenario } from "@/lib/scenario-normalization";
import type {
  LoginUser,
  QcmsEvent,
  RecordedAction,
  ScenarioHardwareFault,
  SensorState,
  SiteState,
} from "@/lib/types";

export const ADSB_SCENARIO_SCHEMA_VERSION = 1 as const;

export type AdsbScenarioDifficulty = "basic" | "intermediate" | "advanced";

/**
 * Normalized ADS-B definition used by Scenario Parameters and library
 * snapshots. The field names intentionally differ from the legacy Scenario
 * title field so the source can be validated by the common metadata contract.
 */
export interface AdsbScenarioDefinition {
  schemaVersion: typeof ADSB_SCENARIO_SCHEMA_VERSION;
  id: string;
  name: string;
  description: string;
  difficulty: AdsbScenarioDifficulty;
  sites: SiteState[];
  targetSensorId: string;
  targetLoginUser: LoginUser;
  expectedActions: RecordedAction[];
  hardwareFault?: ScenarioHardwareFault;
  eventLog?: QcmsEvent[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeDifficulty(value: unknown): AdsbScenarioDifficulty | null {
  if (value === "basic" || value === "easy") return "basic";
  if (value === "intermediate" || value === "medium") return "intermediate";
  if (value === "advanced" || value === "hard") return "advanced";
  return null;
}

function isSensor(value: unknown): value is SensorState {
  return (
    isRecord(value) &&
    nonEmptyString(value.id) &&
    (value.sensorLabel === "A" || value.sensorLabel === "B") &&
    nonEmptyString(value.ipAddress) &&
    nonEmptyString(value.name)
  );
}

function isSite(value: unknown): value is SiteState {
  return (
    isRecord(value) &&
    nonEmptyString(value.id) &&
    nonEmptyString(value.name) &&
    (value.sensorA === null || value.sensorA === undefined || isSensor(value.sensorA)) &&
    (value.sensorB === null || value.sensorB === undefined || isSensor(value.sensorB))
  );
}

function isRecordedAction(value: unknown): value is RecordedAction {
  return (
    isRecord(value) &&
    typeof value.step === "number" &&
    Number.isInteger(value.step) &&
    value.step > 0 &&
    (value.kind === "menu-selection" ||
      value.kind === "value-input" ||
      value.kind === "authentication") &&
    nonEmptyString(value.menuId) &&
    nonEmptyString(value.menuTitle) &&
    typeof value.input === "string" &&
    typeof value.resultLabel === "string" &&
    typeof value.timestamp === "number" &&
    Number.isFinite(value.timestamp)
  );
}

function isHardwareFault(value: unknown): value is ScenarioHardwareFault {
  return (
    isRecord(value) &&
    Array.isArray(value.faultyComponentIds) &&
    value.faultyComponentIds.every(nonEmptyString) &&
    nonEmptyString(value.faultType) &&
    nonEmptyString(value.faultDescription) &&
    Array.isArray(value.hardwareLayout) &&
    Array.isArray(value.signalPaths) &&
    nonEmptyString(value.expectedSensorStatus) &&
    Array.isArray(value.terminalSymptoms) &&
    value.terminalSymptoms.every((item) => typeof item === "string") &&
    Array.isArray(value.qcmsSymptoms) &&
    value.qcmsSymptoms.every((item) => typeof item === "string") &&
    Array.isArray(value.diagnosticSteps) &&
    value.diagnosticSteps.every((item) => typeof item === "string")
  );
}

/**
 * Accept both the normalized shape and the current legacy ADS-B Scenario
 * shape. Legacy title/easy/medium/hard fields are normalized without changing
 * the simulator's action, site, QCMS or hardware-fault payloads.
 */
export function parseAdsbScenarioDefinition(
  value: unknown,
): AdsbScenarioDefinition | null {
  const normalized = normalizeScenario(value);
  if (!isRecord(normalized)) return null;

  const schemaVersion = normalized.schemaVersion ?? ADSB_SCENARIO_SCHEMA_VERSION;
  if (schemaVersion !== ADSB_SCENARIO_SCHEMA_VERSION) return null;

  const id = normalized.id;
  const name = normalized.name ?? normalized.title;
  const description = normalized.description;
  const difficulty = normalizeDifficulty(normalized.difficulty);
  const sites = normalized.sites;
  const targetSensorId = normalized.targetSensorId;
  const targetLoginUser = normalized.targetLoginUser;
  const expectedActions = normalized.expectedActions;

  if (
    !nonEmptyString(id) ||
    id.length > 200 ||
    !nonEmptyString(name) ||
    name.length > 200 ||
    typeof description !== "string" ||
    description.length > 2000 ||
    !difficulty ||
    !Array.isArray(sites) ||
    sites.length < 1 ||
    sites.length > 8 ||
    !sites.every(isSite) ||
    !nonEmptyString(targetSensorId) ||
    (targetLoginUser !== "sysadmin" && targetLoginUser !== "maintenance") ||
    !Array.isArray(expectedActions) ||
    expectedActions.length < 1 ||
    !expectedActions.every(isRecordedAction)
  ) {
    return null;
  }

  const targetSensorExists = sites.some((site) =>
    [site.sensorA, site.sensorB].some((sensor) => sensor?.id === targetSensorId),
  );
  if (!targetSensorExists) return null;

  if (normalized.hardwareFault !== undefined && !isHardwareFault(normalized.hardwareFault)) {
    return null;
  }

  if (
    normalized.eventLog !== undefined &&
    (!Array.isArray(normalized.eventLog) ||
      !normalized.eventLog.every((event) => isRecord(event) && typeof event.message === "string"))
  ) {
    return null;
  }

  return {
    schemaVersion: ADSB_SCENARIO_SCHEMA_VERSION,
    id: id.trim(),
    name: name.trim(),
    description: description.trim(),
    difficulty,
    sites: sites as SiteState[],
    targetSensorId: targetSensorId.trim(),
    targetLoginUser,
    expectedActions: expectedActions as RecordedAction[],
    ...(normalized.hardwareFault
      ? { hardwareFault: normalized.hardwareFault as ScenarioHardwareFault }
      : {}),
    ...(normalized.eventLog ? { eventLog: normalized.eventLog as QcmsEvent[] } : {}),
  };
}
