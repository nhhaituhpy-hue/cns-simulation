"use client";

import type {
  DmeEditableValue,
  DmeIndicatorColor,
  DmeParameterStatus,
} from "@/lib/dme-types";
import {
  resolveDmeField,
  resolveDmeStatus,
  useDmePmdtStore,
} from "@/stores/dme-pmdt-store";

export type DmeVisualStatus = DmeIndicatorColor | DmeParameterStatus;

const statusClasses: Record<DmeVisualStatus, string> = {
  green: "border-[#166534] bg-[#22c55e] text-[#052e16]",
  yellow: "border-[#854d0e] bg-[#eab308] text-[#422006]",
  red: "border-[#991b1b] bg-[#ef4444] text-white",
  gray: "border-[#475569] bg-[#64748b] text-white",
  normal: "border-[#1d6837] bg-[#0f3a1f] text-[#bbf7d0]",
  warning: "border-[#745f17] bg-[#3a2f0f] text-[#fef08a]",
  alarm: "border-[#7f1d1d] bg-[#3a0f0f] text-[#fecaca]",
};

const statusLabels: Record<DmeVisualStatus, string> = {
  green: "Bình thường",
  yellow: "Cảnh báo",
  red: "Báo động",
  gray: "Không hoạt động",
  normal: "Bình thường",
  warning: "Cảnh báo",
  alarm: "Báo động",
};

export function dmeFieldMetadata(
  fieldId: string,
  label: string,
  value: DmeEditableValue,
  status?: DmeVisualStatus,
) {
  return {
    "data-dme-field-id": fieldId,
    "data-dme-field-label": label,
    "data-dme-field-value": String(value ?? ""),
    "data-dme-field-type": typeof value,
    ...(status ? { "data-dme-field-status": status } : {}),
  };
}

export function DmeIndicator({ color }: { color: DmeIndicatorColor }) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      <span
        aria-hidden
        className={`inline-block size-3 rounded-sm border border-black/30 ${statusClasses[color]}`}
      />
      <span className="sr-only">{statusLabels[color]}</span>
    </span>
  );
}

export function DmeValueCell({
  fieldId,
  label,
  value,
  status = "normal",
  className = "",
}: {
  fieldId: string;
  label: string;
  value: DmeEditableValue;
  status?: DmeVisualStatus;
  className?: string;
}) {
  const overrides = useDmePmdtStore((state) => state.overrides);
  const resolvedValue = resolveDmeField(value, fieldId, overrides);
  const resolvedStatus = resolveDmeStatus(status, fieldId, overrides);

  return (
    <span
      {...dmeFieldMetadata(fieldId, label, resolvedValue, resolvedStatus)}
      className={`inline-flex min-h-6 min-w-16 items-center justify-center border px-2 font-mono text-[11px] font-semibold tabular-nums ${statusClasses[resolvedStatus]} ${className}`}
    >
      {String(resolvedValue)}
      <span className="sr-only">, {statusLabels[resolvedStatus]}</span>
    </span>
  );
}

export function ScreenTabs({
  tabs,
}: {
  tabs: Array<{
    id: string;
    label: string;
    active: boolean;
    disabled?: boolean;
    onSelect?: () => void;
  }>;
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 border-b border-[#334155] bg-[#0f172a] px-3 pt-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.active}
          aria-disabled={tab.disabled || undefined}
          disabled={tab.disabled}
          title={tab.disabled ? "Chưa khả dụng" : undefined}
          onClick={tab.onSelect}
          className={`min-h-8 border border-b-0 px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] ${
            tab.disabled
              ? "cursor-not-allowed border-[#334155] text-[#64748b] opacity-50"
              : tab.active
                ? "border-[#475569] bg-[#1e293b] text-white"
                : "border-[#334155] bg-[#111827] text-[#94a3b8] hover:bg-[#1e293b]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function ScreenFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="min-h-full bg-[#0a0e1a] p-4 text-xs text-[#cbd5e1]">
      {children}
    </section>
  );
}

export function PmdtPanel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-[#334155] bg-[#111827] p-3 ${className}`}>
      <h2 className="mb-3 text-xs font-bold text-[#93c5fd]">{title}</h2>
      {children}
    </section>
  );
}
