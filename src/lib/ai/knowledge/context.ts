import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { EvidenceDocument } from "../scenario-generation/types";
import { validateEvidenceDocuments } from "../scenario-generation/validation";
import { authoringAdapterFor } from "../scenario-authoring/forms/registry";
import type { AnalysisRequest, AuthoringState } from "../scenario-authoring/types";

type Retrieve = (moduleId: ScenarioParametersModuleId, query: string) => Promise<{documents: EvidenceDocument[]; notice: string; available: boolean}>;
/** Private references only support guidance. Uploaded baseline evidence remains a separate boundary. */
export async function authoringKnowledgeContext(state: AuthoringState, request: AnalysisRequest, uploaded: EvidenceDocument[], retrieve?: Retrieve): Promise<{documents: EvidenceDocument[]; notice: string | null}> {
 validateEvidenceDocuments(uploaded);
 if(request.kind!=="guidance")return {documents:uploaded,notice:null};
 const form=authoringAdapterFor(state.moduleId).form(state.definition);
 const section=form.sections.find(s=>s.id===request.sectionId);
 const metadata=form.fields.filter(f=>f.sectionId==="metadata").map(f=>`${f.schema.label}: ${typeof f.value==="string"?f.value.slice(0,2000):String(f.value)}`).join("\n");
 const query=[state.moduleId,request.question.slice(0,4000),state.context.slice(0,1000),metadata,section?.title??""].join("\n").slice(0,8000);
 try {
  const reader=retrieve??(await import("./retrieve")).retrieveDeviceKnowledge;
  const result=await reader(state.moduleId,query);
  validateEvidenceDocuments(result.documents);
  const seen=new Set(uploaded.map(d=>d.id));
  const available=result.documents.filter(d=>!seen.has(d.id));
  const capacity=Math.max(0,5-uploaded.length), selected=available.slice(0,capacity);
  const notice=[result.notice, selected.length<available.length?`Giới hạn 5 tài liệu: giữ nguyên tài liệu đã tải lên, bỏ ${available.length-selected.length} nguồn tham chiếu khỏi lượt này.`:"", "Kho manual chỉ là nguồn tham khảo; không tự thay mặc định hoặc điểm thi, không chứng nhận quy trình thiết bị thật."].filter(Boolean).join("\n").slice(0,1800);
  return {documents:[...uploaded,...selected],notice};
 } catch {
  // Fail closed for knowledge, not for the author's saved work. No paths or raw parser errors leave the worker.
  return {documents:uploaded,notice:"Kho manual chưa sẵn sàng hoặc không qua kiểm tra toàn vẹn; lượt này không dùng nguồn từ kho. Giữ bản nháp và chỉ dùng tài liệu đã tải lên/ngữ cảnh simulator, không coi gợi ý là dữ kiện nhà sản xuất."};
 }
}
