"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Circuitry } from "@phosphor-icons/react/dist/csr/Circuitry";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useState } from "react";
import { evaluateDvor1150Scenario } from "@/lib/dvor1150";
import { dvor1150HardwareOccurrenceKey } from "@/modules/devices/dvor-1150/block-diagram-data";
import { Dvor1150BlockDiagram } from "@/modules/devices/dvor-1150/dvor-1150-block-diagram";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

export function Dvor1150HardwareStage() {
  const scenario = useDvor1150PmdtStore((state) => state.scenario);
  const config = useDvor1150PmdtStore((state) => state.config);
  const derived = useDvor1150PmdtStore((state) => state.derived);
  const selection = useDvor1150PmdtStore((state) => state.scenarioHardwareSelection);
  const inspected = useDvor1150PmdtStore((state) => state.scenarioHardwareInspected);
  const visitedViewIds = useDvor1150PmdtStore((state) => state.scenarioVisitedViewIds);
  const acceptedActionControlIds = useDvor1150PmdtStore((state) => state.scenarioAcceptedActionControlIds);
  const reasoning = useDvor1150PmdtStore((state) => state.scenarioHardwareReasoning);
  const dispositionConfirmed = useDvor1150PmdtStore((state) => state.scenarioHardwareDispositionConfirmed);
  const toggle = useDvor1150PmdtStore((state) => state.toggleScenarioHardware);
  const inspect = useDvor1150PmdtStore((state) => state.inspectScenarioHardware);
  const setReasoning = useDvor1150PmdtStore((state) => state.setScenarioHardwareReasoning);
  const confirmSoftware = useDvor1150PmdtStore((state) => state.confirmScenarioSoftwareResolution);
  const setStage = useDvor1150PmdtStore((state) => state.setScenarioStage);
  const [error, setError] = useState<string | null>(null);

  if (!scenario.active || !scenario.definition?.diagnosis) return null;
  const diagnosis = scenario.definition.diagnosis;
  const evaluation = evaluateDvor1150Scenario(scenario, derived, config, {
    visitedViewIds,
    acceptedActionControlIds,
    selectedHardwareOccurrenceKeys: selection,
    hardwareDispositionConfirmed: dispositionConfirmed,
  });
  const isSoftwareAdjustment = diagnosis.disposition === "software-adjustment";

  function complete() {
    if (!evaluation.pmdtComplete) {
      setError("Hãy hoàn thành các checkpoint và thao tác PMDT ở Bước 1 trước.");
      return;
    }
    if (isSoftwareAdjustment && !dispositionConfirmed) {
      setError("Hãy xác nhận kết luận không thay thế phần cứng.");
      return;
    }
    if (!evaluation.hardwareComplete) {
      setError("Lựa chọn phần cứng chưa khớp với đáp án của kịch bản.");
      return;
    }
    if (!reasoning.trim()) {
      setError("Hãy nhập căn cứ liên hệ giữa PMDT và sơ đồ khối.");
      return;
    }
    setError(null);
    setStage("complete");
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#e8edf1] text-[#17202a]">
      <header className="sticky top-0 z-10 border-b border-[#9aa8b3] bg-[#26333d] px-4 py-3 text-white shadow-md sm:px-6">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ed0ff]">Bước 2 / 2 · Xác định phần cứng</p>
            <h1 className="mt-1 truncate text-lg font-bold">{scenario.definition.name}</h1>
          </div>
          <button
            type="button"
            onClick={() => setStage("pmdt")}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded border border-[#9ed0ff] bg-[#314858] px-3 text-xs font-bold text-white hover:bg-[#3d596b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ed0ff]"
          >
            <ArrowLeft aria-hidden size={16} />
            Quay lại PMDT
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <section aria-labelledby="dvor1150-hardware-stage-title" className="min-w-0">
          <div className="mb-4 flex items-start gap-3">
            <Circuitry aria-hidden size={26} className="mt-0.5 shrink-0 text-[#1d5f91]" />
            <div>
              <h2 id="dvor1150-hardware-stage-title" className="font-bold text-[#17202a]">Sơ đồ khối DVOR 1150</h2>
              <p className="mt-1 text-xs leading-5 text-[#53616d]">Mở đúng occurrence trên sơ đồ hoặc cabinet để liên hệ triệu chứng PMDT với block/card cần xử lý.</p>
            </div>
          </div>
          <Dvor1150BlockDiagram
            selectedOccurrenceKeys={new Set(selection)}
            inspectedOccurrenceKeys={new Set(inspected)}
            selectionDisabled={isSoftwareAdjustment}
            onInspectOccurrence={(occurrence) => inspect(dvor1150HardwareOccurrenceKey(occurrence))}
            onSelectOccurrence={(occurrence) => {
              toggle(dvor1150HardwareOccurrenceKey(occurrence));
              setError(null);
            }}
          />
        </section>

        <aside aria-label="Kết luận phần cứng" className="h-fit rounded border border-[#aebbc5] bg-white p-4 shadow-sm xl:sticky xl:top-20">
          <h2 className="text-sm font-bold text-[#17202a]">Kết luận Bước 2</h2>
          <p className="mt-2 text-xs leading-5 text-[#53616d]">{diagnosis.faultSummary}</p>
          <div className="mt-4 rounded border border-[#c5d3dd] bg-[#f2f6f8] p-3 text-xs leading-5 text-[#364754]"><strong>PMDT:</strong> {diagnosis.diagnosticResult}</div>

          {isSoftwareAdjustment ? (
            <label className="mt-4 flex items-start gap-2 rounded border border-[#c5d3dd] bg-[#f8fafb] p-3 text-xs font-semibold leading-5">
              <input type="checkbox" checked={dispositionConfirmed} onChange={(event) => { if (event.currentTarget.checked) confirmSoftware(); }} className="mt-1 size-4 accent-[#1d5f91]" />
              Xác nhận: lỗi được khắc phục bằng PMDT, không thay phần cứng.
            </label>
          ) : (
            <p className="mt-4 rounded border border-[#c5d3dd] bg-[#f8fafb] p-3 text-xs leading-5 text-[#364754]">Đã chọn <strong>{selection.length}</strong> occurrence; đã kiểm tra <strong>{inspected.length}</strong> occurrence.</p>
          )}

          <label className="mt-4 grid gap-2 text-xs font-bold text-[#364754]" htmlFor="dvor1150-hardware-reasoning">
            Lý do xử lý phần cứng
            <textarea id="dvor1150-hardware-reasoning" value={reasoning} onChange={(event) => { setReasoning(event.target.value); setError(null); }} rows={7} placeholder="Liên hệ kết quả Fault Isolation, màn hình PMDT và đường tín hiệu trên sơ đồ…" className="resize-y rounded border border-[#9aa8b3] bg-white p-3 text-sm font-normal leading-6 outline-none focus:border-[#1d5f91] focus:ring-2 focus:ring-[#9ed0ff]" />
          </label>

          {error ? <p role="alert" className="mt-3 flex gap-2 text-xs font-semibold leading-5 text-[#a22b2b]"><WarningCircle aria-hidden size={17} className="mt-0.5 shrink-0" />{error}</p> : null}
          <button type="button" onClick={complete} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-[#1d5f91] px-4 text-sm font-bold text-white hover:bg-[#174d76] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5f91] focus-visible:ring-offset-2"><CheckCircle aria-hidden size={18} />Hoàn thành kịch bản</button>
        </aside>
      </main>
    </div>
  );
}
