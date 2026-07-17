"use client";

import {
  resolveVorField,
  resolveVorStatus,
  useVorPmdtStore,
} from "@/stores/vor-pmdt-store";

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
          {logs.map((log, index) => {
            const prefix = `maintenanceLogs.${index}`;
            const timeTag = resolveVorField(log.timeTag, `${prefix}.timeTag`, overrides);
            const type = resolveVorField(log.type, `${prefix}.type`, overrides);
            const alert = resolveVorField(log.alert, `${prefix}.alert`, overrides);
            const state = resolveVorField(log.state, `${prefix}.state`, overrides);
            const stateStatus = resolveVorStatus(
              state === "Normal" ? "normal" : "warning",
              `${prefix}.state`,
              overrides,
            );
            return (
              <tr key={`${log.timeTag}-${log.type}-${index}`} className="border-t border-[#273449] bg-[#111827] text-[#cbd5e1] even:bg-[#0f172a]">
                <td data-vor-field-id={`${prefix}.timeTag`} data-vor-field-label={`Time Tag dòng ${index + 1}`} data-vor-field-value={String(timeTag)} data-vor-field-type="string" className="px-3 py-2 font-mono tabular-nums text-[#94a3b8]">{timeTag}</td>
                <td data-vor-field-id={`${prefix}.type`} data-vor-field-label={`Type dòng ${index + 1}`} data-vor-field-value={String(type)} data-vor-field-type="string" className="px-3 py-2">{type}</td>
                <td data-vor-field-id={`${prefix}.alert`} data-vor-field-label={`Nội dung Maintenance Alert dòng ${index + 1}`} data-vor-field-value={String(alert)} data-vor-field-type="string" className="px-3 py-2">{alert}</td>
                <td data-vor-field-id={`${prefix}.state`} data-vor-field-label={`State Maintenance Alert dòng ${index + 1}`} data-vor-field-value={String(state)} data-vor-field-type="string" data-vor-field-status={stateStatus} className={`px-3 py-2 font-semibold ${stateStatus === "warning" ? "text-[#eab308]" : "text-[#22c55e]"}`}>{state}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
