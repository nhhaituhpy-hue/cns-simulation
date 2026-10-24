import { expect, it } from "vitest";
import { createTemplateDefinition } from "@/lib/ai/scenario-generation/capabilities";
import { parameterAdapterFor } from "@/lib/ai/scenario-generation/parameters";

import type { BlueprintProposal } from "@/lib/ai/scenario-blueprint/compiler";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { compileScenarioBlueprint } from "@/lib/ai/scenario-blueprint/compiler";

// Deliberately synthetic manual fixture. It is not a manufacturer claim.
const documents = [{ id: "manual", name: "DVOR 1150A test manual", sha256: "a".repeat(64), segments: [{ label: "Section 4", text: "DVOR 1150A. Inspect monitor readings. Apply transmitter output settings and clear monitor bypass after adjustment." }] }];
const proposal = {
  status: "supported", moduleId: "dvor-1150a", templateId: "carrier-9960",
  title: "Low transmitter output", situation: "TX1 output is low; restore the training setpoint.", cause: "Incorrect transmitter output setting (simulation hypothesis).",
  citations: [{ documentId: "manual", segmentLabel: "Section 4", quote: "Inspect monitor readings. Apply transmitter output settings and clear monitor bypass after adjustment." }],
  initial: [{ fieldId: "configuration.transmitters.tx1.nominal.outputPower", value: 13.7, citationIndexes: [0] }],
  recovery: [{ fieldId: "configuration.transmitters.tx1.nominal.outputPower", value: 70, citationIndexes: [0] }, { fieldId: "startPolicy.startMonitorBypassed", value: false, citationIndexes: [0] }],
  diagnosisCitationIndexes: [0],
};

it("compiles prose-derived assumptions into changed native parameters, an evidence rubric and real recovery", async () => {
  const path = "../../src/lib/ai/scenario-blueprint/compiler";
  const api = await import(path).catch(() => null);
  expect(api?.compileScenarioBlueprint, "compiler must exist").toBeTypeOf("function");
  const original = createTemplateDefinition("dvor-1150a", "carrier-9960");
  const before = structuredClone(original);
  const blueprint = api!.compileScenarioBlueprint({ moduleId: "dvor-1150a", description: "Train low transmitter output recovery", mode: "documents" }, documents, proposal);
  expect(blueprint.definition.configuration.transmitters.tx1.nominal.outputPower).toBe(13.7);
  expect(blueprint.definition.id).not.toBe(original.id);
  expect(blueprint.verification.recoveryVerified).toBe(true);
  expect(blueprint.verification.initial.some((check: { passed: boolean }) => !check.passed)).toBe(true);
  expect(blueprint.verification.recovered.every((check: { passed: boolean }) => check.passed)).toBe(true);
  expect(blueprint.assumptions.join(" ")).toMatch(/mô phỏng|simulation/i);
  expect(blueprint.assumptions.join(" ")).toContain("13.7");
  expect(blueprint.rubric.steps.some((step: { alternatives: { kind: string }[][] }) => step.alternatives.flat().some(m => m.kind === "technical-check"))).toBe(false);
  expect(blueprint.rubric.steps.flatMap((step: { alternatives: unknown[][] }) => step.alternatives.flat())).toContainEqual({ kind: "parameter", fieldId: "transmitters.tx1.nominal.outputPower", value: 70 });
  expect(blueprint.citations[0]).toMatchObject({ documentId: "manual", sha256: documents[0].sha256, sourceKind: "uploaded" });
  const repeated = api!.compileScenarioBlueprint({ moduleId: "dvor-1150a", description: "Train low transmitter output recovery", mode: "documents" }, documents, proposal);
  expect(repeated.rubric).toEqual(blueprint.rubric);
  expect(parameterAdapterFor("dvor-1150a").verify("dvor-1150a", blueprint.definition, proposal.recovery.map(({ fieldId, value }) => ({ fieldId, value })))).toEqual(blueprint.verification);
  expect(original).toEqual(before);
});

it("rejects a safe-looking quote from an uploaded segment with split-line credentials in direct compiler calls",()=>{
 const unsafe=[{...documents[0],segments:[{...documents[0].segments[0],text:documents[0].segments[0].text+"\nPassword\nsynthetic-upload-secret"}]}];
 const outcome=(()=>{try {compileScenarioBlueprint({moduleId:"dvor-1150a",description:"Low output training",mode:"documents"},unsafe,proposal);return "accepted";}catch(error) {return (error as {code:string}).code;}})();
 expect(outcome).toBe("INVALID_CITATION");
});

it.each([
 {name:"DME 320 manual.txt",label:"Transmitter Configuration",prefix:""},
 {name:"Manual.txt",label:"DME320 Transmitter Configuration",prefix:""},
 {name:"Manual.txt",label:"Transmitter Configuration",prefix:"DME320. "},
 {name:"SELEX Model 1150 Manual.txt",label:"Transmitter Configuration",prefix:""},
 {name:"Manual.txt",label:"Model 1150 Transmitter Configuration",prefix:""},
 {name:"DME 320 manual.txt",label:"DVOR1150A Transmitter Configuration",prefix:""},
 {name:"DVOR 1150 manual.txt",label:"Transmitter Configuration",prefix:"DVOR1150. "},
])("rejects an explicitly wrong-device uploaded source in direct compiler calls: $name / $label",({name,label,prefix})=>{
 const quote=proposal.citations[0].quote;
 const uploaded=[{id:"manual",name,sha256:"a".repeat(64),segments:[{label,text:prefix+quote}]}];
 const output={...proposal,citations:[{documentId:"manual",segmentLabel:label,quote}]};
 const outcome=(()=>{try {compileScenarioBlueprint({moduleId:"dvor-1150a",description:"Low output training",mode:"documents"},uploaded,output);return "accepted";}catch(error) {return (error as {code:string}).code;}})();
 expect(outcome).toBe("INVALID_CITATION");
});
it("retains nameless generic and multi-device documents only for the locally scoped target section",()=>{
 const input={moduleId:"dvor-1150a",description:"Low output training",mode:"documents"} as const;
 const quote=proposal.citations[0].quote;
 for (const name of ["Manual.txt","DME 320 and DVOR 1150A training manual.txt"]) {
  const uploaded=[{id:"manual",name,sha256:"a".repeat(64),segments:[{label:"DVOR 1150A transmitter settings",text:quote},{label:"DME 320 transmitter settings",text:quote}]}];
  const output={...proposal,citations:[{documentId:"manual",segmentLabel:uploaded[0].segments[0].label,quote}]};
  expect(compileScenarioBlueprint(input,uploaded,output).verification.recoveryVerified).toBe(true);
  const wrong={...output,citations:[{...output.citations[0],segmentLabel:uploaded[0].segments[1].label}]};
  expect(()=>compileScenarioBlueprint(input,uploaded,wrong)).toThrow(expect.objectContaining({code:"INVALID_CITATION"}));
 }
 const generic=[{...documents[0],name:"Synthetic operations.txt",segments:[{label:"Transmitter Configuration",text:quote}]}];
 expect(compileScenarioBlueprint(input,generic,{...proposal,citations:[{documentId:"manual",segmentLabel:generic[0].segments[0].label,quote}]}).verification.recoveryVerified).toBe(true);
});
it("rejects quotations from a different equipment manual even if the text exists verbatim",()=>{
 const wrong=[{...documents[0],id:"kb:dme-320:wrong",name:"DME 320 manual"}];
 const p={...proposal,citations:[{...proposal.citations[0],documentId:wrong[0].id}]};
 expect(()=>compileScenarioBlueprint({moduleId:"dvor-1150a",description:"Low output training",mode:"documents"},wrong,p)).toThrow(expect.objectContaining({code:"INVALID_CITATION"}));
});
it("rejects bypass-only completion when all physical recovery targets are unchanged",()=>{
 const noCorrection={...proposal,recovery:[{...proposal.recovery[0],value:13.7},proposal.recovery[1]]};
 expect(()=>compileScenarioBlueprint({moduleId:"dvor-1150a",description:"Restore TX1 output",mode:"documents"},documents,noCorrection)).toThrow(expect.objectContaining({code:"INVALID_RECOVERY"}));
});
it("does not require a no-op Local prerequisite that is already true at the start",()=>{
 const p={...proposal,recovery:[{fieldId:"startPolicy.startLocal",value:true,citationIndexes:[0]},...proposal.recovery]};
 const output=compileScenarioBlueprint({moduleId:"dvor-1150a",description:"Training low output",mode:"documents"},documents,p);
 expect(output.rubric.steps.some(s=>s.alternatives.flat().some(m=>m.kind==="action"&&m.controlId==="simulation.local"))).toBe(false);
 expect(output.verification.recoveryVerified).toBe(true);
});
it("rejects unsupported, underspecified, unsafe, no-op and unbounded proposals without accepting invented provider keys", () => {
  const input = { moduleId: "dvor-1150a", description: "Train low transmitter output recovery", mode: "documents" } as const;
  const invalid: unknown[] = [
    { ...proposal, secret: "unexpected" },
    { ...proposal, moduleId: "dvor-220" },
    { ...proposal, initial: [] },
    { ...proposal, initial: [{ ...proposal.initial[0], value: 10 }] },
    { ...proposal, title: "password=do-not-leak" },
    { ...proposal, initial: [{ ...proposal.initial[0], fieldId: "configuration.monitor.alarmLimits.txPower.alarmLow", value: 1 }] },
    { ...proposal, recovery: [{ ...proposal.recovery[0], value: 13.7 }] },
    { ...proposal, initial: [{ ...proposal.initial[0], extra: 42 }] },
    { ...proposal, recovery: [] },
  ];
  for (const value of invalid) expect(() => compileScenarioBlueprint(input, documents, value)).toThrow();
  expect(() => compileScenarioBlueprint(input, documents, { status: "clarification", question: "Which fault should the exercise cover?" })).toThrow(expect.objectContaining({ code: "CLARIFICATION_REQUIRED" }));
  expect(() => compileScenarioBlueprint(input, documents, { status: "unsupported", reason: "Native engine cannot reproduce this fault" })).toThrow(expect.objectContaining({ code: "UNSUPPORTED_REQUEST" }));
});

const moduleCases: Array<{ moduleId: ScenarioParametersModuleId; templateId: string; initial: [string, number][]; recovery: [string, number | boolean][] }> = [
  { moduleId: "dvor-1150", templateId: "carrier-9960", initial: [["configuration.transmitters.tx1.nominal.outputPower", 37.4]], recovery: [["configuration.transmitters.tx1.nominal.outputPower", 125], ["startPolicy.startMonitorBypassed", false]] },
  { moduleId: "dme-1119a", templateId: "tx1-delay-drift", initial: [["configuration.txConfigNominal.rtcParameters.replyDelayOffset", 0.17]], recovery: [["configuration.txConfigNominal.rtcParameters.replyDelayOffset", -0.6], ["startPolicy.integralMonitorBypassed", false], ["startPolicy.standbyMonitorBypassed", false]] },
  { moduleId: "dvor-220", templateId: "carrier-9960", initial: [["configuration.transmitters.tx1.carrierScalePercent", 43.7]], recovery: [["configuration.transmitters.tx1.carrierScalePercent", 100], ...["usbCos", "usbSin", "lsbCos", "lsbSin"].map(k => [`configuration.transmitters.tx1.sidebandPowerW.${k}`, 1] as [string, number])] },
  { moduleId: "dme-320", templateId: "low-power", initial: [["configuration.transmitters.tx1.outputPowerPercent", 43.7]], recovery: [["configuration.transmitters.tx1.outputPowerPercent", 100]] },
  { moduleId: "ads-b", templateId: "adsb-11-configure-e2e-thresholds", initial: [["targetSensor.dataProfile.endToEnd.alertPower", 181]], recovery: [["targetSensor.dataProfile.endToEnd.alertPower", 170], ["targetSensor.dataProfile.endToEnd.failurePower", 145]] },
];
it.each(moduleCases)("native replay for $moduleId emits only evidenced matchers, not invented action controls", ({ moduleId, templateId, initial, recovery }) => {
  const docs = [{ ...documents[0], name: `${moduleId} test manual`, segments: [{ label: "Section 4", text: `${moduleId}. Inspect readings; apply configuration and clear monitor bypass after adjustment.` }] }];
  const p: BlueprintProposal = { ...proposal, status: "supported", moduleId, templateId,
    citations: [{ documentId: "manual", segmentLabel: "Section 4", quote: "Inspect readings; apply configuration and clear monitor bypass after adjustment." }],
    initial: initial.map(([fieldId, value]) => ({ fieldId, value, citationIndexes: [0] })), recovery: recovery.map(([fieldId, value]) => ({ fieldId, value, citationIndexes: [0] })),
  };
  const blueprint = compileScenarioBlueprint({ moduleId, description: "Recover the configuration training exercise", mode: "documents" }, docs, p);
  expect(blueprint.verification.recoveryVerified).toBe(true);
  expect(blueprint.verification.recovered.every(c => c.passed)).toBe(true);
  const matchers = blueprint.rubric.steps.flatMap(step => step.alternatives.flat());
  expect(matchers.length).toBeGreaterThan(0);
  expect(matchers.some(m => m.kind === "technical-check")).toBe(false);
  if (moduleId === "dvor-220" || moduleId === "dme-320") expect(matchers.some(m => m.kind === "action")).toBe(false); // no native actionHistory contract on these engines
  if (moduleId === "dvor-1150") {
    expect(matchers).toContainEqual({ kind: "parameter", fieldId: "simulation.integralMonitorBypass", value: false });
    expect(blueprint.rubric.steps.filter(s => s.alternatives.flat().some(m => m.kind === "view")).length).toBeGreaterThan(0);
  }
  if (moduleId === "ads-b") {
    expect(matchers.every(m => m.kind === "terminal")).toBe(true);
    expect(blueprint.verification.notes.join(" ")).toMatch(/does not prove sensor status/);
    expect(blueprint.assumptions.join(" ")).toMatch(/physical|vật lý/);
  }
});
