"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { useScenarioStore } from "@/stores/scenario-store";
import { sanitizePracticeHintPayload } from "@/lib/ai/feedback/practice-hints-input";
import type { PracticeHintResult } from "@/lib/ai/feedback/practice-hints-worker";
export interface PracticeAiHintsProps { moduleId: ScenarioParametersModuleId; scenarioId: string; libraryMembershipId?: string; attemptKey?: string | number | null; getPayload: () => Record<string, unknown> | null; disabled?: boolean }
interface State { scope: string; pending: boolean; jobId: string | null; result: PracticeHintResult | null; error: string | null; readError: boolean; question: string }
const initial=(scope:string):State=>({scope,pending:false,jobId:null,result:null,error:null,readError:false,question:""});
async function requestJson(url:string,init:RequestInit,signal:AbortSignal):Promise<{response:Response; data:Record<string,unknown>}> {
  const controller=new AbortController();const stop=()=>controller.abort();signal.addEventListener('abort',stop,{once:true});if(signal.aborted)stop();
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([(async()=>{const response=await fetch(url,{...init,signal:controller.signal,cache:'no-store'});const data=await response.json();return {response,data};})(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error("Yêu cầu gợi ý quá thời gian. Hãy thử lại."));},15_000);})]);}
  finally{clearTimeout(timer);signal.removeEventListener('abort',stop);controller.abort();}
}
function pause(signal:AbortSignal){return new Promise<void>((resolve,reject)=>{const stop=()=>{clearTimeout(timer);reject(Error("Đã dừng"));};const timer=setTimeout(()=>{signal.removeEventListener('abort',stop);resolve();},2000);signal.addEventListener('abort',stop,{once:true});if(signal.aborted)stop();});}
export function PracticeAiHints({moduleId,scenarioId,libraryMembershipId,attemptKey,getPayload,disabled=false}:PracticeAiHintsProps){
  const owner=useScenarioStore(s=>s.sessionIdentity);
  const scope=JSON.stringify([owner,moduleId,scenarioId,libraryMembershipId??null,attemptKey??null,disabled]);
  const live=useRef(scope);
  useLayoutEffect(()=>{live.current=scope;},[scope]);
  const [state,setState]=useState(()=>initial(scope));
  const flight=useRef<AbortController|null>(null), frozen=useRef<{key:string;body:string}|null>(null);
  const current=state.scope===scope;
  useEffect(()=>{if(current)return;flight.current?.abort();flight.current=null;frozen.current=null;setState(initial(scope));},[scope,current]);
  useEffect(()=>()=>{flight.current?.abort();},[]);
  const view=current?state:initial(scope);
  async function run(readOnly=false){
    if(disabled||!owner||!current||flight.current)return;
    const controller=new AbortController(),captured=scope;flight.current=controller;
    const valid=()=>!controller.signal.aborted&&live.current===captured;
    const update=(patch:Partial<State>)=>{if(valid())setState(s=>({...s,...patch}));};
    let jobId=readOnly?state.jobId:null;
    update({pending:true,error:null,readError:false,...(!readOnly?{result:null,jobId:null}:{})});
    try{
      if(!jobId){
        if(!frozen.current)frozen.current={key:crypto.randomUUID(),body:JSON.stringify({moduleId,scenarioId,...(libraryMembershipId?{libraryMembershipId}:{}),runKey:String(attemptKey??"current"),question:state.question,payload:sanitizePracticeHintPayload(getPayload())})};
        const {response,data}=await requestJson('/api/ai/practice-hints',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':frozen.current.key},body:frozen.current.body},controller.signal);
        if(!valid())return;
        if(!response.ok||typeof data.jobId!=='string'){if(response.status>=400&&response.status<500&&response.status!==408)frozen.current=null;throw Error("Chưa gửi được yêu cầu gợi ý. Thử lại sẽ giữ nguyên yêu cầu nếu kết quả mạng chưa rõ.");}
        jobId=data.jobId;frozen.current=null;update({jobId});
      }
      for(let count=0;count<30;count++){
        const {response,data}=await requestJson(`/api/ai/practice-hints?jobId=${encodeURIComponent(jobId!)}`,{},controller.signal);
        if(!valid())return;
        if(!response.ok)throw Error("Không thể đọc gợi ý. Bạn có thể tải lại mà không gửi yêu cầu mới.");
        if(data.status==='completed'){
          const result=data.result as PracticeHintResult|undefined;
          if(!result||!['ai-assisted','deterministic-only'].includes(result.sourceMode)||typeof result.summary!=='string'||!Array.isArray(result.nextSteps)||!result.nextSteps.every(s=>typeof s==='string')||typeof result.notice!=='string')throw Error("Kết quả gợi ý không hợp lệ.");
          update({pending:false,result,error:null});return;
        }
        if(data.status==='failed'){update({pending:false,error:"Chưa tạo được gợi ý. Bạn có thể yêu cầu một bước mới.",readError:false});return;}
        if(!['queued','running'].includes(String(data.status)))throw Error("Trạng thái gợi ý không hợp lệ.");
        await pause(controller.signal);
      }
      throw Error("Gợi ý đang xử lý lâu hơn dự kiến. Tải lại để tiếp tục đọc kết quả.");
    }catch(error){update({pending:false,error:error instanceof Error?error.message:"Không thể lấy gợi ý.",readError:Boolean(jobId),jobId});}
    finally{if(flight.current===controller)flight.current=null;}
  }
  return <section aria-label="Gợi ý từ AI" className="flex min-h-80 min-w-0 flex-1 flex-col gap-3 rounded-xl border border-[#d6e0ec] bg-white/70 p-3 text-[#142238]">
    <h2 className="text-base font-semibold">Gợi ý từ AI</h2>
    <p className="text-xs text-[#485b73]">Gợi ý một bước từ bài ôn tập và bằng chứng hiện tại. Không chấm điểm hoặc tự thay đổi thiết bị. Dữ liệu đã lọc sẽ gửi tới dịch vụ AI được cấu hình.</p>
    <label className="flex flex-col gap-1 text-sm">Câu hỏi (không bắt buộc)<textarea value={view.question} maxLength={1000} disabled={disabled||view.pending} onChange={e=>setState(s=>({...s,question:e.target.value}))} rows={3} className="w-full min-w-0 resize-y rounded-lg border border-[#b5c6db] bg-white p-2 text-sm text-[#142238] caret-[#142238] [-webkit-text-fill-color:#142238]" placeholder="Bạn muốn kiểm tra điều gì tiếp theo?"/></label>
    <button type="button" disabled={disabled||!owner||view.pending||!current} onClick={()=>void run()} className="rounded-full bg-[#0369a1] px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">Gợi ý một bước</button>
    <div aria-live="polite" className="min-w-0 flex-1 space-y-2 break-words text-sm">
      {view.pending&&<p role="status">Đang chuẩn bị gợi ý…</p>}
      {view.error&&<p role="alert">{view.error}</p>}
      {view.result&&<><p className="font-medium">{view.result.summary}</p><ul className="list-disc space-y-2 pl-4">{view.result.nextSteps.map((step,i)=><li key={i}>{step}</li>)}</ul><p className="text-xs text-[#485b73]">{view.result.sourceMode==='ai-assisted'?'AI hỗ trợ lựa chọn bước.':'Phân tích tất định (không có kết quả từ AI).'} {view.result.notice}</p></>}
      {view.readError&&!view.pending&&<button type="button" disabled={disabled} onClick={()=>void run(true)} className="rounded border border-[#b5c6db] px-3 py-2">Tải lại gợi ý</button>}
      {disabled&&<p className="text-xs">Gợi ý đã khóa sau khi nộp bài.</p>}
    </div>
  </section>;
}
