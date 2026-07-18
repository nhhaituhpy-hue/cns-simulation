"use client";

import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useState } from "react";
import type { EquipmentComponent, EquipmentDiagram, HardwareDiagnosisTask } from "@/lib/equipment-diagram-types";
import { EquipmentBlockDiagram } from "./equipment-block-diagram";

interface HardwareTaskEditorProps {
  title: string;
  diagrams: readonly EquipmentDiagram[];
  value: HardwareDiagnosisTask | undefined;
  onChange: (value: HardwareDiagnosisTask | undefined) => void;
  onClose: () => void;
}

const faultTypes = ["Suy giảm", "Mất tín hiệu", "Mất nguồn", "Mất kết nối", "Sai lệch tham số", "Quá nhiệt"];

export function HardwareTaskEditor({ title, diagrams, value, onChange, onClose }: HardwareTaskEditorProps) {
  const [draftTask, setDraftTask] = useState<HardwareDiagnosisTask | undefined>(() =>
    value ? structuredClone(value) : undefined,
  );
  const enabled = Boolean(draftTask);
  function enable(checked: boolean) {
    setDraftTask(checked ? { expectedComponentIds: [], faultType: faultTypes[0], adminNote: "" } : undefined);
  }
  function toggle(component: EquipmentComponent) {
    if (!draftTask) return;
    const exists = draftTask.expectedComponentIds.includes(component.id);
    setDraftTask({ ...draftTask, expectedComponentIds: exists ? draftTask.expectedComponentIds.filter((id) => id !== component.id) : [...draftTask.expectedComponentIds, component.id] });
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="hardware-editor-title" className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl border border-[#475569] bg-[#0a0e1a] text-[#e2e8f0] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#334155] px-5 py-4">
          <div><h2 id="hardware-editor-title" className="text-lg font-bold text-white">Bước 2 - Phần cứng sự cố {title}</h2><p className="mt-1 text-xs text-[#94a3b8]">Chọn một hoặc nhiều block làm đáp án dành cho giám khảo.</p></div>
          <button type="button" onClick={onClose} aria-label="Đóng cấu hình phần cứng" title="Đóng cấu hình phần cứng" className="grid size-9 place-items-center border border-[#475569] text-[#cbd5e1]"><X aria-hidden size={18} /></button>
        </header>
        <div className="grid gap-5 p-5">
          <label className="flex items-center gap-3 border border-[#334155] bg-[#111827] p-3 text-sm font-semibold"><input type="checkbox" checked={enabled} onChange={(event) => enable(event.target.checked)} className="size-4 accent-[#2563eb]" />Bật bước xác định phần cứng cho kịch bản này</label>
          {draftTask ? <>
            <EquipmentBlockDiagram diagrams={diagrams} selectedComponentIds={draftTask.expectedComponentIds} onToggleComponent={toggle} />
            <div className="grid gap-4 border-t border-[#334155] pt-5 md:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold text-[#cbd5e1]">Loại sự cố<select value={draftTask.faultType} onChange={(event) => setDraftTask({ ...draftTask, faultType: event.target.value })} className="h-10 border border-[#475569] bg-[#111827] px-3 text-sm text-white">{faultTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="grid gap-1 text-xs font-semibold text-[#cbd5e1]">Ghi chú dành cho giám khảo<textarea value={draftTask.adminNote} onChange={(event) => setDraftTask({ ...draftTask, adminNote: event.target.value })} rows={3} className="border border-[#475569] bg-[#111827] p-3 text-sm text-white" /></label>
            </div>
            {draftTask.expectedComponentIds.length === 0 ? <p role="alert" className="text-sm font-semibold text-[#fca5a5]">Hãy chọn ít nhất một block phần cứng.</p> : <p className="text-sm text-[#86efac]">Đã chọn {draftTask.expectedComponentIds.length} block phần cứng.</p>}
          </> : <p className="border border-dashed border-[#475569] p-8 text-center text-sm text-[#94a3b8]">Bật bước phần cứng để cấu hình đáp án.</p>}
        </div>
        <footer className="sticky bottom-0 flex justify-end border-t border-[#334155] bg-[#111827] p-4"><button type="button" onClick={() => { onChange(draftTask); onClose(); }} disabled={Boolean(draftTask && draftTask.expectedComponentIds.length === 0)} className="inline-flex h-10 items-center gap-2 bg-[#1d4ed8] px-5 text-sm font-bold text-white disabled:opacity-40"><CheckCircle aria-hidden size={17} />Hoàn tất cấu hình</button></footer>
      </div>
    </div>
  );
}
