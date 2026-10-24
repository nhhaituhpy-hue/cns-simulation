// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { selexParameterAdapter as adapter } from "@/lib/ai/scenario-generation/parameter-selex";
import { createTemplateDefinition, getScenarioCapabilities } from "@/lib/ai/scenario-generation/capabilities";
import { compileScenarioBlueprint } from "@/lib/ai/scenario-blueprint/compiler";
import { validateParameterProposal } from "@/lib/ai/scenario-generation/parameter-proposal";
import { readParameterReview } from "@/lib/ai/scenario-generation/parameter-review";
import { dvorConfigFieldCatalog, getDvorConfigValue, setDvorConfigValue } from "@/lib/dvor1150a/config-utils";
import { createDefaultDvor1150aScenarioDefinition, dvor1150aScenarioFieldRole, type Dvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { parseScenarioParameters } from "@/lib/scenario-parameters";
import { generateScenarioBlueprint } from "@/lib/ai/scenario-blueprint/generator";
import { createVorPmdtStore } from "@/stores/vor-pmdt-store";
import { assessAttemptSteps } from "@/lib/ai/feedback/step-assessment";

const moduleId = "dvor-1150a" as const;
const fieldId = "configuration.monitor.timers.shutdown";
const input = { moduleId, description: "Huấn luyện sửa timer shutdown 2 giây; không coi timer là số đo RF.", mode: "documents" as const };
const quote = "SYNTHETIC TEST SOURCE ONLY: Configure monitor timers, alarm limits, routing and calibrations; Apply configuration and check the saved settings before releasing bypass.";
const documents = [{ id: "manual-test", name: "DVOR1150A synthetic test", sha256: "a".repeat(64), segments: [{ label: "Test", text: quote }] }];
function proposal() {
  return { status: "supported", moduleId, templateId: "configuration-values", title: "Monitor timer training", situation: input.description, cause: "Simulation training setting, not physical fault",
    citations: [{ documentId: "manual-test", segmentLabel: "Test", quote }], initial: [{ fieldId, value: 3, citationIndexes: [0] }],
    recovery: [{ fieldId, value: 2, citationIndexes: [0] }, { fieldId: "startPolicy.startMonitorBypassed", value: false, citationIndexes: [0] }], diagnosisCitationIndexes: [0] };
}

it("makes the complete exact-configuration catalog available in the provider flow with explicit training-only limits", async () => {
  const callModel=vi.fn().mockResolvedValueOnce({status:"supported",moduleId,templateId:"configuration-values",explanation:"Configuration exercise uses the monitor timer controls.",citations:[{documentId:"request",segmentLabel:"request",quote:input.description}]}).mockResolvedValueOnce(proposal());
  const result=await generateScenarioBlueprint(input,documents,undefined,{retrieveKnowledge:async()=>({documents:[],available:false,notice:""}),callModel});
  const [messages]=callModel.mock.calls[1];
  expect(messages[0].content).toContain("configuration-values");
  expect(messages[0].content).toMatch(/not.*manufacturer|not.*OEM/i);
  const catalog=JSON.parse(messages[1].content).fields as {id:string;recovery:boolean;min?:number;max?:number}[];
  for(const field of dvorConfigFieldCatalog.filter(f=>dvor1150aScenarioFieldRole(f.id)==="student-operable")) {
    expect(catalog.find(f=>f.id===`configuration.${field.id}`),field.id).toBeDefined();
  }
  expect(result.verification.recoveryVerified).toBe(true);
});

it("advertises a configuration exercise scaffold without pretending timer/routing settings create RF faults", () => {
  expect(getScenarioCapabilities(moduleId).some(c => c.templateId === "configuration-values")).toBe(true);
  const source = createTemplateDefinition(moduleId, "configuration-values") as Dvor1150aScenarioDefinition;
  expect(source.configuration).toEqual(createDefaultDvor1150aScenarioDefinition().configuration);
  const fields = adapter.fields(moduleId, source);
  expect(fields.find(f=>f.id==="configuration.monitor.alarmLimits.rfLevel.alarmLow")).toMatchObject({min:-Number.MAX_SAFE_INTEGER,max:Number.MAX_SAFE_INTEGER});
  expect(fields.find(f=>f.id==="configuration.monitor.calibration.mon1.txPowerOffset")).toMatchObject({effect:"stored-only",effectNotice:expect.any(String),recovery:true});
  expect(fields.find(f=>f.id==="configuration.monitor.calibration.mon1.oddAntennaReturnLossOffset")).toMatchObject({effect:"stored-only",effectNotice:expect.any(String)});
  for (const native of dvorConfigFieldCatalog.filter(f => dvor1150aScenarioFieldRole(f.id) === "student-operable")) {
    expect(fields.find(f => f.id === `configuration.${native.id}`), native.id).toMatchObject({ recovery: true });
  }
});

it("compiles a precise required timer result and verifies the same frozen definition by native replay", () => {
  const p = proposal(), before = structuredClone(p);
  const blueprint = compileScenarioBlueprint(input, documents, p);
  const definition = parseScenarioParameters(moduleId, blueprint.definition)!;
  expect(definition.configuration.monitor.timers.shutdown).toBe(3);
  expect(definition.successCriteria.configurationValues).toEqual([{ fieldId: "monitor.timers.shutdown", value: 2 }]);
  expect(definition.taskTargets).toEqual([{fieldId:"monitor.timers.shutdown",requirement:"change-applied"}]);
  expect(blueprint.verification.initial).toContainEqual(expect.objectContaining({ id: "configuration-value-monitor.timers.shutdown", passed: false }));
  expect(blueprint.verification.recoveryVerified).toBe(true);
  expect(blueprint.verification.mode).toBe("native-action-replay");
  expect(blueprint.verification.notes.join(" ")).toMatch(/configuration.*not.*physical/i);
  expect(blueprint.verification.recovered.every(c => c.passed)).toBe(true);
  expect(adapter.verify(moduleId, definition, p.recovery.map(({ fieldId, value }) => ({ fieldId, value })))).toEqual(blueprint.verification);
  expect(blueprint.rubric.steps.flatMap(s => s.alternatives.flat())).toContainEqual({ kind: "parameter", fieldId: "monitor.timers.shutdown", value: 2 });
  expect(compileScenarioBlueprint(input, documents, p)).toEqual(blueprint);
  expect(p).toEqual(before);
});

it("compiles a single shared nominal choice into both TX copies and rejects contradictory requested values", () => {
  const p=proposal();
  p.initial=[{fieldId:"configuration.transmitters.tx1.nominal.outputPower",value:60,citationIndexes:[0]}];
  p.recovery[0]={fieldId:"configuration.transmitters.tx1.nominal.outputPower",value:70,citationIndexes:[0]};
  const blueprint=compileScenarioBlueprint(input,documents,p);
  const d=parseScenarioParameters(moduleId,blueprint.definition)!;
  expect(d.configuration.transmitters.tx1.nominal.outputPower).toBe(60);
  expect(d.configuration.transmitters.tx2.nominal.outputPower).toBe(60);
  expect(d.successCriteria.configurationValues).toEqual([
    {fieldId:"transmitters.tx1.nominal.outputPower",value:70},
    {fieldId:"transmitters.tx2.nominal.outputPower",value:70},
  ]);
  expect(adapter.verify(moduleId,d,p.recovery.map(({fieldId,value})=>({fieldId,value}))).recoveryVerified).toBe(true);
  const store=createVorPmdtStore();
  expect(store.getState().startReviewScenario(d)).toBe(true);
  expect(store.getState().login("SEC3","THREE")).toBe(true);
  store.getState().setConfigValue("transmitters.tx1.nominal.outputPower",70,["transmitters.tx2.nominal.outputPower"]);
  expect(store.getState().applyConfigChanges()).toBe(true);
  store.getState().setConfigValue("simulation.integralMonitorBypass",false);
  const state=store.getState();
  const report=assessAttemptSteps(moduleId,d,{checkpoint:{config:state.config,scenarioId:state.scenario.scenarioId,scenarioRunId:state.scenario.runId,scenarioStartedAt:state.scenario.startedAt},actionHistory:state.actionHistory,evidenceStats:state.evidenceStats},blueprint.rubric);
  expect(report.unrelatedParameterChanges).toEqual([]);
  expect(report.correct).toBe(report.totalRequiredSteps);
  p.recovery.push({fieldId:"configuration.transmitters.tx2.nominal.outputPower",value:75,citationIndexes:[0]});
  expect(()=>compileScenarioBlueprint(input,documents,p)).toThrow();
});

it("uses native finite-number/order validation for unbounded alarm limits, not fabricated manufacturer bounds", () => {
  const p = proposal();
  const id = "configuration.monitor.alarmLimits.rfLevel.alarmLow";
  p.initial = [{ fieldId: id, value: -8, citationIndexes: [0] }];
  p.recovery[0] = { fieldId: id, value: -9, citationIndexes: [0] };
  const blueprint = compileScenarioBlueprint(input, documents, p);
  expect(parseScenarioParameters(moduleId, blueprint.definition)!.successCriteria.configurationValues).toEqual([{ fieldId: "monitor.alarmLimits.rfLevel.alarmLow", value: -9 }]);
  expect(blueprint.verification.recoveryVerified).toBe(true);
  p.recovery[0].value = 999;
  expect(() => compileScenarioBlueprint(input, documents, p)).toThrow();
  p.recovery[0].value = -Number.MAX_VALUE;
  expect(() => compileScenarioBlueprint(input, documents, p)).toThrow();
});

it("retains legacy v2 SET/RECOVER grounding and persists exact recovery values rather than narrative-only metadata", () => {
  const description = `SET ${fieldId} = 3 s\nRECOVER ${fieldId} = 2 s\nRECOVER startPolicy.startMonitorBypassed = false`;
  const input = { moduleId, name: "Native timer exercise", description, difficulty: "basic" as const };
  const source = createTemplateDefinition(moduleId, "configuration-values");
  const p = { version: 2, status: "supported", moduleId, templateId: "configuration-values", explanation: "Explicit training timer requirement, not a manufacturer performance claim.",
    initial: [{ fieldId, value: 3, unit: "s", citation: 0 }], recovery: [{ fieldId, value: 2, unit: "s", citation: 0 }, { fieldId: "startPolicy.startMonitorBypassed", value: false, citation: 0 }],
    citations: [{ documentId: "request", segmentLabel: "request", quote: description }], unhandledRequirements: [] };
  const result = validateParameterProposal(input, [], source, "configuration-values", p);
  expect(parseScenarioParameters(moduleId, result.definition)!.successCriteria.configurationValues).toEqual([{ fieldId: "monitor.timers.shutdown", value: 2 }]);
  expect(parseScenarioParameters(moduleId,result.definition)!.taskTargets).toEqual([{fieldId:"monitor.timers.shutdown",requirement:"change-applied"}]);
  expect(readParameterReview(result.provenance.parameters)?.verification.recoveryVerified).toBe(true);
  expect(() => validateParameterProposal(input, [], source, "configuration-values", { ...p, recovery: [{ ...p.recovery[0], value: 4 }, p.recovery[1]] })).toThrow();
});

it("never admits arbitrary/protected fields or uses a threshold to mask a physical fault in existing scaffolds", () => {
  const source = createTemplateDefinition(moduleId, "carrier-9960") as Dvor1150aScenarioDefinition;
  source.editPolicy = { mode: "open" };
  expect(adapter.fields(moduleId, source).find(f => f.id === "configuration.monitor.alarmLimits.txPower.alarmLow")!.recovery).toBe(false);
  expect(() => adapter.verify(moduleId, source, [{ fieldId: "configuration.monitor.alarmLimits.txPower.alarmLow", value: 0 }])).toThrow();
  for (const path of ["configuration.monitor.invented", "configuration.monitor.rawMeasurements.mon1.rfLevel", "configuration.transmitters.tx1.faults.disabled", "configuration.transmitters.tx1.nominal.invented", "configuration.simulation.local", "configuration.constructor.prototype.polluted"]) {
    const p = proposal();
    p.initial[0].fieldId = path;
    p.recovery[0].fieldId = path;
    expect(() => compileScenarioBlueprint(input, documents, p)).toThrow();
  }
  const configSource=createTemplateDefinition(moduleId,"configuration-values");
  expect(()=>adapter.apply(moduleId,configSource,[{fieldId,value:3},{fieldId,value:3}])).toThrow();
});

it("requires every declared configuration target and enforces Local, native policy and final effective assignment", () => {
  const source = createDefaultDvor1150aScenarioDefinition();
  source.startPolicy = { ...source.startPolicy, startLocal: true, startMonitorBypassed: true };
  source.successCriteria.configurationValues = [{ fieldId: "monitor.timers.shutdown", value: 2 }, { fieldId: "monitor.timers.noIdent", value: 18 }];
  expect(() => adapter.verify(moduleId, source, [{ fieldId, value: 2 }, { fieldId: "startPolicy.startMonitorBypassed", value: false }])).toThrow();
  const recovery = [{ fieldId, value: 2 }, { fieldId: "configuration.monitor.timers.noIdent", value: 18 }, { fieldId: "startPolicy.startMonitorBypassed", value: false }];
  expect(adapter.verify(moduleId, source, recovery).recoveryVerified).toBe(true);
  source.startPolicy.startLocal = false;
  source.startPolicy.startMonitorBypassed = false;
  expect(() => adapter.verify(moduleId, source, recovery)).toThrow();
});

it("keeps a maximum 24-assignment recovery and every exact requirement readable by legacy public review DTOs", () => {
  const p=proposal();
  const source=createDefaultDvor1150aScenarioDefinition();
  const fields=dvorConfigFieldCatalog.filter(f=>f.id.startsWith("monitor.routing.")).slice(0,22);
  const rows=fields.map(f=>({fieldId:`configuration.${f.id}`,value:!getDvorConfigValue(source.configuration,f.id),citationIndexes:[0]}));
  const blueprint=compileScenarioBlueprint(input,documents,{...p,initial:[...p.initial,...rows],recovery:[...p.recovery,...rows.map(row=>({...row,value:!row.value}))]});
  const d=parseScenarioParameters(moduleId,blueprint.definition)!;
  expect(d.successCriteria.configurationValues).toHaveLength(23);
  const review=readParameterReview({version:2,initial:[...p.initial,...rows],recovery:[...p.recovery,...rows.map(row=>({...row,value:!row.value}))],verification:blueprint.verification});
  expect(review).not.toBeNull();
  expect(review!.recovery).toHaveLength(24);
});

describe("all detailed configuration values replay", () => {
  it("round-trips and natively applies every monitor/TX value independently with no cross-target loss", async () => {
    const base = createDefaultDvor1150aScenarioDefinition();
    const fields = dvorConfigFieldCatalog.filter(f => /^monitor\.(alarmLimits|azimuthLimits|timers|antennas|calibration|testGeneratorCalibration|testGenerator|standbyCalibration|votingLogic|transfer|sidebandVswr|notchTolerance|integrity|routing)(\.|$)|^transmitters\.(tx1|tx2)\.(nominal|offsets)\./.test(f.id));
    for (const field of fields) {
      const target = getDvorConfigValue(base.configuration, field.id)!;
      let wrong = typeof target === "boolean" ? !target : typeof target === "string" ? field.options?.find(v => v !== target) ?? "ABC" : target + (field.step ?? 0.1);
      if (field.options && typeof target === "number") wrong = Number(field.options.find(v => Number(v) !== target));
      if (field.id.endsWith("keyerMode")) wrong = "external";
      const source = structuredClone(base);
      source.startPolicy.startLocal = true; source.startPolicy.startMonitorBypassed = true;
      source.configuration = setDvorConfigValue(source.configuration, field.id, wrong);
      // Native Keyer Input controls require external mode. Exercise the real
      // reachable context, rather than treating a setter bypass as UI proof.
      if (/\.nominal\.(keyerInputLevel|windowedKeyingInput|selfKeyOnLoss|shutdownOnLoss|restartWhenResumed)$/.test(field.id)) {
        source.configuration.transmitters.tx1.nominal.keyerMode = "external";
        source.configuration.transmitters.tx2.nominal.keyerMode = "external";
      }
      source.successCriteria.configurationValues = [{ fieldId: field.id, value: target }];
      // Limits can be pre-alarm at baseline; no RF equations or synthetic readings are introduced.
      expect(parseScenarioParameters(moduleId, source), field.id).not.toBeNull();
      const report = adapter.verify(moduleId, source, [{ fieldId: `configuration.${field.id}`, value: target }, { fieldId: "startPolicy.startMonitorBypassed", value: false }]);
      expect(report.initial.find(c => c.id === `configuration-value-${field.id}`)?.passed, field.id).toBe(false);
      expect(report.recovered.every(c => c.passed), field.id).toBe(true);
    }
    const inventory=fields.map(field=>({fieldId:field.id,type:field.type,unit:field.unit??null,effect:field.effect??"native-model",configurationCriterion:true,nativeReplay:true}));
    const catalogInventory=dvorConfigFieldCatalog.map(field=>({fieldId:field.id,role:dvor1150aScenarioFieldRole(field.id),requiredValueSelectable:dvor1150aScenarioFieldRole(field.id)==="student-operable",detailed:fields.some(f=>f.id===field.id)}));
    const counts={detailed:fields.length,tx1Nominal:fields.filter(f=>f.id.startsWith("transmitters.tx1.nominal.")).length,tx2Nominal:fields.filter(f=>f.id.startsWith("transmitters.tx2.nominal.")).length,tx1Offsets:fields.filter(f=>f.id.startsWith("transmitters.tx1.offsets.")).length,tx2Offsets:fields.filter(f=>f.id.startsWith("transmitters.tx2.offsets.")).length,integralCalibration:fields.filter(f=>f.id.startsWith("monitor.calibration.")).length,standbyCalibration:fields.filter(f=>f.id.startsWith("monitor.standbyCalibration.")).length,testGeneratorCalibration:fields.filter(f=>f.id.startsWith("monitor.testGeneratorCalibration.")).length,testGeneratorSetup:fields.filter(f=>f.id.startsWith("monitor.testGenerator.")).length,alarmBands:fields.filter(f=>f.id.startsWith("monitor.alarmLimits.")).length,timers:fields.filter(f=>f.id.startsWith("monitor.timers.")).length,antennas:fields.filter(f=>f.id.startsWith("monitor.antennas.")).length,routing:fields.filter(f=>f.id.startsWith("monitor.routing.")).length};
    if(process.env.CNS_DVOR_AUTHORING_EVIDENCE){const {writeFileSync}=await import("node:fs");writeFileSync(process.env.CNS_DVOR_AUTHORING_EVIDENCE,JSON.stringify({counts,catalogInventory,inventory},null,2));}
    process.stdout.write(`DVOR_CONFIGURATION_REPLAY_COVERAGE ${JSON.stringify(counts)}\n`);
  }, 15_000); // 206 complete native schema/Apply replays, not one scalar setter.
});
