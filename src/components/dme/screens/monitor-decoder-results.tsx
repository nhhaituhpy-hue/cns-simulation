"use client";

import type { DmeEditableValue, DmeViewId } from "@/lib/dme-types";
import { deriveIntegrityTestTargets, getDmeStationChannelAllocation } from "@/lib/dme1119a";
import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { DmeValueCell, ScreenTabs } from "./screen-primitives";

type TestTab = "alarm-limits" | "interrogator" | "transponder" | "decoder";
type AlarmTestRow = readonly [string, string, string, string, string, string, string, string];
type ThreeColumnResultRow = readonly [string, string, string, string, string];

function getInterrogatorRows(interrogationSpacing: number): readonly ThreeColumnResultRow[] {
  return [
  ["First Pulse Width", "3.0", "3.5", "4.0", "us"],
  ["First Pulse Rise Time", "1.5", "2.4", "3.0", "us"],
  ["First Pulse Decay Time", "1.5", "2.5", "3.0", "us"],
  ["Second Pulse Width", "3.0", "3.5", "4.0", "us"],
  ["Second Pulse Rise Time", "1.5", "2.4", "3.0", "us"],
  ["Second Pulse Decay Time", "1.5", "2.5", "3.0", "us"],
  ["Pulse Amplitude Difference", "-0.5", "0.0", "0.5", "dB"],
  ["Pulse Spacing", (interrogationSpacing - 0.2).toFixed(2), interrogationSpacing.toFixed(2), (interrogationSpacing + 0.2).toFixed(2), "us"],
  ["Pulse Rate", "25", "48", "60", "ppps"],
  ["Signal Generator Reference", "-1.0", "-0.1", "1.0", "dB"],
  ];
}

const transponderRows: readonly ThreeColumnResultRow[] = [
  ["First Pulse Width", "3.0", "3.4", "4.0", "us"],
  ["First Pulse Rise Time", "1.5", "2.2", "3.0", "us"],
  ["First Pulse Decay Time", "1.5", "2.3", "3.0", "us"],
  ["Second Pulse Width", "3.0", "3.5", "4.0", "us"],
  ["Second Pulse Rise Time", "1.5", "2.3", "3.0", "us"],
  ["Second Pulse Decay Time", "1.5", "2.3", "3.0", "us"],
  ["Pulse Amplitude Difference", "-0.5", "0.1", "0.5", "dB"],
  ["Ident", "1340", "1350", "1360", "Hz"],
  ["Equalization Pulses", "90.0", "99.9", "110.0", "us"],
  ["RTC #1 Dead Time Gate", "55", "59", "65", "us"],
];

function ThreeColumnResults({
  monitorNumber,
  rows,
  tab,
}: {
  monitorNumber: 1 | 2;
  rows: readonly ThreeColumnResultRow[];
  tab: "interrogator" | "transponder";
}) {
  return (
    <table className="dme-pmdt-three-result-table">
      <caption className="sr-only">Monitor {monitorNumber} {tab} test results</caption>
      <thead><tr><th /><th>Low Limit</th><th>Data</th><th>High Limit</th><th /></tr></thead>
      <tbody>
        {rows.map(([parameter, low, value, high, unit], index) => (
          <tr key={parameter}>
            <th scope="row">{parameter}</th>
            <td>{low}</td>
            <td><DmeValueCell fieldId={`monitor${monitorNumber}.${tab}.${index}.data`} label={`${parameter} data`} value={value} /></td>
            <td>{high}</td>
            <td>{unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AlarmLimitResults({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const alarmLimits = useDmePmdtStore((state) => state.data.alarmLimits);
  const rows = alarmLimits.map((limit) => {
    const targets = deriveIntegrityTestTargets(limit);
    const offsetBased = limit.parameter === "Delay" || limit.parameter === "Spacing";
    const absolute = (value: number | null) => value === null ? "" : (offsetBased ? limit.nominal + value : value).toFixed(2);
    const lower = limit.alarmLow === null ? "" : absolute(limit.alarmLow);
    const high = limit.alarmHigh === null ? "" : absolute(limit.alarmHigh);
    return [
      limit.parameter,
      targets.lowLow === null ? "" : targets.lowLow.toFixed(2),
      lower,
      targets.lowHigh === null ? "" : targets.lowHigh.toFixed(2),
      targets.highLow === null ? "" : targets.highLow.toFixed(2),
      high,
      targets.highHigh === null ? "" : targets.highHigh.toFixed(2),
      limit.unit,
    ] as AlarmTestRow;
  });
  return (
    <table className="dme-pmdt-alarm-test-table">
      <caption className="sr-only">Monitor {monitorNumber} alarm limit test results</caption>
      <thead>
        <tr><th /><th>Low Test</th><th>Low Limit</th><th>High Test</th><th>Low Test</th><th>High Limit</th><th>High Test</th><th /></tr>
      </thead>
      <tbody>
        {rows.map(([parameter, lowTest, lowLimit, lowHighTest, highLowTest, highLimit, highTest, unit], index) => (
          <tr key={parameter}>
            <th scope="row">{parameter}</th>
            <td><DmeValueCell fieldId={`monitor${monitorNumber}.alarm-test.${index}.lowTest`} label={`${parameter} low test`} value={lowTest} /></td>
            <td>{lowLimit}</td>
            <td><DmeValueCell fieldId={`monitor${monitorNumber}.alarm-test.${index}.lowHighTest`} label={`${parameter} lower high test`} value={lowHighTest} /></td>
            <td>{highLowTest ? <DmeValueCell fieldId={`monitor${monitorNumber}.alarm-test.${index}.highLowTest`} label={`${parameter} upper low test`} value={highLowTest} /> : null}</td>
            <td>{highLimit}</td>
            <td>{highTest ? <DmeValueCell fieldId={`monitor${monitorNumber}.alarm-test.${index}.highTest`} label={`${parameter} high test`} value={highTest} /> : null}</td>
            <td>{unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DecoderResults({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const rows = useDmePmdtStore((state) => state.data.decoderResults[monitorNumber === 1 ? "monitor1" : "monitor2"]);
  const prefix = `decoderResults.monitor${monitorNumber}`;
  const formatDecoderValue = (value: DmeEditableValue): string => (
    typeof value === "number" ? value.toFixed(1) : value === null ? "" : String(value)
  );
  return (
    <table className="dme-pmdt-decoder-result-table">
      <caption className="sr-only">Monitor {monitorNumber} decoder test results</caption>
      <thead><tr><th /><th>Low Limit</th><th>Data</th><th>High Limit</th><th /><th /></tr></thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.parameter}>
            <th scope="row">{row.parameter}</th>
            <td>{formatDecoderValue(row.lowLimit)}</td>
            <td><DmeValueCell fieldId={`${prefix}.${index}.data`} label={`${row.parameter} data`} value={row.data} formatValue={formatDecoderValue} /></td>
            <td>{formatDecoderValue(row.highLimit)}</td>
            <td>{row.unit}</td>
            <td><DmeValueCell fieldId={`${prefix}.${index}.result`} label={`${row.parameter} result`} value={row.result} status={row.result === "Updated" ? "normal" : "gray"} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MonitorDecoderResults({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const activeView = useDmePmdtStore((state) => state.activeView);
  const timestamp = useDmePmdtStore((state) => state.data.timestamp);
  const station = useDmePmdtStore((state) => state.data.rmsConfigStation);
  const openView = useDmePmdtStore((state) => state.openView);
  const allocation = getDmeStationChannelAllocation(station);
  const interrogationSpacing = allocation?.interrogatorPulseSpacingUs ?? 12;
  const screenId = monitorNumber === 1 ? "monitor-1-test-results" : "monitor-2-test-results";
  const viewIds: Record<TestTab, DmeViewId> = monitorNumber === 1
    ? {
        "alarm-limits": "monitor-1-test-alarm-limits",
        interrogator: "monitor-1-test-interrogator",
        transponder: "monitor-1-test-transponder",
        decoder: "monitor-1-decoder-results",
      }
    : {
        "alarm-limits": "monitor-2-test-alarm-limits",
        interrogator: "monitor-2-test-interrogator",
        transponder: "monitor-2-test-transponder",
        decoder: "monitor-2-decoder-results",
      };
  const activeTab = (Object.entries(viewIds).find(([, viewId]) => viewId === activeView)?.[0] ?? "alarm-limits") as TestTab;
  const tabs: Array<{ id: TestTab; label: string }> = [
    { id: "alarm-limits", label: "Alarm Limits" },
    { id: "interrogator", label: "Interrogator" },
    { id: "transponder", label: "Transponder" },
    { id: "decoder", label: "Decoder" },
  ];

  return (
    <section className="dme-pmdt-test-results flex min-h-full flex-col" aria-label={`Monitor ${monitorNumber} Test Results`}>
      <PmdtToolbar title={`Monitor ${monitorNumber} Test Results`} />
      <ScreenTabs tabs={tabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        active: tab.id === activeTab,
        onSelect: () => openView(
          screenId,
          viewIds[tab.id],
          [`Monitor ${monitorNumber}`, "Test Results", tab.label],
          tab.label,
        ),
      }))} />
      <div className="dme-pmdt-results-content">
        <time>{timestamp}</time>
        {activeTab === "alarm-limits" ? <AlarmLimitResults monitorNumber={monitorNumber} /> : null}
        {activeTab === "interrogator" ? <ThreeColumnResults monitorNumber={monitorNumber} rows={getInterrogatorRows(interrogationSpacing)} tab="interrogator" /> : null}
        {activeTab === "transponder" ? <ThreeColumnResults monitorNumber={monitorNumber} rows={transponderRows} tab="transponder" /> : null}
        {activeTab === "decoder" ? <DecoderResults monitorNumber={monitorNumber} /> : null}
      </div>
    </section>
  );
}
