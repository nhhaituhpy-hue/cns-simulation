import {
  DVOR220_MONITOR_CHANNEL_IDS,
  DVOR220_MONITOR_PARAMETERS,
  DVOR220_TRANSMITTER_IDS,
  type Dvor220AlarmBand,
  type Dvor220Configuration,
  type Dvor220ValidationIssue,
} from "./types";

function issue(
  issues: Dvor220ValidationIssue[],
  path: string,
  severity: Dvor220ValidationIssue["severity"],
  message: string,
) {
  issues.push({ path, severity, message });
}

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function validateBand(
  issues: Dvor220ValidationIssue[],
  path: string,
  value: Dvor220AlarmBand,
) {
  const ordered = [value.lowerAlarm, value.lowerWarning, value.nominal, value.upperWarning, value.upperAlarm]
    .filter((item): item is number => item !== null);
  if (ordered.some((item) => !Number.isFinite(item))) {
    issue(issues, path, "error", "Alarm limits must be finite numbers.");
    return;
  }
  if (ordered.some((item, index) => index > 0 && item < ordered[index - 1])) {
    issue(issues, path, "error", "Limits must be ordered from lower alarm to upper alarm.");
  }
  if ((value.lowerAlarm === null) !== (value.lowerWarning === null)) {
    issue(issues, path, "error", "Lower alarm and lower warning must either both be set or both be disabled.");
  }
  if ((value.upperAlarm === null) !== (value.upperWarning === null)) {
    issue(issues, path, "error", "Upper alarm and upper warning must either both be set or both be disabled.");
  }
}

function validIp(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const parsed = Number(part);
    return parsed >= 0 && parsed <= 255;
  });
}

export function validateDvor220Configuration(
  configuration: Dvor220Configuration,
): Dvor220ValidationIssue[] {
  const issues: Dvor220ValidationIssue[] = [];
  const { station } = configuration;

  if (station.stationName.length > 31) {
    issue(issues, "station.stationName", "error", "Station name is limited to 31 characters.");
  }
  if (!inRange(station.frequencyMHz, 108, 117.95)) {
    issue(issues, "station.frequencyMHz", "error", "Frequency must be between 108.000 and 117.950 MHz.");
  } else {
    const channel = (station.frequencyMHz - 108) / 0.05;
    if (Math.abs(channel - Math.round(channel)) > 1e-7) {
      issue(issues, "station.frequencyMHz", "error", "Frequency must use 50 kHz channel spacing.");
    }
  }
  if (!inRange(station.carrierPowerW, 0, 150)) {
    issue(issues, "station.carrierPowerW", "error", "Carrier power must be between 0 and 150 W.");
  } else if (!inRange(station.carrierPowerW, 25, 125)) {
    issue(issues, "station.carrierPowerW", "warning", "Value is outside the specified 25-125 W operating range.");
  }
  if (!inRange(station.am30HzPercent, 0, 40)) {
    issue(issues, "station.am30HzPercent", "error", "30 Hz AM must be between 0 and 40%.");
  }
  if (!inRange(station.identModulationPercent, 0, 20)) {
    issue(issues, "station.identModulationPercent", "error", "IDENT modulation must be between 0 and 20%.");
  }
  if (!inRange(station.voiceModulationPercent, 0, 40)) {
    issue(issues, "station.voiceModulationPercent", "error", "Voice modulation must be between 0 and 40%.");
  }
  if (!inRange(station.azimuthOffsetDeg, -40, 40)) {
    issue(issues, "station.azimuthOffsetDeg", "error", "Azimuth offset must be between -40 and +40 degrees.");
  }
  if (!/^[A-Za-z0-9]{1,4}$/.test(station.identCode)) {
    issue(issues, "station.identCode", "error", "IDENT code must contain 1-4 alphanumeric characters.");
  }

  for (const transmitterId of DVOR220_TRANSMITTER_IDS) {
    const transmitter = configuration.transmitters[transmitterId];
    if (!inRange(transmitter.carrierScalePercent, 0, 100)) {
      issue(issues, `transmitters.${transmitterId}.carrierScalePercent`, "error", "Carrier scale must be between 0 and 100%.");
    }
    for (const [output, value] of Object.entries(transmitter.sidebandPowerW)) {
      if (!inRange(value, 0, 5)) {
        issue(issues, `transmitters.${transmitterId}.sidebandPowerW.${output}`, "error", "Sideband power must be between 0 and 5 W.");
      }
    }
    for (const [groupName, group] of Object.entries({ rfPhaseDeg: transmitter.rfPhaseDeg, standbyRfPhaseDeg: transmitter.standbyRfPhaseDeg })) {
      for (const [name, value] of Object.entries(group)) {
        if (!inRange(value, 0, 359.9)) {
          issue(issues, `transmitters.${transmitterId}.${groupName}.${name}`, "error", "RF phase must be between 0 and 359.9 degrees.");
        }
      }
    }
    const thermal = configuration.thermal[transmitterId];
    const thermalThresholds: [string, number][] = [
      ["fanStartC", thermal.fanStartC],
      ["fanStopC", thermal.fanStopC],
      ["cmaShutdownC", thermal.shutdownC.cma],
      ["usbShutdownC", thermal.shutdownC.usb],
      ["lsbShutdownC", thermal.shutdownC.lsb],
      ["cmaRestartC", thermal.restartC.cma],
      ["usbRestartC", thermal.restartC.usb],
      ["lsbRestartC", thermal.restartC.lsb],
    ];
    for (const [name, value] of thermalThresholds) {
      if (!inRange(value, -100, 200)) {
        issue(issues, `thermal.${transmitterId}.${name}`, "error", "Thermal thresholds must be between -100 and 200 °C.");
      }
    }
    if (thermal.fanStopC > thermal.fanStartC) {
      issue(issues, `thermal.${transmitterId}`, "error", "Fan stop temperature must not exceed fan start temperature.");
    }
    for (const unit of ["cma", "usb", "lsb"] as const) {
      if (thermal.restartC[unit] >= thermal.shutdownC[unit]) {
        issue(issues, `thermal.${transmitterId}.${unit}`, "error", "Thermal restart must be below shutdown temperature.");
      }
    }
  }

  validateBand(issues, "transmitterLimits.carrierPower", configuration.transmitterLimits.carrierPower);
  validateBand(issues, "transmitterLimits.sidebandPower", configuration.transmitterLimits.sidebandPower);
  if (
    !Number.isFinite(configuration.transmitterLimits.vswrUpperWarning) ||
    !Number.isFinite(configuration.transmitterLimits.vswrUpperAlarm) ||
    configuration.transmitterLimits.vswrUpperWarning < 1 ||
    configuration.transmitterLimits.vswrUpperAlarm < 1
  ) {
    issue(issues, "transmitterLimits.vswr", "error", "VSWR limits must be finite values of at least 1.0.");
  } else if (configuration.transmitterLimits.vswrUpperWarning > configuration.transmitterLimits.vswrUpperAlarm) {
    issue(issues, "transmitterLimits.vswr", "error", "VSWR warning limit must not exceed the alarm limit.");
  }

  const monitor = configuration.monitor;
  if (!inRange(monitor.executiveAlarmDelayMs, 200, 51_000)) {
    issue(issues, "monitor.executiveAlarmDelayMs", "error", "Executive alarm delay must be between 0.2 and 51 seconds.");
  } else if (monitor.executiveAlarmDelayMs > 10_000) {
    issue(issues, "monitor.executiveAlarmDelayMs", "warning", "Delay exceeds the 10 second technical-specification hold-off range.");
  }
  if (!inRange(monitor.postChangeoverHoldoffMs, 0, 100_000)) {
    issue(issues, "monitor.postChangeoverHoldoffMs", "error", "Post-changeover holdoff must be between 0 and 100 seconds.");
  }
  if (!inRange(monitor.powerOnHoldoffMs, 0, 100_000)) {
    issue(issues, "monitor.powerOnHoldoffMs", "error", "Power-on holdoff must be between 0 and 100 seconds.");
  }
  if (!Number.isInteger(monitor.measurementAverageCount) || !inRange(monitor.measurementAverageCount, 2, 10)) {
    issue(issues, "monitor.measurementAverageCount", "error", "Measurement average count must be an integer from 2 to 10.");
  }
  if (!inRange(monitor.warningRangePercent, 0, 100)) {
    issue(issues, "monitor.warningRangePercent", "error", "Warning range must be between 0 and 100%.");
  }
  if (!inRange(monitor.identCodeAlarmDelayMs, 0, 100_000)) {
    issue(issues, "monitor.identCodeAlarmDelayMs", "error", "IDENT code alarm delay must be between 0 and 100 seconds.");
  }
  for (const channelId of DVOR220_MONITOR_CHANNEL_IDS) {
    const channel = monitor.channels[channelId];
    if (!inRange(channel.referenceAzimuthDeg, -40, 40)) {
      issue(issues, `monitor.channels.${channelId}.referenceAzimuthDeg`, "error", "Reference azimuth must be between -40 and +40 degrees.");
    }
    for (const parameter of DVOR220_MONITOR_PARAMETERS) {
      validateBand(issues, `monitor.channels.${channelId}.limits.${parameter}`, channel.limits[parameter]);
    }
  }

  if (!inRange(configuration.system.automaticLogoutMinutes, 0, 1440)) {
    issue(issues, "system.automaticLogoutMinutes", "error", "Automatic logout must be between 0 and 1440 minutes.");
  }
  if (!inRange(configuration.system.controlFaultShutdownDelayMs, 0, 30_000)) {
    issue(issues, "system.controlFaultShutdownDelayMs", "error", "Control-fault shutdown delay must be between 0 and 30 seconds.");
  }
  if (!inRange(configuration.communication.remoteConnectionLimit, 0, 16)) {
    issue(issues, "communication.remoteConnectionLimit", "error", "Remote connection limit must be between 0 and 16.");
  }
  if (!inRange(configuration.communication.localConnectionLimit, 0, 16)) {
    issue(issues, "communication.localConnectionLimit", "error", "Local connection limit must be between 0 and 16.");
  }
  if (!validIp(configuration.communication.localIpStart)) {
    issue(issues, "communication.localIpStart", "error", "Local IP range start is not a valid IPv4 address.");
  }
  if (!validIp(configuration.communication.localIpEnd)) {
    issue(issues, "communication.localIpEnd", "error", "Local IP range end is not a valid IPv4 address.");
  }

  const battery = configuration.battery;
  if (!inRange(battery.cutoffVoltageV, 19, 24)) {
    issue(issues, "battery.cutoffVoltageV", "error", "Battery cutoff voltage must be between 19 and 24 V.");
  }
  if (!inRange(battery.chargingCurrentA, 10, 30)) {
    issue(issues, "battery.chargingCurrentA", "error", "Battery charging current must be between 10 and 30 A.");
  }
  if (battery.voltageAlarmV > battery.voltageWarningV) {
    issue(issues, "battery.voltageAlert", "error", "Low-voltage alarm must not exceed the warning threshold.");
  }
  if (battery.temperatureWarningC > battery.temperatureAlarmC) {
    issue(issues, "battery.temperatureAlert", "error", "Temperature warning must not exceed the alarm threshold.");
  }
  if (!Number.isFinite(battery.backupRuntimeMinutes) || battery.backupRuntimeMinutes <= 0) {
    issue(issues, "battery.backupRuntimeMinutes", "error", "Backup runtime must be greater than zero.");
  }

  return issues;
}

export function hasDvor220ConfigurationErrors(configuration: Dvor220Configuration): boolean {
  return validateDvor220Configuration(configuration).some((item) => item.severity === "error");
}
