// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { analyzeAuthoring } from "@/lib/ai/scenario-authoring/document-analysis";
import { createAuthoringState } from "@/lib/ai/scenario-authoring/state";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import type { EvidenceDocument } from "@/lib/ai/scenario-generation/types";

beforeEach(() => vi.stubEnv("CNS_AI_API_KEY", "offline-fixture-only"));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const quote = "TX1 Output power 35 W";
async function analyze(text: string, selectedQuote = quote) {
  const state = createAuthoringState("dvor-1150a", "grounding-regression");
  const field = authoringAdapterFor(state.moduleId).form(state.definition).fields.find(f => f.baselineEligible && f.id.includes("tx1") && f.schema.label === "Output power")!;
  expect(field).toBeDefined();
  const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
    const payload = JSON.parse(JSON.parse(String(init.body)).messages[1].content);
    const changes = payload.fields.some((f: {id: string}) => f.id === field.id) ? [{fieldId: field.id, value: 35, reason: "Source", citation: {documentId: "manual", segmentLabel: "page 1", quote: selectedQuote}}] : [];
    return new Response(JSON.stringify({choices: [{finish_reason: "stop", message: {content: JSON.stringify({message: "Review", changes, issues: []})}}]}));
  });
  vi.stubGlobal("fetch", fetcher);
  const documents: EvidenceDocument[] = [{id: "manual", name: "Manual.txt", sha256: "a".repeat(64), segments: [{label: "page 1", text}]}];
  return {result: await analyzeAuthoring(state, {kind: "baseline", question: "TX1 Output power"}, documents), field, fetcher};
}

it.each([
  ["clipped example", `Example only: ${quote}`],
  ["clipped fault", `Fault injection: ${quote}`],
  ["clipped recovery", `Restore ${quote}`],
  ["unknown phase", quote],
  ["example heading", `# Example only\n\n${quote}`],
  ["fault heading", `Fault injection:\n\n${quote}`],
  ["recovery heading", `# Recovery procedure\n\n${quote}`],
  ["nested nominal in example", `# Example only\n## Normal settings\n${quote}`],
  ["repeated quote with mixed phases", `# Normal settings\n${quote}\n# Fault injection\n${quote}`],
  ["unknown subsection", `# Normal settings\n## Unclassified observations\n${quote}`],
  ["plain fault heading after normal", `Normal settings\nTX2 Output power 70 W\nFault injection procedure\n\n${quote}`],
  ["example preceding sentence", `# Normal settings\nExample only.\n${quote}`],
  ["example same-line sentence", `# Normal settings\nExample only. ${quote}`],
  ["numbered fault heading", `1. Normal settings\nTX2 Output power 70 W\n2. Fault injection\n${quote}`],
])("rejects %s from the original source despite a clipped valid numeric quote", async (_name, text) => {
  const {result, field} = await analyze(text);
  expect(result.changes).toEqual([]);
  expect(result.issues).toContainEqual(expect.objectContaining({code: "UNSUPPORTED_EVIDENCE", fieldId: field.id}));
});

it.each([
  ["explicit nominal assertion", `Normal nominal setting: ${quote}`],
  ["normal section", `# Normal settings\n\n${quote}`],
  ["nominal after a sibling example section", `# Example only\nTX1 Output power 10 W\n# Normal settings\n${quote}`],
])("retains %s as actual nominal evidence", async (_name, text) => {
  const {result, field} = await analyze(text);
  expect(result.changes).toContainEqual(expect.objectContaining({fieldId: field.id, value: 35, source: expect.objectContaining({kind: "document"})}));
});

it.each(["TX1", "Output power", "35 W"])("requires the quote itself to carry the scalar assertion, not only %s", async clipped => {
  expect((await analyze(`Normal nominal setting: ${quote}`, clipped)).result.changes).toEqual([]);
});

it.each([
  "Nominal TX1 Output power is not 35 W",
  "Nominal TX1 Output power at TX2 setting 35 W",
  "Nominal TX1 Output power threshold is 35 W",
  "Nominal TX1 Output power < 35 W",
  "Nominal TX1 Output power 35 W to 50 W",
  "Nominal TX1/TX2 Output power 35 W",
  "Nominal TX2 Output power 35 W, TX1 is under test",
])("does not borrow a number from a different or negated assertion: %s", async text => {
  expect((await analyze(text, text)).result.changes).toEqual([]);
});
