import type { DmeMenuGroup, DmeMenuItem } from "./dme-types";

function monitorItems(monitorNumber: 1 | 2): readonly DmeMenuItem[] {
  return [
    { id: `monitor-${monitorNumber}-data`, label: "Data", enabled: false },
    {
      id: `monitor-${monitorNumber}-test-results`,
      label: "Test Results",
      enabled: true,
      screenId: monitorNumber === 1 ? "monitor-1-test-results" : "monitor-2-test-results",
    },
    { id: `monitor-${monitorNumber}-fault-history`, label: "Fault History", enabled: false },
    {
      id: `monitor-${monitorNumber}-offsets`,
      label: "Offsets & Scale Factors",
      enabled: true,
      screenId: monitorNumber === 1 ? "monitor-1-offsets" : "monitor-2-offsets",
    },
    { id: `monitor-${monitorNumber}-trigger`, label: "Trigger", enabled: false },
  ];
}

export const dmeMenuStructure: readonly DmeMenuGroup[] = [
  {
    id: "system",
    label: "System",
    items: [
      { id: "system-logon", label: "Logon RMS", enabled: false },
      { id: "system-logoff", label: "Logoff/Disconnect", enabled: false },
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
      { id: "rms-status", label: "Status", enabled: true, screenId: "rms-status" },
      { id: "rms-data", label: "Data", enabled: false },
      { id: "rms-logs", label: "Logs", enabled: true, screenId: "rms-logs" },
      { id: "rms-configuration", label: "Configuration", enabled: false },
      { id: "rms-commands", label: "Commands", enabled: false },
      { id: "rms-config-restore", label: "Config Restore", enabled: false },
      { id: "rms-config-backup", label: "Config Backup", enabled: false },
    ],
  },
  {
    id: "monitors",
    label: "Monitors",
    items: [
      { id: "monitors-data", label: "Data", enabled: true, screenId: "monitor-data" },
      { id: "monitors-configuration", label: "Configuration", enabled: true, screenId: "monitor-config" },
      { id: "monitors-special-tests", label: "Special Tests", enabled: false },
      { id: "monitors-commands", label: "Commands", enabled: false },
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
      { id: "transmitters-commands", label: "Commands", enabled: false },
      { id: "transmitters-diagnostics", label: "Diagnostics", enabled: false },
    ],
  },
  {
    id: "info",
    label: "Info",
    items: [{ id: "info-about", label: "About", enabled: false }],
  },
];

export const disabledMenuTooltip = "Chưa khả dụng";
