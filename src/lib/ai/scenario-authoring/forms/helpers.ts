import type { ScenarioParametersDefinition } from "@/lib/scenario-parameters";
import type { AuthoringField, AuthoringIssue, AuthoringSection, JsonValue, ValueSchema } from "../types";
import { AuthoringError } from "../errors";

const forbidden=new Set(["__proto__","prototype","constructor"]);
function bad():never{throw new AuthoringError("INVALID_INPUT","Dữ liệu biểu mẫu không hợp lệ.");}
export function assertSafeJson(value:unknown):void{
 let nodes=0,characters=0;
 const visit=(v:unknown,depth:number):void=>{
  if(++nodes>30000||depth>24)bad();
  if(v===null||typeof v==="boolean")return;
  if(typeof v==="number"){if(!Number.isFinite(v))bad();return;}
  if(typeof v==="string"){characters+=v.length;if(v.length>30000||characters>750000||/[\x00]/.test(v))bad();return;}
  if(typeof v!=="object")bad();
  if(Array.isArray(v)){if(v.length>2000)bad();for(const x of v)visit(x,depth+1);return;}
  if(Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)bad();
  for(const [key,child]of Object.entries(v)){if(forbidden.has(key))bad();visit(child,depth+1);}
 };
 visit(value,0);
}
function parts(id:string):string[]{const p=id.split(".");if(!id||id.length>300||p.some(x=>!x||forbidden.has(x)))bad();return p;}
export function readPath(root:unknown,id:string):JsonValue|undefined{
 let v:unknown=root;for(const p of parts(id)){if(!v||typeof v!=="object"||!Object.hasOwn(v,p))return undefined;v=(v as Record<string,unknown>)[p];}return v as JsonValue|undefined;
}
export function writePath(root:unknown,id:string,value:JsonValue):void{
 assertSafeJson(value);const p=parts(id);let v:unknown=root;
 for(const key of p.slice(0,-1)){if(!v||typeof v!=="object"||!Object.hasOwn(v,key))bad();v=(v as Record<string,unknown>)[key];}
 const last=p.at(-1)!;if(!v||typeof v!=="object"||!Object.hasOwn(v,last))bad();(v as Record<string,unknown>)[last]=structuredClone(value);
}
/** Resolve only an own string discriminator; never fall back to another variant. */
export function resolveValueVariant(schema:ValueSchema,value:unknown){
 const key=schema.discriminator??"kind";
 if(!value||typeof value!=="object"||Array.isArray(value)||forbidden.has(key)||!Object.hasOwn(value,key))return undefined;
 const kind=(value as Record<string,unknown>)[key];
 return typeof kind==="string"?schema.variants?.find(variant=>variant.value===kind):undefined;
}
export function validateFieldValue(schema:ValueSchema,value:unknown,path=schema.label):string[]{
 const errors:string[]=[];const error=(detail:string)=>errors.push(`${path}: ${detail}`);
 try{assertSafeJson(value);}catch{return[`${path}: dữ liệu không hợp lệ.`];}
 if(value===null){if(schema.nullable)return [];return[`${path}: cần nhập giá trị.`];}
 switch(schema.type){
  case "number":{
   if(typeof value!=="number"||!Number.isFinite(value)){error("cần một số hữu hạn.");break;}
   if(schema.min!==undefined&&value<schema.min)error(`tối thiểu ${schema.min}.`);
   if(schema.max!==undefined&&value>schema.max)error(`tối đa ${schema.max}.`);
   if(schema.step&&Math.abs((value-(schema.min??0))/schema.step-Math.round((value-(schema.min??0))/schema.step))>1e-7)error(`bước giá trị ${schema.step}.`);
   break;
  }
  case "boolean":if(typeof value!=="boolean")error("chọn Có hoặc Không.");break;
  case "text":case "select":{
   if(typeof value!=="string"){error("cần nội dung văn bản.");break;}
   if(schema.required&&!value.trim())error("không được để trống.");
   if(value.length>(schema.maxLength??4000))error("nội dung quá dài.");
   if(schema.type==="select"&&!schema.options?.some(o=>o.value===value))error("lựa chọn không được hỗ trợ.");
   break;
  }
  case "object":{
   if(typeof value!=="object"||Array.isArray(value)){error("cần nhóm trường hợp lệ.");break;}
   if(schema.variants){
    const variant=resolveValueVariant(schema,value);
    if(!variant)error("loại không được hỗ trợ.");
    else errors.push(...validateFieldValue(variant.schema,value,path));
    break;
   }
   const v=value as Record<string,unknown>,properties=schema.properties??{};
   for(const key of Object.keys(v))if(!Object.hasOwn(properties,key))error(`trường không được hỗ trợ: ${key}.`);
   for(const [key,child]of Object.entries(properties)){
    if(!Object.hasOwn(v,key)){if(child.required)error(`thiếu ${child.label}.`);continue;}
    errors.push(...validateFieldValue(child,v[key],`${path} / ${child.label}`));
   }
   break;
  }
  case "array":{
   if(!Array.isArray(value)){error("cần danh sách.");break;}
   if(value.length>(schema.maxItems??200))error("quá nhiều mục.");
   for(const [index,item]of value.entries()){
    const child=schema.variants?resolveValueVariant(schema,item)?.schema:schema.item;
    if(!child)error(`mục ${index+1} không có loại được hỗ trợ.`);else errors.push(...validateFieldValue(child,item,`${path} ${index+1}`));
   }
   break;
  }
 }
 return errors;
}
export function inferValueSchema(value:JsonValue,label:string,help:string):ValueSchema{
 if(value===null)return{type:"number",label,help,nullable:true};
 if(typeof value==="boolean")return{type:"boolean",label,help};
 if(typeof value==="number")return{type:"number",label,help};
 if(typeof value==="string")return{type:"text",label,help,maxLength:2000};
 if(Array.isArray(value))return{type:"array",label,help,maxItems:200,...(value[0]!==undefined?{item:inferValueSchema(value[0],"Mục",help)}:{})};
 return{type:"object",label,help,properties:Object.fromEntries(Object.entries(value).map(([key,v])=>[key,{...inferValueSchema(v,key,help),required:true}]))};
}
export const metadataSection:AuthoringSection={id:"metadata",title:"Thông tin kịch bản",help:"Đặt tên dễ nhận biết và nêu mục tiêu bài. ID được tạo sẵn; bạn có thể giữ nguyên. Độ khó không tự thay đổi các thông số kỹ thuật."};
export function metadataFields(definition:ScenarioParametersDefinition):AuthoringField[]{
 const schemas:Record<string,ValueSchema>={
  id:{type:"text",label:"ID kịch bản",help:"Mã duy nhất được tạo sẵn. Chỉ dùng chữ, số, dấu chấm, gạch ngang hoặc gạch dưới; không ghi đè bài cũ.",required:true,maxLength:200},
  name:{type:"text",label:"Tên kịch bản",help:"Tên ngắn mô tả tình huống để giám khảo và học viên nhận biết.",required:true,maxLength:200},
  difficulty:{type:"select",label:"Độ khó",help:"Cơ bản: thao tác đơn; trung bình: đối chiếu nhiều chỉ số; nâng cao: kết hợp nhiều bước chẩn đoán. Đây là nhãn đào tạo.",options:[{value:"basic",label:"Cơ bản"},{value:"intermediate",label:"Trung bình"},{value:"advanced",label:"Nâng cao"}],required:true},
  description:{type:"text",label:"Mô tả và mục tiêu",help:"Nêu việc học viên cần làm và kết quả mong đợi. Không đưa bí mật hoặc thông tin bài làm của học viên.",maxLength:2000,required:true}
 };
 return Object.entries(schemas).map(([id,schema])=>({id,sectionId:"metadata",group:"Thông tin chung",schema,value:readPath(definition,id)!,baselineEligible:false}));
}
export function validateMetadata(definition:ScenarioParametersDefinition):AuthoringIssue[]{
 const issues:AuthoringIssue[]=metadataFields(definition).flatMap(f=>validateFieldValue(f.schema,f.value).map(message=>({code:"INVALID_METADATA",sectionId:"metadata",fieldId:f.id,severity:"error"as const,message})));
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(definition.id))issues.push({code:"INVALID_SCENARIO_ID",sectionId:"metadata",fieldId:"id",severity:"error",message:"ID cần bắt đầu bằng chữ hoặc số; không chứa khoảng trắng hay ký tự đặc biệt."});
 return issues;
}

/** Object key order is irrelevant after PostgreSQL JSONB round-trip; array order remains meaningful. */
export function canonicalJson(value:unknown):string {
 const normalize=(v:unknown):unknown=>Array.isArray(v)?v.map(normalize):v&&typeof v==="object"?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,normalize(x)])):v;
 return JSON.stringify(normalize(value));
}
