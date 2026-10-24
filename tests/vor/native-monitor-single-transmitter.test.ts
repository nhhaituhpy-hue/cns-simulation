// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";

function alarmStore() {
  const store = createVorPmdtStore();
  expect(store.getState().login("SEC3", "THREE")).toBe(true);
  store.getState().setConfigValue("simulation.local", true);
  store.getState().setConfigValue("monitor.votingLogic", "OR");
  store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 70);
  return store;
}

describe("monitor protection without a usable standby", () => {
  it.each(["single", "disabled-standby"] as const)("shuts down the active %s path only after the configured delay", (mode) => {
    const store = alarmStore();
    if (mode === "single") store.getState().setConfigValue("station.transmitterConfig", "Single Transmitter");
    else store.getState().setConfigValue("transmitters.tx2.enabled", false);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    store.getState().advanceMonitorTime(4.9);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    store.getState().advanceMonitorTime(0.1);
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
    expect(store.getState().config.transmitters.tx1.enabled).toBe(false);
    expect(store.getState().lastCommand).toContain("shutdown");
  });

  it("does not shut down a single transmitter while monitor bypass is active", () => {
    const store = alarmStore();
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    store.getState().setConfigValue("station.transmitterConfig", "Single Transmitter");
    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().advanceMonitorTime(100);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    expect(store.getState().derived.monitorAnnunciation.alarm).toBe(true);
  });
});
