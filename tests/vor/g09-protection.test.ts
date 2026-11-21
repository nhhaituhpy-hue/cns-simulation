import { describe, expect, it } from "vitest";
import { applyDvorConfigPatches, cloneDvor1150aConfig, createDefaultDvor1150aConfig, getDvorConfigValue } from "@/lib/dvor1150a";
import { parseDvor1150aConfig } from "@/lib/simulator-config/dvor-1150a";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";

function station(hot = false, restarts = false, single = false) {
  const store = createVorPmdtStore();
  store.getState().login("SEC3", "THREE");
  store.getState().setConfigValue("simulation.local", true);
  if (hot) store.getState().setConfigValue("station.standbyMode", "Hot Standby");
  if (single) store.getState().setConfigValue("station.transmitterConfig", "Single Transmitter");
  store.getState().setConfigValue("station.automaticRestartsEnabled", restarts);
  store.getState().setConfigValue("monitor.votingLogic", "OR");
  store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 70);
  expect(store.getState().applyConfigChanges()).toBe(true);
  return store;
}

describe("G09 native 1150A cold/hot protection", () => {
  it("starts cold with optional restarts disabled, 50 s first delay, fixed two restarts", () => {
    const state = createVorPmdtStore().getState();
    expect(state.config.station.standbyMode).toBe("Cold Standby");
    expect(state.config.transmitters.tx1.onAir).toBe(true);
    expect(state.config.transmitters.tx2).toMatchObject({ enabled: true, onAir: false, load: false });
    expect(state.data.rmsConfigGeneral).toMatchObject({ automaticRestartsEnabled: false, firstRestartDelay: 50, numberOfAutomaticRestarts: 2 });
    expect(state.securityLevel).toBe(0);
  });

  it("removes faulty main, waits 20 s cold, then gives standby its own alarm delay", () => {
    const store = station();
    store.getState().advanceMonitorTime(5);
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
    expect(store.getState().protectionState).toMatchObject({ phase: "cold-transfer", target: "tx2", remaining: 20 });
    expect(store.getState().selectMainTransmitter("tx2")).toBe(false);
    expect(store.getState().transferTransmitter()).toBe(false);
    store.getState().advanceMonitorTime(19.9);
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
    store.getState().advanceMonitorTime(0.1);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
    store.getState().advanceMonitorTime(4.9);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
    store.getState().advanceMonitorTime(0.1);
    expect(store.getState().protectionState.phase).toBe("lockout");
    expect(store.getState().config.transmitters.tx2.enabled).toBe(true);
    expect(store.getState().configDraft.transmitters).toEqual(store.getState().config.transmitters);
    store.getState().advanceMonitorTime(500);
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
  });

  it("switches hot without a cold delay; automatic shutdown does not keep the faulty main running", () => {
    const store = station(true);
    expect(store.getState().config.transmitters.tx2.load).toBe(true);
    store.getState().advanceMonitorTime(5);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
    expect(store.getState().config.transmitters.tx1).toMatchObject({ onAir: false, load: false, enabled: true });
    expect(store.getState().configDraft.transmitters).toEqual(store.getState().config.transmitters);
  });

  it("keeps the healthy alternate on Load during manual hot changeover, but Off in cold", () => {
    const store = station(true);
    expect(store.getState().selectMainTransmitter("tx2")).toBe(true);
    expect(store.getState().config.transmitters.tx1.load).toBe(true);
    expect(store.getState().selectMainTransmitter("tx1")).toBe(true);
    expect(store.getState().config.transmitters.tx2.load).toBe(true);
    store.getState().setConfigValue("station.standbyMode", "Cold Standby");
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().config.transmitters.tx2.load).toBe(false);
    expect(store.getState().selectMainTransmitter("tx2")).toBe(true);
    expect(store.getState().config.transmitters.tx1.load).toBe(false);
    store.getState().setConfigValue("station.standbyMode", "Hot Standby");
    store.getState().setConfigValue("station.transmitterConfig", "Single Transmitter");
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().selectMainTransmitter("tx1")).toBe(true);
    expect(store.getState().config.transmitters.tx2.load).toBe(false);
  });

  it("makes exactly two automatic attempts: configured first delay then fixed 300 s", () => {
    const store = station(false, true, true);
    store.getState().advanceMonitorTime(5);
    expect(store.getState().protectionState).toMatchObject({ phase: "restart-wait", remaining: 50, restartAttempts: 0 });
    store.getState().advanceMonitorTime(49.9);
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
    store.getState().advanceMonitorTime(0.1);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    expect(store.getState().protectionState.restartAttempts).toBe(1);
    store.getState().advanceMonitorTime(5);
    expect(store.getState().protectionState).toMatchObject({ phase: "restart-wait", remaining: 300 });
    store.getState().advanceMonitorTime(299.9);
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
    store.getState().advanceMonitorTime(0.1);
    expect(store.getState().protectionState.restartAttempts).toBe(2);
    store.getState().advanceMonitorTime(5);
    store.getState().advanceMonitorTime(1000);
    expect(store.getState().protectionState).toMatchObject({ phase: "lockout", restartAttempts: 2 });
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
  });

  it("honors the 20 s inhibit even with a shorter configured first delay", () => {
    const store = station(false, true, true);
    store.getState().setConfigValue("station.firstRestartDelay", 1);
    store.getState().applyConfigChanges();
    store.getState().advanceMonitorTime(5);
    expect(store.getState().protectionState.remaining).toBe(20);
    store.getState().advanceMonitorTime(19);
    expect(store.getState().selectMainTransmitter("tx1")).toBe(false);
    store.getState().advanceMonitorTime(1);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
  });

  it("can recover on a restart without consuming a second attempt", () => {
    const store = station(false, true, true);
    store.getState().advanceMonitorTime(5);
    store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 100);
    store.getState().applyConfigChanges();
    store.getState().advanceMonitorTime(50);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    store.getState().advanceMonitorTime(1000);
    expect(store.getState().protectionState).toMatchObject({ phase: "monitoring", restartAttempts: 1 });
    expect(store.getState().derived.voting.transferRequested).toBe(false);
  });

  it("cancels restart when disabled", () => {
    const store = station(false, true, true);
    store.getState().advanceMonitorTime(5);
    store.getState().setConfigValue("station.automaticRestartsEnabled", false);
    store.getState().applyConfigChanges();
    store.getState().advanceMonitorTime(400);
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
    expect(store.getState().protectionState.phase).toBe("lockout");
  });

  it("locks out if the pending cold target becomes unavailable", () => {
    const store = station();
    store.getState().advanceMonitorTime(5);
    store.getState().setConfigValue("transmitters.tx2.enabled", false);
    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().advanceMonitorTime(20);
    expect(store.getState().protectionState.phase).toBe("lockout");
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
  });

  it("does not restart if all installed paths become unavailable", () => {
    const store = station(false, true, true);
    store.getState().advanceMonitorTime(5);
    store.getState().setConfigValue("transmitters.tx1.enabled", false);
    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().advanceMonitorTime(50);
    expect(store.getState().protectionState).toMatchObject({ phase: "lockout", restartAttempts: 0 });
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
  });

  it("Off cancels pending automatic RF without defeating the mandatory inhibit", () => {
    const store = station(false, true);
    store.getState().advanceMonitorTime(5);
    expect(store.getState().setTransmitterMode("tx2", "off")).toBe(true);
    expect(store.getState().selectMainTransmitter("tx1")).toBe(false);
    store.getState().advanceMonitorTime(20);
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
    expect(store.getState().selectMainTransmitter("tx1")).toBe(true);
  });

  it("Transfer preserves the designated Main and uses its hot/cold profile", () => {
    const store = station(true);
    expect(store.getState().transferTransmitter()).toBe(true);
    expect(store.getState().derived.mainTransmitter).toBe("tx1");
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
    expect(store.getState().config.transmitters.tx1.load).toBe(true);
    store.getState().logout();
    expect(store.getState().transferTransmitter()).toBe(false);
  });

  it("does not let Apply or Restore energize RF during the protective inhibit", () => {
    const store = station();
    expect(store.getState().backupConfig()).toBe(true);
    store.getState().advanceMonitorTime(5);
    store.getState().setConfigValue("transmitters.tx2.onAir", true);
    expect(store.getState().applyConfigChanges()).toBe(false);
    expect(store.getState().restoreBackupConfig()).toBe(false);
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
    store.getState().discardConfigChanges();
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    store.getState().advanceMonitorTime(20);
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
    expect(store.getState().selectMainTransmitter("tx2")).toBe(true);
  });

  it("does not act under bypass, on normal readings or on invalid elapsed time", () => {
    const store = station();
    for (const elapsed of [NaN, Infinity, -1, 0]) store.getState().advanceMonitorTime(elapsed);
    expect(store.getState().monitorElapsed).toBe(0);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    store.getState().advanceMonitorTime(1000);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    expect(store.getState().derived.monitors.mon1.parameters.hz30Modulation.status).toBe("alarm");
    const normal = createVorPmdtStore();
    normal.getState().advanceMonitorTime(1000);
    expect(normal.getState().protectionState.phase).toBe("monitoring");
    expect(normal.getState().derived.voting.activeTransmitter).toBe("tx1");
  });

  it("consumes large time jumps across all phases just like small ticks", () => {
    const large = station(false, true);
    const small = station(false, true);
    large.getState().advanceMonitorTime(500);
    for (let i = 0; i < 500; i++) small.getState().advanceMonitorTime(1);
    expect(large.getState().protectionState).toEqual(small.getState().protectionState);
    expect(large.getState().config.transmitters).toEqual(small.getState().config.transmitters);
  });

  it("backfills old profiles and rejects unsupported restart settings", () => {
    const old = createDefaultDvor1150aConfig();
    delete old.station.standbyMode;
    delete old.station.firstRestartDelay;
    delete old.station.automaticRestartsEnabled;
    expect(cloneDvor1150aConfig(old).station.standbyMode).toBe("Cold Standby");
    expect(getDvorConfigValue(old, "station.firstRestartDelay")).toBe(50);
    expect(parseDvor1150aConfig(old)?.station.standbyMode).toBe("Cold Standby");
    expect(parseDvor1150aConfig({ ...old, station: { ...old.station, standbyMode: "unknown" } })).toBeNull();
    expect(parseDvor1150aConfig({ ...old, station: { ...old.station, firstRestartDelay: -1 } })).toBeNull();
    expect(applyDvorConfigPatches(old, [{ fieldId: "station.firstRestartDelay", value: -1 }]).ok).toBe(false);
    expect(applyDvorConfigPatches(old, [{ fieldId: "station.standbyMode", value: "warm" }]).ok).toBe(false);
  });
});
