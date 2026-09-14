import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/scenario-parameters/route";
import { getCurrentProfile, type AuthProfile } from "@/lib/auth/profile";
import { queryDatabase, upsertDatabaseRow } from "@/lib/db";
import { parseScenarioParameters, SCENARIO_PARAMETERS_MODULES } from "@/lib/scenario-parameters";
import {
  mapRowToStoredScenarioParameters,
  storedScenarioParametersToRow,
} from "@/lib/scenario-parameters-storage";
import { createLowPowerDme320Scenario } from "@/modules/operations/dme-320/domain/scenario";
import { createDefaultDvor220ScenarioDefinition } from "@/modules/operations/dvor-220/domain/scenario";

vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: vi.fn() }));
vi.mock("@/lib/db", () => ({ queryDatabase: vi.fn(), upsertDatabaseRow: vi.fn() }));
const timestamp = "2026-09-14T00:00:00.000Z";
const profile: AuthProfile = {
  id: "test-admin",
  role: "admin",
  email: "admin@example.test",
  fullName: "Test",
  workUnit: "Lab",
  mustChangePassword: false,
};
function request(definition: unknown, moduleId = "dme-320") {
  return new Request("http://localhost/api/scenario-parameters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moduleId, definition, sourceFileName: "test-scenario.json" }),
  });
}

describe("DME 320 shared scenario library integration (mock database)", () => {
  beforeEach(() => {
    vi.stubEnv("E2E_TEST_MODE", "0");
    vi.mocked(getCurrentProfile).mockResolvedValue(profile);
    vi.mocked(queryDatabase).mockResolvedValue({ rows: [] } as never);
    vi.mocked(upsertDatabaseRow).mockImplementation(
      async (_table, row) => ({ rows: [{ ...row, id: "row-id", created_at: timestamp }] }) as never,
    );
  });
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("registers DME 320 and rejects a different module schema", () => {
    expect(SCENARIO_PARAMETERS_MODULES.some((module) => module.moduleId === "dme-320")).toBe(true);
    expect(parseScenarioParameters("dme-320", createDefaultDvor220ScenarioDefinition())).toBeNull();
    expect(parseScenarioParameters("dvor-220", createLowPowerDme320Scenario())).toBeNull();
    expect(parseScenarioParameters("dvor-220", createDefaultDvor220ScenarioDefinition())).not.toBeNull();
  });

  it("round-trips storage with normalized IDs, empty descriptions and nullable thresholds", () => {
    const definition = createLowPowerDme320Scenario();
    definition.id = " low-output ";
    definition.description = "";
    definition.configuration.monitor.limits.erpDb.alarmHigh = null;
    const row = storedScenarioParametersToRow({ moduleId: "dme-320", definition, createdBy: profile.id });
    expect(mapRowToStoredScenarioParameters({ ...row, id: "row-id", created_at: timestamp })).toMatchObject({
      moduleId: "dme-320",
      scenarioId: "low-output",
      description: "",
      definition: { id: "low-output", description: "" },
    });
  });

  it("imports a validated definition via the existing upsert API", async () => {
    const definition = createLowPowerDme320Scenario();
    const response = await POST(request(definition));
    expect(response.status).toBe(200);
    expect(upsertDatabaseRow).toHaveBeenCalledWith(
      "simulator_scenario_parameters",
      expect.objectContaining({ module_id: "dme-320", scenario_id: definition.id }),
      ["module_id", "scenario_id"],
    );
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      scenario: { moduleId: "dme-320", definition },
    });
  });

  it("loads DME 320 from the shared library for the simulator route loader", async () => {
    const definition = createLowPowerDme320Scenario();
    const row = storedScenarioParametersToRow({ moduleId: "dme-320", definition, createdBy: profile.id });
    vi.mocked(queryDatabase).mockResolvedValue({
      rows: [{ ...row, id: "row-id", created_at: timestamp }],
    } as never);
    const response = await GET(new Request("http://localhost/api/scenario-parameters?id=row-id"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([{ moduleId: "dme-320", definition }]);
  });

  it("rejects malformed input before a database write", async () => {
    const response = await POST(request({ schemaVersion: 1, runtime: {} }));
    expect(response.status).toBe(400);
    expect(upsertDatabaseRow).not.toHaveBeenCalled();
  });

  it("keeps library authoring admin-only", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue({ ...profile, role: "student" });
    expect((await POST(request(createLowPowerDme320Scenario()))).status).toBe(403);
    const response = await GET(new Request("http://localhost/api/scenario-parameters"));
    expect(response.status).toBe(403);
    expect(queryDatabase).not.toHaveBeenCalled();
    expect(upsertDatabaseRow).not.toHaveBeenCalled();
  });
});
