import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  query: vi.fn(),
  withDatabaseTransaction: vi.fn(),
  revalidatePath: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: mocks.getCurrentProfile }));
vi.mock("@/lib/db", () => ({ withDatabaseTransaction: mocks.withDatabaseTransaction }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mocks.cookieGet, set: mocks.cookieSet })),
}));

import {
  createScenarioExamAction,
  issueScenarioExamCodeAction,
  redeemScenarioExamCodeAction,
  setScenarioExamStatusAction,
  startScenarioExamSubjectAction,
  saveScenarioExamItemAction,
  submitScenarioExamItemAction,
  submitScenarioExamSessionAction,
} from "@/lib/scenario-exams/actions";
import { hashScenarioExamCode, isScenarioExamCode } from "@/lib/scenario-exams/codes";
import { decryptScenarioExamCode } from "@/lib/scenario-exams/code-encryption";
import { hashScenarioExamSessionToken } from "@/lib/scenario-exams/session";

const examId = "11111111-1111-4111-8111-111111111111";
const codeId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";
const subjectId = "44444444-4444-4444-8444-444444444444";
const itemId = "55555555-5555-4555-8555-555555555555";
const membershipId = "66666666-6666-4666-8666-666666666666";
const userId = "77777777-7777-4777-8777-777777777777";
const now = new Date("2026-09-30T10:00:00.000Z");
const validCode = "ABCD2345EFGH";
const token = "opaque-candidate-session-token";
const unexpectedError = "Không thể xử lý kỳ thi Scenario. Vui lòng thử lại hoặc liên hệ giám khảo.";
const testEncryptionKey = "11".repeat(32);

function profile(role = "admin") {
  return { id: userId, role, email: "gate-only@example.test" };
}

function examInput() {
  return { name: " Kỳ thi thử nghiệm ", description: " Kiểm tra ", durationMinutes: 60 };
}

function issueInput() {
  return {
    examId,
    candidateName: "Thí sinh kiểm thử",
    candidateUnit: "Đơn vị kiểm thử",
    moduleIds: ["dvor-1150a", "dme-1119a"],
  };
}

function activeSubject(overrides: Record<string, unknown> = {}) {
  return {
    session_id: sessionId,
    session_status: "in_progress",
    deadline_at: "2026-09-30T11:00:00.000Z",
    exam_id: examId,
    module_id: "dvor-1150a",
    subject_status: "not_started",
    ...overrides,
  };
}

function sqlAt(index: number): string {
  return String(mocks.query.mock.calls[index]?.[0]).replace(/\s+/g, " ").trim();
}

function revalidatedPaths() {
  return mocks.revalidatePath.mock.calls.map(([path]) => path);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY = testEncryptionKey;
  mocks.getCurrentProfile.mockResolvedValue(profile());
  mocks.cookieGet.mockReturnValue({ value: token });
  mocks.query.mockResolvedValue({ rows: [], rowCount: 0 });
  mocks.withDatabaseTransaction.mockImplementation(
    async (work: (client: { query: typeof mocks.query }) => Promise<unknown>) => work({ query: mocks.query }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Scenario Exam action authorization", () => {
  it.each([null, "admin", "teacher"])("rejects %s for save/submit before reading the cookie or database", async (role) => {
    mocks.getCurrentProfile.mockResolvedValue(role ? profile(role) : null);
    const results = await Promise.all([saveScenarioExamItemAction(itemId, {}), submitScenarioExamItemAction(itemId, {}), submitScenarioExamSessionAction()]);
    for (const result of results) expect(result).toEqual({ ok: false, message: "Bạn cần đăng nhập tài khoản Thí sinh." });
    expect(mocks.cookieGet).not.toHaveBeenCalled();
    expect(mocks.withDatabaseTransaction).not.toHaveBeenCalled();
  });

  it("requires the code session cookie for saving/submitting evidence", async () => {
    mocks.getCurrentProfile.mockResolvedValue(profile("student"));
    mocks.cookieGet.mockReturnValue(undefined);
    const results = await Promise.all([saveScenarioExamItemAction(itemId, {}), submitScenarioExamItemAction(itemId, {}), submitScenarioExamSessionAction()]);
    for (const result of results) expect(result.ok).toBe(false);
    expect(mocks.withDatabaseTransaction).not.toHaveBeenCalled();
  });

  it.each([null, "student", "teacher"])("rejects %s for every admin mutation before DB access", async (role) => {
    mocks.getCurrentProfile.mockResolvedValue(role ? profile(role) : null);

    const results = await Promise.all([
      createScenarioExamAction(examInput()),
      setScenarioExamStatusAction(examId, "open"),
      issueScenarioExamCodeAction(issueInput()),
    ]);

    for (const result of results) {
      expect(result).toEqual({ ok: false, message: "Bạn không có quyền quản lý kỳ thi Scenario." });
    }
    expect(mocks.withDatabaseTransaction).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([null, "admin", "teacher"])("rejects %s for candidate actions before DB access", async (role) => {
    mocks.getCurrentProfile.mockResolvedValue(role ? profile(role) : null);

    expect(await redeemScenarioExamCodeAction(examId, validCode)).toEqual({
      ok: false, message: "Bạn cần đăng nhập tài khoản Thí sinh.",
    });
    expect(await startScenarioExamSubjectAction(subjectId)).toEqual({
      ok: false, message: "Bạn cần đăng nhập tài khoản Thí sinh.",
    });
    expect(mocks.withDatabaseTransaction).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
});

describe("createScenarioExamAction", () => {
  it("creates a draft with a typed JSON audit parameter and refreshes the new list route", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ id: examId }], rowCount: 1 });

    const result = await createScenarioExamAction(examInput());

    expect(result).toMatchObject({ ok: true, data: { id: examId } });
    expect(mocks.query.mock.calls[0]?.[1]).toEqual([
      "Kỳ thi thử nghiệm", "Kiểm tra", null, null, 60, userId,
    ]);
    expect(sqlAt(1)).toContain("jsonb_build_object('name', $3::text)");
    expect(mocks.query.mock.calls[1]?.[1]).toEqual([examId, userId, "Kỳ thi thử nghiệm"]);
    expect(revalidatedPaths()).toEqual(["/admin/scenario-exams"]);
  });

  it("rejects a closing time before the opening time before entering the transaction", async () => {
    const result = await createScenarioExamAction({
      ...examInput(),
      opensAt: "2026-10-02T00:00:00.000Z",
      closesAt: "2026-10-01T00:00:00.000Z",
    });

    expect(result).toEqual({ ok: false, message: "Thời điểm đóng phải sau thời điểm mở." });
    expect(mocks.withDatabaseTransaction).not.toHaveBeenCalled();
  });

  it("lets audit failure reject the transaction, with no success or raw database message", async () => {
    const error = Object.assign(new Error("could not determine data type of parameter $3; private candidate data"), {
      code: "42P18", detail: "private database detail",
    });
    mocks.query
      .mockResolvedValueOnce({ rows: [{ id: examId }], rowCount: 1 })
      .mockRejectedValueOnce(error);

    const result = await createScenarioExamAction(examInput());

    // The action must not catch inside the callback: the real DB wrapper owns rollback.
    await expect(mocks.withDatabaseTransaction.mock.results[0]?.value).rejects.toBe(error);
    expect(result).toEqual({ ok: false, message: unexpectedError });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain("private candidate data");
    expect(logged).not.toContain("private database detail");
    expect(logged).not.toContain("could not determine data type");
  });
});

describe("setScenarioExamStatusAction", () => {
  it.each([
    ["open", "exam_opened"],
    ["locked", "exam_locked"],
    ["closed", "exam_closed"],
  ])("updates %s, audits it, and refreshes only new exam routes", async (status, eventType) => {
    mocks.query.mockResolvedValueOnce({ rows: [{ id: examId }], rowCount: 1 });

    expect(await setScenarioExamStatusAction(examId, status)).toMatchObject({ ok: true });
    expect(mocks.query.mock.calls[0]?.[1]).toEqual([examId, status]);
    expect(mocks.query.mock.calls[1]?.[1]).toEqual([examId, userId, eventType]);
    expect(revalidatedPaths()).toEqual(expect.arrayContaining([
      "/admin/scenario-exams", `/admin/scenario-exams/${examId}`, "/student/scenario-exams",
    ]));
    expect(revalidatedPaths().some((path) => String(path).includes("/admin/exams"))).toBe(false);
  });

  it("rejects malformed IDs and unsupported statuses before DB access", async () => {
    expect(await setScenarioExamStatusAction("not-a-uuid", "open")).toMatchObject({ ok: false });
    expect(await setScenarioExamStatusAction(examId, "unknown")).toEqual({
      ok: false, message: "Trạng thái kỳ thi không hợp lệ.",
    });
    expect(mocks.withDatabaseTransaction).not.toHaveBeenCalled();
  });

  it("does not audit a missing exam", async () => {
    expect(await setScenarioExamStatusAction(examId, "open")).toEqual({
      ok: false, message: "Không tìm thấy kỳ thi Scenario.",
    });
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("issueScenarioExamCodeAction", () => {
  it("checks both selected pools and persists a hashed code with ordered subjects", async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ status: "open", duration_minutes: 60 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{}], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{}], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: codeId }], rowCount: 1 });

    const result = await issueScenarioExamCodeAction(issueInput());

    expect(result.ok).toBe(true);
    expect(isScenarioExamCode(result.data?.code ?? "")).toBe(true);
    expect(mocks.query.mock.calls[1]?.[1]).toEqual(["dvor-1150a"]);
    expect(mocks.query.mock.calls[2]?.[1]).toEqual(["dme-1119a"]);
    const codeHash = hashScenarioExamCode(result.data!.code);
    const insertParams = mocks.query.mock.calls[3]?.[1] as unknown[];
    expect(insertParams?.slice(0, 3)).toEqual([examId, codeHash, result.data!.code.slice(-4)]);
    expect(insertParams?.slice(4, 7)).toEqual(["Thí sinh kiểm thử", "Đơn vị kiểm thử", userId]);
    expect(typeof insertParams?.[3]).toBe("string");
    expect(decryptScenarioExamCode(String(insertParams?.[3]), examId, codeHash)).toBe(result.data!.code);
    expect(mocks.query.mock.calls[4]?.[1]).toEqual([codeId, "dvor-1150a", 1]);
    expect(mocks.query.mock.calls[5]?.[1]).toEqual([codeId, "dme-1119a", 2]);
    expect(sqlAt(6)).toContain("jsonb_build_object('moduleIds', $4::jsonb)");
    expect(revalidatedPaths()).toEqual(expect.arrayContaining([
      "/admin/scenario-exams", `/admin/scenario-exams/${examId}`,
    ]));
  });

  it("rejects an empty pool without issuing a partial candidate code", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ status: "open", duration_minutes: 60 }], rowCount: 1 });

    const result = await issueScenarioExamCodeAction(issueInput());

    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("chưa có scenario") });
    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.query.mock.calls.some(([sql]) => /insert into/i.test(String(sql)))).toBe(false);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not issue a code for a locked exam", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ status: "locked", duration_minutes: 60 }], rowCount: 1 });

    expect(await issueScenarioExamCodeAction(issueInput())).toEqual({
      ok: false, message: "Kỳ thi chưa ở trạng thái mở để cấp mã.",
    });
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });
});

describe("redeemScenarioExamCodeAction", () => {
  beforeEach(() => {
    mocks.getCurrentProfile.mockResolvedValue(profile("student"));
  });

  it.each(["", "malformed-id", null, 123])("rejects invalid exam ID %s before DB access", async (invalidId) => {
    expect(await redeemScenarioExamCodeAction(invalidId, validCode)).toEqual({
      ok: false, message: "Mã kỳ thi không hợp lệ.",
    });
    expect(mocks.withDatabaseTransaction).not.toHaveBeenCalled();
  });

  it.each(["", "   ", "short", "ABCD2345EFOH"])("rejects invalid code %s before DB access", async (code) => {
    expect(await redeemScenarioExamCodeAction(examId, code)).toMatchObject({ ok: false });
    expect(mocks.withDatabaseTransaction).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it.each([
    [null, "2026-09-30T11:00:00.000Z"],
    ["2026-09-30T10:30:00.000Z", "2026-09-30T10:30:00.000Z"],
  ])("uses the earlier duration/close deadline when closes_at is %s", async (closesAt, deadline) => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ id: examId, duration_minutes: 60, closes_at: closesAt }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: codeId, candidate_name: "Thí sinh kiểm thử", candidate_unit: "Đơn vị kiểm thử" }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: sessionId }], rowCount: 1 });

    const result = await redeemScenarioExamCodeAction(examId, " abcd-2345-efgh ");

    expect(result).toMatchObject({ ok: true, data: { sessionId } });
    expect(mocks.query.mock.calls[1]?.[1]).toEqual([examId, hashScenarioExamCode(validCode)]);
    const cookie = mocks.cookieSet.mock.calls[0];
    expect(cookie?.[0]).toBe("cns_scenario_exam_session");
    expect(cookie?.[2]).toMatchObject({
      httpOnly: true, sameSite: "lax", path: "/student/scenario-exams", expires: new Date(deadline),
    });
    expect(mocks.query.mock.calls[2]?.[1]).toEqual([
      codeId, userId, hashScenarioExamSessionToken(String(cookie?.[1])), now, new Date(deadline),
    ]);
    // Account identifies the access audit; selecting the code must never require an assigned email/user.
    expect(sqlAt(1)).not.toMatch(/candidate_user_id|email/);
    expect(sqlAt(1)).toContain("status = 'issued'");
    expect(revalidatedPaths()).toEqual(expect.arrayContaining([
      `/admin/scenario-exams/${examId}`, "/student/scenario-exams/session",
    ]));
  });

  it("rejects a reused or wrong code without creating a session or cookie", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ id: examId, duration_minutes: 60, closes_at: null }], rowCount: 1 });

    expect(await redeemScenarioExamCodeAction(examId, validCode)).toEqual({
      ok: false, message: "Mã code không đúng hoặc đã được sử dụng. Vui lòng liên hệ giám khảo để được hỗ trợ.",
    });
    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("requires the exam to be open and inside its time window", async () => {
    expect(await redeemScenarioExamCodeAction(examId, validCode)).toEqual({
      ok: false, message: "Kỳ thi không mở hoặc đã hết thời gian.",
    });
    expect(sqlAt(0)).toContain("status = 'open'");
    expect(sqlAt(0)).toContain("opens_at <= now()");
    expect(sqlAt(0)).toContain("closes_at > now()");
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
});

describe("startScenarioExamSubjectAction", () => {
  beforeEach(() => {
    mocks.getCurrentProfile.mockResolvedValue(profile("student"));
  });

  it("does not tell candidates to reuse a consumed code when the cookie is missing", async () => {
    mocks.cookieGet.mockReturnValue(undefined);

    expect(await startScenarioExamSubjectAction(subjectId)).toEqual({
      ok: false, message: "Không tìm thấy phiên thi hợp lệ. Vui lòng liên hệ giám khảo để được hỗ trợ.",
    });
    expect(mocks.withDatabaseTransaction).not.toHaveBeenCalled();
  });

  it("rejects malformed subject IDs before DB access", async () => {
    expect(await startScenarioExamSubjectAction("invalid")).toEqual({ ok: false, message: "Mã môn thi không hợp lệ." });
    expect(mocks.withDatabaseTransaction).not.toHaveBeenCalled();
  });

  it("rejects a foreign subject while selecting only by session token and subject ID", async () => {
    expect(await startScenarioExamSubjectAction(subjectId)).toEqual({
      ok: false, message: "Không tìm thấy môn thi trong phiên hiện tại.",
    });
    expect(mocks.query.mock.calls[0]?.[1]).toEqual([hashScenarioExamSessionToken(token), subjectId]);
    expect(sqlAt(0)).toContain("s.session_token_hash = $1 and cs.id = $2");
    expect(sqlAt(0)).not.toMatch(/candidate_user_id|email/);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it.each(["submitted", "timed_out", "revoked"])("rejects %s sessions before reading a saved item", async (status) => {
    mocks.query.mockResolvedValueOnce({ rows: [activeSubject({ session_status: status })], rowCount: 1 });

    expect(await startScenarioExamSubjectAction(subjectId)).toEqual({ ok: false, message: "Phiên thi đã kết thúc." });
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("rejects a deadline equal to server time before returning an existing snapshot", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [activeSubject({ deadline_at: now.toISOString() })], rowCount: 1 });

    expect(await startScenarioExamSubjectAction(subjectId)).toEqual({ ok: false, message: "Phiên thi đã hết thời gian." });
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it.each(["submitted", "timed_out"])("rejects a %s subject before reading a saved item", async (status) => {
    mocks.query.mockResolvedValueOnce({ rows: [activeSubject({ subject_status: status })], rowCount: 1 });

    expect(await startScenarioExamSubjectAction(subjectId)).toMatchObject({ ok: false });
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("locks session/subject before reading and reuses an existing snapshot without rerolling", async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [activeSubject({ subject_status: "in_progress" })], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: itemId, scenario_name: "Scenario đã cấp" }], rowCount: 1 });

    const result = await startScenarioExamSubjectAction(subjectId);

    expect(result.data).toEqual({ id: itemId, moduleId: "dvor-1150a", scenarioName: "Scenario đã cấp" });
    expect(result.ok).toBe(true);
    expect(sqlAt(0)).toMatch(/for update of s,\s*cs/i);
    expect(sqlAt(0)).not.toMatch(/left join/i);
    expect(sqlAt(1)).toContain("from public.scenario_exam_session_items");
    expect(mocks.query.mock.calls[1]?.[1]).toEqual([sessionId, subjectId]);
    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.query.mock.calls.some(([sql]) => /random\(\)/i.test(String(sql)))).toBe(false);
  });

  it("assigns one active exam scenario, snapshots it, and writes typed audit values", async () => {
    const definition = { moduleId: "dvor-1150a", scenarioId: "scenario-one", schemaVersion: 1 };
    mocks.query
      .mockResolvedValueOnce({ rows: [activeSubject()], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: membershipId, revision_number: 3, scenario_id: "scenario-one", name: "Scenario một", definition_json: definition }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: itemId }], rowCount: 1 });

    const result = await startScenarioExamSubjectAction(subjectId);

    expect(result).toMatchObject({ ok: true, data: { id: itemId, moduleId: "dvor-1150a", scenarioName: "Scenario một" } });
    expect(sqlAt(2)).toContain("library_kind = 'exam'");
    expect(sqlAt(2)).toContain("archived_at is null");
    expect(sqlAt(2)).toMatch(/order by random\(\) limit 1/i);
    expect(mocks.query.mock.calls[2]?.[1]).toEqual(["dvor-1150a"]);
    expect(mocks.query.mock.calls[3]?.[1]).toEqual([
      sessionId, subjectId, "dvor-1150a", membershipId, 3, "scenario-one", "Scenario một", definition,
    ]);
    expect(sqlAt(5)).toContain("jsonb_build_object('moduleId', $4::text, 'scenarioId', $5::text)");
    expect(mocks.query.mock.calls[5]?.[1]).toEqual([examId, sessionId, userId, "dvor-1150a", "scenario-one"]);
    expect(revalidatedPaths()).toEqual(expect.arrayContaining([
      `/admin/scenario-exams/${examId}`, "/student/scenario-exams/session",
    ]));
  });

  it("does not write an item if the scenario pool became empty after code issuance", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [activeSubject()], rowCount: 1 });

    expect(await startScenarioExamSubjectAction(subjectId)).toEqual({
      ok: false, message: "Môn thi chưa có scenario trong thư viện Kiểm tra.",
    });
    expect(mocks.query).toHaveBeenCalledTimes(3);
    expect(mocks.query.mock.calls.some(([sql]) => /insert into/i.test(String(sql)))).toBe(false);
  });

  it("sanitizes unexpected DB errors without exposing query or connection details", async () => {
    mocks.query.mockRejectedValueOnce(new Error("connection failed: postgres://private-user:private-password@private-db"));

    expect(await startScenarioExamSubjectAction(subjectId)).toEqual({ ok: false, message: unexpectedError });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private-password");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
