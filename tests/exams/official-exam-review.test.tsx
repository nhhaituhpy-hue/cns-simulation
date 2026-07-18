import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OfficialExamReview } from "@/components/exams/official-exam-review";
import type { AdminCandidateSubjectReview } from "@/lib/exams/types";

vi.mock("@/components/exams/candidate-result-editor", () => ({
  CandidateResultEditor: () => <div data-testid="result-editor">Result editor</div>,
}));

const action = {
  step: 1,
  kind: "menu-selection" as const,
  menuId: "main",
  menuTitle: "Main menu",
  input: "1",
  resultLabel: "System status",
  timestamp: 123,
};

const detail: AdminCandidateSubjectReview = {
  id: "40000000-0000-4000-8000-000000000001",
  examId: "30000000-0000-4000-8000-000000000001",
  examName: "Kỳ thi CNS 2026",
  examStatus: "open",
  candidateName: "Nguyễn Văn A",
  candidateWorkUnit: "Trung tâm CNS",
  candidateEmail: "nguyenvana@attech.com.vn",
  subjectName: "ADS-B",
  paperTitle: "Đề số 1",
  paperNumber: 1,
  status: "submitted",
  officialScore: null,
  examinerComment: null,
  attempt: {
    id: "50000000-0000-4000-8000-000000000001",
    candidateSubjectId: "40000000-0000-4000-8000-000000000001",
    status: "submitted",
    startedAt: "2026-07-18T08:00:00.000Z",
    submittedAt: "2026-07-18T08:15:00.000Z",
    items: [{
      id: "60000000-0000-4000-8000-000000000001",
      attemptId: "50000000-0000-4000-8000-000000000001",
      paperScenarioId: "70000000-0000-4000-8000-000000000001",
      moduleCode: "ads-b",
      scenarioId: "adsb-01",
      scenarioTitle: "Kiểm tra SA",
      position: 1,
      status: "submitted",
      startedAt: "2026-07-18T08:00:00.000Z",
      submittedAt: "2026-07-18T08:15:00.000Z",
      submissionRef: null,
      result: {
        moduleCode: "ads-b",
        selectedActions: [action],
        allActions: [action],
        authenticatedCorrectly: true,
        qcmsMonitoringOpened: true,
        diagnosedComponentIds: [],
        inspectedComponentIds: [],
      },
      scenario: {
        moduleCode: "ads-b",
        scenario: {
          id: "adsb-01",
          title: "Kiểm tra SA",
          description: "Kiểm tra trạng thái cảm biến",
          difficulty: "easy",
          createdAt: "2026-07-18T07:00:00.000Z",
          sites: [],
          targetSensorId: "sensor-a",
          targetLoginUser: "maintenance",
          expectedActions: [action],
        },
      },
    }],
  },
};

describe("OfficialExamReview", () => {
  it("shows submitted ADS-B evidence before the official score editor", () => {
    render(<OfficialExamReview detail={detail} />);

    expect(screen.getByRole("heading", { name: "Nguyễn Văn A" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kiểm tra SA" })).toBeInTheDocument();
    expect(screen.getByText("100/100")).toBeInTheDocument();
    expect(screen.getByText("Đúng tài khoản")).toBeInTheDocument();
    expect(screen.getAllByText("System status")).toHaveLength(2);
    expect(screen.getByTestId("result-editor")).toBeInTheDocument();
  });
});
