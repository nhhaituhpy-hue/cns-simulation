"use client";

import type { VorIndicatorColor } from "@/lib/vor-types";
import {
  resolveVorField,
  resolveVorStatus,
  useVorPmdtStore,
} from "@/stores/vor-pmdt-store";

const statusClasses: Record<VorIndicatorColor, string> = {
  green: "border-[#1d6837] bg-[#0f3a1f] text-[#bbf7d0]",
  yellow: "border-[#745f17] bg-[#3a2f0f] text-[#fef08a]",
  red: "border-[#7f1d1d] bg-[#3a0f0f] text-[#fecaca]",
  gray: "border-[#475569] bg-[#1e293b] text-[#94a3b8]",
};

export function MonitorSidebandVswr() {
  const values = useVorPmdtStore((state) => state.data.vswrData);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <section className="p-3" aria-labelledby="vswr-grid-title">
      <div className="mb-3 flex items-end justify-between border-b border-[#334155] pb-2">
        <div>
          <h3 id="vswr-grid-title" className="text-xs font-semibold text-[#e2e8f0]">Sideband Antenna VSWR</h3>
          <p className="mt-1 text-[10px] text-[#94a3b8]">48 antennas, tỷ số VSWR</p>
        </div>
        <span className="text-[10px] text-[#94a3b8]">Normal range</span>
      </div>
      <div className="grid grid-cols-3 gap-x-4">
        {[0, 1, 2].map((column) => (
          <div key={column} className="grid gap-1">
            {values.slice(column * 16, column * 16 + 16).map((baseValue, row) => {
              const index = column * 16 + row;
              const fieldId = `vswrData.${index}`;
              const value = resolveVorField(baseValue, fieldId, overrides);
              const status = resolveVorStatus("green", fieldId, overrides);
              return (
                <div
                  key={index}
                  data-vor-field-id={fieldId}
                  data-vor-field-value={baseValue}
                  data-vor-field-type="number"
                  data-vor-field-label={`Antenna ${index + 1} VSWR`}
                  className={`grid grid-cols-[4.5rem_1fr] items-center border ${statusClasses[status]}`}
                >
                  <span className="border-r border-current/20 px-2 py-1 text-[10px]">Antenna {index + 1}</span>
                  <span className="px-2 py-1 text-right font-mono text-[11px] font-semibold tabular-nums">{Number(value).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
