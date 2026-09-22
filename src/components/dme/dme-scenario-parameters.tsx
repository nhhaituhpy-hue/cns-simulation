"use client";

import { X } from "@phosphor-icons/react/dist/csr/X";
import { useMemo, useRef, useState } from "react";
import {
  DME1119A_TEMPERATURE_SENSORS,
  DME1119A_BUILT_IN_SCENARIOS,
  dmeParameterFieldCatalog,
  evaluateDme1119aScenario,
  getDmeParameterValue,
  parseDme1119aScenarioDefinition,
  parseDmeParameterInput,
  previewDme1119aScenario,
  setDmeParameterValue,
  validateDme1119aScenarioDefinition,
  validateDmeParameterField,
  type Dme1119aScenarioCriterion,
  type Dme1119aScenarioDefinition,
  type Dme1119aScenarioFault,
  type DmeParameterFieldDefinition,
  type DmeParameterValue,
} from "@/lib/dme1119a";
import { extractDme1119aConfig, hydrateDme1119aData } from "@/lib/simulator-config/dme-1119a";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

const faultKinds = [
  ["tx-power-loss", "TX power loss"],
  ["reply-delay-drift", "Reply delay drift"],
  ["pulse-spacing-drift", "Pulse spacing drift"],
  ["tx-frequency-error", "TX frequency error"],
  ["hpa-fault", "HPA fault"],
  ["rtc-comm-fault", "RTC communication fault"],
  ["antenna-vswr", "Antenna VSWR"],
  ["monitor-offset", "Monitor calibration offset"],
  ["ident-signal", "Ident signal"],
  ["temperature", "Temperature"],
  ["ac-power", "AC power"],
] as const;

const criterionKinds = [
  ["monitor-normal", "Monitor normal"],
  ["monitor-alarm-clear", "Monitor alarm clear"],
  ["active-transmitter", "Active transmitter"],
  ["active-path-healthy", "Active path healthy"],
  ["parameter-status", "Parameter status"],
  ["rtc-overload-clear", "RTC overload clear"],
  ["bypass-cleared", "Monitor bypass cleared"],
  ["ident-normal", "Ident normal"],
  ["fan-control", "Fan control"],
  ["ac-power-normal", "AC power normal"],
] as const;

const monitorParameterOptions = [
  "Delay", "Spacing", "Tx Power", "ERP", "Efficiency", "PRF",
  "Tx Frequency", "Rx LO Frequency", "Rx Frequency", "Tx Frequency Error",
  "Rx LO Frequency Error", "VSWR", "Ident Status", "Ident Code",
];

function stateLabel(solved: boolean, active: boolean): string {
  if (!active) return "NO ACTIVE SCENARIO";
  return solved ? "SOLVED" : "IN PROGRESS";
}

function createFault(kind: Dme1119aScenarioFault["kind"], id: string): Dme1119aScenarioFault {
  if (kind === "tx-power-loss") return { id, kind, transmitter: "tx1", lossDb: 0 };
  if (kind === "reply-delay-drift" || kind === "pulse-spacing-drift") return { id, kind, transmitter: "tx1", driftUs: 0 };
  if (kind === "tx-frequency-error") return { id, kind, transmitter: "tx1", ppm: 0 };
  if (kind === "hpa-fault" || kind === "rtc-comm-fault") return { id, kind, transmitter: "tx1", active: true };
  if (kind === "antenna-vswr") return { id, kind, transmitter: "tx1", ratio: 4 };
  if (kind === "monitor-offset") return { id, kind, monitor: 1, measurement: "integral", parameter: "Delay Offset", value: 0 };
  if (kind === "ident-signal") return { id, kind, state: "missing" };
  if (kind === "temperature") return { id, kind, sensor: "Cabinet Temperature", celsius: 45 };
  return { id, kind: "ac-power", failed: true };
}

function createCriterion(kind: Dme1119aScenarioCriterion["kind"], id: string): Dme1119aScenarioCriterion {
  if (kind === "monitor-normal") return { id, kind, monitor: "integral" };
  if (kind === "monitor-alarm-clear") return { id, kind, severity: "both" };
  if (kind === "active-transmitter") return { id, kind, expected: "any" };
  if (kind === "active-path-healthy") return { id, kind };
  if (kind === "parameter-status") return { id, kind, monitor: "integral", parameter: "Tx Power", expected: "normal" };
  if (kind === "rtc-overload-clear") return { id, kind, transmitter: "active" };
  if (kind === "bypass-cleared") return { id, kind, monitor: "both" };
  if (kind === "ident-normal") return { id, kind };
  if (kind === "fan-control") return { id, kind, expected: "On" };
  return { id, kind: "ac-power-normal" };
}

function ScenarioNumberField({
  field,
  value,
  onChange,
  onError,
}: {
  field: DmeParameterFieldDefinition;
  value: DmeParameterValue;
  onChange: (value: DmeParameterValue) => void;
  onError: (message: string) => void;
}) {
  const [text, setText] = useState(String(value ?? ""));
  const [editing, setEditing] = useState(false);
  const committed = String(value ?? "");

  function commit() {
    const next = parseDmeParameterInput(field, text);
    const error = validateDmeParameterField(field, next);
    if (error) {
      onError(`${field.label}: ${error}`);
      setText(committed);
      return;
    }
    onChange(next);
  }

  return <input
    id={`dme-scenario-${field.id.replace(/[^A-Za-z0-9_-]/g, "-")}`}
    type="number"
    min={field.min}
    max={field.max}
    step={field.step ?? "any"}
    value={editing ? text : committed}
    onFocus={() => { setText(committed); setEditing(true); }}
    onChange={(event) => setText(event.target.value)}
    onBlur={() => { commit(); setEditing(false); }}
    onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
  />;
}

function ScenarioConfigField({
  field,
  scenario,
  onScenarioChange,
  onError,
}: {
  field: DmeParameterFieldDefinition;
  scenario: Dme1119aScenarioDefinition;
  onScenarioChange: (next: Dme1119aScenarioDefinition) => void;
  onError: (message: string) => void;
}) {
  const runtime = useMemo(() => hydrateDme1119aData(scenario.configuration), [scenario.configuration]);
  const value = getDmeParameterValue(runtime, field.id);
  const update = (nextValue: DmeParameterValue) => {
    const error = validateDmeParameterField(field, nextValue);
    if (error) {
      onError(`${field.label}: ${error}`);
      return;
    }
    const nextRuntime = setDmeParameterValue(runtime, field.id, nextValue);
    onScenarioChange({ ...structuredClone(scenario), configuration: extractDme1119aConfig(nextRuntime) });
  };

  return <label className="pmdt-config-field" htmlFor={`dme-scenario-${field.id.replace(/[^A-Za-z0-9_-]/g, "-")}`}>
    <span className="pmdt-config-field-label" title={field.description}>{field.label}</span>
    <span className="pmdt-config-field-control">
      {field.type === "boolean" ? <input
        id={`dme-scenario-${field.id.replace(/[^A-Za-z0-9_-]/g, "-")}`}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => update(event.target.checked)}
      /> : null}
      {field.type === "select" ? <select
        id={`dme-scenario-${field.id.replace(/[^A-Za-z0-9_-]/g, "-")}`}
        value={String(value ?? "")}
        onChange={(event) => update(event.target.value)}
      >{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : null}
      {field.type === "text" ? <input
        id={`dme-scenario-${field.id.replace(/[^A-Za-z0-9_-]/g, "-")}`}
        type="text"
        value={String(value ?? "")}
        onChange={(event) => update(event.target.value)}
      /> : null}
      {field.type === "number" ? <ScenarioNumberField field={field} value={value} onChange={update} onError={onError} /> : null}
      {field.unit ? <small>{field.unit}</small> : null}
    </span>
  </label>;
}

function FaultEditor({
  fault,
  onChange,
  onRemove,
}: {
  fault: Dme1119aScenarioFault;
  onChange: (mutate: (next: Dme1119aScenarioFault) => void) => void;
  onRemove: () => void;
}) {
  const number = (value: number | undefined) => String(value ?? 0);
  return <div className="dme1119a-scenario-row">
    <label><span>ID</span><input value={fault.id} onChange={(event) => onChange((next) => { next.id = event.target.value; })} /></label>
    <label><span>Fault</span><select value={fault.kind} onChange={(event) => onChange((next) => Object.assign(next, createFault(event.target.value as Dme1119aScenarioFault["kind"], fault.id)))}>
      {faultKinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    {"transmitter" in fault ? <label><span>TX</span><select value={fault.transmitter} onChange={(event) => onChange((next) => { if ("transmitter" in next) next.transmitter = event.target.value as "tx1" | "tx2"; })}><option value="tx1">TX1</option><option value="tx2">TX2</option></select></label> : null}
    {fault.kind === "tx-power-loss" ? <label><span>Loss (dB)</span><input type="number" min={0} max={60} step="0.1" value={number(fault.lossDb)} onChange={(event) => onChange((next) => { if (next.kind === fault.kind) next.lossDb = Number(event.target.value); })} /></label> : null}
    {fault.kind === "reply-delay-drift" || fault.kind === "pulse-spacing-drift" ? <label><span>Drift (us)</span><input type="number" min={-100} max={100} step="0.01" value={number(fault.driftUs)} onChange={(event) => onChange((next) => { if (next.kind === fault.kind) next.driftUs = Number(event.target.value); })} /></label> : null}
    {fault.kind === "tx-frequency-error" ? <label><span>Error (ppm)</span><input type="number" min={-10000} max={10000} step="0.1" value={number(fault.ppm)} onChange={(event) => onChange((next) => { if (next.kind === fault.kind) next.ppm = Number(event.target.value); })} /></label> : null}
    {fault.kind === "hpa-fault" || fault.kind === "rtc-comm-fault" ? <label><input type="checkbox" checked={fault.active} onChange={(event) => onChange((next) => { if (next.kind === fault.kind) next.active = event.target.checked; })} /> Active</label> : null}
    {fault.kind === "antenna-vswr" ? <label><span>Ratio</span><input type="number" min={1} max={100} step="0.1" value={number(fault.ratio)} onChange={(event) => onChange((next) => { if (next.kind === fault.kind) next.ratio = Number(event.target.value); })} /></label> : null}
    {fault.kind === "monitor-offset" ? <>
      <label><span>Monitor</span><select value={fault.monitor} onChange={(event) => onChange((next) => { if (next.kind === fault.kind) next.monitor = Number(event.target.value) as 1 | 2; })}><option value={1}>Monitor 1</option><option value={2}>Monitor 2</option></select></label>
      <label><span>Measurement</span><select value={fault.measurement} onChange={(event) => onChange((next) => { if (next.kind === fault.kind) next.measurement = event.target.value as "integral" | "standby"; })}><option value="integral">Integral</option><option value="standby">Standby</option></select></label>
      <label><span>Parameter</span><input value={fault.parameter} onChange={(event) => onChange((next) => { if (next.kind === fault.kind) next.parameter = event.target.value; })} /></label>
      <label><span>Offset</span><input type="number" step="0.01" value={fault.value} onChange={(event) => onChange((next) => { if (next.kind === fault.kind) next.value = Number(event.target.value); })} /></label>
    </> : null}
    {fault.kind === "ident-signal" ? <label><span>State</span><select value={fault.state} onChange={(event) => onChange((next) => { if (next.kind === fault.kind) next.state = event.target.value as "normal" | "missing" | "continuous"; })}><option value="normal">Normal</option><option value="missing">Missing</option><option value="continuous">Continuous</option></select></label> : null}
    {fault.kind === "temperature" ? <><label><span>Sensor</span><select value={fault.sensor} onChange={(event) => onChange((next) => { if (next.kind === fault.kind) next.sensor = event.target.value; })}>{DME1119A_TEMPERATURE_SENSORS.map((sensor) => <option key={sensor} value={sensor}>{sensor}</option>)}</select></label><label><span>°C</span><input type="number" min={-80} max={150} step="0.1" value={fault.celsius} onChange={(event) => onChange((next) => { if (next.kind === fault.kind) next.celsius = Number(event.target.value); })} /></label></> : null}
    {fault.kind === "ac-power" ? <label><input type="checkbox" checked={fault.failed} onChange={(event) => onChange((next) => { if (next.kind === fault.kind) next.failed = event.target.checked; })} /> Failed</label> : null}
    <button type="button" onClick={onRemove} aria-label={`Remove fault ${fault.id}`}>Remove</button>
  </div>;
}

function CriterionEditor({
  criterion,
  onChange,
  onRemove,
}: {
  criterion: Dme1119aScenarioCriterion;
  onChange: (mutate: (next: Dme1119aScenarioCriterion) => void) => void;
  onRemove: () => void;
}) {
  return <div className="dme1119a-scenario-row">
    <label><span>ID</span><input value={criterion.id} onChange={(event) => onChange((next) => { next.id = event.target.value; })} /></label>
    <label><span>Criterion</span><select value={criterion.kind} onChange={(event) => onChange((next) => Object.assign(next, createCriterion(event.target.value as Dme1119aScenarioCriterion["kind"], criterion.id)))}>
      {criterionKinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    {criterion.kind === "monitor-normal" || criterion.kind === "bypass-cleared" ? <label><span>Monitor</span><select value={criterion.monitor} onChange={(event) => onChange((next) => { if (next.kind === "monitor-normal") next.monitor = event.target.value as "integral" | "standby"; if (next.kind === "bypass-cleared") next.monitor = event.target.value as "integral" | "standby" | "both"; })}><option value="integral">Integral</option><option value="standby">Standby</option>{criterion.kind === "bypass-cleared" ? <option value="both">Both</option> : null}</select></label> : null}
    {criterion.kind === "monitor-alarm-clear" ? <label><span>Severity</span><select value={criterion.severity} onChange={(event) => onChange((next) => { if (next.kind === criterion.kind) next.severity = event.target.value as "primary" | "secondary" | "both"; })}><option value="both">Both</option><option value="primary">Primary</option><option value="secondary">Secondary</option></select></label> : null}
    {criterion.kind === "active-transmitter" ? <label><span>Expected</span><select value={criterion.expected} onChange={(event) => onChange((next) => { if (next.kind === criterion.kind) next.expected = event.target.value as "any" | "tx1" | "tx2"; })}><option value="any">Any</option><option value="tx1">TX1</option><option value="tx2">TX2</option></select></label> : null}
    {criterion.kind === "parameter-status" ? <><label><span>Monitor</span><select value={criterion.monitor} onChange={(event) => onChange((next) => { if (next.kind === criterion.kind) next.monitor = event.target.value as "integral" | "standby"; })}><option value="integral">Integral</option><option value="standby">Standby</option></select></label><label><span>Parameter</span><select value={criterion.parameter} onChange={(event) => onChange((next) => { if (next.kind === criterion.kind) next.parameter = event.target.value; })}>{monitorParameterOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Expected</span><select value={criterion.expected} onChange={(event) => onChange((next) => { if (next.kind === criterion.kind) next.expected = event.target.value as "normal" | "warning" | "alarm"; })}><option value="normal">Normal</option><option value="warning">Warning</option><option value="alarm">Alarm</option></select></label></> : null}
    {criterion.kind === "rtc-overload-clear" ? <label><span>Transmitter</span><select value={criterion.transmitter} onChange={(event) => onChange((next) => { if (next.kind === criterion.kind) next.transmitter = event.target.value as "active" | "both" | "tx1" | "tx2"; })}><option value="active">Active</option><option value="both">Both</option><option value="tx1">TX1</option><option value="tx2">TX2</option></select></label> : null}
    {criterion.kind === "fan-control" ? <label><span>Expected</span><select value={criterion.expected} onChange={(event) => onChange((next) => { if (next.kind === criterion.kind) next.expected = event.target.value as "Automatic" | "On" | "Off"; })}><option value="On">On</option><option value="Automatic">Automatic</option><option value="Off">Off</option></select></label> : null}
    <button type="button" onClick={onRemove} aria-label={`Remove criterion ${criterion.id}`}>Remove</button>
  </div>;
}

export function Dme1119aScenarioParametersPanel() {
  const setOpen = useDmePmdtStore((state) => state.setScenarioParametersOpen);
  const scenario = useDmePmdtStore((state) => state.scenario);
  const scenarioDraft = useDmePmdtStore((state) => state.scenarioDraft);
  const data = useDmePmdtStore((state) => state.data);
  const replaceScenarioDraft = useDmePmdtStore((state) => state.replaceScenarioDraft);
  const applyScenario = useDmePmdtStore((state) => state.applyScenario);
  const restoreScenario = useDmePmdtStore((state) => state.restoreScenario);
  const endScenario = useDmePmdtStore((state) => state.endScenario);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fields = dmeParameterFieldCatalog.filter((field) => (
    !field.readOnly
    && !field.id.startsWith("simulation.")
    && !field.id.startsWith("securityAccounts.")
    && !["connected", "local", "alert", "timestamp"].includes(field.id)
  ));
  const sections = Array.from(new Set(fields.map((field) => field.section)));
  const validationIssues = useMemo(() => validateDme1119aScenarioDefinition(scenarioDraft), [scenarioDraft]);
  const preview = useMemo(() => {
    if (validationIssues.length > 0) return null;
    try { return previewDme1119aScenario(scenarioDraft); } catch { return null; }
  }, [scenarioDraft, validationIssues.length]);
  const previewEvaluation = preview
    ? evaluateDme1119aScenario({ active: true, definition: scenarioDraft, startedAt: null }, preview.data)
    : null;
  const evaluation = evaluateDme1119aScenario(scenario, data);
  const previewPower = preview?.data.integralData.find((row) => row.label === "Tx Power");
  const previewDelay = preview?.data.integralData.find((row) => row.label === "Delay");
  const previewVswr = preview?.data.integralData.find((row) => row.label === "VSWR");

  const update = (mutate: (next: Dme1119aScenarioDefinition) => void) => {
    const next = structuredClone(scenarioDraft);
    mutate(next);
    replaceScenarioDraft(next);
  };

  function selectPreset(presetId: string) {
    const preset = DME1119A_BUILT_IN_SCENARIOS.find((item) => item.id === presetId);
    if (!preset) return;
    replaceScenarioDraft(preset.create());
    setMessage(`Loaded preset: ${preset.label}`);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(scenarioDraft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${scenarioDraft.id.trim() || "dme-1119a-scenario"}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setMessage("Scenario JSON exported.");
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = parseDme1119aScenarioDefinition(JSON.parse(await file.text()));
      if (!parsed) throw new Error("Invalid DME 1119A scenario JSON.");
      replaceScenarioDraft(parsed);
      setMessage(`Imported scenario: ${parsed.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Scenario import failed.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  function handleApply() {
    if (applyScenario()) setMessage(`Scenario applied: ${scenarioDraft.name}`);
  }

  return <aside className="pmdt-config-panel dme1119a-scenario-parameters-panel" aria-label="DME 1119A scenario parameters">
    <header className="pmdt-config-panel-header">
      <strong>DME 1119A Scenario Parameters</strong>
      <button type="button" title="Close" aria-label="Close scenario parameters" onClick={() => setOpen(false)}><X aria-hidden size={13} weight="bold" /></button>
    </header>
    <div className="pmdt-config-summary dme1119a-scenario-summary">
      <span>Status: <b>{stateLabel(evaluation.solved, scenario.active)}</b></span>
      {scenario.active ? <span>Active baseline: <b>{scenario.definition?.name}</b></span> : <span>Draft is not active</span>}
      {scenario.active ? <span>Checks: <b>{evaluation.checks.filter((check) => check.passed).length}/{evaluation.checks.length}</b></span> : null}
      {evaluation.blockers.length > 0 ? <span className="pmdt-config-summary-warning">{evaluation.blockers[0]}</span> : null}
      {scenario.active ? <div className="dme1119a-scenario-check-list" aria-label="Scenario check results">{evaluation.checks.map((check) => <span key={check.id} data-passed={check.passed}>{check.passed ? "✓" : "✕"} {check.label}: {check.detail}</span>)}</div> : null}
    </div>
    <div className="pmdt-config-panel-body dme1119a-scenario-panel-body">
      <section className="dme1119a-scenario-section" aria-label="Scenario definition">
        <div className="dme1119a-scenario-action-row">
          <label>Preset <select defaultValue="" onChange={(event) => { selectPreset(event.target.value); event.currentTarget.value = ""; }}><option value="" disabled>Load built-in scenario…</option>{DME1119A_BUILT_IN_SCENARIOS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
          <button type="button" onClick={handleExport}>Export JSON</button>
          <button type="button" onClick={() => importInputRef.current?.click()}>Import JSON</button>
          <input ref={importInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void handleImport(event.currentTarget.files?.[0])} />
        </div>
        <label><span>ID</span><input value={scenarioDraft.id} onChange={(event) => update((next) => { next.id = event.target.value; })} /></label>
        <label><span>Name</span><input value={scenarioDraft.name} onChange={(event) => update((next) => { next.name = event.target.value; })} /></label>
        <label><span>Difficulty</span><select value={scenarioDraft.difficulty} onChange={(event) => update((next) => { next.difficulty = event.target.value as Dme1119aScenarioDefinition["difficulty"]; })}><option value="basic">Basic</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
        <label><span>Description</span><textarea value={scenarioDraft.description} onChange={(event) => update((next) => { next.description = event.target.value; })} /></label>
      </section>

      <section className="dme1119a-scenario-section" aria-label="Starting policy">
        <strong>Starting policy</strong>
        <label><span>Main transmitter</span><select value={scenarioDraft.startPolicy.mainTransmitterId} onChange={(event) => update((next) => { next.startPolicy.mainTransmitterId = event.target.value as "tx1" | "tx2"; })}><option value="tx1">TX1</option><option value="tx2">TX2</option></select></label>
        <label><input type="checkbox" checked={scenarioDraft.startPolicy.startLocal} onChange={(event) => update((next) => { next.startPolicy.startLocal = event.target.checked; })} /> Start Local</label>
        <label><input type="checkbox" checked={scenarioDraft.startPolicy.integralMonitorBypassed} onChange={(event) => update((next) => { next.startPolicy.integralMonitorBypassed = event.target.checked; })} /> Integral monitor bypass</label>
        <label><input type="checkbox" checked={scenarioDraft.startPolicy.standbyMonitorBypassed} onChange={(event) => update((next) => { next.startPolicy.standbyMonitorBypassed = event.target.checked; })} /> Standby monitor bypass</label>
        <label><span>Ident mode</span><select value={scenarioDraft.startPolicy.identMode} onChange={(event) => update((next) => { next.startPolicy.identMode = event.target.value as "normal" | "off" | "continuous"; })}><option value="normal">Normal</option><option value="off">Off</option><option value="continuous">Continuous</option></select></label>
      </section>

      {scenarioDraft.diagnosis ? <section className="dme1119a-scenario-section" aria-label="Two-stage diagnostic workflow">
        <strong>Two-stage diagnostic workflow</strong>
        <p>{scenarioDraft.diagnosis.faultSummary}</p>
        <span><b>PMDT result:</b> {scenarioDraft.diagnosis.diagnosticResult}</span>
        <span><b>Disposition:</b> {scenarioDraft.diagnosis.disposition === "replace-module" ? "Replace module/card" : "Software adjustment only"}</span>
        <span><b>Diagnostic run:</b> {scenarioDraft.diagnosis.diagnosticRun}</span>
        <ol className="dme1119a-scenario-checkpoint-list">{scenarioDraft.diagnosis.pmdtCheckpoints.map((checkpoint) => <li key={checkpoint.id}>{checkpoint.label}</li>)}</ol>
        <span><b>Hardware answer:</b> {scenarioDraft.diagnosis.expectedHardware.length > 0 ? scenarioDraft.diagnosis.expectedHardware.map((target) => target.assemblyId ?? target.diagramOccurrenceId).join(", ") : "No replacement"}</span>
        <span><b>Manual:</b> {scenarioDraft.diagnosis.manualReferences.join(" · ")}</span>
      </section> : null}

      <section className="dme1119a-scenario-section" aria-label="Fault injection editor">
        <div className="dme1119a-scenario-section-heading"><strong>Fault injection editor</strong><button type="button" onClick={() => update((next) => { next.faultInjections.push(createFault("tx-power-loss", `fault-${next.faultInjections.length + 1}`)); })}>Add fault</button></div>
        {scenarioDraft.faultInjections.length === 0 ? <p className="pmdt-config-empty">No physical fault injected. Use the configuration editor for baseline changes.</p> : scenarioDraft.faultInjections.map((fault, index) => <FaultEditor key={fault.id || index} fault={fault} onChange={(mutate) => update((next) => { mutate(next.faultInjections[index]); })} onRemove={() => update((next) => { next.faultInjections.splice(index, 1); })} />)}
      </section>

      <section className="dme1119a-scenario-section" aria-label="Success criteria editor">
        <div className="dme1119a-scenario-section-heading"><strong>Success criteria</strong><button type="button" onClick={() => update((next) => { next.successCriteria.push(createCriterion("monitor-normal", `criterion-${next.successCriteria.length + 1}`)); })}>Add criterion</button></div>
        {scenarioDraft.successCriteria.map((criterion, index) => <CriterionEditor key={criterion.id || index} criterion={criterion} onChange={(mutate) => update((next) => { mutate(next.successCriteria[index]); })} onRemove={() => update((next) => { next.successCriteria.splice(index, 1); })} />)}
      </section>

      <section className="dme1119a-scenario-section" aria-label="Student recovery controls">
        <strong>Student recovery field whitelist</strong>
        <p>Only checked configuration fields can be changed by the student while this scenario is active. Alarm limits, voting, transfer and calibration stay protected by default.</p>
        {sections.map((section) => <details key={section} className="pmdt-config-section"><summary>{section}</summary><div className="pmdt-config-section-body">{fields.filter((field) => field.section === section).map((field) => <label key={field.id}><input type="checkbox" checked={scenarioDraft.studentEditableFieldIds.includes(field.id)} onChange={(event) => update((next) => { next.studentEditableFieldIds = event.target.checked ? [...next.studentEditableFieldIds, field.id] : next.studentEditableFieldIds.filter((id) => id !== field.id); })} /> {field.label}</label>)}</div></details>)}
      </section>

      <section className="dme1119a-scenario-preview" aria-label="Scenario preview">
        <strong>Preview from TST</strong>
        <span>Active TX: <b>TX{preview?.data.monitorTransmitterStatus.antennaSelect ?? "--"}</b></span>
        <span>Delay: <b>{previewDelay?.mon1Value ?? "--"} {previewDelay?.unit ?? ""}</b></span>
        <span>Tx Power: <b>{previewPower?.mon1Value ?? "--"} {previewPower?.unit ?? ""}</b></span>
        <span>VSWR: <b>{previewVswr?.mon1Value ?? "--"} {previewVswr?.unit ?? ""}</b></span>
        <span>Monitor state: <b>{preview?.data.monitors.integral.normal ? "NORMAL" : "ALARM"}</b></span>
        {previewEvaluation && !previewEvaluation.correctable ? <span className="pmdt-config-summary-warning">Scenario may be uncorrectable with the configured student controls.</span> : null}
      </section>

      <section className="dme1119a-scenario-section" aria-label="Scenario configuration parameters">
        <strong>Scenario configuration</strong>
        <p>Values are applied to a session-only TST baseline and never overwrite the persistent DME profile.</p>
        {sections.map((section) => <details key={section} className="pmdt-config-section" open={section === "Channel assignment" || section === "Station equipment" || section === "Transmitter nominal"}><summary>{section}</summary><div className="pmdt-config-section-body">{fields.filter((field) => field.section === section).map((field) => <ScenarioConfigField key={field.id} field={field} scenario={scenarioDraft} onScenarioChange={replaceScenarioDraft} onError={setMessage} />)}</div></details>)}
      </section>
    </div>
    <p className={validationIssues.length > 0 || Boolean(previewEvaluation?.solved) ? "dme1119a-scenario-message dme1119a-scenario-message--error" : "dme1119a-scenario-message"} role={validationIssues.length > 0 || Boolean(previewEvaluation?.solved) ? "alert" : "status"}>{message ?? (validationIssues[0] ?? (previewEvaluation?.solved ? "Starting state is already solved; add a fault or change the success criteria before Apply." : "Scenario is structurally valid. Review the preview, then Apply Scenario."))}</p>
    <footer className="pmdt-config-panel-footer dme1119a-scenario-footer">
      <button type="button" disabled={!scenario.active} onClick={() => restoreScenario()}>Restore Scenario</button>
      <button type="button" disabled={!scenario.active} onClick={() => endScenario()}>End / Restore TST</button>
      <button type="button" disabled={validationIssues.length > 0 || Boolean(previewEvaluation?.solved)} onClick={handleApply}>Apply Scenario</button>
      <button type="button" onClick={() => setOpen(false)}>Close</button>
    </footer>
  </aside>;
}
