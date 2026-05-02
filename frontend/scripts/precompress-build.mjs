/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Walks the production build directory and writes <file>.br and <file>.gz
// sidecars next to every compressible asset above a small threshold.
// The Go backend (`pkg/spa`) negotiates Accept-Encoding and serves these
// precompressed files directly, so no on-the-fly compression is ever needed.

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const BUILD_DIR = path.resolve(process.argv[2] || 'build');
const MIN_BYTES = 1024; // skip tiny files: framing overhead dominates

// Extensions worth compressing. Everything else (png, woff2, jpg, ...) is
// already compressed and would only get bigger.
const COMPRESSIBLE = new Set([
  '.html', '.js', '.mjs', '.cjs', '.css', '.json', '.map',
  '.svg', '.txt', '.xml', '.wasm', '.ttf', '.eot', '.ico',
]);

const BROTLI_OPTS = {
  params: {
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
    [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
  },
};

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function shouldCompress(file, size) {
  if (size < MIN_BYTES) return false;
  if (file.endsWith('.br') || file.endsWith('.gz')) return false;
  return COMPRESSIBLE.has(path.extname(file).toLowerCase());
}

if (!fs.existsSync(BUILD_DIR)) {
  console.error(`precompress-build: build dir not found: ${BUILD_DIR}`);
  process.exit(1);
}

let rawTotal = 0;
let brTotal = 0;
let gzTotal = 0;
let count = 0;

for (const file of walk(BUILD_DIR)) {
  const stat = fs.statSync(file);
  if (!shouldCompress(file, stat.size)) continue;

  const data = fs.readFileSync(file);
  const br = zlib.brotliCompressSync(data, {
    params: {
      ...BROTLI_OPTS.params,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length,
    },
  });
  const gz = zlib.gzipSync(data, { level: 9 });

  // Only keep the sidecar if it's actually smaller than the original.
  // (Some pre-minified files don't compress further.)
  if (br.length < data.length) {
    fs.writeFileSync(file + '.br', br);
    brTotal += br.length;
  }
  if (gz.length < data.length) {
    fs.writeFileSync(file + '.gz', gz);
    gzTotal += gz.length;
  }

  rawTotal += data.length;
  count += 1;
}

const fmt = b => (b / 1024 / 1024).toFixed(2) + ' MB';
console.log(
  `precompress-build: ${count} files, raw ${fmt(rawTotal)} -> br ${fmt(brTotal)} / gz ${fmt(gzTotal)}`
);
