"use client";

import { resolveVorField, useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function RmsLogsParameters() {
  const logs = useVorPmdtStore((state) => state.parameterChangeLogs).slice(0, 100);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <div className="pmdt-rms-log-screen pmdt-rms-log-list pmdt-rms-log-list--parameter-change">
      <div className="pmdt-rms-log-controls"><button type="button">Update</button><span /><button type="button">Reset</button></div>
      <table>
        <thead><tr><th>Time Tag</th><th>User Name</th><th>File</th><th>Parameter</th><th>State</th></tr></thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={`${log.timeTag}-${index}`}>
              <td data-vor-field-id={`rmsParameterLogs.${index}.timeTag`}>{resolveVorField(log.timeTag, `rmsParameterLogs.${index}.timeTag`, overrides)}</td>
              <td data-vor-field-id={`rmsParameterLogs.${index}.userName`}>{resolveVorField(log.userName, `rmsParameterLogs.${index}.userName`, overrides)}</td>
              <td data-vor-field-id={`rmsParameterLogs.${index}.file`}>{resolveVorField(log.file, `rmsParameterLogs.${index}.file`, overrides)}</td>
              <td data-vor-field-id={`rmsParameterLogs.${index}.parameter`}>{resolveVorField(log.parameter, `rmsParameterLogs.${index}.parameter`, overrides)}</td>
              <td>{log.state === "normal" ? "Normal" : log.state === "warning" ? "Alert Low" : "Alarm"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
