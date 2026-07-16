"use client";

import type { VorIndicatorAlert, VorIndicatorColor } from "@/lib/vor-types";
import { resolveVorStatus, useVorPmdtStore } from "@/stores/vor-pmdt-store";

const indicatorClasses: Record<VorIndicatorColor, string> = {
  green: "bg-[#22c55e]", yellow: "bg-[#eab308]", red: "bg-[#ef4444]", gray: "bg-[#6b7280]",
};

function AlertGroup({ title, prefix, alerts }: { title: string; prefix: string; alerts: VorIndicatorAlert[] }) {
  const overrides = useVorPmdtStore((state) => state.overrides);
  return (
    <section className="border border-[#334155] bg-[#111827]">
      <h3 className="border-b border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold">{title}</h3>
      <ul className="grid gap-px bg-[#273449] sm:grid-cols-2">
        {alerts.map((alert, index) => {
          const fieldId = `${prefix}.${index}.indicator`;
          const color = resolveVorStatus(alert.indicator, fieldId, overrides);
          return (
            <li key={alert.label} data-vor-field-id={fieldId} className="flex min-h-8 items-center justify-between gap-3 bg-[#0f172a] px-3 py-1.5 text-[10px] text-[#cbd5e1]">
              <span>{alert.label}</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden className={`size-2.5 rounded-full border border-black/40 ${indicatorClasses[color]}`} /><span className="sr-only">{color}</span></span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TxStatus() {
  const data = useVorPmdtStore((state) => state.data);
  return (
    <div className="grid gap-3 p-3 xl:grid-cols-2">
      <AlertGroup title="System Alerts" prefix="txSystemAlerts" alerts={data.txSystemAlerts} />
      <AlertGroup title="Carrier PA Alerts" prefix="txCarrierPaAlerts" alerts={data.txCarrierPaAlerts} />
      <AlertGroup title="Synthesizer Alerts" prefix="txSynthesizerAlerts" alerts={data.txSynthesizerAlerts} />
      <AlertGroup title="Sideband PA Alerts" prefix="txSidebandPaAlerts" alerts={data.txSidebandPaAlerts} />
    </div>
  );
}
