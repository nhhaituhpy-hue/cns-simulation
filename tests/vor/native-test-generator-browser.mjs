// Box1 only: PATH=/data/tools/node24/bin:$PATH DISPLAY=:1 node tests/vor/native-test-generator-browser.mjs
// Real PMDT controls/store/CSS; synthetic fixture, NOT production auth/routing.
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const output = process.env.DVOR_TG_QA_OUTPUT ?? "/data/evidence/cns-dvor-config/tg-browser";
await mkdir(output, { recursive: true });
const bundle = await build({
  entryPoints: [join(root, "scripts/qa-dvor1150a/fixture.tsx")], bundle: true,
  outfile: join(output, "app.js"), jsx: "automatic", platform: "browser", metafile: true,
  plugins: [{ name: "isolated-navigation", setup(builder) {
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: join(root, "scripts/qa-dvor1150a/navigation-shim.mjs") }));
  } }],
  loader: { ".module.css": "local-css", ".png": "dataurl", ".jpg": "dataurl", ".svg": "dataurl" },
  define: { "process.env.NODE_ENV": '"production"', "process.env.__NEXT_IMAGE_OPTS": JSON.stringify({ unoptimized: true, deviceSizes: [640, 750, 1080, 1920], imageSizes: [32, 64, 128, 256], qualities: [75], loader: "default", path: "/_next/image" }), "process.env": "{}" },
});
const css = await postcss([tailwind({ base: root, optimize: false })]).process(await readFile(join(root, "src/app/globals.css"), "utf8"), { from: join(root, "src/app/globals.css") });
await writeFile(join(output, "globals.css"), css.css);
await writeFile(join(output, "index.html"), '<!doctype html><html lang="vi" data-theme="dark"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script></html>');
const manifest = [];
for (const input of Object.keys(bundle.metafile.inputs).filter(path => !path.includes("node_modules") && !path.startsWith("<"))) manifest.push({ path: input, sha256: createHash("sha256").update(await readFile(resolve(root, input))).digest("hex") });
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const local = { "/": "index.html", "/app.js": "app.js", "/app.css": "app.css", "/globals.css": "globals.css" }[pathname];
  try {
    if (request.method !== "GET" || !local) { response.statusCode = 404; response.end(); return; }
    response.setHeader("Content-Type", ({ ".js": "text/javascript", ".css": "text/css", ".html": "text/html" })[extname(local)]);
    response.end(await readFile(join(output, local)));
  } catch { response.statusCode = 404; response.end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: false, env: { ...process.env, DISPLAY: ":1" }, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const report = { isolated: true, scope: "Actual PMDT controls, Apply, DOM and CSS; no detector effect claimed; no production auth/routing", node: process.version, headed: true, fields: [], layouts: [], errors: [], nonGetRequests: [], manifest };
page.on("pageerror", error => report.errors.push(error.message));
page.on("request", request => { if (request.method() !== "GET") report.nonGetRequests.push(request.url()); });
await context.route("**/*", route => route.request().url().startsWith(`${baseUrl}/`) && route.request().method() === "GET" ? route.continue() : route.abort());
const snap = () => page.evaluate(() => window.__DVOR1150A_QA__.snapshot());
async function open(monitor) {
  await page.locator(".pmdt-menu-root").filter({ hasText: new RegExp(`^Monitor ${monitor}$`) }).click();
  await page.getByRole("menu", { name: `Monitor ${monitor}`, exact: true }).getByRole("menuitem", { name: "Test Results", exact: true }).click();
  await page.getByRole("tab", { name: "Test Generator", exact: true }).click();
}
try {
  await page.goto(baseUrl); await page.waitForFunction(() => Boolean(window.__DVOR1150A_QA__));
  for (const monitor of [1, 2]) for (const [key, label, value] of [["identStatus", "Ident Control", "No Ident"], ["audioModulation", "Audio Modulation", 17.5], ["audioFrequency", "Audio Frequency", 1200]]) {
    await page.evaluate(() => window.__DVOR1150A_QA__.resetFixture()); await open(monitor);
    const before = await snap();
    const control = page.getByLabel(`${label} setup`, { exact: true });
    assert.equal(await control.getAttribute("data-vor-effect"), "stored-only");
    assert.match(await control.getAttribute("title"), /không phải số đo/);
    const note = page.getByRole("note", { name: "Unsupported Test Generator measurements" });
    assert(await note.isVisible()); assert.match(await note.innerText(), /Chỉ lưu cấu hình/);
    const applied = page.locator(`[data-vor-field-id="testGeneratorApplied.mon${monitor}.${key}"]`);
    const oldText = await applied.innerText();
    const numeric = page.locator('[data-vor-field-id^="testGeneratorResults."]');
    const oldNumeric = await numeric.allTextContents();
    assert.deepEqual(oldNumeric, ["359.97", "30.0", "30.1", "15.97", "9.4"]);
    if (key === "identStatus") await control.selectOption(value); else { await control.fill(String(value)); await control.blur(); }
    assert.equal(await applied.innerText(), oldText);
    assert.deepEqual((await snap()).derived, before.derived);
    await page.getByRole("button", { name: "Apply (F7)", exact: true }).click();
    await page.waitForFunction(({ key, value }) => window.__DVOR1150A_QA__.snapshot().config.monitor.testGenerator[key] === value, { key, value });
    assert.match(await applied.innerText(), new RegExp(String(value).replace(".", "\\.")));
    const after = await snap();
    for (const branch of ["monitors", "effectiveTransmitters", "testGeneratorResults", "voting"]) assert.deepEqual(after.derived[branch], before.derived[branch]);
    assert.deepEqual(await numeric.allTextContents(), oldNumeric);
    await open(monitor === 1 ? 2 : 1);
    assert.equal(await page.getByLabel(`${label} setup`, { exact: true }).getAttribute("data-vor-field-value"), String(value));
    report.fields.push({ monitor, key, status: "passed", beforeApplyUnchanged: true, appliedReadback: value, unchangedNumericResults: oldNumeric, noDetectorEffectClaimed: true });
  }
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    const note = page.getByRole("note", { name: "Unsupported Test Generator measurements" });
    await note.scrollIntoViewIfNeeded(); assert(await note.isVisible());
    const layout = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, note: document.querySelector('[role="note"][aria-label="Unsupported Test Generator measurements"]').getBoundingClientRect().toJSON() }));
    assert(layout.scroll <= viewport.width + 1);
    await page.screenshot({ path: join(output, `tg-${viewport.width}.png`), fullPage: true });
    report.layouts.push({ viewport, status: "passed", ...layout });
  }
  assert.equal(report.fields.length, 6); assert.deepEqual(report.errors, []); assert.deepEqual(report.nonGetRequests, []);
  for (const file of manifest) assert.equal(createHash("sha256").update(await readFile(resolve(root, file.path))).digest("hex"), file.sha256, `Source changed during browser run: ${file.path}`);
  console.log(JSON.stringify({ fields: report.fields, layouts: report.layouts, pageErrors: report.errors.length, nonGetRequests: report.nonGetRequests.length }));
} finally {
  await writeFile(join(output, "results.json"), JSON.stringify(report, null, 2));
  await browser.close(); await new Promise(done => server.close(done));
}
