import { reduceDvor220Command } from "@/modules/operations/dvor-220/domain/commands";
import { advanceDvor220Time } from "@/modules/operations/dvor-220/domain/engine";
import { evaluateDvor220Scenario, previewDvor220Scenario } from "@/modules/operations/dvor-220/domain/scenario";
import type { Dvor220Command } from "@/modules/operations/dvor-220/domain/types";
import { advanceDme320Simulation, executeDme320Command, previewDme320Scenario } from "@/modules/operations/dme-320/domain/engine";
import { evaluateDme320Scenario } from "@/modules/operations/dme-320/domain/scenario";
import type { Dme320Command } from "@/modules/operations/dme-320/domain/types";
import type { ScenarioParametersDefinition, ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { createDefaultDvor220ScenarioDefinition, parseDvor220ScenarioDefinition } from "@/modules/operations/dvor-220/domain/scenario";
import { createDefaultDme320ScenarioDefinition, dme320ScenarioFaultTargets, parseDme320ScenarioDefinition } from "@/modules/operations/dme-320/domain/scenario";
import { DME320_FAULT_CATALOG } from "@/modules/operations/dme-320/domain/faults";
import type { Dme320FaultKind } from "@/modules/operations/dme-320/domain/types";
import type { Dvor220InjectedFault } from "@/modules/operations/dvor-220/domain/types";
import type { ParameterAssignment, ParameterValue, ScenarioParameterAdapter, ScenarioParameterField } from "./parameter-types";
import { AiScenarioError } from "./types";

type Definition = ReturnType<typeof createDefaultDvor220ScenarioDefinition> | ReturnType<typeof createDefaultDme320ScenarioDefinition>;
type Spec = Omit<ScenarioParameterField, "value"> & { fault?: Dvor220InjectedFault | { id: string; kind: Dme320FaultKind; target: ReturnType<typeof dme320ScenarioFaultTargets>[number] } };
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
function invalid(message: string): never { throw new AiScenarioError("INVALID_PARAMETERS", message); }
function safe(value: unknown): void {
  if (typeof value === "number" && !Number.isFinite(value)) invalid("All numeric values must be finite.");
  if (value && typeof value === "object") {
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) invalid("Only plain native data is supported.");
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.has(key)) invalid("Unsafe property.");
      safe(child);
    }
  }
}
function read(root: unknown, path: string): ParameterValue {
  return path.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], root) as ParameterValue;
}
function write(root: unknown, path: string, value: ParameterValue): void {
  const parts = path.split(".");
  const parent = parts.slice(0, -1).reduce<unknown>((item, key) => (item as Record<string, unknown>)[key], root) as Record<string, unknown>;
  parent[parts.at(-1)!] = value;
}
function sameShape(value: unknown, reference: unknown): boolean {
  if (Array.isArray(reference)) return Array.isArray(value);
  if (!reference || typeof reference !== "object") return typeof value === typeof reference;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(reference);
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key) && sameShape((value as Record<string, unknown>)[key], (reference as Record<string, unknown>)[key]));
}
function native(moduleId: ScenarioParametersModuleId, definition: ScenarioParametersDefinition): Definition {
  try {
    safe(definition);
    const parsed = moduleId === "dvor-220" ? parseDvor220ScenarioDefinition(definition) : moduleId === "dme-320" ? parseDme320ScenarioDefinition(definition) : null;
    if (!parsed) invalid("Unsupported module or invalid native scenario.");
    const reference = moduleId === "dvor-220" ? createDefaultDvor220ScenarioDefinition() : createDefaultDme320ScenarioDefinition();
    if (!sameShape(moduleId === "dme-320" ? { ...definition, configuration: reference.configuration } : definition, reference)) invalid("Unsupported native scenario fields.");
    if (new Set(parsed.runtime.faults.map((fault) => fault.id)).size !== parsed.runtime.faults.length) invalid("Duplicate native fault IDs.");
    if (!sameShape(parsed.runtime, reference.runtime) || !sameShape(parsed.successCriteria, reference.successCriteria)) invalid("Invalid native runtime or criteria structure.");
    if (!Object.values(parsed.successCriteria).some(Boolean)) invalid("At least one success criterion is required.");
    if (moduleId === "dvor-220") {
      const d = parsed as ReturnType<typeof createDefaultDvor220ScenarioDefinition>;
      const txIds = ["tx1", "tx2"];
      const monIds = ["mon1", "mon2"];
      const channels = ["cha", "chb1", "chb2", "standby"];
      const parameters = ["bearingError", "fmIndex", "am30Hz", "am9960Hz", "ident1020Hz", "rfLevel", "distortion9960Hz", "carrierFrequency", "subcarrierFrequency"];
      const conditions = ["warning", "alarm", "fault", "unplugged"];
      for (const entry of d.runtime.faults) {
        const f = entry as unknown as Record<string, unknown>;
        let keys: string[] = [];
        let valid = false;
        switch (entry.kind) {
          case "transmitter-unit": keys = ["transmitterId", "unit", "condition"]; valid = txIds.includes(entry.transmitterId) && ["msg", "syn", "cma", "smaUsb", "smaLsb", "dcdc", "fan"].includes(entry.unit) && conditions.includes(entry.condition); break;
          case "monitor-hardware": keys = ["monitorId", "condition"]; valid = monIds.includes(entry.monitorId) && ["fault", "unplugged"].includes(entry.condition); break;
          case "monitor-parameter": keys = ["monitorId", "channelId", "parameter", "value"]; valid = monIds.includes(entry.monitorId) && channels.includes(entry.channelId) && parameters.includes(entry.parameter) && Number.isFinite(entry.value); break;
          case "pdc": keys = ["condition"]; valid = conditions.includes(entry.condition); break;
          case "antenna-vswr": keys = ["antenna", ...["usbVswr", "lsbVswr"].filter((key) => Object.hasOwn(f, key))]; valid = Number.isInteger(entry.antenna) && entry.antenna >= 1 && entry.antenna <= 48 && [entry.usbVswr, entry.lsbVswr].every((value) => value === undefined || (Number.isFinite(value) && value >= 1)); break;
          case "communication": keys = ["endpoint", "condition"]; valid = ["rcu", "lmi", "csp"].includes(entry.endpoint) && entry.condition === "fault"; break;
          case "environment": keys = ["sensor", "value"]; valid = entry.sensor === "temperature" ? typeof entry.value === "number" && Number.isFinite(entry.value) : ["smoke", "intrusion"].includes(entry.sensor) && typeof entry.value === "boolean"; break;
        }
        const expected = ["id", "kind", ...keys];
        if (!valid || typeof entry.id !== "string" || !entry.id.trim() || Object.keys(f).length !== expected.length || Object.keys(f).some((key) => !expected.includes(key))) invalid("Unsupported typed DVOR fault.");
      }
      const overrideKeys = d.runtime.measurementOverrides.map((item) => `${item.monitorId}:${item.channelId}:${item.parameter}`);
      if (new Set(overrideKeys).size !== overrideKeys.length) invalid("Duplicate native measurement overrides.");
      if (new Set(d.runtime.antennaVswr.map((entry) => entry.antenna)).size !== d.runtime.antennaVswr.length) invalid("Duplicate antenna overrides.");
      if (!["tx1", "tx2"].includes(d.runtime.mainTransmitterId) || (d.configuration.station.equipmentVersion === "single" && d.runtime.mainTransmitterId !== "tx1")) invalid("Main transmitter is unavailable.");
      if (d.runtime.batteryRemainingMinutes > d.configuration.battery.backupRuntimeMinutes) invalid("Battery runtime exceeds its native capacity.");
    }
    return structuredClone(definition) as Definition;
  } catch (error) {
    if (error instanceof AiScenarioError) throw error;
    return invalid("Invalid native scenario structure.");
  }
}

// Bounds are copied from domain/validation.ts and domain/scenario.ts.
// DVOR VSWR, ambient and battery bounds additionally use its native
// ui/simulation-parameters.tsx. Unbounded monitor bands/RF gains, forced
// measurements and DME spacing offsets are deliberately not catalogued.
function specs(moduleId: ScenarioParametersModuleId, definition: Definition): Spec[] {
  const list: Spec[] = [];
  const number = (id: string, min: number, max: number, unit: string, recovery = true, step?: number) => list.push({ id, label: id, group: id.startsWith("runtime") ? "startup" : "configuration", type: "number", min, max, unit, step, recovery });
  const bool = (id: string, recovery = false, group: Spec["group"] = "configuration") => list.push({ id, label: id, group, type: "boolean", recovery });
  const enumeration = (id: string, options: string[], recovery = false) => list.push({ id, label: id, group: id.startsWith("runtime") ? "startup" : "configuration", type: "enum", options, recovery });
  const fault = (entry: NonNullable<Spec["fault"]>) => list.push({ id: `runtime.faults.${entry.id}.enabled`, label: `Maintenance fault: ${entry.id}`, group: "fault", type: "boolean", recovery: true, fault: entry });
  const v = moduleId === "dvor-220";
  if (v) {
    for (const [key, min, max, unit] of [["frequencyMHz",108,117.95,"MHz"],["carrierPowerW",0,150,"W"],["am30HzPercent",0,40,"%"],["identModulationPercent",0,20,"%"],["voiceModulationPercent",0,40,"%"],["azimuthOffsetDeg",-40,40,"°"]] as const) number(`configuration.station.${key}`, min, max, unit, key !== "frequencyMHz", key === "frequencyMHz" ? 0.05 : undefined);
    enumeration("configuration.station.equipmentVersion", ["single", "dual"]);
    for (const tx of ["tx1", "tx2"] as const) {
      number(`configuration.transmitters.${tx}.carrierScalePercent`, 0, 100, "%");
      bool(`configuration.transmitters.${tx}.trackingEnabled`, true);
      for (const output of ["usbCos", "usbSin", "lsbCos", "lsbSin"]) number(`configuration.transmitters.${tx}.sidebandPowerW.${output}`, 0, 5, "W");
      for (const group of ["rfPhaseDeg", "standbyRfPhaseDeg"]) for (const key of ["usbCosToSin", "lsbCosToSin", "carrierToSideband"]) number(`configuration.transmitters.${tx}.${group}.${key}`, 0, 359.9, "°");
      enumeration(`configuration.thermal.${tx}.fanMode`, ["auto", "on", "off"], true);
      for (const key of ["fanStartC", "fanStopC"]) number(`configuration.thermal.${tx}.${key}`, -100, 200, "°C");
      for (const unit of ["cma", "usb", "lsb"]) {
        for (const key of ["shutdownC", "restartC"]) number(`configuration.thermal.${tx}.${key}.${unit}`, -100, 200, "°C", false);
        number(`runtime.temperaturesC.${tx}.${unit}`, -100, 200, "°C", false);
      }
      fault({ id: `scenario-${tx}-cma`, kind: "transmitter-unit", transmitterId: tx, unit: "cma", condition: "alarm" });
    }
    number("configuration.monitor.executiveAlarmDelayMs", 200, 51000, "ms", false);
    for (const key of ["postChangeoverHoldoffMs", "powerOnHoldoffMs", "identCodeAlarmDelayMs"]) number(`configuration.monitor.${key}`, 0, 100000, "ms", false);
    number("configuration.monitor.measurementAverageCount", 2, 10, "samples", false, 1);
    number("configuration.monitor.warningRangePercent", 0, 100, "%", false);
    for (const channel of ["cha", "chb1", "chb2", "standby"]) number(`configuration.monitor.channels.${channel}.referenceAzimuthDeg`, -40, 40, "°", false);
    for (const key of ["vswrUpperWarning", "vswrUpperAlarm"]) number(`configuration.transmitterLimits.${key}`, 1, 10, ":1", false);
    number("configuration.battery.cutoffVoltageV", 19, 24, "V", false);
    number("configuration.battery.chargingCurrentA", 10, 30, "A");
    number("runtime.batteryRemainingMinutes", 0, Math.min(1440, (definition as ReturnType<typeof createDefaultDvor220ScenarioDefinition>).configuration.battery.backupRuntimeMinutes), "min", false);
    number("runtime.environment.temperatureC", -50, 100, "°C", false);
    bool("runtime.environment.smoke", false, "sensor");
    bool("runtime.environment.intrusion", false, "sensor");
    enumeration("runtime.mainTransmitterId", ["tx1", "tx2"]);
    for (const mon of ["mon1", "mon2"] as const) fault({ id: `scenario-${mon}-hardware`, kind: "monitor-hardware", monitorId: mon, condition: "fault" });
    fault({ id: "scenario-pdc", kind: "pdc", condition: "alarm" });
    for (const endpoint of ["rcu", "lmi", "csp"] as const) fault({ id: `scenario-${endpoint}`, kind: "communication", endpoint, condition: "fault" });
  } else {
    for (const [key, min, max, unit, step] of [["powerOutputWatts",0,1250,"W",undefined],["delayOffsetUs",-15,35,"µs",undefined],["sensitivityDbm",-95,-60,"dBm",undefined],["minimumPulseRatePps",0,2700,"pp/s",1],["sdesDurationUs",0,34,"µs",undefined],["ldesDurationUs",0,350,"µs",undefined],["ldesThresholdDbm",-110,9,"dBm",undefined],["deadTimeUs",0,150,"µs",undefined]] as const) number(`configuration.station.${key}`, min, max, unit, true, step);
    number("configuration.station.channel.number", 1, 126, "channel", false, 1);
    enumeration("configuration.station.channel.suffix", ["X", "Y"]);
    for (const tx of ["tx1", "tx2"]) {
      number(`configuration.transmitters.${tx}.outputPowerPercent`, 0, 100, "%");
      number(`runtime.temperaturesC.${tx}`, -100, 200, "°C", false);
    }
    for (const key of ["fanStartC", "fanStopC", "txuShutdownC", "txuRestartC"]) number(`configuration.thermal.${key}`, -100, 200, "°C", !["txuShutdownC", "txuRestartC"].includes(key));
    enumeration("configuration.thermal.fanMode", ["auto", "on", "off"], true);
    number("configuration.monitor.monitorActionDelayMs", 200, 51000, "ms", false);
    for (const key of ["postChangeoverHoldoffMs", "powerOnHoldoffMs", "identFaultDelayMs", "selfTestHoldoffMs"]) number(`configuration.monitor.${key}`, 0, 100000, "ms", false);
    for (const [key, min, max, unit] of [["warningVoltage",0,30,"V"],["alarmVoltage",0,30,"V"],["cutoffVoltage",19,24,"V"],["fullyChargedVoltage",24,30,"V"],["warningTemperatureC",-128,127,"°C"],["alarmTemperatureC",-128,127,"°C"],["chargingCurrentLimitA",10,30,"A"],["simulatedDischargeVoltsPerHour",0,10,"V/h"],["simulatedChargeVoltsPerHour",0,10,"V/h"]] as const) number(`configuration.battery.${key}`, min, max, unit, false);
    for (const battery of ["battery1", "battery2"]) {
      bool(`runtime.batteries.${battery}.connected`, false, "startup");
      number(`runtime.batteries.${battery}.voltage`, 0, 30, "V", false);
      number(`runtime.batteries.${battery}.temperatureC`, -128, 127, "°C", false);
    }
    enumeration("runtime.mainTransponder", ["tx1", "tx2"]);
    number("runtime.environment.temperatureC", -100, 200, "°C", false);
    for (const key of ["present", "smokeDetected", "intrusionDetected"]) bool(`runtime.environment.${key}`, false, "sensor");
    for (const kind of Object.keys(DME320_FAULT_CATALOG) as Dme320FaultKind[]) for (const target of dme320ScenarioFaultTargets(kind)) fault({ id: `scenario-${kind}-${target}`, kind, target });
  }
  enumeration("configuration.station.standbyMode", ["hot", "cold"]);
  enumeration("configuration.monitor.votingLogic", ["AND", "OR"]);
  bool("configuration.station.transmitterOutputOnBoot");
  bool("configuration.station.bypassMonitorsOnBoot");
  bool("runtime.startMonitorBypassed", false, "startup");
  bool("runtime.acAvailable", false, "startup");
  for (const key of Object.keys(v ? createDefaultDvor220ScenarioDefinition().successCriteria : createDefaultDme320ScenarioDefinition().successCriteria)) bool(`successCriteria.${key}`, false, "success");
  return list;
}
function fieldValue(definition: Definition, spec: Spec): ParameterValue {
  if (!spec.fault) return read(definition, spec.id);
  return definition.runtime.faults.some((fault) => fault.id === spec.fault!.id);
}
function setValue(definition: Definition, spec: Spec, value: ParameterValue): void {
  if (!spec.fault) return write(definition, spec.id, value);
  const faults = definition.runtime.faults as Array<NonNullable<Spec["fault"]>>;
  const index = faults.findIndex((fault) => fault.id === spec.fault!.id);
  if (index !== -1) faults.splice(index, 1);
  if (value === true) faults.push(structuredClone(spec.fault));
}
function assignments(moduleId: ScenarioParametersModuleId, definition: Definition, changes: readonly ParameterAssignment[], recovery = false): Array<{ spec: Spec; value: ParameterValue }> {
  if (!Array.isArray(changes) || changes.length > 24) invalid("Assignments must be an array of at most 24 fields.");
  const catalog = new Map(specs(moduleId, definition).map((spec) => [spec.id, spec]));
  const seen = new Set<string>();
  return changes.map((change) => {
    safe(change);
    if (!change || Object.keys(change).some((key) => !["fieldId", "value"].includes(key))) invalid("Invalid assignment shape.");
    const spec = catalog.get(change.fieldId);
    if (!spec || seen.has(change.fieldId)) invalid(`Unknown or duplicate field: ${change.fieldId}`);
    seen.add(change.fieldId);
    const value = change.value;
    if ((spec.type === "number" && (typeof value !== "number" || !Number.isFinite(value) || value < spec.min! || value > spec.max! || (spec.step === 1 && !Number.isInteger(value)))) || (spec.type === "boolean" && typeof value !== "boolean") || (spec.type === "enum" && (typeof value !== "string" || !spec.options!.includes(value)))) invalid(`Invalid value for ${spec.id}`);
    if (spec.group === "success" && fieldValue(definition, spec) === true && value === false) invalid("Success criteria may not be weakened.");
    if (recovery && (!spec.recovery || (spec.fault && value !== false))) throw new AiScenarioError("INVALID_RECOVERY", `Unsupported learner recovery: ${spec.id}`);
    return { spec, value };
  });
}
export const mopiensParameterAdapter: ScenarioParameterAdapter = {
  fields(moduleId, definition) {
    const source = native(moduleId, definition);
    return specs(moduleId, source).map(({ fault: _fault, ...spec }) => ({ ...spec, value: fieldValue(source, { ...spec, fault: _fault }) }));
  },
  apply(moduleId, definition, changes) {
    const next = native(moduleId, definition);
    for (const { spec, value } of assignments(moduleId, next, changes)) setValue(next, spec, value);
    return native(moduleId, next);
  },
  verify(moduleId, definition, recovery) {
    const source = native(moduleId, definition);
    try {
      const requested = assignments(moduleId, source, recovery, true);
      if (requested.length === 0) throw new Error("Explicit learner recovery is required.");
      const target = structuredClone(source);
      for (const { spec, value } of requested) setValue(target, spec, value);
      native(moduleId, target);
      const notes = ["Detached native preview and command replay; simulator accounts only, no store or flash writes.", "Only explicitly requested configuration values or maintenance fault clears are applied.", "Unbounded monitor thresholds, RF gains, forced measurements and DME spacing offsets are unsupported."];
      if (moduleId === "dvor-220") {
        const d = source as ReturnType<typeof createDefaultDvor220ScenarioDefinition>;
        const desired = target as typeof d;
        let state = previewDvor220Scenario(d).device;
        const initial = evaluateDvor220Scenario(state);
        if (initial.solved || !initial.checks.some((check) => !check.passed)) throw new Error("Scenario must begin with a meaningful failed native check.");
        if (!initial.correctable) throw new Error(initial.blockers.join(" "));
        const run = (command: Dvor220Command) => {
          const result = reduceDvor220Command(state, command);
          if (!result.ok) throw new Error(result.error ?? "Native command rejected.");
          state = result.state;
        };
        const account = state.accounts.find((item) => item.level === 3);
        if (!account) throw new Error("Native level-3 simulator account unavailable.");
        run({ type: "connect", profile: { id: "ai-detached-local", name: "Detached local PMDT", description: "Native recovery verification", kind: "rs232", location: "local", timeoutMs: 5000 } });
        run({ type: "login", username: account.username, password: account.password });
        run({ type: "set-keylock", mode: "LOCAL" });
        run({ type: "set-monitor-bypass", bypass: true });
        if (requested.some(({ spec }) => spec.id.startsWith("configuration."))) {
          run({ type: "replace-draft", configuration: desired.configuration });
          run({ type: "apply-draft" });
        }
        for (const { spec } of requested.filter((item) => item.spec.fault)) {
          run({ type: "clear-fault", faultId: spec.fault!.id });
        }
        for (const { spec, value } of requested) {
          const effective = spec.fault ? state.faults.some((fault) => fault.id === spec.fault!.id) : read(state.configuration.running, spec.id.slice("configuration.".length));
          if (effective !== value) throw new Error(`Native recovery did not apply ${spec.id}.`);
        }
        run({ type: "set-monitor-bypass", bypass: d.runtime.startMonitorBypassed });
        state = advanceDvor220Time(state, Math.max(1000, d.configuration.monitor.measurementAverageCount * 100));
        const recovered = evaluateDvor220Scenario(state);
        if (!recovered.solved) throw new Error("Native DVOR evaluation remains unsolved after requested recovery.");
        return { mode: "native-action-replay", initial: [{ id: "initial-unsolved", passed: !initial.solved && initial.checks.some((check) => !check.passed), detail: initial.checks.map((check) => `${check.id}: ${check.passed ? "normal" : "failed"} (${check.detail})`).join("; ") }, { id: "initial-correctable", passed: initial.correctable, detail: "Native evaluation reports no forced-measurement blockers." }], recovered: [...recovered.checks, ...requested.map(({ spec, value }) => ({ id: spec.id, passed: true, detail: `Native command applied ${String(value)} ${spec.unit ?? ""}` }))], recoveryVerified: true, notes: [...notes, ...requested.slice(0, 6).map(({ spec, value }) => `${spec.id}: ${String(fieldValue(source, spec))} → ${String(value)} ${spec.unit ?? ""}`)] };
      }
      const d = source as ReturnType<typeof createDefaultDme320ScenarioDefinition>;
      const desired = target as typeof d;
      let state = previewDme320Scenario(d);
      const initial = evaluateDme320Scenario(state);
      if (initial.solved || !initial.checks.some((check) => !check.passed)) throw new Error("Scenario must begin with a meaningful failed native check.");
      if (!initial.correctable) throw new Error(initial.blockers.join(" "));
      const run = (command: Dme320Command) => {
        const result = executeDme320Command(state, command);
        if (!result.accepted) throw new Error(result.message);
        state = result.state;
      };
      const account = state.accounts.find((item) => item.level === 3);
      if (!account) throw new Error("Native level-3 simulator account unavailable.");
      run({ type: "login", userId: account.userId, password: account.password, origin: "local" });
      run({ type: "set-keylock", mode: "MAINT" });
      if (requested.some(({ spec }) => spec.id.startsWith("configuration."))) {
        run({ type: "set-draft-config", config: desired.configuration });
        run({ type: "apply-draft" });
      }
      for (const { spec } of requested.filter((item) => item.spec.fault)) run({ type: "clear-fault", faultId: spec.fault!.id });
      for (const { spec, value } of requested) {
        const effective = spec.fault ? state.faults.some((fault) => fault.id === spec.fault!.id && fault.active) : read(state.config.running, spec.id.slice("configuration.".length));
        if (effective !== value) throw new Error(`Native recovery did not apply ${spec.id}.`);
      }
      run({ type: "set-keylock", mode: "LOCAL" });
      for (const monitorId of ["mon1", "mon2"] as const) run({ type: "set-monitor-mode", monitorId, mode: d.runtime.startMonitorBypassed ? "bypass" : "auto" });
      const monitor = state.config.running.monitor;
      const settle = Math.max(1000, monitor.powerOnHoldoffMs, monitor.postChangeoverHoldoffMs, monitor.identFaultDelayMs, ...Object.values(monitor.limits).map((limit) => limit.alarmDelayMs));
      state = advanceDme320Simulation(state, state.nowMs + settle + monitor.monitorActionDelayMs);
      const recovered = evaluateDme320Scenario(state);
      if (!recovered.solved) throw new Error("Native DME evaluation remains unsolved after requested recovery.");
      return { mode: "native-action-replay", initial: [{ id: "initial-unsolved", passed: !initial.solved && initial.checks.some((check) => !check.passed), detail: initial.checks.map((check) => `${check.id}: ${check.passed ? "normal" : "failed"} (${check.detail})`).join("; ") }, { id: "initial-correctable", passed: initial.correctable, detail: "Native evaluation reports no forced-measurement blockers." }], recovered: [...recovered.checks, ...requested.map(({ spec, value }) => ({ id: spec.id, passed: true, detail: `Native command applied ${String(value)} ${spec.unit ?? ""}` }))], recoveryVerified: true, notes: [...notes, ...requested.slice(0, 6).map(({ spec, value }) => `${spec.id}: ${String(fieldValue(source, spec))} → ${String(value)} ${spec.unit ?? ""}`)] };
    } catch (error) {
      throw new AiScenarioError("INVALID_RECOVERY", error instanceof Error ? error.message : "Native recovery rejected.");
    }
  },
};
