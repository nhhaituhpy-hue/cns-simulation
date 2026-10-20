import type { ScenarioParametersDefinition, ScenarioParametersModuleId } from "@/lib/scenario-parameters";

export interface GenerationInput {
  moduleId: ScenarioParametersModuleId;
  name: string;
  description: string;
  difficulty: "basic" | "intermediate" | "advanced";
}
export interface EvidenceDocument {
  id: string;
  name: string;
  sha256: string;
  segments: Array<{ label: string; text: string }>;
}
export interface EvidenceCitation { documentId: string; segmentLabel: string; quote: string }
export interface ScenarioCapability { templateId: string; label: string; description: string }
export interface GenerationResult { definition: ScenarioParametersDefinition; provenance: Record<string, unknown> }
export class AiScenarioError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "AiScenarioError"; }
}
