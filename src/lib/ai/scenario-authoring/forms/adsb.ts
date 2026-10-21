import { getDefaultAdsbConfig } from "@/lib/simulator-config/ads-b";
import { getMenuDefinition } from "@/lib/menu-data";
import { parseAdsbScenarioDefinition, type AdsbScenarioDefinition } from "@/modules/devices/adsb/scenario-parameters";
import type { NativeAuthoringAdapter, AuthoringForm, AuthoringIssue, AuthoringField, JsonValue, ValueSchema } from "../types";
import { assertSafeJson, metadataFields, metadataSection, writePath, validateFieldValue, validateMetadata } from "./helpers";
import { adsbActionPlan, adsbActionSchema, compileAdsbActions } from "./adsb-actions";
import { adsbSitesSchema, adsbEventSchema, adsbRecordedSchema, select } from "./adsb-schema";
import { adsbHardwareSchema, validateAdsbHardware } from "./adsb-hardware";
const sections = [metadataSection,
 {id:"sites",title:"Site và cảm biến",help:"Cấu hình ban đầu và nhật ký QCMS; không phải kết quả khôi phục."},
 {id:"login",title:"Vai trò đăng nhập",help:"Vai trò terminal mô phỏng; không nhập credential."},
 {id:"actions",title:"Thao tác chuẩn",help:"Input được replay bằng TerminalEngine, không tự đặt tên menu hoặc nhãn đáp án."},
 {id:"hardware",title:"Phần cứng",help:"Không có sự cố mặc định; không suy diễn sửa chữa vật lý."},
];
const nativeMenuNotes = (["sysadmin", "maintenance"] as const).flatMap(role => Object.values(getMenuDefinition(role).menus).map(menu => `${role} / ${menu.title}: ${menu.items.map(item => `${item.number} — ${item.label}`).join("; ")}`));
const notes=[...nativeMenuNotes,"Chấp nhận lệnh native không chứng minh sensor xanh, GPS đồng bộ hay sửa chữa phần cứng.","Một số generic setting chỉ cập nhật terminal settings, không cập nhật sensor profile. Nhật ký và monitoring là quan sát ban đầu, không phải mô phỏng hồi phục."];
const json=(v:unknown)=>v as JsonValue;
const field=(id:string,sectionId:string,schema:ValueSchema,value:unknown,baselineEligible=false):AuthoringField=>({id,sectionId,group:schema.label,schema,value:json(value),baselineEligible});
function form(d:AdsbScenarioDefinition):AuthoringForm {
 const sensors=d.sites.flatMap(s=>[s.sensorA,s.sensorB]).filter(s=>s!==null);
 const fields:AuthoringField[]=[...metadataFields(d),field("sites","sites",adsbSitesSchema,d.sites),field("targetSensorId","sites",select("Cảm biến mục tiêu",sensors.map(s=>s!.id)),d.targetSensorId),field("targetLoginUser","login",select("Vai trò đăng nhập",["sysadmin","maintenance"]),d.targetLoginUser),field("actionPlan","actions",adsbActionSchema,adsbActionPlan(d)),field("eventLog","sites",adsbEventSchema,d.eventLog??null),field("hardwareFault","hardware",adsbHardwareSchema,d.hardwareFault??null)];
 // Leaf/group controls make normal document prefills eligible without automatically setting observations/faults.
 d.sites.forEach((site,i)=>{
  fields.push(field(`sites.${i}.name`,"sites",adsbSitesSchema.item!.properties!.name,site.name,true));
  for(const slot of ["sensorA","sensorB"] as const) {
   const sensor=site[slot];if(!sensor)continue;
   const schema=adsbSitesSchema.item!.properties![slot].properties!;
   for(const key of ["name","ipAddress"] as const)fields.push(field(`sites.${i}.${slot}.${key}`,"sites",schema[key],sensor[key],true));
   if(sensor.dataProfile)for(const [key,value]of Object.entries(sensor.dataProfile))fields.push(field(`sites.${i}.${slot}.dataProfile.${key}`,"sites",schema.dataProfile.properties![key],value,true));
  }
 });
 return {moduleId:"ads-b",label:"ADS-B",version:1,sections,fields,notices:notes};
}
function issue(message:string,sectionId="sites",fieldId="sites"):AuthoringIssue{return {code:"INVALID_ADSB_AUTHORING",message,sectionId,fieldId,severity:"error"};}
const safeId=(id:string)=>/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(id)&&!["constructor","prototype","__proto__"].includes(id);
const ipv4=(s:string)=>s.split(".").length===4&&s.split(".").every(n=>/^\d{1,3}$/.test(n)&&Number(n)<=255&&String(Number(n))===n);
function validate(d:AdsbScenarioDefinition,phase:"draft"|"final"):AuthoringIssue[] {
 const issues:AuthoringIssue[]=[];
 try {
  assertSafeJson(d);
  const allowed=["schemaVersion","id","name","description","difficulty","sites","targetSensorId","targetLoginUser","expectedActions","hardwareFault","eventLog"];
  if(Object.keys(d).some(k=>!allowed.includes(k))||d.schemaVersion!==1)throw new Error("Trường definition không được hỗ trợ.");
  for(const [id,schema,value] of [["sites",adsbSitesSchema,d.sites],["eventLog",adsbEventSchema,d.eventLog??null],["expectedActions",adsbRecordedSchema,d.expectedActions],["targetLoginUser",select("Vai trò",["sysadmin","maintenance"]),d.targetLoginUser]] as const){
   issues.push(...validateFieldValue(schema,value).map(m=>issue(m,id==="expectedActions"?"actions":id==="targetLoginUser"?"login":"sites",id)));
  }
  issues.push(...validateAdsbHardware(d.hardwareFault??null).map(m=>issue(m,"hardware","hardwareFault")));
  if(issues.length)return issues;
  if(!d.sites.length)issues.push(issue("Cần ít nhất một site."));
  const siteIds=new Set<string>(),names=new Set<string>(),sensorIds=new Set<string>();
  for(const site of d.sites) {
   if(!safeId(site.id))issues.push(issue("ID site chỉ dùng chữ, số, dấu chấm, gạch ngang hoặc gạch dưới."));
   if(siteIds.has(site.id)||names.has(site.name.trim().toLowerCase()))issues.push(issue("ID và tên site phải duy nhất."));siteIds.add(site.id);names.add(site.name.trim().toLowerCase());
   for(const sensor of [site.sensorA,site.sensorB]) {
    if(!sensor)continue;
    if(!safeId(sensor.id))issues.push(issue("ID cảm biến không hợp lệ."));
    if(sensorIds.has(sensor.id))issues.push(issue("ID cảm biến phải duy nhất."));sensorIds.add(sensor.id);
    if(!ipv4(sensor.ipAddress))issues.push(issue("IPv4 sensor không hợp lệ."));
    const p=sensor.dataProfile;if(!p)continue;
    if(sensor.ipAddress!==p.network.ip)issues.push(issue("IP kết nối cảm biến phải khớp IP trong data profile."));
    if([p.network.ip,p.network.subnet,p.network.gateway,p.syslog.remoteServerIp,...p.clients.map(c=>c.ip),...p.snmpTraps.map(t=>t.ip)].some(ip=>!ipv4(ip)))issues.push(issue("Địa chỉ IPv4 trong profile không hợp lệ."));
    if(new Set(p.clients.map(c=>c.id)).size!==p.clients.length)issues.push(issue("ID client phải duy nhất."));
    if(p.filters.altitudeMin>p.filters.altitudeMax)issues.push(issue("Altitude min phải nhỏ hơn hoặc bằng max."));
    if(p.endToEnd&&p.endToEnd.failurePower>=p.endToEnd.alertPower)issues.push(issue("Failure power phải thấp hơn alert power."));
   }
  }
  if(!sensorIds.has(d.targetSensorId))issues.push(issue("Cảm biến mục tiêu không tồn tại.","sites","targetSensorId"));
  if(phase==="final")issues.push(...validateMetadata(d));
  if(!d.expectedActions.length) {if(phase==="final")issues.push(issue("Thêm ít nhất một thao tác chuẩn native.","actions","actionPlan"));}
  else if(!issues.length) {
   try {
    const compiled=compileAdsbActions(d,adsbActionPlan(d)).actions;
    if(compiled.length!==d.expectedActions.length||compiled.some((a,i)=>["kind","menuId","menuTitle","input","resultLabel","step"].some(k=>a[k as keyof typeof a]!==d.expectedActions[i][k as keyof typeof a])))throw new Error("Nhãn/ngữ cảnh thao tác không khớp TerminalEngine native.");
   }catch(e){issues.push(issue(e instanceof Error?e.message:"Chuỗi thao tác không hợp lệ.","actions","actionPlan"));}
  }
  if(phase==="final"&&!issues.length&&!parseAdsbScenarioDefinition(d))issues.push(issue("Native parser từ chối definition."));
 }catch(e){issues.push(issue(e instanceof Error?e.message:"Dữ liệu không hợp lệ."));}
 return issues;
}
export const adsbAuthoringAdapter:NativeAuthoringAdapter={
 moduleId:"ads-b",
 createDefault(){
  const dataProfile=getDefaultAdsbConfig().sensorDataProfile!;
  return {schemaVersion:1,id:"adsb-authoring",name:"Kịch bản ADS-B",description:"Bài tập thao tác trên cấu hình ADS-B native.",difficulty:"basic",sites:[{id:"site-1",name:"Site 1",sensorA:{id:"site-1-A",sensorLabel:"A",status:"green",ipAddress:dataProfile.network.ip,name:dataProfile.sensorName,dataProfile},sensorB:null}],targetSensorId:"site-1-A",targetLoginUser:"sysadmin",expectedActions:[]};
 },
 form(definition){
  const errors=validate(definition as AdsbScenarioDefinition,"draft");
  const metadata=metadataFields(definition).flatMap(f=>validateFieldValue({...f.schema,required:false},f.value));
  if(errors.length||metadata.length)throw new Error("Cấu trúc ADS-B không hợp lệ; không xuất dữ liệu ra biểu mẫu.");
  return form(definition as AdsbScenarioDefinition);
 },
 apply(definition,changes){
  const before=validate(definition as AdsbScenarioDefinition,"draft");if(before.length)throw new Error(before.map(i=>i.message).join(" "));
  assertSafeJson(changes);const d=structuredClone(definition) as AdsbScenarioDefinition;const fields=form(d).fields;const seen=new Set<string>();let plan:unknown=adsbActionPlan(d);
  for(const c of changes){
   const f=fields.find(f=>f.id===c.fieldId);if(!f||seen.has(c.fieldId)||Object.keys(c).some(k=>!["fieldId","value"].includes(k)))throw new Error("Trường không được hỗ trợ hoặc lặp lại.");seen.add(c.fieldId);
   const errors=validateFieldValue(f.schema,c.value);if(errors.length)throw new Error(errors.join(" "));
   if(c.fieldId==="actionPlan")plan=c.value;
   else if(c.fieldId==="eventLog"||c.fieldId==="hardwareFault"){if(c.value===null)delete d[c.fieldId];else Object.assign(d,{[c.fieldId]:structuredClone(c.value)});}
   else writePath(d,c.fieldId,c.value);
  }
  // Null in optional form groups represents an absent native property.
  for(const site of d.sites)for(const sensor of [site.sensorA,site.sensorB])if(sensor){if(sensor.monitoring===null)delete sensor.monitoring;if(sensor.dataProfile===null)delete sensor.dataProfile;}
  d.expectedActions=[];
  const errors=validate(d,"draft");if(errors.length)throw new Error(errors.map(i=>i.message).join(" "));
  d.expectedActions=compileAdsbActions(d,plan).actions;
  return d;
 },
 validate(definition,phase){return validate(definition as AdsbScenarioDefinition,phase);},
 preview(definition){const issues=validate(definition as AdsbScenarioDefinition,"final");return {status:issues.length?"invalid":"valid",checks:[{id:"native-definition",label:"Schema và terminal native",passed:!issues.length,detail:issues.length?issues.map(i=>i.message).join(" "):"Native parser và replay chấp nhận cấu trúc/chuỗi input; không xác minh learner recovery."}],notes,recoveryVerified:false};},
};
