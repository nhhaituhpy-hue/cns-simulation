"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  MopiensBeveledButton,
  MopiensPropertyGrid,
  MopiensSlideSwitch,
  MopiensStatusIndicator,
  MopiensTable,
} from "@/modules/operations/mopiens-pmdt";
import { getDme320ChannelAllocation } from "../domain/channel-allocation";
import { DME320_FAULT_CATALOG } from "../domain/faults";
import { canDme320 } from "../domain/permissions";
import {
  DME320_MONITOR_PARAMETERS,
  type Dme320Command,
  type Dme320CommandResult,
  type Dme320FaultKind,
  type Dme320FaultTarget,
  type Dme320IdentKeyingMode,
  type Dme320ManualTestInput,
  type Dme320MonitorChannel,
  type Dme320MonitorId,
  type Dme320MonitorParameter,
  type Dme320SecurityLevel,
  type Dme320TransponderId,
} from "../domain/types";
import { DME320_SCREEN_LABELS } from "./navigation";
import { DME320_PARAMETER_LABELS, formatReading, formatStatus, toneForAlarmPhase } from "./presentation";
import type { Dme320ScreenProps } from "./screen-types";
import styles from "./dme320-ui.module.css";

const TRANSPONDER_IDS = ["tx1", "tx2"] as const;
const MONITOR_IDS = ["mon1", "mon2"] as const;
const MONITOR_CHANNELS = ["executive", "standby"] as const;
const FAULT_KINDS = Object.keys(DME320_FAULT_CATALOG) as Dme320FaultKind[];
const FAULT_TARGETS: Dme320FaultTarget[] = ["tx1", "tx2", "mon1", "mon2", "antenna", "system", "battery1", "battery2"];

const DEFAULT_FAULT_TARGET: Record<Dme320FaultKind, Dme320FaultTarget> = {
  "hpa-low-output": "tx1",
  "txu-failure": "tx1",
  "rxu-sensitivity": "tx1",
  "tcu-failure": "tx1",
  "dcdc-failure": "tx1",
  "fan-failure": "tx1",
  "rfg-failure": "mon1",
  "monitor-failure": "mon1",
  "antenna-vswr": "antenna",
  "rf-detector-failure": "antenna",
  "vswr-monitor-failure": "antenna",
  "coax-relay-failure": "antenna",
  "dummy-load-failure": "antenna",
  "ac-mains-failure": "system",
  "battery-low": "battery1",
  "battery-overtemperature": "battery1",
  "rcu-link-failure": "system",
  "lmi-link-failure": "system",
  "csp-link-failure": "system",
  "emu-smoke": "system",
  "emu-intrusion": "system",
};

function certificationTestValue(
  nominal: number | string,
  alarmLow: number | null,
  alarmHigh: number | null,
): string {
  if (typeof nominal === "string") return nominal === "MOP" ? "BAD" : `${nominal}X`;
  if (alarmHigh !== null) return String(alarmHigh + Math.max(0.01, Math.abs(alarmHigh) * 0.01));
  if (alarmLow !== null) return String(alarmLow - Math.max(0.01, Math.abs(alarmLow) * 0.01));
  return String(nominal + Math.max(0.01, Math.abs(nominal) * 0.01));
}

function maintenanceAvailable(props: Dme320ScreenProps): boolean {
  return canDme320(props.simulation, "maintenance");
}

function Field({ label, unit, children }: { label: string; unit?: string; children: ReactNode }) {
  return <label className={styles.formField}><span className={styles.formLabel}>{label}{unit ? <small>{unit}</small> : null}</span>{children}</label>;
}

function MaintenanceFrame({ props, subtitle, actions, access = "maintenance", children }: { props: Dme320ScreenProps; subtitle: string; actions?: ReactNode; access?: "maintenance" | "level3" | "read"; children: ReactNode }) {
  const enabled = access === "read"
    ? canDme320(props.simulation, "view")
    : access === "level3"
      ? canDme320(props.simulation, "user-administration")
      : maintenanceAvailable(props);
  return <div className={styles.screenStack}>
    <header className={styles.screenHeader}><div><h2>{DME320_SCREEN_LABELS[props.screenId]}</h2><p>{subtitle}</p></div>{actions ? <div className={styles.actionRow}>{actions}</div> : null}</header>
    <div className={styles.profileRail}>
      <MopiensStatusIndicator compact label="KEYLOCK" detail={props.simulation.keylock} tone={props.simulation.keylock === "MAINT" ? "normal" : "inactive"} />
      <MopiensStatusIndicator compact label="USER" detail={`Level ${props.simulation.session.level} / ${props.simulation.session.origin}`} tone={props.simulation.session.level >= 3 && props.simulation.session.origin === "local" ? "normal" : "inactive"} />
      <MopiensStatusIndicator compact label="MONITORS" detail={props.simulation.monitors.mon1.mode === "bypass" && props.simulation.monitors.mon2.mode === "bypass" ? "Both bypassed" : "Automatic action enabled"} tone={props.simulation.monitors.mon1.mode === "bypass" && props.simulation.monitors.mon2.mode === "bypass" ? "warning" : "inactive"} />
    </div>
    {!enabled ? <div className={styles.validationBanner} role="alert">{access === "level3" ? "User management requires a Level 3 login." : "Maintenance commands require local Level 3 login, MAINT keylock, and both monitors bypassed."}</div> : null}
    <fieldset className={styles.setupFieldset} disabled={!enabled}>{children}</fieldset>
  </div>;
}

export function Dme320MaintenanceScreen(props: Dme320ScreenProps) {
  if (props.screenId === "maintenance-calibration") return <CalibrationScreen props={props} />;
  if (props.screenId === "maintenance-manual-test") return <ManualTestScreen props={props} />;
  if (props.screenId === "maintenance-certification") return <CertificationScreen props={props} />;
  if (props.screenId === "maintenance-advanced-txp") return <AdvancedTransponderScreen props={props} />;
  if (props.screenId === "maintenance-advanced-mon") return <AdvancedMonitorScreen props={props} />;
  if (props.screenId === "maintenance-faults") return <FaultControlScreen props={props} />;
  if (props.screenId === "maintenance-users") return <UserManagementScreen props={props} />;
  if (props.screenId === "maintenance-time") return <TimeScreen props={props} />;
  return <VersionScreen props={props} />;
}

function CalibrationScreen({ props }: { props: Dme320ScreenProps }) {
  const [selectedTransponder, setSelectedTransponder] = useState<Dme320TransponderId>(props.simulation.mainTransponder);
  const [measuredValue, setMeasuredValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const calibration = props.simulation.calibration;
  const currentStep = calibration.currentStep === null ? null : calibration.steps[calibration.currentStep - 1];

  function execute(command: Parameters<typeof props.dispatch>[0]) {
    const result = props.dispatch(command);
    setMessage(result.message);
  }

  return <MaintenanceFrame props={props} subtitle="Ten-step transmitter and monitor calibration workflow from the 310/320 DME maintenance procedure">
    <div className={styles.calibrationHeader}>
      <Field label="Calibration TXP"><select className={styles.selectInput} value={selectedTransponder} disabled={calibration.status === "running"} onChange={(event) => setSelectedTransponder(event.currentTarget.value as Dme320TransponderId)}><option value="tx1">TXP1</option><option value="tx2">TXP2</option></select></Field>
      <MopiensBeveledButton tone="primary" disabled={calibration.status === "running"} onClick={() => execute({ type: "start-calibration", transponderId: selectedTransponder })}>Start</MopiensBeveledButton>
      <MopiensStatusIndicator label="CALIBRATION" detail={`${formatStatus(calibration.status)}${calibration.transponderId ? ` / ${calibration.transponderId.toUpperCase()}` : ""}`} tone={calibration.status === "completed" ? "normal" : calibration.status === "failed" ? "alarm" : calibration.status === "running" ? "pending" : "inactive"} />
    </div>
    {currentStep ? <section className={styles.currentStepPanel}>
      <div><strong>Step {currentStep.number}/10</strong><h3>{currentStep.name}</h3><p>{currentStep.message ?? "Follow the calibrated test-equipment procedure, then run this step."}</p></div>
      <div className={styles.actionRow}>
        <Field label="Measured / error value"><input className={styles.numberInput} type="number" step="any" value={measuredValue} onChange={(event) => setMeasuredValue(event.currentTarget.value)} /></Field>
        <MopiensBeveledButton tone="primary" onClick={() => execute({ type: "run-calibration-step", measuredValue: measuredValue === "" ? undefined : Number(measuredValue) })}>Run Step</MopiensBeveledButton>
        <MopiensBeveledButton disabled={!currentStep.skippable} onClick={() => execute({ type: "skip-calibration-step" })}>Skip</MopiensBeveledButton>
      </div>
    </section> : null}
    {message ? <div className={styles.inlineNotice} role="status">{message}</div> : null}
    <MopiensTable caption="DME 320 calibration sequence" rows={calibration.steps} dense getRowId={(row) => `${row.number}`} rowTone={(row) => row.status === "passed" ? "normal" : row.status === "failed" ? "alarm" : calibration.status === "running" && calibration.currentStep === row.number ? "pending" : row.status === "skipped" ? "warning" : undefined} columns={[
      { id: "number", label: "Step", width: "8%", align: "center", render: (row) => row.number },
      { id: "name", label: "Calibration Operation", render: (row) => row.name },
      { id: "skippable", label: "Skip", width: "10%", align: "center", render: (row) => row.skippable ? "Allowed" : "No" },
      { id: "status", label: "Status", width: "14%", render: (row) => formatStatus(row.status) },
      { id: "message", label: "Result", width: "30%", render: (row) => row.message ?? "-" },
    ]} />
  </MaintenanceFrame>;
}

function ManualTestScreen({ props }: { props: Dme320ScreenProps }) {
  const allocation = getDme320ChannelAllocation(props.simulation.config.running.station.channel);
  const [input, setInput] = useState<Dme320ManualTestInput>({
    monitorId: "mon1",
    transponderId: props.simulation.mainTransponder,
    interrogationLevelDbm: -50,
    interrogationPulseRatePps: 100,
    interrogationCount: 50,
    frequencyOffsetKhz: 0,
    spacingUs: allocation.interrogationSpacingUs,
  });
  const [message, setMessage] = useState<string | null>(null);
  function run() { const result = props.dispatch({ type: "run-manual-test", input }); setMessage(result.message); }
  const result = props.simulation.lastManualTest;
  return <MaintenanceFrame props={props} subtitle="Manual monitor interrogation with selectable MON and target TXP">
    <div className={styles.setupGrid}>
      <section className={styles.setupSection}><h3>Check Option</h3>
        <Field label="Monitor"><select className={styles.selectInput} value={input.monitorId} onChange={(event) => setInput({ ...input, monitorId: event.currentTarget.value as Dme320MonitorId })}>{MONITOR_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></Field>
        <Field label="Target TXP"><select className={styles.selectInput} value={input.transponderId} onChange={(event) => setInput({ ...input, transponderId: event.currentTarget.value as Dme320TransponderId })}>{TRANSPONDER_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></Field>
        <Field label="Interrogation Signal Level" unit="dBm"><input className={styles.numberInput} type="number" step="0.1" value={input.interrogationLevelDbm} onChange={(event) => setInput({ ...input, interrogationLevelDbm: Number(event.currentTarget.value) })} /></Field>
        <Field label="Interrogation Pulse Rate" unit="pp/s"><input className={styles.numberInput} type="number" min="0" max="5400" step="1" value={input.interrogationPulseRatePps} onChange={(event) => setInput({ ...input, interrogationPulseRatePps: Number(event.currentTarget.value) })} /></Field>
        <Field label="Check Number"><input className={styles.numberInput} type="number" min="1" step="1" value={input.interrogationCount} onChange={(event) => setInput({ ...input, interrogationCount: Number(event.currentTarget.value) })} /></Field>
        <Field label="Frequency Offset" unit="kHz"><input className={styles.numberInput} type="number" step="0.1" value={input.frequencyOffsetKhz} onChange={(event) => setInput({ ...input, frequencyOffsetKhz: Number(event.currentTarget.value) })} /></Field>
        <Field label="Pulse Spacing" unit="µs"><input className={styles.numberInput} type="number" step="0.1" value={input.spacingUs} onChange={(event) => setInput({ ...input, spacingUs: Number(event.currentTarget.value) })} /></Field>
        <MopiensBeveledButton tone="primary" onClick={run}>Start Test</MopiensBeveledButton>
      </section>
      <section className={styles.setupSection}><h3>Latest Result</h3>{result ? <>
        <MopiensStatusIndicator appearance="ring" label={result.passed ? "PASS" : "FAIL"} detail={`${result.efficiencyPct.toFixed(0)}% reply efficiency`} tone={result.passed ? "normal" : "alarm"} />
        <MopiensPropertyGrid ariaLabel="Manual test result" sections={[{ id: "result", rows: [
          { id: "monitor", label: "Monitor", value: result.input.monitorId.toUpperCase() },
          { id: "txp", label: "Target TXP", value: result.input.transponderId.toUpperCase() },
          { id: "replies", label: "Reply Count", value: `${result.replyCount} / ${result.input.interrogationCount}` },
          { id: "efficiency", label: "Efficiency", value: `${result.efficiencyPct.toFixed(1)} %`, tone: result.passed ? "normal" : "alarm" },
          { id: "time", label: "Executed", value: new Date(result.executedAtMs).toLocaleString("en-GB", { hour12: false }) },
        ]}]} />
      </> : <p>No manual test has been executed in this simulation.</p>}{message ? <div className={styles.inlineNotice}>{message}</div> : null}</section>
    </div>
  </MaintenanceFrame>;
}

function CertificationScreen({ props }: { props: Dme320ScreenProps }) {
  const [monitorId, setMonitorId] = useState<Dme320MonitorId>("mon1");
  const [parameter, setParameter] = useState<Dme320MonitorParameter>("timeDelayUs");
  const limit = props.simulation.config.running.monitor.limits[parameter];
  const defaultValue = certificationTestValue(limit.nominal, limit.alarmLow, limit.alarmHigh);
  const [testValue, setTestValue] = useState(defaultValue);
  const [message, setMessage] = useState<string | null>(null);
  function selectParameter(next: Dme320MonitorParameter) {
    setParameter(next);
    const nextLimit = props.simulation.config.running.monitor.limits[next];
    setTestValue(certificationTestValue(nextLimit.nominal, nextLimit.alarmLow, nextLimit.alarmHigh));
  }
  function run() {
    const value = parameter === "identCode" ? testValue : Number(testValue);
    const result = props.dispatch({ type: "run-certification", monitorId, parameter, testValue: value });
    setMessage(result.message);
  }
  const result = props.simulation.lastCertification;
  return <MaintenanceFrame props={props} subtitle="Verify alarm detection and executive action timing for each monitor parameter">
    <div className={styles.setupGrid}>
      <section className={styles.setupSection}><h3>Certification Input</h3>
        <Field label="Monitor"><select className={styles.selectInput} value={monitorId} onChange={(event) => setMonitorId(event.currentTarget.value as Dme320MonitorId)}>{MONITOR_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></Field>
        <Field label="Parameter"><select className={styles.selectInput} value={parameter} onChange={(event) => selectParameter(event.currentTarget.value as Dme320MonitorParameter)}>{DME320_MONITOR_PARAMETERS.map((id) => <option key={id} value={id}>{DME320_PARAMETER_LABELS[id]}</option>)}</select></Field>
        <MopiensPropertyGrid ariaLabel="Certification alarm definition" sections={[{ id: "limits", rows: [
          { id: "range", label: "Alarm Range", value: `${limit.alarmLow ?? "-∞"} … ${limit.alarmHigh ?? "+∞"} ${limit.unit}` },
          { id: "delay", label: "Alarm Delay", value: `${limit.alarmDelayMs} ms` },
          { id: "class", label: "Classification", value: limit.classification.toUpperCase() },
          { id: "action", label: "Action Delay", value: `${props.simulation.config.running.monitor.monitorActionDelayMs} ms` },
        ]}]} />
        <Field label="Test Value" unit={limit.unit}><input className={styles.textInput} value={testValue} onChange={(event) => setTestValue(event.currentTarget.value)} /></Field>
        <MopiensBeveledButton tone="primary" onClick={run}>Run Certification</MopiensBeveledButton>
      </section>
      <section className={styles.setupSection}><h3>Latest Timing Result</h3>{result ? <>
        <MopiensStatusIndicator appearance="ring" label={result.passed ? "PASS" : "FAIL"} detail={result.message} tone={result.passed ? "normal" : "alarm"} />
        <div className={styles.timeline} aria-label="Certification timing sequence">
          <span><strong>Start</strong><small>{result.startAtMs} ms</small></span>
          <span><strong>Alarm Detection</strong><small>+{result.alarmDetectedAtMs - result.startAtMs} ms</small></span>
          <span><strong>Monitor Action</strong><small>+{result.actionAtMs - result.startAtMs} ms</small></span>
        </div>
        <MopiensPropertyGrid ariaLabel="Certification result" sections={[{ id: "result", rows: [
          { id: "monitor", label: "Monitor", value: result.monitorId.toUpperCase() },
          { id: "parameter", label: "Parameter", value: DME320_PARAMETER_LABELS[result.parameter] },
          { id: "test", label: "Test Value", value: formatReading(result.testValue, props.simulation.config.running.monitor.limits[result.parameter].unit) },
          { id: "expected", label: "Expected Action Delay", value: `${result.expectedActionDelayMs} ms` },
        ]}]} />
      </> : <p>No monitor certification has been run.</p>}{message ? <div className={styles.inlineNotice}>{message}</div> : null}</section>
    </div>
  </MaintenanceFrame>;
}

function AdvancedTransponderScreen({ props }: { props: Dme320ScreenProps }) {
  const [message, setMessage] = useState<string | null>(null);
  function execute(command: Dme320Command): Dme320CommandResult { const result = props.dispatch(command); setMessage(result.message); return result; }
  return <MaintenanceFrame props={props} subtitle="Figure 4-114 controls for squitter, IDENT keying, RF loopback, and pulse-spacing offset">
    <div className={styles.advancedTxGrid}>{TRANSPONDER_IDS.map((transponderId) => {
      const tx = props.simulation.transmitters[transponderId];
      const revision = [
        props.simulation.equipmentResetRevision,
        tx.squitterEnabled,
        tx.identKeying,
        tx.rfLoopbackEnabled,
        tx.spacingOffsetUs,
      ].join(":");
      return <AdvancedTransponderPanel key={`${transponderId}:${revision}`} props={props} transponderId={transponderId} execute={execute} />;
    })}</div>
    <div className={styles.actionRow}><MopiensBeveledButton tone="warning" onClick={() => execute({ type: "changeover" })}>Change Over</MopiensBeveledButton><MopiensBeveledButton onClick={() => execute({ type: "set-interlock", active: !props.simulation.interlockActive })}>{props.simulation.interlockActive ? "Clear Interlock" : "Set Interlock"}</MopiensBeveledButton><MopiensBeveledButton tone="warning" onClick={() => execute({ type: "reset-system" })}>System Reset</MopiensBeveledButton></div>
    {message ? <div className={styles.inlineNotice}>{message}</div> : null}
  </MaintenanceFrame>;
}

function AdvancedTransponderPanel({
  props,
  transponderId,
  execute,
}: {
  props: Dme320ScreenProps;
  transponderId: Dme320TransponderId;
  execute: (command: Dme320Command) => Dme320CommandResult;
}) {
  const tx = props.simulation.transmitters[transponderId];
  const label = transponderId.toUpperCase();
  const [squitterDraft, setSquitterDraft] = useState<boolean | null>(null);
  const [identDraft, setIdentDraft] = useState<Dme320IdentKeyingMode | null>(null);
  const [rfLoopbackDraft, setRfLoopbackDraft] = useState<boolean | null>(null);
  const [spacingOffsetDraft, setSpacingOffsetDraft] = useState<string | null>(null);
  const squitterEnabled = squitterDraft ?? tx.squitterEnabled;
  const identKeying = identDraft ?? tx.identKeying;
  const rfLoopbackEnabled = rfLoopbackDraft ?? tx.rfLoopbackEnabled;
  const spacingOffsetUs = spacingOffsetDraft ?? String(tx.spacingOffsetUs);

  return <section className={styles.advancedTxPanel} aria-label={`${label} Advanced Controls`}>
    <div className={styles.panelHeading}>
      <h3>{label}</h3>
      <MopiensStatusIndicator compact label={props.simulation.mainTransponder === transponderId ? "MAIN" : "STANDBY"} detail={tx.route === "antenna" ? "On Antenna" : "On Dummy Load"} tone={tx.shutdown ? "alarm" : tx.dcPower === "off" ? "inactive" : "normal"} />
    </div>

    <fieldset className={styles.advancedControlGroup}>
      <legend>Squitter Pulse</legend>
      <div className={styles.radioRow}>
        {([true, false] as const).map((enabled) => <label key={`${enabled}`}><input type="radio" name={`${transponderId}-squitter`} checked={squitterEnabled === enabled} onChange={() => setSquitterDraft(enabled)} /><span>{enabled ? "On" : "Off"}</span></label>)}
      </div>
      <MopiensBeveledButton aria-label={`Apply ${label} Squitter`} onClick={() => { execute({ type: "set-transponder-squitter", transponderId, enabled: squitterEnabled }); setSquitterDraft(null); }}>Apply</MopiensBeveledButton>
      <small>Current: {tx.squitterEnabled ? "On" : "Off"}</small>
    </fieldset>

    <fieldset className={styles.advancedControlGroup}>
      <legend>IDENT Keying</legend>
      <div className={styles.radioRow}>
        {(["on", "off", "continuous"] as const).map((mode) => <label key={mode}><input type="radio" name={`${transponderId}-ident`} checked={identKeying === mode} onChange={() => setIdentDraft(mode)} /><span>{mode === "continuous" ? "Continuous" : mode === "on" ? "On" : "Off"}</span></label>)}
      </div>
      <MopiensBeveledButton aria-label={`Apply ${label} IDENT Keying`} onClick={() => { execute({ type: "set-transponder-ident-keying", transponderId, mode: identKeying }); setIdentDraft(null); }}>Apply</MopiensBeveledButton>
      <small>Current: {formatStatus(tx.identKeying)}</small>
    </fieldset>

    <fieldset className={styles.advancedControlGroup}>
      <legend>RF Loopback (TX to RX)</legend>
      <div className={styles.radioRow}>
        {([true, false] as const).map((enabled) => <label key={`${enabled}`}><input type="radio" name={`${transponderId}-loopback`} checked={rfLoopbackEnabled === enabled} onChange={() => setRfLoopbackDraft(enabled)} /><span>{enabled ? "On" : "Off"}</span></label>)}
      </div>
      <MopiensBeveledButton aria-label={`Apply ${label} RF Loopback`} onClick={() => { execute({ type: "set-transponder-rf-loopback", transponderId, enabled: rfLoopbackEnabled }); setRfLoopbackDraft(null); }}>Apply</MopiensBeveledButton>
      <small>Current: {tx.rfLoopbackEnabled ? "On" : "Off"}</small>
    </fieldset>

    <fieldset className={styles.advancedControlGroup}>
      <legend>Spacing</legend>
      <Field label={`${label} Spacing Offset`} unit="µs"><input className={styles.numberInput} type="number" step="0.01" value={spacingOffsetUs} onChange={(event) => setSpacingOffsetDraft(event.currentTarget.value)} /></Field>
      <MopiensBeveledButton aria-label={`Apply ${label} Spacing Offset`} disabled={spacingOffsetUs.trim() === "" || !Number.isFinite(Number(spacingOffsetUs))} onClick={() => { execute({ type: "set-transponder-spacing-offset", transponderId, offsetUs: Number(spacingOffsetUs) }); setSpacingOffsetDraft(null); }}>Apply</MopiensBeveledButton>
      <small>Current: {tx.spacingOffsetUs.toFixed(2)} µs</small>
    </fieldset>

    <div className={styles.advancedOperationalControls}>
      <MopiensSlideSwitch label={`${label} DC Power`} checked={tx.dcPower === "on"} onCheckedChange={(on) => execute({ type: "set-transponder-power", transponderId, on })} />
      <MopiensSlideSwitch label={`${label} RF Output`} checked={tx.rfEnabled} disabled={tx.dcPower === "off"} onCheckedChange={(enabled) => execute({ type: "set-transponder-rf", transponderId, enabled })} />
      <MopiensBeveledButton pressed={props.simulation.mainTransponder === transponderId} onClick={() => execute({ type: "select-main", transponderId })}>Select {label} Main</MopiensBeveledButton>
    </div>
  </section>;
}

function AdvancedMonitorScreen({ props }: { props: Dme320ScreenProps }) {
  const [monitorId, setMonitorId] = useState<Dme320MonitorId>("mon1");
  const [channel, setChannel] = useState<Dme320MonitorChannel>("executive");
  const [parameter, setParameter] = useState<Dme320MonitorParameter>("timeDelayUs");
  const currentReading = props.simulation.monitors[monitorId].channels[channel].readings[parameter];
  const [value, setValue] = useState(String(currentReading.value ?? ""));
  const [valid, setValid] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  function execute(command: Parameters<typeof props.dispatch>[0]) { const result = props.dispatch(command); setMessage(result.message); }
  function selectParameter(next: Dme320MonitorParameter) { setParameter(next); const reading = props.simulation.monitors[monitorId].channels[channel].readings[next]; setValue(String(reading.value ?? "")); }
  return <MaintenanceFrame props={props} subtitle="Monitor action mode and injected interrogation/reading controls">
    <div className={styles.setupGrid}>
      <section className={styles.setupSection}><h3>Monitor Action</h3>{MONITOR_IDS.map((id) => <MopiensSlideSwitch key={id} label={`${id.toUpperCase()} Executive Action`} checked={props.simulation.monitors[id].mode === "auto"} onLabel="AUTO" offLabel="BYPASS" tone={props.simulation.monitors[id].mode === "auto" ? "normal" : "warning"} onCheckedChange={(automatic) => execute({ type: "set-monitor-mode", monitorId: id, mode: automatic ? "auto" : "bypass" })} />)}</section>
      <section className={styles.setupSection}><h3>Manual Reading Injection</h3>
        <Field label="Monitor"><select className={styles.selectInput} value={monitorId} onChange={(event) => setMonitorId(event.currentTarget.value as Dme320MonitorId)}>{MONITOR_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></Field>
        <Field label="Channel"><select className={styles.selectInput} value={channel} onChange={(event) => setChannel(event.currentTarget.value as Dme320MonitorChannel)}>{MONITOR_CHANNELS.map((id) => <option key={id} value={id}>{formatStatus(id)}</option>)}</select></Field>
        <Field label="Parameter"><select className={styles.selectInput} value={parameter} onChange={(event) => selectParameter(event.currentTarget.value as Dme320MonitorParameter)}>{DME320_MONITOR_PARAMETERS.map((id) => <option key={id} value={id}>{DME320_PARAMETER_LABELS[id]}</option>)}</select></Field>
        <Field label="Injected Value" unit={props.simulation.config.running.monitor.limits[parameter].unit}><input className={styles.textInput} value={value} onChange={(event) => setValue(event.currentTarget.value)} /></Field>
        <MopiensSlideSwitch label="Reading Valid" checked={valid} onCheckedChange={setValid} />
        <div className={styles.actionRow}><MopiensBeveledButton tone="primary" onClick={() => execute({ type: "inject-measurement", override: { monitorId, channel, parameter, value: parameter === "identCode" ? value : value === "" ? null : Number(value), valid } })}>Apply Injection</MopiensBeveledButton><MopiensBeveledButton onClick={() => execute({ type: "clear-measurement", monitorId, channel, parameter })}>Clear Injection</MopiensBeveledButton></div>
      </section>
      <section className={styles.setupSection}><h3>Current Reading</h3><MopiensPropertyGrid ariaLabel="Selected monitor reading" sections={[{ id: "reading", rows: [
        { id: "value", label: "Value", value: formatReading(currentReading.value, props.simulation.config.running.monitor.limits[parameter].unit) },
        { id: "valid", label: "Validity", value: currentReading.valid ? "VALID" : "INVALID", tone: currentReading.valid ? "normal" : "alarm" },
        { id: "masked", label: "ERP Mask", value: currentReading.masked ? "MASKED" : "VISIBLE", tone: currentReading.masked ? "warning" : "normal" },
        { id: "alarm", label: "Alarm Phase", value: formatStatus(props.simulation.monitors[monitorId].channels[channel].alarms[parameter].phase), tone: toneForAlarmPhase(props.simulation.monitors[monitorId].channels[channel].alarms[parameter].phase) },
      ]}]} /></section>
    </div>{message ? <div className={styles.inlineNotice}>{message}</div> : null}
  </MaintenanceFrame>;
}

function FaultControlScreen({ props }: { props: Dme320ScreenProps }) {
  const [kind, setKind] = useState<Dme320FaultKind>("hpa-low-output");
  const [target, setTarget] = useState<Dme320FaultTarget>(DEFAULT_FAULT_TARGET["hpa-low-output"]);
  const [message, setMessage] = useState<string | null>(null);
  const activeFaults = props.simulation.faults.filter((fault) => fault.active);
  function chooseKind(next: Dme320FaultKind) { setKind(next); setTarget(DEFAULT_FAULT_TARGET[next]); }
  function execute(command: Parameters<typeof props.dispatch>[0]) { const result = props.dispatch(command); setMessage(result.message); }
  return <MaintenanceFrame props={props} subtitle="Inject and clear physical-equipment fault conditions used by the DME engine">
    <div className={styles.setupGrid}><section className={styles.setupSection}><h3>Fault Injection</h3>
      <Field label="Fault"><select className={styles.selectInput} value={kind} onChange={(event) => chooseKind(event.currentTarget.value as Dme320FaultKind)}>{FAULT_KINDS.map((id) => <option key={id} value={id}>{DME320_FAULT_CATALOG[id].component} - {formatStatus(id)}</option>)}</select></Field>
      <Field label="Target"><select className={styles.selectInput} value={target} onChange={(event) => setTarget(event.currentTarget.value as Dme320FaultTarget)}>{FAULT_TARGETS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></Field>
      <MopiensPropertyGrid ariaLabel="Selected fault effects" sections={[{ id: "fault", rows: [
        { id: "component", label: "Component", value: DME320_FAULT_CATALOG[kind].component },
        { id: "symptoms", label: "Expected Symptoms", value: DME320_FAULT_CATALOG[kind].symptoms.join("; ") },
        { id: "calibration", label: "Blocked Calibration Steps", value: DME320_FAULT_CATALOG[kind].calibrationSteps.join(", ") || "None" },
      ]}]} />
      <MopiensBeveledButton tone="danger" onClick={() => execute({ type: "inject-fault", fault: { id: `fault-${kind}-${target}-${props.simulation.faults.length + 1}`, kind, target } })}>Inject Fault</MopiensBeveledButton>
    </section><section className={styles.setupSection}><h3>Environment Injection</h3>
      <MopiensSlideSwitch label="Smoke Detector" checked={props.simulation.environment.smokeDetected} tone={props.simulation.environment.smokeDetected ? "alarm" : "normal"} onCheckedChange={(smokeDetected) => execute({ type: "set-environment", changes: { smokeDetected } })} />
      <MopiensSlideSwitch label="Intrusion Detector" checked={props.simulation.environment.intrusionDetected} tone={props.simulation.environment.intrusionDetected ? "alarm" : "normal"} onCheckedChange={(intrusionDetected) => execute({ type: "set-environment", changes: { intrusionDetected } })} />
      <Field label="Cabinet Temperature" unit="°C"><input className={styles.numberInput} type="number" step="0.1" value={props.simulation.environment.temperatureC} onChange={(event) => execute({ type: "set-environment", changes: { temperatureC: Number(event.currentTarget.value) } })} /></Field>
      <MopiensSlideSwitch label="AC Mains Available" checked={props.simulation.power.acAvailable} onCheckedChange={(available) => execute({ type: "set-ac-available", available })} />
    </section></div>
    {message ? <div className={styles.inlineNotice}>{message}</div> : null}
    <MopiensTable caption="Injected fault records" rows={[...props.simulation.faults].reverse()} dense emptyLabel="No faults have been injected" getRowId={(row) => row.id} rowTone={(row) => row.active ? "alarm" : "inactive"} columns={[
      { id: "active", label: "State", width: "10%", render: (row) => row.active ? "ACTIVE" : "CLEARED" },
      { id: "component", label: "Component", width: "18%", render: (row) => DME320_FAULT_CATALOG[row.kind].component },
      { id: "kind", label: "Fault", render: (row) => formatStatus(row.kind) },
      { id: "target", label: "Target", width: "12%", render: (row) => row.target.toUpperCase() },
      { id: "time", label: "Injected", width: "18%", render: (row) => new Date(row.injectedAtMs).toLocaleString("en-GB", { hour12: false }) },
      { id: "clear", label: "Control", width: "12%", align: "right", render: (row) => <MopiensBeveledButton disabled={!row.active} onClick={() => execute({ type: "clear-fault", faultId: row.id })}>Clear</MopiensBeveledButton> },
    ]} />
    {activeFaults.length ? <small>{activeFaults.length} active fault(s) currently influence the simulation.</small> : null}
  </MaintenanceFrame>;
}

function UserManagementScreen({ props }: { props: Dme320ScreenProps }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState<Exclude<Dme320SecurityLevel, 0>>(1);
  const [message, setMessage] = useState<string | null>(null);
  function execute(command: Parameters<typeof props.dispatch>[0]) { const result = props.dispatch(command); setMessage(result.message); if (result.accepted && command.type === "add-account") { setUserId(""); setPassword(""); } }
  return <MaintenanceFrame props={props} access="level3" subtitle="PMDT user accounts and security levels 1 through 3">
    <div className={styles.setupGrid}><section className={styles.setupSection}><h3>Add User</h3>
      <Field label="User ID"><input className={styles.textInput} autoComplete="off" value={userId} onChange={(event) => setUserId(event.currentTarget.value)} /></Field>
      <Field label="Password"><input className={styles.textInput} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} /></Field>
      <Field label="Security Level"><select className={styles.selectInput} value={level} onChange={(event) => setLevel(Number(event.currentTarget.value) as Exclude<Dme320SecurityLevel, 0>)}><option value={1}>Level 1 - Read only</option><option value={2}>Level 2 - Operation / setup</option><option value={3}>Level 3 - Maintenance / users</option></select></Field>
      <MopiensBeveledButton tone="primary" disabled={!userId.trim() || !password} onClick={() => execute({ type: "add-account", account: { userId: userId.trim(), password, level } })}>Add User</MopiensBeveledButton>
    </section><section className={styles.setupSection}><h3>Access Privileges</h3><MopiensPropertyGrid ariaLabel="DME access privileges" sections={[{ id: "levels", rows: [
      { id: "level1", label: "Level 1", value: "Read-only access" },
      { id: "level2", label: "Level 2", value: "Basic controls and setup" },
      { id: "level3", label: "Level 3", value: "Calibration, diagnostics, user management" },
    ]}]} /></section></div>
    {message ? <div className={styles.inlineNotice}>{message}</div> : null}
    <MopiensTable caption="Configured security accounts" rows={props.simulation.accounts} dense getRowId={(row) => row.userId} columns={[
      { id: "user", label: "User ID", render: (row) => <strong>{row.userId}</strong> },
      { id: "level", label: "Security Level", width: "20%", render: (row) => `Level ${row.level}` },
      { id: "session", label: "Session", width: "20%", render: (row) => props.simulation.session.userId === row.userId ? "LOGGED IN" : "-" },
      { id: "delete", label: "Control", align: "right", width: "16%", render: (row) => <MopiensBeveledButton tone="danger" disabled={props.simulation.session.userId === row.userId} onClick={() => execute({ type: "delete-account", userId: row.userId })}>Delete</MopiensBeveledButton> },
    ]} />
  </MaintenanceFrame>;
}

function TimeScreen({ props }: { props: Dme320ScreenProps }) {
  const [message, setMessage] = useState<string | null>(null);
  function advance(ms: number) { const result = props.advanceBy(ms); setMessage(result?.message ?? `Advanced simulated equipment time by ${ms} ms.`); }
  function sync() { const result = props.syncClock(); setMessage(result?.message ?? "Equipment time synchronized to the injected clock."); }
  const date = new Date(props.simulation.nowMs);
  return <MaintenanceFrame props={props} subtitle="Equipment UTC clock and injected-clock synchronization">
    <section className={styles.clockPanel}><span>Equipment Time</span><strong>{date.toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" })}</strong><small>{date.toLocaleDateString("en-CA", { timeZone: "UTC" })} UTC</small></section>
    <div className={styles.actionRow}><MopiensBeveledButton onClick={() => advance(1_000)}>+1 second</MopiensBeveledButton><MopiensBeveledButton onClick={() => advance(60_000)}>+1 minute</MopiensBeveledButton><MopiensBeveledButton onClick={() => advance(3_600_000)}>+1 hour</MopiensBeveledButton><MopiensBeveledButton tone="primary" onClick={sync}>Sync Injected Clock</MopiensBeveledButton></div>
    {message ? <div className={styles.inlineNotice}>{message}</div> : null}
    <MopiensPropertyGrid ariaLabel="Time synchronization state" sections={[{ id: "time", rows: [
      { id: "source", label: "Time Source", value: "Simulator injected clock" },
      { id: "epoch", label: "Epoch", value: `${props.simulation.nowMs} ms` },
      { id: "power-update", label: "Power Last Updated", value: new Date(props.simulation.power.lastUpdatedAtMs).toLocaleString("en-GB", { hour12: false }) },
      { id: "session", label: "Session Last Activity", value: new Date(props.simulation.session.lastActivityAtMs).toLocaleString("en-GB", { hour12: false }) },
    ]}]} />
  </MaintenanceFrame>;
}

function VersionScreen({ props }: { props: Dme320ScreenProps }) {
  const lmiFault = props.simulation.faults.some((fault) => fault.active && fault.kind === "lmi-link-failure");
  const rows = useMemo(() => [
    { subrack: "AUX", unit: "SCU", reference: "1A1", hardware: "SIM", software: "DME320-SCU", state: props.simulation.systemShutdown ? "Shutdown" : "Running" },
    { subrack: "AUX", unit: "LMI", reference: "1A6", hardware: "SIM", software: "DME320-LMI", state: lmiFault ? "Comm Fault" : "Online" },
    { subrack: "AUX", unit: "EMU", reference: "1A8", hardware: "SIM", software: "DME320-EMU", state: props.simulation.environment.present ? "Present" : "Not Present" },
    ...TRANSPONDER_IDS.flatMap((transponderId, index) => [
      { subrack: transponderId.toUpperCase(), unit: "TCU", reference: `${index + 2}A1`, hardware: "SIM", software: "DME320-TCU", state: props.simulation.transmitters[transponderId].present ? "Present" : "Not Present" },
      { subrack: transponderId.toUpperCase(), unit: "TXU", reference: `${index + 2}A3`, hardware: "SIM", software: "DME320-TXU", state: props.simulation.transmitters[transponderId].shutdown ? "Shutdown" : "Normal" },
    ]),
    ...MONITOR_IDS.map((monitorId, index) => ({ subrack: "MON", unit: monitorId.toUpperCase(), reference: `4A${index + 1}`, hardware: "SIM", software: "DME320-MON", state: props.simulation.monitors[monitorId].present ? formatStatus(props.simulation.monitors[monitorId].mode) : "Not Present" })),
  ], [lmiFault, props.simulation]);
  return <MaintenanceFrame props={props} access="read" subtitle="Modeled unit inventory, hardware identity, and simulator software profile">
    <MopiensTable caption="DME 320 unit versions" rows={rows} dense getRowId={(row) => `${row.subrack}-${row.reference}`} columns={[
      { id: "subrack", label: "Subrack", width: "12%", render: (row) => row.subrack },
      { id: "unit", label: "Unit", width: "15%", render: (row) => row.unit },
      { id: "reference", label: "Ref. Des.", width: "15%", render: (row) => row.reference },
      { id: "hardware", label: "Hardware Revision", width: "18%", render: (row) => row.hardware },
      { id: "software", label: "Software Version", render: (row) => row.software },
      { id: "state", label: "Status", width: "18%", render: (row) => row.state },
    ]} />
    <MopiensPropertyGrid ariaLabel="Simulator version information" sections={[{ id: "simulator", title: "Simulator Model", rows: [
      { id: "equipment", label: "Equipment", value: "MOPIENS 320 DME" },
      { id: "manual", label: "Reference Manual", value: "310/320 DME Technical Manual, Rev. C / 2022-12-19" },
      { id: "profile", label: "Configuration Profile", value: props.simulation.config.flashDirty ? "Running profile differs from Flash" : "Running profile stored in Flash", tone: props.simulation.config.flashDirty ? "warning" : "normal" },
      { id: "clock", label: "Equipment Clock", value: new Date(props.simulation.nowMs).toISOString() },
    ]}]} />
  </MaintenanceFrame>;
}
