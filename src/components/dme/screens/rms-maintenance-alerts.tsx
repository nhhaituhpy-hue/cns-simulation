"use client";

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

export function RmsMaintenanceAlerts() {
  return (
    <div className="dme-pmdt-maintenance-alerts">
      <fieldset>
        <legend>General Alerts and Alarms</legend>
        <div className="dme-pmdt-general-alert-grid">
          {generalAlerts.map((column, columnIndex) => (
            <div key={columnIndex}>
              {column.map((label, rowIndex) => <div key={label} {...dmeFieldMetadata(`rmsGeneralAlerts.${columnIndex}.${rowIndex}`, label, false, "gray")}><DmeIndicator color="gray" /><span>{label}</span></div>)}
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
                {[0, 1, 2, 3].map((columnIndex) => (
                  <td key={columnIndex} {...dmeFieldMetadata(`rmsMonitorAlerts.${rowIndex}.${columnIndex}`, `${label} column ${columnIndex + 1}`, false, "gray")}>
                    <DmeIndicator color="gray" />
                    {(rowIndex === 1 || rowIndex === 2 || rowIndex === 3 || rowIndex === 4) && columnIndex > 0 ? <small>*</small> : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>
      <p>* Indicates this parameter can disable a monitor</p>
    </div>
  );
}
