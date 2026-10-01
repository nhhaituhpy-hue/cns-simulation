"use client";

import { useEffect, useState } from "react";
import {
  dvor1150ConfigFieldCatalog,
  getDvor1150ConfigValue,
  isDvor1150ScenarioStudentEditable,
  parseDvor1150ConfigInput,
  type Dvor1150ConfigFieldType,
} from "@/lib/dvor1150";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

function formatValue(value: string | number | boolean | null, digits?: number): string {
  if (value === null) return "";
  return typeof value === "number" && digits !== undefined ? value.toFixed(digits) : String(value);
}

function stepPrecision(step: number, digits?: number): number {
  if (digits !== undefined) return digits;
  return String(step).split(".")[1]?.length ?? 0;
}

export function Dvor1150ConfigControl({
  fieldId,
  type,
  digits,
  mirrorFieldIds,
  className = "dvor1150-control",
}: {
  fieldId: string;
  type?: Dvor1150ConfigFieldType;
  digits?: number;
  mirrorFieldIds?: readonly string[];
  className?: string;
}) {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const security = useDvor1150PmdtStore((state) => state.securityLevel);
  const local = useDvor1150PmdtStore((state) => state.config.simulation.local);
  const scenario = useDvor1150PmdtStore((state) => state.scenario);
  const setConfigValue = useDvor1150PmdtStore((state) => state.setConfigValue);
  const field = dvor1150ConfigFieldCatalog.find((item) => item.id === fieldId);
  const value = getDvor1150ConfigValue(config, fieldId);
  const controlType = type ?? field?.type ?? "text";
  const [draftValue, setDraftValue] = useState(formatValue(value, digits ?? field?.digits));
  const [editing, setEditing] = useState(false);
  const scenarioAllowsField = !scenario.active || Boolean(
    scenario.definition && isDvor1150ScenarioStudentEditable(scenario.definition, fieldId),
  );
  const canEdit = security >= 3 && local && scenarioAllowsField && Boolean(field);

  useEffect(() => {
    if (!editing) setDraftValue(formatValue(value, digits ?? field?.digits));
  }, [value, digits, field?.digits, editing]);

  function update(raw: string | boolean) {
    setDraftValue(typeof raw === "boolean" ? String(raw) : raw);
    if (!field) return;
    const parsed = parseDvor1150ConfigInput(field, raw);
    setConfigValue(fieldId, parsed);
    mirrorFieldIds?.forEach((mirrorFieldId) => setConfigValue(mirrorFieldId, parsed));
  }

  function stepNumber(direction: 1 | -1) {
    if (!field || field.type !== "number") return;
    const typedValue = Number(draftValue);
    const currentValue = Number.isFinite(typedValue)
      ? typedValue
      : typeof value === "number"
        ? value
        : field.min ?? 0;
    const nextValue = Math.min(
      field.max ?? Number.POSITIVE_INFINITY,
      Math.max(field.min ?? Number.NEGATIVE_INFINITY, currentValue + direction * (field.step ?? 1)),
    );
    update(nextValue.toFixed(stepPrecision(field.step ?? 1, digits ?? field.digits)));
    setEditing(false);
  }

  if (controlType === "boolean") {
    return <input type="checkbox" checked={Boolean(value)} disabled={!canEdit} onChange={(event) => update(event.currentTarget.checked)} className={className} aria-label={field?.label ?? fieldId} />;
  }
  if (controlType === "select") {
    return <select value={draftValue} disabled={!canEdit} onChange={(event) => update(event.currentTarget.value)} className={className} aria-label={field?.label ?? fieldId}>
      {field?.options?.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>;
  }
  if (controlType === "number") {
    const label = field?.label ?? fieldId;
    return <span className={`${className} dvor1150-number-control`}>
      <input
        type="text"
        inputMode="decimal"
        value={draftValue}
        disabled={!canEdit}
        onChange={(event) => update(event.currentTarget.value)}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") { event.preventDefault(); stepNumber(1); }
          if (event.key === "ArrowDown") { event.preventDefault(); stepNumber(-1); }
        }}
        className="dvor1150-number-control__input"
        aria-label={label}
      />
      <span className="dvor1150-number-control__buttons">
        <button type="button" tabIndex={-1} disabled={!canEdit} onMouseDown={(event) => event.preventDefault()} onClick={() => stepNumber(1)} aria-label={`Increase ${label}`}>▲</button>
        <button type="button" tabIndex={-1} disabled={!canEdit} onMouseDown={(event) => event.preventDefault()} onClick={() => stepNumber(-1)} aria-label={`Decrease ${label}`}>▼</button>
      </span>
    </span>;
  }
  return <input type="text" value={draftValue} disabled={!canEdit} onChange={(event) => update(event.currentTarget.value)} onFocus={() => setEditing(true)} onBlur={() => setEditing(false)} className={className} aria-label={field?.label ?? fieldId} />;
}
