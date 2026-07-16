"use client";

import {
  resolveVorField,
  useVorPmdtStore,
} from "@/stores/vor-pmdt-store";

function ReadOnlyValue({ fieldId, value, unit }: { fieldId: string; value: number; unit: string }) {
  const overrides = useVorPmdtStore((state) => state.overrides);
  const resolved = resolveVorField(value, fieldId, overrides);
  return (
    <label data-vor-field-id={fieldId} className="grid grid-cols-[1fr_3rem] items-center gap-1">
      <input aria-label={fieldId} readOnly value={resolved} className="h-7 min-w-0 border border-[#475569] bg-[#0f172a] px-2 text-right font-mono text-[11px] tabular-nums text-[#e2e8f0] outline-none" />
      <span className="text-[10px] text-[#94a3b8]">{unit}</span>
    </label>
  );
}

export function MonitorAlarmLimits() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);
  const columns = ["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] as const;

  return (
    <div className="grid gap-3 p-3">
      <section className="grid gap-3 border border-[#334155] bg-[#111827] p-3 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold text-[#e2e8f0]">Azimuth Limits</h3>
          <div className="grid grid-cols-2 gap-3">
            <ReadOnlyValue fieldId="monitorAzimuthLimits.preAlarm" value={data.monitorAzimuthLimits.preAlarm} unit="± °" />
            <ReadOnlyValue fieldId="monitorAzimuthLimits.alarm" value={data.monitorAzimuthLimits.alarm} unit="± °" />
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold text-[#e2e8f0]">Timers</h3>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["shutdown", "Shutdown"],
              ["continuousIdent", "Continuous Ident"],
              ["noIdent", "No Ident"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <span className="mb-1 block text-[10px] text-[#94a3b8]">{label}</span>
                <ReadOnlyValue fieldId={`monitorTimers.${key}`} value={data.monitorTimers[key]} unit="s" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-x-auto border border-[#334155] bg-[#111827]">
        <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold">Parameter Alarm Ranges</h3>
        <table className="w-full min-w-[52rem] text-left text-[10px]">
          <thead className="bg-[#172033] text-[#94a3b8]"><tr><th className="px-3 py-2">Parameter</th><th className="px-2 py-2">Alarm Low</th><th className="px-2 py-2">PreAlarm Low</th><th className="px-2 py-2">Nominal</th><th className="px-2 py-2">PreAlarm High</th><th className="px-2 py-2">Alarm High</th><th className="px-2 py-2">Unit</th></tr></thead>
          <tbody>{data.alarmLimits.map((row, index) => (
            <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1]">
              <th scope="row" className="px-3 py-2 font-medium">{row.parameter}</th>
              {columns.map((column) => {
                const fieldId = `alarmLimits.${index}.${column}`;
                const value = resolveVorField(row[column], fieldId, overrides);
                return <td key={column} data-vor-field-id={fieldId} className="px-2 py-2 text-right font-mono tabular-nums">{value}</td>;
              })}
              <td className="px-2 py-2 text-[#94a3b8]">{row.unit}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>

      <section className="border border-[#334155] bg-[#111827]">
        <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold">Monitor Antennas</h3>
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          {data.monitorAntennas.map((antenna, index) => (
            <div key={antenna.monitor} className="grid grid-cols-[auto_1fr_1fr] items-end gap-3 border border-[#334155] p-2">
              <label className="flex h-7 items-center gap-2 text-[11px]"><input type="checkbox" checked={resolveVorField(antenna.enabled, `monitorAntennas.${index}.enabled`, overrides)} disabled className="accent-[#22c55e] disabled:opacity-100" />Monitor {antenna.monitor}</label>
              <div><span className="mb-1 block text-[10px] text-[#94a3b8]">Input Attenuation</span><ReadOnlyValue fieldId={`monitorAntennas.${index}.inputAttenuation`} value={antenna.inputAttenuation} unit="dB" /></div>
              <div><span className="mb-1 block text-[10px] text-[#94a3b8]">Azimuth Angle</span><ReadOnlyValue fieldId={`monitorAntennas.${index}.azimuthAngle`} value={antenna.azimuthAngle} unit="°" /></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
