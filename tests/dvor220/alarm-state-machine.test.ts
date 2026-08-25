import { describe, expect, it } from "vitest";
import { reduceDvor220Command } from "@/modules/operations/dvor-220/domain/commands";
import { createDefaultDvor220Configuration } from "@/modules/operations/dvor-220/domain/defaults";
import {
  advanceDvor220Time,
  deriveDvor220Snapshot,
  getDvor220ResetLockMs,
} from "@/modules/operations/dvor-220/domain/engine";
import type { Dvor220DeviceState, Dvor220MonitorId } from "@/modules/operations/dvor-220/domain/types";
import { createAuthorizedDvor220State } from "./helpers";

function injectBearingAlarm(state: Dvor220DeviceState, monitorId: Dvor220MonitorId) {
  return reduceDvor220Command(state, {
    type: "inject-fault",
    fault: {
      id: `${monitorId}-bearing`,
      kind: "monitor-parameter",
      monitorId,
      channelId: "cha",
      parameter: "bearingError",
      value: 2,
    },
  }).state;
}

function alarmConfiguration() {
  const configuration = createDefaultDvor220Configuration();
  configuration.station.bypassMonitorsOnBoot = false;
  configuration.monitor.powerOnHoldoffMs = 0;
  configuration.monitor.executiveAlarmDelayMs = 1_000;
  configuration.monitor.postChangeoverHoldoffMs = 500;
  return configuration;
}

describe("MOPIENS DVOR 220 executive alarm state machine", () => {
  it("delays, changes over, holds off, shuts down on a second alarm and locks reset", () => {
    let state = createAuthorizedDvor220State({ configuration: alarmConfiguration() });
    state = injectBearingAlarm(state, "mon1");
    expect(state.executive.phase).toBe("idle");

    state = injectBearingAlarm(state, "mon2");
    expect(deriveDvor220Snapshot(state).monitors.mon1.channels.cha.stabilizing).toBe(true);
    state = advanceDvor220Time(state, 1_000);
    expect(state.executive.phase).toBe("pending-changeover");
    state = advanceDvor220Time(state, 999);
    expect(deriveDvor220Snapshot(state).activeTransmitterId).toBe("tx1");

    state = advanceDvor220Time(state, 1);
    expect(state.executive.phase).toBe("post-changeover-holdoff");
    expect(deriveDvor220Snapshot(state).activeTransmitterId).toBe("tx2");
    expect(state.transmitters.tx1.designation).toBe("main");

    state = advanceDvor220Time(state, 500);
    expect(state.executive.phase).toBe("idle");
    expect(deriveDvor220Snapshot(state).monitors.mon1.channels.cha.stabilizing).toBe(true);
    state = advanceDvor220Time(state, 500);
    expect(state.executive.phase).toBe("pending-shutdown");
    state = advanceDvor220Time(state, 1_000);
    expect(state.executive.phase).toBe("shutdown-locked");
    expect(deriveDvor220Snapshot(state).activeTransmitterId).toBeNull();

    const earlyReset = reduceDvor220Command(state, { type: "reset" });
    expect(earlyReset).toMatchObject({ ok: false, error: expect.stringContaining("20 seconds") });
    state = reduceDvor220Command(earlyReset.state, { type: "clear-all-faults" }).state;
    state = advanceDvor220Time(state, getDvor220ResetLockMs());
    const reset = reduceDvor220Command(state, { type: "reset" });
    expect(reset.ok).toBe(true);
    expect(deriveDvor220Snapshot(reset.state).activeTransmitterId).toBe("tx1");
  });

  it("implements AND/OR voting and full monitor bypass", () => {
    const andConfiguration = alarmConfiguration();
    let andState = createAuthorizedDvor220State({ configuration: andConfiguration });
    andState = injectBearingAlarm(andState, "mon1");
    andState = advanceDvor220Time(andState, 1_000);
    expect(deriveDvor220Snapshot(andState).executiveAlarm).toBe(false);

    const orConfiguration = alarmConfiguration();
    orConfiguration.monitor.votingLogic = "OR";
    let orState = createAuthorizedDvor220State({ configuration: orConfiguration });
    orState = injectBearingAlarm(orState, "mon1");
    orState = advanceDvor220Time(orState, 1_000);
    expect(deriveDvor220Snapshot(orState).executiveAlarm).toBe(true);
    expect(orState.executive.phase).toBe("pending-changeover");

    orState.monitors.mon1.bypassRequested = true;
    orState.monitors.mon2.bypassRequested = true;
    expect(deriveDvor220Snapshot(orState).executiveAlarm).toBe(false);
  });

  it("reports secondary IDENT alarms without executive action", () => {
    let state = createAuthorizedDvor220State({ configuration: alarmConfiguration() });
    for (const monitorId of ["mon1", "mon2"] as const) {
      state = reduceDvor220Command(state, {
        type: "inject-fault",
        fault: {
          id: `${monitorId}-ident`,
          kind: "monitor-parameter",
          monitorId,
          channelId: "cha",
          parameter: "ident1020Hz",
          value: 0,
        },
      }).state;
    }
    state = advanceDvor220Time(state, 1_000);
    const snapshot = deriveDvor220Snapshot(state);

    expect(snapshot.monitors.mon1.channels.cha.secondaryAlarm).toBe(true);
    expect(snapshot.monitors.mon1.channels.cha.primaryAlarm).toBe(false);
    expect(snapshot.executiveAlarm).toBe(false);
    expect(state.executive.phase).toBe("idle");
  });

  it("honors power-on holdoff before starting the executive delay", () => {
    const configuration = alarmConfiguration();
    configuration.monitor.powerOnHoldoffMs = 2_000;
    let state = createAuthorizedDvor220State({
      configuration,
      preservePowerOnHoldoff: true,
    });
    state = injectBearingAlarm(injectBearingAlarm(state, "mon1"), "mon2");

    expect(state.executive.phase).toBe("idle");
    state = advanceDvor220Time(state, 1_999);
    expect(state.executive.phase).toBe("idle");
    state = advanceDvor220Time(state, 1);
    expect(state.executive.phase).toBe("pending-changeover");
    expect(state.executive.pendingSinceMs).toBe(2_000);
  });

  it("routes configured control-link faults directly to delayed shutdown", () => {
    const configuration = alarmConfiguration();
    configuration.system.shutdownOnRcuFault = true;
    configuration.system.controlFaultShutdownDelayMs = 400;
    let state = createAuthorizedDvor220State({ configuration });
    state = reduceDvor220Command(state, {
      type: "inject-fault",
      fault: { id: "rcu-down", kind: "communication", endpoint: "rcu", condition: "fault" },
    }).state;

    expect(state.executive.phase).toBe("pending-shutdown");
    state = advanceDvor220Time(state, 400);
    expect(state.executive.phase).toBe("shutdown-locked");
  });
});
