/** Export the actual native wizard, not a separate parameter/range catalog.
 * From repository root (requires installed npm dependencies):
 * node_modules/.bin/esbuild scripts/export-ai-authoring-forms.mts --bundle --platform=node --format=esm --packages=external --outfile=$TMPDIR/export-ai-authoring-forms.mjs
 * node $TMPDIR/export-ai-authoring-forms.mjs --output $TMPDIR/ai-authoring-forms.json
 * python scripts/generate-ai-authoring-templates.py --input $TMPDIR/ai-authoring-forms.json --output public/templates
 * The intermediate manifest is build input only; do not publish private definitions.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { authoringAdapterFor } from "../src/lib/ai/scenario-authoring/forms/registry";
import type { JsonValue, ValueSchema } from "../src/lib/ai/scenario-authoring/types";

const moduleIds = ["dvor-1150", "dvor-1150a", "dme-1119a", "dvor-220", "dme-320", "ads-b"] as const;
const protectedKey = /password|credential|secret|api.?key|access.?token|private.?key|securityAccounts/i;
function assertPublic(value: unknown): void {
  if (Array.isArray(value)) value.forEach(assertPublic);
  else if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
    if (protectedKey.test(key)) throw new Error(`Refusing protected field: ${key}`);
    assertPublic(child);
  }
}
function publicSchema(schema: ValueSchema): ValueSchema {
  // Descriptions may contain internal paths. User text uses labels only.
  const result = structuredClone(schema);
  result.help = "";
  if (result.properties) result.properties = Object.fromEntries(Object.entries(result.properties).map(([key, child]) => [key, publicSchema(child)]));
  if (result.item) result.item = publicSchema(result.item);
  if (result.variants) result.variants = result.variants.map(variant => ({ ...variant, schema: publicSchema(variant.schema) }));
  assertPublic(result);
  return result;
}
const { values } = parseArgs({ options: { output: { type: "string" } } });
if (!values.output) throw new Error("Usage: export-ai-authoring-forms --output MANIFEST.json");
const modules = moduleIds.map(moduleId => {
  const adapter = authoringAdapterFor(moduleId);
  const form = adapter.form(adapter.createDefault());
  const fields = form.fields.filter(field => field.baselineEligible && !field.schema.readOnly).map(field => {
    if (protectedKey.test(field.id)) throw new Error("Protected baseline field");
    const value: JsonValue = structuredClone(field.value);
    assertPublic(value);
    return { id: field.id, sectionId: field.sectionId, group: field.group, schema: publicSchema(field.schema), value };
  });
  if (!fields.length) throw new Error(`No baseline fields: ${moduleId}`);
  return { moduleId, label: form.label, sections: form.sections.map(({ id, title }) => ({ id, title })), fields };
});
const output = resolve(values.output);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ version: 1, source: "authoringAdapterFor(moduleId).form(createDefault())", modules }, null, 2) + "\n");
console.info(JSON.stringify({ output, modules: modules.map(module => ({ moduleId: module.moduleId, fields: module.fields.length })) }));
