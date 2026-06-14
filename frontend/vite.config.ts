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
import svgr from 'vite-plugin-svgr';
import { viteStaticCopy } from "vite-plugin-static-copy";

// Use environment variable for backend port, defaulting to 4466
const backendPort = process.env.HEADLAMP_PORT || '4466';
const backendTarget = `http://localhost:${backendPort}`;
const underTest = process.env.UNDER_TEST === 'true' || process.env.VITEST === 'true';

// Shared proxy error handler to avoid repeated [http-proxy-middleware] noise
// when the backend server is not yet running.
function proxyErrorHandler(proxy: any) {
  proxy.on('error', (err: NodeJS.ErrnoException, _req: any, res: any) => {
    const msg = err.code || err.message;
    if (res && typeof res.writeHead === 'function' && !res.writableEnded) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`Backend not reachable (${msg})`);
    }
  });
}

export default defineConfig({
  define: {
    global: 'globalThis',
    'import.meta.env.UNDER_TEST': JSON.stringify(underTest),
  },
  envPrefix: 'REACT_APP_',
  base: process.env.PUBLIC_URL,
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/clusters': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/plugins': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/user-plugins': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/static-plugins': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/config': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/auth': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/oidc': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/oidc-callback': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/wsMultiplexer': {
        target: backendTarget,
        changeOrigin: true,
        ws: true,
        configure: proxyErrorHandler,
      },
      '/externalproxy': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/drain-node': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/drain-node-status': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/parseKubeConfig': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/cluster': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/metrics': {
        target: backendTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
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
          plugins: [{ removeViewBox: false }],
        },
        titleProp: true,
        ref: true,
      },
    }),
    react(),
    nodePolyfills({
      include: ['process', 'buffer', 'stream'],
    }),
    // Make sure we copy the minified monaco-editor source into the static folder
    // since it's loaded dynamically and not bundled via ESM. We do it this way
    // to support setting the localization language
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/monaco-editor/min/vs",
          dest: "assets", // copies to assets/vs
        },
      ],
    }),
  ],
  build: {
    outDir: 'build',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // Exclude @axe-core from production bundle
      external: ['@axe-core/react'],
      output: {
        manualChunks(id: string) {
          // Build smaller chunks for @mui, lodash, xterm, recharts
          if (id.includes('node_modules')) {
            if (id.includes('lodash')) {
              return 'vendor-lodash';
            }

            if (id.includes('@mui/material')) {
              return 'vendor-mui';
            }

            if (id.includes('xterm')) {
              return 'vendor-xterm';
            }

            if (id.includes('recharts')) {
              return 'vendor-recharts';
            }
          }
        },
      },
    },
  },
});
