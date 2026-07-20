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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="min-w-0 border border-[#334155] bg-[#111827]"><h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold">{title}</h3>{children}</section>;
}

export function TxDataMain() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <div className="grid gap-3 p-3 xl:grid-cols-2">
      <Panel title="Power">
        <table className="w-full text-left text-[11px]"><thead className="bg-[#172033] text-[#94a3b8]"><tr><th className="px-3 py-2">Parameter</th><th className="px-3 py-2 text-right">Tx #1</th><th className="px-3 py-2 text-right">Tx #2</th><th className="px-3 py-2">Unit</th></tr></thead>
          <tbody>{data.txPower.map((row, index) => <tr key={row.parameter} className="border-t border-[#273449]"><th scope="row" className="px-3 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>{(["tx1", "tx2"] as const).map((tx) => {
            const fieldId = `txPower.${index}.${tx}`;
            const value = resolveVorField(row[tx], fieldId, overrides);
            const status = resolveVorStatus("green", fieldId, overrides);
            return (
              <td
                key={tx}
                data-vor-field-id={fieldId}
                data-vor-field-value={row[tx]}
                data-vor-field-type="number"
                data-vor-field-label={`${row.parameter} Tx ${tx === "tx1" ? "1" : "2"}`}
                className={`px-3 py-2 text-right font-mono tabular-nums ${statusClasses[status]}`}
              >
                {Number(value).toFixed(index === 0 ? 1 : 3)}
              </td>
            );
          })}<td className="px-3 py-2 text-[#94a3b8]">{row.unit}</td></tr>)}</tbody>
        </table>
      </Panel>

      <Panel title="VSWR">
        <table className="w-full text-left text-[11px]"><thead className="bg-[#172033] text-[#94a3b8]"><tr><th className="px-3 py-2">Parameter</th><th className="px-3 py-2 text-right">VSWR</th></tr></thead>
          <tbody>{data.txVswr.map((row, index) => {
            const fieldId = `txVswr.${index}.value`;
            const value = resolveVorField(row.value, fieldId, overrides);
            const status = resolveVorStatus("green", fieldId, overrides);
            return (
              <tr key={row.parameter} className="border-t border-[#273449]">
                <th scope="row" className="px-3 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>
                <td
                  data-vor-field-id={fieldId}
                  data-vor-field-value={row.value}
                  data-vor-field-type="number"
                  data-vor-field-label={`${row.parameter} VSWR`}
                  className={`px-3 py-2 text-right font-mono tabular-nums ${statusClasses[status]}`}
                >
                  {Number(value).toFixed(2)}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </Panel>

      <Panel title="Frequency">
        <table className="w-full text-left text-[11px]"><thead className="bg-[#172033] text-[#94a3b8]"><tr><th className="px-3 py-2">Parameter</th><th className="px-3 py-2 text-right">Value 1</th><th className="px-3 py-2 text-right">Value 2</th><th className="px-3 py-2">Unit</th></tr></thead>
          <tbody>{data.txFrequency.map((row, index) => <tr key={row.parameter} className="border-t border-[#273449]"><th scope="row" className="px-3 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>{(["value1", "value2"] as const).map((key) => {
            const fieldId = `txFrequency.${index}.${key}`;
            const value = resolveVorField(row[key], fieldId, overrides);
            const status = resolveVorStatus("green", fieldId, overrides);
            const digits = index < 3 ? 4 : index < 5 ? 2 : 0;
            return (
              <td
                key={key}
                data-vor-field-id={fieldId}
                data-vor-field-value={row[key] ?? ""}
                data-vor-field-type="number"
                data-vor-field-label={`${row.parameter} ${key === "value1" ? "Value 1" : "Value 2"}`}
                className={`px-3 py-2 text-right font-mono tabular-nums ${statusClasses[status]}`}
              >
                {value === null ? "-" : Number(value).toFixed(digits)}
              </td>
            );
          })}<td className="px-3 py-2 text-[#94a3b8]">{row.unit}</td></tr>)}</tbody>
        </table>
      </Panel>
    </div>
  );
}
