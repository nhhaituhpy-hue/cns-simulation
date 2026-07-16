"use client";

import {
  ArrowClockwise,
  ArrowCounterClockwise,
  type Icon,
} from "@phosphor-icons/react";
import type { VorViewId } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { RmsLogsAlarms } from "./rms-logs-alarms";
import { RmsLogsMaintenance } from "./rms-logs-maintenance";

const tabs: readonly { id: string; label: string; enabled: boolean; viewId?: VorViewId }[] = [
  { id: "summary", label: "Operational Summary", enabled: false },
  { id: "alarms", label: "Alarms", enabled: true, viewId: "rms-logs-alarms" },
  { id: "maintenance", label: "Maintenance Alerts", enabled: true, viewId: "rms-logs-maintenance" },
  { id: "commands", label: "Command Activity", enabled: false },
  { id: "parameters", label: "Parameter Change", enabled: false },
];

const logButtons: readonly { label: string; icon: Icon }[] = [
  { label: "Update", icon: ArrowClockwise },
  { label: "Reset", icon: ArrowCounterClockwise },
];

export function RmsLogsLayout() {
  const activeView = useVorPmdtStore((state) => state.activeView);
  const openView = useVorPmdtStore((state) => state.openView);

  return (
    <section className="flex min-h-full flex-col" aria-label="RMS Logs">
      <header className="flex min-h-11 items-center gap-2 border-b border-[#334155] bg-[#111827] px-3">
        <h2 className="mr-auto text-sm font-semibold text-[#e2e8f0]">RMS Logs</h2>
        {logButtons.map(({ label, icon: ButtonIcon }) => (
          <button key={label} type="button" title={`${label} chỉ mang tính mô phỏng`} className="inline-flex h-8 items-center gap-1.5 border border-[#475569] bg-[#1e293b] px-3 text-[11px] text-[#cbd5e1] hover:border-[#60a5fa]">
            <ButtonIcon aria-hidden size={14} />{label}
          </button>
        ))}
      </header>
      <div className="flex gap-1 border-b border-[#334155] bg-[#0f172a] px-3 pt-2" role="tablist" aria-label="RMS Logs tabs">
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
      <div className="min-h-0 flex-1 overflow-auto">
        {activeView === "rms-logs-maintenance" ? <RmsLogsMaintenance /> : <RmsLogsAlarms />}
      </div>
    </section>
  );
}
