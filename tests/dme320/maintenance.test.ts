import { describe, expect, it } from "vitest";
import {
  createDme320SimulationState,
  executeDme320Command,
} from "@/modules/operations/dme-320/domain/engine";
import type {
  Dme320Command,
  Dme320ManualTestInput,
  Dme320SimulationState,
} from "@/modules/operations/dme-320/domain/types";

function accept(
  state: Dme320SimulationState,
  command: Dme320Command,
): Dme320SimulationState {
  const result = executeDme320Command(state, command);
  expect(result.accepted, result.message).toBe(true);
  return result.state;
}

function enterMaintenance(): Dme320SimulationState {
  let state = createDme320SimulationState();
  state = accept(state, {
    type: "login",
    userId: "Administrator",
    password: "1234",
    origin: "local",
  });
  state = accept(state, { type: "set-keylock", mode: "MAINT" });
  return state;
}

const passingManualInput: Dme320ManualTestInput = {
  monitorId: "mon1",
  transponderId: "tx1",
  interrogationLevelDbm: -80,
  interrogationPulseRatePps: 1_000,
  interrogationCount: 100,
  frequencyOffsetKhz: 0,
  spacingUs: 12,
};

describe("DME 320 calibration", () => {
  it("requires MAINT and enforces mandatory versus skippable steps", () => {
    let state = createDme320SimulationState();
    state = accept(state, {
      type: "login",
      userId: "Administrator",
      password: "1234",
      origin: "local",
    });

    const denied = executeDme320Command(state, {
      type: "start-calibration",
      transponderId: "tx1",
    });
    expect(denied.accepted).toBe(false);
    expect(denied.message).toContain("MAINT keylock");

    state = accept(state, { type: "set-keylock", mode: "MAINT" });
    state = accept(state, { type: "start-calibration", transponderId: "tx1" });

    const mandatorySkip = executeDme320Command(state, {
      type: "skip-calibration-step",
    });
    expect(mandatorySkip.accepted).toBe(false);
    expect(mandatorySkip.message).toContain("step 1 cannot be skipped");

    state = accept(state, { type: "run-calibration-step", measuredValue: 1 });
    expect(state.calibration.steps[0].status).toBe("passed");
    expect(state.calibration.currentStep).toBe(2);

    state = accept(state, { type: "skip-calibration-step" });
    expect(state.calibration.steps[1].status).toBe("skipped");
    expect(state.calibration.currentStep).toBe(3);
  });

  it("fails a calibration step deterministically when an injected component fault blocks it", () => {
    let state = enterMaintenance();
    state = accept(state, {
      type: "inject-fault",
      fault: { id: "hpa-cal", kind: "hpa-low-output", target: "tx1" },
    });
    state = accept(state, { type: "start-calibration", transponderId: "tx1" });
    state = accept(state, { type: "run-calibration-step", measuredValue: 1 });

    expect(state.calibration.status).toBe("failed");
    expect(state.calibration.steps[0]).toMatchObject({
      status: "failed",
      message: "Blocked by hpa-low-output.",
    });
  });
});

describe("DME 320 manual and certification tests", () => {
  it("calculates manual-test efficiency and reflects an RXU sensitivity fault", () => {
    let state = enterMaintenance();
    state = accept(state, { type: "run-manual-test", input: passingManualInput });

    expect(state.lastManualTest).toMatchObject({
      replyCount: 98,
      efficiencyPct: 98,
      passed: true,
    });

    state = accept(state, {
      type: "inject-fault",
      fault: { id: "rxu-test", kind: "rxu-sensitivity", target: "tx1" },
    });
    state = accept(state, { type: "run-manual-test", input: passingManualInput });

    expect(state.lastManualTest).toMatchObject({
      replyCount: 50,
      efficiencyPct: 50,
      passed: false,
    });
  });

  it("certifies only primary parameters and reports the configured action timing", () => {
    let state = enterMaintenance();
    const secondary = executeDme320Command(state, {
      type: "run-certification",
      monitorId: "mon1",
      parameter: "replyEfficiencyPct",
      testValue: 0,
    });
    expect(secondary.accepted).toBe(false);
    expect(secondary.message).toContain("primary alarm parameter");

    state = accept(state, {
      type: "run-certification",
      monitorId: "mon1",
      parameter: "timeDelayUs",
      testValue: 100,
    });
    expect(state.lastCertification).toMatchObject({
      monitorId: "mon1",
      parameter: "timeDelayUs",
      startAtMs: 0,
      alarmDetectedAtMs: 1_000,
      actionAtMs: 5_000,
      expectedActionDelayMs: 5_000,
      passed: true,
    });
  });
});
