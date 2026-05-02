// Cross-platform port of run.sh. Runs the full benchmark suite and writes
// results into `results/<UTC-timestamp>/`.
//
// Usage (from the bench dir):
//   npm install
//   npm run bench
//
// Or from anywhere:
//   node benchmarks/rsbuild-vs-vite/run.mjs
//
// Prereqs:
//   - frontend deps installed (`cd frontend && npm ci`)
//   - bench deps installed (`cd benchmarks/rsbuild-vs-vite && npm install`)
//     The bench `postinstall` step pulls Playwright's bundled chromium —
//     no system chromium required.
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const frontendDir = path.join(repoRoot, 'frontend');

const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\..*/, 'Z');
const outDir = path.join(__dirname, 'results', stamp);
await fs.mkdir(outDir, { recursive: true });

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || frontendDir,
      env: { ...process.env, ...(opts.env || {}) },
      shell: opts.shell ?? false,
      stdio: opts.stdio || 'inherit',
    });
    if (opts.captureLog) {
      const out = [];
      child.stdout?.on('data', d => out.push(d));
      child.stderr?.on('data', d => out.push(d));
      child.on('exit', code => {
        opts.captureLog.write(Buffer.concat(out));
        opts.captureLog.end();
        if (code === 0) resolve();
        else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`));
      });
    } else {
      child.on('exit', code => {
        if (code === 0) resolve();
        else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`));
      });
    }
  });
}

async function rmrf(p) {
  await fs.rm(p, { recursive: true, force: true }).catch(() => {});
}

async function run0(cmd, args) {
  return run(cmd, args, { stdio: 'ignore' });
}

async function wipeBuildCaches() {
  await rmrf(path.join(frontendDir, 'build'));
  await rmrf(path.join(frontendDir, 'node_modules', '.cache'));
  await rmrf(path.join(frontendDir, 'node_modules', '.rspack-cache'));
  await rmrf(path.join(frontendDir, 'node_modules', '.vite'));
}

async function wipeStorybookCaches() {
  await rmrf(path.join(frontendDir, 'node_modules', '.cache', 'storybook'));
  await rmrf(path.join(frontendDir, 'node_modules', '.cache', 'rsbuild'));
  await rmrf(path.join(frontendDir, 'node_modules', '.rspack-cache'));
  await rmrf(path.join(frontendDir, 'node_modules', '.vite'));
}

async function timeChild(cmd, args, opts = {}) {
  const pidusage = (await import('pidusage')).default;
  const t0 = performance.now();
  const child = spawn(cmd, args, {
    cwd: opts.cwd || frontendDir,
    env: { ...process.env, ...(opts.env || {}) },
    shell: opts.shell ?? false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logChunks = [];
  child.stdout.on('data', d => logChunks.push(d));
  child.stderr.on('data', d => logChunks.push(d));
  let maxRss = 0;
  let cpuPctSum = 0;
  let cpuSamples = 0;
  const sampler = setInterval(async () => {
    try {
      const s = await pidusage(child.pid);
      if (s.memory > maxRss) maxRss = s.memory;
      cpuPctSum += s.cpu;
      cpuSamples += 1;
    } catch {
      // child may have exited
    }
  }, 200);
  const code = await new Promise(resolve => child.on('exit', resolve));
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

// 1) Cold + warm production builds (bundler-only timings, postbuild excluded).
for (const tool of ['rsbuild', 'vite']) {
  for (const runIdx of [1, 2]) {
    await wipeBuildCaches();
    // `npm run make-version` writes a version file the build expects.
    await run0('npm', ['run', 'make-version']).catch(() => {});
    const cmd = tool === 'vite' ? 'vite build' : 'rsbuild build';
    const { wall_ms, maxRSS_kb, cpu_pct_mean, log, code } = await timeChild(
      'npx',
      ['--no-install', 'cross-env', 'PUBLIC_URL=./', 'NODE_OPTIONS=--max-old-space-size=8096', ...cmd.split(' ')],
      { shell: process.platform === 'win32' }
    );
    await fs.writeFile(
      path.join(outDir, `build_${tool}_${runIdx}.time`),
      `${tool},${runIdx},wall=${(wall_ms / 1000).toFixed(2)}s,cpu=${cpu_pct_mean.toFixed(0)}%,maxRSS=${maxRSS_kb}kB\n`
    );
    await fs.writeFile(path.join(outDir, `build_${tool}_${runIdx}.log`), log);
    if (code !== 0) {
      console.error(`[bench] ${tool} build run ${runIdx} exited with ${code}`);
    }
  }
}

// 2) Dist-size stats
{
  const out = path.join(outDir, 'dist_stats_last.json');
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(__dirname, 'dist_stats.mjs'), path.join(frontendDir, 'build')],
      { stdio: ['ignore', 'pipe', 'inherit'] }
    );
    const chunks = [];
    child.stdout.on('data', d => chunks.push(d));
    child.on('exit', code => {
      fs.writeFile(out, Buffer.concat(chunks)).then(() => (code === 0 ? resolve() : reject(new Error(`dist_stats exited ${code}`))));
    });
  }).catch(e => console.error(`[bench] dist_stats failed: ${e.message}`));
}

// 3) Browser/dev-server measurements (vite + rsbuild app dev server).
async function runMeasure({ name, command, port, ready, urlPath = '/', env = {}, outFile }) {
  const fd = await fs.open(path.join(outDir, outFile), 'w');
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(__dirname, 'measure.mjs'), name, command, String(port), ready, urlPath],
      {
        cwd: __dirname,
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    child.stdout.on('data', d => fd.write(d));
    child.stderr.on('data', d => fd.write(d));
    child.on('exit', code => {
      fd.close().then(() => (code === 0 ? resolve() : reject(new Error(`measure ${name} exited ${code}`))));
    });
  }).catch(e => console.error(`[bench] measure ${name} failed: ${e.message}`));
}

await runMeasure({
  name: 'rsbuild',
  command: 'npx --no-install rsbuild dev',
  port: 14001,
  ready: 'ready|built in',
  outFile: 'dev_rsbuild.txt',
});
await runMeasure({
  name: 'vite',
  command: 'npx --no-install vite',
  port: 14002,
  ready: 'ready in|VITE',
  outFile: 'dev_vite.txt',
});

// 4) Storybook dev server (rsbuild vs vite). Matching SectionBox iframe
//    URL under both builders so we measure preview-builder behavior, not
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
