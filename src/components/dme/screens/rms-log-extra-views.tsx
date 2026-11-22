"use client";

import { dmeOperationalAvailability } from "@/lib/dme1119a";
import type { DmeOperationalSummaryState } from "@/lib/dme-types";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";

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

const summaryRows: Array<{
  label: string;
  pick: (tx: DmeOperationalSummaryState["tx1"]) => number;
}> = [
  { label: "Normal Operation", pick: (tx) => tx.normalSeconds },
  { label: "Monitor Bypass", pick: (tx) => tx.bypassSeconds },
  { label: "Transmitter Off", pick: (tx) => tx.offSeconds },
  { label: "Monitor/RTC Comm Fault", pick: (tx) => tx.commFaultSeconds },
  { label: "Hot Standby", pick: (tx) => tx.standbySeconds },
];

function hours(seconds: number): string {
  return (seconds / 3600).toFixed(2);
}

/**
 * RMS >> Logs >> Operational Summary (manual §3.6.7.3.1). Values are the
 * real accumulators advanced by the PMDT clock tick (Stage 1 G10); Reset
 * zeroes them in the store, and Download exports the same live values.
 */
export function RmsOperationalSummary() {
  const summary = useDmePmdtStore((state) => state.operationalSummary);
  const timestamp = useDmePmdtStore((state) => state.data.timestamp);
  const resetOperationalSummary = useDmePmdtStore((state) => state.resetOperationalSummary);
  const availability1 = dmeOperationalAvailability(summary, "tx1").toFixed(4);
  const availability2 = dmeOperationalAvailability(summary, "tx2").toFixed(4);

  function downloadTrendData() {
    if (typeof window === "undefined") return;
    const lines = [
      ["Parameter", "Transmitter 1", "Transmitter 2", "Unit"],
      ...summaryRows.map(({ label, pick }) => [label, hours(pick(summary.tx1)), hours(pick(summary.tx2)), "Hours"]),
      ["Availability", availability1, availability2, "%"],
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
          {summaryRows.map(({ label, pick }) => (
            <tr key={label}><th scope="row">{label}</th><td>{hours(pick(summary.tx1))}</td><td>{hours(pick(summary.tx2))}</td><td>Hours</td></tr>
          ))}
          <tr className="dme-pmdt-summary-spacer"><td colSpan={4} /></tr>
          <tr><th scope="row">Availability</th><td>{availability1}</td><td>{availability2}</td><td>%</td></tr>
        </tbody>
      </table>

      <div className="dme-pmdt-summary-period">
        <dl>
          <div><dt>Start Time</dt><dd>{summary.startedAt ?? "—"}</dd></div>
          <div><dt>End Time</dt><dd>{timestamp}</dd></div>
          <div><dt>Hours Elapsed</dt><dd>{(summary.elapsedSeconds / 3600).toFixed(4)}</dd></div>
        </dl>
        <button type="button" onClick={resetOperationalSummary} disabled={summary.elapsedSeconds <= 0}>Reset Operational Summary</button>
      </div>

      <button type="button" className="dme-pmdt-download-button" onClick={downloadTrendData}>Download Trend Data</button>
    </div>
  );
}

/** RMS >> Logs >> Command Activity (manual §3.6.7.3.4): the store's recorded command history, newest first. */
export function RmsCommandActivity() {
  const logs = useDmePmdtStore((state) => state.commandActivityLogs);
  return <ActivityTable rows={logs.map((entry) => [entry.timeTag, entry.userName, entry.command] as const)} thirdColumn="Command" />;
}

export function RmsParameterChange() {
  const rows = useDmePmdtStore((state) => state.parameterChangeLogs);

  return (
    <div className="dme-pmdt-log-scroll">
      <table className="dme-pmdt-log-table">
        <caption className="sr-only">Parameter change activity log</caption>
        <thead><tr><th>Time Tag</th><th>User Name</th><th>File</th><th>Parameter</th><th>State</th></tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={row.id}>
            <td>{row.timeTag}</td>
            <td>{row.userName}</td>
            <td>{row.file}</td>
            <td>{row.parameter}</td>
            <td>{row.state === "normal" ? "Normal" : row.state === "warning" ? "Alert Low" : "Alarm"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
