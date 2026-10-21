// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const h=vi.hoisted(()=>({profile:vi.fn(),create:vi.fn(),get:vi.fn(),list:vi.fn(),update:vi.fn(),enqueue:vi.fn(),latest:vi.fn(),finalize:vi.fn(),remove:vi.fn(),save:vi.fn()}));
vi.mock("@/lib/auth/profile",()=>({getCurrentProfile:h.profile}));
vi.mock("@/lib/db",()=>({getDatabasePool:()=>({})}));
vi.mock("@/lib/ai/documents/storage",()=>({saveDocuments:h.save}));
vi.mock("@/lib/ai/scenario-authoring/repository",()=>({createAuthoringSession:h.create,getAuthoringSession:h.get,listAuthoringSessions:h.list,updateAuthoringSession:h.update,enqueueAuthoringAnalysis:h.enqueue,latestAuthoringAnalysis:h.latest,finalizeAuthoringSession:h.finalize,deleteAuthoringSession:h.remove}));
vi.mock("@/lib/ai/scenario-authoring/state",()=>({authoringStateDto:(s:unknown)=>s}));
import { createAuthoringResponse, getAuthoringResponse, updateAuthoringResponse, finalizeAuthoringResponse, analyzeAuthoringResponse, listAuthoringResponse, deleteAuthoringResponse } from "@/lib/ai/scenario-authoring/api-service";
const id="11111111-1111-4111-8111-111111111111";const session={id,moduleId:"dvor-1150a",revision:1,status:"editing",state:{definition:{name:"Draft"}}};
function request(form:FormData){return new Request("https://labs.cnsvn.com/api/ai/scenario-authoring",{method:"POST",headers:{Origin:"https://labs.cnsvn.com","Idempotency-Key":"test-1"},body:form});}
beforeEach(()=>{vi.clearAllMocks();process.env.CNS_AI_ENABLED="true";process.env.CNS_PUBLIC_ORIGIN="https://labs.cnsvn.com";h.profile.mockResolvedValue({id,role:"admin"});h.create.mockImplementation(async(_pool,_module,options)=>({...session,id:options.id,documents:options.documents}));h.get.mockResolvedValue(session);h.latest.mockResolvedValue(null);h.save.mockResolvedValue([]);h.list.mockResolvedValue([session]);});
describe("guided authoring HTTP boundary",()=>{
 it("accepts only an exact bounded context mutation with an expected revision",async()=>{
  h.update.mockResolvedValue({...session,revision:2});
  const send=(mutation:unknown)=>updateAuthoringResponse(new Request("https://labs.cnsvn.com/a",{method:"PATCH",headers:{origin:"https://labs.cnsvn.com","Content-Type":"application/json"},body:JSON.stringify({expectedRevision:1,mutation})}),id);
  expect((await send({action:"edit-context",context:"Mục tiêu mới"})).status).toBe(200);
  expect(h.update).toHaveBeenCalledWith(expect.anything(),id,id,1,{action:"edit-context",context:"Mục tiêu mới"});
  h.update.mockClear();
  for(const mutation of [{action:"edit-context",context:"x".repeat(2001)},{action:"edit-context",context:null},{action:"edit-context",context:"a\0b"},{action:"edit-context",context:"brief",blueprint:{}},{action:"edit-context"}])expect((await send(mutation)).status).toBe(400);
  expect(h.update).not.toHaveBeenCalled();
 });
 it("rejects an oversized brief before saving a draft that the generator cannot handle",async()=>{
  const f=new FormData();f.set("moduleId","dvor-1150a");f.set("mode","description");f.set("context","x".repeat(2001));
  expect((await createAuthoringResponse(request(f))).status).toBe(400);expect(h.create).not.toHaveBeenCalled();
 });
 it("queues a blueprint from a natural-language description without uploaded files",async()=>{
  const f=new FormData();f.set("moduleId","dvor-1150a");f.set("mode","description");f.set("context","TX1 cảnh báo công suất thấp, kiểm tra và khôi phục theo manual.");
  const response=await createAuthoringResponse(request(f));
  expect(response.status).toBe(201);
  expect(h.create).toHaveBeenCalledWith(expect.anything(),"dvor-1150a",expect.objectContaining({mode:"description",context:f.get("context")}));
  expect(h.enqueue).toHaveBeenCalledWith(expect.anything(),expect.any(String),id,1,{kind:"blueprint",question:f.get("context")},expect.objectContaining({idempotencyKey:expect.any(String)}));
  expect(h.finalize).not.toHaveBeenCalled();
 });
 it("creates only a draft with native defaults without provider credentials",async()=>{const form=new FormData();form.set("moduleId","dvor-1150a");const r=await createAuthoringResponse(request(form));expect(r.status).toBe(201);expect((await r.json()).session.status).toBe("editing");expect(h.enqueue).not.toHaveBeenCalled();expect(h.finalize).not.toHaveBeenCalled();});
 it("enqueues baseline analysis after upload but does not finalize a scenario",async()=>{const f=new FormData();f.set("moduleId","dvor-1150a");f.append("files",new File(["Công suất TX1: 125 W"],"defaults.txt",{type:"text/plain"}));h.save.mockResolvedValue([{id,name:"defaults.txt",mimeType:"text/plain",bytes:25,sha256:"a".repeat(64),storageKey:"private"}]);const r=await createAuthoringResponse(request(f));expect(r.status).toBe(201);expect(h.enqueue).toHaveBeenCalled();expect(h.finalize).not.toHaveBeenCalled();});
 it("denies unauthenticated and student access before file parsing",async()=>{h.profile.mockResolvedValue(null);expect((await createAuthoringResponse(request(new FormData()))).status).toBe(401);h.profile.mockResolvedValue({id,role:"student"});expect((await getAuthoringResponse(id)).status).toBe(403);expect(h.save).not.toHaveBeenCalled();});
 it("rejects cross-origin and arbitrary multipart fields",async()=>{const f=new FormData();f.set("moduleId","dvor-1150a");f.set("actorId",id);expect((await createAuthoringResponse(request(f))).status).toBe(400);const r=new Request("https://labs.cnsvn.com/api/ai/scenario-authoring",{method:"POST",headers:{origin:"https://bad.example"},body:f});expect((await createAuthoringResponse(r)).status).toBe(403);expect(h.create).not.toHaveBeenCalled();});
 it("accepts an explicit whole-blueprint confirmation without client-supplied rubric",async()=>{
  h.update.mockResolvedValue({...session,revision:2});
  const r=new Request("https://labs.cnsvn.com/a",{method:"PATCH",headers:{origin:"https://labs.cnsvn.com","Content-Type":"application/json"},body:JSON.stringify({expectedRevision:1,mutation:{action:"confirm-blueprint"}})});
  expect((await updateAuthoringResponse(r,id)).status).toBe(200);
  expect(h.update).toHaveBeenCalledWith(expect.anything(),id,id,1,{action:"confirm-blueprint"});
 });
 it("requires an exact revision for edits and final confirmation",async()=>{const req=new Request("https://labs.cnsvn.com/a",{method:"PATCH",headers:{origin:"https://labs.cnsvn.com","Content-Type":"application/json"},body:JSON.stringify({mutation:{action:"navigate",sectionId:"initial"}})});expect((await updateAuthoringResponse(req,id)).status).toBe(400);expect(h.update).not.toHaveBeenCalled();h.finalize.mockResolvedValue({...session,status:"completed"});const final=new Request("https://labs.cnsvn.com/a",{method:"POST",headers:{origin:"https://labs.cnsvn.com","Content-Type":"application/json","Idempotency-Key":"final-1"},body:JSON.stringify({expectedRevision:3})});expect((await finalizeAuthoringResponse(final,id)).status).toBe(200);expect(h.finalize.mock.calls[0].slice(1)).toEqual([id,id,3,"final-1"]);});
 it("retries blueprint analysis against the saved documents without uploading again",async()=>{
  const docs=[{id,name:"manual.txt",sha256:"a".repeat(64)}];h.get.mockResolvedValue({...session,documents:docs});h.enqueue.mockResolvedValue({documents:docs});
  const f=new FormData();f.set("expectedRevision","1");f.set("kind","blueprint");f.set("question","Kiểm tra cảnh báo công suất thấp trên TX1.");
  expect((await analyzeAuthoringResponse(request(f),id)).status).toBe(202);
  expect(h.save).not.toHaveBeenCalled();
  expect(h.enqueue).toHaveBeenCalledWith(expect.anything(),id,id,1,{kind:"blueprint",question:f.get("question")},{idempotencyKey:"test-1"});
 });
 it("rejects invalid analyze kind and a missing guidance question",async()=>{const f=new FormData();f.set("expectedRevision","1");f.set("kind","danger");expect((await analyzeAuthoringResponse(request(f),id)).status).toBe(400);f.set("kind","guidance");f.set("sectionId","initial");expect((await analyzeAuthoringResponse(request(f),id)).status).toBe(400);expect(h.enqueue).not.toHaveBeenCalled();});
 it("returns only bounded summary fields for the session list",async()=>{const r=await listAuthoringResponse(new Request("https://labs.cnsvn.com/api/ai/scenario-authoring?moduleId=dvor-1150a"));expect(r.status).toBe(200);expect(JSON.stringify(await r.json())).not.toContain('"state"');});
 it("deletes an authoring session only for same-origin admin requests",async()=>{
  h.remove.mockResolvedValue({id,namespaces:[id]});
  const badOrigin=new Request(`https://labs.cnsvn.com/api/ai/scenario-authoring/${id}`,{method:"DELETE",headers:{origin:"https://evil.invalid"}});
  expect((await deleteAuthoringResponse(badOrigin,id)).status).toBe(403);
  expect(h.remove).not.toHaveBeenCalled();
  const okReq=new Request(`https://labs.cnsvn.com/api/ai/scenario-authoring/${id}`,{method:"DELETE",headers:{origin:"https://labs.cnsvn.com"}});
  const res=await deleteAuthoringResponse(okReq,id);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({deleted:true,id});
  expect(h.remove).toHaveBeenCalledWith(expect.anything(),id,id);
 });
});

it("repairs initial-analysis enqueue on an idempotent retry after a partial submit",async()=>{
 const f=new FormData();f.set("moduleId","dvor-1150a");f.append("files",new File(["TX1 125 W"],"defaults.txt",{type:"text/plain"}));
 const documents=[{id,name:"defaults.txt",mimeType:"text/plain",bytes:9,sha256:"a".repeat(64),storageKey:"stored/already"}];
 h.create.mockResolvedValue({...session,documents});h.get.mockResolvedValue({...session,documents});h.save.mockResolvedValue([{...documents[0],storageKey:"new/retry"}]);
 expect((await createAuthoringResponse(request(f))).status).toBe(201);expect(h.enqueue).toHaveBeenCalledTimes(1);
});
