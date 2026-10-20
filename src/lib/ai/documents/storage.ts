import { randomUUID, createHash } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, writeFile, open, lstat, realpath, rm } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { validateUploads, documentMimeType, DOCUMENT_LIMITS, type DocumentUpload, type DocumentMetadata } from "./validation";
import { extractDocumentBytes } from "./extract";
import { AiScenarioError, type EvidenceDocument } from "../scenario-generation/types";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const failedOwnJobs = new Map<string, string>();
function keyError(): never { throw new AiScenarioError("INVALID_STORAGE_KEY", "Invalid document storage reference."); }
function storageRoot(): string {
  const root = process.env.CNS_AI_STORAGE_DIR || "/app/storage/ai-scenarios";
  if (!isAbsolute(root) || resolve(/* turbopackIgnore: true */ root) === "/") keyError();
  return resolve(/* turbopackIgnore: true */ root);
}
async function assertDirectory(path: string): Promise<void> {
  const stat = await lstat(/* turbopackIgnore: true */ path);
  if (stat.isSymbolicLink() || !stat.isDirectory() || await realpath(/* turbopackIgnore: true */ path) !== path) keyError();
}
/** Only this process's failed partial uploads can be removed; completed jobs are retained. */
export async function removeOwnJobDocuments(jobId: string): Promise<void> {
  const path = failedOwnJobs.get(jobId);
  if (!path) return;
  await assertDirectory(path);
  await rm(/* turbopackIgnore: true */ path, { recursive: true, force: false });
  failedOwnJobs.delete(jobId);
}
/** Exclusive generated job directory; original names are display-only, never path components. */
export async function saveDocuments(jobId: string, files: DocumentUpload[]): Promise<DocumentMetadata[]> {
  if (!UUID.test(jobId)) keyError();
  validateUploads(files);
  if (!files.length) return [];
  const root = storageRoot();
  await mkdir(/* turbopackIgnore: true */ root, { recursive: true, mode: 0o700 });
  await assertDirectory(root);
  const directory = join(/* turbopackIgnore: true */ root, jobId);
  await mkdir(/* turbopackIgnore: true */ directory, { mode: 0o700 }); // Never reuse/overwrite a previous job.
  try {
    const manifests: DocumentMetadata[] = [];
    for (const file of files) {
      const data = Buffer.from(await file.arrayBuffer());
      if (data.length !== file.size || data.length > DOCUMENT_LIMITS.fileBytes) throw new AiScenarioError("INVALID_UPLOAD", "Document bytes do not match the declared upload size.");
      const id = randomUUID(); const storageKey = `${jobId}/${id}`;
      await writeFile(/* turbopackIgnore: true */ join(/* turbopackIgnore: true */ root, storageKey), data, { mode: 0o600, flag: "wx" });
      manifests.push({ id, name: file.name, mimeType: documentMimeType(file.name, file.type), bytes: data.length, sha256: createHash("sha256").update(data).digest("hex"), storageKey });
    }
    return manifests;
  } catch (error) {
    failedOwnJobs.set(jobId, directory);
    await removeOwnJobDocuments(jobId);
    if (error instanceof AiScenarioError) throw error;
    throw new AiScenarioError("DOCUMENT_STORAGE", "Could not safely store the uploaded documents.");
  }
}
export async function loadDocument(metadata: DocumentMetadata, signal?: AbortSignal): Promise<EvidenceDocument> {
  const [jobId, id, extra] = metadata.storageKey.split("/");
  if (!UUID.test(jobId ?? "") || !UUID.test(id ?? "") || extra !== undefined || metadata.id !== id
    || !Number.isSafeInteger(metadata.bytes) || metadata.bytes <= 0 || metadata.bytes > DOCUMENT_LIMITS.fileBytes || !/^[a-f0-9]{64}$/.test(metadata.sha256)) keyError();
  documentMimeType(metadata.name, metadata.mimeType);
  const root = storageRoot(); await assertDirectory(root); await assertDirectory(join(/* turbopackIgnore: true */ root, jobId));
  const handle = await open(/* turbopackIgnore: true */ join(/* turbopackIgnore: true */ root, metadata.storageKey), constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size !== metadata.bytes) throw new AiScenarioError("DOCUMENT_INTEGRITY", "Stored document failed integrity verification.");
    const bytes = Buffer.alloc(metadata.bytes + 1); let count = 0;
    while (count < bytes.length) {
      const read = await handle.read(bytes, count, bytes.length - count, null);
      if (read.bytesRead === 0) break;
      count += read.bytesRead;
    }
    const data = bytes.subarray(0, count);
    if (count !== metadata.bytes || createHash("sha256").update(data).digest("hex") !== metadata.sha256) throw new AiScenarioError("DOCUMENT_INTEGRITY", "Stored document failed integrity verification.");
    return await extractDocumentBytes(metadata, data, signal);
  } finally { await handle.close(); }
}
