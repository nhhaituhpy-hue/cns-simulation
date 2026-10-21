// @vitest-environment node
import { expect, it } from "vitest";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import { createAuthoringState,mutateAuthoringState,validateFinalAuthoring,authoringStateDto } from "@/lib/ai/scenario-authoring/state";
import { parseScenarioParameters } from "@/lib/scenario-parameters";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
const modules:ScenarioParametersModuleId[]=["dvor-1150","dvor-1150a","dme-1119a","dvor-220","dme-320","ads-b"];
it.each(modules)("runs native %s form values through draft mutation and final JSON import without losing any field",moduleId=>{
 let s=createAuthoringState(moduleId,"qa-full-"+moduleId);const adapter=authoringAdapterFor(moduleId),form=adapter.form(s.definition);
 expect(new Set(form.fields.map(f=>f.id)).size).toBe(form.fields.length);
 expect(adapter.validate(s.definition,"draft").filter(i=>i.severity==="error")).toEqual([]);
 for(const field of form.fields)expect(field.schema.help).toBeTruthy();
 for(const section of form.sections){
  const changes=adapter.form(s.definition).fields.filter(f=>f.sectionId===section.id&&!f.schema.readOnly).map(f=>({fieldId:f.id,value:f.value}));
  if(changes.length)s=mutateAuthoringState(s,{action:"edit",changes});
 }
 if(moduleId==="ads-b"){
  // Native accepted login and menu path, not fake action records.
  s=mutateAuthoringState(s,{action:"edit",changes:[{fieldId:"actionPlan",value:[{loginUser:"sysadmin",inputs:["1"]}]}]});
 }
 for(const section of adapter.form(s.definition).sections)s=mutateAuthoringState(s,{action:"confirm",sectionId:section.id});
 const final=validateFinalAuthoring(s);const restored=parseScenarioParameters(moduleId,JSON.parse(JSON.stringify(final.definition)));expect(restored).not.toBeNull();
 expect(adapter.form(restored!).fields.map(f=>[f.id,f.value])).toEqual(adapter.form(final.definition).fields.map(f=>[f.id,f.value]));
 const dto=authoringStateDto({id:"session",actorId:"actor",moduleId,revision:1,state:s,documents:[],status:"editing",scenarioRowId:null,scenarioId:null,createdAt:"now",updatedAt:"now"},null);
 const fieldIds=dto.form.fields.map(f=>f.id);expect(fieldIds.filter(id=>/password|credential|apiKey|storageKey/i.test(id))).toEqual([]);
 expect(Object.keys(dto)).not.toContain("state");
},20000);

it.each(modules)("accepts persisted %s JSONB key ordering and keeps confirmations valid",moduleId=>{
 let s=createAuthoringState(moduleId,"ordered-"+moduleId);const a=authoringAdapterFor(moduleId);
 function sorted(value:unknown):unknown {if(Array.isArray(value))return value.map(sorted);if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,sorted(v)]));return value;}
 s=mutateAuthoringState(s,{action:"confirm",sectionId:"metadata"});
 const restored=sorted(s)as typeof s;expect(()=>a.form(restored.definition)).not.toThrow();
 expect(authoringStateDto({id:"s",actorId:"a",moduleId,revision:1,state:restored,documents:[],status:"editing",scenarioRowId:null,scenarioId:null,createdAt:"now",updatedAt:"now"},null).confirmedSections).toContain("metadata");
});
