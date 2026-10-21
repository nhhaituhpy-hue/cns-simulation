// @vitest-environment node
import { expect, it } from "vitest";
import { createAuthoringState } from "@/lib/ai/scenario-authoring/state";
import type { EvidenceDocument } from "@/lib/ai/scenario-generation/types";
const upload:EvidenceDocument={id:"upload",name:"examiner.txt",sha256:"a".repeat(64),segments:[{label:"text",text:"User supplied source"}]};
const reference:EvidenceDocument={id:"kb:dvor-1150a:manual",name:"manual.pdf [reference-only]",sha256:"b".repeat(64),segments:[{label:"PDF page 40",text:"Manual reference text"}]};
it("never uses shared unreviewed references to prefill a document baseline",async()=>{
 const { authoringKnowledgeContext }=await import("@/lib/ai/knowledge/context");
 let calls=0;const result=await authoringKnowledgeContext(createAuthoringState("dvor-1150a","test"),{kind:"baseline",question:""},[upload],async()=>{calls++;return{documents:[reference],notice:"reference only",available:true};});
 expect(calls).toBe(0);expect(result.documents).toEqual([upload]);expect(result.notice).toBeNull();
});
it("adds bounded source excerpts to guidance without dropping uploaded material or exposing private defaults",async()=>{
 const { authoringKnowledgeContext }=await import("@/lib/ai/knowledge/context");
 const state=createAuthoringState("dvor-1150a","test");state.definition.description="Kiểm tra công suất TX1";
 let query="";const result=await authoringKnowledgeContext(state,{kind:"guidance",sectionId:"initial",question:"Giải thích output power"},[upload],async(module,q)=>{expect(module).toBe("dvor-1150a");query=q;return {documents:[reference],notice:"Only one page selected",available:true};});
 expect(query).toContain("Kiểm tra công suất TX1");expect(query).toContain("output power");expect(query).not.toContain("securityAccounts");
 expect(result.documents).toEqual([upload,reference]);expect(result.notice).toContain("Only one page selected");
});
it("keeps document budget and reports omitted references instead of losing uploads",async()=>{
 const { authoringKnowledgeContext }=await import("@/lib/ai/knowledge/context");
 const docs=Array.from({length:5},(_,i)=>({...upload,id:`doc${i}`}));
 const result=await authoringKnowledgeContext(createAuthoringState("dvor-1150a","test"),{kind:"guidance",sectionId:"faults",question:"power"},docs,async()=>({documents:[reference],notice:"Found one",available:true}));
 expect(result.documents).toEqual(docs);expect(result.notice).toMatch(/5|giới hạn/);
});
it("leaves guidance usable with explicit notice when reference storage is absent or invalid",async()=>{
 const { authoringKnowledgeContext }=await import("@/lib/ai/knowledge/context");
 const result=await authoringKnowledgeContext(createAuthoringState("dvor-1150a","test"),{kind:"guidance",sectionId:"faults",question:"power"},[],async()=>{throw new Error("/private/internal-path must not leak");});
 expect(result.documents).toEqual([]);expect(result.notice).toContain("chưa");expect(result.notice).not.toContain("internal-path");
});
