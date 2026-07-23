import type {
  MenuHeader,
  MenuItem,
  MenuTree,
  ToggleOption,
  WorkflowStep,
} from "./menu-types";

export const MA_ROOT_MENU_ID = "ma.root";

const MA_HEADER: MenuHeader = {
  sensorName: "Quadrant ADS-B sensor",
  version: "1-8-X",
  mode: "Maintenance Mode",
  userLabel: "Maintenance",
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

export const MA_MENUS = {
  [MA_ROOT_MENU_ID]: {
    id: MA_ROOT_MENU_ID,
    title: "Maintenance Main Menu",
    header: MA_HEADER,
    items: [
      navigate(1, "General Settings", "ma.general"),
      navigate(2, "Network Settings", "ma.network"),
      navigate(3, "Surveillance Clients", "ma.surveillance-clients"),
      navigate(4, "System Log", "ma.system-log"),
      navigate(5, "Filter Configuration", "ma.filters"),
      navigate(6, "GPS / NTP Configuration", "ma.gps-ntp"),
      navigate(7, "Software", "ma.software"),
      navigate(8, "Display System Statistics", "ma.system-stats"),
      navigate(9, "Customisation", "ma.customisation"),
      navigate(10, "Configuration Export", "ma.config-transfer"),
      navigate(11, "Monitoring Devices", "ma.monitoring-devices"),
    ],
  },

  "ma.general": {
    id: "ma.general",
    title: "General Settings",
    header: MA_HEADER,
    items: [
      navigate(1, "Configure ASTERIX", "ma.asterix"),
      workflow(
        2,
        "Display and Set Sensor Position",
        "ma.sensor-position",
        [
          {
            key: "source",
            kind: "choice",
            prompt: "Select Sensor Position Source:",
            options: [
              { number: 1, label: "Enter Position Manually", value: "MANUAL" },
              { number: 2, label: "Obtain Position from GPS", value: "GPS" },
            ],
          },
          {
            key: "gpsPosition",
            kind: "choice",
            prompt: "Select GPS Position:",
            options: [
              { number: 1, label: "Use Actual GPS Position", value: "ACTUAL" },
              { number: 2, label: "Use Averaged GPS Position", value: "AVERAGED" },
            ],
            when: { key: "source", value: "GPS" },
          },
          {
            key: "latitude",
            prompt: "Enter Sensor Latitude:",
            validation: "text",
            when: { key: "source", value: "MANUAL" },
          },
          {
            key: "longitude",
            prompt: "Enter Sensor Longitude:",
            validation: "text",
            when: { key: "source", value: "MANUAL" },
          },
          {
            key: "altitude",
            prompt: "Enter Sensor Altitude:",
            validation: "text",
            when: { key: "source", value: "MANUAL" },
          },
        ],
      ),
      input(
        3,
        "Sensor Time",
        "ma.sensor-time",
        "Enter sensor UTC time:",
        "Sensor time updated in the simulator.",
      ),
      toggle(
        4,
        "Downlink Formats",
        "ma.downlink-formats",
        "Select downlink format profile:",
        [
          { number: 1, label: "DF17", value: "df17" },
          { number: 2, label: "DF18", value: "df18" },
          { number: 3, label: "All supported formats", value: "all" },
        ],
      ),
    ],
  },

  "ma.asterix": {
    id: "ma.asterix",
    title: "Configure ASTERIX",
    header: MA_HEADER,
    items: [
      display(
        1,
        "Display ASTERIX Configuration",
        [
          "ASTERIX Configuration",
          "",
          "System Area Code (SAC)       : {{sac}}",
          "System Identification Code  : {{sic}}",
          "CAT21 ADS-B Output          : ENABLED",
          "CAT21 Non-OP Output         : ENABLED",
          "Maximum Data Block Size     : 512",
          "IP Time To Live             : 64",
        ].join("\n"),
      ),
      workflow(
        2,
        "Configure SAC",
        "ma.sac",
        [
          {
            key: "value",
            prompt: "Enter New Value for SAC (0-255):",
            validation: "integer",
            min: 0,
            max: 255,
          },
        ],
      ),
      workflow(
        3,
        "Configure SIC",
        "ma.sic",
        [
          {
            key: "value",
            prompt: "Enter New Value for SIC (0-255):",
            validation: "integer",
            min: 0,
            max: 255,
          },
        ],
      ),
    ],
  },

  "ma.network": {
    id: "ma.network",
    title: "Network Settings",
    header: MA_HEADER,
    items: [
      display(
        1,
        "Display Network Configuration",
        "Interface eth0: 10.10.10.3/24\nDefault gateway: 10.10.10.1",
        "ma-network-display",
      ),
      display(
        2,
        "Display NTP Configuration",
        "NTP server: 10.10.10.1\nState: synchronized",
        "ma-network-ntp",
      ),
      display(
        3,
        "Display Maximum Bit Rate",
        "Maximum bit rate: 100 Mbps",
        "ma-network-bitrate",
      ),
    ],
  },

  "ma.surveillance-clients": {
    id: "ma.surveillance-clients",
    title: "Surveillance Clients",
    header: MA_HEADER,
    items: [
      display(
        1,
        "Display Client Configuration",
        "Client 1: 239.10.10.1:30001, enabled, ASTERIX CAT21",
        "ma-clients-display",
      ),
      display(
        2,
        "Display Client Statistics",
        "Client statistics are unavailable.",
        "sa-clients-stats",
      ),
      toggle(3, "Enable / Disable Client", "ma.client-enabled", "Select client state:"),
    ],
  },

  "ma.system-log": {
    id: "ma.system-log",
    title: "System Log",
    header: MA_HEADER,
    items: [
      display(
        1,
        "Display Syslog Configuration",
        "Local destination: /var/log/messages\nRemote server: disabled",
      ),
      input(
        2,
        "Change Local Destination",
        "ma.syslog-local-destination",
        "Enter local syslog destination:",
        "Local syslog destination updated in the simulator.",
      ),
      toggle(
        3,
        "Enable / Disable Remote Server",
        "ma.syslog-remote-enabled",
        "Select remote syslog state:",
      ),
      input(
        4,
        "Configure Remote Server IP",
        "ma.syslog-remote-ip",
        "Enter remote syslog IPv4 address:",
        "Remote syslog address updated in the simulator.",
      ),
    ],
  },

  "ma.filters": {
    id: "ma.filters",
    title: "Filter Configuration",
    header: MA_HEADER,
    items: [
      display(
        1,
        "Display Filters",
        "Filter training-zone: enabled\nFilter maintenance-test: disabled",
        "ma-filter-display",
      ),
      toggle(2, "Enable / Disable Filters", "ma.filters-enabled", "Select filter state:"),
      input(
        3,
        "Configure Filters",
        "ma.filter-configuration",
        "Enter filter name and configuration:",
        "Filter configuration updated in the simulator.",
      ),
      display(4, "Reset Filters", "Filter reset completed in the simulator."),
    ],
  },

  "ma.gps-ntp": {
    id: "ma.gps-ntp",
    title: "GPS / NTP Configuration",
    header: MA_HEADER,
    items: [
      display(
        1,
        "Display Status",
        "GPS: synchronized\nNTP: synchronized\nOffset: 0.4 ms",
        "ma-gps-status",
      ),
      toggle(2, "Enable / Disable GPS", "ma.gps-enabled", "Select GPS state:"),
      toggle(3, "Enable / Disable NTP", "ma.ntp-enabled", "Select NTP state:"),
      display(4, "Reset GPS Averaging", "GPS averaging reset completed in the simulator."),
      display(5, "Initialize GPS", "GPS initialization completed in the simulator."),
    ],
  },

  "ma.software": {
    id: "ma.software",
    title: "Software",
    header: MA_HEADER,
    items: [
      display(1, "Display Version Information", "Sensor software version: 1-8-X\nBuild: training-simulator"),
      display(2, "Restart System", "System restart is simulated. The training session remains connected."),
    ],
  },

  "ma.system-stats": {
    id: "ma.system-stats",
    title: "Display System Statistics",
    header: MA_HEADER,
    items: [
      display(
        1,
        "Display System Configuration",
        "CPU: simulated ARM platform\nMemory: 2048 MB\nStorage: healthy",
        "ma-system-config",
      ),
      display(
        2,
        "Display System Status Information",
        "Uptime: 12 days\nCPU load: 23%\nTemperature: 45 C",
        "ma-system-status",
      ),
      display(
        3,
        "Display Extended Mode-S Statistics",
        "DSP frames: 2485030\nRejected frames: 17\nOverloads: 0",
        "ma-dsp-stats",
      ),
      display(
        4,
        "Display Extended Mode-AC Statistics",
        "Mode A/C receiver statistics are available.",
        "ma-mode-ac-stats",
      ),
      workflow(
        5,
        "Reset Extended DSP Statistics",
        "ma.reset-dsp-statistics",
        [
          {
            key: "action",
            kind: "choice",
            prompt: "Reset all extended DSP statistics?",
            options: [
              { number: 1, label: "Reset Statistics", value: "RESET" },
              { number: 2, label: "Do Not Reset", value: "KEEP" },
            ],
          },
        ],
      ),
      display(
        6,
        "Display Local System Log",
        "Local system log is available.",
        "ma-local-system-log",
      ),
      workflow(
        7,
        "Export Entire Local System Log",
        "ma.export-local-system-log",
        [
          {
            key: "action",
            kind: "choice",
            prompt: "Export the entire local system log?",
            options: [
              { number: 1, label: "Continue Export", value: "CONTINUE" },
              { number: 2, label: "Cancel Export", value: "CANCEL" },
            ],
          },
          {
            key: "filename",
            prompt: "Enter remote filename:",
            validation: "text",
            when: { key: "action", value: "CONTINUE" },
          },
          {
            key: "remoteIp",
            prompt: "Enter remote server IP address:",
            validation: "ipv4",
            when: { key: "action", value: "CONTINUE" },
          },
          {
            key: "directory",
            prompt: "Enter remote directory:",
            validation: "text",
            when: { key: "action", value: "CONTINUE" },
          },
        ],
      ),
      workflow(
        8,
        "Export System Status Information",
        "ma.export-system-status",
        [
          {
            key: "action",
            kind: "choice",
            prompt: "Export the current system status information?",
            options: [
              { number: 1, label: "Continue Export", value: "CONTINUE" },
              { number: 2, label: "Cancel Export", value: "CANCEL" },
            ],
          },
          {
            key: "filename",
            prompt: "Enter remote filename:",
            validation: "text",
            when: { key: "action", value: "CONTINUE" },
          },
          {
            key: "remoteIp",
            prompt: "Enter remote server IP address:",
            validation: "ipv4",
            when: { key: "action", value: "CONTINUE" },
          },
          {
            key: "directory",
            prompt: "Enter remote directory:",
            validation: "text",
            when: { key: "action", value: "CONTINUE" },
          },
        ],
      ),
    ],
  },

  "ma.customisation": {
    id: "ma.customisation",
    title: "Customisation",
    header: MA_HEADER,
    items: [
      input(
        1,
        "Position Ambiguity Offset",
        "ma.position-ambiguity-offset",
        "Enter position ambiguity offset:",
        "Position ambiguity offset updated in the simulator.",
      ),
      input(
        2,
        "Change Password",
        "ma.password",
        "Enter new password:",
        "Password change simulated.",
        true,
      ),
      input(
        3,
        "ASTERIX Data Block Size",
        "ma.asterix-block-size",
        "Enter ASTERIX data block size:",
        "ASTERIX data block size updated in the simulator.",
      ),
      input(
        4,
        "TTL of ASTERIX IP",
        "ma.asterix-ttl",
        "Enter ASTERIX IP TTL:",
        "ASTERIX IP TTL updated in the simulator.",
      ),
    ],
  },

  "ma.config-transfer": {
    id: "ma.config-transfer",
    title: "Configuration Import / Export",
    header: MA_HEADER,
    items: [
      display(1, "Export Configuration", "Configuration export completed in the simulator."),
      input(
        2,
        "Import Configuration",
        "ma.import-configuration",
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

  "ma.monitoring-devices": {
    id: "ma.monitoring-devices",
    title: "Monitoring Devices",
    header: MA_HEADER,
    items: [
      display(
        1,
        "Display Configuration",
        "Monitoring device 1: QCMS 10.10.20.15, enabled",
        "ma-monitoring-display",
      ),
      toggle(
        2,
        "Enable / Disable Monitoring Device",
        "ma.monitoring-device-enabled",
        "Select monitoring-device state:",
      ),
      input(
        3,
        "Configure Monitoring Device",
        "ma.monitoring-device-configuration",
        "Enter monitoring-device row and address:",
        "Monitoring-device configuration updated in the simulator.",
      ),
      input(
        4,
        "Delete Monitoring Device",
        "ma.delete-monitoring-device",
        "Enter monitoring-device row to delete:",
        "Monitoring-device deletion simulated.",
      ),
      toggle(
        5,
        "ASTERIX SiteMonitor Processing",
        "ma.asterix-site-monitor-processing",
        "Select ASTERIX SiteMonitor processing state:",
      ),
    ],
  },
} as const satisfies MenuTree;
