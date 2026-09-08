import { describe, expect, it } from "vitest";
import {
  createLowCarrierAnd9960Scenario,
  createReferenceModulationScenario,
  createSidebandVswrScenario,
  createTx1FaultChangeoverScenario,
  evaluateDvor1150aScenario,
  parseDvor1150aScenarioDefinition,
  previewDvor1150aScenario,
  validateDvor1150aScenarioDefinition,
} from "@/lib/dvor1150a";
import { defaultVorPmdtData } from "@/lib/vor-pmdt-defaults";
import { vorMenuStructure } from "@/lib/vor-menu-structure";
import {
  createVorPmdtStore,
  resolveVorField,
  resolveVorStatus,
} from "@/stores/vor-pmdt-store";

describe("VOR PMDT defaults", () => {
  it("keeps the documented table sizes and menu hierarchy", () => {
    expect(defaultVorPmdtData.generalAlerts).toHaveLength(15);
    expect(defaultVorPmdtData.monitorAgenAlerts).toHaveLength(8);
    expect(defaultVorPmdtData.alarmLogs).toHaveLength(20);
    expect(defaultVorPmdtData.maintenanceLogs).toHaveLength(20);
    expect(defaultVorPmdtData.integralData).toHaveLength(11);
    expect(defaultVorPmdtData.vswrData).toHaveLength(48);
    expect(defaultVorPmdtData.alarmLimits).toHaveLength(7);
    expect(defaultVorPmdtData.monitorOffsets).toHaveLength(12);
    expect(defaultVorPmdtData.txOffsets).toHaveLength(18);
    expect(vorMenuStructure).toHaveLength(8);

    const monitor1 = vorMenuStructure.find((group) => group.id === "monitor-1");
    const testSignal = monitor1?.items.find((item) =>
      item.id.endsWith("test-signal"),
    );
    const transmitters = vorMenuStructure.find(
      (group) => group.id === "transmitters",
    );
    const commands = transmitters?.items.find((item) =>
      item.id.endsWith("commands"),
    );

    expect(testSignal?.children).toHaveLength(8);
    expect(commands?.children?.map((item) => [item.label, item.enabled])).toEqual([
      ["Transfer", true],
      ["Transmitter 1", true],
      ["Transmitter 2", true],
      ["Transmitter Ident", true],
      ["Hold Commutator...", false],
    ]);
  });
});

describe("VOR PMDT store", () => {
  function enterMaintenanceMode(store: ReturnType<typeof createVorPmdtStore>) {
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    store.getState().setConfigValue("simulation.local", true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", true);
  }

  it("rejects shared Nominal atomically when the mirrored field is scenario-locked", () => {
    const store = createVorPmdtStore();
    enterMaintenanceMode(store);
    store.setState({
      scenario: {
        active: true,
        startedAt: null,
        definition: {
          ...store.getState().scenarioDraft,
          studentEditableFieldIds: ["transmitters.tx1.nominal.outputPower"],
        },
      },
    });
    const draft = store.getState().configDraft;
    store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 75, ["transmitters.tx2.nominal.outputPower"]);
    expect(store.getState().configDraft).toBe(draft);
    expect(store.getState().configDirty).toBe(false);
  });

  it("keeps transmitter-specific offsets independent", () => {
    const store = createVorPmdtStore();
    enterMaintenanceMode(store);
    const tx2Scale = store.getState().configDraft.transmitters.tx2.offsets.outputPowerScale;
    store.getState().setConfigValue("transmitters.tx1.offsets.outputPowerScale", 90);
    expect(store.getState().configDraft.transmitters.tx1.offsets.outputPowerScale).toBe(90);
    expect(store.getState().configDraft.transmitters.tx2.offsets.outputPowerScale).toBe(tx2Scale);
  });

  it("applies typed overlays without mutating the baseline", () => {
    const store = createVorPmdtStore();
    store.getState().setOverride("txPower.0.tx1", 0, "red");

    expect(
      resolveVorField(
        defaultVorPmdtData.txPower[0].tx1,
        "txPower.0.tx1",
        store.getState().overrides,
      ),
    ).toBe(0);
    expect(
      resolveVorStatus("green", "txPower.0.tx1", store.getState().overrides),
    ).toBe("red");
    expect(defaultVorPmdtData.txPower[0].tx1).toBe(98.8);
  });

  it("records student investigation visits and annotations", () => {
    const store = createVorPmdtStore({
      now: () => new Date("2026-07-16T10:00:00.000Z"),
      generateId: () => "event-1",
    });
    store.getState().initializeSession({
      mode: "student",
      scenarioId: "vor-loss-of-power",
      sessionKey: "exam-item-vor-1",
      userId: "student-user",
      studentName: "Nguyen Van A",
      workUnit: "Doi TSS",
    });
    store.getState().openView(
      "tx-data",
      "tx-data-main",
      ["Transmitters", "Data", "Transmitter Data"],
      "Transmitter Data",
    );
    store.getState().updateEventAnnotation("event-1", "Tx #1 mất công suất.");

    expect(store.getState().attemptEvents[0]).toMatchObject({
      viewId: "tx-data-main",
      annotation: "Tx #1 mất công suất.",
      visitedAt: "2026-07-16T10:00:00.000Z",
    });
  });

  it("lets an author mark the current PMDT view as a checkpoint", () => {
    const store = createVorPmdtStore({ generateId: () => "checkpoint-1" });
    store.getState().initializeSession({ mode: "author" });
    store.getState().openView(
      "rms-logs",
      "rms-logs-alarms",
      ["RMS", "Logs", "Alarms"],
      "Alarms",
    );
    store.getState().addCurrentViewAsCheckpoint(
      "Kiểm tra alarm liên quan đến transmitter.",
      20,
    );

    expect(store.getState().expectedCheckpoints).toEqual([
      expect.objectContaining({
        id: "checkpoint-1",
        viewId: "rms-logs-alarms",
        points: 20,
      }),
    ]);
  });

  it("records a student sidebar interaction and resulting color", () => {
    const store = createVorPmdtStore({
      now: () => new Date("2026-07-16T10:05:00.000Z"),
      generateId: () => "sidebar-event-1",
    });
    store.getState().initializeSession({ mode: "student" });
    store.getState().interactWithSidebar("local", "Local", true, "yellow");

    expect(store.getState().studentFieldStates).toEqual([
      { fieldId: "local", value: true, status: "yellow" },
    ]);
    expect(store.getState().attemptEvents[0]).toMatchObject({
      eventType: "sidebar",
      fieldId: "local",
      resultValue: true,
      resultStatus: "yellow",
      visitedAt: "2026-07-16T10:05:00.000Z",
    });
  });

  it("transfers once to the eligible standby transmitter and shows Main/Off/Antenna separately", () => {
    const store = createVorPmdtStore();
    enterMaintenanceMode(store);
    store.getState().setConfigValue("transmitters.tx1.nominal.voiceModulation", 30);

    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().derived.voting.transferRequested).toBe(false);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");

    store.getState().setConfigValue("simulation.integralMonitorBypass", false);

    expect(store.getState().config.transmitters.tx1.onAir).toBe(false);
    expect(store.getState().config.transmitters.tx2.onAir).toBe(true);
    expect(store.getState().configDraft.transmitters.tx2.onAir).toBe(true);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
    expect(store.getState().derived.monitors.mon1.parameters.txFrequencyError.value).toBe(0);
    expect(store.getState().derived.voting.transferRequested).toBe(false);
    expect(store.getState().derived.mainTransmitter).toBe("tx1");
    expect(store.getState().data.transmitters.tx1).toMatchObject({ main: "green", antenna: "gray", off: "red" });
    expect(store.getState().data.transmitters.tx2).toMatchObject({ main: "gray", antenna: "green" });
    expect(store.getState().lastCommand).toBe("Automatic monitor transfer to TX2");
  });

  it("transfers to standby when a single monitor calibration alarm persists after the route changes", () => {
    const store = createVorPmdtStore();
    enterMaintenanceMode(store);
    store.getState().setConfigValue("monitor.calibration.mon1.deviationScale", 70);

    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", false);

    expect(store.getState().derived.monitors.mon1.parameters.deviation.status).toBe("alarm");
    expect(store.getState().config.transmitters.tx1.onAir).toBe(false);
    expect(store.getState().config.transmitters.tx2.onAir).toBe(true);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
    expect(store.getState().lastCommand).toBe("Automatic monitor transfer to TX2");
  });

  it("turns both transmitters Off when the standby transmitter alarms too", () => {
    const store = createVorPmdtStore();
    enterMaintenanceMode(store);
    store.getState().setConfigValue("transmitters.tx1.nominal.voiceModulation", 30);
    store.getState().setConfigValue("transmitters.tx2.nominal.voiceModulation", 30);

    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", false);

    expect(store.getState().derived.voting.activeTransmitter).toBe(null);
    expect(store.getState().config.transmitters.tx1.enabled).toBe(false);
    expect(store.getState().config.transmitters.tx2.enabled).toBe(false);
    expect(store.getState().data.transmitters.tx1.off).toBe("red");
    expect(store.getState().data.transmitters.tx2.off).toBe("red");
    expect(store.getState().lastCommand).toBe("Automatic monitor shutdown: both transmitters off");
  });

  it("keeps the active transmitter in place when no eligible standby exists", () => {
    const store = createVorPmdtStore();
    enterMaintenanceMode(store);
    store.getState().setConfigValue("transmitters.tx1.nominal.voiceModulation", 30);
    store.getState().setConfigValue("transmitters.tx2.enabled", false);

    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", false);

    expect(store.getState().derived.voting.transferRequested).toBe(true);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");
    expect(store.getState().config.transmitters.tx1.onAir).toBe(true);
    expect(store.getState().config.transmitters.tx2.onAir).toBe(false);
  });

  it("rejects TX2 commands while the station is configured for one transmitter", () => {
    const store = createVorPmdtStore();
    enterMaintenanceMode(store);
    store.getState().setConfigValue("station.transmitterConfig", "Single Transmitter");

    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().derived.effectiveTransmitters.tx2.enabled).toBe(false);
    expect(store.getState().setTransmitterMode("tx2", "main")).toBe(false);
    expect(store.getState().config.transmitters.tx1.onAir).toBe(true);

    store.getState().setConfigValue("station.transmitterConfig", "Dual Transmitters");
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().setTransmitterMode("tx2", "main")).toBe(true);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx2");
  });

  it("validates and previews every built-in DVOR 1150A training scenario", () => {
    const scenarios = [
      createLowCarrierAnd9960Scenario(),
      createReferenceModulationScenario(),
      createSidebandVswrScenario(),
      createTx1FaultChangeoverScenario(),
    ];

    for (const scenario of scenarios) {
      expect(validateDvor1150aScenarioDefinition(scenario)).toEqual([]);
      expect(parseDvor1150aScenarioDefinition(JSON.parse(JSON.stringify(scenario)))).toEqual(scenario);

      const preview = previewDvor1150aScenario(scenario);
      expect(preview.snapshot.data.monitorIntegral.normal).toBe(false);
      expect(preview.config.simulation).toMatchObject({
        local: true,
        integralMonitorBypass: true,
      });
    }

    // All four branch amplitudes follow the scenario's 10 W / 70 W power ratio.
    expect(previewDvor1150aScenario(scenarios[0]).snapshot.monitors.mon1.parameters.hz9960Modulation.value).toBeCloseTo(29.6 * Math.sqrt(10 / 70), 5);
    expect(previewDvor1150aScenario(scenarios[1]).snapshot.monitors.mon1.parameters.hz30Modulation.value).toBeCloseTo(21.7, 1);
    expect(previewDvor1150aScenario(scenarios[2]).snapshot.monitors.mon1.parameters.sidebandVswr.status).toBe("alarm");
  });

  it("keeps a DVOR 1150A scenario session-only and restores its baseline with F8 semantics", () => {
    const store = createVorPmdtStore({ now: () => new Date("2026-08-26T09:00:00.000Z") });
    const scenario = createLowCarrierAnd9960Scenario();

    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    store.getState().setScenarioAuthoringEnabled(true);
    store.getState().replaceScenarioDraft(scenario);
    expect(store.getState().applyScenario()).toBe(true);

    let state = store.getState();
    expect(state.scenario.active).toBe(true);
    expect(state.config.transmitters.tx1.nominal.outputPower).toBe(10);
    expect(state.config.simulation).toMatchObject({ local: true, integralMonitorBypass: true });
    expect(state.needBackup).toBe(false);
    expect(evaluateDvor1150aScenario(state.scenario, state.derived, state.config).solved).toBe(false);

    state.setConfigValue("transmitters.tx1.nominal.outputPower", 70);
    expect(state.applyConfigChanges()).toBe(true);
    expect(store.getState().needBackup).toBe(false);
    store.getState().setConfigValue("simulation.integralMonitorBypass", false);
    state = store.getState();
    expect(evaluateDvor1150aScenario(state.scenario, state.derived, state.config).solved).toBe(true);

    expect(state.restoreDefaultConfig()).toBe(true);
    state = store.getState();
    expect(state.config.transmitters.tx1.nominal.outputPower).toBe(10);
    expect(state.config.simulation.integralMonitorBypass).toBe(true);
    expect(evaluateDvor1150aScenario(state.scenario, state.derived, state.config).solved).toBe(false);

    expect(state.endScenario()).toBe(true);
    state = store.getState();
    expect(state.scenario.active).toBe(false);
    expect(state.config.station.stationDescription).toBe("TST");
    expect(state.config.transmitters.tx1.nominal.outputPower).toBe(70);
    expect(state.config.simulation).toMatchObject({ local: false, integralMonitorBypass: false });
  });

  it("locks protected DVOR 1150A fields while allowing assigned recovery controls", () => {
    const store = createVorPmdtStore();
    const scenario = createSidebandVswrScenario();

    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    store.getState().setScenarioAuthoringEnabled(true);
    store.getState().replaceScenarioDraft(scenario);
    expect(store.getState().applyScenario()).toBe(true);

    store.getState().setConfigValue("monitor.sidebandVswr.alarm", 5);
    expect(store.getState().configDraft.monitor.sidebandVswr.alarm).toBe(3);
    expect(store.getState().lastCommand).toContain("Scenario control locked");

    store.getState().setConfigValue("transmitters.tx1.vswr.sidebands.0", 1.83);
    store.getState().setConfigValue("transmitters.tx1.vswr.sidebands.1", 1.83);
    store.getState().setConfigValue("transmitters.tx1.vswr.sidebands.2", 1.74);
    store.getState().setConfigValue("transmitters.tx1.vswr.sidebands.3", 1.83);
    expect(store.getState().applyConfigChanges()).toBe(true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", false);

    const state = store.getState();
    expect(evaluateDvor1150aScenario(state.scenario, state.derived, state.config).solved).toBe(true);
  });

  it("solves the DVOR 1150A carrier VSWR scenario by transferring service to TX2", () => {
    const store = createVorPmdtStore();
    const scenario = createTx1FaultChangeoverScenario();

    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    store.getState().setScenarioAuthoringEnabled(true);
    store.getState().replaceScenarioDraft(scenario);
    expect(store.getState().applyScenario()).toBe(true);
    expect(store.getState().derived.voting.activeTransmitter).toBe("tx1");

    expect(store.getState().selectMainTransmitter("tx2")).toBe(true);
    store.getState().setConfigValue("simulation.integralMonitorBypass", false);

    const state = store.getState();
    expect(state.derived.voting.activeTransmitter).toBe("tx2");
    expect(state.data.transmitters.tx1.off).toBe("red");
    expect(evaluateDvor1150aScenario(state.scenario, state.derived, state.config).solved).toBe(true);
  });
});
