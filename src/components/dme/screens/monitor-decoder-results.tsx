"use client";

import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { DmeValueCell, ScreenTabs } from "./screen-primitives";

export function MonitorDecoderResults({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const rows = useDmePmdtStore((state) => state.data.decoderResults[monitorNumber === 1 ? "monitor1" : "monitor2"]);
  const prefix = `decoderResults.monitor${monitorNumber}`;
  return (
    <section className="flex min-h-full flex-col" aria-label={`Monitor ${monitorNumber} Test Results`}>
      <PmdtToolbar title={`Monitor ${monitorNumber} Test Results`} />
      <ScreenTabs tabs={[
        { id: "alarm-limits", label: "Alarm Limits", active: false, disabled: true },
        { id: "interrogator", label: "Interrogator", active: false, disabled: true },
        { id: "transponder", label: "Transponder", active: false, disabled: true },
        { id: "decoder", label: "Decoder", active: true },
      ]} />
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <table className="w-full min-w-[52rem] border-separate border-spacing-1 text-left text-[10px]">
          <caption className="sr-only">Monitor {monitorNumber} decoder test results</caption>
          <thead className="text-[#94a3b8]"><tr><th className="px-2 py-2">Test Parameter</th><th className="px-2 py-2 text-center">Low Limit</th><th className="px-2 py-2 text-center">Data</th><th className="px-2 py-2 text-center">High Limit</th><th className="px-2 py-2">Unit</th><th className="px-2 py-2 text-center">Result</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.parameter}>
                <th scope="row" className="bg-[#111827] px-3 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>
                <td className="p-0.5"><DmeValueCell fieldId={`${prefix}.${index}.lowLimit`} label={`${row.parameter} low limit`} value={row.lowLimit} status="gray" className="w-full" /></td>
                <td className="p-0.5"><DmeValueCell fieldId={`${prefix}.${index}.data`} label={`${row.parameter} data`} value={row.data} className="w-full" /></td>
                <td className="p-0.5"><DmeValueCell fieldId={`${prefix}.${index}.highLimit`} label={`${row.parameter} high limit`} value={row.highLimit} status="gray" className="w-full" /></td>
                <td className="bg-[#111827] px-2 py-2 text-[#94a3b8]">{row.unit}</td>
                <td className="p-0.5"><DmeValueCell fieldId={`${prefix}.${index}.result`} label={`${row.parameter} result`} value={row.result} className="w-full" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
