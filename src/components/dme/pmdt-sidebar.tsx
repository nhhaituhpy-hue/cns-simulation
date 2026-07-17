"use client";

import type { DmeIndicatorColor } from "@/lib/dme-types";
import {
  resolveDmeField,
  resolveDmeStatus,
  useDmePmdtStore,
} from "@/stores/dme-pmdt-store";
import { DmeIndicator, dmeFieldMetadata } from "./screens/screen-primitives";

const indicatorClasses: Record<DmeIndicatorColor, string> = {
  green: "bg-[#22c55e]",
  yellow: "bg-[#eab308]",
  red: "bg-[#ef4444]",
  gray: "bg-[#6b7280]",
};

const parameterClasses = {
  normal: "border-[#1d6837] bg-[#0f3a1f] text-[#bbf7d0]",
  warning: "border-[#745f17] bg-[#3a2f0f] text-[#fef08a]",
  alarm: "border-[#7f1d1d] bg-[#3a0f0f] text-[#fecaca]",
} as const;

const transmitterRows = [
  { key: "main", label: "Main" },
  { key: "antenna", label: "Antenna" },
  { key: "load", label: "Load" },
  { key: "off", label: "Off" },
] as const;

const monitorRows = [
  { key: "normal", label: "Normal", activeColor: "green" },
  { key: "priAlarm", label: "Pri Alarm", activeColor: "red" },
  { key: "secAlarm", label: "Sec Alarm", activeColor: "yellow" },
  { key: "bypass", label: "Bypass", activeColor: "yellow" },
] as const;

const parameterRows = [
  { key: "delay", label: "Delay" },
  { key: "spacing", label: "Spacing" },
  { key: "txPower", label: "Tx Power" },
  { key: "erp", label: "ERP" },
  { key: "efficiency", label: "Efficiency" },
  { key: "prf", label: "PRF" },
] as const;

export function PmdtSidebar() {
  const data = useDmePmdtStore((state) => state.data);
  const mode = useDmePmdtStore((state) => state.mode);
  const overrides = useDmePmdtStore((state) => state.overrides);
  const studentFieldStates = useDmePmdtStore((state) => state.studentFieldStates);
  const interactWithSidebar = useDmePmdtStore((state) => state.interactWithSidebar);

  function interactiveState(
    fieldId: string,
    baseValue: boolean,
    activeColor: DmeIndicatorColor,
  ) {
    if (mode !== "student") {
      const value = resolveDmeField(baseValue, fieldId, overrides);
      return {
        value,
        status: resolveDmeStatus(value ? activeColor : "gray", fieldId, overrides),
      };
    }
    const studentState = studentFieldStates.find((item) => item.fieldId === fieldId);
    return {
      value: studentState ? Boolean(studentState.value) : baseValue,
      status: (studentState?.status ?? (baseValue ? activeColor : "gray")) as DmeIndicatorColor,
    };
  }

  function toggleInteractive(
    fieldId: string,
    label: string,
    currentValue: boolean,
    currentStatus: DmeIndicatorColor,
    activeColor: DmeIndicatorColor,
  ) {
    if (mode !== "student") return;
    const target = overrides.find((item) => item.fieldId === fieldId);
    const targetValue = target ? Boolean(target.value) : true;
    const targetStatus = (target?.status ?? activeColor) as DmeIndicatorColor;
    const isAtTarget = currentValue === targetValue && currentStatus === targetStatus;
    interactWithSidebar(
      fieldId,
      label,
      isAtTarget ? false : targetValue,
      isAtTarget ? "gray" : targetStatus,
    );
  }

  const connected = resolveDmeField(data.connected, "connected", overrides);
  const connectedStatus = resolveDmeStatus(connected ? "green" : "red", "connected", overrides);
  const alert = resolveDmeField(data.alert, "alert", overrides);
  const alertStatus = resolveDmeStatus(alert ? "yellow" : "gray", "alert", overrides);
  const local = interactiveState("local", data.local, "yellow");

  return (
    <aside className="min-h-0 overflow-y-auto border-r border-[#334155] bg-[#0f172a] p-2 text-[10px] text-[#cbd5e1]">
      <section aria-label="Connection" className="border border-[#334155] bg-[#111827] p-2">
        <span
          {...dmeFieldMetadata("connected", "Connection", connected, connectedStatus)}
          className="flex items-center justify-center gap-2 border border-[#166534] bg-[#0f3a1f] px-2 py-1.5 font-semibold text-[#bbf7d0]"
        >
          <DmeIndicator color={connectedStatus} />
          {connected ? "Connected" : "Disconnected"}
        </span>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <span
            {...dmeFieldMetadata("alert", "Alert", alert, alertStatus)}
            className="inline-flex min-h-7 items-center justify-center gap-1.5 rounded px-1"
          >
            <span aria-hidden className={`size-3 rounded-sm border border-black/30 ${indicatorClasses[alertStatus]}`} />
            Alert
          </span>
          <button
            type="button"
            {...dmeFieldMetadata("local", "Local", local.value, local.status)}
            onClick={() => toggleInteractive("local", "Local", local.value, local.status, "yellow")}
            aria-pressed={local.value}
            title={mode === "student" ? "Ghi nhận thao tác Local" : undefined}
            className={`inline-flex min-h-7 items-center justify-center gap-1.5 rounded px-1 ${
              mode === "student"
                ? "cursor-pointer hover:bg-[#1e293b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
                : "cursor-default"
            }`}
          >
            <span aria-hidden className={`size-3 rounded-sm border border-black/30 ${indicatorClasses[local.status]}`} />
            Local
          </button>
        </div>
      </section>

      <section aria-labelledby="dme-sidebar-transmitters" className="mt-2 border border-[#334155] bg-[#111827] p-2">
        <h2 id="dme-sidebar-transmitters" className="mb-2 text-center font-semibold text-[#e2e8f0]">Transmitters</h2>
        <div className="grid grid-cols-[1fr_2.25rem_2.25rem] gap-y-1.5">
          <span /><span className="text-center font-semibold">Tx1</span><span className="text-center font-semibold">Tx2</span>
          {transmitterRows.map((row) => (
            <div key={row.key} className="contents">
              <span>{row.label}</span>
              {(["tx1", "tx2"] as const).map((transmitter) => {
                const fieldId = `transmitters.${transmitter}.${row.key}`;
                const color = resolveDmeStatus(data.transmitters[transmitter][row.key], fieldId, overrides);
                return (
                  <span key={transmitter} {...dmeFieldMetadata(fieldId, `${row.label} ${transmitter.toUpperCase()}`, color, color)} className="text-center">
                    <DmeIndicator color={color} />
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="dme-sidebar-monitors" className="mt-2 border border-[#334155] bg-[#111827] p-2">
        <h2 id="dme-sidebar-monitors" className="mb-2 text-center font-semibold text-[#e2e8f0]">Monitors</h2>
        <div className="grid grid-cols-[1fr_2.6rem_2.6rem] gap-y-1.5">
          <span /><span className="text-center font-semibold">Integral</span><span className="text-center font-semibold">Standby</span>
          {monitorRows.map((row) => (
            <div key={row.key} className="contents">
              <span>{row.label}</span>
              {(["integral", "standby"] as const).map((monitor) => {
                const fieldId = `monitors.${monitor}.${row.key}`;
                const baseValue = data.monitors[monitor][row.key];
                const state = row.key === "bypass"
                  ? interactiveState(fieldId, baseValue, row.activeColor)
                  : {
                      value: resolveDmeField(baseValue, fieldId, overrides),
                      status: resolveDmeStatus(baseValue ? row.activeColor : "gray", fieldId, overrides),
                    };
                return row.key === "bypass" ? (
                  <button
                    key={monitor}
                    type="button"
                    {...dmeFieldMetadata(fieldId, `${monitor} ${row.label}`, state.value, state.status)}
                    onClick={() => toggleInteractive(fieldId, `${monitor} ${row.label}`, state.value, state.status, row.activeColor)}
                    aria-pressed={state.value}
                    className={mode === "student" ? "rounded hover:bg-[#1e293b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]" : "cursor-default"}
                  >
                    <DmeIndicator color={state.status} />
                  </button>
                ) : (
                  <span key={monitor} {...dmeFieldMetadata(fieldId, `${monitor} ${row.label}`, state.value, state.status)} className="text-center">
                    <DmeIndicator color={state.status} />
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="dme-sidebar-parameters" className="mt-2 border border-[#334155] bg-[#111827] p-2">
        <h2 id="dme-sidebar-parameters" className="mb-2 text-center font-semibold text-[#e2e8f0]">Monitor 1</h2>
        <dl className="grid gap-1">
          {parameterRows.map((row) => {
            const parameter = data.sidebarParams[row.key];
            const fieldId = `sidebarParams.${row.key}.value`;
            const value = resolveDmeField(parameter.value, fieldId, overrides);
            const status = resolveDmeStatus(parameter.status, fieldId, overrides);
            return (
              <div key={row.key} {...dmeFieldMetadata(fieldId, row.label, value, status)} className={`flex items-center justify-between border px-2 py-1 ${parameterClasses[status]}`}>
                <dt>{row.label}</dt>
                <dd className="font-mono font-semibold tabular-nums">{value.toFixed(parameter.digits)}</dd>
              </div>
            );
          })}
        </dl>
      </section>
    </aside>
  );
}
