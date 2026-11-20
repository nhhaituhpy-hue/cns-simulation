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
import { getDvor1150SynthesizerSwitches } from "@/lib/dvor1150/config-utils";
import { dvor1150AdStatus } from "@/lib/dvor1150/engine";
import { parseDvor1150Config } from "@/lib/simulator-config/dvor-1150";

describe("DVOR 1150 configuration and PMDT engine", () => {
  it.each([[108, "10000000"], [108.05, "01000000"], [112.1, "11001010"],
    [117.95, "00010011"]] as const)("maps %s MHz to the Rev. K S1 switch order", (frequency, expected) => {
    expect(getDvor1150SynthesizerSwitches(frequency)?.map(Number).join("")).toBe(expected);
  });

  it("rejects off-channel drafts and updates carrier and sidebands on Apply", () => {
    const store = createDvor1150PmdtStore();
    const state = store.getState();
    state.login("SEC3", "THREE");
    state.setLocalMode(true);
    state.setConfigValue("station.frequencyMHz", 112.125);
    expect(state.applyConfigChanges()).toBe(false);
    expect(getDvor1150SynthesizerSwitches(112.125)).toBeNull();
    expect(store.getState().derived.effectiveTransmitters.tx1.carrierFrequency).toBe(112.1);
    state.setConfigValue("station.frequencyMHz", 113.85);
    expect(state.applyConfigChanges()).toBe(true);
    const { derived } = store.getState();
    expect(derived.effectiveTransmitters.tx1.carrierFrequency).toBe(113.85);
    expect(derived.effectiveTransmitters.tx1.lowerSidebandFrequency).toBeCloseTo(113.84004);
    expect(derived.effectiveTransmitters.tx1.upperSidebandFrequency).toBeCloseTo(113.85996);
    expect(derived.activeTransmitter).toBe("tx1");
  });

  it("migrates the legacy second 12 V rail with ordered signed limits", () => {
    const old = cloneDvor1150Config(defaultDvor1150Config);
    old.rms.adLimits.tx2.plus12VLogic = { low: 11, preLow: 11.8, preHigh: 12.4, high: 12.8 };
    const migrated = parseDvor1150Config(old)!;
    expect(old.rms.adLimits.tx2.plus12VLogic.low).toBe(11);
    expect(migrated.rms.adLimits.tx2.plus12VLogic).toEqual({ low: -12.8, preLow: -12.4, preHigh: -11.8, high: -11 });
    expect(parseDvor1150Config(migrated)).toEqual(migrated);
    const rows = buildDvor1150Snapshot(migrated).data.adDataByTransmitter;
    for (const id of ["tx1", "tx2"] as const) {
      expect(rows[id].find((row) => row.parameter === "-12 VDC")?.value).toBeCloseTo(-12);
      expect(rows[id].find((row) => row.parameter === "+12 VDC")?.value).toBeCloseTo(12);
    }
  });

  it.each(["rms.adLimits.tx1.plus12VLogic", "rms.adLimits.temperature.tx1"])(
    "%s can raise RMS maintenance status without moving the RF route", (prefix) => {
      const store = createDvor1150PmdtStore();
      const state = store.getState();
      state.login("SEC3", "THREE");
      state.setLocalMode(true);
      const temperature = prefix.includes("temperature");
      [temperature ? 19 : -11.95, temperature ? 20 : -11.9, temperature ? 22 : -11.8, temperature ? 23 : -11.7]
        .forEach((value, index) => state.setConfigValue(`${prefix}.${["low", "preLow", "preHigh", "high"][index]}`, value));
      expect(state.applyConfigChanges()).toBe(true);
      const { derived } = store.getState();
      const row = temperature ? derived.data.temperatureData[1] : derived.data.adDataByTransmitter.tx1[2];
      expect(dvor1150AdStatus(row)).toBe("red");
      expect(derived.data.rmsStatus.maintenanceAlert).toBe(true);
      expect(derived.activeTransmitter).toBe("tx1");
      expect(derived.transfer.cause).toBe("none");
    },
  );

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
    expect(snapshot.monitors.mon1.parameters.rfLevel.value).toBeCloseTo(0.2 + 10 * Math.log10(0.7), 3);
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
    expect(store.getState().derived.effectiveTransmitters.tx2.outputPower).toBe(80);
    expect(store.getState().config.simulation).toMatchObject({ connected: true, local: true, integralMonitorBypass: true });
    expect(store.getState().connectionType).toBe("direct");
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
    expect(mon1.parameters.hz9960Modulation.value).toBeCloseTo(31 * Math.sqrt(1.2), 2);
    expect(mon1.parameters.deviation.value).toBeCloseTo(17.294, 3);
    expect(mon1.parameters.rfLevel.value).toBeCloseTo(0.2 + 10 * Math.log10(1.2), 2);
    expect(mon2.parameters.rfLevel.value).toBeCloseTo(mon1.parameters.rfLevel.value, 5);
  });

  it("models carrier power and carrier-sideband phase at the 9960 Hz monitor", () => {
    const outputPower = cloneDvor1150Config(defaultDvor1150Config);
    outputPower.transmitters.tx1.nominal.outputPower = 110;

    const nominalPowerSnapshot = buildDvor1150Snapshot(outputPower);
    expect(nominalPowerSnapshot.monitors.mon1.parameters.hz9960Modulation.value).toBeCloseTo(30 * Math.sqrt(1.1), 2);

    const outputScale = cloneDvor1150Config(defaultDvor1150Config);
    outputScale.transmitters.tx1.offsets.outputPowerScale = 110;
    expect(buildDvor1150Snapshot(outputScale).monitors.mon1.parameters.hz9960Modulation.value).toBeCloseTo(30 * Math.sqrt(1.1), 2);

    outputPower.transmitters.tx1.offsets.carrierSidebandPhaseOffset = 90;
    expect(buildDvor1150Snapshot(outputPower).monitors.mon1.parameters.hz9960Modulation.value).toBeCloseTo(30.6 * Math.sqrt(1.1), 2);

    outputPower.transmitters.tx1.offsets.carrierSidebandPhaseOffset = -90;
    expect(buildDvor1150Snapshot(outputPower).monitors.mon1.parameters.hz9960Modulation.value).toBeCloseTo(29.4 * Math.sqrt(1.1), 2);
  });

  it("resets unapplied changes without touching running data, logs or backup", () => {
    const store = createDvor1150PmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 120);
    expect(store.getState().applyConfigChanges()).toBe(true);
    const applied = store.getState();
    applied.setConfigValue("transmitters.tx1.nominal.outputPower", 90);

    expect(store.getState().resetConfigDraft()).toBe(true);
    const state = store.getState();
    expect(state.configDraft.transmitters.tx1.nominal.outputPower).toBe(120);
    expect(state.config).toBe(applied.config);
    expect(state.derived).toBe(applied.derived);
    expect(state.configurationBackup).toBe(applied.configurationBackup);
    expect(state.parameterChangeLogs).toBe(applied.parameterChangeLogs);
    expect(state.needBackup).toBe(true);
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

    state.setConfigValue("transmitters.tx1.nominal.outputPower", 90);
    expect(state.resetConfigDraft()).toBe(true);
    expect(store.getState().configDraft.transmitters.tx1.nominal.outputPower).toBe(100);
    expect(state.restoreConfig()).toBe(false);
    expect(state.restoreScenario()).toBe(true);
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
