// @vitest-environment node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { unzipSync } from "fflate";
import { expect, it } from "vitest";
import { extractDocumentBytes } from "@/lib/ai/documents/extract";
import { DOCX_XML_LIMITS, inspectBoundedDocxXml } from "@/lib/ai/documents/bounded-xml";
import { DOCUMENT_LIMITS } from "@/lib/ai/documents/validation";
import { authoringAdapterFor } from "@/lib/ai/scenario-authoring/forms/registry";
import type { ValueSchema } from "@/lib/ai/scenario-authoring/types";

const moduleIds = ["dvor-1150", "dvor-1150a", "dme-1119a", "dvor-220", "dme-320", "ads-b"] as const;
async function extractTemplate(name: string) {
  const bytes = await readFile(resolve("public/templates", name));
  expect(bytes.length).toBeGreaterThan(0);
  expect(bytes.length).toBeLessThanOrEqual(DOCUMENT_LIMITS.fileBytes);
  const document = await extractDocumentBytes({ id: "9cd64c3c-62fd-4e8f-bc37-0cbce22a9157", name,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), storageKey: "template-test" }, bytes);
  return { bytes, text: document.segments.map(segment => segment.text).join("\n") };
}
function schemas(schema: ValueSchema): ValueSchema[] {
  return [schema, ...Object.values(schema.properties ?? {}).flatMap(schemas),
    ...(schema.item ? schemas(schema.item) : []), ...(schema.variants ?? []).flatMap(variant => schemas(variant.schema))];
}
function referenceRows(schema: ValueSchema, value: unknown): number {
  if (schema.type === "object") return 1 + Object.entries(schema.properties ?? {}).reduce((count, [key, child]) =>
    count + referenceRows(child, value && typeof value === "object" ? (value as Record<string, unknown>)[key] : null), 0);
  if (schema.type === "array") {
    const items = Array.isArray(value) && value.length ? value : [null];
    return 1 + (schema.item ? items.reduce((count, item) => count + referenceRows(schema.item!, item), 0) : 0)
      + (schema.variants ?? []).reduce((count, variant) => count + referenceRows(variant.schema, null), 0);
  }
  return 1;
}

it("preserves the existing generic editable Vietnamese writing guide", async () => {
  const { text } = await extractTemplate("mau-tai-lieu-tao-kich-ban-ai.docx");
  for (const content of [/mẫu trống/i, /ví dụ/i, /mục tiêu/i, /nguồn/i, /trang/i, /carrier-9960/, /không phải/i]) expect(text).toMatch(content);
  for (const moduleLabel of ["DVOR 1150", "DVOR 1150A", "DME 1119A", "DVOR 220", "DME 320", "ADS-B"]) expect(text).toContain(moduleLabel);
});

it.each(moduleIds)("ships a complete editable %s default reference, not offline scenario homework", async moduleId => {
  const adapter = authoringAdapterFor(moduleId);
  const form = adapter.form(adapter.createDefault());
  const baseline = form.fields.filter(field => field.baselineEligible && !field.schema.readOnly);
  expect(baseline.length).toBeGreaterThan(0);
  const { bytes, text } = await extractTemplate(`ai-scenario-${moduleId}.docx`);
  expect(text).toContain(`Mẫu thông số nền — ${form.label}`);
  for (const phrase of ["chuẩn hóa", "xác nhận", "không phải viết toàn bộ kịch bản", "có thể điền trong modal", "Giá trị tài liệu", "Nguồn/trang", "Để trống", "không phải yêu cầu", "Mặc định mô phỏng", "không phải manual"]) expect(text).toContain(phrase);
  expect(text).not.toMatch(/\bSET\b|\bRECOVER\b|API_KEY|password|securityAccounts|configuration\.|targetSensor\.|dataProfile\./);
  const expectedRows = baseline.reduce((count, field) => count + referenceRows(field.schema, field.value), 0);
  expect(text.match(/Giá trị: ______; Nguồn\/trang: ______/g)).toHaveLength(expectedRows);
  for (const field of baseline) {
    expect(text, `missing ${field.id}`).toContain(field.schema.label);
    expect(text).not.toContain(field.id);
    for (const schema of schemas(field.schema)) {
      expect(text).toContain(schema.label);
      if (schema.unit) expect(text).toContain(schema.unit);
      if (schema.min !== undefined) expect(text).toContain(`≥ ${schema.min}`);
      if (schema.max !== undefined) expect(text).toContain(`≤ ${schema.max}`);
      for (const option of schema.options ?? []) expect(text).toContain(option.label);
    }
  }
  if (moduleId === "dvor-220" || moduleId === "dme-320") {
    expect(text).toContain("Không có bước chẩn đoán hai bước kiểu SELEX");
    expect(text).not.toContain("4. Chẩn đoán hai bước");
  }
  const budget = { nodes: 0, textCharacters: 0, attributeCharacters: 0 };
  let maxPartNodes = 0;
  for (const [name, xml] of Object.entries(unzipSync(bytes))) if (/\.(xml|rels)$/i.test(name)) {
    const before = budget.nodes;
    inspectBoundedDocxXml(xml, budget, /\.rels$/i.test(name));
    maxPartNodes = Math.max(maxPartNodes, budget.nodes - before);
  }
  expect(maxPartNodes).toBeLessThan(DOCX_XML_LIMITS.partNodes);
  expect(budget.nodes).toBeLessThan(DOCX_XML_LIMITS.totalNodes);
  expect(budget.textCharacters).toBeLessThan(DOCUMENT_LIMITS.textCharacters);
  process.stdout.write(JSON.stringify({ moduleId, baselineFields: baseline.length, rows: expectedRows, bytes: bytes.length, maxPartNodes, ...budget }) + "\n");
});
