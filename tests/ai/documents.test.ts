// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { mkdtemp, rm, readFile, readdir, writeFile, symlink } from "node:fs/promises";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import * as validation from "@/lib/ai/documents/validation";
import * as storage from "@/lib/ai/documents/storage";
import * as extraction from "@/lib/ai/documents/extract";
let root: string | undefined;
afterEach(async () => { vi.unstubAllEnvs(); if (root) await rm(root, { recursive: true, force: true }); root = undefined; });
const upload = (name = "notes.txt", text = "TX1 HPA Low Output Fault", type = "text/plain") => {
  const bytes = new TextEncoder().encode(text);
  return { name, type, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer as ArrayBuffer };
};
it("stores generated keys and extracts text/markdown with verified identity", async () => {
  expect(validation?.validateUploads).toBeTypeOf("function");
  expect(storage?.saveDocuments).toBeTypeOf("function");
  expect(extraction?.extractDocuments).toBeTypeOf("function");
  root = await mkdtemp("/opt/data/cache/scratch/cns-ai-doc-test-"); vi.stubEnv("CNS_AI_STORAGE_DIR", root);
  const jobId = randomUUID(); const files = [upload(), upload("guide.md", "# Fault\nTX1 HPA fault", "text/markdown")];
  validation!.validateUploads(files);
  const manifests = await storage!.saveDocuments(jobId, files);
  expect(manifests).toHaveLength(2);
  expect(manifests[0]).toMatchObject({ name: "notes.txt", mimeType: "text/plain", bytes: files[0].size, sha256: createHash("sha256").update("TX1 HPA Low Output Fault").digest("hex") });
  expect(manifests[0].storageKey).not.toContain("notes.txt");
  expect((await readFile(join(root, manifests[0].storageKey))).toString()).toBe("TX1 HPA Low Output Fault");
  expect(await storage!.loadDocument(manifests[0])).toMatchObject({ id: manifests[0].id, sha256: manifests[0].sha256, segments: [{ label: "text", text: "TX1 HPA Low Output Fault" }] });
  expect(await extraction!.extractDocuments(manifests)).toHaveLength(2);
});

it("rejects invalid count, bytes, extension, MIME and unsafe filenames before writing", () => {
  const bad = [
    [Array.from({ length: 6 }, () => upload()), "count"],
    [[{ ...upload(), size: 10 * 1024 * 1024 + 1 }], "file size"],
    [[{ ...upload(), size: 10 * 1024 * 1024 }, { ...upload(), size: 10 * 1024 * 1024 }, { ...upload(), size: 10 * 1024 * 1024 }], "total size"],
    [[upload("payload.exe")], "extension"], [[upload("notes.txt", "hello", "image/png")], "mime"],
    [[upload("../../notes.txt")], "traversal"], [[upload("C:\\notes.txt")], "windows path"],
    [[{ ...upload(), size: -1 }], "negative bytes"], [[{ ...upload(), size: NaN }], "nonfinite bytes"],
  ] as const;
  for (const [files] of bad) expect(() => validation!.validateUploads([...files])).toThrow();
  expect(() => validation!.validateUploads([])).not.toThrow();
});
it("rejects forged job IDs without creating paths", async () => {
  root = await mkdtemp("/opt/data/cache/scratch/cns-ai-doc-test-"); vi.stubEnv("CNS_AI_STORAGE_DIR", root);
  await expect(storage!.saveDocuments("../escape", [upload()])).rejects.toMatchObject({ code: "INVALID_STORAGE_KEY" });
  expect(await readdir(root)).toEqual([]);
});
it("rejects actual bytes that disagree with the upload declaration and removes only its failed partial upload", async () => {
  root = await mkdtemp("/opt/data/cache/scratch/cns-ai-doc-test-"); vi.stubEnv("CNS_AI_STORAGE_DIR", root);
  const goodJob = randomUUID(); await storage!.saveDocuments(goodJob, [upload()]);
  const failedJob = randomUUID();
  await expect(storage!.saveDocuments(failedJob, [upload(), { ...upload(), size: 2 }])).rejects.toMatchObject({ code: "INVALID_UPLOAD" });
  expect(await readdir(root)).toEqual([goodJob]);
  await storage!.removeOwnJobDocuments(goodJob);
  expect(await readdir(root)).toEqual([goodJob]);
});
it("verifies stored content digest and rejects forged keys and symlink files", async () => {
  root = await mkdtemp("/opt/data/cache/scratch/cns-ai-doc-test-"); vi.stubEnv("CNS_AI_STORAGE_DIR", root);
  const [metadata] = await storage!.saveDocuments(randomUUID(), [upload()]);
  await expect(storage!.loadDocument({ ...metadata, storageKey: "../../etc/passwd" })).rejects.toMatchObject({ code: "INVALID_STORAGE_KEY" });
  await writeFile(join(root, metadata.storageKey), "modified");
  await expect(storage!.loadDocument(metadata)).rejects.toMatchObject({ code: "DOCUMENT_INTEGRITY" });
  await rm(join(root, metadata.storageKey)); await symlink("/etc/passwd", join(root, metadata.storageKey));
  await expect(storage!.loadDocument(metadata)).rejects.toThrow();
});
it("rejects non-text or oversized decoded text", async () => {
  const metadata = { id: randomUUID(), name: "notes.txt", mimeType: "text/plain", bytes: 0, sha256: "a".repeat(64), storageKey: "unused" };
  for (const bytes of [new Uint8Array([0xff, 0, 0xfe]), new TextEncoder().encode("x".repeat(120_001)), new Uint8Array([65, 0, 66]), new TextEncoder().encode("   ")]) {
    await expect(extraction!.extractDocumentBytes({ ...metadata, bytes: bytes.length }, bytes)).rejects.toThrow();
  }
});

it("extracts real PDF text by page and rejects image-only or over-page-limit PDFs", async () => {
  const { default: PDFDocument } = await import("pdfkit");
  async function pdf(pages: number, text?: string) {
    return new Promise<Buffer>((resolve) => { const doc = new PDFDocument({ autoFirstPage: false }); const chunks: Buffer[] = [];
      doc.on("data", (data: Buffer) => chunks.push(data)); doc.on("end", () => resolve(Buffer.concat(chunks)));
      for (let i = 0; i < pages; i++) { doc.addPage(); if (text) doc.text(`${text} page ${i + 1}`); } doc.end(); });
  }
  const metadata = { id: randomUUID(), name: "manual.pdf", mimeType: "application/pdf", bytes: 0, sha256: "a".repeat(64), storageKey: "unused" };
  const real = await pdf(2, "TX1 HPA fault");
  const result = await extraction!.extractDocumentBytes({ ...metadata, bytes: real.length }, real);
  expect(result.segments).toHaveLength(2); expect(result.segments[0]).toMatchObject({ label: "page 1" });
  expect(result.segments[0].text).toContain("TX1 HPA fault");
  for (const bytes of [await pdf(1), await pdf(201, "fault"), new TextEncoder().encode("not PDF")]) {
    await expect(extraction!.extractDocumentBytes({ ...metadata, bytes: bytes.length }, bytes)).rejects.toThrow();
  }
});
it("extracts DOCX raw text only after archive guards and rejects macros, external relationships and zip bombs", async () => {
  const { zipSync, strToU8 } = await import("fflate");
  const base = { "[Content_Types].xml": strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    "word/document.xml": strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>TX1 HPA fault</w:t></w:r></w:p></w:body></w:document>') };
  const metadata = { id: randomUUID(), name: "manual.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: 0, sha256: "a".repeat(64), storageKey: "unused" };
  const valid = zipSync(base); const result = await extraction!.extractDocumentBytes({ ...metadata, bytes: valid.length }, valid);
  expect(result.segments[0]).toMatchObject({ label: "document" }); expect(result.segments[0].text).toContain("TX1 HPA fault");
  const bad = [zipSync({ ...base, "word/vbaProject.bin": strToU8("macro") }), zipSync({ ...base, "word/_rels/document.xml.rels": strToU8('<Relationships><Relationship TargetMode="External" Target="https://evil.invalid"/></Relationships>') }),
    zipSync({ ...base, "word/bomb.xml": new Uint8Array(21 * 1024 * 1024) }), zipSync({ "not-a-docx.txt": strToU8("hello") })];
  for (const bytes of bad) await expect(extraction!.extractDocumentBytes({ ...metadata, bytes: bytes.length }, bytes)).rejects.toThrow();
});

it("rejects duplicate, encrypted, path-traversing and entity-encoded external DOCX archives", async () => {
  const { zipSync, strToU8 } = await import("fflate");
  const base = { "[Content_Types].xml": strToU8('<Types/>'), "word/document.xml": strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>HPA Fault</w:t></w:r></w:p></w:body></w:document>') };
  const metadata = { id: randomUUID(), name: "manual.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: 0, sha256: "a".repeat(64), storageKey: "unused" };
  const encodedExternal = zipSync({ ...base, "word/_rels/document.xml.rels": strToU8('<Relationships><Relationship TargetMode="Ext&#101;rnal" Target="&#104;ttps://evil.invalid"/></Relationships>') });
  const encrypted = zipSync(base); const view = new DataView(encrypted.buffer, encrypted.byteOffset, encrypted.byteLength);
  // Encryption flag in the local header and central directory must fail closed.
  view.setUint16(6, view.getUint16(6, true) | 1, true);
  for (let i = 0; i + 10 < encrypted.length; i++) if (view.getUint32(i, true) === 0x02014b50) view.setUint16(i + 8, view.getUint16(i + 8, true) | 1, true);
  for (const bytes of [encodedExternal, encrypted, zipSync({ ...base, "../escape.xml": strToU8("bad") })]) {
    await expect(extraction!.extractDocumentBytes({ ...metadata, bytes: bytes.length }, bytes)).rejects.toThrow();
  }
});
it("rejects byte-identical files whose digest metadata was forged", async () => {
  root = await mkdtemp("/opt/data/cache/scratch/cns-ai-doc-test-"); vi.stubEnv("CNS_AI_STORAGE_DIR", root);
  const [metadata] = await storage!.saveDocuments(randomUUID(), [upload()]);
  await expect(storage!.loadDocument({ ...metadata, sha256: "0".repeat(64) })).rejects.toMatchObject({ code: "DOCUMENT_INTEGRITY" });
});
it("supports cancellation without reading document bytes", async () => {
  await expect(extraction!.extractDocuments([{ id: "bad", name: "x.txt", mimeType: "text/plain", bytes: 1, sha256: "a".repeat(64), storageKey: "bad" }], AbortSignal.abort())).rejects.toMatchObject({ code: "CANCELLED" });
});

it("rejects forged DOCX uncompressed sizes rather than accepting truncated archive contents", async () => {
  const { zipSync, strToU8 } = await import("fflate");
  const zip = zipSync({ "[Content_Types].xml": strToU8("<Types/>"), "word/document.xml": strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>' + "x".repeat(2000000) + '</w:t></w:r></w:p></w:body></w:document>') });
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  for (let i = 0; i + 46 < zip.length; i++) if (view.getUint32(i, true) === 0x02014b50) view.setUint32(i + 24, 8, true);
  await expect(extraction!.extractDocumentBytes({ id: randomUUID(), name: "fake.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: zip.length, sha256: "a".repeat(64), storageKey: "unused" }, zip)).rejects.toThrow();
});


const docxParts = () => ({
  "[Content_Types].xml": Buffer.from(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`),
  "word/document.xml": Buffer.from(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>HPA Fault</w:t></w:r></w:p></w:body></w:document>`),
});
function docxDirectory(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const end = zip.length - 22;
  let offset = view.getUint32(end + 16, true);
  const entries: { central: number; local: number; name: string }[] = [];
  for (let i = 0; i < view.getUint16(end + 10, true); i++) {
    entries.push({ central: offset, local: view.getUint32(offset + 42, true), name: new TextDecoder().decode(zip.subarray(offset + 46, offset + 46 + view.getUint16(offset + 28, true))) });
    offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  return { view, end, entries };
}
function extractDocx(zip: Uint8Array) {
  return extraction.extractDocumentBytes({ id: randomUUID(), name: "manual.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: zip.length, sha256: "a".repeat(64), storageKey: "unused" }, zip);
}

it("rejects XML-node amplification before constructing Mammoth's document tree", async () => {
  const { zipSync } = await import("fflate");
  const parts = docxParts();
  parts["word/document.xml"] = Buffer.from(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${"<w:p/>".repeat(30_000)}<w:p><w:r><w:t>HPA Fault</w:t></w:r></w:p></w:body></w:document>`);
  const zip = zipSync(parts, { level: 0 });
  expect(zip.length).toBeLessThan(validation.DOCUMENT_LIMITS.fileBytes);
  await expect(extractDocx(zip)).rejects.toMatchObject({ code: "INVALID_DOCUMENT", message: expect.stringContaining("XML complexity") });
});

it.each([
  ["depth", `<x>${"<x>".repeat(65)}text${"</x>".repeat(65)}</x>`],
  ["decoded entities", `<x>${"&#65;".repeat(120_001)}</x>`],
  ["DTD", '<!DOCTYPE x [<!ENTITY boom "value">]><x>&boom;</x>'],
  ["attributes", `<x ${Array.from({ length: 129 }, (_, i) => `a${i}="v"`).join(" ")}/>`],
])("rejects DOCX XML %s before conversion", async (_label, xml) => {
  const { zipSync } = await import("fflate");
  await expect(extractDocx(zipSync({ ...docxParts(), "word/extra.xml": Buffer.from(xml) }, { level: 0 }))).rejects.toMatchObject({ code: "INVALID_DOCUMENT", message: expect.stringContaining("XML complexity") });
});

it("shares node and decoded-text budgets across every XML and relationship part", async () => {
  const { zipSync } = await import("fflate");
  for (const kind of ["nodes", "text"]) {
    const parts: Record<string, Uint8Array> = docxParts();
    for (let i = 0; i < 4; i++) parts[`word/extra${i}.${i % 2 ? "rels" : "xml"}`] = Buffer.from(`<x>${kind === "nodes" ? "<y/>".repeat(15_000) : "&#65;".repeat(31_000)}</x>`);
    await expect(extractDocx(zipSync(parts, { level: 0 }))).rejects.toMatchObject({ code: "INVALID_DOCUMENT", message: expect.stringContaining("XML complexity") });
  }
});

it("preserves ordinary DOCX paragraphs, tables, escaped text, CDATA and quoted attributes", async () => {
  const { zipSync } = await import("fflate");
  const parts = docxParts();
  parts["word/document.xml"] = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><!-- regular export --><w:body><w:p><w:r><w:t xml:space="preserve">HPA &amp; RF &lt; 3 &#x1F680;</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>TX1 &lt; TX2</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>`);
  const result = await extractDocx(zipSync({ ...parts, "word/extra.xml": Buffer.from('<x a="a > b &amp; c" b="&quot;quoted&quot;"><![CDATA[<not-a-tag/>]]></x>') }));
  expect(result.segments[0].text).toContain("HPA & RF < 3 🚀");
  expect(result.segments[0].text).toContain("TX1 < TX2");
});

it("rejects forged stored DOCX sizes even when local and central declarations agree", async () => {
  const { zipSync } = await import("fflate");
  const zip = zipSync({ ...docxParts(), "word/padding.xml": Buffer.from(`<x>${" ".repeat(8 * 1024 * 1024)}</x>`) }, { level: 0 });
  const { view, entries } = docxDirectory(zip);
  const entry = entries.find((entry) => entry.name === "word/padding.xml")!;
  view.setUint32(entry.central + 24, 8, true);
  view.setUint32(entry.local + 22, 8, true);
  await expect(extractDocx(zip)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
});


it("rejects distinct central entries that alias the same DOCX local payload", async () => {
  const { zipSync } = await import("fflate");
  const zip = zipSync({ ...docxParts(), "word/extra0.xml": Buffer.from("<x/>"), "word/extra1.xml": Buffer.from("<x/>") }, { level: 0 });
  const { view, entries } = docxDirectory(zip);
  const first = entries.find((entry) => entry.name === "word/extra0.xml")!;
  const second = entries.find((entry) => entry.name === "word/extra1.xml")!;
  view.setUint32(second.central + 42, first.local, true);
  await expect(extractDocx(zip)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
});


it.each([
  ["local name", (zip: Uint8Array) => { const { entries } = docxDirectory(zip); zip[entries[2].local + 30] ^= 1; }],
  ["local method", (zip: Uint8Array) => { const { view, entries } = docxDirectory(zip); view.setUint16(entries[2].local + 8, 8, true); }],
  ["local flags", (zip: Uint8Array) => { const { view, entries } = docxDirectory(zip); view.setUint16(entries[2].local + 6, 0x800, true); }],
  ["local sizes", (zip: Uint8Array) => { const { view, entries } = docxDirectory(zip); view.setUint32(entries[2].local + 22, 1, true); }],
  ["CRC", (zip: Uint8Array) => { const { view, entries } = docxDirectory(zip); view.setUint32(entries[2].central + 16, 0, true); view.setUint32(entries[2].local + 14, 0, true); }],
  ["directory size", (zip: Uint8Array) => { const { view, end } = docxDirectory(zip); view.setUint32(end + 12, view.getUint32(end + 12, true) + 1, true); }],
  ["directory count", (zip: Uint8Array) => { const { view, end } = docxDirectory(zip); view.setUint16(end + 8, 2, true); view.setUint16(end + 10, 2, true); }],
  ["entry disk", (zip: Uint8Array) => { const { view, entries } = docxDirectory(zip); view.setUint16(entries[2].central + 34, 1, true); }],
  ["ZIP64 version", (zip: Uint8Array) => { const { view, entries } = docxDirectory(zip); view.setUint16(entries[2].central + 6, 45, true); view.setUint16(entries[2].local + 4, 45, true); }],
  ["truncated compressed payload", (zip: Uint8Array) => { const { view, entries } = docxDirectory(zip); view.setUint32(entries[2].central + 20, zip.length, true); view.setUint32(entries[2].central + 24, zip.length, true); view.setUint32(entries[2].local + 18, zip.length, true); view.setUint32(entries[2].local + 22, zip.length, true); }],
])("rejects inconsistent DOCX %s", async (_label, mutate) => {
  const { zipSync } = await import("fflate");
  const zip = zipSync({ ...docxParts(), "word/extra.xml": Buffer.from("<x/>") }, { level: 0 });
  mutate(zip);
  await expect(extractDocx(zip)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
});

it("bounds actual deflate output when both headers understate its size", async () => {
  const { zipSync } = await import("fflate");
  const zip = zipSync({ ...docxParts(), "word/padding.xml": Buffer.from(`<x>${" ".repeat(9 * 1024 * 1024)}</x>`) });
  const { view, entries } = docxDirectory(zip);
  const entry = entries.find((entry) => entry.name === "word/padding.xml")!;
  view.setUint32(entry.central + 24, 8, true); view.setUint32(entry.local + 22, 8, true);
  await expect(extractDocx(zip)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
});


function descriptorDocx(source: Uint8Array, signature: boolean): Uint8Array {
  const { view, end, entries } = docxDirectory(source);
  const directory = view.getUint32(end + 16, true);
  const chunks: Buffer[] = [], central = Buffer.from(source.subarray(directory, end));
  let offset = 0;
  for (const entry of entries) {
    const length = 30 + view.getUint16(entry.local + 26, true) + view.getUint16(entry.local + 28, true) + view.getUint32(entry.central + 20, true);
    const local = Buffer.from(source.subarray(entry.local, entry.local + length));
    local.writeUInt16LE(local.readUInt16LE(6) | 8, 6); local.fill(0, 14, 26);
    const descriptor = Buffer.alloc(signature ? 16 : 12);
    if (signature) descriptor.writeUInt32LE(0x08074b50, 0);
    descriptor.writeUInt32LE(view.getUint32(entry.central + 16, true), signature ? 4 : 0);
    descriptor.writeUInt32LE(view.getUint32(entry.central + 20, true), signature ? 8 : 4);
    descriptor.writeUInt32LE(view.getUint32(entry.central + 24, true), signature ? 12 : 8);
    central.writeUInt16LE(central.readUInt16LE(entry.central - directory + 8) | 8, entry.central - directory + 8);
    central.writeUInt32LE(offset, entry.central - directory + 42);
    chunks.push(local, descriptor); offset += local.length + descriptor.length;
  }
  const eocd = Buffer.from(source.subarray(end)); eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, central, eocd]);
}

it.each([true, false])("extracts ordinary DOCX with streaming data descriptors (signature=%s)", async (signature) => {
  const { zipSync } = await import("fflate");
  const zip = descriptorDocx(zipSync(docxParts()), signature);
  expect((await extractDocx(zip)).segments[0].text).toBe("HPA Fault");
  const { view, entries } = docxDirectory(zip);
  const entry = entries[0], start = entry.local + 30 + view.getUint16(entry.local + 26, true) + view.getUint16(entry.local + 28, true);
  zip[start + view.getUint32(entry.central + 20, true) + (signature ? 4 : 0)] ^= 1;
  await expect(extractDocx(zip)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
});

it("rejects distinct well-formed local headers nested inside another stored payload", async () => {
  const { zipSync } = await import("fflate");
  const embedded = zipSync({ "word/inner.xml": Buffer.from("<x/>") }, { level: 0 });
  const embeddedDirectory = docxDirectory(embedded);
  const local = embedded.subarray(0, embeddedDirectory.view.getUint32(embeddedDirectory.end + 16, true));
  const zip = zipSync({ ...docxParts(), "word/outer.xml": local, "word/inner.xml": Buffer.from("<x/>") }, { level: 0 });
  const { view, entries } = docxDirectory(zip);
  const outer = entries[2], inner = entries[3];
  view.setUint32(inner.central + 42, outer.local + 30 + view.getUint16(outer.local + 26, true) + view.getUint16(outer.local + 28, true), true);
  await expect(extractDocx(zip)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
});

it("rejects the 27-entry stored-size and shared-payload aggregate-limit exploit", async () => {
  const { zipSync } = await import("fflate");
  const parts: Record<string, Uint8Array> = { ...docxParts(), "word/extra00.xml": Buffer.from(`<x>${" ".repeat(1024 * 1024)}</x>`) };
  for (let i = 1; i < 25; i++) parts[`word/extra${String(i).padStart(2, "0")}.xml`] = Buffer.from("<x/>");
  const zip = zipSync(parts, { level: 0 });
  const { view, entries } = docxDirectory(zip), shared = entries[2];
  expect(entries).toHaveLength(27);
  for (const entry of entries.slice(2)) {
    view.setUint32(entry.central + 16, view.getUint32(shared.central + 16, true), true);
    view.setUint32(entry.central + 20, view.getUint32(shared.central + 20, true), true);
    view.setUint32(entry.central + 24, 8, true);
    view.setUint32(entry.central + 42, shared.local, true);
  }
  view.setUint32(shared.local + 22, 8, true);
  await expect(extractDocx(zip)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
});

it("retains the 8 MiB part budget and checks non-XML output against the aggregate budget", async () => {
  const { zipSync } = await import("fflate");
  const atLimit = zipSync({ ...docxParts(), "word/padding.dat": new Uint8Array(8 * 1024 * 1024) }, { level: 0 });
  expect((await extractDocx(atLimit)).segments[0].text).toBe("HPA Fault");
  const overflow: Record<string, Uint8Array> = docxParts();
  // Repeated deterministic mixed bytes compress below the file cap without tripping the ratio limit.
  const mixed = Buffer.alloc(7 * 1024 * 1024); let seed = 12345;
  for (let i = 0; i < mixed.length; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; mixed[i] = seed & 3; }
  for (let i = 0; i < 3; i++) overflow[`word/part${i}.dat`] = mixed;
  const excessive = zipSync(overflow, { level: 1 });
  expect(excessive.length).toBeLessThan(validation.DOCUMENT_LIMITS.fileBytes);
  await expect(extractDocx(excessive)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
});

it.each(["ZIP64 extra", "trailing bytes", "truncated EOCD", "empty EOCD", "deflate trailing bytes"])("rejects DOCX %s", async (kind) => {
  const { zipSync } = await import("fflate");
  let zip: Uint8Array;
  if (kind === "ZIP64 extra") zip = zipSync({ ...docxParts(), "word/extra.xml": [Buffer.from("<x/>"), { extra: { 1: new Uint8Array(8) } }] });
  else if (kind === "empty EOCD") zip = new Uint8Array([0x50, 0x4b]);
  else if (kind === "trailing bytes") zip = Buffer.concat([zipSync(docxParts()), Buffer.from([0])]);
  else if (kind === "truncated EOCD") zip = zipSync(docxParts()).subarray(0, -1);
  else {
    const original = zipSync({ ...docxParts(), "word/extra.xml": Buffer.from("<x/>") });
    const originalDirectory = docxDirectory(original), originalStart = originalDirectory.view.getUint32(originalDirectory.end + 16, true);
    zip = Buffer.concat([original.subarray(0, originalStart), Buffer.from([0]), original.subarray(originalStart)]);
    const end = zip.length - 22, view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    view.setUint32(end + 16, originalStart + 1, true);
    const { entries } = docxDirectory(zip), entry = entries[2];
    view.setUint32(entry.central + 20, view.getUint32(entry.central + 20, true) + 1, true);
    view.setUint32(entry.local + 18, view.getUint32(entry.local + 18, true) + 1, true);
  }
  await expect(extractDocx(zip)).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
});
