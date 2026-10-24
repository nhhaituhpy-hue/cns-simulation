import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { applyDvorConfigPatches, buildDvor1150aSnapshot, createDefaultDvor1150aConfig, dvorConfigFieldCatalog, getDvorConfigValue, setDvorConfigValue, validateDvorConfig } from "@/lib/dvor1150a";

/** Green characterization controls: these mappings existed before this task. */
describe.each(["tx1", "tx2"] as const)("1150A existing native offset mappings (%s)", (tx) => {
  const other = tx === "tx1" ? "tx2" : "tx1";
  const cases = [
    ["azimuthAngleOffset", 2, "effectiveAzimuthIndex"],
    ["outputPowerScale", 50, "effectiveOutputPower"],
    ["voiceModulationScale", 50, "effectiveVoiceModulation"],
    ["identModulationScale", 50, "effectiveIdentModulation"],
    ["referenceModulationScale", 50, "effectiveReferenceModulation"],
    ["txSidebandRfLevelScale", 50, "effectiveSboRfLevel"],
  ] as const;
  it.each(cases)("%s changes only its transmitter's effective %s", (key, value, measurement) => {
    const config = createDefaultDvor1150aConfig();
    config.transmitters.tx1.onAir = tx === "tx1";
    config.transmitters.tx2.onAir = tx === "tx2";
    config.transmitters[tx].nominal.voiceModulation = 10;
    const before = buildDvor1150aSnapshot(config);
    const fieldId = `transmitters.${tx}.offsets.${key}`;
    const patched = applyDvorConfigPatches(config, [{ fieldId, value }]);
    expect(patched.ok).toBe(true);
    if (!patched.ok) return;
    expect(patched.snapshot.effectiveTransmitters[tx][measurement]).not.toBe(before.effectiveTransmitters[tx][measurement]);
    expect(patched.snapshot.effectiveTransmitters[other]).toEqual(before.effectiveTransmitters[other]);
    const inactive = setDvorConfigValue(config, `transmitters.${other}.offsets.${key}`, value);
    expect(buildDvor1150aSnapshot(inactive).monitors).toEqual(before.monitors);
  });
  it.each([1, 2, 3, 4] as const)("SB%s RF level changes only that power channel", (sb) => {
    const config = createDefaultDvor1150aConfig();
    config.transmitters.tx1.onAir = tx === "tx1";
    config.transmitters.tx2.onAir = tx === "tx2";
    const before = buildDvor1150aSnapshot(config);
    const result = applyDvorConfigPatches(config, [{ fieldId: `transmitters.${tx}.offsets.sideband${sb}RfLevelScale`, value: 70.7 }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.effectiveTransmitters[tx].sidebandPower[sb - 1]).toBeCloseTo(before.effectiveTransmitters[tx].sidebandPower[sb - 1] * (0.707 ** 2));
    expect(result.snapshot.effectiveTransmitters[tx].sidebandPower.filter((_, i) => i !== sb - 1)).toEqual(before.effectiveTransmitters[tx].sidebandPower.filter((_, i) => i !== sb - 1));
    expect(result.snapshot.effectiveTransmitters[other]).toEqual(before.effectiveTransmitters[other]);
  });
  it.each([1, 2, 3, 4] as const)("SB%s VSWR offset calibrates only its transmitter/channel", (sb) => {
    const config = createDefaultDvor1150aConfig();
    const before = buildDvor1150aSnapshot(config);
    const result = applyDvorConfigPatches(config, [{ fieldId: `transmitters.${tx}.offsets.sideband${sb}VswrOffset`, value: 0.5 }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.effectiveTransmitters[tx].sidebandVswr[sb - 1]).toBeCloseTo(config.transmitters[tx].vswr.sidebands[sb - 1] + 0.5);
    expect(result.snapshot.effectiveTransmitters[tx].sidebandVswr.filter((_, i) => i !== sb - 1)).toEqual(before.effectiveTransmitters[tx].sidebandVswr.filter((_, i) => i !== sb - 1));
    expect(result.snapshot.effectiveTransmitters[other]).toEqual(before.effectiveTransmitters[other]);
  });
});

describe.each(["mon1", "mon2"] as const)("1150A integral calibration controls (%s)", (mon) => {
  const other = mon === "mon1" ? "mon2" : "mon1";
  it.each([
    ["azimuthOffset", 2, "azimuth"],
    ["hz30ModulationScale", 80, "hz30Modulation"],
    ["hz9960ModulationScale", 80, "hz9960Modulation"],
    ["deviationScale", 80, "deviation"],
    ["rfLevelOffset", 3, "rfLevel"],
    ["identModulationScale", 80, "identModulation"],
    ["txPowerScale", 80, "txPower"],

    ["txFrequencyErrorOffset", 5, "txFrequencyError"],
    ["notchScale", 80, "notchMonitor"],
  ] as const)("%s affects %s without altering the other monitor or transmitter", (key, value, measurement) => {
    const config = createDefaultDvor1150aConfig();
    const before = buildDvor1150aSnapshot(config);
    const result = applyDvorConfigPatches(config, [{ fieldId: `monitor.calibration.${mon}.${key}`, value }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.monitors[mon].parameters[measurement].value).not.toBe(before.monitors[mon].parameters[measurement].value);
    expect(result.snapshot.monitors[other]).toEqual(before.monitors[other]);
    expect(result.snapshot.effectiveTransmitters).toEqual(before.effectiveTransmitters);
  });
  it.each(["odd", "even"] as const)("%s return loss remains stored without an unverified PMDT transfer", (parity) => {
    const config = createDefaultDvor1150aConfig();
    const before = buildDvor1150aSnapshot(config);
    const result = applyDvorConfigPatches(config, [{ fieldId: `monitor.calibration.${mon}.${parity}AntennaReturnLossOffset`, value: 0.5 }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    result.snapshot.monitors[mon].sidebandVswr.forEach((value, i) => {
      const old = before.monitors[mon].sidebandVswr[i];
      expect(value).toBe(old);
    });
    expect(result.snapshot.monitors[other]).toEqual(before.monitors[other]);
    expect(result.snapshot.effectiveTransmitters).toEqual(before.effectiveTransmitters);
  });
});

it("keeps the complete default catalog finite, valid and uniquely addressable", () => {
  const config = createDefaultDvor1150aConfig();
  expect(new Set(dvorConfigFieldCatalog.map(f => f.id)).size).toBe(dvorConfigFieldCatalog.length);
  expect(validateDvorConfig(config)).toEqual([]);
  for (const field of dvorConfigFieldCatalog) expect(getDvorConfigValue(config, field.id), field.id).not.toBeNull();
  if (process.env.CNS_NATIVE_INVENTORY_PATH) {
    writeFileSync(process.env.CNS_NATIVE_INVENTORY_PATH, JSON.stringify({
      moduleId: "dvor-1150a", schemaVersion: 1, catalogCount: dvorConfigFieldCatalog.length,
      fields: dvorConfigFieldCatalog.map(field => ({ ...field, defaultValue: getDvorConfigValue(config, field.id) })),
      scope: "Actual candidate catalog; coverage/effect limitations are in native-test-matrix.md, not implied by field presence.",
    }, null, 2));
  }
});
