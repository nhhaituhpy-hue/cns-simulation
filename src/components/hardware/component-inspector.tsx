"use client";

import { ArrowDown, ArrowUp, CheckCircle, Warning, XCircle } from "@phosphor-icons/react";
import {
  CON_SON_HARDWARE,
  type ComponentStatus,
  type HardwareComponent,
} from "@/lib/hardware-model";

type ComponentInspectorProps = {
  component: HardwareComponent | null;
  components?: readonly HardwareComponent[];
  status?: ComponentStatus;
  markedAsFaulty?: boolean;
  onMarkedAsFaultyChange?: (marked: boolean) => void;
};

const STATUS_DETAILS = {
  ok: {
    label: "OK",
    icon: CheckCircle,
    className: "border-green-200 bg-green-50 text-green-700",
  },
  degraded: {
    label: "DEGRADED",
    icon: Warning,
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  failed: {
    label: "FAILED",
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-700",
  },
} satisfies Record<
  ComponentStatus,
  { label: string; icon: typeof CheckCircle; className: string }
>;

function fieldLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

export function ComponentInspector({
  component,
  components = CON_SON_HARDWARE,
  status,
  markedAsFaulty = false,
  onMarkedAsFaultyChange,
}: ComponentInspectorProps) {
  if (!component) {
    return (
      <aside className="rounded-lg border border-dashed border-[#94a3b8] bg-white p-6 text-center">
        <h2 className="text-sm font-bold text-[#334155]">Component Details</h2>
        <p className="mt-2 text-xs leading-5 text-[#64748b]">
          Select a component in the signal path to inspect its specifications.
        </p>
      </aside>
    );
  }

  const componentStatus = status ?? component.status;
  const statusDetails = STATUS_DETAILS[componentStatus];
  const StatusIcon = statusDetails.icon;
  const upstream = components.filter((candidate) =>
    candidate.connectedTo.includes(component.id),
  );
  const downstream = component.connectedTo
    .map((componentId) =>
      components.find((candidate) => candidate.id === componentId),
    )
    .filter((candidate): candidate is HardwareComponent => Boolean(candidate));

  return (
    <aside
      aria-labelledby="component-details-title"
      className="overflow-hidden rounded-lg border border-[#40566b] bg-white"
    >
      <header className="border-b border-[#172033] bg-[#263746] px-4 py-3 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#aebdca]">
          Component Details
        </p>
        <h2 id="component-details-title" className="mt-1 text-base font-bold">
          {component.name}
        </h2>
      </header>

      <div className="space-y-4 p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[#64748b]">EPL ID</dt>
            <dd className="font-mono font-bold text-[#172033]">{component.eplId}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[#64748b]">Manufacturer</dt>
            <dd className="font-semibold text-[#172033]">{component.manufacturer}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[#64748b]">Status</dt>
            <dd className={"inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-bold " + statusDetails.className}>
              <StatusIcon aria-hidden size={15} weight="fill" />
              {statusDetails.label}
            </dd>
          </div>
        </dl>

        <section className="border-t border-[#e2e8f0] pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#475569]">
            Specifications
          </h3>
          <dl className="mt-2 space-y-1.5">
            {Object.entries(component.specs).map(([key, value]) => (
              <div key={key} className="grid grid-cols-[minmax(7rem,1fr)_1.2fr] gap-3 text-xs">
                <dt className="text-[#64748b]">{fieldLabel(key)}</dt>
                <dd className="text-right font-mono font-semibold text-[#172033]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-[#e2e8f0] pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#475569]">
            Installation Notes
          </h3>
          {component.installationNotes?.length ? (
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#475569]">
              {component.installationNotes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span aria-hidden className="text-[#2563eb]">-</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[#64748b]">No installation notes.</p>
          )}
        </section>

        <section className="border-t border-[#e2e8f0] pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#475569]">
            Connected To
          </h3>
          <ul className="mt-2 space-y-2 text-xs text-[#334155]">
            {upstream.map((candidate) => (
              <li key={"up-" + candidate.id} className="flex items-center gap-2">
                <ArrowUp aria-hidden size={14} className="text-[#2563eb]" />
                <span>{candidate.name} ({candidate.eplId})</span>
              </li>
            ))}
            {downstream.map((candidate) => (
              <li key={"down-" + candidate.id} className="flex items-center gap-2">
                <ArrowDown aria-hidden size={14} className="text-[#2563eb]" />
                <span>{candidate.name} ({candidate.eplId})</span>
              </li>
            ))}
            {upstream.length === 0 && downstream.length === 0 ? (
              <li className="text-[#64748b]">No registered connections.</li>
            ) : null}
          </ul>
        </section>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded border border-[#b8c4ce] bg-[#f8fafc] px-3 text-sm font-bold text-[#263746]">
          <input
            type="checkbox"
            checked={markedAsFaulty}
            onChange={(event) => onMarkedAsFaultyChange?.(event.target.checked)}
            disabled={!onMarkedAsFaultyChange}
            className="size-4 accent-[#dc2626]"
          />
          Đánh dấu phần cứng sự cố
        </label>
      </div>
    </aside>
  );
}
