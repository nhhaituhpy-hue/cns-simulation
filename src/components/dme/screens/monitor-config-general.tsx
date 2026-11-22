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
            // Per-path classification (Stage 4 G12, station photo of this
            // screen): each monitor path has its own radio pair. The ERP
            // standby pair is unselected at the station and stays disabled.
            const standbyDisabled = row.parameter === "ERP";
            return (
              <tr key={row.parameter}>
                <th scope="row">{row.parameter}</th>
                <td {...dmeFieldMetadata(`monitorConfigGeneral.${sourceIndex}.integralPrimary`, `${row.parameter} Integral Primary`, row.integralPrimary)}><input id={`dme-monitor-routing-${index}-integral-primary`} type="radio" name={`integral-${index}`} checked={row.integralPrimary} disabled={!canEdit} onChange={() => setParameterValue(`monitorConfigGeneral.${sourceIndex}.integralPrimary`, true)} /></td>
                <td {...dmeFieldMetadata(`monitorConfigGeneral.${sourceIndex}.integralSecondary`, `${row.parameter} Integral Secondary`, row.integralSecondary)}><input id={`dme-monitor-routing-${index}-integral-secondary`} type="radio" name={`integral-${index}`} checked={row.integralSecondary} disabled={!canEdit} onChange={() => setParameterValue(`monitorConfigGeneral.${sourceIndex}.integralSecondary`, true)} /></td>
                <td {...dmeFieldMetadata(`monitorConfigGeneral.${sourceIndex}.standbyPrimary`, `${row.parameter} Standby Primary`, row.standbyPrimary)}><input id={`dme-monitor-routing-${index}-standby-primary`} type="radio" name={`standby-${index}`} checked={row.standbyPrimary} disabled={!canEdit || standbyDisabled} onChange={() => setParameterValue(`monitorConfigGeneral.${sourceIndex}.standbyPrimary`, true)} /></td>
                <td {...dmeFieldMetadata(`monitorConfigGeneral.${sourceIndex}.standbySecondary`, `${row.parameter} Standby Secondary`, row.standbySecondary)}><input id={`dme-monitor-routing-${index}-standby-secondary`} type="radio" name={`standby-${index}`} checked={row.standbySecondary} disabled={!canEdit || standbyDisabled} onChange={() => setParameterValue(`monitorConfigGeneral.${sourceIndex}.standbySecondary`, true)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </fieldset>
  );
}
