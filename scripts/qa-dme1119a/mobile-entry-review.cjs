// CI-only real component/CSS fixture. No website auth, routing or production QA.
// DME_QA_OUTPUT=/data/evidence/... node scripts/qa-dme1119a/mobile-entry-review.cjs
const { build } = require('esbuild');
const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { resolve, join, extname } = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const root = resolve(__dirname, '../..');
  const output = process.env.DME_QA_OUTPUT;
  assert(output, 'Set DME_QA_OUTPUT to an evidence directory outside source');
  await mkdir(output, { recursive: true });
  await build({
    stdin: { contents: `import React from 'react'; import { createRoot } from 'react-dom/client';
      import { PmdtLayout } from './src/components/dme/pmdt-layout';
      import { useDmePmdtStore } from './src/stores/dme-pmdt-store';
      window.__dme = useDmePmdtStore;
      createRoot(document.getElementById('root')).render(<div className="pmdt-classic-page dme-pmdt-page"><PmdtLayout mode="preview" scenarioAuthoringEnabled /></div>);`, resolveDir: root, loader: 'tsx' },
    bundle: true, outfile: join(output, 'app.js'), jsx: 'automatic', platform: 'browser',
    define: { 'process.env.NODE_ENV': '"production"', 'process.env.__NEXT_IMAGE_OPTS': JSON.stringify({ unoptimized: true, deviceSizes: [640, 750, 1080, 1920], imageSizes: [32, 64, 128, 256], qualities: [75], loader: 'default', path: '/_next/image' }), 'process.env': '{}' },
    plugins: [{ name: 'fixture-router', setup(builder) {
      builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'router', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export const useSearchParams = () => new URLSearchParams(); export const useRouter = () => ({ push(){}, replace(){}, back(){}, forward(){}, refresh(){}, prefetch(){} }); export const usePathname = () => '/simulator/dme-1119a';` }));
    } }],
  });
  const globals = join(root, 'src/app/globals.css');
  const css = await require('postcss')([require('@tailwindcss/postcss')({ base: root })]).process(await readFile(globals, 'utf8'), { from: globals });
  await writeFile(join(output, 'globals.css'), css.css);
  await writeFile(join(output, 'index.html'), '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script></html>');
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      const file = pathname === '/' ? join(output, 'index.html') : ['/app.js', '/app.css', '/globals.css'].includes(pathname) ? join(output, pathname.slice(1)) : join(root, 'public', pathname);
      response.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' })[extname(file)] ?? 'application/octet-stream');
      response.end(await readFile(file));
    } catch { response.statusCode = 404; response.end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const browser = await chromium.launch({ headless: false });
  const results = [];
  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      const page = await browser.newPage({ viewport });
      page.setDefaultTimeout(6000);
      const errors = [], writes = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()); });
      const result = { viewport };
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        await page.getByRole('form', { name: 'Login' }).waitFor();
        result.initial = await page.locator('.dme1119a-simulator-frame').evaluate(element => {
          const host = document.querySelector('.dme-pmdt-page');
          const rect = element.getBoundingClientRect();
          return { origin: rect.left - host.getBoundingClientRect().left + host.scrollLeft, width: rect.width, scrollLeft: host.scrollLeft };
        });
        // Negative content origin cannot be recovered by scrolling left to zero.
        assert(result.initial.origin >= 0, `Unreachable negative frame origin: ${result.initial.origin}`);
        assert.equal(result.initial.width, 900);
        result.nativeWindow = await page.locator('.dme-pmdt-window').evaluate(element => { const rect = element.getBoundingClientRect(); return { width: rect.width, height: rect.height }; });
        assert.deepEqual(result.nativeWindow, { width: 900, height: 693 });
        if (viewport.width === 1440) assert.equal(result.initial.origin, 270);
        const account = await page.evaluate(() => {
          const account = window.__dme.getState().data.securityAccounts.find(item => item.securityLevel === 3);
          if (!account) throw new Error('Missing native training fixture account');
          return { userId: account.userId, password: account.password };
        });
        await page.getByLabel('User ID', { exact: true }).fill(account.userId);
        await page.getByLabel('Password', { exact: true }).fill(account.password);
        await page.getByRole('button', { name: 'OK', exact: true }).click();
        await page.getByRole('form', { name: 'Login' }).waitFor({ state: 'detached' });
        await page.getByRole('button', { name: 'Local', exact: true }).click();
        // Ordinary horizontal wheel; no DOM positioning, force-click or state mutation.
        await page.mouse.move(viewport.width / 2, 80);
        if (viewport.width < 900) await page.mouse.wheel(-2000, -2000);
        await page.waitForTimeout(150);
        const trigger = page.getByRole('button', { name: 'Scenario Parameters', exact: true });
        result.trigger = await trigger.boundingBox();
        assert(result.trigger.x >= 0 && result.trigger.x + result.trigger.width <= viewport.width, 'Toolbar entry must be reachable at the left scroll boundary');
        await trigger.click();
        const panel = page.getByRole('complementary', { name: 'DME 1119A scenario parameters' });
        await panel.waitFor();
        await page.mouse.move(viewport.width / 2, 50);
        if (viewport.width < 900) await page.mouse.wheel(2000, 0);
        await page.waitForTimeout(150);
        result.panel = await panel.boundingBox();
        assert(result.panel.x + result.panel.width <= viewport.width + 1, 'Panel right edge must be reachable by ordinary horizontal scrolling');
        await panel.getByRole('button', { name: 'Close scenario parameters' }).click();
        await panel.waitFor({ state: 'detached' });
        await page.mouse.move(viewport.width / 2, 50);
        if (viewport.width < 900) await page.mouse.wheel(-2000, 0);
        await page.waitForTimeout(150);
        result.beforeReopen = await page.evaluate(() => { const state = window.__dme.getState(); return { authoring: state.scenarioAuthoringEnabled, login: state.loginDialogOpen, open: state.scenarioParametersOpen }; });
        await trigger.click();
        result.afterReopen = await page.evaluate(() => { const state = window.__dme.getState(); return { authoring: state.scenarioAuthoringEnabled, login: state.loginDialogOpen, open: state.scenarioParametersOpen }; });
        await panel.waitFor();
        await panel.getByRole('button', { name: 'Close scenario parameters' }).click();
        await panel.waitFor({ state: 'detached' });
        assert.deepEqual(errors, []);
        assert.deepEqual(writes, []);
        result.passed = true;
      } catch (error) {
        result.passed = false;
        result.error = error.message;
      }
      await page.screenshot({ path: join(output, `entry-${viewport.width}.png`) });
      results.push(result);
      await page.close();
    }
    await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    assert(results.every(result => result.passed), 'DME initial-entry acceptance failed');
  } finally {
    await browser.close();
    await new Promise(done => server.close(done));
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
