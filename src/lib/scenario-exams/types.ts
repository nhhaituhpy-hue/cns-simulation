import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";

export type ScenarioExamStatus = "draft" | "open" | "locked" | "closed" | "archived";
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
