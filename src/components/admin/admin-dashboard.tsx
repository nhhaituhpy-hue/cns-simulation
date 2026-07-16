"use client";

import {
  FilePlus,
  PencilSimple,
  Plus,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  formatScenarioNumber,
  sortScenariosByRecency,
} from "@/lib/scenario-order";
import type { Scenario, ScenarioDifficulty } from "@/lib/types";
import { useScenarioStore } from "@/stores/scenario-store";
import { DeleteScenarioDialog } from "./delete-scenario-dialog";
import { VorAdminDashboard } from "@/components/vor/admin/vor-admin-dashboard";

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

function ScenarioLoadingState() {
  return (
    <div aria-busy="true" aria-label="Đang tải danh sách kịch bản" className="grid gap-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="rounded-lg border border-[var(--border)] bg-white p-5"
        >
          <div className="h-5 w-2/5 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
          <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
          <div className="mt-5 h-8 w-1/3 animate-pulse rounded bg-[var(--surface-muted)] motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

function EmptyScenarioState() {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-white px-5 py-12 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded bg-[var(--accent-muted)] text-[var(--accent)]">
        <FilePlus aria-hidden size={25} weight="regular" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
        Chưa có kịch bản
      </h2>
      <p className="mx-auto mt-2 max-w-[48ch] text-sm leading-6 text-[var(--text-secondary)]">
        Tạo kịch bản đầu tiên để cấu hình trạng thái cảm biến và đáp án thao tác.
      </p>
      <Link
        href="/admin/create"
        className="mt-5 inline-flex h-10 items-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      >
        <Plus aria-hidden size={18} weight="regular" />
        Tạo kịch bản
      </Link>
    </div>
  );
}

export function AdminDashboard() {
  const scenarios = useScenarioStore((state) => state.scenarios);
  const isHydrated = useScenarioStore((state) => state.isHydrated);
  const storageError = useScenarioStore((state) => state.storageError);
  const hydrate = useScenarioStore((state) => state.hydrate);
  const deleteScenario = useScenarioStore((state) => state.deleteScenario);
  const [scenarioToDelete, setScenarioToDelete] = useState<Scenario | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"vor" | "dme" | "adsb">("adsb");

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
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Quản lý kịch bản
          </h1>
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Cấu hình thiết bị, tạo tình huống sự cố và xác định chuỗi thao tác chuẩn cho phân hệ CNS (gồm VOR/DME/ADS-B).
          </p>
        </div>
        {activeTab === "adsb" ? (
          <Link
            href="/admin/create"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:bg-[var(--accent-active)]"
          >
            <Plus aria-hidden size={18} weight="regular" />
            Tạo kịch bản
          </Link>
        ) : null}
      </header>

      <div className="mt-6 border-b border-[var(--border)]">
        <nav aria-label="Phân hệ thiết bị CNS" className="flex gap-6">
          {(["vor", "dme", "adsb"] as const).map((tabId) => {
            const active = activeTab === tabId;
            const label = tabId === "vor" ? "VOR" : tabId === "dme" ? "DME" : "ADS-B";
            return (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                aria-current={active ? "page" : undefined}
                className={`border-b-2 pb-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
                  active
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === "vor" ? (
        <VorAdminDashboard />
      ) : null}

      {activeTab === "dme" ? (
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

      {activeTab === "adsb" ? (
        <>
          {storageError ? (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#78350f]"
            >
              <WarningCircle aria-hidden size={20} weight="regular" className="mt-0.5 shrink-0" />
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
              className="mt-5 rounded border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]"
            >
              {deleteError}
            </p>
          ) : null}

          <section aria-labelledby="scenario-list-title" className="mt-7">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id="scenario-list-title" className="text-lg font-semibold text-[var(--text-primary)]">
                Danh sách kịch bản
              </h2>
              {isHydrated ? (
                <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
                  {scenarios.length} kịch bản
                </span>
              ) : null}
            </div>

            {!isHydrated ? <ScenarioLoadingState /> : null}
            {isHydrated && sortedScenarios.length === 0 ? <EmptyScenarioState /> : null}

            {isHydrated && sortedScenarios.length > 0 ? (
              <ul className="grid gap-3">
                {sortedScenarios.map((scenario, index) => {
                  const difficulty = difficultyDetails[scenario.difficulty];

                  return (
                    <li key={scenario.id}>
                      <article className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
                        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 lg:grid-cols-[2.5rem_minmax(0,1fr)_auto] lg:items-center">
                          <span
                            aria-label={`Kịch bản số ${index + 1}`}
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
                            <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-muted)]">
                              <div className="flex gap-1.5">
                                <dt>Site:</dt>
                                <dd className="font-mono font-semibold tabular-nums text-[var(--text-secondary)]">
                                  {scenario.sites.length}
                                </dd>
                              </div>
                              <div className="flex gap-1.5">
                                <dt>Thao tác:</dt>
                                <dd className="font-mono font-semibold tabular-nums text-[var(--text-secondary)]">
                                  {scenario.expectedActions.length}
                                </dd>
                              </div>
                              <div className="flex gap-1.5">
                                <dt>{scenario.updatedAt ? "Cập nhật:" : "Ngày tạo:"}</dt>
                                <dd className="font-medium text-[var(--text-secondary)]">
                                  {dateFormatter.format(
                                    new Date(scenario.updatedAt ?? scenario.createdAt),
                                  )}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          <div className="col-span-2 flex items-center gap-2 border-t border-[var(--border)] pt-4 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                            <Link
                              href={`/admin/edit?id=${scenario.id}`}
                              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded border border-[var(--border-strong)] bg-white px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:flex-none"
                            >
                              <PencilSimple aria-hidden size={17} weight="regular" />
                              Sửa
                            </Link>
                            <button
                              type="button"
                              onClick={() => setScenarioToDelete(scenario)}
                              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded px-3 text-sm font-semibold text-[#b91c1c] hover:bg-[#fef2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c] lg:flex-none"
                            >
                              <Trash aria-hidden size={17} weight="regular" />
                              Xóa
                            </button>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            ) : null}
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
