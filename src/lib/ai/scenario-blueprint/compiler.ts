import { createTemplateDefinition } from "../scenario-generation/capabilities";
import { parameterAdapterFor } from "../scenario-generation/parameters";
import type { EvidenceDocument } from "../scenario-generation/types";
import type { ParameterAssignment } from "../scenario-generation/parameter-types";
import type { BlueprintGenerationInput, ManualCitation, ScenarioBlueprint } from "./types";
import { fail, exact, plain, safeJson, publicText, safeBlueprintDocuments, validateBlueprintInput } from "./validation";
import { compileRubric, stableId } from "./rubric";

export interface CitedAssignment extends ParameterAssignment { citationIndexes: number[] }
export interface BlueprintProposal {
  status: "supported";
  moduleId: BlueprintGenerationInput["moduleId"];
  templateId: string;
  title: string;
  situation: string;
  cause: string;
  citations: Array<{ documentId: string; segmentLabel: string; quote: string }>;
  initial: CitedAssignment[];
  recovery: CitedAssignment[];
  diagnosisCitationIndexes: number[];
}

function validateProposal(input: BlueprintGenerationInput, value: unknown): BlueprintProposal {
  safeJson(value);
  if (plain(value) && value.status === "clarification") fail("CLARIFICATION_REQUIRED", "Cần làm rõ sự cố hoặc mục tiêu: tài liệu/mô tả chưa đủ hoặc còn mâu thuẫn.");
  if (plain(value) && value.status === "unsupported") fail("UNSUPPORTED_REQUEST", "Tình huống vượt khả năng mô phỏng hoặc không có scaffold phù hợp.");
  exact(value, ["status", "moduleId", "templateId", "title", "situation", "cause", "citations", "initial", "recovery", "diagnosisCitationIndexes"]);
  if (value.status !== "supported" || value.moduleId !== input.moduleId || !publicText(value.templateId, 150)
    || !publicText(value.title, 200) || !publicText(value.situation) || !publicText(value.cause)
    || !Array.isArray(value.citations) || !value.citations.length || value.citations.length > 16) fail();
  const count = value.citations.length;
  const indices = (v: unknown) => Array.isArray(v) && v.length > 0 && v.length <= count && new Set(v).size === v.length && v.every(i => Number.isInteger(i) && i >= 0 && i < count);
  if (!indices(value.diagnosisCitationIndexes)) fail("INVALID_CITATION");
  for (const entries of [value.initial, value.recovery]) {
    if (!Array.isArray(entries) || !entries.length || entries.length > 24) fail("INVALID_RECOVERY");
    const seen = new Set<string>();
    for (const change of entries) {
      exact(change, ["fieldId", "value", "citationIndexes"]);
      if (!publicText(change.fieldId, 200) || seen.has(change.fieldId) || !indices(change.citationIndexes)) fail();
      seen.add(change.fieldId);
    }
  }
  for (const citation of value.citations) {
    exact(citation, ["documentId", "segmentLabel", "quote"]);
    if (!publicText(citation.documentId, 240) || !publicText(citation.segmentLabel, 100) || !publicText(citation.quote, 1500) || citation.quote.trim().length < 5) fail("INVALID_CITATION");
  }
  return value as unknown as BlueprintProposal;
}

/** Compile known native controls only. No model-supplied definition or executable instructions. */
export function compileScenarioBlueprint(input: BlueprintGenerationInput, documents: EvidenceDocument[], output: unknown): ScenarioBlueprint {
  validateBlueprintInput(input);
  const proposal = validateProposal(input, output);
  const safeDocuments = safeBlueprintDocuments(documents, input.moduleId);
  const citations: ManualCitation[] = proposal.citations.map(citation => {
    const document = safeDocuments.find(doc => doc.id === citation.documentId);
    if (!document?.segments.some(segment => segment.label === citation.segmentLabel && segment.text.includes(citation.quote))) fail("INVALID_CITATION");
    if(document.id.startsWith("kb:")&&!document.id.startsWith(`kb:${input.moduleId}:`))fail("INVALID_CITATION","Nguồn tham chiếu không thuộc thiết bị đang soạn.");
    return { ...citation, id: stableId("citation", [document.sha256, citation.segmentLabel, citation.quote]), documentName: document.name, sha256: document.sha256,
      sourceKind: document.id.startsWith("kb:") ? "reference-only" : "uploaded" };
  });
  const adapter = parameterAdapterFor(input.moduleId);
  const scaffold = createTemplateDefinition(input.moduleId, proposal.templateId);
  const initialFields = adapter.fields(input.moduleId, scaffold);
  const permitted = (entries: CitedAssignment[]) => entries.every(change => {
    const field = initialFields.find(f => f.id === change.fieldId);
    return field?.recovery && field.group !== "success" && (field.type !== "number" || (Number.isFinite(field.min) && Number.isFinite(field.max)));
  });
  if (!permitted(proposal.initial) || !permitted(proposal.recovery)) fail("UNSUPPORTED_REQUEST", "Trường không có recovery native hoặc giới hạn số hữu hạn.");
  if (!proposal.initial.some(change => !Object.is(initialFields.find(f => f.id === change.fieldId)!.value, change.value))) fail("INVALID_RECOVERY", "Không tạo bài chỉ bằng cách đổi tên preset.");
  const assignments = (entries: CitedAssignment[]) => entries.map(({ fieldId, value }) => ({ fieldId, value }));
  const definition = adapter.apply(input.moduleId, scaffold, assignments(proposal.initial));
  const configuredFields=adapter.fields(input.moduleId,definition);
  if(!proposal.recovery.some(change=>/^(configuration\.|targetSensor\.)/.test(change.fieldId)&&!Object.is(configuredFields.find(f=>f.id===change.fieldId)?.value,change.value)))fail("INVALID_RECOVERY","Recovery must change a physical configuration target, not only release bypass.");
  const verification = adapter.verify(input.moduleId, definition, assignments(proposal.recovery));
  definition.id = stableId("blueprint", [input, proposal]);
  definition.name = proposal.title;
  definition.description = proposal.situation;
  const fields = adapter.fields(input.moduleId, definition);
  const rubric = compileRubric(input.moduleId, definition, proposal, fields, citations);
  return { version: 1, moduleId: input.moduleId, title: proposal.title, situation: proposal.situation,
    cause: `Giả thuyết mô phỏng: ${proposal.cause}`,
    symptoms: verification.initial.map(check => `${check.id}: ${check.detail}`),
    assumptions: ["Bài tập mô phỏng trên scaffold native; trích dẫn là tài liệu tham khảo, không xác nhận số liệu mô phỏng là thông số hãng.",
      ...(input.moduleId === "ads-b" ? ["ADS-B chỉ kiểm chứng cấu hình và chuỗi terminal; không chứng minh sửa chữa vật lý, GPS đồng bộ hay trạng thái vận hành normal."] : []),
      ...proposal.initial.map(change => `Giả định khởi đầu: ${change.fieldId} = ${String(change.value)}.`),
      ...proposal.recovery.map(change => `Đích mô phỏng: ${change.fieldId} = ${String(change.value)}.`)],
    definition, rubric, verification, citations };
}
