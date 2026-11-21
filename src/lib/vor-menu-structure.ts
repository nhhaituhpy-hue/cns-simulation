import type { VorMenuGroup, VorMenuItem } from "./vor-types";

export function unavailableVorCommandReason(id: string): string | undefined {
  if (/^monitor-[12]-(integral-composite|standby-composite|test-generator|carrier-.*-power|ground-check|sideband-[12]-reflected-power)$/.test(id)) {
    return "Chưa mô phỏng đường tín hiệu đo tại J3; không thay đổi dữ liệu giám sát.";
  }
  if (id.startsWith("tx-command-ident-")) return "Chưa mô phỏng lệnh Normal/Off/Continuous của bộ phát Ident; cấu hình keyer không thay thế lệnh này.";
  if (id === "tx-command-hold-commutator") return "Chưa mô phỏng Hold/Release Commutator và chọn anten phát thử.";
  if (id.startsWith("monitor-command-standby-bypass-")) return "Chưa mô phỏng bypass giám sát Standby độc lập; không dùng thay Integral Bypass.";
  if (id.startsWith("rms-command-select-audio-")) return "Chưa mô phỏng đường nghe Ident của Monitor 1/2 tại RMS.";
  if (id.startsWith("rms-command-fan-")) return "Chưa mô phỏng điều khiển quạt Automatic/On/Off và phản hồi quạt.";
  if (/^rms-command-spare-output-[1-4]-(high|low)$/.test(id)) return "Chưa mô phỏng mức điện High/Low tại ngõ ra số dự phòng.";
  if (/^rms-command-bcps-[12]-(enable|disable)$/.test(id)) return "Chưa mô phỏng điều khiển Enable/Disable Charger của BCPS; không phải Reset.";
  if (id === "rms-command-reset-intrusion" || id === "rms-command-reset-smoke") return "Chưa mô phỏng cảm biến và chốt báo động Intrusion/Smoke để reset.";
  if (id === "rms-command-enable-mode" || id === "rms-command-disable-mode") return "Chưa mô phỏng Command Mode của RMS; không đồng nhất với Local hoặc mức SEC.";
  return undefined;
}

function unavailableCommand(id: string, label: string): VorMenuItem {
  return { id, label, enabled: false };
}

const testSignalItems: readonly VorMenuItem[] = [
  { id: "integral-composite", label: "Integral Composite", enabled: true },
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
    { id: `monitor-${monitorNumber}-test-results`, label: "Test Results", enabled: true, screenId: "monitor-test-results" },
    { id: `monitor-${monitorNumber}-fault-history`, label: "Fault History", enabled: true, screenId: "monitor-fault-history" },
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
        enabled: false,
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
      { id: "tx-command-ident-normal", label: "Normal", enabled: false },
      { id: "tx-command-ident-off", label: "Off", enabled: false },
      { id: "tx-command-ident-continuous", label: "Continuous", enabled: false },
    ],
  },
  { id: "tx-command-hold-commutator", label: "Hold Commutator...", enabled: false },
];

const rmsCommandItems: readonly VorMenuItem[] = [
  { id: "rms-command-change-password", label: "Change Password...", enabled: true },
  {
    id: "rms-command-select-audio",
    label: "Select Audio",
    enabled: true,
    children: [
      unavailableCommand("rms-command-select-audio-none", "No Audio"),
      unavailableCommand("rms-command-select-audio-mon1", "Monitor #1 Ident"),
      unavailableCommand("rms-command-select-audio-mon2", "Monitor #2 Ident"),
    ],
  },
  {
    id: "rms-command-system-fan-control",
    label: "System Fan Control",
    enabled: true,
    children: [
      unavailableCommand("rms-command-fan-auto", "Automatic"),
      unavailableCommand("rms-command-fan-on", "On"),
      unavailableCommand("rms-command-fan-off", "Off"),
    ],
  },
  {
    id: "rms-command-spare-output",
    label: "Set Spare Digital Output",
    enabled: true,
    children: [
      ...[1, 2, 3, 4].map(number => ({
        id: `rms-command-spare-output-${number}`, label: `Output #${number}`, enabled: true,
        children: [unavailableCommand(`rms-command-spare-output-${number}-high`, "High"), unavailableCommand(`rms-command-spare-output-${number}-low`, "Low")],
      })),
    ],
  },
  ...[1, 2].map(number => ({
    id: `rms-command-bcps-${number}`, label: `BCPS ${number}`, enabled: true,
    children: [unavailableCommand(`rms-command-bcps-${number}-enable`, "Enable Charger"), unavailableCommand(`rms-command-bcps-${number}-disable`, "Disable Charger")],
  })),
  unavailableCommand("rms-command-reset-intrusion", "Reset Intrusion Detector"),
  unavailableCommand("rms-command-reset-smoke", "Reset Smoke Detector"),
  unavailableCommand("rms-command-enable-mode", "Enable Command Mode"),
  unavailableCommand("rms-command-disable-mode", "Disable Command Mode"),
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
      { id: "monitor-command-standby-bypass-on", label: "On", enabled: false },
      { id: "monitor-command-standby-bypass-off", label: "Off", enabled: false },
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
        enabled: true,
        screenId: "diagnostics",
        viewId: "diagnostics-power-up",
      },
      {
        id: "diagnostics-fault-isolation",
        label: "Fault Isolation",
        enabled: true,
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
