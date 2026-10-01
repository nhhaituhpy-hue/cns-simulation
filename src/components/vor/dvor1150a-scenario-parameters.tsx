"use client";

import { X } from "@phosphor-icons/react/dist/csr/X";
import { useMemo, useRef, useState } from "react";
import {
  DVOR1150A_BUILT_IN_SCENARIOS,
  dvorConfigFieldCatalog,
  evaluateDvor1150aScenario,
  getDvorConfigValue,
  isDvor1150aScenarioStudentEditable,
  parseDvor1150aScenarioDefinition,
  parseDvorConfigInput,
  previewDvor1150aScenario,
  setDvorConfigValue,
  validateDvor1150aScenarioDefinition,
  validateDvorConfigField,
  type Dvor1150aScenarioDefinition,
  type DvorConfigFieldDefinition,
  type DvorConfigValue,
} from "@/lib/dvor1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { dvor1150aScenarioFieldRole } from "@/lib/dvor1150a/scenario";
import { scenarioEditPolicyChange, scenarioEditableFieldChange } from "@/lib/scenario-policy-draft";
import { ScenarioParametersSection, ScenarioCriteriaHelp } from "@/components/scenario/parameters/scenario-parameters-section";
import { ScenarioDiagnosisSection } from "@/components/scenario/parameters/scenario-diagnosis-section";
import { ScenarioEditPolicySection } from "@/components/scenario/parameters/scenario-edit-policy-section";

const criterionLabels: Record<keyof Dvor1150aScenarioDefinition["successCriteria"], string> = {
  requireIntegralMonitorNormal: "Integral Monitor trở về Normal",
  requireActiveTransmitter: "Có máy phát hoạt động trên antenna",
  requireNoSidebandVswrAlarm: "Không còn cảnh báo Sideband VSWR",
  requireMonitorBypassCleared: "Monitor Bypass đã được bỏ",
};

function ScenarioNumberField({
  field,
  value,
  onChange,
  onError,
}: {
  field: DvorConfigFieldDefinition;
  value: DvorConfigValue;
  onChange: (value: DvorConfigValue) => void;
  onError: (message: string) => void;
}) {
  const [text, setText] = useState(String(value ?? ""));
  const [isEditing, setIsEditing] = useState(false);
  const committedValue = String(value ?? "");
  const displayedValue = isEditing ? text : committedValue;

  function commit() {
    const nextValue = parseDvorConfigInput(field, text);
    const error = validateDvorConfigField(field, nextValue);
    if (error) {
      onError(`${field.label}: ${error}`);
      setText(String(value ?? ""));
      return;
    }
    onChange(nextValue);
  }

  return <input
    id={`dvor1150a-scenario-${field.id}`}
    type="number"
    min={field.min}
    max={field.max}
    step={field.step ?? "any"}
    value={displayedValue}
    onFocus={() => {
      setText(committedValue);
      setIsEditing(true);
    }}
    onChange={(event) => setText(event.target.value)}
    onBlur={() => {
      commit();
      setIsEditing(false);
    }}
    onKeyDown={(event) => {
      if (event.key === "Enter") event.currentTarget.blur();
    }}
  />;
}

function ScenarioConfigField({
  field,
  scenario,
  onScenarioChange,
  onError,
}: {
  field: DvorConfigFieldDefinition;
  scenario: Dvor1150aScenarioDefinition;
  onScenarioChange: (next: Dvor1150aScenarioDefinition) => void;
  onError: (message: string) => void;
}) {
  const value = getDvorConfigValue(scenario.configuration, field.id);
  const update = (nextValue: DvorConfigValue) => {
    const error = validateDvorConfigField(field, nextValue);
    if (error) {
      onError(`${field.label}: ${error}`);
      return;
    }
    const next = structuredClone(scenario);
    next.configuration = setDvorConfigValue(next.configuration, field.id, nextValue);
    onScenarioChange(next);
  };

  return <label className="pmdt-config-field" htmlFor={`dvor1150a-scenario-${field.id}`}>
    <span className="pmdt-config-field-label" title={field.description}>{field.label}</span>
    <span className="pmdt-config-field-control">
      {field.type === "boolean" ? <input
        id={`dvor1150a-scenario-${field.id}`}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => update(event.target.checked)}
      /> : null}
      {field.type === "select" ? <select
        id={`dvor1150a-scenario-${field.id}`}
        value={String(value ?? "")}
        onChange={(event) => update(event.target.value)}
      >
        {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
      </select> : null}
      {field.type === "text" ? <input
        id={`dvor1150a-scenario-${field.id}`}
        type="text"
        value={String(value ?? "")}
        onChange={(event) => update(event.target.value)}
      /> : null}
      {field.type === "number" ? <ScenarioNumberField field={field} value={value} onChange={update} onError={onError} /> : null}
      {field.unit ? <small>{field.unit}</small> : null}
    </span>
  </label>;
}

function stateLabel(solved: boolean, active: boolean) {
  if (!active) return "NO ACTIVE SCENARIO";
  return solved ? "SOLVED" : "IN PROGRESS";
}

export function Dvor1150aScenarioParametersPanel() {
  const setOpen = useVorPmdtStore((state) => state.setScenarioParametersOpen);
  const scenario = useVorPmdtStore((state) => state.scenario);
  const scenarioDraft = useVorPmdtStore((state) => state.scenarioDraft);
  const config = useVorPmdtStore((state) => state.config);
  const derived = useVorPmdtStore((state) => state.derived);
  const attemptEvents = useVorPmdtStore((state) => state.attemptEvents);
  const actionHistory = useVorPmdtStore((state) => state.actionHistory);
  const hardwareSelection = useVorPmdtStore((state) => state.scenarioHardwareSelection);
  const hardwareDispositionConfirmed = useVorPmdtStore((state) => state.scenarioHardwareDispositionConfirmed);
  const replaceScenarioDraft = useVorPmdtStore((state) => state.replaceScenarioDraft);
  const applyScenario = useVorPmdtStore((state) => state.applyScenario);
  const restoreScenario = useVorPmdtStore((state) => state.restoreScenario);
  const endScenario = useVorPmdtStore((state) => state.endScenario);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fields = dvorConfigFieldCatalog.filter((field) => !field.id.startsWith("simulation."));
  const sections = Array.from(new Set(fields.map((field) => field.section)));
  const faultFields = fields.filter((field) => field.id.includes(".faults."));
  const baselineFields = fields.filter((field) => !field.id.includes(".faults."));
  const validationIssues = useMemo(
    () => validateDvor1150aScenarioDefinition(scenarioDraft),
    [scenarioDraft],
  );
  const preview = useMemo(() => {
    try {
      return validationIssues.length === 0 ? previewDvor1150aScenario(scenarioDraft) : null;
    } catch {
      return null;
    }
  }, [scenarioDraft, validationIssues.length]);
  const evaluation = evaluateDvor1150aScenario(scenario, derived, config, {
    visitedViewIds: attemptEvents.map((event) => event.viewId),
    acceptedActionControlIds: actionHistory.filter((event) => event.accepted && event.controlId).map((event) => event.controlId as string),
    selectedHardwareOccurrenceKeys: hardwareSelection,
    hardwareDispositionConfirmed,
  });

  const update = (mutate: (next: Dvor1150aScenarioDefinition) => void) => {
    const next = structuredClone(scenarioDraft);
    mutate(next);
    replaceScenarioDraft(next);
  };

  function selectPreset(presetId: string) {
    const preset = DVOR1150A_BUILT_IN_SCENARIOS.find((item) => item.id === presetId);
    if (!preset) return;
    replaceScenarioDraft(preset.create());
    setMessage(`Loaded preset: ${preset.label}`);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(scenarioDraft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${scenarioDraft.id.trim() || "dvor1150a-scenario"}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setMessage("Scenario JSON exported.");
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = parseDvor1150aScenarioDefinition(JSON.parse(await file.text()));
      if (!parsed) throw new Error("Invalid DVOR 1150A scenario JSON.");
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

  return <aside className="pmdt-config-panel dvor1150a-scenario-parameters-panel selex-scenario-parameters-panel" aria-label="DVOR 1150A scenario parameters">
    <header className="pmdt-config-panel-header">
      <strong>DVOR 1150A Scenario Parameters</strong>
      <button type="button" title="Close" aria-label="Close scenario parameters" onClick={() => setOpen(false)}>
        <X aria-hidden size={13} weight="bold" />
      </button>
    </header>
    <div className="pmdt-config-summary dvor1150a-scenario-summary">
      <span>Status: <b>{stateLabel(evaluation.solved, scenario.active)}</b></span>
      {scenario.active ? <span>Active baseline: <b>{scenario.definition?.name}</b></span> : <span>Draft is not active</span>}
    </div>
    <div className="pmdt-config-panel-body dvor1150a-scenario-panel-body">
      <section className="dvor1150a-scenario-overview selex-scenario-overview" aria-label="Scenario definition">
        <strong>Thông tin kịch bản</strong>
        <div className="dvor1150a-scenario-action-row">
          <label>Preset <select defaultValue="" onChange={(event) => {
            selectPreset(event.target.value);
            event.currentTarget.value = "";
          }}>
            <option value="" disabled>Load built-in scenario…</option>
            {DVOR1150A_BUILT_IN_SCENARIOS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select></label>
          <button type="button" onClick={handleExport}>Export JSON</button>
          <button type="button" onClick={() => importInputRef.current?.click()}>Import JSON</button>
          <input ref={importInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void handleImport(event.currentTarget.files?.[0])} />
        </div>
        <label><span>ID</span><input value={scenarioDraft.id} onChange={(event) => update((next) => { next.id = event.target.value; })} /></label>
        <label><span>Name</span><input value={scenarioDraft.name} onChange={(event) => update((next) => { next.name = event.target.value; })} /></label>
        <label><span>Difficulty</span><select value={scenarioDraft.difficulty} onChange={(event) => update((next) => { next.difficulty = event.target.value as Dvor1150aScenarioDefinition["difficulty"]; })}>
          <option value="basic">Basic</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </select></label>
        <label><span>Description</span><textarea value={scenarioDraft.description} onChange={(event) => update((next) => { next.description = event.target.value; })} /></label>
      </section>

      <ScenarioParametersSection number={1} title="Trạng thái khởi đầu" englishTitle="Initial state" ariaLabel="Starting policy" className="dvor1150a-scenario-policy"
        help="Trạng thái và giá trị thiết bị khi bắt đầu bài. Sửa bản nháp không thay đổi phiên đang chạy hoặc profile bình thường.">
        <label><span>Main transmitter</span><select value={scenarioDraft.startPolicy.mainTransmitterId} onChange={(event) => update((next) => { next.startPolicy.mainTransmitterId = event.target.value as "tx1" | "tx2"; })}><option value="tx1">TX1</option><option value="tx2">TX2</option></select></label>
        <label><input type="checkbox" checked={scenarioDraft.startPolicy.startLocal} onChange={(event) => update((next) => { next.startPolicy.startLocal = event.target.checked; })} /> Start Local</label>
        <label><input type="checkbox" checked={scenarioDraft.startPolicy.startMonitorBypassed} onChange={(event) => update((next) => { next.startPolicy.startMonitorBypassed = event.target.checked; })} /> Start Monitor Bypass</label>
        <details className="selex-scenario-baseline"><summary>Cấu hình ban đầu / Scenario configuration</summary>
          {sections.filter((section) => baselineFields.some((field) => field.section === section)).map((section) => <details key={section} className="pmdt-config-section">
            <summary>{section}</summary><div className="pmdt-config-section-body">{baselineFields.filter((field) => field.section === section).map((field) => <ScenarioConfigField key={field.id} field={field} scenario={scenarioDraft} onScenarioChange={replaceScenarioDraft} onError={setMessage} />)}</div>
          </details>)}
        </details>
      </ScenarioParametersSection>

      <ScenarioParametersSection number={2} title="Lỗi đưa vào" englishTitle="Fault injection" ariaLabel="Fault injection editor" className="dvor1150a-scenario-policy"
        help="Các fault flag do người soạn thiết lập. Tham số offset/scale tạo triệu chứng vẫn nằm trong cấu hình ban đầu.">
        {sections.filter((section) => faultFields.some((field) => field.section === section)).map((section) => <details key={section} className="pmdt-config-section" open>
          <summary>{section}</summary><div className="pmdt-config-section-body">{faultFields.filter((field) => field.section === section).map((field) => <ScenarioConfigField key={field.id} field={field} scenario={scenarioDraft} onScenarioChange={replaceScenarioDraft} onError={setMessage} />)}</div>
        </details>)}
      </ScenarioParametersSection>

      <ScenarioParametersSection number={3} title="Điều kiện đạt" englishTitle="Success criteria" ariaLabel="Success criteria editor" className="dvor1150a-scenario-policy"
        help="Kết quả vận hành cần đạt; không tự xác định trường được phép sửa hoặc thao tác bắt buộc.">
        <ScenarioCriteriaHelp disposition={scenarioDraft.diagnosis?.disposition} />
        {Object.entries(scenarioDraft.successCriteria).map(([key, value]) => <label key={key}><input type="checkbox" checked={value} onChange={(event) => update((next) => { next.successCriteria[key as keyof Dvor1150aScenarioDefinition["successCriteria"]] = event.target.checked; })} /> {criterionLabels[key as keyof typeof criterionLabels]}</label>)}
      </ScenarioParametersSection>

      <ScenarioDiagnosisSection className="dvor1150a-scenario-policy" diagnosis={scenarioDraft.diagnosis} fields={fields} taskTargets={scenarioDraft.taskTargets}
        hardwareAnswers={scenarioDraft.diagnosis?.expectedHardware.map((target) => `${target.assemblyId ?? target.diagramHotspotId} · ${target.blockId} · ${target.diagramHotspotId}`)} />

      <ScenarioEditPolicySection className="dvor1150a-scenario-policy" mode={scenarioDraft.editPolicy?.mode ?? "restricted"} fields={fields}
        isAllowed={(id) => isDvor1150aScenarioStudentEditable(scenarioDraft, id)} isOperable={(id) => dvor1150aScenarioFieldRole(id) === "student-operable"}
        onModeChange={(mode) => update((next) => { Object.assign(next, scenarioEditPolicyChange(next, mode)); })}
        onFieldChange={(id, checked) => update((next) => { Object.assign(next, scenarioEditableFieldChange(next, id, checked)); })} />

      <ScenarioParametersSection title="Xem trước trạng thái khởi đầu" englishTitle="Initial preview" ariaLabel="Scenario preview" className="dvor1150a-scenario-preview"
        help="Xem trước bản nháp; không phải kết quả bài làm đã hoàn thành quy trình chẩn đoán.">
        <div className="selex-scenario-preview-values">
          <span>Active TX: <b>{preview?.snapshot.voting.activeTransmitter?.toUpperCase() ?? "NONE"}</b></span>
          <span>Integral Monitor: <b>{preview?.snapshot.data.monitorIntegral.normal ? "NORMAL" : "ALARM"}</b></span>
          <span>Sideband VSWR: <b>{preview && Object.values(preview.snapshot.monitors).some((monitor) => monitor.parameters.sidebandVswr.status === "alarm") ? "ALARM" : "CLEAR"}</b></span>
        </div>
      </ScenarioParametersSection>
    </div>
    <p className={validationIssues.length > 0 ? "dvor1150a-scenario-message dvor1150a-scenario-message--error" : "dvor1150a-scenario-message"} role={validationIssues.length > 0 ? "alert" : "status"}>
      {message ?? (validationIssues[0] ?? "Scenario is structurally valid. Review the preview, then Apply Scenario.")}
    </p>
    <footer className="pmdt-config-panel-footer dvor1150a-scenario-footer">
      <button type="button" disabled={!scenario.active} onClick={() => restoreScenario()}>Restore Scenario</button>
      <button type="button" disabled={!scenario.active} onClick={() => endScenario()}>End / Restore TST</button>
      <button type="button" disabled={validationIssues.length > 0} onClick={handleApply}>Apply Scenario</button>
      <button type="button" onClick={() => setOpen(false)}>Close</button>
    </footer>
  </aside>;
}
