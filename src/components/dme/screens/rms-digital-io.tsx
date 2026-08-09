"use client";

import type { ReactNode } from "react";
import type { DmeIndicatorColor } from "@/lib/dme-types";
import { resolveDmeField, resolveDmeStatus, useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { DmeIndicator, DmeValueCell, dmeFieldMetadata } from "./screen-primitives";

function DataPanel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <fieldset className={className}><legend>{title}</legend>{children}</fieldset>;
}

export function RmsDigitalIo() {
  const data = useDmePmdtStore((state) => state.data);
  const overrides = useDmePmdtStore((state) => state.overrides);
  const fanOutputIndex = data.digitalOutputs.findIndex((row) => row.name === "Fan Control");
  const fanOutput = fanOutputIndex >= 0 ? data.digitalOutputs[fanOutputIndex] : undefined;
  const systemRows: Array<{ label: string; tx1: DmeIndicatorColor | "Trickle"; tx2: DmeIndicatorColor | "Trickle" }> = [
    { label: "Battery Fault", tx1: "green", tx2: "green" },
    { label: "On Battery", tx1: "green", tx2: "green" },
    { label: "Monitor Power", tx1: "green", tx2: "green" },
    { label: "RTC Power", tx1: "green", tx2: "green" },
    { label: "RMS Power", tx1: "green", tx2: "gray" },
    { label: "Facilities Power", tx1: "green", tx2: "gray" },
    { label: "LCU Power", tx1: "green", tx2: "gray" },
    { label: "Battery Charger", tx1: "Trickle", tx2: "Trickle" },
    { label: "48 V PS", tx1: "green", tx2: "green" },
    { label: "BCPS PS", tx1: "green", tx2: "green" },
    { label: "BCPS DC/DC", tx1: "green", tx2: "green" },
  ];
  const centeredSystemRows = new Set(["RMS Power", "Facilities Power", "LCU Power"]);

  return (
    <div className="dme-pmdt-digital-io">
      <div className="dme-pmdt-digital-top">
        <DataPanel title="Digital Inputs">
          <table>
            <thead><tr><th /><th>Configuration</th><th>Status</th></tr></thead>
            <tbody>
              {data.digitalInputs.map((row, index) => (
                <tr key={row.name}>
                  <th scope="row">{row.name}</th>
                  <td {...dmeFieldMetadata(`digitalInputs.${index}.configuration`, `${row.name} Configuration`, row.configuration)}>{resolveDmeField(row.configuration, `digitalInputs.${index}.configuration`, overrides)}</td>
                  <td {...dmeFieldMetadata(`digitalInputs.${index}.status`, `${row.name} Status`, row.status)}><DmeIndicator color={row.status === "Alarm" ? "red" : row.status ? "green" : "gray"} /></td>
                </tr>
              ))}
              <tr><th scope="row">SPI Bus Fault</th><td /><td><DmeIndicator color="green" /></td></tr>
              <tr><th scope="row">System Fan Fault</th><td /><td><DmeIndicator color="green" /></td></tr>
            </tbody>
          </table>
        </DataPanel>

        <DataPanel title="Digital Outputs">
          <table>
            <thead><tr><th /><th>Status</th></tr></thead>
            <tbody>
              {data.digitalOutputs.filter((row) => row.name.startsWith("Spare Output")).map((row, index) => (
                <tr key={row.name}><th scope="row">{row.name}</th><td {...dmeFieldMetadata(`digitalOutputs.${index + 1}.status`, `${row.name} Status`, row.status)}>{resolveDmeField(row.status, `digitalOutputs.${index + 1}.status`, overrides)}</td></tr>
              ))}
              <tr>
                <th scope="row">Fan Control</th>
                <td {...dmeFieldMetadata(
                  fanOutputIndex >= 0 ? `digitalOutputs.${fanOutputIndex}.status` : "digitalOutputs.fanControl.status",
                  "Fan Control Status",
                  fanOutput?.status ?? "Automatic - Off",
                )}>
                  {resolveDmeField(fanOutput?.status ?? "Automatic - Off", fanOutputIndex >= 0 ? `digitalOutputs.${fanOutputIndex}.status` : "digitalOutputs.fanControl.status", overrides)}
                </td>
              </tr>
            </tbody>
          </table>
        </DataPanel>

        <DataPanel title="PA Power Status">
          <table>
            <tbody>
              {data.paStatus.map((row, index) => {
                const fieldId = `paStatus.${index}.outputPower`;
                const color = resolveDmeStatus(row.outputPower, fieldId, overrides);
                return <tr key={row.name}><th scope="row">{row.name}</th><td {...dmeFieldMetadata(fieldId, `${row.name} Power`, color, color)}><DmeIndicator color={color} /></td></tr>;
              })}
            </tbody>
          </table>
        </DataPanel>
      </div>

      <DataPanel title="System Power Status" className="dme-pmdt-system-power">
        <table>
          <thead><tr><th /><th>Tx 1</th><th>Tx 2</th></tr></thead>
          <tbody>
            {systemRows.map((row, index) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {centeredSystemRows.has(row.label) ? (
                  <td colSpan={2} className="dme-pmdt-system-centered"><DmeIndicator color="green" /></td>
                ) : ([row.tx1, row.tx2] as const).map((status, txIndex) => (
                    <td key={txIndex}>
                      {status === "Trickle" ? <DmeValueCell fieldId={`systemPowerStatus.${index}.tx${txIndex + 1}`} label={`${row.label} Tx ${txIndex + 1}`} value="Trickle" /> : <DmeIndicator color={status} />}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </DataPanel>
    </div>
  );
}
