import { describe, expect, it } from "vitest";
import { reduceDvor220Command } from "@/modules/operations/dvor-220/domain/commands";
import { createInitialDvor220State } from "@/modules/operations/dvor-220/domain/defaults";
import {
  advanceDvor220Time,
  deriveDvor220Snapshot,
  filterDvor220History,
  getDvor220GroundCheckDurationMs,
} from "@/modules/operations/dvor-220/domain/engine";
import { createDvor220Store } from "@/modules/operations/dvor-220/store/dvor220-store";
import { createAuthorizedDvor220State, localEthernetProfile } from "./helpers";

describe("MOPIENS DVOR 220 maintenance, power and store", () => {
  it("calibrates at level 2 and restricts automatic ground check to local MAINT", () => {
    let state = createAuthorizedDvor220State({ level: 2 });
    const calibrated = reduceDvor220Command(state, {
      type: "calibrate",
      calibration: {
        kind: "transmitter-reading",
        transmitterId: "tx1",
        output: "carrier",
        indicatedValue: 100,
        referenceValue: 105,
      },
    });
    expect(calibrated.ok).toBe(true);
    expect(deriveDvor220Snapshot(calibrated.state).transmitters.tx1.forwardPowerW.carrier).toBe(105);

    const denied = reduceDvor220Command(calibrated.state, {
      type: "start-ground-check",
      transmitterId: "tx1",
    });
    expect(denied).toMatchObject({ ok: false, error: expect.stringContaining("MAINT") });

    state = reduceDvor220Command(denied.state, { type: "set-keylock", mode: "MAINT" }).state;
    const started = reduceDvor220Command(state, {
      type: "start-ground-check",
      transmitterId: "tx1",
    });
    expect(started.ok).toBe(true);
    state = advanceDvor220Time(started.state, getDvor220GroundCheckDurationMs());
    expect(state.groundCheck).toMatchObject({
      status: "completed",
      withinTolerance: true,
    });
    expect(state.groundCheck.points).toHaveLength(24);
  });

  it("exhausts backup power deterministically and applies thermal hysteresis", () => {
    let state = createInitialDvor220State({ nowMs: 0 });
    state = reduceDvor220Command(state, {
      type: "set-battery-remaining-minutes",
      minutes: 0.05,
    }).state;
    state = reduceDvor220Command(state, { type: "set-ac-available", available: false }).state;
    expect(state.power.source).toBe("battery");
    state = advanceDvor220Time(state, 2_999);
    expect(state.power.source).toBe("battery");
    state = advanceDvor220Time(state, 1);
    expect(state.power.source).toBe("off");
    expect(state.transmitters.tx1.powerOn).toBe(false);

    state = createInitialDvor220State({ nowMs: 0 });
    state = reduceDvor220Command(state, {
      type: "set-temperature",
      transmitterId: "tx1",
      unit: "cma",
      temperatureC: 95,
    }).state;
    expect(state.transmitters.tx1.thermalTrips.cma).toBe(true);
    expect(state.transmitters.tx1.rfOutputs.carrier).toBe(false);
    expect(state.transmitters.tx1.fanOn).toBe(true);

    state = reduceDvor220Command(state, {
      type: "set-temperature",
      transmitterId: "tx1",
      unit: "cma",
      temperatureC: 81,
    }).state;
    expect(state.transmitters.tx1.thermalTrips.cma).toBe(true);
    state = reduceDvor220Command(state, {
      type: "set-temperature",
      transmitterId: "tx1",
      unit: "cma",
      temperatureC: 80,
    }).state;
    expect(state.transmitters.tx1.thermalTrips.cma).toBe(false);
    expect(state.transmitters.tx1.rfOutputs.carrier).toBe(true);
  });

  it("keeps LMI history continuous and PMDT history connection-scoped", () => {
    let state = createAuthorizedDvor220State({ nowMs: 100 });
    const pmdtRowsWhileConnected = state.history.pmdt.length;
    state = reduceDvor220Command(state, { type: "disconnect" }).state;
    const pmdtRowsAfterDisconnect = state.history.pmdt.length;
    state = reduceDvor220Command(state, {
      type: "inject-fault",
      fault: { id: "smoke", kind: "environment", sensor: "smoke", value: true },
    }).state;

    expect(pmdtRowsAfterDisconnect).toBeGreaterThan(pmdtRowsWhileConnected);
    expect(state.history.pmdt).toHaveLength(pmdtRowsAfterDisconnect);
    expect(state.history.lmi.length).toBeGreaterThan(state.history.pmdt.length);
    expect(filterDvor220History(state.history.lmi, { categories: ["alarm"], query: "smoke" }))
      .toHaveLength(1);
  });

  it("synchronizes a thin store with an injected monotonic clock", () => {
    let nowMs = 1_000;
    const store = createDvor220Store({ clock: { now: () => nowMs } });

    expect(store.getState().device.nowMs).toBe(1_000);
    expect(store.getState().snapshot.timestampMs).toBe(1_000);
    const connected = store.getState().dispatch({
      type: "connect",
      profile: localEthernetProfile,
    });
    expect(connected.ok).toBe(true);
    expect("dispatch" in store.getState().device).toBe(false);

    nowMs = 1_750;
    store.getState().syncClock();
    expect(store.getState().device.nowMs).toBe(1_750);
    expect(store.getState().snapshot.timestampMs).toBe(1_750);

    nowMs = 1_700;
    expect(() => store.getState().syncClock()).toThrow(/backwards/i);
    nowMs = 2_000;
    store.getState().reset();
    expect(store.getState().device.nowMs).toBe(2_000);
    expect(store.getState().lastCommandResult).toBeNull();
  });
});
