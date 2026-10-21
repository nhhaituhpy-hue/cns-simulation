import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mock.set }) }));
import { setScenarioExamSessionCookie } from "@/lib/scenario-exams/session";

describe("scenario exam review cookie", () => {
  beforeEach(() => vi.clearAllMocks());
  it("keeps the exact code token for one bounded review day after deadline, not extra write time", async () => {
    const deadline = new Date("2026-10-01T11:00:00Z");
    await setScenarioExamSessionCookie("exact-code-token", deadline);
    expect(mock.set).toHaveBeenCalledWith("cns_scenario_exam_session", "exact-code-token", expect.objectContaining({
      httpOnly: true, sameSite: "lax", path: "/student/scenario-exams", expires: new Date("2026-10-02T11:00:00Z"),
    }));
    expect(deadline.toISOString()).toBe("2026-10-01T11:00:00.000Z");
  });
});
