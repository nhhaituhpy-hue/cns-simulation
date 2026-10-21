// @vitest-environment node
import { expect,it } from "vitest";
import { nativeBlueprintFixture } from "../helpers/native-blueprint";
import { createAuthoringState,applyAnalysisProposal,mutateAuthoringState,validateFinalAuthoring,authoringStateDto } from "@/lib/ai/scenario-authoring/state";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
const modules:ScenarioParametersModuleId[]=["dvor-1150","dvor-1150a","dme-1119a","dvor-220","dme-320","ads-b"];
it.each(modules)("atomically invalidates %s blueprint and confirmations only for a changed goal",moduleId=>{
 let state=createAuthoringState(moduleId,"goal-"+moduleId);state.mode="description";state.context="Original";
 state=applyAnalysisProposal(state,{id:"result",baseRevision:2,kind:"blueprint",blueprint:nativeBlueprintFixture(moduleId),message:"Verified",changes:[],issues:[],coverage:{documents:1,charactersRead:100,charactersAvailable:100,truncated:false}});
 state=mutateAuthoringState(state,{action:"confirm-blueprint"});
 expect(mutateAuthoringState(state,{action:"edit-context",context:"Original"})).toEqual(state);
 const next=mutateAuthoringState(state,{action:"edit-context",context:"Changed"});
 expect(next.context).toBe("Changed");expect(next.currentStep).toBe("documents");expect(next.blueprint).toBeUndefined();expect(next.confirmations).toEqual({});
 expect(next.definition).toEqual(state.definition);expect(state.context).toBe("Original");expect(state.blueprint).toBeDefined();
 expect(()=>validateFinalAuthoring(next)).toThrow();expect(()=>mutateAuthoringState(next,{action:"confirm-blueprint"})).toThrow();
});
it("rejects oversized context mutations without modifying the input",()=>{
 const state=createAuthoringState("dvor-220","bounded-context");
 expect(()=>mutateAuthoringState(state,{action:"edit-context",context:"x".repeat(2001)})).toThrow();
 expect(state.context).toBe("");
});
it.each(modules)("reviews and confirms %s native-replayed blueprint without exposing raw definition",moduleId=>{
 const blueprint=nativeBlueprintFixture(moduleId);
 let state=createAuthoringState(moduleId,"review-"+moduleId);state.mode="description";
 state=applyAnalysisProposal(state,{id:"worker-output",baseRevision:2,kind:"blueprint",blueprint,message:"Kiểm chứng bằng engine thật cho fixture",changes:[],issues:[],coverage:{documents:1,charactersRead:100,charactersAvailable:100,truncated:false}});
 expect(blueprint.verification.recoveryVerified).toBe(true);
 expect(state.definition.id).toBe("review-"+moduleId);expect(state.currentStep).toBe("review");
 expect(()=>validateFinalAuthoring(state)).toThrow();
 state=mutateAuthoringState(state,{action:"confirm-blueprint"});
 expect(validateFinalAuthoring(state).definition).toEqual(state.definition);
 const dto=authoringStateDto({id:"session",actorId:"admin",moduleId,revision:3,state,documents:[],status:"editing",scenarioRowId:null,scenarioId:null,createdAt:"now",updatedAt:"now"},null);
 expect(dto.blueprint).toBeDefined();expect(dto.blueprint).not.toHaveProperty("definition");
 expect(dto.lastExplanation).toBe("Kiểm chứng bằng engine thật cho fixture");
 const serialized=JSON.stringify(dto.blueprint);expect(serialized).not.toMatch(/securityAccounts|storageKey|password|credential/i);
 state=mutateAuthoringState(state,{action:"edit",changes:[{fieldId:"description",value:"Changed requirements"}]});
 expect(state.blueprint).toBeUndefined();expect(()=>validateFinalAuthoring(state)).toThrow();
});
it("rejects a worker blueprint with a rubric for nonexistent citations",()=>{
 const blueprint=nativeBlueprintFixture("dvor-1150a");blueprint.rubric.steps[0].citationIds=["invented"];
 const state=createAuthoringState("dvor-1150a","reject-rubric");
 expect(()=>applyAnalysisProposal(state,{id:"fake",baseRevision:2,kind:"blueprint",blueprint,message:"Fake",changes:[],issues:[],coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}})).toThrow();
});
it("rejects a fake complete blueprint lacking verified recovery",()=>{
 const blueprint=nativeBlueprintFixture("dvor-1150a");blueprint.verification.recoveryVerified=false;
 const state=createAuthoringState("dvor-1150a","reject-unverified");
 expect(()=>applyAnalysisProposal(state,{id:"fake",baseRevision:2,kind:"blueprint",blueprint,message:"Fake",changes:[],issues:[],coverage:{documents:0,charactersRead:0,charactersAvailable:0,truncated:false}})).toThrow();
 expect(state.definition.name).not.toBe(blueprint.definition.name);
});
