"use client";

import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { DownloadSimple } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { PencilSimple } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { getSimulatorModule } from "@/modules/core/registry";
import type { SimulatorModuleDefinition } from "@/modules/core/types";
import {
  getScenarioParametersModule,
  parseScenarioParameters,
  scenarioParametersMetadata,
  type ScenarioParametersModuleId,
} from "@/lib/scenario-parameters";
import type { StoredScenarioParameters } from "@/lib/scenario-parameters-storage";

type ScenarioDifficulty = "basic" | "intermediate" | "advanced";

type QuickEditDraft = {
  moduleId: ScenarioParametersModuleId;
  scenarioId: string;
  name: string;
  description: string;
  difficulty: ScenarioDifficulty;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
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

function actionButtonClass(tone: "primary" | "default" | "danger" = "default") {
  const base =
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50";
  if (tone === "primary")
    return `${base} border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]`;
  if (tone === "danger")
    return `${base} border-[#fecaca] bg-transparent text-[#b91c1c] hover:bg-[#fef2f2]`;
  return `${base} border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-muted)]`;
}

export function ScenarioManagementWorkspace({
  moduleId,
}: {
  moduleId: ScenarioParametersModuleId;
}) {
  const simulatorModule = getSimulatorModule(moduleId)!;
  const scenarioModule = getScenarioParametersModule(moduleId);
  if (!scenarioModule) {
    throw new Error(`Unsupported Scenario Parameters module: ${moduleId}.`);
  }

  const importInputRefs = useRef<
    Partial<Record<ScenarioParametersModuleId, HTMLInputElement | null>>
  >({});
  const [scenarios, setScenarios] = useState<StoredScenarioParameters[]>([]);
  const [expandedScenarioIds, setExpandedScenarioIds] = useState<string[]>([]);
  const [quickEditDraft, setQuickEditDraft] = useState<QuickEditDraft | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [busyModuleId, setBusyModuleId] =
    useState<ScenarioParametersModuleId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadScenarios() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scenario-parameters", {
        cache: "no-store",
      });
      if (!response.ok) {
        setError(
          await responseMessage(response, "Không thể tải danh sách kịch bản."),
        );
        return;
      }
      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload))
        throw new Error("API trả về danh sách kịch bản không hợp lệ.");
      setScenarios(payload as StoredScenarioParameters[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải danh sách kịch bản.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadScenarios();
  }, []);

  const moduleScenarios = scenarios.filter(
    (scenario) => scenario.moduleId === moduleId,
  );

  async function importScenario(
    moduleId: ScenarioParametersModuleId,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setBusyModuleId(moduleId);
    setError(null);
    setNotice(null);
    try {
      if (file.size > 750_000)
        throw new Error("File JSON không được vượt quá 750 KB.");
      const raw = JSON.parse(await file.text()) as unknown;
      const definition = parseScenarioParameters(moduleId, raw);
      const scenarioModule = getScenarioParametersModule(moduleId);
      if (!definition) {
        throw new Error(
          `JSON không đúng schema Scenario Parameters của ${scenarioModule?.label ?? moduleId}.`,
        );
      }
      const response = await fetch("/api/scenario-parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          definition,
          sourceFileName: file.name,
        }),
      });
      if (!response.ok) {
        setError(await responseMessage(response, "Không thể lưu kịch bản."));
        return;
      }
      const metadata = scenarioParametersMetadata(definition);
      setNotice(
        `Đã thêm “${metadata.name}” vào ${scenarioModule?.label ?? moduleId}. Nếu trùng mã, bản ghi cũ đã được cập nhật.`,
      );
      await loadScenarios();
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "File JSON không thể import.",
      );
    } finally {
      setBusyModuleId(null);
    }
  }

  function toggleScenario(scenarioId: string) {
    setExpandedScenarioIds((current) =>
      current.includes(scenarioId)
        ? current.filter((id) => id !== scenarioId)
        : [...current, scenarioId],
    );
  }

  function startQuickEdit(
    moduleId: ScenarioParametersModuleId,
    scenario: StoredScenarioParameters,
  ) {
    setExpandedScenarioIds((current) =>
      current.includes(scenario.id) ? current : [...current, scenario.id],
    );
    setQuickEditDraft({
      moduleId,
      scenarioId: scenario.id,
      name: scenario.name,
      description: scenario.description,
      difficulty: ["basic", "intermediate", "advanced"].includes(
        scenario.difficulty,
      )
        ? (scenario.difficulty as ScenarioDifficulty)
        : "basic",
    });
    setError(null);
    setNotice(null);
  }

  function cancelQuickEdit() {
    setQuickEditDraft(null);
  }

  async function saveQuickEdit() {
    if (!quickEditDraft) return;
    const existing = scenarios.find(
      (scenario) => scenario.id === quickEditDraft.scenarioId,
    );
    if (!existing) {
      setError("Không tìm thấy kịch bản cần sửa. Hãy tải lại danh sách.");
      setQuickEditDraft(null);
      return;
    }
    const name = quickEditDraft.name.trim();
    if (name.length < 3) {
      setError("Tên kịch bản phải có ít nhất 3 ký tự.");
      return;
    }

    setBusyModuleId(quickEditDraft.moduleId);
    setError(null);
    setNotice(null);
    try {
      const definition = structuredClone(existing.definition);
      definition.name = name;
      definition.description = quickEditDraft.description.trim();
      definition.difficulty = quickEditDraft.difficulty;
      const response = await fetch("/api/scenario-parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: quickEditDraft.moduleId,
          definition,
          sourceFileName: existing.sourceFileName,
        }),
      });
      if (!response.ok) {
        setError(
          await responseMessage(response, "Không thể lưu thay đổi kịch bản."),
        );
        return;
      }
      setQuickEditDraft(null);
      setNotice(`Đã lưu thay đổi cho “${name}”.`);
      await loadScenarios();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể lưu thay đổi kịch bản.",
      );
    } finally {
      setBusyModuleId(null);
    }
  }

  function downloadScenario(scenario: StoredScenarioParameters) {
    const blob = new Blob([JSON.stringify(scenario.definition, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${scenario.scenarioId}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function deleteScenario(scenario: StoredScenarioParameters) {
    if (
      !window.confirm(
        `Xóa kịch bản “${scenario.name}” (${scenario.scenarioId})?`,
      )
    )
      return;
    setError(null);
    setNotice(null);
    setBusyModuleId(scenario.moduleId);
    try {
      const response = await fetch(
        `/api/scenario-parameters?id=${encodeURIComponent(scenario.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setError(await responseMessage(response, "Không thể xóa kịch bản."));
        return;
      }
      setScenarios((current) =>
        current.filter((item) => item.id !== scenario.id),
      );
      setExpandedScenarioIds((current) =>
        current.filter((id) => id !== scenario.id),
      );
      setNotice(`Đã xóa “${scenario.name}”.`);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Không thể xóa kịch bản.",
      );
    } finally {
      setBusyModuleId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="border-b border-[var(--border)] pb-5">
        <nav aria-label="Đường dẫn kịch bản" className="mb-4">
          <Link
            href="/authoring"
            className="inline-flex min-h-9 items-center gap-2 rounded px-2 text-xs font-semibold text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            <ArrowLeft aria-hidden size={17} />
            Danh sách thiết bị
          </Link>
        </nav>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
          Kịch bản / Scenario Parameters
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Kịch bản {simulatorModule.shortName}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Quản lý các Scenario Parameters của {simulatorModule.shortName}. Bấm vào từng
          tình huống để xem đầy đủ chi tiết.
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-sm leading-5 text-[#991b1b]"
        >
          <WarningCircle aria-hidden size={18} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2.5 text-sm leading-5 text-[#166534]"
        >
          <CheckCircle aria-hidden size={18} className="mt-0.5 shrink-0" />
          {notice}
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto border-y border-[var(--border)]">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Danh sách Scenario Parameters {simulatorModule.shortName}
          </caption>
          <thead className="bg-[var(--surface-muted)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th scope="col" className="px-4 py-3 font-bold sm:px-5">
                Kịch bản
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Độ khó
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Cập nhật
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Trạng thái
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {isLoading ? <LoadingRows /> : null}
            {!isLoading ? (
              <DeviceGroup
                module={simulatorModule}
                moduleId={moduleId}
                schemaVersion={scenarioModule.schemaVersion}
                scenarios={moduleScenarios}
                busy={busyModuleId !== null}
                busyModuleId={busyModuleId}
                importInputRef={(node) => {
                  importInputRefs.current[moduleId] = node;
                }}
                onAdd={() => importInputRefs.current[moduleId]?.click()}
                onImport={(event) => void importScenario(moduleId, event)}
                expandedScenarioIds={expandedScenarioIds}
                onToggle={toggleScenario}
                onDownload={downloadScenario}
                onDelete={deleteScenario}
                quickEditDraft={quickEditDraft}
                onStartEdit={startQuickEdit}
                onCancelEdit={cancelQuickEdit}
                onSaveEdit={() => void saveQuickEdit()}
                onEditChange={(changes) =>
                  setQuickEditDraft((current) =>
                    current ? { ...current, ...changes } : current,
                  )
                }
              />
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
        Có {moduleScenarios.length} kịch bản {simulatorModule.shortName} đã lưu. Chỉ
        JSON đúng schema của thiết bị mới được ghi vào kho; import cùng mã sẽ
        cập nhật bản ghi cũ.
      </p>
    </main>
  );
}

function LoadingRows() {
  return (
    <tr aria-hidden="true">
      <td
        colSpan={5}
        className="px-5 py-8 text-center text-sm text-[var(--text-muted)]"
      >
        Đang tải danh sách kịch bản…
      </td>
    </tr>
  );
}

function DeviceGroup({
  module,
  moduleId,
  schemaVersion,
  scenarios,
  busy,
  busyModuleId,
  importInputRef,
  onAdd,
  onImport,
  expandedScenarioIds,
  onToggle,
  onDownload,
  onDelete,
  quickEditDraft,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
}: {
  module: SimulatorModuleDefinition;
  moduleId: ScenarioParametersModuleId;
  schemaVersion: number;
  scenarios: StoredScenarioParameters[];
  busy: boolean;
  busyModuleId: ScenarioParametersModuleId | null;
  importInputRef: (node: HTMLInputElement | null) => void;
  onAdd: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  expandedScenarioIds: string[];
  onToggle: (scenarioId: string) => void;
  onDownload: (scenario: StoredScenarioParameters) => void;
  onDelete: (scenario: StoredScenarioParameters) => Promise<void>;
  quickEditDraft: QuickEditDraft | null;
  onStartEdit: (
    moduleId: ScenarioParametersModuleId,
    scenario: StoredScenarioParameters,
  ) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditChange: (
    changes: Partial<Omit<QuickEditDraft, "moduleId" | "scenarioId">>,
  ) => void;
}) {
  return (
    <>
      <tr className="bg-[var(--surface-subtle)]">
        <th
          scope="rowgroup"
          colSpan={4}
          className="px-4 py-3 text-left sm:px-5"
        >
          <div className="flex items-center gap-3">
            <span className="font-bold text-[var(--text-primary)]">
              {module.shortName}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {moduleStatus(module)} · schema v{schemaVersion} ·{" "}
              {scenarios.length} tình huống
            </span>
          </div>
          <p className="mt-1 text-xs font-normal text-[var(--text-secondary)]">
            {module.name}
          </p>
        </th>
        <td className="px-4 py-3 text-right sm:px-5">
          <button
            type="button"
            className={actionButtonClass("primary")}
            disabled={busy}
            onClick={onAdd}
          >
            <Plus aria-hidden size={16} weight="bold" />
            {busyModuleId === moduleId ? "Đang xử lý…" : "Thêm kịch bản"}
          </button>
          <input
            ref={importInputRef}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={onImport}
          />
        </td>
      </tr>
      {scenarios.length === 0 ? (
        <tr>
          <td
            colSpan={5}
            className="px-5 py-4 pl-8 text-sm text-[var(--text-muted)]"
          >
            Chưa có kịch bản. Dùng “Thêm kịch bản” để nạp file JSON đã export từ{" "}
            {module.shortName}.
          </td>
        </tr>
      ) : (
        scenarios.map((scenario) => (
          <ScenarioRow
            key={scenario.id}
            module={module}
            moduleId={moduleId}
            scenario={scenario}
            expanded={expandedScenarioIds.includes(scenario.id)}
            onToggle={onToggle}
            onDownload={onDownload}
            onDelete={onDelete}
            busy={busy}
            quickEditDraft={
              quickEditDraft?.scenarioId === scenario.id ? quickEditDraft : null
            }
            onStartEdit={onStartEdit}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
            onEditChange={onEditChange}
          />
        ))
      )}
    </>
  );
}

function ScenarioRow({
  module,
  moduleId,
  scenario,
  expanded,
  onToggle,
  onDownload,
  onDelete,
  busy,
  quickEditDraft,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
}: {
  module: SimulatorModuleDefinition;
  moduleId: ScenarioParametersModuleId;
  scenario: StoredScenarioParameters;
  expanded: boolean;
  onToggle: (scenarioId: string) => void;
  onDownload: (scenario: StoredScenarioParameters) => void;
  onDelete: (scenario: StoredScenarioParameters) => Promise<void>;
  busy: boolean;
  quickEditDraft: QuickEditDraft | null;
  onStartEdit: (
    moduleId: ScenarioParametersModuleId,
    scenario: StoredScenarioParameters,
  ) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditChange: (
    changes: Partial<Omit<QuickEditDraft, "moduleId" | "scenarioId">>,
  ) => void;
}) {
  const simulatorHref = `${module.routes.simulator}?scenarioId=${encodeURIComponent(scenario.id)}`;
  return (
    <>
      <tr className="align-top hover:bg-[var(--surface-muted)]">
        <th scope="row" className="px-4 py-4 pl-8 font-normal sm:px-5 sm:pl-10">
          <button
            type="button"
            className="group inline-flex min-h-10 items-start gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            aria-expanded={expanded}
            aria-controls={`scenario-detail-${scenario.id}`}
            onClick={() => onToggle(scenario.id)}
          >
            {expanded ? (
              <CaretDown
                aria-hidden
                size={16}
                className="mt-0.5 shrink-0 text-[var(--accent)]"
              />
            ) : (
              <CaretRight
                aria-hidden
                size={16}
                className="mt-0.5 shrink-0 text-[var(--text-muted)]"
              />
            )}
            <span>
              <span className="block font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                {scenario.name}
              </span>
              <span className="mt-1 block font-mono text-xs text-[var(--accent)]">
                {scenario.scenarioId}
              </span>
            </span>
          </button>
        </th>
        <td className="whitespace-nowrap px-4 py-4 text-xs text-[var(--text-secondary)]">
          {difficultyLabel(scenario.difficulty)}
          <span className="mt-1 block text-[var(--text-muted)]">
            schema v{scenario.schemaVersion}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-xs text-[var(--text-secondary)]">
          {formatDate(scenario.updatedAt)}
        </td>
        <td className="px-4 py-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534]">
            <CheckCircle aria-hidden size={15} weight="fill" />
            Đã lưu
          </span>
        </td>
        <td className="px-4 py-4">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={actionButtonClass()}
              disabled={busy}
              onClick={() => onStartEdit(moduleId, scenario)}
            >
              <PencilSimple aria-hidden size={15} />
              Sửa nhanh
            </button>
            <button
              type="button"
              className={actionButtonClass()}
              disabled={busy}
              onClick={() => onDownload(scenario)}
            >
              <DownloadSimple aria-hidden size={15} />
              Tải JSON
            </button>
            <Link href={simulatorHref} className={actionButtonClass("primary")}>
              <ArrowSquareOut aria-hidden size={15} />
              Mở simulator
            </Link>
            <button
              type="button"
              className={actionButtonClass("danger")}
              disabled={busy}
              onClick={() => void onDelete(scenario)}
            >
              <Trash aria-hidden size={15} />
              Xóa
            </button>
          </div>
        </td>
      </tr>
      {expanded ? (
        <ScenarioDetailRow
          module={module}
          scenario={scenario}
          busy={busy}
          quickEditDraft={quickEditDraft}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveEdit}
          onEditChange={onEditChange}
        />
      ) : null}
    </>
  );
}

function ScenarioDetailRow({
  module,
  scenario,
  busy,
  quickEditDraft,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
}: {
  module: SimulatorModuleDefinition;
  scenario: StoredScenarioParameters;
  busy: boolean;
  quickEditDraft: QuickEditDraft | null;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditChange: (
    changes: Partial<Omit<QuickEditDraft, "moduleId" | "scenarioId">>,
  ) => void;
}) {
  if (quickEditDraft) {
    return (
      <tr id={`scenario-detail-${scenario.id}`}>
        <td
          colSpan={5}
          className="border-l-4 border-[var(--accent)] bg-[var(--surface-subtle)] px-8 py-4 sm:px-12"
        >
          <div className="max-w-3xl">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Sửa nhanh kịch bản
            </h3>
            <form
              className="mt-3 grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                onSaveEdit();
              }}
            >
              <label className="grid gap-1 text-xs font-semibold text-[var(--text-secondary)]">
                Tên kịch bản
                <input
                  autoFocus
                  required
                  minLength={3}
                  value={quickEditDraft.name}
                  onChange={(event) =>
                    onEditChange({ name: event.currentTarget.value })
                  }
                  className="min-h-10 border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-[var(--text-secondary)]">
                Độ khó
                <select
                  value={quickEditDraft.difficulty}
                  onChange={(event) =>
                    onEditChange({
                      difficulty: event.currentTarget
                        .value as ScenarioDifficulty,
                    })
                  }
                  className="min-h-10 border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                >
                  <option value="basic">Cơ bản</option>
                  <option value="intermediate">Trung bình</option>
                  <option value="advanced">Nâng cao</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-[var(--text-secondary)] sm:col-span-2">
                Mô tả
                <textarea
                  value={quickEditDraft.description}
                  onChange={(event) =>
                    onEditChange({ description: event.currentTarget.value })
                  }
                  className="min-h-24 border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </label>
              <p className="mt-2 text-xs text-[var(--text-muted)] sm:col-span-2">
                Mã scenario và toàn bộ tham số kỹ thuật được giữ nguyên.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 sm:col-span-2">
                <button
                  type="submit"
                  className={actionButtonClass("primary")}
                  disabled={busy}
                >
                  {busy ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
                <button
                  type="button"
                  className={actionButtonClass()}
                  onClick={onCancelEdit}
                  disabled={busy}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </td>
      </tr>
    );
  }
  return (
    <tr id={`scenario-detail-${scenario.id}`}>
      <td
        colSpan={5}
        className="border-l-4 border-[var(--accent)] bg-[var(--surface-subtle)] px-8 py-4 sm:px-12"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Chi tiết kịch bản
            </h3>
            <p className="mt-1 max-w-3xl whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">
              {scenario.description || "Không có mô tả."}
            </p>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[var(--text-muted)]">Thiết bị</dt>
                <dd className="font-semibold text-[var(--text-primary)]">
                  {module.shortName}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Mã scenario</dt>
                <dd className="font-mono text-[var(--text-primary)]">
                  {scenario.scenarioId}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Schema</dt>
                <dd className="text-[var(--text-primary)]">
                  v{scenario.schemaVersion}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Cập nhật</dt>
                <dd className="text-[var(--text-primary)]">
                  {formatDate(scenario.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              Nội dung JSON
            </p>
            <pre className="mt-2 max-h-72 overflow-auto border-y border-[var(--border)] bg-[var(--surface)] p-3 text-[10px] leading-4 text-[var(--text-secondary)]">
              {JSON.stringify(scenario.definition, null, 2)}
            </pre>
          </div>
        </div>
      </td>
    </tr>
  );
}
