import "server-only";

import { getCurrentProfile } from "@/lib/auth/profile";
import { withDatabaseTransaction } from "@/lib/db";
import { parseCandidateScenarioExamResult } from "./results";
import { ScenarioExamValidationError, validateScenarioExamReviewInput } from "./validation";

export async function saveScenarioExamReview(input: unknown) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") throw new ScenarioExamValidationError("Bạn không có quyền chấm kỳ thi Scenario.");
  const parsed = validateScenarioExamReviewInput(input);
  return withDatabaseTransaction(async (client) => {
    const itemResult = await client.query<{
      id: string; status: string; session_id: string; module_id: string; scenario_id: string;
      library_revision_number: number; result_json: unknown;
    }>(
      `select item.id, item.status, item.session_id, item.module_id,
              item.scenario_id, item.library_revision_number, item.result_json
         from public.scenario_exam_session_items item
         join public.scenario_exam_sessions s on s.id = item.session_id
         join public.scenario_exam_codes c on c.id = s.code_id
         join public.scenario_exam_code_subjects cs on cs.id = item.code_subject_id and cs.code_id = c.id and cs.module_id = item.module_id
        where c.exam_id = $1 and c.id = $2 and item.id = $3
        for update of item`, [parsed.examId, parsed.codeId, parsed.itemId],
    );
    const item = itemResult.rows[0];
    if (!item) throw new ScenarioExamValidationError("Không tìm thấy bài làm trong mã thí sinh và kỳ thi này.");
    if (item.status !== "submitted" && item.status !== "timed_out") throw new ScenarioExamValidationError("Chỉ chấm điểm sau khi môn thi đã nộp hoặc kết thúc.");
    const result = parseCandidateScenarioExamResult(item.result_json);
    if (!result || result.sessionItemId !== item.id || result.moduleId !== item.module_id
      || result.scenarioId !== item.scenario_id || result.revision !== item.library_revision_number) {
      throw new ScenarioExamValidationError("Bài làm chưa có dữ liệu nộp hợp lệ để chấm điểm.");
    }
    await client.query(
      `update public.scenario_exam_session_items set examiner_score = $2, examiner_comment = $3,
              reviewed_by = $4, reviewed_at = now(), updated_at = now() where id = $1`,
      [item.id, parsed.score, parsed.comment, profile.id],
    );
    await client.query(
      `insert into public.scenario_exam_audit_events (exam_id, code_id, session_id, actor_user_id, event_type, event_json)
       values ($1, $2, $3, $4, 'review_updated', jsonb_build_object('itemId', $5::text, 'score', $6::numeric))`,
      [parsed.examId, parsed.codeId, item.session_id, profile.id, item.id, parsed.score],
    );
    return { ...parsed };
  });
}
