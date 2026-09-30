"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { withDatabaseTransaction } from "@/lib/db";
import { generateScenarioExamCode } from "./codes";
import {
  ScenarioExamValidationError,
  validateIssueScenarioExamCodeInput,
  validateScenarioExamInput,
  validateScenarioExamStatus,
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
