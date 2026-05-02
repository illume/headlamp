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

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import svgr from 'vite-plugin-svgr';

const backendPort = process.env.HEADLAMP_PORT || '4466';
const backendTarget = `http://localhost:${backendPort}`;

export default defineConfig({
  define: {
    global: 'globalThis',
  },
  envPrefix: 'REACT_APP_',
  base: process.env.PUBLIC_URL,
  server: {
    port: 3000,
    proxy: {
      ...Object.fromEntries(
        // Backend endpoints to proxy
        [
          'api',
          'clusters',
          'plugins',
          'config',
          'auth',
          'oidc',
          'oidc-callback',
          'externalproxy',
          'drain-node',
          'drain-node-status',
          'parseKubeConfig',
          'cluster',
          'metrics',
        ].map(name => ['/' + name, { target: backendTarget, changeOrigin: true }])
      ),
      '/wsMultiplexer': {
        target: backendTarget,
        changeOrigin: true,
        ws: true,
      },
    },
    cors: true,
  },
  plugins: [
    svgr({
      svgrOptions: {
        prettier: false,
        svgo: false,
        svgoConfig: {
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  removeViewBox: false,
                },
              },
            },
          ],
        },
        titleProp: true,
        ref: true,
      },
    }),
    react(),
    nodePolyfills({
      include: ['process', 'buffer', 'stream', 'path'],
    }),
    // Make sure we copy the minified monaco-editor source into the static folder
    // since it's loaded dynamically and not bundled via ESM. We do it this way
    // to support setting the localization language.
    //
    // Headlamp uses Monaco for YAML, JSON, and JavaScript (the Advanced
    // Search editor in `src/components/advancedSearch/ResourceSearch.tsx`
    // configures `monaco.languages.typescript.javascriptDefaults`, which is
    // backed by the `vs/language/typescript` worker bundle). Copy the editor
    // core plus those language services. Other basic-languages and the
    // css/html language services are intentionally omitted to keep the
    // served `assets/vs/` slim.
    viteStaticCopy({
      targets: [
        { src: 'node_modules/monaco-editor/min/vs/loader.js', dest: 'assets/vs/' },
        { src: 'node_modules/monaco-editor/min/vs/base', dest: 'assets/vs/' },
        { src: 'node_modules/monaco-editor/min/vs/editor', dest: 'assets/vs/' },
        {
          src: 'node_modules/monaco-editor/min/vs/basic-languages/yaml',
          dest: 'assets/vs/basic-languages/',
        },
        {
          src: 'node_modules/monaco-editor/min/vs/basic-languages/javascript',
          dest: 'assets/vs/basic-languages/',
        },
        {
          src: 'node_modules/monaco-editor/min/vs/basic-languages/typescript',
          dest: 'assets/vs/basic-languages/',
        },
        {
          src: 'node_modules/monaco-editor/min/vs/language/json',
          dest: 'assets/vs/language/',
        },
        {
          src: 'node_modules/monaco-editor/min/vs/language/typescript',
          dest: 'assets/vs/language/',
        },
        {
          src: 'node_modules/monaco-editor/min/vs/nls.messages.*.js',
          dest: 'assets/vs/',
        },
      ],
    }),
  ],
  build: {
    outDir: 'build',
  },
});
