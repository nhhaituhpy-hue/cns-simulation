import {
  parseDvor1150ScenarioDefinition,
  type Dvor1150ScenarioDefinition,
} from "@/lib/dvor1150";
import {
  parseDvor1150aScenarioDefinition,
  type Dvor1150aScenarioDefinition,
} from "@/lib/dvor1150a";
import {
  parseDme1119aScenarioDefinition,
  type Dme1119aScenarioDefinition,
} from "@/lib/dme1119a";
import {
  parseDvor220ScenarioDefinition,
} from "@/modules/operations/dvor-220/domain/scenario";
import type { Dvor220ScenarioDefinition } from "@/modules/operations/dvor-220/domain/types";
import { parseDme320ScenarioDefinition } from "@/modules/operations/dme-320/domain/scenario";
import type { Dme320ScenarioDefinition } from "@/modules/operations/dme-320/domain/types";

/** Simulator modules whose PMDT exposes the versioned Scenario Parameters file. */
export const SCENARIO_PARAMETERS_MODULES = [
  {
    moduleId: "dvor-1150",
    label: "DVOR 1150",
    category: "PMDT",
    schemaVersion: 2,
  },
  {
    moduleId: "dvor-1150a",
    label: "DVOR 1150A",
    category: "PMDT",
    schemaVersion: 1,
  },
  {
    moduleId: "dme-1119a",
    label: "DME 1119A",
    category: "PMDT",
    schemaVersion: 1,
  },
  {
    moduleId: "dvor-220",
    label: "DVOR 220",
    category: "MOPIENS / PMDT",
    schemaVersion: 1,
  },
  {
    moduleId: "dme-320",
    label: "DME 320",
    category: "MOPIENS / PMDT",
    schemaVersion: 1,
  },
] as const;

export type ScenarioParametersModuleId =
  (typeof SCENARIO_PARAMETERS_MODULES)[number]["moduleId"];

export type ScenarioParametersDefinition =
  | Dvor1150ScenarioDefinition
  | Dvor1150aScenarioDefinition
  | Dme1119aScenarioDefinition
  | Dvor220ScenarioDefinition
  | Dme320ScenarioDefinition;

export type ScenarioParametersDefinitionFor<
  TModuleId extends ScenarioParametersModuleId,
> = TModuleId extends "dvor-1150"
  ? Dvor1150ScenarioDefinition
  : TModuleId extends "dvor-1150a"
    ? Dvor1150aScenarioDefinition
    : TModuleId extends "dme-1119a"
      ? Dme1119aScenarioDefinition
      : TModuleId extends "dvor-220"
        ? Dvor220ScenarioDefinition
        : Dme320ScenarioDefinition;

type ScenarioParametersParser<TDefinition extends ScenarioParametersDefinition> =
  (value: unknown) => TDefinition | null;

interface ScenarioParametersAdapter<
  TModuleId extends ScenarioParametersModuleId,
  TDefinition extends ScenarioParametersDefinition,
> {
  moduleId: TModuleId;
  parse: ScenarioParametersParser<TDefinition>;
}

const adapters: {
  [TModuleId in ScenarioParametersModuleId]: ScenarioParametersAdapter<
    TModuleId,
    ScenarioParametersDefinitionFor<TModuleId>
  >;
} = {
  "dvor-1150": {
    moduleId: "dvor-1150",
    parse: parseDvor1150ScenarioDefinition,
  },
  "dvor-1150a": {
    moduleId: "dvor-1150a",
    parse: parseDvor1150aScenarioDefinition,
  },
  "dme-1119a": {
    moduleId: "dme-1119a",
    parse: parseDme1119aScenarioDefinition,
  },
  "dvor-220": {
    moduleId: "dvor-220",
    parse: parseDvor220ScenarioDefinition,
  },
  "dme-320": {
    moduleId: "dme-320",
    parse: parseDme320ScenarioDefinition,
  },
};

export function isScenarioParametersModuleId(
  value: string,
): value is ScenarioParametersModuleId {
  return SCENARIO_PARAMETERS_MODULES.some((module) => module.moduleId === value);
}

export function getScenarioParametersModule(
  moduleId: string,
) {
  return SCENARIO_PARAMETERS_MODULES.find((module) => module.moduleId === moduleId);
}

export function parseScenarioParameters<
  TModuleId extends ScenarioParametersModuleId,
>(
  moduleId: TModuleId,
  value: unknown,
): ScenarioParametersDefinitionFor<TModuleId> | null {
  return adapters[moduleId].parse(value) as ScenarioParametersDefinitionFor<TModuleId> | null;
}

export function scenarioParametersMetadata(
  definition: ScenarioParametersDefinition,
) {
  return {
    scenarioId: definition.id.trim(),
    name: definition.name.trim(),
    description: definition.description.trim(),
    difficulty: definition.difficulty,
    schemaVersion: definition.schemaVersion,
  };
}
