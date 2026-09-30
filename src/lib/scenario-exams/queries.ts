import "server-only";

import { getCurrentProfile } from "@/lib/auth/profile";
import { queryDatabase } from "@/lib/db";
import { SCENARIO_PARAMETERS_MODULES, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type {
  CandidateOpenScenarioExam,
  CandidateScenarioExamSession,
  CandidateSessionSubject,
  ScenarioExamCodeDetail,
  ScenarioExamDetail,
  ScenarioExamPoolCount,
  ScenarioExamStatus,
  ScenarioExamSubjectStatus,
  ScenarioExamSummary,
} from "./types";
import { getScenarioExamSessionToken, hashScenarioExamSessionToken } from "./session";

type Row = Record<string, unknown>;

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function number(value: unknown): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => typeof item === "object" && item !== null && !Array.isArray(item)) : [];
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") throw new Error("Bạn không có quyền xem kỳ thi Scenario.");
  return profile;
}

function mapSummary(row: Row): ScenarioExamSummary {
  return {
    id: string(row.id),
    name: string(row.name),
    opensAt: nullableString(row.opens_at),
    closesAt: nullableString(row.closes_at),
    durationMinutes: number(row.duration_minutes),
    status: string(row.status) as ScenarioExamStatus,
    codeCount: number(row.code_count),
    terminalCodeCount: number(row.terminal_code_count),
  };
}

export async function listScenarioExams(): Promise<ScenarioExamSummary[]> {
  await requireAdmin();
  const result = await queryDatabase(
    `select e.id, e.name, e.opens_at, e.closes_at, e.duration_minutes, e.status,
            count(c.id)::int as code_count,
            count(c.id) filter (where c.status in ('submitted', 'timed_out'))::int as terminal_code_count
       from public.scenario_exams e
       left join public.scenario_exam_codes c on c.exam_id = e.id
      group by e.id
      order by e.created_at desc`,
  );
  return result.rows.map((row) => mapSummary(row as Row));
}

export async function getScenarioExamDetail(examId: string): Promise<ScenarioExamDetail | null> {
  await requireAdmin();
  const [examResult, codeResult] = await Promise.all([
    queryDatabase(`select e.id, e.name, e.description, e.opens_at, e.closes_at, e.duration_minutes, e.status,
                          count(c.id)::int as code_count,
                          count(c.id) filter (where c.status in ('submitted', 'timed_out'))::int as terminal_code_count
                     from public.scenario_exams e
                     left join public.scenario_exam_codes c on c.exam_id = e.id
                    where e.id = $1
                    group by e.id`, [examId]),
    queryDatabase(`select c.id, c.exam_id, c.code_hint, c.candidate_name, c.candidate_unit,
                          c.status, c.issued_at, c.redeemed_at, c.terminal_at,
                          coalesce(jsonb_agg(jsonb_build_object(
                            'id', cs.id,
                            'moduleId', cs.module_id,
                            'position', cs.position,
                            'status', cs.status,
                            'startedAt', cs.started_at,
                            'submittedAt', cs.submitted_at
                          ) order by cs.position) filter (where cs.id is not null), '[]'::jsonb) as subjects,
                          count(cs.id)::int filter (where cs.status in ('submitted', 'timed_out')) as completed_modules
                     from public.scenario_exam_codes c
                     left join public.scenario_exam_code_subjects cs on cs.code_id = c.id
                    where c.exam_id = $1
                    group by c.id
                    order by c.created_at desc`, [examId]),
  ]);
  const examRow = examResult.rows[0] as Row | undefined;
  if (!examRow) return null;
  const summary = mapSummary(examRow);
  const codes: ScenarioExamCodeDetail[] = codeResult.rows.map((raw) => {
    const row = raw as Row;
    return {
      id: string(row.id),
      examId: string(row.exam_id),
      codeHint: string(row.code_hint),
      candidateName: string(row.candidate_name),
      candidateUnit: string(row.candidate_unit),
      status: string(row.status) as ScenarioExamCodeDetail["status"],
      issuedAt: string(row.issued_at),
      redeemedAt: nullableString(row.redeemed_at),
      terminalAt: nullableString(row.terminal_at),
      moduleIds: rows(row.subjects).map((subject) => string(subject.moduleId) as ScenarioParametersModuleId),
      completedModules: number(row.completed_modules),
      subjects: rows(row.subjects).map((subject) => ({
        id: string(subject.id),
        moduleId: string(subject.moduleId) as ScenarioParametersModuleId,
        position: number(subject.position),
        status: string(subject.status) as ScenarioExamSubjectStatus,
        startedAt: nullableString(subject.startedAt),
        submittedAt: nullableString(subject.submittedAt),
      })),
    };
  });
  return {
    ...summary,
    description: string(examRow.description),
    codes,
  };
}

export async function listScenarioExamPoolCounts(): Promise<ScenarioExamPoolCount[]> {
  await requireAdmin();
  const result = await queryDatabase(
    `select module_id, count(*)::int as count
       from public.simulator_scenario_library_memberships
      where library_kind = 'exam' and archived_at is null
      group by module_id`,
  );
  const counts = new Map(result.rows.map((row) => [string(row.module_id), number(row.count)]));
  return SCENARIO_PARAMETERS_MODULES.map((module) => ({
    moduleId: module.moduleId,
    count: counts.get(module.moduleId) ?? 0,
  }));
}

export async function listCandidateOpenScenarioExams(): Promise<CandidateOpenScenarioExam[]> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "student") throw new Error("Bạn cần đăng nhập tài khoản Thí sinh.");
  const result = await queryDatabase(
    `select id, name, opens_at, closes_at, duration_minutes
       from public.scenario_exams
      where status = 'open'
        and (opens_at is null or opens_at <= now())
        and (closes_at is null or closes_at > now())
      order by opens_at nulls first, created_at desc`,
  );
  return result.rows.map((row) => ({
    id: string(row.id),
    name: string(row.name),
    opensAt: nullableString(row.opens_at),
    closesAt: nullableString(row.closes_at),
    durationMinutes: number(row.duration_minutes),
  }));
}

export async function getCandidateScenarioExamSession(): Promise<CandidateScenarioExamSession | null> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "student") throw new Error("Bạn cần đăng nhập tài khoản Thí sinh.");
  const token = await getScenarioExamSessionToken();
  if (!token) return null;
  const result = await queryDatabase(
    `select s.id, c.exam_id, e.name as exam_name,
            c.candidate_name, c.candidate_unit, s.status, s.started_at,
            s.deadline_at, s.submitted_at,
            coalesce(jsonb_agg(jsonb_build_object(
              'id', cs.id,
              'moduleId', cs.module_id,
              'position', cs.position,
              'status', cs.status,
              'startedAt', cs.started_at,
              'submittedAt', cs.submitted_at,
              'sessionItemId', item.id,
              'scenarioName', item.scenario_name
            ) order by cs.position) filter (where cs.id is not null), '[]'::jsonb) as subjects
       from public.scenario_exam_sessions s
       join public.scenario_exam_codes c on c.id = s.code_id
       join public.scenario_exams e on e.id = c.exam_id
       left join public.scenario_exam_code_subjects cs on cs.code_id = c.id
       left join public.scenario_exam_session_items item on item.code_subject_id = cs.id and item.session_id = s.id
      where s.session_token_hash = $1
      group by s.id, c.exam_id, e.name, c.candidate_name, c.candidate_unit,
               s.status, s.started_at, s.deadline_at, s.submitted_at`,
    [hashScenarioExamSessionToken(token)],
  );
  const row = result.rows[0] as Row | undefined;
  if (!row) return null;
  const subjects: CandidateSessionSubject[] = rows(row.subjects).map((subject) => ({
    id: string(subject.id),
    moduleId: string(subject.moduleId) as ScenarioParametersModuleId,
    position: number(subject.position),
    status: string(subject.status) as CandidateSessionSubject["status"],
    startedAt: nullableString(subject.startedAt),
    submittedAt: nullableString(subject.submittedAt),
    sessionItemId: nullableString(subject.sessionItemId),
    scenarioName: nullableString(subject.scenarioName),
  }));
  return {
    id: string(row.id),
    examId: string(row.exam_id),
    examName: string(row.exam_name),
    candidateName: string(row.candidate_name),
    candidateUnit: string(row.candidate_unit),
    status: string(row.status) as CandidateScenarioExamSession["status"],
    startedAt: string(row.started_at),
    deadlineAt: string(row.deadline_at),
    submittedAt: nullableString(row.submitted_at),
    subjects,
  };
}
