"use client";

import { useEffect, useState } from "react";
import {
  canEditDmeScenarioField,
  dmeParameterFieldCatalog,
  getDmeParameterValue,
  parseDmeParameterInput,
  type DmeParameterFieldType,
} from "@/lib/dme1119a";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

interface DmeConfigControlProps {
  fieldId: string;
  label: string;
  type?: DmeParameterFieldType;
  digits?: number;
  className?: string;
  disabled?: boolean;
}

function formatValue(value: string | number | boolean | null, digits?: number): string {
  if (value === null) return "";
  if (typeof value === "number" && digits !== undefined) return value.toFixed(digits);
  return String(value);
}

function inputId(fieldId: string): string {
  return `dme-config-${fieldId.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

/**
 * Editable PMDT configuration control.
 *
 * The value displayed by a configuration screen must come from configDraft,
 * not from the applied data snapshot. Keeping a local string while editing
 * also lets operators clear a number and type a replacement without React
 * formatting the value after every keystroke.
 */
export function DmeConfigControl({
  fieldId,
  label,
  type,
  digits,
  className = "",
  disabled = false,
}: DmeConfigControlProps) {
  const configDraft = useDmePmdtStore((state) => state.configDraft);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const local = useDmePmdtStore((state) => state.data.local);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const scenario = useDmePmdtStore((state) => state.scenario);
  const setParameterValue = useDmePmdtStore((state) => state.setParameterValue);
  const field = dmeParameterFieldCatalog.find((item) => item.id === fieldId);
  const value = getDmeParameterValue(configDraft, fieldId);
  const controlType = type ?? field?.type ?? "text";
  const [draftValue, setDraftValue] = useState(formatValue(value, digits ?? field?.precision));
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = !disabled
    && Boolean(field)
    && canEditDmeScenarioField({
      active: scenario.active,
      editableFieldIds: scenario.definition?.studentEditableFieldIds ?? [],
      fieldId,
      readOnly: field?.readOnly,
      securityLevel,
      local,
      loginDialogOpen,
    });
  const valueClassName = `dme-pmdt-value dme-pmdt-value--gray ${className}`.trim();

  useEffect(() => {
    // Keep the editable text buffer in sync with an external Apply/Restore.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isEditing) setDraftValue(formatValue(value, digits ?? field?.precision));
  }, [value, digits, field?.precision, isEditing]);

  function update(rawValue: string | boolean) {
    setDraftValue(typeof rawValue === "boolean" ? String(rawValue) : rawValue);
    if (!field || field.readOnly) return;

    const parsed = parseDmeParameterInput(field, rawValue);
    if (parsed !== null || field.type !== "number") {
      setParameterValue(fieldId, parsed);
    }
  }

  const metadata = {
    "aria-label": label,
    "data-dme-field-id": fieldId,
    "data-dme-config-field-id": fieldId,
    "data-dme-field-value": String(value ?? ""),
    "data-dme-field-type": controlType,
    title: scenario.active && !canEdit ? "Scenario lock: recovery fields only" : undefined,
  };

  if (controlType === "boolean") {
    return (
      <input
        {...metadata}
        id={inputId(fieldId)}
        name={fieldId}
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
        id={inputId(fieldId)}
        name={fieldId}
        value={draftValue}
        disabled={!canEdit}
        onChange={(event) => update(event.currentTarget.value)}
        className={valueClassName}
      >
        {field?.options?.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  return (
    <input
      {...metadata}
      id={inputId(fieldId)}
      name={fieldId}
      type="text"
      inputMode={controlType === "number" ? "decimal" : undefined}
      value={draftValue}
      min={field?.min}
      max={field?.max}
      step={field?.step}
      disabled={!canEdit}
      readOnly={!canEdit}
      aria-readonly={!canEdit || undefined}
      onChange={(event) => update(event.currentTarget.value)}
      onFocus={() => setIsEditing(true)}
      onBlur={() => setIsEditing(false)}
      className={valueClassName}
    />
  );
}
