import { describe, expect, it } from "vitest";
import {
  appendScenarioActionHistory,
  appendScenarioEvidenceEvent,
  createScenarioEvidenceStats,
  describeScenarioActionTransition,
  isScenarioActionEvent,
  MAX_SCENARIO_ACTION_HISTORY_EVENTS,
  type ScenarioActionEvent,
} from "@/lib/scenario-evidence";

function event(sequence: number): ScenarioActionEvent {
  return {
    id: `event-${sequence}`,
    sequence,
    occurredAt: "2026-09-27T00:00:00.000Z",
    actor: "student",
    kind: "configuration",
    menuPath: ["RMS", "Configuration"],
    label: "Configuration Apply",
    accepted: true,
  };
}

describe("scenario evidence", () => {
  it("records typed parameter before/after deltas and renders them", () => {
    const next = {
      ...event(1),
      parameterChanges: [{
        fieldId: "transmitters.tx1.nominal.outputPower",
        label: "Output power",
        before: 10,
        after: 70,
        phase: "apply" as const,
        accepted: true,
      }],
    };

    expect(isScenarioActionEvent(next)).toBe(true);
    expect(describeScenarioActionTransition(next)).toContain("Output power: 10 → 70 (apply)");
  });

  it("keeps the first 500 action records and does not grow without bound", () => {
    const history = Array.from({ length: MAX_SCENARIO_ACTION_HISTORY_EVENTS }, (_, index) => event(index + 1));
    const capped = appendScenarioActionHistory(history, event(MAX_SCENARIO_ACTION_HISTORY_EVENTS + 1));

    expect(capped).toHaveLength(MAX_SCENARIO_ACTION_HISTORY_EVENTS);
    expect(capped[0].sequence).toBe(1);
    expect(capped.at(-1)?.sequence).toBe(MAX_SCENARIO_ACTION_HISTORY_EVENTS);
  });

  it("tracks truncation without replacing the last checkpoint event", () => {
    const history = Array.from({ length: MAX_SCENARIO_ACTION_HISTORY_EVENTS }, (_, index) => event(index + 1));
    const initialStats = createScenarioEvidenceStats(history);
    const result = appendScenarioEvidenceEvent(history, event(MAX_SCENARIO_ACTION_HISTORY_EVENTS + 1), initialStats);

    expect(result.history).toHaveLength(MAX_SCENARIO_ACTION_HISTORY_EVENTS);
    expect(result.history.at(-1)?.sequence).toBe(MAX_SCENARIO_ACTION_HISTORY_EVENTS);
    expect(result.stats).toMatchObject({
      totalEventCount: 501,
      storedEventCount: 500,
      droppedCount: 1,
      evidenceTruncated: true,
      lastSequence: 501,
    });
  });

  it("does not count draft keystrokes when the store chooses a checkpoint event", () => {
    const history = [event(1)];
    const stats = createScenarioEvidenceStats(history);
    const result = appendScenarioEvidenceEvent(history, event(2), stats);
    expect(result.stats.totalEventCount).toBe(2);
    expect(result.history).toHaveLength(2);
  });
});
