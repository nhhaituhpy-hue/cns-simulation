"use client";

import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { MapPin } from "@phosphor-icons/react/dist/csr/MapPin";
import { Monitor } from "@phosphor-icons/react/dist/csr/Monitor";
import { NotePencil } from "@phosphor-icons/react/dist/csr/NotePencil";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { countScenarioSensors, DIFFICULTY_DETAILS } from "@/components/qcms/qcms-utils";
import { StudentDashboardLoading } from "@/components/qcms/student-loading";
import { EmptyState, ScenarioListFrame, ScenarioSectionHeader } from "@/components/ui/exam-workspace";
import { ScenarioDataTable } from "@/components/ui/scenario-data-table";
import { formatScenarioNumber, sortScenariosByRecency } from "@/lib/scenario-order";
import type { Scenario } from "@/lib/types";
import { useScenarioStore } from "@/stores/scenario-store";

const scenarioColumns = [
  { id: "number", label: "STT", className: "w-16" },
  { id: "title", label: "Tiêu đề" },
  { id: "difficulty", label: "Mức độ", className: "w-28" },
  { id: "scope", label: "Phạm vi", className: "w-40" },
  { id: "actions", label: "Thao tác", className: "w-24 text-right" },
];

function ScenarioCells({ scenario, index }: { scenario: Scenario; index: number }) {
  const difficulty = DIFFICULTY_DETAILS[scenario.difficulty];
  const sensorCount = countScenarioSensors(scenario.sites);
  return (
    <>
      <td className="px-4 py-4 align-top">
        <span aria-label={`Bài thực hành số ${index + 1}`} className="inline-flex size-8 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-muted)] text-xs font-bold tabular-nums text-[var(--text-secondary)]">{formatScenarioNumber(index)}</span>
      </td>
      <td className="px-4 py-4 align-top">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{scenario.title}</h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[var(--text-secondary)]">{scenario.description}</p>
      </td>
      <td className="px-4 py-4 align-top">
        <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${difficulty.className}`}>{difficulty.label}</span>
      </td>
      <td className="px-4 py-4 align-top text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5"><MapPin aria-hidden size={15} /><span className="font-mono tabular-nums">{scenario.sites.length} site</span></span>
        <span className="mt-1.5 flex items-center gap-1.5"><Monitor aria-hidden size={15} /><span className="font-mono tabular-nums">{sensorCount} cảm biến</span></span>
      </td>
      <td className="px-4 py-4 text-right align-top">
        <Link href={`/student/simulation?id=${encodeURIComponent(scenario.id)}`} aria-label={`Mở bài thực hành: ${scenario.title}`} title="Mở bài thực hành" className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--accent-border)] bg-[var(--surface)] text-[var(--accent)] transition-[background-color,border-color,transform] duration-150 hover:bg-[var(--accent-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none">
          <NotePencil aria-hidden size={19} />
        </Link>
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
    <>
      {storageError ? (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-lg border border-[#f59e0b] bg-[#fffbeb] p-4 text-[#78350f]">
          <Warning aria-hidden className="mt-0.5 shrink-0" size={19} weight="duotone" />
          <div><p className="text-sm font-semibold">Không thể đọc dữ liệu đã lưu</p><p className="mt-1 text-xs leading-5">Hệ thống đang dùng bộ kịch bản mẫu để bạn có thể tiếp tục.</p></div>
        </div>
      ) : null}
      <section aria-labelledby="practice-list-title" className="mt-0">
        <ScenarioSectionHeader id="practice-list-title" title="Thực hành xử lý sự cố ADS-B" description="Quan sát trạng thái QCMS và thực hiện chuỗi thao tác trên terminal bảo trì." count={sortedScenarios.length} countLabel="bài" />
        <ScenarioListFrame>
          {sortedScenarios.length === 0 ? (
            <EmptyState icon={<FolderOpen aria-hidden size={23} weight="duotone" />} title="Chưa có bài thực hành" description="Giám khảo cần tạo ít nhất một kịch bản trước khi học viên bắt đầu." action={<Link href="/authoring/ads-b/create" className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2">Tạo kịch bản</Link>} />
          ) : (
            <ScenarioDataTable items={sortedScenarios} caption="Danh sách kịch bản ADS-B dành cho thí sinh" columns={scenarioColumns} renderCells={(scenario, rowIndex) => <ScenarioCells scenario={scenario} index={rowIndex} />} />
          )}
        </ScenarioListFrame>
      </section>
    </>
  );
}
