// @vitest-environment node
import { expect, it } from "vitest";
import { compileScenarioBlueprint } from "@/lib/ai/scenario-blueprint/compiler";
import { assessAttemptSteps } from "@/lib/ai/feedback/step-assessment";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import type { Dvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { MAX_SCENARIO_ACTION_HISTORY_EVENTS } from "@/lib/scenario-evidence";

const moduleId = "dvor-1150a" as const;
function fixture(twoFields = false) {
  const quote = "SYNTHETIC TEST ONLY: Apply the examiner monitor timer settings, then release monitor bypass.";
  const rows = [{ fieldId: "configuration.monitor.timers.shutdown", value: 3, citationIndexes: [0] },
    ...(twoFields ? [{ fieldId: "configuration.monitor.timers.noIdent", value: 19, citationIndexes: [0] }] : [])];
  const blueprint = compileScenarioBlueprint({ moduleId, description: quote, mode: "documents" },
    [{ id: "test", name: "DVOR1150A synthetic source", sha256: "a".repeat(64), segments: [{ label: "Test", text: quote }] }],
    { status: "supported", moduleId, templateId: "configuration-values", title: "Timer proof", situation: quote, cause: "Examiner training setting",
      citations: [{ documentId: "test", segmentLabel: "Test", quote }], initial: rows,
      recovery: [...rows.map(row => ({ ...row, value: row.fieldId.endsWith("shutdown") ? 2 : 18 })),
        { fieldId: "startPolicy.startMonitorBypassed", value: false, citationIndexes: [0] }], diagnosisCitationIndexes: [0] });
  const definition = blueprint.definition as Dvor1150aScenarioDefinition;
  const store = createVorPmdtStore({ now: () => new Date("2026-10-24T04:00:00Z") });
  expect(store.getState().startReviewScenario(definition)).toBe(true);
  expect(store.getState().login("SEC3", "THREE")).toBe(true);
  store.getState().setConfigValue("monitor.timers.shutdown", 4);
  expect(store.getState().applyConfigChanges()).toBe(true);
  store.getState().setConfigValue("monitor.timers.shutdown", 2);
  if (twoFields) store.getState().setConfigValue("monitor.timers.noIdent", 18);
  expect(store.getState().applyConfigChanges()).toBe(true);
  store.getState().setConfigValue("simulation.integralMonitorBypass", false);
  const state = store.getState();
  const saved = structuredClone({ checkpoint: { config: state.config, scenarioId: state.scenario.scenarioId, scenarioRunId: state.scenario.runId, scenarioStartedAt: state.scenario.startedAt }, actionHistory: state.actionHistory, evidenceStats: state.evidenceStats });
  return { blueprint, definition, saved, store };
}

it("counts the real native multi-Apply chain and later bypass release", () => {
  const { blueprint, definition, saved } = fixture();
  expect(assessAttemptSteps(moduleId, definition, saved, blueprint.rubric)).toMatchObject({ correct: 2, totalRequiredSteps: 2 });
});

it.each(["missing-scope", "wrong-run", "wrong-scenario", "missing-run", "wrong-definition", "wrong-before", "previous-run", "missing-boundary", "gap", "draft", "backup", "restore", "command", "system", "instructor", "no-op", "truncated", "duplicate", "broken-chain", "cap", "time-reversal", "stats-mismatch"] as const)
("does not count a forged or incomplete native field chain: %s", kind => {
  const { blueprint, definition, saved } = fixture();
  const applies = saved.actionHistory.filter(a => a.controlId === "config-apply");
  const action = applies.at(-1)!;
  const changes = action.parameterChanges!.map(c => ({ ...c }));
  action.parameterChanges = changes;
  const change = changes.find(c => c.fieldId === "monitor.timers.shutdown")!;
  if (kind === "missing-scope") delete action.scope;
  if (kind === "wrong-run") action.scope = { ...action.scope!, runId: "other-run" };
  if (kind === "wrong-scenario") action.scope = { ...action.scope!, scenarioId: "other-scenario" };
  if (kind === "missing-run") saved.checkpoint.scenarioRunId = undefined;
  if (kind === "wrong-definition") definition.id = "other-definition";
  if (kind === "wrong-before") change.before = 999;
  if (kind === "previous-run") saved.checkpoint.scenarioStartedAt = "2026-10-24T04:00:01Z";
  if (kind === "missing-boundary") saved.checkpoint.scenarioStartedAt = null;
  if (kind === "gap") saved.actionHistory = saved.actionHistory.filter(a => a.sequence !== 1);
  if (["draft", "backup", "restore", "command"].includes(kind)) change.phase = kind as typeof change.phase;
  if (kind === "system" || kind === "instructor") action.actor = kind;
  if (kind === "no-op") change.before = change.after;
  if (kind === "truncated") saved.evidenceStats.evidenceTruncated = true;
  if (kind === "duplicate") saved.actionHistory.push(structuredClone(action));
  if (kind === "broken-chain") applies[0].parameterChanges = applies[0].parameterChanges!.map(c => ({ ...c, before: 999 }));
  if (kind === "cap") {
    while (saved.actionHistory.length < MAX_SCENARIO_ACTION_HISTORY_EVENTS) {
      const sequence = saved.actionHistory.length + 1;
      saved.actionHistory.push({ ...saved.actionHistory[0], id: `cap-${sequence}`, sequence, parameterChanges: [] });
    }
    saved.evidenceStats = { totalEventCount: saved.actionHistory.length, storedEventCount: saved.actionHistory.length,
      droppedCount: 0, evidenceTruncated: false, lastSequence: saved.actionHistory.length };
  }
  if (kind === "time-reversal") action.occurredAt = "2026-10-24T03:59:59Z";
  if (kind === "stats-mismatch") saved.evidenceStats.lastSequence++;
  const report = assessAttemptSteps(moduleId, definition, saved, blueprint.rubric);
  expect(report.correct).toBe(0);
  expect(report.steps.every(s => s.status !== "correct")).toBe(true);
  expect(report.steps[0].resultEvidenceIds).toContain("state:monitor.timers.shutdown");
});

it("validates each field chain independently, rather than accepting an unrelated successful Apply", () => {
  const { blueprint, definition, saved } = fixture(true);
  const first = saved.actionHistory.find(a => a.controlId === "config-apply")!;
  first.parameterChanges = first.parameterChanges!.map(c => ({ ...c, before: 999 }));
  const report = assessAttemptSteps(moduleId, definition, saved, blueprint.rubric);
  expect(report.correct).toBe(1);
  expect(report.steps[0].status).not.toBe("correct");
  expect(report.steps[1].status).toBe("correct");
  expect(report.steps[2].status).not.toBe("correct");
});
