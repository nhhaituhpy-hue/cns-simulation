import type {
  MopiensMenuGroup,
  MopiensNavigationSection,
  MopiensToolbarAction,
} from "@/modules/operations/mopiens-pmdt";
import type { Dme320KeylockMode } from "../domain/types";

export type Dme320ScreenId =
  | "home"
  | "equipment"
  | "transponder"
  | "monitor-executive"
  | "monitor-standby"
  | "monitor-self-test"
  | "power"
  | "environment"
  | "setup-station"
  | "setup-transponder"
  | "setup-thermal"
  | "setup-monitor"
  | "setup-limits"
  | "setup-system"
  | "setup-environment"
  | "setup-communication"
  | "setup-battery"
  | "maintenance-calibration"
  | "maintenance-manual-test"
  | "maintenance-certification"
  | "maintenance-advanced-txp"
  | "maintenance-advanced-mon"
  | "maintenance-faults"
  | "maintenance-users"
  | "maintenance-time"
  | "maintenance-version"
  | "history-pmdt"
  | "history-lmi";

export type Dme320ViewMode = "pmdt" | "lmi";
export type Dme320DialogId = "bypass" | "main" | "changeover" | "reset" | "power";

export const DME320_SCREEN_LABELS: Record<Dme320ScreenId, string> = {
  home: "Home",
  equipment: "Equipment Status",
  transponder: "Transponder Status",
  "monitor-executive": "Executive Monitor",
  "monitor-standby": "Standby Monitor",
  "monitor-self-test": "Monitor Self-Test",
  power: "Power Supply",
  environment: "Environmental",
  "setup-station": "Station Setup",
  "setup-transponder": "Transponder Setup",
  "setup-thermal": "Thermal Control",
  "setup-monitor": "Monitor Setup",
  "setup-limits": "Monitor Limit Setup",
  "setup-system": "System Setup",
  "setup-environment": "Environmental Setup",
  "setup-communication": "Communication Setup",
  "setup-battery": "Battery Setup",
  "maintenance-calibration": "Calibration",
  "maintenance-manual-test": "Manual Test",
  "maintenance-certification": "Monitor Certification",
  "maintenance-advanced-txp": "TXP Advanced Control",
  "maintenance-advanced-mon": "MON Advanced Control",
  "maintenance-faults": "Fault Controls",
  "maintenance-users": "User Management",
  "maintenance-time": "Time Synchronization",
  "maintenance-version": "Version Information",
  "history-pmdt": "PMDT History Log",
  "history-lmi": "LMI History Log",
};

export const DME320_SECTION_DEFAULTS: Record<string, Dme320ScreenId> = {
  main: "home",
  setup: "setup-station",
  maintenance: "maintenance-calibration",
  history: "history-pmdt",
  logout: "home",
};

export function buildDme320Navigation(userId: string | null): MopiensNavigationSection[] {
  return [
    {
      id: "main",
      label: "Main",
      items: [
        { id: "home", label: "Home" },
        { id: "equipment", label: "Equipment Status" },
        { id: "transponder", label: "Transponder" },
        {
          id: "monitor-executive",
          label: "Monitor",
          selectable: true,
          expandedByDefault: true,
          children: [
            { id: "monitor-executive", label: "Executive Monitor" },
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
        { id: "setup-transponder", label: "Transponder Setup" },
        { id: "setup-thermal", label: "Thermal Control" },
        { id: "setup-monitor", label: "Monitor Setup" },
        { id: "setup-limits", label: "Monitor Limit Setup" },
        { id: "setup-system", label: "System Setup" },
        { id: "setup-environment", label: "Environmental Setup" },
        { id: "setup-communication", label: "Communication Setup" },
        { id: "setup-battery", label: "Battery Setup" },
      ],
    },
    {
      id: "maintenance",
      label: "Maintenance",
      items: [
        { id: "maintenance-calibration", label: "Calibration" },
        {
          id: "maintenance-manual-test",
          label: "Monitor Test",
          selectable: true,
          expandedByDefault: true,
          children: [
            { id: "maintenance-manual-test", label: "Manual Test" },
            { id: "maintenance-certification", label: "Monitor Certification" },
          ],
        },
        {
          id: "maintenance-advanced-txp",
          label: "Advanced Controls",
          selectable: true,
          expandedByDefault: true,
          children: [
            { id: "maintenance-advanced-txp", label: "TXP Advanced Control" },
            { id: "maintenance-advanced-mon", label: "MON Advanced Control" },
          ],
        },
        { id: "maintenance-faults", label: "Fault Controls" },
        { id: "maintenance-users", label: "User Management" },
        { id: "maintenance-time", label: "Time Synchronization" },
        { id: "maintenance-version", label: "Version Information" },
      ],
    },
    {
      id: "history",
      label: "History Log",
      items: [
        { id: "history-pmdt", label: "PMDT History Log" },
        { id: "history-lmi", label: "LMI History Log" },
      ],
    },
    {
      id: "logout",
      label: `${userId ?? "Guest"} Logout`,
      items: [{ id: "logout", label: "Logout" }],
    },
  ];
}

export function buildDme320Menus(options: {
  connected: boolean;
  authenticated: boolean;
  controlAvailable: boolean;
  draftDirty: boolean;
  flashDirty: boolean;
  bypassed: boolean;
  viewMode: Dme320ViewMode;
  keylock: Dme320KeylockMode;
}): MopiensMenuGroup[] {
  const controlDisabled = !options.connected || !options.authenticated || !options.controlAvailable;

  return [
    {
      id: "file",
      label: "File",
      commands: [
        { id: "connect", label: options.connected ? "Reconnect" : "New Connection", shortcut: "Ctrl+N" },
        { id: "disconnect", label: "Disconnect", disabled: !options.connected },
        { id: "login", label: "Login", disabled: !options.connected || options.authenticated },
        { id: "logout", label: "Logout", disabled: !options.authenticated, dividerBefore: true },
        { id: "profile-save", label: "Profile Save", shortcut: "Ctrl+S", disabled: controlDisabled || !options.bypassed || !options.flashDirty },
        { id: "print", label: "Print Current View", dividerBefore: true },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      commands: [
        { id: "apply-draft", label: "Apply", disabled: controlDisabled || !options.bypassed || !options.draftDirty },
        { id: "restore-draft", label: "Restore Draft", disabled: !options.draftDirty },
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
      ],
    },
    {
      id: "tools",
      label: "Tools",
      commands: [
        {
          id: "keylock",
          label: `Keylock: ${options.keylock}`,
          children: [
            { id: "keylock-local", label: "LOCAL", checked: options.keylock === "LOCAL" },
            { id: "keylock-rem", label: "REM", checked: options.keylock === "REM" },
            { id: "keylock-maint", label: "MAINT", checked: options.keylock === "MAINT" },
          ],
        },
        { id: "bypass", label: "Monitor Bypass", checked: options.bypassed, disabled: controlDisabled, dividerBefore: true },
        { id: "main-control", label: "Main TXP Selection", disabled: controlDisabled },
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
        { id: "transponder", label: "Transponder" },
        { id: "monitor-executive", label: "Executive Monitor" },
        { id: "maintenance-calibration", label: "Calibration" },
      ],
    },
    {
      id: "help",
      label: "Help",
      commands: [
        { id: "maintenance-version", label: "Version Information" },
        { id: "about", label: "About MOPIENS 320 DME" },
      ],
    },
  ];
}

export function buildDme320Toolbar(options: {
  connected: boolean;
  authenticated: boolean;
  controlAvailable: boolean;
  bypassed: boolean;
  flashDirty: boolean;
}): MopiensToolbarAction[] {
  const controlDisabled = !options.connected || !options.authenticated || !options.controlAvailable;

  return [
    { id: "connect", label: "Connect", showLabel: true, tone: options.connected ? "default" : "primary" },
    { id: "login", label: "Login", showLabel: true, disabled: !options.connected || options.authenticated },
    { id: "home", label: "Home", showLabel: true },
    { id: "profile-save", label: "Profile Save", showLabel: true, disabled: controlDisabled || !options.bypassed || !options.flashDirty },
    { id: "bypass", label: "Bypass", showLabel: true, pressed: options.bypassed, disabled: controlDisabled },
    { id: "changeover", label: "Change Over", showLabel: true, disabled: controlDisabled },
    { id: "power-control", label: "Power / RF", showLabel: true, disabled: controlDisabled },
    { id: "reset", label: "Reset", showLabel: true, tone: "warning", disabled: controlDisabled },
    { id: "view-lmi", label: "LMI", showLabel: true },
  ];
}

export function isDme320ScreenId(value: string): value is Dme320ScreenId {
  return Object.hasOwn(DME320_SCREEN_LABELS, value);
}
