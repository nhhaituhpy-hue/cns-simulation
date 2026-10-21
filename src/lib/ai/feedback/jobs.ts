import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { AttemptFeedbackReport } from "./attempt-feedback";

export type FeedbackTarget = { practiceSubmissionId: string } | { examItemId: string } | { legacyAttemptItemId: string };
export async function readAttemptFeedback(pool: Pool, actorId: string, target: FeedbackTarget): Promise<{ status: FeedbackStatus | "withheld"; feedback?: AttemptFeedbackReport }> {
  const entries = Object.entries(target);
  if (!isFeedbackId(actorId) || entries.length !== 1 || !["practiceSubmissionId","examItemId","legacyAttemptItemId"].includes(entries[0][0]) || !isFeedbackId(entries[0][1])) throw new FeedbackJobError("INVALID_INPUT");
  return transaction(pool, async client => {
    const actor = await requireActor(client, actorId);
    let column: string;
    if ("practiceSubmissionId" in target) {
      const submission = (await client.query("select actor_id from public.practice_submissions where id=$1 for share", [target.practiceSubmissionId])).rows[0];
      if (!submission || submission.actor_id !== actor.id) throw new FeedbackJobError("NOT_FOUND");
      column = "practice_submission_id";
    } else if ("examItemId" in target) {
      const row = (await client.query(`select i.status item_status,s.status session_status,c.status code_status,s.candidate_user_id,c.redeem_user_id,c.revoked_at,
        u.role owner_role,u.is_active,u.must_change_password
        from public.scenario_exam_session_items i join public.scenario_exam_sessions s on s.id=i.session_id
        join public.scenario_exam_codes c on c.id=s.code_id join public.users u on u.id=s.candidate_user_id
        where i.id=$1 for share of s,c,i,u`, [target.examItemId])).rows[0];
      if (!row || !row.is_active || row.must_change_password || row.owner_role !== "student" || (row.redeem_user_id !== null && row.candidate_user_id !== row.redeem_user_id)
        || row.session_status === "revoked" || row.code_status === "revoked" || row.revoked_at || (actor.role !== "admin" && (actor.role !== "student" || row.candidate_user_id !== actor.id))) throw new FeedbackJobError("NOT_FOUND");
      if (!["submitted","timed_out"].includes(row.item_status) || (actor.role !== "admin" && (!["submitted","timed_out"].includes(row.session_status) || !["submitted","timed_out"].includes(row.code_status)))) return { status: "withheld" };
      column = "exam_item_id";
    } else {
      const row = (await client.query(`select i.status item_status,a.status attempt_status,a.revoked_at,a.user_id,cs.status subject_status,
        c.email candidate_email,u.email owner_email,u.role owner_role,u.is_active,u.must_change_password
        from public.exam_attempt_items i join public.exam_attempts a on a.id=i.attempt_id
        join public.exam_candidate_subjects cs on cs.id=a.candidate_subject_id join public.exam_candidates c on c.id=cs.candidate_id
        join public.users u on u.id=a.user_id where i.id=$1 for share of i,a,cs,c,u`, [target.legacyAttemptItemId])).rows[0];
      if (!row || row.revoked_at || !row.is_active || row.must_change_password || row.owner_role !== "student"
        || row.candidate_email.toLowerCase() !== row.owner_email.toLowerCase()
        || (actor.role !== "admin" && (actor.role !== "student" || row.user_id !== actor.id))) throw new FeedbackJobError("NOT_FOUND");
      if (row.item_status !== "submitted" || (actor.role !== "admin" && (row.attempt_status !== "submitted" || !["submitted","reviewed"].includes(row.subject_status)))) return { status: "withheld" };
      column = "legacy_attempt_item_id";
    }
    const job = (await client.query(`select status,feedback_json from public.ai_attempt_feedback_jobs where ${column}=$1 and feedback_version=1`, [entries[0][1]])).rows[0];
    if (!job) return { status: "failed" };
    return job.status === "completed" && job.feedback_json ? { status: "completed", feedback: job.feedback_json as AttemptFeedbackReport } : { status: job.status as FeedbackStatus };
  });
}
import { isScenarioParametersModuleId, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { isRecord, sanitizeScenarioExamPayload } from "@/lib/scenario-exams/results";
import { assertSafeJson } from "../scenario-authoring/forms/helpers";

import type { ScenarioRubric } from "../scenario-blueprint/types";

export interface FeedbackJob {
  id: string; attemptToken: string; attempts: number; moduleId: string; definition: unknown;
  rubric: ScenarioRubric | null; payload: Record<string, unknown> | null; practice: boolean;
}
export async function claimFeedbackJob(pool: Pool, workerId: string): Promise<FeedbackJob | null> {
  if (!workerId || workerId.length > 200) throw new FeedbackJobError("INVALID_INPUT");
  return transaction(pool, async client => {
    await client.query(`with expired as (select id from public.ai_attempt_feedback_jobs where status='running'
      and lease_expires_at<=clock_timestamp() and attempts>=max_attempts for update skip locked)
      update public.ai_attempt_feedback_jobs j set status='failed',error_code='ATTEMPTS_EXHAUSTED',lease_expires_at=null,completed_at=clock_timestamp()
      from expired where j.id=expired.id`);
    // Bound the sweep; invalidated work cannot starve the next valid job.
    for (let scanned = 0; scanned < 50; scanned++) {
      const row = (await client.query(`select * from public.ai_attempt_feedback_jobs
        where attempts<max_attempts and ((status='queued' and available_at<=clock_timestamp()) or (status='running' and lease_expires_at<=clock_timestamp()))
        order by available_at,created_at,id for update skip locked limit 1`)).rows[0];
      if (!row) return null;
      if (!await authorizeFeedbackJob(client, row)) continue;
      const token = randomUUID();
      await client.query(`update public.ai_attempt_feedback_jobs set status='running',attempts=attempts+1,attempt_token=$2,worker_id=$3,
        lease_expires_at=clock_timestamp()+interval '2 minutes',error_code=null where id=$1`, [row.id, token, workerId]);
      return { id: row.id, attemptToken: token, attempts: row.attempts + 1, moduleId: row.module_id, definition: row.definition_json,
        rubric: row.assessment_rubric_json, payload: row.payload_json, practice: Boolean(row.practice_submission_id) };
    }
    return null;
  });
}
interface FeedbackJobIdentity { id: string; practice_submission_id: string | null; exam_item_id: string | null; legacy_attempt_item_id: string | null }
/** Hold current authorization rows until the job mutation commits. */
async function authorizeFeedbackJob(client: PoolClient, job: FeedbackJobIdentity): Promise<boolean> {
  let allowed = false;
  if (job.practice_submission_id) {
    allowed = Boolean((await client.query(`select u.id from public.practice_submissions p join public.users u on u.id=p.actor_id
      where p.id=$1 and u.is_active and not u.must_change_password for share of u,p`, [job.practice_submission_id])).rowCount);
  } else if (job.exam_item_id) {
    allowed = Boolean((await client.query(`select u.id from public.scenario_exam_session_items i
      join public.scenario_exam_sessions s on s.id=i.session_id join public.scenario_exam_codes c on c.id=s.code_id
      join public.users u on u.id=s.candidate_user_id
      where i.id=$1 and i.status in ('submitted','timed_out') and s.status<>'revoked' and c.status<>'revoked'
        and c.revoked_at is null and (c.redeem_user_id is null or c.redeem_user_id=u.id) and u.role='student' and u.is_active and not u.must_change_password
      for share of u,s,c,i`, [job.exam_item_id])).rowCount);
  } else if (job.legacy_attempt_item_id) {
    allowed = Boolean((await client.query(`select u.id from public.exam_attempt_items i join public.exam_attempts a on a.id=i.attempt_id
      join public.exam_candidate_subjects cs on cs.id=a.candidate_subject_id join public.exam_candidates c on c.id=cs.candidate_id
      join public.users u on u.id=a.user_id where i.id=$1 and i.status='submitted' and a.revoked_at is null
        and lower(c.email)=lower(u.email) and u.role='student' and u.is_active and not u.must_change_password
      for share of u,a,i,cs,c`, [job.legacy_attempt_item_id])).rowCount);
  }
  if (!allowed) await client.query(`update public.ai_attempt_feedback_jobs set status='failed',error_code='ACTOR_FORBIDDEN',
    lease_expires_at=null,attempt_token=null,completed_at=clock_timestamp() where id=$1`, [job.id]);
  return allowed;
}
async function mutateLeasedJob(pool: Pool, id: string, token: string, sql: string, values: unknown[] = []): Promise<boolean> {
  if (!isFeedbackId(id) || !isFeedbackId(token)) return false;
  return transaction(pool, async client => {
    const job = (await client.query(`select * from public.ai_attempt_feedback_jobs where id=$1 and attempt_token=$2
      and status='running' and lease_expires_at>clock_timestamp() for update`, [id, token])).rows[0];
    if (!job || !await authorizeFeedbackJob(client, job)) return false;
    // Recheck time after waiting for authorization locks.
    return Boolean((await client.query(`${sql} where id=$1 and attempt_token=$2 and status='running'
      and lease_expires_at>clock_timestamp() returning id`, [id, token, ...values])).rowCount);
  });
}
export async function heartbeatFeedbackJob(pool: Pool, id: string, token: string): Promise<boolean> {
  return mutateLeasedJob(pool, id, token, `update public.ai_attempt_feedback_jobs set lease_expires_at=clock_timestamp()+interval '2 minutes'`);
}
export async function completeFeedbackJob(pool: Pool, id: string, token: string, feedback: AttemptFeedbackReport): Promise<boolean> {
  return mutateLeasedJob(pool, id, token, `update public.ai_attempt_feedback_jobs set status='completed',feedback_json=$3,
    completed_at=clock_timestamp(),lease_expires_at=null,error_code=null`, [feedback]);
}
export async function failFeedbackJob(pool: Pool, id: string, token: string): Promise<boolean> {
  return mutateLeasedJob(pool, id, token, `update public.ai_attempt_feedback_jobs set status=case when attempts<max_attempts then 'queued' else 'failed' end,
    error_code='FEEDBACK_UNAVAILABLE',lease_expires_at=null,available_at=clock_timestamp()+interval '30 seconds',
    completed_at=case when attempts>=max_attempts then clock_timestamp() else null end`);
}

export class FeedbackJobError extends Error {
  constructor(public readonly code: string) { super(code); this.name = "FeedbackJobError"; }
}
export const isFeedbackId = (id: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);
export interface PracticeSubmissionInput { moduleId: ScenarioParametersModuleId; scenarioId: string; payload: Record<string, unknown> | null }
export type FeedbackStatus = "queued" | "running" | "completed" | "failed";
async function transaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { await client.query("begin"); const result = await work(client); await client.query("commit"); return result; }
  catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
async function requireActor(client: PoolClient, id: string) {
  const actor = (await client.query("select id,role,email from public.users where id=$1 and is_active and not must_change_password for share", [id])).rows[0];
  if (!actor) throw new FeedbackJobError("ACTOR_FORBIDDEN");
  return actor as { id: string; role: string; email: string };
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export async function createPracticeSubmission(pool: Pool, actorId: string, idempotencyKey: string, input: PracticeSubmissionInput) {
  if (!isFeedbackId(actorId) || !/^[A-Za-z0-9._:-]{1,128}$/.test(idempotencyKey) || !isScenarioParametersModuleId(input.moduleId)
    || !input.scenarioId || input.scenarioId.length > 200 || (input.payload !== null && !isRecord(input.payload))) throw new FeedbackJobError("INVALID_INPUT");
  try { assertSafeJson(input); } catch { throw new FeedbackJobError("INVALID_INPUT"); }
  const payload = sanitizeScenarioExamPayload(input.payload);
  const serialized = JSON.stringify(canonical({ ...input, payload }));
  if (Buffer.byteLength(serialized) > 500_000) throw new FeedbackJobError("INVALID_INPUT");
  const hash = createHash("sha256").update(serialized).digest("hex");
  return transaction(pool, async client => {
    await requireActor(client, actorId);
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`practice-feedback:${actorId}`]);
    const prior = (await client.query(`select s.id,s.input_hash,j.id job_id,j.status from public.practice_submissions s
      join public.ai_attempt_feedback_jobs j on j.practice_submission_id=s.id where s.actor_id=$1 and s.idempotency_key=$2`, [actorId, idempotencyKey])).rows[0];
    if (prior) {
      if (prior.input_hash !== hash) throw new FeedbackJobError("IDEMPOTENCY_CONFLICT");
      return { submissionId: prior.id as string, jobId: prior.job_id as string, status: prior.status as FeedbackStatus };
    }
    const quota = (await client.query(`select count(*) filter (where s.submitted_at>=clock_timestamp()-interval '24 hours')::int daily,
      count(*) filter (where j.status in ('queued','running'))::int active
      from public.practice_submissions s join public.ai_attempt_feedback_jobs j on j.practice_submission_id=s.id
      where s.actor_id=$1`, [actorId])).rows[0];
    if (quota.daily >= 50) throw new FeedbackJobError("DAILY_QUOTA");
    if (quota.active >= 2) throw new FeedbackJobError("ACTIVE_QUOTA");
    const membership = (await client.query(`select * from public.simulator_scenario_library_memberships
      where module_id=$1 and library_kind='practice' and archived_at is null and (scenario_id=$2 or scenario_parameters_id::text=$2)
      order by published_at desc,id limit 1 for share`, [input.moduleId, input.scenarioId])).rows[0];
    if (!membership) throw new FeedbackJobError("NOT_FOUND");
    const submission = (await client.query(`insert into public.practice_submissions(actor_id,module_id,scenario_id,library_membership_id,library_revision_number,definition_json,assessment_rubric_json,payload_json,input_hash,idempotency_key)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`, [actorId, input.moduleId, membership.scenario_id, membership.id, membership.revision_number, membership.definition_json, membership.assessment_rubric_json, payload, hash, idempotencyKey])).rows[0];
    const job = (await client.query("select id,status from public.ai_attempt_feedback_jobs where practice_submission_id=$1", [submission.id])).rows[0];
    if (!job) throw new FeedbackJobError("PERSISTENCE_FAILED");
    return { submissionId: submission.id as string, jobId: job.id as string, status: job.status as FeedbackStatus };
  });
}
