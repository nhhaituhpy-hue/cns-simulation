"use client";

import { resolveDmeField, useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";

export function MonitorCalibration({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);

  const monitorKey = monitorNumber === 1 ? "monitor1" : "monitor2";
  const rows = data.monitorCalibrationData[monitorKey];

  return (
    <section className="flex min-h-full flex-col font-mono text-[11px]" aria-label={`Monitor ${monitorNumber} Calibration`}>
      <PmdtToolbar title={`Monitor ${monitorNumber} Calibration`} />
      <div className="min-h-0 flex-1 overflow-auto bg-[#0a0e1a] p-3">
        <div className="border border-[#334155] bg-[#111827] max-w-2xl mx-auto">
          <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">
            Monitor Calibration parameters
          </h3>
          <table className="w-full text-left">
            <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
              <tr>
                <th className="px-3 py-1.5">Parameter</th>
                <th className="px-2 py-1.5 text-right w-24">Baseline</th>
                <th className="px-3 py-1.5 text-right w-24 font-semibold text-[#cbd5e1]">Actual</th>
                <th className="px-3 py-1.5 text-right w-24 font-semibold text-[#cbd5e1]">Offset</th>
                <th className="px-3 py-1.5 text-right w-24 font-semibold text-[#cbd5e1]">Scale</th>
                <th className="px-2 py-1.5 text-center w-16">Unit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const prefix = `monitorCalibrationData.${monitorKey}.${index}`;
                const resolvedBaseline = resolveDmeField(row.baseline, `${prefix}.baseline`, overrides);
                const resolvedActual = resolveDmeField(row.actual, `${prefix}.actual`, overrides);
                const resolvedOffset = resolveDmeField(row.offset, `${prefix}.offset`, overrides);
                const resolvedScale = resolveDmeField(row.scale, `${prefix}.scale`, overrides);

                return (
                  <tr key={row.parameter} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                    <th scope="row" className="px-3 py-1.5 font-medium">{row.parameter}</th>
                    <td
                      data-dme-field-id={`${prefix}.baseline`}
                      data-dme-field-value={row.baseline}
                      data-dme-field-type="number"
                      data-dme-field-label={`${row.parameter} Baseline`}
                      className="px-2 py-1.5 text-right font-mono text-gray-400"
                    >
                      {typeof resolvedBaseline === "number" ? resolvedBaseline.toFixed(2) : resolvedBaseline}
                    </td>
                    <td
                      data-dme-field-id={`${prefix}.actual`}
                      data-dme-field-value={row.actual}
                      data-dme-field-type="number"
                      data-dme-field-label={`${row.parameter} Actual`}
                      className="px-3 py-1.5 text-right font-mono text-emerald-400 bg-emerald-950/10"
                    >
                      {typeof resolvedActual === "number" ? resolvedActual.toFixed(2) : resolvedActual}
                    </td>
                    <td
                      data-dme-field-id={`${prefix}.offset`}
                      data-dme-field-value={row.offset}
                      data-dme-field-type="number"
                      data-dme-field-label={`${row.parameter} Offset`}
                      className="px-3 py-1.5 text-right font-mono text-emerald-400 bg-emerald-950/10"
                    >
                      {typeof resolvedOffset === "number" ? resolvedOffset.toFixed(2) : resolvedOffset}
                    </td>
                    <td
                      data-dme-field-id={`${prefix}.scale`}
                      data-dme-field-value={row.scale}
                      data-dme-field-type="number"
                      data-dme-field-label={`${row.parameter} Scale`}
                      className="px-3 py-1.5 text-right font-mono text-sky-400 bg-sky-950/10"
                    >
                      {typeof resolvedScale === "number" ? resolvedScale.toFixed(3) : resolvedScale}
                    </td>
                    <td className="px-2 py-1.5 text-center text-gray-400">{row.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
