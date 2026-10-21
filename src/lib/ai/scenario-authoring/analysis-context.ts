import { analysisCatalog } from "./analysis-catalog";
import type { AuthoringField, AuthoringForm, JsonValue } from "./types";

interface ContextField { id: string; group: string; label: string; unit?: string; value: JsonValue }
interface ContextSection { id: string; title: string; fields: ContextField[] }
const MAX_CONTEXT_CHARACTERS = 12000;
/** Read-only context is deliberately separate from the current request's change catalog.
 * Accept FORM projections only: never walk definition, nativeBase, provenance or credentials.
 * Omit unsafe/oversized values rather than truncate structured values into fake configuration.
 */
export function guidanceContext(form: AuthoringForm, sectionId: string, question: string) {
  const candidates = form.fields.filter(f => f.sectionId !== sectionId && !f.schema.readOnly);
  const result = {
    readOnly: true,
    metadata: [] as ContextField[],
    sections: [] as ContextSection[],
    coverage: {fieldsAvailable: candidates.length, fieldsIncluded: 0, omittedUnsafeFields: 0, sectionsAvailable: new Set(candidates.map(f => f.sectionId)).size, sectionsIncluded: 0, truncated: false},
  };
  const metadata = candidates.filter(f => f.sectionId === "metadata");
  const safe: AuthoringField[] = [];
  for (const field of candidates) {
    try { if (analysisCatalog([field], false).length) safe.push(field); }
    catch { result.coverage.omittedUnsafeFields++; }
  }
  const scope = [question, ...metadata.filter(f => safe.includes(f)).map(f => String(f.value)), ...form.fields.filter(f => f.sectionId === sectionId).map(f => `${f.group} ${f.schema.label}`)].join(" ").toLowerCase();
  const score = (field: AuthoringField) => {
    if (field.sectionId === "metadata") return field.id === "description" ? 100000 : 90000;
    return (field.baselineEligible ? 10 : 0) + [...new Set(`${field.group} ${field.schema.label} ${field.id}`.toLowerCase().split(/[^a-z0-9]+/).filter(s => s.length > 2))].reduce((n, token) => n + (scope.includes(token) ? token.length : 0), 0);
  };
  for (const field of safe.sort((a, b) => score(b) - score(a))) {
    const projected: ContextField = {id: field.id, group: field.group, label: field.schema.label, ...(field.schema.unit ? {unit: field.schema.unit} : {}), value: structuredClone(field.value)};
    // Reserve room for coverage counters; JSON length measures the actual serialized payload.
    if (JSON.stringify(projected).length > 4000) continue;
    let section = result.sections.find(s => s.id === field.sectionId);
    const newSection = !section && field.sectionId !== "metadata";
    if (newSection) { section = {id: field.sectionId, title: form.sections.find(s => s.id === field.sectionId)?.title ?? field.sectionId, fields: []}; result.sections.push(section); }
    const target = field.sectionId === "metadata" ? result.metadata : section!.fields;
    target.push(projected);
    if (JSON.stringify(result).length > MAX_CONTEXT_CHARACTERS - 100) {
      target.pop();
      if (newSection) result.sections.pop();
    } else result.coverage.fieldsIncluded++;
  }
  result.coverage.sectionsIncluded = result.sections.length + (result.metadata.length ? 1 : 0);
  result.coverage.truncated = result.coverage.fieldsIncluded < result.coverage.fieldsAvailable;
  return result;
}
