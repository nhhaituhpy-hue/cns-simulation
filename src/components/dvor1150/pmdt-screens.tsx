"use client";

import { useRef, useState, type ReactNode } from "react";
import type {
  Dvor1150Config,
  Dvor1150FaultSample,
  Dvor1150GroundCheckData,
  Dvor1150IndicatorColor,
  Dvor1150LogEntry,
  Dvor1150MonitorId,
  Dvor1150MonitorParameter,
  Dvor1150ScreenId,
  Dvor1150ViewId,
} from "@/lib/dvor1150";
import { formatDvor1150Timestamp, getDvor1150ConfigValue, isDvor1150ScenarioStudentEditable } from "@/lib/dvor1150";
import { getDvor1150SynthesizerSwitches } from "@/lib/dvor1150/config-utils";
import { dvor1150AdStatus } from "@/lib/dvor1150/engine";
import type { Dvor1150AdRow } from "@/lib/dvor1150/types";
import { canEditDvor1150SecurityCodes, type Dvor1150SecurityCodeEdit, useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { Dvor1150ConfigControl } from "./pmdt-config-control";
import { Dvor1150Toolbar } from "./pmdt-toolbar";

const tabLabels: Record<string, string> = {
  "rms-maintenance-alerts": "Maintenance Alerts/Alarms",
  "rms-ad-data": "A/D Data",
  "rms-logs-operational-summary": "Operational Summary",
  "rms-logs-alarms": "Alarms",
  "rms-logs-maintenance-alerts": "Maintenance Alerts",
  "rms-logs-command-activity": "Command Activity",
  "rms-logs-parameter-change": "Parameter Change",
  "rms-config-general": "General",
  "rms-config-station": "Station",
  "rms-config-ad-limits": "A/D Limits",
  "rms-config-security-codes": "Security Codes",
  "monitor-integrity": "Integrity",
  "monitor-ground-check": "Ground Check",
  "monitor-certification": "Certification Test Results",
  "monitor-test-data": "Test Data",
  "monitor-notch": "Notch Monitor",
  "monitor-sideband-vswr": "Sideband Antenna VSWR",
  "monitor-standby": "Standby",
  "monitor-fault-history-data": "Monitor Data",
  "monitor-fault-history-system-status": "System Status",
  "monitor-alarm-limits": "Alarm Limits",
  "monitor-offsets": "Offsets and Scale Factors",
  "tx-data-tx1": "Transmitter 1",
  "tx-data-tx2": "Transmitter 2",
  "tx-config-nominal": "Nominal",
  "tx-config-offsets": "Offsets and Scale Factors",
  "diagnostics-power-up": "Power Up Results",
  "diagnostics-fault-isolation": "Fault Isolation",
};

const parameterMeta: Record<Dvor1150MonitorParameter, { label: string; unit: string; digits: number }> = {
  azimuth: { label: "Azimuth Angle", unit: "°", digits: 2 },
  hz30Modulation: { label: "30 Hz Modulation", unit: "%", digits: 1 },
  hz9960Modulation: { label: "9960 Hz Modulation", unit: "%", digits: 1 },
  deviation: { label: "Deviation", unit: "Ratio", digits: 1 },
  rfLevel: { label: "RF Level", unit: "dB", digits: 1 },
};

const parameterOrder: readonly Dvor1150MonitorParameter[] = [
  "azimuth",
  "hz30Modulation",
  "hz9960Modulation",
  "deviation",
  "rfLevel",
];

const alarmBands = ["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] as const;
// alarmBands array is used directly; no separate type alias needed

function statusClass(indicator: Dvor1150IndicatorColor): string {
  return `dvor1150-status-cell--${indicator}`;
}

function StatusBox({ indicator, value }: { indicator: Dvor1150IndicatorColor; value?: string }) {
  return <span className={`dvor1150-status-box ${statusClass(indicator)}`}>{value ?? (indicator === "green" ? "G" : indicator === "yellow" ? "Y" : indicator === "red" ? "R" : "")}</span>;
}

function Readout({ value, indicator = "green" }: { value: string | number; indicator?: Dvor1150IndicatorColor }) {
  return <span className={`dvor1150-readout ${statusClass(indicator)}`}>{String(value)}</span>;
}

function StaticInput({ value, className = "" }: { value: string | number; className?: string }) {
  return <input className={`dvor1150-control dvor1150-static-control ${className}`} value={String(value)} disabled readOnly />;
}

function StaticSelect({ value }: { value: string }) {
  return <select className="dvor1150-control dvor1150-static-control" value={value} disabled onChange={() => undefined}><option>{value}</option></select>;
}

function DateBox({ value }: { value: string }) {
  return <time className="dvor1150-date">{value}</time>;
}

function ScreenTabs({ screenId, activeView, views }: { screenId: Dvor1150ScreenId; activeView: Dvor1150ViewId; views: readonly Dvor1150ViewId[] }) {
  const openView = useDvor1150PmdtStore((state) => state.openView);
  return <div className="dvor1150-tabs" role="tablist">
    {views.map((view) => <button key={view} type="button" role="tab" aria-selected={activeView === view} onClick={() => openView(screenId, view, [tabLabels[view] ?? view])}>{tabLabels[view] ?? view}</button>)}
  </div>;
}

function Screen({ title, children, tabs, securityDraftDirty }: { title: string; children: ReactNode; tabs?: ReactNode; securityDraftDirty?: boolean }) {
  const copyable = useDvor1150PmdtStore((state) => state.activeScreen === "rms-logs");
  const screen = useRef<HTMLElement>(null);
  const readCopyText = copyable ? () => Array.from(screen.current?.querySelectorAll<HTMLTableRowElement>("table tr") ?? [])
    .map((row) => Array.from(row.cells, (cell) => cell.textContent?.trim() ?? "").join("\t")).join("\n") : undefined;
  return <section className="dvor1150-screen" ref={screen}><Dvor1150Toolbar title={title} nextAvailable={Boolean(tabs)}
    readCopyText={readCopyText} securityDraftDirty={securityDraftDirty} />{tabs}{children}</section>;
}

function ConfigRow({ label, fieldId, unit, type, digits, mirrorFieldIds }: { label: string; fieldId: string; unit?: string; type?: "number" | "text" | "boolean" | "select"; digits?: number; mirrorFieldIds?: readonly string[] }) {
  return <div className="dvor1150-config-row"><span className="dvor1150-config-label">{label}</span><Dvor1150ConfigControl fieldId={fieldId} type={type} digits={digits} mirrorFieldIds={mirrorFieldIds} /><span className="dvor1150-config-unit">{unit ?? ""}</span></div>;
}

function ConfigRadio({ fieldId, value, label }: { fieldId: string; value: string; label: string }) {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const security = useDvor1150PmdtStore((state) => state.securityLevel);
  const local = useDvor1150PmdtStore((state) => state.config.simulation.local);
  const scenario = useDvor1150PmdtStore((state) => state.scenario);
  const setConfigValue = useDvor1150PmdtStore((state) => state.setConfigValue);
  const editable = security >= 3 && local && (!scenario.active || Boolean(
    scenario.definition && isDvor1150ScenarioStudentEditable(scenario.definition, fieldId),
  ));
  return <label className="dvor1150-config-radio"><input type="radio" checked={getDvor1150ConfigValue(config, fieldId) === value} disabled={!editable} onChange={() => setConfigValue(fieldId, value)} />{label}</label>;
}

function formatNumber(value: number | null, digits: number): string {
  return value === null ? "" : value.toFixed(digits);
}

export function Dvor1150HomeScreen() {
  return <section className="dvor1150-screen dvor1150-empty-screen" aria-label="PMDT workspace" />;
}

export function Dvor1150RmsStatusScreen() {
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  return <Screen title="RMS Status"><div className="dvor1150-content dvor1150-rms-status-content"><DateBox value={data.timestamp} /><fieldset className="dvor1150-panel"><legend>RMS Status</legend><table className="dvor1150-table"><tbody>{data.maintenanceAlerts.map((row) => <tr key={row.label}><th>{row.label}</th><td><StatusBox indicator={row.indicator} /></td></tr>)}</tbody></table></fieldset></div></Screen>;
}

function AdDataTable({ title, rows, temperature = false }: { title: string; rows: readonly Dvor1150AdRow[]; temperature?: boolean }) {
  return <fieldset className={`dvor1150-panel dvor1150-ad-panel ${temperature ? "dvor1150-temperature-panel" : ""}`}><legend>{title}</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Lo Limit</th><th>Data</th><th>Hi Limit</th><th>Unit</th></tr></thead><tbody>{rows.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td><StaticInput value={row.low.toFixed(2)} /></td><td><Readout value={row.value.toFixed(2)} indicator={dvor1150AdStatus(row)} /></td><td><StaticInput value={row.high.toFixed(2)} /></td><td>{row.unit}</td></tr>)}</tbody></table></fieldset>;
}

function RmsMaintenanceAlerts() {
  const { data, monitors } = useDvor1150PmdtStore((state) => state.derived);
  const update = useDvor1150PmdtStore((state) => state.refreshClock);
  return <div className="dvor1150-alert-log-panel">
    <div className="dvor1150-log-actions"><button type="button" onClick={update}>Update</button><button type="button" disabled title="Live alerts clear when their conditions clear">Reset</button></div>
    <table className="dvor1150-table"><thead><tr><th>Alert</th><th>Source</th><th>Status</th></tr></thead>
      <tbody>{data.maintenanceAlerts.map((row) => <tr key={row.label}><th>{row.label}</th><td>RMS</td><td><StatusBox indicator={row.indicator} /></td></tr>)}
        {(["mon1", "mon2"] as const).filter((id) => monitors[id].commStatus !== "gray").map((id) => <tr key={id}><th>Integrity</th><td>{id === "mon1" ? "Monitor 1" : "Monitor 2"}</td><td><StatusBox indicator={monitors[id].healthy ? "green" : "red"} value={monitors[id].healthy ? "Normal" : "Alarm"} /></td></tr>)}
      </tbody>
    </table>
  </div>;
}

export function Dvor1150RmsDataScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  const dual = useDvor1150PmdtStore((state) => state.config.station.transmitterConfig === "Dual Transmitters");
  const temperatures = data.temperatureData.slice(1, dual ? 3 : 2);
  return <Screen title="RMS Data" tabs={<ScreenTabs screenId="rms-data" activeView={activeView} views={["rms-maintenance-alerts", "rms-ad-data"]} />}><div className="dvor1150-content">{activeView === "rms-ad-data" ? <><DateBox value={data.timestamp} /><div className="dvor1150-ad-data-grid"><AdDataTable title="Transmitter 1" rows={data.adDataByTransmitter.tx1} />{dual ? <AdDataTable title="Transmitter 2" rows={data.adDataByTransmitter.tx2} /> : null}<AdDataTable title="Temperature" rows={temperatures} temperature /></div></> : <RmsMaintenanceAlerts />}</div></Screen>;
}

function RmsLogActions({ onReset, children }: { onReset: () => void; children?: ReactNode }) {
  const update = useDvor1150PmdtStore((state) => state.refreshClock);
  const canReset = useDvor1150PmdtStore((state) => state.securityLevel >= 3 && state.config.simulation.local && !state.loginDialogOpen);
  return <div className="dvor1150-log-actions"><button type="button" onClick={update}>Update</button><button type="button" disabled={!canReset} onClick={onReset}>{children ?? "Reset"}</button></div>;
}

function LogTable({ mode }: { mode: NonNullable<Dvor1150LogEntry["kind"]> }) {
  const all = useDvor1150PmdtStore((state) => state.derived.data.logs);
  const reset = useDvor1150PmdtStore((state) => state.resetRmsLog);
  const rows = all.filter((row) => (row.kind ?? "command") === mode).reverse();
  const command = mode === "command";
  return <div className="dvor1150-log-table-panel"><RmsLogActions onReset={() => reset(mode)} />
    <div className="dvor1150-log-scroll"><table className="dvor1150-table"><thead><tr><th>Time Tag</th><th>{command ? "User Name" : "Type"}</th><th>{command ? "Command" : mode === "alarm" ? "Alarm" : "Alert"}</th>{!command && <th>State</th>}</tr></thead>
      <tbody>{rows.length === 0 && <tr><td colSpan={command ? 3 : 4}>No entries</td></tr>}{rows.map((row, index) => <tr key={`${row.timeTag}-${index}`}><td>{row.timeTag}</td><td>{row.user}</td><td>{row.message}</td>{!command && <td>{row.state}</td>}</tr>)}</tbody>
    </table></div></div>;
}

function OperationalSummary() {
  const summary = useDvor1150PmdtStore((state) => state.operationalSummary);
  const reset = useDvor1150PmdtStore((state) => state.resetRmsLog);
  const hours = (ms: number) => (ms / 3600000).toFixed(4);
  const availability = (ms: number) => summary.elapsed ? (100 * ms / summary.elapsed).toFixed(4) : "0.0000";
  return <div className="dvor1150-operational-summary">
    <RmsLogActions onReset={() => reset("summary")}>Reset Operational Summary</RmsLogActions>
    <table className="dvor1150-table"><thead><tr><th /><th>Transmitter 1</th><th>Transmitter 2</th><th>Units</th></tr></thead><tbody>
      <tr><th>Time in Normal State</th><td>{hours(summary.tx1.normal)}</td><td>{hours(summary.tx2.normal)}</td><td>Hours</td></tr>
      <tr><th>Time in Standby State</th><td>{hours(summary.tx1.standby)}</td><td>{hours(summary.tx2.standby)}</td><td>Hours</td></tr>
      <tr><th>Availability</th><td>{availability(summary.tx1.normal + summary.tx1.standby)}</td><td>{availability(summary.tx2.normal + summary.tx2.standby)}</td><td>%</td></tr>
      <tr><th>Start Time</th><td colSpan={2}>{formatDvor1150Timestamp(new Date(summary.start))}</td><td /></tr>
      <tr><th>End Time</th><td colSpan={2}>{formatDvor1150Timestamp(new Date(summary.last))}</td><td /></tr>
      <tr><th>Elapsed Time</th><td>{hours(summary.elapsed)}</td><td>Hours</td><td /></tr>
    </tbody></table></div>;
}

function ParameterChangeTable() {
  const entries = useDvor1150PmdtStore((state) => state.parameterChangeLogs);
  const hidden = useDvor1150PmdtStore((state) => state.hiddenParameterLogRows);
  const reset = useDvor1150PmdtStore((state) => state.resetRmsLog);
  const rows = entries.filter((row) => !hidden.has(row.id)).slice(0, 100);
  return <div className="dvor1150-log-table-panel"><RmsLogActions onReset={() => reset("parameters")} /><div className="dvor1150-log-scroll"><table className="dvor1150-table"><thead><tr><th>Time Tag</th><th>User Name</th><th>File</th></tr></thead><tbody>{!rows.length && <tr><td colSpan={3}>No entries</td></tr>}{rows.map((row) => <tr key={row.id}><td>{row.timeTag}</td><td>{row.userName}</td><td>{row.file}</td></tr>)}</tbody></table></div></div>;
}

export function Dvor1150RmsLogsScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const views = ["rms-logs-operational-summary", "rms-logs-alarms", "rms-logs-maintenance-alerts", "rms-logs-command-activity", "rms-logs-parameter-change"] as const;
  let content: ReactNode = <OperationalSummary />;
  if (activeView === "rms-logs-alarms") content = <LogTable mode="alarm" />;
  if (activeView === "rms-logs-maintenance-alerts") content = <LogTable mode="maintenance" />;
  if (activeView === "rms-logs-command-activity") content = <LogTable mode="command" />;
  if (activeView === "rms-logs-parameter-change") content = <ParameterChangeTable />;
  return <Screen title="RMS Logs" tabs={<ScreenTabs screenId="rms-logs" activeView={activeView} views={views} />}><div className="dvor1150-content">{content}</div></Screen>;
}

function Dvor1150RmsGeneralConfiguration() {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  return <div className="dvor1150-content dvor1150-rms-general-grid"><DateBox value={config.simulation.timestamp} /><div className="dvor1150-rms-general-columns">
    <div><fieldset className="dvor1150-panel"><legend>RCSU Configuration</legend><div className="dvor1150-config-row"><span className="dvor1150-config-label">RCSU Type</span><label><Dvor1150ConfigControl fieldId="rms.rcsuPresent" /> 2138 Present</label><span /></div><div className="dvor1150-config-row"><span className="dvor1150-config-label">Connection Type</span>{config.rms.rcsuPresent ? <Dvor1150ConfigControl fieldId="rms.rcsuConnectionType" /> : <StaticSelect value="Not Present" />}<span /></div></fieldset><fieldset className="dvor1150-panel"><legend>Ident Configuration</legend><div className="dvor1150-config-row"><span className="dvor1150-config-label">Transmitter 1 Ident</span><Dvor1150ConfigControl fieldId="transmitters.tx1.nominal.identCode" /><span /></div><div className="dvor1150-config-row"><span className="dvor1150-config-label">Transmitter 2 Ident</span><Dvor1150ConfigControl fieldId="transmitters.tx2.nominal.identCode" /><span /></div></fieldset><fieldset className="dvor1150-panel"><legend>Monitor Configuration</legend><ConfigRow label="Startup Delay (seconds)" fieldId="monitor.monitorStartupDelay" digits={0} unit="" /><ConfigRow label="Shutdown Delay (seconds)" fieldId="monitor.monitorShutdownDelay" digits={0} unit="" /><div className="dvor1150-radio-line"><span>Monitor Voting Logic</span><ConfigRadio fieldId="monitor.votingLogic" value="AND" label="AND" /><ConfigRadio fieldId="monitor.votingLogic" value="OR" label="OR" /></div></fieldset></div>
    <div><fieldset className="dvor1150-panel"><legend>Digital I/O Configuration</legend><div className="dvor1150-check-grid"><label><Dvor1150ConfigControl fieldId="rms.smokeAlarmInstalled" type="boolean" /> Smoke Alarm Installed</label><label><input type="checkbox" checked disabled readOnly /> Enable Remote Reset</label><label><Dvor1150ConfigControl fieldId="rms.intrusionAlarmInstalled" type="boolean" /> Intrusion Alarm Installed</label><label><input type="checkbox" checked disabled readOnly /> Enable Remote Reset</label><div className="dvor1150-config-row"><span>Exit Delay (minutes)</span><StaticInput value="0" /><span /></div><div className="dvor1150-config-row"><span>Entry Delay (minutes)</span><StaticInput value="0" /><span /></div></div><div className="dvor1150-config-row"><span className="dvor1150-config-label">Spare #1 Usage</span><StaticSelect value="Not Present" /><span /></div><div className="dvor1150-config-row"><span className="dvor1150-config-label">Spare #2 Usage</span><StaticSelect value="Not Present" /><span /></div></fieldset><fieldset className="dvor1150-panel"><legend>Modem Configuration</legend><div className="dvor1150-config-row"><span className="dvor1150-config-label">Dial In VOR # Rings</span><StaticInput value="1" /><span /></div><label className="dvor1150-check-line"><input type="checkbox" checked disabled readOnly /> Tone Dial Out</label><label className="dvor1150-check-line"><input type="checkbox" checked disabled readOnly /> Dial Out VOR Enabled</label><div className="dvor1150-config-row"><span className="dvor1150-config-label">Dial Out Phone Number</span><StaticInput value="6827" /><span /></div></fieldset><fieldset className="dvor1150-panel"><legend>Automatic Restarts</legend><label className="dvor1150-check-line"><Dvor1150ConfigControl fieldId="rms.automaticRestartsEnabled" type="boolean" /> Automatic Restarts Enabled</label><ConfigRow label="First Restart Delay (seconds)" fieldId="rms.firstRestartDelay" digits={0} /></fieldset><fieldset className="dvor1150-panel"><legend>DME Configuration</legend><div className="dvor1150-config-row"><span className="dvor1150-config-label">DME Type</span><StaticSelect value="SELEX 1118/1119" /><span /></div><label className="dvor1150-check-line"><Dvor1150ConfigControl fieldId="rms.dualDme" type="boolean" /> Dual</label><label className="dvor1150-check-line"><Dvor1150ConfigControl fieldId="rms.keyingOutputEnabled" type="boolean" /> Keying Output Enabled</label></fieldset></div>
  </div></div>;
}

function Dvor1150ConfigRadioGroup({ onOpenDip }: { onOpenDip: () => void }) {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  return <fieldset className="dvor1150-panel dvor1150-user-config-panel"><legend>User Configuration</legend><div className="dvor1150-radio-line"><ConfigRadio fieldId="station.stationType" value="CVOR" label="CVOR" /><ConfigRadio fieldId="station.stationType" value="DVOR" label="DVOR" /></div><div className="dvor1150-radio-line"><ConfigRadio fieldId="station.transmitterConfig" value="Dual Transmitters" label="Dual Equip" /><ConfigRadio fieldId="station.transmitterConfig" value="Single Transmitter" label="Single Equip" /></div><div className="dvor1150-radio-line"><ConfigRadio fieldId="station.monitorConfig" value="Dual Monitors" label="Dual Monitors" /><ConfigRadio fieldId="station.monitorConfig" value="Single Monitor" label="Single Monitor" /></div><label className="dvor1150-check-line"><input type="checkbox" checked={config.station.transmitterConfig === "Dual Transmitters"} disabled readOnly /> Hot Standby</label><ConfigRow label="Frequency" fieldId="station.frequencyMHz" digits={4} unit="MHz" /><button type="button" className="dvor1150-dip-open-button" disabled={!getDvor1150SynthesizerSwitches(config.station.frequencyMHz)} onClick={onOpenDip}>Display DIP Switch Settings</button><label className="dvor1150-check-line"><input type="checkbox" checked disabled readOnly /> Allow Remote Configuration</label></fieldset>;
}

function Dvor1150RmsStationConfiguration({ onOpenDip }: { onOpenDip: () => void }) {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const backup = useDvor1150PmdtStore((state) => state.configurationBackup?.station ?? state.config.station);
  const dual = backup.transmitterConfig === "Dual Transmitters";
  const equipmentChanged = backup.transmitterConfig !== config.station.transmitterConfig;
  const rows = [
    ["Station Type", backup.stationType, backup.stationType !== config.station.stationType],
    ["Equipment", dual ? "Dual Equip" : "Single Equip", equipmentChanged],
    ["Monitors", backup.monitorConfig, backup.monitorConfig !== config.station.monitorConfig],
    ["Standby", dual ? "Hot Standby" : "No Standby", equipmentChanged],
    ["Frequency", `${backup.frequencyMHz.toFixed(4)} MHz`, backup.frequencyMHz !== config.station.frequencyMHz],
  ] as const;
  return <div className="dvor1150-content dvor1150-station-config"><div className="dvor1150-station-dates"><DateBox value={config.simulation.timestamp} /><DateBox value={config.simulation.timestamp} /></div><div className="dvor1150-station-grid"><Dvor1150ConfigRadioGroup onOpenDip={onOpenDip} /><fieldset className="dvor1150-panel dvor1150-rms-station-panel"><legend>RMS</legend>{rows.map(([label, value, mismatch]) => <output key={label} className={mismatch ? "dvor1150-config-mismatch" : undefined} aria-label={`RMS ${label}`} title={mismatch ? "Differs from User Configuration" : undefined}>{value}</output>)}</fieldset></div><div className="dvor1150-station-identifier"><span>Station Identifier</span><Dvor1150ConfigControl fieldId="station.stationDescription" type="text" /></div></div>;
}

const adParameters: readonly [string, string][] = [["plus5V", "+5 VDC"], ["plus12V", "+12 VDC"], ["plus12VLogic", "-12 VDC"], ["plus28V", "+28 VDC"], ["paVoltage", "PA Voltage"]];

function Dvor1150RmsAdLimits() {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const bands = (transmitter: "tx1" | "tx2") => (
    <fieldset className={`dvor1150-panel dvor1150-ad-limit-panel dvor1150-ad-limit-panel--${transmitter}`}>
      <legend>{transmitter === "tx1" ? "Transmitter 1" : "Transmitter 2"}</legend>
      <table className="dvor1150-table"><thead><tr><th> </th><th>Lo Limit</th><th>Hi Limit</th><th> </th></tr></thead><tbody>
        {adParameters.map(([field, label]) => <tr key={field}><th>{label}</th><td><Dvor1150ConfigControl fieldId={`rms.adLimits.${transmitter}.${field}.low`} digits={2} /></td><td><Dvor1150ConfigControl fieldId={`rms.adLimits.${transmitter}.${field}.high`} digits={2} /></td><td>Volts</td></tr>)}
      </tbody></table>
    </fieldset>
  );
  return <div className="dvor1150-content dvor1150-ad-limits-content"><DateBox value={config.simulation.timestamp} /><div className="dvor1150-ad-limit-grid">{bands("tx1")}{bands("tx2")}<fieldset className="dvor1150-panel dvor1150-temperature-limit-panel"><legend>Temperature</legend><table className="dvor1150-table"><thead><tr><th> </th><th>Lo Limit</th><th>Hi Limit</th><th> </th></tr></thead><tbody>{(["tx1", "tx2"] as const).map((id) => <tr key={id}><th>{id === "tx1" ? "Transmitter 1 Temp" : "Transmitter 2 Temp"}</th><td><Dvor1150ConfigControl fieldId={`rms.adLimits.temperature.${id}.low`} digits={0} /></td><td><Dvor1150ConfigControl fieldId={`rms.adLimits.temperature.${id}.high`} digits={0} /></td><td>°C</td></tr>)}</tbody></table></fieldset></div></div>;
}

function Dvor1150SecurityCodes({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const rows = useDvor1150PmdtStore((state) => state.securityCodes);
  const editable = useDvor1150PmdtStore(canEditDvor1150SecurityCodes);
  const apply = useDvor1150PmdtStore((state) => state.applySecurityCodes);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  return <form key={revision} id="dvor1150-security-codes" autoComplete="off" className="dvor1150-content dvor1150-security-codes"
    onChange={() => onDirtyChange(true)}
    onReset={() => { onDirtyChange(false); setError(null); }}
    onSubmit={(event) => {
      event.preventDefault();
      if (!editable) return;
      const data = new FormData(event.currentTarget);
      const edits = rows.map((_, index): Dvor1150SecurityCodeEdit => ({
        userId: index === 0 ? "SEC4" : String(data.get(`user-${index}`) ?? ""),
        password: String(data.get(`password-${index}`) ?? ""),
        level: index === 0 ? 4 : Number(data.get(`level-${index}`) || 1) as 1 | 2 | 3,
      }));
      const result = apply(edits);
      setError(result);
      if (!result) { onDirtyChange(false); setRevision(revision + 1); }
    }}>
    {editable ? <p>Demo accounts reset when the simulator reloads. Use training-only passwords.</p>
      : <button type="button" disabled className="dvor1150-security-unavailable">Unavailable</button>}
    <div className="dvor1150-security-columns">
      {[0, 5].flatMap((start) => {
        const indices = Array.from({ length: 5 }, (_, offset) => start + offset);
        return [
          <fieldset key={`users-${start}`} className="dvor1150-panel" disabled={!editable}><legend>User ID</legend>{indices.map((index) => <input className="dvor1150-control" key={index} name={`user-${index}`} aria-label={`User ID ${index + 1}`} defaultValue={rows[index]?.userId ?? ""} disabled={index === 0} maxLength={8} />)}</fieldset>,
          <fieldset key={`passwords-${start}`} className="dvor1150-panel" disabled={!editable}><legend>Password</legend>{indices.map((index) => <input className="dvor1150-control" key={index} name={`password-${index}`} aria-label={`Password ${index + 1}`} type="password" autoComplete="new-password" maxLength={8} />)}</fieldset>,
          <fieldset key={`levels-${start}`} className="dvor1150-panel dvor1150-security-levels" disabled={!editable}><legend>Level</legend>{indices.map((index) => <select className="dvor1150-control" key={index} name={`level-${index}`} aria-label={`Level ${index + 1}`} defaultValue={rows[index]?.level ?? ""} disabled={index === 0}><option value="" /><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>{index === 0 ? <option value={4}>4</option> : null}</select>)}</fieldset>,
        ];
      })}
    </div>
    {error ? <p role="alert">{error}</p> : null}
  </form>;
}

function SecurityCodesScreen({ tabs }: { tabs: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  return <Screen title="RMS Configuration" tabs={tabs} securityDraftDirty={dirty}><Dvor1150SecurityCodes onDirtyChange={setDirty} /></Screen>;
}

function Dvor1150SynthesizerDipDialog({ frequencyMHz, onClose }: { frequencyMHz: number; onClose: () => void }) {
  const bits = getDvor1150SynthesizerSwitches(frequencyMHz);
  if (!bits) return null;
  return <section className="dvor1150-dip-dialog" role="dialog" aria-modal="true" aria-label="Synthesizer DIP Switches"><header className="dvor1150-dip-dialog-titlebar"><span>Synthesizer DIP Switches - Required Settings</span><button type="button" aria-label="Close" onClick={onClose}>×</button></header><div className="dvor1150-dip-dialog-body"><div className="dvor1150-dip-column"><span>S1</span>{bits.map((enabled, index) => <div className="dvor1150-dip-switch-row" key={index}><span className={`dvor1150-dip-switch ${enabled ? "dvor1150-dip-switch--on" : ""}`}><span /></span><span aria-label={`Switch ${index + 1} ${enabled ? "On" : "Off"}`}>{index + 1}</span></div>)}</div><button type="button" onClick={onClose}>OK</button><fieldset><legend>Note:</legend><span>For rocker-type DIP switches, the side indicated with ▼ should be depressed.</span></fieldset></div></section>;
}

export function Dvor1150RmsConfigScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const securityLevel = useDvor1150PmdtStore((state) => state.securityLevel);
  const editableCodes = useDvor1150PmdtStore(canEditDvor1150SecurityCodes);
  const [dipOpen, setDipOpen] = useState(false);
  const views = (["rms-config-general", "rms-config-station", "rms-config-ad-limits", "rms-config-security-codes"] as const)
    .filter((view) => view !== "rms-config-security-codes" || securityLevel === 4);
  const tabs = <ScreenTabs screenId="rms-config" activeView={activeView} views={views} />;
  if (activeView === "rms-config-security-codes" && securityLevel === 4) return <SecurityCodesScreen key={String(editableCodes)} tabs={tabs} />;
  let body: ReactNode = <Dvor1150RmsGeneralConfiguration />;
  if (activeView === "rms-config-station") body = <Dvor1150RmsStationConfiguration onOpenDip={() => setDipOpen(true)} />;
  if (activeView === "rms-config-ad-limits") body = <Dvor1150RmsAdLimits />;
  return <><Screen title="RMS Configuration" tabs={tabs}>{body}</Screen>{dipOpen ? <Dvor1150SynthesizerDipDialog frequencyMHz={config.station.frequencyMHz} onClose={() => setDipOpen(false)} /> : null}</>;
}

function monitorLimits(config: Dvor1150Config, monitorId: Dvor1150MonitorId, parameter: Dvor1150MonitorParameter) {
  return parameter === "azimuth" ? config.monitor.azimuthAlarmLimits[monitorId] : config.monitor.alarmLimits[parameter];
}

function MonitorIntegrityBlock({ monitorId }: { monitorId: Dvor1150MonitorId }) {
  const config = useDvor1150PmdtStore((state) => state.config);
  const derived = useDvor1150PmdtStore((state) => state.derived);
  const monitor = derived.monitors[monitorId];
  return <fieldset className="dvor1150-panel dvor1150-integrity-monitor"><legend>Monitor {monitorId === "mon1" ? 1 : 2}</legend><div className="dvor1150-integrity-head"><DateBox value={derived.data.timestamp} /><span><StatusBox indicator={monitor.commStatus} /> Comm Status</span><span><StatusBox indicator={monitor.controlling ? "green" : "gray"} /> Controlling</span><span><StatusBox indicator={config.monitor.identMonitoringEnabled ? "green" : "gray"} /> Ident Monitor Enabled</span></div><table className="dvor1150-table"><thead><tr><th> </th><th>Alarm Low</th><th>PreAlarm Low</th><th>Data</th><th>PreAlarm High</th><th>Alarm High</th><th> </th></tr></thead><tbody>{parameterOrder.map((parameter) => { const limits = monitorLimits(config, monitorId, parameter); const result = monitor.parameters[parameter]; return <tr key={parameter}><th>{parameterMeta[parameter].label}</th><td>{limits.alarmLow.toFixed(parameterMeta[parameter].digits)}</td><td>{limits.preAlarmLow.toFixed(parameterMeta[parameter].digits)}</td><td><Readout value={result.value.toFixed(parameterMeta[parameter].digits)} indicator={result.indicator} /></td><td>{limits.preAlarmHigh.toFixed(parameterMeta[parameter].digits)}</td><td>{limits.alarmHigh.toFixed(parameterMeta[parameter].digits)}</td><td>{parameterMeta[parameter].unit}</td></tr>; })}<tr><th>Ident</th><td /><td /><td><Readout value={monitor.ident.value} indicator={monitor.ident.indicator} /></td><td /><td /><td /></tr></tbody></table></fieldset>;
}

function Dvor1150MonitorIntegrity() {
  const dual = useDvor1150PmdtStore((state) => state.config.station.monitorConfig === "Dual Monitors");
  return <div className="dvor1150-content dvor1150-integrity-content"><MonitorIntegrityBlock monitorId="mon1" />{dual && <MonitorIntegrityBlock monitorId="mon2" />}</div>;
}

function useMaintenanceControls() {
  const canStart = useDvor1150PmdtStore((state) => !state.loginDialogOpen && state.securityLevel >= 3 && state.config.simulation.local && !state.maintenance.job && !state.diagnosticState.running);
  const dual = useDvor1150PmdtStore((state) => state.config.station.monitorConfig === "Dual Monitors");
  const maintenance = useDvor1150PmdtStore((state) => state.maintenance);
  const start = useDvor1150PmdtStore((state) => state.startMaintenance);
  const execute = useDvor1150PmdtStore((state) => state.executeCommand);
  const abort = () => execute("abort-tests");
  return { canStart, dual, maintenance, start, abort };
}

function Dvor1150MonitorTestData() {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const { canStart, dual, maintenance, start, abort } = useMaintenanceControls();
  const fields: readonly [string, string, string, number][] = [["Azimuth Angle", "azimuthAngle", "°", 2], ["30 Hz Modulation", "hz30Modulation", "%", 1], ["9960 Hz Modulation", "hz9960Modulation", "%", 1], ["Deviation", "deviation", "Ratio", 1], ["Ident Modulation", "identModulation", "%", 1], ["Ident Control", "identControl", "", 0], ["Audio Modulation", "audioModulation", "%", 1], ["Audio Frequency", "audioFrequency", "Hz", 0]];
  return <div className="dvor1150-content dvor1150-monitor-test-data"><fieldset className="dvor1150-panel dvor1150-test-generator-setup"><legend>Test Generator Setup</legend><DateBox value={config.simulation.timestamp} /><table className="dvor1150-table"><thead><tr><th> </th><th>Monitor 1</th>{dual && <th>Monitor 2</th>}<th> </th></tr></thead><tbody>{fields.map(([label, field, unit, digits]) => <tr key={field}><th>{label}</th><td>{field === "identControl" ? <Dvor1150ConfigControl fieldId="monitor.testGenerator.identControl" type="select" /> : <Dvor1150ConfigControl fieldId={`monitor.testGenerator.${field}`} digits={digits} />}</td>{dual && <td>{field === "identControl" ? config.monitor.testGenerator.identControl : formatNumber(config.monitor.testGenerator[field as keyof typeof config.monitor.testGenerator] as number, digits)}</td>}<td>{unit}</td></tr>)}</tbody></table></fieldset><fieldset className="dvor1150-panel dvor1150-test-results"><legend>Test Results</legend>
    <div className="dvor1150-test-result-columns">{(["mon1", "mon2"] as const).slice(0, dual ? 2 : 1).map((id, index) => {
      const result = maintenance.monitor[id];
      const running = maintenance.job?.kind === "monitor" && maintenance.job.target === id;
      const title = `Monitor ${index + 1}`;
      const fields = [["Azimuth Angle", "azimuthAngle", 2], ["30 Hz Mod", "hz30Modulation", 1], ["9960 Hz Mod", "hz9960Modulation", 1], ["Deviation", "deviation", 1]] as const;
      return <fieldset key={id} className="dvor1150-panel"><legend>{title}</legend><DateBox value={result?.timestamp ?? ""} />
        {fields.map(([label, field, digits]) => <div key={field} className="dvor1150-test-result-field"><span>{label}</span><StaticInput value={result?.values[field].toFixed(digits) ?? ""} /></div>)}
        <p role="status">{running ? "Running" : result ? "Completed" : "Not run"}</p>
        <button type="button" aria-label={`Run ${title} Test`} disabled={!canStart} onClick={() => start("monitor", id)}>Run</button>
        {running && <button type="button" onClick={abort}>Abort All Tests</button>}
      </fieldset>;
    })}</div></fieldset></div>;
}

function Dvor1150CertificationResults() {
  const { canStart, dual, maintenance, start, abort } = useMaintenanceControls();
  const render = (id: Dvor1150MonitorId, index: number) => {
    const result = maintenance.certification[id];
    const running = maintenance.job?.kind === "certification" && maintenance.job.target === id;
    const title = `Monitor ${index + 1}`;
    return <fieldset className="dvor1150-panel dvor1150-certification-monitor" key={id}><legend>{title}</legend>
      <DateBox value={result?.timestamp ?? ""} /><table className="dvor1150-table"><thead><tr><th /><th>Low Limit</th><th>Data</th><th>High Limit</th><th>Data</th><th /></tr></thead>
      <tbody>{result?.values.map((row) => {
        const meta = parameterMeta[row.parameter];
        const color = (value: number, limit: number) => Math.abs(value - limit) <= (row.tolerance ?? 0) + 1e-9 ? "green" : "red";
        return <tr key={row.parameter}><th>{meta.label}</th><td>{row.lowLimit.toFixed(meta.digits)}</td><td><Readout value={row.lowData.toFixed(meta.digits)} indicator={color(row.lowData, row.lowLimit)} /></td><td>{row.highLimit.toFixed(meta.digits)}</td><td><Readout value={row.highData.toFixed(meta.digits)} indicator={color(row.highData, row.highLimit)} /></td><td>{meta.unit}</td></tr>;
      })}</tbody></table><p role="status">{running ? "Running" : result ? "Completed" : "Not run"}</p>
      <button type="button" aria-label={`Run ${title} Certification`} disabled={!canStart} onClick={() => start("certification", id)}>Run</button>
      {running && <button type="button" onClick={abort}>Abort All Tests</button>}
    </fieldset>;
  };
  return <div className="dvor1150-content dvor1150-certification-content"><div className="dvor1150-certification-grid">
    {(["mon1", "mon2"] as const).slice(0, dual ? 2 : 1).map(render)}
  </div><button type="button" disabled className="dvor1150-set-monitor-limits">Set to Monitor Limits</button><p>Demo certification uses the applied monitor alarm limits.</p></div>;
}

function Dvor1150NotchMonitor() {
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  const executeCommand = useDvor1150PmdtStore((state) => state.executeCommand);
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  return <div className="dvor1150-content dvor1150-notch-content"><div className="dvor1150-notch-toolbar"><DateBox value={data.timestamp} /><label className="dvor1150-check-line"><Dvor1150ConfigControl fieldId="monitor.notch.enabled" type="boolean" /> Enable Notch Monitoring</label><label>Tolerance <Dvor1150ConfigControl fieldId="monitor.notch.tolerance" digits={0} /> %</label><label className="dvor1150-check-line"><input type="checkbox" checked={false} disabled readOnly /> Executive Alarm</label><button type="button" disabled={!config.monitor.notch.enabled} onClick={() => executeCommand("record-notch-baseline")}>Record Baseline</button></div><div className="dvor1150-notch-columns">{[0, 1, 2].map((column) => <table className="dvor1150-table" key={column}><thead><tr><th>Antenna</th><th>Baseline</th><th>Current</th></tr></thead><tbody>{data.notchData.slice(column * 16, column * 16 + 16).map((row) => <tr key={row.antenna}><th>{row.antenna}</th><td>{row.baseline.toFixed(2)}</td><td><Readout value={row.current.toFixed(2)} indicator={row.indicator} /></td></tr>)}</tbody></table>)}</div></div>;
}

function Dvor1150SidebandVswr() {
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  return <div className="dvor1150-content dvor1150-vswr-content"><div className="dvor1150-vswr-toolbar"><DateBox value={data.timestamp} /><label className="dvor1150-check-line"><Dvor1150ConfigControl fieldId="monitor.sidebandVswrExecutiveAlarm" type="boolean" /> Sideband VSWR Executive Alarm</label><label>Tolerance <Dvor1150ConfigControl fieldId="monitor.sidebandVswrTolerance" digits={2} /> : 1</label><label>Number of Antennas in Alarm <Dvor1150ConfigControl fieldId="monitor.numberOfAntennasInAlarm" digits={0} /></label></div><div className="dvor1150-vswr-columns">{[0, 1, 2, 3].map((column) => <table className="dvor1150-table" key={column}><thead><tr><th>Antenna</th><th>VSWR</th></tr></thead><tbody>{data.sidebandVswr.slice(column * 12, column * 12 + 12).map((row) => <tr key={row.antenna}><th>{row.antenna}</th><td><Readout value={row.value.toFixed(2)} indicator={row.indicator} /></td></tr>)}</tbody></table>)}</div></div>;
}

const groundCurves = [
  ["Station Error", "#087827"], ["FFT Sum", "#2a46b8"], ["Bias", "#724500"],
  ["Duantal", "#703894"], ["Quadrantal", "#a92226"], ["Octantal", "#00697c"],
] as const;
type GroundCurve = typeof groundCurves[number][0];

function GroundCheckGraph({ data, curves, markers, legend }: { data: Dvor1150GroundCheckData; curves: GroundCurve[]; markers: boolean; legend: boolean }) {
  const harmonic = (azimuth: number, order: number, { amplitude, phase }: Dvor1150GroundCheckData["duantal"]) => amplitude * Math.cos((order * azimuth + phase) * Math.PI / 180);
  const lines = groundCurves.filter(([key]) => curves.includes(key)).map(([key, color]) => ({
    key, color, values: [...data.rows, { ...data.rows[0], azimuth: 360 }].map(({ azimuth, stationError }) => {
      const d = harmonic(azimuth, 1, data.duantal), q = harmonic(azimuth, 2, data.quadrantal), o = harmonic(azimuth, 4, data.octantal);
      return { azimuth, value: key === "Station Error" ? stationError : key === "FFT Sum" ? data.bias + d + q + o : key === "Duantal" ? d : key === "Quadrantal" ? q : key === "Octantal" ? o : data.bias };
    }),
  }));
  const range = Math.max(0.1, ...lines.flatMap((line) => line.values.map(({ value }) => Math.abs(value))));
  const x = (angle: number) => 42 + angle * 306 / 360;
  const y = (value: number) => 87 - value / range * 60;
  return <div><svg className="dvor1150-ground-graph" viewBox="0 0 366 188" role="img" aria-label={`Ground check: ${curves.join(", ")}`}>
    <rect x="42" y="20" width="306" height="134" fill="#f0f0f0" stroke="#707070" />
    <path d="M42 87H348" stroke="#808080" strokeDasharray="2 3" />
    {[0, 90, 180, 270, 360].map((angle) => <text key={angle} x={x(angle)} y="168" textAnchor="middle" fontSize="9">{angle}°</text>)}
    {[range, 0, -range].map((value) => <text key={value} x="38" y={y(value) + 3} textAnchor="end" fontSize="9">{value.toFixed(2)}</text>)}
    <text x="5" y="12" fontSize="9">Error (°)</text><text x="195" y="183" textAnchor="middle" fontSize="9">Azimuth</text>
    {lines.map(({ key, color, values }) => <g key={key}><polyline points={values.map(({ azimuth, value }) => `${x(azimuth)},${y(value)}`).join(" ")} fill="none" stroke={color} />
      {markers && values.map(({ azimuth, value }) => <circle key={azimuth} cx={x(azimuth)} cy={y(value)} r={2} fill={color} />)}
    </g>)}
  </svg>{legend && <div className="dvor1150-ground-legend">{lines.map(({ key, color }) => <span key={key} style={{ color }}>{key}</span>)}</div>}</div>;
}

function groundCheckCsv(data: Dvor1150GroundCheckData) {
  return ["Azimuth (deg),Station Error (deg)", ...data.rows.map(({ azimuth, stationError }) => `${azimuth.toFixed(2)},${stationError.toFixed(4)}`)].join("\n");
}

function Dvor1150AdvancedGroundCheck({ data, timestamp, onClose }: { data: Dvor1150GroundCheckData; timestamp: string; onClose: () => void }) {
  const [curves, setCurves] = useState<GroundCurve[]>(["Bias", "Duantal", "Quadrantal", "Octantal"]);
  const [markers, setMarkers] = useState(false);
  const [legend, setLegend] = useState(true);
  const [message, setMessage] = useState("");
  const toggle = (key: GroundCurve) => setCurves((current) => current.includes(key) ? current.filter((curve) => curve !== key) : [...current, key]);
  const save = () => {
    const url = URL.createObjectURL(new Blob([groundCheckCsv(data)], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "dvor-1150-ground-check.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  return <section className="dvor1150-advanced-ground-dialog" role="dialog" aria-modal="true" aria-label="Ground Check Error Graph">
    <header>Ground Check Error Graph <button type="button" aria-label="Close graph" onClick={onClose}>×</button></header>
    <div className="dvor1150-advanced-ground-body"><h3>VOR Ground Check Errors: {timestamp}</h3>
      <GroundCheckGraph data={data} curves={curves} markers={markers} legend={legend} />
      <fieldset><legend>Graph Options</legend>
        <label><input type="checkbox" checked={legend} onChange={(event) => setLegend(event.target.checked)} /> Legend</label>
        <label><input type="checkbox" checked={markers} onChange={(event) => setMarkers(event.target.checked)} /> Markers</label>
        {groundCurves.map(([key]) => <label key={key}><input type="checkbox" checked={curves.includes(key)} onChange={() => toggle(key)} /> {key}</label>)}
      </fieldset>
    </div>
    <footer><button type="button" onClick={() => window.print()}>Print...</button>
      <button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(groundCheckCsv(data)); setMessage("Sample data copied"); }
        catch { setMessage("Clipboard unavailable; use Save As."); }
      }}>Copy</button>
      <button type="button" onClick={save}>Save As...</button><button type="button" onClick={onClose}>Close</button></footer>
    {message && <p role="status">{message}</p>}
  </section>;
}

function GroundCheckErrorTable({ data }: { data: Dvor1150GroundCheckData }) {
  const rows = [
    ["Duantal Error", data.duantal.amplitude, data.duantal.phase],
    ["Quadrantal Error", data.quadrantal.amplitude, data.quadrantal.phase],
    ["Octantal Error", data.octantal.amplitude, data.octantal.phase],
    ["Bias", data.bias, null],
  ] as const;
  return <table className="dvor1150-table dvor1150-ground-error-table"><thead><tr><th /><th>Amplitude</th><th>Phase</th><th /></tr></thead><tbody>{rows.map(([label, amplitude, phase]) => <tr key={label}><th>{label}</th><td>{amplitude.toFixed(3)}</td><td>{phase === null ? "-" : phase.toFixed(1)}</td><td>°</td></tr>)}</tbody></table>;
}

function Dvor1150GroundCheck() {
  const { canStart, maintenance, start, abort } = useMaintenanceControls();
  const hasAntenna = useDvor1150PmdtStore((state) => state.derived.activeTransmitter !== null);
  const [advanced, setAdvanced] = useState(false);
  const [mode, setMode] = useState<"FFT Errors" | "FFT Sum" | "Station Error">("FFT Errors");
  const [markers, setMarkers] = useState(false);
  const [legend, setLegend] = useState(true);
  const data = maintenance.ground?.values;
  const running = maintenance.job?.kind === "ground";
  return <>
    <div className="dvor1150-content dvor1150-ground-check-content">
      <div className="dvor1150-ground-check-top"><DateBox value={maintenance.ground?.timestamp ?? ""} /><button type="button" disabled={!canStart || !hasAntenna} onClick={() => start("ground")}>Run</button>{running && <button type="button" onClick={abort}>Abort All Tests</button>}</div>
      <p className="dvor1150-diagnostic-note">Demo sweep only. Real-station ground check requires the supported cards, nominal monitor angle and a NOTAM.</p>
      <p role="status">{running ? "Sweep running" : data ? "16 samples completed" : "No ground check has completed."}</p>
      {data && <div className="dvor1150-ground-check-grid">
        <div className="dvor1150-ground-samples"><table className="dvor1150-table"><thead><tr><th>Azimuth</th><th>Station<br />Error</th></tr></thead><tbody>{data.rows.map((row) => <tr key={row.azimuth}><th>{row.azimuth.toFixed(2)}</th><td>{row.stationError.toFixed(2)}</td></tr>)}</tbody></table><div className="dvor1150-error-spread"><span>Error Spread</span><StaticInput value={data.errorSpread.toFixed(2)} /></div></div>
        <div className="dvor1150-ground-plot"><GroundCheckErrorTable data={data} /><GroundCheckGraph data={data} curves={mode === "FFT Errors" ? ["Bias", "Duantal", "Quadrantal", "Octantal"] : [mode]} markers={markers} legend={legend} /></div>
        <div className="dvor1150-ground-options"><fieldset><legend>Graph Options</legend>
          {(["FFT Errors", "FFT Sum", "Station Error"] as const).map((option) => <label key={option}><input type="radio" checked={mode === option} onChange={() => setMode(option)} /> {option}</label>)}
          <label><input type="checkbox" checked={markers} onChange={(event) => setMarkers(event.target.checked)} /> Markers</label><label><input type="checkbox" checked={legend} onChange={(event) => setLegend(event.target.checked)} /> Legend</label><button type="button" onClick={() => setAdvanced(true)}>Advanced...</button>
        </fieldset></div>
      </div>}
    </div>
    {advanced && data && maintenance.ground && <Dvor1150AdvancedGroundCheck data={data} timestamp={maintenance.ground.timestamp} onClose={() => setAdvanced(false)} />}
  </>;
}

function Dvor1150FaultHistory() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const history = useDvor1150PmdtStore((state) => state.derived.data.faultHistory);
  const alarmSamples = [history[0]?.alarm, history[1]?.alarm, history[2]?.alarm];
  const monitorSamples = [history[0]?.preAlarm, ...alarmSamples];
  const isSystem = activeView === "monitor-fault-history-system-status";
  const sampleHeader = (sample: Dvor1150FaultSample | null | undefined, index: number, withPhase: boolean) =>
    <th key={index} scope="col">{withPhase && <div>{index === 0 ? "PreAlarm" : "Alarm"}</div>}<DateBox value={sample?.timestamp ?? "—"} /></th>;
  const monitorData = <div className="dvor1150-fault-monitor-data">
    {(["mon1", "mon2"] as const).map((id) => <fieldset className="dvor1150-panel" key={id}>
      <legend>{id === "mon1" ? "Monitor 1" : "Monitor 2"}</legend>
      <table className="dvor1150-table">
        <thead><tr><th />{monitorSamples.map((sample, index) => sampleHeader(sample, index, true))}<th /></tr></thead>
        <tbody>
          {parameterOrder.map((parameter) => <tr key={parameter}>
            <th scope="row">{parameterMeta[parameter].label}</th>
            {monitorSamples.map((sample, index) => {
              const monitor = sample?.monitors[id];
              const row = monitor?.commStatus !== "gray" ? monitor?.parameters[parameter] : undefined;
              return <td key={index}>{row && <Readout value={row.value.toFixed(parameterMeta[parameter].digits)} indicator={row.indicator} />}</td>;
            })}
            <td>{parameterMeta[parameter].unit}</td>
          </tr>)}
          <tr><th scope="row">Ident Status</th>{monitorSamples.map((sample, index) => {
            const monitor = sample?.monitors[id];
            return <td key={index}>{monitor && monitor.commStatus !== "gray" && <Readout value={monitor.ident.value} indicator={monitor.ident.indicator} />}</td>;
          })}<td /></tr>
          {(["Notch Monitor", "Sideband VSWR"] as const).map((label) => <tr key={label}><th scope="row">{label}</th>
            {monitorSamples.map((sample, index) => <td key={index}>{sample && sample.monitors[id].commStatus !== "gray" &&
              <StatusBox indicator={label === "Notch Monitor" ? sample.notchIndicator : sample.vswrIndicator} />}</td>)}<td />
          </tr>)}
        </tbody>
      </table>
    </fieldset>)}
  </div>;
  const paired = (left: [string, boolean], right: [string, boolean]) =>
    <span className="dvor1150-history-pair">{[left, right].map(([label, active]) =>
      <span key={label}><StatusBox indicator={active ? "green" : "gray"} /> {label}</span>)}</span>;
  const systemRow = (label: string, render: (sample: Dvor1150FaultSample) => ReactNode) =>
    <tr key={label}><th scope="row">{label}</th>{alarmSamples.map((sample, index) => <td key={index}>{sample && render(sample)}</td>)}</tr>;
  const systemStatus = <div className="dvor1150-fault-system-status">
    <table className="dvor1150-table">
      <thead><tr><th />{alarmSamples.map((sample, index) => sampleHeader(sample, index, false))}</tr></thead>
      <tbody>
        <tr><th colSpan={4}>Monitor</th></tr>
        {systemRow("Monitor Logic", (sample) => sample.monitorLogic)}
        {(["mon1", "mon2"] as const).map((id) => systemRow(id === "mon1" ? "Monitor 1" : "Monitor 2", (sample) =>
          sample.monitors[id].commStatus !== "gray" && paired(["Bypass", sample.bypass], ["Alarm", !sample.monitors[id].healthy])))}
        {systemRow("Ident Monitoring", (sample) => sample.identEnabled ? "Enabled" : "Disabled")}
        {systemRow("Notch Monitor", (sample) => sample.notchEnabled ? "Enabled" : "Disabled")}
        {systemRow("Sideband VSWR", (sample) => sample.vswrExecutive ? "Executive" : "Advisory")}
        <tr><th colSpan={4}>Transmitter</th></tr>
        {systemRow("On Antenna", (sample) => paired(["TX1", sample.antenna === "tx1"], ["TX2", sample.antenna === "tx2"]))}
        {systemRow("Main", (sample) => paired(["TX1", sample.main === "tx1"], ["TX2", sample.main === "tx2"]))}
        {systemRow("On", (sample) => paired(["TX1", sample.on.tx1], ["TX2", sample.on.tx2]))}
      </tbody>
    </table>
  </div>;
  return <Screen title="Fault History" tabs={<ScreenTabs screenId="monitor-data" activeView={activeView} views={["monitor-fault-history-data", "monitor-fault-history-system-status"]} />}>
    <div className="dvor1150-content">{history.length === 0 && <p>No recorded faults.</p>}{isSystem ? systemStatus : monitorData}</div>
  </Screen>;
}

function Dvor1150StandbyStatus() {
  const dual = useDvor1150PmdtStore((state) => state.config.station.transmitterConfig === "Dual Transmitters");
  const { activeTransmitter, mainTransmitter, effectiveTransmitters } = useDvor1150PmdtStore((state) => state.derived);
  if (!dual) return <div className="dvor1150-content">No standby transmitter installed.</div>;
  const id = (activeTransmitter ?? mainTransmitter) === "tx2" ? "tx1" : "tx2";
  const standby = effectiveTransmitters[id];
  return <div className="dvor1150-content">
    <fieldset className="dvor1150-panel">
      <legend>Standby</legend>
      <p>{id.toUpperCase()} — {standby.load ? "On Load" : standby.enabled ? "On" : "Off"}</p>
      <p>Standby monitor measurements are not available in this demo.</p>
    </fieldset>
  </div>;
}

export function Dvor1150MonitorDataScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const views = ["monitor-integrity", "monitor-ground-check", "monitor-certification", "monitor-test-data", "monitor-notch", "monitor-sideband-vswr", "monitor-standby"] as const;
  if (activeView === "monitor-fault-history-data" || activeView === "monitor-fault-history-system-status") return <Dvor1150FaultHistory />;
  let body: ReactNode = <Dvor1150MonitorIntegrity />;
  if (activeView === "monitor-ground-check") body = <Dvor1150GroundCheck />;
  if (activeView === "monitor-certification") body = <Dvor1150CertificationResults />;
  if (activeView === "monitor-test-data") body = <Dvor1150MonitorTestData />;
  if (activeView === "monitor-notch") body = <Dvor1150NotchMonitor />;
  if (activeView === "monitor-sideband-vswr") body = <Dvor1150SidebandVswr />;
  if (activeView === "monitor-standby") body = <Dvor1150StandbyStatus />;
  return <Screen title="Monitor Data" tabs={<ScreenTabs screenId="monitor-data" activeView={activeView} views={views} />}>{body}</Screen>;
}

const calibrationRows: readonly [string, string, string, number][] = [["Azimuth Angle Offset", "azimuthAngleOffset", "°", 2], ["30 Hz Modulation Scale", "hz30ModulationScale", "%", 1], ["9960 Hz Modulation Scale", "hz9960ModulationScale", "%", 1], ["9960 Hz Deviation Scale", "hz9960DeviationScale", "%", 1], ["RF Level Offset", "rfLevelOffset", "dB", 1]];

function CalibrationTable({ monitorId }: { monitorId: Dvor1150MonitorId }) {
  return <table className="dvor1150-table dvor1150-calibration-table"><thead><tr><th>Monitor {monitorId === "mon1" ? 1 : 2}</th><th>Field Detector</th><th>Test Generator/<br />Certification</th><th> </th></tr></thead><tbody>{calibrationRows.map(([label, field, unit, digits]) => <tr key={field}><th>{label}</th><td><Dvor1150ConfigControl fieldId={`monitor.calibration.${monitorId}.fieldDetector.${field}`} digits={digits} /></td><td><Dvor1150ConfigControl fieldId={`monitor.calibration.${monitorId}.testGenerator.${field}`} digits={digits} /></td><td>{unit}</td></tr>)}</tbody></table>;
}

export function Dvor1150MonitorConfigScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const rows = <tbody>{(["mon1", "mon2"] as const).map((monitorId) => <tr key={monitorId}><th>Monitor {monitorId === "mon1" ? 1 : 2} Azimuth Angle</th>{alarmBands.map((band) => <td key={band}><Dvor1150ConfigControl fieldId={`monitor.azimuthAlarmLimits.${monitorId}.${band}`} digits={2} /></td>)}<td>°</td></tr>)}{parameterOrder.filter((parameter) => parameter !== "azimuth").map((parameter) => <tr key={parameter}><th>{parameterMeta[parameter].label}</th>{alarmBands.map((band) => <td key={band}><Dvor1150ConfigControl fieldId={`monitor.alarmLimits.${parameter}.${band}`} digits={parameterMeta[parameter].digits} /></td>)}<td>{parameterMeta[parameter].unit}</td></tr>)}</tbody>;
  const body = activeView === "monitor-offsets" ? <div className="dvor1150-content dvor1150-offsets-content"><DateBox value={config.simulation.timestamp} /><CalibrationTable monitorId="mon1" /><CalibrationTable monitorId="mon2" /></div> : <div className="dvor1150-content dvor1150-alarm-limits-content"><DateBox value={config.simulation.timestamp} /><label className="dvor1150-check-line"><Dvor1150ConfigControl fieldId="monitor.identMonitoringEnabled" type="boolean" /> Enable Ident Monitoring</label><table className="dvor1150-table dvor1150-alarm-limits-table"><thead><tr><th>Alarm Limits</th><th>Alarm Low</th><th>PreAlarm Low</th><th>Nominal</th><th>PreAlarm High</th><th>Alarm High</th><th> </th></tr></thead>{rows}</table></div>;
  return <Screen title="Monitor Configuration" tabs={<ScreenTabs screenId="monitor-config" activeView={activeView} views={["monitor-alarm-limits", "monitor-offsets"]} />}>{body}</Screen>;
}

export function Dvor1150TxDataScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  const transmitter = activeView === "tx-data-tx2" ? "tx2" : "tx1";
  const timestamp = data.timestamp;
  return <Screen title="Transmitter Data" tabs={<ScreenTabs screenId="tx-data" activeView={activeView} views={["tx-data-tx1", "tx-data-tx2"]} />}><div className="dvor1150-content dvor1150-tx-data-content"><div className="dvor1150-tx-data-grid"><div><DateBox value={timestamp} /><fieldset className="dvor1150-panel"><legend>Power</legend><table className="dvor1150-table"><tbody>{data.txPower.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td>{row[transmitter].toFixed(2)}</td><td>{row.unit}</td></tr>)}</tbody></table></fieldset><fieldset className="dvor1150-panel"><legend>VSWR</legend><table className="dvor1150-table"><tbody>{data.txVswr.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td>{formatNumber(row[transmitter], 2)}</td><td>: 1</td></tr>)}</tbody></table></fieldset></div><div><DateBox value={timestamp} /><fieldset className="dvor1150-panel"><legend>Frequency</legend><table className="dvor1150-table"><tbody>{data.txFrequency.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td>{formatNumber(row[transmitter], row.unit === "MHz" ? 4 : 2)}</td><td>{row.unit}</td></tr>)}</tbody></table></fieldset></div></div></div></Screen>;
}

const nominalFields: readonly [string, string, string, number][] = [["Azimuth Index", "azimuthIndex", "°", 2], ["Output Power", "outputPower", "Watts", 1], ["Voice Modulation", "voiceModulation", "%", 1], ["Ident Modulation", "identModulation", "%", 1], ["Reference Modulation", "referenceModulation", "%", 1], ["SBO RF Level", "sboRfLevel", "%", 1]];
const offsetFields: readonly [string, string, string, number][] = [["Azimuth Angle Offset", "azimuthAngle", "°", 2], ["Output Power Scale", "outputPowerScale", "%", 1], ["Voice Modulation Scale", "voiceModulationScale", "%", 1], ["Ident Modulation Scale", "identModulationScale", "%", 1], ["Reference Modulation Scale", "referenceModulationScale", "%", 1], ["Sideband 1-2 Phase Offset", "sideband12PhaseOffset", "°", 2], ["Sideband 3-4 Phase Offset", "sideband34PhaseOffset", "°", 2], ["Carrier-Sideband Phase Offset", "carrierSidebandPhaseOffset", "°", 2], ["Sideband 1 RF Level Scale", "sideband1RfLevelScale", "%", 1], ["Sideband 2 RF Level Scale", "sideband2RfLevelScale", "%", 1], ["Sideband 3 RF Level Scale", "sideband3RfLevelScale", "%", 1], ["Sideband 4 RF Level Scale", "sideband4RfLevelScale", "%", 1], ["Cabinet Temperature Offset", "cabinetTemperatureOffset", "°C", 1]];

export function Dvor1150TxConfigScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const isOffsets = activeView === "tx-config-offsets";
  const fields = isOffsets ? offsetFields : nominalFields;
  return <Screen title="Transmitter Configuration" tabs={<ScreenTabs screenId="tx-config" activeView={activeView} views={["tx-config-nominal", "tx-config-offsets"]} />}><div className="dvor1150-content dvor1150-tx-config-content"><DateBox value={config.simulation.timestamp} /><table className={`dvor1150-table dvor1150-tx-config-table ${isOffsets ? "dvor1150-tx-offsets-table" : "dvor1150-tx-nominal-table"}`}>{isOffsets ? <thead><tr><th> </th><th>Transmitter 1</th><th>Transmitter 2</th><th> </th></tr></thead> : null}<tbody>{fields.map(([label, field, unit, digits]) => <tr key={field}><th>{label}</th><td><Dvor1150ConfigControl fieldId={`transmitters.tx1.${isOffsets ? "offsets" : "nominal"}.${field}`} mirrorFieldIds={isOffsets ? undefined : [`transmitters.tx2.nominal.${field}`]} digits={digits} /></td>{isOffsets ? <td><Dvor1150ConfigControl fieldId={`transmitters.tx2.offsets.${field}`} digits={digits} /></td> : null}<td>{unit}</td></tr>)}</tbody></table></div></Screen>;
}

function Dvor1150DiagnosticsScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const config = useDvor1150PmdtStore((state) => state.config);
  const powerUpAt = useDvor1150PmdtStore((state) => state.powerUpAt);
  const canRun = useDvor1150PmdtStore((state) => !state.loginDialogOpen && !state.maintenance.job && !state.diagnosticState.running && state.securityLevel >= 2);
  const canOffAir = useDvor1150PmdtStore((state) => state.securityLevel >= 3 && state.config.simulation.local);
  const diagnosticState = useDvor1150PmdtStore((state) => state.diagnosticState);
  const runDiagnostics = useDvor1150PmdtStore((state) => state.runDiagnostics);
  const cancelDiagnostics = useDvor1150PmdtStore((state) => state.cancelDiagnostics);
  const modules = [["RMS", true], ["Monitor 1", true], ["Monitor 2", config.station.monitorConfig === "Dual Monitors"], ["Audio Gen 1", true], ["Audio Gen 2", config.station.transmitterConfig === "Dual Transmitters"]] as const;
  const tests = ["CPU Functional Test", "RAM Check", "PROM Check", "EEPROM Check"];
  const indicatorFor = (status: "idle" | "pass" | "fault") => status === "fault" ? "red" as const : status === "pass" ? "green" as const : "gray" as const;
  const powerUp = <div className="dvor1150-content dvor1150-diagnostics-content"><DateBox value={powerUpAt} />
    <table className="dvor1150-table dvor1150-power-up-table"><thead><tr><th />{modules.map(([module]) => <th key={module}>{module}</th>)}</tr></thead>
      <tbody>{tests.map((test) => <tr key={test}><th>{test}</th>{modules.map(([module, installed]) => <td key={module}><StatusBox indicator={installed ? "green" : "gray"} value={installed ? "Pass" : "N/A"} /></td>)}</tr>)}</tbody>
    </table><p className="dvor1150-diagnostic-note">Demo power-up results assume installed processors passed the self-tests; live faults are shown in Fault Isolation.</p></div>;
  const faultIsolation = <div className="dvor1150-content dvor1150-fault-isolation"><DateBox value={diagnosticState.startedAt ?? ""} />
    <table className="dvor1150-table"><thead><tr><th>Sub System</th><th>Progress</th><th>Results</th></tr></thead><tbody>{diagnosticState.rows.map((row) => <tr key={row.subsystem}><th>{row.subsystem}</th><td><progress aria-label={`${row.subsystem} progress`} value={row.progress} max={100} /> {row.progress}%</td><td><StatusBox indicator={indicatorFor(row.status)} value={row.result} /></td></tr>)}</tbody></table>
    <fieldset className="dvor1150-panel"><legend>Fault Isolation Results</legend><div className="dvor1150-fault-results" role="status">{diagnosticState.running ? "Diagnostics running" : diagnosticState.cancelled ? "Diagnostics cancelled" : diagnosticState.result ?? "Run a diagnostic to populate the result."}</div></fieldset>
    <p className="dvor1150-diagnostic-note">Off Air Diagnostics on a real station requires a NOTAM. Demo test results do not alter the RF route.</p>
    <div className="dvor1150-diagnostic-actions"><button type="button" disabled={!canRun || !canOffAir} onClick={() => runDiagnostics("full")}>Run Off Air Diagnostics</button><button type="button" disabled={!diagnosticState.running} onClick={cancelDiagnostics}>Cancel</button><button type="button" disabled={!canRun} onClick={() => runDiagnostics("on-air")}>Run On Air Diagnostics</button></div>
  </div>;
  return <Screen title="Diagnostics Data and Commands" tabs={<ScreenTabs screenId="diagnostics" activeView={activeView} views={["diagnostics-power-up", "diagnostics-fault-isolation"]} />}>{activeView === "diagnostics-fault-isolation" ? faultIsolation : powerUp}</Screen>;
}

export function Dvor1150ScreenRouter() {
  const screen = useDvor1150PmdtStore((state) => state.activeScreen);
  if (screen === "rms-status") return <Dvor1150RmsStatusScreen />;
  if (screen === "rms-data") return <Dvor1150RmsDataScreen />;
  if (screen === "rms-logs") return <Dvor1150RmsLogsScreen />;
  if (screen === "rms-config") return <Dvor1150RmsConfigScreen />;
  if (screen === "monitor-data") return <Dvor1150MonitorDataScreen />;
  if (screen === "monitor-config") return <Dvor1150MonitorConfigScreen />;
  if (screen === "tx-data") return <Dvor1150TxDataScreen />;
  if (screen === "tx-config") return <Dvor1150TxConfigScreen />;
  if (screen === "diagnostics") return <Dvor1150DiagnosticsScreen />;
  return <Dvor1150HomeScreen />;
}
