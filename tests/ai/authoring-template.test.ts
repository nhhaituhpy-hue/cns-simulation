// @vitest-environment node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { extractDocumentBytes } from "@/lib/ai/documents/extract";
import { DOCUMENT_LIMITS } from "@/lib/ai/documents/validation";

it("ships an editable Vietnamese template that the production DOCX extractor accepts", async () => {
  const name = "mau-tai-lieu-tao-kich-ban-ai.docx";
  const bytes = await readFile(resolve("public/templates", name));
  expect(bytes.length).toBeGreaterThan(0);
  expect(bytes.length).toBeLessThanOrEqual(DOCUMENT_LIMITS.fileBytes);
  const document = await extractDocumentBytes({ id: "9cd64c3c-62fd-4e8f-bc37-0cbce22a9157", name,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), storageKey: "template-test" }, bytes);
  const text = document.segments.map(segment => segment.text).join("\n");
  for (const content of [/mẫu trống/i, /ví dụ/i, /mục tiêu/i, /nguồn/i, /trang/i, /carrier-9960/, /không phải/i]) expect(text).toMatch(content);
  for (const moduleLabel of ["DVOR 1150", "DVOR 1150A", "DME 1119A", "DVOR 220", "DME 320", "ADS-B"]) expect(text).toContain(moduleLabel);
  expect(document.segments.length).toBeGreaterThan(0);
});
