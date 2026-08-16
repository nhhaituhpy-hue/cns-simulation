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
  VorRmsVoltageRow,
  VorRmsCurrentRow,
  VorRmsTemperatureRow,
  VorRmsAdDataRow,
  VorRmsConfigGeneral,
  VorRmsConfigStation,
  VorRmsStatus,
  VorRmsMonitorTransmitterStatus,
  VorSoftwareRevisionRow,
  VorHardwareRevisionRow,
  VorRmsOperationalSummary,
  VorRmsCommandLogEntry,
  VorRmsParameterLogEntry,
  VorMonitorConfigGeneralRow,
  VorNotchMonitorRow,
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
  { name: "Battery Charger", tx1: "green", tx2: "green" },
  { name: "48 V PS", tx1: "green", tx2: "green" },
  { name: "BCPS PS", tx1: "green", tx2: "green" },
  { name: "Carrier PA", tx1: "green", tx2: "green" },
  { name: "Sideband 1/2 PA", tx1: "green", tx2: "green" },
  { name: "Sideband 3/4 PA", tx1: "green", tx2: "green" },
];

export const defaultTxAlerts: VorDualIndicatorRow[] = [
  { name: "Carrier VSWR", tx1: "green", tx2: "green" },
  { name: "Carrier Overtemp", tx1: "green", tx2: "green" },
  { name: "Carrier Overpower", tx1: "green", tx2: "green" },
  { name: "SB1 PLL", tx1: "green", tx2: "green" },
  { name: "SB2 PLL", tx1: "green", tx2: "green" },
  { name: "SB3 PLL", tx1: "green", tx2: "green" },
  { name: "SB4 PLL", tx1: "green", tx2: "green" },
];

export const defaultAlarmLogs: VorAlarmLogEntry[] = [
  { timeTag: "07/18/26 21:06:33", type: "General", alarm: "On-Air Tx Shutdown", state: "Alarm" },
  { timeTag: "07/18/26 21:02:03", type: "General", alarm: "On-Air Tx Shutdown", state: "Alarm" },
  { timeTag: "01/10/26 13:17:27", type: "Monitor 2", alarm: "Ident Status", state: "Alarm" },
  { timeTag: "01/10/26 13:17:14", type: "Monitor 2", alarm: "Tx Frequency Error", state: "Alarm" },
  { timeTag: "01/10/26 13:17:12", type: "Monitor 2", alarm: "Az Angle", state: "Alarm" },
  { timeTag: "01/10/26 13:16:57", type: "Monitor 2", alarm: "Az Angle", state: "Normal" },
  { timeTag: "01/10/26 13:16:50", type: "Monitor 2", alarm: "Ident Status", state: "Alarm" },
  { timeTag: "01/10/26 13:16:37", type: "Monitor 2", alarm: "Az Angle", state: "Alarm" },
  { timeTag: "01/10/26 13:16:36", type: "General", alarm: "On-Air Tx Shutdown", state: "Alarm" },
  { timeTag: "01/10/26 13:16:33", type: "Monitor 2", alarm: "Tx Power", state: "Alarm" },
  { timeTag: "01/10/26 13:16:25", type: "Monitor 2", alarm: "Tx Power", state: "Normal" },
  { timeTag: "01/10/26 13:16:23", type: "Monitor 2", alarm: "Tx Power", state: "Alarm" },
  { timeTag: "12/31/25 19:09:34", type: "Monitor 2", alarm: "Az Angle", state: "Alarm" },
  { timeTag: "12/28/25 19:15:34", type: "Monitor 2", alarm: "Tx Power", state: "Alarm" },
  { timeTag: "12/04/25 19:12:11", type: "Monitor 1", alarm: "Ident Status", state: "Alarm" },
  { timeTag: "08/23/25 17:55:27", type: "Monitor 2", alarm: "Tx Frequency Error", state: "Normal" },
  { timeTag: "04/28/25 16:46:48", type: "Monitor 1", alarm: "Az Angle", state: "Alarm" },
  { timeTag: "04/28/25 16:46:47", type: "Monitor 2", alarm: "Az Angle", state: "Alarm" },
  { timeTag: "04/28/25 16:38:48", type: "Monitor 1", alarm: "On-Air Tx Shutdown", state: "Alarm" },
  { timeTag: "04/28/25 16:38:45", type: "Monitor 1", alarm: "Ident Code", state: "Alarm" },
];

export const defaultMaintenanceLogs: VorMaintenanceLogEntry[] = [
  { timeTag: "08/07/26 08:33:12", type: "Monitor 2", alert: "Az Angle", state: "Normal" },
  { timeTag: "08/07/26 08:33:11", type: "Monitor 1", alert: "Az Angle", state: "Normal" },
  { timeTag: "08/07/26 08:33:09", type: "Monitor 2", alert: "Az Angle", state: "Alert" },
  { timeTag: "08/07/26 08:33:08", type: "Monitor 1", alert: "Az Angle", state: "Alert" },
  { timeTag: "08/07/26 07:09:17", type: "Monitor 2", alert: "Az Angle", state: "Normal" },
  { timeTag: "08/07/26 07:09:10", type: "Monitor 2", alert: "Az Angle", state: "Alert" },
  { timeTag: "08/07/26 07:06:18", type: "Monitor 1", alert: "Az Angle", state: "Normal" },
  { timeTag: "08/07/26 07:06:14", type: "Monitor 2", alert: "Az Angle", state: "Normal" },
  { timeTag: "08/07/26 07:06:11", type: "Monitor 1", alert: "Az Angle", state: "Alert" },
  { timeTag: "08/07/26 07:06:02", type: "Monitor 2", alert: "Az Angle", state: "Alert" },
  { timeTag: "08/07/26 07:05:49", type: "Monitor 2", alert: "Az Angle", state: "Normal" },
  { timeTag: "08/07/26 07:05:41", type: "Monitor 1", alert: "Az Angle", state: "Normal" },
  { timeTag: "08/07/26 07:05:29", type: "Monitor 1", alert: "Az Angle", state: "Alert" },
  { timeTag: "08/07/26 07:05:25", type: "Monitor 2", alert: "Az Angle", state: "Alert" },
  { timeTag: "08/07/26 07:05:12", type: "Monitor 2", alert: "Az Angle", state: "Normal" },
  { timeTag: "08/07/26 07:05:11", type: "Monitor 1", alert: "Az Angle", state: "Normal" },
  { timeTag: "08/07/26 07:05:10", type: "Monitor 1", alert: "Az Angle", state: "Alert" },
  { timeTag: "08/07/26 07:05:01", type: "Monitor 2", alert: "Az Angle", state: "Alert" },
  { timeTag: "08/07/26 07:04:48", type: "Monitor 2", alert: "Az Angle", state: "Normal" },
  { timeTag: "08/07/26 07:04:40", type: "Monitor 1", alert: "Az Angle", state: "Normal" },
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

export const defaultVswrData = [
  1.08, 1.09, 1.11, 1.10, 1.08, 1.09, 1.15, 1.10, 1.10, 1.11, 1.10, 1.11,
  1.11, 1.10, 1.14, 1.10, 1.12, 1.11, 1.12, 1.11, 1.10, 1.10, 1.14, 1.12,
  1.06, 1.07, 1.05, 1.11, 1.05, 1.11, 1.11, 1.09, 1.11, 1.11, 1.12, 1.08,
  1.12, 1.00, 1.11, 1.12, 1.07, 1.09, 1.06, 1.05, 1.11, 1.10, 1.11, 1.15,
];

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
  { parameter: "Odd Antenna Sideband Return Loss Offset", integral: -4, standby: null, testGen: null, unit: "dB" },
  { parameter: "Even Antenna Sideband Return Loss Offset", integral: 0, standby: null, testGen: null, unit: "dB" },
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
  { parameter: "Carrier", value1: 1.04, value2: null }, { parameter: "Sideband #1", value1: 1.13, value2: null },
  { parameter: "Sideband #2", value1: 1.11, value2: null }, { parameter: "Sideband #3", value1: 1.08, value2: null },
  { parameter: "Sideband #4", value1: 1.09, value2: null },
];

const greenAlerts = (labels: string[]): VorIndicatorAlert[] => labels.map((label) => ({ label, indicator: "green" }));
export const defaultTxSystemAlerts = greenAlerts(["Audio Generator ROM Fault", "Audio Generator RAM Fault", "Audio Generator Functional Fault", "Audio Generator EEPROM Fault", "Audio Generator Comm Fault", "Audio RAM CRC Fault", "Audio Generator Disabled", "Transmitter Disabled"]);
export const defaultTxCarrierPaAlerts = greenAlerts(["Carrier Power", "Carrier Frequency", "Carrier Forward Power", "Carrier Reflected Power", "CSB to SBO Phase Control", "Carrier Modulation", "PA Thermal Shutdown"]);
export const defaultTxSynthesizerAlerts = greenAlerts(["CSB Power Fault", "Carrier Phase Error", "Carrier Phase Offset", "LSB Power Fault", "LSB Unlocked", "USB Power Fault", "USB Unlocked"]);
export const defaultTxSidebandPaAlerts: VorIndicatorAlert[] = [1, 2, 3, 4].flatMap((sideband) => [
  { label: `Sideband ${sideband} Phase`, indicator: "green" },
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
  { parameter: "Carrier-Sideband Phase Offset (Coarse)", tx1: 180, tx2: 90, unit: "°" },
  { parameter: "Carrier-Sideband Phase Offset (Fine)", tx1: 31, tx2: 29, unit: "°" },
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

export const defaultRmsVoltageData: VorRmsVoltageRow[] = [
  { parameter: "+3.3 VDC", low: 3.14, preLow: 3.14, volts: 3.29, preHigh: 3.46, high: 3.46 },
  { parameter: "+5 VDC", low: 4.75, preLow: 4.75, volts: 4.94, preHigh: 5.25, high: 5.25 },
  { parameter: "+12 VDC Analog", low: 10.80, preLow: 10.80, volts: 12.10, preHigh: 13.20, high: 13.20 },
  { parameter: "-12 VDC Analog", low: -13.20, preLow: -13.20, volts: -12.25, preHigh: -10.80, high: -10.80 },
  { parameter: "+12 VDC Digital", low: 10.80, preLow: 10.80, volts: 12.08, preHigh: 13.20, high: 13.20 },
  { parameter: "-12 VDC Digital", low: -13.20, preLow: -13.20, volts: -12.23, preHigh: -10.80, high: -10.80 },
  { parameter: "+15 VDC", low: 13.50, preLow: 13.50, volts: 14.96, preHigh: 16.50, high: 16.50 },
  { parameter: "-15 VDC", low: -16.50, preLow: -16.50, volts: -15.01, preHigh: -13.50, high: -13.50 },
  { parameter: "+24 VDC", low: 21.6, preLow: 21.6, volts: 23.6, preHigh: 26.4, high: 26.4 },
  { parameter: "AC Input", low: 180.0, preLow: 180.0, volts: 232.3, preHigh: 260.0, high: 260.0 },
  { parameter: "OB Light", low: 180.0, preLow: 180.0, volts: 0.0, preHigh: 260.0, high: 260.0 },
  { parameter: "Tx 1 48 V PS 1", low: 46.6, preLow: 46.6, volts: 51.9, preHigh: 54.4, high: 54.4 },
  { parameter: "Tx 1 48 V PS 2", low: 46.6, preLow: 46.6, volts: 0.0, preHigh: 54.4, high: 54.4 },
  { parameter: "Tx 2 48 V PS 1", low: 46.6, preLow: 46.6, volts: 52.9, preHigh: 54.4, high: 54.4 },
  { parameter: "Tx 2 48 V PS 2", low: 46.6, preLow: 46.6, volts: 0.0, preHigh: 54.4, high: 54.4 },
  { parameter: "Battery 1", low: 42.0, preLow: 42.0, volts: 54.3, preHigh: 60.0, high: 60.0 },
  { parameter: "Battery 2", low: 42.0, preLow: 42.0, volts: 54.4, preHigh: 60.0, high: 60.0 },
];

export const defaultRmsCurrentData: VorRmsCurrentRow[] = [
  { parameter: "AC Input", low: 1.0, preLow: 1.0, amps: 2.3, preHigh: 7.0, high: 7.0 },
  { parameter: "OB Light", low: 0.0, preLow: 0.0, amps: 0.0, preHigh: 20.0, high: 20.0 },
  { parameter: "Tx 1 48 V PS 1", low: 0.5, preLow: 0.5, amps: 5.5, preHigh: 15.0, high: 15.0 },
  { parameter: "Tx 1 48 V PS 2", low: 0.5, preLow: 0.5, amps: 0.0, preHigh: 15.0, high: 15.0 },
  { parameter: "Tx 2 48 V PS 1", low: 0.5, preLow: 0.5, amps: 2.5, preHigh: 15.0, high: 15.0 },
  { parameter: "Tx 2 48 V PS 2", low: 0.5, preLow: 0.5, amps: 0.0, preHigh: 15.0, high: 15.0 },
  { parameter: "Battery 1", low: -6.0, preLow: -6.0, amps: 0.0, preHigh: 10.0, high: 10.0 },
  { parameter: "Battery 2", low: -6.0, preLow: -6.0, amps: 0.0, preHigh: 10.0, high: 10.0 },
];

export const defaultRmsTemperatureData: VorRmsTemperatureRow[] = [
  { parameter: "External Sensor", low: -25, preLow: -25, value: -25, preHigh: 70, high: 70 },
  { parameter: "Cabinet Interface", low: 0, preLow: 0, value: 7, preHigh: 40, high: 40 },
  { parameter: "RF Monitor", low: null, preLow: null, value: 20, preHigh: 80, high: 85 },
  { parameter: "BCPS #1", low: null, preLow: null, value: 24, preHigh: 80, high: 85 },
  { parameter: "Carrier PA #1", low: null, preLow: null, value: 32, preHigh: 80, high: 85 },
  { parameter: "Sideband 1/2 PA #1", low: null, preLow: null, value: 24, preHigh: 80, high: 85 },
  { parameter: "Sideband 3/4 PA #1", low: null, preLow: null, value: 25, preHigh: 80, high: 85 },
  { parameter: "Synthesizer #1", low: null, preLow: null, value: 31, preHigh: 80, high: 85 },
  { parameter: "BCPS #2", low: null, preLow: null, value: 23, preHigh: 80, high: 85 },
  { parameter: "Carrier PA #2", low: null, preLow: null, value: 19, preHigh: 80, high: 85 },
  { parameter: "Sideband 1/2 PA #2", low: null, preLow: null, value: 25, preHigh: 80, high: 85 },
  { parameter: "Sideband 3/4 PA #2", low: null, preLow: null, value: 21, preHigh: 80, high: 85 },
  { parameter: "Synthesizer #2", low: null, preLow: null, value: 30, preHigh: 80, high: 85 },
];

export const defaultRmsAdData: VorRmsAdDataRow[] = Array.from({ length: 10 }, (_, i) => ({
  parameter: `Spare A/D ${i + 1}`,
  low: -5.00,
  preLow: -5.00,
  volts: i === 3 ? 0 : -0.01,
  preHigh: 5.00,
  high: 5.00,
}));

export const defaultRmsConfigGeneral: VorRmsConfigGeneral = {
  monitorIntegrityTestsEnabled: true,
  votingLogic: "AND",
  transfer: "on Primary Alarm",
  automaticRestartsEnabled: false,
  firstRestartDelay: 50,
  numberOfAutomaticRestarts: 2,
  rcsuPresent: true,
  rcsuConnectionType: "Dedicated Modem",
  spiFilterType: "Normal",
  coLocatedType: "SELEX 1118A/1119A DME",
  smokeAlarmInstalled: false,
  intrusionAlarmInstalled: false,
  exitDelay: 30,
  entryDelay: 5,
  remoteResetEnabledSmoke: true,
  remoteResetEnabledIntrusion: true,
  spareInputs: ["Not Present", "Not Present", "Not Present", "Not Present"],
  rmmConnectionType: "PSTN Modem",
  dialInRings: 1,
  dialOutOnStatusChange: "Disabled",
  dialOutPhoneNumber: "6811",
  toneDialOut: true,
};

export const defaultRmsConfigStation: VorRmsConfigStation = {
  stationType: "DVOR",
  transmitterConfig: "Dual Transmitters",
  monitorConfig: "Dual Monitors",
  stationDescription: "TST",
  transmitterFrequency: "TST",
};

export const defaultRmsStatus: VorRmsStatus = {
  logonLevel: 3,
  softwareRevisionTimestamp: "04/28/25 20:30:33",
  hardwareRevisionTimestamp: "08/08/26 12:14:06",
  localControlMode: false,
  maintenanceAlert: false,
  onBattery: false,
  acFailure: false,
  remoteControlEnabled: true,
  groundCheckRunning: false,
  holdCommutatorEnabled: false,
  rcsuConnectionEnabled: true,
  rcsuCommunicationError: false,
};

export const defaultRmsMonitorTransmitterStatus: VorRmsMonitorTransmitterStatus = {
  monitorAlarmShutdown: false,
  enabledMonitors: { monitor1: true, monitor2: true },
  monitors: [
    { name: "Integral", bypass: false, primaryAlarm: false, secondaryAlarm: false, primaryMismatch: false, secondaryMismatch: false },
    { name: "Standby", bypass: false, primaryAlarm: false, secondaryAlarm: false, primaryMismatch: false, secondaryMismatch: false },
  ],
  antennaSelect: 1,
  mainSelect: 1,
  transmitterOn: { tx1: true, tx2: false },
};

export const defaultSoftwareRevisions: VorSoftwareRevisionRow[] = [
  { component: "RMS (A3A6)", revision: "5.2.0.6" },
  { component: "Monitor 1 (A3A3)", revision: "5.1.0.4" },
  { component: "Monitor 2 (A3A10)", revision: "5.1.0.4" },
  { component: "Audio Generator 1 (A3A2)", revision: "5.1.0.2" },
  { component: "Audio Generator 2 (A3A9)", revision: "5.1.0.2" },
  { component: "BCPS 1 (A5A1)", revision: "1.6" },
  { component: "BCPS 2 (A5A2)", revision: "1.6" },
  { component: "LCU (A1)", revision: "1.1" },
];

export const defaultHardwareRevisions: VorHardwareRevisionRow[] = [
  { module: "Synth 1", partNumber: "030838-1001", revision: "J", serialNumber: "110371", notes: "" },
  { module: "Synth 2", partNumber: "030838-1001", revision: "K", serialNumber: "110374", notes: "" },
  { module: "RF Monitor", partNumber: "030829-0001", revision: "E", serialNumber: "110205", notes: "" },
  { module: "CA 1", partNumber: "030825-0003", revision: "E", serialNumber: "110444", notes: "" },
  { module: "CA 2", partNumber: "030825-0003", revision: "B", serialNumber: "110262", notes: "" },
  { module: "SideBand 1 1/2", partNumber: "030824-0001", revision: "H", serialNumber: "110708", notes: "" },
  { module: "SideBand 1 3/4", partNumber: "030824-0002", revision: "H", serialNumber: "110710", notes: "" },
  { module: "SideBand 2 1/2", partNumber: "030824-0002", revision: "H", serialNumber: "110711", notes: "" },
  { module: "SideBand 2 3/4", partNumber: "030824-0002", revision: "H", serialNumber: "110712", notes: "" },
  { module: "Commutator Control", partNumber: "012257-1001", revision: "E", serialNumber: "ARC000209", notes: "" },
];

export const defaultRmsOperationalSummary: VorRmsOperationalSummary = {
  rows: [
    { parameter: "Normal Operation", tx1: 29194.66, tx2: 30177.61, unit: "Hours" },
    { parameter: "Monitor Bypass", tx1: 9.79, tx2: 13.58, unit: "Hours" },
    { parameter: "Transmitter Off", tx1: 30253.57, tx2: 29267.02, unit: "Hours" },
    { parameter: "Hot Standby", tx1: 0.58, tx2: 0.40, unit: "Hours" },
  ],
  availabilityTx1: 32.5638,
  availabilityTx2: 33.6599,
  startTime: "05/16/16 21:46:21",
  endTime: "08/08/26 13:22:17",
  hoursElapsed: 89655.5989,
};

export const defaultRmsCommandLogs: VorRmsCommandLogEntry[] = [
  { timeTag: "08/08/26 13:20:53", userName: "RCSU", command: "Remote RMS Logon" },
  { timeTag: "08/08/26 13:19:03", userName: "RCSU", command: "RMS Logoff" },
  { timeTag: "08/08/26 13:18:17", userName: "RCSU", command: "Remote RMS Logon" },
  { timeTag: "08/08/26 07:45:32", userName: "RCSU", command: "RMS Logoff" },
  { timeTag: "08/08/26 07:45:01", userName: "RCSU", command: "Remote RMS Logon" },
  { timeTag: "08/08/26 07:42:14", userName: "RCSU", command: "RMS Logoff" },
  { timeTag: "08/08/26 07:40:51", userName: "RCSU", command: "Remote RMS Logon" },
  { timeTag: "08/08/26 07:21:05", userName: "RCSU", command: "RMS Logoff" },
  { timeTag: "08/06/26 20:53:14", userName: "RCSU", command: "Remote RMS Logon" },
  { timeTag: "08/06/26 18:29:20", userName: "RCSU", command: "RMS Logoff" },
  { timeTag: "08/06/26 18:25:26", userName: "RCSU", command: "Remote RMS Logon" },
  { timeTag: "08/06/26 18:08:08", userName: "RCSU", command: "RMS Logoff" },
  { timeTag: "08/05/26 18:07:26", userName: "RCSU", command: "Remote RMS Logon" },
  { timeTag: "08/05/26 16:55:53", userName: "RCSU", command: "RMS Logoff" },
  { timeTag: "08/05/26 16:55:18", userName: "RCSU", command: "Remote RMS Logon" },
  { timeTag: "08/05/26 06:42:28", userName: "RCSU", command: "RMS Logoff" },
  { timeTag: "08/05/26 06:27:20", userName: "RCSU", command: "Remote RMS Logon" },
  { timeTag: "08/05/26 06:26:46", userName: "RCSU", command: "RMS Logoff" },
  { timeTag: "08/05/26 06:26:08", userName: "RCSU", command: "Remote RMS Logon" },
  { timeTag: "08/04/26 18:13:07", userName: "RCSU", command: "RMS Logoff" },
];

export const defaultRmsParameterLogs: VorRmsParameterLogEntry[] = [
  { timeTag: "07/31/26 18:35:55", userName: "R", file: "Nominal Monitor Limits" },
  { timeTag: "07/31/26 18:35:54", userName: "R", file: "Monitor Configuration" },
  { timeTag: "07/31/26 18:26:26", userName: "R", file: "Nominal Monitor Limits" },
  { timeTag: "07/31/26 18:26:25", userName: "R", file: "Monitor Configuration" },
  { timeTag: "07/16/26 08:33:40", userName: "R", file: "Monitor #1 Offsets and Scale Factors" },
  { timeTag: "07/16/26 08:33:21", userName: "R", file: "Monitor #1 Offsets and Scale Factors" },
  { timeTag: "07/01/26 09:43:31", userName: "R", file: "Nominal Monitor Limits" },
  { timeTag: "07/01/26 09:43:30", userName: "R", file: "Monitor Configuration" },
  { timeTag: "06/26/26 22:46:38", userName: "R", file: "Nominal Monitor Limits" },
  { timeTag: "06/26/26 22:46:37", userName: "R", file: "Monitor Configuration" },
  { timeTag: "06/26/26 20:11:36", userName: "R", file: "Nominal Monitor Limits" },
  { timeTag: "06/26/26 20:11:35", userName: "R", file: "Monitor Configuration" },
  { timeTag: "06/26/26 20:10:26", userName: "R", file: "Nominal Monitor Limits" },
  { timeTag: "06/26/26 20:10:25", userName: "R", file: "Monitor Configuration" },
  { timeTag: "05/23/26 09:28:28", userName: "R", file: "Monitor #2 Offsets and Scale Factors" },
  { timeTag: "05/23/26 09:28:21", userName: "R", file: "Monitor #2 Offsets and Scale Factors" },
  { timeTag: "05/21/26 11:59:46", userName: "R", file: "Monitor #2 Offsets and Scale Factors" },
  { timeTag: "05/01/26 15:59:16", userName: "R", file: "Nominal Monitor Limits" },
];

export const defaultMonitorConfigGeneral: VorMonitorConfigGeneralRow[] = [
  { parameter: "30 Hz Modulation", primary: true, secondary: false },
  { parameter: "9960 Hz Modulation", primary: true, secondary: false },
  { parameter: "9960 Hz Deviation", primary: true, secondary: false },
  { parameter: "Tx Power", primary: true, secondary: false },
  { parameter: "RF Level", primary: true, secondary: false },
  { parameter: "Ident Modulation", primary: true, secondary: false },
  { parameter: "Ident Status", primary: true, secondary: false },
  { parameter: "Ident Code", primary: true, secondary: false },
  { parameter: "Tx Frequency Error", primary: true, secondary: false },
  { parameter: "Notch Monitor", primary: false, secondary: false, isCheckbox: true, checked: false },
  { parameter: "Sideband VSWR", primary: true, secondary: false, isCheckbox: true, checked: true },
];

export const defaultNotchData: VorNotchMonitorRow[] = [
  { antenna: 1, baseline: 18.2, mon1: 21.0, mon2: 21.2 },
  { antenna: 2, baseline: 21.1, mon1: 19.3, mon2: 17.9 },
  { antenna: 3, baseline: 25.3, mon1: 26.0, mon2: 26.8 },
  { antenna: 4, baseline: 27.1, mon1: 29.7, mon2: 26.6 },
  { antenna: 5, baseline: 27.8, mon1: 35.2, mon2: 34.1 },
  { antenna: 6, baseline: 28.5, mon1: 29.0, mon2: 29.2 },
  { antenna: 7, baseline: 30.5, mon1: 31.7, mon2: 31.6 },
  { antenna: 8, baseline: 30.0, mon1: 32.0, mon2: 29.0 },
  { antenna: 9, baseline: 33.0, mon1: 37.0, mon2: 36.0 },
  { antenna: 10, baseline: 34.1, mon1: 35.8, mon2: 37.4 },
  { antenna: 11, baseline: 35.6, mon1: 41.1, mon2: 42.1 },
  { antenna: 12, baseline: 42.2, mon1: 47.7, mon2: 47.1 },
  { antenna: 13, baseline: 54.3, mon1: 56.4, mon2: 54.6 },
  { antenna: 14, baseline: 59.7, mon1: 60.7, mon2: 53.9 },
  { antenna: 15, baseline: 65.6, mon1: 57.6, mon2: 52.3 },
  { antenna: 16, baseline: 62.0, mon1: 60.7, mon2: 54.2 },
  { antenna: 17, baseline: 62.5, mon1: 60.0, mon2: 57.1 },
  { antenna: 18, baseline: 65.4, mon1: 71.0, mon2: 69.6 },
  { antenna: 19, baseline: 59.2, mon1: 44.4, mon2: 47.8 },
  { antenna: 20, baseline: 54.7, mon1: 48.5, mon2: 51.7 },
  { antenna: 21, baseline: 48.1, mon1: 46.0, mon2: 42.8 },
  { antenna: 22, baseline: 45.1, mon1: 44.2, mon2: 42.0 },
  { antenna: 23, baseline: 32.6, mon1: 35.7, mon2: 36.0 },
  { antenna: 24, baseline: 32.9, mon1: 39.7, mon2: 38.4 },
  { antenna: 25, baseline: 30.4, mon1: 38.4, mon2: 40.1 },
  { antenna: 26, baseline: 29.7, mon1: 32.7, mon2: 32.4 },
  { antenna: 27, baseline: 29.4, mon1: 28.4, mon2: 29.4 },
  { antenna: 28, baseline: 29.9, mon1: 30.7, mon2: 30.9 },
  { antenna: 29, baseline: 28.6, mon1: 30.1, mon2: 30.3 },
  { antenna: 30, baseline: 25.4, mon1: 25.3, mon2: 27.5 },
  { antenna: 31, baseline: 23.0, mon1: 22.9, mon2: 23.2 },
  { antenna: 32, baseline: 23.1, mon1: 22.5, mon2: 22.6 },
  { antenna: 33, baseline: 21.2, mon1: 22.3, mon2: 21.4 },
  { antenna: 34, baseline: 17.6, mon1: 18.5, mon2: 18.4 },
  { antenna: 35, baseline: 9.2, mon1: 10.9, mon2: 9.4 },
  { antenna: 36, baseline: 16.6, mon1: 17.2, mon2: 17.3 },
  { antenna: 37, baseline: 20.5, mon1: 22.2, mon2: 20.6 },
  { antenna: 38, baseline: 25.0, mon1: 25.1, mon2: 25.2 },
  { antenna: 39, baseline: 27.0, mon1: 25.3, mon2: 24.9 },
  { antenna: 40, baseline: 22.9, mon1: 22.4, mon2: 22.5 },
  { antenna: 41, baseline: 22.7, mon1: 21.3, mon2: 22.0 },
  { antenna: 42, baseline: 25.6, mon1: 26.1, mon2: 26.0 },
  { antenna: 43, baseline: 25.3, mon1: 26.1, mon2: 25.8 },
  { antenna: 44, baseline: 22.6, mon1: 26.5, mon2: 25.8 },
  { antenna: 45, baseline: 20.0, mon1: 22.6, mon2: 21.5 },
  { antenna: 46, baseline: 14.2, mon1: 12.9, mon2: 12.6 },
  { antenna: 47, baseline: 13.9, mon1: 13.4, mon2: 12.8 },
  { antenna: 48, baseline: 14.7, mon1: 14.4, mon2: 13.0 },
];

export const defaultVorPmdtData: VorPmdtData = {
  connected: true, alert: false, local: false, timestamp: "08/08/26 13:20:56",
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
  rmsVoltageData: defaultRmsVoltageData,
  rmsCurrentData: defaultRmsCurrentData,
  bcpsCommFaults: { bcps1: false, bcps2: false },
  rmsTemperatureData: defaultRmsTemperatureData,
  rmsAdData: defaultRmsAdData,
  rmsConfigGeneral: defaultRmsConfigGeneral,
  rmsConfigStation: defaultRmsConfigStation,
  rmsStatus: defaultRmsStatus,
  rmsMonitorTransmitterStatus: defaultRmsMonitorTransmitterStatus,
  softwareRevisions: defaultSoftwareRevisions,
  hardwareRevisions: defaultHardwareRevisions,
  rmsOperationalSummary: defaultRmsOperationalSummary,
  rmsCommandLogs: defaultRmsCommandLogs,
  rmsParameterLogs: defaultRmsParameterLogs,
  monitorConfigGeneral: defaultMonitorConfigGeneral,
  notchData: defaultNotchData,
};

export function cloneDefaultVorPmdtData(): VorPmdtData {
  return structuredClone(defaultVorPmdtData);
}
