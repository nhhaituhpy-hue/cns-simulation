import { describe, expect, it } from "vitest";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";

const start = "2026-11-22T09:00:00.000Z";

function freeStation() {
  const store = createVorPmdtStore({ now: () => new Date(start) });
  const s = () => store.getState();
  s().setMode("student");
  expect(s().login("SEC3", "THREE")).toBe(true);
  s().setConfigValue("simulation.local", true);
  expect(s().config.simulation.local).toBe(true);
  return { store, s };
}

describe("G21 diagnostics in free mode (no practice scenario)", () => {
  it("runs Full diagnostics on the simulated clock and completes NO FAULT FOUND", () => {
    const { s } = freeStation();
    expect(s().scenario.active).toBe(false);
    expect(s().runDiagnostics("full")).toBe(true);
    const running = s().diagnosticState;
    expect(running.status).toBe("running");
    expect(running.run).toBe("full");
    expect(running.completed).toBe(false);
    expect(running.result).toBeNull();
    s().advanceMonitorTime(59);
    expect(s().diagnosticState.status).toBe("running");
    s().advanceMonitorTime(1);
    const done = s().diagnosticState;
    expect(done.status).toBe("completed");
    expect(done.completed).toBe(true);
    expect(done.result).toBe("NO FAULT FOUND");
    expect(done.subsystem).toBeNull();
  });

  it("runs On-Air diagnostics on its shorter clock", () => {
    const { s } = freeStation();
    expect(s().runDiagnostics("on-air")).toBe(true);
    s().advanceMonitorTime(30);
    expect(s().diagnosticState.status).toBe("completed");
    expect(s().diagnosticState.result).toBe("NO FAULT FOUND");
  });

  it("refuses with a visible reason when Local mode is off", () => {
    const store = createVorPmdtStore({ now: () => new Date(start) });
    const s = () => store.getState();
    s().setMode("student");
    expect(s().login("SEC3", "THREE")).toBe(true);
    expect(s().runDiagnostics("full")).toBe(false);
    expect(s().diagnosticState.status).toBe("failed");
    expect(s().diagnosticState.result).toContain("Local mode");
    expect(s().lastCommand).toContain("Local mode");
  });

  it("refuses with a visible reason when logged out", () => {
    const store = createVorPmdtStore({ now: () => new Date(start) });
    const s = () => store.getState();
    expect(s().runDiagnostics("on-air")).toBe(false);
    expect(s().diagnosticState.status).toBe("failed");
    expect(s().diagnosticState.result).toContain("authenticated maintenance account");
  });

  it("can be canceled mid-run in free mode", () => {
    const { s } = freeStation();
    expect(s().runDiagnostics("full")).toBe(true);
    s().advanceMonitorTime(10);
    s().cancelDiagnostics();
    expect(s().diagnosticState.status).toBe("canceled");
    expect(s().diagnosticState.completed).toBe(false);
  });

  it("fails a free-mode run that loses Local mode mid-run", () => {
    const { s } = freeStation();
    expect(s().runDiagnostics("full")).toBe(true);
    s().advanceMonitorTime(5);
    s().setConfigValue("simulation.local", false);
    expect(s().config.simulation.local).toBe(false);
    s().advanceMonitorTime(1);
    expect(s().diagnosticState.status).toBe("failed");
    expect(s().diagnosticState.result).toContain("was lost during the run");
  });
});
