import { cloneDvor220, createDefaultDvor220Configuration, createInitialDvor220State } from "./defaults";
import {
  advanceDvor220Time,
  appendDvor220Log,
  deriveDvor220Snapshot,
  reconcileDvor220State,
} from "./engine";
import {
  DVOR220_MONITOR_CHANNEL_IDS,
  DVOR220_MONITOR_IDS,
  DVOR220_MONITOR_PARAMETERS,
  DVOR220_RF_OUTPUT_IDS,
  DVOR220_TRANSMITTER_IDS,
  type Dvor220DeviceState,
  type Dvor220InjectedFault,
  type Dvor220ScenarioDefinition,
  type Dvor220ScenarioEvaluation,
  type Dvor220Snapshot,
  type Dvor220TransmitterId,
} from "./types";
import { validateDvor220Configuration } from "./validation";

export const DVOR220_SCENARIO_SCHEMA_VERSION = 1 as const;

function defaultTemperatures() {
  return {
    tx1: { cma: 35.5, usb: 36, lsb: 36.2 },
    tx2: { cma: 34.8, usb: 35.2, lsb: 35.4 },
  } satisfies Dvor220ScenarioDefinition["runtime"]["temperaturesC"];
}

export function createDefaultDvor220ScenarioDefinition(): Dvor220ScenarioDefinition {
  return {
    schemaVersion: DVOR220_SCENARIO_SCHEMA_VERSION,
    id: "custom-dvor220-scenario",
    name: "Custom DVOR 220 Scenario",
    description: "Session-only training baseline derived from Đài TEST/TST.",
    difficulty: "basic",
    configuration: createDefaultDvor220Configuration(),
    runtime: {
      mainTransmitterId: "tx1",
      startMonitorBypassed: true,
      acAvailable: true,
      batteryRemainingMinutes: 240,
      temperaturesC: defaultTemperatures(),
      environment: {
        temperatureC: 24,
        smoke: false,
        intrusion: false,
      },
      antennaVswr: [],
      faults: [],
      measurementOverrides: [],
    },
    successCriteria: {
      requireServiceNormal: true,
      requireEnabledMonitorChannelsNormal: true,
      requireNoPrimaryAlarm: true,
    },
  };
}

export function createCarrierAnd9960DegradationScenario(): Dvor220ScenarioDefinition {
  const scenario = createDefaultDvor220ScenarioDefinition();
  scenario.id = "tx1-carrier-9960-degradation";
  scenario.name = "TX1 Carrier and 9960 Hz Degradation";
  scenario.description = "TX1 starts with low carrier and four low sidebands. Restore carrier power and 9960 Hz modulation through PMDT Setup or Transmitter Helper.";
  scenario.difficulty = "intermediate";
  scenario.configuration.transmitters.tx1.carrierScalePercent = 50;
  scenario.configuration.transmitters.tx1.sidebandPowerW = {
    usbCos: 0.32,
    usbSin: 0.32,
    lsbCos: 0.32,
    lsbSin: 0.32,
  };
  scenario.configuration.transmitterLimits.carrierPower.lowerAlarm = 60;
  scenario.configuration.transmitterLimits.carrierPower.lowerWarning = 80;
  scenario.configuration.monitor.measurementAverageCount = 2;
  return scenario;
}

export const DVOR220_BUILT_IN_SCENARIOS = [
  { id: "default", label: "New from Đài TEST/TST", create: createDefaultDvor220ScenarioDefinition },
  { id: "carrier-9960", label: "TX1 Carrier + 9960 Hz degradation", create: createCarrierAnd9960DegradationScenario },
] as const;

function preserveSessionContext(fresh: Dvor220DeviceState, current: Dvor220DeviceState) {
  fresh.keylock = current.keylock;
  fresh.connection = cloneDvor220(current.connection);
  fresh.session = cloneDvor220(current.session);
  fresh.accounts = cloneDvor220(current.accounts);
  fresh.history = cloneDvor220(current.history);
}

function setRfOutputs(state: Dvor220DeviceState, transmitterId: Dvor220TransmitterId, on: boolean) {
  for (const output of DVOR220_RF_OUTPUT_IDS) state.transmitters[transmitterId].rfOutputs[output] = on;
}

function applyScenarioRuntime(
  state: Dvor220DeviceState,
  scenario: Dvor220ScenarioDefinition,
) {
  const mainId = scenario.runtime.mainTransmitterId;
  const standbyId = mainId === "tx1" ? "tx2" : "tx1";
  const outputOn = scenario.configuration.station.transmitterOutputOnBoot;
  const standbyAvailable = scenario.configuration.station.equipmentVersion === "dual";
  const standbyOn = standbyAvailable && scenario.configuration.station.standbyMode === "hot";

  state.transmitters[mainId].designation = "main";
  state.transmitters[mainId].path = "antenna";
  state.transmitters[mainId].powerOn = true;
  setRfOutputs(state, mainId, outputOn);

  state.transmitters[standbyId].designation = "standby";
  state.transmitters[standbyId].path = standbyOn ? "load" : "disconnected";
  state.transmitters[standbyId].powerOn = standbyOn;
  setRfOutputs(state, standbyId, standbyOn && outputOn);

  for (const transmitterId of DVOR220_TRANSMITTER_IDS) {
    state.transmitters[transmitterId].temperaturesC = cloneDvor220(
      scenario.runtime.temperaturesC[transmitterId],
    );
  }
  for (const monitorId of DVOR220_MONITOR_IDS) {
    state.monitors[monitorId].bypassRequested = scenario.runtime.startMonitorBypassed;
  }

  state.power.acAvailable = scenario.runtime.acAvailable;
  state.power.batteryRemainingMs = Math.max(
    0,
    Math.min(state.power.batteryCapacityMs, scenario.runtime.batteryRemainingMinutes * 60_000),
  );
  state.environment.temperatureC = scenario.runtime.environment.temperatureC;
  state.environment.smoke = scenario.runtime.environment.smoke;
  state.environment.intrusion = scenario.runtime.environment.intrusion;
  state.faults = [
    ...cloneDvor220(scenario.runtime.faults),
    ...scenario.runtime.antennaVswr.map((entry) => ({
      id: `scenario-antenna-${entry.antenna}`,
      kind: "antenna-vswr" as const,
      antenna: entry.antenna,
      usbVswr: entry.usbVswr,
      lsbVswr: entry.lsbVswr,
    })),
  ];
  state.measurementOverrides = cloneDvor220(scenario.runtime.measurementOverrides);
}

export function startDvor220Scenario(
  current: Dvor220DeviceState,
  definition: Dvor220ScenarioDefinition,
): Dvor220DeviceState {
  const scenario = cloneDvor220(definition);
  let next = createInitialDvor220State({
    nowMs: current.nowMs,
    configuration: scenario.configuration,
  });
  preserveSessionContext(next, current);
  applyScenarioRuntime(next, scenario);
  next.scenario = {
    active: true,
    definition: scenario,
    startedAtMs: current.nowMs,
  };
  appendDvor220Log(next, "event", `Scenario started: ${scenario.name}`, "SYSTEM");
  next = reconcileDvor220State(next);
  return next;
}

export function restartDvor220Scenario(current: Dvor220DeviceState): Dvor220DeviceState | null {
  if (!current.scenario.active || !current.scenario.definition) return null;
  const next = startDvor220Scenario(current, current.scenario.definition);
  appendDvor220Log(next, "control", `Scenario restored: ${current.scenario.definition.name}`, "SYSTEM");
  return next;
}

export function endDvor220Scenario(current: Dvor220DeviceState): Dvor220DeviceState {
  let next = createInitialDvor220State({
    nowMs: current.nowMs,
    configuration: createDefaultDvor220Configuration(),
  });
  preserveSessionContext(next, current);
  next.scenario = { active: false, definition: null, startedAtMs: null };
  appendDvor220Log(next, "control", "Scenario ended; Đài TEST/TST defaults restored", "SYSTEM");
  next = reconcileDvor220State(next);
  return next;
}

export function previewDvor220Scenario(
  definition: Dvor220ScenarioDefinition,
  nowMs = 0,
): { device: Dvor220DeviceState; snapshot: Dvor220Snapshot } {
  const seed = createInitialDvor220State({ nowMs });
  let device = startDvor220Scenario(seed, definition);
  device = advanceDvor220Time(
    device,
    Math.max(200, definition.configuration.monitor.measurementAverageCount * 100),
  );
  return { device, snapshot: deriveDvor220Snapshot(device) };
}

export function evaluateDvor220Scenario(
  state: Dvor220DeviceState,
  snapshot = deriveDvor220Snapshot(state),
): Dvor220ScenarioEvaluation {
  const definition = state.scenario.definition;
  if (!state.scenario.active || !definition) {
    return { solved: false, correctable: true, checks: [], blockers: [] };
  }

  const blockers = definition.runtime.measurementOverrides.length > 0
    ? ["Forced Monitor overrides are active and can hide PMDT corrections."]
    : [];
  const enabledChannels = DVOR220_MONITOR_IDS.flatMap((monitorId) =>
    DVOR220_MONITOR_CHANNEL_IDS
      .map((channelId) => snapshot.monitors[monitorId].channels[channelId])
      .filter((channel) => channel.enabled),
  );
  const primaryAlarmActive = enabledChannels.some((channel) => channel.primaryAlarm);
  const allEnabledChannelsNormal = enabledChannels.every(
    (channel) => !channel.stabilizing && channel.status === "normal",
  );
  const checks = [
    ...(definition.successCriteria.requireServiceNormal ? [{
      id: "service",
      label: "Service status",
      passed: snapshot.serviceStatus === "normal",
      detail: snapshot.serviceStatus.toUpperCase(),
    }] : []),
    ...(definition.successCriteria.requireEnabledMonitorChannelsNormal ? [{
      id: "monitors",
      label: "Enabled monitor channels",
      passed: allEnabledChannelsNormal,
      detail: allEnabledChannelsNormal ? "All Normal" : "Warning, Alarm or Stabilizing remains",
    }] : []),
    ...(definition.successCriteria.requireNoPrimaryAlarm ? [{
      id: "primary",
      label: "Primary alarms",
      passed: !primaryAlarmActive,
      detail: primaryAlarmActive ? "Active" : "Clear",
    }] : []),
  ];
  const correctable = blockers.length === 0;
  return {
    solved: correctable && checks.length > 0 && checks.every((check) => check.passed),
    correctable,
    checks,
    blockers,
  };
}

function hasSameJsonShape(value: unknown, reference: unknown): boolean {
  if (reference === null || value === null) return reference === value;
  if (Array.isArray(reference)) return Array.isArray(value);
  if (typeof reference !== "object") return typeof value === typeof reference;
  if (typeof value !== "object" || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  const target = reference as Record<string, unknown>;
  const sourceKeys = Object.keys(source).sort();
  const targetKeys = Object.keys(target).sort();
  return sourceKeys.length === targetKeys.length
    && sourceKeys.every((key, index) => key === targetKeys[index] && hasSameJsonShape(source[key], target[key]));
}

function validFault(fault: unknown): fault is Dvor220InjectedFault {
  if (!fault || typeof fault !== "object") return false;
  const candidate = fault as Partial<Dvor220InjectedFault> & { kind?: string; id?: string };
  return typeof candidate.id === "string"
    && [
      "transmitter-unit",
      "monitor-hardware",
      "monitor-parameter",
      "pdc",
      "antenna-vswr",
      "communication",
      "environment",
    ].includes(candidate.kind ?? "");
}

export function validateDvor220ScenarioDefinition(
  definition: Dvor220ScenarioDefinition,
): string[] {
  const issues: string[] = [];
  if (definition.schemaVersion !== DVOR220_SCENARIO_SCHEMA_VERSION) issues.push("Unsupported scenario schema version.");
  if (!definition.id.trim()) issues.push("Scenario ID is required.");
  if (!definition.name.trim()) issues.push("Scenario name is required.");
  issues.push(...validateDvor220Configuration(definition.configuration)
    .filter((item) => item.severity === "error")
    .map((item) => `${item.path}: ${item.message}`));
  if (!Number.isFinite(definition.runtime.batteryRemainingMinutes) || definition.runtime.batteryRemainingMinutes < 0) {
    issues.push("Battery remaining time must be a non-negative finite number.");
  }
  for (const transmitterId of DVOR220_TRANSMITTER_IDS) {
    for (const [unit, value] of Object.entries(definition.runtime.temperaturesC[transmitterId])) {
      if (!Number.isFinite(value) || value < -100 || value > 200) {
        issues.push(`${transmitterId.toUpperCase()} ${unit.toUpperCase()} temperature must be between -100 and 200 °C.`);
      }
    }
  }
  if (!Number.isFinite(definition.runtime.environment.temperatureC)) issues.push("Ambient temperature must be finite.");
  for (const antenna of definition.runtime.antennaVswr) {
    if (!Number.isInteger(antenna.antenna) || antenna.antenna < 1 || antenna.antenna > 48) {
      issues.push("Antenna number must be an integer from 1 to 48.");
    }
    if (!Number.isFinite(antenna.usbVswr) || !Number.isFinite(antenna.lsbVswr) || antenna.usbVswr < 1 || antenna.lsbVswr < 1) {
      issues.push(`Antenna ${antenna.antenna} VSWR must be finite and at least 1.00:1.`);
    }
  }
  if (!definition.runtime.faults.every(validFault)) issues.push("One or more typed faults are invalid.");
  for (const override of definition.runtime.measurementOverrides) {
    if (!DVOR220_MONITOR_IDS.includes(override.monitorId)
      || !DVOR220_MONITOR_CHANNEL_IDS.includes(override.channelId)
      || !DVOR220_MONITOR_PARAMETERS.includes(override.parameter)
      || !Number.isFinite(override.value)) {
      issues.push("One or more forced Monitor overrides are invalid.");
      break;
    }
  }
  return [...new Set(issues)];
}

export function parseDvor220ScenarioDefinition(value: unknown): Dvor220ScenarioDefinition | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Dvor220ScenarioDefinition>;
  const reference = createDefaultDvor220ScenarioDefinition();
  if (candidate.schemaVersion !== DVOR220_SCENARIO_SCHEMA_VERSION
    || typeof candidate.id !== "string"
    || typeof candidate.name !== "string"
    || typeof candidate.description !== "string"
    || !["basic", "intermediate", "advanced"].includes(candidate.difficulty ?? "")
    || !hasSameJsonShape(candidate.configuration, reference.configuration)
    || !candidate.runtime
    || !candidate.successCriteria) {
    return null;
  }
  const parsed = cloneDvor220(candidate as Dvor220ScenarioDefinition);
  try {
    return validateDvor220ScenarioDefinition(parsed).length === 0 ? parsed : null;
  } catch {
    return null;
  }
}
