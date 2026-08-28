"use client";

import { useEffect, type ReactNode } from "react";
import { SimulatorConfigPersistence } from "@/components/simulator/simulator-config-persistence";
import type { SupportedSimulatorConfigId } from "@/lib/simulator-config/types";
import type { DmePmdtMode } from "@/lib/dme-types";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtMenuBar } from "./pmdt-menu-bar";
import { PmdtSidebar } from "./pmdt-sidebar";
import { PmdtStatusBar } from "./pmdt-status-bar";
import { PmdtTitleBar } from "./pmdt-title-bar";
import { DmeConfigPanel } from "./dme-config-panel";
import { Dme1119aScenarioParametersPanel } from "./dme-scenario-parameters";
import { Dme1119aTrainingHud } from "./dme1119a-training-hud";
import { AboutPmdtDialog } from "./about-pmdt-dialog";
import { DmePmdtLoginDialog } from "./pmdt-login-dialog";
import { DmePmdtPasswordDialog } from "./pmdt-password-dialog";
import { DiagnosticsWorkspace } from "./screens/diagnostics-workspace";
import { DisabledScreen } from "./screens/disabled-screen";
import { HomeScreen } from "./screens/home-screen";
import { MonitorConfigLayout } from "./screens/monitor-config-layout";
import { MonitorDataLayout } from "./screens/monitor-data-layout";
import { MonitorDecoderResults } from "./screens/monitor-decoder-results";
import { MonitorFaultHistory } from "./screens/monitor-fault-history";
import { MonitorOffsets } from "./screens/monitor-offsets";
import { MonitorSpecialTests } from "./screens/monitor-special-tests";
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
  simulatorId?: Extract<SupportedSimulatorConfigId, "dme-1119a">;
  scenarioAuthoringEnabled?: boolean;
  children?: ReactNode;
  leadingPanel?: ReactNode;
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
  if (activeScreen === "monitor-special-tests") return <MonitorSpecialTests />;
  if (activeScreen === "monitor-fault-history") return <MonitorFaultHistory />;
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
  if (activeScreen === "diagnostics") return <DiagnosticsWorkspace />;
  if (activeScreen === "disabled") return <DisabledScreen />;
  return <HomeScreen />;
}

export function PmdtLayout({
  mode = "preview",
  simulatorId,
  scenarioAuthoringEnabled = false,
  children,
  leadingPanel,
  sidePanel,
}: PmdtLayoutProps) {
  const externalLeadingPanel = mode === "student" ? leadingPanel : null;
  const externalSidePanel = mode === "student" ? sidePanel : null;
  const hasExternalPanels = Boolean(externalLeadingPanel || externalSidePanel);
  const inlineSidePanel = mode === "student" ? null : sidePanel;
  const setMode = useDmePmdtStore((state) => state.setMode);
  const configPanelOpen = useDmePmdtStore((state) => state.configPanelOpen);
  const scenarioParametersOpen = useDmePmdtStore((state) => state.scenarioParametersOpen);
  const scenario = useDmePmdtStore((state) => state.scenario);
  const setScenarioParametersOpen = useDmePmdtStore((state) => state.setScenarioParametersOpen);
  const setScenarioAuthoringEnabled = useDmePmdtStore((state) => state.setScenarioAuthoringEnabled);
  const setConfigPanelOpen = useDmePmdtStore((state) => state.setConfigPanelOpen);
  const aboutDialogOpen = useDmePmdtStore((state) => state.aboutDialogOpen);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const passwordDialogOpen = useDmePmdtStore((state) => state.passwordDialogOpen);
  const applyConfigChanges = useDmePmdtStore((state) => state.applyConfigChanges);
  const restoreDefaultConfig = useDmePmdtStore((state) => state.restoreDefaultConfig);
  const nextView = useDmePmdtStore((state) => state.nextView);
  const closeScreen = useDmePmdtStore((state) => state.closeScreen);
  const recordActivity = useDmePmdtStore((state) => state.recordActivity);
  const checkActivity = useDmePmdtStore((state) => state.checkActivity);
  const refreshClock = useDmePmdtStore((state) => state.refreshClock);

  useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  useEffect(() => {
    setScenarioAuthoringEnabled(scenarioAuthoringEnabled);
  }, [scenarioAuthoringEnabled, setScenarioAuthoringEnabled]);

  useEffect(() => {
    refreshClock();
    const timer = window.setInterval(refreshClock, 1000);
    return () => window.clearInterval(timer);
  }, [refreshClock]);

  useEffect(() => {
    function handleFunctionKey(event: KeyboardEvent) {
      if (event.key === "F5") {
        event.preventDefault();
        nextView();
      } else if (event.key === "F6") {
        event.preventDefault();
        closeScreen();
      } else if (event.key === "F7") {
        event.preventDefault();
        applyConfigChanges();
      } else if (event.key === "F8") {
        event.preventDefault();
        restoreDefaultConfig();
      }
    }
    document.addEventListener("keydown", handleFunctionKey);
    return () => document.removeEventListener("keydown", handleFunctionKey);
  }, [applyConfigChanges, restoreDefaultConfig, nextView, closeScreen]);

  useEffect(() => {
    const handleActivity = () => recordActivity();
    document.addEventListener("mousedown", handleActivity, true);
    document.addEventListener("keydown", handleActivity, true);
    const timer = window.setInterval(checkActivity, 30_000);
    return () => {
      document.removeEventListener("mousedown", handleActivity, true);
      document.removeEventListener("keydown", handleActivity, true);
      window.clearInterval(timer);
    };
  }, [checkActivity, recordActivity]);

  return (
    <div className={`pmdt-classic-viewport dme-pmdt-viewport ${hasExternalPanels ? "pmdt-classic-viewport--with-external-inspector" : ""}`}>
      <div className="dme1119a-simulator-frame">
        {mode === "preview" && (scenarioAuthoringEnabled || scenario.active) ? <nav className="dme1119a-simulator-tools" aria-label="DME 1119A simulator tools">
          {scenarioAuthoringEnabled ? <button type="button" onClick={() => { setConfigPanelOpen(false); setScenarioParametersOpen(true); }}>Scenario Parameters</button> : null}
          {scenarioAuthoringEnabled ? <span className="dme1119a-scenario-role-badge">EXAMINER</span> : null}
          <Dme1119aTrainingHud examinerView={scenarioAuthoringEnabled} />
          {scenarioAuthoringEnabled && scenario.active ? <span className="dme1119a-scenario-active-badge">Scenario active: {scenario.definition?.name}</span> : null}
        </nav> : null}
        <section
        aria-label="DME PMDT Simulator"
        className={`pmdt-classic-window dme-pmdt-window ${
          inlineSidePanel
            ? "pmdt-classic-window--with-inspector"
            : "pmdt-classic-window--standard"
        }`}
      >
        <div className="pmdt-titlebar-row">
          <PmdtTitleBar />
        </div>
        <div className="pmdt-menubar-row">
          <PmdtMenuBar />
        </div>
        <PmdtSidebar />
        <main className="pmdt-classic-main">
          {loginDialogOpen ? <div className="pmdt-prelogin-workspace" aria-hidden="true" /> : (children ?? <PmdtScreenRouter />)}
        </main>
        {inlineSidePanel ? (
          <aside aria-label={mode === "author" ? "Bảng xây dựng kịch bản" : "Nhật ký học viên"} className="pmdt-classic-inspector">
            {inlineSidePanel}
          </aside>
        ) : null}
        <div className="pmdt-statusbar-row">
          <PmdtStatusBar />
        </div>
        {configPanelOpen ? <DmeConfigPanel /> : null}
        {scenarioAuthoringEnabled && scenarioParametersOpen ? <Dme1119aScenarioParametersPanel /> : null}
        {aboutDialogOpen ? <AboutPmdtDialog /> : null}
        {passwordDialogOpen ? <DmePmdtPasswordDialog /> : null}
        {loginDialogOpen ? <DmePmdtLoginDialog /> : null}
        {mode === "preview" && simulatorId ? <SimulatorConfigPersistence simulatorId={simulatorId} /> : null}
        </section>
      </div>
      {externalLeadingPanel ? (
        <aside aria-label="Nhật ký học viên" className="pmdt-classic-inspector pmdt-classic-inspector--external pmdt-classic-inspector--external-leading">
          {externalLeadingPanel}
        </aside>
      ) : null}
      {externalSidePanel ? (
        <aside aria-label="Màn hình và thao tác đã ghi nhận" className="pmdt-classic-inspector pmdt-classic-inspector--external">
          {externalSidePanel}
        </aside>
      ) : null}
    </div>
  );
}

