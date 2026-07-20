"use client";

import type { VorViewId } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { TxDataMain } from "./tx-data-main";
import { TxStatus } from "./tx-status";

const tabs: readonly { id: string; label: string; enabled: boolean; viewId?: VorViewId }[] = [
  { id: "data", label: "Transmitter Data", enabled: true, viewId: "tx-data-main" },
  { id: "ground-1", label: "Ground Check #1", enabled: false },
  { id: "ground-2", label: "Ground Check #2", enabled: false },
  { id: "status-1", label: "Status Tx #1", enabled: true, viewId: "tx-status-1" },
  { id: "status-2", label: "Status Tx #2", enabled: true, viewId: "tx-status-2" },
];

export function TxDataLayout() {
  const activeView = useVorPmdtStore((state) => state.activeView);
  const openView = useVorPmdtStore((state) => state.openView);

  return (
    <section className="flex min-h-full flex-col" aria-label="Transmitter Data">
      <PmdtToolbar title="Transmitter Data" />
      <div className="flex gap-1 border-b border-[#334155] bg-[#0f172a] px-3 pt-2" role="tablist" aria-label="Transmitter Data tabs">
        {tabs.map((tab) => {
          const active = tab.viewId === activeView;
          return <button key={tab.id} type="button" role="tab" aria-selected={active} aria-disabled={!tab.enabled || undefined} title={!tab.enabled ? "Chưa khả dụng" : undefined} onClick={() => {
            if (!tab.enabled || !tab.viewId) return;
            openView("tx-data", tab.viewId, ["Transmitters", "Data", tab.label], tab.label);
          }} className={`min-h-8 border border-b-0 px-3 text-[11px] font-medium ${!tab.enabled ? "cursor-not-allowed border-[#273449] text-[#64748b] opacity-50" : active ? "border-[#475569] bg-[#1e293b] text-white" : "border-[#334155] bg-[#111827] text-[#94a3b8] hover:text-white"}`}>{tab.label}</button>;
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {activeView === "tx-status-1" ? (
          <TxStatus txNumber={1} />
        ) : activeView === "tx-status-2" ? (
          <TxStatus txNumber={2} />
        ) : (
          <TxDataMain />
        )}
      </div>
    </section>
  );
}
