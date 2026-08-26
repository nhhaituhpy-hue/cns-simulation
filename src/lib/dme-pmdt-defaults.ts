import type {
  DmeAlarmLimitRow,
  DmeAlarmLogEntry,
  DmeDecoderResultRow,
  DmeDualValueRow,
  DmeMaintenanceLogEntry,
  DmeMonitorOffsetRow,
  DmePmdtData,
  DmeDigitalInput,
  DmeDigitalOutput,
  DmeDualIndicatorRow,
  DmeSecurityAccount,
  Dme1119aSimulationFaults,
} from "./dme-types";

/** Default accounts documented for a fresh 1118A/1119A RMS installation. */
export const defaultDmeSecurityAccounts: DmeSecurityAccount[] = [
  { userId: "GUEST", password: "", securityLevel: 1 },
  { userId: "SEC2", password: "TWO", securityLevel: 2 },
  { userId: "SEC3", password: "THREE", securityLevel: 3 },
  { userId: "SEC4", password: "FOUR", securityLevel: 4 },
];

export function createDefaultDme1119aSimulationFaults(): Dme1119aSimulationFaults {
  return {
    transmitters: {
      tx1: {
        powerLossDb: 0,
        replyDelayDriftUs: 0,
        pulseSpacingDriftUs: 0,
        frequencyErrorPpm: 0,
        hpaFault: false,
        rtcCommFault: false,
        antennaVswr: null,
      },
      tx2: {
        powerLossDb: 0,
        replyDelayDriftUs: 0,
        pulseSpacingDriftUs: 0,
        frequencyErrorPpm: 0,
        hpaFault: false,
        rtcCommFault: false,
        antennaVswr: null,
      },
    },
    identSignal: "normal",
    temperature: {},
    acPowerFailed: false,
  };
}

const alarmTrendRecords = [
  ["07/29/26 00:18:35", "Monitor 1"], ["07/28/26 23:21:39", "Monitor 2"],
  ["07/27/26 19:21:23", "Monitor 2"], ["07/27/26 18:13:34", "Monitor 2"],
  ["07/26/26 03:40:32", "Monitor 2"], ["07/26/26 04:39:58", "Monitor 1"],
  ["07/25/26 18:46:06", "Monitor 2"], ["07/24/26 03:40:14", "Monitor 1"],
  ["07/23/26 17:02:43", "Monitor 1"], ["07/21/26 01:44:04", "Monitor 1"],
  ["07/20/26 21:23:06", "Monitor 2"], ["07/19/26 16:59:17", "Monitor 1"],
  ["07/18/26 01:24:07", "Monitor 2"], ["07/14/26 10:47:50", "Monitor 2"],
  ["07/12/26 23:28:46", "Monitor 1"], ["07/12/26 09:24:02", "Monitor 2"],
  ["07/10/26 14:31:51", "Monitor 1"], ["05/26/26 23:32:56", "Monitor 1"],
  ["05/26/26 21:45:11", "Monitor 2"], ["05/26/26 03:00:36", "Monitor 1"],
  ["05/24/26 01:59:09", "Monitor 1"], ["05/22/26 11:18:49", "Monitor 2"],
  ["05/19/26 23:57:48", "Monitor 2"], ["05/19/26 11:26:54", "Monitor 1"],
  ["05/18/26 11:47:48", "Monitor 2"], ["05/18/26 06:55:00", "Monitor 2"],
] as const;

export const defaultDmeAlarmLogs: DmeAlarmLogEntry[] = Array.from({ length: 151 }, (_, index) => {
  const [timeTag, type] = alarmTrendRecords[index % alarmTrendRecords.length];
  return { timeTag, type, alarm: "Integral Tx Power", state: "Primary Alarm Low" };
});

const maintenanceTrendRecords = [
  ["05/02/24 21:22:17", "Transmitter Data", "Unknown: 129", "Normal"],
  ["05/02/24 21:22:02", "Transmitter Data", "Unknown: 142", "Alert"],
  ["05/02/24 21:22:01", "Digital Input", "Unknown: 132", "Alert"],
  ["05/02/24 21:22:00", "Transmitter Data", "Unknown: 128", "Alert"],
  ["05/02/24 21:21:58", "Digital Input", "Unknown: 128", "Alert"],
  ["05/02/24 21:21:57", "Transmitter Data", "Unknown: 130", "Alert"],
  ["05/02/24 21:21:57", "General", "AC Failure", "Alert"],
  ["04/05/24 16:44:43", "Transmitter Data", "Unknown: 130", "Alert"],
  ["04/04/24 18:08:48", "Transmitter Data", "Unknown: 130", "Alert"],
  ["04/03/24 22:44:40", "Transmitter Data", "Unknown: 130", "Alert"],
  ["04/02/24 17:18:35", "Digital Input", "Unknown: 130", "Alert"],
  ["04/03/24 04:57:58", "Digital Input", "Unknown: 130", "Alert"],
  ["03/28/24 06:17:39", "Transmitter Data", "Unknown: 130", "Alert"],
  ["03/27/24 03:22:12", "Transmitter Data", "Unknown: 130", "Alert"],
  ["03/27/24 21:31:35", "Transmitter Data", "Unknown: 130", "Alert"],
  ["03/25/24 10:45:13", "Transmitter Data", "Unknown: 130", "Alert"],
  ["03/25/24 10:00:52", "Digital Input", "Unknown: 130", "Alert"],
  ["03/22/24 04:54:29", "Digital Input", "Unknown: 130", "Alert"],
  ["03/18/24 09:14:47", "Digital Input", "Unknown: 130", "Alert"],
  ["03/18/24 06:55:21", "Transmitter Data", "Unknown: 130", "Alert"],
  ["03/17/24 18:21:33", "Digital Input", "Unknown: 130", "Alert"],
  ["03/17/24 03:57:56", "Transmitter Data", "Unknown: 130", "Alert"],
  ["03/17/24 03:04:35", "Transmitter Data", "Unknown: 130", "Alert"],
  ["03/16/24 13:44:26", "Digital Input", "Unknown: 130", "Alert"],
  ["03/16/24 06:09:53", "Transmitter Data", "Unknown: 130", "Alert"],
] as const;

export const defaultDmeMaintenanceLogs: DmeMaintenanceLogEntry[] = Array.from({ length: 81 }, (_, index) => {
  const [timeTag, type, alert, state] = maintenanceTrendRecords[index % maintenanceTrendRecords.length];
  return { timeTag, type, alert, state };
});

export const defaultDmeDigitalInputs: DmeDigitalInput[] = [
  { name: "Smoke Detector", configuration: "Disabled", status: "" },
  { name: "Intrusion Detector", configuration: "Disabled", status: "" },
  { name: "Spare Input 1", configuration: "Not Present", status: "" },
  { name: "Spare Input 2", configuration: "Not Present", status: "" },
  { name: "Spare Input 3", configuration: "Not Present", status: "" },
  { name: "Spare Input 4", configuration: "Not Present", status: "" },
];

export const defaultDmeDigitalOutputs: DmeDigitalOutput[] = [
  { name: "Battery Charger", status: "Off", altStatus: "Trickle" },
  { name: "Spare Output 1", status: "Low" },
  { name: "Spare Output 2", status: "Low" },
  { name: "Spare Output 3", status: "Low" },
  { name: "Spare Output 4", status: "Low" },
  { name: "Fan Control", status: "Automatic - Off" },
];

export const defaultDmeSystemPowerStatus: DmeDualIndicatorRow[] = [
  { name: "Battery Fault", tx1: "green", tx2: "green" },
  { name: "On Battery", tx1: "green", tx2: "green" },
  { name: "LVPS", tx1: "green", tx2: "green" },
  { name: "RMS", tx1: "green", tx2: "gray" },
  { name: "Facilities", tx1: "green", tx2: "gray" },
  { name: "Test Generator", tx1: "green", tx2: "gray" },
  { name: "LCU", tx1: "green", tx2: "gray" },
];

export const defaultDmeTxAlerts: DmeDualIndicatorRow[] = [
  { name: "Carrier VSWR", tx1: "green", tx2: "green" },
  { name: "Carrier Overtemp", tx1: "green", tx2: "green" },
  { name: "Carrier Overpower", tx1: "green", tx2: "green" },
];

export const defaultDmeIntegralData: DmeDualValueRow[] = [
  { label: "Delay", mon1Value: "49.99", mon1Status: "normal", mon2Value: "50.00", mon2Status: "normal", unit: "us" },
  { label: "Spacing", mon1Value: "11.98", mon1Status: "normal", mon2Value: "11.98", mon2Status: "normal", unit: "us" },
  { label: "Tx Power", mon1Value: "1011", mon1Status: "normal", mon2Value: "1033", mon2Status: "normal", unit: "Watts" },
  { label: "ERP", mon1Value: "0.0", mon1Status: "normal", mon2Value: "0.0", mon2Status: "normal", unit: "dB" },
  { label: "Efficiency", mon1Value: "100.0", mon1Status: "normal", mon2Value: "99.5", mon2Status: "normal", unit: "%" },
  { label: "PRF", mon1Value: "792", mon1Status: "normal", mon2Value: "798", mon2Status: "normal", unit: "ppps" },
  { label: "Tx Frequency", mon1Value: "1203.996", mon1Status: "gray", mon2Value: "1203.996", mon2Status: "gray", unit: "MHz" },
  { label: "Tx Frequency Error", mon1Value: "-2", mon1Status: "normal", mon2Value: "-2", mon2Status: "normal", unit: "ppm" },
  { label: "Rx LO Frequency", mon1Value: "1015.991", mon1Status: "gray", mon2Value: "1015.991", mon2Status: "gray", unit: "MHz" },
  { label: "Rx LO Frequency Error", mon1Value: "2", mon1Status: "normal", mon2Value: "2", mon2Status: "normal", unit: "ppm" },
  { label: "Rx Frequency", mon1Value: "1140.991", mon1Status: "gray", mon2Value: "1140.991", mon2Status: "gray", unit: "MHz" },
  { label: "VSWR", mon1Value: "1.3", mon1Status: "normal", mon2Value: "1.3", mon2Status: "normal", unit: ":1" },
  { label: "Ident Status", mon1Value: "Normal", mon1Status: "green", mon2Value: "Normal", mon2Status: "green", unit: "" },
  { label: "Ident Code", mon1Value: "TST", mon1Status: "green", mon2Value: "TST", mon2Status: "green", unit: "" },
];

export const defaultDmeStandbyData: DmeDualValueRow[] = [
  { label: "Delay", mon1Value: "50.01", mon1Status: "normal", mon2Value: "50.01", mon2Status: "normal", unit: "us" },
  { label: "Spacing", mon1Value: "11.99", mon1Status: "normal", mon2Value: "11.99", mon2Status: "normal", unit: "us" },
  { label: "Tx Power", mon1Value: "968", mon1Status: "normal", mon2Value: "963", mon2Status: "normal", unit: "Watts" },
  { label: "Efficiency", mon1Value: "100.0", mon1Status: "normal", mon2Value: "100.0", mon2Status: "normal", unit: "%" },
  { label: "PRF", mon1Value: "819", mon1Status: "normal", mon2Value: "810", mon2Status: "normal", unit: "ppps" },
  { label: "Tx Frequency", mon1Value: "1203.996", mon1Status: "gray", mon2Value: "1204.001", mon2Status: "gray", unit: "MHz" },
  { label: "Tx Frequency Error", mon1Value: "-2", mon1Status: "normal", mon2Value: "1", mon2Status: "normal", unit: "ppm" },
  { label: "Rx LO Frequency", mon1Value: "1015.978", mon1Status: "gray", mon2Value: "1015.982", mon2Status: "gray", unit: "MHz" },
  { label: "Rx LO Frequency Error", mon1Value: "-10", mon1Status: "normal", mon2Value: "-7", mon2Status: "normal", unit: "ppm" },
  { label: "Rx Frequency", mon1Value: "1140.978", mon1Status: "gray", mon2Value: "1140.982", mon2Status: "gray", unit: "MHz" },
  { label: "Ident Status", mon1Value: "Normal", mon1Status: "green", mon2Value: "Normal", mon2Status: "green", unit: "" },
  { label: "Ident Code", mon1Value: "TST", mon1Status: "green", mon2Value: "TST", mon2Status: "green", unit: "" },
];

export const defaultDmeAlarmLimits: DmeAlarmLimitRow[] = [
  { parameter: "Delay", alarmLow: -0.4, preAlarmLow: -0.32, nominal: 50, preAlarmHigh: 0.32, alarmHigh: 0.4, unit: "us" },
  { parameter: "Spacing", alarmLow: -0.4, preAlarmLow: -0.32, nominal: 12, preAlarmHigh: 0.32, alarmHigh: 0.4, unit: "us" },
  { parameter: "Tx Power", alarmLow: 500, preAlarmLow: 550, nominal: 1000, preAlarmHigh: 1225, alarmHigh: 1250, unit: "Watts" },
  { parameter: "ERP", alarmLow: -3, preAlarmLow: -2.7, nominal: 0, preAlarmHigh: 0.9, alarmHigh: 1, unit: "dB" },
  { parameter: "Efficiency", alarmLow: 60, preAlarmLow: 73, nominal: 100, preAlarmHigh: null, alarmHigh: null, unit: "%" },
  { parameter: "PRF", alarmLow: 720, preAlarmLow: 730, nominal: 800, preAlarmHigh: 6000, alarmHigh: 6000, unit: "ppps" },
  { parameter: "Tx Frequency Error", alarmLow: -20, preAlarmLow: -18, nominal: 0, preAlarmHigh: 18, alarmHigh: 20, unit: "ppm" },
  { parameter: "Rx Frequency Error", alarmLow: -20, preAlarmLow: -18, nominal: 0, preAlarmHigh: 18, alarmHigh: 20, unit: "ppm" },
  { parameter: "VSWR", alarmLow: null, preAlarmLow: null, nominal: 1.1, preAlarmHigh: 3, alarmHigh: 4, unit: ":1" },
];

const decoderTemplate: DmeDecoderResultRow[] = [
  { parameter: "Receiver Sensitivity @ 12.0 us (R)", lowLimit: -97, data: -94.1, highLimit: -91, unit: "dBm", result: "Updated" },
  { parameter: "Spacing 13.0 us @ -93.1 dBm (R + 1dB)", lowLimit: 70, data: 88, highLimit: 100, unit: "%", result: "Updated" },
  { parameter: "Spacing 12.5 us @ -93.1 dBm (R + 1dB)", lowLimit: 70, data: 96.8, highLimit: 100, unit: "%", result: "Updated" },
  { parameter: "Spacing 11.5 us @ -93.1 dBm (R + 1dB)", lowLimit: 70, data: 100, highLimit: 100, unit: "%", result: "Updated" },
  { parameter: "Spacing 11.0 us @ -93.1 dBm (R + 1dB)", lowLimit: 70, data: 88, highLimit: 100, unit: "%", result: "Updated" },
  { parameter: "RF +200 kHz @ -91.1 dBm (R + 3dB)", lowLimit: 70, data: 95.9, highLimit: 100, unit: "%", result: "Updated" },
  { parameter: "RF -200 kHz @ -91.1 dBm (R + 3dB)", lowLimit: 70, data: 94, highLimit: 100, unit: "%", result: "In Process" },
  { parameter: "RF +900 kHz @ -10 dBm", lowLimit: 0, data: 0, highLimit: 5, unit: "%", result: "In Process" },
  { parameter: "RF -900 kHz @ -10 dBm", lowLimit: 0, data: 0, highLimit: 5, unit: "%", result: "In Process" },
  { parameter: "Spacing 9.0 us @ -17.1 dBm (R + 77dB)", lowLimit: 0, data: 0, highLimit: 5, unit: "%", result: "In Process" },
  { parameter: "Spacing 10.0 us @ -10 dBm", lowLimit: 0, data: 0, highLimit: 5, unit: "%", result: "In Process" },
  { parameter: "Spacing 14.0 us @ -10 dBm", lowLimit: 0, data: 0, highLimit: 5, unit: "%", result: "In Process" },
  { parameter: "Spacing 15.0 us @ -17.1 dBm (R + 77dB)", lowLimit: 0, data: 0, highLimit: 5, unit: "%", result: "In Process" },
];

export const defaultDmeMonitorOffsets: DmeMonitorOffsetRow[] = [
  { parameter: "Delay Offset", integral: 0, standby: 0, unit: "us" },
  { parameter: "Spacing Offset", integral: 0, standby: 0, unit: "us" },
  { parameter: "Tx Power Scale", integral: null, standby: 175, unit: "%" },
  { parameter: "Tx Power Offset", integral: null, standby: 0, unit: "Watts" },
  { parameter: "Efficiency Offset", integral: 0, standby: 0, unit: "%" },
  { parameter: "PRF Offset", integral: 0, standby: 0, unit: "ppps" },
  { parameter: "Tx Frequency Offset", integral: 0, standby: 0, unit: "ppm" },
  { parameter: "Rx Frequency Offset", integral: 10, standby: 10, unit: "ppm" },
  { parameter: "ERP Offset", integral: 0.3, standby: null, unit: "dB" },
  { parameter: "Return Loss Offset", integral: -0.4, standby: null, unit: "dB" },
];

export const defaultDmePmdtData: DmePmdtData = {
  connected: true,
  alert: false,
  manualAlertOverride: false,
  simulationFaults: createDefaultDme1119aSimulationFaults(),
  local: false,
  timestamp: "08/09/26 09:10:05",
  transmitters: {
    tx1: { main: "green", antenna: "green", load: "gray", off: "gray" },
    // The reference dual-equipment PMDT screen keeps the standby transmitter
    // powered and routed to the load; it is not shown as Off.
    tx2: { main: "gray", antenna: "gray", load: "green", off: "gray" },
  },
  monitors: {
    integral: { normal: true, priAlarm: false, secAlarm: false, bypass: false },
    standby: { normal: true, priAlarm: false, secAlarm: false, bypass: false },
  },
  sidebarParams: {
    delay: { value: 49.99, status: "normal", digits: 2 },
    spacing: { value: 11.97, status: "normal", digits: 2 },
    txPower: { value: 1013, status: "normal", digits: 0 },
    erp: { value: 0.0, status: "normal", digits: 1 },
    efficiency: { value: 100, status: "normal", digits: 1 },
    prf: { value: 804, status: "normal", digits: 0 },
  },
  rmsStatus: {
    logonLevel: 3,
    localControlMode: false,
    maintenanceAlert: false,
    onBattery: false,
    acFailure: false,
    remoteControlEnabled: true,
    interlocked: false,
    rcsuConnectionEnabled: true,
    rcsuCommunicationError: false,
    approachType: "Primary",
    audioSelect: "tx1",
    fanControl: "Automatic",
  },
  revisionLevels: { rms: "3.1", monitor1: "3.0.0.5", monitor2: "3.0.0.5", rtc1: "3.1", rtc2: "3.1", bcps1: "1.6", bcps2: "1.6", lcu: "1.1" },
  monitorTransmitterStatus: {
    monitorAlarmShutdown: false,
    enabledMonitors: { monitor1: true, monitor2: true },
    antennaSelect: 1,
    mainSelect: 1,
    transmitterOn: { tx1: true, tx2: true },
  },
  monitorTrigger: { monitor1: "Integral Delay", monitor2: "Integral Delay" },
  identMode: "normal",
  alarmLogs: defaultDmeAlarmLogs,
  maintenanceLogs: defaultDmeMaintenanceLogs,
  integralData: defaultDmeIntegralData,
  standbyData: defaultDmeStandbyData,
  alarmLimits: defaultDmeAlarmLimits,
  monitorTimers: { integralShutdownDelay: 7, standbyShutdownDelay: 7, continuousIdent: 5, noIdent: 65 },
  monitorSystemSettings: { efficiencyCertificationLevel: 70, monitor1ReplyAttenuation: 22, monitor2ReplyAttenuation: 22, directionalCouplerLoss: -29.67 },
  decoderResults: { monitor1: decoderTemplate, monitor2: decoderTemplate.map((row) => ({ ...row })) },
  monitorOffsets: { monitor1: defaultDmeMonitorOffsets, monitor2: defaultDmeMonitorOffsets.map((row) => ({ ...row })) },
  paStatus: [
    { name: "LPA #1", vswr: "green", longPulseFault: "green", powerSupply: "green", outputPower: "green", rmsTemperature: "green", userEnabled: "green", rmsRtcEnabled: "green", control: "Off" },
    { name: "LPA #2", vswr: "green", longPulseFault: "green", powerSupply: "green", outputPower: "green", rmsTemperature: "green", userEnabled: "green", rmsRtcEnabled: "green", control: "Off" },
    { name: "HPA #1", vswr: "green", longPulseFault: "green", powerSupply: "green", outputPower: "green", rmsTemperature: "green", userEnabled: "green", rmsRtcEnabled: "green", control: "Off" },
    { name: "HPA #2", vswr: "green", longPulseFault: "green", powerSupply: "green", outputPower: "green", rmsTemperature: "green", userEnabled: "green", rmsRtcEnabled: "green", control: "Off" },
  ],
  txStatus: { commFault: { tx1: false, tx2: false }, maintenanceAlert: { tx1: false, tx2: false } },
  rtcMaintenanceAlerts: [
    "RTC ROM Fault", "RTC RAM Fault", "RTC Functional Fault", "RTC EEPROM Fault", "RTC Rx Synth Unlock", "RTC Tx Synth Unlock", "RTC DAC Fault", "Monitor Comm Fault", "Monitor VSWR Fault", "Tx Enabled",
  ].map((label) => ({ label, tx1: "green" as const, tx2: "green" as const })),
  rtcStatus: { commFault: { tx1: false, tx2: false }, overload: { tx1: false, tx2: false }, cpuShutdown: { tx1: "Normal", tx2: "Normal" } },
  trafficLoad: [
    { band: "> -30 dBm", tx1: 0, tx2: 0 },
    { band: "-30 to -50 dBm", tx1: 23, tx2: 23 },
    { band: "-50 to -70 dBm", tx1: 80, tx2: 0 },
    { band: "< -70 dBm", tx1: 178, tx2: 71 },
    { band: "Total Replies", tx1: 281, tx2: 94 },
    { band: "Monitor Replies", tx1: 97, tx2: 94 },
  ],
  delayControl: {
    // Normal operation is automatic delay correction.  The manual only
    // raises a maintenance alert after the operator selects Fixed.
    rtc1: { low: 9.04, propagationDelay: 9.62, high: 10.04, fixed: false },
    rtc2: { low: 9.04, propagationDelay: 9.46, high: 10.04, fixed: false },
  },
  // The supplied PMDT capture is calibrated at -94 dBm.  Manual §6.4.5.1
  // also permits the 100 W/1000 W station defaults (-82/-87 dBm); those are
  // operator-selectable within the same -94..-72 dBm usable range.  Keep the
  // capture baseline here so the reference screens remain stable.
  txConfigNominal: {
    rtcParameters: { powerOutput: -1, minimumSquitter: 800, maximumPrf: 5400, ldesWindow: 150, ldesThreshold: -70, deadTime: 60, replyDelayOffset: 0, rxSensitivity: -94, nominalPropagationDelay: 9.54, maxPropagationVariance: 0.5, standbyPropagationOffset: 0 },
    operation: { timing: "1st Pulse", squitterEnabled: true, sdesEnabled: false, ldesEnabled: false, equalizationPulsesEnabled: true },
    powerAmplifiers: { lowOutputPowerAlertLimit: 15, hpa1Enabled: true, hpa2Enabled: true },
    ident: {
      keyerIo: "Active High/Open",
      windowedKeying: false,
      keyerSource: "Internal Keying",
      selfKeyOnLoss: false,
      shutdownOnLoss: false,
      restartWhenSignalResumes: false,
      primaryIdentCode: "TST",
      secondaryIdentEnabled: true,
      secondaryIdentCode: "TST",
      standbyIdent: "Same as Main Ident",
    },
  },
  txOffsets: [
    { parameter: "Power Output Scale", tx1: 51.3, tx2: 53.4, unit: "%" },
    { parameter: "Rx Sensitivity Offset", tx1: 0, tx2: 0, unit: "dB" },
    { parameter: "Base Offset", tx1: 0, tx2: 0, unit: "us" },
  ],
  rmsVoltageData: [
    { parameter: "+3.3 VDC", low: 3.14, preLow: 3.14, volts: 3.32, preHigh: 3.46, high: 3.46 },
    { parameter: "+5 VDC", low: 4.75, preLow: 4.75, volts: 5.01, preHigh: 5.25, high: 5.25 },
    { parameter: "+12 VDC Alg", low: 10.80, preLow: 10.80, volts: 11.90, preHigh: 13.20, high: 13.20 },
    { parameter: "-12 VDC Alg", low: -13.20, preLow: -13.20, volts: -12.27, preHigh: -10.80, high: -10.80 },
    { parameter: "+12 VDC Dig", low: 10.80, preLow: 10.80, volts: 11.79, preHigh: 13.20, high: 13.20 },
    { parameter: "-12 VDC Dig", low: -13.20, preLow: -13.20, volts: -12.25, preHigh: -10.80, high: -10.80 },
    { parameter: "+15 VDC", low: 13.50, preLow: 13.50, volts: 15.00, preHigh: 16.50, high: 16.50 },
    { parameter: "-15 VDC", low: -16.50, preLow: -16.50, volts: -15.02, preHigh: -13.50, high: -13.50 },
    { parameter: "+24 VDC", low: 21.6, preLow: 21.6, volts: 23.5, preHigh: 26.4, high: 26.4 },
    { parameter: "AC Input", low: 180.0, preLow: 180.0, volts: 235.2, preHigh: 260.0, high: 260.0 },
    { parameter: "OB Light", low: 180.0, preLow: 180.0, volts: 0.0, preHigh: 260.0, high: 260.0 },
    { parameter: "Tx 1 48 V PS", low: 46.6, preLow: 46.6, volts: 49.6, preHigh: 54.4, high: 54.4 },
    { parameter: "Tx 2 48 V PS", low: 46.6, preLow: 46.6, volts: 49.7, preHigh: 54.4, high: 54.4 },
    { parameter: "Battery 1", low: 42.0, preLow: 42.0, volts: 54.2, preHigh: 60.0, high: 60.0 },
    { parameter: "Battery 2", low: 42.0, preLow: 42.0, volts: 54.2, preHigh: 60.0, high: 60.0 },
  ].map((row) => ({ ...row, enabled: false })),
  rmsCurrentData: [
    { parameter: "AC Input", low: 1.0, preLow: 1.0, amps: 1.2, preHigh: 7.0, high: 7.0 },
    { parameter: "OB Light", low: 0.0, preLow: 0.0, amps: 0.0, preHigh: 20.0, high: 20.0 },
    { parameter: "Tx 1 48 V PS", low: 0.5, preLow: 0.5, amps: 1.7, preHigh: 15.0, high: 15.0 },
    { parameter: "Tx 2 48 V PS", low: 0.5, preLow: 0.5, amps: 1.5, preHigh: 15.0, high: 15.0 },
    { parameter: "Battery 1", low: -6.0, preLow: -6.0, amps: 0.0, preHigh: 10.0, high: 10.0 },
    { parameter: "Battery 2", low: -6.0, preLow: -6.0, amps: 0.0, preHigh: 10.0, high: 10.0 },
  ].map((row) => ({ ...row, enabled: false })),
  bcpsCommFaults: { bcps1: false, bcps2: false },
  bcpsChargerEnabled: { bcps1: false, bcps2: false },
  rmsTemperatureData: [
    { parameter: "Cabinet Temperature", low: 0, preLow: 0, value: 17, preHigh: 40, high: 40 },
    { parameter: "External Temperature", low: -25, preLow: -25, value: -25, preHigh: 70, high: 70 },
    { parameter: "LPA #1 Temperature", low: null, preLow: null, value: 35, preHigh: 60, high: 80 },
    { parameter: "LPA #2 Temperature", low: null, preLow: null, value: 31, preHigh: 60, high: 80 },
    { parameter: "HPA #1 Temperature", low: null, preLow: null, value: 33, preHigh: 60, high: 80 },
    { parameter: "HPA #2 Temperature", low: null, preLow: null, value: 33, preHigh: 60, high: 80 },
  ].map((row) => ({ ...row, enabled: false })),
  rmsAdData: [0, 0, 0, -0.01, 0, 0, 0, 0, 0, 0].map((volts, i) => ({
    parameter: `Spare A/D ${i + 1}`,
    enabled: false,
    low: -5.00,
    preLow: -5.00,
    volts,
    preHigh: 5.00,
    high: 5.00,
  })),
  rmsConfigGeneral: {
    monitorIntegrityTestsEnabled: true,
    votingLogic: "AND",
    transfer: "on Primary Alarm",
    automaticRestartsEnabled: false,
    firstRestartDelay: 50,
    numberOfAutomaticRestarts: 2,
    rcsuPresent: true,
    rcsuConnectionType: "Dedicated Modem",
    interlockControl: "Not Applicable",
    spiFilterType: "Normal",
    smokeAlarmInstalled: false,
    intrusionAlarmInstalled: false,
    exitDelay: 30,
    entryDelay: 5,
    remoteResetEnabledSmoke: true,
    remoteResetEnabledIntrusion: true,
    spareInputs: ["Not Present", "Not Present", "Not Present", "Not Present"],
    rmmConnectionType: "PSTN Modem",
    dialInRings: 3,
    dialOutOnStatusChange: "Dial out to SELEX RSMS",
    dialOutPhoneNumber: "6811",
    toneDialOut: true,
  },
  rmsConfigStation: {
    powerLevel: "High Power",
    transmitterConfig: "Dual Transmitters",
    monitorConfig: "Dual Monitors",
    hotStandby: true,
    channelType: "X",
    channelNumber: 117,
    stationDescription: "TST",
  },
  securityAccounts: defaultDmeSecurityAccounts,
  monitorConfigGeneral: [
    { parameter: "Delay", primary: true, secondary: false },
    { parameter: "Spacing", primary: true, secondary: false },
    { parameter: "Tx Power", primary: true, secondary: false },
    { parameter: "ERP", primary: true, secondary: false },
    { parameter: "Efficiency", primary: true, secondary: false },
    { parameter: "PRF", primary: true, secondary: false },
    { parameter: "Ident Status", primary: true, secondary: false },
    { parameter: "Ident Code", primary: true, secondary: false },
    { parameter: "Tx Frequency Error", primary: false, secondary: true },
    { parameter: "Rx Frequency Error", primary: false, secondary: true },
  ],
  monitorCalibrationData: {
    monitor1: [
      { parameter: "Delay", baseline: 50.00, actual: 50.01, offset: 0.01, scale: 1.000, unit: "us" },
      { parameter: "Spacing", baseline: 12.00, actual: 12.02, offset: 0.02, scale: 1.000, unit: "us" },
      { parameter: "Peak Power", baseline: 1000, actual: 998, offset: -2, scale: 1.000, unit: "W" },
      { parameter: "Efficiency", baseline: 80.0, actual: 80.1, offset: 0.1, scale: 1.000, unit: "%" },
      { parameter: "PRF", baseline: 800, actual: 801, offset: 1, scale: 1.000, unit: "Hz" },
    ],
    monitor2: [
      { parameter: "Delay", baseline: 50.00, actual: 50.02, offset: 0.02, scale: 1.000, unit: "us" },
      { parameter: "Spacing", baseline: 12.00, actual: 12.01, offset: 0.01, scale: 1.000, unit: "us" },
      { parameter: "Peak Power", baseline: 1000, actual: 1001, offset: 1, scale: 1.000, unit: "W" },
      { parameter: "Efficiency", baseline: 80.0, actual: 80.0, offset: 0.0, scale: 1.000, unit: "%" },
      { parameter: "PRF", baseline: 800, actual: 800, offset: 0, scale: 1.000, unit: "Hz" },
    ],
  },
  monitorDetailData: {
    monitor1: [
      { label: "Delay", mon1Value: "50.02", mon1Status: "normal", mon2Value: "50.01", mon2Status: "normal", unit: "us" },
      { label: "Spacing", mon1Value: "12.01", mon1Status: "normal", mon2Value: "12.03", mon2Status: "normal", unit: "us" },
      { label: "Peak Power", mon1Value: "998", mon1Status: "normal", mon2Value: "1002", mon2Status: "normal", unit: "W" },
      { label: "Efficiency", mon1Value: "80.2", mon1Status: "normal", mon2Value: "80.1", mon2Status: "normal", unit: "%" },
      { label: "Pulse Rate (PRF)", mon1Value: "801", mon1Status: "normal", mon2Value: "800", mon2Status: "normal", unit: "Hz" },
    ],
    monitor2: [
      { label: "Delay", mon1Value: "50.01", mon1Status: "normal", mon2Value: "50.03", mon2Status: "normal", unit: "us" },
      { label: "Spacing", mon1Value: "12.02", mon1Status: "normal", mon2Value: "12.01", mon2Status: "normal", unit: "us" },
      { label: "Peak Power", mon1Value: "1001", mon1Status: "normal", mon2Value: "997", mon2Status: "normal", unit: "W" },
      { label: "Efficiency", mon1Value: "80.0", mon1Status: "normal", mon2Value: "80.3", mon2Status: "normal", unit: "%" },
      { label: "Pulse Rate (PRF)", mon1Value: "800", mon1Status: "normal", mon2Value: "802", mon2Status: "normal", unit: "Hz" },
    ],
  },
  digitalInputs: defaultDmeDigitalInputs,
  digitalOutputs: defaultDmeDigitalOutputs,
  systemPowerStatus: defaultDmeSystemPowerStatus,
  txAlerts: defaultDmeTxAlerts,
};

export function cloneDefaultDmePmdtData(): DmePmdtData {
  return structuredClone(defaultDmePmdtData);
}
