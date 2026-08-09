"use client";

import { Dvor1150ConfigControl } from "./pmdt-config-control";
import { Dvor1150Toolbar } from "./pmdt-toolbar";
import type { ReactNode } from "react";
import type { Dvor1150MonitorParameter, Dvor1150ViewId } from "@/lib/dvor1150";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

const parameterRows: readonly { id: Dvor1150MonitorParameter; label: string; unit: string; digits: number }[] = [
  { id: "azimuth", label: "Azimuth Angle", unit: "°", digits: 2 },
  { id: "hz30Modulation", label: "30 Hz Modulation", unit: "%", digits: 1 },
  { id: "hz9960Modulation", label: "9960 Hz Modulation", unit: "%", digits: 1 },
  { id: "deviation", label: "FM Deviation", unit: "Ratio", digits: 1 },
  { id: "rfLevel", label: "RF Level", unit: "dB", digits: 1 },
];

const tabLabels: Record<string, string> = {
  "rms-maintenance-alerts": "Maintenance Alerts",
  "rms-ad-data": "A/D Data",
  "rms-config-general": "General",
  "rms-config-station": "Station",
  "rms-config-ad-limits": "A/D Limits",
  "monitor-integrity": "Integrity",
  "monitor-sideband-vswr": "Sideband Antenna VSWR",
  "monitor-alarm-limits": "Alarm Limits",
  "monitor-offsets": "Offsets and Scale Factors",
  "tx-config-nominal": "Nominal",
  "tx-config-offsets": "Offsets and Scale Factors",
};

function ScreenTabs({ screenId, activeView, views }: { screenId: "rms-data" | "rms-config" | "monitor-data" | "monitor-config" | "tx-config"; activeView: Dvor1150ViewId; views: readonly Dvor1150ViewId[] }) {
  const openView = useDvor1150PmdtStore((state) => state.openView);
  return <div className="dvor1150-tabs" role="tablist">
    {views.map((view) => <button key={view} type="button" role="tab" aria-selected={activeView === view} onClick={() => openView(screenId, view, [tabLabels[view] ?? view])}>{tabLabels[view] ?? view}</button>)}
  </div>;
}

function statusClass(indicator: string): string {
  return `dvor1150-status-cell--${indicator}`;
}

function StatusCell({ indicator, value }: { indicator: "green" | "yellow" | "red" | "gray"; value?: string }) {
  return <span className={`dvor1150-readout ${statusClass(indicator)}`}>{value ?? (indicator === "green" ? "G" : indicator === "yellow" ? "Y" : indicator === "red" ? "R" : "")}</span>;
}

function Screen({ title, children, tabs }: { title: string; children: ReactNode; tabs?: ReactNode }) {
  return <section className="flex min-h-full flex-col dvor1150-screen"><Dvor1150Toolbar title={title} />{tabs}{children}</section>;
}

export function Dvor1150HomeScreen() {
  return <section className="pmdt-home-screen"><div className="dvor1150-logo">AMS <small>(ASI) Inc. PMDT</small></div></section>;
}

export function Dvor1150RmsStatusScreen() {
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  const rows = [
    ["Maintenance Alert", data.rmsStatus.maintenanceAlert, "yellow" as const],
    ["On Battery", data.rmsStatus.onBattery, "yellow" as const],
    ["AC Failure", data.rmsStatus.acFailure, "red" as const],
    ["Local Control Mode", data.rmsStatus.localControlMode, "yellow" as const],
    ["Monitor Certification Running", data.rmsStatus.monitorCertificationRunning, "yellow" as const],
    ["Ground Check Running", data.rmsStatus.groundCheckRunning, "yellow" as const],
    ["Test Generator Running", data.rmsStatus.testGeneratorRunning, "yellow" as const],
    ["Hold Commutator Enabled", data.rmsStatus.holdCommutatorEnabled, "yellow" as const],
  ] as const;
  return <Screen title="RMS Status"><div className="dvor1150-content"><time className="dvor1150-date">{data.timestamp}</time><fieldset className="dvor1150-panel"><legend>VOR/DME Status</legend><table className="dvor1150-table"><tbody>{rows.map(([label, active, color]) => <tr key={label}><th>{label}</th><td><StatusCell indicator={active ? color : "gray"} value={active ? "Active" : ""} /></td></tr>)}</tbody></table></fieldset></div></Screen>;
}

export function Dvor1150RmsDataScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  return <Screen title="RMS Data" tabs={<ScreenTabs screenId="rms-data" activeView={activeView} views={["rms-maintenance-alerts", "rms-ad-data"]} />}><div className="dvor1150-content"><time className="dvor1150-date">{data.timestamp}</time>{activeView === "rms-ad-data" ? <table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Low</th><th>Prealarm Low</th><th>Data</th><th>Prealarm High</th><th>High</th><th>Unit</th></tr></thead><tbody>{data.adData.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td>{row.low}</td><td>{row.preLow}</td><td><span className="dvor1150-readout dvor1150-status-cell--green">{row.value}</span></td><td>{row.preHigh}</td><td>{row.high}</td><td>{row.unit}</td></tr>)}</tbody></table> : <table className="dvor1150-table"><thead><tr><th>Maintenance Alert / Alarm</th><th>Status</th></tr></thead><tbody>{data.maintenanceAlerts.map((row) => <tr key={row.label}><th>{row.label}</th><td><StatusCell indicator={row.indicator} value={row.indicator === "gray" ? "Normal" : row.indicator === "green" ? "Normal" : "Alert"} /></td></tr>)}</tbody></table>}</div></Screen>;
}

export function Dvor1150RmsLogsScreen() {
  const logs = useDvor1150PmdtStore((state) => state.derived.data.logs);
  return <Screen title="RMS Logs"><div className="dvor1150-content"><table className="dvor1150-table"><thead><tr><th>Time</th><th>User</th><th>Activity</th><th>Status</th></tr></thead><tbody>{logs.length ? logs.map((entry, index) => <tr key={`${entry.timeTag}-${index}`}><td>{entry.timeTag}</td><td>{entry.user}</td><td>{entry.message}</td><td><StatusCell indicator={entry.severity} /></td></tr>) : <tr><td colSpan={4} className="dvor1150-no-data">No log entries.</td></tr>}</tbody></table></div></Screen>;
}

function ConfigRows({ fields }: { fields: readonly { id: string; label: string; unit?: string; type?: "number" | "text" | "boolean" | "select"; digits?: number }[] }) {
  return <tbody>{fields.map((field) => <tr key={field.id}><th>{field.label}</th><td><Dvor1150ConfigControl fieldId={field.id} type={field.type} digits={field.digits} /></td><td>{field.unit ?? ""}</td></tr>)}</tbody>;
}

export function Dvor1150RmsConfigScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const general = [
    { id: "rms.rcsuPresent", label: "RCSU Present", type: "boolean" as const },
    { id: "rms.rcsuConnectionType", label: "Connection Type", type: "select" as const },
    { id: "monitor.votingLogic", label: "Monitor Voting Logic", type: "select" as const },
    { id: "monitor.monitorStartupDelay", label: "Monitor Startup Delay", unit: "seconds", digits: 0 },
    { id: "monitor.monitorShutdownDelay", label: "Monitor Shutdown Delay", unit: "seconds", digits: 0 },
    { id: "monitor.identMonitoringEnabled", label: "Ident Monitoring", type: "boolean" as const },
    { id: "rms.automaticRestartsEnabled", label: "Automatic Restarts", type: "boolean" as const },
    { id: "rms.firstRestartDelay", label: "First Restart Delay", unit: "seconds", digits: 0 },
  ];
  const station = [
    { id: "station.stationDescription", label: "Station Description" },
    { id: "station.stationType", label: "Station Type", type: "select" as const },
    { id: "station.transmitterConfig", label: "Transmitter Configuration", type: "select" as const },
    { id: "station.monitorConfig", label: "Monitor Configuration", type: "select" as const },
    { id: "station.frequencyMHz", label: "Transmitter Frequency", unit: "MHz", digits: 4 },
  ];
  return <Screen title="RMS Configuration" tabs={<ScreenTabs screenId="rms-config" activeView={activeView} views={["rms-config-general", "rms-config-station", "rms-config-ad-limits"]} />}><div className="dvor1150-content">{activeView === "rms-config-station" ? <fieldset className="dvor1150-panel"><legend>Station Configuration</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>User Configuration</th><th>Unit</th></tr></thead><ConfigRows fields={station} /></table></fieldset> : activeView === "rms-config-ad-limits" ? <fieldset className="dvor1150-panel"><legend>A/D Limits</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Low</th><th>Prealarm Low</th><th>Data</th><th>Prealarm High</th><th>High</th></tr></thead><tbody><tr><th>+28 VDC</th><td>25</td><td>26</td><td>28</td><td>30</td><td>31</td></tr><tr><th>+48 VDC</th><td>44</td><td>46</td><td>48</td><td>50</td><td>52</td></tr><tr><th>Cabinet Temperature</th><td>0</td><td>5</td><td>23</td><td>45</td><td>50</td></tr></tbody></table></fieldset> : <fieldset className="dvor1150-panel"><legend>General RMS Configuration</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>User Configuration</th><th>Unit</th></tr></thead><ConfigRows fields={general} /></table></fieldset>}</div></Screen>;
}

export function Dvor1150MonitorDataScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const derived = useDvor1150PmdtStore((state) => state.derived);
  return <Screen title="Monitor Data" tabs={<ScreenTabs screenId="monitor-data" activeView={activeView} views={["monitor-integrity", "monitor-sideband-vswr"]} />}><div className="dvor1150-content">{activeView === "monitor-sideband-vswr" ? <fieldset className="dvor1150-panel"><legend>Sideband Antenna VSWR</legend><div className="dvor1150-vswr-grid">{derived.data.sidebandVswr.map((row) => <div key={row.antenna} className="dvor1150-vswr-cell"><span>Antenna {row.antenna}</span><span className={`dvor1150-readout ${statusClass(row.indicator)}`}>{row.value.toFixed(2)}</span></div>)}</div></fieldset> : <div className="dvor1150-two-column">{(["mon1", "mon2"] as const).map((monitorId) => { const monitor = derived.monitors[monitorId]; return <fieldset className="dvor1150-panel" key={monitorId}><legend>Monitor {monitorId === "mon1" ? 1 : 2}</legend><div className="dvor1150-monitor-summary"><StatusCell indicator={monitor.commStatus} value="Comm Status" /><StatusCell indicator={monitor.controlling ? "green" : "gray"} value={monitor.controlling ? "Controlling" : "Standby"} /></div><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Alarm Low</th><th>Prealarm Low</th><th>Data</th><th>Prealarm High</th><th>Alarm High</th><th>Unit</th></tr></thead><tbody>{parameterRows.map((row) => { const result = monitor.parameters[row.id]; const limits = useDvor1150PmdtStore.getState().config.monitor.alarmLimits[row.id]; return <tr key={row.id}><th>{row.label}</th><td>{limits.alarmLow}</td><td>{limits.preAlarmLow}</td><td><span className={`dvor1150-readout ${statusClass(result.indicator)}`}>{result.value.toFixed(row.digits)}</span></td><td>{limits.preAlarmHigh}</td><td>{limits.alarmHigh}</td><td>{row.unit}</td></tr>; })}</tbody></table></fieldset>; })}</div>}</div></Screen>;
}

export function Dvor1150MonitorConfigScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  return <Screen title="Monitor Configuration" tabs={<ScreenTabs screenId="monitor-config" activeView={activeView} views={["monitor-alarm-limits", "monitor-offsets"]} />}><div className="dvor1150-content">{activeView === "monitor-offsets" ? <fieldset className="dvor1150-panel"><legend>Monitor Offsets and Scale Factors</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Monitor 1</th><th>Monitor 2</th><th>Unit</th></tr></thead><tbody>{parameterRows.map((row) => <tr key={row.id}><th>{row.label}</th><td><Dvor1150ConfigControl fieldId={`monitor.offsets.mon1.${row.id}`} digits={row.digits} /></td><td><Dvor1150ConfigControl fieldId={`monitor.offsets.mon2.${row.id}`} digits={row.digits} /></td><td>{row.unit}</td></tr>)}</tbody></table></fieldset> : <fieldset className="dvor1150-panel"><legend>Monitor Alarm Limits</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Alarm Low</th><th>Prealarm Low</th><th>Nominal</th><th>Prealarm High</th><th>Alarm High</th><th>Unit</th></tr></thead><tbody>{parameterRows.map((row) => <tr key={row.id}><th>{row.label}</th>{(["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] as const).map((band) => <td key={band}><Dvor1150ConfigControl fieldId={`monitor.alarmLimits.${row.id}.${band}`} digits={row.digits} /></td>)}<td>{row.unit}</td></tr>)}</tbody></table></fieldset>}</div></Screen>;
}

export function Dvor1150TxDataScreen() {
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  const cell = (value: number | null, digits = 3) => value === null ? "" : value.toFixed(digits);
  return <Screen title="Transmitter Data"><div className="dvor1150-content"><time className="dvor1150-date">{data.timestamp}</time><fieldset className="dvor1150-panel"><legend>Power</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Tx #1</th><th>Tx #2</th><th>Unit</th></tr></thead><tbody>{data.txPower.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td><span className="dvor1150-readout">{row.tx1.toFixed(3)}</span></td><td><span className="dvor1150-readout">{row.tx2.toFixed(3)}</span></td><td>{row.unit}</td></tr>)}</tbody></table></fieldset><fieldset className="dvor1150-panel"><legend>Frequency</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Tx #1</th><th>Tx #2</th><th>Unit</th></tr></thead><tbody>{data.txFrequency.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td><span className="dvor1150-readout">{cell(row.tx1, row.unit === "MHz" ? 4 : 2)}</span></td><td><span className="dvor1150-readout">{cell(row.tx2, row.unit === "MHz" ? 4 : 2)}</span></td><td>{row.unit}</td></tr>)}</tbody></table></fieldset><fieldset className="dvor1150-panel"><legend>VSWR</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Tx #1</th><th>Tx #2</th><th>Unit</th></tr></thead><tbody>{data.txVswr.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td><span className="dvor1150-readout">{cell(row.tx1, 2)}</span></td><td><span className="dvor1150-readout">{cell(row.tx2, 2)}</span></td><td>: 1</td></tr>)}</tbody></table></fieldset></div></Screen>;
}

export function Dvor1150TxConfigScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const timestamp = useDvor1150PmdtStore((state) => state.derived.data.timestamp);
  const fields = [
    ["Azimuth Index", "azimuthIndex", "°", 2],
    ["Output Power", "outputPower", "Watts", 1],
    ["Voice Modulation", "voiceModulation", "%", 1],
    ["Ident Modulation", "identModulation", "%", 1],
    ["Reference Modulation", "referenceModulation", "%", 1],
    ["SBO RF Level", "sboRfLevel", "%", 1],
  ] as const;
  const offsetFields = [
    ["Azimuth Angle Offset", "azimuthAngle", "°", 2],
    ["Output Power Scale", "outputPowerScale", "%", 1],
    ["Voice Modulation Scale", "voiceModulationScale", "%", 1],
    ["Ident Modulation Scale", "identModulationScale", "%", 1],
    ["Reference Modulation Scale", "referenceModulationScale", "%", 1],
    ["Sideband 1 RF Level Scale", "sideband1RfLevelScale", "%", 1],
    ["Sideband 2 RF Level Scale", "sideband2RfLevelScale", "%", 1],
    ["Sideband 3 RF Level Scale", "sideband3RfLevelScale", "%", 1],
    ["Sideband 4 RF Level Scale", "sideband4RfLevelScale", "%", 1],
  ] as const;
  const rows = activeView === "tx-config-offsets" ? offsetFields : fields;
  const prefix = activeView === "tx-config-offsets" ? "offsets" : "nominal";
  return <Screen title="Transmitter Configuration" tabs={<ScreenTabs screenId="tx-config" activeView={activeView} views={["tx-config-nominal", "tx-config-offsets"]} />}><div className="dvor1150-content"><time className="dvor1150-date">{timestamp}</time><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Transmitter 1</th><th>Transmitter 2</th><th>Unit</th></tr></thead><tbody>{rows.map(([label, field, unit, digits]) => <tr key={field}><th>{label}</th><td><Dvor1150ConfigControl fieldId={`transmitters.tx1.${prefix}.${field}`} digits={digits} /></td><td><Dvor1150ConfigControl fieldId={`transmitters.tx2.${prefix}.${field}`} digits={digits} /></td><td>{unit}</td></tr>)}{activeView === "tx-config-nominal" ? <tr><th>Ident Code</th><td><Dvor1150ConfigControl fieldId="transmitters.tx1.nominal.identCode" /></td><td><Dvor1150ConfigControl fieldId="transmitters.tx2.nominal.identCode" /></td><td>Text</td></tr> : null}</tbody></table></div></Screen>;
}

export function Dvor1150DiagnosticsScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const modules = ["RMS", "Monitor 1", "Monitor 2", "Audio Generator 1", "Audio Generator 2"];
  return <Screen title="Diagnostics"><div className="dvor1150-content"><div className="dvor1150-tabs"><button type="button" aria-selected={activeView === "diagnostics-power-up"} onClick={() => useDvor1150PmdtStore.getState().openView("diagnostics", "diagnostics-power-up", ["Diagnostics", "Power Up Results"])}>Power Up Results</button><button type="button" aria-selected={activeView === "diagnostics-fault-isolation"} onClick={() => useDvor1150PmdtStore.getState().openView("diagnostics", "diagnostics-fault-isolation", ["Diagnostics", "Fault Isolation"])}>Fault Isolation</button></div>{activeView === "diagnostics-fault-isolation" ? <fieldset className="dvor1150-panel"><legend>Fault Isolation Test Results</legend><p>Run On-Air Diagnostics is available from Security Level 2. Full diagnostics require Local mode and Security Level 3.</p><div className="dvor1150-no-data">No diagnostic run in progress.</div></fieldset> : <fieldset className="dvor1150-panel"><legend>Power-Up Diagnostics Results</legend><table className="dvor1150-table"><thead><tr><th>Module</th><th>CPU</th><th>RAM</th><th>PROM</th><th>EEPROM</th></tr></thead><tbody>{modules.map((module) => <tr key={module}><th>{module}</th><td><StatusCell indicator="green" /></td><td><StatusCell indicator="green" /></td><td><StatusCell indicator="green" /></td><td><StatusCell indicator="green" /></td></tr>)}</tbody></table></fieldset>}</div></Screen>;
}

export function Dvor1150DisabledScreen() {
  return <Screen title="PMDT"><div className="dvor1150-content"><div className="dvor1150-no-data">Screen not available in this simplified Model 1150 simulator.</div></div></Screen>;
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
  if (screen === "disabled") return <Dvor1150DisabledScreen />;
  return <Dvor1150HomeScreen />;
}
