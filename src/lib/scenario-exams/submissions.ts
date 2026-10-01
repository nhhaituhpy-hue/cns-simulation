import "server-only";

import type { PoolClient } from "pg";
import { getCurrentProfile } from "@/lib/auth/profile";
import { withDatabaseTransaction } from "@/lib/db";
import { getScenarioExamSessionToken, hashScenarioExamSessionToken } from "./session";
import { parseCandidateScenarioExamResult } from "./results";
import { ScenarioExamValidationError, validateScenarioExamUuid } from "./validation";
import { evaluateScenarioExamResult } from "./evaluation";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";

interface LockedSession {
  id: string;
  code_id: string;
  exam_id: string;
  status: string;
  code_status: string;
  deadline_at: string;
}

interface LockedItem {
  id: string;
  code_subject_id: string;
  module_id: string;
  scenario_id: string;
  library_revision_number: number;
  status: string;
  subject_status: string;
  result_json: unknown;
  definition_snapshot_json: unknown;
}

async function candidateIdentity() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "student") throw new ScenarioExamValidationError("Bạn cần đăng nhập tài khoản Thí sinh.");
  const token = await getScenarioExamSessionToken();
  if (!token) throw new ScenarioExamValidationError("Không tìm thấy phiên thi hợp lệ. Vui lòng liên hệ giám khảo.");
  return { userId: profile.id, tokenHash: hashScenarioExamSessionToken(token) };
}

async function lockSession(client: PoolClient, tokenHash: string): Promise<LockedSession> {
  const result = await client.query<LockedSession>(
    `select s.id, s.code_id, c.exam_id, s.status, c.status as code_status, s.deadline_at
       from public.scenario_exam_sessions s
       join public.scenario_exam_codes c on c.id = s.code_id
      where s.session_token_hash = $1
      for update of s, c`, [tokenHash],
  );
  const session = result.rows[0];
  if (!session) throw new ScenarioExamValidationError("Không tìm thấy phiên thi hiện tại.");
  if (session.code_status === "revoked" || session.status === "revoked") throw new ScenarioExamValidationError("Mã hoặc phiên thi đã bị thu hồi.");
  return session;
}

function requireActiveSession(session: LockedSession) {
  if (session.status !== "in_progress" || session.code_status !== "in_progress") throw new ScenarioExamValidationError("Phiên thi đã kết thúc.");
  if (new Date(session.deadline_at).getTime() <= Date.now()) throw new ScenarioExamValidationError("Phiên thi đã hết thời gian.");
}

function validItemResult(item: LockedItem, input: unknown) {
  const result = parseCandidateScenarioExamResult(input);
  if (!result || result.sessionItemId !== item.id || result.moduleId !== item.module_id
    || result.scenarioId !== item.scenario_id || result.revision !== item.library_revision_number) {
    throw new ScenarioExamValidationError("Dữ liệu bài làm không khớp với Scenario đã cấp hoặc không hợp lệ.");
  }
  return result;
}

async function recordItemSubmission(client: PoolClient, session: LockedSession, item: LockedItem, userId: string) {
  await client.query("update public.scenario_exam_session_items set status = 'submitted', submitted_at = now(), updated_at = now() where id = $1", [item.id]);
  await client.query("update public.scenario_exam_code_subjects set status = 'submitted', submitted_at = now(), updated_at = now() where id = $1", [item.code_subject_id]);
  await client.query(
    `insert into public.scenario_exam_audit_events (exam_id, code_id, session_id, actor_user_id, event_type, event_json)
     values ($1, $2, $3, $4, 'item_submitted', jsonb_build_object('itemId', $5::text, 'moduleId', $6::text))`,
    [session.exam_id, session.code_id, session.id, userId, item.id, item.module_id],
  );
}

export async function saveCandidateScenarioExamItem(itemIdValue: unknown, input: unknown, submit: boolean) {
  const identity = await candidateIdentity();
  const itemId = validateScenarioExamUuid(itemIdValue, "Mã bài thi");
  return withDatabaseTransaction(async (client) => {
    const session = await lockSession(client, identity.tokenHash);
    const itemResult = await client.query<LockedItem>(
      `select item.id, item.code_subject_id, item.module_id, item.scenario_id,
              item.library_revision_number, item.status, cs.status as subject_status, item.result_json, item.definition_snapshot_json
         from public.scenario_exam_session_items item
         join public.scenario_exam_code_subjects cs on cs.id = item.code_subject_id
        where item.id = $1 and item.session_id = $2 and cs.code_id = $3 and cs.module_id = item.module_id
        for update of item, cs`, [itemId, session.id, session.code_id],
    );
    const item = itemResult.rows[0];
    if (!item) throw new ScenarioExamValidationError("Bài làm không thuộc phiên thi hiện tại.");
    // A retry after a successful submit cannot rewrite the frozen evidence.
    if (submit && item.status === "submitted" && item.subject_status === "submitted") return { id: item.id, examId: session.exam_id };
    requireActiveSession(session);
    if (item.status !== "in_progress" || item.subject_status !== "in_progress") throw new ScenarioExamValidationError("Môn thi đã kết thúc, không thể sửa bài làm.");
    const result = validItemResult(item, input);
    const technicalSummary = evaluateScenarioExamResult(item.module_id as ScenarioParametersModuleId, item.definition_snapshot_json, result.payload);
    await client.query(
      `update public.scenario_exam_session_items
          set result_json = $2, result_summary_json = $3, updated_at = now()
        where id = $1`, [item.id, result, { ...technicalSummary, savedAt: new Date().toISOString() }],
    );
    await client.query("update public.scenario_exam_sessions set last_seen_at = now(), updated_at = now() where id = $1", [session.id]);
    if (submit) await recordItemSubmission(client, session, item, identity.userId);
    return { id: item.id, examId: session.exam_id };
  });
}

/** Finalize all selected subjects together after their evidence has been saved. */
export async function submitCandidateScenarioExamSession() {
  const identity = await candidateIdentity();
  return withDatabaseTransaction(async (client) => {
    const session = await lockSession(client, identity.tokenHash);
    if (session.status === "submitted") return { id: session.id, examId: session.exam_id };
    requireActiveSession(session);
    const subjects = await client.query<{ id: string; status: string }>(
      "select id, status from public.scenario_exam_code_subjects where code_id = $1 order by position for update", [session.code_id],
    );
    if (!subjects.rows.length || subjects.rows.some((subject) => subject.status === "not_started")) {
      throw new ScenarioExamValidationError("Bạn cần bắt đầu và lưu bài làm của tất cả các môn trước khi kết thúc phiên.");
    }
    const items = await client.query<LockedItem>(
      `select item.id, item.code_subject_id, item.module_id, item.scenario_id,
              item.library_revision_number, item.status, cs.status as subject_status, item.result_json
         from public.scenario_exam_session_items item
         join public.scenario_exam_code_subjects cs on cs.id = item.code_subject_id and cs.code_id = $2 and cs.module_id = item.module_id
        where item.session_id = $1 order by item.id for update of item`, [session.id, session.code_id],
    );
    if (items.rows.length !== subjects.rows.length) throw new ScenarioExamValidationError("Phiên thi chưa đủ bài làm của các môn được cấp.");
    // Validate every result before changing any status; one missing draft aborts the whole transaction.
    for (const item of items.rows) {
      if ((item.status !== "in_progress" && item.status !== "submitted") || item.subject_status !== item.status) throw new ScenarioExamValidationError("Một môn thi đã kết thúc hoặc có trạng thái không hợp lệ trước khi nộp phiên.");
      if (!item.result_json) throw new ScenarioExamValidationError("Có môn chưa lưu bài làm. Hãy mở lại môn đó và bấm Lưu bài làm hoặc Nộp môn.");
      validItemResult(item, item.result_json);
    }
    for (const item of items.rows) if (item.status !== "submitted") await recordItemSubmission(client, session, item, identity.userId);
    await client.query("update public.scenario_exam_sessions set status = 'submitted', submitted_at = now(), terminal_reason = 'submitted', last_seen_at = now(), updated_at = now() where id = $1", [session.id]);
    await client.query("update public.scenario_exam_codes set status = 'submitted', terminal_at = now(), updated_at = now() where id = $1", [session.code_id]);
    await client.query(
      `insert into public.scenario_exam_audit_events (exam_id, code_id, session_id, actor_user_id, event_type, event_json)
       values ($1, $2, $3, $4, 'session_submitted', jsonb_build_object('itemCount', $5::int))`,
      [session.exam_id, session.code_id, session.id, identity.userId, items.rows.length],
    );
    return { id: session.id, examId: session.exam_id };
  });
}
