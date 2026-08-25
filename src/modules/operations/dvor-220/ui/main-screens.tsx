"use client";

import {
  MopiensBeveledButton,
  MopiensGauge,
  MopiensLimitGrid,
  MopiensPropertyGrid,
  MopiensStatusIndicator,
  MopiensTable,
  type MopiensVisualTone,
} from "@/modules/operations/mopiens-pmdt";
import {
  DVOR220_MONITOR_PARAMETERS,
  DVOR220_RF_OUTPUT_IDS,
  DVOR220_TRANSMITTER_IDS,
  DVOR220_TRANSMITTER_UNIT_IDS,
  type Dvor220DeviceState,
  type Dvor220MonitorChannelId,
  type Dvor220MonitorParameter,
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

function EquipmentScreen({ snapshot, navigate }: Dvor220MainScreenProps) {
  const rows = [
    ...DVOR220_TRANSMITTER_IDS.map((id) => ({
      id,
      equipment: id.toUpperCase(),
      route: `${snapshot.transmitters[id].path}, ${snapshot.transmitters[id].designation}`,
      detail: DVOR220_TRANSMITTER_UNIT_IDS.map((unit) => `${unit.toUpperCase()}: ${snapshot.transmitters[id].units[unit]}`).join(" | "),
      status: snapshot.transmitters[id].status,
      screen: "equipment" as Dvor220ScreenId,
    })),
    {
      id: "monitors",
      equipment: "Monitor",
      route: snapshot.effectiveMonitorBypass ? "Bypassed" : "Automatic",
      detail: `MON1: ${snapshot.monitors.mon1.status} | MON2: ${snapshot.monitors.mon2.status}`,
      status: snapshot.monitors.mon1.status,
      screen: "monitor-cha" as Dvor220ScreenId,
    },
    {
      id: "pdc",
      equipment: "PDC",
      route: "RF distribution and antenna",
      detail: `${snapshot.pdc.antennas.filter((antenna) => antenna.status !== "normal").length} antenna alerts`,
      status: snapshot.pdc.status,
      screen: "pdc" as Dvor220ScreenId,
    },
    {
      id: "power",
      equipment: "Power",
      route: snapshot.power.source.toUpperCase(),
      detail: `Battery ${snapshot.power.batteryRemainingMinutes} min, ${snapshot.power.batteryVoltageV.toFixed(1)} V`,
      status: snapshot.power.status,
      screen: "power" as Dvor220ScreenId,
    },
  ];

  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="Equipment Status" detail="Live BITE summary for the complete DVOR station" />
      <div className={styles.equipmentSummary}>
        <MopiensStatusIndicator
          appearance="ring"
          label={snapshot.serviceStatus.toUpperCase()}
          detail="Overall station"
          tone={toneForDvor220Status(snapshot.serviceStatus)}
        />
        <MopiensTable
          caption="DVOR equipment summary"
          rows={rows}
          getRowId={(row) => row.id}
          rowTone={(row) => toneForDvor220Status(row.status)}
          columns={[
            { id: "equipment", label: "Equipment", width: "18%", render: (row) => <button className={styles.tableLink} type="button" onClick={() => navigate(row.screen)}>{row.equipment}</button> },
            { id: "route", label: "State / Route", width: "24%", render: (row) => row.route },
            { id: "detail", label: "BITE Detail", render: (row) => row.detail },
            { id: "status", label: "Status", width: "14%", render: (row) => formatDvor220Status(row.status) },
          ]}
        />
      </div>
    </div>
  );
}

function TransmitterScreen({ snapshot }: Dvor220MainScreenProps) {
  const rows = DVOR220_TRANSMITTER_UNIT_IDS.map((unit) => ({
    id: unit,
    unit: unit.toUpperCase(),
    tx1: snapshot.transmitters.tx1.units[unit],
    tx2: snapshot.transmitters.tx2.units[unit],
  }));
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="Transmitter Status" detail="Main designation and RF routing are independent equipment states" />
      <div className={styles.twoColumnLayout}>
        {DVOR220_TRANSMITTER_IDS.map((id) => {
          const transmitter = snapshot.transmitters[id];
          return (
            <MopiensPropertyGrid
              key={id}
              ariaLabel={`${id.toUpperCase()} summary`}
              sections={[{
                id,
                title: `${id.toUpperCase()} ${transmitter.designation.toUpperCase()}`,
                rows: [
                  { id: "route", label: "RF Route", value: formatDvor220Status(transmitter.path), tone: toneForDvor220Status(transmitter.status) },
                  { id: "power", label: "DC Power", value: transmitter.powerOn ? "On" : "Off" },
                  { id: "carrier", label: "Carrier Output", value: `${transmitter.forwardPowerW.carrier.toFixed(2)} W` },
                  { id: "usb", label: "USB COS / SIN", value: `${transmitter.forwardPowerW.usbCos.toFixed(2)} / ${transmitter.forwardPowerW.usbSin.toFixed(2)} W` },
                  { id: "lsb", label: "LSB COS / SIN", value: `${transmitter.forwardPowerW.lsbCos.toFixed(2)} / ${transmitter.forwardPowerW.lsbSin.toFixed(2)} W` },
                  { id: "temperature", label: "CMA / USB / LSB", value: `${transmitter.temperaturesC.cma.toFixed(1)} / ${transmitter.temperaturesC.usb.toFixed(1)} / ${transmitter.temperaturesC.lsb.toFixed(1)} °C` },
                  { id: "fan", label: "Cooling Fan", value: transmitter.fanOn ? "On" : "Auto standby" },
                ],
              }]}
            />
          );
        })}
      </div>
      <MopiensTable
        caption="Transmitter unit BITE"
        rows={rows}
        getRowId={(row) => row.id}
        rowTone={(row) => toneForDvor220Status(row.tx1 === "normal" ? row.tx2 : row.tx1)}
        columns={[
          { id: "unit", label: "Unit", width: "30%", render: (row) => row.unit },
          { id: "tx1", label: "TX1", render: (row) => formatDvor220Status(row.tx1) },
          { id: "tx2", label: "TX2", render: (row) => formatDvor220Status(row.tx2) },
        ]}
      />
    </div>
  );
}

function PdcScreen({ snapshot }: Dvor220MainScreenProps) {
  const rows = Array.from({ length: 24 }, (_, index) => ({
    left: snapshot.pdc.antennas[index],
    right: snapshot.pdc.antennas[index + 24],
  }));
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="PDC Status" detail={`Carrier ${snapshot.pdc.carrierPowerW.toFixed(2)} W | VSWR ${snapshot.pdc.carrierVswr.toFixed(2)}:1 | ${formatDvor220Status(snapshot.pdc.status)}`} />
      <MopiensTable
        caption="PDC 48 sideband antenna measurements"
        rows={rows}
        dense
        getRowId={(row) => `${row.left.antenna}-${row.right.antenna}`}
        rowTone={(row) => toneForDvor220Status(row.left.status === "normal" ? row.right.status : row.left.status)}
        columns={[
          { id: "left-no", label: "Antenna", render: (row) => `#${row.left.antenna}` },
          { id: "left-usb", label: "USB VSWR", align: "right", render: (row) => `${row.left.usbVswr.toFixed(2)}:1` },
          { id: "left-lsb", label: "LSB VSWR", align: "right", render: (row) => `${row.left.lsbVswr.toFixed(2)}:1` },
          { id: "left-phase", label: "Phase", align: "right", render: (row) => `${row.left.phaseDeg.toFixed(1)}°` },
          { id: "right-no", label: "Antenna", render: (row) => `#${row.right.antenna}` },
          { id: "right-usb", label: "USB VSWR", align: "right", render: (row) => `${row.right.usbVswr.toFixed(2)}:1` },
          { id: "right-lsb", label: "LSB VSWR", align: "right", render: (row) => `${row.right.lsbVswr.toFixed(2)}:1` },
          { id: "right-phase", label: "Phase", align: "right", render: (row) => `${row.right.phaseDeg.toFixed(1)}°` },
        ]}
      />
    </div>
  );
}

function AmplifierScreen({ snapshot }: Dvor220MainScreenProps) {
  const rows = DVOR220_TRANSMITTER_IDS.flatMap((transmitterId) => [
    { id: `${transmitterId}-cma`, transmitterId, unit: "CMA", temperature: snapshot.transmitters[transmitterId].temperaturesC.cma, output: snapshot.transmitters[transmitterId].forwardPowerW.carrier, status: snapshot.transmitters[transmitterId].units.cma },
    { id: `${transmitterId}-usb`, transmitterId, unit: "SMA USB", temperature: snapshot.transmitters[transmitterId].temperaturesC.usb, output: snapshot.transmitters[transmitterId].forwardPowerW.usbCos + snapshot.transmitters[transmitterId].forwardPowerW.usbSin, status: snapshot.transmitters[transmitterId].units.smaUsb },
    { id: `${transmitterId}-lsb`, transmitterId, unit: "SMA LSB", temperature: snapshot.transmitters[transmitterId].temperaturesC.lsb, output: snapshot.transmitters[transmitterId].forwardPowerW.lsbCos + snapshot.transmitters[transmitterId].forwardPowerW.lsbSin, status: snapshot.transmitters[transmitterId].units.smaLsb },
  ]);
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="CMA SMA Status" detail="Amplifier power, temperature and protection status" />
      <MopiensTable
        caption="CMA and SMA status"
        rows={rows}
        getRowId={(row) => row.id}
        rowTone={(row) => toneForDvor220Status(row.status)}
        columns={[
          { id: "tx", label: "Transmitter", render: (row) => row.transmitterId.toUpperCase() },
          { id: "unit", label: "Amplifier", render: (row) => row.unit },
          { id: "output", label: "Forward Power", align: "right", render: (row) => `${row.output.toFixed(2)} W` },
          { id: "temperature", label: "Temperature", align: "right", render: (row) => `${row.temperature.toFixed(1)} °C` },
          { id: "status", label: "Status", render: (row) => formatDvor220Status(row.status) },
        ]}
      />
    </div>
  );
}

function SynScreen({ snapshot }: Dvor220MainScreenProps) {
  const rows = DVOR220_TRANSMITTER_IDS.flatMap((transmitterId) =>
    DVOR220_RF_OUTPUT_IDS.map((output) => ({
      id: `${transmitterId}-${output}`,
      transmitterId,
      output,
      frequency: snapshot.transmitters[transmitterId].frequencies[output],
      enabled: snapshot.transmitters[transmitterId].rfOutputs[output],
      status: snapshot.transmitters[transmitterId].units.syn,
    })),
  );
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="SYN Status" detail="Direct digital synthesis and RF output frequencies" />
      <MopiensTable
        caption="Synthesizer frequencies"
        rows={rows}
        dense
        getRowId={(row) => row.id}
        rowTone={(row) => row.enabled ? toneForDvor220Status(row.status) : "inactive"}
        columns={[
          { id: "tx", label: "TX", render: (row) => row.transmitterId.toUpperCase() },
          { id: "output", label: "Output", render: (row) => row.output.toUpperCase() },
          { id: "frequency", label: "Frequency", align: "right", render: (row) => `${row.frequency.toFixed(5)} MHz` },
          { id: "enabled", label: "RF", render: (row) => row.enabled ? "On" : "Off" },
          { id: "status", label: "PLL / BIT", render: (row) => formatDvor220Status(row.status) },
        ]}
      />
    </div>
  );
}

function MonitorScreen({ screenId, device, snapshot }: Dvor220MainScreenProps) {
  const channelId = channelByScreen[screenId] ?? "cha";
  const configuration = device.configuration.running.monitor.channels[channelId];
  const mon1Channel = snapshot.monitors.mon1.channels[channelId];
  const mon2Channel = snapshot.monitors.mon2.channels[channelId];
  const rows = DVOR220_MONITOR_PARAMETERS.map((parameter) => {
    const band = configuration.limits[parameter];
    const mon1 = snapshot.monitors.mon1.channels[channelId].readings[parameter];
    const mon2 = snapshot.monitors.mon2.channels[channelId].readings[parameter];
    const worst = mon1.status === "alarm" || mon2.status === "alarm"
      ? "alarm"
      : mon1.status === "warning" || mon2.status === "warning"
        ? "warning"
        : mon1.status === "stabilizing" || mon2.status === "stabilizing"
          ? "unknown"
          : "normal";
    return {
      id: parameter,
      label: parameterLabels[parameter],
      alarmLow: band.lowerAlarm,
      warningLow: band.lowerWarning,
      nominal: band.nominal,
      value: `${mon1.value} / ${mon2.value}`,
      warningHigh: band.upperWarning,
      alarmHigh: band.upperAlarm,
      unit: mon1.unit,
      tone: toneForDvor220Status(worst),
    };
  });
  return (
    <div className={styles.screenBody}>
      <ScreenTitle
        title={DVOR220_SCREEN_LABELS[screenId]}
        detail={`${configuration.type} channel | Reference azimuth ${configuration.referenceAzimuthDeg.toFixed(2)}° | Executive ${configuration.executiveAction ? "enabled" : "disabled"}`}
      />
      <div className={styles.inlineIndicators}>
        <MopiensStatusIndicator label="MON1" detail={mon1Channel.stabilizing ? `Stabilizing ${mon1Channel.sampleCount}/${mon1Channel.requiredSamples}` : formatDvor220Status(mon1Channel.status)} tone={toneForDvor220Status(mon1Channel.status)} />
        <MopiensStatusIndicator label="MON2" detail={mon2Channel.stabilizing ? `Stabilizing ${mon2Channel.sampleCount}/${mon2Channel.requiredSamples}` : formatDvor220Status(mon2Channel.status)} tone={toneForDvor220Status(mon2Channel.status)} />
        <MopiensStatusIndicator label="Action" detail={snapshot.executiveAlarm ? "Executive alarm" : "No executive alarm"} tone={snapshot.executiveAlarm ? "alarm" : "normal"} />
      </div>
      <MopiensLimitGrid caption={`${channelId.toUpperCase()} monitor limits and readings (MON1 / MON2)`} rows={rows} />
    </div>
  );
}

function MonitorSelfTestScreen({ snapshot }: Dvor220MainScreenProps) {
  const rows = (["cha", "chb1", "chb2", "standby"] as const).map((channelId) => ({
    channelId,
    mon1: snapshot.monitors.mon1.channels[channelId].status,
    mon2: snapshot.monitors.mon2.channels[channelId].status,
    result: snapshot.monitors.mon1.channels[channelId].stabilizing || snapshot.monitors.mon2.channels[channelId].stabilizing
      ? "Stabilizing"
      : snapshot.monitors.mon1.channels[channelId].primaryAlarm || snapshot.monitors.mon2.channels[channelId].primaryAlarm
        ? "Attention"
        : "Passed",
  }));
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="Monitor Self-Test" detail="TSG integrity overview for executive and standby channels" />
      <MopiensTable
        caption="Monitor self-test results"
        rows={rows}
        getRowId={(row) => row.channelId}
        rowTone={(row) => row.result === "Passed" ? "normal" : row.result === "Stabilizing" ? "pending" : "alarm"}
        columns={[
          { id: "channel", label: "Channel", render: (row) => row.channelId.toUpperCase() },
          { id: "mon1", label: "MON1", render: (row) => formatDvor220Status(row.mon1) },
          { id: "mon2", label: "MON2", render: (row) => formatDvor220Status(row.mon2) },
          { id: "result", label: "TSG Result", render: (row) => row.result },
        ]}
      />
    </div>
  );
}

function PowerScreen({ device, snapshot }: Dvor220MainScreenProps) {
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="Power Supply" detail="PMU, AC/DC and backup battery operating values" />
      <div className={styles.twoColumnLayout}>
        <MopiensPropertyGrid
          ariaLabel="Power source"
          sections={[{
            id: "power",
            title: "PMU and AC/DC",
            rows: [
              { id: "ac", label: "AC Available", value: device.power.acAvailable ? "Yes" : "No", tone: device.power.acAvailable ? "normal" : "alarm" },
              { id: "source", label: "Active Source", value: device.power.source.toUpperCase(), tone: toneForDvor220Status(snapshot.power.status) },
              { id: "current", label: "Battery Current", value: `${device.power.batteryCurrentA.toFixed(1)} A` },
              { id: "charging", label: "Charging", value: device.power.charging ? "Yes" : "No" },
            ],
          }]}
        />
        <MopiensPropertyGrid
          ariaLabel="Battery status"
          sections={[{
            id: "battery",
            title: "Backup Battery",
            rows: [
              { id: "present", label: "Present", value: device.power.batteryPresent ? "Yes" : "No" },
              { id: "voltage", label: "Voltage", value: `${snapshot.power.batteryVoltageV.toFixed(2)} V`, tone: toneForDvor220Status(snapshot.power.batteryStatus) },
              { id: "temperature", label: "Temperature", value: `${device.power.batteryTemperatureC.toFixed(1)} °C` },
              { id: "runtime", label: "Remaining Runtime", value: `${snapshot.power.batteryRemainingMinutes} min` },
            ],
          }]}
        />
      </div>
    </div>
  );
}

function EnvironmentScreen({ device }: Dvor220MainScreenProps) {
  return (
    <div className={styles.screenBody}>
      <ScreenTitle title="Environmental" detail="Cabinet sensors and external digital inputs" />
      <div className={styles.twoColumnLayout}>
        <MopiensPropertyGrid
          ariaLabel="Environment alarms"
          sections={[{
            id: "environment",
            title: "Cabinet Environment",
            rows: [
              { id: "temperature", label: "Temperature", value: `${device.environment.temperatureC.toFixed(1)} °C`, tone: device.environment.temperatureC >= 40 ? "warning" : "normal" },
              { id: "smoke", label: "Smoke", value: device.environment.smoke ? "Detected" : "Clear", tone: device.environment.smoke ? "alarm" : "normal" },
              { id: "intrusion", label: "Intrusion", value: device.environment.intrusion ? "Detected" : "Secure", tone: device.environment.intrusion ? "alarm" : "normal" },
            ],
          }]}
        />
        <MopiensPropertyGrid
          ariaLabel="External inputs"
          sections={[{
            id: "inputs",
            title: "Analog and Digital Inputs",
            rows: [
              { id: "analog", label: "Analog Inputs", value: device.environment.analogInputsV.map((value, index) => `AI${index + 1} ${value.toFixed(1)}V`).join(" | ") },
              { id: "digital", label: "Digital Inputs", value: `${device.environment.digitalInputs.filter(Boolean).length} of ${device.environment.digitalInputs.length} active` },
              { id: "expansion", label: "Expansion Inputs", value: `${device.environment.expansionDigitalInputs.filter(Boolean).length} of ${device.environment.expansionDigitalInputs.length} active` },
            ],
          }]}
        />
      </div>
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
