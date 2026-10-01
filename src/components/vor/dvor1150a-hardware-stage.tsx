"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Circuitry } from "@phosphor-icons/react/dist/csr/Circuitry";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useState } from "react";
import { DvorHardwareSelector } from "@/modules/devices/dvor-1150a/dvor-block-diagram";
import { dvorHardwareOccurrenceKey } from "@/modules/devices/dvor-1150a/block-diagram-data";
import { evaluateDvor1150aScenario } from "@/lib/dvor1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

function buildEvidence(state: ReturnType<typeof useVorPmdtStore.getState>) {
  return {
    visitedViewIds: state.attemptEvents.map((event) => event.viewId),
    acceptedActionControlIds: state.actionHistory
      .filter((event) => event.accepted && event.controlId)
      .map((event) => event.controlId as string),
    selectedHardwareOccurrenceKeys: state.scenarioHardwareSelection,
    hardwareDispositionConfirmed: state.scenarioHardwareDispositionConfirmed,
  };
}

export function Dvor1150aHardwareStage() {
  const scenario = useVorPmdtStore((state) => state.scenario);
  const config = useVorPmdtStore((state) => state.config);
  const derived = useVorPmdtStore((state) => state.derived);
  const selection = useVorPmdtStore((state) => state.scenarioHardwareSelection);
  const inspected = useVorPmdtStore((state) => state.scenarioHardwareInspected);
  const reasoning = useVorPmdtStore((state) => state.scenarioHardwareReasoning);
  const dispositionConfirmed = useVorPmdtStore((state) => state.scenarioHardwareDispositionConfirmed);
  const toggle = useVorPmdtStore((state) => state.toggleScenarioHardware);
  const inspect = useVorPmdtStore((state) => state.inspectScenarioHardware);
  const setReasoning = useVorPmdtStore((state) => state.setScenarioHardwareReasoning);
  const confirmSoftware = useVorPmdtStore((state) => state.confirmScenarioSoftwareResolution);
  const setStage = useVorPmdtStore((state) => state.setScenarioStage);
  const [error, setError] = useState<string | null>(null);

  if (!scenario.active || !scenario.definition?.diagnosis) return null;
  const diagnosis = scenario.definition.diagnosis;
  const evaluation = evaluateDvor1150aScenario(
    scenario,
    derived,
    config,
    buildEvidence(useVorPmdtStore.getState()),
  );
  const selectedKeys = new Set(selection);
  const inspectedKeys = new Set(inspected);
  const isSoftwareAdjustment = diagnosis.disposition === "software-adjustment";

  function complete() {
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
        <section aria-labelledby="dvor-hardware-stage-title" className="min-w-0">
          <div className="mb-4 flex items-start gap-3">
            <Circuitry aria-hidden size={26} className="mt-0.5 shrink-0 text-[#1d5f91]" />
            <div>
              <h2 id="dvor-hardware-stage-title" className="font-bold text-[#17202a]">Sơ đồ khối DVOR 1150A</h2>
              <p className="mt-1 text-xs leading-5 text-[#53616d]">
                Mở đúng occurrence trên sơ đồ hoặc cabinet để liên hệ triệu chứng PMDT với khối/card cần xử lý.
              </p>
            </div>
          </div>
          <DvorHardwareSelector
            selectedOccurrenceKeys={selectedKeys}
            inspectedOccurrenceKeys={inspectedKeys}
            selectionDisabled={isSoftwareAdjustment}
            onInspectOccurrence={(occurrence) => inspect(dvorHardwareOccurrenceKey(occurrence))}
            onSelectOccurrence={(occurrence) => {
              toggle(dvorHardwareOccurrenceKey(occurrence));
              setError(null);
            }}
          />
        </section>

        <aside aria-label="Kết luận phần cứng" className="h-fit rounded border border-[#aebbc5] bg-white p-4 shadow-sm xl:sticky xl:top-20">
          <h2 className="text-sm font-bold text-[#17202a]">Kết luận Bước 2</h2>
          <p className="mt-2 text-xs leading-5 text-[#53616d]">{diagnosis.faultSummary}</p>
          <div className="mt-4 rounded border border-[#c5d3dd] bg-[#f2f6f8] p-3 text-xs leading-5 text-[#364754]">
            <strong>PMDT:</strong> {diagnosis.diagnosticResult}
          </div>

          {isSoftwareAdjustment ? (
            <label className="mt-4 flex items-start gap-2 rounded border border-[#c5d3dd] bg-[#f8fafb] p-3 text-xs font-semibold leading-5">
              <input
                type="checkbox"
                checked={dispositionConfirmed}
                onChange={(event) => {
                  if (event.currentTarget.checked) confirmSoftware();
                }}
                className="mt-1 size-4 accent-[#1d5f91]"
              />
              Xác nhận: lỗi được khắc phục bằng PMDT, không thay phần cứng.
            </label>
          ) : (
            <p className="mt-4 rounded border border-[#c5d3dd] bg-[#f8fafb] p-3 text-xs leading-5 text-[#364754]">
              Đã chọn <strong>{selection.length}</strong> occurrence; đã kiểm tra <strong>{inspected.length}</strong> occurrence.
            </p>
          )}

          <div className="mt-4 grid gap-3 text-xs"><div><h3 className="font-bold">Khối/card đã kiểm tra</h3><p className="mt-1 break-words">{inspected.length ? inspected.map((key) => key.split("::").slice(0, 2).join(" · ")).join(", ") : "Chưa kiểm tra khối/card."}</p></div><div><h3 className="font-bold">Khối/card được chọn</h3><p className="mt-1 break-words">{selection.length ? selection.map((key) => key.split("::").slice(0, 2).join(" · ")).join(", ") : "Chưa chọn khối/card."}</p></div></div>

          <label className="mt-4 grid gap-2 text-xs font-bold text-[#364754]" htmlFor="dvor-hardware-reasoning">
            Lý do xử lý phần cứng
            <textarea
              id="dvor-hardware-reasoning"
              value={reasoning}
              onChange={(event) => {
                setReasoning(event.target.value);
                setError(null);
              }}
              rows={7}
              placeholder="Liên hệ kết quả Fault Isolation, màn hình PMDT và đường tín hiệu trên sơ đồ…"
              className="resize-y rounded border border-[#9aa8b3] bg-white p-3 text-sm font-normal leading-6 outline-none focus:border-[#1d5f91] focus:ring-2 focus:ring-[#9ed0ff]"
            />
          </label>

          {error ? (
            <p role="alert" className="mt-3 flex gap-2 text-xs font-semibold leading-5 text-[#a22b2b]">
              <WarningCircle aria-hidden size={17} className="mt-0.5 shrink-0" />{error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={complete}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-[#1d5f91] px-4 text-sm font-bold text-white hover:bg-[#174d76] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5f91] focus-visible:ring-offset-2"
          >
            <CheckCircle aria-hidden size={18} />
            Hoàn thành kịch bản
          </button>
        </aside>
      </main>
    </div>
  );
}
