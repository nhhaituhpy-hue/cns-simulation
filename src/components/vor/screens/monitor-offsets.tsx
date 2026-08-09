"use client";

import { Fragment } from "react";
import { resolveVorField, resolveVorStatus, useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtToolbar } from "../pmdt-toolbar";

function OffsetCell({
  fieldId,
  label,
  value,
  digits,
  overrides,
}: {
  fieldId: string;
  label: string;
  value: number | null;
  digits: number;
  overrides: ReturnType<typeof useVorPmdtStore.getState>["overrides"];
}) {
  const resolved = resolveVorField(value, fieldId, overrides);
  const status = resolveVorStatus("green", fieldId, overrides);
  const displayValue = resolved === null ? null : resolved.toFixed(digits);

  return (
    <td
      data-vor-field-id={fieldId}
      className={`pmdt-offset-value pmdt-offset-value--${status}`}
    >
      {displayValue === null ? (
        <span className="pmdt-offset-empty">&nbsp;</span>
      ) : (
        <input
          aria-label={label}
          type="text"
          inputMode="decimal"
          value={displayValue}
          readOnly
          tabIndex={-1}
          step="0.1"
        />
      )}
    </td>
  );
}

export function MonitorOffsets({ monitorNumber }: { monitorNumber: 1 | 2 }) {
  const rows = useVorPmdtStore((state) => state.derived.monitorOffsets[monitorNumber === 1 ? "mon1" : "mon2"]);
  const overrides = useVorPmdtStore((state) => state.overrides);
  const timestamp = useVorPmdtStore((state) => state.data.timestamp);
  const digitsFor = (parameter: string) => parameter === "Azimuth Angle Offset" ? 2 : 1;

  return (
    <section className="pmdt-monitor-offsets flex min-h-full flex-col" aria-label={`Monitor ${monitorNumber} offsets and scale factors`}>
      <PmdtToolbar title={`Monitor ${monitorNumber} Offsets and Scale Factors`} />
      <div className="pmdt-monitor-tabbar pmdt-monitor-offsets-tabbar flex gap-1 border-b border-[#d0d0d0] bg-[#f0f0f0] px-3 pt-2" role="tablist" aria-label="Monitor offsets tabs">
        <button type="button" role="tab" aria-selected="true" className="min-h-8 border border-b-0 border-[#a6a6a6] bg-white px-2 text-[10px] font-normal text-black">
          Offsets and Scale Factors
        </button>
      </div>
      <div className="pmdt-monitor-offsets-content min-h-0 flex-1 overflow-auto">
        <time className="pmdt-monitor-date">{timestamp}</time>
        <table className="pmdt-monitor-offsets-table">
          <colgroup>
            <col className="pmdt-offset-col-label" />
            <col className="pmdt-offset-col-integral" />
            <col className="pmdt-offset-col-gap" />
            <col className="pmdt-offset-col-standby" />
            <col className="pmdt-offset-col-test" />
            <col className="pmdt-offset-col-unit" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col"><span>Integral</span></th>
              <th scope="col" />
              <th scope="col"><span>Standby</span></th>
              <th scope="col"><span>Test Generator /<br />Certification</span></th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <Fragment key={row.parameter}>
                {index === 6 && <tr className="pmdt-offset-row-group-start"><td colSpan={6} /></tr>}
                <tr>
                  <th scope="row">{row.parameter}</th>
                  <OffsetCell
                    fieldId={`monitorOffsets.${monitorNumber}.${index}.integral`}
                    label={`${row.parameter} Integral`}
                    value={row.integral}
                    digits={digitsFor(row.parameter)}
                    overrides={overrides}
                  />
                  <td className="pmdt-offset-gap" aria-hidden="true" />
                  <OffsetCell
                    fieldId={`monitorOffsets.${monitorNumber}.${index}.standby`}
                    label={`${row.parameter} Standby`}
                    value={row.standby}
                    digits={digitsFor(row.parameter)}
                    overrides={overrides}
                  />
                  <OffsetCell
                    fieldId={`monitorOffsets.${monitorNumber}.${index}.testGen`}
                    label={`${row.parameter} Test Generator / Certification`}
                    value={row.testGen}
                    digits={digitsFor(row.parameter)}
                    overrides={overrides}
                  />
                  <td className="pmdt-offset-unit">{row.unit || ""}</td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
