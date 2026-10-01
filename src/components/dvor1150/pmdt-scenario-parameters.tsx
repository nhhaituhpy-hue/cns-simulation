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
  dvor1150ScenarioFieldRole,
  isDvor1150ScenarioStudentEditable,
  type Dvor1150ConfigFieldDefinition,
  type Dvor1150ConfigValue,
  type Dvor1150ScenarioDefinition,
} from "@/lib/dvor1150";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { scenarioEditPolicyChange, scenarioEditableFieldChange } from "@/lib/scenario-policy-draft";
import { ScenarioParametersSection, ScenarioCriteriaHelp } from "@/components/scenario/parameters/scenario-parameters-section";
import { ScenarioDiagnosisSection } from "@/components/scenario/parameters/scenario-diagnosis-section";
import { ScenarioEditPolicySection } from "@/components/scenario/parameters/scenario-edit-policy-section";

// Native configuration stimuli; each value has one editor in the authoring UI.
const faultFieldIds = new Set(["tx1", "tx2"].flatMap((tx) => [
  "nominal.outputPower", "nominal.referenceModulation", "nominal.sboRfLevel",
  "offsets.outputPowerScale", "offsets.cabinetTemperatureOffset",
  "offsets.sideband1RfLevelScale", "offsets.sideband2RfLevelScale", "offsets.sideband3RfLevelScale", "offsets.sideband4RfLevelScale",
].map((path) => `transmitters.${tx}.${path}`)));

const criterionLabels: Record<keyof Dvor1150ScenarioDefinition["successCriteria"], string> = {
  requireIntegralMonitorNormal: "Integral Monitor trở về Normal",
  requireActiveTransmitter: "Có máy phát hoạt động trên antenna",
  requireNoVswrExecutiveAlarm: "Không còn VSWR executive alarm",
  requireMonitorBypassCleared: "Monitor Bypass đã được bỏ",
};

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
  const scenarioVisitedViewIds = useDvor1150PmdtStore((state) => state.scenarioVisitedViewIds);
  const scenarioAcceptedActionControlIds = useDvor1150PmdtStore((state) => state.scenarioAcceptedActionControlIds);
  const scenarioHardwareSelection = useDvor1150PmdtStore((state) => state.scenarioHardwareSelection);
  const scenarioHardwareDispositionConfirmed = useDvor1150PmdtStore((state) => state.scenarioHardwareDispositionConfirmed);
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
  const activeEvaluation = evaluateDvor1150Scenario(
    scenario,
    derived,
    config,
    {
      visitedViewIds: scenarioVisitedViewIds,
      acceptedActionControlIds: scenarioAcceptedActionControlIds,
      selectedHardwareOccurrenceKeys: scenarioHardwareSelection,
      hardwareDispositionConfirmed: scenarioHardwareDispositionConfirmed,
    },
  );
  const previewEvaluation = preview
    ? evaluateDvor1150Scenario({ active: true, definition: scenarioDraft, startedAt: null }, preview.snapshot, preview.config)
    : null;
  const fields = dvor1150ConfigFieldCatalog;
  const sections = Array.from(new Set(fields.map((field) => field.section)));
  const baselineFields = fields.filter((field) => !faultFieldIds.has(field.id));
  const faultFields = fields.filter((field) => faultFieldIds.has(field.id));

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

  return <aside className="pmdt-config-panel dvor1150-scenario-parameters-panel selex-scenario-parameters-panel" aria-label="DVOR 1150 scenario parameters">
    <header className="pmdt-config-panel-header">
      <strong>DVOR 1150 Scenario Parameters</strong>
      <button type="button" title="Close" aria-label="Close scenario parameters" onClick={() => setOpen(false)}><X aria-hidden size={13} weight="bold" /></button>
    </header>
    <div className="pmdt-config-summary dvor1150-scenario-summary">
      <span><b>SESSION:</b> {scenario.active ? `Active: ${scenario.definition?.name}` : "No active scenario"}</span>
      <span><b>LIVE RESULT:</b> {statusLabel(activeEvaluation.solved, scenario.active)}</span>
      <span><b>INITIAL PREVIEW:</b> {preview ? (previewEvaluation?.solved ? "Baseline criteria met" : "Baseline criteria not met") : "INVALID"}</span>
      <span>Session-only · Reset restores scenario baseline · End restores TST</span>
    </div>
    <div className="pmdt-config-panel-body dvor1150-scenario-panel-body">
      <section className="dvor1150-scenario-overview selex-scenario-overview" aria-label="Scenario definition">
        <strong>Thông tin kịch bản</strong>
        <div className="dvor1150-scenario-action-row">
          <label>Preset
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
        <label>ID<input value={scenarioDraft.id} onChange={(event) => update((next) => { next.id = event.target.value; })} /></label>
        <label>Name<input value={scenarioDraft.name} onChange={(event) => update((next) => { next.name = event.target.value; })} /></label>
        <label>Difficulty<select value={scenarioDraft.difficulty} onChange={(event) => update((next) => { next.difficulty = event.target.value as Dvor1150ScenarioDefinition["difficulty"]; })}>
          <option value="basic">Basic</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </select></label>
        <label>Description<textarea value={scenarioDraft.description} onChange={(event) => update((next) => { next.description = event.target.value; })} /></label>
      </section>

      <ScenarioParametersSection number={1} title="Trạng thái khởi đầu" englishTitle="Initial state" ariaLabel="Starting policy" className="dvor1150-scenario-policy"
        help="Trạng thái và giá trị thiết bị khi bắt đầu bài. Sửa bản nháp không thay đổi phiên đang chạy hoặc profile bình thường.">
        <label>Main transmitter<select value={scenarioDraft.startPolicy.mainTransmitterId} onChange={(event) => update((next) => { next.startPolicy.mainTransmitterId = event.target.value as "tx1" | "tx2"; })}><option value="tx1">TX1</option><option value="tx2">TX2</option></select></label>
        <label><input type="checkbox" checked={scenarioDraft.startPolicy.startLocal} onChange={(event) => update((next) => { next.startPolicy.startLocal = event.target.checked; })} /> Start in Local mode</label>
        <label><input type="checkbox" checked={scenarioDraft.startPolicy.startMonitorBypassed} onChange={(event) => update((next) => { next.startPolicy.startMonitorBypassed = event.target.checked; })} /> Start with Monitor Bypass</label>
        <details className="selex-scenario-baseline"><summary>Cấu hình ban đầu / Scenario configuration</summary>
          {sections.filter((section) => baselineFields.some((field) => field.section === section)).map((section) => <details key={section} className="pmdt-config-section">
            <summary>{section}</summary><div className="pmdt-config-section-body">{baselineFields.filter((field) => field.section === section).map((field) => <ScenarioConfigField key={field.id} field={field} scenario={scenarioDraft} onScenarioChange={replaceScenarioDraft} onError={setMessage} />)}</div>
          </details>)}
        </details>
      </ScenarioParametersSection>

      <ScenarioParametersSection number={2} title="Lỗi đưa vào" englishTitle="Fault injection" ariaLabel="Fault injection editor" className="dvor1150-scenario-policy"
        help="DVOR 1150 tạo triệu chứng bằng các giá trị cấu hình native: công suất, điều chế, hệ số sideband và nhiệt độ. Đây không phải fault flag mới.">
        {scenarioDraft.diagnosis ? <p>{scenarioDraft.diagnosis.faultSummary}</p> : null}
        {["tx1", "tx2"].map((tx) => <details key={tx} className="pmdt-config-section">
          <summary>Tham số tạo triệu chứng — {tx.toUpperCase()}</summary><div className="pmdt-config-section-body">{faultFields.filter((field) => field.id.startsWith(`transmitters.${tx}.`)).map((field) => <ScenarioConfigField key={field.id} field={field} scenario={scenarioDraft} onScenarioChange={replaceScenarioDraft} onError={setMessage} />)}</div>
        </details>)}
      </ScenarioParametersSection>

      <ScenarioParametersSection number={3} title="Điều kiện đạt" englishTitle="Success criteria" ariaLabel="Success criteria editor" className="dvor1150-scenario-policy"
        help="Kết quả vận hành cần đạt; không tự xác định trường được phép sửa hoặc thao tác bắt buộc.">
        <ScenarioCriteriaHelp disposition={scenarioDraft.diagnosis?.disposition} />
        {Object.entries(scenarioDraft.successCriteria).map(([key, value]) => <label key={key}><input type="checkbox" checked={value} onChange={(event) => update((next) => { next.successCriteria[key as keyof Dvor1150ScenarioDefinition["successCriteria"]] = event.target.checked; })} /> {criterionLabels[key as keyof typeof criterionLabels]}</label>)}
      </ScenarioParametersSection>

      <ScenarioDiagnosisSection className="dvor1150-scenario-policy" diagnosis={scenarioDraft.diagnosis}
        hardwareAnswers={scenarioDraft.diagnosis?.expectedHardware.map((target) => `${target.assemblyId ?? target.diagramOccurrenceId} · ${target.blockId} · ${target.diagramOccurrenceId}`)} />

      <ScenarioEditPolicySection className="dvor1150-scenario-policy" mode={scenarioDraft.editPolicy?.mode ?? "restricted"} fields={fields}
        isAllowed={(id) => isDvor1150ScenarioStudentEditable(scenarioDraft, id)} isOperable={(id) => dvor1150ScenarioFieldRole(id) === "student-operable"}
        onModeChange={(mode) => update((next) => { Object.assign(next, scenarioEditPolicyChange(next, mode)); })}
        onFieldChange={(id, checked) => update((next) => { Object.assign(next, scenarioEditableFieldChange(next, id, checked)); })} />

      <ScenarioParametersSection title="Xem trước trạng thái khởi đầu" englishTitle="Initial preview" ariaLabel="Scenario preview" className="dvor1150-scenario-preview"
        help="Xem trước bản nháp; không phải kết quả bài làm đã hoàn thành quy trình chẩn đoán.">
        <div className="selex-scenario-preview-values">
          <span>Active TX: <b>{preview?.snapshot.activeTransmitter?.toUpperCase() ?? "NONE"}</b></span>
          <span>Integral Monitor: <b>{preview?.snapshot.data.monitorIntegral.normal ? "NORMAL" : "ALARM"}</b></span>
          <span>VSWR executive: <b>{preview?.snapshot.data.maintenanceAlerts.find((item) => item.label === "Sideband Antenna VSWR")?.indicator === "red" ? "ALARM" : "CLEAR"}</b></span>
        </div>
      </ScenarioParametersSection>
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
