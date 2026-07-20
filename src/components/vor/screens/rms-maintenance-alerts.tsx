"use client";

import type { VorIndicatorColor } from "@/lib/vor-types";
import { resolveVorField, resolveVorStatus, useVorPmdtStore } from "@/stores/vor-pmdt-store";

const alertColumns = [
  { key: "mon1", label: "Mon 1" },
  { key: "mon2", label: "Mon 2" },
  { key: "agen1", label: "AGen 1" },
  { key: "agen2", label: "AGen 2" },
] as const;

const accentClasses: Record<VorIndicatorColor, string> = {
  green: "accent-[#22c55e]",
  yellow: "accent-[#eab308]",
  red: "accent-[#ef4444]",
  gray: "accent-[#475569]",
};

const textClasses: Record<VorIndicatorColor, string> = {
  green: "text-[#22c55e]",
  yellow: "text-[#eab308]",
  red: "text-[#ef4444]",
  gray: "text-[#94a3b8]",
};

export function RmsMaintenanceAlerts() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <div className="grid gap-3 p-3 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(28rem,1.5fr)]">
      <section className="border border-[#334155] bg-[#111827]" aria-labelledby="general-alerts-title">
        <h3 id="general-alerts-title" className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">
          General Alerts
        </h3>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 p-3">
          {data.generalAlerts.map((alert) => {
            const fieldId = `generalAlerts.${alert.id}.checked`;
            const checked = resolveVorField(alert.checked, fieldId, overrides);
            const status = resolveVorStatus(checked ? "red" : "gray", fieldId, overrides);
            return (
              <label
                key={alert.id}
                data-vor-field-id={fieldId}
                data-vor-field-value={alert.checked}
                data-vor-field-type="boolean"
                data-vor-field-label={alert.label}
                className="flex min-h-7 items-center gap-2 border border-transparent px-1 text-[11px] text-[#cbd5e1] hover:border-[#334155] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className={`size-3.5 pointer-events-none ${accentClasses[status]}`}
                />
                <span className={status === "gray" ? "" : textClasses[status]}>{alert.label}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="min-w-0 border border-[#334155] bg-[#111827]" aria-labelledby="monitor-alerts-title">
        <h3 id="monitor-alerts-title" className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">
          Monitor / Audio Generator Alerts
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-[11px]">
            <thead className="bg-[#172033] text-[#94a3b8]">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Alert</th>
                {alertColumns.map((column) => (
                  <th key={column.key} scope="col" className="w-20 px-2 py-2 text-center font-semibold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.monitorAgenAlerts.map((row, rowIndex) => (
                <tr key={row.label} className="border-t border-[#273449] text-[#cbd5e1]">
                  <th scope="row" className="px-3 py-2 font-medium">{row.label}</th>
                  {alertColumns.map((column) => {
                    const fieldId = `monitorAgenAlerts.${rowIndex}.${column.key}`;
                    const checked = resolveVorField(row[column.key], fieldId, overrides);
                    const status = resolveVorStatus(checked ? "red" : "gray", fieldId, overrides);
                    return (
                      <td
                        key={column.key}
                        data-vor-field-id={fieldId}
                        data-vor-field-value={row[column.key]}
                        data-vor-field-type="boolean"
                        data-vor-field-label={`${row.label} ${column.label}`}
                        className="px-2 py-2 text-center"
                      >
                        <input
                          aria-label={`${row.label}, ${column.label}`}
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className={`size-3.5 pointer-events-none ${accentClasses[status]}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
