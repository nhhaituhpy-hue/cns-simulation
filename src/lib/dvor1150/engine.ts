import {
  DVOR1150_MONITOR_IDS,
  DVOR1150_MONITOR_PARAMETERS,
  DVOR1150_TRANSMITTER_IDS,
  type Dvor1150Config,
  type Dvor1150EffectiveTransmitter,
  type Dvor1150IndicatorColor,
  type Dvor1150MonitorId,
  type Dvor1150MonitorParameter,
  type Dvor1150MonitorResult,
  type Dvor1150ParameterStatus,
  type Dvor1150Snapshot,
  type Dvor1150TransmitterId,
} from "./types";
import { formatDvor1150Timestamp } from "./defaults";

const DVOR1150_SIDEBAND_VSWR_ALARM_THRESHOLD = 1.25;
const DVOR1150_REFERENCE_NOMINAL_OUTPUT_POWER = 100;

const parameterLabels: Record<Dvor1150MonitorParameter, string> = {
  azimuth: "Azimuth Angle",
  hz30Modulation: "30 Hz Mod",
  hz9960Modulation: "9960 Hz Mod",
  deviation: "Deviation",
  rfLevel: "RF Level",
};

const parameterDigits: Record<Dvor1150MonitorParameter, number> = {
  azimuth: 2,
  hz30Modulation: 1,
  hz9960Modulation: 1,
  deviation: 1,
  rfLevel: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
  const sboRfLevel = enabled
    ? Math.max(0, transmitter.nominal.sboRfLevel * (transmitter.nominal.outputPower / DVOR1150_REFERENCE_NOMINAL_OUTPUT_POWER))
    : 0;
  return {
    id,
    enabled,
    onAir,
    load: enabled && !onAir && transmitter.load,
    active: onAir,
    azimuthIndex: transmitter.nominal.azimuthIndex,
    outputPower,
    voiceModulation: clamp(transmitter.nominal.voiceModulation * transmitter.offsets.voiceModulationScale / 100, 0, 100),
    identModulation: clamp(transmitter.nominal.identModulation * transmitter.offsets.identModulationScale / 100, 0, 100),
    referenceModulation: clamp(transmitter.nominal.referenceModulation * transmitter.offsets.referenceModulationScale / 100, 0, 100),
    sboRfLevel,
    carrierFrequency: config.station.frequencyMHz,
    lowerSidebandFrequency: config.station.frequencyMHz - 0.00996,
    upperSidebandFrequency: config.station.frequencyMHz + 0.00996,
    sidebandPower: sidebandScales.map((scale) => Math.max(0, sboRfLevel * (scale / 100) ** 2 / 30)),
    sidebandVswr: sidebandScales.map((scale, index) => Math.max(1, 1 + Math.abs(100 - scale) / 250 + (index + 1) * 0.01 + Math.abs(phaseOffsets[index] + transmitter.offsets.carrierSidebandPhaseOffset) / 1800)),
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
  const activeTx = active ?? effectiveTransmitter(config, "tx1");
  const rawValues: Record<Dvor1150MonitorParameter, number> = {
    azimuth: normalizeAzimuth(359.97 + activeTx.azimuthIndex + config.transmitters[activeTx.id].offsets.azimuthAngle + offsets.azimuth),
    hz30Modulation: 29.1 + activeTx.referenceModulation * 0.03 + offsets.hz30Modulation,
    hz9960Modulation: 29 + activeTx.referenceModulation * 0.033 + offsets.hz9960Modulation,
    deviation: 16 + activeTx.voiceModulation * 0.12 + offsets.deviation,
    rfLevel: active ? active.outputPower * 0.002 + offsets.rfLevel : -0.2 + offsets.rfLevel,
  };
  const parameters = Object.fromEntries(DVOR1150_MONITOR_PARAMETERS.map((parameter) => {
    const value = rawValues[parameter];
    const status = getStatus(value, config.monitor.alarmLimits[parameter]);
    return [parameter, { value, status, indicator: indicatorFor(status) }];
  })) as Dvor1150MonitorResult["parameters"];
  const healthy = installed
    && Object.values(parameters).every((parameter) => parameter.status === "normal")
    && Boolean(active);
  return {
    id: monitorId,
    healthy,
    controlling: installed && controlling,
    commStatus: installed ? "green" : "gray",
    parameters,
  };
}

function transmitterSidebarState(
  transmitter: Dvor1150EffectiveTransmitter,
): Dvor1150Snapshot["data"]["transmitters"][Dvor1150TransmitterId] {
  if (!transmitter.enabled) return { main: "gray", antenna: "gray", load: "gray", off: "red" };
  if (transmitter.active) return { main: "green", antenna: "green", load: "gray", off: "gray" };
  if (transmitter.load) return { main: "gray", antenna: "gray", load: "green", off: "gray" };
  return { main: "gray", antenna: "gray", load: "gray", off: "gray" };
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

export function buildDvor1150Snapshot(config: Dvor1150Config, now = new Date()): Dvor1150Snapshot {
  const effectiveTransmitters = {
    tx1: effectiveTransmitter(config, "tx1"),
    tx2: effectiveTransmitter(config, "tx2"),
  };
  const activeId = chooseActiveTransmitter(effectiveTransmitters);
  const active = activeId ? effectiveTransmitters[activeId] : null;
  const monitors = {
    mon1: monitorResult(config, "mon1", active, activeId === "tx1"),
    mon2: monitorResult(config, "mon2", active, activeId === "tx2"),
  };
  const hasSecondaryMonitor = config.station.monitorConfig === "Dual Monitors";
  const systemHealthy = !hasSecondaryMonitor
    ? monitors.mon1.healthy
    : config.monitor.votingLogic === "AND"
      ? monitors.mon1.healthy && monitors.mon2.healthy
      : monitors.mon1.healthy || monitors.mon2.healthy;
  const timestamp = config.simulation.timestamp || formatDvor1150Timestamp(now);
  const sidebandVswr = Array.from({ length: 48 }, (_, index) => {
    const value = active ? Math.max(1, active.sidebandVswr[index % 4] + ((index % 3) * 0.005)) : 1;
    const alarm = value > DVOR1150_SIDEBAND_VSWR_ALARM_THRESHOLD;
    return {
      antenna: index + 1,
      value,
      tolerance: config.monitor.sidebandVswrTolerance,
      indicator: alarm ? (config.monitor.sidebandVswrExecutiveAlarm ? "red" : "yellow") : "green",
    } as const;
  });
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
  const maintenanceAlert = config.simulation.alert || !systemHealthy;
  const data: Dvor1150Snapshot["data"] = {
    connected: config.simulation.connected,
    local: config.simulation.local,
    alert: maintenanceAlert,
    timestamp,
    transmitters: {
      tx1: transmitterSidebarState(effectiveTransmitters.tx1),
      tx2: transmitterSidebarState(effectiveTransmitters.tx2),
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
    ],
    adData: [
      { parameter: "+28 VDC", low: 25, preLow: 26, value: 28, preHigh: 30, high: 31, unit: "Volts" },
      { parameter: "+48 VDC", low: 44, preLow: 46, value: 48, preHigh: 50, high: 52, unit: "Volts" },
      { parameter: "Cabinet Temperature", low: 0, preLow: 5, value: 23, preHigh: 45, high: 50, unit: "°C" },
    ],
    logs: [],
    sidebandVswr,
    txPower,
    txFrequency,
    txVswr,
  };
  return { data, activeTransmitter: activeId, effectiveTransmitters, monitors, validation: buildValidation(config) };
}
