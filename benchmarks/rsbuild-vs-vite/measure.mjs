// Cross-platform port of measure.sh. Spawns a dev server, waits for its
// "ready" log line, samples server + chromium RSS/CPU while a CDP-driven
// browser load runs against it, then tears it all down.
//
// Usage:
//   node measure.mjs <name> <command> <port> <readyRegex> [urlPath]
//
// `command` is a single string like "npx --no-install rsbuild dev"; we
// append `--port <port>` and run it through the user's shell so npx works
// the same way it does on bash and Windows cmd. `readyRegex` is a JS
// regex matched against the dev server's stdout/stderr.
//
// On Windows we use `tree-kill` to kill the whole process tree (the
// `child.kill()` call only kills the shell, leaving npx + node orphaned).
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import treeKill from 'tree-kill';
import pidusage from 'pidusage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const frontendDir = path.join(repoRoot, 'frontend');

function nowMs() {
  return Date.now();
}

function killTree(pid) {
  return new Promise(resolve => treeKill(pid, 'SIGKILL', () => resolve()));
}

async function listDescendantPids(rootPid) {
  // Walk the process tree downward from rootPid. Returns rootPid + all
  // descendants. Best-effort across platforms.
  const all = [rootPid];
  const { execSync } = await import('node:child_process');
  if (process.platform === 'win32') {
    try {
      const out = execSync('wmic process get ProcessId,ParentProcessId', {
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString();
      const edges = [];
      for (const line of out.split(/\r?\n/).slice(1)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) continue;
        const ppid = Number(parts[0]);
        const pid = Number(parts[1]);
        if (Number.isFinite(ppid) && Number.isFinite(pid)) edges.push([ppid, pid]);
      }
      const queue = [rootPid];
      while (queue.length) {
        const p = queue.shift();
        for (const [pp, c] of edges) {
          if (pp === p && !all.includes(c)) {
            all.push(c);
            queue.push(c);
          }
        }
      }
      return all;
    } catch {
      return all;
    }
  }
  try {
    const out = execSync('ps -A -o pid=,ppid=', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const edges = [];
    for (const line of out.split('\n')) {
      const m = line.trim().match(/^(\d+)\s+(\d+)$/);
      if (!m) continue;
      edges.push([Number(m[2]), Number(m[1])]); // [ppid, pid]
    }
    const queue = [rootPid];
    while (queue.length) {
      const p = queue.shift();
      for (const [pp, c] of edges) {
        if (pp === p && !all.includes(c)) {
          all.push(c);
          queue.push(c);
        }
      }
    }
    return all;
  } catch {
    return all;
  }
}

async function listChromiumPids() {
  // Walk /proc on Linux; use ps on macOS; use wmic on Windows. We avoid
  // shelling out for this in the common case (Linux/macOS) by using
  // `ps -A -o pid,comm` which exists on both.
  if (process.platform === 'win32') {
    const { execSync } = await import('node:child_process');
    try {
      const out = execSync(
        'wmic process where "name like \'chrome%\' or name like \'chromium%\' or name like \'headless_shell%\'" get ProcessId',
        { stdio: ['ignore', 'pipe', 'ignore'] }
      ).toString();
      return out
        .split(/\r?\n/)
        .map(l => Number(l.trim()))
        .filter(n => Number.isFinite(n) && n > 0);
    } catch {
      return [];
    }
  }
  const { execSync } = await import('node:child_process');
  try {
    const out = execSync('ps -A -o pid=,comm=', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const pids = [];
    for (const line of out.split('\n')) {
      const m = line.match(/^\s*(\d+)\s+(.*)$/);
      if (!m) continue;
      const comm = m[2].toLowerCase();
      // Playwright ships the binary as `headless_shell` on Linux and
      // `Chromium` / `Google Chrome for Testing` on macOS.
      if (
        comm.includes('chromium') ||
        comm.includes('chrome') ||
        comm.includes('headless_shell')
      )
        pids.push(Number(m[1]));
    }
    return pids;
  } catch {
    return [];
  }
}

async function sampleProcessTotals(pids) {
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

function runShell(cmd) {
  // Use the platform's shell so `npx` resolves correctly on Windows. Spawn
  // detached on POSIX so we can kill the whole process tree.
  if (process.platform === 'win32') {
    return spawn(cmd, { shell: true, cwd: frontendDir, env: process.env });
  }
  return spawn(cmd, { shell: true, cwd: frontendDir, env: process.env, detached: true });
}

async function main() {
  const [, , name, command, portStr, readyRegexStr, urlPath = '/'] = process.argv;
  if (!name || !command || !portStr || !readyRegexStr) {
    console.error('Usage: node measure.mjs <name> <command> <port> <readyRegex> [urlPath]');
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
  child.stdout.on('data', d => logFd.write(d));
  child.stderr.on('data', d => logFd.write(d));
  console.log(`[${name}] server pid=${child.pid}`);

  // Wait for the ready line (poll the log file rather than the stream so
  // late-attaching subprocesses can still satisfy the regex).
  const t0 = nowMs();
  const readyDeadline = t0 + 240_000;
  let ready = false;
  while (nowMs() < readyDeadline) {
    let log;
    try {
      log = await fs.readFile(logPath, 'utf8');
    } catch {
      log = '';
    }
    if (readyRegex.test(log)) {
      ready = true;
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  const t1 = nowMs();
  if (!ready) {
    console.error(`[${name}] dev server did not become ready in ${t1 - t0} ms`);
    await killTree(child.pid);
    process.exit(1);
  }
  console.log(`[${name}] server ready in ${t1 - t0} ms`);
  await new Promise(r => setTimeout(r, 2000));

  // Resource sampler: runs concurrently with the browser harness, exits
  // when the browser writes its result file.
  const samples = ['ts_ms,role,pid,rss_kb,cpu_pct'];
  let samplerStop = false;
  const samplerDone = (async () => {
    while (!samplerStop) {
      try {
        await fs.access(browserJsonPath);
        break;
      } catch {
        // continue sampling
      }
      const ts = Date.now();
      let serverStat = { rssKb: 0, cpuPct: 0 };
      try {
        // Sample the dev-server shell + all its descendants. The shell
        // itself is just a few MB; the actual rsbuild/vite/storybook
        // node processes show up as children.
        const serverPids = await listDescendantPids(child.pid);
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

  // Run the CDP browser harness.
  const cdpScript = path.join(__dirname, 'cdp_bench.mjs');
  const targetUrl = `http://localhost:${port}${urlPath}`;
  await new Promise((resolve, reject) => {
    const out = spawn(process.execPath, [cdpScript, targetUrl], {
      cwd: __dirname,
      env: process.env,
    });
    const outFd = fs.open(browserJsonPath, 'w');
    const errFd = fs.open(browserErrPath, 'w');
    Promise.all([outFd, errFd]).then(([o, e]) => {
      out.stdout.on('data', d => o.write(d));
      out.stderr.on('data', d => e.write(d));
      out.on('exit', async code => {
        await Promise.all([o.close(), e.close()]);
        if (code === 0) resolve();
        else reject(new Error(`cdp_bench exited with ${code}`));
      });
    });
  });

  samplerStop = true;
  await samplerDone;
  await fs.writeFile(samplesPath, samples.join('\n') + '\n');

  // Print the same summary the bash version did.
  let result;
  try {
    result = JSON.parse(await fs.readFile(browserJsonPath, 'utf8'));
  } catch (e) {
    console.error(`[${name}] could not parse cdp_bench output: ${e.message}`);
    await killTree(child.pid);
    process.exit(1);
  }
  const k = v => (v == null ? 'n/a' : v);
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
  const heap = result.heap || {};
  const fcp = heap.fcp != null ? heap.fcp.toFixed(0) : 'n/a';
  const lcp = heap.lcp != null ? heap.lcp.toFixed(0) : 'n/a';
  console.log(
    `  fcp= ${fcp} ms; lcp= ${lcp} ms; jsHeap= ${((heap.used || 0) / 1e6).toFixed(1)} MB; domNodes= ${heap.domNodes}`
  );
  const m = result.performance || {};
  const fmt = v => (typeof v === 'number' ? v.toFixed(3) : 'n/a');
  console.log(
    `  scriptDuration= ${fmt(m.ScriptDuration)} s; layoutDuration= ${fmt(m.LayoutDuration)} s; v8CompileDuration= ${fmt(m.V8CompileDuration)} s`
  );

  // Resource-sampling summary.
  const stats = role => {
    const rs = [];
    const cs = [];
    for (const line of samples.slice(1)) {
      const [, r, , rss, cpu] = line.split(',');
      if (r !== role) continue;
      const rk = Number(rss);
      const ck = Number(cpu);
      if (rk > 0) rs.push(rk);
      if (ck > 0) cs.push(ck);
    }
    if (!rs.length) return `  ${role}: no samples`;
    const peak = Math.max(...rs);
    const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
    const cPeak = cs.length ? Math.max(...cs) : 0;
    const cMean = cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length : 0;
    return `  ${role}: RSS peak=${(peak / 1024).toFixed(0)}MB  mean=${(mean / 1024).toFixed(0)}MB | CPU peak=${cPeak.toFixed(0)}%  mean=${cMean.toFixed(0)}%`;
  };
  console.log(`[${name}] resource sampling during navigation+reload:`);
  console.log(stats('server'));
  console.log(stats('chromium'));

  // Tear down dev server.
  await killTree(child.pid);
  // Best-effort kill of any orphan headless chromium processes.
  for (const pid of await listChromiumPids()) {
    await killTree(pid).catch(() => {});
  }
  await new Promise(r => setTimeout(r, 1500));
}

main().catch(async e => {
  console.error(e.stack || e.message || String(e));
  process.exit(1);
});
