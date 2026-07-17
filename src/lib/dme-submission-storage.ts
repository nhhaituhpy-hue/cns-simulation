import type {
  DmeAttemptEvent,
  DmeScreenId,
  DmeStudentAnswer,
  DmeSubmission,
  DmeSubmissionStatus,
  DmeViewId,
} from "./dme-types";
import { isHardwareDiagnosisAnswer, type HardwareDiagnosisAnswer } from "./equipment-diagram-types";
import { normalizeHardwareDiagnosisAnswer } from "./equipment-diagram-compatibility";
import type { DmeStorageLike } from "./dme-scenario-storage";

export const DME_SUBMISSION_STORAGE_KEY = "cns-training:dme-submissions";
export const DME_SUBMISSION_STORAGE_VERSION = 1 as const;

interface DmeSubmissionEnvelope {
  version: typeof DME_SUBMISSION_STORAGE_VERSION;
  submissions: DmeSubmission[];
}

const validStatuses: readonly DmeSubmissionStatus[] = ["draft", "submitted", "reviewed"];
const validScreens: readonly DmeScreenId[] = [
  "home", "rms-status", "rms-logs", "monitor-data", "monitor-config",
  "monitor-1-test-results", "monitor-2-test-results", "monitor-1-offsets",
  "monitor-2-offsets", "tx-data", "tx-config", "disabled",
];
const validViews: readonly DmeViewId[] = [
  "home", "rms-status-main", "rms-status-monitor-tx", "rms-logs-alarms",
  "rms-logs-maintenance", "monitor-integral", "monitor-standby",
  "monitor-alarm-limits", "monitor-1-decoder-results", "monitor-2-decoder-results",
  "monitor-1-offsets", "monitor-2-offsets", "tx-data-main", "tx-rtc-data",
  "tx-config-nominal", "tx-config-offsets", "disabled",
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

function isAnswer(value: unknown): value is DmeStudentAnswer {
  return (
    isRecord(value) &&
    isString(value.suspectedFault) &&
    isString(value.reasoning) &&
    isString(value.remediation)
  );
}

function isEvent(value: unknown): value is DmeAttemptEvent {
  const common = (
    isRecord(value) &&
    isString(value.id) && value.id.trim().length > 0 &&
    typeof value.sequence === "number" && Number.isInteger(value.sequence) && value.sequence > 0 &&
    isString(value.screenId) && validScreens.includes(value.screenId as DmeScreenId) &&
    isString(value.viewId) && validViews.includes(value.viewId as DmeViewId) &&
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

export function isDmeSubmission(value: unknown): value is DmeSubmission {
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
    isString(value.studentName) && value.studentName.trim().length > 0 &&
    isString(value.studentCode) && value.studentCode.trim().length > 0 &&
    isString(value.status) && validStatuses.includes(value.status as DmeSubmissionStatus) &&
    isString(value.startedAt) &&
    validOptionalStrings &&
    Array.isArray(value.events) && value.events.every(isEvent) &&
    isAnswer(value.answer) &&
    (value.hardwareAnswer === undefined || isHardwareDiagnosisAnswer(value.hardwareAnswer)) &&
    validScore &&
    (value.status === "draft" || isString(value.submittedAt)) &&
    (value.status !== "reviewed" || (isString(value.reviewedAt) && typeof value.score === "number"))
  );
}

export function cloneDmeSubmission(submission: DmeSubmission): DmeSubmission {
  const clone = structuredClone(submission);
  if (clone.hardwareAnswer) {
    clone.hardwareAnswer = normalizeHardwareDiagnosisAnswer("dme", clone.hardwareAnswer);
  }
  return clone;
}

export function serializeDmeSubmissions(submissions: readonly DmeSubmission[]): string {
  if (!submissions.every(isDmeSubmission)) {
    throw new Error("DME submission data is invalid.");
  }
  const envelope: DmeSubmissionEnvelope = {
    version: DME_SUBMISSION_STORAGE_VERSION,
    submissions: submissions.map(cloneDmeSubmission),
  };
  return JSON.stringify(envelope);
}

export function deserializeDmeSubmissions(rawValue: string | null): DmeSubmission[] {
  if (!rawValue) return [];
  const parsed = JSON.parse(rawValue) as unknown;
  if (
    !isRecord(parsed) ||
    parsed.version !== DME_SUBMISSION_STORAGE_VERSION ||
    !Array.isArray(parsed.submissions) ||
    !parsed.submissions.every(isDmeSubmission)
  ) {
    throw new Error("Stored DME submissions use an unsupported or invalid format.");
  }
  return parsed.submissions.map(cloneDmeSubmission);
}

function requiredString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (!isString(value)) throw new Error(`DME database field "${field}" is invalid.`);
  return value;
}

function jsonField(row: Record<string, unknown>, field: string): unknown {
  const value = row[field];
  return typeof value === "string" ? JSON.parse(value) as unknown : value;
}

export function mapRowToDmeSubmission(row: unknown): DmeSubmission {
  if (!isRecord(row)) throw new Error("DME submission row must be an object.");
  const candidate: DmeSubmission = {
    id: requiredString(row, "id"),
    scenarioId: requiredString(row, "scenario_id"),
    studentName: requiredString(row, "student_name"),
    studentCode: requiredString(row, "student_code"),
    status: requiredString(row, "status") as DmeSubmissionStatus,
    startedAt: requiredString(row, "started_at"),
    events: jsonField(row, "events") as DmeAttemptEvent[],
    answer: jsonField(row, "answer") as DmeStudentAnswer,
    ...(row.hardware_answer ? { hardwareAnswer: normalizeHardwareDiagnosisAnswer("dme", jsonField(row, "hardware_answer") as HardwareDiagnosisAnswer) } : {}),
    ...(row.submitted_at ? { submittedAt: requiredString(row, "submitted_at") } : {}),
    ...(row.reviewed_at ? { reviewedAt: requiredString(row, "reviewed_at") } : {}),
    ...(typeof row.score === "number" ? { score: row.score } : {}),
    ...(isString(row.examiner_comment) ? { examinerComment: row.examiner_comment } : {}),
  };
  if (!isDmeSubmission(candidate)) throw new Error("DME database submission is invalid.");
  return candidate;
}

export function dmeSubmissionToRow(submission: DmeSubmission) {
  if (!isDmeSubmission(submission)) throw new Error("Cannot persist an invalid DME submission.");
  return {
    id: submission.id,
    scenario_id: submission.scenarioId,
    student_name: submission.studentName,
    student_code: submission.studentCode,
    status: submission.status,
    started_at: submission.startedAt,
    submitted_at: submission.submittedAt ?? null,
    reviewed_at: submission.reviewedAt ?? null,
    events: submission.events,
    answer: submission.answer,
    hardware_answer: submission.hardwareAnswer ?? null,
    score: submission.score ?? null,
    examiner_comment: submission.examinerComment ?? null,
  };
}

export function saveDmeSubmissions(
  storage: DmeStorageLike,
  submissions: readonly DmeSubmission[],
): void {
  storage.setItem(DME_SUBMISSION_STORAGE_KEY, serializeDmeSubmissions(submissions));
}

export function loadDmeSubmissions(storage: DmeStorageLike): DmeSubmission[] {
  return deserializeDmeSubmissions(storage.getItem(DME_SUBMISSION_STORAGE_KEY));
}

