import type { ScenarioParametersDefinition, ScenarioParametersModuleId } from "@/lib/scenario-parameters";

export type ScenarioExamStatus = "draft" | "open" | "locked" | "closed" | "archived";
export type ScenarioExamAvailability = "draft" | "upcoming" | "available" | "ended" | "locked" | "closed" | "archived";
export type ScenarioExamCodeStatus =
  | "issued"
  | "redeemed"
  | "in_progress"
  | "submitted"
  | "timed_out"
  | "revoked";
export type ScenarioExamSubjectStatus = "not_started" | "in_progress" | "submitted" | "timed_out";
export type ScenarioExamSessionStatus = "in_progress" | "submitted" | "timed_out" | "revoked";
export type ScenarioExamTerminalReason = "submitted" | "timed_out" | "revoked";

export interface ScenarioExamInput {
  id?: string;
  name: string;
  description?: string;
  opensAt?: string | null;
  closesAt?: string | null;
  durationMinutes: number;
}

export interface IssueScenarioExamCodeInput {
  examId: string;
  candidateName: string;
  candidateUnit: string;
  moduleIds: ScenarioParametersModuleId[];
}

export interface ScenarioExamSummary {
  id: string;
  name: string;
  opensAt: string | null;
  closesAt: string | null;
  durationMinutes: number;
  status: ScenarioExamStatus;
  availability: ScenarioExamAvailability;
  codeCount: number;
  terminalCodeCount: number;
}

export interface ScenarioExamCodeSummary {
  id: string;
  examId: string;
  codeHint: string;
  candidateName: string;
  candidateUnit: string;
  status: ScenarioExamCodeStatus;
  issuedAt: string;
  redeemedAt: string | null;
  terminalAt: string | null;
  moduleIds: ScenarioParametersModuleId[];
  completedModules: number;
}

export interface ScenarioExamCodeSubjectSummary {
  id: string;
  moduleId: ScenarioParametersModuleId;
  position: number;
  status: ScenarioExamSubjectStatus;
  startedAt: string | null;
  submittedAt: string | null;
}

export interface ScenarioExamCodeDetail extends ScenarioExamCodeSummary {
  subjects: ScenarioExamCodeSubjectSummary[];
}

export interface ScenarioExamDetail extends ScenarioExamSummary {
  description: string;
  codes: ScenarioExamCodeDetail[];
}

export interface ScenarioExamPoolCount {
  moduleId: ScenarioParametersModuleId;
  count: number;
}

export interface CandidateOpenScenarioExam {
  id: string;
  name: string;
  opensAt: string | null;
  closesAt: string | null;
  durationMinutes: number;
  availability: ScenarioExamAvailability;
}

export interface CandidateSessionSubject {
  id: string;
  moduleId: ScenarioParametersModuleId;
  position: number;
  status: ScenarioExamSubjectStatus;
  startedAt: string | null;
  submittedAt: string | null;
  sessionItemId: string | null;
  scenarioName: string | null;
  scenarioId?: string | null;
  revision?: number | null;
  hasSavedResult?: boolean;
}

export interface CandidateScenarioExamSession {
  id: string;
  examId: string;
  examName: string;
  candidateName: string;
  candidateUnit: string;
  status: ScenarioExamSessionStatus;
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  subjects: CandidateSessionSubject[];
}

export interface CandidateScenarioExamItem {
  id: string;
  sessionId: string;
  subjectId: string;
  moduleId: ScenarioParametersModuleId;
  examName: string;
  candidateName: string;
  candidateUnit: string;
  scenarioName: string;
  startedAt: string;
  deadlineAt: string;
  revision: number;
  definition: ScenarioParametersDefinition;
}

export interface CandidateScenarioExamResult {
  version: 1;
  sessionItemId: string;
  moduleId: ScenarioParametersModuleId;
  scenarioId: string;
  revision: number;
  capturedAt: string;
  payload: Record<string, unknown>;
}

export interface ScenarioExamReviewSubject {
  subjectId: string;
  moduleId: ScenarioParametersModuleId;
  status: ScenarioExamSubjectStatus;
  itemId: string | null;
  scenarioName: string | null;
  revision: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  definition: ScenarioParametersDefinition | null;
  result: CandidateScenarioExamResult | null;
  resultInvalid: boolean;
  examinerScore: number | null;
  examinerComment: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  technicalSummary?: ScenarioExamTechnicalSummary;
}

export interface ScenarioExamSubmissionReview {
  examId: string;
  examName: string;
  codeId: string;
  codeHint: string;
  candidateName: string;
  candidateUnit: string;
  codeStatus: ScenarioExamCodeStatus;
  sessionStatus: ScenarioExamSessionStatus | null;
  startedAt: string | null;
  deadlineAt: string | null;
  submittedAt: string | null;
  subjects: ScenarioExamReviewSubject[];
}

export interface ScenarioExamReviewInput {
  examId: string;
  codeId: string;
  itemId: string;
  score: number;
  comment: string;
}

export interface ScenarioExamAnswer {
  suspectedFault: string;
  reasoning: string;
  remediation: string;
}

export interface ScenarioExamTechnicalSummary {
  status: "SOLVED" | "IN_PROGRESS" | "UNVERIFIED";
  solved: boolean | null;
  checks: Array<{ id: string; label: string; passed: boolean; detail: string }>;
  blockers: string[];
  pmdtComplete?: boolean;
  hardwareComplete?: boolean;
}
