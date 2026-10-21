import type { ScenarioParametersDefinition, ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { EvidenceDocument } from "@/lib/ai/scenario-generation/types";
import type { DocumentMetadata } from "@/lib/ai/documents/validation";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export interface ValueOption { value: string; label: string }
/** Recursive descriptions drive real controls, never a raw JSON text area. */
export interface ValueSchema {
  type: "text" | "number" | "boolean" | "select" | "object" | "array";
  label: string;
  help: string;
  required?: boolean;
  nullable?: boolean;
  readOnly?: boolean;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  options?: ValueOption[];
  properties?: Record<string, ValueSchema>;
  item?: ValueSchema;
  maxItems?: number;
  /** Typed native union arrays; each variant has exact known fields. */
  discriminator?: string;
  variants?: Array<{ value: string; label: string; schema: ValueSchema; initial: JsonValue }>;
  initial?: JsonValue;
}
export interface AuthoringField {
  id: string;
  sectionId: string;
  group: string;
  schema: ValueSchema;
  value: JsonValue;
  /** Only real baseline inputs, not fault/criteria/identity/policy. */
  baselineEligible: boolean;
}
export interface AuthoringSection { id: string; title: string; help: string }
export interface AuthoringForm {
  moduleId: ScenarioParametersModuleId;
  label: string;
  version: 1;
  sections: AuthoringSection[];
  fields: AuthoringField[];
  notices: string[];
}
export interface AuthoringIssue {
  code: string;
  message: string;
  sectionId: string;
  fieldId?: string;
  severity: "error" | "warning";
}
export interface AuthoringPreview {
  status: "valid" | "invalid";
  checks: Array<{ id: string; label: string; passed: boolean; detail: string }>;
  notes: string[];
  /** Preview never implies learner recovery replay. */
  recoveryVerified: false;
}
export interface FieldChange { fieldId: string; value: JsonValue }
export interface NativeAuthoringAdapter {
  moduleId: ScenarioParametersModuleId;
  createDefault(): ScenarioParametersDefinition;
  form(definition: ScenarioParametersDefinition): AuthoringForm;
  apply(definition: ScenarioParametersDefinition, changes: readonly FieldChange[]): ScenarioParametersDefinition;
  validate(definition: ScenarioParametersDefinition, phase: "draft" | "final"): AuthoringIssue[];
  preview(definition: ScenarioParametersDefinition): AuthoringPreview;
}
export interface FieldSource {
  kind: "native-default" | "document" | "ai-suggestion" | "user";
  documentId?: string;
  documentName?: string;
  segmentLabel?: string;
  quote?: string;
  note?: string;
}
export interface ProposedChange extends FieldChange { source: FieldSource; reason: string }
export interface AuthoringProposal {
  id: string;
  baseRevision: number;
  kind: "baseline" | "guidance";
  sectionId?: string;
  /** First untouched baseline values shown before explicit confirmation. */
  prefilledFieldIds?: string[];
  message: string;
  changes: ProposedChange[];
  issues: AuthoringIssue[];
  coverage: { documents: number; charactersRead: number; charactersAvailable: number; truncated: boolean };
}
export interface AuthoringState {
  version: 1;
  moduleId: ScenarioParametersModuleId;
  nativeBase: ScenarioParametersDefinition;
  baseline: ScenarioParametersDefinition;
  definition: ScenarioParametersDefinition;
  sources: Record<string, FieldSource>;
  baselineSources: Record<string, FieldSource>;
  confirmations: Record<string, string>;
  currentStep: string;
  proposal: AuthoringProposal | null;
  issues: AuthoringIssue[];
  /** Analysis scope, not a final scenario description. */
  context: string;
}
export type AuthoringMutation =
  | { action: "edit"; changes: FieldChange[] }
  | { action: "confirm"; sectionId: string }
  | { action: "navigate"; sectionId: string }
  | { action: "apply-proposal"; proposalId: string; fieldIds: string[] }
  | { action: "dismiss-proposal"; proposalId: string }
  | { action: "reset-field"; fieldId: string };
export interface AnalysisRequest { kind: "baseline" | "guidance"; sectionId?: string; question: string }
export interface AuthoringSession {
  id: string;
  actorId: string;
  moduleId: ScenarioParametersModuleId;
  revision: number;
  state: AuthoringState;
  documents: DocumentMetadata[];
  status: "editing" | "completed";
  scenarioRowId: string | null;
  scenarioId: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface AnalysisJob {
  id: string;
  sessionId: string;
  actorId: string;
  baseRevision: number;
  request: AnalysisRequest;
  state: AuthoringState;
  documents: DocumentMetadata[];
  status: "queued" | "running" | "completed" | "failed" | "stale";
  attemptToken: string | null;
  errorCode: string | null;
  createdAt: string;
}
/** Public DTO deliberately contains form values, not raw secret-bearing config. */
export interface AuthoringSessionDto {
  id: string;
  moduleId: ScenarioParametersModuleId;
  revision: number;
  status: "editing" | "completed";
  currentStep: string;
  form: AuthoringForm;
  sources: Record<string, FieldSource>;
  baselineValues: Record<string, JsonValue>;
  confirmedSections: string[];
  issues: AuthoringIssue[];
  proposal: AuthoringProposal | null;
  preview: AuthoringPreview;
  documents: Array<Omit<DocumentMetadata, "storageKey">>;
  analysis: { id: string; status: AnalysisJob["status"]; errorCode: string | null } | null;
  scenarioRowId: string | null;
  scenarioId: string | null;
  createdAt: string;
  updatedAt: string;
}
export type AnalyzeAuthoring = (state: AuthoringState, request: AnalysisRequest, documents: EvidenceDocument[], signal?: AbortSignal) => Promise<Omit<AuthoringProposal, "id" | "baseRevision">>;
