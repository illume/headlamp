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

/// <reference types="vitest" />
import { type Plugin } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';
import { coverageConfigDefaults } from 'vitest/config';
import viteConfig from './vite.config';

const STORYBOOK_SHARD_COUNT = 12;

const storybookShards = Array.from({ length: STORYBOOK_SHARD_COUNT }, (_, i) => ({
  extends: true,
  test: {
    name: `storybook-${i}`,
    include: ['src/storybook.test.tsx'],
    env: {
      STORYBOOK_SHARD: String(i),
    },
  },
}));

// Vite plugin that strips broken sourceMappingURL comments from monaco-editor files.
// The ESM build of marked.js inside monaco-editor references a UMD source map that doesn't exist.
function stripBrokenSourceMaps(): Plugin {
  return {
    name: 'strip-broken-source-maps',
    enforce: 'pre',
    async load(id) {
      if (id.includes('node_modules/monaco-editor') && id.endsWith('.js')) {
        try {
          const { readFile } = await import('fs/promises');
          const code = await readFile(id, 'utf-8');
          if (code.includes('sourceMappingURL')) {
            return {
              code: code.replace(/\/\/# sourceMappingURL=.*$/m, ''),
              map: null,
            };
          }
        } catch {
          // fall through to default loading
        }
      }
    },
  };
}

export default mergeConfig(
  viteConfig,
  defineConfig({
    plugins: [stripBrokenSourceMaps()],
    test: {
      globals: true,
      environment: 'jsdom',
      env: {
        UNDER_TEST: 'true',
      },
      alias: [
        {
          find: /^monaco-editor$/,
          replacement: __dirname + '/node_modules/monaco-editor/esm/vs/editor/editor.api',
        },
      ],
      fakeTimers: {
        toFake: ['Date', 'setTimeout', 'clearTimeout'],
      },
      coverage: {
        provider: 'istanbul',
        reporter: [['text', { maxCols: 200 }], ['html']],
        exclude: [
          ...coverageConfigDefaults.exclude,
          'node_modules/**',
          'build/**',
          'src/**/*.stories*.{js,jsx,ts,tsx}',
        ],
        include: ['src/**/*.{js,jsx,ts,tsx}'],
      },
      restoreMocks: false,
      setupFiles: ['./src/setupTests.ts'],
      workspace: [
        {
          extends: true,
          test: {
            name: 'unit',
            include: ['src/**/*.test.{ts,tsx}'],
            exclude: ['**/node_modules/**', '**/dist/**', 'src/storybook.test.tsx'],
          },
        },
        ...storybookShards,
      ],
    },
  })
);
