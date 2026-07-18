import "server-only";

import { getCurrentProfile } from "@/lib/auth/profile";
import { mapRowToDmeScenario } from "@/lib/dme-scenario-storage";
import { createClient } from "@/lib/supabase/server";
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

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

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

function fail(context: string, error: unknown): never {
  console.error(context, error);
  throw new Error("Không thể tải dữ liệu kỳ thi. Vui lòng thử lại.");
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

export async function listSubjects(): Promise<ExamSubject[]> {
  await requireAuthenticated();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_subjects")
    .select("id,code,name,description,is_active,sort_order,exam_subject_modules(subject_id,module_code,module_name,sort_order)")
    .order("sort_order", { ascending: true });
  if (error) fail("List exam subjects failed", error);

  return rows(data).map((subject) => ({
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
  const supabase = await createClient();
  let allowedModules: string[] | null = null;
  if (subjectId) {
    const { data: modules, error: moduleError } = await supabase
      .from("exam_subject_modules")
      .select("module_code")
      .eq("subject_id", subjectId);
    if (moduleError) fail("List subject modules failed", moduleError);
    allowedModules = rows(modules).map((module) => string(module.module_code));
  }

  let query = supabase
    .from("exam_scenario_catalog")
    .select("module_code,scenario_id,title")
    .order("module_code", { ascending: true })
    .order("title", { ascending: true });
  if (allowedModules) {
    if (allowedModules.length === 0) return [];
    query = query.in("module_code", allowedModules);
  }
  const { data, error } = await query;
  if (error) fail("List exam scenario options failed", error);
  return rows(data).map((scenario) => ({
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
  const supabase = await createClient();
  const scenario = await loadOfficialExamScenario(supabase, moduleCode, scenarioId);
  return scenario ? sanitizeOfficialExamScenario(scenario) : null;
}

async function loadOfficialExamScenario(
  supabase: ServerSupabaseClient,
  moduleCode: ExamModuleCode,
  scenarioId: string,
): Promise<OfficialExamScenario | null> {
  if (moduleCode === "vor") {
    const { data, error } = await supabase.from("vor_scenarios").select("*").eq("id", scenarioId).maybeSingle();
    if (error) fail("Get official VOR scenario failed", error);
    return data ? { moduleCode, scenario: mapRowToVorScenario(data) } : null;
  }
  if (moduleCode === "dme") {
    const { data, error } = await supabase.from("dme_scenarios").select("*").eq("id", scenarioId).maybeSingle();
    if (error) fail("Get official DME scenario failed", error);
    return data ? { moduleCode, scenario: mapRowToDmeScenario(data) } : null;
  }
  const { data, error } = await supabase.from("scenarios").select("*").eq("id", scenarioId).maybeSingle();
  if (error) fail("Get official ADS-B scenario failed", error);
  return data ? { moduleCode, scenario: mapRowToScenario(data) } : null;
}

export async function listAdminExamSets(): Promise<ExamSetSummary[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_sets")
    .select("id,name,description,status,created_at,updated_at,exam_set_subjects(subject_id,exam_subjects(name),exam_papers(id)),exams(id)")
    .order("updated_at", { ascending: false });
  if (error) fail("List admin exam sets failed", error);

  return rows(data).map((set) => {
    const subjects = rows(set.exam_set_subjects);
    return {
      id: string(set.id),
      name: string(set.name),
      description: nullableString(set.description),
      status: string(set.status) as ExamSetStatus,
      subjectCount: subjects.length,
      subjectNames: subjects.map((subject) => string(relation(subject.exam_subjects).name)),
      paperCount: subjects.reduce((total, subject) => total + rows(subject.exam_papers).length, 0),
      isUsed: rows(set.exams).length > 0,
      createdAt: string(set.created_at),
      updatedAt: string(set.updated_at),
    };
  });
}

export async function getExamSetDetail(id: string): Promise<ExamSetDetail | null> {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data, error }, scenarios] = await Promise.all([
    supabase
      .from("exam_sets")
      .select("id,name,description,status,created_at,updated_at,exams(id),exam_set_subjects(id,subject_id,position,exam_subjects(code,name),exam_papers(id,paper_number,title,is_saved,exam_paper_scenarios(id,module_code,scenario_id,position)))")
      .eq("id", id)
      .maybeSingle(),
    listScenarioOptions(),
  ]);
  if (error) fail("Get exam set detail failed", error);
  if (!data) return null;
  const set = row(data);
  const scenarioTitles = new Map(scenarios.map((scenario) => [`${scenario.moduleCode}:${scenario.scenarioId}`, scenario.title]));
  const subjects = rows(set.exam_set_subjects)
    .sort((a, b) => number(a.position) - number(b.position))
    .map((subject) => {
      const subjectRow = relation(subject.exam_subjects);
      return {
        id: string(subject.id),
        subjectId: string(subject.subject_id),
        subjectCode: string(subjectRow.code),
        subjectName: string(subjectRow.name),
        position: number(subject.position),
        papers: rows(subject.exam_papers)
          .sort((a, b) => number(a.paper_number) - number(b.paper_number))
          .map((paper) => ({
            id: string(paper.id),
            paperNumber: number(paper.paper_number),
            title: string(paper.title),
            isSaved: Boolean(paper.is_saved),
            scenarios: rows(paper.exam_paper_scenarios)
              .sort((a, b) => number(a.position) - number(b.position))
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
    isUsed: rows(set.exams).length > 0,
    createdAt: string(set.created_at),
    updatedAt: string(set.updated_at),
    subjects,
  };
}

export async function listAdminExams(): Promise<ExamSummary[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("id,name,exam_date,location,decision_basis,exam_set_id,status,created_at,updated_at,exam_sets(name),exam_candidates(id)")
    .order("exam_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) fail("List admin exams failed", error);
  return rows(data).map((exam) => ({
    id: string(exam.id),
    name: string(exam.name),
    examDate: string(exam.exam_date),
    location: string(exam.location) as ExamLocation,
    decisionBasis: string(exam.decision_basis),
    examSetId: string(exam.exam_set_id),
    examSetName: string(relation(exam.exam_sets).name),
    status: string(exam.status) as ExamStatus,
    candidateCount: rows(exam.exam_candidates).length,
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
  const supabase = await createClient();
  const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const safePage = Math.max(1, Math.trunc(page));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const examResult = await supabase
    .from("exams")
    .select("id,name,exam_date,location,decision_basis,exam_set_id,status,created_at,updated_at,exam_sets(name)")
    .eq("id", id)
    .maybeSingle();
  if (examResult.error) fail("Get admin exam failed", examResult.error);
  if (!examResult.data) return null;
  const exam = row(examResult.data);

  const [subjectResult, examinerResult, candidateResult] = await Promise.all([
    supabase.from("exam_set_subjects").select("subject_id,position,exam_subjects(code,name),exam_papers(id,paper_number,title)").eq("exam_set_id", string(exam.exam_set_id)).order("position"),
    supabase.from("exam_examiners").select("id,full_name,subject_id,position,exam_subjects(name)").eq("exam_id", id).order("position"),
    supabase.from("exam_candidates").select("id,full_name,work_unit,email", { count: "exact" }).eq("exam_id", id).order("full_name").range(from, to),
  ]);
  if (subjectResult.error) fail("Get admin exam subjects failed", subjectResult.error);
  if (examinerResult.error) fail("Get admin examiners failed", examinerResult.error);
  if (candidateResult.error) fail("Get admin candidates failed", candidateResult.error);

  const candidateRows = rows(candidateResult.data);
  let assignedByCandidate = new Map<string, ExamCandidateSubjectDetail[]>();
  if (candidateRows.length > 0) {
    const candidateIds = candidateRows.map((candidate) => string(candidate.id));
    const { data: assignments, error: assignmentError } = await supabase
      .from("exam_candidate_subjects")
      .select("id,candidate_id,subject_id,exam_paper_id,official_score,examiner_comment,status,exam_subjects(name),exam_papers(title,paper_number)")
      .in("candidate_id", candidateIds)
      .order("created_at");
    if (assignmentError) fail("Get candidate assignments failed", assignmentError);
    assignedByCandidate = rows(assignments).reduce((map, assignment) => {
      const candidateId = string(assignment.candidate_id);
      map.set(candidateId, [...(map.get(candidateId) ?? []), mapCandidateSubject(assignment)]);
      return map;
    }, new Map<string, ExamCandidateSubjectDetail[]>());
  }

  const subjects: AdminExamSubjectDetail[] = rows(subjectResult.data).map((subject) => ({
    id: string(subject.subject_id),
    code: string(relation(subject.exam_subjects).code),
    name: string(relation(subject.exam_subjects).name),
    papers: rows(subject.exam_papers)
      .sort((a, b) => number(a.paper_number) - number(b.paper_number))
      .map((paper) => ({ id: string(paper.id), paperNumber: number(paper.paper_number), title: string(paper.title) })),
  }));
  const total = candidateResult.count ?? 0;
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
    examiners: rows(examinerResult.data).map((examiner) => ({
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_candidate_subjects")
    .select("id,exam_id,status,official_score,examiner_comment,exam_candidates(full_name,work_unit,email),exams(name,status),exam_subjects(name),exam_papers(title,paper_number)")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("Get admin candidate subject failed", error);
  if (!data) return null;

  const subject = row(data);
  const { data: attemptData, error: attemptError } = await supabase
    .from("exam_attempts")
    .select("id,candidate_subject_id,status,started_at,submitted_at,exam_attempt_items(id,attempt_id,paper_scenario_id,module_code,scenario_id,position,status,started_at,submitted_at,submission_ref,result_json,exam_scenario_catalog(title))")
    .eq("candidate_subject_id", id)
    .maybeSingle();
  if (attemptError) fail("Get admin candidate attempt failed", attemptError);

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
      scenario: await loadOfficialExamScenario(supabase, item.moduleCode, item.scenarioId),
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("id,name,exam_date,location,decision_basis,status,exam_candidates(id,full_name,email,exam_candidate_subjects(id))")
    .order("exam_date", { ascending: false });
  if (error) fail("List open exams failed", error);
  return rows(data).map((exam) => {
    const candidate = rows(exam.exam_candidates).find((item) => string(item.email).toLowerCase() === profile.email.toLowerCase());
    return {
      id: string(exam.id),
      name: string(exam.name),
      examDate: string(exam.exam_date),
      location: string(exam.location) as ExamLocation,
      decisionBasis: string(exam.decision_basis),
      status: string(exam.status) as ExamStatus,
      candidateName: candidate ? string(candidate.full_name) : null,
      subjectCount: candidate ? rows(candidate.exam_candidate_subjects).length : 0,
    };
  });
}

export async function getStudentExamDetail(id: string): Promise<StudentExamDetail | null> {
  const profile = await requireAuthenticated();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("id,name,exam_date,location,decision_basis,status,exam_candidates(id,full_name,work_unit,email,exam_candidate_subjects(id,subject_id,exam_paper_id,official_score,examiner_comment,status,exam_subjects(name),exam_papers(title,paper_number)))")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("Get student exam failed", error);
  if (!data) return null;
  const exam = row(data);
  const candidateRow = rows(exam.exam_candidates).find((candidate) => string(candidate.email).toLowerCase() === profile.email.toLowerCase());
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
      subjects: rows(candidateRow.exam_candidate_subjects).map(mapCandidateSubject),
    } : null,
  };
}

export async function getStudentCandidateSubject(id: string): Promise<StudentCandidateSubjectDetail | null> {
  await requireAuthenticated();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_candidate_subjects")
    .select("id,exam_id,subject_id,exam_paper_id,status,exam_candidates(full_name,work_unit),exams(name,status),exam_subjects(name),exam_papers(title)")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("Get student candidate subject failed", error);
  if (!data) return null;
  const subject = row(data);
  const { data: attemptData, error: attemptError } = await supabase
    .from("exam_attempts")
    .select("id,candidate_subject_id,status,started_at,submitted_at,exam_attempt_items(id,attempt_id,paper_scenario_id,module_code,scenario_id,position,status,started_at,submitted_at,submission_ref,result_json,exam_scenario_catalog(title))")
    .eq("candidate_subject_id", id)
    .maybeSingle();
  if (attemptError) fail("Get student attempt failed", attemptError);

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
  await requireAuthenticated();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_attempt_items")
    .select("id,attempt_id,paper_scenario_id,module_code,scenario_id,position,status,started_at,submitted_at,submission_ref,result_json,exam_scenario_catalog(title),exam_attempts(candidate_subject_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("Get student attempt item failed", error);
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
