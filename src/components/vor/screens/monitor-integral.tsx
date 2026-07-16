"use client";

import type { VorIndicatorColor } from "@/lib/vor-types";
import {
  resolveVorField,
  resolveVorStatus,
  useVorPmdtStore,
} from "@/stores/vor-pmdt-store";

const statusClasses: Record<VorIndicatorColor, string> = {
  green: "border-[#1d6837] bg-[#0f3a1f] text-[#bbf7d0]",
  yellow: "border-[#745f17] bg-[#3a2f0f] text-[#fef08a]",
  red: "border-[#7f1d1d] bg-[#3a0f0f] text-[#fecaca]",
  gray: "border-[#475569] bg-[#1e293b] text-[#94a3b8]",
};

export function MonitorIntegral() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <div className="p-3">
      <div className="mb-2 grid grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(10rem,0.8fr)_5rem] gap-1 text-[10px] text-[#94a3b8]">
        <span />
        <time className="text-center font-mono">{data.timestamp}</time>
        <time className="text-center font-mono">{data.timestamp}</time>
        <span />
      </div>
      <table className="w-full min-w-[42rem] border-separate border-spacing-1 text-left text-[11px]">
        <thead className="text-[#cbd5e1]"><tr><th className="px-3 py-2">Parameter</th><th className="px-3 py-2 text-center">Monitor #1</th><th className="px-3 py-2 text-center">Monitor #2</th><th className="px-3 py-2">Unit</th></tr></thead>
        <tbody>
          {data.integralData.map((row, index) => (
            <tr key={row.label}>
              <th scope="row" className="bg-[#111827] px-3 py-2 font-medium text-[#cbd5e1]">{row.label}</th>
              {([1, 2] as const).map((monitor) => {
                const valueKey = monitor === 1 ? "mon1Value" : "mon2Value";
                const statusKey = monitor === 1 ? "mon1Status" : "mon2Status";
                const fieldId = `integralData.${index}.${valueKey}`;
                const value = resolveVorField(row[valueKey], fieldId, overrides);
                const status = resolveVorStatus(row[statusKey], fieldId, overrides);
                return (
                  <td key={monitor} data-vor-field-id={fieldId} className={`border px-3 py-2 text-center font-mono font-semibold tabular-nums ${statusClasses[status]}`}>
                    {value}
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
