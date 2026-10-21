import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { isScenarioParametersModuleId, parseScenarioParameters, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { storedScenarioParametersToRow } from "@/lib/scenario-parameters-storage";
import { documentMimeType, DOCUMENT_LIMITS, type DocumentMetadata } from "@/lib/ai/documents/validation";
import { isScenario } from "@/lib/storage";
import { mapRowToScenario } from "@/lib/supabase/scenarios";
import type { AdsbScenarioDefinition } from "@/modules/devices/adsb/scenario-parameters";
import { AuthoringError } from "./errors";
import { assertSafeJson } from "./forms/helpers";
import { createAuthoringState, mutateAuthoringState, applyAnalysisProposal, validateFinalAuthoring } from "./state";
import type { AnalysisJob, AnalysisRequest, AuthoringMutation, AuthoringProposal, AuthoringSession, AuthoringState } from "./types";

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const KEY=/^[A-Za-z0-9._:-]{1,128}$/;
function invalid(message="Thông tin yêu cầu không hợp lệ."):never { throw new AuthoringError("INVALID_INPUT",message); }
function ids(...values:string[]) { if(values.some(v=>typeof v!=="string"||!UUID.test(v)))invalid("Mã yêu cầu không hợp lệ."); }
function revision(value:number) { if(!Number.isSafeInteger(value)||value<1||value>=2147483647)invalid("Phiên bản yêu cầu không hợp lệ."); }
function key(value:string) { if(typeof value!=="string"||!KEY.test(value))invalid("Mã chống lặp không hợp lệ."); }
function moduleId(value:ScenarioParametersModuleId) { if(!isScenarioParametersModuleId(value))invalid("Thiết bị không được hỗ trợ."); }
function boundedJson(value:unknown) { assertSafeJson(value);const json=JSON.stringify(value);if(Buffer.byteLength(json)>2*1024*1024)invalid("Bản nháp vượt giới hạn lưu trữ.");return json; }
function documents(value:DocumentMetadata[]):DocumentMetadata[] {
 if(!Array.isArray(value)||value.length>DOCUMENT_LIMITS.count)invalid("Tối đa năm tài liệu.");
 let total=0;const seen=new Set<string>();
 for(const d of value) {
  if(!d||typeof d!=="object"||Object.keys(d).some(k=>!["id","name","mimeType","bytes","sha256","storageKey"].includes(k))||!UUID.test(d.id)||seen.has(d.id)||typeof d.storageKey!=="string")invalid("Tài liệu không hợp lệ.");
  const parts=d.storageKey.split("/");
  if(parts.length!==2||!UUID.test(parts[0])||parts[1]!==d.id||!Number.isSafeInteger(d.bytes)||d.bytes<1||d.bytes>DOCUMENT_LIMITS.fileBytes||typeof d.sha256!=="string"||!/^[a-f0-9]{64}$/.test(d.sha256))invalid("Tham chiếu tài liệu riêng tư không hợp lệ.");
  try { documentMimeType(d.name,d.mimeType); } catch { invalid("Tên hoặc loại tài liệu không hợp lệ."); }
  seen.add(d.id);total+=d.bytes;
 }
 if(total>DOCUMENT_LIMITS.totalBytes)invalid("Tổng tài liệu vượt 25 MiB.");
 return structuredClone(value);
}
async function reserveDocuments(client:PoolClient,sessionId:string,actorId:string,docs:DocumentMetadata[]) {
 const namespaces=[...new Set(docs.map(d=>d.storageKey.split("/")[0]))].sort();
 if(namespaces.length>1)invalid("Tài liệu phải thuộc cùng đợt tải lên riêng tư.");
 for(const namespace of namespaces){
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",[`ai-authoring-documents:${namespace}`]);
  const foreign=(await client.query(`select 1 from public.ai_authoring_document_namespaces where namespace=$1 and session_id<>$2
   union all select 1 from public.ai_authoring_sessions where id=$1 and id<>$2
   union all select 1 from public.ai_scenario_generation_jobs where id=$1 or exists(select 1 from jsonb_array_elements(documents_json) d where split_part(d->>$$storageKey$$,$$/$$,1)=$1::text) limit 1`,[namespace,sessionId])).rowCount;
  if(foreign)invalid("Tham chiếu tài liệu không thuộc bản nháp này.");
  await client.query("insert into public.ai_authoring_document_namespaces(namespace,session_id,actor_id) values($1,$2,$3) on conflict(namespace) do nothing",[namespace,sessionId,actorId]);
 }
}
const documentContent=(docs:DocumentMetadata[])=>docs.map(({name,mimeType,bytes,sha256})=>({name,mimeType,bytes,sha256}));
const hash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const iso=(value:unknown)=>value instanceof Date?value.toISOString():String(value);
function session(row:Record<string,unknown>):AuthoringSession {
 return {id:String(row.id),actorId:String(row.actor_id),moduleId:row.module_id as ScenarioParametersModuleId,revision:Number(row.revision),state:row.state_json as AuthoringState,documents:row.documents_json as DocumentMetadata[],status:row.status as AuthoringSession["status"],scenarioId:row.scenario_id as string|null,scenarioRowId:row.scenario_row_id as string|null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)};
}
function job(row:Record<string,unknown>):AnalysisJob {
 return {id:String(row.id),sessionId:String(row.session_id),actorId:String(row.actor_id),baseRevision:Number(row.base_revision),request:row.request_json as AnalysisRequest,state:row.state_json as AuthoringState,documents:row.documents_json as DocumentMetadata[],status:row.status as AnalysisJob["status"],attemptToken:row.attempt_token as string|null,errorCode:row.error_code as string|null,createdAt:iso(row.created_at)};
}
function boundedError(error:AuthoringError):AuthoringError {
 return new AuthoringError(error.code.slice(0,64),error.message.slice(0,500),error.issues.slice(0,100).map(issue=>({code:issue.code.slice(0,64),message:issue.message.slice(0,500),sectionId:issue.sectionId.slice(0,100),...(issue.fieldId?{fieldId:issue.fieldId.slice(0,300)}:{}),severity:issue.severity})));
}
async function transaction<T>(pool:Pool,work:(client:PoolClient)=>Promise<T>):Promise<T> {
 const client=await pool.connect();
 try { await client.query("begin");const value=await work(client);await client.query("commit");return value; }
 catch(error) { await client.query("rollback");if(error instanceof AuthoringError)throw boundedError(error);
  if(error&&typeof error==="object"&&"code"in error)throw new AuthoringError(error.code==="23505"?"ID_CONFLICT":"PERSISTENCE_FAILED",error.code==="23505"?"ID đã tồn tại. Chọn ID khác.":"Không thể lưu bản nháp; dữ liệu chưa thay đổi.");
  throw error;
 } finally { client.release(); }
}
async function requireIdleAnalysis(client:PoolClient,id:string) {
 if((await client.query("select id from public.ai_authoring_analysis_jobs where session_id=$1 and status in ($2,$3) limit 1",[id,"queued","running"])).rowCount)throw new AuthoringError("ANALYSIS_BUSY","Đợi phân tích hiện tại kết thúc trước khi tiếp tục.");
}
async function isAdmin(client:PoolClient,actorId:string):Promise<boolean> {
 return Boolean((await client.query("select id from public.users where id=$1 and role='admin' and is_active and not must_change_password for share",[actorId])).rowCount);
}
async function requireAdmin(client:PoolClient,actorId:string) { if(!await isAdmin(client,actorId))throw new AuthoringError("ACTOR_FORBIDDEN","Tài khoản không còn quyền soạn kịch bản."); }
async function owned(client:PoolClient,id:string,actorId:string) {
 const row=(await client.query("select * from public.ai_authoring_sessions where id=$1 and actor_id=$2 for update",[id,actorId])).rows[0];
 if(!row)throw new AuthoringError("NOT_FOUND","Không tìm thấy bản nháp.");return row;
}
function editable(row:Record<string,unknown>,expected:number) {
 if(row.status!=="editing")throw new AuthoringError("SESSION_COMPLETED","Bản nháp đã hoàn tất.");
 if(Number(row.revision)!==expected)throw new AuthoringError("REVISION_CONFLICT","Bản nháp đã thay đổi. Tải lại trước khi tiếp tục.");
}
export async function createAuthoringSession(pool:Pool,device:ScenarioParametersModuleId,options:{actorId:string;idempotencyKey:string;id?:string;documents?:DocumentMetadata[];context?:string}):Promise<AuthoringSession> {
 ids(options.actorId);if(options.id!==undefined)ids(options.id);key(options.idempotencyKey);moduleId(device);
 const docs=documents(options.documents??[]),context=options.context??"";
 if(typeof context!=="string"||context.length>8000||context.includes("\0"))invalid("Mô tả phân tích tối đa 8000 ký tự.");
 const inputHash=hash({moduleId:device,context,documents:documentContent(docs)});
 return transaction(pool,async client=>{
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",[`ai-authoring:${options.actorId}`]);
  await requireAdmin(client,options.actorId);
  const previous=(await client.query("select * from public.ai_authoring_sessions where actor_id=$1 and idempotency_key=$2",[options.actorId,options.idempotencyKey])).rows[0];
  if(previous){if(previous.input_hash!==inputHash)throw new AuthoringError("IDEMPOTENCY_CONFLICT","Mã yêu cầu đã dùng cho nội dung khác.");return session(previous);}
  const count=(await client.query("select count(*)::integer total from public.ai_authoring_sessions where actor_id=$1 and status='editing'",[options.actorId])).rows[0].total;
  if(count>=20)throw new AuthoringError("SESSION_QUOTA","Hoàn tất một bản nháp trước khi tạo thêm (tối đa 20).");
  const state=createAuthoringState(device,`${device}-guided-${randomUUID()}`);state.context=context;
  const result=await client.query("insert into public.ai_authoring_sessions(id,actor_id,module_id,state_json,documents_json,input_hash,idempotency_key) values($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7) returning *",[options.id??randomUUID(),options.actorId,device,boundedJson(state),JSON.stringify(docs),inputHash,options.idempotencyKey]);
  await reserveDocuments(client,String(result.rows[0].id),options.actorId,docs);
  return session(result.rows[0]);
 });
}
export async function getAuthoringSession(pool:Pool,id:string,actorId:string):Promise<AuthoringSession|null> {
 ids(id,actorId);return transaction(pool,async client=>{await requireAdmin(client,actorId);const row=(await client.query("select * from public.ai_authoring_sessions where id=$1 and actor_id=$2",[id,actorId])).rows[0];return row?session(row):null;});
}
export async function listAuthoringSessions(pool:Pool,actorId:string,device:ScenarioParametersModuleId):Promise<AuthoringSession[]> {
 ids(actorId);moduleId(device);return transaction(pool,async client=>{await requireAdmin(client,actorId);return (await client.query("select * from public.ai_authoring_sessions where actor_id=$1 and module_id=$2 order by updated_at desc,id desc limit 20",[actorId,device])).rows.map(session);});
}
export async function updateAuthoringSession(pool:Pool,id:string,actorId:string,expectedRevision:number,mutation:AuthoringMutation):Promise<AuthoringSession> {
 ids(id,actorId);revision(expectedRevision);assertSafeJson(mutation);
 return transaction(pool,async client=>{await requireAdmin(client,actorId);const row=await owned(client,id,actorId);editable(row,expectedRevision);
  if(mutation.action==="navigate")await requireIdleAnalysis(client,id);
  const next=mutateAuthoringState(row.state_json,mutation);
  return session((await client.query("update public.ai_authoring_sessions set state_json=$2::jsonb,revision=revision+1 where id=$1 returning *",[id,boundedJson(next)])).rows[0]);
 });
}

function analysisRequest(value:AnalysisRequest):AnalysisRequest {
 assertSafeJson(value);
 if(!value||!["baseline","guidance"].includes(value.kind)||typeof value.question!=="string"||value.question.length>8000||Object.keys(value).some(k=>!["kind","question","sectionId"].includes(k))||(value.sectionId!==undefined&&(typeof value.sectionId!=="string"||!/^[A-Za-z0-9._-]{1,100}$/.test(value.sectionId))))invalid("Câu hỏi phân tích không hợp lệ.");
 return {kind:value.kind,question:value.question,...(value.sectionId!==undefined?{sectionId:value.sectionId}:{})};
}
export async function enqueueAuthoringAnalysis(pool:Pool,id:string,actorId:string,expectedRevision:number,request:AnalysisRequest,options:{idempotencyKey:string;documents?:DocumentMetadata[]}):Promise<AnalysisJob> {
 ids(id,actorId);revision(expectedRevision);key(options.idempotencyKey);const input=analysisRequest(request),replacement=options.documents===undefined?undefined:documents(options.documents);
 const inputHash=hash({expectedRevision,request:input,documents:replacement===undefined?null:documentContent(replacement)});
 return transaction(pool,async client=>{
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",[`ai-authoring:${actorId}`]);await requireAdmin(client,actorId);
  const row=await owned(client,id,actorId);
  const existing=(await client.query("select * from public.ai_authoring_analysis_jobs where session_id=$1 and idempotency_key=$2",[id,options.idempotencyKey])).rows[0];
  if(existing){if(existing.input_hash!==inputHash)throw new AuthoringError("IDEMPOTENCY_CONFLICT","Mã yêu cầu đã dùng cho nội dung khác.");return job(existing);}
  editable(row,expectedRevision);
  if(row.state_json.proposal)throw new AuthoringError("PROPOSAL_PENDING","Áp dụng hoặc từ chối đề xuất hiện tại trước khi phân tích lại.");
  const count=(await client.query("select count(*)::integer total from public.ai_authoring_analysis_jobs where actor_id=$1 and status in ('queued','running')",[actorId])).rows[0].total;
  if(count>=2)throw new AuthoringError("ACTIVE_QUOTA","Chỉ có thể phân tích đồng thời hai yêu cầu.");
  await requireIdleAnalysis(client,id);
  const daily=(await client.query("select count(*)::integer total from public.ai_authoring_analysis_jobs where actor_id=$1 and created_at>=clock_timestamp()-interval $$24 hours$$",[actorId])).rows[0].total;
  if(daily>=50)throw new AuthoringError("DAILY_QUOTA","Tối đa 50 lần phân tích trong 24 giờ.");
  const snapshot=structuredClone(row.state_json) as AuthoringState;
  const docs=replacement??row.documents_json;
  await reserveDocuments(client,id,actorId,docs);
  const updated=(await client.query("update public.ai_authoring_sessions set revision=revision+1,state_json=$2::jsonb,documents_json=$3::jsonb where id=$1 returning revision",[id,boundedJson(snapshot),JSON.stringify(docs)])).rows[0];
  return job((await client.query("insert into public.ai_authoring_analysis_jobs(id,session_id,actor_id,base_revision,request_json,state_json,documents_json,input_hash,idempotency_key) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9) returning *",[randomUUID(),id,actorId,updated.revision,JSON.stringify(input),boundedJson(snapshot),JSON.stringify(docs),inputHash,options.idempotencyKey])).rows[0]);
 });
}
export async function latestAuthoringAnalysis(pool:Pool,sessionId:string,actorId:string):Promise<AnalysisJob|null> {
 ids(sessionId,actorId);return transaction(pool,async client=>{await requireAdmin(client,actorId);const row=(await client.query("select j.* from public.ai_authoring_analysis_jobs j join public.ai_authoring_sessions s on s.id=j.session_id where j.session_id=$1 and s.actor_id=$2 order by j.created_at desc,j.id desc limit 1",[sessionId,actorId])).rows[0];return row?job(row):null;});
}
export async function claimAuthoringAnalysis(pool:Pool,workerId:string):Promise<AnalysisJob|null> {
 if(typeof workerId!=="string"||!workerId.trim()||workerId.length>200)invalid("Worker không hợp lệ.");
 return transaction(pool,async client=>{
  await client.query(`with invalid as (
   select j.id,case when not exists(select 1 from public.users u where u.id=j.actor_id and u.role='admin' and u.is_active and not u.must_change_password) then 'ACTOR_FORBIDDEN' else 'ATTEMPTS_EXHAUSTED' end as code
   from public.ai_authoring_analysis_jobs j where (status='queued' or (status='running' and lease_expires_at<=now()))
   and (attempts>=2 or not exists(select 1 from public.users u where u.id=j.actor_id and u.role='admin' and u.is_active and not u.must_change_password)) for update skip locked
  ) update public.ai_authoring_analysis_jobs j set status='failed',error_code=invalid.code,lease_expires_at=null,completed_at=now() from invalid where j.id=invalid.id`);
  const candidate=(await client.query("select * from public.ai_authoring_analysis_jobs where attempts<2 and (status='queued' or (status='running' and lease_expires_at<=now())) order by created_at,id for update skip locked limit 1")).rows[0];
  if(!candidate)return null;
  if(!await isAdmin(client,candidate.actor_id)){await client.query("update public.ai_authoring_analysis_jobs set status='failed',error_code='ACTOR_FORBIDDEN',lease_expires_at=null,completed_at=now() where id=$1",[candidate.id]);return null;}
  return job((await client.query("update public.ai_authoring_analysis_jobs set status='running',attempts=attempts+1,attempt_token=$2,worker_id=$3,lease_expires_at=clock_timestamp()+interval '10 minutes',error_code=null where id=$1 returning *",[candidate.id,randomUUID(),workerId])).rows[0]);
 });
}
async function liveJob(client:PoolClient,id:string,attemptToken:string) {
 const row=(await client.query("select *,lease_expires_at>clock_timestamp() as live_lease from public.ai_authoring_analysis_jobs where id=$1 for update",[id])).rows[0];
 if(!row||row.status!=="running"||!row.live_lease||row.attempt_token!==attemptToken)return null;
 if(!await isAdmin(client,row.actor_id)){
  await client.query("update public.ai_authoring_analysis_jobs set status='failed',error_code='ACTOR_FORBIDDEN',lease_expires_at=null,completed_at=now() where id=$1",[id]);return null;
 }
 return row;
}
export async function heartbeatAuthoringAnalysis(pool:Pool,id:string,attemptToken:string):Promise<boolean> {
 ids(id,attemptToken);return transaction(pool,async client=>{if(!await liveJob(client,id,attemptToken))return false;return Boolean((await client.query("update public.ai_authoring_analysis_jobs set lease_expires_at=clock_timestamp()+interval '10 minutes' where id=$1 and lease_expires_at>clock_timestamp() returning id",[id])).rowCount);});
}
export async function finishAuthoringAnalysis(pool:Pool,id:string,attemptToken:string,proposal:Omit<AuthoringProposal,"id"|"baseRevision">):Promise<boolean> {
 ids(id,attemptToken);assertSafeJson(proposal);
 return transaction(pool,async client=>{
  const row=await liveJob(client,id,attemptToken);if(!row)return false;
  const current=await owned(client,row.session_id,row.actor_id);
  if(!(await client.query("select id from public.ai_authoring_analysis_jobs where id=$1 and lease_expires_at>clock_timestamp()",[id])).rowCount)return false;
  if(current.status!=="editing"||current.revision!==row.base_revision){await client.query("update public.ai_authoring_analysis_jobs set status='stale',error_code='REVISION_CONFLICT',lease_expires_at=null,completed_at=now() where id=$1",[id]);return false;}
  const stamped:AuthoringProposal={...proposal,id:randomUUID(),baseRevision:row.base_revision};
  if(stamped.kind!==row.request_json.kind||stamped.sectionId!==row.request_json.sectionId)invalid("Phạm vi đề xuất không khớp yêu cầu.");
  const next=applyAnalysisProposal(current.state_json,stamped);
  const nextJson=boundedJson(next);
  await client.query("savepoint authoring_analysis_finish");
  await client.query("update public.ai_authoring_sessions set state_json=$2::jsonb,revision=revision+1 where id=$1",[current.id,nextJson]);
  const completed=await client.query("update public.ai_authoring_analysis_jobs set status='completed',lease_expires_at=null,completed_at=now() where id=$1 and lease_expires_at>clock_timestamp() returning id",[id]);
  if(!completed.rowCount){await client.query("rollback to savepoint authoring_analysis_finish");return false;}
  return true;
 });
}
const FAILURE_CODES=new Set(["ANALYSIS_FAILED","PROVIDER_ERROR","PROVIDER_UNAVAILABLE","PROVIDER_AUTH","PROVIDER_RATE_LIMIT","PROVIDER_TIMEOUT","PROVIDER_TRUNCATED","PROVIDER_INVALID_RESPONSE","INVALID_PROPOSAL","INVALID_CITATION","EXTRACTION_FAILED","DOCUMENT_ERROR","INVALID_DOCUMENT","DOCUMENT_TIMEOUT","DOCUMENT_RESOURCE_LIMIT","INVALID_STORAGE_KEY","DOCUMENT_INTEGRITY","TIMEOUT","ACTOR_FORBIDDEN","ATTEMPTS_EXHAUSTED"]);
export async function failAuthoringAnalysis(pool:Pool,id:string,attemptToken:string,code:string):Promise<void> {
 ids(id,attemptToken);await transaction(pool,async client=>{if(!await liveJob(client,id,attemptToken))return;await client.query("update public.ai_authoring_analysis_jobs set status='failed',error_code=$2,lease_expires_at=null,completed_at=now() where id=$1 and lease_expires_at>clock_timestamp()",[id,FAILURE_CODES.has(code)?code:"ANALYSIS_FAILED"]);});
}

function collision():never {
 throw new AuthoringError("ID_CONFLICT","ID kịch bản đã tồn tại. Chọn ID khác trước khi xác nhận.",[{code:"ID_CONFLICT",sectionId:"metadata",fieldId:"id",severity:"error",message:"ID đã được dùng bởi nguồn hiện có (kể cả thiết bị khác hoặc ADS-B legacy)."}]);
}
export async function finalizeAuthoringSession(pool:Pool,id:string,actorId:string,expectedRevision:number,idempotencyKey:string):Promise<AuthoringSession> {
 ids(id,actorId);revision(expectedRevision);key(idempotencyKey);
 return transaction(pool,async client=>{
  await requireAdmin(client,actorId);const row=await owned(client,id,actorId);
  if(row.status==="completed") {
   if(row.finalize_idempotency_key===idempotencyKey&&row.finalized_revision===expectedRevision)return session(row);
   throw new AuthoringError("FINALIZE_CONFLICT","Bản nháp đã được hoàn tất bởi yêu cầu khác.");
  }
  editable(row,expectedRevision);
  await requireIdleAnalysis(client,id);
  const {definition:reviewed}=validateFinalAuthoring(row.state_json);
  const definition=parseScenarioParameters(row.module_id,reviewed);
  if(!definition||definition.id!==reviewed.id||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(reviewed.id))throw new AuthoringError("INVALID_DEFINITION","Kịch bản không đạt kiểm tra định dạng native.",[{code:"INVALID_DEFINITION",sectionId:"metadata",severity:"error",message:"Kiểm tra các trường trong bản nháp trước khi xác nhận."}]);
  // All source writers take a ROW EXCLUSIVE lock. This protects the cross-module
  // check even against legacy/manual writers that do not use our advisory locks.
  await client.query("lock table public.simulator_scenario_parameters, public.scenarios in share row exclusive mode");
  if((await client.query("select 1 from public.simulator_scenario_parameters where scenario_id=$1 union all select 1 from public.scenarios where id=$1 limit 1",[reviewed.id])).rowCount)collision();
  const stored=storedScenarioParametersToRow({moduleId:row.module_id,definition,createdBy:actorId,sourceFileName:"ai-guided-authoring"});
  if(stored.scenario_id!==reviewed.id)collision();
  let legacy:Record<string,unknown>|null=null;
  if(row.module_id==="ads-b") {
   const adsb=definition as AdsbScenarioDefinition;
   legacy={id:reviewed.id,title:adsb.name,description:adsb.description,difficulty:{basic:"easy",intermediate:"medium",advanced:"hard"}[adsb.difficulty],sites_json:JSON.stringify(adsb.sites),target_sensor_id:adsb.targetSensorId,target_login_user:adsb.targetLoginUser,expected_actions_json:JSON.stringify(adsb.expectedActions),hardware_fault_json:adsb.hardwareFault?JSON.stringify(adsb.hardwareFault):null,event_log_json:adsb.eventLog?JSON.stringify(adsb.eventLog):null,created_at:new Date().toISOString(),updated_at:null};
   if(!isScenario(mapRowToScenario(legacy)))throw new AuthoringError("INVALID_DEFINITION","Nguồn ADS-B không hợp lệ; chưa lưu thay đổi.");
  }
  const scenarioRowId=randomUUID(),columns=Object.keys(stored) as Array<keyof typeof stored>;
  await client.query(`insert into public.simulator_scenario_parameters(id,${columns.join(",")}) values($1,${columns.map((_,i)=>`$${i+2}`).join(",")})`,[scenarioRowId,...columns.map(k=>stored[k])]);
  if(legacy){const keys=Object.keys(legacy);await client.query(`insert into public.scenarios(${keys.join(",")}) values(${keys.map((_,i)=>`$${i+1}`).join(",")})`,keys.map(k=>legacy![k]));}
  return session((await client.query("update public.ai_authoring_sessions set status='completed',scenario_id=$2,scenario_row_id=$3,finalize_idempotency_key=$4,finalized_revision=$5,completed_at=now() where id=$1 returning *",[id,reviewed.id,scenarioRowId,idempotencyKey,expectedRevision])).rows[0]);
 });
}
