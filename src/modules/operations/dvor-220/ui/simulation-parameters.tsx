"use client";

import { useEffect, useState } from "react";
import { MopiensModal } from "@/modules/operations/mopiens-pmdt";
import { getDvor220PermissionDecision } from "../domain/permissions";
import {
  DVOR220_MONITOR_CHANNEL_IDS,
  DVOR220_MONITOR_IDS,
  DVOR220_MONITOR_PARAMETERS,
  type Dvor220Command,
  type Dvor220CommandResult,
  type Dvor220DeviceState,
  type Dvor220MonitorChannelId,
  type Dvor220MonitorId,
  type Dvor220MonitorParameter,
  type Dvor220Snapshot,
} from "../domain/types";
import styles from "../dvor220.module.css";

const parameterLabels: Record<Dvor220MonitorParameter, string> = {
  bearingError: "Azimuth Angle",
  fmIndex: "FM Index",
  am30Hz: "30 Hz Modulation",
  am9960Hz: "9960 Hz Modulation",
  ident1020Hz: "1020 Hz IDENT",
  rfLevel: "RF Level",
  distortion9960Hz: "9960 Hz Distortion",
  carrierFrequency: "Carrier Frequency",
  subcarrierFrequency: "Subcarrier Frequency",
};

const parameterUnits: Record<Dvor220MonitorParameter, string> = {
  bearingError: "°",
  fmIndex: "",
  am30Hz: "%",
  am9960Hz: "%",
  ident1020Hz: "%",
  rfLevel: "dB",
  distortion9960Hz: "%",
  carrierFrequency: "MHz",
  subcarrierFrequency: "Hz",
};

type ParameterValues = Record<Dvor220MonitorParameter, string>;

function formatValue(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

function valuesFromSnapshot(
  device: Dvor220DeviceState,
  snapshot: Dvor220Snapshot,
  monitorId: Dvor220MonitorId,
  channelId: Dvor220MonitorChannelId,
): ParameterValues {
  const readings = snapshot.monitors[monitorId].channels[channelId].readings;
  return Object.fromEntries(DVOR220_MONITOR_PARAMETERS.map((parameter) => [
    parameter,
    formatValue(
      device.measurementOverrides.find(
        (override) => override.monitorId === monitorId
          && override.channelId === channelId
          && override.parameter === parameter,
      )?.value ?? readings[parameter].value,
    ),
  ])) as ParameterValues;
}

export interface Dvor220SimulationParametersDialogProps {
  open: boolean;
  device: Dvor220DeviceState;
  snapshot: Dvor220Snapshot;
  dispatch: (command: Dvor220Command) => Dvor220CommandResult;
  onClose: () => void;
}

export function Dvor220SimulationParametersDialog({
  open,
  device,
  snapshot,
  dispatch,
  onClose,
}: Dvor220SimulationParametersDialogProps) {
  const [monitorId, setMonitorId] = useState<Dvor220MonitorId>("mon1");
  const [channelId, setChannelId] = useState<Dvor220MonitorChannelId>("cha");
  const [values, setValues] = useState<ParameterValues>(() => valuesFromSnapshot(device, snapshot, "mon1", "cha"));
  const [message, setMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const permission = getDvor220PermissionDecision(device, "configure");
  const selectedOverrides = device.measurementOverrides.filter(
    (override) => override.monitorId === monitorId && override.channelId === channelId,
  );

  useEffect(() => {
    if (!open) return;
    setValues(valuesFromSnapshot(device, snapshot, monitorId, channelId));
    setMessage(null);
  }, [open, monitorId, channelId, refreshToken]);

  function selectMonitor(nextMonitorId: Dvor220MonitorId) {
    setMonitorId(nextMonitorId);
    setMessage(null);
  }

  function selectChannel(nextChannelId: Dvor220MonitorChannelId) {
    setChannelId(nextChannelId);
    setMessage(null);
  }

  function applyOverrides() {
    const parsed = DVOR220_MONITOR_PARAMETERS.map((parameter) => ({
      parameter,
      value: Number(values[parameter]),
    }));
    const invalid = parsed.find((item) => !Number.isFinite(item.value));
    if (invalid) {
      setMessage(`${parameterLabels[invalid.parameter]} must be a finite number.`);
      return;
    }

    for (const item of parsed) {
      const result = dispatch({
        type: "inject-measurement",
        override: { monitorId, channelId, parameter: item.parameter, value: item.value },
      });
      if (!result.ok) {
        setMessage(result.error ?? "Simulation parameter could not be applied.");
        return;
      }
    }
    setMessage("Simulation parameters applied to the selected monitor channel.");
  }

  function resetSelectedChannel() {
    for (const parameter of DVOR220_MONITOR_PARAMETERS) {
      const result = dispatch({ type: "clear-measurement", monitorId, channelId, parameter });
      if (!result.ok) {
        setMessage(result.error ?? "Simulation parameter could not be reset.");
        return;
      }
    }
    setRefreshToken((current) => current + 1);
    setMessage("Selected monitor channel restored to engine defaults.");
  }

  const selectedChannel = snapshot.monitors[monitorId].channels[channelId];
  const valuesValid = DVOR220_MONITOR_PARAMETERS.every((parameter) => Number.isFinite(Number(values[parameter])));

  return (
    <MopiensModal
      open={open}
      title="Simulation Parameters..."
      ariaLabel="DVOR 220 simulation parameters"
      brandLabel="MOPIENS 220 DVOR"
      size="large"
      onClose={onClose}
      actions={[
        {
          id: "reset",
          label: "Reset to Defaults",
          disabled: !permission.allowed || selectedOverrides.length === 0,
          onClick: resetSelectedChannel,
        },
        {
          id: "apply",
          label: "Apply",
          tone: "primary",
          disabled: !permission.allowed || !valuesValid,
          onClick: applyOverrides,
        },
        { id: "close", label: "Close", onClick: onClose },
      ]}
    >
      <div className={styles.dialogStack}>
        <p>
          Set raw monitor values used by the in-memory training model. These values are separate from Setup and are not written to Profile Save or Flash.
        </p>

        <div className={styles.formGrid}>
          <label className={styles.formField}>
            <span>Monitor</span>
            <select value={monitorId} disabled={!open} onChange={(event) => selectMonitor(event.currentTarget.value as Dvor220MonitorId)}>
              {DVOR220_MONITOR_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}
            </select>
          </label>
          <label className={styles.formField}>
            <span>Channel</span>
            <select value={channelId} disabled={!open} onChange={(event) => selectChannel(event.currentTarget.value as Dvor220MonitorChannelId)}>
              {DVOR220_MONITOR_CHANNEL_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}
            </select>
          </label>
        </div>

        <section className={styles.formSection} aria-label="Monitor measurement parameters">
          <h3>{monitorId.toUpperCase()} / {channelId.toUpperCase()} — {selectedChannel.status.toUpperCase()}</h3>
          <div className={styles.formGrid}>
            {DVOR220_MONITOR_PARAMETERS.map((parameter) => (
              <label className={styles.formField} key={parameter}>
                <span>{parameterLabels[parameter]}{parameterUnits[parameter] ? ` (${parameterUnits[parameter]})` : ""}</span>
                <input
                  type="number"
                  step="any"
                  value={values[parameter]}
                  disabled={!permission.allowed}
                  onChange={(event) => setValues((current) => ({ ...current, [parameter]: event.currentTarget.value }))}
                />
              </label>
            ))}
          </div>
        </section>

        <p className={permission.allowed ? styles.inlineNotice : styles.inlineError} role={permission.allowed ? "status" : "alert"}>
          {permission.allowed
            ? message ?? `${selectedOverrides.length} override(s) active for this channel.`
            : permission.reason}
        </p>
      </div>
    </MopiensModal>
  );
}
