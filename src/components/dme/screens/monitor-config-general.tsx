"use client";

import { resolveDmeField, resolveDmeStatus, useDmePmdtStore } from "@/stores/dme-pmdt-store";
import type { DmeIndicatorColor } from "@/lib/dme-types";

const accentClasses: Record<DmeIndicatorColor, string> = {
  green: "accent-[#22c55e]",
  yellow: "accent-[#eab308]",
  red: "accent-[#ef4444]",
  gray: "accent-[#475569]",
};

export function MonitorConfigGeneral() {
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);

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
                const isEnabled = row.isCheckbox ? resolveDmeField(row.checked ?? false, `${prefix}.checked`, overrides) : true;
                const resolvedPrimary = resolveDmeField(row.primary, `${prefix}.primary`, overrides);
                const resolvedSecondary = resolveDmeField(row.secondary, `${prefix}.secondary`, overrides);

                return (
                  <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                    <th scope="row" className="px-3 py-2 font-medium">
                      {row.isCheckbox ? (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            data-dme-field-id={`${prefix}.checked`}
                            data-dme-field-value={Boolean(row.checked)}
                            data-dme-field-type="boolean"
                            data-dme-field-label={row.parameter}
                            readOnly
                            checked={Boolean(isEnabled)}
                            className={`size-3.5 pointer-events-none ${accentClasses[resolveDmeStatus(isEnabled ? "green" : "gray", `${prefix}.checked`, overrides)]}`}
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
                        data-dme-field-id={`${prefix}.primary`}
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
                        data-dme-field-id={`${prefix}.secondary`}
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
