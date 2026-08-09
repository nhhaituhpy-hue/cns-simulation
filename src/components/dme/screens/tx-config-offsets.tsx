"use client";

import { useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { DmeConfigControl } from "./dme-config-control";
import { PmdtPanel } from "./screen-primitives";

function OffsetValue({ fieldId, label, precision }: { fieldId: string; label: string; precision: number }) {
  return (
    <span className="dme-pmdt-spin-value">
      <DmeConfigControl
        fieldId={fieldId}
        label={label}
        type="number"
        digits={precision}
        className="dme-pmdt-config-input"
      />
      <span aria-hidden className="dme-pmdt-spin-buttons"><span>▲</span><span>▼</span></span>
    </span>
  );
}

export function TxConfigOffsets() {
  const rows = useDmePmdtStore((state) => state.configDraft.txOffsets);
  const precisions = [1, 1, 2];
  return (
    <div className="dme-pmdt-tx-offsets">
      <PmdtPanel title="RTC Parameters">
        <table>
          <thead><tr><th /><th>Tx 1</th><th aria-hidden /><th>Tx 2</th><th /></tr></thead>
          <tbody>{rows.map((row, index) => (
            <tr key={row.parameter}>
              <th scope="row">{row.parameter}</th>
              <td><OffsetValue fieldId={`txOffsets.${index}.tx1`} label={`${row.parameter} Tx 1`} precision={precisions[index] ?? 2} /></td>
              <td aria-hidden />
              <td><OffsetValue fieldId={`txOffsets.${index}.tx2`} label={`${row.parameter} Tx 2`} precision={precisions[index] ?? 2} /></td>
              <td>{row.unit}</td>
            </tr>
          ))}</tbody>
        </table>
      </PmdtPanel>
    </div>
  );
}
