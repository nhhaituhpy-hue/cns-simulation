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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 border border-[#334155] bg-[#111827]">
      <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">{title}</h3>
      {children}
    </section>
  );
}

export function RmsDigitalIo() {
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);

  return (
    <div className="grid gap-3 p-3 lg:grid-cols-2 text-[11px]">
      <Panel title="Digital Inputs">
        <table className="w-full text-left">
          <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
            <tr>
              <th className="px-3 py-2">Input</th>
              <th className="px-3 py-2">Configuration</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.digitalInputs.map((row, index) => (
              <tr key={row.name} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                <th scope="row" className="px-3 py-2 font-medium">{row.name}</th>
                <td data-dme-field-id={`digitalInputs.${index}.configuration`} className="px-3 py-2 font-mono">
                  {resolveDmeField(row.configuration, `digitalInputs.${index}.configuration`, overrides)}
                </td>
                <td data-dme-field-id={`digitalInputs.${index}.status`} className="px-3 py-2 font-mono">
                  {resolveDmeField(row.status, `digitalInputs.${index}.status`, overrides) || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Digital Outputs">
        <table className="w-full text-left">
          <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
            <tr>
              <th className="px-3 py-2">Output</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Alternate</th>
            </tr>
          </thead>
          <tbody>
            {data.digitalOutputs.map((row, index) => (
              <tr key={row.name} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                <th scope="row" className="px-3 py-2 font-medium">{row.name}</th>
                <td data-dme-field-id={`digitalOutputs.${index}.status`} className="px-3 py-2 font-mono">
                  {resolveDmeField(row.status, `digitalOutputs.${index}.status`, overrides)}
                </td>
                <td data-dme-field-id={`digitalOutputs.${index}.altStatus`} className="px-3 py-2 font-mono">
                  {resolveDmeField(row.altStatus ?? "", `digitalOutputs.${index}.altStatus`, overrides) || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {[
        ["System Power Status", "systemPowerStatus", data.systemPowerStatus],
        ["Transmitter Alerts", "txAlerts", data.txAlerts],
      ].map(([title, prefix, rows]) => (
        <Panel key={String(prefix)} title={String(title)}>
          <table className="w-full text-left">
            <thead className="bg-[#172033] text-[#94a3b8] text-[10px]">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="w-20 px-3 py-2 text-center">Tx #1</th>
                <th className="w-20 px-3 py-2 text-center">Tx #2</th>
              </tr>
            </thead>
            <tbody>
              {(rows as typeof data.txAlerts).map((row, index) => (
                <tr key={row.name} className="border-t border-[#273449] text-[#cbd5e1] hover:bg-[#1e293b]/50">
                  <th scope="row" className="px-3 py-2 font-medium">{row.name}</th>
                  {(["tx1", "tx2"] as const).map((tx) => {
                    const fieldId = `${prefix}.${index}.${tx}`;
                    const color = resolveDmeStatus(row[tx], fieldId, overrides);
                    return (
                      <td key={tx} data-dme-field-id={fieldId} className="px-3 py-2 text-center">
                        <Indicator color={color} label={`${row.name} ${tx}`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ))}
    </div>
  );
}
