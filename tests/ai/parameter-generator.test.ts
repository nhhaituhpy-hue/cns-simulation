// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { generateScenario } from "@/lib/ai/scenario-generation/generator";
const adapter = vi.hoisted(() => ({ fields: vi.fn(), apply: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/ai/scenario-generation/parameters", () => ({ parameterAdapterFor: () => adapter }));
beforeEach(() => {
  adapter.fields.mockReturnValue([{id:"configuration.transmitters.tx1.outputPowerPercent",label:"TX1 output power",group:"configuration",type:"number",value:40,min:0,max:100,unit:"%",recovery:true}]);
  adapter.apply.mockImplementation((_module, definition, changes)=>{ const next=structuredClone(definition);next.configuration.transmitters.tx1.outputPowerPercent=changes[0].value;return next; });
  adapter.verify.mockReturnValue({mode:"engine-recovery",initial:[{id:"fault",passed:true,detail:"Fault present"}],recovered:[{id:"normal",passed:true,detail:"Recovered"}],recoveryVerified:true,notes:[]});
  vi.stubEnv("CNS_AI_API_KEY","test-only-provider");
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it("asks AI for native numeric settings after scaffold selection, not merely a renamed preset",async()=>{
  const input={moduleId:"dme-320" as const,name:"Custom output",description:"SET configuration.transmitters.tx1.outputPowerPercent = 35 %\nRECOVER configuration.transmitters.tx1.outputPowerPercent = 100 %",difficulty:"basic" as const};
  const citation={documentId:"request",segmentLabel:"request",quote:input.description};
  let calls=0;
  const fetcher=vi.fn(async(_url:string,init:RequestInit)=>{
    calls++;
    const body=JSON.parse(String(init.body));
    if(calls===2){const request=JSON.parse(body.messages[1].content);expect(request.parameterCatalog[0]).toMatchObject({id:"configuration.transmitters.tx1.outputPowerPercent",unit:"%",min:0,max:100});expect(body.messages[0].content).toContain("unhandledRequirements");}
    const output=calls===1?{status:"supported",moduleId:input.moduleId,templateId:"low-power",explanation:"Low-power native scaffold matches this fault.",citations:[citation]}:{version:2,status:"supported",moduleId:input.moduleId,templateId:"low-power",explanation:"Use explicitly requested values with native low-power behavior.",initial:[{fieldId:"configuration.transmitters.tx1.outputPowerPercent",value:35,unit:"%",citation:0}],recovery:[{fieldId:"configuration.transmitters.tx1.outputPowerPercent",value:100,unit:"%",citation:0}],citations:[citation],unhandledRequirements:[]};
    return new Response(JSON.stringify({choices:[{finish_reason:"stop",message:{content:JSON.stringify(output)}}]}));
  });
  vi.stubGlobal("fetch",fetcher);
  const result=await generateScenario(input,[]);
  expect(result.definition).toMatchObject({configuration:{transmitters:{tx1:{outputPowerPercent:35}}}});
  expect(result.provenance.mode).toBe("native-parameter-generation");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
