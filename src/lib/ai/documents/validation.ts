import { AiScenarioError } from "../scenario-generation/types";
export const DOCUMENT_LIMITS = { count: 5, fileBytes: 10 * 1024 * 1024, totalBytes: 25 * 1024 * 1024, pages: 200, textCharacters: 120_000 } as const;
export interface DocumentUpload { name: string; type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> }
export interface DocumentMetadata { id: string; name: string; mimeType: string; bytes: number; sha256: string; storageKey: string }
export function documentMimeType(name: string, suppliedType: string): string {
  if (!name || name.length > 255 || /[\x00-\x1f\x7f/\\:]/.test(name)) throw new AiScenarioError("INVALID_UPLOAD", "Document name is invalid.");
  const extension = name.split(".").pop()?.toLowerCase();
  const types: Record<string, string[]> = { pdf: ["application/pdf"], docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], txt: ["text/plain"], md: ["text/markdown", "text/plain", "text/x-markdown"] };
  const allowed = extension ? types[extension] : undefined;
  if (!allowed || (suppliedType !== "" && !allowed.includes(suppliedType.toLowerCase()))) throw new AiScenarioError("INVALID_UPLOAD", "Use PDF, DOCX, UTF-8 TXT or Markdown with a matching media type.");
  return allowed[0];
}
export function validateUploads(files: DocumentUpload[]): void {
  if (!Array.isArray(files) || files.length > DOCUMENT_LIMITS.count) throw new AiScenarioError("INVALID_UPLOAD", "Upload at most five documents.");
  let total = 0;
  for (const file of files) {
    if (!file || typeof file.name !== "string" || typeof file.type !== "string" || typeof file.arrayBuffer !== "function"
      || !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > DOCUMENT_LIMITS.fileBytes) throw new AiScenarioError("INVALID_UPLOAD", "Each document must contain 1 byte to 10 MiB.");
    documentMimeType(file.name, file.type); total += file.size;
  }
  if (total > DOCUMENT_LIMITS.totalBytes) throw new AiScenarioError("INVALID_UPLOAD", "Total document size may not exceed 25 MiB.");
}
