"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { PracticeWorkspace } from "@/components/scenario/practice-workspace";
import { SimulatorConfigPersistence } from "@/components/simulator/simulator-config-persistence";
import { SimulatorToolbarBackButton } from "@/components/simulator/simulator-toolbar-back-button";
import { ScenarioParametersRouteLoader } from "@/components/scenario/scenario-parameters-route-loader";
import { PracticeAiFeedbackButton } from "@/components/scenario/practice-ai-feedback-button";
import { useScenarioExamAnswer, useScenarioExamResultReader, useScenarioExamSnapshot } from "@/components/scenario-exams/scenario-exam-snapshot-context";
import { VorScenarioSessionPersistence } from "@/components/scenario/scenario-session-persistence";
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
  sessionUserId?: string;
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
  sessionUserId = "",
  children,
  leadingPanel,
  sidePanel,
}: PmdtLayoutProps) {
  const examSnapshot = useScenarioExamSnapshot();
  const searchParams = useSearchParams();
  const requestedScenarioId = searchParams?.get("scenarioId")?.trim() ?? "";
  const requestedSessionKey = searchParams?.get("sessionKey")?.trim() ?? "";
  const practiceRequested = !examSnapshot && searchParams?.get("review") === "1" && Boolean(requestedScenarioId);
  const practiceRequestKey = `${requestedScenarioId}:${requestedSessionKey}`;
  const [loadedPractice, setLoadedPractice] = useState<{ requestKey: string; definitionId: string; membershipId?: string } | null>(null);
  const canAuthorScenario = scenarioAuthoringEnabled && !practiceRequested;
  const examAnswer = useScenarioExamAnswer();
  useEffect(() => { if (examAnswer) useVorPmdtStore.getState().updateAnswer(examAnswer); }, [examAnswer]);
  useScenarioExamResultReader(() => {
    const state = useVorPmdtStore.getState();
    if (!examSnapshot || !state.scenario.active || state.sessionKey !== examSnapshot.sessionKey) return null;
    return { actionHistory: state.actionHistory, evidenceStats: state.evidenceStats, attemptEvents: state.attemptEvents,
      answer: state.answer, scenarioHardwareSelection: state.scenarioHardwareSelection, scenarioHardwareInspected: state.scenarioHardwareInspected,
      scenarioHardwareReasoning: state.scenarioHardwareReasoning, scenarioHardwareDispositionConfirmed: state.scenarioHardwareDispositionConfirmed,
      checkpoint: { config: state.config, configDraft: state.configDraft, configurationBackup: state.configurationBackup,
        configDirty: state.configDirty, needBackup: state.needBackup, scenarioStage: state.scenarioStage, diagnosticState: state.diagnosticState } };
  });
  const externalLeadingPanel = mode === "student" ? leadingPanel : null;
  const externalSidePanel = mode === "student" ? sidePanel : null;
  const hasExternalPanels = Boolean(externalLeadingPanel || externalSidePanel);
  const inlineSidePanel = mode === "student" ? null : sidePanel;
  const setMode = useVorPmdtStore((state) => state.setMode);
  const configPanelOpen = useVorPmdtStore((state) => state.configPanelOpen);
  const scenarioParametersOpen = useVorPmdtStore((state) => state.scenarioParametersOpen);
  const scenario = useVorPmdtStore((state) => state.scenario);
  const practiceReady = practiceRequested && scenario.active && loadedPractice?.requestKey === practiceRequestKey && loadedPractice.definitionId === scenario.definition?.id;
  const getPracticePayload = () => {
    const state = useVorPmdtStore.getState();
    return {
      actionHistory: state.actionHistory,
      evidenceStats: state.evidenceStats,
      attemptEvents: state.attemptEvents,
      answer: state.answer,
      scenarioHardwareSelection: state.scenarioHardwareSelection,
      scenarioHardwareInspected: state.scenarioHardwareInspected,
      scenarioHardwareReasoning: state.scenarioHardwareReasoning,
      scenarioHardwareDispositionConfirmed: state.scenarioHardwareDispositionConfirmed,
      checkpoint: {
        config: state.config,
        configDraft: state.configDraft,
        configurationBackup: state.configurationBackup,
        configDirty: state.configDirty,
        needBackup: state.needBackup,
        scenarioStage: state.scenarioStage,
        diagnosticState: state.diagnosticState,
      },
    };
  };

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
    setScenarioAuthoringEnabled(canAuthorScenario);
  }, [canAuthorScenario, setScenarioAuthoringEnabled]);

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
    <PracticeWorkspace
      enabled={practiceRequested}
      moduleId="dvor-1150a"
      scenario={practiceReady && scenario.definition ? { id: scenario.definition.id, name: scenario.definition.name, description: scenario.definition.description, difficulty: scenario.definition.difficulty, membershipId: loadedPractice?.membershipId } : null}
      attemptKey={scenario.startedAt}
      getPayload={getPracticePayload}
      onRestart={() => scenario.definition ? startReviewScenario(scenario.definition) : false}
      hardware={{
        available: Boolean(scenario.definition?.diagnosis && scenarioEvaluation?.pmdtComplete),
        reason: !scenario.definition?.diagnosis ? "Kịch bản này chưa hỗ trợ bước xác định phần cứng." : !scenarioEvaluation?.pmdtComplete ? "Hoàn thành các checkpoint PMDT ở Bước 1 trước." : undefined,
        onOpen: () => setScenarioStage("hardware"),
      }}
    ><div className={`pmdt-classic-viewport ${hasExternalPanels ? "pmdt-classic-viewport--with-external-inspector" : ""}`}>
      <Suspense fallback={null}>
        <ScenarioParametersRouteLoader
          moduleId="dvor-1150a"
          enabled
          onLoaded={(definition, context) => {
            if (context.review) {
              if (examSnapshot && useVorPmdtStore.getState().sessionKey !== context.sessionKey) {
                useVorPmdtStore.getState().initializeSession({ mode: "student", scenarioId: definition.id, sessionKey: context.sessionKey, revisionKey: context.revisionKey, userId: sessionUserId });
              }
              const started = startReviewScenario(definition, {
                userId: sessionUserId,
                sessionKey: context.sessionKey ?? `practice:${sessionUserId || "anonymous"}:${definition.id}`,
                revisionKey: context.revisionKey,
              });
              if (started && !examSnapshot) setLoadedPractice({ requestKey: practiceRequestKey, definitionId: definition.id, membershipId: context.membershipId });
              return started;
            }
            else {
              replaceScenarioDraft(definition);
              setScenarioParametersOpen(true);
            }
          }}
        />
      </Suspense>
      <div className="dvor1150a-simulator-frame">
        {mode === "preview" || examSnapshot ? <nav className="dvor1150a-simulator-tools" aria-label="DVOR 1150A simulator tools">
          {mode === "preview" && !practiceRequested ? <SimulatorToolbarBackButton /> : null}
          {canAuthorScenario ? <button type="button" onClick={() => setScenarioParametersOpen(true)}>Scenario Parameters</button> : null}
          {canAuthorScenario ? <span className="dvor1150a-scenario-role-badge">EXAMINER</span> : null}
          {!practiceRequested ? <Dvor1150aTrainingHud examinerView={canAuthorScenario} /> : null}
          {!examSnapshot && !practiceRequested && scenario.active && scenario.definition ? (
            <PracticeAiFeedbackButton
              moduleId="dvor-1150a"
              scenarioId={scenario.definition.id}
              scenarioName={scenario.definition.name}
              attemptKey={scenario.startedAt}
              onRestart={() => startReviewScenario(scenario.definition!)}
              getPayload={getPracticePayload}
            />
          ) : null}
          {canAuthorScenario && scenario.active ? <span className="dvor1150a-scenario-active-badge">Scenario active: {scenario.definition?.name}</span> : null}
          {!practiceRequested && twoStageScenario && scenarioEvaluation ? (
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
        {canAuthorScenario && scenarioParametersOpen ? <Dvor1150aScenarioParametersPanel /> : null}
        {aboutDialogOpen ? <AboutPmdtDialog /> : null}
        {loginDialogOpen ? <PmdtLoginDialog /> : null}
        {mode === "preview" && !practiceRequested && simulatorId ? <SimulatorConfigPersistence simulatorId={simulatorId} /> : null}
        <VorScenarioSessionPersistence />
      </section>
      </div>
      {(!practiceRequested || practiceReady) && twoStageScenario && scenarioStage === "hardware" ? <Dvor1150aHardwareStage /> : null}
      {(!practiceRequested || practiceReady) && twoStageScenario && scenarioStage === "complete" ? (
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
    </div></PracticeWorkspace>
  );
}
