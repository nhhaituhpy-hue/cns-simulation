"use client";

import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { MonitorAlarmLimits } from "./monitor-alarm-limits";
import { ScreenTabs } from "./screen-primitives";

export function MonitorConfigLayout() {
  const activeView = useDmePmdtStore((state) => state.activeView);
  const openView = useDmePmdtStore((state) => state.openView);
  return (
    <section className="flex min-h-full flex-col" aria-label="Monitor Configuration">
      <PmdtToolbar title="Monitor Configuration" />
      <ScreenTabs tabs={[
        { id: "general", label: "General", active: false, disabled: true },
        { id: "alarm-limits", label: "Alarm Limits", active: activeView === "monitor-alarm-limits", onSelect: () => openView("monitor-config", "monitor-alarm-limits", ["Monitors", "Configuration", "Alarm Limits"], "Alarm Limits") },
      ]} />
      <div className="min-h-0 flex-1 overflow-auto"><MonitorAlarmLimits /></div>
    </section>
  );
}
