import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/scenario-parameters/route";
import { getCurrentProfile, type AuthProfile } from "@/lib/auth/profile";
import { insertDatabaseRow, queryDatabase } from "@/lib/db";
import { parseScenarioParameters, SCENARIO_PARAMETERS_MODULES } from "@/lib/scenario-parameters";
import {
  mapRowToStoredScenarioParameters,
  storedScenarioParametersToRow,
} from "@/lib/scenario-parameters-storage";
import { createLowPowerDme320Scenario } from "@/modules/operations/dme-320/domain/scenario";
import { createDefaultDvor220ScenarioDefinition } from "@/modules/operations/dvor-220/domain/scenario";

vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: vi.fn() }));
vi.mock("@/lib/db", () => ({ queryDatabase: vi.fn(), insertDatabaseRow: vi.fn() }));
const timestamp = "2026-09-14T00:00:00.000Z";
const profile: AuthProfile = {
  id: "test-admin",
  role: "admin",
  email: "admin@example.test",
  fullName: "Test",
  workUnit: "Lab",
  mustChangePassword: false,
};
const teacherA: AuthProfile = {
  ...profile,
  id: "teacher-a",
  role: "teacher",
  email: "teacher-a@example.test",
};
const teacherB: AuthProfile = {
  ...profile,
  id: "teacher-b",
  role: "teacher",
  email: "teacher-b@example.test",
};
function request(definition: unknown, moduleId = "dme-320", extra: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/scenario-parameters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moduleId, definition, sourceFileName: "test-scenario.json", ...extra }),
  });
}

describe("DME 320 shared scenario library integration (mock database)", () => {
  beforeEach(() => {
    vi.stubEnv("E2E_TEST_MODE", "0");
    vi.mocked(getCurrentProfile).mockResolvedValue(profile);
    vi.mocked(queryDatabase).mockResolvedValue({ rows: [] } as never);
    vi.mocked(insertDatabaseRow).mockImplementation(
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

  it("inserts a validated definition without an owner-changing upsert", async () => {
    const definition = createLowPowerDme320Scenario();
    const response = await POST(request(definition));
    expect(response.status).toBe(200);
    expect(insertDatabaseRow).toHaveBeenCalledWith(
      "simulator_scenario_parameters",
      expect.objectContaining({ module_id: "dme-320", scenario_id: definition.id }),
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
    expect(insertDatabaseRow).not.toHaveBeenCalled();
  });

  it("keeps library authoring admin-only", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue({ ...profile, role: "student" });
    expect((await POST(request(createLowPowerDme320Scenario()))).status).toBe(403);
    const response = await GET(new Request("http://localhost/api/scenario-parameters"));
    expect(response.status).toBe(403);
    expect(queryDatabase).not.toHaveBeenCalled();
    expect(insertDatabaseRow).not.toHaveBeenCalled();
  });

  it("does not allow teacher A to read, update, or delete teacher B's scenario by id", async () => {
    vi.stubEnv("CNS_TEACHER_SCENARIO_AUTHORING", "1");
    vi.mocked(getCurrentProfile).mockResolvedValue(teacherA);
    const definition = createLowPowerDme320Scenario();
    const row = {
      ...storedScenarioParametersToRow({ moduleId: "dme-320", definition, createdBy: teacherB.id }),
      id: "teacher-b-scenario",
      created_by: teacherB.id,
      created_at: timestamp,
      updated_at: timestamp,
    };
    vi.mocked(queryDatabase).mockResolvedValue({ rows: [row] } as never);

    const readResponse = await GET(new Request("http://localhost/api/scenario-parameters?id=teacher-b-scenario"));
    expect(readResponse.status).toBe(404);

    const updateResponse = await POST(request(definition));
    expect(updateResponse.status).toBe(403);
    expect(insertDatabaseRow).not.toHaveBeenCalled();

    const deleteResponse = await (await import("@/app/api/scenario-parameters/route")).DELETE(
      new Request("http://localhost/api/scenario-parameters?id=teacher-b-scenario", { method: "DELETE" }),
    );
    expect(deleteResponse.status).toBe(404);
  });

  it("allows the owner to update without changing created_by", async () => {
    vi.stubEnv("CNS_TEACHER_SCENARIO_AUTHORING", "1");
    vi.mocked(getCurrentProfile).mockResolvedValue(teacherA);
    const definition = createLowPowerDme320Scenario();
    const timestamp = "2026-09-27T00:00:00.000Z";
    const row = {
      ...storedScenarioParametersToRow({ moduleId: "dme-320", definition, createdBy: teacherA.id }),
      id: "teacher-a-scenario",
      created_by: teacherA.id,
      created_at: timestamp,
      updated_at: timestamp,
      revision: 1,
    };
    vi.mocked(queryDatabase)
      .mockResolvedValueOnce({ rows: [row] } as never)
      .mockResolvedValueOnce({ rows: [{ ...row, revision: 2 }] } as never);

    const response = await POST(request(definition, "dme-320", { expectedRevision: 1 }));

    expect(response.status).toBe(200);
    expect(vi.mocked(queryDatabase).mock.calls[1]?.[0]).toEqual(expect.stringContaining("sp.created_by = $9"));
    await expect(response.json()).resolves.toMatchObject({ scenario: { createdBy: teacherA.id, revision: 2 } });
  });

  it("allows a granted teacher to update while the grant exists", async () => {
    vi.stubEnv("CNS_TEACHER_SCENARIO_AUTHORING", "1");
    vi.mocked(getCurrentProfile).mockResolvedValue(teacherA);
    const definition = createLowPowerDme320Scenario();
    const timestamp = "2026-09-27T00:00:00.000Z";
    const row = {
      ...storedScenarioParametersToRow({ moduleId: "dme-320", definition, createdBy: teacherB.id }),
      id: "teacher-b-granted-scenario",
      created_by: teacherB.id,
      created_at: timestamp,
      updated_at: timestamp,
      revision: 1,
      has_manage_grant: true,
    };
    vi.mocked(queryDatabase)
      .mockResolvedValueOnce({ rows: [row] } as never)
      .mockResolvedValueOnce({ rows: [{ ...row, revision: 2 }] } as never);

    const response = await POST(request(definition, "dme-320", { expectedRevision: 1 }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ scenario: { createdBy: teacherB.id, revision: 2 } });
  });

  it("allows the owner to archive a scenario and rechecks ownership in SQL", async () => {
    vi.stubEnv("CNS_TEACHER_SCENARIO_AUTHORING", "1");
    vi.mocked(getCurrentProfile).mockResolvedValue(teacherA);
    const definition = createLowPowerDme320Scenario();
    const timestamp = "2026-09-27T00:00:00.000Z";
    const row = {
      ...storedScenarioParametersToRow({ moduleId: "dme-320", definition, createdBy: teacherA.id }),
      id: "teacher-a-archive-scenario",
      created_by: teacherA.id,
      created_at: timestamp,
      updated_at: timestamp,
      revision: 1,
      has_manage_grant: false,
    };
    vi.mocked(queryDatabase)
      .mockResolvedValueOnce({ rows: [row] } as never)
      .mockResolvedValueOnce({ rows: [{ id: row.id }] } as never);

    const response = await (await import("@/app/api/scenario-parameters/route")).DELETE(
      new Request(`http://localhost/api/scenario-parameters?id=${row.id}`, { method: "DELETE" }),
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(queryDatabase).mock.calls[1]?.[0]).toEqual(expect.stringContaining("sp.created_by = $2"));
  });

  it("keeps teacher authoring disabled until the rollout flag is explicitly enabled", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(teacherA);
    const response = await POST(request(createLowPowerDme320Scenario()));
    expect(response.status).toBe(403);
    expect(insertDatabaseRow).not.toHaveBeenCalled();
  });

  it("binds the teacher owner filter correctly when listing resources", async () => {
    vi.stubEnv("CNS_TEACHER_SCENARIO_AUTHORING", "1");
    vi.mocked(getCurrentProfile).mockResolvedValue(teacherA);

    const response = await GET(new Request("http://localhost/api/scenario-parameters"));

    expect(response.status).toBe(200);
    expect(queryDatabase).toHaveBeenCalledWith(
      expect.stringContaining("sp.created_by = $1"),
      [teacherA.id],
    );
  });
});
