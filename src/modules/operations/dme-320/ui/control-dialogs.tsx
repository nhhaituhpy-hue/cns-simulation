"use client";

import {
  MopiensBeveledButton,
  MopiensConfirmationModal,
  MopiensModal,
  MopiensSlideSwitch,
  MopiensStatusIndicator,
} from "@/modules/operations/mopiens-pmdt";
import type {
  Dme320Command,
  Dme320CommandResult,
  Dme320SimulationState,
  Dme320ScenarioDefinition,
} from "../domain/types";
import type { Dme320DialogId } from "./navigation";
import { formatStatus } from "./presentation";
import { monitorTone, transmitterDetail, transmitterTone } from "./main-screens";
import { Dme320SimulationParametersDialog } from "./simulation-parameters";
import styles from "./dme320-ui.module.css";

const TRANSPONDER_IDS = ["tx1", "tx2"] as const;
const MONITOR_IDS = ["mon1", "mon2"] as const;

export interface Dme320ControlDialogsProps {
  activeDialog: Dme320DialogId | null;
  simulation: Dme320SimulationState;
  dispatch: (command: Dme320Command) => Dme320CommandResult;
  scenarioDefinition?: Dme320ScenarioDefinition | null;
  onClose: () => void;
}

export function Dme320ControlDialogs({
  activeDialog,
  simulation,
  dispatch,
  scenarioDefinition,
  onClose,
}: Dme320ControlDialogsProps) {
  function execute(command: Dme320Command, close = false) {
    const result = dispatch(command);
    if (result.accepted && close) onClose();
    return result;
  }

  function setBothMonitors(mode: "auto" | "bypass") {
    execute({ type: "set-monitor-mode", monitorId: "mon1", mode });
    execute({ type: "set-monitor-mode", monitorId: "mon2", mode });
  }

  return (
    <>
      <MopiensModal
        open={activeDialog === "bypass"}
        title="Monitor Bypass"
        brandLabel="MOPIENS 320 DME"
        size="medium"
        onClose={onClose}
        actions={[{ id: "close", label: "Close", onClick: onClose }]}
      >
        <div className={styles.dialogStack}>
          <p>Monitor readings and alarms remain visible in Bypass, but automatic changeover and shutdown actions are suppressed.</p>
          {MONITOR_IDS.map((monitorId) => (
            <div className={styles.dialogControlRow} key={monitorId}>
              <MopiensStatusIndicator
                label={monitorId.toUpperCase()}
                detail={`${simulation.monitors[monitorId].mode.toUpperCase()} / ${formatStatus(simulation.monitors[monitorId].channels.executive.overallStatus)}`}
                tone={monitorTone(simulation, monitorId)}
              />
              <MopiensSlideSwitch
                label={`${monitorId.toUpperCase()} monitor action`}
                checked={simulation.monitors[monitorId].mode === "auto"}
                onLabel="AUTO"
                offLabel="BYPASS"
                tone={simulation.monitors[monitorId].mode === "auto" ? "normal" : "warning"}
                onCheckedChange={(automatic) => execute({ type: "set-monitor-mode", monitorId, mode: automatic ? "auto" : "bypass" })}
              />
            </div>
          ))}
          <div className={styles.actionRow}>
            <MopiensBeveledButton tone="warning" onClick={() => setBothMonitors("bypass")}>Bypass Both</MopiensBeveledButton>
            <MopiensBeveledButton tone="primary" onClick={() => setBothMonitors("auto")}>Set Both Auto</MopiensBeveledButton>
          </div>
        </div>
      </MopiensModal>

      <MopiensModal
        open={activeDialog === "main"}
        title="Main TXP Selection"
        brandLabel="MOPIENS 320 DME"
        size="medium"
        onClose={onClose}
        actions={[{ id: "close", label: "Close", onClick: onClose }]}
      >
        <div className={styles.dialogStack}>
          <p>Selecting Main changes the main/standby designation. Use Change Over to transfer the antenna route.</p>
          {TRANSPONDER_IDS.map((transponderId) => (
            <div className={styles.dialogControlRow} key={transponderId}>
              <MopiensStatusIndicator
                label={transponderId.toUpperCase()}
                detail={transmitterDetail(transponderId, simulation)}
                tone={transmitterTone(simulation.transmitters[transponderId])}
              />
              <MopiensBeveledButton
                tone={simulation.mainTransponder === transponderId ? "primary" : "default"}
                pressed={simulation.mainTransponder === transponderId}
                onClick={() => execute({ type: "select-main", transponderId })}
              >
                Select {transponderId.toUpperCase()} Main
              </MopiensBeveledButton>
            </div>
          ))}
        </div>
      </MopiensModal>

      <MopiensConfirmationModal
        open={activeDialog === "changeover"}
        title="Transmitter Change Over"
        message={<>Transfer the antenna route from <strong>{TRANSPONDER_IDS.find((id) => simulation.transmitters[id].route === "antenna")?.toUpperCase() ?? "no active TXP"}</strong> to the standby transponder?</>}
        confirmLabel="Change Over"
        tone="warning"
        onConfirm={() => execute({ type: "changeover" }, true)}
        onCancel={onClose}
      />

      <MopiensConfirmationModal
        open={activeDialog === "reset"}
        title="System Reset"
        message="Clear shutdown and automatic-action latches, then restore the designated Main transponder to service when the physical fault condition permits?"
        confirmLabel="Reset"
        tone={simulation.systemShutdown ? "danger" : "warning"}
        onConfirm={() => execute({ type: "reset-system" }, true)}
        onCancel={onClose}
      />

      <MopiensModal
        open={activeDialog === "power"}
        title="Power and RF On / Off"
        brandLabel="MOPIENS 320 DME"
        size="large"
        onClose={onClose}
        actions={[{ id: "close", label: "Close", onClick: onClose }]}
      >
        <div className={styles.powerDialogGrid}>
          {TRANSPONDER_IDS.map((transponderId) => {
            const transmitter = simulation.transmitters[transponderId];
            return (
              <fieldset key={transponderId} className={styles.powerDialogTransmitter}>
                <legend>{transponderId.toUpperCase()} ({simulation.mainTransponder === transponderId ? "Main" : "Standby"})</legend>
                <MopiensStatusIndicator
                  label={transponderId.toUpperCase()}
                  detail={transmitterDetail(transponderId, simulation)}
                  tone={transmitterTone(transmitter)}
                />
                <MopiensSlideSwitch
                  label={`${transponderId.toUpperCase()} DC power`}
                  checked={transmitter.dcPower === "on"}
                  onLabel="DC ON"
                  offLabel="DC OFF"
                  onCheckedChange={(on) => execute({ type: "set-transponder-power", transponderId, on })}
                />
                <MopiensSlideSwitch
                  label={`${transponderId.toUpperCase()} RF output`}
                  checked={transmitter.rfEnabled}
                  disabled={transmitter.dcPower === "off" || transmitter.shutdown}
                  onLabel="RF ON"
                  offLabel="RF OFF"
                  tone={transmitter.rfEnabled ? "normal" : "warning"}
                  onCheckedChange={(enabled) => execute({ type: "set-transponder-rf", transponderId, enabled })}
                />
              </fieldset>
            );
          })}
        </div>
      </MopiensModal>

      <Dme320SimulationParametersDialog
        open={activeDialog === "simulation-parameters"}
        simulation={simulation}
        dispatch={dispatch}
        initialScenario={scenarioDefinition}
        onClose={onClose}
      />
    </>
  );
}
