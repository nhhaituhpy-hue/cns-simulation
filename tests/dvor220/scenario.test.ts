import { describe, expect, it } from "vitest";

import { reduceDvor220Command } from "@/modules/operations/dvor-220/domain/commands";
import {
  advanceDvor220Time,
  deriveDvor220Snapshot,
} from "@/modules/operations/dvor-220/domain/engine";
import {
  createCarrierAnd9960DegradationScenario,
  createDefaultDvor220ScenarioDefinition,
  evaluateDvor220Scenario,
  parseDvor220ScenarioDefinition,
} from "@/modules/operations/dvor-220/domain/scenario";
import { createAuthorizedDvor220State } from "./helpers";

const nominalTx1Settings = {
  carrierScalePercent: 100,
  sidebandPowerW: {
    usbCos: 1,
    usbSin: 1,
    lsbCos: 1,
    lsbSin: 1,
  },
  trackingEnabled: false,
};

describe("MOPIENS DVOR 220 training scenarios", () => {
  it("creates a correctable carrier and 9960 Hz degradation", () => {
    const scenario = createCarrierAnd9960DegradationScenario();
    let state = createAuthorizedDvor220State({ nowMs: 0 });

    const started = reduceDvor220Command(state, {
      type: "apply-scenario",
      scenario,
    });
    expect(started.ok).toBe(true);
    state = advanceDvor220Time(started.state, 200);

    let snapshot = deriveDvor220Snapshot(state);
    expect(snapshot.pdc.carrierPowerW).toBe(50);
    expect(snapshot.monitors.mon1.channels.cha.readings.am9960Hz.value).toBe(24);
    expect(snapshot.serviceStatus).toBe("alarm");
    expect(evaluateDvor220Scenario(state, snapshot)).toMatchObject({
      solved: false,
      correctable: true,
    });

    const corrected = reduceDvor220Command(state, {
      type: "apply-transmitter-helper",
      transmitterIds: ["tx1"],
      settings: nominalTx1Settings,
    });
    expect(corrected.ok).toBe(true);
    state = advanceDvor220Time(corrected.state, 200);
    snapshot = deriveDvor220Snapshot(state);

    expect(snapshot.pdc.carrierPowerW).toBe(100);
    expect(snapshot.monitors.mon1.channels.cha.readings.am9960Hz.value).toBe(30);
    expect(snapshot.serviceStatus).toBe("normal");
    expect(evaluateDvor220Scenario(state, snapshot).solved).toBe(true);
  });

  it("blocks every non-volatile transmitter save while a scenario is active", () => {
    let state = createAuthorizedDvor220State({ nowMs: 0 });
    state = reduceDvor220Command(state, {
      type: "apply-scenario",
      scenario: createCarrierAnd9960DegradationScenario(),
    }).state;
    state = reduceDvor220Command(state, {
      type: "apply-transmitter-helper",
      transmitterIds: ["tx1"],
      settings: nominalTx1Settings,
    }).state;
    const flashBeforeSave = structuredClone(state.configuration.flash);

    const helperSave = reduceDvor220Command(state, {
      type: "save-transmitter-helper",
      transmitterIds: ["tx1"],
    });
    const profileSave = reduceDvor220Command(state, { type: "save-profile" });

    expect(helperSave).toMatchObject({
      ok: false,
      error: expect.stringContaining("session-only training scenario"),
    });
    expect(profileSave).toMatchObject({
      ok: false,
      error: expect.stringContaining("session-only training scenario"),
    });
    expect(helperSave.state.configuration.flash).toEqual(flashBeforeSave);
    expect(profileSave.state.configuration.flash).toEqual(flashBeforeSave);
  });

  it("restores the scenario baseline and ends at the TST defaults", () => {
    let state = createAuthorizedDvor220State({ nowMs: 0 });
    state = reduceDvor220Command(state, {
      type: "apply-scenario",
      scenario: createCarrierAnd9960DegradationScenario(),
    }).state;
    state = reduceDvor220Command(state, {
      type: "apply-transmitter-helper",
      transmitterIds: ["tx1"],
      settings: nominalTx1Settings,
    }).state;

    const restored = reduceDvor220Command(state, { type: "restart-scenario" });
    expect(restored.ok).toBe(true);
    expect(restored.state.configuration.running.transmitters.tx1).toMatchObject({
      carrierScalePercent: 50,
      sidebandPowerW: {
        usbCos: 0.32,
        usbSin: 0.32,
        lsbCos: 0.32,
        lsbSin: 0.32,
      },
    });

    const ended = reduceDvor220Command(restored.state, { type: "end-scenario" });
    expect(ended.ok).toBe(true);
    expect(ended.state.scenario.active).toBe(false);
    expect(ended.state.configuration.running.station).toMatchObject({
      stationName: "Đài TEST",
      identCode: "TST",
      carrierPowerW: 100,
    });
  });

  it("round-trips valid JSON and marks raw monitor overrides as non-correctable", () => {
    const scenario = createDefaultDvor220ScenarioDefinition();
    scenario.runtime.measurementOverrides.push({
      monitorId: "mon1",
      channelId: "cha",
      parameter: "am9960Hz",
      value: 12,
    });

    const parsed = parseDvor220ScenarioDefinition(
      JSON.parse(JSON.stringify(scenario)) as unknown,
    );
    expect(parsed).toEqual(scenario);

    const started = reduceDvor220Command(createAuthorizedDvor220State(), {
      type: "apply-scenario",
      scenario: parsed!,
    });
    const evaluation = evaluateDvor220Scenario(started.state);

    expect(evaluation.correctable).toBe(false);
    expect(evaluation.solved).toBe(false);
    expect(evaluation.blockers).toEqual([
      "Forced Monitor overrides are active and can hide PMDT corrections.",
    ]);
  });
});
