// @vitest-environment node
import { describe, expect, it } from "vitest";
import { action, fixture } from "./step-assessment-fixtures";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import { parseScenarioParameters } from "@/lib/scenario-parameters";
import { previewDvor220Scenario } from "@/modules/operations/dvor-220/domain/scenario";
import { previewDme320Scenario } from "@/modules/operations/dme-320/domain/engine";
import { hydrateDme1119aData } from "@/lib/simulator-config/dme-1119a";
import { DEFAULT_SCENARIOS } from "@/stores/default-scenarios";
import { evaluateScenarioExamResult } from "@/lib/scenario-exams/evaluation";

describe("frozen procedural rubric assessment", () => {
  it("pairs recomputed technical checks with procedure, and binds hardware to final selection", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    const passed = evaluateScenarioExamResult("dvor-1150a", definition, payload).checks.find(check => check.passed)!;
    expect(passed).toBeDefined();
    rubric.steps = [{ ...rubric.steps[0], alternatives: [[{ kind: "view", viewId: "monitor-integrity" }, { kind: "technical-check", checkId: passed.id }]] },
      { ...rubric.steps[1], alternatives: [[{ kind: "hardware", occurrenceKey: "card::slot::cabinet" }]] }];
    const result = assessAttemptSteps("dvor-1150a", definition, { ...payload, scenarioHardwareSelection: ["card::slot::cabinet"] }, rubric);
    expect(result.correct).toBe(2);
    expect(result.steps[0].evidenceIds).toContain(`technical:${passed.id}`);
    expect(result.steps[1].evidenceIds).toContain("hardware:card::slot::cabinet");
  });
  it("rejects alarm-only steps and a rubric from the wrong module", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    expect(() => assessAttemptSteps("dme-320", definition, payload, rubric)).toThrow();
    rubric.steps[0].alternatives = [[{ kind: "technical-check", checkId: "integral-monitor" }]];
    expect(() => assessAttemptSteps("dvor-1150a", definition, payload, rubric)).toThrow();
  });
  it("replays ADS-B cross-login native commands to verify effective SAC rather than trusting saved claims", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { rubric } = fixture();
    const definition = parseScenarioParameters("ads-b", DEFAULT_SCENARIOS.find(item => item.id === "adsb-08-configure-sac-sic"))!;
    rubric.moduleId = "ads-b";
    const sac = definition.expectedActions.find(action => action.input === "95")!;
    rubric.steps = [{ ...rubric.steps[0], alternatives: [[{ kind: "terminal", menuId: sac.menuId, input: "95" },
      { kind: "parameter", fieldId: "targetSensor.dataProfile.asterix.sac", value: 95 }]] }];
    const payload = { selectedActions: definition.expectedActions, allActions: definition.expectedActions, authenticatedCorrectly: true, qcmsMonitoringOpened: true };
    const result = assessAttemptSteps("ads-b", definition, payload, rubric);
    expect(result.correct).toBe(1);
    expect(result.steps[0].evidenceIds.some(id => id.startsWith("terminal:"))).toBe(true);
    const forged = structuredClone(payload);
    forged.allActions = [sac]; // Native menu context was never reached.
    expect(assessAttemptSteps("ads-b", definition, forged, rubric).correct).toBe(0);
  });
  it.each(["dvor-220", "dme-320"] as const)("labels %s running diffs as results, not proof of a procedure", async moduleId => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { rubric } = fixture();
    rubric.moduleId = moduleId;
    const fieldId = "transmitters.tx1.carrierScalePercent";
    const definition = parseScenarioParameters(moduleId, authoringAdapterFor(moduleId).createDefault())!;
    // Choose a real scalar field shared by each native module's station config.
    const actualField = moduleId === "dvor-220" ? fieldId : "station.stationName";
    const target = moduleId === "dvor-220" ? 90 : "Training station";
    rubric.steps = [{ ...rubric.steps[0], alternatives: [[{ kind: "parameter", fieldId: actualField, value: target }]] }];
    let payload: Record<string, unknown>;
    if (moduleId === "dvor-220") {
      const device = previewDvor220Scenario(parseScenarioParameters("dvor-220", definition)!).device;
      device.configuration.running.transmitters.tx1.carrierScalePercent = 90;
      device.configuration.draft.transmitters.tx1.carrierScalePercent = 10;
      device.configuration.running.station.stationName = "Unrelated";
      payload = { device };
    } else {
      const simulation = previewDme320Scenario(parseScenarioParameters("dme-320", definition)!);
      simulation.config.running.station.stationName = "Training station";
      simulation.config.draft.station.stationName = "Not applied";
      simulation.config.running.station.runwayDesignator = "99";
      payload = { simulation };
    }
    const result = assessAttemptSteps(moduleId, definition, payload, rubric);
    expect(result.correct).toBe(0);
    expect(result.steps[0]).toMatchObject({ status: "unverified", evidenceIds: [], resultEvidenceIds: [`state:${actualField}`] });
    expect(result.unrelatedParameterChanges).toHaveLength(1);
    expect(result.unrelatedParameterChanges[0].after).toBe(moduleId === "dvor-220" ? "Unrelated" : "99");
  });
  it.each(["dvor-1150", "dme-1119a"] as const)("uses %s saved effective parameter state and SELEX Apply records", async moduleId => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { rubric } = fixture();
    const definition = parseScenarioParameters(moduleId, authoringAdapterFor(moduleId).createDefault())!;
    rubric.moduleId = moduleId;
    const fieldId = moduleId === "dvor-1150" ? "station.stationDescription" : "rmsConfigStation.stationDescription";
    rubric.steps = [{ ...rubric.steps[0], alternatives: [[{ kind: "parameter", fieldId, value: "Updated" }]] }];
    const checkpoint = moduleId === "dvor-1150"
      ? { config: structuredClone(parseScenarioParameters("dvor-1150", definition)!.configuration) }
      : { data: hydrateDme1119aData(parseScenarioParameters("dme-1119a", definition)!.configuration) };
    if (checkpoint.config) checkpoint.config.station.stationDescription = "Updated";
    if (checkpoint.data) checkpoint.data.rmsConfigStation.stationDescription = "Updated";
    const payload = { checkpoint, actionHistory: [action("config-apply", 1, { parameterChanges: [
      { fieldId, label: "Station", before: "Original", after: "Updated", phase: "apply", accepted: true },
    ] })] };
    expect(assessAttemptSteps(moduleId, definition, payload, rubric).correct).toBe(1);
  });
  it("accepts an alternate AND-path and optional checks without inflating the required denominator", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    rubric.steps[3].alternatives.push([{ kind: "view", viewId: "monitor-integrity" }, { kind: "action", controlId: "diagnostics-run-on-air" }]);
    payload.actionHistory[2] = action("diagnostics-run-on-air", 3);
    rubric.steps.push({ ...rubric.steps[0], id: "optional", required: false });
    expect(assessAttemptSteps("dvor-1150a", definition, payload, rubric)).toMatchObject({ correct: 4, totalRequiredSteps: 6 });
  });
  it("uses native view action sequence for prerequisites rather than unordered visit summaries", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    rubric.steps = [rubric.steps[0], { ...rubric.steps[2], prerequisites: ["inspect"] }];
    payload.actionHistory = [action("monitor-integrity", 1, { kind: "view" }), action("config-apply", 2)];
    const result = assessAttemptSteps("dvor-1150a", definition, payload, rubric);
    expect(result.correct).toBe(2);
    expect(result.steps[0].evidenceIds).toEqual(["a1"]);
  });
  it("orders procedural events without requiring a sequence number for their technical result predicate", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    const passed = evaluateScenarioExamResult("dvor-1150a", definition, payload).checks.find(check => check.passed)!;
    rubric.steps = [rubric.steps[1], { ...rubric.steps[2], prerequisites: ["local"], alternatives: [[
      { kind: "action", controlId: "config-apply" }, { kind: "technical-check", checkId: passed.id },
    ]] }, { ...rubric.steps[3], prerequisites: ["apply"] }];
    expect(assessAttemptSteps("dvor-1150a", definition, payload, rubric).correct).toBe(3);
  });
  it("does not count malformed action records or infer missing ADS-B steps from absent records", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    const malformed = { ...action("local-on", 1), sequence: undefined };
    expect(assessAttemptSteps("dvor-1150a", definition, { ...payload, actionHistory: [malformed] }, rubric).steps.find(step => step.id === "local")?.status).toBe("unverified");
    const adsb = parseScenarioParameters("ads-b", DEFAULT_SCENARIOS.find(item => item.id === "adsb-08-configure-sac-sic"))!;
    rubric.moduleId = "ads-b";
    rubric.steps = [{ ...rubric.steps[0], alternatives: [[{ kind: "terminal", menuId: "sa.root", input: "1" }]] }];
    for (const incomplete of [null, {}, { allActions: [null] }]) {
      expect(assessAttemptSteps("ads-b", adsb, incomplete, rubric).steps[0].status).toBe("unverified");
    }
  });
  it("treats malformed or internally incomplete logs as unverified instead of accusing missing steps", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric } = fixture();
    for (const payload of [
      { actionHistory: [null] },
      { actionHistory: [action("diagnostics-run-full", 3)] },
      { actionHistory: [], evidenceStats: { totalEventCount: 2, storedEventCount: 0, droppedCount: 0, evidenceTruncated: false } },
    ]) {
      const result = assessAttemptSteps("dvor-1150a", definition, payload, rubric);
      expect(result.steps.filter(step => step.status === "missing")).toEqual([]);
    }
  });
  it("does not reuse one ADS-B command occurrence for two separate required steps", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { rubric } = fixture();
    const definition = parseScenarioParameters("ads-b", DEFAULT_SCENARIOS.find(item => item.id === "adsb-08-configure-sac-sic"))!;
    rubric.moduleId = "ads-b";
    const first = definition.expectedActions.find(item => item.kind !== "authentication")!;
    rubric.steps = ["first", "second"].map(id => ({ ...rubric.steps[0], id, alternatives: [[{ kind: "terminal", menuId: first.menuId, input: first.input }]] }));
    const report = assessAttemptSteps("ads-b", definition, { allActions: [first] }, rubric);
    expect(report.correct).toBe(1);
    expect(report.steps[1].evidenceIds).toEqual([]);
  });
  it("never confirms unknown fields or client-supplied technical checks", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    rubric.steps = [{ ...rubric.steps[0], alternatives: [[{ kind: "parameter", fieldId: "configuration.station.invented", value: 42 }]] },
      { ...rubric.steps[1], alternatives: [[{ kind: "view", viewId: "monitor-integrity" }, { kind: "technical-check", checkId: "client-check" }]] }];
    const poisoned = { ...payload, checkpoint: { config: { ...payload.checkpoint.config, configuration: { station: { invented: 42 } } } },
      actionHistory: [action("config-apply", 1, { parameterChanges: [{ fieldId: "configuration.station.invented", label: "Fake", before: 0, after: 42, phase: "apply", accepted: true }] })],
      resolution: { finalChecks: [{ id: "client-check", passed: true }] } };
    const report = assessAttemptSteps("dvor-1150a", definition, poisoned, rubric);
    expect(report.correct).toBe(0);
    expect(report.steps.map(step => step.status)).toEqual(["unverified", "unverified"]);
  });
  it("compares JSON action inputs structurally after JSONB reorders object keys", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    rubric.steps = [{ ...rubric.steps[0], alternatives: [[{ kind: "action", controlId: "setting", input: { monitor: "integral", options: { enabled: false, limits: [1, 2] } } }]] }];
    payload.actionHistory = [action("setting", 1, { input: { options: { limits: [1, 2], enabled: false }, monitor: "integral" } })];
    expect(assessAttemptSteps("dvor-1150a", definition, payload, rubric).correct).toBe(1);
    payload.actionHistory[0].input = { options: { limits: [2, 1], enabled: false }, monitor: "integral" };
    expect(assessAttemptSteps("dvor-1150a", definition, payload, rubric).correct).toBe(0);
  });
  it("keeps a valid prerequisite occurrence when that prerequisite is repeated later", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    rubric.steps[2].prerequisites = ["local"];
    payload.actionHistory.push(action("local-on", 4));
    const report = assessAttemptSteps("dvor-1150a", definition, payload, rubric);
    expect(report.steps.find(step => step.id === "apply")).toMatchObject({ status: "correct", evidenceIds: ["a2"] });
    expect(report.steps.find(step => step.id === "local")?.evidenceIds).toEqual(["a1"]);
  });
  it("requires prerequisite steps before the dependent action, including when rubric order differs", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    rubric.steps[2].prerequisites = ["local"];
    [rubric.steps[1], rubric.steps[2]] = [rubric.steps[2], rubric.steps[1]];
    payload.actionHistory = [action("config-apply", 1), action("local-on", 2)];
    expect(assessAttemptSteps("dvor-1150a", definition, payload, rubric).steps.find(step => step.id === "apply")?.status).toBe("incorrect");
    payload.actionHistory.push(action("config-apply", 3));
    expect(assessAttemptSteps("dvor-1150a", definition, payload, rubric).steps.find(step => step.id === "apply")?.status).toBe("correct");
  });
  it.each([
    { phase: "apply" as const, final: 114, accepted: true, expected: "correct" },
    { phase: "draft" as const, final: 113, accepted: true, expected: "missing" },
    { phase: "apply" as const, final: 113, accepted: true, expected: "incorrect" },
    { phase: "apply" as const, final: 114, accepted: false, expected: "incorrect" },
  ])("matches effective parameter values, not claimed after-values: %j", async ({ phase, final, accepted, expected }) => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    rubric.steps = [{ ...rubric.steps[0], alternatives: [[{ kind: "parameter", fieldId: "station.frequencyMHz", value: 114, tolerance: 0.01 }]] }];
    payload.checkpoint.config.station.frequencyMHz = final;
    payload.actionHistory = [action("config-apply", 1, { accepted, parameterChanges: [
      { fieldId: "station.frequencyMHz", label: "Frequency", before: 113, after: 114, accepted: true, phase },
    ] })];
    const result = assessAttemptSteps("dvor-1150a", definition, payload, rubric);
    expect(result.steps[0].status).toBe(expected);
    expect(result.unrelatedParameterChanges).toEqual([]);
  });
  it("keeps six of six while reporting two unrelated applied fields separately, not draft edits", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    payload.actionHistory.push(action("local-off", 4), action("config-backup", 5));
    payload.actionHistory.push(action("config-apply", 6, { kind: "configuration", parameterChanges: [
      { fieldId: "station.frequencyMHz", label: "Frequency", before: definition.configuration.station.frequencyMHz, after: 114, accepted: true, phase: "apply" },
      { fieldId: "station.stationDescription", label: "Station", before: definition.configuration.station.stationDescription, after: "Changed", accepted: true, phase: "apply" },
      { fieldId: "simulation.local", label: "Local", before: false, after: true, accepted: true, phase: "draft" },
    ] }));
    payload.checkpoint.config.station.frequencyMHz = 114;
    payload.checkpoint.config.station.stationDescription = "Changed";
    const result = assessAttemptSteps("dvor-1150a", definition, payload, rubric);
    expect(result).toMatchObject({ correct: 6, totalRequiredSteps: 6 });
    expect(result.unrelatedParameterChanges).toEqual([
      expect.objectContaining({ fieldId: "station.frequencyMHz", after: 114, evidenceIds: ["a6"] }),
      expect.objectContaining({ fieldId: "station.stationDescription", after: "Changed", evidenceIds: ["a6"] }),
    ]);
    expect(result.unrelatedParameterChanges.every(change => change.reason.includes("không tự trừ điểm"))).toBe(true);
  });
  it("rejects a refused attempt, counts repeated success once, and ignores extra inspections", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    payload.actionHistory.push(action("local-on", 4), action("local-off", 5, { accepted: false }),
      action("monitor-extra", 6, { kind: "view" }));
    payload.visitedViewIds.push("extra-inspection");
    const result = assessAttemptSteps("dvor-1150a", definition, payload, rubric);
    expect(result.correct).toBe(4);
    expect(result.steps.find(step => step.id === "A")).toMatchObject({ status: "incorrect", evidenceIds: ["a5"] });
    expect(result.redundantActions).toEqual([
      expect.objectContaining({ controlId: "local-on", evidenceIds: ["a4"], reason: "repeated" }),
      expect.objectContaining({ controlId: "local-off", evidenceIds: ["a5"], reason: "rejected" }),
    ]);
  });
  it.each([null, {}, { actionHistory: [], evidenceStats: { evidenceTruncated: true, droppedCount: 2 } }])("does not accuse missing steps without a complete log: %j", async payload => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric } = fixture();
    const result = assessAttemptSteps("dvor-1150a", definition, payload, rubric);
    expect(result.correct).toBe(0);
    expect(result.steps.map(step => step.status)).toEqual(Array(6).fill("unverified"));
    expect(result.notice).toContain("bằng chứng");
  });
  it("counts four of six required steps and identifies precisely missing A/B", async () => {
    const { assessAttemptSteps } = await import("@/lib/ai/feedback/step-assessment");
    const { definition, rubric, payload } = fixture();
    const result = assessAttemptSteps("dvor-1150a", definition, payload, rubric);
    expect(result).toMatchObject({ rubricVersion: 1, correct: 4, totalRequiredSteps: 6 });
    expect(result.steps.filter(step => step.status === "missing").map(step => step.id)).toEqual(["A", "B"]);
    expect(result.steps[1]).toMatchObject({ evidenceIds: ["a1"], citationIds: ["manual-check"] });
    expect(result.unrelatedParameterChanges).toEqual([]);
    expect(result.redundantActions).toEqual([]);
  });
});
