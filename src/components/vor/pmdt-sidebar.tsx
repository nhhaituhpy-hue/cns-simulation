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
  green: "pmdt-indicator--green",
  yellow: "pmdt-indicator--yellow",
  red: "pmdt-indicator--red",
  gray: "pmdt-indicator--gray",
};

const indicatorLabels: Record<VorIndicatorColor, string> = {
  green: "Normal",
  yellow: "Warning",
  red: "Alarm",
  gray: "Not Operating",
};

const parameterClasses: Record<VorParameterStatus, string> = {
  normal: "pmdt-parameter--normal",
  warning: "pmdt-parameter--warning",
  alarm: "pmdt-parameter--alarm",
};

function Indicator({ color, locked = false }: { color: VorIndicatorColor; locked?: boolean }) {
  const visibleColor = locked ? "gray" : color;
  const label = visibleColor === "green" ? "G" : visibleColor === "yellow" ? "Y" : visibleColor === "red" ? "R" : "";

  return (
    <span className="pmdt-indicator-wrap">
      <span aria-hidden className={`pmdt-indicator ${indicatorClasses[visibleColor]}`}>{label}</span>
      <span className="sr-only">{indicatorLabels[visibleColor]}</span>
    </span>
  );
}

function StateIndicator({ color, locked = false }: { color: VorIndicatorColor; locked?: boolean }) {
  const visibleColor = locked ? "gray" : color;
  const label = visibleColor === "green" ? "G" : visibleColor === "yellow" ? "Y" : visibleColor === "red" ? "R" : "";

  return (
    <span aria-hidden className={`pmdt-state-lamp ${indicatorClasses[visibleColor]}`}>
      {label}
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
  { key: "azimuth", label: "Azimuth Angle", digits: 2 },
  { key: "hz30Mod", label: "30 Hz Mod", digits: 1 },
  { key: "hz9960Mod", label: "9960 Hz Mod", digits: 1 },
  { key: "deviation", label: "Deviation", digits: 2 },
  { key: "rfLevel", label: "RF Level", digits: 1 },
] as const;

export function PmdtSidebar() {
  const data = useVorPmdtStore((state) => state.data);
  const mode = useVorPmdtStore((state) => state.mode);
  const overrides = useVorPmdtStore((state) => state.overrides);
  const studentFieldStates = useVorPmdtStore((state) => state.studentFieldStates);
  const securityLevel = useVorPmdtStore((state) => state.securityLevel);
  const needBackup = useVorPmdtStore((state) => state.needBackup);
  const monitorAlarm = useVorPmdtStore((state) => state.derived.monitorAnnunciation.alarm);
  const loginDialogOpen = useVorPmdtStore((state) => state.loginDialogOpen);
  const interactWithSidebar = useVorPmdtStore((state) => state.interactWithSidebar);
  const setConfigValue = useVorPmdtStore((state) => state.setConfigValue);
  const selectMainTransmitter = useVorPmdtStore((state) => state.selectMainTransmitter);

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
    if (securityLevel < 3) return;
    const target = overrides.find((item) => item.fieldId === fieldId);
    const targetValue = target ? Boolean(target.value) : true;
    const targetStatus = (target?.status ?? activeColor) as VorIndicatorColor;
    const isAtTarget = currentValue === targetValue && currentStatus === targetStatus;
    const nextValue = isAtTarget ? false : targetValue;
    if (fieldId === "monitorIntegral.bypass" && nextValue && !data.local) return;

    const configFieldId = fieldId === "local"
      ? "simulation.local"
      : fieldId === "monitorIntegral.bypass"
        ? "simulation.integralMonitorBypass"
        : null;
    if (!configFieldId) return;
    setConfigValue(configFieldId, nextValue);

    if (mode === "student") {
      interactWithSidebar(
        fieldId,
        label,
        nextValue,
        isAtTarget ? "gray" : targetStatus,
      );
    }
  };

  const connected = resolveVorField(data.connected, "connected", overrides);
  const connectedColor = resolveVorStatus(connected ? "green" : "red", "connected", overrides);
  const alert = resolveVorField(data.alert, "alert", overrides);
  const alertColor = resolveVorStatus(alert ? "yellow" : "gray", "alert", overrides);
  const localState = displayInteractiveField("local", data.local, "yellow");
  // Main selection is a transmitter transfer command. It is available to
  // SEC3/SEC4 without forcing the maintenance Local/Bypass state first.
  const canOperate = securityLevel >= 3;

  return (
    <aside className="pmdt-sidebar">
      <section aria-label="Connection" className="pmdt-sidebar-section">
        <span
          {...fieldMetadata("connected", "Connection", connected, connectedColor)}
          className={`pmdt-connection-badge ${loginDialogOpen ? "pmdt-connection-badge--locked" : connected ? "" : "pmdt-connection-badge--offline"}`}
        >
          {loginDialogOpen ? "" : connected ? "Connected" : "Disconnected"}
        </span>
        <div
          className={`pmdt-sidebar-spacer ${
            !loginDialogOpen && (monitorAlarm || needBackup)
              ? "pmdt-sidebar-spacer--backup"
              : !loginDialogOpen && data.local
                ? "pmdt-sidebar-spacer--local"
                : ""
          }`}
          aria-live="polite"
          title={monitorAlarm
            ? `Monitor vượt ngưỡng Alarm${needBackup ? "; cấu hình vẫn cần Config Backup" : ""}`
            : needBackup ? "Configuration đã Apply nhưng chưa Config Backup" : data.local ? "Hệ thống đang ở Local mode" : undefined}
        >
          {!loginDialogOpen && monitorAlarm ? (
            <span className="pmdt-sidebar-warning-item pmdt-sidebar-warning-item--backup">Alarm</span>
          ) : null}
          {!loginDialogOpen && !monitorAlarm && data.local ? (
            needBackup ? null : (
              <span className="pmdt-sidebar-warning-item pmdt-sidebar-warning-item--local">
                LOCAL
              </span>
            )
          ) : null}
          {!loginDialogOpen && !monitorAlarm && needBackup ? (
            <span className="pmdt-sidebar-warning-item pmdt-sidebar-warning-item--backup">
              Need Backup
            </span>
          ) : null}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <span
            {...fieldMetadata("alert", "Alert", alert, alertColor)}
            className="pmdt-sidebar-state"
          >
            <StateIndicator color={alertColor} locked={loginDialogOpen} />
            Alert
          </span>
          <button
            type="button"
            {...fieldMetadata("local", "Local", localState.value, localState.status)}
            onClick={() => toggleInteractiveField("local", "Local", localState.value, localState.status, "yellow")}
            aria-pressed={localState.value}
            disabled={securityLevel < 3}
            title={securityLevel < 3 ? "GUEST chỉ được xem tham số" : mode === "student" ? "Ghi nhận thao tác Local" : undefined}
            className={`pmdt-sidebar-state ${
              "pmdt-sidebar-state--interactive"
            }`}
          >
            <StateIndicator color={localState.status} locked={loginDialogOpen} />
            Local
          </button>
        </div>
      </section>

      <section aria-labelledby="transmitters-heading" className="pmdt-sidebar-section">
        <h2 id="transmitters-heading" className="pmdt-sidebar-heading">Transmitters</h2>
        <div className="pmdt-transmitter-grid">
          <span className="pmdt-sidebar-grid-blank" />
          <span className="pmdt-transmitter-column-heading">Tx1</span>
          <span className="pmdt-transmitter-label" />
          <span className="pmdt-transmitter-column-heading">Tx2</span>
          <span className="pmdt-sidebar-grid-blank" />
          {transmitterRows.map((row) => {
            const renderTransmitterStatus = (transmitter: "tx1" | "tx2") => {
              const fieldId = `transmitters.${transmitter}.${row.key}`;
              const color = resolveVorStatus(data.transmitters[transmitter][row.key], fieldId, overrides);
              const content = <Indicator color={color} locked={loginDialogOpen} />;
              const metadata = {
                ...fieldMetadata(fieldId, `${row.label} ${transmitter.toUpperCase()}`, color, color),
                "aria-label": `${row.label} ${transmitter.toUpperCase()}`,
              };
              if (row.key === "main") {
                return (
                  <button
                    type="button"
                    key={transmitter}
                    {...metadata}
                    disabled={!canOperate}
                    title={canOperate ? `Chọn ${transmitter.toUpperCase()} làm máy phát chính` : "Yêu cầu SEC3 hoặc SEC4 để chuyển máy phát"}
                    onClick={() => {
                      if (selectMainTransmitter(transmitter) && mode === "student") {
                        interactWithSidebar(fieldId, `${row.label} ${transmitter.toUpperCase()}`, true, "green");
                      }
                    }}
                    className={`pmdt-transmitter-status-cell ${canOperate ? "pmdt-transmitter-status-cell--selectable" : ""}`}
                  >
                    {content}
                  </button>
                );
              }
              return (
                <span
                  key={transmitter}
                  {...metadata}
                  className="pmdt-transmitter-status-cell"
                >
                  {content}
                </span>
              );
            };

            return (
              <div key={row.key} className="contents">
                <span className="pmdt-sidebar-grid-blank" />
                {renderTransmitterStatus("tx1")}
                <span className="pmdt-transmitter-label">{row.label}</span>
                {renderTransmitterStatus("tx2")}
                <span className="pmdt-sidebar-grid-blank" />
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="monitors-heading" className="pmdt-sidebar-section">
        <h2 id="monitors-heading" className="pmdt-sidebar-heading">Monitors</h2>
        <div className="pmdt-monitor-grid">
          <span className="pmdt-monitor-integral-label">Integral</span>
          {monitorRows.map((row) => {
            const fieldId = `monitorIntegral.${row.key}`;
            const interactive = row.key === "bypass";
            const state = interactive
              ? displayInteractiveField(fieldId, data.monitorIntegral[row.key], row.activeColor)
              : (() => {
                  const value = resolveVorField(data.monitorIntegral[row.key], fieldId, overrides);
                  return { value, status: resolveVorStatus(value ? row.activeColor : "gray", fieldId, overrides) };
                })();
            const content = <><span className="pmdt-sidebar-grid-blank" aria-hidden /><Indicator color={state.status} locked={loginDialogOpen} /><span className="pmdt-monitor-label">{row.label}</span></>;
            return interactive ? (
              <button
                key={row.key}
                type="button"
                {...fieldMetadata(fieldId, row.label, state.value, state.status)}
                onClick={() => toggleInteractiveField(fieldId, row.label, state.value, state.status, row.activeColor)}
                aria-label={row.label}
                aria-pressed={state.value}
                disabled={securityLevel < 3 || (!localState.value && !state.value)}
                title={securityLevel < 3 ? "GUEST chỉ được xem tham số" : localState.value ? "Bật hoặc tắt Bypass" : "Bật Local trước khi chọn Bypass"}
                className={`pmdt-monitor-state ${localState.value || state.value ? "pmdt-sidebar-state--interactive" : ""}`}
              >
                {content}
              </button>
            ) : (
              <div key={row.key} {...fieldMetadata(fieldId, row.label, state.value, state.status)} className="pmdt-monitor-state">{content}</div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="parameters-heading" className="pmdt-sidebar-section">
        <h2 id="parameters-heading" className="pmdt-sidebar-heading">Monitor 1 - Antenna 1</h2>
        <dl className="grid gap-1.5">
          {parameterRows.map((row) => {
            const fieldId = `sidebarParams.${row.key}.value`;
            const parameter = data.sidebarParams[row.key];
            const value = resolveVorField(parameter.value, fieldId, overrides);
            const status = resolveVorStatus(parameter.status, fieldId, overrides);
            return (
              <div key={row.key} {...fieldMetadata(fieldId, row.label, value, status)} className={`pmdt-parameter ${parameterClasses[status]}`}>
                <dt>{row.label}</dt><dd className="font-mono font-semibold tabular-nums">{loginDialogOpen ? "" : value.toFixed(row.digits)}</dd>
              </div>
            );
          })}
        </dl>
      </section>
    </aside>
  );
}
