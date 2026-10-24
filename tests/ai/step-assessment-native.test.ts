// @vitest-environment node
import { expect, it } from "vitest";
import { assessAttemptSteps } from "@/lib/ai/feedback/step-assessment";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { createDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { createDmePmdtStore } from "@/stores/dme-pmdt-store";
import { previewDme1119aScenario } from "@/lib/dme1119a/scenario";
import { previewDvor1150aScenario } from "@/lib/dvor1150a";
import { previewDvor1150Scenario } from "@/lib/dvor1150";
import { parseScenarioParameters } from "@/lib/scenario-parameters";
import { nativeBlueprintFixture } from "../helpers/native-blueprint";
import { compileScenarioBlueprint } from "@/lib/ai/scenario-blueprint/compiler";

it("reads full configuration field IDs against real native Apply evidence without changing source identifiers", () => {
  const blueprint = nativeBlueprintFixture("dvor-1150a");
  const definition = parseScenarioParameters("dvor-1150a", blueprint.definition)!;
  const preview = previewDvor1150aScenario(definition);
  const store = createVorPmdtStore();
  store.setState({ mode: "student", config: preview.config, configDraft: structuredClone(preview.config), derived: preview.snapshot, data: preview.snapshot.data,
    scenario: { active: true, definition, startedAt: null }, securityLevel: 3, loginDialogOpen: false });
  store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 70);
  expect(store.getState().applyConfigChanges()).toBe(true);
  const state = store.getState();
  const result = assessAttemptSteps("dvor-1150a", definition, { checkpoint: { config: state.config }, actionHistory: state.actionHistory, evidenceStats: state.evidenceStats }, blueprint.rubric);
  expect(result.correct).toBe(1);
  expect(result.unrelatedParameterChanges).toEqual([]);
  expect(blueprint.rubric.steps[0].alternatives[0][0]).toMatchObject({ fieldId: "configuration.transmitters.tx1.nominal.outputPower" });
});

// These sources are synthetic fixtures, not manufacturer manuals.
function compiledSelex(moduleId: "dvor-1150" | "dvor-1150a") {
  const quote = "TEST ONLY: inspect, apply the training output setting, then release bypass.";
  return compileScenarioBlueprint({ moduleId, description: "Training output recovery", mode: "documents" }, [
    { id: "synthetic", name: "Synthetic test source", sha256: "a".repeat(64), segments: [{ label: "Test section", text: quote }] },
  ], { status: "supported", moduleId, templateId: "carrier-9960", title: "Training output recovery", situation: "Simulated low output", cause: "Training setting",
    citations: [{ documentId: "synthetic", segmentLabel: "Test section", quote }],
    initial: [{ fieldId: "configuration.transmitters.tx1.nominal.outputPower", value: 37.4, citationIndexes: [0] }],
    recovery: [{ fieldId: "configuration.transmitters.tx1.nominal.outputPower", value: moduleId === "dvor-1150a" ? 70 : 125, citationIndexes: [0] }, { fieldId: "startPolicy.startMonitorBypassed", value: false, citationIndexes: [0] }],
    diagnosisCitationIndexes: [0],
  });
}

it("does not call distinct native Apply operations redundant in a compiled DVOR1150A procedure", () => {
  const blueprint = compiledSelex("dvor-1150a");
  const definition = parseScenarioParameters("dvor-1150a", blueprint.definition)!;
  const preview = previewDvor1150aScenario(definition);
  const store = createVorPmdtStore();
  store.setState({ mode: "student", config: preview.config, configDraft: structuredClone(preview.config), derived: preview.snapshot, data: preview.snapshot.data,
    scenario: { active: true, definition, startedAt: null }, securityLevel: 3, loginDialogOpen: false });
  for (const matcher of blueprint.rubric.steps.flatMap(step => step.alternatives[0])) {
    if (matcher.kind === "view") store.getState().openView("monitor-data", matcher.viewId as never, [], matcher.viewId);
  }
  store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 100);
  expect(store.getState().applyConfigChanges()).toBe(true);
  store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 70);
  expect(store.getState().applyConfigChanges()).toBe(true);
  store.getState().setConfigValue("simulation.integralMonitorBypass", false);
  const state = store.getState();
  const report = assessAttemptSteps("dvor-1150a", definition, { checkpoint: { config: state.config }, actionHistory: state.actionHistory,
    attemptEvents: state.attemptEvents, evidenceStats: state.evidenceStats }, blueprint.rubric);
  expect(report.correct).toBe(report.totalRequiredSteps);
  expect(report.steps.every(step => step.status === "correct")).toBe(true);
  expect(report.redundantActions).toEqual([]);
});

it("assesses a compiled DVOR1150 rubric from native legacy payload without inventing bypass procedure evidence", () => {
  const blueprint = compiledSelex("dvor-1150");
  const definition = parseScenarioParameters("dvor-1150", blueprint.definition)!;
  const preview = previewDvor1150Scenario(definition);
  const store = createDvor1150PmdtStore();
  store.setState({ mode: "student", config: preview.config, configDraft: structuredClone(preview.config), derived: preview.snapshot,
    scenario: { active: true, definition, startedAt: null }, securityLevel: 3, loginDialogOpen: false });
  for (const checkpoint of definition.diagnosis!.pmdtCheckpoints) store.getState().openView("monitor-data", checkpoint.viewId as never, [], checkpoint.label);
  store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 125);
  expect(store.getState().applyConfigChanges()).toBe(true);
  expect(store.getState().setMonitorBypass("mon1", false)).toBe(true);
  const state = store.getState();
  const result = assessAttemptSteps("dvor-1150", definition, {
    visitedViewIds: state.scenarioVisitedViewIds, acceptedActionControlIds: state.scenarioAcceptedActionControlIds,
    // Simulate a saved attempt missing only the newly instrumented bypass rows.
    parameterChangeLogs: state.parameterChangeLogs.filter(entry => entry.phase !== "command"),
    parameterEvidence: state.parameterEvidence, checkpoint: { config: state.config },
  }, blueprint.rubric);
  const configStep = blueprint.rubric.steps.find(step => step.alternatives.flat().some(m => m.kind === "parameter" && m.fieldId.startsWith("transmitters.")))!;
  const bypassStep = blueprint.rubric.steps.find(step => step.alternatives.flat().some(m => m.kind === "parameter" && m.fieldId === "simulation.integralMonitorBypass"))!;
  expect(result.steps.find(step => step.id === configStep.id)?.status).toBe("correct");
  expect(result.steps.find(step => step.id === bypassStep.id)).toMatchObject({ status: "unverified", resultEvidenceIds: ["state:simulation.integralMonitorBypass"] });
  expect(result.steps.filter(step => step.id !== bypassStep.id).every(step => step.status === "correct")).toBe(true);
});

it("matches every compiled DME1119A step against native visits, Apply and bypass commands", () => {
  const quote = "TEST ONLY: inspect readings, apply the delay correction, and release both monitor bypasses.";
  const blueprint = compileScenarioBlueprint({ moduleId: "dme-1119a", description: "Training delay correction", mode: "documents" }, [
    { id: "synthetic", name: "Synthetic test source", sha256: "a".repeat(64), segments: [{ label: "Test section", text: quote }] },
  ], { status: "supported", moduleId: "dme-1119a", templateId: "tx1-delay-drift", title: "Delay correction", situation: "Training delay", cause: "Training deviation",
    citations: [{ documentId: "synthetic", segmentLabel: "Test section", quote }],
    initial: [{ fieldId: "configuration.txConfigNominal.rtcParameters.replyDelayOffset", value: 0.17, citationIndexes: [0] }],
    recovery: [{ fieldId: "configuration.txConfigNominal.rtcParameters.replyDelayOffset", value: -0.6, citationIndexes: [0] },
      { fieldId: "startPolicy.integralMonitorBypassed", value: false, citationIndexes: [0] }, { fieldId: "startPolicy.standbyMonitorBypassed", value: false, citationIndexes: [0] }], diagnosisCitationIndexes: [0],
  });
  const definition = parseScenarioParameters("dme-1119a", blueprint.definition)!;
  const preview = previewDme1119aScenario(definition);
  const store = createDmePmdtStore();
  store.setState({ mode: "student", data: preview.data, configDraft: structuredClone(preview.data),
    scenario: { active: true, definition, startedAt: null }, securityLevel: 3, loginDialogOpen: false });
  for (const matcher of blueprint.rubric.steps.flatMap(step => step.alternatives[0])) {
    if (matcher.kind === "view") store.getState().openView("monitor-data", matcher.viewId as never, [], matcher.viewId);
  }
  store.getState().setParameterValue("txConfigNominal.rtcParameters.replyDelayOffset", -0.6);
  expect(store.getState().applyConfigChanges()).toBe(true);
  expect(store.getState().setMonitorBypass("integral", false)).toBe(true);
  expect(store.getState().setMonitorBypass("standby", false)).toBe(true);
  const state = store.getState();
  const result = assessAttemptSteps("dme-1119a", definition, { checkpoint: { data: state.data }, actionHistory: state.actionHistory,
    attemptEvents: state.attemptEvents, evidenceStats: state.evidenceStats }, blueprint.rubric);
  expect(result.totalRequiredSteps).toBeGreaterThan(0);
  expect(result.correct).toBe(result.totalRequiredSteps);
  expect(result.unrelatedParameterChanges).toEqual([]);
});

it("consumes the entire compiled ADS-B command chain including repeated menu inputs", () => {
  const quote = "TEST ONLY: inspect and configure end-to-end thresholds using the native terminal workflow.";
  const blueprint = compileScenarioBlueprint({ moduleId: "ads-b", description: "Training threshold correction", mode: "documents" }, [
    { id: "synthetic", name: "Synthetic test source", sha256: "a".repeat(64), segments: [{ label: "Test section", text: quote }] },
  ], { status: "supported", moduleId: "ads-b", templateId: "adsb-11-configure-e2e-thresholds", title: "Threshold correction", situation: "Training threshold", cause: "Training deviation",
    citations: [{ documentId: "synthetic", segmentLabel: "Test section", quote }],
    initial: [{ fieldId: "targetSensor.dataProfile.endToEnd.alertPower", value: 181, citationIndexes: [0] }],
    recovery: [{ fieldId: "targetSensor.dataProfile.endToEnd.alertPower", value: 170, citationIndexes: [0] },
      { fieldId: "targetSensor.dataProfile.endToEnd.failurePower", value: 145, citationIndexes: [0] }], diagnosisCitationIndexes: [0],
  });
  const definition = parseScenarioParameters("ads-b", blueprint.definition)!;
  const report = assessAttemptSteps("ads-b", definition, { allActions: definition.expectedActions }, blueprint.rubric);
  expect(report.totalRequiredSteps).toBe(definition.expectedActions.length);
  expect(report.correct).toBe(report.totalRequiredSteps);
  const ids = report.steps.flatMap(step => step.evidenceIds);
  expect(new Set(ids).size).toBe(ids.length);
});
