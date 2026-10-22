import "server-only";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDatabasePool } from "@/lib/db";
import { isScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { isRecord, sanitizeScenarioExamPayload } from "@/lib/scenario-exams/results";
import { assertSafeJson } from "../scenario-authoring/forms/helpers";
import { createPracticeSubmission, readAttemptFeedback, type FeedbackTarget, FeedbackJobError } from "./jobs";

export async function attemptFeedbackResponse(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return json({ code: "UNAUTHORIZED" }, 401);
  const origin = request.headers.get("origin");
  if ((origin !== null && origin !== (process.env.CNS_PUBLIC_ORIGIN || new URL(request.url).origin))
    || request.headers.get("sec-fetch-site") === "cross-site") return json({ code: "INVALID_ORIGIN" }, 403);
  const entries = [...new URL(request.url).searchParams.entries()];
  if (entries.length !== 1 || !["practiceSubmissionId", "examItemId", "legacyAttemptItemId"].includes(entries[0][0])
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(entries[0][1])) return json({ code: "INVALID_INPUT" }, 400);
  try { return json(await readAttemptFeedback(getDatabasePool(), profile.id, Object.fromEntries(entries) as FeedbackTarget)); }
  catch (error) { return failure(error); }
}

const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
async function boundedJson(request: Request): Promise<Record<string, unknown> | null> {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") ?? "")) return null;
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > 500_000) || !request.body) return null;
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > 500_000) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    assertSafeJson(parsed); return isRecord(parsed) ? parsed : null;
  } catch { return null; } finally { reader.releaseLock(); }
}
function failure(error: unknown) {
  const code = error instanceof FeedbackJobError ? error.code : "FEEDBACK_UNAVAILABLE";
  const status = ({ INVALID_INPUT: 400, ACTOR_FORBIDDEN: 403, NOT_FOUND: 404, IDEMPOTENCY_CONFLICT: 409, PUBLICATION_CHANGED: 409, DAILY_QUOTA: 429, ACTIVE_QUOTA: 429 } as Record<string,number>)[code] ?? 503;
  return json({ code, error: code === "PUBLICATION_CHANGED" ? "Barem đã được công bố lại. Hãy mở lượt ôn tập mới trước khi nộp; bài này không được chấm theo đáp án khác." : "Không thể xử lý yêu cầu nhận xét bài làm." }, status);
}
export async function practiceSubmissionResponse(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return json({ code: "UNAUTHORIZED" }, 401);
  if (request.headers.get("origin") !== (process.env.CNS_PUBLIC_ORIGIN || new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return json({ code: "INVALID_ORIGIN" }, 403);
  const body = await boundedJson(request), key = request.headers.get("idempotency-key") ?? "";
  if (!body || Object.keys(body).some(k => !["moduleId", "scenarioId", "payload", "libraryMembershipId"].includes(k)) || typeof body.moduleId !== "string" || !isScenarioParametersModuleId(body.moduleId)
    || typeof body.scenarioId !== "string" || !body.scenarioId || body.scenarioId.length > 200 || (body.payload !== null && !isRecord(body.payload)) || !/^[A-Za-z0-9._:-]{1,128}$/.test(key)) return json({ code: "INVALID_INPUT" }, 400);
  try {
    return json(await createPracticeSubmission(getDatabasePool(), profile.id, key, { moduleId: body.moduleId, scenarioId: body.scenarioId, payload: sanitizeScenarioExamPayload(body.payload) as Record<string,unknown> | null,
      ...(body.libraryMembershipId !== undefined ? { libraryMembershipId: body.libraryMembershipId as string } : {}),
    }), 202);
  } catch (error) { return failure(error); }
}
