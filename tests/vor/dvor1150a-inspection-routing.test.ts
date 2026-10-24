// @vitest-environment node
import { expect, it } from "vitest";
import { createDefaultDvor1150aScenarioDefinition, dvor1150aConfigurationViewId, evaluateDvor1150aScenario } from "@/lib/dvor1150a/scenario";
import { dvorConfigFieldCatalog, getDvorConfigValue } from "@/lib/dvor1150a/config-utils";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import type { VorViewId } from "@/lib/vor-types";

const cases: [string, string, string][] = dvorConfigFieldCatalog.filter(f => /^monitor\.standbyCalibration\./.test(f.id)).map(f =>
  [f.id, f.id.includes(".mon1.") ? "monitor-1-offsets" : "monitor-2-offsets", "monitor-alarm-limits"]);
cases.push(["monitor.votingLogic", "rms-config-general", "monitor-config-general"],
  ["monitor.transfer", "rms-config-general", "monitor-config-general"],
  ["monitor.integrity.enabled", "rms-config-general", "monitor-config-general"],
  ["monitor.integrity.maxConsecutiveFailures", "rms-config-general", "monitor-config-general"]);

it.each(cases)("requires the exact native inspection view for %s", (fieldId, viewId, wrongView) => {
  const definition = createDefaultDvor1150aScenarioDefinition();
  definition.successCriteria.configurationValues = [{ fieldId, value: getDvorConfigValue(definition.configuration, fieldId) as string | number | boolean }];
  definition.taskTargets = [{ fieldId, requirement: "inspect" }];
  expect(dvor1150aConfigurationViewId(fieldId)).toBe(viewId);
  const evaluate = (visitedViewIds: string[]) => {
    const store = createVorPmdtStore();
    expect(store.getState().startReviewScenario(definition)).toBe(true);
    for (const view of visitedViewIds) store.getState().openView("monitor-config", view as VorViewId, ["Test inspection"], view);
    const state = store.getState();
    return evaluateDvor1150aScenario(state.scenario, state.derived, state.config, {
      runId: state.scenario.runId, actionHistory: state.actionHistory, evidenceStats: state.evidenceStats,
      visitedViewIds: state.attemptEvents.map(event => event.viewId),
    });
  };
  expect(evaluate([wrongView]).solved).toBe(false);
  expect(evaluate([viewId]).solved).toBe(true);
  expect(evaluate([viewId === "monitor-1-offsets" ? "monitor-2-offsets" : "monitor-1-offsets"]).solved).toBe(false);
});
