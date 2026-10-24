import { describe, expect, it } from "vitest";
import { applyDvorConfigPatches, buildDvor1150aSnapshot, createDefaultDvor1150aConfig } from "@/lib/dvor1150a";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";

it("keeps TX carrier measurements independent of MON1 detector calibration", () => {
  const config = createDefaultDvor1150aConfig();
  const before = buildDvor1150aSnapshot(config);
  config.monitor.calibration.mon1.txPowerScale = 10;
  config.monitor.calibration.mon1.txPowerOffset = 5;
  const after = buildDvor1150aSnapshot(config);
  expect(after.data.txPower).toEqual(before.data.txPower);
  expect(after.monitors.mon1.parameters.txPower.value).not.toBe(before.monitors.mon1.parameters.txPower.value);
  expect(after.monitors.mon2).toEqual(before.monitors.mon2);
});

it.each(["odd", "even"] as const)("does not confuse %s return-loss dB calibration with VSWR ratio", parity => {
  const config = createDefaultDvor1150aConfig();
  const before = buildDvor1150aSnapshot(config);
  config.monitor.calibration.mon1[`${parity}AntennaReturnLossOffset`] = 6;
  const after = buildDvor1150aSnapshot(config);
  const selected = parity === "odd" ? 0 : 1;
  const ratio = before.monitors.mon1.sidebandVswr[selected];
  expect(after.monitors.mon1.sidebandVswr[selected]).toBe(ratio);
  expect(after.monitors.mon1.sidebandVswr[1 - selected]).toBe(before.monitors.mon1.sidebandVswr[1 - selected]);
  expect(after.monitors.mon2).toEqual(before.monitors.mon2);
  expect(after.effectiveTransmitters).toEqual(before.effectiveTransmitters);
});

it.each(["txPowerOffset", "oddAntennaReturnLossOffset", "evenAntennaReturnLossOffset"] as const)("stores %s without fabricating an unverified manufacturer calibration transfer", key => {
  const config = createDefaultDvor1150aConfig();
  const before = buildDvor1150aSnapshot(config);
  const result = applyDvorConfigPatches(config, [{ fieldId: `monitor.calibration.mon1.${key}`, value: 5 }]);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.config.monitor.calibration.mon1[key]).toBe(5);
  expect(result.snapshot.monitors).toEqual(before.monitors);
  expect(result.snapshot.effectiveTransmitters).toEqual(before.effectiveTransmitters);
});

describe("1150A apply validation", () => {
  it("rejects invalid complete legacy drafts even when not edited through a control", () => {
    const config = createDefaultDvor1150aConfig();
    config.monitor.calibration.mon2.hz30ModulationScale = Number.NaN;
    expect(applyDvorConfigPatches(config).ok).toBe(false);
  });
  it("rejects inverted limit bands at Apply while allowing intermediate staged repairs", () => {
    const store = createVorPmdtStore();
    store.getState().login("SEC3", "THREE");
    store.getState().setConfigValue("simulation.local", true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    const before = store.getState().config;
    store.getState().setConfigValue("monitor.alarmLimits.txPower.alarmLow", 80);
    expect(store.getState().configDirty).toBe(true);
    expect(store.getState().applyConfigChanges()).toBe(false);
    expect(store.getState().config).toBe(before);
    store.getState().setConfigValue("monitor.alarmLimits.txPower.alarmLow", 40);
    expect(store.getState().applyConfigChanges()).toBe(true);
  });
});
