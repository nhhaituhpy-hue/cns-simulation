import { describe, expect, it } from "vitest";
import {
  deserializeVorSubmissions,
  mapRowToVorSubmission,
  serializeVorSubmissions,
} from "@/lib/vor-submission-storage";
import type { VorSubmission } from "@/lib/vor-types";
import { createVorSubmissionStore } from "@/stores/vor-submission-store";

const fixedSubmission: VorSubmission = {
  id: "submission-1",
  scenarioId: "scenario-1",
  studentName: "Nguyễn Văn A",
  studentCode: "HV001",
  status: "submitted",
  startedAt: "2026-07-16T10:00:00.000Z",
  submittedAt: "2026-07-16T10:10:00.000Z",
  events: [
    {
      id: "event-1",
      sequence: 1,
      screenId: "tx-data",
      viewId: "tx-data-main",
      menuPath: ["Transmitters", "Data", "Transmitter Data"],
      title: "Transmitter Data",
      visitedAt: "2026-07-16T10:02:00.000Z",
      annotation: "Công suất Tx #1 bằng 0.",
    },
  ],
  answer: {
    suspectedFault: "Khối khuếch đại công suất Tx #1",
    reasoning: "PMDT hiển thị công suất bằng 0.",
    remediation: "Kiểm tra nguồn và PA Tx #1.",
  },
};

describe("VOR submission persistence", () => {
  it("round-trips local data and maps database JSONB fields", () => {
    expect(deserializeVorSubmissions(serializeVorSubmissions([fixedSubmission]))).toEqual([fixedSubmission]);
    expect(mapRowToVorSubmission({
      id: fixedSubmission.id,
      scenario_id: fixedSubmission.scenarioId,
      student_name: fixedSubmission.studentName,
      student_code: fixedSubmission.studentCode,
      status: fixedSubmission.status,
      started_at: fixedSubmission.startedAt,
      submitted_at: fixedSubmission.submittedAt,
      reviewed_at: null,
      events: fixedSubmission.events,
      answer: fixedSubmission.answer,
      score: null,
      examiner_comment: null,
    })).toEqual(fixedSubmission);
  });

  it("creates and reviews a submission with an examiner score", async () => {
    const store = createVorSubmissionStore({
      storage: window.localStorage,
      request: null,
      generateId: () => "submission-generated",
      now: () => new Date("2026-07-16T11:00:00.000Z"),
    });
    await store.getState().hydrate();
    const created = await store.getState().createSubmission({
      ...fixedSubmission,
      id: undefined,
    } as Omit<VorSubmission, "id">);
    expect(created.id).toBe("submission-generated");

    const reviewed = await store.getState().reviewSubmission(created.id, 85, "Quy trình hợp lý.");
    expect(reviewed).toMatchObject({
      status: "reviewed",
      score: 85,
      examinerComment: "Quy trình hợp lý.",
      reviewedAt: "2026-07-16T11:00:00.000Z",
    });
  });
});
