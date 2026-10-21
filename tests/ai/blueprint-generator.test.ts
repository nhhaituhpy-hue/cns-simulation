// @vitest-environment node
import { expect,it,vi } from "vitest";
import type { AiMessage } from "@/lib/ai/scenario-generation/prompt";
const description="TX1 có cảnh báo công suất thấp; yêu cầu hiệu chỉnh và kiểm tra monitor.";
const documents=[{id:"kb:dvor-1150a:test",name:"DVOR 1150A test manual",sha256:"a".repeat(64),segments:[{label:"Test section 4",text:"DVOR 1150A. Inspect transmitter output power. Apply settings and release monitor bypass after adjustment."}]}];
const selection={status:"supported",moduleId:"dvor-1150a",templateId:"carrier-9960",explanation:"Native transmitter configuration exercise matches the low power symptom.",citations:[{documentId:"request",segmentLabel:"request",quote:description}]};
const proposal={status:"supported",moduleId:"dvor-1150a",templateId:"carrier-9960",title:"Công suất TX1 thấp",situation:description,cause:"Giảm giá trị công suất trong bài mô phỏng",citations:[{documentId:documents[0].id,segmentLabel:"Test section 4",quote:"Inspect transmitter output power. Apply settings and release monitor bypass after adjustment."}],initial:[{fieldId:"configuration.transmitters.tx1.nominal.outputPower",value:13.7,citationIndexes:[0]}],recovery:[{fieldId:"configuration.transmitters.tx1.nominal.outputPower",value:125,citationIndexes:[0]},{fieldId:"startPolicy.startMonitorBypassed",value:false,citationIndexes:[0]}],diagnosisCitationIndexes:[0]};
async function api(){const path="../../src/lib/ai/scenario-blueprint/generator";const result=await import(path).catch(()=>null);expect(result?.generateScenarioBlueprint,"complete generator must exist").toBeTypeOf("function");return result!;}
it("retrieves module-scoped manual and creates a native-replayed blueprint from prose without SET rows",async()=>{
 const {generateScenarioBlueprint}=await api();const retrieveKnowledge=vi.fn(async()=>({documents,available:true,notice:"Reference only"}));
 const callModel=vi.fn<(...args:unknown[])=>Promise<unknown>>().mockResolvedValueOnce(selection).mockResolvedValueOnce(proposal);
 const output=await generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"description"},[],undefined,{retrieveKnowledge,callModel});
 expect(retrieveKnowledge).toHaveBeenCalledWith("dvor-1150a",expect.stringContaining(description));
 expect(output.verification.recoveryVerified).toBe(true);expect(output.rubric.steps.length).toBeGreaterThan(0);expect(output.citations[0].sourceKind).toBe("reference-only");
 expect(callModel).toHaveBeenCalledTimes(2);const prompt=JSON.stringify(callModel.mock.calls);
 expect(prompt).not.toContain("securityAccounts");expect(prompt).not.toContain("configuration.system.accounts");expect(prompt).toContain("untrusted");
});
it("retrieves procedure vocabulary from native catalog after selecting a scaffold",async()=>{
 const {generateScenarioBlueprint}=await api();
 const emptyForm={...documents[0],id:"form",segments:[{label:"Blank form",text:"DVOR 1150A Carrier power ____ W; monitor ____"}]};
 const retrieveKnowledge=vi.fn().mockResolvedValueOnce({documents:[emptyForm],available:true,notice:""}).mockResolvedValueOnce({documents,available:true,notice:""});
 const callModel=vi.fn().mockResolvedValueOnce(selection).mockResolvedValueOnce(proposal);
 const result=await generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"description"},[],undefined,{retrieveKnowledge,callModel});
 expect(retrieveKnowledge).toHaveBeenCalledTimes(2);expect(retrieveKnowledge.mock.calls[1][1]).toMatch(/adjust|configuration|power/i);
 expect(result.citations[0].documentId).toBe(documents[0].id);
});
it("allows one bounded correction of a failed native recovery, never saves an unverified answer",async()=>{
 const {generateScenarioBlueprint}=await api();
 const wrong={...proposal,recovery:[{...proposal.recovery[0],value:13.7},proposal.recovery[1]]};
 const callModel=vi.fn().mockResolvedValueOnce(selection).mockResolvedValueOnce(wrong).mockResolvedValueOnce(proposal);
 const result=await generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"description"},documents,undefined,{retrieveKnowledge:async()=>({documents:[],available:false,notice:""}),callModel});
 expect(callModel).toHaveBeenCalledTimes(3);expect(result.verification.recoveryVerified).toBe(true);
 expect(JSON.stringify(callModel.mock.calls[2])).toContain("INVALID_RECOVERY");
 const alwaysWrong=vi.fn().mockResolvedValueOnce(selection).mockResolvedValue(wrong);
 await expect(generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"description"},documents,undefined,{retrieveKnowledge:async()=>({documents:[],available:false,notice:""}),callModel:alwaysWrong})).rejects.toMatchObject({code:"INVALID_RECOVERY"});
 expect(alwaysWrong).toHaveBeenCalledTimes(3);
});
it("withholds an entire uploaded segment containing a split-line password before either provider call",async()=>{
 const {generateScenarioBlueprint}=await api();
 const uploaded=[{...documents[0],id:"upload",segments:[{label:"Section 4",text:documents[0].segments[0].text+"\nPassword\nsynthetic-upload-secret"}]}];
 const callModel=vi.fn().mockResolvedValueOnce(selection).mockResolvedValueOnce({...proposal,citations:[{excerptId:"excerpt-1"}]});
 const outcome=await generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"documents"},uploaded,undefined,{retrieveKnowledge:async()=>({documents:[],available:false,notice:""}),callModel}).then(()=>"accepted",(error:unknown)=>(error as {code:string}).code);
 expect(outcome).toBe("KNOWLEDGE_UNAVAILABLE");expect(callModel).not.toHaveBeenCalled();
});
it.each([
 {name:"DME 320 manual.txt",label:"Transmitter Configuration",text:"Inspect transmitter output power. Apply settings and release monitor bypass after adjustment."},
 {name:"Manual.txt",label:"DME320 Transmitter Configuration",text:"Inspect transmitter output power. Apply settings and release monitor bypass after adjustment."},
 {name:"Manual.txt",label:"Transmitter Configuration",text:"DME 320. Inspect transmitter output power. Apply settings and release monitor bypass after adjustment."},
 {name:"DVOR 1150 manual.txt",label:"Transmitter Configuration",text:"DVOR1150. Inspect transmitter output power. Apply settings and release monitor bypass after adjustment."},
])("withholds explicitly wrong-device uploads before scaffold selection: $name / $label",async({name,label,text})=>{
 const {generateScenarioBlueprint}=await api();const uploaded=[{id:"upload",name,sha256:"a".repeat(64),segments:[{label,text}]}];
 const callModel=vi.fn().mockResolvedValueOnce(selection).mockResolvedValueOnce({...proposal,citations:[{excerptId:"excerpt-1"}]});
 const outcome=await generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"documents"},uploaded,undefined,{retrieveKnowledge:async()=>({documents:[],available:false,notice:""}),callModel}).then(()=>"accepted",(error:unknown)=>(error as {code:string}).code);
 expect(outcome).toBe("KNOWLEDGE_UNAVAILABLE");expect(callModel).not.toHaveBeenCalled();
});
it.each([
 {kind:"localized split label",payload:"Mật\nkhẩu\nsynthetic-upload-secret"},
 {kind:"API token",payload:"API token\nsynthetic-upload-secret"},
 {kind:"access token",payload:"Access\nToken\nsynthetic-upload-secret"},
 {kind:"encrypted PEM",payload:"-----BEGIN ENCRYPTED PRIVATE KEY-----\nsynthetic-upload-secret"},
 {kind:"opaque material",payload:"sYnThEtIc".repeat(12)},
])("quarantines $kind from selection, recovery and stored citations while retaining a clean segment",async({payload})=>{
 const {generateScenarioBlueprint}=await api();
 const safe=documents[0].segments[0];
 const uploaded=[{id:"upload",name:"Manual.txt",sha256:"a".repeat(64),segments:[safe,{label:"Sensitive",text:safe.text+"\n"+payload}]}];
 const detail={...uploaded[0],id:"detail",segments:[{label:"Sensitive detail",text:safe.text+"\n"+payload}]};
 const retrieveKnowledge=vi.fn().mockResolvedValueOnce({documents:[],available:false,notice:""}).mockResolvedValueOnce({documents:[detail],available:true,notice:""});
 const callModel=vi.fn().mockResolvedValueOnce(selection).mockImplementationOnce(async(messages:AiMessage[])=>{
  const data=JSON.parse(messages[1].content);return {...proposal,citations:[{excerptId:data.citationExcerpts[0].id}]};
 });
 const result=await generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"documents"},uploaded,undefined,{retrieveKnowledge,callModel});
 expect(callModel).toHaveBeenCalledTimes(2);
 for(const [messages] of callModel.mock.calls){
  const data=JSON.parse(messages[1].content);expect(data.citationExcerpts).toHaveLength(1);
 }
 expect(JSON.stringify(callModel.mock.calls).includes("synthetic-upload-secret")).toBe(false);
 expect(result.citations).toHaveLength(1);expect(result.citations[0].quote).toBe(safe.text);
 expect(JSON.stringify(result).includes("synthetic-upload-secret")).toBe(false);
});
it("does not reintroduce wrong-device detail retrieval into the recovery prompt of a multi-device upload",async()=>{
 const {generateScenarioBlueprint}=await api();const safe=documents[0].segments[0];
 const uploaded=[{id:"upload",name:"DME 320 and DVOR 1150A manual.txt",sha256:"a".repeat(64),segments:[{label:"DVOR 1150A transmitter settings",text:safe.text},{label:"DME 320 transmitter settings",text:"DME320. "+safe.text.replace("DVOR 1150A. ","")},{label:"General headings",text:"Inspect transmitter readings."}]}];
 const detail={id:"detail",name:"DME 320 manual.txt",sha256:"b".repeat(64),segments:[{label:"Transmitter Configuration",text:"DME320. Inspect transmitter readings and apply power configuration."}]};
 const retrieveKnowledge=vi.fn().mockResolvedValueOnce({documents:[],available:false,notice:""}).mockResolvedValueOnce({documents:[detail],available:true,notice:""});
 const callModel=vi.fn().mockResolvedValueOnce(selection).mockImplementationOnce(async(messages:AiMessage[])=>{
  const data=JSON.parse(messages[1].content);return {...proposal,citations:[{excerptId:data.citationExcerpts[0].id}]};
 });
 const result=await generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"documents"},uploaded,undefined,{retrieveKnowledge,callModel});
 for(const [messages] of callModel.mock.calls){const data=JSON.parse(messages[1].content);expect(data.citationExcerpts).toHaveLength(1);expect(data.citationExcerpts[0].segmentLabel).toBe("DVOR 1150A transmitter settings");}
 expect(result.citations[0].quote).toBe(safe.text);expect(result.citations[0].segmentLabel).toBe("DVOR 1150A transmitter settings");
});
it("fails before the provider when no valid manual exists, and never invents a fallback source",async()=>{
 const {generateScenarioBlueprint}=await api();const callModel=vi.fn();
 await expect(generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"description"},[],undefined,{retrieveKnowledge:async()=>({documents:[],available:false,notice:"Unavailable"}),callModel})).rejects.toMatchObject({code:"KNOWLEDGE_UNAVAILABLE"});
 expect(callModel).not.toHaveBeenCalled();
});
it("requests clarification for an upload without a clear training goal instead of inventing a scenario",async()=>{
 const {generateScenarioBlueprint}=await api();const callModel=vi.fn().mockResolvedValue({status:"clarification"});
 await expect(generateScenarioBlueprint({moduleId:"dvor-1150a",description:"",mode:"documents"},documents,undefined,{retrieveKnowledge:async()=>({documents:[],available:false,notice:""}),callModel})).rejects.toMatchObject({code:"CLARIFICATION_REQUIRED"});
 expect(callModel).toHaveBeenCalledTimes(1);
});
it("resolves bounded excerpt IDs into exact source quotes instead of letting the model paraphrase citations",async()=>{
 const {generateScenarioBlueprint}=await api();
 const callModel=vi.fn().mockResolvedValueOnce(selection).mockImplementationOnce(async(messages:AiMessage[])=>{
  const request=JSON.parse(messages[1].content);const excerpt=request.citationExcerpts?.find((c:{quote:string})=>c.quote.includes("Apply settings"));
  expect(excerpt).toBeDefined();return {...proposal,citations:[{excerptId:excerpt.id}]};
 });
 const result=await generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"description"},documents,undefined,{retrieveKnowledge:async()=>({documents:[],available:false,notice:""}),callModel});
 expect(documents[0].segments[0].text).toContain(result.citations[0].quote);
});
it("resolves exact excerpt identifiers at the initial scaffold selection boundary",async()=>{
 const {generateScenarioBlueprint}=await api();
 const callModel=vi.fn().mockImplementationOnce(async(messages:AiMessage[])=>{
  const data=JSON.parse(messages[1].content);expect(data.citationExcerpts?.length).toBeGreaterThan(0);
  return {...selection,citations:[{excerptId:data.citationExcerpts[0].id}]};
 }).mockResolvedValueOnce(proposal);
 const result=await generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"description"},documents,undefined,{retrieveKnowledge:async()=>({documents:[],available:false,notice:""}),callModel});
 expect(result.verification.recoveryVerified).toBe(true);
});
it("restores PDF line breaks in an otherwise exact citation and rejects paraphrased content",async()=>{
 const {generateScenarioBlueprint}=await api();
 const text="Inspect transmitter output power.\nApply settings and release monitor bypass after adjustment.";
 const docs=[{...documents[0],segments:[{label:"Test section 4",text}]}];
 const callModel=vi.fn().mockResolvedValueOnce(selection).mockResolvedValueOnce(proposal);
 const result=await generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"description"},docs,undefined,{retrieveKnowledge:async()=>({documents:[],available:false,notice:""}),callModel});
 expect(result.citations[0].quote).toBe(text);
 const changed=vi.fn().mockResolvedValueOnce(selection).mockResolvedValueOnce({...proposal,citations:[{...proposal.citations[0],quote:"Inspect GPS voltage. Apply settings."}]});
 await expect(generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"description"},docs,undefined,{retrieveKnowledge:async()=>({documents:[],available:false,notice:""}),callModel:changed})).rejects.toMatchObject({code:"INVALID_CITATION"});
});
it("does not accept a manual citation outside the exact bounded prompt window",async()=>{
 const {generateScenarioBlueprint}=await api();
 const hidden="A phrase outside the allowed excerpts.";
 const longDocs=[{...documents[0],segments:[{label:"Test section 4",text:"DVOR 1150A "+"x".repeat(50000)+hidden}]}];
 const callModel=vi.fn().mockResolvedValueOnce(selection).mockImplementationOnce(async(messages:AiMessage[])=>{
  expect(JSON.stringify(messages)).not.toContain(hidden);return {...proposal,citations:[{...proposal.citations[0],quote:hidden}]};
 });
 await expect(generateScenarioBlueprint({moduleId:"dvor-1150a",description,mode:"description"},longDocs,undefined,{retrieveKnowledge:async()=>({documents:[],available:false,notice:""}),callModel})).rejects.toMatchObject({code:"INVALID_CITATION"});
});
