import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudentExamList } from "@/components/exams/student-exam-list";

describe("StudentExamList", () => {
  it("keeps a locked in-progress exam visible so the candidate can continue", () => {
    render(<StudentExamList items={[{
      id: "30000000-0000-4000-8000-000000000001",
      name: "Kỳ thi CNS 2026",
      examDate: "2026-07-18",
      locationLabel: "Hà Nội",
      decisionBasis: "Quyết định 123",
      status: "locked",
      candidateName: "Nguyễn Văn A",
      subjectCount: 1,
    }]} />);

    expect(screen.getByText("Kỳ thi đã khóa")).toBeInTheDocument();
    expect(screen.getByText("Tiếp tục lượt đã bắt đầu")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở Kỳ thi CNS 2026" }))
      .toHaveAttribute("href", "/student/exams/30000000-0000-4000-8000-000000000001");
    expect(screen.getByTitle("Mở kỳ thi")).toBeInTheDocument();
  });
});
