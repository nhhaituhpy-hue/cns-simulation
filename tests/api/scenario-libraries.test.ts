import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "@/app/api/scenario-libraries/route";
import { getCurrentProfile, type AuthProfile } from "@/lib/auth/profile";
import { queryDatabase, withDatabaseTransaction } from "@/lib/db";
import { createLowPowerDme320Scenario } from "@/modules/operations/dme-320/domain/scenario";
import { storedScenarioParametersToRow } from "@/lib/scenario-parameters-storage";

vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: vi.fn() }));
vi.mock("@/lib/db", () => ({ queryDatabase: vi.fn(), withDatabaseTransaction: vi.fn() }));

const teacherA: AuthProfile = {
  id: "teacher-a",
  role: "teacher",
  email: "teacher-a@example.test",
  fullName: "Teacher A",
  workUnit: "Lab",
  mustChangePassword: false,
};

const admin: AuthProfile = { ...teacherA, id: "admin", role: "admin", email: "admin@example.test" };
const scenarioId = "11111111-1111-4111-8111-111111111111";

function availableScenarioRow(overrides: Record<string, unknown> = {}) {
  const timestamp = "2026-09-27T00:00:00.000Z";
  return {
    ...storedScenarioParametersToRow({
      moduleId: "dme-320",
      definition: createLowPowerDme320Scenario(),
      createdBy: "teacher-b",
    }),
    id: scenarioId,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

function putRequest(expectedRevision = 0) {
  return new Request("http://localhost/api/scenario-libraries", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      moduleId: "dme-320",
      libraryKind: "exam",
      scenarioIds: [scenarioId],
      expectedRevision,
    }),
  });
}

describe("scenario library resource authorization and concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("E2E_TEST_MODE", "0");
    vi.stubEnv("CNS_TEACHER_SCENARIO_AUTHORING", "1");
    vi.mocked(getCurrentProfile).mockResolvedValue(teacherA);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects teacher A when the selected source belongs to teacher B", async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ revision: 0 }] })
        .mockResolvedValueOnce({ rows: [{
          id: scenarioId,
          module_id: "dme-320",
          created_by: "teacher-b",
          has_manage_grant: false,
        }] }),
    };
    vi.mocked(withDatabaseTransaction).mockImplementation(async (work) => work(client as never));

    const response = await PUT(putRequest());

    expect(response.status).toBe(403);
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it("returns 409 when the library revision is stale", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(admin);
    const client = {
      query: vi.fn().mockResolvedValueOnce({ rows: [{ revision: 2 }] }),
    };
    vi.mocked(withDatabaseTransaction).mockImplementation(async (work) => work(client as never));

    const response = await PUT(putRequest(1));

    expect(response.status).toBe(409);
    expect(queryDatabase).not.toHaveBeenCalled();
  });

  it("archives only teacher-manageable memberships", async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ revision: 0 }] })
        .mockResolvedValue({ rows: [] }),
    };
    vi.mocked(withDatabaseTransaction).mockImplementation(async (work) => work(client as never));

    const response = await PUT(new Request("http://localhost/api/scenario-libraries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId: "dme-320",
        libraryKind: "exam",
        scenarioIds: [],
        expectedRevision: 0,
      }),
    }));

    expect(response.status).toBe(200);
    const archiveCall = client.query.mock.calls.find(([sql]) => String(sql).includes("update public.simulator_scenario_library_memberships"));
    expect(archiveCall?.[0]).toEqual(expect.stringContaining("from public.simulator_scenario_parameters sp"));
    expect(archiveCall?.[0]).toEqual(expect.stringContaining("sp.created_by"));
  });

  it("keeps a teacher-granted scenario in the available list", async () => {
    vi.mocked(queryDatabase)
      .mockResolvedValueOnce({ rows: [availableScenarioRow({ has_manage_grant: true })] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [{ library_kind: "practice", revision: 0 }, { library_kind: "exam", revision: 0 }] } as never);

    const response = await GET(new Request("http://localhost/api/scenario-libraries?moduleId=dme-320"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.available).toHaveLength(1);
    expect(vi.mocked(queryDatabase).mock.calls[0]?.[0]).toEqual(expect.stringContaining("as has_manage_grant"));
  });

  it("allows a teacher with a manage grant to publish the granted scenario", async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ revision: 0 }] })
        .mockResolvedValueOnce({ rows: [availableScenarioRow({ has_manage_grant: true })] })
        .mockResolvedValue({ rows: [] }),
    };
    vi.mocked(withDatabaseTransaction).mockImplementation(async (work) => work(client as never));

    const response = await PUT(putRequest(0));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, publishedCount: 1 });
  });

  it("does not expose teacher-owned authoring data when teacher rollout is disabled", async () => {
    vi.stubEnv("CNS_TEACHER_SCENARIO_AUTHORING", "0");
    const response = await GET(new Request("http://localhost/api/scenario-libraries?moduleId=dme-320"));

    expect(response.status).toBe(403);
    expect(queryDatabase).not.toHaveBeenCalled();
  });
});
