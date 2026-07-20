"use client";

import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { MonitorAlarmLimits } from "./monitor-alarm-limits";
import { MonitorConfigGeneral } from "./monitor-config-general";

export function MonitorConfigLayout() {
  const activeView = useDmePmdtStore((state) => state.activeView);
  const openView = useDmePmdtStore((state) => state.openView);

  return (
    <section className="flex min-h-full flex-col" aria-label="Monitor Configuration">
      <PmdtToolbar title="Monitor Configuration" />
      <div className="flex gap-1 border-b border-[#334155] bg-[#0f172a] px-3 pt-2" role="tablist" aria-label="Monitor Configuration tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "monitor-alarm-limits"}
          onClick={() => openView("monitor-config", "monitor-alarm-limits", ["Monitors", "Configuration", "Alarm Limits"], "Alarm Limits")}
          className={`min-h-8 border border-b-0 px-3 text-[11px] font-medium transition-colors ${
            activeView === "monitor-alarm-limits"
              ? "border-[#475569] bg-[#1e293b] text-white"
              : "border-[#334155] bg-[#111827] text-[#94a3b8] hover:text-white"
          }`}
        >
          Alarm Limits
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "monitor-config-general"}
          onClick={() => openView("monitor-config", "monitor-config-general", ["Monitors", "Configuration", "General"], "General")}
          className={`min-h-8 border border-b-0 px-3 text-[11px] font-medium transition-colors ${
            activeView === "monitor-config-general"
              ? "border-[#475569] bg-[#1e293b] text-white"
              : "border-[#334155] bg-[#111827] text-[#94a3b8] hover:text-white"
          }`}
        >
          General
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-[#0a0e1a]">
        {activeView === "monitor-config-general" ? <MonitorConfigGeneral /> : <MonitorAlarmLimits />}
      </div>
    </section>
  );
}
