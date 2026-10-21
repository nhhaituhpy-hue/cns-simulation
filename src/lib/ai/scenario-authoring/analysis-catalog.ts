import type { AuthoringField, JsonValue, ValueSchema } from "./types";
import { validateFieldValue } from "./forms/helpers";
import { AiScenarioError } from "../scenario-generation/types";
export interface AnalysisField extends AuthoringField { parentId: string; relativePath: string[] }
const protectedKey = /password|credential|secret|api.?key|access.?token|private.?key/i;
/** Project only typed, allowlisted values. Never serialize the private definition. */
function unsafe(value:unknown):boolean {
 if(!value||typeof value!=="object")return false;
 return Object.entries(value).some(([key,child])=>protectedKey.test(key)||unsafe(child));
}
export function analysisCatalog(fields: AuthoringField[], baseline: boolean): AnalysisField[] {
 const result: AnalysisField[]=[];
 for(const field of fields){
  if(protectedKey.test(field.id)||unsafe(field.schema)||unsafe(field.value)||validateFieldValue(field.schema,field.value).length)throw new AiScenarioError("INVALID_SELECTION","Biểu mẫu có dữ liệu không an toàn.");
  const visit=(schema:ValueSchema,value:JsonValue,path:string[])=>{
   if(schema.readOnly||path.some(p=>protectedKey.test(p)))return;
   if(baseline&&schema.type==="object"&&value&&typeof value==="object"&&!Array.isArray(value)){
    for(const [key,child]of Object.entries(schema.properties??{}))if(Object.hasOwn(value,key))visit(child,value[key],[...path,key]);
   }else if(baseline&&schema.type==="array"&&Array.isArray(value)){
    value.forEach((item,i)=>{const child=schema.variants?.find(v=>typeof item==="object"&&item!==null&&!Array.isArray(item)&&item[schema.discriminator??"kind"]===v.value)?.schema??schema.item;if(child)visit(child,item,[...path,String(i)]);});
   }else result.push({...field,id:[field.id,...path].join("."),schema,value,parentId:field.id,relativePath:path,group:[field.group,...path.slice(0,-1)].join(" / ")});
  };
  visit(field.schema,field.value,[]);
 }
 return result;
}
export function fieldWindows(fields:AnalysisField[]):AnalysisField[][]{
 const windows:AnalysisField[][]=[];let window:AnalysisField[]=[],size=0;
 for(const field of fields){const n=JSON.stringify(field).length;if(window.length&&(window.length>=24||size+n>16000)){windows.push(window);window=[];size=0;}window.push(field);size+=n;}
 if(window.length)windows.push(window);return windows;
}
