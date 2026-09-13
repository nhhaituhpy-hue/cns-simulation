import "server-only";

import { getCurrentProfile } from "@/lib/auth/profile";
import { mapRowToDmeScenario } from "@/lib/dme-scenario-storage";
import { queryDatabase } from "@/lib/db";
import { mapRowToScenario } from "@/lib/supabase/scenarios";
import { mapRowToVorScenario } from "@/lib/vor-scenario-storage";
import { sanitizeOfficialExamScenario } from "./student-scenario";
import type {
  AdminCandidateSubjectReview,
  AdminExamDetail,
  AdminExamSubjectDetail,
  ExamAttempt,
  ExamAttemptItem,
  ExamCandidateDetail,
  ExamCandidateSubjectDetail,
  ExamLocation,
  ExamModuleCode,
  OfficialExamScenario,
  ExamSetDetail,
  ExamSetStatus,
  ExamSetSummary,
  ExamSummary,
  ExamStatus,
  ExamSubject,
  ScenarioOption,
  StudentAttemptItemDetail,
  StudentCandidateSubjectDetail,
  StudentExamDetail,
  StudentOpenExamSummary,
} from "./types";

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function relation(value: unknown): Row {
  return Array.isArray(value) ? row(value[0]) : row(value);
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.map(row) : [];
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function number(value: unknown): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : number(value);
}

async function requireAuthenticated() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Bạn chưa đăng nhập.");
  return profile;
}

async function requireAdmin() {
  const profile = await requireAuthenticated();
  if (profile.role !== "admin") throw new Error("Bạn không có quyền quản lý kỳ thi.");
  return profile;
}

function mapAttemptItem(source: unknown): ExamAttemptItem {
  const item = row(source);
  return {
    id: string(item.id),
    attemptId: string(item.attemptId ?? item.attempt_id),
    paperScenarioId: string(item.paperScenarioId ?? item.paper_scenario_id),
    moduleCode: string(item.moduleCode ?? item.module_code) as ExamModuleCode,
    scenarioId: string(item.scenarioId ?? item.scenario_id),
    scenarioTitle: string(item.scenarioTitle ?? item.scenario_title),
    position: number(item.position),
    status: string(item.status) as ExamAttemptItem["status"],
    startedAt: nullableString(item.startedAt ?? item.started_at),
    submittedAt: nullableString(item.submittedAt ?? item.submitted_at),
    submissionRef: nullableString(item.submissionRef ?? item.submission_ref),
    result: item.result && typeof item.result === "object" && !Array.isArray(item.result)
      ? item.result as Record<string, unknown>
      : item.result_json && typeof item.result_json === "object" && !Array.isArray(item.result_json)
        ? item.result_json as Record<string, unknown>
        : null,
  };
}

export function mapExamAttempt(source: unknown): ExamAttempt {
  const attempt = row(source);
  return {
    id: string(attempt.id),
    candidateSubjectId: string(attempt.candidateSubjectId ?? attempt.candidate_subject_id),
    status: string(attempt.status) as ExamAttempt["status"],
    startedAt: string(attempt.startedAt ?? attempt.started_at),
    submittedAt: nullableString(attempt.submittedAt ?? attempt.submitted_at),
    items: rows(attempt.items ?? attempt.exam_attempt_items).map(mapAttemptItem),
  };
}

async function loadAttemptByCandidateSubject(candidateSubjectId: string, userId?: string) {
  const result = await queryDatabase(
    `select a.id, a.candidate_subject_id, a.status, a.started_at, a.submitted_at,
            coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'id', i.id, 'attempt_id', i.attempt_id,
                  'paper_scenario_id', i.paper_scenario_id,
                  'module_code', i.module_code, 'scenario_id', i.scenario_id,
                  'position', i.position, 'status', i.status,
                  'started_at', i.started_at, 'submitted_at', i.submitted_at,
                  'submission_ref', i.submission_ref, 'result_json', i.result_json,
                  'exam_scenario_catalog', jsonb_build_object('title', catalog.title)
                ) order by i.position
              )
              from public.exam_attempt_items i
              join public.exam_scenario_catalog catalog
                on catalog.module_code = i.module_code and catalog.scenario_id = i.scenario_id
              where i.attempt_id = a.id
            ), '[]'::jsonb) as exam_attempt_items
     from public.exam_attempts a
     where a.candidate_subject_id = $1
       and ($2::uuid is null or a.user_id = $2)
     limit 1`,
    [candidateSubjectId, userId ?? null],
  );
  return result.rows[0] ?? null;
}

export async function listSubjects(): Promise<ExamSubject[]> {
  await requireAuthenticated();
  const result = await queryDatabase(
    `select s.id, s.code, s.name, s.description, s.is_active, s.sort_order,
            coalesce((select jsonb_agg(to_jsonb(m) order by m.sort_order)
                      from public.exam_subject_modules m where m.subject_id = s.id), '[]'::jsonb) as exam_subject_modules
     from public.exam_subjects s
     order by s.sort_order`,
  );

  return rows(result.rows).map((subject) => ({
    id: string(subject.id),
    code: string(subject.code),
    name: string(subject.name),
    description: nullableString(subject.description),
    isActive: Boolean(subject.is_active),
    sortOrder: number(subject.sort_order),
    modules: rows(subject.exam_subject_modules)
      .map((module) => ({
        subjectId: string(module.subject_id),
        moduleCode: string(module.module_code) as ExamModuleCode,
        moduleName: string(module.module_name),
        sortOrder: number(module.sort_order),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export async function listScenarioOptions(subjectId?: string): Promise<ScenarioOption[]> {
  await requireAuthenticated();
  const result = await queryDatabase(
    `select c.module_code, c.scenario_id, c.title
     from public.exam_scenario_catalog c
     where $1::uuid is null
        or exists (select 1 from public.exam_subject_modules m where m.subject_id = $1 and m.module_code = c.module_code)
     order by c.module_code, c.title`,
    [subjectId ?? null],
  );
  return rows(result.rows).map((scenario) => ({
    moduleCode: string(scenario.module_code) as ExamModuleCode,
    scenarioId: string(scenario.scenario_id),
    title: string(scenario.title),
  }));
}

export async function getOfficialExamScenario(
  moduleCode: ExamModuleCode,
  scenarioId: string,
): Promise<OfficialExamScenario | null> {
  await requireAuthenticated();
  const scenario = await loadOfficialExamScenario(moduleCode, scenarioId);
  return scenario ? sanitizeOfficialExamScenario(scenario) : null;
}

async function loadOfficialExamScenario(
  moduleCode: ExamModuleCode,
  scenarioId: string,
): Promise<OfficialExamScenario | null> {
  if (moduleCode === "vor") {
    const data = (await queryDatabase("select * from public.vor_scenarios where id = $1", [scenarioId])).rows[0];
    return data ? { moduleCode, scenario: mapRowToVorScenario(data) } : null;
  }
  if (moduleCode === "dme") {
    const data = (await queryDatabase("select * from public.dme_scenarios where id = $1", [scenarioId])).rows[0];
    return data ? { moduleCode, scenario: mapRowToDmeScenario(data) } : null;
  }
  const data = (await queryDatabase("select * from public.scenarios where id = $1", [scenarioId])).rows[0];
  return data ? { moduleCode, scenario: mapRowToScenario(data) } : null;
}

export async function listAdminExamSets(): Promise<ExamSetSummary[]> {
  await requireAdmin();
  const result = await queryDatabase<{
    id: string; name: string; description: string | null; status: ExamSetStatus;
    subject_count: string; subject_names: string[]; paper_count: string;
    is_used: boolean; created_at: string; updated_at: string;
  }>(
    `select es.id, es.name, es.description, es.status, es.created_at, es.updated_at,
            count(distinct ss.id) as subject_count,
            coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}') as subject_names,
            count(distinct p.id) as paper_count,
            exists(select 1 from public.exams e where e.exam_set_id = es.id) as is_used
     from public.exam_sets es
     left join public.exam_set_subjects ss on ss.exam_set_id = es.id
     left join public.exam_subjects s on s.id = ss.subject_id
     left join public.exam_papers p on p.exam_set_subject_id = ss.id
     group by es.id
     order by es.updated_at desc`,
  );
  return result.rows.map((set) => ({
    id: set.id,
    name: set.name,
    description: set.description,
    status: set.status,
    subjectCount: Number(set.subject_count),
    subjectNames: set.subject_names,
    paperCount: Number(set.paper_count),
    isUsed: set.is_used,
    createdAt: set.created_at,
    updatedAt: set.updated_at,
  }));
}

export async function getExamSetDetail(id: string): Promise<ExamSetDetail | null> {
  await requireAdmin();
  const [setResult, subjectResult, paperResult, paperScenarioResult, scenarios] = await Promise.all([
    queryDatabase(`select es.*, exists(select 1 from public.exams e where e.exam_set_id = es.id) as is_used from public.exam_sets es where es.id = $1`, [id]),
    queryDatabase(`select ss.id, ss.subject_id, ss.position, s.code as subject_code, s.name as subject_name from public.exam_set_subjects ss join public.exam_subjects s on s.id = ss.subject_id where ss.exam_set_id = $1 order by ss.position`, [id]),
    queryDatabase(`select p.* from public.exam_papers p join public.exam_set_subjects ss on ss.id = p.exam_set_subject_id where ss.exam_set_id = $1 order by p.paper_number`, [id]),
    queryDatabase(`select ps.* from public.exam_paper_scenarios ps join public.exam_papers p on p.id = ps.exam_paper_id where p.exam_set_id = $1 order by ps.position`, [id]),
    listScenarioOptions(),
  ]);
  const set = row(setResult.rows[0]);
  if (!set.id) return null;
  const scenarioTitles = new Map(scenarios.map((scenario) => [`${scenario.moduleCode}:${scenario.scenarioId}`, scenario.title]));
  const subjects = rows(subjectResult.rows)
    .map((subject) => {
      return {
        id: string(subject.id),
        subjectId: string(subject.subject_id),
        subjectCode: string(subject.subject_code),
        subjectName: string(subject.subject_name),
        position: number(subject.position),
        papers: rows(paperResult.rows).filter((paper) => string(paper.exam_set_subject_id) === string(subject.id))
          .map((paper) => ({
            id: string(paper.id),
            paperNumber: number(paper.paper_number),
            title: string(paper.title),
            isSaved: Boolean(paper.is_saved),
            scenarios: rows(paperScenarioResult.rows).filter((scenario) => string(scenario.exam_paper_id) === string(paper.id))
              .map((scenario) => ({
                id: string(scenario.id),
                moduleCode: string(scenario.module_code) as ExamModuleCode,
                scenarioId: string(scenario.scenario_id),
                scenarioTitle: scenarioTitles.get(`${string(scenario.module_code)}:${string(scenario.scenario_id)}`) ?? "Kịch bản",
                position: number(scenario.position),
              })),
          })),
      };
    });
  return {
    id: string(set.id),
    name: string(set.name),
    description: nullableString(set.description),
    status: string(set.status) as ExamSetStatus,
    subjectCount: subjects.length,
    subjectNames: subjects.map((subject) => subject.subjectName),
    paperCount: subjects.reduce((total, subject) => total + subject.papers.length, 0),
    isUsed: Boolean(set.is_used),
    createdAt: string(set.created_at),
    updatedAt: string(set.updated_at),
    subjects,
  };
}

export async function listAdminExams(): Promise<ExamSummary[]> {
  await requireAdmin();
  const result = await queryDatabase(
    `select e.*, jsonb_build_object('name', es.name) as exam_sets,
            (select count(*) from public.exam_candidates c where c.exam_id = e.id) as candidate_count
     from public.exams e
     join public.exam_sets es on es.id = e.exam_set_id
     order by e.exam_date desc, e.created_at desc`,
  );
  return rows(result.rows).map((exam) => ({
    id: string(exam.id),
    name: string(exam.name),
    examDate: string(exam.exam_date),
    location: string(exam.location) as ExamLocation,
    decisionBasis: string(exam.decision_basis),
    examSetId: string(exam.exam_set_id),
    examSetName: string(relation(exam.exam_sets).name),
    status: string(exam.status) as ExamStatus,
    candidateCount: number(exam.candidate_count),
    createdAt: string(exam.created_at),
    updatedAt: string(exam.updated_at),
  }));
}

function mapCandidateSubject(source: unknown): ExamCandidateSubjectDetail {
  const subject = row(source);
  const subjectRow = relation(subject.exam_subjects);
  const paper = relation(subject.exam_papers);
  return {
    id: string(subject.id),
    subjectId: string(subject.subject_id),
    subjectName: string(subjectRow.name),
    examPaperId: string(subject.exam_paper_id),
    paperTitle: string(paper.title),
    paperNumber: number(paper.paper_number),
    officialScore: nullableNumber(subject.official_score),
    examinerComment: nullableString(subject.examiner_comment),
    status: string(subject.status) as ExamCandidateSubjectDetail["status"],
  };
}

export async function getAdminExamDetail(id: string, page = 1, pageSize = 20): Promise<AdminExamDetail | null> {
  await requireAdmin();
  const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const safePage = Math.max(1, Math.trunc(page));
  const from = (safePage - 1) * safePageSize;
  const examResult = await queryDatabase(
    `select e.*, jsonb_build_object('name', es.name) as exam_sets
     from public.exams e join public.exam_sets es on es.id = e.exam_set_id
     where e.id = $1`,
    [id],
  );
  if (!examResult.rows[0]) return null;
  const exam = row(examResult.rows[0]);

  const [subjectResult, examinerResult, candidateResult, candidateCountResult] = await Promise.all([
    queryDatabase(
      `select ss.subject_id, ss.position,
              jsonb_build_object('code', s.code, 'name', s.name) as exam_subjects,
              coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'paper_number', p.paper_number, 'title', p.title) order by p.paper_number) filter (where p.id is not null), '[]'::jsonb) as exam_papers
       from public.exam_set_subjects ss
       join public.exam_subjects s on s.id = ss.subject_id
       left join public.exam_papers p on p.exam_set_subject_id = ss.id
       where ss.exam_set_id = $1
       group by ss.id, s.id
       order by ss.position`,
      [string(exam.exam_set_id)],
    ),
    queryDatabase(
      `select x.id, x.full_name, x.subject_id, x.position, jsonb_build_object('name', s.name) as exam_subjects
       from public.exam_examiners x join public.exam_subjects s on s.id = x.subject_id
       where x.exam_id = $1 order by x.position`,
      [id],
    ),
    queryDatabase(
      `select id, full_name, work_unit, email, count(*) over() as total_count
       from public.exam_candidates where exam_id = $1
       order by full_name offset $2 limit $3`,
      [id, from, safePageSize],
    ),
    queryDatabase<{ total: string }>("select count(*) as total from public.exam_candidates where exam_id = $1", [id]),
  ]);

  const candidateRows = rows(candidateResult.rows);
  let assignedByCandidate = new Map<string, ExamCandidateSubjectDetail[]>();
  if (candidateRows.length > 0) {
    const candidateIds = candidateRows.map((candidate) => string(candidate.id));
    const assignments = await queryDatabase(
      `select cs.id, cs.candidate_id, cs.subject_id, cs.exam_paper_id, cs.official_score,
              cs.examiner_comment, cs.status,
              jsonb_build_object('name', s.name) as exam_subjects,
              jsonb_build_object('title', p.title, 'paper_number', p.paper_number) as exam_papers
       from public.exam_candidate_subjects cs
       join public.exam_subjects s on s.id = cs.subject_id
       join public.exam_papers p on p.id = cs.exam_paper_id
       where cs.candidate_id = any($1::uuid[])
       order by cs.created_at`,
      [candidateIds],
    );
    assignedByCandidate = rows(assignments.rows).reduce((map, assignment) => {
      const candidateId = string(assignment.candidate_id);
      map.set(candidateId, [...(map.get(candidateId) ?? []), mapCandidateSubject(assignment)]);
      return map;
    }, new Map<string, ExamCandidateSubjectDetail[]>());
  }

  const subjects: AdminExamSubjectDetail[] = rows(subjectResult.rows).map((subject) => ({
    id: string(subject.subject_id),
    code: string(relation(subject.exam_subjects).code),
    name: string(relation(subject.exam_subjects).name),
    papers: rows(subject.exam_papers)
      .sort((a, b) => number(a.paper_number) - number(b.paper_number))
      .map((paper) => ({ id: string(paper.id), paperNumber: number(paper.paper_number), title: string(paper.title) })),
  }));
  const total = number(candidateCountResult.rows[0]?.total);
  return {
    id: string(exam.id),
    name: string(exam.name),
    examDate: string(exam.exam_date),
    location: string(exam.location) as ExamLocation,
    decisionBasis: string(exam.decision_basis),
    examSetId: string(exam.exam_set_id),
    examSetName: string(relation(exam.exam_sets).name),
    status: string(exam.status) as ExamStatus,
    candidateCount: total,
    createdAt: string(exam.created_at),
    updatedAt: string(exam.updated_at),
    subjects,
    examiners: rows(examinerResult.rows).map((examiner) => ({
      id: string(examiner.id),
      fullName: string(examiner.full_name),
      subjectId: string(examiner.subject_id),
      subjectName: string(relation(examiner.exam_subjects).name),
      position: number(examiner.position),
    })),
    candidates: {
      items: candidateRows.map((candidate): ExamCandidateDetail => ({
        id: string(candidate.id),
        fullName: string(candidate.full_name),
        workUnit: string(candidate.work_unit),
        email: string(candidate.email),
        subjects: assignedByCandidate.get(string(candidate.id)) ?? [],
      })),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.ceil(total / safePageSize),
    },
  };
}

export async function getAdminCandidateSubjectReview(id: string): Promise<AdminCandidateSubjectReview | null> {
  await requireAdmin();
  const subjectResult = await queryDatabase(
    `select cs.id, cs.exam_id, cs.status, cs.official_score, cs.examiner_comment,
            jsonb_build_object('full_name', c.full_name, 'work_unit', c.work_unit, 'email', c.email) as exam_candidates,
            jsonb_build_object('name', e.name, 'status', e.status) as exams,
            jsonb_build_object('name', s.name) as exam_subjects,
            jsonb_build_object('title', p.title, 'paper_number', p.paper_number) as exam_papers
     from public.exam_candidate_subjects cs
     join public.exam_candidates c on c.id = cs.candidate_id
     join public.exams e on e.id = cs.exam_id
     join public.exam_subjects s on s.id = cs.subject_id
     join public.exam_papers p on p.id = cs.exam_paper_id
     where cs.id = $1`,
    [id],
  );
  const data = subjectResult.rows[0];
  if (!data) return null;

  const subject = row(data);
  const attemptData = await loadAttemptByCandidateSubject(id);

  let attempt: AdminCandidateSubjectReview["attempt"] = null;
  if (attemptData) {
    const attemptRow = row(attemptData);
    const mappedAttempt = mapExamAttempt({
      ...attemptRow,
      items: rows(attemptRow.exam_attempt_items)
        .sort((a, b) => number(a.position) - number(b.position))
        .map((item) => ({ ...item, scenario_title: string(relation(item.exam_scenario_catalog).title) })),
    });
    const items = await Promise.all(mappedAttempt.items.map(async (item) => ({
      ...item,
      scenario: await loadOfficialExamScenario(item.moduleCode, item.scenarioId),
    })));
    attempt = { ...mappedAttempt, items };
  }

  const candidate = relation(subject.exam_candidates);
  const exam = relation(subject.exams);
  const examSubject = relation(subject.exam_subjects);
  const paper = relation(subject.exam_papers);
  return {
    id: string(subject.id),
    examId: string(subject.exam_id),
    examName: string(exam.name),
    examStatus: string(exam.status) as ExamStatus,
    candidateName: string(candidate.full_name),
    candidateWorkUnit: string(candidate.work_unit),
    candidateEmail: string(candidate.email),
    subjectName: string(examSubject.name),
    paperTitle: string(paper.title),
    paperNumber: number(paper.paper_number),
    status: string(subject.status) as AdminCandidateSubjectReview["status"],
    officialScore: nullableNumber(subject.official_score),
    examinerComment: nullableString(subject.examiner_comment),
    attempt,
  };
}

export async function listStudentOpenExams(): Promise<StudentOpenExamSummary[]> {
  const profile = await requireAuthenticated();
  const result = await queryDatabase(
    `select e.id, e.name, e.exam_date, e.location, e.decision_basis, e.status,
            c.full_name as candidate_name,
            (select count(*) from public.exam_candidate_subjects cs where cs.candidate_id = c.id) as subject_count
     from public.exams e
     left join public.exam_candidates c on c.exam_id = e.id and lower(c.email) = lower($1)
     where e.status = 'open'
        or exists (
          select 1 from public.exam_attempts a
          join public.exam_candidate_subjects cs on cs.id = a.candidate_subject_id
          where cs.exam_id = e.id and a.user_id = $2 and a.status in ('in_progress', 'submitted')
        )
     order by e.exam_date desc`,
    [profile.email, profile.id],
  );
  return rows(result.rows).map((exam) => ({
    id: string(exam.id),
    name: string(exam.name),
    examDate: string(exam.exam_date),
    location: string(exam.location) as ExamLocation,
    decisionBasis: string(exam.decision_basis),
    status: string(exam.status) as ExamStatus,
    candidateName: nullableString(exam.candidate_name),
    subjectCount: number(exam.subject_count),
  }));
}

export async function getStudentExamDetail(id: string): Promise<StudentExamDetail | null> {
  const profile = await requireAuthenticated();
  const examResult = await queryDatabase(
    `select e.* from public.exams e
     where e.id = $1 and (
       e.status = 'open' or exists (
         select 1 from public.exam_attempts a
         join public.exam_candidate_subjects cs on cs.id = a.candidate_subject_id
         where cs.exam_id = e.id and a.user_id = $2 and a.status in ('in_progress', 'submitted')
       )
     )`,
    [id, profile.id],
  );
  const data = examResult.rows[0];
  if (!data) return null;
  const exam = row(data);
  const candidateResult = await queryDatabase(
    `select c.* from public.exam_candidates c where c.exam_id = $1 and lower(c.email) = lower($2) limit 1`,
    [id, profile.email],
  );
  const candidateRow = candidateResult.rows[0] ? row(candidateResult.rows[0]) : null;
  let subjects: ExamCandidateSubjectDetail[] = [];
  if (candidateRow) {
    const subjectResult = await queryDatabase(
      `select cs.*, jsonb_build_object('name', s.name) as exam_subjects,
              jsonb_build_object('title', p.title, 'paper_number', p.paper_number) as exam_papers
       from public.exam_candidate_subjects cs
       join public.exam_subjects s on s.id = cs.subject_id
       join public.exam_papers p on p.id = cs.exam_paper_id
       where cs.candidate_id = $1 order by cs.created_at`,
      [candidateRow.id],
    );
    subjects = rows(subjectResult.rows).map(mapCandidateSubject);
  }
  return {
    id: string(exam.id),
    name: string(exam.name),
    examDate: string(exam.exam_date),
    location: string(exam.location) as ExamLocation,
    decisionBasis: string(exam.decision_basis),
    status: string(exam.status) as ExamStatus,
    candidate: candidateRow ? {
      id: string(candidateRow.id),
      fullName: string(candidateRow.full_name),
      workUnit: string(candidateRow.work_unit),
      email: string(candidateRow.email),
      subjects,
    } : null,
  };
}

export async function getStudentCandidateSubject(id: string): Promise<StudentCandidateSubjectDetail | null> {
  const profile = await requireAuthenticated();
  const subjectResult = await queryDatabase(
    `select cs.id, cs.exam_id, cs.subject_id, cs.exam_paper_id, cs.status,
            jsonb_build_object('full_name', c.full_name, 'work_unit', c.work_unit) as exam_candidates,
            jsonb_build_object('name', e.name, 'status', e.status) as exams,
            jsonb_build_object('name', s.name) as exam_subjects,
            jsonb_build_object('title', p.title) as exam_papers
     from public.exam_candidate_subjects cs
     join public.exam_candidates c on c.id = cs.candidate_id
     join public.exams e on e.id = cs.exam_id
     join public.exam_subjects s on s.id = cs.subject_id
     join public.exam_papers p on p.id = cs.exam_paper_id
     where cs.id = $1 and lower(c.email) = lower($2)`,
    [id, profile.email],
  );
  const data = subjectResult.rows[0];
  if (!data) return null;
  const subject = row(data);
  const attemptData = await loadAttemptByCandidateSubject(id, profile.id);

  let attempt: ExamAttempt | null = null;
  if (attemptData) {
    const attemptRow = row(attemptData);
    attempt = mapExamAttempt({
      ...attemptRow,
      items: rows(attemptRow.exam_attempt_items)
        .sort((a, b) => number(a.position) - number(b.position))
        .map((item) => ({ ...item, scenario_title: string(relation(item.exam_scenario_catalog).title) })),
    });
  }

  return {
    id: string(subject.id),
    examId: string(subject.exam_id),
    examName: string(relation(subject.exams).name),
    examStatus: string(relation(subject.exams).status) as ExamStatus,
    candidateName: string(relation(subject.exam_candidates).full_name),
    candidateWorkUnit: string(relation(subject.exam_candidates).work_unit),
    subjectId: string(subject.subject_id),
    subjectName: string(relation(subject.exam_subjects).name),
    examPaperId: string(subject.exam_paper_id),
    paperTitle: string(relation(subject.exam_papers).title),
    status: string(subject.status) as StudentCandidateSubjectDetail["status"],
    attempt,
  };
}

export async function getStudentAttemptItem(id: string): Promise<StudentAttemptItemDetail | null> {
  const profile = await requireAuthenticated();
  const itemResult = await queryDatabase(
    `select i.*, jsonb_build_object('title', catalog.title) as exam_scenario_catalog,
            jsonb_build_object('candidate_subject_id', a.candidate_subject_id) as exam_attempts
     from public.exam_attempt_items i
     join public.exam_attempts a on a.id = i.attempt_id
     join public.exam_scenario_catalog catalog on catalog.module_code = i.module_code and catalog.scenario_id = i.scenario_id
     where i.id = $1 and a.user_id = $2`,
    [id, profile.id],
  );
  const data = itemResult.rows[0];
  if (!data || (data.status !== "in_progress" && data.status !== "submitted")) return null;
  const item = row(data);
  const candidateSubjectId = string(relation(item.exam_attempts).candidate_subject_id);
  const subject = await getStudentCandidateSubject(candidateSubjectId);
  if (!subject?.attempt) return null;
  const mapped = mapAttemptItem({ ...item, scenario_title: string(relation(item.exam_scenario_catalog).title) });
  return {
    ...mapped,
    examId: subject.examId,
    examName: subject.examName,
    candidateSubjectId,
    candidateName: subject.candidateName,
    candidateWorkUnit: subject.candidateWorkUnit,
    subjectName: subject.subjectName,
    paperTitle: subject.paperTitle,
    returnHref: `/student/exams/${subject.examId}/subjects/${candidateSubjectId}`,
  };
}
