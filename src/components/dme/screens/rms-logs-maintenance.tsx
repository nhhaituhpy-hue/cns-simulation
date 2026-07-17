"use client";

import { resolveDmeField, useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { dmeFieldMetadata, DmeValueCell } from "./screen-primitives";

export function RmsLogsMaintenance() {
  const logs = useDmePmdtStore((state) => state.data.maintenanceLogs).slice(0, 100);
  const overrides = useDmePmdtStore((state) => state.overrides);

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
            const timeTag = resolveDmeField(log.timeTag, `${prefix}.timeTag`, overrides);
            const type = resolveDmeField(log.type, `${prefix}.type`, overrides);
            const alert = resolveDmeField(log.alert, `${prefix}.alert`, overrides);
            const state = resolveDmeField(log.state, `${prefix}.state`, overrides);
            const stateStatus = state === "Normal" ? "normal" : "warning";
            return (
              <tr key={`${log.timeTag}-${log.type}-${index}`} className="border-t border-[#273449] bg-[#111827] text-[#cbd5e1] even:bg-[#0f172a]">
                <td {...dmeFieldMetadata(`${prefix}.timeTag`, `Time Tag dòng ${index + 1}`, timeTag)} className="px-3 py-2 font-mono tabular-nums text-[#94a3b8]">{timeTag}</td>
                <td {...dmeFieldMetadata(`${prefix}.type`, `Type dòng ${index + 1}`, type)} className="px-3 py-2">{type}</td>
                <td {...dmeFieldMetadata(`${prefix}.alert`, `Nội dung Maintenance Alert dòng ${index + 1}`, alert)} className="px-3 py-2">{alert}</td>
                <td className="p-1"><DmeValueCell fieldId={`${prefix}.state`} label={`State Maintenance Alert dòng ${index + 1}`} value={state} status={stateStatus} className="w-full" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

