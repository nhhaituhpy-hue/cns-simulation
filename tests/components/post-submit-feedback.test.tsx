import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PracticeAiFeedbackButton } from "@/components/scenario/practice-ai-feedback-button";
import { useScenarioStore } from "@/stores/scenario-store";
import { AttemptFeedbackResult } from "@/components/scenario/attempt-feedback-result";

const report = {
  moduleId: "dvor-1150a", scenarioId: "practice-one", scenarioName: "Công suất TX1", status: "SOLVED", solved: true,
  sourceMode: "deterministic-only", summary: "Nhận xét snapshot đã nộp", whatToAchieve: [], correctActions: [],
  redundantOrWrongAdjustments: [], nextSteps: [], suggestedExaminerComment: "Đã đối chiếu", references: [], notice: "Không thay điểm chính thức.",
};
const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
const props = { moduleId: "dvor-1150a" as const, scenarioId: "practice-one", getPayload: () => ({ checkpoint: { value: 1 } }) };

beforeEach(() => { useScenarioStore.setState({ sessionIdentity: "student-one", sessionScope: "practice" }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("durable practice submission feedback", () => {
  it("provides one submit-and-evaluate action, not an independent pre-submit grading action", () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    render(<PracticeAiFeedbackButton {...props} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Nộp bài ôn tập" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "AI nhận xét bài làm" })).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("reports an invalid completed response instead of waiting forever or inventing a report", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ status: "completed" }));
    render(<AttemptFeedbackResult target={{ practiceSubmissionId: "invalid-result" }} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/không hợp lệ/i);
    expect(screen.getByRole("button", { name: "Tải lại nhận xét" })).toBeEnabled();
  });
  it("ignores a late submission ACK after identity changes and never saves it under the next owner", async () => {
    let acknowledge!: (value: Response) => void;
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => new Promise((resolve) => { acknowledge = resolve; }));
    render(<PracticeAiFeedbackButton {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài ôn tập" }));
    act(() => useScenarioStore.setState({ sessionIdentity: "different-owner" }));
    await act(async () => acknowledge(json({ submissionId: "old-owner-submission" })));
    expect(fetcher).toHaveBeenCalledOnce();
    expect((fetcher.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(true);
    expect(screen.queryByRole("region", { name: "Nhận xét sau nộp" })).not.toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);
  });
  it("clears the previous report when the native attempt changes without remounting the module", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ submissionId: "first" })).mockResolvedValueOnce(json({ status: "completed", feedback: report }));
    const view = render(<PracticeAiFeedbackButton {...props} attemptKey="first" />);
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài ôn tập" }));
    await screen.findByText(report.summary);
    view.rerender(<PracticeAiFeedbackButton {...props} attemptKey="second" />);
    expect(screen.queryByText(report.summary)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nộp bài ôn tập" })).toBeEnabled();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not offer a fake restart when no simulator reset callback is supplied", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ submissionId: "no-reset" })).mockResolvedValueOnce(json({ status: "completed", feedback: report }));
    render(<PracticeAiFeedbackButton {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài ôn tập" }));
    await screen.findByText(report.summary);
    expect(screen.queryByRole("button", { name: "Bắt đầu lượt ôn tập mới" })).not.toBeInTheDocument();
  });
  it("aborts a stalled feedback read and offers a read-only retry", async () => {
    vi.useFakeTimers();
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => new Promise(() => {}));
    render(<AttemptFeedbackResult target={{ practiceSubmissionId: "stalled" }} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect((fetcher.mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(true);
    expect(screen.getByRole("alert")).toHaveTextContent(/quá thời gian/i);
    expect(screen.getByRole("button", { name: "Tải lại nhận xét" })).toBeEnabled();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("allows a corrected payload and new key after an explicit HTTP rejection", async () => {
    let value = 1;
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ error: "Bài chưa hợp lệ" }), { status: 400 }))
      .mockResolvedValueOnce(json({ submissionId: "corrected" })).mockResolvedValueOnce(json({ status: "completed", feedback: report }));
    render(<PracticeAiFeedbackButton {...props} getPayload={() => ({ value })} />);
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài ôn tập" }));
    await screen.findByRole("alert");
    value = 2;
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài ôn tập" }));
    await screen.findByText(report.summary);
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body)).payload.value).toBe(2);
    expect(fetcher.mock.calls[1][1]?.headers).not.toEqual(fetcher.mock.calls[0][1]?.headers);
  });
  it("strips simulator credentials and source definitions before freezing a submission body", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ submissionId: "sanitized-one" })).mockResolvedValueOnce(json({ status: "completed", feedback: report }));
    render(<PracticeAiFeedbackButton {...props} getPayload={() => ({ checkpoint: { securityAccounts: [{ password: "not-for-browser-evidence" }], config: { value: 1 } }, device: { accounts: [{ password: "private", name: "operator" }], scenario: { definition: { answer: "source" } } } })} />);
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài ôn tập" }));
    await screen.findByText(report.summary);
    const body = String(fetcher.mock.calls[0][1]?.body);
    expect(body).not.toMatch(/password|securityAccounts|definition/);
    expect(JSON.parse(body).payload.checkpoint.config.value).toBe(1);
  });
  it.each(["withheld", "failed"] as const)("renders %s honestly without showing a supplied report or polling indefinitely", async (status) => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ status, feedback: report }));
    render(<AttemptFeedbackResult target={{ examItemId: "exam-one" }} />);
    expect(await screen.findByText(status === "withheld" ? /Nhận xét chưa được công bố/ : /Chưa tạo được nhận xét/)).toBeInTheDocument();
    expect(screen.queryByText(report.summary)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tải lại nhận xét" })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("polls queued feedback for a bounded window then offers a read-only retry and cancels on unmount", async () => {
    vi.useFakeTimers();
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({ status: "queued" }));
    const view = render(<AttemptFeedbackResult target={{ practiceSubmissionId: "queued-one" }} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(120000); });
    expect(fetcher.mock.calls.length).toBeGreaterThan(1);
    expect(fetcher.mock.calls.length).toBeLessThanOrEqual(20);
    const stoppedAt = fetcher.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(120000); });
    expect(fetcher).toHaveBeenCalledTimes(stoppedAt);
    fetcher.mockResolvedValueOnce(json({ status: "completed", feedback: report }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Tải lại nhận xét" })));
    expect(screen.getByText(report.summary)).toBeInTheDocument();
    expect(fetcher.mock.calls.every(([url]) => String(url).startsWith("/api/ai/attempt-feedback?"))).toBe(true);
    view.unmount();
    expect((fetcher.mock.calls.at(-1)?.[1]?.signal as AbortSignal).aborted).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(120000); });
    expect(fetcher).toHaveBeenCalledTimes(stoppedAt + 1);
  });

  it("retries an unknown network outcome with the same key and frozen body even if simulator changes", async () => {
    let value = 1;
    const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(json({ submissionId: "submission-two", jobId: "job-two", status: "queued" }))
      .mockResolvedValueOnce(json({ status: "completed", feedback: report }));
    render(<PracticeAiFeedbackButton {...props} getPayload={() => ({ value })} />);
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài ôn tập" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("offline");
    value = 2;
    fireEvent.click(screen.getByRole("button", { name: /Nộp bài ôn tập|Thử nộp lại/ }));
    expect(await screen.findByText(report.summary)).toBeInTheDocument();
    const first = fetcher.mock.calls[0][1];
    const retry = fetcher.mock.calls[1][1];
    expect(retry?.body).toEqual(first?.body);
    expect(retry?.headers).toEqual(first?.headers);
  });
  it("restores only the current user's submission after reload and resets the simulator for a fresh attempt", async () => {
    const onRestart = vi.fn(() => true);
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => String(url).includes("practice-submissions")
      ? json({ submissionId: "saved-submission", jobId: "job", status: "queued" })
      : json({ status: "completed", feedback: report }));
    const view = render(<PracticeAiFeedbackButton {...props} attemptKey="native-before-reload" onRestart={onRestart} />);
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài ôn tập" }));
    await screen.findByText(report.summary);
    const originalKey = (fetcher.mock.calls[0][1]?.headers as Record<string, string>)["Idempotency-Key"];
    view.unmount();
    fetcher.mockClear();
    const restored = render(<PracticeAiFeedbackButton {...props} attemptKey="native-after-reload" onRestart={onRestart} />);
    expect(await screen.findByText(report.summary)).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toContain("practiceSubmissionId=saved-submission");
    act(() => useScenarioStore.setState({ sessionIdentity: "student-two" }));
    expect(screen.queryByText(report.summary)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nộp bài ôn tập" })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledOnce();
    act(() => useScenarioStore.setState({ sessionIdentity: "student-one" }));
    await screen.findByText(report.summary);
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu lượt ôn tập mới" }));
    expect(onRestart).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài ôn tập" }));
    await screen.findByText(report.summary);
    const requests = fetcher.mock.calls.filter(([url]) => url === "/api/ai/practice-submissions");
    expect(requests).toHaveLength(1);
    expect((requests[0][1]?.headers as Record<string, string>)["Idempotency-Key"]).not.toEqual(originalKey);
    restored.unmount();
  });

  it("does not request feedback before explicit submission and displays it automatically after server ACK", async () => {
    let acknowledge!: (value: Response) => void;
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => new Promise((resolve) => { acknowledge = resolve; }))
      .mockResolvedValueOnce(json({ status: "completed", feedback: report }));
    render(<PracticeAiFeedbackButton {...props} />);
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài ôn tập" }));
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith("/api/ai/practice-submissions", expect.objectContaining({
      method: "POST", body: JSON.stringify({ moduleId: props.moduleId, scenarioId: props.scenarioId, payload: props.getPayload() }),
      headers: expect.objectContaining({ "Idempotency-Key": expect.any(String) }),
    }));
    expect(screen.queryByText(report.summary)).not.toBeInTheDocument();
    await act(async () => acknowledge(json({ submissionId: "submission-one", jobId: "job-one", status: "queued" })));
    expect(await screen.findByText(report.summary)).toBeInTheDocument();
    expect(fetcher).toHaveBeenLastCalledWith("/api/ai/attempt-feedback?practiceSubmissionId=submission-one", expect.objectContaining({ signal: expect.any(AbortSignal), cache: "no-store" }));
    expect(screen.queryByRole("button", { name: "Nộp bài ôn tập" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "AI nhận xét bài làm" })).not.toBeInTheDocument();
  });
});
