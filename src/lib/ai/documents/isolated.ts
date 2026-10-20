import { fork } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AiScenarioError, type EvidenceDocument } from "../scenario-generation/types";
import { validateEvidenceDocuments } from "../scenario-generation/validation";
import type { DocumentMetadata } from "./validation";

interface ParserOptions { entryPath: string; storageRoot: string; signal?: AbortSignal; timeoutMs?: number }
/** Resource-limited, credential-free OS process; malformed parsers cannot kill the queue. */
export async function runDocumentParser(metadata: DocumentMetadata, options: ParserOptions): Promise<EvidenceDocument> {
  if (options.signal?.aborted) throw new AiScenarioError("CANCELLED", "Document parsing was cancelled.");
  const timeoutMs = Math.max(100, Math.min(30_000, options.timeoutMs ?? 30_000));
  return new Promise((resolveResult, rejectResult) => {
    const child = fork(options.entryPath, [], {
      execArgv: ["--max-old-space-size=192", "--max-semi-space-size=4"],
      env: { NODE_ENV: "production", CNS_AI_STORAGE_DIR: options.storageRoot,
        ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}),
        ...(process.env.PATH ? { PATH: process.env.PATH } : {}) },
      stdio: ["ignore", "ignore", "ignore", "ipc"], serialization: "json",
    });
    let settled = false;
    let result: EvidenceDocument | undefined;
    let failure: AiScenarioError | undefined;
    let memoryTimer: ReturnType<typeof setInterval> | undefined;
    let checkingMemory = false;
    const stop = (code: string) => {
      if (settled) return;
      failure = new AiScenarioError(code, "Document parsing exceeded a limit or could not complete safely.");
      if (child.pid) child.kill("SIGKILL");
    };
    const abort = () => stop("CANCELLED");
    const finish = () => {
      if (settled) return;
      settled = true; clearTimeout(timeout); clearInterval(memoryTimer);
      options.signal?.removeEventListener("abort", abort);
      if (failure) rejectResult(failure);
      else if (result) resolveResult(result);
      else rejectResult(new AiScenarioError("DOCUMENT_RESOURCE_LIMIT", "Document parser stopped before completion."));
    };
    child.once("error", () => { failure = new AiScenarioError("DOCUMENT_RESOURCE_LIMIT", "Document parser could not be started safely."); finish(); });
    child.once("exit", (code) => {
      if (code !== 0 && !failure) failure = new AiScenarioError("DOCUMENT_RESOURCE_LIMIT", "Document parser exceeded a resource limit.");
      finish();
    });
    child.on("message", (value: unknown) => {
      if (settled || result || failure) return;
      try {
        const message = value as { ok?: boolean; document?: EvidenceDocument; code?: unknown };
        if (message?.ok !== true) { stop(message?.code === "CANCELLED" ? "CANCELLED" : "INVALID_DOCUMENT"); return; }
        validateEvidenceDocuments([message.document]);
        const document = message.document!;
        if (document.id !== metadata.id || document.name !== metadata.name || document.sha256 !== metadata.sha256) throw new Error("identity");
        result = document;
      } catch { stop("INVALID_DOCUMENT"); }
    });
    options.signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(() => stop("DOCUMENT_TIMEOUT"), timeoutMs);
    if (process.platform === "linux") memoryTimer = setInterval(() => {
      if (!child.pid || checkingMemory || settled) return;
      checkingMemory = true;
      void readFile(`/proc/${child.pid}/status`, "utf8").then((status) => {
        const rssKiB = Number(/^VmRSS:\s+(\d+)\s+kB/m.exec(status)?.[1]);
        if (rssKiB > 256 * 1024) stop("DOCUMENT_RESOURCE_LIMIT");
      }).catch(() => undefined).finally(() => { checkingMemory = false; });
    }, 50);
    if (options.signal?.aborted) abort();
    if (!failure) child.send({ metadata }, (error) => { if (error) stop("DOCUMENT_RESOURCE_LIMIT"); });
  });
}
export async function extractIsolatedDocuments(manifests: DocumentMetadata[], signal?: AbortSignal): Promise<EvidenceDocument[]> {
  if (manifests.length > 5) throw new AiScenarioError("INVALID_DOCUMENT", "Too many documents.");
  const documents: EvidenceDocument[] = [];
  const entryPath = resolve("dist-ai-worker/document-child.mjs");
  const storageRoot = process.env.CNS_AI_STORAGE_DIR || "/app/storage/ai-scenarios";
  for (const metadata of manifests) documents.push(await runDocumentParser(metadata, { entryPath, storageRoot, signal }));
  return documents;
}
