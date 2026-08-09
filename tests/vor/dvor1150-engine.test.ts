import { describe, expect, it } from "vitest";
import {
  buildDvor1150Snapshot,
  cloneDvor1150Config,
  defaultDvor1150Config,
} from "@/lib/dvor1150";
import { createDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

describe("DVOR 1150 configuration and PMDT engine", () => {
  it("routes the default antenna path and keeps VSWR values physical", () => {
    const snapshot = buildDvor1150Snapshot(defaultDvor1150Config);

    expect(snapshot.activeTransmitter).toBe("tx1");
    expect(snapshot.effectiveTransmitters.tx1.outputPower).toBe(100);
    expect(snapshot.data.txPower[0].tx2).toBe(0);
    expect(snapshot.monitors.mon1.parameters.azimuth.status).toBe("normal");
    expect(snapshot.data.sidebandVswr.every((row) => row.value >= 1)).toBe(true);
    expect(snapshot.data.txVswr.every((row) => row.tx1 === null || row.tx1 >= 1)).toBe(true);
  });

  it("propagates independent output scales through the selected transmitter path", () => {
    const tx2OnAir = cloneDvor1150Config(defaultDvor1150Config);
    tx2OnAir.transmitters.tx1.onAir = false;
    tx2OnAir.transmitters.tx1.load = false;
    tx2OnAir.transmitters.tx2.onAir = true;
    tx2OnAir.transmitters.tx2.load = false;
    tx2OnAir.transmitters.tx2.offsets.outputPowerScale = 70;

    const snapshot = buildDvor1150Snapshot(tx2OnAir);

    expect(snapshot.activeTransmitter).toBe("tx2");
    expect(snapshot.effectiveTransmitters.tx2.outputPower).toBe(70);
    expect(snapshot.data.txPower[0]).toMatchObject({ tx1: 0, tx2: 70 });
    expect(snapshot.monitors.mon1.parameters.rfLevel.value).toBeCloseTo(0.14, 5);
  });

  it("enforces transfer, Local/Bypass configuration, backup and restore semantics", () => {
    const store = createDvor1150PmdtStore({ now: () => new Date("2026-08-09T13:00:00Z") });

    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setTransmitterMode("tx2", "main")).toBe(true);
    expect(store.getState().derived.activeTransmitter).toBe("tx2");
    expect(store.getState().derived.effectiveTransmitters.tx1.active).toBe(false);

    expect(store.getState().setLocalMode(true)).toBe(true);
    expect(store.getState().setMonitorBypass("mon1", true)).toBe(true);
    store.getState().setConfigValue("transmitters.tx2.nominal.outputPower", 80);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().derived.effectiveTransmitters.tx2.outputPower).toBe(80);
    expect(store.getState().needBackup).toBe(true);

    expect(store.getState().backupConfig()).toBe(true);
    expect(store.getState().needBackup).toBe(false);
    store.getState().setConfigValue("transmitters.tx2.nominal.outputPower", 90);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().restoreConfig()).toBe(true);
    expect(store.getState().derived.effectiveTransmitters.tx2.outputPower).toBe(80);
  });
});
