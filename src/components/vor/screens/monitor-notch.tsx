"use client";

import { resolveVorField, useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function MonitorNotch() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);
  const notchRouting = data.monitorConfigGeneral.find((row) => row.parameter === "Notch Monitor");
  const monitorValuesEnabled = Boolean(notchRouting?.primary || notchRouting?.secondary);
  const columns = [
    data.notchData.slice(0, 16),
    data.notchData.slice(16, 32),
    data.notchData.slice(32, 48),
  ];

  return (
    <section className="pmdt-monitor-notch" aria-label="Notch monitor">
      <div className="pmdt-notch-toolbar">
        <input aria-label="Notch baseline command" readOnly value="" />
        <span />
        <button type="button" disabled>Record Baseline</button>
        <time className="pmdt-monitor-date">{data.timestamp}</time>
      </div>
      <div className="pmdt-notch-columns">
        {columns.map((column, columnIndex) => (
          <table key={columnIndex}>
            <colgroup>
              <col className="pmdt-notch-antenna-col" />
              <col className="pmdt-notch-value-col" />
              <col className="pmdt-notch-value-col" />
              <col className="pmdt-notch-value-col" />
            </colgroup>
            <thead><tr><th scope="col">Antenna</th><th scope="col">Baseline</th><th scope="col">Mon 1</th><th scope="col">Mon 2</th></tr></thead>
            <tbody>
              {column.map((row, rowIndex) => {
                const index = columnIndex * 16 + rowIndex;
                const prefix = `notchData.${index}`;
                const baseline = resolveVorField(row.baseline, `${prefix}.baseline`, overrides);
                const mon1 = monitorValuesEnabled
                  ? resolveVorField(row.mon1, `${prefix}.mon1`, overrides)
                  : null;
                const mon2 = monitorValuesEnabled
                  ? resolveVorField(row.mon2, `${prefix}.mon2`, overrides)
                  : null;
                return (
                  <tr key={row.antenna}>
                    <th scope="row">{row.antenna}</th>
                    <td><input aria-label={`${prefix}.baseline`} readOnly value={Number(baseline).toFixed(1)} /></td>
                    <td><input aria-label={`${prefix}.mon1`} readOnly value={mon1 === null ? "" : Number(mon1).toFixed(1)} /></td>
                    <td><input aria-label={`${prefix}.mon2`} readOnly value={mon2 === null ? "" : Number(mon2).toFixed(1)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}
      </div>
    </section>
  );
}
