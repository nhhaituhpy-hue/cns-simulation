// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), pool: {}, query: vi.fn(), create: vi.fn(), read: vi.fn(), generate: vi.fn(),analyze:vi.fn() }));
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: mocks.profile }));
vi.mock("@/lib/db", () => ({ getDatabasePool: () => mocks.pool, queryDatabase: mocks.query }));
vi.mock("@/lib/ai/feedback/jobs", () => ({ createPracticeSubmission: mocks.create, readAttemptFeedback: mocks.read,
  FeedbackJobError: class extends Error { constructor(public code: string) { super(code); } } }));
vi.mock("@/lib/ai/feedback/attempt-feedback", () => ({ generateAttemptAiFeedback: mocks.generate,analyzeAttemptEvidence:mocks.analyze }));
const id = "11111111-1111-4111-8111-111111111111";
const codeId = "22222222-2222-4222-8222-222222222222";
const examId = "33333333-3333-4333-8333-333333333333";
function request(body: unknown = { examId, codeId, itemId: id }, headers: Record<string,string> = {}) {
  return new Request("https://labs.cnsvn.com/api/ai/exam-review-feedback", { method: "POST", headers: { "content-type": "application/json", origin: "https://labs.cnsvn.com", ...headers }, body: JSON.stringify(body) });
}
describe("compatibility feedback endpoints never invoke the model in web", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.profile.mockResolvedValue({ id, role: "admin" }); mocks.query.mockResolvedValue({ rows: [{ id }] }); process.env.CNS_PUBLIC_ORIGIN = "https://labs.cnsvn.com"; });
  it("preserves on-demand practice hints without submitting or invoking a provider",async()=>{
    const {POST}=await import("@/app/api/ai/practice-feedback/route");
    const definition={id:"practice",name:"Published practice"},rubric={version:1};
    mocks.query.mockResolvedValueOnce({rows:[{definition_json:definition,assessment_rubric_json:rubric}]});mocks.analyze.mockReturnValue({summary:"Bằng chứng hiện tại"});
    const result=await POST(request({moduleId:"dvor-1150a",scenarioId:"practice",payload:{actionHistory:[]}}));
    expect(result.status).toBe(200);expect(await result.json()).toEqual({feedback:{summary:"Bằng chứng hiện tại"}});
    expect(mocks.analyze).toHaveBeenCalledWith("dvor-1150a",definition,{actionHistory:[]},rubric);
    expect(mocks.create).not.toHaveBeenCalled();expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("reads persisted examiner feedback and binds all supplied resource identifiers", async () => {
    const { POST } = await import("@/app/api/ai/exam-review-feedback/route");
    mocks.read.mockResolvedValue({ status: "completed", feedback: { summary: "Frozen result" } });
    const response = await POST(request());
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ status: "completed", feedback: { summary: "Frozen result" } });
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("c.exam_id = $1"), [examId, codeId, id, id]);
    expect(mocks.read).toHaveBeenCalledWith(mocks.pool, id, { examItemId: id });
    expect(mocks.generate).not.toHaveBeenCalled(); expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("rejects unauthenticated, non-admin and cross-origin callers", async () => {
    const { POST } = await import("@/app/api/ai/exam-review-feedback/route");
    mocks.profile.mockResolvedValueOnce(null); expect((await POST(request())).status).toBe(401);
    mocks.profile.mockResolvedValueOnce({ id, role: "teacher" }); expect((await POST(request())).status).toBe(403);
    expect((await POST(request({}, { origin: "https://evil.invalid" }))).status).toBe(403);
    expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("preserves literal UUID validation, bounded input and ownership/revocation denial", async () => {
    const { POST } = await import("@/app/api/ai/exam-review-feedback/route");
    for (const value of [{ examId, codeId, itemId: ` ${id}` }, { examId, codeId, itemId: id, rubric: {} }, { examId, codeId, itemId: "a".repeat(32769) }]) expect((await POST(request(value))).status).toBe(400);
    mocks.query.mockResolvedValueOnce({ rows: [] }); expect((await POST(request())).status).toBe(404);
    const { FeedbackJobError } = await import("@/lib/ai/feedback/jobs");
    mocks.read.mockRejectedValueOnce(new FeedbackJobError("NOT_FOUND")); expect((await POST(request())).status).toBe(404);
    mocks.read.mockResolvedValueOnce({ status: "withheld" }); expect(await (await POST(request())).json()).toEqual({ status: "withheld" });
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
