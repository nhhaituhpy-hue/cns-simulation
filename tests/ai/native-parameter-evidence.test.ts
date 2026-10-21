// @vitest-environment node
import { expect, it } from "vitest";
import { assessAttemptSteps } from "@/lib/ai/feedback/step-assessment";
import { compileScenarioBlueprint } from "@/lib/ai/scenario-blueprint/compiler";
import { parseScenarioParameters } from "@/lib/scenario-parameters";
import { createDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { previewDvor220Scenario } from "@/modules/operations/dvor-220/domain/scenario";
import { reduceDvor220Command } from "@/modules/operations/dvor-220/domain/commands";
import type { Dvor220Command } from "@/modules/operations/dvor-220/domain/types";
import { previewDme320Scenario, executeDme320Command } from "@/modules/operations/dme-320/domain/engine";
import type { Dme320Command } from "@/modules/operations/dme-320/domain/types";
import { createNativeParameterEvidence, recordNativeParameterChanges } from "@/lib/simulator-config/native-parameter-evidence";
import { MAX_PARAMETER_CHANGE_LOG_ROWS, parameterChangesFromHistory, prependParameterChangeLogEntries } from "@/lib/simulator-config/parameter-change";
import { action } from "./step-assessment-fixtures";

// These citations describe synthetic test exercises, not manufacturer manuals.
function compiled1150() {
  const quote = "TEST ONLY: inspect readings, apply the output correction, then release bypass.";
  return compileScenarioBlueprint({ moduleId: "dvor-1150", description: "Training recovery", mode: "documents" }, [
    { id: "test-source", name: "Synthetic test source", sha256: "a".repeat(64), segments: [{ label: "Test", text: quote }] },
  ], { status: "supported", moduleId: "dvor-1150", templateId: "carrier-9960", title: "Training recovery", situation: "Low output", cause: "Training setting",
    citations: [{ documentId: "test-source", segmentLabel: "Test", quote }],
    initial: [{ fieldId: "configuration.transmitters.tx1.nominal.outputPower", value: 37.4, citationIndexes: [0] }],
    recovery: [{ fieldId: "configuration.transmitters.tx1.nominal.outputPower", value: 125, citationIndexes: [0] },
      { fieldId: "startPolicy.startMonitorBypassed", value: false, citationIndexes: [0] }], diagnosisCitationIndexes: [0] });
}

function start1150() {
  const blueprint = compiled1150();
  const definition = parseScenarioParameters("dvor-1150", blueprint.definition)!;
  const store = createDvor1150PmdtStore({ now: () => new Date("2026-10-21T12:00:00Z") });
  expect(store.getState().initializeStudentScenario(definition)).toBe(true);
  expect(store.getState().login("SEC3", "THREE")).toBe(true); // Native simulator account only.
  for (const checkpoint of definition.diagnosis!.pmdtCheckpoints) {
    store.getState().openView("monitor-data", checkpoint.viewId, [], checkpoint.label);
  }
  return { blueprint, definition, store };
}

function payload1150(store: ReturnType<typeof createDvor1150PmdtStore>) {
  const state = store.getState();
  return { visitedViewIds: state.scenarioVisitedViewIds, acceptedActionControlIds: state.scenarioAcceptedActionControlIds,
    parameterChangeLogs: state.parameterChangeLogs, parameterEvidence: state.parameterEvidence,
    checkpoint: { config: state.config, configDraft: state.configDraft } };
}

function compiledMopiens(moduleId: "dvor-220" | "dme-320") {
  const quote = "TEST ONLY: apply each requested transmitter output correction.";
  const fieldId = moduleId === "dvor-220" ? "configuration.transmitters.tx1.carrierScalePercent" : "configuration.transmitters.tx1.outputPowerPercent";
  return compileScenarioBlueprint({ moduleId, description: "Training recovery", mode: "documents" }, [
    { id: "test-source", name: "Synthetic test source", sha256: "a".repeat(64), segments: [{ label: "Test", text: quote }] },
  ], { status: "supported", moduleId, templateId: moduleId === "dvor-220" ? "carrier-9960" : "low-power",
    title: "Training recovery", situation: "Low output", cause: "Training setting",
    citations: [{ documentId: "test-source", segmentLabel: "Test", quote }],
    initial: [{ fieldId, value: 43.7, citationIndexes: [0] }],
    recovery: [{ fieldId, value: 100, citationIndexes: [0] }, ...(moduleId === "dvor-220"
      ? ["usbCos", "usbSin", "lsbCos", "lsbSin"].map(key => ({ fieldId: `configuration.transmitters.tx1.sidebandPowerW.${key}`, value: 1, citationIndexes: [0] })) : [])],
    diagnosisCitationIndexes: [0] });
}

function start220(blueprint = compiledMopiens("dvor-220")) {
  const definition = parseScenarioParameters("dvor-220", blueprint.definition)!;
  let device = previewDvor220Scenario(definition).device;
  const run = (command: Dvor220Command) => {
    const result = reduceDvor220Command(device, command);
    expect(result.ok, result.error).toBe(true);
    device = result.state;
    return device;
  };
  run({ type: "connect", profile: { id: "test-local", name: "Test PMDT", description: "Synthetic test", kind: "rs232", location: "local", timeoutMs: 5000 } });
  const account = device.accounts.find(item => item.level === 3)!;
  run({ type: "login", username: account.username, password: account.password });
  run({ type: "set-keylock", mode: "LOCAL" });
  run({ type: "set-monitor-bypass", bypass: true });
  const draft = structuredClone(device.configuration.running);
  draft.transmitters.tx1.carrierScalePercent = 100;
  for (const key of ["usbCos", "usbSin", "lsbCos", "lsbSin"] as const) draft.transmitters.tx1.sidebandPowerW[key] = 1;
  run({ type: "replace-draft", configuration: draft });
  return { blueprint, definition, run, state: () => device };
}

function start320() {
  const blueprint = compiledMopiens("dme-320");
  const definition = parseScenarioParameters("dme-320", blueprint.definition)!;
  let simulation = previewDme320Scenario(definition);
  const run = (command: Dme320Command) => {
    const result = executeDme320Command(simulation, command);
    expect(result.accepted, result.message).toBe(true);
    simulation = result.state;
    return simulation;
  };
  const account = simulation.accounts.find(item => item.level === 3)!;
  run({ type: "login", userId: account.userId, password: account.password, origin: "local" });
  run({ type: "set-keylock", mode: "MAINT" });
  const draft = structuredClone(simulation.config.running);
  draft.transmitters.tx1.outputPowerPercent = 100;
  run({ type: "set-draft-config", config: draft });
  return { blueprint, definition, run, state: () => simulation };
}

it("counts every compiled DME320 correction only after the real engine accepts Apply", () => {
  const { blueprint, definition, run, state } = start320();
  expect(assessAttemptSteps("dme-320", definition, { simulation: state() }, blueprint.rubric).correct).toBe(0);
  expect(state().parameterChangeLogs).toEqual([]);
  run({ type: "apply-draft" });
  const payload = JSON.parse(JSON.stringify({ simulation: state() }));
  const report = assessAttemptSteps("dme-320", definition, payload, blueprint.rubric);
  expect(report.totalRequiredSteps).toBeGreaterThan(0);
  expect(report.correct).toBe(report.totalRequiredSteps);
  expect(report.steps.every(step => step.status === "correct")).toBe(true);
  expect(payload.simulation.parameterChangeLogs).toEqual(expect.arrayContaining([
    expect.objectContaining({ nativeFieldId: "transmitters.tx1.outputPowerPercent", before: 43.7, after: 100, phase: "apply", sequence: 1 }),
  ]));
});

it("counts every compiled DVOR220 correction only after the real engine accepts Apply", () => {
  const { blueprint, definition, run, state } = start220();
  expect(assessAttemptSteps("dvor-220", definition, { device: state() }, blueprint.rubric).correct).toBe(0);
  expect(state().history.parameterChanges).toEqual([]);
  run({ type: "apply-draft" });
  const payload = JSON.parse(JSON.stringify({ device: state() }));
  const report = assessAttemptSteps("dvor-220", definition, payload, blueprint.rubric);
  expect(report.totalRequiredSteps).toBeGreaterThan(0);
  expect(report.correct).toBe(report.totalRequiredSteps);
  expect(report.steps.every(step => step.status === "correct")).toBe(true);
  expect(payload.device.history.parameterChanges).toEqual(expect.arrayContaining([
    expect.objectContaining({ nativeFieldId: "transmitters.tx1.carrierScalePercent", before: 43.7, after: 100, phase: "apply", sequence: 1 }),
  ]));
});

it("counts compiled DVOR220 corrections from accepted native Helper Apply, not draft or state alone", () => {
  const { blueprint, definition, run, state } = start220();
  const field = "transmitters.tx1.carrierScalePercent";
  const settings = structuredClone(state().configuration.draft.transmitters.tx1);
  expect(state().parameterEvidence?.lastSequence).toBe(0);
  expect(assessAttemptSteps("dvor-220", definition, { device: state() }, blueprint.rubric).correct).toBe(0);
  const stateOnly = structuredClone(state());
  stateOnly.configuration.running.transmitters.tx1 = structuredClone(settings);
  expect(assessAttemptSteps("dvor-220", definition, { device: stateOnly }, blueprint.rubric).correct).toBe(0);
  run({ type: "apply-transmitter-helper", transmitterIds: ["tx1"], settings });
  const device = JSON.parse(JSON.stringify(state()));
  expect(device.parameterEvidence.lastSequence).toBe(1);
  expect(device.history.parameterChanges).toEqual(expect.arrayContaining([
    expect.objectContaining({ nativeFieldId: field, before: 43.7, after: 100,
      controlId: "apply-transmitter-helper", phase: "apply", sequence: 1,
      evidenceRunId: device.parameterEvidence.runId, moduleId: "dvor-220", scenarioId: definition.id }),
  ]));
  const report = assessAttemptSteps("dvor-220", definition, { device }, blueprint.rubric);
  expect(report.correct).toBe(5);
  expect(report.totalRequiredSteps).toBe(5);
  expect(device.history.parameterChanges.filter((row: { nativeFieldId?: string }) => row.nativeFieldId)
    .every((row: { origin?: string }) => row.origin === "student")).toBe(true);
  const tampered = structuredClone(device);
  for (const row of tampered.history.parameterChanges) row.controlId = "save-transmitter-helper";
  expect(assessAttemptSteps("dvor-220", definition, { device: tampered }, blueprint.rubric).correct).toBe(0);
});

function tracking220(includeSidebandRecovery = false) {
  // Extend the compiled fixture with native tracking; the assessment must keep
  // effective tracking outcomes separate from the learner's authored inputs.
  const blueprint = compiledMopiens("dvor-220");
  const definition = parseScenarioParameters("dvor-220", blueprint.definition)!;
  definition.configuration.transmitters.tx1.carrierScalePercent = 40;
  definition.configuration.transmitters.tx1.trackingEnabled = true;
  definition.configuration.transmitters.tx1.sidebandPowerW = { usbCos: 1, usbSin: 1, lsbCos: 1, lsbSin: 1 };
  blueprint.definition = definition;
  blueprint.rubric.steps = blueprint.rubric.steps.filter(step => includeSidebandRecovery
    || !step.alternatives.flat().some(matcher => matcher.kind === "parameter" && matcher.fieldId.includes("sidebandPowerW")));
  blueprint.rubric.parameterRelevance = blueprint.rubric.parameterRelevance.filter(field => includeSidebandRecovery || !field.fieldId.includes("sidebandPowerW"));
  for (const step of blueprint.rubric.steps) for (const matcher of step.alternatives.flat()) {
    if (matcher.kind === "parameter" && matcher.fieldId.includes("sidebandPowerW")) matcher.value = 2.5;
  }
  return blueprint;
}

it("does not attribute tracking-derived sidebands to the learner's carrier-only Apply", () => {
  const { blueprint, definition, run, state } = start220(tracking220());
  run({ type: "apply-draft" });
  const device = JSON.parse(JSON.stringify(state()));
  const report = assessAttemptSteps("dvor-220", definition, { device }, blueprint.rubric);
  expect(report.correct).toBe(report.totalRequiredSteps);
  expect(report.unrelatedParameterChanges).toEqual([]);
  expect(device.history.parameterChanges).toEqual(expect.arrayContaining([
    expect.objectContaining({ nativeFieldId: "transmitters.tx1.carrierScalePercent", before: 40, after: 100, origin: "student" }),
    ...["usbCos", "usbSin", "lsbCos", "lsbSin"].map(key => expect.objectContaining({
      nativeFieldId: `transmitters.tx1.sidebandPowerW.${key}`, before: 1, after: 2.5, origin: "native-derived" })),
  ]));
});

it("uses tracking-derived effective values as recovery proof without pretending they were manual edits", () => {
  const { blueprint, definition, run, state } = start220(tracking220(true));
  run({ type: "apply-draft" });
  const report = assessAttemptSteps("dvor-220", definition, { device: state() }, blueprint.rubric);
  expect(report.totalRequiredSteps).toBe(5);
  expect(report.correct).toBe(5);
  expect(report.unrelatedParameterChanges).toEqual([]);
  const historical = structuredClone(state());
  for (const row of historical.history.parameterChanges) {
    delete row.nativeFieldId;
    delete row.before;
    delete row.after;
  }
  expect(assessAttemptSteps("dvor-220", definition, { device: historical }, blueprint.rubric).correct).toBe(0);
});

it.each(["same-apply", "before-tracking", "after-tracking", "helper"] as const)
("retains a genuine unrelated manual sideband change: %s", kind => {
  const { blueprint, definition, run, state } = start220(tracking220());
  if (kind === "helper") {
    run({ type: "apply-transmitter-helper", transmitterIds: ["tx1"], settings: {
      carrierScalePercent: 100, trackingEnabled: true,
      sidebandPowerW: { usbCos: 3, usbSin: 1, lsbCos: 1, lsbSin: 1 },
    } });
  } else {
    let draft = structuredClone(state().configuration.running);
    if (kind === "before-tracking") {
      draft.transmitters.tx1.sidebandPowerW.usbCos = 1.2;
      run({ type: "replace-draft", configuration: draft });
      run({ type: "apply-draft" });
      draft = structuredClone(state().configuration.running);
    }
    draft.transmitters.tx1.carrierScalePercent = 100;
    if (kind === "same-apply") draft.transmitters.tx1.sidebandPowerW.usbCos = 1.2;
    run({ type: "replace-draft", configuration: draft });
    run({ type: "apply-draft" });
    if (kind === "after-tracking") {
      draft = structuredClone(state().configuration.running);
      draft.transmitters.tx1.sidebandPowerW.usbCos = 3;
      run({ type: "replace-draft", configuration: draft });
      run({ type: "apply-draft" });
    }
  }
  const report = assessAttemptSteps("dvor-220", definition, { device: state() }, blueprint.rubric);
  expect(report.correct).toBe(report.totalRequiredSteps);
  expect(report.unrelatedParameterChanges).toEqual([
    expect.objectContaining({ fieldId: "transmitters.tx1.sidebandPowerW.usbCos", before: 1, after: 3 }),
  ]);
  expect(state().history.parameterChanges).toEqual(expect.arrayContaining([
    expect.objectContaining({ nativeFieldId: "transmitters.tx1.sidebandPowerW.usbCos", origin: "student" }),
  ]));
});

it.each(["missing-origin", "wrong-run", "missing-before", "wrong-control", "unknown-origin"] as const)
("never suppresses sideband review using insufficient derived proof: %s", kind => {
  const { blueprint, definition, run, state } = start220(tracking220());
  run({ type: "apply-draft" });
  const device = JSON.parse(JSON.stringify(state()));
  for (const row of device.history.parameterChanges) if (row.nativeFieldId?.includes("sidebandPowerW")) {
    if (kind === "missing-origin") delete row.origin;
    if (kind === "wrong-run") row.evidenceRunId = "another-run";
    if (kind === "missing-before") delete row.before;
    if (kind === "wrong-control") row.controlId = "patch-draft";
    if (kind === "unknown-origin") row.origin = "invented";
  }
  expect(assessAttemptSteps("dvor-220", definition, { device }, blueprint.rubric).unrelatedParameterChanges).toHaveLength(4);
});

it("does not hide a manual sideband edit in an unverified tail after an earlier derived change", () => {
  const { blueprint, definition, run, state } = start220(tracking220());
  run({ type: "apply-draft" });
  run({ type: "patch-draft", patch: { station: { stationName: "Intermediate" } } });
  run({ type: "apply-draft" });
  run({ type: "patch-draft", patch: { transmitters: { tx1: { sidebandPowerW: { usbCos: 3 } } } } });
  run({ type: "apply-draft" });
  run({ type: "patch-draft", patch: { transmitters: { tx1: { sidebandPowerW: { usbCos: 2.5 } } } } });
  run({ type: "apply-draft" });
  const device = structuredClone(state());
  device.history.parameterChanges = device.history.parameterChanges.filter(row => row.sequence !== 2);
  const report = assessAttemptSteps("dvor-220", definition, { device }, blueprint.rubric);
  expect(report.unrelatedParameterChanges).toEqual(expect.arrayContaining([
    expect.objectContaining({ fieldId: "transmitters.tx1.sidebandPowerW.usbCos" }),
  ]));
});

it.each(["permission", "validation", "empty-selection"] as const)
("does not emit Helper Apply proof after a native rejection: %s", kind => {
  const { run, state } = start220();
  const settings = structuredClone(state().configuration.draft.transmitters.tx1);
  if (kind === "permission") run({ type: "logout" });
  if (kind === "validation") settings.carrierScalePercent = 101;
  const result = reduceDvor220Command(state(), { type: "apply-transmitter-helper",
    transmitterIds: kind === "empty-selection" ? [] : ["tx1"], settings });
  expect(result.ok).toBe(false);
  expect(result.state.history.parameterChanges).toEqual([]);
  expect(result.state.parameterEvidence?.lastSequence).toBe(0);
  expect(result.state.configuration.running).toEqual(state().configuration.running);
});

it("does not advance native sequence for a no-op Helper Apply", () => {
  const { run, state } = start220();
  const settings = structuredClone(state().configuration.draft.transmitters.tx1);
  run({ type: "apply-transmitter-helper", transmitterIds: ["tx1"], settings });
  const previous = structuredClone(state());
  run({ type: "apply-transmitter-helper", transmitterIds: ["tx1"], settings });
  expect(state().parameterEvidence).toEqual(previous.parameterEvidence);
  expect(state().history.parameterChanges).toEqual(previous.history.parameterChanges);
});

it.each(["missing-first", "tampered-before", "wrong-final", "duplicate-sequence", "backwards-time", "wrong-run", "legacy-row"] as const)
("rejects broken DVOR220 Helper-to-Apply history chains: %s", kind => {
  const { blueprint, definition, run, state } = start220();
  const settings = structuredClone(state().configuration.draft.transmitters.tx1);
  settings.carrierScalePercent = 80;
  run({ type: "apply-transmitter-helper", transmitterIds: ["tx1"], settings });
  run({ type: "patch-draft", patch: { transmitters: { tx1: { carrierScalePercent: 100 } } } });
  run({ type: "apply-draft" });
  expect(assessAttemptSteps("dvor-220", definition, { device: state() }, blueprint.rubric).correct).toBe(5);
  const device = structuredClone(state());
  const field = "transmitters.tx1.carrierScalePercent";
  const first = device.history.parameterChanges.find(row => row.nativeFieldId === field && row.sequence === 1)!;
  const last = device.history.parameterChanges.find(row => row.nativeFieldId === field && row.sequence === 2)!;
  if (kind === "missing-first") device.history.parameterChanges = device.history.parameterChanges.filter(row => row !== first);
  if (kind === "tampered-before") last.before = 43.7;
  if (kind === "wrong-final") last.after = 99;
  if (kind === "duplicate-sequence") device.history.parameterChanges.push({ ...last });
  if (kind === "backwards-time") first.timestampMs = last.timestampMs! + 1;
  if (kind === "wrong-run") first.evidenceRunId = "previous-run";
  if (kind === "legacy-row") for (const row of device.history.parameterChanges) if (row.sequence === 1) {
    delete row.nativeFieldId;
    delete row.before;
    delete row.after;
  }
  const report = assessAttemptSteps("dvor-220", definition, { device }, blueprint.rubric);
  expect(report.steps.find(step => step.resultEvidenceIds?.includes(`state:${field}`)))
    .toMatchObject({ status: "unverified", evidenceIds: [] });
});

it.each(["draft", "restore", "wrong-module", "wrong-scenario", "wrong-field", "truncated", "full-history"] as const)
("does not upgrade invalid DVOR220 Helper evidence: %s", kind => {
  const { blueprint, definition, run, state } = start220();
  run({ type: "apply-transmitter-helper", transmitterIds: ["tx1"],
    settings: structuredClone(state().configuration.draft.transmitters.tx1) });
  const device = JSON.parse(JSON.stringify(state()));
  for (const row of device.history.parameterChanges) {
    if (kind === "draft") row.controlId = "replace-draft";
    if (kind === "restore") row.phase = "restore";
    if (kind === "wrong-module") row.moduleId = "dme-320";
    if (kind === "wrong-scenario") row.scenarioId = "other-scenario";
    if (kind === "wrong-field" && row.nativeFieldId) {
      row.nativeFieldId = "station.carrierPowerW";
      row.id = `${device.parameterEvidence.runId}:${row.sequence}:${row.nativeFieldId}`;
    }
  }
  if (kind === "full-history") device.history.parameterChanges = Array.from({ length: 500 }, (_, index) =>
    device.history.parameterChanges[index % device.history.parameterChanges.length]);
  const report = assessAttemptSteps("dvor-220", definition, { device,
    ...(kind === "truncated" ? { evidenceStats: { evidenceTruncated: true } } : {}) }, blueprint.rubric);
  expect(report.correct).toBe(0);
  expect(report.steps.every(step => step.status === "unverified")).toBe(true);
});

it("counts every compiled DVOR1150 step using real Apply then bypass evidence, even in the same millisecond", () => {
  const { blueprint, definition, store } = start1150();
  store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 125);
  expect(store.getState().applyConfigChanges()).toBe(true);
  expect(store.getState().setMonitorBypass("mon1", false)).toBe(true);
  const payload = JSON.parse(JSON.stringify(payload1150(store)));
  const report = assessAttemptSteps("dvor-1150", definition, payload, blueprint.rubric);
  expect(report.totalRequiredSteps).toBeGreaterThan(0);
  expect(report.correct).toBe(report.totalRequiredSteps);
  expect(report.steps.every(step => step.status === "correct")).toBe(true);
  expect(payload.parameterChangeLogs).toEqual(expect.arrayContaining([
    expect.objectContaining({ nativeFieldId: "transmitters.tx1.nominal.outputPower", before: 37.4, after: 125, phase: "apply", sequence: 1 }),
    expect.objectContaining({ nativeFieldId: "simulation.integralMonitorBypass", before: true, after: false, phase: "command", sequence: 2 }),
  ]));
});

it("does not count native draft edits or a discarded draft as accepted Apply", () => {
  const { blueprint, definition, run, state } = start320();
  expect(state().config.draft.transmitters.tx1.outputPowerPercent).toBe(100);
  expect(state().config.running.transmitters.tx1.outputPowerPercent).toBe(43.7);
  expect(state().parameterEvidence?.lastSequence).toBe(0);
  expect(assessAttemptSteps("dme-320", definition, { simulation: state() }, blueprint.rubric).correct).toBe(0);
  run({ type: "restore-draft" });
  expect(state().parameterChangeLogs).toEqual([]);
  expect(state().parameterEvidence?.lastSequence).toBe(0);
  expect(assessAttemptSteps("dme-320", definition, { simulation: state() }, blueprint.rubric).correct).toBe(0);
});

it("does not record a rejected native Apply", () => {
  const { blueprint, definition, run, state } = start320();
  run({ type: "logout" });
  const rejected = executeDme320Command(state(), { type: "apply-draft" });
  expect(rejected.accepted).toBe(false);
  expect(rejected.state.parameterChangeLogs).toEqual([]);
  expect(rejected.state.parameterEvidence?.lastSequence).toBe(0);
  expect(assessAttemptSteps("dme-320", definition, { simulation: rejected.state }, blueprint.rubric).correct).toBe(0);
});

it("rotates DME320 evidence on reset and never reuses retained proof in the new run", () => {
  const { blueprint, definition, run, state } = start320();
  run({ type: "apply-draft" });
  const previous = structuredClone(state());
  run({ type: "reset-system" });
  expect(state().parameterEvidence?.runId).not.toBe(previous.parameterEvidence?.runId);
  expect(state().parameterEvidence?.lastSequence).toBe(0);
  const stale = structuredClone(state());
  stale.config.running = previous.config.running;
  stale.parameterChangeLogs = previous.parameterChangeLogs;
  const report = assessAttemptSteps("dme-320", definition, { simulation: stale }, blueprint.rubric);
  expect(report.correct).toBe(0);
  expect(report.steps[0].status).toBe("unverified");
});

it("rotates DVOR220 evidence on restart without treating old display history as current proof", () => {
  const { blueprint, definition, run, state } = start220();
  run({ type: "apply-draft" });
  const previous = structuredClone(state());
  run({ type: "restart-scenario" });
  expect(state().parameterEvidence?.runId).not.toBe(previous.parameterEvidence?.runId);
  expect(state().parameterEvidence?.lastSequence).toBe(0);
  const stale = structuredClone(state());
  stale.configuration.running = previous.configuration.running;
  stale.history.parameterChanges = previous.history.parameterChanges;
  expect(assessAttemptSteps("dvor-220", definition, { device: stale }, blueprint.rubric).correct).toBe(0);
});

it("rotates DVOR1150 evidence on restore while retaining readable old display rows", () => {
  const { blueprint, definition, store } = start1150();
  store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 125);
  expect(store.getState().applyConfigChanges()).toBe(true);
  const previous = payload1150(store);
  expect(store.getState().restoreScenario()).toBe(true);
  const current = payload1150(store);
  expect(current.parameterEvidence?.runId).not.toBe(previous.parameterEvidence?.runId);
  expect(current.parameterEvidence?.lastSequence).toBe(0);
  expect(current.parameterChangeLogs).toEqual(previous.parameterChangeLogs);
  const stale = { ...current, checkpoint: previous.checkpoint };
  const report = assessAttemptSteps("dvor-1150", definition, stale, blueprint.rubric);
  expect(report.steps.filter(step => step.resultEvidenceIds?.includes("state:transmitters.tx1.nominal.outputPower")))
    .toEqual([expect.objectContaining({ status: "unverified", evidenceIds: [] })]);
});

it("does not count bypass released before its required correction", () => {
  const { blueprint, definition, store } = start1150();
  expect(store.getState().setMonitorBypass("mon1", false)).toBe(true);
  store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 125);
  expect(store.getState().applyConfigChanges()).toBe(true);
  const bypass = blueprint.rubric.steps.find(step => step.alternatives.flat().some(matcher =>
    matcher.kind === "parameter" && matcher.fieldId === "simulation.integralMonitorBypass"))!;
  const report = assessAttemptSteps("dvor-1150", definition, payload1150(store), blueprint.rubric);
  expect(report.steps.find(step => step.id === bypass.id)?.status).not.toBe("correct");
  expect(report.steps.find(step => step.id === bypass.id)?.resultEvidenceIds).toEqual(["state:simulation.integralMonitorBypass"]);
});

it.each(["missing-first", "tampered-before", "wrong-final", "duplicate-sequence", "backwards-time"] as const)
("rejects a broken native before/after chain: %s", kind => {
  const { blueprint, definition, run, state } = start320();
  const first = structuredClone(state().config.draft);
  first.transmitters.tx1.outputPowerPercent = 90;
  run({ type: "set-draft-config", config: first });
  run({ type: "apply-draft" });
  const last = structuredClone(state().config.running);
  last.transmitters.tx1.outputPowerPercent = 100;
  run({ type: "set-draft-config", config: last });
  run({ type: "apply-draft" });
  const simulation = structuredClone(state());
  const field = "transmitters.tx1.outputPowerPercent";
  const rows = simulation.parameterChangeLogs.filter(entry => entry.nativeFieldId === field);
  const latest = rows.find(entry => entry.sequence === 2)!;
  const earliest = rows.find(entry => entry.sequence === 1)!;
  expect(rows).toHaveLength(2);
  if (kind === "missing-first") simulation.parameterChangeLogs = simulation.parameterChangeLogs.filter(entry => entry !== earliest);
  if (kind === "tampered-before") latest.before = 43.7;
  if (kind === "wrong-final") latest.after = 99;
  if (kind === "duplicate-sequence") simulation.parameterChangeLogs.push({ ...latest });
  if (kind === "backwards-time") earliest.timestampMs = latest.timestampMs! + 1;
  const report = assessAttemptSteps("dme-320", definition, { simulation }, blueprint.rubric);
  expect(report.correct).toBe(0);
  expect(report.steps[0]).toMatchObject({ status: "unverified", evidenceIds: [],
    resultEvidenceIds: [`state:${field}`] });
});

it.each(["legacy-row", "unknown-field", "restore", "wrong-control", "alarm-row", "wrong-scenario", "wrong-module"] as const)
("never upgrades non-procedural native history into Apply proof: %s", kind => {
  const { blueprint, definition, run, state } = start320();
  run({ type: "apply-draft" });
  const simulation = structuredClone(state());
  const row = simulation.parameterChangeLogs.find(entry => entry.nativeFieldId)!;
  if (kind === "legacy-row") simulation.parameterChangeLogs = simulation.parameterChangeLogs.map(entry => ({
    id: entry.id, timeTag: entry.timeTag, userName: entry.userName, file: entry.file, parameter: entry.parameter, state: entry.state,
  }));
  if (kind === "unknown-field") {
    row.nativeFieldId = "transmitters.tx1.invented";
    row.id = `${simulation.parameterEvidence!.runId}:${row.sequence}:${row.nativeFieldId}`;
  }
  if (kind === "restore") row.phase = "restore";
  if (kind === "wrong-control") row.controlId = "set-draft-config";
  if (kind === "alarm-row") row.state = "alarm";
  if (kind === "wrong-scenario") row.scenarioId = "another-scenario";
  if (kind === "wrong-module") row.moduleId = "dvor-220";
  const report = assessAttemptSteps("dme-320", definition, { simulation }, blueprint.rubric);
  expect(report.correct).toBe(0);
  expect(report.steps[0].status).toBe("unverified");
});

it.each([false, true])("never lets generic action claims replace missing DVOR1150 parameter proof (malformed scope: %s)", malformedScope => {
  const { blueprint, definition, store } = start1150();
  store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 125);
  expect(store.getState().applyConfigChanges()).toBe(true);
  const payload = payload1150(store);
  if (malformedScope) payload.parameterEvidence = { ...payload.parameterEvidence!, runId: "invalid-run" };
  const report = assessAttemptSteps("dvor-1150", definition, { ...payload, parameterChangeLogs: [],
    actionHistory: [action("config-apply", 1, { parameterChanges: [{
      fieldId: "transmitters.tx1.nominal.outputPower", label: "Synthetic claim", before: 37.4, after: 125, phase: "apply", accepted: true,
    }] })] }, blueprint.rubric);
  // The generic event remains an attempted-action reference, never accepted proof.
  expect(report.steps.filter(step => step.resultEvidenceIds?.includes("state:transmitters.tx1.nominal.outputPower")))
    .toEqual([expect.objectContaining({ status: "unverified", evidenceIds: ["a1"] })]);
});

it("does not accept native operation timestamps that contradict their sequence", () => {
  const { blueprint, definition, store } = start1150();
  store.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 125);
  expect(store.getState().applyConfigChanges()).toBe(true);
  expect(store.getState().setMonitorBypass("mon1", false)).toBe(true);
  const payload = structuredClone(payload1150(store));
  for (const row of payload.parameterChangeLogs) if (row.sequence === 1) row.timestampMs! += 1;
  const bypass = blueprint.rubric.steps.find(step => step.alternatives.flat().some(matcher =>
    matcher.kind === "parameter" && matcher.fieldId === "simulation.integralMonitorBypass"))!;
  const report = assessAttemptSteps("dvor-1150", definition, payload, blueprint.rubric);
  expect(report.steps.find(step => step.id === bypass.id)?.status).not.toBe("correct");
});

it("copies scalar proof only, excluding sensitive paths and configuration objects", () => {
  const evidence = createNativeParameterEvidence("dme-320", "synthetic-test", 1000);
  const before = { station: { output: 10 }, accounts: [{ password: "test-only-a" }],
    security: { enabled: false }, apiToken: "test-only-a", nested: { value: 1 }, invalid: Number.NaN,
    oversized: "a".repeat(513) };
  const after = { station: { output: 20 }, accounts: [{ password: "test-only-b" }],
    security: { enabled: true }, apiToken: "test-only-b", nested: { value: 2 }, invalid: Number.POSITIVE_INFINITY,
    oversized: "b".repeat(513) };
  const recorded = recordNativeParameterChanges({ existing: [], evidence, before, after, timestampMs: 1000,
    controlId: "apply-draft", actionLabel: "Configuration Apply", phase: "apply",
    fields: ["station.output", "accounts.0.password", "security.enabled", "apiToken", "nested", "invalid", "oversized"] });
  expect(recorded.logs.filter(row => row.nativeFieldId).map(row => row.nativeFieldId)).toEqual(["station.output"]);
  expect(recorded.logs).toHaveLength(2);
  expect(JSON.stringify(recorded.logs)).not.toContain("test-only-");
  after.station.output = 30;
  expect(recorded.logs[0]).toMatchObject({ before: 10, after: 20 });
  expect(evidence.lastSequence).toBe(0);
  expect(recorded.evidence.lastSequence).toBe(1);
});

it("keeps legacy history import and display fields compatible under the 500-row cap", () => {
  const imported = parameterChangesFromHistory(Array.from({ length: 300 }, (_, index) => ({
    id: `legacy-${index}`, action: "backup" as const, changedFields: ["station.stationName"],
    operatorUserId: null, sessionId: null, revision: index + 1, createdAt: "2026-10-21T12:00:00Z",
  })));
  expect(imported).toHaveLength(MAX_PARAMETER_CHANGE_LOG_ROWS);
  expect(imported[0]).toMatchObject({ userName: "SYSTEM", file: "RMS", parameter: "Station / Station Name", state: "normal" });
  expect(imported.every(row => row.nativeFieldId === undefined)).toBe(true);
  const recorded = recordNativeParameterChanges({ existing: imported,
    evidence: createNativeParameterEvidence("dme-320", "synthetic-test", 1000),
    before: { station: { stationName: "Old" } }, after: { station: { stationName: "New" } }, timestampMs: 1000,
    controlId: "apply-draft", actionLabel: "Configuration Apply", phase: "apply" });
  expect(recorded.logs).toHaveLength(MAX_PARAMETER_CHANGE_LOG_ROWS);
  expect(recorded.logs[0]).toMatchObject({ userName: "SYSTEM", file: "RMS", parameter: "Station / Station Name", state: "normal",
    nativeFieldId: "station.stationName", before: "Old", after: "New" });
  expect(recorded.logs.slice(2)).toEqual(imported.slice(0, 498));
  expect(prependParameterChangeLogEntries(imported, [])).toEqual(imported);
  expect(imported).toHaveLength(MAX_PARAMETER_CHANGE_LOG_ROWS);
});

it.each([
  { evidenceTruncated: true },
  { droppedCount: 1 },
  { totalEventCount: 2, storedEventCount: 1 },
])("does not count native proof when submission metadata says it was truncated: %j", evidenceStats => {
  const { blueprint, definition, run, state } = start320();
  run({ type: "apply-draft" });
  const report = assessAttemptSteps("dme-320", definition, { simulation: state(), evidenceStats }, blueprint.rubric);
  expect(report.correct).toBe(0);
  expect(report.steps[0].status).toBe("unverified");
});

it("rejects a native sequence gap even when the retained field still starts at its baseline", () => {
  const { blueprint, definition, run, state } = start320();
  run({ type: "apply-draft" });
  const simulation = structuredClone(state());
  simulation.parameterEvidence!.lastSequence = 2;
  for (const row of simulation.parameterChangeLogs) {
    row.sequence = 2;
    row.id = row.nativeFieldId ? `${simulation.parameterEvidence!.runId}:2:${row.nativeFieldId}` : `${simulation.parameterEvidence!.runId}:2-backup`;
  }
  const report = assessAttemptSteps("dme-320", definition, { simulation }, blueprint.rubric);
  expect(report.correct).toBe(0);
  expect(report.steps[0].status).toBe("unverified");
});

it("keeps a historical native result unverified when only a generic empty action log remains", () => {
  const { blueprint, definition, run, state } = start320();
  run({ type: "apply-draft" });
  const simulation = structuredClone(state());
  delete simulation.parameterEvidence;
  simulation.parameterChangeLogs = [];
  const report = assessAttemptSteps("dme-320", definition, { simulation, actionHistory: [] }, blueprint.rubric);
  expect(report.correct).toBe(0);
  expect(report.steps[0]).toMatchObject({ status: "unverified", evidenceIds: [],
    resultEvidenceIds: ["state:transmitters.tx1.outputPowerPercent"] });
});

it("does not count a native correction when the retained parameter history reached its cap", () => {
  const { blueprint, definition, run, state } = start320();
  // Each accepted change retains one field row plus its display-only summary.
  // The correction itself survives, but earlier operations have been dropped.
  for (let index = 0; index < 251; index++) {
    const draft = structuredClone(state().config.running);
    draft.station.stationName = `Training ${index}`;
    run({ type: "set-draft-config", config: draft });
    run({ type: "apply-draft" });
  }
  const draft = structuredClone(state().config.running);
  draft.transmitters.tx1.outputPowerPercent = 100;
  run({ type: "set-draft-config", config: draft });
  run({ type: "apply-draft" });
  expect(state().parameterChangeLogs).toHaveLength(500);
  const report = assessAttemptSteps("dme-320", definition, { simulation: state() }, blueprint.rubric);
  expect(report.correct).toBe(0);
  expect(report.steps.every(step => step.status === "unverified")).toBe(true);
});
