// @vitest-environment node
import { expect, it } from "vitest";
import { createDefaultDvor1150aScenarioDefinition, evaluateDvor1150aScenario, previewDvor1150aScenario } from "@/lib/dvor1150a/scenario";
import { buildDvor1150aSnapshot } from "@/lib/dvor1150a/engine";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { evaluateScenarioExamResult } from "@/lib/scenario-exams/evaluation";


function fixture() {
  const definition = createDefaultDvor1150aScenarioDefinition();
  definition.startPolicy.startLocal = true;
  definition.successCriteria.configurationValues = [{ fieldId: "monitor.timers.shutdown", value: 2 }];
  definition.taskTargets = [{ fieldId: "monitor.timers.shutdown", requirement: "change-applied" }];
  const store = createVorPmdtStore({ now: () => new Date("2026-10-24T04:00:00Z") });
  expect(store.getState().startReviewScenario(definition)).toBe(true);
  expect(store.getState().login("SEC3", "THREE")).toBe(true); // Native training account, not web credentials.
  return { definition, store };
}
function payload(store: ReturnType<typeof createVorPmdtStore>) {
  const state = store.getState();
  return { checkpoint: { config: state.config, configDraft: state.configDraft, configDirty: state.configDirty, scenarioId:state.scenario.scenarioId, scenarioRunId:state.scenario.runId, scenarioStartedAt:state.scenario.startedAt }, actionHistory: state.actionHistory, evidenceStats: state.evidenceStats };
}

it("does not equate a draft, config-apply label or final configuration with evidence of changing the required field", () => {
  const { definition, store } = fixture();
  store.getState().setConfigValue("monitor.timers.shutdown", 2);
  expect(evaluateScenarioExamResult("dvor-1150a", definition, payload(store)).solved).toBe(false);
  const forged = payload(store);
  forged.checkpoint.config = structuredClone(store.getState().configDraft);
  forged.actionHistory = [];
  const report = evaluateScenarioExamResult("dvor-1150a", definition, { ...forged, acceptedActionControlIds: ["config-apply"] });
  expect(report.solved).toBe(false);
  expect(report.checks.find(c => c.id === "task-target-monitor.timers.shutdown")).toMatchObject({ passed: false });
});

it("accepts the real store Apply proof for the exact field and computes server grading from frozen checkpoint", () => {
  const { definition, store } = fixture();
  const before = structuredClone(definition);
  store.getState().setConfigValue("monitor.timers.shutdown", 2);
  expect(store.getState().applyConfigChanges()).toBe(true);
  const saved = JSON.parse(JSON.stringify(payload(store)));
  const report = evaluateScenarioExamResult("dvor-1150a", definition, saved);
  expect(report).toMatchObject({ solved: true, status: "SOLVED" });
  expect(report.checks.find(c => c.id === "task-target-monitor.timers.shutdown")).toMatchObject({ passed: true });
  expect(saved.actionHistory).toContainEqual(expect.objectContaining({ controlId: "config-apply", accepted: true,
    parameterChanges: expect.arrayContaining([expect.objectContaining({ fieldId: "monitor.timers.shutdown", before: 5, after: 2, phase: "apply", accepted: true })]) }));
  expect(definition).toEqual(before);
  store.getState().restoreScenario();
  expect(evaluateScenarioExamResult("dvor-1150a", definition, saved)).toEqual(report);
});

it.each(["draft", "backup", "restore", "wrong-field", "no-op", "wrong-before", "wrong-after", "rejected", "system", "gap", "duplicate", "truncated"] as const)
("rejects insufficient or contradictory Apply evidence: %s", kind => {
  const { definition, store } = fixture();
  store.getState().setConfigValue("monitor.timers.shutdown", 2);
  expect(store.getState().applyConfigChanges()).toBe(true);
  const saved = structuredClone(payload(store));
  const action = saved.actionHistory.find(a => a.controlId === "config-apply")!;
  const changes = action.parameterChanges!.map(c => ({ ...c }));
  action.parameterChanges = changes;
  const change = changes.find(c => c.fieldId === "monitor.timers.shutdown")!;
  if (["draft", "backup", "restore"].includes(kind)) change.phase = kind as "draft" | "backup" | "restore";
  if (kind === "wrong-field") change.fieldId = "monitor.timers.noIdent";
  if (kind === "no-op") change.before = change.after;
  if (kind === "wrong-before") change.before = 999;
  if (kind === "wrong-after") change.after = 3;
  if (kind === "rejected") action.accepted = false;
  if (kind === "system") action.actor = "system";
  if (kind === "gap") saved.actionHistory = saved.actionHistory.filter(a => a.sequence !== 1);
  if (kind === "duplicate") saved.actionHistory.push(structuredClone(action));
  if (kind === "truncated") saved.evidenceStats = { ...saved.evidenceStats, evidenceTruncated: true, droppedCount: 1 };
  expect(evaluateScenarioExamResult("dvor-1150a", definition, saved).solved).toBe(false);
});

it("requires exact inspection evidence rather than a generic unrelated view visit", () => {
  const { definition, store } = fixture();
  definition.taskTargets = [{ fieldId: "monitor.timers.shutdown", requirement: "inspect" }];
  store.getState().setConfigValue("monitor.timers.shutdown", 2);
  expect(store.getState().applyConfigChanges()).toBe(true);
  const saved = payload(store);
  expect(evaluateScenarioExamResult("dvor-1150a", definition, { ...saved, visitedViewIds: ["home"] }).solved).toBe(false);
  expect(evaluateScenarioExamResult("dvor-1150a", definition, { ...saved, visitedViewIds: ["monitor-alarm-limits"] }).solved).toBe(true);
});

it("fails closed on task proof absent from direct native evaluation while keeping legacy criteria unchanged", () => {
  const { definition, store } = fixture();
  store.getState().setConfigValue("monitor.timers.shutdown", 2);
  expect(store.getState().applyConfigChanges()).toBe(true);
  const config = store.getState().config;
  expect(evaluateDvor1150aScenario({ active: true, definition, startedAt: null }, buildDvor1150aSnapshot(config), config).solved).toBe(false);
  const legacy = createDefaultDvor1150aScenarioDefinition();
  legacy.taskTargets=[{fieldId:"monitor.timers.shutdown",requirement:"change-applied"}];
  const preview = previewDvor1150aScenario(legacy);
  expect(evaluateDvor1150aScenario({ active: true, definition: legacy, startedAt: null }, preview.snapshot, preview.config).solved).toBe(true);
});

it("rejects a previous run's Apply chain or missing run boundary even if the final target happens to match", () => {
  const {definition,store}=fixture();
  store.getState().setConfigValue("monitor.timers.shutdown",2);
  expect(store.getState().applyConfigChanges()).toBe(true);
  const saved=payload(store);
  const nextRun={...saved,checkpoint:{...saved.checkpoint,scenarioStartedAt:"2026-10-24T04:00:01Z"}};
  expect(evaluateScenarioExamResult("dvor-1150a",definition,nextRun).solved).toBe(false);
  expect(evaluateScenarioExamResult("dvor-1150a",definition,{...saved,checkpoint:{...saved.checkpoint,scenarioStartedAt:null}}).solved).toBe(false);
});
