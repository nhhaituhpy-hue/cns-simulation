"use client";

import { useMemo, useState } from "react";
import type { EquipmentComponent, EquipmentDiagram, EquipmentLinkKind } from "@/lib/equipment-diagram-types";

const linkClasses: Record<EquipmentLinkKind, string> = {
  rf: "stroke-[#ef4444]", control: "stroke-[#60a5fa]", monitor: "stroke-[#eab308]", power: "stroke-[#22c55e]", data: "stroke-[#a78bfa]",
};
const legendClasses: Record<EquipmentLinkKind, string> = {
  rf: "bg-[#ef4444]", control: "bg-[#60a5fa]", monitor: "bg-[#eab308]", power: "bg-[#22c55e]", data: "bg-[#a78bfa]",
};

interface EquipmentBlockDiagramProps {
  diagrams: readonly EquipmentDiagram[];
  selectedComponentIds: readonly string[];
  inspectedComponentIds?: readonly string[];
  readOnly?: boolean;
  onToggleComponent?: (component: EquipmentComponent) => void;
  onInspectComponent?: (component: EquipmentComponent) => void;
}

export function EquipmentBlockDiagram({ diagrams, selectedComponentIds, inspectedComponentIds = [], readOnly = false, onToggleComponent, onInspectComponent }: EquipmentBlockDiagramProps) {
  const [activeDiagramId, setActiveDiagramId] = useState(diagrams[0]?.id ?? "");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const diagram = diagrams.find((item) => item.id === activeDiagramId) ?? diagrams[0];
  const selected = useMemo(() => new Set(selectedComponentIds), [selectedComponentIds]);
  const inspected = useMemo(() => new Set(inspectedComponentIds), [inspectedComponentIds]);
  const componentMap = useMemo(() => new Map(diagrams.flatMap((item) => item.components).map((item) => [item.id, item])), [diagrams]);
  const focused = focusedId ? componentMap.get(focusedId) : undefined;
  if (!diagram) return null;

  return (
    <section aria-label="Sơ đồ khối thiết bị" className="min-w-0">
      {diagrams.length > 1 ? <div role="tablist" className="mb-3 flex flex-wrap gap-2">{diagrams.map((item) => <button key={item.id} type="button" role="tab" aria-selected={item.id === diagram.id} onClick={() => setActiveDiagramId(item.id)} className={`h-9 border px-3 text-xs font-semibold ${item.id === diagram.id ? "border-[#2563eb] bg-[#1e3a8a] text-white" : "border-[#475569] bg-[#111827] text-[#cbd5e1]"}`}>{item.title}</button>)}</div> : null}
      <div className="relative min-h-[34rem] overflow-auto border border-[#475569] bg-[#07101f]">
        <div className="relative h-[42rem] min-w-[60rem]">
          <svg aria-hidden className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {diagram.links.map((link) => {
              const from = componentMap.get(link.fromComponentId); const to = componentMap.get(link.toComponentId);
              if (!from || !to) return null;
              return <line key={link.id} x1={from.position.x} y1={from.position.y} x2={to.position.x} y2={to.position.y} className={`fill-none stroke-[0.35] ${linkClasses[link.kind]}`} />;
            })}
          </svg>
          {diagram.components.map((component) => {
            const isSelected = selected.has(component.id); const isInspected = inspected.has(component.id);
            return <button key={component.id} type="button" aria-pressed={isSelected} aria-label={`${component.name}, ${component.subsystem}${isSelected ? ", đã chọn" : ""}`} onClick={() => { setFocusedId(component.id); onInspectComponent?.(component); if (!readOnly) onToggleComponent?.(component); }} style={{ left: `${component.position.x}%`, top: `${component.position.y}%` }} className={`absolute w-32 -translate-x-1/2 -translate-y-1/2 border px-2 py-2 text-center text-[10px] font-bold leading-4 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd] ${isSelected ? "border-[#f59e0b] bg-[#78350f] text-[#fef3c7]" : isInspected ? "border-[#2563eb] bg-[#172554] text-[#dbeafe]" : "border-[#64748b] bg-[#1e293b] text-[#e2e8f0]"}`}><span className="block">{component.shortName}</span><span className="mt-0.5 block font-normal text-[#94a3b8]">{component.subsystem}</span></button>;
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#64748b]">{Object.entries({ rf: "RF", control: "Control", monitor: "Monitor", power: "Power", data: "Data" }).map(([kind, label]) => <span key={kind} className="inline-flex items-center gap-1.5"><span className={`h-0.5 w-5 ${legendClasses[kind as EquipmentLinkKind]}`} />{label}</span>)}</div>
      {focused ? <p role="status" className="mt-3 border-l-2 border-[#60a5fa] pl-3 text-xs leading-5 text-[#cbd5e1]"><strong className="text-white">{focused.name}:</strong> {focused.functionDescription}</p> : <p className="mt-3 text-xs text-[#64748b]">Chọn một block để xem chức năng.</p>}
    </section>
  );
}
