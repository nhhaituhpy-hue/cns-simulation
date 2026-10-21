"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthoringSessionDto, JsonValue } from "@/lib/ai/scenario-authoring/types";
import { authoringCardClass, valueLabel, sourceLabel } from "./ai-authoring-field";
export function AiAuthoringAssistant({ session, dirty, disabled, onApply, onDismiss }: {
  session: AuthoringSessionDto; dirty: Record<string, JsonValue>; disabled: boolean; onApply: (ids: string[]) => void; onDismiss: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(session.proposal?.prefilledFieldIds ?? []);
  const proposal = session.proposal;
  if (!proposal) return null;
  return <aside aria-label="Đề xuất AI cần duyệt" className={`${authoringCardClass} grid gap-3`}>
    <h4 className="font-semibold">Đề xuất AI · Chờ xác nhận</h4><p className="text-sm">{proposal.message}</p>
    <p className="text-xs text-[var(--cns-text-secondary)]">Đã đọc {proposal.coverage.charactersRead}/{proposal.coverage.charactersAvailable} ký tự từ {proposal.coverage.documents} tài liệu.{proposal.coverage.truncated ? " Chỉ xử lý một phần tài liệu, không phải toàn bộ manual." : ""}</p>
    {proposal.changes.map((change) => { const field = session.form.fields.find((item) => item.id === change.fieldId); if (!field) return null;
      return <div key={change.fieldId} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-lg border border-[var(--cns-border-subtle)] p-3 text-sm"><label className="flex items-start gap-2"><input type="checkbox" disabled={disabled || field.schema.readOnly} aria-label={`Áp dụng ${field.schema.label}`} checked={selected.includes(change.fieldId)} onChange={(event) => setSelected(event.currentTarget.checked ? [...selected, change.fieldId] : selected.filter((id) => id !== change.fieldId))} />Áp dụng {field.schema.label}</label>
        <p className="break-words">Trước: {valueLabel(Object.hasOwn(dirty, field.id) ? dirty[field.id] : field.value, field.schema)}</p><p className="break-words">Đề xuất: {valueLabel(change.value, field.schema)}</p><p className="text-xs">{change.reason}</p><p className="text-xs text-[var(--cns-text-secondary)]">{sourceLabel(change.source)}</p>{change.source.quote ? <blockquote className="break-words border-l-2 pl-2 text-xs">{change.source.quote.slice(0, 600)}</blockquote> : null}</div>;
    })}
    {proposal.issues.map((issue, index) => <p key={index} className="text-sm">{issue.message}</p>)}
    <p className="text-xs">{proposal.prefilledFieldIds?.length ? "Các giá trị nền đã được điền để xem trước, chưa tạo kịch bản. Bỏ chọn sẽ trả trường đó về mặc định simulator. " : ""}Chỉ các mục được chọn mới thay bản chỉnh của bạn. Không tự tạo kịch bản hoặc mở quyền cho học viên.</p>
    <div className="flex flex-wrap gap-2"><Button className="h-auto min-h-9 whitespace-normal py-2" disabled={disabled || !selected.length} onClick={() => onApply(selected)}>Áp dụng đề xuất đã chọn</Button><Button disabled={disabled} onClick={onDismiss}>Bỏ qua đề xuất</Button></div>
  </aside>;
}
