"use client";

import { resolveVorField, useVorPmdtStore } from "@/stores/vor-pmdt-store";

function formatAdValue(value: number) {
  return Number(value).toFixed(2);
}

export function RmsAdData() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <div className="pmdt-rms-table-screen pmdt-rms-ad-screen p-3 text-[11px]">
      <section className="pmdt-rms-flat-panel border border-[#334155] bg-[#111827]">
        <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">A/D Channels</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
              <tr>
                <th className="px-3 py-2">Parameter</th>
                <th className="px-2 py-2 text-right">Low</th>
                <th className="px-2 py-2 text-right">Pre-Low</th>
                <th className="px-3 py-2 text-right font-semibold text-[#cbd5e1]">Volts</th>
                <th className="px-2 py-2 text-right">Pre-High</th>
                <th className="px-2 py-2 text-right">High</th>
              </tr>
            </thead>
            <tbody>
              {data.rmsAdData.map((row, index) => {
                const prefix = `rmsAdData.${index}`;
                return (
                  <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                    <th scope="row" className="px-3 py-2 font-medium">{row.parameter}</th>
                    <td className="px-2 py-2 text-right font-mono text-gray-400">{formatAdValue(resolveVorField(row.low, `${prefix}.low`, overrides))}</td>
                    <td className="px-2 py-2 text-right font-mono text-gray-400">{formatAdValue(resolveVorField(row.preLow, `${prefix}.preLow`, overrides))}</td>
                    <td data-vor-field-id={`${prefix}.volts`} className="px-3 py-2 text-right font-mono font-semibold text-sky-400 bg-sky-950/10">
                      {formatAdValue(resolveVorField(row.volts, `${prefix}.volts`, overrides))}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-gray-400">{formatAdValue(resolveVorField(row.preHigh, `${prefix}.preHigh`, overrides))}</td>
                    <td className="px-2 py-2 text-right font-mono text-gray-400">{formatAdValue(resolveVorField(row.high, `${prefix}.high`, overrides))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
