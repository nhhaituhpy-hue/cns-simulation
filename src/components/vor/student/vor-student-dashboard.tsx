"use client";

import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { NotePencil } from "@phosphor-icons/react/dist/csr/NotePencil";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import Link from "next/link";
import { useEffect } from "react";
import {
  EmptyState,
  LoadingRows,
  ScenarioListFrame,
  ScenarioSectionHeader,
} from "@/components/ui/exam-workspace";
import { ScenarioDataTable } from "@/components/ui/scenario-data-table";
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

const scenarioColumns = [
  { id: "number", label: "STT", className: "w-16" },
  { id: "title", label: "Tiêu đề" },
  { id: "difficulty", label: "Mức độ", className: "w-28" },
  { id: "actions", label: "Thao tác", className: "w-24 text-right" },
];

export function VorStudentDashboard() {
  const { scenarios, isHydrated, isLoading, syncError, hydrate } = useVorScenarioStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <section aria-labelledby="vor-practice-title" className="mt-0">
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
          <ScenarioDataTable
            items={scenarios}
            caption="Danh sách kịch bản VOR dành cho thí sinh"
            columns={scenarioColumns}
            renderCells={(scenario, rowIndex) => {
              const difficulty = difficultyDetails[scenario.difficulty];
              return (
                <>
                  <td className="px-4 py-4 align-top">
                    <span className="inline-flex size-8 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-muted)] text-xs font-bold tabular-nums text-[var(--text-secondary)]">
                      {String(rowIndex + 1).padStart(2, "0")}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                      {scenario.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[var(--text-secondary)]">
                      {scenario.description}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${difficulty.className}`}>
                      {difficulty.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right align-top">
                    <Link
                      href={`/student/vor/session?id=${encodeURIComponent(scenario.id)}`}
                      aria-label={`Bắt đầu bài VOR: ${scenario.title}`}
                      title="Bắt đầu bài thực hành"
                      className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--accent-border)] bg-[var(--surface)] text-[var(--accent)] transition-[background-color,border-color,transform] duration-150 hover:bg-[var(--accent-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      <NotePencil aria-hidden size={19} weight="regular" />
                    </Link>
                  </td>
                </>
              );
            }}
          />
        ) : null}
      </ScenarioListFrame>
    </section>
  );
}
