import { createHash } from "node:crypto";
import { parseScenarioParameters, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { authoringAdapterFor } from "./forms/registry";
import { assertSafeJson, validateFieldValue, validateMetadata, canonicalJson } from "./forms/helpers";
import { AuthoringError } from "./errors";
import { validateScenarioRubric, validateManualCitations } from "../scenario-blueprint/validation";
import type { AuthoringForm, AnalysisJob, AuthoringIssue, AuthoringMutation, AuthoringProposal, AuthoringSession, AuthoringSessionDto, AuthoringState, FieldChange, FieldSource } from "./types";

function fail(code:string,message:string,issues:AuthoringIssue[]=[]):never{throw new AuthoringError(code,message,issues);}
function changedFields(before:AuthoringForm,after:AuthoringForm):string[]{
 const old=new Map(before.fields.map(f=>[f.id,canonicalJson(f.value)])),current=new Map(after.fields.map(f=>[f.id,canonicalJson(f.value)]));
 return [...new Set([...old.keys(),...current.keys()])].filter(id=>old.get(id)!==current.get(id));
}
const within=(id:string,parent:string)=>id===parent||id.startsWith(`${parent}.`);
function sourcesAfter(before:AuthoringForm,after:AuthoringForm,sources:AuthoringState["sources"],updates:{fieldId:string;source:FieldSource}[],restore?:{form:AuthoringForm;sources:AuthoringState["sources"]}):AuthoringState["sources"]{
 const changed=new Set(changedFields(before,after));
 return Object.fromEntries(after.fields.map(field=>{
  const covering=updates.find(c=>within(field.id,c.fieldId));
  let source=sources[field.id]??{kind:"native-default" as const};
  if(!field.schema.readOnly&&(covering||changed.has(field.id))){
   const reference=restore?.form.fields.find(f=>f.id===field.id);
   if(reference&&canonicalJson(reference.value)===canonicalJson(field.value))source=restore!.sources[field.id]??{kind:"native-default"};
   else if(covering)source=covering.source;
   else if(source.kind!=="user")source=updates.find(c=>within(c.fieldId,field.id))?.source??updates[0]?.source??source;
  }
  return[field.id,source];
 }));
}
function fieldHash(state:AuthoringState,sectionId:string,form=authoringAdapterFor(state.moduleId).form(state.definition)):string{
 return createHash("sha256").update(canonicalJson(form.fields.filter(f=>f.sectionId===sectionId).map(f=>[f.id,f.value]).sort(([a],[b])=>String(a).localeCompare(String(b))))).digest("hex");
}
export function createAuthoringState(moduleId:ScenarioParametersModuleId,id:string):AuthoringState{
 const adapter=authoringAdapterFor(moduleId);const definition=adapter.createDefault();definition.id=id;
 const sources=Object.fromEntries(adapter.form(definition).fields.map(f=>[f.id,{kind:"native-default" as const}]));
 return {version:1,moduleId,nativeBase:structuredClone(definition),baseline:structuredClone(definition),definition,sources,baselineSources:structuredClone(sources),confirmations:{},currentStep:"metadata",proposal:null,issues:[],context:""};
}
function invalidate(state:AuthoringState,ids:string[],before:AuthoringForm):void{
 const form=authoringAdapterFor(state.moduleId).form(state.definition);
 for(const id of ids){const sectionId=(form.fields.find(f=>f.id===id)??before.fields.find(f=>f.id===id))?.sectionId;if(!sectionId)continue;
  if(sectionId==="metadata"&&id!=="description"){delete state.confirmations.metadata;continue;}
  const start=form.sections.findIndex(s=>s.id===sectionId);
  for(const section of form.sections.slice(start))delete state.confirmations[section.id];
 }
}
function applyChanges(state:AuthoringState,changes:readonly FieldChange[]):string[]{
 const adapter=authoringAdapterFor(state.moduleId),form=adapter.form(state.definition);
 if(!Array.isArray(changes)||changes.length>1000)fail("INVALID_INPUT","Quá nhiều trường thay đổi.");
 const seen=new Set<string>();
 for(const change of changes){
  assertSafeJson(change);
  if(Object.keys(change).some(k=>!["fieldId","value"].includes(k))||seen.has(change.fieldId))fail("INVALID_INPUT","Trường bị trùng hoặc không hợp lệ.");
  const field=form.fields.find(f=>f.id===change.fieldId);
  if(!field||field.schema.readOnly)fail("PROTECTED_FIELD","Trường không có trong biểu mẫu hoặc được bảo vệ.");
  const issues=validateFieldValue(field.schema,change.value).map(message=>({code:"INVALID_FIELD",message,sectionId:field.sectionId,fieldId:field.id,severity:"error"as const}));
  if(issues.length)fail("INVALID_FIELD",issues[0].message,issues);seen.add(change.fieldId);
 }
 state.definition=adapter.apply(state.definition,changes);
 const changed=changedFields(form,adapter.form(state.definition));
 if(changed.length&&state.blueprint){delete state.blueprint;state.confirmations={};}
 invalidate(state,changed,form);
 state.issues=state.issues.filter(i=>!i.fieldId||!changed.includes(i.fieldId));
 return changed;
}
function invalidateProposal(state:AuthoringState,ids:Iterable<string>):void{
 if(!state.proposal)return;
 if(state.proposal.kind==="guidance"){state.proposal=null;return;}
 const edited=new Set(ids);
 state.proposal.changes=state.proposal.changes.filter(c=>!edited.has(c.fieldId));
 state.proposal.prefilledFieldIds=state.proposal.prefilledFieldIds?.filter(id=>!edited.has(id));
 if(!state.proposal.changes.length&&!state.proposal.issues.length)state.proposal=null;
}
export function confirmedAuthoringSections(state:AuthoringState,form:AuthoringForm=authoringAdapterFor(state.moduleId).form(state.definition)):string[]{
 return form.sections.filter(s=>state.confirmations[s.id]===fieldHash(state,s.id,form)).map(s=>s.id);
}
export function mutateAuthoringState(input:AuthoringState,mutation:AuthoringMutation):AuthoringState{
 assertSafeJson(mutation);const s=structuredClone(input),adapter=authoringAdapterFor(s.moduleId),form=adapter.form(s.definition);
 switch(mutation.action){
  case "edit-context":{
   if(typeof mutation.context!=="string"||mutation.context.length>2000||mutation.context.includes("\0"))fail("INVALID_INPUT","Mục tiêu huấn luyện tối đa 2000 ký tự.");
   if(s.context!==mutation.context){
    s.context=mutation.context;delete s.blueprint;s.confirmations={};s.proposal=null;delete s.lastExplanation;s.currentStep="documents";
   }
   break;
  }
  case "confirm-blueprint":{
   assertCurrentBlueprint(s);
   const errors=[...validateMetadata(s.definition),...adapter.validate(s.definition,"final"),...s.issues].filter(i=>i.severity==="error");
   if(errors.length)fail("INVALID_BLUEPRINT","Bài tập chưa đạt kiểm chứng để lưu.",errors);
   for(const section of form.sections)s.confirmations[section.id]=fieldHash(s,section.id,form);
   break;
  }
  case "edit":{
   const edited=new Set(applyChanges(s,mutation.changes));
   s.sources=Object.fromEntries(adapter.form(s.definition).fields.map(field=>[field.id,edited.has(field.id)&&!field.schema.readOnly?{kind:"user"}:s.sources[field.id]??{kind:"native-default"}]));
   if(edited.size)invalidateProposal(s,edited);
   break;
  }
  case "confirm":{
   if(!form.sections.some(x=>x.id===mutation.sectionId))fail("INVALID_STEP","Bước không hợp lệ.");
   const errors=[...validateMetadata(s.definition),...adapter.validate(s.definition,"draft"),...s.issues].filter(i=>i.severity==="error"&&i.sectionId===mutation.sectionId);
   if(errors.length)fail("INVALID_SECTION","Hãy sửa các trường cần kiểm tra trước khi xác nhận bước.",errors);
   s.confirmations[mutation.sectionId]=fieldHash(s,mutation.sectionId);break;
  }
  case "navigate":if(!["documents","confirmation",...(s.blueprint?["review"]:[]),...form.sections.map(x=>x.id)].includes(mutation.sectionId))fail("INVALID_STEP","Bước không hợp lệ.");s.currentStep=mutation.sectionId;break;
  case "reset-field":{
   const baselineForm=adapter.form(s.baseline),baselineField=baselineForm.fields.find(f=>f.id===mutation.fieldId);
   if(!baselineField)fail("INVALID_FIELD","Không tìm thấy giá trị nền.");
   const edited=applyChanges(s,[{fieldId:baselineField.id,value:baselineField.value}]);
   s.sources=sourcesAfter(form,adapter.form(s.definition),s.sources,[{fieldId:baselineField.id,source:s.baselineSources[baselineField.id]??{kind:"native-default"}}],{form:baselineForm,sources:s.baselineSources});
   invalidateProposal(s,[...edited,...form.fields.filter(f=>within(f.id,mutation.fieldId)||within(mutation.fieldId,f.id)).map(f=>f.id)]);break;
  }
  case "apply-proposal":{
   const p=s.proposal;if(!p||p.id!==mutation.proposalId)fail("STALE_PROPOSAL","Đề xuất đã thay đổi. Hãy tải lại bản nháp.");
   if(!Array.isArray(mutation.fieldIds)||new Set(mutation.fieldIds).size!==mutation.fieldIds.length||mutation.fieldIds.some(id=>!p.changes.some(c=>c.fieldId===id)))fail("INVALID_PROPOSAL","Danh sách áp dụng không hợp lệ.");
   const selected=p.changes.filter(c=>mutation.fieldIds.includes(c.fieldId));
   // Unchecked values that were automatically previewed must return to native defaults.
   const reverted=(p.prefilledFieldIds??[]).filter(id=>!mutation.fieldIds.includes(id)&&s.sources[id]?.kind!=="user");
   const baseFields=adapter.form(s.nativeBase).fields;
   const resets=reverted.flatMap(id=>{const base=baseFields.find(f=>f.id===id);return base&&form.fields.some(f=>f.id===id&&!f.schema.readOnly)?[{fieldId:id,value:base.value}]:[];});
   applyChanges(s,[...resets,...selected.map(({fieldId,value})=>({fieldId,value}))]);
   if(p.kind==="baseline"){
    const before=adapter.form(s.baseline);
    s.baseline=adapter.apply(s.baseline,[...resets,...selected.map(({fieldId,value})=>({fieldId,value}))]);
    for(const id of reverted){s.sources[id]={kind:"native-default"};s.baselineSources[id]={kind:"native-default"};}
    for(const c of selected)s.baselineSources[c.fieldId]=c.source;
    s.baselineSources=sourcesAfter(before,adapter.form(s.baseline),s.baselineSources,selected);
   }
   s.sources=sourcesAfter(form,adapter.form(s.definition),s.sources,selected,p.kind==="baseline"?{form:adapter.form(s.baseline),sources:s.baselineSources}:undefined);
   s.proposal=null;break;
  }
  case "dismiss-proposal":{
   const p=s.proposal;if(!p||p.id!==mutation.proposalId)fail("STALE_PROPOSAL","Đề xuất đã thay đổi.");
   const original=adapter.form(s.nativeBase).fields;
   const resets=(p.prefilledFieldIds??[]).filter(id=>s.sources[id]?.kind!=="user").flatMap(id=>{const base=original.find(f=>f.id===id);return base&&form.fields.some(f=>f.id===id&&!f.schema.readOnly)?[{fieldId:id,value:base.value}]:[];});
   if(resets.length)applyChanges(s,resets);
   s.sources=sourcesAfter(form,adapter.form(s.definition),s.sources,resets.map(c=>({fieldId:c.fieldId,source:s.baselineSources[c.fieldId]??{kind:"native-default"}})),{form:adapter.form(s.baseline),sources:s.baselineSources});
   // Explicitly rejecting an analysis does not turn its unresolved claims into requirements.
   s.issues=s.issues.filter(i=>!p.issues.some(q=>q.code===i.code&&q.fieldId===i.fieldId&&q.message===i.message));
   s.proposal=null;break;
  }
  default:fail("INVALID_ACTION","Thao tác không được hỗ trợ.");
 }
 return s;
}
export function applyAnalysisProposal(input:AuthoringState,proposal:AuthoringProposal):AuthoringState{
 assertSafeJson(proposal);const s=structuredClone(input),adapter=authoringAdapterFor(s.moduleId),form=adapter.form(s.definition);
 if(proposal.kind==="blueprint"){
  const blueprint=proposal.blueprint;
  if(!blueprint||blueprint.version!==1||blueprint.moduleId!==s.moduleId||blueprint.rubric?.moduleId!==s.moduleId||blueprint.rubric.version!==1||!blueprint.rubric.steps?.length||!blueprint.citations?.length||blueprint.verification?.recoveryVerified!==true||!blueprint.verification.initial.length||!blueprint.verification.recovered.length)fail("INVALID_BLUEPRINT","Bản thiết kế bài tập chưa đủ căn cứ hoặc chưa được kiểm chứng.");
  validateScenarioRubric(blueprint.rubric,s.moduleId);validateManualCitations(blueprint.citations);
  if(canonicalJson(blueprint.rubric.citations)!==canonicalJson(blueprint.citations))fail("INVALID_BLUEPRINT","Căn cứ trong đáp án không khớp bản thiết kế.");
  const definition=parseScenarioParameters(s.moduleId,{...blueprint.definition,id:s.definition.id});
  if(!definition)fail("INVALID_BLUEPRINT","Cấu hình tình huống không hợp lệ.");
  const issues=[...validateMetadata(definition),...adapter.validate(definition,"final"),...proposal.issues];
  if(issues.some(i=>i.severity==="error"))fail("INVALID_BLUEPRINT","Bài tập chưa đạt kiểm tra native.",issues);
  s.definition=definition;s.blueprint={...structuredClone(blueprint),definition:structuredClone(definition)};
  s.confirmations={};s.proposal=null;s.issues=issues;s.currentStep="review";s.lastExplanation=proposal.message;
  s.sources=Object.fromEntries(adapter.form(definition).fields.map(f=>[f.id,{kind:"ai-suggestion",note:"Bản thiết kế đã kiểm chứng trên simulator; xem căn cứ và giả định trước khi lưu."}]));
  return s;
 }
 const ids=new Set<string>();
 for(const c of proposal.changes){
  const field=form.fields.find(f=>f.id===c.fieldId);
  if(!field||field.schema.readOnly||ids.has(c.fieldId)||(proposal.kind==="baseline"&&!field.baselineEligible)||validateFieldValue(field.schema,c.value).length)fail("INVALID_PROPOSAL","AI đã đề xuất trường hoặc giá trị không hợp lệ.");
  ids.add(c.fieldId);
 }
 s.lastExplanation=proposal.message;
 s.proposal=proposal.changes.length||proposal.issues.length?structuredClone(proposal):null;s.issues=proposal.issues.map(i=>({...i}));
 if(proposal.kind==="baseline"){
  const fresh=proposal.changes.filter(c=>s.sources[c.fieldId]?.kind==="native-default"&&s.baselineSources[c.fieldId]?.kind==="native-default");
  if(fresh.length){
   const changes=fresh.map(({fieldId,value})=>({fieldId,value}));
   try{const tentative=structuredClone(s);applyChanges(tentative,changes);adapter.apply(s.baseline,changes);s.definition=tentative.definition;s.confirmations=tentative.confirmations;s.sources=sourcesAfter(form,adapter.form(s.definition),s.sources,fresh);if(s.proposal)s.proposal.prefilledFieldIds=fresh.map(c=>c.fieldId);}
   catch{s.issues.push({code:"BASELINE_REVIEW_REQUIRED",sectionId:form.sections.find(x=>x.id!=="metadata")?.id??"metadata",severity:"warning",message:"Các thông số liên quan cần được kiểm tra cùng nhau trước khi áp dụng. Giá trị hiện tại được giữ nguyên."});}
  }
 }
 return s;
}
function assertCurrentBlueprint(state:AuthoringState):void{
 if(!state.blueprint||state.blueprint.verification.recoveryVerified!==true||canonicalJson(state.blueprint.definition)!==canonicalJson(state.definition))fail("INVALID_BLUEPRINT","Cấu hình đã thay đổi hoặc chưa có bài tập kiểm chứng. Hãy yêu cầu AI soạn lại trước khi lưu.");
 validateScenarioRubric(state.blueprint.rubric,state.moduleId);
}
export function validateFinalAuthoring(state:AuthoringState){
 if(state.mode||state.blueprint)assertCurrentBlueprint(state);
 const adapter=authoringAdapterFor(state.moduleId),form=adapter.form(state.definition);
 const issues=[...validateMetadata(state.definition),...adapter.validate(state.definition,"final"),...state.issues];
 const confirmed=confirmedAuthoringSections(state,form);
 for(const section of form.sections)if(!confirmed.includes(section.id))issues.push({code:"SECTION_UNCONFIRMED",sectionId:section.id,severity:"error",message:`Cần xác nhận bước: ${section.title}.`});
 if(state.proposal)issues.push({code:"PROPOSAL_PENDING",sectionId:state.proposal.sectionId??"documents",severity:"error",message:"Áp dụng hoặc từ chối đề xuất AI trước khi hoàn tất."});
 const errors=issues.filter(i=>i.severity==="error");if(errors.length)fail("AUTHORING_INCOMPLETE","Bản nháp còn mục chưa được xác nhận hoặc chưa hợp lệ.",errors);
 return{definition:structuredClone(state.definition),issues};
}
export function authoringStateDto(session:AuthoringSession,latest:AnalysisJob|null):AuthoringSessionDto{
 const s=session.state,adapter=authoringAdapterFor(s.moduleId),form=adapter.form(s.definition);
 const known=new Set(form.fields.map(f=>f.id));const sources=Object.fromEntries(Object.entries(s.sources).filter(([id])=>known.has(id)));
 const publicBlueprint=s.blueprint?{version:s.blueprint.version,moduleId:s.blueprint.moduleId,title:s.blueprint.title,situation:s.blueprint.situation,cause:s.blueprint.cause,symptoms:s.blueprint.symptoms,assumptions:s.blueprint.assumptions,rubric:s.blueprint.rubric,verification:s.blueprint.verification,citations:s.blueprint.citations}:undefined;
 return{id:session.id,moduleId:s.moduleId,revision:session.revision,status:session.status,currentStep:s.currentStep,form,sources,context:s.context,...(s.mode?{mode:s.mode}:{}),...(publicBlueprint?{blueprint:publicBlueprint}:{}),...(s.lastExplanation?{lastExplanation:s.lastExplanation}:{}),
  baselineValues:Object.fromEntries(adapter.form(s.baseline).fields.filter(f=>known.has(f.id)).map(f=>[f.id,f.value])),confirmedSections:confirmedAuthoringSections(s,form),
  issues:[...s.issues,...validateMetadata(s.definition),...adapter.validate(s.definition,"draft")],proposal:s.proposal,preview:adapter.preview(s.definition),
  documents:session.documents.map(({id,name,mimeType,bytes,sha256})=>({id,name,mimeType,bytes,sha256})),
  analysis:latest?{id:latest.id,status:latest.status,errorCode:latest.errorCode}:null,scenarioRowId:session.scenarioRowId,scenarioId:session.scenarioId,createdAt:session.createdAt,updatedAt:session.updatedAt};
}
