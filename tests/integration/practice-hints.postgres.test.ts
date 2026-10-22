// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
const testUrl = process.env.SCENARIO_EXAM_TEST_DATABASE_URL;
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
describe.skipIf(!testUrl)("durable practice hint queue (isolated PostgreSQL)", () => {
  const name = `cns_hints_test_${randomUUID().replaceAll("-", "")}`;
  let control: Client, pool: Pool, created = false;
  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (!/^(postgres|postgresql):$/.test(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/cns_scenario_exams_test" || url.search || url.hash) throw new Error("Explicit isolated loopback endpoint required");
    control = new Client({ connectionString: url.href }); await control.connect();
    expect((await control.query("select current_database() name")).rows[0].name).toBe("cns_scenario_exams_test");
    await control.query(`create database "${name}"`); created = true; url.pathname = `/${name}`;
    pool = new Pool({ connectionString: url.href, max: 5 });
    for (const file of (await readdir(resolve("database/migrations"))).filter(f => /^\d+_.*\.sql$/.test(f)).sort()) {
      await pool.query(await readFile(resolve("database/migrations", file), "utf8"));
      if (file.startsWith("0001_")) for (const [id, role] of [[owner, "admin"], [other, "student"]]) await pool.query(`insert into public.users(id,username,email,password_hash,full_name,work_unit,role,must_change_password) values($1,$2,$3,'non-login-fixture','Test','Lab',$2,false)`, [id, role, `${role}@attech.com.vn`]);
    }
  }, 30000);
  afterAll(async () => { await pool?.end(); if (created) await control?.query(`drop database "${name}"`); await control?.end(); });
  async function published(kind = "practice") {
    const definition = { ...createDefaultDvor1150aScenarioDefinition(), id: `hint-${randomUUID()}` };
    const source = (await pool.query(`insert into public.simulator_scenario_parameters(module_id,scenario_id,name,description,difficulty,schema_version,definition_json,created_by) values('dvor-1150a',$1,$2,'','basic',1,$3,$4) returning id`, [definition.id, definition.name, definition, owner])).rows[0];
    const membership = (await pool.query(`insert into public.simulator_scenario_library_memberships(module_id,scenario_parameters_id,library_kind,revision_number,scenario_id,name,description,difficulty,schema_version,definition_json,published_by,sort_order) values('dvor-1150a',$1,$2,1,$3,$4,'','basic',1,$5,$6,(select coalesce(max(sort_order),0)+1 from public.simulator_scenario_library_memberships where library_kind=$2)) returning id`, [source.id, kind, definition.id, definition.name, definition, owner])).rows[0];
    return { definition, source, membership };
  }
  it("fences concurrent claims/reclaims, retries and current publication/actor revocation", async () => {
    const q = await import("@/lib/ai/feedback/practice-hints");
    await pool.query("update public.ai_practice_hint_jobs set status='failed'");
    const f = await published();
    const input = { moduleId: "dvor-1150a" as const, scenarioId: f.definition.id, runKey: "run", payload: {} };
    const created = await q.createPracticeHint(pool, owner, randomUUID(), input);
    const claims = await Promise.all([q.claimPracticeHint(pool,"one"), q.claimPracticeHint(pool,"two")]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const first=claims.find(Boolean)!;
    await pool.query("update public.ai_practice_hint_jobs set lease_expires_at=now()-interval '1 second' where id=$1",[created.jobId]);
    const second=(await q.claimPracticeHint(pool,"recovery"))!;
    expect(second.id).toBe(first.id); expect(second.attemptToken).not.toBe(first.attemptToken);
    const result={sourceMode:"deterministic-only" as const,summary:"Safe",nextSteps:["Safe"],notice:"Not a grade"};
    expect(await q.completePracticeHint(pool,first.id,first.attemptToken,result)).toBe(false);
    expect(await q.heartbeatPracticeHint(pool,first.id,first.attemptToken)).toBe(false);
    await pool.query("update public.simulator_scenario_library_memberships set archived_at=now() where id=$1",[f.membership.id]);
    expect(await q.completePracticeHint(pool,second.id,second.attemptToken,result)).toBe(false);
    await expect(q.readPracticeHint(pool,owner,created.jobId)).rejects.toMatchObject({code:"NOT_FOUND"});
    const active = await published();
    const job=await q.createPracticeHint(pool,owner,randomUUID(),{...input,scenarioId:active.definition.id});
    const claimed=(await q.claimPracticeHint(pool,"revoked"))!;
    await pool.query("update public.users set is_active=false where id=$1",[owner]);
    try { expect(await q.heartbeatPracticeHint(pool,job.jobId,claimed.attemptToken)).toBe(false); await expect(q.readPracticeHint(pool,owner,job.jobId)).rejects.toMatchObject({code:"ACTOR_FORBIDDEN"}); }
    finally { await pool.query("update public.users set is_active=true where id=$1",[owner]); }
  });
  it("runs the real durable worker path on frozen native input and persists safe provider failure fallback", async () => {
    const q=await import("@/lib/ai/feedback/practice-hints"), worker=await import("@/lib/ai/feedback/practice-hints-worker");
    await pool.query("update public.ai_practice_hint_jobs set status='failed'");
    const f=await published();
    for(const failing of [false,true]) {
      const job=await q.createPracticeHint(pool,owner,randomUUID(),{moduleId:"dvor-1150a",scenarioId:f.definition.id,runKey:"real-worker",payload:{}});
      await pool.query("update public.simulator_scenario_parameters set definition_json=$2 where id=$1",[f.source.id,{...f.definition,name:"Mutable changed source"}]);
      const calls: string[]=[];
      expect(await worker.runNextPracticeHint(pool,"actual-worker",undefined,{provider:async messages=>{calls.push(JSON.stringify(messages));if(failing)throw Error("raw private provider error");return {nextStepIds:["next-0"]};}})).toBe("completed");
      expect(calls).toHaveLength(1);expect(calls[0]).not.toContain("Mutable changed source");
      const read=await q.readPracticeHint(pool,owner,job.jobId);
      expect(read).toMatchObject({status:"completed",result:{sourceMode:failing?"deterministic-only":"ai-assisted"}});
      expect(JSON.stringify(read)).not.toMatch(/raw private|definition_json|assessment_rubric_json/);
    }
  });
  it("bounds infrastructure retries and exhausts crashed claims", async()=>{
    const q=await import("@/lib/ai/feedback/practice-hints");
    await pool.query("delete from public.ai_practice_hint_jobs");
    const f=await published();
    const job=await q.createPracticeHint(pool,owner,randomUUID(),{moduleId:"dvor-1150a",scenarioId:f.definition.id,runKey:"retry",payload:{}});
    for(let n=0;n<3;n++){
      const claim=(await q.claimPracticeHint(pool,"retry-worker"))!;expect(claim.id).toBe(job.jobId);
      expect(await q.failPracticeHint(pool,claim.id,claim.attemptToken)).toBe(true);
      await pool.query("update public.ai_practice_hint_jobs set available_at=now()-interval '1 second' where id=$1",[job.jobId]);
    }
    expect(await q.claimPracticeHint(pool,"exhausted")).toBeNull();expect(await q.readPracticeHint(pool,owner,job.jobId)).toMatchObject({status:"failed"});
    const crashed=await q.createPracticeHint(pool,owner,randomUUID(),{moduleId:"dvor-1150a",scenarioId:f.definition.id,runKey:"crash",payload:{}});
    for(let n=0;n<3;n++){expect((await q.claimPracticeHint(pool,"crash"))?.id).toBe(crashed.jobId);await pool.query("update public.ai_practice_hint_jobs set lease_expires_at=now()-interval '1 second' where id=$1",[crashed.jobId]);}
    expect(await q.claimPracticeHint(pool,"crash-exhausted")).toBeNull();expect(await q.readPracticeHint(pool,owner,crashed.jobId)).toMatchObject({status:"failed"});
  });
  it("serializes per-actor quota while retries do not consume a second slot", async()=>{
    const q=await import("@/lib/ai/feedback/practice-hints");
    await pool.query("delete from public.ai_practice_hint_jobs");
    const f=await published(), input={moduleId:"dvor-1150a" as const,scenarioId:f.definition.id,runKey:"quota",payload:{}};
    const keys=[randomUUID(),randomUUID(),randomUUID(),randomUUID()];
    const results=await Promise.allSettled(keys.map(key=>q.createPracticeHint(pool,owner,key,input)));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(3);
    expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
    expect((results.find(r=>r.status==='rejected') as PromiseRejectedResult).reason).toMatchObject({code:"QUOTA_EXCEEDED"});
    for(let n=3;n<12;n++){await pool.query("update public.ai_practice_hint_jobs set status='failed'");await q.createPracticeHint(pool,owner,randomUUID(),input);}
    await pool.query("update public.ai_practice_hint_jobs set status='failed'");
    await expect(q.createPracticeHint(pool,owner,randomUUID(),input)).rejects.toMatchObject({code:"QUOTA_EXCEEDED"});
    const first=results.findIndex(r=>r.status==='fulfilled');
    expect(await q.createPracticeHint(pool,owner,keys[first],input)).toMatchObject({status:"failed"});
  });
  it("freezes sanitized published input once, without fabricating a submission", async () => {
    const q = await import("@/lib/ai/feedback/practice-hints");
    await pool.query("delete from public.ai_practice_hint_jobs");
    const f = await published(), key = randomUUID();
    const mismatch = { moduleId:"dvor-1150a" as const,scenarioId:f.definition.id,runKey:"bound",payload:{},libraryMembershipId:randomUUID() };
    await expect(q.createPracticeHint(pool,owner,randomUUID(),mismatch)).rejects.toMatchObject({code:"PUBLICATION_CHANGED"});
    expect(await q.createPracticeHint(pool,owner,randomUUID(),{...mismatch,libraryMembershipId:f.membership.id})).toMatchObject({status:"queued"});
    const input = { moduleId: "dvor-1150a" as const, scenarioId: f.definition.id, runKey: "run-1", question: "Kiểm tra gì?", payload: { password: "private", note: "Password:\nprivate", definition: { answer: "private" }, checkpoint: { value: 1 } } };
    const first = await q.createPracticeHint(pool, owner, key, input);
    expect(await q.createPracticeHint(pool, owner, key, input)).toEqual(first);
    expect(await q.readPracticeHint(pool, owner, first.jobId)).toEqual({ jobId: first.jobId, status: "queued" });
    await expect(q.readPracticeHint(pool, other, first.jobId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const stored = (await pool.query("select * from public.ai_practice_hint_jobs where id=$1", [first.jobId])).rows[0];
    expect(stored.definition_json).toEqual(f.definition);
    expect(JSON.stringify(stored.payload_json)).not.toMatch(/private|password|definition/i);
    expect((await pool.query("select count(*)::int n from public.practice_submissions")).rows[0].n).toBe(0);
    await expect(q.createPracticeHint(pool, owner, key, { ...input, runKey: "run-2" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    await expect(q.createPracticeHint(pool, owner, key, { ...input, payload: { value: 2 } })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    const exam = await published("exam");
    await expect(q.createPracticeHint(pool, owner, randomUUID(), { ...input, scenarioId: exam.definition.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(q.createPracticeHint(pool, owner, randomUUID(), { ...input, scenarioId: "unpublished" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
