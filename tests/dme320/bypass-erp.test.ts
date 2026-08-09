import { describe, expect, it } from "vitest";
import {
  createDme320SimulationState,
  executeDme320Command,
} from "@/modules/operations/dme-320/domain/engine";
import type {
  Dme320Command,
  Dme320MonitorParameter,
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

describe("DME 320 monitor bypass and ERP masking", () => {
  it("continues indicating alarms in bypass without executing an automatic action", () => {
    let state = createDme320SimulationState();
    state = accept(state, {
      type: "inject-measurement",
      override: {
        monitorId: "mon1",
        channel: "executive",
        parameter: "timeDelayUs",
        value: 100,
      },
    });
    state = accept(state, { type: "advance-time", toMs: 10_000 });

    expect(state.monitors.mon1.mode).toBe("bypass");
    expect(state.monitors.mon1.channels.executive.alarms.timeDelayUs.phase).toBe(
      "active",
    );
    expect(state.monitorAction.automaticChangeovers).toBe(0);
    expect(state.monitorAction.automaticShutdowns).toBe(0);
    expect(state.transmitters.tx1.route).toBe("antenna");
  });

  it("masks every reading except ERP while the ERP alarm is active", () => {
    let state = createDme320SimulationState();
    state = accept(state, {
      type: "inject-measurement",
      override: {
        monitorId: "mon1",
        channel: "executive",
        parameter: "erpDb",
        value: -10,
      },
    });
    state = accept(state, { type: "advance-time", toMs: 1_000 });

    const channel = state.monitors.mon1.channels.executive;
    expect(channel.alarms.erpDb.phase).toBe("active");
    expect(channel.readings.erpDb).toMatchObject({ value: -10, masked: false });

    const parameters = Object.keys(channel.readings) as Dme320MonitorParameter[];
    for (const parameter of parameters.filter((candidate) => candidate !== "erpDb")) {
      expect(channel.readings[parameter].masked).toBe(true);
    }

    state = accept(state, {
      type: "clear-measurement",
      monitorId: "mon1",
      channel: "executive",
      parameter: "erpDb",
    });
    expect(state.monitors.mon1.channels.executive.alarms.erpDb.phase).toBe("normal");
    expect(
      Object.values(state.monitors.mon1.channels.executive.readings).every(
        (reading) => !reading.masked,
      ),
    ).toBe(true);
  });
});
