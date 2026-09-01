import "server-only";

import {
  Pool,
  types,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";

// Keep PostgreSQL timestamps in the same ISO-compatible string shape previously
// returned by PostgREST. This avoids implicit local-time conversion in DTO mappers.
types.setTypeParser(1114, (value) => value);
types.setTypeParser(1184, (value) => value);

const DEFAULT_POOL_MAX = 5;
const DEFAULT_CONNECTION_TIMEOUT_MS = 5_000;
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;

declare global {
  var cnsSimulatorDatabasePool: Pool | undefined;
}

function positiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function databaseSsl() {
  const enabled = process.env.DATABASE_SSL?.trim().toLowerCase();
  return enabled === "true" || enabled === "require"
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
    : false;
}

function createDatabasePool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const pool = new Pool({
    connectionString,
    ssl: databaseSsl(),
    application_name: "cns-simulator-web",
    max: positiveInteger(process.env.DATABASE_POOL_MAX, DEFAULT_POOL_MAX),
    connectionTimeoutMillis: positiveInteger(
      process.env.DATABASE_CONNECTION_TIMEOUT_MS,
      DEFAULT_CONNECTION_TIMEOUT_MS,
    ),
    idleTimeoutMillis: positiveInteger(
      process.env.DATABASE_IDLE_TIMEOUT_MS,
      DEFAULT_IDLE_TIMEOUT_MS,
    ),
  });

  pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error", error);
  });

  return pool;
}

export function getDatabasePool() {
  globalThis.cnsSimulatorDatabasePool ??= createDatabasePool();
  return globalThis.cnsSimulatorDatabasePool;
}

export async function queryDatabase<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<Row>> {
  return getDatabasePool().query<Row>(text, values);
}

function quotedIdentifier(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe PostgreSQL identifier: ${value}`);
  }
  return `"${value}"`;
}

export async function upsertDatabaseRow<Row extends QueryResultRow = QueryResultRow>(
  table: string,
  row: Record<string, unknown>,
  conflictColumns: string[] = ["id"],
) {
  const columns = Object.keys(row);
  if (columns.length === 0) throw new Error("Cannot upsert an empty database row.");
  const updateColumns = columns.filter((column) => !conflictColumns.includes(column));
  const sql = `insert into public.${quotedIdentifier(table)} (${columns.map(quotedIdentifier).join(", ")})
    values (${columns.map((_, index) => `$${index + 1}`).join(", ")})
    on conflict (${conflictColumns.map(quotedIdentifier).join(", ")}) do update set
      ${updateColumns.map((column) => `${quotedIdentifier(column)} = excluded.${quotedIdentifier(column)}`).join(", ")}
    returning *`;
  return queryDatabase<Row>(sql, columns.map((column) => row[column]));
}

export async function insertDatabaseRow<Row extends QueryResultRow = QueryResultRow>(
  table: string,
  row: Record<string, unknown>,
) {
  const columns = Object.keys(row);
  if (columns.length === 0) throw new Error("Cannot insert an empty database row.");
  const sql = `insert into public.${quotedIdentifier(table)} (${columns.map(quotedIdentifier).join(", ")})
    values (${columns.map((_, index) => `$${index + 1}`).join(", ")})
    returning *`;
  return queryDatabase<Row>(sql, columns.map((column) => row[column]));
}

export async function withDatabaseTransaction<Result>(
  work: (client: PoolClient) => Promise<Result>,
): Promise<Result> {
  const client = await getDatabasePool().connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch (rollbackError) {
      console.error("PostgreSQL transaction rollback failed", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}
