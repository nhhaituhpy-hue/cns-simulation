"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { queryDatabase } from "@/lib/db";
import { mapExamAttempt } from "./queries";
import { mapRowToDmeScenario } from "@/lib/dme-scenario-storage";
import { mapRowToScenario } from "@/lib/supabase/scenarios";
import { mapRowToVorScenario } from "@/lib/vor-scenario-storage";
import { presentPmdtResult, presentAdsbResult } from "./result-presentation";
import type {
  CandidateResultInput,
  CompleteAttemptItemInput,
  ExamActionResult,
  ExamAttempt,
  ExamCandidateInput,
  ExamExaminerInput,
  ExamInput,
  ExamSetInput,
  ExamStatus,
} from "./types";
import {
  ExamValidationError,
  validateCandidateInput,
  validateCandidateResultInput,
  validateCompleteAttemptItemInput,
  validateExaminerInput,
  validateExamInput,
  validateExamSetInput,
  validateExamStatus,
  validateUuid,
} from "./validation";

type Row = Record<string, unknown>;

function asRow(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function actionError<T = undefined>(context: string, error: unknown): ExamActionResult<T> {
  console.error(context, error);
  if (error instanceof ExamValidationError) return { ok: false, message: error.message };
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    const message = error.message;
    if (message.includes("duplicate key")) return { ok: false, message: "Dữ liệu bị trùng. Vui lòng kiểm tra lại." };
    if (/^(Bạn|Bộ đề|Kỳ thi|Lượt thi|Môn thi|Kịch bản|Thí sinh|Thông tin|Danh sách|Đề thi|Chỉ|Không|Hãy|Email|Điểm|Bài thi|Phân môn|Kết quả)/.test(message)) {
      return { ok: false, message };
    }
  }
  return { ok: false, message: "Không thể lưu dữ liệu kỳ thi. Vui lòng thử lại." };
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") throw new ExamValidationError("Bạn không có quyền quản lý kỳ thi.");
  return profile;
}

async function requireStudent() {
  const profile = await getCurrentProfile();
  if (!profile) throw new ExamValidationError("Bạn chưa đăng nhập.");
  if (profile.role !== "student") throw new ExamValidationError("Chỉ tài khoản thí sinh được thực hiện bài thi.");
  return profile;
}

function refreshExamSetPaths(id?: string) {
  revalidatePath("/admin/exam-sets");
  if (id) revalidatePath(`/admin/exam-sets/${id}/edit`);
  revalidatePath("/admin/exams/new");
}

function refreshExamPaths(id?: string) {
  revalidatePath("/admin/exams");
  if (id) {
    revalidatePath(`/admin/exams/${id}`);
    revalidatePath(`/admin/exams/${id}/edit`);
    revalidatePath(`/student/exams/${id}`);
  }
  revalidatePath("/student/exams");
}

export async function saveExamSetAction(input: ExamSetInput, finalize = true): Promise<ExamActionResult<{ id: string }>> {
  try {
    const profile = await requireAdmin();
    const parsed = validateExamSetInput(input);
    const result = await queryDatabase<{ id: string }>(
      "select public.save_exam_set($1, $2, $3, $4, $5, $6) as id",
      [profile.id, parsed.id ?? null, parsed.name, parsed.description ?? "", parsed.subjects, finalize === true],
    );
    const id = validateUuid(result.rows[0]?.id, "Mã bộ đề");
    refreshExamSetPaths(id);
    return { ok: true, message: "Bộ đề thi đã được lưu.", data: { id } };
  } catch (error) {
    return actionError("Save exam set failed", error);
  }
}

export async function archiveExamSetAction(idValue: string): Promise<ExamActionResult> {
  try {
    await requireAdmin();
    const id = validateUuid(idValue, "Mã bộ đề");
    const activeExams = await queryDatabase(
      "select 1 from public.exams where exam_set_id = $1 and status <> 'archived' limit 1",
      [id],
    );
    if (activeExams.rowCount) {
      return { ok: false, message: "Bộ đề đang được một kỳ thi sử dụng nên chưa thể lưu trữ." };
    }
    await queryDatabase("update public.exam_sets set status = 'archived' where id = $1", [id]);
    refreshExamSetPaths(id);
    return { ok: true, message: "Bộ đề đã được lưu trữ." };
  } catch (error) {
    return actionError("Archive exam set failed", error);
  }
}

export async function saveExamAction(input: ExamInput): Promise<ExamActionResult<{ id: string }>> {
  try {
    const profile = await requireAdmin();
    const parsed = validateExamInput(input);
    let id = parsed.id;

    if (id) {
      const existingResult = await queryDatabase<{ exam_set_id: string }>(
        "select exam_set_id from public.exams where id = $1",
        [id],
      );
      const existing = existingResult.rows[0];
      if (!existing) return { ok: false, message: "Không tìm thấy kỳ thi." };
      if (existing.exam_set_id !== parsed.examSetId) {
        return { ok: false, message: "Không thể đổi bộ đề của kỳ thi đã tạo." };
      }
      await queryDatabase(
        `update public.exams
         set name = $2, exam_date = $3, location = $4, decision_basis = $5
         where id = $1`,
        [id, parsed.name, parsed.examDate, parsed.location, parsed.decisionBasis],
      );
    } else {
      const setResult = await queryDatabase<{ status: string }>(
        "select status from public.exam_sets where id = $1",
        [parsed.examSetId],
      );
      const examSet = setResult.rows[0];
      if (examSet?.status !== "ready") return { ok: false, message: "Bộ đề chưa hoàn thiện hoặc đã lưu trữ." };
      const insertResult = await queryDatabase<{ id: string }>(
        `insert into public.exams
           (name, exam_date, location, decision_basis, exam_set_id, status, created_by)
         values ($1, $2, $3, $4, $5, 'open', $6)
         returning id`,
        [parsed.name, parsed.examDate, parsed.location, parsed.decisionBasis, parsed.examSetId, profile.id],
      );
      id = insertResult.rows[0]?.id;
    }

    if (!id) throw new Error("Exam insert returned no identifier.");
    refreshExamPaths(id);
    return { ok: true, message: parsed.id ? "Thông tin kỳ thi đã được cập nhật." : "Kỳ thi đã được tạo.", data: { id } };
  } catch (error) {
    return actionError("Save exam failed", error);
  }
}

export async function setExamStatusAction(idValue: string, statusValue: ExamStatus): Promise<ExamActionResult> {
  try {
    await requireAdmin();
    const id = validateUuid(idValue, "Mã kỳ thi");
    const status = validateExamStatus(statusValue);
    if (status === "archived") return archiveExamAction(id);
    await queryDatabase("update public.exams set status = $2 where id = $1", [id, status]);
    refreshExamPaths(id);
    return { ok: true, message: status === "open" ? "Kỳ thi đã được mở." : "Kỳ thi đã được khóa." };
  } catch (error) {
    return actionError("Set exam status failed", error);
  }
}

export async function archiveExamAction(idValue: string): Promise<ExamActionResult> {
  try {
    await requireAdmin();
    const id = validateUuid(idValue, "Mã kỳ thi");
    const activeAttempts = await queryDatabase(
      `select 1
       from public.exam_attempts a
       join public.exam_candidate_subjects cs on cs.id = a.candidate_subject_id
       where a.status = 'in_progress' and cs.exam_id = $1
       limit 1`,
      [id],
    );
    if (activeAttempts.rowCount) {
      return { ok: false, message: "Kỳ thi còn lượt đang thực hiện. Hãy khóa thay vì lưu trữ để thí sinh có thể nộp bài." };
    }
    await queryDatabase("update public.exams set status = 'archived' where id = $1", [id]);
    refreshExamPaths(id);
    return { ok: true, message: "Kỳ thi đã được lưu trữ; toàn bộ lượt thi được bảo toàn." };
  } catch (error) {
    return actionError("Archive exam failed", error);
  }
}

async function replaceExaminers(examId: string, input: ExamExaminerInput[]): Promise<ExamActionResult> {
  const examiners = input.map(validateExaminerInput);
  const positions = new Set(examiners.map((examiner) => examiner.position));
  if (positions.size !== examiners.length) return { ok: false, message: "Thứ tự giám khảo không được trùng nhau." };
  await queryDatabase("select public.save_exam_examiners($1, $2)", [examId, examiners]);
  return { ok: true, message: "Danh sách giám khảo đã được lưu." };
}

export async function saveExamExaminersAction(examIdValue: string, input: ExamExaminerInput[]): Promise<ExamActionResult> {
  try {
    await requireAdmin();
    const examId = validateUuid(examIdValue, "Mã kỳ thi");
    if (!Array.isArray(input) || input.length > 100) throw new ExamValidationError("Danh sách giám khảo không hợp lệ.");
    const result = await replaceExaminers(examId, input);
    if (result.ok) refreshExamPaths(examId);
    return result;
  } catch (error) {
    return actionError("Save examiners failed", error);
  }
}

async function saveCandidate(input: ExamCandidateInput): Promise<ExamActionResult<{ id: string }>> {
  const candidate = validateCandidateInput(input);
  const result = await queryDatabase<{ id: string }>(
    "select public.save_exam_candidate($1, $2, $3, $4, $5, $6) as id",
    [candidate.id ?? null, candidate.examId, candidate.fullName, candidate.workUnit, candidate.email, candidate.subjects],
  );
  const id = validateUuid(result.rows[0]?.id, "Mã thí sinh");
  return { ok: true, message: "Thông tin thí sinh và phân đề đã được lưu.", data: { id } };
}

export async function saveExamCandidateAction(input: ExamCandidateInput): Promise<ExamActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const parsed = validateCandidateInput(input);
    const result = await saveCandidate(parsed);
    if (result.ok) refreshExamPaths(parsed.examId);
    return result;
  } catch (error) {
    return actionError("Save candidate failed", error);
  }
}

export async function deleteExamCandidateAction(idValue: string): Promise<ExamActionResult> {
  try {
    await requireAdmin();
    const id = validateUuid(idValue, "Mã thí sinh");
    const candidateResult = await queryDatabase<{ exam_id: string }>(
      "select exam_id from public.exam_candidates where id = $1",
      [id],
    );
    const candidate = candidateResult.rows[0];
    if (!candidate) return { ok: false, message: "Không tìm thấy thí sinh." };
    const attempts = await queryDatabase(
      `select 1 from public.exam_attempts a
       join public.exam_candidate_subjects cs on cs.id = a.candidate_subject_id
       where cs.candidate_id = $1 limit 1`,
      [id],
    );
    if (attempts.rowCount) return { ok: false, message: "Thí sinh đã bắt đầu thi nên dữ liệu phải được bảo toàn." };
    await queryDatabase("delete from public.exam_candidates where id = $1", [id]);
    refreshExamPaths(candidate.exam_id);
    return { ok: true, message: "Thí sinh đã được xóa khỏi kỳ thi." };
  } catch (error) {
    return actionError("Delete candidate failed", error);
  }
}

export async function saveCandidateResultAction(input: CandidateResultInput): Promise<ExamActionResult> {
  try {
    await requireAdmin();
    const parsed = validateCandidateResultInput(input);
    const result = await queryDatabase<{ id: string }>(
      "select public.save_candidate_result($1, $2, $3) as id",
      [parsed.candidateSubjectId, parsed.officialScore, parsed.examinerComment ?? ""],
    );
    refreshExamPaths(validateUuid(result.rows[0]?.id, "Mã kỳ thi"));
    return { ok: true, message: "Kết quả chính thức do giám khảo nhập đã được lưu." };
  } catch (error) {
    return actionError("Save candidate result failed", error);
  }
}

export async function startExamAttemptAction(candidateSubjectIdValue: string): Promise<ExamActionResult<{ attempt: ExamAttempt }>> {
  try {
    const profile = await requireStudent();
    const candidateSubjectId = validateUuid(candidateSubjectIdValue, "Mã môn thi");
    const result = await queryDatabase<{ data: Row }>(
      "select public.start_exam_attempt($1, $2) as data",
      [profile.id, candidateSubjectId],
    );
    const attempt = mapExamAttempt(asRow(result.rows[0]?.data));
    revalidatePath(`/student/exams`, "page");
    revalidatePath(`/student/exams/[examId]/subjects/[candidateSubjectId]`, "page");
    return { ok: true, message: "Lượt thi đã được bắt đầu.", data: { attempt } };
  } catch (error) {
    return actionError("Start exam attempt failed", error);
  }
}

export async function completeExamAttemptItemAction(
  attemptItemIdValue: string,
  input: CompleteAttemptItemInput,
): Promise<ExamActionResult<{ attempt: ExamAttempt }>> {
  try {
    const profile = await requireStudent();
    const attemptItemId = validateUuid(attemptItemIdValue, "Mã kịch bản thi");
    const parsed = validateCompleteAttemptItemInput(input);
    const result = await queryDatabase<{ data: Row }>(
      "select public.complete_exam_attempt_item($1, $2, $3, $4) as data",
      [profile.id, attemptItemId, parsed.submissionRef ?? null, parsed.result],
    );
    const attempt = mapExamAttempt(asRow(result.rows[0]?.data));
    revalidatePath(`/student/exams/[examId]/subjects/[candidateSubjectId]`, "page");
    return { ok: true, message: "Kết quả kịch bản đã được lưu.", data: { attempt } };
  } catch (error) {
    return actionError("Complete exam attempt item failed", error);
  }
}

export async function completeExamAttemptAction(attemptIdValue: string): Promise<ExamActionResult<{ attempt: ExamAttempt }>> {
  try {
    const profile = await requireStudent();
    const attemptId = validateUuid(attemptIdValue, "Mã lượt thi");
    const result = await queryDatabase<{ data: Row }>(
      "select public.complete_exam_attempt($1, $2) as data",
      [profile.id, attemptId],
    );
    const attempt = mapExamAttempt(asRow(result.rows[0]?.data));
    revalidatePath("/student/exams");
    revalidatePath(`/student/exams/[examId]/subjects/[candidateSubjectId]`, "page");
    return { ok: true, message: "Môn thi đã được hoàn tất. Điểm sẽ do giám khảo nhập.", data: { attempt } };
  } catch (error) {
    return actionError("Complete exam attempt failed", error);
  }
}

export interface CandidatePrintData {
  examName: string;
  decisionBasis: string;
  location: string;
  examDate: string;
  candidateName: string;
  candidateUnit: string;
  candidateEmail: string;
  examiners: { fullName: string; subjectName: string; position: number }[];
  subjects: {
    id: string;
    subjectName: string;
    paperTitle: string;
    officialScore: number | null;
    status: string;
    details: {
      moduleCode: string;
      scenarioTitle: string;
      checkpointsVisited?: number;
      checkpointsTotal?: number;
      hardwareCorrect?: number;
      hardwareTotal?: number;
      terminalCorrect?: number;
      terminalTotal?: number;
      studentAnswer?: {
        suspectedFault: string;
        reasoning: string;
        remediation: string;
      };
    }[];
  }[];
}

// Helpers local
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const relationRow = (v: unknown): Row =>
  Array.isArray(v) ? asRow(v[0]) : asRow(v);
const parseRows = (v: unknown): Row[] =>
  Array.isArray(v) ? v.map(asRow) : [];
const nullableNum = (v: unknown): number | null =>
  v === null || v === undefined ? null : typeof v === "number" ? v : Number(v) || 0;

export async function getExamCandidatePrintDataAction(
  candidateIdValue: string,
): Promise<ExamActionResult<CandidatePrintData>> {
  try {
    await requireAdmin();
    const candidateId = validateUuid(candidateIdValue, "Mã thí sinh");
    // 1. Lấy thông tin thí sinh và kỳ thi
    const candidateResult = await queryDatabase(
      `select c.id, c.full_name, c.work_unit, c.email, c.exam_id,
              jsonb_build_object(
                'name', e.name,
                'exam_date', e.exam_date,
                'location', e.location,
                'decision_basis', e.decision_basis
              ) as exams
       from public.exam_candidates c
       join public.exams e on e.id = c.exam_id
       where c.id = $1`,
      [candidateId],
    );
    const candidateRow = candidateResult.rows[0];
    if (!candidateRow) throw new ExamValidationError("Không tìm thấy thông tin thí sinh.");

    const candidate = asRow(candidateRow);
    const exam = asRow(candidate.exams);
    const examId = str(candidate.exam_id);

    // 2. Lấy danh sách giám khảo của kỳ thi
    const examinersResult = await queryDatabase(
      `select x.id, x.full_name, x.subject_id, x.position,
              jsonb_build_object('name', s.name) as exam_subjects
       from public.exam_examiners x
       join public.exam_subjects s on s.id = x.subject_id
       where x.exam_id = $1
       order by x.position`,
      [examId],
    );

    const examiners = parseRows(examinersResult.rows).map((ex) => ({
      fullName: str(ex.full_name),
      subjectName: str(relationRow(ex.exam_subjects).name),
      position: num(ex.position),
    }));

    // 3. Lấy danh sách môn thi của thí sinh
    const subjectsResult = await queryDatabase(
      `select cs.id, cs.subject_id, cs.exam_paper_id, cs.official_score,
              cs.examiner_comment, cs.status,
              jsonb_build_object('name', s.name) as exam_subjects,
              jsonb_build_object('title', p.title, 'paper_number', p.paper_number) as exam_papers
       from public.exam_candidate_subjects cs
       join public.exam_subjects s on s.id = cs.subject_id
       join public.exam_papers p on p.id = cs.exam_paper_id
       where cs.candidate_id = $1
       order by cs.created_at`,
      [candidateId],
    );

    const candidateSubjects = parseRows(subjectsResult.rows);
    const candidateSubjectIds = candidateSubjects.map((sub) => str(sub.id));

    // 4. Lấy attempts của thí sinh
    const attempts: Row[] = [];
    if (candidateSubjectIds.length > 0) {
      const attemptsResult = await queryDatabase(
        `select a.id, a.candidate_subject_id, a.status, a.started_at, a.submitted_at,
                coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'id', i.id,
                      'attempt_id', i.attempt_id,
                      'paper_scenario_id', i.paper_scenario_id,
                      'module_code', i.module_code,
                      'scenario_id', i.scenario_id,
                      'position', i.position,
                      'status', i.status,
                      'started_at', i.started_at,
                      'submitted_at', i.submitted_at,
                      'submission_ref', i.submission_ref,
                      'result_json', i.result_json,
                      'exam_scenario_catalog', jsonb_build_object('title', catalog.title)
                    ) order by i.position
                  )
                  from public.exam_attempt_items i
                  join public.exam_scenario_catalog catalog
                    on catalog.module_code = i.module_code and catalog.scenario_id = i.scenario_id
                  where i.attempt_id = a.id
                ), '[]'::jsonb) as exam_attempt_items
         from public.exam_attempts a
         where a.candidate_subject_id = any($1::uuid[])`,
        [candidateSubjectIds],
      );
      attempts.push(...parseRows(attemptsResult.rows));
    }

    // 5. Gom nhóm kịch bản và load kịch bản gốc
    const vorScenarioIds: string[] = [];
    const dmeScenarioIds: string[] = [];
    const adsbScenarioIds: string[] = [];

    attempts.forEach((attempt) => {
      const items = parseRows(attempt.exam_attempt_items);
      items.forEach((item) => {
        const mod = str(item.module_code);
        const scId = str(item.scenario_id);
        if (mod === "vor" && scId) vorScenarioIds.push(scId);
        if (mod === "dme" && scId) dmeScenarioIds.push(scId);
        if (mod === "ads-b" && scId) adsbScenarioIds.push(scId);
      });
    });

    const [vorScenariosRes, dmeScenariosRes, adsbScenariosRes] = await Promise.all([
      vorScenarioIds.length > 0
        ? queryDatabase("select * from public.vor_scenarios where id = any($1::text[])", [vorScenarioIds])
        : Promise.resolve({ rows: [] }),
      dmeScenarioIds.length > 0
        ? queryDatabase("select * from public.dme_scenarios where id = any($1::text[])", [dmeScenarioIds])
        : Promise.resolve({ rows: [] }),
      adsbScenarioIds.length > 0
        ? queryDatabase("select * from public.scenarios where id = any($1::text[])", [adsbScenarioIds])
        : Promise.resolve({ rows: [] }),
    ]);

    const vorScenariosMap = new Map(parseRows(vorScenariosRes.rows).map((r) => [str(r.id), mapRowToVorScenario(r)]));
    const dmeScenariosMap = new Map(parseRows(dmeScenariosRes.rows).map((r) => [str(r.id), mapRowToDmeScenario(r)]));
    const adsbScenariosMap = new Map(parseRows(adsbScenariosRes.rows).map((r) => [str(r.id), mapRowToScenario(r)]));

    // 6. Xây dựng cấu trúc kết quả in ấn
    const subjectsPrint = candidateSubjects.map((cSub) => {
      const cSubId = str(cSub.id);
      const attempt = attempts.find((att) => str(att.candidate_subject_id) === cSubId);
      const attemptItems = attempt ? parseRows(attempt.exam_attempt_items) : [];

      const details = attemptItems.map((item) => {
        const mod = str(item.module_code);
        const scId = str(item.scenario_id);
        const resultJson = item.result_json && typeof item.result_json === "object" ? (item.result_json as Record<string, unknown>) : null;
        const scenarioTitle = str(relationRow(item.exam_scenario_catalog).title) || "Kịch bản";

        if (mod === "vor" || mod === "dme") {
          const result = presentPmdtResult(resultJson);
          const scenario = mod === "vor" ? vorScenariosMap.get(scId) : dmeScenariosMap.get(scId);

          if (result && scenario) {
            const visitedViews = new Set(result.events.filter((e) => e.eventType === "view").map((e) => e.viewId));
            const checkpointsVisited = scenario.expectedCheckpoints.filter((cp) => visitedViews.has(cp.viewId)).length;
            const checkpointsTotal = scenario.expectedCheckpoints.length;

            let hardwareCorrect = 0;
            let hardwareTotal = 0;
            if (scenario.hardwareTask) {
              const expectedIds = scenario.hardwareTask.expectedComponentIds || [];
              const suspectedIds: string[] = result.hardwareAnswer?.selectedComponentIds || [];
              hardwareTotal = expectedIds.length;
              hardwareCorrect = suspectedIds.filter((id: string) => expectedIds.includes(id)).length;
            }

            return {
              moduleCode: mod,
              scenarioTitle,
              checkpointsVisited,
              checkpointsTotal,
              hardwareCorrect,
              hardwareTotal,
              studentAnswer: result.answer ? {
                suspectedFault: result.answer.suspectedFault || "",
                reasoning: result.answer.reasoning || "",
                remediation: result.answer.remediation || "",
              } : undefined,
            };
          }
        } else if (mod === "ads-b") {
          const result = presentAdsbResult(resultJson);
          const scenario = adsbScenariosMap.get(scId);

          if (result && scenario) {
            let terminalCorrect = 0;
            let terminalTotal = 0;
            if (scenario.expectedActions) {
              const expectedGradable = scenario.expectedActions.filter((a) => a.kind === "menu-selection" || a.kind === "value-input" || a.kind === "authentication");
              const submittedGradable = result.selectedActions.filter((a) => a.kind === "menu-selection" || a.kind === "value-input" || a.kind === "authentication");

              let correct = 0;
              let sIdx = 0;
              for (const exp of expectedGradable) {
                while (sIdx < submittedGradable.length) {
                  const sub = submittedGradable[sIdx];
                  sIdx++;
                  if (exp.kind === sub.kind && exp.input === sub.input && exp.menuId === sub.menuId) {
                    correct++;
                    break;
                  }
                }
              }
              terminalCorrect = correct;
              terminalTotal = expectedGradable.length;
            }

            let hardwareCorrect = 0;
            let hardwareTotal = 0;
            if (scenario.hardwareFault) {
              const expectedIds = scenario.hardwareFault.faultyComponentIds || [];
              const diagnosedIds = result.diagnosedComponentIds || [];
              hardwareTotal = expectedIds.length;
              hardwareCorrect = diagnosedIds.filter((id) => expectedIds.includes(id)).length;
            }

            return {
              moduleCode: mod,
              scenarioTitle,
              terminalCorrect,
              terminalTotal,
              hardwareCorrect,
              hardwareTotal,
            };
          }
        }

        return {
          moduleCode: mod,
          scenarioTitle,
        };
      });

      return {
        id: cSubId,
        subjectName: str(relationRow(cSub.exam_subjects).name),
        paperTitle: str(relationRow(cSub.exam_papers).title),
        officialScore: nullableNum(cSub.official_score),
        status: str(cSub.status),
        details,
      };
    });

    const printData: CandidatePrintData = {
      examName: str(exam.name),
      decisionBasis: str(exam.decision_basis),
      location: str(exam.location),
      examDate: str(exam.exam_date),
      candidateName: str(candidate.full_name),
      candidateUnit: str(candidate.work_unit),
      candidateEmail: str(candidate.email),
      examiners,
      subjects: subjectsPrint,
    };

    return { ok: true, message: "Tải dữ liệu in thành công.", data: printData };
  } catch (error) {
    return actionError("Get candidate print data failed", error);
  }
}
