"use client";

import { getDmeParameterValue } from "@/lib/dme1119a";
import { resolveDmeField, useDmePmdtStore } from "@/stores/dme-pmdt-store";

function LimitValue({ fieldId, label, value, readOnly = false }: { fieldId: string; label: string; value: number | null; readOnly?: boolean }) {
  const overrides = useDmePmdtStore((state) => state.overrides);
  const configDraft = useDmePmdtStore((state) => state.configDraft);
  const setParameterValue = useDmePmdtStore((state) => state.setParameterValue);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const local = useDmePmdtStore((state) => state.data.local);
  const canEdit = !readOnly && securityLevel >= 3 && !loginDialogOpen && local;
  const draftValue = getDmeParameterValue(configDraft, fieldId);
  const resolved = resolveDmeField((draftValue ?? value) as number | null, fieldId, overrides);

  return (
    <input
      id={`dme-monitor-${fieldId.replace(/[^A-Za-z0-9_-]/g, "-")}`}
      name={fieldId}
      aria-label={label}
      type="number"
      step="0.01"
      disabled={!canEdit}
      value={resolved === null ? "" : String(resolved)}
      onChange={(event) => {
        const raw = event.currentTarget.value;
        setParameterValue(fieldId, raw === "" ? null : Number(raw));
      }}
      className="dme-pmdt-config-value h-6 w-[4.4rem] border border-[#aeb7c4] bg-white px-1 text-right font-mono text-[11px] text-[#111827] disabled:bg-[#e5e7eb]"
      data-dme-field-id={fieldId}
      data-dme-field-label={label}
    />
  );
}

export function MonitorAlarmLimits() {
  const data = useDmePmdtStore((state) => state.configDraft);
  const pulseRows = data.alarmLimits.slice(0, 2);
  const remainingRows = data.alarmLimits.slice(2);

  return (
    <div className="dme-pmdt-monitor-alarm-limits">
      <table className="dme-pmdt-monitor-range-table">
        <caption className="sr-only">Delay and spacing alarm ranges</caption>
        <thead><tr><th /><th>Nominal</th><th>PreAlarm Range</th><th>Alarm Range</th><th /></tr></thead>
      <tbody>{pulseRows.map((row, index) => <tr key={row.parameter}><th scope="row">{row.parameter}</th><td><LimitValue fieldId={`alarmLimits.${index}.nominal`} label={`${row.parameter} Nominal`} value={row.nominal} readOnly /></td><td>+/- <LimitValue fieldId={`alarmLimits.${index}.preAlarmHigh`} label={`${row.parameter} PreAlarm Range`} value={row.preAlarmHigh} /></td><td>+/- <LimitValue fieldId={`alarmLimits.${index}.alarmHigh`} label={`${row.parameter} Alarm Range`} value={row.alarmHigh} /></td><td>{row.unit}</td></tr>)}</tbody>
      </table>

      <table className="dme-pmdt-monitor-limit-table">
        <caption className="sr-only">Monitor alarm limits</caption>
        <thead><tr><th /><th>Alarm Low</th><th>PreAlarm Low</th><th>Nominal</th><th>PreAlarm High</th><th>Alarm High</th><th /></tr></thead>
        <tbody>{remainingRows.map((row, relativeIndex) => {
          const index = relativeIndex + 2;
          return <tr key={row.parameter}><th scope="row">{row.parameter}</th><td><LimitValue fieldId={`alarmLimits.${index}.alarmLow`} label={`${row.parameter} Alarm Low`} value={row.alarmLow} /></td><td><LimitValue fieldId={`alarmLimits.${index}.preAlarmLow`} label={`${row.parameter} PreAlarm Low`} value={row.preAlarmLow} /></td><td><LimitValue fieldId={`alarmLimits.${index}.nominal`} label={`${row.parameter} Nominal`} value={row.nominal} /></td><td><LimitValue fieldId={`alarmLimits.${index}.preAlarmHigh`} label={`${row.parameter} PreAlarm High`} value={row.preAlarmHigh} /></td><td><LimitValue fieldId={`alarmLimits.${index}.alarmHigh`} label={`${row.parameter} Alarm High`} value={row.alarmHigh} /></td><td>{row.unit}</td></tr>;
        })}</tbody>
      </table>

      <div className="dme-pmdt-monitor-settings">
        <fieldset><legend>Timers</legend>{([
          ["integralShutdownDelay", "Integral Shutdown Delay"],
          ["standbyShutdownDelay", "Standby Shutdown Delay"],
          ["continuousIdent", "Continuous Ident"],
          ["noIdent", "No Ident"],
        ] as const).map(([key, label]) => <label key={key}><span>{label}</span><LimitValue fieldId={`monitorTimers.${key}`} label={label} value={data.monitorTimers[key]} /><small>Seconds</small></label>)}</fieldset>
        <fieldset><legend>System-Level Settings</legend>{([
          ["efficiencyCertificationLevel", "Efficiency Certification Level", "%"],
          ["monitor1ReplyAttenuation", "Monitor 1 Reply Attenuation", "dB"],
          ["monitor2ReplyAttenuation", "Monitor 2 Reply Attenuation", "dB"],
          ["directionalCouplerLoss", "Directional Coupler Loss", "dB"],
        ] as const).map(([key, label, unit]) => <label key={key}><span>{label}</span><LimitValue fieldId={`monitorSystemSettings.${key}`} label={label} value={data.monitorSystemSettings[key]} /><small>{unit}</small></label>)}</fieldset>
      </div>
    </div>
  );
}
