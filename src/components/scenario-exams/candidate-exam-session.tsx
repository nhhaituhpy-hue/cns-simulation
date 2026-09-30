"use client";

import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { Clock } from "@phosphor-icons/react/dist/csr/Clock";
import { useEffect, useMemo, useState, useTransition } from "react";
import { startScenarioExamSubjectAction } from "@/lib/scenario-exams/actions";
import type { CandidateScenarioExamSession, CandidateSessionSubject } from "@/lib/scenario-exams/types";
import { SCENARIO_PARAMETERS_MODULES } from "@/lib/scenario-parameters";
import { primaryButtonClassName } from "@/components/exams/shared";

function moduleLabel(moduleId: CandidateSessionSubject["moduleId"]) {
  return SCENARIO_PARAMETERS_MODULES.find((module) => module.moduleId === moduleId)?.label ?? moduleId;
}

function statusLabel(status: CandidateSessionSubject["status"]) {
  return { not_started: "Chưa bắt đầu", in_progress: "Đang làm", submitted: "Đã nộp", timed_out: "Hết giờ" }[status];
}

export function CandidateExamSession({ session }: { session: CandidateScenarioExamSession }) {
  const [now, setNow] = useState(() => Date.now());
  const [items, setItems] = useState(session.subjects);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(0, new Date(session.deadlineAt).getTime() - now);
  const remainingLabel = useMemo(() => {
    const seconds = Math.floor(remaining / 1000);
    return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }, [remaining]);

  function startSubject(subjectId: string) {
    setFeedback(null);
    setPendingId(subjectId);
    startTransition(async () => {
      const result = await startScenarioExamSubjectAction(subjectId);
      setPendingId(null);
      if (!result.ok || !result.data) {
        setFeedback(result.message);
        return;
      }
      setItems((current) => current.map((subject) => subject.id === subjectId ? { ...subject, status: "in_progress", startedAt: new Date().toISOString(), sessionItemId: result.data!.id, scenarioName: result.data!.scenarioName } : subject));
    });
  }

  return (
    <div className="mt-6 grid gap-5">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Phiên thi của thí sinh</p><h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{session.examName}</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">{session.candidateName} · {session.candidateUnit}</p></div><div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-lg font-bold tabular-nums ${remaining < 300000 ? "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]" : "border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent)]"}`}><Clock aria-hidden size={19} /> {remainingLabel}</div></div></section>
      {feedback ? <p role="alert" className="rounded border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">{feedback}</p> : null}
      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]"><div className="border-b border-[var(--border)] px-5 py-4"><h2 className="text-base font-bold text-[var(--text-primary)]">Các môn được cấp</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Mỗi môn sẽ được cấp một scenario ngẫu nhiên khi bắt đầu.</p></div><div className="divide-y divide-[var(--border)]">{items.map((subject) => <div key={subject.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-[var(--text-primary)]">{moduleLabel(subject.moduleId)}</h3><p className="mt-1 text-xs text-[var(--text-secondary)]">{statusLabel(subject.status)}{subject.scenarioName ? ` · ${subject.scenarioName}` : ""}</p></div>{subject.status === "not_started" ? <button type="button" className={primaryButtonClassName} onClick={() => startSubject(subject.id)} disabled={pending}><ArrowRight aria-hidden size={17} />{pendingId === subject.id ? "Đang cấp scenario…" : "Bắt đầu môn"}</button> : subject.sessionItemId ? <span className="text-xs font-semibold text-[var(--text-secondary)]">Scenario đã được cố định</span> : null}</div>)}{items.length === 0 ? <p className="px-5 py-10 text-sm text-[var(--text-muted)]">Không có môn thi trong phiên này.</p> : null}</div></section>
    </div>
  );
}
