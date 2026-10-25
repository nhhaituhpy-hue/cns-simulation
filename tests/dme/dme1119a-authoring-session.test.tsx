import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScenarioExamSnapshotProvider } from "@/components/scenario-exams/scenario-exam-snapshot-context";
import { PmdtLayout } from "@/components/dme/pmdt-layout";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

const route = vi.hoisted(() => ({ query: "" }));
// App Router boundary belongs to this suite, not the shared test setup.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(route.query),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

function nativeLogin(level = 3) {
  const account = useDmePmdtStore.getState().data.securityAccounts.find((item) => item.securityLevel === level);
  if (!account) throw new Error("Missing native training fixture account");
  fireEvent.change(screen.getByLabelText("User ID"), { target: { value: account.userId } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: account.password } });
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  expect(screen.queryByRole("form", { name: "Login" })).not.toBeInTheDocument();
}

function logoff() {
  fireEvent.click(screen.getByRole("button", { name: "System" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Logoff/Disconnect" }));
  expect(screen.getByRole("form", { name: "Login" })).toBeInTheDocument();
}

const panel = () => screen.getByRole("complementary", { name: "DME 1119A scenario parameters" });

describe("DME 1119A authoring across native sessions", () => {
  beforeEach(() => {
    route.query = "";
    useDmePmdtStore.getState().reset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reopens Scenario Parameters after real native Login, Local, close and Logoff without remounting", () => {
    render(<PmdtLayout mode="preview" scenarioAuthoringEnabled />);
    nativeLogin();
    fireEvent.click(screen.getByRole("button", { name: "Local" }));
    expect(useDmePmdtStore.getState().data.local).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Scenario Parameters" }));
    fireEvent.click(within(panel()).getByRole("button", { name: "Close scenario parameters" }));
    expect(screen.queryByRole("complementary", { name: "DME 1119A scenario parameters" })).not.toBeInTheDocument();
    logoff();
    expect(useDmePmdtStore.getState().scenarioAuthoringEnabled).toBe(false);
    nativeLogin();
    fireEvent.click(screen.getByRole("button", { name: "Scenario Parameters" }));
    expect(panel()).toBeInTheDocument();
    expect(useDmePmdtStore.getState().scenarioAuthoringEnabled).toBe(true);
  });

  it("never enables authoring for a website user without permission, including relogin", () => {
    render(<PmdtLayout mode="preview" scenarioAuthoringEnabled={false} />);
    nativeLogin();
    logoff();
    nativeLogin();
    act(() => useDmePmdtStore.getState().setScenarioParametersOpen(true));
    expect(useDmePmdtStore.getState().scenarioAuthoringEnabled).toBe(false);
    expect(useDmePmdtStore.getState().scenarioParametersOpen).toBe(false);
    expect(screen.queryByRole("button", { name: "Scenario Parameters" })).not.toBeInTheDocument();
  });

  it("never enables authoring in a requested practice session", async () => {
    route.query = "review=1&scenarioId=practice-fixture";
    // Exercise the actual review-query gate without a network service.
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false })));
    await act(async () => { render(<PmdtLayout mode="preview" scenarioAuthoringEnabled />); });
    nativeLogin();
    logoff();
    nativeLogin();
    act(() => useDmePmdtStore.getState().setScenarioParametersOpen(true));
    expect(useDmePmdtStore.getState().scenarioAuthoringEnabled).toBe(false);
    expect(useDmePmdtStore.getState().scenarioParametersOpen).toBe(false);
    expect(screen.queryByRole("button", { name: "Scenario Parameters" })).not.toBeInTheDocument();
  });

  it("does not restore authoring in an assigned exam after native relogin", () => {
    const definition = useDmePmdtStore.getState().scenarioDraft;
    render(<ScenarioExamSnapshotProvider snapshot={{ moduleId: "dme-1119a", definition, sessionKey: "exam-fixture", revisionKey: "1" }}>
      <PmdtLayout mode="student" scenarioAuthoringEnabled={false} />
    </ScenarioExamSnapshotProvider>);
    nativeLogin();
    logoff();
    nativeLogin();
    act(() => useDmePmdtStore.getState().setScenarioParametersOpen(true));
    expect(useDmePmdtStore.getState().scenarioAuthoringEnabled).toBe(false);
    expect(useDmePmdtStore.getState().scenarioParametersOpen).toBe(false);
    expect(screen.queryByRole("button", { name: "Scenario Parameters" })).not.toBeInTheDocument();
  });

  it("preserves native login, security level and Local guards on Apply", () => {
    render(<PmdtLayout mode="preview" scenarioAuthoringEnabled />);
    expect(useDmePmdtStore.getState().applyScenario()).toBe(false);
    nativeLogin(1);
    expect(useDmePmdtStore.getState().applyScenario()).toBe(false);
    expect(screen.getByRole("button", { name: "Local" })).toBeDisabled();
    logoff();
    nativeLogin();
    expect(useDmePmdtStore.getState().data.local).toBe(false);
    expect(useDmePmdtStore.getState().applyScenario()).toBe(false);
  });
});
