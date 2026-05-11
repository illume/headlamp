// Cross-platform port of run.sh. Runs the full benchmark suite and
// writes results into `results/<UTC-timestamp>/`.
//
// Usage (from the bench dir):
//   npm install
//   npm run bench
//
// Or from anywhere:
//   node benchmarks/rsbuild-vs-vite/run.ts
//
// Prereqs:
//   - frontend deps installed (`cd frontend && npm ci`)
//   - bench deps installed (`cd benchmarks/rsbuild-vs-vite && npm install`)
//     The bench `postinstall` step pulls Playwright's bundled chromium —
//     no system chromium required.
import { spawn, type SpawnOptions } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { descendantsOf, parsePsPpidOutput, type Edge } from './lib/measure_lib.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const frontendDir = path.join(repoRoot, 'frontend');

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, 'Z');
const outDir = path.join(__dirname, 'results', stamp);
await fs.mkdir(outDir, { recursive: true });

// Track non-fatal subtask failures so we can still produce as much data as
// possible per run, but fail the overall process at the end. This makes
// `npm run bench` exit non-zero in CI when any builder/measurement is
// broken instead of silently uploading partial results.
const failures: string[] = [];

interface RunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  shell?: boolean;
  stdio?: SpawnOptions['stdio'];
}

function run(cmd: string, args: string[], opts: RunOptions = {}): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || frontendDir,
      env: { ...process.env, ...(opts.env || {}) },
      shell: opts.shell ?? false,
      stdio: opts.stdio || 'inherit',
    });
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function rmrf(p: string): Promise<void> {
  await fs.rm(p, { recursive: true, force: true }).catch(() => {});
}

function run0(cmd: string, args: string[], opts: RunOptions = {}): Promise<void> {
  return run(cmd, args, { ...opts, stdio: 'ignore' });
}

async function wipeBuildCaches(): Promise<void> {
  await rmrf(path.join(frontendDir, 'build'));
  await rmrf(path.join(frontendDir, 'node_modules', '.cache'));
  await rmrf(path.join(frontendDir, 'node_modules', '.rspack-cache'));
  await rmrf(path.join(frontendDir, 'node_modules', '.vite'));
}

async function wipeStorybookCaches(): Promise<void> {
  await rmrf(path.join(frontendDir, 'node_modules', '.cache', 'storybook'));
  await rmrf(path.join(frontendDir, 'node_modules', '.cache', 'rsbuild'));
  await rmrf(path.join(frontendDir, 'node_modules', '.rspack-cache'));
  await rmrf(path.join(frontendDir, 'node_modules', '.vite'));
}

interface TimedResult {
  code: number | null;
  wall_ms: number;
  maxRSS_kb: number;
  cpu_pct_mean: number;
  log: Buffer;
}

/**
 * Resolve `rootPid` and all descendants on the current platform.
 * Mirrors the implementation in measure.ts so the build sampler can
 * see past the npx/cmd.exe wrapper to the real bundler process.
 */
async function listDescendantPids(rootPid: number): Promise<number[]> {
  const { execSync } = await import('node:child_process');
  try {
    if (process.platform === 'win32') {
      const out = execSync('wmic process get ProcessId,ParentProcessId', {
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString();
      const edges: Edge[] = [];
      for (const line of out.split(/\r?\n/).slice(1)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) continue;
        const ppid = Number(parts[0]);
        const pid = Number(parts[1]);
        if (Number.isFinite(ppid) && Number.isFinite(pid)) edges.push([ppid, pid] as const);
      }
      return descendantsOf(rootPid, edges);
    }
    const out = execSync('ps -A -o pid=,ppid=', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    return descendantsOf(rootPid, parsePsPpidOutput(out));
  } catch {
    return [rootPid];
  }
}

/**
 * Cross-platform poor man's `time` for child processes — returns wall
 * time and best-effort peak RSS via {@link pidusage}. Doesn't try to
 * match GNU time's CPU% format.
 *
 * Builds are launched through `npx` (and through `cmd.exe` on
 * Windows), so sampling only the spawned PID would report the
 * wrapper's resources, not the actual vite/rsbuild process tree. We
 * re-resolve the descendant set on every tick and sum across the
 * tree, the same way `measure.ts` samples the dev-server tree.
 */
async function timeChild(
  cmd: string,
  args: string[],
  opts: RunOptions = {}
): Promise<TimedResult> {
  const pidusage = (await import('pidusage')).default;
  const t0 = performance.now();
  const child = spawn(cmd, args, {
    cwd: opts.cwd || frontendDir,
    env: { ...process.env, ...(opts.env || {}) },
    shell: opts.shell ?? false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logChunks: Buffer[] = [];
  child.stdout?.on('data', (d: Buffer) => logChunks.push(d));
  child.stderr?.on('data', (d: Buffer) => logChunks.push(d));
  let maxRss = 0;
  let cpuPctSum = 0;
  let cpuSamples = 0;
  const sampler = setInterval(() => {
    if (child.pid == null) return;
    void (async () => {
      try {
        const pids = await listDescendantPids(child.pid as number);
        let totalRss = 0;
        let totalCpu = 0;
        await Promise.all(
          pids.map(async pid => {
            try {
              const s = await pidusage(pid);
              totalRss += s.memory || 0;
              totalCpu += s.cpu || 0;
            } catch {
              // process may have exited mid-sample
            }
          })
        );
        if (totalRss > maxRss) maxRss = totalRss;
        cpuPctSum += totalCpu;
        cpuSamples += 1;
      } catch {
        // child may have exited
      }
    })();
  }, 200);
  const code: number | null = await new Promise(resolve => child.on('exit', resolve));
  clearInterval(sampler);
  const wallMs = performance.now() - t0;
  return {
    code,
    wall_ms: wallMs,
    maxRSS_kb: Math.round(maxRss / 1024),
    cpu_pct_mean: cpuSamples > 0 ? cpuPctSum / cpuSamples : 0,
    log: Buffer.concat(logChunks),
  };
}

console.log(`[bench] writing results to ${outDir}`);

async function captureDistStats(outFile: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--experimental-strip-types',
        path.join(__dirname, 'dist_stats.ts'),
        path.join(frontendDir, 'build'),
      ],
      { stdio: ['ignore', 'pipe', 'inherit'] }
    );
    const chunks: Buffer[] = [];
    child.stdout?.on('data', (d: Buffer) => chunks.push(d));
    child.on('exit', code => {
      void fs.writeFile(outFile, Buffer.concat(chunks)).then(() => {
        if (code === 0) resolve();
        else reject(new Error(`dist_stats exited ${code}`));
      });
    });
  }).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[bench] dist_stats failed: ${msg}`);
    failures.push(`dist_stats: ${msg}`);
  });
}

// 1) Cold + warm production builds (bundler-only timings; postbuild
//    brotli step is excluded).
//
//    runIdx === 1: cold — caches wiped before the build.
//    runIdx === 2: warm — caches retained from runIdx 1 so the
//    bundler's incremental cache is exercised.
//
//    After the cold build of each tool we capture its dist/ stats
//    (file count, sizes, top chunks) so the dist-size comparison
//    isn't biased toward whichever builder happened to run last.
for (const tool of ['rsbuild', 'vite'] as const) {
  for (const runIdx of [1, 2]) {
    if (runIdx === 1) {
      await wipeBuildCaches();
    }
    // `npm run make-version` writes a version file the build expects.
    // On Windows, `npm` is `npm.cmd`, so spawn-with-shell:false (the
    // default) fails with ENOENT — match the npx call below by enabling
    // shell on win32.
    await run0('npm', ['run', 'make-version'], {
      shell: process.platform === 'win32',
    }).catch(() => {});
    const cmd = tool === 'vite' ? 'vite build' : 'rsbuild build';
    const { wall_ms, maxRSS_kb, cpu_pct_mean, log, code } = await timeChild(
      'npx',
      [
        '--no-install',
        'cross-env',
        'PUBLIC_URL=./',
        'NODE_OPTIONS=--max-old-space-size=8096',
        ...cmd.split(' '),
      ],
      { shell: process.platform === 'win32' }
    );
    await fs.writeFile(
      path.join(outDir, `build_${tool}_${runIdx}.time`),
      `${tool},${runIdx},wall=${(wall_ms / 1000).toFixed(2)}s,cpu=${cpu_pct_mean.toFixed(0)}%,maxRSS=${maxRSS_kb}kB\n`
    );
    await fs.writeFile(path.join(outDir, `build_${tool}_${runIdx}.log`), log);
    if (code !== 0) {
      const msg = `${tool} build run ${runIdx} exited with ${code}`;
      console.error(`[bench] ${msg}`);
      failures.push(msg);
    }
    // 2) Dist-size stats per tool — captured immediately after the
    //    cold build, before the warm rebuild and before the next
    //    tool wipes the caches.
    //
    //    The harness invokes `npx vite build` / `npx rsbuild build`
    //    directly, which bypasses the frontend's `postbuild` npm
    //    lifecycle script. Run the precompress step explicitly here
    //    so dist_stats can include brotli sidecar counts/bytes
    //    (otherwise br_files / br_bytes are always zero).
    if (runIdx === 1 && code === 0) {
      await run0(
        'node',
        ['./scripts/precompress-build.mjs', 'build'],
        { shell: process.platform === 'win32' }
      ).catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[bench] precompress (${tool}) failed: ${msg}`);
        failures.push(`precompress ${tool}: ${msg}`);
      });
      await captureDistStats(path.join(outDir, `dist_stats_${tool}.json`));
    }
  }
}

interface MeasureOpts {
  name: string;
  command: string;
  port: number;
  ready: string;
  urlPath?: string;
  env?: Record<string, string>;
  outFile: string;
}

async function runMeasure({
  name,
  command,
  port,
  ready,
  urlPath = '/',
  env = {},
  outFile,
}: MeasureOpts): Promise<void> {
  const fd = await fs.open(path.join(outDir, outFile), 'w');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--experimental-strip-types',
        path.join(__dirname, 'measure.ts'),
        name,
        command,
        String(port),
        ready,
        urlPath,
      ],
      {
        cwd: __dirname,
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    child.stdout?.on('data', (d: Buffer) => {
      void fd.write(d);
    });
    child.stderr?.on('data', (d: Buffer) => {
      void fd.write(d);
    });
    child.on('exit', code => {
      void fd.close().then(() => {
        if (code === 0) resolve();
        else reject(new Error(`measure ${name} exited ${code}`));
      });
    });
  }).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[bench] measure ${name} failed: ${msg}`);
    failures.push(`measure ${name}: ${msg}`);
  });
}

// 3) Browser/dev-server measurements (rsbuild + vite app dev servers).
//    The headlamp app shell at `/` needs a backend to render meaningfully;
//    in CI's headless chromium with no backend we still want the dev-server
//    timings (ready, first paint, reload) but not a hard fail on the
//    "rendered=true" probe — that's only meaningful for the storybook
//    story URLs below. STRICT_RENDER=0 keeps the metric in the JSON output
//    while letting cdp_bench exit 0.
await runMeasure({
  name: 'rsbuild',
  command: 'npx --no-install rsbuild dev',
  port: 14001,
  ready: 'ready|built in',
  outFile: 'dev_rsbuild.txt',
  env: { STRICT_RENDER: '0' },
});
await runMeasure({
  name: 'vite',
  command: 'npx --no-install vite',
  port: 14002,
  ready: 'ready in|VITE',
  outFile: 'dev_vite.txt',
  env: { STRICT_RENDER: '0' },
});

// 4) Storybook dev server (rsbuild vs vite). Matching SectionBox iframe
//    URL under both builders so we measure preview-builder behaviour, not
//    just the manager shell.
const SB_URL = '/iframe.html?id=sectionbox--with-children&viewMode=story';

await wipeStorybookCaches();
const sbRsbuildConfig = path.join(frontendDir, '.storybook-rsbuild-bench');
await runMeasure({
  name: 'sb-rsbuild',
  command: `npx --no-install storybook dev --no-open --no-version-updates -c ${sbRsbuildConfig}`,
  port: 14003,
  ready: 'Storybook ready|Local:',
  urlPath: SB_URL,
  env: { WARMUP_NAVIGATE_MS: '60000' },
  outFile: 'dev_sb_rsbuild.txt',
});

await wipeStorybookCaches();
const sbViteConfig = path.join(frontendDir, '.storybook-vite-bench');
await runMeasure({
  name: 'sb-vite',
  command: `npx --no-install storybook dev --no-open --no-version-updates -c ${sbViteConfig}`,
  port: 14004,
  ready: 'Storybook ready|Local:',
  urlPath: SB_URL,
  env: { WARMUP_NAVIGATE_MS: '60000' },
  outFile: 'dev_sb_vite.txt',
});

console.log(`Results in ${outDir}`);

if (failures.length > 0) {
  console.error(`[bench] ${failures.length} subtask(s) failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
