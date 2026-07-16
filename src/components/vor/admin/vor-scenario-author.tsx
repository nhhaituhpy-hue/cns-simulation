"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type PointerEvent } from "react";
import type {
  VorEditableValue,
  VorFieldOverride,
  VorIndicatorColor,
  VorParameterStatus,
  VorScenario,
} from "@/lib/vor-types";
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
  const visibleText = element.textContent?.trim() || fieldId;
  const statusMatch = visibleText.match(/(green|yellow|red|gray|normal|warning|alarm)$/i);
  return {
    fieldId,
    label: visibleText.slice(0, 120),
    value: override?.value ?? parseVisibleValue(element),
    ...(override?.status
      ? { status: override.status }
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
    return <div className="mx-auto max-w-xl p-8 text-center"><p className="text-[var(--text-secondary)]">Không tìm thấy kịch bản VOR.</p><Link href="/admin" className="mt-4 inline-flex text-[var(--accent)]">Quay về quản trị</Link></div>;
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
        }
      : { ...emptyDraft, overrides: [], expectedCheckpoints: [] },
  );
  const [selectedField, setSelectedField] = useState<VorSelectedField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (metadata.expectedCheckpoints.length === 0) {
      setError("Hãy thêm ít nhất một màn hình kiểm tra chuẩn.");
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
      router.push("/admin");
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
      onSave={() => void save()}
    />
  );

  return (
    <div className="relative" onPointerDownCapture={selectField}>
      <Link href="/admin" className="absolute left-3 top-2 z-[60] inline-flex h-7 items-center gap-1.5 border border-[#475569] bg-[#0f172a] px-2 text-[10px] font-semibold text-[#cbd5e1] hover:text-white"><ArrowLeft aria-hidden size={12} />Quản trị</Link>
      <PmdtLayout mode="author" sidePanel={panel} />
    </div>
  );
}
