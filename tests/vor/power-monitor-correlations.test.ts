import { describe, expect, it } from "vitest";
import { buildDvor1150aSnapshot, createDefaultDvor1150aConfig } from "@/lib/dvor1150a";

describe.each(["tx1", "tx2"] as const)("DVOR power/monitor correlations: %s", (tx) => {
  function baseline() {
    const config = createDefaultDvor1150aConfig();
    config.transmitters.tx1.onAir = tx === "tx1";
    config.transmitters.tx2.onAir = tx === "tx2";
    return config;
  }

  it("couples carrier scale to sidebands and logarithmic RF Level", () => {
    const config = baseline();
    const before = buildDvor1150aSnapshot(config);
    config.transmitters[tx].offsets.outputPowerScale *= 0.5;
    const after = buildDvor1150aSnapshot(config);
    expect(after.effectiveTransmitters[tx].sidebandPower[0]).toBeCloseTo(before.effectiveTransmitters[tx].sidebandPower[0] / 2);
    expect(Number(after.monitors.mon1.parameters.rfLevel.value) - Number(before.monitors.mon1.parameters.rfLevel.value)).toBeCloseTo(10 * Math.log10(0.5));
    expect(Number(after.monitors.mon1.parameters.hz9960Modulation.value)).toBeLessThan(Number(before.monitors.mon1.parameters.hz9960Modulation.value));
  });

  it("loses one quarter of recovered modulation with one RF branch, all with four", () => {
    const config = baseline();
    const before = buildDvor1150aSnapshot(config);
    const offsets = config.transmitters[tx].offsets;
    offsets.sideband1RfLevelScale = 0;
    const oneLost = buildDvor1150aSnapshot(config);
    expect(Number(oneLost.monitors.mon1.parameters.hz9960Modulation.value)).toBeCloseTo(Number(before.monitors.mon1.parameters.hz9960Modulation.value) * 0.75);
    expect(oneLost.monitors.mon1.parameters.rfLevel.value).toBe(before.monitors.mon1.parameters.rfLevel.value);
    expect(oneLost.data.txPower[0]).toEqual(before.data.txPower[0]);
    offsets.sideband2RfLevelScale = offsets.sideband3RfLevelScale = offsets.sideband4RfLevelScale = 0;
    expect(buildDvor1150aSnapshot(config).monitors.mon1.parameters.hz9960Modulation.value).toBe(0);
  });

  it("keeps inactive TX adjustments out of the monitor", () => {
    const config = baseline();
    const before = buildDvor1150aSnapshot(config);
    config.transmitters[tx === "tx1" ? "tx2" : "tx1"].offsets.outputPowerScale = 0;
    expect(buildDvor1150aSnapshot(config).monitors).toEqual(before.monitors);
  });

  it("calibrates monitors independently and annunciates warning/alarm during bypass", () => {
    const config = baseline();
    config.simulation.local = config.simulation.integralMonitorBypass = true;
    const before = buildDvor1150aSnapshot(config);
    config.monitor.calibration.mon2.hz30ModulationScale = 110;
    const warning = buildDvor1150aSnapshot(config);
    expect(warning.monitors.mon1).toEqual(before.monitors.mon1);
    expect(warning.monitorAnnunciation.preAlarm).toBe(true);
    expect(warning.data.alert).toBe(true);
    config.monitor.calibration.mon2.hz30ModulationScale = 150;
    const alarm = buildDvor1150aSnapshot(config);
    expect(alarm.monitorAnnunciation.alarm).toBe(true);
    expect(alarm.voting.transferRequested).toBe(false);
  });
});
