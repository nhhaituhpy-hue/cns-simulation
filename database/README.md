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
