"use client";

import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtConfigControl } from "../pmdt-config-control";

const offsetKeys = [
  "azimuthAngleOffset",
  "outputPowerScale",
  "voiceModulationScale",
  "identModulationScale",
  "referenceModulationScale",
  "carrierPllControl",
  "carrierSidebandPhaseOffsetCoarse",
  "carrierSidebandPhaseOffsetFine",
  "sideband1PhaseOffset",
  "sideband2PhaseOffset",
  "sideband3PhaseOffset",
  "sideband4PhaseOffset",
  "txSidebandRfLevelScale",
  "sideband1RfLevelScale",
  "sideband2RfLevelScale",
  "sideband3RfLevelScale",
  "sideband4RfLevelScale",
  "sideband1VswrOffset",
  "sideband2VswrOffset",
  "sideband3VswrOffset",
  "sideband4VswrOffset",
] as const;

function offsetDigits(parameter: string): number {
  if (parameter === "Azimuth Angle Offset" || parameter.includes("VSWR")) return 2;
  if (parameter.includes("Scale") || parameter === "Carrier PLL Control") return 1;
  return 1;
}

export function TxConfigOffsets() {
  const data = useVorPmdtStore((state) => state.data);
  const rows = data.txOffsets;

  return (
    <section className="pmdt-tx-offsets" aria-label="Transmitter offsets and scale factors">
      <time className="pmdt-monitor-date">{data.timestamp}</time>
      <table className="pmdt-tx-offset-table">
        <colgroup>
          <col className="pmdt-tx-offset-label" />
          <col className="pmdt-tx-offset-value" />
          <col className="pmdt-tx-offset-value" />
          <col className="pmdt-tx-offset-unit" />
        </colgroup>
        <thead>
          <tr><th scope="col" /><th scope="col">Tx #1</th><th scope="col">Tx #2</th><th scope="col" /></tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.parameter}>
              <th scope="row">{row.parameter}</th>
              {(["tx1", "tx2"] as const).map((tx) => {
                const fieldId = `txOffsets.${index}.${tx}`;
                const configKey = offsetKeys[index] ?? offsetKeys[0];
                return (
                  <td key={tx} data-vor-field-id={fieldId}>
                    <span className="pmdt-tx-offset-spinner">
                      <PmdtConfigControl
                        displayFieldId={fieldId}
                        configFieldId={`transmitters.${tx}.offsets.${configKey}`}
                        type="number"
                        digits={offsetDigits(row.parameter)}
                      />
                    </span>
                  </td>
                );
              })}
              <td>{row.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
