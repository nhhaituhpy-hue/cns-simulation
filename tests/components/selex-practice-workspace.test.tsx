import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PracticeWorkspaceProps } from "@/components/scenario/practice-workspace";
import { Dvor1150PmdtLayout } from "@/components/dvor1150/pmdt-layout";
import { PmdtLayout as VorLayout } from "@/components/vor/pmdt-layout";
import { PmdtLayout as DmeLayout } from "@/components/dme/pmdt-layout";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { createTemplateDefinition } from "@/lib/ai/scenario-generation/capabilities";

const harness = vi.hoisted(() => ({ query: "review=1&scenarioId=published-row", props: null as PracticeWorkspaceProps | null, snapshot: null as unknown }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(harness.query), usePathname: () => "/simulator/test", useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }) }));
vi.mock("@/components/scenario-exams/scenario-exam-snapshot-context", () => ({ useScenarioExamSnapshot: () => harness.snapshot, useScenarioExamAnswer: () => null, useScenarioExamResultReader: () => undefined }));
vi.mock("@/components/scenario/practice-workspace", () => ({ PracticeWorkspace: (props: PracticeWorkspaceProps) => { harness.props = props; return <div>{props.enabled && props.scenario ? <aside aria-label="Practice shell"><h1>{props.scenario.name}</h1><p>{props.scenario.description}</p><button disabled={!props.hardware?.available} onClick={props.hardware?.onOpen}>Bước 2 · Xác định phần cứng</button><button>Nộp bài và nhận đánh giá</button></aside> : null}{props.children}</div>; } }));
vi.mock("@/components/scenario/practice-ai-feedback-button", () => ({ PracticeAiFeedbackButton: () => <button>Legacy feedback</button> }));
vi.mock("@/components/simulator/simulator-config-persistence", () => ({ SimulatorConfigPersistence: () => <span>Free profile persistence</span>, Dvor1150ConfigPersistenceBoundary: () => <span>Free profile persistence</span> }));
vi.mock("@/components/scenario/scenario-session-persistence", () => ({ VorScenarioSessionPersistence: () => null, DmeScenarioSessionPersistence: () => null }));
const variants = [
  { id: "dvor-1150" as const, render: () => <Dvor1150PmdtLayout scenarioAuthoringEnabled />, store: useDvor1150PmdtStore },
  { id: "dvor-1150a" as const, render: () => <VorLayout simulatorId="dvor-1150a" scenarioAuthoringEnabled />, store: useVorPmdtStore },
  { id: "dme-1119a" as const, render: () => <DmeLayout simulatorId="dme-1119a" scenarioAuthoringEnabled />, store: useDmePmdtStore },
];
beforeEach(() => { harness.query = "review=1&scenarioId=published-row"; harness.props = null; harness.snapshot = null; useDvor1150PmdtStore.getState().reset(); useVorPmdtStore.getState().reset(); useDmePmdtStore.getState().reset(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("SELEX native practice registration", () => {
  it.each(variants)("registers $id metadata, native evidence and one shell submit only after published load", async variant => {
    const definition = createTemplateDefinition(variant.id, variant.id === "dme-1119a" ? "tx1-delay-drift" : "carrier-9960");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "published-row", moduleId: variant.id, revision: 2, definition })));
    const view = render(variant.render());
    const nativeWindow = view.container.querySelector(".pmdt-classic-window");
    expect(screen.queryByLabelText("Practice shell")).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Practice shell")).toHaveTextContent(definition.description);
    expect(harness.props?.scenario).toMatchObject({ id: definition.id, name: definition.name, description: definition.description });
    expect(harness.props?.attemptKey).toBe(variant.store.getState().scenario.startedAt);
    expect(view.container.querySelector(".pmdt-classic-window")).toBe(nativeWindow);
    expect(screen.getAllByRole("button", { name: /Nộp bài/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Legacy feedback" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Scenario Parameters" })).not.toBeInTheDocument();
    expect(screen.queryByText("Free profile persistence")).not.toBeInTheDocument();
    const state = variant.store.getState();
    expect(harness.props?.getPayload()).toMatchObject({ scenarioHardwareSelection: state.scenarioHardwareSelection, scenarioHardwareInspected: state.scenarioHardwareInspected, scenarioHardwareReasoning: state.scenarioHardwareReasoning, scenarioHardwareDispositionConfirmed: state.scenarioHardwareDispositionConfirmed, checkpoint: { scenarioStage: state.scenarioStage } });
    harness.query = "review=1&scenarioId=another-row";
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 404 }));
    view.rerender(variant.render());
    await act(async () => {});
    expect(screen.queryByLabelText("Practice shell")).not.toBeInTheDocument();
  });

  it.each(variants)("opens $id real native hardware only after native PMDT evidence and preserves the hardware payload", async variant => {
    const template = variant.id === "dme-1119a" ? "tx1-hpa-changeover" : variant.id === "dvor-1150a" ? "audio-generator-tx1" : "transmitter-1-fault";
    const definition = createTemplateDefinition(variant.id, template);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "published-row", membershipId: "published-membership", moduleId: variant.id, revision: 2, definition })));
    const view = render(variant.render());
    await screen.findByLabelText("Practice shell");
    expect(screen.getByRole("button", { name: /Bước 2/ })).toBeDisabled();
    act(() => {
      if (variant.id === "dvor-1150") {
        const state = useDvor1150PmdtStore.getState();
        expect(state.login("SEC3", "THREE")).toBe(true);
        state.openView("tx-data", "tx-data-tx1", ["Transmitters", "Data"]);
        state.openView("monitor-data", "monitor-integrity", ["Monitors", "Data"]);
        state.openView("diagnostics", "diagnostics-fault-isolation", ["Diagnostics"]);
        expect(state.runDiagnostics("full")).toBe(true);
        expect(state.setTransmitterMode("tx2", "main")).toBe(true);
      } else if (variant.id === "dvor-1150a") {
        const state = useVorPmdtStore.getState();
        expect(state.login("SEC3", "THREE")).toBe(true);
        state.openView("tx-data", "tx-status-1", ["Transmitters", "Status"], "Transmitter Status");
        state.openView("diagnostics", "diagnostics-power-up", ["Diagnostics"], "Power Up Results");
        state.openView("diagnostics", "diagnostics-fault-isolation", ["Diagnostics"], "Fault Isolation");
        expect(state.runDiagnostics("full")).toBe(true);
        expect(state.setTransmitterMode("tx2", "main")).toBe(true);
      } else {
        const state = useDmePmdtStore.getState();
        expect(state.login("SEC3", "THREE")).toBe(true);
        state.openView("tx-data", "tx-data-main", ["Transmitters", "Data"], "Transmitter Data");
        state.openView("diagnostics", "diagnostics-fault-isolation", ["Diagnostics"], "Fault Isolation");
        expect(state.runDiagnostics("full")).toBe(true);
        expect(state.executeRmsCommand("tx-command-transfer")).toBe(true);
      }
    });
    expect(screen.getByRole("button", { name: /Bước 2/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Bước 2/ }));
    expect(await screen.findByRole("heading", { name: `Sơ đồ khối ${variant.id === "dvor-1150" ? "DVOR 1150" : variant.id === "dvor-1150a" ? "DVOR 1150A" : "DME 1119A"}` })).toBeInTheDocument();
    expect(variant.store.getState().scenarioStage).toBe("hardware");
    act(() => { variant.store.getState().setScenarioHardwareReasoning("Native hardware reasoning"); });
    expect(harness.props?.getPayload()).toMatchObject({ scenarioHardwareReasoning: "Native hardware reasoning", checkpoint: { scenarioStage: "hardware" } });
    expect(harness.props?.scenario).toMatchObject({ membershipId: "published-membership" });
    harness.query = "review=1&scenarioId=failed-next-row";
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 404 }));
    view.rerender(variant.render());
    await act(async () => {});
    expect(screen.queryAllByRole("heading", { name: /Sơ đồ khối/ })).toHaveLength(0);
    expect(harness.props?.enabled).toBe(true);
    expect(harness.props?.scenario).toBeNull();
  });

  it.each(variants)("does not expose $id practice tutoring or submit inside the official snapshot path", async variant => {
    const definition = createTemplateDefinition(variant.id, variant.id === "dme-1119a" ? "tx1-delay-drift" : "carrier-9960");
    harness.snapshot = { moduleId: variant.id, definition, sessionKey: "official-session", revisionKey: "official-revision" };
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await act(async () => { render(variant.render()); });
    expect(screen.queryByLabelText("Practice shell")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nộp bài|Legacy feedback/ })).not.toBeInTheDocument();
    expect(harness.props?.enabled).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
