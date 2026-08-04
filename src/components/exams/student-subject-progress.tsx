"use client";

import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeExamAttemptAction, startExamAttemptAction } from "@/lib/exams/actions";
import { ActionFeedback } from "./action-feedback";
import { primaryButtonClassName, secondaryButtonClassName } from "./shared";

export interface StudentAttemptItemView {
  id: string;
  moduleCode: "vor" | "dme" | "ads-b";
  scenarioTitle: string;
  position: number;
  status: "pending" | "in_progress" | "submitted";
}

export interface StudentAttemptView {
  id: string;
  status: "in_progress" | "submitted";
  items: StudentAttemptItemView[];
}

function moduleLabel(moduleCode: StudentAttemptItemView["moduleCode"]) {
  return moduleCode === "ads-b" ? "ADS-B" : moduleCode.toUpperCase();
}

export function StudentSubjectProgress({
  examId,
  candidateSubjectId,
  subjectName,
  paperTitle,
  attempt,
}: {
  examId: string;
  candidateSubjectId: string;
  subjectName: string;
  paperTitle: string;
  attempt: StudentAttemptView | null;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const allSubmitted = Boolean(attempt && attempt.items.length > 0 && attempt.items.every((item) => item.status === "submitted"));
  const currentItem = attempt?.items.find((item) => item.status === "in_progress") ?? null;

  function start() {
    startTransition(async () => {
      const result = await startExamAttemptAction(candidateSubjectId);
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      setFeedback(null);
      router.refresh();
    });
  }

  function finish() {
    if (!attempt) return;
    startTransition(async () => {
      const result = await completeExamAttemptAction(attempt.id);
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      router.push(`/student/exams/${examId}`);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 grid gap-5">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{subjectName}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{paperTitle}</p>
        {!attempt ? (
          <div className="mt-5 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-muted)] p-4">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">Khi bắt đầu, hệ thống sẽ ghi nhận lượt thi và mở lần lượt các kịch bản trong đề đã được phân.</p>
            <button type="button" onClick={start} disabled={isPending} className={`${primaryButtonClassName} mt-4`}><Play aria-hidden size={18} weight="fill" /> {isPending ? "Đang chuẩn bị..." : "Bắt đầu môn thi"}</button>
          </div>
        ) : null}
      </section>

      {attempt ? (
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--border)] px-5 py-4"><h2 className="text-base font-semibold text-[var(--text-primary)]">Tiến độ kịch bản</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Thực hiện theo thứ tự. Kịch bản tiếp theo chỉ mở sau khi kịch bản hiện tại được nộp.</p></div>
          <ol className="divide-y divide-[var(--border)]">
            {attempt.items.map((item) => {
              const isCurrent = currentItem?.id === item.id;
              return (
                <li key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${item.status === "submitted" ? "bg-[#dcfce7] text-[#166534]" : isCurrent ? "bg-[var(--accent-muted)] text-[var(--accent)]" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}>{item.status === "submitted" ? <CheckCircle aria-hidden size={18} weight="fill" /> : item.position}</span>
                    <div><p className="font-semibold text-[var(--text-primary)]">{item.scenarioTitle}</p><p className="mt-1 text-xs font-medium text-[var(--text-muted)]">{moduleLabel(item.moduleCode)} - {item.status === "submitted" ? "Đã nộp" : isCurrent ? "Sẵn sàng thực hiện" : "Chưa mở"}</p></div>
                  </div>
                  {isCurrent ? (
                    <a href={`/student/exams/${examId}/subjects/${candidateSubjectId}/scenarios/${item.id}`} className={primaryButtonClassName}>{item.status === "in_progress" ? "Tiếp tục kịch bản" : "Mở kịch bản"}<ArrowRight aria-hidden size={17} /></a>
                  ) : item.status === "submitted" ? <span className="text-xs font-semibold text-[#166534]">Hoàn tất</span> : <span className="text-xs text-[var(--text-muted)]">Đang khóa</span>}
                </li>
              );
            })}
          </ol>
          {allSubmitted && attempt.status !== "submitted" ? (
            <div className="flex justify-end border-t border-[var(--border)] bg-[var(--surface-subtle)] p-4"><button type="button" onClick={finish} disabled={isPending} className={primaryButtonClassName}><CheckCircle aria-hidden size={18} /> {isPending ? "Đang hoàn tất..." : "Hoàn tất môn thi"}</button></div>
          ) : null}
          {attempt.status === "submitted" ? <div className="border-t border-[#bbf7d0] bg-[#f0fdf4] p-4 text-sm font-semibold text-[#166534]">Môn thi đã được nộp. Điểm chính thức sẽ do giám khảo nhập.</div> : null}
        </section>
      ) : null}

      {feedback ? <ActionFeedback tone="error" message={feedback} /> : null}
      <div><button type="button" onClick={() => router.push(`/student/exams/${examId}`)} className={secondaryButtonClassName}>Quay lại thông tin kỳ thi</button></div>
    </div>
  );
}
