"use client";

import type { VorIndicatorColor } from "@/lib/vor-types";
import { resolveVorField, resolveVorStatus, useVorPmdtStore } from "@/stores/vor-pmdt-store";

const currentClasses: Record<VorIndicatorColor, string> = {
  green: "pmdt-monitor-current--green",
  yellow: "pmdt-monitor-current--yellow",
  red: "pmdt-monitor-current--red",
  gray: "pmdt-monitor-current--gray",
};

export function MonitorSidebandVswr() {
  const data = useVorPmdtStore((state) => state.data);
  const sidebandLimits = useVorPmdtStore((state) => state.config.monitor.sidebandVswr);
  const values = useVorPmdtStore((state) => state.data.vswrData);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <section className="pmdt-monitor-sideband-vswr" aria-label="Sideband antenna VSWR">
      <time className="pmdt-monitor-date">{data.timestamp}</time>
      <div className="pmdt-vswr-columns">
        {[0, 1, 2].map((column) => (
          <table key={column}>
            <thead><tr><th scope="col">Antenna</th><th scope="col">VSWR</th></tr></thead>
            <tbody>
              {values.slice(column * 16, column * 16 + 16).map((baseValue, row) => {
                const index = column * 16 + row;
                const fieldId = `vswrData.${index}`;
                const value = resolveVorField(baseValue, fieldId, overrides);
                const numericValue = Number(value);
                const baseStatus = numericValue >= sidebandLimits.alarm
                  ? "red"
                  : numericValue >= sidebandLimits.preAlarm
                    ? "yellow"
                    : "green";
                const status = resolveVorStatus(baseStatus, fieldId, overrides);
                return (
                  <tr key={index}>
                    <th scope="row">{index + 1}</th>
                    <td>
                      <span data-vor-field-id={fieldId} className={currentClasses[status]}>
                        {Number(value).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className="pmdt-vswr-bottom-spacer" aria-hidden="true">
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        ))}
      </div>
    </section>
  );
}
