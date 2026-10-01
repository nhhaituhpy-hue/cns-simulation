"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Circuitry } from "@phosphor-icons/react/dist/csr/Circuitry";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useState } from "react";
import {
  dme1119aHardwareOccurrenceKey,
  DME_1119A_BLOCKS,
  resolveDme1119aHardwareOccurrence,
  type Dme1119aBlockId,
} from "@/modules/devices/dme-1119a/block-diagram-data";
import { Dme1119aCabinet } from "@/modules/devices/dme-1119a/dme-1119a-cabinet";
import { Dme1119aSystemDiagram } from "@/modules/devices/dme-1119a/dme-1119a-system-diagram";
import { evaluateDme1119aScenario } from "@/lib/dme1119a";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

function evidence(state: ReturnType<typeof useDmePmdtStore.getState>) {
  return {
    visitedViewIds: state.attemptEvents.map((event) => event.viewId),
    acceptedActionControlIds: state.actionHistory.filter((event) => event.accepted && event.controlId).map((event) => event.controlId as string),
    selectedHardwareOccurrenceKeys: state.scenarioHardwareSelection,
    hardwareDispositionConfirmed: state.scenarioHardwareDispositionConfirmed,
  };
}

export function Dme1119aHardwareStage() {
  const scenario = useDmePmdtStore((state) => state.scenario);
  const data = useDmePmdtStore((state) => state.data);
  const selected = useDmePmdtStore((state) => state.scenarioHardwareSelection);
  const inspected = useDmePmdtStore((state) => state.scenarioHardwareInspected);
  const reasoning = useDmePmdtStore((state) => state.scenarioHardwareReasoning);
  const dispositionConfirmed = useDmePmdtStore((state) => state.scenarioHardwareDispositionConfirmed);
  const toggle = useDmePmdtStore((state) => state.toggleScenarioHardware);
  const inspect = useDmePmdtStore((state) => state.inspectScenarioHardware);
  const setReasoning = useDmePmdtStore((state) => state.setScenarioHardwareReasoning);
  const confirmSoftware = useDmePmdtStore((state) => state.confirmScenarioSoftwareResolution);
  const setStage = useDmePmdtStore((state) => state.setScenarioStage);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [surface, setSurface] = useState<"front" | "rear">("front");
  const [error, setError] = useState<string | null>(null);

  if (!scenario.active || !scenario.definition?.diagnosis) return null;
  const diagnosis = scenario.definition.diagnosis;
  const isSoftware = diagnosis.disposition === "software-adjustment";
  const evaluation = evaluateDme1119aScenario(scenario, data, evidence(useDmePmdtStore.getState()));

  function selectDiagram(blockId: Dme1119aBlockId, occurrence: { id: string; componentId: string; targetCabinetHotspotIds: readonly string[] }) {
    const resolved = resolveDme1119aHardwareOccurrence(blockId, occurrence.id);
    if (!resolved) return;
    setSelectedOccurrenceId(occurrence.id);
    const target = DME_1119A_BLOCKS.flatMap((block) => block.cabinetHotspots).find((hotspot) => resolved.cabinetHotspotIds.includes(hotspot.id));
    if (target) setSurface(target.surface);
    const key = dme1119aHardwareOccurrenceKey(resolved);
    inspect(key);
    if (!isSoftware) toggle(key);
    setError(null);
  }

  function selectCabinet(blockId: Dme1119aBlockId, hotspot: { id: string; surface: "front" | "rear" }) {
    const resolved = resolveDme1119aHardwareOccurrence(blockId, hotspot.id);
    if (!resolved) return;
    const occurrence = DME_1119A_BLOCKS.find((block) => block.id === blockId)?.diagramOccurrences.find((item) => item.id === resolved.diagramOccurrenceId);
    setSurface(hotspot.surface);
    inspect(dme1119aHardwareOccurrenceKey(resolved));
    if (occurrence) setSelectedOccurrenceId(occurrence.id);
    if (!isSoftware) toggle(dme1119aHardwareOccurrenceKey(resolved));
    setError(null);
  }

  function complete() {
    if (isSoftware && !dispositionConfirmed) return setError("Hãy xác nhận không thay phần cứng.");
    if (!evaluation.hardwareComplete) return setError("Lựa chọn hardware occurrence chưa khớp đáp án.");
    if (!reasoning.trim()) return setError("Hãy nhập căn cứ liên hệ PMDT và sơ đồ khối.");
    setError(null);
    setStage("complete");
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#e8edf1] text-[#17202a]">
      <header className="sticky top-0 z-10 border-b border-[#9aa8b3] bg-[#26333d] px-4 py-3 text-white shadow-md sm:px-6">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ed0ff]">Bước 2 / 2 · Xác định phần cứng</p><h1 className="mt-1 truncate text-lg font-bold">{scenario.definition.name}</h1></div>
          <button type="button" onClick={() => setStage("pmdt")} className="inline-flex min-h-10 items-center gap-2 rounded border border-[#9ed0ff] bg-[#314858] px-3 text-xs font-bold text-white hover:bg-[#3d596b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ed0ff]"><ArrowLeft aria-hidden size={16} />Quay lại PMDT</button>
        </div>
      </header>
      <main className="mx-auto grid max-w-[1500px] gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <section className="min-w-0" aria-labelledby="dme-hardware-stage-title">
          <div className="mb-4 flex items-start gap-3"><Circuitry aria-hidden size={26} className="mt-0.5 shrink-0 text-[#1d5f91]" /><div><h2 id="dme-hardware-stage-title" className="font-bold">Sơ đồ khối DME 1119A</h2><p className="mt-1 text-xs leading-5 text-[#53616d]">Chọn block trên sơ đồ hoặc cabinet để xác định LRU/card theo kết quả PMDT.</p></div></div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded border border-[#aebbc5] bg-white p-3"><div className="mb-2 flex gap-2"><button type="button" className={`min-h-9 rounded border px-3 text-xs font-bold ${surface === "front" ? "border-[#1d5f91] bg-[#dcecf6]" : "border-[#aebbc5]"}`} onClick={() => setSurface("front")}>Front Cabinet</button><button type="button" className={`min-h-9 rounded border px-3 text-xs font-bold ${surface === "rear" ? "border-[#1d5f91] bg-[#dcecf6]" : "border-[#aebbc5]"}`} onClick={() => setSurface("rear")}>Rear Cabinet</button></div><Dme1119aCabinet surface={surface} selectedHotspotIds={new Set(selected.flatMap((key) => key.split("::")[2]?.split(",") ?? []))} onSelect={selectCabinet} /></section>
            <section className="rounded border border-[#aebbc5] bg-white p-3"><Dme1119aSystemDiagram selectedOccurrenceId={selectedOccurrenceId} onSelect={selectDiagram} /></section>
          </div>
        </section>
        <aside className="h-fit rounded border border-[#aebbc5] bg-white p-4 shadow-sm xl:sticky xl:top-20" aria-label="Kết luận phần cứng">
          <h2 className="text-sm font-bold">Kết luận Bước 2</h2><p className="mt-2 text-xs leading-5 text-[#53616d]">{diagnosis.faultSummary}</p><p className="mt-3 rounded border border-[#c5d3dd] bg-[#f2f6f8] p-3 text-xs leading-5"><strong>PMDT:</strong> {diagnosis.diagnosticResult}</p>
          {isSoftware ? <label className="mt-4 flex items-start gap-2 rounded border border-[#c5d3dd] bg-[#f8fafb] p-3 text-xs font-semibold leading-5"><input type="checkbox" checked={dispositionConfirmed} onChange={(event) => { if (event.currentTarget.checked) confirmSoftware(); }} className="mt-1 size-4 accent-[#1d5f91]" />Xác nhận lỗi được xử lý bằng PMDT, không thay phần cứng.</label> : <p className="mt-4 rounded border border-[#c5d3dd] bg-[#f8fafb] p-3 text-xs">Đã chọn <strong>{selected.length}</strong> occurrence; đã xem <strong>{inspected.length}</strong>.</p>}
          <div className="mt-4 grid gap-3 text-xs"><div><h3 className="font-bold">Khối/card đã kiểm tra</h3><p className="mt-1 break-words">{inspected.length ? inspected.map((key) => key.split("::").slice(0, 2).join(" · ")).join(", ") : "Chưa kiểm tra khối/card."}</p></div><div><h3 className="font-bold">Khối/card được chọn</h3><p className="mt-1 break-words">{selected.length ? selected.map((key) => key.split("::").slice(0, 2).join(" · ")).join(", ") : "Chưa chọn khối/card."}</p></div></div>
          <label className="mt-4 grid gap-2 text-xs font-bold" htmlFor="dme-hardware-reasoning">Lý do xử lý phần cứng<textarea id="dme-hardware-reasoning" rows={7} value={reasoning} onChange={(event) => { setReasoning(event.target.value); setError(null); }} placeholder="Liên hệ kết quả Fault Isolation, màn hình PMDT và đường tín hiệu trên sơ đồ…" className="resize-y rounded border border-[#9aa8b3] p-3 text-sm font-normal leading-6 outline-none focus:border-[#1d5f91] focus:ring-2 focus:ring-[#9ed0ff]" /></label>
          {error ? <p role="alert" className="mt-3 flex gap-2 text-xs font-semibold leading-5 text-[#a22b2b]"><WarningCircle aria-hidden size={17} />{error}</p> : null}
          <button type="button" onClick={complete} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-[#1d5f91] px-4 text-sm font-bold text-white hover:bg-[#174d76] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5f91]"><CheckCircle aria-hidden size={18} />Hoàn thành kịch bản</button>
        </aside>
      </main>
    </div>
  );
}
