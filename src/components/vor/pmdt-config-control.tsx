"use client";

import { useEffect, useState } from "react";
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
  type,
  digits,
  className = "",
  disabled = false,
}: PmdtConfigControlProps) {
  const config = useVorPmdtStore((state) => state.configDraft);
  const securityLevel = useVorPmdtStore((state) => state.securityLevel);
  const local = useVorPmdtStore((state) => state.config.simulation.local);
  const setConfigValue = useVorPmdtStore((state) => state.setConfigValue);
  const field = dvorConfigFieldCatalog.find((item) => item.id === configFieldId);
  const value = getDvorConfigValue(config, configFieldId);
  const controlType = type ?? field?.type ?? "text";
  const [draftValue, setDraftValue] = useState(formatValue(value, digits));
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = !disabled && securityLevel >= 3 && local && Boolean(field);
  const isTextEntry = controlType === "number" || controlType === "text";

  useEffect(() => {
    if (!isEditing) setDraftValue(formatValue(value, digits));
  }, [value, digits, isEditing]);

  function update(rawValue: string | boolean) {
    setDraftValue(typeof rawValue === "boolean" ? String(rawValue) : rawValue);
    if (!field) return;
    const parsed = parseDvorConfigInput(field, rawValue);
    if (parsed !== null || field.type !== "number") setConfigValue(configFieldId, parsed);
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
        onChange={(event) => update(event.currentTarget.checked)}
        className={className}
      />
    );
  }

  if (controlType === "select") {
    return (
      <select
        {...metadata}
        value={draftValue}
        disabled={!canEdit}
        onChange={(event) => update(event.currentTarget.value)}
        className={className}
      >
        {field?.options?.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  return (
    <input
      {...metadata}
      type={controlType === "number" ? "text" : "text"}
      inputMode={controlType === "number" ? "decimal" : undefined}
      value={draftValue}
      disabled={!canEdit}
      onChange={(event) => update(event.currentTarget.value)}
      onFocus={isTextEntry ? () => setIsEditing(true) : undefined}
      onBlur={isTextEntry ? () => setIsEditing(false) : undefined}
      className={className}
    />
  );
}
