"use client";

import { FloppyDisk } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { useState } from "react";
import type {
  VorEditableValue,
  VorIndicatorColor,
  VorParameterStatus,
} from "@/lib/vor-types";
import type { VorScenarioInput } from "@/stores/vor-scenario-store";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import {
  getSidebarInteractionTargets,
  isInteractiveSidebarField,
} from "@/lib/vor-sidebar-fields";

export interface VorSelectedField {
  fieldId: string;
  label: string;
  value: VorEditableValue;
  status?: VorIndicatorColor | VorParameterStatus;
}

interface VorAuthorPanelProps {
  draft: VorScenarioInput;
  selectedField: VorSelectedField | null;
  saving: boolean;
  error: string | null;
  onDraftChange: (changes: Partial<VorScenarioInput>) => void;
  onApplyField: (value: VorEditableValue, status?: VorIndicatorColor | VorParameterStatus) => void;
  onRemoveField: () => void;
  onSave: () => void;
  onOpenHardware: () => void;
}

const statusOptions = ["green", "yellow", "red", "gray", "normal", "warning", "alarm"] as const;
const logTimeTagPattern = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;

function getLogStateOptions(fieldId: string): readonly string[] | null {
  if (/^alarmLogs\.\d+\.state$/.test(fieldId)) return ["Normal", "Alarm"];
  if (/^maintenanceLogs\.\d+\.state$/.test(fieldId)) return ["Normal", "Alert"];
  return null;
}

function getLogStateStatus(fieldId: string, value: string): VorParameterStatus {
  if (value === "Normal") return "normal";
  return fieldId.startsWith("maintenanceLogs.") ? "warning" : "alarm";
}

export function VorAuthorPanel({
  draft,
  selectedField,
  saving,
  error,
  onDraftChange,
  onApplyField,
  onRemoveField,
  onSave,
  onOpenHardware,
}: VorAuthorPanelProps) {
  const activeMenuPath = useVorPmdtStore((state) => state.activeMenuPath);
  const checkpoints = useVorPmdtStore((state) => state.expectedCheckpoints);
  const overrides = useVorPmdtStore((state) => state.overrides);
  const addCheckpoint = useVorPmdtStore((state) => state.addCurrentViewAsCheckpoint);
  const removeCheckpoint = useVorPmdtStore((state) => state.removeCheckpoint);
  const [fieldValue, setFieldValue] = useState(
    selectedField?.value === null ? "" : String(selectedField?.value ?? ""),
  );
  const [fieldChecked, setFieldChecked] = useState(selectedField?.value === true);
  const [fieldStatus, setFieldStatus] = useState(selectedField?.status ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const interactionTargets = getSidebarInteractionTargets(overrides);
  const logStateOptions = selectedField ? getLogStateOptions(selectedField.fieldId) : null;
  const isLogTimeTag = selectedField ? /^(alarmLogs|maintenanceLogs)\.\d+\.timeTag$/.test(selectedField.fieldId) : false;

  function applyField() {
    if (!selectedField) return;
    if (isLogTimeTag && !logTimeTagPattern.test(fieldValue.trim())) {
      setFieldError("Time Tag phải có định dạng DD/MM/YYYY HH:mm:ss.");
      return;
    }
    let value: VorEditableValue = fieldValue;
    if (typeof selectedField.value === "boolean") value = fieldChecked;
    if (typeof selectedField.value === "number") {
      const parsed = Number(fieldValue);
      if (!Number.isFinite(parsed)) return;
      value = parsed;
    }
    setFieldError(null);
    const status = logStateOptions
      ? getLogStateStatus(selectedField.fieldId, String(value))
      : fieldStatus
        ? (fieldStatus as VorIndicatorColor | VorParameterStatus)
        : undefined;
    onApplyField(value, status);
  }

  return (
    <div className="grid gap-4 p-4 text-xs text-[#cbd5e1]">
      <div className="flex items-center justify-between gap-3 border-b border-[#334155] pb-3">
        <div><h2 className="font-semibold text-white">Xây dựng kịch bản</h2><p className="mt-1 text-[10px] text-[#94a3b8]">Chỉnh trực tiếp trên PMDT</p></div>
        <button type="button" onClick={onSave} disabled={saving} className="inline-flex h-8 items-center gap-1.5 bg-[#1e40af] px-3 font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"><FloppyDisk aria-hidden size={14} />{saving ? "Đang lưu" : "Lưu"}</button>
      </div>

      <section className="grid gap-2" aria-labelledby="vor-metadata-title">
        <h3 id="vor-metadata-title" className="font-semibold text-[#e2e8f0]">Thông tin bài thực hành</h3>
        <label className="grid gap-1 text-[10px] text-[#94a3b8]">Tiêu đề<input value={draft.title} onChange={(event) => onDraftChange({ title: event.target.value })} className="h-8 border border-[#475569] bg-[#0f172a] px-2 text-xs text-white outline-none focus:border-[#60a5fa]" /></label>
        <label className="grid gap-1 text-[10px] text-[#94a3b8]">Mô tả<textarea value={draft.description} onChange={(event) => onDraftChange({ description: event.target.value })} rows={2} className="resize-y border border-[#475569] bg-[#0f172a] p-2 text-xs text-white outline-none focus:border-[#60a5fa]" /></label>
        <label className="grid gap-1 text-[10px] text-[#94a3b8]">Đề bài<textarea value={draft.prompt} onChange={(event) => onDraftChange({ prompt: event.target.value })} rows={3} className="resize-y border border-[#475569] bg-[#0f172a] p-2 text-xs text-white outline-none focus:border-[#60a5fa]" /></label>
        <label className="grid gap-1 text-[10px] text-[#94a3b8]">Độ khó<select value={draft.difficulty} onChange={(event) => onDraftChange({ difficulty: event.target.value as VorScenarioInput["difficulty"] })} className="h-8 border border-[#475569] bg-[#0f172a] px-2 text-xs text-white"><option value="easy">Cơ bản</option><option value="medium">Trung bình</option><option value="hard">Nâng cao</option></select></label>
      </section>

      <section className="border-t border-[#334155] pt-3" aria-labelledby="vor-field-title">
        <h3 id="vor-field-title" className="font-semibold text-[#e2e8f0]">Giá trị / màu sự cố</h3>
        {selectedField ? (
          <div className="mt-2 grid gap-2">
            <p className="break-all font-mono text-[10px] text-[#60a5fa]">{selectedField.fieldId}</p>
            <p className="line-clamp-2 text-[10px] text-[#94a3b8]">{selectedField.label}</p>
            {isInteractiveSidebarField(selectedField.fieldId) ? (
              <p className="border border-[#745f17] bg-[#3a2f0f] p-2 text-[10px] leading-4 text-[#fef08a]">
                Đây là trạng thái đích học viên phải thao tác. Trong bài làm, ô bắt đầu màu xám và chỉ đổi sang màu đã chọn sau khi học viên nhấn.
              </p>
            ) : null}
            {logStateOptions ? (
              <label className="grid gap-1 text-[10px] text-[#94a3b8]">Giá trị State<select value={fieldValue} onChange={(event) => setFieldValue(event.target.value)} className="h-8 border border-[#475569] bg-[#0f172a] px-2 text-xs text-white">{logStateOptions.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
            ) : typeof selectedField.value === "boolean" ? (
              <label className="flex items-center gap-2"><input type="checkbox" checked={fieldChecked} onChange={(event) => setFieldChecked(event.target.checked)} />Bật trạng thái</label>
            ) : (
              <label className="grid gap-1 text-[10px] text-[#94a3b8]">{isLogTimeTag ? "Time Tag (DD/MM/YYYY HH:mm:ss)" : "Giá trị"}<input type={typeof selectedField.value === "number" ? "number" : "text"} step="any" value={fieldValue} onChange={(event) => setFieldValue(event.target.value)} className="h-8 border border-[#475569] bg-[#0f172a] px-2 font-mono text-xs text-white" /></label>
            )}
            {logStateOptions ? null : <label className="grid gap-1 text-[10px] text-[#94a3b8]">Màu / trạng thái<select value={fieldStatus} onChange={(event) => setFieldStatus(event.target.value)} className="h-8 border border-[#475569] bg-[#0f172a] px-2 text-xs text-white"><option value="">Giữ nguyên</option>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>}
            {fieldError ? <p role="alert" className="text-[10px] text-[#fca5a5]">{fieldError}</p> : null}
            <div className="flex gap-2"><button type="button" onClick={applyField} className="h-8 flex-1 bg-[#1e40af] px-3 font-semibold text-white">Áp dụng</button><button type="button" onClick={onRemoveField} title="Xóa giá trị ghi đè" className="grid size-8 place-items-center border border-[#7f1d1d] text-[#fca5a5]"><Trash aria-hidden size={14} /></button></div>
          </div>
        ) : <p className="mt-2 text-[10px] leading-5 text-[#94a3b8]">Chọn một ô giá trị hoặc trạng thái trên màn hình PMDT.</p>}
      </section>

      <section className="border-t border-[#334155] pt-3" aria-labelledby="vor-hardware-title">
        <div className="flex items-center justify-between gap-2"><h3 id="vor-hardware-title" className="font-semibold text-[#e2e8f0]">Bước 2 - Phần cứng sự cố</h3><button type="button" onClick={onOpenHardware} className="h-7 border border-[#475569] px-2 text-[10px] hover:border-[#60a5fa]">Cấu hình</button></div>
        <p className="mt-2 text-[10px] text-[#94a3b8]">{draft.hardwareTask ? `${draft.hardwareTask.expectedComponentIds.length} block đã chọn · ${draft.hardwareTask.faultType}` : "Chưa bật cho kịch bản này."}</p>
      </section>

      <section className="border-t border-[#334155] pt-3" aria-labelledby="vor-checkpoints-title">
        <div className="flex items-center justify-between gap-2"><h3 id="vor-checkpoints-title" className="font-semibold text-[#e2e8f0]">Các bước kiểm tra chuẩn</h3><button type="button" onClick={() => addCheckpoint()} className="inline-flex h-7 items-center gap-1 border border-[#475569] px-2 text-[10px] hover:border-[#60a5fa]"><Plus aria-hidden size={12} />Thêm màn hình</button></div>
        <p className="mt-2 truncate text-[10px] text-[#60a5fa]">{activeMenuPath.join(" > ")}</p>
        <ol className="mt-2 grid gap-1.5">{checkpoints.map((checkpoint) => <li key={checkpoint.id} className="flex items-start gap-2 border border-[#334155] bg-[#0f172a] p-2"><span className="font-mono text-[10px] text-[#94a3b8]">{checkpoint.order}</span><span className="min-w-0 flex-1 truncate text-[10px]">{checkpoint.menuPath.join(" > ")}</span><button type="button" onClick={() => removeCheckpoint(checkpoint.id)} aria-label={`Xóa bước ${checkpoint.order}`} title="Xóa bước kiểm tra" className="text-[#fca5a5]"><Trash aria-hidden size={12} /></button></li>)}</ol>
      </section>

      {interactionTargets.length > 0 ? (
        <section className="border-t border-[#334155] pt-3" aria-labelledby="vor-sidebar-actions-title">
          <h3 id="vor-sidebar-actions-title" className="font-semibold text-[#e2e8f0]">Thao tác sidebar cần chấm</h3>
          <ul className="mt-2 grid gap-1.5">
            {interactionTargets.map((target) => (
              <li key={target.fieldId} className="flex items-center justify-between border border-[#334155] bg-[#0f172a] p-2 text-[10px]">
                <span>{target.label}</span>
                <span className="font-mono text-[#fef08a]">{String(target.value)} · {target.status ?? "yellow"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-[10px] text-[#94a3b8]">{overrides.length} giá trị đã cấu hình</p>
      {error ? <p role="alert" className="border border-[#7f1d1d] bg-[#3a0f0f] p-2 text-[10px] text-[#fecaca]">{error}</p> : null}
    </div>
  );
}
