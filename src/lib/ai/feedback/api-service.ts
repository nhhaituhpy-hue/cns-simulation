import "server-only";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDatabasePool, queryDatabase } from "@/lib/db";
import { isRecord, sanitizeScenarioExamPayload } from "@/lib/scenario-exams/results";
import { isScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { assertSafeJson } from "../scenario-authoring/forms/helpers";
import { FeedbackJobError, readAttemptFeedback } from "./jobs";
import { analyzeAttemptEvidence } from "./attempt-feedback";
import type { ScenarioRubric } from "../scenario-blueprint/types";

const json = (value: unknown, status = 200) =>
  NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validOrigin(request: Request): boolean {
  const expected = process.env.CNS_PUBLIC_ORIGIN || new URL(request.url).origin;
  return request.headers.get("origin") === expected && request.headers.get("sec-fetch-site") !== "cross-site";
}
async function readBoundedJson(request: Request, maxBytes: number): Promise<Record<string, unknown> | null> {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") ?? "")) return null;
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes) || !request.body) return null;
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    assertSafeJson(parsed); return isRecord(parsed) ? parsed : null;
  } catch { return null; } finally { reader.releaseLock(); }
}
export async function practiceFeedbackResponse(request: Request) {
  const profile=await getCurrentProfile();
  if(!profile)return json({code:"UNAUTHORIZED"},401);
  if(!validOrigin(request))return json({code:"INVALID_ORIGIN"},403);
  const body=await readBoundedJson(request,500_000);
  if(!body||Object.keys(body).some(k=>!["moduleId","scenarioId","payload"].includes(k))||typeof body.moduleId!=="string"||!isScenarioParametersModuleId(body.moduleId)||typeof body.scenarioId!=="string"||!body.scenarioId||body.scenarioId.length>200||(body.payload!==null&&!isRecord(body.payload)))return json({code:"INVALID_INPUT"},400);
  try{
    // On-demand hints are not submissions, and cannot consume a provider call.
    // Resolve only published practice; no fallback to exam or mutable sources.
    const result=await queryDatabase<{definition_json:unknown;assessment_rubric_json:ScenarioRubric|null}>(`select m.definition_json,m.assessment_rubric_json
      from public.simulator_scenario_library_memberships m join public.users u on u.id=$3
      where u.is_active and not u.must_change_password and m.module_id=$1 and m.library_kind='practice' and m.archived_at is null
      and (m.scenario_id=$2 or m.scenario_parameters_id::text=$2) order by m.published_at desc,m.id limit 1`,[body.moduleId,body.scenarioId,profile.id]);
    const source=result.rows[0];if(!source)return json({code:"NOT_FOUND"},404);
    return json({feedback:analyzeAttemptEvidence(body.moduleId,source.definition_json,sanitizeScenarioExamPayload(body.payload) as Record<string,unknown>|null,source.assessment_rubric_json)});
  }catch{return json({code:"FEEDBACK_UNAVAILABLE",error:"Không thể đối chiếu bằng chứng ôn tập hiện tại."},503);}
}
export async function examReviewFeedbackResponse(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return json({ code: "UNAUTHORIZED" }, 401);
  if (profile.role !== "admin") return json({ code: "FORBIDDEN" }, 403);
  if (!validOrigin(request)) return json({ code: "INVALID_ORIGIN" }, 403);
  const body = await readBoundedJson(request, 32_768);
  if (!body || Object.keys(body).some(k => !["examId", "codeId", "itemId"].includes(k))
    || ![body.examId, body.codeId, body.itemId].every(id => typeof id === "string" && UUID_RE.test(id))) return json({ code: "INVALID_INPUT" }, 400);
  try {
    // Bind the old URL's complete resource path and recheck current admin role.
    // The shared reader independently gates terminal/revoked state under locks.
    const result = await queryDatabase(`select item.id from public.scenario_exam_session_items item
      join public.scenario_exam_sessions s on s.id=item.session_id join public.scenario_exam_codes c on c.id=s.code_id
      join public.users actor on actor.id=$4 and actor.role='admin' and actor.is_active and not actor.must_change_password
      where c.exam_id = $1 and c.id=$2 and item.id=$3`, [body.examId, body.codeId, body.itemId, profile.id]);
    if (!result.rows[0]) return json({ code: "NOT_FOUND" }, 404);
    return json(await readAttemptFeedback(getDatabasePool(), profile.id, { examItemId: body.itemId as string }));
  } catch (error) {
    const code = error instanceof FeedbackJobError ? error.code : "FEEDBACK_UNAVAILABLE";
    return json({ code, error: "Không thể đọc nhận xét bài làm." }, code === "NOT_FOUND" ? 404 : code === "ACTOR_FORBIDDEN" ? 403 : 503);
  }
}
