"use client";

import { useState, type ReactNode } from "react";
import {
  MopiensBeveledButton,
  MopiensPropertyGrid,
  MopiensStatusIndicator,
  MopiensTable,
} from "@/modules/operations/mopiens-pmdt";
import { getDvor220PermissionDecision } from "../domain/permissions";
import {
  filterDvor220History,
  getDvor220GroundCheckDurationMs,
} from "../domain/engine";
import {
  DVOR220_MONITOR_CHANNEL_IDS,
  DVOR220_MONITOR_PARAMETERS,
  DVOR220_RF_OUTPUT_IDS,
  DVOR220_TRANSMITTER_IDS,
  type Dvor220CalibrationCommand,
  type Dvor220CalibrationTarget,
  type Dvor220Command,
  type Dvor220CommandResult,
  type Dvor220DeviceState,
  type Dvor220HistoryFilter,
  type Dvor220LogCategory,
  type Dvor220MonitorChannelId,
  type Dvor220MonitorId,
  type Dvor220MonitorParameter,
  type Dvor220PdcCalibrationParameter,
  type Dvor220RfOutputId,
  type Dvor220Snapshot,
  type Dvor220TransmitterId,
} from "../domain/types";
import { formatDvor220Status, toneForDvor220Status } from "./main-screens";
import type { Dvor220ScreenId } from "./navigation";
import { DVOR220_SCREEN_LABELS } from "./navigation";
import styles from "../dvor220.module.css";

export interface Dvor220MaintenanceScreenProps {
  screenId: Dvor220ScreenId;
  device: Dvor220DeviceState;
  snapshot: Dvor220Snapshot;
  dispatch: (command: Dvor220Command) => Dvor220CommandResult;
  advanceTime: (elapsedMs: number) => void;
  syncClock: () => void;
  navigate: (screenId: Dvor220ScreenId) => void;
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

function CalibrationScreen({ screenId, device, snapshot, dispatch, navigate }: Dvor220MaintenanceScreenProps) {
  const [transmitterId, setTransmitterId] = useState<Dvor220TransmitterId>("tx1");
  const [output, setOutput] = useState<Dvor220RfOutputId>("carrier");
  const [setpointParameter, setSetpointParameter] = useState<Dvor220RfOutputId | "am30Hz" | "ident1020Hz">("carrier");
  const [monitorId, setMonitorId] = useState<Dvor220MonitorId>("mon1");
  const [channelId, setChannelId] = useState<Dvor220MonitorChannelId>("cha");
  const [monitorParameter, setMonitorParameter] = useState<Dvor220MonitorParameter>("bearingError");
  const [pdcParameter, setPdcParameter] = useState<Dvor220PdcCalibrationParameter>("carrierPower");
  const [indicatedValue, setIndicatedValue] = useState("100");
  const [referenceValue, setReferenceValue] = useState("100");
  const permission = getDvor220PermissionDecision(device, "calibrate");

  function selectedCalibrationTarget(): Dvor220CalibrationTarget {
    if (screenId === "maintenance-tx-reading") {
      return { kind: "transmitter-reading", transmitterId, output };
    }
    if (screenId === "maintenance-tx-setpoint") {
      return { kind: "transmitter-setpoint", transmitterId, parameter: setpointParameter };
    }
    if (screenId === "maintenance-pdc-cal") return { kind: "pdc", parameter: pdcParameter };
    return { kind: "monitor", monitorId, channelId, parameter: monitorParameter };
  }

  function runCalibration() {
    let calibration: Dvor220CalibrationCommand;
    if (screenId === "maintenance-tx-reading") {
      calibration = { kind: "transmitter-reading", transmitterId, output, indicatedValue: Number(indicatedValue), referenceValue: Number(referenceValue) };
    } else if (screenId === "maintenance-tx-setpoint") {
      calibration = { kind: "transmitter-setpoint", transmitterId, parameter: setpointParameter, indicatedValue: Number(indicatedValue), referenceValue: Number(referenceValue) };
    } else if (screenId === "maintenance-pdc-cal") {
      calibration = { kind: "pdc", parameter: pdcParameter, indicatedValue: Number(indicatedValue), referenceValue: Number(referenceValue) };
    } else {
      calibration = { kind: "monitor", monitorId, channelId, parameter: monitorParameter, indicatedValue: Number(indicatedValue), referenceValue: Number(referenceValue) };
    }
    dispatch({ type: "calibrate", calibration });
  }

  const readingRows = DVOR220_RF_OUTPUT_IDS.map((id) => ({
    id,
    parameter: id.toUpperCase(),
    tx1: device.calibration.transmitterReadingFactors.tx1[id],
    tx2: device.calibration.transmitterReadingFactors.tx2[id],
    value1: snapshot.transmitters.tx1.forwardPowerW[id],
    value2: snapshot.transmitters.tx2.forwardPowerW[id],
  }));
  const calibrationDirty = JSON.stringify({
    transmitterReadingFactors: device.calibration.transmitterReadingFactors,
    transmitterSetpointFactors: device.calibration.transmitterSetpointFactors,
    pdcFactors: device.calibration.pdcFactors,
    monitorFactors: device.calibration.monitorFactors,
    monitorRfLevelOffsets: device.calibration.monitorRfLevelOffsets,
  }) !== JSON.stringify(device.calibration.saved);

  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title={DVOR220_SCREEN_LABELS[screenId]} detail={calibrationDirty ? "Unsaved calibration is active in running memory." : "Running calibration matches non-volatile memory."} />
      <div className={styles.maintenanceToolbar}>
        {screenId === "maintenance-tx-reading" || screenId === "maintenance-tx-setpoint" ? (
          <CompactField label="Transmitter"><select value={transmitterId} onChange={(event) => setTransmitterId(event.target.value as Dvor220TransmitterId)}>{DVOR220_TRANSMITTER_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></CompactField>
        ) : null}
        {screenId === "maintenance-tx-reading" ? (
          <CompactField label="Reading"><select value={output} onChange={(event) => setOutput(event.target.value as Dvor220RfOutputId)}>{DVOR220_RF_OUTPUT_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></CompactField>
        ) : null}
        {screenId === "maintenance-tx-setpoint" ? (
          <CompactField label="Setpoint"><select value={setpointParameter} onChange={(event) => setSetpointParameter(event.target.value as typeof setpointParameter)}>{[...DVOR220_RF_OUTPUT_IDS, "am30Hz", "ident1020Hz"].map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></CompactField>
        ) : null}
        {screenId === "maintenance-monitor-cal" ? (
          <>
            <CompactField label="Monitor"><select value={monitorId} onChange={(event) => setMonitorId(event.target.value as Dvor220MonitorId)}><option value="mon1">MON1</option><option value="mon2">MON2</option></select></CompactField>
            <CompactField label="Channel"><select value={channelId} onChange={(event) => setChannelId(event.target.value as Dvor220MonitorChannelId)}>{DVOR220_MONITOR_CHANNEL_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}</select></CompactField>
            <CompactField label="Parameter"><select value={monitorParameter} onChange={(event) => setMonitorParameter(event.target.value as Dvor220MonitorParameter)}>{DVOR220_MONITOR_PARAMETERS.map((id) => <option key={id} value={id}>{id}</option>)}</select></CompactField>
          </>
        ) : null}
        {screenId === "maintenance-pdc-cal" ? (
          <CompactField label="PDC Reading">
            <select
              value={pdcParameter}
              onChange={(event) => {
                const parameter = event.target.value as Dvor220PdcCalibrationParameter;
                const reading = parameter === "carrierPower" ? snapshot.pdc.carrierPowerW : snapshot.pdc.carrierVswr;
                setPdcParameter(parameter);
                setIndicatedValue(String(reading));
                setReferenceValue(String(reading));
              }}
            >
              <option value="carrierPower">Carrier Power</option>
              <option value="carrierVswr">Carrier VSWR</option>
            </select>
          </CompactField>
        ) : null}
        <CompactField label="Indicated"><input type="number" step="any" value={indicatedValue} onChange={(event) => setIndicatedValue(event.target.value)} /></CompactField>
        <CompactField label="Reference"><input type="number" step="any" value={referenceValue} onChange={(event) => setReferenceValue(event.target.value)} /></CompactField>
        <MopiensBeveledButton tone="primary" disabled={!permission.allowed} onClick={runCalibration}>Calculate</MopiensBeveledButton>
        <MopiensBeveledButton disabled={!permission.allowed} onClick={() => dispatch({ type: "initialize-calibration", target: selectedCalibrationTarget() })}>Initialize</MopiensBeveledButton>
        <MopiensBeveledButton tone={calibrationDirty ? "warning" : "default"} disabled={!permission.allowed || !calibrationDirty} onClick={() => dispatch({ type: "save-calibration" })}>Save</MopiensBeveledButton>
        <MopiensBeveledButton disabled={!permission.allowed} onClick={() => {
          dispatch({ type: "close-calibration", target: selectedCalibrationTarget() });
          navigate("home");
        }}>Close</MopiensBeveledButton>
      </div>
      {permission.allowed ? null : <p role="alert" className={styles.inlineError}>{permission.reason}</p>}
      {screenId === "maintenance-pdc-cal" ? (
        <MopiensPropertyGrid ariaLabel="PDC calibration factors" sections={[{
          id: "pdc-calibration",
          title: "PDC Reading Calibration",
          rows: [
            { id: "power-reading", label: "Carrier Power Reading", value: `${snapshot.pdc.carrierPowerW.toFixed(2)} W` },
            { id: "power-factor", label: "Power Factor", value: device.calibration.pdcFactors.carrierPower.toFixed(6) },
            { id: "vswr-reading", label: "Carrier VSWR Reading", value: `${snapshot.pdc.carrierVswr.toFixed(2)}:1` },
            { id: "vswr-factor", label: "VSWR Factor", value: device.calibration.pdcFactors.carrierVswr.toFixed(6) },
          ],
        }]} />
      ) : (
        <MopiensTable
          caption="Transmitter calibration factors and current readings"
          rows={readingRows}
          dense
          getRowId={(row) => row.id}
          columns={[
            { id: "parameter", label: "Parameter", render: (row) => row.parameter },
            { id: "tx1-factor", label: "TX1 Factor", align: "right", render: (row) => row.tx1.toFixed(5) },
            { id: "tx1-value", label: "TX1 Reading", align: "right", render: (row) => row.value1.toFixed(3) },
            { id: "tx2-factor", label: "TX2 Factor", align: "right", render: (row) => row.tx2.toFixed(5) },
            { id: "tx2-value", label: "TX2 Reading", align: "right", render: (row) => row.value2.toFixed(3) },
          ]}
        />
      )}
    </div>
  );
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
        <MopiensBeveledButton tone="primary" disabled={!canStart || running} onClick={() => dispatch({ type: "start-ground-check" })}>Run Check</MopiensBeveledButton>
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
  const permission = getDvor220PermissionDecision(device, "manage-users");
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="User Management" detail="Level 3 access controls the protected equipment access list." />
      <div className={styles.maintenanceToolbar}>
        <CompactField label="User ID"><input value={username} maxLength={16} onChange={(event) => setUsername(event.target.value)} /></CompactField>
        <CompactField label="Password"><input type="password" value={password} maxLength={16} onChange={(event) => setPassword(event.target.value)} /></CompactField>
        <CompactField label="Security Level"><select value={level} onChange={(event) => setLevel(Number(event.target.value) as 1 | 2 | 3)}><option value={1}>1 Read Only</option><option value={2}>2 Read Write</option><option value={3}>3 Unlimited</option></select></CompactField>
        <MopiensBeveledButton tone="primary" disabled={!permission.allowed || !username} onClick={() => { const result = dispatch({ type: "add-user", account: { username, password, level } }); if (result.ok) { setUsername(""); setPassword(""); } }}>Add User</MopiensBeveledButton>
      </div>
      {permission.allowed ? null : <p role="alert" className={styles.inlineError}>{permission.reason}</p>}
      <MopiensTable
        caption="DVOR user access list"
        rows={device.accounts}
        getRowId={(row) => row.username}
        columns={[
          { id: "user", label: "User ID", render: (row) => row.username },
          { id: "level", label: "Security Level", render: (row) => row.level },
          { id: "access", label: "Access", render: (row) => row.level === 1 ? "Read Only" : row.level === 2 ? "Read Write" : "Unlimited" },
          { id: "action", label: "Action", render: (row) => <MopiensBeveledButton disabled={!permission.allowed || row.username === device.session.username} onClick={() => dispatch({ type: "delete-user", username: row.username })}>Delete</MopiensBeveledButton> },
        ]}
      />
    </div>
  );
}

function TimeScreen({ device, syncClock }: Dvor220MaintenanceScreenProps) {
  const timestamp = new Date(device.nowMs);
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="Time Synchronization" detail="The injected simulator clock drives alarms, logout, battery and maintenance deadlines." />
      <MopiensPropertyGrid ariaLabel="Time settings" sections={[{ id: "time", title: "LMI Clock", rows: [
        { id: "local", label: "Equipment Time", value: timestamp.toLocaleString("en-GB", { hour12: false }) },
        { id: "epoch", label: "Simulation Timestamp", value: `${device.nowMs} ms` },
        { id: "server", label: "NTP Server", value: "172.16.1.1 (simulated)" },
        { id: "source", label: "Clock Source", value: "Injected monotonic clock" },
      ]}]} />
      <div className={styles.actionRow}><MopiensBeveledButton tone="primary" onClick={syncClock}>Synchronize Now</MopiensBeveledButton></div>
    </div>
  );
}

function VersionScreen({ device }: Dvor220MaintenanceScreenProps) {
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="Version Information" detail="MOPIENS 220 DVOR training equipment inventory" />
      <MopiensPropertyGrid ariaLabel="Version information" sections={[
        { id: "system", title: "System", rows: [
          { id: "equipment", label: "Equipment", value: "MOPIENS 220 DVOR" },
          { id: "station", label: "Station", value: device.configuration.running.station.stationName },
          { id: "profile", label: "Profile State", value: device.configuration.flashDirty ? "Running profile not saved" : "Running and flash match", tone: device.configuration.flashDirty ? "warning" : "normal" },
          { id: "equipment-type", label: "Equipment Type", value: device.configuration.running.station.equipmentVersion === "dual" ? "Dual Equipment" : "Single Equipment" },
        ]},
        { id: "units", title: "Unit Firmware", rows: [
          { id: "lmi", label: "LMI / SCU", value: "220-SCU-R5 (simulated)" },
          { id: "tx1", label: "TX1 MSG / SYN", value: "220-TX-R4 (simulated)" },
          { id: "tx2", label: "TX2 MSG / SYN", value: "220-TX-R4 (simulated)" },
          { id: "monitor", label: "MON1 / MON2", value: "220-MON-R3 (simulated)" },
        ]},
      ]} />
    </div>
  );
}

function FlightInspectionScreen({ device, snapshot, dispatch, navigate }: Dvor220MaintenanceScreenProps) {
  const checks = [
    { id: "service", item: "Station service status", value: snapshot.serviceStatus, pass: snapshot.serviceStatus === "normal" },
    { id: "monitor", item: "Executive monitors", value: snapshot.effectiveMonitorBypass ? "bypassed" : "automatic", pass: !snapshot.executiveAlarm },
    { id: "bearing", item: "CH.A bearing error", value: `${snapshot.monitors.mon1.channels.cha.readings.bearingError.value.toFixed(2)}°`, pass: Math.abs(snapshot.monitors.mon1.channels.cha.readings.bearingError.value) <= 1 },
    { id: "carrier", item: "Carrier output", value: `${snapshot.transmitters.tx1.forwardPowerW.carrier.toFixed(2)} W`, pass: snapshot.transmitters.tx1.forwardPowerW.carrier >= 25 },
    { id: "antenna", item: "Antenna VSWR", value: `${snapshot.pdc.antennas.filter((antenna) => antenna.status !== "normal").length} alerts`, pass: snapshot.pdc.antennas.every((antenna) => antenna.status === "normal") },
    { id: "ground", item: "Ground error check", value: device.groundCheck.status, pass: device.groundCheck.status === "completed" && Boolean(device.groundCheck.withinTolerance) },
  ];
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title="Flight Inspection" detail="Operational readiness record based on current transmitter, monitor and antenna values." />
      <MopiensTable caption="Flight inspection checklist" rows={checks} getRowId={(row) => row.id} rowTone={(row) => row.pass ? "normal" : "warning"} columns={[
        { id: "item", label: "Check", render: (row) => row.item },
        { id: "value", label: "Current Value", render: (row) => formatDvor220Status(row.value) },
        { id: "result", label: "Result", render: (row) => row.pass ? "Pass" : "Review" },
      ]} />
      <div className={styles.actionRow}>
        <MopiensBeveledButton onClick={() => navigate("maintenance-ground-check")}>Open Ground Error Check</MopiensBeveledButton>
        <MopiensBeveledButton tone="warning" onClick={() => dispatch({ type: "changeover" })}>Verify Standby by Changeover</MopiensBeveledButton>
        <MopiensBeveledButton onClick={() => navigate("flight-results")}>View Recorded Results</MopiensBeveledButton>
      </div>
    </div>
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

function HistoryScreen({ screenId, device }: Dvor220MaintenanceScreenProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | Dvor220LogCategory>("all");
  const rows = screenId === "history-lmi" ? device.history.lmi : device.history.pmdt;
  const filter: Dvor220HistoryFilter = { query };
  if (category !== "all") filter.categories = [category];
  const filtered = filterDvor220History(rows, filter).slice().reverse();
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader title={DVOR220_SCREEN_LABELS[screenId]} detail={screenId === "history-lmi" ? "Stored continuously while equipment power is available." : "Stored while this PMDT is connected to the equipment."} />
      <div className={styles.maintenanceToolbar}>
        <CompactField label="Search"><input aria-label="History search" value={query} onChange={(event) => setQuery(event.target.value)} /></CompactField>
        <CompactField label="Class"><select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}><option value="all">All</option><option value="alarm">Alarm</option><option value="control">Control</option><option value="event">Event</option></select></CompactField>
        <span>{filtered.length} of {rows.length} records</span>
      </div>
      <MopiensTable caption={`${screenId === "history-lmi" ? "LMI" : "PMDT"} history records`} rows={filtered} dense getRowId={(row) => `${row.id}`} rowTone={(row) => row.category === "alarm" ? "alarm" : row.category === "control" ? "info" : undefined} columns={[
        { id: "time", label: "Time", width: "21%", render: (row) => new Date(row.timestampMs).toLocaleString("en-GB", { hour12: false }) },
        { id: "detail", label: "Detail", render: (row) => row.message },
        { id: "class", label: "Type", width: "12%", render: (row) => row.category.toUpperCase() },
        { id: "user", label: "User ID", width: "15%", render: (row) => row.userId },
      ]} />
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

function AdvancedControlsScreen(props: Dvor220MaintenanceScreenProps) {
  const [activeTool, setActiveTool] = useState<"certification" | "antenna" | "ground-check">("certification");
  return (
    <div className={styles.screenBody}>
      <MaintenanceHeader
        title="Advanced Controls"
        detail="Maintenance tests provided by the DVOR 220 PMDT."
      />
      <div className={styles.maintenanceToolbar} role="tablist" aria-label="Advanced control pages">
        <MopiensBeveledButton pressed={activeTool === "certification"} onClick={() => setActiveTool("certification")}>Monitor Certification</MopiensBeveledButton>
        <MopiensBeveledButton pressed={activeTool === "antenna"} onClick={() => setActiveTool("antenna")}>Antenna Tests</MopiensBeveledButton>
        <MopiensBeveledButton pressed={activeTool === "ground-check"} onClick={() => setActiveTool("ground-check")}>Automatic Ground Error Check</MopiensBeveledButton>
      </div>
      {activeTool === "certification" ? <CertificationScreen {...props} /> : null}
      {activeTool === "antenna" ? <AntennaScreen {...props} /> : null}
      {activeTool === "ground-check" ? <GroundCheckScreen {...props} /> : null}
    </div>
  );
}

export function Dvor220MaintenanceScreen(props: Dvor220MaintenanceScreenProps) {
  if (["maintenance-tx-reading", "maintenance-tx-setpoint", "maintenance-monitor-cal", "maintenance-pdc-cal"].includes(props.screenId)) return <CalibrationScreen {...props} />;
  if (props.screenId === "maintenance-certification") return <CertificationScreen {...props} />;
  if (props.screenId === "maintenance-antenna") return <AntennaScreen {...props} />;
  if (props.screenId === "maintenance-faults") return <FaultControlsScreen {...props} />;
  if (props.screenId === "maintenance-ground-check") return <GroundCheckScreen {...props} />;
  if (props.screenId === "maintenance-advanced") return <AdvancedControlsScreen {...props} />;
  if (props.screenId === "maintenance-users") return <UserManagementScreen {...props} />;
  if (props.screenId === "maintenance-time") return <TimeScreen {...props} />;
  if (props.screenId === "maintenance-version") return <VersionScreen {...props} />;
  if (props.screenId === "flight-check") return <FlightInspectionScreen {...props} />;
  if (props.screenId === "flight-results") return <FlightResultsScreen {...props} />;
  if (props.screenId === "history-parameter-change") return <ParameterChangeHistoryScreen device={props.device} />;
  return <HistoryScreen {...props} />;
}
