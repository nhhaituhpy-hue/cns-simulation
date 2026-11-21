import { describe, expect, it } from "vitest";
import { buildDvor1150aSnapshot, createDefaultDvor1150aConfig } from "@/lib/dvor1150a";
import { readDvorTransmitterRfPower } from "@/lib/dvor1150a/engine";
import { AC_REFERENCE, COMMON_AC_INPUT_BCPS } from "@/lib/dvor1150a/hardware-calibration";
import { getDefaultDvor1150aConfig, parseDvor1150aConfig } from "@/lib/simulator-config/dvor-1150a";
import { preserveMissingDvor1150aExtensions, projectSimulatorConfigResponse } from "@/lib/simulator-config/wire";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";

function station() {
  const store = createVorPmdtStore();
  const config = createDefaultDvor1150aConfig();
  config.simulation.local = true;
  config.simulation.integralMonitorBypass = true;
  config.transmitters.tx2.load = true;
  store.getState().replaceConfig(config);
  store.getState().setMode("student");
  store.getState().login("SEC3", "THREE");
  return store;
}

describe("G14 native detector calibration", () => {
  it("keeps RF physical power/matching, field monitors and software offsets independent of R1/R2/R3", () => {
    const store = station();
    const before = store.getState();
    const physical = structuredClone(before.derived.effectiveTransmitters);
    const power = before.data.txPower[0];
    store.getState().turnHardwareTrim("rf", "R1", 90);
    expect(store.getState().data.txPower[0].tx1).toBeCloseTo(power.tx1 * 1.5);
    expect(store.getState().data.txPower[0].tx2).toBe(power.tx2);
    store.getState().turnHardwareTrim("rf", "R3", -90);
    expect(store.getState().data.txPower[0].tx2).toBeCloseTo(power.tx2 * 0.5);
    const vswr = store.getState().data.txVswr[0].value1!;
    store.getState().turnHardwareTrim("rf", "R2", -90);
    expect(store.getState().data.txVswr[0].value1).toBeLessThan(vswr);
    expect(store.getState().data.txVswr[0].value2).toBe(1);
    expect(store.getState().derived.effectiveTransmitters).toEqual(physical);
    expect(store.getState().derived.monitors).toEqual(before.derived.monitors);
    expect(store.getState().config.transmitters).toEqual(before.config.transmitters);
    expect(readDvorTransmitterRfPower(store.getState().derived.effectiveTransmitters.tx1)).toEqual(readDvorTransmitterRfPower(physical.tx1));
  });

  it("routes FWD/STANDBY trims by antenna/load role, not fixed transmitter number; Off stays zero/unavailable", () => {
    const store = station();
    store.getState().turnHardwareTrim("rf", "R1", 90);
    store.getState().turnHardwareTrim("rf", "R3", -90);
    const config = structuredClone(store.getState().config);
    config.transmitters.tx1.onAir = false;
    config.transmitters.tx1.load = true;
    config.transmitters.tx2.onAir = true;
    config.transmitters.tx2.load = false;
    const snapshot = buildDvor1150aSnapshot(config);
    expect(snapshot.data.txPower[0].tx1).toBeCloseTo(readDvorTransmitterRfPower(snapshot.effectiveTransmitters.tx1).carrier.forward * 0.5);
    expect(snapshot.data.txPower[0].tx2).toBeCloseTo(readDvorTransmitterRfPower(snapshot.effectiveTransmitters.tx2).carrier.forward * 1.5);
    config.transmitters.tx1.load = false;
    const off = buildDvor1150aSnapshot(config);
    expect(off.data.txPower[0].tx1).toBe(0);
    expect(off.data.txVswr[0].value1).toBeNull();
    store.getState().turnHardwareTrim("rf", "R1", -270);
    expect(store.getState().data.txVswr[0].value1).toBeNull();
    expect(store.getState().data.txPower[0].tx1).toBe(0);
  });

  it("keeps the physical VSWR fault even when R2 makes indicated VSWR look matched", () => {
    const store = station();
    const config = structuredClone(store.getState().config);
    config.transmitters.tx1.faults.carrierVswr = true;
    store.getState().replaceConfig(config);
    const before = structuredClone(store.getState().derived.effectiveTransmitters.tx1);
    store.getState().turnHardwareTrim("rf", "R2", -180);
    expect(store.getState().data.txVswr[0].value1).toBe(1);
    expect(store.getState().derived.effectiveTransmitters.tx1).toEqual(before);
    expect(store.getState().config.transmitters.tx1.faults.carrierVswr).toBe(true);
  });

  it("isolates BCPS2 and R30/R56, preserving independent physical AC references", () => {
    const store = station();
    const ac = () => [store.getState().data.rmsVoltageData.find(row => row.parameter === "AC Input")!.volts,
      store.getState().data.rmsCurrentData.find(row => row.parameter === "AC Input")!.amps];
    expect(COMMON_AC_INPUT_BCPS).toBe("bcps1");
    expect(ac()).toEqual([AC_REFERENCE.volts, AC_REFERENCE.amps]);
    store.getState().turnHardwareTrim("bcps2", "R30", 90);
    store.getState().turnHardwareTrim("bcps2", "R56", -90);
    expect(ac()).toEqual([AC_REFERENCE.volts, AC_REFERENCE.amps]);
    store.getState().turnHardwareTrim("bcps1", "R30", 15);
    expect(ac()[0]).toBeCloseTo(AC_REFERENCE.volts * (1 + 15 / 900));
    expect(ac()[1]).toBe(AC_REFERENCE.amps);
    store.getState().turnHardwareTrim("bcps1", "R56", 180);
    expect(ac()[1]).toBeCloseTo(AC_REFERENCE.amps * 1.2);
    expect(AC_REFERENCE).toEqual({ volts: 232.3, amps: 2.3 });
  });

  it("logs immediate changes, preserves drafts and includes all board trims in Backup/Restore", () => {
    const store = station();
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 80);
    store.getState().turnHardwareTrim("bcps1", "R30", 15);
    store.getState().turnHardwareTrim("rf", "R3", 30);
    expect(store.getState().config.transmitters.tx1.nominal.outputPower).toBe(70);
    expect(store.getState().configDraft.transmitters.tx1.nominal.outputPower).toBe(80);
    expect(store.getState().actionHistory.at(-1)).toMatchObject({ accepted: true, controlId: "hardwareCalibration.rf.R3",
      parameterChanges: [{ fieldId: "hardwareCalibration.rf.R3", before: 0, after: 30, phase: "apply" }] });
    expect(store.getState().parameterChangeLogs.filter(row => row.parameter === "Physical detector trim")).toHaveLength(2);
    store.getState().discardConfigChanges();
    expect(store.getState().backupConfig()).toBe(true);
    const backup = structuredClone(store.getState().config.hardwareCalibration);
    store.getState().turnHardwareTrim("bcps1", "R30", -30);
    expect(store.getState().restoreBackupConfig()).toBe(true);
    expect(store.getState().config.hardwareCalibration).toEqual(backup);
  });

  it("rejects invalid, absent, remote and non-bypass operations and clamps travel", () => {
    const store = station();
    const initial = structuredClone(store.getState().config.hardwareCalibration);
    expect(store.getState().turnHardwareTrim("rf", "R30", 15)).toBe(false);
    expect(store.getState().turnHardwareTrim("rf", "R1", NaN)).toBe(false);
    expect(store.getState().turnHardwareTrim("rf", "R1", 0)).toBe(false);
    expect(store.getState().config.hardwareCalibration).toEqual(initial);
    store.getState().setConfigValue("simulation.integralMonitorBypass", false);
    expect(store.getState().turnHardwareTrim("rf", "R1", 15)).toBe(false);
    store.getState().setConfigValue("simulation.local", false);
    expect(store.getState().turnHardwareTrim("bcps1", "R30", 15)).toBe(false);
    const config = createDefaultDvor1150aConfig();
    config.simulation.local = true;
    config.simulation.integralMonitorBypass = true;
    config.station.transmitterConfig = "Single Transmitter";
    store.getState().replaceConfig(config);
    expect(store.getState().turnHardwareTrim("bcps2", "R30", 15)).toBe(false);
    expect(store.getState().turnHardwareTrim("rf", "R1", 99999)).toBe(true);
    expect(store.getState().config.hardwareCalibration!.rf.R1).toBe(180);
    expect(store.getState().turnHardwareTrim("rf", "R1", 15)).toBe(false);
    expect(store.getState().actionHistory.at(-1)).toMatchObject({ accepted: false });
    const definition = store.getState().scenarioDraft;
    store.setState({ scenario: { active: true, definition: { ...definition, editPolicy: { mode: "restricted", allowedFieldIds: [] }, studentEditableFieldIds: [] }, startedAt: null } });
    expect(store.getState().turnHardwareTrim("rf", "R2", 15)).toBe(false);
    expect(store.getState().actionHistory.at(-1)).toMatchObject({ accepted: false, reason: "Protected scenario field." });
  });

  it("backfills absent extension neutrally but rejects malformed/empty/out-of-range persisted calibration", () => {
    const config = getDefaultDvor1150aConfig();
    delete config.hardwareCalibration;
    expect(parseDvor1150aConfig(config)?.hardwareCalibration?.rf.R1).toBe(0);
    for (const value of [null, {}, { rf: {} }]) expect(parseDvor1150aConfig({ ...config, hardwareCalibration: value })).toBeNull();
    for (const value of [NaN, Infinity, -181, 181]) {
      const invalid = getDefaultDvor1150aConfig();
      invalid.hardwareCalibration!.bcps1.R30 = value;
      expect(parseDvor1150aConfig(invalid)).toBeNull();
    }
  });

  it.each([null, "dvor-1150a-extensions-v1", "dvor-1150a-extensions-v2", "dvor-1150a-extensions-v3"])("projects the old shape and preserves hidden calibration for %s", dto => {
    const config = getDefaultDvor1150aConfig();
    config.hardwareCalibration!.bcps2.R56 = 90;
    const response = { simulatorId: "dvor-1150a", schemaVersion: 1, initialConfig: config, appliedConfig: config, backupConfig: config, preferences: {}, revision: 1, persisted: true, history: [] } as const;
    const projected = projectSimulatorConfigResponse({ ...response, history: [] }, dto);
    expect(projected.appliedConfig.hardwareCalibration).toBeUndefined();
    const parsed = parseDvor1150aConfig(projected.appliedConfig)!;
    expect(preserveMissingDvor1150aExtensions(projected.appliedConfig, parsed, config).hardwareCalibration).toEqual(config.hardwareCalibration);
  });
});
