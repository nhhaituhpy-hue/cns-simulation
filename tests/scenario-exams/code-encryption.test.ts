import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptScenarioExamCode,
  encryptScenarioExamCode,
  isScenarioExamCodeEncryptionKeyConfigured,
} from "@/lib/scenario-exams/code-encryption";
import { hashScenarioExamCode } from "@/lib/scenario-exams/codes";

const examId = "11111111-1111-4111-8111-111111111111";
const code = "ABCD2345EFGH";
const codeHash = hashScenarioExamCode(code);
const testKey = "22".repeat(32);
const previousKey = process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY = testKey;
});

afterEach(() => {
  if (previousKey === undefined) delete process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY;
  else process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY = previousKey;
});

describe("Scenario Exam code encryption", () => {
  it("round-trips a code with an authenticated exam binding", () => {
    const envelope = encryptScenarioExamCode(code, examId, codeHash);

    expect(envelope).toMatch(/^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
    expect(decryptScenarioExamCode(envelope, examId, codeHash)).toBe(code);
    expect(() => decryptScenarioExamCode(envelope, examId, hashScenarioExamCode("WXYZ2345JKLM"))).toThrow("Không thể bảo vệ mã kỳ thi.");
  });

  it("rejects a missing or malformed deployment key", () => {
    delete process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY;
    expect(isScenarioExamCodeEncryptionKeyConfigured()).toBe(false);
    expect(() => encryptScenarioExamCode(code, examId, codeHash)).toThrow("Thiếu cấu hình bảo mật mã kỳ thi.");
    process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY = "not-a-key";
    expect(isScenarioExamCodeEncryptionKeyConfigured()).toBe(false);
  });

  it("rejects a malformed envelope without exposing crypto details", () => {
    expect(() => decryptScenarioExamCode("v1:broken", examId, codeHash)).toThrow("Không thể bảo vệ mã kỳ thi.");
  });
});
