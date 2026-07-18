import { isHardwareDiagnosisAnswer, type HardwareDiagnosisAnswer } from "@/lib/equipment-diagram-types";
import type { RecordedAction, RecordedActionKind } from "@/lib/types";

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
  const hardwareAnswer = isHardwareDiagnosisAnswer(result.hardwareAnswer) ? result.hardwareAnswer : undefined;
  return {
    startedAt: nullableText(result.startedAt),
    submittedAt: nullableText(result.submittedAt),
    events,
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
