"use client";

import type { VorViewId } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { RmsDigitalIo } from "./rms-digital-io";
import { RmsMaintenanceAlerts } from "./rms-maintenance-alerts";
import { RmsPowerSupply } from "./rms-power-supply";
import { RmsTemperature } from "./rms-temperature";
import { RmsAdData } from "./rms-ad-data";

const tabs: readonly {
  id: string;
  label: string;
  enabled: boolean;
  viewId?: VorViewId;
}[] = [
  { id: "maintenance", label: "Maintenance Alerts/Alarms", enabled: true, viewId: "rms-maintenance-alerts" },
  { id: "power", label: "Power Supply Data", enabled: true, viewId: "rms-power-supply" },
  { id: "digital", label: "Digital I/O", enabled: true, viewId: "rms-digital-io" },
  { id: "temperature", label: "Temperature Data", enabled: true, viewId: "rms-temperature" },
  { id: "ad", label: "A/D Data", enabled: true, viewId: "rms-ad-data" },
];

export function RmsDataLayout() {
  const activeView = useVorPmdtStore((state) => state.activeView);
  const timestamp = useVorPmdtStore((state) => state.data.timestamp);
  const openView = useVorPmdtStore((state) => state.openView);

  return (
    <section className="pmdt-rms-data-layout flex min-h-full flex-col" aria-label="RMS Data">
      <PmdtToolbar title="RMS Data" />
      <div className="pmdt-rms-tabbar flex items-end gap-1 border-b border-[#334155] bg-[#0f172a] px-3 pt-2">
        <div className="flex min-w-0 flex-1 items-end gap-1" role="tablist" aria-label="RMS Data tabs">
          {tabs.map((tab) => {
            const active = tab.viewId === activeView;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-disabled={!tab.enabled || undefined}
                title={!tab.enabled ? "Chưa khả dụng" : undefined}
                onClick={() => {
                  if (!tab.enabled || !tab.viewId) return;
                  openView("rms-data", tab.viewId, ["RMS", "Data", tab.label], tab.label);
                }}
                className={`min-h-8 border border-b-0 px-3 text-[11px] font-medium ${
                  !tab.enabled
                    ? "cursor-not-allowed border-[#273449] text-[#64748b] opacity-50"
                    : active
                      ? "border-[#475569] bg-[#1e293b] text-white"
                      : "border-[#334155] bg-[#111827] text-[#94a3b8] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="pmdt-rms-data-content min-h-0 flex-1 overflow-auto">
        <time className="pmdt-monitor-date">{timestamp}</time>
        {activeView === "rms-digital-io" ? (
          <RmsDigitalIo />
        ) : activeView === "rms-power-supply" ? (
          <RmsPowerSupply />
        ) : activeView === "rms-temperature" ? (
          <RmsTemperature />
        ) : activeView === "rms-ad-data" ? (
          <RmsAdData />
        ) : (
          <RmsMaintenanceAlerts />
        )}
      </div>
    </section>
  );
}
