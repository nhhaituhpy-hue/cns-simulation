"use client";

import type { DmeIndicatorColor } from "@/lib/dme-types";
import {
  resolveDmeField,
  resolveDmeStatus,
  useDmePmdtStore,
} from "@/stores/dme-pmdt-store";

const indicatorClasses: Record<DmeIndicatorColor, string> = {
  green: "bg-[#22c55e]",
  yellow: "bg-[#eab308]",
  red: "bg-[#ef4444]",
  gray: "bg-[#6b7280]",
};

function Indicator({ color, label }: { color: DmeIndicatorColor; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={`${label}: ${color}`}>
      <span aria-hidden className={`size-3 rounded-full border border-black/40 ${indicatorClasses[color]}`} />
      <span className="sr-only">{label}: {color}</span>
    </span>
  );
}

export function RmsAdData() {
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);

  // BCPS Comm Fault status
  const bcps1Val = resolveDmeField(data.bcpsCommFaults.bcps1, "bcpsCommFaults.bcps1", overrides);
  const bcps1Color = resolveDmeStatus(bcps1Val ? "red" : "green", "bcpsCommFaults.bcps1", overrides);
  const bcps2Val = resolveDmeField(data.bcpsCommFaults.bcps2, "bcpsCommFaults.bcps2", overrides);
  const bcps2Color = resolveDmeStatus(bcps2Val ? "red" : "green", "bcpsCommFaults.bcps2", overrides);

  return (
    <div className="flex flex-col gap-4 p-3 text-[11px]">
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Spare A/D Channels */}
        <section className="border border-[#334155] bg-[#111827]">
          <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">Spare A/D Channels</h3>
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
                {data.rmsAdData.map((row, index) => {
                  const prefix = `rmsAdData.${index}`;
                  return (
                    <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                      <th scope="row" className="px-3 py-1.5 font-medium">{row.parameter}</th>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-400">{resolveDmeField(row.low, `${prefix}.low`, overrides)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-400">{resolveDmeField(row.preLow, `${prefix}.preLow`, overrides)}</td>
                      <td data-dme-field-id={`${prefix}.volts`} className="px-3 py-1.5 text-right font-mono font-semibold text-sky-400 bg-sky-950/20">
                        {Number(resolveDmeField(row.volts, `${prefix}.volts`, overrides)).toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-400">{resolveDmeField(row.preHigh, `${prefix}.preHigh`, overrides)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-400">{resolveDmeField(row.high, `${prefix}.high`, overrides)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-col gap-3">
          {/* Temperatures */}
          <section className="border border-[#334155] bg-[#111827]">
            <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">Temperatures</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Parameter</th>
                    <th className="px-2 py-2 text-right">Low</th>
                    <th className="px-2 py-2 text-right">Pre-Low</th>
                    <th className="px-3 py-2 text-right font-semibold text-[#cbd5e1]">Deg C</th>
                    <th className="px-2 py-2 text-right">Pre-High</th>
                    <th className="px-2 py-2 text-right">High</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rmsTemperatureData.map((row, index) => {
                    const prefix = `rmsTemperatureData.${index}`;
                    const resolvedLow = resolveDmeField(row.low, `${prefix}.low`, overrides);
                    const resolvedPreLow = resolveDmeField(row.preLow, `${prefix}.preLow`, overrides);
                    const resolvedValue = resolveDmeField(row.value, `${prefix}.value`, overrides);
                    const resolvedPreHigh = resolveDmeField(row.preHigh, `${prefix}.preHigh`, overrides);
                    const resolvedHigh = resolveDmeField(row.high, `${prefix}.high`, overrides);

                    return (
                      <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                        <th scope="row" className="px-3 py-2 font-medium">{row.parameter}</th>
                        <td className="px-2 py-2 text-right font-mono text-gray-400">
                          {resolvedLow === null || String(resolvedLow) === "" ? "" : resolvedLow}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-gray-400">
                          {resolvedPreLow === null || String(resolvedPreLow) === "" ? "" : resolvedPreLow}
                        </td>
                        <td data-dme-field-id={`${prefix}.value`} className="px-3 py-2 text-right font-mono font-semibold text-orange-400 bg-orange-950/10">
                          {resolvedValue}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-gray-400">
                          {resolvedPreHigh}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-gray-400">
                          {resolvedHigh}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* BCPS Comm Fault Status */}
          <section className="flex gap-6 border border-[#334155] bg-[#111827] px-4 py-3">
            <div data-dme-field-id="bcpsCommFaults.bcps1" className="flex items-center gap-2">
              <span>BCPS 1 Comm Fault</span>
              <Indicator color={bcps1Color} label="BCPS 1 Comm Fault" />
            </div>
            <div data-dme-field-id="bcpsCommFaults.bcps2" className="flex items-center gap-2">
              <span>BCPS 2 Comm Fault</span>
              <Indicator color={bcps2Color} label="BCPS 2 Comm Fault" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
