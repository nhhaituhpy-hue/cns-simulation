// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
it("adds private session and analysis schema without creating source", () => {
 const path=resolve("database/migrations/0016_ai_authoring_sessions.sql");
 expect(existsSync(path),"additive authoring migration exists").toBe(true);
 const sql=readFileSync(path,"utf8");
 for(const table of ["ai_authoring_sessions","ai_authoring_analysis_jobs","ai_authoring_document_namespaces"]) {
  expect(sql).toContain(`create table public.${table}`);
  expect(sql).toContain(`revoke all on table public.${table} from public`);
 }
 expect(sql).toMatch(/unique\s*\(actor_id,\s*idempotency_key\)/);
 expect(sql).toMatch(/unique\s*\(session_id,\s*idempotency_key\)/);
 for(const field of ["base_revision integer not null","state_json jsonb not null","attempt_token uuid","lease_expires_at timestamptz","finalized_revision integer"])expect(sql).toContain(field);
 expect(sql).toContain("references public.simulator_scenario_parameters(id) on delete restrict");
 expect(sql).toContain("octet_length(state_json::text) <= 2097152");
 expect(sql).toContain("foreign key (session_id,actor_id) references public.ai_authoring_sessions(id,actor_id) on delete restrict");
 expect(sql).not.toMatch(/(?:insert into|update|delete from|alter table) public\.(?:simulator_scenario_parameters|scenarios|.*memberships)/i);
});
