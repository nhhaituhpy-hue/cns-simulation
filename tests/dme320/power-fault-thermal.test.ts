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

describe("DME 320 power, injected faults, and thermal behavior", () => {
  it("runs on batteries after AC loss and shuts down when both reach cutoff", () => {
    let state = createDme320SimulationState();
    state = accept(state, { type: "set-ac-available", available: false });

    expect(state.power.source).toBe("battery");
    expect(state.serviceStatus).toBe("warning");

    state = accept(state, { type: "advance-time", toMs: 6 * 3_600_000 });
    expect(state.power.batteries.battery1).toMatchObject({
      voltage: 21,
      status: "alarm",
    });
    expect(state.systemShutdown).toBe(false);

    state = accept(state, { type: "advance-time", toMs: 7 * 3_600_000 });
    expect(state.power.source).toBe("off");
    expect(state.power.batteries.battery1.status).toBe("cutoff");
    expect(state.power.batteries.battery2.status).toBe("cutoff");
    expect(state.systemShutdown).toBe(true);
    expect(state.serviceStatus).toBe("shutdown");
  });

  it("applies configured communication-fault shutdown only after its delay", () => {
    const config = createDefaultDme320Config();
    config.system.shutdownOnRcuFault = true;
    let state = createDme320SimulationState({ config });

    state = accept(state, {
      type: "inject-fault",
      fault: { id: "rcu-link", kind: "rcu-link-failure", target: "system" },
    });
    state = accept(state, { type: "advance-time", toMs: 3_999 });
    expect(state.systemShutdown).toBe(false);

    state = accept(state, { type: "advance-time", toMs: 4_000 });
    expect(state.systemShutdown).toBe(true);
    expect(state.transmitters.tx1.dcPower).toBe("off");
    expect(state.transmitters.tx2.dcPower).toBe("off");
  });

  it("heats a TX with a failed fan, shuts it down, then cools and restarts it", () => {
    let state = createDme320SimulationState();
    state = accept(state, {
      type: "inject-fault",
      fault: { id: "fan-tx1", kind: "fan-failure", target: "tx1" },
    });
    state = accept(state, { type: "advance-time", toMs: 2 * 3_600_000 });

    expect(state.transmitters.tx1).toMatchObject({
      temperatureC: 95,
      fanRunning: false,
      shutdown: true,
      shutdownCause: "thermal",
      rfEnabled: false,
    });

    state = accept(state, { type: "clear-fault", faultId: "fan-tx1" });
    state = accept(state, { type: "advance-time", toMs: 5 * 3_600_000 });

    expect(state.transmitters.tx1).toMatchObject({
      temperatureC: 80,
      fanRunning: true,
      shutdown: false,
      shutdownCause: null,
      rfEnabled: true,
    });
  });

  it("derives the station alarm from EMU temperature, smoke, and fault clearing", () => {
    let state = createDme320SimulationState();
    state = accept(state, {
      type: "set-environment",
      changes: { temperatureC: 60 },
    });
    expect(state.environment.temperatureC).toBe(60);
    expect(state.serviceStatus).toBe("alarm");

    state = accept(state, {
      type: "set-environment",
      changes: { temperatureC: 24 },
    });
    expect(state.serviceStatus).toBe("normal");

    state = accept(state, {
      type: "inject-fault",
      fault: { id: "emu-smoke", kind: "emu-smoke", target: "system" },
    });
    expect(state.environment.smokeDetected).toBe(true);
    expect(state.serviceStatus).toBe("alarm");

    state = accept(state, { type: "clear-fault", faultId: "emu-smoke" });
    expect(state.environment.smokeDetected).toBe(false);
    expect(state.serviceStatus).toBe("normal");
  });
});
