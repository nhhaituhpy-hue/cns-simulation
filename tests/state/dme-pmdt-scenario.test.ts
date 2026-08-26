import { describe, expect, it } from "vitest";
import {
  createDefaultDme1119aScenarioDefinition,
  createLowOutputDme1119aScenario,
} from "@/lib/dme1119a";
import { createDmePmdtStore } from "@/stores/dme-pmdt-store";

function createAuthenticatedLocalStore() {
  const store = createDmePmdtStore({
    now: () => new Date("2026-08-26T05:00:00.000Z"),
    generateId: (() => {
      let sequence = 0;
      return () => `test-${sequence++}`;
    })(),
  });
  expect(store.getState().login("SEC3", "THREE")).toBe(true);
  expect(store.getState().setLocalMode(true)).toBe(true);
  return store;
}

describe("DME 1119A Scenario Parameters store", () => {
  it("keeps scenario authoring session-only and blocks persistent config writes", () => {
    const store = createAuthenticatedLocalStore();
    const scenario = createLowOutputDme1119aScenario();
    store.getState().setScenarioAuthoringEnabled(true);
    store.getState().replaceScenarioDraft(scenario);

    expect(store.getState().applyScenario()).toBe(true);
    expect(store.getState().scenario.active).toBe(true);
    expect(store.getState().needBackup).toBe(false);
    expect(store.getState().backupConfig()).toBe(false);
    expect(store.getState().saveConfig()).toBe(false);
    expect(store.getState().loadConfig()).toBe(false);
    expect(store.getState().restoreConfig()).toBe(false);
  });

  it("allows only whitelisted student configuration fields while a scenario is active", () => {
    const store = createAuthenticatedLocalStore();
    const scenario = createLowOutputDme1119aScenario();
    store.getState().setScenarioAuthoringEnabled(true);
    store.getState().replaceScenarioDraft(scenario);
    expect(store.getState().applyScenario()).toBe(true);

    const protectedBefore = store.getState().configDraft.rmsConfigGeneral.transfer;
    store.getState().setParameterValue("rmsConfigGeneral.transfer", protectedBefore === "on Primary Alarm" ? "Best Availability" : "on Primary Alarm");
    expect(store.getState().configDraft.rmsConfigGeneral.transfer).toBe(protectedBefore);

    store.getState().setParameterValue("txConfigNominal.rtcParameters.powerOutput", -1);
    expect(store.getState().configDraft.txConfigNominal.rtcParameters.powerOutput).toBe(-1);
    expect(store.getState().applyConfigChanges()).toBe(true);
  });

  it("restores the scenario baseline and ends back at TST without creating a backup", () => {
    const store = createAuthenticatedLocalStore();
    const scenario = createLowOutputDme1119aScenario();
    store.getState().setScenarioAuthoringEnabled(true);
    store.getState().replaceScenarioDraft(scenario);
    expect(store.getState().applyScenario()).toBe(true);
    store.getState().setParameterValue("txConfigNominal.rtcParameters.powerOutput", -1);
    expect(store.getState().restoreScenario()).toBe(true);
    expect(store.getState().data.txConfigNominal.rtcParameters.powerOutput).toBe(-5);
    expect(store.getState().endScenario()).toBe(true);
    expect(store.getState().scenario.active).toBe(false);
    expect(store.getState().data.txConfigNominal.rtcParameters.powerOutput).toBe(
      createDefaultDme1119aScenarioDefinition().configuration.txConfigNominal.rtcParameters.powerOutput,
    );
    expect(store.getState().needBackup).toBe(false);
  });

  it("rejects an invalid scenario definition before changing the simulator", () => {
    const store = createAuthenticatedLocalStore();
    store.getState().setScenarioAuthoringEnabled(true);
    const invalid = createDefaultDme1119aScenarioDefinition();
    invalid.successCriteria = [];
    store.getState().replaceScenarioDraft(invalid);
    expect(store.getState().applyScenario()).toBe(false);
    expect(store.getState().scenario.active).toBe(false);
    expect(store.getState().lastCommand).toContain("Scenario validation failed");
  });
});
