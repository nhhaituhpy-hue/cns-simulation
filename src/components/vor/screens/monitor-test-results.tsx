"use client";

import { useState } from "react";
import { PmdtToolbar } from "../pmdt-toolbar";
import { dvorConfigFieldCatalog, getDvorConfigValue } from "@/lib/dvor1150a";
import { monitorGeneratorSignature, monitorTestRows, type MonitorTestRow, type MonitorTestCell } from "@/lib/dvor1150a/monitor-tests";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtConfigControl } from "../pmdt-config-control";

type TestTab = "completed" | "in-process" | "test-generator";

function format(value: number | null | undefined, digits: number): string {
  return value != null && Number.isFinite(value) ? value.toFixed(digits) : "---";
}

export function monitorTestTimestamp(timestamp: string | null): string {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return "—";
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}/${pad(date.getUTCFullYear() % 100)} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

const colors = { green: "#00ff00", red: "#ff6666", yellow: "#ffff00", gray: "#ededed" };
function TestValue({ cell, digits }: { cell: MonitorTestCell; digits: number }) {
  return <td className="pmdt-monitor-test-live" data-test-status={cell.status} style={{ background: "transparent" }}><span style={{ background: colors[cell.status], color: "#111" }}>{format(cell.value, digits)}</span></td>;
}

function TestTable({ rows }: { rows: MonitorTestRow[] }) {
  return (
    <div className="pmdt-monitor-test-table-wrap">
      <table className="pmdt-monitor-test-table">
        <colgroup>
          <col className="pmdt-monitor-test-label-col" />
          {["value", "gap", "value", "gap", "value", "spacer", "value", "gap", "value", "gap", "value", "unit"].map((type, index) => <col key={index} className={`pmdt-monitor-test-${type}-col`} />)}
        </colgroup>
        <thead><tr>
          {["", "Low Test", "", "Low Limit", "", "High Test", "", "Low Test", "", "High Limit", "", "High Test", ""].map((label, index) => <th key={index} scope="col">{label}</th>)}
        </tr></thead>
        <tbody>{rows.map(row => <tr key={row.key}>
          <th scope="row">{row.label}</th>
          <TestValue cell={row.cells[0]} digits={row.digits} /><td className="pmdt-monitor-test-gap" />
          <td className="pmdt-monitor-test-limit"><span>{format(row.lowLimit, row.digits)}</span></td><td className="pmdt-monitor-test-gap" />
          <TestValue cell={row.cells[1]} digits={row.digits} /><td className="pmdt-monitor-test-spacer" />
          <TestValue cell={row.cells[2]} digits={row.digits} /><td className="pmdt-monitor-test-gap" />
          <td className="pmdt-monitor-test-limit"><span>{format(row.highLimit, row.digits)}</span></td><td className="pmdt-monitor-test-gap" />
          <TestValue cell={row.cells[3]} digits={row.digits} /><td className="pmdt-monitor-test-unit">{row.unit}</td>
        </tr>)}</tbody>
      </table>
      <div className="pmdt-monitor-test-rails" aria-hidden="true">
        {[121, 183, 190, 252, 259, 321, 363, 425, 432, 494, 501, 563].map(left => <span key={left} style={{ left }} />)}
      </div>
    </div>
  );
}

function TestGenerator({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const sample = useVorPmdtStore(state => state.monitorTests.generator[monitorNumber === 1 ? "mon1" : "mon2"]);
  const setupTimestamp = useVorPmdtStore(state => state.monitorTests.setupTimestamp);
  const config = useVorPmdtStore(state => state.config);
  const resultKeys = ["azimuth", "hz30Modulation", "hz9960Modulation", "deviation", "identModulation"] as const;
  const setupKeys = [...resultKeys, "identStatus", "audioModulation", "audioFrequency"] as const;
  const storedOnlyKeys = setupKeys.filter(key => dvorConfigFieldCatalog.find(field => field.id === `monitor.testGenerator.${key}`)?.effect === "stored-only");
  const rows = [
    ["Azimuth Angle", "°"], ["30 Hz Modulation", "%"], ["9960 Hz Modulation", "%"], ["Deviation", "Ratio"],
    ["Ident Modulation", "%"], ["Ident Control", ""], ["Audio Modulation", "%"], ["Audio Frequency", "Hz"],
  ];
  const updated = sample?.signature === monitorGeneratorSignature(config, monitorNumber === 1 ? "mon1" : "mon2");
  return (
    <div className="pmdt-monitor-test-generator">
      <fieldset><legend>Test Generator Setup</legend>
        <time className="pmdt-monitor-date">{monitorTestTimestamp(setupTimestamp)}</time>
        <table><tbody>{rows.map(([label, unit], index) => <tr key={label}>
          <th scope="row">{label}</th>
          <td><PmdtConfigControl displayFieldId={`testGeneratorSetup.${setupKeys[index]}`} ariaLabel={`${label} setup`} configFieldId={`monitor.testGenerator.${setupKeys[index]}`} digits={index === 0 || index === 3 ? 2 : 1} /></td>
          <td>{unit}</td>
        </tr>)}</tbody></table>
      </fieldset>
      <fieldset><legend>Test Results</legend>
        <output className="pmdt-monitor-test-updated" style={{ background: updated ? "#00ff00" : "#ededed" }} title={sample ? monitorTestTimestamp(sample.timestamp) : undefined}>{updated ? "Updated" : ""}</output>
        <table><tbody>{rows.slice(0, 5).map(([label, unit], index) => <tr key={label} aria-label={label}>
          <td aria-label={`${label} result`} data-vor-field-id={`testGeneratorResults.mon${monitorNumber}.${resultKeys[index]}`}>{format(sample?.values[resultKeys[index]], index === 0 || index === 3 ? 2 : 1)}</td>
          <td>{unit}</td>
        </tr>)}</tbody></table>
      </fieldset>
      <div role="note" aria-label="Unsupported Test Generator measurements" className="text-[10px]" style={{ gridColumn: "1 / -1" }}>
        <p>Chỉ lưu cấu hình: Ident Control, Audio Modulation và Audio Frequency chưa có kết quả detector/certification được xác minh. Giá trị đã áp dụng dưới đây không phải số đo; không đổi số đo hoặc cảnh báo.</p>
        <dl>{storedOnlyKeys.map(key => {
          const field = dvorConfigFieldCatalog.find(item => item.id === `monitor.testGenerator.${key}`)!;
          return <div key={key}>
            <dt>{field.label.replace("Test Generator ", "")} — đã áp dụng</dt>
            <dd data-vor-field-id={`testGeneratorApplied.mon${monitorNumber}.${key}`} data-vor-effect="stored-only">{String(getDvorConfigValue(config, field.id))}{field.unit ? ` ${field.unit}` : ""}</dd>
          </div>;
        })}</dl>
      </div>
    </div>
  );
}

export function MonitorTestResults() {
  const activeMenuPath = useVorPmdtStore(state => state.activeMenuPath);
  const config = useVorPmdtStore(state => state.config);
  const tests = useVorPmdtStore(state => state.monitorTests);
  const [tab, setTab] = useState<TestTab>("completed");
  const monitorNumber = activeMenuPath[0] === "Monitor 2" ? 2 : 1;
  const id = monitorNumber === 1 ? "mon1" : "mon2";
  const run = tab === "in-process" ? tests.inProcess[id] : tests.completed[id];
  return (
    <section className="pmdt-monitor-test-results flex min-h-full flex-col" aria-label={`Monitor ${monitorNumber} Test Results`}>
      <PmdtToolbar title={`Monitor ${monitorNumber} Test Results`} />
      <div className="pmdt-monitor-inner-tabs" role="tablist" aria-label="Monitor test result tabs">
        {(["completed", "in-process", "test-generator"] as const).map(item => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>
          {item === "completed" ? "Completed" : item === "in-process" ? "In Process" : "Test Generator"}
        </button>)}
      </div>
      <div className="pmdt-monitor-test-content">
        {tab === "test-generator" ? <TestGenerator monitorNumber={monitorNumber} /> : <>
          <time className="pmdt-monitor-date">{monitorTestTimestamp(run?.timestamp ?? null)}</time>
          <TestTable rows={run?.rows ?? monitorTestRows(config, id)} />
        </>}
      </div>
    </section>
  );
}
