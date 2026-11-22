import { describe, expect, it } from "vitest";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import {
  groundCheckGraphSeries,
  groundCheckResultCsv,
  groundCheckResultText,
} from "@/lib/dvor1150a/ground-check";

const start = "2026-11-22T09:00:00.000Z";

function station() {
  const store = createVorPmdtStore({ now: () => new Date(start) });
  const s = () => store.getState();
  s().login("SEC3", "THREE");
  s().setConfigValue("simulation.local", true);
  return { store, s };
}

describe("G21 ground check lifecycle", () => {
  it("runs on the simulated clock and only snapshots a result at completion", () => {
    const { s } = station();
    expect(s().groundChecks.tx1.status).toBe("idle");
    expect(s().runGroundCheck("tx1", "mon2")).toBe(true);
    expect(s().groundChecks.tx1.status).toBe("running");
    expect(s().groundChecks.tx1.result).toBeNull();
    s().advanceMonitorTime(59);
    expect(s().groundChecks.tx1.status).toBe("running");
    expect(s().groundChecks.tx1.result).toBeNull();
    s().advanceMonitorTime(1);
    const run = s().groundChecks.tx1;
    expect(run.status).toBe("completed");
    expect(run.result?.stationErrors).toHaveLength(16);
    expect(run.completedAt).toBe("2026-11-22T09:01:00.000Z");
  });

  it("rejects a second run while one is in progress and rejects a silent monitor source", () => {
    const { s } = station();
    expect(s().runGroundCheck("tx1", "mon2")).toBe(true);
    expect(s().runGroundCheck("tx1", "mon2")).toBe(false);
    s().cancelGroundCheck("tx1");
    expect(s().setMonitorTestResponse("mon1", false)).toBe(true);
    expect(s().runGroundCheck("tx2", "mon1")).toBe(false);
    expect(s().groundChecks.tx2.status).toBe("idle");
  });

  it("keeps the completed snapshot stable across later config changes and time", () => {
    const { s } = station();
    expect(s().runGroundCheck("tx1", "mon2")).toBe(true);
    s().advanceMonitorTime(60);
    const snapshot = s().groundChecks.tx1.result;
    expect(snapshot).not.toBeNull();
    s().setConfigValue("transmitters.tx1.nominal.outputPower", 25);
    s().applyConfigChanges();
    s().advanceMonitorTime(600);
    expect(s().groundChecks.tx1.result).toEqual(snapshot);
    expect(s().groundChecks.tx1.status).toBe("completed");
  });

  it("canceling a re-run keeps the previous completed snapshot", () => {
    const { s } = station();
    expect(s().runGroundCheck("tx1", "mon2")).toBe(true);
    s().advanceMonitorTime(60);
    const snapshot = s().groundChecks.tx1.result;
    expect(s().runGroundCheck("tx1", "mon1")).toBe(true);
    s().advanceMonitorTime(10);
    s().cancelGroundCheck("tx1");
    expect(s().groundChecks.tx1.status).toBe("canceled");
    expect(s().groundChecks.tx1.result).toEqual(snapshot);
    s().advanceMonitorTime(120);
    expect(s().groundChecks.tx1.status).toBe("canceled");
  });

  it("fails the run when the transmitter is disabled before completion", () => {
    const { s } = station();
    expect(s().runGroundCheck("tx2", "mon2")).toBe(true);
    s().advanceMonitorTime(30);
    s().setConfigValue("transmitters.tx2.faults.disabled", true);
    s().applyConfigChanges();
    s().advanceMonitorTime(30);
    const run = s().groundChecks.tx2;
    expect(run.status).toBe("failed");
    expect(run.failureReason).toContain("disabled");
    expect(run.result).toBeNull();
  });

  it("fails the run when the source monitor stops responding", () => {
    const { s } = station();
    expect(s().runGroundCheck("tx1", "mon1")).toBe(true);
    expect(s().setMonitorTestResponse("mon1", false)).toBe(true);
    s().advanceMonitorTime(60);
    const run = s().groundChecks.tx1;
    expect(run.status).toBe("failed");
    expect(run.failureReason).toContain("Monitor 1");
  });

  it("decomposes FFT error series that sum back to the station error snapshot", () => {
    const { s } = station();
    expect(s().runGroundCheck("tx1", "mon2")).toBe(true);
    s().advanceMonitorTime(60);
    const result = s().groundChecks.tx1.result;
    if (!result) throw new Error("Expected a completed ground check result.");
    const series = groundCheckGraphSeries(result, "fft-errors");
    expect(series.map((entry) => entry.label)).toEqual(["Quadrantal", "Octantal", "Bias"]);
    result.stationErrors.forEach((stationError, index) => {
      const total = series.reduce((sum, entry) => sum + (entry.values[index] ?? 0), 0);
      expect(total).toBeCloseTo(stationError, 6);
    });
    expect(groundCheckGraphSeries(result, "fft-sum")).toEqual([
      { label: "Station Error", values: result.stationErrors },
    ]);
    expect(groundCheckGraphSeries(result, "station-error")).toEqual([
      { label: "Station Error", values: result.stationErrors },
    ]);
  });

  it("exports text and CSV that mirror the on-screen table, including the Duantal row", () => {
    const { s } = station();
    expect(s().runGroundCheck("tx2", "mon1")).toBe(true);
    s().advanceMonitorTime(60);
    const run = s().groundChecks.tx2;
    const text = groundCheckResultText("tx2", run);
    expect(text).toContain("DVOR 1150A Ground Check — Tx 2 (simulator model)");
    expect(text).toContain("Source: Monitor 1");
    expect(text).toContain("Duantal Error");
    expect(text).toContain("Quadrantal Error");
    expect(text).toContain("Error Spread");
    expect(text).toContain("Simulated result from the training model. No signal was measured and no NOTAM was issued.");
    const csv = groundCheckResultCsv("tx2", run);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("azimuth_deg,station_error_deg");
    expect(lines).toHaveLength(26);
    expect(csv).toContain("error_spread_deg");
    expect(csv).toContain("source,Monitor 1");
  });
});
