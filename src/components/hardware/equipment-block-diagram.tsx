"use client";

import { useId, useMemo, useState } from "react";
import type { EquipmentComponent, EquipmentDiagram, EquipmentLink, EquipmentLinkKind, EquipmentPoint } from "@/lib/equipment-diagram-types";

const linkClasses: Record<EquipmentLinkKind, string> = {
  rf: "stroke-[#f87171]", modulation: "stroke-[#4ade80]", control: "stroke-[#60a5fa]", monitor: "stroke-[#facc15]", power: "stroke-[#22c55e]", data: "stroke-[#c084fc]",
};
const legendClasses: Record<EquipmentLinkKind, string> = {
  rf: "bg-[#f87171]", modulation: "bg-[#4ade80]", control: "bg-[#60a5fa]", monitor: "bg-[#facc15]", power: "bg-[#22c55e]", data: "bg-[#c084fc]",
};
const markerColors: Record<EquipmentLinkKind, string> = {
  rf: "#f87171", modulation: "#4ade80", control: "#60a5fa", monitor: "#facc15", power: "#22c55e", data: "#c084fc",
};
const linkLabels: Record<EquipmentLinkKind, string> = {
  rf: "RF", modulation: "Điều chế", control: "Điều khiển", monitor: "Giám sát / mẫu", power: "Nguồn", data: "Dữ liệu",
};

function routeFor(link: EquipmentLink, componentMap: Map<string, EquipmentComponent>): EquipmentPoint[] {
  if (link.route) return link.route;
  const from = componentMap.get(link.fromComponentId);
  const to = componentMap.get(link.toComponentId);
  return from && to ? [from.position, to.position] : [];
}

function labelPosition(link: EquipmentLink, route: readonly EquipmentPoint[]): EquipmentPoint | null {
  if (link.labelPosition) return link.labelPosition;
  if (route.length < 2) return null;
  const middleIndex = Math.floor((route.length - 1) / 2);
  const left = route[middleIndex];
  const right = route[middleIndex + 1];
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

interface EquipmentBlockDiagramProps {
  diagrams: readonly EquipmentDiagram[];
  selectedComponentIds: readonly string[];
  inspectedComponentIds?: readonly string[];
  readOnly?: boolean;
  onToggleComponent?: (component: EquipmentComponent) => void;
  onInspectComponent?: (component: EquipmentComponent) => void;
}

export function EquipmentBlockDiagram({ diagrams, selectedComponentIds, inspectedComponentIds = [], readOnly = false, onToggleComponent, onInspectComponent }: EquipmentBlockDiagramProps) {
  const markerPrefix = useId().replaceAll(":", "");
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
      {diagram.description ? <p className="mb-3 text-xs leading-5 text-[#94a3b8]">{diagram.description}</p> : null}
      <div className="relative min-h-[34rem] overflow-auto border border-[#475569] bg-[#07101f]">
        <div className="relative" style={{ height: `${diagram.canvas?.heightRem ?? 42}rem`, minWidth: `${diagram.canvas?.widthRem ?? 60}rem` }}>
          {diagram.groups?.map((group) => <div key={group.id} aria-hidden className="pointer-events-none absolute z-0 border border-dashed border-[#334155] bg-[#0f172a]/35" style={{ left: `${group.bounds.x}%`, top: `${group.bounds.y}%`, width: `${group.bounds.width}%`, height: `${group.bounds.height}%` }}><span className="absolute left-2 top-1 text-[9px] font-bold uppercase tracking-widest text-[#64748b]">{group.label}</span></div>)}
          <svg aria-hidden className="absolute inset-0 z-10 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              {(Object.keys(markerColors) as EquipmentLinkKind[]).map((kind) => <marker key={kind} id={`${markerPrefix}-${kind}`} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 6 3 L 0 6 z" fill={markerColors[kind]} /></marker>)}
            </defs>
            {diagram.links.map((link) => {
              const route = routeFor(link, componentMap);
              if (route.length < 2) return null;
              const isFocused = Boolean(focusedId && (link.fromComponentId === focusedId || link.toComponentId === focusedId));
              const direction = link.direction ?? "forward";
              return <polyline key={link.id} points={route.map((point) => `${point.x},${point.y}`).join(" ")} vectorEffect="non-scaling-stroke" markerStart={direction === "reverse" || direction === "bidirectional" ? `url(#${markerPrefix}-${link.kind})` : undefined} markerEnd={direction === "forward" || direction === "bidirectional" ? `url(#${markerPrefix}-${link.kind})` : undefined} className={`fill-none transition-opacity ${linkClasses[link.kind]} ${focusedId ? isFocused ? "stroke-[0.45] opacity-100" : "stroke-[0.22] opacity-25" : "stroke-[0.28] opacity-70"}`} />;
            })}
          </svg>
          {diagram.links.map((link) => {
            if (!link.label) return null;
            const route = routeFor(link, componentMap);
            const position = labelPosition(link, route);
            const isFocused = Boolean(focusedId && (link.fromComponentId === focusedId || link.toComponentId === focusedId));
            if (!position) return null;
            return <span key={`${link.id}-label`} aria-hidden style={{ left: `${position.x}%`, top: `${position.y}%` }} className={`pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 bg-[#07101f]/90 px-1 font-mono text-[8px] text-[#cbd5e1] ${focusedId && !isFocused ? "opacity-20" : "opacity-100"}`}>{link.label}</span>;
          })}
          {diagram.components.map((component) => {
            const isSelected = selected.has(component.id); const isInspected = inspected.has(component.id);
            return <button key={component.id} type="button" aria-pressed={isSelected} aria-label={`${component.name}, ${component.subsystem}${isSelected ? ", đã chọn" : ""}`} onClick={() => { setFocusedId(component.id); onInspectComponent?.(component); if (!readOnly) onToggleComponent?.(component); }} style={{ left: `${component.position.x}%`, top: `${component.position.y}%`, width: component.size ? `${component.size.width}%` : undefined, minHeight: component.size ? `${component.size.height}%` : undefined }} className={`absolute z-30 w-32 -translate-x-1/2 -translate-y-1/2 border px-2 py-2 text-center text-[10px] font-bold leading-4 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd] ${isSelected ? "border-[#f59e0b] bg-[#78350f] text-[#fef3c7]" : isInspected ? "border-[#2563eb] bg-[#172554] text-[#dbeafe]" : focusedId === component.id ? "border-[#60a5fa] bg-[#1e3a5f] text-white" : "border-[#64748b] bg-[#1e293b] text-[#e2e8f0]"}`}><span className="block">{component.shortName}</span><span className="mt-0.5 block font-normal text-[#94a3b8]">{component.subsystem}</span></button>;
          })}
        </div>
      </div>
      <p className="sr-only">Sơ đồ {diagram.title} gồm {diagram.components.length} khối và {diagram.links.length} tuyến kết nối. Dùng phím Tab để duyệt từng khối.</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#64748b]">{(Object.keys(linkLabels) as EquipmentLinkKind[]).map((kind) => <span key={kind} className="inline-flex items-center gap-1.5"><span className={`h-0.5 w-5 ${legendClasses[kind]}`} />{linkLabels[kind]}</span>)}</div>
      {focused ? <p role="status" className="mt-3 border-l-2 border-[#60a5fa] pl-3 text-xs leading-5 text-[#cbd5e1]"><strong className="text-white">{focused.name}:</strong> {focused.functionDescription}</p> : <p className="mt-3 text-xs text-[#64748b]">Chọn một block để xem chức năng.</p>}
    </section>
  );
}
