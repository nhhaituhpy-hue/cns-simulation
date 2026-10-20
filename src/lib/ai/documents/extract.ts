import { zipSync, strFromU8 } from "fflate";
import { inflateRawSync } from "node:zlib";
import { inspectBoundedDocxXml, type DocxXmlBudget } from "./bounded-xml";
import { DOCUMENT_LIMITS, documentMimeType, type DocumentMetadata } from "./validation";
import { AiScenarioError, type EvidenceDocument } from "../scenario-generation/types";

function invalid(message = "Document is invalid or does not contain supported readable text."): never { throw new AiScenarioError("INVALID_DOCUMENT", message); }
function boundedText(text: string): string {
  if (text.length > DOCUMENT_LIMITS.textCharacters || /[\x00-\x08\x0b\x0e-\x1f]/.test(text)) invalid("Document text exceeds the limit or contains binary content.");
  return text.replace(/\r\n?/g, "\n").replace(/\f/g, "\n").trim();
}
/** ZIP metadata is untrusted: validate every region before bounded inflation. */
function inspectDocx(bytes: Uint8Array): Uint8Array {
  const partLimit = 8 * 1024 * 1024, totalLimit = 20 * 1024 * 1024;
  if (bytes.length < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) invalid();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  const firstEnd = Math.max(0, bytes.length - 22 - 65535);
  while (end >= firstEnd && (view.getUint32(end, true) !== 0x06054b50 || end + 22 + view.getUint16(end + 20, true) !== bytes.length)) end--;
  if (end < firstEnd) invalid();
  const count = view.getUint16(end + 10, true), directory = view.getUint32(end + 16, true), directorySize = view.getUint32(end + 12, true);
  if (!count || count > 1000 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)
    || count !== view.getUint16(end + 8, true) || directory + directorySize !== end) invalid();
  const checkExtra = (start: number, length: number) => {
    const stop = start + length;
    while (start < stop) {
      if (start + 4 > stop || view.getUint16(start, true) === 1) invalid(); // No ZIP64, including redundant fields.
      start += 4 + view.getUint16(start + 2, true);
      if (start > stop) invalid();
    }
  };
  const names = new Set<string>();
  const entries: { name: string; method: number; size: number; compressedSize: number; crc: number; local: number; start: number; stop: number; regionEnd: number }[] = [];
  let offset = directory, declaredTotal = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) invalid();
    const version = view.getUint16(offset + 6, true), flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true), compressedSize = view.getUint32(offset + 20, true), size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true), extraLength = view.getUint16(offset + 30, true);
    const next = offset + 46 + nameLength + extraLength + view.getUint16(offset + 32, true), local = view.getUint32(offset + 42, true);
    if (next > end || version < 10 || version > 20 || (flags & ~0x080e) || ![0, 8].includes(method)
      || (method === 0 && ((flags & 6) || compressedSize !== size)) || view.getUint16(offset + 34, true)) invalid();
    checkExtra(offset + 46 + nameLength, extraLength);
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength);
    const name = flags & 0x800 ? new TextDecoder("utf-8", { fatal: true }).decode(nameBytes) : strFromU8(nameBytes, true);
    declaredTotal += size;
    if (!name || names.has(name) || name.length > 255 || /[\x00-\x1f:]/.test(name)
      || name.startsWith("/") || name.includes("\\") || name.split("/").some((part) => part === ".." || part === ".")
      || /(^|\/)(vba|activex|embeddings)|vbaproject|\.(bin|exe|js|vbs)$/i.test(name)
      || size > partLimit || declaredTotal > totalLimit || (size > 1024 * 1024 && size > Math.max(1, compressedSize) * 200)) invalid("DOCX archive exceeds safety limits or contains unsupported active content.");
    names.add(name);
    if (local + 30 > directory || view.getUint32(local, true) !== 0x04034b50
      || view.getUint16(local + 4, true) !== version || view.getUint16(local + 6, true) !== flags
      || view.getUint16(local + 8, true) !== method || view.getUint16(local + 26, true) !== nameLength) invalid();
    const localExtra = view.getUint16(local + 28, true), start = local + 30 + nameLength + localExtra, stop = start + compressedSize;
    if (start > directory || stop > directory || !nameBytes.every((value, index) => bytes[local + 30 + index] === value)) invalid();
    checkExtra(local + 30 + nameLength, localExtra);
    const localCrc = view.getUint32(local + 14, true), localCompressed = view.getUint32(local + 18, true), localSize = view.getUint32(local + 22, true);
    let regionEnd = stop;
    if (flags & 8) {
      // Streaming ZIPs may leave zeros locally; a complete matching descriptor is still mandatory.
      if ((localCrc !== 0 && localCrc !== crc) || (localCompressed !== 0 && localCompressed !== compressedSize) || (localSize !== 0 && localSize !== size)) invalid();
      const descriptorMatches = (position: number) => position + 12 <= directory && view.getUint32(position, true) === crc
        && view.getUint32(position + 4, true) === compressedSize && view.getUint32(position + 8, true) === size;
      if (stop + 4 <= directory && view.getUint32(stop, true) === 0x08074b50 && descriptorMatches(stop + 4)) regionEnd += 16;
      else if (descriptorMatches(stop)) regionEnd += 12;
      else invalid();
    } else if (localCrc !== crc || localCompressed !== compressedSize || localSize !== size) invalid();
    entries.push({ name, method, size, compressedSize, crc, local, start, stop, regionEnd });
    offset = next;
  }
  if (offset !== end || !names.has("word/document.xml") || !names.has("[Content_Types].xml")) invalid("A valid DOCX document is required.");
  // Include headers and descriptors, not just payloads: embedded or aliased local records are ambiguous too.
  const regions = [...entries].sort((a, b) => a.local - b.local);
  for (let i = 1; i < regions.length; i++) if (regions[i].local < regions[i - 1].regionEnd) invalid();
  const xml: Record<string, Uint8Array> = Object.create(null);
  let actualTotal = 0;
  for (const entry of entries) {
    const payload = bytes.subarray(entry.start, entry.stop);
    let data: Uint8Array;
    if (entry.method === 0) data = payload;
    else {
      // Native zlib enforces the output bound while inflating, even if both ZIP headers lie.
      const inflated = inflateRawSync(payload, { maxOutputLength: Math.max(1, Math.min(partLimit, totalLimit - actualTotal, entry.size)), info: true }) as unknown as { buffer: Buffer; engine: { bytesWritten: number } };
      if (inflated.engine.bytesWritten !== entry.compressedSize) invalid();
      data = inflated.buffer;
    }
    actualTotal += data.length;
    if (data.length !== entry.size || data.length > partLimit || actualTotal > totalLimit || docxCrc32(data) !== entry.crc) invalid();
    if (/\.(xml|rels)$/i.test(entry.name)) xml[entry.name] = data;
  }
  // No Mammoth/XML trees or entity-replacement strings until every XML part
  // passes one shared structural/text budget (including otherwise unused parts).
  const budget: DocxXmlBudget = { nodes: 0, textCharacters: 0, attributeCharacters: 0 };
  for (const [name, data] of Object.entries(xml)) inspectBoundedDocxXml(data, budget, /\.rels$/i.test(name));
  return zipSync(xml, { level: 0 });
}
const docxCrcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function docxCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const value of data) crc = docxCrcTable[(crc ^ value) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export async function extractDocumentBytes(metadata: DocumentMetadata, bytes: Uint8Array, signal?: AbortSignal): Promise<EvidenceDocument> {
  if (signal?.aborted) throw new AiScenarioError("CANCELLED", "Document extraction was cancelled.");
  if (!bytes.length || bytes.length > DOCUMENT_LIMITS.fileBytes || bytes.length !== metadata.bytes) invalid();
  const mimeType = documentMimeType(metadata.name, metadata.mimeType);
  let segments: EvidenceDocument["segments"];
  try {
    if (mimeType === "application/pdf") {
      if (!Buffer.from(bytes.subarray(0, 1024)).includes(Buffer.from("%PDF-"))) invalid("A valid text-layer PDF is required.");
      const { getDocumentProxy, extractText } = await import("unpdf");
      const pdfOptions = { isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0 };
      const pdf = await getDocumentProxy(new Uint8Array(bytes), pdfOptions);
      const abort = () => { void pdf.loadingTask.destroy(); };
      signal?.addEventListener("abort", abort, { once: true });
      try {
        if (pdf.numPages < 1 || pdf.numPages > DOCUMENT_LIMITS.pages) invalid("PDF may contain at most 200 pages.");
        // Extract one page at a time so oversized text is rejected without accumulating every page.
        segments = []; let length = 0;
        for (let page = 1; page <= pdf.numPages; page++) {
          if (signal?.aborted) throw new AiScenarioError("CANCELLED", "Document extraction was cancelled.");
          const pageProxy = await pdf.getPage(page);
          // unpdf's extractor accepts a document proxy; narrow its page count to this single native page.
          const onePage = Object.create(pdf) as typeof pdf;
          Object.defineProperty(onePage, "numPages", { value: 1 });
          onePage.getPage = async () => pageProxy;
          const extracted = await extractText(onePage, { mergePages: true });
          const text = boundedText(extracted.text); length += text.length;
          if (length > DOCUMENT_LIMITS.textCharacters) invalid("Extracted PDF text exceeds 120000 characters.");
          if (text) segments.push({ label: `page ${page}`, text });
          pageProxy.cleanup();
        }
      } finally { signal?.removeEventListener("abort", abort); await pdf.loadingTask.destroy(); }
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const safeArchive = inspectDocx(bytes);
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(safeArchive) });
      segments = [{ label: "document", text: boundedText(result.value) }];
    } else {
      segments = [{ label: "text", text: boundedText(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) }];
    }
    if (signal?.aborted) throw new AiScenarioError("CANCELLED", "Document extraction was cancelled.");
    if (!segments.some((segment) => segment.text.trim())) invalid("Document has no readable text layer. Scanned PDFs require OCR before upload.");
    return { id: metadata.id, name: metadata.name, sha256: metadata.sha256, segments };
  } catch (error) {
    if (error instanceof AiScenarioError) throw error;
    if (signal?.aborted) throw new AiScenarioError("CANCELLED", "Document extraction was cancelled.");
    invalid();
  }
}
export async function extractDocument(metadata: DocumentMetadata, signal?: AbortSignal): Promise<EvidenceDocument> {
  const { loadDocument } = await import("./storage"); return loadDocument(metadata, signal);
}
export async function extractDocuments(manifests: DocumentMetadata[], signal?: AbortSignal): Promise<EvidenceDocument[]> {
  if (manifests.length > DOCUMENT_LIMITS.count) invalid("At most five documents can be extracted.");
  const documents: EvidenceDocument[] = [];
  for (const manifest of manifests) {
    if (signal?.aborted) throw new AiScenarioError("CANCELLED", "Document extraction was cancelled.");
    documents.push(await extractDocument(manifest, signal));
  }
  return documents;
}
