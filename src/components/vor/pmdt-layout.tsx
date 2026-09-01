"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { SimulatorConfigPersistence } from "@/components/simulator/simulator-config-persistence";
import { SimulatorToolbarBackButton } from "@/components/simulator/simulator-toolbar-back-button";
import { ScenarioParametersRouteLoader } from "@/components/scenario/scenario-parameters-route-loader";
import type { SupportedSimulatorConfigId } from "@/lib/simulator-config/types";
import type { VorPmdtMode } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtMenuBar } from "./pmdt-menu-bar";
import { PmdtSidebar } from "./pmdt-sidebar";
import { PmdtStatusBar } from "./pmdt-status-bar";
import { PmdtTitleBar } from "./pmdt-title-bar";
import { DvorConfigPanel } from "./dvor-config-panel";
import { AboutPmdtDialog } from "./about-pmdt-dialog";
import { PmdtLoginDialog } from "./pmdt-login-dialog";
import { Dvor1150aScenarioParametersPanel } from "./dvor1150a-scenario-parameters";
import { Dvor1150aTrainingHud } from "./dvor1150a-training-hud";
import { DisabledScreen } from "./screens/disabled-screen";
import { HomeScreen } from "./screens/home-screen";
import { MonitorConfigLayout } from "./screens/monitor-config-layout";
import { MonitorDataLayout } from "./screens/monitor-data-layout";
import { MonitorOffsets } from "./screens/monitor-offsets";
import { MonitorTestResults } from "./screens/monitor-test-results";
import { MonitorFaultHistory } from "./screens/monitor-fault-history";
import { RmsDataLayout } from "./screens/rms-data-layout";
import { RmsStatusLayout } from "./screens/rms-status-layout";
import { RmsLogsLayout } from "./screens/rms-logs-layout";
import { RmsConfigLayout } from "./screens/rms-config-layout";
import { TxConfigLayout } from "./screens/tx-config-layout";
import { TxDataLayout } from "./screens/tx-data-layout";
import { DiagnosticsWorkspace } from "./screens/diagnostics-workspace";

export interface PmdtLayoutProps {
  mode?: VorPmdtMode;
  simulatorId?: Extract<SupportedSimulatorConfigId, "dvor-1150a">;
  scenarioAuthoringEnabled?: boolean;
  children?: ReactNode;
  leadingPanel?: ReactNode;
  sidePanel?: ReactNode;
}

function PmdtScreenRouter() {
  const activeScreen = useVorPmdtStore((state) => state.activeScreen);

  if (activeScreen === "rms-data") return <RmsDataLayout />;
  if (activeScreen === "rms-status") return <RmsStatusLayout />;
  if (activeScreen === "rms-logs") return <RmsLogsLayout />;
  if (activeScreen === "rms-config") return <RmsConfigLayout />;
  if (activeScreen === "monitor-data") return <MonitorDataLayout />;
  if (activeScreen === "monitor-config") return <MonitorConfigLayout />;
  if (activeScreen === "monitor-test-results") return <MonitorTestResults />;
  if (activeScreen === "monitor-fault-history") return <MonitorFaultHistory />;
  if (activeScreen === "monitor-1-offsets") return <MonitorOffsets monitorNumber={1} />;
  if (activeScreen === "monitor-2-offsets") return <MonitorOffsets monitorNumber={2} />;
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
  const setMode = useVorPmdtStore((state) => state.setMode);
  const configPanelOpen = useVorPmdtStore((state) => state.configPanelOpen);
  const scenarioParametersOpen = useVorPmdtStore((state) => state.scenarioParametersOpen);
  const scenario = useVorPmdtStore((state) => state.scenario);
  const setScenarioParametersOpen = useVorPmdtStore((state) => state.setScenarioParametersOpen);
  const setScenarioAuthoringEnabled = useVorPmdtStore((state) => state.setScenarioAuthoringEnabled);
  const replaceScenarioDraft = useVorPmdtStore((state) => state.replaceScenarioDraft);
  const aboutDialogOpen = useVorPmdtStore((state) => state.aboutDialogOpen);
  const loginDialogOpen = useVorPmdtStore((state) => state.loginDialogOpen);
  const applyConfigChanges = useVorPmdtStore((state) => state.applyConfigChanges);
  const restoreDefaultConfig = useVorPmdtStore((state) => state.restoreDefaultConfig);

  useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  useEffect(() => {
    setScenarioAuthoringEnabled(scenarioAuthoringEnabled);
  }, [scenarioAuthoringEnabled, setScenarioAuthoringEnabled]);

  useEffect(() => {
    function handleFunctionKey(event: KeyboardEvent) {
      if (event.key === "F7") {
        event.preventDefault();
        applyConfigChanges();
      } else if (event.key === "F8") {
        event.preventDefault();
        restoreDefaultConfig();
      }
    }

    document.addEventListener("keydown", handleFunctionKey);
    return () => document.removeEventListener("keydown", handleFunctionKey);
  }, [applyConfigChanges, restoreDefaultConfig]);

  return (
    <div className={`pmdt-classic-viewport ${hasExternalPanels ? "pmdt-classic-viewport--with-external-inspector" : ""}`}>
      <Suspense fallback={null}>
        <ScenarioParametersRouteLoader
          moduleId="dvor-1150a"
          enabled={scenarioAuthoringEnabled}
          onLoaded={(definition) => {
            replaceScenarioDraft(definition);
            setScenarioParametersOpen(true);
          }}
        />
      </Suspense>
      <div className="dvor1150a-simulator-frame">
        {mode === "preview" ? <nav className="dvor1150a-simulator-tools" aria-label="DVOR 1150A simulator tools">
          <SimulatorToolbarBackButton />
          {scenarioAuthoringEnabled ? <button type="button" onClick={() => setScenarioParametersOpen(true)}>Scenario Parameters</button> : null}
          {scenarioAuthoringEnabled ? <span className="dvor1150a-scenario-role-badge">EXAMINER</span> : null}
          <Dvor1150aTrainingHud examinerView={scenarioAuthoringEnabled} />
          {scenarioAuthoringEnabled && scenario.active ? <span className="dvor1150a-scenario-active-badge">Scenario active: {scenario.definition?.name}</span> : null}
        </nav> : null}
        <section
        aria-label="VOR PMDT Simulator"
        className={`pmdt-classic-window ${
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
        {configPanelOpen ? <DvorConfigPanel /> : null}
        {scenarioAuthoringEnabled && scenarioParametersOpen ? <Dvor1150aScenarioParametersPanel /> : null}
        {aboutDialogOpen ? <AboutPmdtDialog /> : null}
        {loginDialogOpen ? <PmdtLoginDialog /> : null}
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
