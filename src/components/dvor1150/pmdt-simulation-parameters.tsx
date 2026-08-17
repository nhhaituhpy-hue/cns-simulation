"use client";

import { X } from "@phosphor-icons/react/dist/csr/X";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import {
  dvor1150ConfigFieldCatalog,
  type Dvor1150ConfigFieldDefinition,
} from "@/lib/dvor1150";
import { Dvor1150ConfigControl } from "./pmdt-config-control";

function fieldLabel(field: Dvor1150ConfigFieldDefinition): string {
  return field.id.startsWith("transmitters.tx1.nominal.")
    ? field.label.replace(/^TX1\s+/, "")
    : field.label;
}

function mirrorNominalField(field: Dvor1150ConfigFieldDefinition): readonly string[] | undefined {
  if (!field.id.startsWith("transmitters.tx1.nominal.") || field.id.endsWith("identCode")) return undefined;
  return [field.id.replace("transmitters.tx1.nominal.", "transmitters.tx2.nominal.")];
}

function SimulationParameterField({ field }: { field: Dvor1150ConfigFieldDefinition }) {
  return <label className="pmdt-config-field">
    <span className="pmdt-config-field-label" title={field.description}>{fieldLabel(field)}</span>
    <span className="pmdt-config-field-control">
      <Dvor1150ConfigControl
        fieldId={field.id}
        type={field.type}
        digits={field.digits}
        mirrorFieldIds={mirrorNominalField(field)}
      />
      {field.unit ? <small>{field.unit}</small> : null}
    </span>
  </label>;
}

export function Dvor1150SimulationParametersPanel() {
  const setOpen = useDvor1150PmdtStore((state) => state.setSimulationParametersOpen);
  const configDirty = useDvor1150PmdtStore((state) => state.configDirty);
  const needBackup = useDvor1150PmdtStore((state) => state.needBackup);
  const lastCommand = useDvor1150PmdtStore((state) => state.lastCommand);
  const securityLevel = useDvor1150PmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDvor1150PmdtStore((state) => state.loginDialogOpen);
  const config = useDvor1150PmdtStore((state) => state.config);
  const derived = useDvor1150PmdtStore((state) => state.derived);
  const local = config.simulation.local;
  const applyConfigChanges = useDvor1150PmdtStore((state) => state.applyConfigChanges);
  const resetConfigDraft = useDvor1150PmdtStore((state) => state.resetConfigDraft);
  const canEdit = securityLevel >= 3 && !loginDialogOpen && local;
  const fields = dvor1150ConfigFieldCatalog.filter((field) => (
    !field.id.startsWith("transmitters.tx2.nominal.") && !field.id.endsWith("nominal.identCode")
  ));
  const sections = Array.from(new Set(fields.map((field) => field.section)));

  return <aside className="pmdt-config-panel dvor1150-simulation-parameters-panel" aria-label="DVOR 1150 simulation parameters">
    <header className="pmdt-config-panel-header">
      <strong>Simulation Parameters</strong>
      <button type="button" title="Close" aria-label="Close parameters" onClick={() => setOpen(false)}><X aria-hidden size={13} weight="bold" /></button>
    </header>
    <div className="pmdt-config-summary">
      <span>Initial values: DVOR 1150 new baseline</span>
      <span>Active Tx: <b>{derived.activeTransmitter?.toUpperCase() ?? "NONE"}</b></span>
      <span>VSWR alarm: <b>&gt; 1.25 : 1</b></span>
      {derived.validation.length > 0 ? <span className="pmdt-config-summary-warning">{derived.validation.length} validation issue(s)</span> : null}
      {lastCommand?.startsWith("Apply failed:") ? <span className="pmdt-config-summary-warning">{lastCommand}</span> : null}
      {loginDialogOpen || securityLevel < 3 ? <span>GUEST: view-only</span> : !local ? <span>Enable Local to edit</span> : configDirty ? <span>Pending changes - press Apply (F7)</span> : needBackup ? <span>Applied - run RMS &gt; Config Backup</span> : <span>Ready</span>}
    </div>
    <div className="pmdt-config-panel-body">
      {sections.map((section) => <details key={section} className="pmdt-config-section" open={section === "Station" || section === "Transmitter Nominal" || section === "Monitor General"}>
        <summary>{section}</summary>
        <div className="pmdt-config-section-body">{fields.filter((field) => field.section === section).map((field) => <SimulationParameterField key={field.id} field={field} />)}</div>
      </details>)}
    </div>
    <footer className="pmdt-config-panel-footer">
      <button type="button" disabled={!canEdit} onClick={resetConfigDraft}>Reset (F8)</button>
      <button type="button" disabled={!canEdit || !configDirty} onClick={applyConfigChanges}>Apply (F7)</button>
      <span>{configDirty ? "Apply (F7) to commit" : "Parameters are staged"}</span>
    </footer>
  </aside>;
}
