import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDefaultDvor1150aConfig as legacyDefault,
  parseDvor1150aConfig as legacyParse,
} from "../fixtures/simulator-config-28527a/dvor-1150a";
import { getDefaultDvor1150aConfig, parseDvor1150aConfig } from "@/lib/simulator-config/dvor-1150a";
import { projectSimulatorConfigResponse } from "@/lib/simulator-config/wire";

const mocks = vi.hoisted(() => ({
  profile: vi.fn(), query: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: mocks.profile }));
vi.mock("@/lib/db", () => ({
  queryDatabase: mocks.query,
  withDatabaseTransaction: mocks.transaction,
}));
import { GET, POST, PUT } from "@/app/api/simulator-config/[simulatorId]/route";

const header = "X-CNS-Simulator-Config-DTO";
const version = "dvor-1150a-extensions-v1";
const context = () => ({ params: Promise.resolve({ simulatorId: "dvor-1150a" }) });
function request(method = "GET", extended = false, payload?: unknown) {
  return new Request("http://localhost/api/simulator-config/dvor-1150a", {
    method,
    headers: { ...(extended ? { [header]: version } : {}), ...(payload ? { "Content-Type": "application/json" } : {}) },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
}
function record(config = getDefaultDvor1150aConfig()) {
  return {
    id: "config-id", user_id: "owner-id", simulator_id: "dvor-1150a", schema_version: 1,
    initial_config: structuredClone(config), applied_config: structuredClone(config),
    backup_config: structuredClone(config), preferences: { retained: true }, revision: 4,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile.mockResolvedValue({ id: "owner-id", role: "student" });
  mocks.transaction.mockImplementation(async (work) => work({ query: mocks.query }));
});

describe("frozen 28527a strict consumer", () => {
  it("legacy projection preserves all baseline values and never mutates canonical snapshots", () => {
    const config = getDefaultDvor1150aConfig();
    config.station.stationDescription = "Non-default station";
    config.station.frequencyMHz = 114.8;
    config.transmitters.tx1.nominal.mainIdentCode = "CNS";
    config.monitor.calibration.mon2.azimuthOffset = 0.25;
    const before = structuredClone(config);
    const response = {
      simulatorId: "dvor-1150a" as const, schemaVersion: 1, initialConfig: config,
      appliedConfig: config, backupConfig: config, preferences: {}, revision: 1, persisted: true, history: [],
    };
    const body = projectSimulatorConfigResponse(response, null);
    const expected = legacyDefault();
    expected.station = { ...config.station };
    expected.transmitters.tx1.nominal.mainIdentCode = "CNS";
    expected.monitor.calibration.mon2.azimuthOffset = 0.25;
    expect(body.appliedConfig).toEqual(expected);
    expect(config).toEqual(before);
    expect(legacyParse(body.appliedConfig)).not.toBeNull();
  });

  it("accepts every valid new enum without discarding explicit extension values", () => {
    const config = getDefaultDvor1150aConfig();
    config.transmitters.tx1.nominal.keyerInputLevel = "Active High/Open";
    config.transmitters.tx1.nominal.externalKeying = "Enabled";
    config.transmitters.tx2.nominal.externalKeying = "Windowed";
    config.monitor.testGenerator!.identStatus = "No Ident";
    expect(parseDvor1150aConfig(config)).toEqual(config);
    config.monitor.testGenerator!.identStatus = "Continuous Ident";
    expect(parseDvor1150aConfig(config)).toEqual(config);
  });

  it("rejects expanded configs while the new parser accepts old and new profiles", () => {
    expect(legacyParse(legacyDefault())).not.toBeNull();
    expect(legacyParse(getDefaultDvor1150aConfig())).toBeNull();
    expect(parseDvor1150aConfig(legacyDefault())).not.toBeNull();
    expect(parseDvor1150aConfig(getDefaultDvor1150aConfig())).not.toBeNull();
  });

  it.each([
    ["unknown monitor branch", (config: ReturnType<typeof getDefaultDvor1150aConfig>) => Object.assign(config.monitor, { notAllowed: {} })],
    ["unknown extension leaf", (config: ReturnType<typeof getDefaultDvor1150aConfig>) => Object.assign(config.monitor.testGenerator!, { notAllowed: 1 })],
    ["incomplete monitor branch", (config: ReturnType<typeof getDefaultDvor1150aConfig>) => { delete (config.monitor.testGenerator as Partial<NonNullable<typeof config.monitor.testGenerator>>).audioFrequency; }],
    ["null monitor branch", (config: ReturnType<typeof getDefaultDvor1150aConfig>) => Object.assign(config.monitor, { standbyCalibration: null })],
    ["invalid keyer boolean", (config: ReturnType<typeof getDefaultDvor1150aConfig>) => Object.assign(config.transmitters.tx1.nominal, { selfKeyOnLoss: "true" })],
    ["invalid keyer input enum", (config: ReturnType<typeof getDefaultDvor1150aConfig>) => Object.assign(config.transmitters.tx1.nominal, { keyerInputLevel: "arbitrary" })],
    ["invalid keyer output enum", (config: ReturnType<typeof getDefaultDvor1150aConfig>) => Object.assign(config.transmitters.tx2.nominal, { externalKeying: "arbitrary" })],
    ["invalid generator ident enum", (config: ReturnType<typeof getDefaultDvor1150aConfig>) => Object.assign(config.monitor.testGenerator!, { identStatus: "arbitrary" })],
    ["missing baseline field", (config: ReturnType<typeof getDefaultDvor1150aConfig>) => { delete (config.station as Partial<typeof config.station>).frequencyMHz; }],
    ["unknown nominal field", (config: ReturnType<typeof getDefaultDvor1150aConfig>) => Object.assign(config.transmitters.tx2.nominal, { unexpected: true })],
    ["non-finite calibration", (config: ReturnType<typeof getDefaultDvor1150aConfig>) => { config.monitor.testGeneratorCalibration!.mon2.azimuthOffset = Infinity; }],
  ] as const)("rejects %s rather than repairing/stripping it", (_label, mutate) => {
    const config = getDefaultDvor1150aConfig();
    mutate(config);
    expect(parseDvor1150aConfig(config)).toBeNull();
  });
});

describe("1150A extension-preserving saves", () => {
  it.each(["apply", "restore", "backup", "flash-save"])("legacy %s preserves hidden applied and backup extensions under the existing revision guard", async (action) => {
    const stored = record();
    stored.applied_config.monitor.testGenerator!.audioFrequency = 850;
    stored.applied_config.monitor.testGeneratorCalibration!.mon1.azimuthOffset = 1.25;
    stored.applied_config.monitor.standbyCalibration!.mon2.txPowerScale = 88;
    stored.applied_config.transmitters.tx1.nominal.selfKeyOnLoss = true;
    stored.applied_config.transmitters.tx2.nominal.externalKeying = "Windowed";
    stored.backup_config.monitor.testGenerator!.audioFrequency = 600;
    stored.backup_config.transmitters.tx2.nominal.shutdownOnLoss = true;
    const incoming = legacyDefault();
    incoming.station.stationDescription = "Legacy edited";
    const backup = legacyDefault();
    backup.transmitters.tx1.nominal.outputPower = 66;
    mocks.query.mockImplementation(async (sql: string, args: unknown[]) => {
      if (sql.includes("save_user_simulator_config")) {
        return { rows: [{ ...stored, applied_config: args[3], backup_config: args[9], revision: 5 }] };
      }
      return { rows: [stored] };
    });
    const response = await PUT(request("PUT", false, {
      action, config: incoming, backupConfig: backup, expectedRevision: 4,
      changedFields: ["station.stationDescription"], operatorUserId: "SEC3",
      sessionId: "20000000-0000-4000-8000-000000000001",
    }), context());
    expect(response.status).toBe(200);
    const save = mocks.query.mock.calls.find(([sql]) => sql.includes("save_user_simulator_config"))!;
    const args = save[1];
    expect(args.slice(0, 3)).toEqual(["owner-id", "dvor-1150a", 1]);
    expect(args.slice(4, 9)).toEqual([4, action, JSON.stringify(["station.stationDescription"]), "SEC3", "20000000-0000-4000-8000-000000000001"]);
    expect(args[3]).toMatchObject({
      station: { stationDescription: "Legacy edited" },
      monitor: {
        testGenerator: { audioFrequency: 850 },
        testGeneratorCalibration: { mon1: { azimuthOffset: 1.25 } },
        standbyCalibration: { mon2: { txPowerScale: 88 } },
      },
      transmitters: { tx1: { nominal: { selfKeyOnLoss: true } }, tx2: { nominal: { externalKeying: "Windowed" } } },
    });
    expect(args[9]).toMatchObject({
      monitor: { testGenerator: { audioFrequency: 600 } },
      transmitters: { tx1: { nominal: { outputPower: 66 } }, tx2: { nominal: { shutdownOnLoss: true } } },
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.query.mock.calls[0][0]).toMatch(/for update/i);
    expect(mocks.query.mock.calls[0][1]).toEqual(["owner-id", "dvor-1150a"]);
    expect(legacyParse((await response.json()).appliedConfig)).not.toBeNull();
  });

  it("no-header PUT still accepts explicit validated extensions and preserves only absent fields", async () => {
    const stored = record();
    stored.applied_config.monitor.testGenerator!.audioFrequency = 850;
    stored.applied_config.transmitters.tx1.nominal.selfKeyOnLoss = true;
    stored.applied_config.transmitters.tx2.nominal.shutdownOnLoss = true;
    const incoming = legacyDefault();
    incoming.monitor.testGenerator = { ...getDefaultDvor1150aConfig().monitor.testGenerator!, audioFrequency: 450 };
    incoming.transmitters.tx1.nominal.selfKeyOnLoss = false;
    mocks.query.mockImplementation(async (sql: string, args: unknown[]) => ({ rows: [
      sql.includes("save_user_simulator_config") ? { ...stored, applied_config: args[3], revision: 5 } : stored,
    ] }));
    const response = await PUT(request("PUT", false, { config: incoming, expectedRevision: 4 }), context());
    expect(response.status).toBe(200);
    const args = mocks.query.mock.calls.find(([sql]) => sql.includes("save_user_simulator_config"))![1];
    expect(args[3].monitor.testGenerator.audioFrequency).toBe(450);
    expect(args[3].transmitters.tx1.nominal.selfKeyOnLoss).toBe(false);
    expect(args[3].transmitters.tx2.nominal.shutdownOnLoss).toBe(true);
    expect(legacyParse((await response.json()).appliedConfig)).not.toBeNull();
  });

  it("new PUT intentionally edits extensions including false/default values", async () => {
    const stored = record();
    stored.applied_config.transmitters.tx1.nominal.selfKeyOnLoss = true;
    stored.applied_config.monitor.testGenerator!.audioFrequency = 850;
    const incoming = getDefaultDvor1150aConfig();
    incoming.monitor.standbyCalibration!.mon1.txPowerScale = 75;
    mocks.query.mockImplementation(async (sql: string, args: unknown[]) => ({ rows: [
      sql.includes("save_user_simulator_config") ? { ...stored, applied_config: args[3], revision: 5 } : stored,
    ] }));
    const response = await PUT(request("PUT", true, { config: incoming, expectedRevision: 4 }), context());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.appliedConfig.transmitters.tx1.nominal.selfKeyOnLoss).toBe(false);
    expect(body.appliedConfig.monitor.testGenerator.audioFrequency).toBe(300);
    expect(body.appliedConfig.monitor.standbyCalibration.mon1.txPowerScale).toBe(75);
    expect(body.revision).toBe(5);
  });
});

describe("1150A authorization, revision and payload guards", () => {
  it.each(["GET", "POST", "PUT"])("requires authentication on %s", async (method) => {
    mocks.profile.mockResolvedValue(null);
    const response = await ({ GET, POST, PUT }[method]!)(request(method), context());
    expect(response.status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each([
    { expectedRevision: 0 }, { expectedRevision: 1.5 }, { expectedRevision: "4" },
    { action: "delete" }, { changedFields: [1] }, { changedFields: "station" },
    { operatorUserId: "x".repeat(65) }, { sessionId: "invalid" }, { config: { arbitrary: true } },
    { backupConfig: { arbitrary: true } }, { backupConfig: null },
  ])("rejects malformed write metadata/config before database access: %j", async (override) => {
    const response = await PUT(request("PUT", false, { config: legacyDefault(), expectedRevision: 4, ...override }), context());
    expect(response.status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns the existing revision conflict response without saving stale legacy drafts", async () => {
    mocks.query.mockResolvedValue({ rows: [{ ...record(), revision: 5 }] });
    const response = await PUT(request("PUT", false, { config: legacyDefault(), expectedRevision: 4 }), context());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Cấu hình đã thay đổi ở phiên khác." });
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes("save_user_simulator_config"))).toBe(false);
  });

  it("keeps an explicit conflict when the database rejects a save", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("save_user_simulator_config")) throw new Error("CONFIG_REVISION_CONFLICT");
      return { rows: [record()] };
    });
    const response = await PUT(request("PUT", true, { config: getDefaultDvor1150aConfig(), expectedRevision: 4 }), context());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Cấu hình đã thay đổi ở phiên khác." });
  });

  it("keeps an explicit not-initialized conflict", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    const response = await PUT(request("PUT", false, { config: legacyDefault(), expectedRevision: 4 }), context());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Cấu hình simulator chưa được khởi tạo." });
  });

  it("uses one transaction client for the locked owner read and save; absent backup remains null", async () => {
    const query = vi.fn().mockImplementation(async (sql: string, args: unknown[]) => ({ rows: [
      sql.includes("save_user_simulator_config") ? { ...record(), applied_config: args[3], revision: 5 } : record(),
    ] }));
    mocks.transaction.mockImplementation(async (work) => work({ query }));
    const response = await PUT(request("PUT", false, { config: legacyDefault(), expectedRevision: 4 }), context());
    expect(response.status).toBe(200);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toMatch(/for update/i);
    expect(query.mock.calls[0][1]).toEqual(["owner-id", "dvor-1150a"]);
    expect(query.mock.calls[1][1][6]).toBe("[]");
    expect(query.mock.calls[1][1][9]).toBeNull();
  });
});

describe("1150A consumer negotiation guards", () => {
  it.each(["GET", "POST", "PUT"])("rejects an unknown DTO on %s before database access", async (method) => {
    const req = request(method, true, method === "PUT" ? { config: legacyDefault(), expectedRevision: 4 } : undefined);
    req.headers.set(header, "dvor-1150a-extensions-v999");
    const response = await ({ GET, POST, PUT }[method]!)(req, context());
    expect(response.status).toBe(400);
    expect(response.headers.get("Vary")).toContain(header);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

describe("1150A consumer projection", () => {
  it.each([false, true])("GET empty profile returns the negotiated representation (extended=%s)", async (extended) => {
    mocks.query.mockResolvedValue({ rows: [] });
    const response = await GET(request("GET", extended), context());
    const body = await response.json();
    expect(response.status).toBe(200);
    for (const field of ["initialConfig", "appliedConfig", "backupConfig"]) {
      expect(legacyParse(body[field]) !== null).toBe(!extended);
      expect(parseDvor1150aConfig(body[field])).not.toBeNull();
    }
    expect(response.headers.get("Vary")).toContain(header);
    expect(body).toMatchObject({ schemaVersion: 1, revision: 0, persisted: false });
  });

  it.each([[false, false], [false, true], [true, false], [true, true]])("GET stored profile returns the negotiated representation (extended=%s, legacyStored=%s)", async (extended, legacyStored) => {
    mocks.query.mockResolvedValueOnce({ rows: [record(legacyStored ? legacyDefault() : getDefaultDvor1150aConfig())] }).mockResolvedValueOnce({ rows: [] });
    const response = await GET(request("GET", extended), context());
    const body = await response.json();
    expect(response.status).toBe(200);
    for (const field of ["initialConfig", "appliedConfig", "backupConfig"]) {
      expect(legacyParse(body[field]) !== null).toBe(!extended);
    }
    expect(body).toMatchObject({ revision: 4, preferences: { retained: true } });
    expect(mocks.query.mock.calls[0][1]).toEqual(["owner-id", "dvor-1150a"]);
  });

  it.each([false, true])("POST initialization returns the negotiated representation (extended=%s)", async (extended) => {
    mocks.query.mockResolvedValue({ rows: [record()] });
    const response = await POST(request("POST", extended), context());
    const body = await response.json();
    expect(response.status).toBe(201);
    for (const field of ["initialConfig", "appliedConfig", "backupConfig"]) {
      expect(legacyParse(body[field]) !== null).toBe(!extended);
    }
    expect(mocks.query.mock.calls[0][1].slice(0, 3)).toEqual(["owner-id", "dvor-1150a", 1]);
    expect(legacyParse(mocks.query.mock.calls[0][1][3])).toBeNull();
  });

  it.each([false, true])("PUT returns the negotiated representation (extended=%s)", async (extended) => {
    mocks.query.mockResolvedValue({ rows: [record()] });
    const response = await PUT(request("PUT", extended, { config: getDefaultDvor1150aConfig(), expectedRevision: 4 }), context());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.action).toBe("apply");
    for (const field of ["initialConfig", "appliedConfig", "backupConfig"]) {
      expect(legacyParse(body[field]) !== null).toBe(!extended);
    }
  });
});
