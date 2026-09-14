import {
  isScenarioParametersModuleId,
  parseScenarioParameters,
  type ScenarioParametersDefinition,
  type ScenarioParametersModuleId,
} from "./scenario-parameters";

export interface StoredScenarioParameters {
  id: string;
  moduleId: ScenarioParametersModuleId;
  scenarioId: string;
  name: string;
  description: string;
  difficulty: string;
  schemaVersion: number;
  definition: ScenarioParametersDefinition;
  sourceFileName: string;
  createdAt: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Scenario Parameters database field "${field}" is invalid.`);
  }
  return value;
}

function requiredInteger(row: Record<string, unknown>, field: string): number {
  const value = row[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`Scenario Parameters database field "${field}" is invalid.`);
  }
  return value;
}

function jsonField(row: Record<string, unknown>, field: string): unknown {
  const value = row[field];
  return typeof value === "string" ? JSON.parse(value) as unknown : value;
}

export function mapRowToStoredScenarioParameters(row: unknown): StoredScenarioParameters {
  if (!isRecord(row)) throw new Error("Scenario Parameters database row must be an object.");
  const moduleId = requiredString(row, "module_id");
  if (!isScenarioParametersModuleId(moduleId)) {
    throw new Error(`Unsupported Scenario Parameters module: ${moduleId}.`);
  }

  const definition = parseScenarioParameters(moduleId, jsonField(row, "definition_json"));
  if (!definition) throw new Error(`Scenario Parameters JSON for ${moduleId} is invalid.`);

  const candidate: StoredScenarioParameters = {
    id: requiredString(row, "id"),
    moduleId,
    scenarioId: requiredString(row, "scenario_id"),
    name: requiredString(row, "name"),
    description: typeof row.description === "string" ? row.description : requiredString(row, "description"),
    difficulty: requiredString(row, "difficulty"),
    schemaVersion: requiredInteger(row, "schema_version"),
    definition,
    sourceFileName: typeof row.source_filename === "string" ? row.source_filename : "",
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  };

  if (candidate.scenarioId !== definition.id || candidate.schemaVersion !== definition.schemaVersion) {
    throw new Error("Scenario Parameters metadata does not match its JSON definition.");
  }
  return candidate;
}

export function storedScenarioParametersToRow(input: {
  moduleId: ScenarioParametersModuleId;
  definition: ScenarioParametersDefinition;
  sourceFileName?: string;
  createdBy: string;
}) {
  const parsed = parseScenarioParameters(input.moduleId, input.definition);
  if (!parsed) throw new Error("Cannot persist invalid Scenario Parameters JSON.");
  return {
    module_id: input.moduleId,
    scenario_id: parsed.id.trim(),
    name: parsed.name.trim(),
    description: parsed.description.trim(),
    difficulty: parsed.difficulty,
    schema_version: parsed.schemaVersion,
    definition_json: JSON.stringify(parsed),
    source_filename: (input.sourceFileName ?? "").trim().slice(0, 255),
    created_by: input.createdBy,
    updated_at: new Date().toISOString(),
  };
}
