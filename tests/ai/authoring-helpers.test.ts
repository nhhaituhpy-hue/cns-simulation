// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assertSafeJson, readPath, writePath, validateFieldValue, metadataFields, validateMetadata } from "@/lib/ai/scenario-authoring/forms/helpers";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import type { ValueSchema } from "@/lib/ai/scenario-authoring/types";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import { createAuthoringState, mutateAuthoringState } from "@/lib/ai/scenario-authoring/state";

describe("guided authoring field boundary",()=>{
 it("reads and changes only an existing safe leaf without creating arbitrary paths",()=>{
  const d={tx:{power:35},rows:[{name:"TX1"}]};
  expect(readPath(d,"tx.power")).toBe(35);writePath(d,"tx.power",70);expect(d.tx.power).toBe(70);
  writePath(d,"rows.0.name","TX2");expect(d.rows[0].name).toBe("TX2");
  expect(()=>writePath(d,"tx.unknown",1)).toThrow();expect(()=>writePath(d,"__proto__.bad",1)).toThrow();
 });
 it("rejects unsafe trees, unsupported types, excessive depth and nonfinite values",()=>{
  for(const v of [JSON.parse('{"__proto__":{"x":1}}'),{constructor:2},{a:Infinity},{a:()=>1},new Date()])expect(()=>assertSafeJson(v)).toThrow();
  let deep:unknown=1;for(let i=0;i<30;i++)deep={value:deep};expect(()=>assertSafeJson(deep)).toThrow();
  expect(()=>assertSafeJson({value:[1,false,null,"ok"]})).not.toThrow();
 });
 it("validates recursively typed records and discriminated union rows",()=>{
  const schema:ValueSchema={type:"array",label:"Lỗi",help:"Chọn lỗi",maxItems:3,discriminator:"kind",variants:[{value:"power",label:"Công suất",initial:{kind:"power",value:10},schema:{type:"object",label:"Power",help:"",properties:{kind:{type:"select",label:"Loại",help:"",options:[{value:"power",label:"Power"}],required:true},value:{type:"number",label:"Giá trị",help:"",min:0,max:100,required:true}}}}]};
  expect(validateFieldValue(schema,[{kind:"power",value:35}])).toEqual([]);
  for(const value of [[{kind:"unknown",value:1}],[{kind:"power",value:101}],[{kind:"power",value:1,extra:true}],[{kind:"power"}]])expect(validateFieldValue(schema,value).length).toBeGreaterThan(0);
 });
 it("accepts native DVOR220 object variants through the shared validator and state mutation",()=>{
  const state=createAuthoringState("dvor-220","native-environment");
  const adapter=authoringAdapterFor(state.moduleId);
  const field=adapter.form(state.definition).fields.find(f=>f.id==="runtime.faults")!;
  for(const fault of [
   {id:"heat",kind:"environment",sensor:"temperature",value:50},
   {id:"smoke",kind:"environment",sensor:"smoke",value:true},
   {id:"intrusion",kind:"environment",sensor:"intrusion",value:false},
  ]){
   const expected=adapter.apply(state.definition,[{fieldId:field.id,value:[fault]}]);
   expect(validateFieldValue(field.schema,[fault]),fault.sensor).toEqual([]);
   const changed=mutateAuthoringState(state,{action:"edit",changes:[{fieldId:field.id,value:[fault]}]});
   expect(changed.definition).toEqual(expected);
   expect(adapter.validate(changed.definition,"final").filter(i=>i.severity==="error")).toEqual([]);
  }
  expect(readPath(state.definition,field.id)).toEqual([]);
 });
 it("rejects malformed object discriminators, wrong variant values and unknown/prototype keys",()=>{
  const state=createAuthoringState("dvor-220","environment-invalid");
  const adapter=authoringAdapterFor(state.moduleId);
  const field=adapter.form(state.definition).fields.find(f=>f.id==="runtime.faults")!;
  const environment=field.schema.variants!.find(v=>v.value==="environment")!.schema;
  const fault={id:"heat",kind:"environment",sensor:"temperature",value:50};
  for(const bad of [
   {...fault,sensor:"unsupported"},{...fault,sensor:1},{...fault,sensor:null},
   {id:"heat",kind:"environment",value:50},
   {...fault,value:true},{...fault,value:"50"},{...fault,value:null},{...fault,value:Infinity},
   {...fault,sensor:"smoke"},{...fault,sensor:"intrusion"},{...fault,unknown:1},
   {...fault,constructor:1},{...fault,prototype:1},
   JSON.parse('{"id":"heat","kind":"environment","sensor":"temperature","value":50,"__proto__":{"polluted":true}}'),
   Object.assign(Object.create({sensor:"temperature"}),{id:"heat",kind:"environment",value:50}),
  ]){
   expect(validateFieldValue(environment,bad).length).toBeGreaterThan(0);
   expect(validateFieldValue(field.schema,[bad]).length).toBeGreaterThan(0);
   expect(()=>mutateAuthoringState(state,{action:"edit",changes:[{fieldId:field.id,value:[bad]}]})).toThrow();
   expect(()=>adapter.apply(state.definition,[{fieldId:field.id,value:[bad]}])).toThrow();
  }
  expect(readPath(state.definition,field.id)).toEqual([]);
  expect(Object.prototype).not.toHaveProperty("polluted");
 });
 it("does not coerce blank/null/strings into a valid numeric default",()=>{
  const n:ValueSchema={type:"number",label:"W",help:"",min:0,max:100,step:0.1};
  for(const v of ["",null,"35",NaN,100.01])expect(validateFieldValue(n,v).length).toBeGreaterThan(0);
  expect(validateFieldValue(n,35.1)).toEqual([]);
 });
 it("provides actual friendly metadata fields and preserves literal identifiers",()=>{
  const d=createDefaultDvor1150aScenarioDefinition();
  expect(metadataFields(d).map(f=>f.id)).toEqual(["id","name","difficulty","description"]);
  expect(validateMetadata({...d,id:"space id"})).not.toHaveLength(0);
  expect(validateMetadata({...d,id:"user-id-01",name:"Bài mới"})).toEqual([]);
 });
});
