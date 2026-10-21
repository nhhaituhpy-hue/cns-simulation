import "server-only";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { queryDatabase } from "@/lib/db";
import { isScenarioParametersModuleId, parseScenarioParameters, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { isRecord, parseCandidateScenarioExamResult, sanitizeScenarioExamPayload } from "@/lib/scenario-exams/results";
import { DEFAULT_SCENARIOS } from "@/stores/default-scenarios";
import { assertSafeJson } from "../scenario-authoring/forms/helpers";
import { generateAttemptAiFeedback } from "./attempt-feedback";

const json = (value: unknown, status = 200) =>
  NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store" } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validOrigin(request: Request): boolean {
  const expected = process.env.CNS_PUBLIC_ORIGIN || new URL(request.url).origin;
  return request.headers.get("origin") === expected && request.headers.get("sec-fetch-site") !== "cross-site";
}

async function readBoundedJson(request: Request, maxBytes = 500_000): Promise<Record<string, unknown> | null> {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") ?? "")) return null;
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > maxBytes)) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    assertSafeJson(parsed);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function resolvePracticeDefinition(
  moduleId: ScenarioParametersModuleId,
  scenarioId: string,
  role: string,
): Promise<unknown | null> {
  const practiceRow = await queryDatabase<{ definition_json: unknown }>(
    `select definition_json
       from public.simulator_scenario_library_memberships
      where module_id = $1
        and library_kind = 'practice'
        and archived_at is null
        and (scenario_parameters_id::text = $2 or scenario_id = $2)
      order by published_at desc
      limit 1`,
    [moduleId, scenarioId],
  );
  if (practiceRow.rows[0]?.definition_json) {
    return practiceRow.rows[0].definition_json;
  }
  if (moduleId === "ads-b") {
    const seed = DEFAULT_SCENARIOS.find(s => s.id === scenarioId);
    if (seed) {
      const parsed = parseScenarioParameters("ads-b", seed);
      if (parsed) return parsed;
    }
  }
  if (role === "admin") {
    const sourceRow = await queryDatabase<{ definition_json: unknown }>(
      `select definition_json
         from public.simulator_scenario_parameters
        where module_id = $1
          and archived_at is null
          and (id::text = $2 or scenario_id = $2)
        order by updated_at desc
        limit 1`,
      [moduleId, scenarioId],
    );
    if (sourceRow.rows[0]?.definition_json) {
      return sourceRow.rows[0].definition_json;
    }
  }
  return null;
}

export async function practiceFeedbackResponse(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return json({ error: "Chưa đăng nhập.", code: "UNAUTHORIZED" }, 401);
  if (!validOrigin(request)) return json({ error: "Nguồn yêu cầu không hợp lệ.", code: "INVALID_ORIGIN" }, 403);

  const body = await readBoundedJson(request, 500_000);
  if (!body || Object.keys(body).some(k => !["moduleId", "scenarioId", "payload"].includes(k))) {
    return json({ error: "Thông tin yêu cầu không hợp lệ.", code: "INVALID_INPUT" }, 400);
  }
  const moduleId = typeof body.moduleId === "string" ? body.moduleId.trim() : "";
  const scenarioId = typeof body.scenarioId === "string" ? body.scenarioId.trim() : "";
  if (!isScenarioParametersModuleId(moduleId) || !scenarioId || scenarioId.length > 200 || (body.payload !== null && !isRecord(body.payload))) {
    return json({ error: "Thông tin kịch bản hoặc dữ liệu bài làm không hợp lệ.", code: "INVALID_INPUT" }, 400);
  }

  try {
    const definitionJson = await resolvePracticeDefinition(moduleId, scenarioId, profile.role);
    if (!definitionJson) {
      return json({ error: "Không tìm thấy kịch bản trong danh mục ôn tập.", code: "NOT_FOUND" }, 404);
    }
    const payload = body.payload ? (sanitizeScenarioExamPayload(body.payload) as Record<string, unknown>) : null;
    const feedback = await generateAttemptAiFeedback({
      moduleId,
      definition: definitionJson,
      payload,
      mode: "practice",
    });
    return json({ feedback });
  } catch {
    return json({ error: "Không thể phân tích bài làm ôn tập lúc này. Vui lòng thử lại.", code: "FEEDBACK_UNAVAILABLE" }, 503);
  }
}

export async function examReviewFeedbackResponse(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return json({ error: "Chưa đăng nhập.", code: "UNAUTHORIZED" }, 401);
  if (profile.role !== "admin") return json({ error: "Chỉ giám khảo mới có quyền sử dụng gợi ý nhận xét bài thi.", code: "FORBIDDEN" }, 403);
  if (!validOrigin(request)) return json({ error: "Nguồn yêu cầu không hợp lệ.", code: "INVALID_ORIGIN" }, 403);

  const body = await readBoundedJson(request, 32_768);
  if (!body || Object.keys(body).some(k => !["examId", "codeId", "itemId"].includes(k))) {
    return json({ error: "Thông tin yêu cầu không hợp lệ.", code: "INVALID_INPUT" }, 400);
  }
  const examId = typeof body.examId === "string" ? body.examId.trim() : "";
  const codeId = typeof body.codeId === "string" ? body.codeId.trim() : "";
  const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
  if (!UUID_RE.test(examId) || !UUID_RE.test(codeId) || !UUID_RE.test(itemId)) {
    return json({ error: "Mã bài thi không hợp lệ.", code: "INVALID_INPUT" }, 400);
  }

  try {
    const itemResult = await queryDatabase<{
      id: string;
      status: string;
      module_id: string;
      scenario_id: string;
      library_revision_number: number;
      definition_snapshot_json: unknown;
      result_json: unknown;
    }>(
      `select item.id, item.status, item.module_id, item.scenario_id,
              item.library_revision_number, item.definition_snapshot_json, item.result_json
         from public.scenario_exam_session_items item
         join public.scenario_exam_sessions s on s.id = item.session_id
         join public.scenario_exam_codes c on c.id = s.code_id
         join public.scenario_exam_code_subjects cs on cs.id = item.code_subject_id and cs.code_id = c.id and cs.module_id = item.module_id
        where c.exam_id = $1 and c.id = $2 and item.id = $3`,
      [examId, codeId, itemId],
    );
    const item = itemResult.rows[0];
    if (!item || !isScenarioParametersModuleId(item.module_id)) {
      return json({ error: "Không tìm thấy bài làm trong kỳ thi này.", code: "NOT_FOUND" }, 404);
    }
    if (item.status !== "submitted" && item.status !== "timed_out") {
      return json({ error: "Chỉ gợi ý nhận xét sau khi môn thi đã nộp hoặc kết thúc.", code: "ITEM_NOT_SUBMITTED" }, 422);
    }
    const result = parseCandidateScenarioExamResult(item.result_json);
    if (!result || result.sessionItemId !== item.id || result.moduleId !== item.module_id || result.scenarioId !== item.scenario_id || result.revision !== item.library_revision_number) {
      return json({ error: "Bài làm chưa có dữ liệu nộp hợp lệ để phân tích.", code: "INVALID_RESULT" }, 422);
    }
    const feedback = await generateAttemptAiFeedback({
      moduleId: item.module_id,
      definition: item.definition_snapshot_json,
      payload: result.payload,
      mode: "examiner-review",
    });
    return json({ feedback });
  } catch {
    return json({ error: "Không thể tạo gợi ý nhận xét lúc này. Vui lòng thử lại.", code: "FEEDBACK_UNAVAILABLE" }, 503);
  }
}
