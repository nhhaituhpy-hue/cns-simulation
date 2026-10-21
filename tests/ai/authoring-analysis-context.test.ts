// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { analyzeAuthoring } from "@/lib/ai/scenario-authoring/document-analysis";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import { createAuthoringState, mutateAuthoringState } from "@/lib/ai/scenario-authoring/state";
import type { AuthoringForm } from "@/lib/ai/scenario-authoring/types";

beforeEach(() => vi.stubEnv("CNS_AI_API_KEY", "offline-fixture-only"));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
function provider(changes: unknown[] = []) {
  const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
    expect(init.body).toBeDefined();
    expect(_url).toBeTruthy();
    return new Response(JSON.stringify({choices: [{finish_reason: "stop", message: {content: JSON.stringify({message: "Review", changes, issues: []})}}]}));
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
function draft() {
  const initial = createAuthoringState("dvor-1150a", "context-regression");
  const adapter = authoringAdapterFor(initial.moduleId);
  const power = adapter.form(initial.definition).fields.find(f => f.baselineEligible && f.id.includes("tx1") && f.schema.label === "Output power")!;
  return {power, state: mutateAuthoringState(initial, {action: "edit", changes: [{fieldId: "description", value: "UNIQUE_AUTHOR_GOAL_4829"}, {fieldId: power.id, value: 55}]})};
}
it("guides faults using the current FORM goal and nominal configuration, without extending the mutation catalog", async () => {
  const {power, state} = draft();
  const fetcher = provider();
  const before = structuredClone(state);
  await analyzeAuthoring(state, {kind: "guidance", sectionId: "faults", question: "Propose a power exercise"}, []);
  const payload = JSON.parse(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).messages[1].content);
  expect(payload.draftContext.metadata).toContainEqual(expect.objectContaining({id: "description", value: "UNIQUE_AUTHOR_GOAL_4829"}));
  expect(payload.draftContext.sections.flatMap((s: {fields: unknown[]}) => s.fields)).toContainEqual(expect.objectContaining({id: power.id, value: 55}));
  expect(payload.fields.every((f: {sectionId: string}) => f.sectionId === "faults")).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(state).toEqual(before);
});
it("still rejects a provider attempt to modify a field supplied only as cross-section context", async () => {
  const {power, state} = draft();
  provider([{fieldId: power.id, value: 40, reason: "Not in current step"}]);
  await expect(analyzeAuthoring(state, {kind: "guidance", sectionId: "faults", question: "help"}, [])).rejects.toMatchObject({code: "INVALID_SELECTION"});
});
it("bounds FORM-only context and reports truncation without leaking unknown or typed secret values", async () => {
  const {state} = draft();
  const adapter = authoringAdapterFor(state.moduleId);
  const safe: AuthoringForm = {moduleId: state.moduleId, version: 1, label: "Fixture", notices: [], sections: [{id: "metadata", title: "Goal", help: "Goal"}, {id: "initial", title: "Initial", help: "Initial"}, {id: "faults", title: "Faults", help: "Faults"}], fields: [
    {id: "description", sectionId: "metadata", group: "Goal", schema: {type: "text", label: "Goal", help: "Goal"}, value: "CURRENT_FORM_GOAL", baselineEligible: false},
    {id: "faults", sectionId: "faults", group: "Faults", schema: {type: "number", label: "Fault", help: "Fault"}, value: 0, baselineEligible: false},
    ...Array.from({length: 100}, (_, i) => ({id: `initial${i}`, sectionId: "initial", group: "Initial", schema: {type: "text" as const, label: "Setting", help: "Setting"}, value: "v".repeat(1000), baselineEligible: true})),
    {id: "configuration.unsafe", sectionId: "initial", group: "Unsafe", schema: {type: "object", label: "Unsafe", help: "Unsafe", properties: {password: {type: "text", label: "Password", help: "Private"}}}, value: {password: "TYPED_SECRET_DO_NOT_SEND"}, baselineEligible: true},
    {id: "configuration.extra", sectionId: "initial", group: "Extra", schema: {type: "object", label: "Extra", help: "Extra", properties: {mode: {type: "text", label: "Mode", help: "Mode"}}}, value: {mode: "normal", hidden: "UNKNOWN_SECRET_DO_NOT_SEND"}, baselineEligible: true},
  ]};
  vi.spyOn(adapter, "form").mockReturnValue(safe);
  (state.definition as unknown as Record<string, unknown>).password = "RAW_DEFINITION_SECRET";
  (state.nativeBase as unknown as Record<string, unknown>).password = "RAW_NATIVE_SECRET";
  const fetcher = provider();
  const result = await analyzeAuthoring(state, {kind: "guidance", sectionId: "faults", question: "help"}, []);
  const body = String(fetcher.mock.calls[0][1]?.body);
  const payload = JSON.parse(JSON.parse(body).messages[1].content);
  expect(payload.draftContext).toBeDefined();
  expect(JSON.stringify(payload.draftContext).length).toBeLessThanOrEqual(12000);
  expect(payload.draftContext.metadata).toContainEqual(expect.objectContaining({value: "CURRENT_FORM_GOAL"}));
  expect(payload.draftContext.coverage).toMatchObject({fieldsAvailable: 103, omittedUnsafeFields: 2, truncated: true});
  expect(payload.draftContext.coverage.fieldsIncluded).toBeLessThan(103);
  expect(result.issues).toContainEqual(expect.objectContaining({code: "GUIDANCE_CONTEXT_LIMIT"}));
  for (const secret of ["TYPED_SECRET_DO_NOT_SEND", "UNKNOWN_SECRET_DO_NOT_SEND", "RAW_DEFINITION_SECRET", "RAW_NATIVE_SECRET"]) expect(body).not.toContain(secret);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
