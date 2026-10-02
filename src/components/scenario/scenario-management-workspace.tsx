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
import { ScenarioLibraryControls } from "@/components/scenario/scenario-library-controls";
import {
  Button,
  ButtonLink,
  DifficultyBadge,
  StatusSavedBadge,
} from "@/components/ui/button";

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
            ...(existing.revision !== undefined ? { expectedRevision: existing.revision } : {}),
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
    <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-white/[0.08] pb-6">
        <nav aria-label="Đường dẫn kịch bản" className="mb-3">
          <Link
            href="/authoring"
            className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[13px] font-medium text-[#38a3dc] hover:text-[#7dd3fc] hover:bg-white/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111a24]"
          >
            <ArrowLeft aria-hidden size={16} />
            Danh sách thiết bị
          </Link>
        </nav>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#38a3dc]">
          Kịch bản / Scenario Parameters
        </p>
        <h1 className="mt-1.5 text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#E6EDF5] leading-tight">
          Kịch bản {simulatorModule.shortName}
        </h1>
        <p className="mt-2 max-w-[640px] text-[13px] sm:text-[14px] leading-relaxed text-[#9AA9BC]">
          Quản lý các Scenario Parameters của {simulatorModule.shortName}. Bấm vào từng
          tình huống để xem đầy đủ chi tiết.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-[8px] border border-[rgba(248,113,113,0.3)] bg-[rgba(239,68,68,0.1)] px-4 py-3 text-[13px] leading-5 text-[#fca5a5]"
        >
          <WarningCircle aria-hidden size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="mt-5 flex items-start gap-2.5 rounded-[8px] border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)] px-4 py-3 text-[13px] leading-5 text-[#86efac]"
        >
          <CheckCircle aria-hidden size={18} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      ) : null}

      <ScenarioLibraryControls moduleId={moduleId} scenarios={scenarios} />

      <div className="mt-6 overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#141f2a] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-[13px]">
            <caption className="sr-only">
              Danh sách Scenario Parameters {simulatorModule.shortName}
            </caption>
            <thead className="border-b border-white/[0.06] bg-[#101922] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9AA9BC]">
              <tr>
                <th scope="col" className="px-5 py-3 sm:px-6">
                  Kịch bản
                </th>
                <th scope="col" className="w-36 px-4 py-3">
                  Độ khó
                </th>
                <th scope="col" className="w-36 px-4 py-3">
                  Cập nhật
                </th>
                <th scope="col" className="w-32 px-4 py-3">
                  Trạng thái
                </th>
                <th scope="col" className="w-80 px-5 py-3 text-right sm:px-6">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
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
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-[#6B7A8D]">
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
        className="px-6 py-10 text-center text-[13px] text-[#6B7A8D]"
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
      <tr className="border-b border-white/[0.06] bg-[#141f2a]">
        <th
          scope="rowgroup"
          colSpan={5}
          className="px-5 py-4 font-normal sm:px-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[16px] font-semibold text-[#E6EDF5]">
                  {module.shortName}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 py-0.5 text-[12px] font-medium text-[#9AA9BC]">
                  <span className="size-1.5 rounded-full bg-[#22c55e]" />
                  <span>{moduleStatus(module)}</span>
                  <span className="text-white/20">·</span>
                  <span>schema v{schemaVersion}</span>
                  <span className="text-white/20">·</span>
                  <span>{scenarios.length} tình huống</span>
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-[#9AA9BC]">
                {module.name}
              </p>
            </div>
            <div>
              <Button
                variant="primary"
                size="md"
                disabled={busy}
                onClick={onAdd}
              >
                <Plus aria-hidden size={16} weight="bold" />
                <span>{busyModuleId === moduleId ? "Đang xử lý…" : "Thêm kịch bản"}</span>
              </Button>
              <input
                ref={importInputRef}
                hidden
                type="file"
                accept="application/json,.json"
                onChange={onImport}
              />
            </div>
          </div>
        </th>
      </tr>
      {scenarios.length === 0 ? (
        <tr>
          <td
            colSpan={5}
            className="px-6 py-6 text-center text-[13px] text-[#6B7A8D]"
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
      <tr className="border-b border-white/[0.05] transition-colors duration-150 hover:bg-white/[0.035]">
        <th scope="row" className="px-5 py-3.5 font-normal sm:px-6">
          <button
            type="button"
            className="group flex items-start gap-2.5 rounded-[6px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7]"
            aria-expanded={expanded}
            aria-controls={`scenario-detail-${scenario.id}`}
            onClick={() => onToggle(scenario.id)}
          >
            <span className="mt-0.5 shrink-0 text-[#6B7A8D] transition-colors group-hover:text-[#38a3dc]">
              {expanded ? <CaretDown size={16} /> : <CaretRight size={16} />}
            </span>
            <span>
              <span className="block text-[14px] font-medium leading-snug text-[#E6EDF5] transition-colors group-hover:text-[#38a3dc]">
                {scenario.name}
              </span>
              <span className="mt-0.5 block font-mono text-[12px] text-[#6B7A8D]">
                {scenario.scenarioId}
              </span>
            </span>
          </button>
        </th>
        <td className="whitespace-nowrap px-4 py-3.5 align-middle">
          <DifficultyBadge difficulty={scenario.difficulty} />
          <span className="mt-1 block text-[11px] text-[#6B7A8D]">
            schema v{scenario.schemaVersion}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3.5 align-middle text-[12px] tabular-nums text-[#9AA9BC]">
          {formatDate(scenario.updatedAt)}
        </td>
        <td className="whitespace-nowrap px-4 py-3.5 align-middle">
          <StatusSavedBadge />
        </td>
        <td className="whitespace-nowrap px-5 py-3.5 align-middle text-right sm:px-6">
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => onStartEdit(moduleId, scenario)}
            >
              <PencilSimple aria-hidden size={14} />
              <span>Sửa nhanh</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => onDownload(scenario)}
            >
              <DownloadSimple aria-hidden size={14} />
              <span>Tải JSON</span>
            </Button>
            <ButtonLink
              href={simulatorHref}
              variant="primary"
              size="sm"
            >
              <ArrowSquareOut aria-hidden size={14} />
              <span>Mở simulator</span>
            </ButtonLink>
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => void onDelete(scenario)}
            >
              <Trash aria-hidden size={14} />
              <span>Xóa</span>
            </Button>
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
          className="border-l-[3px] border-[#0369a1] bg-[#111a24] px-6 py-5 sm:px-10"
        >
          <div className="max-w-3xl">
            <h3 className="text-[14px] font-semibold text-[#E6EDF5]">
              Sửa nhanh kịch bản
            </h3>
            <form
              className="mt-3.5 grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                onSaveEdit();
              }}
            >
              <label className="grid gap-1.5 text-[12px] font-medium text-[#9AA9BC]">
                Tên kịch bản
                <input
                  autoFocus
                  required
                  minLength={3}
                  value={quickEditDraft.name}
                  onChange={(event) =>
                    onEditChange({ name: event.currentTarget.value })
                  }
                  className="h-9 rounded-[8px] border border-white/[0.12] bg-[#141f2a] px-3 text-[13px] text-[#E6EDF5] outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20"
                />
              </label>
              <label className="grid gap-1.5 text-[12px] font-medium text-[#9AA9BC]">
                Độ khó
                <select
                  value={quickEditDraft.difficulty}
                  onChange={(event) =>
                    onEditChange({
                      difficulty: event.currentTarget
                        .value as ScenarioDifficulty,
                    })
                  }
                  className="h-9 rounded-[8px] border border-white/[0.12] bg-[#141f2a] px-3 text-[13px] text-[#E6EDF5] outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20 cursor-pointer"
                >
                  <option value="basic">Cơ bản</option>
                  <option value="intermediate">Trung bình</option>
                  <option value="advanced">Nâng cao</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-[12px] font-medium text-[#9AA9BC] sm:col-span-2">
                Mô tả
                <textarea
                  value={quickEditDraft.description}
                  onChange={(event) =>
                    onEditChange({ description: event.currentTarget.value })
                  }
                  rows={3}
                  className="rounded-[8px] border border-white/[0.12] bg-[#141f2a] p-3 text-[13px] leading-relaxed text-[#E6EDF5] outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20"
                />
              </label>
              <p className="mt-1 text-[12px] text-[#6B7A8D] sm:col-span-2">
                Mã scenario và toàn bộ tham số kỹ thuật được giữ nguyên.
              </p>
              <div className="mt-2 flex flex-wrap gap-2 sm:col-span-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={busy}
                >
                  {busy ? "Đang lưu…" : "Lưu thay đổi"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onCancelEdit}
                  disabled={busy}
                >
                  Hủy
                </Button>
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
        className="border-l-[3px] border-[#0369a1] bg-[#111a24] px-6 py-5 sm:px-10"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
          <div>
            <h3 className="text-[14px] font-semibold text-[#E6EDF5]">
              Chi tiết kịch bản
            </h3>
            <p className="mt-1.5 max-w-3xl whitespace-pre-wrap text-[13px] leading-relaxed text-[#9AA9BC]">
              {scenario.description || "Không có mô tả."}
            </p>
            <dl className="mt-4 grid gap-x-6 gap-y-2.5 text-[12px] sm:grid-cols-2">
              <div>
                <dt className="text-[#6B7A8D]">Thiết bị</dt>
                <dd className="font-medium text-[#E6EDF5] mt-0.5">
                  {module.shortName}
                </dd>
              </div>
              <div>
                <dt className="text-[#6B7A8D]">Mã scenario</dt>
                <dd className="font-mono text-[#E6EDF5] mt-0.5">
                  {scenario.scenarioId}
                </dd>
              </div>
              <div>
                <dt className="text-[#6B7A8D]">Schema</dt>
                <dd className="text-[#E6EDF5] mt-0.5">
                  v{scenario.schemaVersion}
                </dd>
              </div>
              <div>
                <dt className="text-[#6B7A8D]">Cập nhật</dt>
                <dd className="tabular-nums text-[#E6EDF5] mt-0.5">
                  {formatDate(scenario.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9AA9BC]">
              Nội dung JSON
            </p>
            <pre className="cns-scrollbar mt-2 max-h-64 overflow-auto rounded-[8px] border border-white/[0.08] bg-[#0c141c] p-3 font-mono text-[11px] leading-relaxed text-[#9AA9BC]">
              {JSON.stringify(scenario.definition, null, 2)}
            </pre>
          </div>
        </div>
      </td>
    </tr>
  );
}
