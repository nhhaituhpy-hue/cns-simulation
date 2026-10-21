import { describe, expect, it } from "vitest";
import { adsbAuthoringAdapter as adapter } from "@/lib/ai/scenario-authoring/forms/adsb";
import { CON_SON_HARDWARE, CON_SON_SIGNAL_PATHS } from "@/lib/hardware-model";
import { TerminalEngine } from "@/lib/terminal-engine";
import { parseAdsbScenarioDefinition } from "@/modules/devices/adsb/scenario-parameters";
import { getDefaultAdsbConfig } from "@/lib/simulator-config/ads-b";
import type { AdsbScenarioDefinition } from "@/modules/devices/adsb/scenario-parameters";
const base = () => adapter.createDefault() as AdsbScenarioDefinition;
describe("ADS-B guided authoring", () => {
  it("starts from native normal config without fault or expected workflow", () => {
    const d = base();
    expect(d.hardwareFault).toBeUndefined();
    expect(d.expectedActions).toEqual([]);
    expect(d.sites[0].sensorA!.dataProfile).toEqual(getDefaultAdsbConfig().sensorDataProfile);
    expect(adapter.validate(d, "draft")).toEqual([]);
    const form = adapter.form(d);
    expect(form.sections.map(s => s.id)).toEqual(["metadata", "sites", "login", "actions", "hardware"]);
    expect(form.fields.find(f => f.id === "hardwareFault")?.value).toBeNull();
    expect(form.fields.find(f => f.id === "actionPlan")?.baselineEligible).toBe(false);
    expect(adapter.validate(d, "final").some(i => i.sectionId === "actions")).toBe(true);
    expect(adapter.preview(d).recoveryVerified).toBe(false);
  });
});

it("compiles arbitrary native E2E inputs and explicit cross-login SAC/SIC changes", () => {
 const d = base();
 const edited = adapter.apply(d, [{fieldId: "actionPlan", value: [
  {loginUser: "sysadmin", inputs: ["9", "1", "0", "7", "10", "2", "1", "181", "122", "0", "X"]},
  {loginUser: "maintenance", inputs: ["1", "1", "2", "82", "0", "3", "207", "0"]},
 ]}]) as AdsbScenarioDefinition;
 expect(edited.expectedActions.length).toBeGreaterThan(10);
 expect(edited.expectedActions.some(a => a.input === "181")).toBe(true);
 expect(edited.expectedActions.some(a => a.input === "207")).toBe(true);
 expect(adapter.validate(edited, "final")).toEqual([]);
 expect(adapter.form(edited).fields.find(f => f.id === "actionPlan")!.value).toEqual([
  {loginUser: "sysadmin", inputs: ["9", "1", "0", "7", "10", "2", "1", "181", "122", "0", "X"]},
  {loginUser: "maintenance", inputs: ["1", "1", "2", "82", "0", "3", "207", "0"]},
 ]);
 expect(d.expectedActions).toEqual([]);
});
it("rejects role jumps, credential workflows and unfinished actions", () => {
 for (const plan of [
  [{loginUser: "maintenance", inputs: ["1"]}],
  [{loginUser: "sysadmin", inputs: ["1"]}, {loginUser: "maintenance", inputs: ["1"]}],
  [{loginUser: "sysadmin", inputs: ["9"]}],
  [{loginUser: "sysadmin", inputs: ["999"]}],
  [{loginUser: "sysadmin", inputs: ["9","1","0","7","9"]}],
 ]) expect(() => adapter.apply(base(), [{fieldId: "actionPlan", value: plan}])).toThrow();
});

it("exposes typed sites/profiles and validates nullable sensors and IP consistency", () => {
 const d=base(); const form=adapter.form(d);
 const sites=form.fields.find(f=>f.id==="sites")!;
 expect(sites.schema.type).toBe("array");
 expect(sites.schema.item!.properties!.sensorA.properties!.dataProfile.properties!.clients.item!.properties!.protocol.type).toBe("select");
 expect(form.fields.find(f=>f.id==="eventLog")!.sectionId).toBe("sites");
 const next=structuredClone(d.sites); next[0].sensorB=null; next[0].sensorA!.dataProfile!.asterix.sac=73;
 const edited=adapter.apply(d,[{fieldId:"sites",value:next as never}]) as AdsbScenarioDefinition;
 expect(edited.sites[0].sensorA!.dataProfile!.asterix.sac).toBe(73);
 for (const mutate of [
  (x:typeof next)=>{x[0].sensorA=null;},
  (x:typeof next)=>{x[0].sensorB=structuredClone(x[0].sensorA);},
  (x:typeof next)=>{x[0].sensorA!.ipAddress="10.1.2.3";},
  (x:typeof next)=>{x[0].sensorA!.dataProfile!.clients[0].protocol="SSH" as never;},
  (x:typeof next)=>{x[0].sensorA!.dataProfile!.asterix.sac=NaN;},
  (x:typeof next)=>{Object.assign(x[0].sensorA!,{password:"forbidden"});},
 ]) { const bad=structuredClone(next); mutate(bad); expect(()=>adapter.apply(d,[{fieldId:"sites",value:bad as never}])).toThrow(); }
 expect(()=>adapter.apply(d,[{fieldId:"targetLoginUser",value:"root"}])).toThrow();
 expect(()=>adapter.apply(d,[{fieldId:"__proto__.polluted",value:true}])).toThrow();
 expect(()=>adapter.apply(d,[{fieldId:"sites",value:[Object.create({name:"bad"})]}])).toThrow();
});
it("rejects forged native action labels on validate and reports honest preview", () => {
 const d=adapter.apply(base(),[{fieldId:"actionPlan",value:[{loginUser:"sysadmin",inputs:["1"]}]}]) as AdsbScenarioDefinition;
 d.expectedActions[0].resultLabel="Pretend repaired GPS";
 expect(adapter.validate(d,"final").some(i=>i.sectionId==="actions")).toBe(true);
 expect(adapter.preview(d).status).toBe("invalid");
 expect(adapter.preview(d).recoveryVerified).toBe(false);
});

it("authors complete catalog-backed hardware structures without implying recovery", () => {
 const d=base();
 const fault={faultyComponentIds:["gps-cable-1"],faultType:"disconnected",faultDescription:"Giám khảo cung cấp tình huống cáp GPS.",hardwareLayout:structuredClone(CON_SON_HARDWARE),signalPaths:structuredClone(CON_SON_SIGNAL_PATHS),expectedSensorStatus:"orange",terminalSymptoms:["Đối chiếu GPS status"],qcmsSymptoms:["Quan sát của giám khảo"],diagnosticSteps:["Đối chiếu sơ đồ native"]};
 const result=adapter.apply(d,[{fieldId:"hardwareFault",value:fault as never},{fieldId:"actionPlan",value:[{loginUser:"sysadmin",inputs:["1"]}]}]) as AdsbScenarioDefinition;
 expect(result.hardwareFault).toEqual(fault);
 expect(adapter.form(result).fields.find(f=>f.id==="hardwareFault")!.schema.properties!.hardwareLayout.variants!.length).toBe(CON_SON_HARDWARE.length);
 expect(parseAdsbScenarioDefinition(result)).not.toBeNull();
 expect(adapter.validate(result,"final")).toEqual([]);
 expect(adapter.preview(result).recoveryVerified).toBe(false);
 expect(adapter.apply(result,[{fieldId:"hardwareFault",value:null}])).not.toHaveProperty("hardwareFault");
 for(const mutate of [
  (f:typeof fault)=>{f.faultyComponentIds=["invented-lru"];},
  (f:typeof fault)=>{f.hardwareLayout[0].manufacturer="invented";},
  (f:typeof fault)=>{f.hardwareLayout[0].connectedTo=["invented-lru"];},
  (f:typeof fault)=>{f.signalPaths[0].componentIds=["gps-1","sensor-1"];},
  (f:typeof fault)=>{f.faultType="magic";},
 ]) {const bad=structuredClone(fault);mutate(bad);expect(()=>adapter.apply(d,[{fieldId:"hardwareFault",value:bad as never}])).toThrow();}
});
it("replays nonpreset targets into real persistent values and preserves observations", () => {
 let d=base();
 d=adapter.apply(d,[{fieldId:"actionPlan",value:[{loginUser:"sysadmin",inputs:["9","1","0","7","10","2","1","183","127","0","X"]},{loginUser:"maintenance",inputs:["1","1","2","71","0","3","209","0"]}]}]) as AdsbScenarioDefinition;
 let engine=new TerminalEngine({targetLoginUser:d.targetLoginUser,sensorDataProfile:d.sites[0].sensorA!.dataProfile});
 for(const a of d.expectedActions){if(engine.getState().exited){const state=engine.getPersistentState();engine=new TerminalEngine({targetLoginUser:"maintenance",sensorDataProfile:state.sensorDataProfile});engine.restorePersistentState(state);}expect(engine.processInput(a.input).accepted).toBe(true);}
 expect(engine.getPersistentState().sensorDataProfile).toMatchObject({endToEnd:{alertPower:183,failurePower:127},asterix:{sac:71,sic:209}});
 expect(d.sites[0].sensorA!.dataProfile!.endToEnd).toEqual(base().sites[0].sensorA!.dataProfile!.endToEnd);
 expect(adapter.preview(d).notes.join(" ")).toContain("GPS");
});

it("keeps all optional groups typed and round-trips None", () => {
 const d=base();const sites=adapter.form(d).fields.find(f=>f.id==="sites")!.schema;
 expect(sites.item!.properties!.sensorB.initial).toMatchObject({sensorLabel:"B",dataProfile:getDefaultAdsbConfig().sensorDataProfile});
 expect(sites.item!.properties!.sensorA.properties!.monitoring.nullable).toBe(true);
 const changed=adapter.apply(d,[{fieldId:"sites",value:[{...d.sites[0],sensorA:{...d.sites[0].sensorA!,monitoring:null}}] as never},{fieldId:"eventLog",value:[{timestamp:"2026-10-20T00:00:00Z",type:"qcms",message:"Giám khảo đặt nhật ký."}]}]) as AdsbScenarioDefinition;
 expect(changed.sites[0].sensorA).not.toHaveProperty("monitoring");
 expect(changed.eventLog).toHaveLength(1);
});
it("requires network confirmation and supports reconnect with persistent native config", () => {
 const first={loginUser:"sysadmin",inputs:["2","2","1","10.41.8.3","255.255.255.0","10.41.8.1","0","X"]};
 expect(()=>adapter.apply(base(),[{fieldId:"actionPlan",value:[first]}])).toThrow();
 const result=adapter.apply(base(),[{fieldId:"actionPlan",value:[first,{loginUser:"sysadmin",inputs:["2","3","1","0"]}]}]) as AdsbScenarioDefinition;
 expect(adapter.validate(result,"final")).toEqual([]);
 expect(parseAdsbScenarioDefinition(result)).not.toBeNull();
 expect(adapter.apply(result,[])).toEqual(result);
});

it("never serializes unknown credentials through form and validates event enums", () => {
 const d=base();Object.assign(d.sites[0].sensorA!.dataProfile!,{password:"do-not-send"});
 expect(()=>adapter.form(d)).toThrow();
 expect(adapter.validate(d,"draft").length).toBeGreaterThan(0);
 expect(()=>adapter.apply(base(),[{fieldId:"eventLog",value:[{timestamp:"now",type:"invented",message:"x"}]}])).toThrow();
 const clean=base();Object.assign(clean,{name:{credential:"do-not-send"}});
 expect(()=>adapter.form(clean)).toThrow();
});
it("exposes native menu names as guidance and preserves empty action drafts", () => {
 const form=adapter.form(base());
 expect(form.notices.join(" ")).toContain("System Administrator Main Menu");
 expect(form.notices.join(" ")).toContain("Configure Power Level Thresholds for the End-to-End System Check");
 expect(adapter.apply(base(),[{fieldId:"actionPlan",value:[]}])).toMatchObject({expectedActions:[]});
});

it("requires stable safe unique site and sensor identifiers", () => {
 for(const id of ["site bad", "../site", "__proto__"]){
  const d=base();d.sites[0].id=id;
  expect(()=>adapter.apply(base(),[{fieldId:"sites",value:d.sites as never}])).toThrow();
 }
 const d=base();d.sites[0].sensorA!.id="sensor bad";d.targetSensorId="sensor bad";
 expect(adapter.validate(d,"draft").length).toBeGreaterThan(0);
 const valid=base();valid.sites[0].id="custom-station-82";valid.sites[0].sensorA!.id="receiver-z9";valid.targetSensorId="receiver-z9";
 expect(adapter.validate(valid,"draft")).toEqual([]);
});

it("offers native menu lookup and workflow prompts without restricting arbitrary values", () => {
 const action=adapter.form(base()).fields.find(f=>f.id==="actionPlan")!.schema;
 const input=action.item!.properties!.inputs.item!;
 expect(input.type).toBe("text");
 expect(input.options?.some(o=>o.value==="1"&&o.label.includes("System Administrator Main Menu")&&o.label.includes("General Settings"))).toBe(true);
 expect(action.help).toContain("7 → 10 → 2");
 expect(action.help).toContain("Configure Power Level Thresholds");
 expect(action.help).toContain("Enter");
 expect(adapter.apply(base(),[{fieldId:"actionPlan",value:[{loginUser:"sysadmin",inputs:["9","1","0","7","10","2","1","184","126","0"]}]}])).toBeTruthy();
});
