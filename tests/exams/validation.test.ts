import { describe, expect, it } from "vitest";

import {
  ExamValidationError,
  validateCandidateInput,
  validateCandidateResultInput,
  validateExamSetInput,
} from "@/lib/exams/validation";

const SUBJECT_ID = "10000000-0000-4000-8000-000000000001";
const PAPER_ID = "20000000-0000-4000-8000-000000000001";
const EXAM_ID = "30000000-0000-4000-8000-000000000001";
const CANDIDATE_SUBJECT_ID = "40000000-0000-4000-8000-000000000001";

describe("exam management validation", () => {
  it("accepts a VOR-DME paper containing scenarios from both modules", () => {
    const parsed = validateExamSetInput({
      name: "Bộ đề năng định CNS 2026",
      description: "Đợt 1",
      subjects: [{
        subjectId: SUBJECT_ID,
        papers: [{
          paperNumber: 1,
          title: "Đề số 1",
          scenarios: [
            { moduleCode: "vor", scenarioId: "vor-01", position: 1 },
            { moduleCode: "dme", scenarioId: "dme-01", position: 2 },
          ],
        }],
      }],
    });

    expect(parsed.subjects[0].papers[0].scenarios.map((item) => item.moduleCode)).toEqual(["vor", "dme"]);
  });

  it("rejects duplicate subjects in one exam set", () => {
    const subject = {
      subjectId: SUBJECT_ID,
      papers: [{
        paperNumber: 1,
        title: "Đề số 1",
        scenarios: [{ moduleCode: "vor", scenarioId: "vor-01" }],
      }],
    };

    expect(() => validateExamSetInput({ name: "Bộ đề trùng môn", subjects: [subject, subject] }))
      .toThrow(ExamValidationError);
  });

  it("requires an exact ATTECH work email for candidates", () => {
    expect(() => validateCandidateInput({
      examId: EXAM_ID,
      fullName: "Nguyễn Văn A",
      workUnit: "Trung tâm CNS",
      email: "nguyenvana@example.com",
      subjects: [{ subjectId: SUBJECT_ID, examPaperId: PAPER_ID }],
    })).toThrow("@attech.com.vn");
  });

  it("accepts score zero but rejects blank or null official results", () => {
    expect(validateCandidateResultInput({
      candidateSubjectId: CANDIDATE_SUBJECT_ID,
      officialScore: 0,
      examinerComment: "Đã chấm",
    }).officialScore).toBe(0);

    expect(() => validateCandidateResultInput({
      candidateSubjectId: CANDIDATE_SUBJECT_ID,
      officialScore: "",
    })).toThrow("0-100");

    expect(() => validateCandidateResultInput({
      candidateSubjectId: CANDIDATE_SUBJECT_ID,
      officialScore: null,
    })).toThrow("0-100");
  });
});
