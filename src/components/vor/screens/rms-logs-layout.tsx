"use client";

import type { VorViewId } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { RmsLogsAlarms } from "./rms-logs-alarms";
import { RmsLogsMaintenance } from "./rms-logs-maintenance";
import { RmsLogsCommands } from "./rms-logs-commands";
import { RmsLogsOperationalSummary } from "./rms-logs-operational-summary";
import { RmsLogsParameters } from "./rms-logs-parameters";

const tabs: readonly { id: string; label: string; enabled: boolean; viewId?: VorViewId }[] = [
  { id: "summary", label: "Operational Summary", enabled: true, viewId: "rms-logs-operational-summary" },
  { id: "alarms", label: "Alarms", enabled: true, viewId: "rms-logs-alarms" },
  { id: "maintenance", label: "Maintenance Alerts", enabled: true, viewId: "rms-logs-maintenance" },
  { id: "commands", label: "Command Activity", enabled: true, viewId: "rms-logs-commands" },
  { id: "parameters", label: "Parameter Change", enabled: true, viewId: "rms-logs-parameters" },
];

export function RmsLogsLayout() {
  const activeView = useVorPmdtStore((state) => state.activeView);
  const openView = useVorPmdtStore((state) => state.openView);

  return (
    <section className="pmdt-rms-logs-layout flex min-h-full flex-col" aria-label="RMS Logs">
      <PmdtToolbar title="RMS Logs" />
      <div className="pmdt-rms-tabbar flex gap-1 border-b border-[#334155] bg-[#0f172a] px-3 pt-2" role="tablist" aria-label="RMS Logs tabs">
        {tabs.map((tab) => {
          const active = tab.viewId === activeView;
          return (
            <button key={tab.id} type="button" role="tab" aria-selected={active} aria-disabled={!tab.enabled || undefined} title={!tab.enabled ? "Chưa khả dụng" : undefined} onClick={() => {
              if (!tab.enabled || !tab.viewId) return;
              openView("rms-logs", tab.viewId, ["RMS", "Logs", tab.label], tab.label);
            }} className={`min-h-8 border border-b-0 px-3 text-[11px] font-medium ${!tab.enabled ? "cursor-not-allowed border-[#273449] text-[#64748b] opacity-50" : active ? "border-[#475569] bg-[#1e293b] text-white" : "border-[#334155] bg-[#111827] text-[#94a3b8] hover:text-white"}`}>
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="pmdt-rms-logs-content min-h-0 flex-1 overflow-auto">
        {activeView === "rms-logs-maintenance" ? <RmsLogsMaintenance />
          : activeView === "rms-logs-commands" ? <RmsLogsCommands />
            : activeView === "rms-logs-parameters" ? <RmsLogsParameters />
              : activeView === "rms-logs-alarms" ? <RmsLogsAlarms />
                : <RmsLogsOperationalSummary />}
      </div>
    </section>
  );
}
