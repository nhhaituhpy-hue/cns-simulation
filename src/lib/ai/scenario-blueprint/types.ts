import type { JsonValue } from "../scenario-authoring/types";
import type { ScenarioParametersDefinition, ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { ParameterVerification } from "../scenario-generation/parameter-types";

/** Pure snapshot contracts: no provider, engine, database or Node runtime imports. */
export interface ManualCitation {
  id: string;
  documentId: string;
  documentName: string;
  sha256: string;
  segmentLabel: string;
  quote: string;
  sourceKind: "uploaded" | "reference-only";
}
export type EvidenceMatcher =
  | { kind: "action"; controlId: string; input?: JsonValue }
  | { kind: "view"; viewId: string }
  | { kind: "parameter"; fieldId: string; value: string | number | boolean | null; tolerance?: number }
  | { kind: "terminal"; menuId: string; input: string }
  | { kind: "hardware"; occurrenceKey: string }
  | { kind: "technical-check"; checkId: string };
export interface ReferenceStep {
  id: string;
  label: string;
  required: boolean;
  prerequisites: string[];
  /** OR between groups, AND between matchers in one group. */
  alternatives: EvidenceMatcher[][];
  citationIds: string[];
}
export interface ParameterRelevance {
  fieldId: string;
  label: string;
  initialValue: string | number | boolean | null;
  targetValue?: string | number | boolean | null;
  tolerance?: number;
  reason: string;
  citationIds: string[];
}
export interface ScenarioRubric {
  version: 1;
  moduleId: ScenarioParametersModuleId;
  steps: ReferenceStep[];
  parameterRelevance: ParameterRelevance[];
  citations: ManualCitation[];
}
export interface ScenarioBlueprint {
  version: 1;
  moduleId: ScenarioParametersModuleId;
  title: string;
  situation: string;
  cause: string;
  symptoms: string[];
  assumptions: string[];
  definition: ScenarioParametersDefinition;
  rubric: ScenarioRubric;
  verification: ParameterVerification;
  citations: ManualCitation[];
}
export interface BlueprintGenerationInput {
  moduleId: ScenarioParametersModuleId;
  description: string;
  mode: "documents" | "description";
}
