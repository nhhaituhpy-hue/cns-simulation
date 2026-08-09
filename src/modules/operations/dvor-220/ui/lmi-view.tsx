"use client";

import { useState } from "react";
import {
  MopiensBeveledButton,
  MopiensLmiShell,
  MopiensPropertyGrid,
  MopiensSlideSwitch,
  MopiensStatusIndicator,
  MopiensTable,
  type MopiensSoftKeyDefinition,
} from "@/modules/operations/mopiens-pmdt";
import {
  type Dvor220Command,
  type Dvor220CommandResult,
  type Dvor220DeviceState,
  type Dvor220Snapshot,
} from "../domain/types";
import { formatDvor220Status, toneForDvor220Status } from "./main-screens";
import styles from "../dvor220.module.css";

type LmiPage = "status" | "setup" | "maintenance" | "history";

export interface Dvor220LmiViewProps {
  device: Dvor220DeviceState;
  snapshot: Dvor220Snapshot;
  dispatch: (command: Dvor220Command) => Dvor220CommandResult;
  advanceTime: (elapsedMs: number) => void;
  onShowPmdt: () => void;
}

export function Dvor220LmiView({ device, snapshot, dispatch, advanceTime, onShowPmdt }: Dvor220LmiViewProps) {
  const [page, setPage] = useState<LmiPage>("status");
  const softKeys: MopiensSoftKeyDefinition[] = [
    { id: "status", label: "STATUS", pressed: page === "status" },
    { id: "setup", label: "SETUP", pressed: page === "setup" },
    { id: "maintenance", label: "MAINT", pressed: page === "maintenance" },
    { id: "history", label: "HISTORY", pressed: page === "history" },
    { id: "pmdt", label: "PMDT" },
  ];

  function handleSoftKey(id: string) {
    if (id === "pmdt") onShowPmdt();
    else setPage(id as LmiPage);
  }

  return (
    <MopiensLmiShell
      ariaLabel="MOPIENS 220 DVOR LMI"
      title="220 DVOR Local Maintenance Interface"
      unitLabel="MOPIENS"
      screenTitle={page === "status" ? "Equipment Status" : page === "setup" ? "Local Setup" : page === "maintenance" ? "Maintenance Controls" : "LMI History Log"}
      indicators={[
        { id: "service", label: "SERVICE", tone: toneForDvor220Status(snapshot.serviceStatus), detail: snapshot.serviceStatus },
        { id: "mon1", label: "MON1", tone: toneForDvor220Status(snapshot.monitors.mon1.status), detail: snapshot.monitors.mon1.status },
        { id: "mon2", label: "MON2", tone: toneForDvor220Status(snapshot.monitors.mon2.status), detail: snapshot.monitors.mon2.status },
        { id: "control", label: device.keylock, tone: snapshot.controlAvailable ? "normal" : "warning", detail: snapshot.controlAvailable ? "Local control available" : "Control assigned elsewhere" },
      ]}
      softKeys={softKeys}
      statusItems={[
        { id: "tx1", label: "TX1", value: `${snapshot.transmitters.tx1.path} ${snapshot.transmitters.tx1.designation}`, tone: toneForDvor220Status(snapshot.transmitters.tx1.status) },
        { id: "tx2", label: "TX2", value: `${snapshot.transmitters.tx2.path} ${snapshot.transmitters.tx2.designation}`, tone: toneForDvor220Status(snapshot.transmitters.tx2.status) },
        { id: "power", label: "POWER", value: snapshot.power.source.toUpperCase(), tone: toneForDvor220Status(snapshot.power.status) },
        { id: "time", label: "TIME", value: new Date(device.nowMs).toLocaleTimeString("en-GB", { hour12: false }), grow: true },
      ]}
      onSoftKey={handleSoftKey}
    >
      {page === "status" ? <LmiStatus device={device} snapshot={snapshot} /> : null}
      {page === "setup" ? <LmiSetup device={device} snapshot={snapshot} dispatch={dispatch} /> : null}
      {page === "maintenance" ? <LmiMaintenance device={device} snapshot={snapshot} dispatch={dispatch} advanceTime={advanceTime} /> : null}
      {page === "history" ? <LmiHistory device={device} /> : null}
    </MopiensLmiShell>
  );
}

function LmiStatus({ device, snapshot }: Pick<Dvor220LmiViewProps, "device" | "snapshot">) {
  return (
    <div className={styles.lmiPage}>
      <div className={styles.lmiStatusStrip}>
        <MopiensStatusIndicator appearance="ring" label={snapshot.serviceStatus.toUpperCase()} detail="Service" tone={toneForDvor220Status(snapshot.serviceStatus)} />
        <MopiensStatusIndicator label="TX1" detail={`${snapshot.transmitters.tx1.path}, ${snapshot.transmitters.tx1.designation}`} tone={toneForDvor220Status(snapshot.transmitters.tx1.status)} />
        <MopiensStatusIndicator label="TX2" detail={`${snapshot.transmitters.tx2.path}, ${snapshot.transmitters.tx2.designation}`} tone={toneForDvor220Status(snapshot.transmitters.tx2.status)} />
      </div>
      <MopiensPropertyGrid ariaLabel="LMI equipment readings" sections={[
        { id: "station", title: device.configuration.running.station.stationName, rows: [
          { id: "frequency", label: "Frequency", value: `${device.configuration.running.station.frequencyMHz.toFixed(2)} MHz` },
          { id: "ident", label: "IDENT", value: device.configuration.running.station.identCode },
          { id: "carrier", label: "Carrier Power", value: `${snapshot.transmitters[snapshot.activeTransmitterId ?? "tx1"].forwardPowerW.carrier.toFixed(2)} W` },
          { id: "monitor", label: "Monitor Mode", value: snapshot.effectiveMonitorBypass ? "Bypass" : "Automatic", tone: snapshot.effectiveMonitorBypass ? "warning" : "normal" },
          { id: "executive", label: "Executive State", value: formatDvor220Status(device.executive.phase), tone: device.executive.phase === "idle" ? "normal" : "alarm" },
          { id: "battery", label: "Battery", value: `${snapshot.power.batteryVoltageV.toFixed(1)} V, ${snapshot.power.batteryRemainingMinutes} min`, tone: toneForDvor220Status(snapshot.power.batteryStatus) },
        ]},
      ]} />
    </div>
  );
}

function LmiSetup({ device, snapshot, dispatch }: Pick<Dvor220LmiViewProps, "device" | "snapshot" | "dispatch">) {
  const controlsDisabled = device.session.level < 2 || !snapshot.controlAvailable;
  return (
    <div className={styles.lmiPage}>
      <fieldset className={styles.lmiControlGroup}>
        <legend>Keylock Control</legend>
        <div className={styles.actionRow}>
          {(["LOCAL", "REM", "MAINT"] as const).map((mode) => <MopiensBeveledButton key={mode} pressed={device.keylock === mode} onClick={() => dispatch({ type: "set-keylock", mode })}>{mode}</MopiensBeveledButton>)}
        </div>
      </fieldset>
      <fieldset className={styles.lmiControlGroup}>
        <legend>Monitor Mode</legend>
        <div className={styles.lmiSwitchRow}>
          <MopiensSlideSwitch disabled={controlsDisabled} label="MON1 bypass" checked={device.monitors.mon1.bypassRequested} onLabel="BYPASS" offLabel="AUTO" onCheckedChange={(bypass) => dispatch({ type: "set-monitor-bypass", monitorId: "mon1", bypass })} />
          <MopiensSlideSwitch disabled={controlsDisabled} label="MON2 bypass" checked={device.monitors.mon2.bypassRequested} onLabel="BYPASS" offLabel="AUTO" onCheckedChange={(bypass) => dispatch({ type: "set-monitor-bypass", monitorId: "mon2", bypass })} />
          <MopiensStatusIndicator label="Effective Mode" detail={snapshot.effectiveMonitorBypass ? "Bypass" : "Automatic"} tone={snapshot.effectiveMonitorBypass ? "warning" : "normal"} />
        </div>
      </fieldset>
      <fieldset className={styles.lmiControlGroup}>
        <legend>Transmitter Control</legend>
        <div className={styles.actionRow}>
          <MopiensBeveledButton disabled={controlsDisabled} tone="warning" onClick={() => dispatch({ type: "changeover" })}>Change Over</MopiensBeveledButton>
          <MopiensBeveledButton disabled={controlsDisabled} onClick={() => dispatch({ type: "select-main", transmitterId: "tx1" })}>TX1 Main</MopiensBeveledButton>
          <MopiensBeveledButton disabled={controlsDisabled} onClick={() => dispatch({ type: "select-main", transmitterId: "tx2" })}>TX2 Main</MopiensBeveledButton>
          <MopiensBeveledButton disabled={controlsDisabled} tone="warning" onClick={() => dispatch({ type: "reset" })}>Reset</MopiensBeveledButton>
        </div>
      </fieldset>
    </div>
  );
}

function LmiMaintenance({ device, snapshot, dispatch, advanceTime }: Pick<Dvor220LmiViewProps, "device" | "snapshot" | "dispatch" | "advanceTime">) {
  const running = device.groundCheck.status === "running";
  return (
    <div className={styles.lmiPage}>
      <div className={styles.lmiStatusStrip}>
        <MopiensStatusIndicator label="Faults" detail={`${device.faults.length} active`} tone={device.faults.length ? "alarm" : "normal"} />
        <MopiensStatusIndicator label="Ground Check" detail={formatDvor220Status(device.groundCheck.status)} tone={device.groundCheck.status === "failed" ? "alarm" : device.groundCheck.status === "completed" ? "normal" : "pending"} />
        <MopiensStatusIndicator label="PDC" detail={formatDvor220Status(snapshot.pdc.status)} tone={toneForDvor220Status(snapshot.pdc.status)} />
      </div>
      <fieldset className={styles.lmiControlGroup}>
        <legend>Automatic Ground Error Check</legend>
        <div className={styles.actionRow}>
          <MopiensBeveledButton tone="primary" disabled={running} onClick={() => dispatch({ type: "start-ground-check" })}>Run</MopiensBeveledButton>
          <MopiensBeveledButton disabled={!running} onClick={() => advanceTime(5_000)}>Complete 5 s</MopiensBeveledButton>
        </div>
      </fieldset>
      <fieldset className={styles.lmiControlGroup}>
        <legend>Fault Acknowledge</legend>
        <div className={styles.actionRow}>
          <MopiensBeveledButton onClick={() => dispatch({ type: "fault-clear" })}>Fault Clear</MopiensBeveledButton>
          <MopiensBeveledButton tone="danger" disabled={!device.faults.length} onClick={() => dispatch({ type: "clear-all-faults" })}>Clear Simulator Faults</MopiensBeveledButton>
        </div>
      </fieldset>
    </div>
  );
}

function LmiHistory({ device }: Pick<Dvor220LmiViewProps, "device">) {
  return (
    <div className={styles.lmiPage}>
      <MopiensTable caption="Latest LMI history" rows={device.history.lmi.slice(-12).reverse()} dense getRowId={(row) => `${row.id}`} rowTone={(row) => row.category === "alarm" ? "alarm" : row.category === "control" ? "info" : undefined} columns={[
        { id: "time", label: "Time", width: "22%", render: (row) => new Date(row.timestampMs).toLocaleTimeString("en-GB", { hour12: false }) },
        { id: "category", label: "Class", width: "14%", render: (row) => row.category.toUpperCase() },
        { id: "detail", label: "Detail", render: (row) => row.message },
        { id: "user", label: "User", width: "16%", render: (row) => row.userId },
      ]} />
    </div>
  );
}
