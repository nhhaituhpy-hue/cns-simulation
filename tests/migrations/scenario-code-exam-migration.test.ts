import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "database/migrations/0011_scenario_code_exam_sessions.sql"),
  "utf8",
);

describe("code-based Scenario Exam migration SQL guard", () => {
  it("creates isolated exam, code, session, item and audit tables", () => {
    expect(migration).toContain("create table public.scenario_exams");
    expect(migration).toContain("create table public.scenario_exam_codes");
    expect(migration).toContain("create table public.scenario_exam_code_subjects");
    expect(migration).toContain("create table public.scenario_exam_sessions");
    expect(migration).toContain("create table public.scenario_exam_session_items");
    expect(migration).toContain("create table public.scenario_exam_audit_events");
    expect(migration).toContain("library_membership_id uuid not null");
  });

  it("keeps code/session integrity and does not touch legacy exam tables", () => {
    expect(migration).toContain("code_hash text not null unique");
    expect(migration).toContain("session_token_hash text not null unique");
    expect(migration).toContain("unique (code_id, module_id)");
    expect(migration).toContain("unique (session_id, code_subject_id)");
    expect(migration).not.toContain("drop table");
    expect(migration).not.toContain("public.exam_attempts");
    expect(migration).not.toContain("public.exam_candidates");
  });
});
