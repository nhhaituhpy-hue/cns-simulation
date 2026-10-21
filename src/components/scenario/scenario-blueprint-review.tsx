"use client";
import { useId } from "react";
import type { ScenarioBlueprint } from "@/lib/ai/scenario-blueprint/types";
import { Button } from "@/components/ui/button";
import { authoringBtnOrangeClass, authoringCardClass } from "./ai-authoring-field";

/** Review-only DTO. Never render or request the secret-bearing native definition. */
export function ScenarioBlueprintReview({ blueprint, onSave, disabled }: {
  blueprint: Omit<ScenarioBlueprint, "definition">;
  onSave: () => void;
  disabled: boolean;
}) {
  const prefix = useId();
  const parts = [
    ["situation", "Tình huống & triệu chứng"], ["cause", "Nguyên nhân & giả định"],
    ["recovery", "Quy trình xử lý"], ["criteria", "Điều kiện đạt"], ["parameters", "Thông số liên quan"],
  ];
  const citations = [...new Map([...blueprint.citations, ...blueprint.rubric.citations].map(citation => [citation.id, citation])).values()];
  const anchor = (id: string) => `${prefix}-${id}`;
  const references = (ids: string[]) => <div className="flex flex-wrap gap-2 text-xs">{ids.map(id => {
    const citation = citations.find(item => item.id === id);
    return citation ? <a key={id} className="break-words text-[#0369a1] underline" href={`#${anchor(`citation-${id}`)}`}>{citation.documentName} · {citation.segmentLabel}</a> : null;
  })}</div>;
  return <section aria-label="Xem thử bài tập" data-testid="blueprint-review-columns" className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
    <nav aria-label="Các phần bài tập" className={`${authoringCardClass} grid gap-2 lg:sticky lg:top-2`}>
      <h4 className="text-xs font-semibold uppercase text-[#0369a1]">Các phần bài tập</h4>
      {parts.map(([id, label]) => <a key={id} className="rounded-lg border border-[#cbd5e1] bg-[#f8fafc] px-3 py-2 text-xs text-[#334155] hover:bg-[#e2e8f0]" href={`#${anchor(id)}`}>{label}</a>)}
    </nav>
    <section aria-label="Bản xem thử kịch bản" className="grid min-w-0 gap-3 text-sm">
      <header className={authoringCardClass}><h3 className="text-base font-semibold">{blueprint.title}</h3><p className="mt-1 text-xs text-[#0369a1]">Bản nháp · Chưa xuất bản</p></header>
      <section id={anchor("situation")} className={`${authoringCardClass} scroll-mt-4`}><h4 className="font-semibold">Tình huống & triệu chứng</h4><p className="mt-2 whitespace-pre-wrap">{blueprint.situation}</p><ul className="mt-2 list-disc space-y-1 pl-5">{blueprint.symptoms.map((symptom, index) => <li key={index}>{symptom}</li>)}</ul></section>
      <section id={anchor("cause")} className={`${authoringCardClass} scroll-mt-4`}><h4 className="font-semibold">Nguyên nhân & giả định</h4><p className="mt-2 whitespace-pre-wrap">{blueprint.cause}</p><h5 className="mt-3 text-xs font-semibold">Giả định mô phỏng — không phải dữ kiện hãng</h5><ul className="mt-1 list-disc space-y-1 pl-5 text-xs">{blueprint.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
      <section id={anchor("recovery")} className={`${authoringCardClass} scroll-mt-4`}>
        <h4 className="font-semibold">Quy trình xử lý</h4>
        <ol className="mt-3 grid gap-3">{blueprint.rubric.steps.map((step, index) => <li key={step.id} className="rounded-lg border border-[var(--cns-border-subtle)] bg-[var(--cns-surface-card-subtle)] p-3">
          <p className="font-medium">{index + 1}. {step.label}</p><p className="my-1 text-xs text-[#0369a1]">{step.required ? "Bắt buộc" : "Kiểm tra phụ · Không bắt buộc"}</p>
          {step.prerequisites.length ? <p className="mb-2 text-xs">Sau: {step.prerequisites.map(id => blueprint.rubric.steps.find(item => item.id === id)?.label ?? id).join("; ")}</p> : null}
          {references(step.citationIds)}
          {step.alternatives.length ? <details className="mt-2 text-xs"><summary className="cursor-pointer">Bằng chứng thao tác được đối chiếu</summary><ul className="mt-2 grid gap-1">{step.alternatives.map((group, option) => <li key={option}>Cách {option + 1}: {group.map(matcher => matcher.kind === "parameter" ? `${blueprint.rubric.parameterRelevance.find(item => item.fieldId === matcher.fieldId)?.label ?? matcher.fieldId} = ${String(matcher.value)}` : matcher.kind === "view" ? `Xem ${matcher.viewId}` : matcher.kind === "action" ? `Thao tác ${matcher.controlId}` : matcher.kind === "terminal" ? `${matcher.menuId}: ${matcher.input}` : matcher.kind === "hardware" ? `Phần cứng ${matcher.occurrenceKey}` : `Kiểm tra ${matcher.checkId}`).join("; ")}</li>)}</ul></details> : null}
        </li>)}</ol>
      </section>
      <section id={anchor("criteria")} className={`${authoringCardClass} scroll-mt-4`}>
        <h4 className="font-semibold">Điều kiện đạt & kiểm chứng simulator</h4>
        <p className="mt-2 font-medium text-[#0369a1]">{blueprint.verification.recoveryVerified ? blueprint.moduleId === "ads-b" ? "Đã kiểm chứng chuỗi thao tác và cấu hình; chưa chứng minh khôi phục vật lý hoặc GPS." : blueprint.verification.mode === "native-diagnosis" ? "Đã kiểm chứng kết luận chẩn đoán; chưa mô phỏng thay thế phần cứng." : "Đã kiểm chứng khôi phục bằng simulator" : "Chưa kiểm chứng khôi phục — chỉ có kiểm tra được liệt kê dưới đây."}</p>
        <h5 className="mt-3 text-xs font-semibold">Trạng thái ban đầu</h5><ul className="mt-1 space-y-1 text-xs">{blueprint.verification.initial.map(check => <li key={check.id}>{check.passed ? "Đạt" : "Chưa đạt"}: {check.detail}</li>)}</ul>
        <h5 className="mt-3 text-xs font-semibold">Sau xử lý</h5><ul className="mt-1 space-y-1 text-xs">{blueprint.verification.recovered.map(check => <li key={check.id}>{check.passed ? "Đạt" : "Chưa đạt"}: {check.detail}</li>)}</ul>
        <ul className="mt-2 space-y-1 text-xs text-[var(--cns-text-secondary)]">{blueprint.verification.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
        <p className="mt-2 text-xs text-[var(--cns-text-secondary)]">Kiểm chứng bài mẫu không phải bằng chứng học viên đã thực hiện đủ các bước.</p>
      </section>
      <details id={anchor("parameters")} className={`${authoringCardClass} scroll-mt-4`}><summary className="cursor-pointer font-semibold">Thông số liên quan</summary><dl className="mt-3 grid gap-3">{blueprint.rubric.parameterRelevance.map(item => <div key={item.fieldId}><dt className="font-medium">{item.label}</dt><dd className="text-xs">Ban đầu: {String(item.initialValue)}{item.targetValue !== undefined ? ` → Mục tiêu: ${String(item.targetValue)}` : ""}{item.tolerance !== undefined ? ` · Dung sai: ${item.tolerance}` : ""}</dd><dd className="mt-1 text-xs">{item.reason}</dd><dd className="mt-1">{references(item.citationIds)}</dd></div>)}</dl></details>
      <footer className={`${authoringCardClass} flex flex-wrap items-center justify-between gap-3`}><p className="max-w-prose text-xs text-[var(--cns-text-secondary)]">Lưu nguồn kịch bản và tiêu chí đã xem. Chưa đưa vào Ôn tập hoặc Kỳ thi; công bố là thao tác riêng.</p><Button size="sm" className={authoringBtnOrangeClass} disabled={disabled || !blueprint.verification.recoveryVerified} onClick={onSave}>Lưu kịch bản</Button></footer>
    </section>
    <aside aria-label="Nguồn và gợi ý" className="grid min-w-0 gap-3 text-xs lg:sticky lg:top-2">
      <div className={authoringCardClass}><h4 className="font-semibold text-[#0369a1]">Nguồn và gợi ý</h4><p className="mt-2">Đối chiếu trích đoạn với mục tiêu bài. Muốn thay thông số native, mở Chỉnh sửa nâng cao; sau đó cần AI soạn lại để kiểm chứng tiêu chí.</p></div>
      {citations.map(citation => <section key={citation.id} id={anchor(`citation-${citation.id}`)} className={`${authoringCardClass} scroll-mt-4`}><h5 className="font-semibold">{citation.documentName}</h5><p className="mt-1">{citation.segmentLabel} · {citation.sourceKind === "uploaded" ? "Tài liệu đã tải" : "Tài liệu tham chiếu"}</p><blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-[#0284c7] pl-2">{citation.quote}</blockquote><details className="mt-2"><summary className="cursor-pointer">Dấu vết nguồn SHA-256</summary><p className="mt-1 break-all font-mono text-[10px]">{citation.sha256}</p></details></section>)}
      {!citations.length ? <p className={authoringCardClass}>Chưa có trích dẫn được xác minh.</p> : null}
    </aside>
  </section>;
}
