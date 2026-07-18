"use client";

import { X } from "@phosphor-icons/react/dist/csr/X";
import type { SensorState, SiteState } from "@/lib/types";
import {
  createGroundStationSlots,
  MAX_VISUALIZED_SENSORS,
  PROCESSING_SITE_SLOT_COUNT,
  SENSOR_STATUS_DETAILS,
} from "./qcms-utils";
import type { SiteContextAction } from "./site-context-menu";
import { SiteItem } from "./site-item";

type GroundStationsWindowProps = {
  sites: readonly SiteState[];
  selectedSiteId: string | null;
  visualizedSensorIds: ReadonlySet<string>;
  visualizationLimitReached: boolean;
  rangeRingSiteIds: ReadonlySet<string>;
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
  onShowStatistics: () => void;
  onClose: () => void;
};

function LegacyButton({
  children,
  disabled = false,
  pressed = false,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  pressed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={pressed || undefined}
      onClick={onClick}
      className={`min-h-7 border px-3 font-mono text-[9px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172c9d] disabled:cursor-not-allowed disabled:text-[#777b7d] ${
        pressed
          ? "border-b-[#f4f5f5] border-l-[#55595b] border-r-[#f4f5f5] border-t-[#55595b] bg-[#aaaeb0] shadow-[inset_1px_1px_2px_rgb(0_0_0/0.28)]"
          : "border-b-[#55595b] border-l-[#f4f5f5] border-r-[#55595b] border-t-[#f4f5f5] bg-[#c8cacc] enabled:hover:bg-[#d8dadb]"
      }`}
    >
      {children}
    </button>
  );
}

function EmptySlot({
  slotNumber,
  processing,
}: {
  slotNumber: number;
  processing: boolean;
}) {
  return (
    <div
      aria-label={`Site slot ${slotNumber} chưa cấu hình`}
      className="hidden min-h-[6.75rem] border border-[#8a8e90] bg-[#b5b8b9] p-0.5 opacity-75 sm:block"
    >
      <div
        className={`flex h-6 items-center border border-b-[#696d6f] border-l-[#dfe1e2] border-r-[#696d6f] border-t-[#dfe1e2] px-1.5 font-mono text-[9px] ${
          processing ? "bg-[#aeb6c2]" : "bg-[#afb2b3]"
        }`}
      >
        <span className="tabular-nums">
          {String(slotNumber).padStart(2, "0")}
        </span>
        <span className="ml-auto text-[#626668]">---</span>
      </div>
      <div className="mt-0.5 grid gap-0.5">
        {["A", "B"].map((label) => (
          <div
            key={label}
            className="flex h-7 items-center border border-[#8b8f91] bg-[#b1b4b5] font-mono text-[8px] text-[#666a6c]"
          >
            <span className="grid h-full w-6 place-items-center border-r border-[#8b8f91] bg-[#9da1a3] font-bold">
              {label}
            </span>
            <span className="px-1.5">N/C</span>
          </div>
        ))}
      </div>
      <div className="mt-0.5 h-5 border border-[#8b8f91] bg-[#b1b4b5]" />
    </div>
  );
}

export function GroundStationsWindow({
  sites,
  selectedSiteId,
  visualizedSensorIds,
  visualizationLimitReached,
  rangeRingSiteIds,
  onSelectSite,
  onToggleVisualization,
  onToggleRangeRing,
  onOpenSensor,
  onContextAction,
  onShowStatistics,
  onClose,
}: GroundStationsWindowProps) {
  const slots = createGroundStationSlots(sites);
  const processingSlots = slots.slice(0, PROCESSING_SITE_SLOT_COUNT);
  const redundantSlots = slots.slice(PROCESSING_SITE_SLOT_COUNT);
  const unconfiguredCount = slots.filter((slot) => !slot.site).length;

  function renderSlot(
    slot: (typeof slots)[number],
    processing: boolean,
  ) {
    if (!slot.site) {
      return (
        <EmptySlot
          key={slot.slotNumber}
          slotNumber={slot.slotNumber}
          processing={processing}
        />
      );
    }

    return (
      <SiteItem
        key={slot.slotNumber}
        site={slot.site}
        siteNumber={slot.slotNumber}
        selected={slot.site.id === selectedSiteId}
        visualizedSensorIds={visualizedSensorIds}
        visualizationLimitReached={visualizationLimitReached}
        rangeRingEnabled={rangeRingSiteIds.has(slot.site.id)}
        onSelectSite={onSelectSite}
        onToggleVisualization={onToggleVisualization}
        onToggleRangeRing={onToggleRangeRing}
        onOpenSensor={onOpenSensor}
        onContextAction={onContextAction}
      />
    );
  }

  return (
    <section
      aria-labelledby="ground-stations-title"
      className="relative z-10 mx-auto w-full max-w-[1080px] border-2 border-[#202a64] bg-[#b9bbbc] shadow-[8px_10px_0_rgb(28_31_34/0.28)]"
    >
      <header className="flex h-7 items-center border-b border-[#202a64] bg-[#304a86] px-1.5 font-mono text-white">
        <span
          aria-hidden="true"
          className="mr-2 grid size-4 place-items-center border border-[#dbe4ff] bg-[#b9c8e9] text-[9px] text-[#172c67]"
        >
          X
        </span>
        <h2
          id="ground-stations-title"
          className="min-w-0 flex-1 truncate text-center text-[11px] font-bold tracking-wide"
        >
          GROUND STATIONS
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cửa sổ Ground Stations"
          className="grid size-5 place-items-center border border-b-[#172450] border-l-[#dbe4ff] border-r-[#172450] border-t-[#dbe4ff] bg-[#aebee0] text-[#172450] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X aria-hidden size={11} weight="bold" />
        </button>
      </header>

      <div className="border-b border-[#777b7d] bg-[#c7c9ca] px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[8px] text-[#292c2e]">
          {Object.entries(SENSOR_STATUS_DETAILS).map(([status, details]) => (
            <span
              key={status}
              className="inline-flex items-center gap-1 whitespace-nowrap"
              title={details.description}
            >
              <span
                aria-hidden="true"
                className="size-2.5 border border-[#55595b]"
                style={{ backgroundColor: details.signalColor }}
              />
              {details.label}
            </span>
          ))}
          <span className="ml-auto whitespace-nowrap font-bold tabular-nums">
            DISPLAY {visualizedSensorIds.size}/{MAX_VISUALIZED_SENSORS}
          </span>
        </div>
      </div>

      <div className="max-h-[31rem] overflow-auto bg-[#c3c6c7] p-1.5">
        <p className="mb-1 bg-[#9eaac0] px-2 py-1 text-center font-mono text-[9px] font-bold text-[#1e2530]">
          PROCESSING SYSTEM SITES 01-04
        </p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {processingSlots.map((slot) => renderSlot(slot, true))}
        </div>

        <p className="mb-1 mt-2 bg-[#afb2b3] px-2 py-1 text-center font-mono text-[9px] font-bold text-[#35393b]">
          REDUNDANT AND PASSIVE SITES 05-64
        </p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {redundantSlots.map((slot) => renderSlot(slot, false))}
        </div>

        {unconfiguredCount > 0 ? (
          <p className="mt-2 border border-[#8a8e90] bg-[#b1b4b5] px-2 py-2 text-center font-mono text-[9px] text-[#4f5355] sm:hidden">
            {unconfiguredCount} SITE CHƯA CẤU HÌNH ĐƯỢC THU GỌN
          </p>
        ) : null}
      </div>

      <footer className="grid grid-cols-1 gap-1 border-t border-[#777b7d] bg-[#b9bbbc] p-1.5 sm:grid-cols-3">
        <LegacyButton pressed>SENSOR LIST</LegacyButton>
        <LegacyButton
          disabled={sites.length === 0}
          onClick={onShowStatistics}
        >
          SENSOR STATISTICS
        </LegacyButton>
        <LegacyButton onClick={onClose}>CLOSE</LegacyButton>
      </footer>
    </section>
  );
}
