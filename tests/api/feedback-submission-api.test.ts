// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), pool: {}, create: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: mocks.profile }));
vi.mock("@/lib/db", () => ({ getDatabasePool: () => mocks.pool }));
vi.mock("@/lib/ai/feedback/jobs", () => ({
  createPracticeSubmission: mocks.create, readAttemptFeedback: mocks.read,
  FeedbackJobError: class extends Error { constructor(public code: string) { super(code); } },
}));
const id = "11111111-1111-4111-8111-111111111111";
const body = { moduleId: "dvor-1150a", scenarioId: "published-only", payload: { visitedViewIds: ["monitor"], password: "drop", definition: {} } };
function request(value: unknown = body, headers: Record<string,string> = {}) {
  return new Request("https://labs.cnsvn.com/api/ai/practice-submissions", { method: "POST", headers: { origin: "https://labs.cnsvn.com", "content-type": "application/json", "Idempotency-Key": "test-1", ...headers }, body: JSON.stringify(value) });
}
describe("durable after-submit HTTP boundaries", () => {
  it("passes a published membership pin and reports a republish conflict instead of grading a different barem", async () => {
    const { POST } = await import("@/app/api/ai/practice-submissions/route");
    const { FeedbackJobError } = await import("@/lib/ai/feedback/jobs");
    mocks.create.mockRejectedValueOnce(new FeedbackJobError("PUBLICATION_CHANGED"));
    const response = await POST(request({ ...body, libraryMembershipId: id }));
    expect(response.status).toBe(409);
    expect(mocks.create).toHaveBeenCalledWith(mocks.pool, id, "test-1", expect.objectContaining({ libraryMembershipId: id }));
    expect((await response.json()).error).toContain("Barem đã được công bố lại");
  });
  beforeEach(() => { vi.clearAllMocks(); mocks.profile.mockResolvedValue({ id, role: "student" }); process.env.CNS_PUBLIC_ORIGIN = "https://labs.cnsvn.com"; });
  it("rejects unauthenticated, forged rubric, cross-origin, missing key and oversized requests before writes", async () => {
    const { POST } = await import("@/app/api/ai/practice-submissions/route");
    mocks.profile.mockResolvedValueOnce(null); expect((await POST(request())).status).toBe(401);
    expect((await POST(request(body, { origin: "https://evil.invalid" }))).status).toBe(403);
    expect((await POST(request({ ...body, rubric: { answer: "forged" } }))).status).toBe(400);
    expect((await POST(request(body, { "Idempotency-Key": "" }))).status).toBe(400);
    expect((await POST(request({ ...body, payload: { tooLarge: "a".repeat(500001) } }))).status).toBe(400);
    expect((await POST(request({ ...body, payload: JSON.parse('{"__proto__":{"x":1}}') }))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("reads a single authorized target with no-store and does not return internal job data", async () => {
    const { GET } = await import("@/app/api/ai/attempt-feedback/route");
    mocks.read.mockResolvedValue({ status: "withheld" });
    const response = await GET(new Request(`https://labs.cnsvn.com/api/ai/attempt-feedback?examItemId=${id}`));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ status: "withheld" });
    expect(mocks.read).toHaveBeenCalledWith(mocks.pool, id, { examItemId: id });
    for (const query of [`examItemId=${id}&practiceSubmissionId=${id}`, `examItemId=${id}&examItemId=${id}`, `examItemId=not-uuid`, `jobId=${id}`]) {
      expect((await GET(new Request(`https://labs.cnsvn.com/api/ai/attempt-feedback?${query}`))).status).toBe(400);
    }
  });
  it("rejects cross-site feedback reads and keeps every target UUID literal", async () => {
    const { GET } = await import("@/app/api/ai/attempt-feedback/route");
    const url = `https://labs.cnsvn.com/api/ai/attempt-feedback?legacyAttemptItemId=${id}`;
    const forbiddenHeaders: Record<string, string>[] = [{ origin: "https://evil.invalid" }, { "sec-fetch-site": "cross-site" }];
    for (const headers of forbiddenHeaders) expect((await GET(new Request(url, { headers }))).status).toBe(403);
    expect((await GET(new Request(`${url}%20`))).status).toBe(400);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("maps practice concurrency and daily budgets to 429 without leaking errors", async () => {
    const { POST } = await import("@/app/api/ai/practice-submissions/route");
    const { FeedbackJobError } = await import("@/lib/ai/feedback/jobs");
    for (const code of ["ACTIVE_QUOTA", "DAILY_QUOTA"]) {
      mocks.create.mockRejectedValueOnce(new FeedbackJobError(code));
      const response = await POST(request()); expect(response.status).toBe(429);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect((await response.json()).code).toBe(code);
    }
  });
  it("rejects snapshot fields on the read-only hint endpoint instead of treating hints as submissions", async () => {
    const { POST } = await import("@/app/api/ai/practice-feedback/route");
    const response = await POST(request({...body,submissionId:id}));
    expect(response.status).toBe(400);expect(mocks.create).not.toHaveBeenCalled();
  });
  it("returns queued identities without waiting for the model and strips secrets", async () => {
    const { POST } = await import("@/app/api/ai/practice-submissions/route");
    mocks.create.mockResolvedValue({ submissionId: id, jobId: id, status: "queued" });
    const response = await POST(request());
    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ submissionId: id, jobId: id, status: "queued" });
    expect(mocks.create).toHaveBeenCalledWith(mocks.pool, id, "test-1", { ...body, payload: { visitedViewIds: ["monitor"] } });
  });
});
