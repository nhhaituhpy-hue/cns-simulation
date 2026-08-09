"use client";

import { Fragment } from "react";
import type { DmeDualValueRow } from "@/lib/dme-types";
import {
  resolveDmeField,
  resolveDmeStatus,
  useDmePmdtStore,
} from "@/stores/dme-pmdt-store";
import { DmeValueCell } from "./screen-primitives";

const allMonitorIntegralSnapshot: DmeDualValueRow[] = [
  { label: "Delay", mon1Value: "49.99", mon1Status: "normal", mon2Value: "50.00", mon2Status: "normal", unit: "us" },
  { label: "Spacing", mon1Value: "11.97", mon1Status: "normal", mon2Value: "11.97", mon2Status: "normal", unit: "us" },
  { label: "Tx Power", mon1Value: "1012", mon1Status: "normal", mon2Value: "1038", mon2Status: "normal", unit: "Watts" },
  { label: "ERP", mon1Value: "0.0", mon1Status: "normal", mon2Value: "0.0", mon2Status: "normal", unit: "dB" },
  { label: "Efficiency", mon1Value: "100.0", mon1Status: "normal", mon2Value: "98.5", mon2Status: "normal", unit: "%" },
  { label: "PRF", mon1Value: "790", mon1Status: "normal", mon2Value: "812", mon2Status: "normal", unit: "ppps" },
  { label: "Tx Frequency", mon1Value: "1203.996", mon1Status: "gray", mon2Value: "1203.996", mon2Status: "gray", unit: "MHz" },
  { label: "Tx Frequency Error", mon1Value: "-2", mon1Status: "normal", mon2Value: "-2", mon2Status: "normal", unit: "ppm" },
  { label: "Rx LO Frequency", mon1Value: "1015.988", mon1Status: "gray", mon2Value: "1015.991", mon2Status: "gray", unit: "MHz" },
  { label: "Rx LO Frequency Error", mon1Value: "-1", mon1Status: "normal", mon2Value: "2", mon2Status: "normal", unit: "ppm" },
  { label: "Rx Frequency", mon1Value: "1140.988", mon1Status: "gray", mon2Value: "1140.991", mon2Status: "gray", unit: "MHz" },
  { label: "VSWR", mon1Value: "1.3", mon1Status: "normal", mon2Value: "1.3", mon2Status: "normal", unit: ":1" },
  { label: "Ident Status", mon1Value: "Normal", mon1Status: "green", mon2Value: "Normal", mon2Status: "green", unit: "" },
  { label: "Ident Code", mon1Value: "TUH", mon1Status: "green", mon2Value: "TUH", mon2Status: "green", unit: "" },
];

const allMonitorStandbySnapshot: DmeDualValueRow[] = [
  { label: "Delay", mon1Value: "50.03", mon1Status: "normal", mon2Value: "50.01", mon2Status: "normal", unit: "us" },
  { label: "Spacing", mon1Value: "11.99", mon1Status: "normal", mon2Value: "11.99", mon2Status: "normal", unit: "us" },
  { label: "Tx Power", mon1Value: "975", mon1Status: "normal", mon2Value: "944", mon2Status: "normal", unit: "Watts" },
  { label: "ERP", mon1Value: "0.0", mon1Status: "normal", mon2Value: "0.0", mon2Status: "normal", unit: "dB" },
  { label: "Efficiency", mon1Value: "100.0", mon1Status: "normal", mon2Value: "100.0", mon2Status: "normal", unit: "%" },
  { label: "PRF", mon1Value: "793", mon1Status: "normal", mon2Value: "797", mon2Status: "normal", unit: "ppps" },
  { label: "Tx Frequency", mon1Value: "1204.001", mon1Status: "gray", mon2Value: "1204.001", mon2Status: "gray", unit: "MHz" },
  { label: "Tx Frequency Error", mon1Value: "1", mon1Status: "normal", mon2Value: "1", mon2Status: "normal", unit: "ppm" },
  { label: "Rx LO Frequency", mon1Value: "1015.978", mon1Status: "gray", mon2Value: "1015.982", mon2Status: "gray", unit: "MHz" },
  { label: "Rx LO Frequency Error", mon1Value: "-10", mon1Status: "normal", mon2Value: "-7", mon2Status: "normal", unit: "ppm" },
  { label: "Rx Frequency", mon1Value: "1140.978", mon1Status: "gray", mon2Value: "1140.982", mon2Status: "gray", unit: "MHz" },
  { label: "VSWR", mon1Value: "1.3", mon1Status: "normal", mon2Value: "1.3", mon2Status: "normal", unit: ":1" },
  { label: "Ident Status", mon1Value: "Normal", mon1Status: "green", mon2Value: "Normal", mon2Status: "green", unit: "" },
  { label: "Ident Code", mon1Value: "TUH", mon1Status: "green", mon2Value: "TUH", mon2Status: "green", unit: "" },
];

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
