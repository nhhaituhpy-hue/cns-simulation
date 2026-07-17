"use client";

import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { MonitorDataTable } from "./monitor-integral";
import { ScreenTabs } from "./screen-primitives";

export function MonitorDataLayout() {
  const activeView = useDmePmdtStore((state) => state.activeView);
  const openView = useDmePmdtStore((state) => state.openView);
  return (
    <section className="flex min-h-full flex-col" aria-label="All Monitor Data">
      <PmdtToolbar title="All Monitor Data" />
      <ScreenTabs tabs={[
        { id: "integral", label: "Integral", active: activeView === "monitor-integral", onSelect: () => openView("monitor-data", "monitor-integral", ["Monitors", "Data", "Integral"], "Integral") },
        { id: "standby", label: "Standby", active: activeView === "monitor-standby", onSelect: () => openView("monitor-data", "monitor-standby", ["Monitors", "Data", "Standby"], "Standby") },
      ]} />
      <div className="min-h-0 flex-1 overflow-auto">
        <MonitorDataTable kind={activeView === "monitor-standby" ? "standby" : "integral"} />
      </div>
    </section>
  );
}
