"use client";

import { useState, type ReactNode } from "react";
import type {
  Dvor1150Config,
  Dvor1150IndicatorColor,
  Dvor1150MonitorId,
  Dvor1150MonitorParameter,
  Dvor1150ScreenId,
  Dvor1150ViewId,
} from "@/lib/dvor1150";
import { getDvor1150ConfigValue } from "@/lib/dvor1150";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";
import { Dvor1150ConfigControl } from "./pmdt-config-control";
import { Dvor1150Toolbar } from "./pmdt-toolbar";

const tabLabels: Record<string, string> = {
  "rms-maintenance-alerts": "Maintenance Alerts",
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
type AlarmBand = (typeof alarmBands)[number];

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

function Screen({ title, children, tabs }: { title: string; children: ReactNode; tabs?: ReactNode }) {
  return <section className="dvor1150-screen"><Dvor1150Toolbar title={title} />{tabs}{children}</section>;
}

function ConfigRow({ label, fieldId, unit, type, digits, mirrorFieldIds }: { label: string; fieldId: string; unit?: string; type?: "number" | "text" | "boolean" | "select"; digits?: number; mirrorFieldIds?: readonly string[] }) {
  return <div className="dvor1150-config-row"><span className="dvor1150-config-label">{label}</span><Dvor1150ConfigControl fieldId={fieldId} type={type} digits={digits} mirrorFieldIds={mirrorFieldIds} /><span className="dvor1150-config-unit">{unit ?? ""}</span></div>;
}

function ConfigRadio({ fieldId, value, label }: { fieldId: string; value: string; label: string }) {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const security = useDvor1150PmdtStore((state) => state.securityLevel);
  const local = useDvor1150PmdtStore((state) => state.config.simulation.local);
  const setConfigValue = useDvor1150PmdtStore((state) => state.setConfigValue);
  return <label className="dvor1150-config-radio"><input type="radio" checked={getDvor1150ConfigValue(config, fieldId) === value} disabled={security < 3 || !local} onChange={() => setConfigValue(fieldId, value)} />{label}</label>;
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

function AdDataTable({ title, rows }: { title: string; rows: readonly { parameter: string; low: number; value: number; high: number; unit: string }[] }) {
  return <fieldset className="dvor1150-panel dvor1150-ad-panel"><legend>{title}</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Lo Limit</th><th>Data</th><th>Hi Limit</th><th>Unit</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.parameter}-${index}`}><th>{row.parameter}</th><td><StaticInput value={row.low.toFixed(2)} /></td><td><Readout value={row.value.toFixed(2)} /></td><td><StaticInput value={row.high.toFixed(2)} /></td><td>{row.unit}</td></tr>)}</tbody></table></fieldset>;
}

function RmsMaintenanceAlerts({ data }: { data: ReturnType<typeof useDvor1150PmdtStore.getState>["derived"]["data"] }) {
  return <div className="dvor1150-alert-log-panel"><div className="dvor1150-log-actions"><button type="button">Update</button><button type="button">Reset</button></div><table className="dvor1150-table"><thead><tr><th>Alert</th><th>Tx 1</th><th>Tx 2</th><th>Monitor 1</th><th>Monitor 2</th></tr></thead><tbody>{data.maintenanceAlerts.map((row) => <tr key={row.label}><th>{row.label}</th><td><StatusBox indicator={row.indicator} /></td><td><StatusBox indicator={row.indicator} /></td><td><StatusBox indicator={row.indicator} /></td><td><StatusBox indicator={row.indicator} /></td></tr>)}</tbody></table></div>;
}

export function Dvor1150RmsDataScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  const tx1 = data.adDataByTransmitter.tx1.map(({ parameter, low, value, high, unit }) => ({ parameter, low, value, high, unit }));
  const tx2 = data.adDataByTransmitter.tx2.map(({ parameter, low, value, high, unit }) => ({ parameter, low, value, high, unit }));
  const temperatures = data.temperatureData.filter((row) => row.parameter.includes("Transmitter")).map(({ parameter, low, value, high, unit }) => ({ parameter, low, value, high, unit }));
  return <Screen title="RMS Data" tabs={<ScreenTabs screenId="rms-data" activeView={activeView} views={["rms-maintenance-alerts", "rms-ad-data"]} />}><div className="dvor1150-content">{activeView === "rms-ad-data" ? <><DateBox value={data.timestamp} /><div className="dvor1150-rms-ad-grid"><AdDataTable title="Transmitter 1" rows={tx1} /><AdDataTable title="Transmitter 2" rows={tx2} /><AdDataTable title="Temperature" rows={temperatures} /></div></> : <RmsMaintenanceAlerts data={data} />}</div></Screen>;
}

type Dvor1150LogTableRow = {
  timeTag: string;
  user: string;
  message: string;
  severity: Dvor1150IndicatorColor;
};

const fallbackLogRows: Dvor1150LogTableRow[] = [
  { timeTag: "03/29/06 10:44:51", user: "Monitor 2", message: "Deviation", severity: "green" as const },
  { timeTag: "03/29/06 10:44:10", user: "Monitor 2", message: "Deviation", severity: "green" as const },
  { timeTag: "03/29/06 10:43:28", user: "Monitor 1", message: "30 Hz Mod", severity: "green" as const },
];

function LogTable({ mode, rows }: { mode: "alarms" | "maintenance" | "command"; rows: readonly Dvor1150LogTableRow[] }) {
  const heading = mode === "command" ? "Command Activity" : mode === "maintenance" ? "Maintenance Alerts" : "Alarms";
  return <div className="dvor1150-log-table-panel"><div className="dvor1150-log-actions"><button type="button">Update</button><button type="button">Reset</button></div><table className="dvor1150-table"><thead>{mode === "command" ? <tr><th>Time Tag</th><th>User Name</th><th>Command</th></tr> : <tr><th>Time Tag</th><th>Type</th><th>{mode === "alarms" ? "Alarm" : "Alert"}</th><th>State</th></tr>}</thead><tbody>{rows.map((row, index) => mode === "command" ? <tr key={`${row.timeTag}-${index}`}><td>{row.timeTag}</td><td>{row.user}</td><td>{row.message}</td></tr> : <tr key={`${row.timeTag}-${index}`}><td>{row.timeTag}</td><td>{row.user}</td><td>{row.message}</td><td>{row.severity === "green" ? "Normal" : row.severity === "yellow" ? "Alert Low" : "Alarm"}</td></tr>)}</tbody></table><span className="dvor1150-log-caption">{heading}</span></div>;
}

function OperationalSummary() {
  return <div className="dvor1150-operational-summary"><div className="dvor1150-log-actions"><button type="button">Update</button><button type="button">Reset</button></div><table className="dvor1150-table"><thead><tr><th /><th>Transmitter 1</th><th>Transmitter 2</th><th>Units</th></tr></thead><tbody><tr><th>Time in Normal State</th><td>0.65</td><td>0.00</td><td>Hours</td></tr><tr><th>Time in Standby State</th><td>0.03</td><td>0.76</td><td>Hours</td></tr><tr><th>Availability</th><td>14.1087</td><td>15.7685</td><td>%</td></tr><tr><th>Start Time</th><td colSpan={2}>03/29/06 10:17:01</td><td /></tr><tr><th>End Time</th><td colSpan={2}>03/29/06 14:59:28</td><td /></tr><tr><th>Elapsed Time</th><td>4.9187</td><td>Hours</td><td /></tr></tbody></table><button type="button" className="dvor1150-summary-reset">Reset Operational Summary</button></div>;
}

function ParameterChangeTable() {
  const entries = useDvor1150PmdtStore((state) => state.parameterChangeLogs);
  const rows = entries.length ? entries : [
    { id: "sample-1", timeTag: "03/29/06 14:23:08", userName: "SEC3", file: "Monitor #2" },
    { id: "sample-2", timeTag: "03/29/06 14:23:07", userName: "SEC3", file: "Monitor #1" },
    { id: "sample-3", timeTag: "03/29/06 14:23:06", userName: "SEC3", file: "RMS" },
  ];
  return <div className="dvor1150-log-table-panel"><div className="dvor1150-log-actions"><button type="button">Update</button><button type="button">Reset</button></div><table className="dvor1150-table"><thead><tr><th>Time Tag</th><th>User Name</th><th>File</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.timeTag}</td><td>{row.userName}</td><td>{row.file}</td></tr>)}</tbody></table></div>;
}

export function Dvor1150RmsLogsScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const stored = useDvor1150PmdtStore((state) => state.derived.data.logs);
  const rows = stored.length ? stored.map((row) => ({ timeTag: row.timeTag, user: row.user, message: row.message, severity: row.severity })) : fallbackLogRows;
  const views = ["rms-logs-operational-summary", "rms-logs-alarms", "rms-logs-maintenance-alerts", "rms-logs-command-activity", "rms-logs-parameter-change"] as const;
  let content: ReactNode = <OperationalSummary />;
  if (activeView === "rms-logs-alarms") content = <LogTable mode="alarms" rows={rows} />;
  if (activeView === "rms-logs-maintenance-alerts") content = <LogTable mode="maintenance" rows={rows} />;
  if (activeView === "rms-logs-command-activity") content = <LogTable mode="command" rows={rows} />;
  if (activeView === "rms-logs-parameter-change") content = <ParameterChangeTable />;
  return <Screen title="RMS Logs" tabs={<ScreenTabs screenId="rms-logs" activeView={activeView} views={views} />}><div className="dvor1150-content">{content}</div></Screen>;
}

function Dvor1150RmsGeneralConfiguration() {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  return <div className="dvor1150-content dvor1150-rms-general-grid"><DateBox value={config.simulation.timestamp} /><div className="dvor1150-rms-general-columns">
    <div><fieldset className="dvor1150-panel"><legend>RCSU Configuration</legend><div className="dvor1150-config-row"><span className="dvor1150-config-label">RCSU Type</span><StaticSelect value="None/1138 RSCU" /><span /></div><div className="dvor1150-config-row"><span className="dvor1150-config-label">Connection Type</span><StaticSelect value="Dedicated Modem" /><span /></div></fieldset><fieldset className="dvor1150-panel"><legend>Ident Configuration</legend><div className="dvor1150-config-row"><span className="dvor1150-config-label">Transmitter 1 Ident</span><StaticInput value="VOR" /><span /></div><div className="dvor1150-config-row"><span className="dvor1150-config-label">Transmitter 2 Ident</span><StaticInput value="VOR" /><span /></div></fieldset><fieldset className="dvor1150-panel"><legend>Monitor Configuration</legend><ConfigRow label="Startup Delay (seconds)" fieldId="monitor.monitorStartupDelay" digits={0} unit="" /><ConfigRow label="Shutdown Delay (seconds)" fieldId="monitor.monitorShutdownDelay" digits={0} unit="" /><div className="dvor1150-radio-line"><span>Monitor Voting Logic</span><ConfigRadio fieldId="monitor.votingLogic" value="AND" label="AND" /><ConfigRadio fieldId="monitor.votingLogic" value="OR" label="OR" /></div></fieldset></div>
    <div><fieldset className="dvor1150-panel"><legend>Digital I/O Configuration</legend><div className="dvor1150-check-grid"><label><Dvor1150ConfigControl fieldId="rms.smokeAlarmInstalled" type="boolean" /> Smoke Alarm Installed</label><label><input type="checkbox" checked disabled readOnly /> Enable Remote Reset</label><label><Dvor1150ConfigControl fieldId="rms.intrusionAlarmInstalled" type="boolean" /> Intrusion Alarm Installed</label><label><input type="checkbox" checked disabled readOnly /> Enable Remote Reset</label><div className="dvor1150-config-row"><span>Exit Delay (minutes)</span><StaticInput value="0" /><span /></div><div className="dvor1150-config-row"><span>Entry Delay (minutes)</span><StaticInput value="0" /><span /></div></div><div className="dvor1150-config-row"><span className="dvor1150-config-label">Spare #1 Usage</span><StaticSelect value="Not Present" /><span /></div><div className="dvor1150-config-row"><span className="dvor1150-config-label">Spare #2 Usage</span><StaticSelect value="Not Present" /><span /></div></fieldset><fieldset className="dvor1150-panel"><legend>Modem Configuration</legend><div className="dvor1150-config-row"><span className="dvor1150-config-label">Dial In VOR # Rings</span><StaticInput value="1" /><span /></div><label className="dvor1150-check-line"><input type="checkbox" checked disabled readOnly /> Tone Dial Out</label><label className="dvor1150-check-line"><input type="checkbox" checked disabled readOnly /> Dial Out VOR Enabled</label><div className="dvor1150-config-row"><span className="dvor1150-config-label">Dial Out Phone Number</span><StaticInput value="6827" /><span /></div></fieldset><fieldset className="dvor1150-panel"><legend>Automatic Restarts</legend><label className="dvor1150-check-line"><Dvor1150ConfigControl fieldId="rms.automaticRestartsEnabled" type="boolean" /> Automatic Restarts Enabled</label><ConfigRow label="First Restart Delay (seconds)" fieldId="rms.firstRestartDelay" digits={0} /></fieldset><fieldset className="dvor1150-panel"><legend>DME Configuration</legend><div className="dvor1150-config-row"><span className="dvor1150-config-label">DME Type</span><StaticSelect value="SELEX 1118/1119" /><span /></div><label className="dvor1150-check-line"><Dvor1150ConfigControl fieldId="rms.dualDme" type="boolean" /> Dual</label><label className="dvor1150-check-line"><Dvor1150ConfigControl fieldId="rms.keyingOutputEnabled" type="boolean" /> Keying Output Enabled</label></fieldset></div>
  </div></div>;
}

function Dvor1150ConfigRadioGroup({ onOpenDip }: { onOpenDip: () => void }) {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  return <fieldset className="dvor1150-panel dvor1150-user-config-panel"><legend>User Configuration</legend><div className="dvor1150-radio-line"><ConfigRadio fieldId="station.stationType" value="CVOR" label="CVOR" /><ConfigRadio fieldId="station.stationType" value="DVOR" label="DVOR" /></div><div className="dvor1150-radio-line"><ConfigRadio fieldId="station.transmitterConfig" value="Dual Transmitters" label="Dual Equip" /><ConfigRadio fieldId="station.transmitterConfig" value="Single Transmitter" label="Single Equip" /></div><div className="dvor1150-radio-line"><ConfigRadio fieldId="station.monitorConfig" value="Dual Monitors" label="Dual Monitors" /><ConfigRadio fieldId="station.monitorConfig" value="Single Monitor" label="Single Monitor" /></div><label className="dvor1150-check-line"><input type="checkbox" checked={config.station.transmitterConfig === "Dual Transmitters"} disabled readOnly /> Hot Standby</label><ConfigRow label="Frequency" fieldId="station.frequencyMHz" digits={4} unit="MHz" /><button type="button" className="dvor1150-dip-open-button" onClick={onOpenDip}>Display DIP Switch Settings</button><label className="dvor1150-check-line"><input type="checkbox" checked disabled readOnly /> Allow Remote Configuration</label></fieldset>;
}

function Dvor1150RmsStationConfiguration({ onOpenDip }: { onOpenDip: () => void }) {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  return <div className="dvor1150-content dvor1150-station-config"><div className="dvor1150-station-dates"><DateBox value={config.simulation.timestamp} /><DateBox value={config.simulation.timestamp} /></div><div className="dvor1150-station-grid"><Dvor1150ConfigRadioGroup onOpenDip={onOpenDip} /><fieldset className="dvor1150-panel dvor1150-rms-station-panel"><legend>RMS</legend><button type="button" disabled>DVOR</button><button type="button" disabled>Dual Equip</button><button type="button" disabled>Dual Monitors</button><button type="button" disabled>Cold Standby</button></fieldset></div><div className="dvor1150-station-identifier"><span>Station Identifier</span><Dvor1150ConfigControl fieldId="station.stationDescription" type="text" /></div></div>;
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

function Dvor1150SecurityCodes() {
  const rows = ["SEC4", "SEC3", "", "", ""];
  return <div className="dvor1150-content dvor1150-security-codes"><button type="button" disabled className="dvor1150-security-unavailable">Unavailable</button><div className="dvor1150-security-columns"><fieldset className="dvor1150-panel"><legend>User ID</legend>{rows.map((row, index) => <StaticInput key={index} value={row} />)}</fieldset><fieldset className="dvor1150-panel"><legend>Password</legend>{rows.map((_, index) => <StaticInput key={index} value="" />)}</fieldset><fieldset className="dvor1150-panel dvor1150-security-levels"><legend>Level</legend>{rows.map((row, index) => <StaticSelect key={index} value={index === 0 ? "4" : index === 1 ? "3" : ""} />)}</fieldset><fieldset className="dvor1150-panel"><legend>User ID</legend>{rows.map((_, index) => <StaticInput key={index} value="" />)}</fieldset><fieldset className="dvor1150-panel"><legend>Password</legend>{rows.map((_, index) => <StaticInput key={index} value="" />)}</fieldset><fieldset className="dvor1150-panel dvor1150-security-levels"><legend>Level</legend>{rows.map((_, index) => <StaticSelect key={index} value="" />)}</fieldset></div></div>;
}

function dvor1150DipState(frequencyMHz: number): boolean[] {
  const channel = Math.max(0, Math.round((frequencyMHz - 108) * 10));
  return Array.from({ length: 8 }, (_, index) => Boolean(channel & (1 << index)));
}

function Dvor1150SynthesizerDipDialog({ frequencyMHz, onClose }: { frequencyMHz: number; onClose: () => void }) {
  const bits = dvor1150DipState(frequencyMHz);
  return <section className="dvor1150-dip-dialog" role="dialog" aria-modal="true" aria-label="Synthesizer DIP Switches"><header className="dvor1150-dip-dialog-titlebar"><span>Synthesizer DIP Switches - Required Settings</span><button type="button" aria-label="Close" onClick={onClose}>×</button></header><div className="dvor1150-dip-dialog-body"><div className="dvor1150-dip-column"><span>S1</span>{bits.map((enabled, index) => <div className="dvor1150-dip-switch-row" key={index}><span className={`dvor1150-dip-switch ${enabled ? "dvor1150-dip-switch--on" : ""}`}><span /></span><span>{index + 1}</span></div>)}</div><button type="button" onClick={onClose}>OK</button><fieldset><legend>Note:</legend><span>For rocker-type DIP switches, the side indicated with ▼ should be depressed.</span></fieldset></div></section>;
}

export function Dvor1150RmsConfigScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const [dipOpen, setDipOpen] = useState(false);
  const views = ["rms-config-general", "rms-config-station", "rms-config-ad-limits", "rms-config-security-codes"] as const;
  let body: ReactNode = <Dvor1150RmsGeneralConfiguration />;
  if (activeView === "rms-config-station") body = <Dvor1150RmsStationConfiguration onOpenDip={() => setDipOpen(true)} />;
  if (activeView === "rms-config-ad-limits") body = <Dvor1150RmsAdLimits />;
  if (activeView === "rms-config-security-codes") body = <Dvor1150SecurityCodes />;
  return <><Screen title="RMS Configuration" tabs={<ScreenTabs screenId="rms-config" activeView={activeView} views={views} />}>{body}</Screen>{dipOpen ? <Dvor1150SynthesizerDipDialog frequencyMHz={config.station.frequencyMHz} onClose={() => setDipOpen(false)} /> : null}</>;
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
  return <div className="dvor1150-content dvor1150-integrity-content"><MonitorIntegrityBlock monitorId="mon1" /><MonitorIntegrityBlock monitorId="mon2" /></div>;
}

function Dvor1150MonitorTestData() {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const executeCommand = useDvor1150PmdtStore((state) => state.executeCommand);
  const result1 = useDvor1150PmdtStore((state) => state.derived.data.monitorTestResults.mon1);
  const result2 = useDvor1150PmdtStore((state) => state.derived.data.monitorTestResults.mon2);
  const fields: readonly [string, string, string, number][] = [["Azimuth Angle", "azimuthAngle", "°", 2], ["30 Hz Modulation", "hz30Modulation", "%", 1], ["9960 Hz Modulation", "hz9960Modulation", "%", 1], ["Deviation", "deviation", "Ratio", 1], ["Ident Modulation", "identModulation", "%", 1], ["Ident Control", "identControl", "", 0], ["Audio Modulation", "audioModulation", "%", 1], ["Audio Frequency", "audioFrequency", "Hz", 0]];
  return <div className="dvor1150-content dvor1150-monitor-test-data"><fieldset className="dvor1150-panel dvor1150-test-generator-setup"><legend>Test Generator Setup</legend><DateBox value={config.simulation.timestamp} /><table className="dvor1150-table"><thead><tr><th> </th><th>Monitor 1</th><th>Monitor 2</th><th> </th></tr></thead><tbody>{fields.map(([label, field, unit, digits]) => <tr key={field}><th>{label}</th><td>{field === "identControl" ? <Dvor1150ConfigControl fieldId="monitor.testGenerator.identControl" type="select" /> : <Dvor1150ConfigControl fieldId={`monitor.testGenerator.${field}`} digits={digits} />}</td><td>{field === "identControl" ? config.monitor.testGenerator.identControl : formatNumber(config.monitor.testGenerator[field as keyof typeof config.monitor.testGenerator] as number, digits)}</td><td>{unit}</td></tr>)}</tbody></table></fieldset><fieldset className="dvor1150-panel dvor1150-test-results"><legend>Test Results</legend><div className="dvor1150-test-result-columns"><TestResultColumn title="Monitor 1" result={result1} onRun={() => executeCommand("run-monitor-test")} /><TestResultColumn title="Monitor 2" result={result2} onRun={() => executeCommand("run-monitor-test")} /></div></fieldset></div>;
}

function TestResultColumn({ title, result, onRun }: { title: string; result: { available: boolean; values: { azimuthAngle: number; hz30Modulation: number; hz9960Modulation: number; deviation: number }; status: Dvor1150IndicatorColor }; onRun: () => void }) {
  return <fieldset className="dvor1150-panel"><legend>{result.available ? title : "Unavailable"}</legend><div className="dvor1150-test-result-title">{title}</div><div className="dvor1150-test-result-field"><span>Azimuth Angle</span><StaticInput value={result.values.azimuthAngle.toFixed(2)} /></div><div className="dvor1150-test-result-field"><span>30 Hz Mod</span><StaticInput value={result.values.hz30Modulation.toFixed(1)} /></div><div className="dvor1150-test-result-field"><span>9960 Hz Mod</span><StaticInput value={result.values.hz9960Modulation.toFixed(1)} /></div><div className="dvor1150-test-result-field"><span>Deviation</span><StaticInput value={result.values.deviation.toFixed(1)} /></div><button type="button" disabled={!result.available} onClick={onRun}>Run</button></fieldset>;
}

function Dvor1150CertificationResults() {
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  const executeCommand = useDvor1150PmdtStore((state) => state.executeCommand);
  const render = (monitorId: Dvor1150MonitorId) => <fieldset className="dvor1150-panel dvor1150-certification-monitor"><legend>Monitor {monitorId === "mon1" ? 1 : 2}</legend><div className="dvor1150-certification-head"><DateBox value={data.timestamp} /><span>Date / Time</span></div><table className="dvor1150-table"><thead><tr><th> </th><th>Low Limit</th><th>Data</th><th>High Limit</th><th>Data</th><th> </th></tr></thead><tbody>{data.certificationResults[monitorId].filter((row) => row.parameter !== "rfLevel").map((row) => { const meta = parameterMeta[row.parameter]; const lowStatus = row.lowData < row.lowLimit ? "red" : "green"; const highStatus = row.highData > row.highLimit ? "red" : "green"; return <tr key={row.parameter}><th>{meta.label}</th><td>{row.lowLimit.toFixed(meta.digits)}</td><td><Readout value={row.lowData.toFixed(meta.digits)} indicator={lowStatus} /></td><td>{row.highLimit.toFixed(meta.digits)}</td><td><Readout value={row.highData.toFixed(meta.digits)} indicator={highStatus} /></td><td>{meta.unit}</td></tr>; })}</tbody></table><button type="button" onClick={() => executeCommand(`run-certification-${monitorId}`)}>Run</button></fieldset>;
  return <div className="dvor1150-content dvor1150-certification-content"><div className="dvor1150-certification-grid">{render("mon1")}{render("mon2")}</div><button type="button" disabled className="dvor1150-set-monitor-limits">Set to Monitor Limits</button></div>;
}

function Dvor1150NotchMonitor() {
  const active = useDvor1150PmdtStore((state) => state.activeView);
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  const executeCommand = useDvor1150PmdtStore((state) => state.executeCommand);
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  return <div className="dvor1150-content dvor1150-notch-content"><div className="dvor1150-notch-toolbar"><DateBox value={data.timestamp} /><label className="dvor1150-check-line"><Dvor1150ConfigControl fieldId="monitor.notch.enabled" type="boolean" /> Enable Notch Monitoring</label><label>Tolerance <Dvor1150ConfigControl fieldId="monitor.notch.tolerance" digits={0} /> %</label><label className="dvor1150-check-line"><input type="checkbox" checked={false} disabled readOnly /> Executive Alarm</label><button type="button" disabled={!config.monitor.notch.enabled} onClick={() => executeCommand("record-notch-baseline")}>Record Baseline</button></div><div className="dvor1150-notch-columns">{[0, 1, 2].map((column) => <table className="dvor1150-table" key={column}><thead><tr><th>Antenna</th><th>Baseline</th><th>Current</th></tr></thead><tbody>{data.notchData.slice(column * 16, column * 16 + 16).map((row) => <tr key={row.antenna}><th>{row.antenna}</th><td>{row.baseline.toFixed(2)}</td><td><Readout value={row.current.toFixed(2)} indicator={row.indicator} /></td></tr>)}</tbody></table>)}</div></div>;
}

function Dvor1150SidebandVswr() {
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  return <div className="dvor1150-content dvor1150-vswr-content"><div className="dvor1150-vswr-toolbar"><DateBox value={data.timestamp} /><label className="dvor1150-check-line"><Dvor1150ConfigControl fieldId="monitor.sidebandVswrExecutiveAlarm" type="boolean" /> Sideband VSWR Executive Alarm</label><label>Tolerance <Dvor1150ConfigControl fieldId="monitor.sidebandVswrTolerance" digits={2} /> : 1</label><label>Number of Antennas in Alarm <Dvor1150ConfigControl fieldId="monitor.numberOfAntennasInAlarm" digits={0} /></label></div><div className="dvor1150-vswr-columns">{[0, 1, 2, 3].map((column) => <table className="dvor1150-table" key={column}><thead><tr><th>Antenna</th><th>VSWR</th></tr></thead><tbody>{data.sidebandVswr.slice(column * 12, column * 12 + 12).map((row) => <tr key={row.antenna}><th>{row.antenna}</th><td><Readout value={row.value.toFixed(2)} indicator={row.indicator} /></td></tr>)}</tbody></table>)}</div></div>;
}

function GroundCheckGraph({ data, mode }: { data: ReturnType<typeof useDvor1150PmdtStore.getState>["derived"]["data"]["groundCheck"]; mode: "quadrantal" | "fft" | "station" }) {
  const points = data.rows.map((row, index) => `${20 + (index * 328) / Math.max(1, data.rows.length - 1)},${91 - row.stationError * 20}`).join(" ");
  return <svg className="dvor1150-ground-graph" viewBox="0 0 360 190" role="img" aria-label={`Ground check ${mode} graph`}><rect x="18" y="12" width="330" height="155" fill="#f0f0f0" stroke="#707070" /><path d="M18 90H348M18 12V167" stroke="#808080" strokeDasharray="2 3" /><polyline points={points} fill="none" stroke="#00a000" strokeWidth="1" /></svg>;
}

function Dvor1150AdvancedGroundCheck({ data, onClose }: { data: ReturnType<typeof useDvor1150PmdtStore.getState>["derived"]["data"]["groundCheck"]; onClose: () => void }) {
  return <section className="dvor1150-advanced-ground-dialog" role="dialog" aria-modal="true" aria-label="Ground Check Error Graph"><header>Ground Check Error Graph <button type="button" onClick={onClose}>×</button></header><div className="dvor1150-advanced-ground-body"><h3>VOR Ground Check Errors: 03/30/07 09:43:52</h3><GroundCheckGraph data={data} mode="quadrantal" /><fieldset><legend>Graph Options</legend><label><input type="checkbox" checked readOnly /> Legend</label><label><input type="checkbox" readOnly /> Markers</label><label><input type="checkbox" readOnly /> FFT Sum</label><label><input type="checkbox" readOnly /> Station Error</label><label><input type="checkbox" checked readOnly /> Bias</label><label><input type="checkbox" checked readOnly /> Quadrantal</label><label><input type="checkbox" checked readOnly /> Octantal</label></fieldset></div><footer><button type="button">Print...</button><button type="button">Copy</button><button type="button">Save As...</button><button type="button" onClick={onClose}>Close</button></footer></section>;
}

function GroundCheckErrorTable({ data }: { data: ReturnType<typeof useDvor1150PmdtStore.getState>["derived"]["data"]["groundCheck"] }) {
  const rows = [
    ["Quadrantal Error", data.quadrantal.amplitude, data.quadrantal.phase],
    ["Octantal Error", data.octantal.amplitude, data.octantal.phase],
    ["Bias", data.bias, null],
  ] as const;
  return <table className="dvor1150-table dvor1150-ground-error-table"><thead><tr><th> </th><th>Amplitude</th><th>Phase</th><th> </th></tr></thead><tbody>{rows.map(([label, amplitude, phase]) => <tr key={label}><th>{label}</th><td>{amplitude.toFixed(3)}</td><td>{phase === null ? "-" : phase.toFixed(1)}</td><td>°</td></tr>)}</tbody></table>;
}

function Dvor1150GroundCheck() {
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  const executeCommand = useDvor1150PmdtStore((state) => state.executeCommand);
  const [advanced, setAdvanced] = useState(false);
  const [mode, setMode] = useState<"quadrantal" | "fft" | "station">("quadrantal");
  return <>
    <div className="dvor1150-content dvor1150-ground-check-content">
      <div className="dvor1150-ground-check-top"><DateBox value={data.timestamp} /><button type="button" onClick={() => executeCommand("run-ground-check")}>Run</button></div>
      <div className="dvor1150-ground-check-grid">
        <div className="dvor1150-ground-samples"><table className="dvor1150-table"><thead><tr><th>Azimuth</th><th>Station<br />Error</th></tr></thead><tbody>{data.groundCheck.rows.map((row) => <tr key={row.azimuth}><th>{row.azimuth.toFixed(2)}</th><td>{row.stationError.toFixed(2)}</td></tr>)}</tbody></table><div className="dvor1150-error-spread"><span>Error Spread</span><StaticInput value={data.groundCheck.errorSpread.toFixed(2)} /></div></div>
        <div className="dvor1150-ground-plot"><GroundCheckErrorTable data={data.groundCheck} /><GroundCheckGraph data={data.groundCheck} mode={mode} /></div>
        <div className="dvor1150-ground-options"><fieldset><legend>Graph Options</legend><label><input type="radio" checked={mode === "quadrantal"} onChange={() => setMode("quadrantal")} /> EPI Forms</label><label><input type="radio" checked={mode === "fft"} onChange={() => setMode("fft")} /> FFT Sum</label><label><input type="radio" checked={mode === "station"} onChange={() => setMode("station")} /> Station Error</label><label><input type="checkbox" readOnly /> Markers</label><label><input type="checkbox" checked readOnly /> Legend</label><button type="button" onClick={() => setAdvanced(true)}>Advanced...</button></fieldset></div>
      </div>
    </div>
    {advanced ? <Dvor1150AdvancedGroundCheck data={data.groundCheck} onClose={() => setAdvanced(false)} /> : null}
  </>;
}

function Dvor1150FaultHistory() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const history = useDvor1150PmdtStore((state) => state.derived.data.faultHistory);
  const timestamps = Array.from(new Set(history.systemStatus.map((row) => row.timestamp))).slice(0, 3);
  while (timestamps.length < 3) timestamps.push("03/29/06 13:23:59");
  const monitorValue = (monitor: Dvor1150MonitorId, parameter: Dvor1150MonitorParameter, timestamp: string) => history.monitorData.find((row) => row.monitor === monitor && row.parameter === parameter && row.timestamp === timestamp);
  const monitorData = <div className="dvor1150-fault-monitor-data"><div className="dvor1150-history-dates">{timestamps.map((timestamp) => <DateBox key={timestamp} value={timestamp} />)}</div>{(["mon1", "mon2"] as const).map((monitor) => <fieldset className="dvor1150-panel" key={monitor}><legend>Monitor {monitor === "mon1" ? 1 : 2}</legend><table className="dvor1150-table"><tbody>{parameterOrder.map((parameter) => <tr key={parameter}><th>{parameterMeta[parameter].label}</th>{timestamps.map((timestamp) => { const row = monitorValue(monitor, parameter, timestamp); return <td key={timestamp}>{row ? <Readout value={row.value.toFixed(parameterMeta[parameter].digits)} indicator={row.indicator} /> : ""}</td>; })}<td>{parameterMeta[parameter].unit}</td></tr>)}<tr><th>Ident Status</th>{timestamps.map((timestamp) => <td key={timestamp}><Readout value="Normal" /></td>)}<td /></tr><tr><th>Notch Monitor</th>{timestamps.map((timestamp) => <td key={timestamp}><StatusBox indicator="green" /></td>)}<td /></tr><tr><th>Sideband VSWR</th>{timestamps.map((timestamp) => <td key={timestamp}><StatusBox indicator="green" /></td>)}<td /></tr></tbody></table></fieldset>)}</div>;
  const systemStatus = <div className="dvor1150-fault-system-status"><div className="dvor1150-history-dates">{timestamps.map((timestamp) => <DateBox key={timestamp} value={timestamp} />)}</div><table className="dvor1150-table"><tbody><tr><th colSpan={4}>Monitor</th></tr><tr><th>Monitor Logic</th>{timestamps.map((timestamp) => <td key={timestamp}>{history.systemStatus.find((row) => row.timestamp === timestamp)?.monitorLogic ?? "AND"}</td>)}<td /></tr><tr><th>Monitor 1</th>{timestamps.map((timestamp) => <td key={timestamp}><StatusBox indicator={history.systemStatus.find((row) => row.timestamp === timestamp)?.monitor1Alarm ? "red" : "green"} /></td>)}<td /></tr><tr><th>Monitor 2</th>{timestamps.map((timestamp) => <td key={timestamp}><StatusBox indicator={history.systemStatus.find((row) => row.timestamp === timestamp)?.monitor2Alarm ? "red" : "green"} /></td>)}<td /></tr><tr><th>Ident Monitoring</th>{timestamps.map((timestamp) => <td key={timestamp}><input type="checkbox" checked readOnly /> Enabled</td>)}<td /></tr><tr><th>Notch Monitor</th>{timestamps.map((timestamp) => <td key={timestamp}><input type="checkbox" checked readOnly /> Enabled<br /><input type="checkbox" readOnly /> Executive</td>)}<td /></tr><tr><th>Sideband VSWR</th>{timestamps.map((timestamp) => <td key={timestamp}><input type="checkbox" readOnly /> Executive</td>)}<td /></tr><tr><th colSpan={4}>Transmitter</th></tr><tr><th>On Antenna</th>{timestamps.map((timestamp) => <td key={timestamp}>Tx 1&nbsp;&nbsp; Tx 2</td>)}<td /></tr><tr><th>Main</th>{timestamps.map((timestamp) => <td key={timestamp}><StatusBox indicator="green" /></td>)}<td /></tr><tr><th>On</th>{timestamps.map((timestamp) => <td key={timestamp}><StatusBox indicator="green" /></td>)}<td /></tr></tbody></table></div>;
  return <Screen title="Fault History" tabs={<ScreenTabs screenId="monitor-data" activeView={activeView} views={["monitor-fault-history-data", "monitor-fault-history-system-status"]} /> }><div className="dvor1150-content">{activeView === "monitor-fault-history-system-status" ? systemStatus : monitorData}</div></Screen>;
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
  if (activeView === "monitor-standby") body = <div className="dvor1150-content dvor1150-empty-screen" />;
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
  return <Screen title="Transmitter Data" tabs={<ScreenTabs screenId="tx-data" activeView={activeView} views={["tx-data-tx1", "tx-data-tx2"]} />}><div className="dvor1150-content dvor1150-tx-data-content"><DateBox value={timestamp} /><div className="dvor1150-tx-data-grid"><div><fieldset className="dvor1150-panel"><legend>Power</legend><table className="dvor1150-table"><tbody>{data.txPower.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td>{row[transmitter].toFixed(2)}</td><td>{row.unit}</td></tr>)}</tbody></table></fieldset><fieldset className="dvor1150-panel"><legend>VSWR</legend><table className="dvor1150-table"><tbody>{data.txVswr.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td>{formatNumber(row[transmitter], 2)}</td><td>: 1</td></tr>)}</tbody></table></fieldset></div><fieldset className="dvor1150-panel"><legend>Frequency</legend><table className="dvor1150-table"><tbody>{data.txFrequency.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td>{formatNumber(row[transmitter], row.unit === "MHz" ? 4 : 2)}</td><td>{row.unit}</td></tr>)}</tbody></table></fieldset></div></div></Screen>;
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
  const executeCommand = useDvor1150PmdtStore((state) => state.executeCommand);
  const modules = ["RMS", "Monitor 1", "Monitor 2", "Audio Gen 1", "Audio Gen 2"];
  const tests = ["CPU Functional Test", "RAM Check", "PROM Check", "EEPROM Check"];
  const powerUp = <div className="dvor1150-content dvor1150-diagnostics-content"><DateBox value="03/29/07 09:10:33" /><table className="dvor1150-table dvor1150-power-up-table"><thead><tr><th> </th>{modules.map((module) => <th key={module}>{module}</th>)}</tr></thead><tbody>{tests.map((test) => <tr key={test}><th>{test}</th>{modules.map((module) => <td key={module}><StatusBox indicator="green" /></td>)}</tr>)}</tbody></table></div>;
  const faultIsolation = <div className="dvor1150-content dvor1150-fault-isolation"><DateBox value="03/29/07 09:10:33" /><table className="dvor1150-table"><thead><tr><th>Sub System</th><th>Progress</th><th>Results</th></tr></thead><tbody>{["Logon / RMM", "Power Supplies", "Monitor", "Audio Generator", "Synthesizer", "Power Amplifier", "Distribution", "Alarm/Alert Analysis", "Control"].map((label) => <tr key={label}><th>{label}</th><td /><td /></tr>)}</tbody></table><fieldset className="dvor1150-panel"><legend>Fault Isolation Results</legend><div className="dvor1150-fault-results" /></fieldset><div className="dvor1150-diagnostic-actions"><button type="button" disabled>Run Full Diagnostics</button><button type="button" disabled>Cancel</button><button type="button" onClick={() => executeCommand("run-on-air-diagnostics")}>Run On Air Diagnostics</button></div></div>;
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
