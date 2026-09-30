"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { withDatabaseTransaction } from "@/lib/db";
import { generateScenarioExamCode, hashScenarioExamCode } from "./codes";
import { createScenarioExamSessionToken, hashScenarioExamSessionToken, setScenarioExamSessionCookie } from "./session";
import { getScenarioExamSessionToken } from "./session";
import {
  ScenarioExamValidationError,
  validateIssueScenarioExamCodeInput,
  validateScenarioExamInput,
  validateScenarioExamStatus,
  validateScenarioExamUuid,
} from "./validation";

export interface ScenarioExamActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new ScenarioExamValidationError("Bạn không có quyền quản lý kỳ thi Scenario.");
  }
  return profile;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Không thể xử lý kỳ thi Scenario.";
}

export async function createScenarioExamAction(
  input: unknown,
): Promise<ScenarioExamActionResult<{ id: string }>> {
  try {
    const profile = await requireAdmin();
    const parsed = validateScenarioExamInput(input);
    const data = await withDatabaseTransaction(async (client) => {
      const result = await client.query<{ id: string }>(
        `insert into public.scenario_exams
           (name, description, opens_at, closes_at, duration_minutes, status, created_by)
         values ($1, $2, $3, $4, $5, 'draft', $6)
         returning id`,
        [parsed.name, parsed.description, parsed.opensAt, parsed.closesAt, parsed.durationMinutes, profile.id],
      );
      const id = result.rows[0]?.id;
      if (!id) throw new Error("Không tạo được mã kỳ thi Scenario.");
      await client.query(
        `insert into public.scenario_exam_audit_events (exam_id, actor_user_id, event_type, event_json)
         values ($1, $2, 'exam_created', jsonb_build_object('name', $3))`,
        [id, profile.id, parsed.name],
      );
      return { id };
    });
    revalidatePath("/admin/exams");
    return { ok: true, message: "Kỳ thi Scenario đã được tạo ở trạng thái nháp.", data };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function setScenarioExamStatusAction(
  examIdValue: unknown,
  statusValue: unknown,
): Promise<ScenarioExamActionResult> {
  try {
    const profile = await requireAdmin();
    const examId = validateScenarioExamInput({
      name: "Temporary name for validation",
      durationMinutes: 1,
      id: examIdValue,
    }).id!;
    const status = validateScenarioExamStatus(statusValue);
    await withDatabaseTransaction(async (client) => {
      const result = await client.query(
        `update public.scenario_exams
            set status = $2
          where id = $1
          returning id`,
        [examId, status],
      );
      if (result.rowCount !== 1) throw new Error("Không tìm thấy kỳ thi Scenario.");
      await client.query(
        `insert into public.scenario_exam_audit_events (exam_id, actor_user_id, event_type)
         values ($1, $2, $3)`,
        [examId, profile.id, status === "open" ? "exam_opened" : status === "locked" ? "exam_locked" : "exam_closed"],
      );
    });
    revalidatePath("/admin/exams");
    revalidatePath(`/admin/exams/${examId}`);
    return { ok: true, message: "Trạng thái kỳ thi đã được cập nhật." };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function issueScenarioExamCodeAction(
  input: unknown,
): Promise<ScenarioExamActionResult<{ id: string; code: string; codeHint: string }>> {
  try {
    const profile = await requireAdmin();
    const parsed = validateIssueScenarioExamCodeInput(input);
    const generated = generateScenarioExamCode();
    const data = await withDatabaseTransaction(async (client) => {
      const examResult = await client.query<{ status: string; duration_minutes: number }>(
        `select status, duration_minutes
           from public.scenario_exams
          where id = $1
          for update`,
        [parsed.examId],
      );
      const exam = examResult.rows[0];
      if (!exam) throw new Error("Không tìm thấy kỳ thi Scenario.");
      if (exam.status !== "open") throw new Error("Kỳ thi chưa ở trạng thái mở để cấp mã.");

      for (const moduleId of parsed.moduleIds) {
        const pool = await client.query(
          `select 1
             from public.simulator_scenario_library_memberships
            where module_id = $1
              and library_kind = 'exam'
              and archived_at is null
            limit 1`,
          [moduleId],
        );
        if (pool.rowCount !== 1) {
          throw new Error(`Module ${moduleId} chưa có scenario active trong thư viện Kiểm tra.`);
        }
      }

      const codeResult = await client.query<{ id: string }>(
        `insert into public.scenario_exam_codes
           (exam_id, code_hash, code_hint, candidate_name, candidate_unit, created_by)
         values ($1, $2, $3, $4, $5, $6)
         returning id`,
        [parsed.examId, generated.hash, generated.hint, parsed.candidateName, parsed.candidateUnit, profile.id],
      );
      const codeId = codeResult.rows[0]?.id;
      if (!codeId) throw new Error("Không tạo được mã thí sinh.");

      for (const [index, moduleId] of parsed.moduleIds.entries()) {
        await client.query(
          `insert into public.scenario_exam_code_subjects (code_id, module_id, position)
           values ($1, $2, $3)`,
          [codeId, moduleId, index + 1],
        );
      }
      await client.query(
        `insert into public.scenario_exam_audit_events (exam_id, code_id, actor_user_id, event_type, event_json)
         values ($1, $2, $3, 'code_issued', jsonb_build_object('moduleIds', $4::jsonb))`,
        [parsed.examId, codeId, profile.id, JSON.stringify(parsed.moduleIds)],
      );
      return { id: codeId, code: generated.value, codeHint: generated.hint };
    });
    revalidatePath(`/admin/exams/${parsed.examId}`);
    return { ok: true, message: "Mã thí sinh đã được tạo. Hãy lưu mã này ngay.", data };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function redeemScenarioExamCodeAction(
  examIdValue: unknown,
  codeValue: unknown,
): Promise<ScenarioExamActionResult<{ sessionId: string }>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "student") throw new ScenarioExamValidationError("Bạn cần đăng nhập tài khoản Thí sinh.");
    const examId = typeof examIdValue === "string" ? examIdValue.trim() : "";
    const code = typeof codeValue === "string" ? codeValue : "";
    if (!examId || !code) throw new ScenarioExamValidationError("Vui lòng chọn kỳ thi và nhập mã code.");
    const token = createScenarioExamSessionToken();

    const data = await withDatabaseTransaction(async (client) => {
      const examResult = await client.query<{ id: string; duration_minutes: number; closes_at: string | null }>(
        `select id, duration_minutes, closes_at
           from public.scenario_exams
          where id = $1 and status = 'open'
            and (opens_at is null or opens_at <= now())
            and (closes_at is null or closes_at > now())
          for share`,
        [examId],
      );
      const exam = examResult.rows[0];
      if (!exam) throw new Error("Kỳ thi không mở hoặc đã hết thời gian.");
      const normalizedHash = hashScenarioExamCode(code);
      const codeResult = await client.query<{ id: string; candidate_name: string; candidate_unit: string }>(
        `select id, candidate_name, candidate_unit
           from public.scenario_exam_codes
          where exam_id = $1 and code_hash = $2 and status = 'issued'
          for update`,
        [examId, normalizedHash],
      );
      const candidateCode = codeResult.rows[0];
      if (!candidateCode) throw new Error("Mã code không đúng hoặc đã được sử dụng.");
      const startedAt = new Date();
      const configuredDeadline = new Date(startedAt.getTime() + exam.duration_minutes * 60_000);
      const deadlineAt = exam.closes_at && new Date(exam.closes_at).getTime() < configuredDeadline.getTime()
        ? new Date(exam.closes_at)
        : configuredDeadline;
      const sessionResult = await client.query<{ id: string }>(
        `insert into public.scenario_exam_sessions
           (code_id, candidate_user_id, session_token_hash, status, started_at, deadline_at)
         values ($1, $2, $3, 'in_progress', $4, $5)
         returning id`,
        [candidateCode.id, profile.id, token.hash, startedAt, deadlineAt],
      );
      const sessionId = sessionResult.rows[0]?.id;
      if (!sessionId) throw new Error("Không tạo được phiên thi.");
      await client.query(
        `update public.scenario_exam_codes
            set status = 'in_progress', redeemed_at = now()
          where id = $1`,
        [candidateCode.id],
      );
      await client.query(
        `insert into public.scenario_exam_audit_events (exam_id, code_id, session_id, actor_user_id, event_type)
         values ($1, $2, $3, $4, 'code_redeemed')`,
        [examId, candidateCode.id, sessionId, profile.id],
      );
      return { sessionId, deadlineAt };
    });
    await setScenarioExamSessionCookie(token.value, data.deadlineAt);
    return { ok: true, message: "Mã hợp lệ. Phiên thi đã được tạo.", data: { sessionId: data.sessionId } };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function startScenarioExamSubjectAction(
  subjectIdValue: unknown,
): Promise<ScenarioExamActionResult<{ id: string; moduleId: string; scenarioName: string }>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "student") throw new ScenarioExamValidationError("Bạn cần đăng nhập tài khoản Thí sinh.");
    const subjectId = validateScenarioExamUuid(subjectIdValue, "Mã môn thi");
    const token = await getScenarioExamSessionToken();
    if (!token) throw new Error("Phiên thi đã hết hạn. Hãy nhập lại mã code.");
    const sessionHash = hashScenarioExamSessionToken(token);

    const data = await withDatabaseTransaction(async (client) => {
      const subjectResult = await client.query<{
        session_id: string;
        session_status: string;
        deadline_at: string;
        exam_id: string;
        module_id: string;
        subject_status: string;
        item_id: string | null;
        scenario_name: string | null;
      }>(
        `select s.id as session_id, s.status as session_status, s.deadline_at,
                c.exam_id, cs.module_id, cs.status as subject_status,
                item.id as item_id, item.scenario_name
           from public.scenario_exam_sessions s
           join public.scenario_exam_codes c on c.id = s.code_id
           join public.scenario_exam_code_subjects cs on cs.code_id = c.id
           left join public.scenario_exam_session_items item
             on item.session_id = s.id and item.code_subject_id = cs.id
          where s.session_token_hash = $1 and cs.id = $2
          for update`,
        [sessionHash, subjectId],
      );
      const subject = subjectResult.rows[0];
      if (!subject) throw new Error("Không tìm thấy môn thi trong phiên hiện tại.");
      if (subject.item_id) {
        return { id: subject.item_id, moduleId: subject.module_id, scenarioName: subject.scenario_name ?? "Scenario đã được cấp" };
      }
      if (subject.session_status !== "in_progress") throw new Error("Phiên thi đã kết thúc.");
      if (new Date(subject.deadline_at).getTime() <= Date.now()) throw new Error("Phiên thi đã hết thời gian.");
      if (subject.subject_status !== "not_started") throw new Error("Môn thi không còn ở trạng thái có thể bắt đầu.");

      const membershipResult = await client.query<{
        id: string;
        revision_number: number;
        scenario_id: string;
        name: string;
        definition_json: Record<string, unknown>;
      }>(
        `select id, revision_number, scenario_id, name, definition_json
           from public.simulator_scenario_library_memberships
          where module_id = $1
            and library_kind = 'exam'
            and archived_at is null
          order by random()
          limit 1
          for share`,
        [subject.module_id],
      );
      const membership = membershipResult.rows[0];
      if (!membership) throw new Error("Môn thi chưa có scenario trong thư viện Kiểm tra.");
      const itemResult = await client.query<{ id: string }>(
        `insert into public.scenario_exam_session_items
           (session_id, code_subject_id, module_id, library_membership_id,
            library_revision_number, scenario_id, scenario_name,
            definition_snapshot_json, engine_version, evaluator_version)
         values ($1, $2, $3, $4, $5, $6, $7, $8, 'scenario-engine-v1', 'scenario-evaluator-v1')
         returning id`,
        [subject.session_id, subjectId, subject.module_id, membership.id, membership.revision_number, membership.scenario_id, membership.name, membership.definition_json],
      );
      const itemId = itemResult.rows[0]?.id;
      if (!itemId) throw new Error("Không tạo được bài scenario trong phiên.");
      await client.query("update public.scenario_exam_code_subjects set status = 'in_progress', started_at = now() where id = $1", [subjectId]);
      await client.query(
        `insert into public.scenario_exam_audit_events (exam_id, code_id, session_id, actor_user_id, event_type, event_json)
         values ($1, (select code_id from public.scenario_exam_sessions where id = $2), $2, $3, 'scenario_assigned', jsonb_build_object('moduleId', $4, 'scenarioId', $5))`,
        [subject.exam_id, subject.session_id, profile.id, subject.module_id, membership.scenario_id],
      );
      return { id: itemId, moduleId: subject.module_id, scenarioName: membership.name };
    });
    return { ok: true, message: "Scenario đã được cố định cho môn thi.", data };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
