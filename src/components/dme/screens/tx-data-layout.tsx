"use client";

import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { ScreenTabs } from "./screen-primitives";
import { RtcData } from "./rtc-data";
import { TxDataMain } from "./tx-data-main";

export function TxDataLayout() {
  const activeView = useDmePmdtStore((state) => state.activeView);
  const openView = useDmePmdtStore((state) => state.openView);
  return (
    <section className="flex min-h-full flex-col" aria-label="Transmitter Data">
      <PmdtToolbar title="Transmitter Data" />
      <ScreenTabs tabs={[
        { id: "tx-data-main", label: "Transmitter Data", active: activeView === "tx-data-main", onSelect: () => openView("tx-data", "tx-data-main", ["Transmitters", "Data", "Transmitter Data"], "Transmitter Data") },
        { id: "tx-rtc-data", label: "RTC Data", active: activeView === "tx-rtc-data", onSelect: () => openView("tx-data", "tx-rtc-data", ["Transmitters", "Data", "RTC Data"], "RTC Data") },
      ]} />
      <div className="min-h-0 flex-1 overflow-auto">{activeView === "tx-rtc-data" ? <RtcData /> : <TxDataMain />}</div>
    </section>
  );
}
