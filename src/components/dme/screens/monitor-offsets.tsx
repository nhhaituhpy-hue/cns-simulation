"use client";

import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { DmeConfigControl } from "./dme-config-control";
import { ScreenTabs } from "./screen-primitives";

function OffsetInput({ fieldId, label }: { fieldId: string; label: string }) {
  return <DmeConfigControl fieldId={fieldId} label={label} type="number" className="dme-pmdt-config-input" />;
}

export function MonitorOffsets({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const rows = useDmePmdtStore((state) => state.configDraft.monitorOffsets[monitorNumber === 1 ? "monitor1" : "monitor2"]);
  const timestamp = useDmePmdtStore((state) => state.data.timestamp);
  const openView = useDmePmdtStore((state) => state.openView);
  const prefix = `monitorOffsets.monitor${monitorNumber}`;

  return (
    <section className="dme-pmdt-offsets-screen flex min-h-full flex-col" aria-label={`Monitor ${monitorNumber} Offsets and Scale Factors`}>
      <PmdtToolbar title={`Monitor ${monitorNumber} Offsets and Scale Factors`} />
      <ScreenTabs tabs={[
        { id: "offsets", label: "Offsets and Scale Factors", active: true },
        {
          id: "calibration",
          label: "Calibration",
          active: false,
          onSelect: () => openView(
            `monitor-${monitorNumber}-calibration`,
            `monitor-${monitorNumber}-calibration`,
            [`Monitor ${monitorNumber}`, "Calibration"],
            "Calibration",
          ),
        },
      ]} />
      <div className="dme-pmdt-offsets-content">
        <time>{timestamp}</time>
        <table>
          <caption className="sr-only">Monitor {monitorNumber} offsets and scale factors</caption>
          <colgroup><col /><col /><col /><col /><col /><col /></colgroup>
          <thead><tr><th /><th colSpan={2}>Integral</th><th /><th colSpan={2}>Standby</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.parameter}>
                <th scope="row">{row.parameter}</th>
                <td><OffsetInput fieldId={`${prefix}.${index}.integral`} label={`${row.parameter} integral`} /></td>
                <td>{row.integral === null ? "" : row.unit}</td>
                <td />
                <td><OffsetInput fieldId={`${prefix}.${index}.standby`} label={`${row.parameter} standby`} /></td>
                <td>{row.standby === null ? "" : row.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
