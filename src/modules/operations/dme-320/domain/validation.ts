import { isDme320Channel } from "./channel-allocation";
import type {
  Dme320Config,
  Dme320MonitorParameter,
  Dme320SecurityAccount,
} from "./types";

export interface Dme320ValidationIssue {
  path: string;
  message: string;
}

function finiteRange(
  issues: Dme320ValidationIssue[],
  path: string,
  value: number,
  minimum: number,
  maximum: number,
): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    issues.push({ path, message: `Must be between ${minimum} and ${maximum}.` });
  }
}

function integerRange(
  issues: Dme320ValidationIssue[],
  path: string,
  value: number,
  minimum: number,
  maximum: number,
): void {
  finiteRange(issues, path, value, minimum, maximum);
  if (!Number.isInteger(value)) {
    issues.push({ path, message: "Must be an integer." });
  }
}

function validIpv4(value: string): boolean {
  const parts = value.split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => {
      if (!/^\d{1,3}$/.test(part)) return false;
      const octet = Number(part);
      return octet >= 0 && octet <= 255;
    })
  );
}

function booleanArrayLength(
  issues: Dme320ValidationIssue[],
  path: string,
  value: boolean[],
  expectedLength: number,
): void {
  if (
    !Array.isArray(value) ||
    value.length !== expectedLength ||
    value.some((item) => typeof item !== "boolean")
  ) {
    issues.push({
      path,
      message: `Must contain exactly ${expectedLength} boolean values.`,
    });
  }
}

export function validateDme320Account(
  account: Dme320SecurityAccount,
): Dme320ValidationIssue[] {
  const issues: Dme320ValidationIssue[] = [];
  if (!/^[a-z0-9]{1,16}$/i.test(account.userId)) {
    issues.push({
      path: "userId",
      message: "User ID must contain 1-16 alphanumeric characters.",
    });
  }
  if (account.password.length < 1 || account.password.length > 16) {
    issues.push({ path: "password", message: "Password must contain 1-16 characters." });
  }
  if (![1, 2, 3].includes(account.level)) {
    issues.push({ path: "level", message: "Account level must be 1, 2, or 3." });
  }
  return issues;
}

export function validateDme320Config(config: Dme320Config): Dme320ValidationIssue[] {
  const issues: Dme320ValidationIssue[] = [];
  const station = config.station;

  if (station.stationName.length > 31) {
    issues.push({ path: "station.stationName", message: "Station name is limited to 31 characters." });
  }
  if (station.runwayDesignator.length > 3) {
    issues.push({ path: "station.runwayDesignator", message: "Runway designator is limited to 3 characters." });
  }
  if (!isDme320Channel(station.channel)) {
    issues.push({ path: "station.channel", message: "Channel must be 1X-126X or 1Y-126Y." });
  }
  finiteRange(issues, "station.powerOutputWatts", station.powerOutputWatts, 0, 1_250);
  finiteRange(issues, "station.delayOffsetUs", station.delayOffsetUs, -15, 35);
  finiteRange(issues, "station.sensitivityDbm", station.sensitivityDbm, -95, -60);
  integerRange(issues, "station.minimumPulseRatePps", station.minimumPulseRatePps, 0, 2_700);
  finiteRange(issues, "station.sdesDurationUs", station.sdesDurationUs, 0, 34);
  finiteRange(issues, "station.ldesDurationUs", station.ldesDurationUs, 0, 350);
  finiteRange(issues, "station.ldesThresholdDbm", station.ldesThresholdDbm, -110, 9);
  finiteRange(issues, "station.deadTimeUs", station.deadTimeUs, 0, 150);
  if (!/^[A-Z]{0,4}$/i.test(station.identCode)) {
    issues.push({ path: "station.identCode", message: "IDENT must contain at most four letters." });
  }

  for (const transmitterId of ["tx1", "tx2"] as const) {
    finiteRange(
      issues,
      `transmitters.${transmitterId}.outputPowerPercent`,
      config.transmitters[transmitterId].outputPowerPercent,
      0,
      100,
    );
  }

  const thermal = config.thermal;
  finiteRange(issues, "thermal.fanStartC", thermal.fanStartC, -100, 200);
  finiteRange(issues, "thermal.fanStopC", thermal.fanStopC, -100, 200);
  finiteRange(issues, "thermal.txuShutdownC", thermal.txuShutdownC, -100, 200);
  finiteRange(issues, "thermal.txuRestartC", thermal.txuRestartC, -100, 200);
  if (thermal.fanStopC > thermal.fanStartC) {
    issues.push({ path: "thermal.fanStopC", message: "Fan stop temperature must not exceed its start temperature." });
  }
  if (thermal.txuRestartC >= thermal.txuShutdownC) {
    issues.push({ path: "thermal.txuRestartC", message: "TXU restart temperature must be below shutdown temperature." });
  }

  const monitor = config.monitor;
  finiteRange(issues, "monitor.monitorActionDelayMs", monitor.monitorActionDelayMs, 200, 51_000);
  finiteRange(issues, "monitor.postChangeoverHoldoffMs", monitor.postChangeoverHoldoffMs, 0, 100_000);
  finiteRange(issues, "monitor.identFaultDelayMs", monitor.identFaultDelayMs, 0, 100_000);
  finiteRange(issues, "monitor.selfTestHoldoffMs", monitor.selfTestHoldoffMs, 0, 100_000);
  finiteRange(issues, "monitor.powerOnHoldoffMs", monitor.powerOnHoldoffMs, 0, 100_000);

  for (const [parameter, limit] of Object.entries(monitor.limits) as Array<
    [Dme320MonitorParameter, Dme320Config["monitor"]["limits"][Dme320MonitorParameter]]
  >) {
    finiteRange(issues, `monitor.limits.${parameter}.alarmDelayMs`, limit.alarmDelayMs, 0, 30_000);
    if (typeof limit.nominal === "number" && !Number.isFinite(limit.nominal)) {
      issues.push({ path: `monitor.limits.${parameter}.nominal`, message: "Nominal value must be finite." });
      continue;
    }
    if (typeof limit.nominal !== "number") continue;
    const ordered = [
      limit.alarmLow,
      limit.warningLow,
      limit.nominal,
      limit.warningHigh,
      limit.alarmHigh,
    ].filter((value): value is number => value !== null);
    if (ordered.some((value) => !Number.isFinite(value))) {
      issues.push({ path: `monitor.limits.${parameter}`, message: "All configured limits must be finite." });
    }
    if (ordered.some((value, index) => index > 0 && value < ordered[index - 1])) {
      issues.push({
        path: `monitor.limits.${parameter}`,
        message: "Limits must be ordered alarm-low, warning-low, nominal, warning-high, alarm-high.",
      });
    }
  }

  integerRange(issues, "system.automaticLogoutMinutes", config.system.automaticLogoutMinutes, 0, 1_440);
  finiteRange(
    issues,
    "system.communicationFaultShutdownDelayMs",
    config.system.communicationFaultShutdownDelayMs,
    0,
    30_000,
  );

  integerRange(issues, "communication.remoteConnectionLimit", config.communication.remoteConnectionLimit, 0, 16);
  integerRange(issues, "communication.localConnectionLimit", config.communication.localConnectionLimit, 0, 16);
  for (const [path, baud] of [
    ["communication.localPmdtBaudRate", config.communication.localPmdtBaudRate],
    ["communication.scu1BaudRate", config.communication.scu1BaudRate],
    ["communication.scu2BaudRate", config.communication.scu2BaudRate],
  ] as const) {
    integerRange(issues, path, baud, 2_400, 230_400);
  }
  if (!validIpv4(config.communication.localIpStart)) {
    issues.push({ path: "communication.localIpStart", message: "Must be a valid IPv4 address." });
  }
  if (!validIpv4(config.communication.localIpEnd)) {
    issues.push({ path: "communication.localIpEnd", message: "Must be a valid IPv4 address." });
  }

  const battery = config.battery;
  finiteRange(issues, "battery.warningVoltage", battery.warningVoltage, 0, 30);
  finiteRange(issues, "battery.alarmVoltage", battery.alarmVoltage, 0, 30);
  finiteRange(issues, "battery.cutoffVoltage", battery.cutoffVoltage, 19, 24);
  finiteRange(issues, "battery.fullyChargedVoltage", battery.fullyChargedVoltage, 24, 30);
  finiteRange(issues, "battery.warningTemperatureC", battery.warningTemperatureC, -128, 127);
  finiteRange(issues, "battery.alarmTemperatureC", battery.alarmTemperatureC, -128, 127);
  finiteRange(issues, "battery.chargingCurrentLimitA", battery.chargingCurrentLimitA, 10, 30);
  finiteRange(issues, "battery.simulatedDischargeVoltsPerHour", battery.simulatedDischargeVoltsPerHour, 0, 10);
  finiteRange(issues, "battery.simulatedChargeVoltsPerHour", battery.simulatedChargeVoltsPerHour, 0, 10);
  if (!(battery.cutoffVoltage < battery.alarmVoltage && battery.alarmVoltage < battery.warningVoltage)) {
    issues.push({
      path: "battery",
      message: "Battery voltage thresholds must be cutoff < alarm < warning.",
    });
  }
  if (battery.warningVoltage >= battery.fullyChargedVoltage) {
    issues.push({ path: "battery.fullyChargedVoltage", message: "Full voltage must exceed warning voltage." });
  }
  if (battery.warningTemperatureC >= battery.alarmTemperatureC) {
    issues.push({ path: "battery.alarmTemperatureC", message: "Alarm temperature must exceed warning temperature." });
  }

  const environment = config.environment;
  booleanArrayLength(
    issues,
    "environment.analogInputsEnabled",
    environment.analogInputsEnabled,
    8,
  );
  booleanArrayLength(
    issues,
    "environment.digitalInputsEnabled",
    environment.digitalInputsEnabled,
    16,
  );
  booleanArrayLength(
    issues,
    "environment.expansionDigitalInputsEnabled",
    environment.expansionDigitalInputsEnabled,
    8,
  );
  booleanArrayLength(
    issues,
    "environment.digitalOutputsEnabled",
    environment.digitalOutputsEnabled,
    8,
  );

  return issues;
}

export function assertValidDme320Config(config: Dme320Config): void {
  const issues = validateDme320Config(config);
  if (issues.length > 0) {
    throw new Error(
      `Invalid DME 320 configuration: ${issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`,
    );
  }
}
