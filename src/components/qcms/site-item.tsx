"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { Crosshair, Eye, EyeSlash, Monitor } from "@phosphor-icons/react";
import type { SensorState, SiteState } from "@/lib/types";
import { SENSOR_STATUS_DETAILS } from "./qcms-utils";
import {
  SiteContextMenu,
  type SiteContextAction,
} from "./site-context-menu";
import { StatusBadge } from "./status-badge";

type SiteItemProps = {
  site: SiteState;
  visualizedSensorIds: ReadonlySet<string>;
  visualizationLimitReached: boolean;
  rangeRingEnabled: boolean;
  onToggleVisualization: (site: SiteState, sensor: SensorState) => void;
  onToggleRangeRing: (site: SiteState) => void;
  onOpenSensor: (sensor: SensorState, trigger: HTMLButtonElement) => void;
  onContextAction: (
    action: SiteContextAction,
    site: SiteState,
    sensor: SensorState | null,
    trigger: HTMLButtonElement,
  ) => void;
};

type SensorPanelProps = {
  site: SiteState;
  label: "A" | "B";
  sensor: SensorState | null;
  isVisualized: boolean;
  visualizationLimitReached: boolean;
  onToggleVisualization: SiteItemProps["onToggleVisualization"];
  onOpenSensor: SiteItemProps["onOpenSensor"];
};

function SensorPanel({
  site,
  label,
  sensor,
  isVisualized,
  visualizationLimitReached,
  onToggleVisualization,
  onOpenSensor,
}: SensorPanelProps) {
  if (!sensor) {
    return (
      <div className="rounded border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-4 text-center">
        <p className="text-sm font-semibold text-[#475569]">Sensor {label}</p>
        <p className="mt-2 text-xs text-[#64748b]">Không cấu hình</p>
      </div>
    );
  }

  const toggleDisabled = visualizationLimitReached && !isVisualized;
  const statusLabel = SENSOR_STATUS_DETAILS[sensor.status].label;

  return (
    <div className="min-w-0 rounded border border-[#cbd5e1] bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
      <button
        type="button"
        onClick={(event) => onOpenSensor(sensor, event.currentTarget)}
        className="group w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        aria-label={`Mở giám sát Sensor ${label} tại ${site.name}, trạng thái ${statusLabel}`}
      >
        <div className="flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#172033]">
            <Monitor aria-hidden size={18} weight="regular" />
            Sensor {label}
          </span>
          <span className="text-xs font-bold text-[var(--accent)] group-hover:underline">
            Terminal SSH &rarr;
          </span>
        </div>
        <span className="mt-2.5 block">
          <StatusBadge status={sensor.status} compact={false} />
        </span>
      </button>

      <button
        type="button"
        onClick={() => onToggleVisualization(site, sensor)}
        disabled={toggleDisabled}
        aria-pressed={isVisualized}
        aria-label={`${isVisualized ? "Dừng hiển thị" : "Hiển thị"} Sensor ${label} tại ${site.name}`}
        title={
          toggleDisabled
            ? "Đã đạt giới hạn 4 cảm biến đang hiển thị"
            : undefined
        }
        className={`mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded border px-2 text-sm font-semibold transition-[background-color,border-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${
          isVisualized
            ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-active)]"
            : "border-[#cbd5e1] bg-white text-[#334155] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        }`}
      >
        {isVisualized ? (
          <Eye aria-hidden size={16} weight="fill" />
        ) : (
          <EyeSlash aria-hidden size={16} weight="regular" />
        )}
        {label === "A" ? "VA" : "VB"}
      </button>
    </div>
  );
}

export function SiteItem({
  site,
  visualizedSensorIds,
  visualizationLimitReached,
  rangeRingEnabled,
  onToggleVisualization,
  onToggleRangeRing,
  onOpenSensor,
  onContextAction,
}: SiteItemProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    trigger: HTMLButtonElement;
  } | null>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  function openContextMenu(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const requestedX = event.clientX || rect.left;
    const requestedY = event.clientY || rect.bottom;
    const menuWidth = 256;
    const menuHeight = 390;
    const margin = 8;

    setContextMenu({
      x: Math.max(margin, Math.min(requestedX, window.innerWidth - menuWidth - margin)),
      y: Math.max(margin, Math.min(requestedY, window.innerHeight - menuHeight - margin)),
      trigger: event.currentTarget,
    });
  }
  const sensorAVisualized = Boolean(
    site.sensorA && visualizedSensorIds.has(site.sensorA.id),
  );
  const sensorBVisualized = Boolean(
    site.sensorB && visualizedSensorIds.has(site.sensorB.id),
  );
  const hasVisualizedSensor = sensorAVisualized || sensorBVisualized;
  const configuredSensorCount =
    Number(site.sensorA !== null) + Number(site.sensorB !== null);

  return (
    <article className="min-w-[300px] sm:min-w-[380px] max-w-[420px] rounded-lg border border-[#b8c4ce] bg-[#eef3f6] p-4 shadow-[0_2px_6px_rgb(15_23_42/0.08)]">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={Boolean(contextMenu)}
        onClick={openContextMenu}
        onContextMenu={openContextMenu}
        className="flex w-full items-center justify-between gap-3 border-b border-[#cbd5e1] pb-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      >
        <span className="truncate text-base font-bold text-[#172033]" title={site.name}>
          {site.name}
        </span>
        <span className="font-mono text-xs tabular-nums text-[#475569]">
          {Number(sensorAVisualized) + Number(sensorBVisualized)}/{configuredSensorCount} hiển thị
        </span>
      </button>

      {contextMenu ? (
        <SiteContextMenu
          site={site}
          x={contextMenu.x}
          y={contextMenu.y}
          trigger={contextMenu.trigger}
          onClose={closeContextMenu}
          onSelect={onContextAction}
        />
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <SensorPanel
          site={site}
          label="A"
          sensor={site.sensorA}
          isVisualized={sensorAVisualized}
          visualizationLimitReached={visualizationLimitReached}
          onToggleVisualization={onToggleVisualization}
          onOpenSensor={onOpenSensor}
        />
        <SensorPanel
          site={site}
          label="B"
          sensor={site.sensorB}
          isVisualized={sensorBVisualized}
          visualizationLimitReached={visualizationLimitReached}
          onToggleVisualization={onToggleVisualization}
          onOpenSensor={onOpenSensor}
        />
      </div>

      <button
        type="button"
        onClick={() => onToggleRangeRing(site)}
        disabled={!hasVisualizedSensor}
        aria-pressed={rangeRingEnabled}
        aria-label={`${rangeRingEnabled ? "Tắt" : "Bật"} vòng cự ly cho ${site.name}`}
        className={`mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded border px-3 text-sm font-semibold transition-[background-color,border-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-[#d4d4d8] disabled:bg-[#f4f4f5] disabled:text-[#71717a] motion-reduce:transition-none ${
          rangeRingEnabled
            ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-active)]"
            : "border-[#cbd5e1] bg-white text-[#334155] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        }`}
      >
        <Crosshair aria-hidden size={16} weight={rangeRingEnabled ? "bold" : "regular"} />
        RR
      </button>
    </article>
  );
}
