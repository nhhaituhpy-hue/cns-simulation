// @vitest-environment node
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type * as Repository from "@/lib/ai/scenario-authoring/repository";
const actorId="11111111-1111-4111-8111-111111111111";
const otherId="22222222-2222-4222-8222-222222222222";
it("provides the durable authoring repository",()=>expect(existsSync(resolve("src/lib/ai/scenario-authoring/repository.ts"))).toBe(true));
const testUrl=process.env.SCENARIO_EXAM_TEST_DATABASE_URL;
describe.skipIf(!testUrl)("guided drafts in isolated real PostgreSQL",()=>{
 const databaseName=`cns_authoring_test_${randomUUID().replaceAll("-","")}`;
 let control:Client|undefined;let pool:Pool;let created=false;let repo:typeof Repository;
 beforeAll(async()=>{
  const url=new URL(testUrl!);
  if(!/^(postgres|postgresql):$/.test(url.protocol)||!["127.0.0.1","localhost","[::1]"].includes(url.hostname)||url.pathname!=="/cns_scenario_exams_test"||url.search||url.hash)throw new Error("Use explicit loopback cns_scenario_exams_test endpoint.");
  control=new Client({connectionString:url.href,connectionTimeoutMillis:5000});await control.connect();
  expect((await control.query("select current_database() name")).rows[0].name).toBe("cns_scenario_exams_test");
  await control.query(`create database "${databaseName}"`);created=true;url.pathname=`/${databaseName}`;
  pool=new Pool({connectionString:url.href,max:6,connectionTimeoutMillis:5000});
  for(const file of (await readdir(resolve("database/migrations"))).filter(f=>/^\d+_.*\.sql$/.test(f)).sort()) {
   await pool.query(await readFile(resolve("database/migrations",file),"utf8"));
   if(file==="0001_users_and_sessions.sql")for(const [id,name]of [[actorId,"owner"],[otherId,"other"]])await pool.query("insert into public.users(id,username,email,password_hash,full_name,work_unit,role,must_change_password) values($1,$2,$3,'non-login-fixture','Test','Lab','admin',false)",[id,name,`${name}@attech.com.vn`]);
  }
  await pool.query("insert into public.exam_modules(code,name) values('ads-b','ADS-B')");
  repo=await import("@/lib/ai/scenario-authoring/repository");
 },30000);
 afterAll(async()=>{await pool?.end();if(created)await control?.query(`drop database "${databaseName}"`);await control?.end();});
 beforeEach(async()=>{
  await pool.query("delete from public.ai_authoring_analysis_jobs;delete from public.ai_authoring_document_namespaces;delete from public.ai_authoring_sessions;delete from public.simulator_scenario_parameters;delete from public.scenarios;update public.users set role='admin',is_active=true,must_change_password=false");
 });
 const create=(moduleId:import("@/lib/scenario-parameters").ScenarioParametersModuleId="ads-b",key=randomUUID())=>repo.createAuthoringSession(pool,moduleId,{actorId,idempotencyKey:key});
 it("rejects duplicate active analysis and finalization while analysis is pending",async()=>{
  let s=await confirmed("ads-b");
  await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,s.revision,{kind:"guidance",question:"Explain"},{idempotencyKey:randomUUID()});
  s=(await repo.getAuthoringSession(pool,s.id,actorId))!;
  await expect(repo.enqueueAuthoringAnalysis(pool,s.id,actorId,s.revision,{kind:"guidance",question:"Explain again"},{idempotencyKey:randomUUID()})).rejects.toMatchObject({code:"ANALYSIS_BUSY"});
  const {authoringAdapterFor}=await import("@/lib/ai/scenario-authoring/forms/registry");
  for(const section of authoringAdapterFor("ads-b").form(s.state.definition).sections)s=await repo.updateAuthoringSession(pool,s.id,actorId,s.revision,{action:"confirm",sectionId:section.id});
  await expect(repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,randomUUID())).rejects.toMatchObject({code:"ANALYSIS_BUSY"});
  expect((await pool.query("select * from public.simulator_scenario_parameters")).rows).toEqual([]);
 });
 it.each(["dvor-1150","dvor-1150a","dme-1119a","dvor-220","dme-320","ads-b"] as const)("round-trips confirmations and atomically finalizes %s",async moduleId=>{
  const s=await confirmed(moduleId),done=await repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,randomUUID());
  const persisted=(await pool.query("select definition_json,module_id from public.simulator_scenario_parameters where id=$1",[done.scenarioRowId])).rows[0];
  expect(persisted.module_id).toBe(moduleId);expect(persisted.definition_json).toEqual(s.state.definition);
  expect((await pool.query("select * from public.simulator_scenario_library_memberships")).rows).toEqual([]);
 });
 it("bounds daily analysis per actor without charging idempotent retries",async()=>{
  const s=await create("ads-b"),request={kind:"guidance" as const,question:"Explain"},key=randomUUID();
  const original=await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,request,{idempotencyKey:key});
  await pool.query("update public.ai_authoring_analysis_jobs set status=$1,completed_at=now() where id=$2",["failed",original.id]);
  await pool.query(`insert into public.ai_authoring_analysis_jobs(id,session_id,actor_id,base_revision,request_json,state_json,input_hash,idempotency_key,status,completed_at)
   select gen_random_uuid(),session_id,actor_id,base_revision,request_json,state_json,input_hash,gen_random_uuid()::text,$2,now() from public.ai_authoring_analysis_jobs cross join generate_series(1,49) where id=$1`,[original.id,"failed"]);
  expect((await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,request,{idempotencyKey:key})).id).toBe(original.id);
  await expect(repo.enqueueAuthoringAnalysis(pool,s.id,actorId,2,request,{idempotencyKey:randomUUID()}).then(()=>"accepted")).rejects.toMatchObject({code:"DAILY_QUOTA"});
  const other=await repo.createAuthoringSession(pool,"ads-b",{actorId:otherId,idempotencyKey:randomUUID()});
  expect((await repo.enqueueAuthoringAnalysis(pool,other.id,otherId,1,request,{idempotencyKey:randomUUID()})).status).toBe("queued");
 });
 it("rejects reuse of another session document namespace including replacement",async()=>{
  const namespace=randomUUID(),doc={id:randomUUID(),name:"manual.txt",mimeType:"text/plain",bytes:12,sha256:"a".repeat(64),storageKey:""};doc.storageKey=`${namespace}/${doc.id}`;
  await repo.createAuthoringSession(pool,"ads-b",{actorId,id:namespace,idempotencyKey:randomUUID(),documents:[doc]});
  await expect(repo.createAuthoringSession(pool,"ads-b",{actorId:otherId,idempotencyKey:randomUUID(),documents:[doc]}).then(()=>"accepted")).rejects.toMatchObject({code:"INVALID_INPUT"});
  const other=await repo.createAuthoringSession(pool,"ads-b",{actorId:otherId,idempotencyKey:randomUUID()});
  await expect(repo.enqueueAuthoringAnalysis(pool,other.id,otherId,1,{kind:"baseline",question:"Read"},{idempotencyKey:randomUUID(),documents:[doc]}).then(()=>"accepted")).rejects.toMatchObject({code:"INVALID_INPUT"});
  expect((await repo.getAuthoringSession(pool,other.id,otherId))?.documents).toEqual([]);
 });
 it("retains immutable document claims across replacement and exact retry semantics",async()=>{
  const s=await create("ads-b"),request={kind:"baseline" as const,question:"Read"},key=randomUUID();
  const j=await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,request,{idempotencyKey:key});
  await expect(repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,request,{idempotencyKey:key,documents:[]})).rejects.toMatchObject({code:"IDEMPOTENCY_CONFLICT"});
  await pool.query("update public.ai_authoring_analysis_jobs set status=$1,completed_at=now() where id=$2",["failed",j.id]);
  const doc={id:randomUUID(),name:"manual.txt",mimeType:"text/plain",bytes:12,sha256:"a".repeat(64),storageKey:""};doc.storageKey=`${randomUUID()}/${doc.id}`;
  const key2=randomUUID(),replacement=await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,2,request,{idempotencyKey:key2,documents:[doc]});
  const retryDoc={...doc,id:randomUUID(),storageKey:""};retryDoc.storageKey=`${randomUUID()}/${retryDoc.id}`;
  expect((await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,2,request,{idempotencyKey:key2,documents:[retryDoc]})).id).toBe(replacement.id);
  for(const field of [{name:"other.txt"},{bytes:13},{mimeType:""},{sha256:"b".repeat(64)}])await expect(repo.enqueueAuthoringAnalysis(pool,s.id,actorId,2,request,{idempotencyKey:key2,documents:[{...retryDoc,...field}]}).then(()=>"accepted")).rejects.toMatchObject({code:"IDEMPOTENCY_CONFLICT"});
  await pool.query("update public.ai_authoring_analysis_jobs set status=$1,completed_at=now() where id=$2",["failed",replacement.id]);
  await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,3,request,{idempotencyKey:randomUUID(),documents:[]});
  const other=await create("ads-b");
  await expect(repo.enqueueAuthoringAnalysis(pool,other.id,actorId,1,request,{idempotencyKey:randomUUID(),documents:[doc]}).then(()=>"accepted")).rejects.toMatchObject({code:"INVALID_INPUT"});
  expect((await repo.getAuthoringSession(pool,s.id,actorId))?.documents).toEqual([]);
 });
 it("checks document byte budgets, namespace boundaries, and UTF-8 state limits",async()=>{
  const namespace=randomUUID(),doc={id:randomUUID(),name:"manual.txt",mimeType:"text/plain",bytes:12,sha256:"a".repeat(64),storageKey:""};doc.storageKey=`${namespace}/${doc.id}`;
  const fresh=(bytes:number)=>{const id=randomUUID();return {...doc,id,storageKey:`${namespace}/${id}`,bytes};};
  for(const docs of [[{...doc,bytes:0}],[{...doc,bytes:10485761}],Array.from({length:6},()=>fresh(1)),[fresh(10485760),fresh(10485760),fresh(10485760)],[doc,{...fresh(1),storageKey:`${randomUUID()}/${randomUUID()}`}],[doc,doc]])await expect(repo.createAuthoringSession(pool,"ads-b",{actorId,idempotencyKey:randomUUID(),documents:docs}).then(()=>"accepted")).rejects.toMatchObject({code:"INVALID_INPUT"});
  const s=await create("ads-b");
  await expect(pool.query("update public.ai_authoring_sessions set state_json=jsonb_build_object($1::text,$2::text) where id=$3",["padding","界".repeat(700000),s.id])).rejects.toMatchObject({code:"23514"});
  Object.assign(s.state,{padding:Array.from({length:20},()=>"界".repeat(29000))});
  await pool.query("update public.ai_authoring_sessions set state_json=$2::jsonb where id=$1",[s.id,JSON.stringify(s.state)]);
  const j=await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,{kind:"guidance",question:"Explain"},{idempotencyKey:randomUUID()}),claim=(await repo.claimAuthoringAnalysis(pool,"worker"))!;
  await expect(repo.finishAuthoringAnalysis(pool,j.id,claim.attemptToken!,{kind:"guidance",message:"Within string budget",changes:[],issues:Array.from({length:30},()=>({code:"REVIEW",sectionId:"metadata",severity:"warning" as const,message:"界".repeat(5000)})),coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}})).rejects.toMatchObject({code:"INVALID_INPUT"});
  expect((await repo.getAuthoringSession(pool,s.id,actorId))?.revision).toBe(2);
 });
 it.each(["student","teacher","inactive","reset"])("rechecks %s actor on every mutation and read",async mode=>{
  const s=await confirmed("ads-b");
  await pool.query("update public.users set role=$1,is_active=$2,must_change_password=$3 where id=$4",[mode==="teacher"?"teacher":mode==="student"?"student":"admin",mode!=="inactive",mode==="reset",actorId]);
  for(const operation of [()=>create("ads-b"),()=>repo.getAuthoringSession(pool,s.id,actorId),()=>repo.listAuthoringSessions(pool,actorId,"ads-b"),()=>repo.latestAuthoringAnalysis(pool,s.id,actorId),()=>repo.updateAuthoringSession(pool,s.id,actorId,s.revision,{action:"navigate",sectionId:"metadata"}),()=>repo.enqueueAuthoringAnalysis(pool,s.id,actorId,s.revision,{kind:"guidance",question:"Explain"},{idempotencyKey:randomUUID()}),()=>repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,randomUUID())])await expect(operation()).rejects.toMatchObject({code:"ACTOR_FORBIDDEN"});
 });
 it("blocks pending proposals after all sections are reconfirmed",async()=>{
  let s=await confirmed("ads-b");await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,s.revision,{kind:"guidance",question:"Explain"},{idempotencyKey:randomUUID()});
  const claim=(await repo.claimAuthoringAnalysis(pool,"worker"))!;
  await repo.finishAuthoringAnalysis(pool,claim.id,claim.attemptToken!,{kind:"guidance",message:"Review this",changes:[],issues:[],coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}});
  s=(await repo.getAuthoringSession(pool,s.id,actorId))!;
  const {authoringAdapterFor}=await import("@/lib/ai/scenario-authoring/forms/registry");
  for(const section of authoringAdapterFor("ads-b").form(s.state.definition).sections)s=await repo.updateAuthoringSession(pool,s.id,actorId,s.revision,{action:"confirm",sectionId:section.id});
  await expect(repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,randomUUID())).rejects.toMatchObject({code:"AUTHORING_INCOMPLETE",issues:expect.arrayContaining([expect.objectContaining({code:"PROPOSAL_PENDING"})])});
 });
 it("preserves literal source IDs and rejects archived cross-module collisions",async()=>{
  let a=await confirmed("ads-b"),b=await confirmed("dme-320");const literal="Case.Sensitive_ID-007";
  a=await repo.updateAuthoringSession(pool,a.id,actorId,a.revision,{action:"edit",changes:[{fieldId:"id",value:literal}]});a=await repo.updateAuthoringSession(pool,a.id,actorId,a.revision,{action:"confirm",sectionId:"metadata"});
  const done=await repo.finalizeAuthoringSession(pool,a.id,actorId,a.revision,randomUUID());expect(done.scenarioId).toBe(literal);
  await pool.query("update public.simulator_scenario_parameters set archived_at=now() where id=$1",[done.scenarioRowId]);
  await pool.query("delete from public.scenarios where id=$1",[literal]);
  b=await repo.updateAuthoringSession(pool,b.id,actorId,b.revision,{action:"edit",changes:[{fieldId:"id",value:literal}]});b=await repo.updateAuthoringSession(pool,b.id,actorId,b.revision,{action:"confirm",sectionId:"metadata"});
  await expect(repo.finalizeAuthoringSession(pool,b.id,actorId,b.revision,randomUUID())).rejects.toMatchObject({code:"ID_CONFLICT"});
  expect((await repo.getAuthoringSession(pool,b.id,actorId))?.state.definition.id).toBe(literal);
 });
 it("locks actor authorization through commit so concurrent revocation cannot slip in",async()=>{
  const s=await create("ads-b"),blocker=await pool.connect();await blocker.query("begin");await blocker.query("select id from public.ai_authoring_sessions where id=$1 for update",[s.id]);
  const mutation=repo.updateAuthoringSession(pool,s.id,actorId,1,{action:"navigate",sectionId:"documents"});
  const deadline=Date.now()+2000;let waiting=false;
  while(Date.now()<deadline){waiting=Boolean((await pool.query("select 1 from pg_stat_activity where datname=current_database() and wait_event_type=$1 and query like $2",["Lock","select * from public.ai_authoring_sessions where id=%"])).rowCount);if(waiting)break;await new Promise(r=>setTimeout(r,10));}
  let revoked=false;const revocation=pool.query("update public.users set is_active=false where id=$1",[actorId]).then(()=>{revoked=true;});
  try{expect(waiting).toBe(true);await new Promise(r=>setTimeout(r,50));expect(revoked).toBe(false);}finally{await blocker.query("rollback");blocker.release();}
  expect((await mutation).revision).toBe(2);await revocation;await expect(repo.getAuthoringSession(pool,s.id,actorId)).rejects.toMatchObject({code:"ACTOR_FORBIDDEN"});
 });
 it("enforces per-actor draft quotas and bounded newest-first listings",async()=>{
  const results=await Promise.allSettled(Array.from({length:21},()=>create("ads-b")));
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(20);expect(results.filter(r=>r.status==="rejected")).toMatchObject([{reason:{code:"SESSION_QUOTA"}}]);
  const own=await repo.listAuthoringSessions(pool,actorId,"ads-b");expect(own).toHaveLength(20);
  expect(own.map(s=>s.updatedAt)).toEqual(own.map(s=>s.updatedAt).sort().reverse());
  const other=await repo.createAuthoringSession(pool,"ads-b",{actorId:otherId,idempotencyKey:randomUUID()});expect((await repo.listAuthoringSessions(pool,otherId,"ads-b")).map(s=>s.id)).toEqual([other.id]);
 });
 it("rolls both ADS-B stores back when the legacy catalog trigger lacks its module",async()=>{
  const s=await confirmed("ads-b");await pool.query("delete from public.exam_modules where code=$1",["ads-b"]);
  try{await expect(repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,randomUUID())).rejects.toMatchObject({code:"PERSISTENCE_FAILED"});}
  finally{await pool.query("insert into public.exam_modules(code,name) values($1,$2)",["ads-b","ADS-B"]);}
  expect((await pool.query("select * from public.simulator_scenario_parameters")).rows).toEqual([]);expect((await pool.query("select * from public.scenarios")).rows).toEqual([]);expect((await repo.getAuthoringSession(pool,s.id,actorId))?.status).toBe("editing");
  const done=await repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,randomUUID());expect(done.status).toBe("completed");
  expect((await pool.query("select * from public.exam_scenario_catalog where scenario_id=$1",[done.scenarioId])).rows).toHaveLength(1);
 });
 it("fences stale completion tokens and independently revoked heartbeats and failures",async()=>{
  for(const action of ["heartbeat","failure"] as const){
   const s=await create(),j=await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,{kind:"guidance",question:"Explain"},{idempotencyKey:randomUUID()}),initial=(await repo.claimAuthoringAnalysis(pool,"worker"))!;
   await pool.query("update public.ai_authoring_analysis_jobs set lease_expires_at=clock_timestamp()-interval $$1 second$$ where id=$1",[j.id]);
   const retry=(await repo.claimAuthoringAnalysis(pool,"retry"))!;
   expect(await repo.finishAuthoringAnalysis(pool,j.id,initial.attemptToken!,{kind:"guidance",message:"x",changes:[],issues:[],coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}})).toBe(false);
   await pool.query("update public.users set role=$1 where id=$2",["teacher",actorId]);
   if(action==="heartbeat")expect(await repo.heartbeatAuthoringAnalysis(pool,j.id,retry.attemptToken!)).toBe(false);else await repo.failAuthoringAnalysis(pool,j.id,retry.attemptToken!,"PROVIDER_ERROR");
   expect((await pool.query("select status,error_code from public.ai_authoring_analysis_jobs where id=$1",[j.id])).rows[0]).toEqual({status:"failed",error_code:"ACTOR_FORBIDDEN"});
   await pool.query("update public.users set role=$1 where id=$2",["admin",actorId]);
  }
 });
 it("serializes global ID collisions across different module finalizations",async()=>{
  const a=await confirmed("ads-b");let b=await confirmed("dme-320");
  b=await repo.updateAuthoringSession(pool,b.id,actorId,b.revision,{action:"edit",changes:[{fieldId:"id",value:a.state.definition.id}]});b=await repo.updateAuthoringSession(pool,b.id,actorId,b.revision,{action:"confirm",sectionId:"metadata"});
  const results=await Promise.allSettled([a,b].map(s=>repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,randomUUID())));
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(results.filter(r=>r.status==="rejected")).toMatchObject([{reason:{code:"ID_CONFLICT"}}]);
  expect((await pool.query("select * from public.simulator_scenario_parameters")).rows).toHaveLength(1);
 });
 it("rejects unknown document manifest fields and cross-namespace batches",async()=>{
  const doc={id:randomUUID(),name:"manual.txt",mimeType:"text/plain",bytes:12,sha256:"a".repeat(64),storageKey:""};doc.storageKey=`${randomUUID()}/${doc.id}`;
  const other={...doc,id:randomUUID(),storageKey:""};other.storageKey=`${randomUUID()}/${other.id}`;
  for(const documents of [[{...doc,url:"https://external.invalid"}],[doc,other]])await expect(repo.createAuthoringSession(pool,"ads-b",{actorId,idempotencyKey:randomUUID(),documents}).then(()=>"accepted")).rejects.toMatchObject({code:"INVALID_INPUT"});
 });
 it("locks document namespace ownership across simultaneous actors",async()=>{
  const doc={id:randomUUID(),name:"manual.txt",mimeType:"text/plain",bytes:12,sha256:"a".repeat(64),storageKey:""};doc.storageKey=`${randomUUID()}/${doc.id}`;
  const results=await Promise.allSettled([actorId,otherId].map(actorId=>repo.createAuthoringSession(pool,"ads-b",{actorId,idempotencyKey:randomUUID(),documents:[doc]})));
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(results.filter(r=>r.status==="rejected")).toMatchObject([{reason:{code:"INVALID_INPUT"}}]);
  expect((await pool.query("select * from public.ai_authoring_sessions")).rows).toHaveLength(1);expect((await pool.query("select * from public.ai_authoring_document_namespaces")).rows).toHaveLength(1);
 });
 it("rejects reanalysis until the existing proposal is explicitly resolved",async()=>{
  const s=await create("ads-b");await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,{kind:"baseline",question:"Read"},{idempotencyKey:randomUUID()});
  const claim=(await repo.claimAuthoringAnalysis(pool,"worker"))!;
  await repo.finishAuthoringAnalysis(pool,claim.id,claim.attemptToken!,{kind:"baseline",message:"Review",changes:[],issues:[],coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}});
  const current=(await repo.getAuthoringSession(pool,s.id,actorId))!;
  await expect(repo.enqueueAuthoringAnalysis(pool,s.id,actorId,current.revision,{kind:"baseline",question:"Read again"},{idempotencyKey:randomUUID(),documents:[]}).then(()=>"accepted")).rejects.toMatchObject({code:"PROPOSAL_PENDING"});
  expect((await repo.getAuthoringSession(pool,s.id,actorId))?.state).toEqual(current.state);
  const resolved=await repo.updateAuthoringSession(pool,s.id,actorId,current.revision,{action:"dismiss-proposal",proposalId:current.state.proposal!.id});
  expect((await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,resolved.revision,{kind:"baseline",question:"Read again"},{idempotencyKey:randomUUID()})).status).toBe("queued");
 });
 it("rolls proposal writes back if the lease expires during persistence",async()=>{
  const s=await create(),j=await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,{kind:"guidance",question:"Explain"},{idempotencyKey:randomUUID()}),claim=(await repo.claimAuthoringAnalysis(pool,"worker"))!;
  await pool.query("create function public.authoring_test_delay() returns trigger language plpgsql as $$ begin perform pg_sleep(0.2); return new; end $$;create trigger authoring_test_delay before update on public.ai_authoring_sessions for each row execute function public.authoring_test_delay()");
  await pool.query("update public.ai_authoring_analysis_jobs set lease_expires_at=clock_timestamp()+interval $$100 milliseconds$$ where id=$1",[j.id]);
  try{expect(await repo.finishAuthoringAnalysis(pool,j.id,claim.attemptToken!,{kind:"guidance",message:"Review",changes:[],issues:[],coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}})).toBe(false);}
  finally{await pool.query("drop trigger authoring_test_delay on public.ai_authoring_sessions;drop function public.authoring_test_delay()");}
  expect((await repo.getAuthoringSession(pool,s.id,actorId))?.revision).toBe(2);
  expect((await repo.latestAuthoringAnalysis(pool,s.id,actorId))?.status).toBe("running");
 });
 it("preserves confirmations through non-mutating guidance and dismiss",async()=>{
  const s=await confirmed("ads-b"),request={kind:"guidance" as const,question:"Explain this step"};
  const queued=await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,s.revision,request,{idempotencyKey:randomUUID()});
  expect(queued.state.confirmations).toEqual(s.state.confirmations);
  expect((await repo.getAuthoringSession(pool,s.id,actorId))?.state.confirmations).toEqual(s.state.confirmations);
  const claim=(await repo.claimAuthoringAnalysis(pool,"worker"))!;
  await repo.finishAuthoringAnalysis(pool,claim.id,claim.attemptToken!,{kind:"guidance",message:"Explanation only",changes:[],issues:[],coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}});
  const reviewed=(await repo.getAuthoringSession(pool,s.id,actorId))!;expect(reviewed.state.confirmations).toEqual(s.state.confirmations);
  const dismissed=await repo.updateAuthoringSession(pool,s.id,actorId,reviewed.revision,{action:"dismiss-proposal",proposalId:reviewed.state.proposal!.id});
  expect((await repo.finalizeAuthoringSession(pool,s.id,actorId,dismissed.revision,randomUUID())).status).toBe("completed");
 });
 it("blocks persisted navigation while analysis is active without advancing its revision",async()=>{
  const s=await create(),j=await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,{kind:"guidance",question:"Explain"},{idempotencyKey:randomUUID()});
  await expect(repo.updateAuthoringSession(pool,s.id,actorId,j.baseRevision,{action:"navigate",sectionId:"documents"}).then(()=>"accepted")).rejects.toMatchObject({code:"ANALYSIS_BUSY"});
  const claim=(await repo.claimAuthoringAnalysis(pool,"worker"))!;
  expect(await repo.finishAuthoringAnalysis(pool,j.id,claim.attemptToken!,{kind:"guidance",message:"Review",changes:[],issues:[],coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}})).toBe(true);
  expect((await repo.getAuthoringSession(pool,s.id,actorId))?.revision).toBe(3);
 });
 it("creates only private drafts, serializes retries, and scopes every read",async()=>{
  const key=randomUUID();const [first,again]=await Promise.all([create("dvor-1150a",key),create("dvor-1150a",key)]);
  expect(first.id).toBe(again.id);expect(first.revision).toBe(1);expect(first.scenarioRowId).toBeNull();
  expect((await pool.query("select * from public.simulator_scenario_parameters")).rows).toEqual([]);
  expect(await repo.getAuthoringSession(pool,first.id,otherId)).toBeNull();
  expect((await repo.listAuthoringSessions(pool,actorId,"dvor-1150a")).map(s=>s.id)).toEqual([first.id]);
  await expect(repo.createAuthoringSession(pool,"dvor-1150a",{actorId,idempotencyKey:key,context:"different"})).rejects.toMatchObject({code:"IDEMPOTENCY_CONFLICT"});
  await pool.query("update public.users set role='student' where id=$1",[actorId]);
  await expect(repo.getAuthoringSession(pool,first.id,actorId)).rejects.toMatchObject({code:"ACTOR_FORBIDDEN"});
  await expect(repo.listAuthoringSessions(pool,actorId,"dvor-1150a")).rejects.toMatchObject({code:"ACTOR_FORBIDDEN"});
 });
 it("locks an exact revision for every mutation and rejects foreign actors",async()=>{
  const session=await create();
  const mutate=()=>repo.updateAuthoringSession(pool,session.id,actorId,session.revision,{action:"edit",changes:[{fieldId:"name",value:"Examiner draft"}]});
  const results=await Promise.allSettled([mutate(),mutate()]);
  expect(results.filter(r=>r.status==="fulfilled"),JSON.stringify(results)).toHaveLength(1);
  expect(results.filter(r=>r.status==="rejected")).toMatchObject([{reason:{code:"REVISION_CONFLICT"}}]);
  await expect(repo.updateAuthoringSession(pool,session.id,otherId,2,{action:"edit",changes:[]})).rejects.toMatchObject({code:"NOT_FOUND"});
  expect((await repo.getAuthoringSession(pool,session.id,actorId))?.revision).toBe(2);
 });
 it("pins analysis to its new revision, retries the original input, and never writes a source",async()=>{
  const s=await create(),key=randomUUID(),request={kind:"baseline" as const,question:"Normalize evidence"};
  const analysis=await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,s.revision,request,{idempotencyKey:key});
  expect(analysis.baseRevision).toBe(2);expect(analysis.state).toEqual({...s.state,confirmations:{}});
  expect((await repo.getAuthoringSession(pool,s.id,actorId))?.revision).toBe(2);
  expect((await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,s.revision,request,{idempotencyKey:key})).id).toBe(analysis.id);
  await expect(repo.enqueueAuthoringAnalysis(pool,s.id,actorId,2,request,{idempotencyKey:key})).rejects.toMatchObject({code:"IDEMPOTENCY_CONFLICT"});
  const claim=(await repo.claimAuthoringAnalysis(pool,"worker"))!;expect(claim.id).toBe(analysis.id);
  expect(await repo.heartbeatAuthoringAnalysis(pool,claim.id,claim.attemptToken!)).toBe(true);
  expect(await repo.finishAuthoringAnalysis(pool,claim.id,claim.attemptToken!,{kind:"baseline",message:"No applicable input",changes:[],issues:[],coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}})).toBe(true);
  const after=(await repo.getAuthoringSession(pool,s.id,actorId))!;expect(after.revision).toBe(3);expect(after.scenarioRowId).toBeNull();
  expect((await repo.latestAuthoringAnalysis(pool,s.id,actorId))?.status).toBe("completed");
  expect((await pool.query("select * from public.simulator_scenario_parameters")).rows).toEqual([]);
 });
 it("enforces concurrent quota, expires attempts, and fences stale worker writes",async()=>{
  const s=await create(),request={kind:"guidance" as const,question:"Explain"};
  const first=await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,request,{idempotencyKey:randomUUID()});
  const s2=await create();await repo.enqueueAuthoringAnalysis(pool,s2.id,actorId,1,request,{idempotencyKey:randomUUID()});
  await expect(repo.enqueueAuthoringAnalysis(pool,s.id,actorId,2,request,{idempotencyKey:randomUUID()})).rejects.toMatchObject({code:"ACTIVE_QUOTA"});
  const claims=await Promise.all([repo.claimAuthoringAnalysis(pool,"a"),repo.claimAuthoringAnalysis(pool,"b")]);expect(new Set(claims.map(c=>c?.id)).size).toBe(2);
  const initial=claims.find(c=>c?.id===first.id)!;
  await pool.query("update public.ai_authoring_analysis_jobs set lease_expires_at=now()-interval '1 minute' where id=$1",[first.id]);
  expect(await repo.heartbeatAuthoringAnalysis(pool,first.id,initial.attemptToken!)).toBe(false);
  const retry=(await repo.claimAuthoringAnalysis(pool,"restart"))!;expect(retry.id).toBe(first.id);expect(retry.attemptToken).not.toBe(initial.attemptToken);
  await repo.failAuthoringAnalysis(pool,first.id,initial.attemptToken!,"PROVIDER_ERROR");expect((await repo.latestAuthoringAnalysis(pool,s.id,actorId))?.status).toBe("running");
  await pool.query("update public.ai_authoring_analysis_jobs set lease_expires_at=now()-interval '1 minute' where id=$1",[first.id]);
  expect(await repo.claimAuthoringAnalysis(pool,"exhausted")).toBeNull();
  expect((await repo.latestAuthoringAnalysis(pool,s.id,actorId))?.errorCode).toBe("ATTEMPTS_EXHAUSTED");
 });
 it("does not overwrite edits made after analysis and blocks revoked actors",async()=>{
  const s=await create();const request={kind:"guidance" as const,question:"Explain"};
  const j=await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,request,{idempotencyKey:randomUUID()});const claim=(await repo.claimAuthoringAnalysis(pool,"worker"))!;
  const edited=await repo.updateAuthoringSession(pool,s.id,actorId,2,{action:"edit",changes:[{fieldId:"name",value:"Human edit wins"}]});
  const proposal={kind:"guidance" as const,message:"Suggestion",changes:[],issues:[],coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}};
  expect(await repo.finishAuthoringAnalysis(pool,j.id,claim.attemptToken!,proposal)).toBe(false);
  expect((await repo.getAuthoringSession(pool,s.id,actorId))?.state).toEqual(edited.state);
  expect((await repo.latestAuthoringAnalysis(pool,s.id,actorId))?.status).toBe("stale");
  await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,edited.revision,request,{idempotencyKey:randomUUID()});
  await pool.query("update public.users set is_active=false where id=$1",[actorId]);
  expect(await repo.claimAuthoringAnalysis(pool,"revoked")).toBeNull();
  await expect(repo.latestAuthoringAnalysis(pool,s.id,actorId)).rejects.toMatchObject({code:"ACTOR_FORBIDDEN"});
 });
 async function confirmed(moduleId:import("@/lib/scenario-parameters").ScenarioParametersModuleId="ads-b") {
  let s=await create(moduleId);
  s=await repo.updateAuthoringSession(pool,s.id,actorId,s.revision,{action:"edit",changes:[{fieldId:"name",value:"Guided source"},{fieldId:"description",value:"Training review"}]});
  if(moduleId==="ads-b")s=await repo.updateAuthoringSession(pool,s.id,actorId,s.revision,{action:"edit",changes:[{fieldId:"actionPlan",value:[{loginUser:"sysadmin",inputs:["1"]}]}]});
  const {authoringAdapterFor}=await import("@/lib/ai/scenario-authoring/forms/registry");
  for(const section of authoringAdapterFor(moduleId).form(s.state.definition).sections)s=await repo.updateAuthoringSession(pool,s.id,actorId,s.revision,{action:"confirm",sectionId:section.id});
  return s;
 }
 it("requires current server confirmations and finalizes exactly once without publishing",async()=>{
  const draft=await create();
  await expect(repo.finalizeAuthoringSession(pool,draft.id,actorId,draft.revision,randomUUID())).rejects.toMatchObject({code:"AUTHORING_INCOMPLETE",issues:expect.arrayContaining([expect.objectContaining({code:"SECTION_UNCONFIRMED"})])});
  let s=await confirmed();const edited=await repo.updateAuthoringSession(pool,s.id,actorId,s.revision,{action:"edit",changes:[{fieldId:"name",value:"Human final name"}]});
  await expect(repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,randomUUID())).rejects.toMatchObject({code:"REVISION_CONFLICT"});
  await expect(repo.finalizeAuthoringSession(pool,s.id,actorId,edited.revision,randomUUID())).rejects.toMatchObject({code:"AUTHORING_INCOMPLETE"});
  s=await repo.updateAuthoringSession(pool,s.id,actorId,edited.revision,{action:"confirm",sectionId:"metadata"});
  const key=randomUUID();const [done,again]=await Promise.all([repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,key),repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,key)]);
  expect(done).toMatchObject({status:"completed",scenarioId:s.state.definition.id});expect(done.scenarioRowId).toBe(again.scenarioRowId);
  expect(done.scenarioRowId).toMatch(/^[a-f0-9-]{36}$/);
  const rows=(await pool.query("select * from public.simulator_scenario_parameters where id=$1",[done.scenarioRowId])).rows;
  expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({scenario_id:s.state.definition.id,name:"Human final name",created_by:actorId,source_filename:"ai-guided-authoring",revision:1});
  expect(rows[0].definition_json.id).toBe(s.state.definition.id);
  for(const table of ["simulator_scenario_library_memberships","simulator_review_scenario_assignments"])expect((await pool.query(`select * from public.${table} where scenario_parameters_id=$1`,[done.scenarioRowId])).rows).toEqual([]);
  expect((await pool.query("select * from public.ai_scenario_generation_jobs")).rows).toEqual([]);
  await expect(repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,randomUUID())).rejects.toMatchObject({code:"FINALIZE_CONFLICT"});
  await expect(repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision+1,key)).rejects.toMatchObject({code:"FINALIZE_CONFLICT"});
  await expect(repo.finalizeAuthoringSession(pool,s.id,otherId,s.revision,key)).rejects.toMatchObject({code:"NOT_FOUND"});
 });
 it("atomically dual-writes ADS-B and rolls canonical source back if legacy insert fails",async()=>{
  const s=await confirmed("ads-b");const key=randomUUID();
  await pool.query("alter table public.scenarios add constraint authoring_test_reject check(title <> 'Guided source') not valid");
  try {await expect(repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,key)).rejects.toThrow();}
  finally {await pool.query("alter table public.scenarios drop constraint authoring_test_reject");}
  expect((await pool.query("select * from public.simulator_scenario_parameters")).rows).toEqual([]);
  expect((await repo.getAuthoringSession(pool,s.id,actorId))?.status).toBe("editing");
  const done=await repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,key);
  const legacy=(await pool.query("select * from public.scenarios where id=$1",[done.scenarioId])).rows[0];
  expect(legacy.title).toBe("Guided source");
  const canonical=(await pool.query("select * from public.simulator_scenario_parameters where id=$1",[done.scenarioRowId])).rows[0];
  expect(canonical.definition_json.sites).toEqual(typeof legacy.sites_json==="string"?JSON.parse(legacy.sites_json):legacy.sites_json);
 });
 it("preserves reviewed IDs and rejects global canonical or legacy collisions",async()=>{
  const a=await confirmed("ads-b");const done=await repo.finalizeAuthoringSession(pool,a.id,actorId,a.revision,randomUUID());
  let b=await confirmed();b=await repo.updateAuthoringSession(pool,b.id,actorId,b.revision,{action:"edit",changes:[{fieldId:"id",value:done.scenarioId!}]});
  b=await repo.updateAuthoringSession(pool,b.id,actorId,b.revision,{action:"confirm",sectionId:"metadata"});
  await expect(repo.finalizeAuthoringSession(pool,b.id,actorId,b.revision,randomUUID())).rejects.toMatchObject({code:"ID_CONFLICT",issues:expect.arrayContaining([expect.objectContaining({fieldId:"id"})])});
  await pool.query("delete from public.ai_authoring_sessions where id=$1",[done.id]);await pool.query("delete from public.simulator_scenario_parameters where id=$1",[done.scenarioRowId]);
  await expect(repo.finalizeAuthoringSession(pool,b.id,actorId,b.revision,randomUUID())).rejects.toMatchObject({code:"ID_CONFLICT"});
  expect((await repo.getAuthoringSession(pool,b.id,actorId))?.state.definition.id).toBe(done.scenarioId);
 });
 it("rejects external manifests and hashes equivalent private uploads by content",async()=>{
  const doc={id:randomUUID(),name:"manual.txt",mimeType:"text/plain",bytes:12,sha256:"a".repeat(64),storageKey:"https://external.invalid/manual"};
  for(const storageKey of [doc.storageKey,"/etc/passwd","../manual",`${randomUUID()}/../${doc.id}`])await expect(repo.createAuthoringSession(pool,"dvor-1150a",{actorId,idempotencyKey:randomUUID(),documents:[{...doc,storageKey}]})).rejects.toMatchObject({code:"INVALID_INPUT"});
  const key=randomUUID();doc.storageKey=`${randomUUID()}/${doc.id}`;
  const first=await repo.createAuthoringSession(pool,"dvor-1150a",{actorId,idempotencyKey:key,documents:[doc]});
  const secondDoc={...doc,id:randomUUID()};secondDoc.storageKey=`${randomUUID()}/${secondDoc.id}`;
  expect((await repo.createAuthoringSession(pool,"dvor-1150a",{actorId,idempotencyKey:key,documents:[secondDoc]})).id).toBe(first.id);
  await expect(repo.createAuthoringSession(pool,"dvor-1150a",{actorId,idempotencyKey:key,documents:[{...secondDoc,sha256:"b".repeat(64)}]})).rejects.toMatchObject({code:"IDEMPOTENCY_CONFLICT"});
 });
 it("rechecks revocation on heartbeat, completion, failure and final retry",async()=>{
  const s=await confirmed();const finished=await repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,"final-retry");
  const a=await create();const queued=await repo.enqueueAuthoringAnalysis(pool,a.id,actorId,1,{kind:"guidance",question:"Explain"},{idempotencyKey:randomUUID()});
  const claim=(await repo.claimAuthoringAnalysis(pool,"worker"))!;
  await pool.query("update public.users set must_change_password=true where id=$1",[actorId]);
  expect(await repo.finishAuthoringAnalysis(pool,claim.id,claim.attemptToken!,{kind:"guidance",message:"x",changes:[],issues:[],coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}})).toBe(false);
  expect(await repo.heartbeatAuthoringAnalysis(pool,claim.id,claim.attemptToken!)).toBe(false);
  await repo.failAuthoringAnalysis(pool,claim.id,claim.attemptToken!,"Bearer secret");
  expect((await pool.query("select status,error_code from public.ai_authoring_analysis_jobs where id=$1",[queued.id])).rows[0]).toEqual({status:"failed",error_code:"ACTOR_FORBIDDEN"});
  await expect(repo.finalizeAuthoringSession(pool,finished.id,actorId,s.revision,"final-retry")).rejects.toMatchObject({code:"ACTOR_FORBIDDEN"});
 });
 it("normalizes untrusted failure codes without storing raw errors",async()=>{
  const s=await create();await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,{kind:"guidance",question:"Explain"},{idempotencyKey:randomUUID()});const claim=(await repo.claimAuthoringAnalysis(pool,"worker"))!;
  await repo.failAuthoringAnalysis(pool,claim.id,claim.attemptToken!,"Bearer private-key /etc/private");
  expect(await repo.latestAuthoringAnalysis(pool,s.id,actorId)).toMatchObject({status:"failed",errorCode:"ANALYSIS_FAILED"});
 });
 it("applies initial baseline through the state helper but still requires human review",async()=>{
  const s=await create("ads-b"),doc={id:randomUUID(),name:"manual.txt",mimeType:"text/plain",bytes:12,sha256:"a".repeat(64),storageKey:""};doc.storageKey=`${randomUUID()}/${doc.id}`;
  await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,{kind:"baseline",question:"Normalize"},{idempotencyKey:randomUUID(),documents:[doc]});const claim=(await repo.claimAuthoringAnalysis(pool,"worker"))!;
  const proposal={kind:"baseline" as const,message:"Document site name",changes:[{fieldId:"sites.0.name",value:"Reviewed site",source:{kind:"document" as const,documentId:doc.id,documentName:doc.name,quote:"Reviewed site"},reason:"Document site name"}],issues:[],coverage:{documents:1,charactersRead:12,charactersAvailable:12,truncated:false}};
  expect(await repo.finishAuthoringAnalysis(pool,claim.id,claim.attemptToken!,proposal)).toBe(true);
  const after=(await repo.getAuthoringSession(pool,s.id,actorId))!;
  expect((after.state.definition as {sites:{name:string}[]}).sites[0].name).toBe("Reviewed site");
  expect(after.state.proposal?.baseRevision).toBe(2);expect(after.state.proposal?.id).toMatch(/^[a-f0-9-]{36}$/);expect(after.state.confirmations).toEqual({});
  await expect(repo.finalizeAuthoringSession(pool,s.id,actorId,after.revision,randomUUID())).rejects.toMatchObject({code:"AUTHORING_INCOMPLETE"});
  expect((await pool.query("select * from public.simulator_scenario_parameters")).rows).toEqual([]);
 });
 it("enforces quota under simultaneous requests and rolls document replacement back",async()=>{
  const sessions=await Promise.all([create(),create(),create()]);
  const results=await Promise.allSettled(sessions.map(s=>repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,{kind:"guidance",question:"Explain"},{idempotencyKey:randomUUID(),documents:[]})));
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(2);expect(results.filter(r=>r.status==="rejected")).toMatchObject([{reason:{code:"ACTIVE_QUOTA"}}]);
  const rejectedIndex=results.findIndex(r=>r.status==="rejected");expect((await repo.getAuthoringSession(pool,sessions[rejectedIndex].id,actorId))?.revision).toBe(1);
 });
 it("bounds issue-rich validation errors before returning repository results",async()=>{
  const s=await confirmed();s.state.issues=Array.from({length:150},()=>({code:"REVIEW_REQUIRED",sectionId:"metadata",fieldId:"name",severity:"error" as const,message:"x".repeat(2000)}));
  await pool.query("update public.ai_authoring_sessions set state_json=$2::jsonb where id=$1",[s.id,JSON.stringify(s.state)]);
  try {await repo.finalizeAuthoringSession(pool,s.id,actorId,s.revision,randomUUID());throw new Error("expected validation failure");}
  catch(error){const e=error as {code:string;issues:{message:string}[]};expect(e.code).toBe("AUTHORING_INCOMPLETE");expect(e.issues.length).toBeLessThanOrEqual(100);expect(e.issues.every(i=>i.message.length<=500)).toBe(true);}
 });
 it("rejects impossible persisted lease, revision, and owner combinations",async()=>{
  const s=await create();const j=await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,{kind:"guidance",question:"Explain"},{idempotencyKey:randomUUID()});
  await expect(pool.query("update public.ai_authoring_sessions set revision=0 where id=$1",[s.id])).rejects.toMatchObject({code:"23514"});
  await expect(pool.query("update public.ai_authoring_sessions set status='completed' where id=$1",[s.id])).rejects.toMatchObject({code:"23514"});
  await expect(pool.query("update public.ai_authoring_analysis_jobs set status='running' where id=$1",[j.id])).rejects.toMatchObject({code:"23514"});
  await expect(pool.query("update public.ai_authoring_analysis_jobs set actor_id=$2 where id=$1",[j.id,otherId])).rejects.toMatchObject({code:"23503"});
 });
 it("rechecks lease after waiting for the session lock",async()=>{
  const s=await create();await repo.enqueueAuthoringAnalysis(pool,s.id,actorId,1,{kind:"guidance",question:"Explain"},{idempotencyKey:randomUUID()});const claim=(await repo.claimAuthoringAnalysis(pool,"worker"))!;
  const blocker=await pool.connect();await blocker.query("begin");await blocker.query("select id from public.ai_authoring_sessions where id=$1 for update",[s.id]);
  await pool.query("update public.ai_authoring_analysis_jobs set lease_expires_at=clock_timestamp()+interval '150 milliseconds' where id=$1",[claim.id]);
  const finishing=repo.finishAuthoringAnalysis(pool,claim.id,claim.attemptToken!,{kind:"guidance",message:"x",changes:[],issues:[],coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}});
  try{await new Promise(resolve=>setTimeout(resolve,300));}finally{await blocker.query("rollback");blocker.release();}
  expect(await finishing).toBe(false);expect((await repo.getAuthoringSession(pool,s.id,actorId))?.revision).toBe(2);
 });
});
