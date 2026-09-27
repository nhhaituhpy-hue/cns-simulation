import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScenarioParametersRouteLoader } from "@/components/scenario/scenario-parameters-route-loader";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("scenarioId=source-1&review=1"),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ScenarioParametersRouteLoader", () => {
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
