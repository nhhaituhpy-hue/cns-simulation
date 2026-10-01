import { describe, expect, it } from "vitest";
import { scenarioEditPolicyChange, scenarioEditableFieldChange } from "@/lib/scenario-policy-draft";

describe("scenario authoring policy draft", () => {
  it("keeps the explicit selection when switching through Open despite a different legacy list", () => {
    const draft = {
      studentEditableFieldIds: ["legacy-field"],
      editPolicy: { mode: "restricted" as const, allowedFieldIds: ["selected-field"] },
    };
    const before = structuredClone(draft);
    const open = scenarioEditPolicyChange(draft, "open");
    expect(open.editPolicy).toEqual({ mode: "open" });
    expect(scenarioEditPolicyChange(open, "restricted")).toEqual({
      studentEditableFieldIds: ["selected-field"],
      editPolicy: { mode: "restricted", allowedFieldIds: ["selected-field"] },
    });
    expect(draft).toEqual(before);
  });

  it("retains an empty legacy whitelist instead of granting fields after a mode round trip", () => {
    const open = scenarioEditPolicyChange({ studentEditableFieldIds: [] }, "open");
    expect(scenarioEditPolicyChange(open, "restricted")).toEqual({
      studentEditableFieldIds: [], editPolicy: { mode: "restricted", allowedFieldIds: [] },
    });
  });

  it("changes the authoritative selection and synchronizes the legacy list without duplicate fields", () => {
    const draft = {
      studentEditableFieldIds: ["legacy-field"],
      editPolicy: { mode: "restricted" as const, allowedFieldIds: ["selected-field"] },
    };
    const added = scenarioEditableFieldChange(draft, "new-field", true);
    expect(scenarioEditableFieldChange(added, "new-field", true)).toEqual(added);
    expect(scenarioEditableFieldChange(added, "selected-field", false)).toEqual({
      studentEditableFieldIds: ["new-field"],
      editPolicy: { mode: "restricted", allowedFieldIds: ["new-field"] },
    });
  });
});
