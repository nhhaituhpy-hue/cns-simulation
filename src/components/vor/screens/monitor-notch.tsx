"use client";

import { resolveVorField, useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function MonitorNotch() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);

  // Divide 48 antennas into 3 sub-arrays for a 3-column layout
  const cols = [
    data.notchData.slice(0, 16),
    data.notchData.slice(16, 32),
    data.notchData.slice(32, 48),
  ];

  return (
    <div className="grid gap-3 p-3 text-[11px] md:grid-cols-3">
      {cols.map((colData, colIdx) => (
        <section key={colIdx} className="border border-[#334155] bg-[#111827]">
          <table className="w-full text-left">
            <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
              <tr>
                <th className="px-2 py-1.5 text-center">Ant</th>
                <th className="px-2 py-1.5 text-right">Baseline</th>
                <th className="px-2 py-1.5 text-right font-semibold text-[#cbd5e1]">Mon 1</th>
                <th className="px-2 py-1.5 text-right font-semibold text-[#cbd5e1]">Mon 2</th>
              </tr>
            </thead>
            <tbody>
              {colData.map((row) => {
                // Calculate absolute index in the main 48-item array
                const index = colIdx * 16 + (row.antenna - 1);
                const prefix = `notchData.${index}`;

                const resolvedBaseline = resolveVorField(row.baseline, `${prefix}.baseline`, overrides);
                const resolvedMon1 = resolveVorField(row.mon1, `${prefix}.mon1`, overrides);
                const resolvedMon2 = resolveVorField(row.mon2, `${prefix}.mon2`, overrides);

                return (
                  <tr key={row.antenna} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                    <td className="px-2 py-1.5 text-center font-medium text-gray-400 bg-[#0f172a]/40">{row.antenna}</td>
                    <td
                      data-vor-field-id={`${prefix}.baseline`}
                      data-vor-field-value={row.baseline}
                      data-vor-field-type="number"
                      data-vor-field-label={`Antenna ${row.antenna} Baseline`}
                      className="px-2 py-1.5 text-right font-mono text-gray-400"
                    >
                      {Number(resolvedBaseline).toFixed(2)}
                    </td>
                    <td
                      data-vor-field-id={`${prefix}.mon1`}
                      data-vor-field-value={row.mon1}
                      data-vor-field-type="number"
                      data-vor-field-label={`Antenna ${row.antenna} Mon 1`}
                      className="px-2 py-1.5 text-right font-mono text-emerald-400 bg-emerald-950/10"
                    >
                      {Number(resolvedMon1).toFixed(2)}
                    </td>
                    <td
                      data-vor-field-id={`${prefix}.mon2`}
                      data-vor-field-value={row.mon2}
                      data-vor-field-type="number"
                      data-vor-field-label={`Antenna ${row.antenna} Mon 2`}
                      className="px-2 py-1.5 text-right font-mono text-emerald-400 bg-emerald-950/10"
                    >
                      {Number(resolvedMon2).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
