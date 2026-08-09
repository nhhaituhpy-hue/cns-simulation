import { describe, expect, it } from "vitest";
import {
  buildDvorGroundCheck,
  buildDvor1150aSnapshot,
  calculateIntegrityTestValues,
  createDefaultDvor1150aConfig,
  dvorConfigFieldCatalog,
  setDvorConfigValue,
} from "@/lib/dvor1150a";

describe("DVOR 1150A configuration engine", () => {
  it("derives the reference station snapshot from the configured transmitter", () => {
    const snapshot = buildDvor1150aSnapshot(createDefaultDvor1150aConfig());

    expect(snapshot.voting.activeTransmitter).toBe("tx1");
    expect(snapshot.data.rmsConfigStation.transmitterFrequency).toBe("117.0 MHz");
    expect(snapshot.data.integralData.find((row) => row.label === "Ident Code")?.mon1Value).toBe("TUH");
    expect(snapshot.data.txFrequency[0].value1).toBeCloseTo(117.000585, 6);
    expect(snapshot.monitors.mon1.parameters.hz30Modulation.indicator).toBe("green");
  });

  it("propagates transmitter output power changes into power data and monitor data", () => {
    const config = createDefaultDvor1150aConfig();
    const changed = setDvorConfigValue(config, "transmitters.tx1.nominal.outputPower", 100);
    const baseline = buildDvor1150aSnapshot(config);
    const next = buildDvor1150aSnapshot(changed);

    expect(next.effectiveTransmitters.tx1.effectiveOutputPower).toBeCloseTo(84, 5);
    expect(next.data.txPower[0].tx1).toBeCloseTo(101.142857, 5);
    expect(Number(next.data.integralData.find((row) => row.label === "Tx Power")?.mon1Value)).toBeGreaterThan(
      Number(baseline.data.integralData.find((row) => row.label === "Tx Power")?.mon1Value),
    );
  });

  it("treats sideband RF level settings as voltage scale factors", () => {
    const config = createDefaultDvor1150aConfig();
    const baseline = buildDvor1150aSnapshot(config);
    const halfScale = buildDvor1150aSnapshot(
      setDvorConfigValue(config, "transmitters.tx1.offsets.sideband1RfLevelScale", 70.7),
    );
    const higherNominalPower = buildDvor1150aSnapshot(
      setDvorConfigValue(config, "transmitters.tx1.nominal.outputPower", 100),
    );

    expect(halfScale.effectiveTransmitters.tx1.sidebandPower[0]).toBeCloseTo(
      baseline.effectiveTransmitters.tx1.sidebandPower[0] * 0.5,
      3,
    );
    expect(higherNominalPower.effectiveTransmitters.tx1.sidebandPower[0]).toBeCloseTo(
      baseline.effectiveTransmitters.tx1.sidebandPower[0] * (100 / 70),
      5,
    );
  });

  it("propagates SBO RF scale and carrier-sideband phase into 9960 Hz modulation", () => {
    const config = createDefaultDvor1150aConfig();
    const baseline = buildDvor1150aSnapshot(config);
    const higherSboScale = buildDvor1150aSnapshot(
      setDvorConfigValue(config, "transmitters.tx1.offsets.txSidebandRfLevelScale", 100),
    );
    const phaseError = buildDvor1150aSnapshot(
      setDvorConfigValue(config, "transmitters.tx1.offsets.carrierSidebandPhaseOffsetCoarse", 270),
    );

    expect(baseline.monitors.mon1.parameters.hz9960Modulation.value).toBeCloseTo(29.6, 5);
    expect(higherSboScale.monitors.mon1.parameters.hz9960Modulation.value).toBeGreaterThan(
      baseline.monitors.mon1.parameters.hz9960Modulation.value as number,
    );
    expect(phaseError.monitors.mon1.parameters.hz9960Modulation.value).toBeLessThan(
      baseline.monitors.mon1.parameters.hz9960Modulation.value as number,
    );
  });

  it("propagates transmitter faults to RMS digital I/O and status alerts", () => {
    const config = createDefaultDvor1150aConfig();
    const baseline = buildDvor1150aSnapshot(config);
    const overtemperature = buildDvor1150aSnapshot(
      setDvorConfigValue(config, "transmitters.tx1.faults.overtemperature", true),
    );

    expect(baseline.data.txAlerts.find((row) => row.name === "Carrier Overtemp")?.tx1).toBe("green");
    expect(overtemperature.data.txAlerts.find((row) => row.name === "Carrier Overtemp")?.tx1).toBe("red");
    expect(overtemperature.data.systemPowerStatus.find((row) => row.name === "Carrier PA")?.tx1).toBe("red");
    expect(overtemperature.data.txCarrierPaAlerts.find((row) => row.label === "PA Thermal Shutdown")?.indicator).toBe("red");
  });

  it("propagates transmitter sideband VSWR changes into the monitor antenna profile", () => {
    const config = createDefaultDvor1150aConfig();
    const baseline = buildDvor1150aSnapshot(config);
    const changed = setDvorConfigValue(config, "transmitters.tx1.vswr.sidebands.0", 3.5);
    const next = buildDvor1150aSnapshot(changed);

    expect(next.data.vswrData[0]).toBeGreaterThan(baseline.data.vswrData[0]);
    expect(next.monitors.mon1.parameters.sidebandVswr.status).toBe("normal");
  });

  it("exposes all 48 raw sideband VSWR antenna inputs for both monitors", () => {
    const rawVswrFields = dvorConfigFieldCatalog.filter((field) =>
      /^monitor\.rawMeasurements\.mon[12]\.sidebandVswr\.(\d+)$/.test(field.id),
    );
    expect(rawVswrFields).toHaveLength(96);
    expect(rawVswrFields.some((field) => field.id.endsWith("mon1.sidebandVswr.47"))).toBe(true);
    expect(rawVswrFields.some((field) => field.id.endsWith("mon2.sidebandVswr.47"))).toBe(true);
  });

  it("propagates an individual raw antenna VSWR value into the displayed profile", () => {
    const config = createDefaultDvor1150aConfig();
    const changed = setDvorConfigValue(config, "monitor.rawMeasurements.mon2.sidebandVswr.47", 3.75);
    const snapshot = buildDvor1150aSnapshot(changed);

    expect(snapshot.monitors.mon2.sidebandVswr[47]).toBeCloseTo(3.75, 5);
    expect(snapshot.data.vswrData[47]).toBeCloseTo(
      buildDvor1150aSnapshot(config).data.vswrData[47],
      5,
    );
  });

  it("keeps Monitor 2 calibration changes isolated to Monitor 2", () => {
    const config = createDefaultDvor1150aConfig();
    const changed = setDvorConfigValue(
      config,
      "monitor.calibration.mon2.hz30ModulationScale",
      80,
    );
    const snapshot = buildDvor1150aSnapshot(changed);

    expect(snapshot.monitorOffsets.mon1.find((row) => row.parameter === "30 Hz Modulation Scale")?.integral).toBe(100);
    expect(snapshot.monitorOffsets.mon2.find((row) => row.parameter === "30 Hz Modulation Scale")?.integral).toBe(80);
    expect(snapshot.monitors.mon1.parameters.hz30Modulation.value).toBeCloseTo(29.6, 5);
    expect(snapshot.monitors.mon2.parameters.hz30Modulation.value).toBeCloseTo(23.68, 5);
  });

  it("uses primary and secondary routing when calculating voting health", () => {
    const config = createDefaultDvor1150aConfig();
    const changed = setDvorConfigValue(
      setDvorConfigValue(config, "monitor.rawMeasurements.mon1.rfLevel", 10),
      "monitor.votingLogic",
      "OR",
    );
    const snapshot = buildDvor1150aSnapshot(changed);

    expect(snapshot.monitors.mon1.parameters.rfLevel.status).toBe("alarm");
    expect(snapshot.monitors.mon2.healthy).toBe(true);
    expect(snapshot.voting.systemHealthy).toBe(true);
  });

  it("propagates monitor input attenuation into RF level", () => {
    const config = createDefaultDvor1150aConfig();
    const changed = setDvorConfigValue(config, "monitor.antennas.mon1.inputAttenuation", 10);
    const snapshot = buildDvor1150aSnapshot(changed);

    expect(snapshot.monitors.mon1.parameters.rfLevel.value).toBeCloseTo(4.9, 5);
    expect(snapshot.monitors.mon1.parameters.rfLevel.status).toBe("warning");
    expect(snapshot.monitors.mon2.parameters.rfLevel.value).toBeCloseTo(0.9, 5);
  });

  it("mixes the optional second field-monitor antenna into azimuth and RF readings", () => {
    const config = createDefaultDvor1150aConfig();
    const baseline = buildDvor1150aSnapshot(config);
    const changed = setDvorConfigValue(
      setDvorConfigValue(
        setDvorConfigValue(config, "monitor.antennas.mon1.secondAntennaEnabled", true),
        "monitor.antennas.mon1.secondAzimuthAngle",
        269.25,
      ),
      "monitor.antennas.mon1.secondInputAttenuation",
      4,
    );
    const snapshot = buildDvor1150aSnapshot(changed);

    expect(snapshot.monitors.mon1.parameters.azimuth.value).toBeCloseTo(259.55, 5);
    expect(snapshot.monitors.mon1.parameters.rfLevel.value).toBeCloseTo(5.9, 5);
    expect(snapshot.monitors.mon1.parameters.azimuth.status).toBe(
      baseline.monitors.mon1.parameters.azimuth.status,
    );
  });

  it("propagates antenna return-loss calibration and transmitter phase offsets", () => {
    const config = createDefaultDvor1150aConfig();
    const changed = setDvorConfigValue(
      setDvorConfigValue(config, "monitor.calibration.mon1.oddAntennaReturnLossOffset", 0.5),
      "transmitters.tx1.offsets.sideband1PhaseOffset",
      2,
    );
    const baseline = buildDvor1150aSnapshot(config);
    const next = buildDvor1150aSnapshot(changed);

    expect(next.data.vswrData[0]).toBeCloseTo(baseline.data.vswrData[0] + 0.5, 5);
    expect(next.groundChecks.tx1.stationErrors.some((value) => value !== 0)).toBe(true);
    expect(buildDvorGroundCheck(changed, "tx1").errorSpread).toBeGreaterThan(0);
  });

  it("propagates raw notch detector level into the notch monitor table", () => {
    const config = createDefaultDvor1150aConfig();
    const changed = setDvorConfigValue(config, "monitor.rawMeasurements.mon1.notchMonitor", 80);
    const snapshot = buildDvor1150aSnapshot(changed);

    expect(snapshot.data.notchData[0].mon1).toBeCloseTo(16.8, 5);
    expect(snapshot.data.notchData[0].mon2).toBeCloseTo(21.2, 5);
  });

  it("applies notch tolerance and primary routing to monitor health", () => {
    const config = createDefaultDvor1150aConfig();
    const changed = setDvorConfigValue(
      setDvorConfigValue(
        setDvorConfigValue(config, "monitor.notchTolerance", 1),
        "monitor.routing.notchMonitor.primary",
        true,
      ),
      "monitor.routing.notchMonitor.secondary",
      false,
    );
    const snapshot = buildDvor1150aSnapshot(changed);

    expect(snapshot.monitors.mon1.parameters.notchMonitor.status).toBe("alarm");
    expect(snapshot.monitors.mon1.healthy).toBe(false);
    expect(snapshot.voting.systemHealthy).toBe(false);
  });

  it("recalculates alarm state and voting when a monitor limit changes", () => {
    const config = createDefaultDvor1150aConfig();
    const changed = setDvorConfigValue(config, "monitor.alarmLimits.rfLevel.alarmHigh", 0.5);
    const snapshot = buildDvor1150aSnapshot(changed);

    expect(snapshot.monitors.mon1.parameters.rfLevel.status).toBe("alarm");
    expect(snapshot.monitors.mon2.parameters.rfLevel.status).toBe("alarm");
    expect(snapshot.voting.systemHealthy).toBe(false);
    expect(snapshot.voting.transferRequested).toBe(true);
  });

  it("uses the manual's one-tenth integrity test formulas", () => {
    expect(calculateIntegrityTestValues({
      alarmLow: 23,
      preAlarmLow: 28.5,
      nominal: 30,
      preAlarmHigh: 31.5,
      alarmHigh: 37,
      unit: "%",
    })).toEqual({
      lowLimitLowTest: 22.3,
      lowLimitHighTest: 23.7,
      highLimitLowTest: 36.3,
      highLimitHighTest: 37.7,
    });
  });

  it("does not expose completed integrity values when integrity tests are disabled", () => {
    const config = createDefaultDvor1150aConfig();
    const snapshot = buildDvor1150aSnapshot(
      setDvorConfigValue(config, "monitor.integrity.enabled", false),
    );

    expect(snapshot.data.rmsConfigGeneral.monitorIntegrityTestsEnabled).toBe(false);
    expect(Number.isNaN(snapshot.integrity["30HzModulation"].lowLimitLowTest)).toBe(true);
  });
});
