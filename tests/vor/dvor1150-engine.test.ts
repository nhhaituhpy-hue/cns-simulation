import { describe, expect, it } from "vitest";
import {
  buildDvor1150Snapshot,
  cloneDvor1150Config,
  createLowCarrierAnd9960Scenario,
  createSidebandVswrScenario,
  defaultDvor1150Config,
  evaluateDvor1150Scenario,
  parseDvor1150ScenarioDefinition,
  validateDvor1150ScenarioDefinition,
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
    expect(snapshot.monitors.mon1.parameters.rfLevel.value).toBeCloseTo(-1.631, 3);
  });

  it("keeps an imported On-Air/Load conflict deterministic and visible to validation", () => {
    const conflicting = cloneDvor1150Config(defaultDvor1150Config);
    conflicting.transmitters.tx1.onAir = true;
    conflicting.transmitters.tx1.load = true;

    const snapshot = buildDvor1150Snapshot(conflicting);

    expect(snapshot.effectiveTransmitters.tx1.onAir).toBe(true);
    expect(snapshot.effectiveTransmitters.tx1.load).toBe(false);
    expect(snapshot.data.transmitters.tx1).toMatchObject({ antenna: "green", load: "gray" });
    expect(snapshot.validation).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldId: "transmitters.tx1", severity: "warning" }),
    ]));
  });

  it("excludes an uninstalled Monitor 2 from a single-monitor station", () => {
    const config = cloneDvor1150Config(defaultDvor1150Config);
    config.monitor.offsets.mon2.deviation = 10;
    config.station.monitorConfig = "Single Monitor";

    const singleMonitor = buildDvor1150Snapshot(config);

    expect(singleMonitor.monitors.mon2.parameters.deviation.status).toBe("alarm");
    expect(singleMonitor.monitors.mon2).toMatchObject({
      healthy: false,
      controlling: false,
      commStatus: "gray",
    });
    expect(singleMonitor.data.monitorIntegral).toMatchObject({ normal: true, alarm: false });
    expect(singleMonitor.data.maintenanceAlerts).toEqual(expect.arrayContaining([
      { label: "Monitor Mismatch", indicator: "gray" },
    ]));

    config.station.monitorConfig = "Dual Monitors";
    const dualMonitor = buildDvor1150Snapshot(config);

    expect(dualMonitor.data.monitorIntegral).toMatchObject({ normal: false, alarm: true });
    expect(dualMonitor.data.maintenanceAlerts).toEqual(expect.arrayContaining([
      { label: "Monitor Mismatch", indicator: "yellow" },
    ]));
  });

  it("enforces transfer, Local-only configuration, backup and baseline restore semantics", () => {
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
    expect(store.getState().derived.effectiveTransmitters.tx2.outputPower).toBe(100);
    expect(store.getState().config.simulation.local).toBe(false);
    expect(store.getState().needBackup).toBe(false);
  });

  it("applies Field Detector calibration to the selected monitor after Apply", () => {
    const store = createDvor1150PmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    expect(store.getState().setMonitorBypass("mon1", true)).toBe(true);

    store.getState().setConfigValue("monitor.calibration.mon2.fieldDetector.azimuthAngleOffset", 0.03);
    store.getState().setConfigValue("monitor.calibration.mon2.fieldDetector.hz9960ModulationScale", 101.4);
    store.getState().setConfigValue("monitor.calibration.mon2.fieldDetector.hz9960DeviationScale", 120);
    expect(store.getState().derived.monitors.mon2.parameters.hz9960Modulation.value).toBeCloseTo(30, 2);

    expect(store.getState().applyConfigChanges()).toBe(true);
    const { monitors } = store.getState().derived;
    expect(monitors.mon1.parameters.hz9960Modulation.value).toBeCloseTo(30, 2);
    expect(monitors.mon2.parameters.azimuth.value).toBeCloseTo(360, 2);
    expect(monitors.mon2.parameters.azimuth.status).toBe("normal");
    expect(monitors.mon2.parameters.hz9960Modulation.value).toBeCloseTo(30.42, 2);
    expect(monitors.mon2.parameters.deviation.value).toBeCloseTo(19.2, 2);
  });

  it("propagates transmitter configuration through both monitor measurement paths after Apply", () => {
    const store = createDvor1150PmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    expect(store.getState().setMonitorBypass("mon1", true)).toBe(true);

    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 120);
    store.getState().setConfigValue("transmitters.tx1.nominal.referenceModulation", 31);
    store.getState().setConfigValue("transmitters.tx1.nominal.voiceModulation", 10);
    expect(store.getState().applyConfigChanges()).toBe(true);

    const { mon1, mon2 } = store.getState().derived.monitors;
    expect(mon1.parameters.hz30Modulation.value).toBeCloseTo(31, 2);
    expect(mon1.parameters.hz9960Modulation.value).toBeCloseTo(32.88, 2);
    expect(mon1.parameters.deviation.value).toBeCloseTo(17.294, 3);
    expect(mon1.parameters.rfLevel.value).toBeCloseTo(1.18, 2);
    expect(mon2.parameters.rfLevel.value).toBeCloseTo(mon1.parameters.rfLevel.value, 5);
  });

  it("models carrier power and carrier-sideband phase at the 9960 Hz monitor", () => {
    const outputPower = cloneDvor1150Config(defaultDvor1150Config);
    outputPower.transmitters.tx1.nominal.outputPower = 110;

    const nominalPowerSnapshot = buildDvor1150Snapshot(outputPower);
    expect(nominalPowerSnapshot.monitors.mon1.parameters.hz9960Modulation.value).toBeCloseTo(30.94, 2);

    const outputScale = cloneDvor1150Config(defaultDvor1150Config);
    outputScale.transmitters.tx1.offsets.outputPowerScale = 110;
    expect(buildDvor1150Snapshot(outputScale).monitors.mon1.parameters.hz9960Modulation.value).toBeCloseTo(30.94, 2);

    outputPower.transmitters.tx1.offsets.carrierSidebandPhaseOffset = 90;
    expect(buildDvor1150Snapshot(outputPower).monitors.mon1.parameters.hz9960Modulation.value).toBeCloseTo(31.54, 2);

    outputPower.transmitters.tx1.offsets.carrierSidebandPhaseOffset = -90;
    expect(buildDvor1150Snapshot(outputPower).monitors.mon1.parameters.hz9960Modulation.value).toBeCloseTo(30.34, 2);
  });

  it("restores Reset (F8) to Simulation Parameters baseline", () => {
    const store = createDvor1150PmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 120);
    expect(store.getState().applyConfigChanges()).toBe(true);

    expect(store.getState().resetConfigDraft()).toBe(true);
    const state = store.getState();
    expect(state.config.transmitters.tx1.nominal.outputPower).toBe(100);
    expect(state.config.monitor.calibration.mon1.fieldDetector.hz9960DeviationScale).toBe(100);
    expect(state.config.simulation.local).toBe(false);
    expect(state.needBackup).toBe(false);
    expect(state.derived.monitors.mon1.parameters.rfLevel.value).toBeCloseTo(0.2, 5);
  });

  it("keeps the logical Main on TX1 after a one-step automatic transfer to TX2", () => {
    const store = createDvor1150PmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    expect(store.getState().setMonitorBypass("mon1", true)).toBe(true);
    store.getState().setConfigValue("transmitters.tx1.nominal.voiceModulation", 30);
    expect(store.getState().applyConfigChanges()).toBe(true);

    expect(store.getState().setMonitorBypass("mon1", false)).toBe(true);
    const state = store.getState();
    expect(state.derived.activeTransmitter).toBe("tx2");
    expect(state.derived.mainTransmitter).toBe("tx1");
    expect(state.derived.data.transmitters.tx1).toMatchObject({ main: "green", antenna: "gray", off: "red" });
    expect(state.derived.data.transmitters.tx2).toMatchObject({ main: "gray", antenna: "green" });
  });

  it("turns both DVOR 1150 transmitters Off when the standby path also alarms", () => {
    const store = createDvor1150PmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    expect(store.getState().setMonitorBypass("mon1", true)).toBe(true);
    store.getState().setConfigValue("transmitters.tx1.nominal.voiceModulation", 30);
    store.getState().setConfigValue("transmitters.tx2.nominal.voiceModulation", 30);
    expect(store.getState().applyConfigChanges()).toBe(true);

    expect(store.getState().setMonitorBypass("mon1", false)).toBe(true);
    const state = store.getState();
    expect(state.derived.activeTransmitter).toBe(null);
    expect(state.config.transmitters.tx1.enabled).toBe(false);
    expect(state.config.transmitters.tx2.enabled).toBe(false);
    expect(state.lastCommand).toBe("Automatic monitor shutdown: both transmitters off");
  });

  it("keeps a loaded scenario session-only, restores it with F8 semantics, and ends at TST", () => {
    const scenario = createLowCarrierAnd9960Scenario();
    expect(validateDvor1150ScenarioDefinition(scenario)).toEqual([]);
    expect(parseDvor1150ScenarioDefinition(JSON.parse(JSON.stringify(scenario)))).toEqual(scenario);

    const store = createDvor1150PmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    store.getState().setScenarioAuthoringEnabled(true);
    store.getState().replaceScenarioDraft(scenario);
    expect(store.getState().applyScenario()).toBe(true);

    let state = store.getState();
    expect(state.scenario.active).toBe(true);
    expect(state.config.transmitters.tx1.nominal.outputPower).toBe(40);
    expect(state.config.simulation).toMatchObject({ local: true, integralMonitorBypass: true });
    expect(state.needBackup).toBe(false);
    expect(evaluateDvor1150Scenario(state.scenario, state.derived, state.config).solved).toBe(false);

    state.setConfigValue("transmitters.tx1.nominal.outputPower", 100);
    expect(state.applyConfigChanges()).toBe(true);
    expect(store.getState().needBackup).toBe(false);
    expect(store.getState().setMonitorBypass("mon1", false)).toBe(true);
    state = store.getState();
    expect(evaluateDvor1150Scenario(state.scenario, state.derived, state.config).solved).toBe(true);

    expect(state.resetConfigDraft()).toBe(true);
    state = store.getState();
    expect(state.config.transmitters.tx1.nominal.outputPower).toBe(40);
    expect(state.config.simulation.integralMonitorBypass).toBe(true);

    expect(state.endScenario()).toBe(true);
    state = store.getState();
    expect(state.scenario.active).toBe(false);
    expect(state.config.transmitters.tx1.nominal.outputPower).toBe(100);
    expect(state.config.simulation.local).toBe(false);
  });

  it("permits only assigned physical recovery controls and rejects monitor-limit bypasses", () => {
    const scenario = createSidebandVswrScenario();
    const store = createDvor1150PmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    store.getState().setScenarioAuthoringEnabled(true);
    store.getState().replaceScenarioDraft(scenario);
    expect(store.getState().applyScenario()).toBe(true);

    store.getState().setScenarioAuthoringEnabled(false);
    store.getState().setConfigValue("monitor.sidebandVswrExecutiveAlarm", false);
    let state = store.getState();
    expect(state.configDraft.monitor.sidebandVswrExecutiveAlarm).toBe(true);
    expect(state.lastCommand).toContain("Scenario control locked");
    expect(state.endScenario()).toBe(false);

    const bypassed = cloneDvor1150Config(state.config);
    bypassed.monitor.sidebandVswrExecutiveAlarm = false;
    bypassed.simulation.integralMonitorBypass = false;
    const bypassEvaluation = evaluateDvor1150Scenario(
      state.scenario,
      buildDvor1150Snapshot(bypassed),
      bypassed,
    );
    expect(bypassEvaluation.solved).toBe(false);
    expect(bypassEvaluation.blockers).toContain("Protected configuration changed: VSWR Executive Alarm.");

    state.setConfigValue("transmitters.tx1.offsets.sideband1RfLevelScale", 100);
    state.setConfigValue("transmitters.tx1.offsets.sideband2RfLevelScale", 100);
    expect(state.applyConfigChanges()).toBe(true);
    expect(store.getState().setMonitorBypass("mon1", false)).toBe(true);
    state = store.getState();
    expect(evaluateDvor1150Scenario(state.scenario, state.derived, state.config).solved).toBe(true);

    store.getState().setScenarioAuthoringEnabled(true);
    expect(store.getState().endScenario()).toBe(true);
  });
});
