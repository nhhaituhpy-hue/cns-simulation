import { describe, expect, it } from "vitest";
import {
  advanceDme320Simulation,
  createDme320SimulationState,
  executeDme320Command,
  previewDme320Scenario,
  rebaseChannelDependentMonitorLimits,
} from "@/modules/operations/dme-320/domain/engine";
import {
  DME320_BUILT_IN_SCENARIOS,
  createDefaultDme320ScenarioDefinition,
  createHardwareDme320Scenario,
  createLowPowerDme320Scenario,
  createPulseSpacingDme320Scenario,
  evaluateDme320Scenario,
  parseDme320ScenarioDefinition,
  setDme320ScenarioFault,
  setDme320ScenarioOverride,
  validateDme320ScenarioDefinition,
} from "@/modules/operations/dme-320/domain/scenario";
import type {
  Dme320Command,
  Dme320ScenarioDefinition,
  Dme320SimulationState,
} from "@/modules/operations/dme-320/domain/types";
import { DEFAULT_DME320_ACCOUNTS } from "@/modules/operations/dme-320/domain/defaults";

function run(state: Dme320SimulationState, command: Dme320Command) {
  const result = executeDme320Command(state, command);
  expect(result.accepted, result.message).toBe(true);
  return result.state;
}

function operator(level = 2) {
  const account = DEFAULT_DME320_ACCOUNTS.find((item) => item.level === level)!;
  return run(createDme320SimulationState(), {
    type: "login",
    userId: account.userId,
    password: account.password,
    origin: "local",
  });
}

describe("DME 320 scenario lifecycle and recovery", () => {
  it.each(DME320_BUILT_IN_SCENARIOS)(
    "round-trips and previews $label without mutating its definition",
    ({ create }) => {
      const definition = create();
      const copy = structuredClone(definition);
      expect(parseDme320ScenarioDefinition(JSON.parse(JSON.stringify(definition)))).toEqual(definition);
      const preview = previewDme320Scenario(definition);
      expect(preview.scenario.active).toBe(true);
      expect(definition).toEqual(copy);
    },
  );

  it("starts normally from the default preset and is not solved without an active scenario", () => {
    expect(evaluateDme320Scenario(createDme320SimulationState()).solved).toBe(false);
    expect(
      evaluateDme320Scenario(previewDme320Scenario(createDefaultDme320ScenarioDefinition())).solved,
    ).toBe(true);
  });

  it("recovers low power using ordinary PMDT setup and does not save scenario changes", () => {
    let state = run(operator(), { type: "apply-scenario", scenario: createLowPowerDme320Scenario() });
    const flash = structuredClone(state.config.flash);
    state = advanceDme320Simulation(state, 1000);
    const data = state.monitors.mon1.channels.executive;
    expect(data.readings.peakPowerWatts.value).toBe(400);
    expect(data.readings.erpDb.value).toBeCloseTo(10 * Math.log10(0.4));
    expect(state.serviceStatus).toBe("alarm");
    expect(evaluateDme320Scenario(state)).toMatchObject({ solved: false, correctable: true });
    const config = structuredClone(state.config.running);
    config.transmitters.tx1.outputPowerPercent = 100;
    state = run(state, { type: "set-draft-config", config });
    state = run(state, { type: "apply-draft" });
    expect(evaluateDme320Scenario(state).solved).toBe(true);
    expect(state.config.flash).toEqual(flash);
    expect(executeDme320Command(state, { type: "save-running-to-flash" })).toMatchObject({
      accepted: false,
      message: expect.stringContaining("session-only"),
      state,
    });
    expect(state.parameterChangeLogs).toEqual([]);
  });

  it("requires real correction rather than Bypass or switching to a healthy standby", () => {
    let state = run(operator(), { type: "apply-scenario", scenario: createLowPowerDme320Scenario() });
    expect(evaluateDme320Scenario(state).solved).toBe(false);
    state = run(state, { type: "changeover" });
    expect(state.serviceStatus).toBe("normal");
    expect(state.monitors.mon1.channels.standby.readings.peakPowerWatts.value).toBe(400);
    expect(evaluateDme320Scenario(state).solved).toBe(false);
  });

  it("repairs pulse spacing with level-3 maintenance then returns to LOCAL", () => {
    let state = run(operator(3), { type: "apply-scenario", scenario: createPulseSpacingDme320Scenario() });
    expect(state.monitors.mon1.channels.executive.readings.pulseSpacingUs.value).toBe(13);
    expect(evaluateDme320Scenario(state).solved).toBe(false);
    state = run(state, { type: "set-keylock", mode: "MAINT" });
    state = run(state, { type: "set-transponder-spacing-offset", transponderId: "tx1", offsetUs: 0 });
    expect(evaluateDme320Scenario(state).solved).toBe(false);
    state = run(state, { type: "set-keylock", mode: "LOCAL" });
    expect(evaluateDme320Scenario(state).solved).toBe(true);
  });

  it("keeps authored monitor limits fixed when a student corrects the delay offset", () => {
    const scenario = createDefaultDme320ScenarioDefinition();
    scenario.configuration.station.delayOffsetUs = 1;
    let state = run(operator(), { type: "apply-scenario", scenario });
    expect(evaluateDme320Scenario(state).solved).toBe(false);
    const referenceLimits = structuredClone(state.config.running.monitor.limits.timeDelayUs);
    const config = structuredClone(state.config.running);
    config.station.delayOffsetUs = 0;
    state = run(state, { type: "set-draft-config", config });
    state = run(state, { type: "apply-draft" });
    expect(state.config.running.monitor.limits.timeDelayUs).toEqual(referenceLimits);
    expect(state.monitors.mon1.channels.executive.readings.timeDelayUs.value).toBe(50);
    expect(evaluateDme320Scenario(state).solved).toBe(true);
  });

  it("clears a typed hardware fault and refuses success while a raw override is active", () => {
    let state = run(operator(), { type: "apply-scenario", scenario: createHardwareDme320Scenario() });
    expect(evaluateDme320Scenario(state).solved).toBe(false);
    state = run(state, { type: "clear-fault", faultId: state.faults[0].id });
    expect(evaluateDme320Scenario(state).solved).toBe(true);
    const key = { monitorId: "mon1", channel: "executive", parameter: "erpDb" } as const;
    state = run(state, { type: "inject-measurement", override: { ...key, value: 0 } });
    expect(evaluateDme320Scenario(state)).toMatchObject({ correctable: false, solved: false });
    state = run(state, { type: "clear-measurement", ...key });
    expect(evaluateDme320Scenario(state).solved).toBe(true);
  });

  it.each(["restart-scenario", "reset-system", "reboot"] as const)(
    "%s restores stimuli without losing the original profiles",
    (type) => {
      let state = operator();
      const original = structuredClone(state.config);
      state = run(state, { type: "apply-scenario", scenario: createLowPowerDme320Scenario() });
      const config = structuredClone(state.config.running);
      config.transmitters.tx1.outputPowerPercent = 100;
      state = run(state, { type: "load-running-config", config });
      const revision = state.equipmentResetRevision;
      state = run(state, { type });
      expect(state.config.running.transmitters.tx1.outputPowerPercent).toBe(40);
      expect(state.config.flash).toEqual(original.flash);
      expect(state.equipmentResetRevision).toBeGreaterThan(revision);
      expect(state.scenario.active).toBe(true);
      if (type === "reboot") expect(state.session.level).toBe(0);
      state = run(state, { type: "end-scenario" });
      expect(state.config).toEqual(original);
      expect(state.scenario.active).toBe(false);
    },
  );

  it("preserves unsaved Draft/Running/Flash and restores the initial profiles after replacing a scenario", () => {
    let state = operator();
    state.config.running.station.stationName = "Personal running";
    state.config.draft.station.stationName = "Unsaved draft";
    state.config.draftDirty = true;
    state.config.flashDirty = true;
    const original = structuredClone(state.config);
    const account = state.session.userId;
    state = run(state, { type: "apply-scenario", scenario: createLowPowerDme320Scenario() });
    state = run(state, { type: "apply-scenario", scenario: createHardwareDme320Scenario() });
    state = run(state, { type: "end-scenario" });
    expect(state.config).toEqual(original);
    expect(state.session.userId).toBe(account);
    expect(state.faults).toEqual([]);
    expect(state.measurementOverrides).toEqual([]);
    expect(state.logs.at(-1)?.message).toContain("previous");
  });

  it("routes TX2 to antenna, treats cold standby as intentional, and never skips a failed monitor", () => {
    const scenario = createDefaultDme320ScenarioDefinition();
    scenario.runtime.mainTransponder = "tx2";
    scenario.configuration.station.standbyMode = "cold";
    let state = run(operator(), { type: "apply-scenario", scenario });
    expect(state.transmitters.tx2.route).toBe("antenna");
    expect(state.transmitters.tx1.dcPower).toBe("off");
    expect(state.monitors.mon2.channels.executive.sourceTransponder).toBe("tx2");
    expect(evaluateDme320Scenario(state).solved).toBe(true);
    state = run(state, {
      type: "inject-fault",
      fault: { id: "bad-monitor", kind: "monitor-failure", target: "mon2" },
    });
    expect(evaluateDme320Scenario(state).solved).toBe(false);
  });

  it("applies power and thermal stimuli through the existing engine", () => {
    const scenario = createDefaultDme320ScenarioDefinition();
    scenario.runtime.acAvailable = false;
    scenario.runtime.batteries.battery1.connected = false;
    scenario.runtime.batteries.battery2.connected = false;
    let state = run(operator(), { type: "apply-scenario", scenario });
    expect(state.power.source).toBe("off");
    expect(state.serviceStatus).toBe("shutdown");
    scenario.runtime.acAvailable = true;
    scenario.runtime.temperaturesC.tx1 = 100;
    state = run(state, { type: "apply-scenario", scenario });
    expect(state.transmitters.tx1.shutdownCause).toBe("thermal");
    expect(evaluateDme320Scenario(state).solved).toBe(false);
  });

  it("rebases channel-dependent limits for a normal Y-channel authoring baseline", () => {
    const scenario = createDefaultDme320ScenarioDefinition();
    const previous = structuredClone(scenario.configuration);
    scenario.configuration.station.channel = { number: 45, suffix: "Y" };
    rebaseChannelDependentMonitorLimits(previous, scenario.configuration);
    const state = previewDme320Scenario(scenario);
    expect(state.monitors.mon1.channels.executive.readings.timeDelayUs.value).toBe(56);
    expect(state.monitors.mon1.channels.executive.readings.pulseSpacingUs.value).toBe(30);
    expect(evaluateDme320Scenario(state).solved).toBe(true);
  });

  it("isolates editor definitions from the running exercise and preserves equipment permissions", () => {
    const definition = createLowPowerDme320Scenario();
    const state = run(createDme320SimulationState(), { type: "apply-scenario", scenario: definition });
    definition.configuration.transmitters.tx1.outputPowerPercent = 99;
    expect(state.config.running.transmitters.tx1.outputPowerPercent).toBe(40);
    expect(executeDme320Command(state, { type: "apply-draft" }).accepted).toBe(false);
    expect(executeDme320Command(state, { type: "reset-system" }).accepted).toBe(false);
  });
});

describe("DME 320 scenario authoring validation", () => {
  const malformed: Array<[string, (scenario: Dme320ScenarioDefinition) => void]> = [
    [
      "blank ID",
      (s) => {
        s.id = " ";
      },
    ],
    [
      "invalid main TX",
      (s) => {
        s.runtime.mainTransponder = "tx9" as "tx1";
      },
    ],
    [
      "NaN runtime",
      (s) => {
        s.runtime.temperaturesC.tx1 = NaN;
      },
    ],
    [
      "invalid classification",
      (s) => {
        s.configuration.monitor.limits.erpDb.classification = "bad" as "primary";
      },
    ],
    [
      "invalid voting",
      (s) => {
        s.configuration.monitor.votingLogic = "bad" as "AND";
      },
    ],
    [
      "empty criteria",
      (s) => {
        for (const key of Object.keys(s.successCriteria) as Array<keyof typeof s.successCriteria>)
          s.successCriteria[key] = false;
      },
    ],
    [
      "incorrect fault target",
      (s) => {
        s.runtime.faults = [{ id: "bad", kind: "hpa-low-output", target: "mon1" }];
      },
    ],
    [
      "duplicate fault",
      (s) => {
        s.runtime.faults = [
          { id: "same", kind: "txu-failure", target: "tx1" },
          { id: "same", kind: "txu-failure", target: "tx2" },
        ];
      },
    ],
    [
      "wrong numeric override type",
      (s) => {
        s.runtime.measurementOverrides = [
          { monitorId: "mon1", channel: "executive", parameter: "erpDb", value: "12" },
        ];
      },
    ],
    [
      "wrong IDENT type",
      (s) => {
        s.runtime.measurementOverrides = [
          { monitorId: "mon1", channel: "executive", parameter: "identCode", value: 12 },
        ];
      },
    ],
    [
      "invalid IDENT nominal",
      (s) => {
        s.configuration.monitor.limits.identCode.nominal = "12345";
      },
    ],
  ];
  it.each(malformed)("rejects %s without changing live state", (_, mutate) => {
    const scenario = createDefaultDme320ScenarioDefinition();
    mutate(scenario);
    expect(parseDme320ScenarioDefinition(scenario)).toBeNull();
    const state = createDme320SimulationState();
    const result = executeDme320Command(state, { type: "apply-scenario", scenario });
    expect(result.accepted).toBe(false);
    expect(result.state).toBe(state);
  });

  it.each([null, [], {}, { runtime: {} }, "not JSON"])(
    "rejects incomplete definitions without throwing",
    (value) => {
      expect(parseDme320ScenarioDefinition(value)).toBeNull();
    },
  );

  it("accepts nullable bounds and trims metadata consistently", () => {
    const scenario = createDefaultDme320ScenarioDefinition();
    scenario.configuration.monitor.limits.erpDb.alarmLow = null;
    scenario.configuration.monitor.limits.peakPowerWatts.alarmHigh = 1500;
    scenario.id = "  test-id  ";
    scenario.description = "";
    expect(parseDme320ScenarioDefinition(scenario)).toMatchObject({ id: "test-id", description: "" });
    expect(validateDme320ScenarioDefinition(scenario)).toEqual([]);
  });

  it("updates/removes imported fault IDs and individual overrides without duplicating other channels", () => {
    const scenario = createHardwareDme320Scenario();
    setDme320ScenarioFault(scenario, "hpa-low-output", "tx1", false);
    expect(scenario.runtime.faults).toEqual([]);
    setDme320ScenarioFault(scenario, "hpa-low-output", "tx1", true);
    setDme320ScenarioFault(scenario, "hpa-low-output", "tx1", true);
    expect(scenario.runtime.faults).toHaveLength(1);
    const key = { monitorId: "mon1", channel: "executive", parameter: "erpDb" } as const;
    setDme320ScenarioOverride(scenario, { ...key, monitorId: "mon2" }, { value: -4 });
    setDme320ScenarioOverride(scenario, key, { value: -5 });
    setDme320ScenarioOverride(scenario, key, { value: -6 });
    expect(scenario.runtime.measurementOverrides).toHaveLength(2);
    setDme320ScenarioOverride(scenario, key, null);
    expect(scenario.runtime.measurementOverrides).toEqual([{ ...key, monitorId: "mon2", value: -4 }]);
    expect(parseDme320ScenarioDefinition(scenario)).not.toBeNull();
  });
});
