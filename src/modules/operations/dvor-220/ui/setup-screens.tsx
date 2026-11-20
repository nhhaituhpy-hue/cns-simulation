"use client";

import { useId, useState, type ChangeEvent, type ReactNode } from "react";
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

function HelperPowerField({ label, unit, value, max, step, disabled, onChange, children }: {
  label: string;
  unit: string;
  value: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
  children?: ReactNode;
}) {
  const id = useId();
  const inputProps = {
    min: 0, max, step, value, disabled,
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(numberValue(event.target.value, value)),
  };
  return (
    <div className={styles.helperPowerField} role="group" aria-labelledby={`${id}-label`}>
      <div className={styles.helperPowerHeader}>
        <span className={styles.helperPowerDot} aria-hidden="true" />
        <label id={`${id}-label`} htmlFor={id}>{label}</label>
        {children}
      </div>
      <span className={styles.helperPowerControls}>
        <input type="range" aria-label={`${label} slider`} {...inputProps} />
        <input id={id} type="number" {...inputProps} />
        <span>{unit}</span>
      </span>
    </div>
  );
}

function calibratedSetpointInput(value: number, max: number, step: number, factor: number, onChange: (nominal: number) => void) {
  const display = (nominal: number) => Number((nominal / factor).toPrecision(12));
  return {
    value: display(value),
    min: 0,
    max: display(max),
    step: factor === 1 ? step : "any",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const displayed = numberValue(event.target.value, display(value));
      onChange(displayed === display(max) ? max : Number((displayed * factor).toPrecision(12)));
    },
  };
}

function SetupNumberInput({ value, digits, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value"> & { value: number; digits?: number }) {
  const [editing, setEditing] = useState(false);
  return <input {...props} type="number" value={editing || digits === undefined ? value : value.toFixed(digits)}
    onFocus={() => setEditing(true)} onBlur={() => setEditing(false)} />;
}

function ConfigurationCommitActions({ device, snapshot, dispatch, saveLabel = "Profile Save" }: Pick<Dvor220SetupScreenProps, "device" | "snapshot" | "dispatch"> & { saveLabel?: string }) {
  const permission = getDvor220PermissionDecision(device, "configure");
  const errors = snapshot.configurationIssues.some((issue) => issue.severity === "error");
  return <>
    <MopiensBeveledButton tone="primary" onClick={() => dispatch({ type: "apply-draft" })}
      disabled={!permission.allowed || !device.configuration.draftDirty || errors}>Apply</MopiensBeveledButton>
    <MopiensBeveledButton tone={device.configuration.flashDirty && !device.scenario.active ? "warning" : "default"}
      onClick={() => dispatch({ type: "save-profile" })}
      disabled={!permission.allowed || !device.configuration.flashDirty || device.scenario.active}>{saveLabel}</MopiensBeveledButton>
  </>;
}

function ConfigurationActions({
  device,
  snapshot,
  dispatch,
  statusOnly = false,
}: Pick<Dvor220SetupScreenProps, "device" | "snapshot" | "dispatch"> & { statusOnly?: boolean }) {
  const permission = getDvor220PermissionDecision(device, "configure");
  const errors = snapshot.configurationIssues.filter((issue) => issue.severity === "error");
  const warnings = snapshot.configurationIssues.filter((issue) => issue.severity === "warning");
  return (
    <footer className={`${styles.configurationFooter} ${statusOnly ? styles.transmitterSetupStatus : ""}`}>
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
        {!statusOnly ? <ConfigurationCommitActions device={device} snapshot={snapshot} dispatch={dispatch} /> : null}
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
  snapshot,
  disabled,
  patch,
  dispatch,
}: {
  configuration: Dvor220Configuration;
  device: Dvor220DeviceState;
  snapshot: Dvor220Snapshot;
  disabled: boolean;
  patch: (patch: Dvor220DeepPartial<Dvor220Configuration>) => void;
  dispatch: (command: Dvor220Command) => Dvor220CommandResult;
}) {
  const [sameTransmitters, setSameTransmitters] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [helperOpen, setHelperOpen] = useState(false);
  const helperDescriptionId = useId();
  const [helperTransmitterId, setHelperTransmitterId] = useState<Dvor220TransmitterId>("tx1");
  const [sameToBoth, setSameToBoth] = useState(false);
  const [sidebandsSame, setSidebandsSame] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [helperDrafts, setHelperDrafts] = useState<Record<Dvor220TransmitterId, TransmitterHelperSettings>>(() => ({
    tx1: helperSettings(device.configuration.running, "tx1"),
    tx2: helperSettings(device.configuration.running, "tx2"),
  }));

  function transmitterPatch(transmitterId: Dvor220TransmitterId, value: Dvor220DeepPartial<Dvor220Configuration["transmitters"][Dvor220TransmitterId]>) {
    patch({ transmitters: sameTransmitters ? { tx1: value, tx2: value } : { [transmitterId]: value } } as Dvor220DeepPartial<Dvor220Configuration>);
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

  type Transmitter = Dvor220Configuration["transmitters"][Dvor220TransmitterId];
  type SetupRow = { label: string; unit?: string; helper?: boolean; input: (id: Dvor220TransmitterId) => ReactNode };
  function numberRow(section: string, label: string, unit: string, read: (tx: Transmitter) => number,
    write: (value: number) => Dvor220DeepPartial<Transmitter>,
    options: { min: number; max: number; step: number; digits?: number; inherited?: (tx: Transmitter) => boolean }): SetupRow {
    return { label, unit, input: (id) => {
      const tx = configuration.transmitters[id];
      return <SetupNumberInput aria-label={[id.toUpperCase(), section, label].filter(Boolean).join(" ")} value={read(tx)}
        min={options.min} max={options.max} step={options.step} digits={options.digits}
        disabled={disabled || options.inherited?.(tx)}
        onChange={(event) => transmitterPatch(id, write(numberValue(event.target.value, read(tx))))} />;
    } };
  }

  const outputLabels = { carrier: "Carrier", usbCos: "USB COS", usbSin: "USB SIN", lsbCos: "LSB COS", lsbSin: "LSB SIN" };
  const powerRows: SetupRow[] = (["carrier", "usbCos", "usbSin", "lsbCos", "lsbSin"] as const).map((output) => ({
    label: outputLabels[output], unit: output === "carrier" ? "%" : "W", helper: true,
    input: (id) => {
      const tx = configuration.transmitters[id];
      const carrier = output === "carrier";
      const input = calibratedSetpointInput(carrier ? tx.carrierScalePercent : tx.sidebandPowerW[output],
        carrier ? 100 : 5, carrier ? 0.1 : 0.01, device.calibration.transmitterSetpointFactors[id][output],
        (value) => transmitterPatch(id, carrier ? { carrierScalePercent: value } : { sidebandPowerW: { [output]: value } }));
      return <SetupNumberInput {...input} aria-label={`${id.toUpperCase()} ${outputLabels[output]}`} digits={carrier ? undefined : 3} disabled={disabled} />;
    },
  }));
  const optionRows: SetupRow[] = ([["Modulation Depth", "useStationModulation"], ["IDENT", "useStationIdent"], ["Azimuth", "useStationAzimuth"]] as const).map(([label, key]) => ({
    label, input: (id) => <select aria-label={`${id.toUpperCase()} Setup Option ${label}`} disabled={disabled}
      value={configuration.transmitters[id][key] ? "station" : "individual"}
      onChange={(event) => transmitterPatch(id, { [key]: event.target.value === "station" })}>
      <option value="individual">Setup individually</option><option value="station">As per Station Setup</option>
    </select>,
  }));
  function phaseRows(section: "RF Phasing" | "STB RF Phasing", key: "rfPhaseDeg" | "standbyRfPhaseDeg") {
    return ([["USB Phasing COS to SIN", "usbCosToSin"], ["LSB Phasing COS to SIN", "lsbCosToSin"], ["Carrier to sideband", "carrierToSideband"]] as const).map(([label, field]) =>
      numberRow(section, label, "°", (tx) => tx[key][field], (value) => ({ [key]: { [field]: value } }), { min: 0, max: 359.9, step: 0.1, digits: 1 }));
  }
  const modulationRows: SetupRow[] = ([["30Hz", "am30Hz", "am30HzPercent", "useStationModulation", 40], ["IDENT", "ident1020Hz", "identModulationPercent", "useStationIdent", 20]] as const).map(([label, parameter, key, inherited, max]) => ({
    label, unit: "%", input: (id) => {
      const tx = configuration.transmitters[id];
      return <SetupNumberInput aria-label={`${id.toUpperCase()} ${label}`} disabled={disabled || tx[inherited]}
        {...calibratedSetpointInput(tx[inherited] ? configuration.station[key] : tx[key], max, 0.1,
          device.calibration.transmitterSetpointFactors[id][parameter], (value) => transmitterPatch(id, { [key]: value }))} />;
    },
  }));
  const sections: { title: string; rows: SetupRow[] }[] = [
    { title: "Output Power", rows: powerRows },
    { title: "Setup Option", rows: optionRows },
    { title: "Azimuth Offset", rows: [numberRow("Azimuth Offset", "Azimuth", "°", (tx) => tx.azimuthOffsetDeg,
      (azimuthOffsetDeg) => ({ azimuthOffsetDeg }), { min: -40, max: 40, step: 0.01, digits: 1, inherited: (tx) => tx.useStationAzimuth })] },
    { title: "RF Phasing", rows: phaseRows("RF Phasing", "rfPhaseDeg") },
    { title: "STB RF Phasing", rows: phaseRows("STB RF Phasing", "standbyRfPhaseDeg") },
    { title: "Modulation Depth", rows: [...modulationRows,
      numberRow("", "Voice", "%", (tx) => tx.voiceModulationPercent, (voiceModulationPercent) => ({ voiceModulationPercent }),
        { min: 0, max: 40, step: 0.1, inherited: (tx) => tx.useStationModulation }),
      { label: "IDENT code", input: (id) => <input aria-label={`${id.toUpperCase()} IDENT code`} maxLength={4}
        value={configuration.transmitters[id].identCode} disabled={disabled || configuration.transmitters[id].useStationIdent}
        onChange={(event) => transmitterPatch(id, { identCode: event.target.value.toUpperCase() })} /> },
    ] },
  ];

  return (
    <>
      <header className={`${styles.screenTitle} ${styles.transmitterSetupHeader}`}>
        <h2>Transmitter Setup</h2>
        <div className={styles.actionRow}>
          <label><input type="checkbox" checked={sameTransmitters} disabled={disabled}
            onChange={(event) => setSameTransmitters(event.target.checked)} /> Same to TX1 and TX2</label>
          <ConfigurationCommitActions device={device} snapshot={snapshot} dispatch={dispatch} saveLabel="Save" />
        </div>
      </header>
      <div className={styles.transmitterSetupTableWrap}>
        <table className={styles.transmitterSetupTable} aria-label="Transmitter Setup">
          <thead><tr>{["Items", "TX1", "TX2", "Units", "Helper"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
          {sections.map(({ title, rows }) => {
            const collapsed = collapsedSections.includes(title);
            return <tbody key={title}>
              <tr className={styles.transmitterSetupSection}><td colSpan={5}>
                <button type="button" aria-expanded={!collapsed} aria-label={title}
                  onClick={() => setCollapsedSections((current) => collapsed ? current.filter((name) => name !== title) : [...current, title])}>
                  <span aria-hidden="true">{collapsed ? "▸" : "▾"}</span> {title}
                </button>
              </td></tr>
              {!collapsed && rows.map((row) => <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {DVOR220_TRANSMITTER_IDS.map((id) => <td key={id}>{row.input(id)}</td>)}
                <td>{row.unit}</td>
                <td>{row.helper ? <a href="#output-power" aria-disabled={disabled} tabIndex={disabled ? -1 : undefined}
                  onClick={(event) => { event.preventDefault(); if (!disabled) openHelper("tx1"); }}>Helper</a> : null}</td>
              </tr>)}
            </tbody>;
          })}
        </table>
      </div>

      <MopiensModal
        open={helperOpen}
        title="Output Power"
        brandLabel="MOPIENS 220 DVOR"
        size="large"
        closeOnBackdrop={false}
        onClose={() => setHelperOpen(false)}
        actions={[
          { id: "save", label: "Save", disabled: disabled || device.scenario.active || !helperHasUnsavedChanges, onClick: saveHelper },
          { id: "close", label: "Close", onClick: () => setHelperOpen(false) },
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
          <div className={styles.helperPanel} role="tabpanel" aria-label={`${helperTransmitterId.toUpperCase()} Output Power`}>
            <div className={styles.helperGrid}>
              <HelperPowerField label="Carrier Power" unit="%" value={activeHelper.carrierScalePercent}
                max={100} step={0.1} disabled={disabled} onChange={updateHelperCarrier}>
                <label className={styles.helperCheckbox}>
                  <input type="checkbox" checked={syncEnabled} disabled={disabled}
                    aria-describedby={`${helperDescriptionId}-sync`}
                    onChange={(event) => setSyncEnabled(event.target.checked)} />
                  Sync
                </label>
              </HelperPowerField>
              {(["usbCos", "usbSin", "lsbCos", "lsbSin"] as const).map((output) => (
                <HelperPowerField key={output} label={output.replace(/(Cos|Sin)/, " $1").toUpperCase()} unit="W"
                  value={activeHelper.sidebandPowerW[output]} max={5} step={0.001} disabled={disabled}
                  onChange={(value) => updateHelperSideband(output, value)}>
                  {output === "usbCos" && (
                    <label className={styles.helperCheckbox}>
                      <input type="checkbox" checked={sidebandsSame} disabled={disabled}
                        onChange={(event) => setSidebandsSame(event.target.checked)} />
                      Sideband same setting
                    </label>
                  )}
                </HelperPowerField>
              ))}
            </div>
            <div className={styles.helperActions} role="group" aria-label="Output Power actions">
              <label className={`${styles.helperCheckbox} ${styles.helperExtension}`}>
                <input type="checkbox" checked={sameToBoth} disabled={disabled}
                  onChange={(event) => setSameToBoth(event.target.checked)} />
                Same to TX1 and TX2
              </label>
              <label className={styles.helperCheckbox}>
                <input type="checkbox" checked={activeHelper.trackingEnabled} disabled={disabled}
                  aria-describedby={`${helperDescriptionId}-tracking`}
                  onChange={(event) => updateActiveHelper({ ...activeHelper, trackingEnabled: event.target.checked })} />
                Tracking
              </label>
              <MopiensBeveledButton tone="primary" disabled={disabled || !helperValid || !helperHasUnappliedChanges}
                aria-description={!helperValid
                  ? "Carrier must be 0–100%; each sideband must be 0–5 W."
                  : "Edited values are local to Helper. Apply sends them to running RAM. Save writes applied setpoints to non-volatile flash and is disabled during scenarios."}
                onClick={applyHelper}>
                Apply
              </MopiensBeveledButton>
            </div>
            <span hidden id={`${helperDescriptionId}-sync`}>Sync follows Carrier only in this Helper session.</span>
            <span hidden id={`${helperDescriptionId}-tracking`}>Tracking remains active after Apply and scales sideband setpoints with later Carrier changes.</span>
          </div>
        </div>
      </MopiensModal>
    </>
  );
}

function ThermalSetup({ configuration, disabled, patch }: { configuration: Dvor220Configuration; disabled: boolean; patch: (patch: Dvor220DeepPartial<Dvor220Configuration>) => void }) {
  const [sameSettings, setSameSettings] = useState(false);
  type Thermal = Dvor220Configuration["thermal"][Dvor220TransmitterId];
  const update = (id: Dvor220TransmitterId, value: Dvor220DeepPartial<Thermal>) =>
    patch({ thermal: sameSettings ? { tx1: value, tx2: value } : { [id]: value } });

  function numeric(label: string, read: (thermal: Thermal) => number, write: (value: number) => Dvor220DeepPartial<Thermal>) {
    return {
      label, unit: "°C",
      field: (id: Dvor220TransmitterId) => {
        const value = read(configuration.thermal[id]);
        return <input type="number" step="0.1" aria-label={`${id.toUpperCase()} ${label}`} value={value}
          onChange={(event) => update(id, write(numberValue(event.target.value, value)))} />;
      },
    };
  }

  const groups = [
    { title: "Cooling Fans", rows: [
      { label: "Operation Mode", unit: "", field: (id: Dvor220TransmitterId) =>
        <select aria-label={`${id.toUpperCase()} Operation Mode`} value={configuration.thermal[id].fanMode}
          onChange={(event) => update(id, { fanMode: event.target.value as Thermal["fanMode"] })}>
          <option value="auto">Auto</option><option value="on">On</option><option value="off">Off</option>
        </select> },
      numeric("Operation Temperature", (t) => t.fanStartC, (value) => ({ fanStartC: value })),
      numeric("Stop Temperature", (t) => t.fanStopC, (value) => ({ fanStopC: value })),
    ] },
    { title: "Overheat Protection", rows: (["cma", "usb", "lsb"] as const).flatMap((unit) => [
      numeric(`${unit.toUpperCase()} Transmitter Shutdown at`, (t) => t.shutdownC[unit], (value) => ({ shutdownC: { [unit]: value } })),
      numeric(`${unit.toUpperCase()} Transmitter Restart at`, (t) => t.restartC[unit], (value) => ({ restartC: { [unit]: value } })),
    ]) },
  ];

  return (
    <fieldset className={styles.formSection} disabled={disabled}>
      <legend>Thermal Control</legend>
      <label><input type="checkbox" checked={sameSettings} onChange={(event) => setSameSettings(event.target.checked)} /> Same to TX1 and TX2</label>
      <div className={styles.fieldInputTableFrame}>
        <table className={styles.editorTable}>
          <caption>Thermal Control settings</caption>
          <thead><tr>{["Items", "TX1", "TX2", "Units", "Helper"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
          {groups.map((group) => (
            <tbody key={group.title}>
              <tr><th scope="rowgroup" colSpan={5}>{group.title}</th></tr>
              {group.rows.map((row) => <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {DVOR220_TRANSMITTER_IDS.map((id) => <td key={id}>{row.field(id)}</td>)}
                <td>{row.unit}</td><td />
              </tr>)}
            </tbody>
          ))}
        </table>
      </div>
    </fieldset>
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
  else if (screenId === "setup-transmitter") content = <TransmitterSetup configuration={configuration} device={device} snapshot={snapshot} disabled={disabled} patch={patch} dispatch={dispatch} />;
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
      {screenId !== "setup-transmitter" ? <SetupHeader title={DVOR220_SCREEN_LABELS[screenId]}>
        <span className={styles.inlineState} data-tone={tone}>{disabled ? permission.reason : device.configuration.draftDirty ? "Draft has unapplied changes" : "Draft matches running configuration"}</span>
      </SetupHeader> : null}
      {content}
      <ConfigurationActions device={device} snapshot={snapshot} dispatch={dispatch} statusOnly={screenId === "setup-transmitter"} />
    </div>
  );
}
