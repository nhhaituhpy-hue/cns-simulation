import { describe, expect, it } from "vitest";
import { buildDvor1150Snapshot, cloneDvor1150Config, defaultDvor1150Config } from "@/lib/dvor1150";

describe("DVOR 1150 RF and monitor influence matrix", () => {
  it.each(["tx1", "tx2"] as const)("models branch loss independently of carrier/RF on %s", (tx) => {
    const config = cloneDvor1150Config(defaultDvor1150Config);
    config.transmitters.tx1.onAir = tx === "tx1";
    config.transmitters.tx2.onAir = tx === "tx2";
    const baseline = buildDvor1150Snapshot(config);
    config.transmitters[tx].offsets.sideband1RfLevelScale = 0;
    const lostOne = buildDvor1150Snapshot(config);
    expect(lostOne.monitors.mon1.parameters.hz9960Modulation.value).toBeCloseTo(22.5);
    expect(lostOne.monitors.mon1.parameters.rfLevel.value).toBe(baseline.monitors.mon1.parameters.rfLevel.value);
    expect(lostOne.effectiveTransmitters[tx].outputPower).toBe(100);
    config.transmitters[tx].offsets.sideband2RfLevelScale = 0;
    config.transmitters[tx].offsets.sideband3RfLevelScale = 0;
    config.transmitters[tx].offsets.sideband4RfLevelScale = 0;
    expect(buildDvor1150Snapshot(config).monitors.mon1.parameters.hz9960Modulation.value).toBe(0);
  });

  it("keeps PreAlarm visible without declaring a relay alarm", () => {
    const config = cloneDvor1150Config(defaultDvor1150Config);
    config.monitor.offsets.mon1.hz9960Modulation = 1.7;
    const snapshot = buildDvor1150Snapshot(config);
    expect(snapshot.monitorAnnunciation).toEqual({ preAlarm: true, alarm: false });
    expect(snapshot.data.alert).toBe(true);
    expect(snapshot.data.monitorIntegral.alarm).toBe(false);
  });

  it("annunciates an installed monitor alarm independently of voting and bypass", () => {
    const config = cloneDvor1150Config(defaultDvor1150Config);
    config.monitor.votingLogic = "OR";
    config.simulation.integralMonitorBypass = true;
    config.monitor.calibration.mon2.fieldDetector.hz9960ModulationScale = 120;
    const snapshot = buildDvor1150Snapshot(config);
    expect(snapshot.monitors.mon1.parameters.hz9960Modulation.value).toBe(30);
    expect(snapshot.monitors.mon2.parameters.hz9960Modulation.value).toBe(36);
    expect(snapshot.monitorAnnunciation.alarm).toBe(true);
    expect(snapshot.data.monitorIntegral.alarm).toBe(false);
    config.station.monitorConfig = "Single Monitor";
    expect(buildDvor1150Snapshot(config).monitorAnnunciation.alarm).toBe(false);
  });

  it("uses a low RF floor with no antenna transmitter", () => {
    const config = cloneDvor1150Config(defaultDvor1150Config);
    config.transmitters.tx1.onAir = false;
    const snapshot = buildDvor1150Snapshot(config);
    expect(snapshot.monitors.mon1.parameters.rfLevel.value).toBeCloseTo(-59.8);
    expect(snapshot.monitors.mon1.parameters.hz9960Modulation.value).toBe(0);
    expect(snapshot.monitorAnnunciation.alarm).toBe(true);
  });
});
