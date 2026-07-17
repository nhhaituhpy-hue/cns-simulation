"use client";

import {
  Broadcast,
  ClipboardText,
  FilePlus,
  PencilSimple,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";
import {
  EmptyState,
  LoadingRows,
  ModuleSummary,
  ScenarioListFrame,
  ScenarioSectionHeader,
} from "@/components/ui/exam-workspace";
import type { VorScenario } from "@/lib/vor-types";
import { useVorScenarioStore } from "@/stores/vor-scenario-store";
import { useVorSubmissionStore } from "@/stores/vor-submission-store";

const difficultyLabels: Record<VorScenario["difficulty"], string> = {
  easy: "Cơ bản",
  medium: "Trung bình",
  hard: "Nâng cao",
};

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
        icon={Broadcast}
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
            <ul className="divide-y divide-[var(--border)]">
              {scenarios.map((scenario, index) => (
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
                        <span className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                          {difficultyLabels[scenario.difficulty]}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {scenario.description}
                      </p>
                      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-muted)]">
                        <div className="flex gap-1.5">
                          <dt>Giá trị sự cố</dt>
                          <dd className="font-mono font-semibold text-[var(--text-secondary)]">{scenario.overrides.length}</dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt>Bước kiểm tra</dt>
                          <dd className="font-mono font-semibold text-[var(--text-secondary)]">{scenario.expectedCheckpoints.length}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="col-span-2 flex shrink-0 gap-2 border-t border-[var(--border)] pt-4 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                      <Link
                        href={`/admin/vor/edit?id=${encodeURIComponent(scenario.id)}`}
                        className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:flex-none"
                      >
                        <PencilSimple aria-hidden size={16} />
                        Sửa
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Xóa kịch bản “${scenario.title}”?`)) {
                            void deleteScenario(scenario.id);
                          }
                        }}
                        className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] lg:flex-none"
                      >
                        <Trash aria-hidden size={16} />
                        Xóa
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          ) : null}
        </ScenarioListFrame>
      </section>
    </>
  );
}
