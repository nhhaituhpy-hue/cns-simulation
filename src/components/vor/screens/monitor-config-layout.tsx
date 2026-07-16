"use client";

import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { MonitorAlarmLimits } from "./monitor-alarm-limits";

export function MonitorConfigLayout() {
  const activeView = useVorPmdtStore((state) => state.activeView);
  const openView = useVorPmdtStore((state) => state.openView);

  return (
    <section className="flex min-h-full flex-col" aria-label="Monitor Configuration">
      <PmdtToolbar title="Monitor Configuration" />
      <div className="flex gap-1 border-b border-[#334155] bg-[#0f172a] px-3 pt-2" role="tablist" aria-label="Monitor Configuration tabs">
        <button type="button" role="tab" aria-selected={activeView === "monitor-alarm-limits"} onClick={() => openView("monitor-config", "monitor-alarm-limits", ["Monitors", "Configuration", "Alarm Limits"], "Alarm Limits")} className="min-h-8 border border-b-0 border-[#475569] bg-[#1e293b] px-3 text-[11px] font-medium text-white">
          Alarm Limits
        </button>
        <button type="button" role="tab" aria-selected="false" aria-disabled="true" title="Chưa khả dụng" className="min-h-8 cursor-not-allowed border border-b-0 border-[#273449] px-3 text-[11px] text-[#64748b] opacity-50">
          General
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto"><MonitorAlarmLimits /></div>
    </section>
  );
}
