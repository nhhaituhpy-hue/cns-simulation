import type {
  MenuHeader,
  MenuItem,
  MenuTree,
  ToggleOption,
  WorkflowStep,
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

function workflow(
  number: number,
  label: string,
  workflowId: string,
  steps: readonly WorkflowStep[],
): MenuItem {
  return {
    number,
    label,
    action: { type: "workflow", workflowId, steps },
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
      workflow(
        9,
        "Change Actual Operation Mode",
        "sa.operation-mode",
        [
          {
            key: "mode",
            kind: "choice",
            prompt: "Select Actual Sensor Operating Mode:",
            options: [
              { number: 1, label: "MAINTENANCE", value: "MAINTENANCE" },
              { number: 2, label: "OPERATIONAL", value: "OPERATIONAL" },
            ],
          },
        ],
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
      workflow(
        2,
        "Configure Network Settings Manually",
        "sa.manual-network",
        [
          {
            key: "action",
            kind: "choice",
            prompt: "Manual Network Configuration:",
            options: [
              {
                number: 1,
                label: "Configure New Network Settings",
                value: "CONFIGURE",
              },
              {
                number: 2,
                label: "Leave Network Settings Unchanged",
                value: "KEEP",
              },
            ],
          },
          {
            key: "ip",
            prompt: "Enter New IP Address:",
            validation: "ipv4",
            when: { key: "action", value: "CONFIGURE" },
          },
          {
            key: "subnet",
            prompt: "Enter New Subnet Mask:",
            validation: "ipv4",
            when: { key: "action", value: "CONFIGURE" },
          },
          {
            key: "gateway",
            prompt: "Enter New Default Gateway:",
            validation: "ipv4",
            when: { key: "action", value: "CONFIGURE" },
          },
        ],
      ),
      workflow(
        3,
        "Confirm Network Changes",
        "sa.confirm-network",
        [
          {
            key: "confirm",
            kind: "choice",
            prompt: "Confirm the current network settings?",
            options: [
              { number: 1, label: "Confirm Current Settings", value: "CONFIRM" },
              { number: 2, label: "Leave Settings Unconfirmed", value: "LEAVE" },
            ],
          },
        ],
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
        "Display Client Configuration",
        "Client 1: 239.10.10.1:30001, enabled, ASTERIX CAT21",
        "sa-clients-display",
      ),
      display(
        2,
        "Display Client Statistics",
        "Client 1 packets sent: 125430\nSend errors: 0",
        "sa-clients-stats",
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
      display(
        1,
        "Display Sensor Name",
        "QUADRANT SENSOR NAME\n\nSensor Name: {{sensorName}}",
      ),
      display(
        2,
        "Display Minimum ADC Thresholds for Mode-S and Mode-A/C Processing",
        [
          "QUADRANT MINIMUM ADC THRESHOLDS",
          "",
          "Mode-S Minimum ADC Threshold    : 0",
          "Mode-A/C Minimum ADC Threshold  : 0",
        ].join("\n"),
      ),
      display(
        3,
        "Display ADC Averaging Settings",
        [
          "QUADRANT ADC AVERAGING SETTINGS",
          "",
          "Mode-S ADC Averaging   : DISABLED",
          "Mode-A/C ADC Averaging : DISABLED",
        ].join("\n"),
      ),
      display(
        4,
        "Display Output Message Assembly Delay Setting",
        "Output Message Assembly Delay: 50000 microseconds",
      ),
      display(
        5,
        "Mode A/C Windowing Function",
        [
          "MODE A/C WINDOWING FUNCTION",
          "",
          "Window Function                                  : DISABLED",
          "Window Controlled by GPS Pulse                  : ENABLED",
          "Window Controlled by Reference Transponder     : DISABLED",
          "Window Controlled by Internal Timer            : DISABLED",
          "Window Timeslot                                 : 0x1",
          "Window Interval                                 : 10 ms",
        ].join("\n"),
      ),
      display(
        6,
        "Mode A/C Empty, Low Confidence Frame Rejection",
        [
          "MODE A/C EMPTY, LOW CONFIDENCE FRAME REJECTION",
          "",
          "Frame Rejection: DISABLED",
        ].join("\n"),
      ),
      display(
        7,
        "Display End-to-End System Test Parameters",
        [
          "RF End-to-End System Test Parameters",
          "",
          "Alert Power Level       : {{alertPower}}",
          "Failure Power Level     : {{failurePower}}",
          "Sensor Operating Mode   : {{operationMode}}",
          "",
          "End-to-End Test Status  : PASS",
        ].join("\n"),
      ),
    ],
  },

  "sa.end-to-end": {
    id: "sa.end-to-end",
    title: "Configure End-to-End System Test Parameters",
    header: SA_HEADER,
    items: [
      display(
        1,
        "Display Current Parameters",
        [
          "RF End-to-End System Test Parameters",
          "",
          "Alert Power Level       : {{alertPower}}",
          "Failure Power Level     : {{failurePower}}",
          "Test Result             : PASS",
        ].join("\n"),
      ),
      workflow(
        2,
        "Configure Power Level Thresholds",
        "sa.e2e-thresholds",
        [
          {
            key: "action",
            kind: "choice",
            prompt: "Power Level Threshold Configuration:",
            options: [
              { number: 1, label: "Set New Thresholds", value: "SET" },
              { number: 2, label: "Leave Thresholds Unchanged", value: "KEEP" },
            ],
          },
          {
            key: "alert",
            prompt: "Enter New Alert Power Level:",
            validation: "integer",
            min: 0,
            max: 255,
            when: { key: "action", value: "SET" },
          },
          {
            key: "failure",
            prompt: "Enter New Failure Power Level:",
            validation: "integer",
            min: 0,
            max: 255,
            when: { key: "action", value: "SET" },
          },
        ],
      ),
    ],
  },

  "sa.config-transfer": {
    id: "sa.config-transfer",
    title: "Configuration Import / Export",
    header: SA_HEADER,
    items: [
      workflow(
        1,
        "Export Current System Configuration",
        "sa.export-config",
        [
          {
            key: "action",
            kind: "choice",
            prompt: "Export Current System Configuration:",
            options: [
              { number: 1, label: "Continue", value: "CONTINUE" },
              { number: 2, label: "Cancel", value: "CANCEL" },
            ],
          },
          {
            key: "filename",
            prompt: "Enter Remote Filename:",
            validation: "text",
            when: { key: "action", value: "CONTINUE" },
          },
          {
            key: "remoteIp",
            prompt: "Enter Remote IP Address:",
            validation: "ipv4",
            when: { key: "action", value: "CONTINUE" },
          },
          {
            key: "directory",
            prompt: "Enter Remote Directory:",
            validation: "text",
            when: { key: "action", value: "CONTINUE" },
          },
        ],
      ),
      input(
        2,
        "Import Configuration",
        "sa.import-configuration",
        "Enter configuration package name:",
        "Configuration import completed in the simulator.",
      ),
      workflow(
        3,
        "Reset SSH Known Hosts",
        "reset-ssh-hosts",
        [
          {
            key: "confirm",
            kind: "choice",
            prompt: "Reset all SSH known-host records?",
            options: [
              { number: 1, label: "Reset SSH Known Hosts", value: "RESET" },
              { number: 2, label: "Do Not Reset", value: "KEEP" },
            ],
          },
        ],
      ),
    ],
  },
} as const satisfies MenuTree;
