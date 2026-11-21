import { describe, expect, it } from "vitest";
import { buildDvor1150aSnapshot, createDefaultDvor1150aConfig } from "@/lib/dvor1150a";
import { alignmentReading, readMonitorAlignment, readSidebandAlignment, readSynthesizerAlignment } from "@/lib/dvor1150a/alignment";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";

function station() {
  const store = createVorPmdtStore(), config = createDefaultDvor1150aConfig();
  config.simulation.local = true;config.simulation.integralMonitorBypass = true;
  for (const tx of Object.values(config.transmitters)) { tx.onAir = false;tx.load = true; }
  store.getState().replaceConfig(config);store.getState().login("SEC3", "THREE");store.getState().setMode("student");
  return store;
}
const sb = (store: ReturnType<typeof station>, id = "sideband-1a4a1") => readSidebandAlignment(store.getState().config, store.getState().derived, id);

describe("G06 HDCV alignment feedback", () => {
  it.each(["sideband-1a4a1", "sideband-1a4a2", "sideband-1a4a6", "sideband-1a4a7"])("isolates phase loops on %s and rejects 10 V, without clamping it into the 2–9 V acceptance range", id => {
    const store = station();expect(sb(store, id).every(row => row.status === "pass")).toBe(true);
    const config = store.getState().config.transmitters;
    expect(store.getState().turnSidebandTrim(id, "R1", 180)).toBe(true);
    expect(sb(store, id).find(row => row.id === "TP4")).toMatchObject({ value: 10, status: "fail", max: 9 });
    expect(sb(store, id).find(row => row.id === "TP1")?.status).toBe("fail");
    expect(sb(store, id).find(row => row.id === "TP5")?.status).toBe("fail");
    expect(sb(store, id).filter(row => ["TP7", "TP10", "TP11", "TP6"].includes(row.id)).every(row => row.status === "pass")).toBe(true);
    expect(store.getState().config.transmitters).toEqual(config);
    store.getState().turnSidebandTrim(id, "R1", -180);
    store.getState().turnSidebandTrim(id, "R4", -180);
    expect(sb(store, id).find(row => row.id === "TP10")).toMatchObject({ value: 2, status: "pass" });
    expect(sb(store, id).find(row => row.id === "TP11")?.status).toBe("fail");
    store.getState().turnSidebandTrim(id, "R4", 180);
    expect(sb(store, id).every(row => row.status === "pass")).toBe(true);
  });

  it("uses ±50 mV, inclusive limits, rejects nonfinite values and never passes an unavailable measurement", () => {
    expect(alignmentReading("TP6", 0.05, -0.05, 0.05).status).toBe("pass");
    expect(alignmentReading("TP6", -0.05, -0.05, 0.05).status).toBe("pass");
    expect(alignmentReading("TP6", 0.051, -0.05, 0.05).status).toBe("fail");
    for (const value of [NaN, Infinity, null]) expect(alignmentReading("TP6", value, -0.05, 0.05).status).toBe("unavailable");
    const store = station();
    store.getState().setConfigValue("transmitters.tx1.offsets.sideband1PhaseOffset", 1);
    expect(sb(store).find(row => row.id === "TP6")).toMatchObject({ value: 0, status: "pass" });
    store.getState().applyConfigChanges();
    expect(sb(store).find(row => row.id === "TP6")).toMatchObject({ value: 0.1, status: "fail" });
    expect(sb(store, "sideband-1a4a2").find(row => row.id === "TP6")?.value).toBe(0);
    store.getState().setConfigValue("transmitters.tx1.offsets.sideband1PhaseOffset", -1);store.getState().applyConfigChanges();
    expect(sb(store).find(row => row.id === "TP6")?.status).toBe("pass");
    store.getState().setTransmitterMode("tx1", "off");
    expect(sb(store).every(row => row.status === "unavailable" && row.value === null)).toBe(true);
    expect(readSidebandAlignment(store.getState().config, store.getState().derived, "unknown")).toEqual([]);
  });

  it("uses applied PLL settings for both synthesizers while frequency stays independent of PLL/calibration", () => {
    const store = station();
    for (const [id, occurrence] of [["tx1", "synth-1a3a1"], ["tx2", "synth-1a3a11"]] as const) {
      const read = () => readSynthesizerAlignment(store.getState().config, store.getState().derived, occurrence);
      const frequency = read()[2].value;
      const neutral = store.getState().config.transmitters[id].offsets.carrierPllControl;
      store.getState().setConfigValue(`transmitters.${id}.offsets.carrierPllControl`, neutral + 40);
      expect(read().every(row => row.status === "pass")).toBe(true);
      store.getState().applyConfigChanges();
      expect(read()[0].status).toBe("fail");expect(read()[1].status).toBe("fail");expect(read()[2].value).toBe(frequency);
      store.getState().setConfigValue(`transmitters.${id}.offsets.carrierPllControl`, neutral);store.getState().applyConfigChanges();
      expect(read().every(row => row.status === "pass")).toBe(true);
      store.getState().setTransmitterMode(id, "off");expect(read().every(row => row.value === null)).toBe(true);
    }
    expect(readSynthesizerAlignment(store.getState().config, store.getState().derived, "unknown")).toEqual([]);
  });

  it("preserves phase calibration in existing Backup/Restore and produces normal evidence without new config fields", () => {
    const store = station();store.getState().backupConfig();
    store.getState().turnSidebandTrim("sideband-1a4a1", "R1", 180);
    store.getState().setConfigValue("transmitters.tx1.offsets.sideband1PhaseOffset", 5);store.getState().applyConfigChanges();
    expect(sb(store).some(row => row.status === "fail")).toBe(true);
    expect(store.getState().actionHistory.some(row => row.accepted && row.controlId === "sidebandTrims.1a4a1.R1")).toBe(true);
    expect(store.getState().restoreBackupConfig()).toBe(true);
    expect(sb(store).every(row => row.status === "pass")).toBe(true);
  });

  it("checks J2 at ±20 ppm inclusive, phase-error bounds, and missing RF in just one sideband", () => {
    const config = createDefaultDvor1150aConfig();
    for (const [ppm, status] of [[-20, "pass"], [20, "pass"], [20.1, "fail"], [-20.1, "fail"]] as const) {
      config.transmitters.tx1.frequencyErrorPpm = ppm;
      expect(readSynthesizerAlignment(config, buildDvor1150aSnapshot(config), "synth-1a3a1")[2].status).toBe(status);
    }
    for (const [value, status] of [[0.89, "pass"], [0.91, "pass"], [0.911, "fail"], [0.889, "fail"]] as const) {
      expect(alignmentReading("TP5", value, 0.89, 0.91).status).toBe(status);
    }
    config.sidebandTrims!["1a4a1"].R3 = -1800;
    const readings = readSidebandAlignment(config, buildDvor1150aSnapshot(config), "sideband-1a4a1");
    expect(readings.filter(row => ["TP1", "TP4", "TP5", "TP6"].includes(row.id)).every(row => row.status === "unavailable")).toBe(true);
    expect(readings.filter(row => ["TP7", "TP10", "TP11"].includes(row.id)).every(row => row.status === "pass")).toBe(true);
  });

  it("calibrates MON1 then MON2 manually without changing model input, RF, peer calibration or inventing a deviation target", () => {
    const store = station();store.getState().setTransmitterMode("tx1", "main");
    const physical = store.getState().derived.effectiveTransmitters;
    for (const monitor of ["mon1", "mon2"] as const) {
      const before = readMonitorAlignment(store.getState().config, store.getState().derived, monitor);
      const peer = monitor === "mon1" ? "mon2" : "mon1";
      const other = structuredClone(store.getState().config.monitor.calibration[peer]);
      const current = before.find(row => row.parameter === "hz30Modulation")!.indicated as number;
      store.getState().setConfigValue(`monitor.calibration.${monitor}.hz30ModulationScale`, 30 / current * store.getState().config.monitor.calibration[monitor].hz30ModulationScale);
      store.getState().setConfigValue(`monitor.calibration.${monitor}.rfLevelOffset`, store.getState().config.monitor.calibration[monitor].rfLevelOffset - (before.find(row => row.parameter === "rfLevel")!.indicated as number));
      expect(store.getState().applyConfigChanges()).toBe(true);
      const after = readMonitorAlignment(store.getState().config, store.getState().derived, monitor);
      expect(after.find(row => row.parameter === "hz30Modulation")!.indicated).toBeCloseTo(30);
      expect(after.find(row => row.parameter === "rfLevel")!.indicated).toBeCloseTo(0);
      expect(after.map(row => row.input)).toEqual(before.map(row => row.input));
      expect(store.getState().config.monitor.calibration[peer]).toEqual(other);
      expect(store.getState().derived.effectiveTransmitters).toEqual(physical);
      expect(after.find(row => row.parameter === "deviation")).toEqual(before.find(row => row.parameter === "deviation"));
    }
    const config = createDefaultDvor1150aConfig();config.transmitters.tx1.onAir = false;
    expect(readMonitorAlignment(config, buildDvor1150aSnapshot(config), "mon1").every(row => row.input === null)).toBe(true);
  });
});
