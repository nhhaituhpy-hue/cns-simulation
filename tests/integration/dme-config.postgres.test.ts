// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultDme1119aConfig, parseDme1119aConfig } from "@/lib/simulator-config/dme-1119a";
import { getDefaultDme1119aConfig as legacyDefault, parseDme1119aConfig as legacyParse } from "../fixtures/dme-config-fa138e9/parser";

const auth = vi.hoisted(() => ({ profile: vi.fn() }));
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: auth.profile }));
const owner = "11111111-1111-4111-8111-111111111111";
const foreign = "22222222-2222-4222-8222-222222222222";
const header = "X-CNS-Simulator-Config-DTO";
const version = "dme-1119a-extensions-v1";
const testUrl = process.env.SCENARIO_EXAM_TEST_DATABASE_URL;
const context = () => ({ params: Promise.resolve({ simulatorId: "dme-1119a" }) });
const groups = ["rmsVoltageData", "rmsCurrentData", "rmsTemperatureData", "rmsAdData"] as const;
function request(method = "GET", payload?: unknown, dto: string | null = version) {
  return new Request("http://localhost/api/simulator-config/dme-1119a", {
    method, headers: { "Content-Type": "application/json", ...(dto === null ? {} : { [header]: dto }) },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
}
function nondefault(seed: number) {
  const config = getDefaultDme1119aConfig();
  config.monitorOffsets!.monitor1[0].integral = seed;
  config.monitorOffsets!.monitor2[0].standby = -seed;
  for (const group of groups) config[group]!.forEach((row, index) => { row.enabled = index % 2 === seed % 2; });
  return config;
}

// Same isolated-database harness as simulator-config.postgres.test.ts. Only auth
// is doubled: route, transaction helper, migrations, row locks and JSONB are real.
describe.skipIf(!testUrl)("DME configuration routes with isolated PostgreSQL", () => {
  const dbName = `cns_dme_config_test_${randomUUID().replaceAll("-", "")}`;
  const previousPool = globalThis.cnsSimulatorDatabasePool;
  let control: Client;
  let pool: Pool;
  let created = false;
  let route: typeof import("@/app/api/simulator-config/[simulatorId]/route");

  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (!/^(postgres|postgresql):$/.test(url.protocol)
      || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      || url.pathname !== "/cns_scenario_exams_test" || url.search || url.hash) {
      throw new Error("Explicit isolated loopback endpoint required");
    }
    control = new Client({ connectionString: url.href });
    await control.connect();
    expect((await control.query("select current_database() name")).rows[0].name).toBe("cns_scenario_exams_test");
    await control.query(`create database "${dbName}"`);
    created = true;
    url.pathname = `/${dbName}`;
    pool = new Pool({ connectionString: url.href, max: 5 });
    for (const file of (await readdir(resolve("database/migrations"))).filter(f => /^\d+_.*\.sql$/.test(f)).sort()) {
      await pool.query(await readFile(resolve("database/migrations", file), "utf8"));
      if (file.startsWith("0001_")) {
        await pool.query("insert into public.users(id,username,email,password_hash,full_name,work_unit,role,must_change_password) values($1,'admin','admin@attech.com.vn','non-login-fixture','Test Admin','Lab','admin',false)", [owner]);
      }
    }
    await pool.query("insert into public.users(id,username,email,password_hash,full_name,work_unit,role,must_change_password) values($1,'foreign','foreign@attech.com.vn','non-login-fixture','Foreign User','Lab','student',false)", [foreign]);
    globalThis.cnsSimulatorDatabasePool = pool;
    route = await import("@/app/api/simulator-config/[simulatorId]/route");
  }, 30000);

  beforeEach(async () => {
    auth.profile.mockResolvedValue({ id: owner, role: "admin", mustChangePassword: false });
    await pool.query("truncate public.user_simulator_config_history, public.user_simulator_configs");
  });
  afterAll(async () => {
    globalThis.cnsSimulatorDatabasePool = previousPool;
    await pool?.end();
    if (created) await control.query(`drop database "${dbName}"`);
    await control?.end();
  });
  async function initialize(dto: string | null = version) {
    const response = await route.POST(request("POST", undefined, dto), context());
    const body = await response.json();
    expect(response.status, JSON.stringify(body)).toBe(201);
    expect(body).toMatchObject({ schemaVersion: 1, revision: 1, persisted: true });
    expect(body.appliedConfig).toEqual(dto === null ? legacyDefault() : getDefaultDme1119aConfig());
    return body;
  }
  async function read(dto: string | null = version) {
    const response = await route.GET(request("GET", undefined, dto), context());
    expect(response.status).toBe(200);
    expect(response.headers.get("Vary")).toContain(header);
    return response.json();
  }
  async function put(config: unknown, expectedRevision: number, extra: Record<string, unknown> = {}, dto: string | null = version) {
    const response = await route.PUT(request("PUT", { config, expectedRevision, ...extra }, dto), context());
    const body = await response.json();
    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(response.headers.get("Vary")).toContain(header);
    return body;
  }
  async function stored() {
    return (await pool.query("select * from public.user_simulator_configs where user_id=$1 and simulator_id='dme-1119a'", [owner])).rows[0];
  }
  async function historyCount() {
    return Number((await pool.query("select count(*) n from public.user_simulator_config_history")).rows[0].n);
  }

  it.each([null, version])("GET/POST negotiates %s defaults; POST repetition is idempotent", async dto => {
    const empty = await read(dto);
    expect(empty).toMatchObject({ persisted: false, revision: 0, history: [] });
    expect(empty.appliedConfig).toEqual(dto === null ? legacyDefault() : getDefaultDme1119aConfig());
    expect(await historyCount()).toBe(0);
    await initialize(dto);
    await initialize(dto);
    expect((await stored()).applied_config).toEqual(getDefaultDme1119aConfig());
    expect(await historyCount()).toBe(1);
  });

  it("opt-in PUT/GET persists exact JSONB extensions and history while legacy GET stays frozen-parser compatible", async () => {
    await initialize();
    const config = nondefault(3);
    const fields = ["monitorOffsets.monitor1.0.integral", "rmsVoltageData.1.enabled"];
    const saved = await put(config, 1, { changedFields: fields });
    expect(saved.appliedConfig).toEqual(config);
    expect(saved.revision).toBe(2);
    const body = await read();
    expect(body.appliedConfig).toEqual(config);
    expect(body.initialConfig).toEqual(getDefaultDme1119aConfig());
    expect(body.backupConfig).toEqual(getDefaultDme1119aConfig());
    expect(body.history).toHaveLength(2);
    expect(body.history).toContainEqual(expect.objectContaining({ action: "apply", changedFields: fields, revision: 2 }));
    const history = (await pool.query("select changed_fields, next_config, jsonb_typeof(changed_fields) kind from public.user_simulator_config_history where revision=2")).rows[0];
    expect(history).toEqual({ changed_fields: fields, next_config: config, kind: "array" });
    const old = await read(null);
    for (const key of ["initialConfig", "appliedConfig", "backupConfig"]) {
      expect(legacyParse(old[key])).toEqual(old[key]);
      expect(Object.keys(old[key]).sort()).toEqual(Object.keys(legacyDefault()).sort());
      expect(parseDme1119aConfig(old[key])).not.toBeNull();
    }
    expect((await stored()).applied_config).toEqual(config);
  });

  it.each(["apply", "restore", "backup", "flash-save"])("legacy %s preserves applied/backup extensions independently and records one revision", async action => {
    await initialize();
    const applied = nondefault(3), backup = nondefault(6);
    await put(applied, 1, { backupConfig: backup });
    const incoming = legacyDefault(), incomingBackup = legacyDefault();
    incoming.txConfigNominal.rtcParameters.powerOutput = -1;
    incomingBackup.txConfigNominal.rtcParameters.powerOutput = -2;
    const response = await put(incoming, 2, { action, backupConfig: incomingBackup, changedFields: ["txConfigNominal.rtcParameters.powerOutput"] }, null);
    expect(legacyParse(response.appliedConfig)).toEqual(incoming);
    expect(legacyParse(response.backupConfig)).toEqual(incomingBackup);
    applied.txConfigNominal.rtcParameters.powerOutput = -1;
    backup.txConfigNominal.rtcParameters.powerOutput = -2;
    const body = await read();
    expect(body.appliedConfig).toEqual(applied);
    expect(body.backupConfig).toEqual(backup);
    expect(body.initialConfig).toEqual(getDefaultDme1119aConfig());
    expect(body.revision).toBe(3);
    expect(body.history).toHaveLength(3);
    expect(body.history).toContainEqual(expect.objectContaining({ action, revision: 3 }));
    expect(await stored()).toMatchObject({ applied_config: applied, backup_config: backup });
  });

  it("explicit defaults and false reset applied extensions without resetting omitted backup", async () => {
    await initialize();
    const config = nondefault(8);
    for (const group of groups) config[group]!.forEach(row => { row.enabled = true; });
    await put(config, 1, { backupConfig: config });
    await put(getDefaultDme1119aConfig(), 2);
    expect(await read()).toMatchObject({ appliedConfig: getDefaultDme1119aConfig(), backupConfig: config, revision: 3 });
    expect(await stored()).toMatchObject({ applied_config: getDefaultDme1119aConfig(), backup_config: config });
  });

  it("partially extended payload resets its explicit group and preserves each omitted group", async () => {
    await initialize();
    const config = nondefault(3);
    await put(config, 1);
    const incoming = { ...legacyDefault(), rmsAdData: getDefaultDme1119aConfig().rmsAdData };
    await put(incoming, 2);
    expect((await read()).appliedConfig).toEqual({ ...config, rmsAdData: incoming.rmsAdData });
  });

  it("two concurrent legacy PUTs actually wait on the row lock and yield one 200 and one 409", async () => {
    await initialize();
    const canonical = nondefault(3);
    await put(canonical, 1);
    const candidates = [-1, -2].map(power => {
      const config = legacyDefault();
      config.txConfigNominal.rtcParameters.powerOutput = power;
      return config;
    });
    const blocker = await pool.connect();
    await blocker.query("begin");
    await blocker.query("select * from public.user_simulator_configs where user_id=$1 and simulator_id='dme-1119a' for update", [owner]);
    const pending = Promise.all(candidates.map(config => route.PUT(request("PUT", { config, expectedRevision: 2 }, null), context())));
    let waiting = 0;
    try {
      for (let attempt = 0; attempt < 100; attempt++) {
        waiting = Number((await pool.query("select count(*) n from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query ilike '%for update%'")).rows[0].n);
        if (waiting === 2) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } finally {
      await blocker.query("commit");
      blocker.release();
    }
    const responses = await pending;
    expect(waiting, "both transactions reached the owner-scoped row lock").toBe(2);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    const winner = await responses.find(response => response.status === 200)!.json();
    expect(legacyParse(winner.appliedConfig)).not.toBeNull();
    canonical.txConfigNominal.rtcParameters.powerOutput = winner.appliedConfig.txConfigNominal.rtcParameters.powerOutput;
    expect(await read()).toMatchObject({ appliedConfig: canonical, revision: 3 });
    expect(await historyCount()).toBe(3);
  });

  it("wrong owner and stale revision cannot overwrite canonical profile or history", async () => {
    await initialize();
    await put(nondefault(3), 1);
    const before = await stored();
    expect((await route.PUT(request("PUT", { config: legacyDefault(), expectedRevision: 1 }), context())).status).toBe(409);
    auth.profile.mockResolvedValue({ id: foreign, role: "student", mustChangePassword: false });
    const payload = { config: nondefault(6), expectedRevision: 1, userId: owner, user_id: owner, operatorUserId: owner };
    expect((await route.PUT(request("PUT", payload), context())).status).toBe(409);
    expect(await read()).toMatchObject({ persisted: false, revision: 0, history: [] });
    await initialize();
    expect((await route.PUT(request("PUT", payload), context())).status).toBe(200);
    expect((await read()).appliedConfig).toEqual(payload.config);
    expect(await stored()).toEqual(before);
    auth.profile.mockResolvedValue({ id: owner, role: "admin" });
    const body = await read();
    expect(body.revision).toBe(2);
    expect(body.history).toHaveLength(2);
  });

  it.each(["GET", "POST", "PUT"] as const)("unauthenticated %s returns 401 without persistence", async method => {
    auth.profile.mockResolvedValue(null);
    expect((await route[method](request(method, method === "PUT" ? { config: legacyDefault(), expectedRevision: 1 } : undefined), context())).status).toBe(401);
    expect(await stored()).toBeUndefined();
    expect(await historyCount()).toBe(0);
  });

  it.each(["GET", "POST", "PUT"] as const)("unknown DTO on %s returns 400 without persistence", async method => {
    const response = await route[method](request(method, method === "PUT" ? { config: legacyDefault(), expectedRevision: 1 } : undefined, "dme-1119a-extensions-v999"), context());
    expect(response.status).toBe(400);
    expect(response.headers.get("Vary")).toContain(header);
    expect(await stored()).toBeUndefined();
    expect(await historyCount()).toBe(0);
  });

  it.each(["null", "extra", "type", "bounds", "N/A", "identity", "backup", "revision"])("invalid %s PUT leaves canonical JSONB and history untouched", async kind => {
    await initialize();
    const before = await stored();
    const config = getDefaultDme1119aConfig();
    const payload: Record<string, unknown> = { config, expectedRevision: 1 };
    if (kind === "null") Object.assign(config, { monitorOffsets: null });
    if (kind === "extra") Object.assign(config.rmsVoltageData![0], { volts: 1 });
    if (kind === "type") Object.assign(config.rmsCurrentData![0], { enabled: "false" });
    if (kind === "bounds") config.monitorOffsets!.monitor1[0].integral = 101;
    if (kind === "N/A") config.monitorOffsets!.monitor2[2].integral = 0;
    if (kind === "identity") config.monitorOffsets!.monitor1[0].parameter = "Other";
    if (kind === "backup") payload.backupConfig = { ...config, rmsAdData: null };
    if (kind === "revision") payload.expectedRevision = 1.5;
    expect((await route.PUT(request("PUT", payload), context())).status).toBe(400);
    expect(await stored()).toEqual(before);
    expect(await historyCount()).toBe(1);
  });
});
