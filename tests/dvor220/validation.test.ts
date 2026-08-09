import { describe, expect, it } from "vitest";
import { createDefaultDvor220Configuration } from "@/modules/operations/dvor-220/domain/defaults";
import {
  hasDvor220ConfigurationErrors,
  validateDvor220Configuration,
} from "@/modules/operations/dvor-220/domain/validation";

describe("MOPIENS DVOR 220 configuration validation", () => {
  it("accepts the manual-derived default configuration", () => {
    const configuration = createDefaultDvor220Configuration();
    const issues = validateDvor220Configuration(configuration);

    expect(issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(issues).toContainEqual(expect.objectContaining({
      path: "monitor.executiveAlarmDelayMs",
      severity: "warning",
    }));
  });

  it("implements the carrier form range and operating-range warning policy", () => {
    const low = createDefaultDvor220Configuration();
    low.station.carrierPowerW = 10;
    const outsideOperatingRange = validateDvor220Configuration(low);

    expect(outsideOperatingRange).toContainEqual(expect.objectContaining({
      path: "station.carrierPowerW",
      severity: "warning",
    }));
    expect(hasDvor220ConfigurationErrors(low)).toBe(false);

    low.station.carrierPowerW = 151;
    expect(validateDvor220Configuration(low)).toContainEqual(expect.objectContaining({
      path: "station.carrierPowerW",
      severity: "error",
    }));
  });

  it("accepts 0-5 W sideband settings and rejects values beyond that form range", () => {
    const configuration = createDefaultDvor220Configuration();
    configuration.transmitters.tx1.sidebandPowerW.usbCos = 5;
    expect(hasDvor220ConfigurationErrors(configuration)).toBe(false);

    configuration.transmitters.tx1.sidebandPowerW.usbCos = 5.01;
    expect(validateDvor220Configuration(configuration)).toContainEqual(expect.objectContaining({
      path: "transmitters.tx1.sidebandPowerW.usbCos",
      severity: "error",
    }));
  });

  it("enforces 50 kHz channels, ordered alarm limits and thermal hysteresis", () => {
    const configuration = createDefaultDvor220Configuration();
    configuration.station.frequencyMHz = 113.01;
    configuration.monitor.channels.cha.limits.fmIndex.lowerWarning = 14;
    configuration.thermal.tx1.restartC.cma = configuration.thermal.tx1.shutdownC.cma;
    const issues = validateDvor220Configuration(configuration);

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "station.frequencyMHz", severity: "error" }),
      expect.objectContaining({ path: "monitor.channels.cha.limits.fmIndex", severity: "error" }),
      expect.objectContaining({ path: "thermal.tx1.cma", severity: "error" }),
    ]));
  });

  it("validates monitor and control timing fields from the setup tables", () => {
    const configuration = createDefaultDvor220Configuration();
    configuration.monitor.powerOnHoldoffMs = 100_001;
    configuration.monitor.identCodeAlarmDelayMs = -1;
    configuration.monitor.warningRangePercent = 101;
    configuration.system.controlFaultShutdownDelayMs = 30_001;
    const paths = validateDvor220Configuration(configuration).map((issue) => issue.path);

    expect(paths).toEqual(expect.arrayContaining([
      "monitor.powerOnHoldoffMs",
      "monitor.identCodeAlarmDelayMs",
      "monitor.warningRangePercent",
      "system.controlFaultShutdownDelayMs",
    ]));
  });
});
