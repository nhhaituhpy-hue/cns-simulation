"use client";

import { useEffect, type ReactNode } from "react";
import type { DmePmdtMode } from "@/lib/dme-types";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtMenuBar } from "./pmdt-menu-bar";
import { PmdtSidebar } from "./pmdt-sidebar";
import { PmdtStatusBar } from "./pmdt-status-bar";
import { PmdtTitleBar } from "./pmdt-title-bar";
import { DisabledScreen } from "./screens/disabled-screen";
import { HomeScreen } from "./screens/home-screen";
import { MonitorConfigLayout } from "./screens/monitor-config-layout";
import { MonitorDataLayout } from "./screens/monitor-data-layout";
import { MonitorDecoderResults } from "./screens/monitor-decoder-results";
import { MonitorOffsets } from "./screens/monitor-offsets";
import { RmsLogsLayout } from "./screens/rms-logs-layout";
import { RmsStatusLayout } from "./screens/rms-status-layout";
import { RmsDataLayout } from "./screens/rms-data-layout";
import { RmsConfigLayout } from "./screens/rms-config-layout";
import { MonitorDetailData } from "./screens/monitor-data-detail";
import { MonitorCalibration } from "./screens/monitor-calibration";
import { TxConfigLayout } from "./screens/tx-config-layout";
import { TxDataLayout } from "./screens/tx-data-layout";

export interface PmdtLayoutProps {
  mode?: DmePmdtMode;
  children?: ReactNode;
  sidePanel?: ReactNode;
}

function PmdtScreenRouter() {
  const activeScreen = useDmePmdtStore((state) => state.activeScreen);

  if (activeScreen === "rms-status") return <RmsStatusLayout />;
  if (activeScreen === "rms-data") return <RmsDataLayout />;
  if (activeScreen === "rms-config") return <RmsConfigLayout />;
  if (activeScreen === "rms-logs") return <RmsLogsLayout />;
  if (activeScreen === "monitor-data") return <MonitorDataLayout />;
  if (activeScreen === "monitor-config") return <MonitorConfigLayout />;
  if (activeScreen === "monitor-1-test-results") return <MonitorDecoderResults monitorNumber={1} />;
  if (activeScreen === "monitor-2-test-results") return <MonitorDecoderResults monitorNumber={2} />;
  if (activeScreen === "monitor-1-offsets") return <MonitorOffsets monitorNumber={1} />;
  if (activeScreen === "monitor-2-offsets") return <MonitorOffsets monitorNumber={2} />;
  if (activeScreen === "monitor-1-data") return <MonitorDetailData monitorNumber={1} />;
  if (activeScreen === "monitor-2-data") return <MonitorDetailData monitorNumber={2} />;
  if (activeScreen === "monitor-1-calibration") return <MonitorCalibration monitorNumber={1} />;
  if (activeScreen === "monitor-2-calibration") return <MonitorCalibration monitorNumber={2} />;
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
  const setMode = useDmePmdtStore((state) => state.setMode);

  useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  return (
    <div className="simulator-skin min-h-[calc(100dvh-4rem)] overflow-auto bg-[var(--simulator-canvas)]">
      <section
        aria-label="DME PMDT Simulator"
        className={`grid h-[calc(100dvh-4rem)] min-h-[720px] min-w-[1024px] grid-rows-[2rem_2.25rem_minmax(0,1fr)_1.75rem] bg-[var(--simulator-surface)] text-[var(--simulator-text)] ${
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
        <main className="min-h-0 overflow-auto bg-[var(--simulator-surface)]">
          {children ?? <PmdtScreenRouter />}
        </main>
        {sidePanel ? (
          <aside aria-label={mode === "author" ? "Bảng xây dựng kịch bản" : "Nhật ký học viên"} className="min-h-0 overflow-y-auto overscroll-contain border-l border-[var(--simulator-border)] bg-[var(--simulator-panel)]">
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

