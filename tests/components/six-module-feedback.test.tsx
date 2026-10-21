import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dvor1150PmdtLayout } from "@/components/dvor1150/pmdt-layout";
import { PmdtLayout as Dvor1150a } from "@/components/vor/pmdt-layout";
import { PmdtLayout as Dme1119a } from "@/components/dme/pmdt-layout";
import { Dvor220Simulator } from "@/modules/operations/dvor-220/dvor220-simulator";
import { Dme320Simulator } from "@/modules/operations/dme-320/dme320-simulator";
import { createDvor220Store } from "@/modules/operations/dvor-220/store/dvor220-store";
import { createDme320Store } from "@/modules/operations/dme-320/store/dme320-store";
import { createDefaultDvor220ScenarioDefinition } from "@/modules/operations/dvor-220/domain/scenario";
import { createDefaultDme320ScenarioDefinition } from "@/modules/operations/dme-320/domain/scenario";
import { createDefaultDvor1150ScenarioDefinition } from "@/lib/dvor1150/scenario";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { createLowOutputDme1119aScenario } from "@/lib/dme1119a/scenario";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { useScenarioStore, DEFAULT_SCENARIOS } from "@/stores/scenario-store";
import { useRecordingStore } from "@/stores/recording-store";
import { CON_SON_HARDWARE, CON_SON_SIGNAL_PATHS } from "@/lib/hardware-model";
import { ScenarioMonitorView } from "@/components/qcms/scenario-monitor-view";
import { TerminalSession } from "@/components/terminal/terminal-session";
import { ScenarioExamSnapshotProvider } from "@/components/scenario-exams/scenario-exam-snapshot-context";
import type { ScenarioParametersDefinition, ScenarioParametersModuleId } from "@/lib/scenario-parameters";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/exams/actions", () => ({ completeExamAttemptItemAction: vi.fn() }));
// Profile persistence is unrelated to submission and would reach a live API.
vi.mock("@/components/simulator/simulator-config-persistence", () => ({
  SimulatorConfigPersistence: () => null, Dvor1150ConfigPersistenceBoundary: () => null,
  Dvor220ConfigPersistenceBoundary: () => null, Dme320ConfigPersistenceBoundary: () => null,
}));
const json = (data: unknown) => new Response(JSON.stringify(data));
const report = { moduleId: "dvor-1150a", scenarioId: "one", scenarioName: "Exercise", status: "SOLVED", solved: true, sourceMode: "deterministic-only", summary: "Snapshot nhận xét đã lưu", whatToAchieve: [], correctActions: [], redundantOrWrongAdjustments: [], nextSteps: [], suggestedExaminerComment: "", references: [], notice: "Tư vấn." };
const modules = ["dvor-1150", "dvor-1150a", "dme-1119a", "dvor-220", "dme-320"] as const;
function prepare(moduleId: typeof modules[number]) {
  switch (moduleId) {
    case "dvor-1150": {
      const definition = createDefaultDvor1150ScenarioDefinition();
      useDvor1150PmdtStore.getState().initializeStudentScenario(definition);
      return { definition, ui: <Dvor1150PmdtLayout />, mutate: () => useDvor1150PmdtStore.setState({ scenarioHardwareReasoning: "dirty" }), isReset: () => useDvor1150PmdtStore.getState().scenarioHardwareReasoning === "" };
    }
    case "dvor-1150a": {
      const definition = createDefaultDvor1150aScenarioDefinition();
      useVorPmdtStore.getState().startReviewScenario(definition);
      return { definition, ui: <Dvor1150a />, mutate: () => useVorPmdtStore.setState({ scenarioHardwareReasoning: "dirty" }), isReset: () => useVorPmdtStore.getState().scenarioHardwareReasoning === "" };
    }
    case "dme-1119a": {
      const definition = createLowOutputDme1119aScenario();
      useDmePmdtStore.getState().startReviewScenario(definition);
      return { definition, ui: <Dme1119a />, mutate: () => useDmePmdtStore.setState({ scenarioHardwareReasoning: "dirty" }), isReset: () => useDmePmdtStore.getState().scenarioHardwareReasoning === "" };
    }
    case "dvor-220": {
      const definition = createDefaultDvor220ScenarioDefinition();
      const store = createDvor220Store();
      expect(store.getState().dispatch({ type: "apply-scenario", scenario: definition }).ok).toBe(true);
      store.setState(({ device }) => ({ device: { ...device, configuration: { ...device.configuration, flash: { ...device.configuration.flash, station: { ...device.configuration.flash.station, stationName: "Saved operator profile" } } } } }));
      return { definition, ui: <Dvor220Simulator store={store} />, mutate: () => store.setState(({ device }) => ({ device: { ...device, history: { ...device.history, parameterChanges: [{ id: "dirty" } as never] } } })), isReset: () => store.getState().device.history.parameterChanges.length === 0 && store.getState().device.configuration.flash.station.stationName === "Saved operator profile" };
    }
    case "dme-320": {
      const definition = createDefaultDme320ScenarioDefinition();
      const store = createDme320Store();
      expect(store.getState().dispatch({ type: "apply-scenario", scenario: definition }).accepted).toBe(true);
      store.setState(({ simulation }) => ({ simulation: { ...simulation, config: { ...simulation.config, flash: { ...simulation.config.flash, station: { ...simulation.config.flash.station, stationName: "Saved operator profile" } } }, scenario: { ...simulation.scenario, returnConfiguration: { ...simulation.config, flash: { ...simulation.config.flash, station: { ...simulation.config.flash.station, stationName: "Saved operator profile" } } } } } }));
      return { definition, ui: <Dme320Simulator store={store} />, mutate: () => store.setState(({ simulation }) => ({ simulation: { ...simulation, parameterChangeLogs: [{ id: "dirty" } as never] } })), isReset: () => store.getState().simulation.parameterChangeLogs.length === 0 && store.getState().simulation.config.flash.station.stationName === "Saved operator profile" };
    }
  }
}
beforeEach(() => {
  useDvor1150PmdtStore.getState().reset(); useVorPmdtStore.getState().reset(); useDmePmdtStore.getState().reset();
  useRecordingStore.getState().resetAttempt();
  useScenarioStore.setState({ sessionIdentity: "verified-student", sessionScope: "practice", isHydrated: true, scenarios: structuredClone([...DEFAULT_SCENARIOS]) });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("real simulator submission integration", () => {
  it("ADS-B hardware NỘP BÀI persists diagnosis and automatically shows feedback outside any blocking modal", async () => {
    const scenario = structuredClone(DEFAULT_SCENARIOS[0]);
    scenario.hardwareFault = { faultyComponentIds: [CON_SON_HARDWARE[0].id], faultType: "open", faultDescription: "Training fixture", hardwareLayout: structuredClone(CON_SON_HARDWARE), signalPaths: structuredClone(CON_SON_SIGNAL_PATHS), expectedSensorStatus: "red", terminalSymptoms: [], qcmsSymptoms: [], diagnosticSteps: [] };
    useScenarioStore.setState({ scenarios: [scenario] });
    useRecordingStore.getState().beginAttempt(scenario.id);
    useRecordingStore.getState().completeTerminal();
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => String(url).includes("practice-submissions") ? json({ submissionId: "hardware-submission" }) : json({ status: "completed", feedback: report }));
    render(<ScenarioMonitorView scenarioId={scenario.id} autoOpenHardware />);
    const dialog = screen.getByRole("dialog", { name: "Chẩn đoán đường tín hiệu" });
    const component = within(dialog).getAllByRole("button").find((button) => button.hasAttribute("aria-pressed"))!;
    fireEvent.click(component);
    fireEvent.click(within(dialog).getByRole("checkbox"));
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "NỘP BÀI" }));
    await screen.findByText(report.summary);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({ moduleId: "ads-b", scenarioId: scenario.id, payload: { scenarioHardwareSelection: expect.arrayContaining([expect.any(String)]), scenarioHardwareInspected: expect.arrayContaining([expect.any(String)]) } });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it.each(["terminal", "qcms"])("ADS-B %s has no AI controls or requests in a legacy official exam", (surface) => {
    const scenario = structuredClone(DEFAULT_SCENARIOS[0]);
    const officialExam = { attemptItemId: "official-item", sessionKey: "official", returnHref: "/student/exams" };
    const fetcher = vi.spyOn(globalThis, "fetch");
    render(surface === "terminal" ? <TerminalSession scenarioId={scenario.id} cacheOwnerId="verified-student" officialExam={officialExam} officialScenario={scenario} /> : <ScenarioMonitorView scenarioId={scenario.id} officialExam={officialExam} officialScenario={scenario} />);
    expect(screen.queryByRole("button", { name: "Nộp bài ôn tập" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "AI nhận xét bài làm" })).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(modules)("%s submits once, reads automatically, and restarts actual simulator state", async (moduleId) => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => String(url).includes("practice-submissions") ? json({ submissionId: "submitted-one" }) : json({ status: "completed", feedback: report }));
    const runtime = prepare(moduleId);
    render(runtime.ui);
    expect(fetcher).not.toHaveBeenCalled();
    act(runtime.mutate);
    expect(runtime.isReset()).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài ôn tập" }));
    await screen.findByText(report.summary);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({ moduleId, scenarioId: runtime.definition.id });
    expect(fetcher.mock.calls[1][0]).toBe("/api/ai/attempt-feedback?practiceSubmissionId=submitted-one");
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu lượt ôn tập mới" }));
    expect(runtime.isReset()).toBe(true);
    expect(screen.queryByText(report.summary)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nộp bài ôn tập" })).toBeEnabled();
  });
  it.each(modules)("%s hides all practice controls and issues no feedback request during an official exam", (moduleId) => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    const runtime = prepare(moduleId);
    render(<ScenarioExamSnapshotProvider snapshot={{ moduleId: moduleId as ScenarioParametersModuleId, definition: runtime.definition as ScenarioParametersDefinition, sessionKey: "official:item", revisionKey: "official:1" }}>{runtime.ui}</ScenarioExamSnapshotProvider>);
    expect(screen.queryByRole("button", { name: "Nộp bài ôn tập" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "AI nhận xét bài làm" })).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("ADS-B's existing Nộp bài submits its immutable snapshot without a second AI or submission click", async () => {
    const scenario = structuredClone(DEFAULT_SCENARIOS[0]);
    delete scenario.hardwareFault;
    useScenarioStore.setState({ scenarios: [scenario] });
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => String(url).includes("practice-submissions") ? json({ submissionId: "adsb-submission" }) : json({ status: "completed", feedback: report }));
    render(<TerminalSession scenarioId={scenario.id} cacheOwnerId="verified-student" />);
    act(() => { useRecordingStore.getState().addAction({ ...scenario.expectedActions[0], kind: "menu-selection", step: 1, timestamp: 1 }); useRecordingStore.getState().selectAll(); });
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Nộp bài ôn tập" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));
    await screen.findByText(report.summary);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({ moduleId: "ads-b", scenarioId: scenario.id, payload: { selectedActions: useRecordingStore.getState().selectedActions } });
  });
});
