"use client";

import { resolveDmeField, useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { dmeFieldMetadata } from "./screen-primitives";

function display(value: string | number | boolean | null): string {
  return value === null ? "" : String(value);
}

export function RmsAdData() {
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);

  return (
    <div className="dme-pmdt-ad-data">
      <table className="dme-pmdt-ad-input-table">
        <caption className="sr-only">Spare analog input data</caption>
        <thead><tr><th /><th>Low</th><th>Pre-Low</th><th>Volts</th><th>Pre-High</th><th>High</th></tr></thead>
        <tbody>
          {data.rmsAdData.map((row, index) => {
            const prefix = `rmsAdData.${index}`;
            const value = resolveDmeField(row.volts, `${prefix}.volts`, overrides);
            return (
              <tr key={row.parameter}>
                <th scope="row">{row.parameter}</th>
                <td>{Number(resolveDmeField(row.low, `${prefix}.low`, overrides)).toFixed(2)}</td>
                <td>{Number(resolveDmeField(row.preLow, `${prefix}.preLow`, overrides)).toFixed(2)}</td>
                <td {...dmeFieldMetadata(`${prefix}.volts`, `${row.parameter} Volts`, value)}><span className="dme-pmdt-data-readout">{Number(value).toFixed(2)}</span></td>
                <td>{Number(resolveDmeField(row.preHigh, `${prefix}.preHigh`, overrides)).toFixed(2)}</td>
                <td>{Number(resolveDmeField(row.high, `${prefix}.high`, overrides)).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <table className="dme-pmdt-temperature-table">
        <caption className="sr-only">DME equipment temperature data</caption>
        <thead><tr><th /><th>Low</th><th>Pre-Low</th><th>Deg C</th><th>Pre-High</th><th>High</th></tr></thead>
        <tbody>
          {data.rmsTemperatureData.map((row, index) => {
            const prefix = `rmsTemperatureData.${index}`;
            const value = resolveDmeField(row.value, `${prefix}.value`, overrides);
            return (
              <tr key={row.parameter}>
                <th scope="row">{row.parameter}</th>
                <td>{display(resolveDmeField(row.low, `${prefix}.low`, overrides))}</td>
                <td>{display(resolveDmeField(row.preLow, `${prefix}.preLow`, overrides))}</td>
                <td {...dmeFieldMetadata(`${prefix}.value`, `${row.parameter} Temperature`, value)}><span className="dme-pmdt-data-readout">{value}</span></td>
                <td>{resolveDmeField(row.preHigh, `${prefix}.preHigh`, overrides)}</td>
                <td>{resolveDmeField(row.high, `${prefix}.high`, overrides)}</td>
              </tr>
            );
          })}
          <tr className="dme-pmdt-temperature-spacer" aria-hidden>
            <td /><td /><td /><td /><td /><td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
