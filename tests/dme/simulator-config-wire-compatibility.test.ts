import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultDme1119aConfig as legacyDefault, parseDme1119aConfig as legacyParse } from "../fixtures/dme-config-fa138e9/parser";
import { getDefaultDme1119aConfig, parseDme1119aConfig } from "@/lib/simulator-config/dme-1119a";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), query: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: mocks.profile }));
vi.mock("@/lib/db", () => ({ queryDatabase: mocks.query, withDatabaseTransaction: mocks.transaction }));
import { GET, POST, PUT } from "@/app/api/simulator-config/[simulatorId]/route";
const header = "X-CNS-Simulator-Config-DTO", version = "dme-1119a-extensions-v1";
const context = () => ({ params: Promise.resolve({ simulatorId: "dme-1119a" }) });
function request(method = "GET", dto?: string, body?: unknown) {
  return new Request("http://localhost/api/simulator-config/dme-1119a", { method, headers: { "Content-Type": "application/json", ...(dto ? { [header]: dto } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
function record() { const config = getDefaultDme1119aConfig(); return { id: "row", user_id: "owner", simulator_id: "dme-1119a", schema_version: 1, initial_config: structuredClone(config), applied_config: structuredClone(config), backup_config: structuredClone(config), preferences: {}, revision: 4 }; }
beforeEach(() => { vi.clearAllMocks(); mocks.profile.mockResolvedValue({ id: "owner", role: "student" }); mocks.transaction.mockImplementation(async work => work({ query: mocks.query })); });

describe("DME strict legacy profile compatibility", () => {
  it.each(["GET", "POST", "PUT"] as const)("projects every snapshot for legacy %s but opt-in retains every extension", async method => {
    const stored = record();
    stored.applied_config.monitorOffsets!.monitor2[0].standby = 3.5;
    stored.backup_config.rmsCurrentData![0].enabled = true;
    mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes("history") ? [] : [stored] }));
    const handler = { GET, POST, PUT }[method];
    for (const dto of [undefined, version]) {
      const response = await handler(request(method, dto, method === "PUT" ? { config: legacyDefault(), expectedRevision: 4 } : undefined), context());
      expect(response.status).toBe(method === "POST" ? 201 : 200);
      expect(response.headers.get("Vary")).toContain(header);
      const body = await response.json();
      for (const [wire, db] of [["initialConfig", "initial_config"], ["appliedConfig", "applied_config"], ["backupConfig", "backup_config"]] as const) {
        if (dto) {
          expect(body[wire]).toEqual(stored[db]);
          expect(parseDme1119aConfig(body[wire])).toEqual(stored[db]);
          expect(legacyParse(body[wire])).toBeNull();
        } else {
          expect(Object.keys(body[wire]).sort()).toEqual(Object.keys(legacyDefault()).sort());
          expect(legacyParse(body[wire])).toEqual(body[wire]);
          expect(parseDme1119aConfig(body[wire])).not.toBeNull();
        }
      }
    }
  });

  it("unpersisted GET negotiates defaults without initializing a profile", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    for (const dto of [undefined, version]) {
      const response = await GET(request("GET", dto), context());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toMatchObject({ persisted: false, revision: 0, history: [] });
      expect(body.appliedConfig).toEqual(dto ? getDefaultDme1119aConfig() : legacyDefault());
    }
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.query.mock.calls.every(([sql]) => /^select/i.test(sql.trim()))).toBe(true);
  });

  it.each(["GET", "POST", "PUT"] as const)("rejects unauthenticated %s before reading or writing profiles", async method => {
    mocks.profile.mockResolvedValue(null);
    const response = await ({ GET, POST, PUT })[method](request(method, version, method === "PUT" ? { config: getDefaultDme1119aConfig(), expectedRevision: 4 } : undefined), context());
    expect(response.status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each(["GET", "POST", "PUT"] as const)("rejects unknown and cross-simulator DTOs on %s without database work", async method => {
    for (const dto of ["dme-1119a-extensions-v999", "dvor-1150a-extensions-v1"]) {
      const response = await ({ GET, POST, PUT })[method](request(method, dto, method === "PUT" ? { config: legacyDefault(), expectedRevision: 4 } : undefined), context());
      expect(response.status).toBe(400);
      expect(response.headers.get("Vary")).toContain(header);
    }
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("uses the transaction client for both owner-scoped lock and save, never the pool shortcut", async () => {
    const stored = record();
    const query = vi.fn().mockResolvedValue({ rows: [stored] });
    mocks.transaction.mockImplementationOnce(async work => work({ query }));
    const response = await PUT(request("PUT", version, { config: getDefaultDme1119aConfig(), expectedRevision: 4, userId: "other" }), context());
    expect(response.status).toBe(200);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toMatch(/where user_id = \$1 and simulator_id = \$2 for update/i);
    expect(query.mock.calls[0][1]).toEqual(["owner", "dme-1119a"]);
    expect(query.mock.calls[1][1].slice(0, 2)).toEqual(["owner", "dme-1119a"]);
  });

  it.each(["missing-owner-row", "stale-revision"])("returns conflict for %s without invoking save", async reason => {
    mocks.query.mockResolvedValue({ rows: reason === "missing-owner-row" ? [] : [record()] });
    const response = await PUT(request("PUT", version, { config: legacyDefault(), expectedRevision: reason === "stale-revision" ? 3 : 4 }), context());
    expect(response.status).toBe(409);
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.query.mock.calls[0][0]).toMatch(/for update/i);
  });

  it("keeps no-header GET readable by the frozen parser while opt-in reads new settings", async () => {
    const stored = record(); stored.applied_config.monitorOffsets!.monitor1[0].integral = 2.5;
    mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes("history") ? [] : [stored] }));
    const old = await GET(request(), context()); const oldBody = await old.json();
    expect(old.status).toBe(200); expect(legacyParse(oldBody.appliedConfig)).not.toBeNull();
    expect(old.headers.get("Vary")).toContain(header);
    const modern = await GET(request("GET", version), context());
    expect((await modern.json()).appliedConfig.monitorOffsets.monitor1[0].integral).toBe(2.5);
    expect(stored.applied_config.monitorOffsets!.monitor1[0].integral).toBe(2.5);
  });

  it("legacy PUT keeps omitted canonical extensions under owner-scoped transaction lock", async () => {
    const stored = record(); stored.applied_config.monitorOffsets!.monitor1[0].integral = 2.5; stored.applied_config.rmsVoltageData![0].enabled = true;
    stored.backup_config.monitorOffsets!.monitor2[0].standby = 1.5;
    mocks.query.mockImplementation(async (sql: string, values: unknown[]) => ({ rows: [sql.includes("save_user_simulator_config") ? { ...stored, applied_config: values[3], backup_config: values[9], revision: 5 } : stored] }));
    const incoming = legacyDefault(); incoming.txConfigNominal.rtcParameters.powerOutput = -1;
    const response = await PUT(request("PUT", undefined, { config: incoming, backupConfig: legacyDefault(), expectedRevision: 4 }), context());
    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.query.mock.calls[0][0]).toMatch(/for update/i);
    expect(mocks.query.mock.calls[0][1]).toEqual(["owner", "dme-1119a"]);
    const args = mocks.query.mock.calls.find(([sql]) => sql.includes("save_user_simulator_config"))![1];
    expect(args[3].monitorOffsets.monitor1[0].integral).toBe(2.5);
    expect(args[3].rmsVoltageData[0].enabled).toBe(true);
    expect(args[3].txConfigNominal.rtcParameters.powerOutput).toBe(-1);
    expect(args[9].monitorOffsets.monitor2[0].standby).toBe(1.5);
    expect(legacyParse((await response.json()).appliedConfig)).not.toBeNull();
  });

  it("new client opts into the extension representation on load, initialize and apply", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetcher);
    try {
      const client = await import("@/lib/simulator-config/client");
      await client.loadSimulatorConfig("dme-1119a");
      await client.initializeSimulatorConfig("dme-1119a");
      await client.applySimulatorConfig({ simulatorId: "dme-1119a", config: getDefaultDme1119aConfig(), expectedRevision: 1 });
      expect(fetcher).toHaveBeenCalledTimes(3);
      for (const [, options] of fetcher.mock.calls) expect(new Headers(options.headers).get(header)).toBe(version);
    } finally { vi.unstubAllGlobals(); }
  });
});
