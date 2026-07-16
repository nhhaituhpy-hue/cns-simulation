import type {
  MenuHeader,
  MenuItem,
  MenuTree,
  ToggleOption,
} from "./menu-types";

export const SA_ROOT_MENU_ID = "sa.root";

const SA_HEADER: MenuHeader = {
  sensorName: "Quadrant ADS-B sensor",
  version: "1-8-X",
  mode: "Maintenance Mode",
  userLabel: "System Administrator",
  tag: "(Unknown)",
};

const ENABLED_DISABLED: readonly ToggleOption[] = [
  { number: 1, label: "Enabled", value: "enabled" },
  { number: 2, label: "Disabled", value: "disabled" },
];

function navigate(number: number, label: string, targetMenuId: string): MenuItem {
  return { number, label, action: { type: "navigate", targetMenuId } };
}

function display(
  number: number,
  label: string,
  content: string,
  templateId?: string,
): MenuItem {
  return { number, label, action: { type: "display", content, templateId } };
}

function input(
  number: number,
  label: string,
  settingId: string,
  prompt: string,
  successMessage: string,
  sensitive = false,
): MenuItem {
  return {
    number,
    label,
    action: { type: "input", settingId, prompt, successMessage, sensitive },
  };
}

function toggle(
  number: number,
  label: string,
  settingId: string,
  prompt: string,
  options: readonly ToggleOption[] = ENABLED_DISABLED,
): MenuItem {
  return {
    number,
    label,
    action: { type: "toggle", settingId, prompt, options },
  };
}

export const SA_MENUS = {
  [SA_ROOT_MENU_ID]: {
    id: SA_ROOT_MENU_ID,
    title: "System Administrator Main Menu",
    header: SA_HEADER,
    items: [
      navigate(1, "General Settings", "sa.general"),
      navigate(2, "Network Settings", "sa.network"),
      navigate(3, "Surveillance Clients", "sa.surveillance-clients"),
      navigate(4, "System Log", "sa.system-log"),
      navigate(5, "SNMP Configuration", "sa.snmp"),
      navigate(6, "Software", "sa.software"),
      navigate(7, "Customisation", "sa.customisation"),
      navigate(8, "Configuration Import / Export", "sa.config-transfer"),
      display(
        9,
        "Change Actual Operation Mode",
        "Operation mode changes are simulated in this MVP. Maintenance Mode remains active.",
      ),
    ],
  },

  "sa.general": {
    id: "sa.general",
    title: "General Settings",
    header: SA_HEADER,
    items: [
      toggle(1, "Enable / Disable ADS-B Cat21", "sa.adsb-cat21", "Select ADS-B Cat21 state:"),
      toggle(
        2,
        "Enable / Disable ADS-B Non-OP",
        "sa.adsb-non-op",
        "Select ADS-B Non-OP state:",
      ),
      toggle(3, "Enable / Disable MLAT", "sa.mlat", "Select MLAT state:"),
      toggle(4, "Enable / Disable RAW", "sa.raw", "Select RAW state:"),
      toggle(
        5,
        "Enable / Disable CRC Correction",
        "sa.crc-correction",
        "Select CRC correction state:",
      ),
      toggle(
        6,
        "Enable / Disable Ground Targets",
        "sa.ground-targets",
        "Select ground-target processing state:",
      ),
      input(
        7,
        "Target Overload Limit",
        "sa.target-overload-limit",
        "Enter target overload limit:",
        "Target overload limit updated in the simulator.",
      ),
    ],
  },

  "sa.network": {
    id: "sa.network",
    title: "Network Settings",
    header: SA_HEADER,
    items: [
      display(
        1,
        "Display Network Configuration",
        "Interface eth0: 10.10.10.3/24\nDefault gateway: 10.10.10.1\nDHCP: disabled",
        "sa-network-display",
      ),
      input(
        2,
        "Configure Manual IP",
        "sa.manual-ip",
        "Enter IPv4 address and prefix length:",
        "Manual IP configuration accepted by the simulator.",
      ),
      display(
        3,
        "Confirm Network Changes",
        "Network-change confirmation is simulated. The training session remains connected.",
      ),
      toggle(4, "Enable / Disable DHCP", "sa.dhcp", "Select DHCP state:"),
      input(
        5,
        "Configure NTP Server",
        "sa.ntp-server",
        "Enter NTP server IPv4 address:",
        "NTP server updated in the simulator.",
      ),
      toggle(
        6,
        "Configure Physical Interface",
        "sa.physical-interface",
        "Select physical interface mode:",
        [
          { number: 1, label: "Auto negotiation", value: "auto" },
          { number: 2, label: "100 Mbps full duplex", value: "100-full" },
          { number: 3, label: "1000 Mbps full duplex", value: "1000-full" },
        ],
      ),
      input(
        7,
        "Maximum Bit Rate",
        "sa.maximum-bit-rate",
        "Enter maximum bit rate:",
        "Maximum bit rate updated in the simulator.",
      ),
    ],
  },

  "sa.surveillance-clients": {
    id: "sa.surveillance-clients",
    title: "Surveillance Clients",
    header: SA_HEADER,
    items: [
      display(
        1,
        "Display Clients",
        "Client 1: 239.10.10.1:30001, enabled, ASTERIX CAT21",
        "sa-clients-display",
      ),
      display(
        2,
        "Display Client Statistics",
        "Client 1 packets sent: 125430\nSend errors: 0",
        "sa-clients-stats",
      ),
      toggle(3, "Enable / Disable Client", "sa.client-enabled", "Select client state:"),
      input(
        4,
        "Configure Client",
        "sa.client-configuration",
        "Enter client row and destination:",
        "Client configuration updated in the simulator.",
      ),
      toggle(
        5,
        "Change Message Type",
        "sa.client-message-type",
        "Select message type:",
        [
          { number: 1, label: "ASTERIX CAT21", value: "cat21" },
          { number: 2, label: "ASTERIX CAT48", value: "cat48" },
          { number: 3, label: "RAW", value: "raw" },
        ],
      ),
      input(
        6,
        "Delete Client",
        "sa.delete-client",
        "Enter client row to delete:",
        "Client deletion simulated.",
      ),
    ],
  },

  "sa.system-log": {
    id: "sa.system-log",
    title: "System Log",
    header: SA_HEADER,
    items: [
      display(
        1,
        "Display Syslog Configuration",
        "Local destination: /var/log/messages\nRemote server: disabled",
        "sa-syslog-config",
      ),
      input(
        2,
        "Change Local Destination",
        "sa.syslog-local-destination",
        "Enter local syslog destination:",
        "Local syslog destination updated in the simulator.",
      ),
      toggle(
        3,
        "Enable / Disable Remote Server",
        "sa.syslog-remote-enabled",
        "Select remote syslog state:",
      ),
      input(
        4,
        "Configure Remote Server IP",
        "sa.syslog-remote-ip",
        "Enter remote syslog IPv4 address:",
        "Remote syslog address updated in the simulator.",
      ),
    ],
  },

  "sa.snmp": {
    id: "sa.snmp",
    title: "SNMP Configuration",
    header: SA_HEADER,
    items: [
      display(
        1,
        "Display Users",
        "SNMP user: qcms-monitor, authentication: SHA, privacy: AES",
        "sa-snmp-users",
      ),
      input(
        2,
        "Create User",
        "sa.snmp-create-user",
        "Enter new SNMP user definition:",
        "SNMP user creation simulated.",
      ),
      input(
        3,
        "Delete User",
        "sa.snmp-delete-user",
        "Enter SNMP user name to delete:",
        "SNMP user deletion simulated.",
      ),
      display(
        4,
        "Display Trap Destinations",
        "Trap destination 1: 10.10.20.15:162",
        "sa-snmp-traps",
      ),
      input(
        5,
        "Add Trap Destination",
        "sa.snmp-add-trap-destination",
        "Enter trap destination IPv4 address:",
        "Trap destination added in the simulator.",
      ),
      input(
        6,
        "Delete Trap Destination",
        "sa.snmp-delete-trap-destination",
        "Enter trap destination row to delete:",
        "Trap destination deletion simulated.",
      ),
      input(
        7,
        "Heartbeat Period",
        "sa.snmp-heartbeat-period",
        "Enter heartbeat period in seconds:",
        "Heartbeat period updated in the simulator.",
      ),
      input(
        8,
        "Alarm Period",
        "sa.snmp-alarm-period",
        "Enter alarm period in seconds:",
        "Alarm period updated in the simulator.",
      ),
      toggle(
        9,
        "Out-of-Position Trap",
        "sa.snmp-out-of-position-trap",
        "Select out-of-position trap state:",
      ),
      display(10, "Reset SNMP", "SNMP reset completed in the simulator."),
    ],
  },

  "sa.software": {
    id: "sa.software",
    title: "Software",
    header: SA_HEADER,
    items: [
      display(
        1,
        "Display Version Information",
        "Sensor software version: 1-8-X\nBuild: training-simulator",
        "sa-software-version",
      ),
      display(
        2,
        "Reset System to Factory Default",
        "Factory-default reset is simulated. Scenario data is unchanged.",
      ),
      display(3, "Restart System", "System restart is simulated. The training session remains connected."),
      display(4, "Update Software", "Software update is simulated. No package is installed."),
    ],
  },

  "sa.customisation": {
    id: "sa.customisation",
    title: "Customisation",
    header: SA_HEADER,
    items: [
      input(
        1,
        "Sensor Name",
        "sa.sensor-name",
        "Enter sensor name:",
        "Sensor name updated in the simulator.",
      ),
      display(2, "Display ADC Thresholds", "ADC threshold configuration is available as a read-only MVP mock."),
      input(
        3,
        "Mode-S Thresholds",
        "sa.mode-s-thresholds",
        "Enter Mode-S threshold profile:",
        "Mode-S thresholds updated in the simulator.",
      ),
      input(
        4,
        "Mode-A/C Threshold",
        "sa.mode-ac-threshold",
        "Enter Mode-A/C threshold:",
        "Mode-A/C threshold updated in the simulator.",
      ),
      input(
        5,
        "ADC Averaging",
        "sa.adc-averaging",
        "Enter ADC averaging value:",
        "ADC averaging updated in the simulator.",
      ),
      input(
        6,
        "Assembly Delay",
        "sa.assembly-delay",
        "Enter assembly delay:",
        "Assembly delay updated in the simulator.",
      ),
      input(
        7,
        "Mode A/C Window",
        "sa.mode-ac-window",
        "Enter Mode A/C window value:",
        "Mode A/C window updated in the simulator.",
      ),
      toggle(
        8,
        "Frame Rejection",
        "sa.frame-rejection",
        "Select frame-rejection state:",
      ),
      input(
        9,
        "Change Password",
        "sa.password",
        "Enter new password:",
        "Password change simulated.",
        true,
      ),
      display(10, "End-to-End Test", "End-to-end test completed. Simulated result: PASS."),
    ],
  },

  "sa.config-transfer": {
    id: "sa.config-transfer",
    title: "Configuration Import / Export",
    header: SA_HEADER,
    items: [
      display(1, "Export Configuration", "Configuration export completed in the simulator."),
      input(
        2,
        "Import Configuration",
        "sa.import-configuration",
        "Enter configuration package name:",
        "Configuration import completed in the simulator.",
      ),
      display(3, "Reset SSH Hosts", "SSH host records reset in the simulator."),
    ],
  },
} as const satisfies MenuTree;

