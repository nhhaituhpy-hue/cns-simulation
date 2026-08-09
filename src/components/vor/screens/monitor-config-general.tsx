"use client";

import type { VorIndicatorColor } from "@/lib/vor-types";
import { resolveVorField, resolveVorStatus, useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { PmdtConfigControl } from "../pmdt-config-control";

const accentClasses: Record<VorIndicatorColor, string> = {
  green: "accent-[#22c55e]",
  yellow: "accent-[#eab308]",
  red: "accent-[#ef4444]",
  gray: "accent-[#475569]",
};

const routingParameterKeys: Record<string, string> = {
  "30 Hz Modulation": "hz30Modulation",
  "9960 Hz Modulation": "hz9960Modulation",
  "9960 Hz Deviation": "deviation",
  "RF Level": "rfLevel",
  "Ident Modulation": "identModulation",
  "Ident Status": "identStatus",
  "Ident Code": "identCode",
  "Tx Power": "txPower",
  "Tx Frequency Error": "txFrequencyError",
  "Notch Monitor": "notchMonitor",
  "Sideband VSWR": "sidebandVswr",
};

export function MonitorConfigGeneral() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <section className="pmdt-monitor-routing" aria-label="Monitor configuration general">
      <time className="pmdt-monitor-date">{data.timestamp}</time>
      <fieldset>
        <legend>Executive Alarms</legend>
        <table>
          <colgroup>
            <col className="pmdt-monitor-routing-label-col" />
            <col className="pmdt-monitor-routing-value-col" />
            <col className="pmdt-monitor-routing-value-col" />
            <col className="pmdt-monitor-routing-spacer-col" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" rowSpan={2} />
              <th scope="col" colSpan={2}>Integral Monitor</th>
              <th scope="col" rowSpan={2} />
            </tr>
            <tr>
              <th scope="col">Primary</th>
              <th scope="col">Secondary</th>
            </tr>
          </thead>
          <tbody>
            {data.monitorConfigGeneral.map((row, index) => {
              const prefix = `monitorConfigGeneral.${index}`;
              const displayParameter = row.parameter === "Ident Modulation" ? "Ident Mod %" : row.parameter;
              const enabled = row.isCheckbox
                ? Boolean(resolveVorField(row.checked ?? false, `${prefix}.checked`, overrides))
                : true;
              const checkboxStatus = resolveVorStatus(enabled ? "green" : "gray", `${prefix}.checked`, overrides);
              const routingKey = routingParameterKeys[row.parameter];

              return (
                <tr key={row.parameter}>
                  <th scope="row">
                    {row.isCheckbox ? (
                      <label className="pmdt-monitor-routing-label">
                        <input
                          type="checkbox"
                          aria-label={`${row.parameter} enabled`}
                          data-vor-field-id={`${prefix}.checked`}
                          checked={enabled}
                          readOnly
                          className={accentClasses[checkboxStatus]}
                        />
                        <span>{displayParameter}</span>
                      </label>
                    ) : displayParameter}
                  </th>
                  <td>
                    <PmdtConfigControl
                      displayFieldId={`${prefix}.primary`}
                      configFieldId={routingKey ? `monitor.routing.${routingKey}.primary` : "monitor.routing.azimuth.primary"}
                      type="boolean"
                      disabled={!enabled}
                      className="accent-[#22c55e]"
                    />
                  </td>
                  <td>
                    <PmdtConfigControl
                      displayFieldId={`${prefix}.secondary`}
                      configFieldId={routingKey ? `monitor.routing.${routingKey}.secondary` : "monitor.routing.azimuth.secondary"}
                      type="boolean"
                      disabled={!enabled}
                      className="accent-[#22c55e]"
                    />
                  </td>
                  <td />
                </tr>
              );
            })}
          </tbody>
        </table>
      </fieldset>
    </section>
  );
}
