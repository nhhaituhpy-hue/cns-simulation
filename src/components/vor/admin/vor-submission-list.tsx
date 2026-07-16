"use client";

import { ArrowRight, ClipboardText, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";
import { useVorScenarioStore } from "@/stores/vor-scenario-store";
import { useVorSubmissionStore } from "@/stores/vor-submission-store";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

export function VorSubmissionList() {
  const submissions = useVorSubmissionStore((state) => state.submissions);
  const isHydrated = useVorSubmissionStore((state) => state.isHydrated);
  const syncError = useVorSubmissionStore((state) => state.syncError);
  const hydrateSubmissions = useVorSubmissionStore((state) => state.hydrate);
  const scenarios = useVorScenarioStore((state) => state.scenarios);
  const hydrateScenarios = useVorScenarioStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateSubmissions();
    void hydrateScenarios();
  }, [hydrateScenarios, hydrateSubmissions]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">VOR PMDT</span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">Bài nộp của học viên</h1>
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-[var(--text-secondary)]">Đọc trình tự thao tác, chú thích kỹ thuật, kết luận sự cố và nhập điểm đánh giá.</p>
        </div>
        <Link href="/admin" className="inline-flex h-10 items-center justify-center rounded border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]">Về quản lý kịch bản</Link>
      </header>

      {syncError ? (
        <div role="status" className="mt-5 flex gap-3 rounded border border-[#fde68a] bg-[#fffbeb] p-4 text-sm text-[#78350f]">
          <WarningCircle aria-hidden className="mt-0.5 shrink-0" size={19} />
          <span>Đang dùng bài nộp lưu trên thiết bị. Supabase chưa đồng bộ.</span>
        </div>
      ) : null}

      <section aria-labelledby="submission-list-title" className="mt-7">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="submission-list-title" className="text-lg font-semibold text-[var(--text-primary)]">Danh sách bài nộp</h2>
          {isHydrated ? <span className="font-mono text-xs text-[var(--text-muted)]">{submissions.length} bài</span> : null}
        </div>

        {!isHydrated ? (
          <div aria-busy="true" className="h-36 animate-pulse rounded-lg bg-[var(--surface-muted)] motion-reduce:animate-none" />
        ) : submissions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-white px-5 py-14 text-center">
            <ClipboardText aria-hidden size={36} className="mx-auto text-[var(--text-muted)]" />
            <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Chưa có bài nộp VOR</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Bài làm sẽ xuất hiện ở đây sau khi học viên nhấn nộp.</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {submissions.map((submission) => {
              const scenario = scenarios.find((item) => item.id === submission.scenarioId);
              const reviewed = submission.status === "reviewed";
              return (
                <li key={submission.id}>
                  <article className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-[var(--text-primary)]">{submission.studentName}</h3>
                          <span className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)]">{submission.studentCode}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${reviewed ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fef3c7] text-[#92400e]"}`}>{reviewed ? `Đã chấm · ${submission.score}/100` : "Chờ chấm"}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">{scenario?.title ?? "Kịch bản VOR không còn tồn tại"}</p>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">Nộp lúc {dateFormatter.format(new Date(submission.submittedAt ?? submission.startedAt))} · {submission.events.length} lượt kiểm tra</p>
                      </div>
                      <Link href={`/admin/vor/submissions/${encodeURIComponent(submission.id)}`} className="group inline-flex h-10 items-center justify-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">
                        {reviewed ? "Xem đánh giá" : "Đọc và chấm"}
                        <ArrowRight aria-hidden size={17} className="transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
