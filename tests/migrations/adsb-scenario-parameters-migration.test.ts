import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "database/migrations/0010_adsb_scenario_parameters_and_library.sql"),
  "utf8",
);

describe("ADS-B Scenario Parameters migration SQL guard", () => {
  it("allows ADS-B in both library and revision module constraints", () => {
    expect(migration).toMatch(/simulator_scenario_library_memberships_module_valid[\s\S]*ads-b/i);
    expect(migration).toMatch(/simulator_scenario_library_revisions_module_valid[\s\S]*ads-b/i);
    expect(migration).toContain("('ads-b', 'practice', 0)");
    expect(migration).toContain("('ads-b', 'exam', 0)");
  });

  it("backfills legacy ADS-B definitions without publishing memberships", () => {
    expect(migration).toContain("from public.scenarios source");
    expect(migration).toContain("source_filename");
    expect(migration).toContain("'legacy-adsb'");
    expect(migration).toContain("where not exists");
    expect(migration).not.toContain("insert into public.simulator_scenario_library_memberships");
  });
});
