import { expect, it } from "vitest";
import type { ScenarioRubric } from "@/lib/ai/scenario-blueprint/types";

it("allows a credential-free ADS-B role-login goal without relaxing uploaded citation quarantine", async () => {
 const { validateBlueprintInput, publicText, sensitiveText, validateManualCitations } = await import("@/lib/ai/scenario-blueprint/validation");
 const description="Thí sinh kiểm tra cấu hình ASTERIX, đăng nhập vai trò phù hợp và đặt SAC=95, SIC=164 theo mục tiêu mô phỏng.";
 expect(() => validateBlueprintInput({moduleId:"ads-b",description,mode:"description"})).not.toThrow();
 expect(publicText("Đăng nhập vai trò phù hợp rồi chỉnh cấu hình ASTERIX")).toBe(true);
 expect(sensitiveText("Login\nsynthetic-upload-secret")).toBe(true);
 const citation={id:"c1",documentId:"upload",documentName:"Manual",sha256:"a".repeat(64),segmentLabel:"Section 4",quote:"Login\nsynthetic-upload-secret",sourceKind:"uploaded"};
 expect(() => validateManualCitations([citation])).toThrow();
 expect(() => validateBlueprintInput({moduleId:"ads-b",description:"Password\nsynthetic-upload-secret",mode:"description"})).toThrow();
 expect(() => validateBlueprintInput({moduleId:"ads-b",description:"Login synthetic-upload-secret",mode:"description"})).toThrow();
});

it("validates a snapshot-safe rubric with an actual parameter step rather than counting technical checks", async () => {
  const path = "../../src/lib/ai/scenario-blueprint/validation";
  const api = await import(path).catch(() => null);
  expect(api?.validateScenarioRubric, "rubric validator must exist").toBeTypeOf("function");
  const rubric: ScenarioRubric = {
    version: 1, moduleId: "dvor-1150a",
    citations: [{ id: "manual-1", documentId: "manual", documentName: "DVOR 1150A manual (test fixture)", sha256: "a".repeat(64), segmentLabel: "Section 4", quote: "Apply the transmitter settings.", sourceKind: "uploaded" }],
    parameterRelevance: [{ fieldId: "configuration.transmitters.tx1.nominal.outputPower", label: "Output power", initialValue: 13.7, targetValue: 125, reason: "Simulation assumption, not a manufacturer threshold", citationIds: ["manual-1"] }],
    steps: [{ id: "restore-power", label: "Apply output power", required: true, prerequisites: [], alternatives: [[{ kind: "parameter", fieldId: "transmitters.tx1.nominal.outputPower", value: 125 }, { kind: "action", controlId: "config-apply" }]], citationIds: ["manual-1"] }],
  };
  expect(api!.validateScenarioRubric(rubric, "dvor-1150a")).toEqual(rubric);
});

it.each([
 {kind:"split password",payload:"Password\nsynthetic-upload-secret"},
 {kind:"localized split label",payload:"Mật\nkhẩu\nsynthetic-upload-secret"},
 {kind:"API token",payload:"API token\nsynthetic-upload-secret"},
 {kind:"API key",payload:"API\nkey\nsynthetic-upload-secret"},
 {kind:"access token",payload:"Access\nToken\nsynthetic-upload-secret"},
 {kind:"encrypted PEM",payload:"-----BEGIN ENCRYPTED PRIVATE KEY-----\nsynthetic-upload-secret"},
 {kind:"opaque material",payload:"sYnThEtIc".repeat(12)},
])("rejects unsafe $kind citation text when the snapshot validator is called directly", async ({payload}) => {
 const { validateManualCitations } = await import("@/lib/ai/scenario-blueprint/validation");
 const citation = { id:"c1",documentId:"upload",documentName:"Manual",sha256:"a".repeat(64),segmentLabel:"Section 4",quote:"Apply settings.\n"+payload,sourceKind:"uploaded" };
 const outcome=(() => {try {validateManualCitations([citation]);return "accepted";}catch {return "rejected";}})();
 expect(outcome).toBe("rejected");
});

it("fails closed on forged, cyclic and technical-only procedure rubrics", async () => {
  const { validateScenarioRubric } = await import("@/lib/ai/scenario-blueprint/validation");
  const citation = { id: "c1", documentId: "doc", documentName: "DVOR 1150A", sha256: "a".repeat(64), segmentLabel: "Section A", quote: "Apply the transmitter settings.", sourceKind: "uploaded" as const };
  const base: ScenarioRubric = { version: 1, moduleId: "dvor-1150a", citations: [citation], parameterRelevance: [], steps: [{ id: "apply", label: "Apply", required: true, prerequisites: [], alternatives: [[{ kind: "action", controlId: "config-apply" }]], citationIds: ["c1"] }] };
  const invalid: unknown[] = [
    { ...base, unexpected: true },
    { ...base, steps: [] },
    { ...base, steps: [{ ...base.steps[0], alternatives: [[{ kind: "technical-check", checkId: "normal" }]] }] },
    { ...base, steps: [{ ...base.steps[0], prerequisites: ["missing"] }] },
    { ...base, steps: [{ ...base.steps[0], prerequisites: ["apply"] }] },
    { ...base, steps: [base.steps[0], base.steps[0]] },
    { ...base, steps: [{ ...base.steps[0], citationIds: ["missing"] }] },
    { ...base, steps: [{ ...base.steps[0], alternatives: [[{ kind: "parameter", fieldId: "x", value: 1, tolerance: Infinity }]] }] },
    { ...base, citations: [{ ...citation, sha256: "invented" }] },
    JSON.parse(JSON.stringify(base).replace('"controlId":"config-apply"', '"controlId":"config-apply","__proto__":{"polluted":true}')),
  ];
  for (const value of invalid) expect(() => validateScenarioRubric(value, "dvor-1150a")).toThrow();
  const cycle = structuredClone(base);
  cycle.steps.push({ ...structuredClone(base.steps[0]), id: "other", prerequisites: ["apply"] });
  cycle.steps[0].prerequisites = ["other"];
  expect(() => validateScenarioRubric(cycle, "dvor-1150a")).toThrow();
});
