import { describe, expect, it } from "vitest";
import { createDefaultDvor1150aScenarioDefinition, dvor1150aConfigurationViewId, evaluateDvor1150aScenario, parseDvor1150aScenarioDefinition, previewDvor1150aScenario } from "@/lib/dvor1150a/scenario";
import { dvorConfigFieldCatalog, getDvorConfigValue, setDvorConfigValue } from "@/lib/dvor1150a/config-utils";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import type { Dvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";


type Target = { fieldId: string; value: string | number | boolean | null };
function targeted(targets: Target[]) {
  const definition = createDefaultDvor1150aScenarioDefinition();
  Object.assign(definition.successCriteria, { configurationValues: targets });
  return definition;
}
function evaluate(definition: Dvor1150aScenarioDefinition, config = previewDvor1150aScenario(definition).config) {
  const preview = previewDvor1150aScenario({ ...definition, configuration: config });
  const store = createVorPmdtStore();
  expect(store.getState().startReviewScenario(definition)).toBe(true);
  return evaluateDvor1150aScenario(store.getState().scenario, preview.snapshot, config, { runId: store.getState().scenario.runId });
}

describe("DVOR1150A exact catalog configuration requirements", () => {
  it("round-trips a required timer value and stays unsolved when alarms already look normal", () => {
    const definition = targeted([{ fieldId: "monitor.timers.shutdown", value: 2 }]);
    const before = structuredClone(definition);
    expect(parseDvor1150aScenarioDefinition(JSON.parse(JSON.stringify(definition)))).toEqual(definition);
    const initial = evaluate(definition);
    expect(initial.solved).toBe(false);
    expect(initial.checks.find(c => c.id === "configuration-value-monitor.timers.shutdown")).toMatchObject({ passed: false });
    const repaired = setDvorConfigValue(previewDvor1150aScenario(definition).config, "monitor.timers.shutdown", 2);
    const recovered = evaluate(definition, repaired);
    expect(recovered.solved).toBe(true);
    expect(recovered.checks.find(c => c.id === "configuration-value-monitor.timers.shutdown")).toMatchObject({ passed: true });
    expect(definition).toEqual(before);
  });

  it("fails closed without applied configuration rather than inferring a target from derived readings", () => {
    const definition = targeted([{ fieldId: "monitor.timers.shutdown", value: 2 }]);
    const preview = previewDvor1150aScenario(definition);
    const report = evaluateDvor1150aScenario({ active: true, definition, startedAt: null }, preview.snapshot);
    expect(report.solved).toBe(false);
    expect(report.checks.find(c => c.id === "configuration-value-monitor.timers.shutdown")?.passed).toBe(false);
  });

  it.each([
    [{ fieldId: "monitor.timers.shutdown", value: "2" }],
    [{ fieldId: "monitor.timers.shutdown", value: null }],
    [{ fieldId: "monitor.timers.shutdown", value: -1 }],
    [{ fieldId: "monitor.timers.shutdown", value: Infinity }],
    [{ fieldId: "monitor.alarmLimits.rfLevel.alarmLow", value: -Number.MAX_VALUE }],
    [{ fieldId: "monitor.votingLogic", value: "XOR" }],
    [{ fieldId: "monitor.timers.invented", value: 1 }],
    [{ fieldId: "monitor.rawMeasurements.mon1.rfLevel", value: 0 }],
    [{ fieldId: "transmitters.tx1.faults.disabled", value: false }],
    [{ fieldId: "simulation.integralMonitorBypass", value: false }],
    [{ fieldId: "constructor.prototype.polluted", value: true }],
    [{ fieldId: "monitor.timers.shutdown", value: 2, tolerance: 999 }],
    [{ fieldId: "monitor.timers.shutdown", value: 2 }, { fieldId: "monitor.timers.shutdown", value: 3 }],
  ])("rejects invalid, unknown, protected or duplicate targets: %j", (...rows) => {
    expect(parseDvor1150aScenarioDefinition(targeted(rows as Target[]))).toBeNull();
  });

  it("does not grant recovery permission from a target and rejects unreachable restricted targets", () => {
    const definition = targeted([{ fieldId: "monitor.timers.shutdown", value: 2 }]);
    definition.editPolicy = { mode: "restricted", allowedFieldIds: [] };
    expect(parseDvor1150aScenarioDefinition(definition)).toBeNull();
  });

  it("rejects conflicting target values for the same shared nominal control and a locked mirror", () => {
    expect(parseDvor1150aScenarioDefinition(targeted([
      {fieldId:"transmitters.tx1.nominal.outputPower",value:75},
      {fieldId:"transmitters.tx2.nominal.outputPower",value:80},
    ]))).toBeNull();
    const locked=targeted([{fieldId:"transmitters.tx1.nominal.outputPower",value:75}]);
    locked.editPolicy={mode:"restricted",allowedFieldIds:["transmitters.tx1.nominal.outputPower"]};
    locked.studentEditableFieldIds=["transmitters.tx1.nominal.outputPower"];
    expect(parseDvor1150aScenarioDefinition(locked)).toBeNull();
  });

  it("rejects target combinations that violate native limit ordering without inventing new numeric bounds", () => {
    expect(parseDvor1150aScenarioDefinition(targeted([{ fieldId: "monitor.alarmLimits.rfLevel.alarmLow", value: 10 }]))).toBeNull();
    const valid = targeted([{ fieldId: "monitor.alarmLimits.rfLevel.alarmLow", value: -8 }]);
    expect(parseDvor1150aScenarioDefinition(valid)).toEqual(valid);
  });

  it("rejects unknown success keys instead of turning narrative metadata into a criterion", () => {
    const definition = createDefaultDvor1150aScenarioDefinition();
    Object.assign(definition.successCriteria, { inventedRequirement: true });
    expect(parseDvor1150aScenarioDefinition(definition)).toBeNull();
  });

  it("keeps publications with no configuration requirements byte-equivalent after parse", () => {
    const definition = createDefaultDvor1150aScenarioDefinition();
    const json = JSON.stringify(definition);
    expect(JSON.stringify(parseDvor1150aScenarioDefinition(JSON.parse(json)))).toBe(json);
    expect(evaluate(definition).solved).toBe(true);
  });

  it("reads immutable pre-extension publications without inserting new monitor branches", () => {
    const old=createDefaultDvor1150aScenarioDefinition();
    delete old.configuration.monitor.testGenerator;
    delete old.configuration.monitor.testGeneratorCalibration;
    delete old.configuration.monitor.standbyCalibration;
    const oldNominal=new Set(["azimuthIndex","outputPower","voiceModulation","identModulation","referenceModulation","sboRfLevel","mainIdentCode","standbyIdentCode","keyerMode"]);
    for(const tx of ["tx1","tx2"] as const)for(const key of Object.keys(old.configuration.transmitters[tx].nominal))if(!oldNominal.has(key))delete (old.configuration.transmitters[tx].nominal as unknown as Record<string,unknown>)[key];
    const json=JSON.stringify(old);
    expect(JSON.stringify(parseDvor1150aScenarioDefinition(JSON.parse(json)))).toBe(json);
    expect(evaluate(old).solved).toBe(true);
    expect(JSON.stringify(old)).toBe(json);
  });

  it("covers every detailed persisted monitor/TX catalog value with a genuine exact-value check", () => {
    const definition = createDefaultDvor1150aScenarioDefinition();
    const detailed = dvorConfigFieldCatalog.filter(f => /^monitor\.(alarmLimits|azimuthLimits|timers|antennas|calibration|testGeneratorCalibration|testGenerator|standbyCalibration|votingLogic|transfer|sidebandVswr|notchTolerance|integrity|routing)(\.|$)|^transmitters\.(tx1|tx2)\.(nominal|offsets)\./.test(f.id));
    expect(detailed.length).toBeGreaterThan(140);
    for (const field of detailed) {
      const value = getDvorConfigValue(definition.configuration, field.id);
      const source = targeted([{ fieldId: field.id, value }]);
      expect(parseDvor1150aScenarioDefinition(source), field.id).toEqual(source);
      expect(evaluate(source).checks.find(c => c.id === `configuration-value-${field.id}`), field.id).toMatchObject({ passed: true });
    }
  });

  it("maps every nonblank certification/setup calibration control to its real inspection screen", () => {
    for(const field of dvorConfigFieldCatalog.filter(f=>f.id.startsWith("monitor.testGeneratorCalibration."))) {
      expect(dvor1150aConfigurationViewId(field.id)).toBe(field.id.includes(".mon1.")?"monitor-1-offsets":"monitor-2-offsets");
    }
    for(const field of dvorConfigFieldCatalog.filter(f=>f.id.startsWith("monitor.testGenerator.")))expect(dvor1150aConfigurationViewId(field.id)).toBe("monitor-test-results");
  });
});
