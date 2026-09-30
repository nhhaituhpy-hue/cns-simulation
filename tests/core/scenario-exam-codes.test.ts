import { describe, expect, it } from "vitest";
import {
  generateScenarioExamCode,
  hashScenarioExamCode,
  isScenarioExamCode,
  normalizeScenarioExamCode,
} from "@/lib/scenario-exams/codes";

describe("scenario exam code utility", () => {
  it("generates a readable one-time code without ambiguous characters", () => {
    const generated = generateScenarioExamCode();

    expect(isScenarioExamCode(generated.value)).toBe(true);
    expect(generated.value).toHaveLength(12);
    expect(generated.hint).toBe(generated.value.slice(-4));
    expect(generated.hash).toBe(hashScenarioExamCode(generated.value));
  });

  it("normalizes spaces, separators and case before hashing", () => {
    expect(normalizeScenarioExamCode(" abcd-2345-efgh ")).toBe("ABCD2345EFGH");
    expect(hashScenarioExamCode("abcd-2345-efgh")).toBe(hashScenarioExamCode("ABCD2345EFGH"));
  });

  it("rejects malformed or ambiguous codes", () => {
    expect(isScenarioExamCode("ABCD2345EFG")).toBe(false);
    expect(isScenarioExamCode("ABCD2345EFOH")).toBe(false);
    expect(isScenarioExamCode("NguyenHoangHai" )).toBe(false);
  });
});
