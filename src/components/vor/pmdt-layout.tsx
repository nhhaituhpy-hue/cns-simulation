"use client";

import { useEffect, type ReactNode } from "react";
import type { VorPmdtMode } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtMenuBar } from "./pmdt-menu-bar";
import { PmdtSidebar } from "./pmdt-sidebar";
import { PmdtStatusBar } from "./pmdt-status-bar";
import { PmdtTitleBar } from "./pmdt-title-bar";
import { DisabledScreen } from "./screens/disabled-screen";
import { HomeScreen } from "./screens/home-screen";
import { MonitorConfigLayout } from "./screens/monitor-config-layout";
import { MonitorDataLayout } from "./screens/monitor-data-layout";
import { MonitorOffsets } from "./screens/monitor-offsets";
import { RmsDataLayout } from "./screens/rms-data-layout";
import { RmsLogsLayout } from "./screens/rms-logs-layout";
import { TxConfigLayout } from "./screens/tx-config-layout";
import { TxDataLayout } from "./screens/tx-data-layout";

export interface PmdtLayoutProps {
  mode?: VorPmdtMode;
  children?: ReactNode;
  sidePanel?: ReactNode;
}

function PmdtScreenRouter() {
  const activeScreen = useVorPmdtStore((state) => state.activeScreen);

  if (activeScreen === "rms-data") return <RmsDataLayout />;
  if (activeScreen === "rms-logs") return <RmsLogsLayout />;
  if (activeScreen === "monitor-data") return <MonitorDataLayout />;
  if (activeScreen === "monitor-config") return <MonitorConfigLayout />;
  if (activeScreen === "monitor-1-offsets") return <MonitorOffsets monitorNumber={1} />;
  if (activeScreen === "monitor-2-offsets") return <MonitorOffsets monitorNumber={2} />;
  if (activeScreen === "tx-data") return <TxDataLayout />;
  if (activeScreen === "tx-config") return <TxConfigLayout />;
  if (activeScreen === "disabled") return <DisabledScreen />;
  return <HomeScreen />;
}

export function PmdtLayout({
  mode = "preview",
  children,
  sidePanel,
}: PmdtLayoutProps) {
  const setMode = useVorPmdtStore((state) => state.setMode);

  useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-auto bg-[#070a12]">
      <section
        aria-label="VOR PMDT Simulator"
        className={`grid min-h-[720px] min-w-[1024px] grid-rows-[2rem_2.25rem_minmax(0,1fr)_1.75rem] bg-[#0a0e1a] text-[#e2e8f0] ${
          sidePanel
            ? "grid-cols-[11rem_minmax(0,1fr)_20rem]"
            : "grid-cols-[11rem_minmax(0,1fr)]"
        }`}
      >
        <div className={sidePanel ? "col-span-3" : "col-span-2"}>
          <PmdtTitleBar />
        </div>
        <div className={sidePanel ? "col-span-3" : "col-span-2"}>
          <PmdtMenuBar />
        </div>
        <PmdtSidebar />
        <main className="min-h-0 overflow-auto bg-[#0a0e1a]">
          {children ?? <PmdtScreenRouter />}
        </main>
        {sidePanel ? (
          <aside className="min-h-0 overflow-y-auto border-l border-[#334155] bg-[#111827]">
            {sidePanel}
          </aside>
        ) : null}
        <div className={sidePanel ? "col-span-3" : "col-span-2"}>
          <PmdtStatusBar />
        </div>
      </section>
    </div>
  );
}
