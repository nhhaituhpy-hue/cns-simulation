"use client";

import { resolveDmeField, useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { dmeFieldMetadata } from "./screen-primitives";

export function RmsLogsMaintenance() {
  const logs = useDmePmdtStore((state) => state.data.maintenanceLogs);
  const overrides = useDmePmdtStore((state) => state.overrides);

  return (
    <div className="dme-pmdt-trend-scroll">
      <table className="dme-pmdt-trend-table dme-pmdt-trend-table--maintenance">
        <caption className="sr-only">Maintenance alert log</caption>
        <thead>
          <tr><th>Time Tag</th><th>Type</th><th>Alert</th><th>State</th></tr>
        </thead>
        <tbody>
          {logs.map((log, index) => {
            const prefix = `maintenanceLogs.${index}`;
            const timeTag = resolveDmeField(log.timeTag, `${prefix}.timeTag`, overrides);
            const type = resolveDmeField(log.type, `${prefix}.type`, overrides);
            const alert = resolveDmeField(log.alert, `${prefix}.alert`, overrides);
            const state = resolveDmeField(log.state, `${prefix}.state`, overrides);
            return (
              <tr key={`${log.timeTag}-${log.type}-${index}`}>
                <td {...dmeFieldMetadata(`${prefix}.timeTag`, `Time Tag dòng ${index + 1}`, timeTag)}>{timeTag}</td>
                <td {...dmeFieldMetadata(`${prefix}.type`, `Type dòng ${index + 1}`, type)}>{type}</td>
                <td {...dmeFieldMetadata(`${prefix}.alert`, `Nội dung Maintenance Alert dòng ${index + 1}`, alert)}>{alert}</td>
                <td {...dmeFieldMetadata(`${prefix}.state`, `State Maintenance Alert dòng ${index + 1}`, state)}>{state}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

