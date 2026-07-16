"use client";

import Link from "next/link";
import {
  ArrowRight,
  FolderOpen,
  MapPin,
  Monitor,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useMemo } from "react";
import {
  formatScenarioNumber,
  sortScenariosByRecency,
} from "@/lib/scenario-order";
import type { Scenario } from "@/lib/types";
import { useScenarioStore } from "@/stores/scenario-store";
import {
  countScenarioSensors,
  DIFFICULTY_DETAILS,
} from "./qcms-utils";
import { StudentDashboardLoading } from "./student-loading";
import { VorStudentDashboard } from "@/components/vor/student/vor-student-dashboard";

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
      <article className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 lg:grid-cols-[2.5rem_minmax(0,1fr)_auto] lg:items-center">
          <span
            aria-label={`Bài thực hành số ${index + 1}`}
            className="inline-flex size-9 items-center justify-center self-start rounded-full border border-[var(--border-strong)] bg-[var(--surface-muted)] font-mono text-xs font-bold tabular-nums text-[var(--text-secondary)] lg:self-center"
          >
            {formatScenarioNumber(index)}
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--text-primary)] sm:text-lg">
                {scenario.title}
              </h3>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${difficulty.className}`}
              >
                {difficulty.label}
              </span>
            </div>

            <p className="mt-2 line-clamp-2 max-w-[75ch] text-sm leading-6 text-[var(--text-secondary)]">
              {scenario.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden size={15} weight="regular" />
                <span className="font-mono tabular-nums">
                  {scenario.sites.length} site
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Monitor aria-hidden size={15} weight="regular" />
                <span className="font-mono tabular-nums">
                  {sensorCount} cảm biến
                </span>
              </span>
            </div>
          </div>

          <div className="col-span-2 border-t border-[var(--border)] pt-4 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <Link
              href={`/student/simulation?id=${encodeURIComponent(scenario.id)}`}
              aria-label={`Mở bài thực hành: ${scenario.title}`}
              className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:bg-[var(--accent-active)] lg:w-auto"
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
        </div>
      </article>
    </li>
  );
}

export type StudentCnsModule = "vor" | "dme" | "ads-b";

export function StudentDashboard({ activeModule = "vor" }: { activeModule?: StudentCnsModule }) {
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
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="border-b border-[var(--border)] pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Bài thực hành mô phỏng CNS
        </h1>
        <p className="mt-2 max-w-[65ch] text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
          Chọn một kịch bản để quan sát trạng thái thiết bị và thực hiện quy trình xử lý sự cố.
        </p>
      </header>

      <div className="mt-6 border-b border-[var(--border)]">
        <nav aria-label="Phân hệ thiết bị CNS" className="flex gap-6">
          {(["vor", "dme", "ads-b"] as const).map((tabId) => {
            const active = activeModule === tabId;
            const label = tabId === "vor" ? "VOR" : tabId === "dme" ? "DME" : "ADS-B";
            return (
              <Link
                key={tabId}
                href={`/student/${tabId}`}
                aria-current={active ? "page" : undefined}
                className={`border-b-2 pb-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
                  active
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {activeModule === "vor" ? (
        <VorStudentDashboard />
      ) : null}

      {activeModule === "dme" ? (
        <div className="mt-8 rounded-lg border border-dashed border-[var(--border-strong)] bg-white px-5 py-16 text-center">
          <span className="mx-auto inline-flex size-12 items-center justify-center rounded bg-[var(--surface-muted)] text-[var(--text-muted)]">
            <WarningCircle aria-hidden size={25} weight="regular" />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            Phân hệ mô phỏng DME
          </h3>
          <p className="mx-auto mt-2 max-w-[48ch] text-sm leading-6 text-[var(--text-secondary)]">
            Hệ thống mô phỏng thiết bị đo cự ly hàng không (DME) đang trong quá trình phát triển và sẽ sớm ra mắt.
          </p>
        </div>
      ) : null}

      {activeModule === "ads-b" ? (
        <>
          {storageError ? (
            <div
              role="status"
              className="mt-5 flex items-start gap-3 rounded border border-[#f59e0b] bg-[#fffbeb] p-4 text-[#78350f]"
            >
              <Warning aria-hidden className="mt-0.5 shrink-0" size={19} weight="fill" />
              <div>
                <p className="text-sm font-semibold">Không thể đọc dữ liệu đã lưu</p>
                <p className="mt-1 text-xs leading-5">
                  Hệ thống đang dùng bộ kịch bản mẫu để bạn có thể tiếp tục.
                </p>
              </div>
            </div>
          ) : null}

          <section aria-labelledby="practice-list-title" className="mt-7">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2
                id="practice-list-title"
                className="text-lg font-semibold text-[var(--text-primary)]"
              >
                Danh sách bài thực hành
              </h2>
              <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
                {sortedScenarios.length} bài
              </span>
            </div>

            {sortedScenarios.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-white px-5 py-14 text-center">
                <FolderOpen
                  aria-hidden
                  size={34}
                  weight="regular"
                  className="mx-auto text-[var(--text-muted)]"
                />
                <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                  Chưa có bài thực hành
                </h3>
                <p className="mx-auto mt-2 max-w-[52ch] text-sm leading-6 text-[var(--text-secondary)]">
                  Quản trị viên cần tạo ít nhất một kịch bản trước khi học viên bắt đầu.
                </p>
                <Link
                  href="/admin/create"
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                >
                  Tạo kịch bản
                </Link>
              </div>
            ) : (
              <ul className="grid gap-3">
                {sortedScenarios.map((scenario, index) => (
                  <ScenarioRow
                    key={scenario.id}
                    scenario={scenario}
                    index={index}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
