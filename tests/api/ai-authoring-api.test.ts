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
 it("creates only a draft with native defaults without provider credentials",async()=>{const form=new FormData();form.set("moduleId","dvor-1150a");const r=await createAuthoringResponse(request(form));expect(r.status).toBe(201);expect((await r.json()).session.status).toBe("editing");expect(h.enqueue).not.toHaveBeenCalled();expect(h.finalize).not.toHaveBeenCalled();});
 it("enqueues baseline analysis after upload but does not finalize a scenario",async()=>{const f=new FormData();f.set("moduleId","dvor-1150a");f.append("files",new File(["Công suất TX1: 125 W"],"defaults.txt",{type:"text/plain"}));h.save.mockResolvedValue([{id,name:"defaults.txt",mimeType:"text/plain",bytes:25,sha256:"a".repeat(64),storageKey:"private"}]);const r=await createAuthoringResponse(request(f));expect(r.status).toBe(201);expect(h.enqueue).toHaveBeenCalled();expect(h.finalize).not.toHaveBeenCalled();});
 it("denies unauthenticated and student access before file parsing",async()=>{h.profile.mockResolvedValue(null);expect((await createAuthoringResponse(request(new FormData()))).status).toBe(401);h.profile.mockResolvedValue({id,role:"student"});expect((await getAuthoringResponse(id)).status).toBe(403);expect(h.save).not.toHaveBeenCalled();});
 it("rejects cross-origin and arbitrary multipart fields",async()=>{const f=new FormData();f.set("moduleId","dvor-1150a");f.set("actorId",id);expect((await createAuthoringResponse(request(f))).status).toBe(400);const r=new Request("https://labs.cnsvn.com/api/ai/scenario-authoring",{method:"POST",headers:{origin:"https://bad.example"},body:f});expect((await createAuthoringResponse(r)).status).toBe(403);expect(h.create).not.toHaveBeenCalled();});
 it("requires an exact revision for edits and final confirmation",async()=>{const req=new Request("https://labs.cnsvn.com/a",{method:"PATCH",headers:{origin:"https://labs.cnsvn.com","Content-Type":"application/json"},body:JSON.stringify({mutation:{action:"navigate",sectionId:"initial"}})});expect((await updateAuthoringResponse(req,id)).status).toBe(400);expect(h.update).not.toHaveBeenCalled();h.finalize.mockResolvedValue({...session,status:"completed"});const final=new Request("https://labs.cnsvn.com/a",{method:"POST",headers:{origin:"https://labs.cnsvn.com","Content-Type":"application/json","Idempotency-Key":"final-1"},body:JSON.stringify({expectedRevision:3})});expect((await finalizeAuthoringResponse(final,id)).status).toBe(200);expect(h.finalize.mock.calls[0].slice(1)).toEqual([id,id,3,"final-1"]);});
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
