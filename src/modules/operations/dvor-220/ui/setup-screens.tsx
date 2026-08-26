"use client";

import { useState, type ReactNode } from "react";
import {
  MopiensBeveledButton,
  MopiensModal,
  MopiensSlideSwitch,
  type MopiensVisualTone,
} from "@/modules/operations/mopiens-pmdt";
import { getDvor220PermissionDecision } from "../domain/permissions";
import {
  DVOR220_MONITOR_CHANNEL_IDS,
  DVOR220_MONITOR_PARAMETERS,
  DVOR220_TRANSMITTER_IDS,
  type Dvor220AlarmBand,
  type Dvor220Command,
  type Dvor220CommandResult,
  type Dvor220Configuration,
  type Dvor220DeepPartial,
  type Dvor220DeviceState,
  type Dvor220MonitorChannelId,
  type Dvor220MonitorParameter,
  type Dvor220Snapshot,
  type Dvor220TransmitterId,
} from "../domain/types";
import type { Dvor220ScreenId } from "./navigation";
import { DVOR220_SCREEN_LABELS } from "./navigation";
import styles from "../dvor220.module.css";

export interface Dvor220SetupScreenProps {
  screenId: Dvor220ScreenId;
  device: Dvor220DeviceState;
  snapshot: Dvor220Snapshot;
  dispatch: (command: Dvor220Command) => Dvor220CommandResult;
}

const monitorParameterLabels: Record<Dvor220MonitorParameter, string> = {
  bearingError: "Bearing Error",
  fmIndex: "FM Index",
  am30Hz: "30 Hz AM",
  am9960Hz: "9960 Hz AM",
  ident1020Hz: "1020 Hz IDENT",
  rfLevel: "RF Level",
  distortion9960Hz: "9960 Hz Distortion",
  carrierFrequency: "Carrier Frequency",
  subcarrierFrequency: "Subcarrier Frequency",
};

function SetupHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className={styles.screenTitle}>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </header>
  );
}

function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className={styles.formField}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function numberValue(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ConfigurationActions({
  device,
  snapshot,
  dispatch,
}: Pick<Dvor220SetupScreenProps, "device" | "snapshot" | "dispatch">) {
  const permission = getDvor220PermissionDecision(device, "configure");
  const errors = snapshot.configurationIssues.filter((issue) => issue.severity === "error");
  const warnings = snapshot.configurationIssues.filter((issue) => issue.severity === "warning");
  return (
    <footer className={styles.configurationFooter}>
      <div className={styles.validationSummary} role={errors.length ? "alert" : "status"}>
        <strong>
          {errors.length
            ? `${errors.length} validation error${errors.length === 1 ? "" : "s"}`
            : warnings.length
              ? `${warnings.length} operating warning${warnings.length === 1 ? "" : "s"}`
              : "Configuration valid"}
        </strong>
        <span>{errors[0]?.message ?? warnings[0]?.message ?? permission.reason ?? "Draft is ready."}</span>
      </div>
      <div className={styles.actionRow}>
        <MopiensBeveledButton
          onClick={() => dispatch({ type: "reset-draft" })}
          disabled={!device.configuration.draftDirty}
        >
          Reset Draft
        </MopiensBeveledButton>
        <MopiensBeveledButton
          tone="primary"
          onClick={() => dispatch({ type: "apply-draft" })}
          disabled={!permission.allowed || !device.configuration.draftDirty || errors.length > 0}
        >
          Apply
        </MopiensBeveledButton>
        <MopiensBeveledButton
          tone={device.configuration.flashDirty && !device.scenario.active ? "warning" : "default"}
          onClick={() => dispatch({ type: "save-profile" })}
          disabled={!permission.allowed || !device.configuration.flashDirty || device.scenario.active}
        >
          Profile Save
        </MopiensBeveledButton>
      </div>
    </footer>
  );
}

function StationSetup({
  configuration,
  disabled,
  patch,
}: {
  configuration: Dvor220Configuration;
  disabled: boolean;
  patch: (patch: Dvor220DeepPartial<Dvor220Configuration>) => void;
}) {
  const station = configuration.station;
  return (
    <div className={styles.setupSections}>
      <fieldset className={styles.formSection} disabled={disabled}>
        <legend>Station</legend>
        <div className={styles.formGrid}>
          <FormField label="Station Name" hint="Maximum 31 characters">
            <input value={station.stationName} onChange={(event) => patch({ station: { stationName: event.target.value } })} />
          </FormField>
          <FormField label="Equipment Version">
            <select value={station.equipmentVersion} onChange={(event) => patch({ station: { equipmentVersion: event.target.value as "single" | "dual" } })}>
              <option value="single">Single Equipment</option>
              <option value="dual">Dual Equipment</option>
            </select>
          </FormField>
          <FormField label="Frequency" hint="108.000 to 117.950 MHz, 50 kHz spacing">
            <input type="number" step="0.05" min="108" max="117.95" value={station.frequencyMHz} onChange={(event) => patch({ station: { frequencyMHz: numberValue(event.target.value, station.frequencyMHz) } })} />
          </FormField>
          <FormField label="Carrier Power" hint="PMDT input 0 to 150 W; specified operation 25 to 125 W">
            <input type="number" step="1" min="0" max="150" value={station.carrierPowerW} onChange={(event) => patch({ station: { carrierPowerW: numberValue(event.target.value, station.carrierPowerW) } })} />
          </FormField>
          <FormField label="IDENT Code">
            <input maxLength={4} value={station.identCode} onChange={(event) => patch({ station: { identCode: event.target.value.toUpperCase() } })} />
          </FormField>
          <FormField label="Azimuth Offset">
            <input type="number" step="0.01" min="-40" max="40" value={station.azimuthOffsetDeg} onChange={(event) => patch({ station: { azimuthOffsetDeg: numberValue(event.target.value, station.azimuthOffsetDeg) } })} />
          </FormField>
        </div>
      </fieldset>
      <fieldset className={styles.formSection} disabled={disabled}>
        <legend>Modulation and Startup</legend>
        <div className={styles.formGrid}>
          <FormField label="30 Hz AM (%)"><input type="number" step="0.1" min="0" max="40" value={station.am30HzPercent} onChange={(event) => patch({ station: { am30HzPercent: numberValue(event.target.value, station.am30HzPercent) } })} /></FormField>
          <FormField label="IDENT Modulation (%)"><input type="number" step="0.1" min="0" max="20" value={station.identModulationPercent} onChange={(event) => patch({ station: { identModulationPercent: numberValue(event.target.value, station.identModulationPercent) } })} /></FormField>
          <FormField label="Voice Modulation (%)"><input type="number" step="0.1" min="0" max="40" value={station.voiceModulationPercent} onChange={(event) => patch({ station: { voiceModulationPercent: numberValue(event.target.value, station.voiceModulationPercent) } })} /></FormField>
          <FormField label="Standby Mode">
            <select value={station.standbyMode} onChange={(event) => patch({ station: { standbyMode: event.target.value as "hot" | "cold" } })}>
              <option value="hot">Hot Standby</option><option value="cold">Cold Standby</option>
            </select>
          </FormField>
          <MopiensSlideSwitch label="Bypass monitors on boot" checked={station.bypassMonitorsOnBoot} disabled={disabled} onCheckedChange={(checked) => patch({ station: { bypassMonitorsOnBoot: checked } })} />
          <MopiensSlideSwitch label="Transmitter output on boot" checked={station.transmitterOutputOnBoot} disabled={disabled} onCheckedChange={(checked) => patch({ station: { transmitterOutputOnBoot: checked } })} />
        </div>
      </fieldset>
    </div>
  );
}

type TransmitterHelperSettings = Pick<
  Dvor220Configuration["transmitters"][Dvor220TransmitterId],
  "carrierScalePercent" | "sidebandPowerW" | "trackingEnabled"
>;

function helperSettings(
  configuration: Dvor220Configuration,
  transmitterId: Dvor220TransmitterId,
): TransmitterHelperSettings {
  const transmitter = configuration.transmitters[transmitterId];
  return {
    carrierScalePercent: transmitter.carrierScalePercent,
    sidebandPowerW: structuredClone(transmitter.sidebandPowerW),
    trackingEnabled: transmitter.trackingEnabled,
  };
}

function helperSettingsEqual(left: TransmitterHelperSettings, right: TransmitterHelperSettings): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function TransmitterSetup({
  configuration,
  device,
  disabled,
  patch,
  dispatch,
}: {
  configuration: Dvor220Configuration;
  device: Dvor220DeviceState;
  disabled: boolean;
  patch: (patch: Dvor220DeepPartial<Dvor220Configuration>) => void;
  dispatch: (command: Dvor220Command) => Dvor220CommandResult;
}) {
  const [helperOpen, setHelperOpen] = useState(false);
  const [helperTransmitterId, setHelperTransmitterId] = useState<Dvor220TransmitterId>("tx1");
  const [sameToBoth, setSameToBoth] = useState(false);
  const [sidebandsSame, setSidebandsSame] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [helperDrafts, setHelperDrafts] = useState<Record<Dvor220TransmitterId, TransmitterHelperSettings>>(() => ({
    tx1: helperSettings(device.configuration.running, "tx1"),
    tx2: helperSettings(device.configuration.running, "tx2"),
  }));

  function transmitterPatch(transmitterId: Dvor220TransmitterId, value: Dvor220DeepPartial<Dvor220Configuration["transmitters"][Dvor220TransmitterId]>) {
    patch({ transmitters: { [transmitterId]: value } } as Dvor220DeepPartial<Dvor220Configuration>);
  }

  function openHelper(transmitterId: Dvor220TransmitterId) {
    setHelperTransmitterId(transmitterId);
    setHelperDrafts({
      tx1: helperSettings(device.configuration.running, "tx1"),
      tx2: helperSettings(device.configuration.running, "tx2"),
    });
    setSameToBoth(false);
    setSidebandsSame(false);
    setSyncEnabled(false);
    setHelperOpen(true);
  }

  function updateActiveHelper(next: TransmitterHelperSettings) {
    setHelperDrafts((current) => ({ ...current, [helperTransmitterId]: next }));
  }

  function updateHelperCarrier(value: number) {
    const current = helperDrafts[helperTransmitterId];
    const followCarrier = syncEnabled || current.trackingEnabled;
    const ratio = followCarrier && current.carrierScalePercent > 0
      ? value / current.carrierScalePercent
      : 1;
    const scaledSidebands = Object.fromEntries(
      Object.entries(current.sidebandPowerW).map(([output, power]) => [
        output,
        Math.round(power * ratio * 1_000) / 1_000,
      ]),
    ) as TransmitterHelperSettings["sidebandPowerW"];
    updateActiveHelper({
      ...current,
      carrierScalePercent: value,
      sidebandPowerW: followCarrier ? scaledSidebands : current.sidebandPowerW,
    });
  }

  function updateHelperSideband(
    output: keyof TransmitterHelperSettings["sidebandPowerW"],
    value: number,
  ) {
    const current = helperDrafts[helperTransmitterId];
    let nextSidebands: TransmitterHelperSettings["sidebandPowerW"] = {
      ...current.sidebandPowerW,
      [output]: value,
    };
    if (sidebandsSame) {
      nextSidebands = Object.fromEntries(
        Object.keys(current.sidebandPowerW).map((sideband) => [sideband, value]),
      ) as TransmitterHelperSettings["sidebandPowerW"];
    }
    updateActiveHelper({ ...current, sidebandPowerW: nextSidebands });
  }

  const activeHelper = helperDrafts[helperTransmitterId];
  const helperTargets = sameToBoth ? [...DVOR220_TRANSMITTER_IDS] : [helperTransmitterId];
  const helperValid = activeHelper.carrierScalePercent >= 0
    && activeHelper.carrierScalePercent <= 100
    && Object.values(activeHelper.sidebandPowerW).every((value) => value >= 0 && value <= 5);
  const helperHasUnappliedChanges = helperTargets.some(
    (transmitterId) => !helperSettingsEqual(
      activeHelper,
      helperSettings(device.configuration.running, transmitterId),
    ),
  );
  const helperHasUnsavedChanges = helperTargets.some(
    (transmitterId) => !helperSettingsEqual(
      helperSettings(device.configuration.running, transmitterId),
      helperSettings(device.configuration.flash, transmitterId),
    ),
  );

  function applyHelper() {
    const result = dispatch({
      type: "apply-transmitter-helper",
      transmitterIds: helperTargets,
      settings: activeHelper,
    });
    if (!result.ok) return;
    setHelperDrafts((current) => {
      const next = { ...current };
      for (const transmitterId of helperTargets) {
        next[transmitterId] = helperSettings(result.state.configuration.running, transmitterId);
      }
      return next;
    });
  }

  function saveHelper() {
    dispatch({ type: "save-transmitter-helper", transmitterIds: helperTargets });
  }

  return (
    <>
      <div className={styles.twoColumnLayout}>
        {DVOR220_TRANSMITTER_IDS.map((transmitterId) => {
          const transmitter = configuration.transmitters[transmitterId];
          return (
            <fieldset key={transmitterId} className={styles.formSection} disabled={disabled}>
              <legend>{transmitterId.toUpperCase()}</legend>
              <div className={styles.transmitterHelperBar}>
                <span>RF setpoints: {transmitter.trackingEnabled ? "Tracking" : "Manual"}</span>
                <MopiensBeveledButton onClick={() => openHelper(transmitterId)}>Helper...</MopiensBeveledButton>
              </div>
              <div className={styles.formGridSingle}>
                <FormField label="Carrier Scale (%)"><input type="number" min="0" max="100" step="0.1" value={transmitter.carrierScalePercent} onChange={(event) => transmitterPatch(transmitterId, { carrierScalePercent: numberValue(event.target.value, transmitter.carrierScalePercent) })} /></FormField>
                {(["usbCos", "usbSin", "lsbCos", "lsbSin"] as const).map((output) => (
                  <FormField key={output} label={`${output.toUpperCase()} Power (W)`}>
                    <input type="number" min="0" max="5" step="0.01" value={transmitter.sidebandPowerW[output]} onChange={(event) => transmitterPatch(transmitterId, { sidebandPowerW: { [output]: numberValue(event.target.value, transmitter.sidebandPowerW[output]) } })} />
                  </FormField>
                ))}
                <FormField label="Carrier to Sideband Phase (°)"><input type="number" min="0" max="359.9" step="0.1" value={transmitter.rfPhaseDeg.carrierToSideband} onChange={(event) => transmitterPatch(transmitterId, { rfPhaseDeg: { carrierToSideband: numberValue(event.target.value, transmitter.rfPhaseDeg.carrierToSideband) } })} /></FormField>
                <FormField label="30 Hz AM (%)"><input type="number" min="0" max="40" step="0.1" value={transmitter.am30HzPercent} disabled={disabled || transmitter.useStationModulation} onChange={(event) => transmitterPatch(transmitterId, { am30HzPercent: numberValue(event.target.value, transmitter.am30HzPercent) })} /></FormField>
                <FormField label="IDENT Modulation (%)"><input type="number" min="0" max="20" step="0.1" value={transmitter.identModulationPercent} disabled={disabled || transmitter.useStationIdent} onChange={(event) => transmitterPatch(transmitterId, { identModulationPercent: numberValue(event.target.value, transmitter.identModulationPercent) })} /></FormField>
                <FormField label="Voice Modulation (%)"><input type="number" min="0" max="40" step="0.1" value={transmitter.voiceModulationPercent} disabled={disabled || transmitter.useStationModulation} onChange={(event) => transmitterPatch(transmitterId, { voiceModulationPercent: numberValue(event.target.value, transmitter.voiceModulationPercent) })} /></FormField>
                <FormField label="Azimuth Offset (°)"><input type="number" min="-40" max="40" step="0.01" value={transmitter.azimuthOffsetDeg} disabled={disabled || transmitter.useStationAzimuth} onChange={(event) => transmitterPatch(transmitterId, { azimuthOffsetDeg: numberValue(event.target.value, transmitter.azimuthOffsetDeg) })} /></FormField>
                <FormField label="IDENT Code"><input maxLength={4} value={transmitter.identCode} disabled={disabled || transmitter.useStationIdent} onChange={(event) => transmitterPatch(transmitterId, { identCode: event.target.value.toUpperCase() })} /></FormField>
                <MopiensSlideSwitch label="Use station modulation" checked={transmitter.useStationModulation} disabled={disabled} onCheckedChange={(checked) => transmitterPatch(transmitterId, { useStationModulation: checked })} />
                <MopiensSlideSwitch label="Use station azimuth" checked={transmitter.useStationAzimuth} disabled={disabled} onCheckedChange={(checked) => transmitterPatch(transmitterId, { useStationAzimuth: checked })} />
                <MopiensSlideSwitch label="Use station IDENT" checked={transmitter.useStationIdent} disabled={disabled} onCheckedChange={(checked) => transmitterPatch(transmitterId, { useStationIdent: checked })} />
              </div>
            </fieldset>
          );
        })}
      </div>

      <MopiensModal
        open={helperOpen}
        title="Transmitter Setup Helper"
        brandLabel="MOPIENS 220 DVOR"
        size="large"
        closeOnBackdrop={false}
        onClose={() => setHelperOpen(false)}
        actions={[
          { id: "close", label: "Close", onClick: () => setHelperOpen(false) },
          { id: "save", label: "Save", disabled: disabled || device.scenario.active || !helperHasUnsavedChanges, onClick: saveHelper },
          { id: "apply", label: "Apply", tone: "primary", disabled: disabled || !helperValid || !helperHasUnappliedChanges, onClick: applyHelper },
        ]}
      >
        <div className={styles.transmitterHelperDialog}>
          <div className={styles.transmitterHelperTabs} role="tablist" aria-label="Helper transmitter">
            {DVOR220_TRANSMITTER_IDS.map((transmitterId) => (
              <button
                key={transmitterId}
                type="button"
                role="tab"
                aria-selected={helperTransmitterId === transmitterId}
                onClick={() => setHelperTransmitterId(transmitterId)}
              >
                {transmitterId.toUpperCase()}
              </button>
            ))}
          </div>
          <fieldset className={styles.formSection} disabled={disabled}>
            <legend>{helperTransmitterId.toUpperCase()} RF Output Setpoint</legend>
            <div className={styles.helperGrid}>
              <FormField label="Carrier Scale (%)">
                <input type="number" min="0" max="100" step="0.1" value={activeHelper.carrierScalePercent} onChange={(event) => updateHelperCarrier(numberValue(event.target.value, activeHelper.carrierScalePercent))} />
              </FormField>
              {(["usbCos", "usbSin", "lsbCos", "lsbSin"] as const).map((output) => (
                <FormField key={output} label={`${output.toUpperCase()} (W)`}>
                  <input type="number" min="0" max="5" step="0.01" value={activeHelper.sidebandPowerW[output]} onChange={(event) => updateHelperSideband(output, numberValue(event.target.value, activeHelper.sidebandPowerW[output]))} />
                </FormField>
              ))}
            </div>
          </fieldset>
          <fieldset className={styles.formSection} disabled={disabled}>
            <legend>Helper</legend>
            <div className={styles.helperSwitchGrid}>
              <MopiensSlideSwitch label="Same to TX1 and TX2" checked={sameToBoth} disabled={disabled} onCheckedChange={setSameToBoth} />
              <MopiensSlideSwitch label="Sideband same setting" checked={sidebandsSame} disabled={disabled} onCheckedChange={setSidebandsSame} />
              <MopiensSlideSwitch label="Sync" checked={syncEnabled} disabled={disabled} onCheckedChange={setSyncEnabled} />
              <MopiensSlideSwitch
                label="Tracking"
                checked={activeHelper.trackingEnabled}
                disabled={disabled}
                onCheckedChange={(trackingEnabled) => updateActiveHelper({ ...activeHelper, trackingEnabled })}
              />
            </div>
          </fieldset>
          <p className={styles.helperState} role="status">
            {!helperValid
              ? "Carrier must be 0–100%; each sideband must be 0–5 W."
              : helperHasUnappliedChanges
                ? "Edited values are local to Helper. Apply sends them to running RAM."
                : helperHasUnsavedChanges
                  ? device.scenario.active
                    ? "Applied in RAM for the active scenario. Save is disabled so the training baseline remains session-only."
                    : "Applied in RAM; use Save to write these setpoints to non-volatile flash."
                  : "Helper values match running RAM and saved flash."}
          </p>
          <p className={styles.helperNote}>
            Sync follows Carrier only in this Helper session. Tracking remains active after Apply and scales sideband setpoints with later Carrier changes.
          </p>
        </div>
      </MopiensModal>
    </>
  );
}

function ThermalSetup({ configuration, disabled, patch }: { configuration: Dvor220Configuration; disabled: boolean; patch: (patch: Dvor220DeepPartial<Dvor220Configuration>) => void }) {
  function thermalPatch(transmitterId: Dvor220TransmitterId, value: Dvor220DeepPartial<Dvor220Configuration["thermal"][Dvor220TransmitterId]>) {
    patch({ thermal: { [transmitterId]: value } } as Dvor220DeepPartial<Dvor220Configuration>);
  }
  return (
    <div className={styles.twoColumnLayout}>
      {DVOR220_TRANSMITTER_IDS.map((transmitterId) => {
        const thermal = configuration.thermal[transmitterId];
        return (
          <fieldset key={transmitterId} className={styles.formSection} disabled={disabled}>
            <legend>{transmitterId.toUpperCase()} Thermal Control</legend>
            <div className={styles.formGridSingle}>
              <FormField label="Fan Mode"><select value={thermal.fanMode} onChange={(event) => thermalPatch(transmitterId, { fanMode: event.target.value as "auto" | "on" | "off" })}><option value="auto">Auto</option><option value="on">On</option><option value="off">Off</option></select></FormField>
              <FormField label="Fan Start (°C)"><input type="number" step="0.1" value={thermal.fanStartC} onChange={(event) => thermalPatch(transmitterId, { fanStartC: numberValue(event.target.value, thermal.fanStartC) })} /></FormField>
              <FormField label="Fan Stop (°C)"><input type="number" step="0.1" value={thermal.fanStopC} onChange={(event) => thermalPatch(transmitterId, { fanStopC: numberValue(event.target.value, thermal.fanStopC) })} /></FormField>
              {(["cma", "usb", "lsb"] as const).map((unit) => (
                <div className={styles.inlineFieldPair} key={unit}>
                  <FormField label={`${unit.toUpperCase()} Shutdown`}><input type="number" step="0.1" value={thermal.shutdownC[unit]} onChange={(event) => thermalPatch(transmitterId, { shutdownC: { [unit]: numberValue(event.target.value, thermal.shutdownC[unit]) } })} /></FormField>
                  <FormField label={`${unit.toUpperCase()} Restart`}><input type="number" step="0.1" value={thermal.restartC[unit]} onChange={(event) => thermalPatch(transmitterId, { restartC: { [unit]: numberValue(event.target.value, thermal.restartC[unit]) } })} /></FormField>
                </div>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function MonitorSetup({ configuration, disabled, patch }: { configuration: Dvor220Configuration; disabled: boolean; patch: (patch: Dvor220DeepPartial<Dvor220Configuration>) => void }) {
  const monitor = configuration.monitor;
  function channelPatch(channelId: Dvor220MonitorChannelId, value: Dvor220DeepPartial<Dvor220Configuration["monitor"]["channels"][Dvor220MonitorChannelId]>) {
    patch({ monitor: { channels: { [channelId]: value } } } as Dvor220DeepPartial<Dvor220Configuration>);
  }
  return (
    <div className={styles.setupSections}>
      <fieldset className={styles.formSection} disabled={disabled}>
        <legend>Executive Monitor</legend>
        <div className={styles.formGrid}>
          <FormField label="Voting Logic"><select value={monitor.votingLogic} onChange={(event) => patch({ monitor: { votingLogic: event.target.value as "AND" | "OR" } })}><option value="AND">AND</option><option value="OR">OR</option></select></FormField>
          <FormField label="Executive Alarm Delay (s)"><input type="number" min="0.2" max="51" step="0.2" value={monitor.executiveAlarmDelayMs / 1000} onChange={(event) => patch({ monitor: { executiveAlarmDelayMs: numberValue(event.target.value, monitor.executiveAlarmDelayMs / 1000) * 1000 } })} /></FormField>
          <FormField label="Post Changeover Delay (s)"><input type="number" min="0" max="100" step="0.1" value={monitor.postChangeoverHoldoffMs / 1000} onChange={(event) => patch({ monitor: { postChangeoverHoldoffMs: numberValue(event.target.value, monitor.postChangeoverHoldoffMs / 1000) * 1000 } })} /></FormField>
          <FormField label="Power On Delay (s)"><input type="number" min="0" max="100" step="0.1" value={monitor.powerOnHoldoffMs / 1000} onChange={(event) => patch({ monitor: { powerOnHoldoffMs: numberValue(event.target.value, monitor.powerOnHoldoffMs / 1000) * 1000 } })} /></FormField>
          <FormField label="Average Count"><input type="number" min="2" max="10" step="1" value={monitor.measurementAverageCount} onChange={(event) => patch({ monitor: { measurementAverageCount: numberValue(event.target.value, monitor.measurementAverageCount) } })} /></FormField>
          <FormField label="Warning Range (%)"><input type="number" min="0" max="100" step="0.01" value={monitor.warningRangePercent} onChange={(event) => patch({ monitor: { warningRangePercent: numberValue(event.target.value, monitor.warningRangePercent) } })} /></FormField>
        </div>
      </fieldset>
      <div className={styles.channelSetupGrid}>
        {DVOR220_MONITOR_CHANNEL_IDS.map((channelId) => {
          const channel = monitor.channels[channelId];
          return (
            <fieldset key={channelId} className={styles.formSection} disabled={disabled}>
              <legend>{channelId.toUpperCase()}</legend>
              <FormField label="Type"><select value={channel.type} onChange={(event) => channelPatch(channelId, { type: event.target.value as "FFM" | "NFM" | "disabled" })}><option value="FFM">FFM</option><option value="NFM">NFM</option><option value="disabled">Disabled</option></select></FormField>
              <FormField label="Reference Azimuth"><input type="number" min="-40" max="40" step="0.01" value={channel.referenceAzimuthDeg} onChange={(event) => channelPatch(channelId, { referenceAzimuthDeg: numberValue(event.target.value, channel.referenceAzimuthDeg) })} /></FormField>
              <MopiensSlideSwitch label="Executive Action" checked={channel.executiveAction} disabled={disabled} onCheckedChange={(checked) => channelPatch(channelId, { executiveAction: checked })} />
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

type BandField = keyof Pick<Dvor220AlarmBand, "lowerAlarm" | "lowerWarning" | "nominal" | "upperWarning" | "upperAlarm">;

function MonitorLimitSetup({ configuration, disabled, patch, channelId, onChannelChange }: { configuration: Dvor220Configuration; disabled: boolean; patch: (patch: Dvor220DeepPartial<Dvor220Configuration>) => void; channelId: Dvor220MonitorChannelId; onChannelChange: (channelId: Dvor220MonitorChannelId) => void }) {
  function updateBand(parameter: Dvor220MonitorParameter, field: BandField, value: string) {
    const current = configuration.monitor.channels[channelId].limits[parameter][field];
    const parsed = value === "" && field !== "nominal" ? null : numberValue(value, current ?? 0);
    patch({ monitor: { channels: { [channelId]: { limits: { [parameter]: { [field]: parsed } } } } } } as Dvor220DeepPartial<Dvor220Configuration>);
  }
  const fields: { id: BandField; label: string }[] = [
    { id: "lowerAlarm", label: "Alarm Low" },
    { id: "lowerWarning", label: "Warning Low" },
    { id: "nominal", label: "Nominal" },
    { id: "upperWarning", label: "Warning High" },
    { id: "upperAlarm", label: "Alarm High" },
  ];
  return (
    <fieldset className={styles.formSection} disabled={disabled}>
      <legend>Channel Limits</legend>
      <FormField label="Monitor Channel">
        <select value={channelId} onChange={(event) => onChannelChange(event.target.value as Dvor220MonitorChannelId)}>
          {DVOR220_MONITOR_CHANNEL_IDS.map((id) => <option key={id} value={id}>{id.toUpperCase()}</option>)}
        </select>
      </FormField>
      <div className={styles.editorTableFrame}>
        <table className={styles.editorTable}>
          <caption>{channelId.toUpperCase()} warning and alarm limits</caption>
          <thead><tr><th>Parameter</th>{fields.map((field) => <th key={field.id}>{field.label}</th>)}</tr></thead>
          <tbody>
            {DVOR220_MONITOR_PARAMETERS.map((parameter) => {
              const band = configuration.monitor.channels[channelId].limits[parameter];
              return (
                <tr key={parameter}>
                  <th scope="row">{monitorParameterLabels[parameter]}</th>
                  {fields.map((field) => <td key={field.id}><input aria-label={`${monitorParameterLabels[parameter]} ${field.label}`} type="number" step="any" value={band[field.id] ?? ""} onChange={(event) => updateBand(parameter, field.id, event.target.value)} /></td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}

function SystemSetup({ configuration, disabled, patch }: { configuration: Dvor220Configuration; disabled: boolean; patch: (patch: Dvor220DeepPartial<Dvor220Configuration>) => void }) {
  const system = configuration.system;
  return (
    <div className={styles.twoColumnLayout}>
      <fieldset className={styles.formSection} disabled={disabled}>
        <legend>Login and Settings</legend>
        <div className={styles.formGridSingle}>
          <MopiensSlideSwitch label="Allow simultaneous login" checked={system.allowSimultaneousLogin} disabled={disabled} onCheckedChange={(checked) => patch({ system: { allowSimultaneousLogin: checked } })} />
          <MopiensSlideSwitch label="Allow guest access" checked={system.allowGuestAccess} disabled={disabled} onCheckedChange={(checked) => patch({ system: { allowGuestAccess: checked } })} />
          <FormField label="Automatic Logout (min)"><input type="number" min="0" max="1440" value={system.automaticLogoutMinutes} onChange={(event) => patch({ system: { automaticLogoutMinutes: numberValue(event.target.value, system.automaticLogoutMinutes) } })} /></FormField>
          <MopiensSlideSwitch label="Settings only when monitors bypassed" checked={system.settingsOnlyWhenMonitorBypassed} disabled={disabled} onCheckedChange={(checked) => patch({ system: { settingsOnlyWhenMonitorBypassed: checked } })} />
          <MopiensSlideSwitch label="Settings only at local" checked={system.settingsOnlyAtLocal} disabled={disabled} onCheckedChange={(checked) => patch({ system: { settingsOnlyAtLocal: checked } })} />
        </div>
      </fieldset>
      <fieldset className={styles.formSection} disabled={disabled}>
        <legend>Automatic Shutdown</legend>
        <div className={styles.formGridSingle}>
          <MopiensSlideSwitch label="Shutdown on RCU fault" checked={system.shutdownOnRcuFault} disabled={disabled} onCheckedChange={(checked) => patch({ system: { shutdownOnRcuFault: checked } })} />
          <MopiensSlideSwitch label="Shutdown on LMI fault" checked={system.shutdownOnLmiFault} disabled={disabled} onCheckedChange={(checked) => patch({ system: { shutdownOnLmiFault: checked } })} />
          <MopiensSlideSwitch label="Shutdown on CSP fault" checked={system.shutdownOnCspFault} disabled={disabled} onCheckedChange={(checked) => patch({ system: { shutdownOnCspFault: checked } })} />
          <FormField label="Control Fault Delay (s)"><input type="number" min="0" max="30" step="0.1" value={system.controlFaultShutdownDelayMs / 1000} onChange={(event) => patch({ system: { controlFaultShutdownDelayMs: numberValue(event.target.value, system.controlFaultShutdownDelayMs / 1000) * 1000 } })} /></FormField>
          <FormField label="IDENT when Bypassed"><select value={system.identWhenMonitorBypassed} onChange={(event) => patch({ system: { identWhenMonitorBypassed: event.target.value as "remove" | "itst" | "no-change" } })}><option value="no-change">No Change</option><option value="itst">ITST</option><option value="remove">Remove</option></select></FormField>
        </div>
      </fieldset>
    </div>
  );
}

function CommunicationSetup({ configuration, disabled, patch }: { configuration: Dvor220Configuration; disabled: boolean; patch: (patch: Dvor220DeepPartial<Dvor220Configuration>) => void }) {
  const communication = configuration.communication;
  return (
    <fieldset className={styles.formSection} disabled={disabled}>
      <legend>PMDT, SCU and RCU Communication</legend>
      <div className={styles.formGrid}>
        <FormField label="Remote Connection Limit"><input type="number" min="0" max="16" value={communication.remoteConnectionLimit} onChange={(event) => patch({ communication: { remoteConnectionLimit: numberValue(event.target.value, communication.remoteConnectionLimit) } })} /></FormField>
        <FormField label="Local Connection Limit"><input type="number" min="0" max="16" value={communication.localConnectionLimit} onChange={(event) => patch({ communication: { localConnectionLimit: numberValue(event.target.value, communication.localConnectionLimit) } })} /></FormField>
        <FormField label="PMDT RS-232 Baud"><select value={communication.pmdtRs232BaudRate} onChange={(event) => patch({ communication: { pmdtRs232BaudRate: Number(event.target.value) } })}>{[9600, 19200, 38400, 57600, 115200].map((baud) => <option key={baud} value={baud}>{baud}</option>)}</select></FormField>
        <FormField label="RCU Line Type"><select value={communication.rcuLineType} onChange={(event) => patch({ communication: { rcuLineType: event.target.value as "ethernet" | "modem" | "rs232" } })}><option value="ethernet">Ethernet</option><option value="modem">Modem</option><option value="rs232">RS-232</option></select></FormField>
        <FormField label="Local IP Start"><input value={communication.localIpStart} onChange={(event) => patch({ communication: { localIpStart: event.target.value } })} /></FormField>
        <FormField label="Local IP End"><input value={communication.localIpEnd} onChange={(event) => patch({ communication: { localIpEnd: event.target.value } })} /></FormField>
      </div>
    </fieldset>
  );
}

function TransmitterLimitSetup({ configuration, disabled, patch }: { configuration: Dvor220Configuration; disabled: boolean; patch: (patch: Dvor220DeepPartial<Dvor220Configuration>) => void }) {
  const limits = configuration.transmitterLimits;
  const bandFields: { key: BandField; label: string }[] = [
    { key: "lowerAlarm", label: "Alarm Low" },
    { key: "lowerWarning", label: "Warning Low" },
    { key: "nominal", label: "Nominal" },
    { key: "upperWarning", label: "Warning High" },
    { key: "upperAlarm", label: "Alarm High" },
  ];
  function updateBand(
    bandId: "carrierPower" | "sidebandPower",
    field: BandField,
    value: string,
  ) {
    const current = limits[bandId][field];
    const parsed = value === "" && field !== "nominal" ? null : numberValue(value, current ?? 0);
    patch({ transmitterLimits: { [bandId]: { [field]: parsed } } } as Dvor220DeepPartial<Dvor220Configuration>);
  }
  return (
    <div className={styles.setupSections}>
      <fieldset className={styles.formSection} disabled={disabled}>
        <legend>Transmitter Power Limits</legend>
        <div className={styles.editorTableFrame}>
          <table className={styles.editorTable}>
            <caption>Carrier and sideband warning/alarm limits</caption>
            <thead><tr><th>Output</th>{bandFields.map((field) => <th key={field.key}>{field.label}</th>)}</tr></thead>
            <tbody>
              {(["carrierPower", "sidebandPower"] as const).map((bandId) => (
                <tr key={bandId}>
                  <th scope="row">{bandId === "carrierPower" ? "Carrier Power (W)" : "Sideband Power (W)"}</th>
                  {bandFields.map((field) => (
                    <td key={field.key}>
                      <input
                        aria-label={`${bandId} ${field.label}`}
                        type="number"
                        step="any"
                        value={limits[bandId][field.key] ?? ""}
                        onChange={(event) => updateBand(bandId, field.key, event.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>
      <fieldset className={styles.formSection} disabled={disabled}>
        <legend>VSWR Limits</legend>
        <div className={styles.formGrid}>
          <FormField label="Upper Warning"><input type="number" min="1" step="0.01" value={limits.vswrUpperWarning} onChange={(event) => patch({ transmitterLimits: { vswrUpperWarning: numberValue(event.target.value, limits.vswrUpperWarning) } })} /></FormField>
          <FormField label="Upper Alarm"><input type="number" min="1" step="0.01" value={limits.vswrUpperAlarm} onChange={(event) => patch({ transmitterLimits: { vswrUpperAlarm: numberValue(event.target.value, limits.vswrUpperAlarm) } })} /></FormField>
        </div>
      </fieldset>
    </div>
  );
}

function EnvironmentalSetup({ configuration, disabled, patch }: { configuration: Dvor220Configuration; disabled: boolean; patch: (patch: Dvor220DeepPartial<Dvor220Configuration>) => void }) {
  const units = configuration.optionalUnits;
  return (
    <fieldset className={styles.formSection} disabled={disabled}>
      <legend>Environmental and Optional Units</legend>
      <div className={styles.formGridSingle}>
        <MopiensSlideSwitch label="EMU installed" checked={units.emu} disabled={disabled} onCheckedChange={(checked) => patch({ optionalUnits: { emu: checked } })} />
        <MopiensSlideSwitch label="NIU installed" checked={units.niu} disabled={disabled} onCheckedChange={(checked) => patch({ optionalUnits: { niu: checked } })} />
        <MopiensSlideSwitch label="VAU installed" checked={units.vau} disabled={disabled} onCheckedChange={(checked) => patch({ optionalUnits: { vau: checked } })} />
      </div>
    </fieldset>
  );
}

function MiscellaneousSetup({ configuration, disabled, patch }: { configuration: Dvor220Configuration; disabled: boolean; patch: (patch: Dvor220DeepPartial<Dvor220Configuration>) => void }) {
  const battery = configuration.battery;
  const fields: { key: keyof typeof battery; label: string; unit: string; step: string }[] = [
    { key: "voltageWarningV", label: "Voltage Warning", unit: "V", step: "0.1" },
    { key: "voltageAlarmV", label: "Voltage Alarm", unit: "V", step: "0.1" },
    { key: "temperatureWarningC", label: "Temperature Warning", unit: "°C", step: "0.1" },
    { key: "temperatureAlarmC", label: "Temperature Alarm", unit: "°C", step: "0.1" },
    { key: "chargingCurrentA", label: "Charging Current", unit: "A", step: "0.1" },
    { key: "cutoffVoltageV", label: "Cutoff Voltage", unit: "V", step: "0.1" },
    { key: "backupRuntimeMinutes", label: "Backup Runtime", unit: "min", step: "1" },
  ];
  return (
    <div className={styles.setupSections}>
      <fieldset className={styles.formSection} disabled={disabled}>
        <legend>Backup Battery</legend>
        <div className={styles.formGrid}>
          {fields.map((field) => <FormField key={field.key} label={`${field.label} (${field.unit})`}><input type="number" step={field.step} value={battery[field.key]} onChange={(event) => patch({ battery: { [field.key]: numberValue(event.target.value, battery[field.key]) } })} /></FormField>)}
          <MopiensSlideSwitch label="Battery installed" checked={configuration.optionalUnits.battery} disabled={disabled} onCheckedChange={(checked) => patch({ optionalUnits: { battery: checked } })} />
          <MopiensSlideSwitch label="Standby monitor installed" checked={configuration.optionalUnits.standbyMonitor} disabled={disabled} onCheckedChange={(checked) => patch({ optionalUnits: { standbyMonitor: checked }, monitor: { channels: { standby: { type: checked ? "FFM" : "disabled" } } } } as Dvor220DeepPartial<Dvor220Configuration>)} />
        </div>
      </fieldset>
      {(["mon1", "mon2"] as const).map((monitorId) => (
        <fieldset key={monitorId} className={styles.formSection} disabled={disabled}>
          <legend>{monitorId.toUpperCase()} RF Gain</legend>
          <div className={styles.formGrid}>
            {(["cha", "chb1", "chb2", "standby", "tsg"] as const).map((channelId) => (
              <FormField key={channelId} label={`${channelId.toUpperCase()} Gain (dB)`}>
                <input
                  type="number"
                  step="0.1"
                  value={configuration.monitor.rfGainDb[monitorId][channelId]}
                  disabled={disabled || (channelId === "standby" && !configuration.optionalUnits.standbyMonitor)}
                  onChange={(event) => patch({ monitor: { rfGainDb: { [monitorId]: { [channelId]: numberValue(event.target.value, configuration.monitor.rfGainDb[monitorId][channelId]) } } } } as Dvor220DeepPartial<Dvor220Configuration>)}
                />
              </FormField>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function Dvor220SetupScreen({ screenId, device, snapshot, dispatch }: Dvor220SetupScreenProps) {
  const [limitChannel, setLimitChannel] = useState<Dvor220MonitorChannelId>("cha");
  const configuration = device.configuration.draft;
  const permission = getDvor220PermissionDecision(device, "configure");
  const disabled = !permission.allowed;
  const patch = (value: Dvor220DeepPartial<Dvor220Configuration>) => {
    dispatch({ type: "patch-draft", patch: value });
  };
  let content: ReactNode;
  if (screenId === "setup-station") content = <StationSetup configuration={configuration} disabled={disabled} patch={patch} />;
  else if (screenId === "setup-transmitter") content = <TransmitterSetup configuration={configuration} device={device} disabled={disabled} patch={patch} dispatch={dispatch} />;
  else if (screenId === "setup-thermal") content = <ThermalSetup configuration={configuration} disabled={disabled} patch={patch} />;
  else if (screenId === "setup-transmitter-limit") content = <TransmitterLimitSetup configuration={configuration} disabled={disabled} patch={patch} />;
  else if (screenId === "setup-monitor") content = <MonitorSetup configuration={configuration} disabled={disabled} patch={patch} />;
  else if (screenId === "setup-limits") content = <MonitorLimitSetup configuration={configuration} disabled={disabled} patch={patch} channelId={limitChannel} onChannelChange={setLimitChannel} />;
  else if (screenId === "setup-standby-limits") content = <MonitorLimitSetup configuration={configuration} disabled={disabled} patch={patch} channelId="standby" onChannelChange={() => undefined} />;
  else if (screenId === "setup-system") content = <SystemSetup configuration={configuration} disabled={disabled} patch={patch} />;
  else if (screenId === "setup-environmental") content = <EnvironmentalSetup configuration={configuration} disabled={disabled} patch={patch} />;
  else if (screenId === "setup-communication") content = <CommunicationSetup configuration={configuration} disabled={disabled} patch={patch} />;
  else content = <MiscellaneousSetup configuration={configuration} disabled={disabled} patch={patch} />;

  const tone: MopiensVisualTone = disabled ? "inactive" : device.configuration.draftDirty ? "warning" : "normal";
  return (
    <div className={styles.screenBody} data-configuration-state={device.configuration.draftDirty ? "dirty" : "clean"}>
      <SetupHeader title={DVOR220_SCREEN_LABELS[screenId]}>
        <span className={styles.inlineState} data-tone={tone}>{disabled ? permission.reason : device.configuration.draftDirty ? "Draft has unapplied changes" : "Draft matches running configuration"}</span>
      </SetupHeader>
      {content}
      <ConfigurationActions device={device} snapshot={snapshot} dispatch={dispatch} />
    </div>
  );
}
