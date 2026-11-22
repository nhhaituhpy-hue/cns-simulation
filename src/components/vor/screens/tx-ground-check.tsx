"use client";

import { useState } from "react";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import type { DvorMonitorId, DvorTransmitterId } from "@/lib/dvor1150a/config-types";
import { groundCheckAzimuths } from "@/lib/dvor1150a/engine";
import {
  GROUND_CHECK_DURATION_SECONDS,
  groundCheckGraphSeries,
  groundCheckResultCsv,
  groundCheckResultText,
  type DvorGroundCheckGraphMode,
} from "@/lib/dvor1150a/ground-check";
import { monitorTestTimestamp } from "./monitor-test-results";
import { printPmdtText } from "../pmdt-file-commands";

const seriesColors: Record<string, string> = {
  "Station Error": "#ff00ff",
  Quadrantal: "#6c6",
  Octantal: "#66c",
  Bias: "#f0c",
};

function seriesClass(label: string): string {
  if (label === "Quadrantal") return "pmdt-ground-trace--quadrantal";
  if (label === "Octantal") return "pmdt-ground-trace--octantal";
  if (label === "Bias") return "pmdt-ground-trace--bias";
  return "";
}

function pointXY(value: number, index: number, count: number): [number, number] {
  const halfScale = 2;
  const x = count <= 1 ? 0 : (index / (count - 1)) * 540;
  const y = 160 - (Math.max(-halfScale, Math.min(halfScale, value)) / halfScale) * 120;
  return [x, y];
}

function graphPoints(values: readonly number[]): string {
  return values.map((value, index) => {
    const [x, y] = pointXY(value, index, values.length);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function GroundCheckTable({ title, headers, rows, footer }: { title: string; headers: string[]; rows: string[][]; footer?: string[] }) {
  return (
    <fieldset className="pmdt-ground-table-panel">
      <legend>{title}</legend>
      <table>
        <thead><tr>{headers.map((header, cell) => <th key={`${title}-header-${cell}`} scope="col">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={`${title}-${index}`}>{row.map((value, cell) => <td key={`${index}-${cell}`} className={cell === row.length - 1 ? "pmdt-ground-unit-cell" : undefined}>{cell === row.length - 1 ? value : <span className="pmdt-ground-readout">{value}</span>}</td>)}</tr>)}</tbody>
        {footer ? <tfoot><tr>{footer.map((value, cell) => <td key={`footer-${cell}`} className={cell === footer.length - 1 ? "pmdt-ground-unit-cell" : undefined}>{cell === footer.length - 1 ? value : <span className="pmdt-ground-readout">{value}</span>}</td>)}</tr></tfoot> : null}
      </table>
    </fieldset>
  );
}

function GroundCheckGraph({ txNumber, mode, markers, legend }: { txNumber: 1 | 2; mode: DvorGroundCheckGraphMode; markers: boolean; legend: boolean }) {
  const run = useVorPmdtStore((state) => state.groundChecks[txNumber === 1 ? "tx1" : "tx2"]);
  const result = run.result;
  const series = result ? groundCheckGraphSeries(result, mode) : [];
  return (
    <svg viewBox="0 0 540 320" preserveAspectRatio="none" aria-hidden="true">
      <g className="pmdt-ground-grid-lines">
        {[40, 80, 120, 160, 200, 240, 280].map((y) => <line key={`h-${y}`} x1="0" x2="540" y1={y} y2={y} />)}
        {[0, 67.5, 135, 202.5, 270, 337.5, 405, 472.5, 540].map((x) => <line key={`v-${x}`} x1={x} x2={x} y1="0" y2="285" />)}
      </g>
      <line className="pmdt-ground-zero-line" x1="0" x2="540" y1="160" y2="160" />
      {series.map((entry) => (
        <polyline
          key={entry.label}
          className={`pmdt-ground-trace ${seriesClass(entry.label)}`}
          points={graphPoints(entry.values)}
        />
      ))}
      {markers ? series.map((entry) => (
        <g key={`markers-${entry.label}`} fill={seriesColors[entry.label] ?? "#ff00ff"}>
          {entry.values.map((value, index) => {
            const [x, y] = pointXY(value, index, entry.values.length);
            return <circle key={index} cx={x} cy={y} r="2.5" />;
          })}
        </g>
      )) : null}
      <g className="pmdt-ground-axis-labels">
        {[[3, "2.0"], [43, "1.5"], [82, "1.0"], [123, "0.5"], [163, "0.0"], [202, "-0.5"], [242, "-1.0"], [281, "-1.5"], [322, "-2.0"]].map(([y, label]) => <text key={label} x="-24" y={y}>{label}</text>)}
      </g>
      <g className="pmdt-ground-x-axis-labels">
        {groundCheckAzimuths.map((azimuth, index) => (
          <text key={`x-${azimuth}`} textAnchor="middle" x={(index / (groundCheckAzimuths.length - 1)) * 540} y={index % 2 === 0 ? 336 : 350}>
            {azimuth.toFixed(1)}
          </text>
        ))}
      </g>
      {legend && series.length ? (
        <g className="pmdt-ground-legend">
          <rect className="pmdt-ground-legend-box" x="440" y="10" width="85" height={16 + series.length * 18} />
          {series.map((entry, index) => (
            <g key={`legend-${entry.label}`}>
              <line x1="448" x2="462" y1={20 + index * 18} y2={20 + index * 18} className={seriesClass(entry.label)} stroke={seriesColors[entry.label] ?? "#ff00ff"} />
              <text x="468" y={24 + index * 18}>{entry.label === "Station Error" ? "Station" : entry.label}</text>
            </g>
          ))}
        </g>
      ) : null}
    </svg>
  );
}

export function TxGroundCheck({ txNumber }: { txNumber: 1 | 2 }) {
  const txId: DvorTransmitterId = txNumber === 1 ? "tx1" : "tx2";
  const run = useVorPmdtStore((state) => state.groundChecks[txId]);
  const txConfig = useVorPmdtStore((state) => state.config.transmitters[txId]);
  const responding = useVorPmdtStore((state) => state.monitorTests.responding);
  const runGroundCheck = useVorPmdtStore((state) => state.runGroundCheck);
  const cancelGroundCheck = useVorPmdtStore((state) => state.cancelGroundCheck);
  const [mode, setMode] = useState<DvorGroundCheckGraphMode>("fft-errors");
  const [markers, setMarkers] = useState(false);
  const [legend, setLegend] = useState(true);
  const [source, setSource] = useState<DvorMonitorId>("mon2");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = run.result;
  const running = run.status === "running";
  const progress = Math.min(100, Math.round((run.elapsed / GROUND_CHECK_DURATION_SECONDS) * 100));
  const txUnavailable = !txConfig.enabled || txConfig.faults.disabled;
  const runBlockedReason = txUnavailable
    ? "Transmitter is disabled or faulted off."
    : !responding[source]
      ? `${source === "mon1" ? "Monitor 1" : "Monitor 2"} is not responding.`
      : null;

  const stationRows = groundCheckAzimuths.map((azimuth, index) => [
    azimuth.toFixed(2),
    result ? (result.stationErrors[index] ?? 0).toFixed(2) : "—",
    "°",
  ]);
  const errorRows = result
    ? [
        ["Duantal Error", result.quadrantal.amplitude.toFixed(3), result.quadrantal.phase.toFixed(1), "°"],
        ["Quadrantal Error", result.quadrantal.amplitude.toFixed(3), result.quadrantal.phase.toFixed(1), "°"],
        ["Octantal Error", result.octantal.amplitude.toFixed(3), result.octantal.phase.toFixed(1), "°"],
        ["Bias", result.bias.toFixed(3), "", "°"],
      ]
    : [
        ["Duantal Error", "—", "—", "°"],
        ["Quadrantal Error", "—", "—", "°"],
        ["Octantal Error", "—", "—", "°"],
        ["Bias", "—", "", "°"],
      ];

  const statusText = running
    ? `Ground check in progress — ${progress}%`
    : run.status === "completed"
      ? `Completed ${monitorTestTimestamp(run.completedAt)} via ${run.source === "mon1" ? "Monitor 1" : "Monitor 2"}.`
      : run.status === "failed"
        ? `Failed: ${run.failureReason ?? "the run did not complete."}`
        : run.status === "canceled"
          ? "Ground check canceled before completion."
          : runBlockedReason ?? "No ground check has been run for this transmitter.";

  function saveAs() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([groundCheckResultCsv(txId, run)], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `DVOR1150A-ground-check-tx${txNumber}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyResults() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(groundCheckResultText(txId, run));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert("Không truy cập được clipboard. Cho phép quyền clipboard rồi thử lại.");
    }
  }

  const graphOptions = (
    <>
      <label><input type="radio" name={`ground-${txNumber}-graph`} checked={mode === "fft-errors"} onChange={() => setMode("fft-errors")} /> FFT Errors</label>
      <label><input type="radio" name={`ground-${txNumber}-graph`} checked={mode === "fft-sum"} onChange={() => setMode("fft-sum")} /> FFT Sum</label>
      <label><input type="radio" name={`ground-${txNumber}-graph`} checked={mode === "station-error"} onChange={() => setMode("station-error")} /> Station Error</label>
      <label><input type="checkbox" checked={markers} onChange={(event) => setMarkers(event.target.checked)} /> Markers</label>
      <label><input type="checkbox" checked={legend} onChange={(event) => setLegend(event.target.checked)} /> Legend</label>
    </>
  );

  return (
    <section className="pmdt-ground-check" aria-label={`Ground Check Tx ${txNumber}`}>
      <div className="pmdt-ground-check-header">
        <time className="pmdt-monitor-date">{run.completedAt ? monitorTestTimestamp(run.completedAt) : "—"}</time>
        <button type="button" disabled={running || runBlockedReason !== null} onClick={() => runGroundCheck(txId, source)}>Run</button>
        <button type="button" disabled={!running} onClick={() => cancelGroundCheck(txId)}>Cancel</button>
      </div>
      <p className="pmdt-ground-status" role="status">{statusText}</p>
      <div className="pmdt-ground-check-top">
        <GroundCheckTable title="Station" headers={["Azimuth", "Station\nError", ""]} rows={stationRows} footer={["Error Spread", result ? result.errorSpread.toFixed(2) : "—", ""]} />
        <GroundCheckTable title="" headers={["", "Amplitude", "Phase", ""]} rows={errorRows} />
        <fieldset className="pmdt-ground-options">
          <legend>Graph Options</legend>
          {graphOptions}
          <button type="button" onClick={() => setAdvancedOpen(true)}>Advanced...</button>
        </fieldset>
      </div>
      <div className="pmdt-ground-graph" role="img" aria-label="Ground check error graph">
        <GroundCheckGraph txNumber={txNumber} mode={mode} markers={markers} legend={legend} />
      </div>
      <div className="pmdt-ground-source">
        <span>Source</span>
        <select aria-label="Ground check source" value={source} disabled={running} onChange={(event) => setSource(event.target.value as DvorMonitorId)}>
          <option value="mon1">Monitor 1</option>
          <option value="mon2">Monitor 2</option>
        </select>
      </div>
      <p className="pmdt-ground-note">
        Training model only: this ground check is simulated from the current configuration. No signal was measured, and running it does not issue a NOTAM.
      </p>
      {advancedOpen ? (
        <div className="pmdt-ground-advanced-overlay">
          <div className="pmdt-ground-advanced" role="dialog" aria-modal="true" aria-label={`Ground Check Tx ${txNumber} Advanced`}>
            <div className="pmdt-ground-advanced-header">
              <strong>Ground Check Tx {txNumber} — Advanced</strong>
              <span>{statusText}</span>
            </div>
            <div className="pmdt-ground-graph pmdt-ground-graph--advanced" role="img" aria-label="Ground check error graph, enlarged">
              <GroundCheckGraph txNumber={txNumber} mode={mode} markers={markers} legend={legend} />
            </div>
            <fieldset className="pmdt-ground-options">
              <legend>Graph Options</legend>
              {graphOptions}
            </fieldset>
            {result ? <pre className="pmdt-ground-advanced-text">{groundCheckResultText(txId, run)}</pre> : null}
            <div className="pmdt-ground-advanced-actions">
              <button type="button" disabled={!result} onClick={() => printPmdtText(`DVOR 1150A — Ground Check Tx ${txNumber} (simulator)`, groundCheckResultText(txId, run))}>Print</button>
              <button type="button" disabled={!result} onClick={() => void copyResults()}>{copied ? "Copied" : "Copy"}</button>
              <button type="button" disabled={!result} onClick={saveAs}>Save As</button>
              <button type="button" onClick={() => setAdvancedOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
