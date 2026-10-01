import { legacyScenarioEditPolicy, type ScenarioEditPolicy } from "./scenario-policy";

interface PolicyDraft {
  editPolicy?: ScenarioEditPolicy;
  studentEditableFieldIds: string[];
}

/** Keep the last explicit selection when switching through Open. */
export function scenarioEditPolicyChange(draft: PolicyDraft, mode: ScenarioEditPolicy["mode"]): PolicyDraft {
  const policy = legacyScenarioEditPolicy(draft.editPolicy, draft.studentEditableFieldIds);
  const selected = policy.mode === "restricted" ? policy.allowedFieldIds : draft.studentEditableFieldIds;
  return {
    studentEditableFieldIds: [...selected],
    editPolicy: mode === "open" ? { mode: "open" } : { mode: "restricted", allowedFieldIds: [...selected] },
  };
}

export function scenarioEditableFieldChange(draft: PolicyDraft, fieldId: string, checked: boolean): PolicyDraft {
  const policy = legacyScenarioEditPolicy(draft.editPolicy, draft.studentEditableFieldIds);
  const selected = policy.mode === "restricted" ? policy.allowedFieldIds : draft.studentEditableFieldIds;
  const nextIds = checked ? [...new Set([...selected, fieldId])] : selected.filter((id) => id !== fieldId);
  return { studentEditableFieldIds: nextIds, editPolicy: { mode: "restricted", allowedFieldIds: [...nextIds] } };
}
