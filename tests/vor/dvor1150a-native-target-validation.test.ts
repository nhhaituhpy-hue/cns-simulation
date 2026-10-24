// @vitest-environment node
import { expect, it } from "vitest";
import { createDvor1150aConfigurationExercise, parseDvor1150aScenarioDefinition, dvor1150aSharedNominalFieldIds } from "@/lib/dvor1150a/scenario";
import { getDvorConfigValue, setDvorConfigValue } from "@/lib/dvor1150a/config-utils";
import { applyDvorConfigPatches } from "@/lib/dvor1150a/config-service";

it.each([
  ["monitor.azimuthLimits.preAlarm", 0],
  ["monitor.azimuthLimits.alarm", 0.5],
  ["monitor.sidebandVswr.preAlarm", 3],
  ["monitor.alarmLimits.rfLevel.alarmLow", -2],
  ["monitor.alarmLimits.rfLevel.alarmHigh", 2],
] as const)("rejects the exact target rejected by the native Apply boundary: %s=%s", (fieldId, value) => {
  const definition = createDvor1150aConfigurationExercise();
  if (fieldId === "monitor.sidebandVswr.preAlarm") value = definition.configuration.monitor.sidebandVswr.alarm as 3;
  definition.successCriteria.configurationValues = [{ fieldId, value }];
  const recovered = setDvorConfigValue(definition.configuration, fieldId, value);
  expect(applyDvorConfigPatches(recovered).ok).toBe(false);
  expect(parseDvor1150aScenarioDefinition(definition)).toBeNull();
});

it.each([
  ["transmitters.tx1.nominal.outputPower", "transmitters.tx2.nominal.outputPower", 60, 70],
  ["monitor.antennas.mon1.secondAntennaEnabled", "monitor.antennas.mon2.secondAntennaEnabled", false, true],
] as const)("rejects asymmetric shared permission even when the locked mirror already equals target: %s", (fieldId, mirror, initial, target) => {
  const definition = createDvor1150aConfigurationExercise();
  definition.configuration = setDvorConfigValue(setDvorConfigValue(definition.configuration, fieldId, initial), mirror, target);
  definition.successCriteria.configurationValues = [{ fieldId, value: target }];
  definition.editPolicy = { mode: "restricted", allowedFieldIds: [fieldId] };
  expect(parseDvor1150aScenarioDefinition(definition)).toBeNull();
});

it("validates the candidate baseline at the same Apply boundary", () => {
  const definition = createDvor1150aConfigurationExercise();
  definition.configuration.monitor.azimuthLimits.preAlarm = 0;
  expect(applyDvorConfigPatches(definition.configuration).ok).toBe(false);
  expect(parseDvor1150aScenarioDefinition(definition)).toBeNull();
});

it("mirrors a valid common nominal target before native validation without mutating the publication", () => {
  const definition = createDvor1150aConfigurationExercise();
  definition.successCriteria.configurationValues = [{ fieldId: "transmitters.tx1.nominal.outputPower", value: 75 }];
  const before = structuredClone(definition);
  let recovered = definition.configuration;
  for (const id of dvor1150aSharedNominalFieldIds("transmitters.tx1.nominal.outputPower")) recovered = setDvorConfigValue(recovered, id, 75);
  expect(applyDvorConfigPatches(recovered).ok).toBe(true);
  expect(getDvorConfigValue(recovered, "transmitters.tx2.nominal.outputPower")).toBe(75);
  expect(parseDvor1150aScenarioDefinition(definition)).toEqual(definition);
  expect(definition).toEqual(before);
});
