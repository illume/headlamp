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

const tStart = Date.now();
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

await send('Page.navigate', { url: targetUrl });

const deadline = Date.now() + 30000;
while (Date.now() < deadline) {
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
const rDeadline = Date.now() + 20000;
while (Date.now() < rDeadline && !tReloadLoad) await new Promise(r => setTimeout(r, 50));

const out = {
  url: targetUrl,
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
