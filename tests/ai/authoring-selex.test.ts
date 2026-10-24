import { describe, expect, it } from "vitest";
import { selexAuthoringAdapters } from "@/lib/ai/scenario-authoring/forms/selex";
import { createDefaultDvor1150ScenarioDefinition } from "@/lib/dvor1150/scenario";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { createDefaultDme1119aScenarioDefinition, previewDme1119aScenario } from "@/lib/dme1119a/scenario";
import { dvor1150ConfigFieldCatalog } from "@/lib/dvor1150/config-utils";
import { dvorConfigFieldCatalog } from "@/lib/dvor1150a/config-utils";
import { dmeParameterFieldCatalog, getDmeParameterValue } from "@/lib/dme1119a/config";
import type { JsonValue } from "@/lib/ai/scenario-authoring/types";
import { parseScenarioParameters } from "@/lib/scenario-parameters";
import { readPath, validateFieldValue } from "@/lib/ai/scenario-authoring/forms/helpers";

const factories = [createDefaultDvor1150ScenarioDefinition, createDefaultDvor1150aScenarioDefinition, createDefaultDme1119aScenarioDefinition];
const catalogs = [dvor1150ConfigFieldCatalog, dvorConfigFieldCatalog, dmeParameterFieldCatalog];
describe("SELEX guided authoring", () => {
  it("uses detached native defaults and exposes every native authorable config field exactly once", () => {
    expect(selexAuthoringAdapters.map(a => a.moduleId)).toEqual(["dvor-1150", "dvor-1150a", "dme-1119a"]);
    selexAuthoringAdapters.forEach((adapter, index) => {
      const d = adapter.createDefault();
      expect(d).toEqual(factories[index]());
      const form = adapter.form(d);
      expect(form.sections.map(s => s.id)).toEqual(["metadata", "initial", "faults", "criteria", "diagnosis", "permissions"]);
      for (const section of form.sections) expect(form.fields.some(f => f.sectionId === section.id)).toBe(true);
      expect(new Set(form.fields.map(f => f.id)).size).toBe(form.fields.length);
      for (const native of catalogs[index]) {
        if (("readOnly" in native && native.readOnly) || readPath(d, `configuration.${native.id}`) === undefined || /security|password|credential|smoke|intrusion|entryDelay|exitDelay/i.test(native.id) || /^simulation\.|^transmitters\.(tx1|tx2)\.(enabled|onAir|load)$|^monitorTransmitterStatus\.(mainSelect|antennaSelect|transmitterOn\.)/.test(native.id)) continue;
        const f = form.fields.find(f => f.id === `configuration.${native.id}`);
        expect(f, native.id).toBeDefined();
        expect(f!.value).toEqual(readPath(d, `configuration.${native.id}`));
        expect(f!.schema.help.length).toBeGreaterThan(0);
        expect(f!.schema.type).toBe(native.type);
        expect(f!.schema.unit).toBe(native.unit);
        expect(f!.schema.options?.map(o => o.value)).toEqual(native.options);
      }
      for (const field of form.fields.filter(f => f.baselineEligible)) {
        expect(field.id.startsWith("configuration.")).toBe(true);
        expect(field.sectionId).toBe("initial");
      }
      expect(form.fields.some(f => /password|securityAccounts/i.test(f.id))).toBe(false);
      d.name = "changed";
      expect(adapter.createDefault()).toEqual(factories[index]());
      if ("faultInjections" in d) expect(d.faultInjections).toEqual([]);
      expect("diagnosis" in d).toBe(false);
    });
  });
  it("keeps nominal power eligible, native section names and friendly startup/criteria labels", () => {
    for (const a of selexAuthoringAdapters) {
      const form = a.form(a.createDefault());
      expect(form.sections.slice(1).map(s => s.title)).toEqual(["1. Trạng thái khởi đầu", "2. Lỗi đưa vào", "3. Điều kiện đạt", "4. Chẩn đoán hai bước", "5. Quyền chỉnh sửa của thí sinh"]);
      for (const field of form.fields.filter(f => f.id.startsWith("startPolicy.") || f.id.startsWith("successCriteria."))) {
        expect(field.schema.label).not.toBe(field.id.split(".").at(-1));
        expect(field.baselineEligible).toBe(false);
      }
      if (a.moduleId !== "dme-1119a") expect(form.fields.find(f => f.id === "configuration.transmitters.tx1.nominal.outputPower")).toMatchObject({sectionId:"initial",baselineEligible:true});
      for (const field of form.fields.filter(f => /rawMeasurements|\.faults\.|offsets\.(outputPowerScale|cabinetTemperatureOffset|sideband\dRfLevelScale)/.test(f.id))) expect(field.baselineEligible, field.id).toBe(false);
    }
  });
  it("authors all DME typed fault and criterion variants and rejects extra union keys", () => {
    const a = selexAuthoringAdapters[2], d = a.createDefault(), f = a.form(d);
    const faults = f.fields.find(f => f.id === "faultInjections")!.schema;
    const criteria = f.fields.find(f => f.id === "successCriteria")!.schema;
    expect(faults.variants).toHaveLength(11);
    expect(criteria.variants).toHaveLength(10);
    for (const schema of [faults, criteria]) for (const v of schema.variants!) {
      expect(v.schema.type).toBe("object");
      expect(v.schema.properties?.kind.options?.map(o=>o.value)).toEqual([v.value]);
      const fieldId = schema === faults ? "faultInjections" : "successCriteria";
      const next = a.apply(d, [{fieldId,value:[{...(v.initial as object),id:"test-entry"}] as JsonValue}]);
      expect(readPath(next,fieldId)).toEqual([{...(v.initial as object),id:"test-entry"}]);
      expect(a.validate(next,"final").filter(i=>i.severity === "error")).toEqual([]);
      expect(()=>a.apply(d,[{fieldId,value:[{...(v.initial as object),id:"test-entry",unknown:1}] as JsonValue}])).toThrow();
    }
    expect(a.createDefault()).toEqual(d);
  });
  it("edits custom diagnoses with real views/actions/hardware and maps policy without granting protected roles", () => {
    for (const a of selexAuthoringAdapters) {
      const d=a.createDefault(), f=a.form(d);
      const diagnosis=f.fields.find(f=>f.id==="diagnosis")!.schema;
      expect(Object.keys(diagnosis.properties ?? {})).toEqual(["disposition","diagnosticRun","diagnosticSubsystem","diagnosticResult","faultSummary","manualReferences","pmdtCheckpoints","requiredActionControlIds","expectedHardware"]);
      const view=diagnosis.properties!.pmdtCheckpoints.item!.properties!.viewId.options![0].value;
      const hardware=diagnosis.properties!.expectedHardware.variants![0].initial;
      const value={disposition:"replace-module",diagnosticRun:"full",diagnosticSubsystem:"Custom subsystem",diagnosticResult:"Examiner result",faultSummary:"Not from a preset",manualReferences:["manual §1"],pmdtCheckpoints:[{id:"observe",label:"Inspect",viewId:view}],requiredActionControlIds:["diagnostics-run-full"],expectedHardware:[hardware]};
      const next=a.apply(d,[{fieldId:"diagnosis",value}]);
      expect(readPath(next,"diagnosis")).toEqual(value);
      expect(a.validate(next,"final").filter(i=>i.severity==="error")).toEqual([]);
      expect(()=>a.apply(d,[{fieldId:"diagnosis",value:{...value,requiredActionControlIds:["invented-action"]}}])).toThrow();
      expect(()=>a.apply(d,[{fieldId:"diagnosis",value:{...value,expectedHardware:[{...(hardware as object),blockId:"fake"}]}}])).toThrow();
      expect(()=>a.apply(d,[{fieldId:"diagnosis",value:{...value,disposition:"software-adjustment"}}])).toThrow();
      const allowed=f.fields.find(f=>f.id==="studentEditableFieldIds")!;
      expect(allowed.schema.item!.options!.some(o=>/faults|rawMeasurements|security|simulation/.test(o.value))).toBe(false);
      const fieldId=allowed.schema.item!.options![0].value;
      const restricted=a.apply(d,[{fieldId:"editPolicy.mode",value:"restricted"},{fieldId:"studentEditableFieldIds",value:[fieldId]}]);
      expect(readPath(restricted,"editPolicy")).toEqual({mode:"restricted",allowedFieldIds:[fieldId]});
      expect(readPath(restricted,"studentEditableFieldIds")).toEqual([fieldId]);
      const open=a.apply(restricted,[{fieldId:"editPolicy.mode",value:"open"}]);
      expect(readPath(open,"studentEditableFieldIds")).toEqual([]);
      expect(()=>a.apply(d,[{fieldId:"studentEditableFieldIds",value:["transmitters.tx1.faults.disabled"]}])).toThrow();
    }
  });
  it("rejects malformed source, bad invariants and unsafe edits without mutating defaults", () => {
    for (const a of selexAuthoringAdapters) {
      const d=a.createDefault();
      const malformed=[{...d,unknown:true},{...d,startPolicy:{...(d as {startPolicy:object}).startPolicy,unknown:true}},JSON.parse(JSON.stringify(d).replace('"name":','"__proto__":{},"name":'))];
      for (const source of malformed) {
        expect(a.validate(source,"final").some(i=>i.severity==="error")).toBe(true);
        expect(()=>a.apply(source,[{fieldId:"name",value:"safe"}])).toThrow();
      }
      for(const change of [{fieldId:"__proto__.polluted",value:true},{fieldId:"configuration.constructor.prototype.polluted",value:true},{fieldId:"unknown",value:1},{fieldId:"name",value:NaN},{fieldId:"diagnosis",value:Object.create({polluted:true})}]) expect(()=>a.apply(d,[change])).toThrow();
      const bypass=a.moduleId==="dme-1119a"?"integralMonitorBypassed":"startMonitorBypassed";
      const nativeValid = structuredClone(d);
      Object.assign((nativeValid as {startPolicy:object}).startPolicy, {startLocal:false,[bypass]:true});
      expect(parseScenarioParameters(a.moduleId,nativeValid)).not.toBeNull();
      expect(a.apply(d,[{fieldId:"startPolicy.startLocal",value:false},{fieldId:`startPolicy.${bypass}`,value:true}])).toMatchObject(nativeValid);
      const field=a.form(d).fields.find(f=>f.schema.type==="number")!;
      expect(()=>a.apply(d,[{fieldId:field.id,value:Infinity}])).toThrow();
      expect(()=>a.apply(d,[{fieldId:field.id,value:"12"}])).toThrow();
      const cfg=structuredClone(d) as unknown as Record<string,unknown>;
      cfg.editPolicy={mode:"restricted",allowedFieldIds:[]};cfg.studentEditableFieldIds=["forged"];
      expect(a.validate(cfg as unknown as typeof d,"final").some(i=>i.severity==="error")).toBe(true);
      const limits=a.form(d).fields.filter(f=>/alarmLow$|\.low$/.test(f.id));
      if(limits.length) expect(()=>a.apply(d,[{fieldId:limits[0].id,value:999}])).toThrow();
      expect(d).toEqual(a.createDefault());
    }
  });
  it("previews only real initial engine checks, never learner recovery or synthetic diagnosis evidence", () => {
    for(const a of selexAuthoringAdapters){
      const d=a.createDefault(), before=structuredClone(d), preview=a.preview(d);
      expect(preview.status).toBe("valid");
      expect(preview.recoveryVerified).toBe(false);
      expect(preview.checks.length).toBeGreaterThan(0);
      expect(preview.checks.every(c=>c.passed)).toBe(true);
      expect(preview.notes.join(" ")).toMatch(/khôi phục|recovery/i);
      expect(d).toEqual(before);
      expect(a.preview({...d,unknown:true} as unknown as typeof d).status).toBe("invalid");
    }
    const a=selexAuthoringAdapters[2];
    const faulty=a.apply(a.createDefault(),[{fieldId:"faultInjections",value:[{id:"loss",kind:"tx-power-loss",transmitter:"tx1",lossDb:30}]}]);
    expect(a.preview(faulty).checks.some(c=>!c.passed)).toBe(true);
    expect(a.preview(faulty).recoveryVerified).toBe(false);
  });
  it("rejects hidden runtime source changes and reports structured authoring errors", () => {
    const a=selexAuthoringAdapters[0],d=a.createDefault();
    const mutated=structuredClone(d);
    (mutated as ReturnType<typeof createDefaultDvor1150ScenarioDefinition>).configuration.simulation.alert=true;
    expect(a.validate(mutated,"final").some(i=>i.severity==="error")).toBe(true);
    expect(()=>a.form(mutated)).toThrow();
    try {a.apply(d,[{fieldId:"configuration.monitor.alarmLimits.azimuth.alarmLow",value:900}]);throw new Error("unexpected success");}catch(error){expect(error).toMatchObject({name:"AuthoringError",code:"INVALID_FIELD"});}
  });
  it("covers manual catalog controls including smoke sensors and explains every exclusion", () => {
    selexAuthoringAdapters.forEach((a, index) => {
      const d=a.createDefault(), form=a.form(d);
      process.stdout.write("NATIVE_FORM_AUDIT "+JSON.stringify({moduleId:a.moduleId,catalog:catalogs[index].length,fields:form.fields.length,writable:form.fields.filter(f=>!f.schema.readOnly).length,derived:form.fields.filter(f=>f.id.startsWith("derived.")).length,baseline:form.fields.filter(f=>f.baselineEligible).length,excluded:catalogs[index].filter(n=>!form.fields.some(f=>f.id===`configuration.${n.id}`||f.id===`derived.${n.id}`)).map(f=>f.id)})+"\n");
      for (const native of catalogs[index]) {
        const id=`configuration.${native.id}`;
        const field=form.fields.find(f=>f.id===id || f.id===`derived.${native.id}`);
        if (field) {
          if ("readOnly" in native && native.readOnly) {
            expect(field.schema.readOnly).toBe(true);
            expect(field.baselineEligible).toBe(false);
            expect(()=>a.apply(d,[{fieldId:field.id,value:field.value}])).toThrow();
          }
          continue;
        }
        expect(form.notices.some(n=>n.includes(native.id)), native.id).toBe(true);
      }
      for(const field of catalogs[index].filter(f=>/smoke|intrusion|entryDelay|exitDelay/i.test(f.id))) {
        if(readPath(d,`configuration.${field.id}`)===undefined)continue;
        expect(form.fields.find(f=>f.id===`configuration.${field.id}`),field.id).toBeDefined();
        expect(()=>a.apply(d,[{fieldId:`configuration.${field.id}`,value:readPath(d,`configuration.${field.id}`)!}])).not.toThrow();
      }
    });
  });
  it("keeps a native-valid diagnosis-only scenario with all operational criteria unchecked", () => {
    for (const a of selexAuthoringAdapters.slice(0,2)) {
      const d=a.createDefault();
      const changes=a.form(d).fields.filter(f=>f.id.startsWith("successCriteria.")&&f.schema.type==="boolean").map(f=>({fieldId:f.id,value:false}));
      const nativeValid=structuredClone(d);
      Object.assign((nativeValid as {successCriteria:object}).successCriteria,Object.fromEntries(changes.map(c=>[c.fieldId.split(".")[1],false])));
      expect(parseScenarioParameters(a.moduleId,nativeValid)).not.toBeNull();
      expect(a.apply(d,changes)).toMatchObject(nativeValid);
    }
  });
  it("shows every native read-only DME projection through its native getter", () => {
    const a=selexAuthoringAdapters[2],d=a.createDefault(),form=a.form(d);
    const runtime=previewDme1119aScenario(d as ReturnType<typeof createDefaultDme1119aScenarioDefinition>).data;
    for(const field of dmeParameterFieldCatalog.filter(f=>f.readOnly)) expect(form.fields.find(f=>f.id===`derived.${field.id}`),field.id).toMatchObject({schema:{readOnly:true},value:getDmeParameterValue(runtime,field.id),baselineEligible:false});
  });
  it("rejects unknown structured keys before the public form can serialize them", () => {
    for(const a of selexAuthoringAdapters) {
      const d=a.createDefault(),schema=a.form(d).fields.find(f=>f.id==="diagnosis")!.schema;
      const injected={...d,diagnosis:{...schema.initial as object,diagnosticSubsystem:"Monitor",diagnosticResult:"Review",faultSummary:"Review",actor:{password:"not-public"}}};
      expect(()=>a.form(injected as typeof d)).toThrow();
    }
  });
  it("all prefilled values satisfy the public control schemas", () => {
    for(const a of selexAuthoringAdapters)for(const f of a.form(a.createDefault()).fields)expect(validateFieldValue(f.schema,f.value),`${a.moduleId}/${f.id}`).toEqual([]);
  });
});
