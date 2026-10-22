// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { nativeBlueprintFixture } from "../helpers/native-blueprint";

const identity = vi.hoisted(() => ({ id: "11111111-1111-4111-8111-111111111111", role: "admin", mustChangePassword: false }));
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: vi.fn(async () => identity) }));
const actor = identity.id;
const testUrl = process.env.SCENARIO_EXAM_TEST_DATABASE_URL;
describe.skipIf(!testUrl)("library delta publication with real PostgreSQL", () => {
  const dbName = `cns_library_test_${randomUUID().replaceAll("-", "")}`;
  let control: Client; let pool: Pool; let created = false;
  let route: typeof import("@/app/api/scenario-libraries/route");
  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (!/^(postgres|postgresql):$/.test(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/cns_scenario_exams_test" || url.search || url.hash) throw new Error("Explicit isolated loopback endpoint required");
    control = new Client({ connectionString: url.href }); await control.connect();
    expect((await control.query("select current_database() name")).rows[0].name).toBe("cns_scenario_exams_test");
    await control.query(`create database "${dbName}"`); created = true; url.pathname = `/${dbName}`;
    pool = new Pool({ connectionString: url.href, max: 4 });
    for (const file of (await readdir(resolve("database/migrations"))).filter(f => /^\d+_.*\.sql$/.test(f)).sort()) {
      await pool.query(await readFile(resolve("database/migrations", file), "utf8"));
      if (file.startsWith("0001_")) await pool.query("insert into public.users(id,username,email,password_hash,full_name,work_unit,role,must_change_password) values($1,'admin','admin@attech.com.vn','non-login-fixture','Test','Lab','admin',false)", [actor]);
    }
    globalThis.cnsSimulatorDatabasePool = pool;
    process.env.E2E_TEST_MODE = "0";
    route = await import("@/app/api/scenario-libraries/route");
  }, 30000);
  beforeEach(() => { identity.role = "admin"; });
  afterAll(async () => {
    globalThis.cnsSimulatorDatabasePool = undefined;
    await pool?.end();
    if (created) await control.query(`drop database "${dbName}"`);
    await control?.end();
  });
  async function source() {
    const blueprint = nativeBlueprintFixture("dme-320");
    const definition = { ...blueprint.definition, id: `delta-${randomUUID()}` };
    return (await pool.query(`insert into public.simulator_scenario_parameters(module_id,scenario_id,name,description,difficulty,schema_version,definition_json,assessment_rubric_json,created_by) values('dme-320',$1,$2,$3,$4,1,$5,$6,$7) returning *`, [definition.id, definition.name, definition.description, definition.difficulty, definition, blueprint.rubric, actor])).rows[0];
  }
  async function revision(kind: string) {
    return (await pool.query("select revision from public.simulator_scenario_library_revisions where module_id='dme-320' and library_kind=$1", [kind])).rows[0].revision as number;
  }
  async function delta(ids: string[], selected: boolean, kind = "practice", expectedRevision?: number) {
    const patch = Reflect.get(route, "PATCH");
    expect(typeof patch, "inline autosave must use the delta PATCH route").toBe("function");
    return patch(new Request("http://localhost/api/scenario-libraries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleId: "dme-320", libraryKind: kind, scenarioIds: ids, selected, expectedRevision: expectedRevision ?? await revision(kind) }) })) as Promise<Response>;
  }
  async function membership(id: string, kind = "practice") {
    return (await pool.query("select * from public.simulator_scenario_library_memberships where scenario_parameters_id=$1 and library_kind=$2 and archived_at is null", [id, kind])).rows[0];
  }
  async function assignment(id: string) {
    return (await pool.query("select * from public.simulator_review_scenario_assignments where scenario_parameters_id=$1", [id])).rows[0];
  }

  it("publish A → edit A → check B preserves A membership/rubric/assignment snapshots", async () => {
    const a = await source(), b = await source();
    expect((await delta([a.id], true)).status).toBe(200);
    const before = await membership(a.id), assigned = await assignment(a.id);
    expect(before.assessment_rubric_json).not.toBeNull();
    await pool.query("update public.simulator_scenario_parameters set definition_json=jsonb_set(definition_json,'{name}','\"Edited but unpublished\"'::jsonb),name='Edited but unpublished' where id=$1", [a.id]);
    expect((await delta([b.id], true)).status).toBe(200);
    expect(await membership(a.id)).toEqual(before);
    expect(await assignment(a.id)).toEqual(assigned);
    expect(await membership(b.id)).toBeDefined();
    expect((await delta([b.id], false)).status).toBe(200);
    expect(await membership(a.id)).toEqual(before);
    expect(await assignment(a.id)).toEqual(assigned);
  });

  it("publish A → archive A → toggle B succeeds and retains historical published A", async () => {
    const a = await source(), b = await source();
    expect((await delta([a.id], true)).status).toBe(200);
    const old = await membership(a.id), assigned = await assignment(a.id);
    await pool.query("update public.simulator_scenario_parameters set archived_at=now() where id=$1", [a.id]);
    expect((await delta([b.id], true)).status).toBe(200);
    expect(await membership(a.id)).toEqual(old);
    expect(await assignment(a.id)).toEqual(assigned);
    expect((await delta([b.id], false)).status).toBe(200);
    expect(await membership(b.id)).toBeUndefined();
    expect((await delta([a.id], false)).status).toBe(200);
    expect(await membership(a.id)).toBeUndefined();
  });

  it("select-all is idempotent for retained snapshots and only one competing revision can win", async () => {
    const a = await source(), b = await source();
    expect((await delta([a.id], true, "exam")).status).toBe(200);
    const old = await membership(a.id, "exam");
    await pool.query("update public.simulator_scenario_parameters set definition_json=jsonb_set(definition_json,'{name}','\"Do not republish\"'::jsonb) where id=$1", [a.id]);
    expect((await delta([a.id, b.id], true, "exam")).status).toBe(200);
    expect(await membership(a.id, "exam")).toEqual(old);
    const rev = await revision("exam");
    const [r1, r2] = await Promise.all([delta([a.id], false, "exam", rev), delta([b.id], false, "exam", rev)]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
  });

  it("denies nonauthor and foreign-module sources without changing revision", async () => {
    const a = await source(), rev = await revision("exam");
    identity.role = "student";
    expect((await delta([a.id], true, "exam", rev)).status).toBe(403);
    identity.role = "admin";
    const foreign = nativeBlueprintFixture("dvor-220").definition;
    const f = (await pool.query("insert into public.simulator_scenario_parameters(module_id,scenario_id,name,description,difficulty,schema_version,definition_json,created_by) values('dvor-220',$1,$2,$3,$4,1,$5,$6) returning id", [foreign.id, foreign.name, foreign.description, foreign.difficulty, foreign, actor])).rows[0];
    expect((await delta([f.id], true, "exam", rev)).status).toBe(400);
    expect(await revision("exam")).toBe(rev);
    expect(await membership(a.id, "exam")).toBeUndefined();
  });

  it("rejects a mixed valid/missing delta atomically and validates malformed requests", async () => {
    const a = await source(), rev = await revision("exam");
    expect((await delta([a.id, randomUUID()], true, "exam", rev)).status).toBe(400);
    expect(await membership(a.id, "exam")).toBeUndefined();
    expect(await revision("exam")).toBe(rev);
    const patch = Reflect.get(route, "PATCH");
    for (const body of [null, {}, { moduleId: "dme-320", libraryKind: "exam", scenarioIds: [a.id, a.id], selected: true, expectedRevision: rev },
      { moduleId: "dme-320", libraryKind: "exam", scenarioIds: ["not-a-uuid"], selected: true, expectedRevision: rev }]) {
      expect((await patch(new Request("http://localhost/api/scenario-libraries", { method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }))).status).toBe(400);
    }
  });

  it("checks teacher ownership and supports an explicit manage grant", async () => {
    const a = await source();
    const teacher = randomUUID();
    await pool.query("insert into public.users(id,username,email,password_hash,full_name,work_unit,role,must_change_password) values($1,$2,$3,'non-login-fixture','Teacher','Lab','teacher',false)", [teacher, `teacher-${teacher}`, `${teacher}@attech.com.vn`]);
    const previous = identity.id;
    process.env.CNS_TEACHER_SCENARIO_AUTHORING = "1";
    identity.id = teacher; identity.role = "teacher";
    try {
      expect((await delta([a.id], true, "exam")).status).toBe(403);
      await pool.query("insert into public.simulator_scenario_parameter_permissions(scenario_parameters_id,module_id,grantee_user_id,permission,granted_by) values($1,'dme-320',$2,'manage',$3)", [a.id, teacher, actor]);
      expect((await delta([a.id], true, "exam")).status).toBe(200);
      const published = await membership(a.id, "exam");
      expect(published.published_by).toBe(teacher);
      expect((await delta([a.id], false, "exam")).status).toBe(200);
    } finally { identity.id = previous; identity.role = "admin"; delete process.env.CNS_TEACHER_SCENARIO_AUTHORING; }
  });
});
