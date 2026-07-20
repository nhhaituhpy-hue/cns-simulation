"use client";

import type { DmeIndicatorColor } from "@/lib/dme-types";
import { resolveDmeStatus, useDmePmdtStore } from "@/stores/dme-pmdt-store";

const indicatorClasses: Record<DmeIndicatorColor, string> = {
  green: "bg-[#22c55e]",
  yellow: "bg-[#eab308]",
  red: "bg-[#ef4444]",
  gray: "bg-[#6b7280]",
};

function Indicator({ color, label }: { color: DmeIndicatorColor; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={`${label}: ${color}`}>
      <span aria-hidden className={`size-2.5 rounded-full border border-black/40 ${indicatorClasses[color]}`} />
      <span className="sr-only">{label}: {color}</span>
    </span>
  );
}

export function RmsMaintenanceAlerts() {
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);

  return (
    <div className="p-3 text-[11px]">
      <section className="border border-[#334155] bg-[#111827] max-w-xl mx-auto">
        <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">
          Active Maintenance Alerts (RTC Status)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
              <tr>
                <th className="px-3 py-2">Alert Parameter</th>
                <th className="px-3 py-2 text-center w-24">Transmitter 1</th>
                <th className="px-3 py-2 text-center w-24">Transmitter 2</th>
              </tr>
            </thead>
            <tbody>
              {data.rtcMaintenanceAlerts.map((row, index) => {
                const prefix = `rtcMaintenanceAlerts.${index}`;
                const colorTx1 = resolveDmeStatus(row.tx1, `${prefix}.tx1`, overrides);
                const colorTx2 = resolveDmeStatus(row.tx2, `${prefix}.tx2`, overrides);

                return (
                  <tr key={row.label} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                    <th scope="row" className="px-3 py-2 font-medium">{row.label}</th>
                    <td data-dme-field-id={`${prefix}.tx1`} className="px-3 py-2 text-center">
                      <Indicator color={colorTx1} label={`${row.label} Tx1`} />
                    </td>
                    <td data-dme-field-id={`${prefix}.tx2`} className="px-3 py-2 text-center">
                      <Indicator color={colorTx2} label={`${row.label} Tx2`} />
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
