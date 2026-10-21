import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { isScenarioParametersModuleId, parseScenarioParameters, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { storedScenarioParametersToRow } from "@/lib/scenario-parameters-storage";
import { isScenario } from "@/lib/storage";
import { mapRowToScenario } from "@/lib/supabase/scenarios";
import type { AdsbScenarioDefinition } from "@/modules/devices/adsb/scenario-parameters";

export interface GenerationInput { moduleId: ScenarioParametersModuleId; name: string; description: string; difficulty: "basic" | "intermediate" | "advanced" }
export interface GenerationDocument { id: string; name: string; mimeType: string; bytes: number; sha256: string; storageKey: string }
export const GENERATION_STATUSES = ["queued", "extracting", "generating", "validating", "completed", "failed"] as const;
export type GenerationStatus = typeof GENERATION_STATUSES[number];
export type GenerationPhase = "extracting" | "generating" | "validating";
export interface GenerationJob {
  id: string; actorId: string; moduleId: ScenarioParametersModuleId; name: string; input: GenerationInput;
  documents: GenerationDocument[]; status: GenerationStatus; phase: GenerationStatus; attempts: number; maxAttempts: number;
  attemptToken: string | null; workerId: string | null; leaseExpiresAt: string | null;
  promptVersion: string; schemaVersion: string; modelVersion: string; provenance: Record<string, unknown> | null;
  errorCode: string | null; errorMessage: string | null; scenarioId: string | null; scenarioRowId: string | null;
  createdAt: string; updatedAt: string;
}
export class GenerationJobError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "GenerationJobError"; }
}
export const isGenerationJobId = (id: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);
export function validateGenerationInput(value: unknown): GenerationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new GenerationJobError("INVALID_INPUT", "Thông tin yêu cầu không hợp lệ.");
  const v = value as Record<string, unknown>;
  if (typeof v.moduleId !== "string" || !isScenarioParametersModuleId(v.moduleId)
    || typeof v.name !== "string" || !v.name.trim() || v.name.trim().length > 200
    || typeof v.description !== "string" || !v.description.trim() || v.description.trim().length > 2000
    || !["basic", "intermediate", "advanced"].includes(String(v.difficulty))) throw new GenerationJobError("INVALID_INPUT", "Thông tin yêu cầu không hợp lệ.");
  return { moduleId: v.moduleId, name: v.name.trim(), description: v.description.trim(), difficulty: v.difficulty as GenerationInput["difficulty"] };
}
function validateDocuments(documents: GenerationDocument[]) {
  if (!Array.isArray(documents) || documents.length > 5 || documents.reduce((sum,d) => sum + d.bytes, 0) > 25 * 1024 * 1024
    || new Set(documents.map(d => d.id)).size !== documents.length
    || documents.some(d => !isGenerationJobId(d.id) || typeof d.name !== "string" || !d.name || d.name.length > 255 || typeof d.mimeType !== "string" || !d.mimeType || !Number.isInteger(d.bytes) || d.bytes < 1 || d.bytes > 10 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(d.sha256) || typeof d.storageKey !== "string" || !d.storageKey || d.storageKey.length > 500)) throw new GenerationJobError("INVALID_DOCUMENTS", "Tài liệu đính kèm không hợp lệ.");
}
export function generationInputHash(input: GenerationInput, documents: GenerationDocument[] = []) {
  const normalized = validateGenerationInput(input);
  return createHash("sha256").update(JSON.stringify({ input: normalized, documents: documents.map(({name,mimeType,bytes,sha256}) => ({name,mimeType,bytes,sha256})) })).digest("hex");
}
function iso(value: unknown): string { return value instanceof Date ? value.toISOString() : String(value); }
function mapJob(row: Record<string, unknown>): GenerationJob {
  return { id: String(row.id), actorId: String(row.actor_id), moduleId: row.module_id as ScenarioParametersModuleId, name: String(row.name), input: row.input_json as GenerationInput,
    documents: row.documents_json as GenerationDocument[], status: row.status as GenerationStatus, phase: row.phase as GenerationStatus, attempts: Number(row.attempts), maxAttempts: Number(row.max_attempts),
    attemptToken: row.attempt_token as string | null, workerId: row.worker_id as string | null, leaseExpiresAt: row.lease_expires_at ? iso(row.lease_expires_at) : null,
    promptVersion: String(row.prompt_version), schemaVersion: String(row.schema_version), modelVersion: String(row.model_version), provenance: row.provenance_json as Record<string, unknown> | null,
    errorCode: row.error_code as string | null, errorMessage: row.error_message as string | null, scenarioId: row.scenario_id as string | null, scenarioRowId: row.scenario_row_id as string | null, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) };
}
async function transaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try { await client.query("begin"); const result = await work(client); await client.query("commit"); return result; }
  catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
async function requireAdmin(client: PoolClient, actorId: string) {
  const result = await client.query("select id from public.users where id=$1 and role='admin' and is_active and not must_change_password for share", [actorId]);
  if (!result.rowCount) throw new GenerationJobError("ACTOR_FORBIDDEN", "Tài khoản không còn quyền tạo kịch bản.");
}
export async function createGenerationJob(pool: Pool, rawInput: GenerationInput, options: { actorId: string; idempotencyKey: string; documents?: GenerationDocument[]; id?: string; promptVersion?: string; schemaVersion?: string; modelVersion?: string }) {
  const input = validateGenerationInput(rawInput); const documents = options.documents ?? []; validateDocuments(documents);
  if (!isGenerationJobId(options.actorId) || !/^[A-Za-z0-9._:-]{1,128}$/.test(options.idempotencyKey) || (options.id !== undefined && !isGenerationJobId(options.id))) throw new GenerationJobError("INVALID_INPUT", "Mã yêu cầu không hợp lệ.");
  const hash = generationInputHash(input, documents);
  return transaction(pool, async client => {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`ai-generation:${options.actorId}`]);
    await requireAdmin(client, options.actorId);
    const existing = (await client.query("select * from public.ai_scenario_generation_jobs where actor_id=$1 and idempotency_key=$2", [options.actorId,options.idempotencyKey])).rows[0];
    if (existing) { if (existing.input_hash !== hash) throw new GenerationJobError("IDEMPOTENCY_CONFLICT", "Mã yêu cầu đã được dùng cho nội dung khác."); return mapJob(existing); }
    const count = await client.query("select count(*)::integer total from public.ai_scenario_generation_jobs where actor_id=$1 and status in ('queued','extracting','generating','validating')", [options.actorId]);
    if (count.rows[0].total >= 2) throw new GenerationJobError("ACTIVE_QUOTA", "Chỉ có thể xử lý đồng thời hai yêu cầu.");
    const result = await client.query(`insert into public.ai_scenario_generation_jobs (id,actor_id,module_id,name,input_json,documents_json,input_hash,idempotency_key,prompt_version,schema_version,model_version)
      values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11) returning *`, [options.id ?? randomUUID(),options.actorId,input.moduleId,input.name,JSON.stringify(input),JSON.stringify(documents),hash,options.idempotencyKey,options.promptVersion ?? "scenario-generation-v1",options.schemaVersion ?? "native-v1",options.modelVersion ?? "pending"]);
    return mapJob(result.rows[0]);
  });
}
export async function getGenerationJob(pool: Pool, id: string, actorId: string) {
  if (!isGenerationJobId(id) || !isGenerationJobId(actorId)) return null;
  const result = await pool.query("select * from public.ai_scenario_generation_jobs where id=$1 and actor_id=$2", [id,actorId]);
  return result.rows[0] ? mapJob(result.rows[0]) : null;
}
export async function listGenerationJobs(pool: Pool, actorId: string, filters: { moduleId?: ScenarioParametersModuleId; status?: GenerationStatus; limit?: number } = {}) {
  if (!isGenerationJobId(actorId)) return [];
  const result = await pool.query(`select * from public.ai_scenario_generation_jobs where actor_id=$1 and ($2::text is null or module_id=$2) and ($3::text is null or status=$3) order by created_at desc,id desc limit $4`,[actorId,filters.moduleId ?? null,filters.status ?? null,Math.min(50,Math.max(1,Math.floor(filters.limit ?? 20)))]);
  return result.rows.map(mapJob);
}
export async function deleteGenerationJob(pool: Pool, id: string, actorId: string): Promise<boolean> {
  if (!isGenerationJobId(id) || !isGenerationJobId(actorId)) return false;
  return transaction(pool, async client => {
    await requireAdmin(client, actorId);
    const result = await client.query("delete from public.ai_scenario_generation_jobs where id=$1 and actor_id=$2 returning id", [id, actorId]);
    return Boolean(result.rowCount);
  });
}
export async function claimGenerationJob(pool: Pool, workerId: string): Promise<(GenerationJob & { attemptToken: string }) | null> {
  if (!workerId || workerId.length > 200) throw new GenerationJobError("INVALID_WORKER", "Invalid worker identity.");
  return transaction(pool, async client => {
    await client.query(`with forbidden as (
      select j.id from public.ai_scenario_generation_jobs j
      where (j.status='queued' or (j.status in ('extracting','generating','validating') and j.lease_expires_at<=now()))
        and not exists (select 1 from public.users u where u.id=j.actor_id and u.role='admin' and u.is_active and not u.must_change_password)
      for update skip locked
    ) update public.ai_scenario_generation_jobs j set status='failed',phase='failed',lease_expires_at=null,
      error_code='ACTOR_FORBIDDEN',error_message='Tài khoản không còn quyền tạo kịch bản.' from forbidden where j.id=forbidden.id`);
    await client.query(`with exhausted as (select id from public.ai_scenario_generation_jobs where status in ('extracting','generating','validating') and lease_expires_at <= now() and attempts >= max_attempts for update skip locked)
      update public.ai_scenario_generation_jobs j set status='failed',phase='failed',lease_expires_at=null,error_code='ATTEMPTS_EXHAUSTED',error_message='Yêu cầu đã vượt quá số lần thử cho phép.' from exhausted where j.id=exhausted.id`);
    const result = await client.query(`with candidate as (
      select id from public.ai_scenario_generation_jobs where attempts < max_attempts and (status='queued' or (status in ('extracting','generating','validating') and lease_expires_at <= now())) order by created_at,id for update skip locked limit 1)
      update public.ai_scenario_generation_jobs j set status=case when jsonb_array_length(documents_json)>0 then 'extracting' else 'generating' end,
        phase=case when jsonb_array_length(documents_json)>0 then 'extracting' else 'generating' end,
        attempts=attempts+1,attempt_token=$1,worker_id=$2,lease_expires_at=now()+interval '10 minutes',error_code=null,error_message=null
      from candidate where j.id=candidate.id returning j.*`, [randomUUID(),workerId]);
    return result.rows[0] ? mapJob(result.rows[0]) as GenerationJob & { attemptToken: string } : null;
  });
}
export async function heartbeatGenerationJob(pool: Pool, id: string, attemptToken: string, phase: string) {
  if (!["extracting","generating","validating"].includes(phase)) throw new GenerationJobError("INVALID_PHASE", "Invalid generation phase.");
  const result = await pool.query(`update public.ai_scenario_generation_jobs set status=$3,phase=$3,lease_expires_at=now()+interval '10 minutes' where id=$1 and attempt_token=$2 and status in ('extracting','generating','validating') and lease_expires_at>now()
      and exists (select 1 from public.users u where u.id=actor_id and u.role='admin' and u.is_active and not u.must_change_password)
      returning *`, [id,attemptToken,phase]);
  return result.rows[0] ? mapJob(result.rows[0]) : null;
}
const publicFailures: Record<string, string> = {
  INVALID_PARAMETERS: "Cấu hình tham số không hợp lệ hoặc chưa được simulator hỗ trợ.",
  INVALID_PARAMETER_UNIT: "Đơn vị tham số không khớp với thiết bị. Hãy dùng đơn vị trong file mẫu.",
  UNGROUNDED_PARAMETER: "Chưa có căn cứ rõ cho giá trị tham số. Ghi đúng tên trường, giá trị và đơn vị.",
  UNHANDLED_PARAMETER: "Một tham số đã yêu cầu chưa được áp dụng. Hãy kiểm tra các dòng SET và RECOVER.",
  INVALID_RECOVERY: "Chưa kiểm chứng được đường khôi phục với các tham số đã chọn.",
  UNSUPPORTED_PARAMETERS: "Yêu cầu cấu hình vượt khả năng simulator hiện tại. Không tạo kịch bản thay thế.",
  REQUEST_TOO_COMPLEX: "Yêu cầu chứa quá nhiều tham số. Hãy tách nhỏ tình huống.",
  GENERATION_FAILED: "Không thể tạo kịch bản. Vui lòng thử lại.", PROVIDER_ERROR: "Dịch vụ AI chưa thể xử lý yêu cầu.", PROVIDER_UNAVAILABLE: "Dịch vụ AI tạm thời không khả dụng.",
  INVALID_DEFINITION: "Kịch bản AI không đạt yêu cầu kiểm tra.", EXTRACTION_FAILED: "Không thể đọc nội dung tài liệu.", DOCUMENT_ERROR: "Tài liệu không thể được xử lý.",
  INVALID_DOCUMENT: "Tài liệu không có văn bản đọc được hoặc vượt giới hạn; PDF scan cần OCR.",
  DOCUMENT_TIMEOUT: "Tài liệu quá phức tạp để đọc trong giới hạn thời gian. Hãy tách các trang liên quan.",
  DOCUMENT_RESOURCE_LIMIT: "Tài liệu vượt giới hạn xử lý an toàn. Hãy tách hoặc chuyển sang TXT/PDF có lớp chữ.",
  INVALID_STORAGE_KEY: "Tham chiếu tài liệu không hợp lệ.", DOCUMENT_INTEGRITY: "Tài liệu lưu trữ không còn khớp bản gốc.",
  UNSUPPORTED_REQUEST: "Yêu cầu chưa có tình huống lỗi tương ứng trong simulator. Hãy điều chỉnh mô tả.",
  UNSUPPORTED_TEMPLATE: "Tình huống lỗi chưa được simulator hỗ trợ.", INVALID_SELECTION: "AI chưa chọn được tình huống phù hợp; hãy mô tả cụ thể hơn.",
  INVALID_CITATION: "AI chưa dẫn đúng tài liệu nguồn; hãy cung cấp trích đoạn liên quan.",
  PROVIDER_AUTH: "Kết nối AI cần quản trị viên kiểm tra thông tin xác thực.", PROVIDER_RATE_LIMIT: "Dịch vụ AI đang giới hạn yêu cầu; vui lòng thử lại sau.",
  PROVIDER_TIMEOUT: "Dịch vụ AI quá thời gian xử lý; vui lòng thử lại.", PROVIDER_TRUNCATED: "Phản hồi AI chưa hoàn chỉnh; hãy rút gọn yêu cầu.",
  PROVIDER_INVALID_RESPONSE: "Phản hồi AI không đúng định dạng yêu cầu.",
  ACTOR_FORBIDDEN: "Tài khoản không còn quyền tạo kịch bản.", TIMEOUT: "Yêu cầu đã hết thời gian xử lý.", ATTEMPTS_EXHAUSTED: "Yêu cầu đã vượt quá số lần thử cho phép."
};
export async function failGenerationJob(pool: Pool, id: string, attemptToken: string, failure: { code: string; message: string; retryable?: boolean }) {
  const code = Object.hasOwn(publicFailures,failure.code) ? failure.code : "GENERATION_FAILED";
  const result = await pool.query(`update public.ai_scenario_generation_jobs set status=case when $3 and attempts<max_attempts then 'queued' else 'failed' end,
    phase=case when $3 and attempts<max_attempts then 'queued' else 'failed' end,lease_expires_at=null,error_code=$4,error_message=$5
    where id=$1 and attempt_token=$2 and status in ('extracting','generating','validating') and lease_expires_at>now() returning *`, [id,attemptToken,failure.retryable === true,code,publicFailures[code]]);
  return result.rows[0] ? mapJob(result.rows[0]) : null;
}
export async function completeGenerationJob(pool: Pool, id: string, attemptToken: string, output: { definition: unknown; provenance: Record<string, unknown> }) {
  return transaction(pool, async client => {
    const row = (await client.query("select *, lease_expires_at>now() as live_lease from public.ai_scenario_generation_jobs where id=$1 for update", [id])).rows[0];
    if (!row || row.attempt_token !== attemptToken) throw new GenerationJobError("STALE_ATTEMPT", "Attempt no longer owns the job.");
    if (row.status === "completed") return mapJob(row);
    if (!["extracting","generating","validating"].includes(row.status) || !row.live_lease) throw new GenerationJobError("STALE_ATTEMPT", "Attempt no longer owns the job.");
    const job = mapJob(row); await requireAdmin(client,job.actorId);
    const scenarioId = `${job.moduleId}-ai-${randomUUID()}`; const scenarioRowId = randomUUID();
    if (!output.definition || typeof output.definition !== "object" || Array.isArray(output.definition)) throw new GenerationJobError("INVALID_DEFINITION", publicFailures.INVALID_DEFINITION);
    const definition = parseScenarioParameters(job.moduleId, { ...output.definition, id: scenarioId, name: job.input.name, description: job.input.description, difficulty: job.input.difficulty });
    if (!definition) throw new GenerationJobError("INVALID_DEFINITION", publicFailures.INVALID_DEFINITION);
    const stored = storedScenarioParametersToRow({ moduleId: job.moduleId, definition, createdBy: job.actorId, sourceFileName: "native-ai-generated" });
    let legacy: Record<string, unknown> | null = null;
    if (job.moduleId === "ads-b") {
      const adsb = definition as AdsbScenarioDefinition;
      legacy = { id: scenarioId, title: adsb.name, description: adsb.description, difficulty: {basic:"easy",intermediate:"medium",advanced:"hard"}[adsb.difficulty],
        sites_json: JSON.stringify(adsb.sites), target_sensor_id: adsb.targetSensorId, target_login_user: adsb.targetLoginUser, expected_actions_json: JSON.stringify(adsb.expectedActions),
        hardware_fault_json: adsb.hardwareFault ? JSON.stringify(adsb.hardwareFault) : null, event_log_json: adsb.eventLog ? JSON.stringify(adsb.eventLog) : null,
        created_at: new Date().toISOString(), updated_at: null };
      if (!isScenario(mapRowToScenario(legacy))) throw new GenerationJobError("INVALID_DEFINITION", publicFailures.INVALID_DEFINITION);
    }
    const provenance = JSON.stringify(output.provenance);
    if (!output.provenance || Array.isArray(output.provenance) || typeof output.provenance !== "object" || provenance.length>256*1024) throw new GenerationJobError("INVALID_PROVENANCE", "Invalid generation provenance.");
    const columns = Object.keys(stored);
    await client.query(`insert into public.simulator_scenario_parameters (id,${columns.join(",")}) values ($1,${columns.map((_,i) => `$${i+2}`).join(",")})`, [scenarioRowId,...columns.map(k => stored[k as keyof typeof stored])]);
    if (legacy) { const keys=Object.keys(legacy); await client.query(`insert into public.scenarios (${keys.join(",")}) values (${keys.map((_,i) => `$${i+1}`).join(",")})`, keys.map(k => legacy![k])); }
    const version = (key: string, fallback: string) => typeof output.provenance[key] === "string" ? (output.provenance[key] as string).slice(0,200) : fallback;
    const result = await client.query(`update public.ai_scenario_generation_jobs set status='completed',phase='completed',lease_expires_at=null,scenario_id=$3,scenario_row_id=$4,provenance_json=$5::jsonb,
      prompt_version=$6,schema_version=$7,model_version=$8,completed_at=now(),error_code=null,error_message=null where id=$1 and attempt_token=$2 returning *`, [id,attemptToken,scenarioId,scenarioRowId,provenance,version("promptVersion",job.promptVersion),version("schemaVersion",job.schemaVersion),version("modelVersion",version("model",job.modelVersion))]);
    return mapJob(result.rows[0]);
  });
}
