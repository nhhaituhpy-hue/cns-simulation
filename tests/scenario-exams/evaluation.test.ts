import { describe, expect, it } from "vitest";
import { evaluateScenarioExamResult } from "@/lib/scenario-exams/evaluation";
import { createLvpsTx1PowerScenario, createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { dvorHardwareOccurrenceKey } from "@/modules/devices/dvor-1150a/block-diagram-data";
import { createHpaChangeoverDme1119aScenario, previewDme1119aScenario } from "@/lib/dme1119a/scenario";
import { dme1119aHardwareOccurrenceKey } from "@/modules/devices/dme-1119a/block-diagram-data";
import { createDefaultDvor220ScenarioDefinition, previewDvor220Scenario } from "@/modules/operations/dvor-220/domain/scenario";
import { createDefaultDme320ScenarioDefinition } from "@/modules/operations/dme-320/domain/scenario";
import { previewDme320Scenario } from "@/modules/operations/dme-320/domain/engine";
import { createReferenceModulationScenario, createTx1FaultScenario, previewDvor1150Scenario } from "@/lib/dvor1150/scenario";
import { dvor1150HardwareOccurrenceKey } from "@/modules/devices/dvor-1150/block-diagram-data";

describe("snapshot-based exam technical evaluation", () => {
  it("requires PMDT evidence and the exact LVPS TX1 card for SOLVED", () => {
    const definition = createLvpsTx1PowerScenario();
    const payload = { checkpoint: { config: definition.configuration },
      attemptEvents: definition.diagnosis!.pmdtCheckpoints.map((checkpoint) => ({ viewId: checkpoint.viewId })),
      actionHistory: definition.diagnosis!.requiredActionControlIds.map((controlId) => ({ controlId, accepted: true })),
      scenarioHardwareSelection: [dvorHardwareOccurrenceKey(definition.diagnosis!.expectedHardware[0])] };
    expect(evaluateScenarioExamResult("dvor-1150a", definition, { ...payload, scenarioHardwareSelection: [] })).toMatchObject({ status: "IN_PROGRESS", pmdtComplete: true, hardwareComplete: false });
    expect(evaluateScenarioExamResult("dvor-1150a", definition, payload)).toMatchObject({ status: "SOLVED", solved: true, pmdtComplete: true, hardwareComplete: true });
    expect(evaluateScenarioExamResult("dvor-1150a", definition, { ...payload, attemptEvents: [] })).toMatchObject({ status: "IN_PROGRESS", solved: false });
  });

  it("does not trust a client solved claim or a modified protection field", () => {
    const definition = createLvpsTx1PowerScenario();
    expect(evaluateScenarioExamResult("dvor-1150a", definition, { solved: true, technicalSummary: { status: "SOLVED" }, checkpoint: { config: definition.configuration } }).status).toBe("IN_PROGRESS");
    const changed = structuredClone(definition.configuration);
    // Omitting editPolicy explicitly uses the shipped legacy whitelist contract.
    delete definition.editPolicy;
    changed.transmitters.tx1.nominal.mainIdentCode = "XYZ";
    const evaluation = evaluateScenarioExamResult("dvor-1150a", definition, { checkpoint: { config: changed }, visitedViewIds: definition.diagnosis!.pmdtCheckpoints.map((entry) => entry.viewId), acceptedActionControlIds: definition.diagnosis!.requiredActionControlIds, scenarioHardwareSelection: [dvorHardwareOccurrenceKey(definition.diagnosis!.expectedHardware[0])] });
    expect(evaluation.status).toBe("IN_PROGRESS");
    expect(evaluation.blockers.length).toBeGreaterThan(0);
  });

  it("evaluates DME hardware diagnosis from saved PMDT data and exact card selection", () => {
    const definition = createHpaChangeoverDme1119aScenario();
    const payload = { checkpoint: { data: previewDme1119aScenario(definition).data },
      visitedViewIds: definition.diagnosis!.pmdtCheckpoints.map((entry) => entry.viewId), acceptedActionControlIds: definition.diagnosis!.requiredActionControlIds,
      scenarioHardwareSelection: [dme1119aHardwareOccurrenceKey(definition.diagnosis!.expectedHardware[0])] };
    expect(evaluateScenarioExamResult("dme-1119a", definition, payload)).toMatchObject({ status: "SOLVED", solved: true });
    expect(evaluateScenarioExamResult("dme-1119a", definition, { ...payload, scenarioHardwareSelection: ["wrong-card"] }).status).toBe("IN_PROGRESS");
  });

  it("uses existing MOPIENS evaluators and the assigned definition", () => {
    const dvor = createDefaultDvor220ScenarioDefinition();
    const dme = createDefaultDme320ScenarioDefinition();
    expect(evaluateScenarioExamResult("dvor-220", dvor, { device: previewDvor220Scenario(dvor).device }).status).toBe("SOLVED");
    expect(evaluateScenarioExamResult("dme-320", dme, { simulation: previewDme320Scenario(dme) }).status).toBe("SOLVED");
  });

  it("marks absent, mismatched or malformed state UNVERIFIED", () => {
    const definition = createDefaultDvor1150aScenarioDefinition();
    expect(evaluateScenarioExamResult("dvor-1150a", definition, null).status).toBe("UNVERIFIED");
    expect(evaluateScenarioExamResult("dvor-1150a", definition, { checkpoint: { config: {} } }).status).toBe("UNVERIFIED");
    expect(evaluateScenarioExamResult("dme-1119a", definition, { checkpoint: { data: {} } }).status).toBe("UNVERIFIED");
  });

  it("activates the strict non-A two-stage evidence checks", () => {
    const definition = createReferenceModulationScenario();
    const preview = previewDvor1150Scenario(definition);
    expect(evaluateScenarioExamResult("dvor-1150", definition, { checkpoint: { config: preview.config } }).status).toBe("IN_PROGRESS");
  });

  it("uses the non-A assigned policy for protection without weakening PMDT or exact hardware checks", () => {
    const assigned = createTx1FaultScenario();
    const changed = structuredClone(previewDvor1150Scenario(assigned).config);
    changed.station.stationDescription = "Candidate changed station label";
    const diagnosis = assigned.diagnosis!;
    const payload = {
      checkpoint: { config: changed },
      visitedViewIds: diagnosis.pmdtCheckpoints.map((checkpoint) => checkpoint.viewId),
      acceptedActionControlIds: diagnosis.requiredActionControlIds,
      scenarioHardwareSelection: diagnosis.expectedHardware.map(dvor1150HardwareOccurrenceKey),
    };
    expect(evaluateScenarioExamResult("dvor-1150", assigned, payload)).toMatchObject({ status: "IN_PROGRESS", solved: false });
    const open = { ...structuredClone(assigned), editPolicy: { mode: "open" as const } };
    expect(evaluateScenarioExamResult("dvor-1150", open, payload)).toMatchObject({ status: "SOLVED", solved: true });
    expect(evaluateScenarioExamResult("dvor-1150", open, { ...payload, scenarioHardwareSelection: ["wrong-occurrence"] }).solved).toBe(false);
    expect(evaluateScenarioExamResult("dvor-1150", open, { ...payload, visitedViewIds: [] }).solved).toBe(false);
    expect(evaluateScenarioExamResult("dvor-1150", assigned, payload).solved).toBe(false);
  });
});
