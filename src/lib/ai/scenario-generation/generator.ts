import { loadAiProviderConfig } from "../provider/config";
import { requestScenarioJson } from "../provider/client";
import { buildScenarioPrompt } from "./prompt";
import { validateGenerationInput, validateEvidenceDocuments, validateSelection } from "./validation";
import type { GenerationInput, EvidenceDocument, GenerationResult } from "./types";
export async function generateScenario(input: GenerationInput, documents: EvidenceDocument[], signal?: AbortSignal): Promise<GenerationResult> {
  validateGenerationInput(input);
  validateEvidenceDocuments(documents);
  const config = loadAiProviderConfig();
  const output = await requestScenarioJson(config, buildScenarioPrompt(input, documents), signal);
  const result = validateSelection(input, documents, output);
  return { ...result, provenance: { ...result.provenance, model: config.model, provider: "cliproxy-vn" } };
}
