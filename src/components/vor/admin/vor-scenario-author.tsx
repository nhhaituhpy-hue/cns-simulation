"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type PointerEvent } from "react";
import { HardwareTaskEditor } from "@/components/hardware/hardware-task-editor";
import { VOR_EQUIPMENT_DIAGRAMS } from "@/lib/vor-hardware-model";
import type {
  VorEditableValue,
  VorFieldOverride,
  VorIndicatorColor,
  VorParameterStatus,
  VorScenario,
} from "@/lib/vor-types";
import { isInteractiveSidebarField } from "@/lib/vor-sidebar-fields";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import {
  useVorScenarioStore,
  type VorScenarioInput,
} from "@/stores/vor-scenario-store";
import { PmdtLayout } from "../pmdt-layout";
import {
  VorAuthorPanel,
  type VorSelectedField,
} from "./vor-author-panel";

const emptyDraft: VorScenarioInput = {
  title: "",
  description: "",
  difficulty: "medium",
  prompt: "",
  overrides: [],
  expectedCheckpoints: [],
};

function parseVisibleValue(element: HTMLElement): VorEditableValue {
  const metadataValue = element.dataset.vorFieldValue;
  if (metadataValue !== undefined) {
    if (element.dataset.vorFieldType === "boolean") return metadataValue === "true";
    if (element.dataset.vorFieldType === "number") {
      const numeric = Number(metadataValue);
      return Number.isFinite(numeric) ? numeric : metadataValue;
    }
    return metadataValue;
  }
  const input = element.matches("input")
    ? element
    : element.querySelector("input");
  if (input instanceof HTMLInputElement) {
    if (input.type === "checkbox" || input.type === "radio") return input.checked;
    const numeric = Number(input.value);
    return input.value.trim() !== "" && Number.isFinite(numeric)
      ? numeric
      : input.value;
  }
  const text = element.textContent?.trim() ?? "";
  const numeric = Number(text);
  return text !== "" && Number.isFinite(numeric) ? numeric : text;
}

function selectedFromElement(
  element: HTMLElement,
  overrides: readonly VorFieldOverride[],
): VorSelectedField | null {
  const fieldId = element.dataset.vorFieldId;
  if (!fieldId) return null;
  const override = overrides.find((item) => item.fieldId === fieldId);
  const visibleText = element.dataset.vorFieldLabel ?? element.textContent?.trim() ?? fieldId;
  const statusMatch = visibleText.match(/(green|yellow|red|gray|normal|warning|alarm)$/i);
  return {
    fieldId,
    label: visibleText.slice(0, 120),
    value: override?.value ?? parseVisibleValue(element),
    ...(override?.status
      ? { status: override.status }
      : element.dataset.vorFieldStatus
        ? { status: element.dataset.vorFieldStatus as VorIndicatorColor | VorParameterStatus }
      : statusMatch
        ? { status: statusMatch[1].toLowerCase() as VorIndicatorColor | VorParameterStatus }
        : {}),
  };
}

export function VorScenarioAuthor({ scenarioId }: { scenarioId?: string }) {
  const scenarios = useVorScenarioStore((state) => state.scenarios);
  const isHydrated = useVorScenarioStore((state) => state.isHydrated);
  const hydrate = useVorScenarioStore((state) => state.hydrate);
  const scenario = scenarioId
    ? scenarios.find((item) => item.id === scenarioId)
    : undefined;

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return <div className="grid min-h-[60dvh] place-items-center text-sm text-[var(--text-secondary)]">Đang tải trình xây dựng VOR...</div>;
  }
  if (scenarioId && !scenario) {
    return <div className="mx-auto max-w-xl p-8 text-center"><p className="text-[var(--text-secondary)]">Không tìm thấy kịch bản VOR.</p><Link href="/admin/vor" className="mt-4 inline-flex text-[var(--accent)]">Quay về quản trị</Link></div>;
  }

  return (
    <VorScenarioAuthorEditor
      key={`${scenarioId ?? "new"}:${scenario?.updatedAt ?? scenario?.createdAt ?? "empty"}`}
      scenarioId={scenarioId}
      initialScenario={scenario}
    />
  );
}

function VorScenarioAuthorEditor({
  scenarioId,
  initialScenario,
}: {
  scenarioId?: string;
  initialScenario?: VorScenario;
}) {
  const router = useRouter();
  const createScenario = useVorScenarioStore((state) => state.createScenario);
  const updateScenario = useVorScenarioStore((state) => state.updateScenario);
  const initializeSession = useVorPmdtStore((state) => state.initializeSession);
  const setOverride = useVorPmdtStore((state) => state.setOverride);
  const removeOverride = useVorPmdtStore((state) => state.removeOverride);
  const [draft, setDraft] = useState<VorScenarioInput>(() =>
    initialScenario
      ? {
          title: initialScenario.title,
          description: initialScenario.description,
          difficulty: initialScenario.difficulty,
          prompt: initialScenario.prompt,
          overrides: initialScenario.overrides.map((item) => ({ ...item })),
          expectedCheckpoints: initialScenario.expectedCheckpoints.map((item) => ({
            ...item,
            menuPath: [...item.menuPath],
          })),
          ...(initialScenario.hardwareTask
            ? { hardwareTask: structuredClone(initialScenario.hardwareTask) }
            : {}),
        }
      : { ...emptyDraft, overrides: [], expectedCheckpoints: [] },
  );
  const [selectedField, setSelectedField] = useState<VorSelectedField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hardwareEditorOpen, setHardwareEditorOpen] = useState(false);
  useEffect(() => {
    initializeSession({
      mode: "author",
      scenarioId,
      overrides: initialScenario?.overrides ?? [],
      expectedCheckpoints: initialScenario?.expectedCheckpoints ?? [],
    });
  }, [initializeSession, initialScenario, scenarioId]);

  function selectField(event: PointerEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const fieldElement = target.closest<HTMLElement>("[data-vor-field-id]");
    if (!fieldElement) return;
    const selected = selectedFromElement(
      fieldElement,
      useVorPmdtStore.getState().overrides,
    );
    if (selected) setSelectedField(selected);
  }

  async function save() {
    const metadata = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      prompt: draft.prompt.trim(),
      overrides: useVorPmdtStore.getState().overrides,
      expectedCheckpoints: useVorPmdtStore.getState().expectedCheckpoints,
    };
    if (metadata.title.length < 3) {
      setError("Tiêu đề cần ít nhất 3 ký tự.");
      return;
    }
    if (!metadata.description || !metadata.prompt) {
      setError("Hãy nhập mô tả và đề bài cho học viên.");
      return;
    }
    if (metadata.overrides.length === 0) {
      setError("Hãy cấu hình ít nhất một giá trị hoặc màu sự cố.");
      return;
    }
    const hasSidebarTarget = metadata.overrides.some((item) =>
      isInteractiveSidebarField(item.fieldId),
    );
    if (metadata.expectedCheckpoints.length === 0 && !hasSidebarTarget) {
      setError("Hãy thêm ít nhất một màn hình hoặc thao tác sidebar cần kiểm tra.");
      return;
    }
    if (metadata.hardwareTask && metadata.hardwareTask.expectedComponentIds.length === 0) {
      setError("Hãy chọn ít nhất một block phần cứng cho bước 2.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (scenarioId) {
        const updated = await updateScenario(scenarioId, metadata);
        if (!updated) throw new Error("Không tìm thấy kịch bản VOR.");
      } else {
        await createScenario(metadata);
      }
      router.push("/admin/vor");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu kịch bản VOR.");
      setSaving(false);
    }
  }

  const panel = (
    <VorAuthorPanel
      key={selectedField ? `${selectedField.fieldId}:${String(selectedField.value)}:${selectedField.status ?? ""}` : "no-field"}
      draft={draft}
      selectedField={selectedField}
      saving={saving}
      error={error}
      onDraftChange={(changes) => {
        setDraft((current) => ({ ...current, ...changes }));
        setError(null);
      }}
      onApplyField={(value, status) => {
        if (!selectedField) return;
        setOverride(selectedField.fieldId, value, status);
        setSelectedField({ ...selectedField, value, ...(status ? { status } : {}) });
      }}
      onRemoveField={() => {
        if (!selectedField) return;
        removeOverride(selectedField.fieldId);
      }}
      onOpenHardware={() => setHardwareEditorOpen(true)}
      onSave={() => void save()}
    />
  );

  return (
    <div className="relative" onPointerDownCapture={selectField}>
      <div className="flex h-8 items-center border-b border-[#334155] bg-[#0f172a] px-4">
        <a
          href="/admin/vor"
          onClick={(e) => {
            e.preventDefault();
            const pmdtState = useVorPmdtStore.getState();
            const hasContent =
              draft.title.trim() !== "" ||
              draft.description.trim() !== "" ||
              draft.prompt.trim() !== "" ||
              pmdtState.overrides.length > 0 ||
              pmdtState.expectedCheckpoints.length > 0 ||
              draft.hardwareTask != null;
            if (
              !hasContent ||
              window.confirm(
                "Bạn có nội dung chưa lưu. Bạn có chắc muốn rời trang?"
              )
            ) {
              router.push("/admin/vor");
            }
          }}
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#cbd5e1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
        >
          <ArrowLeft aria-hidden size={13} />
          Quay về khu vực quản trị
        </a>
      </div>
      <PmdtLayout mode="author" sidePanel={panel} />
      {hardwareEditorOpen ? (
        <HardwareTaskEditor
          title="VOR"
          diagrams={VOR_EQUIPMENT_DIAGRAMS}
          value={draft.hardwareTask}
          onChange={(hardwareTask) => {
            setDraft((current) => {
              const next = { ...current };
              if (hardwareTask) next.hardwareTask = hardwareTask;
              else delete next.hardwareTask;
              return next;
            });
            setError(null);
          }}
          onClose={() => setHardwareEditorOpen(false)}
        />
      ) : null}
    </div>
  );
}
