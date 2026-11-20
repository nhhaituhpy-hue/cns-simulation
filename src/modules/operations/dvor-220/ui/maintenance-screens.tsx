"use client";

import { useState, type ReactNode } from "react";
import {
  MopiensBeveledButton,
  MopiensGauge,
  MopiensModal,
  MopiensPropertyGrid,
  MopiensStatusIndicator,
  MopiensTable,
} from "@/modules/operations/mopiens-pmdt";
import { getDvor220PermissionDecision } from "../domain/permissions";
import {
  DVOR220_TIME_ZONE_LABEL,
  formatDvor220DateTime,
  parseDvor220TimeInput,
  toDvor220TimeInput,
} from "../domain/time";
import {
  classifyDvor220Reading,
  filterDvor220History,
  getDvor220GroundCheckDurationMs,
} from "../domain/engine";
import {
  DVOR220_MONITOR_CHANNEL_IDS,
  DVOR220_RF_OUTPUT_IDS,
  DVOR220_TRANSMITTER_IDS,
  type Dvor220Command,
  type Dvor220CommandResult,
  type Dvor220DeviceState,
  type Dvor220HistoryFilter,
  type Dvor220LogEntry,
  type Dvor220LogCategory,
  type Dvor220MonitorChannelId,
  type Dvor220MonitorId,
  type Dvor220RfOutputId,
  type Dvor220Snapshot,
  type Dvor220TransmitterId,
} from "../domain/types";
import { CalibrationScreen, isCalibrationScreen } from "./calibration-screen";
import { AdvancedControlsScreen } from "./advanced-controls-screen";
import { formatDvor220Status, toneForDvor220Status } from "./main-screens";
import type { Dvor220DialogId, Dvor220ScreenId } from "./navigation";
import styles from "../dvor220.module.css";

export interface Dvor220MaintenanceScreenProps {
  screenId: Dvor220ScreenId;
  device: Dvor220DeviceState;
  snapshot: Dvor220Snapshot;
  dispatch: (command: Dvor220Command) => Dvor220CommandResult;
  advanceTime: (elapsedMs: number) => void;
  syncClock: () => void;
  navigate: (screenId: Dvor220ScreenId) => void;
  openDialog?: (dialog: Dvor220DialogId) => void;
  controlsDialogActive?: boolean;
}

function MaintenanceHeader({ title, detail }: { title: string; detail?: ReactNode }) {
  return (
    <header className={styles.screenTitle}>
      <h2>{title}</h2>
      {detail ? <p>{detail}</p> : null}
    </header>
  );
}

function CompactField({ label, children }: { label: string; children: ReactNode }) {
  return <label className={styles.formField}><span>{label}</span>{children}</label>;
}

function CertificationScreen({ device, snapshot, dispatch }: Dvor220MaintenanceScreenProps) {
  const activeFaults = device.faults.filter((fault) => fault.id.startsWith("certification-"));
  function inject(monitorId: Dvor220MonitorId, value: number) {
    dispatch({ type: "inject-fault", fault: { id: `certification-${monitorId}`, kind: "monitor-parameter", monitorId, channelId: "cha", parameter: "bearingError", value } });
  }
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="Monitor Certification" detail="Exercise each executive monitor and verify AND/OR voting without external test equipment." />
      <div className={styles.inlineIndicators}>
        {DVOR220_TRANSMITTER_IDS.map((id) => <MopiensStatusIndicator key={id} label={id.toUpperCase()} detail={snapshot.transmitters[id].path} tone={toneForDvor220Status(snapshot.transmitters[id].status)} />)}
        <MopiensStatusIndicator label="Executive" detail={snapshot.executiveAlarm ? "Alarm" : "Normal"} tone={snapshot.executiveAlarm ? "alarm" : "normal"} />
      </div>
      <div className={styles.testConsole}>
        <h3>TSG Test Sequence</h3>
        <p>Inject a +2° bearing error into one monitor, then both monitors, to verify the configured voting logic.</p>
        <div className={styles.actionRow}>
          <MopiensBeveledButton tone="warning" onClick={() => inject("mon1", 2)}>MON1 +2°</MopiensBeveledButton>
          <MopiensBeveledButton tone="warning" onClick={() => inject("mon2", 2)}>MON2 +2°</MopiensBeveledButton>
          <MopiensBeveledButton onClick={() => dispatch({ type: "clear-all-faults" })} disabled={!activeFaults.length}>Clear Certification Faults</MopiensBeveledButton>
        </div>
        <MopiensPropertyGrid
          ariaLabel="Certification results"
          sections={[{
            id: "certification",
            title: `Voting Logic: ${device.configuration.running.monitor.votingLogic}`,
            rows: [
              { id: "mon1", label: "MON1 CH.A Bearing", value: `${snapshot.monitors.mon1.channels.cha.readings.bearingError.value.toFixed(2)}°`, tone: toneForDvor220Status(snapshot.monitors.mon1.channels.cha.status) },
              { id: "mon2", label: "MON2 CH.A Bearing", value: `${snapshot.monitors.mon2.channels.cha.readings.bearingError.value.toFixed(2)}°`, tone: toneForDvor220Status(snapshot.monitors.mon2.channels.cha.status) },
              { id: "vote", label: "Executive Vote", value: snapshot.executiveAlarm ? "Active" : "Inactive", tone: snapshot.executiveAlarm ? "alarm" : "normal" },
              { id: "phase", label: "Action Phase", value: formatDvor220Status(device.executive.phase) },
            ],
          }]}
        />
      </div>
    </div>
  );
}

function AntennaScreen({ device, snapshot, dispatch }: Dvor220MaintenanceScreenProps) {
  const [antenna, setAntenna] = useState(1);
  const selected = snapshot.pdc.antennas[antenna - 1];
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="Antenna Tests" detail="Select any sideband antenna and exercise PDC VSWR fault detection." />
      <div className={styles.maintenanceToolbar}>
        <CompactField label="Antenna"><input aria-label="Antenna number" type="number" min="1" max="48" value={antenna} onChange={(event) => setAntenna(Math.max(1, Math.min(48, Number(event.target.value))))} /></CompactField>
        <MopiensBeveledButton tone="warning" onClick={() => dispatch({ type: "inject-fault", fault: { id: "antenna-test", kind: "antenna-vswr", antenna, usbVswr: 3.1, lsbVswr: 2.8 } })}>Inject High VSWR</MopiensBeveledButton>
        <MopiensBeveledButton onClick={() => dispatch({ type: "clear-fault", faultId: "antenna-test" })} disabled={!device.faults.some((fault) => fault.id === "antenna-test")}>Clear Test</MopiensBeveledButton>
      </div>
      <div className={styles.twoColumnLayout}>
        <MopiensPropertyGrid ariaLabel="Selected antenna" sections={[{ id: "selected", title: `Antenna #${antenna}`, rows: [
          { id: "usb", label: "USB VSWR", value: `${selected.usbVswr.toFixed(2)}:1`, tone: toneForDvor220Status(selected.status) },
          { id: "lsb", label: "LSB VSWR", value: `${selected.lsbVswr.toFixed(2)}:1`, tone: toneForDvor220Status(selected.status) },
          { id: "phase", label: "Phase", value: `${selected.phaseDeg.toFixed(1)}°` },
          { id: "status", label: "Status", value: formatDvor220Status(selected.status), tone: toneForDvor220Status(selected.status) },
        ]}]} />
        <MopiensPropertyGrid ariaLabel="PDC limits" sections={[{ id: "limits", title: "PDC Limits", rows: [
          { id: "carrier", label: "Carrier VSWR", value: `${snapshot.pdc.carrierVswr.toFixed(2)}:1` },
          { id: "warning", label: "Sideband Warning", value: `${device.configuration.running.transmitterLimits.vswrUpperWarning.toFixed(2)}:1` },
          { id: "alarm", label: "Sideband Alarm", value: `${device.configuration.running.transmitterLimits.vswrUpperAlarm.toFixed(2)}:1` },
          { id: "pdc", label: "PDC Status", value: formatDvor220Status(snapshot.pdc.status), tone: toneForDvor220Status(snapshot.pdc.status) },
        ]}]} />
      </div>
    </div>
  );
}

function ThermalTestScreen({ device, snapshot, dispatch }: Dvor220MaintenanceScreenProps) {
  const [transmitterId, setTransmitterId] = useState<Dvor220TransmitterId>("tx1");
  const [unit, setUnit] = useState<"cma" | "usb" | "lsb">("cma");
  const [temperatureInput, setTemperatureInput] = useState("35.5");
  const transmitter = snapshot.transmitters[transmitterId];
  const runtime = device.transmitters[transmitterId];
  const thermal = device.configuration.running.thermal[transmitterId];
  const currentTemperature = transmitter.temperaturesC[unit];
  const unitStatus = unit === "cma"
    ? transmitter.units.cma
    : unit === "usb"
      ? transmitter.units.smaUsb
      : transmitter.units.smaLsb;
  const rfState = unit === "cma"
    ? `Carrier ${transmitter.rfOutputs.carrier ? "On" : "Off"}`
    : unit === "usb"
      ? `USB COS/SIN ${transmitter.rfOutputs.usbCos && transmitter.rfOutputs.usbSin ? "On" : "Off"}`
      : `LSB COS/SIN ${transmitter.rfOutputs.lsbCos && transmitter.rfOutputs.lsbSin ? "On" : "Off"}`;

  function selectTransmitter(next: Dvor220TransmitterId) {
    setTransmitterId(next);
    setTemperatureInput(String(snapshot.transmitters[next].temperaturesC[unit]));
  }

  function selectUnit(next: "cma" | "usb" | "lsb") {
    setUnit(next);
    setTemperatureInput(String(snapshot.transmitters[transmitterId].temperaturesC[next]));
  }

  function setTemperature(temperatureC: number) {
    if (!Number.isFinite(temperatureC)) return;
    setTemperatureInput(String(temperatureC));
    dispatch({ type: "set-temperature", transmitterId, unit, temperatureC });
  }

  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader
        title="Thermal Test"
        detail="Exercise fan hysteresis, thermal shutdown and automatic RF restart without changing the saved profile."
      />
      <div className={styles.maintenanceToolbar}>
        <CompactField label="Transmitter">
          <select aria-label="Thermal test transmitter" value={transmitterId} onChange={(event) => selectTransmitter(event.target.value as Dvor220TransmitterId)}>
            {DVOR220_TRANSMITTER_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}
          </select>
        </CompactField>
        <CompactField label="Power Unit">
          <select aria-label="Thermal test power unit" value={unit} onChange={(event) => selectUnit(event.target.value as "cma" | "usb" | "lsb")}>
            <option value="cma">CMA / Carrier</option>
            <option value="usb">SMA USB</option>
            <option value="lsb">SMA LSB</option>
          </select>
        </CompactField>
        <CompactField label="Temperature (°C)">
          <input aria-label="Thermal test temperature" type="number" min="-20" max="150" step="0.5" value={temperatureInput} onChange={(event) => setTemperatureInput(event.target.value)} />
        </CompactField>
        <MopiensBeveledButton tone="primary" onClick={() => setTemperature(Number(temperatureInput))}>Apply Temperature</MopiensBeveledButton>
      </div>
      <div className={styles.maintenanceToolbar} aria-label="Thermal test presets">
        <MopiensBeveledButton tone="warning" onClick={() => setTemperature(thermal.fanStartC)}>Heat to Fan Start ({thermal.fanStartC.toFixed(1)}°C)</MopiensBeveledButton>
        <MopiensBeveledButton tone="danger" onClick={() => setTemperature(thermal.shutdownC[unit])}>Heat to Shutdown ({thermal.shutdownC[unit].toFixed(1)}°C)</MopiensBeveledButton>
        <MopiensBeveledButton onClick={() => setTemperature(thermal.restartC[unit])}>Cool to Restart ({thermal.restartC[unit].toFixed(1)}°C)</MopiensBeveledButton>
        <MopiensBeveledButton onClick={() => setTemperature(Math.min(35, thermal.restartC[unit] - 1))}>Restore Normal (35°C)</MopiensBeveledButton>
      </div>
      <div className={styles.inlineIndicators}>
        <MopiensStatusIndicator label={`${transmitterId.toUpperCase()} ${unit.toUpperCase()}`} detail={`${currentTemperature.toFixed(1)} °C`} tone={toneForDvor220Status(unitStatus)} />
        <MopiensStatusIndicator label="FAN" detail={transmitter.fanOn ? "Running" : "Stopped"} tone={transmitter.fanOn ? "normal" : "inactive"} />
        <MopiensStatusIndicator label="THERMAL TRIP" detail={runtime.thermalTrips[unit] ? "Latched" : "Clear"} tone={runtime.thermalTrips[unit] ? "alarm" : "normal"} />
      </div>
      <div className={styles.twoColumnLayout}>
        <MopiensPropertyGrid ariaLabel="Thermal thresholds" sections={[{ id: "thresholds", title: `${transmitterId.toUpperCase()} Thresholds`, rows: [
          { id: "fan-start", label: "Fan Start", value: `${thermal.fanStartC.toFixed(1)} °C` },
          { id: "fan-stop", label: "Fan Stop", value: `${thermal.fanStopC.toFixed(1)} °C` },
          { id: "shutdown", label: "Shutdown", value: `${thermal.shutdownC[unit].toFixed(1)} °C`, tone: "alarm" },
          { id: "restart", label: "Restart", value: `${thermal.restartC[unit].toFixed(1)} °C`, tone: "warning" },
        ]}]} />
        <MopiensPropertyGrid ariaLabel="Thermal runtime state" sections={[{ id: "runtime", title: "Runtime State", rows: [
          { id: "temperature", label: "Current Temperature", value: `${currentTemperature.toFixed(1)} °C`, tone: toneForDvor220Status(unitStatus) },
          { id: "unit", label: "Unit Status", value: formatDvor220Status(unitStatus), tone: toneForDvor220Status(unitStatus) },
          { id: "fan", label: "Cooling Fan", value: transmitter.fanOn ? "Running" : "Stopped", tone: transmitter.fanOn ? "normal" : "inactive" },
          { id: "rf", label: "RF Output", value: rfState, tone: runtime.thermalTrips[unit] ? "alarm" : "normal" },
        ]}]} />
      </div>
    </div>
  );
}

function FaultControlsScreen({ device, snapshot, dispatch }: Dvor220MaintenanceScreenProps) {
  const controls = [
    { id: "fault-mon1", label: "MON1 Bearing Alarm", command: { type: "inject-fault", fault: { id: "fault-mon1", kind: "monitor-parameter", monitorId: "mon1", channelId: "cha", parameter: "bearingError", value: 2 } } },
    { id: "fault-mon2", label: "MON2 Bearing Alarm", command: { type: "inject-fault", fault: { id: "fault-mon2", kind: "monitor-parameter", monitorId: "mon2", channelId: "cha", parameter: "bearingError", value: 2 } } },
    { id: "fault-sma", label: "TX1 USB SMA Fault", command: { type: "inject-fault", fault: { id: "fault-sma", kind: "transmitter-unit", transmitterId: "tx1", unit: "smaUsb", condition: "fault" } } },
    { id: "fault-pdc", label: "PDC Hardware Fault", command: { type: "inject-fault", fault: { id: "fault-pdc", kind: "pdc", condition: "fault" } } },
    { id: "fault-smoke", label: "Smoke Detected", command: { type: "inject-fault", fault: { id: "fault-smoke", kind: "environment", sensor: "smoke", value: true } } },
    { id: "fault-rcu", label: "RCU Link Fault", command: { type: "inject-fault", fault: { id: "fault-rcu", kind: "communication", endpoint: "rcu", condition: "fault" } } },
  ] as const;
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="Fault Controls" detail="Deterministic training faults propagate through BITE, monitors, alarms and history." />
      <div className={styles.faultControlGrid}>
        {controls.map((control) => {
          const active = device.faults.some((fault) => fault.id === control.id);
          return (
            <div key={control.id} className={styles.faultControlRow}>
              <MopiensStatusIndicator compact label={control.label} detail={active ? "Injected" : "Clear"} tone={active ? "alarm" : "normal"} />
              <MopiensBeveledButton tone={active ? "default" : "warning"} onClick={() => active ? dispatch({ type: "clear-fault", faultId: control.id }) : dispatch(control.command as Dvor220Command)}>{active ? "Clear" : "Inject"}</MopiensBeveledButton>
            </div>
          );
        })}
      </div>
      <div className={styles.actionRow}>
        <MopiensBeveledButton tone="danger" disabled={!device.faults.length} onClick={() => dispatch({ type: "clear-all-faults" })}>Clear All Faults</MopiensBeveledButton>
        <span>{device.faults.length} active fault{device.faults.length === 1 ? "" : "s"} | Service {snapshot.serviceStatus}</span>
      </div>
    </div>
  );
}

function GroundErrorGraph({ device }: { device: Dvor220DeviceState }) {
  const width = 720;
  const height = 290;
  const left = 48;
  const top = 18;
  const plotWidth = width - 70;
  const plotHeight = height - 58;
  const points = device.groundCheck.points;
  const coordinate = (azimuthDeg: number, bearingErrorDeg: number) => ({
    x: left + azimuthDeg / 345 * plotWidth,
    y: top + (1.2 - bearingErrorDeg) / 2.4 * plotHeight,
  });
  const polyline = points.map((point) => {
    const value = coordinate(point.azimuthDeg, point.bearingErrorDeg);
    return `${value.x},${value.y}`;
  }).join(" ");
  return (
    <figure className={styles.groundGraph}>
      <figcaption>Ground Error Spread</figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Bearing error by azimuth">
        <rect x={left} y={top} width={plotWidth} height={plotHeight} className={styles.graphPlot} />
        {[-1, -0.5, 0, 0.5, 1].map((value) => {
          const y = coordinate(0, value).y;
          return <g key={value}><line x1={left} x2={left + plotWidth} y1={y} y2={y} className={value === 0 ? styles.graphAxis : styles.graphGrid} /><text x={left - 8} y={y + 4} textAnchor="end">{value.toFixed(1)}</text></g>;
        })}
        {[0, 45, 90, 135, 180, 225, 270, 315, 345].map((value) => {
          const x = coordinate(value, 0).x;
          return <g key={value}><line x1={x} x2={x} y1={top} y2={top + plotHeight} className={styles.graphGrid} /><text x={x} y={top + plotHeight + 18} textAnchor="middle">{value}</text></g>;
        })}
        {polyline ? <polyline points={polyline} className={styles.graphLine} /> : null}
        {points.map((point) => {
          const value = coordinate(point.azimuthDeg, point.bearingErrorDeg);
          return <circle key={point.azimuthDeg} cx={value.x} cy={value.y} r="3" className={styles.graphPoint}><title>{`${point.azimuthDeg}°: ${point.bearingErrorDeg.toFixed(2)}°`}</title></circle>;
        })}
        <text x={left + plotWidth / 2} y={height - 3} textAnchor="middle">Azimuth (°)</text>
        <text transform={`translate(13 ${top + plotHeight / 2}) rotate(-90)`} textAnchor="middle">Bearing Error (°)</text>
      </svg>
    </figure>
  );
}

function GroundCheckScreen({ device, dispatch, advanceTime }: Dvor220MaintenanceScreenProps) {
  const permission = getDvor220PermissionDecision(device, "calibrate");
  const canStart = permission.allowed && device.connection.profile?.location === "local" && device.keylock === "MAINT";
  const running = device.groundCheck.status === "running";
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="Automatic Ground Error Check" detail="Simulated measurement tolerance is ±1°. Local PMDT, Level 2 or 3 and MAINT are required." />
      <div className={styles.maintenanceToolbar}>
        <span>Keylock: <strong>{device.keylock}</strong></span>
        {(["LOCAL", "REM", "MAINT"] as const).map((mode) => <MopiensBeveledButton key={mode} pressed={device.keylock === mode} onClick={() => dispatch({ type: "set-keylock", mode })}>{mode}</MopiensBeveledButton>)}
        <MopiensBeveledButton tone="primary" disabled={!canStart || running} onClick={() => dispatch({ type: "start-ground-check" })}>Run</MopiensBeveledButton>
        <MopiensBeveledButton disabled={!running} onClick={() => advanceTime(getDvor220GroundCheckDurationMs())}>Complete 5 s Test</MopiensBeveledButton>
        <MopiensStatusIndicator compact label="Result" detail={formatDvor220Status(device.groundCheck.status)} tone={device.groundCheck.status === "failed" ? "alarm" : device.groundCheck.status === "completed" ? "normal" : "pending"} />
      </div>
      {canStart ? null : <p role="status" className={styles.inlineNotice}>Set the physical keylock to MAINT and use a local authenticated PMDT.</p>}
      <GroundErrorGraph device={device} />
    </div>
  );
}

function UserManagementScreen({ device, dispatch }: Dvor220MaintenanceScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [dialog, setDialog] = useState<"add" | "delete" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const permission = getDvor220PermissionDecision(device, "manage-users");
  const close = () => { setDialog(null); setError(null); setUsername(""); setPassword(""); setLevel(1); };
  const deletable = permission.allowed && selected && selected !== device.session.username
    && device.accounts.some((account) => account.username === selected);
  const apply = () => {
    if (!permission.allowed || !dialog) return;
    if (dialog === "delete" && (!selected || !deletable)) return;
    const result = dialog === "add"
      ? dispatch({ type: "add-user", account: { username, password, level } })
      : dispatch({ type: "delete-user", username: selected! });
    if (!result.ok) setError(result.error ?? "Couldn't update the access list.");
    else {
      if (dialog === "delete") setSelected(null);
      close();
    }
  };
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="User Management" />
      <div className={styles.actionRow}>
        <MopiensBeveledButton disabled={!permission.allowed} onClick={() => setDialog("add")}>Add User</MopiensBeveledButton>
        <MopiensBeveledButton disabled={!deletable} onClick={() => setDialog("delete")}>Delete User</MopiensBeveledButton>
      </div>
      {permission.allowed ? null : <p className={styles.inlineNotice}>{permission.reason}</p>}
      <MopiensTable caption="DVOR user access list" rows={device.accounts} dense getRowId={(row) => row.username}
        columns={[
          { id: "select", label: "Select", render: (row) => <input type="radio" name="dvor220-user" aria-label={`Select ${row.username}`}
            checked={selected === row.username} onChange={() => setSelected(row.username)} /> },
          { id: "number", label: "No.", render: (_row, index) => index + 1 },
          { id: "user", label: "User Name", render: (row) => row.username },
          { id: "level", label: "Access Level", render: (row) => row.level },
        ]} />
      <MopiensModal open={dialog !== null} title={dialog === "delete" ? "Delete User" : "Add User"} onClose={close}
        actions={[
          { id: "confirm", label: dialog === "delete" ? "Delete" : "Add", disabled: dialog === "add" ? !permission.allowed || !username || !password : !deletable, onClick: apply },
          { id: "cancel", label: "Cancel", onClick: close },
        ]}>
        {dialog === "add" ? <>
          <CompactField label="User Name"><input value={username} maxLength={16} onChange={(event) => setUsername(event.target.value)} /></CompactField>
          <CompactField label="Password"><input type="password" value={password} maxLength={16} onChange={(event) => setPassword(event.target.value)} /></CompactField>
          <CompactField label="Access Level"><select value={level} onChange={(event) => setLevel(Number(event.target.value) as 1 | 2 | 3)}><option value={1}>1 Read Only</option><option value={2}>2 Read Write</option><option value={3}>3 Unlimited</option></select></CompactField>
        </> : <p>Delete {selected} from the equipment access list?</p>}
        {error ? <p role="alert" className={styles.inlineError}>{error}</p> : null}
      </MopiensModal>
    </div>
  );
}

function TimeScreen({ device, syncClock }: Dvor220MaintenanceScreenProps) {
  const permission = getDvor220PermissionDecision(device, "control");
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="Time Sync" />
      <MopiensPropertyGrid ariaLabel="Time Sync clocks" sections={[{ id: "time", title: `Time Sync (Vietnam time, ${DVOR220_TIME_ZONE_LABEL})`, rows: [
        { id: "local", label: "Local PC Time", value: formatDvor220DateTime(new Date()) },
        { id: "system", label: "System Time", value: formatDvor220DateTime(device.nowMs) },
      ]}]} />
      <div className={styles.actionRow}>
        <MopiensBeveledButton tone="primary" disabled={!permission.allowed} onClick={syncClock}>Sync.</MopiensBeveledButton>
      </div>
    </div>
  );
}

type ReferenceUnit = [unit: string, designator: string, partNumber: string, hardware?: string, software?: string, update?: boolean];

const txVersionUnits = (rack: "1A2" | "1A3"): ReferenceUnit[] => {
  const tx2 = rack === "1A3";
  return [
    ["LSB SMA", `${rack}A1`, "0230-7160", tx2 ? "D" : undefined],
    ["CMA", `${rack}A2`, "0230-7140", tx2 ? "C" : undefined],
    ["USB SMA", `${rack}A3`, "0230-7160", tx2 ? "D" : undefined],
    ["DC/DC", `${rack}A4`, "0230-7710", "H"],
    ["MSG", `${rack}A5`, "0130-7510", "E", "1.1.6 #05854", true],
    ["SYN", `${rack}A6`, "0230-7130", tx2 ? "E" : undefined, "1.0.0 #05615", true],
    ["MON", `${rack}A7`, "0230-7550", "D", "1.0.0 #05474", true],
    ["FAN", `${rack}A8`, "0130-7910", tx2 ? "D" : undefined],
    ["BP-BL", `${rack}A9`, "0230-3021"],
    ["BP-BR", `${rack}A10`, "0230-3022"],
  ];
};

const camRanhVersion: Record<string, ReferenceUnit[]> = {
  AUX: [
    ["CSP", "1A1A1", "0230-7560", "D"],
    ["TSG", "1A1A2", "0330-7440", "C", "1.0.0 #05123", true],
    ["SCU", "1A1A3", "0130-7520", "G", "1.1.6 #05856", true],
    ["SCU", "1A1A4", "0130-7520", "G", "1.1.6 #05856", true],
    ["EMU", "1A1A5", "0130-7540", "C", "1.1.4 #05762", true],
    ["NIU", "1A1A6", "0130-7550", "A", "1.2.0 #05825", true],
    ["NIU", "1A1A7", "0130-7550", "Unplugged"],
    ["DC/DC-A", "1A1A8", "0130-7720", "G"],
    ["DC/DC-A", "1A1A9", "0130-7720", "G"],
    ["MODEM", "1A1A10", "0130-7420", "Unplugged"],
    ["MODEM", "1A1A11", "0130-7420", "Unplugged"],
    ["VAU", "1A1A12", "0130-7430", "Unplugged"],
    ["IFB", "1A7", "0130-3410", "I"],
    ["BP-A", "1A1A14", "0233-3010"],
  ],
  TX1: txVersionUnits("1A2"),
  TX2: txVersionUnits("1A3"),
  PMU: [
    ["PMU", "1A4A1", "0130-7730", "D", "1.2.1 #05809", true],
    ["PMU", "1A4A2", "0130-7730", "D", "1.2.1 #05809", true],
    ["BP-PM", "1A4A3", "0130-3030"],
  ],
  "AC/DC": [["AC/DC", "1A5A1", "3151-0016"], ["AC/DC", "1A5A2", "3151-0016"]],
  LMI: [["LMI", "1A6", "0130-7530", undefined, "1.1.3 #05841"]],
  PDC: [["PDC", "1A8", "0233-7310", "C", "1.1.0 #05767", true]],
};

function VersionScreen() {
  const [unit, setUnit] = useState<string | null>(null);
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="Version" detail="Cam Ranh reference inventory, not live equipment telemetry." />
      <div className={styles.fieldInputTableFrame}>
        <table className={styles.editorTable}>
          <caption>Version Information</caption>
          <thead><tr>{["Sub", "Unit", "Ref Des.", "P/N", "H/W Rev.", "S/W Ver.", "Up Time", "Firmware Update"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
          {Object.entries(camRanhVersion).map(([subrack, units]) => (
            <tbody key={subrack}>
              {units.map(([name, designator, partNumber, hardware, software, update], index) => (
                <tr key={designator}>
                  {index === 0 ? <th scope="rowgroup" rowSpan={units.length}>{subrack}</th> : null}
                  <td>{name}</td><td>{designator}</td><td>{partNumber}</td><td>{hardware ?? "—"}</td><td>{software ?? "—"}</td><td>—</td>
                  <td>{update ? <MopiensBeveledButton aria-label={`Firmware Update ${designator}`} onClick={() => setUnit(designator)}>↑</MopiensBeveledButton> : null}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <MopiensModal open={unit !== null} title="Firmware Update" onClose={() => setUnit(null)}
        actions={[{ id: "close", label: "Close", onClick: () => setUnit(null) }]}>
        <p>{unit} · Display only. No firmware file is transferred and no equipment settings are changed.</p>
      </MopiensModal>
    </div>
  );
}

const referenceChannels = {
  cha: "CH.A",
  chb1: "CH.B.1",
  chb2: "CH.B.2",
  standby: "STB",
} satisfies Record<Dvor220MonitorChannelId, string>;
const rfOutputLabels = {
  carrier: "CSB",
  usbCos: "USB COS",
  usbSin: "USB SIN",
  lsbCos: "LSB COS",
  lsbSin: "LSB SIN",
} satisfies Record<Dvor220RfOutputId, string>;

function FlightInspectionScreen({ device, snapshot, openDialog, controlsDialogActive }: Dvor220MaintenanceScreenProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="Monitor Check" />
      <section aria-label="Monitor Check">
        <MopiensBeveledButton onClick={() => setOpen(true)}>Monitor Reference Check</MopiensBeveledButton>
      </section>
      {open ? <MonitorReferenceCheck device={device} snapshot={snapshot} openDialog={openDialog} controlsDialogActive={controlsDialogActive} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function MonitorReferenceCheck({ device, snapshot, openDialog, controlsDialogActive, onClose }: Pick<Dvor220MaintenanceScreenProps, "device" | "snapshot" | "openDialog" | "controlsDialogActive"> & { onClose: () => void }) {
  const [channelId, setChannelId] = useState<Dvor220MonitorChannelId>("cha");
  const [shift, setShift] = useState("0");
  const [appliedShift, setAppliedShift] = useState(0);
  const permitted = getDvor220PermissionDecision(device, "control").allowed;
  const transmitterId = snapshot.activeTransmitterId;
  const transmitter = transmitterId ? snapshot.transmitters[transmitterId] : null;
  const limits = device.configuration.running.monitor.channels[channelId].limits.bearingError;
  const validShift = shift.trim() !== "" && Number.isFinite(Number(shift)) && Math.abs(Number(shift)) <= 360;
  const currentShift = permitted ? appliedShift : 0;
  const monitors = ["mon1", "mon2"] as const;
  const directionShift = (sign: 1 | -1) => {
    const threshold = sign === 1 ? limits.upperAlarm : limits.lowerAlarm;
    if (threshold === null) return null;
    const shifts = monitors.flatMap((monitorId) => {
      const reading = snapshot.monitors[monitorId].channels[channelId].readings.bearingError;
      const factor = device.calibration.monitorFactors[monitorId][channelId].bearingError;
      return ["normal", "warning", "alarm"].includes(reading.status) && factor > 0
        ? [sign * (threshold - reading.value) / factor]
        : [];
    });
    const magnitude = Math.ceil((Math.max(0, ...shifts) + 0.01) * 100) / 100;
    return shifts.length && magnitude <= 360 ? sign * magnitude : null;
  };
  const cw = directionShift(1);
  const ccw = directionShift(-1);
  const applyDirection = (value: number | null) => {
    if (value === null || !permitted) return;
    setShift(String(value));
    setAppliedShift(value);
  };

  return (
    <MopiensModal open title="Monitor Reference Check" size="large" onClose={onClose} closeOnEscape={!controlsDialogActive}
      actions={[{ id: "ok", label: "OK", onClick: onClose }, { id: "cancel", label: "Cancel", onClick: onClose }]}>
      <div className={styles.referenceCheckLayout}>
        <section aria-label="Monitor Readings">
          <h3>{transmitterId?.toUpperCase() ?? "No transmitter on antenna"}</h3>
          <CompactField label="Channel">
            <select value={channelId} onChange={(event) => { setChannelId(event.target.value as Dvor220MonitorChannelId); setShift("0"); setAppliedShift(0); }}>
              {DVOR220_MONITOR_CHANNEL_IDS.map((id) => <option key={id} value={id} disabled={!snapshot.monitors.mon1.channels[id].enabled}>{referenceChannels[id]}</option>)}
            </select>
          </CompactField>
          <div className={styles.inlineIndicators}>
            {monitors.map((monitorId) => {
              const reading = snapshot.monitors[monitorId].channels[channelId].readings.bearingError;
              if (reading.status === "disabled" || reading.status === "unplugged" || reading.status === "stabilizing") {
                return <MopiensStatusIndicator key={monitorId} label={monitorId.toUpperCase()} detail={formatDvor220Status(reading.status)} tone="inactive" />;
              }
              const value = reading.value + currentShift * device.calibration.monitorFactors[monitorId][channelId].bearingError;
              const status = currentShift === 0 ? reading.status : classifyDvor220Reading(value, limits);
              return <div key={monitorId}>
                <MopiensGauge label={monitorId.toUpperCase()} value={value} unit="°"
                  min={Math.min(limits.lowerAlarm ?? -1, value)} max={Math.max(limits.upperAlarm ?? 1, value)} tone={toneForDvor220Status(status)} size="small" />
                <MopiensStatusIndicator compact label={monitorId.toUpperCase()} detail={formatDvor220Status(status)} tone={toneForDvor220Status(status)} />
              </div>;
            })}
          </div>
          <div className={styles.inlineIndicators} aria-label="RF Output Status">
            {DVOR220_RF_OUTPUT_IDS.map((output) => <MopiensStatusIndicator key={output} label={rfOutputLabels[output]}
              tone={transmitter?.rfOutputs[output] ? "normal" : "inactive"} detail={transmitter?.rfOutputs[output] ? "On" : "Off"} compact />)}
          </div>
          <div className={styles.actionRow}>
            <MopiensBeveledButton disabled={!permitted} onClick={() => openDialog?.("power")}>Power &amp; Output On/Off</MopiensBeveledButton>
            <MopiensBeveledButton disabled={!permitted} onClick={() => openDialog?.("changeover")}>Changeover</MopiensBeveledButton>
          </div>
        </section>
        <section aria-label="Course Shift">
          <h3>Azimuth Course Shift</h3>
          <div className={styles.actionRow}>
            <MopiensBeveledButton disabled={!permitted || cw === null} onClick={() => applyDirection(cw)}>Azimuth Course Shift Alarm, CW</MopiensBeveledButton>
            <MopiensBeveledButton disabled={!permitted || ccw === null} onClick={() => applyDirection(ccw)}>Azimuth Course Shift Alarm, CCW</MopiensBeveledButton>
            <MopiensBeveledButton disabled={!permitted} onClick={() => { setShift("0"); setAppliedShift(0); }}>Return to origin</MopiensBeveledButton>
          </div>
          <CompactField label="Azimuth Course Shift (°)">
            <input type="number" min={-360} max={360} step="0.01" value={shift} disabled={!permitted} onChange={(event) => setShift(event.target.value)} />
          </CompactField>
          <MopiensBeveledButton disabled={!permitted || !validShift} onClick={() => setAppliedShift(Number(shift))}>Apply</MopiensBeveledButton>
          <output>{Math.abs(currentShift).toFixed(2)}° {currentShift < 0 ? "CCW" : currentShift > 0 ? "CW" : "—"}</output>
          <p>Training preview: alarms are shown here only. The transmitter and executive monitor are not changed.</p>
        </section>
      </div>
    </MopiensModal>
  );
}

function FlightResultsScreen({ device }: Dvor220MaintenanceScreenProps) {
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="Flight Check Results" detail="Latest automatic ground-error measurements for the selected transmitter." />
      <MopiensTable
        caption="Ground error measurement points"
        rows={device.groundCheck.points}
        dense
        emptyLabel="Run Automatic Ground Error Check to create results."
        getRowId={(row) => `${row.azimuthDeg}`}
        rowTone={(row) => Math.abs(row.bearingErrorDeg) <= 1 ? "normal" : "alarm"}
        columns={[
          { id: "azimuth", label: "Azimuth", align: "right", render: (row) => `${row.azimuthDeg}°` },
          { id: "error", label: "Bearing Error", align: "right", render: (row) => `${row.bearingErrorDeg.toFixed(2)}°` },
          { id: "limit", label: "Tolerance", align: "right", render: () => "±1.00°" },
          { id: "result", label: "Result", render: (row) => Math.abs(row.bearingErrorDeg) <= 1 ? "Pass" : "Fail" },
        ]}
      />
    </div>
  );
}

const historyCategories = ["alarm", "control", "event"] as const satisfies readonly Dvor220LogCategory[];
const historyHeadings = ["Time", "Type", "Username", "Detail"];
const historyFields = (row: Dvor220LogEntry) =>
  [new Date(row.timestampMs).toISOString(), row.category, row.userId, row.message];

function downloadHistoryCsv(title: string, rows: Dvor220LogEntry[]) {
  const escape = (value: string) => {
    const safe = /^\s*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const csv = [historyHeadings, ...rows.map(historyFields)].map((row) => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title}.csv`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printHistory(title: string, rows: Dvor220LogEntry[]) {
  const frame = document.createElement("iframe");
  frame.setAttribute("title", title);
  frame.style.display = "none";
  document.body.append(frame);
  const printable = frame.contentDocument;
  const target = frame.contentWindow;
  if (!printable || !target) {
    frame.remove();
    return;
  }
  printable.title = title;
  printable.body.append(Object.assign(printable.createElement("h1"), { textContent: title }));
  const table = printable.createElement("table");
  const header = table.createTHead().insertRow();
  for (const heading of historyHeadings) {
    header.append(Object.assign(printable.createElement("th"), { textContent: heading }));
  }
  const body = table.createTBody();
  for (const row of rows) {
    const line = body.insertRow();
    for (const field of historyFields(row)) line.insertCell().textContent = field;
  }
  printable.body.append(table);
  target.addEventListener("afterprint", () => frame.remove(), { once: true });
  target.print();
}

function HistoryScreen({ screenId, device }: Dvor220MaintenanceScreenProps) {
  const isLmi = screenId === "history-lmi";
  const title = isLmi ? "LMI History Log" : "PMDT History Log";
  const [from, setFrom] = useState(() => `${toDvor220TimeInput(device.nowMs).slice(0, 10)}T00:00:00`);
  const [to, setTo] = useState(() => toDvor220TimeInput(device.nowMs));
  const [categories, setCategories] = useState<Dvor220LogCategory[]>([...historyCategories]);
  const [username, setUsername] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [result, setResult] = useState<Dvor220LogEntry[] | null>(null);
  const rows = isLmi ? device.history.lmi : device.history.pmdt;
  const fromMs = parseDvor220TimeInput(from);
  const toMs = parseDvor220TimeInput(to);
  const validRange = Number.isFinite(fromMs) && Number.isFinite(toMs) && fromMs <= toMs;
  const matchingUsers = [...new Set(rows.map((row) => row.userId))].sort();
  const search = () => {
    if (!validRange) return;
    const filter: Dvor220HistoryFilter = { fromMs, toMs, categories };
    const results = categories.length === 0 ? [] : filterDvor220History(rows, filter);
    setResult(results.filter((row) => !isLmi || !username || row.userId === username).reverse());
  };
  const categoryFields = historyCategories.map((category) => (
    <label key={category}>
      <input type="checkbox" checked={categories.includes(category)} onChange={(event) => setCategories((previous) =>
        event.target.checked ? [...previous, category] : previous.filter((value) => value !== category)
      )} /> {formatDvor220Status(category)}
    </label>
  ));
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title={title} />
      <div className={styles.historyOptions}>
        <fieldset>
          <legend>Search Date/Time</legend>
          <CompactField label="From"><input type="datetime-local" step={0.001} value={from} onChange={(event) => setFrom(event.target.value)} /></CompactField>
          <CompactField label="To"><input type="datetime-local" step={0.001} value={to} onChange={(event) => setTo(event.target.value)} /></CompactField>
        </fieldset>
        <fieldset>
          <legend>{isLmi ? "Extended Search" : "Search Class"}</legend>
          {isLmi ? <>
            <MopiensBeveledButton onClick={() => setShowDetail(true)}>Detail Options</MopiensBeveledButton>
            <span>Username: {username || "Any"}</span>
            <span>Types: {categories.length === historyCategories.length ? "All" : categories.join(", ") || "None"}</span>
          </> : categoryFields}
        </fieldset>
        <fieldset>
          <legend>Search</legend>
          <MopiensBeveledButton disabled={!validRange} onClick={search}>Search</MopiensBeveledButton>
          <MopiensBeveledButton disabled={!result?.length} onClick={() => result && downloadHistoryCsv(title, result)}>Save CSV</MopiensBeveledButton>
          <MopiensBeveledButton disabled={!result?.length} onClick={() => result && printHistory(title, result)}>Save PDF</MopiensBeveledButton>
        </fieldset>
      </div>
      {!validRange ? <p role="alert">Enter a From date and time no later than To.</p> : null}
      <MopiensTable caption={`${isLmi ? "LMI" : "PMDT"} history records`} rows={result ?? []} dense getRowId={(row) => `${row.id}`}
        emptyLabel={result === null ? "Select a date range and run Search." : "No matching records."}
        rowTone={(row) => row.category === "alarm" ? "alarm" : row.category === "control" ? "info" : undefined} columns={[
          { id: "time", label: "Time", width: "21%", render: (row) => formatDvor220DateTime(row.timestampMs) },
          { id: "class", label: "Type", width: "12%", render: (row) => row.category.toUpperCase() },
          { id: "user", label: "Username", width: "15%", render: (row) => row.userId },
          { id: "detail", label: "Detail", render: (row) => row.message },
        ]} />
      <MopiensModal open={showDetail} title="Detail Options" onClose={() => setShowDetail(false)}
        actions={[{ id: "done", label: "OK", onClick: () => setShowDetail(false) }]}>
        <CompactField label="Username">
          <select value={username} onChange={(event) => setUsername(event.target.value)}>
            <option value="">Any</option>
            {matchingUsers.map((name) => <option key={name}>{name}</option>)}
          </select>
        </CompactField>
        <fieldset><legend>Types</legend>{categoryFields}</fieldset>
      </MopiensModal>
    </div>
  );
}

function ParameterChangeHistoryScreen({ device }: { device: Dvor220DeviceState }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const rows = device.history.parameterChanges.filter((row) =>
    !normalizedQuery
    || `${row.userName} ${row.file} ${row.parameter} ${row.state}`.toLocaleLowerCase().includes(normalizedQuery),
  );

  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="Parameter Change" detail="Configuration changes recorded when the running profile is saved to non-volatile memory." />
      <div className={styles.maintenanceToolbar}>
        <CompactField label="Search"><input aria-label="Parameter change search" value={query} onChange={(event) => setQuery(event.target.value)} /></CompactField>
        <span>{rows.length} of {device.history.parameterChanges.length} records</span>
      </div>
      <MopiensTable
        caption="Parameter change history"
        rows={rows}
        dense
        emptyLabel="No parameter change records"
        getRowId={(row) => row.id}
        columns={[
          { id: "time", label: "Time Tag", width: "20%", render: (row) => row.timeTag },
          { id: "file", label: "File", width: "16%", render: (row) => row.file },
          { id: "parameter", label: "Parameter", render: (row) => row.parameter },
          { id: "state", label: "State", width: "12%", render: (row) => row.state === "normal" ? "Normal" : row.state === "warning" ? "Alert Low" : "Alarm" },
          { id: "user", label: "User ID", width: "14%", render: (row) => row.userName },
        ]}
      />
    </div>
  );
}

export function Dvor220MaintenanceScreen(props: Dvor220MaintenanceScreenProps) {
  if (isCalibrationScreen(props.screenId)) return <CalibrationScreen key={props.screenId} {...props} screenId={props.screenId} />;
  if (props.screenId === "maintenance-certification") return <CertificationScreen {...props} />;
  if (props.screenId === "maintenance-antenna") return <AntennaScreen {...props} />;
  if (props.screenId === "maintenance-thermal") return <ThermalTestScreen {...props} />;
  if (props.screenId === "maintenance-faults") return <FaultControlsScreen {...props} />;
  if (props.screenId === "maintenance-ground-check") return <GroundCheckScreen {...props} />;
  if (props.screenId === "maintenance-advanced") return <AdvancedControlsScreen {...props} groundCheck={<GroundCheckScreen {...props} />} />;
  if (props.screenId === "maintenance-users") return <UserManagementScreen {...props} />;
  if (props.screenId === "maintenance-time") return <TimeScreen {...props} />;
  if (props.screenId === "maintenance-version") return <VersionScreen />;
  if (props.screenId === "flight-check") return <FlightInspectionScreen {...props} />;
  if (props.screenId === "flight-results") return <FlightResultsScreen {...props} />;
  if (props.screenId === "history-parameter-change") return <ParameterChangeHistoryScreen device={props.device} />;
  return <HistoryScreen key={props.screenId} {...props} />;
}
