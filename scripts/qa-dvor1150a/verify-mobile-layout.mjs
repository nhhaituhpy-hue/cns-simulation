// Headed box1 regression: native 900px geometry must scroll, not lose the left edge.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const output = process.env.DVOR_LAYOUT_OUTPUT ?? '/data/evidence/cns-dvor-config/mobile-layout';
await mkdir(output, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:9226');
const page = browser.contexts()[0].pages()[0];
const results = [];
try {
  for (const width of [1440,390,320]) {
    await page.setViewportSize({width,height:844});
    const result = await page.evaluate(() => {
      const viewport = document.querySelector('.dvor1150a-pmdt-page .pmdt-classic-viewport');
      viewport.scrollLeft = 0;
      const frame = viewport.querySelector('.dvor1150a-simulator-frame');
      const left = frame.getBoundingClientRect().left - viewport.getBoundingClientRect().left;
      const atStart = { left, client: viewport.clientWidth, scroll: viewport.scrollWidth, overflow:getComputedStyle(viewport).overflowX };
      viewport.scrollLeft = viewport.scrollWidth;
      return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,atStart,scrollLeft:viewport.scrollLeft,frameRight:frame.getBoundingClientRect().right,viewportRight:viewport.getBoundingClientRect().right,fontSize:getComputedStyle(document.querySelector('.pmdt-classic-window')).fontSize};
    });
    results.push(result);
    assert(result.atStart.left>=-1,`Native left controls clipped at ${width}px: ${result.atStart.left}`);
    if(width<900){assert(['auto','scroll'].includes(result.atStart.overflow),'Native viewport owns horizontal scrolling');assert(result.scrollLeft>0,'Rightmost controls must be reachable');assert(result.frameRight<=result.viewportRight+1,'Can reach rightmost native column');}
    assert.equal(result.fontSize,'11px','Do not shrink native controls');
  }
  await writeFile(output+'/results.json',JSON.stringify({passed:true,results},null,2));
  console.log(JSON.stringify({passed:true,results}));
} catch(error){await writeFile(output+'/results.json',JSON.stringify({passed:false,error:String(error),results},null,2));throw error;}
finally {await browser.close();}
