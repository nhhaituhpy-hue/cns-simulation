// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as proposalModule from "@/lib/ai/scenario-generation/parameter-proposal";
import { createTemplateDefinition } from "@/lib/ai/scenario-generation/capabilities";

const adapter = vi.hoisted(() => ({ fields: vi.fn(), apply: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/ai/scenario-generation/parameters", () => ({ parameterAdapterFor: () => adapter }));
const field = { id: "configuration.transmitters.tx1.outputPowerPercent", label: "TX1 output power", group: "configuration", type: "number", value: 40, min: 0, max: 100, unit: "%", recovery: true };
const input = { moduleId: "dme-320" as const, name: "Power training", description: "TX1 output power 35 %, restore TX1 output power 100 %.", difficulty: "intermediate" as const };
const base = createTemplateDefinition(input.moduleId, "low-power");
const citation = { documentId: "request", segmentLabel: "request", quote: input.description };
const proposal = () => ({ version: 2, status: "supported", moduleId: input.moduleId, templateId: "low-power", explanation: "Low-power exercise with explicitly requested configuration.",
  initial: [{ fieldId: field.id, value: 35, unit: "%", citation: 0 }], recovery: [{ fieldId: field.id, value: 100, unit: "%", citation: 0 }], citations: [citation], unhandledRequirements: [] });
beforeEach(() => {
  adapter.fields.mockReturnValue([field]);
  adapter.apply.mockImplementation((_module, definition, changes) => { const next=structuredClone(definition); next.configuration.transmitters.tx1.outputPowerPercent=changes[0].value; return next; });
  adapter.verify.mockReturnValue({mode:"engine-recovery",initial:[{id:"fault",passed:true,detail:"Power below nominal"}],recovered:[{id:"normal",passed:true,detail:"Recovered"}],recoveryVerified:true,notes:[]});
});
describe("typed scenario parameter proposal", () => {
  it("materializes requested non-preset values and retains field evidence and native verification", () => {
    expect(proposalModule.validateParameterProposal).toBeTypeOf("function");
    const result=proposalModule.validateParameterProposal(input,[],base,"low-power",proposal());
    expect(result.definition).toMatchObject({configuration:{transmitters:{tx1:{outputPowerPercent:35}}}});
    expect(base).toMatchObject({configuration:{transmitters:{tx1:{outputPowerPercent:40}}}});
    expect(result.provenance).toMatchObject({mode:"native-parameter-generation",parameters:{version:2,initial:[{fieldId:field.id,value:35}],recovery:[{fieldId:field.id,value:100}],verification:{recoveryVerified:true}}});
  });
  it.each([
    ["unhandled requirement", (p: ReturnType<typeof proposal>) => ({...p,unhandledRequirements:["Unsupported second fault"]})],
    ["unknown field", (p: ReturnType<typeof proposal>) => ({...p,initial:[{...p.initial[0],fieldId:"__proto__.polluted"}]})],
    ["string instead of number", (p: ReturnType<typeof proposal>) => ({...p,initial:[{...p.initial[0],value:"35"}]})],
    ["wrong unit", (p: ReturnType<typeof proposal>) => ({...p,initial:[{...p.initial[0],unit:"W"}]})],
    ["out of range", (p: ReturnType<typeof proposal>) => ({...p,initial:[{...p.initial[0],value:1000}]})],
    ["duplicate assignment", (p: ReturnType<typeof proposal>) => ({...p,initial:[...p.initial,...p.initial]})],
    ["fabricated citation", (p: ReturnType<typeof proposal>) => ({...p,citations:[{...citation,quote:"TX1 output power 35 % secret invented source"}]})],
    ["citation does not support value", (p: ReturnType<typeof proposal>) => ({...p,initial:[{...p.initial[0],value:36}]})],
    ["model supplied full definition", (p: ReturnType<typeof proposal>) => ({...p,definition:{configuration:{}}})],
  ])("rejects %s rather than silently choosing the preset", (_label, mutate) => {
    expect(()=>proposalModule.validateParameterProposal(input,[],base,"low-power",mutate(proposal()))).toThrow();
  });
  it("rejects a detached engine recovery failure", () => {
    adapter.verify.mockReturnValue({mode:"engine-recovery",initial:[],recovered:[],recoveryVerified:false,notes:[]});
    expect(()=>proposalModule.validateParameterProposal(input,[],base,"low-power",proposal())).toThrow();
  });
  it("does not drop explicit parameter rows in the user document", () => {
    const documents=[{id:"doc1",name:"settings.txt",sha256:"a".repeat(64),segments:[{label:"text",text:"SET configuration.transmitters.tx1.outputPowerPercent = 30 %\nRECOVER configuration.transmitters.tx1.outputPowerPercent = 100 %"}]}];
    expect(()=>proposalModule.validateParameterProposal(input,documents,base,"low-power",proposal())).toThrow();
  });
});

it("does not accept the wrong field just because another parameter has the same numeric value",()=>{
  const evidence={...proposal(),citations:[{...citation,quote:"TX2 output power 35 %, restore TX2 output power 100 %."}]};
  const request={...input,description:evidence.citations[0].quote};
  expect(()=>proposalModule.validateParameterProposal(request,[],base,"low-power",evidence)).toThrow();
});
it("rejects an explicit parameter row truncated out of the prompt instead of silently omitting it",()=>{
  const documents=[{id:"doc2",name:"long.txt",sha256:"b".repeat(64),segments:[{label:"text",text:"a".repeat(41000)+"\nSET configuration.unknown = 20 %"}]}];
  expect(()=>proposalModule.validateParameterProposal(input,documents,base,"low-power",proposal())).toThrow();
});
it("rejects a no-op renamed preset when it fails an explicitly requested changed value",()=>{
  const p=proposal();p.initial[0].value=40;
  expect(()=>proposalModule.validateParameterProposal(input,[],base,"low-power",p)).toThrow();
});

it("does not cite a value from another sentence of the same parameter's long quote",()=>{
  const description="TX1 output power 35 %.\nTX2 output power 50 %.\nRestore TX1 output power 100 %.";
  const p={...proposal(),citations:[{...citation,quote:description}],initial:[{...proposal().initial[0],value:50}]};
  expect(()=>proposalModule.validateParameterProposal({...input,description},[],base,"low-power",p)).toThrow();
});
it("rejects fractional settings when catalog explicitly requires integer increments",()=>{
  adapter.fields.mockReturnValue([{...field,step:1}]);
  const description="TX1 output power 35.5 %, restore TX1 output power 100 %.";
  const p={...proposal(),citations:[{...citation,quote:description}],initial:[{...proposal().initial[0],value:35.5}]};
  expect(()=>proposalModule.validateParameterProposal({...input,description},[],base,"low-power",p)).toThrow();
});

it("treats failed initial conditions as the intended fault, not a failed validator",()=>{
  adapter.verify.mockReturnValue({mode:"engine-recovery",initial:[{id:"service-normal",passed:false,detail:"Initial low power"}],recovered:[{id:"service-normal",passed:true,detail:"Recovered"}],recoveryVerified:true,notes:[]});
  expect(proposalModule.validateParameterProposal(input,[],base,"low-power",proposal()).provenance.mode).toBe("native-parameter-generation");
});
it("passes only assignment fields, not model citation metadata, to the strict native adapters",()=>{
  proposalModule.validateParameterProposal(input,[],base,"low-power",proposal());
  expect(adapter.apply.mock.lastCall?.[2]).toEqual([{fieldId:field.id,value:35}]);
  expect(adapter.verify.mock.lastCall?.[2]).toEqual([{fieldId:field.id,value:100}]);
});
