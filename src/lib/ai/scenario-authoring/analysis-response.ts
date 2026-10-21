import { AiScenarioError } from "../scenario-generation/types";
import { assertSafeJson } from "./forms/helpers";
import type { JsonValue } from "./types";
export interface AnalysisResponse {message:string;changes:Array<{fieldId:string;value:JsonValue;reason:string;citation?:{documentId:string;segmentLabel:string;quote:string}}>;issues:Array<{fieldId?:string;message:string}>}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
const text=(v:unknown,max:number)=>typeof v==="string"&&!!v.trim()&&v.length<=max;
function invalid():never{throw new AiScenarioError("INVALID_SELECTION","Phản hồi AI chứa dữ liệu không được hỗ trợ.");}
export function analysisResponse(value:unknown,ids:Set<string>):AnalysisResponse{
 try{assertSafeJson(value);}catch{invalid();}
 if(!record(value)||!keys(value,["message","changes","issues"])||!text(value.message,3000)||!Array.isArray(value.changes)||value.changes.length>8||!Array.isArray(value.issues)||value.issues.length>24)invalid();
 const seen=new Set<string>();
 for(const c of value.changes){
  if(!record(c)||!keys(c,["fieldId","value","reason","citation"])||typeof c.fieldId!=="string"||!ids.has(c.fieldId)||seen.has(c.fieldId)||!Object.hasOwn(c,"value")||!text(c.reason,1000))invalid();
  seen.add(c.fieldId);
  if(c.citation!==undefined&&(!record(c.citation)||!keys(c.citation,["documentId","segmentLabel","quote"])||!text(c.citation.documentId,200)||!text(c.citation.segmentLabel,100)||!text(c.citation.quote,1500)))invalid();
 }
 for(const i of value.issues)if(!record(i)||!keys(i,["fieldId","message"])||!text(i.message,1000)||(i.fieldId!==undefined&&(typeof i.fieldId!=="string"||!ids.has(i.fieldId))))invalid();
 return value as unknown as AnalysisResponse;
}
