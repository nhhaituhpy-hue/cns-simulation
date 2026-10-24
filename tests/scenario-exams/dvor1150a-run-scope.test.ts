// @vitest-environment node
import { expect, it } from "vitest";
import { createDefaultDvor1150aScenarioDefinition, evaluateDvor1150aScenario } from "@/lib/dvor1150a/scenario";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { evaluateScenarioExamResult } from "@/lib/scenario-exams/evaluation";

const clock = () => new Date("2026-10-24T04:00:00Z");
function fixture() {
  const definition = createDefaultDvor1150aScenarioDefinition();
  definition.startPolicy.startLocal = true;
  definition.successCriteria.configurationValues = [{ fieldId: "monitor.timers.shutdown", value: 2 }];
  definition.taskTargets = [{ fieldId: "monitor.timers.shutdown", requirement: "change-applied" }];
  const store = createVorPmdtStore({ now: clock });
  expect(store.getState().startReviewScenario(definition)).toBe(true);
  expect(store.getState().login("SEC3", "THREE")).toBe(true);
  store.getState().setConfigValue("monitor.timers.shutdown", 2);
  expect(store.getState().applyConfigChanges()).toBe(true);
  return { definition, store };
}
function payload(store: ReturnType<typeof createVorPmdtStore>) {
  const state = store.getState();
  return structuredClone({ checkpoint: { config: state.config, configDraft: state.configDraft,
    configurationBackup: state.configurationBackup, configDirty: state.configDirty, needBackup: state.needBackup,
    scenarioStage: state.scenarioStage, diagnosticState: state.diagnosticState,
    scenarioId: state.scenario.scenarioId, scenarioRunId: state.scenario.runId, scenarioStartedAt: state.scenario.startedAt },
    actionHistory: state.actionHistory, attemptEvents: state.attemptEvents, evidenceStats: state.evidenceStats });
}
it("does not verify a target-only exact contract against a substituted checkpoint scenario", () => {
  const { definition, store } = fixture();
  definition.taskTargets = [];
  const saved = payload(store);
  expect(evaluateScenarioExamResult("dvor-1150a", { ...definition, id: "other-target-only" }, saved).status).toBe("UNVERIFIED");
  delete saved.checkpoint.scenarioRunId;
  expect(evaluateScenarioExamResult("dvor-1150a", definition, saved).status).toBe("UNVERIFIED");
});
it("binds real Apply to its immutable native scenario, not a substituted definition id", () => {
  const { definition, store } = fixture();
  const saved = payload(store);
  expect(evaluateScenarioExamResult("dvor-1150a", definition, saved).solved).toBe(true);
  expect(evaluateScenarioExamResult("dvor-1150a", { ...definition, id: "another-scenario" }, saved).solved).not.toBe(true);
});
it.each(["missing-scope", "wrong-scenario", "wrong-module", "wrong-run", "wrong-start", "stale", "missing-checkpoint-run", "mixed"])("rejects %s without borrowing scope from the first event", kind => {
  const { definition, store } = fixture();
  const saved = payload(store);
  const action = saved.actionHistory.at(-1)!;
  if (kind === "missing-scope") delete action.scope;
  if (kind === "wrong-scenario") action.scope = { ...action.scope!, scenarioId: "other" };
  if (kind === "wrong-module") action.scope = { ...action.scope!, moduleId: "other" };
  if (kind === "wrong-run" || kind === "mixed") action.scope = { ...action.scope!, runId: "other" };
  if (kind === "wrong-start") action.scope = { ...action.scope!, startedAt: "2026-10-24T03:59:59Z" };
  if (kind === "stale") action.occurredAt = "2026-10-24T03:59:59Z";
  if (kind === "missing-checkpoint-run") delete saved.checkpoint.scenarioRunId;
  expect(evaluateScenarioExamResult("dvor-1150a", definition, saved).solved).not.toBe(true);
});
it.each(["startReviewScenario", "restoreScenario"] as const)("%s starts a clean new run even under the same constant clock", action => {
  const { definition, store } = fixture();
  const saved = payload(store);
  store.setState({ monitorElapsed: 4.9 });
  const oldRun = store.getState().scenario.runId;
  expect(oldRun).toBeTruthy();
  expect(action === "restoreScenario" ? store.getState().restoreScenario() : store.getState().startReviewScenario(definition)).toBe(true);
  const next = store.getState();
  expect(next.scenario.runId).not.toBe(oldRun);
  expect(next.actionHistory).toEqual([]);
  expect(next.attemptEvents).toEqual([]);
  expect(next.evidenceStats.totalEventCount).toBe(0);
  expect(next.monitorElapsed).toBe(0);
  const transplanted = { ...saved, checkpoint: { ...saved.checkpoint, scenarioRunId: next.scenario.runId } };
  expect(evaluateScenarioExamResult("dvor-1150a", definition, transplanted).solved).not.toBe(true);
});
it("restores the saved boundary and run before accepting the original Apply proof after reload", () => {
  const { definition, store } = fixture();
  const saved = payload(store);
  const reloaded = createVorPmdtStore({ now: () => new Date("2026-10-24T05:00:00Z") });
  expect(reloaded.getState().startReviewScenario(definition)).toBe(true);
  reloaded.getState().restoreScenarioEvidence(saved);
  expect(reloaded.getState().scenario.runId).toBe(saved.checkpoint.scenarioRunId);
  expect(reloaded.getState().scenario.startedAt).toBe(saved.checkpoint.scenarioStartedAt);
  const state = reloaded.getState();
  expect(evaluateDvor1150aScenario(state.scenario, state.derived, state.config, {
    actionHistory: state.actionHistory, evidenceStats: state.evidenceStats, runId: state.scenario.runId,
  }).solved).toBe(true);
});
