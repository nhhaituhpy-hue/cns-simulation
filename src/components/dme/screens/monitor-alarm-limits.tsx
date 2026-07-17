"use client";

import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { DmeValueCell, PmdtPanel } from "./screen-primitives";

const columns = [
  ["alarmLow", "Alarm Low"],
  ["preAlarmLow", "PreAlarm Low"],
  ["nominal", "Nominal"],
  ["preAlarmHigh", "PreAlarm High"],
  ["alarmHigh", "Alarm High"],
] as const;

export function MonitorAlarmLimits() {
  const data = useDmePmdtStore((state) => state.data);
  return (
    <div className="grid gap-4 p-4">
      <PmdtPanel title="Monitored Parameters">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[50rem] border-separate border-spacing-1 text-left text-[10px]">
            <thead className="text-[#94a3b8]"><tr><th className="px-2 py-2">Parameter</th>{columns.map(([, label]) => <th key={label} className="px-2 py-2 text-center">{label}</th>)}<th className="px-2 py-2">Unit</th></tr></thead>
            <tbody>
              {data.alarmLimits.map((row, index) => (
                <tr key={row.parameter}>
                  <th scope="row" className="bg-[#0f172a] px-2 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>
                  {columns.map(([key]) => (
                    <td key={key} className="p-0.5 text-center">
                      <DmeValueCell fieldId={`alarmLimits.${index}.${key}`} label={`${row.parameter} ${key}`} value={row[key]} className="w-full" />
                    </td>
                  ))}
                  <td className="bg-[#0f172a] px-2 py-2 text-[#94a3b8]">{row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PmdtPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <PmdtPanel title="Timers">
          <dl className="grid grid-cols-2 gap-3">
            {([
              ["integralShutdownDelay", "Integral Shutdown Delay"],
              ["standbyShutdownDelay", "Standby Shutdown Delay"],
              ["continuousIdent", "Continuous Ident"],
              ["noIdent", "No Ident"],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <dt>{label}</dt>
                <dd><DmeValueCell fieldId={`monitorTimers.${key}`} label={label} value={data.monitorTimers[key]} /></dd>
              </div>
            ))}
          </dl>
        </PmdtPanel>
        <PmdtPanel title="System Level Settings">
          <dl className="grid gap-3">
            {([
              ["efficiencyCertificationLevel", "Efficiency Certification Level"],
              ["monitor1ReplyAttenuation", "Monitor 1 Reply Attenuation"],
              ["monitor2ReplyAttenuation", "Monitor 2 Reply Attenuation"],
              ["directionalCouplerLoss", "Directional Coupler Loss"],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <dt>{label}</dt>
                <dd><DmeValueCell fieldId={`monitorSystemSettings.${key}`} label={label} value={data.monitorSystemSettings[key]} /></dd>
              </div>
            ))}
          </dl>
        </PmdtPanel>
      </div>
    </div>
  );
}
