import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { CandidateAdsbRuntime } from "@/components/scenario-exams/candidate-adsb-runtime";
import { CandidateExamItem } from "@/components/scenario-exams/candidate-exam-item";
import { ScenarioExamSnapshotProvider } from "@/components/scenario-exams/scenario-exam-snapshot-context";
import { Dvor1150PmdtLayout } from "@/components/dvor1150/pmdt-layout";
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
import { parseScenarioParameters, type ScenarioParametersDefinition, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { useRecordingStore } from "@/stores/recording-store";
import type { CandidateScenarioExamItem } from "@/lib/scenario-exams/types";
import type { ScenarioActionEvent } from "@/lib/scenario-evidence";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  // An injected source URL must never override the assigned snapshot.
  useSearchParams: () => new URLSearchParams("scenarioId=another-source&review=1&sessionKey=another-session"),
}));

const sessionKey = "scenario-exam:session-1:item-1";
const revisionKey = "exam:item-1:7";
const previousAction: ScenarioActionEvent = { id: "previous-item-action", sequence: 1, occurredAt: "2026-10-01T00:00:00.000Z", actor: "student", kind: "control", menuPath: [], label: "Other session action", accepted: true };
function assigned(moduleId: ScenarioParametersModuleId, definition: ScenarioParametersDefinition, children: ReactNode) {
  return <ScenarioExamSnapshotProvider snapshot={{ moduleId, definition, sessionKey, revisionKey }}>{children}</ScenarioExamSnapshotProvider>;
}
function runtimeItem(moduleId: ScenarioParametersModuleId, definition: ScenarioParametersDefinition): CandidateScenarioExamItem {
  return {
    id: "item-1", sessionId: "session-1", subjectId: "subject-1", moduleId, definition, revision: 7,
    examName: "Exam", candidateName: "Candidate", candidateUnit: "Unit", scenarioName: definition.name,
    startedAt: new Date().toISOString(), deadlineAt: new Date(Date.now() + 3600000).toISOString(),
  };
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.localStorage.clear();
  useDvor1150PmdtStore.getState().reset();
  useVorPmdtStore.getState().reset();
  useDmePmdtStore.getState().reset();
  useRecordingStore.getState().resetAttempt();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Source catalog must not be fetched")));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("assigned simulator snapshots", () => {
  it("hydrates DVOR 1150 in student mode", async () => {
    const definition = createDefaultDvor1150ScenarioDefinition();
    render(assigned("dvor-1150", definition, <Dvor1150PmdtLayout mode="student" />));
    await waitFor(() => expect(useDvor1150PmdtStore.getState().scenario.definition?.id).toBe(definition.id));
    expect(useDvor1150PmdtStore.getState().mode).toBe("student");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hydrates DVOR 1150A with the assigned item and revision identity", async () => {
    const definition = createDefaultDvor1150aScenarioDefinition();
    useVorPmdtStore.setState({ sessionKey: "previous-item", studentName: "Previous candidate", workUnit: "Previous unit", actionHistory: [previousAction], answer: { suspectedFault: "Previous answer", reasoning: "", remediation: "" } });
    render(<CandidateExamItem item={runtimeItem("dvor-1150a", definition)} />);
    await waitFor(() => expect(useVorPmdtStore.getState().scenario.definition?.id).toBe(definition.id));
    expect(useVorPmdtStore.getState()).toMatchObject({ mode: "student", userId: "session-1", sessionKey, scenarioRevisionKey: revisionKey });
    expect(useVorPmdtStore.getState()).toMatchObject({ studentName: "", workUnit: "", answer: { suspectedFault: "" } });
    expect(useVorPmdtStore.getState().actionHistory).not.toContainEqual(previousAction);
    expect(screen.getByRole("link", { name: "Quay lại phiên thi" })).toHaveAttribute("href", "/student/scenario-exams/session");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("unmounts the simulator when opening an item at its original deadline", () => {
    const definition = createDefaultDvor1150aScenarioDefinition();
    const item = runtimeItem("dvor-1150a", definition);
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(item.deadlineAt));
    render(<CandidateExamItem item={item} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Phiên thi đã hết thời gian");
    expect(useVorPmdtStore.getState().scenario.active).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hydrates DME 1119A with the assigned item and revision identity", async () => {
    const definition = createLowOutputDme1119aScenario();
    useDmePmdtStore.setState({ sessionKey: "previous-item", studentName: "Previous candidate", workUnit: "Previous unit", actionHistory: [previousAction], answer: { suspectedFault: "Previous answer", reasoning: "", remediation: "" } });
    render(assigned("dme-1119a", definition, <Dme1119a mode="student" sessionUserId="session-1" />));
    await waitFor(() => expect(useDmePmdtStore.getState().scenario.definition?.id).toBe(definition.id));
    expect(useDmePmdtStore.getState()).toMatchObject({ mode: "student", userId: "session-1", sessionKey, scenarioRevisionKey: revisionKey });
    expect(useDmePmdtStore.getState()).toMatchObject({ studentName: "", workUnit: "", answer: { suspectedFault: "" } });
    expect(useDmePmdtStore.getState().actionHistory).not.toContainEqual(previousAction);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hydrates DVOR 220 without loading saved user configuration or exposing authoring tools", async () => {
    const definition = createDefaultDvor220ScenarioDefinition();
    const store = createDvor220Store();
    render(assigned("dvor-220", definition, <Dvor220Simulator store={store} />));
    await waitFor(() => expect(store.getState().device.scenario.definition?.id).toBe(definition.id));
    expect(store.getState().device.scenario.active).toBe(true);
    expect(screen.queryByRole("button", { name: "Simulator Tools" })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hydrates DME 320 without loading saved user configuration or exposing authoring tools", async () => {
    const definition = createDefaultDme320ScenarioDefinition();
    const store = createDme320Store();
    render(assigned("dme-320", definition, <Dme320Simulator store={store} />));
    await waitFor(() => expect(store.getState().simulation.scenario.definition?.id).toBe(definition.id));
    expect(store.getState().simulation.scenario.active).toBe(true);
    expect(screen.queryByRole("button", { name: "Simulator Tools" })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("opens ADS-B QCMS and the snapshot's terminal without loading the source catalog", () => {
    const definition = parseScenarioParameters("ads-b", {
      schemaVersion: 1, id: "adsb-assigned", name: "Assigned ADS-B", description: "Test scenario", difficulty: "basic",
      sites: [{ id: "site-1", name: "Site 1", sensorA: { id: "sensor-1", name: "Sensor A", sensorLabel: "A", status: "red", ipAddress: "192.0.2.1" }, sensorB: null }],
      targetSensorId: "sensor-1", targetLoginUser: "sysadmin",
      expectedActions: [{ step: 1, kind: "authentication", menuId: "login", menuTitle: "Login", input: "sysadmin", resultLabel: "Authenticated", timestamp: 1 }],
    })!;
    render(<CandidateAdsbRuntime item={{ id: "item-1", sessionId: "session-1", subjectId: "subject-1", moduleId: "ads-b", examName: "Exam", candidateName: "Candidate", candidateUnit: "Unit", scenarioName: definition.name, startedAt: "2026-10-01T00:00:00.000Z", deadlineAt: "2026-10-01T01:00:00.000Z", revision: 7, definition }} />);
    expect(screen.getByRole("region", { name: "Làm bài ADS-B" })).toBeInTheDocument();
    expect(useRecordingStore.getState().sessionKey).toBe(sessionKey);
    fireEvent.click(screen.getByRole("button", { name: "Terminal" }));
    expect(screen.getByRole("region", { name: "Terminal SSH mô phỏng đến 192.0.2.1" })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
