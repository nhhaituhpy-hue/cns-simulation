// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { runAiWorkerCycle } from "@/lib/ai/scenario-authoring/worker-dispatch";

describe("durable feedback worker", () => {
  it("uses only frozen server input, heartbeats and fences completion", async () => {
    const { processNextFeedback } = await import("@/lib/ai/feedback/worker");
    const input = { id: "job", attemptToken: "lease", attempts: 1, moduleId: "dvor-1150a", definition: {}, rubric: null, payload: {}, practice: false };
    const output = { summary: "deterministic result" } as import("@/lib/ai/feedback/attempt-feedback").AttemptFeedbackReport;
    const deps = { claim: vi.fn(async () => input), heartbeat: vi.fn(async () => true), generate: vi.fn(async () => output), complete: vi.fn(async () => true), fail: vi.fn(async () => true) };
    expect(await processNextFeedback(deps)).toBe("completed");
    expect(deps.generate).toHaveBeenCalledWith(input, expect.any(AbortSignal));
    expect(deps.complete).toHaveBeenCalledWith(input, output);
    expect(deps.heartbeat).toHaveBeenCalled();
    deps.heartbeat.mockResolvedValue(false); deps.complete.mockClear();
    expect(await processNextFeedback(deps)).toBe("stale"); expect(deps.complete).not.toHaveBeenCalled();
  });
  it("visits feedback even when both authoring queues remain busy", async () => {
    const calls: string[] = [];
    const queue = (name: string) => async () => { calls.push(name); return "completed" as const; };
    await runAiWorkerCycle(queue("authoring"), queue("generation"), queue("feedback"));
    await runAiWorkerCycle(queue("authoring"), queue("generation"), queue("feedback"));
    expect(calls).toEqual(["authoring", "generation", "feedback", "authoring", "generation", "feedback"]);
  });
});
