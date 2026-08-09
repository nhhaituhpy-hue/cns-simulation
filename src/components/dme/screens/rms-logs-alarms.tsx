"use client";

import { resolveDmeField, useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { dmeFieldMetadata } from "./screen-primitives";

export function RmsLogsAlarms() {
  const logs = useDmePmdtStore((state) => state.data.alarmLogs);
  const overrides = useDmePmdtStore((state) => state.overrides);

  return (
    <div className="dme-pmdt-trend-scroll">
      <table className="dme-pmdt-trend-table dme-pmdt-trend-table--alarms">
        <caption className="sr-only">Alarm log</caption>
        <thead>
          <tr><th>Time Tag</th><th>Type</th><th>Alarm</th><th>State</th></tr>
        </thead>
        <tbody>
          {logs.map((log, index) => {
            const prefix = `alarmLogs.${index}`;
            const timeTag = resolveDmeField(log.timeTag, `${prefix}.timeTag`, overrides);
            const type = resolveDmeField(log.type, `${prefix}.type`, overrides);
            const alarm = resolveDmeField(log.alarm, `${prefix}.alarm`, overrides);
            const state = resolveDmeField(log.state, `${prefix}.state`, overrides);
            return (
              <tr key={`${log.timeTag}-${log.type}-${index}`}>
                <td {...dmeFieldMetadata(`${prefix}.timeTag`, `Time Tag dòng ${index + 1}`, timeTag)}>{timeTag}</td>
                <td {...dmeFieldMetadata(`${prefix}.type`, `Type dòng ${index + 1}`, type)}>{type}</td>
                <td {...dmeFieldMetadata(`${prefix}.alarm`, `Nội dung Alarm dòng ${index + 1}`, alarm)}>{alarm}</td>
                <td {...dmeFieldMetadata(`${prefix}.state`, `State Alarm dòng ${index + 1}`, state)}>{state}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

