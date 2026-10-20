import "server-only";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDatabasePool } from "@/lib/db";
import { saveDocuments } from "../documents/storage";
import { DOCUMENT_LIMITS, validateUploads, type DocumentUpload } from "../documents/validation";
import { createGenerationJob, getGenerationJob, listGenerationJobs, validateGenerationInput, GenerationJobError, GENERATION_STATUSES, isGenerationJobId, type GenerationJob, type GenerationStatus } from "./jobs";
import { isScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { readParameterReview } from "./parameter-review";

export function generationJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}
export async function authorizeGenerationRequest() {
  const profile = await getCurrentProfile();
  if (!profile) return { response: generationJson({ error: "Chưa đăng nhập." }, 401) };
  if (profile.role !== "admin") return { response: generationJson({ error: "Không có quyền tạo kịch bản." }, 403) };
  return { profile };
}
/** The only client-visible shape: never serialize the repository job directly. */
export function generationJobDto(job: GenerationJob) {
  return { id: job.id, moduleId: job.moduleId, name: job.name, status: job.status, phase: job.phase,
    errorCode: job.errorCode, errorMessage: job.errorMessage, scenarioId: job.scenarioId, scenarioRowId: job.scenarioRowId,
    createdAt: job.createdAt, updatedAt: job.updatedAt,
    ...(job.status === "completed" ? { parameterReview: readParameterReview(job.provenance?.parameters) } : {}),
    documents: job.documents.map(({ id, name, mimeType, bytes, sha256 }) => ({ id, name, mimeType, bytes, sha256 })) };
}
function apiError(error: unknown) {
  if (error instanceof GenerationJobError) {
    if (error.code === "ACTIVE_QUOTA") return generationJson({ error: "Chỉ có thể xử lý đồng thời hai yêu cầu.", code: error.code }, 429);
    if (error.code === "IDEMPOTENCY_CONFLICT") return generationJson({ error: "Mã yêu cầu đã được dùng cho nội dung khác.", code: error.code }, 409);
    if (error.code === "ACTOR_FORBIDDEN") return generationJson({ error: "Tài khoản không còn quyền tạo kịch bản.", code: error.code }, 403);
    if (error.code === "BODY_TOO_LARGE") return generationJson({ error: "Dung lượng yêu cầu vượt giới hạn.", code: error.code }, 413);
    if (["INVALID_INPUT", "INVALID_DOCUMENTS", "INVALID_MULTIPART"].includes(error.code)) return generationJson({ error: "Thông tin hoặc tài liệu không hợp lệ.", code: error.code }, 400);
  }
  // Document parsers can include paths/content in exceptions. Expose only a code.
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^(INVALID_UPLOAD|UNSUPPORTED_DOCUMENT|DOCUMENT_TOO_LARGE|INVALID_DOCUMENT)/.test(error.code)) return generationJson({ error: "Tài liệu không hợp lệ.", code: "INVALID_DOCUMENTS" }, 400);
  return generationJson({ error: "Không thể xử lý yêu cầu tạo kịch bản.", code: "GENERATION_UNAVAILABLE" }, 503);
}
const RAW_BODY_LIMIT = DOCUMENT_LIMITS.totalBytes + 1024 * 1024;
/** Bound chunked and misreported bodies before the multipart parser allocates. */
async function boundedMultipart(request: Request) {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)))) throw new GenerationJobError("INVALID_MULTIPART", "Invalid content length.");
  if (length !== null && Number(length) > RAW_BODY_LIMIT) throw new GenerationJobError("BODY_TOO_LARGE", "Body exceeds limit.");
  if (!/^multipart\/form-data\s*;/i.test(request.headers.get("content-type") ?? "") || !request.body) throw new GenerationJobError("INVALID_MULTIPART", "Multipart required.");
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; total += value.byteLength; if (total > RAW_BODY_LIMIT) { await reader.cancel(); throw new GenerationJobError("BODY_TOO_LARGE", "Body exceeds limit."); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  try { return await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData(); }
  catch { throw new GenerationJobError("INVALID_MULTIPART", "Invalid multipart body."); }
}
export async function createGenerationResponse(request: Request) {
  const auth = await authorizeGenerationRequest(); if (auth.response) return auth.response;
  const origin = request.headers.get("origin");
  // Next standalone can expose its internal host in request.url behind Traefik.
  // Use the operator-configured public origin, never untrusted forwarded headers.
  const expectedOrigin = process.env.CNS_PUBLIC_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== expectedOrigin || request.headers.get("sec-fetch-site") === "cross-site") return generationJson({ error: "Nguồn yêu cầu không hợp lệ." }, 403);
  if (process.env.CNS_AI_ENABLED !== "true") return generationJson({ error: "Chức năng AI chưa được bật.", code: "PROVIDER_NOT_CONFIGURED" }, 503);
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || !/^[A-Za-z0-9._:-]{1,128}$/.test(idempotencyKey)) return generationJson({ error: "Mã yêu cầu không hợp lệ.", code: "INVALID_INPUT" }, 400);
  const jobId = randomUUID(); let retained = false; let saved = false;
  try {
    const form = await boundedMultipart(request);
    const allowed = new Set(["moduleId", "name", "description", "difficulty", "files"]);
    for (const key of form.keys()) if (!allowed.has(key)) throw new GenerationJobError("INVALID_INPUT", "Unexpected form field.");
    for (const key of ["moduleId", "name", "description", "difficulty"]) if (form.getAll(key).length !== 1 || typeof form.get(key) !== "string") throw new GenerationJobError("INVALID_INPUT", "Invalid form field.");
    const input = validateGenerationInput({ moduleId: form.get("moduleId"), name: form.get("name"), description: form.get("description"), difficulty: form.get("difficulty") });
    const uploads = form.getAll("files");
    if (uploads.some(f => typeof f === "string")) throw new GenerationJobError("INVALID_DOCUMENTS", "Invalid documents.");
    const files = uploads as DocumentUpload[];
    if (files.length > DOCUMENT_LIMITS.count || files.some(f => f.size < 1 || f.size > DOCUMENT_LIMITS.fileBytes) || files.reduce((sum,f) => sum+f.size,0)>DOCUMENT_LIMITS.totalBytes) throw new GenerationJobError("INVALID_DOCUMENTS", "Upload limits exceeded.");
    validateUploads(files);
    const documents = files.length ? await saveDocuments(jobId,files) : [];
    saved = documents.length > 0;
    const job = await createGenerationJob(getDatabasePool(),input,{ actorId: auth.profile!.id, idempotencyKey, documents, id: jobId, modelVersion: process.env.CNS_AI_MODEL || "gpt-5.6-luna" });
    retained = job.id === jobId;
    return generationJson({ job: generationJobDto(job) }, 202);
  } catch (error) { return apiError(error); }
  finally {
    if (saved && !retained) {
      // jobId is generated here, never derived from a request or stored key.
      await rm(/* turbopackIgnore: true */ join(/* turbopackIgnore: true */ process.env.CNS_AI_STORAGE_DIR || "/app/storage/ai-scenarios",jobId),{ recursive: true, force: true }).catch(() => undefined);
    }
  }
}
export async function listGenerationResponse(request: Request) {
  const auth = await authorizeGenerationRequest(); if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams; const moduleId = params.get("moduleId"); const status = params.get("status"); const limit = params.get("limit");
  if ((moduleId !== null && !isScenarioParametersModuleId(moduleId)) || (status !== null && !GENERATION_STATUSES.includes(status as GenerationStatus))
    || (limit !== null && (!/^\d+$/.test(limit) || Number(limit)<1 || Number(limit)>50))) return generationJson({ error: "Bộ lọc không hợp lệ." },400);
  try {
    const jobs = await listGenerationJobs(getDatabasePool(),auth.profile!.id,{ ...(moduleId ? {moduleId: moduleId as GenerationJob["moduleId"]} : {}), ...(status ? {status:status as GenerationStatus} : {}), ...(limit ? {limit:Number(limit)} : {}) });
    return generationJson({ jobs: jobs.map(generationJobDto) });
  } catch(error) { return apiError(error); }
}
export async function getGenerationResponse(jobId: string) {
  const auth = await authorizeGenerationRequest(); if (auth.response) return auth.response;
  if (!isGenerationJobId(jobId)) return generationJson({ error: "Không tìm thấy yêu cầu." },404);
  try {
    const job = await getGenerationJob(getDatabasePool(),jobId,auth.profile!.id);
    return job ? generationJson({ job: generationJobDto(job) }) : generationJson({ error: "Không tìm thấy yêu cầu." },404);
  } catch(error) { return apiError(error); }
}
