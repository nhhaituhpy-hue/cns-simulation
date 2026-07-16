# VOR PMDT — Dữ liệu mẫu chi tiết (Phụ lục)

> Phụ lục cho VOR_PMDT_IMPLEMENTATION_GUIDE.md. Chứa tất cả giá trị default cần hardcode vào `vor-pmdt-defaults.ts`.

---

## 1. SIDEBAR DEFAULT VALUES

```typescript
const DEFAULT_TRANSMITTERS = {
  tx1: { main: 'green', antenna: 'green', load: 'gray', off: 'gray' },
  tx2: { main: 'gray', antenna: 'gray', load: 'gray', off: 'red' },
};

const DEFAULT_MONITOR_INTEGRAL = {
  normal: true, priAlarm: false, secAlarm: false, bypass: false,
};

const DEFAULT_SIDEBAR_PARAMS = {
  azimuth: { value: 0.10, status: 'normal' },
  hz30Mod: { value: 30.3, status: 'normal' },
  hz9960Mod: { value: 30.1, status: 'normal' },
  deviation: { value: 15.99, status: 'normal' },
  rfLevel: { value: 0.0, status: 'normal' },
};
```

---

## 2. RMS GENERAL ALERTS (14 checkboxes)

```typescript
const DEFAULT_GENERAL_ALERTS = [
  { id: 'local-mode', label: 'Local Mode', checked: false },
  { id: 'rms-power-supply', label: 'RMS Power Supply Data', checked: false },
  { id: 'rms-ad-data', label: 'RMS A/D Data', checked: false },
  { id: 'rms-digital-io', label: 'RMS Digital I/O Data', checked: false },
  { id: 'lcd-comm-link', label: 'LCD Comm Link Failed', checked: false },
  { id: 'test-gen-fault', label: 'Test Generator Fault', checked: false },
  { id: 'lcu-bus-failure', label: 'LCU Bus Failure', checked: false },
  { id: 'ac-power-failure', label: 'A/C Power Failure', checked: false },
  { id: 'sys48-ps1', label: 'Sys 48 VDC PS 1 Failure', checked: false },
  { id: 'sys48-ps2', label: 'Sys 48 VDC PS 2 Failure', checked: false },
  { id: 'transfer-relay', label: 'Transfer Relay Failure', checked: false },
  { id: 'standby-tx', label: 'Standby Tx on the Air', checked: false },
  { id: 'lcu-config', label: 'LCU Config Mismatch', checked: false },
  { id: 'freq-config', label: 'Frequency Config Mismatch', checked: false },
  { id: 'integral-monitor', label: 'Integral Monitor Mismatch', checked: false },
];
```

## 3. MONITOR/AGEN ALERTS TABLE (8 rows × 4 columns)

```typescript
const DEFAULT_MONITOR_AGEN_ALERTS = [
  { label: 'RMS Comm Link Failed', mon1: true, mon2: true, agen1: false, agen2: false },
  { label: 'Integrity Test Failed', mon1: true, mon2: true, agen1: false, agen2: false },
  { label: 'File System Fault', mon1: false, mon2: true, agen1: false, agen2: false },
  { label: 'Backplane Switch Mismatch', mon1: true, mon2: true, agen1: false, agen2: false },
  { label: 'Maintenance Alert', mon1: false, mon2: false, agen1: false, agen2: false },
  { label: 'Pre-Alarm', mon1: false, mon2: false, agen1: false, agen2: false },
  { label: 'Primary Alarm', mon1: false, mon2: false, agen1: false, agen2: false },
  { label: 'Secondary Alarm', mon1: false, mon2: false, agen1: false, agen2: false },
];
```

## 4. DIGITAL I/O DATA

```typescript
const DEFAULT_DIGITAL_INPUTS = [
  { name: 'Smoke Detector', configuration: 'Disabled', status: '' },
  { name: 'Intrusion Detector', configuration: 'Disabled', status: '' },
  { name: 'Spare Input 1', configuration: 'Not Present', status: '' },
  { name: 'Spare Input 2', configuration: 'Not Present', status: '' },
  { name: 'Spare Input 3', configuration: 'Not Present', status: '' },
  { name: 'Spare Input 4', configuration: 'Not Present', status: '' },
];

const DEFAULT_DIGITAL_OUTPUTS = [
  { name: 'Battery Charger', status: 'Off', altStatus: 'Trickle' },
  { name: 'Spare Output 1', status: 'Low' },
  { name: 'Spare Output 2', status: 'Low' },
  { name: 'Spare Output 3', status: 'Low' },
  { name: 'Spare Output 4', status: 'Low' },
];

const DEFAULT_SYSTEM_POWER_STATUS = [
  { name: 'Battery Fault', tx1: 'green', tx2: 'green' },
  { name: 'On Battery', tx1: 'green', tx2: 'green' },
  { name: 'LVPS', tx1: 'green', tx2: 'green' },
  { name: 'RMS', tx1: 'green', tx2: 'gray' },
  { name: 'Facilities', tx1: 'green', tx2: 'gray' },
  { name: 'Test Generator', tx1: 'green', tx2: 'gray' },
  { name: 'LCU', tx1: 'green', tx2: 'gray' },
];

const DEFAULT_TX_ALERTS = [
  { name: 'Carrier VSWR', tx1: 'green', tx2: 'red' },
  { name: 'Carrier Overtemp', tx1: 'green', tx2: 'red' },
  { name: 'Carrier Overpower', tx1: 'green', tx2: 'red' },
  { name: 'SB1 PLL', tx1: 'green', tx2: 'green' },
  { name: 'SB2 PLL', tx1: 'green', tx2: 'green' },
  { name: 'SB3 PLL', tx1: 'green', tx2: 'green' },
  { name: 'SB4 PLL', tx1: 'green', tx2: 'green' },
];
```

## 5. ALARM LOGS (sample 20 entries)

```typescript
const DEFAULT_ALARM_LOGS = [
  { timeTag: '17/01/2011 22:23:55', type: 'Monitor 2', alarm: 'Tx Frequency Error', state: 'Normal' },
  { timeTag: '17/01/2011 22:23:55', type: 'Monitor 1', alarm: '30Hz Modulation', state: 'Normal' },
  { timeTag: '17/01/2011 22:23:54', type: 'Monitor 2', alarm: 'Az Angle', state: 'Normal' },
  { timeTag: '17/01/2011 22:23:53', type: 'Monitor 1', alarm: 'Az Angle', state: 'Normal' },
  { timeTag: '17/01/2011 22:23:53', type: 'Monitor 1', alarm: '30Hz Modulation', state: 'Normal' },
  { timeTag: '17/01/2011 20:52:09', type: 'Monitor 2', alarm: '9960Hz Modulation', state: 'Alarm' },
  { timeTag: '17/01/2011 20:52:07', type: 'Monitor 1', alarm: '30Hz Modulation', state: 'Alarm' },
  { timeTag: '17/01/2011 20:52:07', type: 'Monitor 2', alarm: '9960Hz Modulation', state: 'Alarm' },
  { timeTag: '13/01/2011 15:02:45', type: 'Monitor 2', alarm: 'Az Angle', state: 'Alarm' },
  { timeTag: '13/01/2011 14:10:25', type: 'Monitor 2', alarm: '9960Hz Modulation', state: 'Alarm' },
  { timeTag: '12/01/2011 16:44:14', type: 'Monitor 2', alarm: 'Az Angle', state: 'Normal' },
  { timeTag: '12/01/2011 16:44:12', type: 'Monitor 2', alarm: 'Az Angle', state: 'Alarm' },
  { timeTag: '12/01/2011 16:29:55', type: 'Monitor 2', alarm: 'Tx Frequency Error', state: 'Alarm' },
  { timeTag: '12/01/2011 16:28:02', type: 'Monitor 2', alarm: '9960Hz Modulation', state: 'Alarm' },
  { timeTag: '12/01/2011 16:25:59', type: 'Monitor 1', alarm: 'Tx Frequency Error', state: 'Alarm' },
  { timeTag: '12/01/2011 16:25:57', type: 'Monitor 2', alarm: 'Az Angle', state: 'Normal' },
  { timeTag: '12/01/2011 16:25:55', type: 'Monitor 1', alarm: 'Tx Frequency Error', state: 'Normal' },
  { timeTag: '12/01/2011 16:25:52', type: 'Monitor 2', alarm: 'Az Angle', state: 'Alarm' },
  { timeTag: '12/01/2011 16:25:42', type: 'Monitor 2', alarm: 'Az Angle', state: 'Normal' },
  { timeTag: '12/01/2011 16:25:40', type: 'Monitor 2', alarm: 'Az Angle', state: 'Alarm' },
];
```

## 6. MAINTENANCE ALERT LOGS (sample 20 entries)

```typescript
const DEFAULT_MAINTENANCE_LOGS = [
  { timeTag: '17/01/2011 23:21:49', type: 'General', alert: 'Local Mode', state: 'Normal' },
  { timeTag: '17/01/2011 23:21:40', type: 'Digital Input', alert: 'Battery B1 Fault', state: 'Normal' },
  { timeTag: '17/01/2011 23:21:39', type: 'BCPS 1', alert: 'Battery Fault', state: 'Normal' },
  { timeTag: '17/01/2011 23:21:33', type: 'BCPS 2', alert: 'Battery R2 Fault', state: 'Normal' },
  { timeTag: '17/01/2011 23:21:33', type: 'BCPS 2', alert: 'Battery Fault', state: 'Normal' },
  { timeTag: '17/01/2011 23:04:26', type: 'Monitor 1', alert: 'Ident Modulation', state: 'Normal' },
  { timeTag: '17/01/2011 23:04:25', type: 'Monitor 2', alert: 'Ident Modulation', state: 'Normal' },
  { timeTag: '17/01/2011 23:04:23', type: 'Monitor 2', alert: 'Ident Status', state: 'Alert' },
  { timeTag: '17/01/2011 23:04:21', type: 'Monitor 1', alert: 'Ident Status', state: 'Normal' },
  { timeTag: '17/01/2011 22:24:28', type: 'Monitor 2', alert: 'Ident Code', state: 'Alert' },
  { timeTag: '17/01/2011 22:24:26', type: 'Monitor 1', alert: 'Ident Code', state: 'Alert' },
  { timeTag: '17/01/2011 22:24:10', type: 'Monitor 2', alert: 'Ident Status', state: 'Alert' },
  { timeTag: '17/01/2011 22:23:55', type: 'Monitor 2', alert: '30Hz Modulation', state: 'Normal' },
  { timeTag: '17/01/2011 22:23:54', type: 'Monitor 2', alert: 'Az Angle', state: 'Normal' },
  { timeTag: '17/01/2011 22:23:53', type: 'Audio Gen 1', alert: 'Carrier Phase Error Fault', state: 'Normal' },
  { timeTag: '17/01/2011 22:23:53', type: 'Audio Gen 1', alert: 'Carrier Reflected Power Fault', state: 'Normal' },
  { timeTag: '17/01/2011 22:23:53', type: 'Audio Gen 1', alert: 'CSB Power Fault', state: 'Normal' },
  { timeTag: '17/01/2011 22:23:53', type: 'Audio Gen 1', alert: 'LSB Power Fault', state: 'Normal' },
  { timeTag: '17/01/2011 22:23:52', type: 'Audio Gen 1', alert: 'Carrier Forward Power Fault', state: 'Normal' },
  { timeTag: '17/01/2011 22:23:52', type: 'Audio Gen 1', alert: 'Audio Generator Disabled', state: 'Normal' },
];
```

## 7. INTEGRAL MONITOR DATA (11 rows × 2 monitors)

```typescript
const DEFAULT_INTEGRAL_DATA = [
  { label: 'Azimuth', mon1Value: '0.10', mon1Status: 'green', mon2Value: '0.11', mon2Status: 'green', unit: '°' },
  { label: '30 Hz Modulation', mon1Value: '30.3', mon1Status: 'green', mon2Value: '30.2', mon2Status: 'green', unit: '%' },
  { label: '9960 Hz Modulation', mon1Value: '30.1', mon1Status: 'green', mon2Value: '28.9', mon2Status: 'green', unit: '%' },
  { label: '9960 Hz Deviation', mon1Value: '15.99', mon1Status: 'green', mon2Value: '15.98', mon2Status: 'green', unit: 'Ratio' },
  { label: 'RF Level', mon1Value: '0.0', mon1Status: 'green', mon2Value: '-0.1', mon2Status: 'green', unit: 'dB' },
  { label: 'Ident Modulation', mon1Value: '4.9', mon1Status: 'green', mon2Value: '4.9', mon2Status: 'green', unit: '%' },
  { label: 'Ident Status', mon1Value: 'Normal', mon1Status: 'green', mon2Value: 'Normal', mon2Status: 'green', unit: '' },
  { label: 'Ident Code', mon1Value: 'FLR', mon1Status: 'green', mon2Value: 'FLR', mon2Status: 'green', unit: '' },
  { label: 'Tx Power', mon1Value: '98.8', mon1Status: 'green', mon2Value: '98.7', mon2Status: 'green', unit: 'Watts' },
  { label: 'Tx Frequency', mon1Value: '113.0000', mon1Status: 'green', mon2Value: '113.0000', mon2Status: 'green', unit: 'MHz' },
  { label: 'Tx Frequency Error', mon1Value: '0', mon1Status: 'green', mon2Value: '-2', mon2Status: 'green', unit: 'ppm' },
];
```

## 8. VSWR DATA (48 antennas)

```typescript
const DEFAULT_VSWR_DATA = [
  1.08, 1.09, 1.01, 1.04, 1.04, 1.07, 1.14, 1.07,
  1.13, 1.11, 1.26, 1.11, 1.30, 1.04, 1.07, 1.05,
  1.23, 1.05, 1.25, 1.07, 1.14, 1.00, 1.31, 1.04,
  1.32, 1.18, 1.29, 1.04, 1.11, 1.11, 1.18, 1.10,
  1.24, 1.07, 1.34, 1.03, 1.28, 1.06, 1.36, 1.23,
  1.18, 1.08, 1.17, 1.10, 1.28, 1.11, 1.04, 1.15,
]; // All default to 'green' status
```

## 9. ALARM LIMITS

```typescript
const DEFAULT_ALARM_LIMITS = [
  { parameter: '30 Hz Modulation', alarmLow: 28.0, preAlarmLow: 28.5, nominal: 30.0, preAlarmHigh: 31.5, alarmHigh: 32.0, unit: '%' },
  { parameter: '9960 Hz Modulation', alarmLow: 28.0, preAlarmLow: 28.5, nominal: 30.0, preAlarmHigh: 31.5, alarmHigh: 32.0, unit: '%' },
  { parameter: '9960 Hz Deviation', alarmLow: 15.00, preAlarmLow: 15.20, nominal: 16.30, preAlarmHigh: 16.30, alarmHigh: 17.00, unit: 'Ratio' },
  { parameter: 'RF Level', alarmLow: -3.0, preAlarmLow: -2.5, nominal: 0.0, preAlarmHigh: 2.5, alarmHigh: 3.0, unit: 'dB' },
  { parameter: 'Tx Power', alarmLow: 70.0, preAlarmLow: 95.0, nominal: 115.0, preAlarmHigh: 115.0, alarmHigh: 130.0, unit: 'Watts' },
  { parameter: 'Tx Frequency Error', alarmLow: -20, preAlarmLow: -18, nominal: 0, preAlarmHigh: 18, alarmHigh: 20, unit: 'ppm' },
  { parameter: 'Ident Modulation', alarmLow: 2.0, preAlarmLow: 4.0, nominal: 5.0, preAlarmHigh: 9.0, alarmHigh: 10.0, unit: '%' },
];
```

## 10. MONITOR OFFSETS (12 params)

```typescript
const DEFAULT_MONITOR_OFFSETS = [
  { parameter: 'Azimuth Angle Offset', integral: 0.01, standby: null, testGen: 0.04, unit: '°' },
  { parameter: '30 Hz Modulation Scale', integral: 92.1, standby: null, testGen: 100.1, unit: '%' },
  { parameter: '9960 Hz Modulation Scale', integral: 89.7, standby: null, testGen: 95.5, unit: '%' },
  { parameter: '9960 Hz Deviation Scale', integral: 101.0, standby: null, testGen: 100.2, unit: '%' },
  { parameter: 'RF Level Offset', integral: -0.3, standby: null, testGen: null, unit: 'dB' },
  { parameter: 'Ident Modulation Scale', integral: 109.4, standby: null, testGen: 100.0, unit: '%' },
  { parameter: 'Tx Power Scale', integral: 98.2, standby: null, testGen: 101.7, unit: '%' },
  { parameter: 'Tx Power Offset', integral: 0.0, standby: null, testGen: 2.0, unit: '%' },
  { parameter: 'Tx Frequency Error Offset', integral: 0.0, standby: null, testGen: 0.0, unit: 'ppm' },
  { parameter: 'Notch Monitor Scale', integral: 100.0, standby: null, testGen: null, unit: '' },
  { parameter: 'Odd Antenna SB Return Loss Offset', integral: -4.0, standby: null, testGen: null, unit: 'dB' },
  { parameter: 'Even Antenna SB Return Loss Offset', integral: 0.0, standby: null, testGen: null, unit: 'dB' },
];
```

## 11. TRANSMITTER DATA

```typescript
const DEFAULT_TX_POWER = [
  { parameter: 'Carrier', tx1: 98.8, tx2: 0.6, unit: 'Watts' },
  { parameter: 'Sideband #1', tx1: 2.438, tx2: 0.005, unit: 'Watts' },
  { parameter: 'Sideband #2', tx1: 2.438, tx2: 0.001, unit: 'Watts' },
  { parameter: 'Sideband #3', tx1: 2.458, tx2: 0.000, unit: 'Watts' },
  { parameter: 'Sideband #4', tx1: 2.429, tx2: 0.011, unit: 'Watts' },
];

const DEFAULT_TX_FREQUENCY = [
  { parameter: 'Carrier Frequency', value1: 113.0001, value2: 0.0000, unit: 'MHz' },
  { parameter: 'Tx Lower Sideband', value1: 112.9901, value2: 0.0000, unit: 'MHz' },
  { parameter: 'Tx Upper Sideband', value1: 113.0100, value2: 0.0000, unit: 'MHz' },
  { parameter: '30 Hz AM', value1: 30.00, value2: null, unit: 'Hz' },
  { parameter: '30 Hz FM', value1: 30.00, value2: null, unit: 'Hz' },
  { parameter: 'Sideband Frequency', value1: 9958, value2: null, unit: 'Hz' },
];

const DEFAULT_TX_VSWR = [
  { parameter: 'Carrier', value: 1.04 },
  { parameter: 'Sideband #1', value: 1.13 },
  { parameter: 'Sideband #2', value: 1.11 },
  { parameter: 'Sideband #3', value: 1.08 },
  { parameter: 'Sideband #4', value: 1.09 },
];
```

## 12. TX STATUS ALERTS

```typescript
const DEFAULT_TX_SYSTEM_ALERTS = [
  { label: 'Audio Generator ROM Fault', indicator: 'green' },
  { label: 'Audio Generator RAM Fault', indicator: 'green' },
  { label: 'Audio Generator Functional Fault', indicator: 'green' },
  { label: 'Audio Generator EEPROM Fault', indicator: 'green' },
  { label: 'Audio Generator Comm Fault', indicator: 'green' },
  { label: 'Audio RAM CRC Fault', indicator: 'green' },
  { label: 'Audio Generator Disabled', indicator: 'green' },
  { label: 'Transmitter Disabled', indicator: 'green' },
];

const DEFAULT_TX_CARRIER_PA_ALERTS = [
  { label: 'Carrier Power', indicator: 'green' },
  { label: 'Carrier Frequency', indicator: 'green' },
  { label: 'Carrier Forward Power', indicator: 'green' },
  { label: 'Carrier Reflected Power', indicator: 'green' },
  { label: 'CSB to SBO Phase Control', indicator: 'green' },
  { label: 'Carrier Modulation', indicator: 'green' },
  { label: 'PA Thermal Shutdown', indicator: 'green' },
];

const DEFAULT_TX_SYNTHESIZER_ALERTS = [
  { label: 'CSB Power Fault', indicator: 'green' },
  { label: 'Carrier Phase Error', indicator: 'green' },
  { label: 'Carrier Phase Offset', indicator: 'green' },
  { label: 'LSB Power Fault', indicator: 'green' },
  { label: 'LSB Unlocked', indicator: 'green' },
  { label: 'USB Power Fault', indicator: 'green' },
  { label: 'USB Unlocked', indicator: 'green' },
];

// 4 sidebands × 4 alerts each = 16 items
const DEFAULT_TX_SIDEBAND_PA_ALERTS = [1, 2, 3, 4].flatMap(sb => [
  { label: `Sideband ${sb} Phase`, indicator: sb === 1 ? 'red' : 'green' },
  { label: `Sideband ${sb} Audio`, indicator: 'green' },
  { label: `Sideband ${sb} Forward Power`, indicator: 'green' },
  { label: `Sideband ${sb} Reflected Power`, indicator: 'green' },
]);
```

## 13. TX CONFIG NOMINAL

```typescript
const DEFAULT_TX_CONFIG_NOMINAL = {
  audioGenParams: {
    azimuthIndex: -1.10,
    outputPower: 100.0,
    voiceModulation: 0.0,
    identModulation: 5.0,
    referenceModulation: 30.0,
    sboRfLevel: 51.4,
  },
  ident: {
    mainIdentCode: 'FLR',
    standbyIdentCode: 'Same as Main Ident',
  },
  keyerInput: {
    mode: 'disabled', // 'disabled' | 'external'
    keyerInputLevel: 'Active High/Open',
    windowedKeyingInput: false,
    selfKeyOnLoss: false,
    shutdownOnLoss: false,
    restartWhenResumed: false,
  },
  keyerOutput: {
    externalKeying: 'Disabled',
    suppressOnShutdown: false,
  },
};
```

## 14. TX OFFSETS & SCALE FACTORS (18 params)

```typescript
const DEFAULT_TX_OFFSETS = [
  { parameter: 'Azimuth Angle Offset', tx1: 0.00, tx2: 0.00, unit: '°' },
  { parameter: 'Output Power Scale', tx1: 94.6, tx2: 96.6, unit: '%' },
  { parameter: 'Voice Modulation Scale', tx1: 100.0, tx2: 100.0, unit: '%' },
  { parameter: 'Ident Modulation Scale', tx1: 100.0, tx2: 100.0, unit: '%' },
  { parameter: 'Reference Modulation Scale', tx1: 100.0, tx2: 100.0, unit: '%' },
  { parameter: 'Carrier PLL Control', tx1: 39.5, tx2: 45.5, unit: '%' },
  { parameter: 'Carrier Sideband Phase Offset (Coarse)', tx1: 180, tx2: 90, unit: '°' },
  { parameter: 'Carrier Sideband Phase Offset (Fine)', tx1: 31, tx2: 29, unit: '°' },
  { parameter: 'Sideband 1 Phase Offset', tx1: -5, tx2: 26, unit: '°' },
  { parameter: 'Sideband 2 Phase Offset', tx1: 5, tx2: -26, unit: '°' },
  { parameter: 'Sideband 3 Phase Offset', tx1: -8, tx2: -2, unit: '°' },
  { parameter: 'Sideband 4 Phase Offset', tx1: 8, tx2: 2, unit: '°' },
  { parameter: 'Tx Sideband RF Level Scale', tx1: 91.5, tx2: 93.0, unit: '%' },
  { parameter: 'Sideband 1 RF Level Scale', tx1: 100.0, tx2: 100.0, unit: '%' },
  { parameter: 'Sideband 2 RF Level Scale', tx1: 100.0, tx2: 100.0, unit: '%' },
  { parameter: 'Sideband 3 RF Level Scale', tx1: 100.0, tx2: 100.0, unit: '%' },
  { parameter: 'Sideband 4 RF Level Scale', tx1: 100.0, tx2: 100.0, unit: '%' },
  { parameter: 'Sideband VSWR Offset', tx1: 0.00, tx2: 0.00, unit: ':1' },
];
```
