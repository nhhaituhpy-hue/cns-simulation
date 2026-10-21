// @vitest-environment node
import { expect, it } from "vitest";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import { applyAnalysisProposal, confirmedAuthoringSections, createAuthoringState, mutateAuthoringState } from "@/lib/ai/scenario-authoring/state";
import type { AuthoringState } from "@/lib/ai/scenario-authoring/types";

function confirmed(): AuthoringState {
  let state = createAuthoringState("dvor-1150a", "confirmation-dependencies");
  for (const section of authoringAdapterFor(state.moduleId).form(state.definition).sections) {
    state = mutateAuthoringState(state, { action: "confirm", sectionId: section.id });
  }
  expect(confirmedAuthoringSections(state)).toEqual(["metadata", "initial", "faults", "criteria", "diagnosis", "permissions"]);
  return state;
}
it.each(["navigate", "same-values"])("preserves confirmed hashes and pending guidance for %s without a semantic edit", action => {
  let state = confirmed();
  state = applyAnalysisProposal(state, {
    id: "no-op-guidance", baseRevision: 1, kind: "guidance", sectionId: "faults", message: "Review current faults", changes: [], issues: [],
    coverage: { documents: 0, charactersRead: 0, charactersAvailable: 0, truncated: false },
  });
  const hashes = structuredClone(state.confirmations);
  const sources = structuredClone(state.sources);
  if (action === "navigate") state = mutateAuthoringState(state, { action: "navigate", sectionId: "criteria" });
  else state = mutateAuthoringState(state, { action: "edit", changes: authoringAdapterFor(state.moduleId).form(state.definition).fields.filter(field => !field.schema.readOnly).map(({ id, value }) => ({ fieldId: id, value })) });
  expect(state.confirmations).toEqual(hashes);
  expect(state.proposal?.id).toBe("no-op-guidance");
  expect(state.sources).toEqual(sources);
});
it("invalidates goal-dependent confirmations after editing description", () => {
  let state = confirmed();
  state = mutateAuthoringState(state, { action: "edit", changes: [{ fieldId: "description", value: "New goal: diagnose a different failure before changing controls." }] });
  for (const id of ["metadata", "faults", "criteria", "diagnosis", "permissions"]) {
    expect(confirmedAuthoringSections(state), id).not.toContain(id);
  }
  expect(state.confirmations.permissions).toBeUndefined();
});
