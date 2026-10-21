import type { Pool } from "pg";
import { processNextGeneration } from "@/lib/ai/scenario-generation/worker";
import { extractIsolatedDocuments } from "@/lib/ai/documents/isolated";
import { analyzeAuthoring } from "./document-analysis";
import { authoringKnowledgeContext } from "../knowledge/context";
import { generateScenarioBlueprint } from "../scenario-blueprint/generator";
import { claimAuthoringAnalysis, heartbeatAuthoringAnalysis, finishAuthoringAnalysis, failAuthoringAnalysis } from "./repository";
/** Same fenced, single-flight lifecycle; completion saves a proposal, never a scenario. */
export function processNextAuthoring(pool:Pool,workerId:string,signal?:AbortSignal){
 return processNextGeneration({
  claim:async()=>{const job=await claimAuthoringAnalysis(pool,workerId);return job&&job.attemptToken?{id:job.id,attemptToken:job.attemptToken,input:{state:job.state,request:job.request},documents:job.documents}:null;},
  heartbeat:job=>heartbeatAuthoringAnalysis(pool,job.id,job.attemptToken),
  loadDocuments:(docs,abort)=>extractIsolatedDocuments(docs,abort),
  generate:async(input,docs,abort)=>{
   if(input.request.kind==="blueprint"){
    const blueprint=await generateScenarioBlueprint({moduleId:input.state.moduleId,description:input.request.question,mode:input.state.mode??(docs.length?"documents":"description")},docs,abort);
    const characters=docs.reduce((n,d)=>n+d.segments.reduce((m,s)=>m+s.text.length,0),0);
    return {kind:"blueprint" as const,blueprint,message:"Đã dựng bài tập và kiểm chứng khả năng thực hiện trên simulator. Hãy xem tình huống, đáp án và căn cứ trước khi lưu.",changes:[],issues:[],coverage:{documents:docs.length,charactersAvailable:characters,charactersRead:characters,truncated:false}};
   }
   const context=await authoringKnowledgeContext(input.state,input.request,docs);
   abort?.throwIfAborted();
   const proposal=await analyzeAuthoring(input.state,input.request,context.documents,abort);
   return context.notice?{...proposal,issues:[...proposal.issues,{code:"KNOWLEDGE_REFERENCE_SCOPE",sectionId:input.request.sectionId??"documents",message:context.notice,severity:"warning" as const}]}:proposal;
  },
  complete:(job,proposal)=>finishAuthoringAnalysis(pool,job.id,job.attemptToken,proposal),
  fail:(job,error)=>failAuthoringAnalysis(pool,job.id,job.attemptToken,error.code),
  signal,
 });
}
