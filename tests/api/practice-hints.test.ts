// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/profile",()=>({getCurrentProfile:vi.fn(async()=>({id:"11111111-1111-4111-8111-111111111111"}))}));
vi.mock("@/lib/db",()=>({getDatabasePool:vi.fn(()=>({}))}));
vi.mock("@/lib/ai/feedback/practice-hints",()=>({createPracticeHint:vi.fn(async()=>({jobId:"22222222-2222-4222-8222-222222222222",status:"queued"})),readPracticeHint:vi.fn(async()=>({jobId:"22222222-2222-4222-8222-222222222222",status:"queued"})),PracticeHintError:class extends Error{constructor(public code:string){super(code);}}}));
import { createPracticeHint, readPracticeHint } from "@/lib/ai/feedback/practice-hints";
import { getCurrentProfile } from "@/lib/auth/profile";
const body={moduleId:"dvor-1150a",scenarioId:"published",runKey:"run",payload:{}};
const request=(data:unknown=body,origin="https://lab.test",key="33333333-3333-4333-8333-333333333333")=>new Request("https://lab.test/api/ai/practice-hints",{method:"POST",headers:{"content-type":"application/json",origin,"Idempotency-Key":key},body:JSON.stringify(data)});
afterEach(()=>{vi.clearAllMocks();});
describe("practice hint HTTP contract",()=>{
 it("accepts a bounded same-origin authenticated request and returns only job identity",async()=>{
  const {POST}=await import("@/app/api/ai/practice-hints/route");
  const response=await POST(request());expect(response.status).toBe(202);expect(await response.json()).toEqual({jobId:"22222222-2222-4222-8222-222222222222",status:"queued"});expect(response.headers.get("cache-control")).toContain("no-store");
  expect(createPracticeHint).toHaveBeenCalledOnce();
 });
 it("forwards the optional loaded publication identity without defaulting to a source",async()=>{
  const {POST}=await import("@/app/api/ai/practice-hints/route");
  expect((await POST(request({...body,libraryMembershipId:"44444444-4444-4444-8444-444444444444"}))).status).toBe(202);
  expect(createPracticeHint).toHaveBeenCalledWith(expect.anything(),expect.anything(),expect.anything(),expect.objectContaining({libraryMembershipId:"44444444-4444-4444-8444-444444444444"}));
 });
 it("rejects origin, unknown exam context, malformed key, unauthenticated actor before enqueue",async()=>{
  const {POST}=await import("@/app/api/ai/practice-hints/route");
  for(const r of [request(body,"https://evil.test"),request({...body,examItemId:"secret"}),request(body,"https://lab.test","not-a-uuid"),request({...body,question:"x".repeat(1001)})])expect((await POST(r)).status).toBeGreaterThanOrEqual(400);
  vi.mocked(getCurrentProfile).mockResolvedValueOnce(null);expect((await POST(request())).status).toBe(401);expect(createPracticeHint).not.toHaveBeenCalled();
 });
 it("keeps GET owner-bound and read-only and rejects invalid IDs",async()=>{
  const {GET}=await import("@/app/api/ai/practice-hints/route");
  expect((await GET(new Request("https://lab.test/api/ai/practice-hints?jobId=bad"))).status).toBe(400);
  expect((await GET(new Request("https://lab.test/api/ai/practice-hints?jobId=22222222-2222-4222-8222-222222222222"))).status).toBe(200);
  expect(readPracticeHint).toHaveBeenCalledWith(expect.anything(),"11111111-1111-4111-8111-111111111111","22222222-2222-4222-8222-222222222222");expect(createPracticeHint).not.toHaveBeenCalled();
 });
});
