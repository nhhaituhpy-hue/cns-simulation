"use client";

import { PaperPlaneTilt, X } from "@phosphor-icons/react";
import { useState } from "react";
import { ComponentInspector } from "./component-inspector";
import { SignalPathDiagram } from "./signal-path-diagram";
import type { HardwareComponent } from "@/lib/hardware-model";
import type { ScenarioHardwareFault } from "@/lib/types";

type HardwareDiagnosisWorkspaceProps = {
  hardwareFault: ScenarioHardwareFault;
  onClose: () => void;
  onSubmit: (diagnosis: {
    componentId: string;
    inspectedComponents: string[];
  }) => void;
};

export function HardwareDiagnosisWorkspace({
  hardwareFault,
  onClose,
  onSubmit,
}: HardwareDiagnosisWorkspaceProps) {
  const [selectedComponent, setSelectedComponent] =
    useState<HardwareComponent | null>(null);
  const [diagnosedComponentId, setDiagnosedComponentId] =
    useState<string | null>(null);
  const [inspectedComponentIds, setInspectedComponentIds] = useState<string[]>(
    [],
  );

  function inspect(component: HardwareComponent) {
    setSelectedComponent(component);
    setInspectedComponentIds((current) =>
      current.includes(component.id) ? current : [...current, component.id],
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#172033]/60 p-3 sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hardware-diagnosis-title"
        className="mx-auto w-full max-w-[1500px] overflow-hidden rounded-lg border border-[#40566b] bg-[#edf2f5] shadow-[0_24px_70px_rgb(15_23_42/0.4)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#172033] bg-[#263746] px-4 py-3 text-white">
          <div>
            <p className="text-xs text-[#cbd5e1]">Hardware fault isolation</p>
            <h2 id="hardware-diagnosis-title" className="text-lg font-bold">
              Signal Path Diagnosis
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close hardware diagnosis" className="inline-flex size-10 items-center justify-center rounded hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X aria-hidden size={19} />
          </button>
        </header>

        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <SignalPathDiagram
            components={hardwareFault.hardwareLayout}
            signalPaths={hardwareFault.signalPaths}
            selectedComponentId={selectedComponent?.id}
            onSelectComponent={inspect}
          />
          <ComponentInspector
            component={selectedComponent}
            components={hardwareFault.hardwareLayout}
            markedAsFaulty={selectedComponent?.id === diagnosedComponentId}
            onMarkedAsFaultyChange={(marked) => {
              if (marked && selectedComponent) {
                setDiagnosedComponentId(selectedComponent.id);
              } else if (selectedComponent?.id === diagnosedComponentId) {
                setDiagnosedComponentId(null);
              }
            }}
          />
        </div>

        <footer className="flex flex-col gap-3 border-t border-[#b8c4ce] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#64748b]">
            Inspected {inspectedComponentIds.length} component(s). Select one component as faulty before submission.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="min-h-10 rounded border border-[#94a3b8] bg-white px-4 text-sm font-bold text-[#334155]">
              CLOSE
            </button>
            <button
              type="button"
              disabled={!diagnosedComponentId}
              onClick={() => {
                if (diagnosedComponentId) {
                  onSubmit({
                    componentId: diagnosedComponentId,
                    inspectedComponents: inspectedComponentIds,
                  });
                }
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded bg-[#2563eb] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              <PaperPlaneTilt aria-hidden size={17} />
              SUBMIT DIAGNOSIS
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
