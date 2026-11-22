"use client";

import type { DmeDualValueRow, DmeIndicatorColor, DmePmdtData } from "@/lib/dme-types";
import { dmeRowSeverity } from "@/lib/dme1119a";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { DmeIndicator, dmeFieldMetadata } from "./screen-primitives";

const generalAlerts = [
  ["Local Mode", "RMS Power Supply Data", "RMS A/D Data", "RMS Digital I/O Data", "LCD Comm Link Failed"],
  ["LCU Bus Failure", "AC Power Failure", "Sys 48 VDC PS 1 Failure", "Sys 48 VDC PS 2 Failure", "Transfer Relay Failure"],
  ["LCU Config Mismatch", "Frequency Config Mismatch", "Integral Monitor Mismatch", "Standby Monitor Mismatch", "Standby Tx on the Air"],
] as const;

const monitorAlerts = [
  "RMS Comm Link Failed",
  "Mon-RTC Comm Link Failed",
  "Integrity Test Failed",
  "File System Fault",
  "Backplane Switch Mismatch",
  "Maintenance Alert",
  "Pre-Alarm",
  "Primary Alarm",
  "Secondary Alarm",
] as const;

type MonitorColumn = "monitor1" | "monitor2" | "rtc1" | "rtc2";

function monitorSeverity(data: DmePmdtData, rows: DmeDualValueRow[], monitor: 1 | 2, role?: "primary" | "secondary"): 0 | 1 | 2 {
  const statusKey = monitor === 1 ? "mon1Status" : "mon2Status";
  // Classification is per monitor path (Stage 4 G12): Monitor 1 reads the
  // integral pair, Monitor 2 the standby pair.
  const field = role === undefined
    ? null
    : monitor === 1
      ? (role === "primary" ? "integralPrimary" : "integralSecondary")
      : (role === "primary" ? "standbyPrimary" : "standbySecondary");
  const configured = field
    ? new Set(data.monitorConfigGeneral.filter((item) => item[field]).map((item) => item.parameter))
    : null;
  let severity: 0 | 1 | 2 = 0;
  for (const row of rows) {
    if (configured && !configured.has(row.label)) continue;
    const rowSeverity = dmeRowSeverity(row[statusKey]);
    if (rowSeverity > severity) severity = rowSeverity;
  }
  return severity;
}

function monitorMismatch(data: DmePmdtData, rows: DmeDualValueRow[]): boolean {
  return monitorSeverity(data, rows, 1) !== monitorSeverity(data, rows, 2);
}

function outOfRange(value: number, low: number, high: number): boolean {
  return value < low || value > high;
}

/**
 * RMS >> Data >> Maintenance Alerts/Alarms (manual §3.6.7.2.1).
 * Every indicator is derived from live simulator state (Stage 1 G09);
 * conditions the simulator does not model stay gray (unknown), never lit.
 */
export function RmsMaintenanceAlerts() {
  const data = useDmePmdtStore((state) => state.data);

  const psVoltageAlert = data.rmsVoltageData.some((row) => outOfRange(row.volts, row.low, row.high));
  const psCurrentAlert = data.rmsCurrentData.some((row) => outOfRange(row.amps, row.low, row.high));
  const adAlert = data.rmsAdData.some((row) => outOfRange(row.volts, row.low, row.high));
  const digitalIoAlert = data.digitalInputs.some((row) => row.status === "Alarm");
  const tx48Alert = (tx: "tx1" | "tx2"): boolean => {
    const row = data.rmsVoltageData.find((candidate) => candidate.parameter === (tx === "tx1" ? "Tx 1 48 V PS" : "Tx 2 48 V PS"));
    return row ? outOfRange(row.volts, row.low, row.high) : false;
  };
  const standbyTxId = data.monitorTransmitterStatus.antennaSelect === 1 ? "tx2" : "tx1";
  const standbyTxOnAir = data.monitorTransmitterStatus.transmitterOn[standbyTxId]
    && data.transmitters[standbyTxId].antenna === "green";

  const generalColors: Record<string, DmeIndicatorColor> = {
    "Local Mode": data.local ? "green" : "gray",
    "RMS Power Supply Data": psVoltageAlert || psCurrentAlert ? "yellow" : "gray",
    "RMS A/D Data": adAlert ? "yellow" : "gray",
    "RMS Digital I/O Data": digitalIoAlert ? "yellow" : "gray",
    "AC Power Failure": data.rmsStatus.acFailure ? "red" : "gray",
    "Sys 48 VDC PS 1 Failure": tx48Alert("tx1") ? "red" : "gray",
    "Sys 48 VDC PS 2 Failure": tx48Alert("tx2") ? "red" : "gray",
    "Integral Monitor Mismatch": monitorMismatch(data, data.integralData) ? "yellow" : "gray",
    "Standby Monitor Mismatch": monitorMismatch(data, data.standbyData) ? "yellow" : "gray",
    "Standby Tx on the Air": standbyTxOnAir ? "red" : "gray",
  };

  const monitorCell = (label: string, column: MonitorColumn): DmeIndicatorColor => {
    const monitor = column === "monitor1" || column === "rtc1" ? 1 : 2;
    const tx = column === "rtc1" || column === "monitor1" ? "tx1" : "tx2";
    const allRows = [...data.integralData, ...data.standbyData];
    switch (label) {
      case "Mon-RTC Comm Link Failed":
        return column === "rtc1" || column === "rtc2" ? (data.rtcStatus.commFault[tx] ? "red" : "gray") : "gray";
      case "Maintenance Alert":
        if (column === "rtc1" || column === "rtc2") return data.txStatus.maintenanceAlert[tx] ? "yellow" : "gray";
        return monitorSeverity(data, allRows, monitor) > 0 ? "yellow" : "gray";
      case "Pre-Alarm":
        if (column === "rtc1" || column === "rtc2") return "gray";
        return monitorSeverity(data, allRows, monitor) === 1 ? "yellow" : "gray";
      case "Primary Alarm":
        if (column === "rtc1" || column === "rtc2") return "gray";
        return monitorSeverity(data, allRows, monitor, "primary") === 2 ? "red" : "gray";
      case "Secondary Alarm":
        if (column === "rtc1" || column === "rtc2") return "gray";
        return monitorSeverity(data, allRows, monitor, "secondary") === 2 ? "yellow" : "gray";
      default:
        return "gray";
    }
  };

  const columns: MonitorColumn[] = ["monitor1", "monitor2", "rtc1", "rtc2"];

  return (
    <div className="dme-pmdt-maintenance-alerts">
      <fieldset>
        <legend>General Alerts and Alarms</legend>
        <div className="dme-pmdt-general-alert-grid">
          {generalAlerts.map((column, columnIndex) => (
            <div key={columnIndex}>
              {column.map((label, rowIndex) => {
                const color = generalColors[label] ?? "gray";
                return <div key={label} {...dmeFieldMetadata(`rmsGeneralAlerts.${columnIndex}.${rowIndex}`, label, false, color)}><DmeIndicator color={color} /><span>{label}</span></div>;
              })}
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Monitor/RTC Alerts and Alarms</legend>
        <table>
          <thead><tr><th /><th>Monitor 1</th><th>Monitor 2</th><th>RTC 1</th><th>RTC 2</th></tr></thead>
          <tbody>
            {monitorAlerts.map((label, rowIndex) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {columns.map((column, columnIndex) => {
                  const color = monitorCell(label, column);
                  return (
                    <td key={column} {...dmeFieldMetadata(`rmsMonitorAlerts.${rowIndex}.${columnIndex}`, `${label} column ${columnIndex + 1}`, false, color)}>
                      <DmeIndicator color={color} />
                      {(rowIndex === 1 || rowIndex === 2 || rowIndex === 3 || rowIndex === 4) && columnIndex > 0 ? <small>*</small> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>
      <p>* Indicates this parameter can disable a monitor</p>
    </div>
  );
}
