"use client";

import type { DmeIndicatorColor } from "@/lib/dme-types";
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

function RmsStatusMain() {
  const data = useDmePmdtStore((state) => state.data);
  const revisionRows = [
    ["RMS", data.revisionLevels.rms, "5", "46", "21"],
    ["Monitor 1", data.revisionLevels.monitor1, "1", "27", "1"],
    ["Monitor 2", data.revisionLevels.monitor2, "1", "27", "1"],
    ["RTC 1", data.revisionLevels.rtc1, "1", "20", "1"],
    ["RTC 2", data.revisionLevels.rtc2, "1", "20", "1"],
    ["BCPS 1", data.revisionLevels.bcps1, "86", "56", "0"],
    ["BCPS 2", data.revisionLevels.bcps2, "86", "56", "0"],
    ["LCU", data.revisionLevels.lcu, "", "", ""],
  ] as const;

  return (
    <div className="dme-pmdt-rms-status-content">
      <time className="dme-pmdt-screen-time">{data.timestamp}</time>
      <div className="dme-pmdt-rms-status-main">
        <div>
          <fieldset>
            <legend>System</legend>
            <div className="dme-pmdt-rms-readout"><span>PMDT Logon Level</span><DmeValueCell fieldId="rmsStatus.logonLevel" label="PMDT Logon Level" value={data.rmsStatus.logonLevel} status="gray" /></div>
            <div className="dme-pmdt-rms-readout"><span>User Sessions</span><output>1</output></div>
            <div className="dme-pmdt-rms-readout"><span>Audio Select</span><output>TX{data.rmsStatus.audioSelect === "tx1" ? "1" : "2"}</output></div>
            <div className="dme-pmdt-rms-readout"><span>System Fan</span><output>{data.rmsStatus.fanControl}</output></div>
            <StatusFlag fieldId="rmsStatus.localControlMode" label="Local Control Mode" value={data.rmsStatus.localControlMode} />
            <StatusFlag fieldId="rmsStatus.maintenanceAlert" label="Maintenance Alert" value={data.rmsStatus.maintenanceAlert} activeColor="yellow" />
            <StatusFlag fieldId="rmsStatus.onBattery" label="On Battery" value={data.rmsStatus.onBattery} activeColor="yellow" />
            <StatusFlag fieldId="rmsStatus.acFailure" label="AC Failure" value={data.rmsStatus.acFailure} activeColor="red" />
            <StatusFlag fieldId="rmsStatus.remoteControlEnabled" label="Remote Control Enabled" value={data.rmsStatus.remoteControlEnabled} />
            <StatusFlag fieldId="rmsStatus.interlocked" label="Interlocked Off" value={data.rmsStatus.interlocked} activeColor="red" />
            <StatusFlag fieldId="rmsStatus.trendDataFlashBusy" label="Trend Data Flash Busy" value={false} activeColor="yellow" />
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
          <tbody>{revisionRows.map(([name, revision, ram, flash, nvram]) => <tr key={name}><th scope="row">{name}</th><td>{revision}</td><td>{ram}</td><td>{flash}</td><td>{nvram}</td></tr>)}</tbody>
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
