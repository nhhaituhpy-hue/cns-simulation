import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDatabasePool } from "@/lib/db";
import { isScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { saveDocuments } from "@/lib/ai/documents/storage";
import { DOCUMENT_LIMITS, validateUploads, type DocumentUpload } from "@/lib/ai/documents/validation";
import { isGenerationJobId } from "@/lib/ai/scenario-generation/jobs";
import { AuthoringError } from "./errors";
import { authoringStateDto } from "./state";
import { assertSafeJson } from "./forms/helpers";
import { createAuthoringSession, getAuthoringSession, listAuthoringSessions, updateAuthoringSession, enqueueAuthoringAnalysis, latestAuthoringAnalysis, finalizeAuthoringSession, deleteAuthoringSession } from "./repository";
import type { AuthoringMutation, AuthoringSession } from "./types";
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"private, no-store"}});
async function auth(request?:Request){
 const profile=await getCurrentProfile();if(!profile)return{response:json({error:"Chưa đăng nhập.",code:"UNAUTHORIZED"},401)};
 if(profile.role!=="admin")return{response:json({error:"Không có quyền soạn kịch bản.",code:"FORBIDDEN"},403)};
 if(request){const expected=process.env.CNS_PUBLIC_ORIGIN||new URL(request.url).origin;if(request.headers.get("origin")!==expected||request.headers.get("sec-fetch-site")==="cross-site")return{response:json({error:"Nguồn yêu cầu không hợp lệ.",code:"INVALID_ORIGIN"},403)};}
 return{profile};
}
function input(message="Thông tin yêu cầu không hợp lệ."):never{throw new AuthoringError("INVALID_INPUT",message);}
function revision(value:unknown):number{if(!Number.isSafeInteger(value)||Number(value)<1)input("Cần phiên bản bản nháp hợp lệ.");return value as number;}
function key(request:Request):string{const value=request.headers.get("idempotency-key");if(!value||!/^[A-Za-z0-9._:-]{1,128}$/.test(value))input("Mã yêu cầu không hợp lệ.");return value;}
function errorResponse(e:unknown){
 if(e instanceof AuthoringError){
  const status=/FORBIDDEN|REVOKED/.test(e.code)?403:/NOT_FOUND/.test(e.code)?404:/CONFLICT|STALE|COMPLETED|BUSY/.test(e.code)?409:/QUOTA/.test(e.code)?429:/INVALID_INPUT|INVALID_ACTION|INVALID_MODULE|INVALID_STEP/.test(e.code)?400:422;
  return json({error:e.message.slice(0,500),code:e.code,issues:e.issues.slice(0,100)},status);
 }
 const code=e&&typeof e==="object"&&"code"in e?String(e.code):"";
 if(/^(INVALID_UPLOAD|UNSUPPORTED_DOCUMENT|DOCUMENT_TOO_LARGE|INVALID_DOCUMENT)/.test(code))return json({error:"Tài liệu không hợp lệ. Dùng PDF có chữ, DOCX, TXT hoặc MD trong giới hạn hiển thị.",code:"INVALID_DOCUMENT"},400);
 return json({error:"Chưa thể xử lý bản nháp. Nội dung đã lưu được giữ nguyên; vui lòng thử lại.",code:"AUTHORING_UNAVAILABLE"},503);
}
async function bytes(request:Request,max:number){
 const length=request.headers.get("content-length");if(length!==null&&(!/^\d+$/.test(length)||!Number.isSafeInteger(Number(length))||Number(length)>max))input("Dung lượng yêu cầu vượt giới hạn.");
 if(!request.body)input();const reader=request.body.getReader();const chunks:Uint8Array[]=[];let total=0;
 try{for(;;){const{value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();input("Dung lượng yêu cầu vượt giới hạn.");}chunks.push(value);}}finally{reader.releaseLock();}
 return Buffer.concat(chunks);
}
async function multipart(request:Request,allowed:string[]){
 const contentType=request.headers.get("content-type")??"";if(!/^multipart\/form-data\s*;/i.test(contentType))input();
 const raw=await bytes(request,DOCUMENT_LIMITS.totalBytes+1024*1024);let form:FormData;try{form=await new Response(raw,{headers:{"Content-Type":contentType}}).formData();}catch{input();}
 for(const name of form.keys())if(!allowed.includes(name)||(name!=="files"&&(form.getAll(name).length!==1||typeof form.get(name)!=="string")))input();
 const files=form.getAll("files");if(files.some(f=>typeof f==="string"))input();validateUploads(files as DocumentUpload[]);
 return{form,files:files as DocumentUpload[]};
}
async function jsonBody(request:Request,allowed:string[]){
 if(!/^application\/json(?:;|$)/i.test(request.headers.get("content-type")??""))input();
 let value:unknown;try{value=JSON.parse((await bytes(request,750000)).toString("utf8"));}catch{input();}
 assertSafeJson(value);if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))input();return value as Record<string,unknown>;
}
function mutation(value:unknown):AuthoringMutation{
 if(!value||typeof value!=="object"||Array.isArray(value))input();const v=value as Record<string,unknown>;
 const fields:Record<string,string[]>={edit:["action","changes"],"edit-context":["action","context"],confirm:["action","sectionId"],navigate:["action","sectionId"],"apply-proposal":["action","proposalId","fieldIds"],"dismiss-proposal":["action","proposalId"],"reset-field":["action","fieldId"],"confirm-blueprint":["action"]};
 const keys=typeof v.action==="string"?fields[v.action]:null;if(!keys||Object.keys(v).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(v,k)))input();
 if(v.action==="edit"&&(!Array.isArray(v.changes)||v.changes.length>1000))input();
 if(v.action==="edit-context"&&(typeof v.context!=="string"||v.context.length>2000||v.context.includes("\0")))input("Mục tiêu huấn luyện tối đa 2000 ký tự.");
 for(const k of ["sectionId","proposalId","fieldId"])if(k in v&&(typeof v[k]!=="string"||v[k].length>300))input();
 if("fieldIds"in v&&(!Array.isArray(v.fieldIds)||v.fieldIds.length>1000||v.fieldIds.some(x=>typeof x!=="string"||x.length>300)))input();
 return v as unknown as AuthoringMutation;
}
async function dto(session:AuthoringSession,actorId:string){return authoringStateDto(session,await latestAuthoringAnalysis(getDatabasePool(),session.id,actorId));}
async function cleanup(directory:string){await rm(/* turbopackIgnore: true */ join(/* turbopackIgnore: true */ process.env.CNS_AI_STORAGE_DIR||"/app/storage/ai-scenarios",directory),{recursive:true,force:true}).catch(()=>undefined);}
function available(){if(process.env.CNS_AI_ENABLED!=="true")throw new AuthoringError("PROVIDER_NOT_CONFIGURED","Chức năng AI chưa được bật. Bản nháp đã lưu không bị mất.");}
export async function listAuthoringResponse(request:Request){const a=await auth();if(a.response)return a.response;
 try{const moduleId=new URL(request.url).searchParams.get("moduleId")??"";if(!isScenarioParametersModuleId(moduleId))input();const sessions=await listAuthoringSessions(getDatabasePool(),a.profile!.id,moduleId);return json({sessions:sessions.map(s=>({id:s.id,moduleId:s.moduleId,status:s.status,revision:s.revision,name:s.state.definition.name,updatedAt:s.updatedAt,scenarioRowId:s.scenarioRowId,scenarioId:s.scenarioId}))});}catch(e){return errorResponse(e);}
}
export async function createAuthoringResponse(request:Request){const a=await auth(request);if(a.response)return a.response;const directory=randomUUID();let retained=false,saved=false,cleanupSafe=false;
 try{available();const idempotencyKey=key(request);const{form,files}=await multipart(request,["moduleId","context","files","mode"]);const moduleId=form.get("moduleId");if(typeof moduleId!=="string"||!isScenarioParametersModuleId(moduleId))input();const context=String(form.get("context")??"");if(context.length>4000)input();
  const mode=form.get("mode");if(mode!==null&&mode!=="documents"&&mode!=="description")input();
  if(mode&&context.length>2000)input("Mô tả tình huống tối đa 2000 ký tự.");
  if(mode==="description"&&!context.trim())input("Hãy mô tả tình huống cần tạo.");
  if(mode==="documents"&&!files.length)input("Hãy chọn tài liệu trước khi tạo bài.");
  const documents=await saveDocuments(directory,files);saved=documents.length>0;
  let session=await createAuthoringSession(getDatabasePool(),moduleId,{actorId:a.profile!.id,idempotencyKey,id:directory,documents,context,...(mode?{mode}:{})});retained=session.id===directory;cleanupSafe=!retained;
  if((mode||session.documents?.length)&&!(await latestAuthoringAnalysis(getDatabasePool(),session.id,a.profile!.id))){const kind=mode?"blueprint":"baseline";await enqueueAuthoringAnalysis(getDatabasePool(),session.id,a.profile!.id,session.revision,{kind,question:context},{idempotencyKey:createHash("sha256").update(idempotencyKey+":"+kind).digest("hex")});session=(await getAuthoringSession(getDatabasePool(),session.id,a.profile!.id))!;}
  return json({session:await dto(session,a.profile!.id)},201);
 }catch(e){return errorResponse(e);}finally{if(saved&&cleanupSafe&&!retained)await cleanup(directory);}
}
export async function getAuthoringResponse(id:string){const a=await auth();if(a.response)return a.response;if(!isGenerationJobId(id))return json({error:"Không tìm thấy bản nháp.",code:"NOT_FOUND"},404);
 try{const session=await getAuthoringSession(getDatabasePool(),id,a.profile!.id);return session?json({session:await dto(session,a.profile!.id)}):json({error:"Không tìm thấy bản nháp.",code:"NOT_FOUND"},404);}catch(e){return errorResponse(e);}
}
export async function updateAuthoringResponse(request:Request,id:string){const a=await auth(request);if(a.response)return a.response;
 try{if(!isGenerationJobId(id))input();const b=await jsonBody(request,["expectedRevision","mutation"]);const session=await updateAuthoringSession(getDatabasePool(),id,a.profile!.id,revision(b.expectedRevision),mutation(b.mutation));return json({session:await dto(session,a.profile!.id)});}catch(e){return errorResponse(e);}
}
export async function analyzeAuthoringResponse(request:Request,id:string){const a=await auth(request);if(a.response)return a.response;const directory=randomUUID();let retained=false,saved=false,cleanupSafe=false;
 try{available();if(!isGenerationJobId(id))input();const idempotencyKey=key(request);const{form,files}=await multipart(request,["expectedRevision","kind","sectionId","question","files"]);const raw=String(form.get("expectedRevision")??"");if(!/^[1-9]\d*$/.test(raw))input();const expected=revision(Number(raw));const kind=form.get("kind");if(kind!=="baseline"&&kind!=="guidance"&&kind!=="blueprint")input();const question=String(form.get("question")??"");const sectionId=form.get("sectionId");if(question.length>4000||(kind==="guidance"&&(!question.trim()||typeof sectionId!=="string"||!sectionId))||(sectionId!==null&&String(sectionId).length>100)||(kind==="blueprint"&&sectionId!==null))input();
  if(kind==="blueprint"&&question.length>2000)input("Mô tả tình huống tối đa 2000 ký tự.");
  const current=await getAuthoringSession(getDatabasePool(),id,a.profile!.id);if(!current)return json({error:"Không tìm thấy bản nháp.",code:"NOT_FOUND"},404);
  const documents=files.length?await saveDocuments(directory,files):undefined;saved=!!documents?.length;
  const job=await enqueueAuthoringAnalysis(getDatabasePool(),id,a.profile!.id,expected,{kind,question,...(sectionId?{sectionId:String(sectionId)}:{})},{idempotencyKey,...(documents?{documents}:{})});
  retained=!!documents?.some(d=>job.documents.some(existing=>existing.storageKey===d.storageKey));cleanupSafe=!retained;
  const session=(await getAuthoringSession(getDatabasePool(),id,a.profile!.id))!;return json({session:await dto(session,a.profile!.id)},202);
 }catch(e){return errorResponse(e);}finally{if(saved&&cleanupSafe&&!retained)await cleanup(directory);}
}
export async function finalizeAuthoringResponse(request:Request,id:string){const a=await auth(request);if(a.response)return a.response;
 try{if(!isGenerationJobId(id))input();const idempotencyKey=key(request);const b=await jsonBody(request,["expectedRevision"]);const session=await finalizeAuthoringSession(getDatabasePool(),id,a.profile!.id,revision(b.expectedRevision),idempotencyKey);return json({session:await dto(session,a.profile!.id)});}catch(e){return errorResponse(e);}
}
export async function downloadAuthoringResponse(id:string){const a=await auth();if(a.response)return a.response;
 try{if(!isGenerationJobId(id))input();const s=await getAuthoringSession(getDatabasePool(),id,a.profile!.id);if(!s)return json({error:"Không tìm thấy kịch bản.",code:"NOT_FOUND"},404);if(s.status!=="completed")throw new AuthoringError("AUTHORING_INCOMPLETE","Hãy xác nhận và hoàn tất trước khi tải JSON.");const name=/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(s.state.definition.id)?s.state.definition.id:"scenario";return new Response(JSON.stringify(s.state.definition,null,2),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="${name}.json"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}catch(e){return errorResponse(e);}
}
export async function deleteAuthoringResponse(request:Request,id:string){const a=await auth(request);if(a.response)return a.response;if(!isGenerationJobId(id))return json({error:"Không tìm thấy bản nháp.",code:"NOT_FOUND"},404);
 try{const removed=await deleteAuthoringSession(getDatabasePool(),id,a.profile!.id);for(const dir of removed.namespaces)if(isGenerationJobId(dir))await cleanup(dir);return json({deleted:true,id:removed.id});}catch(e){return errorResponse(e);}
}
