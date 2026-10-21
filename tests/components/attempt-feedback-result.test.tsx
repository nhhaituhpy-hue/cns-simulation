import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AttemptFeedbackCard } from "@/components/scenario/practice-ai-feedback-button";
import type { AttemptFeedbackReport } from "@/lib/ai/feedback/attempt-feedback";

const report: AttemptFeedbackReport = {
  moduleId: "dvor-1150a", scenarioId: "s1", scenarioName: "TX1", status: "SOLVED", solved: true,
  sourceMode: "deterministic-only", summary: "Kết quả từ snapshot", whatToAchieve: [], correctActions: [],
  redundantOrWrongAdjustments: [], nextSteps: [], suggestedExaminerComment: "", references: [], notice: "Tư vấn, không thay điểm.",
};
afterEach(cleanup);
describe("step-by-step submitted report", () => {
  it("renders evidence-bound AI explanations without replacing the deterministic summary",()=>{
    render(<AttemptFeedbackCard report={{...report,sourceMode:"ai-assisted",explanations:[{id:"step:one",stepId:"one",text:"Đối chiếu thao tác với căn cứ đã lưu.",evidenceIds:["event-1"],citationIds:[]}]}}/>);
    expect(screen.getByText("Đối chiếu thao tác với căn cứ đã lưu.")).toBeInTheDocument();
    expect(screen.getByText(report.summary)).toBeInTheDocument();
  });
  it("does not label UNVERIFIED as in progress or claim empty evidence means all criteria completed", () => {
    render(<AttemptFeedbackCard report={{ ...report, status: "UNVERIFIED", solved: null }} />);
    expect(screen.getByText("UNVERIFIED · Chưa đủ bằng chứng kỹ thuật")).toBeInTheDocument();
    expect(screen.queryByText(/Đang thực hiện/)).not.toBeInTheDocument();
    expect(screen.queryByText("Đã hoàn thành toàn bộ tiêu chí.")).not.toBeInTheDocument();
    expect(screen.getByText(/Chưa có rubric quy trình/)).toBeInTheDocument();
  });
  it("renders the server's exact step count separately from native SOLVED and links each step to its verified quote", () => {
    const detailed = { ...report, stepAssessment: {
      rubricVersion: 1 as const, correct: 4, totalRequiredSteps: 6,
      steps: [
        { id: "s1", label: "Kiểm tra nguồn", status: "correct" as const, evidenceIds: ["action-1"], citationIds: ["citation-1"] },
        { id: "s2", label: "Đo đầu ra", status: "missing" as const, evidenceIds: [], citationIds: [] },
        { id: "s3", label: "Apply", status: "incorrect" as const, evidenceIds: ["action-2"], citationIds: [] },
        { id: "s4", label: "Ghi kết quả", status: "unverified" as const, evidenceIds: [], citationIds: [] },
      ], unrelatedParameterChanges: [{ fieldId: "b", label: "Tham số B không liên quan", before: 1, after: 2, evidenceIds: [], citationIds: [], reason: "Cần xem xét" }], redundantActions: [{ controlId: "a", label: "Lặp thao tác A", evidenceIds: [], reason: "repeated" as const }], notice: "Đối chiếu rubric đã đóng băng",
    }, citations: [{ id: "citation-1", documentId: "manual-one", documentName: "DVOR manual", sha256: "a".repeat(64), segmentLabel: "Section 5.2", quote: "Verify the power supply.", sourceKind: "reference-only" as const }] };
    render(<AttemptFeedbackCard report={detailed} />);
    expect(screen.getByText("4/6 bước đúng")).toBeInTheDocument();
    expect(screen.getByText(/SOLVED · Đạt tiêu chí kỹ thuật/)).toBeInTheDocument();
    expect(screen.queryByText("SOLVED · Đạt yêu cầu")).not.toBeInTheDocument();
    for (const label of ["Đúng", "Thiếu", "Sai", "Chưa đủ bằng chứng"]) expect(screen.getByText(label)).toBeInTheDocument();
    const step = screen.getByText("Kiểm tra nguồn").closest("li")!;
    expect(within(step).getByText("Verify the power supply.")).toBeInTheDocument();
    expect(within(step).getByText(/Section 5.2/)).toBeInTheDocument();
    expect(within(step).getByText(/a{64}/)).toBeInTheDocument();
    expect(screen.getByText(/Chỉ dùng tham khảo/)).toBeInTheDocument();
    expect(screen.getByText("Tham số B không liên quan")).toBeInTheDocument();
    expect(screen.getByText("Lặp thao tác A")).toBeInTheDocument();
  });
});
