"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Circuitry } from "@phosphor-icons/react/dist/csr/Circuitry";
import { useState } from "react";
import type {
  EquipmentComponent,
  EquipmentDiagram,
  HardwareDiagnosisAnswer,
} from "@/lib/equipment-diagram-types";
import { EquipmentBlockDiagram } from "./equipment-block-diagram";

interface HardwareDiagnosisStepProps {
  equipmentName: string;
  scenarioTitle: string;
  diagrams: readonly EquipmentDiagram[];
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: (answer: HardwareDiagnosisAnswer) => Promise<void>;
}

export function HardwareDiagnosisStep({
  equipmentName,
  scenarioTitle,
  diagrams,
  isSubmitting,
  onBack,
  onSubmit,
}: HardwareDiagnosisStepProps) {
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [inspectedComponentIds, setInspectedComponentIds] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");

  function inspect(component: EquipmentComponent) {
    setInspectedComponentIds((current) =>
      current.includes(component.id) ? current : [...current, component.id],
    );
  }

  function toggle(component: EquipmentComponent) {
    setSelectedComponentIds((current) =>
      current.includes(component.id)
        ? current.filter((id) => id !== component.id)
        : [...current, component.id],
    );
    setError("");
  }

  async function submit() {
    if (selectedComponentIds.length === 0) {
      setError("Hãy chọn ít nhất một block phần cứng bị nghi ngờ.");
      return;
    }
    if (!reasoning.trim()) {
      setError("Hãy nhập căn cứ lựa chọn phần cứng.");
      return;
    }
    setError("");
    await onSubmit({
      selectedComponentIds,
      reasoning: reasoning.trim(),
      inspectedComponentIds,
      completedAt: new Date().toISOString(),
    });
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#070a12] text-[#e2e8f0]">
      <header className="border-b border-[#334155] bg-[#111827] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#60a5fa]">Bước 2 / 2 · Xác định phần cứng</p>
            <h1 className="mt-1 text-lg font-bold text-white">{scenarioTitle}</h1>
          </div>
          <button type="button" onClick={onBack} className="inline-flex h-9 items-center gap-2 border border-[#475569] px-3 text-xs font-semibold hover:border-[#60a5fa]"><ArrowLeft aria-hidden size={16} />Quay lại PMDT</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[96rem] gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="hardware-diagram-title" className="min-w-0">
          <div className="mb-4 flex items-start gap-3">
            <Circuitry aria-hidden size={26} className="shrink-0 text-[#60a5fa]" />
            <div>
              <h2 id="hardware-diagram-title" className="font-bold text-white">Sơ đồ khối {equipmentName}</h2>
              <p className="mt-1 text-xs leading-5 text-[#94a3b8]">Mở các block để đọc chức năng, sau đó chọn một hoặc nhiều block bạn xác định là nguyên nhân sự cố.</p>
            </div>
          </div>
          <EquipmentBlockDiagram
            diagrams={diagrams}
            selectedComponentIds={selectedComponentIds}
            inspectedComponentIds={inspectedComponentIds}
            onInspectComponent={inspect}
            onToggleComponent={toggle}
          />
        </section>

        <aside aria-label="Kết luận phần cứng" className="h-fit border border-[#334155] bg-[#111827] p-4 xl:sticky xl:top-4">
          <h2 className="text-sm font-bold text-white">Kết luận phần cứng</h2>
          <p className="mt-2 text-xs leading-5 text-[#94a3b8]">Đã chọn {selectedComponentIds.length} block · đã xem {inspectedComponentIds.length} block.</p>
          <label className="mt-5 grid gap-2 text-xs font-semibold text-[#cbd5e1]">
            Căn cứ lựa chọn
            <textarea
              value={reasoning}
              onChange={(event) => { setReasoning(event.target.value); setError(""); }}
              rows={8}
              placeholder="Liên hệ các dấu hiệu đã quan sát trên PMDT với đường tín hiệu/điều khiển trên sơ đồ…"
              className="resize-y border border-[#475569] bg-[#0a0e1a] p-3 text-sm font-normal leading-6 text-white outline-none focus:border-[#60a5fa]"
            />
          </label>
          {error ? <p role="alert" className="mt-3 text-xs font-semibold text-[#fca5a5]">{error}</p> : null}
          <button type="button" disabled={isSubmitting} onClick={() => void submit()} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 bg-[#2563eb] px-4 text-sm font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-wait disabled:opacity-60"><CheckCircle aria-hidden size={18} />{isSubmitting ? "Đang nộp…" : "Nộp bài cho giám khảo"}</button>
        </aside>
      </div>
    </main>
  );
}
