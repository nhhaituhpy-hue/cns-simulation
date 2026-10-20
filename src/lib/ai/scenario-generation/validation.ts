import { randomUUID } from "node:crypto";
import { isScenarioParametersModuleId, parseScenarioParameters } from "@/lib/scenario-parameters";
import { selectDocumentExcerpts } from "./prompt";
import { createTemplateDefinition, previewNativeDefinition } from "./capabilities";
import { AiScenarioError, type GenerationInput, type EvidenceDocument, type EvidenceCitation, type GenerationResult } from "./types";

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function fail(code = "INVALID_SELECTION"): never { throw new AiScenarioError(code, "AI output is unsupported or not grounded in the supplied evidence."); }
export function validateGenerationInput(value: unknown): asserts value is GenerationInput {
  if (!record(value) || typeof value.moduleId !== "string" || !isScenarioParametersModuleId(value.moduleId)
    || typeof value.name !== "string" || !value.name.trim() || value.name.length > 200
    || typeof value.description !== "string" || !value.description.trim() || value.description.length > 2000
    || !["basic", "intermediate", "advanced"].includes(String(value.difficulty))) fail("INVALID_INPUT");
}
/** Enforce extractor bounds again at the generator trust boundary. Request is a reserved source ID. */
export function validateEvidenceDocuments(value: unknown): asserts value is EvidenceDocument[] {
  if (!Array.isArray(value) || value.length > 5) fail("INVALID_DOCUMENT");
  const ids = new Set<string>();
  for (const doc of value) {
    if (!record(doc) || typeof doc.id !== "string" || !doc.id || doc.id === "request" || ids.has(doc.id)
      || typeof doc.name !== "string" || doc.name.length > 255 || !/^[a-f0-9]{64}$/.test(String(doc.sha256))
      || !Array.isArray(doc.segments) || !doc.segments.length || doc.segments.length > 200) fail("INVALID_DOCUMENT");
    ids.add(doc.id); const labels = new Set<string>(); let length = 0;
    for (const segment of doc.segments) {
      if (!record(segment) || typeof segment.label !== "string" || !segment.label || segment.label.length > 100 || labels.has(segment.label)
        || typeof segment.text !== "string" || !segment.text.trim()) fail("INVALID_DOCUMENT");
      length += segment.text.length; labels.add(segment.label);
      if (length > 120_000) fail("INVALID_DOCUMENT");
    }
  }
}
export function validateSelection(input: GenerationInput, documents: EvidenceDocument[], value: unknown): GenerationResult {
  validateGenerationInput(input);
  validateEvidenceDocuments(documents);
  if (!record(value)) fail();
  if (value.status === "unsupported") fail("UNSUPPORTED_REQUEST");
  if (value.status !== "supported" || value.moduleId !== input.moduleId || typeof value.templateId !== "string"
    || Object.keys(value).some((key) => !["status", "moduleId", "templateId", "explanation", "citations"].includes(key))
    || typeof value.explanation !== "string" || value.explanation.trim().length < 10 || value.explanation.length > 3000
    || !Array.isArray(value.citations) || value.citations.length < 1 || value.citations.length > 12) fail();
  const quotedDocuments = selectDocumentExcerpts(input, documents);
  const citations: EvidenceCitation[] = value.citations.map((citation) => {
    if (!record(citation) || Object.keys(citation).some((key) => !["documentId", "segmentLabel", "quote"].includes(key))
      || typeof citation.documentId !== "string" || typeof citation.segmentLabel !== "string"
      || typeof citation.quote !== "string" || citation.quote.trim().length < 5 || citation.quote.length > 1500) fail("INVALID_CITATION");
    const text = citation.documentId === "request" && citation.segmentLabel === "request" ? input.description
      : quotedDocuments.find((doc) => doc.id === citation.documentId)?.segments.find((segment) => segment.label === citation.segmentLabel)?.text;
    if (!text?.includes(citation.quote)) fail("INVALID_CITATION");
    return { documentId: citation.documentId, segmentLabel: citation.segmentLabel, quote: citation.quote };
  });
  const native = createTemplateDefinition(input.moduleId, value.templateId);
  const definition = parseScenarioParameters(input.moduleId, { ...native, id: `ai-${randomUUID()}`, name: input.name, description: input.description, difficulty: input.difficulty });
  if (!definition) fail("INVALID_DEFINITION");
  previewNativeDefinition(input.moduleId, definition);
  return { definition, provenance: { version: 1, mode: "native-template-selection", moduleId: input.moduleId,
    templateId: value.templateId, explanation: value.explanation, citations,
    sourceKinds: { request: "user-request-not-manufacturer-evidence" },
    documents: documents.map(({ id, name, sha256 }) => ({ id, name, sha256 })) } };
}
