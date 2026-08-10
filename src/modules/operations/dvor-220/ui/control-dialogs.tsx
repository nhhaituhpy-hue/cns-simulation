"use client";

import {
  MopiensBeveledButton,
  MopiensConfirmationModal,
  MopiensModal,
  MopiensSlideSwitch,
  MopiensStatusIndicator,
} from "@/modules/operations/mopiens-pmdt";
import {
  DVOR220_MONITOR_IDS,
  DVOR220_RF_OUTPUT_IDS,
  DVOR220_TRANSMITTER_IDS,
  type Dvor220Command,
  type Dvor220CommandResult,
  type Dvor220DeviceState,
  type Dvor220Snapshot,
} from "../domain/types";
import { formatDvor220Status, toneForDvor220Status } from "./main-screens";
import type { Dvor220DialogId } from "./navigation";
import { Dvor220SimulationParametersDialog } from "./simulation-parameters";
import styles from "../dvor220.module.css";

export interface Dvor220ControlDialogsProps {
  activeDialog: Dvor220DialogId | null;
  device: Dvor220DeviceState;
  snapshot: Dvor220Snapshot;
  dispatch: (command: Dvor220Command) => Dvor220CommandResult;
  onClose: () => void;
}

export function Dvor220ControlDialogs({
  activeDialog,
  device,
  snapshot,
  dispatch,
  onClose,
}: Dvor220ControlDialogsProps) {
  function execute(command: Dvor220Command, close = false) {
    const result = dispatch(command);
    if (result.ok && close) onClose();
  }

  return (
    <>
      <MopiensModal
        open={activeDialog === "bypass"}
        title="Monitor Bypass"
        brandLabel="MOPIENS 220 DVOR"
        size="medium"
        onClose={onClose}
        actions={[{ id: "close", label: "Close", onClick: onClose }]}
      >
        <div className={styles.dialogStack}>
          <p>Warnings and alarms remain visible while executive changeover and shutdown actions are bypassed.</p>
          {DVOR220_MONITOR_IDS.map((monitorId) => (
            <div className={styles.dialogControlRow} key={monitorId}>
              <MopiensStatusIndicator
                label={monitorId.toUpperCase()}
                detail={formatDvor220Status(snapshot.monitors[monitorId].status)}
                tone={toneForDvor220Status(snapshot.monitors[monitorId].status)}
              />
              <MopiensSlideSwitch
                label={`${monitorId.toUpperCase()} bypass`}
                checked={device.monitors[monitorId].bypassRequested}
                onLabel="BYPASS"
                offLabel="AUTO"
                tone={device.monitors[monitorId].bypassRequested ? "warning" : "normal"}
                onCheckedChange={(bypass) => execute({ type: "set-monitor-bypass", monitorId, bypass })}
              />
            </div>
          ))}
          <div className={styles.actionRow}>
            <MopiensBeveledButton tone="warning" onClick={() => execute({ type: "set-monitor-bypass", bypass: true })}>Bypass Both</MopiensBeveledButton>
            <MopiensBeveledButton tone="primary" onClick={() => execute({ type: "set-monitor-bypass", bypass: false })}>Set Both Auto</MopiensBeveledButton>
          </div>
        </div>
      </MopiensModal>

      <MopiensModal
        open={activeDialog === "main"}
        title="Main Transmitter Selection"
        brandLabel="MOPIENS 220 DVOR"
        size="medium"
        onClose={onClose}
        actions={[{ id: "close", label: "Close", onClick: onClose }]}
      >
        <div className={styles.dialogStack}>
          <p>Main and Standby designation does not automatically move the Antenna and Load RF routes.</p>
          {DVOR220_TRANSMITTER_IDS.map((transmitterId) => {
            const transmitter = snapshot.transmitters[transmitterId];
            return (
              <div className={styles.dialogControlRow} key={transmitterId}>
                <MopiensStatusIndicator label={transmitterId.toUpperCase()} detail={`${transmitter.designation}, ${transmitter.path}`} tone={toneForDvor220Status(transmitter.status)} />
                <MopiensBeveledButton
                  tone={transmitter.designation === "main" ? "primary" : "default"}
                  pressed={transmitter.designation === "main"}
                  onClick={() => execute({ type: "select-main", transmitterId })}
                >
                  Select {transmitterId.toUpperCase()} Main
                </MopiensBeveledButton>
              </div>
            );
          })}
        </div>
      </MopiensModal>

      <MopiensConfirmationModal
        open={activeDialog === "changeover"}
        title="Transmitter Change Over"
        message={<>Transfer the Antenna route from <strong>{snapshot.activeTransmitterId?.toUpperCase() ?? "no active transmitter"}</strong> to the standby transmitter?</>}
        confirmLabel="Change Over"
        tone="warning"
        onConfirm={() => execute({ type: "changeover" }, true)}
        onCancel={onClose}
      />

      <MopiensConfirmationModal
        open={activeDialog === "reset"}
        title="System Reset"
        message={device.executive.phase === "shutdown-locked" ? "Reset is locked for at least 20 seconds after executive shutdown." : "Reset alarm latches and restore the designated Main transmitter to the Antenna route?"}
        confirmLabel="Reset"
        tone={device.executive.phase === "shutdown-locked" ? "danger" : "warning"}
        onConfirm={() => execute({ type: "reset" }, true)}
        onCancel={onClose}
      />

      <MopiensModal
        open={activeDialog === "power"}
        title="TX On/Off Control"
        brandLabel="MOPIENS 220 DVOR"
        size="large"
        onClose={onClose}
        actions={[{ id: "close", label: "Close", onClick: onClose }]}
      >
        <div className={styles.powerDialogGrid}>
          {DVOR220_TRANSMITTER_IDS.map((transmitterId) => {
            const transmitter = device.transmitters[transmitterId];
            return (
              <fieldset key={transmitterId} className={styles.powerDialogTransmitter}>
                <legend>{transmitterId.toUpperCase()} ({transmitter.designation})</legend>
                <MopiensSlideSwitch
                  label={`${transmitterId.toUpperCase()} DC power`}
                  checked={transmitter.powerOn}
                  onCheckedChange={(on) => execute({ type: "set-transmitter-power", transmitterId, on })}
                />
                <div className={styles.rfSwitchGrid}>
                  {DVOR220_RF_OUTPUT_IDS.map((output) => (
                    <MopiensSlideSwitch
                      key={output}
                      label={`${transmitterId.toUpperCase()} ${output.toUpperCase()}`}
                      checked={transmitter.rfOutputs[output]}
                      disabled={!transmitter.powerOn}
                      orientation="vertical"
                      onCheckedChange={(on) => execute({ type: "set-rf-output", transmitterId, output, on })}
                    />
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>
      </MopiensModal>

      <Dvor220SimulationParametersDialog
        open={activeDialog === "simulation-parameters"}
        device={device}
        snapshot={snapshot}
        dispatch={dispatch}
        onClose={onClose}
      />
    </>
  );
}
