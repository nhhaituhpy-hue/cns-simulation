import { cloneDvor1150aConfig, createDefaultDvor1150aConfig, defaultDvorKeyerConfiguration } from "./defaults";
import { buildDvor1150aSnapshot } from "./engine";
import { applyDvorConfigPatches } from "./config-service";
import {
  dvorConfigFieldCatalog,
  getDvorConfigValue,
  setDvorConfigValue,
  validateDvorConfig,
  validateDvorConfigField,
} from "./config-utils";
import type {
  Dvor1150aConfig,
  Dvor1150aSnapshot,
  DvorConfigValue,
  DvorTransmitterId,
} from "./config-types";
import {
  dvorHardwareOccurrenceKey,
  resolveDvorHardwareOccurrence,
  type DvorBlockId,
  type DvorHardwareOccurrence,
} from "@/modules/devices/dvor-1150a/block-diagram-data";
import type { VorViewId } from "@/lib/vor-types";
import { isScenarioActionEvent, MAX_SCENARIO_ACTION_HISTORY_EVENTS, type ScenarioActionEvent, type ScenarioEvidenceStats } from "@/lib/scenario-evidence";
import {
  isScenarioFieldAllowed,
  scenarioAllowedFieldIds,
  validateScenarioEditPolicy,
  validateScenarioTaskTargets,
  type ScenarioFieldRole,
  type ScenarioEditPolicy,
  type ScenarioTaskTarget,
} from "@/lib/scenario-policy";

export const DVOR1150A_SCENARIO_SCHEMA_VERSION = 1 as const;

export type Dvor1150aScenarioDifficulty = "basic" | "intermediate" | "advanced";
export type Dvor1150aScenarioDisposition = "replace-module" | "software-adjustment";
export type Dvor1150aDiagnosticRun = "full" | "on-air" | "not-required";

/** Exact persisted configuration, not a derived RF reading or proof of a procedure. */
export interface Dvor1150aConfigurationValueCriterion {
  fieldId: string;
  value: Exclude<DvorConfigValue, null>;
}

export interface Dvor1150aScenarioPmdtCheckpoint {
  id: string;
  label: string;
  viewId: VorViewId;
}

export interface Dvor1150aScenarioHardwareTarget extends DvorHardwareOccurrence {
  assemblyId?: string;
}

export interface Dvor1150aScenarioDiagnosis {
  disposition: Dvor1150aScenarioDisposition;
  diagnosticRun: Dvor1150aDiagnosticRun;
  diagnosticSubsystem: string;
  diagnosticResult: string;
  faultSummary: string;
  manualReferences: string[];
  pmdtCheckpoints: Dvor1150aScenarioPmdtCheckpoint[];
  requiredActionControlIds: string[];
  expectedHardware: Dvor1150aScenarioHardwareTarget[];
}

export interface Dvor1150aScenarioEvidence {
  visitedViewIds?: readonly string[];
  acceptedActionControlIds?: readonly string[];
  selectedHardwareOccurrenceKeys?: readonly string[];
  hardwareDispositionConfirmed?: boolean;
  /** Full native events, never a generic accepted-control label as Apply proof. */
  actionHistory?: readonly ScenarioActionEvent[];
  evidenceStats?: ScenarioEvidenceStats;
  /** Expected native run, never derived from the first event. */
  runId?: string;
}

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
    /** Additive/optional: old publications retain their original criteria. */
    configurationValues?: Dvor1150aConfigurationValueCriterion[];
  };
  /** New scenarios default to open; omitted means legacy whitelist semantics. */
  editPolicy?: ScenarioEditPolicy;
  /** Optional explicit fields that the learner must inspect or apply. */
  taskTargets?: ScenarioTaskTarget[];
  /**
   * Recovery controls chosen by the examiner. Every other staged PMDT
   * configuration field is protected while the exercise is active.
   */
  studentEditableFieldIds: string[];
  /** Optional two-stage diagnostic contract. Kept optional for old JSON files. */
  diagnosis?: Dvor1150aScenarioDiagnosis;
}

export interface Dvor1150aScenarioRuntime {
  active: boolean;
  definition: Dvor1150aScenarioDefinition | null;
  startedAt: string | null;
  /** Frozen independently of the mutable definition object; absent on old runtimes. */
  scenarioId?: string;
  runId?: string;
}

export interface Dvor1150aScenarioEvaluation {
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

export interface Dvor1150aScenarioProtectedFieldChange {
  fieldId: string;
  label: string;
}

function createHardwareTarget(
  blockId: DvorBlockId,
  diagramHotspotId: string,
  assemblyId?: string,
): Dvor1150aScenarioHardwareTarget {
  const occurrence = resolveDvorHardwareOccurrence(blockId, diagramHotspotId);
  if (!occurrence) {
    throw new Error(`Unknown DVOR 1150A hardware occurrence: ${blockId}/${diagramHotspotId}`);
  }
  return { ...occurrence, ...(assemblyId ? { assemblyId } : {}) };
}

function createHardwareDiagnosis(input: {
  diagnosticRun?: Exclude<Dvor1150aDiagnosticRun, "not-required">;
  diagnosticSubsystem: string;
  diagnosticResult: string;
  faultSummary: string;
  manualReferences: string[];
  pmdtCheckpoints: Dvor1150aScenarioPmdtCheckpoint[];
  target: Dvor1150aScenarioHardwareTarget;
}): Dvor1150aScenarioDiagnosis {
  const run = input.diagnosticRun ?? "full";
  return {
    disposition: "replace-module",
    diagnosticRun: run,
    diagnosticSubsystem: input.diagnosticSubsystem,
    diagnosticResult: input.diagnosticResult,
    faultSummary: input.faultSummary,
    manualReferences: [...input.manualReferences],
    pmdtCheckpoints: [...input.pmdtCheckpoints],
    requiredActionControlIds: [`diagnostics-run-${run}`],
    expectedHardware: [input.target],
  };
}

function createSoftwareDiagnosis(input: {
  diagnosticSubsystem: string;
  diagnosticResult: string;
  faultSummary: string;
  manualReferences: string[];
  pmdtCheckpoints: Dvor1150aScenarioPmdtCheckpoint[];
}): Dvor1150aScenarioDiagnosis {
  return {
    disposition: "software-adjustment",
    diagnosticRun: "not-required",
    diagnosticSubsystem: input.diagnosticSubsystem,
    diagnosticResult: input.diagnosticResult,
    faultSummary: input.faultSummary,
    manualReferences: [...input.manualReferences],
    pmdtCheckpoints: [...input.pmdtCheckpoints],
    requiredActionControlIds: ["config-apply"],
    expectedHardware: [],
  };
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
    editPolicy: { mode: "open" },
    taskTargets: [],
    studentEditableFieldIds: [],
  };
}

/** Configuration training does not imply an RF fault or an OEM nominal value. */
export function createDvor1150aConfigurationExercise(): Dvor1150aScenarioDefinition {
  const definition = createDefaultDvor1150aScenarioDefinition();
  definition.id = "dvor1150a-configuration-values";
  definition.name = "DVOR1150A exact configuration training";
  definition.description = "Inspect and apply the examiner's explicit configuration targets; no physical fault or manufacturer limit is inferred.";
  definition.startPolicy.startLocal = true;
  definition.startPolicy.startMonitorBypassed = true;
  definition.successCriteria.configurationValues = [];
  return definition;
}

function createPresetDvor1150aScenarioDefinition(): Dvor1150aScenarioDefinition {
  const scenario = createDefaultDvor1150aScenarioDefinition();
  // Built-in scenarios retain their explicit recovery contract. Only a
  // newly authored scenario receives the open default.
  delete scenario.editPolicy;
  return scenario;
}

export function createLowCarrierAnd9960Scenario(): Dvor1150aScenarioDefinition {
  const scenario = createPresetDvor1150aScenarioDefinition();
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
  const scenario = createPresetDvor1150aScenarioDefinition();
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
  const scenario = createPresetDvor1150aScenarioDefinition();
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
  const scenario = createPresetDvor1150aScenarioDefinition();
  scenario.id = "tx1-carrier-vswr-changeover";
  scenario.name = "TX1 Carrier VSWR Fault - Change Over";
  scenario.description = "TX1 is on antenna with a carrier VSWR fault. The student must transfer the service to healthy TX2 and release Monitor Bypass to confirm normal monitoring.";
  scenario.difficulty = "intermediate";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.transmitters.tx1.faults.carrierVswr = true;
  return scenario;
}

export function createAudioGeneratorTx1FaultScenario(): Dvor1150aScenarioDefinition {
  const scenario = createPresetDvor1150aScenarioDefinition();
  scenario.id = "audio-generator-tx1-cca-fault";
  scenario.name = "Audio Generator TX1 CCA Fault (1A3A2)";
  scenario.description = "Use PMDT diagnostics and Transmitter Status to identify a TX1 Audio Generator CCA failure, then locate the 1A3A2 module on the DVOR 1150A block diagram.";
  scenario.difficulty = "advanced";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.transmitters.tx1.nominal.outputPower = 0;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Audio Generator",
    diagnosticResult: "Audio Generator 1 / 1A3A2 fault identified by background diagnostics.",
    faultSummary: "TX1 has no usable generated waveform; inspect Audio Generator status before replacing a power amplifier.",
    manualReferences: ["§3.6.8.3.4, Figure 3-49", "§6.4.15, 1A3A2/1A3A9 Audio Generator Replacement", "§7.3.1"],
    pmdtCheckpoints: [
      { id: "audio-tx1-status", label: "Transmitters > Status - Tx #1", viewId: "tx-status-1" },
      { id: "audio-power-up", label: "Diagnostics > Power Up Results", viewId: "diagnostics-power-up" },
      { id: "audio-fault-isolation", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("audio-generator", "diagram-audio-1", "1A3A2"),
  });
  return scenario;
}

export function createSynthesizerTx2FrequencyScenario(): Dvor1150aScenarioDefinition {
  const scenario = createPresetDvor1150aScenarioDefinition();
  scenario.id = "synthesizer-tx2-frequency-unlocked";
  scenario.name = "Synthesizer TX2 Frequency Unlock (1A3A11)";
  scenario.description = "Correlate TX2 frequency error, carrier phase and LSB/USB unlock indications with the TX2 Synthesizer CCA, then identify 1A3A11.";
  scenario.difficulty = "advanced";
  scenario.startPolicy.mainTransmitterId = "tx2";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.transmitters.tx2.faults.frequencyError = true;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Synthesizer",
    diagnosticResult: "Synthesizer 2 / 1A3A11 frequency and phase lock fault identified.",
    faultSummary: "TX2 frequency error and unlocked sideband paths point to the frequency synthesizer, not the monitor calibration.",
    manualReferences: ["§3.6.8.3.4, Figure 3-49", "§6.4.12, DVOR Frequency Synthesizer Alignment", "§6.4.14, 1A3A1/1A3A11 Synthesizer Replacement"],
    pmdtCheckpoints: [
      { id: "synth-tx2-status", label: "Transmitters > Status - Tx #2", viewId: "tx-status-2" },
      { id: "synth-tx-data", label: "Transmitters > Data", viewId: "tx-data-main" },
      { id: "synth-fault-isolation", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("synthesizer", "diagram-synth-2", "1A3A11"),
  });
  return scenario;
}

export function createMonitor1CcaFaultScenario(): Dvor1150aScenarioDefinition {
  const scenario = createPresetDvor1150aScenarioDefinition();
  scenario.id = "monitor-1-cca-fault";
  scenario.name = "Monitor 1 CCA Fault (1A3A3)";
  scenario.description = "Use Monitor 1 status, integrity results and Fault Isolation to identify a Monitor CCA failure before selecting the 1A3A3 module.";
  scenario.difficulty = "advanced";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.monitor.antennas.mon1.enabled = false;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Monitor",
    diagnosticResult: "Monitor 1 / 1A3A3 failed integrity and was removed from voting.",
    faultSummary: "Monitor 1 is unavailable while the transmitter and PMDT data path remain available; replace the Monitor CCA and reload its saved configuration.",
    manualReferences: ["§3.6.8.2.2, Monitor Test Generator", "§3.6.8.6.1, Power-Up Diagnostics", "§6.4.16, 1A3A3/1A3A10 Monitor Replacement"],
    pmdtCheckpoints: [
      { id: "monitor-1-integral", label: "Monitor 1 > Data > Integral", viewId: "monitor-integral" },
      { id: "monitor-1-test", label: "Monitor 1 > Test Results", viewId: "monitor-test-results" },
      { id: "monitor-1-fault-isolation", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("monitor-cca", "diagram-monitor-1", "1A3A3"),
  });
  return scenario;
}

export function createLvpsTx1PowerScenario(): Dvor1150aScenarioDefinition {
  const scenario = createPresetDvor1150aScenarioDefinition();
  scenario.id = "lvps-tx1-power-fault";
  scenario.name = "LVPS TX1 Low-Voltage Fault (1A3A4)";
  scenario.description = "Trace abnormal RMS power-supply readings and Digital I/O status to the TX1 low-voltage power-supply card 1A3A4.";
  scenario.difficulty = "intermediate";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Power Supplies",
    diagnosticResult: "TX1 LVPS / 1A3A4 power rail fault identified.",
    faultSummary: "The fault is in the low-voltage supply branch; do not compensate the monitor values with calibration offsets.",
    manualReferences: ["§3.6.8.6, Diagnostics Screen", "§6.4.17, 1A3A4/1A3A8 LVPS Replacement", "§7.3.1"],
    pmdtCheckpoints: [
      { id: "lvps-power-data", label: "RMS > Data > Power Supply Data", viewId: "rms-power-supply" },
      { id: "lvps-digital-io", label: "RMS > Data > Digital I/O", viewId: "rms-digital-io" },
      { id: "lvps-fault-isolation", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("lvps", "diagram-lvps-1", "1A3A4"),
  });
  return scenario;
}

export function createBcpsTx2PowerScenario(): Dvor1150aScenarioDefinition {
  const scenario = createPresetDvor1150aScenarioDefinition();
  scenario.id = "bcps-tx2-power-fault";
  scenario.name = "BCPS TX2 AC/DC Power Fault (1A5A2)";
  scenario.description = "Correlate AC/DC, battery and 48 V supply indications before identifying the TX2 Battery Charging Power Supply 1A5A2.";
  scenario.difficulty = "advanced";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Power Supplies",
    diagnosticResult: "BCPS 2 / 1A5A2 power and charging fault identified.",
    faultSummary: "RMS power and Digital I/O evidence points to the BCPS branch; the correct action is module replacement and power alignment verification.",
    manualReferences: ["§6.4.1, BCPS Alignment Procedures", "§6.4.22, 1A5A1/1A5A2 BCPS Replacement", "§7.3.1"],
    pmdtCheckpoints: [
      { id: "bcps-power-data", label: "RMS > Data > Power Supply Data", viewId: "rms-power-supply" },
      { id: "bcps-digital-io", label: "RMS > Data > Digital I/O", viewId: "rms-digital-io" },
      { id: "bcps-fault-isolation", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("bcps", "diagram-bcps-2", "1A5A2"),
  });
  return scenario;
}

export function createRfMonitorVswrScenario(): Dvor1150aScenarioDefinition {
  const scenario = createPresetDvor1150aScenarioDefinition();
  scenario.id = "rf-monitor-vswr-measurement-fault";
  scenario.name = "RF Monitor VSWR Measurement Fault (1A4A4)";
  scenario.description = "Use Sideband Antenna VSWR, Transmitter Data and Fault Isolation to distinguish an RF Monitor measurement fault from a real antenna fault.";
  scenario.difficulty = "advanced";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.transmitters.tx1.vswr.sidebands = [3.6, 3.6, 3.6, 3.6];
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Distribution",
    diagnosticResult: "RF Monitor / 1A4A4 measurement path fault identified after the BITE/VSWR cross-check.",
    faultSummary: "Do not immediately replace an antenna: compare the RF Monitor readings with the PMDT fault-isolation result and verify the measurement path.",
    manualReferences: ["§3.6.8.1.1.2, Notch Monitor Data", "§3.6.8.1.1.3, Sideband Antenna VSWR", "§6.4.21, 1A4A4 RF Monitor Replacement"],
    pmdtCheckpoints: [
      { id: "rf-monitor-vswr", label: "Monitors > Data > Sideband Antenna VSWR", viewId: "monitor-sideband-vswr" },
      { id: "rf-monitor-tx-data", label: "Transmitters > Data", viewId: "tx-data-main" },
      { id: "rf-monitor-fault-isolation", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("rf-monitor", "diagram-rf-monitor", "1A4A4"),
  });
  return scenario;
}

export function createCarrierAmplifierTx2Scenario(): Dvor1150aScenarioDefinition {
  const scenario = createPresetDvor1150aScenarioDefinition();
  scenario.id = "carrier-amplifier-tx2-low-power";
  scenario.name = "Carrier Amplifier TX2 Low Output (1A5A4)";
  scenario.description = "Use TX2 Carrier Power and PA alerts to identify a low-output Carrier Amplifier, then verify the 1A5A4 block and its post-replacement output adjustment.";
  scenario.difficulty = "intermediate";
  scenario.startPolicy.mainTransmitterId = "tx2";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.transmitters.tx2.nominal.outputPower = 35;
  scenario.studentEditableFieldIds = ["transmitters.tx2.offsets.outputPowerScale"];
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Power Amplifier",
    diagnosticResult: "Carrier Amplifier 2 / 1A5A4 low-output fault identified.",
    faultSummary: "Carrier power is low while the diagnostic path points to the CSB amplifier; after replacement, use Output Power Scale only for final normalization.",
    manualReferences: ["§3.6.8.3.4, Transmitter Status", "§6.4.23, 1A5A3/1A5A4 CSB AMP Replacement", "§7.3.1"],
    pmdtCheckpoints: [
      { id: "carrier-tx2-status", label: "Transmitters > Status - Tx #2", viewId: "tx-status-2" },
      { id: "carrier-tx2-data", label: "Transmitters > Data", viewId: "tx-data-main" },
      { id: "carrier-fault-isolation", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("carrier-amplifier", "diagram-carrier-2", "1A5A4"),
  });
  return scenario;
}

export function createSidebandAmplifierTx1Scenario(): Dvor1150aScenarioDefinition {
  const scenario = createPresetDvor1150aScenarioDefinition();
  scenario.id = "sideband-amplifier-tx1-sb12";
  scenario.name = "Sideband Amplifier TX1 SB1/SB2 Fault (1A4A1)";
  scenario.description = "Use sideband power, VSWR and Ground Check evidence to identify the TX1 SB1/SB2 Sideband Amplifier 1A4A1.";
  scenario.difficulty = "advanced";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.transmitters.tx1.offsets.sideband1RfLevelScale = 45;
  scenario.configuration.transmitters.tx1.offsets.sideband2RfLevelScale = 45;
  scenario.studentEditableFieldIds = [
    "transmitters.tx1.offsets.sideband1RfLevelScale",
    "transmitters.tx1.offsets.sideband2RfLevelScale",
    "transmitters.tx1.offsets.sideband1PhaseOffset",
    "transmitters.tx1.offsets.sideband2PhaseOffset",
  ];
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Power Amplifier",
    diagnosticResult: "Sideband Amplifier TX1 SB1/SB2 / 1A4A1 fault identified.",
    faultSummary: "The two lower sideband paths are abnormal; use Ground Check and sideband power evidence before changing monitor calibration.",
    manualReferences: ["§3.6.8.3.2, VOR Ground Check", "§6.4.24, 1A4A1/1A4A2/1A4A6/1A4A7 Sideband Amplifier Replacement", "§7.3.1"],
    pmdtCheckpoints: [
      { id: "sideband-ground-check", label: "Transmitters > Ground Check - Tx #1", viewId: "tx-ground-check-1" },
      { id: "sideband-vswr", label: "Monitors > Data > Sideband Antenna VSWR", viewId: "monitor-sideband-vswr" },
      { id: "sideband-fault-isolation", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("sideband", "diagram-sideband-12", "1A4A1"),
  });
  return scenario;
}

export function createCommutatorDistributionScenario(): Dvor1150aScenarioDefinition {
  const scenario = createPresetDvor1150aScenarioDefinition();
  scenario.id = "commutator-distribution-notch-fault";
  scenario.name = "Commutator Distribution Notch Fault (1A4A5)";
  scenario.description = "Correlate a Notch Monitor reduction with Sideband VSWR and Fault Isolation before locating the Commutator Controller 1A4A5.";
  scenario.difficulty = "advanced";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.monitor.rawMeasurements.mon1.notchMonitor = 35;
  scenario.diagnosis = createHardwareDiagnosis({
    diagnosticSubsystem: "Distribution",
    diagnosticResult: "Distribution / Commutator Controller 1A4A5 fault identified.",
    faultSummary: "A notch can originate in an antenna, feed cable or commutator channel; this training case uses Fault Isolation to narrow it to the controller block.",
    manualReferences: ["§3.6.8.1.1.2, Notch Monitor Data", "Figure 1-3 and Figure 2-3", "§7.3.1"],
    pmdtCheckpoints: [
      { id: "commutator-notch", label: "Monitors > Data > Notch Monitor", viewId: "monitor-notch" },
      { id: "commutator-vswr", label: "Monitors > Data > Sideband Antenna VSWR", viewId: "monitor-sideband-vswr" },
      { id: "commutator-fault-isolation", label: "Diagnostics > Fault Isolation", viewId: "diagnostics-fault-isolation" },
    ],
    target: createHardwareTarget("commutator-controller", "diagram-commutator", "1A4A5"),
  });
  return scenario;
}

export function createMonitor1CalibrationScenario(): Dvor1150aScenarioDefinition {
  const scenario = createPresetDvor1150aScenarioDefinition();
  scenario.id = "monitor-1-calibration-offset";
  scenario.name = "Monitor 1 RF Level Calibration Offset";
  scenario.description = "PMDT diagnostics are normal, but Monitor 1 RF Level is biased by a calibration offset. Correct the software value; no hardware block should be selected.";
  scenario.difficulty = "intermediate";
  scenario.startPolicy.startLocal = true;
  scenario.startPolicy.startMonitorBypassed = true;
  scenario.configuration.monitor.calibration.mon1.rfLevelOffset = 6;
  scenario.studentEditableFieldIds = ["monitor.calibration.mon1.rfLevelOffset"];
  scenario.diagnosis = createSoftwareDiagnosis({
    diagnosticSubsystem: "Monitor Configuration",
    diagnosticResult: "No hardware fault found; Monitor 1 RF Level calibration offset requires correction.",
    faultSummary: "Power-Up and Fault Isolation are normal. Correct Monitor 1 Offsets and Scale Factors, Apply, then release Bypass.",
    manualReferences: ["§3.6.8.2.4, Monitor Offsets and Scale Factors", "§6.4.10, Changing the Monitoring Offsets", "§7.3.1"],
    pmdtCheckpoints: [
      { id: "calibration-integral", label: "Monitor 1 > Data > Integral", viewId: "monitor-integral" },
      { id: "calibration-offsets", label: "Monitor 1 > Offsets and Scale Factors", viewId: "monitor-1-offsets" },
      { id: "calibration-diagnostics", label: "Diagnostics > Power Up Results", viewId: "diagnostics-power-up" },
    ],
  });
  return scenario;
}

export const DVOR1150A_BUILT_IN_SCENARIOS = [
  { id: "default", label: "New from Đài TEST/TST", create: createDefaultDvor1150aScenarioDefinition },
  { id: "configuration-values", label: "Exact monitor / transmitter configuration", create: createDvor1150aConfigurationExercise },
  { id: "carrier-9960", label: "TX1 low carrier + 9960 Hz", create: createLowCarrierAnd9960Scenario },
  { id: "reference-modulation", label: "TX1 low 30 Hz reference modulation", create: createReferenceModulationScenario },
  { id: "sideband-vswr", label: "TX1 sideband VSWR alarm", create: createSidebandVswrScenario },
  { id: "tx1-changeover", label: "TX1 carrier VSWR fault - change over", create: createTx1FaultChangeoverScenario },
  { id: "audio-generator-tx1", label: "Audio Generator TX1 CCA fault", create: createAudioGeneratorTx1FaultScenario },
  { id: "synthesizer-tx2", label: "Synthesizer TX2 frequency unlock", create: createSynthesizerTx2FrequencyScenario },
  { id: "monitor-1-cca", label: "Monitor 1 CCA fault", create: createMonitor1CcaFaultScenario },
  { id: "lvps-tx1", label: "LVPS TX1 low-voltage fault", create: createLvpsTx1PowerScenario },
  { id: "bcps-tx2", label: "BCPS TX2 power fault", create: createBcpsTx2PowerScenario },
  { id: "rf-monitor-vswr", label: "RF Monitor VSWR measurement fault", create: createRfMonitorVswrScenario },
  { id: "carrier-amplifier-tx2", label: "Carrier Amplifier TX2 low output", create: createCarrierAmplifierTx2Scenario },
  { id: "sideband-amplifier-tx1", label: "Sideband Amplifier TX1 SB1/SB2", create: createSidebandAmplifierTx1Scenario },
  { id: "commutator-distribution", label: "Commutator distribution notch fault", create: createCommutatorDistributionScenario },
  { id: "monitor-1-calibration", label: "Monitor 1 calibration offset", create: createMonitor1CalibrationScenario },
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

/** Open policy exposes only real learner controls, never authoring stimuli. */
export function dvor1150aScenarioFieldRole(fieldId: string): ScenarioFieldRole {
  if (isLiveScenarioField(fieldId)) return "runtime";
  if (fieldId.startsWith("monitor.rawMeasurements.") || fieldId.includes(".faults.")) {
    return "instructor-only";
  }
  if (fieldId.startsWith("securityAccounts.") || fieldId.startsWith("security.")) return "security";
  return "student-operable";
}

/** The only configuration identifiers accepted as exact-value requirements. */
export function dvor1150aConfigurationTargetFields() {
  return dvorConfigFieldCatalog.filter(field => dvor1150aScenarioFieldRole(field.id) === "student-operable");
}

/** The PMDT Nominal form is shared; offsets/scales remain independent per TX. */
export function dvor1150aSharedNominalFieldIds(fieldId: string): string[] {
  const match=/^transmitters\.tx[12]\.nominal\.(.+)$/.exec(fieldId);
  return match ? ["tx1","tx2"].map(tx=>`transmitters.${tx}.nominal.${match[1]}`).filter(id=>dvorConfigFieldCatalog.some(f=>f.id===id)) : [fieldId];
}

/** Native controls that write multiple persisted paths in one interaction. */
export function dvor1150aSharedConfigurationFieldIds(fieldId: string): string[] {
  if (/^monitor\.antennas\.mon[12]\.secondAntennaEnabled$/.test(fieldId)) return ["monitor.antennas.mon1.secondAntennaEnabled", "monitor.antennas.mon2.secondAntennaEnabled"];
  return dvor1150aSharedNominalFieldIds(fieldId);
}

/** Native configuration screens; raw/instructor/session paths have no task mapping. */
export function dvor1150aConfigurationViewId(fieldId: string): VorViewId | null {
  const field = dvor1150aConfigurationTargetFields().find(f => f.id === fieldId);
  if (!field) return null;
  if (/^monitor\.(calibration|standbyCalibration|testGeneratorCalibration)\.mon1\./.test(fieldId)) return "monitor-1-offsets";
  if (/^monitor\.(calibration|standbyCalibration|testGeneratorCalibration)\.mon2\./.test(fieldId)) return "monitor-2-offsets";
  if (fieldId.startsWith("monitor.testGenerator.")) return "monitor-test-results";
  if (fieldId.startsWith("monitor.routing.")) return "monitor-config-general";
  if (/^monitor\.(votingLogic|transfer|integrity\.)/.test(fieldId)) return "rms-config-general";
  if (fieldId.startsWith("monitor.")) return "monitor-alarm-limits";
  if (fieldId.startsWith("transmitters.")) return fieldId.includes(".nominal.") ? "tx-config-nominal" : "tx-config-offsets";
  return "rms-config-station";
}

/** Shared procedure proof for grading and feedback; a final state is not a learner action. */
export function dvor1150aNativeFieldEvidence(definition: Dvor1150aScenarioDefinition, fieldId: string, current: Dvor1150aConfig | undefined, evidence: Dvor1150aScenarioEvidence, startedAt: string | null, runId?: string, scenarioId?: string): ScenarioActionEvent[] {
  const history = evidence.actionHistory;
  const stats = evidence.evidenceStats;
  const start = startedAt ? Date.parse(startedAt) : NaN;
  if (!runId?.trim() || scenarioId !== definition.id || evidence.runId !== runId
    || !Number.isFinite(start) || !current || !history?.length || history.length >= MAX_SCENARIO_ACTION_HISTORY_EVENTS || !history.every(isScenarioActionEvent)
    || new Set(history.map(a => a.id)).size !== history.length
    || stats && (stats.evidenceTruncated || stats.droppedCount > 0 || stats.totalEventCount !== history.length || stats.storedEventCount !== history.length || stats.lastSequence !== history.length)) return [];
  let timestamp = -Infinity;
  for (const [index, action] of history.entries()) {
    const time = Date.parse(action.occurredAt);
    if (action.scope?.moduleId !== "dvor-1150a" || action.scope.scenarioId !== scenarioId
      || action.scope.runId !== runId || action.scope.startedAt !== startedAt
      || action.sequence !== index + 1 || !Number.isFinite(time) || time < timestamp || time < start) return [];
    timestamp = time;
  }
  const runtimeField = fieldId === "simulation.local" || fieldId === "simulation.integralMonitorBypass";
  let previous = runtimeField ? fieldId === "simulation.local" ? definition.startPolicy.startLocal : definition.startPolicy.startMonitorBypassed
    : getDvorConfigValue(definition.configuration, fieldId);
  const applied: ScenarioActionEvent[] = [];
  if (runtimeField) {
    const key = fieldId === "simulation.local" ? "local" : "monitorBypass";
    for (const action of history.filter(action => action.controlId === fieldId && action.accepted)) {
      if (action.actor !== "student" || action.kind !== "control" || !Object.is(action.before?.[key], previous)
        || typeof action.after?.[key] !== "boolean" || Object.is(action.before?.[key], action.after[key])) return [];
      previous = action.after[key];
      applied.push(action);
    }
    return Object.is(previous, getDvorConfigValue(current, fieldId)) ? applied : [];
  }
  for (const action of history) for (const change of action.parameterChanges ?? []) {
    if (change.fieldId !== fieldId || change.phase === "draft" || change.phase === "backup" || !action.accepted || !change.accepted) continue;
    if (action.actor !== "student" || action.controlId !== "config-apply" || change.phase !== "apply"
      || !Object.is(change.before, previous) || Object.is(change.before, change.after)
      || !(typeof change.after === "string" || typeof change.after === "boolean" || typeof change.after === "number" && Number.isFinite(change.after))) return [];
    previous = change.after;
    applied.push(action);
  }
  return Object.is(previous, getDvorConfigValue(current, fieldId)) ? applied : [];
}

function validateConfigurationValues(definition: Dvor1150aScenarioDefinition): string[] {
  const targets = definition.successCriteria.configurationValues;
  if (targets === undefined) return [];
  const fields = dvor1150aConfigurationTargetFields();
  if (!Array.isArray(targets) || targets.length > fields.length) return ["Configuration value criteria must be a bounded array."];
  const seen = new Set<string>(), issues: string[] = [];
  let recovered = cloneDvor1150aConfig(definition.configuration);
  const baseline = applyDvorConfigPatches(definition.configuration);
  if (!baseline.ok) issues.push(`Configuration exercise baseline: ${baseline.error}`);
  for (const target of targets) {
    if (!target || typeof target !== "object" || Array.isArray(target)
      || Object.keys(target).length !== 2 || !Object.hasOwn(target, "fieldId") || !Object.hasOwn(target, "value")) {
      issues.push("Configuration value criterion must contain only fieldId and value."); continue;
    }
    const field = fields.find(f => f.id === target.fieldId);
    if (!field || seen.has(target.fieldId)) {
      issues.push(`Configuration value criterion field is unknown, protected or duplicated: ${String(target.fieldId)}.`); continue;
    }
    seen.add(target.fieldId);
    if(typeof target.value==="number"&&Math.abs(target.value)>Number.MAX_SAFE_INTEGER) {
      issues.push(`Configuration value criterion exceeds software numeric safety envelope: ${field.id}.`);continue;
    }
    const error = validateDvorConfigField(field, target.value);
    if (error) { issues.push(`Configuration value criterion ${field.id}: ${error}`); continue; }
    const sharedIds = dvor1150aSharedConfigurationFieldIds(field.id);
    const needsEdit = sharedIds.some(id => !Object.is(getDvorConfigValue(definition.configuration, id), target.value));
    for(const sharedId of sharedIds) {
      const sharedTarget=targets.find(t=>t?.fieldId===sharedId);
      if(sharedTarget&&!Object.is(sharedTarget.value,target.value))issues.push(`Configuration value criteria conflict for shared nominal control: ${field.id}.`);
      if(needsEdit&&!isDvor1150aScenarioStudentEditable(definition,sharedId))issues.push(`Shared nominal recovery control is not editable: ${sharedId}.`);
      recovered = setDvorConfigValue(recovered, sharedId, target.value);
    }
    if (!Object.is(getDvorConfigValue(definition.configuration, field.id), target.value)
      && !isDvor1150aScenarioStudentEditable(definition, field.id)) issues.push(`Configuration value criterion is not editable: ${field.id}.`);
  }
  // Use exactly the native Apply boundary, including strict endpoint ordering;
  // shared Nominal is mirrored before validation, never just a setter-only copy.
  const candidate = applyDvorConfigPatches(recovered);
  if (!candidate.ok) issues.push(`Configuration value criteria: ${candidate.error}`);
  return issues;
}

/** Returns non-recovery configuration changes made while a scenario is active. */
export function getDvor1150aScenarioProtectedFieldChanges(
  definition: Dvor1150aScenarioDefinition,
  currentConfiguration: Dvor1150aConfig,
): Dvor1150aScenarioProtectedFieldChange[] {
  return dvorConfigFieldCatalog.flatMap((field) => {
    if (isLiveScenarioField(field.id) || isDvor1150aScenarioStudentEditable(definition, field.id)) return [];
    const expected = getDvorConfigValue(definition.configuration, field.id);
    const actual = getDvorConfigValue(currentConfiguration, field.id);
    return Object.is(expected, actual) ? [] : [{ fieldId: field.id, label: field.label }];
  });
}

export function evaluateDvor1150aScenario(
  runtime: Dvor1150aScenarioRuntime,
  snapshot: Dvor1150aSnapshot,
  currentConfiguration?: Dvor1150aConfig,
  evidence: Dvor1150aScenarioEvidence = {},
): Dvor1150aScenarioEvaluation {
  const definition = runtime.definition;
  if (!runtime.active || !definition) {
    return {
      solved: false,
      correctable: true,
      pmdtComplete: false,
      hardwareComplete: false,
      hardware: {
        exactMatch: false,
        expectedKeys: [],
        selectedKeys: [],
        missingKeys: [],
        extraKeys: [],
      },
      checks: [],
      blockers: [],
    };
  }

  const sidebandVswrAlarm = Object.values(snapshot.monitors).some(
    (monitor) => monitor.enabled && monitor.parameters.sidebandVswr.status === "alarm",
  );
  const configurationChecks = (definition.successCriteria.configurationValues ?? []).map(target => {
    const field = dvor1150aConfigurationTargetFields().find(f => f.id === target.fieldId);
    const actual = currentConfiguration && field ? getDvorConfigValue(currentConfiguration, field.id) : undefined;
    return {
      id: `configuration-value-${target.fieldId}`,
      label: field ? `${field.section} · ${field.label}` : target.fieldId,
      passed: actual !== undefined && Object.is(actual, target.value),
      detail: `Applied: ${actual === undefined ? "unavailable" : String(actual)}; target: ${String(target.value)}${field?.unit ? ` ${field.unit}` : ""}`,
    };
  });
  const configurationComplete = configurationChecks.every(check => check.passed);
  // Existing publications stored taskTargets as descriptive metadata. Opt in
  // only with the new exact-value contract; never regrade old frozen snapshots.
  const taskChecks = (definition.successCriteria.configurationValues===undefined?[]:definition.taskTargets ?? []).map(target => {
    const field = dvor1150aConfigurationTargetFields().find(f => f.id === target.fieldId);
    const viewId = dvor1150aConfigurationViewId(target.fieldId);
    const passed = !!field && (target.requirement === "change-applied"
      ? dvor1150aNativeFieldEvidence(definition, target.fieldId, currentConfiguration, evidence, runtime.startedAt, runtime.runId, runtime.scenarioId).length > 0
      : !!viewId && (evidence.visitedViewIds ?? []).includes(viewId));
    return { id: `task-target-${target.fieldId}`, label: `${field?.label ?? target.fieldId} · ${target.requirement}`, passed,
      detail: passed ? "Native field evidence verified" : "Missing exact native field evidence" };
  });
  const taskComplete = taskChecks.every(check => check.passed);
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
  const diagnosis = definition.diagnosis;
  const visitedViews = new Set(evidence.visitedViewIds ?? []);
  const acceptedActions = new Set(evidence.acceptedActionControlIds ?? []);
  const pmdtChecks = diagnosis
    ? diagnosis.pmdtCheckpoints.map((checkpoint) => ({
        id: `pmdt-${checkpoint.id}`,
        label: checkpoint.label,
        passed: visitedViews.has(checkpoint.viewId),
        detail: visitedViews.has(checkpoint.viewId) ? "Đã kiểm tra" : "Chưa mở màn hình",
      }))
    : [];
  const actionChecks = diagnosis
    ? diagnosis.requiredActionControlIds.map((controlId) => ({
        id: `action-${controlId}`,
        label: `PMDT action: ${controlId}`,
        passed: acceptedActions.has(controlId),
        detail: acceptedActions.has(controlId) ? "Đã thực hiện" : "Chưa thực hiện",
      }))
    : [];
  const expectedKeys = diagnosis?.expectedHardware.map(dvorHardwareOccurrenceKey) ?? [];
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
  const hardwareComplete = diagnosis
    ? diagnosis.disposition === "software-adjustment"
      ? selectedKeys.length === 0 && evidence.hardwareDispositionConfirmed === true
      : hardware.exactMatch
    : true;
  const baselineComplete = baselineChecks.length > 0 && baselineChecks.every((check) => check.passed);
  const pmdtComplete = diagnosis
    ? pmdtChecks.every((check) => check.passed)
      && actionChecks.every((check) => check.passed)
      && (diagnosis.disposition === "replace-module" || baselineComplete) && configurationComplete && taskComplete
    : (baselineChecks.length > 0 || configurationChecks.length > 0) && baselineChecks.every(check => check.passed) && configurationComplete && taskComplete;
  const checks = [
    ...baselineChecks,
    ...configurationChecks,
    ...taskChecks,
    ...pmdtChecks,
    ...actionChecks,
    ...(diagnosis ? [{
      id: "hardware-selection",
      label: diagnosis.disposition === "software-adjustment" ? "Hardware replacement" : "Hardware block selection",
      passed: hardwareComplete,
      detail: diagnosis.disposition === "software-adjustment"
        ? (hardwareComplete ? "No hardware replacement selected" : "Không được chọn phần cứng cho lỗi phần mềm")
        : (hardwareComplete ? "Đúng occurrence" : "Chưa khớp block/occurrence đáp án"),
    }] : []),
  ];
  const protectedChanges = currentConfiguration
    ? getDvor1150aScenarioProtectedFieldChanges(definition, currentConfiguration)
    : [];
  const blockers = protectedChanges.map(
    (change) => `Protected configuration changed: ${change.label}.`,
  );
  if (definition.successCriteria.configurationValues !== undefined && (runtime.scenarioId !== definition.id
    || !runtime.runId?.trim() || evidence.runId !== runtime.runId || !runtime.startedAt || !Number.isFinite(Date.parse(runtime.startedAt)))) blockers.push("Missing or mismatched native scenario run scope.");

  return {
    solved: diagnosis
      ? pmdtComplete && hardwareComplete && blockers.length === 0
      : pmdtComplete && blockers.length === 0,
    correctable: true,
    pmdtComplete,
    hardwareComplete,
    hardware,
    checks,
    blockers,
  };
}

function hasSameJsonShape(value: unknown, reference: unknown, path = ""): boolean {
  if (reference === null || value === null) return reference === value;
  if (typeof reference === "number") return typeof value === "number" && Number.isFinite(value);
  if (typeof reference === "string" || typeof reference === "boolean") return typeof value === typeof reference;
  if (Array.isArray(reference)) {
    return Array.isArray(value)
      && value.length === reference.length
      && value.every((entry, index) => hasSameJsonShape(entry, reference[index], `${path}.${index}`));
  }
  if (typeof reference !== "object" || typeof value !== "object" || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  const target = reference as Record<string, unknown>;
  const sourceKeys = Object.keys(source).sort();
  const targetKeys = Object.keys(target).sort();
  // Only named additive native branches may be absent in an old publication.
  // Validate present branches normally and preserve the saved JSON unchanged.
  const optional = path === "monitor" ? ["testGenerator", "testGeneratorCalibration", "standbyCalibration"]
    : /^transmitters\.tx[12]\.nominal$/.test(path) ? Object.keys(defaultDvorKeyerConfiguration) : [];
  return targetKeys.every(key => Object.hasOwn(source, key) || optional.includes(key))
    && sourceKeys.every(key => Object.hasOwn(target, key)
      && hasSameJsonShape(source[key], target[key], path ? `${path}.${key}` : key));
}

function validateScenarioDiagnosis(
  diagnosis: unknown,
): string[] {
  if (typeof diagnosis !== "object" || diagnosis === null || Array.isArray(diagnosis)) {
    return ["Scenario diagnosis must be an object."];
  }

  const candidate = diagnosis as Partial<Dvor1150aScenarioDiagnosis>;
  const issues: string[] = [];
  if (!(["replace-module", "software-adjustment"] as const).includes(candidate.disposition as Dvor1150aScenarioDisposition)) {
    issues.push("Scenario diagnosis disposition is invalid.");
  }
  if (!(["full", "on-air", "not-required"] as const).includes(candidate.diagnosticRun as Dvor1150aDiagnosticRun)) {
    issues.push("Scenario diagnostic run is invalid.");
  }
  for (const [field, value] of [
    ["diagnosticSubsystem", candidate.diagnosticSubsystem],
    ["diagnosticResult", candidate.diagnosticResult],
    ["faultSummary", candidate.faultSummary],
  ] as const) {
    if (typeof value !== "string" || !value.trim()) issues.push(`Scenario diagnosis ${field} is required.`);
  }
  if (!Array.isArray(candidate.manualReferences) || !candidate.manualReferences.every((item) => typeof item === "string" && item.trim())) {
    issues.push("Scenario diagnosis manual references are invalid.");
  }
  if (!Array.isArray(candidate.pmdtCheckpoints) || candidate.pmdtCheckpoints.length === 0) {
    issues.push("Scenario diagnosis must contain at least one PMDT checkpoint.");
  } else {
    for (const checkpoint of candidate.pmdtCheckpoints) {
      if (
        !checkpoint
        || typeof checkpoint.id !== "string"
        || !checkpoint.id.trim()
        || typeof checkpoint.label !== "string"
        || !checkpoint.label.trim()
        || typeof checkpoint.viewId !== "string"
      ) {
        issues.push("Scenario PMDT checkpoint is invalid.");
      }
    }
  }
  if (!Array.isArray(candidate.requiredActionControlIds) || !candidate.requiredActionControlIds.every((item) => typeof item === "string" && item.trim())) {
    issues.push("Scenario diagnosis required actions are invalid.");
  }
  if (!Array.isArray(candidate.expectedHardware)) {
    issues.push("Scenario diagnosis hardware targets are invalid.");
  } else {
    for (const target of candidate.expectedHardware) {
      if (
        !target
        || typeof target.blockId !== "string"
        || typeof target.diagramHotspotId !== "string"
        || !(target.cabinetHotspotId === null || typeof target.cabinetHotspotId === "string")
      ) {
        issues.push("Scenario hardware target identity is invalid.");
        continue;
      }
      const resolved = resolveDvorHardwareOccurrence(target.blockId as DvorBlockId, target.diagramHotspotId);
      if (!resolved || dvorHardwareOccurrenceKey(resolved) !== dvorHardwareOccurrenceKey(target)) {
        issues.push(`Scenario hardware target does not match the DVOR block catalog: ${target.blockId}/${target.diagramHotspotId}.`);
      }
      if (target.assemblyId !== undefined && typeof target.assemblyId !== "string") {
        issues.push("Scenario hardware target assembly ID is invalid.");
      }
    }
  }
  if (candidate.disposition === "replace-module" && candidate.expectedHardware?.length === 0) {
    issues.push("A replace-module scenario must contain at least one hardware target.");
  }
  if (candidate.disposition === "software-adjustment" && candidate.expectedHardware?.length !== 0) {
    issues.push("A software-adjustment scenario must not require a hardware target.");
  }
  return issues;
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
  const successKeys = ["requireIntegralMonitorNormal", "requireActiveTransmitter", "requireNoSidebandVswrAlarm", "requireMonitorBypassCleared"];
  for (const key of successKeys) if (typeof definition.successCriteria[key as keyof typeof definition.successCriteria] !== "boolean") issues.push(`Success criterion ${key} must be boolean.`);
  for (const key of Object.keys(definition.successCriteria)) if (!successKeys.includes(key) && key !== "configurationValues") issues.push(`Unknown success criterion: ${key}.`);
  issues.push(...validateConfigurationValues(definition));
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
  issues.push(...validateScenarioEditPolicy({
    policy: definition.editPolicy,
    fields: dvorConfigFieldCatalog,
    isBlocked: isLiveScenarioField,
    roleOf: dvor1150aScenarioFieldRole,
    label: "Scenario edit policy",
  }));
  issues.push(...validateScenarioTaskTargets({
    targets: definition.taskTargets,
    fields: dvorConfigFieldCatalog,
    isBlocked: isLiveScenarioField,
    roleOf: dvor1150aScenarioFieldRole,
    label: "Scenario task targets",
  }));
  issues.push(...validateDvorConfig(definition.configuration));
  if (definition.diagnosis !== undefined) {
    issues.push(...validateScenarioDiagnosis(definition.diagnosis));
  }
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
  return Boolean(definition && isScenarioFieldAllowed({
    policy: definition.editPolicy,
    legacyFieldIds: definition.studentEditableFieldIds,
    fieldId,
    fields: dvorConfigFieldCatalog,
    isBlocked: isLiveScenarioField,
    roleOf: dvor1150aScenarioFieldRole,
  }));
}

export function dvor1150aScenarioAllowedFieldIds(
  definition: Dvor1150aScenarioDefinition | null,
): string[] {
  if (!definition) return [];
  return scenarioAllowedFieldIds({
    policy: definition.editPolicy,
    legacyFieldIds: definition.studentEditableFieldIds,
    fields: dvorConfigFieldCatalog,
    isBlocked: isLiveScenarioField,
    roleOf: dvor1150aScenarioFieldRole,
  });
}
