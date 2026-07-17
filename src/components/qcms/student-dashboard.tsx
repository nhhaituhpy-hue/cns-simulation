"use client";

import {
  ArrowRight,
  FolderOpen,
  MapPin,
  Monitor,
  Warning,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { DmeStudentDashboard } from "@/components/dme/student/dme-student-dashboard";
import {
  EmptyState,
  ModuleNavigation,
  ScenarioListFrame,
  ScenarioSectionHeader,
  WorkspaceHeader,
  type CnsModule,
} from "@/components/ui/exam-workspace";
import { VorStudentDashboard } from "@/components/vor/student/vor-student-dashboard";
import {
  formatScenarioNumber,
  sortScenariosByRecency,
} from "@/lib/scenario-order";
import type { Scenario } from "@/lib/types";
import { useScenarioStore } from "@/stores/scenario-store";
import { countScenarioSensors, DIFFICULTY_DETAILS } from "./qcms-utils";
import { StudentDashboardLoading } from "./student-loading";

function ScenarioRow({
  scenario,
  index,
}: {
  scenario: Scenario;
  index: number;
}) {
  const difficulty = DIFFICULTY_DETAILS[scenario.difficulty];
  const sensorCount = countScenarioSensors(scenario.sites);

  return (
    <li>
      <article className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 p-4 transition-colors hover:bg-[var(--surface-subtle)] sm:p-5 lg:grid-cols-[2.5rem_minmax(0,1fr)_auto] lg:items-center">
        <span
          aria-label={`Bài thực hành số ${index + 1}`}
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

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden size={15} weight="regular" />
              <span className="font-mono tabular-nums">{scenario.sites.length} site</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Monitor aria-hidden size={15} weight="regular" />
              <span className="font-mono tabular-nums">{sensorCount} cảm biến</span>
            </span>
          </div>
        </div>

        <div className="col-span-2 border-t border-[var(--border)] pt-4 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <Link
            href={`/student/simulation?id=${encodeURIComponent(scenario.id)}`}
            aria-label={`Mở bài thực hành: ${scenario.title}`}
            className="group inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.98] active:bg-[var(--accent-active)] motion-reduce:transform-none lg:w-auto"
          >
            Mở bài thực hành
            <ArrowRight
              aria-hidden
              size={17}
              weight="regular"
              className="transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </Link>
        </div>
      </article>
    </li>
  );
}

export type StudentCnsModule = CnsModule;

export function StudentDashboard({
  activeModule = "vor",
}: {
  activeModule?: StudentCnsModule;
}) {
  const { scenarios, isHydrated, storageError, hydrate } = useScenarioStore();
  const sortedScenarios = useMemo(
    () => sortScenariosByRecency(scenarios),
    [scenarios],
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return <StudentDashboardLoading />;
  }

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
      <WorkspaceHeader
        role="student"
        title="Bài thực hành mô phỏng CNS"
        description="Chọn kịch bản được giao, thực hiện quy trình chẩn đoán và nộp kết luận theo yêu cầu của giám khảo."
      />

      <ModuleNavigation role="student" activeModule={activeModule} />

      {activeModule === "vor" ? <VorStudentDashboard /> : null}
      {activeModule === "dme" ? <DmeStudentDashboard /> : null}

      {activeModule === "ads-b" ? (
        <>
          {storageError ? (
            <div
              role="status"
              className="mt-5 flex items-start gap-3 rounded-lg border border-[#f59e0b] bg-[#fffbeb] p-4 text-[#78350f]"
            >
              <Warning aria-hidden className="mt-0.5 shrink-0" size={19} weight="duotone" />
              <div>
                <p className="text-sm font-semibold">Không thể đọc dữ liệu đã lưu</p>
                <p className="mt-1 text-xs leading-5">
                  Hệ thống đang dùng bộ kịch bản mẫu để bạn có thể tiếp tục.
                </p>
              </div>
            </div>
          ) : null}

          <section aria-labelledby="practice-list-title" className="mt-7">
            <ScenarioSectionHeader
              id="practice-list-title"
              title="Thực hành xử lý sự cố ADS-B"
              description="Quan sát trạng thái QCMS và thực hiện chuỗi thao tác trên terminal bảo trì."
              count={sortedScenarios.length}
              countLabel="bài"
            />

            <ScenarioListFrame>
              {sortedScenarios.length === 0 ? (
                <EmptyState
                  icon={<FolderOpen aria-hidden size={23} weight="duotone" />}
                  title="Chưa có bài thực hành"
                  description="Giám khảo cần tạo ít nhất một kịch bản trước khi học viên bắt đầu."
                  action={
                    <Link
                      href="/admin/create"
                      className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                    >
                      Tạo kịch bản
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {sortedScenarios.map((scenario, index) => (
                    <ScenarioRow key={scenario.id} scenario={scenario} index={index} />
                  ))}
                </ul>
              )}
            </ScenarioListFrame>
          </section>
        </>
      ) : null}
    </div>
  );
}
