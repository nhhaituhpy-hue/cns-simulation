"use client";

import { resolveVorField, useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function MonitorConfigGeneral() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <div className="p-3 text-[11px]">
      <section className="border border-[#334155] bg-[#111827] max-w-2xl mx-auto">
        <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">
          Parameter Monitoring Routing
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
              <tr>
                <th className="px-3 py-2">Parameter</th>
                <th className="px-3 py-2 text-center w-28">Primary Monitor</th>
                <th className="px-3 py-2 text-center w-28">Secondary Monitor</th>
              </tr>
            </thead>
            <tbody>
              {data.monitorConfigGeneral.map((row, index) => {
                const prefix = `monitorConfigGeneral.${index}`;
                const isEnabled = row.isCheckbox ? resolveVorField(row.checked ?? false, `${prefix}.checked`, overrides) : true;
                const resolvedPrimary = resolveVorField(row.primary, `${prefix}.primary`, overrides);
                const resolvedSecondary = resolveVorField(row.secondary, `${prefix}.secondary`, overrides);

                return (
                  <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                    <th scope="row" className="px-3 py-2 font-medium">
                      {row.isCheckbox ? (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            data-vor-field-id={`${prefix}.checked`}
                            disabled
                            checked={Boolean(isEnabled)}
                            className="accent-[#22c55e] disabled:opacity-80"
                          />
                          {row.parameter}
                        </label>
                      ) : (
                        <span>{row.parameter}</span>
                      )}
                    </th>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="radio"
                        data-vor-field-id={`${prefix}.primary`}
                        name={`param-routing-${index}`}
                        disabled={!isEnabled}
                        checked={Boolean(resolvedPrimary)}
                        className="accent-[#22c55e] disabled:opacity-30 cursor-pointer"
                        onChange={() => {}}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="radio"
                        data-vor-field-id={`${prefix}.secondary`}
                        name={`param-routing-${index}`}
                        disabled={!isEnabled}
                        checked={Boolean(resolvedSecondary)}
                        className="accent-[#22c55e] disabled:opacity-30 cursor-pointer"
                        onChange={() => {}}
                      />
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
