"use client";

import { useEffect, useState } from "react";
import { MopiensModal } from "@/modules/operations/mopiens-pmdt";
import { getDme320PermissionDenial } from "../domain/permissions";
import {
  DME320_MONITOR_PARAMETERS,
  type Dme320Command,
  type Dme320CommandResult,
  type Dme320MonitorChannel,
  type Dme320MonitorId,
  type Dme320MonitorParameter,
  type Dme320SimulationState,
} from "../domain/types";
import { DME320_PARAMETER_LABELS } from "./presentation";
import styles from "./dme320-ui.module.css";

const MONITOR_IDS = ["mon1", "mon2"] as const satisfies readonly Dme320MonitorId[];
const MONITOR_CHANNELS = ["executive", "standby"] as const satisfies readonly Dme320MonitorChannel[];

type ParameterValues = Record<Dme320MonitorParameter, string>;

function formatValue(value: number | string | null): string {
  return value === null ? "" : String(value);
}

function valuesFromSimulation(
  simulation: Dme320SimulationState,
  monitorId: Dme320MonitorId,
  channel: Dme320MonitorChannel,
): ParameterValues {
  const readings = simulation.monitors[monitorId].channels[channel].readings;
  return Object.fromEntries(DME320_MONITOR_PARAMETERS.map((parameter) => [
    parameter,
    formatValue(
      simulation.measurementOverrides.find(
        (override) => override.monitorId === monitorId
          && override.channel === channel
          && override.parameter === parameter,
      )?.value ?? readings[parameter].value,
    ),
  ])) as ParameterValues;
}

function channelLabel(channel: Dme320MonitorChannel): string {
  return channel === "executive" ? "Executive" : "Standby";
}

export interface Dme320SimulationParametersDialogProps {
  open: boolean;
  simulation: Dme320SimulationState;
  dispatch: (command: Dme320Command) => Dme320CommandResult;
  onClose: () => void;
}

export function Dme320SimulationParametersDialog({
  open,
  simulation,
  dispatch,
  onClose,
}: Dme320SimulationParametersDialogProps) {
  const [monitorId, setMonitorId] = useState<Dme320MonitorId>("mon1");
  const [channel, setChannel] = useState<Dme320MonitorChannel>("executive");
  const [values, setValues] = useState<ParameterValues>(() => valuesFromSimulation(simulation, "mon1", "executive"));
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const permissionReason = getDme320PermissionDenial(simulation, "setup");
  const editable = permissionReason === null;
  const selectedOverrides = simulation.measurementOverrides.filter(
    (override) => override.monitorId === monitorId && override.channel === channel,
  );

  useEffect(() => {
    if (!open) return;
    setValues(valuesFromSimulation(simulation, monitorId, channel));
    setMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally scoped to open/channel changes
  }, [open, monitorId, channel, refreshToken]);

  function selectMonitor(nextMonitorId: Dme320MonitorId) {
    setMonitorId(nextMonitorId);
    setMessage(null);
  }

  function selectChannel(nextChannel: Dme320MonitorChannel) {
    setChannel(nextChannel);
    setMessage(null);
  }

  function applyOverrides() {
    for (const parameter of DME320_MONITOR_PARAMETERS) {
      const rawValue = values[parameter].trim();
      const value = parameter === "identCode" ? rawValue : Number(rawValue);
      if (parameter !== "identCode" && !Number.isFinite(value)) {
        setMessage(`${DME320_PARAMETER_LABELS[parameter]} must be a finite number.`);
        return;
      }
      const result = dispatch({
        type: "inject-measurement",
        override: {
          monitorId,
          channel,
          parameter,
          value,
          valid: parameter === "identCode" ? rawValue.length > 0 : true,
        },
      });
      if (!result.accepted) {
        setMessage(result.message);
        return;
      }
    }
    setMessage("Simulation parameters applied to the selected monitor channel.");
  }

  function resetSelectedChannel() {
    for (const parameter of DME320_MONITOR_PARAMETERS) {
      const result = dispatch({ type: "clear-measurement", monitorId, channel, parameter });
      if (!result.accepted) {
        setMessage(result.message);
        return;
      }
    }
    setRefreshToken((current) => current + 1);
    setMessage("Selected monitor channel restored to engine defaults.");
  }

  const selectedChannel = simulation.monitors[monitorId].channels[channel];
  const valuesValid = DME320_MONITOR_PARAMETERS.every((parameter) => (
    parameter === "identCode"
      ? values[parameter].trim().length > 0
      : Number.isFinite(Number(values[parameter]))
  ));

  return (
    <MopiensModal
      open={open}
      title="Simulation Parameters..."
      ariaLabel="DME 320 simulation parameters"
      brandLabel="MOPIENS 320 DME"
      size="large"
      onClose={onClose}
      actions={[
        {
          id: "reset",
          label: "Reset to Defaults",
          disabled: !editable || selectedOverrides.length === 0,
          onClick: resetSelectedChannel,
        },
        {
          id: "apply",
          label: "Apply",
          tone: "primary",
          disabled: !editable || !valuesValid,
          onClick: applyOverrides,
        },
        { id: "close", label: "Close", onClick: onClose },
      ]}
    >
      <div className={styles.dialogStack}>
        <p>
          Set raw monitor values used by the in-memory training model. These values are separate from Setup and are not written to Profile Save or Flash.
        </p>

        <div className={styles.setupGrid}>
          <label className={styles.formField}>
            <span>Monitor</span>
            <select className={styles.selectInput} value={monitorId} disabled={!open} onChange={(event) => selectMonitor(event.currentTarget.value as Dme320MonitorId)}>
              {MONITOR_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}
            </select>
          </label>
          <label className={styles.formField}>
            <span>Channel</span>
            <select className={styles.selectInput} value={channel} disabled={!open} onChange={(event) => selectChannel(event.currentTarget.value as Dme320MonitorChannel)}>
              {MONITOR_CHANNELS.map((id) => <option key={id} value={id}>{channelLabel(id)}</option>)}
            </select>
          </label>
          <div className={styles.formField}>
            <span>Status</span>
            <strong>{selectedChannel.overallStatus.toUpperCase()}</strong>
          </div>
        </div>

        <section className={styles.setupSection} aria-label="Monitor measurement parameters">
          <h3>{monitorId.toUpperCase()} / {channelLabel(channel)} — {selectedChannel.overallStatus.toUpperCase()}</h3>
          <div className={styles.setupGrid}>
            {DME320_MONITOR_PARAMETERS.map((parameter) => {
              const unit = simulation.config.running.monitor.limits[parameter].unit;
              const isIdent = parameter === "identCode";
              return (
                <label className={styles.formField} key={parameter}>
                  <span>{DME320_PARAMETER_LABELS[parameter]}{unit ? ` (${unit})` : ""}</span>
                  <input
                    className={isIdent ? styles.textInput : styles.numberInput}
                    type={isIdent ? "text" : "number"}
                    step="any"
                    value={values[parameter]}
                    disabled={!editable}
                    onChange={(event) => setValues((current) => ({ ...current, [parameter]: event.currentTarget.value }))}
                  />
                </label>
              );
            })}
          </div>
        </section>

        <p className={editable ? styles.inlineNotice : styles.validationBanner} role={editable ? "status" : "alert"}>
          {editable
            ? message ?? `${selectedOverrides.length} override(s) active for this channel.`
            : permissionReason}
        </p>
      </div>
    </MopiensModal>
  );
}
