import { describe, expect, it, vi } from "vitest";
import { processNextGeneration } from "@/lib/ai/scenario-generation/worker";

function dependencies() {
  const job = { id: "job-one", attemptToken: "attempt-one", input: { moduleId: "dvor-1150a", name: "Test", description: "Test description", difficulty: "intermediate" }, documents: [] };
  return {
    claim: vi.fn().mockResolvedValue(job), heartbeat: vi.fn().mockResolvedValue(true),
    loadDocuments: vi.fn().mockResolvedValue([]), generate: vi.fn().mockResolvedValue({ definition: { id: "generated" }, provenance: { templateId: "approved" } }),
    complete: vi.fn().mockResolvedValue(true), fail: vi.fn().mockResolvedValue(true), heartbeatMs: 5,
  };
}
describe("durable generation worker", () => {
  it("persists completion only after generation and validation through the core service", async () => {
    const deps = dependencies();
    expect(await processNextGeneration(deps)).toBe("completed");
    expect(deps.heartbeat.mock.calls.map((args) => args[1])).toEqual(expect.arrayContaining(["extracting", "generating", "validating"]));
    expect(deps.complete).toHaveBeenCalledOnce(); expect(deps.fail).not.toHaveBeenCalled();
  });
  it("does not claim more work after shutdown", async () => {
    const deps = dependencies(); const controller = new AbortController(); controller.abort();
    expect(await processNextGeneration({ ...deps, signal: controller.signal })).toBe("stopped");
    expect(deps.claim).not.toHaveBeenCalled();
  });
  it("does not process a claim that resolves after shutdown", async () => {
    const deps=dependencies(); const controller=new AbortController();
    const claimed=await deps.claim();
    let release: (job: typeof claimed) => void = () => undefined;
    deps.claim.mockImplementation(() => new Promise(resolve => { release=resolve; }));
    const running=processNextGeneration({...deps,signal:controller.signal});
    controller.abort(); release(claimed);
    expect(await running).toBe("stopped");
    expect(deps.loadDocuments).not.toHaveBeenCalled();expect(deps.generate).not.toHaveBeenCalled();
    expect(deps.complete).not.toHaveBeenCalled();expect(deps.fail).not.toHaveBeenCalled();
  });
  it("shares one in-flight heartbeat across multiple interval ticks", async () => {
    vi.useFakeTimers();
    try {
      const deps=dependencies();let active=0;let maximum=0;
      deps.heartbeat.mockImplementation(async () => {
        active++;maximum=Math.max(maximum,active);
        await new Promise(resolve=>setTimeout(resolve,27));
        active--;return true;
      });
      const running=processNextGeneration(deps);
      await vi.advanceTimersByTimeAsync(200);
      expect(await running).toBe("completed");
      expect(maximum).toBe(1);expect(active).toBe(0);
    } finally {vi.useRealTimers();}
  });
  it("does not call AI or persist completion after loss of its lease", async () => {
    const deps = dependencies(); deps.heartbeat.mockResolvedValue(false);
    expect(await processNextGeneration(deps)).toBe("stale");
    expect(deps.generate).not.toHaveBeenCalled(); expect(deps.complete).not.toHaveBeenCalled();
  });
  it("records a bounded failure without writing an invented scenario", async () => {
    const deps = dependencies(); deps.generate.mockRejectedValue(new Error("provider raw secret must not leak"));
    expect(await processNextGeneration(deps)).toBe("failed");
    expect(deps.complete).not.toHaveBeenCalled();
    expect(JSON.stringify(deps.fail.mock.calls)).not.toContain("provider raw secret");
  });
  it("does not permit persistence after a delayed heartbeat loses ownership", async () => {
    const deps = dependencies(); let call = 0; let release: (value: boolean) => void = () => undefined;
    deps.heartbeat.mockImplementation(async () => {
      call += 1;
      if (call === 3) return new Promise<boolean>((resolve) => { release = resolve; });
      return true;
    });
    deps.generate.mockImplementation(async () => { await new Promise((resolve) => setTimeout(resolve, 12)); return { definition: { id: "generated" }, provenance: {} }; });
    const running = processNextGeneration(deps);
    await new Promise((resolve) => setTimeout(resolve, 20)); release(false);
    expect(await running).toBe("stale"); expect(deps.complete).not.toHaveBeenCalled();
  });
  it("preserves a known safe extraction failure code for actionable UI feedback", async () => {
    const deps=dependencies();deps.loadDocuments.mockRejectedValue(Object.assign(new Error("raw /secret/path"),{code:"INVALID_DOCUMENT"}));
    expect(await processNextGeneration(deps)).toBe("failed");
    expect(deps.fail.mock.calls[0][1].code).toBe("INVALID_DOCUMENT");
    expect(JSON.stringify(deps.fail.mock.calls)).not.toContain("/secret/path");
  });
  it("returns idle without invoking side effects when the queue is empty", async () => {
    const deps = dependencies(); deps.claim.mockResolvedValue(null);
    expect(await processNextGeneration(deps)).toBe("idle");expect(deps.generate).not.toHaveBeenCalled();
  });
  it("does not send document text to AI when shutdown happens during extraction", async () => {
    const deps = dependencies(); const controller = new AbortController();
    deps.loadDocuments.mockImplementation(async () => { controller.abort(); return []; });
    expect(await processNextGeneration({ ...deps, signal: controller.signal })).toBe("stopped");
    expect(deps.generate).not.toHaveBeenCalled(); expect(deps.complete).not.toHaveBeenCalled();
  });
  it("aborts an AI request if a heartbeat loses its lease", async () => {
    const deps = dependencies(); let beats = 0;
    deps.heartbeat.mockImplementation(async () => ++beats < 3);
    deps.generate.mockImplementation((_input, _documents, signal: AbortSignal) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    expect(await processNextGeneration(deps)).toBe("stale");
    expect(deps.complete).not.toHaveBeenCalled();
  });
});
