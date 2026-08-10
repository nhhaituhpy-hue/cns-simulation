import {
  DVOR220_MONITOR_CHANNEL_IDS,
  DVOR220_MONITOR_IDS,
  DVOR220_RF_OUTPUT_IDS,
  type Dvor220AlarmBand,
  type Dvor220CalibrationState,
  type Dvor220Configuration,
  type Dvor220DeviceState,
  type Dvor220MonitorChannelConfiguration,
  type Dvor220MonitorChannelId,
  type Dvor220MonitorId,
  type Dvor220MonitorParameter,
  type Dvor220RfOutputId,
  type Dvor220TransmitterId,
} from "./types";

const minutes = (value: number) => value * 60_000;

function band(
  lowerAlarm: number | null,
  lowerWarning: number | null,
  nominal: number,
  upperWarning: number | null,
  upperAlarm: number | null,
  severity: Dvor220AlarmBand["severity"] = "primary",
): Dvor220AlarmBand {
  return { lowerAlarm, lowerWarning, nominal, upperWarning, upperAlarm, severity };
}

function createMonitorChannel(
  channelId: Dvor220MonitorChannelId,
): Dvor220MonitorChannelConfiguration {
  return {
    type: "FFM",
    referenceAzimuthDeg: 0,
    executiveAction: channelId === "cha",
    limits: {
      bearingError: band(-1, -0.8, 0, 0.8, 1),
      fmIndex: band(15, 15.2, 16, 16.8, 17),
      am30Hz: band(28, 28.4, 30, 31.6, 32),
      am9960Hz: band(28, 28.4, 30, 31.6, 32),
      ident1020Hz: band(6, 6.4, 8, 9.6, 10),
      rfLevel: band(-3, -2.4, 0, 2.4, 3),
      distortion9960Hz: band(null, null, 0, 80, 100, "secondary"),
      carrierFrequency: band(112.99887, 112.99921, 113, 113.00079, 113.00113, "secondary"),
      subcarrierFrequency: band(9955, 9957, 9960, 9963, 9965, "secondary"),
    },
  };
}

function createTransmitterConfiguration(): Dvor220Configuration["transmitters"][Dvor220TransmitterId] {
  return {
    carrierScalePercent: 100,
    sidebandPowerW: {
      usbCos: 1,
      usbSin: 1,
      lsbCos: 1,
      lsbSin: 1,
    },
    rfPhaseDeg: {
      usbCosToSin: 176,
      lsbCosToSin: 130,
      carrierToSideband: 123,
    },
    standbyRfPhaseDeg: {
      usbCosToSin: 119,
      lsbCosToSin: 160,
      carrierToSideband: 110,
    },
    useStationModulation: true,
    useStationAzimuth: true,
    useStationIdent: true,
    am30HzPercent: 30,
    identModulationPercent: 8,
    voiceModulationPercent: 0,
    azimuthOffsetDeg: 0,
    identCode: "MOP",
    identKeyer: "independent",
    identSync: "code",
  };
}

export function createDefaultDvor220Configuration(): Dvor220Configuration {
  const channels = Object.fromEntries(
    DVOR220_MONITOR_CHANNEL_IDS.map((channelId) => [channelId, createMonitorChannel(channelId)]),
  ) as Dvor220Configuration["monitor"]["channels"];

  return {
    station: {
      stationName: "S/N: 0002 New DVOR",
      equipmentVersion: "dual",
      frequencyMHz: 113,
      carrierPowerW: 100,
      am30HzPercent: 30,
      identModulationPercent: 8,
      voiceModulationPercent: 0,
      azimuthOffsetDeg: 0,
      identCode: "MOP",
      identKeyer: "independent",
      identSync: "code",
      playbackSource: "on-antenna",
      standbyMode: "hot",
      bypassMonitorsOnBoot: true,
      transmitterOutputOnBoot: true,
    },
    transmitters: {
      tx1: createTransmitterConfiguration(),
      tx2: {
        ...createTransmitterConfiguration(),
        rfPhaseDeg: {
          usbCosToSin: 135,
          lsbCosToSin: 57.5,
          carrierToSideband: 206,
        },
        standbyRfPhaseDeg: {
          usbCosToSin: 90,
          lsbCosToSin: 82,
          carrierToSideband: 35,
        },
      },
    },
    transmitterLimits: {
      carrierPower: band(10, 15, 100, 110, 120),
      sidebandPower: band(0.3, 0.7, 1, 1.4, 3),
      vswrUpperWarning: 1.7,
      vswrUpperAlarm: 2.5,
    },
    thermal: {
      tx1: {
        fanMode: "auto",
        fanStartC: 40,
        fanStopC: 35,
        shutdownC: { cma: 95, usb: 95, lsb: 95 },
        restartC: { cma: 80, usb: 80, lsb: 80 },
      },
      tx2: {
        fanMode: "auto",
        fanStartC: 40,
        fanStopC: 35,
        shutdownC: { cma: 95, usb: 95, lsb: 95 },
        restartC: { cma: 80, usb: 80, lsb: 80 },
      },
    },
    monitor: {
      votingLogic: "AND",
      executiveAlarmDelayMs: 12_000,
      postChangeoverHoldoffMs: 15_000,
      powerOnHoldoffMs: 15_000,
      measurementAverageCount: 10,
      warningRangePercent: 80,
      dcdcAlarmSeverity: "secondary",
      identCodeAlarmSeverity: "secondary",
      identCodeAlarmDelayMs: 20_000,
      channels,
      rfGainDb: {
        mon1: { cha: -26.5, chb1: -27.5, chb2: -28, standby: -31.5, tsg: -30.5 },
        mon2: { cha: -25.5, chb1: -26.5, chb2: -27, standby: -31.5, tsg: -30.5 },
      },
    },
    system: {
      allowSimultaneousLogin: true,
      allowGuestAccess: false,
      automaticLogoutMinutes: 60,
      identWhenMonitorBypassed: "no-change",
      settingsOnlyWhenMonitorBypassed: true,
      settingsOnlyAtLocal: false,
      shutdownOnRcuFault: false,
      shutdownOnLmiFault: false,
      shutdownOnCspFault: false,
      controlFaultShutdownDelayMs: 3_000,
    },
    communication: {
      remoteConnectionLimit: 8,
      localConnectionLimit: 1,
      pmdtRs232BaudRate: 115_200,
      scuRemote: {
        scu1: { type: "rs232", baudRate: 115_200, flowControl: false },
        scu2: { type: "rs232", baudRate: 57_600, flowControl: false },
      },
      rcuLineType: "ethernet",
      localIpStart: "172.16.1.5",
      localIpEnd: "172.16.1.253",
    },
    battery: {
      voltageWarningV: 22,
      voltageAlarmV: 21,
      temperatureWarningC: 40,
      temperatureAlarmC: 50,
      chargingCurrentA: 10,
      cutoffVoltageV: 20,
      backupRuntimeMinutes: 240,
    },
    optionalUnits: {
      emu: true,
      niu: true,
      vau: false,
      battery: true,
      standbyMonitor: true,
    },
  };
}

function unitFactors<T extends string>(ids: readonly T[]): Record<T, number> {
  return Object.fromEntries(ids.map((id) => [id, 1])) as Record<T, number>;
}

function createCalibrationState(): Dvor220CalibrationState {
  const channelOffsets = Object.fromEntries(
    DVOR220_MONITOR_CHANNEL_IDS.map((channelId) => [channelId, {}]),
  ) as Record<Dvor220MonitorChannelId, Partial<Record<Dvor220MonitorParameter, number>>>;

  return {
    transmitterReadingFactors: {
      tx1: unitFactors(DVOR220_RF_OUTPUT_IDS),
      tx2: unitFactors(DVOR220_RF_OUTPUT_IDS),
    },
    transmitterSetpointFactors: {
      tx1: unitFactors([...DVOR220_RF_OUTPUT_IDS, "am30Hz", "ident1020Hz"] as const),
      tx2: unitFactors([...DVOR220_RF_OUTPUT_IDS, "am30Hz", "ident1020Hz"] as const),
    },
    monitorOffsets: Object.fromEntries(
      DVOR220_MONITOR_IDS.map((monitorId) => [monitorId, structuredClone(channelOffsets)]),
    ) as Dvor220CalibrationState["monitorOffsets"],
  };
}

function createTransmitterRuntime(
  transmitterId: Dvor220TransmitterId,
  configuration: Dvor220Configuration,
) {
  const hotStandby = configuration.station.standbyMode === "hot";
  const outputOn = configuration.station.transmitterOutputOnBoot;
  const isMain = transmitterId === "tx1";
  const installed = transmitterId === "tx1" || configuration.station.equipmentVersion === "dual";
  const powerOn = installed && (isMain || hotStandby);
  return {
    powerOn,
    designation: isMain ? "main" as const : "standby" as const,
    path: !installed ? "disconnected" as const : isMain ? "antenna" as const : powerOn ? "load" as const : "disconnected" as const,
    rfOutputs: Object.fromEntries(
      DVOR220_RF_OUTPUT_IDS.map((output) => [output, installed && powerOn && outputOn]),
    ) as Record<Dvor220RfOutputId, boolean>,
    temperaturesC: { cma: 35.5, usb: 34.1, lsb: 34.3 },
    thermalTrips: { cma: false, usb: false, lsb: false },
    fanOn: false,
    reverseFaultLatched: false,
  };
}

export interface CreateDvor220StateOptions {
  nowMs?: number;
  configuration?: Dvor220Configuration;
}

export function createInitialDvor220State(
  options: CreateDvor220StateOptions = {},
): Dvor220DeviceState {
  const nowMs = options.nowMs ?? Date.now();
  const configuration = cloneDvor220(options.configuration ?? createDefaultDvor220Configuration());
  const batteryCapacityMs = minutes(configuration.battery.backupRuntimeMinutes);

  return {
    nowMs,
    keylock: "LOCAL",
    connection: {
      connected: false,
      profile: null,
      connectedAtMs: null,
      txActive: false,
      rxActive: false,
    },
    accounts: [{ username: "Administrator", password: "1234", level: 3 }],
    session: {
      username: null,
      level: 0,
      loggedInAtMs: null,
      lastActivityAtMs: null,
      failedLoginCount: 0,
    },
    configuration: {
      draft: cloneDvor220(configuration),
      running: cloneDvor220(configuration),
      flash: cloneDvor220(configuration),
      draftDirty: false,
      flashDirty: false,
    },
    transmitters: {
      tx1: createTransmitterRuntime("tx1", configuration),
      tx2: createTransmitterRuntime("tx2", configuration),
    },
    monitors: {
      mon1: { bypassRequested: configuration.station.bypassMonitorsOnBoot },
      mon2: { bypassRequested: configuration.station.bypassMonitorsOnBoot },
    },
    power: {
      acAvailable: true,
      source: "ac",
      batteryPresent: configuration.optionalUnits.battery,
      batteryRemainingMs: batteryCapacityMs,
      batteryCapacityMs,
      batteryVoltageV: 26.4,
      batteryTemperatureC: 25,
      batteryCurrentA: 0,
      charging: false,
    },
    environment: {
      temperatureC: 24,
      smoke: false,
      intrusion: false,
      analogInputsV: Array.from({ length: 8 }, () => 0),
      digitalInputs: Array.from({ length: 16 }, () => false),
      expansionDigitalInputs: Array.from({ length: 8 }, () => false),
    },
    faults: [],
    measurementOverrides: [],
    calibration: createCalibrationState(),
    groundCheck: {
      status: "idle",
      transmitterId: null,
      startedAtMs: null,
      completesAtMs: null,
      points: [],
      withinTolerance: null,
    },
    executive: {
      phase: "idle",
      pendingSinceMs: null,
      powerOnHoldoffUntilMs: configuration.monitor.powerOnHoldoffMs > 0
        ? nowMs + configuration.monitor.powerOnHoldoffMs
        : null,
      postChangeoverUntilMs: null,
      shutdownLockedUntilMs: null,
      changeoverCountSinceReset: 0,
      changeoverFlag: false,
      shutdownReason: null,
    },
    history: {
      pmdt: [],
      lmi: [],
      parameterChanges: [],
      nextId: 1,
    },
  };
}

export function cloneDvor220<T>(value: T): T {
  return structuredClone(value);
}

export function createDvor220MonitorIdRecord<T>(factory: (id: Dvor220MonitorId) => T): Record<Dvor220MonitorId, T> {
  return Object.fromEntries(DVOR220_MONITOR_IDS.map((id) => [id, factory(id)])) as Record<Dvor220MonitorId, T>;
}
