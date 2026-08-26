import { describe, expect, it } from "vitest";
import {
  createLowOutputDme1119aScenario,
  createDefaultDme1119aScenarioDefinition,
} from "@/lib/dme1119a";
import { cloneDefaultDmePmdtData } from "@/lib/dme-pmdt-defaults";
import { extractDme1119aConfig, hydrateDme1119aData } from "@/lib/simulator-config/dme-1119a";
import { createDmePmdtStore } from "@/stores/dme-pmdt-store";

describe("DME 1119A scenario persistence boundary", () => {
  it("never serializes physical scenario stimuli into the persistent config", () => {
    const data = cloneDefaultDmePmdtData();
    data.simulationFaults.transmitters.tx1.powerLossDb = 6;
    const persisted = extractDme1119aConfig(data);
    expect(persisted).not.toHaveProperty("simulationFaults");
    expect(hydrateDme1119aData(persisted).simulationFaults.transmitters.tx1.powerLossDb).toBe(0);
  });

  it("ignores a late profile hydrate while a scenario is active", () => {
    const store = createDmePmdtStore();
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    expect(store.getState().setLocalMode(true)).toBe(true);
    store.getState().setScenarioAuthoringEnabled(true);
    store.getState().replaceScenarioDraft(createLowOutputDme1119aScenario());
    expect(store.getState().applyScenario()).toBe(true);
    const before = store.getState().data.txConfigNominal.rtcParameters.powerOutput;

    const unrelatedProfile = createDefaultDme1119aScenarioDefinition().configuration;
    store.getState().replaceConfig(unrelatedProfile);
    expect(store.getState().data.txConfigNominal.rtcParameters.powerOutput).toBe(before);
  });
});
