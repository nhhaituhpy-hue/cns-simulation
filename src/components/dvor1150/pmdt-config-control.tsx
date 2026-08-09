"use client";

import { useEffect, useState } from "react";
import {
  dvor1150ConfigFieldCatalog,
  getDvor1150ConfigValue,
  parseDvor1150ConfigInput,
  type Dvor1150ConfigFieldType,
} from "@/lib/dvor1150";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

function formatValue(value: string | number | boolean | null, digits?: number): string {
  if (value === null) return "";
  return typeof value === "number" && digits !== undefined ? value.toFixed(digits) : String(value);
}

export function Dvor1150ConfigControl({
  fieldId,
  type,
  digits,
  className = "dvor1150-control",
}: {
  fieldId: string;
  type?: Dvor1150ConfigFieldType;
  digits?: number;
  className?: string;
}) {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const security = useDvor1150PmdtStore((state) => state.securityLevel);
  const local = useDvor1150PmdtStore((state) => state.config.simulation.local);
  const bypass = useDvor1150PmdtStore((state) => state.config.simulation.integralMonitorBypass);
  const setConfigValue = useDvor1150PmdtStore((state) => state.setConfigValue);
  const field = dvor1150ConfigFieldCatalog.find((item) => item.id === fieldId);
  const value = getDvor1150ConfigValue(config, fieldId);
  const controlType = type ?? field?.type ?? "text";
  const [draftValue, setDraftValue] = useState(formatValue(value, digits ?? field?.digits));
  const [editing, setEditing] = useState(false);
  const canEdit = security >= 3 && local && bypass && Boolean(field);

  useEffect(() => {
    if (!editing) setDraftValue(formatValue(value, digits ?? field?.digits));
  }, [value, digits, field?.digits, editing]);

  function update(raw: string | boolean) {
    setDraftValue(typeof raw === "boolean" ? String(raw) : raw);
    if (!field) return;
    const parsed = parseDvor1150ConfigInput(field, raw);
    if (parsed !== null || field.type !== "number") setConfigValue(fieldId, parsed);
  }

  if (controlType === "boolean") {
    return <input type="checkbox" checked={Boolean(value)} disabled={!canEdit} onChange={(event) => update(event.currentTarget.checked)} className={className} aria-label={field?.label ?? fieldId} />;
  }
  if (controlType === "select") {
    return <select value={draftValue} disabled={!canEdit} onChange={(event) => update(event.currentTarget.value)} className={className} aria-label={field?.label ?? fieldId}>
      {field?.options?.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>;
  }
  return <input type="text" inputMode={controlType === "number" ? "decimal" : undefined} value={draftValue} disabled={!canEdit} onChange={(event) => update(event.currentTarget.value)} onFocus={() => setEditing(true)} onBlur={() => setEditing(false)} className={className} aria-label={field?.label ?? fieldId} />;
}
