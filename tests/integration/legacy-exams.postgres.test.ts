import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentProfile, type AuthProfile } from "@/lib/auth/profile";
import { queryDatabase, withDatabaseTransaction } from "@/lib/db";
import { withExamActorTransaction } from "@/lib/exams/actor-transaction";
import {
  completeExamAttemptAction, completeExamAttemptItemAction, saveCandidateResultAction,
  saveExamCandidateAction, saveExamExaminersAction, saveExamSetAction, startExamAttemptAction,
} from "@/lib/exams/actions";

vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const admin: AuthProfile = {
  id: "11111111-1111-4111-8111-111111111111", role: "admin",
  email: "legacy-test-admin@attech.com.vn", fullName: "Test examiner",
  workUnit: "Isolated legacy exam lab", mustChangePassword: false,
};
const student: AuthProfile = {
  ...admin, id: "22222222-2222-4222-8222-222222222222", role: "student",
  email: "legacy-test-student@attech.com.vn",
};

// Disposable CI/test service only: never DATABASE_URL or .env.local.
const testUrl = process.env.SCENARIO_EXAM_TEST_DATABASE_URL;
describe.skipIf(!testUrl)("Legacy exam actions against real PostgreSQL", () => {
  const databaseName = `cns_legacy_test_${randomUUID().replaceAll("-", "")}`;
  let control: Client | undefined;
  let pool: Pool | undefined;
  let createdDatabase = false;
  const previousPool = globalThis.cnsSimulatorDatabasePool;

  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (!/^(postgres|postgresql):$/.test(url.protocol)
      || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      || url.pathname !== "/cns_scenario_exams_test" || url.search || url.hash) {
      throw new Error("Use an explicit loopback PostgreSQL URL for cns_scenario_exams_test, without URL options.");
    }
    control = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 });
    await control.connect();
    expect((await control.query("select current_database() as name")).rows[0].name)
      .toBe("cns_scenario_exams_test");
    await control.query(`create database "${databaseName}"`);
    createdDatabase = true;
    url.pathname = `/${databaseName}`;
    // One connection ensures context-leak checks reuse the same backend.
    pool = new Pool({ connectionString: url.href, max: 1, connectionTimeoutMillis: 5000 });
    globalThis.cnsSimulatorDatabasePool = pool;
    const directory = resolve("database/migrations");
    for (const file of (await readdir(directory)).filter((name) => /^\d+_.*\.sql$/.test(name)).sort()) {
      await pool.query(await readFile(resolve(directory, file), "utf8"));
      if (file.startsWith("0001_")) {
        for (const profile of [admin, student]) {
          await pool.query(
            `insert into public.users
             (id, username, email, password_hash, full_name, work_unit, role, must_change_password)
             values ($1, $2, $3, 'non-login-test-fixture', $4, $5, $6, false)`,
            [profile.id, `legacy-${profile.role}`, profile.email, profile.fullName, profile.workUnit, profile.role],
          );
        }
      }
    }
  }, 30000);

  afterAll(async () => {
    globalThis.cnsSimulatorDatabasePool = previousPool;
    try {
      await pool?.end();
      if (createdDatabase) await control!.query(`drop database "${databaseName}"`);
    } finally { await control?.end(); }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentProfile).mockResolvedValue(admin);
  });

  async function createExamFixture() {
    const subjectId = randomUUID();
    const paperId = randomUUID();
    const scenarioId = `legacy-scenario-${randomUUID()}`;
    await queryDatabase("insert into public.exam_modules (code, name) values ('vor', 'VOR') on conflict do nothing");
    await queryDatabase("insert into public.exam_subjects (id, code, name) values ($1, $2, 'Legacy test subject')",
      [subjectId, `LEGACY_${subjectId.replaceAll("-", "").slice(0, 20).toUpperCase()}`]);
    await queryDatabase("insert into public.exam_subject_modules (subject_id, module_code, module_name) values ($1, 'vor', 'VOR')", [subjectId]);
    await queryDatabase(
      `insert into public.vor_scenarios (id, title, description, difficulty, prompt)
       values ($1, 'Legacy test scenario', 'Isolated test only', 'easy', 'Test prompt')`, [scenarioId]);
    const subjects = [{ subjectId, papers: [{ id: paperId, paperNumber: 1, title: "Test paper", scenarios: [
      { moduleCode: "vor" as const, scenarioId, position: 1 },
    ] }] }];
    const setResult = await queryDatabase<{ id: string }>(
      "select public.save_exam_set($1, null, 'Legacy test set', '', $2, true) as id", [admin.id, JSON.stringify(subjects)]);
    const exam = await queryDatabase<{ id: string }>(
      `insert into public.exams (name, exam_date, location, decision_basis, exam_set_id, status, created_by)
       values ('Legacy test exam', current_date, 'ha_noi', 'Isolated test only', $1, 'open', $2) returning id`,
      [setResult.rows[0].id, admin.id]);
    return { examId: exam.rows[0].id, subjectId, paperId, scenarioId, subjects };
  }

  it("lets a verified admin save an empty examiner list through the shipped SQL guards", async () => {
    const { examId } = await createExamFixture();
    expect(await saveExamExaminersAction(examId, [])).toMatchObject({ ok: true });
    expect((await queryDatabase("select 1 from public.exam_examiners where exam_id = $1", [examId])).rows).toHaveLength(0);
  });

  it("saves candidate assignments as JSON under the verified admin actor", async () => {
    const { examId, subjectId, paperId } = await createExamFixture();
    const saved = await saveExamCandidateAction({
      examId, fullName: "Test candidate", workUnit: "Isolated lab", email: student.email,
      subjects: [{ subjectId, examPaperId: paperId }],
    });
    expect(saved).toMatchObject({ ok: true, data: { id: expect.any(String) } });
    const assignment = await queryDatabase(
      "select subject_id, exam_paper_id from public.exam_candidate_subjects where candidate_id = $1",
      [saved.data!.id],
    );
    expect(assignment.rows).toEqual([{ subject_id: subjectId, exam_paper_id: paperId }]);
  });

  it("lets students submit in order and admins grade without rewriting submitted evidence", async () => {
    const { examId, subjectId, paperId } = await createExamFixture();
    const saved = await saveExamCandidateAction({
      examId, fullName: "Test candidate", workUnit: "Isolated lab", email: student.email,
      subjects: [{ subjectId, examPaperId: paperId }],
    });
    expect(saved.ok).toBe(true);
    const assignment = (await queryDatabase<{ id: string }>(
      "select id from public.exam_candidate_subjects where candidate_id = $1", [saved.data!.id],
    )).rows[0].id;
    vi.mocked(getCurrentProfile).mockResolvedValue(student);
    const started = await startExamAttemptAction(assignment);
    expect(started.ok).toBe(true);
    const attempt = started.data!.attempt;
    const item = attempt.items[0];
    const repeatedStart = await startExamAttemptAction(assignment);
    expect(repeatedStart.data!.attempt.id).toBe(attempt.id);
    await queryDatabase("update public.exams set status = 'locked' where id = $1", [examId]);
    const result = { moduleCode: "vor", events: [], answer: {},
      startedAt: new Date().toISOString(), submittedAt: new Date().toISOString() };
    expect((await completeExamAttemptItemAction(item.id, { result })).ok).toBe(true);
    expect((await completeExamAttemptAction(attempt.id)).ok).toBe(true);
    const before = (await queryDatabase(
      "select result_json, submitted_at from public.exam_attempt_items where id = $1", [item.id],
    )).rows[0];
    await expect(queryDatabase("update public.exam_attempt_items set result_json = '{}' where id = $1", [item.id]))
      .rejects.toMatchObject({ code: "42501" });
    await expect(withExamActorTransaction((client) => client.query(
      "select public.save_candidate_result($1, 100, 'Not an examiner')", [assignment],
    ))).rejects.toMatchObject({ code: "42501" });
    const ignoredRetry = { ...result, answer: { reasoning: "Must not replace original evidence" } };
    expect((await completeExamAttemptItemAction(item.id, { result: ignoredRetry })).ok).toBe(true);
    await queryDatabase("update public.exams set status = 'archived' where id = $1", [examId]);
    vi.mocked(getCurrentProfile).mockResolvedValue(admin);
    expect(await saveCandidateResultAction({ candidateSubjectId: assignment, officialScore: 0, examinerComment: "Test review" }))
      .toMatchObject({ ok: true });
    expect((await queryDatabase(
      "select status, official_score, examiner_comment from public.exam_candidate_subjects where id = $1", [assignment],
    )).rows[0]).toMatchObject({ status: "reviewed", official_score: "0.00", examiner_comment: "Test review" });
    expect((await queryDatabase(
      "select result_json, submitted_at from public.exam_attempt_items where id = $1", [item.id],
    )).rows[0]).toEqual(before);
    await expect(withExamActorTransaction((client) => client.query(
      "update public.exam_candidate_subjects set subject_id = $2 where id = $1", [assignment, randomUUID()],
    ))).rejects.toMatchObject({ code: "23503" });
  });

  it("saves a nonempty exam set through the real node-pg JSON boundary", async () => {
    const { subjects } = await createExamFixture();
    const input = [{ ...subjects[0], papers: [{ ...subjects[0].papers[0], id: randomUUID() }] }];
    const saved = await saveExamSetAction({ name: "New JSON test set", subjects: input });
    expect(saved).toMatchObject({ ok: true, data: { id: expect.any(String) } });
    expect((await queryDatabase("select status from public.exam_sets where id = $1", [saved.data!.id])).rows[0])
      .toEqual({ status: "ready" });
  });

  it("saves a nonempty examiner list as jsonb and keeps the prior list on validation failure", async () => {
    const { examId, subjectId } = await createExamFixture();
    const examiners = [{ fullName: "Test examiner", subjectId, position: 1 }];
    expect((await saveExamExaminersAction(examId, examiners)).ok).toBe(true);
    const before = (await queryDatabase("select * from public.exam_examiners where exam_id = $1", [examId])).rows;
    expect(before).toHaveLength(1);
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect((await saveExamExaminersAction(examId, [{ ...examiners[0], subjectId: randomUUID() }])).ok).toBe(false);
    } finally { errors.mockRestore(); }
    expect((await queryDatabase("select * from public.exam_examiners where exam_id = $1", [examId])).rows).toEqual(before);
  });

  it("denies SQL admin writes without a verified actor and with a student actor", async () => {
    const { examId } = await createExamFixture();
    const calls: [string, unknown[]][] = [
      ["select public.save_exam_examiners($1, $2)", [examId, "[]"]],
      ["select public.save_exam_candidate($1, $2, $3, $4, $5, $6)",
        [null, examId, "Test candidate", "Test lab", student.email, "[]"]],
      ["select public.save_candidate_result($1, $2, $3)", [randomUUID(), 0, "Test review"]],
    ];
    for (const [sql, values] of calls) {
      await expect(queryDatabase(sql, values)).rejects.toMatchObject({ code: "42501" });
    }
    vi.mocked(getCurrentProfile).mockResolvedValue(student);
    for (const [sql, values] of calls) {
      await expect(withExamActorTransaction((client) => client.query(sql, values)))
        .rejects.toMatchObject({ code: "42501" });
    }
    expect((await queryDatabase("select public.current_app_role() as role")).rows[0]).toEqual({ role: null });
  });

  it("rechecks role and active/password state from PostgreSQL rather than trusting a cached admin role", async () => {
    const { examId } = await createExamFixture();
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      for (const changes of [
        { role: "student", active: true, changePassword: false },
        { role: "teacher", active: true, changePassword: false },
        { role: "admin", active: false, changePassword: false },
        { role: "admin", active: true, changePassword: true },
      ]) {
        await queryDatabase("update public.users set role = $2, is_active = $3, must_change_password = $4 where id = $1",
          [admin.id, changes.role, changes.active, changes.changePassword]);
        expect((await saveExamExaminersAction(examId, [])).ok).toBe(false);
      }
    } finally {
      errors.mockRestore();
      await queryDatabase("update public.users set role = 'admin', is_active = true, must_change_password = false where id = $1", [admin.id]);
    }
  });

  it("fails closed for malformed and nonexistent transaction actor IDs", async () => {
    for (const actor of ["not-a-uuid", "", randomUUID()]) {
      const result = await withDatabaseTransaction(async (client) => {
        await client.query("select set_config('app.actor_user_id', $1, true)", [actor]);
        return client.query("select public.current_app_role() as role");
      });
      expect(result.rows[0]).toEqual({ role: null });
    }
  });

  it("clears the actor on commit and rollback before reusing the same pooled connection", async () => {
    const before = (await queryDatabase("select pg_backend_pid() as pid")).rows[0].pid;
    expect(await withExamActorTransaction(async (client) => (await client.query("select public.current_app_role() as role")).rows[0].role))
      .toBe("admin");
    expect((await queryDatabase("select public.current_app_role() as role, pg_backend_pid() as pid")).rows[0])
      .toEqual({ role: null, pid: before });
    await expect(withExamActorTransaction(async (client) => {
      expect((await client.query("select public.current_app_role() as role")).rows[0].role).toBe("admin");
      throw new Error("intentional rollback");
    })).rejects.toThrow("intentional rollback");
    expect((await queryDatabase("select public.current_app_role() as role, pg_backend_pid() as pid")).rows[0])
      .toEqual({ role: null, pid: before });
  });

  it("rejects unauthenticated actor transactions before acquiring a database connection", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(null);
    const work = vi.fn();
    await expect(withExamActorTransaction(work)).rejects.toThrow("Bạn chưa đăng nhập.");
    expect(work).not.toHaveBeenCalled();
    expect((await queryDatabase("select public.current_app_role() as role")).rows[0]).toEqual({ role: null });
  });

  it("rejects teacher and student action callers before changing the examiner list", async () => {
    const { examId, subjectId } = await createExamFixture();
    const original = [{ fullName: "Original examiner", subjectId, position: 1 }];
    expect((await saveExamExaminersAction(examId, original)).ok).toBe(true);
    const before = (await queryDatabase("select * from public.exam_examiners where exam_id = $1", [examId])).rows;
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      for (const role of ["teacher", "student"] as const) {
        vi.mocked(getCurrentProfile).mockResolvedValue({ ...student, role });
        expect((await saveExamExaminersAction(examId, [])).ok).toBe(false);
      }
    } finally { errors.mockRestore(); }
    expect((await queryDatabase("select * from public.exam_examiners where exam_id = $1", [examId])).rows).toEqual(before);
  });

  it("keeps concurrent actor transactions isolated on separate PostgreSQL connections", async () => {
    const url = new URL(testUrl!);
    url.pathname = `/${databaseName}`;
    const left = new Client({ connectionString: url.href });
    const right = new Client({ connectionString: url.href });
    try {
      await Promise.all([left.connect(), right.connect()]);
      await Promise.all([left.query("begin"), right.query("begin")]);
      await Promise.all([
        left.query("select set_config('app.actor_user_id', $1, true)", [admin.id]),
        right.query("select set_config('app.actor_user_id', $1, true)", [student.id]),
      ]);
      const [adminRole, studentRole] = await Promise.all([
        left.query("select public.current_app_role() as role"),
        right.query("select public.current_app_role() as role"),
      ]);
      expect(adminRole.rows[0]).toEqual({ role: "admin" });
      expect(studentRole.rows[0]).toEqual({ role: "student" });
      await Promise.all([left.query("commit"), right.query("rollback")]);
      for (const connection of [left, right]) {
        expect((await connection.query("select public.current_app_role() as role")).rows[0]).toEqual({ role: null });
      }
    } finally { await Promise.all([left.end(), right.end()]); }
  });
});
