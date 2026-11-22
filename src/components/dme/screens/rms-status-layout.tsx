"use client";

import { useEffect, useState } from "react";
import type { DmeIndicatorColor } from "@/lib/dme-types";
import {
  DME_FLASH_WRITE_BUSY_MS,
  deriveDmeRmsResourceUtilization,
  deriveDmeUserSessions,
  dmeFlashWriteBusy,
  type DmeRmsResourceKey,
} from "@/lib/dme1119a/rms-resources";
import {
  resolveDmeField,
  resolveDmeStatus,
  useDmePmdtStore,
} from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import {
  DmeIndicator,
  DmeValueCell,
  ScreenTabs,
  dmeFieldMetadata,
} from "./screen-primitives";

function StatusFlag({
  fieldId,
  label,
  value,
  activeColor = "green",
}: {
  fieldId: string;
  label: string;
  value: boolean;
  activeColor?: DmeIndicatorColor;
}) {
  const overrides = useDmePmdtStore((state) => state.overrides);
  const resolved = resolveDmeField(value, fieldId, overrides);
  const status = resolveDmeStatus(resolved ? activeColor : "gray", fieldId, overrides);
  return (
    <div {...dmeFieldMetadata(fieldId, label, resolved, status)} className="dme-pmdt-rms-status-row">
      <DmeIndicator color={status} />
      <span>{label}</span>
    </div>
  );
}

const NO_SPECIAL_TEST_TARGETS: readonly (1 | 2)[] = [];

function RmsStatusMain() {
  const data = useDmePmdtStore((state) => state.data);
  const faultHistory = useDmePmdtStore((state) => state.faultHistory);
  const diagnosticsActive = useDmePmdtStore((state) => state.diagnosticsRunning || state.diagnosticsRunState !== null);
  const specialTestTargets = useDmePmdtStore((state) => state.specialTestRun?.targets ?? NO_SPECIAL_TEST_TARGETS);
  const selfCalibrationRuns = useDmePmdtStore((state) => state.selfCalibrationRuns);
  const hasSavedConfiguration = useDmePmdtStore((state) => state.savedConfiguration !== null);
  const hasBackupConfiguration = useDmePmdtStore((state) => state.configurationBackup !== null);
  const configDirty = useDmePmdtStore((state) => state.configDirty);
  const flashWriteAtMs = useDmePmdtStore((state) => state.flashWriteAtMs);
  // Stage 4 G19: utilization, sessions and flash-busy are derived from
  // live state (see src/lib/dme1119a/rms-resources.ts), never literals.
  const utilization = deriveDmeRmsResourceUtilization({
    alarmLogEntries: data.alarmLogs.length,
    maintenanceLogEntries: data.maintenanceLogs.length,
    faultSnapshotsByMonitor: {
      monitor1: faultHistory.filter((snapshot) => snapshot.monitor === 1).length,
      monitor2: faultHistory.filter((snapshot) => snapshot.monitor === 2).length,
    },
    diagnosticsActive,
    specialTestTargets,
    selfCalibrationMonitors: ([1, 2] as const).filter((monitor) => selfCalibrationRuns[monitor === 1 ? "monitor1" : "monitor2"].running),
    hasSavedConfiguration,
    hasBackupConfiguration,
    configDirty,
    onBattery: data.rmsStatus.onBattery,
  });
  const userSessions = deriveDmeUserSessions({
    connected: data.connected,
    logonLevel: data.rmsStatus.logonLevel,
    rcsuConnectionEnabled: data.rmsStatus.rcsuConnectionEnabled,
  });
  // Tick while a flash write is recent so the busy flag clears on its own.
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    if (flashWriteAtMs === null) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 500);
    const stop = window.setTimeout(() => window.clearInterval(timer), DME_FLASH_WRITE_BUSY_MS + 1000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stop);
    };
  }, [flashWriteAtMs]);
  const flashBusy = dmeFlashWriteBusy(nowMs, flashWriteAtMs);
  const revisionRows: Array<[string, string, DmeRmsResourceKey]> = [
    ["RMS", data.revisionLevels.rms, "rms"],
    ["Monitor 1", data.revisionLevels.monitor1, "monitor1"],
    ["Monitor 2", data.revisionLevels.monitor2, "monitor2"],
    ["RTC 1", data.revisionLevels.rtc1, "rtc1"],
    ["RTC 2", data.revisionLevels.rtc2, "rtc2"],
    ["BCPS 1", data.revisionLevels.bcps1, "bcps1"],
    ["BCPS 2", data.revisionLevels.bcps2, "bcps2"],
    ["LCU", data.revisionLevels.lcu, "lcu"],
  ];

  return (
    <div className="dme-pmdt-rms-status-content">
      <time className="dme-pmdt-screen-time">{data.timestamp}</time>
      <div className="dme-pmdt-rms-status-main">
        <div>
          <fieldset>
            <legend>System</legend>
            <div className="dme-pmdt-rms-readout"><span>PMDT Logon Level</span><DmeValueCell fieldId="rmsStatus.logonLevel" label="PMDT Logon Level" value={data.rmsStatus.logonLevel} status="gray" /></div>
            <div className="dme-pmdt-rms-readout"><span>User Sessions</span><output>{userSessions}</output></div>
            <div className="dme-pmdt-rms-readout"><span>Audio Select</span><output>TX{data.rmsStatus.audioSelect === "tx1" ? "1" : "2"}</output></div>
            <div className="dme-pmdt-rms-readout"><span>System Fan</span><output>{data.rmsStatus.fanControl}</output></div>
            <StatusFlag fieldId="rmsStatus.localControlMode" label="Local Control Mode" value={data.rmsStatus.localControlMode} />
            <StatusFlag fieldId="rmsStatus.maintenanceAlert" label="Maintenance Alert" value={data.rmsStatus.maintenanceAlert} activeColor="yellow" />
            <StatusFlag fieldId="rmsStatus.onBattery" label="On Battery" value={data.rmsStatus.onBattery} activeColor="yellow" />
            <StatusFlag fieldId="rmsStatus.acFailure" label="AC Failure" value={data.rmsStatus.acFailure} activeColor="red" />
            <StatusFlag fieldId="rmsStatus.remoteControlEnabled" label="Remote Control Enabled" value={data.rmsStatus.remoteControlEnabled} />
            <StatusFlag fieldId="rmsStatus.interlocked" label="Interlocked Off" value={data.rmsStatus.interlocked} activeColor="red" />
            <StatusFlag fieldId="rmsStatus.trendDataFlashBusy" label="Trend Data Flash Busy" value={flashBusy} activeColor="yellow" />
          </fieldset>
          <fieldset>
            <legend>RCSU Connection</legend>
            <StatusFlag fieldId="rmsStatus.rcsuConnectionEnabled" label="RCSU Connection Enabled" value={data.rmsStatus.rcsuConnectionEnabled} />
            <StatusFlag fieldId="rmsStatus.rcsuCommunicationError" label="RCSU Communication Error" value={data.rmsStatus.rcsuCommunicationError} activeColor="red" />
            <div className="dme-pmdt-rms-readout"><span>Approach Type</span><DmeValueCell fieldId="rmsStatus.approachType" label="Approach Type" value={data.rmsStatus.approachType} status="gray" /></div>
          </fieldset>
        </div>
        <table className="dme-pmdt-rms-revision-table">
          <caption className="sr-only">Revision and resource utilization</caption>
          <colgroup><col /><col /><col /><col /><col /></colgroup>
          <thead>
            <tr className="dme-pmdt-rms-resource-heading"><th /><th /><th colSpan={3}>Resource Utilization (%)</th></tr>
            <tr><th /><th>Revision</th><th>RAM</th><th>Flash</th><th>NVRAM</th></tr>
          </thead>
          <tbody>{revisionRows.map(([name, revision, key]) => { const usage = utilization[key]; return <tr key={name}><th scope="row">{name}</th><td>{revision}</td><td>{usage.ram ?? ""}</td><td>{usage.flash ?? ""}</td><td>{usage.nvram ?? ""}</td></tr>; })}</tbody>
        </table>
      </div>
    </div>
  );
}

function SelectionRows({
  label,
  selected,
}: {
  label: string;
  selected: 1 | 2;
}) {
  return (
    <fieldset className="dme-pmdt-rms-selection">
      <legend>{label}</legend>
      <div><DmeIndicator color={selected === 1 ? "green" : "gray"} /><span>Tx 1</span></div>
      <div><DmeIndicator color={selected === 2 ? "green" : "gray"} /><span>Tx 2</span></div>
    </fieldset>
  );
}

function MonitorTransmitterStatus() {
  const data = useDmePmdtStore((state) => state.data);
  const status = data.monitorTransmitterStatus;
  const monitorColumns = ["Bypass", "Primary Alarm", "Secondary Alarm", "Primary Mismatch", "Secondary Mismatch"] as const;
  return (
    <div className="dme-pmdt-rms-monitor-content">
      <time className="dme-pmdt-screen-time">{data.timestamp}</time>
      <div className="dme-pmdt-rms-monitor-top">
        <fieldset>
          <legend>Monitors</legend>
          <table>
            <thead><tr><th />{monitorColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {(["integral", "standby"] as const).map((monitor) => (
                <tr key={monitor}>
                  <th scope="row">{monitor === "integral" ? "Integral" : "Standby"}</th>
                  <td><DmeIndicator color={data.monitors[monitor].bypass ? "yellow" : "gray"} /></td>
                  <td><DmeIndicator color={data.monitors[monitor].priAlarm ? "red" : "gray"} /></td>
                  <td><DmeIndicator color={data.monitors[monitor].secAlarm ? "yellow" : "gray"} /></td>
                  <td><DmeIndicator color="gray" /></td>
                  <td><DmeIndicator color="gray" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>
        <StatusFlag fieldId="monitorTransmitterStatus.monitorAlarmShutdown" label="Monitor Alarm Shutdown" value={status.monitorAlarmShutdown} activeColor="red" />
        <fieldset className="dme-pmdt-enabled-monitors">
          <legend>Enabled Monitors</legend>
          <div><DmeIndicator color={status.enabledMonitors.monitor1 ? "green" : "gray"} /><span>Monitor 1</span></div>
          <div><DmeIndicator color={status.enabledMonitors.monitor2 ? "green" : "gray"} /><span>Monitor 2</span></div>
        </fieldset>
      </div>
      <fieldset className="dme-pmdt-rms-transmitter-status">
        <legend>Transmitters</legend>
        <SelectionRows label="Antenna Select" selected={status.antennaSelect} />
        <SelectionRows label="Main Select" selected={status.mainSelect} />
        <fieldset className="dme-pmdt-rms-selection">
          <legend>Transmitter On</legend>
          <div><DmeIndicator color={status.transmitterOn.tx1 ? "green" : "gray"} /><span>Tx 1</span></div>
          <div><DmeIndicator color={status.transmitterOn.tx2 ? "green" : "gray"} /><span>Tx 2</span></div>
        </fieldset>
      </fieldset>
    </div>
  );
}

export function RmsStatusLayout() {
  const activeView = useDmePmdtStore((state) => state.activeView);
  const openView = useDmePmdtStore((state) => state.openView);
  return (
    <section className="dme-pmdt-rms-status flex min-h-full flex-col" aria-label="RMS Status">
      <PmdtToolbar title="RMS Status" />
      <ScreenTabs tabs={[
        { id: "rms-status-main", label: "RMS Status", active: activeView === "rms-status-main", onSelect: () => openView("rms-status", "rms-status-main", ["RMS", "Status", "RMS Status"], "RMS Status") },
        { id: "rms-status-monitor-tx", label: "Monitor/Transmitter Status", active: activeView === "rms-status-monitor-tx", onSelect: () => openView("rms-status", "rms-status-monitor-tx", ["RMS", "Status", "Monitor/Transmitter Status"], "Monitor/Transmitter Status") },
      ]} />
      <div className="min-h-0 flex-1 overflow-auto">
        {activeView === "rms-status-monitor-tx" ? <MonitorTransmitterStatus /> : <RmsStatusMain />}
      </div>
    </section>
  );
}
