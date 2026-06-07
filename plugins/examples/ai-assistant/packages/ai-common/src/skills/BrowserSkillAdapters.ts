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

import type {
  SkillFileSystem,
  SkillHttpClient,
  SkillZipExtractor,
} from './SkillLoader';
import { MAX_ZIP_EXTRACTED_BYTES, MAX_ZIP_FILE_COUNT } from './SkillLoader';
import type { ParsedSkill } from './skillParser';

/**
 * Browser-compatible HTTP client for fetching skill zip archives from GitHub.
 *
 * Uses the Fetch API (available in all modern browsers) to download
 * GitHub zipball archives. CORS is supported by the GitHub API.
 */
export function createFetchHttpClient(): SkillHttpClient {
  return {
    fetchZip: async (url: string): Promise<ArrayBuffer> => {
      const response = await fetch(url, {
        headers: { Accept: 'application/vnd.github+json' },
        redirect: 'follow',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
      }
      return response.arrayBuffer();
    },
  };
}

/**
 * Browser-compatible ZIP extractor using JSZip.
 *
 * Extracts `.md` files from GitHub-style zip archives (which have a
 * top-level `owner-repo-sha/` directory prefix). Enforces size and
 * file count limits to prevent zip bomb attacks.
 *
 * Works in both browser and Node.js environments since JSZip is
 * a pure JavaScript implementation.
 */
export function createJSZipExtractor(): SkillZipExtractor {
  return {
    extractTextFiles: async (
      data: ArrayBuffer,
      pathFilter?: string,
      maxExtractedBytes: number = MAX_ZIP_EXTRACTED_BYTES,
      maxFileCount: number = MAX_ZIP_FILE_COUNT
    ): Promise<Map<string, string>> => {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(data);
      const result = new Map<string, string>();
      let totalBytes = 0;
      let fileCount = 0;

      // GitHub zips have a top-level directory like "owner-repo-sha/"
      const entries = Object.keys(zip.files).sort();
      const topLevelPrefix =
        entries.length > 0 ? entries[0].split('/')[0] + '/' : '';

      for (const entryPath of entries) {
        const entry = zip.files[entryPath];
        if (entry.dir) continue;

        // Strip the top-level GitHub directory prefix
        let relativePath = entryPath;
        if (topLevelPrefix && relativePath.startsWith(topLevelPrefix)) {
          relativePath = relativePath.slice(topLevelPrefix.length);
        }

        // Apply path filter if provided
        if (pathFilter && !relativePath.startsWith(pathFilter)) continue;

        // Only extract .md files
        if (!relativePath.endsWith('.md')) continue;

        const content = await entry.async('string');
        totalBytes += content.length;
        fileCount++;

        if (totalBytes > maxExtractedBytes) {
          throw new Error(`Exceeded max extracted size: ${maxExtractedBytes} bytes`);
        }
        if (fileCount > maxFileCount) {
          throw new Error(`Exceeded max file count: ${maxFileCount}`);
        }

        // Strip the path filter prefix from the relative path
        const cleanPath = pathFilter
          ? relativePath.slice(pathFilter.length).replace(/^\//, '')
          : relativePath;

        if (cleanPath) {
          result.set(cleanPath, content);
        }
      }

      return result;
    },
  };
}

/**
 * No-op filesystem for environments without filesystem access (browser).
 *
 * All operations return empty results. Local skill directories are only
 * available in desktop/CLI mode — browser mode only supports GitHub
 * repository sources.
 */
export function createNoopFileSystem(): SkillFileSystem {
  return {
    exists: async () => false,
    readdir: async () => [],
    readFile: async (path: string) => {
      throw new Error(`Cannot read file in browser: ${path}`);
    },
    isDirectory: async () => false,
    joinPath: (...segments: string[]) => segments.join('/'),
  };
}

/** Cache entry stored in IndexedDB. */
interface SkillCacheEntry {
  /** Cache key (source URL + ref + path). */
  key: string;
  /** Serialized ParsedSkill array. */
  skills: string;
  /** Timestamp when the entry was cached. */
  cachedAt: number;
}

const DB_NAME = 'headlamp-ai-skills';
const DB_VERSION = 1;
const STORE_NAME = 'skills';

/**
 * Opens (or creates) the IndexedDB database for skill caching.
 */
function openSkillsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * IndexedDB-backed cache for parsed skills.
 *
 * Persists downloaded and parsed skills in the browser so they survive
 * page reloads. Each source is stored separately, keyed by
 * `{type}:{url}:{ref}:{path}`.
 *
 * Falls back gracefully: if IndexedDB is unavailable (e.g. private
 * browsing in some browsers), all operations return null/resolve
 * without error.
 */
export class BrowserSkillCache {
  private cacheTtlMs: number;

  /**
   * @param cacheTtlMs - How long cached skills remain valid (default: 1 hour).
   */
  constructor(cacheTtlMs: number = 60 * 60 * 1000) {
    this.cacheTtlMs = cacheTtlMs;
  }

  /**
   * Retrieves cached skills for a source key.
   *
   * @param key - Source cache key.
   * @returns Parsed skill objects, or null if not cached or expired.
   */
  async get(key: string): Promise<ParsedSkill[] | null> {
    try {
      const db = await openSkillsDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          const entry = request.result as SkillCacheEntry | undefined;
          if (!entry) {
            resolve(null);
            return;
          }
          if (Date.now() - entry.cachedAt > this.cacheTtlMs) {
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(entry.skills));
          } catch {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  /**
   * Stores parsed skills for a source key.
   *
   * @param key - Source cache key.
   * @param skills - Parsed skill objects to cache.
   */
  async set(key: string, skills: ParsedSkill[]): Promise<void> {
    try {
      const db = await openSkillsDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const entry: SkillCacheEntry = {
          key,
          skills: JSON.stringify(skills),
          cachedAt: Date.now(),
        };
        const request = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // IndexedDB not available — skip silently
    }
  }

  /**
   * Removes all cached skills.
   */
  async clear(): Promise<void> {
    try {
      const db = await openSkillsDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // IndexedDB not available — skip silently
    }
  }
}

/**
 * Builds a cache key for a skill source configuration.
 *
 * @param type - Source type ('local' or 'git').
 * @param url - Source URL or path.
 * @param ref - Git ref (optional).
 * @param path - Subdirectory path (optional).
 * @returns A stable string key for cache lookups.
 */
export function buildSourceCacheKey(
  type: string,
  url: string,
  ref?: string,
  path?: string
): string {
  return `${type}:${url}:${ref || ''}:${path || ''}`;
}
