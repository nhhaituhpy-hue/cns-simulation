"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { SimulatorConfigPersistence } from "@/components/simulator/simulator-config-persistence";
import { SimulatorToolbarBackButton } from "@/components/simulator/simulator-toolbar-back-button";
import { ScenarioParametersRouteLoader } from "@/components/scenario/scenario-parameters-route-loader";
import { DmeScenarioSessionPersistence } from "@/components/scenario/scenario-session-persistence";
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
import { Dme1119aHardwareStage } from "./dme1119a-hardware-stage";
import { evaluateDme1119aScenario } from "@/lib/dme1119a";
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
  sessionUserId?: string;
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
  sessionUserId = "",
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
  const sessionMode = useDmePmdtStore((state) => state.mode);
  const config = useDmePmdtStore((state) => state.data);
  const scenarioStage = useDmePmdtStore((state) => state.scenarioStage);
  const scenarioHardwareSelection = useDmePmdtStore((state) => state.scenarioHardwareSelection);
  const scenarioHardwareDispositionConfirmed = useDmePmdtStore((state) => state.scenarioHardwareDispositionConfirmed);
  const attemptEvents = useDmePmdtStore((state) => state.attemptEvents);
  const actionHistory = useDmePmdtStore((state) => state.actionHistory);
  const setScenarioStage = useDmePmdtStore((state) => state.setScenarioStage);
  const scenarioEvidence = {
    visitedViewIds: attemptEvents.map((event) => event.viewId),
    acceptedActionControlIds: actionHistory.filter((event) => event.accepted && event.controlId).map((event) => event.controlId as string),
    selectedHardwareOccurrenceKeys: scenarioHardwareSelection,
    hardwareDispositionConfirmed: scenarioHardwareDispositionConfirmed,
  };
  const scenarioEvaluation = scenario.active && scenario.definition
    ? evaluateDme1119aScenario(scenario, config, scenarioEvidence)
    : null;
  const twoStageScenario = sessionMode === "student" && Boolean(scenario.active && scenario.definition?.diagnosis);
  const setScenarioParametersOpen = useDmePmdtStore((state) => state.setScenarioParametersOpen);
  const setScenarioAuthoringEnabled = useDmePmdtStore((state) => state.setScenarioAuthoringEnabled);
  const replaceScenarioDraft = useDmePmdtStore((state) => state.replaceScenarioDraft);
  const startReviewScenario = useDmePmdtStore((state) => state.startReviewScenario);
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
      <Suspense fallback={null}>
        <ScenarioParametersRouteLoader
          moduleId="dme-1119a"
          enabled
          onLoaded={(definition, context) => {
            if (context.review) {
              startReviewScenario(definition, {
                userId: sessionUserId,
                sessionKey: context.sessionKey ?? `practice:${sessionUserId || "anonymous"}:${definition.id}`,
                revisionKey: context.revisionKey,
              });
            }
            else {
              replaceScenarioDraft(definition);
              setScenarioParametersOpen(true);
            }
          }}
        />
      </Suspense>
      <div className="dme1119a-simulator-frame">
        {mode === "preview" ? <nav className="dme1119a-simulator-tools" aria-label="DME 1119A simulator tools">
          <SimulatorToolbarBackButton />
          {scenarioAuthoringEnabled ? <button type="button" onClick={() => { setConfigPanelOpen(false); setScenarioParametersOpen(true); }}>Scenario Parameters</button> : null}
          {scenarioAuthoringEnabled ? <span className="dme1119a-scenario-role-badge">EXAMINER</span> : null}
          <Dme1119aTrainingHud examinerView={scenarioAuthoringEnabled} />
          {scenarioAuthoringEnabled && scenario.active ? <span className="dme1119a-scenario-active-badge">Scenario active: {scenario.definition?.name}</span> : null}
          {twoStageScenario && scenarioEvaluation ? <div className="dme1119a-scenario-stagebar" role="status">
            <span><strong>{scenarioStage === "pmdt" ? "Bước 1/2" : scenarioStage === "hardware" ? "Bước 2/2" : "Hoàn thành"}</strong> · {scenario.definition?.diagnosis?.disposition === "software-adjustment" ? "PMDT configuration" : "PMDT → hardware"}</span>
            {scenarioStage === "pmdt" ? <button type="button" disabled={!scenarioEvaluation.pmdtComplete} onClick={() => setScenarioStage("hardware")}>Tiếp tục: Xác định phần cứng</button> : null}
          </div> : null}
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
        <DmeScenarioSessionPersistence />
        </section>
      </div>
      {twoStageScenario && scenarioStage === "hardware" ? <Dme1119aHardwareStage /> : null}
      {twoStageScenario && scenarioStage === "complete" ? <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="dme-scenario-complete-title" className="w-full max-w-lg rounded border border-[#9aa8b3] bg-[#f7f9fa] p-6 text-[#17202a] shadow-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1d5f91]">Scenario completed</p>
          <h2 id="dme-scenario-complete-title" className="mt-2 text-xl font-bold">Đã hoàn thành kịch bản</h2>
          <p className="mt-3 text-sm leading-6 text-[#53616d]">PMDT và phần xác định xử lý phần cứng đã được ghi nhận.</p>
          <div className="mt-4 grid gap-2 rounded border border-[#c5d3dd] bg-white p-3 text-xs">{scenarioEvaluation?.checks.map((check) => <div key={check.id} className="flex items-center justify-between gap-3"><span>{check.label}</span><strong className={check.passed ? "text-[#166534]" : "text-[#a22b2b]"}>{check.passed ? "Đạt" : "Theo dõi"}</strong></div>)}</div>
          <button type="button" onClick={() => setScenarioStage("pmdt")} className="mt-5 min-h-10 rounded bg-[#1d5f91] px-4 text-sm font-bold text-white hover:bg-[#174d76] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5f91]">Quay lại PMDT</button>
        </section>
      </div> : null}
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

