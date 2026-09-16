"use client";

import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { NotePencil } from "@phosphor-icons/react/dist/csr/NotePencil";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { X } from "@phosphor-icons/react/dist/csr/X";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScenarioListFrame,
  ScenarioSectionHeader,
} from "@/components/ui/exam-workspace";
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
    description: "Chọn một tình huống đã được giám khảo đưa vào danh sách ôn tập để thực hành trên PMDT DVOR 1150.",
  },
  "dvor-1150a": {
    shortName: "DVOR 1150A",
    title: "Thực hành xử lý sự cố DVOR 1150A",
    description: "Chọn một tình huống đã được giám khảo đưa vào danh sách ôn tập để thực hành trên PMDT DVOR 1150A.",
  },
  "dme-1119a": {
    shortName: "DME 1119A",
    title: "Thực hành xử lý sự cố DME 1119A",
    description: "Chọn một tình huống đã được giám khảo đưa vào danh sách ôn tập để thực hành trên PMDT DME 1119A.",
  },
  "dvor-220": {
    shortName: "DVOR 220",
    title: "Thực hành xử lý sự cố DVOR 220",
    description: "Chọn một tình huống đã được giám khảo đưa vào danh sách ôn tập để thực hành trên PMDT/LMI MOPIENS 220.",
  },
  "dme-320": {
    shortName: "DME 320",
    title: "Thực hành xử lý sự cố DME 320",
    description: "Chọn một tình huống đã được giám khảo đưa vào danh sách ôn tập để thực hành trên PMDT/LMI MOPIENS 320.",
  },
};

const difficultyDetails = {
  basic: { label: "Cơ bản", className: "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]" },
  intermediate: { label: "Trung bình", className: "border-[#fde68a] bg-[#fffbeb] text-[#92400e]" },
  advanced: { label: "Nâng cao", className: "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]" },
} as const;

const scenarioColumns = [
  { id: "number", label: "STT", className: "w-16" },
  { id: "title", label: "Tiêu đề" },
  { id: "difficulty", label: "Mức độ", className: "w-28" },
  { id: "actions", label: "Thao tác", className: "w-24 text-right" },
];

export type OperationsReviewScenarioRow = {
  id: string;
  title: string;
  description: string;
  difficulty: keyof typeof difficultyDetails;
  href: string;
};

type ReviewApiPayload = {
  assigned: AssignedReviewScenario[];
  available?: StoredScenarioParameters[];
  canManage: boolean;
};

function responseMessage(response: Response, fallback: string) {
  return response.json().then((payload: unknown) => {
    if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
      return payload.error;
    }
    return fallback;
  }).catch(() => fallback);
}

function difficulty(value: string): keyof typeof difficultyDetails {
  return value === "advanced" || value === "intermediate" ? value : "basic";
}

function toScenarioRow(moduleId: ReviewModuleId, scenario: AssignedReviewScenario): OperationsReviewScenarioRow {
  const simulator = getSimulatorModule(moduleId);
  return {
    id: scenario.id,
    title: scenario.name,
    description: scenario.description,
    difficulty: difficulty(scenario.difficulty),
    href: `${simulator?.routes.simulator ?? "/simulator"}?scenarioId=${encodeURIComponent(scenario.id)}&review=1`,
  };
}

export function OperationsReviewDashboard({
  moduleId,
  scenarios: initialScenarios = [],
  canManage: initialCanManage = false,
  loadFromApi = true,
}: {
  moduleId: ReviewModuleId;
  scenarios?: OperationsReviewScenarioRow[];
  canManage?: boolean;
  loadFromApi?: boolean;
}) {
  const copy = moduleCopy[moduleId];
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [available, setAvailable] = useState<StoredScenarioParameters[]>([]);
  const [canManage, setCanManage] = useState(initialCanManage);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(loadFromApi);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const loadScenarios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/review-scenarios?moduleId=${encodeURIComponent(moduleId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await responseMessage(response, "Không thể tải danh sách ôn tập."));
      const payload = await response.json() as ReviewApiPayload;
      if (!payload || !Array.isArray(payload.assigned)) throw new Error("API trả về danh sách ôn tập không hợp lệ.");
      setScenarios(payload.assigned.map((scenario) => toScenarioRow(moduleId, scenario)));
      setAvailable(Array.isArray(payload.available) ? payload.available : []);
      setCanManage(payload.canManage === true);
      setSelectedIds(payload.assigned.map((scenario) => scenario.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách ôn tập.");
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
        body: JSON.stringify({ moduleId, scenarioIds: selectedIds }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Không thể lưu danh sách ôn tập."));
      setDialogOpen(false);
      setNotice(`Đã cập nhật ${selectedIds.length} kịch bản ôn tập cho ${copy.shortName}.`);
      await loadScenarios();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu danh sách ôn tập.");
    } finally {
      setIsSaving(false);
    }
  }

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);

  return (
    <div className="w-full max-w-none px-4 py-3 sm:px-6 lg:px-8 lg:py-4 xl:px-10 2xl:px-12">
      <section aria-labelledby={`${moduleId}-practice-title`} className="mt-0">
        <ScenarioSectionHeader id={`${moduleId}-practice-title`} title={copy.title} description={copy.description} count={scenarios.length} countLabel="bài" />

        {canManage ? (
          <div className="mt-4 flex justify-end">
            <button
              ref={addButtonRef}
              type="button"
              onClick={() => setDialogOpen(true)}
              disabled={isLoading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
            >
              <Plus aria-hidden size={18} weight="bold" />
              Thêm kịch bản
            </button>
          </div>
        ) : null}

        {error ? <p role="alert" className="mt-4 flex items-start gap-2 border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-sm text-[#991b1b]"><WarningCircle aria-hidden size={18} className="mt-0.5 shrink-0" />{error}</p> : null}
        {notice ? <p role="status" className="mt-4 flex items-start gap-2 border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2.5 text-sm text-[#166534]"><CheckCircle aria-hidden size={18} className="mt-0.5 shrink-0" />{notice}</p> : null}

        <ScenarioListFrame>
          {isLoading ? <p role="status" className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Đang tải danh sách ôn tập…</p> : (
            <ScenarioDataTable
              items={scenarios}
              caption={`Danh sách tình huống ${copy.shortName} dành cho học viên`}
              columns={scenarioColumns}
              emptySearchMessage={`Chưa có tình huống ${copy.shortName} nào được gắn vào ôn tập.`}
              renderCells={(scenario, rowIndex) => {
                const details = difficultyDetails[scenario.difficulty];
                return <>
                  <td className="px-4 py-4 align-top"><span className="inline-flex size-8 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-muted)] text-xs font-bold tabular-nums text-[var(--text-secondary)]">{String(rowIndex + 1).padStart(2, "0")}</span></td>
                  <td className="px-4 py-4 align-top"><h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{scenario.title}</h3><p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[var(--text-secondary)]">{scenario.description}</p></td>
                  <td className="px-4 py-4 align-top"><span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${details.className}`}>{details.label}</span></td>
                  <td className="px-4 py-4 text-right align-top"><Link href={scenario.href} aria-label={`Bắt đầu bài ${copy.shortName}: ${scenario.title}`} title="Bắt đầu bài thực hành" className="inline-flex size-11 items-center justify-center rounded-md border border-[var(--accent-border)] bg-[var(--surface)] text-[var(--accent)] transition-[background-color,border-color,transform] duration-150 hover:bg-[var(--accent-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none"><NotePencil aria-hidden size={19} /></Link></td>
                </>;
              }}
            />
          )}
        </ScenarioListFrame>
      </section>

      {dialogOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby={`${moduleId}-assign-title`} className="flex max-h-[min(44rem,calc(100dvh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
              <div><h2 id={`${moduleId}-assign-title`} className="text-lg font-bold text-[var(--text-primary)]">Chọn kịch bản ôn tập · {copy.shortName}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Đã chọn {selectedCount}/{available.length} kịch bản. Kịch bản không chọn vẫn được giữ trong kho để dùng cho mục đích khác.</p></div>
              <button ref={closeButtonRef} type="button" onClick={() => setDialogOpen(false)} aria-label="Đóng cửa sổ chọn kịch bản" className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><X aria-hidden size={20} /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {available.length === 0 ? <p className="border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-5 text-sm text-[var(--text-secondary)]">Kho chưa có kịch bản cho {copy.shortName}. Hãy tạo hoặc import kịch bản tại tab Kịch bản trước.</p> : (
                <fieldset className="grid gap-2"><legend className="sr-only">Danh sách kịch bản có thể gắn vào ôn tập</legend>{available.map((scenario) => {
                  const checked = selectedIds.includes(scenario.id);
                  return <label key={scenario.id} className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${checked ? "border-[var(--accent)] bg-[var(--accent-muted)]" : "border-[var(--border)] hover:bg-[var(--surface-muted)]"}`}><input type="checkbox" checked={checked} onChange={(event) => {
                    const nextChecked = event.currentTarget.checked;
                    setSelectedIds((current) => nextChecked ? [...current, scenario.id] : current.filter((id) => id !== scenario.id));
                  }} className="mt-1 size-4 accent-[var(--accent)]" /><span className="min-w-0"><span className="block font-semibold text-[var(--text-primary)]">{scenario.name}</span><span className="mt-0.5 block text-xs leading-5 text-[var(--text-secondary)]">{scenario.description || "Không có mô tả."}</span></span></label>;
                })}</fieldset>
              )}
            </div>
            <footer className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
              <button type="button" onClick={() => setDialogOpen(false)} disabled={isSaving} className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50">Hủy</button>
              <button type="button" onClick={() => void saveAssignments()} disabled={isSaving} className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50">{isSaving ? "Đang lưu…" : `Lưu ${selectedCount} kịch bản`}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
