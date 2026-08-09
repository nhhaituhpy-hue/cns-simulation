import { cloneDvor220 } from "./defaults";
import { hasDvor220ControlOwnership, isDvor220MonitorEffectivelyBypassed } from "./permissions";
import {
  DVOR220_MONITOR_CHANNEL_IDS,
  DVOR220_MONITOR_IDS,
  DVOR220_MONITOR_PARAMETERS,
  DVOR220_RF_OUTPUT_IDS,
  DVOR220_TRANSMITTER_IDS,
  DVOR220_TRANSMITTER_UNIT_IDS,
  type Dvor220AlarmBand,
  type Dvor220AntennaSnapshot,
  type Dvor220DeviceState,
  type Dvor220HistoryFilter,
  type Dvor220LogCategory,
  type Dvor220LogEntry,
  type Dvor220LogSource,
  type Dvor220MonitorChannelId,
  type Dvor220MonitorChannelSnapshot,
  type Dvor220MonitorId,
  type Dvor220MonitorParameter,
  type Dvor220MonitorSnapshot,
  type Dvor220ParameterReading,
  type Dvor220RfOutputId,
  type Dvor220Snapshot,
  type Dvor220Status,
  type Dvor220TransmitterId,
  type Dvor220TransmitterSnapshot,
  type Dvor220TransmitterUnitId,
} from "./types";
import { validateDvor220Configuration } from "./validation";

const GROUND_CHECK_DURATION_MS = 5_000;
const RESET_LOCK_MS = 20_000;
const MAX_HISTORY_ROWS = 10_000;

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function activeTransmitterId(state: Dvor220DeviceState): Dvor220TransmitterId | null {
  return DVOR220_TRANSMITTER_IDS.find(
    (id) => state.transmitters[id].path === "antenna" && state.transmitters[id].powerOn,
  ) ?? null;
}

function standbyTransmitterId(state: Dvor220DeviceState): Dvor220TransmitterId | null {
  const active = activeTransmitterId(state);
  return DVOR220_TRANSMITTER_IDS.find((id) => id !== active) ?? null;
}

function getFault<TKind extends Dvor220DeviceState["faults"][number]["kind"]>(
  state: Dvor220DeviceState,
  kind: TKind,
  predicate: (fault: Extract<Dvor220DeviceState["faults"][number], { kind: TKind }>) => boolean,
): Extract<Dvor220DeviceState["faults"][number], { kind: TKind }> | undefined {
  return state.faults.find(
    (fault): fault is Extract<Dvor220DeviceState["faults"][number], { kind: TKind }> =>
      fault.kind === kind && predicate(fault as Extract<Dvor220DeviceState["faults"][number], { kind: TKind }>),
  );
}

function shiftedCarrierBand(band: Dvor220AlarmBand, frequencyMHz: number): Dvor220AlarmBand {
  const offset = frequencyMHz - band.nominal;
  return {
    ...band,
    lowerAlarm: band.lowerAlarm === null ? null : band.lowerAlarm + offset,
    lowerWarning: band.lowerWarning === null ? null : band.lowerWarning + offset,
    nominal: frequencyMHz,
    upperWarning: band.upperWarning === null ? null : band.upperWarning + offset,
    upperAlarm: band.upperAlarm === null ? null : band.upperAlarm + offset,
  };
}

export function classifyDvor220Reading(
  value: number,
  band: Dvor220AlarmBand,
): "normal" | "warning" | "alarm" {
  if (
    (band.lowerAlarm !== null && value <= band.lowerAlarm) ||
    (band.upperAlarm !== null && value >= band.upperAlarm)
  ) return "alarm";
  if (
    (band.lowerWarning !== null && value < band.lowerWarning) ||
    (band.upperWarning !== null && value > band.upperWarning)
  ) return "warning";
  return "normal";
}

function aggregateStatus(statuses: readonly Dvor220Status[]): Dvor220Status {
  if (statuses.includes("fault")) return "fault";
  if (statuses.includes("alarm")) return "alarm";
  if (statuses.includes("warning")) return "warning";
  if (statuses.includes("unplugged")) return "unplugged";
  if (statuses.includes("unknown")) return "unknown";
  if (statuses.every((status) => status === "off" || status === "not-present")) return "off";
  return "normal";
}

function transmitterUnitStatus(
  state: Dvor220DeviceState,
  transmitterId: Dvor220TransmitterId,
  unit: Dvor220TransmitterUnitId,
): Dvor220Status {
  const runtime = state.transmitters[transmitterId];
  const fault = getFault(
    state,
    "transmitter-unit",
    (item) => item.transmitterId === transmitterId && item.unit === unit,
  );
  if (fault) return fault.condition;
  if (!runtime.powerOn) return "off";
  if (unit === "cma" && (runtime.thermalTrips.cma || runtime.reverseFaultLatched)) return "alarm";
  if (unit === "smaUsb" && (runtime.thermalTrips.usb || runtime.reverseFaultLatched)) return "alarm";
  if (unit === "smaLsb" && (runtime.thermalTrips.lsb || runtime.reverseFaultLatched)) return "alarm";
  return "normal";
}

function transmitterOutputPower(
  state: Dvor220DeviceState,
  transmitterId: Dvor220TransmitterId,
  output: Dvor220RfOutputId,
): number {
  const runtime = state.transmitters[transmitterId];
  if (!runtime.powerOn || !runtime.rfOutputs[output]) return 0;
  const configuration = state.configuration.running;
  const transmitter = configuration.transmitters[transmitterId];
  const setpoint = output === "carrier"
    ? configuration.station.carrierPowerW * transmitter.carrierScalePercent / 100
    : transmitter.sidebandPowerW[output];
  const setpointFactor = state.calibration.transmitterSetpointFactors[transmitterId][output];
  const readingFactor = state.calibration.transmitterReadingFactors[transmitterId][output];
  return round(setpoint * setpointFactor * readingFactor, output === "carrier" ? 2 : 3);
}

function transmitterFrequency(
  state: Dvor220DeviceState,
  output: Dvor220RfOutputId,
): number {
  const carrier = state.configuration.running.station.frequencyMHz;
  if (output === "carrier") return carrier;
  return output.startsWith("usb") ? carrier + 0.00996 : carrier - 0.00996;
}

function buildTransmitterSnapshot(
  state: Dvor220DeviceState,
  transmitterId: Dvor220TransmitterId,
): Dvor220TransmitterSnapshot {
  const runtime = state.transmitters[transmitterId];
  const units = Object.fromEntries(
    DVOR220_TRANSMITTER_UNIT_IDS.map((unit) => [unit, transmitterUnitStatus(state, transmitterId, unit)]),
  ) as Record<Dvor220TransmitterUnitId, Dvor220Status>;
  const forwardPowerW = Object.fromEntries(
    DVOR220_RF_OUTPUT_IDS.map((output) => [output, transmitterOutputPower(state, transmitterId, output)]),
  ) as Record<Dvor220RfOutputId, number>;
  const frequencies = Object.fromEntries(
    DVOR220_RF_OUTPUT_IDS.map((output) => [output, transmitterFrequency(state, output)]),
  ) as Record<Dvor220RfOutputId, number>;
  const status = runtime.powerOn ? aggregateStatus(Object.values(units)) : "off";

  return {
    transmitterId,
    designation: runtime.designation,
    path: runtime.path,
    status,
    powerOn: runtime.powerOn,
    rfOutputs: { ...runtime.rfOutputs },
    units,
    forwardPowerW,
    frequencies,
    temperaturesC: { ...runtime.temperaturesC },
    fanOn: runtime.fanOn,
  };
}

function baseMonitorValues(
  state: Dvor220DeviceState,
  monitorId: Dvor220MonitorId,
  channelId: Dvor220MonitorChannelId,
): Record<Dvor220MonitorParameter, number> {
  const configuration = state.configuration.running;
  const monitoredTransmitterId = channelId === "standby"
    ? standbyTransmitterId(state)
    : activeTransmitterId(state);
  const transmitter = monitoredTransmitterId
    ? configuration.transmitters[monitoredTransmitterId]
    : configuration.transmitters.tx1;
  const channelIndex = DVOR220_MONITOR_CHANNEL_IDS.indexOf(channelId);
  const monitorBias = monitorId === "mon1" ? -0.02 : 0.02;
  const channelBias = channelIndex * 0.01;
  const runtime = monitoredTransmitterId ? state.transmitters[monitoredTransmitterId] : null;
  const carrierAvailable = Boolean(runtime?.powerOn && runtime.rfOutputs.carrier);
  const sidebandsAvailable = Boolean(
    runtime?.powerOn &&
    runtime.rfOutputs.usbCos &&
    runtime.rfOutputs.usbSin &&
    runtime.rfOutputs.lsbCos &&
    runtime.rfOutputs.lsbSin,
  );
  const compositeAvailable = carrierAvailable && sidebandsAvailable;
  const stationModulation = transmitter.useStationModulation;
  const stationIdent = transmitter.useStationIdent;
  const offsets = state.calibration.monitorOffsets[monitorId][channelId];
  const withOffset = (parameter: Dvor220MonitorParameter, value: number) => value + (offsets[parameter] ?? 0);

  return {
    bearingError: withOffset(
      "bearingError",
      (transmitter.useStationAzimuth ? configuration.station.azimuthOffsetDeg : transmitter.azimuthOffsetDeg) + monitorBias + channelBias,
    ),
    fmIndex: withOffset("fmIndex", compositeAvailable ? 16 + monitorBias : 0),
    am30Hz: withOffset(
      "am30Hz",
      carrierAvailable ? (stationModulation ? configuration.station.am30HzPercent : transmitter.am30HzPercent) + monitorBias : 0,
    ),
    am9960Hz: withOffset("am9960Hz", compositeAvailable ? 30 + channelBias : 0),
    ident1020Hz: withOffset(
      "ident1020Hz",
      carrierAvailable ? (stationIdent ? configuration.station.identModulationPercent : transmitter.identModulationPercent) : 0,
    ),
    rfLevel: withOffset("rfLevel", carrierAvailable ? monitorBias + channelBias : -50),
    distortion9960Hz: withOffset("distortion9960Hz", compositeAvailable ? 0.5 + channelBias : 100),
    carrierFrequency: withOffset("carrierFrequency", configuration.station.frequencyMHz + monitorBias / 10_000),
    subcarrierFrequency: withOffset(
      "subcarrierFrequency",
      compositeAvailable ? 9960 + channelIndex * 0.4 + (monitorId === "mon1" ? 0 : 0.1) : 0,
    ),
  };
}

function buildMonitorChannelSnapshot(
  state: Dvor220DeviceState,
  monitorId: Dvor220MonitorId,
  channelId: Dvor220MonitorChannelId,
  hardwareStatus: Dvor220Status,
): Dvor220MonitorChannelSnapshot {
  const channel = state.configuration.running.monitor.channels[channelId];
  const enabled = channel.type !== "disabled" && (
    channelId !== "standby" || state.configuration.running.optionalUnits.standbyMonitor
  );
  const values = baseMonitorValues(state, monitorId, channelId);
  const readings = Object.fromEntries(DVOR220_MONITOR_PARAMETERS.map((parameter) => {
    const injected = getFault(
      state,
      "monitor-parameter",
      (fault) => fault.monitorId === monitorId && fault.channelId === channelId && fault.parameter === parameter,
    );
    const value = injected?.value ?? values[parameter];
    const configuredBand = channel.limits[parameter];
    let effectiveBand = parameter === "carrierFrequency"
      ? shiftedCarrierBand(configuredBand, state.configuration.running.station.frequencyMHz)
      : configuredBand;
    if (parameter === "ident1020Hz") {
      effectiveBand = {
        ...effectiveBand,
        severity: state.configuration.running.monitor.identCodeAlarmSeverity,
      };
    }
    let status: Dvor220ParameterReading["status"];
    if (!enabled) status = "disabled";
    else if (hardwareStatus === "unplugged") status = "unplugged";
    else status = classifyDvor220Reading(value, effectiveBand);
    return [parameter, {
      value: round(value, parameter === "carrierFrequency" ? 5 : 2),
      status,
      severity: effectiveBand.severity,
      unit: parameterUnits[parameter],
    } satisfies Dvor220ParameterReading];
  })) as Record<Dvor220MonitorParameter, Dvor220ParameterReading>;
  const valuesList = Object.values(readings);
  const primaryAlarm = enabled && valuesList.some(
    (reading) => reading.status === "alarm" && reading.severity === "primary",
  );
  const secondaryAlarm = enabled && valuesList.some(
    (reading) => reading.status === "alarm" && reading.severity === "secondary",
  );
  const status: Dvor220Status = !enabled
    ? "not-present"
    : hardwareStatus === "unplugged"
      ? "unplugged"
      : primaryAlarm || secondaryAlarm
        ? "alarm"
        : valuesList.some((reading) => reading.status === "warning")
          ? "warning"
          : "normal";

  return { channelId, enabled, readings, status, primaryAlarm, secondaryAlarm };
}

function buildMonitorSnapshot(
  state: Dvor220DeviceState,
  monitorId: Dvor220MonitorId,
): Dvor220MonitorSnapshot {
  const hardwareFault = getFault(state, "monitor-hardware", (fault) => fault.monitorId === monitorId);
  const hardwareStatus: Dvor220Status = hardwareFault?.condition ?? "normal";
  const channels = Object.fromEntries(DVOR220_MONITOR_CHANNEL_IDS.map((channelId) => [
    channelId,
    buildMonitorChannelSnapshot(state, monitorId, channelId, hardwareStatus),
  ])) as Record<Dvor220MonitorChannelId, Dvor220MonitorChannelSnapshot>;
  const effectiveBypass = state.keylock === "MAINT" || state.monitors[monitorId].bypassRequested;
  const channelStatuses = Object.values(channels).map((channel) => channel.status);
  const status = effectiveBypass
    ? "bypassed"
    : hardwareStatus !== "normal"
      ? hardwareStatus
      : aggregateStatus(channelStatuses);
  const channelVote = Object.values(channels).some(
    (channel) => channel.enabled && channel.primaryAlarm && state.configuration.running.monitor.channels[channel.channelId].executiveAction,
  );
  const executiveVote = !effectiveBypass && (hardwareStatus === "fault" || hardwareStatus === "unplugged" || channelVote);

  return { monitorId, status, effectiveBypass, hardwareStatus, channels, executiveVote };
}

function buildAntennaSnapshots(state: Dvor220DeviceState): Dvor220AntennaSnapshot[] {
  const limits = state.configuration.running.transmitterLimits;
  return Array.from({ length: 48 }, (_, index) => {
    const antenna = index + 1;
    const injected = getFault(state, "antenna-vswr", (fault) => fault.antenna === antenna);
    const usbVswr = round(injected?.usbVswr ?? 1.08 + ((antenna * 7) % 20) / 100, 2);
    const lsbVswr = round(injected?.lsbVswr ?? 1.3 + ((antenna * 11) % 29) / 100, 2);
    const worst = Math.max(usbVswr, lsbVswr);
    const status = worst >= limits.vswrUpperAlarm
      ? "alarm" as const
      : worst > limits.vswrUpperWarning
        ? "warning" as const
        : "normal" as const;
    return {
      antenna,
      usbVswr,
      lsbVswr,
      phaseDeg: antenna % 2 === 0 ? 342.5 : 328,
      status,
    };
  });
}

function powerSnapshot(state: Dvor220DeviceState): Dvor220Snapshot["power"] {
  const configuration = state.configuration.running.battery;
  let batteryStatus: Dvor220Status = "normal";
  if (!state.power.batteryPresent) batteryStatus = "not-present";
  else if (
    state.power.batteryVoltageV <= configuration.voltageAlarmV ||
    state.power.batteryTemperatureC >= configuration.temperatureAlarmC
  ) batteryStatus = "alarm";
  else if (
    state.power.batteryVoltageV <= configuration.voltageWarningV ||
    state.power.batteryTemperatureC >= configuration.temperatureWarningC
  ) batteryStatus = "warning";
  const status: Dvor220Status = state.power.source === "off"
    ? "alarm"
    : state.power.source === "battery"
      ? "warning"
      : batteryStatus === "alarm" ? "alarm" : batteryStatus === "warning" ? "warning" : "normal";
  return {
    status,
    source: state.power.source,
    batteryStatus,
    batteryRemainingMinutes: Math.max(0, Math.ceil(state.power.batteryRemainingMs / 60_000)),
    batteryVoltageV: round(state.power.batteryVoltageV, 2),
  };
}

function pdcSnapshot(state: Dvor220DeviceState): Dvor220Snapshot["pdc"] {
  const fault = getFault(state, "pdc", () => true);
  const antennas = buildAntennaSnapshots(state);
  const antennaStatus = antennas.some((antenna) => antenna.status === "alarm")
    ? "alarm" as const
    : antennas.some((antenna) => antenna.status === "warning")
      ? "warning" as const
      : "normal" as const;
  return {
    status: fault?.condition ?? antennaStatus,
    carrierVswr: 1.38,
    antennas,
  };
}

function configuredCommunicationFaultIsExecutive(state: Dvor220DeviceState): boolean {
  const system = state.configuration.running.system;
  return state.faults.some((fault) => fault.kind === "communication" && (
    (fault.endpoint === "rcu" && system.shutdownOnRcuFault) ||
    (fault.endpoint === "lmi" && system.shutdownOnLmiFault) ||
    (fault.endpoint === "csp" && system.shutdownOnCspFault)
  ));
}

function activeHardwareFaultIsExecutive(
  state: Dvor220DeviceState,
  transmitters: Record<Dvor220TransmitterId, Dvor220TransmitterSnapshot>,
  pdc: Dvor220Snapshot["pdc"],
): boolean {
  const active = activeTransmitterId(state);
  if (!active) return false;
  const unitEntries = Object.entries(transmitters[active].units) as [Dvor220TransmitterUnitId, Dvor220Status][];
  const activeUnitFault = unitEntries.some(([unit, status]) => {
    if (unit === "dcdc" && state.configuration.running.monitor.dcdcAlarmSeverity === "secondary") return false;
    return status === "alarm" || status === "fault" || status === "unplugged";
  });
  return activeUnitFault || pdc.status === "alarm" || pdc.status === "fault" || pdc.status === "unplugged";
}

export function deriveDvor220Snapshot(state: Dvor220DeviceState): Dvor220Snapshot {
  const transmitters = Object.fromEntries(DVOR220_TRANSMITTER_IDS.map((id) => [
    id,
    buildTransmitterSnapshot(state, id),
  ])) as Record<Dvor220TransmitterId, Dvor220TransmitterSnapshot>;
  const monitors = Object.fromEntries(DVOR220_MONITOR_IDS.map((id) => [
    id,
    buildMonitorSnapshot(state, id),
  ])) as Record<Dvor220MonitorId, Dvor220MonitorSnapshot>;
  const pdc = pdcSnapshot(state);
  const power = powerSnapshot(state);
  const monitorVotes = DVOR220_MONITOR_IDS.map((id) => monitors[id].executiveVote);
  const monitorExecutiveAlarm = state.configuration.running.monitor.votingLogic === "AND"
    ? monitorVotes.every(Boolean)
    : monitorVotes.some(Boolean);
  const executiveAlarm = !isDvor220MonitorEffectivelyBypassed(state) && (
    monitorExecutiveAlarm ||
    activeHardwareFaultIsExecutive(state, transmitters, pdc) ||
    configuredCommunicationFaultIsExecutive(state)
  );
  const active = activeTransmitterId(state);
  const transmitterStatuses = Object.values(transmitters).map((item) => item.status);
  const monitorStatuses = Object.values(monitors).map((item) => item.status);
  let serviceStatus: Dvor220Snapshot["serviceStatus"];
  if (!active || state.power.source === "off" || state.executive.phase === "shutdown" || state.executive.phase === "shutdown-locked") {
    serviceStatus = "off";
  } else if (
    executiveAlarm || pdc.status === "alarm" || pdc.status === "fault" ||
    transmitterStatuses.some((status) => status === "alarm" || status === "fault") ||
    monitorStatuses.some((status) => status === "alarm" || status === "fault")
  ) {
    serviceStatus = "alarm";
  } else if (
    power.status === "warning" || pdc.status === "warning" ||
    transmitterStatuses.includes("warning") || monitorStatuses.includes("warning")
  ) {
    serviceStatus = "warning";
  } else {
    serviceStatus = "normal";
  }

  return {
    timestampMs: state.nowMs,
    serviceStatus,
    controlAvailable: hasDvor220ControlOwnership(state),
    effectiveMonitorBypass: isDvor220MonitorEffectivelyBypassed(state),
    activeTransmitterId: active,
    transmitters,
    monitors,
    pdc,
    power,
    executiveAlarm,
    configurationIssues: validateDvor220Configuration(state.configuration.draft),
  };
}

export function appendDvor220Log(
  state: Dvor220DeviceState,
  category: Dvor220LogCategory,
  message: string,
  source: Dvor220LogSource = "SYSTEM",
): Dvor220LogEntry {
  const entry: Dvor220LogEntry = {
    id: state.history.nextId,
    timestampMs: state.nowMs,
    category,
    source,
    userId: state.session.username ?? "SYSTEM",
    message,
  };
  state.history.nextId += 1;
  state.history.lmi.push(entry);
  if (state.connection.connected) state.history.pmdt.push(entry);
  if (state.history.lmi.length > MAX_HISTORY_ROWS) state.history.lmi.splice(0, state.history.lmi.length - MAX_HISTORY_ROWS);
  if (state.history.pmdt.length > MAX_HISTORY_ROWS) state.history.pmdt.splice(0, state.history.pmdt.length - MAX_HISTORY_ROWS);
  return entry;
}

export function filterDvor220History(
  rows: readonly Dvor220LogEntry[],
  filter: Dvor220HistoryFilter,
): Dvor220LogEntry[] {
  const query = filter.query?.trim().toLocaleLowerCase();
  return rows.filter((row) => {
    if (filter.fromMs !== undefined && row.timestampMs < filter.fromMs) return false;
    if (filter.toMs !== undefined && row.timestampMs > filter.toMs) return false;
    if (filter.categories?.length && !filter.categories.includes(row.category)) return false;
    if (query && !`${row.userId} ${row.message}`.toLocaleLowerCase().includes(query)) return false;
    return true;
  });
}

function setAllRfOutputs(state: Dvor220DeviceState, transmitterId: Dvor220TransmitterId, on: boolean) {
  for (const output of DVOR220_RF_OUTPUT_IDS) state.transmitters[transmitterId].rfOutputs[output] = on;
}

function shutdownTransmitters(
  state: Dvor220DeviceState,
  reason: string,
  lockReset: boolean,
) {
  for (const transmitterId of DVOR220_TRANSMITTER_IDS) {
    state.transmitters[transmitterId].powerOn = false;
    state.transmitters[transmitterId].path = "disconnected";
    setAllRfOutputs(state, transmitterId, false);
  }
  state.executive.phase = lockReset ? "shutdown-locked" : "shutdown";
  state.executive.pendingSinceMs = null;
  state.executive.powerOnHoldoffUntilMs = null;
  state.executive.postChangeoverUntilMs = null;
  state.executive.shutdownLockedUntilMs = lockReset ? state.nowMs + RESET_LOCK_MS : null;
  state.executive.shutdownReason = reason;
  appendDvor220Log(state, "event", `System shutdown: ${reason}`);
}

function performAutomaticChangeover(state: Dvor220DeviceState) {
  const current = activeTransmitterId(state);
  const next = DVOR220_TRANSMITTER_IDS.find((id) => id !== current) ?? null;
  if (!current || !next || state.configuration.running.station.equipmentVersion === "single") {
    shutdownTransmitters(state, "Executive alarm with no standby transmitter available", true);
    return;
  }

  const currentRuntime = state.transmitters[current];
  const nextRuntime = state.transmitters[next];
  currentRuntime.path = "load";
  currentRuntime.powerOn = false;
  setAllRfOutputs(state, current, false);
  nextRuntime.powerOn = true;
  nextRuntime.path = "antenna";
  setAllRfOutputs(state, next, state.configuration.running.station.transmitterOutputOnBoot);
  state.executive.changeoverCountSinceReset = 1;
  state.executive.changeoverFlag = true;
  state.executive.pendingSinceMs = null;
  state.executive.phase = "post-changeover-holdoff";
  state.executive.postChangeoverUntilMs = state.nowMs + state.configuration.running.monitor.postChangeoverHoldoffMs;
  appendDvor220Log(state, "event", `Automatic changeover: ${current.toUpperCase()} to ${next.toUpperCase()}`);
}

function effectiveExecutiveDelay(state: Dvor220DeviceState): number {
  if (configuredCommunicationFaultIsExecutive(state)) {
    return state.configuration.running.system.controlFaultShutdownDelayMs;
  }
  return state.configuration.running.monitor.executiveAlarmDelayMs;
}

function reconcileExecutiveMutating(state: Dvor220DeviceState) {
  if (state.executive.phase === "shutdown-locked") {
    if ((state.executive.shutdownLockedUntilMs ?? Infinity) <= state.nowMs) {
      state.executive.phase = "shutdown";
      state.executive.shutdownLockedUntilMs = null;
    }
    return;
  }
  if (state.executive.phase === "shutdown") return;
  if (state.executive.powerOnHoldoffUntilMs !== null) {
    if (state.executive.powerOnHoldoffUntilMs > state.nowMs) return;
    state.executive.powerOnHoldoffUntilMs = null;
  }
  if (state.executive.phase === "post-changeover-holdoff") {
    if ((state.executive.postChangeoverUntilMs ?? Infinity) <= state.nowMs) {
      state.executive.phase = "idle";
      state.executive.postChangeoverUntilMs = null;
    } else {
      return;
    }
  }

  const alarm = deriveDvor220Snapshot(state).executiveAlarm;
  if (state.executive.phase === "pending-changeover" || state.executive.phase === "pending-shutdown") {
    if (!alarm) {
      appendDvor220Log(state, "event", "Executive alarm cleared before the action delay elapsed");
      state.executive.phase = "idle";
      state.executive.pendingSinceMs = null;
    }
    return;
  }
  if (alarm) {
    const shutdownWithoutChangeover = configuredCommunicationFaultIsExecutive(state);
    const secondAlarm = state.executive.changeoverCountSinceReset > 0;
    state.executive.phase = shutdownWithoutChangeover || secondAlarm ? "pending-shutdown" : "pending-changeover";
    state.executive.pendingSinceMs = state.nowMs;
    appendDvor220Log(
      state,
      "alarm",
      shutdownWithoutChangeover || secondAlarm
        ? "Executive alarm pending system shutdown"
        : "Executive alarm pending transmitter changeover",
    );
  }
}

function reconcilePowerMutating(state: Dvor220DeviceState) {
  const batteryConfigured = state.configuration.running.optionalUnits.battery;
  state.power.batteryPresent = batteryConfigured && state.power.batteryPresent;
  if (state.power.acAvailable) {
    state.power.source = "ac";
    state.power.charging = state.power.batteryPresent && state.power.batteryRemainingMs < state.power.batteryCapacityMs;
    state.power.batteryCurrentA = state.power.charging
      ? state.configuration.running.battery.chargingCurrentA
      : 0;
    return;
  }
  state.power.charging = false;
  if (state.power.batteryPresent && state.power.batteryRemainingMs > 0) {
    state.power.source = "battery";
    state.power.batteryCurrentA = -40;
    return;
  }
  state.power.source = "off";
  state.power.batteryCurrentA = 0;
  if (activeTransmitterId(state)) shutdownTransmitters(state, "Power supply unavailable", false);
}

function reconcileThermalMutating(state: Dvor220DeviceState) {
  for (const transmitterId of DVOR220_TRANSMITTER_IDS) {
    const runtime = state.transmitters[transmitterId];
    const configuration = state.configuration.running.thermal[transmitterId];
    const maximumTemperature = Math.max(...Object.values(runtime.temperaturesC));
    if (configuration.fanMode === "on") runtime.fanOn = true;
    else if (configuration.fanMode === "off") runtime.fanOn = false;
    else if (!runtime.fanOn && maximumTemperature >= configuration.fanStartC) runtime.fanOn = true;
    else if (runtime.fanOn && maximumTemperature <= configuration.fanStopC) runtime.fanOn = false;

    for (const unit of ["cma", "usb", "lsb"] as const) {
      const temperature = runtime.temperaturesC[unit];
      if (!runtime.thermalTrips[unit] && temperature >= configuration.shutdownC[unit]) {
        runtime.thermalTrips[unit] = true;
        if (unit === "cma") runtime.rfOutputs.carrier = false;
        if (unit === "usb") {
          runtime.rfOutputs.usbCos = false;
          runtime.rfOutputs.usbSin = false;
        }
        if (unit === "lsb") {
          runtime.rfOutputs.lsbCos = false;
          runtime.rfOutputs.lsbSin = false;
        }
        appendDvor220Log(state, "alarm", `${transmitterId.toUpperCase()} ${unit.toUpperCase()} thermal shutdown`);
      } else if (runtime.thermalTrips[unit] && temperature <= configuration.restartC[unit]) {
        runtime.thermalTrips[unit] = false;
        if (runtime.powerOn) {
          if (unit === "cma") runtime.rfOutputs.carrier = true;
          if (unit === "usb") {
            runtime.rfOutputs.usbCos = true;
            runtime.rfOutputs.usbSin = true;
          }
          if (unit === "lsb") {
            runtime.rfOutputs.lsbCos = true;
            runtime.rfOutputs.lsbSin = true;
          }
        }
        appendDvor220Log(state, "event", `${transmitterId.toUpperCase()} ${unit.toUpperCase()} thermal restart`);
      }
    }
  }
}

function applyEnvironmentFaultsMutating(state: Dvor220DeviceState) {
  state.environment.temperatureC = 24;
  state.environment.smoke = false;
  state.environment.intrusion = false;
  for (const fault of state.faults) {
    if (fault.kind !== "environment") continue;
    if (fault.sensor === "temperature" && typeof fault.value === "number") state.environment.temperatureC = fault.value;
    if (fault.sensor === "smoke" && typeof fault.value === "boolean") state.environment.smoke = fault.value;
    if (fault.sensor === "intrusion" && typeof fault.value === "boolean") state.environment.intrusion = fault.value;
  }
}

function reconcileImmediateMutating(state: Dvor220DeviceState) {
  applyEnvironmentFaultsMutating(state);
  reconcilePowerMutating(state);
  reconcileThermalMutating(state);
  reconcileExecutiveMutating(state);
}

export function reconcileDvor220State(state: Dvor220DeviceState): Dvor220DeviceState {
  const next = cloneDvor220(state);
  reconcileImmediateMutating(next);
  return next;
}

function updateBatteryForElapsed(state: Dvor220DeviceState, elapsedMs: number) {
  if (elapsedMs <= 0 || !state.power.batteryPresent) return;
  if (state.power.source === "battery") {
    state.power.batteryRemainingMs = Math.max(0, state.power.batteryRemainingMs - elapsedMs);
  } else if (state.power.source === "ac" && state.power.charging) {
    state.power.batteryRemainingMs = Math.min(
      state.power.batteryCapacityMs,
      state.power.batteryRemainingMs + elapsedMs / 2,
    );
  }
  const ratio = state.power.batteryCapacityMs > 0
    ? clamp(state.power.batteryRemainingMs / state.power.batteryCapacityMs, 0, 1)
    : 0;
  const cutoff = state.configuration.running.battery.cutoffVoltageV;
  state.power.batteryVoltageV = round(cutoff + (26.4 - cutoff) * ratio, 2);
}

function finishGroundCheckMutating(state: Dvor220DeviceState) {
  const transmitterId = state.groundCheck.transmitterId ?? activeTransmitterId(state) ?? "tx1";
  const antennaFaultPresent = buildAntennaSnapshots(state).some((antenna) => antenna.status === "alarm");
  const transmitterBias = transmitterId === "tx1" ? 0.02 : -0.03;
  const points = Array.from({ length: 24 }, (_, index) => {
    const azimuthDeg = index * 15;
    const radians = azimuthDeg * Math.PI / 180;
    const faultContribution = antennaFaultPresent ? 1.05 * Math.sin(radians * 3) : 0;
    return {
      azimuthDeg,
      bearingErrorDeg: round(
        0.31 * Math.sin(radians) - 0.18 * Math.cos(radians * 2) + transmitterBias + faultContribution,
        2,
      ),
    };
  });
  const withinTolerance = points.every((point) => Math.abs(point.bearingErrorDeg) <= 1);
  state.groundCheck.status = withinTolerance ? "completed" : "failed";
  state.groundCheck.completesAtMs = state.nowMs;
  state.groundCheck.points = points;
  state.groundCheck.withinTolerance = withinTolerance;
  appendDvor220Log(state, withinTolerance ? "event" : "alarm", `Automatic ground error check ${withinTolerance ? "passed" : "failed"} for ${transmitterId.toUpperCase()}`);
}

function automaticLogoutMutating(state: Dvor220DeviceState) {
  if (!state.session.username) return;
  appendDvor220Log(state, "event", `Automatic logout: ${state.session.username}`);
  state.session = {
    username: null,
    level: 0,
    loggedInAtMs: null,
    lastActivityAtMs: null,
    failedLoginCount: state.session.failedLoginCount,
  };
}

function nextTimedDeadline(state: Dvor220DeviceState, targetMs: number): number {
  const deadlines = [targetMs];
  const delay = effectiveExecutiveDelay(state);
  if (
    (state.executive.phase === "pending-changeover" || state.executive.phase === "pending-shutdown") &&
    state.executive.pendingSinceMs !== null
  ) deadlines.push(state.executive.pendingSinceMs + delay);
  if (state.executive.powerOnHoldoffUntilMs !== null) {
    deadlines.push(state.executive.powerOnHoldoffUntilMs);
  }
  if (state.executive.phase === "post-changeover-holdoff" && state.executive.postChangeoverUntilMs !== null) {
    deadlines.push(state.executive.postChangeoverUntilMs);
  }
  if (state.executive.phase === "shutdown-locked" && state.executive.shutdownLockedUntilMs !== null) {
    deadlines.push(state.executive.shutdownLockedUntilMs);
  }
  if (state.groundCheck.status === "running" && state.groundCheck.completesAtMs !== null) {
    deadlines.push(state.groundCheck.completesAtMs);
  }
  const logoutMinutes = state.configuration.running.system.automaticLogoutMinutes;
  if (logoutMinutes > 0 && state.session.username && state.session.lastActivityAtMs !== null) {
    deadlines.push(state.session.lastActivityAtMs + logoutMinutes * 60_000);
  }
  if (state.power.source === "battery" && state.power.batteryRemainingMs > 0) {
    deadlines.push(state.nowMs + state.power.batteryRemainingMs);
  }
  return Math.max(state.nowMs, Math.min(...deadlines));
}

function processTimedEventsMutating(state: Dvor220DeviceState) {
  if (state.power.source === "battery" && state.power.batteryRemainingMs <= 0) {
    state.power.source = "off";
    shutdownTransmitters(state, "Backup battery exhausted", false);
  }

  if (state.groundCheck.status === "running" && (state.groundCheck.completesAtMs ?? Infinity) <= state.nowMs) {
    finishGroundCheckMutating(state);
  }

  const logoutMinutes = state.configuration.running.system.automaticLogoutMinutes;
  if (
    logoutMinutes > 0 && state.session.username && state.session.lastActivityAtMs !== null &&
    state.session.lastActivityAtMs + logoutMinutes * 60_000 <= state.nowMs
  ) automaticLogoutMutating(state);

  if (
    (state.executive.phase === "pending-changeover" || state.executive.phase === "pending-shutdown") &&
    state.executive.pendingSinceMs !== null &&
    state.executive.pendingSinceMs + effectiveExecutiveDelay(state) <= state.nowMs
  ) {
    const alarmStillActive = deriveDvor220Snapshot(state).executiveAlarm;
    if (!alarmStillActive) {
      state.executive.phase = "idle";
      state.executive.pendingSinceMs = null;
    } else if (state.executive.phase === "pending-changeover") {
      performAutomaticChangeover(state);
    } else {
      shutdownTransmitters(state, "Persistent executive alarm after transmitter changeover", true);
    }
  }

  reconcileImmediateMutating(state);
}

export function advanceDvor220Time(
  state: Dvor220DeviceState,
  elapsedMs: number,
): Dvor220DeviceState {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new Error("elapsedMs must be a finite non-negative number.");
  }
  const next = cloneDvor220(state);
  const targetMs = next.nowMs + elapsedMs;
  reconcileImmediateMutating(next);

  let guard = 0;
  while (next.nowMs < targetMs && guard < 100) {
    guard += 1;
    const deadline = nextTimedDeadline(next, targetMs);
    const slice = deadline - next.nowMs;
    updateBatteryForElapsed(next, slice);
    next.nowMs = deadline;
    processTimedEventsMutating(next);
    if (slice === 0 && next.nowMs < targetMs) {
      next.nowMs = Math.min(targetMs, next.nowMs + 1);
    }
  }
  if (guard >= 100) throw new Error("DVOR 220 time advancement exceeded its transition guard.");
  return next;
}

export function getDvor220GroundCheckDurationMs(): number {
  return GROUND_CHECK_DURATION_MS;
}

export function getDvor220ResetLockMs(): number {
  return RESET_LOCK_MS;
}
