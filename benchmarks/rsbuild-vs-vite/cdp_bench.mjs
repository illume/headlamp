// Tiny CDP-over-WebSocket driver. Pure stdlib + ws.
import { spawn } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const wsPath = process.env.WS_PATH;
if (!wsPath) { console.error('Set WS_PATH'); process.exit(2); }
const WebSocket = require(wsPath);

const targetUrl = process.argv[2];
const chromium  = process.argv[3] || '/usr/bin/chromium';

const userDir = await mkdtemp(path.join(os.tmpdir(), 'cdp-'));
const port = 9222 + Math.floor(Math.random() * 1000);
const proc = spawn(chromium, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--user-data-dir=${userDir}`, `--remote-debugging-port=${port}`,
  '--enable-precise-memory-info', '--window-size=1366,768',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
proc.stderr.on('data', () => {}); // suppress dbus noise

async function http_get(p) {
  return await new Promise((res, rej) => {
    http.get(`http://127.0.0.1:${port}${p}`, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
    }).on('error', rej);
  });
}
for (let i = 0; i < 80; i++) {
  try { await http_get('/json/version'); break; }
  catch { await new Promise(r => setTimeout(r, 100)); }
}
const newTab = JSON.parse(await new Promise((res, rej) => {
  const req = http.request({ hostname: '127.0.0.1', port, path: `/json/new?about:blank`, method: 'PUT' },
    r => { let d=''; r.on('data', c => d+=c); r.on('end', () => res(d)); });
  req.on('error', rej); req.end();
}));

const ws = new WebSocket(newTab.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const evHandlers = [];
await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
ws.on('message', msg => {
  const m = JSON.parse(msg.toString());
  if (m.id != null) { pending.get(m.id)?.(m); pending.delete(m.id); }
  else evHandlers.forEach(h => h(m));
});
function send(method, params = {}) {
  return new Promise((res, rej) => {
    const reqId = ++id;
    pending.set(reqId, m => m.error ? rej(new Error(m.error.message)) : res(m.result));
    ws.send(JSON.stringify({ id: reqId, method, params }));
  });
}

await send('Page.enable');
await send('Performance.enable');
await send('Runtime.enable');
await send('Network.enable');

let tStart = Date.now();
let tDcl = null, tLoad = null, lastIdleAt = null, tNetIdle = null;
let netInflight = 0;
let bytesRecv = 0, requests = 0, byMime = {};
let fcp = null, lcp = null;

evHandlers.push(ev => {
  if (ev.method === 'Page.domContentEventFired') tDcl = Date.now();
  else if (ev.method === 'Page.loadEventFired') tLoad = Date.now();
  else if (ev.method === 'Network.requestWillBeSent') { netInflight++; requests++; }
  else if (ev.method === 'Network.responseReceived') {
    const m = ev.params.response.mimeType || 'other';
    byMime[m] = (byMime[m] || 0) + 1;
  }
  else if (ev.method === 'Network.loadingFinished' || ev.method === 'Network.loadingFailed') {
    netInflight = Math.max(0, netInflight - 1);
    bytesRecv += ev.params?.encodedDataLength || 0;
    if (netInflight === 0) lastIdleAt = Date.now();
  }
});

// Optional warmup pass. Vite's storybook builder reports "Storybook ready"
// while its `optimizeDeps` crawler is still running; the first navigation
// then races with dep optimization, vite serves stale dep hashes, the
// browser fails, and vite forces a full-page reload — repeatedly. The page
// can take more than three minutes to converge from a true cold cache.
//
// To get a fair, reproducible comparison we do an OPTIONAL warmup nav
// first (controlled by WARMUP_NAVIGATE_MS, default 60000 ms when set):
// navigate to the target URL, give vite/rsbuild time to fully prime their
// preview chunk graph, then RESET our timing baseline and Network counters
// and do the real timed navigation. Both bundlers go through the same
// warmup, so the final cold-load number is "first nav after the dev
// server is fully primed" — the steady-state user experience.
const WARMUP_NAVIGATE_MS = Number(process.env.WARMUP_NAVIGATE_MS || 0);
if (WARMUP_NAVIGATE_MS > 0) {
  await send('Page.navigate', { url: targetUrl });
  // Wait fixed warmup time. Cheaper than parsing dev-server logs and is
  // symmetric across bundlers.
  await new Promise(r => setTimeout(r, WARMUP_NAVIGATE_MS));
  // Blank the page so the next navigation is from a clean state, then
  // clear browser cache (vite serves dep modules with no-cache anyway,
  // but rsbuild caches; clearing keeps the comparison cold for both).
  await send('Page.navigate', { url: 'about:blank' });
  await new Promise(r => setTimeout(r, 500));
  await send('Network.clearBrowserCache');
  // Reset our counters so the timed navigation reports clean numbers.
  netInflight = 0;
  bytesRecv = 0;
  requests = 0;
  byMime = {};
  fcp = null;
  lcp = null;
  tDcl = null;
  tLoad = null;
  lastIdleAt = null;
  tNetIdle = null;
  tStart = Date.now();
}

const tNavStart = Date.now();
await send('Page.navigate', { url: targetUrl });

// Wait until the page actually renders the story (not just a network-idle
// blank document, and not Storybook's "couldn't find story" error). A
// rendered story has substantial content in #storybook-root; a render error
// renders to body and leaves #storybook-root empty (or hidden). We
// deliberately do NOT key off `document.body.innerText` because addons like
// MSW append console-style notifications there even on a successful render.
// Generous timeout — vite's first-run dep-optimize on a cold cache can take
// well over a minute on this codebase.
const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS || 180000);
const renderDeadline = tNavStart + RENDER_TIMEOUT_MS;
let rendered = false;
let renderDiagnostic = null;
while (Date.now() < renderDeadline) {
  const r = await send('Runtime.evaluate', {
    expression: `(() => {
      const root = document.getElementById('storybook-root');
      const sbRootContent = root && !root.hidden ? root.innerHTML.length : 0;
      const bodyText = document.body ? document.body.innerText : '';
      const fcp = (performance.getEntriesByType('paint').find(e=>e.name==='first-contentful-paint')||{}).startTime;
      // For the iframe viewMode=story path, success = #storybook-root has
      // real content. For non-iframe pages (e.g. the manager) fall back to
      // non-empty body.
      const ok = fcp > 0 && (sbRootContent > 50 || (!root && bodyText.length > 100));
      return JSON.stringify({ ok, sbRootContent, bodyText: bodyText.slice(0,300), fcp: fcp || 0 });
    })()`,
    returnByValue: true,
  });
  let s = {};
  try { s = JSON.parse(r.result.value); } catch {}
  renderDiagnostic = s;
  if (s.ok) { rendered = true; break; }
  await new Promise(r => setTimeout(r, 200));
}
if (!rendered) {
  console.error('[cdp_bench] Story did not render within ' + RENDER_TIMEOUT_MS + 'ms');
  console.error('[cdp_bench] last diagnostic: ' + JSON.stringify(renderDiagnostic));
}

// After the story has rendered, wait for the network to settle so we get a
// stable request/byte count. The rsbuild dev server tends to settle within
// a second; vite holds a few HMR pings open so we cap the wait.
const idleDeadline = Date.now() + 15000;
while (Date.now() < idleDeadline) {
  if (tLoad && lastIdleAt && (Date.now() - lastIdleAt) > 1500) { tNetIdle = lastIdleAt; break; }
  await new Promise(r => setTimeout(r, 100));
}

const perf = await send('Performance.getMetrics');
const perfMap = Object.fromEntries(perf.metrics.map(m => [m.name, m.value]));
const heap = await send('Runtime.evaluate', {
  expression: `JSON.stringify({
    used: performance.memory && performance.memory.usedJSHeapSize,
    total: performance.memory && performance.memory.totalJSHeapSize,
    domNodes: document.getElementsByTagName('*').length,
    fcp: (performance.getEntriesByType('paint').find(e=>e.name==='first-contentful-paint')||{}).startTime,
    lcp: performance.getEntriesByType('largest-contentful-paint').slice(-1)[0]?.startTime,
    domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
    loadEvent: performance.timing.loadEventEnd - performance.timing.navigationStart,
  })`,
  returnByValue: true,
});
const browserMemory = perfMap.JSHeapUsedSize;

// Now do a full reload to measure warm-cache reload
const tReload = Date.now();
let tReloadLoad = null;
const reloadHandler = ev => { if (ev.method === 'Page.loadEventFired') tReloadLoad = Date.now(); };
evHandlers.push(reloadHandler);
let reloadReqs = 0, reloadBytes = 0;
const reloadCounter = ev => {
  if (ev.method === 'Network.requestWillBeSent') reloadReqs++;
  if (ev.method === 'Network.loadingFinished') reloadBytes += ev.params?.encodedDataLength || 0;
};
const reloadStartReqs = requests, reloadStartBytes = bytesRecv;
await send('Page.reload', {});
// Reload waits up to 60s — generous so vite has time to re-render after HMR
// or a cold-ish optimize-deps invalidation.
const rDeadline = Date.now() + 60000;
while (Date.now() < rDeadline && !tReloadLoad) await new Promise(r => setTimeout(r, 50));
// Also re-confirm the story actually rendered after reload.
let reloadRendered = false;
const reloadRenderDeadline = Date.now() + 30000;
while (Date.now() < reloadRenderDeadline) {
  const r = await send('Runtime.evaluate', {
    expression: `(() => {
      const root = document.getElementById('storybook-root') || document.getElementById('root');
      return root ? root.innerHTML.length > 0 : !!(document.body && document.body.innerText.length);
    })()`,
    returnByValue: true,
  });
  if (r.result.value) { reloadRendered = true; break; }
  await new Promise(r => setTimeout(r, 200));
}

const out = {
  url: targetUrl,
  rendered,
  reloadRendered,
  cold: {
    domContentLoaded_ms: tDcl ? tDcl - tStart : null,
    load_ms: tLoad ? tLoad - tStart : null,
    networkIdle_ms: tNetIdle ? tNetIdle - tStart : null,
    requests,
    bytesReceived: bytesRecv,
    byMime,
  },
  reload: {
    load_ms: tReloadLoad ? tReloadLoad - tReload : null,
    requests: requests - reloadStartReqs,
    bytesReceived: bytesRecv - reloadStartBytes,
  },
  paint: { jsHeapUsed: browserMemory },
  heap: heap.result.value && JSON.parse(heap.result.value),
  performance: perfMap,
};
console.log(JSON.stringify(out, null, 2));

ws.close();
proc.kill('SIGTERM');
