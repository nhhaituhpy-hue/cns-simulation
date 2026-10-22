// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ feedback: vi.fn(async () => "completed"), hint: vi.fn(async () => "completed"), authoring: vi.fn(async () => "completed"), generation: vi.fn(async () => "completed"), end: vi.fn() }));
vi.mock("pg", () => ({ default: { types: { setTypeParser: vi.fn() }, Pool: class { query = vi.fn(); on = vi.fn(); end = mocks.end; } } }));
vi.mock("node:fs/promises", () => ({ mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn() }));
vi.mock("@/lib/ai/feedback/worker", () => ({ runNextFeedback: mocks.feedback }));
vi.mock("@/lib/ai/feedback/practice-hints-worker", () => ({ runNextPracticeHint: mocks.hint }));
vi.mock("@/lib/ai/scenario-authoring/worker", () => ({ processNextAuthoring: mocks.authoring }));
vi.mock("@/lib/ai/scenario-generation/worker", () => ({ processNextGeneration: mocks.generation }));
vi.mock("@/lib/ai/scenario-generation/generator", () => ({ generateScenario: vi.fn() }));
vi.mock("@/lib/ai/documents/isolated", () => ({ extractIsolatedDocuments: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it("the executable worker visits feedback while authoring and generation are busy", async () => {
  vi.stubEnv("CNS_AI_WORKER_ENABLED", "true"); vi.stubEnv("DATABASE_URL", "postgresql://fixture.invalid/unused"); vi.stubEnv("CNS_AI_API_KEY", "test-only");
  const argv = process.argv; process.argv = [...argv, "--once"];
  const signals = { SIGINT: process.listeners("SIGINT"), SIGTERM: process.listeners("SIGTERM") };
  try {
    await import("@/ai-worker/entry");
    await vi.waitFor(() => expect(mocks.end).toHaveBeenCalled());
    expect(mocks.authoring).toHaveBeenCalledOnce(); expect(mocks.generation).toHaveBeenCalledOnce();
    expect(mocks.feedback).toHaveBeenCalledWith(expect.any(Object), expect.stringMatching(/^cns-ai-/), expect.any(AbortSignal));
    expect(mocks.hint).toHaveBeenCalledOnce();
  } finally {
    process.argv = argv;
    for (const signal of ["SIGINT", "SIGTERM"] as const) for (const listener of process.listeners(signal)) if (!signals[signal].includes(listener)) process.removeListener(signal, listener);
  }
});
it("the worker still dispatches deterministic feedback when provider credentials are absent", async () => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv("CNS_AI_WORKER_ENABLED", "true"); vi.stubEnv("DATABASE_URL", "postgresql://fixture.invalid/unused"); vi.stubEnv("CNS_AI_API_KEY", "");
  const argv = process.argv, exitCode = process.exitCode; process.argv = [...argv, "--once"];
  const signals = { SIGINT: process.listeners("SIGINT"), SIGTERM: process.listeners("SIGTERM") };
  try {
    await import("@/ai-worker/entry");
    await vi.waitFor(() => expect(mocks.feedback).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(mocks.end).toHaveBeenCalled());
    expect(process.exitCode).toBe(exitCode);
  } finally {
    process.argv = argv; process.exitCode = exitCode;
    for (const signal of ["SIGINT", "SIGTERM"] as const) for (const listener of process.listeners(signal)) if (!signals[signal].includes(listener)) process.removeListener(signal, listener);
  }
});
