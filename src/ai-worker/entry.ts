import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";
import { claimGenerationJob, heartbeatGenerationJob, completeGenerationJob, failGenerationJob } from "../lib/ai/scenario-generation/jobs";
import { processNextGeneration } from "../lib/ai/scenario-generation/worker";
import { generateScenario } from "../lib/ai/scenario-generation/generator";
import { extractIsolatedDocuments } from "../lib/ai/documents/isolated";

const { Pool, types } = pg;
types.setTypeParser(1114, (value) => value);
types.setTypeParser(1184, (value) => value);
const controller = new AbortController();
process.once("SIGTERM", () => controller.abort());
process.once("SIGINT", () => controller.abort());
const workerId = `cns-ai-${randomUUID()}`;
const once = process.argv.includes("--once");
const interval = Math.max(1000, Math.min(30_000, Number(process.env.CNS_AI_POLL_MS) || 3000));
const root = process.env.CNS_AI_STORAGE_DIR || "/app/storage/ai-scenarios";
const healthFile = `${root}/.worker-health.json`;
let pool: pg.Pool | undefined;

async function health(status: string) {
  await mkdir(dirname(healthFile), { recursive: true, mode: 0o700 });
  const temporary = `${healthFile}.${process.pid}`;
  await writeFile(temporary, JSON.stringify({ status, updatedAt: new Date().toISOString() }), { mode: 0o600 });
  await rename(temporary, healthFile);
}

async function main() {
  if (process.env.CNS_AI_WORKER_ENABLED !== "true") {
    console.log("AI worker is disabled; no jobs claimed.");
    return;
  }
  if (!process.env.DATABASE_URL || !process.env.CNS_AI_API_KEY) throw new Error("WORKER_CONFIGURATION_MISSING");
  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3,
    connectionTimeoutMillis: 5000, idleTimeoutMillis: 30_000, application_name: "cns-ai-worker",
    ssl: ["true", "require"].includes(process.env.DATABASE_SSL || "")
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : false });
  pool.on("error", () => { console.error("AI worker database connection error."); });
  await pool.query("select 1");
  await health("ready");
  console.log("AI worker ready.");
  do {
    if (controller.signal.aborted) break;
    const outcome = await processNextGeneration({
      claim: () => claimGenerationJob(pool!, workerId),
      heartbeat: async (job, phase) => Boolean(await heartbeatGenerationJob(pool!, job.id, job.attemptToken, phase)),
      loadDocuments: (documents, signal) => extractIsolatedDocuments(documents, signal),
      generate: (input, documents, signal) => generateScenario(input, documents, signal),
      complete: async (job, result) => Boolean(await completeGenerationJob(pool!, job.id, job.attemptToken, result)),
      fail: (job, error) => failGenerationJob(pool!, job.id, job.attemptToken, error),
      signal: controller.signal,
    });
    await health(outcome === "stopped" ? "stopping" : "ready");
    if (once) break;
    await delay(interval, undefined, { signal: controller.signal }).catch(() => undefined);
  } while (!controller.signal.aborted);
}

main().catch(async () => {
  console.error("AI worker stopped because a required dependency failed; no raw provider or document data logged.");
  process.exitCode = 1;
  await health("error").catch(() => undefined);
}).finally(async () => { await pool?.end(); });
