"use client";

import type { DmeViewId } from "@/lib/dme-types";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { RmsDigitalIo } from "./rms-digital-io";
import { RmsMaintenanceAlerts } from "./rms-maintenance-alerts";
import { RmsPowerSupply } from "./rms-power-supply";
import { RmsAdData } from "./rms-ad-data";
import { ScreenTabs } from "./screen-primitives";

const tabs: readonly {
  id: string;
  label: string;
  viewId: DmeViewId;
}[] = [
  { id: "maintenance", label: "Maintenance Alerts/Alarms", viewId: "rms-maintenance-alerts" },
  { id: "power", label: "Power Supply Data", viewId: "rms-power-supply" },
  { id: "ad", label: "A/D Data", viewId: "rms-ad-data" },
  { id: "digital", label: "Digital I/O", viewId: "rms-digital-io" },
];

export function RmsDataLayout() {
  const activeView = useDmePmdtStore((state) => state.activeView);
  const timestamp = useDmePmdtStore((state) => state.data.timestamp);
  const openView = useDmePmdtStore((state) => state.openView);

  return (
    <section className="flex min-h-full flex-col" aria-label="RMS Data">
      <PmdtToolbar title="RMS Data" />
      <ScreenTabs tabs={tabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        active: tab.viewId === activeView,
        onSelect: () => openView("rms-data", tab.viewId, ["RMS", "Data", tab.label], tab.label),
      }))} />
      <div className="dme-pmdt-rms-data-content min-h-0 flex-1 overflow-auto bg-[#0a0e1a]">
        <time className="dme-pmdt-screen-time">{timestamp}</time>
        {activeView === "rms-digital-io" ? (
          <RmsDigitalIo />
        ) : activeView === "rms-power-supply" ? (
          <RmsPowerSupply />
        ) : activeView === "rms-ad-data" ? (
          <RmsAdData />
        ) : (
          <RmsMaintenanceAlerts />
        )}
      </div>
    </section>
  );
}
