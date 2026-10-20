import { describe, expect, it } from "vitest";
import { DEFAULT_SCENARIOS } from "@/stores/default-scenarios";
import { parseAdsbScenarioDefinition, type AdsbScenarioDefinition } from "@/modules/devices/adsb/scenario-parameters";
import { TerminalEngine } from "@/lib/terminal-engine";
import { AiScenarioError } from "@/lib/ai/scenario-generation/types";
import type { ScenarioParameterAdapter } from "@/lib/ai/scenario-generation/parameter-types";

async function adapter(): Promise<ScenarioParameterAdapter> {
  const path = "../../src/lib/ai/scenario-generation/parameter-adsb";
  const mod = await import(path).catch(() => null);
  expect(mod?.adsbParameterAdapter, "ADS-B typed adapter must exist").toBeDefined();
  return mod!.adsbParameterAdapter;
}
function seed(id = "adsb-11-configure-e2e-thresholds"): AdsbScenarioDefinition {
  return structuredClone(parseAdsbScenarioDefinition(DEFAULT_SCENARIOS.find((item) => item.id === id))!);
}
function target(d: AdsbScenarioDefinition) {
  return d.sites.flatMap((site) => [site.sensorA, site.sensorB]).find((sensor) => sensor?.id === d.targetSensorId)!;
}

describe("ADS-B typed parameter adapter", () => {
  it("changes actual numeric parameters on the server-resolved target without mutating the scaffold", async () => {
    const a = await adapter(); const original = seed(); const before = structuredClone(original);
    const decoy = structuredClone(target(original)); decoy.id = "not-the-target";
    original.sites[0].sensorB = original.sites[0].sensorA;
    original.sites[0].sensorA = decoy;
    const fields = a.fields("ads-b", original);
    expect(fields).toContainEqual(expect.objectContaining({ id: "targetSensor.dataProfile.endToEnd.alertPower", value: 164, min: 0, max: 255, recovery: true }));
    const changed = a.apply("ads-b", original, [{ fieldId: "targetSensor.dataProfile.endToEnd.alertPower", value: 181 }]) as AdsbScenarioDefinition;
    expect(target(changed).dataProfile!.endToEnd!.alertPower).toBe(181);
    expect(changed.sites[0].sensorA!.dataProfile!.endToEnd!.alertPower).toBe(164);
    expect(changed.expectedActions).toEqual(before.expectedActions);
    expect(target(original).dataProfile!.endToEnd!.alertPower).toBe(164);
  });
  it("rejects malformed native profiles and statuses before listing, applying or verifying", async () => {
    const a = await adapter();
    const corruptions: Array<(d: AdsbScenarioDefinition) => void> = [
      (d) => { target(d).status = "healthy" as never; },
      (d) => { target(d).dataProfile!.asterix.sac = NaN; },
      (d) => { target(d).monitoring!.cpuLoadPercent = Infinity; },
      (d) => { target(d).dataProfile!.gps.enabled = "true" as never; },
      (d) => { target(d).dataProfile!.asterix.sic = 256; },
      (d) => { target(d).dataProfile!.endToEnd!.failurePower = 200; },
      (d) => { target(d).dataProfile!.filters.altitudeMin = 70000; },
      (d) => { (target(d).dataProfile!.gps as unknown as Record<string, unknown>).extra = 1; },
      (d) => { target(d).dataProfile = {} as never; },
      (d) => { target(d).monitoring!.gpsStatus = "normal" as never; },
      (d) => { d.sites[0].sensorB = structuredClone(target(d)); },
      (d) => { d.targetSensorId = "missing"; },
      (d) => { (target(d).dataProfile as unknown as Record<string, unknown>).password = "not-allowed"; },
    ];
    for (const corrupt of corruptions) {
      const d = seed(); corrupt(d);
      for (const run of [() => a.fields("ads-b", d), () => a.apply("ads-b", d, []), () => a.verify("ads-b", d, [])]) {
        expect(run).toThrow(expect.objectContaining({ code: "INVALID_PARAMETERS" }));
      }
    }
  });

  it("accepts only exact server field IDs and strictly typed bounded values", async () => {
    const a = await adapter(); const d = seed(); const before = structuredClone(d);
    const bad = [
      { fieldId: "targetSensor.dataProfile.asterix.sac", value: "95" },
      { fieldId: "targetSensor.dataProfile.asterix.sac", value: 256 },
      { fieldId: "targetSensor.dataProfile.asterix.sic", value: 1.5 },
      { fieldId: "targetSensor.dataProfile.endToEnd.alertPower", value: Infinity },
      { fieldId: "targetSensor.dataProfile.endToEnd.failurePower", value: 200 },
      { fieldId: "targetSensor.monitoring.gpsStatus", value: "normal" },
      { fieldId: "targetSensor.status", value: true },
      { fieldId: "targetSensor.dataProfile.network.ip", value: "999.1.1.1" },
      { fieldId: "targetSensor.dataProfile.gps.enabled", value: "false" },
      { fieldId: "targetSensorId", value: "invented-id" },
      { fieldId: "targetSensor.__proto__.polluted", value: true },
      { fieldId: "targetSensor.dataProfile.snmpUsers.0.password", value: "secret" },
      { fieldId: "expectedActions.0.input", value: "99" },
    ];
    for (const change of bad) expect(() => a.apply("ads-b", d, [change])).toThrow(AiScenarioError);
    expect(() => a.apply("ads-b", d, [{ fieldId: "targetSensor.status", value: "red" }, { fieldId: "targetSensor.status", value: "green" }])).toThrow(AiScenarioError);
    expect(() => a.fields("dme-320", d)).toThrow(AiScenarioError);
    const changed = a.apply("ads-b", d, [
      { fieldId: "targetSensor.dataProfile.asterix.sac", value: 101 },
      { fieldId: "targetSensor.dataProfile.asterix.sic", value: 201 },
      { fieldId: "targetSensor.monitoring.temperatureC", value: 48.25 },
      { fieldId: "targetSensor.monitoring.gpsStatus", value: "unsynchronized" },
    ]) as AdsbScenarioDefinition;
    expect(target(changed).dataProfile!.asterix).toMatchObject({ sac: 101, sic: 201 });
    expect(target(changed).monitoring).toMatchObject({ temperatureC: 48.25, gpsStatus: "unsynchronized" });
    expect(d).toEqual(before);
  });

  it("preserves canonical/legacy contracts without inventing profiles or operational recovery", async () => {
    const a = await adapter();
    for (const id of ["seed-sa-enable-cat21", "seed-ma-restore-gps", "seed-con-son-network"]) {
      const legacy = structuredClone(DEFAULT_SCENARIOS.find((item) => item.id === id)!);
      const normalized = parseAdsbScenarioDefinition(legacy)!;
      expect(a.apply("ads-b", legacy as never, [])).toEqual(normalized);
      const fields = a.fields("ads-b", normalized);
      expect(fields).toContainEqual(expect.objectContaining({ id: "targetSensor.status", recovery: false }));
      expect(fields).toContainEqual(expect.objectContaining({ id: "targetSensor.monitoring.gpsStatus", recovery: false }));
      expect(() => a.verify("ads-b", normalized, [{ fieldId: "targetSensor.status", value: "green" }])).toThrow(expect.objectContaining({ code: "INVALID_RECOVERY" }));
    }
  });

  it("verifies a changed real RF threshold through the existing native action sequence", async () => {
    const a = await adapter(); const baseline = seed();
    const d = a.apply("ads-b", baseline, [{ fieldId: "targetSensor.dataProfile.endToEnd.alertPower", value: 181 }]) as AdsbScenarioDefinition;
    const before = structuredClone(d);
    const result = a.verify("ads-b", d, [
      { fieldId: "targetSensor.dataProfile.endToEnd.alertPower", value: 170 },
      { fieldId: "targetSensor.dataProfile.endToEnd.failurePower", value: 145 },
    ]);
    expect(result.mode).toBe("native-action-replay");
    expect(result.initial).toContainEqual(expect.objectContaining({ id: "targetSensor.dataProfile.endToEnd.alertPower", passed: true, detail: expect.stringContaining("181") }));
    expect(result.initial.every((check) => check.passed)).toBe(true);
    expect(result.recoveryVerified).toBe(true);
    expect(result.recovered).toContainEqual(expect.objectContaining({ id: "targetSensor.dataProfile.endToEnd.alertPower", passed: true }));
    expect(result.notes.join(" ")).toMatch(/status|operational/i);
    expect(d).toEqual(before);
    expect(target(baseline).dataProfile!.endToEnd!.alertPower).toBe(164);
  });

  it("supports SAC/SIC native replay across the existing scaffold's explicit exited sessions", async () => {
    const a = await adapter(); const d = seed("adsb-08-configure-sac-sic");
    const result = a.verify("ads-b", d, [{ fieldId: "targetSensor.dataProfile.asterix.sac", value: 95 }, { fieldId: "targetSensor.dataProfile.asterix.sic", value: 164 }]);
    expect(result.recoveryVerified).toBe(true);
    expect(result.recovered.every((check) => check.passed)).toBe(true);
  });

  it("does not confuse accepted commands, wrong-role metadata or unchanged baselines with recovery", async () => {
    const a = await adapter();
    const recovery = [{ fieldId: "targetSensor.dataProfile.endToEnd.alertPower", value: 170 }];
    const cases: Array<(d: AdsbScenarioDefinition) => void> = [
      (d) => { d.expectedActions[0].input = "999"; },
      (d) => { d.expectedActions[0].menuId = "ma.root"; },
      (d) => { d.expectedActions[0].kind = "value-input"; },
      (d) => { d.expectedActions.find((item) => item.input === "170")!.input = "not-a-number"; },
      (d) => { d.expectedActions.find((item) => item.input === "170")!.input = "171"; },
      (d) => { d.expectedActions = seed("adsb-04-display-e2e-thresholds").expectedActions; },
      (d) => { target(d).dataProfile!.endToEnd!.alertPower = 170; },
    ];
    for (const corrupt of cases) {
      const d = seed(); corrupt(d); const before = structuredClone(d);
      expect(() => a.verify("ads-b", d, recovery)).toThrow(expect.objectContaining({ code: "INVALID_RECOVERY" }));
      expect(d).toEqual(before);
    }
    const d = seed();
    for (const entries of [[], [{ fieldId: "unknown", value: 170 }], [{ fieldId: "targetSensor.monitoring.gpsStatus", value: "synchronized" }], [{ fieldId: "targetSensor.dataProfile.endToEnd.alertPower", value: "170" }]]) {
      expect(() => a.verify("ads-b", d, entries)).toThrow(expect.objectContaining({ code: "INVALID_RECOVERY" }));
    }
    const readOnly = seed("seed-sa-enable-cat21");
    expect(() => a.verify("ads-b", readOnly, [{ fieldId: "targetSensor.status", value: "green" }])).toThrow(AiScenarioError);
  });

  it("rejects unknown nested action keys and unsupported generic setting arguments even when the engine accepts them", async () => {
    const a = await adapter(); const unknown = seed();
    (unknown.expectedActions[0] as unknown as Record<string, unknown>).extra = "not-a-native-field";
    expect(() => a.apply("ads-b", unknown, [])).toThrow(expect.objectContaining({ code: "INVALID_PARAMETERS" }));
    const d = seed();
    const engine = new TerminalEngine({ targetLoginUser: "sysadmin", sensorDataProfile: target(d).dataProfile });
    d.expectedActions = ["1", "7", "garbage", "", "0", ...d.expectedActions.map((action) => action.input)].map((input, i) => {
      const result = engine.processInput(input);
      expect(result.accepted).toBe(true);
      return { ...result.recordableAction!, step: i + 1, timestamp: i };
    });
    expect(() => a.verify("ads-b", d, [{ fieldId: "targetSensor.dataProfile.endToEnd.alertPower", value: 170 }])).toThrow(expect.objectContaining({ code: "INVALID_RECOVERY" }));
  });

  it("verifies confirmed native IPv4 configuration but rejects unconfirmed network targets", async () => {
    const a = await adapter(); const d = seed("adsb-06-configure-network");
    expect(a.verify("ads-b", d, [{ fieldId: "targetSensor.dataProfile.network.ip", value: "192.168.10.20" }]).recoveryVerified).toBe(true);
    const confirm = d.expectedActions.findIndex((action) => action.menuId === "sa.network" && action.input === "3");
    d.expectedActions = d.expectedActions.slice(0, confirm);
    expect(() => a.verify("ads-b", d, [{ fieldId: "targetSensor.dataProfile.network.ip", value: "192.168.10.20" }])).toThrow(expect.objectContaining({ code: "INVALID_RECOVERY" }));
  });

});
