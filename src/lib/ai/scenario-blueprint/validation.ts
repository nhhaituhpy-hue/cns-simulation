import { isScenarioParametersModuleId, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { AiScenarioError, type EvidenceDocument } from "../scenario-generation/types";
import type { EvidenceMatcher, ManualCitation, ScenarioRubric, BlueprintGenerationInput } from "./types";

export function sensitiveText(value: string): boolean {
  const normalized = value.normalize("NFD").replace(/\p{M}/gu, "").replace(/[đĐ]/g, "d");
  // Match the private-knowledge quarantine language, including bare labels
  // whose values can occur on later lines. Never redact/rejoin source evidence.
  return /-----[\t ]*(?:BEGIN|END)[\t ]+(?:[A-Z0-9]+[\t ]+)*PRIVATE[\t ]+KEY\b/i.test(value)
    || /^[\t ]*[A-Za-z0-9+/_-]{64,}={0,2}[\t ]*\r?$/m.test(value)
    || /(?:^[\t ]*[A-Za-z0-9+/_-]{32,}={0,2}[\t ]*\r?\n){2}^[\t ]*[A-Za-z0-9+/_-]{32,}={0,2}[\t ]*\r?$/m.test(value)
    || /\b(?:pass(?:word|wd|phrase)|mat\s+khau|user[_\s-]?name|ten\s+dang\s+nhap|tai\s+khoan|dang\s+nhap|log[\s-]?(?:in|on)|sign[\s-]?in|credentials?|api[_\s-]?(?:key|token)|access[_\s-]?token|client[_\s-]?secret)\b/i.test(normalized)
    || /\buser\s*[:=]|\bBearer\s+[A-Za-z0-9._-]{8,}/i.test(normalized);
}
/** Explicit model names only, not keyword similarity or a technical equivalence claim. */
function explicitDevices(value: string): Set<ScenarioParametersModuleId> {
  const result = new Set<ScenarioParametersModuleId>();
  const normalized = value.toLowerCase().replace(/[_-]+/g, " ");
  for (const match of normalized.matchAll(/(?:^|[^a-z0-9])(dvor|dme|selex|model)\s*(?:model\s*)?(1150a|1150|1119a|220|320)(?![a-z0-9])/g)) {
    const family = match[1], model = match[2];
    if (["1150a", "1150", "220"].includes(model) && family !== "dme") result.add(`dvor-${model}` as ScenarioParametersModuleId);
    if (["1119a", "320"].includes(model) && family !== "dvor") result.add(`dme-${model}` as ScenarioParametersModuleId);
  }
  if (/(?:^|[^a-z0-9])ads\s*b(?![a-z0-9])/.test(normalized)) result.add("ads-b");
  return result;
}
/** Shared prompt/compiler boundary: drop unsafe/other-device segments whole. */
export function safeBlueprintDocuments(documents: EvidenceDocument[], moduleId: ScenarioParametersModuleId): EvidenceDocument[] {
  return documents.filter(doc => ![doc.id, doc.name].some(sensitiveText)
    && (!doc.id.startsWith("kb:") || doc.id.startsWith(`kb:${moduleId}:`)))
    .map(doc => {
      const documentScope = explicitDevices(doc.name);
      if (documentScope.size > 0 && !documentScope.has(moduleId)) return { ...doc, segments: [] };
      return { ...doc, segments: doc.segments.filter(segment => {
        const local = `${segment.label}\n${segment.text}`;
        if (sensitiveText(local)) return false;
        const segmentScope = explicitDevices(local);
        // A multi-device title is not evidence for a generic or another model's
        // section. Require unambiguous target evidence in that local segment.
        const scope = segmentScope.size ? segmentScope : documentScope;
        return scope.size === 0 || (scope.size === 1 && scope.has(moduleId));
      }) };
    })
    .filter(doc => doc.segments.length > 0);
}
/** Task prose may describe role authentication, but is never source evidence.
 * Keep documentary quarantine stricter: even a bare logon label can introduce
 * a secret on another line. Public prose still rejects credential assignments.
 */
function sensitivePublicText(value: string): boolean {
  const normalized = value.normalize("NFD").replace(/\p{M}/gu, "").replace(/[đĐ]/g, "d");
  const prose = normalized.replace(/\b(?:dang[\t ]+nhap|log[\t -]?(?:in|on)|sign[\t -]?in)\b(?=[\t ]+(?:(?:bang|voi|as|with|using)[\t ]+)?(?:vai[\t ]+tro|(?:the[\t ]+)?(?:appropriate[\t ]+)?role)\b)/gi, "");
  return sensitiveText(prose);
}
export function publicText(value: unknown, max = 2000): value is string { return text(value, max) && !sensitivePublicText(value); }
export function validateBlueprintInput(value: unknown): asserts value is BlueprintGenerationInput {
  safeJson(value); exact(value, ["moduleId", "description", "mode"]);
  if (typeof value.moduleId !== "string" || !isScenarioParametersModuleId(value.moduleId)
    || !["documents", "description"].includes(String(value.mode)) || typeof value.description !== "string" || value.description.length > 2000 || sensitivePublicText(value.description)) fail();
  if (value.mode === "description" && !value.description.trim()) fail("CLARIFICATION_REQUIRED", "Hãy mô tả sự cố hoặc mục tiêu cần huấn luyện.");
}


export function fail(code = "UNSUPPORTED_REQUEST", message = "Blueprint data is invalid or outside the supported contract."): never {
  throw new AiScenarioError(code, message);
}
export function plain(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
/** Bound recursion before walking untrusted model/snapshot data. */
export function safeJson(value: unknown, depth = 0, budget = { left: 30000 }): void {
  if (depth > 24 || --budget.left < 0) fail();
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") { if (value.length > 120000) fail(); return; }
  if (typeof value === "number") { if (!Number.isFinite(value)) fail(); return; }
  if (!Array.isArray(value) && !plain(value)) fail();
  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) fail();
    safeJson(child, depth + 1, budget);
  }
}
export function exact(value: unknown, required: string[], optional: string[] = []): asserts value is Record<string, unknown> {
  if (!plain(value) || required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) fail();
}
export function text(value: unknown, max = 2000): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
}
function identifier(value: unknown): value is string { return text(value, 240) && !["__proto__", "constructor", "prototype"].includes(value); }
function scalar(value: unknown): boolean { return value === null || typeof value === "boolean" || typeof value === "string" || (typeof value === "number" && Number.isFinite(value)); }
function tolerance(value: unknown, target: unknown): boolean { return value === undefined || (typeof target === "number" && typeof value === "number" && Number.isFinite(value) && value >= 0); }
function unique(values: string[]): boolean { return new Set(values).size === values.length; }
function ids(value: unknown, allowed: Set<string>, nonempty = false): value is string[] {
  return Array.isArray(value) && value.length <= 64 && (!nonempty || value.length > 0) && value.every(v => typeof v === "string" && allowed.has(v)) && unique(value);
}
export function validateManualCitations(value: unknown): ManualCitation[] {
  if (!Array.isArray(value) || !value.length || value.length > 32) fail("INVALID_CITATION");
  const seen = new Set<string>();
  for (const citation of value) {
    exact(citation, ["id", "documentId", "documentName", "sha256", "segmentLabel", "quote", "sourceKind"]);
    if (!identifier(citation.id) || seen.has(citation.id) || !identifier(citation.documentId) || citation.documentId === "request"
      || !publicText(citation.documentName, 255) || sensitiveText(citation.documentName) || sensitiveText(citation.id) || sensitiveText(citation.documentId) || typeof citation.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(citation.sha256)
      || !publicText(citation.segmentLabel, 100) || sensitiveText(citation.segmentLabel) || !publicText(citation.quote, 1500) || sensitiveText(citation.quote) || citation.quote.trim().length < 5
      || !["uploaded", "reference-only"].includes(String(citation.sourceKind))) fail("INVALID_CITATION");
    seen.add(citation.id);
  }
  return value as ManualCitation[];
}
function matcher(value: unknown): asserts value is EvidenceMatcher {
  if (!plain(value)) fail();
  switch (value.kind) {
    case "action": exact(value, ["kind", "controlId"], ["input"]); if (!identifier(value.controlId)) fail(); break;
    case "view": exact(value, ["kind", "viewId"]); if (!identifier(value.viewId)) fail(); break;
    case "parameter":
      exact(value, ["kind", "fieldId", "value"], ["tolerance"]);
      if (!identifier(value.fieldId) || !scalar(value.value) || !tolerance(value.tolerance, value.value)) fail(); break;
    case "terminal": exact(value, ["kind", "menuId", "input"]); if (!identifier(value.menuId) || typeof value.input !== "string" || value.input.length > 2000) fail(); break;
    case "hardware": exact(value, ["kind", "occurrenceKey"]); if (!identifier(value.occurrenceKey)) fail(); break;
    case "technical-check": exact(value, ["kind", "checkId"]); if (!identifier(value.checkId)) fail(); break;
    default: fail();
  }
}
/** Structural snapshot validation, NOT evidence authenticity or a native replay. */
export function validateScenarioRubric(value: unknown, moduleId: ScenarioParametersModuleId): ScenarioRubric {
  safeJson(value);
  exact(value, ["version", "moduleId", "steps", "parameterRelevance", "citations"]);
  if (value.version !== 1 || value.moduleId !== moduleId || !Array.isArray(value.steps) || !value.steps.length || value.steps.length > 64
    || !Array.isArray(value.parameterRelevance) || value.parameterRelevance.length > 48) fail();
  const citations = new Set(validateManualCitations(value.citations).map(c => c.id));
  const stepIds = new Set<string>();
  for (const step of value.steps) {
    exact(step, ["id", "label", "required", "prerequisites", "alternatives", "citationIds"]);
    if (!identifier(step.id) || stepIds.has(step.id) || !text(step.label) || typeof step.required !== "boolean"
      || !ids(step.citationIds, citations, true) || !Array.isArray(step.alternatives) || !step.alternatives.length || step.alternatives.length > 8) fail();
    stepIds.add(step.id);
    for (const group of step.alternatives) {
      if (!Array.isArray(group) || !group.length || group.length > 24) fail();
      group.forEach(matcher);
      // A technical state is never evidence that a learner performed a procedure.
      if (group.every(m => m.kind === "technical-check")) fail();
    }
  }
  const steps = value.steps as ScenarioRubric["steps"];
  for (const step of steps) if (!ids(step.prerequisites, stepIds) || step.prerequisites.includes(step.id)) fail();
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) fail();
    if (visited.has(id)) return;
    visiting.add(id); steps.find(s => s.id === id)!.prerequisites.forEach(visit); visiting.delete(id); visited.add(id);
  };
  steps.forEach(s => visit(s.id));
  const fields = new Set<string>();
  for (const field of value.parameterRelevance) {
    exact(field, ["fieldId", "label", "initialValue", "reason", "citationIds"], ["targetValue", "tolerance"]);
    if (!identifier(field.fieldId) || fields.has(field.fieldId) || !text(field.label) || !text(field.reason) || !scalar(field.initialValue)
      || (Object.hasOwn(field, "targetValue") && !scalar(field.targetValue)) || !tolerance(field.tolerance, field.targetValue)
      || !ids(field.citationIds, citations, true)) fail();
    fields.add(field.fieldId);
  }
  return structuredClone(value) as unknown as ScenarioRubric;
}
