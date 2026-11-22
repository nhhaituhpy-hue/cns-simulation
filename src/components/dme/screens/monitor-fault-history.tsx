"use client";

import { useState, type ReactNode } from "react";
import type {
  DmeDualValueRow,
  DmeFaultHistorySnapshot,
  DmeIndicatorColor,
} from "@/lib/dme-types";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { DmeIndicator } from "./screen-primitives";

type FaultTab = "integral" | "standby" | "lcu" | "trend";

function statusColor(status: DmeDualValueRow["mon1Status"]): DmeIndicatorColor {
  if (status === "alarm" || status === "red") return "red";
  if (status === "warning" || status === "yellow") return "yellow";
  if (status === "gray") return "gray";
  return "green";
}

function cellFor(rows: DmeDualValueRow[], label: string, monitor: 1 | 2): { value: string; color: DmeIndicatorColor } {
  const row = rows.find((candidate) => candidate.label === label);
  if (!row) return { value: "", color: "gray" };
  return monitor === 1
    ? { value: row.mon1Value, color: statusColor(row.mon1Status) }
    : { value: row.mon2Value, color: statusColor(row.mon2Status) };
}

function EmptyFaultHistory({ label }: { label: string }) {
  return (
    <div className="dme-pmdt-fault-data">
      <p className="dme-pmdt-fault-empty">No faults recorded this session.</p>
      <div className="dme-pmdt-fault-footer">
        <span aria-hidden />
        <fieldset><legend>Failed LRUs</legend><output>No Fault Found</output></fieldset>
        <span className="dme-pmdt-fault-history-label">{label} history</span>
      </div>
    </div>
  );
}

/**
 * Monitor n >> Fault History (manual §3.6.9.3): the last 3 recorded faults
 * with a Pre-Alarm (last-good) column and one Alarm column per fault.
 * Snapshots are recorded live by the store (Stage 1 G01); recorded values
 * are shown exactly as captured, never re-based to the current channel.
 */
function FaultDataTable({ faults, kind, monitor }: { faults: DmeFaultHistorySnapshot[]; kind: "Integral" | "Standby"; monitor: 1 | 2 }) {
  if (faults.length === 0) return <EmptyFaultHistory label={kind} />;
  const columns = [
    { key: "pre", timeTag: faults[0].timeTag, label: "Pre-Alarm", rows: faults[0].preAlarmRows },
    ...faults.map((fault) => ({ key: fault.id, timeTag: fault.timeTag, label: "Alarm", rows: fault.alarmRows })),
  ];
  const template = faults[0].alarmRows;
  return (
    <div className="dme-pmdt-fault-data">
      <table>
        <thead>
          <tr>
            <th scope="col" />
            {columns.map((column) => <th key={column.key} scope="col"><time>{column.timeTag}</time><span>{column.label}</span></th>)}
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {template.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {columns.map((column) => {
                const cell = cellFor(column.rows, row.label, monitor);
                return <td key={column.key}><span className={`dme-pmdt-fault-value dme-pmdt-fault-value--${cell.color}`}>{cell.value}</span></td>;
              })}
              <td>{row.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="dme-pmdt-fault-footer">
        <span aria-hidden />
        {faults.map((fault) => (
          <fieldset key={fault.id}><legend>Alarming Parameters</legend><output>{fault.parameters.join(", ")}</output></fieldset>
        ))}
        <span className="dme-pmdt-fault-history-label">{kind} history</span>
      </div>
    </div>
  );
}

function LocalControlUnit({ faults }: { faults: DmeFaultHistorySnapshot[] }) {
  if (faults.length === 0) return <EmptyFaultHistory label="Local Control Unit" />;
  const boolColor = (active: boolean, color: DmeIndicatorColor): DmeIndicatorColor => (active ? color : "gray");
  const rows: Array<{ label: string; render: (fault: DmeFaultHistorySnapshot) => ReactNode }> = [
    { label: "Monitor Logic", render: (fault) => fault.lcu.votingLogic },
    { label: "Monitor 1 Enabled", render: (fault) => <DmeIndicator color={boolColor(fault.lcu.monitor1Enabled, "green")} /> },
    { label: "Monitor 2 Enabled", render: (fault) => <DmeIndicator color={boolColor(fault.lcu.monitor2Enabled, "green")} /> },
    { label: "Integral Primary Alarm", render: (fault) => <DmeIndicator color={boolColor(fault.lcu.integral.priAlarm, "red")} /> },
    { label: "Integral Secondary Alarm", render: (fault) => <DmeIndicator color={boolColor(fault.lcu.integral.secAlarm, "yellow")} /> },
    { label: "Integral Bypass", render: (fault) => <DmeIndicator color={boolColor(fault.lcu.integral.bypass, "yellow")} /> },
    { label: "Standby Primary Alarm", render: (fault) => <DmeIndicator color={boolColor(fault.lcu.standby.priAlarm, "red")} /> },
    { label: "Standby Secondary Alarm", render: (fault) => <DmeIndicator color={boolColor(fault.lcu.standby.secAlarm, "yellow")} /> },
    { label: "Standby Bypass", render: (fault) => <DmeIndicator color={boolColor(fault.lcu.standby.bypass, "yellow")} /> },
    { label: "On Antenna", render: (fault) => `TX${fault.lcu.antennaSelect}` },
    { label: "Main", render: (fault) => `TX${fault.lcu.mainSelect}` },
    { label: "Transmitter 1 On", render: (fault) => <DmeIndicator color={boolColor(fault.lcu.transmitterOn.tx1, "green")} /> },
    { label: "Transmitter 2 On", render: (fault) => <DmeIndicator color={boolColor(fault.lcu.transmitterOn.tx2, "green")} /> },
  ];
  return (
    <div className="dme-pmdt-fault-lcu">
      <table>
        <thead><tr><th scope="col" />{faults.map((fault) => <th key={fault.id} scope="col"><time>{fault.timeTag}</time><span>Alarm</span></th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}><th scope="row">{row.label}</th>{faults.map((fault) => <td key={fault.id}>{row.render(fault)}</td>)}</tr>
          ))}
        </tbody>
      </table>
      <div className="dme-pmdt-fault-lcu-failed">
        <span aria-hidden />
        {faults.map((fault) => (
          <fieldset className="dme-pmdt-failed-lrus" key={fault.id}><legend>Alarming Parameters</legend><output>{fault.parameters.join(", ")}</output></fieldset>
        ))}
      </div>
    </div>
  );
}

function TrendData({ faults, monitor }: { faults: DmeFaultHistorySnapshot[]; monitor: 1 | 2 }) {
  const [currentRecord, setCurrentRecord] = useState(1);
  const availableTrendRecords = faults.length;
  if (availableTrendRecords === 0) {
    return (
      <div className="dme-pmdt-fault-trend">
        <p className="dme-pmdt-fault-empty">No faults recorded this session.</p>
        <div className="dme-pmdt-trend-footer">
          <fieldset className="dme-pmdt-failed-lrus"><legend>Failed LRUs</legend><output>No Fault Found</output></fieldset>
          <div className="dme-pmdt-trend-controls">
            <span>Available Trend Records: 0, Current: 0</span>
          </div>
        </div>
      </div>
    );
  }
  const index = Math.min(currentRecord, availableTrendRecords) - 1;
  const fault = faults[index];
  const columns = [
    { key: "pre", label: "Pre-Alarm", rows: fault.preAlarmRows },
    { key: "alarm", label: "Alarm", rows: fault.alarmRows },
  ];
  return (
    <div className="dme-pmdt-fault-trend">
      <table>
        <thead>
          <tr><th scope="col" rowSpan={2} /><th scope="col" colSpan={2}>{fault.path === "integral" ? "Integral" : "Standby"} — {fault.timeTag}</th><th scope="col" rowSpan={2} /></tr>
          <tr><th>Pre-Alarm</th><th>Alarm</th></tr>
        </thead>
        <tbody>
          {fault.alarmRows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {columns.map((column) => {
                const cell = cellFor(column.rows, row.label, monitor);
                return <td key={column.key}><span className={`dme-pmdt-fault-value dme-pmdt-fault-value--${cell.color}`}>{cell.value}</span></td>;
              })}
              <td>{row.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="dme-pmdt-trend-footer">
        <fieldset className="dme-pmdt-failed-lrus"><legend>Alarming Parameters</legend><output>{fault.parameters.join(", ")}</output></fieldset>
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
  const faultHistory = useDmePmdtStore((state) => state.faultHistory);
  const [tab, setTab] = useState<FaultTab>("integral");
  const monitorNumber = activeMenuPath[0] === "Monitor 2" ? 2 : 1;
  const monitorFaults = faultHistory.filter((fault) => fault.monitor === monitorNumber);
  const pathFaults = (path: "integral" | "standby") => monitorFaults.filter((fault) => fault.path === path).slice(0, 3);

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
        {tab === "integral" ? <FaultDataTable faults={pathFaults("integral")} kind="Integral" monitor={monitorNumber} /> : null}
        {tab === "standby" ? <FaultDataTable faults={pathFaults("standby")} kind="Standby" monitor={monitorNumber} /> : null}
        {tab === "lcu" ? <LocalControlUnit faults={monitorFaults.slice(0, 3)} /> : null}
        {tab === "trend" ? <TrendData faults={monitorFaults} monitor={monitorNumber} /> : null}
      </div>
    </section>
  );
}
