import type {
  VorAttemptEvent,
  VorScreenId,
  VorStudentAnswer,
  VorSubmission,
  VorSubmissionStatus,
  VorViewId,
} from "./vor-types";
import { isHardwareDiagnosisAnswer, type HardwareDiagnosisAnswer } from "./equipment-diagram-types";
import { normalizeHardwareDiagnosisAnswer } from "./equipment-diagram-compatibility";
import type { VorStorageLike } from "./vor-scenario-storage";
import {
  isScenarioActionEvent,
  isScenarioResolution,
  type ScenarioActionEvent,
  type ScenarioResolution,
} from "./scenario-evidence";

export const VOR_SUBMISSION_STORAGE_KEY = "cns-training:vor-submissions";
export const VOR_SUBMISSION_STORAGE_VERSION = 2 as const;

interface VorSubmissionEnvelope {
  version: typeof VOR_SUBMISSION_STORAGE_VERSION;
  submissions: VorSubmission[];
}

const validStatuses: readonly VorSubmissionStatus[] = ["draft", "submitted", "reviewed"];
const validScreens: readonly VorScreenId[] = [
  "home", "rms-status", "rms-data", "rms-logs", "rms-config", "monitor-data", "monitor-config",
  "monitor-test-results", "monitor-fault-history", "monitor-1-offsets", "monitor-2-offsets", "tx-data", "tx-config", "diagnostics", "disabled",
];
const validViews: readonly VorViewId[] = [
  "home", "rms-status-main", "rms-status-monitor-tx", "rms-status-software", "rms-status-hardware",
  "rms-logs-operational-summary", "rms-logs-commands", "rms-logs-parameters",
  "rms-maintenance-alerts", "rms-digital-io", "rms-power-supply",
  "rms-temperature", "rms-ad-data", "rms-logs-alarms", "rms-logs-maintenance",
  "rms-config-general", "rms-config-station", "rms-config-power-limits", "rms-config-ad-limits",
  "monitor-integral", "monitor-status", "monitor-sideband-vswr", "monitor-notch", "monitor-alarm-limits", "monitor-test-results", "monitor-fault-history",
  "monitor-config-general", "monitor-1-offsets", "monitor-2-offsets",
  "tx-data-main", "tx-ground-check-1", "tx-ground-check-2", "tx-status-1", "tx-status-2", "tx-config-nominal", "tx-config-offsets", "diagnostics-power-up", "diagnostics-fault-isolation",
  "disabled",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isEditableValue(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isAnswer(value: unknown): value is VorStudentAnswer {
  return (
    isRecord(value) &&
    isString(value.suspectedFault) &&
    isString(value.reasoning) &&
    isString(value.remediation)
  );
}

function isEvent(value: unknown): value is VorAttemptEvent {
  const common = (
    isRecord(value) &&
    isString(value.id) && value.id.trim().length > 0 &&
    typeof value.sequence === "number" && Number.isInteger(value.sequence) && value.sequence > 0 &&
    isString(value.screenId) && validScreens.includes(value.screenId as VorScreenId) &&
    isString(value.viewId) && validViews.includes(value.viewId as VorViewId) &&
    Array.isArray(value.menuPath) && value.menuPath.every(isString) &&
    isString(value.title) &&
    isString(value.visitedAt) &&
    isString(value.annotation)
  );
  if (!common || !isRecord(value)) return false;
  if (value.eventType === undefined || value.eventType === "view") return true;
  return (
    value.eventType === "sidebar" &&
    isString(value.fieldId) && value.fieldId.trim().length > 0 &&
    isEditableValue(value.resultValue) &&
    isString(value.resultStatus) &&
    (["green", "yellow", "red", "gray", "normal", "warning", "alarm"] as const)
      .includes(value.resultStatus as "green")
  );
}

function isActionHistory(value: unknown): value is ScenarioActionEvent[] {
  return Array.isArray(value) && value.every(isScenarioActionEvent);
}

export function isVorSubmission(value: unknown): value is VorSubmission {
  if (!isRecord(value)) return false;
  const validScore =
    value.score === undefined ||
    (typeof value.score === "number" && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100);
  const validOptionalStrings =
    (value.submittedAt === undefined || isString(value.submittedAt)) &&
    (value.reviewedAt === undefined || isString(value.reviewedAt)) &&
    (value.examinerComment === undefined || isString(value.examinerComment));

  return (
    isString(value.id) && value.id.trim().length > 0 &&
    isString(value.scenarioId) && value.scenarioId.trim().length > 0 &&
    isString(value.userId) && value.userId.trim().length > 0 &&
    isString(value.studentName) && value.studentName.trim().length > 0 &&
    isString(value.workUnit) && value.workUnit.trim().length > 0 &&
    isString(value.status) && validStatuses.includes(value.status as VorSubmissionStatus) &&
    isString(value.startedAt) &&
    validOptionalStrings &&
    Array.isArray(value.events) && value.events.every(isEvent) &&
    (value.actionHistory === undefined || isActionHistory(value.actionHistory)) &&
    (value.resolution === undefined || isScenarioResolution(value.resolution)) &&
    isAnswer(value.answer) &&
    (value.hardwareAnswer === undefined || isHardwareDiagnosisAnswer(value.hardwareAnswer)) &&
    validScore &&
    (value.status === "draft" || isString(value.submittedAt)) &&
    (value.status !== "reviewed" || (isString(value.reviewedAt) && typeof value.score === "number"))
  );
}

export function cloneVorSubmission(submission: VorSubmission): VorSubmission {
  const clone = structuredClone(submission);
  if (clone.hardwareAnswer) {
    clone.hardwareAnswer = normalizeHardwareDiagnosisAnswer("vor", clone.hardwareAnswer);
  }
  return clone;
}

export function serializeVorSubmissions(submissions: readonly VorSubmission[]): string {
  if (!submissions.every(isVorSubmission)) {
    throw new Error("VOR submission data is invalid.");
  }
  const envelope: VorSubmissionEnvelope = {
    version: VOR_SUBMISSION_STORAGE_VERSION,
    submissions: submissions.map(cloneVorSubmission),
  };
  return JSON.stringify(envelope);
}

export function deserializeVorSubmissions(rawValue: string | null): VorSubmission[] {
  if (!rawValue) return [];
  const parsed = JSON.parse(rawValue) as unknown;
  if (
    !isRecord(parsed) ||
    parsed.version !== VOR_SUBMISSION_STORAGE_VERSION ||
    !Array.isArray(parsed.submissions) ||
    !parsed.submissions.every(isVorSubmission)
  ) {
    throw new Error("Stored VOR submissions use an unsupported or invalid format.");
  }
  return parsed.submissions.map((submission) => cloneVorSubmission(submission as VorSubmission));
}

function requiredString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (!isString(value)) throw new Error(`VOR database field "${field}" is invalid.`);
  return value;
}

function jsonField(row: Record<string, unknown>, field: string): unknown {
  const value = row[field];
  return typeof value === "string" ? JSON.parse(value) as unknown : value;
}

function optionalJsonField(row: Record<string, unknown>, field: string): unknown {
  return row[field] === undefined || row[field] === null ? undefined : jsonField(row, field);
}

export function mapRowToVorSubmission(row: unknown): VorSubmission {
  if (!isRecord(row)) throw new Error("VOR submission row must be an object.");
  const actionHistory = optionalJsonField(row, "action_history");
  const resolution = optionalJsonField(row, "resolution");
  const candidate: VorSubmission = {
    id: requiredString(row, "id"),
    scenarioId: requiredString(row, "scenario_id"),
    userId: requiredString(row, "user_id"),
    studentName: requiredString(row, "student_name"),
    workUnit: requiredString(row, "work_unit"),
    status: requiredString(row, "status") as VorSubmissionStatus,
    startedAt: requiredString(row, "started_at"),
    events: jsonField(row, "events") as VorAttemptEvent[],
    ...(actionHistory !== undefined ? { actionHistory: actionHistory as ScenarioActionEvent[] } : {}),
    ...(resolution !== undefined ? { resolution: resolution as ScenarioResolution } : {}),
    answer: jsonField(row, "answer") as VorStudentAnswer,
    ...(row.hardware_answer ? { hardwareAnswer: normalizeHardwareDiagnosisAnswer("vor", jsonField(row, "hardware_answer") as HardwareDiagnosisAnswer) } : {}),
    ...(row.submitted_at ? { submittedAt: requiredString(row, "submitted_at") } : {}),
    ...(row.reviewed_at ? { reviewedAt: requiredString(row, "reviewed_at") } : {}),
    ...(typeof row.score === "number" ? { score: row.score } : {}),
    ...(isString(row.examiner_comment) ? { examinerComment: row.examiner_comment } : {}),
  };
  if (!isVorSubmission(candidate)) throw new Error("VOR database submission is invalid.");
  return candidate;
}

export function vorSubmissionToRow(submission: VorSubmission) {
  if (!isVorSubmission(submission)) throw new Error("Cannot persist an invalid VOR submission.");
  return {
    id: submission.id,
    scenario_id: submission.scenarioId,
    user_id: submission.userId,
    student_name: submission.studentName,
    work_unit: submission.workUnit,
    status: submission.status,
    started_at: submission.startedAt,
    submitted_at: submission.submittedAt ?? null,
    reviewed_at: submission.reviewedAt ?? null,
    events: submission.events,
    action_history: submission.actionHistory ?? [],
    resolution: submission.resolution ?? null,
    answer: submission.answer,
    hardware_answer: submission.hardwareAnswer ?? null,
    score: submission.score ?? null,
    examiner_comment: submission.examinerComment ?? null,
  };
}

export function saveVorSubmissions(
  storage: VorStorageLike,
  submissions: readonly VorSubmission[],
): void {
  storage.setItem(VOR_SUBMISSION_STORAGE_KEY, serializeVorSubmissions(submissions));
}

export function loadVorSubmissions(storage: VorStorageLike): VorSubmission[] {
  const rawValue = storage.getItem(VOR_SUBMISSION_STORAGE_KEY);
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (isRecord(parsed) && parsed.version === 1) {
      storage.removeItem(VOR_SUBMISSION_STORAGE_KEY);
      return [];
    }
  } catch {
    // Let the normal deserializer report malformed current-version data.
  }
  return deserializeVorSubmissions(rawValue);
}
