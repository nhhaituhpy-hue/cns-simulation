"use client";

import type { DmeIndicatorColor, DmeParameterStatus } from "@/lib/dme-types";
import { resolveDmeField, resolveDmeStatus, useDmePmdtStore } from "@/stores/dme-pmdt-store";
import { DmeIndicator, dmeFieldMetadata } from "./screens/screen-primitives";

const indicatorClasses: Record<DmeIndicatorColor, string> = {
  green: "pmdt-indicator--green",
  yellow: "pmdt-indicator--yellow",
  red: "pmdt-indicator--red",
  gray: "pmdt-indicator--gray",
};

const parameterClasses: Record<DmeParameterStatus, string> = {
  normal: "pmdt-parameter--normal",
  warning: "pmdt-parameter--warning",
  alarm: "pmdt-parameter--alarm",
};

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
  const securityLevel = useDmePmdtStore((state) => state.securityLevel);
  const loginDialogOpen = useDmePmdtStore((state) => state.loginDialogOpen);
  const needBackup = useDmePmdtStore((state) => state.needBackup);
  const overrides = useDmePmdtStore((state) => state.overrides);
  const studentFieldStates = useDmePmdtStore((state) => state.studentFieldStates);
  const interactWithSidebar = useDmePmdtStore((state) => state.interactWithSidebar);
  const setLocalMode = useDmePmdtStore((state) => state.setLocalMode);
  const setTransmitterMode = useDmePmdtStore((state) => state.setTransmitterMode);
  const setMonitorBypass = useDmePmdtStore((state) => state.setMonitorBypass);

  function interactiveState(fieldId: string, baseValue: boolean, activeColor: DmeIndicatorColor) {
    if (mode !== "student") {
      const value = resolveDmeField(baseValue, fieldId, overrides);
      return { value, status: resolveDmeStatus(value ? activeColor : "gray", fieldId, overrides) };
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
    if (loginDialogOpen || securityLevel < 2) return;
    const target = overrides.find((item) => item.fieldId === fieldId);
    const targetValue = target ? Boolean(target.value) : true;
    const targetStatus = (target?.status ?? activeColor) as DmeIndicatorColor;
    const isAtTarget = currentValue === targetValue && currentStatus === targetStatus;
    const nextValue = isAtTarget ? false : targetValue;
    if (fieldId === "local") {
      if (!setLocalMode(nextValue)) return;
    } else if (fieldId.startsWith("monitors.")) {
      const monitor = fieldId.includes("integral") ? "integral" : "standby";
      if (!setMonitorBypass(monitor, nextValue)) return;
    }
    if (mode === "student") interactWithSidebar(fieldId, label, nextValue, isAtTarget ? "gray" : targetStatus);
  }

  const connected = resolveDmeField(data.connected, "connected", overrides);
  const connectedStatus = loginDialogOpen ? "gray" : resolveDmeStatus(connected ? "green" : "red", "connected", overrides);
  const alert = resolveDmeField(data.alert, "alert", overrides);
  const alertStatus = resolveDmeStatus(alert ? "yellow" : "gray", "alert", overrides);
  const local = interactiveState("local", data.local, "yellow");
  // Raw installed-monitor rows announce alarms even if voting/Bypass keeps
  // the relay from acting. Unavailable rows are gray, not alarms.
  const monitorAlarm = [...data.integralData, ...data.standbyData].some((row) =>
    row.mon1Status === "alarm" || row.mon2Status === "alarm" || row.mon1Status === "red" || row.mon2Status === "red");

  return (
    <aside className="pmdt-sidebar dme-pmdt-sidebar">
      <section aria-label="Connection" className="pmdt-sidebar-section">
        <span
          {...dmeFieldMetadata("connected", "Connection", connected, connectedStatus)}
          className={`pmdt-connection-badge ${loginDialogOpen ? "pmdt-connection-badge--locked" : connected ? "" : "pmdt-connection-badge--offline"}`}
        >
          {loginDialogOpen ? "" : connected ? "Connected" : "Disconnected"}
        </span>
        <div
          className={`pmdt-sidebar-spacer ${!loginDialogOpen && (monitorAlarm || needBackup) ? "pmdt-sidebar-spacer--backup" : !loginDialogOpen && data.local ? "pmdt-sidebar-spacer--local" : ""}`}
          aria-live="polite"
          title={monitorAlarm ? "Monitor Alarm" : needBackup ? "Configuration đã Apply nhưng chưa Config Backup" : data.local ? "Hệ thống đang ở Local mode" : undefined}
        >
          {!loginDialogOpen && data.local && !needBackup && !monitorAlarm ? <span className="pmdt-sidebar-warning-item pmdt-sidebar-warning-item--local">LOCAL</span> : null}
          {!loginDialogOpen && (monitorAlarm || needBackup) ? <span className="pmdt-sidebar-warning-item pmdt-sidebar-warning-item--backup">{monitorAlarm ? "Alarm" : "Need Backup"}</span> : null}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <span {...dmeFieldMetadata("alert", "Alert", alert, alertStatus)} className="pmdt-sidebar-state">
            <span aria-hidden className={`pmdt-state-lamp ${indicatorClasses[loginDialogOpen ? "gray" : alertStatus]}`} />
            Alert
          </span>
          <button
            type="button"
            {...dmeFieldMetadata("local", "Local", local.value, local.status)}
            onClick={() => toggleInteractive("local", "Local", local.value, local.status, "yellow")}
            aria-pressed={local.value}
            disabled={loginDialogOpen || securityLevel < 3}
            title={securityLevel < 3 ? "Yêu cầu SEC3 hoặc SEC4" : mode === "student" ? "Ghi nhận thao tác Local" : undefined}
            className="pmdt-sidebar-state pmdt-sidebar-state--interactive"
          >
            <span aria-hidden className={`pmdt-state-lamp ${indicatorClasses[loginDialogOpen ? "gray" : local.status]}`} />
            Local
          </button>
        </div>
      </section>

      <section aria-labelledby="dme-sidebar-transmitters" className="pmdt-sidebar-section">
        <h2 id="dme-sidebar-transmitters" className="pmdt-sidebar-heading">Transmitters</h2>
        <div className="pmdt-transmitter-grid">
          <span className="pmdt-sidebar-grid-blank" />
          <span className="pmdt-transmitter-column-heading">Tx1</span>
          <span className="pmdt-transmitter-label" />
          <span className="pmdt-transmitter-column-heading">Tx2</span>
          <span className="pmdt-sidebar-grid-blank" />
          {transmitterRows.map((row) => (
            <div key={row.key} className="contents">
              <span className="pmdt-sidebar-grid-blank" />
              {(["tx1", "tx2"] as const).flatMap((transmitter, index) => {
                const fieldId = `transmitters.${transmitter}.${row.key}`;
                const color = resolveDmeStatus(data.transmitters[transmitter][row.key], fieldId, overrides);
                const lockedColor = loginDialogOpen ? "gray" : color;
                const status = row.key === "main" || row.key === "antenna" ? (
                  <button
                    key={`${transmitter}-status`}
                    type="button"
                    {...dmeFieldMetadata(fieldId, `${row.label} ${transmitter.toUpperCase()}`, color, color)}
                    disabled={loginDialogOpen || securityLevel < 2}
                    title={securityLevel < 2 ? "Yêu cầu SEC2 trở lên" : `Đưa ${transmitter.toUpperCase()} vào Antenna`}
                    onClick={() => {
                      if (setTransmitterMode(transmitter, "antenna") && mode === "student") {
                        interactWithSidebar(fieldId, `${row.label} ${transmitter.toUpperCase()}`, true, "green");
                      }
                    }}
                    className="pmdt-transmitter-status-cell pmdt-transmitter-status-cell--selectable"
                  >
                    <DmeIndicator color={lockedColor} />
                  </button>
                ) : (
                  <span
                    key={`${transmitter}-status`}
                    {...dmeFieldMetadata(fieldId, `${row.label} ${transmitter.toUpperCase()}`, color, color)}
                    className="pmdt-transmitter-status-cell"
                  >
                    <DmeIndicator color={lockedColor} />
                  </span>
                );
                return index === 0
                  ? [status, <span key="label" className="pmdt-transmitter-label">{row.label}</span>]
                  : [status];
              })}
              <span className="pmdt-sidebar-grid-blank" />
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="dme-sidebar-monitors" className="pmdt-sidebar-section">
        <h2 id="dme-sidebar-monitors" className="pmdt-sidebar-heading">Monitors</h2>
        <div className="dme-pmdt-monitor-grid">
          <span className="dme-pmdt-monitor-heading dme-pmdt-monitor-heading--integral">Integral</span>
          <span className="dme-pmdt-monitor-heading dme-pmdt-monitor-heading--standby">Standby</span>
          {monitorRows.map((row) => (
            <div key={row.key} className="contents">
              <span className="pmdt-sidebar-grid-blank" />
              {(["integral", "standby"] as const).flatMap((monitor, index) => {
                const fieldId = `monitors.${monitor}.${row.key}`;
                const baseValue = data.monitors[monitor][row.key];
                const state = row.key === "bypass"
                  ? interactiveState(fieldId, baseValue, row.activeColor)
                  : {
                      value: resolveDmeField(baseValue, fieldId, overrides),
                      status: resolveDmeStatus(baseValue ? row.activeColor : "gray", fieldId, overrides),
                    };
                const indicator = row.key === "bypass" ? (
                  <button
                    key={`${monitor}-status`}
                    type="button"
                    {...dmeFieldMetadata(fieldId, `${monitor} ${row.label}`, state.value, state.status)}
                    onClick={() => toggleInteractive(fieldId, `${monitor} ${row.label}`, state.value, state.status, row.activeColor)}
                    aria-pressed={state.value}
                    disabled={loginDialogOpen || securityLevel < 2 || (!data.local && !state.value)}
                    title={securityLevel < 2 ? "Yêu cầu SEC2 trở lên" : !data.local && !state.value ? "Bật Local trước khi chọn Bypass" : undefined}
                    className="dme-pmdt-monitor-cell pmdt-sidebar-state--interactive"
                  >
                    <DmeIndicator color={loginDialogOpen ? "gray" : state.status} />
                  </button>
                ) : (
                  <span
                    key={`${monitor}-status`}
                    {...dmeFieldMetadata(fieldId, `${monitor} ${row.label}`, state.value, state.status)}
                    className="dme-pmdt-monitor-cell"
                  >
                    <DmeIndicator color={loginDialogOpen ? "gray" : state.status} />
                  </span>
                );
                return index === 0
                  ? [indicator, <span key="label" className="pmdt-monitor-label">{row.label}</span>]
                  : [indicator];
              })}
              <span className="pmdt-sidebar-grid-blank" />
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="dme-sidebar-parameters" className="pmdt-sidebar-section">
        <h2 id="dme-sidebar-parameters" className="pmdt-sidebar-heading">Monitor 1</h2>
        <dl>
          {parameterRows.map((row) => {
            const parameter = data.sidebarParams[row.key];
            const fieldId = `sidebarParams.${row.key}.value`;
            const value = resolveDmeField(parameter.value, fieldId, overrides);
            const status = resolveDmeStatus(parameter.status, fieldId, overrides);
            return (
              <div key={row.key} {...dmeFieldMetadata(fieldId, row.label, value, status)} className={`pmdt-parameter ${parameterClasses[status]}`}>
                <dt>{row.label}</dt>
                <dd className="font-mono font-semibold tabular-nums">{loginDialogOpen ? "" : value.toFixed(parameter.digits)}</dd>
              </div>
            );
          })}
        </dl>
      </section>
    </aside>
  );
}
