import { describe, expect, it } from "vitest";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { createDefaultDvor1150aConfig } from "@/lib/dvor1150a";

function timed() {
  const store = createVorPmdtStore();
  store.getState().login("SEC3", "THREE");
  store.getState().setConfigValue("simulation.local", true);
  // A single CCA's fault must request transfer only under OR voting.
  store.getState().setConfigValue("monitor.votingLogic", "OR");
  return store;
}

it("does not share mutable alarm-limit defaults across station instances", () => {
  const one = createDefaultDvor1150aConfig();
  one.monitor.alarmLimits.txPower.alarmLow = 1;
  expect(createDefaultDvor1150aConfig().monitor.alarmLimits.txPower.alarmLow).toBe(50);
});

describe("1150A monitor delay qualification", () => {
  it("retains measured alarm immediately but transfers only after the configured shutdown delay", () => {
    const store = timed();
    store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 70);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().derived.monitors.mon1.parameters.hz30Modulation.status).toBe("alarm");
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    store.getState().advanceMonitorTime(4.9);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    store.getState().advanceMonitorTime(0.1);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
  });
  it.each([["No Ident", "noIdent"], ["Continuous Ident", "continuousIdent"]] as const)("qualifies %s for its own timer before shutdown delay", (status, timer) => {
    const store = timed();
    store.getState().setConfigValue(`monitor.timers.${timer}`, 2);
    store.getState().setConfigValue("monitor.timers.shutdown", 1);
    store.getState().setConfigValue("monitor.rawMeasurements.mon1.identStatus", status);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().derived.monitors.mon1.parameters.identStatus.value).toBe(status);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    store.getState().advanceMonitorTime(1.9);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    store.getState().advanceMonitorTime(0.1);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    store.getState().advanceMonitorTime(1);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
  });
  it("does not credit elapsed time from a different alarm source", () => {
    const store = timed();
    store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 70);
    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().advanceMonitorTime(4);
    store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 100);
    store.getState().setConfigValue("monitor.calibration.mon1.rfLevelOffset", 15);
    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().advanceMonitorTime(1);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
  });
  it("does not carry bypassed alarm duration into release", () => {
    const store = timed();
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 70);
    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().advanceMonitorTime(100);
    store.getState().setConfigValue("simulation.integralMonitorBypass", false);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    store.getState().advanceMonitorTime(5);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
  });
  it("qualifies secondary alarm protection under on Any Alarm without confusing yellow pre-alarm with an alarm", () => {
    const store = timed();
    store.getState().setConfigValue("monitor.transfer", "on Any Alarm");
    store.getState().setConfigValue("monitor.routing.rfLevel.secondary", true);
    store.getState().setConfigValue("monitor.calibration.mon1.rfLevelOffset", 15);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().derived.monitors.mon1.parameters.rfLevel.indicator).toBe("yellow");
    store.getState().advanceMonitorTime(5);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
  });

  it("does not shorten an AND ident timer using a different single-CCA alarm", () => {
    const store = timed();
    store.getState().setConfigValue("monitor.votingLogic", "AND");
    store.getState().setConfigValue("monitor.timers.noIdent", 10);
    store.getState().setConfigValue("monitor.timers.shutdown", 1);
    store.getState().setConfigValue("monitor.rawMeasurements.mon1.identStatus", "No Ident");
    store.getState().setConfigValue("monitor.rawMeasurements.mon2.identStatus", "No Ident");
    store.getState().setConfigValue("monitor.calibration.mon1.rfLevelOffset", 15);
    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().advanceMonitorTime(1);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    store.getState().advanceMonitorTime(10);
    expect(store.getState().derived.voting.activeTransmitter).not.toBe("tx1");
  });

  it("resets a recovered condition's elapsed time and keeps bypassed alarms visible", () => {
    const store = timed();
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
    store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 70);
    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().advanceMonitorTime(100);
    expect(store.getState().derived.monitorAnnunciation.alarm).toBe(true);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 100);
    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().advanceMonitorTime(1);
    store.getState().setConfigValue("simulation.integralMonitorBypass", false);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
  });
});
