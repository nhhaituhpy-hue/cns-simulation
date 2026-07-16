import type {
  VorAlarmLimitRow,
  VorAlarmLogEntry,
  VorDigitalInput,
  VorDigitalOutput,
  VorDualIndicatorRow,
  VorGeneralAlert,
  VorIndicatorAlert,
  VorIntegralDataRow,
  VorMaintenanceLogEntry,
  VorMonitorAgenAlert,
  VorMonitorOffsetRow,
  VorPmdtData,
  VorTxConfigNominal,
  VorTxDualValueRow,
  VorTxFrequencyRow,
  VorTxVswrRow,
} from "./vor-types";

export const defaultGeneralAlerts: VorGeneralAlert[] = [
  { id: "local-mode", label: "Local Mode", checked: false },
  { id: "rms-power-supply", label: "RMS Power Supply Data", checked: false },
  { id: "rms-ad-data", label: "RMS A/D Data", checked: false },
  { id: "rms-digital-io", label: "RMS Digital I/O Data", checked: false },
  { id: "lcd-comm-link", label: "LCD Comm Link Failed", checked: false },
  { id: "test-gen-fault", label: "Test Generator Fault", checked: false },
  { id: "lcu-bus-failure", label: "LCU Bus Failure", checked: false },
  { id: "ac-power-failure", label: "A/C Power Failure", checked: false },
  { id: "sys48-ps1", label: "Sys 48 VDC PS 1 Failure", checked: false },
  { id: "sys48-ps2", label: "Sys 48 VDC PS 2 Failure", checked: false },
  { id: "transfer-relay", label: "Transfer Relay Failure", checked: false },
  { id: "standby-tx", label: "Standby Tx on the Air", checked: false },
  { id: "lcu-config", label: "LCU Config Mismatch", checked: false },
  { id: "freq-config", label: "Frequency Config Mismatch", checked: false },
  { id: "integral-monitor", label: "Integral Monitor Mismatch", checked: false },
];

export const defaultMonitorAgenAlerts: VorMonitorAgenAlert[] = [
  { label: "RMS Comm Link Failed", mon1: true, mon2: true, agen1: false, agen2: false },
  { label: "Integrity Test Failed", mon1: true, mon2: true, agen1: false, agen2: false },
  { label: "File System Fault", mon1: false, mon2: true, agen1: false, agen2: false },
  { label: "Backplane Switch Mismatch", mon1: true, mon2: true, agen1: false, agen2: false },
  { label: "Maintenance Alert", mon1: false, mon2: false, agen1: false, agen2: false },
  { label: "Pre-Alarm", mon1: false, mon2: false, agen1: false, agen2: false },
  { label: "Primary Alarm", mon1: false, mon2: false, agen1: false, agen2: false },
  { label: "Secondary Alarm", mon1: false, mon2: false, agen1: false, agen2: false },
];

export const defaultDigitalInputs: VorDigitalInput[] = [
  { name: "Smoke Detector", configuration: "Disabled", status: "" },
  { name: "Intrusion Detector", configuration: "Disabled", status: "" },
  { name: "Spare Input 1", configuration: "Not Present", status: "" },
  { name: "Spare Input 2", configuration: "Not Present", status: "" },
  { name: "Spare Input 3", configuration: "Not Present", status: "" },
  { name: "Spare Input 4", configuration: "Not Present", status: "" },
];

export const defaultDigitalOutputs: VorDigitalOutput[] = [
  { name: "Battery Charger", status: "Off", altStatus: "Trickle" },
  { name: "Spare Output 1", status: "Low" },
  { name: "Spare Output 2", status: "Low" },
  { name: "Spare Output 3", status: "Low" },
  { name: "Spare Output 4", status: "Low" },
];

export const defaultSystemPowerStatus: VorDualIndicatorRow[] = [
  { name: "Battery Fault", tx1: "green", tx2: "green" },
  { name: "On Battery", tx1: "green", tx2: "green" },
  { name: "LVPS", tx1: "green", tx2: "green" },
  { name: "RMS", tx1: "green", tx2: "gray" },
  { name: "Facilities", tx1: "green", tx2: "gray" },
  { name: "Test Generator", tx1: "green", tx2: "gray" },
  { name: "LCU", tx1: "green", tx2: "gray" },
];

export const defaultTxAlerts: VorDualIndicatorRow[] = [
  { name: "Carrier VSWR", tx1: "green", tx2: "red" },
  { name: "Carrier Overtemp", tx1: "green", tx2: "red" },
  { name: "Carrier Overpower", tx1: "green", tx2: "red" },
  { name: "SB1 PLL", tx1: "green", tx2: "green" },
  { name: "SB2 PLL", tx1: "green", tx2: "green" },
  { name: "SB3 PLL", tx1: "green", tx2: "green" },
  { name: "SB4 PLL", tx1: "green", tx2: "green" },
];

export const defaultAlarmLogs: VorAlarmLogEntry[] = [
  { timeTag: "17/01/2011 22:23:55", type: "Monitor 2", alarm: "Tx Frequency Error", state: "Normal" },
  { timeTag: "17/01/2011 22:23:55", type: "Monitor 1", alarm: "30Hz Modulation", state: "Normal" },
  { timeTag: "17/01/2011 22:23:54", type: "Monitor 2", alarm: "Az Angle", state: "Normal" },
  { timeTag: "17/01/2011 22:23:53", type: "Monitor 1", alarm: "Az Angle", state: "Normal" },
  { timeTag: "17/01/2011 22:23:53", type: "Monitor 1", alarm: "30Hz Modulation", state: "Normal" },
  { timeTag: "17/01/2011 20:52:09", type: "Monitor 2", alarm: "9960Hz Modulation", state: "Alarm" },
  { timeTag: "17/01/2011 20:52:07", type: "Monitor 1", alarm: "30Hz Modulation", state: "Alarm" },
  { timeTag: "17/01/2011 20:52:07", type: "Monitor 2", alarm: "9960Hz Modulation", state: "Alarm" },
  { timeTag: "13/01/2011 15:02:45", type: "Monitor 2", alarm: "Az Angle", state: "Alarm" },
  { timeTag: "13/01/2011 14:10:25", type: "Monitor 2", alarm: "9960Hz Modulation", state: "Alarm" },
  { timeTag: "12/01/2011 16:44:14", type: "Monitor 2", alarm: "Az Angle", state: "Normal" },
  { timeTag: "12/01/2011 16:44:12", type: "Monitor 2", alarm: "Az Angle", state: "Alarm" },
  { timeTag: "12/01/2011 16:29:55", type: "Monitor 2", alarm: "Tx Frequency Error", state: "Alarm" },
  { timeTag: "12/01/2011 16:28:02", type: "Monitor 2", alarm: "9960Hz Modulation", state: "Alarm" },
  { timeTag: "12/01/2011 16:25:59", type: "Monitor 1", alarm: "Tx Frequency Error", state: "Alarm" },
  { timeTag: "12/01/2011 16:25:57", type: "Monitor 2", alarm: "Az Angle", state: "Normal" },
  { timeTag: "12/01/2011 16:25:55", type: "Monitor 1", alarm: "Tx Frequency Error", state: "Normal" },
  { timeTag: "12/01/2011 16:25:52", type: "Monitor 2", alarm: "Az Angle", state: "Alarm" },
  { timeTag: "12/01/2011 16:25:42", type: "Monitor 2", alarm: "Az Angle", state: "Normal" },
  { timeTag: "12/01/2011 16:25:40", type: "Monitor 2", alarm: "Az Angle", state: "Alarm" },
];

export const defaultMaintenanceLogs: VorMaintenanceLogEntry[] = [
  { timeTag: "17/01/2011 23:21:49", type: "General", alert: "Local Mode", state: "Normal" },
  { timeTag: "17/01/2011 23:21:40", type: "Digital Input", alert: "Battery B1 Fault", state: "Normal" },
  { timeTag: "17/01/2011 23:21:39", type: "BCPS 1", alert: "Battery Fault", state: "Normal" },
  { timeTag: "17/01/2011 23:21:33", type: "BCPS 2", alert: "Battery R2 Fault", state: "Normal" },
  { timeTag: "17/01/2011 23:21:33", type: "BCPS 2", alert: "Battery Fault", state: "Normal" },
  { timeTag: "17/01/2011 23:04:26", type: "Monitor 1", alert: "Ident Modulation", state: "Normal" },
  { timeTag: "17/01/2011 23:04:25", type: "Monitor 2", alert: "Ident Modulation", state: "Normal" },
  { timeTag: "17/01/2011 23:04:23", type: "Monitor 2", alert: "Ident Status", state: "Alert" },
  { timeTag: "17/01/2011 23:04:21", type: "Monitor 1", alert: "Ident Status", state: "Normal" },
  { timeTag: "17/01/2011 22:24:28", type: "Monitor 2", alert: "Ident Code", state: "Alert" },
  { timeTag: "17/01/2011 22:24:26", type: "Monitor 1", alert: "Ident Code", state: "Alert" },
  { timeTag: "17/01/2011 22:24:10", type: "Monitor 2", alert: "Ident Status", state: "Alert" },
  { timeTag: "17/01/2011 22:23:55", type: "Monitor 2", alert: "30Hz Modulation", state: "Normal" },
  { timeTag: "17/01/2011 22:23:54", type: "Monitor 2", alert: "Az Angle", state: "Normal" },
  { timeTag: "17/01/2011 22:23:53", type: "Audio Gen 1", alert: "Carrier Phase Error Fault", state: "Normal" },
  { timeTag: "17/01/2011 22:23:53", type: "Audio Gen 1", alert: "Carrier Reflected Power Fault", state: "Normal" },
  { timeTag: "17/01/2011 22:23:53", type: "Audio Gen 1", alert: "CSB Power Fault", state: "Normal" },
  { timeTag: "17/01/2011 22:23:53", type: "Audio Gen 1", alert: "LSB Power Fault", state: "Normal" },
  { timeTag: "17/01/2011 22:23:52", type: "Audio Gen 1", alert: "Carrier Forward Power Fault", state: "Normal" },
  { timeTag: "17/01/2011 22:23:52", type: "Audio Gen 1", alert: "Audio Generator Disabled", state: "Normal" },
];

export const defaultIntegralData: VorIntegralDataRow[] = [
  { label: "Azimuth", mon1Value: "0.10", mon1Status: "green", mon2Value: "0.11", mon2Status: "green", unit: "°" },
  { label: "30 Hz Modulation", mon1Value: "30.3", mon1Status: "green", mon2Value: "30.2", mon2Status: "green", unit: "%" },
  { label: "9960 Hz Modulation", mon1Value: "30.1", mon1Status: "green", mon2Value: "28.9", mon2Status: "green", unit: "%" },
  { label: "9960 Hz Deviation", mon1Value: "15.99", mon1Status: "green", mon2Value: "15.98", mon2Status: "green", unit: "Ratio" },
  { label: "RF Level", mon1Value: "0.0", mon1Status: "green", mon2Value: "-0.1", mon2Status: "green", unit: "dB" },
  { label: "Ident Modulation", mon1Value: "4.9", mon1Status: "green", mon2Value: "4.9", mon2Status: "green", unit: "%" },
  { label: "Ident Status", mon1Value: "Normal", mon1Status: "green", mon2Value: "Normal", mon2Status: "green", unit: "" },
  { label: "Ident Code", mon1Value: "FLR", mon1Status: "green", mon2Value: "FLR", mon2Status: "green", unit: "" },
  { label: "Tx Power", mon1Value: "98.8", mon1Status: "green", mon2Value: "98.7", mon2Status: "green", unit: "Watts" },
  { label: "Tx Frequency", mon1Value: "113.0000", mon1Status: "green", mon2Value: "113.0000", mon2Status: "green", unit: "MHz" },
  { label: "Tx Frequency Error", mon1Value: "0", mon1Status: "green", mon2Value: "-2", mon2Status: "green", unit: "ppm" },
];

export const defaultVswrData = [1.08, 1.09, 1.01, 1.04, 1.04, 1.07, 1.14, 1.07, 1.13, 1.11, 1.26, 1.11, 1.30, 1.04, 1.07, 1.05, 1.23, 1.05, 1.25, 1.07, 1.14, 1.00, 1.31, 1.04, 1.32, 1.18, 1.29, 1.04, 1.11, 1.11, 1.18, 1.10, 1.24, 1.07, 1.34, 1.03, 1.28, 1.06, 1.36, 1.23, 1.18, 1.08, 1.17, 1.10, 1.28, 1.11, 1.04, 1.15];

export const defaultAlarmLimits: VorAlarmLimitRow[] = [
  { parameter: "30 Hz Modulation", alarmLow: 28, preAlarmLow: 28.5, nominal: 30, preAlarmHigh: 31.5, alarmHigh: 32, unit: "%" },
  { parameter: "9960 Hz Modulation", alarmLow: 28, preAlarmLow: 28.5, nominal: 30, preAlarmHigh: 31.5, alarmHigh: 32, unit: "%" },
  { parameter: "9960 Hz Deviation", alarmLow: 15, preAlarmLow: 15.2, nominal: 16.3, preAlarmHigh: 16.3, alarmHigh: 17, unit: "Ratio" },
  { parameter: "RF Level", alarmLow: -3, preAlarmLow: -2.5, nominal: 0, preAlarmHigh: 2.5, alarmHigh: 3, unit: "dB" },
  { parameter: "Tx Power", alarmLow: 70, preAlarmLow: 95, nominal: 115, preAlarmHigh: 115, alarmHigh: 130, unit: "Watts" },
  { parameter: "Tx Frequency Error", alarmLow: -20, preAlarmLow: -18, nominal: 0, preAlarmHigh: 18, alarmHigh: 20, unit: "ppm" },
  { parameter: "Ident Modulation", alarmLow: 2, preAlarmLow: 4, nominal: 5, preAlarmHigh: 9, alarmHigh: 10, unit: "%" },
];

export const defaultMonitorOffsets: VorMonitorOffsetRow[] = [
  { parameter: "Azimuth Angle Offset", integral: 0.01, standby: null, testGen: 0.04, unit: "°" },
  { parameter: "30 Hz Modulation Scale", integral: 92.1, standby: null, testGen: 100.1, unit: "%" },
  { parameter: "9960 Hz Modulation Scale", integral: 89.7, standby: null, testGen: 95.5, unit: "%" },
  { parameter: "9960 Hz Deviation Scale", integral: 101, standby: null, testGen: 100.2, unit: "%" },
  { parameter: "RF Level Offset", integral: -0.3, standby: null, testGen: null, unit: "dB" },
  { parameter: "Ident Modulation Scale", integral: 109.4, standby: null, testGen: 100, unit: "%" },
  { parameter: "Tx Power Scale", integral: 98.2, standby: null, testGen: 101.7, unit: "%" },
  { parameter: "Tx Power Offset", integral: 0, standby: null, testGen: 2, unit: "%" },
  { parameter: "Tx Frequency Error Offset", integral: 0, standby: null, testGen: 0, unit: "ppm" },
  { parameter: "Notch Monitor Scale", integral: 100, standby: null, testGen: null, unit: "" },
  { parameter: "Odd Antenna SB Return Loss Offset", integral: -4, standby: null, testGen: null, unit: "dB" },
  { parameter: "Even Antenna SB Return Loss Offset", integral: 0, standby: null, testGen: null, unit: "dB" },
];

export const defaultTxPower: VorTxDualValueRow[] = [
  { parameter: "Carrier", tx1: 98.8, tx2: 0.6, unit: "Watts" },
  { parameter: "Sideband #1", tx1: 2.438, tx2: 0.005, unit: "Watts" },
  { parameter: "Sideband #2", tx1: 2.438, tx2: 0.001, unit: "Watts" },
  { parameter: "Sideband #3", tx1: 2.458, tx2: 0, unit: "Watts" },
  { parameter: "Sideband #4", tx1: 2.429, tx2: 0.011, unit: "Watts" },
];

export const defaultTxFrequency: VorTxFrequencyRow[] = [
  { parameter: "Carrier Frequency", value1: 113.0001, value2: 0, unit: "MHz" },
  { parameter: "Tx Lower Sideband", value1: 112.9901, value2: 0, unit: "MHz" },
  { parameter: "Tx Upper Sideband", value1: 113.01, value2: 0, unit: "MHz" },
  { parameter: "30 Hz AM", value1: 30, value2: null, unit: "Hz" },
  { parameter: "30 Hz FM", value1: 30, value2: null, unit: "Hz" },
  { parameter: "Sideband Frequency", value1: 9958, value2: null, unit: "Hz" },
];

export const defaultTxVswr: VorTxVswrRow[] = [
  { parameter: "Carrier", value: 1.04 }, { parameter: "Sideband #1", value: 1.13 },
  { parameter: "Sideband #2", value: 1.11 }, { parameter: "Sideband #3", value: 1.08 },
  { parameter: "Sideband #4", value: 1.09 },
];

const greenAlerts = (labels: string[]): VorIndicatorAlert[] => labels.map((label) => ({ label, indicator: "green" }));
export const defaultTxSystemAlerts = greenAlerts(["Audio Generator ROM Fault", "Audio Generator RAM Fault", "Audio Generator Functional Fault", "Audio Generator EEPROM Fault", "Audio Generator Comm Fault", "Audio RAM CRC Fault", "Audio Generator Disabled", "Transmitter Disabled"]);
export const defaultTxCarrierPaAlerts = greenAlerts(["Carrier Power", "Carrier Frequency", "Carrier Forward Power", "Carrier Reflected Power", "CSB to SBO Phase Control", "Carrier Modulation", "PA Thermal Shutdown"]);
export const defaultTxSynthesizerAlerts = greenAlerts(["CSB Power Fault", "Carrier Phase Error", "Carrier Phase Offset", "LSB Power Fault", "LSB Unlocked", "USB Power Fault", "USB Unlocked"]);
export const defaultTxSidebandPaAlerts: VorIndicatorAlert[] = [1, 2, 3, 4].flatMap((sideband) => [
  { label: `Sideband ${sideband} Phase`, indicator: sideband === 1 ? "red" : "green" },
  { label: `Sideband ${sideband} Audio`, indicator: "green" },
  { label: `Sideband ${sideband} Forward Power`, indicator: "green" },
  { label: `Sideband ${sideband} Reflected Power`, indicator: "green" },
]);

export const defaultTxConfigNominal: VorTxConfigNominal = {
  audioGenParams: { azimuthIndex: -1.1, outputPower: 100, voiceModulation: 0, identModulation: 5, referenceModulation: 30, sboRfLevel: 51.4 },
  ident: { mainIdentCode: "FLR", standbyIdentCode: "Same as Main Ident" },
  keyerInput: { mode: "disabled", keyerInputLevel: "Active High/Open", windowedKeyingInput: false, selfKeyOnLoss: false, shutdownOnLoss: false, restartWhenResumed: false },
  keyerOutput: { externalKeying: "Disabled", suppressOnShutdown: false },
};

export const defaultTxOffsets: VorTxDualValueRow[] = [
  { parameter: "Azimuth Angle Offset", tx1: 0, tx2: 0, unit: "°" },
  { parameter: "Output Power Scale", tx1: 94.6, tx2: 96.6, unit: "%" },
  { parameter: "Voice Modulation Scale", tx1: 100, tx2: 100, unit: "%" },
  { parameter: "Ident Modulation Scale", tx1: 100, tx2: 100, unit: "%" },
  { parameter: "Reference Modulation Scale", tx1: 100, tx2: 100, unit: "%" },
  { parameter: "Carrier PLL Control", tx1: 39.5, tx2: 45.5, unit: "%" },
  { parameter: "Carrier Sideband Phase Offset (Coarse)", tx1: 180, tx2: 90, unit: "°" },
  { parameter: "Carrier Sideband Phase Offset (Fine)", tx1: 31, tx2: 29, unit: "°" },
  { parameter: "Sideband 1 Phase Offset", tx1: -5, tx2: 26, unit: "°" },
  { parameter: "Sideband 2 Phase Offset", tx1: 5, tx2: -26, unit: "°" },
  { parameter: "Sideband 3 Phase Offset", tx1: -8, tx2: -2, unit: "°" },
  { parameter: "Sideband 4 Phase Offset", tx1: 8, tx2: 2, unit: "°" },
  { parameter: "Tx Sideband RF Level Scale", tx1: 91.5, tx2: 93, unit: "%" },
  { parameter: "Sideband 1 RF Level Scale", tx1: 100, tx2: 100, unit: "%" },
  { parameter: "Sideband 2 RF Level Scale", tx1: 100, tx2: 100, unit: "%" },
  { parameter: "Sideband 3 RF Level Scale", tx1: 100, tx2: 100, unit: "%" },
  { parameter: "Sideband 4 RF Level Scale", tx1: 100, tx2: 100, unit: "%" },
  { parameter: "Sideband VSWR Offset", tx1: 0, tx2: 0, unit: ":1" },
];

export const defaultVorPmdtData: VorPmdtData = {
  connected: true, alert: false, local: false, timestamp: "17/01/2011 23:33:56",
  transmitters: { tx1: { main: "green", antenna: "green", load: "gray", off: "gray" }, tx2: { main: "gray", antenna: "gray", load: "gray", off: "red" } },
  monitorIntegral: { normal: true, priAlarm: false, secAlarm: false, bypass: false },
  sidebarParams: { azimuth: { value: 0.1, status: "normal" }, hz30Mod: { value: 30.3, status: "normal" }, hz9960Mod: { value: 30.1, status: "normal" }, deviation: { value: 15.99, status: "normal" }, rfLevel: { value: 0, status: "normal" } },
  generalAlerts: defaultGeneralAlerts, monitorAgenAlerts: defaultMonitorAgenAlerts,
  digitalInputs: defaultDigitalInputs, digitalOutputs: defaultDigitalOutputs,
  systemPowerStatus: defaultSystemPowerStatus, txAlerts: defaultTxAlerts,
  alarmLogs: defaultAlarmLogs, maintenanceLogs: defaultMaintenanceLogs,
  integralData: defaultIntegralData, vswrData: defaultVswrData,
  alarmLimits: defaultAlarmLimits, monitorAzimuthLimits: { preAlarm: 0.9, alarm: 1 },
  monitorTimers: { shutdown: 5, continuousIdent: 17, noIdent: 17 },
  monitorAntennas: [{ monitor: 1, enabled: true, inputAttenuation: 0, azimuthAngle: 0 }, { monitor: 2, enabled: true, inputAttenuation: 0, azimuthAngle: 0 }],
  monitorOffsets: defaultMonitorOffsets, txPower: defaultTxPower, txFrequency: defaultTxFrequency,
  txVswr: defaultTxVswr, txSystemAlerts: defaultTxSystemAlerts,
  txCarrierPaAlerts: defaultTxCarrierPaAlerts, txSynthesizerAlerts: defaultTxSynthesizerAlerts,
  txSidebandPaAlerts: defaultTxSidebandPaAlerts, txConfigNominal: defaultTxConfigNominal,
  txOffsets: defaultTxOffsets,
};

export function cloneDefaultVorPmdtData(): VorPmdtData {
  return structuredClone(defaultVorPmdtData);
}
