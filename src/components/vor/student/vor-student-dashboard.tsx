"use client";

import { ArrowRight, FolderOpen, Warning } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";
import type { VorScenario } from "@/lib/vor-types";
import { useVorScenarioStore } from "@/stores/vor-scenario-store";

const difficultyLabels: Record<VorScenario["difficulty"], string> = {
  easy: "Cơ bản",
  medium: "Trung bình",
  hard: "Nâng cao",
};

export function VorStudentDashboard() {
  const { scenarios, isHydrated, isLoading, syncError, hydrate } = useVorScenarioStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!isHydrated || isLoading) {
    return (
      <div role="status" className="mt-8 rounded-lg border border-[var(--border)] bg-white px-5 py-14 text-center text-sm text-[var(--text-secondary)]">
        Đang tải bài thực hành VOR…
      </div>
    );
  }

  return (
    <section aria-labelledby="vor-practice-title" className="mt-7">
      {syncError ? (
        <div role="status" className="mb-5 flex gap-3 rounded border border-[#f59e0b] bg-[#fffbeb] p-4 text-[#78350f]">
          <Warning aria-hidden className="mt-0.5 shrink-0" size={19} weight="fill" />
          <div>
            <p className="text-sm font-semibold">Đang dùng dữ liệu VOR lưu trên thiết bị</p>
            <p className="mt-1 text-xs leading-5">Máy chủ chưa phản hồi; bạn vẫn có thể thực hành và nộp bài cục bộ.</p>
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 id="vor-practice-title" className="text-lg font-semibold text-[var(--text-primary)]">
            Thực hành xử lý sự cố VOR
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Kiểm tra PMDT mô phỏng, ghi chú từng thao tác và nộp kết luận để giám khảo chấm.
          </p>
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--text-muted)]">
          {scenarios.length} bài
        </span>
      </div>

      {scenarios.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-white px-5 py-14 text-center">
          <FolderOpen aria-hidden size={34} className="mx-auto text-[var(--text-muted)]" />
          <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Chưa có kịch bản VOR</h3>
          <p className="mx-auto mt-2 max-w-[52ch] text-sm leading-6 text-[var(--text-secondary)]">
            Giám khảo cần tạo và lưu ít nhất một kịch bản VOR trước khi học viên bắt đầu.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {scenarios.map((scenario, index) => (
            <li key={scenario.id}>
              <article className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
                <div className="grid gap-4 lg:grid-cols-[2.5rem_minmax(0,1fr)_auto] lg:items-center">
                  <span className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-muted)] font-mono text-xs font-bold text-[var(--text-secondary)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{scenario.title}</h3>
                      <span className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                        {difficultyLabels[scenario.difficulty]}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{scenario.description}</p>
                  </div>
                  <Link
                    href={`/student/vor?id=${encodeURIComponent(scenario.id)}`}
                    aria-label={`Bắt đầu bài VOR: ${scenario.title}`}
                    className="group inline-flex h-10 items-center justify-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                  >
                    Bắt đầu
                    <ArrowRight aria-hidden size={17} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
