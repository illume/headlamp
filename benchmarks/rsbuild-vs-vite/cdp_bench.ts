// Cross-platform CDP-driven page bench, powered by Playwright's bundled
// chromium. Captures:
//   - cold load timings (DCL, load, networkIdle, FCP, request count, bytes)
//   - render-validation (waits for #storybook-root content + first paint)
//   - reload timings + counts
//   - jsHeap, dom node count, browser perf metrics
//
// Usage:  node cdp_bench.ts <url>
// Env:    WARMUP_NAVIGATE_MS  optional warmup nav before the timed nav
//         RENDER_TIMEOUT_MS   render-validation timeout (default 180000)
//
// Output: a JSON document on stdout. Diagnostics on stderr.
//
// No external Chromium install required — Playwright downloads its
// bundled chromium during `npm install` (see package.json postinstall).
import { chromium, type Browser } from 'playwright';

interface ColdMetrics {
  domContentLoaded_ms: number | null;
  load_ms: number | null;
  networkIdle_ms: number | null;
  requests: number;
  bytesReceived: number;
  byMime: Record<string, number>;
}

interface ReloadMetrics {
  load_ms: number | null;
  requests: number;
  bytesReceived: number;
}

interface HeapInfo {
  used: number | null;
  total: number | null;
  domNodes: number;
  fcp: number | null;
  lcp: number | null;
  domContentLoaded: number;
  loadEvent: number;
}

interface BenchOutput {
  url: string;
  rendered: boolean;
  reloadRendered: boolean;
  cold: ColdMetrics;
  reload: ReloadMetrics;
  paint: { jsHeapUsed: number | null };
  heap: HeapInfo | null;
  performance: Record<string, number>;
}

const targetUrl = process.argv[2];
if (!targetUrl) {
  console.error('Usage: node cdp_bench.ts <url>');
  process.exit(2);
}

const browser: Browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-precise-memory-info',
    '--window-size=1366,768',
  ],
});
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

await cdp.send('Page.enable');
await cdp.send('Performance.enable');
await cdp.send('Runtime.enable');
await cdp.send('Network.enable');

let tStart = Date.now();
let tDcl: number | null = null;
let tLoad: number | null = null;
let lastIdleAt: number | null = null;
let tNetIdle: number | null = null;
let netInflight = 0;
let bytesRecv = 0;
let requests = 0;
let byMime: Record<string, number> = {};

cdp.on('Page.domContentEventFired', () => {
  tDcl = Date.now();
});
cdp.on('Page.loadEventFired', () => {
  tLoad = Date.now();
});
cdp.on('Network.requestWillBeSent', () => {
  netInflight++;
  requests++;
});
cdp.on('Network.responseReceived', ev => {
  const m = ev.response.mimeType || 'other';
  byMime[m] = (byMime[m] || 0) + 1;
});
const onLoadingDone = (ev: { encodedDataLength?: number }): void => {
  netInflight = Math.max(0, netInflight - 1);
  bytesRecv += ev.encodedDataLength || 0;
  if (netInflight === 0) lastIdleAt = Date.now();
};
cdp.on('Network.loadingFinished', onLoadingDone);
// Network.loadingFailed has no encodedDataLength field, so we just bump
// the inflight counter without adding to bytesRecv.
cdp.on('Network.loadingFailed', () => {
  netInflight = Math.max(0, netInflight - 1);
  if (netInflight === 0) lastIdleAt = Date.now();
});

// Optional warmup pass. Vite's storybook builder reports "Storybook ready"
// while its `optimizeDeps` crawler is still running; the first navigation
// then races with dep optimization, vite serves stale dep hashes, the
// browser fails, and vite forces a full-page reload — repeatedly.
//
// To get a fair, reproducible comparison we do an OPTIONAL warmup nav
// first (controlled by WARMUP_NAVIGATE_MS, default 0): navigate to the
// target URL, give vite/rsbuild time to fully prime their preview chunk
// graph, then RESET our timing baseline and Network counters and do the
// real timed navigation. Both bundlers go through the same warmup, so the
// final cold-load number is "first nav after the dev server is fully
// primed" — the steady-state user experience.
const WARMUP_NAVIGATE_MS = Number(process.env.WARMUP_NAVIGATE_MS || 0);
if (WARMUP_NAVIGATE_MS > 0) {
  await page.goto(targetUrl, { waitUntil: 'commit' }).catch(() => {});
  await new Promise(r => setTimeout(r, WARMUP_NAVIGATE_MS));
  await page.goto('about:blank', { waitUntil: 'commit' }).catch(() => {});
  await new Promise(r => setTimeout(r, 500));
  // Reset counters so the timed nav reports clean numbers.
  netInflight = 0;
  bytesRecv = 0;
  requests = 0;
  byMime = {};
  tDcl = null;
  tLoad = null;
  lastIdleAt = null;
  tNetIdle = null;
  tStart = Date.now();
}

const tNavStart = Date.now();
// Don't await waitUntil:'load' — for storybook on cold cache that can hang
// past our budget. Trigger the nav and poll for our own render signal.
page.goto(targetUrl, { waitUntil: 'commit' }).catch(() => {});

interface RenderDiagnostic {
  ok: boolean;
  sbRootContent: number;
  bodyText: string;
  fcp: number;
}

// Wait until the page actually renders the story (not just a network-idle
// blank document, and not Storybook's "couldn't find story" error). A
// rendered story has substantial content in #storybook-root; a render error
// renders to body and leaves #storybook-root empty (or hidden). Generous
// timeout — vite's first-run dep-optimize on a cold cache can take well
// over a minute on this codebase.
const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS || 180000);
const renderDeadline = tNavStart + RENDER_TIMEOUT_MS;
let rendered = false;
let renderDiagnostic: RenderDiagnostic | null = null;
while (Date.now() < renderDeadline) {
  let s: RenderDiagnostic | null = null;
  try {
    s = await page.evaluate((): RenderDiagnostic => {
      const root = document.getElementById('storybook-root');
      const sbRootContent = root && !root.hidden ? root.innerHTML.length : 0;
      const bodyText = document.body ? document.body.innerText : '';
      const fcpEntry = performance
        .getEntriesByType('paint')
        .find(e => e.name === 'first-contentful-paint');
      const fcp = fcpEntry ? fcpEntry.startTime : 0;
      // For the iframe viewMode=story path, success = #storybook-root has
      // real content. For non-iframe pages (e.g. the manager / app shell)
      // fall back to non-empty body.
      const ok = fcp > 0 && (sbRootContent > 50 || (!root && bodyText.length > 100));
      return { ok, sbRootContent, bodyText: bodyText.slice(0, 300), fcp };
    });
  } catch {
    // page may be navigating; retry
  }
  if (s) renderDiagnostic = s;
  if (s?.ok) {
    rendered = true;
    break;
  }
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
  if (tLoad && lastIdleAt && Date.now() - lastIdleAt > 1500) {
    tNetIdle = lastIdleAt;
    break;
  }
  await new Promise(r => setTimeout(r, 100));
}

const perf = await cdp.send('Performance.getMetrics');
const perfMap: Record<string, number> = Object.fromEntries(
  perf.metrics.map(m => [m.name, m.value])
);
const heap = await page
  .evaluate((): HeapInfo => {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    const fcpEntry = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint');
    const lcpList = performance.getEntriesByType('largest-contentful-paint');
    const lcpEntry = lcpList[lcpList.length - 1];
    return {
      used: memory ? memory.usedJSHeapSize : null,
      total: memory ? memory.totalJSHeapSize : null,
      domNodes: document.getElementsByTagName('*').length,
      fcp: fcpEntry ? fcpEntry.startTime : null,
      lcp: lcpEntry ? lcpEntry.startTime : null,
      domContentLoaded:
        performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      loadEvent: performance.timing.loadEventEnd - performance.timing.navigationStart,
    };
  })
  .catch(() => null);
const browserMemory = perfMap.JSHeapUsedSize ?? null;

// Now do a full reload to measure warm-cache reload.
const tReload = Date.now();
let tReloadLoad: number | null = null;
const reloadHandler = (): void => {
  tReloadLoad = Date.now();
};
cdp.on('Page.loadEventFired', reloadHandler);
const reloadStartReqs = requests;
const reloadStartBytes = bytesRecv;
await cdp.send('Page.reload', {});
// Reload waits up to 60s — generous so vite has time to re-render after HMR
// or a cold-ish optimize-deps invalidation.
const rDeadline = Date.now() + 60000;
while (Date.now() < rDeadline && !tReloadLoad) await new Promise(r => setTimeout(r, 50));
// Also re-confirm the story actually rendered after reload.
let reloadRendered = false;
const reloadRenderDeadline = Date.now() + 30000;
while (Date.now() < reloadRenderDeadline) {
  let ok = false;
  try {
    ok = await page.evaluate((): boolean => {
      const root =
        document.getElementById('storybook-root') || document.getElementById('root');
      return root ? root.innerHTML.length > 0 : !!(document.body && document.body.innerText.length);
    });
  } catch {
    // page may still be loading
  }
  if (ok) {
    reloadRendered = true;
    break;
  }
  await new Promise(r => setTimeout(r, 200));
}

const out: BenchOutput = {
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
  heap,
  performance: perfMap,
};
process.stdout.write(JSON.stringify(out, null, 2) + '\n');

await browser.close();
