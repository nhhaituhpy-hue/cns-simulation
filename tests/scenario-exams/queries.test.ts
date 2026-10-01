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
  getCandidateScenarioExamItem,
  getScenarioExamDetail,
  getScenarioExamSubmissionReview,
  listCandidateOpenScenarioExams,
  listScenarioExamPoolCounts,
  listScenarioExams,
} from "@/lib/scenario-exams/queries";
import { hashScenarioExamSessionToken } from "@/lib/scenario-exams/session";
import type { ScenarioExamAvailability } from "@/lib/scenario-exams/types";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";

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
    await expect(getScenarioExamSubmissionReview(examId, "22222222-2222-4222-8222-222222222222")).rejects.toThrow("Bạn không có quyền xem kỳ thi Scenario.");
    expect(mocks.queryDatabase).not.toHaveBeenCalled();
  });

  it.each([null, "admin", "teacher"])("rejects %s for candidate queries before DB access", async (role) => {
    mocks.getCurrentProfile.mockResolvedValue(role ? { id: "user-gate", role } : null);

    await expect(listCandidateOpenScenarioExams()).rejects.toThrow("Bạn cần đăng nhập tài khoản Thí sinh.");
    await expect(getCandidateScenarioExamSession()).rejects.toThrow("Bạn cần đăng nhập tài khoản Thí sinh.");
    await expect(getCandidateScenarioExamItem("55555555-5555-4555-8555-555555555555")).rejects.toThrow("Bạn cần đăng nhập tài khoản Thí sinh.");
    expect(mocks.queryDatabase).not.toHaveBeenCalled();
    expect(mocks.cookieGet).not.toHaveBeenCalled();
  });
});

describe("getScenarioExamSubmissionReview", () => {
  const codeId = "22222222-2222-4222-8222-222222222222";
  const itemId = "55555555-5555-4555-8555-555555555555";
  const definition = createDefaultDvor1150aScenarioDefinition();
  const result = { version: 1, sessionItemId: itemId, moduleId: "dvor-1150a", scenarioId: definition.id, revision: 7, capturedAt: timestamp, payload: { answer: { suspectedFault: "Reference" }, checkpoint: { config: { reference: 100 } } } };
  function code() { return { id: codeId, exam_id: examId, exam_name: "Exam", code_hint: "7EGD", candidate_name: "Candidate A", candidate_unit: "Unit A", code_status: "submitted", session_id: "session-1", session_status: "submitted", started_at: timestamp, deadline_at: timestamp, submitted_at: timestamp, code_hash: "private-hash", session_token_hash: "private-token-hash" }; }
  function subject(overrides: Record<string, unknown> = {}) { return { subject_id: "subject-1", module_id: "dvor-1150a", status: "submitted", item_id: itemId, scenario_id: definition.id, scenario_name: "Assigned scenario", library_revision_number: 7, started_at: timestamp, submitted_at: timestamp, definition_snapshot_json: definition, result_json: result, examiner_score: "0.00", examiner_comment: "Review", reviewed_at: timestamp, reviewed_by_name: "Examiner", ...overrides }; }

  it("scopes the code to its exam, loads frozen item evidence, and preserves a zero score", async () => {
    mocks.queryDatabase.mockResolvedValueOnce({ rows: [code()] }).mockResolvedValueOnce({ rows: [subject()] });
    const review = await getScenarioExamSubmissionReview(examId, codeId);
    expect(review?.subjects[0]).toMatchObject({ itemId, result, definition, examinerScore: 0, reviewedByName: "Examiner" });
    expect(mocks.queryDatabase.mock.calls.map(([, values]) => values)).toEqual([[examId, codeId], [codeId, "session-1"]]);
    expect(sqlAt(0)).toContain("where c.exam_id = $1 and c.id = $2");
    expect(sqlAt(1)).toContain("item.session_id = $2 and item.module_id = cs.module_id");
    expect(sqlAt(1)).not.toMatch(/simulator_scenario_parameters|simulator_scenario_library_memberships/);
    expect(JSON.stringify(review)).not.toMatch(/private-hash|private-token-hash/);
    expect(mocks.cookieGet).not.toHaveBeenCalled();
  });

  it("returns null for an unknown code or code outside the exam", async () => {
    expect(await getScenarioExamSubmissionReview(examId, codeId)).toBeNull();
    expect(mocks.queryDatabase).toHaveBeenCalledOnce();
  });

  it("validates IDs before SQL", async () => {
    expect(await getScenarioExamSubmissionReview("invalid", codeId)).toBeNull();
    expect(mocks.queryDatabase).not.toHaveBeenCalled();
  });

  it("marks corrupt or foreign result metadata as invalid instead of displaying it", async () => {
    mocks.queryDatabase.mockResolvedValueOnce({ rows: [code()] }).mockResolvedValueOnce({ rows: [subject({ result_json: { ...result, sessionItemId: "foreign-item" } })] });
    expect((await getScenarioExamSubmissionReview(examId, codeId))?.subjects[0]).toMatchObject({ result: null, resultInvalid: true });
  });

  it("shows unstarted selected subjects without attempting to load a live source", async () => {
    mocks.queryDatabase.mockResolvedValueOnce({ rows: [code()] }).mockResolvedValueOnce({ rows: [subject({ status: "not_started", item_id: null, definition_snapshot_json: null, result_json: null, library_revision_number: null, examiner_score: null })] });
    expect((await getScenarioExamSubmissionReview(examId, codeId))?.subjects[0]).toMatchObject({ status: "not_started", itemId: null, definition: null, result: null, resultInvalid: false, examinerScore: null });
  });
});

describe("getCandidateScenarioExamItem", () => {
  const itemId = "55555555-5555-4555-8555-555555555555";
  const definition = createDefaultDvor1150aScenarioDefinition();
  function itemRow(overrides: Record<string, unknown> = {}) {
    return {
      id: itemId, session_id: "session-1", code_subject_id: "subject-1", module_id: "dvor-1150a",
      exam_name: "Kỳ thi", candidate_name: "Thí sinh", candidate_unit: "Đơn vị",
      scenario_id: definition.id, scenario_name: definition.name, library_revision_number: 7,
      definition_snapshot_json: definition, started_at: timestamp, deadline_at: "2026-09-30T11:00:00.000Z",
      ...overrides,
    };
  }

  beforeEach(() => { mocks.getCurrentProfile.mockResolvedValue({ id: "student-gate", role: "student" }); });

  it("returns only the assigned snapshot through the cookie identity and original deadline", async () => {
    mocks.queryDatabase.mockResolvedValueOnce({ rows: [itemRow({ code_hash: "private", result_json: { answer: "private" } })] });
    const item = await getCandidateScenarioExamItem(itemId);
    expect(item).toMatchObject({ id: itemId, sessionId: "session-1", subjectId: "subject-1", revision: 7, definition, deadlineAt: "2026-09-30T11:00:00.000Z" });
    expect(mocks.queryDatabase.mock.calls[0]?.[1]).toEqual([hashScenarioExamSessionToken(token), itemId]);
    expect(sqlAt(0)).toContain("s.session_token_hash = $1 and item.id = $2");
    expect(sqlAt(0)).toContain("s.deadline_at > now()");
    expect(sqlAt(0)).toContain("cs.code_id = s.code_id and cs.module_id = item.module_id");
    expect(sqlAt(0)).toContain("cs.status = 'in_progress' and item.status = 'in_progress'");
    expect(sqlAt(0)).not.toMatch(/simulator_scenario_library_memberships|simulator_scenario_parameters|candidate_user_id|email/);
    expect(item).not.toHaveProperty("code_hash");
    expect(item).not.toHaveProperty("result_json");
    expect(JSON.stringify(item)).not.toContain(token);
  });

  it("does not query without a cookie", async () => {
    mocks.cookieGet.mockReturnValue(undefined);
    expect(await getCandidateScenarioExamItem(itemId)).toBeNull();
    expect(mocks.queryDatabase).not.toHaveBeenCalled();
  });

  it("rejects malformed item IDs before reading the cookie or database", async () => {
    expect(await getCandidateScenarioExamItem("not-a-uuid")).toBeNull();
    expect(mocks.cookieGet).not.toHaveBeenCalled();
    expect(mocks.queryDatabase).not.toHaveBeenCalled();
  });

  it("returns null for an unknown, foreign or finished item", async () => {
    expect(await getCandidateScenarioExamItem(itemId)).toBeNull();
  });

  it.each([
    { module_id: "unknown" },
    { module_id: "dme-1119a" },
    { definition_snapshot_json: {} },
    { scenario_id: "another-scenario" },
  ])("does not load an invalid or mismatched snapshot: %j", async (overrides) => {
    mocks.queryDatabase.mockResolvedValueOnce({ rows: [itemRow(overrides)] });
    expect(await getCandidateScenarioExamItem(itemId)).toBeNull();
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
