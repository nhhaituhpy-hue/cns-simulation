import { describe, expect, it, vi } from "vitest";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";

describe("bounded practice hint generation", () => {
  it.each([{nextStepIds:["invented-command"]},{nextStepIds:["next-0"],summary:"Invented command"},null])( "rejects model inventions and labels the deterministic fallback",async answer=>{
    const {generatePracticeHint}=await import("@/lib/ai/feedback/practice-hints-worker");
    const result=await generatePracticeHint({moduleId:"dvor-1150a",definition:createDefaultDvor1150aScenarioDefinition(),rubric:null,payload:{},question:""},{provider:async()=>answer});
    expect(result.sourceMode).toBe("deterministic-only");expect(JSON.stringify(result)).not.toMatch(/Invented|private/);
  });
  it("falls back safely on provider failure without leaking raw errors",async()=>{
    const {generatePracticeHint}=await import("@/lib/ai/feedback/practice-hints-worker");
    const result=await generatePracticeHint({moduleId:"dvor-1150a",definition:createDefaultDvor1150aScenarioDefinition(),rubric:null,payload:{},question:""},{provider:async()=>{throw Error("private");}});
    expect(result.sourceMode).toBe("deterministic-only");expect(result.notice).toContain("AI chưa khả dụng");expect(JSON.stringify(result)).not.toContain("private");
  });
  it("uses the actual provider boundary only to select a native allowlisted step", async () => {
    const { generatePracticeHint } = await import("@/lib/ai/feedback/practice-hints-worker");
    const provider = vi.fn(async () => ({ nextStepIds: ["next-0"] }));
    const result = await generatePracticeHint({ moduleId: "dvor-1150a", definition: createDefaultDvor1150aScenarioDefinition(), rubric: null, payload: {}, question: "Tôi nên kiểm tra gì?" }, { provider });
    expect(provider).toHaveBeenCalledOnce();
    expect(result.sourceMode).toBe("ai-assisted");
    expect(result.notice).toMatch(/chưa có rubric công bố/i);
    expect(result.nextSteps).toHaveLength(1);
    expect(result.summary).not.toMatch(/điểm|\d+\/\d+/);
    const sent = JSON.stringify(provider.mock.calls);
    expect(sent).not.toMatch(/securityAccounts|definition|password|expectedActions/);
  });
});
