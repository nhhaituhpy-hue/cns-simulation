import { getDme320ChannelAllocation } from "./channel-allocation";
import type {
  Dme320AlarmPhase,
  Dme320AlarmState,
  Dme320Fault,
  Dme320MeasurementReading,
  Dme320MonitorChannel,
  Dme320MonitorId,
  Dme320MonitorLimit,
  Dme320MonitorParameter,
  Dme320MonitorReadings,
  Dme320OverallStatus,
  Dme320SimulationState,
  Dme320TransponderId,
} from "./types";

function otherTransponder(id: Dme320TransponderId): Dme320TransponderId {
  return id === "tx1" ? "tx2" : "tx1";
}

export function getDme320AntennaTransponder(
  state: Dme320SimulationState,
): Dme320TransponderId {
  if (state.transmitters.tx1.route === "antenna") return "tx1";
  if (state.transmitters.tx2.route === "antenna") return "tx2";
  return state.mainTransponder;
}

export function getDme320ChannelSourceTransponder(
  state: Dme320SimulationState,
  channel: Dme320MonitorChannel,
): Dme320TransponderId {
  const antenna = getDme320AntennaTransponder(state);
  return channel === "executive" ? antenna : otherTransponder(antenna);
}

function hasFault(
  faults: readonly Dme320Fault[],
  kind: Dme320Fault["kind"],
  target?: Dme320Fault["target"],
): boolean {
  return faults.some(
    (fault) => fault.active && fault.kind === kind && (target === undefined || fault.target === target),
  );
}

function reading(
  value: number | string | null,
  nowMs: number,
  valid = true,
): Dme320MeasurementReading {
  return { value, valid, masked: false, updatedAtMs: nowMs };
}

function setInvalid(readings: Dme320MonitorReadings, nowMs: number): void {
  for (const parameter of Object.keys(readings) as Dme320MonitorParameter[]) {
    readings[parameter] = reading(null, nowMs, false);
  }
}

export function deriveDme320MonitorReadings(
  state: Dme320SimulationState,
  monitorId: Dme320MonitorId,
  channel: Dme320MonitorChannel,
): { sourceTransponder: Dme320TransponderId; readings: Dme320MonitorReadings } {
  const config = state.config.running;
  const allocation = getDme320ChannelAllocation(config.station.channel);
  const sourceTransponder = getDme320ChannelSourceTransponder(state, channel);
  const transmitter = state.transmitters[sourceTransponder];
  const transmitterConfig = config.transmitters[sourceTransponder];
  const nominalPower =
    config.station.powerOutputWatts * (transmitterConfig.outputPowerPercent / 100);
  const operational =
    state.power.source !== "off" &&
    transmitter.present &&
    transmitter.dcPower === "on" &&
    transmitter.rfEnabled &&
    !transmitter.shutdown &&
    !transmitter.interlocked;
  const transmissionRatePps = transmitter.identKeying === "continuous"
    ? 1_350
    : transmitter.squitterEnabled
      ? Math.max(700, config.station.minimumPulseRatePps)
      : 0;

  const readings: Dme320MonitorReadings = {
    timeDelayUs: reading(allocation.nominalDelayUs + config.station.delayOffsetUs, state.nowMs),
    replyEfficiencyPct: reading(transmitter.identKeying === "continuous" ? 0 : 98, state.nowMs),
    transmissionRatePps: reading(transmissionRatePps, state.nowMs),
    pulseRiseUs: reading(2.5, state.nowMs),
    pulseDurationUs: reading(3.5, state.nowMs),
    pulseDecayUs: reading(2.5, state.nowMs),
    pulseSpacingUs: reading(
      allocation.replySpacingUs + transmitter.spacingOffsetUs,
      state.nowMs,
    ),
    frequencyMhz: reading(allocation.replyFrequencyMhz, state.nowMs),
    peakPowerWatts: reading(nominalPower, state.nowMs),
    vswr: reading(1.15, state.nowMs),
    erpDb: reading(0, state.nowMs),
    identCode: reading(
      transmitter.identKeying === "off" ? "" : config.station.identCode,
      state.nowMs,
    ),
  };

  if (!operational) {
    readings.timeDelayUs.value = 0;
    readings.replyEfficiencyPct.value = 0;
    readings.transmissionRatePps.value = 0;
    readings.pulseRiseUs.value = 0;
    readings.pulseDurationUs.value = 0;
    readings.pulseDecayUs.value = 0;
    readings.pulseSpacingUs.value = 0;
    readings.peakPowerWatts.value = 0;
    readings.erpDb.value = -20;
    readings.identCode.value = "";
    if (!transmitter.present || transmitter.dcPower === "off") {
      setInvalid(readings, state.nowMs);
    }
  }

  if (hasFault(state.faults, "hpa-low-output", sourceTransponder)) {
    readings.peakPowerWatts.value = nominalPower * 0.4;
    readings.replyEfficiencyPct.value = 60;
    readings.erpDb.value = -4;
  }
  if (hasFault(state.faults, "rxu-sensitivity", sourceTransponder)) {
    readings.replyEfficiencyPct.value = 50;
    readings.timeDelayUs.value = allocation.nominalDelayUs + config.station.delayOffsetUs + 1.2;
  }
  if (hasFault(state.faults, "txu-failure", sourceTransponder)) {
    readings.timeDelayUs.value = 0;
    readings.replyEfficiencyPct.value = 0;
    readings.transmissionRatePps.value = 0;
    readings.pulseRiseUs.value = 0;
    readings.pulseDurationUs.value = 0;
    readings.pulseDecayUs.value = 0;
    readings.pulseSpacingUs.value = 0;
    readings.peakPowerWatts.value = 0;
    readings.erpDb.value = -20;
    readings.identCode.value = "";
  }
  if (
    hasFault(state.faults, "tcu-failure", sourceTransponder) ||
    hasFault(state.faults, "dcdc-failure", sourceTransponder)
  ) {
    setInvalid(readings, state.nowMs);
  }
  if (hasFault(state.faults, "antenna-vswr", "antenna")) {
    readings.vswr.value = 4;
    readings.erpDb.value = -4;
  }
  if (hasFault(state.faults, "rf-detector-failure", "antenna")) {
    readings.erpDb.value = -10;
  }
  if (hasFault(state.faults, "vswr-monitor-failure", "antenna")) {
    readings.vswr.value = 5;
  }
  if (hasFault(state.faults, "rfg-failure", monitorId)) {
    for (const parameter of [
      "timeDelayUs",
      "replyEfficiencyPct",
      "transmissionRatePps",
      "pulseRiseUs",
      "pulseDurationUs",
      "pulseDecayUs",
      "pulseSpacingUs",
      "identCode",
    ] as const) {
      readings[parameter].value = parameter === "identCode" ? "" : 0;
    }
  }
  if (hasFault(state.faults, "monitor-failure", monitorId)) {
    setInvalid(readings, state.nowMs);
  }

  for (const override of state.measurementOverrides) {
    if (override.monitorId !== monitorId || override.channel !== channel) continue;
    readings[override.parameter] = reading(
      override.value,
      state.nowMs,
      override.valid ?? override.value !== null,
    );
  }

  return { sourceTransponder, readings };
}

export function classifyDme320Reading(
  readingValue: Dme320MeasurementReading,
  limit: Dme320MonitorLimit,
): "normal" | "warning" | "alarm" {
  if (!readingValue.valid || readingValue.value === null) return "alarm";
  if (typeof limit.nominal === "string") {
    return String(readingValue.value).toUpperCase() === limit.nominal.toUpperCase()
      ? "normal"
      : "alarm";
  }
  if (typeof readingValue.value !== "number" || !Number.isFinite(readingValue.value)) {
    return "alarm";
  }
  if (
    (limit.alarmLow !== null && readingValue.value < limit.alarmLow) ||
    (limit.alarmHigh !== null && readingValue.value > limit.alarmHigh)
  ) {
    return "alarm";
  }
  if (
    (limit.warningLow !== null && readingValue.value < limit.warningLow) ||
    (limit.warningHigh !== null && readingValue.value > limit.warningHigh)
  ) {
    return "warning";
  }
  return "normal";
}

export function nextDme320AlarmState(
  previous: Dme320AlarmState,
  readingValue: Dme320MeasurementReading,
  limit: Dme320MonitorLimit,
  nowMs: number,
  alarmDelayOverrideMs?: number,
): Dme320AlarmState {
  const condition = classifyDme320Reading(readingValue, limit);
  let phase: Dme320AlarmPhase = condition === "alarm" ? "pending" : condition;
  let pendingSinceMs: number | null = null;
  let activeSinceMs: number | null = null;

  if (condition === "alarm") {
    const delayMs = alarmDelayOverrideMs ?? limit.alarmDelayMs;
    if (previous.phase === "active") {
      phase = "active";
      activeSinceMs = previous.activeSinceMs ?? nowMs;
    } else {
      const pendingSince = previous.phase === "pending"
        ? (previous.pendingSinceMs ?? nowMs)
        : nowMs;
      if (nowMs - pendingSince >= delayMs) {
        phase = "active";
        activeSinceMs = nowMs;
      } else {
        phase = "pending";
        pendingSinceMs = pendingSince;
      }
    }
  }

  const changed = phase !== previous.phase;
  return {
    phase,
    classification: limit.classification,
    pendingSinceMs,
    activeSinceMs,
    lastTransitionAtMs: changed ? nowMs : previous.lastTransitionAtMs,
  };
}

export function maskDme320ReadingsForErpAlarm(
  readings: Dme320MonitorReadings,
  erpPhase: Dme320AlarmPhase,
): Dme320MonitorReadings {
  if (erpPhase !== "active") return readings;
  const masked = structuredClone(readings);
  for (const parameter of Object.keys(masked) as Dme320MonitorParameter[]) {
    if (parameter === "erpDb") continue;
    masked[parameter].masked = true;
  }
  return masked;
}

export function deriveDme320OverallStatus(
  phases: readonly Dme320AlarmPhase[],
  present: boolean,
): Dme320OverallStatus {
  if (!present) return "unplugged";
  if (phases.includes("active")) return "alarm";
  if (phases.includes("pending") || phases.includes("warning")) return "warning";
  return "normal";
}
