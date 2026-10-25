import { expect, it } from "vitest";
import { createDefaultDme1119aScenarioDefinition, evaluateDme1119aScenario, parseDme1119aScenarioDefinition, validateDme1119aScenarioDefinition } from "@/lib/dme1119a/scenario";
import { hydrateDme1119aData } from "@/lib/simulator-config/dme-1119a";
import { setDmeParameterValue } from "@/lib/dme1119a/config";
import { createDmePmdtStore } from "@/stores/dme-pmdt-store";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import { getDefaultDme1119aConfig as legacyConfig } from "../fixtures/dme-config-fa138e9/parser";
import type { Dme1119aScenarioDefinition } from "@/lib/dme1119a/scenario";
import { legacyIsCriterion } from "../fixtures/dme-config-fa138e9/criterion";
import { createHpaChangeoverDme1119aScenario, previewDme1119aScenario } from "@/lib/dme1119a/scenario";
import { dme1119aHardwareOccurrenceKey } from "@/modules/devices/dme-1119a/block-diagram-data";
import { evaluateScenarioExamResult } from "@/lib/scenario-exams/evaluation";

it("requires the exact applied scalar even while monitor readings remain normal", () => {
  const legacy = createDefaultDme1119aScenarioDefinition();
  const definition = parseDme1119aScenarioDefinition({ ...legacy, successCriteria: [{ id: "exact", kind: "configuration-values", targets: [{ fieldId: "txConfigNominal.rtcParameters.powerOutput", value: -1.25 }] }] });
  expect(definition).not.toBeNull();
  const runtime = { active: true, definition: definition!, startedAt: null };
  const data = hydrateDme1119aData(legacy.configuration);
  const initial = evaluateDme1119aScenario(runtime, data);
  expect(initial.solved).toBe(false);
  expect(initial.checks.some(check => check.id === "exact" && !check.passed)).toBe(true);
  const updated = setDmeParameterValue(data, "txConfigNominal.rtcParameters.powerOutput", -1.25);
  expect(evaluateDme1119aScenario(runtime, updated).solved).toBe(true);
  expect(evaluateDme1119aScenario(runtime, setDmeParameterValue(updated, "txConfigNominal.rtcParameters.powerOutput", -1.24)).solved).toBe(false);
});

it("allows the advanced authoring form to read and edit exact targets", () => {
  const definition = createDefaultDme1119aScenarioDefinition();
  const criteria = [{ id: "exact", kind: "configuration-values", targets: [{ fieldId: "txConfigNominal.rtcParameters.powerOutput", value: -1.25 }] }];
  const adapter = authoringAdapterFor("dme-1119a");
  const changed = adapter.apply(definition, [{ fieldId: "successCriteria", value: criteria }]);
  expect((changed as Dme1119aScenarioDefinition).successCriteria).toEqual(criteria);
  expect(adapter.validate(changed, "final")).toEqual([]);
});

it("exposes newly persisted settings when the authoring form opens an old scenario", () => {
  const definition = { ...createDefaultDme1119aScenarioDefinition(), configuration: legacyConfig() } as Dme1119aScenarioDefinition;
  const adapter = authoringAdapterFor("dme-1119a");
  const form = adapter.form(definition);
  expect(form.fields.some(field => field.id === "configuration.monitorOffsets.monitor1.0.integral")).toBe(true);
  const changed = adapter.apply(definition, [{ fieldId: "configuration.monitorOffsets.monitor1.0.integral", value: 2.5 }]);
  expect((changed as Dme1119aScenarioDefinition).configuration).toHaveProperty("monitorOffsets.monitor1.0.integral", 2.5);
});

it("grades running settings only after native Apply, with other exact targets still required", () => {
  const store = createDmePmdtStore();
  const account = store.getState().data.securityAccounts.find(item => item.securityLevel === 3)!;
  expect(store.getState().login(account.userId, account.password)).toBe(true);
  store.getState().setLocalMode(true); store.getState().setScenarioAuthoringEnabled(true);
  const definition = createDefaultDme1119aScenarioDefinition();
  definition.startPolicy.integralMonitorBypassed = true;
  definition.startPolicy.standbyMonitorBypassed = true;
  definition.successCriteria = [{ id: "exact", kind: "configuration-values", targets: [
    { fieldId: "txConfigNominal.rtcParameters.powerOutput", value: -1.25 },
    { fieldId: "monitorOffsets.monitor1.0.integral", value: 2.5 },
    { fieldId: "rmsVoltageData.0.enabled", value: true },
  ] }];
  store.getState().replaceScenarioDraft(definition); expect(store.getState().applyScenario()).toBe(true);
  const evaluate = () => evaluateDme1119aScenario(store.getState().scenario, store.getState().data);
  store.getState().setParameterValue("txConfigNominal.rtcParameters.powerOutput", -1.25);
  expect(evaluate().solved).toBe(false);
  expect(store.getState().applyConfigChanges()).toBe(true); expect(evaluate().solved).toBe(false);
  store.getState().setParameterValue("monitorOffsets.monitor1.0.integral", 2.5);
  store.getState().setParameterValue("rmsVoltageData.0.enabled", true);
  expect(evaluate().solved).toBe(false);
  expect(store.getState().applyConfigChanges()).toBe(true); expect(evaluate().solved).toBe(true);
});

it("rejects a target that requires changing a protected field, without granting permission", () => {
  const definition = createDefaultDme1119aScenarioDefinition();
  definition.editPolicy = { mode: "restricted", allowedFieldIds: [] };
  definition.studentEditableFieldIds = [];
  definition.successCriteria = [{ id: "exact", kind: "configuration-values", targets: [{ fieldId: "txConfigNominal.rtcParameters.powerOutput", value: -1.25 }] }];
  expect(parseDme1119aScenarioDefinition(definition)).toBeNull();
  expect(definition.editPolicy.allowedFieldIds).toEqual([]);
});

function routingScenario(allowedFieldIds: string[], targets: { fieldId: string; value: boolean }[]) {
  const definition = createDefaultDme1119aScenarioDefinition();
  definition.editPolicy = { mode: "restricted", allowedFieldIds };
  definition.successCriteria = [{ id: "routing", kind: "configuration-values", targets }];
  return definition;
}

function routingStore(definition: Dme1119aScenarioDefinition) {
  const store = createDmePmdtStore();
  const account = store.getState().data.securityAccounts.find(item => item.securityLevel === 3)!;
  expect(store.getState().login(account.userId, account.password)).toBe(true);
  store.getState().setLocalMode(true);
  // Install the baseline directly so rejected authoring inputs still exercise
  // the unchanged native setter and Apply protection, without bypassing either.
  const data = previewDme1119aScenario(definition).data;
  store.setState({ data, configDraft: structuredClone(data), scenario: { active: true, definition, startedAt: null } });
  return store;
}

it("rejects a routing target whose native selection changes a locked companion", () => {
  const primary = "monitorConfigGeneral.1.primary";
  const secondary = "monitorConfigGeneral.1.secondary";
  const definition = routingScenario([secondary], [{ fieldId: secondary, value: true }]);
  const store = routingStore(definition);
  expect(store.getState().data.monitorConfigGeneral[1]).toMatchObject({ primary: true, secondary: false });
  store.getState().setParameterValue(secondary, true);
  expect(store.getState().configDraft.monitorConfigGeneral[1]).toMatchObject({ primary: false, secondary: true });
  expect(store.getState().applyConfigChanges()).toBe(false);
  expect(store.getState().lastCommand).toContain("Scenario protected field blocked:");
  expect(store.getState().data.monitorConfigGeneral[1]).toMatchObject({ primary: true, secondary: false });
  expect(validateDme1119aScenarioDefinition(definition).length).toBeGreaterThan(0);
  expect(parseDme1119aScenarioDefinition(definition) === null).toBe(true);
  expect(definition.editPolicy).toEqual({ mode: "restricted", allowedFieldIds: [secondary] });
  expect(definition.studentEditableFieldIds).not.toContain(primary);
});

it.each([true, false])("rejects incompatible routing pair targets (%s), including across criteria", value => {
  const primary = "monitorConfigGeneral.1.primary";
  const secondary = "monitorConfigGeneral.1.secondary";
  const definition = routingScenario([], [{ fieldId: primary, value }, { fieldId: secondary, value }]);
  definition.editPolicy = { mode: "open" };
  const store = routingStore(definition);
  // These are the only selections exposed by the native radio screen.
  for (const fieldId of [secondary, primary]) {
    store.getState().setParameterValue(fieldId, true);
    expect(store.getState().applyConfigChanges()).toBe(true);
    const row = store.getState().data.monitorConfigGeneral[1];
    expect(row.primary === value && row.secondary === value).toBe(false);
  }
  expect(parseDme1119aScenarioDefinition(definition) === null).toBe(true);
  definition.successCriteria = [
    { id: "primary", kind: "configuration-values", targets: [{ fieldId: primary, value }] },
    { id: "secondary", kind: "configuration-values", targets: [{ fieldId: secondary, value }] },
  ];
  expect(parseDme1119aScenarioDefinition(definition) === null).toBe(true);
});

it.each(["primary", "secondary"] as const)("rejects a false %s target without permission to select its companion", selected => {
  const companion = selected === "primary" ? "secondary" : "primary";
  const fieldId = `monitorConfigGeneral.1.${selected}`;
  const companionId = `monitorConfigGeneral.1.${companion}`;
  const definition = routingScenario([fieldId], [{ fieldId, value: false }]);
  Object.assign(definition.configuration.monitorConfigGeneral[1], { [selected]: true, [companion]: false });
  const store = routingStore(definition);
  store.getState().setParameterValue(companionId, true);
  expect(store.getState().configDraft.monitorConfigGeneral[1][selected]).toBe(true);
  expect(store.getState().applyConfigChanges()).toBe(false);
  expect(parseDme1119aScenarioDefinition(definition) === null).toBe(true);
  expect(definition.editPolicy).toEqual({ mode: "restricted", allowedFieldIds: [fieldId] });
});

it.each(["primary", "secondary"] as const)("accepts a coupled transition to %s only with both changed fields allowed", selected => {
  const companion = selected === "primary" ? "secondary" : "primary";
  const fieldId = `monitorConfigGeneral.1.${selected}`;
  const companionId = `monitorConfigGeneral.1.${companion}`;
  const definition = routingScenario([fieldId, companionId], [{ fieldId, value: true }, { fieldId: companionId, value: false }]);
  Object.assign(definition.configuration.monitorConfigGeneral[1], { [selected]: false, [companion]: true });
  expect(parseDme1119aScenarioDefinition(definition) !== null).toBe(true);
  const store = routingStore(definition);
  const solved = () => evaluateDme1119aScenario(store.getState().scenario, store.getState().data).solved;
  expect(solved()).toBe(false);
  store.getState().setParameterValue(fieldId, true);
  expect(solved()).toBe(false);
  expect(store.getState().applyConfigChanges()).toBe(true);
  expect(solved()).toBe(true);
  expect(store.getState().data.monitorConfigGeneral[1]).toMatchObject({ [selected]: true, [companion]: false });
  expect(definition.editPolicy).toEqual({ mode: "restricted", allowedFieldIds: [fieldId, companionId] });
});

it.each([true, false])("allows a single %s routing target through the permitted native companion route", value => {
  const primary = "monitorConfigGeneral.1.primary";
  const secondary = "monitorConfigGeneral.1.secondary";
  const definition = routingScenario([primary, secondary], [{ fieldId: value ? secondary : primary, value }]);
  const store = createDmePmdtStore();
  const account = store.getState().data.securityAccounts.find(item => item.securityLevel === 3)!;
  expect(store.getState().login(account.userId, account.password)).toBe(true);
  store.getState().setLocalMode(true);
  store.getState().setScenarioAuthoringEnabled(true);
  store.getState().replaceScenarioDraft(definition);
  expect(store.getState().applyScenario()).toBe(true);
  store.getState().setParameterValue(secondary, true);
  expect(evaluateDme1119aScenario(store.getState().scenario, store.getState().data).solved).toBe(false);
  expect(store.getState().applyConfigChanges()).toBe(true);
  expect(evaluateDme1119aScenario(store.getState().scenario, store.getState().data).solved).toBe(true);
});

it("does not require permission for an unchanged companion or already-satisfied legacy pair", () => {
  const primary = "monitorConfigGeneral.1.primary";
  const secondary = "monitorConfigGeneral.1.secondary";
  const definition = routingScenario([secondary], [{ fieldId: secondary, value: true }]);
  Object.assign(definition.configuration.monitorConfigGeneral[1], { primary: false, secondary: false });
  expect(validateDme1119aScenarioDefinition(definition)).toEqual([]);
  const store = routingStore(definition);
  store.getState().setParameterValue(secondary, true);
  expect(store.getState().applyConfigChanges()).toBe(true);
  definition.editPolicy = { mode: "restricted", allowedFieldIds: [] };
  definition.successCriteria = [{ id: "routing", kind: "configuration-values", targets: [
    { fieldId: primary, value: false }, { fieldId: secondary, value: false },
  ] }];
  expect(validateDme1119aScenarioDefinition(definition)).toEqual([]);
  expect(parseDme1119aScenarioDefinition(definition) !== null).toBe(true);
});

it("keeps satisfied locked routing values and old scenarios valid without widening permissions", () => {
  const primary = "monitorConfigGeneral.1.primary";
  const secondary = "monitorConfigGeneral.1.secondary";
  const definition = routingScenario([], [{ fieldId: primary, value: true }, { fieldId: secondary, value: false }]);
  expect(validateDme1119aScenarioDefinition(definition)).toEqual([]);
  expect(parseDme1119aScenarioDefinition(definition) !== null).toBe(true);
  const store = routingStore(definition);
  expect(evaluateDme1119aScenario(store.getState().scenario, store.getState().data).solved).toBe(true);
  store.getState().setParameterValue(secondary, true);
  expect(store.getState().configDraft.monitorConfigGeneral[1].secondary).toBe(false);
  delete definition.editPolicy;
  expect(parseDme1119aScenarioDefinition(definition) !== null).toBe(true);
  definition.successCriteria = createDefaultDme1119aScenarioDefinition().successCriteria;
  Object.assign(definition.configuration.monitorConfigGeneral[1], { primary: false, secondary: false });
  expect(validateDme1119aScenarioDefinition(definition)).toEqual([]);
});

it("retains old scenario JSON byte-equivalent and reads it without mutating published snapshots", () => {
  const definition = { ...createDefaultDme1119aScenarioDefinition(), configuration: legacyConfig() };
  const bytes = JSON.stringify(definition);
  expect(JSON.stringify(parseDme1119aScenarioDefinition(JSON.parse(bytes)))).toBe(bytes);
});

it("old consumers reject the new criterion instead of silently ignoring exact requirements", () => {
  expect(createDefaultDme1119aScenarioDefinition().successCriteria.every(legacyIsCriterion)).toBe(true);
  expect(legacyIsCriterion({ id: "exact", kind: "configuration-values", targets: [{ fieldId: "txOffsets.0.tx1", value: 60 }] })).toBe(false);
});

it("hardware diagnosis cannot skip an explicit exact configuration requirement", () => {
  const definition = createHpaChangeoverDme1119aScenario();
  definition.editPolicy = { mode: "open" }; definition.studentEditableFieldIds = [];
  definition.successCriteria.push({ id: "exact", kind: "configuration-values", targets: [{ fieldId: "txConfigNominal.rtcParameters.powerOutput", value: -1.25 }] });
  expect(parseDme1119aScenarioDefinition(definition)).not.toBeNull();
  const evidence = { visitedViewIds: definition.diagnosis!.pmdtCheckpoints.map(item => item.viewId), acceptedActionControlIds: definition.diagnosis!.requiredActionControlIds, selectedHardwareOccurrenceKeys: definition.diagnosis!.expectedHardware.map(dme1119aHardwareOccurrenceKey) };
  const data = previewDme1119aScenario(definition).data;
  const runtime = { active: true, definition, startedAt: null };
  expect(evaluateDme1119aScenario(runtime, data, evidence).solved).toBe(false);
  expect(evaluateDme1119aScenario(runtime, setDmeParameterValue(data, "txConfigNominal.rtcParameters.powerOutput", -1.25), evidence).solved).toBe(true);
});

it("malformed criteria yield validation errors rather than throwing during target inspection", () => {
  const bad = { ...createDefaultDme1119aScenarioDefinition(), successCriteria: [null] };
  expect(() => validateDme1119aScenarioDefinition(bad as unknown as Dme1119aScenarioDefinition)).not.toThrow();
  expect(validateDme1119aScenarioDefinition(bad as unknown as Dme1119aScenarioDefinition).length).toBeGreaterThan(0);
});

it("server exam grading ignores client solved claims and correctly evaluates saved applied data", () => {
  const definition = createDefaultDme1119aScenarioDefinition();
  definition.successCriteria = [{ id: "exact", kind: "configuration-values", targets: [{ fieldId: "monitorOffsets.monitor1.0.integral", value: 2.5 }] }];
  const data = hydrateDme1119aData(definition.configuration);
  const edited = setDmeParameterValue(data, "monitorOffsets.monitor1.0.integral", 2.5);
  expect(evaluateScenarioExamResult("dme-1119a", definition, { solved: true, checkpoint: { data, configDraft: edited } })).toMatchObject({ status: "IN_PROGRESS", solved: false });
  expect(evaluateScenarioExamResult("dme-1119a", definition, { checkpoint: { data: edited, configDraft: data } })).toMatchObject({ status: "SOLVED", solved: true });
  expect(evaluateScenarioExamResult("dme-1119a", definition, { solved: true, checkpoint: { configDraft: edited } }).status).toBe("UNVERIFIED");
});

it.each([
  [{ fieldId: "connected", value: true }],
  [{ fieldId: "sidebarParams.delay.value", value: 50 }],
  [{ fieldId: "securityAccounts.0.password", value: "not-allowed" }],
  [{ fieldId: "txConfigNominal.ident.selfKeyOnLoss", value: true }],
  [{ fieldId: "txConfigNominal.rtcParameters.powerOutput", value: 200 }],
  [{ fieldId: "txConfigNominal.rtcParameters.powerOutput", value: "1" }],
  [{ fieldId: "rmsConfigStation.channelNumber", value: 1.5 }],
  [{ fieldId: "rmsConfigGeneral.votingLogic", value: "arbitrary" }],
  [{ fieldId: "monitorOffsets.monitor1.2.integral", value: 1 }],
  [{ fieldId: "monitorOffsets.monitor1.0.integral", value: Infinity }],
  [{ fieldId: "monitorOffsets.monitor1.0.integral", value: 1, unexpected: true }],
  [{ fieldId: "monitorOffsets.monitor1.0.integral", value: 1 }, { fieldId: "monitorOffsets.monitor1.0.integral", value: 2 }],
  [],
].map(targets => ({ targets })))("rejects invalid exact target collection $targets", ({ targets }) => {
  const definition = { ...createDefaultDme1119aScenarioDefinition(), successCriteria: [{ id: "exact", kind: "configuration-values", targets }] };
  expect(parseDme1119aScenarioDefinition(definition)).toBeNull();
});
