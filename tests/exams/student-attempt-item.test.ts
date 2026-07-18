import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getCurrentProfile: vi.fn(),
}));

vi.mock("@/lib/auth/profile", () => ({
  getCurrentProfile: mocks.getCurrentProfile,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { getStudentAttemptItem } from "@/lib/exams/queries";

const examId = "10000000-0000-4000-8000-000000000001";
const candidateSubjectId = "20000000-0000-4000-8000-000000000001";
const attemptId = "30000000-0000-4000-8000-000000000001";
const attemptItemId = "40000000-0000-4000-8000-000000000001";

function queryResult(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  return { select: vi.fn(() => ({ eq })) };
}

describe("getStudentAttemptItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentProfile.mockResolvedValue({
      id: "50000000-0000-4000-8000-000000000001",
      email: "student@attech.com.vn",
      fullName: "Student",
      workUnit: "Unit",
      role: "student",
    });
  });

  it("resolves a submitted item so its route can return to subject progress", async () => {
    const item = {
      id: attemptItemId,
      attempt_id: attemptId,
      paper_scenario_id: "60000000-0000-4000-8000-000000000001",
      module_code: "vor",
      scenario_id: "vor-scenario",
      position: 1,
      status: "submitted",
      started_at: "2026-07-18T00:00:00.000Z",
      submitted_at: "2026-07-18T00:10:00.000Z",
      submission_ref: null,
      result_json: {},
      exam_scenario_catalog: { title: "VOR scenario" },
      exam_attempts: { candidate_subject_id: candidateSubjectId },
    };
    const subject = {
      id: candidateSubjectId,
      exam_id: examId,
      subject_id: "70000000-0000-4000-8000-000000000001",
      exam_paper_id: "80000000-0000-4000-8000-000000000001",
      status: "in_progress",
      exam_candidates: { full_name: "Student", work_unit: "Unit" },
      exams: { name: "Official exam", status: "open" },
      exam_subjects: { name: "VOR/DME" },
      exam_papers: { title: "Paper 1" },
    };
    const attempt = {
      id: attemptId,
      candidate_subject_id: candidateSubjectId,
      status: "in_progress",
      started_at: "2026-07-18T00:00:00.000Z",
      submitted_at: null,
      exam_attempt_items: [item],
    };
    const from = vi.fn((table: string) => {
      if (table === "exam_attempt_items") return queryResult(item);
      if (table === "exam_candidate_subjects") return queryResult(subject);
      if (table === "exam_attempts") return queryResult(attempt);
      throw new Error(`Unexpected table: ${table}`);
    });
    mocks.createClient.mockResolvedValue({ from });

    const detail = await getStudentAttemptItem(attemptItemId);

    expect(detail).toMatchObject({
      id: attemptItemId,
      status: "submitted",
      examId,
      candidateSubjectId,
      returnHref: `/student/exams/${examId}/subjects/${candidateSubjectId}`,
    });
  });
});
