import type { VorMenuGroup, VorMenuItem } from "./vor-types";

const testSignalItems: readonly VorMenuItem[] = [
  { id: "integral-composite", label: "Integral Composite", enabled: true, checked: true },
  { id: "standby-composite", label: "Standby Composite", enabled: true },
  { id: "test-generator", label: "Test Generator", enabled: true },
  { id: "carrier-forward-power", label: "Carrier Forward Power", enabled: true },
  { id: "carrier-reflected-power", label: "Carrier Reflected Power", enabled: true },
  { id: "ground-check", label: "Ground Check", enabled: true },
  { id: "sideband-1-reflected-power", label: "Sideband 1 Reflected Power", enabled: true },
  { id: "sideband-2-reflected-power", label: "Sideband 2 Reflected Power", enabled: true },
];

function monitorItems(monitorNumber: 1 | 2): readonly VorMenuItem[] {
  return [
    { id: `monitor-${monitorNumber}-data`, label: "Data", enabled: true, screenId: "monitor-data" },
    { id: `monitor-${monitorNumber}-test-results`, label: "Test Results", enabled: false, screenId: "monitor-test-results" },
    { id: `monitor-${monitorNumber}-fault-history`, label: "Fault History", enabled: false, screenId: "monitor-fault-history" },
    {
      id: `monitor-${monitorNumber}-offsets`,
      label: "Offsets & Scale Factors",
      enabled: true,
      screenId: monitorNumber === 1 ? "monitor-1-offsets" : "monitor-2-offsets",
    },
    {
      id: `monitor-${monitorNumber}-test-signal`,
      label: "Test Signal Output (J3)",
      enabled: true,
      children: testSignalItems.map((item) => ({
        ...item,
        id: `monitor-${monitorNumber}-${item.id}`,
      })),
    },
  ];
}

const transmitterCommandItems: readonly VorMenuItem[] = [
  { id: "tx-command-transfer", label: "Transfer", enabled: true },
  {
    id: "tx-command-transmitter-1",
    label: "Transmitter 1",
    enabled: true,
    children: [
      { id: "tx-command-transmitter-1-antenna", label: "Antenna", enabled: true, action: "set-transmitter-mode", transmitterId: "tx1", transmitterMode: "main" },
      { id: "tx-command-transmitter-1-load", label: "Load", enabled: true, action: "set-transmitter-mode", transmitterId: "tx1", transmitterMode: "load" },
      { id: "tx-command-transmitter-1-off", label: "Off", enabled: true, action: "set-transmitter-mode", transmitterId: "tx1", transmitterMode: "off" },
    ],
  },
  {
    id: "tx-command-transmitter-2",
    label: "Transmitter 2",
    enabled: true,
    children: [
      { id: "tx-command-transmitter-2-antenna", label: "Antenna", enabled: true, action: "set-transmitter-mode", transmitterId: "tx2", transmitterMode: "main" },
      { id: "tx-command-transmitter-2-load", label: "Load", enabled: true, action: "set-transmitter-mode", transmitterId: "tx2", transmitterMode: "load" },
      { id: "tx-command-transmitter-2-off", label: "Off", enabled: true, action: "set-transmitter-mode", transmitterId: "tx2", transmitterMode: "off" },
    ],
  },
  {
    id: "tx-command-ident",
    label: "Transmitter Ident",
    enabled: true,
    children: [
      { id: "tx-command-ident-normal", label: "Normal", enabled: true, checked: true },
      { id: "tx-command-ident-off", label: "Off", enabled: true },
      { id: "tx-command-ident-continuous", label: "Continuous", enabled: false },
    ],
  },
  { id: "tx-command-hold-commutator", label: "Hold Commutator...", enabled: false },
];

const rmsCommandItems: readonly VorMenuItem[] = [
  { id: "rms-command-change-password", label: "Change Password...", enabled: false },
  {
    id: "rms-command-select-audio",
    label: "Select Audio",
    enabled: true,
    children: [
      { id: "rms-command-select-audio-tx1", label: "Transmitter 1", enabled: true },
      { id: "rms-command-select-audio-tx2", label: "Transmitter 2", enabled: true },
    ],
  },
  {
    id: "rms-command-system-fan-control",
    label: "System Fan Control",
    enabled: true,
    children: [
      { id: "rms-command-fan-auto", label: "Automatic", enabled: true },
      { id: "rms-command-fan-on", label: "On", enabled: true },
      { id: "rms-command-fan-off", label: "Off", enabled: true },
    ],
  },
  {
    id: "rms-command-spare-output",
    label: "Set Spare Digital Output",
    enabled: true,
    children: [
      { id: "rms-command-spare-output-1", label: "Spare Output 1", enabled: true },
      { id: "rms-command-spare-output-2", label: "Spare Output 2", enabled: true },
      { id: "rms-command-spare-output-3", label: "Spare Output 3", enabled: true },
      { id: "rms-command-spare-output-4", label: "Spare Output 4", enabled: true },
    ],
  },
  { id: "rms-command-bcps-1", label: "BCPS 1", enabled: true, children: [{ id: "rms-command-bcps-1-reset", label: "Reset", enabled: true }] },
  { id: "rms-command-bcps-2", label: "BCPS 2", enabled: true, children: [{ id: "rms-command-bcps-2-reset", label: "Reset", enabled: true }] },
  { id: "rms-command-reset-intrusion", label: "Reset Intrusion Detector", enabled: true },
  { id: "rms-command-reset-smoke", label: "Reset Smoke Detector", enabled: true },
  { id: "rms-command-enable-mode", label: "Enable Command Mode", enabled: true },
  { id: "rms-command-disable-mode", label: "Disable Command Mode", enabled: true },
];

const monitorCommandItems: readonly VorMenuItem[] = [
  {
    id: "monitor-command-integral-bypass",
    label: "Integral Monitor Bypass",
    enabled: true,
    children: [
      { id: "monitor-command-integral-bypass-on", label: "On", enabled: true },
      { id: "monitor-command-integral-bypass-off", label: "Off", enabled: true },
    ],
  },
  {
    id: "monitor-command-standby-bypass",
    label: "Standby Monitor Bypass",
    enabled: true,
    children: [
      { id: "monitor-command-standby-bypass-on", label: "On", enabled: true },
      { id: "monitor-command-standby-bypass-off", label: "Off", enabled: true },
    ],
  },
];

export const vorMenuStructure: readonly VorMenuGroup[] = [
  {
    id: "system",
    label: "System",
    items: [
      { id: "system-logon", label: "Logon RMS", enabled: true, action: "open-login" },
      { id: "system-logoff", label: "Logoff/Disconnect", enabled: true, action: "logoff" },
      { id: "system-config-save", label: "Configuration Save", enabled: false },
      { id: "system-config-load", label: "Configuration Load", enabled: false },
      { id: "system-config-print", label: "Configuration Print", enabled: false },
      { id: "system-pmdt-setup", label: "PMDT Setup", enabled: false },
      { id: "system-simulation-parameters", label: "Simulation Parameters...", enabled: true, action: "open-config" },
      { id: "system-print-setup", label: "Print Setup", enabled: false },
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
      { id: "monitors-commands", label: "Commands", enabled: true, children: monitorCommandItems },
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
      {
        id: "diagnostics-power-up",
        label: "Power Up Results",
        enabled: false,
        screenId: "diagnostics",
        viewId: "diagnostics-power-up",
      },
      {
        id: "diagnostics-fault-isolation",
        label: "Fault Isolation",
        enabled: false,
        screenId: "diagnostics",
        viewId: "diagnostics-fault-isolation",
      },
    ],
  },
  {
    id: "info",
    label: "Info",
    items: [{ id: "info-about", label: "About PMDT", enabled: false, action: "open-about" }],
  },
];

export const disabledMenuTooltip = "Chưa khả dụng";
