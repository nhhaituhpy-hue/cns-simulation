// @vitest-environment node
import { expect, it } from "vitest";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { createDefaultDvor1150aConfig } from "@/lib/dvor1150a";

it("does not carry a previous alarm's qualification into a loaded applied profile", () => {
  const store = createVorPmdtStore();
  expect(store.getState().login("SEC3", "THREE")).toBe(true);
  store.getState().setConfigValue("simulation.local", true);
  store.getState().setConfigValue("monitor.votingLogic", "OR");
  store.getState().setConfigValue("monitor.calibration.mon1.hz30ModulationScale", 70);
  expect(store.getState().applyConfigChanges()).toBe(true);
  store.getState().advanceMonitorTime(4.9);
  const profile = createDefaultDvor1150aConfig();
  profile.monitor.votingLogic = "OR";
  profile.monitor.calibration.mon1.rfLevelOffset = 15;
  store.getState().replaceConfig(profile);
  expect(store.getState().monitorElapsed).toBe(0);
  store.getState().advanceMonitorTime(0.1);
  expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
  store.getState().advanceMonitorTime(4.9);
  expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
});

it("does not replace same-source AND voting with unrelated post-transfer monitor alarms", () => {
  const store = createVorPmdtStore();
  expect(store.getState().login("SEC3", "THREE")).toBe(true);
  store.getState().setConfigValue("simulation.local", true);
  store.getState().setConfigValue("simulation.integralMonitorBypass", true);
  store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 125);
  store.getState().setConfigValue("monitor.rawMeasurements.mon1.rfLevel", 12);
  store.getState().setConfigValue("monitor.rawMeasurements.mon2.hz30Modulation", 20);
  expect(store.getState().applyConfigChanges()).toBe(true);
  expect(store.getState().config.monitor.votingLogic).toBe("AND");
  store.getState().setConfigValue("simulation.integralMonitorBypass", false);
  expect(store.getState().derived.voting.transferRequested).toBe(true);
  store.getState().advanceMonitorTime(5);
  expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
  expect(store.getState().derived.monitors.mon1.primaryAlarm).toBe(true);
  expect(store.getState().derived.monitors.mon2.primaryAlarm).toBe(true);
  expect(store.getState().derived.voting.transferRequested).toBe(false);
  store.getState().advanceMonitorTime(100);
  expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
});
