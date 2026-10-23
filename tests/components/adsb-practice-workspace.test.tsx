import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdsbPracticeWorkspace } from "@/components/scenario/adsb-practice-workspace";
import { DEFAULT_SCENARIOS, useScenarioStore } from "@/stores/scenario-store";
import { useRecordingStore } from "@/stores/recording-store";
import { useTerminalStore } from "@/stores/terminal-store";
import { CON_SON_HARDWARE, CON_SON_SIGNAL_PATHS } from "@/lib/hardware-model";

// The shared shell owns submission/hints. This boundary double exposes its
// registered native payload and hardware gate without creating a second owner.
let shell: { getPayload: () => Record<string, unknown> | null; onRestart: () => void; scenario: { id: string }; hardware: { available: boolean; onOpen: () => void } };
vi.mock("@/components/scenario/practice-workspace", () => ({
  PracticeWorkspace: (props: typeof shell & { children: ReactNode }) => {
    shell = props;
    return <div data-testid="practice-shell"><button disabled={!props.hardware.available} onClick={props.hardware.onOpen}>Bước 2 · Xác định phần cứng</button>{props.children}</div>;
  },
}));
const canonicalId = "b817bdb7-d9f2-4a1a-89d4-51059633f480";
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
function row(hardware = false) {
  const scenario = structuredClone(DEFAULT_SCENARIOS[0]);
  if (hardware) scenario.hardwareFault = { faultyComponentIds: [CON_SON_HARDWARE[0].id], faultType: "open", faultDescription: "Training fixture", hardwareLayout: structuredClone(CON_SON_HARDWARE), signalPaths: structuredClone(CON_SON_SIGNAL_PATHS), expectedSensorStatus: "red", terminalSymptoms: [], qcmsSymptoms: [], diagnosticSteps: [] };
  else delete scenario.hardwareFault;
  return { id: canonicalId, moduleId: "ads-b", scenarioId: scenario.id, membershipId: "practice-membership", revision: 2, name: "Published exercise", description: "Published situation", difficulty: "basic", definition: { ...scenario, schemaVersion: 1, name: scenario.title, difficulty: "basic" } };
}
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  useRecordingStore.getState().resetAttempt();
  useTerminalStore.getState().reset();
  useScenarioStore.setState({ sessionIdentity: "owner-one", sessionScope: "practice", isHydrated: false, scenarios: [] });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("scenario-bound ADS-B practice", () => {
  it("loads only the published membership and preserves native recording across renders and remounts", async () => {
    const published = row();
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json(published));
    const hydrate = vi.spyOn(useScenarioStore.getState(), "hydrate");
    const begin = vi.spyOn(useRecordingStore.getState(), "beginAttempt");
    const ui = render(<AdsbPracticeWorkspace scenarioId={canonicalId} />);
    await screen.findByTestId("practice-shell");
    expect(fetcher.mock.calls[0][0]).toBe(`/api/practice-scenarios?moduleId=ads-b&id=${canonicalId}`);
    expect(hydrate).not.toHaveBeenCalled();
    // The shell mounts before native initialization completes (scenario=null).
    // Wait for its actual ready payload, not merely the shell's DOM presence.
    await waitFor(() => expect(shell.scenario?.id).toBe(canonicalId));
    expect(shell.scenario).toMatchObject({ membershipId: published.membershipId });
    await waitFor(() => expect(useRecordingStore.getState().scenarioId).toBe(published.scenarioId));
    fireEvent.click(screen.getByRole("button", { name: "Terminal" }));
    act(() => { useTerminalStore.getState().processInput(published.definition.targetLoginUser); useTerminalStore.getState().processInput("training-only"); useTerminalStore.getState().processInput("1"); });
    expect(useRecordingStore.getState().authenticatedCorrectly).toBe(true);
    expect(useRecordingStore.getState().allActions.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Chọn tất cả thao tác" }));
    const actions = useRecordingStore.getState().allActions;
    ui.rerender(<AdsbPracticeWorkspace scenarioId={canonicalId} />);
    fireEvent.click(screen.getByRole("button", { name: "QCMS" }));
    fireEvent.click(screen.getByRole("button", { name: "Terminal" }));
    expect(useRecordingStore.getState().allActions).toEqual(actions);
    expect(begin).toHaveBeenCalledTimes(1);
    ui.unmount();
    render(<AdsbPracticeWorkspace scenarioId={canonicalId} />);
    await screen.findByTestId("practice-shell");
    expect(useRecordingStore.getState().allActions).toEqual(actions);
    expect(shell.getPayload()).toMatchObject({ allActions: actions, selectedActions: actions, authenticatedCorrectly: true });
    expect(fetcher.mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
  });
  it("preserves scoped native evidence when the browser reloads with empty memory stores", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => json(row()));
    const ui = render(<AdsbPracticeWorkspace scenarioId={canonicalId} />);
    await screen.findByTestId("practice-shell");
    fireEvent.click(screen.getByRole("button", { name: "Terminal" }));
    act(() => { useTerminalStore.getState().processInput(row().definition.targetLoginUser); useTerminalStore.getState().processInput("training-only"); useTerminalStore.getState().processInput("1"); });
    fireEvent.click(screen.getByRole("button", { name: "Chọn tất cả thao tác" }));
    const payload = shell.getPayload();
    ui.unmount();
    useRecordingStore.getState().resetAttempt();
    render(<AdsbPracticeWorkspace scenarioId={canonicalId} />);
    await screen.findByTestId("practice-shell");
    expect(shell.getPayload()).toMatchObject({ allActions: payload!.allActions, selectedActions: payload!.selectedActions, authenticatedCorrectly: true });
  });
  it("requires native terminal authentication and selected actions before saving hardware without submitting", async () => {
    const published = row(true);
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json(published));
    render(<AdsbPracticeWorkspace scenarioId={canonicalId} />);
    await screen.findByTestId("practice-shell");
    expect(screen.getByRole("button", { name: "Bước 2 · Xác định phần cứng" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /^Mở giám sát Sensor A/ }));
    expect(useRecordingStore.getState().qcmsMonitoringOpened).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Terminal" }));
    const complete = screen.getByRole("button", { name: "Hoàn tất Terminal và tiếp tục" });
    expect(complete).toBeDisabled();
    act(() => { useTerminalStore.getState().processInput("wrong-account"); useTerminalStore.getState().processInput("wrong-again"); });
    expect(useRecordingStore.getState().authenticatedCorrectly).toBe(false);
    act(() => { useTerminalStore.getState().processInput(published.definition.targetLoginUser); useTerminalStore.getState().processInput("training-only"); useTerminalStore.getState().processInput("1"); });
    fireEvent.click(screen.getByRole("button", { name: "Chọn tất cả thao tác" }));
    expect(complete).toBeEnabled();
    fireEvent.click(complete);
    expect(useRecordingStore.getState().phase).toBe("hardware");
    fireEvent.click(screen.getByRole("button", { name: "Bước 2 · Xác định phần cứng" }));
    const dialog = screen.getByRole("dialog", { name: "Chẩn đoán đường tín hiệu" });
    const component = within(dialog).getAllByRole("button").find((button) => button.hasAttribute("aria-pressed"))!;
    fireEvent.click(component);
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu lựa chọn phần cứng" }));
    expect(screen.queryByRole("dialog", { name: "Chẩn đoán đường tín hiệu" })).not.toBeInTheDocument();
    expect(shell.getPayload()).toMatchObject({ authenticatedCorrectly: true, qcmsMonitoringOpened: true, scenarioHardwareSelection: [CON_SON_HARDWARE[0].id], scenarioHardwareInspected: [CON_SON_HARDWARE[0].id] });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /NỘP BÀI/i })).not.toBeInTheDocument();
  });
  it("does not hydrate defaults for missing or malformed practice snapshots", async () => {
    const hydrate = vi.spyOn(useScenarioStore.getState(), "hydrate");
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({ error: "Not published" }, 404));
    const ui = render(<AdsbPracticeWorkspace scenarioId={canonicalId} />);
    await screen.findByRole("alert");
    expect(screen.queryByTestId("practice-shell")).not.toBeInTheDocument();
    expect(hydrate).not.toHaveBeenCalled();
    ui.rerender(<AdsbPracticeWorkspace scenarioId="legacy-not-a-uuid" />);
    expect(screen.getByRole("alert")).toHaveTextContent("không hợp lệ");
  });
  it("fences delayed membership fetches when identity changes and hides old native children on logout", async () => {
    let oldResponse!: (response: Response) => void;
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => new Promise((resolve) => { oldResponse = resolve; })).mockImplementation(async () => json({ ...row(), name: "Other owner" }));
    render(<AdsbPracticeWorkspace scenarioId={canonicalId} />);
    act(() => useScenarioStore.setState({ sessionIdentity: "owner-two" }));
    await screen.findByTestId("practice-shell");
    await act(async () => oldResponse(json(row())));
    expect(useRecordingStore.getState().sessionKey).toContain("owner-two");
    expect((fetcher.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(true);
    act(() => useScenarioStore.setState({ sessionIdentity: null }));
    expect(screen.queryByTestId("practice-shell")).not.toBeInTheDocument();
  });
});
