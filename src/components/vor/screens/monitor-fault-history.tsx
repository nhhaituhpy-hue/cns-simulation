"use client";

import { Fragment, useState } from "react";
import { PmdtToolbar } from "../pmdt-toolbar";
import type { VorIndicatorColor } from "@/lib/vor-types";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

type FaultTab = "integral" | "lcu";

const faultLabels = [
  ["Azimuth", "°"],
  ["30 Hz Modulation", "%"],
  ["9960 Hz Modulation", "%"],
  ["9960 Hz Deviation", "Ratio"],
  ["RF Level", "dB"],
  ["Ident Modulation", "%"],
  ["Ident Status", ""],
  ["Ident Code", ""],
  ["Tx Power", "Watts"],
  ["Tx Frequency", "MHz"],
  ["Tx Frequency Error", "ppm"],
] as const;

function Indicator({ color }: { color: VorIndicatorColor }) {
  return <span className={`pmdt-monitor-fault-mark pmdt-monitor-fault-mark--${color}`}>{color === "green" ? "G" : color === "red" ? "R" : ""}</span>;
}

function FaultIntegral({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const data = useVorPmdtStore((state) => state.data);
  const valueKey = monitorNumber === 1 ? "mon1Value" : "mon2Value";
  const prior = new Map(data.integralData.map((row) => [row.label, row[valueKey]]));
  const alarmValues: Record<string, { value: string; color: VorIndicatorColor }> = {
    Azimuth: { value: "249.20", color: "green" },
    "30 Hz Modulation": { value: "0.0", color: "red" },
    "9960 Hz Modulation": { value: "0.0", color: "red" },
    "9960 Hz Deviation": { value: "0.00", color: "red" },
    "RF Level": { value: "-96.2", color: "red" },
    "Ident Modulation": { value: "7.2", color: "green" },
    "Ident Status": { value: "No Ident", color: "red" },
    "Ident Code": { value: "TUH", color: "green" },
    "Tx Power": { value: "1.4", color: "red" },
    "Tx Frequency": { value: "0.0000", color: "red" },
    "Tx Frequency Error": { value: "<= -50", color: "red" },
  };

  return (
    <div className="pmdt-monitor-fault-integral">
      <div className="pmdt-monitor-fault-history-header">
        <time>01/10/26 13:30:00</time>
        <span>Prior to Alarm #1</span>
        <time>01/10/26 13:30:00</time>
        <span>Alarm #1</span>
        <button type="button">Older ==&gt;</button>
      </div>
      <table className="pmdt-monitor-fault-table">
        <colgroup><col className="pmdt-monitor-fault-label" /><col className="pmdt-monitor-fault-value" /><col className="pmdt-monitor-fault-unit" /><col className="pmdt-monitor-fault-value" /><col className="pmdt-monitor-fault-unit" /></colgroup>
        <thead><tr><th scope="col" /><th scope="col" colSpan={2}>Prior to Alarm #1</th><th scope="col" colSpan={2}>Alarm #1</th></tr></thead>
        <tbody>
          {faultLabels.map(([label, unit]) => {
            const alarm = alarmValues[label];
            return (
              <Fragment key={label}>
                {label === "Tx Power" ? <tr className="pmdt-monitor-fault-spacer" aria-hidden="true"><td colSpan={5} /></tr> : null}
                <tr>
                  <th scope="row">{label}</th>
                  <td className="pmdt-monitor-fault-live"><span>{prior.get(label) ?? ""}</span></td>
                  <td>{unit}</td>
                  <td className={`pmdt-monitor-fault-live pmdt-monitor-fault-live--${alarm.color}`}><span>{alarm.value}</span></td>
                  <td>{unit}</td>
                </tr>
              </Fragment>
            );
          })}
          <tr className="pmdt-monitor-fault-spacer pmdt-monitor-fault-spacer--sideband" aria-hidden="true"><td colSpan={5} /></tr>
          <tr>
            <th scope="row">Sideband VSWR</th>
            <td className="pmdt-monitor-fault-live"><span>None</span></td><td> </td>
            <td className="pmdt-monitor-fault-live"><span>None</span></td><td>Ant. Faults</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function LocalControlUnit() {
  const status = useVorPmdtStore((state) => state.data.rmsMonitorTransmitterStatus);
  const monitorLogic = useVorPmdtStore((state) => state.config.monitor.votingLogic);
  const alarmColumns = ["Alarm #1", "Alarm #2", "Alarm #3"] as const;

  return (
    <div className="pmdt-monitor-fault-lcu">
      <table className="pmdt-monitor-fault-lcu-table">
        <thead>
          <tr><th scope="col" /><th scope="col"><time>01/10/26 13:29:17</time><span>Alarm #1</span></th><th scope="col"><time>01/10/26 13:29:39</time><span>Alarm #2</span></th><th scope="col"><time>01/10/26 13:30:00</time><span>Alarm #3</span></th></tr>
        </thead>
        <tbody>
          <tr><th scope="row">Monitor Logic</th>{alarmColumns.map((column) => <td key={column}>{monitorLogic}</td>)}</tr>
          <tr><th scope="row">Monitor 1 Enabled</th>{alarmColumns.map((column) => <td key={column}><Indicator color={status.enabledMonitors.monitor1 ? "green" : "gray"} /></td>)}</tr>
          <tr><th scope="row">Monitor 2 Enabled</th>{alarmColumns.map((column) => <td key={column}><Indicator color={status.enabledMonitors.monitor2 ? "green" : "gray"} /></td>)}</tr>
          <tr className="pmdt-monitor-fault-subheader"><th scope="row" /><td>Integral</td><td>Integral</td><td>Integral</td></tr>
          <tr><th scope="row">Primary Alarm</th>{alarmColumns.map((column) => <td key={column}><Indicator color="red" /></td>)}</tr>
          <tr><th scope="row">Secondary Alarm</th>{alarmColumns.map((column) => <td key={column}><Indicator color="green" /></td>)}</tr>
          <tr><th scope="row">Bypass Mismatch</th>{alarmColumns.map((column) => <td key={column}><Indicator color="gray" /></td>)}</tr>
          <tr><th scope="row">Primary Mismatch</th>{alarmColumns.map((column) => <td key={column}><Indicator color="gray" /></td>)}</tr>
          <tr><th scope="row">Secondary Mismatch</th>{alarmColumns.map((column) => <td key={column}><Indicator color="gray" /></td>)}</tr>
        </tbody>
      </table>

      <fieldset className="pmdt-monitor-fault-transmitters">
        <legend>Transmitter</legend>
        <table>
          <thead><tr><th scope="col" /><th>Tx 1</th><th>Tx 2</th><th>Tx 1</th><th>Tx 2</th><th>Tx 1</th><th>Tx 2</th></tr></thead>
          <tbody>
            <tr><th scope="row">On Antenna</th><td><Indicator color="gray" /></td><td><Indicator color="green" /></td><td><Indicator color="gray" /></td><td><Indicator color="green" /></td><td><Indicator color="gray" /></td><td><Indicator color="green" /></td></tr>
            <tr><th scope="row">Main</th><td><Indicator color="gray" /></td><td><Indicator color="green" /></td><td><Indicator color="gray" /></td><td><Indicator color="green" /></td><td><Indicator color="gray" /></td><td><Indicator color="green" /></td></tr>
            <tr><th scope="row">On</th><td><Indicator color="gray" /></td><td><Indicator color="gray" /></td><td><Indicator color="gray" /></td><td><Indicator color="gray" /></td><td><Indicator color="gray" /></td><td><Indicator color="gray" /></td></tr>
          </tbody>
        </table>
      </fieldset>
    </div>
  );
}

export function MonitorFaultHistory() {
  const activeMenuPath = useVorPmdtStore((state) => state.activeMenuPath);
  const [tab, setTab] = useState<FaultTab>("integral");
  const monitorNumber = activeMenuPath[0] === "Monitor 2" ? 2 : 1;

  return (
    <section className="pmdt-monitor-fault-history flex min-h-full flex-col" aria-label={`Monitor ${monitorNumber} Fault History`}>
      <PmdtToolbar title={`Monitor ${monitorNumber} Fault History`} />
      <div className="pmdt-monitor-inner-tabs" role="tablist" aria-label="Monitor fault history tabs">
        <button type="button" role="tab" aria-selected={tab === "integral"} onClick={() => setTab("integral")}>Integral</button>
        <button type="button" role="tab" aria-selected={tab === "lcu"} onClick={() => setTab("lcu")}>Local Control Unit</button>
      </div>
      <div className="pmdt-monitor-fault-content">
        {tab === "integral" ? <FaultIntegral monitorNumber={monitorNumber} /> : <LocalControlUnit />}
      </div>
    </section>
  );
}
