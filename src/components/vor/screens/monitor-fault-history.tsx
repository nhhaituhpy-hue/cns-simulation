"use client";

import { Fragment, useState } from "react";
import { PmdtToolbar } from "../pmdt-toolbar";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import type { DvorFaultEvent, DvorFaultSample } from "@/lib/dvor1150a/fault-history";
import type { VorIndicatorColor } from "@/lib/vor-types";

const faultLabels = [
  ["Azimuth", "°"], ["30 Hz Modulation", "%"], ["9960 Hz Modulation", "%"],
  ["9960 Hz Deviation", "Ratio"], ["RF Level", "dB"], ["Ident Modulation", "%"],
  ["Ident Status", ""], ["Ident Code", ""], ["Tx Power", "Watts"],
  ["Tx Frequency", "MHz"], ["Tx Frequency Error", "ppm"],
] as const;

function Indicator({ color }: { color: VorIndicatorColor }) {
  return <span className={`pmdt-monitor-fault-mark pmdt-monitor-fault-mark--${color}`}>{color === "green" ? "G" : color === "red" ? "R" : ""}</span>;
}

export function faultHistoryTimestamp(sample?: DvorFaultSample | null) {
  if (!sample || !Number.isFinite(Date.parse(sample.timestamp))) return "—";
  return new Date(sample.timestamp).toLocaleString("en-GB", {
    timeZone: "UTC", day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).replace(",", "");
}

function FaultIntegral({ monitor, events }: { monitor: "mon1" | "mon2"; events: DvorFaultEvent[] }) {
  const [selected, setSelected] = useState<DvorFaultEvent | null>(null);
  const index = Math.max(0, selected ? events.indexOf(selected) : 0);
  const event = events[index];
  const samples = [event?.prior[monitor], event?.alarm];
  const valueKey = monitor === "mon1" ? "mon1Value" : "mon2Value";
  const colorKey = monitor === "mon1" ? "mon1Status" : "mon2Status";
  return <div className="pmdt-monitor-fault-integral">
    <div className="pmdt-monitor-fault-history-header">
      <time>{faultHistoryTimestamp(samples[0])}</time><span>Prior to Alarm #{index + 1}</span>
      <time>{faultHistoryTimestamp(samples[1])}</time><span>Alarm #{index + 1}</span>
      <button type="button" disabled={events.length < 2} onClick={() => setSelected(events[(index + 1) % events.length])}>Older ==&gt;</button>
    </div>
    <table className="pmdt-monitor-fault-table" aria-label="Integral fault measurements">
      <colgroup><col className="pmdt-monitor-fault-label" /><col className="pmdt-monitor-fault-value" /><col className="pmdt-monitor-fault-unit" /><col className="pmdt-monitor-fault-value" /><col className="pmdt-monitor-fault-unit" /></colgroup>
      <thead><tr><th scope="col" /><th scope="col" colSpan={2}>Prior to Alarm #{index + 1}</th><th scope="col" colSpan={2}>Alarm #{index + 1}</th></tr></thead>
      <tbody>
        {faultLabels.map(([label, unit]) => <Fragment key={label}>
          {label === "Tx Power" ? <tr className="pmdt-monitor-fault-spacer" aria-hidden="true"><td colSpan={5} /></tr> : null}
          <tr><th scope="row">{label}</th>{samples.map((sample, column) => {
            const row = sample?.rows.find(item => item.label === label);
            return <Fragment key={column}>
              <td className={`pmdt-monitor-fault-live pmdt-monitor-fault-live--${row?.[colorKey] ?? "gray"}`}><span>{row?.[valueKey] ?? "—"}</span></td><td aria-hidden={column === 0 ? true : undefined}>{column === 1 ? unit : ""}</td>
            </Fragment>;
          })}</tr>
        </Fragment>)}
        <tr className="pmdt-monitor-fault-spacer pmdt-monitor-fault-spacer--sideband" aria-hidden="true"><td colSpan={5} /></tr>
        <tr><th scope="row">Sideband VSWR</th>{samples.map((sample, column) => {
          const faults = sample?.sidebandFaults[monitor];
          return <Fragment key={column}><td className={`pmdt-monitor-fault-live pmdt-monitor-fault-live--${!faults ? "gray" : faults.length ? "red" : "green"}`}><span>{faults ? faults.join(", ") || "None" : "—"}</span></td><td>{column === 1 ? "Ant. Faults" : " "}</td></Fragment>;
        })}</tr>
      </tbody>
    </table>
  </div>;
}

function LocalControlUnit({ events }: { events: DvorFaultEvent[] }) {
  const chronological = events.slice().reverse();
  const columns = [chronological[0], chronological[1], chronological[2]];
  return <div className="pmdt-monitor-fault-lcu">
    <table className="pmdt-monitor-fault-lcu-table" aria-label="Recorded Local Control Unit status">
      <thead><tr><th scope="col" />{columns.map((event, index) => <th scope="col" key={index}><time>{faultHistoryTimestamp(event?.alarm)}</time><span>Alarm #{index + 1}</span></th>)}</tr></thead>
      <tbody>
        <tr><th scope="row">Monitor Logic</th>{columns.map((event, index) => <td key={index}>{event?.lcu.logic ?? "—"}</td>)}</tr>
        {(["mon1", "mon2"] as const).map((id, monitor) => <tr key={id}><th scope="row">Monitor {monitor + 1} Enabled</th>{columns.map((event, index) => <td key={index}>{event ? <Indicator color={event.lcu.enabled[id] ? "green" : "gray"} /> : "—"}</td>)}</tr>)}
        <tr className="pmdt-monitor-fault-subheader"><th scope="row" />{columns.map((_, index) => <td key={index}>Integral</td>)}</tr>
        {(["primaryAlarm", "secondaryAlarm"] as const).map((key, row) => <tr key={key}><th scope="row">{row === 0 ? "Primary Alarm" : "Secondary Alarm"}</th>{columns.map((event, index) => <td key={index}>{event ? <Indicator color={event.lcu[key] ? "red" : "green"} /> : "—"}</td>)}</tr>)}
        <tr><th scope="row">Bypass</th>{columns.map((event, index) => <td key={index}>{event ? <Indicator color={event.lcu.bypass ? "yellow" : "gray"} /> : "—"}</td>)}</tr>
        {["Primary Mismatch", "Secondary Mismatch"].map(label => <tr key={label}><th scope="row">{label}</th>{columns.map((_, index) => <td key={index}>—</td>)}</tr>)}
      </tbody>
    </table>
    <fieldset className="pmdt-monitor-fault-transmitters"><legend>Transmitter</legend>
      <table><thead><tr><th scope="col" />{columns.flatMap((_, index) => [<th key={`${index}-1`}>Tx 1</th>, <th key={`${index}-2`}>Tx 2</th>])}</tr></thead><tbody>
        {["On Antenna", "Main", "On"].map(label => <tr key={label}><th scope="row">{label}</th>{columns.flatMap((event, index) => (["tx1", "tx2"] as const).map(id => {
          const active = event && (label === "Main" ? event.lcu.main === id : label === "On Antenna" ? event.lcu.antenna === id : event.lcu.on[id]);
          return <td key={`${index}-${id}`}>{event ? <Indicator color={active ? "green" : "gray"} /> : "—"}</td>;
        }))}</tr>)}
      </tbody></table>
    </fieldset>
  </div>;
}

export function MonitorFaultHistory() {
  const path = useVorPmdtStore(state => state.activeMenuPath);
  const events = useVorPmdtStore(state => state.faultHistory.events);
  const [tab, setTab] = useState("integral");
  const monitor = path[0] === "Monitor 2" ? "mon2" : "mon1";
  const number = monitor === "mon1" ? 1 : 2;
  return <section className="pmdt-monitor-fault-history flex min-h-full flex-col" aria-label={`Monitor ${number} Fault History`}>
    <PmdtToolbar title={`Monitor ${number} Fault History`} />
    <div className="pmdt-monitor-inner-tabs" role="tablist" aria-label="Monitor fault history tabs">
      <button type="button" role="tab" aria-selected={tab === "integral"} onClick={() => setTab("integral")}>Integral</button>
      <button type="button" role="tab" aria-selected={tab === "lcu"} onClick={() => setTab("lcu")}>Local Control Unit</button>
    </div>
    <div className="pmdt-monitor-fault-content">{tab === "integral" ? <FaultIntegral key={monitor} monitor={monitor} events={events} /> : <LocalControlUnit events={events} />}</div>
  </section>;
}
