import { describe, expect, it } from "vitest";
import { reduceDvor220Command } from "@/modules/operations/dvor-220/domain/commands";
import { cloneDvor220, createInitialDvor220State } from "@/modules/operations/dvor-220/domain/defaults";
import { advanceDvor220Time, deriveDvor220Snapshot } from "@/modules/operations/dvor-220/domain/engine";
import type { Dvor220Command } from "@/modules/operations/dvor-220/domain/types";
import { createDefaultDvor220ScenarioDefinition, previewDvor220Scenario } from "@/modules/operations/dvor-220/domain/scenario";
import { createAuthorizedDvor220State } from "./helpers";

describe("Cam Ranh per-transmitter runtime controls", () => {
  it("initializes scenario device and derived snapshots with normal runtime controls", () => {
    const preview = previewDvor220Scenario(createDefaultDvor220ScenarioDefinition());
    for (const id of ["tx1", "tx2"] as const) {
      expect(preview.device.transmitters[id].advancedControls).toEqual({ identKeying: "normal", sidebandBlending: "normal", standbyAzimuthEmulation: "normal" });
      expect(preview.snapshot.transmitters[id].advancedControls).toEqual(preview.device.transmitters[id].advancedControls);
    }
  });
  it("applies/logs controls without changing the other TX or configuration and survives cloning", () => {
    let state = createAuthorizedDvor220State();
    const configuration = cloneDvor220(state.configuration);
    for (const [control, value] of [["identKeying", "continuous"], ["sidebandBlending", "off"], ["standbyAzimuthEmulation", "off"]] as const) {
      const result = reduceDvor220Command(state, { type: "set-advanced-control", transmitterId: "tx2", control, value });
      expect(result.ok).toBe(true);
      state = result.state;
      expect(state.transmitters.tx2.advancedControls[control]).toBe(value);
      expect(state.transmitters.tx1.advancedControls[control]).toBe("normal");
      expect(state.history.pmdt).toEqual(expect.arrayContaining([expect.objectContaining({ category: "control", message: `TX2 ${control}: ${value}` })]));
    }
    expect(state.configuration).toEqual(configuration);
    const cloned = cloneDvor220(state);
    expect(deriveDvor220Snapshot(JSON.parse(JSON.stringify(cloned))).transmitters.tx2.advancedControls).toEqual(state.transmitters.tx2.advancedControls);
    cloned.transmitters.tx2.advancedControls.identKeying = "normal";
    expect(state.transmitters.tx2.advancedControls.identKeying).toBe("continuous");
  });

  it("rejects missing permission, invalid values and main-TX azimuth emulation", () => {
    const command: Dvor220Command = { type: "set-advanced-control", transmitterId: "tx1", control: "identKeying", value: "off" };
    expect(reduceDvor220Command(createInitialDvor220State(), command).ok).toBe(false);
    expect(reduceDvor220Command(createAuthorizedDvor220State({ level: 1 }), command).ok).toBe(false);
    const state = createAuthorizedDvor220State();
    expect(reduceDvor220Command(state, { ...command, control: "sidebandBlending", value: "continuous" }).ok).toBe(false);
    expect(reduceDvor220Command(state, { ...command, control: "standbyAzimuthEmulation" }).ok).toBe(false);
    expect(state.transmitters.tx1.advancedControls.identKeying).toBe("normal");
  });

  it.each(["off", "continuous"] as const)("uses the existing IDENT alarm path for on-antenna %s keying", (value) => {
    let state = createAuthorizedDvor220State();
    state = reduceDvor220Command(state, { type: "set-advanced-control", transmitterId: "tx2", control: "identKeying", value }).state;
    state = advanceDvor220Time(state, 1000);
    expect(deriveDvor220Snapshot(state).monitors.mon1.channels.cha.readings.ident1020Hz.status).toBe("normal");
    state = reduceDvor220Command(state, { type: "set-advanced-control", transmitterId: "tx1", control: "identKeying", value }).state;
    state = advanceDvor220Time(state, 1000);
    for (const id of ["mon1", "mon2"] as const) {
      expect(deriveDvor220Snapshot(state).monitors[id].channels.cha.readings.ident1020Hz.status).toBe("alarm");
    }
    state = reduceDvor220Command(state, { type: "set-advanced-control", transmitterId: "tx1", control: "identKeying", value: "normal" }).state;
    state = advanceDvor220Time(state, 1000);
    expect(deriveDvor220Snapshot(state).monitors.mon1.channels.cha.readings.ident1020Hz.status).toBe("normal");
  });

  it.each(["reset", "power-cycle"] as const)("restores normal controls on %s", (type) => {
    let state = createAuthorizedDvor220State();
    state = reduceDvor220Command(state, { type: "set-advanced-control", transmitterId: "tx1", control: "identKeying", value: "off" }).state;
    const result = reduceDvor220Command(state, { type });
    expect(result.ok).toBe(true);
    expect(result.state.transmitters.tx1.advancedControls).toEqual({ identKeying: "normal", sidebandBlending: "normal", standbyAzimuthEmulation: "normal" });
  });
});
