"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { Button, ButtonLink } from "@/components/ui/button";
import { ParameterReviewPanel } from "./parameter-review-panel";
import { readParameterReview, type ParameterReview } from "@/lib/ai/scenario-generation/parameter-review";
import { getSimulatorModule } from "@/modules/core/registry";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { AuthoringSessionDto } from "@/lib/ai/scenario-authoring/types";
import { AiAuthoringWizard } from "./ai-authoring-wizard";
import { authoringBtnBlueClass, authoringBtnGrayClass, authoringBtnOrangeClass } from "./ai-authoring-field";

export type AiScenarioJob = {
  id: string;
  moduleId: ScenarioParametersModuleId;
  name: string;
  status: string;
  phase: string;
  errorCode?: string | null;
  scenarioId?: string | null;
  scenarioRowId?: string | null;
  createdAt: string;
  updatedAt: string;
  parameterReview?: ParameterReview;
};

const phaseLabels: Record<string, string> = {
  queued: "Đang chờ xử lý", extracting: "Đang đọc tài liệu", generating: "Đang tạo kịch bản",
  validating: "Đang kiểm tra kịch bản", completed: "Hoàn tất · Chưa xuất bản", failed: "Tạo kịch bản thất bại",
};
const failureLabels: Record<string, string> = {
  INVALID_PARAMETERS: "Giá trị tham số không hợp lệ hoặc vượt phạm vi simulator. Kiểm tra trường và giá trị trong mẫu rồi tạo yêu cầu mới.",
  INVALID_PARAMETER_UNIT: "Đơn vị tham số không khớp simulator. Kiểm tra đơn vị theo mẫu của thiết bị rồi gửi lại.",
  UNGROUNDED_PARAMETER: "Chưa có nguồn xác nhận trường và giá trị tham số. Bổ sung đoạn tài liệu hoặc yêu cầu có ghi rõ trường, giá trị và đơn vị.",
  UNHANDLED_PARAMETER: "Một số tham số yêu cầu chưa được đáp ứng. Tách nhỏ yêu cầu hoặc dùng mẫu để ghi rõ từng trường cần thiết.",
  INVALID_RECOVERY: "Kế hoạch khôi phục chưa đạt kiểm tra trong simulator. Điều chỉnh giá trị ban đầu, giá trị khôi phục hoặc tiêu chí thành công rồi thử lại.",
  UNSUPPORTED_PARAMETERS: "Simulator chưa hỗ trợ các tham số hoặc tình huống được yêu cầu. Chọn trường được hỗ trợ trong mẫu hoặc tạo thủ công.",
  REQUEST_TOO_COMPLEX: "Yêu cầu có quá nhiều thiết lập tham số. Tách thành các kịch bản nhỏ hơn rồi gửi lại.",
  UNSUPPORTED_REQUEST: "Tình huống này chưa nằm trong các lỗi simulator hỗ trợ. Hãy chọn lỗi phù hợp hoặc tạo thủ công.",
  INVALID_DOCUMENT: "Tài liệu không có lớp văn bản hoặc vượt giới hạn. PDF scan cần OCR trước khi gửi lại.",
  DOCUMENT_TIMEOUT: "Tài liệu quá phức tạp. Hãy tách các trang liên quan rồi gửi lại.",
  DOCUMENT_RESOURCE_LIMIT: "Tài liệu vượt giới hạn xử lý an toàn. Hãy tách nhỏ hoặc chuyển sang văn bản.",
  INVALID_CITATION: "AI chưa dẫn đúng đoạn tài liệu. Hãy cung cấp trang hoặc đoạn liên quan rồi thử lại.",
  PROVIDER_RATE_LIMIT: "Dịch vụ AI đang giới hạn yêu cầu. Vui lòng thử lại sau.",
  PROVIDER_TIMEOUT: "AI quá thời gian xử lý. Hãy rút gọn mô tả hoặc tài liệu rồi thử lại.",
  PROVIDER_AUTH: "Kết nối AI cần quản trị viên kiểm tra cấu hình.",
  ACTOR_FORBIDDEN: "Tài khoản không còn quyền tạo kịch bản.",
};
const isTerminal = (job: AiScenarioJob) => ["completed", "failed"].includes(job.status) || ["completed", "failed"].includes(job.phase);
const phaseLabel = (job: AiScenarioJob) => phaseLabels[isTerminal(job) ? (job.status === "failed" || job.phase === "failed" ? "failed" : "completed") : job.phase] ?? "Đang xử lý";

export function readJob(value: unknown, moduleId: ScenarioParametersModuleId): AiScenarioJob | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (item.moduleId !== moduleId || typeof item.id !== "string" || typeof item.name !== "string" ||
    typeof item.status !== "string" || typeof item.phase !== "string" ||
    typeof item.createdAt !== "string" || typeof item.updatedAt !== "string") return null;
  const parameterReview = readParameterReview(item.parameterReview);
  return { id: item.id, moduleId, name: item.name, status: item.status, phase: item.phase,
    createdAt: item.createdAt, updatedAt: item.updatedAt,
    ...(parameterReview ? { parameterReview } : {}),
    errorCode: typeof item.errorCode === "string" ? item.errorCode : null,
    scenarioId: typeof item.scenarioId === "string" ? item.scenarioId : null,
    scenarioRowId: typeof item.scenarioRowId === "string" ? item.scenarioRowId : null };
}

function resultHref(job: AiScenarioJob) {
  if (job.moduleId === "ads-b") return job.scenarioId ? `/authoring/ads-b/edit?id=${encodeURIComponent(job.scenarioId)}` : null;
  const route = getSimulatorModule(job.moduleId)?.routes.simulator;
  return route && job.scenarioRowId ? `${route}?scenarioId=${encodeURIComponent(job.scenarioRowId)}` : null;
}

/** Old jobs remain readable; no legacy create operation is exposed in the wizard. */
function LegacyHistory({moduleId,onCompleted}:{moduleId:ScenarioParametersModuleId;onCompleted?:(job:AiScenarioJob)=>void|Promise<void>}){
 const[jobs,setJobs]=useState<AiScenarioJob[]>([]),[error,setError]=useState(false),[selected,setSelected]=useState<string|null>(null),[refresh,setRefresh]=useState(0),[paused,setPaused]=useState(false),[deletingId,setDeletingId]=useState<string|null>(null);
 const notified=useRef(new Set<string>()),callback=useRef(onCompleted);
 useEffect(()=>{callback.current=onCompleted;},[onCompleted]);
 useEffect(()=>{
  let cancelled=false,count=0;let timer:ReturnType<typeof setTimeout>|undefined;let controller:AbortController|undefined;
  async function poll(){controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),15000);
   try{const response=await fetch(`/api/ai/scenario-jobs?moduleId=${encodeURIComponent(moduleId)}`,{cache:"no-store",signal:controller.signal});if(!response.ok)throw Error();const data=await response.json();if(!Array.isArray(data.jobs))throw Error();let incoming=data.jobs.map((x:unknown)=>readJob(x,moduleId)).filter((x:AiScenarioJob|null):x is AiScenarioJob=>x!==null);
    if(selected){const detail=await fetch(`/api/ai/scenario-jobs/${encodeURIComponent(selected)}`,{cache:"no-store",signal:controller.signal});if(!detail.ok)throw Error();const found=readJob((await detail.json()).job,moduleId);if(!found)throw Error();incoming=[found,...incoming.filter((j:AiScenarioJob)=>j.id!==found.id)];}
    if(cancelled)return;setJobs(incoming);setError(false);
    for(const job of incoming)if(job.status==="completed"&&!notified.current.has(job.id)){notified.current.add(job.id);void Promise.resolve(callback.current?.(job)).catch(()=>setError(true));}
    if(!incoming.some((j:AiScenarioJob)=>!isTerminal(j)))return;
   }catch{if(cancelled)return;setError(true);}finally{clearTimeout(timeout);}
   if(++count>=200){setPaused(true);return;}timer=setTimeout(()=>void poll(),3000);
  }
  setPaused(false);void poll();return()=>{cancelled=true;clearTimeout(timer);controller?.abort();};
 },[moduleId,selected,refresh]);
 async function deleteJob(jobId:string){
  if(deletingId)return;setDeletingId(jobId);
  try{
   const response=await fetch(`/api/ai/scenario-jobs/${encodeURIComponent(jobId)}`,{method:"DELETE"});
   if(!response.ok&&response.status!==404)throw Error();
   setJobs(current=>current.filter(j=>j.id!==jobId));
   if(selected===jobId)setSelected(null);
  }catch{setError(true);}finally{setDeletingId(null);}
 }
 const active=jobs.find(j=>j.id===selected);
 return <details className="mt-3 rounded-xl border border-[var(--cns-border-subtle)] bg-[var(--cns-surface-card-subtle)] p-3"><summary className="cursor-pointer text-xs font-medium text-[var(--cns-text-secondary)]">Lịch sử yêu cầu AI trước đây</summary>{error?<p role="status" className="mt-2 text-xs">Chưa tải được lịch sử. Không có dữ liệu nào bị xóa. <button className="underline" onClick={()=>setRefresh(x=>x+1)}>Tải lại</button></p>:null}{paused?<Button size="sm" className={authoringBtnBlueClass} onClick={()=>setRefresh(x=>x+1)}>Tiếp tục cập nhật lịch sử</Button>:null}<ul className="mt-2.5 grid gap-1.5">{jobs.map(job=><li key={job.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{job.name}</span><span className="text-[var(--cns-text-secondary)]">{phaseLabel(job)}</span><div className="flex flex-wrap items-center gap-1.5">{job.status==="completed"&&resultHref(job)?<ButtonLink size="sm" className={authoringBtnOrangeClass} href={resultHref(job)!}>Mở kịch bản cũ để kiểm tra</ButtonLink>:null}<Button size="sm" className={authoringBtnGrayClass} onClick={()=>setSelected(job.id)} aria-label={`Xem tiến độ: ${job.name}`}>Xem tiến độ</Button><Button size="sm" className={authoringBtnGrayClass} disabled={deletingId===job.id} onClick={()=>void deleteJob(job.id)} aria-label={`Xóa yêu cầu: ${job.name}`}>Xóa</Button></div></li>)}</ul>{active?<section className="mt-3" aria-label="Chi tiết yêu cầu trước đây"><p role="status" className="text-xs font-medium">{phaseLabel(active)}</p>{active.status==="failed"?<p role="alert" className="mt-1 text-xs text-[#ea580c]">{failureLabels[active.errorCode??""]??"Yêu cầu cũ chưa hoàn tất. Bạn có thể tạo bản nháp mới bằng trình hướng dẫn."}</p>:null}{active.status==="completed"&&active.parameterReview?<ParameterReviewPanel review={active.parameterReview}/>:null}</section>:null}</details>;
}

export function AiScenarioDialog({moduleId,onCompleted,actions}:{moduleId:ScenarioParametersModuleId;onCompleted?:(job:AiScenarioJob)=>void|Promise<void>;actions?:ReactNode}){
 const[open,setOpen]=useState(false),[closing,setClosing]=useState(false);const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),closeHandler=useRef<(()=>Promise<boolean>)|null>(null);const titleId=useId(),descriptionId=useId();
 useEffect(()=>{if(!open)return;const node=dialog.current!,previous=trigger.current;node.showModal();return()=>{if(node.open)node.close();previous?.focus();};},[open]);
 async function close(){if(closing)return;setClosing(true);try{if(!closeHandler.current||await closeHandler.current())setOpen(false);}finally{setClosing(false);}}
 async function completed(session:AuthoringSessionDto){const name=session.form.fields.find(f=>f.id==="name")?.value;await onCompleted?.({id:session.id,moduleId,name:typeof name==="string"?name:"Kịch bản mới",status:"completed",phase:"completed",scenarioId:session.scenarioId,scenarioRowId:session.scenarioRowId,createdAt:session.createdAt,updatedAt:session.updatedAt});}
 return <section aria-label="Tạo kịch bản AI" className="mt-5"><div className="flex flex-wrap items-center gap-2"><Button ref={trigger} variant="primary" size="md" onClick={()=>setOpen(true)}><Sparkle aria-hidden size={15}/><span>Tạo kịch bản bằng AI</span></Button>{actions}</div>{open?<dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event=>{if(event.target!==event.currentTarget||dialog.current?.dataset.filePickerActive==="true"){event.preventDefault();return;}event.preventDefault();void close();}} onClose={event=>{if(event.target===event.currentTarget)setOpen(false);}} className="m-auto max-h-[calc(100dvh-1.5rem)] w-[min(92rem,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-[var(--cns-border-subtle)] bg-[var(--cns-surface-card)] p-0 text-[var(--cns-text-primary)] shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"><div className="p-4 sm:p-5"><header className="mb-3 flex items-start justify-between gap-3 border-b border-[var(--cns-border-subtle)] pb-3"><div><h2 id={titleId} className="text-lg font-semibold">Tạo kịch bản bằng AI</h2><p id={descriptionId} className="mt-0.5 text-xs text-[var(--cns-text-secondary)]">Tải tài liệu, kiểm tra thông số đã điền và xác nhận từng bước. Chỉ hoàn tất mới tạo kịch bản.</p></div><Button size="sm" className={authoringBtnGrayClass} disabled={closing} onClick={()=>void close()} aria-label="Đóng">Đóng</Button></header><AiAuthoringWizard key={moduleId} moduleId={moduleId} onCompleted={completed} registerClose={handler=>{closeHandler.current=handler;}}/><LegacyHistory moduleId={moduleId} onCompleted={onCompleted}/></div></dialog>:null}</section>;
}
