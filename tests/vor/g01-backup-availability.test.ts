import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "@/app/api/simulator-config/[simulatorId]/route";
import { getSimulatorConfigAdapter } from "@/lib/simulator-config/registry";

const db = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: async () => ({ id: "owner" }) }));
vi.mock("@/lib/db", () => ({ queryDatabase: db.query, withDatabaseTransaction: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

it.each([false, true])("reports explicit 1150A backup availability (%s) independently of capped history", async (available) => {
  const config = getSimulatorConfigAdapter("dvor-1150a")!.getDefaultConfig();
  db.query.mockResolvedValueOnce({ rows: [{ schema_version: 1, initial_config: config, applied_config: config,
    backup_config: config, preferences: {}, revision: 202, has_configuration_backup: available }] });
  db.query.mockResolvedValueOnce({ rows: [] });
  const response = await GET(new Request("http://localhost/api/simulator-config/dvor-1150a"), {
    params: Promise.resolve({ simulatorId: "dvor-1150a" }),
  });
  expect(response.status).toBe(200);
  expect((await response.json()).preferences.dvor1150aHasBackup).toBe(available);
  expect(db.query.mock.calls[0][0]).toContain("history.action = 'backup'");
  expect(db.query.mock.calls[0][1]).toEqual(["owner", "dvor-1150a"]);
});

it("does not change other PMDT profile queries or preference responses", async () => {
  const config = getSimulatorConfigAdapter("dvor-1150")!.getDefaultConfig();
  db.query.mockResolvedValueOnce({ rows: [{ schema_version: 1, initial_config: config, applied_config: config,
    backup_config: config, preferences: { existing: true }, revision: 1 }] });
  db.query.mockResolvedValueOnce({ rows: [] });
  const response = await GET(new Request("http://localhost/api/simulator-config/dvor-1150"), {
    params: Promise.resolve({ simulatorId: "dvor-1150" }),
  });
  expect(response.status).toBe(200);
  expect((await response.json()).preferences).toEqual({ existing: true });
  expect(db.query.mock.calls[0][0]).not.toContain("exists");
});
