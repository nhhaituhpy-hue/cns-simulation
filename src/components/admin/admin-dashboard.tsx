"use client";

import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";
import { FilePlus } from "@phosphor-icons/react/dist/csr/FilePlus";
import { PencilSimple } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Terminal } from "@phosphor-icons/react/dist/csr/Terminal";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DmeAdminDashboard } from "@/components/dme/admin/dme-admin-dashboard";
import {
  EmptyState,
  LoadingRows,
  ModuleSummary,
  ScenarioListFrame,
  ScenarioSectionHeader,
  type CnsModule,
} from "@/components/ui/exam-workspace";
import { ScenarioDataTable } from "@/components/ui/scenario-data-table";
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

const scenarioColumns = [
  { id: "number", label: "STT", className: "w-16" },
  { id: "title", label: "Tiêu đề" },
  { id: "difficulty", label: "Mức độ", className: "w-28" },
  { id: "configuration", label: "Quy mô", className: "w-48" },
  { id: "actions", label: "Thao tác", className: "w-28 text-right" },
];

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
    <div className="w-full max-w-none px-4 py-3 sm:px-6 lg:px-8 lg:py-4 xl:px-10 2xl:px-12">

      {activeModule === "vor" ? <VorAdminDashboard /> : null}
      {activeModule === "dme" ? <DmeAdminDashboard /> : null}

      {activeModule === "ads-b" ? (
        <>
          <ModuleSummary
            title="Mô phỏng giám sát ADS-B"
            description="Cấu hình trạng thái site, dữ liệu cảm biến và chuỗi thao tác chuẩn trên QCMS và terminal bảo trì."
            icon={Broadcast}
            actions={
              <>
                <Link
                  href="/admin/ads-b/simulator"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--accent-border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--accent)] transition-[background-color,border-color,transform] hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transform-none"
                >
                  <Terminal aria-hidden size={18} weight="bold" />
                  Mở giả lập ADS-B
                </Link>
                <Link
                  href="/admin/create"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.98] active:bg-[var(--accent-active)] motion-reduce:transform-none"
                >
                  <Plus aria-hidden size={18} weight="bold" />
                  Tạo kịch bản ADS-B
                </Link>
              </>
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
                <ScenarioDataTable
                  items={sortedScenarios}
                  caption="Danh sách kịch bản ADS-B dành cho giám khảo"
                  columns={scenarioColumns}
                  renderCells={(scenario, rowIndex) => {
                    const difficulty = difficultyDetails[scenario.difficulty];
                    return (
                      <>
                        <td className="px-4 py-4 align-top">
                          <span
                            aria-label={`Kịch bản số ${rowIndex + 1}`}
                            className="inline-flex size-8 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-muted)] text-xs font-bold tabular-nums text-[var(--text-secondary)]"
                          >
                            {formatScenarioNumber(rowIndex)}
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
                        <td className="px-4 py-4 align-top text-xs leading-5 text-[var(--text-secondary)]">
                          <p><span className="font-mono font-semibold">{scenario.sites.length}</span> site</p>
                          <p><span className="font-mono font-semibold">{scenario.expectedActions.length}</span> thao tác</p>
                          <p>{scenario.updatedAt ? "Cập nhật" : "Ngày tạo"}: {dateFormatter.format(new Date(scenario.updatedAt ?? scenario.createdAt))}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/admin/edit?id=${scenario.id}`}
                              aria-label={`Sửa kịch bản: ${scenario.title}`}
                              title="Sửa kịch bản"
                              className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--border-strong)] bg-white text-[var(--text-secondary)] transition-[background-color,border-color,color,transform] duration-150 hover:border-[var(--accent-border)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none"
                            >
                              <PencilSimple aria-hidden size={18} weight="regular" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setScenarioToDelete(scenario)}
                              aria-label={`Xóa kịch bản: ${scenario.title}`}
                              title="Xóa kịch bản"
                              className="inline-flex size-9 items-center justify-center rounded-md border border-transparent text-[var(--danger)] transition-[background-color,border-color,transform] duration-150 hover:border-[#fecaca] hover:bg-[var(--danger-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none"
                            >
                              <Trash aria-hidden size={18} weight="regular" />
                            </button>
                          </div>
                        </td>
                      </>
                    );
                  }}
                />
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
