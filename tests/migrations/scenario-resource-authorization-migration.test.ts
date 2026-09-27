import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "database/migrations/0009_scenario_resource_authorization.sql"),
  "utf8",
);

describe("scenario resource authorization migration SQL guard", () => {
  it("seeds every module/library pair with a cartesian join", () => {
    expect(migration).toContain("cross join");
    expect(migration).not.toMatch(/from\s+unnest\s*\(/i);
    expect(migration).toContain("on conflict (module_id, library_kind) do nothing");
  });
});
