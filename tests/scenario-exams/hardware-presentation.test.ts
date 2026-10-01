import { describe, expect, it } from "vitest";
import { createLvpsTx1PowerScenario, createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { createTx1FaultScenario, createReferenceModulationScenario } from "@/lib/dvor1150/scenario";
import { createHpaChangeoverDme1119aScenario } from "@/lib/dme1119a/scenario";
import { DVOR_BLOCKS, dvorHardwareOccurrenceKey, resolveDvorHardwareOccurrence } from "@/modules/devices/dvor-1150a/block-diagram-data";
import { dvor1150HardwareOccurrenceKey } from "@/modules/devices/dvor-1150/block-diagram-data";
import { dme1119aHardwareOccurrenceKey } from "@/modules/devices/dme-1119a/block-diagram-data";
import { describeExamHardwareSelection, presentExamHardwareEvidence } from "@/lib/scenario-exams/hardware-presentation";
import type { ScenarioParametersDefinition, ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { ScenarioExamReviewSubject } from "@/lib/scenario-exams/types";

function subject(moduleId: ScenarioParametersModuleId, definition: ScenarioParametersDefinition, key?: string): ScenarioExamReviewSubject {
  return { subjectId: "subject", moduleId, status: "submitted", itemId: "item", scenarioName: definition.name, revision: 1, startedAt: null, submittedAt: null,
    definition, resultInvalid: false, examinerScore: null, examinerComment: "", reviewedAt: null, reviewedByName: null,
    technicalSummary: { status: "IN_PROGRESS", solved: false, checks: [{ id: "hardware-selection", label: "Hardware", passed: Boolean(key), detail: "" }], blockers: [] },
    result: { version: 1, sessionItemId: "item", moduleId, scenarioId: definition.id, revision: 1, capturedAt: "2026-10-01T00:00:00Z", payload: { scenarioHardwareSelection: key ? [key] : [], scenarioHardwareInspected: key ? [key] : [], scenarioHardwareReasoning: "Measured supply voltage" } } };
}

describe("saved hardware evidence for examiners", () => {
  it("shows the saved DVOR 1150A card and its exact cabinet slot", () => {
    const definition = createLvpsTx1PowerScenario();
    const key = dvorHardwareOccurrenceKey(definition.diagnosis!.expectedHardware[0]);
    const evidence = presentExamHardwareEvidence(subject("dvor-1150a", definition, key))!;
    expect(evidence.selected[0]).toMatchObject({ known: true, position: "1A3A4", matchesReference: true });
    expect(evidence.selected[0].label).toMatch(/LVPS.*1/);
    expect(evidence.expected[0].key).toBe(key);
    expect(evidence.inspected[0].key).toBe(key);
    expect(evidence.reasoning).toBe("Measured supply voltage");
    expect(evidence.passed).toBe(true);
  });

  it("keeps the non-A and DME block/card identities separate", () => {
    const vor = createTx1FaultScenario();
    const dme = createHpaChangeoverDme1119aScenario();
    const vorKey = dvor1150HardwareOccurrenceKey(vor.diagnosis!.expectedHardware[0]);
    const dmeKey = dme1119aHardwareOccurrenceKey(dme.diagnosis!.expectedHardware[0]);
    expect(describeExamHardwareSelection(vorKey, "dvor-1150")).toMatchObject({ known: true, position: "1A3" });
    expect(describeExamHardwareSelection(dmeKey, "dme-1119a").known).toBe(true);
    expect(describeExamHardwareSelection(vorKey, "dvor-1150a").known).toBe(false);
  });

  it("does not treat another LVPS occurrence or a fabricated cabinet combination as the right card", () => {
    const definition = createLvpsTx1PowerScenario();
    const target = definition.diagnosis!.expectedHardware[0];
    const block = DVOR_BLOCKS.find((entry) => entry.id === target.blockId)!;
    const other = block.diagramHotspots.find((entry) => entry.id !== target.diagramHotspotId)!;
    const wrong = dvorHardwareOccurrenceKey(resolveDvorHardwareOccurrence(block.id, other.id)!);
    const data = subject("dvor-1150a", definition, wrong);
    data.technicalSummary!.checks[0].passed = false;
    expect(presentExamHardwareEvidence(data)?.selected[0]).toMatchObject({ known: true, matchesReference: false });
    expect(presentExamHardwareEvidence(data)?.passed).toBe(false);
    const fakeCombination = [target.blockId, target.diagramHotspotId, wrong.split("::")[2]].join("::");
    expect(describeExamHardwareSelection(fakeCombination, "dvor-1150a").known).toBe(false);
  });

  it("leaves absent old evidence unknown even if a stale summary says passed", () => {
    const data = subject("dvor-1150a", createLvpsTx1PowerScenario());
    data.technicalSummary!.checks[0].passed = true;
    delete data.result!.payload.scenarioHardwareSelection;
    expect(presentExamHardwareEvidence(data)).toMatchObject({ selected: [], hasEvidence: false, passed: false });
  });

  it("does not invent a hardware answer for a scenario without a reference", () => {
    const data = subject("dvor-1150a", createDefaultDvor1150aScenarioDefinition(), "old-card-id");
    expect(presentExamHardwareEvidence(data)).toMatchObject({ hasReference: false, passed: false, selected: [{ known: false }] });
  });

  it("retains the software-only confirmation and the replacement workflow's reference readings", () => {
    const definition = createReferenceModulationScenario();
    const data = subject("dvor-1150", definition);
    data.result!.payload.scenarioHardwareDispositionConfirmed = true;
    data.technicalSummary!.checks[0].passed = true;
    expect(presentExamHardwareEvidence(data)).toMatchObject({ softwareOnly: true, hasEvidence: true, passed: true, referenceCriterionIds: [] });
    expect(presentExamHardwareEvidence(subject("dvor-1150a", createLvpsTx1PowerScenario()))?.referenceCriterionIds).toContain("integral-monitor");
  });
});
