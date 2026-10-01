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
  Dvor1150ViewId,
} from "./types";
import {
  dvor1150HardwareOccurrenceKey,
  resolveDvor1150HardwareOccurrence,
  type Dvor1150BlockId,
  type Dvor1150HardwareOccurrence,
} from "@/modules/devices/dvor-1150/block-diagram-data";
import {
  isScenarioFieldAllowed,
  scenarioAllowedFieldIds,
  validateScenarioEditPolicy,
  type ScenarioEditPolicy,
  type ScenarioFieldRole,
} from "@/lib/scenario-policy";

export const DVOR1150_SCENARIO_SCHEMA_VERSION = 2 as const;

export type Dvor1150ScenarioDifficulty = "basic" | "intermediate" | "advanced";
export type Dvor1150ScenarioDisposition = "replace-module" | "software-adjustment";
export type Dvor1150DiagnosticRun = "full" | "on-air" | "not-required";

export interface Dvor1150ScenarioPmdtCheckpoint {
  id: string;
  label: string;
  viewId: Dvor1150ViewId;
}

export interface Dvor1150ScenarioHardwareTarget extends Dvor1150HardwareOccurrence {
  assemblyId?: string;
}

export interface Dvor1150ScenarioDiagnosis {
  disposition: Dvor1150ScenarioDisposition;
  diagnosticRun: Dvor1150DiagnosticRun;
  diagnosticSubsystem: string;
  diagnosticResult: string;
  faultSummary: string;
  manualReferences: string[];
  pmdtCheckpoints: Dvor1150ScenarioPmdtCheckpoint[];
  requiredActionControlIds: string[];
  expectedHardware: Dvor1150ScenarioHardwareTarget[];
}

export interface Dvor1150ScenarioEvidence {
  visitedViewIds?: readonly string[];
  acceptedActionControlIds?: readonly string[];
  selectedHardwareOccurrenceKeys?: readonly string[];
  hardwareDispositionConfirmed?: boolean;
}

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
  /** Omitted keeps the original whitelist; Open must be chosen explicitly. */
  editPolicy?: ScenarioEditPolicy;
  /** Optional two-stage diagnosis contract; legacy JSON remains valid. */
  diagnosis?: Dvor1150ScenarioDiagnosis;
}

export interface Dvor1150ScenarioRuntime {
  active: boolean;
  definition: Dvor1150ScenarioDefinition | null;
  startedAt: string | null;
}

export interface Dvor1150ScenarioEvaluation {
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

function createHardwareTarget(
  blockId: Dvor1150BlockId,
  occurrenceId: string,
  assemblyId?: string,
): Dvor1150ScenarioHardwareTarget {
  const occurrence = resolveDvor1150HardwareOccurrence(blockId, occurrenceId);
  if (!occurrence) throw new Error(`Unknown DVOR 1150 hardware occurrence: ${blockId}/${occurrenceId}`);
  return { ...occurrence, ...(assemblyId ? { assemblyId } : {}) };
}

function createHardwareDiagnosis(input: {
  diagnosticRun?: Exclude<Dvor1150DiagnosticRun, "not-required">;
  diagnosticSubsystem: string;
  diagnosticResult: string;
  faultSummary: string;
  manualReferences: string[];
  pmdtCheckpoints: Dvor1150ScenarioPmdtCheckpoint[];
  requiredActionControlIds?: string[];
  target: Dvor1150ScenarioHardwareTarget;
}): Dvor1150ScenarioDiagnosis {
  const diagnosticRun = input.diagnosticRun ?? "full";
  return {
    disposition: "replace-module",
    diagnosticRun,
    diagnosticSubsystem: input.diagnosticSubsystem,
    diagnosticResult: input.diagnosticResult,
    faultSummary: input.faultSummary,
    manualReferences: [...input.manualReferences],
    pmdtCheckpoints: [...input.pmdtCheckpoints],
    requiredActionControlIds: input.requiredActionControlIds ?? [`diagnostics-run-${diagnosticRun}`],
    expectedHardware: [input.target],
  };
}

function createSoftwareDiagnosis(input: {
  diagnosticSubsystem: string;
  diagnosticResult: string;
  faultSummary: string;
  manualReferences: string[];
  pmdtCheckpoints: Dvor1150ScenarioPmdtCheckpoint[];
  requiredActionControlIds?: string[];
}): Dvor1150ScenarioDiagnosis {
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

function withScenarioStart(scenario: Dvor1150ScenarioDefinition): Dvor1150ScenarioDefinition {
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  return scenario;
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
  scenario.diagnosis = createSoftwareDiagnosis({
    diagnosticSubsystem: "Transmitter Data",
    diagnosticResult: "No LRU fault isolated; TX1 carrier output parameter is below the configured target.",
    faultSummary: "Compare TX1 carrier/RF level with Monitor Data and Diagnostics. Correct the permitted output setting and Apply; do not replace a card for a configuration-only low-output case.",
    manualReferences: ["§3.4.2.5, RMS Data Screens", "§3.4.2.17, Diagnostics Screen", "§7.3.1, Table 7-1"],
    pmdtCheckpoints: [
      { id: "carrier-tx-data", label: "Transmitters > Data > Transmitter 1", viewId: "tx-data-tx1" },
      { id: "carrier-monitor", label: "Monitors > Data > Integral Monitor", viewId: "monitor-integrity" },
      { id: "carrier-power-up", label: "Diagnostics > Power-Up Results", viewId: "diagnostics-power-up" },
    ],
  });
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
  scenario.diagnosis = createSoftwareDiagnosis({
    diagnosticSubsystem: "Monitor / Modulation",
    diagnosticResult: "Power-up diagnostics are normal; the 30 Hz reference modulation is below the configured transmitter target.",
    faultSummary: "Verify 30 Hz and 9960 Hz readings on the Monitor Data screen, then correct the permitted reference modulation value and Apply.",
    manualReferences: ["§3.4.2.5, RMS Data Screens", "§3.4.2.17, Diagnostics Screen", "§7.3.1, Table 7-1"],
    pmdtCheckpoints: [
      { id: "reference-monitor", label: "Monitors > Data > Integral Monitor", viewId: "monitor-integrity" },
      { id: "reference-tx-data", label: "Transmitters > Data > Transmitter 1", viewId: "tx-data-tx1" },
      { id: "reference-power-up", label: "Diagnostics > Power-Up Results", viewId: "diagnostics-power-up" },
    ],
  });
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
  scenario.diagnosis = createSoftwareDiagnosis({
    diagnosticSubsystem: "Monitor Configuration",
    diagnosticResult: "No LRU fault isolated; the configured TX1 sideband RF scales are creating the VSWR alarm profile.",
    faultSummary: "Use Sideband Antenna VSWR, Transmitter Data and Power-Up Diagnostics to distinguish a PMDT scale correction from a card replacement. Restore the permitted scales and Apply.",
    manualReferences: ["§3.4.2.16.7, Change the Sideband Power Level", "§3.4.2.17, Diagnostics Screen", "§7.3.1, Table 7-1"],
    pmdtCheckpoints: [
      { id: "sideband-vswr", label: "Monitors > Data > Sideband Antenna VSWR", viewId: "monitor-sideband-vswr" },
      { id: "sideband-tx-data", label: "Transmitters > Data > Transmitter 1", viewId: "tx-data-tx1" },
      { id: "sideband-power-up", label: "Diagnostics > Power-Up Results", viewId: "diagnostics-power-up" },
    ],
  });
  return scenario;
}

export function createSystemAlarmFieldDetectorScenario(): Dvor1150ScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDvor1150ScenarioDefinition());
  scenario.id = "system-alarm-field-detector";
  scenario.name = "System Alarm - Field Detector Signal Path";
  scenario.description = "A system alarm is present. Use the monitor data and On-Air Fault Isolation to separate a field signal path fault from a PMDT configuration error, then identify the Field Detector assembly.";
  scenario.difficulty = "advanced";
  scenario.configuration.monitor.offsets.mon1.rfLevel = 5;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticRun: "on-air",
    diagnosticSubsystem: "Alarm/Alert Analysis",
    diagnosticResult: "Field monitor input path is abnormal; the Field Detector assembly is the isolated hardware boundary.",
    faultSummary: "The alarm follows the field-monitor signal path rather than a transmitter setpoint. Verify Monitor Data and On-Air Fault Isolation before selecting the Field Detector occurrence.",
    manualReferences: ["§3.4.2.17.2, Fault Isolation Test Results", "§7.3.1(a), System Alarm Condition Exists", "§2.4.4.2, Field Detector Assembly"],
    pmdtCheckpoints: [
      { id: "system-alarm-rms", label: "RMS > Status / Maintenance Alerts", viewId: "rms-status" },
      { id: "system-alarm-monitor", label: "Monitors > Data > Integral Monitor", viewId: "monitor-integrity" },
      { id: "system-alarm-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("field-detector", "diagram-field-detector", "2A6A1/A2"),
  });
  return scenario;
}

export function createRmsFaultScenario(): Dvor1150ScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDvor1150ScenarioDefinition());
  scenario.id = "rms-cpu-fault";
  scenario.name = "RMS / CPU Fault (1A13)";
  scenario.description = "RMS A/D evidence and Full Fault Isolation point to the Remote Maintenance System processor. Identify the 1A13 CPU CCA rather than changing monitor limits.";
  scenario.difficulty = "advanced";
  scenario.configuration.rms.adLimits.tx1.plus28V = { low: 29, preLow: 29.5, preHigh: 30, high: 31 };
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Logon / RMM",
    diagnosticResult: "RMS / CPU CCA 1A13 failed the processor and memory integrity path.",
    faultSummary: "Check RMS A/D data and Full Fault Isolation. The correct maintenance answer is the RMS CPU CCA 1A13, followed by the manual replacement and software verification procedure.",
    manualReferences: ["§3.4.2.17, Diagnostics Screen", "§7.3.1(b), RMS Fault", "§6.4.4, Replacing CPU (1A13) CCA"],
    pmdtCheckpoints: [
      { id: "rms-status", label: "RMS > Status", viewId: "rms-status" },
      { id: "rms-ad", label: "RMS > Data > A/D Data", viewId: "rms-ad-data" },
      { id: "rms-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("rms-cpu", "diagram-rms", "1A13"),
  });
  return scenario;
}

export function createTx1FaultScenario(): Dvor1150ScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDvor1150ScenarioDefinition());
  scenario.id = "transmitter-1-fault";
  scenario.name = "Transmitter 1 Fault - CSB Power Amplifier (1A3)";
  scenario.description = "TX1 has a carrier-path fault. Confirm the TX1 data and Full Fault Isolation result, transfer service to TX2, and identify the TX1 CSB Power Amplifier assembly.";
  scenario.difficulty = "advanced";
  scenario.configuration.transmitters.tx1.nominal.outputPower = 0;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Power Amplifier",
    diagnosticResult: "Transmitter 1 carrier power path is failed at CSB Power Amplifier 1A3.",
    faultSummary: "A transmitter alarm must be isolated before a monitor offset is changed. Confirm the TX1 carrier data, run Full Fault Isolation, transfer the service to TX2, then identify CSB amplifier 1A3.",
    manualReferences: ["§3.4.2.5, RMS Data Screens", "§3.4.2.17.2, Fault Isolation Test Results", "§7.3.1(c), Transmitter No. 1 Fault", "§2.3.2.3, CSB Power Amplifier Assembly"],
    pmdtCheckpoints: [
      { id: "tx1-fault-data", label: "Transmitters > Data > Transmitter 1", viewId: "tx-data-tx1" },
      { id: "tx1-fault-monitor", label: "Monitors > Data > Integral Monitor", viewId: "monitor-integrity" },
      { id: "tx1-fault-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    requiredActionControlIds: ["diagnostics-run-full", "tx-transfer-tx2"],
    target: createHardwareTarget("csb-power-amplifier", "diagram-csb-tx1", "1A3"),
  });
  return scenario;
}

export function createMonitor1FaultScenario(): Dvor1150ScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDvor1150ScenarioDefinition());
  scenario.id = "monitor-1-fault";
  scenario.name = "Monitor 1 Fault (1A8)";
  scenario.description = "Monitor 1 reports an integrity fault while the transmitter path remains available. Use Monitor Data and On-Air Fault Isolation to identify the 1A8 Monitor CCA.";
  scenario.difficulty = "advanced";
  scenario.configuration.monitor.offsets.mon1.rfLevel = 5;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticRun: "on-air",
    diagnosticSubsystem: "Monitor",
    diagnosticResult: "Monitor 1 / Monitor CCA 1A8 failed the monitor integrity path.",
    faultSummary: "Compare Monitor 1 and Monitor 2 data before changing voting or calibration. On-Air Fault Isolation isolates Monitor 1; select the 1A8 Monitor CCA.",
    manualReferences: ["§3.4.2.17.2, Fault Isolation Test Results", "§7.3.1(d), Monitor No. 1 Fault", "§2.3.2.22, Monitor CCA (1A8, 1A24)"],
    pmdtCheckpoints: [
      { id: "monitor1-integrity", label: "Monitors > Data > Integrity", viewId: "monitor-integrity" },
      { id: "monitor1-history", label: "Monitors > Data > Fault History", viewId: "monitor-fault-history-data" },
      { id: "monitor1-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("monitor-cca", "diagram-monitor-1", "1A8"),
  });
  return scenario;
}

export function createTx2FaultScenario(): Dvor1150ScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDvor1150ScenarioDefinition());
  scenario.id = "transmitter-2-fault";
  scenario.name = "Transmitter 2 Fault - CSB Power Amplifier (1A19)";
  scenario.description = "TX2 has a carrier-path fault. Select TX2 as the PMDT main path, verify the diagnostic result and transfer service to TX1 before identifying the TX2 amplifier.";
  scenario.difficulty = "advanced";
  scenario.startPolicy.mainTransmitterId = "tx2";
  scenario.configuration.transmitters.tx2.nominal.outputPower = 0;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Power Amplifier",
    diagnosticResult: "Transmitter 2 carrier power path is failed at CSB Power Amplifier 1A19.",
    faultSummary: "Use TX2 data and Full Fault Isolation to separate the transmitter fault from a monitor calibration issue. Transfer service to TX1, then identify CSB amplifier 1A19.",
    manualReferences: ["§3.4.2.5, RMS Data Screens", "§3.4.2.17.2, Fault Isolation Test Results", "§7.3.1(e), Transmitter No. 2 Fault", "§2.3.2.3, CSB Power Amplifier Assembly"],
    pmdtCheckpoints: [
      { id: "tx2-fault-data", label: "Transmitters > Data > Transmitter 2", viewId: "tx-data-tx2" },
      { id: "tx2-fault-monitor", label: "Monitors > Data > Integral Monitor", viewId: "monitor-integrity" },
      { id: "tx2-fault-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    requiredActionControlIds: ["diagnostics-run-full", "tx-transfer-tx1"],
    target: createHardwareTarget("csb-power-amplifier", "diagram-csb-tx2", "1A19"),
  });
  return scenario;
}

export function createMonitor2FaultScenario(): Dvor1150ScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDvor1150ScenarioDefinition());
  scenario.id = "monitor-2-fault";
  scenario.name = "Monitor 2 Fault (1A24)";
  scenario.description = "Monitor 2 reports an integrity fault while Monitor 1 remains available. Use the two-monitor data and On-Air Fault Isolation to identify the 1A24 Monitor CCA.";
  scenario.difficulty = "advanced";
  scenario.configuration.monitor.offsets.mon2.rfLevel = 5;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticRun: "on-air",
    diagnosticSubsystem: "Monitor",
    diagnosticResult: "Monitor 2 / Monitor CCA 1A24 failed the monitor integrity path.",
    faultSummary: "Compare both monitor columns and fault history. On-Air Fault Isolation isolates Monitor 2; select the 1A24 Monitor CCA rather than changing the shared alarm limits.",
    manualReferences: ["§3.4.2.17.2, Fault Isolation Test Results", "§7.3.1(f), Monitor No. 2 Fault", "§2.3.2.22, Monitor CCA (1A8, 1A24)"],
    pmdtCheckpoints: [
      { id: "monitor2-integrity", label: "Monitors > Data > Integrity", viewId: "monitor-integrity" },
      { id: "monitor2-history", label: "Monitors > Data > Fault History", viewId: "monitor-fault-history-data" },
      { id: "monitor2-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("monitor-cca", "diagram-monitor-2", "1A24"),
  });
  return scenario;
}

export function createBcpsPowerFailureScenario(): Dvor1150ScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDvor1150ScenarioDefinition());
  scenario.id = "bcps-power-failure";
  scenario.name = "BCPS Power Failure (1A33)";
  scenario.description = "RMS power readings indicate a BCPS fault. Verify the DC rail evidence and Full Fault Isolation before identifying the main Battery Charger Power Subsystem.";
  scenario.difficulty = "advanced";
  scenario.configuration.rms.adLimits.tx1.plus28V = { low: 29, preLow: 29.5, preHigh: 30, high: 31 };
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Power Supplies",
    diagnosticResult: "BCPS 1 / Battery Charger Power Subsystem 1A33 failed the +28 Vdc and backup-power path.",
    faultSummary: "Follow the manual order: inspect AC/DC and +28/+43 V evidence, then run Full Fault Isolation. Do not compensate the resulting RF reading with monitor offsets; select BCPS 1A33.",
    manualReferences: ["§7.3.1(g), BCPS Power Failure", "§9.7.2-9.7.4, BCPS voltage checks", "§2.3.2.25, Battery Charger Power Subsystem"],
    pmdtCheckpoints: [
      { id: "bcps-rms-status", label: "RMS > Status / Maintenance Alerts", viewId: "rms-status" },
      { id: "bcps-rms-ad", label: "RMS > Data > A/D Data", viewId: "rms-ad-data" },
      { id: "bcps-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("bcps", "cabinet-bcps-main", "1A33"),
  });
  return scenario;
}

export function createNoCarrierPowerScenario(): Dvor1150ScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDvor1150ScenarioDefinition());
  scenario.id = "no-carrier-power-output";
  scenario.name = "No Carrier Power Output - Synthesizer (1A4)";
  scenario.description = "Carrier power is absent. Use the manual isolation sequence to check BCPS, CSB amplifier and carrier-frequency output before identifying the TX1 Frequency Synthesizer.";
  scenario.difficulty = "advanced";
  scenario.configuration.transmitters.tx1.nominal.outputPower = 0;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Synthesizer",
    diagnosticResult: "TX1 Frequency Synthesizer 1A4 is not producing the carrier frequency at the test output.",
    faultSummary: "Check the carrier power symptom in Transmitter Data, then follow the manual branch that verifies the synthesizer carrier output after the BCPS and PA checks. Select TX1 Synthesizer 1A4.",
    manualReferences: ["§7.3.1(h), No Carrier Power Output", "§9.7.17.1, Checking Output Frequency of Frequency Synthesizer", "§2.3.2.1, Frequency Synthesizer (1A4, 1A20)"],
    pmdtCheckpoints: [
      { id: "carrier-loss-data", label: "Transmitters > Data > Transmitter 1", viewId: "tx-data-tx1" },
      { id: "carrier-loss-frequency", label: "Transmitters > Data > Frequency", viewId: "tx-data-tx1" },
      { id: "carrier-loss-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("frequency-synthesizer", "diagram-synth-tx1", "1A4"),
  });
  return scenario;
}

export function createNoUpperSidebandScenario(): Dvor1150ScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDvor1150ScenarioDefinition());
  scenario.id = "no-upper-sideband-output";
  scenario.name = "No Upper Sideband Output - Generator (1A6)";
  scenario.description = "The upper sideband path is absent. Correlate the 9960 Hz reading and sideband data with Full Fault Isolation, then identify the TX1 SB3/SB4 generator.";
  scenario.difficulty = "advanced";
  scenario.configuration.transmitters.tx1.offsets.sideband3RfLevelScale = 0;
  scenario.configuration.transmitters.tx1.offsets.sideband4RfLevelScale = 0;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Audio Generator",
    diagnosticResult: "TX1 upper-sideband path is isolated to Sideband Generator 1A6 (SB3/SB4).",
    faultSummary: "Use the 9960 Hz monitor value and the transmitter sideband power rows to distinguish an upper-sideband path fault from a shared monitor limit. Select TX1 Sideband Generator 1A6.",
    manualReferences: ["§7.3.1(i), No Upper Sideband Output", "§2.3.2.7, Sideband Generator Assembly", "§9.7.17.3, Sideband Generator Phasing"],
    pmdtCheckpoints: [
      { id: "usb-monitor", label: "Monitors > Data > Integral Monitor", viewId: "monitor-integrity" },
      { id: "usb-transmitter", label: "Transmitters > Data > Transmitter 1", viewId: "tx-data-tx1" },
      { id: "usb-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("sideband-generator", "diagram-sideband-tx1-sb34", "1A6"),
  });
  return scenario;
}

export function createNoLowerSidebandScenario(): Dvor1150ScenarioDefinition {
  const scenario = withScenarioStart(createDefaultDvor1150ScenarioDefinition());
  scenario.id = "no-lower-sideband-output";
  scenario.name = "No Lower Sideband Output - Generator (1A5)";
  scenario.description = "The lower sideband path is absent. Correlate the 9960 Hz reading and sideband data with Full Fault Isolation, then identify the TX1 SB1/SB2 generator.";
  scenario.difficulty = "advanced";
  scenario.configuration.transmitters.tx1.offsets.sideband1RfLevelScale = 0;
  scenario.configuration.transmitters.tx1.offsets.sideband2RfLevelScale = 0;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Audio Generator",
    diagnosticResult: "TX1 lower-sideband path is isolated to Sideband Generator 1A5 (SB1/SB2).",
    faultSummary: "Use the 9960 Hz monitor value and the transmitter sideband power rows to distinguish a lower-sideband path fault from a shared monitor limit. Select TX1 Sideband Generator 1A5.",
    manualReferences: ["§7.3.1(j), No Lower Sideband Output", "§2.3.2.7, Sideband Generator Assembly", "§9.7.17.3, Sideband Generator Phasing"],
    pmdtCheckpoints: [
      { id: "lsb-monitor", label: "Monitors > Data > Integral Monitor", viewId: "monitor-integrity" },
      { id: "lsb-transmitter", label: "Transmitters > Data > Transmitter 1", viewId: "tx-data-tx1" },
      { id: "lsb-diagnostics", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("sideband-generator", "diagram-sideband-tx1-sb12", "1A5"),
  });
  return scenario;
}

export const DVOR1150_BUILT_IN_SCENARIOS = [
  { id: "default", label: "New from Đài TEST/TST", create: createDefaultDvor1150ScenarioDefinition },
  { id: "carrier-9960", label: "TX1 low carrier + 9960 Hz", create: createLowCarrierAnd9960Scenario },
  { id: "reference-modulation", label: "TX1 low 30 Hz reference modulation", create: createReferenceModulationScenario },
  { id: "sideband-vswr", label: "TX1 sideband VSWR executive alarm", create: createSidebandVswrScenario },
  { id: "system-alarm-field-detector", label: "System alarm / field detector signal path", create: createSystemAlarmFieldDetectorScenario },
  { id: "rms-cpu-fault", label: "RMS / CPU fault (1A13)", create: createRmsFaultScenario },
  { id: "transmitter-1-fault", label: "Transmitter 1 fault / CSB amplifier (1A3)", create: createTx1FaultScenario },
  { id: "monitor-1-fault", label: "Monitor 1 fault (1A8)", create: createMonitor1FaultScenario },
  { id: "transmitter-2-fault", label: "Transmitter 2 fault / CSB amplifier (1A19)", create: createTx2FaultScenario },
  { id: "monitor-2-fault", label: "Monitor 2 fault (1A24)", create: createMonitor2FaultScenario },
  { id: "bcps-power-failure", label: "BCPS power failure (1A33)", create: createBcpsPowerFailureScenario },
  { id: "no-carrier-power-output", label: "No carrier power / synthesizer (1A4)", create: createNoCarrierPowerScenario },
  { id: "no-upper-sideband-output", label: "No upper sideband / generator (1A6)", create: createNoUpperSidebandScenario },
  { id: "no-lower-sideband-output", label: "No lower sideband / generator (1A5)", create: createNoLowerSidebandScenario },
] as const;

/** Student-facing exercises exclude the neutral baseline/template entry. */
export const DVOR1150_STUDENT_SCENARIOS = DVOR1150_BUILT_IN_SCENARIOS.filter(
  (scenario) => scenario.id !== "default",
);

export function createDvor1150StudentScenario(scenarioId: string): Dvor1150ScenarioDefinition | null {
  return DVOR1150_STUDENT_SCENARIOS.find((scenario) => scenario.id === scenarioId)?.create() ?? null;
}

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

/** Maintenance commands remain separate from editable configuration fields. */
export function dvor1150ScenarioFieldRole(fieldId: string): ScenarioFieldRole {
  if (fieldId.startsWith("simulation.") || /^transmitters\.(tx1|tx2)\.(enabled|onAir|load)$/.test(fieldId)) return "runtime";
  if (fieldId.startsWith("security.") || fieldId.startsWith("securityAccounts.")) return "security";
  if (fieldId.includes(".faults.") || fieldId.startsWith("monitor.rawMeasurements.") || fieldId.startsWith("overrides.")) return "instructor-only";
  return "student-operable";
}

export function isDvor1150ScenarioStudentEditable(definition: Dvor1150ScenarioDefinition, fieldId: string): boolean {
  return isScenarioFieldAllowed({
    policy: definition.editPolicy,
    legacyFieldIds: definition.studentEditableFieldIds,
    fieldId,
    fields: dvor1150ConfigFieldCatalog,
    isBlocked: (id) => dvor1150ScenarioFieldRole(id) !== "student-operable",
    roleOf: dvor1150ScenarioFieldRole,
  });
}

export function dvor1150ScenarioAllowedFieldIds(definition: Dvor1150ScenarioDefinition): string[] {
  return scenarioAllowedFieldIds({
    policy: definition.editPolicy,
    legacyFieldIds: definition.studentEditableFieldIds,
    fields: dvor1150ConfigFieldCatalog,
    isBlocked: (id) => dvor1150ScenarioFieldRole(id) !== "student-operable",
    roleOf: dvor1150ScenarioFieldRole,
  });
}

/** Setter, Apply and evaluation share the same effective recovery policy. */
export function getDvor1150ScenarioProtectedFieldChanges(
  definition: Dvor1150ScenarioDefinition,
  currentConfiguration: Dvor1150Config,
): Dvor1150ScenarioProtectedFieldChange[] {
  const editable = new Set(dvor1150ScenarioAllowedFieldIds(definition));
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
  evidence: Dvor1150ScenarioEvidence = {},
): Dvor1150ScenarioEvaluation {
  const definition = runtime.definition;
  if (!runtime.active || !definition) {
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

  const vswrExecutiveAlarm = snapshot.data.maintenanceAlerts.some(
    (alert) => alert.label === "Sideband Antenna VSWR" && alert.indicator === "red",
  );
  const baselineChecks = [
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
  const diagnosis = definition.diagnosis;
  // Keep direct engine callers and legacy tests compatible. The two-stage
  // contract becomes active when the PMDT/student workflow supplies evidence.
  const twoStageEnabled = Boolean(diagnosis && Object.keys(evidence).length > 0);
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
  const expectedKeys = diagnosis?.expectedHardware.map(dvor1150HardwareOccurrenceKey) ?? [];
  const selectedKeys = [...new Set(evidence.selectedHardwareOccurrenceKeys ?? [])];
  const expectedSet = new Set(expectedKeys);
  const selectedSet = new Set(selectedKeys);
  const missingKeys = expectedKeys.filter((key) => !selectedSet.has(key));
  const extraKeys = selectedKeys.filter((key) => !expectedSet.has(key));
  const hardware = {
    exactMatch: missingKeys.length === 0 && extraKeys.length === 0,
    expectedKeys,
    selectedKeys,
    missingKeys,
    extraKeys,
  };
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
  const protectedChanges = currentConfiguration
    ? getDvor1150ScenarioProtectedFieldChanges(definition, currentConfiguration)
    : [];
  const blockers = protectedChanges.map((change) => `Protected configuration changed: ${change.label}.`);
  return {
    solved: !twoStageEnabled
      ? baselineComplete && blockers.length === 0
      : diagnosis
        ? pmdtComplete && hardwareComplete && blockers.length === 0
        : baselineComplete && blockers.length === 0,
    correctable: true,
    pmdtComplete,
    hardwareComplete,
    hardware,
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

function validateScenarioDiagnosis(value: unknown): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return ["Scenario diagnosis must be an object."];
  }
  const diagnosis = value as Partial<Dvor1150ScenarioDiagnosis>;
  const issues: string[] = [];
  if (!( ["replace-module", "software-adjustment"] as const).includes(diagnosis.disposition as Dvor1150ScenarioDisposition)) {
    issues.push("Scenario diagnosis disposition is invalid.");
  }
  if (!( ["full", "on-air", "not-required"] as const).includes(diagnosis.diagnosticRun as Dvor1150DiagnosticRun)) {
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
      const resolved = resolveDvor1150HardwareOccurrence(target.blockId as Dvor1150BlockId, target.diagramOccurrenceId);
      if (!resolved || dvor1150HardwareOccurrenceKey(resolved) !== dvor1150HardwareOccurrenceKey(target)) {
        issues.push(`Scenario hardware target does not match the DVOR 1150 block catalog: ${target.blockId}/${target.diagramOccurrenceId}.`);
      }
      if (target.assemblyId !== undefined && typeof target.assemblyId !== "string") issues.push("Scenario hardware target assembly ID is invalid.");
    }
  }
  if (diagnosis.disposition === "replace-module" && diagnosis.expectedHardware?.length === 0) issues.push("A replace-module scenario must contain a hardware target.");
  if (diagnosis.disposition === "software-adjustment" && diagnosis.expectedHardware?.length !== 0) issues.push("A software-adjustment scenario must not contain a hardware target.");
  if (diagnosis.disposition === "software-adjustment" && diagnosis.diagnosticRun !== "not-required") issues.push("A software-adjustment scenario must use not-required diagnostics.");
  return issues;
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
  issues.push(...validateScenarioEditPolicy({
    policy: definition.editPolicy,
    fields: dvor1150ConfigFieldCatalog,
    isBlocked: (id) => dvor1150ScenarioFieldRole(id) !== "student-operable",
    roleOf: dvor1150ScenarioFieldRole,
  }));
  issues.push(...validateDvor1150Config(definition.configuration));
  if (definition.diagnosis !== undefined) issues.push(...validateScenarioDiagnosis(definition.diagnosis));
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
