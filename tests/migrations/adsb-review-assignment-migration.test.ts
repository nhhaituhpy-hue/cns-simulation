import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "database/migrations/0012_adsb_review_assignment_support.sql"),
  "utf8",
);

describe("ADS-B review assignment migration SQL guard", () => {
  it("extends the compatibility assignment constraint without changing rows", () => {
    expect(migration).toContain("drop constraint if exists simulator_review_scenario_assignments_module_valid");
    expect(migration).toMatch(/simulator_review_scenario_assignments_module_valid[\s\S]*ads-b/i);
    expect(migration).not.toMatch(/delete\s+from|drop\s+table/i);
  });
});
