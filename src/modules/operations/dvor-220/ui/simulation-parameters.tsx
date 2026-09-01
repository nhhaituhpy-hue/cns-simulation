"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  MopiensBeveledButton,
  MopiensModal,
  MopiensStatusIndicator,
} from "@/modules/operations/mopiens-pmdt";
import { cloneDvor220 } from "../domain/defaults";
import {
  DVOR220_BUILT_IN_SCENARIOS,
  createDefaultDvor220ScenarioDefinition,
  evaluateDvor220Scenario,
  parseDvor220ScenarioDefinition,
  previewDvor220Scenario,
  validateDvor220ScenarioDefinition,
} from "../domain/scenario";
import {
  DVOR220_MONITOR_CHANNEL_IDS,
  DVOR220_MONITOR_IDS,
  DVOR220_MONITOR_PARAMETERS,
  DVOR220_TRANSMITTER_IDS,
  type Dvor220AlarmBand,
  type Dvor220Command,
  type Dvor220CommandResult,
  type Dvor220DeviceState,
  type Dvor220InjectedFault,
  type Dvor220MonitorChannelId,
  type Dvor220MonitorId,
  type Dvor220MonitorParameter,
  type Dvor220ScenarioDefinition,
  type Dvor220Snapshot,
  type Dvor220TransmitterId,
} from "../domain/types";
import { toneForDvor220Status } from "./main-screens";
import styles from "../dvor220.module.css";

const parameterLabels: Record<Dvor220MonitorParameter, string> = {
  bearingError: "Azimuth Angle",
  fmIndex: "FM Index",
  am30Hz: "30 Hz Modulation",
  am9960Hz: "9960 Hz Modulation",
  ident1020Hz: "1020 Hz IDENT",
  rfLevel: "RF Level",
  distortion9960Hz: "9960 Hz Distortion",
  carrierFrequency: "Carrier Frequency",
  subcarrierFrequency: "Subcarrier Frequency",
};

const parameterUnits: Record<Dvor220MonitorParameter, string> = {
  bearingError: "°",
  fmIndex: "",
  am30Hz: "%",
  am9960Hz: "%",
  ident1020Hz: "%",
  rfLevel: "dB",
  distortion9960Hz: "%",
  carrierFrequency: "MHz",
  subcarrierFrequency: "Hz",
};

type ScenarioTab = "overview" | "rf" | "monitor" | "plant" | "faults" | "raw";
type ThermalUnit = "cma" | "usb" | "lsb";

function mutateScenario(
  setScenario: React.Dispatch<React.SetStateAction<Dvor220ScenarioDefinition>>,
  mutator: (next: Dvor220ScenarioDefinition) => void,
) {
  setScenario((current) => {
    const next = cloneDvor220(current);
    mutator(next);
    return next;
  });
}

function ScenarioField({ label, unit, helper, children }: {
  label: string;
  unit?: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.scenarioField}>
      <span>{label}{unit ? <small>{unit}</small> : null}</span>
      {children}
      {helper ? <small className={styles.scenarioFieldHelper}>{helper}</small> : null}
    </label>
  );
}

function ScenarioNumberInput({ value, onChange, min, max, step = "any", allowNull = false, ariaLabel }: {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  allowNull?: boolean;
  ariaLabel: string;
}) {
  function commit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed && allowNull) {
      onChange(null);
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) onChange(parsed);
  }

  return (
    <input
      key={value === null ? "null" : value}
      aria-label={ariaLabel}
      type="number"
      min={min}
      max={max}
      step={step}
      defaultValue={value === null ? "" : String(value)}
      onBlur={(event) => commit(event.currentTarget.value)}
    />
  );
}

function toggleFault(
  setScenario: React.Dispatch<React.SetStateAction<Dvor220ScenarioDefinition>>,
  fault: Dvor220InjectedFault,
  enabled: boolean,
) {
  mutateScenario(setScenario, (next) => {
    next.runtime.faults = next.runtime.faults.filter((candidate) => candidate.id !== fault.id);
    if (enabled) next.runtime.faults.push(fault);
  });
}

function scenarioFaultEnabled(scenario: Dvor220ScenarioDefinition, faultId: string) {
  return scenario.runtime.faults.some((fault) => fault.id === faultId);
}

export interface Dvor220SimulationParametersDialogProps {
  open: boolean;
  device: Dvor220DeviceState;
  snapshot: Dvor220Snapshot;
  dispatch: (command: Dvor220Command) => Dvor220CommandResult;
  initialScenario?: Dvor220ScenarioDefinition | null;
  onClose: () => void;
}

export function Dvor220SimulationParametersDialog({
  open,
  device,
  snapshot,
  dispatch,
  initialScenario,
  onClose,
}: Dvor220SimulationParametersDialogProps) {
  const [tab, setTab] = useState<ScenarioTab>("overview");
  const [scenario, setScenario] = useState<Dvor220ScenarioDefinition>(() => initialScenario ? cloneDvor220(initialScenario) : createDefaultDvor220ScenarioDefinition());
  const [selectedTx, setSelectedTx] = useState<Dvor220TransmitterId>("tx1");
  const [selectedMonitor, setSelectedMonitor] = useState<Dvor220MonitorId>("mon1");
  const [selectedChannel, setSelectedChannel] = useState<Dvor220MonitorChannelId>("cha");
  const [selectedParameter, setSelectedParameter] = useState<Dvor220MonitorParameter>("am9960Hz");
  const [thermalUnit, setThermalUnit] = useState<ThermalUnit>("cma");
  const [antennaNumber, setAntennaNumber] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialScenario) setScenario(cloneDvor220(initialScenario));
  }, [initialScenario]);

  const validationIssues = useMemo(() => {
    try {
      return validateDvor220ScenarioDefinition(scenario);
    } catch {
      return ["Scenario structure is incomplete."];
    }
  }, [scenario]);
  const preview = useMemo(() => {
    if (validationIssues.length > 0) return null;
    try {
      return previewDvor220Scenario(scenario, device.nowMs);
    } catch {
      return null;
    }
  }, [device.nowMs, scenario, validationIssues.length]);
  const previewEvaluation = preview ? evaluateDvor220Scenario(preview.device, preview.snapshot) : null;
  const activeEvaluation = evaluateDvor220Scenario(device, snapshot);
  const previewTx = preview?.snapshot.transmitters[selectedTx];
  const previewChannel = preview?.snapshot.monitors[selectedMonitor].channels[selectedChannel];
  const monitorChannel = scenario.configuration.monitor.channels[selectedChannel];
  const selectedBand = monitorChannel.limits[selectedParameter];
  const selectedAntenna = scenario.runtime.antennaVswr.find((entry) => entry.antenna === antennaNumber);
  const previewAntenna = preview?.snapshot.pdc.antennas[antennaNumber - 1];

  function updateBand(mutator: (band: Dvor220AlarmBand) => void) {
    mutateScenario(setScenario, (next) => mutator(next.configuration.monitor.channels[selectedChannel].limits[selectedParameter]));
  }

  function updateAntennaVswr(key: "usbVswr" | "lsbVswr", value: number) {
    mutateScenario(setScenario, (next) => {
      let entry = next.runtime.antennaVswr.find((candidate) => candidate.antenna === antennaNumber);
      if (!entry) {
        entry = {
          antenna: antennaNumber,
          usbVswr: previewAntenna?.usbVswr ?? 1.15,
          lsbVswr: previewAntenna?.lsbVswr ?? 1.15,
        };
        next.runtime.antennaVswr.push(entry);
      }
      entry[key] = value;
    });
  }

  function setRawOverride(parameter: Dvor220MonitorParameter, value: number) {
    mutateScenario(setScenario, (next) => {
      next.runtime.measurementOverrides = next.runtime.measurementOverrides.filter((override) => !(
        override.monitorId === selectedMonitor
        && override.channelId === selectedChannel
        && override.parameter === parameter
      ));
      next.runtime.measurementOverrides.push({ monitorId: selectedMonitor, channelId: selectedChannel, parameter, value });
    });
  }

  function clearRawOverrides() {
    mutateScenario(setScenario, (next) => {
      next.runtime.measurementOverrides = next.runtime.measurementOverrides.filter((override) => !(
        override.monitorId === selectedMonitor && override.channelId === selectedChannel
      ));
    });
  }

  function applyScenario() {
    if (validationIssues.length > 0) {
      setMessage(validationIssues[0]);
      return;
    }
    const result = dispatch({ type: "apply-scenario", scenario });
    setMessage(result.ok
      ? `Scenario applied: ${scenario.name}. Student changes are session-only.`
      : result.error ?? "Scenario could not be applied.");
  }

  function restartScenario() {
    const result = dispatch({ type: "restart-scenario" });
    setMessage(result.ok ? "Scenario restored to its starting baseline." : result.error ?? "Scenario could not be restored.");
  }

  function endScenario() {
    const result = dispatch({ type: "end-scenario" });
    if (result.ok) setScenario(createDefaultDvor220ScenarioDefinition());
    setMessage(result.ok ? "Scenario ended. Đài TEST/TST defaults restored." : result.error ?? "Scenario could not be ended.");
  }

  function exportScenario() {
    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${scenario.id || "dvor220-scenario"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Scenario JSON exported.");
  }

  async function importScenario(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const parsed = parseDvor220ScenarioDefinition(JSON.parse(await file.text()));
      if (!parsed) throw new Error("The file does not match DVOR 220 scenario schema version 1.");
      setScenario(parsed);
      setMessage(`Imported scenario: ${parsed.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Scenario JSON could not be imported.");
    }
  }

  const tabs: Array<{ id: ScenarioTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "rf", label: "RF & Modulation" },
    { id: "monitor", label: "Monitor & Limits" },
    { id: "plant", label: "VSWR / Thermal / Power" },
    { id: "faults", label: "Faults" },
    { id: "raw", label: "Advanced Raw Monitor" },
  ];

  return (
    <MopiensModal
      open={open}
      title="Scenario Parameters..."
      ariaLabel="DVOR 220 scenario parameters"
      brandLabel="MOPIENS 220 DVOR — Simulator Tools"
      size="large"
      onClose={onClose}
      actions={[
        { id: "restart", label: "Restore Scenario", disabled: !device.scenario.active, onClick: restartScenario },
        { id: "end", label: "End Scenario / Restore TST", disabled: !device.scenario.active, tone: "warning", onClick: endScenario },
        { id: "apply", label: "Apply Scenario", disabled: validationIssues.length > 0, tone: "primary", onClick: applyScenario },
        { id: "close", label: "Close", onClick: onClose },
      ]}
    >
      <div className={styles.scenarioDialog}>
        <div className={styles.scenarioSummaryBar}>
          <MopiensStatusIndicator label="SESSION" detail={device.scenario.active ? `Active: ${device.scenario.definition?.name}` : "No active scenario"} tone={device.scenario.active ? "warning" : "inactive"} />
          <MopiensStatusIndicator label="LIVE RESULT" detail={device.scenario.active ? (activeEvaluation.solved ? "SOLVED" : "IN PROGRESS") : "—"} tone={device.scenario.active ? (activeEvaluation.solved ? "normal" : "warning") : "inactive"} />
          <MopiensStatusIndicator label="PREVIEW" detail={preview ? preview.snapshot.serviceStatus.toUpperCase() : "INVALID"} tone={preview ? toneForDvor220Status(preview.snapshot.serviceStatus) : "alarm"} />
          <span className={styles.scenarioIsolationNote}>Session-only · Profile Save disabled · Reset returns to scenario baseline</span>
        </div>

        <div className={styles.scenarioTabs} role="tablist" aria-label="Scenario parameter groups">
          {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? styles.scenarioTabActive : undefined} onClick={() => setTab(item.id)}>{item.label}</button>)}
        </div>

        <div className={styles.scenarioTabPanel} role="tabpanel">
          {tab === "overview" ? <OverviewTab scenario={scenario} setScenario={setScenario} validationIssues={validationIssues} previewEvaluation={previewEvaluation} importInputRef={importInputRef} importScenario={importScenario} exportScenario={exportScenario} setMessage={setMessage} /> : null}
          {tab === "rf" ? <RfTab scenario={scenario} setScenario={setScenario} selectedTx={selectedTx} setSelectedTx={setSelectedTx} previewTx={previewTx} previewChannel={previewChannel} /> : null}
          {tab === "monitor" ? <MonitorTab scenario={scenario} setScenario={setScenario} selectedMonitor={selectedMonitor} setSelectedMonitor={setSelectedMonitor} selectedChannel={selectedChannel} setSelectedChannel={setSelectedChannel} selectedParameter={selectedParameter} setSelectedParameter={setSelectedParameter} monitorChannel={monitorChannel} selectedBand={selectedBand} previewChannel={previewChannel} updateBand={updateBand} /> : null}
          {tab === "plant" ? <PlantTab scenario={scenario} setScenario={setScenario} selectedTx={selectedTx} setSelectedTx={setSelectedTx} thermalUnit={thermalUnit} setThermalUnit={setThermalUnit} antennaNumber={antennaNumber} setAntennaNumber={setAntennaNumber} selectedAntenna={selectedAntenna} previewAntenna={previewAntenna} updateAntennaVswr={updateAntennaVswr} /> : null}
          {tab === "faults" ? <FaultsTab scenario={scenario} setScenario={setScenario} /> : null}
          {tab === "raw" ? <RawTab scenario={scenario} selectedMonitor={selectedMonitor} setSelectedMonitor={setSelectedMonitor} selectedChannel={selectedChannel} setSelectedChannel={setSelectedChannel} previewChannel={previewChannel} setRawOverride={setRawOverride} clearRawOverrides={clearRawOverrides} /> : null}
        </div>

        <p className={validationIssues.length > 0 ? styles.inlineError : styles.inlineNotice} role={validationIssues.length > 0 ? "alert" : "status"}>
          {message ?? (validationIssues.length > 0 ? validationIssues[0] : previewEvaluation?.correctable ? "Scenario is structurally valid. Review the preview before Apply Scenario." : previewEvaluation?.blockers[0] ?? "Scenario contains a non-correctable condition.")}
        </p>
      </div>
    </MopiensModal>
  );
}

function OverviewTab({ scenario, setScenario, validationIssues, previewEvaluation, importInputRef, importScenario, exportScenario, setMessage }: {
  scenario: Dvor220ScenarioDefinition;
  setScenario: React.Dispatch<React.SetStateAction<Dvor220ScenarioDefinition>>;
  validationIssues: string[];
  previewEvaluation: ReturnType<typeof evaluateDvor220Scenario> | null;
  importInputRef: React.RefObject<HTMLInputElement | null>;
  importScenario: (event: ChangeEvent<HTMLInputElement>) => void;
  exportScenario: () => void;
  setMessage: (message: string) => void;
}) {
  return <div className={styles.scenarioTwoColumns}>
    <section className={styles.scenarioSection}>
      <h3>Scenario Definition</h3>
      <ScenarioField label="Built-in preset"><select aria-label="Built-in scenario preset" defaultValue="default" onChange={(event) => { const preset = DVOR220_BUILT_IN_SCENARIOS.find((item) => item.id === event.currentTarget.value); if (preset) { setScenario(preset.create()); setMessage(`Loaded preset: ${preset.label}.`); } }}>{DVOR220_BUILT_IN_SCENARIOS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></ScenarioField>
      <ScenarioField label="Scenario ID"><input value={scenario.id} onChange={(event) => mutateScenario(setScenario, (next) => { next.id = event.currentTarget.value; })} /></ScenarioField>
      <ScenarioField label="Name"><input value={scenario.name} onChange={(event) => mutateScenario(setScenario, (next) => { next.name = event.currentTarget.value; })} /></ScenarioField>
      <ScenarioField label="Description"><textarea value={scenario.description} onChange={(event) => mutateScenario(setScenario, (next) => { next.description = event.currentTarget.value; })} /></ScenarioField>
      <ScenarioField label="Difficulty"><select value={scenario.difficulty} onChange={(event) => mutateScenario(setScenario, (next) => { next.difficulty = event.currentTarget.value as Dvor220ScenarioDefinition["difficulty"]; })}><option value="basic">Basic</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></ScenarioField>
      <div className={styles.actionRow}><MopiensBeveledButton onClick={exportScenario}>Export JSON</MopiensBeveledButton><MopiensBeveledButton onClick={() => importInputRef.current?.click()}>Import JSON</MopiensBeveledButton><input ref={importInputRef} className={styles.visuallyHiddenInput} type="file" accept="application/json,.json" onChange={importScenario} /></div>
    </section>
    <section className={styles.scenarioSection}>
      <h3>Start Policy & Success Criteria</h3>
      <ScenarioField label="Main transmitter"><select value={scenario.runtime.mainTransmitterId} onChange={(event) => mutateScenario(setScenario, (next) => { next.runtime.mainTransmitterId = event.currentTarget.value as Dvor220TransmitterId; })}><option value="tx1">TX1</option><option value="tx2">TX2</option></select></ScenarioField>
      <label className={styles.scenarioCheck}><input type="checkbox" checked={scenario.runtime.startMonitorBypassed} onChange={(event) => mutateScenario(setScenario, (next) => { next.runtime.startMonitorBypassed = event.currentTarget.checked; })} />Start MON1/MON2 in Bypass so the student has diagnosis time</label>
      <label className={styles.scenarioCheck}><input type="checkbox" checked={scenario.successCriteria.requireServiceNormal} onChange={(event) => mutateScenario(setScenario, (next) => { next.successCriteria.requireServiceNormal = event.currentTarget.checked; })} />Require Service Status Normal</label>
      <label className={styles.scenarioCheck}><input type="checkbox" checked={scenario.successCriteria.requireEnabledMonitorChannelsNormal} onChange={(event) => mutateScenario(setScenario, (next) => { next.successCriteria.requireEnabledMonitorChannelsNormal = event.currentTarget.checked; })} />Require enabled Monitor channels Normal</label>
      <label className={styles.scenarioCheck}><input type="checkbox" checked={scenario.successCriteria.requireNoPrimaryAlarm} onChange={(event) => mutateScenario(setScenario, (next) => { next.successCriteria.requireNoPrimaryAlarm = event.currentTarget.checked; })} />Require all primary alarms clear</label>
      <div className={styles.scenarioCheckList}><strong>Preview validation</strong>{validationIssues.length > 0 ? validationIssues.slice(0, 5).map((issue) => <span key={issue} data-passed="false">× {issue}</span>) : previewEvaluation?.checks.map((check) => <span key={check.id} data-passed={check.passed}>{check.passed ? "✓" : "×"} {check.label}: {check.detail}</span>)}{previewEvaluation?.blockers.map((blocker) => <span key={blocker} data-passed="false">× {blocker}</span>)}</div>
    </section>
  </div>;
}

function RfTab({ scenario, setScenario, selectedTx, setSelectedTx, previewTx, previewChannel }: {
  scenario: Dvor220ScenarioDefinition;
  setScenario: React.Dispatch<React.SetStateAction<Dvor220ScenarioDefinition>>;
  selectedTx: Dvor220TransmitterId;
  setSelectedTx: (value: Dvor220TransmitterId) => void;
  previewTx: Dvor220Snapshot["transmitters"][Dvor220TransmitterId] | undefined;
  previewChannel: Dvor220Snapshot["monitors"][Dvor220MonitorId]["channels"][Dvor220MonitorChannelId] | undefined;
}) {
  const txConfig = scenario.configuration.transmitters[selectedTx];
  const setNumber = (setter: (next: Dvor220ScenarioDefinition, value: number) => void) => (value: number | null) => { if (value !== null) mutateScenario(setScenario, (next) => setter(next, value)); };
  return <div className={styles.scenarioTwoColumns}>
    <section className={styles.scenarioSection}><h3>Station Signal</h3>
      <ScenarioField label="Carrier Power" unit="W"><ScenarioNumberInput ariaLabel="Scenario station carrier power" value={scenario.configuration.station.carrierPowerW} min={0} max={150} step={0.1} onChange={setNumber((next, value) => { next.configuration.station.carrierPowerW = value; })} /></ScenarioField>
      <ScenarioField label="30 Hz Modulation" unit="%"><ScenarioNumberInput ariaLabel="Scenario station 30 Hz modulation" value={scenario.configuration.station.am30HzPercent} min={0} max={40} step={0.1} onChange={setNumber((next, value) => { next.configuration.station.am30HzPercent = value; })} /></ScenarioField>
      <ScenarioField label="IDENT Modulation" unit="%"><ScenarioNumberInput ariaLabel="Scenario station IDENT modulation" value={scenario.configuration.station.identModulationPercent} min={0} max={20} step={0.1} onChange={setNumber((next, value) => { next.configuration.station.identModulationPercent = value; })} /></ScenarioField>
      <ScenarioField label="Azimuth Offset" unit="°"><ScenarioNumberInput ariaLabel="Scenario station azimuth offset" value={scenario.configuration.station.azimuthOffsetDeg} min={-40} max={40} step={0.1} onChange={setNumber((next, value) => { next.configuration.station.azimuthOffsetDeg = value; })} /></ScenarioField>
      <ScenarioField label="Transmitter to edit"><select value={selectedTx} onChange={(event) => setSelectedTx(event.currentTarget.value as Dvor220TransmitterId)}>{DVOR220_TRANSMITTER_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></ScenarioField>
    </section>
    <section className={styles.scenarioSection}><h3>{selectedTx.toUpperCase()} RF Setpoints</h3>
      <ScenarioField label="Carrier Scale" unit="%"><ScenarioNumberInput ariaLabel={`${selectedTx} carrier scale`} value={txConfig.carrierScalePercent} min={0} max={100} step={0.1} onChange={setNumber((next, value) => { next.configuration.transmitters[selectedTx].carrierScalePercent = value; })} /></ScenarioField>
      {(["usbCos", "usbSin", "lsbCos", "lsbSin"] as const).map((output) => <ScenarioField key={output} label={output.replace(/([A-Z])/g, " $1").toUpperCase()} unit="W"><ScenarioNumberInput ariaLabel={`${selectedTx} ${output} power`} value={txConfig.sidebandPowerW[output]} min={0} max={5} step={0.01} onChange={setNumber((next, value) => { next.configuration.transmitters[selectedTx].sidebandPowerW[output] = value; })} /></ScenarioField>)}
      <label className={styles.scenarioCheck}><input type="checkbox" checked={txConfig.trackingEnabled} onChange={(event) => mutateScenario(setScenario, (next) => { next.configuration.transmitters[selectedTx].trackingEnabled = event.currentTarget.checked; })} />Sideband Tracking enabled</label>
      <div className={styles.scenarioPreviewStrip}><span>Carrier <strong>{previewTx?.forwardPowerW.carrier.toFixed(1) ?? "—"} W</strong></span><span>RF Level <strong>{previewChannel?.readings.rfLevel.value.toFixed(2) ?? "—"} dB</strong></span><span>30 Hz <strong>{previewChannel?.readings.am30Hz.value.toFixed(2) ?? "—"}%</strong></span><span>9960 Hz <strong>{previewChannel?.readings.am9960Hz.value.toFixed(2) ?? "—"}%</strong></span></div>
    </section>
  </div>;
}

function MonitorTab({ scenario, setScenario, selectedMonitor, setSelectedMonitor, selectedChannel, setSelectedChannel, selectedParameter, setSelectedParameter, monitorChannel, selectedBand, previewChannel, updateBand }: {
  scenario: Dvor220ScenarioDefinition;
  setScenario: React.Dispatch<React.SetStateAction<Dvor220ScenarioDefinition>>;
  selectedMonitor: Dvor220MonitorId;
  setSelectedMonitor: (value: Dvor220MonitorId) => void;
  selectedChannel: Dvor220MonitorChannelId;
  setSelectedChannel: (value: Dvor220MonitorChannelId) => void;
  selectedParameter: Dvor220MonitorParameter;
  setSelectedParameter: (value: Dvor220MonitorParameter) => void;
  monitorChannel: Dvor220ScenarioDefinition["configuration"]["monitor"]["channels"][Dvor220MonitorChannelId];
  selectedBand: Dvor220AlarmBand;
  previewChannel: Dvor220Snapshot["monitors"][Dvor220MonitorId]["channels"][Dvor220MonitorChannelId] | undefined;
  updateBand: (mutator: (band: Dvor220AlarmBand) => void) => void;
}) {
  return <div className={styles.scenarioTwoColumns}>
    <section className={styles.scenarioSection}><h3>Monitor Policy</h3>
      <ScenarioField label="Preview Monitor"><select value={selectedMonitor} onChange={(event) => setSelectedMonitor(event.currentTarget.value as Dvor220MonitorId)}>{DVOR220_MONITOR_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></ScenarioField>
      <ScenarioField label="Channel"><select value={selectedChannel} onChange={(event) => setSelectedChannel(event.currentTarget.value as Dvor220MonitorChannelId)}>{DVOR220_MONITOR_CHANNEL_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></ScenarioField>
      <ScenarioField label="Channel Type"><select value={monitorChannel.type} onChange={(event) => mutateScenario(setScenario, (next) => { next.configuration.monitor.channels[selectedChannel].type = event.currentTarget.value as typeof monitorChannel.type; })}><option value="FFM">FFM</option><option value="NFM">NFM</option><option value="disabled">Disabled</option></select></ScenarioField>
      <label className={styles.scenarioCheck}><input type="checkbox" checked={monitorChannel.executiveAction} onChange={(event) => mutateScenario(setScenario, (next) => { next.configuration.monitor.channels[selectedChannel].executiveAction = event.currentTarget.checked; })} />Channel participates in executive action</label>
      <ScenarioField label="Voting"><select value={scenario.configuration.monitor.votingLogic} onChange={(event) => mutateScenario(setScenario, (next) => { next.configuration.monitor.votingLogic = event.currentTarget.value as "AND" | "OR"; })}><option value="AND">AND</option><option value="OR">OR</option></select></ScenarioField>
      <ScenarioField label="Moving Average" unit="samples"><ScenarioNumberInput ariaLabel="Scenario monitor average count" value={scenario.configuration.monitor.measurementAverageCount} min={2} max={10} step={1} onChange={(value) => { if (value !== null) mutateScenario(setScenario, (next) => { next.configuration.monitor.measurementAverageCount = Math.round(value); }); }} /></ScenarioField>
      <ScenarioField label="Warning Range" unit="%"><ScenarioNumberInput ariaLabel="Scenario warning range" value={scenario.configuration.monitor.warningRangePercent} min={0} max={100} step={1} onChange={(value) => { if (value !== null) mutateScenario(setScenario, (next) => { next.configuration.monitor.warningRangePercent = value; }); }} /></ScenarioField>
    </section>
    <section className={styles.scenarioSection}><h3>Alarm Band</h3>
      <ScenarioField label="Parameter"><select value={selectedParameter} onChange={(event) => setSelectedParameter(event.currentTarget.value as Dvor220MonitorParameter)}>{DVOR220_MONITOR_PARAMETERS.map((parameter) => <option key={parameter} value={parameter}>{parameterLabels[parameter]}</option>)}</select></ScenarioField>
      <ScenarioField label="Lower Alarm" unit={parameterUnits[selectedParameter]}><ScenarioNumberInput ariaLabel="Scenario lower alarm" value={selectedBand.lowerAlarm} allowNull onChange={(value) => updateBand((band) => { band.lowerAlarm = value; })} /></ScenarioField>
      <ScenarioField label="Lower Warning" unit={parameterUnits[selectedParameter]}><ScenarioNumberInput ariaLabel="Scenario lower warning" value={selectedBand.lowerWarning} allowNull onChange={(value) => updateBand((band) => { band.lowerWarning = value; })} /></ScenarioField>
      <ScenarioField label="Nominal" unit={parameterUnits[selectedParameter]}><ScenarioNumberInput ariaLabel="Scenario nominal" value={selectedBand.nominal} onChange={(value) => { if (value !== null) updateBand((band) => { band.nominal = value; }); }} /></ScenarioField>
      <ScenarioField label="Upper Warning" unit={parameterUnits[selectedParameter]}><ScenarioNumberInput ariaLabel="Scenario upper warning" value={selectedBand.upperWarning} allowNull onChange={(value) => updateBand((band) => { band.upperWarning = value; })} /></ScenarioField>
      <ScenarioField label="Upper Alarm" unit={parameterUnits[selectedParameter]}><ScenarioNumberInput ariaLabel="Scenario upper alarm" value={selectedBand.upperAlarm} allowNull onChange={(value) => updateBand((band) => { band.upperAlarm = value; })} /></ScenarioField>
      <ScenarioField label="Severity"><select value={selectedBand.severity} onChange={(event) => updateBand((band) => { band.severity = event.currentTarget.value as "primary" | "secondary"; })}><option value="primary">Primary</option><option value="secondary">Secondary</option></select></ScenarioField>
      <div className={styles.scenarioPreviewStrip}><span>{selectedMonitor.toUpperCase()} / {selectedChannel.toUpperCase()}</span><span>{parameterLabels[selectedParameter]} <strong>{previewChannel?.readings[selectedParameter].value.toFixed(2) ?? "—"} {parameterUnits[selectedParameter]}</strong></span><span>Status <strong>{previewChannel?.readings[selectedParameter].status.toUpperCase() ?? "INVALID"}</strong></span></div>
    </section>
  </div>;
}

function PlantTab({ scenario, setScenario, selectedTx, setSelectedTx, thermalUnit, setThermalUnit, antennaNumber, setAntennaNumber, selectedAntenna, previewAntenna, updateAntennaVswr }: {
  scenario: Dvor220ScenarioDefinition;
  setScenario: React.Dispatch<React.SetStateAction<Dvor220ScenarioDefinition>>;
  selectedTx: Dvor220TransmitterId;
  setSelectedTx: (value: Dvor220TransmitterId) => void;
  thermalUnit: ThermalUnit;
  setThermalUnit: (value: ThermalUnit) => void;
  antennaNumber: number;
  setAntennaNumber: (value: number) => void;
  selectedAntenna: Dvor220ScenarioDefinition["runtime"]["antennaVswr"][number] | undefined;
  previewAntenna: Dvor220Snapshot["pdc"]["antennas"][number] | undefined;
  updateAntennaVswr: (key: "usbVswr" | "lsbVswr", value: number) => void;
}) {
  return <div className={styles.scenarioTwoColumns}>
    <section className={styles.scenarioSection}><h3>Antenna VSWR & PDC</h3>
      <ScenarioField label="Antenna"><ScenarioNumberInput ariaLabel="Scenario antenna number" value={antennaNumber} min={1} max={48} step={1} onChange={(value) => { if (value !== null) setAntennaNumber(Math.max(1, Math.min(48, Math.round(value)))); }} /></ScenarioField>
      <ScenarioField label="USB VSWR" unit=":1"><ScenarioNumberInput ariaLabel="Scenario USB VSWR" value={selectedAntenna?.usbVswr ?? previewAntenna?.usbVswr ?? 1.15} min={1} max={10} step={0.01} onChange={(value) => { if (value !== null) updateAntennaVswr("usbVswr", value); }} /></ScenarioField>
      <ScenarioField label="LSB VSWR" unit=":1"><ScenarioNumberInput ariaLabel="Scenario LSB VSWR" value={selectedAntenna?.lsbVswr ?? previewAntenna?.lsbVswr ?? 1.15} min={1} max={10} step={0.01} onChange={(value) => { if (value !== null) updateAntennaVswr("lsbVswr", value); }} /></ScenarioField>
      <ScenarioField label="VSWR Warning" unit=":1"><ScenarioNumberInput ariaLabel="Scenario VSWR warning" value={scenario.configuration.transmitterLimits.vswrUpperWarning} min={1} max={10} step={0.01} onChange={(value) => { if (value !== null) mutateScenario(setScenario, (next) => { next.configuration.transmitterLimits.vswrUpperWarning = value; }); }} /></ScenarioField>
      <ScenarioField label="VSWR Alarm" unit=":1"><ScenarioNumberInput ariaLabel="Scenario VSWR alarm" value={scenario.configuration.transmitterLimits.vswrUpperAlarm} min={1} max={10} step={0.01} onChange={(value) => { if (value !== null) mutateScenario(setScenario, (next) => { next.configuration.transmitterLimits.vswrUpperAlarm = value; }); }} /></ScenarioField>
      <MopiensBeveledButton onClick={() => mutateScenario(setScenario, (next) => { next.runtime.antennaVswr = next.runtime.antennaVswr.filter((entry) => entry.antenna !== antennaNumber); })}>Clear Selected Antenna Override</MopiensBeveledButton>
    </section>
    <section className={styles.scenarioSection}><h3>Thermal, Power & Environment</h3>
      <ScenarioField label="Transmitter"><select value={selectedTx} onChange={(event) => setSelectedTx(event.currentTarget.value as Dvor220TransmitterId)}>{DVOR220_TRANSMITTER_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></ScenarioField>
      <ScenarioField label="Thermal Unit"><select value={thermalUnit} onChange={(event) => setThermalUnit(event.currentTarget.value as ThermalUnit)}><option value="cma">CMA</option><option value="usb">SMA USB</option><option value="lsb">SMA LSB</option></select></ScenarioField>
      <ScenarioField label="Unit Temperature" unit="°C"><ScenarioNumberInput ariaLabel="Scenario unit temperature" value={scenario.runtime.temperaturesC[selectedTx][thermalUnit]} min={-100} max={200} step={0.5} onChange={(value) => { if (value !== null) mutateScenario(setScenario, (next) => { next.runtime.temperaturesC[selectedTx][thermalUnit] = value; }); }} /></ScenarioField>
      <label className={styles.scenarioCheck}><input type="checkbox" checked={scenario.runtime.acAvailable} onChange={(event) => mutateScenario(setScenario, (next) => { next.runtime.acAvailable = event.currentTarget.checked; })} />AC input available</label>
      <ScenarioField label="Battery Remaining" unit="min"><ScenarioNumberInput ariaLabel="Scenario battery remaining" value={scenario.runtime.batteryRemainingMinutes} min={0} max={1440} step={1} onChange={(value) => { if (value !== null) mutateScenario(setScenario, (next) => { next.runtime.batteryRemainingMinutes = value; }); }} /></ScenarioField>
      <ScenarioField label="Ambient Temperature" unit="°C"><ScenarioNumberInput ariaLabel="Scenario ambient temperature" value={scenario.runtime.environment.temperatureC} min={-50} max={100} step={0.5} onChange={(value) => { if (value !== null) mutateScenario(setScenario, (next) => { next.runtime.environment.temperatureC = value; }); }} /></ScenarioField>
      <label className={styles.scenarioCheck}><input type="checkbox" checked={scenario.runtime.environment.smoke} onChange={(event) => mutateScenario(setScenario, (next) => { next.runtime.environment.smoke = event.currentTarget.checked; })} />Smoke detected</label>
      <label className={styles.scenarioCheck}><input type="checkbox" checked={scenario.runtime.environment.intrusion} onChange={(event) => mutateScenario(setScenario, (next) => { next.runtime.environment.intrusion = event.currentTarget.checked; })} />Intrusion detected</label>
    </section>
  </div>;
}

function FaultsTab({ scenario, setScenario }: { scenario: Dvor220ScenarioDefinition; setScenario: React.Dispatch<React.SetStateAction<Dvor220ScenarioDefinition>> }) {
  return <div className={styles.scenarioTwoColumns}>
    <section className={styles.scenarioSection}><h3>Equipment Faults</h3>
      {DVOR220_MONITOR_IDS.map((monitorId) => { const fault: Dvor220InjectedFault = { id: `scenario-${monitorId}-hardware`, kind: "monitor-hardware", monitorId, condition: "fault" }; return <label key={monitorId} className={styles.scenarioCheck}><input type="checkbox" checked={scenarioFaultEnabled(scenario, fault.id)} onChange={(event) => toggleFault(setScenario, fault, event.currentTarget.checked)} />{monitorId.toUpperCase()} hardware fault</label>; })}
      {DVOR220_TRANSMITTER_IDS.map((transmitterId) => { const fault: Dvor220InjectedFault = { id: `scenario-${transmitterId}-cma`, kind: "transmitter-unit", transmitterId, unit: "cma", condition: "alarm" }; return <label key={transmitterId} className={styles.scenarioCheck}><input type="checkbox" checked={scenarioFaultEnabled(scenario, fault.id)} onChange={(event) => toggleFault(setScenario, fault, event.currentTarget.checked)} />{transmitterId.toUpperCase()} CMA alarm</label>; })}
      {(() => { const fault: Dvor220InjectedFault = { id: "scenario-pdc", kind: "pdc", condition: "alarm" }; return <label className={styles.scenarioCheck}><input type="checkbox" checked={scenarioFaultEnabled(scenario, fault.id)} onChange={(event) => toggleFault(setScenario, fault, event.currentTarget.checked)} />PDC alarm</label>; })()}
    </section>
    <section className={styles.scenarioSection}><h3>Communication Faults</h3>
      {(["rcu", "lmi", "csp"] as const).map((endpoint) => { const fault: Dvor220InjectedFault = { id: `scenario-${endpoint}`, kind: "communication", endpoint, condition: "fault" }; return <label key={endpoint} className={styles.scenarioCheck}><input type="checkbox" checked={scenarioFaultEnabled(scenario, fault.id)} onChange={(event) => toggleFault(setScenario, fault, event.currentTarget.checked)} />{endpoint.toUpperCase()} communication fault</label>; })}
      <p className={styles.inlineNotice}>Typed faults are intended for diagnostic/clear-fault exercises. For correctable RF exercises, prefer RF & Modulation parameters so PMDT adjustments can change the result.</p>
    </section>
  </div>;
}

function RawTab({ scenario, selectedMonitor, setSelectedMonitor, selectedChannel, setSelectedChannel, previewChannel, setRawOverride, clearRawOverrides }: {
  scenario: Dvor220ScenarioDefinition;
  selectedMonitor: Dvor220MonitorId;
  setSelectedMonitor: (value: Dvor220MonitorId) => void;
  selectedChannel: Dvor220MonitorChannelId;
  setSelectedChannel: (value: Dvor220MonitorChannelId) => void;
  previewChannel: Dvor220Snapshot["monitors"][Dvor220MonitorId]["channels"][Dvor220MonitorChannelId] | undefined;
  setRawOverride: (parameter: Dvor220MonitorParameter, value: number) => void;
  clearRawOverrides: () => void;
}) {
  return <section className={styles.scenarioSection}>
    <h3>Forced Monitor Indication — Non-correctable</h3>
    <p className={styles.scenarioDangerNotice}>A forced value has priority over the engine. PMDT power/modulation adjustments cannot normalize that parameter until the override is cleared.</p>
    <div className={styles.scenarioInlineFields}><ScenarioField label="Monitor"><select value={selectedMonitor} onChange={(event) => setSelectedMonitor(event.currentTarget.value as Dvor220MonitorId)}>{DVOR220_MONITOR_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></ScenarioField><ScenarioField label="Channel"><select value={selectedChannel} onChange={(event) => setSelectedChannel(event.currentTarget.value as Dvor220MonitorChannelId)}>{DVOR220_MONITOR_CHANNEL_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></ScenarioField><MopiensBeveledButton onClick={clearRawOverrides}>Clear Selected Channel Overrides</MopiensBeveledButton></div>
    <div className={styles.scenarioRawGrid}>{DVOR220_MONITOR_PARAMETERS.map((parameter) => { const override = scenario.runtime.measurementOverrides.find((item) => item.monitorId === selectedMonitor && item.channelId === selectedChannel && item.parameter === parameter); const engineValue = previewChannel?.readings[parameter].value ?? 0; return <ScenarioField key={parameter} label={parameterLabels[parameter]} unit={parameterUnits[parameter]} helper={override ? "Forced override active" : "Engine preview value"}><ScenarioNumberInput ariaLabel={`Forced ${parameterLabels[parameter]}`} value={override?.value ?? engineValue} onChange={(value) => { if (value !== null) setRawOverride(parameter, value); }} /></ScenarioField>; })}</div>
  </section>;
}
