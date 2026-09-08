"use client";

import { useState } from "react";
import {
  dvorConfigFieldCatalog,
  getDvorConfigValue,
  parseDvorConfigInput,
  type DvorConfigFieldType,
} from "@/lib/dvor1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

interface PmdtConfigControlProps {
  displayFieldId: string;
  configFieldId: string;
  mirrorFieldIds?: readonly string[];
  type?: DvorConfigFieldType;
  digits?: number;
  className?: string;
  disabled?: boolean;
}

function formatValue(value: string | number | boolean | null, digits?: number): string {
  if (value === null) return "";
  if (typeof value === "number" && digits !== undefined) return value.toFixed(digits);
  return String(value);
}

export function PmdtConfigControl({
  displayFieldId,
  configFieldId,
  mirrorFieldIds = [],
  type,
  digits,
  className = "",
  disabled = false,
}: PmdtConfigControlProps) {
  const config = useVorPmdtStore((state) => state.configDraft);
  const securityLevel = useVorPmdtStore((state) => state.securityLevel);
  const local = useVorPmdtStore((state) => state.config.simulation.local);
  const scenario = useVorPmdtStore((state) => state.scenario);
  const setConfigValue = useVorPmdtStore((state) => state.setConfigValue);
  const field = dvorConfigFieldCatalog.find((item) => item.id === configFieldId);
  const value = getDvorConfigValue(config, configFieldId);
  const controlType = type ?? field?.type ?? "text";
  const [draftValue, setDraftValue] = useState(formatValue(value, digits));
  const [isEditing, setIsEditing] = useState(false);
  const scenarioAllowsField = !scenario.active
    || [configFieldId, ...mirrorFieldIds].every((id) => scenario.definition?.studentEditableFieldIds.includes(id));
  const canEdit = !disabled && scenarioAllowsField && securityLevel >= 3 && local && Boolean(field);
  const lockedByScenario = scenario.active && !scenarioAllowsField;
  const isTextEntry = controlType === "number" || controlType === "text";
  const committedValue = formatValue(value, digits);
  const displayedValue = isEditing ? draftValue : committedValue;

  function update(rawValue: string | boolean) {
    setDraftValue(typeof rawValue === "boolean" ? String(rawValue) : rawValue);
    if (!field) return;
    const parsed = parseDvorConfigInput(field, rawValue);
    if (parsed !== null || field.type !== "number") setConfigValue(configFieldId, parsed, mirrorFieldIds);
  }

  const metadata = {
    "aria-label": displayFieldId,
    "data-vor-field-id": displayFieldId,
    "data-vor-config-field-id": configFieldId,
    "data-vor-field-value": String(value ?? ""),
    "data-vor-field-type": controlType,
  };

  if (controlType === "boolean") {
    return (
      <input
        {...metadata}
        type="checkbox"
        checked={Boolean(value)}
        disabled={!canEdit}
        title={lockedByScenario ? "Scenario lock: examiner recovery controls only" : undefined}
        onChange={(event) => update(event.currentTarget.checked)}
        className={className}
      />
    );
  }

  if (controlType === "select" || (controlType === "number" && field?.options)) {
    return (
      <select
        {...metadata}
        value={String(value ?? "")}
        disabled={!canEdit}
        title={lockedByScenario ? "Scenario lock: examiner recovery controls only" : undefined}
        onChange={(event) => update(event.currentTarget.value)}
        className={className}
      >
        {field?.options && !field.options.includes(String(value)) ? (
          <option value={String(value)} disabled>{String(value)} (ngoài phạm vi)</option>
        ) : null}
        {field?.options?.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  return (
    <input
      {...metadata}
      type={controlType === "number" ? "text" : "text"}
      inputMode={controlType === "number" ? "decimal" : undefined}
      onKeyDown={configFieldId.endsWith(".carrierSidebandPhaseOffsetFine") ? (event) => {
        if (!canEdit || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
        event.preventDefault();
        const current = Number(displayedValue);
        if (!Number.isFinite(current)) return;
        const next = Math.min(field?.max ?? 45, Math.max(field?.min ?? -45,
          current + (event.key === "ArrowUp" ? 0.1 : -0.1)));
        update(next.toFixed(1));
      } : undefined}
      value={displayedValue}
      disabled={!canEdit}
      title={lockedByScenario ? "Scenario lock: examiner recovery controls only" : undefined}
      onChange={(event) => update(event.currentTarget.value)}
      onFocus={isTextEntry ? () => {
        setDraftValue(committedValue);
        setIsEditing(true);
      } : undefined}
      onBlur={isTextEntry ? () => setIsEditing(false) : undefined}
      className={className}
    />
  );
}
