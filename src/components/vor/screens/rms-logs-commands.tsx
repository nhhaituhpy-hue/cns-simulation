"use client";

import { resolveVorField, useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function RmsLogsCommands() {
  const logs = useVorPmdtStore((state) => state.data.rmsCommandLogs).slice(0, 100);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <div className="pmdt-rms-log-screen pmdt-rms-log-list">
      <div className="pmdt-rms-log-controls"><button type="button">Update</button><span /> <button type="button">Reset</button></div>
      <table>
        <thead><tr><th>Time Tag</th><th>User Name</th><th>Command</th></tr></thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={`${log.timeTag}-${index}`}>
              <td data-vor-field-id={`rmsCommandLogs.${index}.timeTag`}>{resolveVorField(log.timeTag, `rmsCommandLogs.${index}.timeTag`, overrides)}</td>
              <td data-vor-field-id={`rmsCommandLogs.${index}.userName`}>{resolveVorField(log.userName, `rmsCommandLogs.${index}.userName`, overrides)}</td>
              <td data-vor-field-id={`rmsCommandLogs.${index}.command`}>{resolveVorField(log.command, `rmsCommandLogs.${index}.command`, overrides)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
