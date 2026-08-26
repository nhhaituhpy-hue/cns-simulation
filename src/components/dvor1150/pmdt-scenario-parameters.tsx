"use client";

import { X } from "@phosphor-icons/react/dist/csr/X";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  dvor1150ConfigFieldCatalog,
  getDvor1150ConfigValue,
  parseDvor1150ConfigInput,
  parseDvor1150ScenarioDefinition,
  previewDvor1150Scenario,
  setDvor1150ConfigValue,
  validateDvor1150ConfigField,
  validateDvor1150ScenarioDefinition,
  DVOR1150_BUILT_IN_SCENARIOS,
  evaluateDvor1150Scenario,
  type Dvor1150ConfigFieldDefinition,
  type Dvor1150ConfigValue,
  type Dvor1150ScenarioDefinition,
} from "@/lib/dvor1150";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

function ScenarioNumberField({
  field,
  value,
  onChange,
  onError,
}: {
  field: Dvor1150ConfigFieldDefinition;
  value: Dvor1150ConfigValue;
  onChange: (value: Dvor1150ConfigValue) => void;
  onError: (message: string) => void;
}) {
  const [text, setText] = useState(String(value ?? ""));

  useEffect(() => setText(String(value ?? "")), [value]);

  function commit() {
    const nextValue = parseDvor1150ConfigInput(field, text);
    const error = validateDvor1150ConfigField(field, nextValue);
    if (error) {
      onError(`${field.label}: ${error}`);
      setText(String(value ?? ""));
      return;
    }
    onChange(nextValue);
  }

  return <input
    id={`scenario-${field.id}`}
    type="number"
    min={field.min}
    max={field.max}
    step={field.step ?? "any"}
    value={text}
    onChange={(event) => setText(event.target.value)}
    onBlur={commit}
    onKeyDown={(event) => {
      if (event.key === "Enter") event.currentTarget.blur();
    }}
    aria-describedby={field.description ? `scenario-${field.id}-description` : undefined}
  />;
}

function ScenarioConfigField({
  field,
  scenario,
  onScenarioChange,
  onError,
}: {
  field: Dvor1150ConfigFieldDefinition;
  scenario: Dvor1150ScenarioDefinition;
  onScenarioChange: (next: Dvor1150ScenarioDefinition) => void;
  onError: (message: string) => void;
}) {
  const value = getDvor1150ConfigValue(scenario.configuration, field.id);
  const update = (nextValue: Dvor1150ConfigValue) => {
    const error = validateDvor1150ConfigField(field, nextValue);
    if (error) {
      onError(`${field.label}: ${error}`);
      return;
    }
    const next = structuredClone(scenario);
    next.configuration = setDvor1150ConfigValue(next.configuration, field.id, nextValue);
    onScenarioChange(next);
  };

  return <label className="pmdt-config-field" htmlFor={`scenario-${field.id}`}>
    <span className="pmdt-config-field-label" title={field.description}>{field.label}</span>
    <span className="pmdt-config-field-control">
      {field.type === "boolean" ? <input
        id={`scenario-${field.id}`}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => update(event.target.checked)}
      /> : null}
      {field.type === "select" ? <select
        id={`scenario-${field.id}`}
        value={String(value ?? "")}
        onChange={(event) => update(event.target.value)}
      >
        {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
      </select> : null}
      {field.type === "text" ? <input
        id={`scenario-${field.id}`}
        type="text"
        value={String(value ?? "")}
        onChange={(event) => update(event.target.value)}
      /> : null}
      {field.type === "number" ? <ScenarioNumberField field={field} value={value} onChange={update} onError={onError} /> : null}
      {field.unit ? <small>{field.unit}</small> : null}
    </span>
    {field.description ? <span id={`scenario-${field.id}-description`} className="sr-only">{field.description}</span> : null}
  </label>;
}

function statusLabel(solved: boolean, active: boolean) {
  if (!active) return "No active scenario";
  return solved ? "SOLVED" : "IN PROGRESS";
}

export function Dvor1150ScenarioParametersPanel() {
  const setOpen = useDvor1150PmdtStore((state) => state.setScenarioParametersOpen);
  const scenario = useDvor1150PmdtStore((state) => state.scenario);
  const scenarioDraft = useDvor1150PmdtStore((state) => state.scenarioDraft);
  const derived = useDvor1150PmdtStore((state) => state.derived);
  const config = useDvor1150PmdtStore((state) => state.config);
  const replaceScenarioDraft = useDvor1150PmdtStore((state) => state.replaceScenarioDraft);
  const applyScenario = useDvor1150PmdtStore((state) => state.applyScenario);
  const restoreScenario = useDvor1150PmdtStore((state) => state.restoreScenario);
  const endScenario = useDvor1150PmdtStore((state) => state.endScenario);
  const [message, setMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const validationIssues = useMemo(
    () => validateDvor1150ScenarioDefinition(scenarioDraft),
    [scenarioDraft],
  );
  const preview = useMemo(() => {
    if (validationIssues.length > 0) return null;
    try {
      return previewDvor1150Scenario(scenarioDraft);
    } catch {
      return null;
    }
  }, [scenarioDraft, validationIssues.length]);
  const activeEvaluation = evaluateDvor1150Scenario(scenario, derived, config);
  const previewEvaluation = preview
    ? evaluateDvor1150Scenario({ active: true, definition: scenarioDraft, startedAt: null }, preview.snapshot, preview.config)
    : null;
  const fields = dvor1150ConfigFieldCatalog;
  const sections = Array.from(new Set(fields.map((field) => field.section)));

  function update(mutator: (next: Dvor1150ScenarioDefinition) => void) {
    const next = structuredClone(scenarioDraft);
    mutator(next);
    replaceScenarioDraft(next);
  }

  function handleApply() {
    if (validationIssues.length > 0) {
      setMessage(validationIssues[0]);
      return;
    }
    const applied = applyScenario();
    setMessage(applied
      ? `Scenario applied: ${scenarioDraft.name}. Student corrections are session-only.`
      : "Scenario could not be applied.");
  }

  function handleRestore() {
    const restored = restoreScenario();
    setMessage(restored ? "Scenario restored to its original baseline." : "No active scenario to restore.");
  }

  function handleEnd() {
    const ended = endScenario();
    setMessage(ended ? "Scenario ended. Đài TEST/TST defaults restored." : "No active scenario to end.");
  }

  function exportScenario() {
    const blob = new Blob([JSON.stringify(scenarioDraft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${scenarioDraft.id.trim() || "dvor1150-scenario"}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setMessage("Scenario JSON exported.");
  }

  async function importScenario(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const imported = parseDvor1150ScenarioDefinition(JSON.parse(await file.text()));
      if (!imported) throw new Error("The file does not match the DVOR 1150 scenario schema.");
      replaceScenarioDraft(imported);
      setMessage(`Imported scenario: ${imported.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Scenario JSON could not be imported.");
    }
  }

  return <aside className="pmdt-config-panel dvor1150-scenario-parameters-panel" aria-label="DVOR 1150 scenario parameters">
    <header className="pmdt-config-panel-header">
      <strong>Scenario Parameters...</strong>
      <button type="button" title="Close" aria-label="Close scenario parameters" onClick={() => setOpen(false)}><X aria-hidden size={13} weight="bold" /></button>
    </header>
    <div className="pmdt-config-summary dvor1150-scenario-summary">
      <span><b>SESSION:</b> {scenario.active ? `Active: ${scenario.definition?.name}` : "No active scenario"}</span>
      <span><b>LIVE RESULT:</b> {statusLabel(activeEvaluation.solved, scenario.active)}</span>
      <span><b>PREVIEW:</b> {preview ? (previewEvaluation?.solved ? "SOLVED" : "IN PROGRESS") : "INVALID"}</span>
      <span>Session-only · Reset restores scenario baseline · End restores TST</span>
    </div>
    <div className="pmdt-config-panel-body dvor1150-scenario-panel-body">
      <section className="dvor1150-scenario-overview" aria-label="Scenario definition">
        <div className="dvor1150-scenario-action-row">
          <label>Template
            <select value="" onChange={(event) => {
              const preset = DVOR1150_BUILT_IN_SCENARIOS.find((item) => item.id === event.target.value);
              if (preset) {
                replaceScenarioDraft(preset.create());
                setMessage(`Loaded template: ${preset.label}.`);
              }
            }}>
              <option value="">Select built-in scenario...</option>
              {DVOR1150_BUILT_IN_SCENARIOS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <button type="button" onClick={exportScenario}>Export JSON</button>
          <button type="button" onClick={() => importInputRef.current?.click()}>Import JSON</button>
          <input ref={importInputRef} type="file" accept="application/json,.json" onChange={importScenario} hidden />
        </div>
        <label>Scenario ID<input value={scenarioDraft.id} onChange={(event) => update((next) => { next.id = event.target.value; })} /></label>
        <label>Name<input value={scenarioDraft.name} onChange={(event) => update((next) => { next.name = event.target.value; })} /></label>
        <label>Difficulty<select value={scenarioDraft.difficulty} onChange={(event) => update((next) => { next.difficulty = event.target.value as Dvor1150ScenarioDefinition["difficulty"]; })}>
          <option value="basic">Basic</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </select></label>
        <label>Description<textarea value={scenarioDraft.description} onChange={(event) => update((next) => { next.description = event.target.value; })} /></label>
      </section>

      <section className="dvor1150-scenario-policy" aria-label="Starting policy and success criteria">
        <strong>Starting state</strong>
        <label>Main transmitter<select value={scenarioDraft.startPolicy.mainTransmitterId} onChange={(event) => update((next) => { next.startPolicy.mainTransmitterId = event.target.value as "tx1" | "tx2"; })}><option value="tx1">TX1</option><option value="tx2">TX2</option></select></label>
        <label><input type="checkbox" checked={scenarioDraft.startPolicy.startLocal} onChange={(event) => update((next) => { next.startPolicy.startLocal = event.target.checked; })} /> Start in Local mode</label>
        <label><input type="checkbox" checked={scenarioDraft.startPolicy.startMonitorBypassed} onChange={(event) => update((next) => { next.startPolicy.startMonitorBypassed = event.target.checked; })} /> Start with Monitor Bypass</label>
        <strong>Pass criteria</strong>
        <label><input type="checkbox" checked={scenarioDraft.successCriteria.requireIntegralMonitorNormal} onChange={(event) => update((next) => { next.successCriteria.requireIntegralMonitorNormal = event.target.checked; })} /> Integral Monitor Normal</label>
        <label><input type="checkbox" checked={scenarioDraft.successCriteria.requireActiveTransmitter} onChange={(event) => update((next) => { next.successCriteria.requireActiveTransmitter = event.target.checked; })} /> Active transmitter on antenna</label>
        <label><input type="checkbox" checked={scenarioDraft.successCriteria.requireNoVswrExecutiveAlarm} onChange={(event) => update((next) => { next.successCriteria.requireNoVswrExecutiveAlarm = event.target.checked; })} /> No VSWR executive alarm</label>
        <label><input type="checkbox" checked={scenarioDraft.successCriteria.requireMonitorBypassCleared} onChange={(event) => update((next) => { next.successCriteria.requireMonitorBypassCleared = event.target.checked; })} /> Monitor Bypass released</label>
      </section>

      <section className="dvor1150-scenario-policy" aria-label="Student recovery controls">
        <strong>Student recovery controls</strong>
        <p>Only selected physical controls are available to the student. Monitor limits, alarm enablement, offsets, and calibration stay protected.</p>
        {sections.map((section) => <details key={`student-controls-${section}`} className="pmdt-config-section">
          <summary>{section}</summary>
          <div className="pmdt-config-section-body">
            {fields.filter((field) => field.section === section).map((field) => <label key={field.id}>
              <input
                type="checkbox"
                checked={scenarioDraft.studentEditableFieldIds.includes(field.id)}
                onChange={(event) => update((next) => {
                  next.studentEditableFieldIds = event.target.checked
                    ? [...next.studentEditableFieldIds, field.id]
                    : next.studentEditableFieldIds.filter((id) => id !== field.id);
                })}
              /> {field.label}
            </label>)}
          </div>
        </details>)}
      </section>

      <section className="dvor1150-scenario-preview" aria-label="Scenario preview">
        <strong>Preview</strong>
        <span>Active TX: <b>{preview?.snapshot.activeTransmitter?.toUpperCase() ?? "NONE"}</b></span>
        <span>Integral Monitor: <b>{preview?.snapshot.data.monitorIntegral.normal ? "NORMAL" : "ALARM"}</b></span>
        <span>VSWR executive: <b>{preview?.snapshot.data.maintenanceAlerts.find((item) => item.label === "Sideband Antenna VSWR")?.indicator === "red" ? "ALARM" : "CLEAR"}</b></span>
      </section>

      <section className="dvor1150-scenario-configurations" aria-label="Scenario configuration parameters">
        <strong>Scenario configuration</strong>
        <p>These values become the student&apos;s starting state. They are not saved to the normal DVOR 1150 configuration profile.</p>
        {sections.map((section) => <details key={section} className="pmdt-config-section" open={section === "Station" || section === "Transmitter Nominal" || section === "Monitor General"}>
          <summary>{section}</summary>
          <div className="pmdt-config-section-body">
            {fields.filter((field) => field.section === section).map((field) => <ScenarioConfigField
              key={field.id}
              field={field}
              scenario={scenarioDraft}
              onScenarioChange={replaceScenarioDraft}
              onError={setMessage}
            />)}
          </div>
        </details>)}
      </section>
    </div>
    <p className={validationIssues.length > 0 ? "dvor1150-scenario-message dvor1150-scenario-message--error" : "dvor1150-scenario-message"} role={validationIssues.length > 0 ? "alert" : "status"}>
      {message ?? (validationIssues[0] ?? "Scenario is structurally valid. Review the preview, then Apply Scenario.")}
    </p>
    <footer className="pmdt-config-panel-footer dvor1150-scenario-footer">
      <button type="button" disabled={!scenario.active} onClick={handleRestore}>Restore Scenario</button>
      <button type="button" disabled={!scenario.active} onClick={handleEnd}>End / Restore TST</button>
      <button type="button" disabled={validationIssues.length > 0} onClick={handleApply}>Apply Scenario</button>
      <button type="button" onClick={() => setOpen(false)}>Close</button>
    </footer>
  </aside>;
}
