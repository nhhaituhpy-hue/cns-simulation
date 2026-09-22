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
import { Dvor1150aHardwareStage } from "./dvor1150a-hardware-stage";
import { evaluateDvor1150aScenario } from "@/lib/dvor1150a";
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
  const config = useVorPmdtStore((state) => state.config);
  const derived = useVorPmdtStore((state) => state.derived);
  const storeMode = useVorPmdtStore((state) => state.mode);
  const scenarioStage = useVorPmdtStore((state) => state.scenarioStage);
  const scenarioHardwareSelection = useVorPmdtStore((state) => state.scenarioHardwareSelection);
  const scenarioHardwareDispositionConfirmed = useVorPmdtStore((state) => state.scenarioHardwareDispositionConfirmed);
  const attemptEvents = useVorPmdtStore((state) => state.attemptEvents);
  const actionHistory = useVorPmdtStore((state) => state.actionHistory);
  const scenarioEvidence = {
    visitedViewIds: attemptEvents.map((event) => event.viewId),
    acceptedActionControlIds: actionHistory
      .filter((event) => event.accepted && event.controlId)
      .map((event) => event.controlId as string),
    selectedHardwareOccurrenceKeys: scenarioHardwareSelection,
    hardwareDispositionConfirmed: scenarioHardwareDispositionConfirmed,
  };
  const scenarioEvaluation = scenario.active && scenario.definition
    ? evaluateDvor1150aScenario(
        scenario,
        derived,
        config,
        scenarioEvidence,
      )
    : null;
  const twoStageScenario = storeMode === "student" && Boolean(scenario.active && scenario.definition?.diagnosis);
  const setScenarioStage = useVorPmdtStore((state) => state.setScenarioStage);
  const setScenarioParametersOpen = useVorPmdtStore((state) => state.setScenarioParametersOpen);
  const setScenarioAuthoringEnabled = useVorPmdtStore((state) => state.setScenarioAuthoringEnabled);
  const replaceScenarioDraft = useVorPmdtStore((state) => state.replaceScenarioDraft);
  const startReviewScenario = useVorPmdtStore((state) => state.startReviewScenario);
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
          enabled
          onLoaded={(definition, context) => {
            if (context.review) startReviewScenario(definition);
            else {
              replaceScenarioDraft(definition);
              setScenarioParametersOpen(true);
            }
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
          {twoStageScenario && scenarioEvaluation ? (
            <div className="dvor1150a-scenario-stagebar" role="status">
              <span><strong>{scenarioStage === "pmdt" ? "Bước 1/2" : scenarioStage === "hardware" ? "Bước 2/2" : "Hoàn thành"}</strong> · {scenario.definition?.diagnosis?.disposition === "software-adjustment" ? "PMDT configuration" : "PMDT → hardware"}</span>
              {scenarioStage === "pmdt" ? (
                <button type="button" disabled={!scenarioEvaluation.pmdtComplete} onClick={() => setScenarioStage("hardware")}>
                  Tiếp tục: Xác định phần cứng
                </button>
              ) : null}
            </div>
          ) : null}
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
      {twoStageScenario && scenarioStage === "hardware" ? <Dvor1150aHardwareStage /> : null}
      {twoStageScenario && scenarioStage === "complete" ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="dvor-scenario-complete-title" className="w-full max-w-lg rounded border border-[#9aa8b3] bg-[#f7f9fa] p-6 text-[#17202a] shadow-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1d5f91]">Scenario completed</p>
            <h2 id="dvor-scenario-complete-title" className="mt-2 text-xl font-bold">Đã hoàn thành kịch bản</h2>
            <p className="mt-3 text-sm leading-6 text-[#53616d]">PMDT và phần xác định xử lý phần cứng đã được ghi nhận trong phiên thực hành.</p>
            <div className="mt-4 grid gap-2 rounded border border-[#c5d3dd] bg-white p-3 text-xs">
              {scenarioEvaluation?.checks.map((check) => <div key={check.id} className="flex items-center justify-between gap-3"><span>{check.label}</span><strong className={check.passed ? "text-[#166534]" : "text-[#a22b2b]"}>{check.passed ? "Đạt" : "Theo dõi"}</strong></div>)}
            </div>
            <button type="button" onClick={() => setScenarioStage("pmdt")} className="mt-5 min-h-10 rounded bg-[#1d5f91] px-4 text-sm font-bold text-white hover:bg-[#174d76] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5f91] focus-visible:ring-offset-2">Quay lại PMDT</button>
          </section>
        </div>
      ) : null}
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
