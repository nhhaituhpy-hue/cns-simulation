import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentProfile, type AuthProfile } from "@/lib/auth/profile";
import { queryDatabase } from "@/lib/db";
import {
  createScenarioExamAction,
  issueScenarioExamCodeAction,
  redeemScenarioExamCodeAction,
  setScenarioExamStatusAction,
  startScenarioExamSubjectAction,
  saveScenarioExamItemAction,
  submitScenarioExamItemAction,
  submitScenarioExamSessionAction,
  saveScenarioExamReviewAction,
} from "@/lib/scenario-exams/actions";
import {
  getCandidateScenarioExamSession,
  getCandidateScenarioExamItem,
  getScenarioExamDetail,
  getScenarioExamSubmissionReview,
  listCandidateOpenScenarioExams,
  listScenarioExamPoolCounts,
  listScenarioExams,
} from "@/lib/scenario-exams/queries";
import { decryptScenarioExamCode } from "@/lib/scenario-exams/code-encryption";
import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { parseScenarioParameters } from "@/lib/scenario-parameters";
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
import { createLowOutputDme1119aScenario } from "@/lib/dme1119a/scenario";
import { buildCandidateScenarioExamResult } from "@/lib/scenario-exams/browser-results";

const cookieJar = vi.hoisted(() => new Map<string, string>());
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined,
    set: (name: string, value: string) => { cookieJar.set(name, value); },
  }),
}));

const admin: AuthProfile = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "admin",
  email: "scenario-test-admin@attech.com.vn",
  fullName: "Test examiner",
  workUnit: "Isolated test lab",
  mustChangePassword: false,
};
const student: AuthProfile = {
  ...admin,
  id: "22222222-2222-4222-8222-222222222222",
  role: "student",
  email: "scenario-test-student@attech.com.vn",
  fullName: "Test candidate",
};

// Never fall back to DATABASE_URL/.env.local: this suite creates and drops only
// its own randomly named database through an explicit loopback test endpoint.
const testUrl = process.env.SCENARIO_EXAM_TEST_DATABASE_URL;
const testEncryptionKey = "33".repeat(32);
describe.skipIf(!testUrl)("Scenario Exam actions against real PostgreSQL", () => {
  const databaseName = `cns_exam_test_${randomUUID().replaceAll("-", "")}`;
  let control: Client | undefined;
  let pool: Pool | undefined;
  let createdDatabase = false;
  const previousPool = globalThis.cnsSimulatorDatabasePool;

  beforeAll(async () => {
    process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY = testEncryptionKey;
    const url = new URL(testUrl!);
    if (!/^(postgres|postgresql):$/.test(url.protocol)
      || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      || url.pathname !== "/cns_scenario_exams_test"
      || url.search || url.hash) {
      throw new Error("Use an explicit loopback PostgreSQL URL for cns_scenario_exams_test, without URL options.");
    }
    control = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 });
    await control.connect();
    const identity = await control.query("select current_database() as name");
    expect(identity.rows[0]).toEqual({ name: "cns_scenario_exams_test" });
    // The client endpoint must be loopback; a CI Docker service legitimately
    // reports its private container address via inet_server_addr().
    await control.query(`create database "${databaseName}"`);
    createdDatabase = true;
    url.pathname = `/${databaseName}`;
    pool = new Pool({ connectionString: url.href, max: 5, connectionTimeoutMillis: 5000 });
    globalThis.cnsSimulatorDatabasePool = pool;

    // Exercise the shipped schema/constraints, not a hand-written imitation.
    const client = await pool.connect();
    try {
      await client.query("begin");
      const directory = resolve("database/migrations");
      for (const file of (await readdir(directory)).filter((name) => /^\d+_.*\.sql$/.test(name)).sort()) {
        await client.query(await readFile(resolve(directory, file), "utf8"));
        // ADS-B migration needs an admin owner even in an empty database.
        if (file === "0001_users_and_sessions.sql") {
          for (const profile of [admin, student]) {
            await client.query(
              `insert into public.users (id, username, email, password_hash, full_name, work_unit, role)
               values ($1, $2, $3, 'non-login-test-fixture', $4, $5, $6)`,
              [profile.id, `test-${profile.role}`, profile.email, profile.fullName, profile.workUnit, profile.role],
            );
          }
        }
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    for (const moduleId of ["dvor-1150a", "dme-1119a"]) {
      for (let position = 1; position <= 4; position++) {
        const scenarioId = `${moduleId}-fixture-${position}`;
        const definition = {
          ...(moduleId === "dvor-1150a" ? createDefaultDvor1150aScenarioDefinition() : createLowOutputDme1119aScenario()),
          id: scenarioId, name: scenarioId,
        };
        const source = await queryDatabase(
          `insert into public.simulator_scenario_parameters
           (module_id, scenario_id, name, description, difficulty, schema_version, definition_json, created_by)
           values ($1, $2, $2, '', 'basic', 1, $3, $4) returning id`,
          [moduleId, scenarioId, definition, admin.id],
        );
        await queryDatabase(
          `insert into public.simulator_scenario_library_memberships
           (module_id, scenario_parameters_id, library_kind, revision_number, scenario_id, name,
            description, difficulty, schema_version, definition_json, published_by, sort_order, archived_at)
           values ($1, $2, $3, 1, $4, $4, '', 'basic', 1, $5, $6, $7, $8)`,
          [moduleId, source.rows[0].id, position === 3 ? "practice" : "exam", scenarioId,
            definition, admin.id, position, position === 4 ? new Date() : null],
        );
      }
    }
  }, 30000);

  afterAll(async () => {
    globalThis.cnsSimulatorDatabasePool = previousPool;
    try {
      await pool?.end();
      if (createdDatabase) await control!.query(`drop database "${databaseName}"`);
    } finally {
      await control?.end();
      delete process.env.SCENARIO_EXAM_CODE_ENCRYPTION_KEY;
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    cookieJar.clear();
    vi.mocked(getCurrentProfile).mockResolvedValue(admin);
  });

  async function openExam() {
    const created = await createScenarioExamAction({ name: `SQL test ${randomUUID()}`, durationMinutes: 60 });
    expect(created.ok).toBe(true);
    const examId = created.data!.id;
    expect((await setScenarioExamStatusAction(examId, "open")).ok).toBe(true);
    return examId;
  }

  async function issueCode(examId: string, moduleIds: ScenarioParametersModuleId[] = ["dvor-1150a", "dme-1119a"]) {
    const issued = await issueScenarioExamCodeAction({
      examId, candidateName: "Test candidate", candidateUnit: "Isolated lab", moduleIds,
    });
    expect(issued.ok).toBe(true);
    return issued.data!;
  }

  async function enterExam() {
    const examId = await openExam();
    const code = await issueCode(examId);
    vi.mocked(getCurrentProfile).mockResolvedValue(student);
    const redeemed = await redeemScenarioExamCodeAction(examId, code.code);
    expect(redeemed.ok).toBe(true);
    const session = await getCandidateScenarioExamSession();
    expect(session?.subjects).toHaveLength(2);
    return { examId, code, session: session! };
  }

  async function startWithResult(subjectId: string) {
    const started = await startScenarioExamSubjectAction(subjectId);
    expect(started.ok).toBe(true);
    const item = (await getCandidateScenarioExamItem(started.data!.id))!;
    return { item, result: buildCandidateScenarioExamResult(item, { actionHistory: [], answer: { suspectedFault: "Fixture conclusion", reasoning: "Measured parameters", remediation: "Adjusted configuration" }, checkpoint: { parameter: 42 } }) };
  }

  it("opens and grades the correct code's saved snapshots without changing the candidate's evidence", async () => {
    const { examId, code, session } = await enterExam();
    const first = await startWithResult(session.subjects[0].id);
    const second = await startWithResult(session.subjects[1].id);
    await submitScenarioExamItemAction(first.item.id, first.result);
    await submitScenarioExamItemAction(second.item.id, second.result);
    await submitScenarioExamSessionAction();
    vi.mocked(getCurrentProfile).mockResolvedValue(admin);
    const review = await getScenarioExamSubmissionReview(examId, code.id);
    expect(review?.subjects.map((subject) => subject.result?.sessionItemId)).toEqual([first.item.id, second.item.id]);
    expect(review?.subjects[0].definition).toEqual(first.item.definition);
    expect((await saveScenarioExamReviewAction({ examId, codeId: code.id, itemId: first.item.id, score: 85.25, comment: "Chẩn đoán đúng" })).ok).toBe(true);
    expect((await saveScenarioExamReviewAction({ examId, codeId: code.id, itemId: second.item.id, score: 0, comment: "Chưa xử lý được" })).ok).toBe(true);
    const graded = await getScenarioExamSubmissionReview(examId, code.id);
    expect(graded?.subjects.map((subject) => subject.examinerScore)).toEqual([85.25, 0]);
    expect(graded?.subjects[0]).toMatchObject({ examinerComment: "Chẩn đoán đúng", reviewedByName: admin.fullName, result: first.result });
    expect(graded?.subjects[1].result).toEqual(second.result);
    expect(graded?.subjects.every((subject) => Boolean(subject.reviewedAt))).toBe(true);
    expect((await queryDatabase("select status, terminal_reason from public.scenario_exam_sessions where id = $1", [session.id])).rows[0]).toEqual({ status: "submitted", terminal_reason: "submitted" });
    expect((await queryDatabase("select event_type from public.scenario_exam_audit_events where session_id = $1 and event_type = 'review_updated'", [session.id])).rows).toHaveLength(2);
  });

  it("prevents grading another code/exam or grading before the subject is submitted", async () => {
    const { examId, code, session } = await enterExam();
    const { item, result } = await startWithResult(session.subjects[0].id);
    await saveScenarioExamItemAction(item.id, result);
    vi.mocked(getCurrentProfile).mockResolvedValue(admin);
    expect((await saveScenarioExamReviewAction({ examId, codeId: code.id, itemId: item.id, score: 80, comment: "Review" })).ok).toBe(false);
    const otherExam = await openExam();
    const otherCode = await issueCode(otherExam);
    expect(await getScenarioExamSubmissionReview(otherExam, code.id)).toBeNull();
    expect((await saveScenarioExamReviewAction({ examId: otherExam, codeId: code.id, itemId: item.id, score: 80, comment: "Review" })).ok).toBe(false);
    expect((await saveScenarioExamReviewAction({ examId, codeId: otherCode.id, itemId: item.id, score: 80, comment: "Review" })).ok).toBe(false);
    expect((await queryDatabase("select examiner_score from public.scenario_exam_session_items where id = $1", [item.id])).rows[0].examiner_score).toBeNull();
  });

  it("rolls score and reviewer metadata back if the review audit cannot be saved", async () => {
    const { examId, code, session } = await enterExam();
    const { item, result } = await startWithResult(session.subjects[0].id);
    await submitScenarioExamItemAction(item.id, result);
    vi.mocked(getCurrentProfile).mockResolvedValue(admin);
    await queryDatabase("alter table public.scenario_exam_audit_events add constraint test_reject_review check (event_type <> 'review_updated') not valid");
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await saveScenarioExamReviewAction({ examId, codeId: code.id, itemId: item.id, score: 90, comment: "Review" })).ok).toBe(false);
      const row = (await queryDatabase("select examiner_score, examiner_comment, reviewed_by, reviewed_at, result_json from public.scenario_exam_session_items where id = $1", [item.id])).rows[0];
      expect(row).toEqual({ examiner_score: null, examiner_comment: null, reviewed_by: null, reviewed_at: null, result_json: result });
    } finally {
      diagnostic.mockRestore();
      await queryDatabase("alter table public.scenario_exam_audit_events drop constraint test_reject_review");
    }
  });

  it("saves actual draft evidence without marking the subject complete or changing its scenario", async () => {
    const { session } = await enterExam();
    const { item, result } = await startWithResult(session.subjects[0].id);
    expect((await saveScenarioExamItemAction(item.id, result)).ok).toBe(true);
    const row = (await queryDatabase("select status, result_json, definition_snapshot_json, examiner_score from public.scenario_exam_session_items where id = $1", [item.id])).rows[0];
    expect(row.status).toBe("in_progress");
    expect(row.result_json).toEqual(result);
    expect(row.definition_snapshot_json.id).toBe(item.definition.id);
    expect(row.examiner_score).toBeNull();
    expect((await getCandidateScenarioExamSession())?.subjects[0].hasSavedResult).toBe(true);
  });

  it("submits one subject idempotently and prevents rewriting its evidence", async () => {
    const { session } = await enterExam();
    const { item, result } = await startWithResult(session.subjects[0].id);
    const first = await submitScenarioExamItemAction(item.id, result);
    const retry = await submitScenarioExamItemAction(item.id, { ...result, payload: { answer: "changed-after-submit" } });
    expect(first.ok).toBe(true);
    expect(retry).toEqual(first);
    expect((await saveScenarioExamItemAction(item.id, result)).ok).toBe(false);
    expect((await queryDatabase("select result_json, status from public.scenario_exam_session_items where id = $1", [item.id])).rows[0]).toEqual({ result_json: result, status: "submitted" });
    expect((await getCandidateScenarioExamSession())?.subjects[0].status).toBe("submitted");
    expect((await getCandidateScenarioExamSession())?.status).toBe("in_progress");
    expect((await queryDatabase("select event_type from public.scenario_exam_audit_events where session_id = $1 and event_type = 'item_submitted'", [session.id])).rows).toHaveLength(1);
  });

  it("submits both saved subjects and finishes the code/session once even for concurrent requests", async () => {
    const { session } = await enterExam();
    for (const subject of session.subjects) {
      const { item, result } = await startWithResult(subject.id);
      expect((await saveScenarioExamItemAction(item.id, result)).ok).toBe(true);
    }
    const [first, retry] = await Promise.all([submitScenarioExamSessionAction(), submitScenarioExamSessionAction()]);
    expect(first.ok).toBe(true);
    expect(retry).toEqual(first);
    const finished = await getCandidateScenarioExamSession();
    expect(finished?.status).toBe("submitted");
    expect(finished?.submittedAt).toBeTruthy();
    expect(finished?.subjects.map((subject) => subject.status)).toEqual(["submitted", "submitted"]);
    const code = (await queryDatabase("select status, terminal_at from public.scenario_exam_codes where id = (select code_id from public.scenario_exam_sessions where id = $1)", [session.id])).rows[0];
    expect(code.status).toBe("submitted");
    expect(code.terminal_at).toBeTruthy();
    expect((await queryDatabase("select event_type from public.scenario_exam_audit_events where session_id = $1 and event_type = 'item_submitted'", [session.id])).rows).toHaveLength(2);
    expect((await queryDatabase("select event_type from public.scenario_exam_audit_events where session_id = $1 and event_type = 'session_submitted'", [session.id])).rows).toHaveLength(1);
    expect((await startScenarioExamSubjectAction(session.subjects[0].id)).ok).toBe(false);
  });

  it("does not partially submit when one selected subject has no saved result", async () => {
    const { session } = await enterExam();
    const first = await startWithResult(session.subjects[0].id);
    await saveScenarioExamItemAction(first.item.id, first.result);
    await startWithResult(session.subjects[1].id);
    expect((await submitScenarioExamSessionAction()).ok).toBe(false);
    expect((await getCandidateScenarioExamSession())?.subjects.map((subject) => subject.status)).toEqual(["in_progress", "in_progress"]);
    expect((await queryDatabase("select event_type from public.scenario_exam_audit_events where session_id = $1 and event_type = 'item_submitted'", [session.id])).rows).toEqual([]);
  });

  it("rejects final submission before every selected subject is started", async () => {
    await enterExam();
    expect((await submitScenarioExamSessionAction()).ok).toBe(false);
  });

  it("rejects mismatched revision, secret-bearing payloads, and evidence from another code", async () => {
    const { session } = await enterExam();
    const { item, result } = await startWithResult(session.subjects[0].id);
    expect((await saveScenarioExamItemAction(item.id, { ...result, revision: result.revision + 1 })).ok).toBe(false);
    expect((await saveScenarioExamItemAction(item.id, { ...result, payload: { password: "non-production-fixture" } })).ok).toBe(false);
    vi.mocked(getCurrentProfile).mockResolvedValue(admin);
    await enterExam();
    expect((await saveScenarioExamItemAction(item.id, result)).ok).toBe(false);
    expect((await queryDatabase("select result_json from public.scenario_exam_session_items where id = $1", [item.id])).rows[0].result_json).toBeNull();
  });

  it("rejects saving or finishing after the original deadline", async () => {
    const { session } = await enterExam();
    const { item, result } = await startWithResult(session.subjects[0].id);
    await queryDatabase("update public.scenario_exam_sessions set started_at = now() - interval '2 hours', deadline_at = now() - interval '1 hour' where id = $1", [session.id]);
    expect((await saveScenarioExamItemAction(item.id, result)).ok).toBe(false);
    expect((await submitScenarioExamItemAction(item.id, result)).ok).toBe(false);
    expect((await submitScenarioExamSessionAction()).ok).toBe(false);
  });

  it("rolls all subject/session/code transitions back if the final audit fails", async () => {
    const { session } = await enterExam();
    for (const subject of session.subjects) {
      const { item, result } = await startWithResult(subject.id);
      await saveScenarioExamItemAction(item.id, result);
    }
    await queryDatabase("alter table public.scenario_exam_audit_events add constraint test_reject_session_submitted check (event_type <> 'session_submitted') not valid");
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await submitScenarioExamSessionAction()).ok).toBe(false);
      expect((await getCandidateScenarioExamSession())?.status).toBe("in_progress");
      expect((await getCandidateScenarioExamSession())?.subjects.map((subject) => subject.status)).toEqual(["in_progress", "in_progress"]);
      expect((await queryDatabase("select event_type from public.scenario_exam_audit_events where session_id = $1 and event_type in ('item_submitted', 'session_submitted')", [session.id])).rows).toEqual([]);
    } finally {
      diagnostic.mockRestore();
      await queryDatabase("alter table public.scenario_exam_audit_events drop constraint test_reject_session_submitted");
    }
  });

  it("creates the scheduled exam and audit, then loads an empty detail page", async () => {
    const input = {
      name: "Test case 01", description: "SQL regression fixture", durationMinutes: 60,
      opensAt: "2026-11-20T00:00:00.000Z", closesAt: "2026-11-22T10:00:00.000Z",
    };
    const created = await createScenarioExamAction(input);
    expect(created.ok).toBe(true);
    const detail = await getScenarioExamDetail(created.data!.id);
    expect(detail).toMatchObject({ name: input.name, status: "draft", codes: [], codeCount: 0 });
    expect(new Date(detail!.opensAt!).toISOString()).toBe(input.opensAt);
    const audit = await queryDatabase("select event_json from public.scenario_exam_audit_events where exam_id = $1", [created.data!.id]);
    expect(audit.rows).toEqual([{ event_json: { name: input.name } }]);
  });

  it("shows upcoming exams without allowing redemption before the opening window", async () => {
    const now = Date.now();
    async function createWindowedExam(name: string, opensAt: string, closesAt: string) {
      const created = await createScenarioExamAction({ name, durationMinutes: 60, opensAt, closesAt });
      expect(created.ok).toBe(true);
      expect((await setScenarioExamStatusAction(created.data!.id, "open")).ok).toBe(true);
      return created.data!.id;
    }

    const futureExamId = await createWindowedExam(
      `Future ${randomUUID()}`,
      new Date(now + 60 * 60_000).toISOString(),
      new Date(now + 2 * 60 * 60_000).toISOString(),
    );
    const activeExamId = await createWindowedExam(
      `Active ${randomUUID()}`,
      new Date(now - 60 * 60_000).toISOString(),
      new Date(now + 2 * 60 * 60_000).toISOString(),
    );
    const expiredExamId = await createWindowedExam(
      `Expired ${randomUUID()}`,
      new Date(now - 2 * 60 * 60_000).toISOString(),
      new Date(now - 60 * 60_000).toISOString(),
    );
    const futureCode = await issueCode(futureExamId, ["dvor-1150a"]);
    const activeCode = await issueCode(activeExamId, ["dvor-1150a"]);
    const expiredCode = await issueCode(expiredExamId, ["dvor-1150a"]);
    const unscheduledExamId = await openExam();

    vi.mocked(getCurrentProfile).mockResolvedValue(student);
    const listed = await listCandidateOpenScenarioExams();
    const testedExamIds = [activeExamId, unscheduledExamId, futureExamId, expiredExamId];
    expect(Object.fromEntries(listed.filter((exam) => testedExamIds.includes(exam.id)).map((exam) => [exam.id, exam.availability]))).toEqual({
      [activeExamId]: "available",
      [unscheduledExamId]: "available",
      [futureExamId]: "upcoming",
    });
    expect(listed.some((exam) => exam.id === expiredExamId)).toBe(false);

    const futureRedeem = await redeemScenarioExamCodeAction(futureExamId, futureCode.code);
    expect(futureRedeem).toMatchObject({ ok: false, message: "Kỳ thi không mở hoặc đã hết thời gian." });
    const activeRedeem = await redeemScenarioExamCodeAction(activeExamId, activeCode.code);
    expect(activeRedeem.ok).toBe(true);
    const expiredRedeem = await redeemScenarioExamCodeAction(expiredExamId, expiredCode.code);
    expect(expiredRedeem).toMatchObject({ ok: false, message: "Kỳ thi không mở hoặc đã hết thời gian." });
  });

  it("counts partial module progress without marking the whole code complete", async () => {
    const examId = await openExam();
    const first = await issueCode(examId);
    await issueCode(examId, ["dme-1119a"]);
    await queryDatabase("update public.scenario_exam_code_subjects set status = 'submitted', submitted_at = now() where code_id = $1 and module_id = 'dvor-1150a'", [first.id]);
    const detail = await getScenarioExamDetail(examId);
    expect(detail).toMatchObject({ codeCount: 2, terminalCodeCount: 0 });
    expect(detail!.codes.find((code) => code.id === first.id)).toMatchObject({ completedModules: 1, status: "issued" });
    expect((await listScenarioExams()).find((exam) => exam.id === examId)?.codeCount).toBe(2);
    expect((await listScenarioExamPoolCounts()).find((item) => item.moduleId === "dvor-1150a")?.count).toBe(2);
  });

  it("runs create/open/issue/redeem/start with two modules and reuses the snapshot on concurrent starts", async () => {
    const { examId, code, session } = await enterExam();
    expect((await listCandidateOpenScenarioExams()).some((exam) => exam.id === examId)).toBe(true);
    expect(session.subjects.map((subject) => subject.moduleId)).toEqual(["dvor-1150a", "dme-1119a"]);
    const [first, retry] = await Promise.all([
      startScenarioExamSubjectAction(session.subjects[0].id),
      startScenarioExamSubjectAction(session.subjects[0].id),
    ]);
    expect(first.ok).toBe(true);
    expect(retry.ok).toBe(true);
    expect(retry.data).toEqual(first.data);
    expect((await startScenarioExamSubjectAction(session.subjects[1].id)).ok).toBe(true);
    const items = await queryDatabase(
      "select id, module_id, scenario_id, definition_snapshot_json from public.scenario_exam_session_items where session_id = $1 order by module_id",
      [session.id],
    );
    expect(items.rows).toHaveLength(2);
    for (const item of items.rows) {
      expect([`${item.module_id}-fixture-1`, `${item.module_id}-fixture-2`]).toContain(item.scenario_id);
      expect(item.definition_snapshot_json.id).toBe(item.scenario_id);
    }
    const audits = await queryDatabase("select event_json from public.scenario_exam_audit_events where session_id = $1 and event_type = 'scenario_assigned'", [session.id]);
    expect(audits.rows).toHaveLength(2);
    expect(audits.rows.map((row) => row.event_json.moduleId).sort()).toEqual(["dme-1119a", "dvor-1150a"]);
    const storedCode = await queryDatabase("select code_hash from public.scenario_exam_codes where id = $1", [code.id]);
    expect(storedCode.rows[0].code_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedCode.rows[0].code_hash).not.toBe(code.code);
    const encryptedCode = await queryDatabase("select code_ciphertext from public.scenario_exam_codes where id = $1", [code.id]);
    expect(encryptedCode.rows[0].code_ciphertext).toMatch(/^v1:/);
    expect(decryptScenarioExamCode(encryptedCode.rows[0].code_ciphertext, examId, storedCode.rows[0].code_hash)).toBe(code.code);
    expect((await getCandidateScenarioExamSession())?.subjects.every((subject) => subject.sessionItemId)).toBe(true);
  });

  it("allows only one redemption when the same code is submitted concurrently", async () => {
    const examId = await openExam();
    const code = await issueCode(examId);
    vi.mocked(getCurrentProfile).mockResolvedValue(student);
    const results = await Promise.all([
      redeemScenarioExamCodeAction(examId, code.code),
      redeemScenarioExamCodeAction(examId, code.code),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const sessions = await queryDatabase("select id from public.scenario_exam_sessions where code_id = $1", [code.id]);
    expect(sessions.rows).toHaveLength(1);
  });

  it("isolates two codes even when the same student account redeems both", async () => {
    const first = await enterExam();
    vi.mocked(getCurrentProfile).mockResolvedValue(admin);
    const second = await enterExam();
    expect(second.session.id).not.toBe(first.session.id);
    expect((await startScenarioExamSubjectAction(first.session.subjects[0].id)).ok).toBe(false);
    expect((await startScenarioExamSubjectAction(second.session.subjects[0].id)).ok).toBe(true);
    expect((await queryDatabase("select id from public.scenario_exam_session_items where session_id = $1", [first.session.id])).rows).toEqual([]);
  });

  it("preserves the assigned snapshot after the source changes and membership is archived", async () => {
    const { session } = await enterExam();
    const started = await startScenarioExamSubjectAction(session.subjects[0].id);
    expect(started.ok).toBe(true);
    const original = await queryDatabase("select library_membership_id, definition_snapshot_json from public.scenario_exam_session_items where id = $1", [started.data!.id]);
    const membershipId = original.rows[0].library_membership_id;
    const membership = await queryDatabase("select scenario_parameters_id, definition_json from public.simulator_scenario_library_memberships where id = $1", [membershipId]);
    const sourceId = membership.rows[0].scenario_parameters_id;
    try {
      await queryDatabase("update public.simulator_scenario_parameters set definition_json = $2 where id = $1", [sourceId, { changedAfterStart: true }]);
      await queryDatabase("update public.simulator_scenario_library_memberships set archived_at = now() where id = $1", [membershipId]);
      const resumed = await startScenarioExamSubjectAction(session.subjects[0].id);
      expect(resumed.data).toEqual(started.data);
      const saved = await queryDatabase("select definition_snapshot_json from public.scenario_exam_session_items where id = $1", [started.data!.id]);
      expect(saved.rows[0].definition_snapshot_json).toEqual(original.rows[0].definition_snapshot_json);
      const runtime = await getCandidateScenarioExamItem(started.data!.id);
      expect(runtime?.definition).toEqual(parseScenarioParameters(session.subjects[0].moduleId, original.rows[0].definition_snapshot_json));
      expect(runtime?.deadlineAt).toBe(session.deadlineAt);
    } finally {
      await queryDatabase("update public.simulator_scenario_parameters set definition_json = $2 where id = $1", [sourceId, membership.rows[0].definition_json]);
      await queryDatabase("update public.simulator_scenario_library_memberships set archived_at = null where id = $1", [membershipId]);
    }
  });

  it("rolls the exam insert back if its audit insert fails", async () => {
    const name = `Rejected audit ${randomUUID()}`;
    await queryDatabase(`alter table public.scenario_exam_audit_events add constraint test_reject_exam_created check (event_type <> 'exam_created') not valid`);
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await createScenarioExamAction({ name, durationMinutes: 60 });
      expect(result.ok).toBe(false);
      expect(result.message).not.toMatch(/constraint|test_reject|23514|insert into/i);
      expect((await queryDatabase("select id from public.scenario_exams where name = $1", [name])).rows).toEqual([]);
      expect(diagnostic).toHaveBeenCalled();
    } finally {
      diagnostic.mockRestore();
      await queryDatabase("alter table public.scenario_exam_audit_events drop constraint test_reject_exam_created");
    }
  });

  it("does not issue a code when any selected module lacks an active exam scenario", async () => {
    const examId = await openExam();
    const result = await issueScenarioExamCodeAction({ examId, candidateName: "Test candidate", candidateUnit: "Test lab", moduleIds: ["dvor-1150a", "ads-b"] });
    expect(result.ok).toBe(false);
    expect((await getScenarioExamDetail(examId))?.codes).toEqual([]);
  });

  it("rejects an expired session even if the module already has a snapshot", async () => {
    const { session } = await enterExam();
    const started = await startScenarioExamSubjectAction(session.subjects[0].id);
    expect(started.ok).toBe(true);
    await queryDatabase("update public.scenario_exam_sessions set started_at = now() - interval '2 hours', deadline_at = now() - interval '1 hour' where id = $1", [session.id]);
    expect((await startScenarioExamSubjectAction(session.subjects[0].id)).ok).toBe(false);
    expect((await startScenarioExamSubjectAction(session.subjects[1].id)).ok).toBe(false);
    expect(await getCandidateScenarioExamItem(started.data!.id)).toBeNull();
    expect((await queryDatabase("select id from public.scenario_exam_session_items where session_id = $1", [session.id])).rows).toHaveLength(1);
  });

  it("isolates runtime snapshots between two codes even when the student account is the same", async () => {
    const first = await enterExam();
    const started = await startScenarioExamSubjectAction(first.session.subjects[0].id);
    expect(started.ok).toBe(true);
    expect((await getCandidateScenarioExamItem(started.data!.id))?.sessionId).toBe(first.session.id);
    const firstToken = cookieJar.get("cns_scenario_exam_session")!;
    vi.mocked(getCurrentProfile).mockResolvedValue(admin);
    await enterExam();
    expect(await getCandidateScenarioExamItem(started.data!.id)).toBeNull();
    cookieJar.set("cns_scenario_exam_session", firstToken);
    expect((await getCandidateScenarioExamItem(started.data!.id))?.id).toBe(started.data!.id);
  });

  it("prevents opening submitted subjects, revoked codes, and terminal sessions", async () => {
    const { session } = await enterExam();
    const started = await startScenarioExamSubjectAction(session.subjects[0].id);
    const itemId = started.data!.id;
    await queryDatabase("update public.scenario_exam_code_subjects set status = 'submitted', submitted_at = now() where id = $1", [session.subjects[0].id]);
    expect(await getCandidateScenarioExamItem(itemId)).toBeNull();
    await queryDatabase("update public.scenario_exam_code_subjects set status = 'in_progress', submitted_at = null where id = $1", [session.subjects[0].id]);
    await queryDatabase("update public.scenario_exam_codes set status = 'revoked' where id = (select code_id from public.scenario_exam_sessions where id = $1)", [session.id]);
    expect(await getCandidateScenarioExamItem(itemId)).toBeNull();
    await queryDatabase("update public.scenario_exam_codes set status = 'in_progress' where id = (select code_id from public.scenario_exam_sessions where id = $1)", [session.id]);
    await queryDatabase("update public.scenario_exam_sessions set status = 'submitted', submitted_at = now(), terminal_reason = 'submitted' where id = $1", [session.id]);
    expect(await getCandidateScenarioExamItem(itemId)).toBeNull();
  });
});
