import type { Pool, PoolClient } from "pg";

/** No web/auth imports: the durable worker uses the same transaction primitive. */
export interface LockedScenarioExamSession {
  id: string;
  code_id: string;
  exam_id: string;
  status: string;
  code_status: string;
  deadline_at: string;
  expired: boolean;
}

export async function lockOwnedScenarioExamSession(client: PoolClient, tokenHash: string, actorId: string): Promise<LockedScenarioExamSession | null> {
  const result = await client.query<LockedScenarioExamSession>(
    `select s.id,s.code_id,c.exam_id,s.status,c.status code_status,s.deadline_at,
            s.deadline_at<=clock_timestamp() expired
       from public.scenario_exam_sessions s
       join public.scenario_exam_codes c on c.id=s.code_id
       join public.users u on u.id=s.candidate_user_id
      where s.session_token_hash=$1 and s.candidate_user_id=$2
        and (c.redeem_user_id is null or c.redeem_user_id=s.candidate_user_id)
        and u.role='student' and u.is_active and not u.must_change_password
        and s.status<>'revoked' and c.status<>'revoked' and c.revoked_at is null
      for update of s,c for share of u`, [tokenHash, actorId],
  );
  return result.rows[0] ?? null;
}

/** Caller holds session/code locks. The item trigger inserts the frozen outbox
 * in this transaction. Never create an exercise or accept a late final payload. */
export async function finalizeExpiredScenarioExamSession(client: PoolClient, session: LockedScenarioExamSession, actorId: string | null = null): Promise<boolean> {
  if (session.status !== "in_progress" || session.code_status !== "in_progress") return false;
  // Recheck database time after any lock wait; client clocks grant no authority.
  const due = await client.query("select 1 from public.scenario_exam_sessions where id=$1 and deadline_at<=clock_timestamp()", [session.id]);
  if (!due.rowCount) return false;
  await client.query(`update public.scenario_exam_session_items set status='timed_out',submitted_at=now(),updated_at=now()
    where session_id=$1 and status='in_progress'`, [session.id]);
  await client.query(`update public.scenario_exam_code_subjects set status='timed_out',submitted_at=now(),updated_at=now()
    where code_id=$1 and status in ('not_started','in_progress')`, [session.code_id]);
  await client.query(`update public.scenario_exam_sessions set status='timed_out',submitted_at=now(),terminal_reason='timed_out',updated_at=now()
    where id=$1`, [session.id]);
  await client.query("update public.scenario_exam_codes set status='timed_out',terminal_at=now(),updated_at=now() where id=$1", [session.code_id]);
  await client.query(`insert into public.scenario_exam_audit_events(exam_id,code_id,session_id,actor_user_id,event_type)
    values($1,$2,$3,$4,'session_timed_out')`, [session.exam_id, session.code_id, session.id, actorId]);
  session.status = "timed_out";
  session.code_status = "timed_out";
  session.expired = true;
  return true;
}

/** Bounded, restart-safe sweep also works after the browser/cookie is gone. */
export async function sweepExpiredScenarioExamSessions(pool: Pool, limit = 25, signal?: AbortSignal): Promise<number> {
  if (signal?.aborted) return 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("INVALID_EXPIRY_LIMIT");
  const client = await pool.connect();
  try {
    await client.query("begin");
    const sessions = await client.query<LockedScenarioExamSession>(`select s.id,s.code_id,c.exam_id,s.status,c.status code_status,s.deadline_at,true expired
      from public.scenario_exam_sessions s join public.scenario_exam_codes c on c.id=s.code_id
      where s.status='in_progress' and c.status='in_progress' and c.revoked_at is null
        and s.deadline_at<=clock_timestamp()
        and s.candidate_user_id is not null and (c.redeem_user_id is null or c.redeem_user_id=s.candidate_user_id)
      order by s.deadline_at,s.id limit $1 for update of s,c skip locked`, [limit]);
    let count = 0;
    for (const session of sessions.rows) {
      if (signal?.aborted) { await client.query("rollback"); return 0; }
      if (await finalizeExpiredScenarioExamSession(client, session)) count++;
    }
    if (signal?.aborted) { await client.query("rollback"); return 0; }
    await client.query("commit");
    return count;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}
