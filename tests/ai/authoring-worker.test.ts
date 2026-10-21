// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const h=vi.hoisted(()=>({claim:vi.fn(),heartbeat:vi.fn(),finish:vi.fn(),fail:vi.fn(),extract:vi.fn(),analyze:vi.fn()}));
vi.mock("@/lib/ai/scenario-authoring/repository",()=>({claimAuthoringAnalysis:h.claim,heartbeatAuthoringAnalysis:h.heartbeat,finishAuthoringAnalysis:h.finish,failAuthoringAnalysis:h.fail}));
vi.mock("@/lib/ai/scenario-authoring/document-analysis",()=>({analyzeAuthoring:h.analyze}));
vi.mock("@/lib/ai/documents/isolated",()=>({extractIsolatedDocuments:h.extract}));
import { processNextAuthoring } from "@/lib/ai/scenario-authoring/worker";
import type { Pool } from "pg";
const job={id:"job",sessionId:"session",actorId:"actor",attemptToken:"token",state:{version:1},request:{kind:"baseline",question:""},documents:[]};
beforeEach(()=>{vi.clearAllMocks();h.claim.mockResolvedValue(job);h.heartbeat.mockResolvedValue(true);h.extract.mockResolvedValue([]);h.analyze.mockResolvedValue({message:"Draft ready",changes:[],issues:[]});h.finish.mockResolvedValue(true);});
it("completes document analysis as a draft proposal only",async()=>{expect(await processNextAuthoring({}as Pool,"worker")).toBe("completed");expect(h.finish).toHaveBeenCalledWith({},"job","token",{message:"Draft ready",changes:[],issues:[]});expect(h.analyze.mock.calls[0].slice(0,3)).toEqual([job.state,job.request,[]]);});
it("does not run AI after actor or lease ownership is lost",async()=>{h.heartbeat.mockResolvedValue(false);expect(await processNextAuthoring({}as Pool,"worker")).toBe("stale");expect(h.analyze).not.toHaveBeenCalled();expect(h.finish).not.toHaveBeenCalled();});
it("safely records a failure code and retains the draft",async()=>{h.analyze.mockRejectedValue({code:"INVALID_DOCUMENT",message:"private raw response"});expect(await processNextAuthoring({}as Pool,"worker")).toBe("failed");expect(h.fail).toHaveBeenCalledWith({},"job","token","INVALID_DOCUMENT");expect(h.finish).not.toHaveBeenCalled();});
it("reports idle without extraction or AI calls",async()=>{h.claim.mockResolvedValue(null);expect(await processNextAuthoring({}as Pool,"worker")).toBe("idle");expect(h.extract).not.toHaveBeenCalled();});

it("passes retrieved private references into guidance and persists their scope notice",async()=>{
 const { authoringKnowledgeContext }=await import("@/lib/ai/knowledge/context");
 const context=vi.spyOn(await import("@/lib/ai/knowledge/context"),"authoringKnowledgeContext");
 const reference={id:"kb:dvor-1150a:manual",name:"manual",sha256:"a".repeat(64),segments:[{label:"PDF page 12",text:"Original excerpt"}]};
 context.mockResolvedValueOnce({documents:[reference],notice:"Manual reference only, not certified"});
 h.claim.mockResolvedValueOnce({...job,request:{kind:"guidance",sectionId:"faults",question:"Explain"}});
 expect(await processNextAuthoring({}as Pool,"worker")).toBe("completed");
 expect(h.analyze.mock.calls[0][2]).toEqual([reference]);
 expect(h.finish.mock.calls[0][3].issues).toContainEqual(expect.objectContaining({code:"KNOWLEDGE_REFERENCE_SCOPE",message:"Manual reference only, not certified"}));
 expect(authoringKnowledgeContext).toBeDefined();context.mockRestore();
});

it("dispatches both legacy and guided queue work without starving either",async()=>{
 const {runAiWorkerCycle}=await import("@/lib/ai/scenario-authoring/worker-dispatch");
 const calls:string[]=[];const guided=async()=>{calls.push("guided");return "completed" as const;};const legacy=async()=>{calls.push("legacy");return "idle" as const;};
 await runAiWorkerCycle(guided,legacy);await runAiWorkerCycle(guided,legacy);expect(calls).toEqual(["guided","legacy","guided","legacy"]);
 const stopped=vi.fn(async()=>"stopped"as const),other=vi.fn(async()=>"idle"as const);await runAiWorkerCycle(stopped,other);expect(other).not.toHaveBeenCalled();
});
