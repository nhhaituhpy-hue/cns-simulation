import { describe, expect, it } from "vitest";
import {
  ScenarioExamValidationError,
  validateIssueScenarioExamCodeInput,
  validateScenarioExamInput,
} from "@/lib/scenario-exams/validation";

describe("Scenario Exam validation", () => {
  it("accepts a multi-module candidate code request", () => {
    expect(
      validateIssueScenarioExamCodeInput({
        examId: "11111111-1111-4111-8111-111111111111",
        candidateName: "Nguyễn Hoàng Hải",
        candidateUnit: "Đài DVOR/DME Tuy Hòa",
        moduleIds: ["dvor-1150a", "dme-1119a"],
      }),
    ).toMatchObject({ moduleIds: ["dvor-1150a", "dme-1119a"] });
  });

  it("rejects duplicate modules and invalid exam duration", () => {
    expect(() => validateIssueScenarioExamCodeInput({
      examId: "11111111-1111-4111-8111-111111111111",
      candidateName: "Nguyễn Hoàng Hải",
      candidateUnit: "Đài DVOR/DME Tuy Hòa",
      moduleIds: ["dvor-1150a", "dvor-1150a"],
    })).toThrow(ScenarioExamValidationError);

    expect(() => validateScenarioExamInput({
      name: "Năng định đợt 2 năm 2026",
      durationMinutes: 0,
    })).toThrow(ScenarioExamValidationError);
  });
});
