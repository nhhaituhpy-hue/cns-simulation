import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { CandidateAdsbRuntime } from "@/components/scenario-exams/candidate-adsb-runtime";
import { CandidateExamItem } from "@/components/scenario-exams/candidate-exam-item";
import { ScenarioExamSnapshotProvider, type ScenarioExamResultReader } from "@/components/scenario-exams/scenario-exam-snapshot-context";
import { Dvor1150PmdtLayout } from "@/components/dvor1150/pmdt-layout";
import { PmdtLayout as Dme1119a } from "@/components/dme/pmdt-layout";
import { Dvor220Simulator } from "@/modules/operations/dvor-220/dvor220-simulator";
import { Dme320Simulator } from "@/modules/operations/dme-320/dme320-simulator";
import { createDvor220Store } from "@/modules/operations/dvor-220/store/dvor220-store";
import { createDme320Store } from "@/modules/operations/dme-320/store/dme320-store";
import { createDefaultDvor220ScenarioDefinition } from "@/modules/operations/dvor-220/domain/scenario";
import { createDefaultDme320ScenarioDefinition } from "@/modules/operations/dme-320/domain/scenario";
import { createDefaultDvor1150ScenarioDefinition } from "@/lib/dvor1150/scenario";
import { createDefaultDvor1150aScenarioDefinition, createLvpsTx1PowerScenario } from "@/lib/dvor1150a/scenario";
import { dvorHardwareOccurrenceKey } from "@/modules/devices/dvor-1150a/block-diagram-data";
import { createDefaultDme1119aScenarioDefinition, createLowOutputDme1119aScenario } from "@/lib/dme1119a/scenario";
import { parseScenarioParameters, type ScenarioParametersDefinition, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { useRecordingStore } from "@/stores/recording-store";
import type { CandidateScenarioExamItem, CandidateScenarioExamResult, ScenarioExamSubmissionReview } from "@/lib/scenario-exams/types";
import type { ScenarioActionEvent } from "@/lib/scenario-evidence";
import { buildCandidateScenarioExamResult } from "@/lib/scenario-exams/browser-results";
import { ScenarioExamSubmissionReviewView } from "@/components/scenario-exams/scenario-exam-submission-review";
import { evaluateScenarioExamResult } from "@/lib/scenario-exams/evaluation";

const actionMocks = vi.hoisted(() => ({ save: vi.fn(), submit: vi.fn(), grade: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/scenario-exams/actions", () => ({ saveScenarioExamItemAction: actionMocks.save, submitScenarioExamItemAction: actionMocks.submit, saveScenarioExamReviewAction: actionMocks.grade }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: actionMocks.push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: actionMocks.refresh, prefetch: vi.fn() }),
  // An injected source URL must never override the assigned snapshot.
  useSearchParams: () => new URLSearchParams("scenarioId=another-source&review=1&sessionKey=another-session"),
}));

const sessionKey = "scenario-exam:session-1:item-1";
const revisionKey = "exam:item-1:7";
const previousAction: ScenarioActionEvent = { id: "previous-item-action", sequence: 1, occurredAt: "2026-10-01T00:00:00.000Z", actor: "student", kind: "control", menuPath: [], label: "Other session action", accepted: true };
let activeResultReader: ScenarioExamResultReader | null = null;
function assigned(moduleId: ScenarioParametersModuleId, definition: ScenarioParametersDefinition, children: ReactNode) {
  return <ScenarioExamSnapshotProvider snapshot={{ moduleId, definition, sessionKey, revisionKey }} registerResultReader={(reader) => { activeResultReader = reader; return () => { if (activeResultReader === reader) activeResultReader = null; }; }}>{children}</ScenarioExamSnapshotProvider>;
}
function runtimeItem(moduleId: ScenarioParametersModuleId, definition: ScenarioParametersDefinition): CandidateScenarioExamItem {
  return {
    id: "item-1", sessionId: "session-1", subjectId: "subject-1", moduleId, definition, revision: 7,
    examName: "Exam", candidateName: "Candidate", candidateUnit: "Unit", scenarioName: definition.name,
    startedAt: new Date().toISOString(), deadlineAt: new Date(Date.now() + 3600000).toISOString(),
  };
}

beforeEach(() => {
  activeResultReader = null;
  vi.clearAllMocks();
  actionMocks.save.mockResolvedValue({ ok: true, message: "Đã lưu bài làm." });
  actionMocks.submit.mockResolvedValue({ ok: true, message: "Đã nộp môn thi." });
  vi.spyOn(window, "confirm").mockReturnValue(true);
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
  it("shows editable conclusions and saves their exact values", async () => {
    render(<CandidateExamItem item={runtimeItem("dvor-1150a", createDefaultDvor1150aScenarioDefinition())} />);
    await waitFor(() => expect(useVorPmdtStore.getState().sessionKey).toBe(sessionKey));
    fireEvent.change(screen.getByLabelText("Vị trí / sự cố nghi ngờ"), { target: { value: "LVPS TX1" } });
    fireEvent.change(screen.getByLabelText("Căn cứ chẩn đoán"), { target: { value: "Nguồn +5V thấp" } });
    fireEvent.change(screen.getByLabelText("Hướng khắc phục"), { target: { value: "Kiểm tra và thay card" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu bài làm" }));
    await waitFor(() => expect(actionMocks.save).toHaveBeenCalled());
    expect(actionMocks.save.mock.calls[0]?.[1].payload.answer).toEqual({ suspectedFault: "LVPS TX1", reasoning: "Nguồn +5V thấp", remediation: "Kiểm tra và thay card" });
  });

  it("exposes the hardware stage in a real exam and records card inspection, selection and reasoning", async () => {
    const definition = createLvpsTx1PowerScenario();
    render(<CandidateExamItem item={runtimeItem("dvor-1150a", definition)} />);
    await waitFor(() => expect(useVorPmdtStore.getState().scenario.definition?.id).toBe(definition.id));
    const next = screen.getByRole("button", { name: "Tiếp tục: Xác định phần cứng" });
    expect(next).toBeDisabled();
    act(() => useVorPmdtStore.setState({
      attemptEvents: definition.diagnosis!.pmdtCheckpoints.map((entry, index) => ({ id: `event-${index}`, sequence: index + 1, eventType: "view", screenId: "home", viewId: entry.viewId, menuPath: [], title: entry.label, visitedAt: new Date().toISOString(), annotation: "" })),
      actionHistory: definition.diagnosis!.requiredActionControlIds.map((controlId, index) => ({ ...previousAction, id: `action-${index}`, controlId })),
    }));
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(screen.getByText("Khối/card đã kiểm tra")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Control & Monitoring" }));
    fireEvent.click(screen.getByRole("button", { name: "Chọn LVPS 1" }));
    const key = dvorHardwareOccurrenceKey(definition.diagnosis!.expectedHardware[0]);
    expect(useVorPmdtStore.getState().scenarioHardwareInspected).toContain(key);
    expect(useVorPmdtStore.getState().scenarioHardwareSelection).toContain(key);
    fireEvent.change(screen.getByLabelText("Lý do xử lý phần cứng"), { target: { value: "RMS nguồn +5V thấp liên hệ với LVPS 1A3A4" } });
    expect(useVorPmdtStore.getState().scenarioHardwareReasoning).toContain("1A3A4");
    fireEvent.click(screen.getByRole("button", { name: "Quay lại PMDT" }));
    await waitFor(() => expect(screen.getAllByText("SOLVED").length).toBeGreaterThan(0), { timeout: 2500 });
    fireEvent.click(screen.getByRole("button", { name: "Lưu bài làm" }));
    await waitFor(() => expect(actionMocks.save).toHaveBeenCalled());
    expect(actionMocks.save.mock.calls[0]?.[1].payload).toMatchObject({ scenarioHardwareInspected: [key], scenarioHardwareSelection: [key], scenarioHardwareReasoning: "RMS nguồn +5V thấp liên hệ với LVPS 1A3A4" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Nộp môn" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Nộp môn" }));
    await waitFor(() => expect(actionMocks.submit).toHaveBeenCalledOnce());
    const result = actionMocks.submit.mock.calls[0][1] as CandidateScenarioExamResult;
    cleanup();
    // The examiner must read the submitted snapshot, independent of live stores.
    act(() => useVorPmdtStore.setState({ scenarioHardwareSelection: [], scenarioHardwareInspected: [], scenarioHardwareReasoning: "Another live session" }));
    const submitted: ScenarioExamSubmissionReview = { examId: "exam", examName: "Exam", codeId: "code", codeHint: "0001", candidateName: "Candidate", candidateUnit: "Unit", codeStatus: "submitted", sessionStatus: "submitted", startedAt: null, deadlineAt: null, submittedAt: result.capturedAt,
      subjects: [{ subjectId: "subject", moduleId: "dvor-1150a", status: "submitted", itemId: result.sessionItemId, scenarioName: definition.name, revision: 7, startedAt: null, submittedAt: result.capturedAt, definition, result, resultInvalid: false, examinerScore: null, examinerComment: "", reviewedAt: null, reviewedByName: null,
        technicalSummary: evaluateScenarioExamResult("dvor-1150a", definition, result.payload) }] };
    render(<ScenarioExamSubmissionReviewView review={submitted} />);
    const hardware = screen.getByRole("region", { name: "Lựa chọn khối/card trong bài nộp" });
    expect(within(hardware).getAllByText(/LVPS.*1/).length).toBeGreaterThan(0);
    const selectedHardware = within(hardware).getByRole("heading", { name: "Thí sinh lựa chọn" }).parentElement!;
    const expectedHardware = within(hardware).getByRole("heading", { name: "Đáp án của Scenario đã cấp" }).parentElement!;
    expect(within(selectedHardware).getByText("Vị trí: 1A3A4")).toBeVisible();
    expect(within(expectedHardware).getByText("Vị trí: 1A3A4")).toBeVisible();
    expect(within(hardware).getByText("RMS nguồn +5V thấp liên hệ với LVPS 1A3A4")).toBeVisible();
    expect(within(hardware).getByText("Khớp đáp án")).toBeVisible();
    expect(within(hardware).queryByText("Another live session")).not.toBeInTheDocument();
  });

  it("lets the candidate return to the session when the assigned runtime cannot initialize", async () => {
    render(<CandidateExamItem item={runtimeItem("dme-1119a", createDefaultDme1119aScenarioDefinition())} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể khởi tạo Scenario đã cấp");
    fireEvent.click(screen.getByRole("link", { name: "Quay lại phiên thi" }));
    await waitFor(() => expect(actionMocks.push).toHaveBeenCalledWith("/student/scenario-exams/session"));
    expect(actionMocks.save).not.toHaveBeenCalled();
  });

  it("saves the actual Selex result before returning to the session", async () => {
    const item = runtimeItem("dvor-1150a", createDefaultDvor1150aScenarioDefinition());
    render(<CandidateExamItem item={item} />);
    await waitFor(() => expect(useVorPmdtStore.getState().sessionKey).toBe(sessionKey));
    fireEvent.click(screen.getByRole("link", { name: "Quay lại phiên thi" }));
    await waitFor(() => expect(actionMocks.save).toHaveBeenCalledOnce());
    expect(actionMocks.save.mock.calls[0]?.[1]).toMatchObject({ sessionItemId: item.id, scenarioId: item.definition.id, revision: 7, payload: { answer: useVorPmdtStore.getState().answer } });
    expect(actionMocks.push).toHaveBeenCalledWith("/student/scenario-exams/session");
  });

  it("submits a module only after confirmation and server ACK", async () => {
    const item = runtimeItem("dvor-1150a", createDefaultDvor1150aScenarioDefinition());
    render(<CandidateExamItem item={item} />);
    await waitFor(() => expect(useVorPmdtStore.getState().sessionKey).toBe(sessionKey));
    fireEvent.click(screen.getByRole("button", { name: "Nộp môn" }));
    await waitFor(() => expect(actionMocks.submit).toHaveBeenCalledOnce());
    expect(actionMocks.push).toHaveBeenCalledWith("/student/scenario-exams/session");
  });
  it("hydrates DVOR 1150 in student mode", async () => {
    const definition = createDefaultDvor1150ScenarioDefinition();
    render(assigned("dvor-1150", definition, <Dvor1150PmdtLayout mode="student" />));
    await waitFor(() => expect(useDvor1150PmdtStore.getState().scenario.definition?.id).toBe(definition.id));
    expect(useDvor1150PmdtStore.getState().mode).toBe("student");
    expect(buildCandidateScenarioExamResult(runtimeItem("dvor-1150", definition), activeResultReader!()!).payload).toHaveProperty("checkpoint.config");
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
    const result = buildCandidateScenarioExamResult(runtimeItem("dme-1119a", definition), activeResultReader!()!);
    expect(result.payload).toHaveProperty("checkpoint.data");
    expect(JSON.stringify(result)).not.toMatch(/securityAccounts|password/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hydrates DVOR 220 without loading saved user configuration or exposing authoring tools", async () => {
    const definition = createDefaultDvor220ScenarioDefinition();
    const store = createDvor220Store();
    render(assigned("dvor-220", definition, <Dvor220Simulator store={store} />));
    await waitFor(() => expect(store.getState().device.scenario.definition?.id).toBe(definition.id));
    expect(store.getState().device.scenario.active).toBe(true);
    expect(buildCandidateScenarioExamResult(runtimeItem("dvor-220", definition), activeResultReader!()!).payload).toHaveProperty("device.configuration");
    expect(screen.queryByRole("button", { name: "Simulator Tools" })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hydrates DME 320 without loading saved user configuration or exposing authoring tools", async () => {
    const definition = createDefaultDme320ScenarioDefinition();
    const store = createDme320Store();
    render(assigned("dme-320", definition, <Dme320Simulator store={store} />));
    await waitFor(() => expect(store.getState().simulation.scenario.definition?.id).toBe(definition.id));
    expect(store.getState().simulation.scenario.active).toBe(true);
    expect(buildCandidateScenarioExamResult(runtimeItem("dme-320", definition), activeResultReader!()!).payload).toHaveProperty("simulation.config");
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
    render(assigned("ads-b", definition, <CandidateAdsbRuntime item={runtimeItem("ads-b", definition)} />));
    expect(screen.getByRole("region", { name: "Làm bài ADS-B" })).toBeInTheDocument();
    expect(useRecordingStore.getState().sessionKey).toBe(sessionKey);
    fireEvent.click(screen.getByRole("button", { name: "Terminal" }));
    expect(screen.getByRole("region", { name: "Terminal SSH mô phỏng đến 192.0.2.1" })).toBeInTheDocument();
    expect(buildCandidateScenarioExamResult(runtimeItem("ads-b", definition), activeResultReader!()!).payload).toHaveProperty("terminal");
    expect(fetch).not.toHaveBeenCalled();
  });
});
