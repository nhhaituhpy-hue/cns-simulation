"use client";

import { Fragment } from "react";
import type { VorIndicatorColor } from "@/lib/vor-types";
import {
  resolveVorField,
  resolveVorStatus,
  useVorPmdtStore,
} from "@/stores/vor-pmdt-store";

const indicatorClasses: Record<VorIndicatorColor, string> = {
  green: "pmdt-rms-indicator--green", yellow: "pmdt-rms-indicator--yellow",
  red: "pmdt-rms-indicator--red", gray: "pmdt-rms-indicator--gray",
};

function Indicator({ color, label }: { color: VorIndicatorColor; label: string }) {
  const letter = color === "green" ? "G" : color === "yellow" ? "Y" : color === "red" ? "R" : "";
  return <span aria-label={`${label}: ${color}`} className={`pmdt-rms-indicator ${indicatorClasses[color]}`}>{letter}</span>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  const slug = title.toLowerCase().replace(/\s+/g, "-");
  return (
    <section className={`pmdt-rms-panel pmdt-rms-panel--${slug} min-w-0 border border-[#334155] bg-[#111827]`}>
      <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-[#e2e8f0]">{title}</h3>
      {children}
    </section>
  );
}

export function RmsDigitalIo() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);
  const centeredSystemStatusRows = new Set(["RMS", "Facilities", "Test Generator", "LCU"]);
  const spareOutputs = data.digitalOutputs
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.name !== "Battery Charger");

  return (
    <div className="pmdt-rms-digital-screen grid gap-3 p-3 lg:grid-cols-2">
      <Panel title="Digital Inputs">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-[#172033] text-[#94a3b8]"><tr><th className="px-3 py-2">Input</th><th className="px-3 py-2">Configuration</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody>{data.digitalInputs.map((row, index) => (
            <tr key={row.name} className="border-t border-[#273449] text-[#cbd5e1]">
              <th scope="row" className="px-3 py-2 font-medium">{row.name}</th>
              <td data-vor-field-id={`digitalInputs.${index}.configuration`} className="px-3 py-2 font-mono">{resolveVorField(row.configuration, `digitalInputs.${index}.configuration`, overrides)}</td>
              <td data-vor-field-id={`digitalInputs.${index}.status`} className="px-3 py-2 font-mono">{resolveVorField(row.status, `digitalInputs.${index}.status`, overrides)}</td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>

      <Panel title="Digital Outputs">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-[#172033] text-[#94a3b8]"><tr><th className="px-3 py-2">Output</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody>{spareOutputs.map(({ row, index }) => (
            <tr key={row.name} className="border-t border-[#273449] text-[#cbd5e1]">
              <th scope="row" className="px-3 py-2 font-medium">{row.name}</th>
              <td data-vor-field-id={`digitalOutputs.${index}.status`} className={`px-3 py-2 font-mono ${row.name === "Battery Charger" ? "pmdt-rms-battery-status" : ""}`}>
                <span className={row.name === "Battery Charger" ? "pmdt-rms-battery-value" : ""}>{resolveVorField(row.status, `digitalOutputs.${index}.status`, overrides)}</span>
                {row.name === "Battery Charger" && row.altStatus ? (
                  <span data-vor-field-id={`digitalOutputs.${index}.altStatus`} className="pmdt-rms-battery-value">{resolveVorField(row.altStatus, `digitalOutputs.${index}.altStatus`, overrides)}</span>
                ) : null}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>

      {[
        ["System Power Status", "systemPowerStatus", data.systemPowerStatus],
        ["Tx Alerts", "txAlerts", data.txAlerts],
      ].map(([title, prefix, rows]) => (
        <Panel key={String(prefix)} title={String(title)}>
          <table className="w-full text-left text-[11px]">
            <thead className="bg-[#172033] text-[#94a3b8]"><tr><th className="px-3 py-2">Status</th><th className="w-20 px-3 py-2 text-center">Tx #1</th><th className="w-20 px-3 py-2 text-center">Tx #2</th></tr></thead>
            <tbody>{(rows as typeof data.txAlerts).map((row, index) => (
              <Fragment key={row.name}>
                {title === "System Power Status" && row.name === "Carrier PA" ? (
                  <tr key={`${row.name}-spacer`} className="pmdt-rms-digital-spacer" aria-hidden="true"><td colSpan={3} /></tr>
                ) : null}
                <tr className="border-t border-[#273449] text-[#cbd5e1]">
                  <th scope="row" className="px-3 py-2 font-medium">{row.name}</th>
                  {title === "System Power Status" && centeredSystemStatusRows.has(row.name) ? (
                    <td
                      colSpan={2}
                      data-vor-field-id={`${prefix}.${index}.tx1`}
                      className="px-3 py-2 text-center"
                    >
                      <Indicator
                        color={resolveVorStatus(row.tx1, `${prefix}.${index}.tx1`, overrides)}
                        label={`${row.name} system`}
                      />
                    </td>
                  ) : (["tx1", "tx2"] as const).map((tx) => {
                    const fieldId = `${prefix}.${index}.${tx}`;
                    const color = resolveVorStatus(row[tx], fieldId, overrides);
                    const batteryCharger = title === "System Power Status" && row.name === "Battery Charger";
                    return (
                      <td key={tx} data-vor-field-id={fieldId} className="px-3 py-2 text-center">
                        {batteryCharger ? (
                          <span className="pmdt-rms-battery-value">{tx === "tx1" ? "Off" : "Trickle"}</span>
                        ) : (
                          <Indicator color={color} label={`${row.name} ${tx}`} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            ))}</tbody>
          </table>
        </Panel>
      ))}
    </div>
  );
}
