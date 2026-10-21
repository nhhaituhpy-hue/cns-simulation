// @vitest-environment node
import { describe, expect, it } from "vitest";
import { adsbAuthoringAdapter as adapter } from "@/lib/ai/scenario-authoring/forms/adsb";
import { applyAnalysisProposal, createAuthoringState, mutateAuthoringState } from "@/lib/ai/scenario-authoring/state";
import { readPath, writePath } from "@/lib/ai/scenario-authoring/forms/helpers";
import type { AuthoringProposal, AuthoringState, JsonValue } from "@/lib/ai/scenario-authoring/types";

const general = "sites.0.sensorA.dataProfile.general";
const limit = `${general}.targetOverloadLimit`;
const documentSource = { kind: "document", documentId: "manual-1", quote: "Target overload limit: 888" } as const;
function withLimit(state: AuthoringState, fieldId: string, value: number): JsonValue {
  const next = structuredClone(state.definition);
  writePath(next, limit, value);
  return adapter.form(next).fields.find(field => field.id === fieldId)!.value;
}
function baseline(state: AuthoringState, value = 888, id = "p1"): AuthoringProposal {
  return {
    id, baseRevision: 1, kind: "baseline", message: "Manual baseline",
    changes: [{ fieldId: general, value: withLimit(state, general, value), source: documentSource, reason: "Normal limit" }],
    issues: [], coverage: { documents: 1, charactersAvailable: 100, charactersRead: 100, truncated: false },
  };
}

describe("native ADS-B overlapping authoring fields", () => {
  it("invalidates a descendant preview when a newer parent edit is saved", () => {
    let state = createAuthoringState("ads-b", "preview-edit");
    const pending = baseline(state);
    // Keep an unrelated proposal so both dismiss and apply-unchecked paths remain exercisable.
    pending.changes.push({ fieldId: "sites.0.name", value: "Manual station", source: documentSource, reason: "Station name" });
    state = applyAnalysisProposal(state, pending);
    expect(readPath(state.definition, limit)).toBe(888);
    state = mutateAuthoringState(state, { action: "edit", changes: [{ fieldId: "sites", value: withLimit(state, "sites", 777) }] });
    expect(state.proposal?.changes.map(change => change.fieldId) ?? []).not.toContain(general);
    expect(state.proposal?.prefilledFieldIds ?? []).not.toContain(general);
    expect(() => mutateAuthoringState(state, { action: "apply-proposal", proposalId: "p1", fieldIds: [general] })).toThrow();
    if (state.proposal) state = mutateAuthoringState(state, { action: "dismiss-proposal", proposalId: "p1" });
    expect(readPath(state.definition, limit)).toBe(777);
    state = applyAnalysisProposal(state, baseline(state, 999, "p2"));
    expect(readPath(state.definition, limit)).toBe(777);
  });
  it.each(["dismiss", "apply-unchecked"])("%s restores an untouched sibling preview without losing the meaningful parent edit", action => {
    let state = createAuthoringState("ads-b", `sibling-${action}`);
    const originalName = readPath(state.definition, "sites.0.name");
    const pending = baseline(state);
    pending.changes.push({ fieldId: "sites.0.name", value: "Manual station", source: documentSource, reason: "Station name" });
    state = applyAnalysisProposal(state, pending);
    state = mutateAuthoringState(state, { action: "edit", changes: [{ fieldId: "sites", value: withLimit(state, "sites", 777) }] });
    expect(state.proposal?.changes.map(change => change.fieldId)).toEqual(["sites.0.name"]);
    expect(state.sources["sites.0.name"].kind).toBe("document");
    state = mutateAuthoringState(state, action === "dismiss" ? { action: "dismiss-proposal", proposalId: "p1" } : { action: "apply-proposal", proposalId: "p1", fieldIds: [] });
    expect(readPath(state.definition, limit)).toBe(777);
    expect(readPath(state.definition, "sites.0.name")).toBe(originalName);
    expect(state.sources.sites.kind).toBe("user");
    expect(state.sources[general].kind).toBe("user");
    expect(state.sources["sites.0.name"].kind).toBe("native-default");
  });
  it("keeps a preview out of the accepted baseline after a parent edit invalidates it", () => {
    let state = createAuthoringState("ads-b", "accepted-baseline");
    state = applyAnalysisProposal(state, baseline(state));
    expect(readPath(state.definition, limit)).toBe(888);
    expect(readPath(state.baseline, limit)).toBe(1400);
    expect(state.baselineSources[general].kind).toBe("native-default");
    state = mutateAuthoringState(state, { action: "edit", changes: [{ fieldId: "sites", value: withLimit(state, "sites", 777) }] });
    state = applyAnalysisProposal(state, baseline(state, 999, "p2"));
    state = mutateAuthoringState(state, { action: "dismiss-proposal", proposalId: "p2" });
    expect(readPath(state.definition, limit)).toBe(777);
    state = mutateAuthoringState(state, { action: "reset-field", fieldId: general });
    expect(readPath(state.definition, limit)).toBe(1400);
  });
  it("updates both parent and child provenance when explicitly accepting and resetting a baseline", () => {
    let state = createAuthoringState("ads-b", "accept-reset");
    state = applyAnalysisProposal(state, baseline(state));
    expect(state.sources.sites.kind).toBe("document");
    state = mutateAuthoringState(state, { action: "apply-proposal", proposalId: "p1", fieldIds: [general] });
    expect(readPath(state.baseline, limit)).toBe(888);
    expect(state.baselineSources.sites.kind).toBe("document");
    expect(state.baselineSources[general].kind).toBe("document");
    state = mutateAuthoringState(state, { action: "edit", changes: [{ fieldId: general, value: withLimit(state, general, 777) }] });
    expect(state.sources.sites.kind).toBe("user");
    state = mutateAuthoringState(state, { action: "reset-field", fieldId: "sites" });
    expect(readPath(state.definition, limit)).toBe(888);
    expect(state.sources[general]).toEqual(state.baselineSources[general]);
    expect(state.sources.sites).toEqual(state.baselineSources.sites);
    state = applyAnalysisProposal(state, baseline(state, 999, "p2"));
    state = mutateAuthoringState(state, { action: "dismiss-proposal", proposalId: "p2" });
    expect(readPath(state.definition, limit)).toBe(888);
  });
  it.each(["sites", general])("resetting %s invalidates overlapping preview selections", fieldId => {
    let state = createAuthoringState("ads-b", "reset-preview");
    state = applyAnalysisProposal(state, baseline(state));
    state = mutateAuthoringState(state, { action: "reset-field", fieldId });
    expect(readPath(state.definition, limit)).toBe(1400);
    expect(state.proposal).toBeNull();
    expect(state.sources.sites.kind).toBe("native-default");
    expect(state.sources[general].kind).toBe("native-default");
    expect(() => mutateAuthoringState(state, { action: "apply-proposal", proposalId: "p1", fieldIds: [general] })).toThrow();
  });
  it.each(["dismiss", "apply-unchecked"])("%s restores aggregate provenance to the accepted baseline", action => {
    let state = createAuthoringState("ads-b", `restore-sources-${action}`);
    state = applyAnalysisProposal(state, baseline(state));
    expect(state.sources.sites.kind).toBe("document");
    state = mutateAuthoringState(state, action === "dismiss" ? { action: "dismiss-proposal", proposalId: "p1" } : { action: "apply-proposal", proposalId: "p1", fieldIds: [] });
    expect(readPath(state.definition, limit)).toBe(1400);
    expect(state.sources.sites.kind).toBe("native-default");
    expect(state.sources[general].kind).toBe("native-default");
    expect(state.baselineSources.sites.kind).toBe("native-default");
  });
  it.each(["dismiss", "apply-unchecked"])("%s safely drops a stale prefilled leaf absent from native and current forms", action => {
    let state = createAuthoringState("ads-b", `stale-${action}`);
    const pending = baseline(state);
    // Older persisted sessions can retain a leaf after an optional sensor was removed.
    const staleId = "sites.0.sensorB.dataProfile.general";
    pending.changes = [{ ...pending.changes[0], fieldId: staleId }];
    pending.prefilledFieldIds = [staleId];
    state.proposal = pending;
    state.sources[staleId] = documentSource;
    const original = structuredClone(state.definition);
    state = mutateAuthoringState(state, action === "dismiss" ? { action: "dismiss-proposal", proposalId: "p1" } : { action: "apply-proposal", proposalId: "p1", fieldIds: [] });
    expect(state.definition).toEqual(original);
    expect(state.proposal).toBeNull();
    expect(state.sources).not.toHaveProperty(staleId);
  });
  it("preserves a parent-control user edit against descendant baseline prefill", () => {
    let state = createAuthoringState("ads-b", "parent-edit");
    const original = structuredClone(state);
    state = mutateAuthoringState(state, { action: "edit", changes: [{ fieldId: "sites", value: withLimit(state, "sites", 777) }] });
    expect(state.sources[general].kind).toBe("user");
    expect(state.sources.sites.kind).toBe("user");
    state = applyAnalysisProposal(state, baseline(state));
    expect(readPath(state.definition, limit)).toBe(777);
    expect(state.proposal?.prefilledFieldIds ?? []).not.toContain(general);
    state = mutateAuthoringState(state, { action: "dismiss-proposal", proposalId: "p1" });
    expect(readPath(state.definition, limit)).toBe(777);
    expect(state.sources[general].kind).toBe("user");
    expect(readPath(original.definition, limit)).toBe(1400);
  });
});
