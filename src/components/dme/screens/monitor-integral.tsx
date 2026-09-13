"use client";

import { Fragment } from "react";
import {
  resolveDmeField,
  resolveDmeStatus,
  useDmePmdtStore,
} from "@/stores/dme-pmdt-store";
import { DmeValueCell } from "./screen-primitives";

export function MonitorDataTable({ kind }: { kind: "integral" | "standby" }) {
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);
  const rows = kind === "integral" ? data.integralData : data.standbyData;
  const prefix = kind === "integral" ? "integralData" : "standbyData";

  return (
    <div className="dme-pmdt-all-monitor-data">
      <div className="dme-pmdt-monitor-dates">
        <span />
        <time>{data.timestamp}</time>
        <span />
        <time>{data.timestamp}</time>
        <span />
      </div>
      <table className="dme-pmdt-monitor-data-table">
        <caption className="sr-only">{kind === "integral" ? "Integral" : "Standby"} all monitor data</caption>
        <colgroup>
          <col className="dme-pmdt-monitor-parameter-col" />
          <col className="dme-pmdt-monitor-value-col" />
          <col className="dme-pmdt-monitor-separator-col" />
          <col className="dme-pmdt-monitor-value-col" />
          <col className="dme-pmdt-monitor-unit-col" />
        </colgroup>
        <thead>
          <tr><th>Parameter</th><th>Monitor 1</th><th aria-hidden /><th>Monitor 2</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const cells = ([1, 2] as const).flatMap((monitor) => {
              const valueKey = monitor === 1 ? "mon1Value" : "mon2Value";
              const statusKey = monitor === 1 ? "mon1Status" : "mon2Status";
              const fieldId = `${prefix}.${index}.${valueKey}`;
              const value = resolveDmeField(row[valueKey], fieldId, overrides);
              const status = resolveDmeStatus(row[statusKey], fieldId, overrides);
              const valueCell = (
                <td key={`value-${monitor}`}>
                  <DmeValueCell fieldId={fieldId} label={`${kind} ${row.label} Monitor ${monitor}`} value={value} status={status} />
                </td>
              );
              return monitor === 1 ? [valueCell, <td key="separator" aria-hidden />] : [valueCell];
            });
            const dataRow = (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {cells}
                <td>{row.unit}</td>
              </tr>
            );
            return row.label === "Tx Power" || row.label === "Rx Frequency" ? (
              <Fragment key={row.label}>
                {dataRow}
                <tr className="dme-pmdt-monitor-data-spacer" aria-hidden><td colSpan={5} /></tr>
              </Fragment>
            ) : dataRow;
          })}
        </tbody>
      </table>
    </div>
  );
}
