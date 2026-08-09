"use client";

import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

const azimuths = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5];

function graphPoints(values: readonly number[]): string {
  const halfScale = 2;
  return values.map((value, index) => {
    const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * 540;
    const y = 160 - (Math.max(-halfScale, Math.min(halfScale, value)) / halfScale) * 120;
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

export function TxGroundCheck({ txNumber }: { txNumber: 1 | 2 }) {
  const timestamp = useVorPmdtStore((state) => state.data.rmsOperationalSummary.startTime);
  const groundCheck = useVorPmdtStore((state) => state.derived.groundChecks[txNumber === 1 ? "tx1" : "tx2"]);
  const stationRows = azimuths.map((azimuth, index) => [azimuth.toFixed(2), (groundCheck.stationErrors[index] ?? 0).toFixed(2), "°"]);
  const errorRows = [
    ["Duantal Error", groundCheck.quadrantal.amplitude.toFixed(3), groundCheck.quadrantal.phase.toFixed(1), "°"],
    ["Quadrantal Error", groundCheck.quadrantal.amplitude.toFixed(3), groundCheck.quadrantal.phase.toFixed(1), "°"],
    ["Octantal Error", groundCheck.octantal.amplitude.toFixed(3), groundCheck.octantal.phase.toFixed(1), "°"],
    ["Bias", groundCheck.bias.toFixed(3), "", "°"],
  ];

  return (
    <section className="pmdt-ground-check" aria-label={`Ground Check Tx ${txNumber}`}>
      <div className="pmdt-ground-check-header">
        <time className="pmdt-monitor-date">{timestamp}</time>
        <button type="button" disabled>Run</button>
      </div>
      <div className="pmdt-ground-check-top">
      <GroundCheckTable title="Station" headers={["Azimuth", "Station\nError", ""]} rows={stationRows} footer={["Error Spread", groundCheck.errorSpread.toFixed(2), ""]} />
        <GroundCheckTable title="" headers={["", "Amplitude", "Phase", ""]} rows={errorRows} />
        <fieldset className="pmdt-ground-options">
          <legend>Graph Options</legend>
          <label><input type="radio" name={`ground-${txNumber}-graph`} defaultChecked /> FFT Errors</label>
          <label><input type="radio" name={`ground-${txNumber}-graph`} /> FFT Sum</label>
          <label><input type="radio" name={`ground-${txNumber}-graph`} /> Station Error</label>
          <label><input type="checkbox" /> Markers</label>
          <label><input type="checkbox" defaultChecked /> Legend</label>
          <button type="button">Advanced...</button>
        </fieldset>
      </div>
      <div className="pmdt-ground-graph" role="img" aria-label="Ground check error graph">
          <svg viewBox="0 0 540 320" preserveAspectRatio="none" aria-hidden="true">
          <g className="pmdt-ground-grid-lines">
            {[40, 80, 120, 160, 200, 240, 280].map((y) => <line key={`h-${y}`} x1="0" x2="540" y1={y} y2={y} />)}
            {[0, 67.5, 135, 202.5, 270, 337.5, 405, 472.5, 540].map((x) => <line key={`v-${x}`} x1={x} x2={x} y1="0" y2="285" />)}
          </g>
          <line className="pmdt-ground-zero-line" x1="0" x2="540" y1="160" y2="160" />
          <polyline className="pmdt-ground-trace" points={graphPoints(groundCheck.stationErrors)} />
          <g className="pmdt-ground-axis-labels">
            {[[3, "2.0"], [43, "1.5"], [82, "1.0"], [123, "0.5"], [163, "0.0"], [202, "-0.5"], [242, "-1.0"], [281, "-1.5"], [322, "-2.0"]].map(([y, label]) => <text key={label} x="-24" y={y}>{label}</text>)}
          </g>
          <g className="pmdt-ground-x-axis-labels">
            {azimuths.map((azimuth, index) => (
              <text key={`x-${azimuth}`} textAnchor="middle" x={(index / (azimuths.length - 1)) * 540} y={index % 2 === 0 ? 336 : 350}>
                {azimuth.toFixed(1)}
              </text>
            ))}
          </g>
          <g className="pmdt-ground-legend">
            <rect className="pmdt-ground-legend-box" x="440" y="10" width="85" height="70" />
            <line x1="448" x2="462" y1="20" y2="20" /><text x="468" y="24">Duantal</text>
            <line x1="448" x2="462" y1="38" y2="38" /><text x="468" y="42">Quadrantal</text>
            <line x1="448" x2="462" y1="56" y2="56" /><text x="468" y="60">Octantal</text>
            <line x1="448" x2="462" y1="74" y2="74" /><text x="468" y="78">Bias</text>
          </g>
        </svg>
      </div>
      <div className="pmdt-ground-source"><span>Source</span><select defaultValue="Monitor 2"><option>Monitor 1</option><option>Monitor 2</option></select></div>
    </section>
  );
}
