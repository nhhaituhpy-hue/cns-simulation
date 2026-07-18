"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { mapExamAttempt } from "./queries";
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
    await requireAdmin();
    const parsed = validateExamSetInput(input);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("save_exam_set", {
      p_exam_set_id: parsed.id ?? null,
      p_name: parsed.name,
      p_description: parsed.description ?? "",
      p_subjects: parsed.subjects,
      p_finalize: finalize === true,
    });
    if (error) throw error;
    const id = validateUuid(data, "Mã bộ đề");
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
    const supabase = await createClient();
    const { data: activeExams, error: activeError } = await supabase
      .from("exams")
      .select("id")
      .eq("exam_set_id", id)
      .neq("status", "archived")
      .limit(1);
    if (activeError) throw activeError;
    if ((activeExams ?? []).length > 0) {
      return { ok: false, message: "Bộ đề đang được một kỳ thi sử dụng nên chưa thể lưu trữ." };
    }
    const { error } = await supabase.from("exam_sets").update({ status: "archived" }).eq("id", id);
    if (error) throw error;
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
    const supabase = await createClient();
    let id = parsed.id;

    if (id) {
      const { data: existing, error: existingError } = await supabase
        .from("exams")
        .select("exam_set_id")
        .eq("id", id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return { ok: false, message: "Không tìm thấy kỳ thi." };
      if (existing.exam_set_id !== parsed.examSetId) {
        return { ok: false, message: "Không thể đổi bộ đề của kỳ thi đã tạo." };
      }
      const { error } = await supabase
        .from("exams")
        .update({
          name: parsed.name,
          exam_date: parsed.examDate,
          location: parsed.location,
          decision_basis: parsed.decisionBasis,
        })
        .eq("id", id);
      if (error) throw error;
    } else {
      const { data: examSet, error: setError } = await supabase
        .from("exam_sets")
        .select("status")
        .eq("id", parsed.examSetId)
        .maybeSingle();
      if (setError) throw setError;
      if (examSet?.status !== "ready") return { ok: false, message: "Bộ đề chưa hoàn thiện hoặc đã lưu trữ." };
      const { data, error } = await supabase
        .from("exams")
        .insert({
          name: parsed.name,
          exam_date: parsed.examDate,
          location: parsed.location,
          decision_basis: parsed.decisionBasis,
          exam_set_id: parsed.examSetId,
          status: "open",
          created_by: profile.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      id = data.id;
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
    const supabase = await createClient();
    const { error } = await supabase.from("exams").update({ status }).eq("id", id);
    if (error) throw error;
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
    const supabase = await createClient();
    const { data: activeAttempts, error: attemptError } = await supabase
      .from("exam_attempts")
      .select("id,exam_candidate_subjects!inner(exam_id)")
      .eq("status", "in_progress")
      .eq("exam_candidate_subjects.exam_id", id)
      .limit(1);
    if (attemptError) throw attemptError;
    if ((activeAttempts ?? []).length > 0) {
      return { ok: false, message: "Kỳ thi còn lượt đang thực hiện. Hãy khóa thay vì lưu trữ để thí sinh có thể nộp bài." };
    }
    const { error } = await supabase.from("exams").update({ status: "archived" }).eq("id", id);
    if (error) throw error;
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
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_exam_examiners", {
    p_exam_id: examId,
    p_examiners: examiners,
  });
  if (error) throw error;
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
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_exam_candidate", {
    p_candidate_id: candidate.id ?? null,
    p_exam_id: candidate.examId,
    p_full_name: candidate.fullName,
    p_work_unit: candidate.workUnit,
    p_email: candidate.email,
    p_subjects: candidate.subjects,
  });
  if (error) throw error;
  const id = validateUuid(data, "Mã thí sinh");
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
    const supabase = await createClient();
    const { data: candidate, error: candidateError } = await supabase.from("exam_candidates").select("exam_id").eq("id", id).maybeSingle();
    if (candidateError) throw candidateError;
    if (!candidate) return { ok: false, message: "Không tìm thấy thí sinh." };
    const { data: assignments, error: assignmentError } = await supabase.from("exam_candidate_subjects").select("id").eq("candidate_id", id);
    if (assignmentError) throw assignmentError;
    const assignmentIds = (assignments ?? []).map((item) => item.id);
    if (assignmentIds.length > 0) {
      const { data: attempts, error: attemptError } = await supabase.from("exam_attempts").select("id").in("candidate_subject_id", assignmentIds).limit(1);
      if (attemptError) throw attemptError;
      if ((attempts ?? []).length > 0) return { ok: false, message: "Thí sinh đã bắt đầu thi nên dữ liệu phải được bảo toàn." };
    }
    const { error } = await supabase.from("exam_candidates").delete().eq("id", id);
    if (error) throw error;
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
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("save_candidate_result", {
      p_candidate_subject_id: parsed.candidateSubjectId,
      p_official_score: parsed.officialScore,
      p_examiner_comment: parsed.examinerComment ?? "",
    });
    if (error) throw error;
    refreshExamPaths(validateUuid(data, "Mã kỳ thi"));
    return { ok: true, message: "Kết quả chính thức do giám khảo nhập đã được lưu." };
  } catch (error) {
    return actionError("Save candidate result failed", error);
  }
}

export async function startExamAttemptAction(candidateSubjectIdValue: string): Promise<ExamActionResult<{ attempt: ExamAttempt }>> {
  try {
    await requireStudent();
    const candidateSubjectId = validateUuid(candidateSubjectIdValue, "Mã môn thi");
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("start_exam_attempt", { p_candidate_subject_id: candidateSubjectId });
    if (error) throw error;
    const attempt = mapExamAttempt(asRow(data));
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
    await requireStudent();
    const attemptItemId = validateUuid(attemptItemIdValue, "Mã kịch bản thi");
    const parsed = validateCompleteAttemptItemInput(input);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("complete_exam_attempt_item", {
      p_attempt_item_id: attemptItemId,
      p_submission_ref: parsed.submissionRef ?? null,
      p_result_json: parsed.result,
    });
    if (error) throw error;
    const attempt = mapExamAttempt(asRow(data));
    revalidatePath(`/student/exams/[examId]/subjects/[candidateSubjectId]`, "page");
    return { ok: true, message: "Kết quả kịch bản đã được lưu.", data: { attempt } };
  } catch (error) {
    return actionError("Complete exam attempt item failed", error);
  }
}

export async function completeExamAttemptAction(attemptIdValue: string): Promise<ExamActionResult<{ attempt: ExamAttempt }>> {
  try {
    await requireStudent();
    const attemptId = validateUuid(attemptIdValue, "Mã lượt thi");
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("complete_exam_attempt", { p_attempt_id: attemptId });
    if (error) throw error;
    const attempt = mapExamAttempt(asRow(data));
    revalidatePath("/student/exams");
    revalidatePath(`/student/exams/[examId]/subjects/[candidateSubjectId]`, "page");
    return { ok: true, message: "Môn thi đã được hoàn tất. Điểm sẽ do giám khảo nhập.", data: { attempt } };
  } catch (error) {
    return actionError("Complete exam attempt failed", error);
  }
}
