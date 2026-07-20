"use client";

import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { DmeValueCell, ScreenTabs } from "./screen-primitives";

export function MonitorOffsets({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const rows = useDmePmdtStore((state) => state.data.monitorOffsets[monitorNumber === 1 ? "monitor1" : "monitor2"]);
  const openView = useDmePmdtStore((state) => state.openView);

  const prefix = `monitorOffsets.monitor${monitorNumber}`;

  return (
    <section className="flex min-h-full flex-col" aria-label={`Monitor ${monitorNumber} Offsets and Scale Factors`}>
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
            "Calibration"
          )
        },
      ]} />
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <table className="w-full min-w-[42rem] border-separate border-spacing-1 text-left text-[11px]">
          <caption className="sr-only">Monitor {monitorNumber} offsets and scale factors</caption>
          <thead className="text-[#cbd5e1]"><tr><th className="px-3 py-2">Parameter</th><th className="px-3 py-2 text-center">Integral</th><th className="px-3 py-2 text-center">Standby</th><th className="px-3 py-2">Unit</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.parameter}>
                <th scope="row" className="bg-[#111827] px-3 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>
                <td className="p-0.5"><DmeValueCell fieldId={`${prefix}.${index}.integral`} label={`${row.parameter} integral`} value={row.integral} className="w-full" /></td>
                <td className="p-0.5"><DmeValueCell fieldId={`${prefix}.${index}.standby`} label={`${row.parameter} standby`} value={row.standby} className="w-full" /></td>
                <td className="bg-[#111827] px-3 py-2 text-[#94a3b8]">{row.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
