// Isolated browser acceptance of the real DvorBlockDiagram, without auth/DB.
// Run: node scripts/verify-sideband-browser.mjs (after playwright install chromium).
// This does not prove authenticated Next.js routing or production integration.
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(process.env.SIDEBAND_QA_OUTPUT ?? join(process.env.HOME, ".cache/cns-sideband-browser"));
await mkdir(output, { recursive: true });
await build({
  stdin: { contents: 'import React from "react"; import { createRoot } from "react-dom/client"; import { DvorBlockDiagram } from "./src/modules/devices/dvor-1150a/dvor-block-diagram"; createRoot(document.getElementById("root")).render(<DvorBlockDiagram />);', resolveDir: root, loader: "tsx" },
  bundle: true, outfile: join(output, "app.js"), jsx: "automatic", platform: "browser",
  define: { "process.env.NODE_ENV": '"production"', "process.env.__NEXT_IMAGE_OPTS": JSON.stringify({ unoptimized: true, deviceSizes: [640, 750, 1080, 1920], imageSizes: [32, 64, 128, 256], qualities: [75], loader: "default", path: "/_next/image" }), "process.env": '{}' },
});
await writeFile(join(output, "index.html"), '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sideband component acceptance</title><link rel="stylesheet" href="/app.css"><style>body{margin:0;background:#101922}*{box-sizing:border-box}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}</style><div id="root"></div><script src="/app.js"></script></html>');
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const path = pathname === "/" ? join(output, "index.html") : ["/app.js", "/app.css"].includes(pathname) ? join(output, pathname.slice(1)) : join(root, "public", pathname);
    response.setHeader("Content-Type", ({ ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".png": "image/png" })[extname(path)] ?? "application/octet-stream");
    response.end(await readFile(path));
  } catch { response.statusCode = 404; response.end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    console.log("VIEWPORT", viewport);
    const page = await browser.newPage({ viewport });
    const errors = [];
    const writes = [];
    page.on("pageerror", (error) => { errors.push(error.message); console.error("BROWSER ERROR", error.stack); });
    page.on("request", (request) => { if (request.method() !== "GET") writes.push(request.url()); });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("button", { name: "Chọn 1A4A1", exact: true }).click();
    const trigger = page.getByRole("button", { name: "Điều chỉnh R3 PWR ADJ", exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
    assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true);
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      // Chromium may briefly focus browser chrome (activeElement=body) when
      // cycling. Native modal must never focus a background page control.
      assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement) || document.activeElement === document.body), true);
    }
    await dialog.getByRole("button", { name: "Thuận chiều kim đồng hồ", exact: true }).focus();
    await page.keyboard.press("Space");
    assert.equal(await dialog.getByLabel("Công suất mô phỏng", { exact: true }).textContent(), "3.17 W");
    assert.equal(await dialog.getByTestId("screwdriver-rotation").getAttribute("transform"), "rotate(15 100 100)");
    await dialog.getByRole("heading").click();
    assert.equal(await dialog.isVisible(), true);
    const bounds = await dialog.boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width);
    assert(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height);
    const internalOverflow = await dialog.evaluate((element) => element.scrollWidth > element.clientWidth);
    assert.equal(internalOverflow, false);
    await page.screenshot({ path: join(output, `sideband-${viewport.width}.png`) });
    await page.keyboard.press("Escape");
    await page.locator("dialog").waitFor({ state: "detached" });
    assert.equal(await trigger.evaluate((element) => document.activeElement === element), true);
    await page.keyboard.press("Space");
    await dialog.waitFor();
    assert.equal(await dialog.getByLabel("Công suất mô phỏng", { exact: true }).textContent(), "3.17 W");
    await page.mouse.click(2, 2);
    await page.locator("dialog").waitFor({ state: "detached" });
    // Same physical module selected through the schematic retains its state.
    await page.getByRole("tab", { name: "Transmitter", exact: true }).click();
    await page.getByRole("button", { name: /Sideband 1 and 2, transmitter 1/ }).click();
    await trigger.click();
    assert.equal(await dialog.getByLabel("Công suất mô phỏng", { exact: true }).textContent(), "3.17 W");
    await page.keyboard.press("Escape");
    await page.locator("dialog").waitFor({ state: "detached" });
    // A different actual cabinet occurrence must remain at its own baseline.
    await page.getByRole("button", { name: "Chọn 1A4A7", exact: true }).click();
    await trigger.click();
    assert.equal(await dialog.getByLabel("Công suất mô phỏng", { exact: true }).textContent(), "3.00 W");
    await page.keyboard.press("Escape");
    await page.locator("dialog").waitFor({ state: "detached" });
    for (const id of ["R1", "R2", "R4", "R5", "R6"]) {
      await page.getByRole("button", { name: new RegExp(`^Điều chỉnh ${id} `) }).click();
      await dialog.waitFor();
      await dialog.getByRole("button", { name: "Thuận chiều kim đồng hồ", exact: true }).click();
      assert.equal(await dialog.getByLabel("Góc xoay", { exact: true }).textContent(), "15°");
      await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
      await page.locator("dialog").waitFor({ state: "detached" });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    results.push({ viewport, nativeModal: true, focusTrapAndReturn: true, keyboard: true, outsideAndEscape: true, isolatedOccurrences: true, allSixTrims: true, dialogOverflow: false, pageErrors: errors, nonGetRequests: writes });
    await page.close();
  }
  await writeFile(join(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ output, results }, null, 2));
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
