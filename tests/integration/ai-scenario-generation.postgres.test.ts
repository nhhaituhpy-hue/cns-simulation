// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFile, readdir, mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createGenerationJob, getGenerationJob, listGenerationJobs, claimGenerationJob, heartbeatGenerationJob, completeGenerationJob, failGenerationJob, generationInputHash } from "@/lib/ai/scenario-generation/jobs";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { DEFAULT_SCENARIOS } from "@/stores/default-scenarios";
import { parseScenarioParameters } from "@/lib/scenario-parameters";
import { mapRowToScenario } from "@/lib/supabase/scenarios";
import { isScenario } from "@/lib/storage";
import { POST, GET } from "@/app/api/ai/scenario-jobs/route";
import { GET as pollJob } from "@/app/api/ai/scenario-jobs/[jobId]/route";
import { hashSessionToken, sessionCookieName } from "@/lib/auth/session";
const cookieJar = vi.hoisted(() => new Map<string,string>());
vi.mock("next/headers", () => ({ cookies: async () => ({get:(key:string) => cookieJar.has(key) ? {value:cookieJar.get(key)} : undefined}) }));
const actorId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const input = { moduleId: "dvor-1150a" as const, name: "Generated source", description: "Examiner must review", difficulty: "basic" as const };
const provenance = { promptVersion: "test-v1", schemaVersion: "test-v1", model: "offline-fixture", evidence: [] };
it("hashes equivalent document manifests without private storage identity", () => {
  const document = { id: randomUUID(), name: "manual.txt", mimeType: "text/plain", bytes: 12, sha256: "a".repeat(64), storageKey: "private/first" };
  expect(generationInputHash(input, [document])).toBe(generationInputHash(input, [{ ...document, id: randomUUID(), storageKey: "private/second" }]));
  expect(generationInputHash(input)).not.toBe(generationInputHash({ ...input, name: "different" }));
});
const testUrl = process.env.SCENARIO_EXAM_TEST_DATABASE_URL;
describe.skipIf(!testUrl)("durable AI queue in isolated PostgreSQL", () => {
  const databaseName = `cns_ai_test_${randomUUID().replaceAll("-", "")}`;
  let control: Client | undefined; let pool: Pool; let created = false; let storageDir = "";
  const previousPool = globalThis.cnsSimulatorDatabasePool;
  const previousEnabled = process.env.CNS_AI_ENABLED; const previousStorage = process.env.CNS_AI_STORAGE_DIR;
  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (!/^(postgres|postgresql):$/.test(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/cns_scenario_exams_test" || url.search || url.hash) throw new Error("Use explicit loopback cns_scenario_exams_test endpoint without URL options.");
    control = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 }); await control.connect();
    expect((await control.query("select current_database() name")).rows[0].name).toBe("cns_scenario_exams_test");
    await control.query(`create database "${databaseName}"`); created = true;
    url.pathname = `/${databaseName}`; pool = new Pool({ connectionString: url.href, max: 6, connectionTimeoutMillis: 5000 });
    globalThis.cnsSimulatorDatabasePool = pool;
    storageDir=await mkdtemp("/opt/data/cache/scratch/cns-ai-job-test-"); process.env.CNS_AI_STORAGE_DIR=storageDir; process.env.CNS_AI_ENABLED="true";
    for (const file of (await readdir(resolve("database/migrations"))).filter(name => /^\d+_.*\.sql$/.test(name)).sort()) {
      await pool.query(await readFile(resolve("database/migrations", file), "utf8"));
      if (file === "0001_users_and_sessions.sql") for (const [id, role] of [[actorId, "admin"], [otherId, "student"]]) await pool.query(`insert into public.users (id,username,email,password_hash,full_name,work_unit,role,must_change_password) values ($1,$2,$3,'non-login-fixture','Test','Lab',$4,false)`, [id, `test-${role}`, `${role}@attech.com.vn`, role]);
    }
    await pool.query("insert into public.exam_modules (code,name) values ('ads-b','ADS-B')");
  }, 30000);
  afterAll(async () => { globalThis.cnsSimulatorDatabasePool = previousPool; if(previousEnabled===undefined)delete process.env.CNS_AI_ENABLED;else process.env.CNS_AI_ENABLED=previousEnabled;if(previousStorage===undefined)delete process.env.CNS_AI_STORAGE_DIR;else process.env.CNS_AI_STORAGE_DIR=previousStorage;if(storageDir)await rm(storageDir,{recursive:true,force:true});await pool?.end(); if (created) await control?.query(`drop database "${databaseName}"`); await control?.end(); });
  beforeEach(async () => { cookieJar.clear();await pool.query("delete from public.ai_scenario_generation_jobs"); await pool.query("update public.users set role = 'admin', is_active = true where id = $1", [actorId]); });
  it("serializes concurrent idempotent submissions and scopes ownership", async () => {
    const options = { actorId, idempotencyKey: randomUUID() };
    const [first, again] = await Promise.all([createGenerationJob(pool,input,options),createGenerationJob(pool,input,options)]);
    expect(first.id).toBe(again.id); expect(first.status).toBe("queued");
    expect(await getGenerationJob(pool,first.id,otherId)).toBeNull();
    expect((await listGenerationJobs(pool,actorId,{ moduleId: input.moduleId, status: "queued" })).map(j => j.id)).toEqual([first.id]);
    await expect(createGenerationJob(pool,{...input,name:"different"},options)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("enforces active admin role and quota under concurrent submissions", async () => {
    await expect(createGenerationJob(pool,input,{actorId:otherId,idempotencyKey:randomUUID()})).rejects.toMatchObject({code:"ACTOR_FORBIDDEN"});
    const results = await Promise.allSettled(Array.from({length:3}, () => createGenerationJob(pool,input,{actorId,idempotencyKey:randomUUID()})));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(2);
    expect(results.filter(r => r.status === "rejected")).toMatchObject([{reason:{code:"ACTIVE_QUOTA"}}]);
  });
  it("atomically claims once and fences an expired attempt after restart", async () => {
    const job = await createGenerationJob(pool,input,{actorId,idempotencyKey:randomUUID()});
    const claims = await Promise.all([claimGenerationJob(pool,"worker-1"),claimGenerationJob(pool,"worker-2")]);
    expect(claims.filter(Boolean)).toHaveLength(1); const first = claims.find(Boolean)!;
    expect(await heartbeatGenerationJob(pool,job.id,first.attemptToken!,"generating")).toBeTruthy();
    await pool.query("update public.ai_scenario_generation_jobs set lease_expires_at=now()-interval '1 minute' where id=$1",[job.id]);
    const second = (await claimGenerationJob(pool,"worker-restarted"))!;
    expect(second.attempts).toBe(2); expect(second.attemptToken).not.toBe(first.attemptToken);
    expect(await heartbeatGenerationJob(pool,job.id,first.attemptToken!,"validating")).toBeNull();
    await expect(completeGenerationJob(pool,job.id,first.attemptToken!,{definition:createDefaultDvor1150aScenarioDefinition(),provenance})).rejects.toMatchObject({code:"STALE_ATTEMPT"});
    expect(await failGenerationJob(pool,job.id,first.attemptToken!,{code:"PROVIDER_ERROR",message:"Bearer secret"})).toBeNull();
    await pool.query("update public.ai_scenario_generation_jobs set lease_expires_at=now()-interval '1 minute' where id=$1",[job.id]);
    expect(await claimGenerationJob(pool,"worker-third")).toBeNull();
    expect(await getGenerationJob(pool,job.id,actorId)).toMatchObject({status:"failed",errorCode:"ATTEMPTS_EXHAUSTED",attempts:2});
  });
  it("completes once with server identities and no published membership", async () => {
    const job = await createGenerationJob(pool,input,{actorId,idempotencyKey:randomUUID()}); const claim = (await claimGenerationJob(pool,"worker"))!;
    const definition=createDefaultDvor1150aScenarioDefinition();
    const result=await completeGenerationJob(pool,job.id,claim.attemptToken!,{definition,provenance});
    expect(result).toMatchObject({status:"completed"}); expect(result.scenarioId).not.toBe(definition.id);
    expect(await completeGenerationJob(pool,job.id,claim.attemptToken!,{definition,provenance})).toMatchObject({scenarioId:result.scenarioId,scenarioRowId:result.scenarioRowId});
    const rows=await pool.query("select * from public.simulator_scenario_parameters where id=$1",[result.scenarioRowId]);
    expect(rows.rows).toHaveLength(1); expect(rows.rows[0]).toMatchObject({created_by:actorId,scenario_id:result.scenarioId,revision:1});
    expect(rows.rows[0].definition_json.id).toBe(result.scenarioId);
    expect((await pool.query("select * from public.simulator_scenario_library_memberships where scenario_parameters_id=$1",[result.scenarioRowId])).rows).toEqual([]);
    expect((await pool.query("select * from public.simulator_review_scenario_assignments where scenario_parameters_id=$1",[result.scenarioRowId])).rows).toEqual([]);
  });
  it("returns only bounded persisted parameter review to its authenticated owner", async () => {
    const job=await createGenerationJob(pool,input,{actorId,idempotencyKey:randomUUID()});const claim=(await claimGenerationJob(pool,"parameter-review-worker"))!;
    const parameters={version:2,initial:[{fieldId:"configuration.transmitters.tx1.nominal.outputPower",label:"TX1 output power",value:12,unit:"W",citation:0}],recovery:[{fieldId:"configuration.transmitters.tx1.nominal.outputPower",value:70,unit:"W",citation:1}],verification:{mode:"engine-recovery",initial:[{id:"fault",passed:true,detail:"Initial fault"}],recovered:[{id:"normal",passed:true,detail:"Recovered"}],recoveryVerified:true,notes:[]},configuredFieldCount:15};
    await completeGenerationJob(pool,job.id,claim.attemptToken!,{definition:createDefaultDvor1150aScenarioDefinition(),provenance:{...provenance,parameters,privateStorageKey:"/private/path",providerSecret:"must-not-leak"}});
    const token=randomUUID();await pool.query("insert into public.user_sessions(user_id,token_hash,expires_at) values($1,$2,now()+interval '1 hour')",[actorId,hashSessionToken(token)]);cookieJar.set(sessionCookieName(),token);
    const response=await pollJob(new Request("http://localhost"),{params:Promise.resolve({jobId:job.id})});expect(response.status).toBe(200);const body=await response.json();
    expect(body.job.parameterReview).toMatchObject({version:2,initial:[{fieldId:"configuration.transmitters.tx1.nominal.outputPower",value:12,unit:"W"}],verification:{recoveryVerified:true}});
    expect(JSON.stringify(body)).not.toMatch(/must-not-leak|privateStorageKey|providerSecret|configuredFieldCount|citation/);
  });
  it("rechecks demoted initiator before writing any source", async () => {
    const job=await createGenerationJob(pool,input,{actorId,idempotencyKey:randomUUID()}); const claim=(await claimGenerationJob(pool,"worker"))!;
    await pool.query("update public.users set role='student' where id=$1",[actorId]);
    await expect(completeGenerationJob(pool,job.id,claim.attemptToken!,{definition:createDefaultDvor1150aScenarioDefinition(),provenance})).rejects.toMatchObject({code:"ACTOR_FORBIDDEN"});
    expect((await getGenerationJob(pool,job.id,actorId))?.scenarioRowId).toBeNull();
  });
  it("does not send a demoted actor's queued documents to the worker", async () => {
    const job=await createGenerationJob(pool,input,{actorId,idempotencyKey:randomUUID()});
    await pool.query("update public.users set is_active=false where id=$1",[actorId]);
    expect(await claimGenerationJob(pool,"worker-after-revocation")).toBeNull();
    expect(await getGenerationJob(pool,job.id,actorId)).toMatchObject({status:"failed",errorCode:"ACTOR_FORBIDDEN",attempts:0});
  });
  it("maps valid ADS-B to canonical and strict legacy source atomically", async () => {
    const adsbInput={...input,moduleId:"ads-b" as const}; const job=await createGenerationJob(pool,adsbInput,{actorId,idempotencyKey:randomUUID()}); const claim=(await claimGenerationJob(pool,"worker"))!;
    const definition=parseScenarioParameters("ads-b",DEFAULT_SCENARIOS[0])!;
    const done=await completeGenerationJob(pool,job.id,claim.attemptToken!,{definition,provenance});
    const legacy=mapRowToScenario((await pool.query("select * from public.scenarios where id=$1",[done.scenarioId])).rows[0]);
    expect(isScenario(legacy)).toBe(true); expect(legacy.id).toBe(done.scenarioId);
    expect((await pool.query("select definition_json from public.simulator_scenario_parameters where id=$1",[done.scenarioRowId])).rows[0].definition_json.sites).toEqual(legacy.sites);
    expect((await pool.query("select * from public.simulator_scenario_library_memberships where scenario_id=$1",[done.scenarioId])).rows).toEqual([]);
  });
  it("rejects lax ADS-B nested fields and rolls canonical insert back on legacy conflict", async () => {
    const job=await createGenerationJob(pool,{...input,moduleId:"ads-b"},{actorId,idempotencyKey:randomUUID()});const claim=(await claimGenerationJob(pool,"worker"))!;
    const definition=parseScenarioParameters("ads-b",DEFAULT_SCENARIOS[0])!;
    const broken=structuredClone(definition); if(broken.sites[0].sensorA)broken.sites[0].sensorA.status="invented" as never; if(broken.sites[0].sensorB)broken.sites[0].sensorB.status="invented" as never;
    await expect(completeGenerationJob(pool,job.id,claim.attemptToken!,{definition:broken,provenance})).rejects.toMatchObject({code:"INVALID_DEFINITION"});
    const before=Number((await pool.query("select count(*) total from public.simulator_scenario_parameters")).rows[0].total);
    await pool.query("alter table public.scenarios add constraint ai_test_reject check (title <> 'Generated source') not valid");
    try { await expect(completeGenerationJob(pool,job.id,claim.attemptToken!,{definition,provenance})).rejects.toThrow(); expect((await getGenerationJob(pool,job.id,actorId))?.scenarioRowId).toBeNull(); }
    finally { await pool.query("alter table public.scenarios drop constraint ai_test_reject"); }
    expect(Number((await pool.query("select count(*) total from public.simulator_scenario_parameters")).rows[0].total)).toBe(before);
  });
  it("uses a real session and multipart upload; duplicate/polling never leaks or publishes", async () => {
    const token=randomUUID();await pool.query("insert into public.user_sessions(user_id,token_hash,expires_at) values($1,$2,now()+interval '1 hour')",[actorId,hashSessionToken(token)]);cookieJar.set(sessionCookieName(),token);
    const form=new FormData();for(const [key,value]of Object.entries(input))form.set(key,value);form.append("files",new File(["Approved training evidence for examiner review."],"manual.txt",{type:"text/plain"}));
    const send=()=>POST(new Request("http://localhost/api/ai/scenario-jobs",{method:"POST",headers:{origin:"http://localhost","idempotency-key":"multipart-session-test"},body:form}));
    const response=await send();expect(response.status).toBe(202);const body=await response.json();expect(body.job.documents).toHaveLength(1);expect(body.job.documents[0]).toMatchObject({name:"manual.txt",mimeType:"text/plain"});
    expect(JSON.stringify(body)).not.toMatch(/storageKey|attemptToken|private|promptVersion|input_json|actorId|provenance/);
    expect((await (await send()).json()).job.id).toBe(body.job.id);
    const dirs=await readdir(storageDir);expect(dirs).toEqual([body.job.id]);
    const document=(await getGenerationJob(pool,body.job.id,actorId))!.documents[0];expect(await readFile(resolve(storageDir,document.storageKey),"utf8")).toBe("Approved training evidence for examiner review.");
    const before=(await getGenerationJob(pool,body.job.id,actorId))!.updatedAt;process.env.CNS_AI_ENABLED="false";
    expect((await GET(new Request("http://localhost/api/ai/scenario-jobs?moduleId=dvor-1150a&status=queued"))).status).toBe(200);
    expect((await pollJob(new Request("http://localhost"),{params:Promise.resolve({jobId:body.job.id})})).status).toBe(200);
    expect((await getGenerationJob(pool,body.job.id,actorId))!.updatedAt).toBe(before);process.env.CNS_AI_ENABLED="true";
    await pool.query("update public.users set role='admin' where id=$1",[otherId]);const otherToken=randomUUID();await pool.query("insert into public.user_sessions(user_id,token_hash,expires_at) values($1,$2,now()+interval '1 hour')",[otherId,hashSessionToken(otherToken)]);cookieJar.set(sessionCookieName(),otherToken);
    expect((await pollJob(new Request("http://localhost"),{params:Promise.resolve({jobId:body.job.id})})).status).toBe(404);
    await pool.query("update public.users set role='student' where id=$1",[otherId]);
  });
  it("uses an explicitly configured public origin behind the trusted reverse proxy", async () => {
    const token=randomUUID();await pool.query("insert into public.user_sessions(user_id,token_hash,expires_at) values($1,$2,now()+interval '1 hour')",[actorId,hashSessionToken(token)]);cookieJar.set(sessionCookieName(),token);
    const previous=process.env.CNS_PUBLIC_ORIGIN;process.env.CNS_PUBLIC_ORIGIN="https://labs.cnsvn.com";
    const form=new FormData();for(const [key,value]of Object.entries(input))form.set(key,value);
    try {
      const response=await POST(new Request("http://localhost:3000/api/ai/scenario-jobs",{method:"POST",headers:{origin:"https://labs.cnsvn.com","idempotency-key":"trusted-public-origin"},body:form}));
      expect(response.status).toBe(202);
      const hostile=await POST(new Request("http://localhost:3000/api/ai/scenario-jobs",{method:"POST",headers:{origin:"https://attacker.invalid","x-forwarded-host":"attacker.invalid","idempotency-key":"hostile-origin"},body:form}));
      expect(hostile.status).toBe(403);
    } finally {if(previous===undefined)delete process.env.CNS_PUBLIC_ORIGIN;else process.env.CNS_PUBLIC_ORIGIN=previous;}
  });
  it("bounds public failures and retries only within the attempt budget", async () => {
    const job=await createGenerationJob(pool,input,{actorId,idempotencyKey:randomUUID()});const claim=(await claimGenerationJob(pool,"worker"))!;
    expect(await failGenerationJob(pool,job.id,claim.attemptToken!,{code:"PROVIDER_ERROR",message:"Bearer private-key /private/manual",retryable:true})).toMatchObject({status:"queued"});
    const retry=(await claimGenerationJob(pool,"worker"))!;
    const failed=await failGenerationJob(pool,job.id,retry.attemptToken!,{code:"SQL secret",message:"Bearer private-key /private/manual",retryable:true});
    expect(failed).toMatchObject({status:"failed",errorCode:"GENERATION_FAILED"}); expect(failed?.errorMessage).not.toMatch(/Bearer|private|manual/);
  });
});
