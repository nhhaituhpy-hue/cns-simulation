import { beforeEach, describe, expect, it } from "vitest";
import { buildDvor1150aSnapshot, createDefaultDvor1150aConfig, readDvorTransmitterRfPower } from "@/lib/dvor1150a";
import type { DvorTransmitterId } from "@/lib/dvor1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

function loadConfig(id: DvorTransmitterId = "tx1") {
  const config = createDefaultDvor1150aConfig();
  config.transmitters.tx1.onAir = false;
  config.transmitters.tx2.onAir = false;
  config.transmitters[id].load = true;
  return config;
}

describe("G02 Load-mode RF", () => {
  beforeEach(() => useVorPmdtStore.getState().reset());

  it.each(["tx1", "tx2"] as const)("keeps %s RF powered into the matched load without radiating", id => {
    const config = loadConfig(id);
    const loaded = buildDvor1150aSnapshot(config);
    const rf = readDvorTransmitterRfPower(loaded.effectiveTransmitters[id]);
    const onAirConfig = structuredClone(config);
    onAirConfig.transmitters[id].load = false;
    onAirConfig.transmitters[id].onAir = true;
    const onAir = buildDvor1150aSnapshot(onAirConfig);
    expect(loaded.data.txPower.map(row => row[id])).toEqual(onAir.data.txPower.map(row => row[id]));
    expect(rf.carrier.forward).toBeGreaterThan(0);
    expect(rf.sidebands.every(row => row.forward > 0 && row.reflected === 0)).toBe(true);
    expect(rf.carrier.reflected).toBe(0);
    const key = id === "tx1" ? "value1" : "value2";
    expect(loaded.data.txVswr.every(row => row[key] === 1)).toBe(true);
    expect(loaded.data.txFrequency[0][key]).toBe(onAir.data.txFrequency[0][key]);
    expect(loaded.data.rmsMonitorTransmitterStatus.transmitterOn[id]).toBe(true);
    expect(loaded.data.transmitters[id]).toMatchObject({ antenna: "gray", load: "green", off: "gray" });
    expect(loaded.voting.activeTransmitter).toBeNull();
    expect(loaded.monitors.mon1.parameters.rfLevel.value).toBe(-60);
    expect(loaded.monitors.mon1.parameters.txPower.value).toBe(0);
    expect(loaded.monitors.mon1.parameters.azimuth).toMatchObject({ value: "—", indicator: "gray" });
    expect(loaded.monitors.mon1.parameters.identStatus.value).toBe("No Ident");
    expect(loaded.data.vswrData).toEqual([]);
    expect(loaded.data.notchData).toEqual([]);
    expect(loaded.monitorAnnunciation.alarm).toBe(true);
    config.simulation.integralMonitorBypass = true;
    const bypass = buildDvor1150aSnapshot(config);
    expect(bypass.monitorAnnunciation.alarm).toBe(true);
    expect(bypass.voting.transferRequested).toBe(false);
    expect(bypass.data.txPower).toEqual(loaded.data.txPower);
  });

  it.each([60, 80])("shows a nominal power trial to %s W in Load through SEC3/Local Apply", power => {
    const store = useVorPmdtStore;
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    store.getState().setConfigValue("simulation.local", true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    expect(store.getState().setTransmitterMode("tx1", "load")).toBe(true);
    const before = store.getState().data.txPower.map(row => row.tx1);
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", power);
    expect(store.getState().data.txPower.map(row => row.tx1)).toEqual(before);
    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().data.txPower.forEach((row, index) => expect(row.tx1).toBeCloseTo(before[index] * power / 70));
    expect(store.getState().derived.voting.activeTransmitter).toBeNull();
    expect(store.getState().derived.standbyMonitors.mon1.txPower).toBeCloseTo(power * 0.84);
  });

  it("responds to Output Power Scale and individual sideband trims in Load", () => {
    const config = loadConfig();
    const before = buildDvor1150aSnapshot(config);
    config.transmitters.tx1.offsets.outputPowerScale /= 2;
    const half = buildDvor1150aSnapshot(config);
    half.data.txPower.forEach((row, index) => expect(row.tx1).toBeCloseTo(before.data.txPower[index].tx1 / 2));
    config.transmitters.tx1.offsets.sideband1RfLevelScale = 70.7;
    const trim = buildDvor1150aSnapshot(config);
    expect(trim.data.txPower[1].tx1).toBeCloseTo(half.data.txPower[1].tx1 * 0.707 ** 2);
    expect(trim.data.txPower[0]).toEqual(half.data.txPower[0]);
    expect(trim.data.txPower[2]).toEqual(half.data.txPower[2]);
  });

  it("isolates Load adjustments from the other TX's on-air field and antenna faults", () => {
    const config = createDefaultDvor1150aConfig();
    config.transmitters.tx2.load = true;
    config.transmitters.tx2.vswr.carrier = 5;
    config.transmitters.tx2.vswr.sidebands = [5, 5, 5, 5];
    const before = buildDvor1150aSnapshot(config);
    config.transmitters.tx2.nominal.outputPower = 80;
    const after = buildDvor1150aSnapshot(config);
    expect(after.voting.activeTransmitter).toBe("tx1");
    expect(after.monitors).toEqual(before.monitors);
    expect(after.data.vswrData).toEqual(before.data.vswrData);
    expect(after.data.notchData).toEqual(before.data.notchData);
    expect(after.data.txVswr.every(row => row.value2 === 1)).toBe(true);
    expect(after.data.txPower[0].tx2).toBeGreaterThan(before.data.txPower[0].tx2);
    config.transmitters.tx2.load = false;
    config.transmitters.tx2.onAir = true;
    config.transmitters.tx1.onAir = false;
    expect(buildDvor1150aSnapshot(config).data.txVswr[0].value2).toBe(5);
  });

  it.each(["off", "disabled", "uninstalled"])("has no RF or live VSWR/frequency when %s", mode => {
    const config = loadConfig("tx2");
    if (mode === "off") config.transmitters.tx2.load = false;
    if (mode === "disabled") config.transmitters.tx2.faults.disabled = true;
    if (mode === "uninstalled") config.station.transmitterConfig = "Single Transmitter";
    const snapshot = buildDvor1150aSnapshot(config);
    const rf = readDvorTransmitterRfPower(snapshot.effectiveTransmitters.tx2);
    expect(rf.carrier).toEqual({ forward: 0, reflected: 0 });
    expect(rf.sidebands.every(row => row.forward === 0 && row.reflected === 0)).toBe(true);
    expect(snapshot.data.txPower.every(row => row.tx2 === 0)).toBe(true);
    expect(snapshot.data.txVswr.every(row => row.value2 === null)).toBe(true);
    expect(snapshot.data.txFrequency.every(row => row.value2 === null)).toBe(true);
    expect(snapshot.data.rmsMonitorTransmitterStatus.transmitterOn.tx2).toBe(false);
  });

  it("retains explicit RF mismatch and overtemperature faults in Load", () => {
    const config = loadConfig();
    config.transmitters.tx1.faults.carrierVswr = true;
    config.transmitters.tx1.faults.overtemperature = true;
    const snapshot = buildDvor1150aSnapshot(config);
    const rf = readDvorTransmitterRfPower(snapshot.effectiveTransmitters.tx1);
    expect(snapshot.data.txVswr[0].value1).toBe(3);
    expect(rf.carrier.reflected).toBeCloseTo(rf.carrier.forward / 4);
    expect(rf.sidebands.every(row => row.reflected > 0 && row.reflected <= row.forward)).toBe(true);
    expect(snapshot.transmitterStatus.tx1.txCarrierPaAlerts.find(row => row.label === "Carrier Reflected Power")?.indicator).toBe("red");
    expect(snapshot.transmitterStatus.tx1.txCarrierPaAlerts.find(row => row.label === "PA Thermal Shutdown")?.indicator).toBe("red");
  });

  it("keeps SEC3 and Local guards rather than switching an unauthorized TX", () => {
    const store = useVorPmdtStore;
    expect(store.getState().setTransmitterMode("tx1", "load")).toBe(false);
    store.getState().login("SEC3", "THREE");
    expect(store.getState().setTransmitterMode("tx1", "load")).toBe(false);
    expect(store.getState().config.transmitters.tx1.onAir).toBe(true);
  });
});
