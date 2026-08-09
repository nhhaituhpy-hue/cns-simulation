import { describe, expect, it } from "vitest";
import {
  createDme320SimulationState,
  executeDme320Command,
} from "@/modules/operations/dme-320/domain/engine";
import type {
  Dme320Command,
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
  return accept(state, { type: "set-keylock", mode: "MAINT" });
}

describe("DME 320 TXP advanced controls", () => {
  it("starts every transponder in the operational defaults from Figure 4-114", () => {
    const state = createDme320SimulationState();

    expect(state.equipmentResetRevision).toBe(0);
    expect(state.transmitters.tx1).toMatchObject({
      squitterEnabled: true,
      identKeying: "on",
      rfLoopbackEnabled: false,
      spacingOffsetUs: 0,
    });
    expect(state.transmitters.tx2).toMatchObject({
      squitterEnabled: true,
      identKeying: "on",
      rfLoopbackEnabled: false,
      spacingOffsetUs: 0,
    });
  });

  it("requires local level-3 MAINT access and applies controls to live readings", () => {
    let state = createDme320SimulationState();
    state = accept(state, {
      type: "login",
      userId: "Administrator",
      password: "1234",
      origin: "local",
    });

    const denied = executeDme320Command(state, {
      type: "set-transponder-squitter",
      transponderId: "tx1",
      enabled: false,
    });
    expect(denied.accepted).toBe(false);
    expect(denied.message).toContain("MAINT keylock");

    state = accept(state, { type: "set-keylock", mode: "MAINT" });
    const nominalSpacing = Number(
      state.monitors.mon1.channels.executive.readings.pulseSpacingUs.value,
    );

    state = accept(state, {
      type: "set-transponder-squitter",
      transponderId: "tx1",
      enabled: false,
    });
    expect(
      state.monitors.mon1.channels.executive.readings.transmissionRatePps.value,
    ).toBe(0);

    state = accept(state, {
      type: "set-transponder-ident-keying",
      transponderId: "tx1",
      mode: "off",
    });
    expect(state.monitors.mon1.channels.executive.readings.identCode.value).toBe("");

    state = accept(state, {
      type: "set-transponder-rf-loopback",
      transponderId: "tx1",
      enabled: true,
    });
    expect(state.transmitters.tx1.rfLoopbackEnabled).toBe(true);

    state = accept(state, {
      type: "set-transponder-spacing-offset",
      transponderId: "tx1",
      offsetUs: 0.6,
    });
    expect(
      state.monitors.mon1.channels.executive.readings.pulseSpacingUs.value,
    ).toBeCloseTo(nominalSpacing + 0.6, 8);

    state = accept(state, {
      type: "set-transponder-ident-keying",
      transponderId: "tx1",
      mode: "continuous",
    });
    expect(
      state.monitors.mon1.channels.executive.readings.transmissionRatePps.value,
    ).toBe(1_350);
    expect(
      state.monitors.mon1.channels.executive.readings.replyEfficiencyPct.value,
    ).toBe(0);
  });

  it("rejects a non-finite spacing offset and restores defaults on reboot", () => {
    let state = enterMaintenance();
    const rejected = executeDme320Command(state, {
      type: "set-transponder-spacing-offset",
      transponderId: "tx1",
      offsetUs: Number.NaN,
    });
    expect(rejected.accepted).toBe(false);
    expect(rejected.state).toBe(state);

    state = accept(state, {
      type: "set-transponder-squitter",
      transponderId: "tx1",
      enabled: false,
    });
    state = accept(state, {
      type: "set-transponder-ident-keying",
      transponderId: "tx1",
      mode: "continuous",
    });
    state = accept(state, {
      type: "set-transponder-rf-loopback",
      transponderId: "tx1",
      enabled: true,
    });
    state = accept(state, {
      type: "set-transponder-spacing-offset",
      transponderId: "tx1",
      offsetUs: 0.6,
    });

    state = accept(state, { type: "reboot" });
    expect(state.equipmentResetRevision).toBe(1);
    expect(state.transmitters.tx1).toMatchObject({
      squitterEnabled: true,
      identKeying: "on",
      rfLoopbackEnabled: false,
      spacingOffsetUs: 0,
    });
  });
});
