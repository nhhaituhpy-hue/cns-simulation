import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/exams/actions", () => ({
  deleteExamCandidateAction: vi.fn(),
  saveExamCandidateAction: vi.fn(),
  saveExamExaminersAction: vi.fn(),
}));

vi.mock("@/components/exams/candidate-result-editor", () => ({
  CandidateResultEditor: () => <div>Trình nhập kết quả</div>,
}));

import { ExamDetailManager } from "@/components/exams/exam-detail-manager";

afterEach(cleanup);

const baseCandidate = {
  id: "candidate-1",
  fullName: "Nguyễn Hoàng Hải",
  workUnit: "Tuy Hòa",
  email: "hainh@attech.com.vn",
};

function renderManager(officialScore: number | null) {
  render(
    <ExamDetailManager
      examId="exam-1"
      subjects={[{ id: "subject-1", name: "VOR-DME", papers: [{ id: "paper-1", paperNumber: 1, title: "Đề số 1" }] }]}
      initialExaminers={[]}
      candidates={[{
        ...baseCandidate,
        subjects: [{
          id: "candidate-subject-1",
          subjectId: "subject-1",
          subjectName: "VOR-DME",
          examPaperId: "paper-1",
          paperTitle: "Đề số 1",
          officialScore,
          examinerComment: "",
          status: officialScore === null ? "submitted" : "reviewed",
        }],
      }]}
      currentPage={1}
      totalPages={1}
      totalCandidates={1}
    />,
  );
}

describe("ExamDetailManager candidate score column", () => {
  it("opens the result editor from the scored value without a separate result button", async () => {
    const user = userEvent.setup();
    renderManager(80);

    expect(screen.getByRole("columnheader", { name: "Điểm" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Kết quả/ })).not.toBeInTheDocument();

    const candidateName = screen.getByText("Nguyễn Hoàng Hải");
    const email = screen.getByText("hainh@attech.com.vn");
    const scoreTrigger = screen.getByRole("button", { name: "Mở kết quả VOR-DME của Nguyễn Hoàng Hải" });
    expect(candidateName).toHaveClass("text-sm", "font-semibold");
    expect(email).toHaveClass("text-sm");
    expect(email).not.toHaveClass("font-mono", "text-xs");
    expect(scoreTrigger).toHaveClass("candidate-result-trigger", "appearance-none", "bg-transparent", "p-0");
    expect(scoreTrigger.closest("td")).toHaveClass("text-sm", "leading-5");

    await user.click(scoreTrigger);

    expect(screen.getByText("80/100")).toBeInTheDocument();
    expect(screen.getByText("Kết quả chính thức do giám khảo nhập")).toBeInTheDocument();
    expect(screen.getByText("Trình nhập kết quả")).toBeInTheDocument();
  });

  it("uses the submitted status as the result trigger before grading", () => {
    renderManager(null);

    expect(screen.getByRole("button", { name: "Mở kết quả VOR-DME của Nguyễn Hoàng Hải" })).toHaveTextContent("Đã nộp");
  });
});
