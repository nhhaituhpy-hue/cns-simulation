import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScenarioExamDetailManager } from "@/components/scenario-exams/scenario-exam-detail-manager";
import { ScenarioExamSubmissionReviewView } from "@/components/scenario-exams/scenario-exam-submission-review";
import type { ScenarioExamDetail, ScenarioExamSubmissionReview } from "@/lib/scenario-exams/types";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";

const mocks = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/scenario-exams/actions", () => ({ saveScenarioExamReviewAction: mocks.save, issueScenarioExamCodeAction: vi.fn(), setScenarioExamStatusAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: mocks.refresh, prefetch: vi.fn() }), useSearchParams: () => new URLSearchParams() }));

const examId = "11111111-1111-4111-8111-111111111111";
const codeId = "22222222-2222-4222-8222-222222222222";
const itemId = "55555555-5555-4555-8555-555555555555";
const timestamp = "2026-10-01T00:00:00.000Z";
const definition = createDefaultDvor1150aScenarioDefinition();
function review(): ScenarioExamSubmissionReview {
  return { examId, examName: "Kỳ thi Scenario", codeId, codeHint: "7EGD", candidateName: "Thí sinh A", candidateUnit: "Đơn vị A", codeStatus: "submitted", sessionStatus: "submitted", startedAt: timestamp, deadlineAt: timestamp, submittedAt: timestamp,
    subjects: [{ subjectId: "subject-1", moduleId: "dvor-1150a", status: "submitted", itemId, scenarioName: "Scenario đã cấp", revision: 7,
      startedAt: timestamp, submittedAt: timestamp, definition, resultInvalid: false, examinerScore: null, examinerComment: "", reviewedAt: null, reviewedByName: null,
      result: { version: 1, sessionItemId: itemId, moduleId: "dvor-1150a", scenarioId: definition.id, revision: 7, capturedAt: timestamp,
        payload: { answer: { suspectedFault: "Lệch Reference", reasoning: "Đã đo Monitor", remediation: "Căn chỉnh lại Reference" }, checkpoint: { config: { reference: 100 } }, scenarioHardwareSelection: ["card-1"] } } }] };
}

beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue({ ok: true, message: "Đã lưu điểm và nhận xét của giám khảo." }); });
afterEach(cleanup);

describe("examiner submission UI", () => {
  it("colors only submitted text green and opens the correct code's review from the roster", () => {
    const detail: ScenarioExamDetail = { id: examId, name: "Exam", description: "", opensAt: null, closesAt: null, durationMinutes: 60, status: "open", availability: "available", codeCount: 1, terminalCodeCount: 1,
      codes: [{ id: codeId, examId, candidateName: "Thí sinh A", candidateUnit: "Đơn vị A", codeHint: "7EGD", status: "submitted", issuedAt: timestamp, redeemedAt: timestamp, terminalAt: timestamp, moduleIds: ["dvor-1150a"], completedModules: 1, subjects: [] }] };
    render(<ScenarioExamDetailManager detail={detail} poolCounts={[]} />);
    const row = screen.getByRole("row", { name: /Thí sinh A/ });
    expect(row.className).not.toMatch(/bg-|opacity/);
    expect(within(row).getByText("submitted")).toHaveClass("text-[var(--color-success)]");
    expect(within(row).getByRole("link", { name: "Thí sinh A" })).toHaveAttribute("href", `/admin/scenario-exams/${examId}/results/${codeId}`);
    expect(within(row).getByRole("link", { name: /Xem bài và chấm điểm/ })).toHaveAttribute("href", `/admin/scenario-exams/${examId}/results/${codeId}`);
  });

  it("shows the saved answer, configuration, module and reference snapshot", () => {
    render(<ScenarioExamSubmissionReviewView review={review()} />);
    expect(screen.getByRole("heading", { name: "DVOR 1150A" })).toBeInTheDocument();
    expect(screen.getAllByText("Lệch Reference").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Đã đo Monitor").length).toBeGreaterThan(0);
    expect(screen.getByText("reference")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText(/Scenario và đáp án tham chiếu đã cấp · revision 7/)).toBeInTheDocument();
  });

  it("shows SOLVED in green as the technical result separately from submitted", () => {
    const data = review(); data.subjects[0].technicalSummary = { status: "SOLVED", solved: true, checks: [{ id: "hardware", label: "Hardware", passed: true, detail: "Correct" }], blockers: [] };
    render(<ScenarioExamSubmissionReviewView review={data} />);
    expect(screen.getByText("SOLVED")).toHaveClass("text-[var(--color-success)]");
    expect(screen.getByLabelText("Trạng thái kỹ thuật bài làm")).toHaveTextContent("SOLVED");
    expect(screen.getAllByText("submitted").length).toBeGreaterThan(0);
  });

  it.each([0, 85.25, 100])("saves %s points with the code/item identity and examiner comment", async (score) => {
    render(<ScenarioExamSubmissionReviewView review={review()} />);
    fireEvent.change(screen.getByLabelText("Điểm giám khảo (0–100)"), { target: { value: String(score) } });
    fireEvent.change(screen.getByLabelText("Nhận xét của giám khảo"), { target: { value: "Chẩn đoán đúng" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm và nhận xét" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ examId, codeId, itemId, score, comment: "Chẩn đoán đúng" }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  });

  it("requires a score and does not send an empty score as zero", async () => {
    render(<ScenarioExamSubmissionReviewView review={review()} />);
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm và nhận xét" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Vui lòng nhập điểm");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("shows the server error and keeps the entered score for retry", async () => {
    mocks.save.mockResolvedValue({ ok: false, message: "Không thể lưu điểm." });
    render(<ScenarioExamSubmissionReviewView review={review()} />);
    fireEvent.change(screen.getByLabelText("Điểm giám khảo (0–100)"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm và nhận xét" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể lưu điểm.");
    expect(screen.getByLabelText("Điểm giám khảo (0–100)" )).toHaveValue(80);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("disables grading for an in-progress subject or missing valid evidence", () => {
    const data = review(); data.subjects[0].status = "in_progress";
    render(<ScenarioExamSubmissionReviewView review={data} />);
    expect(screen.getByRole("button", { name: "Lưu điểm và nhận xét" })).toBeDisabled();
    expect(screen.getByLabelText("Điểm giám khảo (0–100)" )).toBeDisabled();
  });
});
