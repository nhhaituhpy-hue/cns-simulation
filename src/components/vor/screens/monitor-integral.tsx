"use client";

import { Fragment } from "react";
import type { VorIndicatorColor } from "@/lib/vor-types";
import {
  resolveVorField,
  resolveVorStatus,
  useVorPmdtStore,
} from "@/stores/vor-pmdt-store";

function MonitorIntegralAll() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <section className="pmdt-monitor-all-integral" aria-label="All monitor integral data">
      <table>
        <colgroup>
          <col className="pmdt-monitor-all-label" />
          <col className="pmdt-monitor-all-value" />
          <col className="pmdt-monitor-all-gap" />
          <col className="pmdt-monitor-all-value" />
          <col className="pmdt-monitor-all-unit" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col"><time>{data.timestamp}</time><span>Monitor #1</span></th>
            <th scope="col" className="pmdt-monitor-all-gap" />
            <th scope="col"><time>{data.timestamp}</time><span>Monitor #2</span></th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {data.integralData.map((row, index) => (
            <tr key={row.label} className={row.label === "Tx Power" ? "pmdt-monitor-integral-break" : undefined}>
              <th scope="row">{row.label}</th>
              {(() => {
                const valueKey = "mon1Value" as const;
                const statusKey = "mon1Status" as const;
                const fieldId = `integralData.${index}.${valueKey}`;
                const value = resolveVorField(row[valueKey], fieldId, overrides);
                const status = resolveVorStatus(row[statusKey], fieldId, overrides);
                return <td data-vor-field-id={fieldId} className="pmdt-monitor-value-cell"><span className={`pmdt-monitor-current-value ${currentStatusClasses[status]} ${row.label === "Ident Status" || row.label === "Ident Code" ? "pmdt-monitor-current-value--wide" : ""} ${row.label === "Tx Frequency" ? "pmdt-monitor-current-value--frequency" : ""}`}>{value}</span></td>;
              })()}
              <td className="pmdt-monitor-all-gap" aria-hidden="true" />
              {(() => {
                const valueKey = "mon2Value" as const;
                const statusKey = "mon2Status" as const;
                const fieldId = `integralData.${index}.${valueKey}`;
                const value = resolveVorField(row[valueKey], fieldId, overrides);
                const status = resolveVorStatus(row[statusKey], fieldId, overrides);
                return <td data-vor-field-id={fieldId} className="pmdt-monitor-value-cell"><span className={`pmdt-monitor-current-value ${currentStatusClasses[status]} ${row.label === "Ident Status" || row.label === "Ident Code" ? "pmdt-monitor-current-value--wide" : ""} ${row.label === "Tx Frequency" ? "pmdt-monitor-current-value--frequency" : ""}`}>{value}</span></td>;
              })()}
              <td>{row.unit || "-"}</td>
            </tr>
          ))}
          <tr className="pmdt-monitor-integral-spacer" aria-hidden="true"><td colSpan={5} /></tr>
        </tbody>
      </table>
    </section>
  );
}

const currentStatusClasses: Record<VorIndicatorColor, string> = {
  green: "pmdt-monitor-current--green",
  yellow: "pmdt-monitor-current--yellow",
  red: "pmdt-monitor-current--red",
  gray: "pmdt-monitor-current--gray",
};

function formatLimit(parameter: string, value: number): string {
  if (parameter === "9960 Hz Deviation") return value.toFixed(2);
  if (parameter === "Tx Power") return value.toFixed(1);
  if (parameter === "Tx Frequency Error") return value.toFixed(0);
  return value.toFixed(1);
}

function MonitorIntegralSingle({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);
  const monitorIndex = monitorNumber - 1;
  const antenna = data.monitorAntennas[monitorIndex];

  const currentValue = (label: string, index: number) => {
    const row = data.integralData.find((candidate) => candidate.label === label);
    if (!row) return { value: "", status: "gray" as const, fieldId: `${label}.${monitorNumber}` };
    const valueKey = monitorNumber === 1 ? "mon1Value" : "mon2Value";
    const statusKey = monitorNumber === 1 ? "mon1Status" : "mon2Status";
    const fieldId = `integralData.${index}.${valueKey}`;
    return {
      value: resolveVorField(row[valueKey], fieldId, overrides),
      status: resolveVorStatus(row[statusKey], fieldId, overrides),
      fieldId,
    };
  };

  const azimuth = currentValue("Azimuth", 0);
  const alarmOrder = [
    "30 Hz Modulation",
    "9960 Hz Modulation",
    "9960 Hz Deviation",
    "RF Level",
    "Ident Modulation",
    "Tx Power",
    "Tx Frequency Error",
  ];
  const alarmRows = [...data.alarmLimits].sort((left, right) => alarmOrder.indexOf(left.parameter) - alarmOrder.indexOf(right.parameter)).map((row) => {
    const integralIndex = data.integralData.findIndex((candidate) => candidate.label === row.parameter);
    return {
      label: row.parameter,
      alarmLow: row.alarmLow,
      preAlarmLow: row.preAlarmLow,
      nominal: row.nominal,
      preAlarmHigh: row.preAlarmHigh,
      alarmHigh: row.alarmHigh,
      unit: row.unit,
      current: currentValue(row.parameter, integralIndex >= 0 ? integralIndex : 0),
    };
  });
  const frequency = currentValue("Tx Frequency", data.integralData.findIndex((row) => row.label === "Tx Frequency"));
  const identStatus = currentValue("Ident Status", data.integralData.findIndex((row) => row.label === "Ident Status"));
  const identCode = currentValue("Ident Code", data.integralData.findIndex((row) => row.label === "Ident Code"));
  const frequencyError = alarmRows.find((row) => row.label === "Tx Frequency Error");
  const visibleRows = alarmRows.filter((row) => row.label !== "Tx Frequency Error");

  return (
    <section className="pmdt-monitor-integral" aria-label={`Monitor ${monitorNumber} integral data`}>
      <time className="pmdt-monitor-date">{data.timestamp}</time>
      <table className="pmdt-monitor-integral-table">
        <colgroup>
          <col className="pmdt-monitor-integral-col-label" />
          <col className="pmdt-monitor-integral-col-range" />
          <col className="pmdt-monitor-integral-col-range" />
          <col className="pmdt-monitor-integral-col-data" />
          <col className="pmdt-monitor-integral-col-range" />
          <col className="pmdt-monitor-integral-col-range" />
          <col className="pmdt-monitor-integral-col-unit" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">Alarm Low</th>
            <th scope="col">Pre Alarm Low</th>
            <th scope="col">Data</th>
            <th scope="col">Pre Alarm High</th>
            <th scope="col">Alarm High</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Antenna #{monitorNumber} Azimuth</th>
            <td>{(antenna.azimuthAngle - data.monitorAzimuthLimits.alarm).toFixed(2)}</td>
            <td>{(antenna.azimuthAngle - data.monitorAzimuthLimits.preAlarm).toFixed(2)}</td>
            <td data-vor-field-id={azimuth.fieldId} className="pmdt-monitor-value-cell"><span className={`pmdt-monitor-current-value ${currentStatusClasses[azimuth.status]}`}>{azimuth.value}</span></td>
            <td>{(antenna.azimuthAngle + data.monitorAzimuthLimits.preAlarm).toFixed(2)}</td>
            <td>{(antenna.azimuthAngle + data.monitorAzimuthLimits.alarm).toFixed(2)}</td>
            <td>°</td>
          </tr>
          <tr className="pmdt-monitor-integral-azimuth-gap" aria-hidden="true"><td colSpan={7} /></tr>
          {visibleRows.map((row) => (
            <Fragment key={row.label}>
              {row.label === "Tx Power" ? (
                <>
                  <tr>
                    <th scope="row">Ident Status</th>
                    <td colSpan={2} />
                    <td data-vor-field-id={identStatus.fieldId} className="pmdt-monitor-value-cell"><span className={`pmdt-monitor-current-value ${currentStatusClasses[identStatus.status]}`}>{identStatus.value}</span></td>
                    <td colSpan={2} />
                    <td />
                  </tr>
                  <tr>
                    <th scope="row">Ident Code</th>
                    <td colSpan={2} />
                    <td data-vor-field-id={identCode.fieldId} className="pmdt-monitor-value-cell"><span className={`pmdt-monitor-current-value ${currentStatusClasses[identCode.status]}`}>{identCode.value}</span></td>
                    <td colSpan={2} />
                    <td />
                  </tr>
                  <tr className="pmdt-monitor-integral-tx-gap" aria-hidden="true"><td colSpan={7} /></tr>
                </>
              ) : null}
              <tr>
                <th scope="row">{row.label}</th>
                <td>{formatLimit(row.label, row.alarmLow)}</td>
                <td>{formatLimit(row.label, row.preAlarmLow)}</td>
                <td data-vor-field-id={row.current.fieldId} className="pmdt-monitor-value-cell"><span className={`pmdt-monitor-current-value ${currentStatusClasses[row.current.status]}`}>{row.current.value}</span></td>
                <td>{formatLimit(row.label, row.preAlarmHigh)}</td>
                <td>{formatLimit(row.label, row.alarmHigh)}</td>
                <td>{row.unit}</td>
              </tr>
            </Fragment>
          ))}
          <tr>
            <th scope="row">Tx Frequency</th>
            <td colSpan={2} />
            <td data-vor-field-id={frequency.fieldId} className="pmdt-monitor-value-cell"><span className={`pmdt-monitor-current-value ${currentStatusClasses[frequency.status]}`}>{frequency.value}</span></td>
            <td colSpan={2} />
            <td>MHz</td>
          </tr>
          {frequencyError ? (
            <tr>
              <th scope="row">Tx Frequency Error</th>
              <td>{formatLimit(frequencyError.label, frequencyError.alarmLow)}</td>
              <td>{formatLimit(frequencyError.label, frequencyError.preAlarmLow)}</td>
                <td data-vor-field-id={frequencyError.current.fieldId} className="pmdt-monitor-value-cell"><span className={`pmdt-monitor-current-value ${currentStatusClasses[frequencyError.current.status]}`}>{frequencyError.current.value}</span></td>
              <td>{formatLimit(frequencyError.label, frequencyError.preAlarmHigh)}</td>
              <td>{formatLimit(frequencyError.label, frequencyError.alarmHigh)}</td>
              <td>{frequencyError.unit}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

export function MonitorIntegral({ monitorNumber }: { monitorNumber?: 1 | 2 } = {}) {
  return monitorNumber ? <MonitorIntegralSingle monitorNumber={monitorNumber} /> : <MonitorIntegralAll />;
}
