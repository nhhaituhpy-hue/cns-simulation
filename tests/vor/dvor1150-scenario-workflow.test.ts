import { describe, expect, it } from "vitest";
import {
  buildDvor1150Snapshot,
  cloneDvor1150Config,
  createLowCarrierAnd9960Scenario,
  createTx1FaultScenario,
  DVOR1150_BUILT_IN_SCENARIOS,
  evaluateDvor1150Scenario,
  parseDvor1150ScenarioDefinition,
  previewDvor1150Scenario,
  validateDvor1150ScenarioDefinition,
} from "@/lib/dvor1150";
import { dvor1150HardwareOccurrenceKey } from "@/modules/devices/dvor-1150/block-diagram-data";
import { createDvor1150PmdtStore, getDvor1150ScenarioEvidence } from "@/stores/dvor1150-pmdt-store";

function evidenceFor(scenario: ReturnType<typeof createTx1FaultScenario>) {
  const diagnosis = scenario.diagnosis;
  if (!diagnosis) throw new Error("Expected a diagnosis contract.");
  return {
    visitedViewIds: diagnosis.pmdtCheckpoints.map((checkpoint) => checkpoint.viewId),
    acceptedActionControlIds: diagnosis.requiredActionControlIds,
    selectedHardwareOccurrenceKeys: diagnosis.expectedHardware.map(dvor1150HardwareOccurrenceKey),
    hardwareDispositionConfirmed: true,
  };
}

describe("DVOR 1150 two-stage scenario workflow", () => {
  it("keeps every built-in scenario schema-valid and importable", () => {
    expect(DVOR1150_BUILT_IN_SCENARIOS).toHaveLength(14);
    for (const preset of DVOR1150_BUILT_IN_SCENARIOS) {
      const scenario = preset.create();
      expect(validateDvor1150ScenarioDefinition(scenario), preset.id).toEqual([]);
      expect(parseDvor1150ScenarioDefinition(JSON.parse(JSON.stringify(scenario))), preset.id).toEqual(scenario);
    }
  });

  it("requires both PMDT evidence and the exact hardware occurrence for a replacement case", () => {
    const scenario = createTx1FaultScenario();
    const preview = previewDvor1150Scenario(scenario);
    const runtime = { active: true, definition: scenario, startedAt: null } as const;
    const correct = evaluateDvor1150Scenario(runtime, preview.snapshot, preview.config, evidenceFor(scenario));

    expect(correct.pmdtComplete).toBe(true);
    expect(correct.hardwareComplete).toBe(true);
    expect(correct.solved).toBe(true);

    const wrong = evaluateDvor1150Scenario(runtime, preview.snapshot, preview.config, {
      ...evidenceFor(scenario),
      selectedHardwareOccurrenceKeys: [],
    });
    expect(wrong.pmdtComplete).toBe(true);
    expect(wrong.hardwareComplete).toBe(false);
    expect(wrong.solved).toBe(false);
  });

  it("records diagnostics, transfer and hardware selection in the PMDT store", () => {
    const scenario = createTx1FaultScenario();
    const store = createDvor1150PmdtStore();
    expect(store.getState().initializeStudentScenario(scenario)).toBe(true);
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    store.getState().openView("tx-data", "tx-data-tx1", ["Transmitters", "Data", "Transmitter 1"]);
    store.getState().openView("monitor-data", "monitor-integrity", ["Monitors", "Data", "Integrity"]);
    store.getState().openView("diagnostics", "diagnostics-fault-isolation", ["Diagnostics", "Fault Isolation"]);
    expect(store.getState().runDiagnostics("full")).toBe(true);
    expect(store.getState().setTransmitterMode("tx2", "main")).toBe(true);

    const target = scenario.diagnosis?.expectedHardware[0];
    if (!target) throw new Error("Expected a hardware target.");
    store.getState().inspectScenarioHardware(dvor1150HardwareOccurrenceKey(target));
    store.getState().toggleScenarioHardware(dvor1150HardwareOccurrenceKey(target));
    store.getState().setScenarioHardwareReasoning("Fault Isolation isolates the TX1 carrier path; cabinet occurrence 1A3 is selected.");

    const state = store.getState();
    const evaluation = evaluateDvor1150Scenario(state.scenario, state.derived, state.config, getDvor1150ScenarioEvidence(state));
    expect(state.diagnosticState.result).toContain("CSB Power Amplifier");
    expect(state.scenarioVisitedViewIds).toEqual(expect.arrayContaining(["tx-data-tx1", "monitor-integrity", "diagnostics-fault-isolation"]));
    expect(state.scenarioAcceptedActionControlIds).toEqual(expect.arrayContaining(["diagnostics-run-full", "tx-transfer-tx2"]));
    expect(evaluation.pmdtComplete).toBe(true);
    expect(evaluation.hardwareComplete).toBe(true);
  });

  it("requires Apply and software disposition confirmation for a configuration case", () => {
    const scenario = createLowCarrierAnd9960Scenario();
    const preview = previewDvor1150Scenario(scenario);
    const recovered = cloneDvor1150Config(preview.config);
    recovered.transmitters.tx1.nominal.outputPower = 100;
    recovered.simulation.integralMonitorBypass = false;
    const snapshot = buildDvor1150Snapshot(recovered);
    const runtime = { active: true, definition: scenario, startedAt: null } as const;
    const evidence = evidenceFor(scenario as unknown as ReturnType<typeof createTx1FaultScenario>);

    const incomplete = evaluateDvor1150Scenario(runtime, snapshot, recovered, {
      ...evidence,
      hardwareDispositionConfirmed: false,
    });
    expect(incomplete.pmdtComplete).toBe(true);
    expect(incomplete.hardwareComplete).toBe(false);
    expect(incomplete.solved).toBe(false);

    const complete = evaluateDvor1150Scenario(runtime, snapshot, recovered, evidence);
    expect(complete.pmdtComplete).toBe(true);
    expect(complete.hardwareComplete).toBe(true);
    expect(complete.solved).toBe(true);
  });
});
