import { describe, expect, it } from "vitest";
import { parseScenarioParameters } from "@/lib/scenario-parameters";
import { mopiensParameterAdapter as adapter } from "@/lib/ai/scenario-generation/parameter-mopiens";
import { createDefaultDvor220ScenarioDefinition } from "@/modules/operations/dvor-220/domain/scenario";
import { createDefaultDme320ScenarioDefinition } from "@/modules/operations/dme-320/domain/scenario";
import type { ParameterAssignment } from "@/lib/ai/scenario-generation/parameter-types";

const cases = [
  { moduleId: "dvor-220" as const, create: createDefaultDvor220ScenarioDefinition, path: "configuration.transmitters.tx1.carrierScalePercent" },
  { moduleId: "dme-320" as const, create: createDefaultDme320ScenarioDefinition, path: "configuration.transmitters.tx1.outputPowerPercent" },
];
function errorCode(action: () => unknown, code = "INVALID_PARAMETERS") {
  expect(action).toThrowError(expect.objectContaining({ name: "AiScenarioError", code }));
}
describe("MOPIENS exact native parameter catalog", () => {
  it.each(cases)("applies non-preset numeric power to $moduleId without changing its source", ({ moduleId, create, path }) => {
    const base = create();
    const before = structuredClone(base);
    const fields = adapter.fields(moduleId, base);
    expect(fields.find((field) => field.id === path)).toMatchObject({ type: "number", unit: "%", min: 0, max: 100, recovery: true });
    const changed = adapter.apply(moduleId, base, [{ fieldId: path, value: 43.7 }]) as ReturnType<typeof create>;
    expect(changed.configuration.transmitters.tx1).toHaveProperty(path.split(".").at(-1)!, 43.7);
    expect(base).toEqual(before);
    expect(changed).not.toBe(base);
    expect(changed.configuration).not.toBe(base.configuration);
    expect(changed.runtime).toEqual(base.runtime);
    expect(parseScenarioParameters(moduleId, changed)).toEqual(changed);
    expect(new Set(fields.map((field) => field.id)).size).toBe(fields.length);
    expect(fields.some((field) => /^configuration\.(communication|system)|accounts|measurementOverrides/.test(field.id))).toBe(false);
    for (const field of fields.filter((item) => item.type === "number")) {
      expect(Number.isFinite(field.min)).toBe(true);
      expect(Number.isFinite(field.max)).toBe(true);
    }
  });
  it.each(cases)("rejects unknown, unsafe, duplicate and invalid values for $moduleId", ({ moduleId, create, path }) => {
    const base = create();
    const bad: ParameterAssignment[][] = [
      [{ fieldId: "configuration.unknown", value: 1 }],
      [{ fieldId: "configuration.__proto__.polluted", value: true }],
      [{ fieldId: path, value: 50 }, { fieldId: path, value: 60 }],
      ...[NaN, Infinity, -Infinity, -1, 101, "50", null, true].map((value) => [{ fieldId: path, value }]),
      [{ fieldId: "runtime.mainTransponder", value: "tx3" }],
    ];
    for (const changes of bad) errorCode(() => adapter.apply(moduleId, base, changes));
    const before = structuredClone(base);
    const thermalPath = moduleId === "dvor-220" ? "configuration.thermal.tx1.fanStopC" : "configuration.thermal.fanStopC";
    errorCode(() => adapter.apply(moduleId, base, [{ fieldId: thermalPath, value: 70 }]));
    expect(base).toEqual(before);
  });
  it.each(cases)("preserves native runtime and at least one success criterion for $moduleId", ({ moduleId, create }) => {
    const base = create();
    const main = moduleId === "dvor-220" ? "runtime.mainTransmitterId" : "runtime.mainTransponder";
    const changed = adapter.apply(moduleId, base, [
      { fieldId: main, value: "tx2" },
      { fieldId: "runtime.startMonitorBypassed", value: false },
      { fieldId: "runtime.acAvailable", value: false },
    ]) as ReturnType<typeof create>;
    expect(changed.runtime).toMatchObject({ [main.split(".").at(-1)!]: "tx2", startMonitorBypassed: false, acAvailable: false });
    errorCode(() => adapter.apply(moduleId, base, Object.keys(base.successCriteria).map((key) => ({ fieldId: `successCriteria.${key}`, value: false }))));
  });
});

describe("detached native MOPIENS recovery", () => {
  it.each(cases)("proves faulted start and effective learner correction for $moduleId", ({ moduleId, create, path }) => {
    const base = adapter.apply(moduleId, create(), [{ fieldId: path, value: 43.7 }]);
    const before = structuredClone(base);
    const result = adapter.verify(moduleId, base, [{ fieldId: path, value: 100 }]);
    expect(result.mode).toBe("native-action-replay");
    expect(result.initial.every((check) => check.passed)).toBe(true);
    expect(result.initial.length).toBeLessThanOrEqual(32);
    expect(result.recovered.length).toBeLessThanOrEqual(32);
    expect(result.initial).toContainEqual(expect.objectContaining({ id: "initial-unsolved", passed: true }));
    expect(result.recovered.length).toBeGreaterThan(0);
    expect(result.recovered.every((check) => check.passed)).toBe(true);
    expect(result.recoveryVerified).toBe(true);
    expect(base).toEqual(before);
    errorCode(() => adapter.verify(moduleId, base, [{ fieldId: path, value: 44.1 }]), "INVALID_RECOVERY");
    errorCode(() => adapter.verify(moduleId, base, [{ fieldId: "successCriteria.requireServiceNormal", value: false }]), "INVALID_RECOVERY");
    errorCode(() => adapter.verify(moduleId, create(), [{ fieldId: path, value: 100 }]), "INVALID_RECOVERY");
  });
  it.each(cases)("does not silently repair absent recovery or forced readings for $moduleId", ({ moduleId, create, path }) => {
    const base = adapter.apply(moduleId, create(), [{ fieldId: path, value: 43.7 }]);
    errorCode(() => adapter.verify(moduleId, base, []), "INVALID_RECOVERY");
    const forced = create();
    if (moduleId === "dvor-220") (forced as ReturnType<typeof createDefaultDvor220ScenarioDefinition>).runtime.measurementOverrides = [{ monitorId: "mon1", channelId: "cha", parameter: "am30Hz", value: 10 }];
    else (forced as ReturnType<typeof createDefaultDme320ScenarioDefinition>).runtime.measurementOverrides = [{ monitorId: "mon1", channel: "executive", parameter: "peakPowerWatts", value: 10 }];
    errorCode(() => adapter.verify(moduleId, forced, [{ fieldId: path, value: 100 }]), "INVALID_RECOVERY");
  });
  it.each(cases)("replays only explicit native maintenance fault clears for $moduleId", ({ moduleId, create }) => {
    const id = moduleId === "dvor-220" ? "runtime.faults.scenario-pdc.enabled" : "runtime.faults.scenario-hpa-low-output-tx1.enabled";
    const base = adapter.apply(moduleId, create(), [{ fieldId: id, value: true }]);
    expect(adapter.fields(moduleId, base).find((field) => field.id === id)).toMatchObject({ value: true, recovery: true, group: "fault" });
    expect(adapter.verify(moduleId, base, [{ fieldId: id, value: false }]).recoveryVerified).toBe(true);
    errorCode(() => adapter.verify(moduleId, base, [{ fieldId: id, value: true }]), "INVALID_RECOVERY");
    expect((base as ReturnType<typeof create>).runtime.faults).toHaveLength(1);
  });
});

describe("MOPIENS fail-closed boundaries", () => {
  it("rejects native frequency spacing, integer and thermal cross-field violations", () => {
    const base = createDefaultDvor220ScenarioDefinition();
    for (const [fieldId, value] of [["configuration.station.frequencyMHz", 113.01], ["configuration.monitor.measurementAverageCount", 2.5], ["configuration.thermal.tx1.restartC.cma", 96], ["configuration.transmitterLimits.vswrUpperWarning", 3]] as const) {
      errorCode(() => adapter.apply("dvor-220", base, [{ fieldId, value }]));
    }
    errorCode(() => adapter.apply("dvor-220", base, [{ fieldId: "configuration.station.equipmentVersion", value: "single" }, { fieldId: "runtime.mainTransmitterId", value: "tx2" }]));
  });
  it("rejects DME battery ordering and finite-but-unbounded runtime controls", () => {
    const base = createDefaultDme320ScenarioDefinition();
    errorCode(() => adapter.apply("dme-320", base, [{ fieldId: "configuration.battery.alarmVoltage", value: 29 }]));
    errorCode(() => adapter.apply("dme-320", base, [{ fieldId: "runtime.spacingOffsetsUs.tx1", value: 1 }]));
    errorCode(() => adapter.apply("dme-320", base, [{ fieldId: "runtime.measurementOverrides.0.value", value: 10 }]));
  });
  it.each(cases)("rejects malformed full native schemas and prototype-bearing input for $moduleId", ({ moduleId, create }) => {
    const base = create();
    const extra = structuredClone(base);
    Object.assign(extra.runtime, { unexpected: true });
    errorCode(() => adapter.apply(moduleId, extra, []));
    const poisoned = structuredClone(base);
    Object.setPrototypeOf(poisoned.runtime, { injected: true });
    errorCode(() => adapter.apply(moduleId, poisoned, []));
    const missing = structuredClone(base);
    delete (missing.runtime as unknown as Record<string, unknown>).acAvailable;
    errorCode(() => adapter.apply(moduleId, missing, []));
  });
  it("does not count DVOR initial stabilization or a bypass-hidden monitor fault as a meaningful fault", () => {
    const base = createDefaultDvor220ScenarioDefinition();
    base.configuration.monitor.measurementAverageCount = 10;
    errorCode(() => adapter.verify("dvor-220", base, [{ fieldId: "configuration.transmitters.tx1.carrierScalePercent", value: 100 }]), "INVALID_RECOVERY");
  });
  it("does not erase unrequested typed faults in a recovery", () => {
    const base = adapter.apply("dme-320", createDefaultDme320ScenarioDefinition(), [
      { fieldId: "runtime.faults.scenario-hpa-low-output-tx1.enabled", value: true },
      { fieldId: "runtime.faults.scenario-monitor-failure-mon1.enabled", value: true },
    ]);
    errorCode(() => adapter.verify("dme-320", base, [{ fieldId: "runtime.faults.scenario-hpa-low-output-tx1.enabled", value: false }]), "INVALID_RECOVERY");
  });
});

describe("native guard regressions", () => {
  it("proves DME320 35 to 100 with native local/bypass prerequisites", () => {
    const base = createDefaultDme320ScenarioDefinition();
    base.configuration.transmitters.tx1.outputPowerPercent = 35;
    base.runtime.startMonitorBypassed = false;
    base.configuration.monitor.powerOnHoldoffMs = 100000;
    expect(adapter.verify("dme-320", base, [{ fieldId: "configuration.transmitters.tx1.outputPowerPercent", value: 100 }]).recoveryVerified).toBe(true);
  });
  it.each(cases)("rejects extra definition keys and duplicate native fault IDs for $moduleId", ({ moduleId, create }) => {
    const base = create();
    Object.assign(base, { unsupported: 1 });
    errorCode(() => adapter.apply(moduleId, base, []));
    const duplicate = create();
    if (moduleId === "dvor-220") (duplicate as ReturnType<typeof createDefaultDvor220ScenarioDefinition>).runtime.faults = [{ id: "same", kind: "pdc", condition: "alarm" }, { id: "same", kind: "pdc", condition: "alarm" }];
    else (duplicate as ReturnType<typeof createDefaultDme320ScenarioDefinition>).runtime.faults = [{ id: "same", kind: "hpa-low-output", target: "tx1" }, { id: "same", kind: "hpa-low-output", target: "tx1" }];
    errorCode(() => adapter.apply(moduleId, duplicate, []));
  });
  it.each(cases)("never labels protective thresholds as learner recovery for $moduleId", ({ moduleId, create }) => {
    const fields = adapter.fields(moduleId, create());
    expect(fields.filter((field) => /shutdown|restart|warning|alarm|cutoff/i.test(field.id) && field.group !== "fault").every((field) => !field.recovery)).toBe(true);
  });
});

it("preserves nullable native DME limits and rejects malformed DVOR faults", () => {
  const base = createDefaultDme320ScenarioDefinition();
  base.configuration.monitor.limits.erpDb.warningHigh = null;
  base.configuration.monitor.limits.erpDb.alarmHigh = null;
  expect(adapter.apply("dme-320", base, [])).toEqual(base);
  const malformed = createDefaultDvor220ScenarioDefinition();
  malformed.runtime.faults = [{ id: "bad", kind: "monitor-hardware", monitorId: "mon9", condition: "fault" } as never];
  errorCode(() => adapter.apply("dvor-220", malformed, []));
});
it("never weakens a single enabled success criterion", () => {
  errorCode(() => adapter.apply("dvor-220", createDefaultDvor220ScenarioDefinition(), [{ fieldId: "successCriteria.requireServiceNormal", value: false }]));
});
