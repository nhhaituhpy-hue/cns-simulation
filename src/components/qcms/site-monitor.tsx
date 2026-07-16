"use client";

import { Info, Monitor, WarningCircle } from "@phosphor-icons/react";
import { useCallback, useRef, useState } from "react";
import type { Scenario, SensorState, SiteState } from "@/lib/types";
import {
  MAX_VISUALIZED_SENSORS,
  SENSOR_STATUS_DETAILS,
  siteHasVisualizedSensor,
  toggleSensorVisualization,
} from "./qcms-utils";
import { SensorConfigWindow } from "./sensor-config-window";
import { SensorMonitoringModal } from "./sensor-monitoring-modal";
import { SensorStatusWindow } from "./sensor-status-window";
import type { SiteContextAction } from "./site-context-menu";
import { SiteItem } from "./site-item";
import { SiteStatisticsWindow } from "./site-statistics-window";
import { SiteSettingsWindow } from "./site-settings-window";
import { StatusBadge } from "./status-badge";

type SiteMonitorProps = {
  scenario: Scenario;
  onMonitoringOpened?: () => void;
};

type ContextWindow = {
  action: Exclude<SiteContextAction, "monitoring">;
  site: SiteState;
  sensor: SensorState | null;
  openedAt: number;
};


export function SiteMonitor({ scenario, onMonitoringOpened }: SiteMonitorProps) {
  const [visualizedSensorIds, setVisualizedSensorIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [rangeRingSiteIds, setRangeRingSiteIds] = useState<Set<string>>(
    () => new Set(),
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

  return (
    <section
      aria-labelledby="qcms-monitor-title"
      className="overflow-hidden rounded-lg border border-[#94a3b8] bg-[#dce5eb] shadow-[0_8px_24px_rgb(15_23_42/0.12)]"
    >
      <header className="border-b border-[#172033] bg-[#263746] px-4 py-4 text-white sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#cbd5e1]">
              QCMS Site Monitor and Control
            </p>
            <h2 id="qcms-monitor-title" className="mt-1 text-lg font-bold">
              Trạng thái các site ADS-B
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded border border-[#64748b] bg-[#172033] px-3 py-2 font-mono text-xs tabular-nums text-[#e2e8f0]">
            <Monitor aria-hidden size={16} weight="regular" />
            {visualizedSensorIds.size}/{MAX_VISUALIZED_SENSORS} cảm biến hiển thị
          </div>
        </div>
      </header>

      <div className="border-b border-[#b8c4ce] bg-[#edf2f5] px-4 py-3 sm:px-5">
        <div className="flex items-start gap-2 text-xs leading-5 text-[#334155]">
          <Info aria-hidden className="mt-0.5 shrink-0" size={16} weight="fill" />
          <p>
            Chọn VA hoặc VB để hiển thị cảm biến. RR chỉ khả dụng khi site có ít nhất một cảm biến đang hiển thị.
          </p>
        </div>
        <div
          aria-label="Chú giải trạng thái cảm biến"
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
        >
          {Object.keys(SENSOR_STATUS_DETAILS).map((status) => (
            <StatusBadge
              key={status}
              status={status as keyof typeof SENSOR_STATUS_DETAILS}
              compact
            />
          ))}
        </div>
      </div>

      <div className="p-3 sm:p-4 lg:p-5">
        {scenario.sites.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#94a3b8] bg-white px-4 py-10 text-center">
            <WarningCircle
              aria-hidden
              size={28}
              weight="regular"
              className="mx-auto text-[#64748b]"
            />
            <p className="mt-3 text-sm font-semibold text-[#172033]">
              Kịch bản chưa có site
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {scenario.sites.slice(0, 8).map((site) => (
              <SiteItem
                key={site.id}
                site={site}
                visualizedSensorIds={visualizedSensorIds}
                visualizationLimitReached={visualizationLimitReached}
                rangeRingEnabled={rangeRingSiteIds.has(site.id)}
                onToggleVisualization={handleToggleVisualization}
                onToggleRangeRing={handleToggleRangeRing}
                onOpenSensor={openSensor}
                onContextAction={handleContextAction}
              />
            ))}
          </div>
        )}

        <p
          aria-live="polite"
          className="mt-3 min-h-5 text-xs font-medium text-[#334155]"
        >
          {notice}
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
            scenario.sites.findIndex((site) => site.id === contextWindow.site.id) + 1
          }
          onClose={closeContextWindow}
        />
      ) : null}

    </section>
  );
}
