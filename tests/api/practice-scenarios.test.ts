import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentProfile } from "@/lib/auth/profile";
import { queryDatabase } from "@/lib/db";
import * as route from "@/app/api/practice-scenarios/route";
vi.mock("@/lib/auth/profile", () => ({ getCurrentProfile: vi.fn() }));
vi.mock("@/lib/db", () => ({ queryDatabase: vi.fn() }));
const id = "11111111-1111-4111-8111-111111111111";
const request = () => new Request(`http://localhost/api/practice-scenarios?moduleId=dme-320&id=${id}`);
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getCurrentProfile).mockResolvedValue({ id: "actor", role: "admin", mustChangePassword: false } as never); });
afterEach(() => vi.restoreAllMocks());
describe("practice snapshot reader", () => {
  it("reads the published membership even for admins, never the mutable authoring source", async () => {
    vi.mocked(queryDatabase).mockResolvedValue({ rows: [{ id, module_id: "dme-320", scenario_id: "native-one", membership_id: "published-one", revision_number: 7, name: "Published situation", description: "Frozen description", difficulty: "basic", definition_json: { id: "native-one" } }], rowCount: 1 } as never);
    const response = await route.GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id, moduleId: "dme-320", scenarioId: "native-one", membershipId: "published-one", revision: 7, name: "Published situation", description: "Frozen description", difficulty: "basic", definition: { id: "native-one" } });
    const sql = vi.mocked(queryDatabase).mock.calls[0][0];
    expect(sql).toContain("simulator_scenario_library_memberships");
    expect(sql).toContain("library_kind='practice'");
    expect(sql).not.toContain("simulator_scenario_parameters");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("fails closed for a draft/exam-only ID and does not fall back", async () => {
    vi.mocked(queryDatabase).mockResolvedValue({ rows: [], rowCount: 0 } as never);
    expect((await route.GET(request())).status).toBe(404);
    expect(queryDatabase).toHaveBeenCalledTimes(1);
  });
  it("rejects unauthenticated and malformed input without querying", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(null);
    expect((await route.GET(request())).status).toBe(401);
    vi.mocked(getCurrentProfile).mockResolvedValue({ id: "actor", mustChangePassword: false } as never);
    expect((await route.GET(new Request("http://localhost/api/practice-scenarios?moduleId=ads-b&id=legacy-bad"))).status).toBe(400);
    expect(queryDatabase).not.toHaveBeenCalled();
  });
});
