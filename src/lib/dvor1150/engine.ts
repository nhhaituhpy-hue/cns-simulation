import {
  DVOR1150_MONITOR_IDS,
  DVOR1150_MONITOR_PARAMETERS,
  DVOR1150_TRANSMITTER_IDS,
  type Dvor1150Config,
  type Dvor1150AdRow,
  type Dvor1150EffectiveTransmitter,
  type Dvor1150IndicatorColor,
  type Dvor1150AdParameter,
  type Dvor1150MonitorId,
  type Dvor1150MonitorParameter,
  type Dvor1150MonitorResult,
  type Dvor1150ParameterStatus,
  type Dvor1150Snapshot,
  type Dvor1150TransferState,
  type Dvor1150TransmitterId,
} from "./types";
import { formatDvor1150Timestamp } from "./defaults";

const DVOR1150_REFERENCE_NOMINAL_OUTPUT_POWER = 100;

const monitorSourceReference = {
  azimuth: 359.97,
  hz30Modulation: 30,
  hz9960Modulation: 30,
  deviation: 16,
  rfLevel: 0.2,
  referenceModulation: 30,
  sboRfLevel: 47,
} as const;

const parameterLabels: Record<Dvor1150MonitorParameter, string> = {
  azimuth: "Azimuth Angle",
  hz30Modulation: "30 Hz Mod",
  hz9960Modulation: "9960 Hz Mod",
  deviation: "Deviation",
  rfLevel: "RF Level",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
}

function relativePowerDb(outputPower: number): number {
  if (outputPower <= 0) return -60;
  return clamp(10 * Math.log10(outputPower / DVOR1150_REFERENCE_NOMINAL_OUTPUT_POWER), -60, 60);
}

/**
 * Carrier-to-sideband phase tuning changes the 9960 Hz monitor response in a
 * non-linear way. A sine response preserves the nominal value at 0°, gives a
 * repeatable positive or negative variation for opposite phase directions,
 * and avoids non-deterministic training outcomes.
 */
function carrierSidebandModulationAdjustment(phaseDegrees: number): number {
  return Math.sin((phaseDegrees * Math.PI) / 180) * 0.6;
}

function normalizeAzimuth(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getStatus(value: number, band: Dvor1150Config["monitor"]["alarmLimits"][Dvor1150MonitorParameter]): Dvor1150ParameterStatus {
  if (value < band.alarmLow || value > band.alarmHigh) return "alarm";
  if (value < band.preAlarmLow || value > band.preAlarmHigh) return "warning";
  return "normal";
}

function indicatorFor(status: Dvor1150ParameterStatus): Dvor1150IndicatorColor {
  return status === "alarm" ? "red" : status === "warning" ? "yellow" : "green";
}

function effectiveTransmitter(config: Dvor1150Config, id: Dvor1150TransmitterId): Dvor1150EffectiveTransmitter {
  const transmitter = config.transmitters[id];
  const enabled = config.station.transmitterConfig === "Single Transmitter" && id === "tx2"
    ? false
    : transmitter.enabled;
  // A persisted/imported configuration can contain a contradictory route even
  // though the PMDT command path prevents it. Give On-Air precedence in the
  // derived snapshot so a transmitter can never be shown on Antenna and Load
  // at the same time.
  const onAir = enabled && transmitter.onAir;
  const outputScale = transmitter.offsets.outputPowerScale / 100;
  const sidebandScales = [
    transmitter.offsets.sideband1RfLevelScale,
    transmitter.offsets.sideband2RfLevelScale,
    transmitter.offsets.sideband3RfLevelScale,
    transmitter.offsets.sideband4RfLevelScale,
  ];
  const phaseOffsets = [
    transmitter.offsets.sideband12PhaseOffset,
    transmitter.offsets.sideband12PhaseOffset,
    transmitter.offsets.sideband34PhaseOffset,
    transmitter.offsets.sideband34PhaseOffset,
  ];
  const outputPower = enabled ? Math.max(0, transmitter.nominal.outputPower * outputScale) : 0;
  const baseSboRfLevel = enabled
    ? Math.max(0, transmitter.nominal.sboRfLevel * (outputPower / DVOR1150_REFERENCE_NOMINAL_OUTPUT_POWER))
    : 0;
  const sboRfLevel = baseSboRfLevel * average(sidebandScales) / 100;
  return {
    id,
    enabled,
    onAir,
    load: enabled && !onAir && transmitter.load,
    active: onAir,
    azimuthIndex: transmitter.nominal.azimuthIndex + transmitter.offsets.azimuthAngle,
    outputPower,
    voiceModulation: clamp(transmitter.nominal.voiceModulation * transmitter.offsets.voiceModulationScale / 100, 0, 100),
    identModulation: clamp(transmitter.nominal.identModulation * transmitter.offsets.identModulationScale / 100, 0, 100),
    referenceModulation: clamp(transmitter.nominal.referenceModulation * transmitter.offsets.referenceModulationScale / 100, 0, 100),
    sboRfLevel,
    carrierFrequency: config.station.frequencyMHz,
    lowerSidebandFrequency: config.station.frequencyMHz - 0.00996,
    upperSidebandFrequency: config.station.frequencyMHz + 0.00996,
    sidebandPower: sidebandScales.map((scale) => Math.max(0, baseSboRfLevel * (scale / 100) ** 2 / 30)),
    sidebandVswr: sidebandScales.map((scale, index) => Math.max(1, 1 + Math.abs(100 - scale) / 250 + (index + 1) * 0.01 + Math.abs(phaseOffsets[index] + transmitter.offsets.carrierSidebandPhaseOffset) / 1800)),
    identCode: transmitter.nominal.identCode,
  };
}

function chooseActiveTransmitter(
  transmitters: Record<Dvor1150TransmitterId, Dvor1150EffectiveTransmitter>,
): Dvor1150TransmitterId | null {
  return DVOR1150_TRANSMITTER_IDS.find((id) => transmitters[id].active) ?? null;
}

function isInstalledMonitor(config: Dvor1150Config, monitorId: Dvor1150MonitorId): boolean {
  return config.station.monitorConfig === "Dual Monitors" || monitorId === "mon1";
}

function monitorResult(
  config: Dvor1150Config,
  monitorId: Dvor1150MonitorId,
  active: Dvor1150EffectiveTransmitter | null,
  controlling: boolean,
): Dvor1150MonitorResult {
  const installed = isInstalledMonitor(config, monitorId);
  const offsets = config.monitor.offsets[monitorId];
  const calibration = config.monitor.calibration[monitorId].fieldDetector;
  const referenceDelta = active
    ? active.referenceModulation - monitorSourceReference.referenceModulation
    : 0;
  const sboDelta = active
    ? active.sboRfLevel - monitorSourceReference.sboRfLevel
    : 0;
  const carrierSidebandPhaseOffset = active
    ? config.transmitters[active.id].offsets.carrierSidebandPhaseOffset
    : 0;
  const carrierSidebandModulationDelta = carrierSidebandModulationAdjustment(carrierSidebandPhaseOffset);
  // Training approximation: four equal RF voltage contributions. Losing one
  // branch gives 75% of nominal modulation (30% -> 22.5%); losing all gives 0.
  // This operational response is not a manufacturer-specified transfer curve.
  const sidebandAmplitudeRatio = active
    ? average(active.sidebandPower.map((power) => Math.sqrt(Math.max(0, power) / (monitorSourceReference.sboRfLevel / 30))))
    : 0;
  const recovered9960 = Math.max(0, monitorSourceReference.hz9960Modulation + referenceDelta + carrierSidebandModulationDelta)
    * sidebandAmplitudeRatio;

  /*
   * PMDT configuration influence matrix (applied after Apply/F7):
   * - TX azimuth, reference modulation, voice modulation, output power and
   *   SBO/sideband scales form the common signal seen by both monitors.
   * - Monitor offsets are per-monitor source corrections.
   * - Field Detector offset/scale values are the final per-monitor calibration.
   * - Carrier power/scale drives SBO power and hence the four RF amplitudes.
   * - RF Level follows carrier power only, independently of sideband tuning.
   * - Carrier-to-sideband phase creates a bounded, non-linear 9960 Hz change;
   *   other TX phase offsets feed ground-check and sideband VSWR.
   * - Cabinet temperature feeds RMS temperature data; ident modulation drives
   *   the Ident monitor.
   */
  const rawValues: Record<Dvor1150MonitorParameter, number> = {
    // PMDT alarm bands are expressed around the 360° reference (for example
    // 358.00 … 362.00). Keep the monitor readout on that same continuous
    // scale; wrapping 360.00 to 0.00 would create a false alarm after a
    // small calibration offset such as +0.03°.
    azimuth: monitorSourceReference.azimuth + (active?.azimuthIndex ?? 0) + offsets.azimuth + calibration.azimuthAngleOffset,
    hz30Modulation: (monitorSourceReference.hz30Modulation + referenceDelta + offsets.hz30Modulation) * calibration.hz30ModulationScale / 100,
    hz9960Modulation: (recovered9960 + offsets.hz9960Modulation) * calibration.hz9960ModulationScale / 100,
    deviation: (monitorSourceReference.deviation + (active?.voiceModulation ?? 0) * 0.12 + sboDelta * 0.01 + offsets.deviation) * calibration.hz9960DeviationScale / 100,
    rfLevel: monitorSourceReference.rfLevel + relativePowerDb(active?.outputPower ?? 0) + offsets.rfLevel + calibration.rfLevelOffset,
  };
  const parameters = Object.fromEntries(DVOR1150_MONITOR_PARAMETERS.map((parameter) => {
    const value = rawValues[parameter];
    const limits = parameter === "azimuth"
      ? config.monitor.azimuthAlarmLimits[monitorId]
      : config.monitor.alarmLimits[parameter];
    const status = getStatus(value, limits);
    return [parameter, { value, status, indicator: indicatorFor(status) }];
  })) as Dvor1150MonitorResult["parameters"];
  const identNormal = Boolean(active && active.identCode.trim() && active.identModulation >= 2);
  const healthy = installed
    && Object.values(parameters).every((parameter) => parameter.status !== "alarm")
    && (!config.monitor.identMonitoringEnabled || identNormal)
    && Boolean(active);
  return {
    id: monitorId,
    healthy,
    controlling: installed && controlling,
    commStatus: installed ? "green" : "gray",
    parameters,
    ident: {
      value: identNormal ? "Normal" : "No Ident",
      indicator: identNormal ? "green" : "red",
    },
  };
}

function transmitterSidebarState(
  transmitter: Dvor1150EffectiveTransmitter,
  transmitterId: Dvor1150TransmitterId,
  mainId: Dvor1150TransmitterId | null,
  antennaId: Dvor1150TransmitterId | null,
): Dvor1150Snapshot["data"]["transmitters"][Dvor1150TransmitterId] {
  const operatingColor = transmitter.enabled ? "green" as const : "red" as const;
  return {
    // Main identifies the logical primary transmitter, independently from
    // the relay's current Antenna route during an automatic transfer.
    main: transmitterId === mainId ? operatingColor : "gray" as const,
    antenna: transmitterId === antennaId && transmitter.onAir ? operatingColor : "gray" as const,
    load: transmitter.load ? operatingColor : "gray" as const,
    off: !transmitter.enabled || (!transmitter.onAir && !transmitter.load) ? "red" as const : "gray" as const,
  };
}

function buildValidation(config: Dvor1150Config): Dvor1150Snapshot["validation"] {
  const validation: Dvor1150Snapshot["validation"] = [];
  if (config.station.frequencyMHz < 108 || config.station.frequencyMHz > 118) {
    validation.push({ fieldId: "station.frequencyMHz", message: "Frequency must be between 108 and 118 MHz.", severity: "error" });
  }
  for (const parameter of DVOR1150_MONITOR_PARAMETERS) {
    const band = config.monitor.alarmLimits[parameter];
    if (!(band.alarmLow < band.preAlarmLow && band.preAlarmLow <= band.nominal && band.nominal <= band.preAlarmHigh && band.preAlarmHigh < band.alarmHigh)) {
      validation.push({ fieldId: `monitor.alarmLimits.${parameter}`, message: `${parameterLabels[parameter]} limits are not ordered.`, severity: "error" });
    }
  }
  for (const monitorId of DVOR1150_MONITOR_IDS) {
    const band = config.monitor.azimuthAlarmLimits[monitorId];
    if (!(band.alarmLow < band.preAlarmLow && band.preAlarmLow <= band.nominal && band.nominal <= band.preAlarmHigh && band.preAlarmHigh < band.alarmHigh)) {
      validation.push({ fieldId: `monitor.azimuthAlarmLimits.${monitorId}`, message: `Monitor ${monitorId === "mon1" ? "1" : "2"} azimuth limits are not ordered.`, severity: "error" });
    }
  }
  for (const id of DVOR1150_TRANSMITTER_IDS) {
    const transmitter = config.transmitters[id];
    if (transmitter.enabled && transmitter.onAir && transmitter.load) {
      validation.push({
        fieldId: `transmitters.${id}`,
        message: "A transmitter cannot be On-Air and on Load at the same time.",
        severity: "warning",
      });
    }
  }
  const active = DVOR1150_TRANSMITTER_IDS.filter((id) => {
    if (config.station.transmitterConfig === "Single Transmitter" && id === "tx2") return false;
    return config.transmitters[id].enabled && config.transmitters[id].onAir;
  });
  if (active.length > 1) validation.push({ fieldId: "transmitters", message: "Only one transmitter may be on the antenna.", severity: "warning" });
  if (active.length === 0) validation.push({ fieldId: "transmitters", message: "No transmitter is on the antenna.", severity: "warning" });
  return validation;
}

const adParameterMeta: Record<Dvor1150AdParameter, { label: string; unit: string; base: number }> = {
  plus5V: { label: "+5 VDC", unit: "Volts", base: 5 },
  plus12V: { label: "+12 VDC", unit: "Volts", base: 12 },
  plus12VLogic: { label: "+12 VDC", unit: "Volts", base: 12 },
  plus28V: { label: "+28 VDC", unit: "Volts", base: 28 },
  paVoltage: { label: "PA Voltage", unit: "Volts", base: 45 },
};

function adRowsFor(
  config: Dvor1150Config,
  transmitterId: Dvor1150TransmitterId,
  transmitter: Dvor1150EffectiveTransmitter,
): Dvor1150AdRow[] {
  const outputFactor = transmitter.enabled ? transmitter.outputPower / DVOR1150_REFERENCE_NOMINAL_OUTPUT_POWER : 0;
  const values: Record<Dvor1150AdParameter, number> = {
    plus5V: 5 + (outputFactor - 1) * 0.03,
    plus12V: 12 + (outputFactor - 1) * 0.08,
    plus12VLogic: 12 + (outputFactor - 1) * -0.05,
    plus28V: 28 + (outputFactor - 1) * 0.12,
    paVoltage: 45 + (outputFactor - 1) * 2.2,
  };
  return (Object.keys(adParameterMeta) as Dvor1150AdParameter[]).map((parameter) => {
    const limits = config.rms.adLimits[transmitterId][parameter];
    return {
      parameter: adParameterMeta[parameter].label,
      low: limits.low,
      preLow: limits.preLow,
      value: values[parameter],
      preHigh: limits.preHigh,
      high: limits.high,
      unit: adParameterMeta[parameter].unit,
    };
  });
}

function temperatureRows(config: Dvor1150Config): Dvor1150AdRow[] {
  const values: Record<"exterior" | "tx1" | "tx2", number> = {
    exterior: 27,
    tx1: 18 + config.transmitters.tx1.offsets.cabinetTemperatureOffset,
    tx2: 16 + config.transmitters.tx2.offsets.cabinetTemperatureOffset,
  };
  const labels: Record<"exterior" | "tx1" | "tx2", string> = {
    exterior: "Exterior Temperature",
    tx1: "Transmitter 1 Temperature",
    tx2: "Transmitter 2 Temperature",
  };
  return (Object.keys(labels) as Array<"exterior" | "tx1" | "tx2">).map((parameter) => {
    const limits = config.rms.adLimits.temperature[parameter];
    return {
      parameter: labels[parameter],
      low: limits.low,
      preLow: limits.preLow,
      value: values[parameter],
      preHigh: limits.preHigh,
      high: limits.high,
      unit: "°C",
    };
  });
}

function buildGroundCheck(config: Dvor1150Config, active: Dvor1150EffectiveTransmitter | null): Dvor1150Snapshot["data"]["groundCheck"] {
  const offsets = active ? config.transmitters[active.id].offsets : null;
  const quadrantal = {
    amplitude: offsets ? (offsets.sideband12PhaseOffset - offsets.sideband34PhaseOffset) / 10 : 0,
    phase: offsets?.carrierSidebandPhaseOffset ?? 0,
  };
  const octantal = {
    amplitude: offsets ? (offsets.sideband34PhaseOffset + offsets.carrierSidebandPhaseOffset) / 20 : 0,
    phase: offsets?.sideband12PhaseOffset ?? 0,
  };
  const bias = offsets ? offsets.azimuthAngle * 0.1 : 0;
  const rows = Array.from({ length: 16 }, (_, index) => {
    const azimuth = index * 22.5;
    const radians = Math.PI / 180;
    return {
      azimuth,
      stationError: bias
        + quadrantal.amplitude * Math.cos((2 * azimuth + quadrantal.phase) * radians)
        + octantal.amplitude * Math.cos((4 * azimuth + octantal.phase) * radians),
    };
  });
  const values = rows.map((row) => row.stationError);
  return {
    rows,
    quadrantal,
    octantal,
    bias,
    errorSpread: Math.max(...values) - Math.min(...values),
  };
}

function buildMonitorTestResults(config: Dvor1150Config): Dvor1150Snapshot["data"]["monitorTestResults"] {
  const calibrated = (monitorId: Dvor1150MonitorId) => {
    const settings = config.monitor.testGenerator;
    const calibration = config.monitor.calibration[monitorId].testGenerator;
    return {
      ...structuredClone(settings),
      azimuthAngle: normalizeAzimuth(settings.azimuthAngle + calibration.azimuthAngleOffset),
      hz30Modulation: settings.hz30Modulation * calibration.hz30ModulationScale / 100,
      hz9960Modulation: settings.hz9960Modulation * calibration.hz9960ModulationScale / 100,
      deviation: settings.deviation * calibration.hz9960DeviationScale / 100,
    };
  };
  return {
    mon1: { available: true, values: calibrated("mon1"), status: "green" },
    mon2: { available: true, values: calibrated("mon2"), status: "green" },
  };
}

function buildCertificationResults(config: Dvor1150Config, monitors: Dvor1150Snapshot["monitors"]): Dvor1150Snapshot["data"]["certificationResults"] {
  return Object.fromEntries(DVOR1150_MONITOR_IDS.map((monitorId) => [monitorId, DVOR1150_MONITOR_PARAMETERS.map((parameter) => {
    const result = monitors[monitorId].parameters[parameter];
    const limits = parameter === "azimuth" ? config.monitor.azimuthAlarmLimits[monitorId] : config.monitor.alarmLimits[parameter];
    return {
      parameter,
      lowLimit: limits.alarmLow,
      lowData: result.value,
      highLimit: limits.alarmHigh,
      highData: result.value,
      unit: parameter === "azimuth" ? "°" : parameter === "deviation" ? "Ratio" : parameter === "rfLevel" ? "dB" : "%",
    };
  })])) as Dvor1150Snapshot["data"]["certificationResults"];
}

function buildNotchData(config: Dvor1150Config, active: Dvor1150EffectiveTransmitter | null): Dvor1150Snapshot["data"]["notchData"] {
  return Array.from({ length: 48 }, (_, index) => {
    const baseline = config.monitor.notch.baseline[index] ?? 1;
    const current = active ? Math.max(0, baseline * (active.sidebandVswr[index % 4] / 1.05)) : baseline;
    const alarm = config.monitor.notch.enabled && current > baseline * (1 + config.monitor.notch.tolerance / 100);
    return { antenna: index + 1, baseline, current, indicator: alarm ? "yellow" : "green" };
  });
}

function buildFaultHistory(
  config: Dvor1150Config,
  monitors: Dvor1150Snapshot["monitors"],
  timestamp: string,
  effectiveTransmitters: Record<Dvor1150TransmitterId, Dvor1150EffectiveTransmitter>,
): Dvor1150Snapshot["data"]["faultHistory"] {
  const monitorData = DVOR1150_MONITOR_IDS.flatMap((monitorId) => DVOR1150_MONITOR_PARAMETERS.flatMap((parameter) => {
    const result = monitors[monitorId].parameters[parameter];
    return result.status === "normal" ? [] : [{ timestamp, monitor: monitorId, parameter, value: result.value, indicator: result.indicator }];
  }));
  return {
    monitorData,
    systemStatus: [{
      timestamp,
      monitorLogic: config.monitor.votingLogic,
      monitor1Alarm: !monitors.mon1.healthy,
      monitor2Alarm: !monitors.mon2.healthy,
      tx1On: effectiveTransmitters.tx1.onAir,
      tx2On: effectiveTransmitters.tx2.onAir,
    }],
  };
}

const idleTransferState = (): Dvor1150TransferState => ({
  cause: "none",
  phase: "idle",
  from: null,
  to: null,
  message: "No transmitter transfer",
});

export function buildDvor1150Snapshot(
  config: Dvor1150Config,
  now = new Date(),
  mainTransmitter?: Dvor1150TransmitterId,
  transfer: Dvor1150TransferState = idleTransferState(),
): Dvor1150Snapshot {
  const effectiveTransmitters = {
    tx1: effectiveTransmitter(config, "tx1"),
    tx2: effectiveTransmitter(config, "tx2"),
  };
  const activeId = chooseActiveTransmitter(effectiveTransmitters);
  const mainId = mainTransmitter ?? activeId;
  const active = activeId ? effectiveTransmitters[activeId] : null;
  const monitors = {
    mon1: monitorResult(config, "mon1", active, true),
    mon2: monitorResult(config, "mon2", active, false),
  };
  const hasSecondaryMonitor = config.station.monitorConfig === "Dual Monitors";
  const timestamp = config.simulation.timestamp || formatDvor1150Timestamp(now);
  const sidebandVswr = Array.from({ length: 48 }, (_, index) => {
    const value = active ? Math.max(1, active.sidebandVswr[index % 4] + ((index % 3) * 0.005)) : 1;
    const alarm = value > config.monitor.sidebandVswrTolerance;
    return {
      antenna: index + 1,
      value,
      tolerance: config.monitor.sidebandVswrTolerance,
      indicator: alarm ? (config.monitor.sidebandVswrExecutiveAlarm ? "red" : "yellow") : "green",
    } as const;
  });
  const vswrAlarmCount = sidebandVswr.filter((row) => row.indicator !== "green").length;
  const vswrExecutiveAlarm = config.monitor.sidebandVswrExecutiveAlarm
    && vswrAlarmCount >= config.monitor.numberOfAntennasInAlarm;
  const monitorHealthy = !hasSecondaryMonitor
    ? monitors.mon1.healthy
    : config.monitor.votingLogic === "AND"
      ? monitors.mon1.healthy && monitors.mon2.healthy
      : monitors.mon1.healthy || monitors.mon2.healthy;
  const systemHealthy = monitorHealthy && !vswrExecutiveAlarm;
  // Annunciation is independent of relay voting and Bypass.
  const installedMonitors = DVOR1150_MONITOR_IDS.filter((id) => isInstalledMonitor(config, id)).map((id) => monitors[id]);
  const monitorAnnunciation = {
    preAlarm: installedMonitors.some((monitor) => Object.values(monitor.parameters).some((parameter) => parameter.status === "warning")),
    alarm: installedMonitors.some((monitor) => !monitor.healthy) || vswrExecutiveAlarm,
  };
  const txPower = [
    { parameter: "Carrier", tx1: effectiveTransmitters.tx1.active ? effectiveTransmitters.tx1.outputPower : 0, tx2: effectiveTransmitters.tx2.active ? effectiveTransmitters.tx2.outputPower : 0, unit: "Watts" },
    ...[0, 1, 2, 3].map((index) => ({
      parameter: `Sideband #${index + 1}`,
      tx1: effectiveTransmitters.tx1.active ? effectiveTransmitters.tx1.sidebandPower[index] : 0,
      tx2: effectiveTransmitters.tx2.active ? effectiveTransmitters.tx2.sidebandPower[index] : 0,
      unit: "Watts",
    })),
  ];
  const txFrequency = [
    { parameter: "30 Hz AM", tx1: activeId === "tx1" ? 30 : null, tx2: activeId === "tx2" ? 30 : null, unit: "Hz" },
    { parameter: "30 Hz FM", tx1: activeId === "tx1" ? 30 : null, tx2: activeId === "tx2" ? 30 : null, unit: "Hz" },
    { parameter: "Sideband Frequency", tx1: activeId === "tx1" ? 9960 : null, tx2: activeId === "tx2" ? 9960 : null, unit: "Hz" },
    { parameter: "Carrier", tx1: activeId === "tx1" ? effectiveTransmitters.tx1.carrierFrequency : null, tx2: activeId === "tx2" ? effectiveTransmitters.tx2.carrierFrequency : null, unit: "MHz" },
    { parameter: "Tx Lower Sideband", tx1: activeId === "tx1" ? effectiveTransmitters.tx1.lowerSidebandFrequency : null, tx2: activeId === "tx2" ? effectiveTransmitters.tx2.lowerSidebandFrequency : null, unit: "MHz" },
    { parameter: "Tx Upper Sideband", tx1: activeId === "tx1" ? effectiveTransmitters.tx1.upperSidebandFrequency : null, tx2: activeId === "tx2" ? effectiveTransmitters.tx2.upperSidebandFrequency : null, unit: "MHz" },
  ];
  const txVswr = [
    { parameter: "Carrier", tx1: effectiveTransmitters.tx1.active ? 1.06 : null, tx2: effectiveTransmitters.tx2.active ? 1.06 : null },
    ...[0, 1, 2, 3].map((index) => ({
      parameter: `Sideband #${index + 1}`,
      tx1: effectiveTransmitters.tx1.active ? effectiveTransmitters.tx1.sidebandVswr[index] : null,
      tx2: effectiveTransmitters.tx2.active ? effectiveTransmitters.tx2.sidebandVswr[index] : null,
    })),
  ];
  const sidebarParams = {
    azimuth: { value: monitors.mon1.parameters.azimuth.value, status: monitors.mon1.parameters.azimuth.status },
    hz30Mod: { value: monitors.mon1.parameters.hz30Modulation.value, status: monitors.mon1.parameters.hz30Modulation.status },
    hz9960Mod: { value: monitors.mon1.parameters.hz9960Modulation.value, status: monitors.mon1.parameters.hz9960Modulation.status },
    deviation: { value: monitors.mon1.parameters.deviation.value, status: monitors.mon1.parameters.deviation.status },
    rfLevel: { value: monitors.mon1.parameters.rfLevel.value, status: monitors.mon1.parameters.rfLevel.status },
  };
  const adDataByTransmitter = {
    tx1: adRowsFor(config, "tx1", effectiveTransmitters.tx1),
    tx2: adRowsFor(config, "tx2", effectiveTransmitters.tx2),
  };
  const temperatureData = temperatureRows(config);
  const notchData = buildNotchData(config, active);
  const groundCheck = buildGroundCheck(config, active);
  const monitorTestResults = buildMonitorTestResults(config);
  const certificationResults = buildCertificationResults(config, monitors);
  const faultHistory = buildFaultHistory(config, monitors, timestamp, effectiveTransmitters);
  const maintenanceAlert = config.simulation.alert || monitorAnnunciation.preAlarm || monitorAnnunciation.alarm;
  const data: Dvor1150Snapshot["data"] = {
    connected: config.simulation.connected,
    local: config.simulation.local,
    alert: maintenanceAlert,
    timestamp,
    transmitters: {
      tx1: transmitterSidebarState(effectiveTransmitters.tx1, "tx1", mainId, activeId),
      tx2: transmitterSidebarState(effectiveTransmitters.tx2, "tx2", mainId, activeId),
    },
    dme: {
      tx1: {
        normal: config.rms.dmePresent ? "green" : "gray",
        antenna: config.rms.dmePresent && activeId === "tx1" ? "green" : "gray",
      },
      tx2: {
        normal: config.rms.dmePresent && config.rms.dualDme ? "green" : "gray",
        antenna: config.rms.dmePresent && config.rms.dualDme && activeId === "tx2" ? "green" : "gray",
      },
    },
    monitorIntegral: {
      normal: systemHealthy,
      alarm: !systemHealthy,
      bypass: config.simulation.integralMonitorBypass,
    },
    sidebarParams,
    rmsStatus: {
      maintenanceAlert,
      onBattery: false,
      acFailure: false,
      localControlMode: config.simulation.local,
      monitorCertificationRunning: false,
      groundCheckRunning: false,
      testGeneratorRunning: false,
      holdCommutatorEnabled: false,
    },
    maintenanceAlerts: [
      { label: "Maintenance Alert", indicator: maintenanceAlert ? "yellow" : "gray" },
      {
        label: "Monitor Mismatch",
        indicator: hasSecondaryMonitor && monitors.mon1.healthy !== monitors.mon2.healthy ? "yellow" : "gray",
      },
      { label: "Transmitter Status", indicator: activeId ? "green" : "red" },
      { label: "Notch Monitor", indicator: notchData.some((row) => row.indicator !== "green") ? "yellow" : "gray" },
      { label: "Sideband Antenna VSWR", indicator: vswrExecutiveAlarm ? "red" : vswrAlarmCount > 0 ? "yellow" : "gray" },
    ],
    adData: adDataByTransmitter.tx1,
    adDataByTransmitter,
    temperatureData,
    logs: [],
    groundCheck,
    monitorTestResults,
    certificationResults,
    notchData,
    faultHistory,
    sidebandVswr,
    txPower,
    txFrequency,
    txVswr,
  };
  return { data, activeTransmitter: activeId, mainTransmitter: mainId, effectiveTransmitters, monitors, monitorAnnunciation, transfer, validation: buildValidation(config) };
}
