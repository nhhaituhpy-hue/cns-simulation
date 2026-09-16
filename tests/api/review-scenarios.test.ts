import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "@/app/api/review-scenarios/route";
import { getCurrentProfile, type AuthProfile } from "@/lib/auth/profile";
import { queryDatabase, withDatabaseTransaction } from "@/lib/db";
import { storedScenarioParametersToRow } from "@/lib/scenario-parameters-storage";
import { createDefaultDvor220ScenarioDefinition } from "@/modules/operations/dvor-220/domain/scenario";

vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: vi.fn() }));
vi.mock("@/lib/db", () => ({
  queryDatabase: vi.fn(),
  withDatabaseTransaction: vi.fn(),
}));

const timestamp = "2026-09-16T00:00:00.000Z";
const scenarioRowId = "11111111-1111-4111-8111-111111111111";
const profile: AuthProfile = {
  id: "22222222-2222-4222-8222-222222222222",
  role: "admin",
  email: "admin@example.test",
  fullName: "Giám khảo",
  workUnit: "Lab",
  mustChangePassword: false,
};

function storedRow() {
  return {
    ...storedScenarioParametersToRow({
      moduleId: "dvor-220",
      definition: createDefaultDvor220ScenarioDefinition(),
      createdBy: profile.id,
    }),
    id: scenarioRowId,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function getRequest() {
  return new Request("http://localhost/api/review-scenarios?moduleId=dvor-220");
}

function putRequest(scenarioIds: string[]) {
  return new Request("http://localhost/api/review-scenarios", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moduleId: "dvor-220", scenarioIds }),
  });
}

describe("review scenario assignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("E2E_TEST_MODE", "0");
    vi.mocked(getCurrentProfile).mockResolvedValue(profile);
  });

  it("returns assigned scenarios and the device library to an admin", async () => {
    vi.mocked(queryDatabase)
      .mockResolvedValueOnce({ rows: [{ ...storedRow(), sort_order: 1, assigned_at: timestamp }] } as never)
      .mockResolvedValueOnce({ rows: [storedRow()] } as never);

    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      canManage: true,
      assigned: [{ id: scenarioRowId, moduleId: "dvor-220", sortOrder: 1 }],
      available: [{ id: scenarioRowId, moduleId: "dvor-220" }],
    });
  });

  it("returns only published scenarios to a student", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue({ ...profile, role: "student" });
    vi.mocked(queryDatabase).mockResolvedValueOnce({
      rows: [{ ...storedRow(), sort_order: 1, assigned_at: timestamp }],
    } as never);

    const response = await GET(getRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ canManage: false, assigned: [{ id: scenarioRowId }] });
    expect(payload).not.toHaveProperty("available");
    expect(queryDatabase).toHaveBeenCalledTimes(1);
  });

  it("replaces one device assignment list in a transaction", async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: scenarioRowId, module_id: "dvor-220" }] })
        .mockResolvedValue({ rows: [] }),
    };
    vi.mocked(withDatabaseTransaction).mockImplementation(async (work) => work(client as never));

    const response = await PUT(putRequest([scenarioRowId]));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, assignedCount: 1 });
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("delete from public.simulator_review_scenario_assignments"),
      ["dvor-220"],
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("insert into public.simulator_review_scenario_assignments"),
      ["dvor-220", scenarioRowId, 1, profile.id],
    );
  });

  it("rejects writes from students", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue({ ...profile, role: "student" });
    const response = await PUT(putRequest([scenarioRowId]));
    expect(response.status).toBe(403);
    expect(withDatabaseTransaction).not.toHaveBeenCalled();
  });

  it("rejects a scenario that belongs to another device", async () => {
    const client = {
      query: vi.fn().mockResolvedValueOnce({
        rows: [{ id: scenarioRowId, module_id: "dme-320" }],
      }),
    };
    vi.mocked(withDatabaseTransaction).mockImplementation(async (work) => work(client as never));
    const response = await PUT(putRequest([scenarioRowId]));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("không thuộc thiết bị") });
  });
});
