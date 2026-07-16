"use client";

import { ArrowDown, ArrowRight } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import {
  CON_SON_HARDWARE,
  CON_SON_SIGNAL_PATHS,
  type ComponentStatus,
  type HardwareComponent,
  type SignalPath,
} from "@/lib/hardware-model";

type SignalPathDiagramProps = {
  title?: string;
  components?: readonly HardwareComponent[];
  signalPaths?: readonly SignalPath[];
  faultyComponentId?: string;
  selectedComponentId?: string | null;
  onSelectComponent?: (component: HardwareComponent) => void;
  readOnly?: boolean;
};

const STATUS_DETAILS: Record<
  ComponentStatus,
  { label: string; dot: string; card: string }
> = {
  ok: {
    label: "OK",
    dot: "bg-green-500",
    card: "border-green-300 bg-green-50/60",
  },
  degraded: {
    label: "DEGRADED",
    dot: "bg-orange-500",
    card: "border-orange-300 bg-orange-50/70",
  },
  failed: {
    label: "FAILED",
    dot: "bg-red-500",
    card: "border-red-400 bg-red-50",
  },
};

function typeLabel(type: HardwareComponent["type"]): string {
  return type.replaceAll("_", " ").toUpperCase();
}

function statusFor(
  component: HardwareComponent,
  faultyComponentId: string | undefined,
): ComponentStatus {
  return component.id === faultyComponentId ? "failed" : component.status;
}

function Connector() {
  return (
    <div
      aria-hidden
      className="flex h-10 w-8 shrink-0 items-center justify-center text-[#64748b] lg:h-8 lg:w-12"
    >
      <ArrowDown
        className="animate-pulse lg:hidden motion-reduce:animate-none"
        size={22}
        weight="bold"
      />
      <ArrowRight
        className="hidden animate-pulse lg:block motion-reduce:animate-none"
        size={22}
        weight="bold"
      />
    </div>
  );
}

export function SignalPathDiagram({
  title = "Signal Path Diagram - Con Son Sensor 1",
  components = CON_SON_HARDWARE,
  signalPaths = CON_SON_SIGNAL_PATHS,
  faultyComponentId,
  selectedComponentId,
  onSelectComponent,
  readOnly = false,
}: SignalPathDiagramProps) {
  const [activePathId, setActivePathId] = useState(
    () => signalPaths[0]?.id ?? "",
  );
  const [internalSelection, setInternalSelection] = useState<string | null>(
    null,
  );
  const componentMap = useMemo(
    () => new Map(components.map((component) => [component.id, component])),
    [components],
  );
  const activePath =
    signalPaths.find((path) => path.id === activePathId) ?? signalPaths[0];
  const activeComponents =
    activePath?.componentIds
      .map((componentId) => componentMap.get(componentId))
      .filter((component): component is HardwareComponent => Boolean(component)) ??
    [];
  const selectedId = selectedComponentId ?? internalSelection;

  function selectComponent(component: HardwareComponent) {
    setInternalSelection(component.id);
    onSelectComponent?.(component);
  }

  return (
    <section
      aria-labelledby="signal-path-title"
      className="overflow-hidden rounded-lg border border-[#40566b] bg-[#edf2f5]"
    >
      <header className="border-b border-[#172033] bg-[#263746] px-4 py-3 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#aebdca]">
          Hardware topology
        </p>
        <h2 id="signal-path-title" className="mt-1 text-lg font-bold">
          {title}
        </h2>
      </header>

      <div className="border-b border-[#b8c4ce] bg-white p-3">
        <div
          role="tablist"
          aria-label="Signal paths"
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {signalPaths.map((path) => (
            <button
              key={path.id}
              type="button"
              role="tab"
              aria-selected={path.id === activePath?.id}
              onClick={() => setActivePathId(path.id)}
              className={
                "min-h-10 shrink-0 rounded border px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] " +
                (path.id === activePath?.id
                  ? "border-[#2563eb] bg-[#e8f2fb] text-[#17324a]"
                  : "border-[#b8c4ce] bg-white text-[#475569] hover:bg-[#f8fafc]")
              }
            >
              {path.name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-5 text-[#64748b]">
          {activePath?.description}
        </p>
      </div>

      <div className="overflow-x-auto p-4">
        {activeComponents.length > 0 ? (
          <div className="flex min-w-0 flex-col items-stretch lg:min-w-max lg:flex-row lg:items-center">
            {activeComponents.map((component, index) => {
              const status = statusFor(component, faultyComponentId);
              const details = STATUS_DETAILS[status];
              const selected = selectedId === component.id;
              const failed = component.id === faultyComponentId;

              return (
                <div
                  key={component.id}
                  className="contents"
                >
                  {index > 0 ? <Connector /> : null}
                  <button
                    type="button"
                    disabled={readOnly && !onSelectComponent}
                    aria-pressed={selected}
                    onClick={() => selectComponent(component)}
                    className={
                      "relative min-h-32 w-full rounded-md border-2 p-3 text-left shadow-sm transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 lg:w-52 " +
                      details.card +
                      (selected ? " ring-2 ring-[#2563eb] ring-offset-2 " : " ") +
                      (failed
                        ? " animate-pulse shadow-[0_0_0_3px_rgb(239_68_68/0.2)] motion-reduce:animate-none"
                        : "")
                    }
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold text-[#64748b]">
                        {component.eplId}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#334155]">
                        <span className={"size-2.5 rounded-full " + details.dot} />
                        {details.label}
                      </span>
                    </span>
                    <span className="mt-3 block text-sm font-bold leading-5 text-[#172033]">
                      {component.name}
                    </span>
                    <span className="mt-1 block text-[10px] font-semibold tracking-wide text-[#64748b]">
                      {typeLabel(component.type)}
                    </span>
                    <span className="mt-2 block truncate text-xs text-[#475569]">
                      {component.manufacturer}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded border border-dashed border-[#94a3b8] bg-white p-8 text-center text-sm text-[#64748b]">
            This signal path has no valid components.
          </p>
        )}
      </div>

      <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[#b8c4ce] bg-white px-4 py-2.5 text-xs text-[#475569]">
        {(["ok", "degraded", "failed"] as const).map((status) => (
          <span key={status} className="inline-flex items-center gap-2">
            <span className={"size-2.5 rounded-full " + STATUS_DETAILS[status].dot} />
            {STATUS_DETAILS[status].label}
          </span>
        ))}
      </footer>
    </section>
  );
}
