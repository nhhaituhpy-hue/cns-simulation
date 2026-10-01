"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { Dvor1150MenuBar } from "./pmdt-menu-bar";
import { Dvor1150LoginDialog } from "./pmdt-login-dialog";
import { Dvor1150ScreenRouter } from "./pmdt-screens";
import { Dvor1150Sidebar } from "./pmdt-sidebar";
import { Dvor1150StatusBar } from "./pmdt-status-bar";
import { Dvor1150TitleBar } from "./pmdt-title-bar";
import { Dvor1150SimulationParametersPanel } from "./pmdt-simulation-parameters";
import { Dvor1150ScenarioParametersPanel } from "./pmdt-scenario-parameters";
import { Dvor1150TrainingHud } from "./pmdt-training-hud";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import type { Dvor1150PmdtMode } from "@/lib/dvor1150";
import { Dvor1150ConfigPersistenceBoundary } from "@/components/simulator/simulator-config-persistence";
import { SimulatorToolbarBackButton } from "@/components/simulator/simulator-toolbar-back-button";
import { ScenarioParametersRouteLoader } from "@/components/scenario/scenario-parameters-route-loader";
import { Dvor1150HardwareStage } from "./dvor1150-hardware-stage";
import { evaluateDvor1150Scenario } from "@/lib/dvor1150";
import { useScenarioExamResultReader, useScenarioExamSnapshot } from "@/components/scenario-exams/scenario-exam-snapshot-context";

export interface Dvor1150PmdtLayoutProps {
  mode?: Dvor1150PmdtMode;
  scenarioAuthoringEnabled?: boolean;
  leadingPanel?: ReactNode;
  sidePanel?: ReactNode;
}

export function Dvor1150PmdtLayout({
  mode = "preview",
  scenarioAuthoringEnabled = false,
  leadingPanel,
  sidePanel,
}: Dvor1150PmdtLayoutProps) {
  const examSnapshot = useScenarioExamSnapshot();
  useScenarioExamResultReader(() => {
    const state = useDvor1150PmdtStore.getState();
    if (!examSnapshot || !state.scenario.active || state.scenario.definition?.id !== examSnapshot.definition.id) return null;
    return { visitedViewIds: state.scenarioVisitedViewIds, acceptedActionControlIds: state.scenarioAcceptedActionControlIds,
      scenarioHardwareSelection: state.scenarioHardwareSelection, scenarioHardwareInspected: state.scenarioHardwareInspected,
      scenarioHardwareReasoning: state.scenarioHardwareReasoning, scenarioHardwareDispositionConfirmed: state.scenarioHardwareDispositionConfirmed,
      parameterChangeLogs: state.parameterChangeLogs,
      checkpoint: { config: state.config, configDraft: state.configDraft, configurationBackup: state.configurationBackup,
        configDirty: state.configDirty, needBackup: state.needBackup, scenarioStage: state.scenarioStage, diagnosticState: state.diagnosticState } };
  });
  const externalLeadingPanel = mode === "student" ? leadingPanel : null;
  const externalSidePanel = mode === "student" ? sidePanel : null;
  const hasExternalPanels = Boolean(externalLeadingPanel || externalSidePanel);
  const inlineSidePanel = mode === "student" ? null : sidePanel;
  const setMode = useDvor1150PmdtStore((state) => state.setMode);
  const loginOpen = useDvor1150PmdtStore((state) => state.loginDialogOpen);
  const apply = useDvor1150PmdtStore((state) => state.applyConfigChanges);
  const reset = useDvor1150PmdtStore((state) => state.resetConfigDraft);
  const next = useDvor1150PmdtStore((state) => state.nextView);
  const close = useDvor1150PmdtStore((state) => state.closeScreen);
  const refreshClock = useDvor1150PmdtStore((state) => state.refreshClock);
  const simulationParametersOpen = useDvor1150PmdtStore((state) => state.simulationParametersOpen);
  const scenarioParametersOpen = useDvor1150PmdtStore((state) => state.scenarioParametersOpen);
  const setScenarioParametersOpen = useDvor1150PmdtStore((state) => state.setScenarioParametersOpen);
  const setScenarioAuthoringEnabled = useDvor1150PmdtStore((state) => state.setScenarioAuthoringEnabled);
  const replaceScenarioDraft = useDvor1150PmdtStore((state) => state.replaceScenarioDraft);
  const initializeStudentScenario = useDvor1150PmdtStore((state) => state.initializeStudentScenario);
  const scenario = useDvor1150PmdtStore((state) => state.scenario);
  const runtime = useDvor1150PmdtStore();
  const examEvaluation = examSnapshot && scenario.active ? evaluateDvor1150Scenario(scenario, runtime.derived, runtime.config, {
    visitedViewIds: runtime.scenarioVisitedViewIds, acceptedActionControlIds: runtime.scenarioAcceptedActionControlIds,
    selectedHardwareOccurrenceKeys: runtime.scenarioHardwareSelection, hardwareDispositionConfirmed: runtime.scenarioHardwareDispositionConfirmed,
  }) : null;

  useEffect(() => { setMode(mode); }, [mode, setMode]);
  useEffect(() => { setScenarioAuthoringEnabled(scenarioAuthoringEnabled); }, [scenarioAuthoringEnabled, setScenarioAuthoringEnabled]);
  useEffect(() => {
    refreshClock();
    const timer = window.setInterval(refreshClock, 1000);
    return () => window.clearInterval(timer);
  }, [refreshClock]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "F5") { event.preventDefault(); next(); }
      if (event.key === "F6") { event.preventDefault(); close(); }
      if (event.key === "F7") { event.preventDefault(); apply(); }
      if (event.key === "F8") { event.preventDefault(); reset(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [apply, close, next, reset]);

  return <div className={`pmdt-classic-viewport ${hasExternalPanels ? "pmdt-classic-viewport--with-external-inspector" : ""} ${mode === "student" ? "pmdt-classic-viewport--legacy-dvor1150" : ""}`}>
    <Suspense fallback={null}>
      <ScenarioParametersRouteLoader
        moduleId="dvor-1150"
        enabled
        onLoaded={(definition, context) => {
          if (context.review) return initializeStudentScenario(definition);
          else {
            replaceScenarioDraft(definition);
            setScenarioParametersOpen(true);
          }
        }}
      />
    </Suspense>
    <div className="dvor1150-simulator-frame">
      {mode === "preview" || scenarioAuthoringEnabled || scenario.active ? <nav className="dvor1150-simulator-tools" aria-label="DVOR 1150 simulator tools">
        {mode === "preview" ? <SimulatorToolbarBackButton /> : null}
        {scenarioAuthoringEnabled ? <button type="button" onClick={() => setScenarioParametersOpen(true)}>Scenario Parameters</button> : null}
        {scenarioAuthoringEnabled ? <span className="dvor1150-scenario-role-badge">EXAMINER</span> : null}
        <Dvor1150TrainingHud examinerView={scenarioAuthoringEnabled} />
        {examSnapshot && scenario.definition?.diagnosis ? <button type="button" disabled={!examEvaluation?.pmdtComplete} onClick={() => runtime.setScenarioStage("hardware")}>Tiếp tục: Xác định phần cứng</button> : null}
        {scenarioAuthoringEnabled && scenario.active ? <span className="dvor1150-scenario-active-badge">Scenario active: {scenario.definition?.name}</span> : null}
      </nav> : null}
      <section className={`pmdt-classic-window dvor1150-pmdt-window ${inlineSidePanel ? "pmdt-classic-window--with-inspector" : "pmdt-classic-window--standard"}`} aria-label="DVOR 1150 PMDT Simulator">
        <div className="pmdt-titlebar-row"><Dvor1150TitleBar /></div>
        <div className="pmdt-menubar-row"><Dvor1150MenuBar /></div>
        <Dvor1150Sidebar />
        <main className="pmdt-classic-main">{loginOpen ? <div className="pmdt-prelogin-workspace" aria-hidden /> : <Dvor1150ScreenRouter />}</main>
        {inlineSidePanel ? <aside aria-label="Bảng thông tin simulator" className="pmdt-classic-inspector">{inlineSidePanel}</aside> : null}
        <div className="pmdt-statusbar-row"><Dvor1150StatusBar /></div>
        {simulationParametersOpen ? <Dvor1150SimulationParametersPanel /> : null}
        {scenarioAuthoringEnabled && scenarioParametersOpen ? <Dvor1150ScenarioParametersPanel /> : null}
        {loginOpen ? <Dvor1150LoginDialog /> : null}
        {mode === "preview" ? <Dvor1150ConfigPersistenceBoundary /> : null}
      </section>
    </div>
    {externalLeadingPanel ? <aside aria-label="Nhật ký học viên" className="pmdt-classic-inspector pmdt-classic-inspector--external pmdt-classic-inspector--external-leading">{externalLeadingPanel}</aside> : null}
    {externalSidePanel ? <aside aria-label="Màn hình và thao tác đã ghi nhận" className="pmdt-classic-inspector pmdt-classic-inspector--external">{externalSidePanel}</aside> : null}
    {examSnapshot && runtime.scenarioStage === "hardware" ? <Dvor1150HardwareStage /> : null}
  </div>;
}
