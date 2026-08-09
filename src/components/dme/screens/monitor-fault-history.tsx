"use client";

import { useState } from "react";
import { withAssignedDmeMeasurements } from "@/lib/dme1119a";
import type { DmeDualValueRow, DmeIndicatorColor } from "@/lib/dme-types";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { DmeIndicator } from "./screen-primitives";

type FaultTab = "integral" | "standby" | "lcu" | "trend";

const snapshots = [
  { timestamp: "02/04/25 21:59:31", label: "Pre-Alarm" },
  { timestamp: "02/04/25 21:59:32", label: "Alarm" },
  { timestamp: "07/04/24 11:53:48", label: "Alarm" },
  { timestamp: "07/04/24 10:37:56", label: "Alarm" },
] as const;

const faultIntegralRows: DmeDualValueRow[] = [
  { label: "Delay", mon1Value: "49.99", mon1Status: "normal", mon2Value: "49.99", mon2Status: "normal", unit: "us" },
  { label: "Spacing", mon1Value: "11.98", mon1Status: "normal", mon2Value: "11.98", mon2Status: "normal", unit: "us" },
  { label: "Tx Power", mon1Value: "1003", mon1Status: "normal", mon2Value: "1003", mon2Status: "normal", unit: "Watts" },
  { label: "ERP", mon1Value: "0.0", mon1Status: "normal", mon2Value: "0.0", mon2Status: "normal", unit: "dB" },
  { label: "Efficiency", mon1Value: "70.1", mon1Status: "warning", mon2Value: "64.4", mon2Status: "alarm", unit: "%" },
  { label: "PRF", mon1Value: "777", mon1Status: "normal", mon2Value: "777", mon2Status: "normal", unit: "ppps" },
  { label: "Tx Frequency", mon1Value: "1203.996", mon1Status: "gray", mon2Value: "1203.996", mon2Status: "gray", unit: "MHz" },
  { label: "Tx Frequency Error", mon1Value: "-2", mon1Status: "normal", mon2Value: "-2", mon2Status: "normal", unit: "ppm" },
  { label: "Rx LO Frequency", mon1Value: "1015.991", mon1Status: "gray", mon2Value: "1015.991", mon2Status: "gray", unit: "MHz" },
  { label: "Rx LO Frequency Error", mon1Value: "2", mon1Status: "normal", mon2Value: "2", mon2Status: "normal", unit: "ppm" },
  { label: "Rx Frequency", mon1Value: "1140.991", mon1Status: "gray", mon2Value: "1140.991", mon2Status: "gray", unit: "MHz" },
  { label: "VSWR", mon1Value: "1.3", mon1Status: "normal", mon2Value: "1.3", mon2Status: "normal", unit: ":1" },
  { label: "Ident Status", mon1Value: "Normal", mon1Status: "green", mon2Value: "Normal", mon2Status: "green", unit: "" },
  { label: "Ident Code", mon1Value: "TUH", mon1Status: "green", mon2Value: "TUH", mon2Status: "green", unit: "" },
];

const faultStandbyRows: DmeDualValueRow[] = [
  { label: "Delay", mon1Value: "50.01", mon1Status: "normal", mon2Value: "50.01", mon2Status: "normal", unit: "us" },
  { label: "Spacing", mon1Value: "11.99", mon1Status: "normal", mon2Value: "11.99", mon2Status: "normal", unit: "us" },
  { label: "Tx Power", mon1Value: "945", mon1Status: "normal", mon2Value: "945", mon2Status: "normal", unit: "Watts" },
  { label: "ERP", mon1Value: "0.0", mon1Status: "normal", mon2Value: "0.0", mon2Status: "normal", unit: "dB" },
  { label: "Efficiency", mon1Value: "72.8", mon1Status: "warning", mon2Value: "66.1", mon2Status: "alarm", unit: "%" },
  { label: "PRF", mon1Value: "807", mon1Status: "normal", mon2Value: "807", mon2Status: "normal", unit: "ppps" },
  { label: "Tx Frequency", mon1Value: "1203.996", mon1Status: "gray", mon2Value: "1203.996", mon2Status: "gray", unit: "MHz" },
  { label: "Tx Frequency Error", mon1Value: "-2", mon1Status: "normal", mon2Value: "-2", mon2Status: "normal", unit: "ppm" },
  { label: "Rx LO Frequency", mon1Value: "1015.982", mon1Status: "gray", mon2Value: "1015.982", mon2Status: "gray", unit: "MHz" },
  { label: "Rx LO Frequency Error", mon1Value: "-7", mon1Status: "normal", mon2Value: "-7", mon2Status: "normal", unit: "ppm" },
  { label: "Rx Frequency", mon1Value: "1140.982", mon1Status: "gray", mon2Value: "1140.982", mon2Status: "gray", unit: "MHz" },
  { label: "VSWR", mon1Value: "1.3", mon1Status: "normal", mon2Value: "1.3", mon2Status: "normal", unit: ":1" },
  { label: "Ident Status", mon1Value: "Normal", mon1Status: "green", mon2Value: "Normal", mon2Status: "green", unit: "" },
  { label: "Ident Code", mon1Value: "?", mon1Status: "warning", mon2Value: "?", mon2Status: "warning", unit: "" },
];

function alarmSnapshot(row: DmeDualValueRow, snapshotIndex: number): { value: string; color: DmeIndicatorColor } {
  if (snapshotIndex === 0) return { value: row.mon1Value, color: row.mon1Status === "alarm" ? "red" : row.mon1Status === "warning" ? "yellow" : row.mon1Status === "gray" ? "gray" : "green" };
  if (snapshotIndex === 1) return { value: row.mon2Value, color: row.mon2Status === "alarm" ? "red" : row.mon2Status === "warning" ? "yellow" : row.mon2Status === "gray" ? "gray" : "green" };
  if (["Delay", "Spacing", "Tx Power", "ERP"].includes(row.label)) {
    const values: Record<string, string> = { Delay: "0.00", Spacing: "0.00", "Tx Power": snapshotIndex === 2 ? "613" : "649", ERP: snapshotIndex === 2 ? "-2.1" : "-1.1" };
    return { value: values[row.label], color: "red" };
  }
  if (row.label === "Efficiency") return { value: snapshotIndex === 2 ? "64.4" : "0.0", color: "red" };
  if (row.label === "Ident Status") return { value: "Normal", color: "green" };
  if (row.label === "Ident Code") return { value: "?", color: "yellow" };
  return { value: row.mon1Value, color: "green" };
}

function FaultDataTable({ rows, kind, station }: { rows: DmeDualValueRow[]; kind: "Integral" | "Standby"; station: { channelNumber: number; channelType: "X" | "Y" } }) {
  const assignedRows = withAssignedDmeMeasurements(rows, station);
  return (
    <div className="dme-pmdt-fault-data">
      <table>
        <thead>
          <tr>
            <th scope="col" />
            {snapshots.map((snapshot) => <th key={`${snapshot.timestamp}-${snapshot.label}`} scope="col"><time>{snapshot.timestamp}</time><span>{snapshot.label}</span></th>)}
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {assignedRows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {snapshots.map((snapshot, index) => {
                const state = alarmSnapshot(row, index);
                return <td key={`${snapshot.timestamp}-${row.label}`}><span className={`dme-pmdt-fault-value dme-pmdt-fault-value--${state.color}`}>{state.value}</span></td>;
              })}
              <td>{row.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="dme-pmdt-fault-footer">
        <span aria-hidden />
        {snapshots.slice(1).map((snapshot) => (
          <fieldset key={snapshot.timestamp}><legend>Failed LRUs</legend><output>No Fault Found</output></fieldset>
        ))}
        <span className="dme-pmdt-fault-history-label">{kind} history</span>
      </div>
    </div>
  );
}

function LocalControlUnit() {
  const data = useDmePmdtStore((state) => state.data);
  return (
    <div className="dme-pmdt-fault-lcu">
      <table>
        <thead><tr><th scope="col" />{snapshots.slice(1).map((snapshot) => <th key={snapshot.timestamp} scope="col"><time>{snapshot.timestamp}</time><span>{snapshot.label}</span></th>)}</tr></thead>
        <tbody>
          <tr><th scope="row">Monitor Logic</th>{snapshots.slice(1).map((snapshot) => <td key={snapshot.timestamp}>AND</td>)}</tr>
          <tr><th scope="row">Monitor 1 Enabled</th>{snapshots.slice(1).map((snapshot) => <td key={snapshot.timestamp}><DmeIndicator color={data.monitorTransmitterStatus.enabledMonitors.monitor1 ? "green" : "gray"} /></td>)}</tr>
          <tr><th scope="row">Monitor 2 Enabled</th>{snapshots.slice(1).map((snapshot) => <td key={snapshot.timestamp}><DmeIndicator color={data.monitorTransmitterStatus.enabledMonitors.monitor2 ? "green" : "gray"} /></td>)}</tr>
          <tr className="dme-pmdt-fault-subheading"><th scope="row" />{snapshots.slice(1).map((snapshot) => <td key={snapshot.timestamp}>Integral / Standby</td>)}</tr>
          <tr><th scope="row">Primary Alarm</th>{snapshots.slice(1).map((snapshot, index) => <td key={snapshot.timestamp}><DmeIndicator color={index === 0 ? "green" : "red"} /></td>)}</tr>
          <tr><th scope="row">Secondary Alarm</th>{snapshots.slice(1).map((snapshot) => <td key={snapshot.timestamp}><DmeIndicator color="yellow" /></td>)}</tr>
          <tr><th scope="row">Bypass</th>{snapshots.slice(1).map((snapshot) => <td key={snapshot.timestamp}><DmeIndicator color="gray" /></td>)}</tr>
          <tr><th scope="row">Primary Mismatch</th>{snapshots.slice(1).map((snapshot) => <td key={snapshot.timestamp}><DmeIndicator color="yellow" /></td>)}</tr>
          <tr><th scope="row">Secondary Mismatch</th>{snapshots.slice(1).map((snapshot) => <td key={snapshot.timestamp}><DmeIndicator color="gray" /></td>)}</tr>
        </tbody>
      </table>
      <fieldset className="dme-pmdt-fault-transmitter"><legend>Transmitter</legend><div><span>On Antenna</span><DmeIndicator color="green" /><DmeIndicator color="gray" /><DmeIndicator color="green" /><DmeIndicator color="gray" /><DmeIndicator color="green" /><DmeIndicator color="gray" /></div><div><span>Main</span><DmeIndicator color="green" /><DmeIndicator color="gray" /><DmeIndicator color="green" /><DmeIndicator color="gray" /><DmeIndicator color="green" /><DmeIndicator color="gray" /></div><div><span>On</span><DmeIndicator color="green" /><DmeIndicator color="green" /><DmeIndicator color="green" /><DmeIndicator color="green" /><DmeIndicator color="green" /><DmeIndicator color="green" /></div></fieldset>
      <div className="dme-pmdt-fault-lcu-failed">
        <span aria-hidden />
        {snapshots.slice(1).map((snapshot) => (
          <fieldset className="dme-pmdt-failed-lrus" key={snapshot.timestamp}><legend>Failed LRUs</legend><output>No Fault Found</output></fieldset>
        ))}
      </div>
    </div>
  );
}

function TrendData({ station }: { station: { channelNumber: number; channelType: "X" | "Y" } }) {
  const [currentRecord, setCurrentRecord] = useState(1);
  const availableTrendRecords = 20;
  const integralRows = withAssignedDmeMeasurements(faultIntegralRows, station);
  const standbyRows = withAssignedDmeMeasurements(faultStandbyRows, station);
  const rows = integralRows.map((integral, index) => ({ integral, standby: standbyRows[index] }));
  const priorIndex = currentRecord - 1;
  const alarmIndex = currentRecord;
  const trendSnapshot = (index: number) => {
    const source = snapshots[Math.min(index, snapshots.length - 1)];
    return index < snapshots.length
      ? source
      : { timestamp: `Trend record ${index + 1}`, label: "Alarm" };
  };
  const priorSnapshot = trendSnapshot(priorIndex);
  const alarmSnapshotHeader = trendSnapshot(alarmIndex);
  return (
    <div className="dme-pmdt-fault-trend">
      <table>
        <thead>
          <tr><th scope="col" rowSpan={3} /><th scope="col" colSpan={2}>Integral</th><th scope="col" colSpan={2}>Standby</th><th scope="col" rowSpan={3} /></tr>
          <tr>
            {[priorSnapshot, alarmSnapshotHeader].map((snapshot, index) => <th scope="col" key={`integral-${snapshot.timestamp}-${index}`}><time>{snapshot.timestamp}</time></th>)}
            {[priorSnapshot, alarmSnapshotHeader].map((snapshot, index) => <th scope="col" key={`standby-${snapshot.timestamp}-${index}`}><time>{snapshot.timestamp}</time></th>)}
          </tr>
          <tr><th>{priorSnapshot.label}</th><th>{alarmSnapshotHeader.label}</th><th>{priorSnapshot.label}</th><th>{alarmSnapshotHeader.label}</th></tr>
        </thead>
        <tbody>
          {rows.map(({ integral, standby }) => (
            <tr key={integral.label}>
              <th scope="row">{integral.label}</th>
              {[ 
                alarmSnapshot(integral, priorIndex),
                alarmSnapshot(integral, alarmIndex),
                alarmSnapshot(standby, priorIndex),
                alarmSnapshot(standby, alarmIndex),
              ].map((state, index) => {
                return <td key={`${integral.label}-${index}`}><span className={`dme-pmdt-fault-value dme-pmdt-fault-value--${state.color}`}>{state.value}</span></td>;
              })}
              <td>{integral.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="dme-pmdt-trend-footer">
        <fieldset className="dme-pmdt-failed-lrus"><legend>Failed LRUs</legend><output>No Fault Found</output></fieldset>
        <div className="dme-pmdt-trend-controls">
          <button type="button" disabled={currentRecord <= 1} onClick={() => setCurrentRecord((value) => Math.max(1, value - 1))}>&lt;= Newer</button>
          <button type="button" disabled={currentRecord >= availableTrendRecords} onClick={() => setCurrentRecord((value) => Math.min(availableTrendRecords, value + 1))}>Older =&gt;</button>
          <span>Available Trend Records: {availableTrendRecords}, Current: {currentRecord}</span>
        </div>
      </div>
    </div>
  );
}

export function MonitorFaultHistory() {
  const activeMenuPath = useDmePmdtStore((state) => state.activeMenuPath);
  const station = useDmePmdtStore((state) => state.data.rmsConfigStation);
  const [tab, setTab] = useState<FaultTab>("integral");
  const monitorNumber = activeMenuPath[0] === "Monitor 2" ? 2 : 1;

  return (
    <section className="dme-screen dme-pmdt-fault-history flex min-h-full flex-col" aria-label={`Monitor ${monitorNumber} Fault History`}>
      <PmdtToolbar title={`Monitor ${monitorNumber} Fault History`} />
      <div className="dme-pmdt-inner-tabs" role="tablist" aria-label="Monitor fault history tabs">
        {(["integral", "standby", "lcu", "trend"] as const).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>
            {item === "lcu" ? "Local Control Unit" : item === "trend" ? "Trend Data" : item === "integral" ? "Integral" : "Standby"}
          </button>
        ))}
      </div>
      <div className="dme-pmdt-fault-content">
        {tab === "integral" ? <FaultDataTable rows={faultIntegralRows} kind="Integral" station={station} /> : null}
        {tab === "standby" ? <FaultDataTable rows={faultStandbyRows} kind="Standby" station={station} /> : null}
        {tab === "lcu" ? <LocalControlUnit /> : null}
        {tab === "trend" ? <TrendData station={station} /> : null}
      </div>
    </section>
  );
}
