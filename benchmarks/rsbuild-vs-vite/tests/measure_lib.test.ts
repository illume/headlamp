// Unit tests for the measure-harness pure helpers. Runs via
// `node --test` (built-in test runner, no extra deps).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePsCommOutput,
  filterChromiumPids,
  parsePsPpidOutput,
  descendantsOf,
  parseSamplesCsv,
  summariseSamples,
  formatSamplingBlock,
  type Sample,
} from '../lib/measure_lib.ts';

describe('parsePsCommOutput', () => {
  it('parses Linux/macOS `ps -A -o pid=,comm=` rows', () => {
    const text = `  100 node\n  101 headless_shell\n  102 sh\n`;
    assert.deepEqual(parsePsCommOutput(text), [
      { pid: 100, comm: 'node' },
      { pid: 101, comm: 'headless_shell' },
      { pid: 102, comm: 'sh' },
    ]);
  });

  it('skips blank and malformed lines', () => {
    assert.deepEqual(parsePsCommOutput('\n  not_a_row\n  42 foo\n'), [{ pid: 42, comm: 'foo' }]);
  });

  it('returns [] for empty input', () => {
    assert.deepEqual(parsePsCommOutput(''), []);
  });
});

describe('filterChromiumPids', () => {
  it('matches headless_shell, chromium, and chrome (any case)', () => {
    const rows = [
      { pid: 1, comm: 'node' },
      { pid: 2, comm: 'headless_shell' },
      { pid: 3, comm: 'Chromium' },
      { pid: 4, comm: 'Google Chrome' },
      { pid: 5, comm: 'sh' },
    ];
    assert.deepEqual(filterChromiumPids(rows), [2, 3, 4]);
  });
});

describe('parsePsPpidOutput / descendantsOf', () => {
  it('walks a tree BFS', () => {
    const text = ` 100 1\n 101 100\n 102 100\n 103 101\n 104 102\n 200 1\n`;
    const edges = parsePsPpidOutput(text);
    assert.deepEqual(descendantsOf(100, edges), [100, 101, 102, 103, 104]);
  });

  it('returns [root] when root has no children', () => {
    assert.deepEqual(descendantsOf(42, []), [42]);
  });

  it('handles a cycle without infinite-looping', () => {
    // Pathological: a->b->a. We only keep each pid once.
    const edges: Array<readonly [number, number]> = [
      [1, 2],
      [2, 1],
    ];
    assert.deepEqual(descendantsOf(1, edges), [1, 2]);
  });
});

describe('parseSamplesCsv', () => {
  it('skips the header and parses typed rows', () => {
    const csv = `ts_ms,role,pid,rss_kb,cpu_pct\n1000,server,42,1024,12.5\n1100,chromium,0,2048,30\n`;
    assert.deepEqual(parseSamplesCsv(csv), [
      { ts_ms: 1000, role: 'server', rss_kb: 1024, cpu_pct: 12.5 },
      { ts_ms: 1100, role: 'chromium', rss_kb: 2048, cpu_pct: 30 },
    ]);
  });

  it('drops rows with unknown roles', () => {
    const csv = `ts_ms,role,pid,rss_kb,cpu_pct\n1,server,1,10,1\n2,bogus,1,10,1\n`;
    const out = parseSamplesCsv(csv);
    assert.equal(out.length, 1);
    assert.equal(out[0].role, 'server');
  });

  it('returns [] for empty input', () => {
    assert.deepEqual(parseSamplesCsv(''), []);
  });
});

describe('summariseSamples', () => {
  const samples: Sample[] = [
    { ts_ms: 1, role: 'server', rss_kb: 100 * 1024, cpu_pct: 10 },
    { ts_ms: 2, role: 'server', rss_kb: 200 * 1024, cpu_pct: 30 },
    { ts_ms: 3, role: 'server', rss_kb: 0, cpu_pct: 0 },
    { ts_ms: 4, role: 'chromium', rss_kb: 50 * 1024, cpu_pct: 5 },
  ];

  it('reports peak/mean RSS and CPU, ignoring zero readings', () => {
    const s = summariseSamples(samples, 'server');
    assert.ok(s);
    assert.equal(s!.rssPeakMb, 200);
    assert.equal(s!.rssMeanMb, 150);
    assert.equal(s!.cpuPeakPct, 30);
    assert.equal(s!.cpuMeanPct, 20);
    assert.equal(s!.n, 2);
  });

  it('returns null when a role has no non-zero RSS samples', () => {
    assert.deepEqual(
      summariseSamples([{ ts_ms: 1, role: 'chromium', rss_kb: 0, cpu_pct: 0 }], 'chromium'),
      null
    );
    // No samples at all for the role → null.
    assert.equal(summariseSamples(samples, 'server' as const) === null, false);
    assert.equal(summariseSamples([], 'server'), null);
  });
});

describe('formatSamplingBlock', () => {
  it('prints the [name] header + one line per role', () => {
    const samples: Sample[] = [
      { ts_ms: 1, role: 'server', rss_kb: 1024, cpu_pct: 50 },
      { ts_ms: 2, role: 'server', rss_kb: 2048, cpu_pct: 60 },
    ];
    const out = formatSamplingBlock('rsbuild', samples);
    const lines = out.split('\n');
    assert.equal(lines.length, 3);
    assert.equal(lines[0], '[rsbuild] resource sampling during navigation+reload:');
    assert.match(lines[1], /^ {2}server: RSS peak=2MB +mean=2MB \| CPU peak=60% +mean=55%$/);
    assert.equal(lines[2], '  chromium: no samples');
  });
});
