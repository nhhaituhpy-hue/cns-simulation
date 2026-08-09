"use client";

import type { VorViewId } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { TxConfigNominal } from "./tx-config-nominal";
import { TxConfigOffsets } from "./tx-config-offsets";

const tabs: readonly { id: string; label: string; enabled: boolean; viewId?: VorViewId }[] = [
  { id: "nominal", label: "Nominal", enabled: true, viewId: "tx-config-nominal" },
  { id: "offsets", label: "Offsets and Scale Factors", enabled: true, viewId: "tx-config-offsets" },
  { id: "integral", label: "Integral Monitor Data", enabled: false },
];

export function TxConfigLayout() {
  const activeView = useVorPmdtStore((state) => state.activeView);
  const openView = useVorPmdtStore((state) => state.openView);

  return (
    <section className="flex min-h-full flex-col" aria-label="Transmitter Configuration">
      <PmdtToolbar title="Transmitter Configuration" />
      <div className="pmdt-tx-tabbar flex gap-1 border-b border-[#334155] bg-[#0f172a] px-3 pt-2" role="tablist" aria-label="Transmitter Configuration tabs">
        {tabs.map((tab) => {
          const active = tab.viewId === activeView;
          return <button key={tab.id} type="button" role="tab" aria-selected={active} aria-disabled={!tab.enabled || undefined} title={!tab.enabled ? "Chưa khả dụng" : undefined} onClick={() => {
            if (!tab.enabled || !tab.viewId) return;
            openView("tx-config", tab.viewId, ["Transmitters", "Configuration", tab.label], tab.label);
          }} className={`min-h-8 border border-b-0 px-3 text-[11px] font-medium ${!tab.enabled ? "cursor-not-allowed border-[#273449] text-[#64748b] opacity-50" : active ? "border-[#475569] bg-[#1e293b] text-white" : "border-[#334155] bg-[#111827] text-[#94a3b8] hover:text-white"}`}>{tab.label}</button>;
        })}
      </div>
      <div className="pmdt-tx-config-content min-h-0 flex-1 overflow-auto">{activeView === "tx-config-offsets" ? <TxConfigOffsets /> : <TxConfigNominal />}</div>
    </section>
  );
}
