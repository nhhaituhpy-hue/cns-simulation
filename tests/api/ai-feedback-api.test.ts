// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  queryDatabase: vi.fn(),
  generateAttemptAiFeedback: vi.fn(),
}));

vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: mocks.getCurrentProfile }));
vi.mock("@/lib/db", () => ({ queryDatabase: mocks.queryDatabase }));
vi.mock("@/lib/ai/feedback/attempt-feedback", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/feedback/attempt-feedback")>();
  return {
    ...actual,
    generateAttemptAiFeedback: mocks.generateAttemptAiFeedback,
  };
});

describe("AI feedback HTTP boundaries (practice & examiner review)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CNS_PUBLIC_ORIGIN = "https://labs.cnsvn.com";
  });

  it("rejects unauthenticated or cross-origin requests on practice feedback", async () => {
    const { POST } = await import("@/app/api/ai/practice-feedback/route");
    mocks.getCurrentProfile.mockResolvedValueOnce(null);
    const unauth = await POST(new Request("https://labs.cnsvn.com/api/ai/practice-feedback", {
      method: "POST",
      headers: { origin: "https://labs.cnsvn.com", "content-type": "application/json" },
      body: JSON.stringify({ moduleId: "dvor-1150a", scenarioId: "s1", payload: {} }),
    }));
    expect(unauth.status).toBe(401);

    mocks.getCurrentProfile.mockResolvedValueOnce({ id: "u1", role: "student" });
    const crossOrigin = await POST(new Request("https://labs.cnsvn.com/api/ai/practice-feedback", {
      method: "POST",
      headers: { origin: "https://evil.example.com", "content-type": "application/json" },
      body: JSON.stringify({ moduleId: "dvor-1150a", scenarioId: "s1", payload: {} }),
    }));
    expect(crossOrigin.status).toBe(403);
  });

  it("serves practice feedback to a student only for published practice scenarios, never exam-only scenarios", async () => {
    const { POST } = await import("@/app/api/ai/practice-feedback/route");
    mocks.getCurrentProfile.mockResolvedValue({ id: "student-1", role: "student" });
    mocks.queryDatabase.mockResolvedValueOnce({ rows: [] });

    const denied = await POST(new Request("https://labs.cnsvn.com/api/ai/practice-feedback", {
      method: "POST",
      headers: { origin: "https://labs.cnsvn.com", "content-type": "application/json" },
      body: JSON.stringify({ moduleId: "dvor-1150a", scenarioId: "exam-only-id", payload: {} }),
    }));
    expect(denied.status).toBe(404);

    const def = authoringAdapterFor("dvor-1150a").createDefault();
    mocks.queryDatabase.mockResolvedValueOnce({ rows: [{ definition_json: def }] });
    mocks.generateAttemptAiFeedback.mockResolvedValueOnce({
      moduleId: "dvor-1150a",
      scenarioId: def.id,
      scenarioName: def.name,
      status: "IN_PROGRESS",
      solved: false,
      sourceMode: "ai-assisted",
      summary: "Nhận xét bài ôn tập",
      whatToAchieve: ["[Cần đạt] Integral Monitor Normal"],
      correctActions: ["Đã mở màn hình Monitor"],
      redundantOrWrongAdjustments: ["Chưa nhấn F7 Apply"],
      nextSteps: ["Nhấn F7 Apply"],
      suggestedExaminerComment: "Cần nhấn F7 Apply.",
      references: [],
      notice: "Tham khảo",
    });

    const allowed = await POST(new Request("https://labs.cnsvn.com/api/ai/practice-feedback", {
      method: "POST",
      headers: { origin: "https://labs.cnsvn.com", "content-type": "application/json" },
      body: JSON.stringify({ moduleId: "dvor-1150a", scenarioId: def.id, payload: { visitedViewIds: ["monitor"] } }),
    }));
    expect(allowed.status).toBe(200);
    const json = await allowed.json();
    expect(json.feedback.summary).toBe("Nhận xét bài ôn tập");
    expect(mocks.generateAttemptAiFeedback).toHaveBeenCalledWith(expect.objectContaining({
      moduleId: "dvor-1150a",
      mode: "practice",
    }));
  });

  it("restricts exam-review feedback to admin and reads only submitted/timed_out snapshot evidence", async () => {
    const { POST } = await import("@/app/api/ai/exam-review-feedback/route");
    mocks.getCurrentProfile.mockResolvedValueOnce({ id: "student-1", role: "student" });
    const forbidden = await POST(new Request("https://labs.cnsvn.com/api/ai/exam-review-feedback", {
      method: "POST",
      headers: { origin: "https://labs.cnsvn.com", "content-type": "application/json" },
      body: JSON.stringify({ examId: "e1", codeId: "c1", itemId: "i1" }),
    }));
    expect(forbidden.status).toBe(403);

    mocks.getCurrentProfile.mockResolvedValueOnce({ id: "admin-1", role: "admin" });
    const def = authoringAdapterFor("dvor-1150a").createDefault();
    mocks.queryDatabase.mockResolvedValueOnce({
      rows: [{
        id: "11111111-1111-4111-8111-111111111111",
        status: "submitted",
        module_id: "dvor-1150a",
        scenario_id: def.id,
        library_revision_number: 1,
        definition_snapshot_json: def,
        result_json: {
          version: 1,
          sessionItemId: "11111111-1111-4111-8111-111111111111",
          moduleId: "dvor-1150a",
          scenarioId: def.id,
          revision: 1,
          capturedAt: "2026-10-21T04:00:00.000Z",
          payload: { visitedViewIds: ["monitor"] },
        },
      }],
    });
    mocks.generateAttemptAiFeedback.mockResolvedValueOnce({
      moduleId: "dvor-1150a",
      scenarioId: def.id,
      scenarioName: def.name,
      status: "SOLVED",
      solved: true,
      sourceMode: "ai-assisted",
      summary: "Thí sinh xử lý đúng quy trình.",
      whatToAchieve: ["[Đã đạt] Tất cả tiêu chí"],
      correctActions: ["Đã xử lý đúng"],
      redundantOrWrongAdjustments: [],
      nextSteps: [],
      suggestedExaminerComment: "Thí sinh nắm vững quy trình và hoàn thành đúng yêu cầu.",
      references: [],
      notice: "Tham khảo",
    });

    const ok = await POST(new Request("https://labs.cnsvn.com/api/ai/exam-review-feedback", {
      method: "POST",
      headers: { origin: "https://labs.cnsvn.com", "content-type": "application/json" },
      body: JSON.stringify({
        examId: "22222222-2222-4222-8222-222222222222",
        codeId: "33333333-3333-4333-8333-333333333333",
        itemId: "11111111-1111-4111-8111-111111111111",
      }),
    }));
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.feedback.suggestedExaminerComment).toContain("Thí sinh nắm vững quy trình");
  });
});
