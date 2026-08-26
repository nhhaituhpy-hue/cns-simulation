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
} from "@/lib/dme-types";
import {
  dmeParameterFieldCatalog,
  getDmeParameterValue,
  validateDmeParameterField,
} from "./config";
import { recomputeDmeDerivedData } from "./derived-data";

export const DME1119A_SCENARIO_SCHEMA_VERSION = 1 as const;

export type Dme1119aScenarioDifficulty = "basic" | "intermediate" | "advanced";

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
  successCriteria: Dme1119aScenarioCriterion[];
  studentEditableFieldIds: string[];
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

  if (parseDme1119aConfig(definition.configuration)) {
    const runtime = hydrateDme1119aData(definition.configuration);
    for (const field of dmeParameterFieldCatalog) {
      if (field.readOnly) continue;
      const value = getDmeParameterValue(runtime, field.id);
      const issue = validateDmeParameterField(field, value);
      if (issue) issues.push(`${field.label}: ${issue}`);
    }
  }

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

export function getDme1119aScenarioProtectedFieldChanges(
  definition: Dme1119aScenarioDefinition,
  currentData: DmePmdtData,
): Dme1119aScenarioProtectedFieldChange[] {
  const expected = hydrateDme1119aData(definition.configuration);
  const editable = new Set(definition.studentEditableFieldIds);
  return dmeParameterFieldCatalog.flatMap((field) => {
    if (field.readOnly || SESSION_ONLY_FIELD_IDS.has(field.id) || isLiveScenarioField(field.id) || editable.has(field.id)) return [];
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
): Dme1119aScenarioEvaluation {
  if (!runtime.active || !runtime.definition) return { solved: false, correctable: true, checks: [], blockers: [] };
  const checks = runtime.definition.successCriteria.map((criterion) => criterionResult(criterion, currentData));
  const blockers = getDme1119aScenarioProtectedFieldChanges(runtime.definition, currentData)
    .map((change) => `Protected configuration changed: ${change.label}.`);
  const dualTransmitter = runtime.definition.configuration.rmsConfigStation.transmitterConfig === "Dual Transmitters";
  const hasEditableRecovery = runtime.definition.studentEditableFieldIds.length > 0;
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
  const correctable = !hasUnrecoverableAcFault && (hasEditableRecovery || hasOperationalRecovery || hasRouteFault);
  return {
    solved: checks.length > 0 && checks.every((check) => check.passed) && blockers.length === 0,
    correctable,
    checks,
    blockers: correctable ? blockers : [...blockers, "Scenario may be uncorrectable with the configured student controls."],
  };
}

export function canEditDmeScenarioField(input: {
  active: boolean;
  editableFieldIds: readonly string[];
  fieldId: string;
  readOnly?: boolean;
  securityLevel: number;
  local: boolean;
  loginDialogOpen: boolean;
}): boolean {
  if (input.loginDialogOpen || input.securityLevel < 3 || !input.local || input.readOnly || SESSION_ONLY_FIELD_IDS.has(input.fieldId)) return false;
  if (!input.active) return true;
  return input.editableFieldIds.includes(input.fieldId);
}

function withScenarioStart(
  scenario: Dme1119aScenarioDefinition,
  mainTransmitterId: DmeTransmitterId = "tx1",
): Dme1119aScenarioDefinition {
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
  return scenario;
}

export function createDelayDriftDme1119aScenario(): Dme1119aScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDme1119aScenarioDefinition());
  scenario.id = "tx1-delay-drift";
  scenario.name = "TX1 Reply Delay Drift";
  scenario.description = "A physical reply delay drift moves TX1 outside the monitor alarm band. Correct the RTC delay offset.";
  scenario.difficulty = "intermediate";
  scenario.faultInjections = [{ id: "tx1-delay", kind: "reply-delay-drift", transmitter: "tx1", driftUs: 0.6 }];
  scenario.studentEditableFieldIds = ["txConfigNominal.rtcParameters.replyDelayOffset", "txOffsets.2.tx1"];
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
] as const;
