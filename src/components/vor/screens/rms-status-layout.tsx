"use client";

import type { VorIndicatorColor, VorRmsMonitorStatusRow } from "@/lib/vor-types";
import { resolveVorField, resolveVorStatus, useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";

const statusLabels: Record<VorIndicatorColor, string> = {
  green: "Normal",
  yellow: "Warning",
  red: "Alarm",
  gray: "Inactive",
};

function StatusMark({
  fieldId,
  label,
  value,
  activeColor = "green",
}: {
  fieldId: string;
  label: string;
  value: boolean;
  activeColor?: VorIndicatorColor;
}) {
  const overrides = useVorPmdtStore((state) => state.overrides);
  const resolved = resolveVorField(value, fieldId, overrides);
  const color = resolveVorStatus(resolved ? activeColor : "gray", fieldId, overrides);
  return (
    <span
      data-vor-field-id={fieldId}
      data-vor-field-value={String(resolved)}
      data-vor-field-label={label}
      data-vor-field-type="boolean"
      className={`pmdt-rms-status-mark pmdt-rms-status-mark--${color}`}
      title={`${label}: ${statusLabels[color]}`}
      aria-label={`${label}: ${statusLabels[color]}`}
    >
      {color === "green" ? "G" : color === "yellow" ? "Y" : color === "red" ? "R" : ""}
    </span>
  );
}

function StatusRow({
  fieldId,
  label,
  value,
  activeColor = "green",
}: {
  fieldId: string;
  label: string;
  value: boolean;
  activeColor?: VorIndicatorColor;
}) {
  return (
    <div className="pmdt-rms-status-row">
      <StatusMark fieldId={fieldId} label={label} value={value} activeColor={activeColor} />
      <span>{label}</span>
    </div>
  );
}

function RmsVorStatus() {
  const status = useVorPmdtStore((state) => state.data.rmsStatus);

  return (
    <div className="pmdt-rms-status-vor">
      <fieldset>
        <legend>System</legend>
        <div className="pmdt-rms-status-level-row">
          <span>PMDT Logon Level</span>
          <output data-vor-field-id="rmsStatus.logonLevel" aria-label="PMDT Logon Level">{status.logonLevel}</output>
        </div>
        <StatusRow fieldId="rmsStatus.localControlMode" label="Local Control Mode" value={status.localControlMode} />
        <StatusRow fieldId="rmsStatus.maintenanceAlert" label="Maintenance Alert" value={status.maintenanceAlert} activeColor="yellow" />
        <StatusRow fieldId="rmsStatus.onBattery" label="On Battery" value={status.onBattery} activeColor="yellow" />
        <StatusRow fieldId="rmsStatus.acFailure" label="AC Failure" value={status.acFailure} activeColor="red" />
        <StatusRow fieldId="rmsStatus.remoteControlEnabled" label="Remote Control Enabled" value={status.remoteControlEnabled} />
        <StatusRow fieldId="rmsStatus.groundCheckRunning" label="Ground Check Running" value={status.groundCheckRunning} activeColor="yellow" />
        <StatusRow fieldId="rmsStatus.holdCommutatorEnabled" label="Hold Commutator Enabled" value={status.holdCommutatorEnabled} activeColor="yellow" />
      </fieldset>
      <fieldset>
        <legend>RCSU Connection</legend>
        <StatusRow fieldId="rmsStatus.rcsuConnectionEnabled" label="RCSU Connection Enabled" value={status.rcsuConnectionEnabled} />
        <StatusRow fieldId="rmsStatus.rcsuCommunicationError" label="RCSU Communication Error" value={status.rcsuCommunicationError} activeColor="red" />
      </fieldset>
    </div>
  );
}

const monitorColumns = [
  { key: "bypass", label: "Bypass" },
  { key: "primaryAlarm", label: "Primary Alarm" },
  { key: "secondaryAlarm", label: "Secondary Alarm" },
  { key: "primaryMismatch", label: "Primary Mismatch" },
  { key: "secondaryMismatch", label: "Secondary Mismatch" },
] as const;

function MonitorTransmitterStatus() {
  const data = useVorPmdtStore((state) => state.data);
  const status = data.rmsMonitorTransmitterStatus;

  return (
    <div className="pmdt-rms-monitor-tx-status">
      <div className="pmdt-rms-monitor-status-top">
        <fieldset className="pmdt-rms-monitor-status-table-box">
          <legend>Monitors</legend>
          <table>
            <thead>
              <tr>
                <th scope="col" />
                {monitorColumns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {status.monitors.map((row: VorRmsMonitorStatusRow, index) => (
                <tr key={row.name}>
                  <th scope="row">{row.name}</th>
                  {monitorColumns.map((column) => (
                    <td key={column.key}>
                      <StatusMark
                        fieldId={`rmsMonitorTransmitterStatus.monitors.${index}.${column.key}`}
                        label={`${row.name} ${column.label}`}
                        value={row[column.key]}
                        activeColor="red"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>
        <fieldset className="pmdt-rms-enabled-monitors">
          <legend>Enabled Monitors</legend>
          <StatusRow fieldId="rmsMonitorTransmitterStatus.enabledMonitors.monitor1" label="Monitor 1" value={status.enabledMonitors.monitor1} />
          <StatusRow fieldId="rmsMonitorTransmitterStatus.enabledMonitors.monitor2" label="Monitor 2" value={status.enabledMonitors.monitor2} />
        </fieldset>
        <div className="pmdt-rms-monitor-shutdown">
          <StatusMark fieldId="rmsMonitorTransmitterStatus.monitorAlarmShutdown" label="Monitor Alarm Shutdown" value={status.monitorAlarmShutdown} activeColor="red" />
          <span>Monitor Alarm Shutdown</span>
        </div>
      </div>

      <fieldset className="pmdt-rms-transmitter-selects">
        <legend>Transmitters</legend>
        <div className="pmdt-rms-select-groups">
          <fieldset>
            <legend>Antenna Select</legend>
            {[1, 2].map((tx) => (
              <div className="pmdt-rms-select-row" key={tx}>
                <StatusMark fieldId="rmsMonitorTransmitterStatus.antennaSelect" label={`Antenna Select Tx ${tx}`} value={status.antennaSelect === tx} />
                <span>Tx {tx}</span>
              </div>
            ))}
          </fieldset>
          <fieldset>
            <legend>Main Select</legend>
            {[1, 2].map((tx) => (
              <div className="pmdt-rms-select-row" key={tx}>
                <StatusMark fieldId="rmsMonitorTransmitterStatus.mainSelect" label={`Main Select Tx ${tx}`} value={status.mainSelect === tx} />
                <span>Tx {tx}</span>
              </div>
            ))}
          </fieldset>
          <fieldset>
            <legend>Transmitter On</legend>
            {(["tx1", "tx2"] as const).map((tx, index) => (
              <div className="pmdt-rms-select-row" key={tx}>
                <StatusMark fieldId={`rmsMonitorTransmitterStatus.transmitterOn.${tx}`} label={`Transmitter ${index + 1} On`} value={status.transmitterOn[tx]} />
                <span>Tx {index + 1}</span>
              </div>
            ))}
          </fieldset>
        </div>
      </fieldset>
    </div>
  );
}

function RmsSoftwareRevisions() {
  const rows = useVorPmdtStore((state) => state.data.softwareRevisions);
  return (
    <div className="pmdt-rms-revisions">
      <fieldset>
        <legend>Software Revision Levels</legend>
        <table>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.component}>
                <th scope="row">{row.component}</th>
                <td data-vor-field-id={`softwareRevisions.${index}.revision`}>{row.revision}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>
    </div>
  );
}

function RmsHardwareRevisions() {
  const rows = useVorPmdtStore((state) => state.data.hardwareRevisions);
  const timestamp = useVorPmdtStore((state) => state.data.rmsStatus.hardwareRevisionTimestamp);
  return (
    <div className="pmdt-rms-hardware-revisions">
      <div className="pmdt-rms-hardware-actions">
        <time className="pmdt-monitor-date">{timestamp}</time>
        <button type="button">Refresh</button>
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col">Module</th>
            <th scope="col">Part Number</th>
            <th scope="col">Revision</th>
            <th scope="col">Serial Number</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.module}>
              <th scope="row">{row.module}</th>
              <td data-vor-field-id={`hardwareRevisions.${index}.partNumber`}>{row.partNumber}</td>
              <td data-vor-field-id={`hardwareRevisions.${index}.revision`}>{row.revision}</td>
              <td data-vor-field-id={`hardwareRevisions.${index}.serialNumber`}>{row.serialNumber}</td>
              <td>{row.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RmsStatusLayout() {
  const activeView = useVorPmdtStore((state) => state.activeView);
  const openView = useVorPmdtStore((state) => state.openView);
  const timestamp = useVorPmdtStore((state) => state.data.timestamp);
  const softwareTimestamp = useVorPmdtStore((state) => state.data.rmsStatus.softwareRevisionTimestamp);
  const tabs = [
    { id: "vor", label: "VOR Status", viewId: "rms-status-main" as const },
    { id: "monitor-tx", label: "Monitor/Transmitter Status", viewId: "rms-status-monitor-tx" as const },
    { id: "software", label: "Software Revisions", viewId: "rms-status-software" as const },
    { id: "hardware", label: "Hardware Revisions", viewId: "rms-status-hardware" as const },
  ];

  return (
    <section className="pmdt-rms-status flex min-h-full flex-col" aria-label="RMS Status">
      <PmdtToolbar title="RMS Status" />
      <div className="pmdt-rms-status-tabbar" role="tablist" aria-label="RMS Status tabs">
        {tabs.map((tab) => {
          const active = tab.viewId === activeView;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => openView("rms-status", tab.viewId, ["RMS", "Status", tab.label], tab.label)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="pmdt-rms-status-content min-h-0 flex-1 overflow-auto">
        {activeView === "rms-status-monitor-tx" ? (
          <>
            <time className="pmdt-monitor-date">{timestamp}</time>
            <MonitorTransmitterStatus />
          </>
        ) : null}
        {activeView === "rms-status-software" ? (
          <>
            <time className="pmdt-monitor-date">{softwareTimestamp}</time>
            <RmsSoftwareRevisions />
          </>
        ) : null}
        {activeView === "rms-status-hardware" ? <RmsHardwareRevisions /> : null}
        {activeView !== "rms-status-monitor-tx" && activeView !== "rms-status-software" && activeView !== "rms-status-hardware" ? (
          <>
            <time className="pmdt-monitor-date">{timestamp}</time>
            <RmsVorStatus />
          </>
        ) : null}
      </div>
    </section>
  );
}
