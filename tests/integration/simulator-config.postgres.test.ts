// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultDvor1150aConfig } from "@/lib/simulator-config/dvor-1150a";
import {
  getDefaultDvor1150aConfig as legacyDefault,
  parseDvor1150aConfig as legacyParse,
} from "../fixtures/simulator-config-28527a/dvor-1150a";

const auth = vi.hoisted(() => ({ profile: vi.fn() }));
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: auth.profile }));

const owner = "11111111-1111-4111-8111-111111111111";
const foreign = "22222222-2222-4222-8222-222222222222";
const header = "X-CNS-Simulator-Config-DTO";
const version = "dvor-1150a-extensions-v1";
const testUrl = process.env.SCENARIO_EXAM_TEST_DATABASE_URL;
const context = () => ({ params: Promise.resolve({ simulatorId: "dvor-1150a" }) });
function request(method = "GET", payload?: unknown, extended = true) {
  return new Request("http://localhost/api/simulator-config/dvor-1150a", {
    method,
    headers: { ...(extended ? { [header]: version } : {}), "Content-Type": "application/json" },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
}

describe.skipIf(!testUrl)("simulator config actual routes with isolated PostgreSQL", () => {
  const dbName = `cns_simulator_config_test_${randomUUID().replaceAll("-", "")}`;
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

  async function initialize() {
    const response = await route.POST(request("POST"), context());
    const body = await response.json();
    expect(response.status, JSON.stringify(body)).toBe(201);
    expect(body).toMatchObject({ revision: 1, persisted: true });
    expect(body.appliedConfig).toEqual(getDefaultDvor1150aConfig());
    return body;
  }

  it("POST initializes then opt-in PUT persists changedFields as JSONB and GET returns exact config/history", async () => {
    const initial = await initialize();
    const config = structuredClone(initial.appliedConfig);
    config.monitor.timers.shutdown = 9;
    const response = await route.PUT(request("PUT", {
      config, expectedRevision: initial.revision, changedFields: ["monitor.timers.shutdown"],
    }), context());
    const saved = await response.json();
    expect(response.status, JSON.stringify(saved)).toBe(200);
    const read = await route.GET(request(), context());
    const body = await read.json();
    expect(read.status).toBe(200);
    expect(body.appliedConfig).toEqual(config);
    expect(body.initialConfig).toEqual(initial.initialConfig);
    expect(body.backupConfig).toEqual(initial.backupConfig);
    expect(body.revision).toBe(2);
    expect(body.history).toHaveLength(2);
    expect(body.history).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "initialize", changedFields: [], revision: 1 }),
      expect.objectContaining({ action: "apply", changedFields: ["monitor.timers.shutdown"], revision: 2 }),
    ]));
    const stored = (await pool.query("select changed_fields, next_config from public.user_simulator_config_history where revision=2")).rows[0];
    expect(stored.changed_fields).toEqual(["monitor.timers.shutdown"]);
    expect(stored.next_config).toEqual(config);
  });

  it("keeps native PostgreSQL array parameters intact through the real database helper", async () => {
    const { queryDatabase } = await import("@/lib/db");
    const result = await queryDatabase("select $1::text[] fields", [["monitor.timers.shutdown"]]);
    expect(result.rows[0].fields).toEqual(["monitor.timers.shutdown"]);
  });

  it("other simulator adapters use the same single-execution JSONB save without negotiating the 1150A DTO", async () => {
    const otherContext = { params: Promise.resolve({ simulatorId: "dvor-1150" }) };
    const initialResponse = await route.POST(request("POST", undefined, false), otherContext);
    expect(initialResponse.status).toBe(201);
    expect(initialResponse.headers.get("Vary")).toBeNull();
    const initial = await initialResponse.json();
    const response = await route.PUT(request("PUT", {
      config: initial.appliedConfig, expectedRevision: 1, changedFields: ["wire.control"],
    }, false), otherContext);
    expect(response.status, JSON.stringify(await response.json())).toBe(200);
    const body = await (await route.GET(request("GET", undefined, false), otherContext)).json();
    expect(body.appliedConfig).toEqual(initial.appliedConfig);
    expect(body.revision).toBe(2);
    expect(body.history).toHaveLength(2);
    expect(body.history).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "apply", changedFields: ["wire.control"], revision: 2 }),
    ]));
  });

  it.each(["explicit", "omitted"])("stores %s empty changedFields as an array, not a PostgreSQL object literal", async (kind) => {
    const initial = await initialize();
    const config = structuredClone(initial.appliedConfig);
    config.monitor.timers.shutdown = 7;
    const response = await route.PUT(request("PUT", {
      config, expectedRevision: 1, ...(kind === "explicit" ? { changedFields: [] } : {}),
    }), context());
    expect(response.status, JSON.stringify(await response.json())).toBe(200);
    const body = await (await route.GET(request(), context())).json();
    expect(body.appliedConfig).toEqual(config);
    expect(body.history.find((entry: { revision: number }) => entry.revision === 2).changedFields).toEqual([]);
    const stored = (await pool.query("select changed_fields, jsonb_typeof(changed_fields) kind from public.user_simulator_config_history where revision=2")).rows[0];
    expect(stored).toEqual({ changed_fields: [], kind: "array" });
  });

  it("legacy GET is accepted by the frozen 28527a parser without changing persisted canonical extensions", async () => {
    await initialize();
    const config = getDefaultDvor1150aConfig();
    config.station.stationDescription = "Legacy-visible station";
    config.monitor.testGenerator!.audioFrequency = 850;
    config.transmitters.tx1.nominal.selfKeyOnLoss = true;
    expect((await route.PUT(request("PUT", { config, expectedRevision: 1 }), context())).status).toBe(200);
    const response = await route.GET(request("GET", undefined, false), context());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Vary")).toContain(header);
    const expected = legacyDefault();
    expected.station.stationDescription = config.station.stationDescription;
    expect(body.appliedConfig).toEqual(expected);
    for (const field of ["initialConfig", "appliedConfig", "backupConfig"]) {
      expect(legacyParse(body[field])).not.toBeNull();
    }
    const canonical = await (await route.GET(request(), context())).json();
    expect(canonical.appliedConfig).toEqual(config);
  });

  it.each(["apply", "restore", "backup", "flash-save"])("legacy %s preserves hidden keyer/TG/calibration extensions and merges backup independently", async (action) => {
    await initialize();
    const applied = getDefaultDvor1150aConfig();
    applied.monitor.testGenerator!.audioFrequency = 850;
    applied.monitor.testGeneratorCalibration!.mon1.azimuthOffset = 1.25;
    applied.monitor.standbyCalibration!.mon2.txPowerScale = 88;
    applied.transmitters.tx1.nominal.selfKeyOnLoss = true;
    applied.transmitters.tx2.nominal.externalKeying = "Windowed";
    const backup = getDefaultDvor1150aConfig();
    backup.monitor.testGenerator!.audioFrequency = 600;
    backup.monitor.testGeneratorCalibration!.mon1.azimuthOffset = 0.5;
    backup.monitor.standbyCalibration!.mon2.txPowerScale = 92;
    backup.transmitters.tx1.nominal.shutdownOnLoss = true;
    backup.transmitters.tx2.nominal.externalKeying = "Enabled";
    expect((await route.PUT(request("PUT", { config: applied, backupConfig: backup, expectedRevision: 1 }), context())).status).toBe(200);
    const incoming = legacyDefault();
    incoming.station.stationDescription = "Legacy edit";
    const incomingBackup = legacyDefault();
    incomingBackup.transmitters.tx1.nominal.outputPower = 66;
    const response = await route.PUT(request("PUT", {
      action, config: incoming, backupConfig: incomingBackup, expectedRevision: 2,
      changedFields: ["station.stationDescription"], operatorUserId: "SEC3",
      sessionId: "20000000-0000-4000-8000-000000000001",
    }, false), context());
    const saved = await response.json();
    expect(response.status, JSON.stringify(saved)).toBe(200);
    expect(legacyParse(saved.appliedConfig)).not.toBeNull();
    expect(legacyParse(saved.backupConfig)).not.toBeNull();
    applied.station.stationDescription = incoming.station.stationDescription;
    backup.transmitters.tx1.nominal.outputPower = 66;
    const body = await (await route.GET(request(), context())).json();
    expect(body.appliedConfig).toEqual(applied);
    expect(body.backupConfig).toEqual(backup);
    expect(body.initialConfig).toEqual(getDefaultDvor1150aConfig());
    expect(body.revision).toBe(3);
    expect(body.history).toHaveLength(3);
    expect(body.history).toEqual(expect.arrayContaining([expect.objectContaining({
      action, changedFields: ["station.stationDescription"], operatorUserId: "SEC3",
      sessionId: "20000000-0000-4000-8000-000000000001", revision: 3,
    })]));
    const stored = (await pool.query("select applied_config, backup_config from public.user_simulator_configs where user_id=$1", [owner])).rows[0];
    expect(stored.applied_config).toEqual(applied);
    expect(stored.backup_config).toEqual(backup);
  });

  it("new opt-in PUT explicitly resets true and non-default extensions to false/default without altering backup", async () => {
    await initialize();
    const nondefault = getDefaultDvor1150aConfig();
    nondefault.transmitters.tx1.nominal.selfKeyOnLoss = true;
    nondefault.transmitters.tx2.nominal.shutdownOnLoss = true;
    nondefault.transmitters.tx2.nominal.externalKeying = "Windowed";
    nondefault.monitor.testGenerator!.audioFrequency = 850;
    nondefault.monitor.standbyCalibration!.mon1.txPowerScale = 75;
    expect((await route.PUT(request("PUT", { config: nondefault, backupConfig: nondefault, expectedRevision: 1 }), context())).status).toBe(200);
    const before = await (await route.GET(request(), context())).json();
    expect(before.appliedConfig).toEqual(nondefault);
    const defaults = getDefaultDvor1150aConfig();
    const response = await route.PUT(request("PUT", { config: defaults, expectedRevision: 2 }), context());
    expect(response.status, JSON.stringify(await response.json())).toBe(200);
    const body = await (await route.GET(request(), context())).json();
    expect(body.appliedConfig).toEqual(defaults);
    expect(body.backupConfig).toEqual(nondefault);
    expect(body.revision).toBe(3);
  });

  it("two simultaneous writers wait on the owner row lock and produce exactly one 200 and one 409", async () => {
    await initialize();
    const a = getDefaultDvor1150aConfig(), b = getDefaultDvor1150aConfig();
    a.monitor.timers.shutdown = 8;
    b.monitor.timers.shutdown = 11;
    const blocker = await pool.connect();
    await blocker.query("begin");
    await blocker.query("select * from public.user_simulator_configs where user_id=$1 and simulator_id='dvor-1150a' for update", [owner]);
    const pending = Promise.all([a, b].map(config => route.PUT(request("PUT", {
      config, expectedRevision: 1, changedFields: ["monitor.timers.shutdown"],
    }), context())));
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
    expect(waiting, "both real transactions must reach the row lock before release").toBe(2);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    const winner = await responses.find(response => response.status === 200)!.json();
    const body = await (await route.GET(request(), context())).json();
    expect(body.appliedConfig).toEqual(winner.appliedConfig);
    expect(body.revision).toBe(2);
    expect(body.history).toHaveLength(2);
    expect(body.history.filter((entry: { action: string }) => entry.action === "apply")).toHaveLength(1);
  });

  it("foreign user cannot target another owner's profile even when sending owner IDs in the payload", async () => {
    await initialize();
    const original = (await pool.query("select * from public.user_simulator_configs where user_id=$1", [owner])).rows[0];
    auth.profile.mockResolvedValue({ id: foreign, role: "student", mustChangePassword: false });
    const config = getDefaultDvor1150aConfig();
    config.station.stationDescription = "Foreign edit";
    const payload = { config, expectedRevision: 1, userId: owner, user_id: owner, operatorUserId: owner };
    expect((await route.PUT(request("PUT", payload), context())).status).toBe(409);
    const empty = await (await route.GET(request(), context())).json();
    expect(empty).toMatchObject({ persisted: false, revision: 0, history: [] });
    await initialize();
    expect((await route.PUT(request("PUT", payload), context())).status).toBe(200);
    const foreignBody = await (await route.GET(request(), context())).json();
    expect(foreignBody.appliedConfig).toEqual(config);
    expect((await pool.query("select * from public.user_simulator_configs where user_id=$1", [owner])).rows[0]).toEqual(original);
    auth.profile.mockResolvedValue({ id: owner, role: "admin" });
    const ownerBody = await (await route.GET(request(), context())).json();
    expect(ownerBody.appliedConfig).toEqual(getDefaultDvor1150aConfig());
    expect(ownerBody.revision).toBe(1);
    expect(ownerBody.history).toHaveLength(1);
  });

  it.each(["GET", "POST", "PUT"] as const)("unauthenticated %s returns 401 without persisting", async method => {
    auth.profile.mockResolvedValue(null);
    expect((await route[method](request(method, method === "PUT" ? {
      config: getDefaultDvor1150aConfig(), expectedRevision: 1,
    } : undefined), context())).status).toBe(401);
    expect((await pool.query("select count(*) n from public.user_simulator_configs")).rows[0].n).toBe("0");
    expect((await pool.query("select count(*) n from public.user_simulator_config_history")).rows[0].n).toBe("0");
  });

  it.each([
    { expectedRevision: 0 }, { expectedRevision: 1.5 }, { changedFields: [1] },
    { changedFields: "monitor" }, { sessionId: "invalid" }, { config: { invalid: true } },
    { backupConfig: null }, { action: "delete" },
  ])("malformed PUT returns 400 and leaves the stored profile/history untouched: %j", async override => {
    await initialize();
    const original = (await pool.query("select * from public.user_simulator_configs where user_id=$1", [owner])).rows[0];
    const response = await route.PUT(request("PUT", { config: getDefaultDvor1150aConfig(), expectedRevision: 1, ...override }), context());
    expect(response.status).toBe(400);
    expect((await pool.query("select * from public.user_simulator_configs where user_id=$1", [owner])).rows[0]).toEqual(original);
    expect((await pool.query("select count(*) n from public.user_simulator_config_history")).rows[0].n).toBe("1");
  });

  it.each(["GET", "POST", "PUT"] as const)("unknown DTO on %s returns 400 without writes", async method => {
    const req = request(method, method === "PUT" ? { config: getDefaultDvor1150aConfig(), expectedRevision: 1 } : undefined);
    req.headers.set(header, "dvor-1150a-extensions-v999");
    const response = await route[method](req, context());
    expect(response.status).toBe(400);
    expect(response.headers.get("Vary")).toContain(header);
    expect((await pool.query("select count(*) n from public.user_simulator_configs")).rows[0].n).toBe("0");
  });
});
