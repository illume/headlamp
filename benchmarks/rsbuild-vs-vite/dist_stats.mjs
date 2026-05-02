// Cross-platform port of dist_stats.py. Usage: node dist_stats.mjs <dir>
// Emits a JSON document on stdout summarizing file count, raw bytes,
// brotli-sidecar bytes, and the top 10 largest files.
import { promises as fs } from 'node:fs';
import path from 'node:path';

async function walk(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) {
        try {
          const st = await fs.stat(p);
          out.push({ path: p, size: st.size });
        } catch {
          // skip
        }
      }
    }
  }
  return out;
}

async function main() {
  const root = process.argv[2];
  if (!root) {
    console.error('Usage: node dist_stats.mjs <dir>');
    process.exit(2);
  }
  const files = await walk(root);
  let total = 0;
  let br = 0;
  let nFiles = 0;
  let nBr = 0;
  const largest = [];
  for (const f of files) {
    if (f.path.endsWith('.br')) {
      br += f.size;
      nBr += 1;
    } else {
      total += f.size;
      nFiles += 1;
      largest.push([f.size, path.relative(root, f.path).split(path.sep).join('/')]);
    }
  }
  largest.sort((a, b) => b[0] - a[0]);
  const result = {
    files: nFiles,
    raw_bytes: total,
    br_files: nBr,
    br_bytes: br,
    top10: largest.slice(0, 10),
  };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
