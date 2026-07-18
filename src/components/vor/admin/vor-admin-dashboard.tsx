"use client";

import { Compass } from "@phosphor-icons/react/dist/csr/Compass";
import { ClipboardText } from "@phosphor-icons/react/dist/csr/ClipboardText";
import { FilePlus } from "@phosphor-icons/react/dist/csr/FilePlus";
import { PencilSimple } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import Link from "next/link";
import { useEffect } from "react";
import {
  EmptyState,
  LoadingRows,
  ModuleSummary,
  ScenarioListFrame,
  ScenarioSectionHeader,
} from "@/components/ui/exam-workspace";
import { ScenarioDataTable } from "@/components/ui/scenario-data-table";
import type { VorScenario } from "@/lib/vor-types";
import { useVorScenarioStore } from "@/stores/vor-scenario-store";
import { useVorSubmissionStore } from "@/stores/vor-submission-store";

const difficultyLabels: Record<VorScenario["difficulty"], string> = {
  easy: "Cơ bản",
  medium: "Trung bình",
  hard: "Nâng cao",
};

const scenarioColumns = [
  { id: "number", label: "STT", className: "w-16" },
  { id: "title", label: "Tiêu đề" },
  { id: "difficulty", label: "Mức độ", className: "w-28" },
  { id: "configuration", label: "Cấu hình", className: "w-44" },
  { id: "actions", label: "Thao tác", className: "w-28 text-right" },
];

export function VorAdminDashboard() {
  const scenarios = useVorScenarioStore((state) => state.scenarios);
  const isHydrated = useVorScenarioStore((state) => state.isHydrated);
  const syncError = useVorScenarioStore((state) => state.syncError);
  const hydrate = useVorScenarioStore((state) => state.hydrate);
  const deleteScenario = useVorScenarioStore((state) => state.deleteScenario);
  const submissions = useVorSubmissionStore((state) => state.submissions);
  const hydrateSubmissions = useVorSubmissionStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
    void hydrateSubmissions();
  }, [hydrate, hydrateSubmissions]);

  const waitingCount = submissions.filter((item) => item.status === "submitted").length;

  return (
    <>
      <ModuleSummary
        title="PMDT Simulator - DVOR 1150A"
        description="Cấu hình dữ liệu sự cố và xây dựng các bước kiểm tra trực tiếp trên giao diện PMDT mô phỏng."
        icon={Compass}
        actions={
          <>
            <Link
              href="/admin/vor/submissions"
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--border-strong)] bg-white px-3.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <ClipboardText aria-hidden size={18} weight="regular" />
              Bài nộp
              {waitingCount > 0 ? (
                <span className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--accent)]">
                  {waitingCount}
                </span>
              ) : null}
            </Link>
            <Link
              href="/admin/vor-pmdt"
              className="inline-flex min-h-10 items-center rounded-md border border-[var(--border-strong)] bg-white px-3.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Mở PMDT Simulator
            </Link>
            <Link
              href="/admin/vor/create"
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transform-none"
            >
              <FilePlus aria-hidden size={18} weight="bold" />
              Tạo kịch bản VOR
            </Link>
          </>
        }
      />

      {syncError ? (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-4 text-sm text-[#78350f]">
          <WarningCircle aria-hidden className="mt-0.5 shrink-0" size={19} weight="duotone" />
          <span>Đang dùng dữ liệu VOR cục bộ. Supabase chưa đồng bộ: {syncError}</span>
        </div>
      ) : null}

      <section aria-labelledby="vor-scenario-list-title" className="mt-7">
        <ScenarioSectionHeader
          id="vor-scenario-list-title"
          title="Danh sách kịch bản VOR"
          description="Quản lý dữ liệu sự cố, các điểm kiểm tra và thứ tự thao tác dự kiến."
          count={isHydrated ? scenarios.length : undefined}
          countLabel="kịch bản"
        />

        <ScenarioListFrame>
          {!isHydrated ? <LoadingRows label="Đang tải danh sách kịch bản VOR" /> : null}

          {isHydrated && scenarios.length === 0 ? (
            <EmptyState
              icon={<FilePlus aria-hidden size={23} weight="duotone" />}
              title="Chưa có kịch bản VOR"
              description="Mở chế độ biên soạn PMDT để cấu hình tình huống kiểm tra đầu tiên."
              action={
                <Link
                  href="/admin/vor/create"
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                >
                  <FilePlus aria-hidden size={18} weight="bold" />
                  Tạo kịch bản VOR
                </Link>
              }
            />
          ) : null}

          {isHydrated && scenarios.length > 0 ? (
            <ScenarioDataTable
              items={scenarios}
              caption="Danh sách kịch bản VOR dành cho giám khảo"
              columns={scenarioColumns}
              renderCells={(scenario, rowIndex) => (
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
                    <span className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                      {difficultyLabels[scenario.difficulty]}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top text-xs leading-5 text-[var(--text-secondary)]">
                    <p><span className="font-mono font-semibold">{scenario.overrides.length}</span> cảnh báo PMDT</p>
                    <p><span className="font-mono font-semibold">{scenario.expectedCheckpoints.length}</span> bước kiểm tra</p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/vor/edit?id=${encodeURIComponent(scenario.id)}`}
                        aria-label={`Sửa kịch bản: ${scenario.title}`}
                        title="Sửa kịch bản"
                        className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--border-strong)] bg-white text-[var(--text-secondary)] transition-[background-color,border-color,color,transform] duration-150 hover:border-[var(--accent-border)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none"
                      >
                        <PencilSimple aria-hidden size={18} weight="regular" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Xóa kịch bản “${scenario.title}”?`)) {
                            void deleteScenario(scenario.id);
                          }
                        }}
                        aria-label={`Xóa kịch bản: ${scenario.title}`}
                        title="Xóa kịch bản"
                        className="inline-flex size-9 items-center justify-center rounded-md border border-transparent text-[var(--danger)] transition-[background-color,border-color,transform] duration-150 hover:border-[#fecaca] hover:bg-[var(--danger-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none"
                      >
                        <Trash aria-hidden size={18} weight="regular" />
                      </button>
                    </div>
                  </td>
                </>
              )}
            />
          ) : null}
        </ScenarioListFrame>
      </section>
    </>
  );
}
