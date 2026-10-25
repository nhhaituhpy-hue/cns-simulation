"use client";

import { useState } from "react";
import {
  dvorConfigFieldCatalog,
  getDvorConfigValue,
  isDvor1150aScenarioStudentEditable,
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
  ariaLabel?: string;
  booleanControl?: "checkbox" | "radio";
  optionValue?: string;
  radioName?: string;
  numericSpinner?: boolean;
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
  ariaLabel,
  booleanControl = "checkbox",
  optionValue,
  radioName,
  numericSpinner = false,
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
    || [configFieldId, ...mirrorFieldIds].every((id) => isDvor1150aScenarioStudentEditable(scenario.definition, id));
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
    "aria-label": ariaLabel ?? displayFieldId,
    "data-vor-field-id": displayFieldId,
    "data-vor-config-field-id": configFieldId,
    "data-vor-field-value": String(value ?? ""),
    "data-vor-field-type": controlType,
    "data-vor-effect": field?.effect,
  };

  if (optionValue !== undefined) {
    return <input {...metadata} type="radio" name={radioName ?? configFieldId} value={optionValue}
      checked={value === optionValue} disabled={!canEdit} onChange={() => update(optionValue)} className={className} />;
  }

  if (controlType === "boolean") {
    return (
      <input
        {...metadata}
        type={booleanControl}
        name={booleanControl === "radio" ? configFieldId.replace(/\.(primary|secondary)$/, "") : undefined}
        checked={Boolean(value)}
        disabled={!canEdit}
        title={lockedByScenario ? "Scenario lock: examiner recovery controls only" : field?.effectNotice}
        onChange={(event) => update(event.currentTarget.checked)}
        className={className}
      />
    );
  }

  if (controlType === "select") {
    return (
      <select
        {...metadata}
        value={String(value ?? "")}
        disabled={!canEdit}
        title={lockedByScenario ? "Scenario lock: examiner recovery controls only" : field?.effectNotice}
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

  function steppedValue(direction: 1 | -1): number | null {
    if (!field || controlType !== "number" || typeof value !== "number" || !Number.isFinite(value)) return null;
    if (field.options) {
      const options = field.options.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
      return direction === 1
        ? options.find((option) => option > value) ?? null
        : options.findLast((option) => option < value) ?? null;
    }
    const step = field.step ?? 10 ** -(digits ?? 0);
    const next = Number((value + direction * step).toFixed(10));
    const bounded = Math.min(field.max ?? Infinity, Math.max(field.min ?? -Infinity, next));
    return bounded === value ? null : bounded;
  }

  function stepValue(direction: 1 | -1) {
    if (!canEdit) return;
    const next = steppedValue(direction);
    if (next === null) return;
    update(formatValue(next, digits));
  }

  const input = (
    <input
      {...metadata}
      type={controlType === "number" ? "text" : "text"}
      inputMode={controlType === "number" ? "decimal" : undefined}
      onKeyDown={numericSpinner ? (event) => {
        if (!canEdit || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
        event.preventDefault();
        stepValue(event.key === "ArrowUp" ? 1 : -1);
      } : configFieldId.endsWith(".carrierSidebandPhaseOffsetFine") ? (event) => {
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
      title={lockedByScenario ? "Scenario lock: examiner recovery controls only" : field?.effectNotice}
      onChange={(event) => update(event.currentTarget.value)}
      onFocus={isTextEntry ? () => {
        setDraftValue(committedValue);
        setIsEditing(true);
      } : undefined}
      onBlur={isTextEntry ? () => setIsEditing(false) : undefined}
      className={className}
    />
  );

  if (!numericSpinner || controlType !== "number") return input;
  return <>{input}<span className="pmdt-tx-offset-stepper">
    {([1, -1] as const).map((direction) => <button
      key={direction}
      type="button"
      className="pmdt-tx-offset-step"
      aria-label={`${direction === 1 ? "Increase" : "Decrease"} ${ariaLabel ?? displayFieldId}`}
      title={`${direction === 1 ? "Increase" : "Decrease"} ${field?.label ?? displayFieldId}`}
      disabled={!canEdit || steppedValue(direction) === null}
      onClick={() => stepValue(direction)}
    ><svg width="5" height="4" viewBox="0 0 5 4" aria-hidden="true"><path fill="currentColor" d={direction === 1 ? "M0 4 2.5 0 5 4Z" : "M0 0 5 0 2.5 4Z"} /></svg></button>)}
  </span></>;
}
