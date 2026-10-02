"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { FilePlus } from "@phosphor-icons/react/dist/csr/FilePlus";
import { PencilSimple } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Terminal } from "@phosphor-icons/react/dist/csr/Terminal";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DeleteScenarioDialog } from "@/components/admin/delete-scenario-dialog";
import { AdsbScenarioLibraryPanel } from "@/components/scenario/adsb-scenario-library-panel";
import {
  Button,
  ButtonLink,
  CountBadgePill,
  DifficultyBadge,
} from "@/components/ui/button";
import { ScenarioListFrame } from "@/components/ui/exam-workspace";
import { ScenarioDataTable } from "@/components/ui/scenario-data-table";
import { formatScenarioNumber, sortScenariosByRecency } from "@/lib/scenario-order";
import type { Scenario } from "@/lib/types";
import { useScenarioStore } from "@/stores/scenario-store";

const scenarioColumns = [
  { id: "number", label: "STT", className: "w-16" },
  { id: "title", label: "Tiêu đề" },
  { id: "difficulty", label: "Mức độ", className: "w-28" },
  { id: "configuration", label: "Quy mô", className: "w-48" },
  { id: "actions", label: "Thao tác", className: "w-28 text-right" },
];

export function AdsbAdminDashboard() {
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

  const sortedScenarios = useMemo(() => sortScenariosByRecency(scenarios), [scenarios]);

  function confirmDelete() {
    if (!scenarioToDelete) return;
    const deleted = deleteScenario(scenarioToDelete.id);
    setDeleteError(deleted ? null : "Kịch bản không còn tồn tại hoặc đã được xóa.");
    setScenarioToDelete(null);
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/authoring"
          className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[13px] font-medium text-[#38a3dc] transition-colors hover:bg-white/[0.04] hover:text-[#7dd3fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7]"
        >
          <ArrowLeft aria-hidden size={15} />
          <span>Danh sách thiết bị</span>
        </Link>
      </div>

      {/* Main Workspace Header */}
      <header className="border-b border-white/[0.08] pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#38a3dc]">
              Kịch bản / ADS-B
            </p>
            <h1 className="mt-1.5 text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#E6EDF5] leading-tight">
              Kịch bản ADS-B
            </h1>
            <p className="mt-2 max-w-[640px] text-[13px] sm:text-[14px] leading-relaxed text-[#9AA9BC]">
              Cấu hình trạng thái site, dữ liệu cảm biến và chuỗi thao tác chuẩn trên QCMS và terminal bảo trì.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <ButtonLink
              href="/simulator/ads-b"
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              size="md"
              className="inline-flex items-center gap-1.5"
            >
              <Terminal aria-hidden size={16} weight="bold" />
              <span>Mở giả lập ADS-B</span>
            </ButtonLink>
            <ButtonLink
              href="/authoring/ads-b/create"
              variant="primary"
              size="md"
              className="inline-flex items-center gap-1.5"
            >
              <Plus aria-hidden size={16} weight="bold" />
              <span>Tạo kịch bản ADS-B</span>
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* Storage and System Alerts */}
      {storageError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[8px] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[13px] leading-5 text-amber-200"
        >
          <WarningCircle aria-hidden size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold text-amber-100">Dữ liệu cục bộ đang có vấn đề</p>
            <p className="mt-0.5 text-amber-200/80">
              Danh sách vẫn dùng được trong phiên này, nhưng thay đổi có thể chưa được lưu trên thiết bị.
            </p>
          </div>
        </div>
      ) : null}

      {deleteError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[8px] border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] leading-5 text-red-200"
        >
          <WarningCircle aria-hidden size={18} className="mt-0.5 shrink-0 text-red-400" />
          <span>{deleteError}</span>
        </div>
      ) : null}

      {/* Scenario Library Distribution Controls */}
      <AdsbScenarioLibraryPanel />

      {/* Scenarios Table Section */}
      <section aria-labelledby="scenario-list-title" className="space-y-4 pt-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="scenario-list-title" className="text-[16px] font-semibold tracking-tight text-[#E6EDF5]">
              Danh sách kịch bản ADS-B
            </h2>
            <p className="mt-0.5 text-[13px] text-[#9AA9BC]">
              Kịch bản mới cập nhật được hiển thị trước.
            </p>
          </div>
          {isHydrated ? (
            <CountBadgePill>{scenarios.length} kịch bản</CountBadgePill>
          ) : null}
        </div>

        <ScenarioListFrame>
          {!isHydrated ? (
            <div role="status" className="flex items-center justify-center py-16 text-[13px] text-[#9AA9BC]">
              Đang tải danh sách kịch bản…
            </div>
          ) : null}

          {isHydrated && sortedScenarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.04] text-[#38a3dc]">
                <FilePlus aria-hidden size={24} weight="duotone" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-[#E6EDF5]">Chưa có kịch bản</h3>
              <p className="mt-1 max-w-[420px] text-[13px] text-[#9AA9BC]">
                Tạo kịch bản đầu tiên để cấu hình trạng thái cảm biến và đáp án thao tác.
              </p>
              <div className="mt-5">
                <ButtonLink
                  href="/authoring/ads-b/create"
                  variant="primary"
                  size="md"
                  className="inline-flex items-center gap-1.5"
                >
                  <Plus aria-hidden size={16} weight="bold" />
                  <span>Tạo kịch bản</span>
                </ButtonLink>
              </div>
            </div>
          ) : null}

          {isHydrated && sortedScenarios.length > 0 ? (
            <ScenarioDataTable
              items={sortedScenarios}
              caption="Danh sách kịch bản ADS-B dành cho giám khảo"
              columns={scenarioColumns}
              renderCells={(scenario, rowIndex) => {
                return (
                  <>
                    <td className="w-16 px-4 py-3.5 align-middle">
                      <span
                        aria-label={`Kịch bản số ${rowIndex + 1}`}
                        className="inline-flex size-7 items-center justify-center rounded-[6px] border border-white/[0.08] bg-white/[0.04] text-[12px] font-semibold tabular-nums text-[#9AA9BC]"
                      >
                        {formatScenarioNumber(rowIndex)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <h3 className="text-[14px] font-semibold text-[#E6EDF5] leading-snug">
                        {scenario.title}
                      </h3>
                      {scenario.description ? (
                        <p className="mt-0.5 line-clamp-1 text-[12px] leading-relaxed text-[#9AA9BC]">
                          {scenario.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="w-28 px-4 py-3.5 align-middle">
                      <DifficultyBadge difficulty={scenario.difficulty} />
                    </td>
                    <td className="w-48 px-4 py-3.5 align-middle text-[12px] leading-relaxed text-[#9AA9BC]">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-[4px] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#E6EDF5]">
                            {scenario.sites.length}
                          </span>
                          <span>site</span>
                          <span className="text-white/20">·</span>
                          <span className="inline-flex items-center rounded-[4px] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#E6EDF5]">
                            {scenario.expectedActions.length}
                          </span>
                          <span>thao tác</span>
                        </div>
                        <span className="text-[11px] text-[#9AA9BC]/80">
                          {scenario.updatedAt ? "Cập nhật" : "Ngày tạo"}:{" "}
                          {new Intl.DateTimeFormat("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            timeZone: "UTC",
                          }).format(new Date(scenario.updatedAt ?? scenario.createdAt))}
                        </span>
                      </div>
                    </td>
                    <td className="w-28 px-4 py-3.5 align-middle">
                      <div className="flex justify-end gap-1.5">
                        <ButtonLink
                          href={`/authoring/ads-b/edit?id=${scenario.id}`}
                          variant="secondary"
                          size="sm"
                          aria-label={`Sửa kịch bản: ${scenario.title}`}
                          title="Sửa kịch bản"
                          className="size-8 !px-0"
                        >
                          <PencilSimple aria-hidden size={15} weight="bold" />
                        </ButtonLink>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => setScenarioToDelete(scenario)}
                          aria-label={`Xóa kịch bản: ${scenario.title}`}
                          title="Xóa kịch bản"
                          className="size-8 !px-0"
                        >
                          <Trash aria-hidden size={15} weight="bold" />
                        </Button>
                      </div>
                    </td>
                  </>
                );
              }}
            />
          ) : null}
        </ScenarioListFrame>
      </section>

      {/* Delete Confirmation Modal Dialog */}
      {scenarioToDelete ? (
        <DeleteScenarioDialog
          scenarioTitle={scenarioToDelete.title}
          onCancel={() => setScenarioToDelete(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}
