"use client";

import type { DmeViewId } from "@/lib/dme-types";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { MonitorDataTable } from "./monitor-integral";
import { ScreenTabs } from "./screen-primitives";
import { TxConfigNominal } from "./tx-config-nominal";
import { TxConfigOffsets } from "./tx-config-offsets";

const tabs: readonly { id: string; label: string; viewId: DmeViewId }[] = [
  { id: "nominal", label: "Nominal", viewId: "tx-config-nominal" },
  { id: "offsets", label: "Offsets and Scale Factors", viewId: "tx-config-offsets" },
  { id: "integral", label: "Integral Monitor Data", viewId: "tx-config-integral-monitor" },
  { id: "standby", label: "Standby Monitor Data", viewId: "tx-config-standby-monitor" },
];

export function TxConfigLayout() {
  const activeView = useDmePmdtStore((state) => state.activeView);
  const openView = useDmePmdtStore((state) => state.openView);
  const timestamp = useDmePmdtStore((state) => state.data.timestamp);

  return (
    <section className="dme-pmdt-tx-config flex min-h-full flex-col" aria-label="Transmitter Configuration">
      <PmdtToolbar title="Transmitter Configuration" />
      <ScreenTabs
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          active: tab.viewId === activeView,
          onSelect: () => openView("tx-config", tab.viewId, ["Transmitters", "Configuration", tab.label], tab.label),
        }))}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        {activeView === "tx-config-nominal" || activeView === "tx-config-offsets" ? <time className="dme-pmdt-screen-time">{timestamp}</time> : null}
        {activeView === "tx-config-nominal" ? <TxConfigNominal /> : null}
        {activeView === "tx-config-offsets" ? <TxConfigOffsets /> : null}
        {activeView === "tx-config-integral-monitor" ? <div className="dme-pmdt-tx-monitor-data"><MonitorDataTable kind="integral" /></div> : null}
        {activeView === "tx-config-standby-monitor" ? <div className="dme-pmdt-tx-monitor-data"><MonitorDataTable kind="standby" /></div> : null}
      </div>
    </section>
  );
}
