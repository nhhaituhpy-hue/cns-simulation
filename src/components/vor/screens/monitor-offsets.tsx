"use client";

import type { VorIndicatorColor } from "@/lib/vor-types";
import {
  resolveVorField,
  resolveVorStatus,
  useVorPmdtStore,
} from "@/stores/vor-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";

const statusClasses: Record<VorIndicatorColor, string> = {
  green: "bg-[#0f3a1f] text-[#bbf7d0]", yellow: "bg-[#3a2f0f] text-[#fef08a]",
  red: "bg-[#3a0f0f] text-[#fecaca]", gray: "bg-[#1e293b] text-[#94a3b8]",
};

export function MonitorOffsets({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const rows = useVorPmdtStore((state) => state.data.monitorOffsets);
  const overrides = useVorPmdtStore((state) => state.overrides);
  const columns = [
    { key: "integral", label: "Integral" },
    { key: "standby", label: "Standby" },
    { key: "testGen", label: "Test Gen / Cert" },
  ] as const;

  return (
    <section className="flex min-h-full flex-col">
      <PmdtToolbar title={`Monitor ${monitorNumber} Offsets & Scale Factors`} />
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <table className="w-full min-w-[42rem] border-separate border-spacing-1 text-left text-[11px]">
          <thead className="text-[#cbd5e1]"><tr><th className="px-3 py-2">Parameter</th>{columns.map((column) => <th key={column.key} className="px-3 py-2 text-center">{column.label}</th>)}<th className="px-3 py-2">Unit</th></tr></thead>
          <tbody>{rows.map((row, index) => (
            <tr key={row.parameter}>
              <th scope="row" className="bg-[#111827] px-3 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>
              {columns.map((column) => {
                const fieldId = `monitorOffsets.${monitorNumber}.${index}.${column.key}`;
                const value = resolveVorField(row[column.key], fieldId, overrides);
                const status = resolveVorStatus("green", fieldId, overrides);
                return <td key={column.key} data-vor-field-id={fieldId} className={`px-3 py-2 text-center font-mono tabular-nums ${statusClasses[status]}`}>{value ?? "-"}</td>;
              })}
              <td className="bg-[#111827] px-3 py-2 text-[#94a3b8]">{row.unit || "-"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
