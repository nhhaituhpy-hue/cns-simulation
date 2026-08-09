import { describe, expect, it } from "vitest";
import { createDefaultDme320Config } from "@/modules/operations/dme-320/domain/defaults";
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

function createAutomaticState(votingLogic: "AND" | "OR" = "OR") {
  const config = createDefaultDme320Config();
  config.station.bypassMonitorsOnBoot = false;
  config.monitor.votingLogic = votingLogic;
  return createDme320SimulationState({ config });
}

function injectPrimaryTimeDelay(
  state: Dme320SimulationState,
  monitorId: "mon1" | "mon2",
): Dme320SimulationState {
  return accept(state, {
    type: "inject-measurement",
    override: {
      monitorId,
      channel: "executive",
      parameter: "timeDelayUs",
      value: 100,
    },
  });
}

function clearPrimaryTimeDelay(
  state: Dme320SimulationState,
  monitorId: "mon1" | "mon2",
): Dme320SimulationState {
  return accept(state, {
    type: "clear-measurement",
    monitorId,
    channel: "executive",
    parameter: "timeDelayUs",
  });
}

describe("DME 320 monitor alarm timing and voting", () => {
  it("moves an out-of-limit primary reading from pending to active after its delay", () => {
    let state = createAutomaticState();
    state = accept(state, { type: "advance-time", toMs: 2_000 });
    state = injectPrimaryTimeDelay(state, "mon1");

    expect(state.monitors.mon1.channels.executive.alarms.timeDelayUs).toMatchObject({
      phase: "pending",
      pendingSinceMs: 2_000,
    });

    state = accept(state, { type: "advance-time", toMs: 2_999 });
    expect(state.monitors.mon1.channels.executive.alarms.timeDelayUs.phase).toBe(
      "pending",
    );

    state = accept(state, { type: "advance-time", toMs: 3_000 });
    expect(state.monitors.mon1.channels.executive.alarms.timeDelayUs).toMatchObject({
      phase: "active",
      activeSinceMs: 3_000,
    });
    expect(state.monitorAction.votePendingSinceMs).toBe(3_000);
  });

  it("requires both monitor votes in AND mode before starting the action delay", () => {
    let state = createAutomaticState("AND");
    state = accept(state, { type: "advance-time", toMs: 2_000 });
    state = injectPrimaryTimeDelay(state, "mon1");
    state = accept(state, { type: "advance-time", toMs: 3_000 });

    expect(state.monitors.mon1.channels.executive.alarms.timeDelayUs.phase).toBe(
      "active",
    );
    expect(state.monitorAction.votePendingSinceMs).toBeNull();

    state = injectPrimaryTimeDelay(state, "mon2");
    state = accept(state, { type: "advance-time", toMs: 4_000 });
    expect(state.monitorAction.votePendingSinceMs).toBe(4_000);

    state = accept(state, { type: "advance-time", toMs: 7_999 });
    expect(state.monitorAction.automaticChangeovers).toBe(0);

    state = accept(state, { type: "advance-time", toMs: 8_000 });
    expect(state.monitorAction.automaticChangeovers).toBe(1);
    expect(state.transmitters.tx2.route).toBe("antenna");
  });

  it("shuts the system down on the second executive action instead of reviving the failed TX", () => {
    let state = createAutomaticState("OR");
    state = accept(state, { type: "advance-time", toMs: 2_000 });
    state = injectPrimaryTimeDelay(state, "mon1");
    state = accept(state, { type: "advance-time", toMs: 3_000 });
    state = accept(state, { type: "advance-time", toMs: 7_000 });

    expect(state.monitorAction.automaticChangeovers).toBe(1);
    expect(state.transmitters.tx1).toMatchObject({
      route: "load",
      shutdown: true,
      shutdownCause: "monitor",
      dcPower: "off",
      rfEnabled: false,
    });
    expect(state.transmitters.tx2.route).toBe("antenna");

    state = clearPrimaryTimeDelay(state, "mon1");
    state = accept(state, { type: "advance-time", toMs: 9_000 });
    expect(state.monitorAction.automaticActionLatched).toBe(false);

    state = injectPrimaryTimeDelay(state, "mon1");
    state = accept(state, { type: "advance-time", toMs: 10_000 });
    state = accept(state, { type: "advance-time", toMs: 14_000 });

    expect(state.systemShutdown).toBe(true);
    expect(state.monitorAction.automaticChangeovers).toBe(1);
    expect(state.monitorAction.automaticShutdowns).toBe(1);
    expect(state.transmitters.tx1).toMatchObject({
      route: "load",
      shutdown: true,
      shutdownCause: "monitor",
      dcPower: "off",
      rfEnabled: false,
    });
    expect(state.transmitters.tx2).toMatchObject({
      route: "antenna",
      shutdown: true,
      shutdownCause: "monitor",
      dcPower: "off",
      rfEnabled: false,
    });
  });

  it("rejects a manual changeover to a TX latched shutdown by an automatic action", () => {
    let state = createAutomaticState("OR");
    state = accept(state, { type: "advance-time", toMs: 2_000 });
    state = injectPrimaryTimeDelay(state, "mon1");
    state = accept(state, { type: "advance-time", toMs: 3_000 });
    state = accept(state, { type: "advance-time", toMs: 7_000 });

    expect(state.transmitters.tx1.shutdown).toBe(true);
    expect(state.transmitters.tx2.route).toBe("antenna");

    state = accept(state, {
      type: "login",
      userId: "operator",
      password: "operator",
      origin: "local",
    });
    const result = executeDme320Command(state, { type: "changeover" });

    expect(result.accepted).toBe(false);
    expect(result.message).toBe("Changeover failed.");
    expect(result.state.transmitters.tx1).toMatchObject({
      route: "load",
      shutdown: true,
      dcPower: "off",
      rfEnabled: false,
    });
    expect(result.state.transmitters.tx2.route).toBe("antenna");
  });
});
