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
  green: "dme-pmdt-value--green",
  yellow: "dme-pmdt-value--yellow",
  red: "dme-pmdt-value--red",
  gray: "dme-pmdt-value--gray",
  normal: "dme-pmdt-value--green",
  warning: "dme-pmdt-value--yellow",
  alarm: "dme-pmdt-value--red",
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
  const label = color === "green" ? "G" : color === "yellow" ? "Y" : color === "red" ? "R" : "";
  return (
    <span className="pmdt-indicator-wrap">
      <span aria-hidden className={`pmdt-indicator pmdt-indicator--${color}`}>{label}</span>
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
  formatValue,
}: {
  fieldId: string;
  label: string;
  value: DmeEditableValue;
  status?: DmeVisualStatus;
  className?: string;
  formatValue?: (value: DmeEditableValue) => string;
}) {
  const overrides = useDmePmdtStore((state) => state.overrides);
  const resolvedValue = resolveDmeField(value, fieldId, overrides);
  const resolvedStatus = resolveDmeStatus(status, fieldId, overrides);

  return (
    <span
      {...dmeFieldMetadata(fieldId, label, resolvedValue, resolvedStatus)}
      className={`dme-pmdt-value ${statusClasses[resolvedStatus]} ${className}`}
    >
      {resolvedValue === null ? "" : formatValue ? formatValue(resolvedValue) : String(resolvedValue)}
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
    <div role="tablist" className="dme-pmdt-tabs">
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
          className={`dme-pmdt-tab ${
            tab.disabled
              ? "dme-pmdt-tab--disabled"
              : tab.active
                ? "dme-pmdt-tab--active"
                : "dme-pmdt-tab--idle"
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
    <section aria-label={title} className="dme-pmdt-screen-frame">
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
    <section className={`dme-pmdt-panel ${className}`}>
      <h2 className="dme-pmdt-panel-title">{title}</h2>
      {children}
    </section>
  );
}
