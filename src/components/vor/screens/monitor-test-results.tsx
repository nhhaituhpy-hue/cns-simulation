"use client";

import { useState } from "react";
import { PmdtToolbar } from "../pmdt-toolbar";
import { calculateIntegrityTestValues } from "@/lib/dvor1150a";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

type TestTab = "completed" | "in-process" | "test-generator";

const numericRows = [
  { label: "30 Hz Modulation", key: "30HzModulation" as const, digits: 1, unit: "%" },
  { label: "9960 Hz Modulation", key: "9960HzModulation" as const, digits: 1, unit: "%" },
  { label: "9960 Hz Deviation", key: "9960HzDeviation" as const, digits: 2, unit: "Ratio" },
  { label: "Ident Modulation", key: "IdentModulation" as const, digits: 1, unit: "%" },
] as const;

function format(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "---";
}

function monitorNumberFromPath(path: readonly string[]): 1 | 2 {
  return path[0] === "Monitor 2" ? 2 : 1;
}

function buildTestRows(
  monitorNumber: 1 | 2,
  data: ReturnType<typeof useVorPmdtStore.getState>["data"],
  derived: ReturnType<typeof useVorPmdtStore.getState>["derived"],
) {
  const antenna = data.monitorAntennas[monitorNumber - 1];
  const azimuthLimit = monitorNumber === 1 ? antenna?.azimuthAngle ?? 0 : antenna?.azimuthAngle ?? 0;
  const azimuthRange = data.monitorAzimuthLimits;
  const integrityEnabled = data.rmsConfigGeneral.monitorIntegrityTestsEnabled;
  const azimuthLowLimit = azimuthLimit - azimuthRange.alarm;
  const azimuthHighLimit = azimuthLimit + azimuthRange.alarm;
  const azimuthIntegrity = integrityEnabled
    ? calculateIntegrityTestValues({
        alarmLow: azimuthLowLimit,
        preAlarmLow: azimuthLimit - azimuthRange.preAlarm,
        nominal: azimuthLimit,
        preAlarmHigh: azimuthLimit + azimuthRange.preAlarm,
        alarmHigh: azimuthHighLimit,
        unit: "°",
      })
    : null;
  const azimuth = {
    label: "Azimuth",
    digits: 2,
    unit: "°",
    // 571150A-0002E, §3.6.8.2.2: use the same one-tenth target helper as
    // the other monitor integrity parameters.
    lowTestLow: azimuthIntegrity?.lowLimitLowTest ?? Number.NaN,
    lowLimit: azimuthLowLimit,
    lowTestHigh: azimuthIntegrity?.lowLimitHighTest ?? Number.NaN,
    highTestLow: azimuthIntegrity?.highLimitLowTest ?? Number.NaN,
    highLimit: azimuthHighLimit,
    highTestHigh: azimuthIntegrity?.highLimitHighTest ?? Number.NaN,
  };

  return [
    azimuth,
    ...numericRows.map((row) => {
      const limit = data.alarmLimits.find((item) => item.parameter === row.label);
      const integrity = derived.integrity[row.key];
      return {
        label: row.label,
        digits: row.digits,
        unit: row.unit,
        lowTestLow: integrity?.lowLimitLowTest ?? 0,
        lowLimit: limit?.alarmLow ?? 0,
        lowTestHigh: integrity?.lowLimitHighTest ?? 0,
        highTestLow: integrity?.highLimitLowTest ?? 0,
        highLimit: limit?.alarmHigh ?? 0,
        highTestHigh: integrity?.highLimitHighTest ?? 0,
      };
    }),
  ];
}

function TestValue({ value, digits, live }: { value: number | string; digits: number; live: boolean }) {
  return (
    <td className={live ? "pmdt-monitor-test-live" : "pmdt-monitor-test-limit"}>
      <span>{typeof value === "string" ? value : format(value, digits)}</span>
    </td>
  );
}

function TestTable({
  rows,
  inProcess = false,
}: {
  rows: ReturnType<typeof buildTestRows>;
  inProcess?: boolean;
}) {
  return (
    <div className="pmdt-monitor-test-table-wrap">
      <table className="pmdt-monitor-test-table">
        <colgroup>
          <col className="pmdt-monitor-test-label-col" />
          <col className="pmdt-monitor-test-value-col" />
          <col className="pmdt-monitor-test-gap-col" />
          <col className="pmdt-monitor-test-value-col" />
          <col className="pmdt-monitor-test-gap-col" />
          <col className="pmdt-monitor-test-value-col" />
          <col className="pmdt-monitor-test-spacer-col" />
          <col className="pmdt-monitor-test-value-col" />
          <col className="pmdt-monitor-test-gap-col" />
          <col className="pmdt-monitor-test-value-col" />
          <col className="pmdt-monitor-test-gap-col" />
          <col className="pmdt-monitor-test-value-col" />
          <col className="pmdt-monitor-test-unit-col" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">Low Test</th>
            <th scope="col" />
            <th scope="col">Low Limit</th>
            <th scope="col" />
            <th scope="col">High Test</th>
            <th scope="col" />
            <th scope="col">Low Test</th>
            <th scope="col" />
            <th scope="col">High Limit</th>
            <th scope="col" />
            <th scope="col">High Test</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <TestValue value={inProcess ? "---" : row.lowTestLow} digits={row.digits} live={!inProcess} />
              <td className="pmdt-monitor-test-gap" />
              <TestValue value={row.lowLimit} digits={row.digits} live={false} />
              <td className="pmdt-monitor-test-gap" />
              <TestValue value={inProcess ? "---" : row.lowTestHigh} digits={row.digits} live={!inProcess} />
              <td className="pmdt-monitor-test-spacer" />
              <TestValue value={inProcess ? "---" : row.highTestLow} digits={row.digits} live={!inProcess} />
              <td className="pmdt-monitor-test-gap" />
              <TestValue value={row.highLimit} digits={row.digits} live={false} />
              <td className="pmdt-monitor-test-gap" />
              <TestValue value={inProcess ? "---" : row.highTestHigh} digits={row.digits} live={!inProcess} />
              <td className="pmdt-monitor-test-unit">{row.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pmdt-monitor-test-rails" aria-hidden="true">
        {[121, 183, 190, 252, 259, 321, 363, 425, 432, 494, 501, 563].map((left) => (
          <span key={left} style={{ left }} />
        ))}
      </div>
    </div>
  );
}

function TestGenerator({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const data = useVorPmdtStore((state) => state.data);
  const rows = [
    ["Azimuth Angle", "0.00", "°", "359.97", "°"],
    ["30 Hz Modulation", "30.0", "%", "30.0", "%"],
    ["9960 Hz Modulation", "30.0", "%", "30.1", "%"],
    ["Deviation", "16.00", "Ratio", "15.97", "Ratio"],
    ["Ident Modulation", "10.0", "%", "9.4", "%"],
    ["Ident Control", "Normal", "", "", ""],
    ["Audio Modulation", "10.0", "%", "", ""],
    ["Audio Frequency", "300", "Hz", "", ""],
  ] as const;

  return (
    <div className="pmdt-monitor-test-generator">
      <fieldset>
        <legend>Test Generator Setup</legend>
        <time className="pmdt-monitor-date">04/26/24 21:09:59</time>
        <table>
          <tbody>
            {rows.map(([label, setup, setupUnit]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>
                  {label === "Ident Control" ? (
                    <select aria-label={`${label} setup`} disabled value={setup} onChange={() => undefined}>
                      <option value="Normal">Normal</option>
                    </select>
                  ) : (
                    <input aria-label={`${label} setup`} type="number" readOnly value={setup} />
                  )}
                </td>
                <td>{setupUnit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>
      <fieldset>
        <legend>Test Results</legend>
        <output className="pmdt-monitor-test-updated">Updated</output>
        <table>
          <tbody>
            {rows.slice(0, 5).map(([label, , , result, unit]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{result || format(data.monitorAntennas[monitorNumber - 1]?.azimuthAngle ?? 0, 2)}</td>
                <td>{unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>
    </div>
  );
}

export function MonitorTestResults() {
  const activeMenuPath = useVorPmdtStore((state) => state.activeMenuPath);
  const data = useVorPmdtStore((state) => state.data);
  const derived = useVorPmdtStore((state) => state.derived);
  const [tab, setTab] = useState<TestTab>("completed");
  const monitorNumber = monitorNumberFromPath(activeMenuPath);
  const rows = buildTestRows(monitorNumber, data, derived);

  return (
    <section className="pmdt-monitor-test-results flex min-h-full flex-col" aria-label={`Monitor ${monitorNumber} Test Results`}>
      <PmdtToolbar title={`Monitor ${monitorNumber} Test Results`} />
      <div className="pmdt-monitor-inner-tabs" role="tablist" aria-label="Monitor test result tabs">
        {(["completed", "in-process", "test-generator"] as const).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>
            {item === "completed" ? "Completed" : item === "in-process" ? "In Process" : "Test Generator"}
          </button>
        ))}
      </div>
      <div className="pmdt-monitor-test-content">
        {tab === "test-generator" ? <TestGenerator monitorNumber={monitorNumber} /> : (
          <>
            <time className="pmdt-monitor-date">08/08/26 13:25:27</time>
            <TestTable rows={rows} inProcess={tab === "in-process"} />
          </>
        )}
      </div>
    </section>
  );
}
