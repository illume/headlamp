// Cross-platform port of measure.sh. Spawns a dev server, waits for its
// "ready" log line, samples server + chromium RSS/CPU while a CDP-driven
// browser load runs against it, then tears it all down.
//
// Usage:
//   node measure.ts <name> <command> <port> <readyRegex> [urlPath]
//
// `command` is a single string like "npx --no-install rsbuild dev"; we
// append `--port <port>` and run it through the user's shell so npx
// works the same way it does on bash and Windows cmd. `readyRegex` is
// a JS regex matched against the dev server's stdout/stderr.
//
// On Windows we use `tree-kill` to kill the whole process tree (the
// `child.kill()` call only kills the shell, leaving npx + node orphaned).
import { spawn, type ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import treeKill from 'tree-kill';
import pidusage from 'pidusage';
import {
  parsePsCommOutput,
  filterChromiumPids,
  parsePsPpidOutput,
  descendantsOf,
  parseSamplesCsv,
  formatSamplingBlock,
  type Edge,
} from './lib/measure_lib.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const frontendDir = path.join(repoRoot, 'frontend');

function killTree(pid: number | undefined): Promise<void> {
  if (pid == null) return Promise.resolve();
  return new Promise<void>(resolve => treeKill(pid, 'SIGKILL', () => resolve()));
}

/**
 * Resolve `rootPid` and all descendants on the current platform.
 * Uses `wmic` on Windows and `ps -A -o pid=,ppid=` elsewhere; the
 * pure tree-walking logic lives in {@link descendantsOf} so it can
 * be tested deterministically.
 */
async function listDescendantPids(rootPid: number): Promise<number[]> {
  const { execSync } = await import('node:child_process');
  try {
    if (process.platform === 'win32') {
      const out = execSync('wmic process get ProcessId,ParentProcessId', {
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString();
      const edges: Edge[] = [];
      // wmic prints `ParentProcessId  ProcessId` with the header on line 0.
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
 * Enumerate live chromium-family PIDs (including Playwright's
 * bundled `headless_shell` on Linux). Pure parsing/filtering is in
 * the lib; this function only owns the platform-specific spawn.
 */
async function listChromiumPids(): Promise<number[]> {
  const { execSync } = await import('node:child_process');
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        'wmic process where "name like \'chrome%\' or name like \'chromium%\' or name like \'headless_shell%\'" get ProcessId',
        { stdio: ['ignore', 'pipe', 'ignore'] }
      ).toString();
      return out
        .split(/\r?\n/)
        .map(l => Number(l.trim()))
        .filter(n => Number.isFinite(n) && n > 0);
    }
    const out = execSync('ps -A -o pid=,comm=', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    return filterChromiumPids(parsePsCommOutput(out));
  } catch {
    return [];
  }
}

interface ProcTotals {
  rssKb: number;
  cpuPct: number;
  samples: number;
}

async function sampleProcessTotals(pids: number[]): Promise<ProcTotals> {
  if (!pids.length) return { rssKb: 0, cpuPct: 0, samples: 0 };
  let totalRssBytes = 0;
  let totalCpu = 0;
  let n = 0;
  await Promise.all(
    pids.map(async pid => {
      try {
        const s = await pidusage(pid);
        totalRssBytes += s.memory || 0;
        totalCpu += s.cpu || 0;
        n += 1;
      } catch {
        // process may have exited mid-sample
      }
    })
  );
  return { rssKb: Math.round(totalRssBytes / 1024), cpuPct: totalCpu, samples: n };
}

/** Spawn the dev-server command through the platform's shell. */
function runShell(cmd: string): ChildProcess {
  if (process.platform === 'win32') {
    return spawn(cmd, { shell: true, cwd: frontendDir, env: process.env });
  }
  return spawn(cmd, { shell: true, cwd: frontendDir, env: process.env, detached: true });
}

interface BrowserResult {
  rendered: boolean;
  reloadRendered: boolean;
  cold: { load_ms: number | null; domContentLoaded_ms: number | null; networkIdle_ms: number | null; requests: number; bytesReceived: number };
  reload: { load_ms: number | null; requests: number; bytesReceived: number };
  heap: { used: number | null; fcp: number | null; lcp: number | null; domNodes: number } | null;
  performance: Record<string, number>;
}

async function main(): Promise<void> {
  const [, , name, command, portStr, readyRegexStr, urlPath = '/'] = process.argv;
  if (!name || !command || !portStr || !readyRegexStr) {
    console.error('Usage: node measure.ts <name> <command> <port> <readyRegex> [urlPath]');
    process.exit(2);
  }
  const port = Number(portStr);
  const readyRegex = new RegExp(readyRegexStr);
  const tmpDir = os.tmpdir();
  const browserJsonPath = path.join(tmpDir, `${name}_browser.json`);
  const browserErrPath = path.join(tmpDir, `${name}_browser.err`);
  const samplesPath = path.join(tmpDir, `${name}_samples.csv`);
  const logPath = path.join(tmpDir, `${name}dev.log`);
  await fs.writeFile(logPath, '');
  await fs.rm(browserJsonPath, { force: true });
  await fs.rm(browserErrPath, { force: true });

  const fullCmd = `${command} --port ${port}`;
  const logFd = await fs.open(logPath, 'a');
  const child = runShell(fullCmd);
  child.stdout?.on('data', (d: Buffer) => {
    void logFd.write(d);
  });
  child.stderr?.on('data', (d: Buffer) => {
    void logFd.write(d);
  });
  console.log(`[${name}] server pid=${child.pid}`);

  // Wait for the ready line (poll the log file rather than the stream so
  // late-attaching subprocesses can still satisfy the regex).
  const t0 = Date.now();
  const readyDeadline = t0 + 240_000;
  let ready = false;
  while (Date.now() < readyDeadline) {
    let log = '';
    try {
      log = await fs.readFile(logPath, 'utf8');
    } catch {
      // file may not exist yet
    }
    if (readyRegex.test(log)) {
      ready = true;
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  const t1 = Date.now();
  if (!ready) {
    console.error(`[${name}] dev server did not become ready in ${t1 - t0} ms`);
    await killTree(child.pid);
    process.exit(1);
  }
  console.log(`[${name}] server ready in ${t1 - t0} ms`);
  await new Promise(r => setTimeout(r, 2000));

  // Resource sampler: runs concurrently with the browser harness, exits
  // when the cdp_bench child process exits and the runner sets
  // samplerStop. We deliberately do NOT short-circuit on the existence
  // of browserJsonPath — that file is opened (and thus exists) before
  // cdp_bench starts navigating, so checking for it would stop the
  // sampler within the first tick and miss the entire navigation +
  // reload window.
  const samples: string[] = ['ts_ms,role,pid,rss_kb,cpu_pct'];
  let samplerStop = false;
  const samplerDone = (async (): Promise<void> => {
    while (!samplerStop) {
      const ts = Date.now();
      let serverStat: ProcTotals = { rssKb: 0, cpuPct: 0, samples: 0 };
      try {
        // Sample the dev-server shell + all its descendants. The shell
        // itself is just a few MB; the actual rsbuild/vite/storybook
        // node processes show up as children.
        const serverPids = await listDescendantPids(child.pid as number);
        serverStat = await sampleProcessTotals(serverPids);
      } catch {
        // child may have exited
      }
      const chromiumPids = await listChromiumPids();
      const chromiumStat = await sampleProcessTotals(chromiumPids);
      if (serverStat.rssKb > 0)
        samples.push(`${ts},server,${child.pid},${serverStat.rssKb},${serverStat.cpuPct.toFixed(1)}`);
      if (chromiumStat.rssKb > 0)
        samples.push(`${ts},chromium,0,${chromiumStat.rssKb},${chromiumStat.cpuPct.toFixed(1)}`);
      await new Promise(r => setTimeout(r, 200));
    }
  })();

  // Run the CDP browser harness as a child node process so its lifecycle
  // is independent from this script.
  const cdpScript = path.join(__dirname, 'cdp_bench.ts');
  const targetUrl = `http://localhost:${port}${urlPath}`;
  await new Promise<void>((resolve, reject) => {
    const out = spawn(process.execPath, ['--experimental-strip-types', cdpScript, targetUrl], {
      cwd: __dirname,
      env: process.env,
    });
    void Promise.all([fs.open(browserJsonPath, 'w'), fs.open(browserErrPath, 'w')]).then(([o, e]) => {
      out.stdout.on('data', (d: Buffer) => {
        void o.write(d);
      });
      out.stderr.on('data', (d: Buffer) => {
        void e.write(d);
      });
      out.on('exit', code => {
        void Promise.all([o.close(), e.close()]).then(() => {
          if (code === 0) resolve();
          else reject(new Error(`cdp_bench exited with ${code}`));
        });
      });
    });
  });

  samplerStop = true;
  await samplerDone;
  await fs.writeFile(samplesPath, samples.join('\n') + '\n');

  // Print the same summary the bash version did.
  let result: BrowserResult;
  try {
    result = JSON.parse(await fs.readFile(browserJsonPath, 'utf8')) as BrowserResult;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[${name}] could not parse cdp_bench output: ${msg}`);
    await killTree(child.pid);
    process.exit(1);
  }
  const k = (v: number | null | undefined): number | string => (v == null ? 'n/a' : v);
  console.log(`[${name}] browser metrics (summary):`);
  console.log(`  rendered= ${result.rendered} ; reloadRendered= ${result.reloadRendered}`);
  console.log(
    `  cold load= ${k(result.cold.load_ms)} ms; DCL= ${k(result.cold.domContentLoaded_ms)} ms; netIdle= ${k(result.cold.networkIdle_ms)} ms`
  );
  console.log(
    `  cold reqs= ${result.cold.requests} ; bytes= ${(result.cold.bytesReceived / 1e6).toFixed(2)} MB`
  );
  console.log(
    `  reload load= ${k(result.reload.load_ms)} ms; reqs= ${result.reload.requests} ; bytes= ${(result.reload.bytesReceived / 1e6).toFixed(2)} MB`
  );
  const heap = result.heap;
  const fcp = heap?.fcp != null ? heap.fcp.toFixed(0) : 'n/a';
  const lcp = heap?.lcp != null ? heap.lcp.toFixed(0) : 'n/a';
  console.log(
    `  fcp= ${fcp} ms; lcp= ${lcp} ms; jsHeap= ${((heap?.used || 0) / 1e6).toFixed(1)} MB; domNodes= ${heap?.domNodes ?? 'n/a'}`
  );
  const m = result.performance ?? {};
  const fmt = (v: number | undefined): string => (typeof v === 'number' ? v.toFixed(3) : 'n/a');
  console.log(
    `  scriptDuration= ${fmt(m.ScriptDuration)} s; layoutDuration= ${fmt(m.LayoutDuration)} s; v8CompileDuration= ${fmt(m.V8CompileDuration)} s`
  );

  // Resource-sampling summary. Pure formatting lives in the lib so it
  // can be unit-tested; we just feed it the parsed samples.
  console.log(formatSamplingBlock(name, parseSamplesCsv(samples.join('\n'))));

  // Tear down dev server.
  await killTree(child.pid);
  // Best-effort kill of any orphan headless chromium processes.
  for (const pid of await listChromiumPids()) {
    await killTree(pid).catch(() => {});
  }
  await new Promise(r => setTimeout(r, 1500));
}

main().catch(async (e: unknown) => {
  const msg = e instanceof Error ? e.stack || e.message : String(e);
  console.error(msg);
  process.exit(1);
});
