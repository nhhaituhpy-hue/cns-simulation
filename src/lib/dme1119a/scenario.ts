import {
  extractDme1119aConfig,
  getDefaultDme1119aConfig,
  hydrateDme1119aData,
  parseDme1119aConfig,
  type Dme1119aPersistedConfig,
} from "@/lib/simulator-config/dme-1119a";
import { createDefaultDme1119aSimulationFaults as createDefaultSimulationFaults } from "@/lib/dme-pmdt-defaults";
import type {
  DmeParameterStatus,
  DmePmdtData,
  DmeTransmitterId,
  DmeViewId,
} from "@/lib/dme-types";
import {
  dme1119aHardwareOccurrenceKey,
  resolveDme1119aHardwareOccurrence,
  type Dme1119aBlockId,
  type Dme1119aHardwareOccurrence,
} from "@/modules/devices/dme-1119a/block-diagram-data";
import {
  dmeParameterFieldCatalog,
  getDmeParameterValue,
  validateDmeParameterField,
} from "./config";
import { recomputeDmeDerivedData } from "./derived-data";
import {
  isScenarioFieldAllowed,
  scenarioAllowedFieldIds,
  validateScenarioEditPolicy,
  validateScenarioTaskTargets,
  type ScenarioFieldRole,
  type ScenarioEditPolicy,
  type ScenarioTaskTarget,
} from "@/lib/scenario-policy";

export const DME1119A_SCENARIO_SCHEMA_VERSION = 1 as const;

export type Dme1119aScenarioDifficulty = "basic" | "intermediate" | "advanced";
export type Dme1119aScenarioDisposition = "replace-module" | "software-adjustment";
export type Dme1119aDiagnosticRun = "full" | "on-air" | "not-required";

export interface Dme1119aScenarioPmdtCheckpoint {
  id: string;
  label: string;
  viewId: DmeViewId;
}

export interface Dme1119aScenarioHardwareTarget extends Dme1119aHardwareOccurrence {
  assemblyId?: string;
}

export interface Dme1119aScenarioDiagnosis {
  disposition: Dme1119aScenarioDisposition;
  diagnosticRun: Dme1119aDiagnosticRun;
  diagnosticSubsystem: string;
  diagnosticResult: string;
  faultSummary: string;
  manualReferences: string[];
  pmdtCheckpoints: Dme1119aScenarioPmdtCheckpoint[];
  requiredActionControlIds: string[];
  expectedHardware: Dme1119aScenarioHardwareTarget[];
}

export interface Dme1119aScenarioEvidence {
  visitedViewIds?: readonly string[];
  acceptedActionControlIds?: readonly string[];
  selectedHardwareOccurrenceKeys?: readonly string[];
  hardwareDispositionConfirmed?: boolean;
}

/** RMS temperature channels that the DME 1119A engine can actually derive. */
export const DME1119A_TEMPERATURE_SENSORS = [
  "Cabinet Temperature",
  "External Temperature",
  "LPA #1 Temperature",
  "LPA #2 Temperature",
  "HPA #1 Temperature",
  "HPA #2 Temperature",
] as const;

export type { Dme1119aSimulationFaults } from "@/lib/dme-types";

export type Dme1119aScenarioFault =
  | { id: string; kind: "tx-power-loss"; transmitter: DmeTransmitterId; lossDb: number }
  | { id: string; kind: "reply-delay-drift"; transmitter: DmeTransmitterId; driftUs: number }
  | { id: string; kind: "pulse-spacing-drift"; transmitter: DmeTransmitterId; driftUs: number }
  | { id: string; kind: "tx-frequency-error"; transmitter: DmeTransmitterId; ppm: number }
  | { id: string; kind: "hpa-fault"; transmitter: DmeTransmitterId; active: boolean }
  | { id: string; kind: "rtc-comm-fault"; transmitter: DmeTransmitterId; active: boolean }
  | { id: string; kind: "antenna-vswr"; transmitter: DmeTransmitterId; ratio: number }
  | { id: string; kind: "monitor-offset"; monitor: 1 | 2; measurement: "integral" | "standby"; parameter: string; value: number }
  | { id: string; kind: "ident-signal"; state: "normal" | "missing" | "continuous" }
  | { id: string; kind: "temperature"; sensor: string; celsius: number }
  | { id: string; kind: "ac-power"; failed: boolean };

export type Dme1119aScenarioCriterion =
  | { id: string; kind: "monitor-normal"; monitor: "integral" | "standby" }
  | { id: string; kind: "monitor-alarm-clear"; severity: "primary" | "secondary" | "both" }
  | { id: string; kind: "active-transmitter"; expected: "any" | DmeTransmitterId }
  | { id: string; kind: "active-path-healthy" }
  | { id: string; kind: "parameter-status"; monitor: "integral" | "standby"; parameter: string; expected: "normal" | "warning" | "alarm" }
  | { id: string; kind: "rtc-overload-clear"; transmitter: "active" | DmeTransmitterId | "both" }
  | { id: string; kind: "bypass-cleared"; monitor: "integral" | "standby" | "both" }
  | { id: string; kind: "ident-normal" }
  | { id: string; kind: "fan-control"; expected: "Automatic" | "On" | "Off" }
  | { id: string; kind: "ac-power-normal" };

export interface Dme1119aScenarioDefinition {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  difficulty: Dme1119aScenarioDifficulty;
  configuration: Dme1119aPersistedConfig;
  faultInjections: Dme1119aScenarioFault[];
  startPolicy: {
    mainTransmitterId: DmeTransmitterId;
    startLocal: boolean;
    integralMonitorBypassed: boolean;
    standbyMonitorBypassed: boolean;
    identMode: DmePmdtData["identMode"];
  };
  /** New scenarios default to open; omitted means legacy whitelist semantics. */
  editPolicy?: ScenarioEditPolicy;
  /** Optional explicit fields that the learner must inspect or apply. */
  taskTargets?: ScenarioTaskTarget[];
  successCriteria: Dme1119aScenarioCriterion[];
  studentEditableFieldIds: string[];
  /** Optional two-stage diagnostic contract; old schema-v1 JSON remains valid. */
  diagnosis?: Dme1119aScenarioDiagnosis;
}

export interface Dme1119aScenarioRuntime {
  active: boolean;
  definition: Dme1119aScenarioDefinition | null;
  startedAt: string | null;
}

export interface Dme1119aScenarioCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface Dme1119aScenarioProtectedFieldChange {
  fieldId: string;
  label: string;
}

export interface Dme1119aScenarioEvaluation {
  solved: boolean;
  correctable: boolean;
  pmdtComplete: boolean;
  hardwareComplete: boolean;
  hardware: {
    exactMatch: boolean;
    expectedKeys: string[];
    selectedKeys: string[];
    missingKeys: string[];
    extraKeys: string[];
  };
  checks: Dme1119aScenarioCheck[];
  blockers: string[];
}

const SESSION_ONLY_FIELD_IDS = new Set(["connected", "local", "alert", "timestamp"]);
const MONITOR_PARAMETERS = new Set([
  "Delay",
  "Spacing",
  "Tx Power",
  "ERP",
  "Efficiency",
  "PRF",
  "Tx Frequency",
  "Rx LO Frequency",
  "Rx Frequency",
  "Tx Frequency Error",
  "Rx LO Frequency Error",
  "VSWR",
  "Ident Status",
  "Ident Code",
]);
const MONITOR_OFFSET_PARAMETERS = new Set([
  "Delay Offset",
  "Spacing Offset",
  "Tx Power Scale",
  "Tx Power Offset",
  "Efficiency Offset",
  "PRF Offset",
  "Tx Frequency Offset",
  "Rx Frequency Offset",
  "ERP Offset",
  "Return Loss Offset",
]);

const DEFAULT_CRITERIA: Dme1119aScenarioCriterion[] = [
  { id: "integral-monitor-normal", kind: "monitor-normal", monitor: "integral" },
  { id: "active-transmitter", kind: "active-transmitter", expected: "any" },
  { id: "active-path-healthy", kind: "active-path-healthy" },
  { id: "integral-bypass-cleared", kind: "bypass-cleared", monitor: "integral" },
  { id: "standby-bypass-cleared", kind: "bypass-cleared", monitor: "standby" },
];

function createHardwareTarget(
  blockId: Dme1119aBlockId,
  diagramOccurrenceId: string,
  assemblyId?: string,
): Dme1119aScenarioHardwareTarget {
  const occurrence = resolveDme1119aHardwareOccurrence(blockId, diagramOccurrenceId);
  if (!occurrence) throw new Error(`Unknown DME 1119A hardware occurrence: ${blockId}/${diagramOccurrenceId}`);
  return { ...occurrence, ...(assemblyId ? { assemblyId } : {}) };
}

function createHardwareDiagnosis(input: {
  diagnosticRun?: Exclude<Dme1119aDiagnosticRun, "not-required">;
  diagnosticSubsystem: string;
  diagnosticResult: string;
  faultSummary: string;
  manualReferences: string[];
  pmdtCheckpoints: Dme1119aScenarioPmdtCheckpoint[];
  requiredActionControlIds?: string[];
  target: Dme1119aScenarioHardwareTarget;
}): Dme1119aScenarioDiagnosis {
  const run = input.diagnosticRun ?? "full";
  return {
    disposition: "replace-module",
    diagnosticRun: run,
    diagnosticSubsystem: input.diagnosticSubsystem,
    diagnosticResult: input.diagnosticResult,
    faultSummary: input.faultSummary,
    manualReferences: [...input.manualReferences],
    pmdtCheckpoints: [...input.pmdtCheckpoints],
    requiredActionControlIds: input.requiredActionControlIds ?? [`diagnostics-run-${run}`],
    expectedHardware: [input.target],
  };
}

function createSoftwareDiagnosis(input: {
  diagnosticSubsystem: string;
  diagnosticResult: string;
  faultSummary: string;
  manualReferences: string[];
  pmdtCheckpoints: Dme1119aScenarioPmdtCheckpoint[];
  requiredActionControlIds?: string[];
}): Dme1119aScenarioDiagnosis {
  return {
    disposition: "software-adjustment",
    diagnosticRun: "not-required",
    diagnosticSubsystem: input.diagnosticSubsystem,
    diagnosticResult: input.diagnosticResult,
    faultSummary: input.faultSummary,
    manualReferences: [...input.manualReferences],
    pmdtCheckpoints: [...input.pmdtCheckpoints],
    requiredActionControlIds: input.requiredActionControlIds ?? ["config-apply"],
    expectedHardware: [],
  };
}

export function createDefaultDme1119aScenarioDefinition(): Dme1119aScenarioDefinition {
  return {
    schemaVersion: DME1119A_SCENARIO_SCHEMA_VERSION,
    id: "custom-dme1119a-scenario",
    name: "Custom DME 1119A Scenario",
    description: "Session-only training baseline derived from Đài TEST/TST.",
    difficulty: "basic",
    configuration: getDefaultDme1119aConfig(),
    faultInjections: [],
    startPolicy: {
      mainTransmitterId: "tx1",
      startLocal: true,
      integralMonitorBypassed: false,
      standbyMonitorBypassed: false,
      identMode: "normal",
    },
    editPolicy: { mode: "open" },
    taskTargets: [],
    successCriteria: structuredClone(DEFAULT_CRITERIA),
    studentEditableFieldIds: [],
  };
}

export function cloneDme1119aScenarioDefinition(
  definition: Dme1119aScenarioDefinition,
): Dme1119aScenarioDefinition {
  return structuredClone(definition);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTransmitter(value: unknown): value is DmeTransmitterId {
  return value === "tx1" || value === "tx2";
}

function isFault(value: unknown): value is Dme1119aScenarioFault {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim() || typeof value.kind !== "string") return false;
  if (value.kind === "tx-power-loss") return isTransmitter(value.transmitter) && isFiniteNumber(value.lossDb);
  if (value.kind === "reply-delay-drift") return isTransmitter(value.transmitter) && isFiniteNumber(value.driftUs);
  if (value.kind === "pulse-spacing-drift") return isTransmitter(value.transmitter) && isFiniteNumber(value.driftUs);
  if (value.kind === "tx-frequency-error") return isTransmitter(value.transmitter) && isFiniteNumber(value.ppm);
  if (value.kind === "hpa-fault" || value.kind === "rtc-comm-fault") return isTransmitter(value.transmitter) && typeof value.active === "boolean";
  if (value.kind === "antenna-vswr") return isTransmitter(value.transmitter) && isFiniteNumber(value.ratio);
  if (value.kind === "monitor-offset") return (value.monitor === 1 || value.monitor === 2)
    && (value.measurement === "integral" || value.measurement === "standby")
    && typeof value.parameter === "string"
    && value.parameter.trim().length > 0
    && isFiniteNumber(value.value);
  if (value.kind === "ident-signal") return value.state === "normal" || value.state === "missing" || value.state === "continuous";
  if (value.kind === "temperature") return typeof value.sensor === "string" && value.sensor.trim().length > 0 && isFiniteNumber(value.celsius);
  if (value.kind === "ac-power") return typeof value.failed === "boolean";
  return false;
}

function isCriterion(value: unknown): value is Dme1119aScenarioCriterion {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim() || typeof value.kind !== "string") return false;
  if (value.kind === "monitor-normal") return value.monitor === "integral" || value.monitor === "standby";
  if (value.kind === "monitor-alarm-clear") return value.severity === "primary" || value.severity === "secondary" || value.severity === "both";
  if (value.kind === "active-transmitter") return value.expected === "any" || isTransmitter(value.expected);
  if (value.kind === "active-path-healthy") return true;
  if (value.kind === "parameter-status") return (value.monitor === "integral" || value.monitor === "standby")
    && typeof value.parameter === "string"
    && (value.expected === "normal" || value.expected === "warning" || value.expected === "alarm");
  if (value.kind === "rtc-overload-clear") return value.transmitter === "active" || value.transmitter === "both" || isTransmitter(value.transmitter);
  if (value.kind === "bypass-cleared") return value.monitor === "integral" || value.monitor === "standby" || value.monitor === "both";
  if (value.kind === "ident-normal") return true;
  if (value.kind === "fan-control") return value.expected === "Automatic" || value.expected === "On" || value.expected === "Off";
  if (value.kind === "ac-power-normal") return true;
  return false;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasDuplicateIds(values: readonly { id: string }[]): boolean {
  return new Set(values.map((value) => value.id)).size !== values.length;
}

function validateFaultValues(fault: Dme1119aScenarioFault): string[] {
  if (fault.kind === "tx-power-loss" && (fault.lossDb < 0 || fault.lossDb > 60)) return [`Fault ${fault.id} power loss must be between 0 and 60 dB.`];
  if ((fault.kind === "reply-delay-drift" || fault.kind === "pulse-spacing-drift") && Math.abs(fault.driftUs) > 100) return [`Fault ${fault.id} timing drift is outside ±100 us.`];
  if (fault.kind === "tx-frequency-error" && Math.abs(fault.ppm) > 10_000) return [`Fault ${fault.id} frequency error is outside ±10000 ppm.`];
  if (fault.kind === "antenna-vswr" && (fault.ratio < 1 || fault.ratio > 100)) return [`Fault ${fault.id} VSWR must be between 1 and 100.`];
  if (fault.kind === "monitor-offset" && Math.abs(fault.value) > 1_000_000) return [`Fault ${fault.id} monitor offset is outside the supported range.`];
  if (fault.kind === "monitor-offset" && !MONITOR_OFFSET_PARAMETERS.has(fault.parameter)) return [`Fault ${fault.id} references an unknown monitor offset.`];
  if (fault.kind === "temperature" && !DME1119A_TEMPERATURE_SENSORS.includes(fault.sensor as (typeof DME1119A_TEMPERATURE_SENSORS)[number])) {
    return [`Fault ${fault.id} references an unknown RMS temperature sensor.`];
  }
  if (fault.kind === "temperature" && (fault.celsius < -80 || fault.celsius > 150)) return [`Fault ${fault.id} temperature is outside -80 to 150 °C.`];
  return [];
}

function validateCriterionValues(criterion: Dme1119aScenarioCriterion): string[] {
  if (criterion.kind === "parameter-status" && !MONITOR_PARAMETERS.has(criterion.parameter)) {
    return [`Criterion ${criterion.id} references an unknown monitor parameter.`];
  }
  return [];
}

function validateScenarioDiagnosis(value: unknown): string[] {
  if (!isRecord(value)) return ["Scenario diagnosis must be an object."];
  const diagnosis = value as Partial<Dme1119aScenarioDiagnosis>;
  const issues: string[] = [];
  if (!(["replace-module", "software-adjustment"] as const).includes(diagnosis.disposition as Dme1119aScenarioDisposition)) {
    issues.push("Scenario diagnosis disposition is invalid.");
  }
  if (!(["full", "on-air", "not-required"] as const).includes(diagnosis.diagnosticRun as Dme1119aDiagnosticRun)) {
    issues.push("Scenario diagnostic run is invalid.");
  }
  for (const [field, candidate] of [
    ["diagnosticSubsystem", diagnosis.diagnosticSubsystem],
    ["diagnosticResult", diagnosis.diagnosticResult],
    ["faultSummary", diagnosis.faultSummary],
  ] as const) {
    if (typeof candidate !== "string" || !candidate.trim()) issues.push(`Scenario diagnosis ${field} is required.`);
  }
  if (!Array.isArray(diagnosis.manualReferences) || !diagnosis.manualReferences.every((item) => typeof item === "string" && item.trim())) {
    issues.push("Scenario diagnosis manual references are invalid.");
  }
  if (!Array.isArray(diagnosis.pmdtCheckpoints) || diagnosis.pmdtCheckpoints.length === 0) {
    issues.push("Scenario diagnosis must contain at least one PMDT checkpoint.");
  } else {
    for (const checkpoint of diagnosis.pmdtCheckpoints) {
      if (!checkpoint || typeof checkpoint.id !== "string" || !checkpoint.id.trim() || typeof checkpoint.label !== "string" || !checkpoint.label.trim() || typeof checkpoint.viewId !== "string") {
        issues.push("Scenario PMDT checkpoint is invalid.");
      }
    }
  }
  if (!Array.isArray(diagnosis.requiredActionControlIds) || !diagnosis.requiredActionControlIds.every((item) => typeof item === "string" && item.trim())) {
    issues.push("Scenario diagnosis required actions are invalid.");
  }
  if (!Array.isArray(diagnosis.expectedHardware)) {
    issues.push("Scenario diagnosis hardware targets are invalid.");
  } else {
    for (const target of diagnosis.expectedHardware) {
      if (!target || typeof target.blockId !== "string" || typeof target.diagramOccurrenceId !== "string" || !Array.isArray(target.cabinetHotspotIds) || !target.cabinetHotspotIds.every((item) => typeof item === "string")) {
        issues.push("Scenario hardware target identity is invalid.");
        continue;
      }
      const resolved = resolveDme1119aHardwareOccurrence(target.blockId as Dme1119aBlockId, target.diagramOccurrenceId);
      if (!resolved || dme1119aHardwareOccurrenceKey(resolved) !== dme1119aHardwareOccurrenceKey(target)) {
        issues.push(`Scenario hardware target does not match the DME block catalog: ${target.blockId}/${target.diagramOccurrenceId}.`);
      }
      if (target.assemblyId !== undefined && typeof target.assemblyId !== "string") issues.push("Scenario hardware target assembly ID is invalid.");
    }
  }
  if (diagnosis.disposition === "replace-module" && diagnosis.expectedHardware?.length === 0) issues.push("A replace-module scenario must contain a hardware target.");
  if (diagnosis.disposition === "software-adjustment" && diagnosis.expectedHardware?.length !== 0) issues.push("A software-adjustment scenario must not contain a hardware target.");
  return issues;
}

export function validateDme1119aScenarioDefinition(
  definition: Dme1119aScenarioDefinition,
): string[] {
  const issues: string[] = [];
  if (!definition || typeof definition !== "object") return ["Scenario definition must be an object."];
  if (definition.schemaVersion !== DME1119A_SCENARIO_SCHEMA_VERSION) issues.push("Unsupported scenario schema version.");
  if (!definition.id?.trim()) issues.push("Scenario ID is required.");
  if (!definition.name?.trim()) issues.push("Scenario name is required.");
  if (!definition.description?.trim()) issues.push("Scenario description is required.");
  if (!["basic", "intermediate", "advanced"].includes(definition.difficulty)) issues.push("Scenario difficulty is invalid.");
  if (!parseDme1119aConfig(definition.configuration)) issues.push("Scenario configuration shape is invalid.");

  if (!definition.startPolicy || !isTransmitter(definition.startPolicy.mainTransmitterId)) {
    issues.push("Starting main transmitter is invalid.");
  } else {
    if (typeof definition.startPolicy.startLocal !== "boolean"
      || typeof definition.startPolicy.integralMonitorBypassed !== "boolean"
      || typeof definition.startPolicy.standbyMonitorBypassed !== "boolean"
      || !["normal", "off", "continuous"].includes(definition.startPolicy.identMode)) {
      issues.push("Scenario start policy is invalid.");
    }
    if (definition.configuration?.rmsConfigStation?.transmitterConfig === "Single Transmitter"
      && definition.startPolicy.mainTransmitterId === "tx2") {
      issues.push("A single-transmitter station cannot start with TX2 as Main.");
    }
  }

  if (!Array.isArray(definition.faultInjections) || !definition.faultInjections.every(isFault)) {
    issues.push("Scenario fault injections are invalid.");
  } else {
    if (hasDuplicateIds(definition.faultInjections)) issues.push("Fault IDs must be unique.");
    for (const fault of definition.faultInjections) issues.push(...validateFaultValues(fault));
  }

  if (!Array.isArray(definition.successCriteria) || !definition.successCriteria.every(isCriterion)) {
    issues.push("Scenario success criteria are invalid.");
  } else {
    if (definition.successCriteria.length === 0) issues.push("Scenario must define at least one success criterion.");
    if (hasDuplicateIds(definition.successCriteria)) issues.push("Criterion IDs must be unique.");
    for (const criterion of definition.successCriteria) issues.push(...validateCriterionValues(criterion));
  }

  if (!Array.isArray(definition.studentEditableFieldIds)) {
    issues.push("Student editable fields must be an array.");
  } else {
    const knownFields = new Map(dmeParameterFieldCatalog.map((field) => [field.id, field]));
    for (const fieldId of definition.studentEditableFieldIds) {
      const field = typeof fieldId === "string" ? knownFields.get(fieldId) : undefined;
      if (!field || field.readOnly || SESSION_ONLY_FIELD_IDS.has(fieldId) || fieldId.startsWith("securityAccounts.")) {
        issues.push(`Student editable field is invalid: ${String(fieldId)}.`);
      }
    }
    if (new Set(definition.studentEditableFieldIds).size !== definition.studentEditableFieldIds.length) {
      issues.push("Student editable fields must not contain duplicates.");
    }
  }

  issues.push(...validateScenarioEditPolicy({
    policy: definition.editPolicy,
    fields: dmeParameterFieldCatalog,
    isBlocked: (fieldId) => SESSION_ONLY_FIELD_IDS.has(fieldId) || isLiveScenarioField(fieldId) || fieldId.startsWith("securityAccounts."),
    roleOf: dme1119aScenarioFieldRole,
    label: "Scenario edit policy",
  }));
  issues.push(...validateScenarioTaskTargets({
    targets: definition.taskTargets,
    fields: dmeParameterFieldCatalog,
    isBlocked: (fieldId) => SESSION_ONLY_FIELD_IDS.has(fieldId) || isLiveScenarioField(fieldId) || fieldId.startsWith("securityAccounts."),
    roleOf: dme1119aScenarioFieldRole,
    label: "Scenario task targets",
  }));

  if (parseDme1119aConfig(definition.configuration)) {
    const runtime = hydrateDme1119aData(definition.configuration);
    for (const field of dmeParameterFieldCatalog) {
      if (field.readOnly) continue;
      const value = getDmeParameterValue(runtime, field.id);
      const issue = validateDmeParameterField(field, value);
      if (issue) issues.push(`${field.label}: ${issue}`);
    }
  }

  if (definition.diagnosis !== undefined) issues.push(...validateScenarioDiagnosis(definition.diagnosis));

  return [...new Set(issues)];
}

export function parseDme1119aScenarioDefinition(
  value: unknown,
): Dme1119aScenarioDefinition | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== DME1119A_SCENARIO_SCHEMA_VERSION
    || typeof value.id !== "string"
    || typeof value.name !== "string"
    || typeof value.description !== "string"
    || !["basic", "intermediate", "advanced"].includes(String(value.difficulty))
    || !parseDme1119aConfig(value.configuration)
    || !Array.isArray(value.faultInjections)
    || !value.faultInjections.every(isFault)
    || !isRecord(value.startPolicy)
    || !Array.isArray(value.successCriteria)
    || !value.successCriteria.every(isCriterion)
    || !Array.isArray(value.studentEditableFieldIds)
    || !value.studentEditableFieldIds.every((fieldId) => typeof fieldId === "string")) return null;

  const parsed = structuredClone(value) as unknown as Dme1119aScenarioDefinition;
  return validateDme1119aScenarioDefinition(parsed).length === 0 ? parsed : null;
}

/**
 * Returns the TST persisted configuration used as the scenario baseline.
 * Kept as a named helper so future presets cannot accidentally reuse a mutable object.
 */
export function createDefaultDme1119aScenarioConfiguration(): Dme1119aPersistedConfig {
  return structuredClone(getDefaultDme1119aConfig());
}

/**
 * Converts a full runtime state back to the persisted subset for protected-field comparison.
 */
export function scenarioConfigurationFromData(data: DmePmdtData): Dme1119aPersistedConfig {
  return extractDme1119aConfig(data);
}

export function applyDme1119aScenarioFaults(
  source: DmePmdtData,
  faults: readonly Dme1119aScenarioFault[],
): DmePmdtData {
  const data = structuredClone(source);
  data.simulationFaults = createDefaultSimulationFaults();
  for (const fault of faults) {
    if (fault.kind === "tx-power-loss") data.simulationFaults.transmitters[fault.transmitter].powerLossDb = fault.lossDb;
    if (fault.kind === "reply-delay-drift") data.simulationFaults.transmitters[fault.transmitter].replyDelayDriftUs = fault.driftUs;
    if (fault.kind === "pulse-spacing-drift") data.simulationFaults.transmitters[fault.transmitter].pulseSpacingDriftUs = fault.driftUs;
    if (fault.kind === "tx-frequency-error") data.simulationFaults.transmitters[fault.transmitter].frequencyErrorPpm = fault.ppm;
    if (fault.kind === "hpa-fault") data.simulationFaults.transmitters[fault.transmitter].hpaFault = fault.active;
    if (fault.kind === "rtc-comm-fault") data.simulationFaults.transmitters[fault.transmitter].rtcCommFault = fault.active;
    if (fault.kind === "antenna-vswr") data.simulationFaults.transmitters[fault.transmitter].antennaVswr = fault.ratio;
    if (fault.kind === "ident-signal") data.simulationFaults.identSignal = fault.state;
    if (fault.kind === "temperature") data.simulationFaults.temperature[fault.sensor] = fault.celsius;
    if (fault.kind === "ac-power") data.simulationFaults.acPowerFailed = fault.failed;
    if (fault.kind === "monitor-offset") {
      const rows = fault.monitor === 1 ? data.monitorOffsets.monitor1 : data.monitorOffsets.monitor2;
      const row = rows.find((candidate) => candidate.parameter === fault.parameter);
      if (row) row[fault.measurement] = fault.value;
    }
  }
  return recomputeDmeDerivedData(data);
}

export function configurationForDme1119aScenario(
  definition: Dme1119aScenarioDefinition,
  currentData: DmePmdtData = hydrateDme1119aData(getDefaultDme1119aConfig()),
): DmePmdtData {
  const data = hydrateDme1119aData(definition.configuration);
  data.local = definition.startPolicy.startLocal;
  data.rmsStatus.localControlMode = data.local;
  data.monitors.integral.bypass = definition.startPolicy.integralMonitorBypassed;
  data.monitors.standby.bypass = definition.startPolicy.standbyMonitorBypassed;
  data.identMode = definition.startPolicy.identMode;
  const main = definition.startPolicy.mainTransmitterId;
  const standby: DmeTransmitterId = main === "tx1" ? "tx2" : "tx1";
  data.monitorTransmitterStatus.mainSelect = main === "tx1" ? 1 : 2;
  data.monitorTransmitterStatus.antennaSelect = main === "tx1" ? 1 : 2;
  data.monitorTransmitterStatus.transmitterOn[main] = true;
  data.monitorTransmitterStatus.transmitterOn[standby] = data.rmsConfigStation.transmitterConfig === "Dual Transmitters";
  return recomputeDmeDerivedData({ ...currentData, ...data, simulationFaults: data.simulationFaults });
}

export function previewDme1119aScenario(definition: Dme1119aScenarioDefinition): {
  configuration: Dme1119aPersistedConfig;
  data: DmePmdtData;
} {
  const base = configurationForDme1119aScenario(definition);
  return {
    configuration: structuredClone(definition.configuration),
    data: applyDme1119aScenarioFaults(base, definition.faultInjections),
  };
}

function isLiveScenarioField(fieldId: string): boolean {
  return fieldId === "monitorTransmitterStatus.mainSelect"
    || fieldId === "monitorTransmitterStatus.antennaSelect"
    || fieldId.startsWith("monitorTransmitterStatus.transmitterOn.");
}

/** Classify DME fields before applying the scenario's open policy. */
export function dme1119aScenarioFieldRole(fieldId: string): ScenarioFieldRole {
  if (SESSION_ONLY_FIELD_IDS.has(fieldId) || isLiveScenarioField(fieldId)) return "runtime";
  if (fieldId.startsWith("securityAccounts.")) return "security";
  if (fieldId.startsWith("simulationFaults.") || fieldId.startsWith("overrides.")) return "instructor-only";
  return "student-operable";
}

export function getDme1119aScenarioProtectedFieldChanges(
  definition: Dme1119aScenarioDefinition,
  currentData: DmePmdtData,
): Dme1119aScenarioProtectedFieldChange[] {
  const expected = hydrateDme1119aData(definition.configuration);
  return dmeParameterFieldCatalog.flatMap((field) => {
    if (field.readOnly || SESSION_ONLY_FIELD_IDS.has(field.id) || isLiveScenarioField(field.id) || isDme1119aScenarioStudentEditable(definition, field.id)) return [];
    const expectedValue = getDmeParameterValue(expected, field.id);
    const actualValue = getDmeParameterValue(currentData, field.id);
    return Object.is(expectedValue, actualValue) ? [] : [{ fieldId: field.id, label: field.label }];
  });
}

function activeTransmitter(data: DmePmdtData): DmeTransmitterId | null {
  const transmitter = data.monitorTransmitterStatus.antennaSelect === 2 ? "tx2" : "tx1";
  return data.monitorTransmitterStatus.transmitterOn[transmitter] ? transmitter : null;
}

function rowStatus(
  data: DmePmdtData,
  monitor: "integral" | "standby",
  parameter: string,
): DmeParameterStatus | null {
  const row = (monitor === "integral" ? data.integralData : data.standbyData).find((item) => item.label === parameter);
  if (!row) return null;
  const statuses = [row.mon1Status, row.mon2Status].filter((status) => status !== "gray");
  if (statuses.length === 0) return null;
  if (statuses.includes("alarm")) return "alarm";
  if (statuses.includes("warning") || statuses.includes("yellow")) return "warning";
  return "normal";
}

function criterionResult(
  criterion: Dme1119aScenarioCriterion,
  data: DmePmdtData,
): Dme1119aScenarioCheck {
  const base = { id: criterion.id, label: criterion.kind, passed: false, detail: "Not evaluated" };
  if (criterion.kind === "monitor-normal") {
    const monitor = data.monitors[criterion.monitor];
    return { ...base, label: `${criterion.monitor} monitor normal`, passed: monitor.normal, detail: monitor.normal ? "Normal" : "Alarm or bypass active" };
  }
  if (criterion.kind === "monitor-alarm-clear") {
    const monitors = [data.monitors.integral, data.monitors.standby];
    const passed = criterion.severity === "primary"
      ? monitors.every((monitor) => !monitor.priAlarm)
      : criterion.severity === "secondary"
        ? monitors.every((monitor) => !monitor.secAlarm)
        : monitors.every((monitor) => !monitor.priAlarm && !monitor.secAlarm);
    return { ...base, label: `${criterion.severity} monitor alarm clear`, passed, detail: passed ? "Clear" : "Alarm active" };
  }
  if (criterion.kind === "active-transmitter") {
    const actual = activeTransmitter(data);
    const passed = criterion.expected === "any" ? actual !== null : actual === criterion.expected;
    return { ...base, label: "Active transmitter", passed, detail: actual?.toUpperCase() ?? "None" };
  }
  if (criterion.kind === "active-path-healthy") {
    const active = activeTransmitter(data);
    const vswr = rowStatus(data, "integral", "VSWR");
    const passed = active !== null
      && !data.txStatus.maintenanceAlert[active]
      && !data.rtcStatus.overload[active]
      && vswr !== "alarm";
    return { ...base, label: "Active path healthy", passed, detail: passed ? `${active?.toUpperCase()} healthy` : "Active path has an alarm" };
  }
  if (criterion.kind === "parameter-status") {
    const actual = rowStatus(data, criterion.monitor, criterion.parameter);
    return { ...base, label: `${criterion.monitor} ${criterion.parameter}`, passed: actual === criterion.expected, detail: actual ?? "Unavailable" };
  }
  if (criterion.kind === "rtc-overload-clear") {
    const active = activeTransmitter(data);
    const targets = criterion.transmitter === "active"
      ? (active ? [active] : [])
      : criterion.transmitter === "both" ? ["tx1", "tx2"] as const : [criterion.transmitter];
    const passed = targets.length > 0 && targets.every((tx) => !data.rtcStatus.overload[tx]);
    return { ...base, label: "RTC overload clear", passed, detail: passed ? "Clear" : "Overload active" };
  }
  if (criterion.kind === "bypass-cleared") {
    const passed = criterion.monitor === "both"
      ? !data.monitors.integral.bypass && !data.monitors.standby.bypass
      : !data.monitors[criterion.monitor].bypass;
    return { ...base, label: "Monitor bypass clear", passed, detail: passed ? "Released" : "Bypass active" };
  }
  if (criterion.kind === "ident-normal") {
    const status = rowStatus(data, "integral", "Ident Status");
    const passed = data.identMode === "normal" && status === "normal";
    return { ...base, label: "Ident normal", passed, detail: passed ? "Normal" : status ?? "Unavailable" };
  }
  if (criterion.kind === "fan-control") {
    return { ...base, label: "Fan control", passed: data.rmsStatus.fanControl === criterion.expected, detail: data.rmsStatus.fanControl };
  }
  const passed = !data.rmsStatus.acFailure;
  return { ...base, label: "AC power normal", passed, detail: passed ? "Normal" : "AC failure" };
}

export function evaluateDme1119aScenario(
  runtime: Dme1119aScenarioRuntime,
  currentData: DmePmdtData,
  evidence: Dme1119aScenarioEvidence = {},
): Dme1119aScenarioEvaluation {
  if (!runtime.active || !runtime.definition) {
    return {
      solved: false,
      correctable: true,
      pmdtComplete: false,
      hardwareComplete: false,
      hardware: { exactMatch: false, expectedKeys: [], selectedKeys: [], missingKeys: [], extraKeys: [] },
      checks: [],
      blockers: [],
    };
  }
  const baselineChecks = runtime.definition.successCriteria.map((criterion) => criterionResult(criterion, currentData));
  const blockers = getDme1119aScenarioProtectedFieldChanges(runtime.definition, currentData)
    .map((change) => `Protected configuration changed: ${change.label}.`);
  const dualTransmitter = runtime.definition.configuration.rmsConfigStation.transmitterConfig === "Dual Transmitters";
  const hasEditableRecovery = dme1119aScenarioAllowedFieldIds(runtime.definition).length > 0;
  const hasOperationalRecovery = runtime.definition.successCriteria.some((criterion) => (
    criterion.kind === "active-transmitter"
    || criterion.kind === "bypass-cleared"
    || criterion.kind === "fan-control"
    || criterion.kind === "ident-normal"
    || criterion.kind === "ac-power-normal"
  ));
  const hasRouteFault = dualTransmitter && runtime.definition.faultInjections.some((fault) => (
    fault.kind === "antenna-vswr"
    || ((fault.kind === "hpa-fault" || fault.kind === "rtc-comm-fault") && fault.active)
  ));
  const hasUnrecoverableAcFault = runtime.definition.faultInjections.some((fault) => fault.kind === "ac-power" && fault.failed);
  const diagnosis = runtime.definition.diagnosis;
  const twoStageEnabled = Boolean(diagnosis && Object.keys(evidence).length > 0);
  const correctable = diagnosis?.disposition === "replace-module"
    ? true
    : !hasUnrecoverableAcFault && (hasEditableRecovery || hasOperationalRecovery || hasRouteFault);
  const visitedViews = new Set(evidence.visitedViewIds ?? []);
  const acceptedActions = new Set(evidence.acceptedActionControlIds ?? []);
  const pmdtChecks = diagnosis?.pmdtCheckpoints.map((checkpoint) => ({
    id: `pmdt-${checkpoint.id}`,
    label: checkpoint.label,
    passed: visitedViews.has(checkpoint.viewId),
    detail: visitedViews.has(checkpoint.viewId) ? "Đã kiểm tra" : "Chưa mở màn hình",
  })) ?? [];
  const actionChecks = diagnosis?.requiredActionControlIds.map((controlId) => ({
    id: `action-${controlId}`,
    label: `PMDT action: ${controlId}`,
    passed: acceptedActions.has(controlId),
    detail: acceptedActions.has(controlId) ? "Đã thực hiện" : "Chưa thực hiện",
  })) ?? [];
  const expectedKeys = diagnosis?.expectedHardware.map(dme1119aHardwareOccurrenceKey) ?? [];
  const selectedKeys = [...new Set(evidence.selectedHardwareOccurrenceKeys ?? [])];
  const expectedSet = new Set(expectedKeys);
  const selectedSet = new Set(selectedKeys);
  const missingKeys = expectedKeys.filter((key) => !selectedSet.has(key));
  const extraKeys = selectedKeys.filter((key) => !expectedSet.has(key));
  const hardware = { exactMatch: missingKeys.length === 0 && extraKeys.length === 0, expectedKeys, selectedKeys, missingKeys, extraKeys };
  const hardwareComplete = !twoStageEnabled
    ? true
    : diagnosis
    ? diagnosis.disposition === "software-adjustment"
      ? selectedKeys.length === 0 && evidence.hardwareDispositionConfirmed === true
      : hardware.exactMatch
    : true;
  const baselineComplete = baselineChecks.length > 0 && baselineChecks.every((check) => check.passed);
  const pmdtComplete = !twoStageEnabled
    ? baselineComplete
    : diagnosis
    ? pmdtChecks.every((check) => check.passed)
      && actionChecks.every((check) => check.passed)
      && (diagnosis.disposition === "replace-module" || baselineComplete)
    : baselineComplete;
  const checks = [
    ...baselineChecks,
    ...(twoStageEnabled ? pmdtChecks : []),
    ...(twoStageEnabled ? actionChecks : []),
    ...(twoStageEnabled && diagnosis ? [{
      id: "hardware-selection",
      label: diagnosis.disposition === "software-adjustment" ? "Hardware replacement" : "Hardware block selection",
      passed: hardwareComplete,
      detail: diagnosis.disposition === "software-adjustment"
        ? (hardwareComplete ? "No hardware replacement selected" : "Không được chọn phần cứng cho lỗi phần mềm")
        : (hardwareComplete ? "Đúng occurrence" : "Chưa khớp block/occurrence đáp án"),
    }] : []),
  ];
  return {
    solved: !twoStageEnabled
      ? baselineComplete && blockers.length === 0
      : diagnosis
      ? pmdtComplete && hardwareComplete && blockers.length === 0
      : baselineComplete && blockers.length === 0,
    correctable,
    pmdtComplete,
    hardwareComplete,
    hardware,
    checks,
    blockers: correctable ? blockers : [...blockers, "Scenario may be uncorrectable with the configured student controls."],
  };
}

export function canEditDmeScenarioField(input: {
  active: boolean;
  editableFieldIds: readonly string[];
  editPolicy?: ScenarioEditPolicy;
  fieldId: string;
  readOnly?: boolean;
  securityLevel: number;
  local: boolean;
  loginDialogOpen: boolean;
}): boolean {
  if (input.loginDialogOpen || input.securityLevel < 3 || !input.local || input.readOnly || SESSION_ONLY_FIELD_IDS.has(input.fieldId)) return false;
  if (!input.active) return true;
  return isScenarioFieldAllowed({
    policy: input.editPolicy,
    legacyFieldIds: input.editableFieldIds,
    fieldId: input.fieldId,
    fields: dmeParameterFieldCatalog,
    isBlocked: (fieldId) => SESSION_ONLY_FIELD_IDS.has(fieldId) || isLiveScenarioField(fieldId),
    roleOf: dme1119aScenarioFieldRole,
  });
}

function withScenarioStart(
  scenario: Dme1119aScenarioDefinition,
  mainTransmitterId: DmeTransmitterId = "tx1",
): Dme1119aScenarioDefinition {
  // Built-in scenarios retain the legacy explicit whitelist. A newly authored
  // scenario uses the open default from createDefault...Definition().
  delete scenario.editPolicy;
  scenario.startPolicy.mainTransmitterId = mainTransmitterId;
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.integralMonitorBypassed = true;
  scenario.startPolicy.standbyMonitorBypassed = true;
  return scenario;
}

export function createLowOutputDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "tx1-low-output";
  scenario.name = "TX1 Low Output Power";
  scenario.description = "TX1 starts below the configured power alarm limit. Restore the RTC output setting and release monitor bypass.";
  scenario.difficulty = "basic";
  scenario.configuration.txConfigNominal.rtcParameters.powerOutput = -5;
  scenario.studentEditableFieldIds = ["txConfigNominal.rtcParameters.powerOutput"];
  scenario.diagnosis = createSoftwareDiagnosis({
    diagnosticSubsystem: "Transmitter Data",
    diagnosticResult: "No LRU fault isolated; TX1 RTC output parameter is below the configured target.",
    faultSummary: "Verify TX Power/ERP on PMDT, then correct RTC Power Output and Apply. Do not replace HPA for a configuration-only low-output case.",
    manualReferences: ["§3.6.9.1 Monitor Data", "§7.3.1 General Troubleshooting Information"],
    pmdtCheckpoints: [
      { id: "low-output-tx-data", label: "Transmitters > Data > Transmitter Data", viewId: "tx-data-main" },
      { id: "low-output-integral", label: "Monitor 1 > Data > Integral", viewId: "monitor-1-data-detail-integral" },
    ],
  });
  return scenario;
}

export function isDme1119aScenarioStudentEditable(
  definition: Dme1119aScenarioDefinition | null,
  fieldId: string,
): boolean {
  return Boolean(definition && isScenarioFieldAllowed({
    policy: definition.editPolicy,
    legacyFieldIds: definition.studentEditableFieldIds,
    fieldId,
    fields: dmeParameterFieldCatalog,
    isBlocked: (candidate) => SESSION_ONLY_FIELD_IDS.has(candidate) || isLiveScenarioField(candidate),
    roleOf: dme1119aScenarioFieldRole,
  }));
}

export function dme1119aScenarioAllowedFieldIds(
  definition: Dme1119aScenarioDefinition | null,
): string[] {
  if (!definition) return [];
  return scenarioAllowedFieldIds({
    policy: definition.editPolicy,
    legacyFieldIds: definition.studentEditableFieldIds,
    fields: dmeParameterFieldCatalog,
    isBlocked: (candidate) => SESSION_ONLY_FIELD_IDS.has(candidate) || isLiveScenarioField(candidate),
    roleOf: dme1119aScenarioFieldRole,
  });
}

export function createDelayDriftDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "tx1-delay-drift";
  scenario.name = "TX1 Reply Delay Drift";
  scenario.description = "A physical reply delay drift moves TX1 outside the monitor alarm band. Correct the RTC delay offset.";
  scenario.difficulty = "intermediate";
  scenario.faultInjections = [{ id: "tx1-delay", kind: "reply-delay-drift", transmitter: "tx1", driftUs: 0.6 }];
  scenario.studentEditableFieldIds = ["txConfigNominal.rtcParameters.replyDelayOffset", "txOffsets.2.tx1"];
  scenario.diagnosis = createSoftwareDiagnosis({
    diagnosticSubsystem: "RTC Configuration",
    diagnosticResult: "No LRU fault isolated; TX1 reply delay requires PMDT offset correction.",
    faultSummary: "Compare Integral/Standby Delay and RTC Data, then correct the Reply Delay Offset and Apply.",
    manualReferences: ["§3.6.9.1 Monitor Data", "§7.3.1 General Troubleshooting Information"],
    pmdtCheckpoints: [
      { id: "delay-integral", label: "Monitor 1 > Data > Integral", viewId: "monitor-1-data-detail-integral" },
      { id: "delay-rtc", label: "Transmitters > Data > RTC Data", viewId: "tx-rtc-data" },
    ],
  });
  return scenario;
}

export function createPrfOverloadDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "rtc-prf-overload";
  scenario.name = "RTC PRF Overload";
  scenario.description = "Configured PRF capacity is too low for the requested squitter traffic. Restore the RTC capacity.";
  scenario.difficulty = "intermediate";
  scenario.configuration.txConfigNominal.rtcParameters.maximumPrf = 700;
  scenario.studentEditableFieldIds = ["txConfigNominal.rtcParameters.maximumPrf", "txConfigNominal.rtcParameters.deadTime", "txConfigNominal.rtcParameters.minimumSquitter"];
  scenario.successCriteria = [
    { id: "integral-normal", kind: "monitor-normal", monitor: "integral" },
    { id: "prf-normal", kind: "parameter-status", monitor: "integral", parameter: "PRF", expected: "normal" },
    { id: "overload-clear", kind: "rtc-overload-clear", transmitter: "active" },
    { id: "bypass-clear", kind: "bypass-cleared", monitor: "both" },
  ];
  scenario.diagnosis = createSoftwareDiagnosis({
    diagnosticSubsystem: "RTC PRF",
    diagnosticResult: "No LRU fault isolated; configured PRF capacity is below the traffic demand.",
    faultSummary: "Use PRF/traffic and RTC status screens to distinguish capacity overload from an RTC hardware failure, then correct the configured capacity.",
    manualReferences: ["§3.6.9.1 Monitor Data", "§7.3.1 General Troubleshooting Information"],
    pmdtCheckpoints: [
      { id: "prf-integral", label: "Monitor 1 > Data > Integral", viewId: "monitor-1-data-detail-integral" },
      { id: "prf-rms", label: "RMS > Data > Maintenance Alerts", viewId: "rms-maintenance-alerts" },
    ],
  });
  return scenario;
}

export function createHpaChangeoverDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "tx1-hpa-changeover";
  scenario.name = "TX1 HPA Fault - Change Over";
  scenario.description = "TX1 has an HPA fault. Transfer the service to healthy TX2 and release both monitor bypasses.";
  scenario.difficulty = "intermediate";
  scenario.faultInjections = [{ id: "tx1-hpa", kind: "hpa-fault", transmitter: "tx1", active: true }];
  scenario.successCriteria = [
    { id: "tx2-active", kind: "active-transmitter", expected: "tx2" },
    { id: "active-path", kind: "active-path-healthy" },
    { id: "integral-normal", kind: "monitor-normal", monitor: "integral" },
    { id: "bypass-clear", kind: "bypass-cleared", monitor: "both" },
  ];
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Power Amplifier",
    diagnosticResult: "HPA 1 / 1A3 fault identified; transfer service to TX2 before module replacement.",
    faultSummary: "Confirm HPA fault on TX1 using PA status, transmitter data and Fault Isolation, then transfer to the healthy TX2 path.",
    manualReferences: ["§3.6.11.2 Fault Isolation", "§7.7.4 High Power Amplifier 1A3/1A7", "Figure 7-5"],
    pmdtCheckpoints: [
      { id: "hpa-status", label: "Transmitters > Data > Transmitter Data", viewId: "tx-data-main" },
      { id: "hpa-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    requiredActionControlIds: ["diagnostics-run-full", "tx-command-transfer"],
    target: createHardwareTarget("hpa-1", "diagram-hpa-1", "1A3"),
  });
  return scenario;
}

export function createIdentLossDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "ident-keying-loss";
  scenario.name = "Ident Keying Loss";
  scenario.description = "External keying is lost and self-key-on-loss is disabled. Restore a valid Ident path.";
  scenario.difficulty = "intermediate";
  scenario.configuration.txConfigNominal.ident.keyerSource = "External Keying";
  scenario.configuration.txConfigNominal.ident.selfKeyOnLoss = false;
  scenario.faultInjections = [{ id: "ident-loss", kind: "ident-signal", state: "missing" }];
  scenario.studentEditableFieldIds = ["txConfigNominal.ident.keyerSource", "txConfigNominal.ident.selfKeyOnLoss"];
  scenario.successCriteria = [
    { id: "ident-normal", kind: "ident-normal" },
    { id: "bypass-clear", kind: "bypass-cleared", monitor: "both" },
  ];
  scenario.diagnosis = createSoftwareDiagnosis({
    diagnosticSubsystem: "Ident / Keying",
    diagnosticResult: "No LRU replacement required; restore the external keying/ident configuration in PMDT.",
    faultSummary: "Use Ident Status, Ident Code and Transmitter Data to separate keying configuration from an RTC communication fault.",
    manualReferences: ["§3.6.9.1 Monitor Data", "§7.3.1 General Troubleshooting Information"],
    pmdtCheckpoints: [
      { id: "ident-integral", label: "Monitor 1 > Data > Integral", viewId: "monitor-1-data-detail-integral" },
      { id: "ident-tx-data", label: "Transmitters > Data > Transmitter Data", viewId: "tx-data-main" },
    ],
  });
  return scenario;
}

export function createVswrChangeoverDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "tx1-high-vswr";
  scenario.name = "TX1 Antenna VSWR - Change Over";
  scenario.description = "TX1 antenna VSWR is in alarm. Transfer the operational path to TX2.";
  scenario.difficulty = "advanced";
  scenario.faultInjections = [{ id: "tx1-vswr", kind: "antenna-vswr", transmitter: "tx1", ratio: 4.5 }];
  scenario.successCriteria = [
    { id: "tx2-active", kind: "active-transmitter", expected: "tx2" },
    { id: "active-path", kind: "active-path-healthy" },
    { id: "bypass-clear", kind: "bypass-cleared", monitor: "both" },
  ];
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "RF Distribution",
    diagnosticResult: "RF Switch 1K1 / TX1 antenna path identified; service must be transferred to TX2.",
    faultSummary: "Review VSWR and TX status before replacing an HPA. This training case narrows the RF feed fault to the RF Switch with Harness.",
    manualReferences: ["§3.6.9.1 Monitor Data", "§7.6 Fault Isolation Flowcharts", "§7.7.16 RF Switch with Harness 1K1"],
    pmdtCheckpoints: [
      { id: "vswr-integral", label: "Monitor 1 > Data > Integral", viewId: "monitor-1-data-detail-integral" },
      { id: "vswr-tx-data", label: "Transmitters > Data > Transmitter Data", viewId: "tx-data-main" },
      { id: "vswr-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    requiredActionControlIds: ["diagnostics-run-full", "tx-command-transfer"],
    target: createHardwareTarget("rf-switch", "diagram-rf-switch", "1K1"),
  });
  return scenario;
}

export function createCalibrationErrorDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "monitor-calibration-error";
  scenario.name = "Monitor Calibration Offset Error";
  scenario.description = "Monitor 1 delay calibration is offset from the TST baseline. Restore the calibrated value.";
  scenario.difficulty = "advanced";
  scenario.faultInjections = [{ id: "monitor1-delay", kind: "monitor-offset", monitor: 1, measurement: "integral", parameter: "Delay Offset", value: 0.6 }];
  scenario.studentEditableFieldIds = ["monitorOffsets.monitor1.0.integral"];
  scenario.successCriteria = [
    { id: "delay-normal", kind: "parameter-status", monitor: "integral", parameter: "Delay", expected: "normal" },
    { id: "bypass-clear", kind: "bypass-cleared", monitor: "both" },
  ];
  scenario.diagnosis = createSoftwareDiagnosis({
    diagnosticSubsystem: "Monitor Calibration",
    diagnosticResult: "No hardware fault isolated; Monitor 1 delay offset is outside the TST baseline.",
    faultSummary: "Use Monitor Offsets and Scale Factors to correct the delay calibration, then Apply and release both monitor bypasses.",
    manualReferences: ["§3.6.9.4 Monitor Offsets and Scale Factors", "§7.3.1 General Troubleshooting Information"],
    pmdtCheckpoints: [
      { id: "calibration-integral", label: "Monitor 1 > Data > Integral", viewId: "monitor-1-data-detail-integral" },
      { id: "calibration-offsets", label: "Monitor 1 > Offsets and Scale Factors", viewId: "monitor-1-offsets" },
    ],
  });
  return scenario;
}

export function createOvertemperatureDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "cabinet-overtemperature";
  scenario.name = "Cabinet Overtemperature";
  scenario.description = "Cabinet temperature is above the high limit. Turn the fan on and restore the thermal condition.";
  scenario.difficulty = "advanced";
  scenario.faultInjections = [{ id: "cabinet-temp", kind: "temperature", sensor: "Cabinet Temperature", celsius: 45 }];
  scenario.studentEditableFieldIds = [];
  scenario.successCriteria = [
    { id: "fan-on", kind: "fan-control", expected: "On" },
    { id: "bypass-clear", kind: "bypass-cleared", monitor: "both" },
  ];
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Facilities / Cooling",
    diagnosticResult: "Fan Controller CCA 1A2A2 is the suspected LRU after temperature and fan status checks.",
    faultSummary: "Check RMS temperature and fan-control status before restoring the DME to service; identify the Fan Controller on the rear cabinet.",
    manualReferences: ["§3.6.7 RMS Data Screens", "§7.7.14 Fan Controller CCA 1A2A2", "§7.7.15 Circulating Fan 1A2A3"],
    pmdtCheckpoints: [
      { id: "temperature-rms", label: "RMS > Data > A/D Data", viewId: "rms-ad-data" },
      { id: "temperature-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("fan-controller", "rear-fan-controller", "1A2A2"),
  });
  return scenario;
}

export function createMonitor1LruFaultDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "monitor-1-lru-fault";
  scenario.name = "Monitor Interrogator 1 LRU Fault (1A11)";
  scenario.description = "Use Monitor 1 data, test results and Fault Isolation to identify the Monitor Interrogator 1A11 LRU.";
  scenario.difficulty = "advanced";
  scenario.faultInjections = [{ id: "monitor1-delay-symptom", kind: "monitor-offset", monitor: 1, measurement: "integral", parameter: "Delay Offset", value: 1.2 }];
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Monitor",
    diagnosticResult: "Monitor Interrogator 1 / 1A11 identified by Full Diagnostics.",
    faultSummary: "The Monitor 1 path is abnormal after PMDT test verification; replace the pluggable Monitor Interrogator and repeat calibration.",
    manualReferences: ["§3.6.11.2 Fault Isolation", "§7.7.1 Monitor Interrogator 1A11/1A15"],
    pmdtCheckpoints: [
      { id: "monitor1-data", label: "Monitor 1 > Data > Integral", viewId: "monitor-1-data-detail-integral" },
      { id: "monitor1-test", label: "Monitor 1 > Test Results", viewId: "monitor-1-test-alarm-limits" },
      { id: "monitor1-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("monitor-1", "diagram-monitor-1", "1A11"),
  });
  return scenario;
}

export function createRtc1LruFaultDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "rtc-1-lru-fault";
  scenario.name = "Receiver/Transmitter Controller 1 Fault (1A10)";
  scenario.description = "Identify a TX1 RTC communication/processor fault from RTC status and transmitter data, then locate 1A10.";
  scenario.difficulty = "advanced";
  scenario.faultInjections = [{ id: "rtc1-comm", kind: "rtc-comm-fault", transmitter: "tx1", active: true }];
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Receiver / Transmitter Controller",
    diagnosticResult: "RTC 1 / 1A10 communication fault identified.",
    faultSummary: "Separate RTC communication failure from an RF amplifier fault using RTC alerts, Tx Data and Fault Isolation.",
    manualReferences: ["§3.6.11.2 Fault Isolation", "§7.7.2 Receiver/Transmitter Controller 1A10/1A16"],
    pmdtCheckpoints: [
      { id: "rtc1-data", label: "Transmitters > Data > RTC Data", viewId: "tx-rtc-data" },
      { id: "rtc1-maintenance", label: "RMS > Data > Maintenance Alerts", viewId: "rms-maintenance-alerts" },
      { id: "rtc1-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("rtc-1", "diagram-rtc-1", "1A10"),
  });
  return scenario;
}

export function createLpa1LruFaultDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "lpa-1-lru-fault";
  scenario.name = "Low Power Amplifier 1 Fault (1A9)";
  scenario.description = "Use low-output and pulse/PA indications to identify the TX1 Low Power Amplifier 1A9.";
  scenario.difficulty = "advanced";
  scenario.faultInjections = [{ id: "lpa1-power-loss", kind: "tx-power-loss", transmitter: "tx1", lossDb: 12 }];
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Power Amplifier",
    diagnosticResult: "LPA 1 / 1A9 low-output fault identified.",
    faultSummary: "Check transmitter power and pulse performance before replacing HPA; this case isolates the low-power driver stage.",
    manualReferences: ["§3.6.11.2 Fault Isolation", "§7.7.3 Low Power Amplifier 1A9/1A17"],
    pmdtCheckpoints: [
      { id: "lpa1-tx", label: "Transmitters > Data > Transmitter Data", viewId: "tx-data-main" },
      { id: "lpa1-pa", label: "RMS > Status > Monitor/Transmitter Status", viewId: "rms-status-monitor-tx" },
      { id: "lpa1-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("lpa-synth-1", "diagram-lpa-synth-1", "1A9"),
  });
  return scenario;
}

export function createPowerSupply1LruFaultDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "power-supply-1-lru-fault";
  scenario.name = "TX1 Power Supply Fault (1A24)";
  scenario.description = "Trace a TX1 DC power indication fault through RMS Power Supply Data and the Fault Isolation flowchart.";
  scenario.difficulty = "advanced";
  scenario.faultInjections = [{ id: "power1-ac", kind: "ac-power", failed: true }];
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Power Supplies",
    diagnosticResult: "TX1 Power Supply 1 / 1A24 identified after RMS and front-panel power checks.",
    faultSummary: "Verify AC/DC source and RMS power readings before replacing the pluggable TX1 Power Supply 1A24.",
    manualReferences: ["Figure 7-1 Fault Isolation", "§7.7.12 Power Supply 1A24/1A25"],
    pmdtCheckpoints: [
      { id: "power1-rms", label: "RMS > Data > Power Supply Data", viewId: "rms-power-supply" },
      { id: "power1-io", label: "RMS > Data > Digital I/O", viewId: "rms-digital-io" },
      { id: "power1-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("tx-power-supply-1", "diagram-tx-power-supply-1", "1A24"),
  });
  return scenario;
}

export function createRmsProcessorLruFaultDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "rms-processor-lru-fault";
  scenario.name = "RMS Processor CCA Fault (1A13)";
  scenario.description = "Use PMDT connection, RMS status and Full Diagnostics to identify the RMS Processor CCA 1A13.";
  scenario.difficulty = "advanced";
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "RMS / Control",
    diagnosticResult: "RMS Processor CCA 1A13 identified by the connection and power-up flow.",
    faultSummary: "Follow the manual's direct-connection flow: distinguish PMDT/RMS communication from downstream transmitter faults before replacing 1A13.",
    manualReferences: ["Figure 7-1 Performing Fault Isolation Using a Direct Connection", "§7.7.5 RMS Processor CCA 1A13"],
    pmdtCheckpoints: [
      { id: "rms-status", label: "RMS > Status", viewId: "rms-status-main" },
      { id: "rms-power", label: "RMS > Data > Power Supply Data", viewId: "rms-power-supply" },
      { id: "rms-diagnostics", label: "Diagnostics > Power Up Results", viewId: "diagnostics-power-up" },
    ],
    target: createHardwareTarget("rms", "diagram-rms", "1A13"),
  });
  return scenario;
}

export function createFacilitiesCcaLruFaultDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "facilities-cca-lru-fault";
  scenario.name = "Facilities CCA Fault (1A14)";
  scenario.description = "Use RMS temperature, AC/facilities indications and Fault Isolation to identify Facilities CCA 1A14.";
  scenario.difficulty = "advanced";
  scenario.faultInjections = [{ id: "external-temp", kind: "temperature", sensor: "External Temperature", celsius: 55 }];
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Facilities",
    diagnosticResult: "Facilities CCA 1A14 identified after the facilities temperature/IO check.",
    faultSummary: "Do not treat a facilities sensor or AC indication as a transmitter RF failure; inspect the Facilities CCA path first.",
    manualReferences: ["§7.6 Fault Isolation Flowcharts", "§7.7.6 RMS Facilities CCA 1A14"],
    pmdtCheckpoints: [
      { id: "facilities-temp", label: "RMS > Data > A/D Data", viewId: "rms-ad-data" },
      { id: "facilities-io", label: "RMS > Data > Digital I/O", viewId: "rms-digital-io" },
      { id: "facilities-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("facilities", "front-facilities", "1A14"),
  });
  return scenario;
}

export function createBcps1LruFaultDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "bcps-1-lru-fault";
  scenario.name = "BCPS 1 Fault (1A20)";
  scenario.description = "Use power-supply and battery indications to identify the rear-cabinet BCPS 1A20.";
  scenario.difficulty = "advanced";
  scenario.faultInjections = [{ id: "bcps1-ac", kind: "ac-power", failed: true }];
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Power Supplies",
    diagnosticResult: "BCPS 1 / 1A20 identified by the power and battery fault path.",
    faultSummary: "Check AC/DC, battery and 48 V indications before replacing the rear-cabinet BCPS CCA.",
    manualReferences: ["Figure 7-1 Fault Isolation", "§7.7.7 BCPS CCA 1A20/1A21"],
    pmdtCheckpoints: [
      { id: "bcps1-power", label: "RMS > Data > Power Supply Data", viewId: "rms-power-supply" },
      { id: "bcps1-status", label: "RMS > Status", viewId: "rms-status-main" },
      { id: "bcps1-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("bcps-1", "diagram-bcps-1", "1A20"),
  });
  return scenario;
}

export function createInterfaceCcaLruFaultDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "interface-cca-lru-fault";
  scenario.name = "Interface CCA Fault (1A19)";
  scenario.description = "Use remote/control communication indications and the Fault Isolation path to identify Interface CCA 1A19.";
  scenario.difficulty = "advanced";
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Interface / Remote Control",
    diagnosticResult: "Interface CCA 1A19 identified after the RMS/RCSU communication checks.",
    faultSummary: "Separate a remote interface failure from an RMS processor failure using RMS Status and the direct/pass-through connection flow.",
    manualReferences: ["Figures 7-2 and 7-3 Remote Fault Isolation", "§7.7.8 Interface CCA 1A19"],
    pmdtCheckpoints: [
      { id: "interface-rms", label: "RMS > Status", viewId: "rms-status-main" },
      { id: "interface-logs", label: "RMS > Logs > Command Activity", viewId: "rms-logs-command-activity" },
      { id: "interface-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("interface-card", "diagram-interface-card", "1A19"),
  });
  return scenario;
}

export function createRfSwitchLruFaultDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "rf-switch-lru-fault";
  scenario.name = "RF Switch with Harness Fault (1K1)";
  scenario.description = "Correlate antenna-path VSWR and transfer behavior with Fault Isolation before identifying the rear-cabinet RF Switch 1K1.";
  scenario.difficulty = "advanced";
  scenario.faultInjections = [{ id: "rf-switch-vswr", kind: "antenna-vswr", transmitter: "tx1", ratio: 4.5 }];
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "RF Distribution",
    diagnosticResult: "RF Switch with Harness 1K1 identified in the TX1 antenna path.",
    faultSummary: "Use VSWR, TX status and the changeover path to distinguish the RF switch harness from the power amplifier.",
    manualReferences: ["§7.6 Fault Isolation Flowcharts", "§7.7.16 RF Switch with Harness 1K1"],
    pmdtCheckpoints: [
      { id: "rf-switch-integral", label: "Monitor 1 > Data > Integral", viewId: "monitor-1-data-detail-integral" },
      { id: "rf-switch-tx", label: "Transmitters > Data > Transmitter Data", viewId: "tx-data-main" },
      { id: "rf-switch-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    requiredActionControlIds: ["diagnostics-run-full", "tx-command-transfer"],
    target: createHardwareTarget("rf-switch", "diagram-rf-switch", "1K1"),
  });
  return scenario;
}

export function createLcuLruFaultDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "lcu-lru-fault";
  scenario.name = "Local Control Unit Fault (1A1)";
  scenario.description = "Use Local mode, LCU indicators and the Fault Isolation flowchart to identify the front-panel LCU assembly 1A1.";
  scenario.difficulty = "advanced";
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "LCU / Control",
    diagnosticResult: "Local Control Unit 1A1 identified by the local-control and lamp-test flow.",
    faultSummary: "Confirm the local-control state and LCU indicators before replacing the assembly; do not confuse a PMDT login problem with an LCU fault.",
    manualReferences: ["Figures 7-4 and 7-5 Fault Isolation L1/L1A", "§7.7.9 LCU Assembly 1A1"],
    pmdtCheckpoints: [
      { id: "lcu-rms", label: "RMS > Status", viewId: "rms-status-main" },
      { id: "lcu-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("lcu", "diagram-lcu", "1A1"),
  });
  return scenario;
}

export const DME1119A_BUILT_IN_SCENARIOS = [
  { id: "default", label: "New from Đài TEST/TST", create: createDefaultDme1119aScenarioDefinition },
  { id: "tx1-low-output", label: "TX1 low output power", create: createLowOutputDme1119aScenario },
  { id: "tx1-delay-drift", label: "TX1 reply delay drift", create: createDelayDriftDme1119aScenario },
  { id: "rtc-prf-overload", label: "RTC PRF overload", create: createPrfOverloadDme1119aScenario },
  { id: "tx1-hpa-changeover", label: "TX1 HPA fault - change over", create: createHpaChangeoverDme1119aScenario },
  { id: "ident-keying-loss", label: "Ident keying loss", create: createIdentLossDme1119aScenario },
  { id: "tx1-high-vswr", label: "TX1 high VSWR - change over", create: createVswrChangeoverDme1119aScenario },
  { id: "monitor-calibration-error", label: "Monitor calibration error", create: createCalibrationErrorDme1119aScenario },
  { id: "cabinet-overtemperature", label: "Cabinet overtemperature", create: createOvertemperatureDme1119aScenario },
  { id: "monitor-1-lru", label: "Monitor Interrogator 1 LRU fault", create: createMonitor1LruFaultDme1119aScenario },
  { id: "rtc-1-lru", label: "RTC 1 LRU fault", create: createRtc1LruFaultDme1119aScenario },
  { id: "lpa-1-lru", label: "LPA 1 LRU fault", create: createLpa1LruFaultDme1119aScenario },
  { id: "power-supply-1-lru", label: "TX1 Power Supply LRU fault", create: createPowerSupply1LruFaultDme1119aScenario },
  { id: "rms-processor-lru", label: "RMS Processor LRU fault", create: createRmsProcessorLruFaultDme1119aScenario },
  { id: "facilities-cca-lru", label: "Facilities CCA LRU fault", create: createFacilitiesCcaLruFaultDme1119aScenario },
  { id: "bcps-1-lru", label: "BCPS 1 LRU fault", create: createBcps1LruFaultDme1119aScenario },
  { id: "interface-cca-lru", label: "Interface CCA LRU fault", create: createInterfaceCcaLruFaultDme1119aScenario },
  { id: "rf-switch-lru", label: "RF Switch with Harness LRU fault", create: createRfSwitchLruFaultDme1119aScenario },
  { id: "lcu-lru", label: "Local Control Unit LRU fault", create: createLcuLruFaultDme1119aScenario },
] as const;
