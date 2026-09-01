import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;
const { Client } = pg;

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDirectory = join(projectRoot, "database", "migrations");
const migrationLockName = "cns-simulator-database-migrations";

loadEnvConfig(projectRoot);

function databaseConnectionString() {
  const connectionString = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_ADMIN_URL or DATABASE_URL must be configured before running migrations.");
  }
  return connectionString;
}

function databaseSsl() {
  const enabled = process.env.DATABASE_SSL?.trim().toLowerCase();
  return enabled === "true" || enabled === "require"
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
    : false;
}

async function migrationFiles() {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^\d+_[a-z0-9_-]+\.sql$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function checksum(sql) {
  return createHash("sha256").update(sql).digest("hex");
}

async function ensureMigrationTable(client) {
  await client.query(`
    create table if not exists public.app_schema_migrations (
      version text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
}

async function appliedMigrations(client) {
  const result = await client.query(
    "select version, checksum from public.app_schema_migrations order by version",
  );
  return new Map(result.rows.map((row) => [row.version, row.checksum]));
}

async function applyMigration(client, version, sql, sqlChecksum) {
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query(
      "insert into public.app_schema_migrations (version, checksum) values ($1, $2)",
      [version, sqlChecksum],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function run() {
  const files = await migrationFiles();
  if (files.length === 0) {
    throw new Error(`No migration files found in ${migrationsDirectory}.`);
  }

  const client = new Client({
    connectionString: databaseConnectionString(),
    ssl: databaseSsl(),
    application_name: "cns-simulator-migrations",
  });

  await client.connect();
  let lockAcquired = false;
  try {
    await client.query("select pg_advisory_lock(hashtext($1))", [migrationLockName]);
    lockAcquired = true;
    await ensureMigrationTable(client);
    const applied = await appliedMigrations(client);
    let appliedCount = 0;

    for (const version of files) {
      const sql = await readFile(join(migrationsDirectory, version), "utf8");
      const sqlChecksum = checksum(sql);
      const previousChecksum = applied.get(version);

      if (previousChecksum) {
        if (previousChecksum !== sqlChecksum) {
          throw new Error(`Migration ${version} changed after it was applied.`);
        }
        console.log(`skip  ${version}`);
        continue;
      }

      console.log(`apply ${version}`);
      await applyMigration(client, version, sql, sqlChecksum);
      appliedCount += 1;
    }

    console.log(`Database migrations complete (${appliedCount} applied, ${files.length - appliedCount} unchanged).`);
  } finally {
    try {
      if (lockAcquired) {
        await client.query("select pg_advisory_unlock(hashtext($1))", [migrationLockName]);
      }
    } finally {
      await client.end();
    }
  }
}

run().catch((error) => {
  console.error("Database migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
