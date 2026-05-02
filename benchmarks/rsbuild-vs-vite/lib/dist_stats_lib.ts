// Pure helpers for the dist-size benchmark. Split out of `dist_stats.ts`
// so they can be unit-tested without a real `build/` directory.
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface FileEntry {
  path: string;
  size: number;
}

export interface DistStats {
  files: number;
  raw_bytes: number;
  br_files: number;
  br_bytes: number;
  /** [size, posix-relative path] tuples, largest first. */
  top10: Array<[number, string]>;
}

/**
 * Recursively walk `dir`, returning every regular file as
 * `{ path, size }`. Symlinks and unreadable entries are silently
 * skipped. Order is unspecified.
 *
 * @param dir Directory to walk (may not exist; result is then `[]`).
 */
export async function walkFiles(dir: string): Promise<FileEntry[]> {
  const out: FileEntry[] = [];
  const stack: string[] = [dir];
  while (stack.length) {
    const d = stack.pop() as string;
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
          // unreadable — skip
        }
      }
    }
  }
  return out;
}

/**
 * Summarise a list of files into the dist-stats output shape: counts
 * and totals split by raw-vs-brotli (`.br` sidecars), plus the top-N
 * largest non-brotli files (POSIX-style relative paths).
 *
 * Pure: deterministic for a given (files, root, topN) input.
 */
export function summarise(files: FileEntry[], root: string, topN = 10): DistStats {
  let total = 0;
  let br = 0;
  let nFiles = 0;
  let nBr = 0;
  const largest: Array<[number, string]> = [];
  for (const f of files) {
    if (f.path.endsWith('.br')) {
      br += f.size;
      nBr += 1;
    } else {
      total += f.size;
      nFiles += 1;
      const rel = path.relative(root, f.path).split(path.sep).join('/');
      largest.push([f.size, rel]);
    }
  }
  // Stable secondary sort on path so ties don't shuffle between runs.
  largest.sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1]));
  return {
    files: nFiles,
    raw_bytes: total,
    br_files: nBr,
    br_bytes: br,
    top10: largest.slice(0, topN),
  };
}
