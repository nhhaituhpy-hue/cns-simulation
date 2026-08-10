import { describe, expect, it } from "vitest";
import {
  createDme320SimulationState,
  executeDme320Command,
} from "@/modules/operations/dme-320/domain/engine";
import { createDefaultDme320MonitorLimits } from "@/modules/operations/dme-320/domain/defaults";
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

function loginOperator(
  state: Dme320SimulationState,
  origin: "local" | "remote" = "local",
): Dme320SimulationState {
  return accept(state, {
    type: "login",
    userId: "operator",
    password: "operator",
    origin,
  });
}

describe("DME 320 security and keylock ownership", () => {
  it("uses the required training Administrator credential at level 3", () => {
    const initial = createDme320SimulationState();
    const wrongPassword = executeDme320Command(initial, {
      type: "login",
      userId: "Administrator",
      password: "admin",
      origin: "local",
    });
    expect(wrongPassword.accepted).toBe(false);

    const authenticated = executeDme320Command(initial, {
      type: "login",
      userId: "Administrator",
      password: "1234",
      origin: "local",
    });
    expect(authenticated.accepted).toBe(true);
    expect(authenticated.state.session).toMatchObject({
      userId: "Administrator",
      level: 3,
      origin: "local",
    });
  });

  it("requires level 2 and gives control only to the keylock-selected origin", () => {
    const initial = createDme320SimulationState();
    const guestAttempt = executeDme320Command(initial, { type: "changeover" });

    expect(guestAttempt.accepted).toBe(false);
    expect(guestAttempt.message).toContain("Security level 2");

    let state = loginOperator(initial, "remote");
    const remoteAtLocal = executeDme320Command(state, { type: "changeover" });
    expect(remoteAtLocal.accepted).toBe(false);
    expect(remoteAtLocal.message).toContain("keylock is LOCAL");

    state = accept(state, { type: "set-keylock", mode: "REM" });
    state = accept(state, { type: "changeover" });

    expect(state.transmitters.tx2.route).toBe("antenna");
    expect(state.transmitters.tx1.route).toBe("load");
  });

  it("rejects setup changes unless both monitors are bypassed", () => {
    let state = loginOperator(createDme320SimulationState());
    state = accept(state, {
      type: "set-monitor-mode",
      monitorId: "mon1",
      mode: "auto",
    });

    const draft = structuredClone(state.config.draft);
    draft.station.stationName = "Blocked while active";
    const result = executeDme320Command(state, {
      type: "set-draft-config",
      config: draft,
    });

    expect(result.accepted).toBe(false);
    expect(result.message).toContain("Both monitors must be bypassed");
    expect(result.state.config.draft.station.stationName).not.toBe(
      "Blocked while active",
    );
  });
});

describe("DME 320 configuration persistence", () => {
  it("rebases channel-dependent monitor limits while preserving custom calibration deltas", () => {
    let state = loginOperator(createDme320SimulationState());
    const previous = structuredClone(state.config.running);
    const draft = structuredClone(state.config.draft);
    draft.station.channel = { number: 100, suffix: "Y" };
    draft.monitor.limits.timeDelayUs.warningHigh =
      (draft.monitor.limits.timeDelayUs.warningHigh ?? 0) + 0.15;
    draft.monitor.limits.pulseSpacingUs.alarmLow =
      (draft.monitor.limits.pulseSpacingUs.alarmLow ?? 0) - 0.1;
    draft.monitor.limits.frequencyMhz.warningHigh =
      (draft.monitor.limits.frequencyMhz.warningHigh ?? 0) + 0.001;
    const previousDefaults = createDefaultDme320MonitorLimits(
      previous.station.channel,
      previous.station.powerOutputWatts,
      previous.station.delayOffsetUs,
      previous.station.identCode,
    );
    const nextDefaults = createDefaultDme320MonitorLimits(
      draft.station.channel,
      draft.station.powerOutputWatts,
      draft.station.delayOffsetUs,
      draft.station.identCode,
    );

    state = accept(state, { type: "set-draft-config", config: draft });
    state = accept(state, { type: "apply-draft" });

    expect(state.config.running.monitor.limits.timeDelayUs.warningHigh).toBeCloseTo(
      (previous.monitor.limits.timeDelayUs.warningHigh ?? 0)
        + 0.15
        + (nextDefaults.timeDelayUs.warningHigh ?? 0)
        - (previousDefaults.timeDelayUs.warningHigh ?? 0),
      5,
    );
    expect(state.config.running.monitor.limits.pulseSpacingUs.alarmLow).toBeCloseTo(
      (previous.monitor.limits.pulseSpacingUs.alarmLow ?? 0)
        - 0.1
        + (nextDefaults.pulseSpacingUs.alarmLow ?? 0)
        - (previousDefaults.pulseSpacingUs.alarmLow ?? 0),
      5,
    );
    expect(state.config.running.monitor.limits.frequencyMhz.warningHigh).toBeCloseTo(
      (previous.monitor.limits.frequencyMhz.warningHigh ?? 0)
        + 0.001
        + (nextDefaults.frequencyMhz.warningHigh ?? 0)
        - (previousDefaults.frequencyMhz.warningHigh ?? 0),
      5,
    );
    expect(state.config.running.monitor.limits.peakPowerWatts).toEqual(
      previous.monitor.limits.peakPowerWatts,
    );
    expect(state.config.draft).toEqual(state.config.running);
    expect(state.monitors.mon1.channels.executive.alarms.timeDelayUs.phase).toBe("normal");
  });

  it("reverts unsaved running changes on reboot and retains flash-saved changes", () => {
    let state = loginOperator(createDme320SimulationState());
    const originalName = state.config.flash.station.stationName;
    const volatileDraft = structuredClone(state.config.draft);
    volatileDraft.station.stationName = "VOLATILE PROFILE";

    state = accept(state, { type: "set-draft-config", config: volatileDraft });
    state = accept(state, { type: "apply-draft" });
    expect(state.config.running.station.stationName).toBe("VOLATILE PROFILE");
    expect(state.config.flash.station.stationName).toBe(originalName);
    expect(state.config.flashDirty).toBe(true);

    state = accept(state, { type: "reboot" });
    expect(state.config.running.station.stationName).toBe(originalName);
    expect(state.config.draft.station.stationName).toBe(originalName);
    expect(state.config.flashDirty).toBe(false);
    expect(state.session.level).toBe(0);

    state = loginOperator(state);
    const persistentDraft = structuredClone(state.config.draft);
    persistentDraft.station.stationName = "PERSISTENT PROFILE";
    state = accept(state, { type: "set-draft-config", config: persistentDraft });
    state = accept(state, { type: "apply-draft" });
    state = accept(state, { type: "save-running-to-flash" });
    state = accept(state, { type: "reboot" });

    expect(state.config.running.station.stationName).toBe("PERSISTENT PROFILE");
    expect(state.config.draft).toEqual(state.config.running);
    expect(state.config.flash).toEqual(state.config.running);
    expect(state.config.draftDirty).toBe(false);
    expect(state.config.flashDirty).toBe(false);
  });
});
