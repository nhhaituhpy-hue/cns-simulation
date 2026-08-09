"use client";

import { Fragment } from "react";
import type { VorIndicatorColor } from "@/lib/vor-types";
import {
  resolveVorField,
  resolveVorStatus,
  useVorPmdtStore,
} from "@/stores/vor-pmdt-store";

const statusClasses: Record<VorIndicatorColor, string> = {
  green: "bg-[#0f3a1f] text-[#bbf7d0]",
  yellow: "bg-[#3a2f0f] text-[#fef08a]",
  red: "bg-[#3a0f0f] text-[#fecaca]",
  gray: "bg-[#1e293b] text-[#94a3b8]",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="pmdt-tx-data-panel"><h3>{title}</h3>{children}</section>;
}

function TxDualColumns() {
  return (
    <colgroup>
      <col className="pmdt-tx-label-column" />
      <col className="pmdt-tx-value-column" />
      <col className="pmdt-tx-spacer-column" />
      <col className="pmdt-tx-value-column" />
      <col className="pmdt-tx-unit-column" />
    </colgroup>
  );
}

function Readout({ children }: { children: React.ReactNode }) {
  return <span className="pmdt-tx-readout">{children}</span>;
}

export function TxDataMain() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <div className="pmdt-tx-data">
      <time className="pmdt-monitor-date">{data.timestamp}</time>
      <Panel title="Power">
        <table className="pmdt-tx-dual-table w-full text-left text-[11px]">
          <TxDualColumns />
          <thead><tr><th /><th>Tx #1</th><th /><th>Tx #2</th><th /></tr></thead>
          <tbody>{data.txPower.map((row, index) => <tr key={row.parameter} className="border-t border-[#273449]"><th scope="row" className="px-3 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>{(["tx1", "tx2"] as const).map((tx, txIndex) => {
            const fieldId = `txPower.${index}.${tx}`;
            const value = resolveVorField(row[tx], fieldId, overrides);
            const status = resolveVorStatus("green", fieldId, overrides);
            return (
              <Fragment key={tx}>
                <td
                  data-vor-field-id={fieldId}
                  data-vor-field-value={row[tx]}
                  data-vor-field-type="number"
                  data-vor-field-label={`${row.parameter} Tx ${tx === "tx1" ? "1" : "2"}`}
                  className={`px-3 py-2 text-right font-mono tabular-nums ${statusClasses[status]}`}
                >
                  <Readout>{Number(value).toFixed(index === 0 ? 1 : 3)}</Readout>
                </td>
                {txIndex === 0 ? <td className="pmdt-tx-spacer-cell" /> : null}
              </Fragment>
            );
          })}<td className="pmdt-tx-unit-cell">{row.unit}</td></tr>)}</tbody>
        </table>
      </Panel>

      <Panel title="Frequency">
        <table className="pmdt-tx-dual-table w-full text-left text-[11px]">
          <TxDualColumns />
          <thead><tr><th /><th>Tx #1</th><th /><th>Tx #2</th><th /></tr></thead>
          <tbody>{data.txFrequency.map((row, index) => <tr key={row.parameter} className="border-t border-[#273449]"><th scope="row" className="px-3 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>{(["value1", "value2"] as const).map((key, valueIndex) => {
            const fieldId = `txFrequency.${index}.${key}`;
            const value = resolveVorField(row[key], fieldId, overrides);
            const status = resolveVorStatus("green", fieldId, overrides);
            const digits = index < 3 ? 4 : index < 5 ? 2 : 0;
            return (
              <Fragment key={key}>
                <td
                  data-vor-field-id={fieldId}
                  data-vor-field-value={row[key] ?? ""}
                  data-vor-field-type="number"
                  data-vor-field-label={`${row.parameter} ${key === "value1" ? "Value 1" : "Value 2"}`}
                  className={`px-3 py-2 text-right font-mono tabular-nums ${statusClasses[status]}`}
                >
                  {value === null ? null : <Readout>{Number(value).toFixed(digits)}</Readout>}
                </td>
                {valueIndex === 0 ? <td className="pmdt-tx-spacer-cell" /> : null}
              </Fragment>
            );
          })}<td className="pmdt-tx-unit-cell">{row.unit}</td></tr>)}</tbody>
        </table>
      </Panel>

      <Panel title="VSWR">
        <table className="pmdt-tx-dual-table w-full text-left text-[11px]">
          <TxDualColumns />
          <tbody>{data.txVswr.map((row, index) => <tr key={row.parameter} className="border-t border-[#273449]">
            <th scope="row" className="px-3 py-2 font-medium text-[#cbd5e1]">{row.parameter}</th>
            {(["value1", "value2"] as const).map((key, valueIndex) => {
              const fieldId = `txVswr.${index}.${key}`;
              const value = resolveVorField(row[key], fieldId, overrides);
              const status = resolveVorStatus("green", fieldId, overrides);
              return (
                <Fragment key={key}>
                  <td
                    data-vor-field-id={fieldId}
                    data-vor-field-value={row[key] ?? ""}
                    data-vor-field-type="number"
                    data-vor-field-label={`${row.parameter} VSWR Tx ${valueIndex + 1}`}
                    className={`px-3 py-2 text-right font-mono tabular-nums ${statusClasses[status]}`}
                  >
                    {value === null ? null : <Readout>{Number(value).toFixed(2)}</Readout>}
                  </td>
                  {valueIndex === 0 ? <td className="pmdt-tx-spacer-cell" /> : null}
                </Fragment>
              );
            })}
            <td className="pmdt-tx-unit-cell">: 1</td>
          </tr>)}</tbody>
        </table>
      </Panel>
    </div>
  );
}
