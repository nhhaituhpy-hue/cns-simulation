import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDatabasePool } from "@/lib/db";
import { isRecord } from "@/lib/scenario-exams/results";
import { isScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { assertSafeJson } from "@/lib/ai/scenario-authoring/forms/helpers";
import { createPracticeHint, readPracticeHint, PracticeHintError, type PracticeHintInput } from "@/lib/ai/feedback/practice-hints";
export const runtime = "nodejs";
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
function failure(error:unknown){const code=error instanceof PracticeHintError?error.code:"HINT_UNAVAILABLE";return json({code,error:"Không thể lấy gợi ý cho bài ôn tập hiện tại."},({INVALID_INPUT:400,NOT_FOUND:404,ACTOR_FORBIDDEN:403,QUOTA_EXCEEDED:429,IDEMPOTENCY_CONFLICT:409,PUBLICATION_CHANGED:409} as Record<string,number>)[code]??503);}
async function readBody(request:Request):Promise<unknown>{
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')??'')||!request.body) return null;
  const length=request.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>500_000))return null;
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let total=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>500_000){await reader.cancel();return null;}chunks.push(value);}const parsed:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));assertSafeJson(parsed);return parsed;}catch{return null;}finally{reader.releaseLock();}
}
export async function POST(request:Request){
  const profile=await getCurrentProfile();if(!profile)return json({code:"UNAUTHORIZED"},401);
  if(request.headers.get('origin')!==(process.env.CNS_PUBLIC_ORIGIN||new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')return json({code:"INVALID_ORIGIN"},403);
  const key=request.headers.get('Idempotency-Key');if(!uuid(key))return json({code:"INVALID_INPUT"},400);
  const input=await readBody(request);
  if(!isRecord(input)||Object.keys(input).some(k=>!["moduleId","scenarioId","libraryMembershipId","payload","runKey","question"].includes(k))
    ||typeof input.moduleId!=="string"||!isScenarioParametersModuleId(input.moduleId)||typeof input.scenarioId!=="string"||!input.scenarioId||input.scenarioId.length>200
    ||(input.libraryMembershipId!==undefined&&!uuid(input.libraryMembershipId))
    ||typeof input.runKey!=="string"||!input.runKey||input.runKey.length>200||(input.payload!==null&&!isRecord(input.payload))
    ||(input.question!==undefined&&(typeof input.question!=="string"||input.question.length>1000)))return json({code:"INVALID_INPUT"},400);
  try{return json(await createPracticeHint(getDatabasePool(),profile.id,key,input as unknown as PracticeHintInput),202);}catch(error){return failure(error);}
}
export async function GET(request:Request){
  const profile=await getCurrentProfile();if(!profile)return json({code:"UNAUTHORIZED"},401);
  const params=new URL(request.url).searchParams,id=params.get('jobId');if(!uuid(id)||[...params.keys()].some(k=>k!=='jobId')||params.getAll('jobId').length!==1)return json({code:"INVALID_INPUT"},400);
  try{return json(await readPracticeHint(getDatabasePool(),profile.id,id));}catch(error){return failure(error);}
}
