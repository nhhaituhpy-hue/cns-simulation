import { loadAiProviderConfig } from "../provider/config";
import { requestScenarioJson } from "../provider/client";
import { buildScenarioPrompt } from "./prompt";
import { validateGenerationInput, validateEvidenceDocuments, validateSelection } from "./validation";
import { buildParameterPrompt } from "./parameter-prompt";
import { validateParameterProposal } from "./parameter-proposal";
import type { GenerationInput, EvidenceDocument, GenerationResult } from "./types";
export async function generateScenario(input: GenerationInput, documents: EvidenceDocument[], signal?: AbortSignal): Promise<GenerationResult> {
  validateGenerationInput(input);
  validateEvidenceDocuments(documents);
  const config = loadAiProviderConfig();
  const output = await requestScenarioJson(config, buildScenarioPrompt(input, documents), signal);
  const scaffold = validateSelection(input, documents, output);
  const templateId = scaffold.provenance.templateId as string;
  const proposal = await requestScenarioJson(config, buildParameterPrompt(input, documents, scaffold.definition, templateId), signal);
  const result = validateParameterProposal(input, documents, scaffold.definition, templateId, proposal);
  return { ...result, provenance: { ...result.provenance, model: config.model, provider: "cliproxy-vn", promptVersion: "scenario-parameters-v2", schemaVersion: "native-parameters-v2" } };
}
