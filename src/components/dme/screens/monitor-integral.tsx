"use client";

import {
  resolveDmeField,
  resolveDmeStatus,
  useDmePmdtStore,
} from "@/stores/dme-pmdt-store";
import { DmeValueCell } from "./screen-primitives";

export function MonitorDataTable({ kind }: { kind: "integral" | "standby" }) {
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);
  const rows = kind === "integral" ? data.integralData : data.standbyData;
  const prefix = kind === "integral" ? "integralData" : "standbyData";

  return (
    <div className="p-3">
      <div className="mb-2 grid grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(10rem,0.8fr)_5rem] gap-1 text-[10px] text-[#94a3b8]">
        <span />
        <time className="text-center font-mono">{data.timestamp}</time>
        <time className="text-center font-mono">{data.timestamp}</time>
        <span />
      </div>
      <table className="w-full min-w-[42rem] border-separate border-spacing-1 text-left text-[11px]">
        <caption className="sr-only">{kind === "integral" ? "Integral" : "Standby"} all monitor data</caption>
        <thead className="text-[#cbd5e1]">
          <tr><th className="px-3 py-2">Parameter</th><th className="px-3 py-2 text-center">Monitor 1</th><th className="px-3 py-2 text-center">Monitor 2</th><th className="px-3 py-2">Unit</th></tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.label}>
              <th scope="row" className="bg-[#111827] px-3 py-2 font-medium text-[#cbd5e1]">{row.label}</th>
              {([1, 2] as const).map((monitor) => {
                const valueKey = monitor === 1 ? "mon1Value" : "mon2Value";
                const statusKey = monitor === 1 ? "mon1Status" : "mon2Status";
                const fieldId = `${prefix}.${index}.${valueKey}`;
                const value = resolveDmeField(row[valueKey], fieldId, overrides);
                const status = resolveDmeStatus(row[statusKey], fieldId, overrides);
                return (
                  <td key={monitor} className="p-0.5 text-center">
                    <DmeValueCell fieldId={fieldId} label={`${kind} ${row.label} Monitor ${monitor}`} value={value} status={status} className="w-full" />
                  </td>
                );
              })}
              <td className="bg-[#111827] px-3 py-2 text-[#94a3b8]">{row.unit || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
