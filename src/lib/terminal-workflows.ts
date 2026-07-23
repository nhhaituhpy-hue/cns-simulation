import type { WorkflowStep } from "./menu-data/menu-types";
import type { NetworkConfig, SensorDataProfile } from "./types";

const RULE = "*".repeat(74);

export interface TerminalWorkflowRuntime {
  operationMode: "OPERATIONAL" | "MAINTENANCE";
  alertPower: number;
  failurePower: number;
  pendingNetwork: Pick<NetworkConfig, "ip" | "subnet" | "gateway"> | null;
}

export interface WorkflowValidationResult {
  valid: boolean;
  message?: string;
}

function resultScreen(title: string, lines: readonly string[]): string {
  return [
    RULE,
    title.padStart(Math.floor((74 + title.length) / 2)),
    RULE,
    "",
    ...lines,
    "",
    RULE,
    "PRESS RETURN TO CONTINUE",
  ].join("\n");
}

function effectiveNetwork(
  profile: SensorDataProfile | undefined,
  runtime: TerminalWorkflowRuntime,
): Pick<NetworkConfig, "ip" | "subnet" | "gateway"> | undefined {
  return runtime.pendingNetwork ?? profile?.network;
}

function networkSettingsLines(
  profile: SensorDataProfile | undefined,
  runtime: TerminalWorkflowRuntime,
  confirmation: "CONFIRMED" | "UNCONFIRMED",
): string[] {
  const network = effectiveNetwork(profile, runtime);
  const dhcpEnabled = runtime.pendingNetwork
    ? false
    : (profile?.network.dhcp ?? false);

  return [
    "Configured Settings ->",
    "",
    "Network Settings",
    `Confirmation       : ${confirmation}`,
    "",
    `DHCP               : ${dhcpEnabled ? "ENABLED" : "DISABLED"}`,
    `IP Address         : ${network?.ip ?? "Unknown"}`,
    `NetMask            : ${network?.subnet ?? "Unknown"}`,
    "Interface Speed    : AutoAllSupport",
    "",
    "IP Routing  1      : <unconfigured>",
    `IP Routing  2      : Default gateway ${network?.gateway ?? "Unknown"}`,
    "IP Routing  3      : <unconfigured>",
    "IP Routing  4      : <unconfigured>",
    "IP Routing  5      : <unconfigured>",
    "IP Routing  6      : <unconfigured>",
    "IP Routing  7      : <unconfigured>",
    "IP Routing  8      : <unconfigured>",
    "IP Routing  9      : <unconfigured>",
    "IP Routing 10      : <unconfigured>",
  ];
}

function networkSettingsResult(
  title: string,
  profile: SensorDataProfile | undefined,
  runtime: TerminalWorkflowRuntime,
  confirmation: "CONFIRMED" | "UNCONFIRMED",
  message: string,
): string {
  return [
    title,
    "",
    ...networkSettingsLines(profile, runtime, confirmation),
    "",
    message,
    "PRESS RETURN TO CONTINUE",
  ].join("\n");
}

export function renderGenericSettingResult(
  settingLabel: string,
  valueLabel?: string,
): string {
  return resultScreen("CONFIGURATION RESULT", [
    `Setting              : ${settingLabel}`,
    ...(valueLabel ? [`Selected Value       : ${valueLabel}`] : []),
    "Operation Status     : SUCCESS",
    "",
    "The simulator accepted the requested change.",
  ]);
}

function isIpv4(value: string): boolean {
  const octets = value.split(".");
  return (
    octets.length === 4 &&
    octets.every((octet) => {
      if (!/^\d{1,3}$/.test(octet)) {
        return false;
      }
      const number = Number(octet);
      return number >= 0 && number <= 255 && String(number) === octet;
    })
  );
}

export function validateWorkflowValue(
  step: WorkflowStep,
  value: string,
): WorkflowValidationResult {
  if (!value) {
    return { valid: false, message: "A value is required." };
  }

  if (step.kind === "choice") {
    const validOption = step.options?.some(
      (option) => String(option.number) === value,
    );
    return validOption
      ? { valid: true }
      : { valid: false, message: "Invalid setting selection." };
  }

  if (step.validation === "ipv4" && !isIpv4(value)) {
    return {
      valid: false,
      message: "Invalid IPv4 address. Enter four octets from 0 to 255.",
    };
  }

  if (step.validation === "integer") {
    if (!/^-?\d+$/.test(value)) {
      return { valid: false, message: "Enter a whole number." };
    }

    const number = Number(value);
    if (step.min !== undefined && number < step.min) {
      return { valid: false, message: `Minimum value is ${step.min}.` };
    }
    if (step.max !== undefined && number > step.max) {
      return { valid: false, message: `Maximum value is ${step.max}.` };
    }
  }

  return { valid: true };
}

export function workflowValue(
  step: WorkflowStep,
  rawInput: string,
): string {
  const trimmed = rawInput.trim();
  if (step.kind !== "choice") {
    return trimmed;
  }

  return (
    step.options?.find((option) => String(option.number) === trimmed)?.value ??
    trimmed
  );
}

export function renderWorkflowStep(
  step: WorkflowStep,
  runtime?: TerminalWorkflowRuntime,
  profile?: SensorDataProfile,
): string {
  const operationMode = runtime?.operationMode ?? "OPERATIONAL";
  const alternateOperationMode =
    operationMode === "OPERATIONAL" ? "MAINTENANCE" : "OPERATIONAL";
  const network = runtime
    ? effectiveNetwork(profile, runtime)
    : profile?.network;
  const networkConfirmation = runtime?.pendingNetwork
    ? "UNCONFIRMED"
    : "CONFIRMED";
  const dhcpEnabled = runtime?.pendingNetwork
    ? false
    : (profile?.network.dhcp ?? false);
  const renderText = (value: string): string =>
    value
      .replaceAll("{{operationMode}}", operationMode)
      .replaceAll("{{alternateOperationMode}}", alternateOperationMode)
      .replaceAll("{{networkConfirmation}}", networkConfirmation)
      .replaceAll("{{dhcpStatus}}", dhcpEnabled ? "ENABLED" : "DISABLED")
      .replaceAll("{{networkIp}}", network?.ip ?? "Unknown")
      .replaceAll("{{networkSubnet}}", network?.subnet ?? "Unknown")
      .replaceAll("{{networkGateway}}", network?.gateway ?? "Unknown")
      .replaceAll(
        "{{sensorName}}",
        profile?.sensorName ?? "Quadrant ADS-B sensor",
      )
      .replaceAll("{{sac}}", String(profile?.asterix.sac ?? "Unknown"))
      .replaceAll("{{sic}}", String(profile?.asterix.sic ?? "Unknown"));

  if (step.kind !== "choice") {
    return renderText(step.prompt);
  }

  const optionLine = (number: number, label: string): string =>
    step.optionStyle === "compact"
      ? `(${number}) ${renderText(label)}`
      : `(${String(number).padStart(3, " ")})    ${renderText(label)}`;

  return [
    renderText(step.prompt),
    ...(step.options ?? []).map((option) =>
      optionLine(option.number, option.label),
    ),
    ...(step.showCancel === false ? [] : [optionLine(0, "Cancel")]),
  ].join("\n");
}

function updateClient(
  profile: SensorDataProfile | undefined,
  values: Readonly<Record<string, string>>,
): void {
  if (!profile) {
    return;
  }

  const id = Number(values.row);
  const current = profile.clients.find((client) => client.id === id);
  const next = {
    id,
    name: values.name,
    ip: values.ip,
    port: Number(values.port),
    protocol: values.protocol === "TCP" ? ("TCP" as const) : ("UDP" as const),
    messageType:
      values.messageType === "BOTH"
        ? "ASTERIX CAT21 ADS-B + Non-OP"
        : values.messageType,
    enabled: true,
    messagesSent: current?.messagesSent ?? 0,
  };

  const index = profile.clients.findIndex((client) => client.id === id);
  if (index >= 0) {
    profile.clients[index] = next;
  } else {
    profile.clients.push(next);
    profile.clients.sort((left, right) => left.id - right.id);
  }
}

export function completeWorkflow(
  workflowId: string,
  values: Readonly<Record<string, string>>,
  profile: SensorDataProfile | undefined,
  runtime: TerminalWorkflowRuntime,
): string {
  switch (workflowId) {
    case "sa.operation-mode": {
      const changed = values.mode === "TOGGLE";
      if (changed) {
        runtime.operationMode =
          runtime.operationMode === "OPERATIONAL"
            ? "MAINTENANCE"
            : "OPERATIONAL";
      }
      if (profile) {
        profile.operationMode = runtime.operationMode;
      }
      return [
        `Actual Sensor Operating Mode: "${runtime.operationMode}"`,
        "PRESS RETURN TO CONTINUE",
      ].join("\n");
    }

    case "sa.manual-network": {
      if (values.action !== "CONFIGURE") {
        return networkSettingsResult(
          "NETWORK SETTINGS FOR ADS-B QUADRANT",
          profile,
          runtime,
          runtime.pendingNetwork ? "UNCONFIRMED" : "CONFIRMED",
          "Network settings remain unchanged.",
        );
      }
      runtime.pendingNetwork = {
        ip: values.ip,
        subnet: values.subnet,
        gateway: values.gateway,
      };
      if (profile) profile.network.dhcp = false;
      return networkSettingsResult(
        "NETWORK SETTINGS FOR ADS-B QUADRANT",
        profile,
        runtime,
        "UNCONFIRMED",
        `Reconnect using sysadmin@${values.ip} and confirm the changed network settings.`,
      );
    }

    case "sa.confirm-network": {
      if (values.confirm === "CONFIRM" && runtime.pendingNetwork && profile) {
        Object.assign(profile.network, runtime.pendingNetwork);
      }
      if (values.confirm === "CONFIRM") {
        runtime.pendingNetwork = null;
      }
      return networkSettingsResult(
        "CONFIRMATION OF MANUAL NETWORK SETTINGS",
        profile,
        runtime,
        values.confirm === "CONFIRM" ? "CONFIRMED" : "UNCONFIRMED",
        values.confirm === "CONFIRM"
          ? "Current settings are confirmed."
          : "Network settings were left unconfirmed.",
      );
    }

    case "sa.sensor-name": {
      const oldName = profile?.sensorName ?? "Quadrant ADS-B sensor";
      if (values.action === "SET" && profile) {
        profile.sensorName = values.name;
      }
      const newName =
        values.action === "SET" ? values.name : profile?.sensorName ?? oldName;
      return resultScreen("SENSOR NAME CONFIGURATION", [
        `Previous Sensor Name : ${oldName}`,
        `New Sensor Name      : ${newName}`,
        "",
        values.action === "SET"
          ? "Sensor name has been changed successfully."
          : "Sensor name remains unchanged.",
      ]);
    }

    case "ma.sac":
    case "ma.sic": {
      const field = workflowId === "ma.sac" ? "SAC" : "SIC";
      const oldValue =
        workflowId === "ma.sac" ? profile?.asterix.sac : profile?.asterix.sic;
      const newValue = Number(values.value);
      if (profile) {
        if (workflowId === "ma.sac") {
          profile.asterix.sac = newValue;
        } else {
          profile.asterix.sic = newValue;
        }
      }
      return resultScreen(`ASTERIX ${field} CONFIGURATION`, [
        `Previous value for ${field} : ${oldValue ?? "Unknown"}`,
        `New value for ${field}      : ${newValue}`,
        "",
        `${field} configuration has been updated successfully.`,
        `Current SAC/SIC       : ${profile?.asterix.sac ?? "Unknown"} / ${profile?.asterix.sic ?? "Unknown"}`,
      ]);
    }

    case "sa.client-config": {
      updateClient(profile, values);
      return resultScreen("SURVEILLANCE CLIENT CONFIGURATION", [
        `Client Number       : ${values.row}`,
        `Client Name         : ${values.name}`,
        `Client Type         : ${values.protocol}`,
        `Message Type        : ${values.messageType}`,
        `Destination Address : ${values.ip}`,
        `Destination Port    : ${values.port}`,
        `Client State        : ENABLED`,
        "",
        "Client configuration has been updated successfully.",
      ]);
    }

    case "sa.export-config":
      if (values.action !== "CONTINUE") {
        return resultScreen("EXPORT SYSTEM CONFIGURATION", [
          "Configuration export was cancelled.",
          "No file was transferred.",
        ]);
      }
      return resultScreen("EXPORT SYSTEM CONFIGURATION", [
        "Export of current system configuration completed.",
        "",
        `Remote Filename     : ${values.filename}`,
        `Remote IP Address   : ${values.remoteIp}`,
        `Remote Directory    : ${values.directory}`,
        `Transfer Status     : SUCCESS`,
      ]);

    case "sa.e2e-thresholds": {
      const oldAlert = runtime.alertPower;
      const oldFailure = runtime.failurePower;
      if (values.action !== "SET") {
        return resultScreen("END-TO-END POWER LEVEL THRESHOLDS", [
          `Alert Power Level    : ${oldAlert}`,
          `Failure Power Level  : ${oldFailure}`,
          "",
          "Power level thresholds remain unchanged.",
        ]);
      }
      runtime.alertPower = Number(values.alert);
      runtime.failurePower = Number(values.failure);
      if (profile) {
        profile.endToEnd = {
          alertPower: runtime.alertPower,
          failurePower: runtime.failurePower,
          interrogationPeriodMs: profile.endToEnd?.interrogationPeriodMs ?? 1000,
          replyDelayNs: profile.endToEnd?.replyDelayNs ?? 500,
        };
      }
      return resultScreen("END-TO-END POWER LEVEL THRESHOLDS", [
        `Previous Alert Power Level    : ${oldAlert}`,
        `Previous Failure Power Level  : ${oldFailure}`,
        "",
        `New Alert Power Level         : ${runtime.alertPower}`,
        `New Failure Power Level       : ${runtime.failurePower}`,
        "",
        "End-to-End thresholds have been updated successfully.",
      ]);
    }

    case "ma.sensor-position": {
      if (values.source === "MANUAL" && profile) {
        profile.gps.latitude = values.latitude;
        profile.gps.longitude = values.longitude;
        profile.gps.altitude = values.altitude;
      }
      const latitude = profile?.gps.latitude ?? "Unknown";
      const longitude = profile?.gps.longitude ?? "Unknown";
      const altitude = profile?.gps.altitude ?? "Unknown";
      return resultScreen("SENSOR POSITION CONFIGURATION", [
        `Position Source      : ${values.source}`,
        `Position Type        : ${values.gpsPosition ?? "MANUAL ENTRY"}`,
        "",
        `Latitude             : ${latitude}`,
        `Longitude            : ${longitude}`,
        `Altitude             : ${altitude}`,
        `Position Deviation   : ${profile?.gps.deviation ?? "Unknown"}`,
        "",
        values.source === "GPS"
          ? "The selected GPS position is now the configured sensor position."
          : "The manually entered position is now the configured sensor position.",
      ]);
    }

    case "ma.reset-dsp-statistics": {
      if (values.action !== "RESET") {
        return resultScreen("RESET EXTENDED DSP STATISTICS", [
          "Extended DSP statistics were not changed.",
          "",
          "Operation Status     : CANCELLED",
        ]);
      }

      if (profile) {
        profile.receiverStats = {
          shortSquitter: { total: 0, passed: 0, failed: 0 },
          extendedSquitter: { total: 0, passed: 0, failed: 0 },
          totalTargetsDetected: 0,
          currentTargets: 0,
        };
      }

      return resultScreen("RESET EXTENDED DSP STATISTICS", [
        "Mode-S statistics     : RESET",
        "Mode-A/C statistics   : RESET",
        "Receiver counters     : 0",
        "",
        "Operation Status      : SUCCESS",
        "All extended DSP statistics were reset successfully.",
      ]);
    }

    case "ma.export-local-system-log":
    case "ma.export-system-status": {
      const exportLabel =
        workflowId === "ma.export-local-system-log"
          ? "ENTIRE LOCAL SYSTEM LOG"
          : "SYSTEM STATUS INFORMATION";

      if (values.action !== "CONTINUE") {
        return resultScreen(`EXPORT ${exportLabel}`, [
          "Export operation was cancelled.",
          "No file was transferred.",
          "",
          "Transfer Status     : CANCELLED",
        ]);
      }

      return resultScreen(`EXPORT ${exportLabel}`, [
        `Remote Filename     : ${values.filename}`,
        `Remote IP Address   : ${values.remoteIp}`,
        `Remote Directory    : ${values.directory}`,
        "Transfer Protocol   : SCP",
        "",
        "Preparing export package ........ DONE",
        "Opening remote connection ........ DONE",
        "Transferring file ................ DONE",
        "",
        "Transfer Status     : SUCCESS",
      ]);
    }

    case "reset-ssh-hosts":
      return resultScreen("RESET SSH KNOWN HOSTS", [
        values.confirm === "RESET"
          ? "SSH known-host records have been reset successfully."
          : "SSH known-host records were not changed.",
        "",
        "A subsequent SSH connection may request host-key confirmation.",
      ]);

    default:
      return resultScreen("CONFIGURATION RESULT", [
        `Workflow "${workflowId}" completed successfully.`,
      ]);
  }
}

export function renderDynamicTerminalContent(
  content: string,
  profile: SensorDataProfile | undefined,
  runtime: TerminalWorkflowRuntime,
): string {
  const replacements: Record<string, string> = {
    "{{sensorName}}": profile?.sensorName ?? "Quadrant ADS-B sensor",
    "{{operationMode}}": runtime.operationMode,
    "{{alertPower}}": String(runtime.alertPower),
    "{{failurePower}}": String(runtime.failurePower),
    "{{sac}}": String(profile?.asterix.sac ?? "Unknown"),
    "{{sic}}": String(profile?.asterix.sic ?? "Unknown"),
  };

  return Object.entries(replacements).reduce(
    (rendered, [token, value]) => rendered.replaceAll(token, value),
    content,
  );
}
