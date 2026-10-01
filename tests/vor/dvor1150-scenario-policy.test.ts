import { describe, expect, it } from "vitest";
import {
  cloneDvor1150Config,
  createDefaultDvor1150ScenarioDefinition,
  createLowCarrierAnd9960Scenario,
  getDvor1150ScenarioProtectedFieldChanges,
  isDvor1150ScenarioStudentEditable,
  parseDvor1150ScenarioDefinition,
  validateDvor1150ScenarioDefinition,
} from "@/lib/dvor1150";
import { createDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

describe("DVOR 1150 non-A scenario edit policy", () => {
  it("retains the native v2 legacy whitelist and the v1 normalization", () => {
    const legacy = createLowCarrierAnd9960Scenario();
    expect(legacy.editPolicy).toBeUndefined();
    expect(isDvor1150ScenarioStudentEditable(legacy, "transmitters.tx1.nominal.outputPower")).toBe(true);
    expect(isDvor1150ScenarioStudentEditable(legacy, "station.stationDescription")).toBe(false);
    expect(parseDvor1150ScenarioDefinition(JSON.parse(JSON.stringify(legacy)))).toEqual(legacy);
    const v1 = parseDvor1150ScenarioDefinition({ ...legacy, schemaVersion: 1, studentEditableFieldIds: [] });
    expect(v1?.schemaVersion).toBe(2);
    expect(v1?.editPolicy).toBeUndefined();
    expect(v1?.studentEditableFieldIds).toContain("transmitters.tx1.nominal.outputPower");
    expect(v1 && isDvor1150ScenarioStudentEditable(v1, "station.stationDescription")).toBe(false);
    expect(isDvor1150ScenarioStudentEditable(createDefaultDvor1150ScenarioDefinition(), "station.frequencyMHz")).toBe(false);
  });

  it("keeps explicit policy authoritative and parses it without dropping diagnosis or configuration", () => {
    const definition = createLowCarrierAnd9960Scenario();
    definition.editPolicy = { mode: "restricted", allowedFieldIds: ["station.stationDescription"] };
    expect(isDvor1150ScenarioStudentEditable(definition, "station.stationDescription")).toBe(true);
    expect(isDvor1150ScenarioStudentEditable(definition, "transmitters.tx1.nominal.outputPower")).toBe(false);
    expect(parseDvor1150ScenarioDefinition(JSON.parse(JSON.stringify(definition)))).toEqual(definition);
    definition.editPolicy = { mode: "open" };
    expect(isDvor1150ScenarioStudentEditable(definition, "station.stationDescription")).toBe(true);
    expect(isDvor1150ScenarioStudentEditable(definition, "simulation.local")).toBe(false);
    expect(isDvor1150ScenarioStudentEditable(definition, "transmitters.tx1.onAir")).toBe(false);
    expect(isDvor1150ScenarioStudentEditable(definition, "unknown-field")).toBe(false);
    expect(parseDvor1150ScenarioDefinition(JSON.parse(JSON.stringify(definition)))).toEqual(definition);
  });

  it("rejects invalid fields and malformed Open policy instead of silently granting them", () => {
    const definition = createLowCarrierAnd9960Scenario();
    definition.editPolicy = { mode: "restricted", allowedFieldIds: ["simulation.local"] };
    expect(validateDvor1150ScenarioDefinition(definition)).toContain("Scenario edit policy field is invalid: simulation.local.");
    expect(parseDvor1150ScenarioDefinition(definition)).toBeNull();
    expect(parseDvor1150ScenarioDefinition({ ...definition, editPolicy: { mode: "open", allowedFieldIds: [] } })).toBeNull();
  });

  it("keeps Open behind security and Local, then applies and restores session-only configuration", () => {
    const definition = createDefaultDvor1150ScenarioDefinition();
    definition.editPolicy = { mode: "open" };
    const store = createDvor1150PmdtStore();
    expect(store.getState().initializeStudentScenario(definition)).toBe(true);
    const original = store.getState().config.station.stationDescription;
    store.getState().setConfigValue("station.stationDescription", "Blocked guest edit");
    expect(store.getState().configDraft.station.stationDescription).toBe(original);
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    store.getState().setConfigValue("station.stationDescription", "Blocked remote edit");
    expect(store.getState().configDraft.station.stationDescription).toBe(original);
    expect(store.getState().setLocalMode(true)).toBe(true);
    store.getState().setConfigValue("station.stationDescription", "Local scenario edit");
    expect(store.getState().config.station.stationDescription).toBe(original);
    expect(store.getState().applyConfigChanges()).toBe(true);
    expect(store.getState().config.station.stationDescription).toBe("Local scenario edit");
    expect(store.getState().needBackup).toBe(false);
    expect(store.getState().restoreScenario()).toBe(true);
    expect(store.getState().config.station.stationDescription).toBe(original);
  });

  it("blocks a protected field both at the setter and at Apply after a directly changed draft", () => {
    const definition = createLowCarrierAnd9960Scenario();
    definition.editPolicy = { mode: "restricted", allowedFieldIds: ["transmitters.tx1.nominal.outputPower"] };
    const store = createDvor1150PmdtStore();
    expect(store.getState().initializeStudentScenario(definition)).toBe(true);
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    const original = store.getState().config.station.stationDescription;
    store.getState().setConfigValue("station.stationDescription", "Rejected setter edit");
    expect(store.getState().configDraft.station.stationDescription).toBe(original);
    const changed = cloneDvor1150Config(store.getState().configDraft);
    changed.station.stationDescription = "Rejected direct draft edit";
    store.setState({ configDraft: changed, configDirty: true });
    expect(store.getState().applyConfigChanges()).toBe(false);
    expect(store.getState().config.station.stationDescription).toBe(original);
    expect(getDvor1150ScenarioProtectedFieldChanges(definition, changed)).toEqual([
      { fieldId: "station.stationDescription", label: "Station Description" },
    ]);
    expect(getDvor1150ScenarioProtectedFieldChanges({ ...definition, editPolicy: { mode: "open" } }, changed)).toEqual([]);
  });
});
