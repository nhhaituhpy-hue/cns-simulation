import { isHardwareDiagnosisAnswer, type HardwareDiagnosisAnswer } from "@/lib/equipment-diagram-types";
import type { RecordedAction, RecordedActionKind } from "@/lib/types";
import type {
  ScenarioActionEvent,
  ScenarioEvidenceSnapshot,
  ScenarioEvidenceValue,
  ScenarioParameterChange,
  ScenarioResolution,
  ScenarioResolutionCheck,
} from "@/lib/scenario-evidence";

type Row = Record<string, unknown>;

export interface PmdtResultEvent {
  id: string;
  sequence: number;
  eventType: "view" | "sidebar";
  viewId: string;
  fieldId?: string;
  title: string;
  menuPath: string[];
  annotation: string;
  resultValue?: string | number | boolean | null;
  resultStatus?: string;
}

export interface PmdtResultPresentation {
  startedAt: string | null;
  submittedAt: string | null;
  events: PmdtResultEvent[];
  actionHistory: ScenarioActionEvent[];
  resolution?: ScenarioResolution;
  answer: {
    suspectedFault: string;
    reasoning: string;
    remediation: string;
  };
  hardwareAnswer?: HardwareDiagnosisAnswer;
}

export interface AdsbResultPresentation {
  startedAt: string | null;
  submittedAt: string | null;
  selectedActions: RecordedAction[];
  allActions: RecordedAction[];
  authenticatedCorrectly: boolean;
  qcmsMonitoringOpened: boolean;
  diagnosedComponentIds: string[];
  inspectedComponentIds: string[];
}

function row(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isEvidenceValue(value: unknown): value is ScenarioEvidenceValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every(isEvidenceValue);
  return Boolean(value && typeof value === "object" && Object.values(value).every(isEvidenceValue));
}

function evidenceSnapshot(value: unknown): ScenarioEvidenceSnapshot | undefined {
  return value && typeof value === "object" && !Array.isArray(value) && Object.values(value).every(isEvidenceValue)
    ? value as ScenarioEvidenceSnapshot
    : undefined;
}

function parseScenarioAction(value: unknown, index: number): ScenarioActionEvent | null {
  const action = row(value);
  const actor = action.actor;
  const kind = action.kind;
  const label = text(action.label);
  if (!(["student", "system", "instructor"] as const).includes(actor as ScenarioActionEvent["actor"]) || !(["view", "control", "configuration", "authentication", "system"] as const).includes(kind as ScenarioActionEvent["kind"]) || !label || typeof action.accepted !== "boolean") return null;
  const input = action.input === undefined || isEvidenceValue(action.input) ? action.input : undefined;
  const before = evidenceSnapshot(action.before);
  const after = evidenceSnapshot(action.after);
  // Retain valid Apply/draft/restore changes for the examiner's saved evidence.
  const parameterChanges = Array.isArray(action.parameterChanges) ? action.parameterChanges.flatMap((value): ScenarioParameterChange[] => {
    const change = row(value);
    if (typeof change.fieldId !== "string" || typeof change.label !== "string"
      || !isEvidenceValue(change.before) || !isEvidenceValue(change.after) || typeof change.accepted !== "boolean"
      || typeof change.phase !== "string" || !["draft", "apply", "command", "restore", "backup"].includes(change.phase)) return [];
    return [{ fieldId: change.fieldId, label: change.label, before: change.before, after: change.after,
      phase: change.phase as ScenarioParameterChange["phase"], accepted: change.accepted }];
  }) : [];
  return {
    id: text(action.id) || `action-${index + 1}`,
    sequence: typeof action.sequence === "number" && Number.isFinite(action.sequence) ? action.sequence : index + 1,
    occurredAt: text(action.occurredAt),
    actor: actor as ScenarioActionEvent["actor"],
    kind: kind as ScenarioActionEvent["kind"],
    ...(typeof action.controlId === "string" ? { controlId: action.controlId } : {}),
    menuPath: stringList(action.menuPath),
    label,
    ...(input !== undefined ? { input } : {}),
    accepted: action.accepted,
    ...(typeof action.reason === "string" ? { reason: action.reason } : {}),
    ...(before ? { before } : {}),
    ...(after ? { after } : {}),
    ...(parameterChanges.length ? { parameterChanges } : {}),
  };
}

function parseScenarioResolution(value: unknown): ScenarioResolution | undefined {
  const resolution = row(value);
  if (typeof resolution.active !== "boolean" || typeof resolution.solved !== "boolean") return undefined;
  const checks = Array.isArray(resolution.finalChecks)
    ? resolution.finalChecks.flatMap((check): ScenarioResolutionCheck[] => {
      const item = row(check);
      return typeof item.id === "string" && typeof item.label === "string" && typeof item.passed === "boolean" && typeof item.detail === "string"
        ? [{ id: item.id, label: item.label, passed: item.passed, detail: item.detail }]
        : [];
    })
    : [];
  const blockers = stringList(resolution.blockers);
  return {
    active: resolution.active,
    solved: resolution.solved,
    startedAt: nullableText(resolution.startedAt),
    ...(typeof resolution.solvedAt === "string" ? { solvedAt: resolution.solvedAt } : {}),
    ...(typeof resolution.elapsedMs === "number" && Number.isFinite(resolution.elapsedMs) ? { elapsedMs: resolution.elapsedMs } : {}),
    finalChecks: checks,
    blockers,
  };
}

function resultValue(value: unknown): PmdtResultEvent["resultValue"] {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? value
    : undefined;
}

function parsePmdtEvent(value: unknown, index: number): PmdtResultEvent | null {
  const event = row(value);
  const title = text(event.title);
  if (!title) return null;
  const sequence = typeof event.sequence === "number" && Number.isFinite(event.sequence)
    ? event.sequence
    : index + 1;
  return {
    id: text(event.id) || `event-${index + 1}`,
    sequence,
    eventType: event.eventType === "sidebar" ? "sidebar" : "view",
    viewId: text(event.viewId),
    ...(typeof event.fieldId === "string" ? { fieldId: event.fieldId } : {}),
    title,
    menuPath: stringList(event.menuPath),
    annotation: text(event.annotation),
    ...(resultValue(event.resultValue) !== undefined ? { resultValue: resultValue(event.resultValue) } : {}),
    ...(typeof event.resultStatus === "string" ? { resultStatus: event.resultStatus } : {}),
  };
}

export function presentPmdtResult(result: Record<string, unknown> | null): PmdtResultPresentation | null {
  if (!result) return null;
  const answer = row(result.answer);
  const events = Array.isArray(result.events)
    ? result.events.map(parsePmdtEvent).filter((event): event is PmdtResultEvent => event !== null)
    : [];
  const actionHistory = Array.isArray(result.actionHistory)
    ? result.actionHistory.map(parseScenarioAction).filter((event): event is ScenarioActionEvent => event !== null)
    : [];
  const resolution = parseScenarioResolution(result.resolution);
  const hardwareAnswer = isHardwareDiagnosisAnswer(result.hardwareAnswer) ? result.hardwareAnswer : undefined;
  return {
    startedAt: nullableText(result.startedAt),
    submittedAt: nullableText(result.submittedAt),
    events,
    actionHistory,
    ...(resolution ? { resolution } : {}),
    answer: {
      suspectedFault: text(answer.suspectedFault),
      reasoning: text(answer.reasoning),
      remediation: text(answer.remediation),
    },
    ...(hardwareAnswer ? { hardwareAnswer } : {}),
  };
}

const ACTION_KINDS = new Set<RecordedActionKind>(["menu-selection", "value-input", "authentication"]);

function parseRecordedAction(value: unknown, index: number): RecordedAction | null {
  const action = row(value);
  const kind = text(action.kind) as RecordedActionKind;
  if (!ACTION_KINDS.has(kind) || typeof action.input !== "string") return null;
  return {
    step: typeof action.step === "number" && Number.isFinite(action.step) ? action.step : index + 1,
    kind,
    menuId: text(action.menuId),
    menuTitle: text(action.menuTitle),
    input: action.input,
    resultLabel: text(action.resultLabel),
    timestamp: typeof action.timestamp === "number" && Number.isFinite(action.timestamp) ? action.timestamp : 0,
  };
}

function recordedActions(value: unknown): RecordedAction[] {
  return Array.isArray(value)
    ? value.map(parseRecordedAction).filter((action): action is RecordedAction => action !== null)
    : [];
}

export function presentAdsbResult(result: Record<string, unknown> | null): AdsbResultPresentation | null {
  if (!result) return null;
  return {
    startedAt: nullableText(result.startedAt),
    submittedAt: nullableText(result.submittedAt),
    selectedActions: recordedActions(result.selectedActions),
    allActions: recordedActions(result.allActions),
    authenticatedCorrectly: result.authenticatedCorrectly === true,
    qcmsMonitoringOpened: result.qcmsMonitoringOpened === true,
    diagnosedComponentIds: stringList(result.diagnosedComponentIds),
    inspectedComponentIds: stringList(result.inspectedComponentIds),
  };
}
