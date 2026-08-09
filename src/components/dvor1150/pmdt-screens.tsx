"use client";

import { Dvor1150ConfigControl } from "./pmdt-config-control";
import { Dvor1150Toolbar } from "./pmdt-toolbar";
import { useState, type ReactNode } from "react";
import type { Dvor1150MonitorParameter, Dvor1150ScreenId, Dvor1150ViewId } from "@/lib/dvor1150";
import { getDvor1150ConfigValue } from "@/lib/dvor1150";
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
  "rms-logs-operational-summary": "Operational Summary",
  "rms-logs-alarms": "Alarms",
  "rms-logs-maintenance-alerts": "Maintenance Alerts",
  "rms-logs-command-activity": "Command Activity",
  "rms-logs-parameter-change": "Parameter Change",
  "monitor-integrity": "Integrity",
  "monitor-ground-check": "Ground Check",
  "monitor-certification": "Certification Test Results",
  "monitor-test-data": "Test Data",
  "monitor-notch": "Notch Monitor",
  "monitor-sideband-vswr": "Sideband Antenna VSWR",
  "monitor-alarm-limits": "Alarm Limits",
  "monitor-offsets": "Offsets and Scale Factors",
  "tx-data-tx1": "Transmitter 1",
  "tx-data-tx2": "Transmitter 2",
  "tx-config-nominal": "Nominal",
  "tx-config-offsets": "Offsets and Scale Factors",
};

function ScreenTabs({ screenId, activeView, views }: { screenId: Dvor1150ScreenId; activeView: Dvor1150ViewId; views: readonly Dvor1150ViewId[] }) {
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

function StatusBox({ indicator }: { indicator: "green" | "yellow" | "red" | "gray" }) {
  return <span className={`dvor1150-status-box ${statusClass(indicator)}`} aria-hidden="true" />;
}

function StatusLabel({ indicator, label }: { indicator: "green" | "yellow" | "red" | "gray"; label: string }) {
  return <span className="dvor1150-status-label"><StatusBox indicator={indicator} /><span>{label}</span></span>;
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
  return <Screen title="RMS Status"><div className="dvor1150-content"><time className="dvor1150-date">{data.timestamp}</time><fieldset className="dvor1150-panel dvor1150-status-panel"><legend>VOR/DME Status</legend><div className="dvor1150-status-list">{rows.map(([label, active, color]) => <div className="dvor1150-status-row" key={label}><StatusBox indicator={active ? color : "gray"} /><span>{label}</span></div>)}</div><fieldset className="dvor1150-revision-panel"><legend>Revision Levels</legend><table className="dvor1150-table"><tbody>{[["RMS", "3.1"], ["Monitor 1", "3.1"], ["Monitor 2", "3.1"], ["Audio Gen 1", "3.1"]].map(([label, value]) => <tr key={label}><th>{label}</th><td>{value}</td></tr>)}</tbody></table></fieldset></fieldset></div></Screen>;
}

export function Dvor1150RmsDataScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  const transmitterAlerts = ["Communication Fault", "EEPROM Fault", "Initial Checksum", "On Batteries", "AC Failure", "BCPS Over-Temp", "PA Thermal Shutdown", "Abnormal PA Phase", "Abnormal SB1/2 Phase", "Abnormal SB3/4 Phase", "Lower SB Unlock", "Upper SB Unlock"];
  const monitorAlerts = ["Communication Fault", "EEPROM Fault", "Initial Checksum", "Certification Test Fault", "Pre-Alarm", "Alarm"];
  return <Screen title="RMS Data" tabs={<ScreenTabs screenId="rms-data" activeView={activeView} views={["rms-maintenance-alerts", "rms-ad-data"]} />}><div className="dvor1150-content"><time className="dvor1150-date">{data.timestamp}</time>{activeView === "rms-ad-data" ? <div className="dvor1150-ad-data-grid"><fieldset className="dvor1150-panel"><legend>Transmitter 1</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Lo Limit</th><th>Volts</th><th>Hi Limit</th></tr></thead><tbody>{[["+5 VDC", "4.80", "4.95", "5.20"], ["+12 VDC", "11.70", "12.15", "13.30"], ["+12 VDC", "11.30", "11.79", "11.70"], ["+28 VDC", "27.40", "27.70", "28.60"], ["+48 VDC", "40.00", "42.60", "52.80"]].map(([label, low, value, high]) => <tr key={`${label}-${low}`}><th>{label}</th><td>{low}</td><td><span className="dvor1150-readout dvor1150-status-cell--green">{value}</span></td><td>{high}</td></tr>)}</tbody></table></fieldset><fieldset className="dvor1150-panel"><legend>Transmitter 2</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Lo Limit</th><th>Volts</th><th>Hi Limit</th></tr></thead><tbody>{[["+5 VDC", "4.80", "5.00", "5.20"], ["+12 VDC", "11.70", "12.15", "13.30"], ["+12 VDC", "11.30", "11.79", "11.70"], ["+28 VDC", "27.40", "27.70", "28.60"], ["+48 VDC", "40.00", "42.60", "52.80"]].map(([label, low, value, high]) => <tr key={`${label}-${low}`}><th>{label}</th><td>{low}</td><td><span className="dvor1150-readout dvor1150-status-cell--green">{value}</span></td><td>{high}</td></tr>)}</tbody></table></fieldset><fieldset className="dvor1150-panel dvor1150-temperature-panel"><legend>Temperature</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Lo Limit</th><th>Data</th><th>Hi Limit</th></tr></thead><tbody>{[["Exterior Temp", "-25", "27", "70"], ["Transmitter 1 Temp", "0", "18", "40"], ["Transmitter 2 Temp", "0", "16", "40"]].map(([label, low, value, high]) => <tr key={label}><th>{label}</th><td>{low}</td><td><span className="dvor1150-readout dvor1150-status-cell--green">{value}</span></td><td>{high}</td></tr>)}</tbody></table></fieldset></div> : <><div className="dvor1150-rms-alert-grid"><fieldset className="dvor1150-panel"><legend>Transmitter Maintenance Alerts</legend><table className="dvor1150-table"><thead><tr><th>Alert</th><th>Tx 1</th><th>Tx 2</th></tr></thead><tbody>{transmitterAlerts.map((label) => <tr key={label}><th>{label}</th><td><StatusBox indicator="gray" /></td><td><StatusBox indicator="gray" /></td></tr>)}</tbody></table></fieldset><fieldset className="dvor1150-panel"><legend>Monitor Alerts and Alarms</legend><table className="dvor1150-table"><thead><tr><th>Alert</th><th>Monitor 1</th><th>Monitor 2</th></tr></thead><tbody>{monitorAlerts.map((label, index) => <tr key={label}><th>{label}</th><td><StatusBox indicator={index === 0 && data.alert ? "yellow" : "gray"} /></td><td><StatusBox indicator="gray" /></td></tr>)}</tbody></table><div className="dvor1150-alert-summary"><span><StatusBox indicator="gray" /> Monitor Mismatch</span><span><StatusBox indicator="gray" /> Notch Monitor</span><span><StatusBox indicator="gray" /> Sideband Antenna VSWR</span></div></fieldset></div><div className="dvor1150-rms-alert-footer"><span><StatusBox indicator="gray" /> A/D Data</span><span><StatusBox indicator={data.rmsStatus.localControlMode ? "yellow" : "gray"} /> Local Mode</span></div></>}</div></Screen>;
}

export function Dvor1150RmsLogsScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const storedLogs = useDvor1150PmdtStore((state) => state.derived.data.logs);
  const sampleLogs = [
    { timeTag: "10/06/02 - 13:45:20", user: "SEC3", message: "Monitor 1 Deviation Normal", severity: "green" as const },
    { timeTag: "10/06/02 - 13:45:16", user: "SEC3", message: "Monitor 2 Notch Monitor Fault Normal", severity: "green" as const },
    { timeTag: "10/06/02 - 13:44:52", user: "Op System", message: "Transmitter 2 -12 VDC Alert Low", severity: "yellow" as const },
    { timeTag: "10/06/02 - 13:44:40", user: "SEC3", message: "Monitor 1 Configuration", severity: "green" as const },
    { timeTag: "10/06/02 - 13:43:11", user: "SEC3", message: "RMS Configuration Backup", severity: "green" as const },
  ];
  const logs = storedLogs.length ? storedLogs : sampleLogs;
  const views = ["rms-logs-operational-summary", "rms-logs-alarms", "rms-logs-maintenance-alerts", "rms-logs-command-activity", "rms-logs-parameter-change"] as const;
  const title = tabLabels[activeView] ?? "RMS Logs";
  if (activeView === "rms-logs-operational-summary") {
    return <Screen title="RMS Logs" tabs={<ScreenTabs screenId="rms-logs" activeView={activeView} views={views} />}><div className="dvor1150-content"><div className="dvor1150-log-actions"><button type="button">Update</button><button type="button">Reset</button></div><fieldset className="dvor1150-panel dvor1150-log-summary"><legend>Operational Summary</legend><table className="dvor1150-table"><thead><tr><th /><th>Transmitter 1</th><th>Transmitter 2</th><th>Unit</th></tr></thead><tbody><tr><th>Time in Normal State</th><td>2914.38</td><td>0.00</td><td>Hours</td></tr><tr><th>Time in Standby State</th><td>0.00</td><td>2914.38</td><td>Hours</td></tr><tr><th>Availability</th><td>99.9996</td><td>99.9996</td><td>%</td></tr><tr><th>Start Time</th><td colSpan={2}>6/07/02 - 03:21:17</td><td /></tr><tr><th>End Time</th><td colSpan={2}>10/06/02 - 13:44:40</td><td /></tr><tr><th>Elapsed Time</th><td>2914.3931</td><td>Hours</td><td /></tr></tbody></table><button type="button" className="dvor1150-log-summary-reset">Reset Operational Summary</button></fieldset></div></Screen>;
  }
  return <Screen title="RMS Logs" tabs={<ScreenTabs screenId="rms-logs" activeView={activeView} views={views} />}><div className="dvor1150-content"><div className="dvor1150-log-actions"><button type="button">Update</button><button type="button">Reset</button></div><fieldset className="dvor1150-panel dvor1150-log-table-panel"><legend>{title}</legend><table className="dvor1150-table"><thead><tr><th>Time Tag</th><th>{activeView === "rms-logs-command-activity" ? "User Name" : activeView === "rms-logs-parameter-change" ? "File" : "Type"}</th><th>{activeView === "rms-logs-command-activity" ? "Command" : activeView === "rms-logs-parameter-change" ? "Parameter" : "Alert"}</th><th>State</th></tr></thead><tbody>{logs.map((entry, index) => <tr key={`${entry.timeTag}-${index}`}><td>{entry.timeTag}</td><td>{activeView === "rms-logs-command-activity" ? entry.user : activeView === "rms-logs-parameter-change" ? "Monitor #1" : "Monitor 1"}</td><td>{entry.message}</td><td>{entry.severity === "green" ? "Normal" : entry.severity === "yellow" ? "Alert Low" : "Alarm"}</td></tr>)}</tbody></table></fieldset></div></Screen>;
}

function ConfigRows({ fields }: { fields: readonly { id: string; label: string; unit?: string; type?: "number" | "text" | "boolean" | "select"; digits?: number }[] }) {
  return <tbody>{fields.map((field) => <tr key={field.id}><th>{field.label}</th><td><Dvor1150ConfigControl fieldId={field.id} type={field.type} digits={field.digits} /></td><td>{field.unit ?? ""}</td></tr>)}</tbody>;
}

function ConfigPanel({ title, fields, className = "" }: { title: string; fields: readonly { id: string; label: string; unit?: string; type?: "number" | "text" | "boolean" | "select"; digits?: number }[]; className?: string }) {
  return <fieldset className={`dvor1150-panel ${className}`}><legend>{title}</legend><table className="dvor1150-table"><ConfigRows fields={fields} /></table></fieldset>;
}

function StaticPanel({ title, rows }: { title: string; rows: readonly (readonly [string, string, string])[] }) {
  return <fieldset className="dvor1150-panel"><legend>{title}</legend><table className="dvor1150-table"><tbody>{rows.map(([label, value, unit]) => <tr key={label}><th>{label}</th><td><span className="dvor1150-readout">{value}</span></td><td>{unit}</td></tr>)}</tbody></table></fieldset>;
}

function Dvor1150ConfigRadio({ fieldId, value, label }: { fieldId: string; value: string; label: string }) {
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const security = useDvor1150PmdtStore((state) => state.securityLevel);
  const setConfigValue = useDvor1150PmdtStore((state) => state.setConfigValue);
  const selected = getDvor1150ConfigValue(config, fieldId) === value;
  return <label className="dvor1150-config-radio"><input type="radio" checked={selected} disabled={security < 3 || !config.simulation.integralMonitorBypass} onChange={() => setConfigValue(fieldId, value)} />{label}</label>;
}

function Dvor1150StaticSelect({ label, value }: { label: string; value: string }) {
  return <label className="dvor1150-rms-config-row"><span>{label}</span><select className="dvor1150-control" value={value} disabled onChange={() => undefined}><option>{value}</option></select></label>;
}

function Dvor1150RmsGeneralConfiguration() {
  return <div className="dvor1150-rms-general-grid">
    <div className="dvor1150-rms-general-column">
      <ConfigPanel title="RCSU Configuration" fields={[{ id: "rms.rcsuPresent", label: "RCSU Present", type: "boolean" as const }, { id: "rms.rcsuConnectionType", label: "Connection Type", type: "select" as const }]} />
      <ConfigPanel title="Ident Configuration" fields={[{ id: "transmitters.tx1.nominal.identCode", label: "Transmitter 1 Ident" }, { id: "transmitters.tx2.nominal.identCode", label: "Transmitter 2 Ident" }]} />
      <fieldset className="dvor1150-panel dvor1150-rms-custom-panel">
        <legend>Monitor Configuration</legend>
        <div className="dvor1150-rms-config-form">
          <div className="dvor1150-rms-config-row"><span>Startup Delay (seconds)</span><Dvor1150ConfigControl fieldId="monitor.monitorStartupDelay" digits={0} /></div>
          <div className="dvor1150-rms-config-row"><span>Shutdown Delay (seconds)</span><Dvor1150ConfigControl fieldId="monitor.monitorShutdownDelay" digits={0} /></div>
          <div className="dvor1150-rms-config-row"><span>Monitor Voting Logic</span><Dvor1150ConfigControl fieldId="monitor.votingLogic" type="select" /></div>
          <div className="dvor1150-rms-config-row dvor1150-rms-radio-row"><span>Monitor 1 Detector</span><label><input type="radio" checked readOnly /> Det 1</label><label><input type="radio" disabled /> Det 2</label></div>
          <div className="dvor1150-rms-config-row dvor1150-rms-radio-row"><span>Monitor 2 Detector</span><label><input type="radio" checked readOnly /> Det 1</label><label><input type="radio" disabled /> Det 2</label></div>
        </div>
      </fieldset>
    </div>
    <div className="dvor1150-rms-general-column">
      <fieldset className="dvor1150-panel dvor1150-rms-custom-panel">
        <legend>Digital I/O Configuration</legend>
        <div className="dvor1150-rms-config-form">
          <label className="dvor1150-rms-config-check"><Dvor1150ConfigControl fieldId="rms.smokeAlarmInstalled" type="boolean" />Smoke Alarm</label>
          <label className="dvor1150-rms-config-check"><Dvor1150ConfigControl fieldId="rms.intrusionAlarmInstalled" type="boolean" />Intrusion Alarm</label>
          <Dvor1150StaticSelect label="Spare #1 Usage" value="Not Present" />
          <Dvor1150StaticSelect label="Spare #2 Usage" value="Not Present" />
        </div>
      </fieldset>
      <fieldset className="dvor1150-panel dvor1150-rms-custom-panel">
        <legend>Modem Configuration</legend>
        <div className="dvor1150-rms-config-form"><div className="dvor1150-rms-config-row"><span>Dial VOR # Rings</span><input className="dvor1150-control" value="1" readOnly /></div></div>
      </fieldset>
      <ConfigPanel title="Automatic Restarts" fields={[{ id: "rms.automaticRestartsEnabled", label: "Automatic Restarts Enabled", type: "boolean" as const }, { id: "rms.firstRestartDelay", label: "First Restart Delay", unit: "seconds", digits: 0 }]} />
      <fieldset className="dvor1150-panel dvor1150-rms-custom-panel">
        <legend>DME Configuration</legend>
        <div className="dvor1150-rms-config-form">
          <div className="dvor1150-rms-config-row dvor1150-rms-radio-row"><span>Status and Control</span><label><Dvor1150ConfigControl fieldId="rms.dmePresent" type="boolean" /> Present</label><label><input type="checkbox" disabled /> Dual</label></div>
          <label className="dvor1150-rms-config-check"><Dvor1150ConfigControl fieldId="rms.keyingOutputEnabled" type="boolean" />Keying Output Enabled</label>
        </div>
      </fieldset>
    </div>
  </div>;
}

function dvor1150DipState(frequencyMHz: number) {
  const boundedFrequency = Math.max(108, Math.min(117.95, frequencyMHz));
  const channel = Math.max(0, Math.min(255, Math.round((boundedFrequency - 108) * 20)));
  return { channel, bits: Array.from({ length: 8 }, (_, index) => (channel & (1 << index)) !== 0) };
}

function Dvor1150SynthesizerDipDialog({ frequencyMHz, onClose }: { frequencyMHz: number; onClose: () => void }) {
  const { channel, bits } = dvor1150DipState(frequencyMHz);
  return <div className="dvor1150-dip-dialog-backdrop">
    <section className="dvor1150-dip-dialog" role="dialog" aria-modal="true" aria-label="Synthesizer DIP Switches">
      <header className="dvor1150-dip-dialog-titlebar"><span>Synthesizer DIP Switches - Required Settings</span><button type="button" aria-label="Close DIP settings" onClick={onClose}>×</button></header>
      <div className="dvor1150-dip-dialog-body">
        <div className="dvor1150-dip-switch-panel" aria-label={`RF channel ${channel}`}>
          <strong>S1</strong>
          {bits.map((enabled, index) => <div className="dvor1150-dip-switch-row" key={index}><span className="dvor1150-dip-switch-number">{index + 1}</span><span className={`dvor1150-dip-switch ${enabled ? "dvor1150-dip-switch--on" : ""}`} aria-label={`DIP ${index + 1} ${enabled ? "on" : "off"}`}><span /></span></div>)}
        </div>
        <div className="dvor1150-dip-dialog-details">
          <button type="button" onClick={onClose}>OK</button>
          <p><strong>1</strong> → RF Channel Select</p>
          <p className="dvor1150-dip-frequency">{frequencyMHz.toFixed(2)} MHz → channel {channel}</p>
          <fieldset><legend>Note:</legend><span>For rocker-type DIP switches, the side indicated with ▼ should be depressed.</span></fieldset>
        </div>
      </div>
    </section>
  </div>;
}

export function Dvor1150RmsConfigScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const config = useDvor1150PmdtStore((state) => state.configDraft);
  const timestamp = useDvor1150PmdtStore((state) => state.derived.data.timestamp);
  const [dipOpen, setDipOpen] = useState(false);
  const configTabs = ["rms-config-general", "rms-config-station", "rms-config-ad-limits"] as const;
  const adRows = [
    ["+5 VDC", "4.80", "4.95", "5.20"],
    ["+12 VDC", "11.70", "11.70", "13.30"],
    ["+12 VDC", "11.30", "12.10", "11.70"],
    ["+28 VDC", "27.40", "27.70", "28.60"],
    ["+48 VDC", "40.00", "42.60", "52.80"],
  ] as const;
  const adTable = (title: string, values: readonly (readonly [string, string, string, string])[]) => <fieldset className="dvor1150-panel"><legend>{title}</legend><table className="dvor1150-table"><thead><tr><th>Supply</th><th>Lo Limit</th><th>Data</th><th>Hi Limit</th></tr></thead><tbody>{values.map(([label, low, value, high]) => <tr key={`${title}-${label}-${low}`}><th>{label}</th><td>{low}</td><td><span className="dvor1150-readout dvor1150-status-cell--green">{value}</span></td><td>{high}</td></tr>)}</tbody></table></fieldset>;
  const frequencyMHz = Number.isFinite(config.station.frequencyMHz) ? config.station.frequencyMHz : 112.1;
  return <Screen title="RMS Configuration" tabs={<ScreenTabs screenId="rms-config" activeView={activeView} views={configTabs} />}><div className={`dvor1150-content dvor1150-config-screen ${activeView === "rms-config-station" ? "dvor1150-station-config-screen" : ""}`}>
    {activeView === "rms-config-station" ? <>
      <div className="dvor1150-station-config-dates"><time className="dvor1150-date">{timestamp}</time><time className="dvor1150-date">{timestamp}</time></div>
      <div className="dvor1150-station-config-layout">
        <fieldset className="dvor1150-panel dvor1150-station-user-panel">
          <legend>User Configuration</legend>
          <div className="dvor1150-station-config-form">
            <div className="dvor1150-station-radio-group"><Dvor1150ConfigRadio fieldId="station.stationType" value="CVOR" label="CVOR" /><Dvor1150ConfigRadio fieldId="station.stationType" value="DVOR" label="DVOR" /></div>
            <label className="dvor1150-rms-config-row"><span>VOR Station Number</span><select className="dvor1150-control" value="1" disabled onChange={() => undefined}><option>1</option></select></label>
            <div className="dvor1150-station-radio-group"><Dvor1150ConfigRadio fieldId="station.transmitterConfig" value="Dual Transmitters" label="Dual Equip" /><Dvor1150ConfigRadio fieldId="station.transmitterConfig" value="Single Transmitter" label="Single Equip" /></div>
            <div className="dvor1150-station-radio-group"><Dvor1150ConfigRadio fieldId="station.monitorConfig" value="Dual Monitors" label="Dual Monitors" /><Dvor1150ConfigRadio fieldId="station.monitorConfig" value="Single Monitor" label="Single Monitor" /></div>
            <div className="dvor1150-rms-config-row"><span>Frequency</span><Dvor1150ConfigControl fieldId="station.frequencyMHz" digits={1} /><span>MHz</span></div>
            <button type="button" className="dvor1150-dip-open-button" onClick={() => setDipOpen(true)}>Display DIP Switch Settings</button>
          </div>
        </fieldset>
        <fieldset className="dvor1150-panel dvor1150-station-rms-panel">
          <legend>RMS</legend>
          <span className="dvor1150-station-rms-readout">{config.station.stationType}</span>
          <button type="button" disabled>Single Equip</button>
          <button type="button" disabled>Dual Monitors</button>
        </fieldset>
      </div>
      <label className="dvor1150-station-remote"><input type="checkbox" checked readOnly />Allow Remote Configuration</label>
      <div className="dvor1150-station-identifier"><span>Station Identifier</span><Dvor1150ConfigControl fieldId="station.stationDescription" /></div>
      {dipOpen ? <Dvor1150SynthesizerDipDialog frequencyMHz={frequencyMHz} onClose={() => setDipOpen(false)} /> : null}
    </> : activeView === "rms-config-ad-limits" ? <div className="dvor1150-ad-limits-grid">{adTable("Transmitter 1", adRows)}{adTable("Transmitter 2", adRows.map(([label, low, value, high]) => [label, low, value === "4.95" ? "5.00" : value, high] as const))}<StaticPanel title="Temperature Limits" rows={[["Exterior Temperature", "27", "°C"], ["Transmitter 1 Temperature", "18", "°C"], ["Transmitter 2 Temperature", "16", "°C"]]} /></div> : <Dvor1150RmsGeneralConfiguration />}
  </div></Screen>;
}

export function Dvor1150MonitorDataScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const config = useDvor1150PmdtStore((state) => state.config);
  const derived = useDvor1150PmdtStore((state) => state.derived);
  const views = ["monitor-integrity", "monitor-ground-check", "monitor-certification", "monitor-test-data", "monitor-notch", "monitor-sideband-vswr"] as const;
  const renderMonitorTable = (monitorId: "mon1" | "mon2") => {
    const monitor = derived.monitors[monitorId];
    return <fieldset className="dvor1150-panel dvor1150-monitor-data-panel" key={monitorId}>
      <legend>Monitor {monitorId === "mon1" ? 1 : 2}</legend>
      <div className="dvor1150-monitor-summary"><StatusLabel indicator={monitor.commStatus} label="Comm Status" /><StatusLabel indicator={monitor.controlling ? "green" : "gray"} label={monitor.controlling ? "Controlling" : "Standby"} /><StatusLabel indicator={config.monitor.identMonitoringEnabled ? "green" : "gray"} label="Ident Monitor Enabled" /></div>
      <table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Alarm Low</th><th>Prealarm Low</th><th>Data</th><th>Prealarm High</th><th>Alarm High</th><th>Unit</th></tr></thead><tbody>{parameterRows.map((row) => { const result = monitor.parameters[row.id]; const limits = config.monitor.alarmLimits[row.id]; return <tr key={row.id}><th>{row.label}</th><td>{limits.alarmLow.toFixed(row.digits)}</td><td>{limits.preAlarmLow.toFixed(row.digits)}</td><td><span className={`dvor1150-readout ${statusClass(result.indicator)}`}>{result.value.toFixed(row.digits)}</span></td><td>{limits.preAlarmHigh.toFixed(row.digits)}</td><td>{limits.alarmHigh.toFixed(row.digits)}</td><td>{row.unit}</td></tr>; })}<tr><th>Ident</th><td colSpan={2} /><td><span className="dvor1150-readout dvor1150-status-cell--green">Normal</span></td><td colSpan={2} /><td>-</td></tr></tbody></table>
    </fieldset>;
  };
  if (activeView === "monitor-ground-check") {
    return <Screen title="Monitor Data" tabs={<ScreenTabs screenId="monitor-data" activeView={activeView} views={views} />}><div className="dvor1150-content dvor1150-ground-check"><div className="dvor1150-ground-check-toolbar"><time className="dvor1150-date">{derived.data.timestamp}</time><button type="button">Run</button></div><div className="dvor1150-ground-check-grid"><table className="dvor1150-table"><thead><tr><th>Azimuth</th><th>Station Error</th><th>Amplitude</th><th>Phase</th></tr></thead><tbody>{[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map((azimuth, index) => <tr key={azimuth}><th>{azimuth.toFixed(1)}</th><td>{(-0.16 + index * 0.004).toFixed(2)}</td><td>{(0.05 + (index % 4) * 0.006).toFixed(3)}</td><td>{(159.9 + index * 0.2).toFixed(1)}°</td></tr>)}</tbody></table><svg className="dvor1150-ground-chart" viewBox="0 0 360 180" role="img" aria-label="VOR ground check error graph"><rect x="0.5" y="0.5" width="359" height="179" fill="#d4d0c8" stroke="#404040" /><path d="M20 90H345M20 25V160" stroke="#707070" strokeDasharray="2 3" /><polyline points="20,90 45,96 70,92 95,101 120,98 145,90 170,95 195,91 220,99 245,90 270,94 295,88 320,92 345,90" fill="none" stroke="#00a000" strokeWidth="1" /><polyline points="20,92 45,90 70,97 95,93 120,91 145,96 170,89 195,94 220,90 245,95 270,91 295,96 320,90 345,93" fill="none" stroke="#ff0000" strokeWidth="1" /></svg></div></div></Screen>;
  }
  if (activeView === "monitor-certification") {
    return <Screen title="Monitor Data" tabs={<ScreenTabs screenId="monitor-data" activeView={activeView} views={views} />}><div className="dvor1150-content"><div className="dvor1150-certification-grid">{(["mon1", "mon2"] as const).map((monitorId) => <fieldset className="dvor1150-panel" key={monitorId}><legend>Monitor {monitorId === "mon1" ? 1 : 2}</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Limit</th><th>Test Data</th><th>Result</th></tr></thead><tbody>{parameterRows.map((row) => { const result = derived.monitors[monitorId].parameters[row.id]; return <tr key={row.id}><th>{row.label}</th><td>{config.monitor.alarmLimits[row.id].nominal.toFixed(row.digits)}</td><td><span className="dvor1150-readout dvor1150-status-cell--green">{result.value.toFixed(row.digits)}</span></td><td><StatusCell indicator="green" value="Passed" /></td></tr>; })}</tbody></table><button type="button">Run</button></fieldset>)}</div></div></Screen>;
  }
  if (activeView === "monitor-test-data") {
    return <Screen title="Monitor Data" tabs={<ScreenTabs screenId="monitor-data" activeView={activeView} views={views} />}><div className="dvor1150-content"><div className="dvor1150-test-data-grid"><fieldset className="dvor1150-panel"><legend>Test Generator Setup</legend><table className="dvor1150-table"><tbody>{[["Azimuth Angle", "0.00", "°"], ["30 Hz Modulation", "30.0", "%"], ["9960 Hz Modulation", "30.0", "%"], ["Deviation", "16.0", "Ratio"], ["Ident Modulation", "0.0", "%"], ["Ident Control", "Normal", ""], ["Audio Modulation", "0.0", "%"], ["Audio Frequency", "300", "Hz"]].map(([label, value, unit]) => <tr key={label}><th>{label}</th><td><input className="dvor1150-control" defaultValue={value} /></td><td>{unit}</td></tr>)}</tbody></table></fieldset><fieldset className="dvor1150-panel"><legend>Test Results</legend><table className="dvor1150-table"><thead><tr><th>Monitor</th><th>Azimuth</th><th>30 Hz Mod</th><th>9960 Hz Mod</th><th>Deviation</th></tr></thead><tbody><tr><th>Monitor 1</th><td>359.98</td><td>29.9</td><td>30.1</td><td>16.0</td></tr><tr><th>Monitor 2</th><td>359.99</td><td>29.8</td><td>30.1</td><td>15.9</td></tr></tbody></table><button type="button">Run</button></fieldset></div></div></Screen>;
  }
  if (activeView === "monitor-notch") {
    return <Screen title="Monitor Data" tabs={<ScreenTabs screenId="monitor-data" activeView={activeView} views={views} />}><div className="dvor1150-content"><div className="dvor1150-notch-toolbar"><time className="dvor1150-date">{derived.data.timestamp}</time><label><input type="checkbox" defaultChecked /> Enable Notch Monitoring</label><label>Tolerance <input className="dvor1150-control" defaultValue="20" /> %</label><button type="button">Record Baseline</button></div><div className="dvor1150-notch-columns">{[0, 1, 2].map((column) => <table className="dvor1150-table" key={column}><thead><tr><th>Antenna</th><th>Baseline</th><th>Current</th></tr></thead><tbody>{derived.data.sidebandVswr.slice(column * 16, column * 16 + 16).map((row) => <tr key={row.antenna}><th>{row.antenna}</th><td>{(row.value * 0.94).toFixed(2)}</td><td><span className={`dvor1150-readout ${statusClass(row.indicator)}`}>{row.value.toFixed(2)}</span></td></tr>)}</tbody></table>)}</div></div></Screen>;
  }
  if (activeView === "monitor-sideband-vswr") {
    return <Screen title="Monitor Data" tabs={<ScreenTabs screenId="monitor-data" activeView={activeView} views={views} />}><div className="dvor1150-content"><div className="dvor1150-vswr-toolbar"><time className="dvor1150-date">{derived.data.timestamp}</time><label className="dvor1150-vswr-executive"><input type="checkbox" checked={config.monitor.sidebandVswrExecutiveAlarm} readOnly /> Sideband VSWR Executive Alarm</label><label className="dvor1150-vswr-setting">Tolerance <input className="dvor1150-control" value={config.monitor.sidebandVswrTolerance.toFixed(2)} readOnly /> <span>: 1</span></label><label className="dvor1150-vswr-setting">Number of Antennas in Alarm <input className="dvor1150-control" value={config.monitor.numberOfAntennasInAlarm} readOnly /></label></div><div className="dvor1150-vswr-columns">{[0, 1, 2, 3].map((column) => <table className="dvor1150-table" key={column}><thead><tr><th>Antenna</th><th>VSWR</th></tr></thead><tbody>{derived.data.sidebandVswr.slice(column * 12, column * 12 + 12).map((row) => <tr key={row.antenna}><th>{row.antenna}</th><td><span className={`dvor1150-readout ${statusClass(row.indicator)}`}>{row.value.toFixed(2)}</span></td></tr>)}</tbody></table>)}</div></div></Screen>;
  }
  return <Screen title="Monitor Data" tabs={<ScreenTabs screenId="monitor-data" activeView={activeView} views={views} />}><div className="dvor1150-content"><div className="dvor1150-monitor-stack">{(["mon1", "mon2"] as const).map(renderMonitorTable)}</div></div></Screen>;
}

export function Dvor1150MonitorConfigScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  return <Screen title="Monitor Configuration" tabs={<ScreenTabs screenId="monitor-config" activeView={activeView} views={["monitor-alarm-limits", "monitor-offsets"]} />}><div className="dvor1150-content">{activeView === "monitor-offsets" ? <fieldset className="dvor1150-panel"><legend>Monitor Offsets and Scale Factors</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Monitor 1</th><th>Monitor 2</th><th>Unit</th></tr></thead><tbody>{parameterRows.map((row) => <tr key={row.id}><th>{row.label}</th><td><Dvor1150ConfigControl fieldId={`monitor.offsets.mon1.${row.id}`} digits={row.digits} /></td><td><Dvor1150ConfigControl fieldId={`monitor.offsets.mon2.${row.id}`} digits={row.digits} /></td><td>{row.unit}</td></tr>)}</tbody></table></fieldset> : <fieldset className="dvor1150-panel"><legend>Monitor Alarm Limits</legend><table className="dvor1150-table"><thead><tr><th>Parameter</th><th>Alarm Low</th><th>Prealarm Low</th><th>Nominal</th><th>Prealarm High</th><th>Alarm High</th><th>Unit</th></tr></thead><tbody>{parameterRows.map((row) => <tr key={row.id}><th>{row.label}</th>{(["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] as const).map((band) => <td key={band}><Dvor1150ConfigControl fieldId={`monitor.alarmLimits.${row.id}.${band}`} digits={row.digits} /></td>)}<td>{row.unit}</td></tr>)}</tbody></table></fieldset>}</div></Screen>;
}

export function Dvor1150TxDataScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const data = useDvor1150PmdtStore((state) => state.derived.data);
  const dualTransmitters = useDvor1150PmdtStore((state) => state.config.station.transmitterConfig === "Dual Transmitters");
  const transmitter = dualTransmitters && activeView === "tx-data-tx2" ? "tx2" : "tx1";
  const views = dualTransmitters ? (["tx-data-tx1", "tx-data-tx2"] as const) : (["tx-data-tx1"] as const);
  const cell = (value: number | null, digits = 3) => value === null ? "" : value.toFixed(digits);
  return <Screen title="Transmitter Data" tabs={<ScreenTabs screenId="tx-data" activeView={activeView} views={views} />}><div className="dvor1150-content"><time className="dvor1150-date">{data.timestamp}</time><div className="dvor1150-tx-data-grid"><div><fieldset className="dvor1150-panel"><legend>Power</legend><table className="dvor1150-table"><tbody>{data.txPower.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td><span className="dvor1150-readout">{row[transmitter].toFixed(2)}</span></td><td>{row.unit}</td></tr>)}</tbody></table></fieldset><fieldset className="dvor1150-panel"><legend>VSWR</legend><table className="dvor1150-table"><tbody>{data.txVswr.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td><span className="dvor1150-readout">{cell(row[transmitter], 2)}</span></td><td>: 1</td></tr>)}</tbody></table></fieldset></div><fieldset className="dvor1150-panel"><legend>Frequency</legend><table className="dvor1150-table"><tbody>{data.txFrequency.map((row) => <tr key={row.parameter}><th>{row.parameter}</th><td><span className="dvor1150-readout">{cell(row[transmitter], row.unit === "MHz" ? 4 : 2)}</span></td><td>{row.unit}</td></tr>)}</tbody></table></fieldset></div></div></Screen>;
}

export function Dvor1150TxConfigScreen() {
  const activeView = useDvor1150PmdtStore((state) => state.activeView);
  const timestamp = useDvor1150PmdtStore((state) => state.derived.data.timestamp);
  const nominalFields = [
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
    ["Sideband 1-2 Phase Offset", "sideband12PhaseOffset", "°", 2],
    ["Sideband 3-4 Phase Offset", "sideband34PhaseOffset", "°", 2],
    ["Carrier-Sideband Phase Offset", "carrierSidebandPhaseOffset", "°", 2],
    ["Sideband 1 RF Level Scale", "sideband1RfLevelScale", "%", 1],
    ["Sideband 2 RF Level Scale", "sideband2RfLevelScale", "%", 1],
    ["Sideband 3 RF Level Scale", "sideband3RfLevelScale", "%", 1],
    ["Sideband 4 RF Level Scale", "sideband4RfLevelScale", "%", 1],
  ] as const;
  const isOffsets = activeView === "tx-config-offsets";
  return <Screen title="Transmitter Configuration" tabs={<ScreenTabs screenId="tx-config" activeView={activeView} views={["tx-config-nominal", "tx-config-offsets"]} />}><div className="dvor1150-content dvor1150-tx-config-screen"><time className="dvor1150-date">{timestamp}</time>{isOffsets ? <table className="dvor1150-table dvor1150-tx-config-offset-table"><thead><tr><th>Parameter</th><th>Transmitter 1</th><th>Transmitter 2</th><th>Unit</th></tr></thead><tbody>{offsetFields.map(([label, field, unit, digits]) => <tr key={field}><th>{label}</th><td><Dvor1150ConfigControl fieldId={`transmitters.tx1.offsets.${field}`} digits={digits} /></td><td><Dvor1150ConfigControl fieldId={`transmitters.tx2.offsets.${field}`} digits={digits} /></td><td>{unit}</td></tr>)}</tbody></table> : <table className="dvor1150-table dvor1150-tx-config-nominal-table"><thead><tr><th>Parameter</th><th>Common (TX1 + TX2)</th><th>Unit</th></tr></thead><tbody>{nominalFields.map(([label, field, unit, digits]) => <tr key={field}><th>{label}</th><td><Dvor1150ConfigControl fieldId={`transmitters.tx1.nominal.${field}`} mirrorFieldIds={[`transmitters.tx2.nominal.${field}`]} digits={digits} /></td><td>{unit}</td></tr>)}</tbody></table>}</div></Screen>;
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
