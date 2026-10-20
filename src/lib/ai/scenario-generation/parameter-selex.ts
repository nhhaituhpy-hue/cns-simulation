import { parseScenarioParameters, type ScenarioParametersDefinition, type ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { dvor1150ConfigFieldCatalog } from "@/lib/dvor1150/config-utils";
import { dvorConfigFieldCatalog } from "@/lib/dvor1150a/config-utils";
import { dmeParameterFieldCatalog } from "@/lib/dme1119a/config";
import { evaluateDvor1150Scenario, previewDvor1150Scenario, DVOR1150_BUILT_IN_SCENARIOS, isDvor1150ScenarioStudentEditable, type Dvor1150ScenarioDefinition } from "@/lib/dvor1150/scenario";
import { evaluateDvor1150aScenario, previewDvor1150aScenario, DVOR1150A_BUILT_IN_SCENARIOS, isDvor1150aScenarioStudentEditable, type Dvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { evaluateDme1119aScenario, previewDme1119aScenario, DME1119A_BUILT_IN_SCENARIOS, isDme1119aScenarioStudentEditable, type Dme1119aScenarioDefinition } from "@/lib/dme1119a/scenario";
import type { ParameterVerification, ParameterAssignment, ParameterValue, ScenarioParameterAdapter, ScenarioParameterField } from "./parameter-types";
import { AiScenarioError } from "./types";

import { createDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { createDmePmdtStore } from "@/stores/dme-pmdt-store";
import { dvor1150HardwareOccurrenceKey } from "@/modules/devices/dvor-1150/block-diagram-data";
import { dvorHardwareOccurrenceKey } from "@/modules/devices/dvor-1150a/block-diagram-data";
import { dme1119aHardwareOccurrenceKey } from "@/modules/devices/dme-1119a/block-diagram-data";

const startupKeys = {
  "dvor-1150": ["mainTransmitterId", "startLocal", "startMonitorBypassed"],
  "dvor-1150a": ["mainTransmitterId", "startLocal", "startMonitorBypassed"],
  "dme-1119a": ["mainTransmitterId", "startLocal", "integralMonitorBypassed", "standbyMonitorBypassed", "identMode"],
};
const successKeys = {
  "dvor-1150": ["requireIntegralMonitorNormal", "requireActiveTransmitter", "requireNoVswrExecutiveAlarm", "requireMonitorBypassCleared"],
  "dvor-1150a": ["requireIntegralMonitorNormal", "requireActiveTransmitter", "requireNoSidebandVswrAlarm", "requireMonitorBypassCleared"],
};
function assertPlain(value: unknown): void {
  if (!value || typeof value !== "object") return;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== (Array.isArray(value) ? Array.prototype : Object.prototype) && prototype !== null) invalid("Non-plain object prototype.");
  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) invalid("Prototype keys are forbidden.");
    assertPlain(child);
  }
}
function orderedLimits(value: unknown): void {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  for (const keys of [["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"], ["low", "preLow", "preHigh", "high"], ["preAlarm", "alarm"]]) {
    const relativeTiming = record.parameter === "Delay" || record.parameter === "Spacing";
    const values = keys.filter(k => typeof record[k] === "number" && !(relativeTiming && k === "nominal")).map(k => record[k] as number);
    if (values.some((v, i) => i > 0 && v < values[i - 1])) invalid("Monitor limit ordering is invalid.");
  }
  for (const child of Object.values(record)) orderedLimits(child);
}
type SelexDefinition = Dvor1150ScenarioDefinition | Dvor1150aScenarioDefinition | Dme1119aScenarioDefinition;
type NativeField = (typeof dvor1150ConfigFieldCatalog)[number] & { readOnly?: boolean };
const catalogs = { "dvor-1150": dvor1150ConfigFieldCatalog, "dvor-1150a": dvorConfigFieldCatalog, "dme-1119a": dmeParameterFieldCatalog };
function invalid(message: string): never { throw new AiScenarioError("INVALID_PARAMETERS", message); }
function native(moduleId: ScenarioParametersModuleId, definition: ScenarioParametersDefinition): SelexDefinition {
  assertPlain(definition);
  if (!Object.hasOwn(catalogs, moduleId)) return invalid("Unsupported SELEX module.");
  const parsed = parseScenarioParameters(moduleId, definition);
  if (!parsed) return invalid("Native scenario schema validation failed.");
  const d = parsed as SelexDefinition;
  const keys = startupKeys[moduleId as keyof typeof startupKeys];
  if (Object.keys(d.startPolicy).length !== keys.length || keys.some(k => !Object.hasOwn(d.startPolicy, k))) invalid("Startup fields differ from the server contract.");
  if (!Array.isArray(d.successCriteria)) {
    const criteria = successKeys[moduleId as keyof typeof successKeys];
    if (!criteria || Object.keys(d.successCriteria).length !== criteria.length || criteria.some(k => !Object.hasOwn(d.successCriteria, k))) invalid("Success fields differ from the server contract.");
  }
  const bypassed = "startMonitorBypassed" in d.startPolicy ? d.startPolicy.startMonitorBypassed : d.startPolicy.integralMonitorBypassed || d.startPolicy.standbyMonitorBypassed;
  if (bypassed && !d.startPolicy.startLocal) invalid("Monitor Bypass requires Local mode.");
  orderedLimits(d.configuration);
  return d;
}
function valueAt(object: unknown, path: string): ParameterValue | undefined {
  let current = object;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object" || !Object.hasOwn(current, part)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current === null || ["string", "number", "boolean"].includes(typeof current) ? current as ParameterValue : undefined;
}
function allowed(moduleId: ScenarioParametersModuleId, definition: SelexDefinition, id: string): boolean {
  // Monitor thresholds/routing/calibration are authoring settings, never an AI recovery shortcut.
  const physical = /^(transmitters\.(tx1|tx2)\.(nominal|offsets)\.|txConfigNominal\.|txOffsets\.)/.test(id)
    && !/(Limit|Threshold|Variance|\.vswr\.|Vswr)/i.test(id);
  if (!physical) return false;
  if (moduleId === "dvor-1150") return isDvor1150ScenarioStudentEditable(definition as Dvor1150ScenarioDefinition, id);
  if (moduleId === "dvor-1150a") return isDvor1150aScenarioStudentEditable(definition as Dvor1150aScenarioDefinition, id);
  return isDme1119aScenarioStudentEditable(definition as Dme1119aScenarioDefinition, id);
}
function fields(moduleId: ScenarioParametersModuleId, input: ScenarioParametersDefinition): ScenarioParameterField[] {
  const definition = native(moduleId, input);
  const catalog: readonly NativeField[] = catalogs[moduleId as keyof typeof catalogs];
  const result: ScenarioParameterField[] = catalog.flatMap(field => {
    const value = valueAt(definition.configuration, field.id);
    if (field.readOnly || value === undefined || /security|password|credential|smoke|intrusion|entryDelay|exitDelay/i.test(field.id)) return [];
    if (/^simulation\.|^transmitters\.(tx1|tx2)\.(enabled|onAir|load)$|^monitorTransmitterStatus\.(mainSelect|antennaSelect|transmitterOn\.)/.test(field.id)) return [];
    const { label, unit, min, max, step, options } = field;
    return [{ id: `configuration.${field.id}`, label, group: "configuration", type: field.type === "select" ? "enum" : field.type, value, unit, min, max, step, options, recovery: allowed(moduleId, definition, field.id) }];
  });
  for (const [key, value] of Object.entries(definition.startPolicy)) {
    result.push({ id: `startPolicy.${key}`, label: key, group: "startup", type: typeof value === "boolean" ? "boolean" : "enum", value, options: key === "mainTransmitterId" ? ["tx1", "tx2"] : key === "identMode" ? ["normal", "off", "continuous"] : undefined, recovery: key !== "identMode" });
  }
  if (!Array.isArray(definition.successCriteria)) {
    for (const [key, value] of Object.entries(definition.successCriteria)) {
      result.push({ id: `successCriteria.${key}`, label: key, group: "success", type: "boolean", value, recovery: false });
    }
  }
  return result;
}
function assignments(catalog: ScenarioParameterField[], changes: readonly ParameterAssignment[]): void {
  if (!Array.isArray(changes)) invalid("Assignments must be an array.");
  const seen = new Set<string>();
  for (const change of changes) {
    assertPlain(change);
    if (!change || typeof change !== "object" || !Object.hasOwn(change, "fieldId") || !Object.hasOwn(change, "value") || typeof change.fieldId !== "string") invalid("Invalid assignment.");
    const field = catalog.find(item => item.id === change.fieldId);
    if (!field || seen.has(change.fieldId) || change.fieldId.split(".").some((p: string) => ["__proto__", "prototype", "constructor"].includes(p))) invalid(`Unknown or duplicate field: ${change.fieldId}`);
    seen.add(change.fieldId);
    const value = change.value;
    if (field.type === "number" && (typeof value !== "number" || !Number.isFinite(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max))) invalid(`Invalid number: ${field.id}`);
    if (field.type === "boolean" && typeof value !== "boolean") invalid(`Invalid boolean: ${field.id}`);
    if ((field.type === "enum" || field.type === "text") && typeof value !== "string") invalid(`Invalid string: ${field.id}`);
    if (field.type === "enum" && !field.options?.includes(value as string)) invalid(`Invalid option: ${field.id}`);
    if (field.group === "success" && value !== true) invalid("Success requirements cannot be disabled.");
  }
}
function setKnown(object: object, path: string, value: ParameterValue): void {
  const parts = path.split(".");
  let cursor = object as Record<string, unknown>;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] as Record<string, unknown>;
  cursor[parts.at(-1)!] = value;
}
function apply(moduleId: ScenarioParametersModuleId, input: ScenarioParametersDefinition, changes: readonly ParameterAssignment[]): ScenarioParametersDefinition {
  const definition = native(moduleId, input);
  assignments(fields(moduleId, definition), changes);
  for (const change of changes) setKnown(definition, change.fieldId, change.value);
  return native(moduleId, definition);
}
function recoveryError(message: string): never { throw new AiScenarioError("INVALID_RECOVERY", message); }
function verify(moduleId: ScenarioParametersModuleId, input: ScenarioParametersDefinition, recovery: readonly ParameterAssignment[]): ParameterVerification {
  const definition = native(moduleId, input);
  const catalog = fields(moduleId, definition);
  assignments(catalog, recovery);
  for (const change of recovery) if (!catalog.find(f => f.id === change.fieldId)?.recovery) recoveryError(`Not a permitted recovery control: ${change.fieldId}`);
  const diagnosis = definition.diagnosis;
  const evidence = {
    visitedViewIds: diagnosis?.pmdtCheckpoints.map(c => c.viewId) ?? [],
    acceptedActionControlIds: diagnosis?.requiredActionControlIds ?? [],
    selectedHardwareOccurrenceKeys: [] as string[],
    hardwareDispositionConfirmed: true,
  };
  const notes = ["Detached native engine; authorized maintenance context. PMDT visits, required actions and hardware disposition are synthetic verification evidence, not student evidence."];
  const hardware = diagnosis?.disposition === "replace-module";
  if (hardware) {
    const templates = moduleId === "dvor-1150" ? DVOR1150_BUILT_IN_SCENARIOS : moduleId === "dvor-1150a" ? DVOR1150A_BUILT_IN_SCENARIOS : DME1119A_BUILT_IN_SCENARIOS;
    const match = templates.map(t => t.create()).find(t => JSON.stringify(t.diagnosis) === JSON.stringify(diagnosis)
      && JSON.stringify(t.configuration) === JSON.stringify(definition.configuration)
      && JSON.stringify("faultInjections" in t ? t.faultInjections : []) === JSON.stringify("faultInjections" in definition ? definition.faultInjections : []));
    if (!match) recoveryError("Hardware diagnosis/stimulus must match the same native hardware template.");
  }
  if (moduleId === "dvor-1150") {
    const d = definition as Dvor1150ScenarioDefinition;
    const preview = previewDvor1150Scenario(d);
    const store = createDvor1150PmdtStore();
    store.setState({ config: preview.config, configDraft: structuredClone(preview.config), derived: preview.snapshot, scenario: { active: true, definition: d, startedAt: null }, securityLevel: 3, loginDialogOpen: false });
    const evaluate = () => { const state = store.getState(); return evaluateDvor1150Scenario(state.scenario, state.derived, state.config, evidence); };
    const initial = evaluate();
    const neutral = previewDvor1150Scenario({ ...d, startPolicy: { ...d.startPolicy, startMonitorBypassed: false } });
    const physical = evaluateDvor1150Scenario(store.getState().scenario, neutral.snapshot, neutral.config, evidence);
    if (hardware) evidence.selectedHardwareOccurrenceKeys = d.diagnosis!.expectedHardware.map(dvor1150HardwareOccurrenceKey);
    replay(recovery, (id, value) => {
      const state = store.getState();
      if (id === "startPolicy.startLocal") return state.setLocalMode(value as boolean);
      if (id === "startPolicy.startMonitorBypassed") return state.setMonitorBypass("mon1", value as boolean);
      if (id === "startPolicy.mainTransmitterId") return state.setTransmitterMode(value as "tx1" | "tx2", "main");
      const field = id.slice(14);
      state.setConfigValue(field, value);
      return valueAt(store.getState().configDraft, field) === value && (!store.getState().configDirty || store.getState().applyConfigChanges());
    });
    return result(initial, evaluate(), hardware, notes, physical);
  }
  if (moduleId === "dvor-1150a") {
    const d = definition as Dvor1150aScenarioDefinition;
    const preview = previewDvor1150aScenario(d);
    const store = createVorPmdtStore();
    store.setState({ config: preview.config, configDraft: structuredClone(preview.config), derived: preview.snapshot, data: preview.snapshot.data, scenario: { active: true, definition: d, startedAt: null }, securityLevel: 3, loginDialogOpen: false });
    const evaluate = () => { const state = store.getState(); return evaluateDvor1150aScenario(state.scenario, state.derived, state.config, evidence); };
    const initial = evaluate();
    const neutral = previewDvor1150aScenario({ ...d, startPolicy: { ...d.startPolicy, startMonitorBypassed: false } });
    const physical = evaluateDvor1150aScenario(store.getState().scenario, neutral.snapshot, neutral.config, evidence);
    if (hardware) evidence.selectedHardwareOccurrenceKeys = d.diagnosis!.expectedHardware.map(dvorHardwareOccurrenceKey);
    replay(recovery, (id, value) => {
      const state = store.getState();
      if (id === "startPolicy.mainTransmitterId") return state.selectMainTransmitter(value as "tx1" | "tx2");
      if (id.startsWith("startPolicy.")) {
        const field = id === "startPolicy.startLocal" ? "simulation.local" : "simulation.integralMonitorBypass";
        state.setConfigValue(field, value);
        return valueAt(store.getState().config, field) === value;
      }
      const field = id.slice(14);
      state.setConfigValue(field, value);
      return valueAt(store.getState().configDraft, field) === value && (!store.getState().configDirty || store.getState().applyConfigChanges());
    });
    return result(initial, evaluate(), hardware, notes, physical);
  }
  const d = definition as Dme1119aScenarioDefinition;
  const preview = previewDme1119aScenario(d);
  const store = createDmePmdtStore();
  store.setState({ data: preview.data, configDraft: structuredClone(preview.data), scenario: { active: true, definition: d, startedAt: null }, securityLevel: 3, loginDialogOpen: false });
  const evaluate = () => {
    const state = store.getState();
    const evaluation = evaluateDme1119aScenario(state.scenario, state.data, evidence);
    if (hardware) evaluation.checks.push({ id: "native-ac-power", label: "Native AC power status", passed: !state.data.rmsStatus.acFailure, detail: state.data.rmsStatus.acFailure ? "AC failure / battery operation" : "AC normal" });
    return evaluation;
  };
  const initial = evaluate();
  const neutral = previewDme1119aScenario({ ...d, startPolicy: { ...d.startPolicy, integralMonitorBypassed: false, standbyMonitorBypassed: false } });
  const physical = evaluateDme1119aScenario(store.getState().scenario, neutral.data, evidence);
  if (hardware) physical.checks.push({ id: "native-ac-power", label: "Native AC power status", passed: !neutral.data.rmsStatus.acFailure, detail: neutral.data.rmsStatus.acFailure ? "AC failure / battery operation" : "AC normal" });
  if (hardware) evidence.selectedHardwareOccurrenceKeys = d.diagnosis!.expectedHardware.map(dme1119aHardwareOccurrenceKey);
  replay(recovery, (id, value) => {
    const state = store.getState();
    if (id === "startPolicy.startLocal") return state.setLocalMode(value as boolean);
    if (id === "startPolicy.mainTransmitterId") return state.setTransmitterMode(value as "tx1" | "tx2", "antenna");
    if (id === "startPolicy.integralMonitorBypassed") return state.setMonitorBypass("integral", value as boolean);
    if (id === "startPolicy.standbyMonitorBypassed") return state.setMonitorBypass("standby", value as boolean);
    if (id === "startPolicy.identMode") return recoveryError("Ident mode recovery is not replayable.");
    const field = id.slice(14);
    state.setParameterValue(field, value);
    return valueAt(store.getState().configDraft, field) === value && (!store.getState().configDirty || store.getState().applyConfigChanges());
  });
  return result(initial, evaluate(), hardware, notes, physical);
}
function replay(recovery: readonly ParameterAssignment[], act: (id: string, value: ParameterValue) => boolean): void {
  for (const change of recovery) if (!act(change.fieldId, change.value)) recoveryError(`Native Local/Bypass/policy guard rejected ${change.fieldId}.`);
}
type Evaluation = { solved: boolean; checks: Array<{ id: string; passed: boolean; detail: string }>; blockers: string[] };
function result(initial: Evaluation, recovered: Evaluation, hardware: boolean, notes: string[], physical: Evaluation): ParameterVerification {
  const meaningfulFault = physical.checks.some(c => !c.passed && !/bypass|pmdt-|action-|hardware-selection/.test(c.id));
  if (!meaningfulFault || initial.solved) recoveryError("Initial native state has no meaningful unsolved fault.");
  if (!recovered.solved || recovered.blockers.length || (!hardware && recovered.checks.some(c => !c.passed))) recoveryError(`Native recovery did not pass: ${recovered.blockers.join("; ") || recovered.checks.filter(c => !c.passed).map(c => c.id).join(", ")}`);
  if (hardware) notes.push("Native diagnosis completion only; synthetic hardware selection does not replace an LRU or demonstrate operational normality.");
  return { mode: hardware ? "native-diagnosis" : "engine-recovery", initial: initial.checks, recovered: recovered.checks, recoveryVerified: true, notes };
}
export const selexParameterAdapter: ScenarioParameterAdapter = { fields, apply, verify };
