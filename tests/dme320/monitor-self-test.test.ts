import { describe, expect, it } from "vitest";
import {
  createDme320SimulationState,
  executeDme320Command,
} from "@/modules/operations/dme-320/domain/engine";

describe("DME 320 monitor built-in self-test status", () => {
  it("publishes the manual-defined readings and independent normal/erroneous results", () => {
    const state = createDme320SimulationState({ nowMs: 12_000 });

    expect(state.monitors.mon1.selfTest).toMatchObject({
      timeDelayUs: 50,
      pulseSpacingUs: 12,
      normalResult: "normal",
      erroneousResult: "normal",
      pulseRiseUs: 2.5,
      pulseDurationUs: 3.5,
      pulseDecayUs: 2.5,
      updatedAtMs: 12_000,
    });
    expect(state.monitors.mon2.selfTest).toEqual(state.monitors.mon1.selfTest);
  });

  it("reports a monitor or self-test generator fault without starting a fake user-run workflow", () => {
    let state = createDme320SimulationState();
    let result = executeDme320Command(state, {
      type: "inject-fault",
      fault: { id: "mon1-bite", kind: "monitor-failure", target: "mon1" },
    });
    expect(result.accepted).toBe(true);
    state = result.state;
    expect(state.monitors.mon1.selfTest).toMatchObject({
      normalResult: "alarm",
      erroneousResult: "alarm",
    });
    expect(state.monitors.mon2.selfTest.normalResult).toBe("normal");

    result = executeDme320Command(state, {
      type: "clear-fault",
      faultId: "mon1-bite",
    });
    expect(result.accepted).toBe(true);
    state = result.state;
    expect(state.monitors.mon1.selfTest.normalResult).toBe("normal");

    result = executeDme320Command(state, {
      type: "inject-fault",
      fault: { id: "mon2-rfg", kind: "rfg-failure", target: "mon2" },
    });
    expect(result.accepted).toBe(true);
    expect(result.state.monitors.mon2.selfTest).toMatchObject({
      normalResult: "alarm",
      erroneousResult: "alarm",
    });
  });
});
