import { describe, expect, it } from "vitest";
import { analyzeGroundCheck, limitRmsLogs } from "@/lib/dvor1150/maintenance";
import { createDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

function createStation() {
  let ms = 0;
  const store = createDvor1150PmdtStore({ now: () => new Date(ms) });
  return {
    get: store.getState,
    tick: (delta: number) => { ms += delta; store.getState().refreshClock(); },
  };
}

describe("DVOR 1150 PMDT maintenance", () => {
  it("holds per-monitor results until a test finishes and discards aborts", () => {
    const { get, tick } = createStation();
    expect(get().startMaintenance("monitor", "mon2")).toBe(false);
    expect(get().login("SEC3", "THREE")).toBe(true);
    expect(get().startMaintenance("monitor", "mon2")).toBe(false);
    expect(get().setLocalMode(true)).toBe(true);
    get().setConfigValue("monitor.testGenerator.hz30Modulation", 29);
    expect(get().applyConfigChanges()).toBe(true);
    expect(get().startMaintenance("monitor", "mon2")).toBe(true);
    expect(get().startMaintenance("certification", "mon1")).toBe(false);
    get().setConfigValue("monitor.testGenerator.hz30Modulation", 31);
    expect(get().applyConfigChanges()).toBe(true);
    tick(4999);
    expect(get().maintenance.monitor.mon2).toBeUndefined();
    tick(1);
    expect(get().maintenance.monitor.mon2?.values.hz30Modulation).toBe(29);
    expect(get().maintenance.monitor.mon1).toBeUndefined();
    expect(get().startMaintenance("monitor", "mon2")).toBe(true);
    expect(get().executeCommand("abort-tests")).toBe(true);
    tick(5000);
    expect(get().maintenance.monitor.mon2?.values.hz30Modulation).toBe(29);
  });

  it("uses applied limits for certification and distinguishes diagnostic cancellation from completion", () => {
    const { get, tick } = createStation();
    expect(get().login("SEC3", "THREE")).toBe(true);
    expect(get().runDiagnostics("full")).toBe(false);
    expect(get().runDiagnostics("on-air")).toBe(true);
    tick(2500);
    expect(get().diagnosticState.rows.find((row) => row.subsystem === "Monitor")?.progress).toBe(50);
    get().cancelDiagnostics();
    tick(5000);
    expect(get().diagnosticState).toMatchObject({ cancelled: true, completed: false });
    expect(get().runDiagnostics("on-air")).toBe(true);
    tick(5000);
    expect(get().diagnosticState).toMatchObject({ cancelled: false, completed: true, result: "NO FAULT FOUND" });
    expect(get().diagnosticState.rows.find((row) => row.subsystem === "Monitor")?.result).toBe("PASS");
    expect(get().diagnosticState.rows.find((row) => row.subsystem === "Power Amplifier")?.result).toBe("Not run");
    expect(get().setLocalMode(true)).toBe(true);
    get().setConfigValue("monitor.calibration.mon1.testGenerator.azimuthAngleOffset", 1);
    expect(get().applyConfigChanges()).toBe(true);
    expect(get().startMaintenance("certification", "mon1")).toBe(true);
    tick(8000);
    const row = get().maintenance.certification.mon1?.values.find((value) => value.parameter === "azimuth");
    expect(row).toMatchObject({ lowLimit: 358, lowData: 359, highLimit: 362, highData: 363, tolerance: 0.2 });
    expect(get().maintenance.certification.mon2).toBeUndefined();
  });

  it("captures a ground sweep and retains it when a later sweep loses its antenna route", () => {
    const { get, tick } = createStation();
    expect(get().login("SEC3", "THREE")).toBe(true);
    expect(get().setLocalMode(true)).toBe(true);
    expect(get().startMaintenance("ground")).toBe(true);
    tick(4000);
    const result = get().maintenance.ground;
    expect(result?.values.rows.map((row) => row.azimuth)).toEqual(Array.from({ length: 16 }, (_, i) => i * 22.5));
    expect(get().startMaintenance("ground")).toBe(true);
    expect(get().setTransmitterMode("tx2", "main")).toBe(true);
    tick(4000);
    expect(get().maintenance.job).toBeNull();
    expect(get().maintenance.ground).toEqual(result);
  });

  it("separates RMS conditions and commands, clears only the selected log, and resets route timers", () => {
    const { get, tick } = createStation();
    get().login("SEC3", "THREE");
    get().setLocalMode(true);
    get().setMonitorBypass("mon1", true);
    get().setConfigValue("monitor.monitorShutdownDelay", 4);
    get().setConfigValue("transmitters.tx1.nominal.outputPower", 60);
    expect(get().applyConfigChanges()).toBe(true);
    tick(1000);
    tick(1000);
    expect(get().derived.data.logs.some((row) => row.kind === "alarm")).toBe(false);
    tick(1000);
    expect(get().derived.data.logs.some((row) => row.kind === "alarm" && row.state === "Alarm")).toBe(true);
    expect(get().derived.data.logs.some((row) => row.kind === "command" && row.message === "Configuration applied")).toBe(true);
    expect(get().resetRmsLog("alarm")).toBe(true);
    expect(get().derived.data.logs.some((row) => row.kind === "alarm")).toBe(false);
    expect(get().derived.data.logs.some((row) => row.kind === "command")).toBe(true);
    expect(get().resetRmsLog("parameters")).toBe(true);
    expect(get().parameterChangeLogs.length).toBeGreaterThan(0);
    expect(get().hiddenParameterLogRows.size).toBe(get().parameterChangeLogs.length);
    expect(get().operationalSummary).toMatchObject({ tx1: { normal: 3000 }, tx2: { standby: 3000 } });
    expect(get().resetRmsLog("summary")).toBe(true);
    expect(get().operationalSummary.elapsed).toBe(0);
  });
});

it("computes independent Fourier orders and bias from sixteen measurements", () => {
  const rows = Array.from({ length: 16 }, (_, index) => {
    const azimuth = index * 22.5;
    const radians = azimuth * Math.PI / 180;
    return { azimuth, stationError: 0.2 + 0.7 * Math.cos(radians) + 0.4 * Math.cos(2 * radians) + 0.1 * Math.sin(4 * radians) };
  });
  const result = analyzeGroundCheck(rows);
  expect(result.bias).toBeCloseTo(0.2);
  expect(result.duantal.amplitude).toBeCloseTo(0.7);
  expect(result.quadrantal.amplitude).toBeCloseTo(0.4);
  expect(result.octantal.amplitude).toBeCloseTo(0.1);
  expect(result.octantal.phase).toBeCloseTo(270);
});

it("retains the latest 100 entries independently for each RMS log kind", () => {
  const first = { timeTag: "first", kind: "alarm", user: "Monitor 1", message: "Alarm", severity: "red" } as const;
  const entries = limitRmsLogs([first, ...Array.from({ length: 101 }, (_, i) => ({ ...first, timeTag: String(i) })),
    { ...first, kind: "command" }, { ...first, kind: "maintenance" }]);
  expect(entries).toHaveLength(102);
  expect(entries[0].timeTag).toBe("1");
});
