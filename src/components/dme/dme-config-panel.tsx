"use client";

import { X } from "@phosphor-icons/react/dist/csr/X";
import { useEffect, useState } from "react";
import {
  dmeParameterFieldCatalog,
  canEditDmeScenarioField,
  formatDmeFrequency,
  getDmeParameterValue,
  getDmeStationChannelAllocation,
  parseDmeParameterInput,
  validateDmeParameterField,
  DME_LDES_TRAINING_MODEL,
  type DmeParameterFieldDefinition,
} from "@/lib/dme1119a";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

function formatParameterValue(field: DmeParameterFieldDefinition, value: string | number | boolean | null) {
  if (value === null) return "";
  if (typeof value === "number" && field.precision !== undefined) return value.toFixed(field.precision);
  return String(value);
}

function parameterInputId(fieldId: string): string {
  return `dme-parameter-${fieldId.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

function ParameterField({ field }: { field: DmeParameterFieldDefinition }) {
  const data = useDmePmdtStore((state) => state.configDraft);
  const scenario = useDmePmdtStore((state) => state.scenario);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const local = useDmePmdtStore((state) => state.data.local);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const setParameterValue = useDmePmdtStore((state) => state.setParameterValue);
  const value = getDmeParameterValue(data, field.id);
  const validationMessage = field.readOnly ? null : validateDmeParameterField(field, value);
  const canEdit = canEditDmeScenarioField({
    active: scenario.active,
    editableFieldIds: scenario.definition?.studentEditableFieldIds ?? [],
    fieldId: field.id,
    readOnly: field.readOnly,
    securityLevel,
    local,
    loginDialogOpen,
  });
  const inputId = parameterInputId(field.id);
  const [draftValue, setDraftValue] = useState(formatParameterValue(field, value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // This local draft mirrors an external Zustand value after Apply/Restore;
    // the synchronous update is intentional and guarded while editing.
    if (!isEditing) setDraftValue(formatParameterValue(field, value));
  }, [field, value, isEditing]);

  function update(rawValue: string | boolean) {
    if (field.readOnly) return;
    if (typeof rawValue === "string") setDraftValue(rawValue);
    const nextValue = parseDmeParameterInput(field, rawValue);
    if (nextValue === null && field.type === "number") return;
    setParameterValue(field.id, nextValue);
  }

  return (
    <label className="pmdt-config-field" data-read-only={!canEdit || undefined} title={scenario.active && !canEdit ? "Scenario lock: recovery fields only" : field.description}>
      <span className="pmdt-config-field-label" title={field.description}>{field.label}</span>
      <span className="pmdt-config-field-control">
        {field.type === "boolean" ? (
          <input
            id={inputId}
            name={field.id}
            type="checkbox"
            aria-label={field.label}
            checked={Boolean(value)}
            disabled={!canEdit}
            onChange={(event) => update(event.currentTarget.checked)}
          />
        ) : field.type === "select" ? (
          <select
            id={inputId}
            name={field.id}
            aria-label={field.unit ? `${field.label} ${field.unit}` : field.label}
            value={draftValue}
            disabled={!canEdit}
            onChange={(event) => update(event.currentTarget.value)}
          >
            {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : (
          <input
            id={inputId}
            name={field.id}
            aria-label={field.unit ? `${field.label} ${field.unit}` : field.label}
            type={field.type === "number" && canEdit ? "number" : "text"}
            value={draftValue}
            min={field.min}
            max={field.max}
            step={field.step}
            readOnly={!canEdit}
            aria-readonly={!canEdit || undefined}
            onChange={(event) => update(event.currentTarget.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={() => setIsEditing(false)}
          />
        )}
        {field.unit ? <small>{field.unit}</small> : null}
      </span>
      {validationMessage ? <small className="pmdt-config-field-error">{validationMessage}</small> : null}
    </label>
  );
}

export function DmeConfigPanel() {
  const data = useDmePmdtStore((state) => state.configDraft);
  const scenario = useDmePmdtStore((state) => state.scenario);
  const setConfigPanelOpen = useDmePmdtStore((state) => state.setConfigPanelOpen);
  const restoreDefaultConfig = useDmePmdtStore((state) => state.restoreDefaultConfig);
  const applyConfigChanges = useDmePmdtStore((state) => state.applyConfigChanges);
  const configDirty = useDmePmdtStore((state) => state.configDirty);
  const needBackup = useDmePmdtStore((state) => state.needBackup);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const local = useDmePmdtStore((state) => state.data.local);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const lastCommand = useDmePmdtStore((state) => state.lastCommand);
  const canApply = configDirty && securityLevel >= 3 && !loginDialogOpen && local;
  const visibleFields = scenario.active
    ? dmeParameterFieldCatalog.filter((field) => scenario.definition?.studentEditableFieldIds.includes(field.id))
    : dmeParameterFieldCatalog;
  const sections = Array.from(new Set(visibleFields.map((field) => field.section)));
  const allocation = getDmeStationChannelAllocation(data.rmsConfigStation);
  const validationCount = visibleFields.reduce((count, field) => (
    !field.readOnly && validateDmeParameterField(field, getDmeParameterValue(data, field.id)) ? count + 1 : count
  ), 0);

  return (
    <aside className="pmdt-config-panel dme-pmdt-config-panel" aria-label="DME 1119A simulation parameters">
      <header className="pmdt-config-panel-header">
        <strong>DME 1119A Parameters</strong>
        <button type="button" title="Close" aria-label="Close parameters" onClick={() => setConfigPanelOpen(false)}>
          <X aria-hidden size={13} weight="bold" />
        </button>
      </header>
      <div className="pmdt-config-summary dme-pmdt-channel-summary">
        <div className="dme-pmdt-parameter-meta">
          <span>Active Tx: <b>TX{data.monitorTransmitterStatus.mainSelect}</b></span>
          <span>Antenna: <b>TX{data.monitorTransmitterStatus.antennaSelect}</b></span>
          <span>Monitors: <b>{data.rmsConfigStation.monitorConfig === "Dual Monitors" ? "Dual" : "Single"}</b></span>
        </div>
        <table aria-label="DME channel frequency assignment">
          <thead>
            <tr><th>CHANNEL</th><th>RX (MHz)</th><th>TX (MHz)</th><th>INT (MHz)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>{allocation?.channelLabel ?? "--"}</td>
              <td>{allocation ? formatDmeFrequency(allocation.receiverFrequencyMHz) : "--"}</td>
              <td>{allocation ? formatDmeFrequency(allocation.transmitterReplyFrequencyMHz) : "--"}</td>
              <td>{allocation ? formatDmeFrequency(allocation.monitorInterrogatorFrequencyMHz) : "--"}</td>
            </tr>
          </tbody>
        </table>
        <span className="dme-pmdt-channel-meta">
          RX LO: <b>{allocation ? `${formatDmeFrequency(allocation.receiverLoFrequencyMHz)} MHz` : "--"}</b>
          {allocation ? ` · INT/TX spacing: ${allocation.interrogatorPulseSpacingUs}/${allocation.transmitterReplyPulseSpacingUs} us · Delay: ${allocation.nominalReplyDelayUs} us` : ""}
        </span>
        {validationCount > 0 ? <span className="pmdt-config-summary-warning">{validationCount} validation issue(s)</span> : null}
        {scenario.active ? <span className="pmdt-config-summary-warning">Scenario active: recovery controls only</span> : null}
        <span title={DME_LDES_TRAINING_MODEL.assumption}>LDES model: configured Window/Threshold (SRE/FUD not exposed)</span>
        {lastCommand?.startsWith("Configuration validation failed:") ? <span className="pmdt-config-summary-warning">{lastCommand}</span> : null}
        {loginDialogOpen || securityLevel < 3 ? <span>GUEST: view-only</span> : !local ? <span>Enable Local to edit</span> : configDirty ? <span>Pending changes - press Apply (F7)</span> : needBackup ? <span>Applied - run RMS &gt;&gt; Config Backup</span> : <span>Ready</span>}
      </div>
      <div className="pmdt-config-panel-body">
        {scenario.active && visibleFields.length === 0 ? <p className="pmdt-config-empty">Scenario is corrected by operational commands only. Use Transmitters/RMS commands and monitor bypass controls.</p> : null}
        {sections.map((section) => (
          <details
            key={section}
            className="pmdt-config-section"
            open={section === "Channel assignment" || section === "Station equipment"}
          >
            <summary>{section}</summary>
            <div className="pmdt-config-section-body">
              {visibleFields.filter((field) => field.section === section).map((field) => (
                <ParameterField key={field.id} field={field} />
              ))}
            </div>
          </details>
        ))}
      </div>
      <footer className="pmdt-config-panel-footer">
        <button type="button" disabled={securityLevel < 3 || loginDialogOpen || !local} onClick={restoreDefaultConfig}>Reset defaults</button>
        <button type="button" disabled={securityLevel < 3 || loginDialogOpen || !local} onClick={restoreDefaultConfig}>Reset (F8)</button>
        <button type="button" disabled={!canApply} onClick={applyConfigChanges}>Apply (F7)</button>
        <span>{configDirty ? "Apply (F7) to commit" : "Channel drives RX, TX, INT, RX LO and delay"}</span>
      </footer>
    </aside>
  );
}
