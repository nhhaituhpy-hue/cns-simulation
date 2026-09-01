import "server-only";

import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";

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
