// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentProfile, type AuthProfile } from "@/lib/auth/profile";
import { POST, GET } from "@/app/api/ai/scenario-jobs/route";
import { GET as getJob, DELETE as deleteJob } from "@/app/api/ai/scenario-jobs/[jobId]/route";
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDatabasePool: () => { throw new Error("Database must not be touched by rejected requests"); } }));
const admin: AuthProfile = { id: "11111111-1111-4111-8111-111111111111", email: "admin@test.invalid", fullName: "Examiner", workUnit: "Lab", role: "admin", mustChangePassword: false };
function request() { return new Request("http://localhost/api/ai/scenario-jobs", { method: "POST", headers: { origin: "http://localhost" }, body: "not multipart" }); }
describe("AI generation API session boundary", () => {
  beforeEach(() => { vi.mocked(getCurrentProfile).mockResolvedValue(null); });
  it("rejects unauthenticated submission before parsing any body", async () => {
    const req = request(); const parse = vi.spyOn(req, "formData");
    expect((await POST(req)).status).toBe(401); expect(parse).not.toHaveBeenCalled();
  });
  it.each(["student", "teacher"] as const)("rejects %s before parsing uploads", async (role) => {
    vi.mocked(getCurrentProfile).mockResolvedValue({ ...admin, role });
    const req = request(); const parse = vi.spyOn(req, "formData");
    expect((await POST(req)).status).toBe(403); expect(parse).not.toHaveBeenCalled();
  });
  it("does not expose collection or polling to anonymous callers", async () => {
    expect((await GET(new Request("http://localhost/api/ai/scenario-jobs"))).status).toBe(401);
    expect((await getJob(new Request("http://localhost/api/ai/scenario-jobs/x"), { params: Promise.resolve({ jobId: "x" }) })).status).toBe(401);
  });
});

describe("AI generation upload/security validation", () => {
  beforeEach(() => { vi.mocked(getCurrentProfile).mockResolvedValue(admin); vi.stubEnv("CNS_AI_ENABLED", "true"); vi.stubEnv("CNS_AI_API_KEY", "non-production-fixture"); });
  afterEach(() => { vi.unstubAllEnvs(); });
  function multipart(values: Record<string,string> = {}) {
    const form = new FormData(); Object.entries({moduleId:"dvor-1150a",name:"Draft",description:"Fault for examiner review",difficulty:"basic",...values}).forEach(([k,v])=>form.set(k,v));
    return new Request("http://localhost/api/ai/scenario-jobs",{method:"POST",headers:{origin:"http://localhost","idempotency-key":"test-idempotency-key"},body:form});
  }
  it("rejects missing or foreign Origin before body parsing", async () => {
    for (const origin of [null,"https://attacker.invalid"]) { const req=multipart(); if(origin===null) req.headers.delete("origin"); else req.headers.set("origin",origin); const parse=vi.spyOn(req,"formData"); expect((await POST(req)).status).toBe(403);expect(parse).not.toHaveBeenCalled(); }
  });
  it("rejects oversized raw bodies before body parsing", async () => {
    const req=multipart();req.headers.set("content-length",String(27*1024*1024));const parse=vi.spyOn(req,"formData");expect((await POST(req)).status).toBe(413);expect(parse).not.toHaveBeenCalled();
  });
  it.each<Record<string,string>>([{moduleId:"vsat"},{name:""},{description:"   "},{difficulty:"hard"},{description:"x".repeat(2001)}])("validates real multipart fields %j", async values => {expect((await POST(multipart(values))).status).toBe(400);});
  it("rejects hidden actor/provider/callback fields",async()=>{expect((await POST(multipart({actorId:admin.id,callbackUrl:"https://attacker.invalid"}))).status).toBe(400);});
  it("does not require worker-only provider credentials on the web API",async()=>{vi.stubEnv("CNS_AI_API_KEY",undefined);expect((await POST(multipart({moduleId:"vsat"}))).status).toBe(400);});
  it("requires enabled provider configuration without invoking AI",async()=>{vi.stubEnv("CNS_AI_ENABLED","false");const req=multipart();const parse=vi.spyOn(req,"formData");expect((await POST(req)).status).toBe(503);expect(parse).not.toHaveBeenCalled();});
  it("rejects over five real multipart files",async()=>{const req=multipart();const form=await req.formData(); for(let i=0;i<6;i++)form.append("files",new File(["plain text"],`manual-${i}.txt`,{type:"text/plain"}));expect((await POST(new Request(req.url,{method:"POST",headers:{origin:"http://localhost","idempotency-key":"six-files"},body:form}))).status).toBe(400);});
  it("rejects unsupported query filters without SQL",async()=>{expect((await GET(new Request("http://localhost/api/ai/scenario-jobs?moduleId=vsat"))).status).toBe(400);expect((await GET(new Request("http://localhost/api/ai/scenario-jobs?status=published"))).status).toBe(400);});
  it("returns 404 for malformed job IDs without SQL",async()=>{expect((await getJob(new Request("http://localhost/api/ai/scenario-jobs/no"),{params:Promise.resolve({jobId:"not-a-uuid"})})).status).toBe(404);});
  it("enforces auth, origin, and UUID validation on DELETE job history",async()=>{
    expect((await deleteJob(new Request("http://localhost/api/ai/scenario-jobs/no",{method:"DELETE",headers:{origin:"https://bad.invalid"}}),{params:Promise.resolve({jobId:"not-a-uuid"})})).status).toBe(403);
    expect((await deleteJob(new Request("http://localhost/api/ai/scenario-jobs/no",{method:"DELETE",headers:{origin:"http://localhost"}}),{params:Promise.resolve({jobId:"not-a-uuid"})})).status).toBe(404);
  });
});
