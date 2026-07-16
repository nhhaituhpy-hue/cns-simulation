"use client";

import { useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function RmsLogsAlarms() {
  const logs = useVorPmdtStore((state) => state.data.alarmLogs).slice(0, 100);

  return (
    <div className="max-h-[calc(100dvh-15rem)] overflow-auto p-3">
      <table className="w-full min-w-[42rem] border-collapse text-left text-[11px]">
        <caption className="sr-only">Alarm log, tối đa 100 bản ghi</caption>
        <thead className="sticky top-0 z-10 bg-[#1e293b] text-[#cbd5e1]">
          <tr><th className="w-44 px-3 py-2">Time Tag</th><th className="w-36 px-3 py-2">Type</th><th className="px-3 py-2">Alarm</th><th className="w-24 px-3 py-2">State</th></tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={`${log.timeTag}-${log.type}-${index}`} className="border-t border-[#273449] bg-[#111827] text-[#cbd5e1] even:bg-[#0f172a]">
              <td className="px-3 py-2 font-mono tabular-nums text-[#94a3b8]">{log.timeTag}</td>
              <td className="px-3 py-2">{log.type}</td>
              <td className="px-3 py-2">{log.alarm}</td>
              <td className={`px-3 py-2 font-semibold ${log.state === "Alarm" ? "text-[#ef4444]" : "text-[#22c55e]"}`}>{log.state}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
