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
import { canDme320 } from "../domain/permissions";
import {
  DME320_MONITOR_PARAMETERS,
  type Dme320Command,
  type Dme320CommandResult,
  type Dme320SimulationState,
} from "../domain/types";
import {
  DME320_PARAMETER_LABELS,
  formatReading,
  formatStatus,
  toneForBatteryStatus,
  toneForOverallStatus,
  toneForServiceStatus,
} from "./presentation";
import type { Dme320AdvanceBy } from "./screen-types";
import { monitorTone, transmitterDetail, transmitterTone } from "./main-screens";
import styles from "./dme320-ui.module.css";

type LmiPage = "overview" | "equipment" | "monitor" | "setup" | "maintenance" | "history";

export interface Dme320LmiViewProps {
  simulation: Dme320SimulationState;
  dispatch: (command: Dme320Command) => Dme320CommandResult;
  advanceBy: Dme320AdvanceBy;
  onShowPmdt: () => void;
}

function lmiControlAvailable(simulation: Dme320SimulationState): boolean {
  return canDme320(simulation, "basic-control");
}

export function Dme320LmiView({ simulation, dispatch, advanceBy, onShowPmdt }: Dme320LmiViewProps) {
  const [page, setPage] = useState<LmiPage>("overview");
  const [message, setMessage] = useState<string | null>(null);
  const softKeys: MopiensSoftKeyDefinition[] = [
    { id: "overview", label: "HOME", pressed: page === "overview" },
    { id: "equipment", label: "EQUIP", pressed: page === "equipment" },
    { id: "monitor", label: "MON", pressed: page === "monitor" },
    { id: "setup", label: "SETUP", pressed: page === "setup" },
    { id: "maintenance", label: "MAINT", pressed: page === "maintenance" },
    { id: "history", label: "HISTORY", pressed: page === "history" },
    { id: "pmdt", label: "PMDT" },
  ];

  function execute(command: Dme320Command) {
    const result = dispatch(command);
    setMessage(result.message);
    return result;
  }

  function handleSoftKey(id: string) {
    if (id === "pmdt") onShowPmdt();
    else setPage(id as LmiPage);
  }

  const pageTitle: Record<LmiPage, string> = {
    overview: "Status > Overview",
    equipment: "Status > Equipment",
    monitor: "Status > Monitor",
    setup: "Setup > System",
    maintenance: "Maintenance > Control",
    history: "History Log",
  };

  return (
    <MopiensLmiShell
      ariaLabel="MOPIENS 320 DME Local Maintenance Interface"
      title="320 DME"
      unitLabel="MOPIENS"
      screenTitle={pageTitle[page]}
      designWidth={800}
      designHeight={600}
      indicators={[
        { id: "normal", label: "NORMAL", tone: simulation.serviceStatus === "normal" ? "normal" : "inactive", detail: simulation.serviceStatus },
        { id: "warning", label: "WARNING", tone: simulation.serviceStatus === "warning" || simulation.power.source === "battery" ? "warning" : "inactive", detail: simulation.serviceStatus },
        { id: "alarm", label: "ALARM", tone: simulation.serviceStatus === "alarm" || simulation.serviceStatus === "shutdown" ? "alarm" : "inactive", detail: simulation.serviceStatus },
        { id: "maint", label: "MAINT", tone: simulation.keylock === "MAINT" ? "info" : "inactive", detail: simulation.keylock },
      ]}
      softKeys={softKeys}
      statusItems={[
        { id: "server", label: "SERVER", value: "RUN", tone: "normal" },
        { id: "tx1", label: "TXP1", value: transmitterDetail("tx1", simulation), tone: transmitterTone(simulation.transmitters.tx1) },
        { id: "tx2", label: "TXP2", value: transmitterDetail("tx2", simulation), tone: transmitterTone(simulation.transmitters.tx2) },
        { id: "mon1", label: "MON1", value: simulation.monitors.mon1.mode.toUpperCase(), tone: monitorTone(simulation, "mon1") },
        { id: "mon2", label: "MON2", value: simulation.monitors.mon2.mode.toUpperCase(), tone: monitorTone(simulation, "mon2") },
        { id: "time", label: "UTC", value: new Date(simulation.nowMs).toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" }), grow: true },
      ]}
      onSoftKey={handleSoftKey}
    >
      {page === "overview" ? <LmiOverview simulation={simulation} execute={execute} /> : null}
      {page === "equipment" ? <LmiEquipment simulation={simulation} /> : null}
      {page === "monitor" ? <LmiMonitor simulation={simulation} /> : null}
      {page === "setup" ? <LmiSetup simulation={simulation} execute={execute} /> : null}
      {page === "maintenance" ? <LmiMaintenance simulation={simulation} execute={execute} advanceBy={advanceBy} /> : null}
      {page === "history" ? <LmiHistory simulation={simulation} /> : null}
      {message ? <div className={styles.lmiMessage} role="status">{message}</div> : null}
    </MopiensLmiShell>
  );
}

function LmiOverview({ simulation, execute }: { simulation: Dme320SimulationState; execute: (command: Dme320Command) => Dme320CommandResult }) {
  const canControl = lmiControlAvailable(simulation);
  const rows = (["timeDelayUs", "peakPowerWatts", "replyEfficiencyPct"] as const).map((parameter) => ({
    parameter,
    mon1: simulation.monitors.mon1.channels.executive.readings[parameter],
    mon2: simulation.monitors.mon2.channels.executive.readings[parameter],
    alarm1: simulation.monitors.mon1.channels.executive.alarms[parameter],
    alarm2: simulation.monitors.mon2.channels.executive.alarms[parameter],
  }));
  return <div className={styles.lmiPage}>
    <section className={styles.lmiOverviewTop}>
      <MopiensStatusIndicator appearance="ring" label={simulation.serviceStatus.toUpperCase()} detail="Service Status" tone={toneForServiceStatus(simulation.serviceStatus)} />
      <MopiensPropertyGrid ariaLabel="LMI station overview" sections={[{ id: "station", rows: [
        { id: "channel", label: "Channel", value: `${simulation.config.running.station.channel.number}${simulation.config.running.station.channel.suffix}` },
        { id: "ident", label: "IDENT Code", value: simulation.config.running.station.identCode },
        { id: "power", label: "Power", value: simulation.power.source.toUpperCase(), tone: simulation.power.source === "ac" ? "normal" : "warning" },
        { id: "main", label: "Main TXP", value: simulation.mainTransponder.toUpperCase() },
        { id: "control", label: "Control", value: canControl ? `${simulation.keylock} LOCAL` : `${simulation.keylock} LOCKED`, tone: canControl ? "normal" : "warning" },
      ]}]} />
      <div className={styles.lmiTopology}>{(["tx1", "tx2"] as const).map((id) => <MopiensStatusIndicator key={id} label={id.toUpperCase()} detail={transmitterDetail(id, simulation)} tone={transmitterTone(simulation.transmitters[id])} />)}</div>
    </section>
    <MopiensTable caption="Executive monitor overview" rows={rows} dense getRowId={(row) => row.parameter} rowTone={(row) => row.alarm1.phase === "active" || row.alarm2.phase === "active" ? "alarm" : row.alarm1.phase === "warning" || row.alarm2.phase === "warning" ? "warning" : "normal"} columns={[
      { id: "parameter", label: "Reading", width: "30%", render: (row) => DME320_PARAMETER_LABELS[row.parameter] },
      { id: "mon1", label: "MON1", align: "right", render: (row) => formatReading(row.mon1.value, simulation.config.running.monitor.limits[row.parameter].unit) },
      { id: "mon2", label: "MON2", align: "right", render: (row) => formatReading(row.mon2.value, simulation.config.running.monitor.limits[row.parameter].unit) },
    ]} />
    <div className={styles.lmiControls}>
      <MopiensBeveledButton tone="warning" disabled={!canControl} onClick={() => execute({ type: "changeover" })}>CHOV</MopiensBeveledButton>
      {(["tx1", "tx2"] as const).map((id) => <MopiensSlideSwitch key={`${id}-dc`} label={`${id.toUpperCase()} Power`} checked={simulation.transmitters[id].dcPower === "on"} disabled={!canControl} onCheckedChange={(on) => execute({ type: "set-transponder-power", transponderId: id, on })} />)}
      {(["tx1", "tx2"] as const).map((id) => <MopiensSlideSwitch key={`${id}-rf`} label={`${id.toUpperCase()} RF`} checked={simulation.transmitters[id].rfEnabled} disabled={!canControl || simulation.transmitters[id].dcPower === "off"} onCheckedChange={(enabled) => execute({ type: "set-transponder-rf", transponderId: id, enabled })} />)}
      <MopiensBeveledButton disabled={!canControl} onClick={() => execute({ type: "select-main", transponderId: simulation.mainTransponder === "tx1" ? "tx2" : "tx1" })}>MAIN</MopiensBeveledButton>
      <MopiensBeveledButton tone="warning" disabled={!canControl} onClick={() => execute({ type: "reset-system" })}>RESET</MopiensBeveledButton>
    </div>
  </div>;
}

function LmiEquipment({ simulation }: { simulation: Dme320SimulationState }) {
  return <div className={styles.lmiPage}><div className={styles.lmiEquipmentGrid}>
    {(["tx1", "tx2"] as const).map((id) => <MopiensStatusIndicator key={id} appearance="badge" label={id.toUpperCase()} detail={transmitterDetail(id, simulation)} tone={transmitterTone(simulation.transmitters[id])} />)}
    {(["mon1", "mon2"] as const).map((id) => <MopiensStatusIndicator key={id} appearance="badge" label={id.toUpperCase()} detail={`${simulation.monitors[id].mode.toUpperCase()}, ${formatStatus(simulation.monitors[id].channels.executive.overallStatus)}`} tone={monitorTone(simulation, id)} />)}
    <MopiensStatusIndicator appearance="badge" label="POWER" detail={`${simulation.power.source.toUpperCase()}, AC ${simulation.power.acAvailable ? "OK" : "FAIL"}`} tone={simulation.power.source === "ac" ? "normal" : simulation.power.source === "battery" ? "warning" : "alarm"} />
    <MopiensStatusIndicator appearance="badge" label="EMU" detail={simulation.environment.present ? `${simulation.environment.temperatureC.toFixed(1)} °C` : "Not Present"} tone={!simulation.environment.present ? "inactive" : simulation.environment.smokeDetected || simulation.environment.intrusionDetected ? "alarm" : "normal"} />
  </div><div className={styles.twoColumnGrid}>{(["battery1", "battery2"] as const).map((id) => { const battery = simulation.power.batteries[id]; return <MopiensPropertyGrid key={id} ariaLabel={`${id} LMI status`} sections={[{ id, title: id.toUpperCase(), rows: [
    { id: "status", label: "Status", value: formatStatus(battery.status), tone: toneForBatteryStatus(battery.status) },
    { id: "voltage", label: "Voltage", value: `${battery.voltage.toFixed(1)} V` },
    { id: "current", label: "Current", value: `${battery.currentA.toFixed(1)} A` },
    { id: "temperature", label: "Temperature", value: `${battery.temperatureC.toFixed(1)} °C` },
  ]}]} />; })}</div></div>;
}

function LmiMonitor({ simulation }: { simulation: Dme320SimulationState }) {
  const rows = DME320_MONITOR_PARAMETERS.map((parameter) => ({ parameter, mon1: simulation.monitors.mon1.channels.executive, mon2: simulation.monitors.mon2.channels.executive }));
  return <div className={styles.lmiPage}><div className={styles.monitorSummary}>{(["mon1", "mon2"] as const).map((id) => <MopiensStatusIndicator key={id} label={id.toUpperCase()} detail={`${simulation.monitors[id].mode.toUpperCase()} / ${formatStatus(simulation.monitors[id].channels.executive.overallStatus)}`} tone={toneForOverallStatus(simulation.monitors[id].channels.executive.overallStatus)} />)}</div><MopiensTable caption="Executive monitor readings" rows={rows} dense getRowId={(row) => row.parameter} rowTone={(row) => { const phase1 = row.mon1.alarms[row.parameter].phase; const phase2 = row.mon2.alarms[row.parameter].phase; return phase1 === "active" || phase2 === "active" ? "alarm" : phase1 === "warning" || phase2 === "warning" ? "warning" : undefined; }} columns={[
    { id: "parameter", label: "Parameter", width: "34%", render: (row) => DME320_PARAMETER_LABELS[row.parameter] },
    { id: "mon1", label: "MON1", align: "right", render: (row) => row.mon1.readings[row.parameter].masked ? "MASKED" : formatReading(row.mon1.readings[row.parameter].value, simulation.config.running.monitor.limits[row.parameter].unit) },
    { id: "mon1-state", label: "State", render: (row) => formatStatus(row.mon1.alarms[row.parameter].phase) },
    { id: "mon2", label: "MON2", align: "right", render: (row) => row.mon2.readings[row.parameter].masked ? "MASKED" : formatReading(row.mon2.readings[row.parameter].value, simulation.config.running.monitor.limits[row.parameter].unit) },
    { id: "mon2-state", label: "State", render: (row) => formatStatus(row.mon2.alarms[row.parameter].phase) },
  ]} /></div>;
}

function LmiSetup({ simulation, execute }: { simulation: Dme320SimulationState; execute: (command: Dme320Command) => Dme320CommandResult }) {
  const canApply = canDme320(simulation, "setup");
  const canSaveProfile = canDme320(simulation, "profile");
  return <div className={styles.lmiPage}>
    <fieldset className={styles.lmiControlGroup}><legend>Keylock Simulation</legend><div className={styles.actionRow}>{(["LOCAL", "REM", "MAINT"] as const).map((mode) => <MopiensBeveledButton key={mode} pressed={simulation.keylock === mode} onClick={() => execute({ type: "set-keylock", mode })}>{mode}</MopiensBeveledButton>)}</div></fieldset>
    <fieldset className={styles.lmiControlGroup}><legend>Monitor Action</legend><div className={styles.lmiSwitchRow}>{(["mon1", "mon2"] as const).map((monitorId) => <MopiensSlideSwitch key={monitorId} label={`${monitorId.toUpperCase()} Mode`} checked={simulation.monitors[monitorId].mode === "auto"} onLabel="AUTO" offLabel="BYPASS" tone={simulation.monitors[monitorId].mode === "auto" ? "normal" : "warning"} onCheckedChange={(automatic) => execute({ type: "set-monitor-mode", monitorId, mode: automatic ? "auto" : "bypass" })} />)}</div></fieldset>
    <MopiensPropertyGrid ariaLabel="LMI running station setup" sections={[{ id: "station", title: "Running Station Setup", rows: [
      { id: "station", label: "Station", value: simulation.config.running.station.stationName },
      { id: "channel", label: "Channel", value: `${simulation.config.running.station.channel.number}${simulation.config.running.station.channel.suffix}` },
      { id: "ident", label: "IDENT", value: simulation.config.running.station.identCode },
      { id: "power", label: "Peak Power", value: `${simulation.config.running.station.powerOutputWatts.toFixed(1)} W` },
      { id: "draft", label: "Draft", value: simulation.config.draftDirty ? "MODIFIED" : "CLEAN", tone: simulation.config.draftDirty ? "warning" : "normal" },
      { id: "flash", label: "Flash", value: simulation.config.flashDirty ? "SAVE REQUIRED" : "SAVED", tone: simulation.config.flashDirty ? "warning" : "normal" },
    ]}]} />
    <div className={styles.actionRow}><MopiensBeveledButton tone="primary" disabled={!canApply || !simulation.config.draftDirty} onClick={() => execute({ type: "apply-draft" })}>Apply Draft</MopiensBeveledButton><MopiensBeveledButton disabled={!canSaveProfile || !simulation.config.flashDirty} onClick={() => execute({ type: "save-running-to-flash" })}>Profile Save</MopiensBeveledButton></div>
  </div>;
}

function LmiMaintenance({ simulation, execute, advanceBy }: { simulation: Dme320SimulationState; execute: (command: Dme320Command) => Dme320CommandResult; advanceBy: Dme320AdvanceBy }) {
  const enabled = canDme320(simulation, "maintenance");
  const currentStep = simulation.calibration.currentStep === null ? null : simulation.calibration.steps[simulation.calibration.currentStep - 1];
  return <div className={styles.lmiPage}>
    <div className={styles.monitorSummary}><MopiensStatusIndicator label="ACCESS" detail={enabled ? "Maintenance enabled" : "Level 3 / MAINT / bypass required"} tone={enabled ? "normal" : "inactive"} /><MopiensStatusIndicator label="FAULTS" detail={`${simulation.faults.filter((fault) => fault.active).length} active`} tone={simulation.faults.some((fault) => fault.active) ? "alarm" : "normal"} /><MopiensStatusIndicator label="CAL" detail={formatStatus(simulation.calibration.status)} tone={simulation.calibration.status === "completed" ? "normal" : simulation.calibration.status === "failed" ? "alarm" : simulation.calibration.status === "running" ? "pending" : "inactive"} /></div>
    <fieldset className={styles.lmiControlGroup} disabled={!enabled}><legend>Transponder Calibration</legend><p>{currentStep ? `Step ${currentStep.number}/10 - ${currentStep.name}` : "Select the Main TXP and start the ten-step calibration sequence."}</p><div className={styles.actionRow}><MopiensBeveledButton tone="primary" disabled={simulation.calibration.status === "running"} onClick={() => execute({ type: "start-calibration", transponderId: simulation.mainTransponder })}>Start</MopiensBeveledButton><MopiensBeveledButton disabled={simulation.calibration.status !== "running"} onClick={() => execute({ type: "run-calibration-step" })}>Run Step</MopiensBeveledButton><MopiensBeveledButton disabled={!currentStep?.skippable} onClick={() => execute({ type: "skip-calibration-step" })}>Skip</MopiensBeveledButton></div></fieldset>
    <fieldset className={styles.lmiControlGroup}><legend>Simulation Time</legend><div className={styles.actionRow}><MopiensBeveledButton onClick={() => advanceBy(1_000)}>Advance 1 s</MopiensBeveledButton><MopiensBeveledButton onClick={() => advanceBy(60_000)}>Advance 1 min</MopiensBeveledButton></div></fieldset>
    <MopiensTable caption="Active faults" rows={simulation.faults.filter((fault) => fault.active)} dense emptyLabel="No active equipment faults" getRowId={(row) => row.id} rowTone={() => "alarm"} columns={[
      { id: "fault", label: "Fault", render: (row) => formatStatus(row.kind) },
      { id: "target", label: "Target", width: "18%", render: (row) => row.target.toUpperCase() },
      { id: "clear", label: "Control", width: "18%", align: "right", render: (row) => <MopiensBeveledButton disabled={!enabled} onClick={() => execute({ type: "clear-fault", faultId: row.id })}>Clear</MopiensBeveledButton> },
    ]} />
  </div>;
}

function LmiHistory({ simulation }: { simulation: Dme320SimulationState }) {
  return <div className={styles.lmiPage}><MopiensTable caption="Latest LMI history" rows={[...simulation.logs].reverse().slice(0, 16)} dense emptyLabel="No equipment history" getRowId={(row) => `${row.sequence}`} rowTone={(row) => row.category === "alarm" ? "alarm" : row.category === "control" ? "info" : row.category === "maintenance" ? "warning" : undefined} columns={[
    { id: "time", label: "Time", width: "23%", render: (row) => new Date(row.timestampMs).toLocaleTimeString("en-GB", { hour12: false }) },
    { id: "class", label: "Class", width: "17%", render: (row) => formatStatus(row.category) },
    { id: "detail", label: "Detail", render: (row) => row.message },
    { id: "user", label: "User", width: "17%", render: (row) => row.userId },
  ]} /></div>;
}
