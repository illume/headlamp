# rsbuild vs vite — full benchmark

Reproducible comparison of rsbuild (rspack) vs vite (rollup + esbuild) for
the headlamp frontend on this branch. Driven by the scripts in this
directory; results are produced into `results/<UTC-timestamp>/`.

## Environment

| Dimension | Value |
|---|---|
| Repo branch | `copilot/make-default-build-system-rsbuild` (post Monaco trim, brotli sidecars) |
| Host | Linux x86_64, sandbox runner |
| Node | v20.20.2 |
| Browser | Chromium 147 (headless) driven via raw CDP |
| rsbuild | `@rsbuild/core@2.0.3` |
| vite | `vite@8.0.10` |
| Mode for browser metrics | dev server (no production build) |
| Mode for build metrics | production build (`rsbuild build` / `vite build`) |
| Postbuild brotli | `frontend/scripts/precompress-build.mjs`, **excluded** from bundler timings |

Each cold-build measurement is the mean of two runs after wiping
`node_modules/.cache`, `node_modules/.rspack-cache`, `node_modules/.vite`.

## TL;DR

- **Production build is faster with vite** (4.1 s vs 7.1 s cold).
- **Production output is essentially the same size** (raw 16.9 MB vs 17.5 MB; brotli 3.5 MB both).
- **rsbuild produces better chunking**: 290 files / 5.5 MB largest chunk vs vite's 172 / 7.05 MB monolith → better long-term cache hit rate after deploys.
- **Dev experience is dramatically better with rsbuild** for this codebase:
  cold dev page emits **116 requests / 6.5 MB** under rsbuild vs
  **1 929 requests / 27.5 MB** under vite (≈16× more requests, ≈4× more bytes).
- **First Contentful Paint** is ~3× faster under rsbuild dev (2.1 s vs 6.2 s).
- **Warm reload** is ~2× faster under rsbuild dev (770 ms vs 1 775 ms).
- **Dev server idle memory is identical** (~75 MB).
- **Browser CPU peak during cold load is 1.6× higher under vite** (417 % vs 259 %), as expected when the browser parses ~1 900 separate ES modules instead of pre-bundled chunks.
- **rsbuild stack costs ~120 MB of node_modules disk** (mainly the
  `@rspack/core` native binaries); the vite stack costs ~16 MB.

## Production build

| Metric | rsbuild (rspack) | vite (rollup) | Δ |
|---|---:|---:|---|
| Cold build wall (avg of 2) | **7.12 s** | **4.13 s** | vite −42 % |
| Warm build wall | ~7.0 s | ~4.1 s | vite −41 % |
| Build process maxRSS | ~1.28 GB | ~1.43 GB | rsbuild −10 % |
| Dist file count | 290 | 172 | rsbuild +69 % |
| Dist raw size | 16.88 MB | 17.51 MB | rsbuild −4 % |
| Dist `.br` sidecar size | 3.53 MB | 3.57 MB | tie |
| Largest single chunk | 5.50 MB | 7.05 MB | rsbuild −22 % |
| Total dist on disk | 21 MB | 21 MB | tie |

Notes:
- Vite's biggest single chunk is one ~7 MB monolith (`assets/index-…js`); rsbuild splits more aggressively.
- Vite emits Monaco under `assets/vs/node_modules/monaco-editor/min/vs/…` due to a `viteStaticCopy` quirk; rsbuild emits the cleaner `assets/vs/…`.
- Both pipelines produce identical brotli sidecars at quality 11 via the post-build script — no measurable size difference.

## Dev server

Both servers run on a clean tree. Browser is launched headless and navigates
to `http://localhost:<port>/` (no backend kubeconfig — relevant assets still
load; XHRs to the API simply 502 and don't gate the page).

| Metric | rsbuild dev | vite dev | Δ |
|---|---:|---:|---|
| Server ready (terminal "ready") | 2.7 s | 0.7 s | vite −74 % |
| **Cold page: HTTP requests** | **116** | **1 929** | vite **+16.6 ×** |
| **Cold page: bytes received** | **6.55 MB** | **27.50 MB** | vite **+4.2 ×** |
| Cold page: First Contentful Paint | **2.1 s** | **6.2 s** | rsbuild −66 % |
| Cold page: JS heap (after settle) | 73.7 MB | 62.4 MB | vite −15 % |
| **Warm reload: load event** | **770 ms** | **1 775 ms** | rsbuild −57 % |
| Warm reload: HTTP requests | 25 | 873 | vite +35 × |
| Warm reload: bytes received | 0.80 MB | 0.08 MB | vite −90 % (mostly 304s) |
| Dev server idle RSS | 75 MB | 75 MB | tie |
| Dev server CPU mean during load | 2 % | 2 % | tie |
| Dev server CPU peak | 8 % | 12 % | rsbuild −33 % |
| Browser RSS peak (all tabs+helpers) | 2.17 GB | 1.25 GB | vite −42 % |
| Browser RSS mean | 1.77 GB | 1.08 GB | vite −39 % |
| Browser CPU peak | 259 % | 417 % | rsbuild −38 % |
| Browser CPU mean | 33 % | 61 % | rsbuild −46 % |

How to read this:

- **Vite is faster to start the server** (cold ~0.7 s vs ~2.7 s) because it does no bundling — but the cost is paid by the browser, repeatedly.
- The browser has to fetch and parse **~1 900 separate ES modules** under vite (each MUI/monaco/lodash internal is its own request). Even on localhost this is the dominant cost on first navigation: 6.2 s FCP vs 2.1 s for rsbuild's pre-bundled output.
- Under vite the **browser's RSS is lower** (1.25 GB vs 2.17 GB) — fewer pre-bundled chunks held in memory — but **CPU is much higher** (417 % vs 259 %) because v8 is parsing many more script tags/modules.
- Warm reload tells the same story: rsbuild reuses ~25 chunked requests, vite re-resolves ~870 module requests (almost all 304s, hence small bytes).

## Mobile network transfer time (production .br vs identity)

User-perceived bandwidth, **single connection**, ignoring TCP/TLS handshake:

| Profile | bandwidth | rsbuild .br | vite .br | rsbuild raw | vite raw |
|---|---:|---:|---:|---:|---:|
| Slow 3G (Chrome devtools) | 50 KB/s | 70.6 s | 71.4 s | 337.6 s | 350.2 s |
| Regular 3G | 200 KB/s | 17.7 s | 17.9 s | 84.4 s | 87.6 s |
| 4G LTE (median mobile) | 1.5 MB/s | **2.4 s** | **2.4 s** | 11.3 s | 11.7 s |
| 5G mid-band | 12.5 MB/s | 0.28 s | 0.29 s | 1.4 s | 1.4 s |
| Fixed broadband (50 Mbps) | 6.25 MB/s | 0.56 s | 0.57 s | 2.7 s | 2.8 s |

Brotli savings vs identity:

- **rsbuild**: −79.1 % (13.35 MB saved)
- **vite**: −79.6 % (13.94 MB saved)

These are upper bounds on a cold load that traverses every code-split route;
real first-paint downloads only the entry chunks.

## Disk footprint

### Build artifacts and caches

| Location | rsbuild | vite |
|---|---:|---:|
| `frontend/build/` (final) | 21 MB | 21 MB |
| `node_modules/.cache` + `.rspack-cache` | 0 (this run; cache invalidated each cold) | n/a |
| `node_modules/.vite` (deps cache) | n/a | 47 MB |

### node_modules attributable to each bundler stack

Top-level package directories that are unique to one stack or the other.
Lower bound — does not double-count shared transitive deps.

| Stack | Sub-tree | Disk |
|---|---|---:|
| rsbuild | `@rsbuild/*` | 5.9 MB |
| rsbuild | `@rspack/*` | **114 MB** ← native rust binaries |
| rsbuild | `@swc/*` | 2.3 MB |
| rsbuild | **subtotal** | **~122 MB** |
| vite | `vite` | 2.3 MB |
| vite | `@vitejs/*` | 0.1 MB |
| vite | `@rollup/*` | 2.1 MB |
| vite | `esbuild` | 11.0 MB |
| vite | `vite-plugin-{static-copy,svgr,node-polyfills}` | 0.8 MB |
| vite | **subtotal** | **~16 MB** |

The shared baseline (React, MUI, monaco, etc.) is ~960 MB and is identical
between the two configurations. Including the bundler-stack additions, the
full `frontend/node_modules/` is **1.1 GB**, **850 top-level dirs**, and
**1 367 flattened packages** (109 declared at the top level).

## Browser-side breakdown (cold dev navigation)

| Metric | rsbuild dev | vite dev |
|---|---:|---:|
| ScriptDuration (CDP `Performance`) | 0.989 s | 0.608 s |
| LayoutDuration | 0.082 s | 0.012 s |
| V8CompileDuration | 0.005 s | 0.000 s |
| DOM nodes after settle | 135 | 224 |

Vite reports lower `ScriptDuration` because it streams individual modules
asynchronously — but the integrated wall-clock (FCP) is nonetheless ~3× higher
because of the request-count overhead on the network thread.

## How to reproduce

```bash
# from repo root
cd frontend && npm ci && cd ..
./benchmarks/rsbuild-vs-vite/run.sh
# results land in ./benchmarks/rsbuild-vs-vite/results/<UTC-timestamp>/
```

The harness produces:

- `build_<tool>_<run>.{log,time}` — per-bundler cold/warm production builds with `/usr/bin/time` summary.
- `dev_<tool>.txt` — cold + warm dev navigation via headless Chromium driven by `cdp_bench.mjs`, plus a CSV of `RSS / %CPU` samples at 10 Hz for the dev server and chromium during the navigation.
- `<tool>_browser.json` — the structured per-run browser metric blob (cold load timings, request count, bytes, FCP/LCP, JS heap, DOM nodes, V8 compile time, etc.).

### Methodology notes / caveats

- **Wall-clock for the cold-page `load`/`DCL` is unreliable in headless without a backend** — both servers report 30–32 s because the deadline expires waiting for network idle (HMR websockets stay open). Use **FCP** (2.1 s vs 6.2 s) and the **warm reload `load_event`** (770 ms vs 1 775 ms) as the two robust signals.
- HMR rebuild was measured for rsbuild only (~10–250 ms) because vite's HMR is a websocket push to a connected browser — without a real client attached, no log line fires.
- Browser RSS includes **all** chromium helper processes (renderer, GPU, network, utility); use mean rather than peak when comparing — peaks are dominated by transient renderer spikes.
- Builds use the same `frontend/scripts/precompress-build.mjs` postbuild step in production. It's excluded from the **bundler** wall-clock numbers (≈30 s of brotli quality-11 work either way).

## Verdict

For this codebase:

- **If the team optimises for fast `npm run build` in CI**, vite wins by ~3 s per build.
- **If the team optimises for the developer feedback loop**, rsbuild wins decisively: 3× faster FCP on cold dev page, 2× faster warm reload, no 2 000-request waterfall.
- **For end users on production**, the two are within noise: same brotli size, same on-the-wire transfer time on every realistic network profile. rsbuild's smaller largest-chunk (5.5 MB vs 7.0 MB) gives marginally better long-term cache reuse after deploys.
- **For CI disk and storage budgets**, vite costs ~106 MB less of `node_modules`; rsbuild's `@rspack/core` ships a 100 MB rust binary.
