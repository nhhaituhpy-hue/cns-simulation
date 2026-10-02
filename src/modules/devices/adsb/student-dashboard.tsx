"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { MapPin } from "@phosphor-icons/react/dist/csr/MapPin";
import { Monitor } from "@phosphor-icons/react/dist/csr/Monitor";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { countScenarioSensors } from "@/components/qcms/qcms-utils";
import { StudentDashboardLoading } from "@/components/qcms/student-loading";
import { ButtonLink, DifficultyBadge } from "@/components/ui/button";
import { EmptyState, ScenarioListFrame } from "@/components/ui/exam-workspace";
import { ScenarioDataTable } from "@/components/ui/scenario-data-table";
import { formatScenarioNumber, sortScenariosByRecency } from "@/lib/scenario-order";
import type { Scenario } from "@/lib/types";
import { useScenarioStore } from "@/stores/scenario-store";

const scenarioColumns = [
  { id: "number", label: "STT", className: "w-16 px-5 py-3 sm:px-6" },
  { id: "title", label: "Tiêu đề", className: "px-5 py-3 sm:px-6" },
  { id: "difficulty", label: "Mức độ", className: "w-32 px-4 py-3" },
  { id: "scope", label: "Phạm vi", className: "w-36 px-4 py-3" },
  { id: "actions", label: "Thao tác", className: "w-32 px-5 py-3 text-right sm:px-6" },
];

function ScenarioCells({ scenario, index }: { scenario: Scenario; index: number }) {
  const sensorCount = countScenarioSensors(scenario.sites);
  return (
    <>
      <td className="w-16 px-5 py-3.5 align-middle sm:px-6">
        <span
          aria-label={`Bài thực hành số ${index + 1}`}
          className="inline-flex size-7 items-center justify-center rounded-[6px] border border-white/[0.08] bg-white/[0.04] text-[12px] font-semibold tabular-nums text-[#9AA9BC]"
        >
          {formatScenarioNumber(index)}
        </span>
      </td>
      <td className="px-5 py-3.5 align-middle sm:px-6">
        <h3 className="text-[14px] font-semibold text-[#E6EDF5] leading-snug hover:text-[#38a3dc] transition-colors">
          {scenario.title}
        </h3>
        {scenario.description ? (
          <p className="mt-1 line-clamp-2 text-[12px] sm:text-[13px] leading-relaxed text-[#9AA9BC]">
            {scenario.description}
          </p>
        ) : null}
      </td>
      <td className="w-32 px-4 py-3.5 align-middle">
        <DifficultyBadge difficulty={scenario.difficulty} />
      </td>
      <td className="w-36 px-4 py-3.5 align-middle text-[12px] text-[#9AA9BC]">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5">
            <MapPin aria-hidden size={14} className="text-[#6B7A8D]" />
            <span className="font-mono tabular-nums">{scenario.sites.length} site</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Monitor aria-hidden size={14} className="text-[#6B7A8D]" />
            <span className="font-mono tabular-nums">{sensorCount} cảm biến</span>
          </span>
        </div>
      </td>
      <td className="w-32 px-5 py-3.5 text-right align-middle sm:px-6">
        <ButtonLink
          href={`/student/simulation?id=${encodeURIComponent(scenario.id)}`}
          variant="primary"
          size="sm"
          aria-label={`Bắt đầu bài ADS-B: ${scenario.title}`}
          title="Bắt đầu bài thực hành"
          className="inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <Play aria-hidden size={12} weight="fill" className="shrink-0 translate-x-[0.5px]" />
          <span className="whitespace-nowrap font-medium">Bắt đầu</span>
        </ButtonLink>
      </td>
    </>
  );
}

export function AdsbStudentDashboard() {
  const { scenarios, isHydrated, storageError, hydrate } = useScenarioStore();
  const sortedScenarios = useMemo(() => sortScenariosByRecency(scenarios), [scenarios]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isHydrated) return <StudentDashboardLoading />;

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/review"
          className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[13px] font-medium text-[#38a3dc] transition-colors hover:bg-white/[0.04] hover:text-[#7dd3fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7]"
        >
          <ArrowLeft aria-hidden size={15} />
          <span>Danh sách thiết bị</span>
        </Link>
      </div>

      {storageError ? (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-lg border border-[#f59e0b] bg-[#fffbeb] p-4 text-[#78350f]">
          <Warning aria-hidden className="mt-0.5 shrink-0" size={19} weight="duotone" />
          <div><p className="text-sm font-semibold">Không thể đọc dữ liệu đã lưu</p><p className="mt-1 text-xs leading-5">Hệ thống đang dùng bộ kịch bản mẫu để bạn có thể tiếp tục.</p></div>
        </div>
      ) : null}
      <section aria-labelledby="practice-list-title" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#38a3dc]">
              Ôn tập / Thực hành
            </p>
            <h1
              id="practice-list-title"
              className="mt-1 text-[26px] sm:text-[28px] font-semibold tracking-tight text-[#E6EDF5] leading-tight"
            >
              Thực hành xử lý sự cố ADS-B
            </h1>
            <p className="mt-2 max-w-[640px] text-[13px] sm:text-[14px] leading-relaxed text-[#9AA9BC]">
              Quan sát trạng thái QCMS và thực hiện chuỗi thao tác trên terminal bảo trì.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="inline-flex h-6 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 text-[12px] font-medium tabular-nums text-[#9AA9BC]">
              <span className="font-semibold text-[#E6EDF5]">{sortedScenarios.length}</span> bài
            </span>
          </div>
        </div>
        <ScenarioListFrame>
          {sortedScenarios.length === 0 ? (
            <EmptyState icon={<FolderOpen aria-hidden size={23} weight="duotone" />} title="Chưa có bài thực hành" description="Giám khảo cần tạo ít nhất một kịch bản trước khi học viên bắt đầu." action={<Link href="/authoring/ads-b/create" className="inline-flex min-h-10 items-center justify-center rounded bg-[var(--accent)] px-3 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2">Tạo kịch bản</Link>} />
          ) : (
            <ScenarioDataTable items={sortedScenarios} caption="Danh sách kịch bản ADS-B dành cho thí sinh" columns={scenarioColumns} renderCells={(scenario, rowIndex) => <ScenarioCells scenario={scenario} index={rowIndex} />} />
          )}
        </ScenarioListFrame>
      </section>
    </div>
  );
}
