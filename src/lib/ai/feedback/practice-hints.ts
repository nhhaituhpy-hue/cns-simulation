import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { isScenarioParametersModuleId, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { isRecord } from "@/lib/scenario-exams/results";
import { assertSafeJson } from "../scenario-authoring/forms/helpers";
import { preparePracticeQuestion } from "./practice-question";
import { sensitiveText } from "../scenario-blueprint/validation";
import type { ScenarioRubric } from "../scenario-blueprint/types";
import { sanitizePracticeHintPayload } from "./practice-hints-input";
import type { PracticeHintEvidence, PracticeHintResult } from "./practice-hints-worker";
export class PracticeHintError extends Error { constructor(public readonly code: string) { super(code); } }
export const isHintId = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export function toLegacyPracticeHintResult(result: PracticeHintResult) {
  return {
    sourceMode: result.sourceMode === "knowledge-only" ? "deterministic-only" as const : result.sourceMode,
    summary: result.summary,
    nextSteps: result.answer !== undefined ? [result.answer] : result.nextSteps,
    notice: result.notice,
  };
}
export interface PracticeHintInput { moduleId: ScenarioParametersModuleId; scenarioId: string; libraryMembershipId?: string; runKey: string; question?: string; payload: Record<string, unknown> | null }
export type HintStatus = "queued" | "running" | "completed" | "failed";
export interface ClaimedPracticeHint extends PracticeHintEvidence { id: string; attemptToken: string }
async function tx<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try { await c.query("begin"); const result = await work(c); await c.query("commit"); return result; }
  catch (error) { await c.query("rollback"); throw error; } finally { c.release(); }
}
function canonical(v: unknown): unknown { return Array.isArray(v) ? v.map(canonical) : isRecord(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v; }
async function actor(c: PoolClient, id: string) {
  if (!isHintId(id) || !(await c.query("select id from public.users where id=$1 and is_active and not must_change_password for share", [id])).rowCount) throw new PracticeHintError("ACTOR_FORBIDDEN");
}
async function allowed(c: PoolClient, row: Record<string, unknown>) {
  return Boolean((await c.query(`select m.id from public.simulator_scenario_library_memberships m join public.users u on u.id=$1
    where u.is_active and not u.must_change_password and m.id=$2 and m.module_id=$3 and m.library_kind='practice'
    and m.archived_at is null and m.revision_number=$4 for share of m,u`, [row.actor_id, row.library_membership_id, row.module_id, row.library_revision_number])).rowCount);
}
export async function createPracticeHint(pool: Pool, actorId: string, key: string, input: PracticeHintInput) {
  if (!isHintId(actorId) || !isHintId(key) || !isRecord(input) || Object.keys(input).some(k => !["moduleId","scenarioId","libraryMembershipId","runKey","question","payload"].includes(k))
    || !isScenarioParametersModuleId(input.moduleId) || typeof input.scenarioId !== "string" || !input.scenarioId || input.scenarioId.length>200
    || (input.libraryMembershipId !== undefined && !isHintId(input.libraryMembershipId))
    || typeof input.runKey !== "string" || !input.runKey || input.runKey.length>200 || (input.payload !== null && !isRecord(input.payload))
    || (input.question !== undefined && (typeof input.question !== "string" || input.question.length>1000))) throw new PracticeHintError("INVALID_INPUT");
  try { assertSafeJson(input); if (Buffer.byteLength(JSON.stringify(input))>500_000) throw Error(); } catch { throw new PracticeHintError("INVALID_INPUT"); }
  const payload = sanitizePracticeHintPayload(input.payload), question = preparePracticeQuestion(input.question ?? "").question;
  const hash = createHash("sha256").update(JSON.stringify(canonical({ ...input, payload, question }))).digest("hex");
  return tx(pool, async c => {
    await actor(c, actorId);
    await c.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`practice-hint:${actorId}`]);
    const prior = (await c.query("select * from public.ai_practice_hint_jobs where actor_id=$1 and idempotency_key=$2", [actorId,key])).rows[0];
    if (prior) {
      if (!await allowed(c, prior)) throw new PracticeHintError("NOT_FOUND");
      if (prior.input_hash!==hash) {
        // A response-lost enqueue from the old web must keep its frozen job.
        // Its question sanitizer predates classification and did not trim.
        const legacyQuestion = sensitiveText(input.question ?? "") ? "" : input.question ?? "";
        const legacyHash = createHash("sha256").update(JSON.stringify(canonical({ ...input, payload, question: legacyQuestion }))).digest("hex");
        if (prior.input_hash!==legacyHash || prior.question!==legacyQuestion) throw new PracticeHintError("IDEMPOTENCY_CONFLICT");
      }
      return { jobId: prior.id as string, status: prior.status as HintStatus };
    }
    const m = (await c.query(`select * from public.simulator_scenario_library_memberships where module_id=$1 and library_kind='practice'
      and archived_at is null and (scenario_id=$2 or scenario_parameters_id::text=$2) order by published_at desc,id limit 1 for share`, [input.moduleId,input.scenarioId])).rows[0];
    if (!m) throw new PracticeHintError("NOT_FOUND");
    if (input.libraryMembershipId && input.libraryMembershipId !== m.id) throw new PracticeHintError("PUBLICATION_CHANGED");
    const quota = (await c.query(`select count(*) filter(where created_at>=clock_timestamp()-interval '1 hour')::int hourly,
      count(*) filter(where status in ('queued','running'))::int active from public.ai_practice_hint_jobs where actor_id=$1`, [actorId])).rows[0];
    if (quota.active>=3 || quota.hourly>=12) throw new PracticeHintError("QUOTA_EXCEEDED");
    const row = (await c.query(`insert into public.ai_practice_hint_jobs(actor_id,module_id,scenario_id,library_membership_id,library_revision_number,run_key,question,definition_json,assessment_rubric_json,payload_json,input_hash,idempotency_key)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id,status`, [actorId,input.moduleId,m.scenario_id,m.id,m.revision_number,input.runKey,question,m.definition_json,m.assessment_rubric_json,payload,hash,key])).rows[0];
    return { jobId: row.id as string, status: row.status as HintStatus };
  });
}
export async function readPracticeHint(pool: Pool, actorId: string, jobId: string): Promise<{ jobId: string; status: HintStatus; result?: PracticeHintResult }> {
  if (!isHintId(actorId) || !isHintId(jobId)) throw new PracticeHintError("INVALID_INPUT");
  return tx(pool, async c => {
    await actor(c,actorId);
    const row = (await c.query("select * from public.ai_practice_hint_jobs where id=$1 and actor_id=$2 for share", [jobId,actorId])).rows[0];
    if (!row || !await allowed(c,row)) throw new PracticeHintError("NOT_FOUND");
    return { jobId, status: row.status, ...(row.status==='completed' && row.result_json ? { result: row.result_json as PracticeHintResult } : {}) };
  });
}
export async function claimPracticeHint(pool: Pool, workerId: string): Promise<ClaimedPracticeHint | null> {
  if (!workerId || workerId.length>200) throw new PracticeHintError("INVALID_INPUT");
  return tx(pool, async c => {
    await c.query(`with expired as (select id from public.ai_practice_hint_jobs where status='running' and lease_expires_at<=clock_timestamp() and attempts>=max_attempts for update skip locked)
      update public.ai_practice_hint_jobs j set status='failed',error_code='ATTEMPTS_EXHAUSTED',lease_expires_at=null,attempt_token=null,completed_at=clock_timestamp() from expired where j.id=expired.id`);
    for (let n=0;n<50;n++) {
      const row = (await c.query(`select * from public.ai_practice_hint_jobs where attempts<max_attempts and ((status='queued' and available_at<=clock_timestamp()) or (status='running' and lease_expires_at<=clock_timestamp())) order by available_at,created_at,id for update skip locked limit 1`)).rows[0];
      if (!row) return null;
      if (!await allowed(c,row)) { await c.query("update public.ai_practice_hint_jobs set status='failed',error_code='ACCESS_REVOKED',attempt_token=null,lease_expires_at=null,completed_at=clock_timestamp() where id=$1", [row.id]); continue; }
      const token=randomUUID();
      await c.query("update public.ai_practice_hint_jobs set status='running',attempts=attempts+1,attempt_token=$2,worker_id=$3,lease_expires_at=clock_timestamp()+interval '2 minutes',error_code=null where id=$1", [row.id,token,workerId]);
      return { id:row.id,attemptToken:token,moduleId:row.module_id,definition:row.definition_json,rubric:row.assessment_rubric_json as ScenarioRubric|null,payload:row.payload_json,question:row.question };
    }
    return null;
  });
}
async function mutate(pool: Pool,id:string,token:string,sql:string,values:unknown[]=[]):Promise<boolean> {
  if (!isHintId(id)||!isHintId(token))return false;
  return tx(pool,async c=>{
    const row=(await c.query("select * from public.ai_practice_hint_jobs where id=$1 and attempt_token=$2 and status='running' and lease_expires_at>clock_timestamp() for update",[id,token])).rows[0];
    if(!row)return false;
    if(!await allowed(c,row)){await c.query("update public.ai_practice_hint_jobs set status='failed',error_code='ACCESS_REVOKED',attempt_token=null,lease_expires_at=null,completed_at=clock_timestamp() where id=$1",[id]);return false;}
    return Boolean((await c.query(`${sql} where id=$1 and attempt_token=$2 and status='running' and lease_expires_at>clock_timestamp() returning id`,[id,token,...values])).rowCount);
  });
}
export const heartbeatPracticeHint=(pool:Pool,id:string,token:string)=>mutate(pool,id,token,"update public.ai_practice_hint_jobs set lease_expires_at=clock_timestamp()+interval '2 minutes'");
export const completePracticeHint=(pool:Pool,id:string,token:string,result:PracticeHintResult)=>mutate(pool,id,token,"update public.ai_practice_hint_jobs set status='completed',result_json=$3,lease_expires_at=null,completed_at=clock_timestamp(),error_code=null",[result]);
export const failPracticeHint=(pool:Pool,id:string,token:string)=>mutate(pool,id,token,"update public.ai_practice_hint_jobs set status=case when attempts<max_attempts then 'queued' else 'failed' end,error_code='HINT_UNAVAILABLE',lease_expires_at=null,attempt_token=null,available_at=clock_timestamp()+interval '30 seconds',completed_at=case when attempts>=max_attempts then clock_timestamp() else null end");
