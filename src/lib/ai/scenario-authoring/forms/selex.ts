import type { NativeAuthoringAdapter, AuthoringField, AuthoringForm, JsonValue, ValueSchema } from "../types";
import type { ScenarioParametersDefinition } from "@/lib/scenario-parameters";
import { createDefaultDvor1150ScenarioDefinition, dvor1150ScenarioFieldRole, validateDvor1150ScenarioDefinition, previewDvor1150Scenario, evaluateDvor1150Scenario, type Dvor1150ScenarioDefinition } from "@/lib/dvor1150/scenario";
import { createDefaultDvor1150aScenarioDefinition, dvor1150aScenarioFieldRole, validateDvor1150aScenarioDefinition, previewDvor1150aScenario, evaluateDvor1150aScenario, type Dvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { createDefaultDme1119aScenarioDefinition, dme1119aScenarioFieldRole, validateDme1119aScenarioDefinition, previewDme1119aScenario, evaluateDme1119aScenario, type Dme1119aScenarioDefinition } from "@/lib/dme1119a/scenario";
import { dvor1150ConfigFieldCatalog } from "@/lib/dvor1150/config-utils";
import { dvorConfigFieldCatalog } from "@/lib/dvor1150a/config-utils";
import { dmeParameterFieldCatalog, getDmeParameterValue } from "@/lib/dme1119a/config";
import { metadataFields, metadataSection, readPath, writePath, assertSafeJson, validateFieldValue, validateMetadata, canonicalJson } from "./helpers";
import { parseScenarioParameters } from "@/lib/scenario-parameters";
import { AuthoringError } from "../errors";
import { selexStartupSchema, selexCriterionSchema } from "./selex-labels";
import { diagnosisSchema } from "./selex-diagnosis";
import { select, list, object } from "./selex-schemas";
import { dmeFaultSchema, dmeCriterionSchema } from "./selex-schemas";
import { dvor1150aConfigurationValuesSchema } from "./dvor1150a-criteria";
import { parseDme1119aConfig } from "@/lib/simulator-config/dme-1119a";

function withDmeSettings(spec: Spec, definition: ScenarioParametersDefinition): ScenarioParametersDefinition {
 if(spec.moduleId!=="dme-1119a")return definition;
 assertSafeJson(definition);
 const d=definition as Dme1119aScenarioDefinition, configuration=parseDme1119aConfig(d.configuration);
 if(!configuration)throw new AuthoringError("INVALID_DEFINITION","Invalid DME configuration.");
 return {...structuredClone(d),configuration};
}

const specs = [
 { moduleId: "dvor-1150", label: "DVOR 1150", create: createDefaultDvor1150ScenarioDefinition, catalog: dvor1150ConfigFieldCatalog, role: dvor1150ScenarioFieldRole },
 { moduleId: "dvor-1150a", label: "DVOR 1150A", create: createDefaultDvor1150aScenarioDefinition, catalog: dvorConfigFieldCatalog, role: dvor1150aScenarioFieldRole },
 { moduleId: "dme-1119a", label: "DME 1119A", create: createDefaultDme1119aScenarioDefinition, catalog: dmeParameterFieldCatalog, role: dme1119aScenarioFieldRole },
] as const;
export type SelexModule = (typeof specs)[number]["moduleId"];
type Spec = (typeof specs)[number];
const stimulus1150 = new Set(["tx1", "tx2"].flatMap(tx => ["offsets.outputPowerScale", "offsets.cabinetTemperatureOffset", ...[1,2,3,4].map(n => `offsets.sideband${n}RfLevelScale`)].map(p => `transmitters.${tx}.${p}`)));
const privateField = (id: string) => /(^|\.)(security|securityAccounts|password|credentials?)(\.|$)/i.test(id);
function form(spec: Spec, d: ScenarioParametersDefinition): AuthoringForm {
 d=withDmeSettings(spec,d);
 strictShape(spec,d);
 const fields: AuthoringField[] = metadataFields(d);
 const omitted: string[] = [];
 let derived: ReturnType<typeof previewDme1119aScenario>["data"] | undefined;
 if(spec.moduleId === "dme-1119a") { try { derived=previewDme1119aScenario(d as Dme1119aScenarioDefinition).data; } catch { /* invalid drafts still explain excluded controls */ } }
 for (const f of spec.catalog) {
  const value = readPath(d, `configuration.${f.id}`);
  if (privateField(f.id) || spec.role(f.id) === "runtime") {
   omitted.push(`${f.id}: không sửa trực tiếp trạng thái phiên/tài khoản; trạng thái khởi đầu được điều khiển qua startPolicy.`); continue;
  }
  if ("readOnly" in f && f.readOnly) {
   const reading=derived ? getDmeParameterValue(derived,f.id) : undefined;
   if(reading !== undefined) fields.push({id:`derived.${f.id}`,sectionId:"initial",group:f.section,schema:{type:f.type,label:f.label,help:`Chỉ đọc: ${f.description} Giá trị do engine tính; sửa đầu vào tương ứng thay vì số đo.`,unit:f.unit,readOnly:true,nullable:reading===null},value:reading,baselineEligible:false});
   else omitted.push(`${f.id}: số đo dẫn xuất chỉ đọc; không phải đầu vào lưu trong kịch bản native.`);
   continue;
  }
  if (value === undefined) { omitted.push(`${f.id}: bộ lưu kịch bản native không lưu trường này; wizard không giả vờ lưu thay đổi chỉ tồn tại trong phiên PMDT.`); continue; }
  const fault = spec.moduleId === "dvor-1150" ? stimulus1150.has(f.id) : f.id.includes(".faults.");
  fields.push({ id: `configuration.${f.id}`, sectionId: fault ? "faults" : "initial", group: f.section,
   schema: { type: f.type, label: f.label, help: (f.description || `${f.label} — thông số native ${f.section}; giữ mặc định nếu không có căn cứ thay đổi.`)+("effectNotice"in f&&f.effectNotice?` ${f.effectNotice}`:""), unit: f.unit, min: f.min, max: f.max, step: undefined, options: f.options?.map(value => ({value,label:value})), required:true },
   value: structuredClone(value), baselineEligible: !fault && !stimulus1150.has(f.id) && spec.role(f.id) !== "instructor-only" });
 }
 const add=(id:string,sectionId:string,schema:ValueSchema,value:JsonValue)=>fields.push({id,sectionId,group:sectionId,schema,value:structuredClone(value),baselineEligible:false});
 for (const [key,value] of Object.entries((d as ReturnType<Spec["create"]>).startPolicy)) add(`startPolicy.${key}`, "initial", selexStartupSchema(key),value);
 const native = d as ReturnType<Spec["create"]>;
 if (Array.isArray(native.successCriteria)) add("successCriteria","criteria",dmeCriterionSchema(),native.successCriteria as unknown as JsonValue);
 else for (const [key,value] of Object.entries(native.successCriteria)) if(key!=="configurationValues") add(`successCriteria.${key}`,"criteria",selexCriterionSchema(key),value as JsonValue);
 if(spec.moduleId==="dvor-1150a") {
  const definition=d as Dvor1150aScenarioDefinition;
  add("successCriteria.configurationValues","criteria",dvor1150aConfigurationValuesSchema(definition.configuration),(definition.successCriteria.configurationValues??[]) as unknown as JsonValue);
 }
 if ("faultInjections" in native) add("faultInjections","faults",dmeFaultSchema(),native.faultInjections as unknown as JsonValue);
 const operable=spec.catalog.filter(f=>(!("readOnly" in f)||!f.readOnly)&&spec.role(f.id)==="student-operable"&&!privateField(f.id)&&readPath(d,`configuration.${f.id}`)!==undefined).map(f=>f.id);
 add("diagnosis","diagnosis",diagnosisSchema(spec.moduleId,operable),(native.diagnosis ?? null) as unknown as JsonValue);
 add("editPolicy.mode","permissions",select("Quyền sửa",["open","restricted"]),native.editPolicy?.mode??"restricted");
 add("studentEditableFieldIds","permissions",list("Trường học viên được sửa",select("Trường native",operable)),native.studentEditableFieldIds);
 if(spec.moduleId!=="dvor-1150")add("taskTargets","diagnosis",list("Mục tiêu thao tác",object("Mục tiêu",{fieldId:select("Trường native",operable),requirement:select("Yêu cầu",["inspect","change-applied"])})),("taskTargets" in native ? native.taskTargets??[]:[]) as unknown as JsonValue);
 for(const field of fields.filter(f=>f.schema.type==="array"||f.schema.type==="object")) {
  const issues=validateFieldValue(field.schema,field.value);
  if(issues.length)throw new AuthoringError("INVALID_FIELD",issues[0]);
 }
 return {moduleId:spec.moduleId,label:spec.label,version:1,fields,sections:[metadataSection,
  {id:"initial",title:"1. Trạng thái khởi đầu",help:"Cấu hình native và trạng thái khởi động; không gồm số đo dẫn xuất hoặc credentials."},
  {id:"faults",title:"2. Lỗi đưa vào",help:"Chỉ sửa đầu vào mô phỏng native, không tạo công thức hoặc fault mới."},
  {id:"criteria",title:"3. Điều kiện đạt",help:"Kết quả mong đợi để engine kiểm tra, không phải kết quả đã đạt."},
  {id:"diagnosis",title:"4. Chẩn đoán hai bước",help:"Màn hình, thao tác và phần cứng từ catalog đúng thiết bị."},
  {id:"permissions",title:"5. Quyền chỉnh sửa của thí sinh",help:"Giới hạn trường học viên được sửa; không vượt bảo vệ native."}],
  notices:[...omitted,"Không đưa credentials, trạng thái phiên, số đo dẫn xuất hoặc cấu hình startup trùng lặp vào biểu mẫu. Các trường runtime không lưu trong native schema không được author ở đây.","Chỉ xem trước trạng thái ban đầu; chưa replay thao tác hoặc xác minh khôi phục."]};
}
function exactKeys(value:unknown,required:string[],optional:string[]=[]) {
 if(!value||typeof value!=="object"||Array.isArray(value)||required.some(k=>!Object.hasOwn(value,k))||Object.keys(value).some(k=>!required.includes(k)&&!optional.includes(k)))throw new Error("Native schema contains unknown or missing fields.");
}
function orderedLimits(value:unknown):void {
 if(!value||typeof value!=="object")return;
 const r=value as Record<string,unknown>;
 for(const keys of [["alarmLow","preAlarmLow","nominal","preAlarmHigh","alarmHigh"],["low","preLow","preHigh","high"],["preAlarm","alarm"]]){
  const values=keys.filter(k=>typeof r[k]==="number"&&!((r.parameter==="Delay"||r.parameter==="Spacing")&&k==="nominal")).map(k=>r[k] as number);
  if(values.some((v,i)=>i>0&&v<values[i-1]))throw new Error("Monitor limit ordering is invalid.");
 }
 for(const child of Object.values(r))orderedLimits(child);
}
function strictShape(spec:Spec,d:ScenarioParametersDefinition):void {
 assertSafeJson(d);
 const reference=spec.create(), n=d as ReturnType<Spec["create"]>;
 exactKeys(d,Object.keys(reference).filter(k=>!["editPolicy","taskTargets"].includes(k)),["editPolicy","diagnosis",...(spec.moduleId!=="dvor-1150"?["taskTargets"]:[])]);
 exactKeys(n.startPolicy,Object.keys(reference.startPolicy));
 if(!Array.isArray(reference.successCriteria))exactKeys(n.successCriteria,Object.keys(reference.successCriteria),spec.moduleId==="dvor-1150a"?["configurationValues"]:[]);
 if(n.editPolicy){
  exactKeys(n.editPolicy,n.editPolicy.mode==="open"?["mode"]:["mode","allowedFieldIds"]);
  const allowed=n.editPolicy.mode==="restricted"?n.editPolicy.allowedFieldIds:[];
  if(JSON.stringify([...allowed].sort())!==JSON.stringify([...n.studentEditableFieldIds].sort()))throw new Error("Edit policy and legacy allowed-field mirror must agree.");
 }
 if(n.diagnosis){
  const diagnosis=n.diagnosis;
  if(diagnosis.disposition==="software-adjustment"&&diagnosis.diagnosticRun!=="not-required")throw new Error("Software adjustment requires not-required diagnostics.");
  for(const values of [diagnosis.pmdtCheckpoints.map(c=>c.id),diagnosis.requiredActionControlIds,diagnosis.expectedHardware.map(h=>canonicalJson(h))])if(new Set(values).size!==values.length)throw new Error("Diagnosis IDs/targets must not contain duplicates.");
 }
 orderedLimits(n.configuration);
 for(const group of ["simulation","security","securityAccounts"]){
  if(canonicalJson(readPath(n,`configuration.${group}`))!==canonicalJson(readPath(reference,`configuration.${group}`)))throw new Error("Protected session/security configuration must retain native defaults.");
 }
 // Secret/session values are never authored through this API, including direct
 // server definitions that bypass form edits. Preserve native defaults only.
 for(const f of spec.catalog)if(privateField(f.id)||spec.role(f.id)==="runtime"){
  if(canonicalJson(readPath(n,`configuration.${f.id}`))!==canonicalJson(readPath(reference,`configuration.${f.id}`)))throw new Error("Protected configuration must retain native defaults.");
 }
}
function validate(spec:Spec,d:ScenarioParametersDefinition):import("../types").AuthoringIssue[] {
 try {
  strictShape(spec,d);
  const issues=validateMetadata(d);
  const nativeIssues=spec.moduleId==="dvor-1150"?validateDvor1150ScenarioDefinition(d as Dvor1150ScenarioDefinition):spec.moduleId==="dvor-1150a"?validateDvor1150aScenarioDefinition(d as Dvor1150aScenarioDefinition):validateDme1119aScenarioDefinition(d as Dme1119aScenarioDefinition);
  for(const message of nativeIssues)issues.push({code:"NATIVE_SCHEMA",sectionId:/diagnos|hardware|checkpoint/i.test(message)?"diagnosis":/criterion|criteria/i.test(message)?"criteria":/fault/i.test(message)?"faults":/policy|editable|target/i.test(message)?"permissions":"initial",message,severity:"error"});
  if (!parseScenarioParameters(spec.moduleId,d)&&!nativeIssues.length) issues.push({code:"NATIVE_SCHEMA",sectionId:"initial",message:"Native scenario schema/configuration is invalid.",severity:"error"});
  // Catalog step is a UI increment, not a quantization rule in native parsers.
  for (const f of form(spec,d).fields) for(const message of validateFieldValue({...f.schema,step:undefined},f.value)) issues.push({code:"INVALID_FIELD",sectionId:f.sectionId,fieldId:f.id,message,severity:"error"});
  return issues;
 } catch(error) {return [{code:"INVALID_DEFINITION",sectionId:"initial",message:error instanceof Error?error.message:"Dữ liệu không đúng cấu trúc native.",severity:"error"}];}
}
function preview(spec:Spec,d:ScenarioParametersDefinition):import("../types").AuthoringPreview {
 const issues=validate(spec,d),notes=["Chỉ xem trước trạng thái ban đầu bằng engine native; chưa replay thao tác hoặc xác minh khôi phục.","Không tạo bằng chứng PMDT, thao tác hoặc thay thế phần cứng thay cho học viên."];
 if(issues.some(i=>i.severity==="error"))return {status:"invalid",checks:issues.map((i,index)=>({id:`validation-${index}`,label:i.fieldId??i.sectionId,passed:false,detail:i.message})),notes,recoveryVerified:false};
 try {
  let checks:import("../types").AuthoringPreview["checks"];
  if(spec.moduleId==="dvor-1150") {const definition=d as Dvor1150ScenarioDefinition,p=previewDvor1150Scenario(definition);checks=evaluateDvor1150Scenario({active:true,definition,startedAt:null},p.snapshot,p.config).checks;}
  else if(spec.moduleId==="dvor-1150a") {const definition=d as Dvor1150aScenarioDefinition,p=previewDvor1150aScenario(definition);checks=evaluateDvor1150aScenario({active:true,definition,startedAt:null},p.snapshot,p.config).checks;}
  else {const definition=d as Dme1119aScenarioDefinition,p=previewDme1119aScenario(definition);checks=evaluateDme1119aScenario({active:true,definition,startedAt:null},p.data).checks;}
  return {status:"valid",checks,notes,recoveryVerified:false};
 }catch{return {status:"invalid",checks:[{id:"engine",label:"Native preview",passed:false,detail:"Engine could not construct the initial state."}],notes,recoveryVerified:false};}
}
export const selexAuthoringAdapters: NativeAuthoringAdapter[] = specs.map(spec => ({moduleId:spec.moduleId,createDefault:()=>structuredClone(spec.create()),form:d=>form(spec,d),apply:(d,changes)=>{
 d=withDmeSettings(spec,d);
 const sourceIssues=validate(spec,d);if(sourceIssues.some(i=>i.severity==="error"))throw new AuthoringError("INVALID_DEFINITION",sourceIssues[0].message,sourceIssues);
 assertSafeJson(changes);if(!Array.isArray(changes))throw new AuthoringError("INVALID_INPUT","Changes must be an array");
 const fields=form(spec,d).fields,next=structuredClone(d),seen=new Set<string>();
 for(const c of changes){const f=fields.find(f=>f.id===c.fieldId);if(!f||f.schema.readOnly||seen.has(c.fieldId)||Object.keys(c).some(k=>!["fieldId","value"].includes(k)))throw new AuthoringError("INVALID_FIELD","Unknown or duplicate field");seen.add(c.fieldId);const errors=validateFieldValue({...f.schema,step:undefined},c.value);if(errors.length)throw new AuthoringError("INVALID_FIELD",errors[0],errors.map(message=>({code:"INVALID_FIELD",sectionId:f.sectionId,fieldId:f.id,message,severity:"error"})));if(c.fieldId==="diagnosis"){if(c.value===null)delete (next as ReturnType<Spec["create"]>).diagnosis;else (next as unknown as Record<string,JsonValue>).diagnosis=structuredClone(c.value);}
 else if(c.fieldId!=="editPolicy.mode") {
  if(c.fieldId==="taskTargets"&&!Object.hasOwn(next,"taskTargets"))(next as unknown as Record<string,JsonValue>).taskTargets=[];
  if(c.fieldId==="successCriteria.configurationValues") (next as Dvor1150aScenarioDefinition).successCriteria.configurationValues=structuredClone(c.value) as unknown as NonNullable<Dvor1150aScenarioDefinition["successCriteria"]["configurationValues"]>;
  else writePath(next,c.fieldId,c.value);
 }
 }
 const n=next as ReturnType<Spec["create"]>;
 const mode=(changes.find(c=>c.fieldId==="editPolicy.mode")?.value??n.editPolicy?.mode??"restricted") as "open"|"restricted";
 if(mode==="open"){
  if(changes.some(c=>c.fieldId==="studentEditableFieldIds"&&(c.value as JsonValue[]).length))throw new AuthoringError("INVALID_FIELD","Open policy must not contain allowed fields");
  n.editPolicy={mode:"open"};n.studentEditableFieldIds=[];
 }else n.editPolicy={mode:"restricted",allowedFieldIds:[...n.studentEditableFieldIds]};
 const errors=validate(spec,next);if(errors.some(i=>i.severity==="error"))throw new AuthoringError("INVALID_FIELD",errors[0].message,errors);return next;
 },validate:d=>validate(spec,d),preview:d=>preview(spec,d)}));
