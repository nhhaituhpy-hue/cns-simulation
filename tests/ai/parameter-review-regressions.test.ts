// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createTemplateDefinition } from "@/lib/ai/scenario-generation/capabilities";
import { parameterAdapterFor } from "@/lib/ai/scenario-generation/parameters";
import { explicitParameterRows, validateParameterProposal } from "@/lib/ai/scenario-generation/parameter-proposal";
import { readParameterReview } from "@/lib/ai/scenario-generation/parameter-review";
import type { ScenarioParameterField } from "@/lib/ai/scenario-generation/parameter-types";

const tx1="configuration.transmitters.tx1.outputPowerPercent";
const tx2="configuration.transmitters.tx2.outputPowerPercent";
function proposed(description:string,initial=35,recovery=100) {
 const input={moduleId:"dme-320" as const,name:"Real native review regression",description,difficulty:"intermediate" as const};
 const value={version:2,status:"supported",moduleId:input.moduleId,templateId:"low-power",explanation:"Use native settings with their individual evidence assertions.",initial:[{fieldId:tx1,value:initial,unit:"%",citation:0}],recovery:[{fieldId:tx1,value:recovery,unit:"%",citation:0}],citations:[{documentId:"request",segmentLabel:"request",quote:description}],unhandledRequirements:[]};
 return {input,value,base:createTemplateDefinition(input.moduleId,"low-power")};
}
function validate(description:string,initial=35,recovery=100){const p=proposed(description,initial,recovery);return validateParameterProposal(p.input,[],p.base,"low-power",p.value);}
describe("independent-review real-adapter regressions",()=>{
 it("does not borrow TX2's value from a same-line assertion",()=>{
  const text=`${tx1} = 35 %; ${tx2} = 50 %. Restore ${tx1} = 100 %.`;
  expect(()=>validate(text,50)).toThrow();
  expect(validate(text).definition).toMatchObject({configuration:{transmitters:{tx1:{outputPowerPercent:35}}}});
 });
 it("does not borrow a unit from the recovery assertion",()=>{
  expect(()=>validate(`${tx1} = 35 W; Restore ${tx1} = 100 %.`)).toThrow();
 });
 it("cannot interchange initial and recovery assertions",()=>{
  expect(()=>validate(`${tx1} = 100 %; Restore ${tx1} = 35 %.`,35,100)).toThrow();
 });
 it.each([
  `SET ${"unknown".repeat(30)} = 5 %`,
  `SET configuration.unknown = ${"x".repeat(301)}`,
  "SET configuration.unknown",
  "RECOVER = 5 %",
  "SET",
 ])("rejects rather than drops malformed explicit requirement %s",line=>{
  const p=proposed(`SET ${tx1} = 35 %\nRECOVER ${tx1} = 100 %\n${line}`);
  expect(()=>explicitParameterRows(p.input,[])).toThrow();
  expect(()=>validateParameterProposal(p.input,[],p.base,"low-power",p.value)).toThrow();
 });
 it("keeps every accepted requirement across a seven-field native recovery report",()=>{
  const base=createTemplateDefinition("dme-320","low-power");
  const fields=parameterAdapterFor("dme-320").fields("dme-320",base);
  const ids=[tx1,tx2,"configuration.station.powerOutputWatts","configuration.station.delayOffsetUs","configuration.station.sensitivityDbm","configuration.station.deadTimeUs","configuration.station.minimumPulseRatePps"];
  const recovery=ids.map(id=>fields.find(f=>f.id===id)!);
  const row=(f:ScenarioParameterField)=>`RECOVER ${f.id} = ${f.id===tx1?100:JSON.stringify(f.value)}${f.unit?" "+f.unit:""}`;
  const description=`SET ${tx1} = 35 %\n`+recovery.map(row).join("\n");
  const p=proposed(description);
  p.value.recovery=recovery.map(f=>({fieldId:f.id,value:(f.id===tx1?100:f.value)as number,unit:f.unit!,citation:0}));
  const result=validateParameterProposal(p.input,[],p.base,"low-power",p.value);
  const review=readParameterReview(result.provenance.parameters);
  expect(review).not.toBeNull();
  expect(review!.recovery).toHaveLength(7);
  expect(review!.verification.recoveryVerified).toBe(true);
  expect(review!.verification.notes.length).toBeLessThan(10);
 });
});

it("preserves all24 distinct accepted recovery rows through public projection",()=>{
 const base=createTemplateDefinition("dvor-220","carrier-9960");
 const adapter=parameterAdapterFor("dvor-220");
 const id="configuration.transmitters.tx1.carrierScalePercent";
 const fields=adapter.fields("dvor-220",base);
 const recovery=fields.filter(f=>f.recovery&&f.group==="configuration").slice(0,24);
 expect(recovery).toHaveLength(24);
 const p=proposed("Native 24-row recovery evidence");
 const initialIds=[id,"configuration.transmitters.tx1.sidebandPowerW.usbCos","configuration.transmitters.tx1.sidebandPowerW.usbSin","configuration.transmitters.tx1.sidebandPowerW.lsbCos","configuration.transmitters.tx1.sidebandPowerW.lsbSin"];
 const initial=initialIds.map(fieldId=>({fieldId,value:fieldId===id?43.7:1,unit:fieldId===id?"%":"W",citation:0}));
 const steps=recovery.map(f=>({fieldId:f.id,value:f.id===id?100:f.id.includes("sidebandPowerW")?1:f.value,unit:f.unit,citation:0}));
 const lines=[...initial.map(r=>`SET ${r.fieldId} = ${JSON.stringify(r.value)} ${r.unit}`),...steps.map(r=>`RECOVER ${r.fieldId} = ${JSON.stringify(r.value)}${r.unit?" "+r.unit:""}`)];
 const evidence=lines.join("\n");
 const doc={id:"max-recovery-doc",name:"native.txt",sha256:"a".repeat(64),segments:[{label:"text",text:evidence}]};
 const chunks=[lines.slice(0,10).join("\n"),lines.slice(10,20).join("\n"),lines.slice(20).join("\n")];
 const citations=chunks.map(quote=>({documentId:doc.id,segmentLabel:"text",quote}));
 const value={...p.value,moduleId:"dvor-220",templateId:"carrier-9960",initial,recovery:steps.map((r,index)=>({...r,citation:Math.floor((index+initial.length)/10)})),citations};
 const input={...p.input,moduleId:"dvor-220" as const};
 const result=validateParameterProposal(input,[doc],base,"carrier-9960",value);
 const review=readParameterReview(result.provenance.parameters);
 expect(review?.recovery).toHaveLength(24);
 expect(review?.verification.recovered.length).toBeLessThanOrEqual(32);
 expect(review?.verification.recoveryVerified).toBe(true);
});

it("fails closed when two native fields share a short evidence label",()=>{
 const base=createTemplateDefinition("dvor-1150a","carrier-9960");
 const description="Output power 13.7 W; restore Output power 125 W; RECOVER startPolicy.startMonitorBypassed = false";
 const input={moduleId:"dvor-1150a" as const,name:"Ambiguous transmitter label",description,difficulty:"basic" as const};
 const proposal={version:2,status:"supported",moduleId:input.moduleId,templateId:"carrier-9960",explanation:"Ambiguous field evidence must not select a transmitter.",initial:[{fieldId:"configuration.transmitters.tx1.nominal.outputPower",value:13.7,unit:"W",citation:0}],recovery:[{fieldId:"configuration.transmitters.tx1.nominal.outputPower",value:125,unit:"W",citation:0},{fieldId:"startPolicy.startMonitorBypassed",value:false,citation:0}],citations:[{documentId:"request",segmentLabel:"request",quote:description}],unhandledRequirements:[]};
 expect(()=>validateParameterProposal(input,[],base,"carrier-9960",proposal)).toThrow();
});

it("does not turn cropped Restore evidence into an initial assertion",()=>{
 const description=`Initial ${tx1} = 50 %; Restore ${tx1} = 35 %; Restore ${tx1} = 100 %.`;
 const p=proposed(description);
 const value={...p.value,citations:[{documentId:"request",segmentLabel:"request",quote:`${tx1} = 35 %`},{documentId:"request",segmentLabel:"request",quote:`Restore ${tx1} = 100 %.`}],recovery:[{...p.value.recovery[0],citation:1}]};
 expect(()=>validateParameterProposal(p.input,[],p.base,"low-power",value)).toThrow();
});
it("retains enclosing phase even when a quote starts in the middle of a field assertion",()=>{
 const description=`Initial ${tx1} = 50 %; Restore ${tx1} = 35 %; Restore ${tx1} = 100 %.`;
 const p=proposed(description);
 const value={...p.value,citations:[{documentId:"request",segmentLabel:"request",quote:`${tx1} = 50 %`},{documentId:"request",segmentLabel:"request",quote:`${tx1} = 100 %`}],initial:[{...p.value.initial[0],value:50}],recovery:[{...p.value.recovery[0],citation:1}]};
 expect(validateParameterProposal(p.input,[],p.base,"low-power",value).definition).toMatchObject({configuration:{transmitters:{tx1:{outputPowerPercent:50}}}});
});
it("cannot cite only a numeric prefix of a larger original value",()=>{
 const description=`Initial ${tx1} = 35.5 %; Restore ${tx1} = 100 %.`;
 const p=proposed(description);
 const value={...p.value,citations:[{documentId:"request",segmentLabel:"request",quote:`${tx1} = 35`},{documentId:"request",segmentLabel:"request",quote:`Restore ${tx1} = 100 %.`}],recovery:[{...p.value.recovery[0],citation:1}]};
 expect(()=>validateParameterProposal(p.input,[],p.base,"low-power",value)).toThrow();
});

it("rejects cropped identical text repeated in both initial and recovery contexts",()=>{
 const description=`Initial ${tx1} = 35 %; Restore ${tx1} = 35 %; Restore ${tx1} = 100 %.`;
 const p=proposed(description);
 const value={...p.value,citations:[{documentId:"request",segmentLabel:"request",quote:`${tx1} = 35 %`},{documentId:"request",segmentLabel:"request",quote:`Restore ${tx1} = 100 %.`}],recovery:[{...p.value.recovery[0],citation:1}]};
 expect(()=>validateParameterProposal(p.input,[],p.base,"low-power",value)).toThrow();
});
