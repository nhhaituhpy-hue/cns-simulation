"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClassName, primaryButtonClassName, secondaryButtonClassName, textareaClassName } from "@/components/exams/shared";
import { AttemptFeedbackCard } from "@/components/scenario/practice-ai-feedback-button";
import type { AttemptFeedbackReport } from "@/lib/ai/feedback/attempt-feedback";
import { saveScenarioExamReviewAction } from "@/lib/scenario-exams/actions";
import type { ScenarioExamReviewSubject } from "@/lib/scenario-exams/types";
import { formatScenarioExamDate } from "@/lib/scenario-exams/presentation";

export function ScenarioExamScoreEditor({ examId, codeId, subject }: { examId: string; codeId: string; subject: ScenarioExamReviewSubject }) {
  const router = useRouter();
  const [score, setScore] = useState(subject.examinerScore == null ? "" : String(subject.examinerScore));
  const [comment, setComment] = useState(subject.examinerComment);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const [aiReport, setAiReport] = useState<AttemptFeedbackReport | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canReview = Boolean(subject.itemId && subject.result && (subject.status === "submitted" || subject.status === "timed_out"));

  function save() {
    const number = Number(score);
    if (!score.trim() || !Number.isFinite(number) || number < 0 || number > 100) {
      setFeedback({ message: "Vui lòng nhập điểm từ 0 đến 100.", error: true });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await saveScenarioExamReviewAction({ examId, codeId, itemId: subject.itemId, score: number, comment });
        setFeedback({ message: result.message, error: !result.ok });
        if (result.ok) router.refresh();
      } catch {
        setFeedback({ message: "Không thể lưu điểm. Vui lòng thử lại khi có kết nối.", error: true });
      }
    });
  }

  async function requestAiSuggestion() {
    if (!subject.itemId) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch("/api/ai/exam-review-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, codeId, itemId: subject.itemId }),
      });
      const data = (await response.json().catch(() => null)) as {
        feedback?: AttemptFeedbackReport;
        error?: string;
      } | null;
      if (!response.ok || !data?.feedback) {
        throw new Error(data?.error ?? "Không thể tạo gợi ý nhận xét lúc này.");
      }
      setAiReport(data.feedback);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Không thể tạo gợi ý nhận xét lúc này.");
    } finally {
      setAiLoading(false);
    }
  }

  return <section aria-label="Chấm điểm môn" className="grid gap-4 border-t border-[var(--border)] pt-5">
    <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
      <Field label="Điểm giám khảo (0–100)" htmlFor={`score-${subject.subjectId}`}><input id={`score-${subject.subjectId}`} type="number" min="0" max="100" step="0.01" value={score} onChange={(event) => setScore(event.target.value)} disabled={!canReview || pending} className={inputClassName} /></Field>
      <Field label="Nhận xét của giám khảo" htmlFor={`comment-${subject.subjectId}`}><textarea id={`comment-${subject.subjectId}`} rows={3} maxLength={4000} value={comment} onChange={(event) => setComment(event.target.value)} disabled={!canReview || pending} className={textareaClassName} /></Field>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={save} disabled={!canReview || pending} className={primaryButtonClassName}>{pending ? "Đang lưu…" : "Lưu điểm và nhận xét"}</button>
      <button type="button" onClick={() => void requestAiSuggestion()} disabled={!canReview || pending || aiLoading} className={secondaryButtonClassName}>{aiLoading ? "AI đang phân tích…" : "AI gợi ý nhận xét"}</button>
      {subject.reviewedAt ? <p className="text-xs text-[var(--text-secondary)]">Đã chấm: {subject.reviewedByName ?? "Giám khảo"} · {formatScenarioExamDate(subject.reviewedAt)}</p> : null}
    </div>
    {aiError ? <p role="alert" className="text-sm text-[var(--color-danger)]">{aiError}</p> : null}
    {aiReport ? <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><AttemptFeedbackCard report={aiReport} onInsertComment={(suggested) => setComment(suggested)} /></div> : null}
    {!canReview ? <p className="text-sm text-[var(--text-secondary)]">Chỉ chấm điểm khi môn đã nộp hoặc kết thúc và có dữ liệu bài làm hợp lệ.</p> : null}
    {feedback ? <p role={feedback.error ? "alert" : "status"} className={`text-sm ${feedback.error ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}>{feedback.message}</p> : null}
  </section>;
}
