import { hasSameJsonShape } from "@/lib/simulator-config/shape";
import { createDefaultDme320Config } from "./defaults";
import { DME320_FAULT_CATALOG } from "./faults";
import {
  DME320_MONITOR_PARAMETERS,
  type Dme320Config,
  type Dme320FaultKind,
  type Dme320FaultTarget,
  type Dme320MeasurementOverride,
  type Dme320ScenarioDefinition,
  type Dme320ScenarioEvaluation,
  type Dme320SimulationState,
} from "./types";
import { validateDme320Config } from "./validation";

export const DME320_SCENARIO_SCHEMA_VERSION = 1 as const;
export const DME320_SCENARIO_MONITORS = ["mon1", "mon2"] as const;
export const DME320_SCENARIO_CHANNELS = ["executive", "standby"] as const;
export const DME320_SCENARIO_TRANSPONDERS = ["tx1", "tx2"] as const;

/** Match fault targets to the existing engine, not arbitrary UI combinations. */
export function dme320ScenarioFaultTargets(kind: Dme320FaultKind): readonly Dme320FaultTarget[] {
  switch (kind) {
    case "hpa-low-output":
    case "txu-failure":
    case "rxu-sensitivity":
    case "tcu-failure":
    case "dcdc-failure":
    case "fan-failure":
      return DME320_SCENARIO_TRANSPONDERS;
    case "rfg-failure":
    case "monitor-failure":
      return DME320_SCENARIO_MONITORS;
    case "antenna-vswr":
    case "rf-detector-failure":
    case "vswr-monitor-failure":
    case "coax-relay-failure":
    case "dummy-load-failure":
      return ["antenna"];
    case "battery-low":
    case "battery-overtemperature":
      return ["battery1", "battery2"];
    default:
      return ["system"];
  }
}

export function createDefaultDme320ScenarioDefinition(): Dme320ScenarioDefinition {
  const configuration = createDefaultDme320Config();
  const battery = { connected: true, voltage: configuration.battery.fullyChargedVoltage, temperatureC: 25 };
  return {
    schemaVersion: DME320_SCENARIO_SCHEMA_VERSION,
    id: "custom-dme320-scenario",
    name: "Custom DME 320 Scenario",
    description: "Session-only training based on the standard DME 320 configuration.",
    difficulty: "basic",
    configuration,
    runtime: {
      mainTransponder: "tx1",
      startMonitorBypassed: true,
      acAvailable: true,
      batteries: { battery1: { ...battery }, battery2: { ...battery } },
      temperaturesC: { tx1: 35, tx2: 35 },
      spacingOffsetsUs: { tx1: 0, tx2: 0 },
      environment: { present: true, temperatureC: 24, smokeDetected: false, intrusionDetected: false },
      faults: [],
      measurementOverrides: [],
    },
    successCriteria: {
      requireServiceNormal: true,
      requireMonitorChannelsNormal: true,
      requireNoPrimaryAlarm: true,
      requireNoActiveFaults: true,
    },
  };
}

export function createLowPowerDme320Scenario(): Dme320ScenarioDefinition {
  const scenario = createDefaultDme320ScenarioDefinition();
  scenario.id = "tx1-low-power";
  scenario.name = "TX1 Low Power / ERP";
  scenario.description =
    "Restore TX1 output to 100% through Transponder Setup. The existing engine derives Peak Power and ERP from that setting.";
  scenario.difficulty = "intermediate";
  scenario.configuration.transmitters.tx1.outputPowerPercent = 40;
  return scenario;
}

export function createPulseSpacingDme320Scenario(): Dme320ScenarioDefinition {
  const scenario = createDefaultDme320ScenarioDefinition();
  scenario.id = "tx1-pulse-spacing";
  scenario.name = "TX1 Pulse Spacing Offset";
  scenario.description =
    "Diagnose TX1 pulse spacing and restore its offset to 0 us using TXP Advanced Control (local level 3, MAINT, monitors bypassed). Return to LOCAL to finish.";
  scenario.difficulty = "intermediate";
  scenario.runtime.spacingOffsetsUs.tx1 = 1;
  return scenario;
}

export function createHardwareDme320Scenario(): Dme320ScenarioDefinition {
  const scenario = createDefaultDme320ScenarioDefinition();
  scenario.id = "tx1-hpa-failure";
  scenario.name = "TX1 HPA Low Output Fault";
  scenario.description =
    "Trace low power and efficiency to the HPA, then clear the injected fault in Maintenance / Fault Controls. Raising the setpoint alone cannot repair this fault.";
  scenario.difficulty = "advanced";
  scenario.runtime.faults = [{ id: "scenario-tx1-hpa", kind: "hpa-low-output", target: "tx1" }];
  return scenario;
}

export const DME320_BUILT_IN_SCENARIOS = [
  { id: "default", label: "New from DME 320 defaults", create: createDefaultDme320ScenarioDefinition },
  { id: "low-power", label: "TX1 Low Power / ERP", create: createLowPowerDme320Scenario },
  { id: "pulse-spacing", label: "TX1 Pulse Spacing Offset", create: createPulseSpacingDme320Scenario },
  { id: "hpa-fault", label: "TX1 HPA Low Output Fault", create: createHardwareDme320Scenario },
] as const;

/** Match semantic targets so imported IDs and presets remain editable. */
export function setDme320ScenarioFault(
  scenario: Dme320ScenarioDefinition,
  kind: Dme320FaultKind,
  target: Dme320FaultTarget,
  enabled: boolean,
): void {
  scenario.runtime.faults = scenario.runtime.faults.filter(
    (fault) => fault.kind !== kind || fault.target !== target,
  );
  if (enabled) scenario.runtime.faults.push({ id: `scenario-${kind}-${target}`, kind, target });
}

export function setDme320ScenarioOverride(
  scenario: Dme320ScenarioDefinition,
  key: Pick<Dme320MeasurementOverride, "monitorId" | "channel" | "parameter">,
  value: Pick<Dme320MeasurementOverride, "value" | "valid"> | null,
): void {
  scenario.runtime.measurementOverrides = scenario.runtime.measurementOverrides.filter(
    (item) =>
      item.monitorId !== key.monitorId || item.channel !== key.channel || item.parameter !== key.parameter,
  );
  if (value !== null) scenario.runtime.measurementOverrides.push({ ...key, ...value });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Limits can be disabled with null even when the default limit is numeric. */
function validConfigurationShape(value: unknown): value is Dme320Config {
  if (!isRecord(value) || !isRecord(value.monitor) || !isRecord(value.monitor.limits)) return false;
  const reference = createDefaultDme320Config();
  for (const parameter of DME320_MONITOR_PARAMETERS) {
    const limit = value.monitor.limits[parameter];
    if (!isRecord(limit)) return false;
    for (const key of ["alarmLow", "warningLow", "warningHigh", "alarmHigh"] as const) {
      const threshold = limit[key];
      if (threshold !== null && (typeof threshold !== "number" || !Number.isFinite(threshold))) return false;
      reference.monitor.limits[parameter][key] = threshold;
    }
  }
  return hasSameJsonShape(value, reference);
}

export function validateDme320ScenarioDefinition(value: unknown): string[] {
  if (!isRecord(value)) return ["Scenario must be a JSON object."];
  const issues: string[] = [];
  if (
    Object.keys(value).some(
      (key) =>
        ![
          "schemaVersion",
          "id",
          "name",
          "description",
          "difficulty",
          "configuration",
          "runtime",
          "successCriteria",
        ].includes(key),
    )
  ) {
    issues.push("Scenario contains unsupported fields.");
  }
  if (value.schemaVersion !== DME320_SCENARIO_SCHEMA_VERSION)
    issues.push("Unsupported DME 320 scenario schema version.");
  if (typeof value.id !== "string" || !value.id.trim() || value.id.length > 200)
    issues.push("Scenario ID is required (maximum 200 characters).");
  if (typeof value.name !== "string" || !value.name.trim() || value.name.length > 200)
    issues.push("Scenario name is required (maximum 200 characters).");
  if (typeof value.description !== "string") issues.push("Scenario description must be text.");
  if (!["basic", "intermediate", "advanced"].includes(String(value.difficulty)))
    issues.push("Invalid scenario difficulty.");
  if (!validConfigurationShape(value.configuration)) {
    issues.push("Scenario configuration does not match the DME 320 structure.");
  } else {
    const config = value.configuration;
    issues.push(...validateDme320Config(config).map((issue) => `${issue.path}: ${issue.message}`));
    const enums: Array<[string, string, readonly string[]]> = [
      ["station.standbyMode", config.station.standbyMode, ["hot", "cold"]],
      ["station.autoDelayCalibration", config.station.autoDelayCalibration, ["always", "never"]],
      [
        "station.identKeyer",
        config.station.identKeyer,
        ["none", "independent", "master", "slave", "continuous"],
      ],
      ["station.identSync", config.station.identSync, ["code", "pulse"]],
      [
        "station.identSound",
        config.station.identSound,
        ["MON1", "MON2", "STB MON", "TX1", "TX2", "ON ANTENNA", "OFF"],
      ],
      ["thermal.fanMode", config.thermal.fanMode, ["auto", "on", "off"]],
      ["monitor.votingLogic", config.monitor.votingLogic, ["AND", "OR"]],
      [
        "communication.scu1RemoteType",
        config.communication.scu1RemoteType,
        ["RS-232", "Leased Line", "Dialup"],
      ],
      [
        "communication.scu2RemoteType",
        config.communication.scu2RemoteType,
        ["RS-232", "Leased Line", "Dialup"],
      ],
      ["communication.rcuLineType", config.communication.rcuLineType, ["Ethernet", "Modem", "RS-232"]],
    ];
    for (const [path, selected, allowed] of enums) {
      if (!allowed.includes(selected)) issues.push(`${path}: Unsupported selection.`);
    }
    for (const parameter of DME320_MONITOR_PARAMETERS) {
      if (!["primary", "secondary"].includes(config.monitor.limits[parameter].classification))
        issues.push(`${parameter}: Invalid alarm classification.`);
    }
    if (!/^[a-z]{0,4}$/i.test(String(config.monitor.limits.identCode.nominal)))
      issues.push("Monitor IDENT nominal must contain at most four letters.");
  }

  const reference = createDefaultDme320ScenarioDefinition();
  const runtime = value.runtime;
  if (
    !isRecord(runtime) ||
    !Array.isArray(runtime.faults) ||
    !Array.isArray(runtime.measurementOverrides) ||
    !hasSameJsonShape({ ...runtime, faults: [], measurementOverrides: [] }, reference.runtime)
  ) {
    issues.push("Scenario runtime structure is invalid.");
  } else {
    const typed = runtime as Dme320ScenarioDefinition["runtime"];
    if (!DME320_SCENARIO_TRANSPONDERS.includes(typed.mainTransponder))
      issues.push("Main transponder must be TX1 or TX2.");
    for (const id of DME320_SCENARIO_TRANSPONDERS) {
      if (typed.temperaturesC[id] < -100 || typed.temperaturesC[id] > 200)
        issues.push(`${id}: Temperature must be between -100 and 200 C.`);
    }
    for (const battery of Object.values(typed.batteries)) {
      if (
        battery.voltage < 0 ||
        battery.voltage > 30 ||
        battery.temperatureC < -128 ||
        battery.temperatureC > 127
      )
        issues.push("Battery voltage or temperature is outside the supported range.");
    }
    if (typed.environment.temperatureC < -100 || typed.environment.temperatureC > 200)
      issues.push("Ambient temperature must be between -100 and 200 C.");
    const faultIds = new Set<string>();
    const faultTargets = new Set<string>();
    for (const fault of runtime.faults) {
      if (
        !isRecord(fault) ||
        typeof fault.id !== "string" ||
        !fault.id.trim() ||
        typeof fault.kind !== "string" ||
        !Object.hasOwn(DME320_FAULT_CATALOG, fault.kind) ||
        !dme320ScenarioFaultTargets(fault.kind as Dme320FaultKind).includes(
          fault.target as Dme320FaultTarget,
        ) ||
        faultIds.has(fault.id) ||
        faultTargets.has(`${fault.kind}:${fault.target}`) ||
        Object.keys(fault).some((key) => !["id", "kind", "target"].includes(key))
      ) {
        issues.push("Faults must have unique IDs and supported kind/target pairs.");
      } else {
        faultIds.add(fault.id);
        faultTargets.add(`${fault.kind}:${fault.target}`);
      }
    }
    const overrideKeys = new Set<string>();
    for (const override of runtime.measurementOverrides) {
      if (
        !isRecord(override) ||
        !DME320_SCENARIO_MONITORS.includes(override.monitorId as "mon1") ||
        !DME320_SCENARIO_CHANNELS.includes(override.channel as "executive") ||
        !DME320_MONITOR_PARAMETERS.includes(override.parameter as "timeDelayUs") ||
        Object.keys(override).some(
          (key) => !["monitorId", "channel", "parameter", "value", "valid"].includes(key),
        ) ||
        (override.valid !== undefined && typeof override.valid !== "boolean") ||
        (override.value !== null &&
          (override.parameter === "identCode"
            ? typeof override.value !== "string" || !/^[a-z]{0,4}$/i.test(override.value)
            : typeof override.value !== "number" || !Number.isFinite(override.value)))
      ) {
        issues.push("Forced monitor overrides must use a supported channel, parameter and value type.");
        continue;
      }
      const key = `${override.monitorId}:${override.channel}:${override.parameter}`;
      if (overrideKeys.has(key)) issues.push("Duplicate forced monitor override.");
      overrideKeys.add(key);
    }
  }
  if (!hasSameJsonShape(value.successCriteria, reference.successCriteria))
    issues.push("Success criteria must contain boolean values.");
  else if (!Object.values(value.successCriteria as object).some(Boolean))
    issues.push("Select at least one success criterion.");
  return [...new Set(issues)];
}

export function parseDme320ScenarioDefinition(value: unknown): Dme320ScenarioDefinition | null {
  try {
    if (validateDme320ScenarioDefinition(value).length > 0) return null;
    const parsed = structuredClone(value as Dme320ScenarioDefinition);
    parsed.id = parsed.id.trim();
    parsed.name = parsed.name.trim();
    parsed.description = parsed.description.trim();
    return parsed;
  } catch {
    return null;
  }
}

export function evaluateDme320Scenario(state: Dme320SimulationState): Dme320ScenarioEvaluation {
  const definition = state.scenario.definition;
  if (!state.scenario.active || !definition)
    return { solved: false, correctable: true, checks: [], blockers: [] };
  const blockers =
    state.measurementOverrides.length > 0
      ? ["Forced Monitor overrides are active and can hide PMDT corrections."]
      : [];
  // A cold standby is intentionally unpowered; absent/faulty executive monitors
  // still fail instead of being silently excluded from the exercise.
  const channels = DME320_SCENARIO_MONITORS.flatMap((id) =>
    DME320_SCENARIO_CHANNELS.filter(
      (channel) => channel === "executive" || state.config.running.station.standbyMode === "hot",
    ).map((channel) => ({ monitor: state.monitors[id], channel: state.monitors[id].channels[channel] })),
  );
  const monitorsNormal = channels.every(
    ({ monitor, channel }) =>
      monitor.present &&
      !monitor.hardwareFault &&
      channel.overallStatus === "normal" &&
      Object.values(channel.readings).every((reading) => reading.valid && !reading.masked) &&
      Object.values(channel.alarms).every((alarm) => alarm.phase === "normal"),
  );
  const noPrimaryAlarm = channels.every(
    ({ monitor, channel }) =>
      monitor.present &&
      !monitor.hardwareFault &&
      Object.values(channel.alarms).every(
        (alarm) => alarm.classification !== "primary" || alarm.phase === "normal",
      ),
  );
  const check = (id: string, label: string, passed: boolean, detail: string) => ({
    id,
    label,
    passed,
    detail,
  });
  const checks = [
    ...(definition.successCriteria.requireServiceNormal
      ? [
          check(
            "service",
            "Service status",
            state.serviceStatus === "normal",
            state.serviceStatus.toUpperCase(),
          ),
        ]
      : []),
    ...(definition.successCriteria.requireMonitorChannelsNormal
      ? [
          check(
            "monitors",
            "Required monitor channels",
            monitorsNormal,
            monitorsNormal ? "All Normal" : "Warning, pending, alarm or unavailable readings remain",
          ),
        ]
      : []),
    ...(definition.successCriteria.requireNoPrimaryAlarm
      ? [
          check(
            "primary",
            "Primary alarms",
            noPrimaryAlarm,
            noPrimaryAlarm ? "Clear" : "Primary alarm or pending condition remains",
          ),
        ]
      : []),
    ...(definition.successCriteria.requireNoActiveFaults
      ? [
          check(
            "faults",
            "Injected faults",
            !state.faults.some((fault) => fault.active),
            `${state.faults.filter((fault) => fault.active).length} active`,
          ),
        ]
      : []),
  ];
  return {
    solved: blockers.length === 0 && checks.length > 0 && checks.every((item) => item.passed),
    correctable: blockers.length === 0,
    checks,
    blockers,
  };
}
