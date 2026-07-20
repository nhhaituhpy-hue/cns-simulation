"use client";

import { resolveDmeField, useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";
import { useState } from "react";

export function MonitorDetailData({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const [activeTab, setActiveTab] = useState<"integral" | "standby">("integral");
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);
  const openView = useDmePmdtStore((state) => state.openView);

  const monitorKey = monitorNumber === 1 ? "monitor1" : "monitor2";
  const rows = data.monitorDetailData[monitorKey];

  return (
    <section className="flex min-h-full flex-col font-mono text-[11px]" aria-label={`Monitor ${monitorNumber} Data`}>
      <PmdtToolbar title={`Monitor ${monitorNumber} Data`} />
      
      {/* Tabs list */}
      <div className="flex gap-1 border-b border-[#334155] bg-[#0f172a] px-3 pt-2" role="tablist" aria-label="Monitor Detail Data tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "integral"}
          onClick={() => {
            setActiveTab("integral");
            openView(
              `monitor-${monitorNumber}-data`,
              `monitor-${monitorNumber}-data-detail-integral`,
              [`Monitor ${monitorNumber}`, "Data", "Integral"],
              "Integral"
            );
          }}
          className={`min-h-8 border border-b-0 px-3 text-[11px] font-medium transition-colors ${
            activeTab === "integral"
              ? "border-[#475569] bg-[#1e293b] text-white"
              : "border-[#334155] bg-[#111827] text-[#94a3b8] hover:text-white"
          }`}
        >
          Integral
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "standby"}
          onClick={() => {
            setActiveTab("standby");
            openView(
              `monitor-${monitorNumber}-data`,
              `monitor-${monitorNumber}-data-detail-standby`,
              [`Monitor ${monitorNumber}`, "Data", "Standby"],
              "Standby"
            );
          }}
          className={`min-h-8 border border-b-0 px-3 text-[11px] font-medium transition-colors ${
            activeTab === "standby"
              ? "border-[#475569] bg-[#1e293b] text-white"
              : "border-[#334155] bg-[#111827] text-[#94a3b8] hover:text-white"
          }`}
        >
          Standby
        </button>
      </div>

      {/* Main Table view */}
      <div className="min-h-0 flex-1 overflow-auto bg-[#0a0e1a] p-3">
        <div className="border border-[#334155] bg-[#111827] max-w-xl mx-auto">
          <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">
            {activeTab === "integral" ? "Integral All Monitor Data" : "Standby All Monitor Data"}
          </h3>
          <table className="w-full text-left">
            <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
              <tr>
                <th className="px-3 py-1.5">Parameter</th>
                <th className="px-3 py-1.5 text-right w-24">Mon 1</th>
                <th className="px-3 py-1.5 text-right w-24">Mon 2</th>
                <th className="px-3 py-1.5 text-center w-16">Unit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const prefix = `monitorDetailData.${monitorKey}.${index}`;
                // Apply a small simulation offset for Standby mode if activeTab is standby
                let val1 = resolveDmeField(row.mon1Value, `${prefix}.mon1Value`, overrides);
                let val2 = resolveDmeField(row.mon2Value, `${prefix}.mon2Value`, overrides);
                
                if (activeTab === "standby") {
                  // Simulate slightly different standby values if not overridden
                  if (typeof val1 === "string" && !isNaN(Number(val1))) {
                    val1 = String(Number(val1) * 0.995);
                  }
                  if (typeof val2 === "string" && !isNaN(Number(val2))) {
                    val2 = String(Number(val2) * 0.995);
                  }
                }

                return (
                  <tr key={row.label} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                    <th scope="row" className="px-3 py-1.5 font-medium">{row.label}</th>
                    <td data-dme-field-id={`${prefix}.mon1Value`} className="px-3 py-1.5 text-right font-mono text-emerald-400 bg-emerald-950/10">
                      {typeof val1 === "number" ? val1 : parseFloat(String(val1)).toFixed(2)}
                    </td>
                    <td data-dme-field-id={`${prefix}.mon2Value`} className="px-3 py-1.5 text-right font-mono text-emerald-400 bg-emerald-950/10">
                      {typeof val2 === "number" ? val2 : parseFloat(String(val2)).toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-center text-gray-400">{row.unit}</td>
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
