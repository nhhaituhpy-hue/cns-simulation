// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NativeAuthoringAdapter, AuthoringProposal } from "@/lib/ai/scenario-authoring/types";
const fixture=vi.hoisted(()=>({adapter:null as unknown as NativeAuthoringAdapter}));
vi.mock("@/lib/ai/scenario-authoring/forms/registry",()=>({authoringAdapterFor:()=>fixture.adapter}));
import { createAuthoringState, mutateAuthoringState, confirmedAuthoringSections, applyAnalysisProposal, validateFinalAuthoring } from "@/lib/ai/scenario-authoring/state";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { metadataFields, metadataSection, readPath, writePath } from "@/lib/ai/scenario-authoring/forms/helpers";
const power="configuration.transmitters.tx1.nominal.outputPower";
beforeEach(()=>{fixture.adapter={moduleId:"dvor-1150a",createDefault:createDefaultDvor1150aScenarioDefinition,form:d=>({moduleId:"dvor-1150a",label:"DVOR",version:1,sections:[metadataSection,{id:"initial",title:"Khởi đầu",help:"Giữ mặc định"},{id:"criteria",title:"Điều kiện đạt",help:"Kiểm tra"}],fields:[...metadataFields(d),{id:power,sectionId:"initial",group:"TX1",schema:{type:"number",label:"Công suất",help:"W",min:0,max:200},value:readPath(d,power)!,baselineEligible:true}],notices:[]}),apply:(d,changes)=>{const next=structuredClone(d);for(const c of changes){if(!fixture.adapter.form(d).fields.some(f=>f.id===c.fieldId))throw Error("Unknown");writePath(next,c.fieldId,c.value);}return next;},validate:()=>[],preview:()=>({status:"valid",checks:[],notes:[],recoveryVerified:false})};});
function proposal(value=125):AuthoringProposal{return{id:"p1",baseRevision:1,kind:"baseline",message:"Thông số nền từ manual.",changes:[{fieldId:power,value,source:{kind:"document",documentId:"doc1",segmentLabel:"page 1",quote:"Công suất 125 W"},reason:"Thông số nền"}],issues:[],coverage:{documents:1,charactersAvailable:100,charactersRead:100,truncated:false}};}
describe("guided draft state",()=>{
 it("accepts a verified blueprint as a review draft and confirms it in one explicit action",()=>{
  const s=createAuthoringState("dvor-1150a","stable-draft-id");s.mode="description";
  const generated=structuredClone(s.definition);generated.id="model-temporary-id";generated.name="Công suất TX1 thấp";
  const citation={id:"manual-1",documentId:"doc1",documentName:"Manual DVOR",sha256:"a".repeat(64),segmentLabel:"page 12",quote:"Check the transmitter power.",sourceKind:"uploaded" as const};
  const blueprint={version:1 as const,moduleId:"dvor-1150a" as const,title:generated.name,situation:"TX1 cảnh báo công suất thấp",cause:"Sai cấu hình mô phỏng",symptoms:["Cảnh báo công suất"],assumptions:["Bài tập mô phỏng"],definition:generated,rubric:{version:1 as const,moduleId:"dvor-1150a" as const,steps:[{id:"power",label:"Hiệu chỉnh công suất",required:true,prerequisites:[],alternatives:[[{kind:"parameter" as const,fieldId:power,value:100}]],citationIds:["manual-1"]}],parameterRelevance:[],citations:[citation]},verification:{mode:"engine-recovery" as const,initial:[{id:"power",passed:false,detail:"Power alarm"}],recovered:[{id:"power",passed:true,detail:"Normal"}],recoveryVerified:true,notes:["Fixture verification; native validation tested separately."]},citations:[citation]};
  const next=applyAnalysisProposal(s,{...proposal(),kind:"blueprint",blueprint,changes:[]});
  expect(next.definition.id).toBe("stable-draft-id");expect(next.definition.name).toBe(generated.name);
  expect(next.blueprint?.definition).toEqual(next.definition);expect(next.currentStep).toBe("review");expect(next.proposal).toBeNull();
  expect(()=>validateFinalAuthoring(next)).toThrow();
  const confirmed=mutateAuthoringState(next,{action:"confirm-blueprint"});
  expect(validateFinalAuthoring(confirmed).definition).toEqual(next.definition);
  const changed=mutateAuthoringState(confirmed,{action:"edit",changes:[{fieldId:power,value:37}]});
  expect(changed.blueprint).toBeUndefined();expect(()=>validateFinalAuthoring(changed)).toThrow();
 });
 it("retains explanation-only guidance without blocking another question or finalization",()=>{
  let s=createAuthoringState("dvor-1150a","explained-01");
  const explanation={...proposal(),kind:"guidance" as const,message:"Giữ nguyên cấu hình này và kiểm tra cảnh báo trước khi xử lý.",changes:[],issues:[]};
  s=applyAnalysisProposal(s,explanation);
  expect(s.proposal).toBeNull();expect(s.lastExplanation).toBe(explanation.message);
  for(const sectionId of ["metadata","initial","criteria"])s=mutateAuthoringState(s,{action:"confirm",sectionId});
  expect(validateFinalAuthoring(s).definition.id).toBe("explained-01");
 });
 it("starts with native defaults and no confirmed or completed scenario",()=>{const s=createAuthoringState("dvor-1150a","custom-01");expect(s.definition.id).toBe("custom-01");expect(s.definition).toEqual(s.baseline);expect(s.currentStep).toBe("metadata");expect(confirmedAuthoringSections(s)).toEqual([]);expect(()=>validateFinalAuthoring(s)).toThrow();});
 it("prefills untouched document baseline but never silently overwrites a user change",()=>{const s=createAuthoringState("dvor-1150a","custom-02");const first=applyAnalysisProposal(s,proposal());expect(readPath(first.definition,power)).toBe(125);expect(first.sources[power].kind).toBe("document");expect(s.sources[power].kind).toBe("native-default");const edited=mutateAuthoringState(first,{action:"edit",changes:[{fieldId:power,value:40}]});const next=applyAnalysisProposal(edited,{...proposal(100),id:"p2"});expect(readPath(next.definition,power)).toBe(40);expect(next.proposal?.changes[0].value).toBe(100);});
 it("requires explicit acceptance and valid step confirmations before finalize",()=>{let s=applyAnalysisProposal(createAuthoringState("dvor-1150a","custom-03"),proposal());for(const sectionId of ["metadata","initial","criteria"])s=mutateAuthoringState(s,{action:"confirm",sectionId});expect(()=>validateFinalAuthoring(s)).toThrow();s=mutateAuthoringState(s,{action:"apply-proposal",proposalId:"p1",fieldIds:[power]});for(const sectionId of ["metadata","initial","criteria"])s=mutateAuthoringState(s,{action:"confirm",sectionId});expect(validateFinalAuthoring(s).definition.id).toBe("custom-03");});
 it("invalidates downstream confirmation when an earlier field changes",()=>{let s=createAuthoringState("dvor-1150a","custom-04");for(const sectionId of ["metadata","initial","criteria"])s=mutateAuthoringState(s,{action:"confirm",sectionId});s=mutateAuthoringState(s,{action:"edit",changes:[{fieldId:power,value:35}]});expect(confirmedAuthoringSections(s)).toEqual(["metadata"]);expect(()=>validateFinalAuthoring(s)).toThrow();});
 it("rejects unknown fields, stale proposal ids, and arbitrary step names",()=>{const s=createAuthoringState("dvor-1150a","custom-05");expect(()=>mutateAuthoringState(s,{action:"edit",changes:[{fieldId:"__proto__.x",value:true}]})).toThrow();expect(()=>mutateAuthoringState(s,{action:"apply-proposal",proposalId:"no",fieldIds:[power]})).toThrow();expect(()=>mutateAuthoringState(s,{action:"confirm",sectionId:"madeup"})).toThrow();});
});

it("keeps an accepted proposal from overwriting newer user edits without review",()=>{
 let state=applyAnalysisProposal(createAuthoringState("dvor-1150a","custom-06"),proposal());
 state=mutateAuthoringState(state,{action:"edit",changes:[{fieldId:power,value:37}]});
 expect(state.proposal).toBeNull();
 expect(()=>mutateAuthoringState(state,{action:"apply-proposal",proposalId:"p1",fieldIds:[power]})).toThrow();
 expect(readPath(state.definition,power)).toBe(37);
});
it("rejects a first document preview without retaining its default silently",()=>{
 let state=applyAnalysisProposal(createAuthoringState("dvor-1150a","custom-07"),proposal());
 const original=readPath(state.nativeBase,power);
 state=mutateAuthoringState(state,{action:"dismiss-proposal",proposalId:"p1"});
 expect(readPath(state.definition,power)).toBe(original);
 expect(readPath(state.baseline,power)).toBe(original);
});

it("does not keep a pending guidance proposal after reset changes its input context",()=>{
 let state=createAuthoringState("dvor-1150a","custom-08");state.proposal={...proposal(),kind:"guidance"};
 state=mutateAuthoringState(state,{action:"reset-field",fieldId:power});expect(state.proposal).toBeNull();
});
it("an invalid all-or-nothing baseline leaves both definition and baseline unchanged",()=>{
 const state=createAuthoringState("dvor-1150a","custom-09");let calls=0;const apply=fixture.adapter.apply;
 fixture.adapter.apply=(d,changes)=>{if(++calls===2)throw Error("baseline invalid");return apply(d,changes);};
 const next=applyAnalysisProposal(state,proposal(80));expect(next.definition).toEqual(state.definition);expect(next.baseline).toEqual(state.baseline);expect(next.issues.some(i=>i.code==="BASELINE_REVIEW_REQUIRED")).toBe(true);
});
