import { describe, expect, it } from "vitest";
import { mopiensAuthoringAdapters } from "@/lib/ai/scenario-authoring/forms/mopiens";
import { readPath, validateFieldValue } from "@/lib/ai/scenario-authoring/forms/helpers";
import { DME320_FAULT_CATALOG } from "@/modules/operations/dme-320/domain/faults";
import { DVOR220_MONITOR_PARAMETERS } from "@/modules/operations/dvor-220/domain/types";
import { DME320_MONITOR_PARAMETERS } from "@/modules/operations/dme-320/domain/types";
import { createDefaultDvor220ScenarioDefinition } from "@/modules/operations/dvor-220/domain/scenario";
import { createDefaultDme320ScenarioDefinition } from "@/modules/operations/dme-320/domain/scenario";
function leaves(value: unknown, path = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [path];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, path ? `${path}.${key}` : key));
}
const security = /configuration\.system\.(allowSimultaneousLogin|allowGuestAccess|automaticLogoutMinutes|settingsOnlyWhenMonitorBypassed|settingsOnlyAtLocal|modifyOnlyWhenBypassed|modifyOnlyAtLocal)$/;
describe("native MOPIENS authoring", () => {
  it("starts from native factories without adding faults and covers every safe native input", () => {
    expect(mopiensAuthoringAdapters.map((a) => a.moduleId)).toEqual(["dvor-220", "dme-320"]);
    for (const adapter of mopiensAuthoringAdapters) {
      const expected = adapter.moduleId === "dvor-220" ? createDefaultDvor220ScenarioDefinition() : createDefaultDme320ScenarioDefinition();
      const definition = adapter.createDefault();
      expect(definition).toEqual(expected);
      const form = adapter.form(definition);
      const ids = form.fields.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(form.sections.map((s) => s.id)).toEqual(["metadata", "initial", "rf", "monitors", "plant", "faults", "raw", "success-criteria"]);
      for (const id of leaves(expected).filter((id) => id !== "schemaVersion" && !security.test(id))) expect(ids, id).toContain(id);
      expect(ids.some((id) => security.test(id) || /password|accounts|session|diagnosis|actor/i.test(id))).toBe(false);
      expect(form.fields.every((f) => f.schema.label && f.schema.help)).toBe(true);
      expect(form.fields.filter((f) => f.baselineEligible).every((f) => f.id.startsWith("configuration.") && !f.schema.readOnly && !f.id.startsWith("configuration.system."))).toBe(true);
      expect(form.fields.find((f) => f.id === "configuration.station.standbyMode")?.schema.options?.map((o) => o.value)).toEqual(["hot", "cold"]);
      expect(adapter.validate(definition, "final").filter((i) => i.severity === "error")).toEqual([]);
      const changed = adapter.apply(definition, [{ fieldId: "configuration.station.stationName", value: "Test station" }]);
      expect((changed as typeof expected).configuration.station.stationName).toBe("Test station");
      expect(definition).toEqual(expected);
      expect(adapter.preview(changed).recoveryVerified).toBe(false);
    }
  });
});

describe("typed native lists", () => {
  it("offers every native fault/measurement variant with exact typed controls", () => {
    for (const adapter of mopiensAuthoringAdapters) {
      const form = adapter.form(adapter.createDefault());
      const faults = form.fields.find(f => f.id === "runtime.faults")!;
      const overrides = form.fields.find(f => f.id === "runtime.measurementOverrides")!;
      expect(faults.schema.discriminator).toBe("kind");
      expect(faults.schema.variants?.length).toBe(adapter.moduleId === "dvor-220" ? 7 : 21);
      expect(overrides.schema.discriminator).toBe("parameter");
      expect(overrides.schema.variants?.length).toBe(adapter.moduleId === "dvor-220" ? 9 : 12);
      for (const field of [faults, overrides]) {
        expect(field.baselineEligible).toBe(false);
        for (const variant of field.schema.variants!) {
          const changed = adapter.apply(adapter.createDefault(), [{ fieldId: field.id, value: [variant.initial] }]);
          expect(adapter.validate(changed, "final").filter(i => i.severity === "error"), variant.value).toEqual([]);
        }
      }
      expect(() => adapter.apply(adapter.createDefault(), [{fieldId: "runtime.faults", value: [{id: "f", kind: "unknown"}]}])).toThrow();
      const variant = faults.schema.variants![0];
      expect(() => adapter.apply(adapter.createDefault(), [{fieldId: "runtime.faults", value: [{...variant.initial as object, unknown: true}]}])).toThrow();
      expect(() => adapter.apply(adapter.createDefault(), [{fieldId: "runtime.measurementOverrides", value: [{monitorId: "mon1", channel: "executive", channelId: "cha", parameter: "peakPowerWatts", value: "wrong"}]}])).toThrow();
    }
  });
  it("handles DVOR antenna, environment boolean/temperature and DME nullable IDENT/spacing", () => {
    const [dvor, dme] = mopiensAuthoringAdapters;
    const antenna = dvor.form(dvor.createDefault()).fields.find(f => f.id === "runtime.antennaVswr")!;
    expect(antenna.schema.item?.properties?.antenna).toMatchObject({type: "number", min: 1, max: 48, step: 1});
    for (const entry of [{id: "smoke", kind: "environment", sensor: "smoke", value: true}, {id: "heat", kind: "environment", sensor: "temperature", value: 50}]) {
      expect(dvor.validate(dvor.apply(dvor.createDefault(), [{fieldId: "runtime.faults", value: [entry]}]), "final").filter(i => i.severity === "error")).toEqual([]);
    }
    expect(() => dvor.apply(dvor.createDefault(), [{fieldId: "runtime.faults", value: [{id: "bad", kind: "environment", sensor: "smoke", value: 42}]}])).toThrow();
    expect(() => dvor.apply(dvor.createDefault(), [{fieldId: "runtime.antennaVswr", value: [{antenna: 49, usbVswr: 1.2, lsbVswr: 1.2}]}])).toThrow();
    const changed = dme.apply(dme.createDefault(), [{fieldId: "runtime.spacingOffsetsUs.tx1", value: 1}, {fieldId: "runtime.measurementOverrides", value: [{monitorId: "mon1", channel: "executive", parameter: "identCode", value: null, valid: false}]}]);
    expect(dme.validate(changed, "final").filter(i => i.severity === "error")).toEqual([]);
    expect(dme.preview(changed).notes.join(" ")).toMatch(/forced|override/i);
    expect(dme.preview(changed).recoveryVerified).toBe(false);
  });
});

describe("MOPIENS safety and native semantics", () => {
  it("rejects unknown/protected shapes before preview and rejects cross-field invalid apply atomically", () => {
    for (const adapter of mopiensAuthoringAdapters) {
      const original = adapter.createDefault();
      const injected = {...original, actor: {id: "secret"}};
      expect(adapter.validate(injected, "final").some(i => i.severity === "error")).toBe(true);
      expect(() => adapter.form(injected)).toThrow();
      expect(() => adapter.apply(injected, [])).toThrow();
      const protectedInput = structuredClone(original) as ReturnType<typeof createDefaultDme320ScenarioDefinition>;
      protectedInput.configuration.system.allowGuestAccess = !protectedInput.configuration.system.allowGuestAccess;
      expect(adapter.validate(protectedInput, "final").some(i => i.severity === "error")).toBe(true);
      for (const fieldId of ["configuration.system.allowGuestAccess", "configuration.system", "__proto__.polluted", "runtime.notReal", "schemaVersion"]) {
        expect(() => adapter.apply(original, [{fieldId, value: true}])).toThrow();
      }
      const prefix = adapter.moduleId === "dvor-220" ? "configuration.thermal.tx1" : "configuration.thermal";
      expect(() => adapter.apply(original, [{fieldId: `${prefix}.fanStopC`, value: 190}])).toThrow();
      expect(adapter.createDefault()).toEqual(original);
      const poison = JSON.parse('{"__proto__":{"polluted":true}}');
      expect(() => adapter.apply(original, [{fieldId: "runtime.faults", value: [poison]}])).toThrow();
      expect(() => adapter.apply(original, [{fieldId: "configuration.station.stationName", value: Object.create({evil: true})}])).toThrow();
      expect(() => adapter.apply(original, [{fieldId: "runtime.temperaturesC.tx1", value: Infinity}])).toThrow();
    }
  });
  it("uses final native parser, disables duplicate targets, and makes read-only units immutable", () => {
    const [dvor, dme] = mopiensAuthoringAdapters;
    const bad = dvor.createDefault() as ReturnType<typeof createDefaultDvor220ScenarioDefinition>;
    bad.runtime.mainTransmitterId = "invalid" as "tx1";
    expect(dvor.preview(bad).status).toBe("invalid");
    expect(() => dvor.apply(dvor.createDefault(), [{fieldId: "runtime.faults", value: [{id: "f", kind: "pdc", condition: "alarm"}, {id: "f", kind: "pdc", condition: "fault"}]}])).toThrow();
    expect(() => dvor.apply(dvor.createDefault(), [{fieldId: "runtime.antennaVswr", value: [{antenna: 1, usbVswr: 2, lsbVswr: 2}, {antenna: 1, usbVswr: 3, lsbVswr: 3}]}])).toThrow();
    const fieldId = "configuration.monitor.limits.peakPowerWatts.unit";
    expect(dme.form(dme.createDefault()).fields.find(f => f.id === fieldId)).toMatchObject({baselineEligible: false, schema: {readOnly: true}});
    expect(() => dme.apply(dme.createDefault(), [{fieldId, value: "MHz"}])).toThrow();
    const tampered = dme.createDefault() as ReturnType<typeof createDefaultDme320ScenarioDefinition>;
    tampered.configuration.monitor.limits.peakPowerWatts.unit = "MHz";
    expect(dme.validate(tampered, "final").some(i => i.severity === "error")).toBe(true);
  });
  it("rebases DME channel-dependent limits using native semantics without overwriting explicit edits", () => {
    const dme = mopiensAuthoringAdapters[1];
    const original = dme.createDefault() as ReturnType<typeof createDefaultDme320ScenarioDefinition>;
    const changed = dme.apply(original, [{fieldId: "configuration.station.channel.suffix", value: "Y"}]) as typeof original;
    expect(changed.configuration.monitor.limits.pulseSpacingUs.nominal).not.toBe(original.configuration.monitor.limits.pulseSpacingUs.nominal);
    expect(original.configuration.station.channel.suffix).toBe("X");
    const override = dme.apply(original, [{fieldId: "configuration.station.channel.suffix", value: "Y"}, {fieldId: "configuration.monitor.limits.pulseSpacingUs.nominal", value: changed.configuration.monitor.limits.pulseSpacingUs.nominal}]) as typeof original;
    expect(override.configuration.monitor.limits.pulseSpacingUs).toEqual(changed.configuration.monitor.limits.pulseSpacingUs);
  });
});

describe("MOPIENS public form boundary", () => {
  it("does not serialize unknown list fields and labels engine derived fields read-only", () => {
    for (const adapter of mopiensAuthoringAdapters) {
      const bad = adapter.createDefault() as ReturnType<typeof createDefaultDme320ScenarioDefinition>;
      bad.runtime.faults = [{id: "f", kind: "hpa-low-output", target: "tx1", actor: {password: "not-public"}}] as unknown as typeof bad.runtime.faults;
      expect(() => adapter.form(bad)).toThrow();
      const form = adapter.form(adapter.createDefault());
      const derived = form.fields.filter(f => f.id.startsWith("derived."));
      expect(derived.length).toBeGreaterThan(0);
      expect(derived.every(f => f.schema.readOnly && !f.baselineEligible)).toBe(true);
      for (const field of derived) expect(() => adapter.apply(adapter.createDefault(), [{fieldId: field.id, value: field.value}])).toThrow();
    }
  });
  it("surfaces native warnings and routes cross-field issues to their real section", () => {
    const [dvor, dme] = mopiensAuthoringAdapters;
    expect(dvor.validate(dvor.createDefault(), "final").some(i => i.severity === "warning" && i.fieldId === "configuration.monitor.executiveAlarmDelayMs")).toBe(true);
    const bad = dme.createDefault() as ReturnType<typeof createDefaultDme320ScenarioDefinition>;
    bad.configuration.thermal.fanStopC = 100;
    expect(dme.validate(bad, "final").some(i => i.sectionId === "plant" && i.message.includes("Fan stop"))).toBe(true);
  });
});

describe("native field constraints", () => {
  it("keeps units on all monitor values and enforces invalid list IDs and native limits", () => {
    const [dvor, dme] = mopiensAuthoringAdapters;
    const form = dme.form(dme.createDefault());
    expect(form.fields.find(f => f.id === "configuration.monitor.limits.timeDelayUs.nominal")?.schema.unit).toBe("µs");
    expect(form.fields.find(f => f.id === "configuration.monitor.limits.peakPowerWatts.alarmLow")?.schema.unit).toBe("W");
    expect(() => dvor.apply(dvor.createDefault(), [{fieldId: "configuration.communication.pmdtRs232BaudRate", value: 12345}])).toThrow();
    expect(() => dme.apply(dme.createDefault(), [{fieldId: "runtime.faults", value: [{id: "fault", kind: "hpa-low-output", target: "mon1"}]}])).toThrow();
    expect(() => dvor.apply(dvor.createDefault(), [{fieldId: "runtime.faults", value: [{id: "fault", kind: "monitor-parameter", monitorId: "mon3", channelId: "cha", parameter: "rfLevel", value: 2}]}])).toThrow();
    expect(() => dme.apply(dme.createDefault(), [{fieldId: "configuration.environment.analogInputsEnabled", value: [true]}])).toThrow();
    expect(() => dme.apply(dme.createDefault(), [{fieldId: "configuration.station.channel.number", value: 1.5}])).toThrow();
    expect(() => dvor.apply(dvor.createDefault(), [{fieldId: "configuration.station.frequencyMHz", value: 113.01}])).toThrow();
    expect(() => dme.apply(dme.createDefault(), [{fieldId: "runtime.measurementOverrides", value: [{monitorId: "mon1", channel: "executive", parameter: "identCode", value: "1234"}]}])).toThrow();
  });
});

describe("MOPIENS native catalog audit", () => {
  it("preserves native startup defaults and gives novice labels for startup and criteria", () => {
    for (const a of mopiensAuthoringAdapters) {
      const d=a.createDefault(), form=a.form(d);
      for(const field of form.fields.filter(f=>/startMonitorBypassed$|^successCriteria\./.test(f.id))) {
        expect(field.schema.label).not.toContain("require ");
        expect(field.schema.label).not.toContain("start Monitor");
        expect(field.schema.help).not.toContain("Trường native");
        expect(field.value).toEqual(readPath(d,field.id));
        expect(field.baselineEligible).toBe(false);
      }
      const faults=form.fields.find(f=>f.id==="runtime.faults")!;
      const measurements=form.fields.find(f=>f.id==="runtime.measurementOverrides")!;
      if(a.moduleId==="dme-320") expect(faults.schema.variants!.map(v=>v.value).sort()).toEqual(Object.keys(DME320_FAULT_CATALOG).sort());
      expect(measurements.schema.variants!.map(v=>v.value)).toEqual(a.moduleId==="dvor-220"?DVOR220_MONITOR_PARAMETERS:DME320_MONITOR_PARAMETERS);
      expect(form.fields.find(f=>f.id===`configuration.station.${a.moduleId==="dvor-220"?"carrierPowerW":"powerOutputWatts"}`)).toMatchObject({baselineEligible:true});
      for(const field of form.fields.filter(f=>f.id.startsWith("runtime.")))expect(field.baselineEligible,field.id).toBe(false);
      process.stdout.write("NATIVE_FORM_AUDIT "+JSON.stringify({moduleId:a.moduleId,fields:form.fields.length,writable:form.fields.filter(f=>!f.schema.readOnly).length,derived:form.fields.filter(f=>f.id.startsWith("derived.")).length,baseline:form.fields.filter(f=>f.baselineEligible).length,excluded:leaves(d).filter(id=>security.test(id)).length})+"\n");
    }
  });
  it("does not offer unsupported nullable DVOR import conversions or protect writable DME thresholds", () => {
    const [dvor,dme]=mopiensAuthoringAdapters;
    for (const f of dvor.form(dvor.createDefault()).fields.filter(f=>/\.(lowerAlarm|lowerWarning|upperWarning|upperAlarm)$/.test(f.id))) {
      if (f.value === null) {
        expect(f.schema.readOnly,f.id).toBe(true);
        expect(f.baselineEligible).toBe(false);
      } else expect(f.schema.nullable,f.id).not.toBe(true);
      expect(f.schema.help).toMatch(/parser|import/i);
    }
    const f=dme.form(dme.createDefault()).fields.find(f=>f.id==="configuration.monitor.limits.peakPowerWatts.alarmLow")!;
    expect(f.schema.nullable).toBe(true);
    expect(()=>dme.apply(dme.createDefault(),[{fieldId:f.id,value:null}])).not.toThrow();
  });
  it("all native initial controls validate without raw JSON editors", () => {
    for(const a of mopiensAuthoringAdapters) for(const field of a.form(a.createDefault()).fields) expect(validateFieldValue(field.schema,field.value),`${a.moduleId}/${field.id}`).toEqual([]);
  });
});
