import type {
  Dvor1150AlarmBand,
  Dvor1150Config,
  Dvor1150MonitorParameter,
  Dvor1150TransmitterConfig,
} from "./types";

export function formatDvor1150Timestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const defaultAlarmBands: Record<Dvor1150MonitorParameter, Dvor1150AlarmBand> = {
  azimuth: { alarmLow: 358, preAlarmLow: 359, nominal: 360, preAlarmHigh: 361, alarmHigh: 362 },
  hz30Modulation: { alarmLow: 28, preAlarmLow: 28.5, nominal: 30, preAlarmHigh: 31.5, alarmHigh: 32 },
  hz9960Modulation: { alarmLow: 28, preAlarmLow: 28.5, nominal: 30, preAlarmHigh: 31.5, alarmHigh: 32 },
  deviation: { alarmLow: 15, preAlarmLow: 15.2, nominal: 16, preAlarmHigh: 16.3, alarmHigh: 17 },
  rfLevel: { alarmLow: -3, preAlarmLow: -1, nominal: 0, preAlarmHigh: 1, alarmHigh: 3 },
};

function transmitter(
  overrides: Partial<Dvor1150TransmitterConfig> = {},
): Dvor1150TransmitterConfig {
  return {
    enabled: true,
    onAir: false,
    load: false,
    nominal: {
      azimuthIndex: 0,
      outputPower: 100,
      voiceModulation: 0,
      identModulation: 8,
      referenceModulation: 30,
      sboRfLevel: 47,
      identCode: "TST",
    },
    offsets: {
      azimuthAngle: 0,
      outputPowerScale: 100,
      voiceModulationScale: 100,
      identModulationScale: 100,
      referenceModulationScale: 100,
      sideband12PhaseOffset: 0,
      sideband34PhaseOffset: 0,
      carrierSidebandPhaseOffset: 0,
      sideband1RfLevelScale: 100,
      sideband2RfLevelScale: 100,
      sideband3RfLevelScale: 100,
      sideband4RfLevelScale: 100,
    },
    ...overrides,
  };
}

export function createDefaultDvor1150Config(now = new Date()): Dvor1150Config {
  return {
    station: {
      stationDescription: "Runway ID",
      stationType: "DVOR",
      transmitterConfig: "Dual Transmitters",
      monitorConfig: "Dual Monitors",
      frequencyMHz: 112.1,
    },
    transmitters: {
      tx1: transmitter({ onAir: true }),
      tx2: transmitter({ load: true }),
    },
    monitor: {
      votingLogic: "AND",
      monitorStartupDelay: 20,
      monitorShutdownDelay: 20,
      identMonitoringEnabled: true,
      alarmLimits: structuredClone(defaultAlarmBands),
      offsets: {
        mon1: {
          azimuth: 0,
          hz30Modulation: 0,
          hz9960Modulation: 0,
          deviation: 0,
          rfLevel: 0,
        },
        mon2: {
          azimuth: 0,
          hz30Modulation: 0,
          hz9960Modulation: 0,
          deviation: 0,
          rfLevel: 0,
        },
      },
      sidebandVswrTolerance: 2,
      sidebandVswrExecutiveAlarm: false,
      numberOfAntennasInAlarm: 1,
    },
    rms: {
      rcsuPresent: false,
      rcsuConnectionType: "Hard Wired",
      smokeAlarmInstalled: false,
      intrusionAlarmInstalled: false,
      automaticRestartsEnabled: false,
      firstRestartDelay: 60,
      dmePresent: false,
      dualDme: false,
      keyingOutputEnabled: true,
    },
    simulation: {
      connected: true,
      local: false,
      integralMonitorBypass: false,
      alert: false,
      timestamp: formatDvor1150Timestamp(now),
    },
  };
}

export const defaultDvor1150Config = createDefaultDvor1150Config(new Date(2002, 8, 19, 11, 6, 50));

export function cloneDvor1150Config(config: Dvor1150Config): Dvor1150Config {
  return structuredClone(config);
}
