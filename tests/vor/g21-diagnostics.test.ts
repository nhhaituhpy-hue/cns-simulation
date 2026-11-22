import { describe, expect, it } from "vitest";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { createAudioGeneratorTx1FaultScenario } from "@/lib/dvor1150a/scenario";

const start = "2026-11-22T09:00:00.000Z";

function station() {
  const store = createVorPmdtStore({ now: () => new Date(start) });
  const s = () => store.getState();
  expect(s().startReviewScenario(createAudioGeneratorTx1FaultScenario())).toBe(true);
  expect(s().login("SEC3", "THREE")).toBe(true);
  return { store, s };
}

describe("G21 diagnostics lifecycle", () => {
  it("runs Full diagnostics on the simulated clock before publishing the scenario result", () => {
    const { s } = station();
    expect(s().runDiagnostics("full")).toBe(true);
    expect(s().actionHistory.some((event) => event.controlId === "diagnostics-run-full" && event.accepted)).toBe(true);
    const running = s().diagnosticState;
    expect(running.status).toBe("running");
    expect(running.completed).toBe(false);
    expect(running.result).toBeNull();
    s().advanceMonitorTime(59);
    expect(s().diagnosticState.status).toBe("running");
    s().advanceMonitorTime(1);
    const done = s().diagnosticState;
    expect(done.status).toBe("completed");
    expect(done.completed).toBe(true);
    expect(done.subsystem).toBe("Audio Generator");
    expect(done.result).toContain("1A3A2");
  });

  it("rejects a second run while diagnostics are in progress", () => {
    const { s } = station();
    expect(s().runDiagnostics("full")).toBe(true);
    expect(s().runDiagnostics("full")).toBe(false);
    expect(s().diagnosticState.status).toBe("running");
  });

  it("rejects a diagnostic mode outside the scenario contract", () => {
    const { s } = station();
    expect(s().runDiagnostics("on-air")).toBe(false);
    expect(s().diagnosticState.status).toBe("idle");
  });

  it("canceling mid-run keeps the run identity but publishes no result", () => {
    const { s } = station();
    expect(s().runDiagnostics("full")).toBe(true);
    s().advanceMonitorTime(10);
    s().cancelDiagnostics();
    const canceled = s().diagnosticState;
    expect(canceled.status).toBe("canceled");
    expect(canceled.run).toBe("full");
    expect(canceled.completed).toBe(false);
    expect(canceled.result).toBeNull();
    s().advanceMonitorTime(120);
    expect(s().diagnosticState.status).toBe("canceled");
  });

  it("canceling a completed run clears back to idle", () => {
    const { s } = station();
    expect(s().runDiagnostics("full")).toBe(true);
    s().advanceMonitorTime(60);
    expect(s().diagnosticState.status).toBe("completed");
    s().cancelDiagnostics();
    expect(s().diagnosticState.status).toBe("idle");
    expect(s().diagnosticState.run).toBeNull();
    expect(s().diagnosticState.result).toBeNull();
  });

  it("fails the run when Local mode is lost mid-run", () => {
    const { s } = station();
    expect(s().runDiagnostics("full")).toBe(true);
    s().advanceMonitorTime(5);
    s().setConfigValue("simulation.local", false);
    s().advanceMonitorTime(5);
    const failed = s().diagnosticState;
    expect(failed.status).toBe("failed");
    expect(failed.completed).toBe(false);
    expect(failed.result).toContain("aborted");
  });
});
