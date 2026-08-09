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
});
