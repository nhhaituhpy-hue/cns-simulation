// @vitest-environment node
import { readFile } from "node:fs/promises";
import { describe,expect,it } from "vitest";
describe("supervised hint queue registration",()=>{
 it("visits the hint queue in the real worker cycle even without provider credentials",async()=>{
  const entry=await readFile('src/ai-worker/entry.ts','utf8');
  expect(entry).toContain('import { runNextPracticeHint } from "../lib/ai/feedback/practice-hints-worker"');
  expect(entry).toContain('() => runNextPracticeHint(pool!, workerId, controller.signal)');
 });
});
