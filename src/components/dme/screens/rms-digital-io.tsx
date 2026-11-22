"use client";

import type { ReactNode } from "react";
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
  // System Power Status renders the engine-maintained data.systemPowerStatus
  // (Stage 1 G13) so facility faults such as an AC failure are visible here.
  // Rows whose second column is gray are station-shared resources and are
  // shown as one centred indicator.
  const centeredSystemRows = new Set(["RMS", "Facilities", "Test Generator", "LCU"]);
  const batteryCharger = data.digitalOutputs.find((row) => row.name === "Battery Charger");

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
              <tr><th scope="row">SPI Bus Fault</th><td /><td><DmeIndicator color="gray" /></td></tr>
              <tr><th scope="row">System Fan Fault</th><td /><td><DmeIndicator color="gray" /></td></tr>
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
            {data.systemPowerStatus.map((row, index) => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                {centeredSystemRows.has(row.name) && row.tx2 === "gray" ? (
                  <td colSpan={2} className="dme-pmdt-system-centered"><DmeIndicator color={resolveDmeStatus(row.tx1, `systemPowerStatus.${index}.tx1`, overrides)} /></td>
                ) : ([row.tx1, row.tx2] as const).map((status, txIndex) => (
                    <td key={txIndex} {...dmeFieldMetadata(`systemPowerStatus.${index}.tx${txIndex + 1}`, `${row.name} Tx ${txIndex + 1}`, status, status)}>
                      <DmeIndicator color={resolveDmeStatus(status, `systemPowerStatus.${index}.tx${txIndex + 1}`, overrides)} />
                    </td>
                  ))}
              </tr>
            ))}
            {batteryCharger ? (
              <tr>
                <th scope="row">Battery Charger</th>
                {([0, 1] as const).map((txIndex) => (
                  <td key={txIndex}>
                    <DmeValueCell
                      fieldId={`digitalOutputs.0.status`}
                      label={`Battery Charger Tx ${txIndex + 1}`}
                      value={batteryCharger.status === "On" ? "On" : batteryCharger.altStatus ?? batteryCharger.status}
                    />
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </DataPanel>
    </div>
  );
}
