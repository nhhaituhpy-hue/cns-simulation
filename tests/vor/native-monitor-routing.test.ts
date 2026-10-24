import { expect, it } from "vitest";
import { buildDvor1150aSnapshot, createDefaultDvor1150aConfig } from "@/lib/dvor1150a";

it.each(["mon1", "mon2"] as const)("classifies secondary alarm on %s rather than routing it to a physical monitor", mon => {
  const config = createDefaultDvor1150aConfig();
  config.monitor.rawMeasurements[mon].rfLevel = 12;
  config.monitor.routing.rfLevel = { primary: false, secondary: true };
  const result = buildDvor1150aSnapshot(config);
  expect(result.monitors[mon].parameters.rfLevel.value).toBe(12);
  expect(result.monitors[mon].parameters.rfLevel.indicator).toBe("yellow");
  expect(result.voting.transferRequested).toBe(false);
});

it("projects primary and secondary severity to the correct sidebar and each RMS monitor row", () => {
  const config = createDefaultDvor1150aConfig();
  config.monitor.rawMeasurements.mon2.rfLevel = 12;
  let snapshot = buildDvor1150aSnapshot(config);
  expect(snapshot.data.monitorIntegral).toMatchObject({ priAlarm: true, secAlarm: false });
  expect(snapshot.data.rmsMonitorTransmitterStatus.monitors[0]).toMatchObject({ primaryAlarm: false, secondaryAlarm: false });
  expect(snapshot.data.rmsMonitorTransmitterStatus.monitors[1]).toMatchObject({ primaryAlarm: true, secondaryAlarm: false });
  config.monitor.routing.rfLevel = { primary: false, secondary: true };
  snapshot = buildDvor1150aSnapshot(config);
  expect(snapshot.data.monitorIntegral).toMatchObject({ priAlarm: false, secAlarm: true });
  expect(snapshot.data.rmsMonitorTransmitterStatus.monitors[1]).toMatchObject({ primaryAlarm: false, secondaryAlarm: true });
});

it("requires the same secondary source under AND on Any Alarm", () => {
  const config = createDefaultDvor1150aConfig();
  config.monitor.transfer = "on Any Alarm";
  config.monitor.routing.rfLevel = { primary: false, secondary: true };
  config.monitor.routing.hz30Modulation = { primary: false, secondary: true };
  config.monitor.rawMeasurements.mon1.rfLevel = 12;
  expect(buildDvor1150aSnapshot(config).voting.transferRequested).toBe(false);
  config.monitor.rawMeasurements.mon2.hz30Modulation = 20;
  expect(buildDvor1150aSnapshot(config).voting.transferRequested).toBe(false);
  config.monitor.rawMeasurements.mon2.rfLevel = 12;
  expect(buildDvor1150aSnapshot(config).voting.transferRequested).toBe(true);
  config.monitor.votingLogic = "OR";
  config.monitor.rawMeasurements.mon2.rfLevel = 0;
  expect(buildDvor1150aSnapshot(config).voting.transferRequested).toBe(true);
});

it("does not combine dissimilar parameters into a false AND source alarm", () => {
  const config = createDefaultDvor1150aConfig();
  config.monitor.votingLogic = "AND";
  config.monitor.rawMeasurements.mon1.hz30Modulation = 20;
  config.monitor.rawMeasurements.mon2.rfLevel = 12;
  const result = buildDvor1150aSnapshot(config);
  expect(result.monitors.mon1.primaryAlarm).toBe(true);
  expect(result.monitors.mon2.primaryAlarm).toBe(true);
  expect(result.voting.systemHealthy).toBe(true);
  expect(result.voting.transferRequested).toBe(false);
  config.monitor.rawMeasurements.mon2.hz30Modulation = 20;
  expect(buildDvor1150aSnapshot(config).voting.transferRequested).toBe(true);
});

it.each(["AND", "OR"] as const)("uses only the installed monitor in single-monitor %s voting", logic => {
  const config = createDefaultDvor1150aConfig();
  config.station.monitorConfig = "Single Monitor";
  config.monitor.votingLogic = logic;
  config.monitor.rawMeasurements.mon1.rfLevel = 12;
  expect(buildDvor1150aSnapshot(config).voting.transferRequested).toBe(true);
});

it.each(["AND", "OR"] as const)("uses %s alarm voting across both monitor CCAs", logic => {
  const config = createDefaultDvor1150aConfig();
  config.monitor.votingLogic = logic;
  config.monitor.rawMeasurements.mon2.deviation = 25;
  const result = buildDvor1150aSnapshot(config);
  expect(result.monitors.mon2.parameters.deviation.indicator).toBe("red");
  expect(result.voting.systemHealthy).toBe(logic === "AND");
  expect(result.voting.transferRequested).toBe(logic === "OR");
  config.monitor.rawMeasurements.mon1.deviation = 25;
  expect(buildDvor1150aSnapshot(config).voting.systemHealthy).toBe(false);
});
