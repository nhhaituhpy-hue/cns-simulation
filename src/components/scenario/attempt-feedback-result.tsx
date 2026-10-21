"use client";

import { useEffect, useState } from "react";
import type { AttemptFeedbackReport } from "@/lib/ai/feedback/attempt-feedback";
import { AttemptFeedbackCard } from "./practice-ai-feedback-button";

export type AttemptFeedbackTarget = { practiceSubmissionId: string } | { examItemId: string } | { legacyAttemptItemId: string };
type FeedbackResponse = { status: "queued" | "running" | "completed" | "failed" | "withheld"; feedback?: AttemptFeedbackReport; error?: string };
const MAX_READS = 15;
const POLL_MS = 2000;

export function AttemptFeedbackResult(props: { target: AttemptFeedbackTarget; onInsertComment?: (text: string) => void }) {
  const query = new URLSearchParams(props.target).toString();
  return <FeedbackRead key={query} query={query} onInsertComment={props.onInsertComment} />;
}

function FeedbackRead({ query, onInsertComment }: { query: string; onInsertComment?: (text: string) => void }) {
  const [result, setResult] = useState<FeedbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let reads = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    async function read() {
      timeout = setTimeout(() => {
        setError("Tải nhận xét quá thời gian. Bài đã nộp vẫn được lưu.");
        controller.abort();
      }, 15000);
      try {
        const response = await fetch(`/api/ai/attempt-feedback?${query}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json() as FeedbackResponse;
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(data?.error ?? "Không thể tải nhận xét.");
        if (!data || !["queued", "running", "completed", "failed", "withheld"].includes(data.status)
          || (data.status === "completed" && !data.feedback)) throw new Error("Dữ liệu nhận xét không hợp lệ. Hãy tải lại sau.");
        setResult(data);
        reads += 1;
        if (data.status === "queued" || data.status === "running") {
          if (reads < MAX_READS) timer = setTimeout(() => void read(), POLL_MS);
          else setPaused(true);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Không thể tải nhận xét.");
      } finally {
        clearTimeout(timeout);
      }
    }
    void read();
    return () => { controller.abort(); clearTimeout(timer); clearTimeout(timeout); };
  }, [query, retry]);
  return <section aria-label="Nhận xét sau nộp" className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-left text-sm text-[var(--text-primary)]">
    <h3 className="mb-3 font-bold">Nhận xét sau nộp</h3>
    {result?.status === "completed" && result.feedback ? <AttemptFeedbackCard report={result.feedback} onInsertComment={onInsertComment} /> : <p role="status">{
      result?.status === "withheld" ? "Nhận xét chưa được công bố. Chi tiết chỉ được mở khi server cho phép sau khi kết thúc toàn bộ phiên thi."
        : result?.status === "failed" ? "Chưa tạo được nhận xét. Bài đã nộp vẫn được lưu; điểm chính thức không thay đổi."
          : paused ? "Bài đã nộp. Nhận xét chưa sẵn sàng; bạn có thể tải lại sau."
            : "Đang chuẩn bị nhận xét…"
    }</p>}
    {error ? <p role="alert">{error}</p> : null}
    {paused || error || result?.status === "withheld" || result?.status === "failed" ? <button type="button" className="mt-3 min-h-9 rounded border border-[var(--border-strong)] px-3 text-xs font-semibold hover:bg-[var(--surface-muted)]" onClick={() => { setPaused(false); setError(null); setRetry((value) => value + 1); }}>Tải lại nhận xét</button> : null}
  </section>;
}
