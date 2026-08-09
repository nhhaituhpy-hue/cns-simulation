import type { Dvor1150MenuGroup, Dvor1150MenuItem } from "./types";

const transmitterCommands = (id: "tx1" | "tx2"): Dvor1150MenuItem => ({
  id: `tx-${id}`,
  label: id === "tx1" ? "Transmitter 1" : "Transmitter 2",
  enabled: true,
  children: [
    { id: `tx-${id}-antenna`, label: "Antenna", enabled: true, action: "set-transmitter-mode", transmitterId: id, transmitterMode: "main" },
    { id: `tx-${id}-load`, label: "Load", enabled: true, action: "set-transmitter-mode", transmitterId: id, transmitterMode: "load" },
    { id: `tx-${id}-off`, label: "Off", enabled: true, action: "set-transmitter-mode", transmitterId: id, transmitterMode: "off" },
  ],
});

export const dvor1150MenuStructure: readonly Dvor1150MenuGroup[] = [
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
      { id: "system-print-setup", label: "Print Setup", enabled: false },
      { id: "system-exit", label: "Exit PMDT", enabled: false },
    ],
  },
  {
    id: "rms",
    label: "RMS",
    items: [
      { id: "rms-status", label: "Status", enabled: true, screenId: "rms-status", viewId: "rms-status" },
      { id: "rms-data", label: "Data", enabled: true, screenId: "rms-data", viewId: "rms-maintenance-alerts" },
      { id: "rms-logs", label: "Logs", enabled: true, screenId: "rms-logs", viewId: "rms-logs" },
      { id: "rms-config", label: "Configuration", enabled: true, screenId: "rms-config", viewId: "rms-config-general" },
      {
        id: "rms-commands",
        label: "Commands",
        enabled: true,
        children: [
          { id: "rms-set-time", label: "Set Time and Date", enabled: true, action: "execute-command", commandId: "set-time" },
          { id: "rms-change-password", label: "Change Password...", enabled: false },
          { id: "rms-reset-intrusion", label: "Reset Intrusion Detector", enabled: true, action: "execute-command", commandId: "reset-intrusion" },
          { id: "rms-reset-smoke", label: "Reset Smoke Detector", enabled: true, action: "execute-command", commandId: "reset-smoke" },
          { id: "rms-reset-hardware", label: "Reset RMS Hardware", enabled: true, action: "execute-command", commandId: "reset-rms" },
          { id: "rms-enable-command-mode", label: "Enable Command Mode", enabled: true, action: "execute-command", commandId: "enable-command-mode" },
          { id: "rms-disable-command-mode", label: "Disable Command Mode", enabled: true, action: "execute-command", commandId: "disable-command-mode" },
          { id: "rms-dme-control", label: "DME Control", enabled: false, children: [{ id: "rms-dme-transfer", label: "Transfer", enabled: false }] },
        ],
      },
      { id: "rms-restore", label: "Config Restore", enabled: true, action: "config-restore" },
      { id: "rms-backup", label: "Config Backup", enabled: true, action: "config-backup" },
    ],
  },
  {
    id: "monitors",
    label: "Monitors",
    items: [
      { id: "monitors-data", label: "Data", enabled: true, screenId: "monitor-data", viewId: "monitor-integrity" },
      { id: "monitors-config", label: "Configuration", enabled: true, screenId: "monitor-config", viewId: "monitor-alarm-limits" },
      {
        id: "monitors-commands",
        label: "Commands",
        enabled: true,
        children: [
          { id: "monitors-bypass", label: "Bypass", enabled: true, children: [
            { id: "monitors-bypass-on", label: "On", enabled: true, action: "set-bypass" },
            { id: "monitors-bypass-off", label: "Off", enabled: true, action: "set-bypass" },
          ] },
          { id: "monitors-abort", label: "Abort all tests", enabled: true, action: "execute-command", commandId: "abort-tests" },
        ],
      },
    ],
  },
  {
    id: "transmitters",
    label: "Transmitters",
    items: [
      { id: "transmitters-data", label: "Data", enabled: true, screenId: "tx-data", viewId: "tx-data-main" },
      { id: "transmitters-config", label: "Configuration", enabled: true, screenId: "tx-config", viewId: "tx-config-nominal" },
      {
        id: "transmitters-commands",
        label: "Commands",
        enabled: true,
        children: [
          { id: "transmitters-transfer", label: "Transfer", enabled: true, action: "set-transmitter-mode", transmitterId: "tx2", transmitterMode: "main" },
          transmitterCommands("tx1"),
          transmitterCommands("tx2"),
          { id: "transmitters-ident", label: "VOR Ident", enabled: false, children: [
            { id: "ident-normal", label: "Normal", enabled: false },
            { id: "ident-off", label: "Off", enabled: false },
            { id: "ident-continuous", label: "Continuous", enabled: false },
          ] },
        ],
      },
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
  { id: "info", label: "Info", items: [{ id: "info-about", label: "About PMDT", enabled: false }] },
];

export const dvor1150DisabledMenuTooltip = "Chưa khả dụng";
