"use client";

import type { VorViewId } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { MonitorIntegral } from "./monitor-integral";
import { MonitorStatus } from "./monitor-status";
import { MonitorSidebandVswr } from "./monitor-sideband-vswr";
import { MonitorNotch } from "./monitor-notch";

const tabs: readonly { id: string; label: string; enabled: boolean; viewId?: VorViewId }[] = [
  { id: "integral", label: "Integral", enabled: true, viewId: "monitor-integral" },
  { id: "notch", label: "Notch Monitor", enabled: true, viewId: "monitor-notch" },
  { id: "vswr", label: "Sideband Antenna VSWR", enabled: true, viewId: "monitor-sideband-vswr" },
];

export function MonitorDataLayout() {
  const activeView = useVorPmdtStore((state) => state.activeView);
  const activeMenuPath = useVorPmdtStore((state) => state.activeMenuPath);
  const openView = useVorPmdtStore((state) => state.openView);
  const monitorNumber = activeMenuPath[0] === "Monitor 1" ? 1 : activeMenuPath[0] === "Monitor 2" ? 2 : undefined;
  const visibleTabs = monitorNumber
    ? [
        { id: "integral", label: "Integral", enabled: true, viewId: "monitor-integral" as const },
        { id: "status", label: "Status", enabled: true, viewId: "monitor-status" as const },
      ]
    : tabs;
  const title = monitorNumber ? `Monitor ${monitorNumber} Data` : "All Monitor Data";

  return (
    <section className="flex min-h-full flex-col" aria-label={title}>
      <PmdtToolbar title={title} />
      <div className="pmdt-monitor-tabbar flex gap-1 border-b border-[#334155] bg-[#0f172a] px-3 pt-2" role="tablist" aria-label="Monitor Data tabs">
          {visibleTabs.map((tab) => {
          const active = tab.viewId === activeView;
          return (
            <button key={tab.id} type="button" role="tab" aria-selected={active} aria-disabled={!tab.enabled || undefined} title={!tab.enabled ? "Chưa khả dụng" : undefined} onClick={() => {
              if (!tab.enabled || !tab.viewId) return;
                openView("monitor-data", tab.viewId, [monitorNumber ? `Monitor ${monitorNumber}` : "Monitors", "Data", tab.label], tab.label);
            }} className={`min-h-8 border border-b-0 px-3 text-[11px] font-medium ${!tab.enabled ? "cursor-not-allowed border-[#273449] text-[#64748b] opacity-50" : active ? "border-[#475569] bg-[#1e293b] text-white" : "border-[#334155] bg-[#111827] text-[#94a3b8] hover:text-white"}`}>
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="pmdt-monitor-data-content min-h-0 flex-1 overflow-auto">
        {monitorNumber && activeView === "monitor-status" ? (
          <MonitorStatus monitorNumber={monitorNumber} />
        ) : monitorNumber ? (
          <MonitorIntegral monitorNumber={monitorNumber} />
        ) : activeView === "monitor-sideband-vswr" ? (
          <MonitorSidebandVswr />
        ) : activeView === "monitor-notch" ? (
          <MonitorNotch />
        ) : (
          <MonitorIntegral />
        )}
      </div>
    </section>
  );
}
