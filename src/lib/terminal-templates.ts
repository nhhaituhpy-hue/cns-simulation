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
  "sa-snmp-users",
  "sa-snmp-traps",
  "sa-syslog-config",
  "ma-network-display",
  "ma-network-ntp",
  "ma-network-bitrate",
  "ma-system-config",
  "ma-system-status",
  "ma-dsp-stats",
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

function clientRow(client: SurveillanceClient): string {
  return [
    String(client.id).padStart(2),
    clip(client.name, 10).padEnd(10),
    client.ip.padEnd(15),
    String(client.port).padStart(5),
    client.protocol.padEnd(5),
    clip(client.messageType, 18).padEnd(18),
    yesNo(client.enabled).padStart(7),
  ].join(" ");
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

function renderClients(profile: SensorDataProfile, title: string): string {
  const rows = profile.clients.length
    ? profile.clients.map(clientRow).map((row) => "   " + row)
    : ["   No surveillance clients configured."];

  return finish([
    "   " + title + ":",
    LONG_RULE,
    "   #  Name       IP               Port Proto Type               Enabled",
    ...rows,
    LONG_RULE,
    "   Total: " + profile.clients.length + " clients configured",
  ]);
}

function renderClientStats(profile: SensorDataProfile): string {
  const rows = profile.clients.length
    ? profile.clients.map((client) =>
        [
          "  ",
          String(client.id).padStart(2),
          clip(client.name, 16).padEnd(16),
          formatNumber(client.messagesSent).padStart(18),
          client.enabled ? "ACTIVE" : "DISABLED",
        ].join(" "),
      )
    : ["   No client statistics available."];

  return finish([
    "   Surveillance Client Statistics:",
    LONG_RULE,
    "   #  Name                  Messages Sent Status",
    ...rows,
    LONG_RULE,
  ]);
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
  return finish([
    "   System Configuration Summary:",
    LONG_RULE,
    "   Sensor Name:       " + profile.sensorName,
    "   Sensor Version:    " + profile.sensorVersion,
    "   Config Version:    " + profile.configVersion,
    "   Network:           " +
      profile.network.ip +
      " / " +
      profile.network.subnet,
    "   Gateway:           " + profile.network.gateway,
    "   NTP Server:        " + profile.network.ntpServer,
    "   GPS Processing:    " + enabled(profile.gps.enabled),
    "   ASTERIX CAT21:     " + enabled(profile.asterix.cat21Enabled),
    "   SAC / SIC:         " +
      profile.asterix.sac +
      " / " +
      profile.asterix.sic,
    "   CAT21 Version:     " + profile.asterix.cat21Version,
    "   CRC Correction:    " + enabled(profile.general.crcCorrection),
    "   Ground Targets:    " + enabled(profile.general.groundTargets),
    "   Client Count:      " + profile.clients.length,
    "   Site Monitors:     " + profile.siteMonitors.length,
  ]);
}

function renderSystemStatus(
  profile: SensorDataProfile,
  monitoring: SensorMonitoringData | undefined,
): string {
  return finish([
    "   System Status:",
    SHORT_RULE,
    "   Temperature:     " +
      (monitoring
        ? monitoring.temperatureC.toFixed(1) + " \u00b0C"
        : "Unavailable"),
    "   CPU Load:        " +
      (monitoring
        ? monitoring.cpuLoadPercent.toFixed(0) + " %"
        : "Unavailable"),
    "   Voltage 3.3V:    " +
      (monitoring
        ? monitoring.voltages.v3_3.toFixed(2) + " V"
        : "Unavailable"),
    "   Voltage 5.0V:    " +
      (monitoring
        ? monitoring.voltages.v5.toFixed(2) + " V"
        : "Unavailable"),
    "   Voltage 12.0V:   " +
      (monitoring
        ? monitoring.voltages.v12.toFixed(2) + " V"
        : "Unavailable"),
    "   GPS Status:      " + gpsStatus(monitoring, profile),
    "   GPS Deviation:   " + profile.gps.deviation,
    "   Uptime:          142d 07h 23m",
  ]);
}

function renderDspStats(
  profile: SensorDataProfile,
  monitoring: SensorMonitoringData | undefined,
): string {
  const stats = profile.receiverStats;
  return finish([
    "   Extended DSP Statistics:",
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
      return renderClients(profile, "Surveillance Clients");
    case "sa-clients-stats":
      return renderClientStats(profile);
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
    case "ma-gps-status":
      return renderGps(profile, monitoring);
    case "ma-filter-display":
      return renderFilters(profile);
    case "ma-clients-display":
      return renderClients(profile, "Surveillance Client Configuration");
    case "ma-monitoring-display":
      return renderMonitoringDevices(profile);
    default:
      return fallback(templateId, true);
  }
}
