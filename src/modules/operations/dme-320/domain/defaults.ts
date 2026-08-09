import { getDme320ChannelAllocation } from "./channel-allocation";
import type {
  Dme320AlarmClassification,
  Dme320AlarmStates,
  Dme320CalibrationState,
  Dme320Channel,
  Dme320Config,
  Dme320MonitorLimit,
  Dme320MonitorLimits,
  Dme320MonitorParameter,
  Dme320MonitorReadings,
  Dme320SecurityAccount,
} from "./types";

function limit(
  nominal: number | string,
  alarmLow: number | null,
  warningLow: number | null,
  warningHigh: number | null,
  alarmHigh: number | null,
  unit: string,
  classification: Dme320AlarmClassification = "secondary",
  alarmDelayMs = 1_000,
): Dme320MonitorLimit {
  return {
    alarmLow,
    warningLow,
    nominal,
    warningHigh,
    alarmHigh,
    classification,
    alarmDelayMs,
    unit,
  };
}

export function createDefaultDme320MonitorLimits(
  channel: Dme320Channel,
  powerOutputWatts = 1_000,
  delayOffsetUs = 0,
  identCode = "MOP",
): Dme320MonitorLimits {
  const allocation = getDme320ChannelAllocation(channel);
  const delay = allocation.nominalDelayUs + delayOffsetUs;
  const spacing = allocation.replySpacingUs;
  const frequencyTolerance = allocation.replyFrequencyMhz * 0.000_01;

  return {
    timeDelayUs: limit(
      delay,
      delay - 0.4,
      delay - 0.2,
      delay + 0.2,
      delay + 0.4,
      "µs",
      "primary",
    ),
    replyEfficiencyPct: limit(85, 70, 75, 98, 100, "%"),
    transmissionRatePps: limit(800, 700, 750, 5_200, 5_400, "pp/s"),
    pulseRiseUs: limit(2.5, 2, 2.2, 2.8, 3, "µs"),
    pulseDurationUs: limit(3.5, 3, 3.2, 3.8, 4, "µs"),
    pulseDecayUs: limit(2.5, 2, 2.2, 2.8, 3, "µs"),
    pulseSpacingUs: limit(
      spacing,
      spacing - 0.4,
      spacing - 0.2,
      spacing + 0.2,
      spacing + 0.4,
      "µs",
      "primary",
    ),
    frequencyMhz: limit(
      allocation.replyFrequencyMhz,
      allocation.replyFrequencyMhz - frequencyTolerance,
      allocation.replyFrequencyMhz - frequencyTolerance / 2,
      allocation.replyFrequencyMhz + frequencyTolerance / 2,
      allocation.replyFrequencyMhz + frequencyTolerance,
      "MHz",
    ),
    peakPowerWatts: limit(
      powerOutputWatts,
      powerOutputWatts / 2,
      powerOutputWatts * 0.75,
      null,
      null,
      "W",
    ),
    vswr: limit(1.15, null, null, 2, 3, ":1"),
    erpDb: limit(0, -3, -2, 2, 3, "dB"),
    identCode: limit(identCode, null, null, null, null, ""),
  };
}

export function createDefaultDme320Config(): Dme320Config {
  const channel: Dme320Channel = { number: 100, suffix: "X" };
  const powerOutputWatts = 1_000;
  const identCode = "MOP";

  return {
    station: {
      stationName: "MOPIENS 320 DME",
      runwayDesignator: "",
      channel,
      powerOutputWatts,
      delayOffsetUs: 0,
      autoDelayCalibration: "never",
      sensitivityDbm: -91,
      minimumPulseRatePps: 800,
      sdesEnabled: true,
      sdesDurationUs: 6,
      ldesEnabled: false,
      ldesDurationUs: 200,
      ldesThresholdDbm: -80,
      deadTimeUs: 60,
      identCode,
      identKeyer: "independent",
      identSync: "code",
      identSound: "ON ANTENNA",
      equalizerPulseEnabled: false,
      interlockEnabled: false,
      standbyMode: "hot",
      bypassMonitorsOnBoot: true,
      transmitterOutputOnBoot: true,
    },
    transmitters: {
      tx1: {
        outputPowerPercent: 100,
        useStationPulseRate: true,
        useStationEchoSuppression: true,
        useStationIdent: true,
      },
      tx2: {
        outputPowerPercent: 100,
        useStationPulseRate: true,
        useStationEchoSuppression: true,
        useStationIdent: true,
      },
    },
    thermal: {
      fanMode: "on",
      fanStartC: 45,
      fanStopC: 40,
      txuShutdownC: 90,
      txuRestartC: 80,
    },
    monitor: {
      votingLogic: "OR",
      monitorActionDelayMs: 4_000,
      postChangeoverHoldoffMs: 2_000,
      identFaultDelayMs: 40_000,
      selfTestHoldoffMs: 2_000,
      powerOnHoldoffMs: 2_000,
      limits: createDefaultDme320MonitorLimits(
        channel,
        powerOutputWatts,
        0,
        identCode,
      ),
    },
    system: {
      allowSimultaneousLogin: false,
      allowGuestAccess: true,
      automaticLogoutMinutes: 0,
      modifyOnlyWhenBypassed: true,
      modifyOnlyAtLocal: true,
      shutdownOnRcuFault: false,
      shutdownOnLmiFault: false,
      shutdownOnCspFault: false,
      communicationFaultShutdownDelayMs: 4_000,
    },
    communication: {
      remoteConnectionLimit: 4,
      localConnectionLimit: 4,
      localPmdtBaudRate: 115_200,
      scu1RemoteType: "RS-232",
      scu1BaudRate: 115_200,
      scu1FlowControl: false,
      scu2RemoteType: "RS-232",
      scu2BaudRate: 115_200,
      scu2FlowControl: false,
      rcuLineType: "Ethernet",
      localIpStart: "172.16.1.1",
      localIpEnd: "172.16.1.254",
    },
    battery: {
      warningVoltage: 22,
      alarmVoltage: 21,
      warningTemperatureC: 45,
      alarmTemperatureC: 55,
      chargingCurrentLimitA: 20,
      cutoffVoltage: 20,
      fullyChargedVoltage: 27,
      simulatedDischargeVoltsPerHour: 1,
      simulatedChargeVoltsPerHour: 2,
    },
    environment: {
      emuEnabled: true,
      analogInputsEnabled: Array.from({ length: 8 }, () => false),
      digitalInputsEnabled: Array.from({ length: 16 }, () => false),
      expansionDigitalInputsEnabled: Array.from({ length: 8 }, () => false),
      digitalOutputsEnabled: Array.from({ length: 8 }, () => false),
    },
  };
}

export const DEFAULT_DME320_ACCOUNTS: readonly Dme320SecurityAccount[] = [
  { userId: "observer", password: "observer", level: 1 },
  { userId: "operator", password: "operator", level: 2 },
  { userId: "Administrator", password: "1234", level: 3 },
];

export const DME320_CALIBRATION_STEP_NAMES = [
  "Transmitter Drive Level Optimization",
  "Transmitter Power Output Calibration",
  "Transponder Processing Delay Compensation",
  "Auto Time Delay Calibration",
  "Monitor Interrogation Level Calibration",
  "Time Delay Monitor Reading Calibration",
  "ERP Monitor Reading Calibration",
  "VSWR Monitor Reading Calibration",
  "Power Output Monitor Reading Calibration",
  "Receiver Threshold Calibration",
] as const;

export function createIdleDme320Calibration(): Dme320CalibrationState {
  return {
    status: "idle",
    transponderId: null,
    currentStep: null,
    steps: DME320_CALIBRATION_STEP_NAMES.map((name, index) => ({
      number: index + 1,
      name,
      skippable: index !== 0,
      status: "pending",
      completedAtMs: null,
      message: null,
    })),
  };
}

export function cloneDme320Config(config: Dme320Config): Dme320Config {
  return structuredClone(config);
}

export function createEmptyReadings(nowMs: number): Dme320MonitorReadings {
  const result = {} as Dme320MonitorReadings;
  const parameters: readonly Dme320MonitorParameter[] = [
    "timeDelayUs",
    "replyEfficiencyPct",
    "transmissionRatePps",
    "pulseRiseUs",
    "pulseDurationUs",
    "pulseDecayUs",
    "pulseSpacingUs",
    "frequencyMhz",
    "peakPowerWatts",
    "vswr",
    "erpDb",
    "identCode",
  ];
  for (const parameter of parameters) {
    result[parameter] = {
      value: null,
      masked: false,
      valid: false,
      updatedAtMs: nowMs,
    };
  }
  return result;
}

export function createNormalAlarmStates(
  limits: Dme320MonitorLimits,
  nowMs: number,
): Dme320AlarmStates {
  const result = {} as Dme320AlarmStates;
  for (const parameter of Object.keys(limits) as Dme320MonitorParameter[]) {
    result[parameter] = {
      phase: "normal",
      classification: limits[parameter].classification,
      pendingSinceMs: null,
      activeSinceMs: null,
      lastTransitionAtMs: nowMs,
    };
  }
  return result;
}
