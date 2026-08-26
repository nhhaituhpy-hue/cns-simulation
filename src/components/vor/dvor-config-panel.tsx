"use client";

import { X } from "@phosphor-icons/react/dist/csr/X";
import { useState } from "react";
import {
  dvorConfigFieldCatalog,
  getDvorConfigValue,
  parseDvorConfigInput,
  validateDvorConfigField,
  type DvorConfigFieldDefinition,
} from "@/lib/dvor1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

function ConfigField({ field }: { field: DvorConfigFieldDefinition }) {
  const config = useVorPmdtStore((state) => state.configDraft);
  const securityLevel = useVorPmdtStore((state) => state.securityLevel);
  const local = useVorPmdtStore((state) => state.config.simulation.local);
  const scenario = useVorPmdtStore((state) => state.scenario);
  const setConfigValue = useVorPmdtStore((state) => state.setConfigValue);
  const scenarioAllowsField = !scenario.active
    || Boolean(scenario.definition?.studentEditableFieldIds.includes(field.id));
  const canEdit = securityLevel >= 3 && local && scenarioAllowsField;
  const value = getDvorConfigValue(config, field.id);
  const validationMessage = validateDvorConfigField(field, value);
  const [draftValue, setDraftValue] = useState(value === null ? "" : String(value));
  const [isEditing, setIsEditing] = useState(false);
  const controlId = `dvor-config-${field.id}`;
  const isTextEntry = field.type === "number" || field.type === "text";
  const committedValue = value === null ? "" : String(value);
  const displayedValue = isEditing ? draftValue : committedValue;

  function update(rawValue: string | boolean) {
    if (typeof rawValue === "string") setDraftValue(rawValue);
    const nextValue = parseDvorConfigInput(field, rawValue);
    if (nextValue === null && field.type === "number") return;
    setConfigValue(field.id, nextValue);
  }

  return (
    <label className="pmdt-config-field">
      <span className="pmdt-config-field-label" title={field.description}>
        {field.label}
      </span>
      <span className="pmdt-config-field-control">
        {field.type === "boolean" ? (
          <input
            id={controlId}
            name={field.id}
            type="checkbox"
            disabled={!canEdit}
            title={!scenarioAllowsField ? "Scenario lock: examiner recovery controls only" : undefined}
            checked={Boolean(value)}
            onChange={(event) => update(event.currentTarget.checked)}
          />
        ) : field.type === "select" ? (
          <select id={controlId} name={field.id} value={committedValue} disabled={!canEdit} title={!scenarioAllowsField ? "Scenario lock: examiner recovery controls only" : undefined} onChange={(event) => update(event.currentTarget.value)}>
            {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : (
          <input
            id={controlId}
            name={field.id}
            type={field.type === "number" ? "number" : "text"}
            disabled={!canEdit}
            title={!scenarioAllowsField ? "Scenario lock: examiner recovery controls only" : undefined}
            value={displayedValue}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(event) => update(event.currentTarget.value)}
            onFocus={isTextEntry ? () => {
              setDraftValue(committedValue);
              setIsEditing(true);
            } : undefined}
            onBlur={isTextEntry ? () => setIsEditing(false) : undefined}
          />
        )}
        {field.unit ? <small>{field.unit}</small> : null}
      </span>
      {validationMessage ? <small className="pmdt-config-field-error">{validationMessage}</small> : null}
    </label>
  );
}

export function DvorConfigPanel() {
  const setConfigPanelOpen = useVorPmdtStore((state) => state.setConfigPanelOpen);
  const resetConfigDraft = useVorPmdtStore((state) => state.resetConfigDraft);
  const discardConfigChanges = useVorPmdtStore((state) => state.discardConfigChanges);
  const configDirty = useVorPmdtStore((state) => state.configDirty);
  const securityLevel = useVorPmdtStore((state) => state.securityLevel);
  const local = useVorPmdtStore((state) => state.config.simulation.local);
  const derived = useVorPmdtStore((state) => state.derived);
  const scenario = useVorPmdtStore((state) => state.scenario);

  const visibleFields = scenario.active
    ? dvorConfigFieldCatalog.filter((field) => scenario.definition?.studentEditableFieldIds.includes(field.id))
    : dvorConfigFieldCatalog;
  const sections = Array.from(new Set(visibleFields.map((field) => field.section)));

  return (
    <aside className="pmdt-config-panel" aria-label="DVOR 1150A simulation parameters">
      <header className="pmdt-config-panel-header">
        <strong>DVOR 1150A Parameters</strong>
        <button type="button" title="Close" aria-label="Close parameters" onClick={() => setConfigPanelOpen(false)}>
          <X aria-hidden size={13} weight="bold" />
        </button>
      </header>
      <div className="pmdt-config-summary">
        <span>Active Tx: <b>{derived.voting.activeTransmitter?.toUpperCase() ?? "NONE"}</b></span>
        <span>Voting: <b>{derived.voting.systemHealthy ? "NORMAL" : "ALARM"}</b></span>
        {scenario.active ? <span className="pmdt-config-summary-warning">Scenario: {scenario.definition?.name} — recovery controls only</span> : null}
        {derived.validation.length > 0 ? <span className="pmdt-config-summary-warning">{derived.validation.length} validation issue(s)</span> : null}
        {securityLevel < 3 ? <span>GUEST: view-only</span> : !local ? <span>Enable Local to edit</span> : configDirty ? <span>Pending changes — press Apply (F7)</span> : <span>Ready</span>}
      </div>
      <div className="pmdt-config-panel-body">
        {scenario.active && visibleFields.length === 0 ? <p className="pmdt-config-empty">This scenario is corrected by operational commands only.</p> : null}
        {sections.map((section) => (
          <details key={section} className="pmdt-config-section" open={section === "Station" || section === "Transmitter 1" || section === "Monitor control"}>
            <summary>{section}</summary>
            <div className="pmdt-config-section-body">
              {visibleFields.filter((field) => field.section === section).map((field) => (
                <ConfigField key={field.id} field={field} />
              ))}
            </div>
          </details>
        ))}
      </div>
      <footer className="pmdt-config-panel-footer">
        <button type="button" disabled={securityLevel < 3 || !local} onClick={resetConfigDraft}>Reset defaults</button>
        <button type="button" disabled={!configDirty} onClick={discardConfigChanges}>Discard</button>
        <span>{configDirty ? "Apply (F7) to commit" : "Changes are staged"}</span>
      </footer>
    </aside>
  );
}
