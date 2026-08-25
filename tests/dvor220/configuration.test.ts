import { describe, expect, it } from "vitest";
import { reduceDvor220Command } from "@/modules/operations/dvor-220/domain/commands";
import type { Dvor220Command, Dvor220DeviceState } from "@/modules/operations/dvor-220/domain/types";
import { createAuthorizedDvor220State } from "./helpers";

function accepted(state: Dvor220DeviceState, command: Dvor220Command): Dvor220DeviceState {
  const result = reduceDvor220Command(state, command);
  expect(result.ok, result.error).toBe(true);
  return result.state;
}

describe("MOPIENS DVOR 220 configuration layers", () => {
  it("keeps Draft, Running and Flash independent through Apply, Save and power cycle", () => {
    let state = createAuthorizedDvor220State();
    state = accepted(state, {
      type: "patch-draft",
      patch: { station: { carrierPowerW: 120 } },
    });
    expect(state.configuration.draft.station.carrierPowerW).toBe(120);
    expect(state.configuration.running.station.carrierPowerW).toBe(100);
    expect(state.configuration.draftDirty).toBe(true);

    state = accepted(state, { type: "apply-draft" });
    expect(state.configuration.running.station.carrierPowerW).toBe(120);
    expect(state.configuration.flash.station.carrierPowerW).toBe(100);
    expect(state.configuration.flashDirty).toBe(true);

    state = accepted(state, { type: "power-cycle" });
    expect(state.configuration.running.station.carrierPowerW).toBe(100);

    state = accepted(state, {
      type: "patch-draft",
      patch: { station: { carrierPowerW: 120 } },
    });
    state = accepted(state, { type: "apply-draft" });
    state = accepted(state, { type: "save-profile" });
    expect(state.configuration.flashDirty).toBe(false);
    state = accepted(state, { type: "power-cycle" });
    expect(state.configuration.running.station.carrierPowerW).toBe(120);
  });

  it("rejects invalid drafts without changing the running configuration", () => {
    let state = createAuthorizedDvor220State();
    state = accepted(state, {
      type: "patch-draft",
      patch: { station: { carrierPowerW: 151 } },
    });
    const result = reduceDvor220Command(state, { type: "apply-draft" });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("station.carrierPowerW");
    expect(result.state.configuration.draft.station.carrierPowerW).toBe(151);
    expect(result.state.configuration.running.station.carrierPowerW).toBe(100);
  });

  it("deep-merges a focused patch without replacing sibling settings", () => {
    const initial = createAuthorizedDvor220State();
    const result = reduceDvor220Command(initial, {
      type: "patch-draft",
      patch: { thermal: { tx1: { fanStartC: 45 } } },
    });

    expect(result.ok).toBe(true);
    expect(result.state.configuration.draft.thermal.tx1.fanStartC).toBe(45);
    expect(result.state.configuration.draft.thermal.tx1.fanStopC).toBe(35);
    expect(result.state.configuration.draft.thermal.tx2.fanStartC).toBe(40);
  });

  it("keeps Helper Apply in RAM, saves only on request and tracks later carrier changes", () => {
    let state = createAuthorizedDvor220State();
    const helperSettings = {
      carrierScalePercent: 90,
      sidebandPowerW: { usbCos: 0.9, usbSin: 0.9, lsbCos: 0.9, lsbSin: 0.9 },
      trackingEnabled: true,
    };

    state = accepted(state, {
      type: "apply-transmitter-helper",
      transmitterIds: ["tx1"],
      settings: helperSettings,
    });
    expect(state.configuration.running.transmitters.tx1).toMatchObject(helperSettings);
    expect(state.configuration.flash.transmitters.tx1.carrierScalePercent).toBe(100);

    state = accepted(state, { type: "reset" });
    expect(state.configuration.running.transmitters.tx1).toMatchObject({
      carrierScalePercent: 100,
      trackingEnabled: false,
    });

    state = accepted(state, {
      type: "apply-transmitter-helper",
      transmitterIds: ["tx1"],
      settings: helperSettings,
    });
    state = accepted(state, { type: "save-transmitter-helper", transmitterIds: ["tx1"] });
    state = accepted(state, {
      type: "patch-draft",
      patch: { station: { carrierPowerW: 50 } },
    });
    state = accepted(state, { type: "apply-draft" });

    expect(state.configuration.running.transmitters.tx1.sidebandPowerW).toEqual({
      usbCos: 0.45,
      usbSin: 0.45,
      lsbCos: 0.45,
      lsbSin: 0.45,
    });
  });
});
