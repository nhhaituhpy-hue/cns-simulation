import { describe, expect, it } from "vitest";
import {
  createLowCarrierAnd9960Scenario,
  createDefaultDvor1150aScenarioDefinition,
  isDvor1150aScenarioStudentEditable,
  validateDvor1150aScenarioDefinition,
} from "@/lib/dvor1150a/scenario";
import {
  createDefaultDme1119aScenarioDefinition,
  createLowOutputDme1119aScenario,
  isDme1119aScenarioStudentEditable,
  validateDme1119aScenarioDefinition,
} from "@/lib/dme1119a/scenario";
import { createDmePmdtStore } from "@/stores/dme-pmdt-store";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";

describe("scenario edit policy", () => {
  it("opens safe catalog fields for a new DVOR 1150A draft", () => {
    const definition = createDefaultDvor1150aScenarioDefinition();

    expect(definition.editPolicy).toEqual({ mode: "open" });
    expect(isDvor1150aScenarioStudentEditable(definition, "station.frequencyMHz")).toBe(true);
    expect(isDvor1150aScenarioStudentEditable(definition, "transmitters.tx1.onAir")).toBe(false);
    expect(validateDvor1150aScenarioDefinition(definition)).toEqual([]);
  });

  it("lets an explicit open policy win over a legacy whitelist", () => {
    const definition = createDefaultDvor1150aScenarioDefinition();
    definition.studentEditableFieldIds = ["transmitters.tx1.nominal.outputPower"];
    definition.editPolicy = { mode: "open" };

    expect(isDvor1150aScenarioStudentEditable(definition, "station.frequencyMHz")).toBe(true);
    expect(isDvor1150aScenarioStudentEditable(definition, "transmitters.tx1.nominal.outputPower")).toBe(true);
    expect(isDvor1150aScenarioStudentEditable(definition, "transmitters.tx1.faults.carrierVswr")).toBe(false);
  });

  it("preserves the legacy restricted whitelist for old DVOR definitions", () => {
    const definition = createLowCarrierAnd9960Scenario();
    delete definition.editPolicy;

    expect(isDvor1150aScenarioStudentEditable(definition, "transmitters.tx1.nominal.outputPower")).toBe(true);
    expect(isDvor1150aScenarioStudentEditable(definition, "station.frequencyMHz")).toBe(false);
    expect(validateDvor1150aScenarioDefinition(definition)).toEqual([]);
  });

  it("opens safe catalog fields for a new DME 1119A draft", () => {
    const definition = createDefaultDme1119aScenarioDefinition();

    expect(definition.editPolicy).toEqual({ mode: "open" });
    expect(isDme1119aScenarioStudentEditable(definition, "rmsConfigStation.channelNumber")).toBe(true);
    expect(isDme1119aScenarioStudentEditable(definition, "channelAllocation.receiverFrequencyMHz")).toBe(false);
    expect(isDme1119aScenarioStudentEditable(definition, "securityAccounts.0.password")).toBe(false);
    expect(isDme1119aScenarioStudentEditable(definition, "local")).toBe(false);
    expect(validateDme1119aScenarioDefinition(definition)).toEqual([]);
  });

  it("does not expose DVOR fault injection or raw measurements through open policy", () => {
    const definition = createDefaultDvor1150aScenarioDefinition();

    expect(isDvor1150aScenarioStudentEditable(definition, "transmitters.tx1.faults.carrierVswr")).toBe(false);
    expect(isDvor1150aScenarioStudentEditable(definition, "monitor.rawMeasurements.mon1.azimuth")).toBe(false);
    expect(isDvor1150aScenarioStudentEditable(definition, "simulation.alert")).toBe(false);
  });

  it("keeps built-in DME recovery controls restricted", () => {
    const definition = createLowOutputDme1119aScenario();

    expect(definition.editPolicy).toBeUndefined();
    expect(isDme1119aScenarioStudentEditable(definition, "txConfigNominal.rtcParameters.powerOutput")).toBe(true);
    expect(isDme1119aScenarioStudentEditable(definition, "rmsConfigStation.channelNumber")).toBe(false);
    expect(validateDme1119aScenarioDefinition(definition)).toEqual([]);
  });

  it("rejects policy and task targets that attempt to open protected fields", () => {
    const dvor = createDefaultDvor1150aScenarioDefinition();
    dvor.editPolicy = { mode: "restricted", allowedFieldIds: ["transmitters.tx1.onAir"] };
    dvor.taskTargets = [{ fieldId: "transmitters.tx1.onAir", requirement: "change-applied" }];
    expect(validateDvor1150aScenarioDefinition(dvor)).toEqual(expect.arrayContaining([
      expect.stringContaining("Scenario edit policy field is invalid"),
      expect.stringContaining("Scenario task targets field is invalid"),
    ]));

    const dme = createDefaultDme1119aScenarioDefinition();
    dme.editPolicy = { mode: "open", allowedFieldIds: [] } as never;
    expect(validateDme1119aScenarioDefinition(dme)).toContain(
      "Scenario edit policy open mode must not contain allowed fields.",
    );
  });

  it("keeps Apply and Restore scoped to an explicitly student-operable field", () => {
    const vorStore = createVorPmdtStore();
    const vorScenario = createDefaultDvor1150aScenarioDefinition();
    vorScenario.configuration.transmitters.tx1.nominal.outputPower = 80;
    expect(vorStore.getState().startReviewScenario(vorScenario)).toBe(true);
    expect(vorStore.getState().login("SEC3", "THREE")).toBe(true);
    vorStore.getState().setConfigValue("simulation.local", true);
    expect(vorStore.getState().config.simulation.local).toBe(true);
    vorStore.getState().setConfigValue("transmitters.tx1.nominal.outputPower", 70);
    expect(vorStore.getState().applyConfigChanges()).toBe(true);
    expect(vorStore.getState().derived.effectiveTransmitters.tx1.effectiveOutputPower).toBeCloseTo(58.8);
    expect(vorStore.getState().restoreScenario()).toBe(true);
    expect(vorStore.getState().derived.effectiveTransmitters.tx1.effectiveOutputPower).toBeCloseTo(67.2);

    const dmeStore = createDmePmdtStore();
    const dmeScenario = createDefaultDme1119aScenarioDefinition();
    dmeScenario.faultInjections = [{ id: "policy-test-power-loss", kind: "tx-power-loss", transmitter: "tx1", lossDb: 2 }];
    expect(dmeStore.getState().startReviewScenario(dmeScenario)).toBe(true);
    expect(dmeStore.getState().login("SEC3", "THREE")).toBe(true);
    expect(dmeStore.getState().setLocalMode(true)).toBe(true);
    dmeStore.getState().setParameterValue("rmsConfigStation.channelNumber", 41);
    expect(dmeStore.getState().applyConfigChanges()).toBe(true);
    expect(dmeStore.getState().data.rmsConfigStation.channelNumber).toBe(41);
    expect(dmeStore.getState().restoreScenario()).toBe(true);
    expect(dmeStore.getState().data.rmsConfigStation.channelNumber).toBe(
      createDefaultDme1119aScenarioDefinition().configuration.rmsConfigStation.channelNumber,
    );
  });

  it("does not spend the 500 evidence slots on draft keystrokes in either pilot store", () => {
    const vorStore = createVorPmdtStore();
    const vorScenario = createDefaultDvor1150aScenarioDefinition();
    expect(vorStore.getState().startReviewScenario(vorScenario)).toBe(true);
    expect(vorStore.getState().login("SEC3", "THREE")).toBe(true);
    vorStore.getState().setConfigValue("simulation.local", true);
    const vorEvidenceBeforeDraft = vorStore.getState().evidenceStats;
    const vorHistoryBeforeDraft = vorStore.getState().actionHistory.length;
    for (let value = 0; value < 600; value += 1) {
      vorStore.getState().setConfigValue("transmitters.tx1.nominal.outputPower", value % 200);
    }
    expect(vorStore.getState().actionHistory).toHaveLength(vorHistoryBeforeDraft);
    expect(vorStore.getState().evidenceStats).toEqual(vorEvidenceBeforeDraft);
    expect(vorStore.getState().applyConfigChanges()).toBe(true);
    expect(vorStore.getState().evidenceStats.totalEventCount).toBeGreaterThan(vorEvidenceBeforeDraft.totalEventCount);
    expect(vorStore.getState().evidenceStats.totalEventCount).toBeLessThanOrEqual(vorEvidenceBeforeDraft.totalEventCount + 3);

    const dmeStore = createDmePmdtStore();
    const dmeScenario = createDefaultDme1119aScenarioDefinition();
    dmeScenario.faultInjections = [{ id: "draft-cap-test", kind: "tx-power-loss", transmitter: "tx1", lossDb: 2 }];
    expect(dmeStore.getState().startReviewScenario(dmeScenario)).toBe(true);
    expect(dmeStore.getState().login("SEC3", "THREE")).toBe(true);
    expect(dmeStore.getState().setLocalMode(true)).toBe(true);
    const dmeEvidenceBeforeDraft = dmeStore.getState().evidenceStats;
    const dmeHistoryBeforeDraft = dmeStore.getState().actionHistory.length;
    for (let value = 1; value <= 600; value += 1) {
      dmeStore.getState().setParameterValue("rmsConfigStation.channelNumber", value % 126 || 1);
    }
    expect(dmeStore.getState().actionHistory).toHaveLength(dmeHistoryBeforeDraft);
    expect(dmeStore.getState().evidenceStats).toEqual(dmeEvidenceBeforeDraft);
  });
});
