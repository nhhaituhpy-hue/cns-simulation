import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  queryDatabase: vi.fn(),
  cookieGet: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: mocks.getCurrentProfile }));
vi.mock("@/lib/db", () => ({ queryDatabase: mocks.queryDatabase }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: mocks.cookieGet })) }));

import {
  getCandidateScenarioExamSession,
  getScenarioExamDetail,
  listCandidateOpenScenarioExams,
  listScenarioExamPoolCounts,
  listScenarioExams,
} from "@/lib/scenario-exams/queries";
import { hashScenarioExamSessionToken } from "@/lib/scenario-exams/session";
import type { ScenarioExamAvailability } from "@/lib/scenario-exams/types";

const examId = "11111111-1111-4111-8111-111111111111";
const timestamp = "2026-09-30T10:00:00.000Z";
const token = "opaque-candidate-session-token";

function examRow(overrides: Record<string, unknown> = {}) {
  return {
    id: examId,
    name: "Kỳ thi kiểm thử",
    description: "Mô tả kiểm thử",
    opens_at: timestamp,
    closes_at: null,
    duration_minutes: 60,
    status: "open",
    availability: "available",
    code_count: 0,
    terminal_code_count: 0,
    ...overrides,
  };
}

function subjectRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "subject-1",
    moduleId: "dvor-1150a",
    position: 1,
    status: "not_started",
    startedAt: null,
    submittedAt: null,
    ...overrides,
  };
}

function codeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "code-1",
    exam_id: examId,
    code_hint: "EFGH",
    candidate_name: "Thí sinh A",
    candidate_unit: "Đơn vị A",
    status: "issued",
    issued_at: timestamp,
    redeemed_at: null,
    terminal_at: null,
    completed_modules: 0,
    subjects: [subjectRow()],
    ...overrides,
  };
}

function sqlAt(index: number): string {
  return String(mocks.queryDatabase.mock.calls[index]?.[0]).replace(/\s+/g, " ").trim();
}

function expectDatabaseAvailability(sql: string) {
  expect(sql).toContain("case when e.status <> 'open' then e.status when e.closes_at <= now() then 'ended' when e.opens_at > now() then 'upcoming' else 'available' end as availability");
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentProfile.mockResolvedValue({ id: "admin-gate", role: "admin" });
  mocks.queryDatabase.mockResolvedValue({ rows: [] });
  mocks.cookieGet.mockReturnValue({ value: token });
});

describe("Scenario Exam query authorization", () => {
  it.each([null, "student", "teacher"])("rejects %s for admin queries before DB access", async (role) => {
    mocks.getCurrentProfile.mockResolvedValue(role ? { id: "user-gate", role } : null);

    await expect(listScenarioExams()).rejects.toThrow("Bạn không có quyền xem kỳ thi Scenario.");
    await expect(getScenarioExamDetail(examId)).rejects.toThrow("Bạn không có quyền xem kỳ thi Scenario.");
    await expect(listScenarioExamPoolCounts()).rejects.toThrow("Bạn không có quyền xem kỳ thi Scenario.");
    expect(mocks.queryDatabase).not.toHaveBeenCalled();
  });

  it.each([null, "admin", "teacher"])("rejects %s for candidate queries before DB access", async (role) => {
    mocks.getCurrentProfile.mockResolvedValue(role ? { id: "user-gate", role } : null);

    await expect(listCandidateOpenScenarioExams()).rejects.toThrow("Bạn cần đăng nhập tài khoản Thí sinh.");
    await expect(getCandidateScenarioExamSession()).rejects.toThrow("Bạn cần đăng nhập tài khoản Thí sinh.");
    expect(mocks.queryDatabase).not.toHaveBeenCalled();
    expect(mocks.cookieGet).not.toHaveBeenCalled();
  });
});

describe("getScenarioExamDetail", () => {
  it("returns an empty code list for a newly created exam", async () => {
    mocks.queryDatabase.mockResolvedValueOnce({ rows: [examRow()] });

    const detail = await getScenarioExamDetail(examId);

    expect(detail).toEqual({
      id: examId, name: "Kỳ thi kiểm thử", description: "Mô tả kiểm thử",
      opensAt: timestamp, closesAt: null, durationMinutes: 60, status: "open",
      availability: "available",
      codeCount: 0, terminalCodeCount: 0, codes: [],
    });
    expect(mocks.queryDatabase.mock.calls.map(([, values]) => values)).toEqual([[examId], [examId]]);
    expectDatabaseAvailability(sqlAt(0));
    // Unit guard for the reported ordering bug; real PostgreSQL tests validate the syntax.
    expect(sqlAt(1)).toMatch(/count\(cs\.id\) filter \(where cs\.status in \('submitted', 'timed_out'\)\)\)?::int as completed_modules/i);
    expect(sqlAt(1)).not.toMatch(/count\(cs\.id\)::int\s+filter/i);
  });

  it("keeps counts, selected modules, and terminal progress separate for multiple codes", async () => {
    mocks.queryDatabase
      .mockResolvedValueOnce({ rows: [examRow({ code_count: 2, terminal_code_count: 1 })] })
      .mockResolvedValueOnce({ rows: [
        codeRow({
          status: "in_progress", redeemed_at: timestamp, completed_modules: 1,
          subjects: [
            subjectRow({ status: "submitted", startedAt: timestamp, submittedAt: timestamp }),
            subjectRow({ id: "subject-2", moduleId: "dme-1119a", position: 2 }),
          ],
        }),
        codeRow({
          id: "code-2", code_hint: "JKLM", candidate_name: "Thí sinh B", candidate_unit: "Đơn vị B",
          status: "timed_out", terminal_at: timestamp, completed_modules: 1,
          subjects: [subjectRow({ id: "subject-3", moduleId: "ads-b", status: "timed_out" })],
        }),
      ] });

    const detail = await getScenarioExamDetail(examId);

    expect(detail).toMatchObject({ codeCount: 2, terminalCodeCount: 1 });
    expect(detail?.codes).toHaveLength(2);
    expect(detail?.codes[0]).toMatchObject({
      id: "code-1", candidateName: "Thí sinh A", status: "in_progress",
      moduleIds: ["dvor-1150a", "dme-1119a"], completedModules: 1, terminalAt: null,
      subjects: [
        { id: "subject-1", position: 1, status: "submitted", startedAt: timestamp, submittedAt: timestamp },
        { id: "subject-2", position: 2, status: "not_started", startedAt: null, submittedAt: null },
      ],
    });
    expect(detail?.codes[1]).toMatchObject({
      id: "code-2", candidateName: "Thí sinh B", status: "timed_out",
      moduleIds: ["ads-b"], completedModules: 1, terminalAt: timestamp,
    });
    expect(detail?.codes[0]).not.toHaveProperty("code_hash");
  });

  it("returns null for an unknown exam", async () => {
    await expect(getScenarioExamDetail(examId)).resolves.toBeNull();
  });

  it("propagates database failure instead of disguising it as an empty successful exam", async () => {
    mocks.queryDatabase.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(getScenarioExamDetail(examId)).rejects.toThrow("database unavailable");
  });
});

describe("Scenario Exam list queries", () => {
  it("maps exam summaries without leaking raw database columns", async () => {
    mocks.queryDatabase.mockResolvedValueOnce({ rows: [examRow({ code_count: "3", terminal_code_count: "1" })] });

    expect(await listScenarioExams()).toEqual([{
      id: examId, name: "Kỳ thi kiểm thử", opensAt: timestamp, closesAt: null,
      durationMinutes: 60, status: "open", codeCount: 3, terminalCodeCount: 1,
      availability: "available",
    }]);
    expectDatabaseAvailability(sqlAt(0));
    expect(sqlAt(0)).toContain("count(c.id) filter (where c.status in ('submitted', 'timed_out'))::int");
  });

  it.each<ScenarioExamAvailability>(["draft", "upcoming", "available", "ended", "locked", "closed", "archived"])(
    "preserves the database-computed %s availability in summary and detail projections",
    async (availability) => {
      const row = examRow({ availability });
      mocks.queryDatabase
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rows: [] });

      expect((await listScenarioExams())[0].availability).toBe(availability);
      expect((await getScenarioExamDetail(examId))?.availability).toBe(availability);
      expectDatabaseAvailability(sqlAt(0));
      expectDatabaseAvailability(sqlAt(1));
    },
  );

  it("returns all six modules and a zero count for empty active exam pools", async () => {
    mocks.queryDatabase.mockResolvedValueOnce({ rows: [{ module_id: "dvor-1150a", count: 2 }] });

    const pools = await listScenarioExamPoolCounts();

    expect(pools).toHaveLength(6);
    expect(pools.find((pool) => pool.moduleId === "dvor-1150a")).toEqual({ moduleId: "dvor-1150a", count: 2 });
    expect(pools.find((pool) => pool.moduleId === "ads-b")).toEqual({ moduleId: "ads-b", count: 0 });
    expect(sqlAt(0)).toContain("library_kind = 'exam' and archived_at is null");
  });

  it("lists available and upcoming exams without exposing candidate data", async () => {
    mocks.getCurrentProfile.mockResolvedValue({ id: "student-gate", role: "student" });
    mocks.queryDatabase.mockResolvedValueOnce({ rows: [
      examRow({ candidate_name: "Private candidate", code_hash: "private-code-hash" }),
      examRow({ id: "future-exam", name: "Kỳ thi sắp mở", availability: "upcoming", opens_at: "2026-11-20T00:00:00.000Z" }),
    ] });

    expect(await listCandidateOpenScenarioExams()).toEqual([{
      id: examId, name: "Kỳ thi kiểm thử", opensAt: timestamp, closesAt: null, durationMinutes: 60,
      availability: "available",
    }, {
      id: "future-exam", name: "Kỳ thi sắp mở", opensAt: "2026-11-20T00:00:00.000Z", closesAt: null, durationMinutes: 60,
      availability: "upcoming",
    }]);
    expectDatabaseAvailability(sqlAt(0));
    expect(sqlAt(0)).toContain("where e.status = 'open' and (e.closes_at is null or e.closes_at > now())");
    expect(sqlAt(0)).not.toContain("opens_at <= now()");
    expect(sqlAt(0)).toContain("order by case when e.opens_at > now() then 1 else 0 end, e.opens_at nulls first, e.created_at desc, e.id");
    expect(sqlAt(0)).not.toMatch(/candidate_name|candidate_unit|candidate_user_id|code_hash|email/);
  });
});

describe("getCandidateScenarioExamSession", () => {
  beforeEach(() => {
    mocks.getCurrentProfile.mockResolvedValue({ id: "student-gate", role: "student" });
  });

  it("does not query the database without a session cookie", async () => {
    mocks.cookieGet.mockReturnValue(undefined);

    await expect(getCandidateScenarioExamSession()).resolves.toBeNull();
    expect(mocks.queryDatabase).not.toHaveBeenCalled();
  });

  it("returns null for a token that does not resolve to a session", async () => {
    await expect(getCandidateScenarioExamSession()).resolves.toBeNull();
    expect(mocks.queryDatabase.mock.calls[0]?.[1]).toEqual([hashScenarioExamSessionToken(token)]);
  });

  it("loads only the code-selected subjects using token identity, not student account assignment", async () => {
    mocks.queryDatabase.mockResolvedValueOnce({ rows: [{
      id: "session-1", exam_id: examId, exam_name: "Kỳ thi kiểm thử",
      candidate_name: "Thí sinh A", candidate_unit: "Đơn vị A", status: "in_progress",
      started_at: timestamp, deadline_at: "2026-09-30T11:00:00.000Z", submitted_at: null,
      subjects: [
        subjectRow({ status: "in_progress", startedAt: timestamp, sessionItemId: "item-1", scenarioName: "Scenario đã cấp" }),
        subjectRow({ id: "subject-2", moduleId: "dme-1119a", position: 2, sessionItemId: null, scenarioName: null }),
      ],
    }] });

    const session = await getCandidateScenarioExamSession();

    expect(session).toMatchObject({
      id: "session-1", examId, candidateName: "Thí sinh A", candidateUnit: "Đơn vị A", status: "in_progress",
      startedAt: timestamp, deadlineAt: "2026-09-30T11:00:00.000Z", submittedAt: null,
    });
    expect(session?.subjects).toHaveLength(2);
    expect(session?.subjects[0]).toMatchObject({
      id: "subject-1", moduleId: "dvor-1150a", status: "in_progress", sessionItemId: "item-1", scenarioName: "Scenario đã cấp",
    });
    expect(session?.subjects[1]).toMatchObject({
      id: "subject-2", moduleId: "dme-1119a", status: "not_started", sessionItemId: null, scenarioName: null,
    });
    expect(mocks.queryDatabase.mock.calls[0]?.[1]).toEqual([hashScenarioExamSessionToken(token)]);
    expect(sqlAt(0)).toContain("where s.session_token_hash = $1");
    expect(sqlAt(0)).not.toMatch(/candidate_user_id|email/);
    expect(JSON.stringify(session)).not.toContain(token);
  });
});
