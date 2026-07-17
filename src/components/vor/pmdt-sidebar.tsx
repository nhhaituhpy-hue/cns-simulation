"use client";

import type {
  VorEditableValue,
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
      <span aria-hidden className={`size-2.5 shrink-0 rounded-full border border-black/30 ${indicatorClasses[color]}`} />
      <span className="sr-only">{indicatorLabels[color]}</span>
    </span>
  );
}

function fieldMetadata(
  fieldId: string,
  label: string,
  value: VorEditableValue,
  status: VorIndicatorColor | VorParameterStatus,
) {
  return {
    "data-vor-field-id": fieldId,
    "data-vor-field-label": label,
    "data-vor-field-value": String(value ?? ""),
    "data-vor-field-type": typeof value,
    "data-vor-field-status": status,
  };
}

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
  { key: "azimuth", label: "Azimuth", digits: 2 },
  { key: "hz30Mod", label: "30 Hz", digits: 1 },
  { key: "hz9960Mod", label: "9960 Hz", digits: 1 },
  { key: "deviation", label: "Dev", digits: 2 },
  { key: "rfLevel", label: "RF", digits: 1 },
] as const;

export function PmdtSidebar() {
  const data = useVorPmdtStore((state) => state.data);
  const mode = useVorPmdtStore((state) => state.mode);
  const overrides = useVorPmdtStore((state) => state.overrides);
  const studentFieldStates = useVorPmdtStore((state) => state.studentFieldStates);
  const interactWithSidebar = useVorPmdtStore((state) => state.interactWithSidebar);

  const displayInteractiveField = (
    fieldId: string,
    baseValue: boolean,
    activeColor: VorIndicatorColor,
  ) => {
    if (mode !== "student") {
      const value = resolveVorField(baseValue, fieldId, overrides);
      return {
        value,
        status: resolveVorStatus(value ? activeColor : "gray", fieldId, overrides),
      };
    }
    const studentState = studentFieldStates.find((item) => item.fieldId === fieldId);
    return {
      value: studentState ? Boolean(studentState.value) : baseValue,
      status: (studentState?.status ?? (baseValue ? activeColor : "gray")) as VorIndicatorColor,
    };
  };

  const toggleInteractiveField = (
    fieldId: string,
    label: string,
    currentValue: boolean,
    currentStatus: VorIndicatorColor,
    activeColor: VorIndicatorColor,
  ) => {
    if (mode !== "student") return;
    const target = overrides.find((item) => item.fieldId === fieldId);
    const targetValue = target ? Boolean(target.value) : true;
    const targetStatus = (target?.status ?? activeColor) as VorIndicatorColor;
    const isAtTarget = currentValue === targetValue && currentStatus === targetStatus;
    interactWithSidebar(
      fieldId,
      label,
      isAtTarget ? false : targetValue,
      isAtTarget ? "gray" : targetStatus,
    );
  };

  const connected = resolveVorField(data.connected, "connected", overrides);
  const connectedColor = resolveVorStatus(connected ? "green" : "red", "connected", overrides);
  const alert = resolveVorField(data.alert, "alert", overrides);
  const alertColor = resolveVorStatus(alert ? "yellow" : "gray", "alert", overrides);
  const localState = displayInteractiveField("local", data.local, "yellow");

  return (
    <aside className="min-h-0 overflow-y-auto border-r border-[#334155] bg-[#0f172a] p-2 text-xs text-[#cbd5e1]">
      <section aria-label="Connection" className="border border-[#334155] bg-[#111827] p-2">
        <span
          {...fieldMetadata("connected", "Connection", connected, connectedColor)}
          className="flex items-center justify-center gap-2 border border-[#166534] bg-[#0f3a1f] px-2 py-1.5 text-[10px] font-semibold text-[#bbf7d0]"
        >
          <Indicator color={connectedColor} />
          {connected ? "Connected" : "Disconnected"}
        </span>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <span
            {...fieldMetadata("alert", "Alert", alert, alertColor)}
            className="inline-flex min-h-7 items-center justify-center gap-1.5 rounded px-1 text-[11px]"
          >
            <span aria-hidden className={`size-3 rounded-sm border border-black/30 ${indicatorClasses[alertColor]}`} />
            Alert
          </span>
          <button
            type="button"
            {...fieldMetadata("local", "Local", localState.value, localState.status)}
            onClick={() => toggleInteractiveField("local", "Local", localState.value, localState.status, "yellow")}
            aria-pressed={localState.value}
            title={mode === "student" ? "Ghi nhận thao tác Local" : undefined}
            className={`inline-flex min-h-7 items-center justify-center gap-1.5 rounded px-1 text-[11px] ${
              mode === "student"
                ? "cursor-pointer hover:bg-[#1e293b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
                : "cursor-default"
            }`}
          >
            <span aria-hidden className={`size-3 rounded-sm border border-black/30 ${indicatorClasses[localState.status]}`} />
            Local
          </button>
        </div>
      </section>

      <section aria-labelledby="transmitters-heading" className="mt-2 border border-[#334155] bg-[#111827] p-2">
        <h2 id="transmitters-heading" className="mb-2 font-semibold text-[#e2e8f0]">Transmitters</h2>
        <div className="grid grid-cols-[1fr_2.25rem_2.25rem] gap-y-1.5 text-[10px]">
          <span /><span className="text-center font-semibold">Tx1</span><span className="text-center font-semibold">Tx2</span>
          {transmitterRows.map((row) => (
            <div key={row.key} className="contents">
              <span>{row.label}</span>
              {(["tx1", "tx2"] as const).map((transmitter) => {
                const fieldId = `transmitters.${transmitter}.${row.key}`;
                const color = resolveVorStatus(data.transmitters[transmitter][row.key], fieldId, overrides);
                return <span key={transmitter} {...fieldMetadata(fieldId, `${row.label} ${transmitter.toUpperCase()}`, color, color)} className="text-center"><Indicator color={color} /></span>;
              })}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="monitors-heading" className="mt-2 border border-[#334155] bg-[#111827] p-2">
        <h2 id="monitors-heading" className="mb-2 font-semibold text-[#e2e8f0]">Monitors Integral</h2>
        <div className="grid gap-1.5 text-[10px]">
          {monitorRows.map((row) => {
            const fieldId = `monitorIntegral.${row.key}`;
            const interactive = row.key === "bypass";
            const state = interactive
              ? displayInteractiveField(fieldId, data.monitorIntegral[row.key], row.activeColor)
              : (() => {
                  const value = resolveVorField(data.monitorIntegral[row.key], fieldId, overrides);
                  return { value, status: resolveVorStatus(value ? row.activeColor : "gray", fieldId, overrides) };
                })();
            const content = <><span>{row.label}</span><Indicator color={state.status} /></>;
            return interactive ? (
              <button key={row.key} type="button" {...fieldMetadata(fieldId, row.label, state.value, state.status)} onClick={() => toggleInteractiveField(fieldId, row.label, state.value, state.status, row.activeColor)} aria-label={row.label} aria-pressed={state.value} title={mode === "student" ? "Ghi nhận thao tác Bypass" : undefined} className={`flex min-h-6 items-center justify-between rounded px-1 ${mode === "student" ? "cursor-pointer hover:bg-[#1e293b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]" : "cursor-default"}`}>{content}</button>
            ) : (
              <div key={row.key} {...fieldMetadata(fieldId, row.label, state.value, state.status)} className="flex min-h-6 items-center justify-between px-1">{content}</div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="parameters-heading" className="mt-2 border border-[#334155] bg-[#111827] p-2">
        <h2 id="parameters-heading" className="mb-2 font-semibold text-[#e2e8f0]">Monitor 1 - Antenna 1</h2>
        <dl className="grid gap-1.5">
          {parameterRows.map((row) => {
            const fieldId = `sidebarParams.${row.key}.value`;
            const parameter = data.sidebarParams[row.key];
            const value = resolveVorField(parameter.value, fieldId, overrides);
            const status = resolveVorStatus(parameter.status, fieldId, overrides);
            return (
              <div key={row.key} {...fieldMetadata(fieldId, row.label, value, status)} className={`flex items-center justify-between border px-2 py-1 ${parameterClasses[status]}`}>
                <dt>{row.label}</dt><dd className="font-mono font-semibold tabular-nums">{value.toFixed(row.digits)}</dd>
              </div>
            );
          })}
        </dl>
      </section>
    </aside>
  );
}
