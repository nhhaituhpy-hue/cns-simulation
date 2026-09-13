"use client";

import { Fragment } from "react";
import { resolveVorField, useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtConfigControl } from "../pmdt-config-control";

const alarmParameterKeys: Record<string, string> = {
  "30 Hz Modulation": "hz30Modulation",
  "9960 Hz Modulation": "hz9960Modulation",
  "9960 Hz Deviation": "deviation",
  "RF Level": "rfLevel",
  "Ident Modulation": "identModulation",
  "Tx Power": "txPower",
  "Tx Frequency Error": "txFrequencyError",
};

function formatLimitValue(parameter: string, value: number): string {
  if (parameter === "9960 Hz Deviation") return value.toFixed(2);
  if (parameter === "Tx Power") return value.toFixed(1);
  if (parameter === "Tx Frequency Error") return value.toFixed(0);
  return value.toFixed(1);
}

function ReadOnlyValue({ fieldId, value, unit = "", prefix = "", digits, configFieldId }: { fieldId: string; value: number; unit?: string; prefix?: string; digits?: number; configFieldId?: string }) {
  const overrides = useVorPmdtStore((state) => state.overrides);

  if (configFieldId) {
    return (
      <span className="pmdt-alarm-value" data-vor-field-id={fieldId}>
        {prefix ? <span>{prefix}</span> : null}
        <PmdtConfigControl displayFieldId={fieldId} configFieldId={configFieldId} type="number" digits={digits} className="pmdt-alarm-input" />
        {unit ? <span>{unit}</span> : null}
      </span>
    );
  }
  const resolved = resolveVorField(value, fieldId, overrides);
  const display = digits === undefined ? String(resolved) : Number(resolved).toFixed(digits);

  return (
    <span className="pmdt-alarm-value" data-vor-field-id={fieldId}>
      {prefix ? <span>{prefix}</span> : null}
      <input aria-label={fieldId} type="text" inputMode="decimal" readOnly value={display} />
      {unit ? <span>{unit}</span> : null}
    </span>
  );
}

function ReadOnlyCheck({ fieldId, checked, configFieldId }: { fieldId: string; checked: boolean; configFieldId?: string }) {
  const overrides = useVorPmdtStore((state) => state.overrides);

  if (configFieldId) {
    return <PmdtConfigControl displayFieldId={fieldId} configFieldId={configFieldId} type="boolean" className="pmdt-alarm-checkbox" />;
  }
  return <input aria-label={fieldId} type="checkbox" disabled checked={resolveVorField(checked, fieldId, overrides)} />;
}


export function MonitorAlarmLimits() {
  const data = useVorPmdtStore((state) => state.data);
  const config = useVorPmdtStore((state) => state.config);

  return (
    <section className="pmdt-monitor-config" aria-label="Monitor alarm limits">
      <time className="pmdt-monitor-date">{data.timestamp}</time>
      <div className="pmdt-alarm-limit-summary">
        <table>
          <thead>
            <tr><th /><th>PreAlarm Range</th><th>Alarm Range</th><th /></tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Azimuth Angle</th>
              <td><ReadOnlyValue fieldId="monitorAzimuthLimits.preAlarm" configFieldId="monitor.azimuthLimits.preAlarm" value={data.monitorAzimuthLimits.preAlarm} prefix="+/-" digits={2} /></td>
              <td><ReadOnlyValue fieldId="monitorAzimuthLimits.alarm" configFieldId="monitor.azimuthLimits.alarm" value={data.monitorAzimuthLimits.alarm} prefix="+/-" digits={2} /></td>
              <td>°</td>
            </tr>
            <tr>
              <th scope="row">Notch Monitor</th>
              <td><ReadOnlyValue fieldId="monitor.notchTolerance" configFieldId="monitor.notchTolerance" value={config.monitor.notchTolerance} prefix="+/-" /></td>
              <td><ReadOnlyValue fieldId="monitor.notchTolerance" configFieldId="monitor.notchTolerance" value={config.monitor.notchTolerance} prefix="+/-" /></td>
              <td>%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table className="pmdt-alarm-limit-table">
        <thead>
          <tr>
            <th scope="col"> </th>
            <th scope="col">Alarm Low</th>
            <th scope="col">PreAlarm Low</th>
            <th scope="col">Nominal</th>
            <th scope="col">PreAlarm High</th>
            <th scope="col">Alarm High</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {data.alarmLimits.map((row, index) => (
            <tr key={row.parameter}>
              <th scope="row">{row.parameter}</th>
              {(["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"] as const).map((column) => (
                <td key={column}>
                  <ReadOnlyValue
                    fieldId={`alarmLimits.${index}.${column}`}
                    configFieldId={alarmParameterKeys[row.parameter] ? `monitor.alarmLimits.${alarmParameterKeys[row.parameter]}.${column}` : undefined}
                    value={row[column]}
                    digits={row.parameter === "9960 Hz Deviation" ? 2 : row.parameter === "Tx Power" ? 1 : row.parameter === "Tx Frequency Error" ? 0 : 1}
                  />
                </td>
              ))}
              <td>{row.unit}</td>
            </tr>
          ))}
          <tr className="pmdt-sideband-limit-row">
            <th scope="row">Sideband VSWR</th>
            <td colSpan={2} className="pmdt-sideband-limit-cell">
              <span>Number of Antennas in Alarm</span>
              <ReadOnlyValue fieldId="monitor.sidebandVswr.numberAntennasInAlarm" configFieldId="monitor.sidebandVswr.numberAntennasInAlarm" value={config.monitor.sidebandVswr.numberAntennasInAlarm} digits={0} />
            </td>
            <td><ReadOnlyValue fieldId="monitor.sidebandVswr.preAlarm" configFieldId="monitor.sidebandVswr.preAlarm" value={config.monitor.sidebandVswr.preAlarm} digits={1} /></td>
            <td><ReadOnlyValue fieldId="monitor.sidebandVswr.alarm" configFieldId="monitor.sidebandVswr.alarm" value={config.monitor.sidebandVswr.alarm} digits={1} /></td>
            <td colSpan={2}>:1</td>
          </tr>
        </tbody>
      </table>

      <div className="pmdt-alarm-limits-bottom">
        <fieldset className="pmdt-alarm-timers">
          <legend>Timers</legend>
          {([
            ["shutdown", "Integral Shutdown Delay"],
            ["continuousIdent", "Continuous Ident"],
            ["noIdent", "No Ident"],
          ] as const).map(([key, label]) => (
            <div className="pmdt-alarm-timer-row" key={key}>
              <span>{label}</span>
              <ReadOnlyValue fieldId={`monitorTimers.${key}`} configFieldId={`monitor.timers.${key}`} value={data.monitorTimers[key]} digits={1} />
              <span>Seconds</span>
            </div>
          ))}
        </fieldset>

        <fieldset className="pmdt-monitor-antennas">
          <legend>Monitor Antennas</legend>
          <table>
            <thead><tr><th /><th>Antenna 1</th><th>Antenna 2</th><th /></tr></thead>
            <tbody>
              <tr>
                <th scope="row">Enable</th>
                <td><ReadOnlyCheck fieldId="monitorAntennas.0.enabled" configFieldId="monitor.antennas.mon1.enabled" checked={data.monitorAntennas[0]?.enabled ?? false} /></td>
                <td><ReadOnlyCheck fieldId="monitorAntennas.0.secondAntennaEnabled" configFieldId="monitor.antennas.mon1.secondAntennaEnabled" checked={data.monitorAntennas[0]?.secondAntennaEnabled ?? false} /></td>
                <td />
              </tr>
              {data.monitorAntennas.map((antenna, index) => (
                <Fragment key={antenna.monitor}>
                  <tr>
                    <th scope="row">Monitor {antenna.monitor} Input Attenuation</th>
                    <td><ReadOnlyValue fieldId={`monitorAntennas.${index}.inputAttenuation`} configFieldId={`monitor.antennas.mon${antenna.monitor}.inputAttenuation`} value={antenna.inputAttenuation} digits={1} /></td>
                    <td><ReadOnlyValue fieldId={`monitorAntennas.${index}.secondInputAttenuation`} configFieldId={`monitor.antennas.mon${antenna.monitor}.secondInputAttenuation`} value={antenna.secondInputAttenuation ?? 0} digits={1} /></td>
                    <td>dB</td>
                  </tr>
                  <tr>
                    <th scope="row">Monitor {antenna.monitor} Azimuth Angle</th>
                    <td><ReadOnlyValue fieldId={`monitorAntennas.${index}.azimuthAngle`} configFieldId={`monitor.antennas.mon${antenna.monitor}.azimuthAngle`} value={antenna.azimuthAngle} digits={2} /></td>
                    <td><ReadOnlyValue fieldId={`monitorAntennas.${index}.secondAzimuthAngle`} configFieldId={`monitor.antennas.mon${antenna.monitor}.secondAzimuthAngle`} value={antenna.secondAzimuthAngle ?? 0} digits={2} /></td>
                    <td>°</td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </fieldset>
      </div>

    </section>
  );
}
