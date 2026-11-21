import { describe, expect, it } from "vitest";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { buildDvor1150aSnapshot, createDefaultDvor1150aConfig } from "@/lib/dvor1150a";
import { appendDvorFault, initialDvorFaultHistory, sampleDvorFaultHistory } from "@/lib/dvor1150a/fault-history";

function station(hot = false, single = false, restarts = false) {
  let time = Date.parse("2026-11-21T08:00:00Z");
  const store = createVorPmdtStore({ now: () => new Date(time) });
  const config = createDefaultDvor1150aConfig();
  config.simulation.local = true;
  config.monitor.votingLogic = "OR";
  config.station.standbyMode = hot ? "Hot Standby" : "Cold Standby";
  config.station.transmitterConfig = single ? "Single Transmitter" : "Dual Transmitters";
  config.station.automaticRestartsEnabled = restarts;
  config.transmitters.tx2.load = hot && !single;
  store.getState().replaceConfig(config);
  store.getState().login("SEC3", "THREE");
  return { store, advance: (seconds: number) => { time += seconds * 1000;store.getState().advanceMonitorTime(seconds); } };
}
function fault(store: ReturnType<typeof station>["store"], value = 50) {
  store.getState().setConfigValue("transmitters.tx1.offsets.referenceModulationScale", value);
  expect(store.getState().applyConfigChanges()).toBe(true);
}

describe("G10 captured fault history", () => {
  it.each([false, true])("retains last good values and captures the bad antenna before %s hot transfer, not the new transmitter", hot => {
    const { store, advance } = station(hot);
    const good = structuredClone(store.getState().data.integralData);
    fault(store);
    const bad = structuredClone(store.getState().data.integralData);
    expect(store.getState().faultHistory.events).toEqual([]);
    advance(4.9);expect(store.getState().faultHistory.events).toEqual([]);
    advance(0.1);
    const event = store.getState().faultHistory.events[0];
    expect(event.alarm.rows).toEqual(bad);
    expect(event.prior.mon1!.rows).toEqual(good);
    expect(event.alarm.timestamp).toBe("2026-11-21T08:00:05.000Z");
    expect(event.lcu).toMatchObject({ antenna: "tx1", main: "tx1", primaryAlarm: true, on: { tx1: true, tx2: hot } });
    if (!hot) advance(20);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
    advance(50);
    expect(store.getState().faultHistory.events).toHaveLength(1);
    expect(store.getState().faultHistory.events[0]).toEqual(event);
    expect(store.getState().data.integralData).not.toEqual(bad);
  });

  it("keeps only the last three events, immutable through recovery and Backup/Restore", () => {
    const { store, advance } = station();
    store.getState().backupConfig();
    const captured = [];
    for (let i = 0; i < 4; i++) {
      if (i) expect(store.getState().restoreBackupConfig()).toBe(true);
      fault(store, 50 - i * 5);advance(5);
      captured.unshift(structuredClone(store.getState().faultHistory.events[0]));
      advance(20);
    }
    expect(store.getState().faultHistory.events).toEqual(captured.slice(0, 3));
    expect(captured[0].alarm.rows).not.toEqual(captured[3].alarm.rows);
    store.getState().reset();expect(store.getState().faultHistory.events).toEqual([]);
  });

  it("captures multiple shutdown/restart boundaries in one delayed clock tick with individual timestamps", () => {
    const { store, advance } = station(false, true, true);
    fault(store);advance(365);
    const events = store.getState().faultHistory.events;
    expect(events).toHaveLength(3);
    expect(events.map(event => event.alarm.timestamp)).toEqual(["2026-11-21T08:06:05.000Z", "2026-11-21T08:01:00.000Z", "2026-11-21T08:00:05.000Z"]);
    expect(events.every(event => event.lcu.antenna === "tx1")).toBe(true);
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
  });

  it("does not fabricate events for drafts, invalid ticks, Off or maintenance bypass", () => {
    const { store, advance } = station();
    store.getState().setConfigValue("transmitters.tx1.offsets.referenceModulationScale", 50);
    expect(store.getState().faultHistory.events).toHaveLength(0);
    store.getState().discardConfigChanges();
    for (const seconds of [NaN, Infinity, 0, -1]) store.getState().advanceMonitorTime(seconds);
    advance(10);expect(store.getState().faultHistory.events).toEqual([]);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    fault(store);advance(40);expect(store.getState().faultHistory.events).toEqual([]);
    store.getState().setConfigValue("simulation.integralMonitorBypass", false);
    store.getState().setTransmitterMode("tx1", "off");advance(50);
    expect(store.getState().faultHistory.events).toEqual([]);
  });

  it("samples each enabled monitor's last good measurement independently", () => {
    const { store, advance } = station();
    const good = store.getState().faultHistory.good.mon1;
    store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 70);
    expect(store.getState().applyConfigChanges()).toBe(true);
    advance(4);
    expect(store.getState().faultHistory.good.mon1).toEqual(good);
    expect(store.getState().faultHistory.good.mon2!.timestamp).toBe("2026-11-21T08:00:04.000Z");
    advance(1);
    expect(store.getState().faultHistory.events[0].prior.mon1).toEqual(good);
    expect(store.getState().faultHistory.events[0].prior.mon2!.timestamp).toBe("2026-11-21T08:00:04.000Z");
  });

  it("accounts for LCU initialization time before a fault in the same delayed tick", () => {
    const { store, advance } = station(false, true);
    fault(store);expect(store.getState().backupConfig()).toBe(true);
    expect(store.getState().lcuCommand("reset")).toBe(true);
    advance(25);
    expect(store.getState().faultHistory.events[0].alarm.timestamp).toBe("2026-11-21T08:00:25.000Z");
    expect(store.getState().faultHistory.events[0].lcu.antenna).toBe("tx1");
  });

  it("does not invent good measurements for an already-faulty or disabled monitor loaded at startup", () => {
    const config = createDefaultDvor1150aConfig();config.monitor.antennas.mon1.enabled = false;
    config.monitor.votingLogic = "OR";
    const snapshot = buildDvor1150aSnapshot(config);
    const history = sampleDvorFaultHistory(initialDvorFaultHistory(), config, snapshot, "2026-11-21T08:00:00Z");
    expect(history.good.mon1).toBeNull();expect(history.good.mon2).not.toBeNull();
    const recorded = appendDvorFault(history, config, snapshot, "2026-11-21T08:00:05Z");
    expect(recorded.events[0].prior.mon1).toBeNull();
    expect(recorded.events[0].alarm.rows.every(row => row.mon1Value === "—" && row.mon1Status === "gray")).toBe(true);
    expect(recorded.events[0].alarm.sidebandFaults.mon1).toBeNull();
    expect(recorded.events[0].lcu.enabled).toEqual({ mon1: false, mon2: true });
    config.monitor.sidebandVswr.alarm = 1;
    expect(recorded.events[0].alarm.sidebandFaults.mon2).toEqual([]);
  });
});
