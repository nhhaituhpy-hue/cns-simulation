import { randomUUID } from "node:crypto";
import { parseScenarioParameters, type ScenarioParametersDefinition } from "@/lib/scenario-parameters";
import { selectDocumentExcerpts } from "./prompt";
import { parameterAdapterFor } from "./parameters";
import { AiScenarioError, type EvidenceCitation, type EvidenceDocument, type GenerationInput, type GenerationResult } from "./types";
import type { ParameterAssignment, ParameterValue, ScenarioParameterField } from "./parameter-types";
import type { Dvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { getDvorConfigValue } from "@/lib/dvor1150a/config-utils";
import { sharedNominalAssignments } from "./parameter-selex";

export interface EvidencedParameter extends ParameterAssignment { unit?: string; citation: number }
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function reject(code = "INVALID_PARAMETERS"): never { throw new AiScenarioError(code, "Requested scenario parameters are unsupported, ungrounded or inconsistent."); }
function exactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) reject();
}
function escaped(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
/** Resolve citation boundaries in the source, then read the original clause phase. */
function supportsAssertion(source: string, quote: string, field: ScenarioParameterField, value: ParameterValue, recovering: boolean, fields: readonly ScenarioParameterField[]): boolean {
  const labelUnique=fields.filter(f=>f.label.toLocaleLowerCase()===field.label.toLocaleLowerCase()).length===1;
  const aliases=[field.id,...(labelUnique?[field.label]:[])];
  const quoteRanges:Array<{start:number;end:number}>=[];
  for(let start=source.indexOf(quote);start!==-1;start=source.indexOf(quote,start+1)) {
    if(quoteRanges.length>=200) return false;
    quoteRanges.push({start,end:start+quote.length});
  }
  const delimiter=/\r?\n|;|,(?=\s*(?:restore|recover|khôi phục|set)\b)|\.(?=\s+\p{L})/giu;
  const clauses:Array<{text:string;start:number}>=[];
  let begin=0;
  for(const separator of source.matchAll(delimiter)) {
    clauses.push({text:source.slice(begin,separator.index),start:begin});
    begin=separator.index!+separator[0].length;
  }
  clauses.push({text:source.slice(begin),start:begin});
  const phases=new Set<boolean>();
  for (const {text:clause,start:clauseStart} of clauses) {
    for (const alias of aliases) {
      const pattern=new RegExp(`(?<![\\p{L}\\p{N}_.])${escaped(alias)}(?![\\p{L}\\p{N}_.])`,"giu");
      for (const match of clause.matchAll(pattern)) {
        const prefix=clause.slice(0,match.index);
        const markers=[...prefix.matchAll(/\b(?:SET|RECOVER|restore|initial|startup)\b|khôi phục|ban đầu/giu)];
        const marker=markers.at(-1)?.[0].toLocaleLowerCase();
        const isRecovery=marker==="recover"||marker==="restore"||marker==="khôi phục";
        const originalTail=clause.slice(match.index!+alias.length);
        let tail=originalTail.replace(/^\s*(?:=|:|is\b|at\b|là\b)?\s*/iu,"");
        let token:string;
        if(typeof value==="string") {
          const serialized=JSON.stringify(value);
          token=tail.startsWith(serialized)?serialized:value;
        }else token=JSON.stringify(value);
        if(!tail.startsWith(token))continue;
        tail=tail.slice(token.length);
        if(/^[\p{L}\p{N}_+-]|^\.\d/u.test(tail))continue;
        if(field.unit) {
          const unit=new RegExp(`^\\s+${escaped(field.unit)}(?![\\p{L}\\p{N}_])`,"u");
          if(!unit.test(tail))continue;
          tail=tail.replace(unit,"");
        }
        if(!/^\s*(?:$|[.,;)]|(?:then|and|rồi|sau đó)\b)/iu.test(tail))continue;
        const assertionStart=clauseStart+match.index!;
        const assertionEnd=assertionStart+alias.length+originalTail.length-tail.length;
        if(quoteRanges.some(range=>range.start<=assertionStart&&range.end>=assertionEnd))phases.add(isRecovery);
      }
    }
  }
  // Repeated identical cropped text with different source phases is ambiguous.
  return phases.size===1&&phases.has(recovering);
}
function validateValue(field: ScenarioParameterField, value: unknown, unit: unknown) {
  if (unit !== undefined && unit !== field.unit) reject("INVALID_PARAMETER_UNIT");
  if (field.unit && unit !== field.unit) reject("INVALID_PARAMETER_UNIT");
  if (field.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max)) reject();
    if (field.step !== undefined && field.step > 0) {
      const increments=(value-(field.min??0))/field.step;
      if (Math.abs(increments-Math.round(increments))>1e-7) reject();
    }
  } else if (field.type === "boolean") {
    if (typeof value !== "boolean") reject();
  } else if (typeof value !== "string" || !value.trim() || value.length > 200 || (field.type === "enum" && !field.options?.includes(value))) reject();
}

/** Explicit template rows form a machine-checkable coverage contract. */
export function explicitParameterRows(input: GenerationInput, documents: EvidenceDocument[]) {
  const rows: Array<{ phase: "initial" | "recovery"; fieldId: string; rawValue: string }> = [];
  for (const text of [input.description, ...documents.flatMap(doc => doc.segments.map(segment => segment.text))]) {
    for (const line of text.split(/\r?\n/)) {
      if(!/^\s*(SET|RECOVER)(?=\s|=|$)/i.test(line))continue;
      const match = /^\s*(SET|RECOVER)\s+([^\s=]{1,200})\s*=\s*(.{1,300})\s*$/i.exec(line);
      if(!match || match[2].length>200 || match[3].trim().length>300)reject("UNHANDLED_PARAMETER");
      rows.push({ phase: match[1].toUpperCase() === "SET" ? "initial" : "recovery", fieldId: match[2], rawValue: match[3].trim() });
    }
  }
  if (rows.length > 48) reject("REQUEST_TOO_COMPLEX");
  return rows;
}

export function validateParameterProposal(input: GenerationInput, documents: EvidenceDocument[], base: ScenarioParametersDefinition, templateId: string, value: unknown): GenerationResult {
  if (!record(value)) reject();
  if (value.status === "unsupported") reject("UNSUPPORTED_PARAMETERS");
  exactKeys(value, ["version", "status", "moduleId", "templateId", "explanation", "initial", "recovery", "citations", "unhandledRequirements"]);
  if (value.version !== 2 || value.status !== "supported" || value.moduleId !== input.moduleId || value.templateId !== templateId
    || typeof value.explanation !== "string" || value.explanation.trim().length < 10 || value.explanation.length > 3000
    || !Array.isArray(value.initial) || !value.initial.length || value.initial.length > 24
    || !Array.isArray(value.recovery) || value.recovery.length > 24
    || !Array.isArray(value.citations) || !value.citations.length || value.citations.length > 16
    || !Array.isArray(value.unhandledRequirements) || value.unhandledRequirements.length !== 0) reject();
  const quotedDocuments = selectDocumentExcerpts(input, documents);
  const citationSources:string[]=[];
  const citations: EvidenceCitation[] = value.citations.map(candidate => {
    if (!record(candidate)) reject("INVALID_CITATION");
    exactKeys(candidate, ["documentId", "segmentLabel", "quote"]);
    if (typeof candidate.documentId !== "string" || typeof candidate.segmentLabel !== "string" || typeof candidate.quote !== "string" || candidate.quote.trim().length < 5 || candidate.quote.length > 1500) reject("INVALID_CITATION");
    const text = candidate.documentId === "request" && candidate.segmentLabel === "request" ? input.description
      : quotedDocuments.find(doc => doc.id === candidate.documentId)?.segments.find(segment => segment.label === candidate.segmentLabel)?.text;
    if (!text?.includes(candidate.quote)) reject("INVALID_CITATION");
    citationSources.push(text);
    return { documentId: candidate.documentId, segmentLabel: candidate.segmentLabel, quote: candidate.quote };
  });
  const adapter = parameterAdapterFor(input.moduleId);
  const fields = adapter.fields(input.moduleId, base);
  const parseAssignments = (items: unknown[], recovering: boolean): EvidencedParameter[] => {
    const seen = new Set<string>();
    return items.map(item => {
      if (!record(item)) reject();
      exactKeys(item, ["fieldId", "value", "unit", "citation"]);
      if (typeof item.fieldId !== "string" || seen.has(item.fieldId) || !Number.isInteger(item.citation) || Number(item.citation) < 0 || Number(item.citation) >= citations.length) reject();
      const field = fields.find(field => field.id === item.fieldId);
      if (!field || (recovering && !field.recovery)) reject();
      validateValue(field, item.value, item.unit);
      const quote = citations[Number(item.citation)].quote;
      if(!supportsAssertion(citationSources[Number(item.citation)],quote,field,item.value as ParameterValue,recovering,fields))reject("UNGROUNDED_PARAMETER");
      seen.add(item.fieldId);
      return { fieldId: item.fieldId, value: item.value as ParameterValue, ...(field.unit ? { unit: field.unit } : {}), citation: Number(item.citation) };
    });
  };
  const initial = parseAssignments(value.initial, false);
  const recovery = parseAssignments(value.recovery, true);
  for (const row of explicitParameterRows(input, documents)) {
    const assignment = (row.phase === "initial" ? initial : recovery).find(item => item.fieldId === row.fieldId);
    if (!assignment) reject("UNHANDLED_PARAMETER");
    const expected = typeof assignment.value === "string" ? assignment.value : JSON.stringify(assignment.value);
    const unit = assignment.unit ? ` ${assignment.unit}` : "";
    if (![expected + unit, JSON.stringify(assignment.value) + unit].includes(row.rawValue)) reject("UNHANDLED_PARAMETER");
  }
  const configured = adapter.apply(input.moduleId, base, initial.map(({fieldId,value})=>({fieldId,value})));
  if(input.moduleId==="dvor-1150a"&&templateId==="configuration-values") {
    const d=configured as Dvor1150aScenarioDefinition;
    d.successCriteria.configurationValues=sharedNominalAssignments(recovery).filter(c=>c.fieldId.startsWith("configuration.")).map(c=>({fieldId:c.fieldId.slice(14),value:c.value as string|number|boolean}));
    if(!d.successCriteria.configurationValues.length)reject("INVALID_RECOVERY");
    d.taskTargets=d.successCriteria.configurationValues.filter(target=>!Object.is(getDvorConfigValue(d.configuration,target.fieldId),target.value)).map(target=>({fieldId:target.fieldId,requirement:"change-applied"}));
  }
  const definition = parseScenarioParameters(input.moduleId, { ...configured, id: `ai-${randomUUID()}`, name: input.name, description: input.description, difficulty: input.difficulty });
  if (!definition) reject("INVALID_DEFINITION");
  const verification = adapter.verify(input.moduleId, definition, recovery.map(({fieldId,value})=>({fieldId,value})));
  if (!verification.recoveryVerified || !verification.initial.length || !verification.recovered.length || (verification.mode !== "native-diagnosis" && verification.recovered.some(check => !check.passed))) reject("INVALID_RECOVERY");
  return { definition, provenance: { version: 2, mode: "native-parameter-generation", moduleId: input.moduleId, templateId,
    explanation: value.explanation, citations, sourceKinds: { request: "user-request-not-manufacturer-evidence" },
    documents: documents.map(({ id, name, sha256 }) => ({ id, name, sha256 })),
    parameters: { version: 2, initial, recovery, verification, configuredFieldCount: fields.length } } };
}
