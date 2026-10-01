import { describe, expect, it } from "vitest";
import { validateScenarioExamReviewInput } from "@/lib/scenario-exams/validation";

const input = { examId: "11111111-1111-4111-8111-111111111111", codeId: "22222222-2222-4222-8222-222222222222", itemId: "55555555-5555-4555-8555-555555555555", score: 85.25, comment: "  Chẩn đoán đúng  " };
describe("examiner review validation", () => {
  it.each([0, 30.13, 85.25, 100])("accepts score %s and trims the comment", (score) => {
    expect(validateScenarioExamReviewInput({ ...input, score })).toEqual({ ...input, score, comment: "Chẩn đoán đúng" });
  });
  it.each([-1, 101, NaN, Infinity, "80", null, 80.123])("rejects invalid score %s", (score) => {
    expect(() => validateScenarioExamReviewInput({ ...input, score })).toThrow();
  });
  it("rejects invalid identities and oversized comments", () => {
    expect(() => validateScenarioExamReviewInput({ ...input, itemId: "invalid" })).toThrow();
    expect(() => validateScenarioExamReviewInput({ ...input, comment: "a".repeat(4001) })).toThrow();
  });
});
