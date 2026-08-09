import type { DmeMenuGroup, DmeMenuItem } from "./dme-types";

const bypassCommandItems: readonly DmeMenuItem[] = [
  {
    id: "monitor-command-integral-bypass",
    label: "Integral Monitor Bypass",
    enabled: true,
    children: [
      { id: "monitor-command-integral-bypass-on", label: "On", enabled: true, action: "set-monitor-bypass", monitorId: "integral", bypassEnabled: true },
      { id: "monitor-command-integral-bypass-off", label: "Off", enabled: true, action: "set-monitor-bypass", monitorId: "integral", bypassEnabled: false },
    ],
  },
  {
    id: "monitor-command-standby-bypass",
    label: "Standby Monitor Bypass",
    enabled: true,
    children: [
      { id: "monitor-command-standby-bypass-on", label: "On", enabled: true, action: "set-monitor-bypass", monitorId: "standby", bypassEnabled: true },
      { id: "monitor-command-standby-bypass-off", label: "Off", enabled: true, action: "set-monitor-bypass", monitorId: "standby", bypassEnabled: false },
    ],
  },
];

const delayTriggerItems: readonly DmeMenuItem[] = [
  { id: "normal", label: "Normal", enabled: true, checked: true, action: "rms-command" },
  { id: "first-pulse-delay", label: "1st Pulse Delay", enabled: true, action: "rms-command" },
  { id: "second-pulse-delay", label: "2nd Pulse Delay", enabled: true, action: "rms-command" },
  { id: "interrogation-spacing", label: "Interrogation Spacing", enabled: true, action: "rms-command" },
  { id: "reply-spacing", label: "Reply Spacing", enabled: true, action: "rms-command" },
];

function monitorTriggerItems(monitorNumber: 1 | 2): readonly DmeMenuItem[] {
  return [
    {
      id: `monitor-${monitorNumber}-trigger-integral-delay`,
      label: "Integral Delay",
      enabled: true,
      children: delayTriggerItems.map((item) => ({ ...item, id: `monitor-${monitorNumber}-integral-${item.id}` })),
    },
    {
      id: `monitor-${monitorNumber}-trigger-standby-delay`,
      label: "Standby Delay",
      enabled: true,
      children: delayTriggerItems.map((item) => ({ ...item, id: `monitor-${monitorNumber}-standby-${item.id}` })),
    },
    { id: `monitor-${monitorNumber}-trigger-integral-efficiency`, label: "Integral Efficiency", enabled: true, action: "rms-command" },
    { id: `monitor-${monitorNumber}-trigger-reflected-power`, label: "Reflected Power", enabled: true, action: "rms-command" },
    { id: `monitor-${monitorNumber}-trigger-forward-power`, label: "Forward Power", enabled: true, action: "rms-command" },
  ];
}

function monitorItems(monitorNumber: 1 | 2): readonly DmeMenuItem[] {
  return [
    {
      id: `monitor-${monitorNumber}-data`,
      label: "Data",
      enabled: true,
      screenId: monitorNumber === 1 ? "monitor-1-data" : "monitor-2-data",
    },
    {
      id: `monitor-${monitorNumber}-test-results`,
      label: "Test Results",
      enabled: true,
      screenId: monitorNumber === 1 ? "monitor-1-test-results" : "monitor-2-test-results",
    },
    {
      id: `monitor-${monitorNumber}-fault-history`,
      label: "Fault History",
      enabled: true,
      screenId: "monitor-fault-history",
    },
    {
      id: `monitor-${monitorNumber}-offsets`,
      label: "Offsets and Scale Factors",
      enabled: true,
      screenId: monitorNumber === 1 ? "monitor-1-offsets" : "monitor-2-offsets",
    },
    {
      id: `monitor-${monitorNumber}-trigger`,
      label: "Trigger",
      enabled: true,
      children: monitorTriggerItems(monitorNumber),
    },
    {
      id: `monitor-${monitorNumber}-interrogator-power`,
      label: "Interrogator Nominal Power",
      enabled: true,
      screenId: monitorNumber === 1 ? "monitor-1-calibration" : "monitor-2-calibration",
      viewId: monitorNumber === 1 ? "monitor-1-calibration" : "monitor-2-calibration",
    },
    {
      id: `monitor-${monitorNumber}-tx-power-offset`,
      label: "Integral Tx Power Offset",
      enabled: true,
      screenId: monitorNumber === 1 ? "monitor-1-calibration" : "monitor-2-calibration",
      viewId: monitorNumber === 1 ? "monitor-1-calibration" : "monitor-2-calibration",
    },
  ];
}

const rmsCommandItems: readonly DmeMenuItem[] = [
  { id: "rms-command-change-password", label: "Change Password...", enabled: true, action: "open-password-dialog" },
  { id: "rms-command-set-time", label: "Set Time and Date", enabled: true, action: "rms-command" },
  {
    id: "rms-command-select-audio",
    label: "Select Audio",
    enabled: true,
    children: [
      { id: "rms-command-select-audio-tx1", label: "Transmitter 1", enabled: true, action: "rms-command" },
      { id: "rms-command-select-audio-tx2", label: "Transmitter 2", enabled: true, action: "rms-command" },
    ],
  },
  {
    id: "rms-command-system-fan-control",
    label: "System Fan Control",
    enabled: true,
    children: [
      { id: "rms-command-fan-auto", label: "Automatic", enabled: true, checked: true, action: "rms-command" },
      { id: "rms-command-fan-on", label: "On", enabled: true, action: "rms-command" },
      { id: "rms-command-fan-off", label: "Off", enabled: true, action: "rms-command" },
    ],
  },
  {
    id: "rms-command-spare-output",
    label: "Set Spare Digital Output",
    enabled: true,
    children: [1, 2, 3, 4].map((number) => ({
      id: `rms-command-spare-output-${number}`,
      label: `Spare Output ${number}`,
      enabled: true,
      children: [
        { id: `rms-command-spare-output-${number}-high`, label: "High", enabled: true, action: "rms-command" as const },
        { id: `rms-command-spare-output-${number}-low`, label: "Low", enabled: true, action: "rms-command" as const },
      ],
    })),
  },
  { id: "rms-command-bcps-1", label: "BCPS 1", enabled: true, children: [
    { id: "rms-command-bcps-1-enable", label: "Enable Charger", enabled: true, action: "rms-command" },
    { id: "rms-command-bcps-1-disable", label: "Disable Charger", enabled: true, action: "rms-command" },
  ] },
  { id: "rms-command-bcps-2", label: "BCPS 2", enabled: true, children: [
    { id: "rms-command-bcps-2-enable", label: "Enable Charger", enabled: true, action: "rms-command" },
    { id: "rms-command-bcps-2-disable", label: "Disable Charger", enabled: true, action: "rms-command" },
  ] },
  { id: "rms-command-reset-intrusion", label: "Reset Intrusion Detector", enabled: true, action: "rms-command" },
  { id: "rms-command-reset-smoke", label: "Reset Smoke Detector", enabled: true, action: "rms-command" },
  { id: "rms-command-reset-rms-cpu", label: "Reset RMS CPU", enabled: true, action: "rms-command" },
  { id: "rms-command-reset-station-hardware", label: "Reset Station Hardware", enabled: true, action: "rms-command" },
  { id: "rms-command-enable-mode", label: "Enable Command Mode", enabled: true, action: "rms-command" },
  { id: "rms-command-disable-mode", label: "Disable Command Mode", enabled: true, action: "rms-command" },
];

function transmitterRouteItems(transmitter: 1 | 2): readonly DmeMenuItem[] {
  return [
    { id: `tx-command-${transmitter}-antenna`, label: "Antenna", enabled: true, action: "set-transmitter-mode", transmitterId: `tx${transmitter}`, transmitterMode: "antenna" },
    { id: `tx-command-${transmitter}-load`, label: "Load", enabled: true, action: "set-transmitter-mode", transmitterId: `tx${transmitter}`, transmitterMode: "load" },
    { id: `tx-command-${transmitter}-off`, label: "Off", enabled: true, action: "set-transmitter-mode", transmitterId: `tx${transmitter}`, transmitterMode: "off" },
    {
      id: `tx-command-${transmitter}-delay`,
      label: "Delay",
      enabled: true,
      children: [
        { id: `tx-command-${transmitter}-delay-auto`, label: "Automatic (Normal)", enabled: true, action: "set-delay-mode", transmitterId: `tx${transmitter}`, delayMode: "automatic" },
        { id: `tx-command-${transmitter}-delay-fixed`, label: "Fixed", enabled: true, action: "set-delay-mode", transmitterId: `tx${transmitter}`, delayMode: "fixed" },
      ],
    },
  ];
}

const transmitterCommandItems: readonly DmeMenuItem[] = [
  { id: "tx-command-transfer", label: "Transfer", enabled: true, action: "rms-command" },
  { id: "tx-command-transmitter-1", label: "Transmitter 1", enabled: true, children: transmitterRouteItems(1) },
  { id: "tx-command-transmitter-2", label: "Transmitter 2", enabled: true, children: transmitterRouteItems(2) },
  {
    id: "tx-command-ident",
    label: "Transmitter Ident",
    enabled: true,
    children: [
      { id: "tx-command-ident-normal", label: "Normal", enabled: true, checked: true, action: "rms-command" },
      { id: "tx-command-ident-off", label: "Off", enabled: true, action: "rms-command" },
      { id: "tx-command-ident-continuous", label: "Continuous", enabled: true, action: "rms-command" },
    ],
  },
];

export const dmeMenuStructure: readonly DmeMenuGroup[] = [
  {
    id: "system",
    label: "System",
    items: [
      { id: "system-logon", label: "Logon RMS", enabled: true, action: "open-login" },
      { id: "system-logoff", label: "Logoff/Disconnect", enabled: true, action: "logoff" },
      { id: "system-config-save", label: "Configuration Save...", enabled: true, action: "config-save" },
      { id: "system-config-load", label: "Configuration Load...", enabled: true, action: "config-load" },
      { id: "system-config-print", label: "Configuration Print...", enabled: true, action: "config-print" },
      { id: "system-pmdt-setup", label: "PMDT Setup...", enabled: false },
      { id: "system-simulation-parameters", label: "Simulation Parameters...", enabled: true, action: "open-config" },
      { id: "system-print-setup", label: "Print Setup...", enabled: false },
      { id: "system-exit", label: "Exit PMDT", enabled: false },
    ],
  },
  {
    id: "rms",
    label: "RMS",
    items: [
      { id: "rms-status", label: "Status", enabled: true, screenId: "rms-status" },
      { id: "rms-data", label: "Data", enabled: true, screenId: "rms-data" },
      { id: "rms-logs", label: "Logs", enabled: true, screenId: "rms-logs" },
      { id: "rms-configuration", label: "Configuration", enabled: true, screenId: "rms-config" },
      { id: "rms-commands", label: "Commands", enabled: true, children: rmsCommandItems },
      { id: "rms-config-restore", label: "Config Restore", enabled: true, action: "config-restore" },
      { id: "rms-config-backup", label: "Config Backup", enabled: true, action: "config-backup" },
    ],
  },
  {
    id: "monitors",
    label: "Monitors",
    items: [
      { id: "monitors-data", label: "Data", enabled: true, screenId: "monitor-data" },
      { id: "monitors-configuration", label: "Configuration", enabled: true, screenId: "monitor-config" },
      { id: "monitors-special-tests", label: "Special Tests", enabled: true, screenId: "monitor-special-tests" },
      { id: "monitors-commands", label: "Commands", enabled: true, children: bypassCommandItems },
    ],
  },
  { id: "monitor-1", label: "Monitor 1", items: monitorItems(1) },
  { id: "monitor-2", label: "Monitor 2", items: monitorItems(2) },
  {
    id: "transmitters",
    label: "Transmitters",
    items: [
      { id: "transmitters-data", label: "Data", enabled: true, screenId: "tx-data" },
      { id: "transmitters-configuration", label: "Configuration", enabled: true, screenId: "tx-config" },
      { id: "transmitters-commands", label: "Commands", enabled: true, children: transmitterCommandItems },
    ],
  },
  {
    id: "diagnostics",
    label: "Diagnostics",
    items: [
      { id: "diagnostics-power-up", label: "Power Up Results", enabled: true, screenId: "diagnostics", viewId: "diagnostics-power-up" },
      { id: "diagnostics-fault-isolation", label: "Fault Isolation", enabled: true, screenId: "diagnostics", viewId: "diagnostics-fault-isolation" },
    ],
  },
  {
    id: "info",
    label: "Info",
    items: [{ id: "info-about", label: "About PMDT...", enabled: true, action: "open-about" }],
  },
];

export const disabledMenuTooltip = "Chưa khả dụng";
