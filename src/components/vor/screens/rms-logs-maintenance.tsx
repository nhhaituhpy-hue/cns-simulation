"use client";

import { resolveVorField, useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function RmsLogsMaintenance() {
  const logs = useVorPmdtStore((state) => state.data.maintenanceLogs).slice(0, 100);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <div className="max-h-[calc(100dvh-15rem)] overflow-auto p-3">
      <table className="w-full min-w-[42rem] border-collapse text-left text-[11px]">
        <caption className="sr-only">Maintenance alert log, tối đa 100 bản ghi</caption>
        <thead className="sticky top-0 z-10 bg-[#1e293b] text-[#cbd5e1]">
          <tr><th className="w-44 px-3 py-2">Time Tag</th><th className="w-36 px-3 py-2">Type</th><th className="px-3 py-2">Alert</th><th className="w-24 px-3 py-2">State</th></tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={`${log.timeTag}-${log.type}-${index}`} className="border-t border-[#273449] bg-[#111827] text-[#cbd5e1] even:bg-[#0f172a]">
              <td className="px-3 py-2 font-mono tabular-nums text-[#94a3b8]">{log.timeTag}</td>
              <td className="px-3 py-2">{log.type}</td>
              <td data-vor-field-id={`maintenanceLogs.${index}.alert`} data-vor-field-label={`Nội dung Maintenance Alert dòng ${index + 1}`} data-vor-field-value={String(resolveVorField(log.alert, `maintenanceLogs.${index}.alert`, overrides))} data-vor-field-type="string" className="px-3 py-2">{resolveVorField(log.alert, `maintenanceLogs.${index}.alert`, overrides)}</td>
              <td className={`px-3 py-2 font-semibold ${log.state === "Alert" ? "text-[#eab308]" : "text-[#22c55e]"}`}>{log.state}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
