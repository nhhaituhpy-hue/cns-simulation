import { cloneDvor1150Config, defaultDvor1150Config } from "./defaults";
import { buildDvor1150Snapshot } from "./engine";
import {
  dvor1150ConfigFieldCatalog,
  getDvor1150ConfigValue,
  validateDvor1150Config,
} from "./config-utils";
import type {
  Dvor1150Config,
  Dvor1150Snapshot,
  Dvor1150TransmitterId,
} from "./types";

export const DVOR1150_SCENARIO_SCHEMA_VERSION = 2 as const;

export type Dvor1150ScenarioDifficulty = "basic" | "intermediate" | "advanced";

/**
 * A scenario is intentionally independent from persistent station settings.
 * It captures a complete starting configuration plus the PMDT operating state
 * the student receives at the beginning of an exercise.
 */
export interface Dvor1150ScenarioDefinition {
  schemaVersion: 2;
  id: string;
  name: string;
  description: string;
  difficulty: Dvor1150ScenarioDifficulty;
  configuration: Dvor1150Config;
  startPolicy: {
    mainTransmitterId: Dvor1150TransmitterId;
    startLocal: boolean;
    startMonitorBypassed: boolean;
  };
  successCriteria: {
    requireIntegralMonitorNormal: boolean;
    requireActiveTransmitter: boolean;
    requireNoVswrExecutiveAlarm: boolean;
    requireMonitorBypassCleared: boolean;
  };
  /**
   * Physical recovery controls that the student may edit during this scenario.
   * All remaining configuration fields are held at the examiner's baseline so
   * an alarm cannot be cleared by altering monitor thresholds or calibration.
   */
  studentEditableFieldIds: string[];
}

export interface Dvor1150ScenarioRuntime {
  active: boolean;
  definition: Dvor1150ScenarioDefinition | null;
  startedAt: string | null;
}

export interface Dvor1150ScenarioEvaluation {
  solved: boolean;
  correctable: boolean;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    detail: string;
  }>;
  blockers: string[];
}

export interface Dvor1150ScenarioProtectedFieldChange {
  fieldId: string;
  label: string;
}

export function createDefaultDvor1150ScenarioDefinition(): Dvor1150ScenarioDefinition {
  return {
    schemaVersion: DVOR1150_SCENARIO_SCHEMA_VERSION,
    id: "custom-dvor1150-scenario",
    name: "Custom DVOR 1150 Scenario",
    description: "Session-only training baseline derived from Đài TEST/TST.",
    difficulty: "basic",
    configuration: cloneDvor1150Config(defaultDvor1150Config),
    startPolicy: {
      mainTransmitterId: "tx1",
      startLocal: false,
      startMonitorBypassed: false,
    },
    successCriteria: {
      requireIntegralMonitorNormal: true,
      requireActiveTransmitter: true,
      requireNoVswrExecutiveAlarm: true,
      requireMonitorBypassCleared: true,
    },
    studentEditableFieldIds: [],
  };
}

export function createLowCarrierAnd9960Scenario(): Dvor1150ScenarioDefinition {
  const scenario = createDefaultDvor1150ScenarioDefinition();
  scenario.id = "tx1-low-carrier-9960";
  scenario.name = "TX1 Low Carrier and 9960 Hz Modulation";
  scenario.description = "TX1 starts with low carrier power, causing low RF level and 9960 Hz modulation. Restore nominal output power through PMDT Transmitter Configuration, then release Monitor Bypass to prove Normal operation.";
  scenario.difficulty = "intermediate";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.transmitters.tx1.nominal.outputPower = 40;
  scenario.studentEditableFieldIds = [
    "transmitters.tx1.nominal.outputPower",
    "transmitters.tx1.offsets.outputPowerScale",
  ];
  return scenario;
}

export function createReferenceModulationScenario(): Dvor1150ScenarioDefinition {
  const scenario = createDefaultDvor1150ScenarioDefinition();
  scenario.id = "tx1-low-reference-modulation";
  scenario.name = "TX1 Low Reference Modulation";
  scenario.description = "TX1 30 Hz reference modulation is below nominal. Correct the Transmitter Nominal reference modulation and release Monitor Bypass after the Monitor is Normal.";
  scenario.difficulty = "basic";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.transmitters.tx1.nominal.referenceModulation = 25;
  scenario.studentEditableFieldIds = [
    "transmitters.tx1.nominal.referenceModulation",
    "transmitters.tx1.offsets.referenceModulationScale",
  ];
  return scenario;
}

export function createSidebandVswrScenario(): Dvor1150ScenarioDefinition {
  const scenario = createDefaultDvor1150ScenarioDefinition();
  scenario.id = "tx1-sideband-vswr-executive-alarm";
  scenario.name = "TX1 Sideband VSWR Executive Alarm";
  scenario.description = "Sideband RF scaling creates elevated antenna VSWR and an executive alarm. Correct the affected TX1 Sideband RF Scales, then release Monitor Bypass to confirm the alarm clears.";
  scenario.difficulty = "advanced";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.monitor.sidebandVswrTolerance = 1.25;
  scenario.configuration.monitor.sidebandVswrExecutiveAlarm = true;
  scenario.configuration.monitor.numberOfAntennasInAlarm = 1;
  scenario.configuration.transmitters.tx1.offsets.sideband1RfLevelScale = 200;
  scenario.configuration.transmitters.tx1.offsets.sideband2RfLevelScale = 200;
  scenario.studentEditableFieldIds = [
    "transmitters.tx1.offsets.sideband1RfLevelScale",
    "transmitters.tx1.offsets.sideband2RfLevelScale",
  ];
  return scenario;
}

export const DVOR1150_BUILT_IN_SCENARIOS = [
  { id: "default", label: "New from Đài TEST/TST", create: createDefaultDvor1150ScenarioDefinition },
  { id: "carrier-9960", label: "TX1 low carrier + 9960 Hz", create: createLowCarrierAnd9960Scenario },
  { id: "reference-modulation", label: "TX1 low 30 Hz reference modulation", create: createReferenceModulationScenario },
  { id: "sideband-vswr", label: "TX1 sideband VSWR executive alarm", create: createSidebandVswrScenario },
] as const;

/** Applies a definition without carrying over student changes from a prior run. */
export function configurationForDvor1150Scenario(
  definition: Dvor1150ScenarioDefinition,
  current: Dvor1150Config,
): Dvor1150Config {
  const next = cloneDvor1150Config(definition.configuration);
  // The network session and PMDT timestamp are not part of an exercise file.
  next.simulation = {
    ...current.simulation,
    local: definition.startPolicy.startLocal,
    integralMonitorBypass: definition.startPolicy.startMonitorBypassed,
  };

  const mainId = definition.startPolicy.mainTransmitterId;
  const standbyId: Dvor1150TransmitterId = mainId === "tx1" ? "tx2" : "tx1";
  next.transmitters[mainId].enabled = true;
  next.transmitters[mainId].onAir = true;
  next.transmitters[mainId].load = false;
  next.transmitters[standbyId].onAir = false;
  next.transmitters[standbyId].load = next.transmitters[standbyId].enabled;
  return next;
}

export function previewDvor1150Scenario(definition: Dvor1150ScenarioDefinition): {
  config: Dvor1150Config;
  snapshot: Dvor1150Snapshot;
} {
  const config = configurationForDvor1150Scenario(definition, defaultDvor1150Config);
  return { config, snapshot: buildDvor1150Snapshot(config) };
}

/** Returns fields changed outside the examiner-authorized recovery controls. */
export function getDvor1150ScenarioProtectedFieldChanges(
  definition: Dvor1150ScenarioDefinition,
  currentConfiguration: Dvor1150Config,
): Dvor1150ScenarioProtectedFieldChange[] {
  const editable = new Set(definition.studentEditableFieldIds);
  return dvor1150ConfigFieldCatalog.flatMap((field) => {
    if (editable.has(field.id)) return [];
    const expected = getDvor1150ConfigValue(definition.configuration, field.id);
    const actual = getDvor1150ConfigValue(currentConfiguration, field.id);
    return Object.is(expected, actual) ? [] : [{ fieldId: field.id, label: field.label }];
  });
}

export function evaluateDvor1150Scenario(
  runtime: Dvor1150ScenarioRuntime,
  snapshot: Dvor1150Snapshot,
  currentConfiguration?: Dvor1150Config,
): Dvor1150ScenarioEvaluation {
  const definition = runtime.definition;
  if (!runtime.active || !definition) return { solved: false, correctable: true, checks: [], blockers: [] };

  const vswrExecutiveAlarm = snapshot.data.maintenanceAlerts.some(
    (alert) => alert.label === "Sideband Antenna VSWR" && alert.indicator === "red",
  );
  const checks = [
    ...(definition.successCriteria.requireIntegralMonitorNormal ? [{
      id: "integral-monitor",
      label: "Integral Monitor",
      passed: snapshot.data.monitorIntegral.normal,
      detail: snapshot.data.monitorIntegral.normal ? "Normal" : "Alarm active",
    }] : []),
    ...(definition.successCriteria.requireActiveTransmitter ? [{
      id: "active-transmitter",
      label: "Transmitter on antenna",
      passed: snapshot.activeTransmitter !== null,
      detail: snapshot.activeTransmitter?.toUpperCase() ?? "No active transmitter",
    }] : []),
    ...(definition.successCriteria.requireNoVswrExecutiveAlarm ? [{
      id: "vswr-executive",
      label: "Sideband VSWR executive alarm",
      passed: !vswrExecutiveAlarm,
      detail: vswrExecutiveAlarm ? "Active" : "Clear",
    }] : []),
    ...(definition.successCriteria.requireMonitorBypassCleared ? [{
      id: "monitor-bypass",
      label: "Monitor Bypass",
      passed: !snapshot.data.monitorIntegral.bypass,
      detail: snapshot.data.monitorIntegral.bypass ? "Bypass active" : "Released",
    }] : []),
  ];
  const protectedChanges = currentConfiguration
    ? getDvor1150ScenarioProtectedFieldChanges(definition, currentConfiguration)
    : [];
  const blockers = protectedChanges.map((change) => `Protected configuration changed: ${change.label}.`);
  return {
    solved: checks.length > 0 && checks.every((check) => check.passed) && blockers.length === 0,
    correctable: true,
    checks,
    blockers,
  };
}

function hasSameJsonShape(value: unknown, reference: unknown): boolean {
  if (reference === null || value === null) return reference === value;
  if (typeof reference === "number") return typeof value === "number" && Number.isFinite(value);
  if (typeof reference === "string" || typeof reference === "boolean") return typeof value === typeof reference;
  if (Array.isArray(reference)) {
    return Array.isArray(value)
      && value.length === reference.length
      && value.every((entry, index) => hasSameJsonShape(entry, reference[index]));
  }
  if (typeof reference !== "object" || typeof value !== "object" || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  const target = reference as Record<string, unknown>;
  const sourceKeys = Object.keys(source).sort();
  const targetKeys = Object.keys(target).sort();
  return sourceKeys.length === targetKeys.length
    && sourceKeys.every((key, index) => key === targetKeys[index] && hasSameJsonShape(source[key], target[key]));
}

export function validateDvor1150ScenarioDefinition(definition: Dvor1150ScenarioDefinition): string[] {
  const issues: string[] = [];
  if (definition.schemaVersion !== DVOR1150_SCENARIO_SCHEMA_VERSION) issues.push("Unsupported scenario schema version.");
  if (!definition.id.trim()) issues.push("Scenario ID is required.");
  if (!definition.name.trim()) issues.push("Scenario name is required.");
  if (!definition.description.trim()) issues.push("Scenario description is required.");
  if (!["basic", "intermediate", "advanced"].includes(definition.difficulty)) issues.push("Scenario difficulty is invalid.");
  if (!["tx1", "tx2"].includes(definition.startPolicy.mainTransmitterId)) issues.push("Starting main transmitter is invalid.");
  if (typeof definition.startPolicy.startLocal !== "boolean" || typeof definition.startPolicy.startMonitorBypassed !== "boolean") {
    issues.push("Scenario start policy is invalid.");
  }
  if (definition.configuration.station.transmitterConfig === "Single Transmitter" && definition.startPolicy.mainTransmitterId === "tx2") {
    issues.push("A single-transmitter station cannot start with TX2 as Main.");
  }
  for (const [key, value] of Object.entries(definition.successCriteria)) {
    if (typeof value !== "boolean") issues.push(`Success criterion ${key} must be boolean.`);
  }
  if (!Array.isArray(definition.studentEditableFieldIds)) {
    issues.push("Student editable fields must be an array.");
  } else {
    const knownFieldIds = new Set(dvor1150ConfigFieldCatalog.map((field) => field.id));
    for (const fieldId of definition.studentEditableFieldIds) {
      if (typeof fieldId !== "string" || !knownFieldIds.has(fieldId)) {
        issues.push(`Student editable field is invalid: ${String(fieldId)}.`);
      }
    }
    if (new Set(definition.studentEditableFieldIds).size !== definition.studentEditableFieldIds.length) {
      issues.push("Student editable fields must not contain duplicates.");
    }
  }
  issues.push(...validateDvor1150Config(definition.configuration));
  return [...new Set(issues)];
}

function inferLegacyStudentEditableFieldIds(configuration: Dvor1150Config): string[] {
  return dvor1150ConfigFieldCatalog
    .filter((field) => field.id.startsWith("transmitters."))
    .filter((field) => !Object.is(
      getDvor1150ConfigValue(configuration, field.id),
      getDvor1150ConfigValue(defaultDvor1150Config, field.id),
    ))
    .map((field) => field.id);
}

export function parseDvor1150ScenarioDefinition(value: unknown): Dvor1150ScenarioDefinition | null {
  if (!value || typeof value !== "object") return null;
  const rawCandidate = value as Record<string, unknown>;
  const candidate = rawCandidate as Partial<Dvor1150ScenarioDefinition>;
  const schemaVersion = rawCandidate.schemaVersion;
  const reference = createDefaultDvor1150ScenarioDefinition();
  if (
    (schemaVersion !== 1 && schemaVersion !== DVOR1150_SCENARIO_SCHEMA_VERSION)
    || typeof candidate.id !== "string"
    || typeof candidate.name !== "string"
    || typeof candidate.description !== "string"
    || !["basic", "intermediate", "advanced"].includes(candidate.difficulty ?? "")
    || !hasSameJsonShape(candidate.configuration, reference.configuration)
    || !candidate.startPolicy
    || !candidate.successCriteria
  ) return null;

  const parsed = {
    ...structuredClone(candidate),
    schemaVersion: DVOR1150_SCENARIO_SCHEMA_VERSION,
    studentEditableFieldIds: schemaVersion === 1
      ? inferLegacyStudentEditableFieldIds(candidate.configuration as Dvor1150Config)
      : rawCandidate.studentEditableFieldIds,
  } as Dvor1150ScenarioDefinition;
  try {
    return validateDvor1150ScenarioDefinition(parsed).length === 0 ? parsed : null;
  } catch {
    return null;
  }
}
