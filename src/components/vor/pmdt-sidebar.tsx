"use client";

import type {
  VorIndicatorColor,
  VorParameterStatus,
} from "@/lib/vor-types";
import {
  resolveVorField,
  resolveVorStatus,
  useVorPmdtStore,
} from "@/stores/vor-pmdt-store";

const indicatorClasses: Record<VorIndicatorColor, string> = {
  green: "bg-[#22c55e]",
  yellow: "bg-[#eab308]",
  red: "bg-[#ef4444]",
  gray: "bg-[#6b7280]",
};

const indicatorLabels: Record<VorIndicatorColor, string> = {
  green: "Bình thường",
  yellow: "Cảnh báo",
  red: "Báo động",
  gray: "Không hoạt động",
};

const parameterClasses: Record<VorParameterStatus, string> = {
  normal: "border-[#1d6837] bg-[#0f3a1f] text-[#bbf7d0]",
  warning: "border-[#745f17] bg-[#3a2f0f] text-[#fef08a]",
  alarm: "border-[#7f1d1d] bg-[#3a0f0f] text-[#fecaca]",
};

function Indicator({ color }: { color: VorIndicatorColor }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={`size-2.5 shrink-0 rounded-full border border-black/30 ${indicatorClasses[color]}`}
      />
      <span className="sr-only">{indicatorLabels[color]}</span>
    </span>
  );
}

const transmitterRows = [
  { key: "main", label: "Main" },
  { key: "antenna", label: "Antenna" },
  { key: "load", label: "Load" },
  { key: "off", label: "Off" },
] as const;

const parameterRows = [
  { key: "azimuth", label: "Azimuth", digits: 2 },
  { key: "hz30Mod", label: "30 Hz", digits: 1 },
  { key: "hz9960Mod", label: "9960 Hz", digits: 1 },
  { key: "deviation", label: "Dev", digits: 2 },
  { key: "rfLevel", label: "RF", digits: 1 },
] as const;

export function PmdtSidebar() {
  const data = useVorPmdtStore((state) => state.data);
  const overrides = useVorPmdtStore((state) => state.overrides);

  return (
    <aside className="min-h-0 overflow-y-auto border-r border-[#334155] bg-[#0f172a] p-2 text-xs text-[#cbd5e1]">
      <section aria-labelledby="connection-heading" className="border border-[#334155] bg-[#111827] p-2">
        <h2 id="connection-heading" className="sr-only">Kết nối</h2>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-[#e2e8f0]">Connection</span>
          <span className="inline-flex items-center gap-1.5 border border-[#166534] bg-[#0f3a1f] px-2 py-1 text-[10px] font-semibold text-[#bbf7d0]">
            <Indicator color={data.connected ? "green" : "red"} />
            {data.connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="mt-2 flex gap-4">
          {[
            ["Alert", data.alert],
            ["Local", data.local],
          ].map(([label, checked]) => (
            <label key={String(label)} className="flex items-center gap-1.5 text-[11px]">
              <input
                type="checkbox"
                checked={Boolean(checked)}
                disabled
                className="size-3 accent-[#22c55e] disabled:opacity-100"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="transmitters-heading" className="mt-2 border border-[#334155] bg-[#111827] p-2">
        <h2 id="transmitters-heading" className="mb-2 font-semibold text-[#e2e8f0]">Transmitters</h2>
        <div className="grid grid-cols-[1fr_2.25rem_2.25rem] gap-y-1.5 text-[10px]">
          <span />
          <span className="text-center font-semibold">Tx1</span>
          <span className="text-center font-semibold">Tx2</span>
          {transmitterRows.map((row) => (
            <div key={row.key} className="contents">
              <span>{row.label}</span>
              {(["tx1", "tx2"] as const).map((transmitter) => {
                const color = resolveVorStatus(
                  data.transmitters[transmitter][row.key],
                  `transmitters.${transmitter}.${row.key}`,
                  overrides,
                );
                return <span key={transmitter} className="text-center"><Indicator color={color} /></span>;
              })}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="monitors-heading" className="mt-2 border border-[#334155] bg-[#111827] p-2">
        <h2 id="monitors-heading" className="mb-2 font-semibold text-[#e2e8f0]">Monitors Integral</h2>
        <dl className="grid gap-1.5 text-[10px]">
          {[
            ["Normal", data.monitorIntegral.normal, "green"],
            ["Pri Alarm", data.monitorIntegral.priAlarm, "red"],
            ["Sec Alarm", data.monitorIntegral.secAlarm, "yellow"],
            ["Bypass", data.monitorIntegral.bypass, "yellow"],
          ].map(([label, active, activeColor]) => (
            <div key={String(label)} className="flex items-center justify-between">
              <dt>{label}</dt>
              <dd><Indicator color={active ? (activeColor as VorIndicatorColor) : "gray"} /></dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="parameters-heading" className="mt-2 border border-[#334155] bg-[#111827] p-2">
        <h2 id="parameters-heading" className="mb-2 font-semibold text-[#e2e8f0]">Monitor 1 - Antenna 1</h2>
        <dl className="grid gap-1.5">
          {parameterRows.map((row) => {
            const parameter = data.sidebarParams[row.key];
            const value = resolveVorField(parameter.value, `sidebarParams.${row.key}.value`, overrides);
            const status = resolveVorStatus(parameter.status, `sidebarParams.${row.key}.value`, overrides);
            return (
              <div key={row.key} className={`flex items-center justify-between border px-2 py-1 ${parameterClasses[status]}`}>
                <dt>{row.label}</dt>
                <dd className="font-mono font-semibold tabular-nums">{value.toFixed(row.digits)}</dd>
              </div>
            );
          })}
        </dl>
      </section>
    </aside>
  );
}
