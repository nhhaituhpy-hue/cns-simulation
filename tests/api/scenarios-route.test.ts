import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/profile", () => ({
  getCurrentProfile: vi.fn(async () => ({
    id: "e2e-admin",
    email: "admin@attech.com.vn",
    fullName: "Quản trị kiểm thử",
    workUnit: "Đơn vị kiểm thử",
    role: "admin",
  })),
}));

import { DELETE, GET, POST } from "@/app/api/scenarios/route";
import { DEFAULT_SCENARIOS } from "@/stores/default-scenarios";

const previousE2eTestMode = process.env.E2E_TEST_MODE;

describe("ADS-B scenario API E2E isolation", () => {
  beforeEach(() => {
    process.env.E2E_TEST_MODE = "1";
  });

  afterEach(() => {
    if (previousE2eTestMode === undefined) {
      delete process.env.E2E_TEST_MODE;
    } else {
      process.env.E2E_TEST_MODE = previousE2eTestMode;
    }
  });

  it("returns an empty remote dataset without connecting to Supabase", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("accepts scenario writes without persisting them", async () => {
    const scenario = DEFAULT_SCENARIOS[0];
    const response = await POST(
      new Request("http://localhost/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scenario),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      scenario,
      testMode: true,
    });
  });

  it("accepts scenario deletes without persisting them", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/scenarios?id=e2e-scenario", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      testMode: true,
    });
  });
});
