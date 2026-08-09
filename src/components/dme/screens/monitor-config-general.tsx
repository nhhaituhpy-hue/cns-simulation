"use client";

import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { dmeFieldMetadata } from "./screen-primitives";

export function MonitorConfigGeneral() {
  const rows = useDmePmdtStore((state) => state.configDraft.monitorConfigGeneral)
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .filter(({ row }) => row.parameter !== "Delay")
    .slice(0, 9);
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const local = useDmePmdtStore((state) => state.data.local);
  const setParameterValue = useDmePmdtStore((state) => state.setParameterValue);
  const canEdit = securityLevel >= 3 && !loginDialogOpen && local;

  return (
    <fieldset className="dme-pmdt-monitor-routing">
      <legend>Executive Alarms</legend>
      <table>
        <caption className="sr-only">Primary and secondary monitor routing</caption>
        <thead>
          <tr><th rowSpan={2} /><th colSpan={2}>Integral Monitor</th><th colSpan={2}>Standby Monitor</th></tr>
          <tr><th>Primary</th><th>Secondary</th><th>Primary</th><th>Secondary</th></tr>
        </thead>
        <tbody>
          {rows.map(({ row, sourceIndex }, index) => {
            const frequencyRow = row.parameter.includes("Frequency Error");
            const standbyDisabled = row.parameter === "ERP";
            return (
              <tr key={row.parameter}>
                <th scope="row">{row.parameter}</th>
                <td {...dmeFieldMetadata(`monitorConfigGeneral.${sourceIndex}.integralPrimary`, `${row.parameter} Integral Primary`, row.primary)}><input id={`dme-monitor-routing-${index}-integral-primary`} type="radio" name={`integral-${index}`} checked={row.primary} disabled={!canEdit} onChange={() => setParameterValue(`monitorConfigGeneral.${sourceIndex}.primary`, true)} /></td>
                <td {...dmeFieldMetadata(`monitorConfigGeneral.${sourceIndex}.integralSecondary`, `${row.parameter} Integral Secondary`, row.secondary)}><input id={`dme-monitor-routing-${index}-integral-secondary`} type="radio" name={`integral-${index}`} checked={row.secondary} disabled={!canEdit} onChange={() => setParameterValue(`monitorConfigGeneral.${sourceIndex}.secondary`, true)} /></td>
                <td {...dmeFieldMetadata(`monitorConfigGeneral.${sourceIndex}.standbyPrimary`, `${row.parameter} Standby Primary`, row.primary && !standbyDisabled)}><input id={`dme-monitor-routing-${index}-standby-primary`} type="radio" name={`standby-${index}`} checked={row.primary && !standbyDisabled} disabled={!canEdit || standbyDisabled} onChange={() => setParameterValue(`monitorConfigGeneral.${sourceIndex}.primary`, true)} /></td>
                <td {...dmeFieldMetadata(`monitorConfigGeneral.${sourceIndex}.standbySecondary`, `${row.parameter} Standby Secondary`, row.secondary)}><input id={`dme-monitor-routing-${index}-standby-secondary`} type="radio" name={`standby-${index}`} checked={row.secondary} disabled={!canEdit || standbyDisabled} onChange={() => setParameterValue(`monitorConfigGeneral.${sourceIndex}.secondary`, true)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </fieldset>
  );
}
