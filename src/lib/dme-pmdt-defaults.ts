import type {
  DmeAlarmLimitRow,
  DmeAlarmLogEntry,
  DmeDecoderResultRow,
  DmeDualValueRow,
  DmeMaintenanceLogEntry,
  DmeMonitorOffsetRow,
  DmePmdtData,
} from "./dme-types";

export const defaultDmeAlarmLogs: DmeAlarmLogEntry[] = [
  { timeTag: "01/17/11 15:44:32", type: "Monitor 2", alarm: "Standby Efficiency", state: "Normal" },
  { timeTag: "01/17/11 15:44:31", type: "Monitor 1", alarm: "Standby Efficiency", state: "Normal" },
  { timeTag: "01/13/11 11:11:27", type: "Monitor 1", alarm: "Standby Delay", state: "Normal" },
  { timeTag: "01/13/11 11:11:20", type: "Monitor 2", alarm: "Standby Delay", state: "Primary Alarm Low" },
  { timeTag: "01/13/11 10:18:04", type: "General", alarm: "On-Air Tx Shutdown", state: "Alarm" },
];

export const defaultDmeMaintenanceLogs: DmeMaintenanceLogEntry[] = [
  { timeTag: "01/17/11 15:44:32", type: "Monitor 2", alert: "Standby Efficiency", state: "Normal" },
  { timeTag: "01/17/11 15:44:31", type: "Monitor 1", alert: "Standby Efficiency", state: "Normal" },
  { timeTag: "01/13/11 15:44:28", type: "RTC 1", alert: "Propagation Delay High", state: "Normal" },
  { timeTag: "01/13/11 15:44:27", type: "RTC 1", alert: "HPA 1 Low Output Power", state: "Normal" },
  { timeTag: "01/13/11 11:14:09", type: "Monitor 2", alert: "Integrity Test Alert", state: "Alert" },
  { timeTag: "01/13/11 11:14:05", type: "RTC 2", alert: "Standby Delay", state: "Normal" },
  { timeTag: "01/13/11 11:11:20", type: "Monitor 1", alert: "Standby Efficiency", state: "Pre-Alert" },
];

export const defaultDmeIntegralData: DmeDualValueRow[] = [
  { label: "Delay", mon1Value: "50.02", mon1Status: "normal", mon2Value: "50.01", mon2Status: "normal", unit: "us" },
  { label: "Spacing", mon1Value: "12.02", mon1Status: "normal", mon2Value: "12.01", mon2Status: "normal", unit: "us" },
  { label: "Tx Power", mon1Value: "1023", mon1Status: "normal", mon2Value: "1028", mon2Status: "normal", unit: "Watts" },
  { label: "ERP", mon1Value: "0.1", mon1Status: "normal", mon2Value: "0.2", mon2Status: "normal", unit: "dB" },
  { label: "Efficiency", mon1Value: "100.0", mon1Status: "normal", mon2Value: "100.0", mon2Status: "normal", unit: "%" },
  { label: "PRF", mon1Value: "624", mon1Status: "normal", mon2Value: "819", mon2Status: "normal", unit: "ppps" },
  { label: "Tx Frequency", mon1Value: "1170.000", mon1Status: "normal", mon2Value: "1170.000", mon2Status: "normal", unit: "MHz" },
  { label: "Tx Frequency Error", mon1Value: "0", mon1Status: "normal", mon2Value: "0", mon2Status: "normal", unit: "ppm" },
  { label: "Rx LO Frequency", mon1Value: "981.999", mon1Status: "normal", mon2Value: "981.999", mon2Status: "normal", unit: "MHz" },
  { label: "Rx LO Frequency Error", mon1Value: "0", mon1Status: "normal", mon2Value: "1", mon2Status: "normal", unit: "ppm" },
  { label: "Rx Frequency", mon1Value: "1106.999", mon1Status: "normal", mon2Value: "1106.999", mon2Status: "normal", unit: "MHz" },
  { label: "VSWR", mon1Value: "1.0", mon1Status: "normal", mon2Value: "1.0", mon2Status: "normal", unit: ":1" },
  { label: "Ident Status", mon1Value: "Normal", mon1Status: "green", mon2Value: "Normal", mon2Status: "green", unit: "" },
  { label: "Ident Code", mon1Value: "TST", mon1Status: "green", mon2Value: "TST", mon2Status: "green", unit: "" },
];

export const defaultDmeStandbyData: DmeDualValueRow[] = [
  { label: "Delay", mon1Value: "50.02", mon1Status: "normal", mon2Value: "49.99", mon2Status: "normal", unit: "us" },
  { label: "Spacing", mon1Value: "12.02", mon1Status: "normal", mon2Value: "12.05", mon2Status: "normal", unit: "us" },
  { label: "Tx Power", mon1Value: "1029", mon1Status: "normal", mon2Value: "1016", mon2Status: "normal", unit: "Watts" },
  { label: "Efficiency", mon1Value: "100.0", mon1Status: "normal", mon2Value: "100.0", mon2Status: "normal", unit: "%" },
  { label: "PRF", mon1Value: "807", mon1Status: "normal", mon2Value: "806", mon2Status: "normal", unit: "ppps" },
  { label: "Tx Frequency", mon1Value: "1170.000", mon1Status: "normal", mon2Value: "1170.004", mon2Status: "normal", unit: "MHz" },
  { label: "Tx Frequency Error", mon1Value: "0", mon1Status: "normal", mon2Value: "3", mon2Status: "normal", unit: "ppm" },
  { label: "Rx LO Frequency", mon1Value: "982.002", mon1Status: "normal", mon2Value: "982.002", mon2Status: "normal", unit: "MHz" },
  { label: "Rx LO Frequency Error", mon1Value: "4", mon1Status: "normal", mon2Value: "2", mon2Status: "normal", unit: "ppm" },
  { label: "Rx Frequency", mon1Value: "1107.002", mon1Status: "normal", mon2Value: "1107.002", mon2Status: "normal", unit: "MHz" },
  { label: "Ident Status", mon1Value: "Normal", mon1Status: "green", mon2Value: "Normal", mon2Status: "green", unit: "" },
  { label: "Ident Code", mon1Value: "TST", mon1Status: "green", mon2Value: "TST", mon2Status: "green", unit: "" },
];

export const defaultDmeAlarmLimits: DmeAlarmLimitRow[] = [
  { parameter: "Delay", alarmLow: -0.4, preAlarmLow: -0.32, nominal: 50, preAlarmHigh: 0.32, alarmHigh: 0.4, unit: "us" },
  { parameter: "Spacing", alarmLow: -0.4, preAlarmLow: -0.32, nominal: 12, preAlarmHigh: 0.32, alarmHigh: 0.4, unit: "us" },
  { parameter: "Tx Power", alarmLow: 500, preAlarmLow: 600, nominal: 1000, preAlarmHigh: 1225, alarmHigh: 1250, unit: "Watts" },
  { parameter: "ERP", alarmLow: -3, preAlarmLow: -2.7, nominal: 0, preAlarmHigh: 0.9, alarmHigh: 1, unit: "dB" },
  { parameter: "Efficiency", alarmLow: 70, preAlarmLow: 73, nominal: 100, preAlarmHigh: null, alarmHigh: null, unit: "%" },
  { parameter: "PRF", alarmLow: 720, preAlarmLow: 730, nominal: 800, preAlarmHigh: 6000, alarmHigh: 6000, unit: "ppps" },
  { parameter: "Tx Frequency Error", alarmLow: -20, preAlarmLow: -18, nominal: 0, preAlarmHigh: 18, alarmHigh: 20, unit: "ppm" },
  { parameter: "Rx Frequency Error", alarmLow: -20, preAlarmLow: -18, nominal: 0, preAlarmHigh: 18, alarmHigh: 20, unit: "ppm" },
  { parameter: "VSWR", alarmLow: null, preAlarmLow: null, nominal: 1.1, preAlarmHigh: 3, alarmHigh: 4, unit: ":1" },
];

const decoderTemplate: DmeDecoderResultRow[] = [
  { parameter: "Receiver Sensitivity @ 120 us (R)", lowLimit: -97, data: -94.6, highLimit: -91, unit: "dBm", result: "Updated" },
  { parameter: "Spacing 13.0 us @ -93.6 dBm (R +1dB)", lowLimit: 70, data: 92, highLimit: 100, unit: "%", result: "Updated" },
  { parameter: "Spacing 12.5 us @ -93.6 dBm (R +1dB)", lowLimit: 70, data: 92, highLimit: 100, unit: "%", result: "Updated" },
  { parameter: "Spacing 11.5 us @ -93.6 dBm (R +1dB)", lowLimit: 70, data: 100, highLimit: 100, unit: "%", result: "Updated" },
  { parameter: "Spacing 11.0 us @ -93.6 dBm (R +1dB)", lowLimit: 70, data: 98, highLimit: 100, unit: "%", result: "Updated" },
  { parameter: "RF +200 kHz @ -91.6 dBm (R +3dB)", lowLimit: 70, data: 98, highLimit: 100, unit: "%", result: "Updated" },
  { parameter: "RF -200 kHz @ -91.6 dBm (R +3dB)", lowLimit: 70, data: 98, highLimit: 100, unit: "%", result: "Updated" },
  { parameter: "RF +900 kHz (R -10 dBm)", lowLimit: 0, data: 0, highLimit: 5, unit: "%", result: "Updated" },
  { parameter: "RF -900 kHz (R -10 dBm)", lowLimit: 0, data: 0, highLimit: 5, unit: "%", result: "Updated" },
  { parameter: "Spacing 15.0 us @ -72.6 dBm", lowLimit: 0, data: 0, highLimit: 5, unit: "%", result: "In Process" },
];

export const defaultDmeMonitorOffsets: DmeMonitorOffsetRow[] = [
  { parameter: "Delay Offset", integral: 0, standby: 0, unit: "us" },
  { parameter: "Spacing Offset", integral: 0, standby: 0, unit: "us" },
  { parameter: "Tx Power Scale", integral: null, standby: 166, unit: "%" },
  { parameter: "Tx Power Offset", integral: 0, standby: 0, unit: "Watts" },
  { parameter: "Efficiency Offset", integral: 0, standby: 0, unit: "%" },
  { parameter: "PRF Offset", integral: 0, standby: 0, unit: "ppps" },
  { parameter: "Tx Frequency Offset", integral: 0, standby: 0, unit: "ppm" },
  { parameter: "Rx Frequency Offset", integral: 0, standby: 0, unit: "ppm" },
  { parameter: "ERP Offset", integral: 0, standby: null, unit: "dB" },
  { parameter: "Return Loss Offset", integral: 0, standby: null, unit: "dB" },
];

export const defaultDmePmdtData: DmePmdtData = {
  connected: true,
  alert: false,
  local: false,
  timestamp: "17/01/2011 10:40:06",
  transmitters: {
    tx1: { main: "green", antenna: "green", load: "gray", off: "gray" },
    tx2: { main: "gray", antenna: "gray", load: "gray", off: "red" },
  },
  monitors: {
    integral: { normal: true, priAlarm: false, secAlarm: false, bypass: false },
    standby: { normal: true, priAlarm: false, secAlarm: false, bypass: false },
  },
  sidebarParams: {
    delay: { value: 50.02, status: "normal", digits: 2 },
    spacing: { value: 12.02, status: "normal", digits: 2 },
    txPower: { value: 1021, status: "normal", digits: 0 },
    erp: { value: 0.1, status: "normal", digits: 1 },
    efficiency: { value: 100, status: "normal", digits: 1 },
    prf: { value: 813, status: "normal", digits: 0 },
  },
  rmsStatus: {
    logonLevel: 3,
    localControlMode: false,
    maintenanceAlert: false,
    onBattery: false,
    acFailure: false,
    remoteControlEnabled: true,
    interlocked: false,
    rcsuConnectionEnabled: false,
    rcsuCommunicationError: false,
    approachType: "Primary",
  },
  revisionLevels: { rms: "2.0.0.6", monitor1: "2.0.0.6", monitor2: "2.0.0.6", rtc1: "2.1.0.3", rtc2: "2.1.0.3", bcps1: "1.5", bcps2: "1.5", lcu: "1.1" },
  monitorTransmitterStatus: {
    monitorAlarmShutdown: false,
    enabledMonitors: { monitor1: true, monitor2: true },
    antennaSelect: 1,
    mainSelect: 1,
    transmitterOn: { tx1: true, tx2: true },
  },
  alarmLogs: defaultDmeAlarmLogs,
  maintenanceLogs: defaultDmeMaintenanceLogs,
  integralData: defaultDmeIntegralData,
  standbyData: defaultDmeStandbyData,
  alarmLimits: defaultDmeAlarmLimits,
  monitorTimers: { integralShutdownDelay: 7, standbyShutdownDelay: 7, continuousIdent: 5, noIdent: 65 },
  monitorSystemSettings: { efficiencyCertificationLevel: 70, monitor1ReplyAttenuation: 20, monitor2ReplyAttenuation: 20, directionalCouplerLoss: -236 },
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
    { band: "-30 to -50 dBm", tx1: 22, tx2: 22 },
    { band: "-50 to -70 dBm", tx1: 20, tx2: 20 },
    { band: "< -70 dBm", tx1: 63, tx2: 62 },
    { band: "Total Replies", tx1: 105, tx2: 104 },
    { band: "Monitor Replies", tx1: 105, tx2: 104 },
  ],
  delayControl: {
    rtc1: { low: 9.02, propagationDelay: 9.48, high: 10.02, fixed: true },
    rtc2: { low: 9.02, propagationDelay: 9.52, high: 10.02, fixed: true },
  },
  txConfigNominal: {
    rtcParameters: { powerOutput: 49, minimumSquitter: 800, maximumPrf: 5400, ldesWindow: 150, ldesThreshold: -70, deadTime: 60, replyDelayOffset: 0, rxSensitivity: -94, nominalPropagationDelay: 9.52, maxPropagationVariance: 0.5, standbyPropagationOffset: 0.06 },
    operation: { timing: "1st Pulse", squitterEnabled: true, sdesEnabled: false, ldesEnabled: false, equalizationPulsesEnabled: true },
    powerAmplifiers: { lowOutputPowerAlertLimit: 25, hpa1Enabled: true, hpa2Enabled: true },
    ident: { keyerSource: "Internal Keying", primaryIdentCode: "TST", secondaryIdentCode: "TST", standbyIdent: "Same as Main Ident" },
  },
  txOffsets: [
    { parameter: "Power Output Scale", tx1: 100, tx2: 98, unit: "%" },
    { parameter: "Rx Sensitivity Offset", tx1: 3, tx2: 3, unit: "dB" },
    { parameter: "Base Offset", tx1: 0, tx2: 0, unit: "us" },
  ],
};

export function cloneDefaultDmePmdtData(): DmePmdtData {
  return structuredClone(defaultDmePmdtData);
}
