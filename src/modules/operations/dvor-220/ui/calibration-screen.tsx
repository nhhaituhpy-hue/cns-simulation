"use client";

import { useState, type ReactNode } from "react";
import { MopiensBeveledButton, MopiensModal, MopiensTable } from "@/modules/operations/mopiens-pmdt";
import { dvor220TransmitterPhysicalValue, dvor220TransmitterSetpoint } from "../domain/engine";
import { getDvor220PermissionDecision } from "../domain/permissions";
import {
  DVOR220_MONITOR_CHANNEL_IDS,
  DVOR220_MONITOR_IDS,
  DVOR220_RF_OUTPUT_IDS,
  DVOR220_TRANSMITTER_IDS,
  type Dvor220CalibrationCommand,
  type Dvor220CalibrationTarget,
  type Dvor220DeviceState,
  type Dvor220MonitorId,
  type Dvor220Snapshot,
  type Dvor220TransmitterSetpointParameter,
} from "../domain/types";
import styles from "../dvor220.module.css";
import type { Dvor220MaintenanceScreenProps } from "./maintenance-screens";
import { DVOR220_SCREEN_LABELS, type Dvor220ScreenId } from "./navigation";

const calibrationScreens = ["maintenance-tx-reading", "maintenance-tx-setpoint", "maintenance-monitor-cal", "maintenance-pdc-cal"] as const;
type CalibrationScreenId = (typeof calibrationScreens)[number];
type CalibrationProps = Pick<Dvor220MaintenanceScreenProps, "device" | "snapshot" | "dispatch" | "openDialog"> & { screenId: CalibrationScreenId };
type ReadingTarget = Exclude<Dvor220CalibrationTarget, { kind: "monitor-frequency" }>;

export function isCalibrationScreen(screen: Dvor220ScreenId): screen is CalibrationScreenId {
  return calibrationScreens.some((id) => id === screen);
}

const outputLabels = { carrier: "Carrier", usbCos: "USB COS", usbSin: "USB SIN", lsbCos: "LSB COS", lsbSin: "LSB SIN" };
const setpointLabels: Record<Dvor220TransmitterSetpointParameter, string> = {
  carrier: "CSB Power", usbCos: "USB COS Power", usbSin: "USB SIN Power", lsbCos: "LSB COS Power", lsbSin: "LSB SIN Power",
  am30Hz: "AM 30Hz Mod.", ident1020Hz: "1020 Hz Mod.",
};
const monitorRows = [
  ["bearingError", "Bearing Error"],
  ["am30Hz", "30Hz Mod."],
  ["ident1020Hz", "1020Hz Mod."],
  ["am9960Hz", "9960Hz Mod."],
  ["rfLevel", "RF Level"],
  ["fmIndex", "FM Index"],
] as const;
const channelLabels = { cha: "CH.A", chb1: "CH.B.1", chb2: "CH.B.2", standby: "Standby" };

type ReadingRow = {
  id: string;
  context: string;
  label: string;
  target: ReadingTarget;
  setting: number | null;
  reading: number | null;
  factor: number;
  savedFactor: number;
  unit: string;
};

type CalibrationGroup = { title: string; rows: ReadingRow[] };

function formatValue(value: number | null, digits = 2) {
  return value === null ? "—" : value.toFixed(digits);
}

function formatRowValue(row: ReadingRow, value: number | null, showUnit = true) {
  const parameter = row.target.kind === "transmitter-reading" ? row.target.output : row.target.parameter;
  const digits = row.unit === "W" && parameter !== "carrier" ? 3 : 2;
  return showUnit && value !== null && row.unit ? `${formatValue(value, digits)} ${row.unit}` : formatValue(value, digits);
}

function txGroups(device: Dvor220DeviceState, snapshot: Dvor220Snapshot, setpoint: boolean): CalibrationGroup[] {
  const parameters: readonly Dvor220TransmitterSetpointParameter[] = setpoint
    ? [...DVOR220_RF_OUTPUT_IDS, "am30Hz", "ident1020Hz"]
    : DVOR220_RF_OUTPUT_IDS;
  const state = device.calibration;
  const config = device.configuration.running;
  return DVOR220_TRANSMITTER_IDS.filter((tx) => tx === "tx1" || config.station.equipmentVersion === "dual").map((transmitterId) => {
    const context = transmitterId.toUpperCase();
    const live = snapshot.transmitters[transmitterId];
    return {
      title: `${context} ${setpoint ? "Setpoints" : "Power Output Readings"}`,
      rows: parameters.map((parameter): ReadingRow => {
        const modulation = parameter === "am30Hz" || parameter === "ident1020Hz";
        const channel = modulation ? "carrier" : parameter;
        const reading = !live.powerOn || !live.rfOutputs[channel] ? null
          : modulation ? dvor220TransmitterPhysicalValue(device, transmitterId, parameter)
          : live.forwardPowerW[parameter];
        const isSetpoint = setpoint || modulation;
        return {
          id: `${transmitterId}-${parameter}`, context,
          label: isSetpoint ? setpointLabels[parameter] : outputLabels[parameter],
          target: isSetpoint
            ? { kind: "transmitter-setpoint", transmitterId, parameter }
            : { kind: "transmitter-reading", transmitterId, output: parameter },
          factor: isSetpoint ? state.transmitterSetpointFactors[transmitterId][parameter] : state.transmitterReadingFactors[transmitterId][parameter],
          savedFactor: isSetpoint ? state.saved.transmitterSetpointFactors[transmitterId][parameter] : state.saved.transmitterReadingFactors[transmitterId][parameter],
          setting: dvor220TransmitterSetpoint(device, transmitterId, parameter),
          reading, unit: modulation ? "%" : "W",
        };
      }),
    };
  });
}

function monitorGroups(device: Dvor220DeviceState, snapshot: Dvor220Snapshot, monitorId: Dvor220MonitorId): CalibrationGroup[] {
  const state = device.calibration;
  return DVOR220_MONITOR_CHANNEL_IDS.filter((id) => snapshot.monitors[monitorId].channels[id].enabled).map((channelId) => ({
    title: channelLabels[channelId],
    rows: monitorRows.map(([parameter, label]) => {
      const live = snapshot.monitors[monitorId].channels[channelId].readings[parameter];
      const factors = (values: typeof state.saved) => parameter === "rfLevel"
        ? values.monitorRfLevelOffsets[monitorId][channelId]
        : values.monitorFactors[monitorId][channelId][parameter];
      return {
        id: `${monitorId}-${channelId}-${parameter}`,
        context: `${monitorId.toUpperCase()} · ${channelLabels[channelId]}`,
        label, target: { kind: "monitor", monitorId, channelId, parameter },
        setting: device.configuration.running.monitor.channels[channelId].limits[parameter].nominal,
        reading: ["disabled", "unplugged", "stabilizing"].includes(live.status) ? null : live.value,
        factor: factors(state), savedFactor: factors(state.saved), unit: live.unit,
      };
    }),
  }));
}

function pdcGroup(device: Dvor220DeviceState, snapshot: Dvor220Snapshot): CalibrationGroup {
  const transmitterId = snapshot.activeTransmitterId;
  return {
    title: "PDC Calibration",
    rows: DVOR220_RF_OUTPUT_IDS.map((output) => ({
      id: output, context: transmitterId?.toUpperCase() ?? "PDC", label: outputLabels[output],
      target: { kind: "pdc", parameter: output },
      setting: transmitterId ? dvor220TransmitterSetpoint(device, transmitterId, output) : null,
      reading: transmitterId && snapshot.transmitters[transmitterId].rfOutputs[output] ? snapshot.pdc.forwardPowerW[output] : null,
      factor: device.calibration.pdcFactors[output], savedFactor: device.calibration.saved.pdcFactors[output], unit: "W",
    })),
  };
}

function CalibrationDialog({
  title = "Calibration", target, label, unit, initialValue, locked, dirty, dispatch, onClose, toCommand, children,
}: {
  title?: string;
  target: Dvor220CalibrationTarget;
  label: string;
  unit: string;
  initialValue: number | null;
  locked: boolean;
  dirty: boolean;
  dispatch: CalibrationProps["dispatch"];
  onClose: () => void;
  toCommand: (reference: number) => Dvor220CalibrationCommand | null;
  children?: ReactNode;
}) {
  const [input, setInput] = useState(initialValue === null ? "" : String(initialValue));
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);
  function run(command: Parameters<typeof dispatch>[0], message: string) {
    const result = dispatch(command);
    setFeedback({ ok: result.ok, message: result.ok ? message : result.error ?? "Calibration failed." });
  }
  function close() {
    if (dirty && !locked) {
      const result = dispatch({ type: "close-calibration", target });
      if (!result.ok) {
        setFeedback({ ok: false, message: result.error ?? "Could not close calibration." });
        return;
      }
    }
    onClose();
  }

  const reference = input.trim() === "" ? NaN : Number(input);
  const command = Number.isFinite(reference) ? toCommand(reference) : null;
  return (
    <MopiensModal open title={title} brandLabel="MOPIENS" onClose={close}
      onSubmit={() => { if (!locked && command) run({ type: "calibrate", calibration: command }, "Applied to running memory. Save to keep it."); }}
      actions={[
        { id: "init", label: "Initialize", disabled: locked, onClick: () => run({ type: "initialize-calibration", target }, "Factory factor applied to running memory.") },
        { id: "save", label: "Save", disabled: locked || !dirty, onClick: () => run({ type: "save-calibration", target }, "Saved to non-volatile memory.") },
        { id: "close", label: "Close", onClick: close },
      ]}
    >
      <div className={styles.calibrationDialog}>
        {children}
        <fieldset>
          <legend>Calibration</legend>
          <div className={styles.calibrationInputRow}>
            <label>
              <span>{label}</span>
              <input aria-label="Reference value" type="number" step="any" value={input}
                onChange={(event) => setInput(event.target.value)} disabled={locked} data-autofocus />
              <span>{unit}</span>
            </label>
            <MopiensBeveledButton type="submit" tone="primary" disabled={locked || !command}>Calibrate</MopiensBeveledButton>
          </div>
          <p role={feedback && !feedback.ok ? "alert" : "status"}>{feedback?.message ?? (dirty ? "Unsaved calibration" : "Ready")}</p>
        </fieldset>
      </div>
    </MopiensModal>
  );
}

function CalibrationGroupSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <details className={styles.fieldSection} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className={styles.fieldSectionSummary}>
        <span className={styles.fieldSectionToggle} aria-hidden />
        {title}
      </summary>
      <div className={styles.fieldSectionContent}>{children}</div>
    </details>
  );
}

function ReadingDialog({ row, nominal, allowed, dispatch, onClose }: {
  row: ReadingRow;
  nominal: boolean;
  allowed: boolean;
  dispatch: CalibrationProps["dispatch"];
  onClose: () => void;
}) {
  return (
    <CalibrationDialog target={row.target} label={`${row.label} (${row.context})`} unit={row.unit}
      locked={!allowed} dirty={row.factor !== row.savedFactor} initialValue={row.setting ?? row.reading}
      dispatch={dispatch} onClose={onClose}
      toCommand={(referenceValue) => row.reading === null ? null : { ...row.target, indicatedValue: row.reading, referenceValue }}>
      <fieldset>
        <legend>Current Setting ({row.context})</legend>
        <dl className={styles.calibrationCurrent}>
          <div><dt>Current Cal. Factor</dt><dd>{formatValue(row.factor, 5)}</dd></div>
          {row.target.kind !== "pdc" || row.target.parameter !== "carrierVswr" ? (
            <div><dt>{nominal ? "Nominal" : "Current Setpoint"}</dt><dd>{formatRowValue(row, row.setting)}</dd></div>
          ) : null}
          <div><dt>Current Reading</dt><dd>{formatRowValue(row, row.reading)}</dd></div>
        </dl>
      </fieldset>
    </CalibrationDialog>
  );
}

function MonitorFrequency({ device, snapshot, dispatch, openDialog, allowed }: Omit<CalibrationProps, "screenId"> & { allowed: boolean }) {
  const [calibrating, setCalibrating] = useState(false);
  const active = snapshot.activeTransmitterId;
  const setpoint = device.configuration.running.station.frequencyMHz;
  const monitor = DVOR220_MONITOR_IDS.map((id) => {
    const reading = snapshot.monitors[id].channels.cha.readings.carrierFrequency;
    return {
      factor: device.calibration.monitorFactors[id].cha.carrierFrequency,
      saved: device.calibration.saved.monitorFactors[id].cha.carrierFrequency,
      reading: active && snapshot.transmitters[active].rfOutputs.carrier
        && !["disabled", "unplugged", "stabilizing"].includes(reading.status) ? reading.value : null,
    };
  });
  const [mon1, mon2] = monitor;
  const ready = mon1.reading !== null && mon2.reading !== null;
  const mapReading = (value: number | null) => formatValue(value, 5);
  return (
    <>
      <CalibrationGroupSection title="Status">
        <div className={styles.actionRow}>
        <span>Active: {active?.toUpperCase() ?? "—"}</span>
        <MopiensBeveledButton disabled={!openDialog || !getDvor220PermissionDecision(device, "control").allowed}
          onClick={() => openDialog?.("changeover")}>Run Changeover</MopiensBeveledButton>
        </div>
      </CalibrationGroupSection>
      <CalibrationGroupSection title="MON">
        <MopiensTable dense caption="MON" rows={[{ id: "carrier" }]} getRowId={(row) => row.id} columns={[
        { id: "item", label: "Item", render: () => "Carrier freq." },
        { id: "factor1", label: "MON1 Cal. Factor", render: () => formatValue(mon1.factor, 9) },
        { id: "factor2", label: "MON2 Cal. Factor", render: () => formatValue(mon2.factor, 9) },
        { id: "setpoint", label: "Setpoint", render: () => mapReading(setpoint) },
        { id: "reading1", label: "MON1 Reading", render: () => mapReading(mon1.reading) },
        { id: "reading2", label: "MON2 Reading", render: () => mapReading(mon2.reading) },
        { id: "unit", label: "Unit", render: () => "MHz" },
        { id: "calibration", label: "Calibration", render: () =>
          <MopiensBeveledButton disabled={!allowed || !ready} onClick={() => setCalibrating(true)}>Calibrate carrier frequency</MopiensBeveledButton> },
        ]} />
      </CalibrationGroupSection>
      {calibrating ? (
        <CalibrationDialog title="Freq Calibration" target={{ kind: "monitor-frequency" }}
          label="Carrier Frequency" unit="MHz" locked={!allowed} dirty={monitor.some(({ factor, saved }) => factor !== saved)}
          initialValue={setpoint} dispatch={dispatch} onClose={() => setCalibrating(false)}
          toCommand={(referenceValue) => mon1.reading === null || mon2.reading === null ? null
            : { kind: "monitor-frequency", referenceValue, readings: { mon1: mon1.reading, mon2: mon2.reading } }} />
      ) : null}
    </>
  );
}

export function CalibrationScreen({ screenId, device, snapshot, dispatch, openDialog }: CalibrationProps) {
  const [view, setView] = useState<Dvor220MonitorId | "frequency">("mon1");
  const [selection, setSelection] = useState<string | null>(null);
  const permission = getDvor220PermissionDecision(device, "calibrate");
  const monitor = screenId === "maintenance-monitor-cal";
  const pdc = screenId === "maintenance-pdc-cal";
  const unitColumn = monitor || screenId === "maintenance-tx-setpoint";
  const groups = pdc ? [pdcGroup(device, snapshot)] : monitor
    ? view === "frequency" ? [] : monitorGroups(device, snapshot, view)
    : txGroups(device, snapshot, screenId === "maintenance-tx-setpoint");
  const selected = selection === "carrier-vswr" ? {
    id: "carrier-vswr", context: snapshot.activeTransmitterId?.toUpperCase() ?? "PDC", label: "Carrier VSWR",
    target: { kind: "pdc", parameter: "carrierVswr" } as const,
    setting: null, reading: snapshot.pdc.carrierVswr, unit: ":1",
    factor: device.calibration.pdcFactors.carrierVswr, savedFactor: device.calibration.saved.pdcFactors.carrierVswr,
  } : groups.flatMap((group) => group.rows).find((row) => row.id === selection);

  return (
    <div className={styles.screenBody}>
      <header className={styles.screenTitle}><h2>{DVOR220_SCREEN_LABELS[screenId]}</h2></header>
      {monitor ? (
        <div className={styles.maintenanceToolbar} role="tablist" aria-label="Monitor calibration pages">
          {([...DVOR220_MONITOR_IDS, "frequency"] as const).map((id) => (
            <MopiensBeveledButton key={id} role="tab" aria-selected={view === id} tone={view === id ? "primary" : "default"}
              onClick={() => setView(id)}>{id === "frequency" ? "Frequency" : id.toUpperCase()}</MopiensBeveledButton>
          ))}
        </div>
      ) : null}
      {!permission.allowed ? <p role="alert" className={styles.inlineError}>{permission.reason}</p> : null}
      {monitor && view === "frequency" ? <MonitorFrequency device={device} snapshot={snapshot} dispatch={dispatch} openDialog={openDialog} allowed={permission.allowed} /> : null}
      {groups.map(({ title, rows }) => (
        <CalibrationGroupSection key={title} title={title}>
          <MopiensTable dense caption={title} rows={rows} getRowId={(row) => row.id} columns={[
          { id: "item", label: "Item", render: (row) => row.label },
          { id: "factor", label: "Cal. Factor", align: "right", render: (row) => formatValue(row.factor, pdc ? 9 : 5) },
          { id: "setting", label: monitor ? "Nominal Value" : "Setpoint", align: "right", render: (row) => formatRowValue(row, row.setting, !unitColumn) },
          { id: "reading", label: "Current Reading", align: "right", render: (row) => formatRowValue(row, row.reading, !unitColumn) },
          ...(unitColumn ? [{ id: "unit", label: "Unit", render: (row: ReadingRow) => row.unit }] : []),
          { id: "calibrate", label: pdc ? "Power Calibration" : "Calibration", render: (row) => (
            <MopiensBeveledButton disabled={!permission.allowed || row.reading === null}
              aria-label={`Calibrate ${row.label} (${row.context})`} onClick={() => setSelection(row.id)}>Calibrate</MopiensBeveledButton>
          ) },
          ...(pdc ? [{ id: "vswr", label: "VSWR Calibration", render: (row: ReadingRow) => (
            <MopiensBeveledButton disabled={row.id !== "carrier" || !permission.allowed || row.reading === null}
              title={row.id === "carrier" ? undefined : "Sideband VSWR calibration procedure is not documented."}
              aria-label={`Calibrate ${row.label} VSWR`} onClick={() => setSelection("carrier-vswr")}>Calibrate</MopiensBeveledButton>
          ) }] : []),
          ]} />
        </CalibrationGroupSection>
      ))}
      {pdc ? <p>Sideband VSWR controls are shown for reference; their calibration procedure is not documented.</p> : null}
      {selected ? <ReadingDialog key={selected.id} row={selected} nominal={monitor} allowed={permission.allowed}
        dispatch={dispatch} onClose={() => setSelection(null)} /> : null}
    </div>
  );
}
