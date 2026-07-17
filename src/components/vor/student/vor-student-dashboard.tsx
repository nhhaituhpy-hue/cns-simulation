"use client";

import { ArrowRight, FolderOpen, Warning } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";
import {
  EmptyState,
  LoadingRows,
  ScenarioListFrame,
  ScenarioSectionHeader,
} from "@/components/ui/exam-workspace";
import type { VorScenario } from "@/lib/vor-types";
import { useVorScenarioStore } from "@/stores/vor-scenario-store";

const difficultyDetails: Record<
  VorScenario["difficulty"],
  { label: string; className: string }
> = {
  easy: {
    label: "Cơ bản",
    className: "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]",
  },
  medium: {
    label: "Trung bình",
    className: "border-[#fde68a] bg-[#fffbeb] text-[#92400e]",
  },
  hard: {
    label: "Nâng cao",
    className: "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]",
  },
};

export function VorStudentDashboard() {
  const { scenarios, isHydrated, isLoading, syncError, hydrate } = useVorScenarioStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <section aria-labelledby="vor-practice-title" className="mt-7">
      {syncError ? (
        <div role="status" className="mb-5 flex gap-3 rounded-lg border border-[#f59e0b] bg-[#fffbeb] p-4 text-[#78350f]">
          <Warning aria-hidden className="mt-0.5 shrink-0" size={19} weight="duotone" />
          <div>
            <p className="text-sm font-semibold">Đang dùng dữ liệu VOR lưu trên thiết bị</p>
            <p className="mt-1 text-xs leading-5">
              Máy chủ chưa phản hồi. Bạn vẫn có thể thực hành và nộp bài cục bộ.
            </p>
          </div>
        </div>
      ) : null}

      <ScenarioSectionHeader
        id="vor-practice-title"
        title="Thực hành xử lý sự cố VOR"
        description="Kiểm tra PMDT mô phỏng, ghi chú từng thao tác và nộp kết luận để giám khảo chấm."
        count={isHydrated && !isLoading ? scenarios.length : undefined}
        countLabel="bài"
      />

      <ScenarioListFrame>
        {!isHydrated || isLoading ? (
          <LoadingRows label="Đang tải bài thực hành VOR" />
        ) : null}

        {isHydrated && !isLoading && scenarios.length === 0 ? (
          <EmptyState
            icon={<FolderOpen aria-hidden size={23} weight="duotone" />}
            title="Chưa có kịch bản VOR"
            description="Giám khảo cần tạo và lưu ít nhất một kịch bản VOR trước khi học viên bắt đầu."
          />
        ) : null}

        {isHydrated && !isLoading && scenarios.length > 0 ? (
          <ul className="divide-y divide-[var(--border)]">
            {scenarios.map((scenario, index) => {
              const difficulty = difficultyDetails[scenario.difficulty];

              return (
                <li key={scenario.id}>
                  <article className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 p-4 transition-colors hover:bg-[var(--surface-subtle)] sm:p-5 lg:grid-cols-[2.5rem_minmax(0,1fr)_auto] lg:items-center">
                    <span className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-muted)] font-mono text-xs font-bold tabular-nums text-[var(--text-secondary)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[var(--text-primary)] sm:text-[17px]">
                          {scenario.title}
                        </h3>
                        <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${difficulty.className}`}>
                          {difficulty.label}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {scenario.description}
                      </p>
                    </div>
                    <div className="col-span-2 border-t border-[var(--border)] pt-4 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                      <Link
                        href={`/student/vor/session?id=${encodeURIComponent(scenario.id)}`}
                        aria-label={`Bắt đầu bài VOR: ${scenario.title}`}
                        className="group inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transform-none lg:w-auto"
                      >
                        Bắt đầu
                        <ArrowRight aria-hidden size={17} className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        ) : null}
      </ScenarioListFrame>
    </section>
  );
}
