"use client";

import { resolveVorField, useVorPmdtStore } from "@/stores/vor-pmdt-store";

export function RmsLogsOperationalSummary() {
  const summary = useVorPmdtStore((state) => state.data.rmsOperationalSummary);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <div className="pmdt-rms-operational-summary">
      <div className="pmdt-rms-operational-summary-left">
        <table className="pmdt-rms-operational-table">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">Transmitter 1</th>
              <th scope="col">Transmitter 2</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row, index) => (
              <tr key={row.parameter}>
                <th scope="row">{row.parameter}</th>
                <td data-vor-field-id={`rmsOperationalSummary.rows.${index}.tx1`}>
                  {Number(resolveVorField(row.tx1, `rmsOperationalSummary.rows.${index}.tx1`, overrides)).toFixed(2)}
                </td>
                <td data-vor-field-id={`rmsOperationalSummary.rows.${index}.tx2`}>
                  {Number(resolveVorField(row.tx2, `rmsOperationalSummary.rows.${index}.tx2`, overrides)).toFixed(2)}
                </td>
                <td>{row.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="pmdt-rms-availability-table">
          <tbody>
            <tr>
              <th scope="row">Availability</th>
              <td data-vor-field-id="rmsOperationalSummary.availabilityTx1">
                {Number(resolveVorField(summary.availabilityTx1, "rmsOperationalSummary.availabilityTx1", overrides)).toFixed(4)}
              </td>
              <td data-vor-field-id="rmsOperationalSummary.availabilityTx2">
                {Number(resolveVorField(summary.availabilityTx2, "rmsOperationalSummary.availabilityTx2", overrides)).toFixed(4)}
              </td>
              <td>%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="pmdt-rms-operational-summary-fields">
        <label>Start Time <output data-vor-field-id="rmsOperationalSummary.startTime">{summary.startTime}</output></label>
        <label>End Time <output data-vor-field-id="rmsOperationalSummary.endTime">{summary.endTime}</output></label>
        <label>Hours Elapsed <output data-vor-field-id="rmsOperationalSummary.hoursElapsed">{summary.hoursElapsed.toFixed(4)}</output></label>
        <button type="button">Reset Operational Summary</button>
      </div>
    </div>
  );
}
