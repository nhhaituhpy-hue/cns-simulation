import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import { parseScenarioParameters } from "@/lib/scenario-parameters";
import { createScenarioEvidenceStats, type ScenarioActionEvent } from "@/lib/scenario-evidence";
import type { ScenarioRubric, ReferenceStep } from "@/lib/ai/scenario-blueprint/types";

// Synthetic test citation only; not a verified manufacturer manual.
export const manualCitation = {
  id: "manual-check", documentId: "manual-1", documentName: "Synthetic DVOR test fixture.docx",
  sha256: "a".repeat(64), segmentLabel: "Section 3 — Kiểm tra", quote: "Kiểm tra trạng thái trước và sau khi áp dụng cấu hình.", sourceKind: "uploaded" as const,
};
export function action(controlId: string, sequence: number, extra: Partial<ScenarioActionEvent> = {}): ScenarioActionEvent {
  return { id: `a${sequence}`, sequence, occurredAt: `2026-10-21T04:00:${String(sequence).padStart(2, "0")}.000Z`,
    actor: "student", kind: "control", controlId, menuPath: [], label: controlId, accepted: true, ...extra };
}
export function referenceStep(id: string, controlId = id): ReferenceStep {
  return { id, label: `Bước ${id}`, required: true, prerequisites: [], alternatives: [[{ kind: "action", controlId }]], citationIds: [manualCitation.id] };
}
export function fixture() {
  const definition = parseScenarioParameters("dvor-1150a", authoringAdapterFor("dvor-1150a").createDefault())!;
  const rubric: ScenarioRubric = { version: 1, moduleId: "dvor-1150a", steps: [
    referenceStep("inspect"), referenceStep("local", "local-on"), referenceStep("apply", "config-apply"),
    referenceStep("diagnose", "diagnostics-run-full"), referenceStep("A", "local-off"), referenceStep("B", "config-backup"),
  ], parameterRelevance: [], citations: [manualCitation] };
  rubric.steps[0].alternatives = [[{ kind: "view", viewId: "monitor-integrity" }]];
  const actions = [action("local-on", 1), action("config-apply", 2), action("diagnostics-run-full", 3)];
  const payload = { visitedViewIds: ["monitor-integrity"], attemptEvents: [], actionHistory: actions,
    evidenceStats: createScenarioEvidenceStats(actions), checkpoint: { config: structuredClone(definition.configuration), configDirty: false } };
  return { definition, rubric, payload };
}
