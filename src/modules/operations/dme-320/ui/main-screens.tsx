"use client";

import type { ReactNode } from "react";
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
  DME320_MONITOR_PARAMETERS,
  type Dme320MonitorChannel,
  type Dme320MonitorId,
  type Dme320TransponderId,
} from "../domain/types";
import type { Dme320ScreenProps } from "./screen-types";
import {
  DME320_PARAMETER_LABELS,
  formatReading,
  formatStatus,
  gaugeRange,
  gaugeSegments,
  numericReading,
  toneForAlarmPhase,
  toneForBatteryStatus,
  toneForOverallStatus,
  toneForServiceStatus,
} from "./presentation";
import styles from "./dme320-ui.module.css";

const TRANSPONDER_IDS = ["tx1", "tx2"] as const;
const MONITOR_IDS = ["mon1", "mon2"] as const;

function transmitterTone(
  transmitter: Dme320ScreenProps["simulation"]["transmitters"]["tx1"],
): MopiensVisualTone {
  if (transmitter.shutdown || transmitter.interlocked) return "alarm";
  if (!transmitter.present || transmitter.dcPower === "off") return "inactive";
  if (!transmitter.rfEnabled) return "warning";
  return "normal";
}

function transmitterDetail(
  transmitterId: Dme320TransponderId,
  simulation: Dme320ScreenProps["simulation"],
): string {
  const transmitter = simulation.transmitters[transmitterId];
  const role = simulation.mainTransponder === transmitterId ? "Main" : "Standby";
  if (!transmitter.present) return `${role}, not present`;
  if (transmitter.shutdown) return `${role}, shutdown`;
  if (transmitter.dcPower === "off") return `${role}, DC off`;
  return `${role}, ${transmitter.route === "antenna" ? "on antenna" : "on load"}, RF ${
    transmitter.rfEnabled ? "enabled" : "disabled"
  }`;
}

function monitorTone(
  simulation: Dme320ScreenProps["simulation"],
  monitorId: Dme320MonitorId,
): MopiensVisualTone {
  const monitor = simulation.monitors[monitorId];
  if (!monitor.present) return "inactive";
  if (monitor.hardwareFault) return "alarm";
  if (monitor.mode === "bypass") return "warning";
  const statuses = Object.values(monitor.channels).map((channel) => channel.overallStatus);
  if (statuses.includes("alarm")) return "alarm";
  if (statuses.includes("warning")) return "warning";
  return "normal";
}

function StatusHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.screenHeader}>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {actions ? <div className={styles.actionRow}>{actions}</div> : null}
    </header>
  );
}

export function Dme320MainScreen(props: Dme320ScreenProps) {
  if (props.screenId === "home") return <HomeScreen {...props} />;
  if (props.screenId === "equipment") return <EquipmentScreen {...props} />;
  if (props.screenId === "transponder") return <TransponderScreen {...props} />;
  if (props.screenId === "monitor-executive") {
    return <MonitorReadingsScreen {...props} channel="executive" />;
  }
  if (props.screenId === "monitor-standby") {
    return <MonitorReadingsScreen {...props} channel="standby" />;
  }
  if (props.screenId === "monitor-self-test") return <MonitorSelfTestScreen {...props} />;
  if (props.screenId === "power") return <PowerScreen {...props} />;
  return <EnvironmentScreen {...props} />;
}

function HomeScreen({ simulation, navigate, openDialog }: Dme320ScreenProps) {
  const executive1 = simulation.monitors.mon1.channels.executive;
  const executive2 = simulation.monitors.mon2.channels.executive;
  const limits = simulation.config.running.monitor.limits;
  const dialParameters = ["timeDelayUs", "replyEfficiencyPct", "peakPowerWatts"] as const;

  return (
    <div className={styles.screenStack}>
      <StatusHeader
        title="MOPIENS 320 DME"
        subtitle={`${simulation.config.running.station.stationName} / RWY ${simulation.config.running.station.runwayDesignator || "N/A"}`}
        actions={
          <>
            <MopiensBeveledButton onClick={() => navigate("equipment")}>Equipment</MopiensBeveledButton>
            <MopiensBeveledButton onClick={() => navigate("monitor-executive")}>Monitor Detail</MopiensBeveledButton>
          </>
        }
      />

      <section className={styles.homeOverview} aria-label="DME system overview">
        <MopiensStatusIndicator
          appearance="ring"
          label={simulation.serviceStatus.toUpperCase()}
          detail="Service Status"
          tone={toneForServiceStatus(simulation.serviceStatus)}
        />
        <MopiensPropertyGrid
          ariaLabel="Station status"
          labelWidth="45%"
          sections={[
            {
              id: "station",
              rows: [
                {
                  id: "channel",
                  label: "Channel",
                  value: `${simulation.config.running.station.channel.number}${simulation.config.running.station.channel.suffix}`,
                },
                { id: "ident", label: "IDENT", value: simulation.config.running.station.identCode },
                { id: "power", label: "Power", value: simulation.power.source.toUpperCase() },
                {
                  id: "keylock",
                  label: "Control",
                  value: `${simulation.keylock} / ${simulation.session.origin.toUpperCase()}`,
                },
                {
                  id: "interlock",
                  label: "Interlock",
                  value: simulation.interlockActive ? "ACTIVE" : "CLEAR",
                  tone: simulation.interlockActive ? "alarm" : "normal",
                },
              ],
            },
          ]}
        />
        <div className={styles.topology} aria-label="Transponder antenna and load topology">
          <div className={styles.topologyAntenna}>ANTENNA</div>
          <div className={styles.topologyTransponders}>
            {TRANSPONDER_IDS.map((transponderId) => {
              const transmitter = simulation.transmitters[transponderId];
              return (
                <div
                  key={transponderId}
                  className={`${styles.topologyNode} ${
                    transmitter.route === "antenna" ? styles.topologyNodeAntenna : styles.topologyNodeLoad
                  }`}
                >
                  <MopiensStatusIndicator
                    compact
                    label={transponderId.toUpperCase()}
                    detail={transmitterDetail(transponderId, simulation)}
                    tone={transmitterTone(transmitter)}
                  />
                </div>
              );
            })}
          </div>
          <div className={styles.topologyLoad}>DUMMY LOAD</div>
        </div>
      </section>

      <section className={styles.monitorStrip} aria-label="Executive monitor state">
        {MONITOR_IDS.map((monitorId) => (
          <MopiensStatusIndicator
            key={monitorId}
            label={monitorId.toUpperCase()}
            detail={`${simulation.monitors[monitorId].mode.toUpperCase()} / ${formatStatus(
              simulation.monitors[monitorId].channels.executive.overallStatus,
            )}`}
            tone={monitorTone(simulation, monitorId)}
          />
        ))}
        <MopiensStatusIndicator
          label="VOTING"
          detail={`${simulation.config.running.monitor.votingLogic}, ${simulation.config.running.monitor.monitorActionDelayMs / 1000}s delay`}
          tone={simulation.monitorAction.votePendingSinceMs === null ? "normal" : "pending"}
        />
      </section>

      <section className={styles.gaugeGrid} aria-label="Executive monitor primary readings">
        {dialParameters.map((parameter) => {
          const reading1 = executive1.readings[parameter];
          const reading2 = executive2.readings[parameter];
          const value1 = numericReading(reading1.value);
          const value2 = numericReading(reading2.value);
          const range = gaugeRange(limits[parameter], value1);
          const alarm1 = executive1.alarms[parameter];
          return (
            <MopiensGauge
              key={parameter}
              label={DME320_PARAMETER_LABELS[parameter]}
              value={value1}
              secondaryValue={value2}
              min={range.min}
              max={range.max}
              unit={limits[parameter].unit}
              segments={gaugeSegments(limits[parameter], range.min, range.max)}
              tone={toneForAlarmPhase(alarm1.phase)}
              size="medium"
            />
          );
        })}
      </section>

      <section className={styles.quickControls} aria-label="Quick controls">
        <MopiensBeveledButton tone="warning" onClick={() => openDialog("changeover")}>CHOV</MopiensBeveledButton>
        <MopiensBeveledButton onClick={() => openDialog("power")}>TXP / RF</MopiensBeveledButton>
        <MopiensBeveledButton onClick={() => openDialog("main")}>MAIN</MopiensBeveledButton>
        <MopiensBeveledButton
          tone={simulation.monitors.mon1.mode === "bypass" || simulation.monitors.mon2.mode === "bypass" ? "warning" : "default"}
          onClick={() => openDialog("bypass")}
        >
          MON BYPASS
        </MopiensBeveledButton>
        <MopiensBeveledButton tone="warning" onClick={() => openDialog("reset")}>RESET</MopiensBeveledButton>
      </section>
    </div>
  );
}

function EquipmentScreen({ simulation, navigate }: Dme320ScreenProps) {
  const activeFaults = simulation.faults.filter((fault) => fault.active);
  const groupRows = [
    {
      id: "tx1",
      group: "Transponder 1",
      detail: transmitterDetail("tx1", simulation),
      tone: transmitterTone(simulation.transmitters.tx1),
      target: "transponder" as const,
    },
    {
      id: "tx2",
      group: "Transponder 2",
      detail: transmitterDetail("tx2", simulation),
      tone: transmitterTone(simulation.transmitters.tx2),
      target: "transponder" as const,
    },
    ...MONITOR_IDS.map((monitorId) => ({
      id: monitorId,
      group: monitorId.toUpperCase(),
      detail: `${simulation.monitors[monitorId].mode.toUpperCase()}, executive ${simulation.monitors[monitorId].channels.executive.overallStatus}`,
      tone: monitorTone(simulation, monitorId),
      target: "monitor-executive" as const,
    })),
    {
      id: "power",
      group: "Power",
      detail: `${simulation.power.source.toUpperCase()}, AC ${simulation.power.acAvailable ? "available" : "failed"}`,
      tone: simulation.power.source === "ac" ? ("normal" as const) : simulation.power.source === "battery" ? ("warning" as const) : ("alarm" as const),
      target: "power" as const,
    },
    {
      id: "antenna",
      group: "Antenna",
      detail: activeFaults.some((fault) => fault.target === "antenna") ? "Fault" : "Normal",
      tone: activeFaults.some((fault) => fault.target === "antenna") ? ("alarm" as const) : ("normal" as const),
      target: "monitor-executive" as const,
    },
  ];

  return (
    <div className={styles.screenStack}>
      <StatusHeader title="Equipment Status" subtitle="Consolidated state of each DME line-replaceable unit" />
      <MopiensTable
        caption="Equipment status groups"
        rows={groupRows}
        dense
        getRowId={(row) => row.id}
        rowTone={(row) => row.tone}
        columns={[
          { id: "group", label: "Equipment", width: "27%", render: (row) => <strong>{row.group}</strong> },
          {
            id: "state",
            label: "Overall Status",
            width: "24%",
            render: (row) => <MopiensStatusIndicator compact label={formatStatus(row.tone)} detail={row.detail} tone={row.tone} />,
          },
          {
            id: "faults",
            label: "Active Faults",
            render: (row) => {
              const faults = activeFaults.filter((fault) => fault.target === row.id || (row.id.startsWith("tx") && fault.target === row.id));
              return faults.length ? faults.map((fault) => formatStatus(fault.kind)).join(", ") : "None";
            },
          },
          {
            id: "open",
            label: "Detail",
            align: "right",
            width: "14%",
            render: (row) => <MopiensBeveledButton onClick={() => navigate(row.target)}>Open</MopiensBeveledButton>,
          },
        ]}
      />
    </div>
  );
}

function TransponderScreen({ simulation, openDialog }: Dme320ScreenProps) {
  return (
    <div className={styles.screenStack}>
      <StatusHeader
        title="Transponder Status"
        subtitle="TCU-reported operating state for TXP1 and TXP2"
        actions={<MopiensBeveledButton onClick={() => openDialog("power")}>Power / RF Control</MopiensBeveledButton>}
      />
      <div className={styles.twoColumnGrid}>
        {TRANSPONDER_IDS.map((transponderId) => {
          const transmitter = simulation.transmitters[transponderId];
          const config = simulation.config.running.transmitters[transponderId];
          return (
            <section key={transponderId} className={styles.statusPanel}>
              <div className={styles.panelHeading}>
                <h3>{transponderId.toUpperCase()}</h3>
                <MopiensStatusIndicator
                  compact
                  label={simulation.mainTransponder === transponderId ? "MAIN" : "STANDBY"}
                  detail={transmitterDetail(transponderId, simulation)}
                  tone={transmitterTone(transmitter)}
                />
              </div>
              <MopiensPropertyGrid
                ariaLabel={`${transponderId.toUpperCase()} state`}
                sections={[
                  {
                    id: "routing",
                    title: "Routing and Control",
                    rows: [
                      { id: "dc", label: "DC Power", value: transmitter.dcPower.toUpperCase(), tone: transmitter.dcPower === "on" ? "normal" : "inactive" },
                      { id: "rf", label: "RF Output", value: transmitter.rfEnabled ? "ENABLED" : "DISABLED", tone: transmitter.rfEnabled ? "normal" : "warning" },
                      { id: "route", label: "RF Route", value: transmitter.route === "antenna" ? "ON ANTENNA" : "ON DUMMY LOAD" },
                      { id: "interlock", label: "Interlock", value: transmitter.interlocked ? "ACTIVE" : "CLEAR", tone: transmitter.interlocked ? "alarm" : "normal" },
                      { id: "shutdown", label: "Shutdown", value: transmitter.shutdown ? "SHUTDOWN" : "NORMAL", tone: transmitter.shutdown ? "alarm" : "normal" },
                    ],
                  },
                  {
                    id: "thermal",
                    title: "TXU / FAN",
                    rows: [
                      { id: "temperature", label: "TXU Temperature", value: `${transmitter.temperatureC.toFixed(1)} °C`, tone: transmitter.temperatureC >= simulation.config.running.thermal.txuShutdownC ? "alarm" : "normal" },
                      { id: "fan", label: "Cooling Fan", value: transmitter.fanRunning ? "ON" : "OFF", tone: transmitter.fanRunning ? "info" : "inactive" },
                      { id: "present", label: "TCU Present", value: transmitter.present ? "YES" : "NO", tone: transmitter.present ? "normal" : "inactive" },
                    ],
                  },
                  {
                    id: "nominal",
                    title: "Nominal Setup",
                    rows: [
                      { id: "power", label: "Output Power", value: `${config.outputPowerPercent.toFixed(1)} %` },
                      { id: "pulse-rate", label: "Station Pulse Rate", value: config.useStationPulseRate ? "USE STATION" : "LOCAL" },
                      { id: "echo", label: "Echo Suppression", value: config.useStationEchoSuppression ? "USE STATION" : "LOCAL" },
                      { id: "ident", label: "IDENT", value: config.useStationIdent ? "USE STATION" : "LOCAL" },
                    ],
                  },
                ]}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MonitorReadingsScreen({ simulation, channel }: Dme320ScreenProps & { channel: Dme320MonitorChannel }) {
  const title = channel === "executive" ? "Executive Monitor Readings" : "Standby Monitor Readings";

  return (
    <div className={styles.screenStack}>
      <StatusHeader
        title={title}
        subtitle={channel === "executive" ? "Monitor voting inputs used for automatic station action" : "Independent standby-channel measurements"}
      />
      <div className={styles.monitorSummary}>
        {MONITOR_IDS.map((monitorId) => {
          const monitor = simulation.monitors[monitorId];
          const state = monitor.channels[channel];
          return (
            <MopiensStatusIndicator
              key={monitorId}
              label={monitorId.toUpperCase()}
              detail={`${monitor.mode.toUpperCase()} / ${formatStatus(state.overallStatus)} / source ${state.sourceTransponder.toUpperCase()}`}
              tone={toneForOverallStatus(state.overallStatus)}
            />
          );
        })}
      </div>
      <div className={styles.monitorGrid}>
        {MONITOR_IDS.map((monitorId) => {
          const channelState = simulation.monitors[monitorId].channels[channel];
          return (
            <MopiensLimitGrid
              key={monitorId}
              caption={`${monitorId.toUpperCase()} ${channel} readings`}
              rows={DME320_MONITOR_PARAMETERS.map((parameter) => {
                const reading = channelState.readings[parameter];
                const alarm = channelState.alarms[parameter];
                const limit = simulation.config.running.monitor.limits[parameter];
                return {
                  id: parameter,
                  label: DME320_PARAMETER_LABELS[parameter],
                  alarmLow: limit.alarmLow,
                  warningLow: limit.warningLow,
                  nominal: limit.nominal,
                  value: reading.masked ? "MASKED" : formatReading(reading.value),
                  warningHigh: limit.warningHigh,
                  alarmHigh: limit.alarmHigh,
                  unit: limit.unit,
                  tone: !reading.valid ? ("inactive" as const) : toneForAlarmPhase(alarm.phase),
                };
              })}
            />
          );
        })}
      </div>
    </div>
  );
}

function MonitorSelfTestScreen({ simulation }: Dme320ScreenProps) {
  const mon1 = simulation.monitors.mon1.selfTest;
  const mon2 = simulation.monitors.mon2.selfTest;
  const rows = [
    { id: "time-delay", category: "Self-Test", item: "Time Delay", mon1: mon1.timeDelayUs.toFixed(2), mon2: mon2.timeDelayUs.toFixed(2), unit: "µs", mon1Status: mon1.normalResult, mon2Status: mon2.normalResult },
    { id: "pulse-spacing", category: "Self-Test", item: "Pulse Spacing", mon1: mon1.pulseSpacingUs.toFixed(2), mon2: mon2.pulseSpacingUs.toFixed(2), unit: "µs", mon1Status: mon1.normalResult, mon2Status: mon2.normalResult },
    { id: "normal", category: "Self-Test", item: "Normal", mon1: formatStatus(mon1.normalResult), mon2: formatStatus(mon2.normalResult), unit: "", mon1Status: mon1.normalResult, mon2Status: mon2.normalResult },
    { id: "erroneous", category: "Self-Test", item: "Erroneous (+1.5 µs)", mon1: formatStatus(mon1.erroneousResult), mon2: formatStatus(mon2.erroneousResult), unit: "", mon1Status: mon1.erroneousResult, mon2Status: mon2.erroneousResult },
    { id: "pulse-rise", category: "Pulse Shape and Spacing", item: "Pulse Rise Time", mon1: mon1.pulseRiseUs.toFixed(2), mon2: mon2.pulseRiseUs.toFixed(2), unit: "µs", mon1Status: mon1.normalResult, mon2Status: mon2.normalResult },
    { id: "pulse-duration", category: "Pulse Shape and Spacing", item: "Pulse Duration", mon1: mon1.pulseDurationUs.toFixed(2), mon2: mon2.pulseDurationUs.toFixed(2), unit: "µs", mon1Status: mon1.normalResult, mon2Status: mon2.normalResult },
    { id: "pulse-decay", category: "Pulse Shape and Spacing", item: "Pulse Decay Time", mon1: mon1.pulseDecayUs.toFixed(2), mon2: mon2.pulseDecayUs.toFixed(2), unit: "µs", mon1Status: mon1.normalResult, mon2Status: mon2.normalResult },
  ];

  return (
    <div className={styles.screenStack}>
      <StatusHeader
        title="Monitor Self-Test"
        subtitle="Independent built-in self-test status"
      />
      <div className={styles.inlineNotice} role="status">
        Updated {new Date(Math.max(mon1.updatedAtMs, mon2.updatedAtMs)).toLocaleTimeString("en-GB", { hour12: false })}. Normal and intentionally erroneous interrogations are generated by the monitor BITE independently of executive monitoring.
      </div>
      <MopiensTable
        caption="Monitor self-test results"
        rows={rows}
        dense
        getRowId={(row) => row.id}
        rowTone={(row) => {
          const statuses = [row.mon1Status, row.mon2Status];
          if (statuses.includes("alarm")) return "alarm";
          if (statuses.includes("warning")) return "warning";
          if (statuses.includes("unplugged")) return "inactive";
          return "normal";
        }}
        columns={[
          { id: "category", label: "Category", width: "24%", render: (row) => row.category },
          { id: "item", label: "Item", width: "28%", render: (row) => row.item },
          { id: "mon1", label: "MON1", align: "right", render: (row) => row.mon1 },
          { id: "mon2", label: "MON2", align: "right", render: (row) => row.mon2 },
          { id: "unit", label: "Unit", width: "10%", render: (row) => row.unit },
        ]}
      />
    </div>
  );
}

function PowerScreen({ simulation, openDialog }: Dme320ScreenProps) {
  return (
    <div className={styles.screenStack}>
      <StatusHeader
        title="Power Supply"
        subtitle="AC/DC source, backup batteries, and transponder DC distribution"
        actions={<MopiensBeveledButton onClick={() => openDialog("power")}>TXP Power Control</MopiensBeveledButton>}
      />
      <div className={styles.monitorSummary}>
        <MopiensStatusIndicator
          appearance="ring"
          label={simulation.power.source.toUpperCase()}
          detail={simulation.power.acAvailable ? "AC mains available" : "AC mains failed"}
          tone={simulation.power.source === "ac" ? "normal" : simulation.power.source === "battery" ? "warning" : "alarm"}
        />
        {TRANSPONDER_IDS.map((transponderId) => (
          <MopiensStatusIndicator
            key={transponderId}
            label={`${transponderId.toUpperCase()} DC`}
            detail={simulation.transmitters[transponderId].dcPower.toUpperCase()}
            tone={simulation.transmitters[transponderId].dcPower === "on" ? "normal" : "inactive"}
          />
        ))}
      </div>
      <div className={styles.twoColumnGrid}>
        {(["battery1", "battery2"] as const).map((batteryId) => {
          const battery = simulation.power.batteries[batteryId];
          const config = simulation.config.running.battery;
          return (
            <section key={batteryId} className={styles.statusPanel}>
              <div className={styles.panelHeading}>
                <h3>{batteryId === "battery1" ? "BAT1" : "BAT2"}</h3>
                <MopiensStatusIndicator compact label={battery.status.toUpperCase()} detail={battery.charging ? "Charging" : "Discharging"} tone={toneForBatteryStatus(battery.status)} />
              </div>
              <div className={styles.batteryGauges}>
                <MopiensGauge
                  label="Battery Voltage"
                  value={battery.voltage}
                  min={config.cutoffVoltage}
                  max={config.fullyChargedVoltage + 1}
                  unit="V"
                  tone={toneForBatteryStatus(battery.status)}
                  size="small"
                />
                <MopiensGauge
                  label="Battery Temperature"
                  value={battery.temperatureC}
                  min={0}
                  max={Math.max(60, config.alarmTemperatureC + 5)}
                  unit="°C"
                  tone={battery.temperatureC >= config.alarmTemperatureC ? "alarm" : battery.temperatureC >= config.warningTemperatureC ? "warning" : "normal"}
                  size="small"
                />
              </div>
              <MopiensPropertyGrid
                ariaLabel={`${batteryId} details`}
                sections={[
                  {
                    id: "battery",
                    rows: [
                      { id: "connected", label: "Connected", value: battery.connected ? "YES" : "NO", tone: battery.connected ? "normal" : "inactive" },
                      { id: "current", label: "Current", value: `${battery.currentA.toFixed(1)} A` },
                      { id: "warning", label: "Warning / Alarm", value: `${config.warningVoltage.toFixed(1)} / ${config.alarmVoltage.toFixed(1)} V` },
                      { id: "charge", label: "Charge Limit", value: `${config.chargingCurrentLimitA.toFixed(1)} A` },
                    ],
                  },
                ]}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}

function EnvironmentScreen({ simulation }: Dme320ScreenProps) {
  const environment = simulation.environment;
  return (
    <div className={styles.screenStack}>
      <StatusHeader title="Environmental Status" subtitle="Environmental Monitor Unit inputs and cabinet temperature" />
      <div className={styles.monitorSummary}>
        <MopiensStatusIndicator
          appearance="ring"
          label={environment.present ? "EMU" : "N/A"}
          detail={environment.present ? "Environmental monitor online" : "Environmental monitor not present"}
          tone={environment.present ? "normal" : "inactive"}
        />
        <MopiensStatusIndicator label="SMOKE" detail={environment.smokeDetected ? "DETECTED" : "Clear"} tone={environment.smokeDetected ? "alarm" : "normal"} />
        <MopiensStatusIndicator label="INTRUSION" detail={environment.intrusionDetected ? "DETECTED" : "Secure"} tone={environment.intrusionDetected ? "alarm" : "normal"} />
      </div>
      <div className={styles.twoColumnGrid}>
        <MopiensPropertyGrid
          ariaLabel="Environmental analogue readings"
          sections={[
            {
              id: "environment",
              title: "EMU Readings",
              rows: [
                { id: "temperature", label: "Cabinet Temperature", value: `${environment.temperatureC.toFixed(1)} °C` },
                ...environment.analogInputsV.map((value, index) => ({ id: `analog-${index}`, label: `Analog Input ${index + 1}`, value: `${value.toFixed(2)} V` })),
              ],
            },
          ]}
        />
        <MopiensPropertyGrid
          ariaLabel="Environmental digital input and output states"
          sections={[
            {
              id: "digital-inputs",
              title: "Digital Inputs",
              rows: environment.digitalInputs.map((active, index) => ({ id: `di-${index}`, label: `Digital Input ${index + 1}`, value: active ? "ACTIVE" : "NORMAL", tone: active ? ("warning" as const) : ("normal" as const) })),
            },
            {
              id: "expansion-inputs",
              title: "Expansion Inputs",
              rows: environment.expansionDigitalInputs.map((active, index) => ({ id: `exp-${index}`, label: `Expansion Input ${index + 1}`, value: active ? "ACTIVE" : "NORMAL", tone: active ? ("warning" as const) : ("normal" as const) })),
            },
            {
              id: "digital-outputs",
              title: "Digital Outputs",
              rows: environment.digitalOutputs.map((active, index) => ({ id: `do-${index}`, label: `Digital Output ${index + 1}`, value: active ? "ON" : "OFF", tone: active ? ("info" as const) : ("inactive" as const) })),
            },
          ]}
        />
      </div>
    </div>
  );
}

export { monitorTone, transmitterDetail, transmitterTone };
