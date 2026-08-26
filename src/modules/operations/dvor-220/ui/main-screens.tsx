"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  MopiensBeveledButton,
  MopiensGauge,
  MopiensStatusIndicator,
  MopiensTable,
  type MopiensVisualTone,
} from "@/modules/operations/mopiens-pmdt";
import {
  DVOR220_RF_OUTPUT_IDS,
  DVOR220_TRANSMITTER_IDS,
  DVOR220_TRANSMITTER_UNIT_IDS,
  type Dvor220AlarmBand,
  type Dvor220DeviceState,
  type Dvor220MonitorChannelId,
  type Dvor220MonitorParameter,
  type Dvor220ParameterReading,
  type Dvor220Snapshot,
  type Dvor220Status,
} from "../domain/types";
import type { Dvor220DialogId, Dvor220ScreenId } from "./navigation";
import { DVOR220_SCREEN_LABELS } from "./navigation";
import styles from "../dvor220.module.css";

export interface Dvor220MainScreenProps {
  screenId: Dvor220ScreenId;
  device: Dvor220DeviceState;
  snapshot: Dvor220Snapshot;
  openDialog: (dialog: Dvor220DialogId) => void;
  navigate: (screenId: Dvor220ScreenId) => void;
}

const parameterLabels: Record<Dvor220MonitorParameter, string> = {
  bearingError: "Azimuth",
  fmIndex: "FM Index",
  am30Hz: "30 Hz AM",
  am9960Hz: "9960 Hz AM",
  ident1020Hz: "1020 Hz IDENT",
  rfLevel: "RF Level",
  distortion9960Hz: "9960 Hz Distortion",
  carrierFrequency: "Carrier Frequency",
  subcarrierFrequency: "Subcarrier Frequency",
};

const channelByScreen: Partial<Record<Dvor220ScreenId, Dvor220MonitorChannelId>> = {
  "monitor-cha": "cha",
  "monitor-chb1": "chb1",
  "monitor-chb2": "chb2",
  "monitor-standby": "standby",
};

const monitorGroups: readonly {
  id: string;
  title: string;
  parameters: readonly Dvor220MonitorParameter[];
  defaultOpen: boolean;
}[] = [
  { id: "system", title: "System Parameters", parameters: ["bearingError", "rfLevel"], defaultOpen: true },
  { id: "modulation", title: "RF Modulation", parameters: ["fmIndex", "am30Hz", "am9960Hz"], defaultOpen: true },
  { id: "frequency", title: "Frequency / Error", parameters: ["carrierFrequency", "subcarrierFrequency", "distortion9960Hz"], defaultOpen: false },
  { id: "identification", title: "Identification", parameters: ["ident1020Hz"], defaultOpen: false },
];

export function toneForDvor220Status(status: Dvor220Status | Dvor220Snapshot["serviceStatus"]): MopiensVisualTone {
  if (status === "normal") return "normal";
  if (status === "warning" || status === "bypassed") return "warning";
  if (status === "alarm" || status === "fault" || status === "unplugged") return "alarm";
  if (status === "unknown") return "pending";
  return "inactive";
}

export function formatDvor220Status(status: string): string {
  return status.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function ScreenTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <header className={styles.screenTitle}>
      <h2>{title}</h2>
      {detail ? <p>{detail}</p> : null}
    </header>
  );
}

function FieldSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className={styles.fieldSection}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className={styles.fieldSectionSummary}>
        <span className={styles.fieldSectionToggle} aria-hidden />
        <span>{title}</span>
      </summary>
      <div className={styles.fieldSectionContent}>{children}</div>
    </details>
  );
}

function readingTone(status: Dvor220ParameterReading["status"]): MopiensVisualTone {
  if (status === "normal") return "normal";
  if (status === "warning") return "warning";
  if (status === "stabilizing") return "pending";
  if (status === "disabled") return "inactive";
  return "alarm";
}

function parameterStatus(status: Dvor220Status): Dvor220ParameterReading["status"] {
  if (status === "normal") return "normal";
  if (status === "warning" || status === "bypassed") return "warning";
  if (status === "off" || status === "not-present" || status === "unknown") return "disabled";
  if (status === "unplugged") return "unplugged";
  return "alarm";
}

function measurement(value: number, unit: string, status: Dvor220Status): Dvor220ParameterReading {
  return { value, unit, status: parameterStatus(status), severity: "secondary" };
}

function formatEngineeringValue(value: number, unit: string): string {
  const absolute = Math.abs(value);
  const digits = unit === "MHz" ? 5 : absolute >= 100 ? 2 : absolute >= 10 ? 2 : 3;
  return value.toFixed(digits);
}

function FieldReadingBar({
  label,
  source,
  reading,
  band,
}: {
  label: string;
  source: string;
  reading: Dvor220ParameterReading;
  band: Dvor220AlarmBand;
}) {
  const lowerBase = band.lowerAlarm ?? band.lowerWarning ?? band.nominal;
  const upperBase = band.upperAlarm ?? band.upperWarning ?? band.nominal;
  const baseSpan = Math.max(Math.abs(upperBase - lowerBase), Math.abs(band.nominal) * 0.02, 0.01);
  const scaleMin = lowerBase - baseSpan * 0.14;
  const scaleMax = upperBase + baseSpan * 0.14;
  const toPercent = (value: number) => Math.max(0, Math.min(100, ((value - scaleMin) / (scaleMax - scaleMin)) * 100));
  const lowAlarm = band.lowerAlarm === null ? 0 : toPercent(band.lowerAlarm);
  const lowWarning = band.lowerWarning === null ? lowAlarm : toPercent(band.lowerWarning);
  const highWarning = band.upperWarning === null ? 100 : toPercent(band.upperWarning);
  const highAlarm = band.upperAlarm === null ? highWarning : toPercent(band.upperAlarm);
  const gradient = `linear-gradient(90deg, #e64835 0% ${lowAlarm}%, #f1a51e ${lowAlarm}% ${lowWarning}%, #16ab54 ${lowWarning}% ${highWarning}%, #f1a51e ${highWarning}% ${highAlarm}%, #e64835 ${highAlarm}% 100%)`;
  const trackStyle = {
    "--field-value-position": `${toPercent(reading.value)}%`,
    "--field-limit-gradient": gradient,
  } as CSSProperties;
  const tone = readingTone(reading.status);
  const thresholdValues = [band.lowerAlarm, band.lowerWarning, band.nominal, band.upperWarning, band.upperAlarm];

  return (
    <div className={styles.fieldReadingCard} data-tone={tone} aria-label={`${source} ${label}`}>
      <div className={styles.fieldReadingIdentity}>
        <span className={styles.fieldStatusLamp} data-tone={tone} aria-hidden />
        <span>{label}</span>
      </div>
      <div className={styles.fieldReadingBody}>
        <strong>{source}</strong>
        <div className={styles.fieldThresholds} aria-hidden>
          {thresholdValues.map((value, index) => (
            <span key={`${label}-${index}`}>{value === null ? "" : formatEngineeringValue(value, reading.unit)}</span>
          ))}
        </div>
        <div className={styles.fieldLimitTrack} style={trackStyle} aria-hidden>
          <span className={styles.fieldLimitPointer} />
        </div>
        <output>{formatEngineeringValue(reading.value, reading.unit)} <small>{reading.unit}</small></output>
      </div>
    </div>
  );
}

function FieldMetricBar({
  label,
  source,
  value,
  unit,
  status,
  band,
}: {
  label: string;
  source: string;
  value: number;
  unit: string;
  status: Dvor220Status;
  band: Dvor220AlarmBand;
}) {
  return <FieldReadingBar label={label} source={source} reading={measurement(value, unit, status)} band={band} />;
}

function PowerRailBar({ value, maximum }: { value: number; maximum: number }) {
  const railStyle = { "--field-rail-level": `${Math.max(0, Math.min(100, (Math.abs(value) / maximum) * 100))}%` } as CSSProperties;
  return <span className={styles.powerRailBar} style={railStyle} aria-hidden><span /></span>;
}

function InputSignalTable({
  caption,
  prefix,
  values,
  formatValue,
}: {
  caption: string;
  prefix: string;
  values: readonly (number | boolean)[];
  formatValue: (value: number | boolean) => string;
}) {
  return (
    <div className={styles.fieldInputTableFrame}>
      <table className={styles.fieldInputTable}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Reading</th>
            {values.map((_value, index) => <th key={`${prefix}-${index + 1}`} scope="col">{prefix}{index + 1}</th>)}
            <th scope="col">Remark</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Value</th>
            {values.map((value, index) => (
              <td key={`${prefix}-value-${index + 1}`} data-active={typeof value === "boolean" ? value : undefined}>
                {formatValue(value)}
              </td>
            ))}
            <td>{values.some((value) => value === true) ? "Input active" : "Normal"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function HomeScreen({ device, snapshot, openDialog, navigate }: Dvor220MainScreenProps) {
  const channel = snapshot.monitors.mon1.channels.cha;
  const secondChannel = snapshot.monitors.mon2.channels.cha;
  const active = snapshot.activeTransmitterId;
  const mainId = DVOR220_TRANSMITTER_IDS.find(
    (id) => snapshot.transmitters[id].designation === "main",
  ) ?? "tx1";
  const controlsDisabled = !snapshot.controlAvailable || device.session.level < 2;

  const gauges = [
    { parameter: "am30Hz" as const, label: "30Hz", min: 0, max: 40, unit: "%" },
    { parameter: "am9960Hz" as const, label: "9960Hz", min: 0, max: 40, unit: "%" },
    { parameter: "bearingError" as const, label: "Azimuth", min: -2, max: 2, unit: "°" },
    { parameter: "fmIndex" as const, label: "FM Index", min: 10, max: 20, unit: "" },
    { parameter: "rfLevel" as const, label: "RF Level", min: -6, max: 6, unit: "dB" },
  ];

  return (
    <div className={styles.homeScreen}>
      <div className={styles.stationBanner}>{device.configuration.running.station.stationName}</div>
      <section className={styles.homeStatusPanel} aria-label="DVOR service status">
        <div className={styles.stationPhoto} role="img" aria-label="DVOR antenna field" />
        <MopiensStatusIndicator
          label={snapshot.serviceStatus.toUpperCase()}
          detail="Service Status"
          tone={toneForDvor220Status(snapshot.serviceStatus)}
          appearance="ring"
        />
        <dl className={styles.stationFacts}>
          <div><dt>Frequency</dt><dd>{snapshot.transmitters.tx1.frequencies.carrier.toFixed(2)} MHz</dd></div>
          <div><dt>IDENT</dt><dd>{device.configuration.running.station.identCode}</dd></div>
          <div><dt>Power</dt><dd>{snapshot.power.source.toUpperCase()}</dd></div>
          <div><dt>Remote</dt><dd>{snapshot.controlAvailable ? "Control available" : "Read only"}</dd></div>
          <div><dt>Environment</dt><dd>{formatDvor220Status(snapshot.power.status)}</dd></div>
          <div><dt>Antenna</dt><dd>{formatDvor220Status(snapshot.pdc.status)}</dd></div>
        </dl>
        <div className={styles.txTopology} aria-label="Transmitter routing topology">
          <span className={styles.antennaGlyph}>ANT</span>
          <div className={styles.topologyBus} />
          {DVOR220_TRANSMITTER_IDS.map((id) => {
            const transmitter = snapshot.transmitters[id];
            const onAntenna = transmitter.path === "antenna";
            return (
              <button
                key={id}
                type="button"
                className={`${styles.txTopologyUnit} ${onAntenna ? styles.txTopologyActive : ""}`}
                onClick={() => navigate("equipment")}
                aria-label={`${id.toUpperCase()} ${transmitter.path}`}
              >
                <strong>{id.toUpperCase()}</strong>
                <span>{formatDvor220Status(transmitter.status)}</span>
                <small>{transmitter.designation}</small>
              </button>
            );
          })}
          <span className={styles.loadGlyph}>LOAD</span>
        </div>
      </section>

      <section className={styles.monitorPanel} aria-label="Executive monitor readings">
        <div className={styles.monitorPanelHeader}>
          <div className={styles.monitorIndicators}>
            <MopiensStatusIndicator compact label="MON1 EXE" tone={toneForDvor220Status(snapshot.monitors.mon1.status)} />
            <MopiensStatusIndicator compact label="MON2 EXE" tone={toneForDvor220Status(snapshot.monitors.mon2.status)} />
          </div>
          <strong>CH.A</strong>
          <MopiensBeveledButton
            tone={snapshot.effectiveMonitorBypass ? "warning" : "default"}
            pressed={snapshot.effectiveMonitorBypass}
            disabled={controlsDisabled}
            onClick={() => openDialog("bypass")}
          >
            {snapshot.effectiveMonitorBypass ? "Bypass" : "Auto"}
          </MopiensBeveledButton>
        </div>
        <div className={styles.gaugeRow}>
          {gauges.map((gauge) => {
            const reading = channel.readings[gauge.parameter];
            return (
              <MopiensGauge
                key={gauge.parameter}
                label={gauge.label}
                value={reading.value}
                secondaryValue={secondChannel.readings[gauge.parameter].value}
                min={gauge.min}
                max={gauge.max}
                unit={gauge.unit}
                size="small"
                tone={reading.status === "normal"
                  ? "normal"
                  : reading.status === "warning"
                    ? "warning"
                    : reading.status === "stabilizing"
                      ? "pending"
                      : "alarm"}
                segments={[
                  { from: gauge.min, to: gauge.min + (gauge.max - gauge.min) * 0.15, tone: "alarm" },
                  { from: gauge.min + (gauge.max - gauge.min) * 0.15, to: gauge.min + (gauge.max - gauge.min) * 0.28, tone: "warning" },
                  { from: gauge.min + (gauge.max - gauge.min) * 0.28, to: gauge.min + (gauge.max - gauge.min) * 0.72, tone: "normal" },
                  { from: gauge.min + (gauge.max - gauge.min) * 0.72, to: gauge.min + (gauge.max - gauge.min) * 0.85, tone: "warning" },
                  { from: gauge.min + (gauge.max - gauge.min) * 0.85, to: gauge.max, tone: "alarm" },
                ]}
              />
            );
          })}
        </div>
      </section>

      <section className={styles.homeControls} aria-label="DVOR controls">
        <MopiensBeveledButton disabled={controlsDisabled} onClick={() => openDialog("changeover")}>Change Over</MopiensBeveledButton>
        <MopiensBeveledButton disabled={controlsDisabled} onClick={() => openDialog("power")}>Power and RF</MopiensBeveledButton>
        <MopiensBeveledButton disabled={controlsDisabled} onClick={() => openDialog("main")}>Main: {mainId.toUpperCase()}</MopiensBeveledButton>
        <MopiensStatusIndicator
          compact
          label={active ? `${active.toUpperCase()} on ANT` : "No TX on ANT"}
          tone={active ? "normal" : "alarm"}
        />
        <MopiensBeveledButton disabled={controlsDisabled} tone="warning" onClick={() => openDialog("reset")}>Reset</MopiensBeveledButton>
      </section>
    </div>
  );
}

function EquipmentScreen({ device, snapshot, navigate }: Dvor220MainScreenProps) {
  const groups = [
    ...DVOR220_TRANSMITTER_IDS.map((id) => ({
      id,
      label: `Transmitter ${id === "tx1" ? "1" : "2"}`,
      detail: `${snapshot.transmitters[id].designation.toUpperCase()} · ${formatDvor220Status(snapshot.transmitters[id].path)}`,
      screen: "cma-sma" as Dvor220ScreenId,
      status: snapshot.transmitters[id].status,
      units: DVOR220_TRANSMITTER_UNIT_IDS.map((unit) => ({ label: unit.toUpperCase(), status: snapshot.transmitters[id].units[unit] })),
    })),
    {
      id: "monitor",
      label: "Monitor",
      detail: snapshot.effectiveMonitorBypass ? "BYPASSED" : "AUTOMATIC",
      screen: "monitor-cha" as Dvor220ScreenId,
      status: snapshot.monitors.mon1.status,
      units: [
        { label: "MON1", status: snapshot.monitors.mon1.status },
        { label: "MON2", status: snapshot.monitors.mon2.status },
      ],
    },
    {
      id: "pdc",
      label: "PDC",
      detail: `${snapshot.pdc.antennas.filter((antenna) => antenna.status !== "normal").length} ANTENNA ALERTS`,
      screen: "pdc" as Dvor220ScreenId,
      status: snapshot.pdc.status,
      units: [
        { label: "PDC", status: snapshot.pdc.status },
        { label: "Antenna", status: snapshot.pdc.status },
      ],
    },
    {
      id: "power",
      label: "Power",
      detail: snapshot.power.source.toUpperCase(),
      screen: "power" as Dvor220ScreenId,
      status: snapshot.power.status,
      units: [
        { label: "PMU", status: snapshot.power.status },
        { label: "AC/DC", status: device.power.acAvailable ? "normal" as const : "alarm" as const },
        { label: "Battery", status: snapshot.power.batteryStatus },
        { label: "DC/DC-A", status: snapshot.power.status },
      ],
    },
  ];

  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="Equipment Status" />
      <div className={styles.equipmentFieldLayout}>
        <div className={styles.equipmentCabinetArt} role="img" aria-label="DVOR 220 equipment cabinet" />
        <div className={styles.equipmentGroups}>
          {groups.map((group) => (
            <section key={group.id} className={styles.equipmentGroup} data-tone={toneForDvor220Status(group.status)}>
              <button type="button" className={styles.equipmentGroupTitle} onClick={() => navigate(group.screen)}>
                <span className={styles.fieldSectionToggle} aria-hidden />
                <strong>{group.label}</strong>
                <small>{group.detail}</small>
              </button>
              <div className={styles.equipmentUnitRow}>
                {group.units.map((unit) => (
                  <span key={unit.label} className={styles.equipmentUnitCell} data-tone={toneForDvor220Status(unit.status)}>
                    <strong>{unit.label}</strong>
                    <small>{formatDvor220Status(unit.status)}</small>
                  </span>
                ))}
                <MopiensStatusIndicator
                  compact
                  appearance="ring"
                  label={formatDvor220Status(group.status)}
                  tone={toneForDvor220Status(group.status)}
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function PdcScreen({ device, snapshot }: Dvor220MainScreenProps) {
  const activeTransmitterId = snapshot.activeTransmitterId ?? "tx1";
  const transmitter = snapshot.transmitters[activeTransmitterId];
  const limits = device.configuration.running.transmitterLimits;
  const outputLabels = {
    carrier: "Carrier",
    usbCos: "USB COS",
    usbSin: "USB SIN",
    lsbCos: "LSB COS",
    lsbSin: "LSB SIN",
  } as const;
  const rows = Array.from({ length: 24 }, (_, index) => ({
    left: snapshot.pdc.antennas[index],
    right: snapshot.pdc.antennas[index + 24],
  }));
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="PDC Status" />
      <FieldSection title="Carrier Power Output">
        <div className={styles.fieldReadingGrid}>
          {DVOR220_RF_OUTPUT_IDS.map((output) => (
            <FieldMetricBar
              key={output}
              label={outputLabels[output]}
              source={activeTransmitterId.toUpperCase()}
              value={output === "carrier" ? snapshot.pdc.carrierPowerW : transmitter.forwardPowerW[output]}
              unit="W"
              status={output === "carrier" ? snapshot.pdc.status : transmitter.status}
              band={output === "carrier" ? limits.carrierPower : limits.sidebandPower}
            />
          ))}
        </div>
      </FieldSection>
      <FieldSection title="Carrier Antenna">
        <div className={styles.fieldReadingGrid}>
          <FieldMetricBar
            label="VSWR"
            source="Antenna"
            value={snapshot.pdc.carrierVswr}
            unit=":1"
            status={snapshot.pdc.status}
            band={{
              lowerAlarm: null,
              lowerWarning: null,
              nominal: 1,
              upperWarning: limits.vswrUpperWarning,
              upperAlarm: limits.vswrUpperAlarm,
              severity: "primary",
            }}
          />
        </div>
      </FieldSection>
      <FieldSection title="Sideband Antenna" defaultOpen={false}>
        <MopiensTable
          caption="PDC 48 sideband antenna measurements"
          rows={rows}
          dense
          getRowId={(row) => `${row.left.antenna}-${row.right.antenna}`}
          rowTone={(row) => toneForDvor220Status(row.left.status === "normal" ? row.right.status : row.left.status)}
          columns={[
            { id: "left-no", label: "Antenna", render: (row) => `#${row.left.antenna}` },
            { id: "left-usb", label: "VSWR USB", align: "right", render: (row) => `${row.left.usbVswr.toFixed(2)}:1` },
            { id: "left-lsb", label: "VSWR LSB", align: "right", render: (row) => `${row.left.lsbVswr.toFixed(2)}:1` },
            { id: "left-phase", label: "Phase", align: "right", render: (row) => `${row.left.phaseDeg.toFixed(1)}°` },
            { id: "right-no", label: "Antenna", render: (row) => `#${row.right.antenna}` },
            { id: "right-usb", label: "VSWR USB", align: "right", render: (row) => `${row.right.usbVswr.toFixed(2)}:1` },
            { id: "right-lsb", label: "VSWR LSB", align: "right", render: (row) => `${row.right.lsbVswr.toFixed(2)}:1` },
            { id: "right-phase", label: "Phase", align: "right", render: (row) => `${row.right.phaseDeg.toFixed(1)}°` },
          ]}
        />
      </FieldSection>
    </div>
  );
}

function AmplifierScreen({ device, snapshot }: Dvor220MainScreenProps) {
  const outputLabels = {
    carrier: "CMA",
    usbCos: "SMA USB COS",
    usbSin: "SMA USB SIN",
    lsbCos: "SMA LSB COS",
    lsbSin: "SMA LSB SIN",
  } as const;
  const thermalRows = [
    { id: "cma" as const, label: "CMA" },
    { id: "usb" as const, label: "SMA USB" },
    { id: "lsb" as const, label: "SMA LSB" },
  ];
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="CMA SMA Status" />
      <FieldSection title="CMA/SMA Power Output">
        <div className={styles.fieldReadingMatrix}>
          {DVOR220_RF_OUTPUT_IDS.flatMap((output) => DVOR220_TRANSMITTER_IDS.map((transmitterId) => {
            const transmitter = snapshot.transmitters[transmitterId];
            const unitStatus = output === "carrier"
              ? transmitter.units.cma
              : output === "usbCos" || output === "usbSin"
                ? transmitter.units.smaUsb
                : transmitter.units.smaLsb;
            return (
              <FieldMetricBar
                key={`${output}-${transmitterId}`}
                label={outputLabels[output]}
                source={transmitterId.toUpperCase()}
                value={transmitter.forwardPowerW[output]}
                unit="W"
                status={unitStatus}
                band={output === "carrier" ? device.configuration.running.transmitterLimits.carrierPower : device.configuration.running.transmitterLimits.sidebandPower}
              />
            );
          }))}
        </div>
      </FieldSection>
      <FieldSection title="Thermal Status">
        <div className={styles.fieldReadingMatrix}>
          {thermalRows.flatMap((row) => DVOR220_TRANSMITTER_IDS.map((transmitterId) => {
            const transmitter = snapshot.transmitters[transmitterId];
            const thermal = device.configuration.running.thermal[transmitterId];
            const status = row.id === "cma" ? transmitter.units.cma : row.id === "usb" ? transmitter.units.smaUsb : transmitter.units.smaLsb;
            return (
              <FieldMetricBar
                key={`${row.id}-${transmitterId}`}
                label={row.label}
                source={transmitterId.toUpperCase()}
                value={transmitter.temperaturesC[row.id]}
                unit="°C"
                status={status}
                band={{
                  lowerAlarm: null,
                  lowerWarning: null,
                  nominal: thermal.fanStopC,
                  upperWarning: thermal.shutdownC[row.id] - 5,
                  upperAlarm: thermal.shutdownC[row.id],
                  severity: "primary",
                }}
              />
            );
          }))}
        </div>
      </FieldSection>
    </div>
  );
}

function SynScreen({ device, snapshot }: Dvor220MainScreenProps) {
  const outputLabels = {
    carrier: "Carrier",
    usbCos: "USB COS",
    usbSin: "USB SIN",
    lsbCos: "LSB COS",
    lsbSin: "LSB SIN",
  } as const;
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="SYN Status" />
      <FieldSection title="Frequency">
        <div className={styles.fieldReadingMatrix}>
          {DVOR220_RF_OUTPUT_IDS.flatMap((output) => DVOR220_TRANSMITTER_IDS.map((transmitterId) => {
            const transmitter = snapshot.transmitters[transmitterId];
            const frequency = transmitter.frequencies[output];
            const carrierFrequency = device.configuration.running.station.frequencyMHz;
            const nominalFrequency = output === "carrier"
              ? carrierFrequency
              : output === "usbCos" || output === "usbSin"
                ? carrierFrequency + 0.00996
                : carrierFrequency - 0.00996;
            const tolerance = output === "carrier" ? 0.001 : 0.0001;
            return (
              <FieldMetricBar
                key={`${output}-${transmitterId}`}
                label={outputLabels[output]}
                source={transmitterId.toUpperCase()}
                value={frequency}
                unit="MHz"
                status={transmitter.rfOutputs[output] ? transmitter.units.syn : "off"}
                band={{
                  lowerAlarm: nominalFrequency - tolerance * 2,
                  lowerWarning: nominalFrequency - tolerance,
                  nominal: nominalFrequency,
                  upperWarning: nominalFrequency + tolerance,
                  upperAlarm: nominalFrequency + tolerance * 2,
                  severity: "primary",
                }}
              />
            );
          }))}
        </div>
      </FieldSection>
    </div>
  );
}

function MonitorScreen({ screenId, device, snapshot }: Dvor220MainScreenProps) {
  const channelId = channelByScreen[screenId] ?? "cha";
  const configuration = device.configuration.running.monitor.channels[channelId];
  const mon1Channel = snapshot.monitors.mon1.channels[channelId];
  const mon2Channel = snapshot.monitors.mon2.channels[channelId];
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title={`${DVOR220_SCREEN_LABELS[screenId]} Readings`} />
      <div className={styles.inlineIndicators}>
        <MopiensStatusIndicator label="MON1" detail={mon1Channel.stabilizing ? `Stabilizing ${mon1Channel.sampleCount}/${mon1Channel.requiredSamples}` : formatDvor220Status(mon1Channel.status)} tone={toneForDvor220Status(mon1Channel.status)} />
        <MopiensStatusIndicator label="MON2" detail={mon2Channel.stabilizing ? `Stabilizing ${mon2Channel.sampleCount}/${mon2Channel.requiredSamples}` : formatDvor220Status(mon2Channel.status)} tone={toneForDvor220Status(mon2Channel.status)} />
        <span className={styles.monitorChannelMeta}>{configuration.type} · Ref {configuration.referenceAzimuthDeg.toFixed(2)}° · Executive {configuration.executiveAction ? "ON" : "OFF"}</span>
      </div>
      {monitorGroups.map((group) => (
        <FieldSection key={group.id} title={group.title} defaultOpen={group.defaultOpen}>
          <div className={styles.monitorReadingRows}>
            {group.parameters.map((parameter) => (
              <div key={parameter} className={styles.monitorReadingPair}>
                <FieldReadingBar
                  label={parameterLabels[parameter]}
                  source="MON1"
                  reading={mon1Channel.readings[parameter]}
                  band={configuration.limits[parameter]}
                />
                <FieldReadingBar
                  label={parameterLabels[parameter]}
                  source="MON2"
                  reading={mon2Channel.readings[parameter]}
                  band={configuration.limits[parameter]}
                />
              </div>
            ))}
          </div>
        </FieldSection>
      ))}
    </div>
  );
}

function MonitorSelfTestScreen({ snapshot }: Dvor220MainScreenProps) {
  const selfTestRows = (monitorId: "mon1" | "mon2") => {
    const channel = snapshot.monitors[monitorId].channels.cha;
    const bearing = channel.readings.bearingError.value;
    const am30 = channel.readings.am30Hz.value;
    const am9960 = channel.readings.am9960Hz.value;
    const fmIndex = channel.readings.fmIndex.value;
    const result = channel.stabilizing ? "Stabilizing" : channel.primaryAlarm ? "Attention" : "Passed";
    return [
      { id: "normal", test: "Normal", bearing, am30, am9960, fmIndex, result },
      { id: "az-plus", test: "Azimuth +1°", bearing: bearing + 1, am30, am9960, fmIndex, result },
      { id: "az-minus", test: "Azimuth -1°", bearing: bearing - 1, am30, am9960, fmIndex, result },
      { id: "am30-plus", test: "AM30Hz +2.5%", bearing, am30: am30 + 2.5, am9960, fmIndex, result },
      { id: "am30-minus", test: "AM30Hz -2.5%", bearing, am30: am30 - 2.5, am9960, fmIndex, result },
      { id: "am9960-plus", test: "AM9960Hz +2.5%", bearing, am30, am9960: am9960 + 2.5, fmIndex, result },
      { id: "am9960-minus", test: "AM9960Hz -2.5%", bearing, am30, am9960: am9960 - 2.5, fmIndex, result },
      { id: "fm-plus", test: "FM Index +1", bearing, am30, am9960, fmIndex: fmIndex + 1, result },
    ];
  };
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="Monitor Self Test" />
      {(["mon1", "mon2"] as const).map((monitorId) => (
        <FieldSection key={monitorId} title={monitorId.toUpperCase()}>
          <MopiensTable
            caption={`${monitorId.toUpperCase()} monitor self-test results`}
            rows={selfTestRows(monitorId)}
            dense
            getRowId={(row) => row.id}
            columns={[
              { id: "number", label: "No.", width: "6%", align: "center", render: (_row, index) => index + 1 },
              { id: "test", label: "Test", width: "24%", render: (row) => row.test },
              { id: "bearing", label: "Bearing Error", align: "right", render: (row) => `${row.bearing.toFixed(2)}°` },
              { id: "am30", label: "AM 30Hz", align: "right", render: (row) => `${row.am30.toFixed(2)}%` },
              { id: "am9960", label: "AM 9960Hz", align: "right", render: (row) => `${row.am9960.toFixed(2)}%` },
              { id: "fm", label: "FM Index", align: "right", render: (row) => row.fmIndex.toFixed(2) },
              { id: "result", label: "Result", width: "10%", align: "center", render: (row) => <span className={styles.selfTestResult} data-result={row.result.toLowerCase()}>{row.result === "Passed" ? "OK" : row.result}</span> },
            ]}
          />
        </FieldSection>
      ))}
    </div>
  );
}

function PowerScreen({ device, snapshot }: Dvor220MainScreenProps) {
  const powered = device.power.source !== "off";
  const railStatus: Dvor220Status = powered ? "normal" : "off";
  const auxiliaryRails = [
    { id: "5v", item: "5V", voltage: powered ? 5.0 : 0, current: powered ? 0.48 : 0, maximum: 5 },
    { id: "minus5v", item: "-5V", voltage: powered ? -5.08 : 0, current: powered ? 0.30 : 0, maximum: 5 },
    { id: "15v", item: "15V", voltage: powered ? 15.07 : 0, current: powered ? 0.18 : 0, maximum: 15 },
    { id: "minus15v", item: "-15V", voltage: powered ? -15.07 : 0, current: powered ? 0.18 : 0, maximum: 15 },
  ];
  const dcRails = [
    { id: "5v", item: "5V", voltage: powered ? 5.02 : 0, current: powered ? 2.09 : 0, maximum: 5 },
    { id: "6v", item: "6V", voltage: powered ? 5.83 : 0, current: powered ? 1.78 : 0, maximum: 6 },
    { id: "18v", item: "18V", voltage: powered ? 18.05 : 0, current: powered ? 3.52 : 0, maximum: 18 },
    { id: "28v-a", item: "28V A", voltage: powered ? 28.17 : 0, current: powered ? 1.15 : 0, maximum: 28 },
    { id: "28v-b", item: "28V B", voltage: powered ? 28.13 : 0, current: powered ? 1.15 : 0, maximum: 28 },
    { id: "50v", item: "50V", voltage: powered ? 50.28 : 0, current: powered ? 2.41 : 0, maximum: 50 },
  ];
  const acDcRows = [
    { id: "acdc-a", item: "AC/DC-A", voltage: device.power.acAvailable ? 27.8 : 0, current: powered ? 5.2 : 0, temperature: 35.2 },
    { id: "acdc-b", item: "AC/DC-B", voltage: device.power.acAvailable ? 27.8 : 0, current: powered ? 5.2 : 0, temperature: 35.8 },
    { id: "acdc-c", item: "AC/DC-C", voltage: device.power.acAvailable ? 27.8 : 0, current: powered ? 6.3 : 0, temperature: 36.1 },
  ];
  const railColumns = [
    { id: "item", label: "Item", width: "18%", render: (row: (typeof auxiliaryRails)[number]) => row.item },
    { id: "graph", label: "Voltage", width: "38%", render: (row: (typeof auxiliaryRails)[number]) => <PowerRailBar value={row.voltage} maximum={row.maximum} /> },
    { id: "voltage", label: "Voltage (V)", align: "right" as const, render: (row: (typeof auxiliaryRails)[number]) => row.voltage.toFixed(2) },
    { id: "current", label: "Current (A)", align: "right" as const, render: (row: (typeof auxiliaryRails)[number]) => row.current.toFixed(2) },
  ];
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="Power Supply" />
      <FieldSection title="DC/DC-A">
        <MopiensTable
          caption="Auxiliary DC/DC readings"
          rows={auxiliaryRails}
          dense
          getRowId={(row) => row.id}
          rowTone={() => toneForDvor220Status(railStatus)}
          columns={railColumns}
        />
      </FieldSection>
      <FieldSection title="DC/DC">
        <MopiensTable
          caption="Main DC/DC readings"
          rows={dcRails}
          dense
          getRowId={(row) => row.id}
          rowTone={() => toneForDvor220Status(railStatus)}
          columns={railColumns}
        />
      </FieldSection>
      <FieldSection title="AC/DC">
        <MopiensTable
          caption="AC/DC module readings"
          rows={acDcRows}
          dense
          getRowId={(row) => row.id}
          rowTone={() => device.power.acAvailable ? "normal" : "alarm"}
          columns={[
            { id: "item", label: "Item", render: (row) => row.item },
            { id: "voltage", label: "Voltage (V)", align: "right", render: (row) => row.voltage.toFixed(1) },
            { id: "current", label: "Current (A)", align: "right", render: (row) => row.current.toFixed(1) },
            { id: "temperature", label: "Temperature (°C)", align: "right", render: (row) => row.temperature.toFixed(1) },
            { id: "status", label: "Status", width: "18%", render: () => device.power.acAvailable ? "Normal" : "AC failure" },
          ]}
        />
      </FieldSection>
      {device.configuration.running.optionalUnits.battery ? (
        <FieldSection title="Battery">
          <MopiensTable
            caption="Backup battery readings"
            rows={[{ id: "battery", item: "Battery Bank", voltage: snapshot.power.batteryVoltageV, current: device.power.batteryCurrentA, temperature: device.power.batteryTemperatureC }]}
            dense
            getRowId={(row) => row.id}
            rowTone={() => toneForDvor220Status(snapshot.power.batteryStatus)}
            columns={[
              { id: "item", label: "Item", render: (row) => row.item },
              { id: "voltage", label: "Voltage (V)", align: "right", render: (row) => row.voltage.toFixed(2) },
              { id: "current", label: "Current (A)", align: "right", render: (row) => row.current.toFixed(2) },
              { id: "temperature", label: "Temperature (°C)", align: "right", render: (row) => row.temperature.toFixed(1) },
              { id: "status", label: "Status", render: () => `${formatDvor220Status(snapshot.power.batteryStatus)} · ${snapshot.power.batteryRemainingMinutes} min` },
            ]}
          />
        </FieldSection>
      ) : null}
    </div>
  );
}

function EnvironmentScreen({ device }: Dvor220MainScreenProps) {
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="Environmental Status" />
      <FieldSection title="Environmental Sensor">
        <div className={styles.environmentSensorPanel}>
          <div className={styles.smokeSensor} data-alarm={device.environment.smoke}>
            <span className={styles.smokeSensorBody} aria-hidden />
            <strong>Smoke</strong>
            <small>{device.environment.smoke ? "DETECTED" : "CLEAR"}</small>
          </div>
          <dl className={styles.environmentReadouts}>
            <div data-tone={device.environment.temperatureC >= 40 ? "warning" : "normal"}>
              <dt>Temperature</dt>
              <dd>{device.environment.temperatureC.toFixed(1)} <small>°C</small></dd>
            </div>
            <div data-tone={device.environment.intrusion ? "alarm" : "normal"}>
              <dt>Intrusion</dt>
              <dd>{device.environment.intrusion ? "OPEN" : "SECURE"}</dd>
            </div>
          </dl>
        </div>
      </FieldSection>
      <FieldSection title="Analog Input">
        <InputSignalTable
          caption="Environmental analog inputs"
          prefix="AI"
          values={device.environment.analogInputsV}
          formatValue={(value) => `${Number(value).toFixed(1)}V`}
        />
      </FieldSection>
      <FieldSection title="Digital Input">
        <InputSignalTable
          caption="Environmental digital inputs"
          prefix="DI"
          values={device.environment.digitalInputs}
          formatValue={(value) => value ? "1" : "0"}
        />
      </FieldSection>
      <FieldSection title="Expansion Digital Input">
        <InputSignalTable
          caption="Environmental expansion digital inputs"
          prefix="EI"
          values={device.environment.expansionDigitalInputs}
          formatValue={(value) => value ? "1" : "0"}
        />
      </FieldSection>
    </div>
  );
}

export function Dvor220MainScreen(props: Dvor220MainScreenProps) {
  if (props.screenId === "home") return <HomeScreen {...props} />;
  if (props.screenId === "equipment") return <EquipmentScreen {...props} />;
  if (props.screenId === "pdc") return <PdcScreen {...props} />;
  if (props.screenId === "cma-sma") return <AmplifierScreen {...props} />;
  if (props.screenId === "syn") return <SynScreen {...props} />;
  if (channelByScreen[props.screenId]) return <MonitorScreen {...props} />;
  if (props.screenId === "monitor-self-test") return <MonitorSelfTestScreen {...props} />;
  if (props.screenId === "power") return <PowerScreen {...props} />;
  return <EnvironmentScreen {...props} />;
}
