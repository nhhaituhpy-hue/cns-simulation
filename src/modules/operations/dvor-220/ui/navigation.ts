import type {
  MopiensMenuGroup,
  MopiensNavigationSection,
  MopiensToolbarAction,
} from "@/modules/operations/mopiens-pmdt";

export type Dvor220ScreenId =
  | "home"
  | "equipment"
  | "transmitter"
  | "pdc"
  | "cma-sma"
  | "syn"
  | "monitor-cha"
  | "monitor-chb1"
  | "monitor-chb2"
  | "monitor-standby"
  | "monitor-self-test"
  | "power"
  | "environment"
  | "setup-station"
  | "setup-transmitter"
  | "setup-thermal"
  | "setup-monitor"
  | "setup-limits"
  | "setup-system"
  | "setup-communication"
  | "setup-battery"
  | "maintenance-tx-reading"
  | "maintenance-tx-setpoint"
  | "maintenance-monitor-cal"
  | "maintenance-certification"
  | "maintenance-antenna"
  | "maintenance-faults"
  | "maintenance-ground-check"
  | "maintenance-users"
  | "maintenance-time"
  | "maintenance-version"
  | "flight-check"
  | "flight-results"
  | "history-pmdt"
  | "history-lmi"
  | "history-parameter-change";

export type Dvor220DialogId = "bypass" | "main" | "changeover" | "reset" | "power" | "simulation-parameters";
export type Dvor220ViewMode = "pmdt" | "lmi";

export const DVOR220_SCREEN_LABELS: Record<Dvor220ScreenId, string> = {
  home: "Home",
  equipment: "Equipment Status",
  transmitter: "Transmitter Status",
  pdc: "PDC Status",
  "cma-sma": "CMA SMA Status",
  syn: "SYN Status",
  "monitor-cha": "CH.A Monitor",
  "monitor-chb1": "CH.B.1 Monitor",
  "monitor-chb2": "CH.B.2 Monitor",
  "monitor-standby": "Standby Monitor",
  "monitor-self-test": "Monitor Self-Test",
  power: "Power Supply",
  environment: "Environmental",
  "setup-station": "Station Setup",
  "setup-transmitter": "Transmitter Setup",
  "setup-thermal": "Thermal Control",
  "setup-monitor": "Monitor Setup",
  "setup-limits": "Monitor Limit Setup",
  "setup-system": "System Setup",
  "setup-communication": "Communication Setup",
  "setup-battery": "Battery Setup",
  "maintenance-tx-reading": "TX Reading Calibration",
  "maintenance-tx-setpoint": "TX Setpoint Calibration",
  "maintenance-monitor-cal": "Monitor Calibration",
  "maintenance-certification": "Monitor Certification",
  "maintenance-antenna": "Antenna Tests",
  "maintenance-faults": "Fault Controls",
  "maintenance-ground-check": "Automatic Ground Error Check",
  "maintenance-users": "User Management",
  "maintenance-time": "Time Synchronization",
  "maintenance-version": "Version Information",
  "flight-check": "Flight Inspection",
  "flight-results": "Flight Check Results",
  "history-pmdt": "PMDT History Log",
  "history-lmi": "LMI History Log",
  "history-parameter-change": "Parameter Change",
};

export const DVOR220_SECTION_DEFAULTS: Record<string, Dvor220ScreenId> = {
  main: "home",
  setup: "setup-station",
  maintenance: "maintenance-tx-reading",
  flight: "flight-check",
  history: "history-pmdt",
  logout: "home",
};

export function buildDvor220Navigation(userName: string | null): MopiensNavigationSection[] {
  return [
    {
      id: "main",
      label: "Main",
      items: [
        { id: "home", label: "Home" },
        { id: "equipment", label: "Equipment Status" },
        {
          id: "transmitter",
          label: "Transmitter",
          selectable: true,
          expandedByDefault: true,
          children: [
            { id: "pdc", label: "PDC Status" },
            { id: "cma-sma", label: "CMA SMA Status" },
            { id: "syn", label: "SYN Status" },
          ],
        },
        {
          id: "monitor",
          label: "Monitor",
          expandedByDefault: true,
          children: [
            { id: "monitor-cha", label: "CH.A Monitor" },
            { id: "monitor-chb1", label: "CH.B.1 Monitor" },
            { id: "monitor-chb2", label: "CH.B.2 Monitor" },
            { id: "monitor-standby", label: "Standby Monitor" },
            { id: "monitor-self-test", label: "Monitor Self-Test" },
          ],
        },
        { id: "power", label: "Power Supply" },
        { id: "environment", label: "Environmental" },
      ],
    },
    {
      id: "setup",
      label: "Setup",
      items: [
        { id: "setup-station", label: "Station Setup" },
        { id: "setup-transmitter", label: "Transmitter Setup" },
        { id: "setup-thermal", label: "Thermal Control" },
        { id: "setup-monitor", label: "Monitor Setup" },
        { id: "setup-limits", label: "Monitor Limit Setup" },
        { id: "setup-system", label: "System Setup" },
        { id: "setup-communication", label: "Communication Setup" },
        { id: "setup-battery", label: "Battery Setup" },
      ],
    },
    {
      id: "maintenance",
      label: "Maintenance",
      items: [
        {
          id: "maintenance-calibration",
          label: "Calibration",
          expandedByDefault: true,
          children: [
            { id: "maintenance-tx-reading", label: "TX Reading Calibration" },
            { id: "maintenance-tx-setpoint", label: "TX Setpoint Calibration" },
            { id: "maintenance-monitor-cal", label: "Monitor Calibration" },
          ],
        },
        { id: "maintenance-certification", label: "Monitor Certification" },
        { id: "maintenance-antenna", label: "Antenna Tests" },
        { id: "maintenance-faults", label: "Fault Controls" },
        { id: "maintenance-ground-check", label: "Automatic Ground Error Check" },
        { id: "maintenance-users", label: "User Management" },
        { id: "maintenance-time", label: "Time Synchronization" },
        { id: "maintenance-version", label: "Version Information" },
      ],
    },
    {
      id: "flight",
      label: "Flight Inspection",
      items: [
        { id: "flight-check", label: "Flight Inspection" },
        { id: "flight-results", label: "Flight Check Results" },
      ],
    },
    {
      id: "history",
      label: "History Log",
      items: [
        { id: "history-pmdt", label: "PMDT History Log" },
        { id: "history-lmi", label: "LMI History Log" },
        { id: "history-parameter-change", label: "Parameter Change" },
      ],
    },
    {
      id: "logout",
      label: `${userName ?? "Administrator"} Logout`,
      items: [{ id: "logout", label: "Logout" }],
    },
  ];
}

export function buildDvor220Menus(options: {
  connected: boolean;
  authenticated: boolean;
  writeAllowed: boolean;
  controlAvailable: boolean;
  draftDirty: boolean;
  flashDirty: boolean;
  bypassed: boolean;
  viewMode: Dvor220ViewMode;
}): MopiensMenuGroup[] {
  const controlDisabled = !options.writeAllowed || !options.controlAvailable;
  return [
    {
      id: "system",
      label: "System",
      commands: [
        { id: "simulation-parameters", label: "Simulation Parameters..." },
      ],
    },
    {
      id: "file",
      label: "File",
      commands: [
        { id: "connect", label: options.connected ? "Reconnect" : "Connect", shortcut: "Ctrl+N" },
        { id: "disconnect", label: "Disconnect", disabled: !options.connected },
        { id: "login", label: "Login", disabled: !options.connected || options.authenticated },
        { id: "logout", label: "Logout", disabled: !options.authenticated, dividerBefore: true },
        { id: "profile-save", label: "Profile Save", shortcut: "Ctrl+S", disabled: controlDisabled || !options.flashDirty },
        { id: "print", label: "Print Current View", dividerBefore: true },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      commands: [
        { id: "apply-draft", label: "Apply", disabled: controlDisabled || !options.draftDirty },
        { id: "reset-draft", label: "Reset Draft", disabled: !options.draftDirty },
      ],
    },
    {
      id: "view",
      label: "View",
      commands: [
        { id: "view-pmdt", label: "PMDT", checked: options.viewMode === "pmdt" },
        { id: "view-lmi", label: "LMI", checked: options.viewMode === "lmi" },
        { id: "home", label: "Home", dividerBefore: true },
        { id: "equipment", label: "Equipment Status" },
        { id: "history-pmdt", label: "PMDT History" },
        { id: "history-parameter-change", label: "Parameter Change" },
      ],
    },
    {
      id: "tools",
      label: "Tools",
      commands: [
        { id: "bypass", label: "Monitor Bypass", checked: options.bypassed, disabled: controlDisabled },
        { id: "main-control", label: "Main Selection", disabled: controlDisabled },
        { id: "changeover", label: "Change Over", disabled: controlDisabled },
        { id: "power-control", label: "Power and RF Control", disabled: controlDisabled },
        { id: "reset", label: "System Reset", tone: "warning", disabled: controlDisabled, dividerBefore: true },
      ],
    },
    {
      id: "windows",
      label: "Windows",
      commands: [
        { id: "home", label: "Home" },
        { id: "pdc", label: "PDC Status" },
        { id: "monitor-cha", label: "CH.A Monitor" },
        { id: "maintenance-ground-check", label: "Ground Error Check" },
      ],
    },
    {
      id: "help",
      label: "Help",
      commands: [
        { id: "maintenance-version", label: "Version Information" },
        { id: "about", label: "About MOPIENS 220 DVOR" },
      ],
    },
  ];
}

export function buildDvor220Toolbar(options: {
  connected: boolean;
  authenticated: boolean;
  writeAllowed: boolean;
  controlAvailable: boolean;
  bypassed: boolean;
  flashDirty: boolean;
}): MopiensToolbarAction[] {
  const controlDisabled = !options.writeAllowed || !options.controlAvailable;
  return [
    { id: "connect", label: "Connect", showLabel: true, tone: options.connected ? "default" : "primary" },
    { id: "login", label: "Login", showLabel: true, disabled: !options.connected || options.authenticated },
    { id: "home", label: "Home", showLabel: true },
    { id: "profile-save", label: "Profile Save", showLabel: true, disabled: controlDisabled || !options.flashDirty },
    { id: "bypass", label: "Bypass", showLabel: true, pressed: options.bypassed, disabled: controlDisabled },
    { id: "changeover", label: "Change Over", showLabel: true, disabled: controlDisabled },
    { id: "power-control", label: "Power RF", showLabel: true, disabled: controlDisabled },
    { id: "reset", label: "Reset", showLabel: true, tone: "warning", disabled: controlDisabled },
    { id: "view-lmi", label: "LMI", showLabel: true },
  ];
}

export function isDvor220ScreenId(value: string): value is Dvor220ScreenId {
  return Object.hasOwn(DVOR220_SCREEN_LABELS, value);
}
