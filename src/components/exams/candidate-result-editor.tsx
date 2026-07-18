"use client";

import { FloppyDisk } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCandidateResultAction } from "@/lib/exams/actions";
import type { CandidateSubjectStatus } from "@/lib/exams/types";
import { ActionFeedback } from "./action-feedback";
import { Field, inputClassName, primaryButtonClassName, textareaClassName } from "./shared";

export function CandidateResultEditor({
  candidateSubjectId,
  status,
  officialScore,
  examinerComment,
}: {
  candidateSubjectId: string;
  status: CandidateSubjectStatus;
  officialScore: number | null;
  examinerComment: string;
}) {
  const router = useRouter();
  const [score, setScore] = useState(officialScore === null ? "" : String(officialScore));
  const [comment, setComment] = useState(examinerComment);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const canReview = status === "submitted" || status === "reviewed";

  function save() {
    const parsedScore = Number(score);
    if (score.trim() === "" || !Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      setFeedback({ tone: "error", message: "Vui lòng nhập điểm chính thức trong khoảng 0-100." });
      return;
    }
    startTransition(async () => {
      const result = await saveCandidateResultAction({
        candidateSubjectId,
        officialScore: parsedScore,
        examinerComment: comment.trim(),
      });
      setFeedback({ tone: result.ok ? "success" : "error", message: result.message });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] p-3 lg:grid-cols-[minmax(10rem,0.7fr)_minmax(18rem,2fr)_auto] lg:items-end">
      <Field label="Điểm giám khảo nhập" htmlFor={`score-${candidateSubjectId}`} hint="Hệ thống không tự điền điểm chính thức.">
        <input id={`score-${candidateSubjectId}`} type="number" min="0" max="100" step="0.1" value={score} onChange={(event) => setScore(event.target.value)} className={inputClassName} placeholder="Để trống" />
      </Field>
      <Field label="Nhận xét của giám khảo" htmlFor={`comment-${candidateSubjectId}`}>
        <textarea id={`comment-${candidateSubjectId}`} value={comment} onChange={(event) => setComment(event.target.value)} className={`${textareaClassName} min-h-10`} rows={1} />
      </Field>
      <button type="button" onClick={save} disabled={isPending || !canReview} className={primaryButtonClassName}><FloppyDisk aria-hidden size={17} /> {isPending ? "Đang lưu" : "Lưu kết quả"}</button>
      {!canReview ? <p className="text-xs text-[var(--text-muted)] lg:col-span-3">Chỉ nhập điểm sau khi thí sinh đã hoàn tất và nộp môn thi.</p> : null}
      {feedback ? <div className="lg:col-span-3"><ActionFeedback tone={feedback.tone} message={feedback.message} /></div> : null}
    </div>
  );
}
