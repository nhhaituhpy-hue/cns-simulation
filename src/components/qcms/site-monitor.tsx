"use client";

import { useCallback, useRef, useState } from "react";
import type { Scenario, SensorState, SiteState } from "@/lib/types";
import { GroundStationsWindow } from "./ground-stations-window";
import {
  MAX_VISUALIZED_SENSORS,
  siteHasVisualizedSensor,
  toggleSensorVisualization,
} from "./qcms-utils";
import { SensorConfigWindow } from "./sensor-config-window";
import { SensorMonitoringModal } from "./sensor-monitoring-modal";
import { SensorStatusWindow } from "./sensor-status-window";
import type { SiteContextAction } from "./site-context-menu";
import { SiteStatisticsWindow } from "./site-statistics-window";
import { SiteSettingsWindow } from "./site-settings-window";

type SiteMonitorProps = {
  scenario: Scenario;
  groundStationsOpen?: boolean;
  onCloseGroundStations?: () => void;
  onMonitoringOpened?: () => void;
};

type ContextWindow = {
  action: Exclude<SiteContextAction, "monitoring">;
  site: SiteState;
  sensor: SensorState | null;
  openedAt: number;
};

export function SiteMonitor({
  scenario,
  groundStationsOpen = true,
  onCloseGroundStations,
  onMonitoringOpened,
}: SiteMonitorProps) {
  const [visualizedSensorIds, setVisualizedSensorIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [rangeRingSiteIds, setRangeRingSiteIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(
    () => scenario.sites[0]?.id ?? null,
  );
  const [selectedSensor, setSelectedSensor] = useState<{
    sensor: SensorState;
    openedAt: number;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [contextWindow, setContextWindow] =
    useState<ContextWindow | null>(null);
  const contextTriggerRef = useRef<HTMLButtonElement | null>(null);

  const visualizationLimitReached =
    visualizedSensorIds.size >= MAX_VISUALIZED_SENSORS;

  const closeSensor = useCallback(() => setSelectedSensor(null), []);

  function openSensor(sensor: SensorState) {
    setSelectedSensor({ sensor, openedAt: Date.now() });
    onMonitoringOpened?.();
  }

  function handleContextAction(
    action: SiteContextAction,
    site: SiteState,
    sensor: SensorState | null,
    trigger: HTMLButtonElement,
  ) {
    setSelectedSiteId(site.id);
    contextTriggerRef.current = trigger;

    if (action === "monitoring" && sensor) {
      openSensor(sensor);
      return;
    }

    if (action !== "monitoring") {
      setContextWindow({ action, site, sensor, openedAt: Date.now() });
    }
  }

  function closeContextWindow() {
    setContextWindow(null);
    requestAnimationFrame(() => contextTriggerRef.current?.focus());
  }

  function handleToggleVisualization(site: SiteState, sensor: SensorState) {
    setSelectedSiteId(site.id);
    const result = toggleSensorVisualization(
      visualizedSensorIds,
      sensor.id,
    );

    if (result.outcome === "limit-reached") {
      setNotice("Chỉ được hiển thị đồng thời tối đa 4 cảm biến.");
      return;
    }

    setVisualizedSensorIds(result.sensorIds);
    setNotice(
      result.outcome === "shown"
        ? `Đang hiển thị Sensor ${sensor.sensorLabel} tại ${site.name}.`
        : `Đã dừng hiển thị Sensor ${sensor.sensorLabel} tại ${site.name}.`,
    );

    if (!siteHasVisualizedSensor(site, result.sensorIds)) {
      setRangeRingSiteIds((current) => {
        const next = new Set(current);
        next.delete(site.id);
        return next;
      });
    }
  }

  function handleToggleRangeRing(site: SiteState) {
    setSelectedSiteId(site.id);
    if (!siteHasVisualizedSensor(site, visualizedSensorIds)) {
      return;
    }

    const next = new Set(rangeRingSiteIds);
    const wasEnabled = next.has(site.id);

    if (wasEnabled) {
      next.delete(site.id);
    } else {
      next.add(site.id);
    }

    setRangeRingSiteIds(next);
    setNotice(
      wasEnabled
        ? `Đã tắt vòng cự ly của ${site.name}.`
        : `Đã bật vòng cự ly của ${site.name}.`,
    );
  }

  function showSelectedSiteStatistics() {
    const selectedSite =
      scenario.sites.find((site) => site.id === selectedSiteId) ??
      scenario.sites[0];

    if (selectedSite) {
      setContextWindow({
        action: "statistics",
        site: selectedSite,
        sensor: null,
        openedAt: Date.now(),
      });
    }
  }

  return (
    <section
      aria-labelledby="qcms-monitor-title"
      className="relative min-h-[48rem] overflow-hidden bg-[#8e9192] font-mono"
    >
      <h2 id="qcms-monitor-title" className="sr-only">
        QCMS Site Monitor and Control
      </h2>

      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at 50% 48%, transparent 0 57px, rgb(58 61 62 / 0.5) 58px 59px), linear-gradient(90deg, transparent 49.9%, rgb(54 57 58 / 0.35) 50%, transparent 50.1%), linear-gradient(transparent 49.9%, rgb(54 57 58 / 0.35) 50%, transparent 50.1%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[48%] size-2 -translate-x-1/2 -translate-y-1/2 bg-[#242728]"
      />
      <p
        aria-hidden="true"
        className="absolute bottom-3 left-3 text-[9px] font-bold text-[#303334]"
      >
        SURVEILLANCE DISPLAY
      </p>
      <p
        aria-hidden="true"
        className="absolute right-3 top-3 text-[9px] text-[#303334]"
      >
        RANGE 325 NM
      </p>

      <div className="relative p-2 sm:p-4 lg:p-6">
        {groundStationsOpen ? (
          <GroundStationsWindow
            sites={scenario.sites}
            selectedSiteId={selectedSiteId}
            visualizedSensorIds={visualizedSensorIds}
            visualizationLimitReached={visualizationLimitReached}
            rangeRingSiteIds={rangeRingSiteIds}
            onSelectSite={(site) => setSelectedSiteId(site.id)}
            onToggleVisualization={handleToggleVisualization}
            onToggleRangeRing={handleToggleRangeRing}
            onOpenSensor={openSensor}
            onContextAction={handleContextAction}
            onShowStatistics={showSelectedSiteStatistics}
            onClose={() => onCloseGroundStations?.()}
          />
        ) : (
          <div className="mx-auto mt-24 max-w-md border-2 border-[#202a64] bg-[#b9bbbc] p-4 text-center text-[10px] text-[#292c2e] shadow-[6px_8px_0_rgb(28_31_34/0.25)]">
            CỬA SỔ GROUND STATIONS ĐÃ ĐÓNG. NHẤN SITES ĐỂ MỞ LẠI.
          </div>
        )}

        <p
          aria-live="polite"
          className="mx-auto mt-2 min-h-5 max-w-[1080px] border border-[#696d6f] bg-[#c6c8c9]/95 px-2 py-1 text-[9px] font-bold text-[#292c2e]"
        >
          {notice ?? "READY"}
        </p>
      </div>

      {selectedSensor ? (
        <SensorMonitoringModal
          scenarioId={scenario.id}
          sensor={selectedSensor.sensor}
          qcmsSymptoms={
            selectedSensor.sensor.id === scenario.targetSensorId
              ? scenario.hardwareFault?.qcmsSymptoms
              : undefined
          }
          now={selectedSensor.openedAt}
          onClose={closeSensor}
        />
      ) : null}

      {contextWindow?.action === "configuration" && contextWindow.sensor ? (
        <SensorConfigWindow
          scenarioId={scenario.id}
          sensor={contextWindow.sensor}
          onClose={closeContextWindow}
          now={contextWindow.openedAt}
        />
      ) : null}

      {contextWindow?.action === "status" && contextWindow.sensor ? (
        <SensorStatusWindow
          sensor={contextWindow.sensor}
          onClose={closeContextWindow}
        />
      ) : null}

      {contextWindow?.action === "statistics" ? (
        <SiteStatisticsWindow
          site={contextWindow.site}
          onClose={closeContextWindow}
        />
      ) : null}

      {contextWindow?.action === "settings" ? (
        <SiteSettingsWindow
          site={contextWindow.site}
          siteNumber={
            scenario.sites.findIndex(
              (site) => site.id === contextWindow.site.id,
            ) + 1
          }
          onClose={closeContextWindow}
        />
      ) : null}
    </section>
  );
}
