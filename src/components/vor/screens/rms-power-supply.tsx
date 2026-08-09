"use client";

import type { VorIndicatorColor } from "@/lib/vor-types";
import {
  resolveVorField,
  resolveVorStatus,
  useVorPmdtStore,
} from "@/stores/vor-pmdt-store";

const indicatorClasses: Record<VorIndicatorColor, string> = {
  green: "pmdt-rms-indicator--green",
  yellow: "pmdt-rms-indicator--yellow",
  red: "pmdt-rms-indicator--red",
  gray: "pmdt-rms-indicator--gray",
};

function Indicator({ color, label }: { color: VorIndicatorColor; label: string }) {
  const letter = color === "green" ? "G" : color === "yellow" ? "Y" : color === "red" ? "R" : "";
  return (
    <span aria-label={`${label}: ${color}`} className={`pmdt-rms-indicator ${indicatorClasses[color]}`} title={`${label}: ${color}`}>
      {letter}
    </span>
  );
}

function formatVoltage(value: number, rowIndex: number) {
  return Number(value).toFixed(rowIndex < 8 ? 2 : 1);
}

function formatCurrent(value: number) {
  return Number(value).toFixed(1);
}

export function RmsPowerSupply() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);

  // BCPS Comm Fault indicators
  const bcps1Val = resolveVorField(data.bcpsCommFaults.bcps1, "bcpsCommFaults.bcps1", overrides);
  const bcps1Color = resolveVorStatus(bcps1Val ? "red" : "green", "bcpsCommFaults.bcps1", overrides);
  const bcps2Val = resolveVorField(data.bcpsCommFaults.bcps2, "bcpsCommFaults.bcps2", overrides);
  const bcps2Color = resolveVorStatus(bcps2Val ? "red" : "green", "bcpsCommFaults.bcps2", overrides);

  return (
    <div className="pmdt-rms-power-screen flex flex-col gap-4 p-3 text-[11px]">
      <div className="pmdt-rms-power-grid grid gap-3 lg:grid-cols-2">
        {/* Voltage Table */}
        <section className="pmdt-rms-flat-panel border border-[#334155] bg-[#111827]">
          <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">Voltages</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
                <tr>
                  <th className="px-3 py-1.5">Parameter</th>
                  <th className="px-2 py-1.5 text-right">Low</th>
                  <th className="px-2 py-1.5 text-right">Pre-Low</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-[#cbd5e1]">Volts</th>
                  <th className="px-2 py-1.5 text-right">Pre-High</th>
                  <th className="px-2 py-1.5 text-right">High</th>
                </tr>
              </thead>
              <tbody>
                {data.rmsVoltageData.map((row, index) => {
                  const prefix = `rmsVoltageData.${index}`;
                  return (
                    <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                      <th scope="row" className="px-3 py-1.5 font-medium">{row.parameter}</th>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-400">{formatVoltage(resolveVorField(row.low, `${prefix}.low`, overrides), index)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-400">{formatVoltage(resolveVorField(row.preLow, `${prefix}.preLow`, overrides), index)}</td>
                      <td data-vor-field-id={`${prefix}.volts`} className="px-3 py-1.5 text-right font-mono font-semibold text-emerald-400 bg-emerald-950/20">
                        {formatVoltage(resolveVorField(row.volts, `${prefix}.volts`, overrides), index)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-400">{formatVoltage(resolveVorField(row.preHigh, `${prefix}.preHigh`, overrides), index)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-400">{formatVoltage(resolveVorField(row.high, `${prefix}.high`, overrides), index)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Currents Table */}
        <section className="pmdt-rms-flat-panel border border-[#334155] bg-[#111827]">
          <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">Currents</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
                <tr>
                  <th className="px-3 py-1.5">Parameter</th>
                  <th className="px-2 py-1.5 text-right">Low</th>
                  <th className="px-2 py-1.5 text-right">Pre-Low</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-[#cbd5e1]">Amps</th>
                  <th className="px-2 py-1.5 text-right">Pre-High</th>
                  <th className="px-2 py-1.5 text-right">High</th>
                </tr>
              </thead>
              <tbody>
                {data.rmsCurrentData.map((row, index) => {
                  const prefix = `rmsCurrentData.${index}`;
                  return (
                    <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                      <th scope="row" className="px-3 py-1.5 font-medium">
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" disabled checked className="accent-[#22c55e] disabled:opacity-80" />
                          {row.parameter}
                        </label>
                      </th>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-400">{formatCurrent(resolveVorField(row.low, `${prefix}.low`, overrides))}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-400">{formatCurrent(resolveVorField(row.preLow, `${prefix}.preLow`, overrides))}</td>
                      <td data-vor-field-id={`${prefix}.amps`} className="px-3 py-1.5 text-right font-mono font-semibold text-sky-400 bg-sky-950/20">
                        {formatCurrent(resolveVorField(row.amps, `${prefix}.amps`, overrides))}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-400">{formatCurrent(resolveVorField(row.preHigh, `${prefix}.preHigh`, overrides))}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-400">{formatCurrent(resolveVorField(row.high, `${prefix}.high`, overrides))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* BCPS Comm Fault Status */}
      <section className="flex gap-6 border border-[#334155] bg-[#111827] px-4 py-3">
        <div data-vor-field-id="bcpsCommFaults.bcps1" className="flex items-center gap-2">
          <span>BCPS 1 Comm Fault</span>
          <Indicator color={bcps1Color} label="BCPS 1 Comm Fault" />
        </div>
        <div data-vor-field-id="bcpsCommFaults.bcps2" className="flex items-center gap-2">
          <span>BCPS 2 Comm Fault</span>
          <Indicator color={bcps2Color} label="BCPS 2 Comm Fault" />
        </div>
      </section>
    </div>
  );
}
