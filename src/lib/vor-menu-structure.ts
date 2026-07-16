import type { VorMenuGroup, VorMenuItem } from "./vor-types";

const testSignalItems: readonly VorMenuItem[] = [
  { id: "integral-composite", label: "Integral Composite", enabled: false },
  { id: "standby-composite", label: "Standby Composite", enabled: false },
  { id: "test-generator", label: "Test Generator", enabled: false },
  { id: "carrier-forward-power", label: "Carrier Forward Power", enabled: false },
  { id: "carrier-reflected-power", label: "Carrier Reflected Power", enabled: false },
  { id: "ground-check", label: "Ground Check", enabled: false },
  { id: "sideband-1-reflected-power", label: "Sideband 1 Reflected Power", enabled: false },
  { id: "sideband-2-reflected-power", label: "Sideband 2 Reflected Power", enabled: false },
];

function monitorItems(monitorNumber: 1 | 2): readonly VorMenuItem[] {
  return [
    { id: `monitor-${monitorNumber}-data`, label: "Data", enabled: true, screenId: "monitor-data" },
    { id: `monitor-${monitorNumber}-test-results`, label: "Test Results", enabled: false },
    { id: `monitor-${monitorNumber}-fault-history`, label: "Fault History", enabled: false },
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
  { id: "tx-command-transfer", label: "Transfer", enabled: false },
  { id: "tx-command-transmitter-1", label: "Transmitter 1", enabled: false },
  { id: "tx-command-transmitter-2", label: "Transmitter 2", enabled: false },
  { id: "tx-command-ident", label: "Transmitter Ident", enabled: false },
  { id: "tx-command-hold-commutator", label: "Hold Commutator...", enabled: false },
];

export const vorMenuStructure: readonly VorMenuGroup[] = [
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
      { id: "rms-status", label: "Status", enabled: false },
      { id: "rms-data", label: "Data", enabled: true, screenId: "rms-data" },
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
      { id: "transmitters-commands", label: "Commands", enabled: true, children: transmitterCommandItems },
    ],
  },
  {
    id: "diagnostics",
    label: "Diagnostics",
    items: [
      { id: "diagnostics-power-up", label: "Power Up Results", enabled: false },
      { id: "diagnostics-fault-isolation", label: "Fault Isolation", enabled: false },
    ],
  },
  {
    id: "info",
    label: "Info",
    items: [{ id: "info-about", label: "About PMDT", enabled: false }],
  },
];

export const disabledMenuTooltip = "Chưa khả dụng";
