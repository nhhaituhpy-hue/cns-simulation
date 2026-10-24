import { describe, expect, it } from "vitest";
import { selexParameterAdapter as adapter } from "@/lib/ai/scenario-generation/parameter-selex";
import { createTemplateDefinition as rawTemplate } from "@/lib/ai/scenario-generation/capabilities";
import type { ScenarioParametersDefinitionFor } from "@/lib/scenario-parameters";
import { createDefaultDme1119aScenarioDefinition } from "@/lib/dme1119a/scenario";
import { parseScenarioParameters } from "@/lib/scenario-parameters";

function createTemplateDefinition<M extends "dvor-1150" | "dvor-1150a" | "dme-1119a">(moduleId: M, template: string): ScenarioParametersDefinitionFor<M> { return rawTemplate(moduleId, template) as ScenarioParametersDefinitionFor<M>; }

it("materializes a non-preset DVOR 1150 setting without changing the baseline contract", () => {
  const source = createTemplateDefinition("dvor-1150", "carrier-9960");
  const before = structuredClone(source);
  const fields = adapter.fields("dvor-1150", source);
  expect(fields.find(f => f.id === "configuration.transmitters.tx1.nominal.outputPower")).toMatchObject({ type: "number", min: 0, max: 250, unit: "Watts", recovery: true });
  const changed = adapter.apply("dvor-1150", source, [{ fieldId: "configuration.transmitters.tx1.nominal.outputPower", value: 37.4 }]) as typeof source;
  expect(changed.configuration).toMatchObject({ transmitters: { tx1: { nominal: { outputPower: 37.4 } } } });
  expect(parseScenarioParameters("dvor-1150", changed)).toEqual(changed);
  expect(source).toEqual(before);
  expect(changed.diagnosis).toEqual(source.diagnosis);
  expect(changed.studentEditableFieldIds).toEqual(source.studentEditableFieldIds);
  expect(changed.editPolicy).toEqual(source.editPolicy);
});

describe.each([
  ["dvor-1150", "carrier-9960", "transmitters.tx1.nominal.outputPower", 37.4, 125],
  ["dvor-1150a", "carrier-9960", "transmitters.tx1.nominal.outputPower", 13.7, 70],
  ["dme-1119a", "tx1-delay-drift", "txConfigNominal.rtcParameters.replyDelayOffset", 0.17, -0.6],
] as const)("%s concrete engine recovery", (moduleId, template, field, stimulus, correction) => {
  it("verifies initial native fault and recovery without modifying source configuration", () => {
    const original = createTemplateDefinition(moduleId, template);
    const changed = adapter.apply(moduleId, original, [{ fieldId: `configuration.${field}`, value: stimulus }]) as typeof original;
    const before = structuredClone(changed);
    expect(adapter.fields(moduleId, changed).find(f => f.id === `configuration.${field}`)?.value).toBe(stimulus);
    expect(parseScenarioParameters(moduleId, changed)).toEqual(changed);
    const bypass = moduleId === "dme-1119a" ? [
      { fieldId: "startPolicy.integralMonitorBypassed", value: false },
      { fieldId: "startPolicy.standbyMonitorBypassed", value: false },
    ] : [{ fieldId: "startPolicy.startMonitorBypassed", value: false }];
    const report = adapter.verify(moduleId, changed, [{ fieldId: `configuration.${field}`, value: correction }, ...bypass]);
    expect(report.mode).toBe("engine-recovery");
    expect(report.initial.some(c => !c.passed && !/bypass|pmdt|action|hardware/.test(c.id))).toBe(true);
    expect(report.recoveryVerified).toBe(true);
    expect(report.recovered.every(c => c.passed)).toBe(true);
    expect(changed).toEqual(before);
    if (changed.diagnosis) expect(report.notes.join(" " )).toMatch(/synthetic verification/i);
  });
});

function expectCode(run: () => unknown, code: string) { expect(run).toThrowError(expect.objectContaining({ name: "AiScenarioError", code })); }

describe("strict SELEX parameter boundary", () => {
  const source = () => createTemplateDefinition("dvor-1150a", "carrier-9960");
  it.each([
    ["configuration.not-real", 1], ["configuration.__proto__.polluted", true],
    ["configuration.constructor.prototype.polluted", true],
    ["configuration.transmitters.tx1.nominal.outputPower", Infinity],
    ["configuration.transmitters.tx1.nominal.outputPower", NaN],
    ["configuration.transmitters.tx1.nominal.outputPower", "12"],
    ["configuration.transmitters.tx1.nominal.outputPower", -1],
    ["configuration.transmitters.tx1.nominal.outputPower", 201],
    ["startPolicy.startLocal", "true"], ["startPolicy.mainTransmitterId", "tx3"],
    ["successCriteria.requireIntegralMonitorNormal", false], ["editPolicy.mode", "open"],
    ["configuration.securityAccounts.0.password", "changed"],
  ])("rejects %s = %s", (fieldId, value) => {
    expectCode(() => adapter.apply("dvor-1150a", source(), [{ fieldId, value }]), "INVALID_PARAMETERS");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it("rejects duplicate assignments atomically", () => {
    const d = source(); const before = structuredClone(d);
    expectCode(() => adapter.apply("dvor-1150a", d, [{ fieldId: "startPolicy.startLocal", value: true }, { fieldId: "startPolicy.startLocal", value: false }]), "INVALID_PARAMETERS");
    expect(d).toEqual(before);
  });
  it("rejects assignments with a non-plain prototype", () => {
    const assignment = Object.assign(Object.create({ injected: true }), { fieldId: "startPolicy.startLocal", value: true });
    expectCode(() => adapter.apply("dvor-1150a", source(), [assignment]), "INVALID_PARAMETERS");
  });
  it("does not turn source-supplied startup or success keys into allowed field IDs", () => {
    const d = source(); Object.assign(d.startPolicy, { inventedControl: true });
    expectCode(() => adapter.fields("dvor-1150a", d), "INVALID_PARAMETERS");
    const e = source(); Object.assign(e.successCriteria, { inventedCriterion: true });
    expectCode(() => adapter.fields("dvor-1150a", e), "INVALID_PARAMETERS");
  });
  it.each(["dvor-1150", "dvor-1150a", "dme-1119a"] as const)("rejects inconsistent startup Local/Bypass for %s", moduleId => {
    const d = createTemplateDefinition(moduleId, moduleId === "dme-1119a" ? "tx1-delay-drift" : "carrier-9960");
    expectCode(() => adapter.apply(moduleId, d, [{ fieldId: "startPolicy.startLocal", value: false }]), "INVALID_PARAMETERS");
  });
  it.each([
    ["dvor-1150", "configuration.monitor.alarmLimits.hz30Modulation.alarmLow"],
    ["dvor-1150a", "configuration.monitor.alarmLimits.hz30Modulation.alarmLow"],
    ["dme-1119a", "configuration.alarmLimits.0.alarmLow"],
  ] as const)("rejects reversed monitor limits for %s", (moduleId, fieldId) => {
    const d = createTemplateDefinition(moduleId, moduleId === "dme-1119a" ? "tx1-delay-drift" : "carrier-9960");
    expectCode(() => adapter.apply(moduleId, d, [{ fieldId, value: 10000 }]), "INVALID_PARAMETERS");
  });
  it.each(["dvor-1150", "dvor-1150a", "dme-1119a"] as const)("never offers monitor thresholds/security/raw stimuli as recovery for %s", moduleId => {
    const d = createTemplateDefinition(moduleId, moduleId === "dme-1119a" ? "tx1-delay-drift" : "carrier-9960");
    d.editPolicy = { mode: "open" };
    const fields = adapter.fields(moduleId, d);
    expect(fields.some(f => /security|password|smoke|intrusion/i.test(f.id))).toBe(false);
    expect(fields.filter(f => f.recovery).every(f => !/monitor\.|alarmLimits\.|faults\.|rawMeasurements|simulation\./.test(f.id))).toBe(true);
  });
});

describe("native recovery guards", () => {
  it("rejects an already-normal exercise with missing PMDT visits", () => {
    const d = createTemplateDefinition("dvor-1150", "carrier-9960");
    (d.configuration as { transmitters: { tx1: { nominal: { outputPower: number } } } }).transmitters.tx1.nominal.outputPower = 125;
    d.startPolicy = { mainTransmitterId: "tx1", startLocal: true, startMonitorBypassed: false };
    expectCode(() => adapter.verify("dvor-1150", d, []), "INVALID_RECOVERY");
  });
  it("does not count DME bypass alone as a meaningful initial fault", () => {
    const d = createDefaultDme1119aScenarioDefinition();
    d.startPolicy.integralMonitorBypassed = true;
    d.startPolicy.standbyMonitorBypassed = true;
    expectCode(() => adapter.verify("dme-1119a", d, [
      { fieldId: "startPolicy.integralMonitorBypassed", value: false },
      { fieldId: "startPolicy.standbyMonitorBypassed", value: false },
    ]), "INVALID_RECOVERY");
  });
  it("rejects ineffective recovery instead of reporting success", () => {
    const d = createTemplateDefinition("dvor-1150a", "carrier-9960");
    expectCode(() => adapter.verify("dvor-1150a", d, [{ fieldId: "configuration.transmitters.tx1.nominal.outputPower", value: 13.7 }]), "INVALID_RECOVERY");
  });
  it("rejects recovery excluded by the effective restricted policy", () => {
    const d = createTemplateDefinition("dvor-1150a", "carrier-9960");
    d.editPolicy = { mode: "restricted", allowedFieldIds: [] };
    expectCode(() => adapter.verify("dvor-1150a", d, [{ fieldId: "configuration.transmitters.tx1.nominal.outputPower", value: 125 }]), "INVALID_RECOVERY");
  });
  it("uses native Local guard rather than editing the recovery baseline", () => {
    const d = createTemplateDefinition("dvor-1150a", "carrier-9960");
    d.startPolicy = { mainTransmitterId: "tx1", startLocal: false, startMonitorBypassed: false };
    expectCode(() => adapter.verify("dvor-1150a", d, [{ fieldId: "configuration.transmitters.tx1.nominal.outputPower", value: 125 }]), "INVALID_RECOVERY");
  });
  it("does not enable Monitor Bypass before Local in the recovery sequence", () => {
    const d = createTemplateDefinition("dvor-1150a", "carrier-9960");
    d.startPolicy = { mainTransmitterId: "tx1", startLocal: false, startMonitorBypassed: false };
    expectCode(() => adapter.verify("dvor-1150a", d, [{ fieldId: "startPolicy.startMonitorBypassed", value: true }]), "INVALID_RECOVERY");
  });
  it("rejects monitor-threshold score gaming even under Open", () => {
    const d = createTemplateDefinition("dvor-1150a", "carrier-9960"); d.editPolicy = { mode: "open" };
    expectCode(() => adapter.verify("dvor-1150a", d, [{ fieldId: "configuration.monitor.alarmLimits.txPower.alarmLow", value: 0 }]), "INVALID_RECOVERY");
  });
  it("returns honest native-diagnosis verification for an unchanged LRU template", () => {
    const d = createTemplateDefinition("dvor-1150a", "audio-generator-tx1");
    const report = adapter.verify("dvor-1150a", d, []);
    expect(report.mode).toBe("native-diagnosis");
    expect(report.recoveryVerified).toBe(true);
    expect(report.recovered.some(c => !c.passed)).toBe(true);
    expect(report.notes.join(" " )).toMatch(/does not.*demonstrate operational normality/i);
  });
  it("rejects a changed stimulus paired with a fixed hardware diagnosis", () => {
    const d = createTemplateDefinition("dvor-1150a", "audio-generator-tx1");
    (d.configuration as { transmitters: { tx1: { nominal: { outputPower: number } } } }).transmitters.tx1.nominal.outputPower = 13.7;
    expectCode(() => adapter.verify("dvor-1150a", d, []), "INVALID_RECOVERY");
  });
});

describe("additional native acceptance evidence", () => {
  it.each([
    ["dvor-1150", "carrier-9960"],
    ["dvor-1150a", "carrier-9960"],
    ["dme-1119a", "tx1-delay-drift"],
  ] as const)("round-trips concrete configuration and main-start selection for %s", (moduleId, template) => {
    const d = createTemplateDefinition(moduleId, template);
    const changed = adapter.apply(moduleId, d, [{ fieldId: "startPolicy.mainTransmitterId", value: "tx2" }]) as typeof d;
    expect(changed.startPolicy.mainTransmitterId).toBe("tx2");
    expect(changed.configuration).toEqual(d.configuration);
    expect(changed.diagnosis).toEqual(d.diagnosis);
    expect(parseScenarioParameters(moduleId, changed)).toEqual(changed);
  });
  it("rejects an unrecoverable AC fault in a software exercise", () => {
    const d = createTemplateDefinition("dme-1119a", "tx1-delay-drift");
    d.faultInjections = [{ id: "ac", kind: "ac-power", failed: true }];
    d.successCriteria = [{ id: "ac-normal", kind: "ac-power-normal" }];
    expectCode(() => adapter.verify("dme-1119a", d, []), "INVALID_RECOVERY");
  });
  it.each([
    ["dvor-1150", "no-lower-sideband-output"],
    ["dme-1119a", "bcps-1-lru"],
  ] as const)("does not confuse LRU diagnosis with operational recovery for %s", (moduleId, template) => {
    const report = adapter.verify(moduleId, createTemplateDefinition(moduleId, template), []);
    expect(report.mode).toBe("native-diagnosis");
    expect(report.recovered.some(c => !c.passed)).toBe(true);
  });
});

it("catalog metadata is copied from native module definitions without invented bounds", () => {
  const d = createTemplateDefinition("dme-1119a", "tx1-delay-drift");
  const fields = adapter.fields("dme-1119a", d);
  expect(fields.find(f => f.id === "configuration.txConfigNominal.rtcParameters.replyDelayOffset")).toMatchObject({ type: "number", min: -100, max: 100, unit: "us", recovery: true });
  expect(fields.find(f => f.id === "configuration.rmsConfigStation.channelType")).toMatchObject({ type: "enum", options: ["X", "Y"], recovery: false });
  expect(fields.find(f => f.id === "configuration.alarmLimits.0.alarmLow")?.min).toBeUndefined();
  expect(fields.some(f => f.id === "configuration.channelAllocation.receiverFrequencyMHz")).toBe(false);
  expect(fields.find(f => f.id === "startPolicy.identMode")?.recovery).toBe(false);
});
