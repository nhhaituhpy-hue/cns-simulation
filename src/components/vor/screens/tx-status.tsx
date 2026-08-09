"use client";

import type { VorIndicatorAlert, VorIndicatorColor } from "@/lib/vor-types";
import { resolveVorStatus, useVorPmdtStore } from "@/stores/vor-pmdt-store";

const indicatorClasses: Record<VorIndicatorColor, string> = {
  green: "pmdt-rms-indicator--green",
  yellow: "pmdt-rms-indicator--yellow",
  red: "pmdt-rms-indicator--red",
  gray: "pmdt-rms-indicator--gray",
};

function AlertGroup({
  title,
  prefix,
  alerts,
  txNumber,
  className = "",
  cpuShutdown = false,
}: {
  title: string;
  prefix: string;
  alerts: VorIndicatorAlert[];
  txNumber: 1 | 2;
  className?: string;
  cpuShutdown?: boolean;
}) {
  const overrides = useVorPmdtStore((state) => state.overrides);
  return (
    <section className={`pmdt-tx-alert-group ${className}`}>
      <h3>{title}</h3>
      <ul>
        {alerts.map((alert, index) => {
          const fieldId = `${prefix}.${index}.indicator${txNumber === 2 ? "_tx2" : ""}`;
          const color = resolveVorStatus(alert.indicator, fieldId, overrides);
          const letter = color === "green" ? "G" : color === "yellow" ? "Y" : color === "red" ? "R" : "";
          return (
            <li key={alert.label} data-vor-field-id={fieldId}>
              <span>{alert.label}</span>
              <span aria-label={`${alert.label}: ${color}`} className={`pmdt-rms-indicator ${indicatorClasses[color]}`}>{letter}<span className="sr-only">{color}</span></span>
            </li>
          );
        })}
      </ul>
      {cpuShutdown ? <div className="pmdt-tx-cpu-row"><span>CPU Shutdown</span><span>Normal</span></div> : null}
    </section>
  );
}

export function TxStatus({ txNumber = 1 }: { txNumber?: 1 | 2 }) {
  const data = useVorPmdtStore((state) => state.data);
  return (
    <section className="pmdt-tx-status" aria-label={`Transmitter ${txNumber} status`}>
      <time className="pmdt-monitor-date">{data.timestamp}</time>
      <div className="pmdt-tx-status-grid">
        <AlertGroup title="System Alerts" prefix="txSystemAlerts" alerts={data.txSystemAlerts} txNumber={txNumber} className="pmdt-tx-system-alerts" cpuShutdown />
        <AlertGroup title="Carrier PA Alerts" prefix="txCarrierPaAlerts" alerts={data.txCarrierPaAlerts} txNumber={txNumber} className="pmdt-tx-carrier-alerts" />
        <AlertGroup title="Synthesizer Alerts" prefix="txSynthesizerAlerts" alerts={data.txSynthesizerAlerts} txNumber={txNumber} className="pmdt-tx-synth-alerts" />
        <AlertGroup title="Sideband PA Alerts" prefix="txSidebandPaAlerts" alerts={data.txSidebandPaAlerts} txNumber={txNumber} className="pmdt-tx-sideband-alerts" />
      </div>
    </section>
  );
}
