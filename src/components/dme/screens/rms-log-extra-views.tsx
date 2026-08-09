"use client";

import { useState } from "react";

const operationalRows = [
  ["Normal Operation", "26846.52", "28121.55"],
  ["Monitor Bypass", "0.32", "0.37"],
  ["Transmitter Off", "42.37", "41.46"],
  ["Monitor/RTC Comm Fault", "0.07", "0.07"],
  ["Hot Standby", "28121.00", "26846.84"],
] as const;

const commandRows = [
  ["08/09/26 09:09:42", "RCSU", "Remote RMS Logon"],
  ["08/09/26 06:49:40", "RCSU", "RMS Logoff"],
  ["08/09/26 06:30:24", "RCSU", "Remote RMS Logon"],
  ["08/08/26 18:48:07", "RCSU", "RMS Logoff"],
  ["08/08/26 18:33:00", "RCSU", "Remote RMS Logon"],
  ["08/08/26 13:20:15", "RCSU", "RMS Logoff"],
  ["08/08/26 13:19:04", "RCSU", "Remote RMS Logon"],
  ["08/08/26 08:00:48", "RCSU", "RMS Logoff"],
  ["08/08/26 07:45:33", "RCSU", "Remote RMS Logon"],
  ["08/08/26 07:44:58", "RCSU", "RMS Logoff"],
  ["08/08/26 07:42:16", "RCSU", "Remote RMS Logon"],
  ["08/08/26 07:19:23", "RCSU", "RMS Logoff"],
  ["08/06/26 18:29:23", "RCSU", "Remote RMS Logon"],
  ["08/06/26 18:23:26", "RCSU", "RMS Logoff"],
] as const;

const parameterRows = [
  ["04/28/25 20:20:55", "SEC3", "RMS Configuration"],
  ["04/28/25 16:46:31", "SEC3", "RMS Configuration"],
  ["04/27/25 23:04:31", "SEC3", "RMS Configuration"],
  ["04/27/25 13:35:58", "SEC3", "RMS Configuration"],
  ["04/26/25 21:43:13", "SEC3", "RMS Configuration"],
  ["04/26/25 16:21:22", "SEC3", "RMS Configuration"],
  ["02/05/25 06:51:58", "RCSU", "Nominal Monitor Limits"],
  ["02/05/25 06:51:57", "RCSU", "Monitor Configuration"],
  ["08/24/23 16:38:49", "RCSU", "Monitor #2 Offsets and Scale Factors"],
  ["08/24/23 16:38:12", "RCSU", "Monitor #1 Offsets and Scale Factors"],
  ["08/02/23 18:51:01", "RCSU", "Monitor #1 Offsets and Scale Factors"],
  ["06/01/21 15:48:03", "RCSU", "RTC #2 Offsets and Scale Factors"],
  ["06/01/21 15:48:02", "RCSU", "RTC #1 Offsets and Scale Factors"],
  ["06/01/21 15:47:59", "RCSU", "Monitor Configuration"],
  ["06/01/21 15:47:58", "RCSU", "RMS A/D Limits"],
] as const;

function ActivityTable({
  rows,
  thirdColumn,
}: {
  rows: readonly (readonly [string, string, string])[];
  thirdColumn: string;
}) {
  return (
    <div className="dme-pmdt-log-scroll">
      <table className="dme-pmdt-log-table">
        <caption className="sr-only">{thirdColumn} activity log</caption>
        <thead>
          <tr>
            <th>Time Tag</th>
            <th>User Name</th>
            <th>{thirdColumn}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([timeTag, userName, activity], index) => (
            <tr key={`${timeTag}-${index}`}>
              <td>{timeTag}</td>
              <td>{userName}</td>
              <td>{activity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RmsOperationalSummary() {
  const [reset, setReset] = useState(false);
  const displayedRows = reset
    ? operationalRows.map(([label]) => [label, "0.00", "0.00"] as const)
    : operationalRows;

  function downloadTrendData() {
    if (typeof window === "undefined") return;
    const lines = [
      ["Parameter", "Transmitter 1", "Transmitter 2", "Unit"],
      ...displayedRows.map(([label, tx1, tx2]) => [label, tx1, tx2, "Hours"]),
      ["Availability", reset ? "0.0000" : "99.7907", reset ? "0.0000" : "99.7923", "%"],
    ];
    const csv = lines.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dme-1119a-operational-summary.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="dme-pmdt-operational-summary">
      <table>
        <caption className="sr-only">Transmitter operational summary</caption>
        <thead>
          <tr><th /><th>Transmitter 1</th><th>Transmitter 2</th><th /></tr>
        </thead>
        <tbody>
          {displayedRows.map(([label, tx1, tx2]) => (
            <tr key={label}><th scope="row">{label}</th><td>{tx1}</td><td>{tx2}</td><td>Hours</td></tr>
          ))}
          <tr className="dme-pmdt-summary-spacer"><td colSpan={4} /></tr>
          <tr><th scope="row">Availability</th><td>{reset ? "0.0000" : "99.7907"}</td><td>{reset ? "0.0000" : "99.7923"}</td><td>%</td></tr>
        </tbody>
      </table>

      <div className="dme-pmdt-summary-period">
        <dl>
          <div><dt>Start Time</dt><dd>04/27/20 06:23:09</dd></div>
          <div><dt>End Time</dt><dd>08/09/26 09:11:15</dd></div>
          <div><dt>Hours Elapsed</dt><dd>55082.8017</dd></div>
        </dl>
        <button type="button" onClick={() => setReset(true)} disabled={reset}>Reset Operational Summary</button>
      </div>

      <button type="button" className="dme-pmdt-download-button" onClick={downloadTrendData}>Download Trend Data</button>
    </div>
  );
}

export function RmsCommandActivity() {
  return <ActivityTable rows={commandRows} thirdColumn="Command" />;
}

export function RmsParameterChange() {
  return <ActivityTable rows={parameterRows} thirdColumn="File" />;
}
