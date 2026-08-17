import type {
  Dvor1150AdLimitBand,
  Dvor1150AdParameter,
  Dvor1150AlarmBand,
  Dvor1150Config,
  Dvor1150MonitorParameter,
  Dvor1150MonitorCalibration,
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

const defaultMonitorCalibration: Dvor1150MonitorCalibration = {
  azimuthAngleOffset: 0,
  hz30ModulationScale: 100,
  hz9960ModulationScale: 100,
  hz9960DeviationScale: 100,
  rfLevelOffset: 0,
};

const defaultAdBand = (low: number, preLow: number, preHigh: number, high: number): Dvor1150AdLimitBand => ({ low, preLow, preHigh, high });

const defaultAdLimits = (): Dvor1150Config["rms"]["adLimits"] => {
  const transmitter: Record<Dvor1150AdParameter, Dvor1150AdLimitBand> = {
    plus5V: defaultAdBand(4.75, 4.85, 5.15, 5.25),
    plus12V: defaultAdBand(11.5, 11.7, 12.3, 12.5),
    plus12VLogic: defaultAdBand(11.5, 11.7, 12.3, 12.5),
    plus28V: defaultAdBand(27, 27.5, 28.5, 29),
    paVoltage: defaultAdBand(42.7, 43.5, 47.5, 48.1),
  };
  return {
    tx1: structuredClone(transmitter),
    tx2: structuredClone(transmitter),
    temperature: {
      exterior: defaultAdBand(-25, -20, 65, 70),
      tx1: defaultAdBand(-25, -20, 35, 40),
      tx2: defaultAdBand(-25, -20, 35, 40),
    },
  };
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
      cabinetTemperatureOffset: 0,
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
      azimuthAlarmLimits: {
        mon1: structuredClone(defaultAlarmBands.azimuth),
        mon2: structuredClone(defaultAlarmBands.azimuth),
      },
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
      calibration: {
        mon1: { fieldDetector: structuredClone(defaultMonitorCalibration), testGenerator: structuredClone(defaultMonitorCalibration) },
        mon2: { fieldDetector: structuredClone(defaultMonitorCalibration), testGenerator: structuredClone(defaultMonitorCalibration) },
      },
      testGenerator: {
        azimuthAngle: 0,
        hz30Modulation: 30,
        hz9960Modulation: 30,
        deviation: 16,
        identModulation: 0,
        identControl: "Normal",
        audioModulation: 0,
        audioFrequency: 300,
      },
      notch: {
        enabled: true,
        tolerance: 20,
        baseline: Array.from({ length: 48 }, (_, index) => 1 + ((index * 7) % 19) / 10),
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
      adLimits: defaultAdLimits(),
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
