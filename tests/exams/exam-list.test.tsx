import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/exams/actions", () => ({
  archiveExamAction: vi.fn(),
  setExamStatusAction: vi.fn(),
}));

import { ExamList } from "@/components/exams/exam-list";

afterEach(cleanup);

describe("ExamList action hints", () => {
  it("describes each icon action on hover", () => {
    render(<ExamList items={[
      {
        id: "exam-open",
        name: "Kỳ thi đang mở",
        examDate: "2026-07-18",
        locationLabel: "Đà Nẵng",
        decisionBasis: "1234/QĐ-KTQLB",
        examSetName: "Bộ đề 01",
        candidateCount: 1,
        status: "open",
      },
      {
        id: "exam-locked",
        name: "Kỳ thi đã khóa",
        examDate: "2026-07-19",
        locationLabel: "Hà Nội",
        decisionBasis: "1235/QĐ-KTQLB",
        examSetName: "Bộ đề 02",
        candidateCount: 2,
        status: "locked",
      },
    ]} />);

    expect(screen.getAllByTitle("Sửa kỳ thi")).toHaveLength(2);
    expect(screen.getByTitle("Tạm khóa")).toBeInTheDocument();
    expect(screen.getByTitle("Mở lại kỳ thi")).toBeInTheDocument();
    expect(screen.getAllByTitle("Đóng kỳ thi")).toHaveLength(2);
  });
});
