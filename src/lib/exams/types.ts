import type { DmeScenario } from "@/lib/dme-types";
import type { Scenario } from "@/lib/types";
import type { VorScenario } from "@/lib/vor-types";

export type ExamModuleCode = "vor" | "dme" | "ads-b";
export type ExamSetStatus = "draft" | "ready" | "archived";
export type ExamStatus = "open" | "locked" | "archived";
export type ExamLocation = "ha_noi" | "da_nang" | "tp_hcm";
export type CandidateSubjectStatus = "assigned" | "in_progress" | "submitted" | "reviewed";
export type ExamAttemptStatus = "in_progress" | "submitted";
export type ExamAttemptItemStatus = "pending" | "in_progress" | "submitted";

export type OfficialExamScenario =
  | { moduleCode: "vor"; scenario: VorScenario }
  | { moduleCode: "dme"; scenario: DmeScenario }
  | { moduleCode: "ads-b"; scenario: Scenario };

export interface ExamActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

export interface ExamSubjectModule {
  subjectId: string;
  moduleCode: ExamModuleCode;
  moduleName: string;
  sortOrder: number;
}

export interface ExamSubject {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  modules: ExamSubjectModule[];
}

export interface ScenarioOption {
  moduleCode: ExamModuleCode;
  scenarioId: string;
  title: string;
  description?: string;
}

export interface ExamPaperScenarioInput {
  moduleCode: ExamModuleCode;
  scenarioId: string;
  position?: number;
}

export interface ExamPaperInput {
  id?: string;
  paperNumber: number;
  title: string;
  scenarios: ExamPaperScenarioInput[];
}

export interface ExamSetSubjectInput {
  subjectId: string;
  papers: ExamPaperInput[];
}

export interface ExamSetInput {
  id?: string;
  name: string;
  description?: string;
  subjects: ExamSetSubjectInput[];
}

export interface ExamPaperScenarioDetail extends Required<ExamPaperScenarioInput> {
  id: string;
  scenarioTitle: string;
}

export interface ExamPaperDetail {
  id: string;
  paperNumber: number;
  title: string;
  isSaved: boolean;
  scenarios: ExamPaperScenarioDetail[];
}

export interface ExamSetSubjectDetail {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  position: number;
  papers: ExamPaperDetail[];
}

export interface ExamSetSummary {
  id: string;
  name: string;
  description: string | null;
  status: ExamSetStatus;
  subjectCount: number;
  subjectNames: string[];
  paperCount: number;
  isUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExamSetDetail extends ExamSetSummary {
  subjects: ExamSetSubjectDetail[];
}

export interface ExamExaminerInput {
  id?: string;
  fullName: string;
  subjectId: string;
  position: number;
}

export interface ExamCandidateSubjectInput {
  id?: string;
  subjectId: string;
  examPaperId: string;
}

export interface ExamCandidateInput {
  id?: string;
  examId: string;
  fullName: string;
  workUnit: string;
  email: string;
  subjects: ExamCandidateSubjectInput[];
}

export interface ExamInput {
  id?: string;
  name: string;
  examDate: string;
  location: ExamLocation;
  decisionBasis: string;
  examSetId: string;
}

export interface CandidateResultInput {
  candidateSubjectId: string;
  officialScore: number;
  examinerComment?: string;
}

export interface ExamSummary {
  id: string;
  name: string;
  examDate: string;
  location: ExamLocation;
  decisionBasis: string;
  examSetId: string;
  examSetName: string;
  status: ExamStatus;
  candidateCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamExaminerDetail extends ExamExaminerInput {
  id: string;
  subjectName: string;
}

export interface ExamCandidateSubjectDetail {
  id: string;
  subjectId: string;
  subjectName: string;
  examPaperId: string;
  paperTitle: string;
  paperNumber: number;
  officialScore: number | null;
  examinerComment: string | null;
  status: CandidateSubjectStatus;
}

export interface ExamCandidateDetail {
  id: string;
  fullName: string;
  workUnit: string;
  email: string;
  subjects: ExamCandidateSubjectDetail[];
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminExamSubjectDetail {
  id: string;
  code: string;
  name: string;
  papers: Array<Pick<ExamPaperDetail, "id" | "paperNumber" | "title">>;
}

export interface AdminExamDetail extends ExamSummary {
  subjects: AdminExamSubjectDetail[];
  examiners: ExamExaminerDetail[];
  candidates: PagedResult<ExamCandidateDetail>;
}

export interface AdminExamAttemptItemDetail extends ExamAttemptItem {
  scenario: OfficialExamScenario | null;
}

export interface AdminCandidateSubjectReview {
  id: string;
  examId: string;
  examName: string;
  examStatus: ExamStatus;
  candidateName: string;
  candidateWorkUnit: string;
  candidateEmail: string;
  subjectName: string;
  paperTitle: string;
  paperNumber: number;
  status: CandidateSubjectStatus;
  officialScore: number | null;
  examinerComment: string | null;
  attempt: (Omit<ExamAttempt, "items"> & { items: AdminExamAttemptItemDetail[] }) | null;
}

export interface StudentOpenExamSummary {
  id: string;
  name: string;
  examDate: string;
  location: ExamLocation;
  decisionBasis: string;
  status: ExamStatus;
  candidateName: string | null;
  subjectCount: number;
}

export interface StudentExamDetail {
  id: string;
  name: string;
  examDate: string;
  location: ExamLocation;
  decisionBasis: string;
  status: ExamStatus;
  candidate: ExamCandidateDetail | null;
}

export interface ExamAttemptItem {
  id: string;
  attemptId: string;
  paperScenarioId: string;
  moduleCode: ExamModuleCode;
  scenarioId: string;
  scenarioTitle: string;
  position: number;
  status: ExamAttemptItemStatus;
  startedAt: string | null;
  submittedAt: string | null;
  submissionRef: string | null;
  result: Record<string, unknown> | null;
}

export interface ExamAttempt {
  id: string;
  candidateSubjectId: string;
  status: ExamAttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  items: ExamAttemptItem[];
}

export interface StudentCandidateSubjectDetail {
  id: string;
  examId: string;
  examName: string;
  examStatus: ExamStatus;
  candidateName: string;
  candidateWorkUnit: string;
  subjectId: string;
  subjectName: string;
  examPaperId: string;
  paperTitle: string;
  status: CandidateSubjectStatus;
  attempt: ExamAttempt | null;
}

export interface StudentAttemptItemDetail extends ExamAttemptItem {
  examId: string;
  examName: string;
  candidateSubjectId: string;
  candidateName: string;
  candidateWorkUnit: string;
  subjectName: string;
  paperTitle: string;
  returnHref: string;
}

export interface CompleteAttemptItemInput {
  submissionRef?: string;
  result: Record<string, unknown>;
}
