// Actual component/CSS/assets in an isolated local harness, no auth/DB or production writes.
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(process.env.DVOR220_QA_OUTPUT ?? "/workspace/artifacts/dvor220-manual/simulator-qa");
const reactMode = process.env.DVOR220_QA_REACT_MODE ?? "production";
assert(["development", "production"].includes(reactMode), "DVOR220_QA_REACT_MODE must be development or production");
await mkdir(output, { recursive: true });
await build({
  stdin: { contents: 'import React from "react"; import { createRoot } from "react-dom/client"; import { Dvor220BlockDiagram } from "./src/modules/operations/dvor-220/dvor220-block-diagram"; createRoot(document.getElementById("root")).render(<React.StrictMode><Dvor220BlockDiagram /></React.StrictMode>);', resolveDir: root, loader: "tsx" },
  bundle: true, outfile: join(output, "app.js"), jsx: "automatic", platform: "browser",
  define: { "process.env.NODE_ENV": JSON.stringify(reactMode), "process.env.__NEXT_IMAGE_OPTS": JSON.stringify({ unoptimized: true, deviceSizes: [640, 750, 1080, 1920], imageSizes: [32, 64, 128, 256], qualities: [75], loader: "default", path: "/_next/image" }), "process.env": '{}' },
});
await writeFile(join(output, "index.html"), '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DVOR 220 component acceptance</title><link rel="stylesheet" href="/app.css"><style>body{margin:0;background:#061a23}*{box-sizing:border-box}</style><div id="root"></div><script src="/app.js"></script></html>');
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const path = ["index.html", "app.js", "app.css"].includes(name) ? join(output, name) : join(root, "public", name);
    res.setHeader("Content-Type", ({ ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".webp": "image/webp" })[extname(path)] ?? "application/octet-stream");
    res.end(await readFile(path));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const browser = await chromium.launch({ headless: true, executablePath: process.env.AGENT_BROWSER_EXECUTABLE_PATH || chromium.executablePath(), args: ["--no-sandbox"] });
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [], writes = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => { if (r.method() !== "GET") writes.push(r.url()); });
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: "load" });
    await page.getByRole("button", { name: "MSG, 1A2A5", exact: true }).first().click();
    const trigger = page.getByRole("button", { name: "Xem tín hiệu TP49 Carrier Modulation Signal", exact: true }).first();
    await trigger.focus(); await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog"); await dialog.waitFor();
    assert.equal(await dialog.evaluate((el) => el.matches(":modal")), true);
    await dialog.getByText(/không phải số đo trực tiếp/).waitFor();
    await dialog.getByText(/Figure 7-12/).first().waitFor();
    await dialog.getByRole("img").first().evaluate((img) => img.decode());
    assert((await dialog.innerText()).includes("2.73 V"));
    const bounds = await dialog.boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1);
    assert(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height + 1);
    assert.equal(await dialog.evaluate((el) => el.scrollWidth > el.clientWidth + 1), false);
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement) || document.activeElement === document.body), true);
    }
    await page.screenshot({ path: join(output, `measurement-${viewport.width}.png`) });
    // A narrow screenshot shows only the top: prove the remaining content is scrollable.
    const scroll = await dialog.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      return { top: el.scrollTop, height: el.clientHeight, total: el.scrollHeight };
    });
    assert(scroll.top + scroll.height >= scroll.total - 1);
    await page.keyboard.press("Escape"); await page.locator("dialog").waitFor({ state: "detached" });
    assert.equal(await trigger.evaluate((el) => document.activeElement === el), true);
    // The unnumbered sync BNC has a semantic software ID, not an invented J/TP number.
    const syncBnc = page.getByRole("group", { name: "Mặt panel MSG", exact: true }).getByRole("button", { name: "Xem tín hiệu sync-30hz 30 Hz Sync trên panel", exact: true });
    assert.equal(await syncBnc.getAttribute("data-connector-kind"), "bnc");
    await syncBnc.focus(); await page.keyboard.press("Space"); await dialog.waitFor();
    assert((await dialog.innerText()).includes("30 Hz Sync"));
    assert((await dialog.innerText()).includes("Figure 7-11, PDF 477"));
    assert((await dialog.innerText()).includes("không ghi số hiệu J/TP"));
    assert.equal(await dialog.getByRole("img").count(), 0);
    await page.keyboard.press("Escape"); await page.locator("dialog").waitFor({ state: "detached" });
    assert.equal(await syncBnc.evaluate((el) => document.activeElement === el), true);
    // Reference mode must also work for a frequency point without fabricated scope imagery.
    await page.getByRole("button", { name: "SYN, 1A2A6", exact: true }).first().click();
    await page.getByRole("button", { name: "Xem tín hiệu J6 40 MHz MON", exact: true }).first().click();
    await dialog.waitFor(); assert((await dialog.innerText()).includes("40 MHz"));
    await page.keyboard.press("Escape"); await page.locator("dialog").waitFor({ state: "detached" });
    await page.screenshot({ path: join(output, `syn-${viewport.width}.png`) });
    await page.getByRole("button", { name: "Xem tín hiệu TP33 USB COS FREQ", exact: true }).click();
    await dialog.waitFor();
    assert((await dialog.innerText()).includes("Frequency counter"));
    assert(!(await dialog.innerText()).includes("Frequency counter / RF power sensor"));
    assert((await dialog.innerText()).includes("format unresolved"));
    assert((await dialog.innerText()).includes("tần số hiệu sideband–carrier nội bộ"));
    assert((await dialog.innerText()).includes("PDF 145 (3-53)"));
    await page.keyboard.press("Escape"); await page.locator("dialog").waitFor({ state: "detached" });
    // The rail limit and its separate location/standards provenance reach the real dialog.
    await page.getByRole("button", { name: "DC/DC, 1A2A4", exact: true }).first().click();
    await page.getByRole("button", { name: "Xem tín hiệu -15 V -15 V", exact: true }).click();
    await dialog.waitFor();
    assert((await dialog.innerText()).includes("−15.75…−14.25 VDC (±5%)"));
    assert((await dialog.innerText()).includes("Table 5-3, PDF 416 (5-2)"));
    assert((await dialog.innerText()).includes("Figure 6-4, PDF 443"));
    await page.keyboard.press("Escape"); await page.locator("dialog").waitFor({ state: "detached" });
    // Procedures stay reference-only: no hardware trim widget or engine write.
    await page.getByRole("button", { name: "PDC, 1A8A1", exact: true }).first().click();
    const procedures = page.getByRole("region", { name: "Tham chiếu hiệu chỉnh" });
    assert((await procedures.innerText()).includes("1A8A1A1VR1"));
    assert((await procedures.innerText()).includes("TX1: 30%; kiểm tra TX2: 30 ±0.5%"));
    assert((await procedures.innerText()).includes("§9.6.4, Figure 9-8, PDF 548 (9-22)"));
    assert.equal(await procedures.locator("button, input, select, textarea, [role=slider]").count(), 0);
    for (const name of ["CMA, 1A2A2", "LSB SMA, 1A2A1", "USB SMA, 1A2A3"]) {
      await page.getByRole("button", { name, exact: true }).first().click();
      const text = await procedures.innerText();
      assert(text.includes("TX Setpoint Cal. giữ nguyên RF thực ngay"));
      assert(text.includes("tự động bù giá trị setpoint"));
      assert(text.includes("đặt lại thủ công giá trị trong Transmitter Setup"));
      assert(text.includes("TX Reading Cal. chỉ đổi số đọc công suất"));
      assert(text.includes("PDF 307 (4-121)") && text.includes("PDF 310 (4-124)"));
      assert.equal(await procedures.locator("button, input, select, textarea, [role=slider]").count(), 0);
    }
    // Verify every cabinet-backed block and every independently addressable point.
    const inventory = [
      ["TSG, 1A1A2", 1], ["SCU 1, 1A1A3", 2], ["DC/DC-A 1, 1A1A8", 4],
      ["LSB SMA, 1A2A1", 2], ["CMA, 1A2A2", 1], ["USB SMA, 1A2A3", 2],
      ["DC/DC, 1A2A4", 7], ["MSG, 1A2A5", 6], ["SYN, 1A2A6", 6],
      ["MON 1, 1A2A7", 4], ["PDC, 1A8A1", 5], ["PMU 1, 1A4A1", 3],
    ];
    let verifiedPoints = 0;
    const decodedSources = new Set();
    for (const [name, expectedPoints] of inventory) {
      await page.getByRole("button", { name, exact: true }).first().click();
      const pointButtons = page.locator("button[aria-label^='Xem tín hiệu ']");
      assert.equal(await pointButtons.count(), expectedPoints, name);
      for (let index = 0; index < expectedPoints; index++) {
        await pointButtons.nth(index).click(); await dialog.waitFor();
        await dialog.getByText(/không phải số đo trực tiếp/).waitFor();
        assert((await dialog.innerText()).includes("Manual"));
        const choiceGroup = dialog.getByRole("group", { name: "Chọn dạng sóng tham chiếu" });
        const count = await choiceGroup.count() ? await choiceGroup.getByRole("button").count() : 1;
        for (let choice = 0; choice < count; choice++) {
          if (await choiceGroup.count()) await choiceGroup.getByRole("button").nth(choice).click();
          const images = dialog.getByRole("img");
          if (await images.count()) {
            await images.first().evaluate((img) => img.decode());
            decodedSources.add(await images.first().getAttribute("src"));
          }
        }
        await page.keyboard.press("Escape"); await page.locator("dialog").waitFor({ state: "detached" });
        verifiedPoints++;
      }
    }
    assert.equal(verifiedPoints, 43);
    assert.equal(decodedSources.size, 12);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    results.push({ reactMode, viewport, nativeDialog: true, sourceWaveformDecoded: true, manualReadings: true, focusReturn: true, frequencyReference: true, semanticSyncBnc: true, unresolvedSynTestPins: true, sourcedRailLimits: true, readOnlyAdjustments: true, compensatedCalibration: true, scrollableDialogContent: true, verifiedPoints, decodedWaveforms: decodedSources.size, pageErrors: errors.length, writes: writes.length });
    await page.close();
  }
  await writeFile(join(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ok: true, results, output }));
} finally { await browser.close(); await new Promise((done) => server.close(done)); }
