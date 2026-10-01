"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClassName, primaryButtonClassName, textareaClassName } from "@/components/exams/shared";
import { saveScenarioExamReviewAction } from "@/lib/scenario-exams/actions";
import type { ScenarioExamReviewSubject } from "@/lib/scenario-exams/types";
import { formatScenarioExamDate } from "@/lib/scenario-exams/presentation";

export function ScenarioExamScoreEditor({ examId, codeId, subject }: { examId: string; codeId: string; subject: ScenarioExamReviewSubject }) {
  const router = useRouter();
  const [score, setScore] = useState(subject.examinerScore == null ? "" : String(subject.examinerScore));
  const [comment, setComment] = useState(subject.examinerComment);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
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

  return <section aria-label="Chấm điểm môn" className="grid gap-4 border-t border-[var(--border)] pt-5">
    <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
      <Field label="Điểm giám khảo (0–100)" htmlFor={`score-${subject.subjectId}`}><input id={`score-${subject.subjectId}`} type="number" min="0" max="100" step="0.01" value={score} onChange={(event) => setScore(event.target.value)} disabled={!canReview || pending} className={inputClassName} /></Field>
      <Field label="Nhận xét của giám khảo" htmlFor={`comment-${subject.subjectId}`}><textarea id={`comment-${subject.subjectId}`} rows={3} maxLength={4000} value={comment} onChange={(event) => setComment(event.target.value)} disabled={!canReview || pending} className={textareaClassName} /></Field>
    </div>
    <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={save} disabled={!canReview || pending} className={primaryButtonClassName}>{pending ? "Đang lưu…" : "Lưu điểm và nhận xét"}</button>{subject.reviewedAt ? <p className="text-xs text-[var(--text-secondary)]">Đã chấm: {subject.reviewedByName ?? "Giám khảo"} · {formatScenarioExamDate(subject.reviewedAt)}</p> : null}</div>
    {!canReview ? <p className="text-sm text-[var(--text-secondary)]">Chỉ chấm điểm khi môn đã nộp hoặc kết thúc và có dữ liệu bài làm hợp lệ.</p> : null}
    {feedback ? <p role={feedback.error ? "alert" : "status"} className={`text-sm ${feedback.error ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}>{feedback.message}</p> : null}
  </section>;
}
