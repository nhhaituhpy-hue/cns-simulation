import { describe, expect, it } from "vitest";
import {
  applyDme1119aScenarioFaults,
  type Dme1119aScenarioFault,
} from "@/lib/dme1119a";
import { createDmePmdtStore } from "@/stores/dme-pmdt-store";

const powerLoss: Dme1119aScenarioFault = {
  id: "fault-power-loss",
  kind: "tx-power-loss",
  transmitter: "tx1",
  lossDb: 30,
};

function injectFault(store: ReturnType<typeof createDmePmdtStore>, faults: Dme1119aScenarioFault[]) {
  const state = store.getState();
  store.setState({ data: applyDme1119aScenarioFaults(state.data, faults) });
}

function clearFaults(store: ReturnType<typeof createDmePmdtStore>) {
  injectFault(store, []);
}

describe("DME 1119A runtime logs (Stage 1 G01/G02/G10)", () => {
  it("starts with empty alarm, maintenance and command logs", () => {
    const store = createDmePmdtStore();
    const state = store.getState();
    expect(state.data.alarmLogs).toEqual([]);
    expect(state.data.maintenanceLogs).toEqual([]);
    expect(state.commandActivityLogs).toEqual([]);
    expect(state.faultHistory).toEqual([]);
  });

  it("appends a real alarm entry and fault-history snapshot when a fault is injected", () => {
    const store = createDmePmdtStore();
    injectFault(store, [powerLoss]);
    const state = store.getState();

    const alarmEntries = state.data.alarmLogs.filter((entry) => entry.alarm.includes("Tx Power"));
    expect(alarmEntries.length).toBeGreaterThan(0);
    expect(alarmEntries[0].timeTag).toBe(state.data.timestamp);

    const snapshot = state.faultHistory.find((fault) => fault.parameters.some((name) => name.includes("Tx Power")));
    expect(snapshot).toBeDefined();
    const preRow = snapshot!.preAlarmRows.find((row) => row.label === "Tx Power");
    const alarmRow = snapshot!.alarmRows.find((row) => row.label === "Tx Power");
    expect(preRow).toBeDefined();
    expect(alarmRow).toBeDefined();
    expect(preRow!.mon1Value).not.toBe(alarmRow!.mon1Value);
    expect(snapshot!.lcu.antennaSelect).toBe(1);

    clearFaults(store);
    const cleared = store.getState();
    expect(cleared.data.alarmLogs.some((entry) => entry.alarm.includes("Tx Power") && entry.state === "Normal")).toBe(true);
  });

  it("caps the alarm log at the 100 most recent entries (FIFO)", () => {
    const store = createDmePmdtStore();
    for (let cycle = 0; cycle < 60; cycle += 1) {
      injectFault(store, [powerLoss]);
      clearFaults(store);
    }
    const logs = store.getState().data.alarmLogs;
    expect(logs.length).toBe(100);
  });

  it("accumulates operational summary durations on clock ticks and resets", () => {
    let current = new Date("2026-11-22T08:00:00Z");
    const store = createDmePmdtStore({ now: () => new Date(current) });
    store.getState().refreshClock();
    current = new Date(current.getTime() + 120_000);
    store.getState().refreshClock();

    const summary = store.getState().operationalSummary;
    expect(summary.elapsedSeconds).toBeCloseTo(120, 3);
    expect(summary.tx1.normalSeconds).toBeCloseTo(120, 3);
    expect(summary.tx2.standbySeconds).toBeCloseTo(120, 3);
    expect(summary.startedAt).not.toBeNull();

    store.getState().resetOperationalSummary();
    const reset = store.getState().operationalSummary;
    expect(reset.elapsedSeconds).toBe(0);
    expect(reset.tx1.normalSeconds).toBe(0);
    expect(reset.startedAt).toBeNull();
  });

  it("records command activity from real commands", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    store.getState().setLocalMode(true);
    const commands = store.getState().commandActivityLogs;
    expect(commands.length).toBeGreaterThan(0);
    expect(commands.some((entry) => entry.userName === "SEC3")).toBe(true);
    expect(commands[0].timeTag).toBe(store.getState().data.timestamp);
  });

  it("records a maintenance entry when AC power fails and restores", () => {
    const store = createDmePmdtStore();
    injectFault(store, [{ id: "fault-ac", kind: "ac-power", failed: true }]);
    expect(store.getState().data.maintenanceLogs.some((entry) => entry.alert === "AC Failure" && entry.state === "Alert")).toBe(true);
    clearFaults(store);
    expect(store.getState().data.maintenanceLogs.some((entry) => entry.alert === "AC Failure" && entry.state === "Normal")).toBe(true);
  });
});
