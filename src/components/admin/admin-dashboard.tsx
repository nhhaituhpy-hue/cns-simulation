"use client";

import {
  Broadcast,
  FilePlus,
  PencilSimple,
  Plus,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DmeAdminDashboard } from "@/components/dme/admin/dme-admin-dashboard";
import {
  EmptyState,
  LoadingRows,
  ModuleNavigation,
  ModuleSummary,
  ScenarioListFrame,
  ScenarioSectionHeader,
  WorkspaceHeader,
  type CnsModule,
} from "@/components/ui/exam-workspace";
import { VorAdminDashboard } from "@/components/vor/admin/vor-admin-dashboard";
import {
  formatScenarioNumber,
  sortScenariosByRecency,
} from "@/lib/scenario-order";
import type { Scenario, ScenarioDifficulty } from "@/lib/types";
import { useScenarioStore } from "@/stores/scenario-store";
import { DeleteScenarioDialog } from "./delete-scenario-dialog";

const difficultyDetails: Record<
  ScenarioDifficulty,
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

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export { type CnsModule };

export function AdminDashboard({
  activeModule = "vor",
}: {
  activeModule?: CnsModule;
}) {
  const scenarios = useScenarioStore((state) => state.scenarios);
  const isHydrated = useScenarioStore((state) => state.isHydrated);
  const storageError = useScenarioStore((state) => state.storageError);
  const hydrate = useScenarioStore((state) => state.hydrate);
  const deleteScenario = useScenarioStore((state) => state.deleteScenario);
  const [scenarioToDelete, setScenarioToDelete] = useState<Scenario | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const sortedScenarios = useMemo(
    () => sortScenariosByRecency(scenarios),
    [scenarios],
  );

  function confirmDelete() {
    if (!scenarioToDelete) return;

    const deleted = deleteScenario(scenarioToDelete.id);
    if (!deleted) {
      setDeleteError("Kịch bản không còn tồn tại hoặc đã được xóa.");
    } else {
      setDeleteError(null);
    }
    setScenarioToDelete(null);
  }

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
      <WorkspaceHeader
        role="admin"
        title="Quản lý kịch bản kiểm tra"
        description="Xây dựng tình huống sự cố, xác định quy trình chuẩn và quản lý kết quả cho các phân hệ VOR, DME và ADS-B."
      />

      <ModuleNavigation role="admin" activeModule={activeModule} />

      {activeModule === "vor" ? <VorAdminDashboard /> : null}
      {activeModule === "dme" ? <DmeAdminDashboard /> : null}

      {activeModule === "ads-b" ? (
        <>
          <ModuleSummary
            title="Mô phỏng giám sát ADS-B"
            description="Cấu hình trạng thái site, dữ liệu cảm biến và chuỗi thao tác chuẩn trên QCMS và terminal bảo trì."
            icon={Broadcast}
            actions={
              <Link
                href="/admin/create"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.98] active:bg-[var(--accent-active)] motion-reduce:transform-none"
              >
                <Plus aria-hidden size={18} weight="bold" />
                Tạo kịch bản ADS-B
              </Link>
            }
          />

          {storageError ? (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#78350f]"
            >
              <WarningCircle aria-hidden size={20} weight="duotone" className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Dữ liệu cục bộ đang có vấn đề</p>
                <p className="mt-1 leading-5">
                  Danh sách vẫn dùng được trong phiên này, nhưng thay đổi có thể chưa được lưu trên thiết bị.
                </p>
              </div>
            </div>
          ) : null}

          {deleteError ? (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]"
            >
              {deleteError}
            </p>
          ) : null}

          <section aria-labelledby="scenario-list-title" className="mt-7">
            <ScenarioSectionHeader
              id="scenario-list-title"
              title="Danh sách kịch bản ADS-B"
              description="Kịch bản mới cập nhật được hiển thị trước."
              count={isHydrated ? scenarios.length : undefined}
              countLabel="kịch bản"
            />

            <ScenarioListFrame>
              {!isHydrated ? (
                <LoadingRows label="Đang tải danh sách kịch bản" />
              ) : null}

              {isHydrated && sortedScenarios.length === 0 ? (
                <EmptyState
                  icon={<FilePlus aria-hidden size={23} weight="duotone" />}
                  title="Chưa có kịch bản"
                  description="Tạo kịch bản đầu tiên để cấu hình trạng thái cảm biến và đáp án thao tác."
                  action={
                    <Link
                      href="/admin/create"
                      className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                    >
                      <Plus aria-hidden size={18} weight="bold" />
                      Tạo kịch bản
                    </Link>
                  }
                />
              ) : null}

              {isHydrated && sortedScenarios.length > 0 ? (
                <ul className="divide-y divide-[var(--border)]">
                  {sortedScenarios.map((scenario, index) => {
                    const difficulty = difficultyDetails[scenario.difficulty];

                    return (
                      <li key={scenario.id}>
                        <article className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 p-4 transition-colors hover:bg-[var(--surface-subtle)] sm:p-5 lg:grid-cols-[2.5rem_minmax(0,1fr)_auto] lg:items-center">
                          <span
                            aria-label={`Kịch bản số ${index + 1}`}
                            className="inline-flex size-9 items-center justify-center self-start rounded-md border border-[var(--border-strong)] bg-[var(--surface-muted)] font-mono text-xs font-bold tabular-nums text-[var(--text-secondary)] lg:self-center"
                          >
                            {formatScenarioNumber(index)}
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
                            <p className="mt-1.5 line-clamp-2 max-w-[78ch] text-sm leading-6 text-[var(--text-secondary)]">
                              {scenario.description}
                            </p>
                            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-muted)]">
                              <div className="flex gap-1.5">
                                <dt>Site</dt>
                                <dd className="font-mono font-semibold tabular-nums text-[var(--text-secondary)]">
                                  {scenario.sites.length}
                                </dd>
                              </div>
                              <div className="flex gap-1.5">
                                <dt>Thao tác</dt>
                                <dd className="font-mono font-semibold tabular-nums text-[var(--text-secondary)]">
                                  {scenario.expectedActions.length}
                                </dd>
                              </div>
                              <div className="flex gap-1.5">
                                <dt>{scenario.updatedAt ? "Cập nhật" : "Ngày tạo"}</dt>
                                <dd className="font-medium text-[var(--text-secondary)]">
                                  {dateFormatter.format(new Date(scenario.updatedAt ?? scenario.createdAt))}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          <div className="col-span-2 flex items-center gap-2 border-t border-[var(--border)] pt-4 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                            <Link
                              href={`/admin/edit?id=${scenario.id}`}
                              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] bg-white px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:flex-none"
                            >
                              <PencilSimple aria-hidden size={17} weight="regular" />
                              Sửa
                            </Link>
                            <button
                              type="button"
                              onClick={() => setScenarioToDelete(scenario)}
                              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] lg:flex-none"
                            >
                              <Trash aria-hidden size={17} weight="regular" />
                              Xóa
                            </button>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </ScenarioListFrame>
          </section>

          {scenarioToDelete ? (
            <DeleteScenarioDialog
              scenarioTitle={scenarioToDelete.title}
              onCancel={() => setScenarioToDelete(null)}
              onConfirm={confirmDelete}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
