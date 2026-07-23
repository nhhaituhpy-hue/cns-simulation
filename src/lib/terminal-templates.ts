import type {
  SensorDataProfile,
  SensorMonitoringData,
  SurveillanceClient,
} from "./types";

export const TERMINAL_TEMPLATE_IDS = [
  "sa-network-display",
  "sa-software-version",
  "sa-clients-display",
  "sa-clients-stats",
  "sa-end-to-end-display",
  "sa-snmp-users",
  "sa-snmp-traps",
  "sa-syslog-config",
  "ma-network-display",
  "ma-network-ntp",
  "ma-network-bitrate",
  "ma-system-config",
  "ma-system-status",
  "ma-dsp-stats",
  "ma-mode-ac-stats",
  "ma-local-system-log",
  "ma-gps-status",
  "ma-filter-display",
  "ma-clients-display",
  "ma-monitoring-display",
] as const;

export type TerminalTemplateId = (typeof TERMINAL_TEMPLATE_IDS)[number];

const SHORT_RULE = "   " + "\u2500".repeat(33);
const LONG_RULE = "   " + "\u2500".repeat(61);
const RETURN_PROMPT = "Press RETURN to continue:";

function finish(lines: readonly string[]): string {
  return lines.join("\n") + "\n\n" + RETURN_PROMPT;
}

function enabled(value: boolean): string {
  return value ? "enabled" : "disabled";
}

function yesNo(value: boolean): string {
  return value ? "YES" : "NO";
}

function enabledUpper(value: boolean): string {
  return value ? "ENABLED" : "DISABLED";
}

function configurationLine(label: string, value: string | number): string {
  return `${label.padEnd(42)}: ${value}`;
}

function statusLine(label: string, value: string | number): string {
  return `${label.padEnd(56)}: ${value}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function valueOrUnavailable(value: string | number | undefined): string {
  return value === undefined ? "Unavailable" : String(value);
}

function gpsStatus(
  monitoring: SensorMonitoringData | undefined,
  profile: SensorDataProfile,
): string {
  if (!profile.gps.enabled) return "Unavailable";
  if (!monitoring) return "Configured";

  const labels: Record<SensorMonitoringData["gpsStatus"], string> = {
    synchronized: "Synchronized",
    unsynchronized: "Not synchronized",
    unavailable: "Unavailable",
  };
  return labels[monitoring.gpsStatus];
}

function clip(value: string, width: number): string {
  if (value.length <= width) return value;
  return value.slice(0, Math.max(0, width - 3)) + "...";
}

function clientMessageLabel(messageType: string): string {
  const normalized = messageType.trim().toLowerCase();

  if (normalized === "all" || normalized === "both") {
    return "CAT 21/23/247";
  }
  if (normalized.includes("non-op")) return "CAT 23/247";
  if (normalized.includes("cat21") || normalized.includes("cat 21")) {
    return "CAT 21";
  }
  if (normalized.includes("cat48") || normalized.includes("cat 48")) {
    return "CAT 48";
  }
  if (normalized === "raw") return "RAW";

  return messageType;
}

function clientConfigurationRow(
  number: number,
  client: SurveillanceClient | undefined,
): string {
  const numberLabel = String(number).padStart(2);

  if (!client) {
    return `(${numberLabel}) (Disabled) ${"<unconfigured>".padEnd(32)} ${"<None>".padEnd(7)} ${"<None>".padEnd(15)} ${"0.0.0.0".padEnd(15)} 0`;
  }

  const state = client.enabled ? "Enabled " : "Disabled";
  const protocol = `AST_${client.protocol}`;
  const messageType = clientMessageLabel(client.messageType);

  return `(${numberLabel}) (${state}) ${clip(client.name, 32).padEnd(32)} ${protocol.padEnd(7)} ${messageType.padEnd(15)} ${client.ip.padEnd(15)} ${client.port}`;
}

function renderNetwork(profile: SensorDataProfile, title: string): string {
  const { network } = profile;
  return finish([
    "   " + title + ":",
    SHORT_RULE,
    "   IP Address:      " + network.ip,
    "   Subnet Mask:     " + network.subnet,
    "   Default Gateway: " + network.gateway,
    "   DHCP:            " + enabled(network.dhcp),
    "   MAC Address:     " + network.macAddress,
    "   NTP Server:      " + network.ntpServer,
    "   Physical Int.:   eth0",
    "   Max Bit Rate:    " + network.bitRate,
  ]);
}

export function renderClientConfiguration(
  profile: SensorDataProfile,
  footer = "PRESS RETURN TO CONTINUE",
): string {
  const rows = Array.from({ length: 20 }, (_, index) => {
    const number = index + 1;
    const client = profile.clients.find((item) => item.id === number);
    return clientConfigurationRow(number, client);
  });

  return [
    "QUADRANT SURVEILLANCE CLIENTS",
    ...rows,
    "",
    footer,
  ].join("\n");
}

function renderClientStats(profile: SensorDataProfile): string {
  type ClientOutputStats = {
    queuedRecords: number;
    sentRecords: number;
    sentMessages: number;
    messagesPerSecond: number;
    recordsPerSecond: number;
    bytesPerSecond: number;
  };

  const referenceStats: Record<number, ClientOutputStats> = {
    1: {
      queuedRecords: 208055361,
      sentRecords: 208028365,
      sentMessages: 16013362,
      messagesPerSecond: 2,
      recordsPerSecond: 24,
      bytesPerSecond: 1705,
    },
    2: {
      queuedRecords: 208055361,
      sentRecords: 208035454,
      sentMessages: 16013361,
      messagesPerSecond: 2,
      recordsPerSecond: 24,
      bytesPerSecond: 1705,
    },
    3: {
      queuedRecords: 207409362,
      sentRecords: 207390686,
      sentMessages: 15689975,
      messagesPerSecond: 2,
      recordsPerSecond: 24,
      bytesPerSecond: 1705,
    },
    8: {
      queuedRecords: 208055361,
      sentRecords: 208055361,
      sentMessages: 16013360,
      messagesPerSecond: 2,
      recordsPerSecond: 24,
      bytesPerSecond: 1705,
    },
  };
  const emptyStats = (): ClientOutputStats => ({
    queuedRecords: 0,
    sentRecords: 0,
    sentMessages: 0,
    messagesPerSecond: 0,
    recordsPerSecond: 0,
    bytesPerSecond: 0,
  });
  const fallbackStats = (client: SurveillanceClient): ClientOutputStats => ({
    queuedRecords: client.messagesSent,
    sentRecords: client.messagesSent,
    sentMessages: Math.floor(client.messagesSent * 0.077),
    messagesPerSecond: client.messagesSent > 0 ? 2 : 0,
    recordsPerSecond: client.messagesSent > 0 ? 24 : 0,
    bytesPerSecond: client.messagesSent > 0 ? 1705 : 0,
  });
  const formatStatsRow = (name: string, stats: ClientOutputStats): string =>
    [
      clip(name, 32).padEnd(32),
      String(stats.queuedRecords).padStart(10),
      String(stats.sentRecords).padStart(10),
      String(stats.sentMessages).padStart(9),
      String(stats.messagesPerSecond).padStart(7),
      String(stats.recordsPerSecond).padStart(9),
      String(stats.bytesPerSecond).padStart(9),
    ].join(" ");

  const totals = emptyStats();
  const rows = Array.from({ length: 20 }, (_, index) => {
    const clientNumber = index + 1;
    const client = profile.clients.find((item) => item.id === clientNumber);
    const name = client?.name ?? "<unconfigured>";

    if (!client?.enabled) return `${clip(name, 32).padEnd(32)}<not enabled>`;

    const stats =
      profile.sensorName.toLowerCase() === "noibai"
        ? (referenceStats[clientNumber] ?? fallbackStats(client))
        : fallbackStats(client);
    totals.queuedRecords += stats.queuedRecords;
    totals.sentRecords += stats.sentRecords;
    totals.sentMessages += stats.sentMessages;
    totals.messagesPerSecond += stats.messagesPerSecond;
    totals.recordsPerSecond += stats.recordsPerSecond;
    totals.bytesPerSecond += stats.bytesPerSecond;
    return formatStatsRow(name, stats);
  });
  const rule = "=".repeat(90);

  return [
    "QUADRANT SURVEILLANCE CLIENT OUTPUT STATISTICS",
    "",
    "Client                              Queued       Sent      Sent    Msgs/  Records/   Bytes/",
    "                                    Records    Records      Msgs     Sec       Sec      Sec",
    rule,
    ...rows,
    rule,
    formatStatsRow("All clients", totals),
    "",
    "PRESS ENTER TO RETURN",
  ].join("\n");
}

function renderEndToEndParameters(profile: SensorDataProfile): string {
  const alertPower = profile.endToEnd?.alertPower ?? 164;
  const failurePower = profile.endToEnd?.failurePower ?? 140;

  return [
    "DISPLAY CURRENT END-TO-END SYSTEM TEST PARAMETERS",
    "",
    "Active Setting:",
    "",
    statusLine("    Current Power Level to Trigger an Alert", alertPower),
    statusLine("    Current Power Level to Trigger a Failure", failurePower),
    "",
    statusLine(
      "    The Internal RF-Loopback Output Power Level",
      "0xd (-4.5 dBm)",
    ),
    "",
    statusLine("    The Internal RF-Loopback Transmission is", "ENABLED"),
    statusLine(
      "    The Internal RF-Loopback Transmission Timeout is",
      "10 Second(s)",
    ),
    "",
    "PRESS RETURN TO CONTINUE",
  ].join("\n");
}

function renderSnmpUsers(profile: SensorDataProfile): string {
  const rows = profile.snmpUsers.length
    ? profile.snmpUsers.map(
        (user, index) =>
          "   " +
          String(index + 1).padStart(2) +
          " " +
          clip(user.name, 24).padEnd(24) +
          " " +
          user.authType,
      )
    : ["   No SNMP users configured."];

  return finish([
    "   SNMP User Configuration:",
    SHORT_RULE,
    "   #  User Name                Authentication",
    ...rows,
    "   Heartbeat Period: " + profile.snmpHeartbeatPeriod + " seconds",
    "   Alarm Period:     " + profile.snmpAlarmPeriod + " seconds",
  ]);
}

function renderSnmpTraps(profile: SensorDataProfile): string {
  const rows = profile.snmpTraps.length
    ? profile.snmpTraps.map(
        (trap, index) =>
          "   " +
          String(index + 1).padStart(2) +
          " " +
          trap.ip.padEnd(15) +
          " " +
          String(trap.port).padStart(5) +
          " " +
          yesNo(trap.enabled).padStart(7),
      )
    : ["   No SNMP trap destinations configured."];

  return finish([
    "   SNMP Trap Destinations:",
    SHORT_RULE,
    "   #  IP Address       Port Enabled",
    ...rows,
  ]);
}

function renderSystemConfig(profile: SensorDataProfile): string {
  const mandatoryFrns = new Set([1, 2, 11, 17]);
  const dfLines = Array.from({ length: 25 }, (_, index) =>
    configurationLine(`MLT Uses DF${index}`, "YES"),
  );
  const frnLines = Array.from({ length: 49 }, (_, index) => {
    const frn = index + 1;
    const mandatory = mandatoryFrns.has(frn) ? " (mandatory)" : "";
    return configurationLine(`Transmit FRN ${frn}${mandatory}`, "YES");
  });
  const clientLines = Array.from({ length: 20 }, (_, index) => {
    const clientNumber = index + 1;
    const client = profile.clients.find((item) => item.id === clientNumber);

    if (!client) {
      return `Client ${clientNumber}: <unconfigured>, disabled, none, none, 0.0.0.0, 0`;
    }

    return [
      `Client ${clientNumber}: ${client.name}`,
      client.enabled ? "enabled" : "disabled",
      `AST_${client.protocol}`,
      client.messageType,
      client.ip,
      client.port,
    ].join(", ");
  });
  const filterLines = Array.from(
    { length: 8 },
    () => configurationLine("<unconfigured>", "NO"),
  );
  const routerLines = Array.from({ length: 10 }, (_, index) => {
    const routerNumber = index + 1;
    const value =
      routerNumber === 2
        ? `Default gateway ${profile.network.gateway}`
        : "<unconfigured>";
    return configurationLine(
      `Router ${String(routerNumber).padStart(2)}`,
      value,
    );
  });
  const snmpUserLines = Array.from({ length: 10 }, (_, index) => {
    const user = profile.snmpUsers[index];
    const value = user
      ? `${user.name}, ${
          user.authType === "noAuth"
            ? "read write community, none, none"
            : `${user.authType}, authentication, privacy`
        }`
      : "<unconfigured>";
    return configurationLine(`User ${String(index + 1).padStart(2)}`, value);
  });
  const trapLines = Array.from({ length: 10 }, (_, index) => {
    const trap = profile.snmpTraps[index];
    const value = trap
      ? `${trap.ip}, ${trap.port}, ${enabledUpper(trap.enabled)}`
      : "<unconfigured>";
    return configurationLine(
      `Trap Destination ${String(index + 1).padStart(2)}`,
      value,
    );
  });
  const ntpServerLines = Array.from({ length: 5 }, (_, index) =>
    configurationLine(
      `NTP server IP address ${index + 1}`,
      index === 0 ? profile.gps.ntpServer : "0.0.0.0",
    ),
  );
  const monitorLines = Array.from({ length: 10 }, (_, index) => {
    const monitor = profile.siteMonitors[index];
    const number = String(index + 1).padStart(2);
    if (!monitor) {
      return `   (${number}) (Disabled) ${"<unconfigured>".padEnd(32)} ${"<None>".padEnd(32)} 0`;
    }

    return `   (${number}) (${monitor.enabled ? "Enabled " : "Disabled"}) ${monitor.ip.padEnd(32)} ${monitor.name.padEnd(32)} ${monitor.port}`;
  });
  const altitude = profile.gps.altitude.replace(/\s*m$/i, "");
  const operationMode =
    profile.operationMode === "MAINTENANCE" ? "Maintenance" : "Operational";

  return [
    "QUADRANT Configuration",
    "",
    `Sensor Name: ${profile.sensorName}`,
    "Configuration Tag: Unknown",
    "",
    configurationLine("Transmit MLT Messages", "ENABLED"),
    "",
    ...dfLines,
    "",
    `SAC: ${profile.asterix.sac}`,
    `SIC: ${profile.asterix.sic}`,
    "",
    `ASTERIX Category 21 UAP: Version ${profile.asterix.cat21Version}`,
    "",
    "Transmitted Data Items of ASTERIX Category 21 According to Corresponding User Application Profile (UAP)",
    ...frnLines,
    "",
    "ASTERIX Category 21 Transmission Mode: Periodic",
    "ASTERIX Category 21 Report Period (used only in periodic mode): 1.0 Second(s)",
    "",
    `Capacity Threshold: ${profile.general.targetOverloadLimit}`,
    "",
    "Position Ambiguity Test Offset: 500.000000 meters.",
    "",
    "ASTERIX Category 23 UAP: Version 1.2",
    "",
    "ASTERIX Category 23 Update Frequencies:",
    "",
    configurationLine("Ground Station Status", 60),
    configurationLine("Service Status", 60),
    configurationLine("Service Statistics", 30),
    "",
    configurationLine("ASTERIX Category 247 Update Frequency", 600),
    "",
    "Surveillance Clients:",
    ...clientLines,
    "",
    configurationLine("Output Message Assembly Delay", 50000),
    "",
    configurationLine(
      "Max Size of ASTERIX Block",
      profile.asterix.dataBlockSize,
    ),
    "",
    configurationLine("ASTERIX TTL for IP Packets", profile.asterix.ttl),
    "",
    "Filter status:",
    ...filterLines,
    "",
    configurationLine(
      "Transmit ADS-B Data",
      enabledUpper(profile.asterix.cat21Enabled),
    ),
    configurationLine("Transmit ADS-B if Unsynchronised", "ENABLED"),
    configurationLine(
      "Transmit RAW Data",
      enabledUpper(profile.asterix.rawEnabled),
    ),
    configurationLine(
      "Use CRC Correction",
      enabledUpper(profile.general.crcCorrection),
    ),
    configurationLine("Report Out-of-Position Case", "ENABLED"),
    "",
    `Network Settings: IP ${profile.network.ip}, Mask ${profile.network.subnet},`,
    "AutoAllSupport",
    ...routerLines,
    "",
    configurationLine("Maximum Ground Interface Bit Rate", "100000 kBits/s"),
    "",
    "SNMP Settings:",
    ...snmpUserLines,
    ...trapLines,
    `SNMP Heartbeat Period : ${profile.snmpHeartbeatPeriod}`,
    `SNMP Alarm Period     : ${profile.snmpAlarmPeriod}`,
    "",
    configurationLine("GPS Status", enabledUpper(profile.gps.enabled)),
    configurationLine("NTP Status", enabledUpper(profile.gps.ntpEnabled)),
    configurationLine("GPS operation mode", "Fixed Platform"),
    ...ntpServerLines,
    "",
    configurationLine("Configured Latitude", profile.gps.latitude),
    configurationLine("Configured Longitude", profile.gps.longitude),
    configurationLine("Configured Height", altitude),
    "",
    "Status of Monitoring Devices:",
    "Active Settings:",
    "",
    ...monitorLines,
    "",
    configurationLine(
      "ASTERIX Processing of SiteMonitor Messages",
      "ENABLED",
    ),
    configurationLine(
      "MLAT Processing of SiteMonitor Messages",
      enabledUpper(profile.asterix.mlatEnabled),
    ),
    "",
    "Mode A/C Windowing Function:",
    "",
    configurationLine("Window Function", "DISABLED"),
    configurationLine("Window Controlled by GPS Pulse", "ENABLED"),
    configurationLine(
      "Window Controlled by Reference Transponder Telegram",
      "DISABLED",
    ),
    configurationLine("Window Controlled by Internal Timer", "DISABLED"),
    configurationLine("Window Timeslot", "0x1"),
    configurationLine("Window Interval", "10 ms"),
    "",
    configurationLine(
      "Mode A/C Empty / Low Confidence Frame Rejection",
      "DISABLED",
    ),
    "",
    "Syslog Configuration:",
    configurationLine(
      "Syslog Local Log Destination",
      profile.syslog.localDestination,
    ),
    configurationLine(
      "Syslog to Remote Server",
      enabledUpper(profile.syslog.remoteEnabled),
    ),
    configurationLine("Syslog Server IP", profile.syslog.remoteServerIp),
    "",
    configurationLine("Test Transmission Timeout", "10 Second(s)"),
    configurationLine("Test Transmission Allow Loopback", "ENABLED"),
    configurationLine(
      "Test Target Alert Power",
      profile.endToEnd?.alertPower ?? 164,
    ),
    configurationLine(
      "Test Target Failure Power",
      profile.endToEnd?.failurePower ?? 140,
    ),
    "",
    configurationLine(
      "Ground Targets Processing",
      enabledUpper(profile.general.groundTargets),
    ),
    `        Operating Mode : ${operationMode}`,
    "       PRESS RETURN TO CONTINUE",
  ].join("\n");
}

function renderSystemStatus(
  profile: SensorDataProfile,
  monitoring: SensorMonitoringData | undefined,
): string {
  const cpuLoad = monitoring?.cpuLoadPercent ?? 0.2;
  const positiveVoltage = monitoring?.voltages.v12 ?? 11.1;
  const dspBoardVoltage = monitoring?.voltages.v3_3 ?? 3.2;
  const dspBoardTemperature = monitoring?.temperatureC ?? 41;
  const gpsAvailable =
    profile.gps.enabled && monitoring?.gpsStatus !== "unavailable";
  const gpsSynchronized =
    profile.gps.enabled &&
    (!monitoring || monitoring.gpsStatus === "synchronized");

  return [
    "QUADRANT STATE",
    "== CPU ==",
    statusLine(
      "CPU Load",
      `${cpuLoad.toFixed(1)} % (allowed range: [0.0 %, 75.0 %])`,
    ),
    "",
    "== GPS ==",
    statusLine("GPS Status", yesNo(gpsAvailable)),
    statusLine("Time of Last GPS Message", "Sat Jul 18 01:33:06 2026"),
    statusLine("GPS Synchronised", yesNo(gpsSynchronized)),
    statusLine("Time of Last GPS Reset", "Mon Jun 22 03:55:36 2026"),
    statusLine(
      "GPS Position [latitude, longitude, geoidal height]",
      " 21.212968, 105.831885,   18.0",
    ),
    statusLine(
      "GPS Averaged Position [ 8778161 measurements]",
      " 21.213006, 105.831894,   15.7",
    ),
    statusLine(
      "GPS Averaged Position [  10.000 measurements ]",
      " 21.213017, 105.831861,   12.1",
    ),
    statusLine(
      "Averaged Position Completed at Time",
      "Mon Apr  6 05:19:07 2026",
    ),
    statusLine(
      "GPS Averaged Position [ 100.000 measurements ]",
      " 21.213008, 105.831870,   17.8",
    ),
    statusLine(
      "Averaged Position Completed at Time",
      "Tue Apr  7 06:19:06 2026",
    ),
    statusLine("Speed over ground [km/h]", 0),
    statusLine("Course over ground [degrees]", 0),
    statusLine("Distance to Configured Position [metres]", 4),
    "GPGGA : $GPGGA,013306,2112.7781,N,10549.9131,E,2,09,0.9,18.0,M,-26.7,M,,*5B",
    "PGRMF : $PGRMF,379,524003,180726,013305,18,2112.7781,N,10549.9131,E,A,2,0,0,2,1*19",
    "GPGSA : PRNs of Active Satellites: 05, 06, 09, 11, 12, 17, 19, 21, 25",
    "PGRMT : $PGRMT,GPS 16x-HVS software ver. 4.40,,,,,,,,*75",
    "PGRMC : $PGRMC,A,00018.0,100,0000000.000,000.000000000,0000,0000,0000,A,3,0,2,04,1.0*47",
    "PGRMC1: $PGRMC1,1,1,2,,,,1,A,N,,,,2,2,2*68",
    "",
    "== Voltages and Temperatures ==",
    statusLine(
      "Intermediate Voltage Positive",
      `${positiveVoltage.toFixed(1).padStart(5)} V     (allowed range: [  9.5 V, 13.5 V])`,
    ),
    statusLine(
      "Intermediate Voltage Negative",
      "-11.8 V     (allowed range: [-13.5 V, -9.5 V])",
    ),
    statusLine(
      "GPS Voltage",
      " 11.0 V     (allowed range: [  9.5 V, 13.5 V])",
    ),
    statusLine(
      "FPGA Core Voltage",
      "  1.2 V     (allowed range: [  1.0 V,  1.4 V])",
    ),
    statusLine(
      "FPGA Auxiliary Voltage",
      "  2.5 V     (allowed range: [  2.3 V,  2.7 V])",
    ),
    statusLine(
      "DSP-Board Voltage",
      `${dspBoardVoltage.toFixed(1).padStart(5)} V     (allowed range: [  3.1 V,  3.5 V])`,
    ),
    statusLine(
      "DSP-Board Temperature",
      `${dspBoardTemperature.toFixed(1).padStart(5)} deg.C    (allowed range: [-20.0 deg.C, 70.0 deg.C])`,
    ),
    "",
    statusLine(
      "NTP Synchronised",
      profile.gps.ntpEnabled ? yesNo(gpsSynchronized) : "DISABLED",
    ),
    statusLine(
      "Estimated Error of NTP Time",
      "0 us, tolerance 4000 us",
    ),
    "",
    "== Power-On-Self-Test Results == ",
    statusLine("POST Receiver", "YES"),
    statusLine("POST GPS", yesNo(gpsAvailable)),
    statusLine("POST Temperature Sensor", "YES"),
    statusLine("POST Voltage Sensor", "YES"),
    statusLine("POST FPGA", "YES"),
    statusLine("POST Completed", "YES"),
    "",
    "== Continuous-Built-in-Test Results ==",
    statusLine(
      "Last Mode RF Test Message Received",
      "Sat Jul 18 01:33:04 2026",
    ),
    statusLine(
      "Signal Strength of Last RF Test Message (0..255)",
      monitoring?.receiverConfidencePercent ?? 99,
    ),
    statusLine("Time of Last FIFO Overflow", "Thu Jan  1 00:00:30 1970"),
    statusLine("DP Comm Queue Overflow", "<never>"),
    statusLine("Time of Last FPGA Reset (w-dog 1)", "<never>"),
    statusLine(
      "Time of Last FPGA Reload (w-dog 2)",
      "Mon Apr  6 02:36:25 2026",
    ),
    statusLine(
      "Time of Last FPGA Watchdog Signal",
      "Sat Jul 18 01:33:06 2026",
    ),
    statusLine("Time of Last PPS Pulse", "Sat Jul 18 01:33:05 2026"),
    statusLine("Time of Last #GPS Sat > 3", "Sat Jul 18 01:33:06 2026"),
    statusLine("Time of Last syscon Intervention", "<never>"),
    statusLine("Type of Affected Process", 0),
    statusLine("Last DP Restart", "Mon Apr  6 02:36:13 2026"),
    statusLine("Time of Last Target Overflow", "<never>"),
    statusLine("Time of Last Voltage Reading", "Sat Jul 18 01:33:03 2026"),
    statusLine("Time of Last SNMP Request", "Sat Jul 18 01:33:06 2026"),
    statusLine("Time of Last Communications Overload", "<never>"),
    "",
    "== SITEMONITOR Statistics ==",
    statusLine(
      "Time of last Site Monitor Message",
      "Sat Jul 18 01:33:05 2026",
    ),
    statusLine(
      "Signal Strength of Last RF Sitemonitor Message (0..255)",
      207,
    ),
    "",
    "== End-to-End Test Results ==",
    statusLine("End to End Test", "Passed"),
    statusLine("Receiver Sensitivity", "Passed"),
    statusLine("Test Transmission Loss", "Passed"),
    statusLine("Decoder Test", "Passed"),
    statusLine(
      "Last Valid Decoded Mode-S Message",
      "Sat Jul 18 01:33:05 2026",
    ),
    "",
    "== DSP Interface Statistics ==",
    statusLine("Total Read Attempts", 824635966),
    statusLine("Total Messages Read", 2263718400),
    statusLine("Overflows Detected", 1),
    statusLine("Last Second Reads Attempts", 99),
    statusLine("Last Second Messages Read", 375),
    statusLine("Last Second FIFO Overflows", 0),
    "",
    "== Monitoring FIFO Interface Statistics ==",
    statusLine("Total Read Attempts Monitoring FIFO", 1475685),
    statusLine("Total Messages Read Monitoring FIFO", 1862815),
    statusLine("Monitoring FIFO Overflows Detected", 0),
    statusLine(
      "Last Monitoring FIFO msg Received",
      "Sat Jul 18 01:33:05 2026",
    ),
    statusLine("Last GPS System Time Sync", "Sat Jul 18 01:33:06 2026"),
    statusLine("Last PPS FIFO Overflow", "<never>"),
    statusLine("Last Second Messages Read", 2),
    statusLine("Last Second FIFO Overflows", 0),
    "",
    "== MODE-S FIFO Interface Statistics ==",
    statusLine("Total Read Attempts MODE-S FIFO", 823160280),
    statusLine("Total Messages Read MODE-S FIFO", 2261854559),
    statusLine("MODE-S FIFO Overflows Detected", 0),
    statusLine("Last MODE-S Message Received", "Sat Jul 18 01:33:06 2026"),
    statusLine("Last MODE-S FIFO Overflow", "<never>"),
    statusLine("Last Second MODE-S Messages Read", 266),
    statusLine("Last Second MODE-S FIFO Overflows", 0),
    statusLine("Last Second MODE-S Messages Regected", 20),
    "",
    "== MODE-AC FIFO Interface Statistics ==",
    statusLine("Total Read Attempts MODE-AC FIFO", 1),
    statusLine("Total Messages Read MODE-AC FIFO", 1026),
    statusLine("MODE-AC FIFO Overflows Detected", 1),
    statusLine("Last MODE-AC Message Received", "Thu Jan  1 00:00:30 1970"),
    statusLine("Last MODE-AC FIFO Overflow", "Thu Jan  1 00:00:30 1970"),
    statusLine("Last Second MODE-AC Messages Read", 0),
    statusLine("Last Second MODE-AC FIFO Overflows", 0),
    "",
    "== Device Status ==",
    statusLine("Ground Station State", "GO"),
    statusLine("Overall Build-In-Test result", "NO ERROR PENDING"),
    statusLine("UTC Synchronisation State", "UTC COUPLED"),
    "PRESS RETURN TO CONTINUE",
  ].join("\n");
}

function renderDspStats(
  profile: SensorDataProfile,
  monitoring: SensorMonitoringData | undefined,
): string {
  const stats = profile.receiverStats;
  return finish([
    "   Extended Mode-S Statistics:",
    LONG_RULE,
    "   Short Squitter Total:    " + formatNumber(stats.shortSquitter.total),
    "   Short Squitter Passed:   " + formatNumber(stats.shortSquitter.passed),
    "   Short Squitter Failed:   " + formatNumber(stats.shortSquitter.failed),
    "   Extended Squitter Total: " + formatNumber(stats.extendedSquitter.total),
    "   Extended Squitter Pass:  " + formatNumber(stats.extendedSquitter.passed),
    "   Extended Squitter Fail:  " + formatNumber(stats.extendedSquitter.failed),
    "   Total Targets Detected:  " + formatNumber(stats.totalTargetsDetected),
    "   Current Targets:         " + formatNumber(stats.currentTargets),
    "   Receiver Confidence:     " +
      (monitoring
        ? monitoring.receiverConfidencePercent.toFixed(0) + " %"
        : "Unavailable"),
    "   CRC Error Count:         " +
      valueOrUnavailable(monitoring?.crcErrorCount),
  ]);
}

function renderModeAcStats(profile: SensorDataProfile): string {
  const stats = profile.receiverStats;
  const modeAReplies = Math.floor(stats.shortSquitter.passed * 0.18);
  const modeCReplies = Math.floor(stats.shortSquitter.passed * 0.12);
  const acceptedReplies = modeAReplies + modeCReplies;

  return finish([
    "   Extended Mode-AC Statistics:",
    LONG_RULE,
    "   Mode-A Replies Received:  " + formatNumber(modeAReplies),
    "   Mode-C Replies Received:  " + formatNumber(modeCReplies),
    "   Replies Accepted:         " + formatNumber(acceptedReplies),
    "   Replies Rejected:         " +
      formatNumber(stats.shortSquitter.failed),
    "   Current Mode-A/C Targets: " +
      formatNumber(Math.floor(stats.currentTargets * 0.22)),
    "   Receiver Overloads:       0",
    "   Decoder State:            OPERATIONAL",
  ]);
}

function renderLocalSystemLog(
  profile: SensorDataProfile,
  monitoring: SensorMonitoringData | undefined,
): string {
  return finish([
    "   Local System Log:",
    LONG_RULE,
    "   2026-07-23 08:00:01 INFO  Maintenance application started",
    `   2026-07-23 08:00:02 INFO  Sensor ${profile.sensorName} is OPERATIONAL`,
    `   2026-07-23 08:00:03 INFO  Ethernet link ${profile.network.ip} is UP`,
    `   2026-07-23 08:00:04 INFO  GPS status: ${gpsStatus(
      monitoring,
      profile,
    )}`,
    "   2026-07-23 08:00:05 INFO  RF End-to-End test: PASS",
    `   2026-07-23 08:00:06 INFO  Active surveillance clients: ${
      profile.clients.filter((client) => client.enabled).length
    }`,
    "   2026-07-23 08:00:07 INFO  No active system alarms",
  ]);
}

function renderGps(
  profile: SensorDataProfile,
  monitoring: SensorMonitoringData | undefined,
): string {
  return finish([
    "   GPS Status:",
    SHORT_RULE,
    "   Processing:       " + enabled(profile.gps.enabled),
    "   Synchronization:  " + gpsStatus(monitoring, profile),
    "   Latitude:         " + profile.gps.latitude,
    "   Longitude:        " + profile.gps.longitude,
    "   Altitude:         " + profile.gps.altitude,
    "   Deviation:        " + profile.gps.deviation,
    "   NTP Fallback:     " + enabled(profile.gps.ntpEnabled),
    "   NTP Server:       " + profile.gps.ntpServer,
  ]);
}

function renderFilters(profile: SensorDataProfile): string {
  const { filters } = profile;
  return finish([
    "   Target Filter Configuration:",
    SHORT_RULE,
    "   Altitude Filter:  " + enabled(filters.altitudeEnabled),
    "   Altitude Range:   FL" +
      filters.altitudeMin +
      " - FL" +
      filters.altitudeMax,
    "   Address Filter:   " + enabled(filters.addressFilterEnabled),
    "   Address Value:    " + (filters.addressFilter || "Not configured"),
    "   Position Filter:  " + enabled(filters.positionFilterEnabled),
    "   Position Radius:  " + filters.positionFilterRadius + " NM",
  ]);
}

function renderMonitoringDevices(profile: SensorDataProfile): string {
  const rows = profile.siteMonitors.length
    ? profile.siteMonitors.map(
        (monitor, index) =>
          "   " +
          String(index + 1).padStart(2) +
          " " +
          clip(monitor.name, 20).padEnd(20) +
          " " +
          monitor.ip.padEnd(15) +
          " " +
          String(monitor.port).padStart(5) +
          " " +
          yesNo(monitor.enabled).padStart(7),
      )
    : ["   No monitoring devices configured."];

  return finish([
    "   Monitoring Device Configuration:",
    LONG_RULE,
    "   #  Name                 IP               Port Enabled",
    ...rows,
  ]);
}

function fallback(templateId: string, profileAvailable: boolean): string {
  const message = profileAvailable
    ? 'Terminal template "' + templateId + '" is not available.'
    : "Sensor data profile is not available.";
  return finish(["   " + message]);
}

export function renderTemplate(
  templateId: string,
  profile: SensorDataProfile | undefined,
  monitoring?: SensorMonitoringData,
): string {
  if (!profile) return fallback(templateId, false);

  switch (templateId) {
    case "sa-network-display":
      return renderNetwork(profile, "Network Configuration");
    case "sa-software-version":
      return finish([
        "   Software Version Information:",
        SHORT_RULE,
        "   Sensor Version: " + profile.sensorVersion,
        "   Config Version: " + profile.configVersion,
        "   Sensor Name:    " + profile.sensorName,
      ]);
    case "sa-clients-display":
      return renderClientConfiguration(profile);
    case "sa-clients-stats":
      return renderClientStats(profile);
    case "sa-end-to-end-display":
      return renderEndToEndParameters(profile);
    case "sa-snmp-users":
      return renderSnmpUsers(profile);
    case "sa-snmp-traps":
      return renderSnmpTraps(profile);
    case "sa-syslog-config":
      return finish([
        "   System Log Configuration:",
        SHORT_RULE,
        "   Local Destination: " + profile.syslog.localDestination,
        "   Remote Logging:    " + enabled(profile.syslog.remoteEnabled),
        "   Remote Server:     " +
          (profile.syslog.remoteEnabled
            ? profile.syslog.remoteServerIp
            : "Not configured"),
      ]);
    case "ma-network-display":
      return renderNetwork(profile, "Network Configuration (Read-only)");
    case "ma-network-ntp":
      return finish([
        "   NTP Status:",
        SHORT_RULE,
        "   NTP Server:      " + profile.network.ntpServer,
        "   GPS NTP Server:  " + profile.gps.ntpServer,
        "   NTP Processing:  " + enabled(profile.gps.ntpEnabled),
        "   GPS Sync Status: " + gpsStatus(monitoring, profile),
      ]);
    case "ma-network-bitrate":
      return finish([
        "   Network Interface Bit Rate:",
        SHORT_RULE,
        "   Physical Interface: eth0",
        "   Negotiated Rate:    " + profile.network.bitRate,
        "   Link Status:        UP",
      ]);
    case "ma-system-config":
      return renderSystemConfig(profile);
    case "ma-system-status":
      return renderSystemStatus(profile, monitoring);
    case "ma-dsp-stats":
      return renderDspStats(profile, monitoring);
    case "ma-mode-ac-stats":
      return renderModeAcStats(profile);
    case "ma-local-system-log":
      return renderLocalSystemLog(profile, monitoring);
    case "ma-gps-status":
      return renderGps(profile, monitoring);
    case "ma-filter-display":
      return renderFilters(profile);
    case "ma-clients-display":
      return renderClientConfiguration(profile);
    case "ma-monitoring-display":
      return renderMonitoringDevices(profile);
    default:
      return fallback(templateId, true);
  }
}
