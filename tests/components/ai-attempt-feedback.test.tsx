import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScenarioExamScoreEditor } from "@/components/scenario-exams/scenario-exam-score-editor";
import type { ScenarioExamReviewSubject } from "@/lib/scenario-exams/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/scenario-exams/actions", () => ({
  saveScenarioExamReviewAction: vi.fn(async () => ({ ok: true, message: "Đã lưu điểm." })),
}));

describe("Practice & examiner AI feedback UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("opens practice AI feedback on click and displays what to achieve, correct actions, and redundant/wrong adjustments", async () => {
    const { PracticeAiFeedbackButton } = await import("@/components/scenario/practice-ai-feedback-button");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          feedback: {
            moduleId: "dvor-1150a",
            scenarioId: "s-dvor-1",
            scenarioName: "Suy giảm công suất TX1",
            status: "IN_PROGRESS",
            solved: false,
            sourceMode: "ai-assisted",
            summary: "Bạn đã kiểm tra đúng màn hình giám sát nhưng chưa nhấn F7 Apply.",
            whatToAchieve: ["[Cần đạt] Integral Monitor ở trạng thái Normal"],
            correctActions: ["Đã mở màn hình Monitors >> Data >> Integrity"],
            redundantOrWrongAdjustments: ["Đang có thông số thay đổi nhưng chưa nhấn F7 (Apply)"],
            nextSteps: ["Nhấn F7 để áp dụng công suất danh định"],
            suggestedExaminerComment: "Cần nhấn F7 Apply.",
            references: [
              {
                documentName: "ATTECH DVOR 1150A [operating-procedure; reference-only]",
                segmentLabel: "PDF page 12",
                sha256: "a".repeat(64),
              },
            ],
            notice: "Nhận xét hỗ trợ ôn tập.",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <PracticeAiFeedbackButton
        moduleId="dvor-1150a"
        scenarioId="s-dvor-1"
        scenarioName="Suy giảm công suất TX1"
        getPayload={() => ({ visitedViewIds: ["monitor-integrity"] })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /AI nhận xét bài làm/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /AI nhận xét bài làm/i })).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/practice-feedback",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByText(/Bạn đã kiểm tra đúng màn hình giám sát/i)).toBeInTheDocument();
    expect(screen.getByText(/Integral Monitor ở trạng thái Normal/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã mở màn hình Monitors >> Data >> Integrity/i)).toBeInTheDocument();
    expect(screen.getByText(/chưa nhấn F7 \(Apply\)/i)).toBeInTheDocument();
  });

  it("lets the examiner request AI review feedback and insert the suggested comment without auto-saving score", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          feedback: {
            moduleId: "dvor-1150a",
            scenarioId: "s-dvor-1",
            scenarioName: "Suy giảm công suất TX1",
            status: "SOLVED",
            solved: true,
            sourceMode: "ai-assisted",
            summary: "Thí sinh xử lý đúng nguyên nhân gốc.",
            whatToAchieve: ["[Đã đạt] Integral Monitor Normal"],
            correctActions: ["Bật Monitor Bypass và khôi phục công suất TX1"],
            redundantOrWrongAdjustments: ["Thao tác thừa ở màn hình Ident"],
            nextSteps: [],
            suggestedExaminerComment: "Thí sinh xác định đúng sự cố công suất TX1, còn thao tác thừa ở màn hình Ident.",
            references: [],
            notice: "Tham khảo cho giám khảo.",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const subject: ScenarioExamReviewSubject = {
      subjectId: "sub-1",
      itemId: "11111111-1111-4111-8111-111111111111",
      moduleId: "dvor-1150a",
      status: "submitted",
      scenarioName: "Suy giảm công suất TX1",
      revision: 1,
      startedAt: "2026-10-21T04:00:00.000Z",
      submittedAt: "2026-10-21T04:10:00.000Z",
      definition: null,
      result: {
        version: 1,
        sessionItemId: "11111111-1111-4111-8111-111111111111",
        moduleId: "dvor-1150a",
        scenarioId: "s-dvor-1",
        revision: 1,
        capturedAt: "2026-10-21T04:10:00.000Z",
        payload: { visitedViewIds: ["monitor"] },
      },
      resultInvalid: false,
      examinerScore: null,
      examinerComment: "",
      reviewedAt: null,
      reviewedByName: null,
    };

    render(
      <ScenarioExamScoreEditor
        examId="22222222-2222-4222-8222-222222222222"
        codeId="33333333-3333-4333-8333-333333333333"
        subject={subject}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /AI gợi ý nhận xét/i }));

    await waitFor(() => {
      expect(screen.getByText(/Thí sinh xử lý đúng nguyên nhân gốc/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Bật Monitor Bypass và khôi phục công suất TX1/i)).toBeInTheDocument();
    expect(screen.getByText(/Thao tác thừa ở màn hình Ident/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Đưa vào ô nhận xét/i }));
    const commentBox = screen.getByLabelText(/Nhận xét của giám khảo/i) as HTMLTextAreaElement;
    expect(commentBox.value).toContain("Thí sinh xác định đúng sự cố công suất TX1");
  });
});
