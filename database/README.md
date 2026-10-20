# CNS Simulator database

This directory contains PostgreSQL migrations for the Oracle VM target. It is independent from the legacy Supabase-owned `auth`, `storage`, PostgREST roles, and RLS policies.

## Local database

1. Copy the PostgreSQL variables from `.env.example` into `.env.local` and replace the local-only password.
2. Start PostgreSQL 17:

   ```powershell
   npm run db:dev:up
   ```

3. Apply pending migrations:

   ```powershell
   npm run db:migrate
   ```

4. Stop the local container without deleting its named volume:

   ```powershell
   npm run db:dev:down
   ```

## Migration rules

- Migration files use the format `NNNN_description.sql` and run in lexical order.
- Each file runs in its own transaction.
- Applied checksums are stored in `public.app_schema_migrations`.
- Never edit a migration after it has been applied; add a new migration instead.
- `DATABASE_ADMIN_URL` is preferred for migrations. When absent, the runner falls back to `DATABASE_URL` for local development.
- Never run migrations during `docker build`. On Dokploy, wait for PostgreSQL to become Healthy and run migrations as a separate release step.


## Verified actor for legacy exam writes

Migration `0014_legacy_exam_actor_context.sql` supplies the missing `public.current_app_role()` resolver without Supabase Auth. It derives the role from an active `public.users` row using a **transaction-local** actor UUID; an absent/malformed/unknown actor, disabled account or mandatory password change returns NULL, never admin.

`src/lib/exams/actor-transaction.ts::withExamActorTransaction` resolves the actor from the verified server session (never action input), starts a transaction and calls `set_config('app.actor_user_id', $1, true)` on the same client as the legacy RPC and its triggers. COMMIT/ROLLBACK clears the setting before connection reuse. The application retains its admin guards; SQL rechecks the current user role.

The database credential remains a trusted server-only boundary. A caller already holding that credential can set custom PostgreSQL settings; this is not an independent login mechanism or a substitute for a valid application session, SQL parameter binding, private database ingress and least-privilege credentials.

The migration adds a function only: it does not change stored candidates, attempts, results or existing migration checksums. Keep the old checksums unchanged. Before releasing, back up and apply the additive migration using the matching source and a protected admin connection, then deploy the tested application. Old instances fail closed until the new application supplies actor context. The standalone web runner does not bundle migration scripts/SQL, so do not run `npm run db:migrate` inside that runner. Deployment/migration require separate authorization.

## Real PostgreSQL regression tests

Both `tests/integration/legacy-exams.postgres.test.ts` and `scenario-exams.postgres.test.ts` use explicit `SCENARIO_EXAM_TEST_DATABASE_URL`. Only a loopback endpoint whose control database is named `cns_scenario_exams_test` is accepted. Neither suite reads the application's `DATABASE_URL` or `.env.local` as a fallback. Provide a disposable PostgreSQL 17 role allowed to create databases; each suite creates a random private test database, applies shipped migrations, and drops only that database.

Run with Node 24 after configuring that test-only endpoint:

```text
npm run test:run -- tests/integration --maxWorkers=2
```

SQL/schema/transactions are real; profile/Next.js cache/cookie APIs are mocked. These tests do not replace authenticated browser QA. Legacy regressions cover examiner/candidate JSONB payloads, roster-to-submission-to-grading, zero score and frozen evidence, fail-closed roles, archived protections and actor isolation across commit/rollback/concurrent connections.
