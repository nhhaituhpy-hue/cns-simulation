// Real DME 320 component/CSS/assets on loopback; no auth, DB or production mutations.
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(process.env.DME320_QA_OUTPUT ?? "/workspace/artifacts/dme320-manual/simulator-qa/browser");
const reactMode = process.env.DME320_QA_REACT_MODE ?? "production";
assert(["development", "production"].includes(reactMode), "DME320_QA_REACT_MODE must be development or production");
await mkdir(output, { recursive: true });
await build({
  stdin: { contents: 'import React from "react"; import { createRoot } from "react-dom/client"; import { Dme320BlockDiagram } from "./src/modules/operations/dme-320/dme320-block-diagram"; import { DME_320_BLOCKS } from "./src/modules/operations/dme-320/block-diagram-data"; window.__DME320_REFERENCE_CATALOG__ = DME_320_BLOCKS; createRoot(document.getElementById("root")).render(<React.StrictMode><Dme320BlockDiagram /></React.StrictMode>);', resolveDir: root, loader: "tsx" },
  bundle: true, outfile: join(output, "app.js"), jsx: "automatic", platform: "browser",
  define: { "process.env.NODE_ENV": JSON.stringify(reactMode), "process.env.__NEXT_IMAGE_OPTS": JSON.stringify({ unoptimized: true, deviceSizes: [640, 750, 1080, 1920], imageSizes: [32, 64, 128, 256], qualities: [75], loader: "default", path: "/_next/image" }), "process.env": '{}' },
});
await writeFile(join(output, "index.html"), '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DME 320 reference acceptance</title><link rel="stylesheet" href="/app.css"><style>body{margin:0;background:#061a23}*{box-sizing:border-box}</style><div id="root"></div><script src="/app.js"></script></html>');
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const name = decodeURIComponent(url.pathname === "/" ? "index.html" : url.pathname.slice(1));
    const base = ["index.html", "app.js", "app.css"].includes(name) ? output : join(root, "public");
    const path = resolve(base, name);
    if (!path.startsWith(base + sep)) { res.statusCode = 403; res.end(); return; }
    res.setHeader("Content-Type", ({ ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".webp": "image/webp" })[extname(path)] ?? "application/octet-stream");
    res.end(await readFile(path));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
let browser;
const results = [];
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.AGENT_BROWSER_EXECUTABLE_PATH || chromium.executablePath(), args: ["--no-sandbox"] });
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    const errors = [], writes = [], external = [], failedAssets = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (r.method() !== "GET") writes.push(r.url());
      if (!r.url().startsWith(`http://127.0.0.1:${server.address().port}/`)) external.push(r.url());
    });
    page.on("response", (r) => { if (r.status() >= 400) failedAssets.push({ url: r.url(), status: r.status() }); });
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: "load" });
    const catalog = await page.evaluate(() => window.__DME320_REFERENCE_CATALOG__);
    const inventory = catalog.filter((b) => b.testPoints.length || b.adjustments?.length);
    const expectedPoints = inventory.reduce((n, b) => n + b.testPoints.length, 0);
    const expectedProcedures = inventory.reduce((n, b) => n + (b.adjustments?.length ?? 0), 0);
    const expectedWaveforms = new Set(inventory.flatMap((b) => b.testPoints.flatMap((p) => p.waveforms?.map((w) => w.src) ?? [])));
    const dialog = page.getByRole("dialog");
    let verifiedPoints = 0, verifiedPanelConnectors = 0, verifiedPointerConnectors = 0, verifiedProcedures = 0;
    const decodedSources = new Set();
    let captured = false;
    async function assertDialog(point, trigger) {
      await dialog.waitFor();
      assert.equal(await dialog.evaluate((el) => el.matches(":modal")), true);
      const text = await dialog.innerText();
      assert(text.includes("không phải số đo trực tiếp"));
      assert(text.includes(point.id) && text.includes(point.label));
      assert(point.source && text.includes(point.source), `Missing source for ${point.id}`);
      if (point.instrument) assert(text.includes(point.instrument));
      if (point.nominal) assert(text.includes(point.nominal));
      if (point.tolerance) assert(text.includes(point.tolerance));
      const bounds = await dialog.boundingBox();
      assert(bounds.x >= -1 && bounds.x + bounds.width <= viewport.width + 1);
      assert(bounds.y >= -1 && bounds.y + bounds.height <= viewport.height + 1);
      assert.equal(await dialog.evaluate((el) => el.scrollWidth > el.clientWidth + 1), false);
      const choices = dialog.getByRole("group", { name: "Chọn dạng sóng tham chiếu" });
      const choiceCount = await choices.count() ? await choices.getByRole("button").count() : 1;
      for (let i = 0; i < choiceCount; i++) {
        if (await choices.count()) await choices.getByRole("button").nth(i).click();
        const images = dialog.getByRole("img");
        if (await images.count()) {
          await images.first().evaluate((img) => img.decode());
          decodedSources.add(await images.first().getAttribute("src"));
        }
      }
      if (!(point.waveforms?.length)) assert.equal(await dialog.getByRole("img").count(), 0);
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press("Tab");
        assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement) || document.activeElement === document.body), true);
      }
      if (!captured && point.waveforms?.length) {
        await page.screenshot({ path: join(output, `measurement-${viewport.width}.png`) }); captured = true;
      }
      const scroll = await dialog.evaluate((el) => { el.scrollTop = el.scrollHeight; return { top: el.scrollTop, height: el.clientHeight, total: el.scrollHeight }; });
      assert(scroll.top + scroll.height >= scroll.total - 1);
      await page.keyboard.press("Escape"); await page.locator("dialog").waitFor({ state: "detached" });
      assert.equal(await trigger.evaluate((el) => document.activeElement === el), true);
    }
    for (const block of inventory) {
      const hotspot = block.cabinetHotspots[0];
      if (hotspot) {
        await page.getByRole("tab", { name: hotspot.surface === "rear" ? "Rear Cabinet Rev. A" : "Front Cabinet", exact: true }).click();
        await page.locator(`[data-hotspot-id="${hotspot.id}"]`).click();
      } else {
        const occurrence = block.diagramOccurrences.find((o) => o.componentId.startsWith("overview-"));
        assert(occurrence, `Inventory block ${block.id} requires a selectable occurrence`);
        await page.getByRole("tab", { name: "Tổng thể", exact: true }).click();
        await page.locator(`[data-component-id="${occurrence.componentId}"]`).click();
      }
      const list = page.locator('button[aria-label^="Xem tín hiệu "]').filter({ hasNot: page.locator("svg") });
      // HTML buttons belong to the list; physical panel targets are SVG groups.
      assert.equal(await list.count(), block.testPoints.length, `${block.id} list coverage`);
      for (const point of block.testPoints) {
        const trigger = page.getByRole("button", { name: `Xem tín hiệu ${point.id} ${point.label}`, exact: true });
        await trigger.focus(); await page.keyboard.press("Enter");
        await assertDialog(point, trigger); verifiedPoints++;
      }
      const panelTargets = page.locator('[data-point-id][data-connector-kind]');
      const panelCount = await panelTargets.count();
      for (let i = 0; i < panelCount; i++) {
        const trigger = panelTargets.nth(i);
        const id = await trigger.getAttribute("data-point-id");
        const point = block.testPoints.find((p) => p.id === id);
        assert(point, `${block.id} has phantom connector ${id}`);
        assert(["bnc", "test-pin", "test-jack"].includes(await trigger.getAttribute("data-connector-kind")));
        await trigger.focus(); await page.keyboard.press("Space");
        await assertDialog(point, trigger); verifiedPanelConnectors++;
        const hitTarget = trigger.locator(":scope > rect").first();
        await hitTarget.scrollIntoViewIfNeeded();
        const bounds = await hitTarget.boundingBox();
        assert(bounds && bounds.width > 0 && bounds.height > 0, `${block.id}/${id} has no pointer hit area`);
        await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await assertDialog(point, trigger); verifiedPointerConnectors++;
      }
      if (block.adjustments?.length) {
        const region = page.getByRole("region", { name: "Tham chiếu hiệu chỉnh" });
        const text = await region.innerText();
        for (const item of block.adjustments) {
          assert(text.includes(item.control) && text.includes(item.target) && text.includes(item.source)); verifiedProcedures++;
        }
        assert.equal(await region.locator("button, input, select, textarea, [role=slider]").count(), 0);
      }
    }
    assert.equal(verifiedPoints, expectedPoints);
    assert.equal(verifiedPanelConnectors, expectedPoints, "Every catalog point has one mapped physical connector");
    assert.equal(verifiedPointerConnectors, expectedPoints, "Every physical connector opens its own reference on a pointer click");
    assert.equal(verifiedProcedures, expectedProcedures);
    assert.deepEqual([...decodedSources].sort(), [...expectedWaveforms].sort());
    // Real physical backdrop click and close-button behavior, not a JSDOM event shim.
    await page.getByRole("tab", { name: "Front Cabinet", exact: true }).click();
    await page.locator('[data-hotspot-id="front-tx1-rxu"]').click();
    const rxu = catalog.find((b) => b.id === "rxu");
    const noWave = rxu.testPoints.find((p) => !p.waveforms?.length);
    const reopen = page.getByRole("button", { name: `Xem tín hiệu ${noWave.id} ${noWave.label}`, exact: true });
    await reopen.click(); await dialog.waitFor();
    await page.mouse.click(1, 1); await page.locator("dialog").waitFor({ state: "detached" });
    assert.equal(await reopen.evaluate((el) => document.activeElement === el), true);
    await reopen.click(); await dialog.waitFor();
    await dialog.getByRole("button", { name: "Đóng ×", exact: true }).click();
    await page.locator("dialog").waitFor({ state: "detached" });
    // A duplicated TX occurrence must not silently select the other physical RXU.
    await page.getByRole("tab", { name: "Tổng thể", exact: true }).click();
    for (const tx of [1, 2]) {
      await page.locator(`[data-component-id="overview-tx${tx}-rxu"]`).click();
      assert.equal(await page.locator(`[data-hotspot-id="front-tx${tx}-rxu"]`).getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator(`[data-hotspot-id="front-tx${tx === 1 ? 2 : 1}-rxu"]`).getAttribute("aria-pressed"), "false");
    }
    await page.locator('[data-hotspot-id="front-pmu-1"]').click();
    const pmuPanel = page.getByRole("group", { name: "Mặt panel PMU · POWER MONITORING UNIT", exact: true });
    assert((await pmuPanel.textContent()).includes("----"));
    assert(!(await pmuPanel.textContent()).includes("28.0"));
    assert.equal(await pmuPanel.getByRole("button").count(), 3);
    await pmuPanel.scrollIntoViewIfNeeded();
    await pmuPanel.screenshot({ path: join(output, `pmu-${viewport.width}.png`) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.deepEqual(errors, []); assert.deepEqual(writes, []); assert.deepEqual(external, []); assert.deepEqual(failedAssets, []);
    results.push({ reactMode, viewport, verifiedPoints, verifiedPanelConnectors, verifiedPointerConnectors, verifiedProcedures, decodedWaveforms: decodedSources.size, nativeDialog: true, keyboardFocusReturn: true, scrollable: true, errors, writes, external, failedAssets });
    await page.screenshot({ path: join(output, `reference-panel-${viewport.width}.png`) });
    await page.close();
  }
  await writeFile(join(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ok: true, results, output }));
} finally { await browser?.close(); await new Promise((done) => server.close(done)); }
