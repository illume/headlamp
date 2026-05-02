// Pure helpers for the dev-server benchmark harness. Split out of
// `measure.ts` so they can be exercised by `node --test` without
// spawning real processes.

export interface PsRow {
  pid: number;
  comm: string;
}

export type Edge = readonly [ppid: number, pid: number];

export type Role = 'server' | 'chromium';

export interface Sample {
  ts_ms: number;
  role: Role;
  rss_kb: number;
  cpu_pct: number;
}

export interface RoleSummary {
  rssPeakMb: number;
  rssMeanMb: number;
  cpuPeakPct: number;
  cpuMeanPct: number;
  /** Number of non-zero RSS samples used to compute the stats. */
  n: number;
}

/**
 * Parse the output of `ps -A -o pid=,comm=` (Linux/macOS) into
 * `{pid, comm}` rows. Trailing whitespace and blank lines are
 * tolerated. Returns an empty array on malformed input.
 */
export function parsePsCommOutput(text: string): PsRow[] {
  const rows: PsRow[] = [];
  for (const line of String(text).split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(.*?)\s*$/);
    if (!m) continue;
    rows.push({ pid: Number(m[1]), comm: m[2] });
  }
  return rows;
}

/**
 * Filter rows to chromium-family processes. Matches Playwright's
 * bundled `headless_shell` (Linux) plus the various `chrome` /
 * `Chromium` binaries on macOS and Windows.
 */
export function filterChromiumPids(rows: PsRow[]): number[] {
  return rows
    .filter(r => {
      const c = String(r.comm).toLowerCase();
      return c.includes('chromium') || c.includes('chrome') || c.includes('headless_shell');
    })
    .map(r => r.pid);
}

/**
 * Walk a process tree from `rootPid` downward given a flat list of
 * `[ppid, pid]` edges. Returns `[rootPid, ...descendants]` with each
 * pid appearing once. Order is BFS from the root.
 */
export function descendantsOf(rootPid: number, edges: Edge[]): number[] {
  const seen = new Set<number>([rootPid]);
  const out: number[] = [rootPid];
  const queue: number[] = [rootPid];
  while (queue.length) {
    const p = queue.shift() as number;
    for (const [pp, c] of edges) {
      if (pp === p && !seen.has(c)) {
        seen.add(c);
        out.push(c);
        queue.push(c);
      }
    }
  }
  return out;
}

/**
 * Parse `ps -A -o pid=,ppid=` (Linux/macOS) into `[ppid, pid]`
 * edges suitable for {@link descendantsOf}.
 */
export function parsePsPpidOutput(text: string): Edge[] {
  const edges: Edge[] = [];
  for (const line of String(text).split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(\d+)$/);
    if (!m) continue;
    edges.push([Number(m[2]), Number(m[1])]);
  }
  return edges;
}

/**
 * Compute peak / mean RSS (in MB) and CPU (in percent) for one role
 * across a list of samples. Samples with `rss_kb` or `cpu_pct` of 0
 * are excluded — this mirrors the old bash version and treats zero
 * as "process not yet observed". Returns `null` when there are no
 * non-zero RSS samples for the role.
 */
export function summariseSamples(samples: Sample[], role: Role): RoleSummary | null {
  const rs: number[] = [];
  const cs: number[] = [];
  for (const s of samples) {
    if (s.role !== role) continue;
    if (s.rss_kb > 0) rs.push(s.rss_kb);
    if (s.cpu_pct > 0) cs.push(s.cpu_pct);
  }
  if (rs.length === 0) return null;
  return {
    rssPeakMb: Math.max(...rs) / 1024,
    rssMeanMb: rs.reduce((a, b) => a + b, 0) / rs.length / 1024,
    cpuPeakPct: cs.length ? Math.max(...cs) : 0,
    cpuMeanPct: cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length : 0,
    n: rs.length,
  };
}

/**
 * Format the `[name] resource sampling …` block emitted by
 * `measure.ts`. Pure string transform.
 */
export function formatSamplingBlock(name: string, samples: Sample[]): string {
  const lines: string[] = [`[${name}] resource sampling during navigation+reload:`];
  for (const role of ['server', 'chromium'] as const) {
    const s = summariseSamples(samples, role);
    if (!s) {
      lines.push(`  ${role}: no samples`);
    } else {
      lines.push(
        `  ${role}: RSS peak=${s.rssPeakMb.toFixed(0)}MB  mean=${s.rssMeanMb.toFixed(0)}MB | ` +
          `CPU peak=${s.cpuPeakPct.toFixed(0)}%  mean=${s.cpuMeanPct.toFixed(0)}%`
      );
    }
  }
  return lines.join('\n');
}

/**
 * Parse the CSV the harness writes to disk (header + N data rows)
 * back into typed `Sample` records. Used by tests and any external
 * tooling that re-analyses a result directory.
 */
export function parseSamplesCsv(csv: string): Sample[] {
  const lines = String(csv).split('\n').filter(Boolean);
  if (!lines.length) return [];
  const samples: Sample[] = [];
  const start = lines[0].startsWith('ts_ms') ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const [ts, role, , rss, cpu] = lines[i].split(',');
    if (role !== 'server' && role !== 'chromium') continue;
    samples.push({
      ts_ms: Number(ts),
      role,
      rss_kb: Number(rss) || 0,
      cpu_pct: Number(cpu) || 0,
    });
  }
  return samples;
}
