import { cloneDvor1150aConfig, createDefaultDvor1150aConfig } from "./defaults";
import { buildDvor1150aSnapshot } from "./engine";
import {
  dvorConfigFieldCatalog,
  getDvorConfigValue,
  validateDvorConfig,
} from "./config-utils";
import type {
  Dvor1150aConfig,
  Dvor1150aSnapshot,
  DvorTransmitterId,
} from "./config-types";

export const DVOR1150A_SCENARIO_SCHEMA_VERSION = 1 as const;

export type Dvor1150aScenarioDifficulty = "basic" | "intermediate" | "advanced";

/**
 * A self-contained training exercise. Its baseline is intentionally held
 * outside the user's persisted PMDT profile, so it is safe to load on a
 * training workstation and discard after the exercise.
 */
export interface Dvor1150aScenarioDefinition {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  difficulty: Dvor1150aScenarioDifficulty;
  configuration: Dvor1150aConfig;
  startPolicy: {
    mainTransmitterId: DvorTransmitterId;
    startLocal: boolean;
    startMonitorBypassed: boolean;
  };
  successCriteria: {
    requireIntegralMonitorNormal: boolean;
    requireActiveTransmitter: boolean;
    requireNoSidebandVswrAlarm: boolean;
    requireMonitorBypassCleared: boolean;
  };
  /**
   * Recovery controls chosen by the examiner. Every other staged PMDT
   * configuration field is protected while the exercise is active.
   */
  studentEditableFieldIds: string[];
}

export interface Dvor1150aScenarioRuntime {
  active: boolean;
  definition: Dvor1150aScenarioDefinition | null;
  startedAt: string | null;
}

export interface Dvor1150aScenarioEvaluation {
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

export interface Dvor1150aScenarioProtectedFieldChange {
  fieldId: string;
  label: string;
}

export function createDefaultDvor1150aScenarioDefinition(): Dvor1150aScenarioDefinition {
  return {
    schemaVersion: DVOR1150A_SCENARIO_SCHEMA_VERSION,
    id: "custom-dvor1150a-scenario",
    name: "Custom DVOR 1150A Scenario",
    description: "Session-only training baseline derived from Đài TEST/TST.",
    difficulty: "basic",
    configuration: createDefaultDvor1150aConfig(),
    startPolicy: {
      mainTransmitterId: "tx1",
      startLocal: false,
      startMonitorBypassed: false,
    },
    successCriteria: {
      requireIntegralMonitorNormal: true,
      requireActiveTransmitter: true,
      requireNoSidebandVswrAlarm: true,
      requireMonitorBypassCleared: true,
    },
    studentEditableFieldIds: [],
  };
}

export function createLowCarrierAnd9960Scenario(): Dvor1150aScenarioDefinition {
  const scenario = createDefaultDvor1150aScenarioDefinition();
  scenario.id = "tx1-low-carrier-9960";
  scenario.name = "TX1 Low Carrier and 9960 Hz Modulation";
  scenario.description = "TX1 starts with critically low carrier output, producing low TX Power and 9960 Hz monitor readings. Restore TX1 output power, apply the correction, then release Monitor Bypass to prove normal operation.";
  scenario.difficulty = "intermediate";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.transmitters.tx1.nominal.outputPower = 10;
  scenario.studentEditableFieldIds = [
    "transmitters.tx1.nominal.outputPower",
    "transmitters.tx1.offsets.outputPowerScale",
  ];
  return scenario;
}

export function createReferenceModulationScenario(): Dvor1150aScenarioDefinition {
  const scenario = createDefaultDvor1150aScenarioDefinition();
  scenario.id = "tx1-low-reference-modulation";
  scenario.name = "TX1 Low 30 Hz Reference Modulation";
  scenario.description = "TX1 reference modulation is below the monitor alarm limit. Correct the transmitter reference modulation, apply the correction, then release Monitor Bypass after both monitors are normal.";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.transmitters.tx1.nominal.referenceModulation = 20;
  scenario.studentEditableFieldIds = [
    "transmitters.tx1.nominal.referenceModulation",
    "transmitters.tx1.offsets.referenceModulationScale",
  ];
  return scenario;
}

export function createSidebandVswrScenario(): Dvor1150aScenarioDefinition {
  const scenario = createDefaultDvor1150aScenarioDefinition();
  scenario.id = "tx1-sideband-vswr-alarm";
  scenario.name = "TX1 Sideband VSWR Alarm";
  scenario.description = "The TX1 sideband VSWR profile raises the field-monitor antenna count above the executive alarm threshold. Correct the affected TX1 sideband VSWR values and release Monitor Bypass to prove recovery.";
  scenario.difficulty = "advanced";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.transmitters.tx1.vswr.sidebands = [4, 4, 4, 4];
  scenario.studentEditableFieldIds = [
    "transmitters.tx1.vswr.sidebands.0",
    "transmitters.tx1.vswr.sidebands.1",
    "transmitters.tx1.vswr.sidebands.2",
    "transmitters.tx1.vswr.sidebands.3",
  ];
  return scenario;
}

export function createTx1FaultChangeoverScenario(): Dvor1150aScenarioDefinition {
  const scenario = createDefaultDvor1150aScenarioDefinition();
  scenario.id = "tx1-carrier-vswr-changeover";
  scenario.name = "TX1 Carrier VSWR Fault - Change Over";
  scenario.description = "TX1 is on antenna with a carrier VSWR fault. The student must transfer the service to healthy TX2 and release Monitor Bypass to confirm normal monitoring.";
  scenario.difficulty = "intermediate";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.transmitters.tx1.faults.carrierVswr = true;
  return scenario;
}

export const DVOR1150A_BUILT_IN_SCENARIOS = [
  { id: "default", label: "New from Đài TEST/TST", create: createDefaultDvor1150aScenarioDefinition },
  { id: "carrier-9960", label: "TX1 low carrier + 9960 Hz", create: createLowCarrierAnd9960Scenario },
  { id: "reference-modulation", label: "TX1 low 30 Hz reference modulation", create: createReferenceModulationScenario },
  { id: "sideband-vswr", label: "TX1 sideband VSWR alarm", create: createSidebandVswrScenario },
  { id: "tx1-changeover", label: "TX1 carrier VSWR fault - change over", create: createTx1FaultChangeoverScenario },
] as const;

/** Applies an exercise baseline without carrying student changes across runs. */
export function configurationForDvor1150aScenario(
  definition: Dvor1150aScenarioDefinition,
  current: Dvor1150aConfig,
): Dvor1150aConfig {
  const next = cloneDvor1150aConfig(definition.configuration);
  // Connection and timestamp describe the live PMDT session rather than the
  // JSON exercise file. Local/Bypass are controlled by startPolicy.
  next.simulation = {
    ...current.simulation,
    local: definition.startPolicy.startLocal,
    integralMonitorBypass: definition.startPolicy.startMonitorBypassed,
  };

  const mainId = definition.startPolicy.mainTransmitterId;
  const standbyId: DvorTransmitterId = mainId === "tx1" ? "tx2" : "tx1";
  next.transmitters[mainId].enabled = true;
  next.transmitters[mainId].onAir = true;
  next.transmitters[mainId].load = false;
  next.transmitters[standbyId].onAir = false;
  next.transmitters[standbyId].load = next.transmitters[standbyId].enabled
    && !next.transmitters[standbyId].faults.disabled;
  return next;
}

export function previewDvor1150aScenario(definition: Dvor1150aScenarioDefinition): {
  config: Dvor1150aConfig;
  snapshot: Dvor1150aSnapshot;
} {
  const config = configurationForDvor1150aScenario(
    definition,
    createDefaultDvor1150aConfig(),
  );
  return { config, snapshot: buildDvor1150aSnapshot(config) };
}

function isLiveScenarioField(fieldId: string): boolean {
  return fieldId.startsWith("simulation.")
    || /^transmitters\.(tx1|tx2)\.(enabled|onAir|load)$/.test(fieldId);
}

/** Returns non-recovery configuration changes made while a scenario is active. */
export function getDvor1150aScenarioProtectedFieldChanges(
  definition: Dvor1150aScenarioDefinition,
  currentConfiguration: Dvor1150aConfig,
): Dvor1150aScenarioProtectedFieldChange[] {
  const editable = new Set(definition.studentEditableFieldIds);
  return dvorConfigFieldCatalog.flatMap((field) => {
    if (isLiveScenarioField(field.id) || editable.has(field.id)) return [];
    const expected = getDvorConfigValue(definition.configuration, field.id);
    const actual = getDvorConfigValue(currentConfiguration, field.id);
    return Object.is(expected, actual) ? [] : [{ fieldId: field.id, label: field.label }];
  });
}

export function evaluateDvor1150aScenario(
  runtime: Dvor1150aScenarioRuntime,
  snapshot: Dvor1150aSnapshot,
  currentConfiguration?: Dvor1150aConfig,
): Dvor1150aScenarioEvaluation {
  const definition = runtime.definition;
  if (!runtime.active || !definition) {
    return { solved: false, correctable: true, checks: [], blockers: [] };
  }

  const sidebandVswrAlarm = Object.values(snapshot.monitors).some(
    (monitor) => monitor.enabled && monitor.parameters.sidebandVswr.status === "alarm",
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
      passed: snapshot.voting.activeTransmitter !== null,
      detail: snapshot.voting.activeTransmitter?.toUpperCase() ?? "No active transmitter",
    }] : []),
    ...(definition.successCriteria.requireNoSidebandVswrAlarm ? [{
      id: "sideband-vswr",
      label: "Sideband VSWR alarm",
      passed: !sidebandVswrAlarm,
      detail: sidebandVswrAlarm ? "Active" : "Clear",
    }] : []),
    ...(definition.successCriteria.requireMonitorBypassCleared ? [{
      id: "monitor-bypass",
      label: "Monitor Bypass",
      passed: !snapshot.data.monitorIntegral.bypass,
      detail: snapshot.data.monitorIntegral.bypass ? "Bypass active" : "Released",
    }] : []),
  ];
  const protectedChanges = currentConfiguration
    ? getDvor1150aScenarioProtectedFieldChanges(definition, currentConfiguration)
    : [];
  const blockers = protectedChanges.map(
    (change) => `Protected configuration changed: ${change.label}.`,
  );

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
    && sourceKeys.every((key, index) => key === targetKeys[index]
      && hasSameJsonShape(source[key], target[key]));
}

export function validateDvor1150aScenarioDefinition(
  definition: Dvor1150aScenarioDefinition,
): string[] {
  const issues: string[] = [];
  if (definition.schemaVersion !== DVOR1150A_SCENARIO_SCHEMA_VERSION) issues.push("Unsupported scenario schema version.");
  if (!definition.id.trim()) issues.push("Scenario ID is required.");
  if (!definition.name.trim()) issues.push("Scenario name is required.");
  if (!definition.description.trim()) issues.push("Scenario description is required.");
  if (!['basic', 'intermediate', 'advanced'].includes(definition.difficulty)) issues.push("Scenario difficulty is invalid.");
  if (!['tx1', 'tx2'].includes(definition.startPolicy.mainTransmitterId)) issues.push("Starting main transmitter is invalid.");
  if (typeof definition.startPolicy.startLocal !== "boolean" || typeof definition.startPolicy.startMonitorBypassed !== "boolean") {
    issues.push("Scenario start policy is invalid.");
  }
  if (definition.configuration.station.transmitterConfig === "Single Transmitter"
    && definition.startPolicy.mainTransmitterId === "tx2") {
    issues.push("A single-transmitter station cannot start with TX2 as Main.");
  }
  if (definition.configuration.transmitters[definition.startPolicy.mainTransmitterId].faults.disabled) {
    issues.push("Starting main transmitter must not be forced disabled.");
  }
  for (const [key, value] of Object.entries(definition.successCriteria)) {
    if (typeof value !== "boolean") issues.push(`Success criterion ${key} must be boolean.`);
  }
  if (!Array.isArray(definition.studentEditableFieldIds)) {
    issues.push("Student editable fields must be an array.");
  } else {
    const knownFieldIds = new Set(dvorConfigFieldCatalog.map((field) => field.id));
    for (const fieldId of definition.studentEditableFieldIds) {
      if (typeof fieldId !== "string" || !knownFieldIds.has(fieldId) || isLiveScenarioField(fieldId)) {
        issues.push(`Student editable field is invalid: ${String(fieldId)}.`);
      }
    }
    if (new Set(definition.studentEditableFieldIds).size !== definition.studentEditableFieldIds.length) {
      issues.push("Student editable fields must not contain duplicates.");
    }
  }
  issues.push(...validateDvorConfig(definition.configuration));
  return [...new Set(issues)];
}

export function parseDvor1150aScenarioDefinition(value: unknown): Dvor1150aScenarioDefinition | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Dvor1150aScenarioDefinition>;
  const reference = createDefaultDvor1150aScenarioDefinition();
  if (
    candidate.schemaVersion !== DVOR1150A_SCENARIO_SCHEMA_VERSION
    || typeof candidate.id !== "string"
    || typeof candidate.name !== "string"
    || typeof candidate.description !== "string"
    || !["basic", "intermediate", "advanced"].includes(candidate.difficulty ?? "")
    || !hasSameJsonShape(candidate.configuration, reference.configuration)
    || !candidate.startPolicy
    || !candidate.successCriteria
    || !Array.isArray(candidate.studentEditableFieldIds)
  ) return null;

  const parsed = structuredClone(candidate) as Dvor1150aScenarioDefinition;
  try {
    return validateDvor1150aScenarioDefinition(parsed).length === 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function isDvor1150aScenarioStudentEditable(
  definition: Dvor1150aScenarioDefinition | null,
  fieldId: string,
): boolean {
  return Boolean(definition?.studentEditableFieldIds.includes(fieldId));
}
