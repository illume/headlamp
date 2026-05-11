// Unit tests for the dist-stats helpers. Runs via `node --test`
// (built-in test runner, no extra deps).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { walkFiles, summarise } from '../lib/dist_stats_lib.ts';

describe('walkFiles', () => {
  it('returns [] for a non-existent directory', async () => {
    const result = await walkFiles(path.join(os.tmpdir(), 'definitely-does-not-exist-xyz-' + Date.now()));
    assert.deepEqual(result, []);
  });

  it('returns all regular files, recursively', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'walkFiles-'));
    try {
      await fs.mkdir(path.join(root, 'sub', 'deep'), { recursive: true });
      await fs.writeFile(path.join(root, 'a.js'), 'aa');
      await fs.writeFile(path.join(root, 'sub', 'b.css'), 'bbbb');
      await fs.writeFile(path.join(root, 'sub', 'deep', 'c.html'), 'cccccc');

      const files = await walkFiles(root);
      const byName: Record<string, number> = {};
      for (const f of files) byName[path.basename(f.path)] = f.size;
      assert.equal(byName['a.js'], 2);
      assert.equal(byName['b.css'], 4);
      assert.equal(byName['c.html'], 6);
      assert.equal(files.length, 3);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

describe('summarise', () => {
  const root = '/build';
  const files = [
    { path: '/build/index.html', size: 1000 },
    { path: '/build/static/main.js', size: 500_000 },
    { path: '/build/static/main.js.br', size: 80_000 },
    { path: '/build/static/vendor.js', size: 7_000_000 },
    { path: '/build/static/vendor.js.br', size: 1_500_000 },
    { path: '/build/static/style.css', size: 200_000 },
  ];

  it('splits raw vs brotli totals', () => {
    const s = summarise(files, root);
    assert.equal(s.files, 4); // index.html + main.js + vendor.js + style.css
    assert.equal(s.br_files, 2);
    assert.equal(s.raw_bytes, 1000 + 500_000 + 7_000_000 + 200_000);
    assert.equal(s.br_bytes, 80_000 + 1_500_000);
  });

  it('returns top files largest first, with POSIX paths', () => {
    const s = summarise(files, root);
    assert.equal(s.top10[0][1], 'static/vendor.js');
    assert.equal(s.top10[0][0], 7_000_000);
    assert.equal(s.top10[1][1], 'static/main.js');
    // Brotli sidecars must NOT appear in top10.
    for (const [, p] of s.top10) {
      assert.ok(!p.endsWith('.br'), `top10 should not contain brotli sidecars, got ${p}`);
    }
  });

  it('respects topN', () => {
    const s = summarise(files, root, 2);
    assert.equal(s.top10.length, 2);
  });

  it('breaks ties deterministically by path', () => {
    const same = [
      { path: '/build/b', size: 100 },
      { path: '/build/a', size: 100 },
      { path: '/build/c', size: 100 },
    ];
    const s = summarise(same, '/build');
    assert.deepEqual(
      s.top10.map(t => t[1]),
      ['a', 'b', 'c']
    );
  });

  it('handles an empty input', () => {
    const s = summarise([], '/build');
    assert.deepEqual(s, {
      files: 0,
      raw_bytes: 0,
      br_files: 0,
      br_bytes: 0,
      top10: [],
    });
  });
});
