// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createGenerationJob, claimGenerationJob, completeGenerationJob } from "@/lib/ai/scenario-generation/jobs";
import { DELETE, GET, POST } from "@/app/api/scenarios/route";
import { PUT as publish } from "@/app/api/scenario-libraries/route";
import { GET as readSource } from "@/app/api/scenario-parameters/route";
import { hashSessionToken, sessionCookieName } from "@/lib/auth/session";
import { DEFAULT_SCENARIOS } from "@/stores/default-scenarios";
import { parseScenarioParameters } from "@/lib/scenario-parameters";
import { mapRowToScenario } from "@/lib/supabase/scenarios";
const cookieJar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (key: string) => cookieJar.has(key) ? { value: cookieJar.get(key) } : undefined }) }));
const adminId = "11111111-1111-4111-8111-111111111111";
const studentId = "22222222-2222-4222-8222-222222222222";
const teacherId = "33333333-3333-4333-8333-333333333333";
const testUrl = process.env.SCENARIO_EXAM_TEST_DATABASE_URL;

describe.skipIf(!testUrl)("ADS-B source review and publication in isolated PostgreSQL", () => {
  const databaseName = `cns_adsb_review_${randomUUID().replaceAll("-", "")}`;
  const previousPool = globalThis.cnsSimulatorDatabasePool;
  const previousTeacherGate = process.env.CNS_TEACHER_SCENARIO_AUTHORING;
  let control: Client | undefined;
  let pool: Pool;
  let created = false;
  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (!/^(postgres|postgresql):$/.test(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/cns_scenario_exams_test" || url.search || url.hash) throw new Error("Use explicit loopback cns_scenario_exams_test endpoint without URL options.");
    control = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 });
    await control.connect();
    expect((await control.query("select current_database() name")).rows[0].name).toBe("cns_scenario_exams_test");
    await control.query(`create database "${databaseName}"`); created = true;
    url.pathname = `/${databaseName}`;
    pool = new Pool({ connectionString: url.href, max: 6, connectionTimeoutMillis: 5000 });
    globalThis.cnsSimulatorDatabasePool = pool;
    for (const file of (await readdir(resolve("database/migrations"))).filter(name => /^\d+_.*\.sql$/.test(name)).sort()) {
      await pool.query(await readFile(resolve("database/migrations", file), "utf8"));
      if (file === "0001_users_and_sessions.sql") {
        for (const [id, role] of [[adminId, "admin"], [studentId, "student"], [teacherId, "student"]]) {
          await pool.query("insert into public.users (id,username,email,password_hash,full_name,work_unit,role,must_change_password) values ($1,$2,$3,'non-login-fixture','Test','Lab',$4,false)", [id, `review-${id}`, `${id}@attech.com.vn`, role]);
        }
      }
    }
    await pool.query("update public.users set role='teacher' where id=$1", [teacherId]);
    await pool.query("insert into public.exam_modules (code,name) values ('ads-b','ADS-B')");
  }, 30000);
  afterAll(async () => {
    globalThis.cnsSimulatorDatabasePool = previousPool;
    if (previousTeacherGate === undefined) delete process.env.CNS_TEACHER_SCENARIO_AUTHORING; else process.env.CNS_TEACHER_SCENARIO_AUTHORING = previousTeacherGate;
    await pool?.end();
    if (created) await control?.query(`drop database "${databaseName}"`);
    await control?.end();
  });
  beforeEach(async () => {
    cookieJar.clear(); delete process.env.CNS_TEACHER_SCENARIO_AUTHORING;
    for (const table of ["ai_scenario_generation_jobs", "simulator_review_scenario_assignments", "simulator_scenario_library_memberships", "simulator_scenario_parameters", "scenarios"]) await pool.query(`delete from public.${table}`);
    await pool.query("update public.simulator_scenario_library_revisions set revision=0 where module_id='ads-b'");
    await pool.query("update public.users set role='admin',is_active=true where id=$1", [adminId]);
  });
  async function login(id: string) {
    const token = randomUUID();
    await pool.query("insert into public.user_sessions(user_id,token_hash,expires_at) values($1,$2,now()+interval '1 hour')", [id, hashSessionToken(token)]);
    cookieJar.set(sessionCookieName(), token);
  }
  async function draft() {
    const job = await createGenerationJob(pool, { moduleId: "ads-b", name: "Unpublished draft answer", description: "Examiner review only", difficulty: "basic" }, { actorId: adminId, idempotencyKey: randomUUID() });
    const claim = (await claimGenerationJob(pool, "review-test"))!;
    return completeGenerationJob(pool, job.id, claim.attemptToken!, { definition: parseScenarioParameters("ads-b", DEFAULT_SCENARIOS[0])!, provenance: { model: "offline-native-fixture" } });
  }
  const save = (body: unknown) => POST(new Request("http://localhost/api/scenarios", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  const publishTo = (id: string, libraryKind: "practice" | "exam", expectedRevision = 0) => publish(new Request("http://localhost/api/scenario-libraries", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ moduleId: "ads-b", libraryKind, scenarioIds: [id], expectedRevision }) }));

  it("hides raw and exam-only AI drafts from real student sessions and serves only the practice snapshot", async () => {
    const done = await draft();
    await login(studentId);
    expect((await GET()).status).toBe(200);
    expect(await (await GET()).json()).toEqual([]);
    await login(adminId);
    expect((await publishTo(done.scenarioRowId!, "exam")).status).toBe(200);
    await login(studentId);
    expect(await (await GET()).json()).toEqual([]);
    await login(adminId);
    expect((await publishTo(done.scenarioRowId!, "practice")).status).toBe(200);
    await pool.query("update public.scenarios set title='Unreviewed legacy change', expected_actions_json='[]' where id=$1", [done.scenarioId]);
    await pool.query("update public.simulator_scenario_parameters set name='Unreviewed source change', definition_json=jsonb_set(definition_json,'{name}','\"Unreviewed source change\"') where id=$1", [done.scenarioRowId]);
    await login(studentId);
    const response = await GET();
    const list = await response.json();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: done.scenarioId, title: "Unpublished draft answer", expectedActions: DEFAULT_SCENARIOS[0].expectedActions });
    expect(list[0]).not.toHaveProperty("revision");
    expect(response.headers.get("x-cns-scenario-access")).toBe("practice");
  });

  it("atomically saves examiner edits to both stores, reloads review, and preserves old snapshots through republication", async () => {
    const done = await draft(); await login(adminId);
    expect((await publishTo(done.scenarioRowId!, "practice")).status).toBe(200);
    expect((await publishTo(done.scenarioRowId!, "exam")).status).toBe(200);
    const snapshots = (await pool.query("select id,definition_json from public.simulator_scenario_library_memberships order by id")).rows;
    const source = (await (await GET()).json())[0];
    const changed = { ...source, title: "Examiner corrected source", expectedActions: DEFAULT_SCENARIOS[0].expectedActions.slice(0, 1), expectedRevision: 1, createdBy: studentId };
    const saved = await save(changed);
    expect(saved.status).toBe(200);
    expect((await saved.json()).scenario).toMatchObject({ title: changed.title, expectedActions: changed.expectedActions, revision: 2 });
    const canonical = (await pool.query("select * from public.simulator_scenario_parameters where id=$1", [done.scenarioRowId])).rows[0];
    const legacy = mapRowToScenario((await pool.query("select * from public.scenarios where id=$1", [done.scenarioId])).rows[0]);
    expect(canonical).toMatchObject({ name: changed.title, revision: 2, created_by: adminId });
    expect(canonical.definition_json).toMatchObject({ name: changed.title, expectedActions: changed.expectedActions });
    expect(legacy).toMatchObject({ title: changed.title, expectedActions: changed.expectedActions });
    expect((await (await GET()).json())[0]).toMatchObject({ title: changed.title, revision: 2 });
    const reloaded = await readSource(new Request(`http://localhost/api/scenario-parameters?id=${done.scenarioRowId}`));
    expect((await reloaded.json())[0].definition).toMatchObject({ name: changed.title, expectedActions: changed.expectedActions });
    expect((await pool.query("select id,definition_json from public.simulator_scenario_library_memberships order by id")).rows).toEqual(snapshots);
    await login(studentId);
    expect((await (await GET()).json())[0].title).toBe("Unpublished draft answer");
    await login(adminId);
    expect((await publishTo(done.scenarioRowId!, "practice", 1)).status).toBe(200);
    for (const snapshot of snapshots) expect((await pool.query("select definition_json from public.simulator_scenario_library_memberships where id=$1", [snapshot.id])).rows[0].definition_json).toEqual(snapshot.definition_json);
    await login(studentId);
    expect((await (await GET()).json())[0]).toMatchObject({ title: changed.title, expectedActions: changed.expectedActions });
  });

  it("rejects stale or omitted revisions, forbidden writers, archived sources and invalid payloads without partial writes", async () => {
    const done = await draft(); await login(adminId);
    const source = (await (await GET()).json())[0];
    expect((await save({ ...source, title: "First edit", expectedRevision: 1 })).status).toBe(200);
    const beforeCanonical = (await pool.query("select * from public.simulator_scenario_parameters where id=$1", [done.scenarioRowId])).rows;
    const beforeLegacy = (await pool.query("select * from public.scenarios where id=$1", [done.scenarioId])).rows;
    expect((await save({ ...source, title: "Stale edit", expectedRevision: 1 })).status).toBe(409);
    expect((await save({ ...source, title: "Missing revision" })).status).toBe(400);
    await login(studentId); expect((await save({ ...source, expectedRevision: 2 })).status).toBe(403);
    await login(teacherId); expect((await save({ ...source, expectedRevision: 2 })).status).toBe(403);
    await login(adminId); expect((await save({ ...source, sites: [{ nope: true }], expectedRevision: 2 })).status).toBe(400);
    expect((await pool.query("select * from public.simulator_scenario_parameters where id=$1", [done.scenarioRowId])).rows).toEqual(beforeCanonical);
    expect((await pool.query("select * from public.scenarios where id=$1", [done.scenarioId])).rows).toEqual(beforeLegacy);
    await pool.query("update public.simulator_scenario_parameters set archived_at=now() where id=$1", [done.scenarioRowId]);
    expect((await save({ ...source, expectedRevision: 2 })).status).toBe(409);
    expect((await pool.query("select * from public.scenarios where id=$1", [done.scenarioId])).rows).toEqual(beforeLegacy);
    expect(await (await GET()).json()).toEqual([]);
  });

  it("keeps teacher source reads gated and limited to owner/grant without enabling writes", async () => {
    const done = await draft(); await login(teacherId);
    expect((await GET()).status).toBe(403);
    process.env.CNS_TEACHER_SCENARIO_AUTHORING = "1";
    expect(await (await GET()).json()).toEqual([]);
    await pool.query("insert into public.simulator_scenario_parameter_permissions(scenario_parameters_id,module_id,grantee_user_id,granted_by) values($1,'ads-b',$2,$3)", [done.scenarioRowId, teacherId, adminId]);
    expect((await (await GET()).json())[0]).toMatchObject({ id: done.scenarioId, revision: 1 });
    await pool.query("delete from public.simulator_scenario_parameter_permissions where scenario_parameters_id=$1", [done.scenarioRowId]);
    await pool.query("update public.simulator_scenario_parameters set created_by=$1 where id=$2", [teacherId, done.scenarioRowId]);
    expect((await (await GET()).json())[0]).toMatchObject({ id: done.scenarioId, revision: 1 });
    expect((await save({ ...DEFAULT_SCENARIOS[0], id: done.scenarioId, expectedRevision: 1 })).status).toBe(403);
  });

  it("continues validated legacy-only edits without manufacturing canonical rows", async () => {
    await login(adminId);
    const legacy = { ...DEFAULT_SCENARIOS[0], id: "legacy-only-edit" };
    expect((await save(legacy)).status).toBe(200);
    expect((await save({ ...legacy, title: "Legacy corrected" })).status).toBe(200);
    expect((await (await GET()).json())[0]).toMatchObject({ title: "Legacy corrected" });
    expect((await pool.query("select * from public.simulator_scenario_parameters")).rows).toEqual([]);
  });

  it("rolls canonical edits back if the legacy projection write fails and hides database error details", async () => {
    const done = await draft(); await login(adminId);
    const source = (await (await GET()).json())[0];
    const before = (await pool.query("select * from public.simulator_scenario_parameters where id=$1", [done.scenarioRowId])).rows;
    await pool.query("alter table public.scenarios add constraint review_test_secret check (title <> 'Reject projection') not valid");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await save({ ...source, title: "Reject projection", expectedRevision: 1 });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Không thể lưu kịch bản." });
      expect((await pool.query("select * from public.simulator_scenario_parameters where id=$1", [done.scenarioRowId])).rows).toEqual(before);
      expect((await pool.query("select title from public.scenarios where id=$1", [done.scenarioId])).rows[0].title).toBe(source.title);
    } finally { log.mockRestore(); await pool.query("alter table public.scenarios drop constraint review_test_secret"); }
  });

  it("serializes concurrent revision edits so exactly one wins without partial writes", async () => {
    const done = await draft(); await login(adminId);
    const source = (await (await GET()).json())[0];
    const responses = await Promise.all([save({ ...source, title: "Concurrent A", expectedRevision: 1 }), save({ ...source, title: "Concurrent B", expectedRevision: 1 })]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    const canonical = (await pool.query("select * from public.simulator_scenario_parameters where id=$1", [done.scenarioRowId])).rows[0];
    const legacy = (await pool.query("select * from public.scenarios where id=$1", [done.scenarioId])).rows[0];
    expect(canonical.revision).toBe(2);
    expect(canonical.name).toBe(legacy.title);
    expect(canonical.definition_json.name).toBe(legacy.title);
  });

  it("rechecks the current administrator inside the write transaction after session authentication", async () => {
    const done = await draft(); await login(adminId);
    const source = (await (await GET()).json())[0];
    const blocker = await pool.connect();
    await blocker.query("begin");
    await blocker.query("select id from public.users where id=$1 for update", [adminId]);
    let pending: Promise<Response> | undefined;
    try {
      pending = save({ ...source, title: "Must not save", expectedRevision: 1 });
      await vi.waitFor(async () => {
        const waiting = await pool.query("select count(*)::int as total from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like 'select id from public.users%' and pid <> pg_backend_pid()");
        expect(waiting.rows[0].total).toBe(1);
      });
      await blocker.query("update public.users set role='student' where id=$1", [adminId]);
      await blocker.query("commit");
      expect((await pending).status).toBe(403);
      expect((await pool.query("select revision from public.simulator_scenario_parameters where id=$1", [done.scenarioRowId])).rows[0].revision).toBe(1);
      expect((await pool.query("select title from public.scenarios where id=$1", [done.scenarioId])).rows[0].title).toBe(source.title);
    } finally { await blocker.query("rollback"); blocker.release(); await pending; }
  });

  it("archives an AI-backed source on legacy deletion without deleting job references or published snapshots", async () => {
    const done = await draft(); await login(adminId);
    expect((await publishTo(done.scenarioRowId!, "practice")).status).toBe(200);
    const snapshots = (await pool.query("select id,definition_json from public.simulator_scenario_library_memberships")).rows;
    const response = await DELETE(new Request(`http://localhost/api/scenarios?id=${done.scenarioId}`, {method: "DELETE"}));
    expect(response.status).toBe(200);
    const canonical = (await pool.query("select archived_at,revision from public.simulator_scenario_parameters where id=$1", [done.scenarioRowId])).rows[0];
    expect(canonical.archived_at).not.toBeNull();
    expect(canonical.revision).toBe(2);
    expect(await (await GET()).json()).toEqual([]);
    expect((await pool.query("select scenario_row_id from public.ai_scenario_generation_jobs where id=$1", [done.id])).rows[0].scenario_row_id).toBe(done.scenarioRowId);
    expect((await pool.query("select id,definition_json from public.simulator_scenario_library_memberships")).rows).toEqual(snapshots);
    await login(studentId);
    expect((await (await GET()).json())[0].title).toBe("Unpublished draft answer");
  });

  it("does not expose query details when a source read fails", async () => {
    await draft(); await login(adminId);
    await pool.query("alter table public.scenarios rename to review_test_private_table");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await GET();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Không thể tải kịch bản." });
    } finally { log.mockRestore(); await pool.query("alter table public.review_test_private_table rename to scenarios"); }
  });
});
