import { describe, expect, it } from "vitest";
import { storageKey } from "@/components/scenario/scenario-session-persistence";
import { createDefaultDme1119aScenarioDefinition } from "@/lib/dme1119a";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a";
import { createScenarioEvidenceStats } from "@/lib/scenario-evidence";
import { createDmePmdtStore } from "@/stores/dme-pmdt-store";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";

describe("scenario evidence recovery", () => {
  it("namespaces browser checkpoints by user, session and revision", () => {
    const first = storageKey("dme", "student-a", "assignment-1", "scenario-1", "revision-3");
    const otherUser = storageKey("dme", "student-b", "assignment-1", "scenario-1", "revision-3");
    const otherRevision = storageKey("dme", "student-a", "assignment-1", "scenario-1", "revision-4");

    expect(first).not.toBe(otherUser);
    expect(first).not.toBe(otherRevision);
    expect(first).toContain("student-a");
    expect(first).toContain("revision-3");
  });

  it("keeps the review session identity and published revision on the pilot stores", () => {
    const vorStore = createVorPmdtStore();
    expect(vorStore.getState().startReviewScenario(createDefaultDvor1150aScenarioDefinition(), {
      userId: "student-a",
      sessionKey: "practice:student-a:scenario-1",
      revisionKey: "membership:7",
    })).toBe(true);
    expect(vorStore.getState()).toMatchObject({
      userId: "student-a",
      sessionKey: "practice:student-a:scenario-1",
      scenarioRevisionKey: "membership:7",
    });

    const dmeStore = createDmePmdtStore();
    const dmeDefinition = createDefaultDme1119aScenarioDefinition();
    dmeDefinition.faultInjections = [{ id: "identity-test-fault", kind: "tx-power-loss", transmitter: "tx1", lossDb: 2 }];
    expect(dmeStore.getState().startReviewScenario(dmeDefinition, {
      userId: "student-a",
      sessionKey: "practice:student-a:scenario-2",
      revisionKey: "membership:4",
    })).toBe(true);
    expect(dmeStore.getState()).toMatchObject({
      userId: "student-a",
      sessionKey: "practice:student-a:scenario-2",
      scenarioRevisionKey: "membership:4",
    });
  });

  it("restores DVOR applied/draft/backup state together with capped evidence metadata", () => {
    const store = createVorPmdtStore();
    const definition = createDefaultDvor1150aScenarioDefinition();
    expect(store.getState().startReviewScenario(definition)).toBe(true);
    const state = store.getState();
    const config = structuredClone(state.config);
    const configDraft = structuredClone(state.configDraft);
    config.transmitters.tx1.nominal.outputPower = 65;
    configDraft.transmitters.tx1.nominal.outputPower = 66;

    store.getState().restoreScenarioEvidence({
      actionHistory: [],
      attemptEvents: [],
      evidenceStats: { totalEventCount: 501, storedEventCount: 500, droppedCount: 1, evidenceTruncated: true, lastSequence: 501 },
      checkpoint: {
        config,
        configDraft,
        configurationBackup: structuredClone(state.configurationBackup),
        configDirty: true,
        needBackup: true,
        scenarioStage: "pmdt",
        diagnosticState: structuredClone(state.diagnosticState),
      },
    });

    expect(store.getState().config.transmitters.tx1.nominal.outputPower).toBe(65);
    expect(store.getState().configDraft.transmitters.tx1.nominal.outputPower).toBe(66);
    expect(store.getState().configDirty).toBe(true);
    expect(store.getState().needBackup).toBe(true);
    expect(store.getState().evidenceStats.evidenceTruncated).toBe(true);
  });

  it("restores DME runtime data without replacing current security accounts", () => {
    const store = createDmePmdtStore();
    const definition = createDefaultDme1119aScenarioDefinition();
    definition.faultInjections = [{ id: "recovery-test-fault", kind: "tx-power-loss", transmitter: "tx1", lossDb: 2 }];
    expect(store.getState().startReviewScenario(definition)).toBe(true);
    expect(store.getState().login("SEC3", "THREE")).toBe(true);
    const accounts = structuredClone(store.getState().data.securityAccounts);
    const data = structuredClone(store.getState().data);
    data.rmsConfigStation.channelNumber = 44;
    data.securityAccounts = [];

    store.getState().restoreScenarioEvidence({
      actionHistory: [],
      attemptEvents: [],
      evidenceStats: createScenarioEvidenceStats(),
      checkpoint: {
        data,
        configDraft: structuredClone(data),
        configurationBackup: null,
        savedConfiguration: null,
        configDirty: false,
        needBackup: false,
        scenarioStage: "pmdt",
        scenarioDiagnosticState: { run: null, completed: false, subsystem: null, result: null },
      },
    });

    expect(store.getState().data.rmsConfigStation.channelNumber).toBe(44);
    expect(store.getState().data.securityAccounts).toEqual(accounts);
  });
});
