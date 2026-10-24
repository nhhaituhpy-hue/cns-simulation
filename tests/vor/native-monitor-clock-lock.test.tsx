import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PmdtLayout } from "@/components/vor/pmdt-layout";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a";

const fixture = vi.hoisted(() => ({ pending: false, submitted: false, load: true }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("review=1&scenarioId=clock-fixture"), useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }) }));
vi.mock("@/components/scenario/attempt-feedback-client", () => ({ usePracticeSubmission: () => ({ pending: fixture.pending, submissionId: fixture.submitted ? "submitted-clock-fixture" : null, error: null, submit: vi.fn(), reset: vi.fn() }) }));
vi.mock("@/components/scenario/practice-ai-hints", () => ({ PracticeAiHints: () => null }));
vi.mock("@/components/scenario/practice-ai-feedback-button", () => ({ PracticeAiFeedbackButton: () => null }));
vi.mock("@/components/scenario/scenario-parameters-route-loader", async () => {
  const { useEffect, useRef } = await import("react");
  return { ScenarioParametersRouteLoader: ({ onLoaded }: { onLoaded: (definition: ReturnType<typeof createDefaultDvor1150aScenarioDefinition>, context: { review: boolean; revisionKey: string }) => unknown }) => {
    const loaded = useRef(false);
    useEffect(() => {
      if (!fixture.load || loaded.current) return;
      loaded.current = true;
      const definition = createDefaultDvor1150aScenarioDefinition();
      definition.startPolicy.startLocal = true;
      definition.startPolicy.startMonitorBypassed = false;
      definition.configuration.monitor.votingLogic = "OR";
      definition.configuration.monitor.calibration.mon1.hz30ModulationScale = 70;
      onLoaded(definition, { review: true, revisionKey: "clock-fixture-v1" });
    }, [onLoaded]);
    return null;
  } };
});

beforeEach(() => {
  vi.useFakeTimers();
  fixture.pending = false; fixture.submitted = false; fixture.load = true;
  useVorPmdtStore.getState().reset();
  expect(useVorPmdtStore.getState().login("SEC3", "THREE")).toBe(true);
});
afterEach(() => { cleanup(); vi.useRealTimers(); useVorPmdtStore.getState().reset(); });

it("still advances the clock in a ready unlocked practice and pauses/resumes across submission", () => {
  const view = render(<PmdtLayout />);
  expect(view.container.querySelector('[data-practice-center="true"]')).not.toHaveAttribute("inert");
  act(() => vi.advanceTimersByTime(1000));
  expect(useVorPmdtStore.getState().monitorElapsed).toBeCloseTo(1);
  fixture.pending = true;
  view.rerender(<PmdtLayout />);
  const elapsed = useVorPmdtStore.getState().monitorElapsed;
  act(() => vi.advanceTimersByTime(10_000));
  expect(useVorPmdtStore.getState().monitorElapsed).toBe(elapsed);
  fixture.pending = false;
  view.rerender(<PmdtLayout />);
  act(() => vi.advanceTimersByTime(4000));
  expect(useVorPmdtStore.getState().derived.voting.activeTransmitter).toBe("tx2");
});

it.each(["loading", "submitting", "submitted"] as const)("does not advance the native clock or evidence in a %s practice workspace", stage => {
  if (stage === "loading") fixture.load = false;
  if (stage === "submitting") fixture.pending = true;
  if (stage === "submitted") fixture.submitted = true;
  const view = render(<PmdtLayout />);
  const center = view.container.querySelector('[data-practice-center="true"]');
  expect(center).toHaveAttribute("inert");
  if (stage !== "loading") expect(view.container.querySelector('[data-practice-workspace="dvor-1150a"]')).not.toBeNull();
  const before = useVorPmdtStore.getState();
  const config = structuredClone(before.config), evidence = structuredClone(before.actionHistory);
  act(() => vi.advanceTimersByTime(10_000));
  expect(useVorPmdtStore.getState().config).toEqual(config);
  expect(useVorPmdtStore.getState().actionHistory).toEqual(evidence);
  expect(useVorPmdtStore.getState().monitorElapsed).toBe(before.monitorElapsed);
});
