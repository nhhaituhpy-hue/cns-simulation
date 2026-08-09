import { cloneDefaultVorPmdtData } from "@/lib/vor-pmdt-defaults";
import type {
  Dvor1150aConfig,
  DvorMonitorCalibration,
  DvorMonitorId,
  DvorMonitorParameter,
  DvorRawMonitorMeasurement,
  DvorTransmitterConfig,
  DvorTransmitterId,
  DvorTransmitterOffsets,
} from "./config-types";

const screenshotVswr = cloneDefaultVorPmdtData().vswrData;

const monitorCalibration: DvorMonitorCalibration = {
  azimuthOffset: 0,
  hz30ModulationScale: 100,
  hz9960ModulationScale: 100,
  deviationScale: 99.5,
  rfLevelOffset: 0,
  identModulationScale: 100,
  txPowerScale: 99,
  txPowerOffset: 0,
  txFrequencyErrorOffset: 0,
  notchScale: 100,
  // Zero is the calibrated reference state shown by the supplied VSWR
  // screenshot; operators can change odd/even offsets from the PMDT panel.
  oddAntennaReturnLossOffset: 0,
  evenAntennaReturnLossOffset: 0,
};

const testGeneratorCalibration: DvorMonitorCalibration = {
  azimuthOffset: 0,
  hz30ModulationScale: 100,
  hz9960ModulationScale: 96.1,
  deviationScale: 100,
  rfLevelOffset: 0,
  identModulationScale: 100,
  txPowerScale: 100,
  txPowerOffset: 0,
  txFrequencyErrorOffset: 0,
  notchScale: 100,
  oddAntennaReturnLossOffset: 0,
  evenAntennaReturnLossOffset: 0,
};

function makeMonitorMeasurement(): DvorRawMonitorMeasurement {
  return {
    azimuth: 249.55,
    hz30Modulation: 29.6,
    hz9960Modulation: 29.6,
    deviation: 16.1608,
    rfLevel: 0.9,
    identModulation: 7.2,
    identStatus: "Normal",
    identCode: "TUH",
    txFrequencyError: 5,
    notchMonitor: 100,
    sidebandVswr: [...screenshotVswr],
  };
}

function makeTxOffsets(overrides: Partial<DvorTransmitterOffsets> = {}): DvorTransmitterOffsets {
  return {
    azimuthAngleOffset: 0,
    outputPowerScale: 84,
    voiceModulationScale: 100,
    identModulationScale: 100,
    referenceModulationScale: 99,
    carrierPllControl: 12.5,
    carrierSidebandPhaseOffsetCoarse: 180,
    carrierSidebandPhaseOffsetFine: 33,
    sideband1PhaseOffset: -1,
    sideband2PhaseOffset: 1,
    sideband3PhaseOffset: 0,
    sideband4PhaseOffset: 0,
    txSidebandRfLevelScale: 95.5,
    sideband1RfLevelScale: 100,
    sideband2RfLevelScale: 100,
    sideband3RfLevelScale: 100,
    sideband4RfLevelScale: 100,
    sideband1VswrOffset: -0.72,
    sideband2VswrOffset: -0.66,
    sideband3VswrOffset: -0.66,
    sideband4VswrOffset: -0.72,
    ...overrides,
  };
}

function makeTxConfig(id: DvorTransmitterId): DvorTransmitterConfig {
  const secondary = id === "tx2";
  return {
    // Both transmitters are installed and selectable. TX2 starts in standby
    // so the reference screen still shows TX1 as the main transmitter.
    enabled: true,
    onAir: !secondary,
    load: false,
    frequencyErrorPpm: secondary ? 0 : 5,
    nominal: {
      azimuthIndex: 5,
      outputPower: 70,
      voiceModulation: 0,
      identModulation: 8,
      referenceModulation: 28,
      sboRfLevel: 65,
      mainIdentCode: "TUH",
      standbyIdentCode: "Same as Main Ident",
      keyerMode: "disabled",
    },
    offsets: makeTxOffsets(
      secondary
        ? {
            outputPowerScale: 93.5,
            carrierPllControl: 11.5,
            carrierSidebandPhaseOffsetCoarse: 90,
            carrierSidebandPhaseOffsetFine: -16,
            sideband1PhaseOffset: 0,
            sideband2PhaseOffset: 0,
            sideband3PhaseOffset: 2,
            sideband4PhaseOffset: -2,
            txSidebandRfLevelScale: 95,
            sideband1VswrOffset: -0.65,
            sideband2VswrOffset: -0.80,
            sideband3VswrOffset: -0.75,
            sideband4VswrOffset: -0.69,
          }
        : undefined,
    ),
    vswr: secondary
      // VSWR is a ratio and cannot be lower than 1:1. Keep TX2's standby
      // profile realistic so it remains valid when selected to the antenna.
      ? { carrier: 1.02, sidebands: [1.85, 1.90, 1.90, 1.86] }
      : { carrier: 1.01, sidebands: [1.83, 1.83, 1.74, 1.83] },
    faults: {
      disabled: false,
      carrierVswr: false,
      overtemperature: false,
      frequencyError: false,
    },
  };
}

const alarmLimits: Dvor1150aConfig["monitor"]["alarmLimits"] = {
  hz30Modulation: { alarmLow: 23, preAlarmLow: 28.5, nominal: 30, preAlarmHigh: 31.5, alarmHigh: 37, unit: "%" },
  hz9960Modulation: { alarmLow: 23, preAlarmLow: 28.5, nominal: 30, preAlarmHigh: 31.5, alarmHigh: 37, unit: "%" },
  deviation: { alarmLow: 12.6, preAlarmLow: 15.5, nominal: 16, preAlarmHigh: 16.5, alarmHigh: 19, unit: "Ratio" },
  rfLevel: { alarmLow: -9, preAlarmLow: -2, nominal: 0, preAlarmHigh: 2, alarmHigh: 9, unit: "dB" },
  identModulation: { alarmLow: 2, preAlarmLow: 4, nominal: 5, preAlarmHigh: 9, alarmHigh: 10, unit: "%" },
  txPower: { alarmLow: 50, preAlarmLow: 65, nominal: 70, preAlarmHigh: 80, alarmHigh: 120, unit: "Watts" },
  txFrequencyError: { alarmLow: -20, preAlarmLow: -18, nominal: 0, preAlarmHigh: 18, alarmHigh: 20, unit: "ppm" },
};

function makeRouting(): Dvor1150aConfig["monitor"]["routing"] {
  const rows = {} as Dvor1150aConfig["monitor"]["routing"];
  for (const parameter of [
    "azimuth",
    "hz30Modulation",
    "hz9960Modulation",
    "deviation",
    "rfLevel",
    "identModulation",
    "identStatus",
    "identCode",
    "txPower",
    "txFrequencyError",
    "notchMonitor",
    "sidebandVswr",
  ] as DvorMonitorParameter[]) {
    rows[parameter] = {
      primary: parameter !== "notchMonitor",
      secondary: false,
    };
  }
  rows.sidebandVswr = { primary: true, secondary: false };
  return rows;
}

function makeAntenna(monitor: DvorMonitorId) {
  return {
    monitor: monitor === "mon1" ? 1 : 2,
    enabled: true,
    inputAttenuation: 14,
    azimuthAngle: 249.25,
    secondAntennaEnabled: false,
    secondInputAttenuation: 47,
    secondAzimuthAngle: 0,
  } as const;
}

function makeCalibration() {
  return {
    mon1: { ...monitorCalibration },
    mon2: { ...monitorCalibration },
  };
}

export function createDefaultDvor1150aConfig(): Dvor1150aConfig {
  return {
    station: {
      stationDescription: "TUY HOA 117.0 MHz",
      frequencyMHz: 117,
      stationType: "DVOR",
      transmitterConfig: "Dual Transmitters",
      monitorConfig: "Dual Monitors",
    },
    transmitters: {
      tx1: makeTxConfig("tx1"),
      tx2: makeTxConfig("tx2"),
    },
    monitor: {
      rawMeasurements: {
        mon1: makeMonitorMeasurement(),
        mon2: makeMonitorMeasurement(),
      },
      alarmLimits,
      azimuthLimits: { preAlarm: 0.5, alarm: 2 },
      timers: { shutdown: 5, continuousIdent: 17, noIdent: 17 },
      antennas: {
        mon1: makeAntenna("mon1"),
        mon2: makeAntenna("mon2"),
      },
      calibration: makeCalibration(),
      routing: makeRouting(),
      votingLogic: "AND",
      transfer: "on Primary Alarm",
      sidebandVswr: { numberAntennasInAlarm: 3, preAlarm: 2.2, alarm: 3 },
      notchTolerance: 50,
      integrity: { enabled: true, maxConsecutiveFailures: 3 },
    },
    simulation: {
      connected: true,
      local: false,
      integralMonitorBypass: false,
      alert: false,
      timestamp: "08/08/26 13:20:56",
    },
  };
}

export function cloneDvor1150aConfig(config: Dvor1150aConfig): Dvor1150aConfig {
  return structuredClone(config);
}

export const defaultDvor1150aConfig = createDefaultDvor1150aConfig();

export const testGeneratorDvor1150aCalibration = testGeneratorCalibration;
