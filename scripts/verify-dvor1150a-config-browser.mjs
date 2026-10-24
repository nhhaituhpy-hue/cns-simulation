// Isolated HEADed webview acceptance; this is NOT production auth/routing QA.
// Box1: PATH=/data/tools/node24/bin:$PATH DISPLAY=:1 node scripts/verify-dvor1150a-config-browser.mjs
// --inventory-only is the bounded six-screen inventory/layout gate (plus native TG setup).
// Default additionally exercises EVERY inventoried editable field end-to-end.
// DVOR_CONFIG_QA_FIELD_PATTERN is diagnostic-only and cannot report full coverage.
// DVOR_CONFIG_QA_OUTPUT=/data/evidence/... ; --inventory-only ; --serve (loopback preview).
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join, extname, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(process.env.DVOR_CONFIG_QA_OUTPUT ?? join(process.env.HOME, ".cache/cns-dvor1150a-config-browser"));
const serveOnly = process.argv.includes("--serve");
const inventoryOnly = process.argv.includes("--inventory-only");
const keepOpen = process.argv.includes("--keep-open");
const focusPattern = process.env.DVOR_CONFIG_QA_FIELD_PATTERN ? new RegExp(process.env.DVOR_CONFIG_QA_FIELD_PATTERN) : null;
const started = Date.now();
const screens = [
  { id: "tx-nominal", group: "Transmitters", item: "Configuration", tab: "Nominal", view: "tx-config-nominal" },
  { id: "tx-offsets", group: "Transmitters", item: "Configuration", tab: "Offsets and Scale Factors", view: "tx-config-offsets" },
  { id: "monitor-general", group: "Monitors", item: "Configuration", tab: "General", view: "monitor-config-general" },
  { id: "monitor-alarm-limits", group: "Monitors", item: "Configuration", tab: "Alarm Limits", view: "monitor-alarm-limits" },
  { id: "mon1-offsets", group: "Monitor 1", item: "Offsets & Scale Factors", view: "monitor-1-offsets" },
  { id: "mon2-offsets", group: "Monitor 2", item: "Offsets & Scale Factors", view: "monitor-2-offsets" },
  // Supporting native setup view is included once the catalog exposes it;
  // otherwise its controls are inventoried explicitly as unavailable.
  { id: "mon1-test-generator", group: "Monitor 1", item: "Test Results", tab: "Test Generator", view: "monitor-test-results" },
  { id: "mon2-test-generator", group: "Monitor 2", item: "Test Results", tab: "Test Generator", view: "monitor-test-results" },
  { id: "monitor-voting", group: "RMS", item: "Configuration", tab: "General", view: "rms-config-general", boundOnly: true },
  { id: "additional-monitor-controls", generic: true, paths: ["monitor.antennas.mon2.enabled", "monitor.routing.azimuth.primary", "monitor.routing.azimuth.secondary"] },
];
const viewports = [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 568 }];
await mkdir(output, { recursive: true });
await build({ entryPoints: [join(root, "scripts/qa-dvor1150a/model.ts")], outfile: join(output, "native-model.mjs"), bundle: true, platform: "node", format: "esm", packages: "external" });
const native = await import(pathToFileURL(join(output, "native-model.mjs")));
const bundled = await build({
  entryPoints: [join(root, "scripts/qa-dvor1150a/fixture.tsx")], bundle: true,
  outfile: join(output, "app.js"), jsx: "automatic", platform: "browser", metafile: true,
  plugins: [{ name: "isolated-next-route-shim", setup(builder) {
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: join(root, "scripts/qa-dvor1150a/navigation-shim.mjs") }));
  } }],
  loader: { ".module.css": "local-css", ".png": "dataurl", ".jpg": "dataurl", ".svg": "dataurl" },
  define: { "process.env.NODE_ENV": '"production"', "process.env.__NEXT_IMAGE_OPTS": JSON.stringify({ unoptimized: true, deviceSizes: [640, 750, 1080, 1920], imageSizes: [32, 64, 128, 256], qualities: [75], loader: "default", path: "/_next/image" }), "process.env": "{}" },
});
await writeFile(join(output, "bundle-metafile.json"), JSON.stringify(bundled.metafile, null, 2));
const globalCss = await postcss([tailwind({ base: root, optimize: false })]).process(await readFile(join(root, "src/app/globals.css"), "utf8"), { from: join(root, "src/app/globals.css"), to: join(output, "globals.css") });
await writeFile(join(output, "globals.css"), globalCss.css);
await writeFile(join(output, "index.html"), '<!doctype html><html lang="vi" data-theme="dark"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>DVOR 1150A — isolated headed QA (NOT web auth)</title><link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script></html>');
const manifest = [];
for (const input of Object.keys(bundled.metafile.inputs).filter(path => !path.includes("node_modules") && !path.startsWith("<"))) {
  const path = resolve(root, input);
  manifest.push({ path: relative(root, path), sha256: createHash("sha256").update(await readFile(path)).digest("hex") });
}
for (const path of ["src/app/globals.css", "src/styles/theme-tokens.css", "src/styles/pmdt-classic.css", "src/styles/dvor1150-pmdt.css"]) manifest.push({ path, sha256: createHash("sha256").update(await readFile(join(root, path))).digest("hex") });
await writeFile(join(output, "source-manifest.json"), JSON.stringify({ node: process.version, executable: process.execPath, files: manifest }, null, 2));
async function verifySourceIdentity() {
  const changed = [];
  for (const file of manifest) {
    const currentHash = createHash("sha256").update(await readFile(join(root, file.path))).digest("hex");
    if (currentHash !== file.sha256) changed.push({ ...file, currentSha256: currentHash });
  }
  return changed;
}
const server = createServer(async (request, response) => {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405); response.end("Read-only fixture server"); return; }
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    const allowed = ["/app.js", "/app.css", "/globals.css"];
    const path = pathname === "/" ? join(output, "index.html") : allowed.includes(pathname) ? join(output, pathname.slice(1)) : resolve(root, "public", `.${pathname}`);
    if (!path.startsWith(output + sep) && !path.startsWith(join(root, "public") + sep)) throw new Error("Path outside fixture");
    response.setHeader("Content-Type", ({ ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".png": "image/png", ".svg": "image/svg+xml" })[extname(path)] ?? "application/octet-stream");
    response.end(await readFile(path));
  } catch { response.statusCode = 404; response.end(); }
});
await new Promise(done => server.listen(Number(process.env.DVOR_CONFIG_QA_PORT ?? (serveOnly ? 4176 : 0)), "127.0.0.1", done));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: false,
  env: { ...process.env, DISPLAY: ":1" }, args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1480,1120", ...(serveOnly ? ["--remote-debugging-address=127.0.0.1", "--remote-debugging-port=9226"] : [])] });
const context = await browser.newContext({ viewport: viewports[0], acceptDownloads: true, reducedMotion: "reduce" });
const page = await context.newPage();
// The real mounted PMDT timer runs on the browser clock, not a store shortcut.
// Pause between actions; timer cases advance this exact clock explicitly.
await page.clock.install({ time: new Date("2026-10-24T12:00:00Z") });
await page.clock.pauseAt(new Date("2026-10-24T12:00:02Z"));
page.setDefaultTimeout(5000);
const report = { schemaVersion: 1, isolated: true, scope: "Real PmdtLayout/components/store/CSS; synthetic initial store; no production auth, DB, routing or profile persistence tested", headed: true, executablePath: "/usr/bin/chromium", DISPLAY: ":1", baseUrl, sourceManifest: "source-manifest.json", catalog: native.dvorConfigFieldCatalog, inventory: [], fields: [], guards: [], lifecycle: [], layouts: [], regressions: [], scenario: [], gaps: [], errors: [], consoleErrors: [], nonGetRequests: [], failedRequests: [] };
page.on("pageerror", error => { report.errors.push(error.message); console.error("PAGEERROR", error.stack); });
page.on("console", message => { if (message.type() === "error") report.consoleErrors.push(message.text()); });
page.on("request", request => { if (request.method() !== "GET") report.nonGetRequests.push({ method: request.method(), url: request.url() }); });
page.on("requestfailed", request => report.failedRequests.push({ url: request.url(), failure: request.failure() }));
await context.route("**/*", async route => {
  const request = route.request();
  if (!request.url().startsWith(baseUrl + "/") || request.method() !== "GET" || new URL(request.url()).pathname.startsWith("/api/")) {
    await route.abort("blockedbyclient"); return;
  }
  await route.continue();
});
const save = async () => {
  const counts = array => Object.fromEntries([...new Set(array.map(item => item.status))].sort().map(key => [key, array.filter(item => item.status === key).length]));
  const fieldIds = report.fields.map(field => field.cellId);
  report.summary = { durationMs: Date.now() - started, catalogFields: report.catalog.length, requestedCells: report.inventory.length, nativeCatalogPathsInScreens: new Set(report.inventory.map(row => row.configPath).filter(Boolean)).size,
    uniqueCellResults: new Set(fieldIds).size, duplicateCellResults: fieldIds.filter((key, index) => fieldIds.indexOf(key) !== index), fieldCounts: counts(report.fields), guards: counts(report.guards), lifecycle: counts(report.lifecycle), layouts: counts(report.layouts), regressions: counts(report.regressions), scenario: counts(report.scenario), gapCount: report.gaps.length,
    pageErrors: report.errors.length, consoleErrors: report.consoleErrors.length, nonGetRequests: report.nonGetRequests.length };
  await writeFile(join(output, "inventory.json"), JSON.stringify({ catalog: report.catalog, cells: report.inventory, uncovered: report.uncovered ?? [], counts: report.summary }, null, 2));
  await writeFile(join(output, "results.json"), JSON.stringify(report, null, 2));
};
function get(object, path) { return path.split(".").reduce((value, key) => value?.[key], object); }
function setPath(object, path, value) { const keys = path.split("."); const parent = keys.slice(0, -1).reduce((item, key) => item[key], object); parent[keys.at(-1)] = value; }
function diffs(before, after, prefix = "") {
  if (Object.is(before, after)) return [];
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [{ path: prefix, before, after }];
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => diffs(before[key], after[key], prefix ? `${prefix}.${key}` : key));
}
function measurements(snapshot) {
  const derived = snapshot.derived;
  // A configuration echo does not prove conditional digital behaviour.
  const keyers = Object.fromEntries(Object.entries(derived.keyers ?? {}).map(([tx, keyer]) => {
    const effective = { ...keyer }; delete effective.configuration; return [tx, effective];
  }));
  return { effectiveTransmitters: derived.effectiveTransmitters, monitors: derived.monitors, groundChecks: derived.groundChecks, voting: derived.voting, integrity: derived.integrity, keyers, monitorAnnunciation: derived.monitorAnnunciation, transmitterStatus: derived.transmitterStatus, testGeneratorResults: derived.testGeneratorResults, standbyMonitors: derived.standbyMonitors };
}
async function snap() { return page.evaluate(() => window.__DVOR1150A_QA__.snapshot()); }
async function reset(options = {}) { await page.evaluate(options => window.__DVOR1150A_QA__.resetFixture(options), options); await page.locator(".pmdt-toolbar").count(); }
async function menu(group, item) {
  await page.locator(".pmdt-menu-root").filter({ hasText: new RegExp(`^${group}$`) }).click();
  await page.getByRole("menu", { name: group, exact: true }).getByRole("menuitem", { name: item, exact: true }).click();
}
async function open(screen) {
  if (typeof screen === "string") screen = screens.find(item => item.id === screen);
  const panel = page.getByRole("complementary", { name: "DVOR 1150A simulation parameters", exact: true });
  if (screen.generic) {
    if (!(await panel.count())) { await open("monitor-general"); await menu("System", "Simulation Parameters..."); }
    for (const path of screen.paths) {
      const input = panel.locator(`[data-vor-config-field-id=${JSON.stringify(path)}]`);
      if (!(await input.count())) continue;
      const details = input.locator("xpath=ancestor::details[1]");
      if (!(await details.evaluate(node => node.open))) await details.locator("summary").click();
    }
    return;
  }
  if (await panel.count()) await panel.getByRole("button", { name: "Close parameters", exact: true }).click();
  await menu(screen.group, screen.item);
  if (screen.tab && ((await snap()).activeView !== screen.view || screen.id.endsWith("test-generator"))) await page.getByRole("tab", { name: screen.tab, exact: true }).click();
  await page.waitForFunction(view => window.__DVOR1150A_QA__.snapshot().activeView === view, screen.view);
}
function selector(row) { return `${row.screen === "additional-monitor-controls" ? ".pmdt-config-panel" : "main"} [data-vor-config-field-id=${JSON.stringify(row.configPath)}]`; }
function control(row) { return page.locator(selector(row)).nth(row.pathOccurrence); }
async function mutate(locator, field, old) {
  if (await locator.getAttribute("type") === "radio" && field.type !== "boolean") {
    const selected = await locator.getAttribute("value");
    const next = selected === String(old) ? field.options.find(option => option !== String(old)) : selected;
    await page.locator(`main input[type=radio][data-vor-config-field-id=${JSON.stringify(field.id)}][value=${JSON.stringify(next)}]`).check();
    return next;
  }
  if (field.options?.length) { const option = field.options.find(option => option !== String(old)); assert(option !== undefined, "No alternative native option"); await locator.selectOption(String(option)); return field.type === "number" ? Number(option) : option; }
  if (field.type === "boolean") {
    if (await locator.getAttribute("type") === "radio" && old === true) {
      const opposite = field.id.replace(/\.(primary|secondary)$/, field.id.endsWith(".primary") ? ".secondary" : ".primary");
      const inverse = page.locator(`${locator === undefined ? "main" : (await locator.evaluate(node => node.closest('.pmdt-config-panel') ? '.pmdt-config-panel' : 'main'))} [data-vor-config-field-id=${JSON.stringify(opposite)}]`);
      assert.equal(await inverse.count(), 1, "Radio severity counterpart must be native"); await inverse.check();
    } else await locator.setChecked(!old);
    return !old;
  }
  const limit = field.id.match(/^monitor\.alarmLimits\.([^.]+)\.(alarmLow|preAlarmLow|nominal|preAlarmHigh|alarmHigh)$/);
  const initial = native.createDefaultDvor1150aConfig();
  let delta = field.id.includes("PhaseOffset") ? 10 : field.id.includes("Scale") ? -10 : 1;
  if (limit) {
    const order = ["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"];
    const neighbor = order[order.indexOf(limit[2]) + 1];
    if (neighbor) delta = Math.min(delta, (initial.monitor.alarmLimits[limit[1]][neighbor] - Number(old)) / 4);
  }
  if (field.id === "monitor.sidebandVswr.preAlarm") delta = (initial.monitor.sidebandVswr.alarm - Number(old)) / 4;
  const next = field.type === "text" ? (old === "QA1" ? "QA2" : "QA1") : Number((Number(old) + delta).toFixed(4));
  const valid = typeof next === "number" ? Math.max(field.min ?? -Infinity, Math.min(field.max ?? Infinity, next)) : next;
  assert.notEqual(valid, old, "Mutation must differ from baseline");
  await locator.fill(String(valid)); await locator.blur(); return valid;
}
async function collectInventory(screen) {
  await open(screen);
  const rows = await page.locator(screen.generic ? ".pmdt-config-panel" : "main").evaluate((main, screenOptions) => {
    const screenId = screenOptions.id;
    const controls = [...main.querySelectorAll("input,select,textarea")];
    const occurrences = {};
    const rows = controls.filter(input => (!screenOptions.boundOnly || input.hasAttribute("data-vor-config-field-id")) && (!screenOptions.paths || screenOptions.paths.includes(input.getAttribute("data-vor-config-field-id")))).map((input, index) => {
      const configPath = input.getAttribute("data-vor-config-field-id");
      const pathOccurrence = occurrences[configPath] ?? 0; occurrences[configPath] = pathOccurrence + 1;
      const container = input.closest("[data-vor-field-id]");
      return { cellId: `${screenId}:control:${index}`, screen: screenId, index, configPath, pathOccurrence,
        displayId: input.getAttribute("data-vor-field-id") ?? container?.getAttribute("data-vor-field-id"),
        label: input.getAttribute("aria-label") ?? input.closest("label")?.innerText ?? input.closest("tr")?.querySelector("th")?.innerText ?? "",
        tag: input.tagName.toLowerCase(), type: input.getAttribute("type"), value: input.value, checked: input.checked,
        disabled: input.disabled, readOnly: Boolean(input.readOnly), title: input.title,
        unit: input.closest("tr")?.lastElementChild?.textContent?.trim(), options: input.tagName === "SELECT" ? [...input.options].map(option => option.value) : undefined };
    });
    // Null/blank standby and test-generator cells are requested slots too.
    for (const cell of main.querySelectorAll("td[data-vor-field-id]")) {
      if (cell.querySelector("input,select,textarea")) continue;
      const id = cell.getAttribute("data-vor-field-id");
      if (!id?.startsWith("monitorOffsets.")) continue;
      rows.push({ cellId: `${screenId}:blank:${id}`, screen: screenId, configPath: null, displayId: id, label: cell.closest("tr")?.querySelector("th")?.innerText, value: null, disabled: true, readOnly: true, blank: true, unit: cell.closest("tr")?.lastElementChild?.textContent?.trim() });
    }
    return rows;
  }, { id: screen.id, boundOnly: screen.boundOnly, paths: screen.paths });
  const state = await snap();
  for (const row of rows) {
    if (!row.configPath && screen.id === "monitor-general" && row.displayId?.endsWith(".checked")) {
      const index = Number(row.displayId.split(".")[1]);
      const parameter = state.data.monitorConfigGeneral[index]?.parameter;
      const routeKey = { "Notch Monitor": "notchMonitor", "Sideband VSWR": "sidebandVswr" }[parameter];
      if (routeKey && !row.disabled && !row.readOnly) { row.actionPaths = [`monitor.routing.${routeKey}.primary`, `monitor.routing.${routeKey}.secondary`]; row.adapter = "native-routing-enable-checkbox"; }
    }
  }
  return rows;
}
async function domData(expected) {
  const parameters = page.getByRole("complementary", { name: "DVOR 1150A simulation parameters", exact: true });
  if (await parameters.count()) await parameters.getByRole("button", { name: "Close parameters", exact: true }).click();
  // Native data screens, not a fabricated measurement mirror in the fixture.
  const observed = {};
  await menu("Transmitters", "Data");
  for (const [collection, columns, digits] of [["txPower", ["tx1", "tx2"], index => index === 0 ? 1 : 3], ["txFrequency", ["value1", "value2"], index => index < 3 ? 4 : index < 5 ? 2 : 0], ["txVswr", ["value1", "value2"], () => 2]]) {
    const txRows = await page.locator("main [data-vor-field-id]").evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute("data-vor-field-id"), element.textContent.trim()])));
    for (const [index, row] of expected.data[collection].entries()) for (const column of columns) {
      const id = `${collection}.${index}.${column}`;
      const text = txRows[id];
      const wanted = row[column] === null ? "" : Number(row[column]).toFixed(digits(index));
      assert.equal(text, wanted, `Native DOM ${id}`); observed[id] = text;
    }
  }
  for (const tx of [1, 2]) {
    await page.getByRole("tab", { name: `Ground Check - Tx #${tx}`, exact: true }).click();
    const ground = expected.groundChecks[`tx${tx}`];
    const stationReadouts = await page.locator(".pmdt-ground-table-panel").first().locator("tbody tr").evaluateAll(rows => rows.map(row => [...row.querySelectorAll("td")].map(cell => cell.textContent.trim())));
    assert.deepEqual(stationReadouts.map(row => row[1]), ground.stationErrors.map(value => value.toFixed(2)), `TX${tx} native ground-check errors`);
    assert.equal(await page.locator(".pmdt-ground-table-panel").first().locator("tfoot td").nth(1).innerText(), ground.errorSpread.toFixed(2));
    observed[`groundCheck.tx${tx}`] = stationReadouts;
    observed[`groundGraph.tx${tx}`] = await page.locator(".pmdt-ground-trace").getAttribute("points");
    await page.getByRole("tab", { name: `Status - Tx #${tx}`, exact: true }).click();
    const statusData = expected.transmitterStatus?.[`tx${tx}`] ?? expected.data;
    for (const prefix of ["txSystemAlerts", "txCarrierPaAlerts", "txSynthesizerAlerts", "txSidebandPaAlerts"]) {
      const alerts = statusData[prefix];
      const statuses = await page.locator(`main [data-vor-field-id^="${prefix}."]`).evaluateAll(elements => elements.map(element => element.querySelector("[aria-label]")?.getAttribute("aria-label")));
      assert.deepEqual(statuses, alerts.map(alert => `${alert.label}: ${alert.indicator}`), `TX${tx} ${prefix} native status lamps`);
      observed[`txStatus.tx${tx}.${prefix}`] = statuses;
    }
  }
  await menu("Monitors", "Data");
  const integralDom = await page.locator("main [data-vor-field-id]").evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute("data-vor-field-id"), element.textContent.trim()])));
  for (const [index, row] of expected.data.integralData.entries()) for (const column of ["mon1Value", "mon2Value"]) {
    const id = `integralData.${index}.${column}`;
    const value = integralDom[id];
    assert.equal(value, String(row[column]), `Native monitor DOM ${id}`); observed[id] = value;
  }
  await page.getByRole("tab", { name: "Notch Monitor", exact: true }).click();
  const notchEnabled = expected.data.monitorConfigGeneral.some(row => row.parameter === "Notch Monitor" && (row.primary || row.secondary));
  const notchDom = await page.locator("main input[aria-label]").evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute("aria-label"), element.value])));
  for (const [index, row] of expected.data.notchData.entries()) for (const column of ["baseline", "mon1", "mon2"]) {
    const id = `notchData.${index}.${column}`; const value = notchDom[id];
    assert.equal(value, column !== "baseline" && !notchEnabled ? "" : Number(row[column]).toFixed(1), `Native notch DOM ${id}`); observed[id] = value;
  }
  await page.getByRole("tab", { name: "Sideband Antenna VSWR", exact: true }).click();
  const vswrDom = await page.locator("main [data-vor-field-id]").evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute("data-vor-field-id"), element.textContent.trim()])));
  for (const [index, value] of expected.data.vswrData.entries()) {
    const id = `vswrData.${index}`; const text = vswrDom[id];
    assert.equal(text, Number(value).toFixed(2), `Native VSWR DOM ${id}`); observed[id] = text;
  }
  for (const monitor of [1, 2]) {
    if (expected.standbyMonitors?.[`mon${monitor}`]) {
      await menu(`Monitor ${monitor}`, "Data");
      const standby = expected.standbyMonitors[`mon${monitor}`];
      for (const key of ["txPower", "txFrequencyError"]) {
        const id = `standbyData.mon${monitor}.${key}`;
        const cell = page.locator(`main [data-vor-field-id=${JSON.stringify(id)}]`);
        assert.equal(await cell.innerText(), standby.transmitter ? standby[key].toFixed(1) : "---", `Native standby ${id}`);
        observed[id] = await cell.innerText();
      }
    }
    await menu(`Monitor ${monitor}`, "Test Results");
    await page.getByRole("tab", { name: "Completed", exact: true }).click();
    const completed = await page.locator(".pmdt-monitor-test-table tbody tr").evaluateAll(rows => rows.map(row => ({ label: row.querySelector("th")?.textContent, values: [...row.querySelectorAll("td.pmdt-monitor-test-live,td.pmdt-monitor-test-limit")].map(cell => cell.textContent.trim()) })));
    assert.equal(completed.length, 5, "Native completed test table is rendered");
    const testKeys = { "30 Hz Modulation": "30HzModulation", "9960 Hz Modulation": "9960HzModulation", "9960 Hz Deviation": "9960HzDeviation", "Ident Modulation": "IdentModulation" };
    for (const row of completed.filter(row => testKeys[row.label])) {
      const integrity = expected.integrity[testKeys[row.label]]; const digits = row.label.includes("Deviation") ? 2 : 1;
      assert.deepEqual([row.values[0], row.values[2], row.values[3], row.values[5]], [integrity.lowLimitLowTest, integrity.lowLimitHighTest, integrity.highLimitLowTest, integrity.highLimitHighTest].map(value => Number.isFinite(value) ? value.toFixed(digits) : "---"), `MON${monitor} native integrity ${row.label}`);
    }
    observed[`integrity.mon${monitor}`] = completed;
    if (expected.testGeneratorResults?.[`mon${monitor}`]) {
      await page.getByRole("tab", { name: "Test Generator", exact: true }).click();
      const generator = expected.testGeneratorResults[`mon${monitor}`];
      const results = await page.locator('main [data-vor-field-id^="testGeneratorResults."]').evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute("data-vor-field-id"), element.textContent.trim()])));
      for (const key of ["azimuth", "hz30Modulation", "hz9960Modulation", "deviation", "identModulation"]) {
        const id = `testGeneratorResults.mon${monitor}.${key}`;
        assert.equal(results[id], generator[key].toFixed(key === "azimuth" || key === "deviation" ? 2 : 1), `Native certification result ${id}`);
      }
      observed[`testGenerator.mon${monitor}`] = results;
    }
  }
  observed.sidebar = await page.locator(".pmdt-sidebar").innerText();
  return observed;
}
async function targetedDomData(expected, path) {
  const parameters = page.getByRole("complementary", { name: "DVOR 1150A simulation parameters", exact: true });
  if (await parameters.count()) await parameters.getByRole("button", { name: "Close parameters", exact: true }).click();
  // One corresponding native data view per field avoids traversing every
  // readout after every edit. Full cross-screen oracle remains available.
  if (path.startsWith("monitor.testGenerator") || path.startsWith("monitor.standbyCalibration") || path.startsWith("monitor.integrity.")) return domData(expected);
  const matchTx = path.match(/^transmitters\.(tx[12])\./);
  if (matchTx && /keyerMode|keyerInputLevel|windowedKeyingInput|selfKeyOnLoss|shutdownOnLoss|restartWhenResumed|externalKeying|suppressOnShutdown|mainIdentCode|standbyIdentCode/.test(path)) {
    await menu("Transmitters", "Data");
    const actual = await page.locator('main [data-vor-field-id^="keyerData."]').evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute("data-vor-field-id"), element.textContent.trim()])));
    for (const tx of ["tx1", "tx2"]) {
      for (const [key, value] of Object.entries(expected.keyers[tx])) {
        if (key === "configuration") continue;
        if (key === "externalOutput") for (const [field, outputValue] of Object.entries(value)) assert.equal(actual[`keyerData.${tx}.externalOutput.${field}`], String(outputValue));
        else assert.equal(actual[`keyerData.${tx}.${key}`], String(value ?? "unspecified"));
      }
    }
    return actual;
  }
  if (matchTx && /carrierSidebandPhaseOffset/.test(path)) return domData(expected);
  if (matchTx && /PhaseOffset|carrierPllControl/.test(path)) {
    const tx = matchTx[1]; await menu("Transmitters", "Data");
    await page.getByRole("tab", { name: `Ground Check - Tx #${tx.slice(-1)}`, exact: true }).click();
    const actual = await page.locator(".pmdt-ground-table-panel").first().locator("tbody tr").evaluateAll(rows => rows.map(row => row.querySelectorAll("td")[1]?.textContent.trim()));
    assert.deepEqual(actual, expected.groundChecks[tx].stationErrors.map(value => value.toFixed(2)), "Native corresponding ground-check DOM");
    return { ground: actual, trace: await page.locator(".pmdt-ground-trace").getAttribute("points") };
  }
  if (matchTx && /outputPower|RfLevelScale|VswrOffset/.test(path)) {
    await menu("Transmitters", "Data");
    const actual = await page.locator('main [data-vor-field-id^="txPower."],main [data-vor-field-id^="txVswr."]').evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute("data-vor-field-id"), element.textContent.trim()])));
    for (const [collection, cols] of [["txPower", ["tx1", "tx2"]], ["txVswr", ["value1", "value2"]]]) for (const [index, row] of expected.data[collection].entries()) for (const col of cols) assert.equal(actual[`${collection}.${index}.${col}`], row[col] === null ? "" : Number(row[col]).toFixed(collection === "txPower" ? index === 0 ? 1 : 3 : 2), `Native corresponding ${collection} DOM`);
    return actual;
  }
  if (path.endsWith(".notchScale") || path === "monitor.notchTolerance") {
    await menu("Monitors", "Data"); await page.getByRole("tab", { name: "Notch Monitor", exact: true }).click();
    const actual = await page.locator('main input[aria-label^="notchData."]').evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute("aria-label"), element.value])));
    const enabled = expected.data.monitorConfigGeneral.some(row => row.parameter === "Notch Monitor" && (row.primary || row.secondary));
    for (const [index, row] of expected.data.notchData.entries()) for (const col of ["mon1", "mon2"]) assert.equal(actual[`notchData.${index}.${col}`], enabled ? Number(row[col]).toFixed(1) : "");
    return { ...actual, sidebar: await page.locator(".pmdt-sidebar").innerText() };
  }
  if (/ReturnLossOffset|monitor.sidebandVswr/.test(path)) {
    await menu("Monitors", "Data"); await page.getByRole("tab", { name: "Sideband Antenna VSWR", exact: true }).click();
    const actual = await page.locator('main [data-vor-field-id^="vswrData."]').evaluateAll(elements => elements.map(element => element.textContent.trim()));
    assert.deepEqual(actual, expected.data.vswrData.map(value => value.toFixed(2)), "Native corresponding VSWR DOM");
    return { vswr: actual, sidebar: await page.locator(".pmdt-sidebar").innerText() };
  }
  await menu("Monitors", "Data");
  const actual = await page.locator('main [data-vor-field-id^="integralData."]').evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute("data-vor-field-id"), { text: element.textContent.trim(), className: element.firstElementChild?.className }])));
  for (const [index, row] of expected.data.integralData.entries()) for (const col of ["mon1Value", "mon2Value"]) assert.equal(actual[`integralData.${index}.${col}`]?.text, String(row[col]), "Native corresponding integral DOM");
  return { ...actual, sidebar: await page.locator(".pmdt-sidebar").innerText() };
}
function scoped(field) {
  return /^transmitters\.tx[12]\.(nominal|offsets)\./.test(field.id)
    || /^monitor\.(alarmLimits|azimuthLimits|timers|sidebandVswr|notchTolerance|antennas|calibration|standbyCalibration|testGeneratorCalibration|testGenerator|routing|votingLogic|transfer)(\.|$)/.test(field.id)
    || /Monitor calibration/.test(field.section);
}
async function timerFieldTest(row) {
  const result = { cellId: row.cellId, screen: row.screen, configPath: row.configPath, displayId: row.displayId, status: "failed" };
  try {
    const timer = row.configPath.split(".").at(-1);
    const seeds = {};
    for (const mon of ["mon1", "mon2"]) {
      if (timer === "shutdown") seeds[`monitor.calibration.${mon}.hz30ModulationScale`] = 70;
      else seeds[`monitor.rawMeasurements.${mon}.identStatus`] = timer === "noIdent" ? "No Ident" : "Continuous Ident";
    }
    const initial = native.createDefaultDvor1150aConfig();
    const old = get(initial, row.configPath), value = old + 1;
    const originalDelay = initial.monitor.timers.shutdown + (timer === "shutdown" ? 0 : initial.monitor.timers[timer]);
    const check = async mutateSetting => {
      await reset({ seeds }); await open(row.screen);
      const before = await snap();
      if (mutateSetting) {
        await control(row).fill(String(value)); await control(row).blur();
        const staged = await snap();
        assert.equal(get(staged.configDraft, row.configPath), value);
        assert.deepEqual(staged.config, before.config);
        assert.deepEqual(staged.derived, before.derived);
        await page.getByRole("button", { name: "Apply (F7)", exact: true }).click();
        assert.equal(get((await snap()).config, row.configPath), value);
      }
      await page.getByRole("button", { name: "Bypass", exact: true }).click();
      assert.equal((await snap()).config.simulation.integralMonitorBypass, false);
      await page.clock.runFor(Math.round((originalDelay - 0.2) * 1000));
      assert.equal((await snap()).derived.voting.activeTransmitter, "tx1", "No protection before the native delay");
      await page.clock.runFor(400);
      const atOriginalDeadline = await snap();
      if (mutateSetting) {
        assert.equal(atOriginalDeadline.derived.voting.activeTransmitter, "tx1", "Edited timer delays actual mounted protection");
        await page.clock.runFor(1000);
      } else assert.equal(atOriginalDeadline.derived.voting.activeTransmitter, null, "Original delay expires");
      const final = await snap();
      assert.equal(final.derived.voting.activeTransmitter, null);
      assert.equal(await page.locator('.pmdt-sidebar [data-vor-field-id="transmitters.tx1.off"]').getAttribute("data-vor-field-value"), "red");
      return { atOriginalDeadline: atOriginalDeadline.derived.voting.activeTransmitter, final: final.derived.voting.activeTransmitter };
    };
    const original = await check(false), edited = await check(true);
    Object.assign(result, { status: "passed", actualHandler: "locator.fill + blur + Apply", before: old, after: value, beforeApplyUnchanged: true, applySourceVerified: true, mountedTickerVerified: true, originalDelay, editedDelay: originalDelay + 1, original, edited, nativeDataDomVerified: true });
  } catch (error) { result.error = error.stack ?? String(error); }
  return result;
}
async function fieldTest(row) {
  if (row.configPath?.startsWith("monitor.timers.")) return timerFieldTest(row);
  const field = native.dvorConfigFieldCatalog.find(field => field.id === row.configPath);
  const result = { cellId: row.cellId, screen: row.screen, configPath: row.configPath, displayId: row.displayId, status: "failed" };
  try {
    if (row.adapter === "native-routing-enable-checkbox") {
      const routeKey = row.actionPaths[0].split(".")[2];
      const seeds = {};
      if (routeKey === "notchMonitor") seeds["monitor.rawMeasurements.mon1.notchMonitor"] = 30;
      else for (let index = 0; index < 48; index++) seeds[`monitor.rawMeasurements.mon1.sidebandVswr.${index}`] = 10;
      await reset({ seeds }); await open(row.screen);
      const before = await snap(); const beforeDom = await domData(before.derived); await open(row.screen);
      const element = page.getByLabel(row.label, { exact: true }); const checked = await element.isChecked();
      await element.setChecked(!checked); const staged = await snap();
      assert.deepEqual(staged.config, before.config); assert.deepEqual(staged.derived, before.derived);
      assert.equal(get(staged.configDraft, row.actionPaths[0]), !checked);
      if (checked) assert.equal(get(staged.configDraft, row.actionPaths[1]), false);
      await page.getByRole("button", { name: "Apply (F7)", exact: true }).click();
      const applied = await snap(); const afterDom = await domData(applied.derived);
      result.status = "passed"; Object.assign(result, { actualHandler: "locator.setChecked", beforeApplyUnchanged: true, applySourceVerified: true, sourceChanges: diffs(before.config, applied.config), measurementChanges: diffs(measurements(before), measurements(applied)), domChanges: diffs(beforeDom, afterDom) });
      assert(result.measurementChanges.length > 0, "Enable checkbox changes native routing/protection");
      await open(row.screen); assert.equal(await page.getByLabel(row.label, { exact: true }).isChecked(), !checked);
      return result;
    }
    if (!row.configPath) { result.status = row.blank ? "unavailable-blank-slot" : "unavailable-readonly-source-control"; result.reason = row.blank ? "Native snapshot has null for this column; no source-backed editable value exists" : "Rendered control has no native catalog binding; disabled/readOnly value is not a functioning config edit"; return result; }
    assert(field, "Rendered config path is absent from native catalog");
    const tx = row.configPath.endsWith(".standbyIdentCode") ? "tx2" : row.configPath.match(/^transmitters\.(tx[12])\./)?.[1] ?? "tx1";
    const seeds = {};
    if (row.configPath === "monitor.votingLogic" || row.configPath === "monitor.transfer") {
      seeds["monitor.calibration.mon1.rfLevelOffset"] = 15;
      seeds["monitor.calibration.mon2.rfLevelOffset"] = row.configPath === "monitor.transfer" ? 15 : 0;
    }
    if (row.configPath === "monitor.transfer") {
      seeds["monitor.routing.rfLevel.primary"] = false; seeds["monitor.routing.rfLevel.secondary"] = true;
    }
    if (row.configPath === "monitor.integrity.enabled") { seeds["monitor.calibration.mon1.hz30ModulationScale"] = 70; }
    const routing = row.configPath.match(/^monitor\.routing\.([^.]+)\.(primary|secondary)$/);
    if (routing) {
      // Primary/Secondary is severity classification, never MON1/MON2 identity.
      const parameter = routing[1]; const mon = "mon1";
      const alarmSeed = { azimuth: ["azimuth", 50], hz30Modulation: ["hz30Modulation", 0], hz9960Modulation: ["hz9960Modulation", 0], deviation: ["deviation", 0], rfLevel: ["rfLevel", -50], identModulation: ["identModulation", 0], identStatus: ["identStatus", "No Ident"], identCode: ["identCode", ""], txFrequencyError: ["txFrequencyError", 100], notchMonitor: ["notchMonitor", 30] }[parameter];
      if (alarmSeed) seeds[`monitor.rawMeasurements.${mon}.${alarmSeed[0]}`] = alarmSeed[1];
      if (parameter === "txPower") seeds[`monitor.calibration.${mon}.txPowerScale`] = 0;
      if (parameter === "sidebandVswr") for (let index = 0; index < 48; index++) seeds[`monitor.rawMeasurements.${mon}.sidebandVswr.${index}`] = 10;
    }
    // Threshold fields need an observable near-boundary initial condition,
    // not the normal snapshot far from either alarm limit. Solve only the
    // existing pure native model; no new RF equation is introduced by QA.
    const threshold = row.configPath.match(/^monitor\.alarmLimits\.([^.]+)\.(alarmLow|preAlarmLow|preAlarmHigh|alarmHigh)$/);
    if (threshold) {
      const [parameter, boundary] = threshold.slice(1);
      const initial = native.createDefaultDvor1150aConfig();
      const order = ["alarmLow", "preAlarmLow", "nominal", "preAlarmHigh", "alarmHigh"];
      const nextBoundary = order[order.indexOf(boundary) + 1];
      const delta = nextBoundary ? Math.min(1, (initial.monitor.alarmLimits[parameter][nextBoundary] - get(initial, row.configPath)) / 4) : 1;
      const wanted = get(initial, row.configPath) + delta / 2;
      if (parameter === "txPower" || parameter === "txFrequencyError") {
        const key = parameter === "txPower" ? "txPowerScale" : "txFrequencyErrorOffset";
        const measured = native.buildDvor1150aSnapshot(initial).monitors.mon1.parameters[parameter].value;
        seeds[`monitor.calibration.mon1.${key}`] = parameter === "txPower"
          ? initial.monitor.calibration.mon1.txPowerScale * wanted / measured
          : get(initial, `monitor.calibration.mon1.${key}`) + wanted - measured;
      } else {
        const rawPath = `monitor.rawMeasurements.mon1.${parameter}`;
        const baseRaw = get(initial, rawPath);
        const base = native.buildDvor1150aSnapshot(initial).monitors.mon1.parameters[parameter].value;
        const probe = structuredClone(initial); setPath(probe, rawPath, baseRaw + 1);
        const gain = native.buildDvor1150aSnapshot(probe).monitors.mon1.parameters[parameter].value - base;
        assert.notEqual(gain, 0, `Threshold ${boundary} has a native stimulus`);
        seeds[rawPath] = baseRaw + (wanted - base) / gain;
      }
    }
    if (row.configPath.startsWith("monitor.azimuthLimits.")) {
      const initial = native.createDefaultDvor1150aConfig();
      const wanted = get(initial, row.configPath) + 0.5;
      const current = native.buildDvor1150aSnapshot(initial).monitors.mon1.parameters.azimuth.value;
      seeds["monitor.rawMeasurements.mon1.azimuth"] = initial.monitor.rawMeasurements.mon1.azimuth + initial.monitor.antennas.mon1.azimuthAngle + wanted - current;
    }
    if (row.configPath === "monitor.notchTolerance") {
      const initial = native.createDefaultDvor1150aConfig();
      const base = native.buildDvor1150aSnapshot(initial).data.notchData;
      const wanted = initial.monitor.notchTolerance + 0.5;
      const ratios = base.map(row => (1 + wanted / 100) * Math.max(Math.abs(row.baseline), 1) / row.mon1);
      seeds["monitor.rawMeasurements.mon1.notchMonitor"] = 100 * Math.min(...ratios);
      seeds["monitor.routing.notchMonitor.primary"] = true;
    }
    if (row.configPath.startsWith("monitor.sidebandVswr.")) {
      const initial = native.createDefaultDvor1150aConfig();
      const key = row.configPath.split(".").at(-1);
      const thresholdValue = initial.monitor.sidebandVswr[key] + (key === "preAlarm" ? (initial.monitor.sidebandVswr.alarm - initial.monitor.sidebandVswr.preAlarm) / 8 : 0.5);
      const count = initial.monitor.sidebandVswr.numberAntennasInAlarm;
      for (let index = 0; index < 48; index++) seeds[`monitor.rawMeasurements.mon1.sidebandVswr.${index}`] = key === "numberAntennasInAlarm" ? (index < count ? 10 : 1) : key === "alarm" ? (index < count ? thresholdValue : 1) : (index === 0 ? thresholdValue : 1);
    }
    if (/\.nominal\.(keyerInputLevel|windowedKeyingInput|selfKeyOnLoss|shutdownOnLoss|restartWhenResumed)$/.test(row.configPath)) {
      seeds["transmitters.tx1.nominal.keyerMode"] = "external";
      seeds["transmitters.tx2.nominal.keyerMode"] = "external";
    }
    if (row.configPath.endsWith(".suppressOnShutdown")) {
      seeds["transmitters.tx1.nominal.externalKeying"] = "Enabled";
      seeds["transmitters.tx2.nominal.externalKeying"] = "Enabled";
    }
    if (row.configPath.endsWith(".standbyIdentCode")) {
      seeds["transmitters.tx1.nominal.mainIdentCode"] = "AB"; seeds["transmitters.tx2.nominal.mainIdentCode"] = "CD";
      // Mirrored nominal mode affects the standby TX; inspect it on antenna.
    }
    if (routing?.[1] === "identCode") seeds["monitor.rawMeasurements.mon1.identCode"] = "";
    if (routing?.[1] === "notchMonitor") seeds["monitor.routing.notchMonitor.primary"] = true;
    if (routing?.[1] === "txFrequencyError") seeds["monitor.calibration.mon1.txFrequencyErrorOffset"] = 100;
    // A scale at a zero source is legitimately ineffectual. Establish a
    // non-zero synthetic initial source rather than mislabel that as a bug.
    if (row.configPath.endsWith(".voiceModulationScale")) seeds[`transmitters.${tx}.nominal.voiceModulation`] = 10;
    if (/monitor\.antennas\.mon[12]\.second(InputAttenuation|AzimuthAngle)$/.test(row.configPath)) seeds[row.configPath.replace(/second(InputAttenuation|AzimuthAngle)$/, "secondAntennaEnabled")] = true;
    const keyerObservations = /\.nominal\.(keyerMode|keyerInputLevel|windowedKeyingInput)$/.test(row.configPath)
      ? { tx1: { externalSignal: { state: "present", level: "high/open", decodedIdentCode: "EXT" } } }
      : /\.nominal\.(selfKeyOnLoss|shutdownOnLoss)$/.test(row.configPath)
        ? { tx1: { externalSignal: { state: "lost" } } }
        : row.configPath.endsWith(".restartWhenResumed")
          ? { tx1: { externalSignal: { state: "resumed", level: "low/closed" }, shutdownCause: "keying-loss" } }
          : row.configPath.endsWith(".suppressOnShutdown") ? { tx1: { shutdownCause: "other" } } : undefined;
    await reset({ activeTx: tx, keyerObservations, noOnAir: routing?.[1] === "identCode", loadTx: row.configPath.startsWith("monitor.standbyCalibration.") ? "tx2" : undefined, seeds }); await open(row.screen);
    const locator = control(row);
    assert.equal(await locator.count(), 1, "Inventory cell is still rendered");
    if (!(await locator.isEditable())) { result.status = "unavailable-native-control"; result.reason = "Native catalog path exists but its rendered control is not editable with SEC4 + Local + Bypass"; return result; }
    const before = await snap();
    const beforeDom = await targetedDomData(before.derived, row.configPath); await open(row.screen);
    const old = get(before.config, row.configPath);
    const value = await mutate(control(row), field, old);
    const staged = await snap();
    assert.deepEqual(staged.config, before.config, "Effective config changes only on Apply");
    assert.deepEqual(staged.derived, before.derived, "No measurement/state change before Apply");
    assert.equal(get(staged.configDraft, row.configPath), value, "Rendered input handler stages correct source path");
    assert(staged.configDirty, "Draft is dirty");
    const mirrors = row.screen === "tx-nominal" && row.configPath.startsWith("transmitters.tx1.") ? [row.configPath.replace("transmitters.tx1.", "transmitters.tx2.")] : [];
    for (const mirror of mirrors) assert.equal(get(staged.configDraft, mirror), value, "Common nominal control mirrors TX2");
    assert.deepEqual(await targetedDomData(staged.derived, row.configPath), beforeDom, "Native data DOM unchanged before Apply");
    await open(row.screen);
    if (row.screen === "additional-monitor-controls") await page.getByRole("button", { name: "Close parameters", exact: true }).click();
    await page.getByRole("button", { name: "Apply (F7)", exact: true }).click();
    const applied = await snap();
    assert.equal(get(applied.config, row.configPath), value, "Apply commits source config");
    assert.equal(applied.configDirty, false, "Apply clears dirty");
    const oracle = native.buildDvor1150aSnapshot(applied.config, undefined, applied.derived.mainTransmitter ?? undefined, applied.keyerObservations);
    assert.deepEqual(applied.derived, oracle, "Actual native store matches detached pure engine");
    assert.equal(get(applied.configDraft, row.configPath), value);
    const afterDom = await targetedDomData(oracle, row.configPath);
    const measurementChanges = diffs(measurements(before), measurements(applied));
    const domChanges = diffs(beforeDom, afterDom);
    // Relay requests are observable on RMS, even with maintenance Bypass.
    if ((row.configPath === "monitor.votingLogic" || row.configPath === "monitor.transfer") && !measurementChanges.length) {
      const beforeLive = structuredClone(before.config), afterLive = structuredClone(applied.config);
      beforeLive.simulation.integralMonitorBypass = false; afterLive.simulation.integralMonitorBypass = false;
      measurementChanges.push(...diffs(native.buildDvor1150aSnapshot(beforeLive).voting, native.buildDvor1150aSnapshot(afterLive).voting).map(change => ({ ...change, path: `bypassReleased.${change.path}` })));
    }
    result.status = measurementChanges.length ? (domChanges.length ? "passed" : "effect-without-native-readout") : "no-measurement-effect";
    const sourceChanges = diffs(before.config, applied.config);
    const allowedPaths = new Set([row.configPath, ...mirrors]);
    if (row.screen === "monitor-alarm-limits" && row.configPath === "monitor.antennas.mon1.secondAntennaEnabled" && sourceChanges.some(change => change.path === "monitor.antennas.mon2.secondAntennaEnabled")) {
      allowedPaths.add("monitor.antennas.mon2.secondAntennaEnabled"); result.sharedAntenna2Enable = true;
    }
    if (routing) allowedPaths.add(row.configPath.replace(/\.(primary|secondary)$/, routing[2] === "primary" ? ".secondary" : ".primary"));
    assert(sourceChanges.every(change => allowedPaths.has(change.path)), "Apply must not alter unrelated source fields/TX/MON");
    Object.assign(result, { before: old, after: value, actualHandler: field.type === "boolean" ? "locator.setChecked" : field.options ? "locator.selectOption" : "locator.fill + blur", beforeApplyUnchanged: true, applySourceVerified: true, nativeDataDomVerified: true, mirroredPaths: mirrors, measurementChanges, domChanges, sourceChanges });
    if (field.effect === "stored-only") {
      await open(row.screen);
      assert.equal(await control(row).getAttribute("data-vor-effect"), "stored-only", "Unavailable physics is exposed in native DOM metadata");
      assert.equal(await control(row).getAttribute("title"), field.effectNotice, "Native field discloses stored-only limitation");
      result.status = "stored-only-no-verified-physics"; result.reason = field.effectNotice;
    }
    if (result.status !== "passed" && !result.reason) result.reason = measurementChanges.length ? "Source/effective state changes but native measurement DOM exposes no corresponding visible effect" : "Apply persists the source field; detached native model and data DOM have no measurement/protection effect for this mutation";
    await open(row.screen);
    assert.equal(await control(row).getAttribute("data-vor-field-value"), String(value), "Rendered source control remains applied after navigation");
  } catch (error) { result.status = "failed"; result.error = error.stack ?? String(error); }
  return result;
}
try {
  await page.goto(baseUrl); await page.waitForFunction(() => Boolean(window.__DVOR1150A_QA__));
  assert.equal(await page.evaluate(() => typeof window.__DVOR1150A_QA__.setConfigValue), "undefined", "No mutation shortcut is exposed");
  console.log("HEADED_FIXTURE_READY", JSON.stringify({ baseUrl, output, display: ":1", executablePath: "/usr/bin/chromium" }));
  if (serveOnly) { await open("tx-nominal"); console.log("PREVIEW_READY", baseUrl); await new Promise(() => {}); }
  for (const screen of screens) report.inventory.push(...await collectInventory(screen));
  const inventoryPaths = new Set(report.inventory.map(row => row.configPath).filter(Boolean));
  // A common nominal UI is one cell with two distinct atomic source targets.
  for (const id of [...inventoryPaths]) if (id.startsWith("transmitters.tx1.nominal.")) inventoryPaths.add(id.replace("transmitters.tx1.", "transmitters.tx2."));
  // Antenna 2 enable is one native shared checkbox, with two atomic targets.
  if (inventoryPaths.has("monitor.antennas.mon1.secondAntennaEnabled")) inventoryPaths.add("monitor.antennas.mon2.secondAntennaEnabled");
  report.uncovered = report.catalog.filter(scoped).filter(field => !inventoryPaths.has(field.id)).map(field => {
    const phantom = /^monitor\.testGeneratorCalibration\.mon[12]\.(txPowerScale|txPowerOffset|txFrequencyErrorOffset)$/.test(field.id);
    return { ...field, status: phantom ? "unsupported-phantom-catalog-field" : "uncovered-catalog-field", reason: phantom ? "Manual Figure 3-44 has a blank Test Generator cell for power/frequency. Native blank is correct; remove/mark this phantom catalog field, never demand an editable fake measurement." : "Native catalog field in requested configuration family has no rendered binding in the inventoried native screens" };
  });
  report.gaps.push(...report.uncovered.map(field => ({ id: field.id, status: field.status, reason: field.reason })));
  await save(); console.log("INVENTORY", JSON.stringify(report.summary));
  for (const viewport of viewports) {
    for (const screen of screens) {
      // Select the actual native route at desktop, then assess its unmodified
      // responsive DOM at mobile. Negative x/overflow is a failure, not hidden
      // by scaling or QA CSS. Mobile navigation accessibility is recorded below.
      await page.setViewportSize(viewports[0]); await reset(); await open(screen);
      await page.setViewportSize(viewport);
      const layout = await page.evaluate(() => {
        const windowEl = document.querySelector(".pmdt-classic-window"); const main = document.querySelector(".pmdt-classic-main"); const page = document.documentElement;
        const rect = windowEl.getBoundingClientRect();
        const controls = [...main.querySelectorAll("input,select,button")].filter(element => element.getClientRects().length).map(element => ({ label: element.getAttribute("aria-label") ?? element.textContent?.trim(), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, fontSize: getComputedStyle(element).fontSize }));
        const scrollAncestors = []; for (let element = windowEl.parentElement; element; element = element.parentElement) scrollAncestors.push({ className: element.className, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, overflowX: getComputedStyle(element).overflowX });
        return { viewport: { width: innerWidth, height: innerHeight }, documentClientWidth: page.clientWidth, documentScrollWidth: page.scrollWidth, window: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, main: { width: main.clientWidth, scrollWidth: main.scrollWidth, overflowX: getComputedStyle(main).overflowX }, fontFamily: getComputedStyle(windowEl).fontFamily, controls, scrollAncestors };
      });
      layout.status = layout.documentScrollWidth <= viewport.width + 1 && layout.window.x >= -1 ? "passed" : "failed";
      layout.screen = screen.id;
      layout.screenshot = `${screen.id}-${viewport.width}.png`;
      await page.screenshot({ path: join(output, layout.screenshot), fullPage: true });
      // Full native screen artifact proves controls beyond the mobile crop.
      await page.locator(".pmdt-classic-window").screenshot({ path: join(output, `${screen.id}-${viewport.width}-native-window.png`) });
      report.layouts.push(layout);
      console.log("LAYOUT", screen.id, viewport.width, layout.status, layout.documentScrollWidth);
    }
    await save();
  }
  await page.setViewportSize(viewports[0]);
  for (const row of report.inventory) {
    const result = focusPattern && !focusPattern.test(row.configPath ?? row.cellId) ? { cellId: row.cellId, configPath: row.configPath, screen: row.screen, status: "not-exercised-focused-run" } : inventoryOnly ? { cellId: row.cellId, configPath: row.configPath, screen: row.screen, status: row.configPath ? "not-exercised-inventory-only" : row.blank ? "unavailable-blank-slot" : "unavailable-readonly-source-control" } : await fieldTest(row);
    report.fields.push(result); console.log("FIELD", result.cellId, result.configPath, result.status, result.error?.split("\n")[0] ?? "");
    if (!["passed", "unavailable-blank-slot"].includes(result.status)) report.gaps.push({ id: result.cellId, configPath: result.configPath, status: result.status, reason: result.reason ?? result.error });
    await save();
  }
  if (!inventoryOnly) {
    for (const profile of ["guest", "remote", "locked", "asymmetric-mirror-lock"]) for (const screen of screens) {
      const result = { profile, screen: screen.id, status: "failed" };
      try {
        await reset({ profile }); await open(screen); const before = await snap();
        const editable = page.locator(screen.generic ? '.pmdt-config-panel [data-vor-config-field-id]' : 'main [data-vor-config-field-id]');
        if (!screen.generic) assert((await editable.count()) > 0);
        for (const element of await editable.all()) assert.equal(await element.isEditable(), false, `Guard ${profile} must disable ${await element.getAttribute("data-vor-config-field-id")}`);
        await page.keyboard.press("F7"); assert.deepEqual((await snap()).config, before.config, "F7 does not bypass guard");
        const guardPanel = page.getByRole("complementary", { name: "DVOR 1150A simulation parameters", exact: true });
        if (screen.generic) await guardPanel.getByRole("button", { name: "Close parameters", exact: true }).click();
        assert.equal(await page.getByRole("button", { name: "Apply (F7)", exact: true }).isDisabled(), true);
        result.status = "passed";
      } catch (error) { result.error = error.stack; }
      report.guards.push(result); await save();
    }
    for (const screen of screens) {
      const result = { profile: "allowed", screen: screen.id, status: "failed" };
      try {
        await reset({ profile: "allowed" }); await open(screen);
        const nativeControls = page.locator(screen.generic ? '.pmdt-config-panel [data-vor-config-field-id]' : 'main [data-vor-config-field-id]');
        for (const element of await nativeControls.all()) {
          const path = await element.getAttribute("data-vor-config-field-id");
          assert.equal(await element.isEditable(), /^transmitters\.tx[12]\.nominal\.outputPower$/.test(path), `Restricted policy permits only the explicit mirrored nominal target: ${path}`);
        }
        if (screen.id === "tx-nominal") {
          const target = page.locator('main [data-vor-config-field-id="transmitters.tx1.nominal.outputPower"]');
          await target.fill("71"); await target.blur();
          assert.equal((await snap()).config.transmitters.tx1.nominal.outputPower, 70, "Allowed policy still stages");
          await page.getByRole("button", { name: "Apply (F7)", exact: true }).click();
          const applied = await snap(); assert.equal(applied.config.transmitters.tx1.nominal.outputPower, 71); assert.equal(applied.config.transmitters.tx2.nominal.outputPower, 71);
          await domData(applied.derived);
        }
        result.status = "passed";
      } catch (error) { result.error = error.stack; }
      report.guards.push(result); await save();
    }
    for (const screen of screens) {
      const result = { screen: screen.id, status: "failed" };
      try {
        await reset(); await open(screen);
        const row = report.inventory.find(row => row.screen === screen.id && row.configPath && !row.disabled);
        assert(row, "Screen has a native editable control"); const before = await snap(); const field = report.catalog.find(field => field.id === row.configPath);
        await mutate(control(row), field, get(before.config, row.configPath));
        if (!(await page.getByRole("complementary", { name: "DVOR 1150A simulation parameters", exact: true }).count())) await menu("System", "Simulation Parameters...");
        const panel = page.getByRole("complementary", { name: "DVOR 1150A simulation parameters", exact: true });
        await panel.getByRole("button", { name: "Discard", exact: true }).click();
        assert.deepEqual((await snap()).configDraft, before.config); assert.deepEqual((await snap()).derived, before.derived);
        await panel.getByRole("button", { name: "Close parameters", exact: true }).click();
        if (screen.generic) {
          await open(screen);
        }
        await mutate(control(row), field, get(before.config, row.configPath));
        if (screen.generic) await page.getByRole("button", { name: "Close parameters", exact: true }).click();
        await page.getByRole("button", { name: "Apply (F7)", exact: true }).click();
        await page.getByRole("button", { name: "Reset (F8)", exact: true }).click();
        assert.deepEqual((await snap()).config, before.config); assert.equal((await snap()).configDirty, false);
        result.status = "passed"; Object.assign(result, { actualDiscardButton: true, actualApplyButton: true, actualResetButton: true });
      } catch (error) { result.error = error.stack; }
      report.lifecycle.push(result); await save();
    }
    for (const tx of ["tx1", "tx2"]) {
      const result = { id: `scenario-configuration-target-ui-roundtrip-${tx}`, status: "failed" };
      try {
        await reset();
        await page.getByRole("button", { name: "Scenario Parameters", exact: true }).click();
        const panel = page.getByRole("complementary", { name: "DVOR 1150A scenario parameters", exact: true });
        const section = panel.getByRole("region", { name: "Success criteria editor", exact: true });
        const add = section.getByRole("button", { name: "Thêm Giá trị cấu hình bắt buộc", exact: true });
        if (!(await add.count())) {
          result.status = "unavailable-config-target-schema"; result.reason = "Native Scenario Parameters UI does not yet render typed configurationValues controls";
          report.gaps.push({ id: result.id, status: result.status, reason: result.reason });
        } else {
          const targets = [
            { fieldId: `transmitters.${tx}.offsets.outputPowerScale`, value: 85 },
            { fieldId: "monitor.routing.rfLevel.secondary", value: false },
            { fieldId: "monitor.votingLogic", value: "OR" },
          ];
          const initialConfiguration = (await snap()).scenarioDraft.configuration;
          for (const [index, target] of targets.entries()) {
            await add.click();
            await section.locator("label").filter({ hasText: new RegExp(`^Loại Giá trị cấu hình bắt buộc ${index + 1}`) }).locator("select").selectOption(target.fieldId);
            const value = section.getByLabel("Giá trị đích", { exact: true }).nth(index);
            if (typeof target.value === "boolean") await value.setChecked(target.value);
            else if (typeof target.value === "string") await value.selectOption(target.value);
            else { await value.fill(String(target.value)); await value.blur(); }
          }
          const draft = await snap();
          assert.deepEqual(draft.scenarioDraft.successCriteria.configurationValues, targets, "Typed numeric/boolean/enum controls stage exact criteria");
          assert.deepEqual(draft.scenarioDraft.configuration, initialConfiguration, "Target editing does not overwrite initial configuration");
          assert.equal(draft.scenarioDraft.configuration.transmitters[tx].offsets.outputPowerScale, native.createDefaultDvor1150aConfig().transmitters[tx].offsets.outputPowerScale, "Target editing does not overwrite initial configuration");
          const downloadPromise = page.waitForEvent("download");
          await panel.getByRole("button", { name: "Export JSON", exact: true }).click();
          const download = await downloadPromise; const exportedPath = join(output, `scenario-${tx}-export.json`); await download.saveAs(exportedPath);
          const exported = JSON.parse(await readFile(exportedPath, "utf8"));
          assert.deepEqual(exported.successCriteria.configurationValues, targets);
          const parsed = native.parseDvor1150aScenarioDefinition(exported); assert(parsed, "Real native parser accepts UI export");
          await section.getByRole("button", { name: "Xóa Giá trị cấu hình bắt buộc 1", exact: true }).click();
          assert.notDeepEqual((await snap()).scenarioDraft.successCriteria.configurationValues, targets);
          await panel.locator('input[type="file"]').setInputFiles(exportedPath);
          await page.waitForFunction(targets => JSON.stringify(window.__DVOR1150A_QA__.snapshot().scenarioDraft.successCriteria.configurationValues) === JSON.stringify(targets), targets);
          assert.deepEqual(await section.getByLabel("Giá trị đích", { exact: true }).evaluateAll(elements => elements.map(element => element.type === "checkbox" ? element.checked : element.value)), ["85", false, "OR"], "Imported target values render in actual UI");
          await page.screenshot({ path: join(output, `scenario-${tx}-roundtrip.png`), fullPage: true });
          result.status = "passed"; Object.assign(result, { targets, export: `scenario-${tx}-export.json`, nativeParserVerified: true, actualFileInputImported: true });
          await panel.getByRole("button", { name: "Close scenario parameters", exact: true }).click();
        }
      } catch (error) { result.error = error.stack; }
      report.scenario.push(result); await save();
    }
    for (const mon of ["mon1", "mon2"]) {
      const result = { id: `carrier-power-independent-of-${mon}-calibration`, status: "failed" };
      try {
        await reset(); const before = await snap(); await open(`${mon}-offsets`);
        const row = report.inventory.find(row => row.configPath === `monitor.calibration.${mon}.txPowerScale`); assert(row);
        const field = report.catalog.find(field => field.id === row.configPath);
        await mutate(control(row), field, get(before.config, row.configPath)); await page.getByRole("button", { name: "Apply (F7)", exact: true }).click();
        const applied = await snap(); assert.deepEqual(applied.data.txPower, before.data.txPower, "Transmitter Data carrier must remain independent of monitor CCA calibration; preserve its own native RF-monitor reference");
        assert.deepEqual(applied.derived.effectiveTransmitters, before.derived.effectiveTransmitters, "Monitor calibration never changes physical transmitter state");
        assert.notEqual(applied.derived.monitors[mon].parameters.txPower.value, before.derived.monitors[mon].parameters.txPower.value, "The intended MON readout must change");
        await domData(applied.derived); result.status = "passed";
      } catch (error) { result.error = error.stack; }
      report.regressions.push(result); await save();
    }
  }
  assert.equal(new Set(report.inventory.map(row => row.cellId)).size, report.inventory.length, "Inventory cell IDs deduplicated in code");
  assert.equal(new Set(report.fields.map(row => row.cellId)).size, report.fields.length, "One result per inventory cell");
  assert.equal(report.fields.length, report.inventory.length, "All inventoried slots receive a result");
  assert.deepEqual(report.errors, [], "No page errors"); assert.deepEqual(report.nonGetRequests, [], "No server writes");
  const storageKeys = await page.evaluate(() => Object.keys(localStorage)); assert.deepEqual(storageKeys, [], "No simulator profile/session persistence");
} catch (error) { report.fatal = error.stack ?? String(error); console.error("FATAL", report.fatal); }
finally {
  report.sourceChangedDuringRun = await verifySourceIdentity();
  if (report.sourceChangedDuringRun.length) report.gaps.push({ id: "source-stability", status: "source-changed-during-run", files: report.sourceChangedDuringRun.map(file => file.path), reason: "Bounded bundle evidence is valid only for source-manifest.json; rerun after integration stops changing source" });
  await save();
  const failures = report.gaps.length + report.layouts.filter(row => row.status === "failed").length + [...report.guards, ...report.lifecycle, ...report.regressions, ...report.scenario].filter(row => row.status === "failed").length + report.errors.length + (report.fatal ? 1 : 0);
  console.log("RESULT", JSON.stringify({ output, failures, ...report.summary }));
  if (failures) process.exitCode = 1;
  if (keepOpen) { console.log("KEEP_OPEN", baseUrl); await new Promise(() => {}); }
  await context.close(); await browser.close(); await new Promise(done => server.close(done));
}
