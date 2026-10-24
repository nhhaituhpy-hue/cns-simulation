// @vitest-environment node
import { expect, it } from "vitest";
import { compileScenarioBlueprint } from "@/lib/ai/scenario-blueprint/compiler";
import { readParameterReview } from "@/lib/ai/scenario-generation/parameter-review";
import { dvorConfigFieldCatalog, getDvorConfigValue } from "@/lib/dvor1150a/config-utils";
import { createDvor1150aConfigurationExercise, type Dvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { selexParameterAdapter } from "@/lib/ai/scenario-generation/parameter-selex";
import { evaluateScenarioExamResult } from "@/lib/scenario-exams/evaluation";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";

const moduleId = "dvor-1150a" as const;
const quote = "SYNTHETIC TEST ONLY: Configure the examiner's exact common nominal settings and timers, Apply and release bypass.";
const input = { moduleId, description: quote, mode: "documents" as const };
const documents = [{ id: "test", name: "DVOR1150A synthetic source", sha256: "a".repeat(64), segments: [{ label: "Test", text: quote }] }];
const row = (fieldId: string, value: string | boolean | number) => ({ fieldId, value, citationIndexes: [0] });
function proposal() {
  return { status: "supported", moduleId, templateId: "configuration-values", title: "Exact settings", situation: quote, cause: "Examiner's training values",
    citations: [{ documentId: "test", segmentLabel: "Test", quote }], initial: [row("configuration.monitor.timers.shutdown", 3)],
    recovery: [row("configuration.monitor.timers.shutdown", 2), row("startPolicy.startMonitorBypassed", false)], diagnosisCitationIndexes: [0] };
}

it.each(["keyerInputLevel", "windowedKeyingInput", "selfKeyOnLoss", "shutdownOnLoss", "restartWhenResumed"])("does not certify setter-only recovery of a disabled native keyer input: %s", key => {
  const p = proposal();
  const base = createDvor1150aConfigurationExercise();
  const id = `configuration.transmitters.tx1.nominal.${key}`;
  const old = getDvorConfigValue(base.configuration, id.slice(14));
  p.recovery.splice(1, 0, row(id, typeof old === "boolean" ? !old : "Active High/Open"));
  expect(() => compileScenarioBlueprint(input, documents, p)).toThrow(/keyer|reachable|native/i);
});

it("compiles shared Antenna 2 with cited mirrored targets and real native replay", () => {
  const p = proposal();
  p.initial = [row("configuration.monitor.antennas.mon1.secondAntennaEnabled", true)];
  p.recovery = [row("configuration.monitor.antennas.mon1.secondAntennaEnabled", false), row("startPolicy.startMonitorBypassed", false)];
  const blueprint = compileScenarioBlueprint(input, documents, p);
  const d = blueprint.definition as Dvor1150aScenarioDefinition;
  expect(d.successCriteria.configurationValues).toEqual(["mon1", "mon2"].map(mon => ({ fieldId: `monitor.antennas.${mon}.secondAntennaEnabled`, value: false })));
  expect(blueprint.verification.recoveryVerified).toBe(true);
  for (const mon of ["mon1", "mon2"]) expect(blueprint.rubric.steps.some(step => step.alternatives.flat().some(m => m.kind === "parameter" && m.fieldId.endsWith(`monitor.antennas.${mon}.secondAntennaEnabled`)))).toBe(true);
});

it("accepts an already reachable native keyer input without granting a hidden prerequisite", () => {
  const source = createDvor1150aConfigurationExercise();
  for (const tx of ["tx1", "tx2"] as const) source.configuration.transmitters[tx].nominal.keyerMode = "external";
  source.successCriteria.configurationValues = [{ fieldId: "transmitters.tx1.nominal.selfKeyOnLoss", value: true }, { fieldId: "transmitters.tx2.nominal.selfKeyOnLoss", value: true }];
  source.taskTargets = source.successCriteria.configurationValues.map(({fieldId}) => ({ fieldId, requirement: "change-applied" }));
  source.editPolicy = { mode: "restricted", allowedFieldIds: source.successCriteria.configurationValues.map(t => t.fieldId) };
  expect(selexParameterAdapter.verify(moduleId, source, [row("configuration.transmitters.tx1.nominal.selfKeyOnLoss", true), row("startPolicy.startMonitorBypassed", false)]).recoveryVerified).toBe(true);
});

it("replays an explicit permitted external-mode prerequisite in the authored order only", () => {
  const source = createDvor1150aConfigurationExercise();
  source.successCriteria.configurationValues = ["tx1", "tx2"].flatMap(tx => [
    { fieldId: `transmitters.${tx}.nominal.keyerMode`, value: "external" },
    { fieldId: `transmitters.${tx}.nominal.selfKeyOnLoss`, value: true },
  ]);
  source.taskTargets = source.successCriteria.configurationValues.map(({fieldId}) => ({ fieldId, requirement: "change-applied" }));
  source.editPolicy = { mode: "restricted", allowedFieldIds: source.successCriteria.configurationValues.map(t => t.fieldId) };
  const mode = row("configuration.transmitters.tx1.nominal.keyerMode", "external");
  const loss = row("configuration.transmitters.tx1.nominal.selfKeyOnLoss", true);
  const release = row("startPolicy.startMonitorBypassed", false);
  expect(() => selexParameterAdapter.verify(moduleId, source, [loss, mode, release])).toThrow(/keyer/i);
  expect(selexParameterAdapter.verify(moduleId, source, [mode, loss, release]).recoveryVerified).toBe(true);
  source.editPolicy.allowedFieldIds = source.editPolicy.allowedFieldIds!.filter(id => !id.endsWith("keyerMode"));
  expect(() => selexParameterAdapter.verify(moduleId, source, [mode, loss, release])).toThrow();
});

function largeProposal(count: number) {
  const p = proposal(), base = createDvor1150aConfigurationExercise();
  const nominal = dvorConfigFieldCatalog.filter(f => f.id.startsWith("transmitters.tx1.nominal."));
  const recovered = nominal.map(field => row(`configuration.${field.id}`, getDvorConfigValue(base.configuration, field.id) as string | number | boolean));
  const extras = ["monitor.timers.shutdown", "monitor.timers.continuousIdent", "monitor.timers.noIdent", "monitor.calibration.mon1.rfLevelOffset", "monitor.calibration.mon2.rfLevelOffset", "monitor.standbyCalibration.mon1.txPowerOffset", "monitor.standbyCalibration.mon2.txPowerOffset"]
    .map(id => row(`configuration.${id}`, getDvorConfigValue(base.configuration, id) as number));
  p.initial = [row("configuration.transmitters.tx1.nominal.outputPower", 60)];
  p.recovery = [...recovered, ...extras].slice(0, count - 1).concat(row("startPolicy.startMonitorBypassed", false));
  return p;
}

it.each([17, 24])("keeps %s requested recovery assignments readable after shared Nominal expansion without weakening exact grading", count => {
  const p = largeProposal(count);
  expect(p.recovery).toHaveLength(count);
  const blueprint = compileScenarioBlueprint(input, documents, p);
  const definition = blueprint.definition as Dvor1150aScenarioDefinition;
  const targets = definition.successCriteria.configurationValues!;
  expect(targets.length).toBeGreaterThan(p.recovery.length - 1);
  expect(blueprint.verification.initial.length).toBeLessThanOrEqual(32);
  expect(blueprint.verification.recovered.length).toBeLessThanOrEqual(32);
  expect(readParameterReview({ version: 2, initial: p.initial, recovery: p.recovery, verification: blueprint.verification })).not.toBeNull();
  const store = createVorPmdtStore();
  expect(store.getState().startReviewScenario(definition)).toBe(true);
  expect(store.getState().login("SEC3", "THREE")).toBe(true);
  store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 70, ["transmitters.tx2.nominal.outputPower"]);
  expect(store.getState().applyConfigChanges()).toBe(true);
  store.getState().setConfigValue("simulation.integralMonitorBypass", false);
  const state = store.getState();
  const saved = { checkpoint: { config: structuredClone(state.config), scenarioId: state.scenario.scenarioId, scenarioRunId: state.scenario.runId, scenarioStartedAt: state.scenario.startedAt }, actionHistory: state.actionHistory, evidenceStats: state.evidenceStats };
  expect(evaluateScenarioExamResult(moduleId, definition, saved).solved).toBe(true);
  for (const target of targets) {
    const broken = structuredClone(saved);
    const parts = target.fieldId.split(".");
    let current = broken.checkpoint.config as unknown as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) current = current[part] as Record<string, unknown>;
    const field = dvorConfigFieldCatalog.find(f => f.id === target.fieldId)!;
    const wrong = typeof target.value === "boolean" ? !target.value : typeof target.value === "number" ? target.value + 0.1
      : field.options?.find(v => v !== target.value) ?? "ABC";
    current[parts.at(-1)!] = wrong;
    expect(evaluateScenarioExamResult(moduleId, definition, broken).solved, target.fieldId).not.toBe(true);
  }
});
