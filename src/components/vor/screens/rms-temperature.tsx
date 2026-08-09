"use client";

import { resolveVorField, useVorPmdtStore } from "@/stores/vor-pmdt-store";

function formatTemperature(value: number | null) {
  return value === null ? "" : Number(value).toFixed(0);
}

export function RmsTemperature() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <div className="pmdt-rms-table-screen pmdt-rms-temperature-screen p-3 text-[11px]">
      <section className="pmdt-rms-flat-panel border border-[#334155] bg-[#111827]">
        <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">Temperatures</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
              <tr>
                <th className="px-3 py-2">Parameter</th>
                <th className="px-2 py-2 text-right">Low</th>
                <th className="px-2 py-2 text-right">Pre-Low</th>
                <th className="px-3 py-2 text-right font-semibold text-[#cbd5e1]">Deg C</th>
                <th className="px-2 py-2 text-right">Pre-High</th>
                <th className="px-2 py-2 text-right">High</th>
              </tr>
            </thead>
            <tbody>
              {data.rmsTemperatureData.map((row, index) => {
                const prefix = `rmsTemperatureData.${index}`;
                const resolvedLow = resolveVorField(row.low, `${prefix}.low`, overrides);
                const resolvedPreLow = resolveVorField(row.preLow, `${prefix}.preLow`, overrides);
                const resolvedValue = resolveVorField(row.value, `${prefix}.value`, overrides);
                const resolvedPreHigh = resolveVorField(row.preHigh, `${prefix}.preHigh`, overrides);
                const resolvedHigh = resolveVorField(row.high, `${prefix}.high`, overrides);

                return (
                    <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                      <th scope="row" className="px-3 py-2 font-medium">{row.parameter}</th>
                      <td className="px-2 py-2 text-right font-mono text-gray-400">
                      {formatTemperature(resolvedLow as number | null)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-gray-400">
                      {formatTemperature(resolvedPreLow as number | null)}
                      </td>
                      <td data-vor-field-id={`${prefix}.value`} className="px-3 py-2 text-right font-mono font-semibold text-orange-400 bg-orange-950/10">
                      {formatTemperature(resolvedValue as number | null)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-gray-400">
                      {formatTemperature(resolvedPreHigh as number | null)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-gray-400">
                      {formatTemperature(resolvedHigh as number | null)}
                      </td>
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
