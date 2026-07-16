"use client";

import type { VorIndicatorColor } from "@/lib/vor-types";
import {
  resolveVorField,
  resolveVorStatus,
  useVorPmdtStore,
} from "@/stores/vor-pmdt-store";

const statusClasses: Record<VorIndicatorColor, string> = {
  green: "bg-[#0f3a1f] text-[#bbf7d0]", yellow: "bg-[#3a2f0f] text-[#fef08a]",
  red: "bg-[#3a0f0f] text-[#fecaca]", gray: "bg-[#1e293b] text-[#94a3b8]",
};

export function TxConfigOffsets() {
  const rows = useVorPmdtStore((state) => state.data.txOffsets);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <div className="max-h-[calc(100dvh-15rem)] overflow-auto p-3">
      <table className="w-full min-w-[42rem] border-separate border-spacing-1 text-left text-[11px]">
        <thead className="sticky top-0 z-10 bg-[#0a0e1a] text-[#cbd5e1]"><tr><th className="px-3 py-2">Parameter</th><th className="px-3 py-2 text-center">Tx #1</th><th className="px-3 py-2 text-center">Tx #2</th><th className="px-3 py-2">Unit</th></tr></thead>
        <tbody>{rows.map((row, index) => (
          <tr key={row.parameter}>
            <th scope="row" className="bg-[#111827] px-3 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>
            {(["tx1", "tx2"] as const).map((tx) => {
              const fieldId = `txOffsets.${index}.${tx}`;
              const value = resolveVorField(row[tx], fieldId, overrides);
              const status = resolveVorStatus("green", fieldId, overrides);
              return <td key={tx} data-vor-field-id={fieldId} className={`px-3 py-2 text-center font-mono tabular-nums ${statusClasses[status]}`}>{value}</td>;
            })}
            <td className="bg-[#111827] px-3 py-2 text-[#94a3b8]">{row.unit}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
