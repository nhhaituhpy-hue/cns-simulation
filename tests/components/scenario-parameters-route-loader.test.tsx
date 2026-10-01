import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScenarioParametersRouteLoader } from "@/components/scenario/scenario-parameters-route-loader";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { StrictMode } from "react";
import { ScenarioExamSnapshotProvider } from "@/components/scenario-exams/scenario-exam-snapshot-context";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("scenarioId=source-1&review=1"),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ScenarioParametersRouteLoader", () => {
  it("shows a visible error when the assigned runtime rejects initialization", () => {
    const definition = createDefaultDvor1150aScenarioDefinition();
    vi.stubGlobal("fetch", vi.fn());
    render(<ScenarioExamSnapshotProvider snapshot={{ moduleId: "dvor-1150a", definition, sessionKey: "scenario-exam:item-1", revisionKey: "exam:item-1:1" }}>
      <ScenarioParametersRouteLoader moduleId="dvor-1150a" enabled onLoaded={() => false} />
    </ScenarioExamSnapshotProvider>);
    expect(screen.getByRole("alert")).toHaveTextContent("Không thể khởi tạo Scenario đã cấp");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hydrates an assigned snapshot once even in Strict Mode, ignoring the source URL", async () => {
    const definition = createDefaultDvor1150aScenarioDefinition();
    const onLoaded = vi.fn();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<StrictMode><ScenarioExamSnapshotProvider snapshot={{ moduleId: "dvor-1150a", definition, sessionKey: "scenario-exam:item-1", revisionKey: "exam:item-1:7" }}>
      <ScenarioParametersRouteLoader moduleId="dvor-1150a" enabled onLoaded={onLoaded} />
    </ScenarioExamSnapshotProvider></StrictMode>);
    await waitFor(() => expect(onLoaded).toHaveBeenCalledExactlyOnceWith(definition, {
      review: true, sessionKey: "scenario-exam:item-1", revisionKey: "exam:item-1:7",
    }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not fall back to the source catalog when the assigned module differs", () => {
    const onLoaded = vi.fn();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<ScenarioExamSnapshotProvider snapshot={{ moduleId: "dvor-1150a", definition: createDefaultDvor1150aScenarioDefinition(), sessionKey: "scenario-exam:item-1", revisionKey: "exam:item-1:1" }}>
      <ScenarioParametersRouteLoader moduleId="dme-1119a" enabled onLoaded={onLoaded} />
    </ScenarioExamSnapshotProvider>);
    expect(onLoaded).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passes the immutable published revision to the review session", async () => {
    const definition = createDefaultDvor1150aScenarioDefinition();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: "source-1",
      moduleId: "dvor-1150a",
      revision: 7,
      definition,
    }]), { status: 200 })));
    const onLoaded = vi.fn();

    render(<ScenarioParametersRouteLoader moduleId="dvor-1150a" enabled onLoaded={onLoaded} />);

    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(definition, {
      review: true,
      revisionKey: "published:7",
    }));
  });
});
