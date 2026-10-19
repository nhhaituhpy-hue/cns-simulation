"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { X } from "@phosphor-icons/react/dist/csr/X";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  CountBadgePill,
  DifficultyBadge,
} from "@/components/ui/button";
import { ScenarioListFrame } from "@/components/ui/exam-workspace";
import { ScenarioDataTable } from "@/components/ui/scenario-data-table";
import { getSimulatorModule } from "@/modules/core/registry";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import type { StoredScenarioParameters } from "@/lib/scenario-parameters-storage";
import type { AssignedReviewScenario } from "@/lib/review-scenarios";

type ReviewModuleId = ScenarioParametersModuleId;

const moduleCopy: Record<
  ReviewModuleId,
  { shortName: string; title: string; description: string }
> = {
  "dvor-1150": {
    shortName: "DVOR 1150",
    title: "Thực hành xử lý sự cố DVOR 1150",
    description:
      "Chọn một tình huống đã được giám khảo đưa vào danh sách ôn tập để thực hành trên PMDT DVOR 1150.",
  },
  "dvor-1150a": {
    shortName: "DVOR 1150A",
    title: "Thực hành xử lý sự cố DVOR 1150A",
    description:
      "Chọn một tình huống đã được giám khảo đưa vào danh sách ôn tập để thực hành trên PMDT DVOR 1150A.",
  },
  "dme-1119a": {
    shortName: "DME 1119A",
    title: "Thực hành xử lý sự cố DME 1119A",
    description:
      "Chọn một tình huống đã được giám khảo đưa vào danh sách ôn tập để thực hành trên PMDT DME 1119A.",
  },
  "dvor-220": {
    shortName: "DVOR 220",
    title: "Thực hành xử lý sự cố DVOR 220",
    description:
      "Chọn một tình huống đã được giám khảo đưa vào danh sách ôn tập để thực hành trên PMDT/LMI MOPIENS 220.",
  },
  "dme-320": {
    shortName: "DME 320",
    title: "Thực hành xử lý sự cố DME 320",
    description:
      "Chọn một tình huống đã được giám khảo đưa vào danh sách ôn tập để thực hành trên PMDT/LMI MOPIENS 320.",
  },
  "ads-b": {
    shortName: "ADS-B",
    title: "Thực hành xử lý sự cố ADS-B",
    description:
      "Chọn một tình huống đã được giám khảo đưa vào danh sách ôn tập để thực hành trên QCMS và terminal bảo trì ADS-B.",
  },
};

const scenarioColumns = [
  { id: "number", label: "STT", className: "w-16" },
  { id: "title", label: "Tiêu đề" },
  { id: "difficulty", label: "Mức độ", className: "w-28" },
  { id: "actions", label: "Thao tác", className: "w-32 text-right" },
];

export type OperationsReviewScenarioRow = {
  id: string;
  title: string;
  description: string;
  difficulty: "basic" | "intermediate" | "advanced";
  href: string;
};

type ReviewApiPayload = {
  assigned: AssignedReviewScenario[];
  available?: StoredScenarioParameters[];
  canManage: boolean;
  libraryRevision?: number;
};

function responseMessage(response: Response, fallback: string) {
  return response
    .json()
    .then((payload: unknown) => {
      if (
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof payload.error === "string"
      ) {
        return payload.error;
      }
      return fallback;
    })
    .catch(() => fallback);
}

function normalizeDifficulty(
  value: string
): "basic" | "intermediate" | "advanced" {
  return value === "advanced" || value === "intermediate" ? value : "basic";
}

function toScenarioRow(
  moduleId: ReviewModuleId,
  scenario: AssignedReviewScenario
): OperationsReviewScenarioRow {
  const simulator = getSimulatorModule(moduleId);
  return {
    id: scenario.id,
    title: scenario.name,
    description: scenario.description,
    difficulty: normalizeDifficulty(scenario.difficulty),
    href: `${simulator?.routes.simulator ?? "/simulator"}?scenarioId=${encodeURIComponent(
      scenario.id
    )}&review=1`,
  };
}

export function OperationsReviewDashboard({
  moduleId,
  scenarios: initialScenarios = [],
  loadFromApi = true,
}: {
  moduleId: ReviewModuleId;
  scenarios?: OperationsReviewScenarioRow[];
  loadFromApi?: boolean;
}) {
  const copy = moduleCopy[moduleId];
  const router = useRouter();
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [available, setAvailable] = useState<StoredScenarioParameters[]>([]);
  const [libraryRevision, setLibraryRevision] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(loadFromApi);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  const handleStart = useCallback((href: string) => {
    if (loadingHref) return;
    setLoadingHref(href);
    window.setTimeout(() => {
      router.push(href);
    }, 1000);
  }, [loadingHref, router]);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const loadScenarios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/review-scenarios?moduleId=${encodeURIComponent(moduleId)}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(
          await responseMessage(response, "Không thể tải danh sách ôn tập.")
        );
      }
      const payload = (await response.json()) as ReviewApiPayload;
      if (!payload || !Array.isArray(payload.assigned)) {
        throw new Error("API trả về danh sách ôn tập không hợp lệ.");
      }
      setScenarios(
        payload.assigned.map((scenario) => toScenarioRow(moduleId, scenario))
      );
      setAvailable(Array.isArray(payload.available) ? payload.available : []);

      setLibraryRevision(
        typeof payload.libraryRevision === "number" ? payload.libraryRevision : 0
      );
      setSelectedIds(payload.assigned.map((scenario) => scenario.id));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải danh sách ôn tập."
      );
    } finally {
      setIsLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    if (loadFromApi) void loadScenarios();
  }, [loadFromApi, loadScenarios]);

  useEffect(() => {
    if (!dialogOpen) return;
    const returnFocus = addButtonRef.current;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialogOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      returnFocus?.focus();
    };
  }, [dialogOpen]);

  async function saveAssignments() {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/review-scenarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          scenarioIds: selectedIds,
          expectedRevision: libraryRevision,
        }),
      });
      const payload = (await response.json()) as {
        libraryRevision?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Không thể lưu danh sách ôn tập.");
      }
      if (typeof payload.libraryRevision === "number") {
        setLibraryRevision(payload.libraryRevision);
      }
      setDialogOpen(false);
      setNotice(
        `Đã cập nhật ${selectedIds.length} kịch bản ôn tập cho ${copy.shortName}.`
      );
      await loadScenarios();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể lưu danh sách ôn tập."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/review"
          className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[13px] font-medium text-[var(--cns-text-secondary)] transition-colors hover:bg-black/[0.04] hover:text-[var(--cns-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7]"
        >
          <ArrowLeft aria-hidden size={15} />
          <span>Back</span>
        </Link>
      </div>

      {/* Main Workspace Section */}
      <section
        aria-labelledby={`${moduleId}-practice-title`}
        className="space-y-6"
      >
        {/* Section Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cns-text-secondary)]">
              Ôn tập / Thực hành
            </p>
            <h1
              id={`${moduleId}-practice-title`}
              className="mt-1 text-[26px] sm:text-[28px] font-semibold tracking-tight text-[var(--cns-text-primary)] leading-tight"
            >
              {copy.title}
            </h1>
            <p className="mt-2 text-[13px] sm:text-[14px] leading-relaxed text-[var(--cns-text-secondary)] whitespace-nowrap">
              {copy.description}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <CountBadgePill>{scenarios.length} bài</CountBadgePill>

          </div>
        </div>

        {/* Alerts */}
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[8px] border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-200"
          >
            <WarningCircle
              aria-hidden
              size={18}
              className="mt-0.5 shrink-0 text-red-400"
            />
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-[8px] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-200"
          >
            <CheckCircle
              aria-hidden
              size={18}
              className="mt-0.5 shrink-0 text-emerald-400"
            />
            <span>{notice}</span>
          </div>
        ) : null}

        {/* Scenarios Table Frame */}
        <ScenarioListFrame>
          {isLoading ? (
            <div
              role="status"
              className="flex items-center justify-center py-16 text-[13px] text-[var(--cns-text-secondary)]"
            >
              Đang tải danh sách ôn tập…
            </div>
          ) : (
            <ScenarioDataTable
              items={scenarios}
              caption={`Danh sách tình huống ${copy.shortName} dành cho học viên`}
              columns={scenarioColumns}
              emptySearchMessage={`Chưa có tình huống ${copy.shortName} nào được gắn vào ôn tập.`}
              renderCells={(scenario, rowIndex) => {
                const rowBg = rowIndex % 2 === 0 ? "bg-[#f9fafb]" : "bg-[#d1d5db]";
                return (
                  <>
                    <td className={`w-16 px-4 py-3.5 align-middle ${rowBg}`}>
                      <span className="inline-flex size-7 items-center justify-center rounded-[6px] border border-slate-300 bg-slate-200 text-[12px] font-semibold tabular-nums text-slate-700">
                        {String(rowIndex + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td className={`px-4 py-3.5 align-middle ${rowBg}`}>
                      <h3 className="text-[14px] font-semibold text-slate-900 leading-snug">
                        {scenario.title}
                      </h3>
                      {scenario.description ? (
                        <p className="mt-0.5 line-clamp-1 text-[12px] leading-relaxed text-slate-600">
                          {scenario.description}
                        </p>
                      ) : null}
                    </td>
                    <td className={`w-28 px-4 py-3.5 align-middle ${rowBg}`}>
                      <DifficultyBadge difficulty={scenario.difficulty} />
                    </td>
                    <td className={`w-32 px-4 py-3.5 text-right align-middle ${rowBg}`}>
                      <button
                        type="button"
                        disabled={loadingHref !== null}
                        onClick={() => handleStart(scenario.href)}
                        className="!rounded-full !bg-[#ea580c] hover:!bg-[#c2410c] inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-transform h-8 px-3 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
                        aria-label={`Bắt đầu bài ${copy.shortName}: ${scenario.title}`}
                        title="Bắt đầu bài thực hành"
                      >
                        {loadingHref === scenario.href ? (
                          <>
                            <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className="whitespace-nowrap font-medium">Đang mở…</span>
                          </>
                        ) : (
                          <>
                            <Play aria-hidden size={12} weight="fill" className="shrink-0 translate-x-[0.5px]" />
                            <span className="whitespace-nowrap font-medium">Bắt đầu</span>
                          </>
                        )}
                      </button>
                    </td>
                  </>
                );
              }}
            />
          )}
        </ScenarioListFrame>
      </section>

      {/* Modal Dialog for Examiner to Assign Review Scenarios */}
      {dialogOpen ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDialogOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${moduleId}-assign-title`}
            className="flex max-h-[min(44rem,calc(100dvh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-[12px] border border-[var(--cns-btn-ghost-border)] bg-[var(--cns-surface-card)] shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[var(--cns-border-subtle)] bg-[var(--cns-surface-table-header)] px-5 py-4">
              <div>
                <h2
                  id={`${moduleId}-assign-title`}
                  className="text-[16px] font-semibold tracking-tight text-[var(--cns-text-primary)]"
                >
                  Chọn kịch bản ôn tập · {copy.shortName}
                </h2>
                <p className="mt-1 text-[13px] text-[var(--cns-text-secondary)]">
                  Đã chọn {selectedCount}/{available.length} kịch bản. Kịch bản không
                  chọn vẫn được giữ trong kho để dùng cho mục đích khác.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setDialogOpen(false)}
                aria-label="Đóng cửa sổ chọn kịch bản"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--cns-border-subtle)] bg-transparent text-[var(--cns-text-secondary)] transition-colors hover:bg-black/[0.06] hover:text-[var(--cns-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7]"
              >
                <X aria-hidden size={16} />
              </button>
            </header>

            <div className="cns-scrollbar min-h-0 flex-1 overflow-y-auto p-5 space-y-2">
              {available.length === 0 ? (
                <div className="rounded-[8px] border border-dashed border-[var(--cns-btn-ghost-border)] bg-black/[0.02] p-6 text-center text-[13px] text-[var(--cns-text-secondary)]">
                  Kho chưa có kịch bản cho {copy.shortName}. Hãy tạo hoặc import
                  kịch bản tại tab Kịch bản trước.
                </div>
              ) : (
                <fieldset className="grid gap-2">
                  <legend className="sr-only">
                    Danh sách kịch bản có thể gắn vào ôn tập
                  </legend>
                  {available.map((scenario) => {
                    const checked = selectedIds.includes(scenario.id);
                    return (
                      <label
                        key={scenario.id}
                        className={`flex min-h-[52px] cursor-pointer items-start gap-3 rounded-[8px] border p-3 transition-colors ${
                          checked
                            ? "border-[#0369a1] bg-[#0369a1]/10 text-[var(--cns-text-primary)]"
                            : "border-[var(--cns-border-subtle)] bg-[var(--cns-surface-table-header)] text-[var(--cns-text-secondary)] hover:border-[var(--cns-btn-ghost-border)] hover:bg-black/[0.02]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const nextChecked = event.currentTarget.checked;
                            setSelectedIds((current) =>
                              nextChecked
                                ? [...current, scenario.id]
                                : current.filter((id) => id !== scenario.id)
                            );
                          }}
                          aria-label={scenario.name}
                          className="mt-1 size-4 rounded-[4px] border-white/20 bg-white/5 accent-[#0284c7]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-[var(--cns-text-primary)]">
                            {scenario.name}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--cns-text-secondary)]">
                            {scenario.description || "Không có mô tả."}
                          </span>
                        </span>
                        {scenario.difficulty ? (
                          <DifficultyBadge
                            difficulty={scenario.difficulty}
                            className="mt-0.5 shrink-0"
                          />
                        ) : null}
                      </label>
                    );
                  })}
                </fieldset>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--cns-border-subtle)] bg-[var(--cns-surface-table-header)] px-5 py-3.5">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => void saveAssignments()}
                disabled={isSaving}
              >
                {isSaving ? "Đang lưu…" : `Lưu ${selectedCount} kịch bản`}
              </Button>
            </footer>
          </section>
        </div>
      ) : null}

      {/* Loading overlay (mờ) khi bấm Bắt đầu */}
      {loadingHref ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm"
          role="status"
          aria-live="assertive"
          aria-label="Đang mở simulator"
        >
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--cns-btn-ghost-border)] bg-[var(--cns-surface-card)]/90 px-8 py-6 shadow-2xl">
            <svg className="size-10 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-semibold text-[var(--cns-text-primary)]">Đang mở simulator…</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
