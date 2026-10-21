"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthoringSessionDto, JsonValue } from "@/lib/ai/scenario-authoring/types";
import {
  authoringBtnGrayClass,
  authoringBtnOrangeClass,
  authoringCardClass,
  sourceLabel,
  valueLabel,
} from "./ai-authoring-field";

export function AiAuthoringAssistant({ session, dirty, disabled, onApply, onDismiss }: {
  session: AuthoringSessionDto; dirty: Record<string, JsonValue>; disabled: boolean; onApply: (ids: string[]) => void; onDismiss: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(session.proposal?.prefilledFieldIds ?? []);
  const proposal = session.proposal;
  if (!proposal) return session.lastExplanation ? <aside aria-label="Giải thích từ AI" className={`${authoringCardClass} grid gap-2.5 border-[#0284c7]/30`}>
    <h4 className="text-sm font-semibold text-[#0369a1]">Giải thích từ AI</h4>
    <p className="whitespace-pre-wrap text-xs leading-relaxed">{session.lastExplanation}</p>
    <p className="text-[11px] text-[var(--cns-text-secondary)]">Chỉ giải thích, không thay đổi bản nháp. Bạn có thể hỏi tiếp hoặc tiếp tục xác nhận.</p>
  </aside> : null;
  return <aside aria-label="Đề xuất AI cần duyệt" className={`${authoringCardClass} grid gap-2.5 border-[#0284c7]/30`}>
    <h4 className="text-sm font-semibold text-[#0369a1]">Đề xuất AI · Chờ xác nhận</h4><p className="text-xs leading-relaxed">{proposal.message}</p>
    <p className="text-[11px] text-[var(--cns-text-secondary)]">Đã đọc {proposal.coverage.charactersRead}/{proposal.coverage.charactersAvailable} ký tự từ {proposal.coverage.documents} tài liệu.{proposal.coverage.truncated ? " Chỉ xử lý một phần tài liệu, không phải toàn bộ manual." : ""}</p>
    {proposal.changes.map((change) => { const field = session.form.fields.find((item) => item.id === change.fieldId); if (!field) return null;
      return <div key={change.fieldId} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5 rounded-lg border border-[var(--cns-border-subtle)] bg-[var(--cns-surface-card-subtle)] p-2.5 text-xs"><label className="flex items-start gap-2 font-medium"><input type="checkbox" disabled={disabled || field.schema.readOnly} aria-label={`Áp dụng ${field.schema.label}`} checked={selected.includes(change.fieldId)} onChange={(event) => setSelected(event.currentTarget.checked ? [...selected, change.fieldId] : selected.filter((id) => id !== change.fieldId))} />Áp dụng {field.schema.label}</label>
        <p className="break-words">Trước: {valueLabel(Object.hasOwn(dirty, field.id) ? dirty[field.id] : field.value, field.schema)}</p><p className="break-words font-medium text-[#0369a1]">Đề xuất: {valueLabel(change.value, field.schema)}</p><p className="text-[11px]">{change.reason}</p><p className="text-[11px] text-[var(--cns-text-secondary)]">{sourceLabel(change.source)}</p>{change.source.quote ? <blockquote className="break-words border-l-2 border-[#0284c7] pl-2 text-[11px]">{change.source.quote.slice(0, 600)}</blockquote> : null}</div>;
    })}
    {proposal.issues.map((issue, index) => <p key={index} className="text-xs text-[#ea580c]">{issue.message}</p>)}
    <p className="text-[11px] text-[var(--cns-text-secondary)]">{proposal.prefilledFieldIds?.length ? "Các giá trị nền đã được điền để xem trước, chưa tạo kịch bản. Bỏ chọn sẽ trả trường đó về mặc định simulator. " : ""}Chỉ các mục được chọn mới thay bản chỉnh của bạn. Không tự tạo kịch bản hoặc mở quyền cho học viên.</p>
    <div className="flex flex-wrap gap-1.5"><Button size="sm" className={authoringBtnOrangeClass} disabled={disabled || !selected.length} onClick={() => onApply(selected)}>Áp dụng đề xuất đã chọn</Button><Button size="sm" className={authoringBtnGrayClass} disabled={disabled} onClick={onDismiss}>Bỏ qua đề xuất</Button></div>
  </aside>;
}
