"use client";

import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { Key } from "@phosphor-icons/react/dist/csr/Key";
import { ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { redeemScenarioExamCodeAction } from "@/lib/scenario-exams/actions";
import type { CandidateOpenScenarioExam } from "@/lib/scenario-exams/types";
import { formatScenarioExamDate } from "@/lib/scenario-exams/presentation";
import { primaryButtonClassName } from "@/components/exams/shared";
import { ScenarioExamAvailabilityBadge } from "./scenario-exam-availability-badge";

export function CandidateExamEntry({ exams }: { exams: CandidateOpenScenarioExam[] }) {
  const router = useRouter();
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selectedExam = exams.find((exam) => exam.id === examId) ?? exams[0] ?? null;
  const canRedeem = selectedExam?.availability === "available";

  function redeem() {
    setFeedback(null);
    startTransition(async () => {
      const result = await redeemScenarioExamCodeAction(selectedExam?.id ?? "", code);
      if (!result.ok || !result.data) {
        setFeedback(result.message);
        return;
      }
      router.push("/student/scenario-exams/session");
      router.refresh();
    });
  }

  function refreshExams() {
    setFeedback(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.65fr)]">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex items-start gap-4"><span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]"><Key aria-hidden size={23} weight="duotone" /></span><div><h2 className="text-lg font-bold text-[var(--text-primary)]">Vào phiên thi bằng mã code</h2><p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Mã được cấp riêng cho thí sinh. Sau khi nhập thành công, hệ thống sẽ hiển thị đúng các môn được giám khảo tích chọn.</p></div></div>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-[var(--text-secondary)]">Chọn kỳ thi<select value={selectedExam?.id ?? ""} onChange={(event) => { setExamId(event.currentTarget.value); setFeedback(null); }} className="h-11 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-normal text-[var(--text-primary)]" disabled={pending}><option value="">Chọn kỳ thi</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} — {exam.durationMinutes} phút</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold text-[var(--text-secondary)]">Mã code<input value={code} onChange={(event) => setCode(event.currentTarget.value.toUpperCase())} className="h-12 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 font-mono text-lg tracking-[0.16em] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)]" placeholder="Nhập mã được cấp" autoComplete="one-time-code" disabled={pending} /></label>
          {selectedExam?.availability === "upcoming" ? <p className="rounded border border-[var(--color-warning-border)] bg-[var(--color-warning-muted)] px-4 py-3 text-sm text-[var(--color-warning)]">Kỳ thi chưa đến giờ bắt đầu. Có thể chọn trước; nhập mã sẽ mở từ {formatScenarioExamDate(selectedExam.opensAt)} (giờ Việt Nam).</p> : null}
          {feedback ? <p role="alert" className="rounded border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">{feedback}</p> : null}
          <button type="button" className={primaryButtonClassName} onClick={redeem} disabled={pending || !selectedExam || !canRedeem || !code.trim()}>{pending ? "Đang kiểm tra…" : canRedeem ? "Vào phiên thi" : "Chưa đến giờ mở"}<ArrowRight aria-hidden size={18} /></button>
        </div>
      </section>
      <aside className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-[var(--text-primary)]">Kỳ thi đang mở / sắp diễn ra</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Lịch hiển thị theo giờ Việt Nam (UTC+7).</p></div><button type="button" onClick={refreshExams} disabled={pending} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Làm mới danh sách kỳ thi" title="Làm mới danh sách kỳ thi"><ArrowClockwise aria-hidden size={18} className={pending ? "animate-spin motion-reduce:animate-none" : ""} /></button></div><div className="mt-3 grid gap-2">{exams.map((exam) => <button key={exam.id} type="button" onClick={() => { setExamId(exam.id); setFeedback(null); }} className={`rounded border p-3 text-left transition-colors ${exam.id === selectedExam?.id ? "border-[var(--accent)] bg-[var(--accent-muted)]" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-[var(--text-primary)]">{exam.name}</p><ScenarioExamAvailabilityBadge availability={exam.availability} /></div><p className="mt-2 text-xs text-[var(--text-secondary)]">{exam.durationMinutes} phút · Mở: {formatScenarioExamDate(exam.opensAt, "Khi giám khảo mở kỳ thi")}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Đóng: {formatScenarioExamDate(exam.closesAt)}</p></button>)}{exams.length === 0 ? <div className="rounded border border-[var(--border)] p-4 text-sm text-[var(--text-muted)]"><p>Hiện chưa có kỳ thi được mở hoặc sắp diễn ra.</p><button type="button" onClick={refreshExams} disabled={pending} className="mt-3 text-sm font-semibold text-[var(--accent)] underline-offset-2 hover:underline">Làm mới danh sách</button></div> : null}</div></aside>
    </div>
  );
}
