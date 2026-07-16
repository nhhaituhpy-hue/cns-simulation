"use client";

import { useCallback, useState, type MouseEvent } from "react";
import type { SensorState, SiteState } from "@/lib/types";
import { SENSOR_STATUS_DETAILS } from "./qcms-utils";
import {
  SiteContextMenu,
  type SiteContextAction,
} from "./site-context-menu";

type SiteItemProps = {
  site: SiteState;
  siteNumber: number;
  selected: boolean;
  visualizedSensorIds: ReadonlySet<string>;
  visualizationLimitReached: boolean;
  rangeRingEnabled: boolean;
  onSelectSite: (site: SiteState) => void;
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

type SensorRowProps = {
  site: SiteState;
  label: "A" | "B";
  sensor: SensorState | null;
  isVisualized: boolean;
  visualizationLimitReached: boolean;
  onToggleVisualization: SiteItemProps["onToggleVisualization"];
  onOpenSensor: SiteItemProps["onOpenSensor"];
};

function SensorRow({
  site,
  label,
  sensor,
  isVisualized,
  visualizationLimitReached,
  onToggleVisualization,
  onOpenSensor,
}: SensorRowProps) {
  if (!sensor) {
    return (
      <div
        aria-label={`Sensor ${label} tại ${site.name} chưa cấu hình`}
        className="grid grid-cols-[minmax(0,1fr)_2.35rem] gap-0.5"
      >
        <div className="flex h-7 items-center border border-[#85898c] bg-[#b7b9ba] text-[9px] text-[#5c6062]">
          <span className="grid h-full w-6 place-items-center border-r border-[#85898c] bg-[#9da1a3] font-bold text-[#303234]">
            {label}
          </span>
          <span className="truncate px-1.5">N/C</span>
        </div>
        <button
          type="button"
          disabled
          className="h-7 cursor-not-allowed border border-[#85898c] bg-[#b0b2b3] text-[8px] font-bold text-[#666a6c]"
        >
          V{label}
        </button>
      </div>
    );
  }

  const toggleDisabled = visualizationLimitReached && !isVisualized;
  const status = SENSOR_STATUS_DETAILS[sensor.status];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_2.35rem] gap-0.5">
      <button
        type="button"
        onClick={(event) => onOpenSensor(sensor, event.currentTarget)}
        aria-label={`Mở giám sát Sensor ${label} tại ${site.name}, trạng thái ${status.label}`}
        title={status.description}
        className="flex h-7 min-w-0 items-center border border-b-[#55595b] border-l-[#eceeef] border-r-[#55595b] border-t-[#eceeef] bg-[#c8cacc] text-left text-[9px] text-[#202325] focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172c9d]"
      >
        <span
          aria-hidden="true"
          className="grid h-full w-6 shrink-0 place-items-center border-r border-[#6f7375] font-bold text-[#111]"
          style={{ backgroundColor: status.signalColor }}
        >
          {label}
        </span>
        <span className="truncate px-1.5 font-semibold">{status.label}</span>
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
        className={`h-7 border text-[8px] font-bold focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172c9d] disabled:cursor-not-allowed disabled:text-[#74787a] ${
          isVisualized
            ? "border-b-[#eceeef] border-l-[#55595b] border-r-[#eceeef] border-t-[#55595b] bg-[#f1e765] shadow-[inset_1px_1px_2px_rgb(0_0_0/0.3)]"
            : "border-b-[#55595b] border-l-[#eceeef] border-r-[#55595b] border-t-[#eceeef] bg-[#c8cacc] enabled:hover:bg-[#d8dadb]"
        }`}
      >
        V{label}
      </button>
    </div>
  );
}

export function SiteItem({
  site,
  siteNumber,
  selected,
  visualizedSensorIds,
  visualizationLimitReached,
  rangeRingEnabled,
  onSelectSite,
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
    onSelectSite(site);
    const rect = event.currentTarget.getBoundingClientRect();
    const requestedX = event.clientX || rect.left;
    const requestedY = event.clientY || rect.bottom;
    const menuWidth = 256;
    const menuHeight = 390;
    const margin = 8;

    setContextMenu({
      x: Math.max(
        margin,
        Math.min(requestedX, window.innerWidth - menuWidth - margin),
      ),
      y: Math.max(
        margin,
        Math.min(requestedY, window.innerHeight - menuHeight - margin),
      ),
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
    <article
      className={`min-w-0 border bg-[#bfc2c3] p-0.5 ${
        selected
          ? "border-[#172c9d] shadow-[0_0_0_1px_#172c9d]"
          : "border-[#777b7d]"
      }`}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={Boolean(contextMenu)}
        onClick={openContextMenu}
        onContextMenu={openContextMenu}
        className="flex h-6 w-full min-w-0 items-center border border-b-[#55595b] border-l-[#e8eaeb] border-r-[#55595b] border-t-[#e8eaeb] bg-[#aeb6c2] px-1.5 text-left font-mono text-[9px] text-[#202325] focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172c9d]"
      >
        <span className="mr-1 shrink-0 tabular-nums">
          {String(siteNumber).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1 truncate font-bold" title={site.name}>
          {site.name}
        </span>
        <span className="ml-1 shrink-0 tabular-nums">
          {Number(sensorAVisualized) + Number(sensorBVisualized)}/
          {configuredSensorCount}
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

      <div className="mt-0.5 grid gap-0.5">
        <SensorRow
          site={site}
          label="A"
          sensor={site.sensorA}
          isVisualized={sensorAVisualized}
          visualizationLimitReached={visualizationLimitReached}
          onToggleVisualization={onToggleVisualization}
          onOpenSensor={onOpenSensor}
        />
        <SensorRow
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
        className={`mt-0.5 h-6 w-full border text-[8px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172c9d] disabled:cursor-not-allowed disabled:text-[#74787a] ${
          rangeRingEnabled
            ? "border-b-[#eceeef] border-l-[#55595b] border-r-[#eceeef] border-t-[#55595b] bg-[#f1e765] shadow-[inset_1px_1px_2px_rgb(0_0_0/0.3)]"
            : "border-b-[#55595b] border-l-[#eceeef] border-r-[#55595b] border-t-[#eceeef] bg-[#c8cacc] enabled:hover:bg-[#d8dadb]"
        }`}
      >
        RR
      </button>
    </article>
  );
}
