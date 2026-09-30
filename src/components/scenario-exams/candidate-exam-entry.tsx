"use client";

import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { Key } from "@phosphor-icons/react/dist/csr/Key";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { redeemScenarioExamCodeAction } from "@/lib/scenario-exams/actions";
import type { CandidateOpenScenarioExam } from "@/lib/scenario-exams/types";
import { primaryButtonClassName } from "@/components/exams/shared";

function formatDate(value: string | null) {
  if (!value) return "Không giới hạn";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function CandidateExamEntry({ exams }: { exams: CandidateOpenScenarioExam[] }) {
  const router = useRouter();
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function redeem() {
    setFeedback(null);
    startTransition(async () => {
      const result = await redeemScenarioExamCodeAction(examId, code);
      if (!result.ok || !result.data) {
        setFeedback(result.message);
        return;
      }
      router.push("/student/scenario-exams/session");
      router.refresh();
    });
  }

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.65fr)]">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex items-start gap-4"><span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]"><Key aria-hidden size={23} weight="duotone" /></span><div><h2 className="text-lg font-bold text-[var(--text-primary)]">Vào phiên thi bằng mã code</h2><p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Mã được cấp riêng cho thí sinh. Sau khi nhập thành công, hệ thống sẽ hiển thị đúng các môn được giám khảo tích chọn.</p></div></div>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-[var(--text-secondary)]">Chọn kỳ thi<select value={examId} onChange={(event) => setExamId(event.currentTarget.value)} className="h-11 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-normal text-[var(--text-primary)]" disabled={pending}><option value="">Chọn kỳ thi</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} — {exam.durationMinutes} phút</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold text-[var(--text-secondary)]">Mã code<input value={code} onChange={(event) => setCode(event.currentTarget.value.toUpperCase())} className="h-12 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 font-mono text-lg tracking-[0.16em] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)]" placeholder="Nhập mã được cấp" autoComplete="one-time-code" disabled={pending} /></label>
          {feedback ? <p role="alert" className="rounded border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">{feedback}</p> : null}
          <button type="button" className={primaryButtonClassName} onClick={redeem} disabled={pending || !examId || !code.trim()}>{pending ? "Đang kiểm tra…" : "Vào phiên thi"}<ArrowRight aria-hidden size={18} /></button>
        </div>
      </section>
      <aside className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-5"><h2 className="text-sm font-bold text-[var(--text-primary)]">Kỳ thi đang mở</h2><div className="mt-3 grid gap-2">{exams.map((exam) => <button key={exam.id} type="button" onClick={() => setExamId(exam.id)} className={`rounded border p-3 text-left transition-colors ${exam.id === examId ? "border-[var(--accent)] bg-[var(--accent-muted)]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}><p className="text-sm font-semibold text-[var(--text-primary)]">{exam.name}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{exam.durationMinutes} phút · Mở {formatDate(exam.opensAt)}</p></button>)}{exams.length === 0 ? <p className="text-sm text-[var(--text-muted)]">Hiện chưa có kỳ thi mở.</p> : null}</div></aside>
    </div>
  );
}
