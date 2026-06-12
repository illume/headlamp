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

import baseConfig from '@kinvolk/headlamp-plugin/config/vite.config.mjs';
import { defineConfig, mergeConfig } from 'vite';

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [
      {
        // headlamp-plugin start forces sourcemap:'inline', which inlines ~10 MB
        // of source maps into main.js (inflating it from ~2.9 MB to ~16.9 MB).
        // Override to use a separate .map file instead.
        name: 'headlamp-separate-sourcemaps',
        config(config) {
          if (config.build?.sourcemap === 'inline') {
            return { build: { sourcemap: true } };
          }
        },
      },
    ],
    server: {
      watch: {
        // Watch the local workspace packages so `headlamp-plugin start`
        // rebuilds when ai-common or ai-ui source files change.
        ignored: ['!**/node_modules/@headlamp-k8s/**'],
      },
    },
    // Also needed: tell Vite not to pre-bundle these so changes are picked up.
    optimizeDeps: {
      exclude: ['@headlamp-k8s/ai-common', '@headlamp-k8s/ai-ui'],
    },
    resolve: {
      alias: [
        {
          // langsmith is pulled in by @langchain/core for optional tracing but
          // is never used directly. Stubbing it out saves ~345 KB.
          find: /^langsmith(\/.*)?$/,
          replacement: new URL('./stubs/langsmith.ts', import.meta.url).pathname,
        },
      ],
    },
  })
);
