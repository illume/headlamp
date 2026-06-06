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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createFetchHttpClient,
  createJSZipExtractor,
  createNoopFileSystem,
  buildSourceCacheKey,
} from './BrowserSkillAdapters';

describe('BrowserSkillAdapters', () => {
  describe('createFetchHttpClient', () => {
    it('creates an HTTP client with fetchZip method', () => {
      const client = createFetchHttpClient();
      expect(client).toBeDefined();
      expect(typeof client.fetchZip).toBe('function');
    });

    it('calls fetch with correct headers', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockResponse as Response
      );

      const client = createFetchHttpClient();
      const result = await client.fetchZip('https://api.github.com/repos/owner/repo/zipball/main');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/zipball/main',
        {
          headers: { Accept: 'application/vnd.github+json' },
          redirect: 'follow',
        }
      );
      expect(result).toBe(mockArrayBuffer);
      fetchSpy.mockRestore();
    });

    it('throws on HTTP error', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const client = createFetchHttpClient();
      await expect(
        client.fetchZip('https://api.github.com/repos/owner/repo/zipball/main')
      ).rejects.toThrow('HTTP 404: Not Found');
      fetchSpy.mockRestore();
    });
  });

  describe('createJSZipExtractor', () => {
    it('creates a ZIP extractor with extractTextFiles method', () => {
      const extractor = createJSZipExtractor();
      expect(extractor).toBeDefined();
      expect(typeof extractor.extractTextFiles).toBe('function');
    });

    it('extracts .md files from a ZIP archive', async () => {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      // Simulate GitHub's top-level directory prefix
      zip.file('owner-repo-abc123/skills/SKILL.md', '# Test Skill\nContent here');
      zip.file('owner-repo-abc123/skills/helper.ts', 'export const x = 1;');
      zip.file('owner-repo-abc123/README.md', '# Repo README');

      const data = await zip.generateAsync({ type: 'arraybuffer' });
      const extractor = createJSZipExtractor();
      const result = await extractor.extractTextFiles(data);

      // Should include .md files but not .ts files
      expect(result.has('skills/SKILL.md')).toBe(true);
      expect(result.has('README.md')).toBe(true);
      expect(result.has('skills/helper.ts')).toBe(false);
      expect(result.get('skills/SKILL.md')).toBe('# Test Skill\nContent here');
    });

    it('applies path filter correctly', async () => {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      zip.file('owner-repo-abc123/skills/SKILL.md', '# Skill A');
      zip.file('owner-repo-abc123/docs/guide.md', '# Guide');

      const data = await zip.generateAsync({ type: 'arraybuffer' });
      const extractor = createJSZipExtractor();
      const result = await extractor.extractTextFiles(data, 'skills');

      expect(result.size).toBe(1);
      expect(result.has('SKILL.md')).toBe(true);
    });

    it('enforces max file count limit', async () => {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (let i = 0; i < 10; i++) {
        zip.file(`root/file${i}.md`, `content ${i}`);
      }

      const data = await zip.generateAsync({ type: 'arraybuffer' });
      const extractor = createJSZipExtractor();
      await expect(
        extractor.extractTextFiles(data, undefined, 10 * 1024 * 1024, 5)
      ).rejects.toThrow('Exceeded max file count');
    });

    it('enforces max extracted size limit', async () => {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      // Create a file larger than the limit
      zip.file('root/big.md', 'x'.repeat(1000));

      const data = await zip.generateAsync({ type: 'arraybuffer' });
      const extractor = createJSZipExtractor();
      await expect(
        extractor.extractTextFiles(data, undefined, 100, 500)
      ).rejects.toThrow('Exceeded max extracted size');
    });
  });

  describe('createNoopFileSystem', () => {
    it('creates a filesystem where nothing exists', async () => {
      const fs = createNoopFileSystem();
      expect(await fs.exists('/any/path')).toBe(false);
      expect(await fs.readdir('/any/path')).toEqual([]);
      expect(await fs.isDirectory('/any/path')).toBe(false);
    });

    it('throws on readFile', async () => {
      const fs = createNoopFileSystem();
      await expect(fs.readFile('/any/file.md')).rejects.toThrow('Cannot read file in browser');
    });

    it('joins paths with forward slashes', () => {
      const fs = createNoopFileSystem();
      expect(fs.joinPath('a', 'b', 'c')).toBe('a/b/c');
    });
  });

  describe('buildSourceCacheKey', () => {
    it('builds a key from all components', () => {
      expect(buildSourceCacheKey('git', 'https://github.com/owner/repo', 'v1.0', 'skills')).toBe(
        'git:https://github.com/owner/repo:v1.0:skills'
      );
    });

    it('handles missing optional components', () => {
      expect(buildSourceCacheKey('git', 'https://github.com/owner/repo')).toBe(
        'git:https://github.com/owner/repo::'
      );
    });

    it('produces different keys for different refs', () => {
      const key1 = buildSourceCacheKey('git', 'https://github.com/owner/repo', 'main');
      const key2 = buildSourceCacheKey('git', 'https://github.com/owner/repo', 'v2.0');
      expect(key1).not.toBe(key2);
    });
  });
});
