import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdsbPracticeWorkspace } from "@/components/scenario/adsb-practice-workspace";
import { DEFAULT_SCENARIOS, useScenarioStore } from "@/stores/scenario-store";
import { useRecordingStore } from "@/stores/recording-store";
import { useTerminalStore } from "@/stores/terminal-store";

const canonicalId = "b817bdb7-d9f2-4a1a-89d4-51059633f480";
const json = (value: unknown) => new Response(JSON.stringify(value));
function publishedRow() {
  const scenario = structuredClone(DEFAULT_SCENARIOS[0]);
  delete scenario.hardwareFault;
  const targetSite = scenario.sites.find((site) => site.sensorA?.id === scenario.targetSensorId)!;
  targetSite.sensorB = { ...structuredClone(targetSite.sensorA!), id: "practice-other-sensor", sensorLabel: "B" };
  return { id: canonicalId, moduleId: "ads-b", membershipId: "pinned-qcms-membership", revision: 7, name: scenario.title, description: scenario.description, difficulty: "basic", definition: { ...scenario, schemaVersion: 1, name: scenario.title, difficulty: "basic" } };
}
type Mode = "monitoring" | "configuration";
function openMaintenance(row: ReturnType<typeof publishedRow>, mode: Mode, target = true) {
  const site = row.definition.sites.find((entry) => entry.sensorA?.id === row.definition.targetSensorId || entry.sensorB?.id === row.definition.targetSensorId)!;
  const sensor = [site.sensorA, site.sensorB].find((entry) => entry && (entry.id === row.definition.targetSensorId) === target)!;
  const label = site.sensorA?.id === sensor.id ? "A" : "B";
  if (mode === "monitoring") {
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^Mở giám sát Sensor ${label} tại ${site.name},`) }));
  } else {
    const trigger = screen.getAllByRole("button").find((button) => button.getAttribute("aria-haspopup") === "menu" && button.textContent?.includes(site.name))!;
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: `Sensor ${label} Configuration` }));
  }
  return screen.getByRole("dialog");
}
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  useRecordingStore.getState().resetAttempt();
  useTerminalStore.getState().reset();
  useScenarioStore.setState({ sessionIdentity: "pinned-owner", sessionScope: "practice", isHydrated: false, scenarios: [] });
  Element.prototype.scrollIntoView = vi.fn();
  vi.clearAllMocks();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it.each<Mode>(["monitoring", "configuration"])("keeps %s maintenance in the native pinned run through submission", async (mode) => {
  const row = publishedRow();
  const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    if (String(url).includes("practice-scenarios")) return json(row);
    if (String(url).includes("practice-submissions")) return json({ submissionId: "qcms-submitted" });
    return json({ status: "completed", feedback: { moduleId: "ads-b", scenarioId: canonicalId, scenarioName: row.name, status: "UNVERIFIED", solved: false, sourceMode: "deterministic-only", summary: "Pinned QCMS submission", whatToAchieve: [], correctActions: [], redundantOrWrongAdjustments: [], nextSteps: [], suggestedExaminerComment: "", references: [], notice: "Tư vấn." } });
  });
  const hydrate = vi.spyOn(useScenarioStore.getState(), "hydrate");
  const begin = vi.spyOn(useRecordingStore.getState(), "beginAttempt");
  const initialize = vi.spyOn(useTerminalStore.getState(), "initialize");
  const start = vi.spyOn(useRecordingStore.getState(), "startTerminal");
  const navigation = vi.fn();
  const interceptLink = (event: MouseEvent) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (link) { navigation(link.getAttribute("href")); event.preventDefault(); }
  };
  document.addEventListener("click", interceptLink, true);
  try {
    render(<AdsbPracticeWorkspace scenarioId={canonicalId} />);
    await screen.findByRole("region", { name: "Simulator thao tác" });
    const sessionKey = useRecordingStore.getState().sessionKey;
    const baseline = useTerminalStore.getState().getPersistentState();
    const dialog = openMaintenance(row, mode);
    const maintenance = within(dialog).getByText(mode === "monitoring" ? "Mở ứng dụng bảo trì" : "OPEN MAINTENANCE APPLICATION");
    fireEvent.click(maintenance);
    expect(navigation).not.toHaveBeenCalled();
    expect(maintenance.closest("button")).not.toBeNull();
    expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terminal" })).toHaveAttribute("aria-pressed", "true");
    expect(start).toHaveBeenCalledTimes(1);
    expect(useRecordingStore.getState()).toMatchObject({ sessionKey, scenarioId: row.definition.id, phase: "terminal" });
    expect(useTerminalStore.getState().getPersistentState()).toEqual(baseline);
    act(() => {
      useTerminalStore.getState().processInput(row.definition.targetLoginUser);
      useTerminalStore.getState().processInput("training-only");
      useTerminalStore.getState().processInput("1");
      useRecordingStore.getState().selectAll();
    });
    const actions = useRecordingStore.getState().allActions;
    expect(actions.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "QCMS" }));
    const reopened = openMaintenance(row, mode);
    fireEvent.click(within(reopened).getByRole("button", { name: mode === "monitoring" ? "Mở ứng dụng bảo trì" : "OPEN MAINTENANCE APPLICATION" }));
    expect(useRecordingStore.getState().allActions).toEqual(actions);
    expect(useRecordingStore.getState().sessionKey).toBe(sessionKey);
    expect(start).toHaveBeenCalledTimes(1);
    expect(begin).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(hydrate).not.toHaveBeenCalled();
    expect(useScenarioStore.getState()).toMatchObject({ sessionIdentity: "pinned-owner", sessionScope: "practice", scenarios: [] });
    fireEvent.click(screen.getByRole("button", { name: /Nộp bài/ }));
    await screen.findByText("Pinned QCMS submission");
    const writes = fetcher.mock.calls.filter(([, options]) => options?.method === "POST");
    expect(writes).toHaveLength(1);
    expect(JSON.parse(String(writes[0][1]?.body))).toMatchObject({ moduleId: "ads-b", scenarioId: canonicalId, libraryMembershipId: row.membershipId, payload: { allActions: actions, selectedActions: actions, authenticatedCorrectly: true } });
    expect(screen.getByRole("region", { name: "Simulator thao tác" })).toHaveAttribute("inert");
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes("practice-scenarios"))).toHaveLength(1);
    expect(navigation).not.toHaveBeenCalled();
  } finally { document.removeEventListener("click", interceptLink, true); }
});

it.each<Mode>(["monitoring", "configuration"])("disables %s maintenance for a non-target sensor with an explicit reason", async (mode) => {
  const row = publishedRow();
  const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json(row));
  render(<AdsbPracticeWorkspace scenarioId={canonicalId} />);
  await screen.findByRole("region", { name: "Simulator thao tác" });
  const sessionKey = useRecordingStore.getState().sessionKey;
  const baseline = useTerminalStore.getState().getPersistentState();
  const dialog = openMaintenance(row, mode, false);
  const maintenance = within(dialog).getByRole("button", { name: mode === "monitoring" ? "Mở ứng dụng bảo trì" : "OPEN MAINTENANCE APPLICATION" });
  expect(maintenance).toBeDisabled();
  expect(maintenance).toHaveAccessibleDescription("Bài ôn tập chỉ cho phép bảo trì cảm biến mục tiêu.");
  expect(within(dialog).getByText("Bài ôn tập chỉ cho phép bảo trì cảm biến mục tiêu.")).toBeVisible();
  fireEvent.click(maintenance);
  expect(useRecordingStore.getState()).toMatchObject({ sessionKey, phase: "qcms" });
  expect(useTerminalStore.getState().getPersistentState()).toEqual(baseline);
  expect(screen.getByRole("button", { name: "Terminal" })).toHaveAttribute("aria-pressed", "false");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
