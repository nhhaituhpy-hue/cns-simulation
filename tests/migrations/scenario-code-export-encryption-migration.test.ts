import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "database/migrations/0013_scenario_code_export_encryption.sql"),
  "utf8",
);

describe("Scenario Exam code export encryption migration", () => {
  it("adds nullable ciphertext without replacing the redemption hash", () => {
    expect(migration).toContain("add column code_ciphertext text");
    expect(migration).toContain("scenario_exam_codes_ciphertext_valid");
    expect(migration).not.toMatch(/drop\s+column\s+code_hash/i);
  });

  it("audits PDF exports without allowing plaintext code values", () => {
    expect(migration).toContain("'code_exported'");
    expect(migration).toContain("Authenticated encrypted code envelope");
    expect(migration).not.toContain("code_plaintext");
  });
});
