"use client";

import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { DownloadSimple } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { FilePlus } from "@phosphor-icons/react/dist/csr/FilePlus";
import { Funnel } from "@phosphor-icons/react/dist/csr/Funnel";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { UploadSimple } from "@phosphor-icons/react/dist/csr/UploadSimple";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSimulatorIconImage } from "@/modules/core/simulator-icon-images";
import { SIMULATOR_MODULES } from "@/modules/core/registry";
import type { SimulatorModuleDefinition } from "@/modules/core/types";
import {
  getScenarioParametersModule,
  isScenarioParametersModuleId,
  parseScenarioParameters,
  SCENARIO_PARAMETERS_MODULES,
  scenarioParametersMetadata,
  type ScenarioParametersModuleId,
} from "@/lib/scenario-parameters";
import type { StoredScenarioParameters } from "@/lib/scenario-parameters-storage";

type ManagementRow = {
  module: SimulatorModuleDefinition;
  scenario: StoredScenarioParameters | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function difficultyLabel(value: string) {
  if (value === "advanced") return "Nâng cao";
  if (value === "intermediate") return "Trung bình";
  return "Cơ bản";
}

function moduleStatus(module: SimulatorModuleDefinition) {
  const status = module.trainingStatus ?? module.status;
  return status === "available" ? "Sẵn sàng" : "Đang chuẩn bị";
}

function responseMessage(response: Response, fallback: string) {
  return response.json()
    .then((payload: unknown) => {
      if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
        return payload.error;
      }
      return fallback;
    })
    .catch(() => fallback);
}

function actionButtonClass(tone: "primary" | "default" | "danger" = "default") {
  const base = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50";
  if (tone === "primary") return `${base} border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]`;
  if (tone === "danger") return `${base} border-[#fecaca] bg-white text-[#b91c1c] hover:bg-[#fef2f2]`;
  return `${base} border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]`;
}

export function ScenarioManagementWorkspace() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [scenarios, setScenarios] = useState<StoredScenarioParameters[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<ScenarioParametersModuleId>("dvor-1150a");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadScenarios() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scenario-parameters", { cache: "no-store" });
      if (!response.ok) {
        setError(await responseMessage(response, "Không thể tải danh sách Scenario Parameters."));
        return;
      }
      const payload = await response.json() as unknown;
      if (!Array.isArray(payload)) throw new Error("API trả về dữ liệu Scenario Parameters không hợp lệ.");
      setScenarios(payload as StoredScenarioParameters[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách Scenario Parameters.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // Initial API hydration is an external synchronization, so the state update
    // intentionally happens from the async loader rather than during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadScenarios();
  }, []);

  const rows = useMemo<ManagementRow[]>(() => {
    const byModule = new Map<string, StoredScenarioParameters[]>();
    for (const scenario of scenarios) {
      const entries = byModule.get(scenario.moduleId) ?? [];
      entries.push(scenario);
      byModule.set(scenario.moduleId, entries);
    }

    return SIMULATOR_MODULES.flatMap((module): ManagementRow[] => {
      if (moduleFilter !== "all" && module.id !== moduleFilter) return [];
      const moduleScenarios = byModule.get(module.id) ?? [];
      if (moduleScenarios.length > 0) {
        return moduleScenarios
          .filter((scenario) => {
            const normalizedQuery = query.trim().toLocaleLowerCase();
            return !normalizedQuery
              || `${scenario.name} ${scenario.scenarioId} ${scenario.description}`.toLocaleLowerCase().includes(normalizedQuery);
          })
          .map((scenario) => ({ module, scenario }));
      }
      return [{ module, scenario: null }];
    });
  }, [moduleFilter, query, scenarios]);

  const supportedCount = useMemo(
    () => new Set(scenarios.map((scenario) => scenario.moduleId)).size,
    [scenarios],
  );
  const latestImport = scenarios[0]?.updatedAt ?? null;

  async function importScenario(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const raw = JSON.parse(await file.text()) as unknown;
      const definition = parseScenarioParameters(selectedModuleId, raw);
      if (!definition) {
        throw new Error(`JSON không đúng schema Scenario Parameters của ${getScenarioParametersModule(selectedModuleId)?.label ?? selectedModuleId}.`);
      }
      const response = await fetch("/api/scenario-parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: selectedModuleId, definition, sourceFileName: file.name }),
      });
      if (!response.ok) {
        setError(await responseMessage(response, "Không thể lưu Scenario Parameters."));
        return;
      }
      const metadata = scenarioParametersMetadata(definition);
      setNotice(`Đã import “${metadata.name}”. Nếu trùng mã ${metadata.scenarioId}, bản ghi cũ đã được thay thế.`);
      await loadScenarios();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "File JSON không thể import.");
    } finally {
      setBusy(false);
    }
  }

  function downloadScenario(scenario: StoredScenarioParameters) {
    const blob = new Blob([JSON.stringify(scenario.definition, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${scenario.scenarioId}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function deleteScenario(scenario: StoredScenarioParameters) {
    if (!window.confirm(`Xóa Scenario Parameters “${scenario.name}” (${scenario.scenarioId})?`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/scenario-parameters?id=${encodeURIComponent(scenario.id)}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await responseMessage(response, "Không thể xóa Scenario Parameters."));
        return;
      }
      setScenarios((current) => current.filter((item) => item.id !== scenario.id));
      setNotice(`Đã xóa “${scenario.name}”.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không thể xóa Scenario Parameters.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent)]">Kịch bản / Scenario Parameters</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">Quản lý kịch bản mô phỏng</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Import trực tiếp file JSON được export từ Scenario Parameters trên PMDT. File được kiểm tra đúng schema trước khi lưu; không còn dùng bộ chỉ thị cảnh báo cũ để tạo tình huống.
            </p>
          </div>
          <div className="grid shrink-0 gap-2 sm:grid-cols-3 lg:min-w-[28rem]">
            <Metric label="Scenario đã lưu" value={String(scenarios.length)} />
            <Metric label="Simulation đã có scenario" value={`${supportedCount}/${SCENARIO_PARAMETERS_MODULES.length}`} />
            <Metric label="Import gần nhất" value={formatDate(latestImport)} compact />
          </div>
        </div>
      </header>

      <section className="mt-5 rounded-xl border border-[var(--accent-border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:p-5" aria-labelledby="scenario-import-title">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FilePlus aria-hidden size={20} className="text-[var(--accent)]" />
              <h2 id="scenario-import-title" className="text-base font-bold text-[var(--text-primary)]">Import Scenario Parameters JSON</h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Chọn đúng simulation trước khi chọn file. Mỗi simulation dùng một schema riêng và mã scenario là khóa thay thế.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="grid gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              Simulation nhận file
              <select
                value={selectedModuleId}
                onChange={(event) => {
                  const next = event.currentTarget.value;
                  if (isScenarioParametersModuleId(next)) setSelectedModuleId(next);
                }}
                className="min-h-10 min-w-56 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              >
                {SCENARIO_PARAMETERS_MODULES.map((module) => <option key={module.moduleId} value={module.moduleId}>{module.label} · schema {module.schemaVersion}</option>)}
              </select>
            </label>
            <button type="button" className={actionButtonClass("primary")} disabled={busy} onClick={() => importInputRef.current?.click()}>
              <UploadSimple aria-hidden size={17} />
              {busy ? "Đang xử lý…" : "Chọn file JSON"}
            </button>
            <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={importScenario} />
          </div>
        </div>
        {error ? <p role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-sm leading-5 text-[#991b1b]"><WarningCircle aria-hidden size={18} className="mt-0.5 shrink-0" />{error}</p> : null}
        {notice ? <p role="status" className="mt-4 flex items-start gap-2 rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2.5 text-sm leading-5 text-[#166534]"><CheckCircle aria-hidden size={18} className="mt-0.5 shrink-0" />{notice}</p> : null}
      </section>

      <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]" aria-labelledby="scenario-table-title">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <h2 id="scenario-table-title" className="text-base font-bold text-[var(--text-primary)]">Danh mục tình huống theo simulation</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Bản ghi được lưu dưới dạng JSONB và có thể mở lại trong Scenario Parameters của simulator.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <span className="sr-only">Lọc simulation</span>
              <Funnel aria-hidden size={16} className="pointer-events-none absolute left-3 top-3 text-[var(--text-muted)]" />
              <select value={moduleFilter} onChange={(event) => setModuleFilter(event.currentTarget.value)} className="min-h-10 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] py-2 pl-9 pr-8 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]">
                <option value="all">Tất cả simulation</option>
                {SIMULATOR_MODULES.map((module) => <option key={module.id} value={module.id}>{module.shortName}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Tìm scenario</span>
              <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Tìm mã hoặc tên…" className="min-h-10 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] sm:w-52" />
            </label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <caption className="sr-only">Bảng quản lý Scenario Parameters theo từng simulation</caption>
            <thead className="bg-[var(--surface-muted)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold sm:px-5">Simulation</th>
                <th scope="col" className="px-4 py-3 font-bold">Tình huống</th>
                <th scope="col" className="px-4 py-3 font-bold">Schema / độ khó</th>
                <th scope="col" className="px-4 py-3 font-bold">Cập nhật</th>
                <th scope="col" className="px-4 py-3 font-bold">Trạng thái</th>
                <th scope="col" className="px-4 py-3 text-right font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading ? <LoadingRows /> : null}
              {!isLoading && rows.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">Không có dòng nào phù hợp bộ lọc.</td></tr> : null}
              {!isLoading ? rows.map(({ module, scenario }) => <ScenarioRow key={`${module.id}:${scenario?.id ?? "empty"}`} module={module} scenario={scenario} busy={busy} onDownload={downloadScenario} onDelete={deleteScenario} />) : null}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col gap-2 border-t border-[var(--border)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>Simulation chưa có adapter sẽ vẫn hiện để theo dõi phạm vi triển khai.</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle aria-hidden size={15} className="text-[#16a34a]" />Import hợp lệ mới được ghi vào kho</span>
        </footer>
      </section>
    </main>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</p><p className={`mt-1 font-mono font-bold text-[var(--text-primary)] ${compact ? "text-xs" : "text-xl"}`}>{value}</p></div>;
}

function LoadingRows() {
  return <>{[1, 2, 3].map((id) => <tr key={id} aria-hidden="true" className="animate-pulse"><td colSpan={6} className="px-5 py-5"><div className="h-4 w-3/4 rounded bg-[var(--surface-muted)]" /></td></tr>)}</>;
}

function ScenarioRow({
  module,
  scenario,
  busy,
  onDownload,
  onDelete,
}: {
  module: SimulatorModuleDefinition;
  scenario: StoredScenarioParameters | null;
  busy: boolean;
  onDownload: (scenario: StoredScenarioParameters) => void;
  onDelete: (scenario: StoredScenarioParameters) => Promise<void>;
}) {
  const supported = isScenarioParametersModuleId(module.id);
  const canOpen = Boolean(scenario && module.routes.simulator && supported);
  const simulatorHref = scenario && canOpen
    ? `${module.routes.simulator}?scenarioId=${encodeURIComponent(scenario.id)}`
    : module.routes.simulator;

  return (
    <tr className="align-top transition-colors hover:bg-[var(--surface-muted)]">
      <td className="px-4 py-4 sm:px-5">
        <div className="flex min-w-52 items-center gap-3">
          <span className={`inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ${supported ? "bg-[var(--accent-muted)]" : "bg-[var(--surface-muted)]"}`}><Image src={getSimulatorIconImage(module.id)} alt="" width={40} height={40} sizes="40px" className="size-full object-contain p-0.5" /></span>
          <div><p className="font-semibold text-[var(--text-primary)]">{module.shortName}</p><p className="mt-0.5 text-xs text-[var(--text-muted)]">{moduleStatus(module)} · {module.category === "device" ? "Thiết bị" : "Phần mềm"}</p></div>
        </div>
      </td>
      <td className="max-w-[25rem] px-4 py-4">
        {scenario ? <><p className="font-semibold text-[var(--text-primary)]">{scenario.name}</p><p className="mt-1 font-mono text-xs text-[var(--accent)]">{scenario.scenarioId}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{scenario.description}</p></> : <><p className="font-semibold text-[var(--text-secondary)]">Chưa có tình huống import</p><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Chọn {module.shortName} ở trên để import Scenario Parameters.</p></>}
      </td>
      <td className="whitespace-nowrap px-4 py-4"><p className="font-mono text-xs text-[var(--text-primary)]">{scenario ? `v${scenario.schemaVersion}` : supported ? `v${getScenarioParametersModule(module.id)?.schemaVersion}` : "—"}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{scenario ? difficultyLabel(scenario.difficulty) : supported ? "Sẵn sàng import" : "Chưa hỗ trợ"}</p></td>
      <td className="whitespace-nowrap px-4 py-4 text-xs text-[var(--text-secondary)]">{scenario ? formatDate(scenario.updatedAt) : "—"}</td>
      <td className="px-4 py-4">{scenario ? <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-1 text-xs font-semibold text-[#166534]"><CheckCircle aria-hidden size={14} weight="fill" />Đã lưu</span> : <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${supported ? "border-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--text-secondary)]" : "border-[#fde68a] bg-[#fffbeb] text-[#92400e]"}`}>{supported ? "Chưa có dữ liệu" : "Chưa có adapter"}</span>}</td>
      <td className="px-4 py-4"><div className="flex flex-wrap justify-end gap-2">{scenario ? <><button type="button" className={actionButtonClass()} disabled={busy} onClick={() => onDownload(scenario)}><DownloadSimple aria-hidden size={16} />Tải JSON</button><Link href={simulatorHref} className={actionButtonClass("primary")}><ArrowSquareOut aria-hidden size={16} />Mở simulator</Link><button type="button" className={actionButtonClass("danger")} disabled={busy} onClick={() => void onDelete(scenario)}><Trash aria-hidden size={16} />Xóa</button></> : <Link href={module.routes.simulator} className={actionButtonClass()}><ArrowSquareOut aria-hidden size={16} />Mở simulator</Link>}</div></td>
    </tr>
  );
}
