import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CandidateScenarioExamSession } from "@/lib/scenario-exams/types";

const mocks = vi.hoisted(() => ({ start: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/scenario-exams/actions", () => ({ startScenarioExamSubjectAction: mocks.start }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { CandidateExamSession } from "@/components/scenario-exams/candidate-exam-session";

const itemId = "55555555-5555-4555-8555-555555555555";
const itemHref = `/student/scenario-exams/session/items/${itemId}`;
const now = Date.parse("2026-10-01T00:00:00.000Z");
function session(overrides: Partial<CandidateScenarioExamSession> = {}): CandidateScenarioExamSession {
  return {
    id: "session-1", examId: "exam-1", examName: "Kỳ thi kiểm thử", candidateName: "Thí sinh", candidateUnit: "Đơn vị",
    status: "in_progress", startedAt: new Date(now).toISOString(), deadlineAt: new Date(now + 3600000).toISOString(), submittedAt: null,
    subjects: [{ id: "subject-1", moduleId: "dvor-1150a", position: 1, status: "not_started", startedAt: null, submittedAt: null, sessionItemId: null, scenarioName: null }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(now);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("candidate subject navigation", () => {
  it("opens the returned assigned item immediately after starting a subject", async () => {
    mocks.start.mockResolvedValue({ ok: true, message: "Đã cấp", data: { id: itemId, moduleId: "dvor-1150a", scenarioName: "Scenario A" } });
    render(<CandidateExamSession session={session()} />);
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu môn" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(itemHref));
    expect(mocks.start).toHaveBeenCalledExactlyOnceWith("subject-1");
    expect(screen.getByRole("link", { name: "Tiếp tục môn" })).toHaveAttribute("href", itemHref);
  });

  it("restores a resume link from a persisted in-progress subject without assigning again", () => {
    const data = session();
    data.subjects[0] = { ...data.subjects[0], status: "in_progress", sessionItemId: itemId, scenarioName: "Scenario A" };
    render(<CandidateExamSession session={data} />);
    expect(screen.getByRole("link", { name: "Tiếp tục môn" })).toHaveAttribute("href", itemHref);
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("keeps the subject unstarted and displays the server error when assignment fails", async () => {
    mocks.start.mockResolvedValue({ ok: false, message: "Môn thi chưa có scenario." });
    render(<CandidateExamSession session={session()} />);
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu môn" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Môn thi chưa có scenario.");
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: "Tiếp tục môn" })).not.toBeInTheDocument();
  });

  it("recovers the button after a network error and tells the candidate to reload the saved session", async () => {
    mocks.start.mockRejectedValue(new Error("offline"));
    render(<CandidateExamSession session={session()} />);
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu môn" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Hãy tải lại phiên thi");
    expect(screen.getByRole("button", { name: "Bắt đầu môn" })).toBeEnabled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it.each(["submitted", "timed_out"] as const)("does not offer resume for a %s subject", (status) => {
    const data = session();
    data.subjects[0] = { ...data.subjects[0], status, sessionItemId: itemId };
    render(<CandidateExamSession session={data} />);
    expect(screen.queryByRole("link", { name: "Tiếp tục môn" })).not.toBeInTheDocument();
  });

  it.each(["submitted", "timed_out", "revoked"] as const)("disables start and resume after the session is %s", (status) => {
    const data = session({ status });
    data.subjects.push({ ...data.subjects[0], id: "subject-2", status: "in_progress", sessionItemId: itemId });
    render(<CandidateExamSession session={data} />);
    expect(screen.getByRole("button", { name: "Bắt đầu môn" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Tiếp tục môn" })).not.toBeInTheDocument();
  });

  it("disables start and resume at the original deadline", () => {
    const data = session({ deadlineAt: new Date(now).toISOString() });
    data.subjects.push({ ...data.subjects[0], id: "subject-2", status: "in_progress", sessionItemId: itemId });
    render(<CandidateExamSession session={data} />);
    expect(screen.getByRole("button", { name: "Bắt đầu môn" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Tiếp tục môn" })).not.toBeInTheDocument();
    expect(screen.getByText("Phiên thi đã hết thời gian.")).toBeInTheDocument();
  });
});
