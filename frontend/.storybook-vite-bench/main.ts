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

// Vite-builder Storybook config used ONLY by the rsbuild-vs-vite benchmark.
// Production / `npm run storybook` uses the rsbuild config at
// frontend/.storybook/main.ts. Keep this file in sync with that config so the
// comparison is apples-to-apples.

import type { StorybookConfig } from '@storybook/react-vite';

export default {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],

  addons: ['@storybook/addon-links', '@storybook/addon-docs'],

  core: {
    disableTelemetry: true,
  },

  docs: {},

  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },

  viteFinal: async config => {
    // Mirror the bits of frontend/vite.config.ts that stories need:
    // SVGR (`?react` import suffix), node polyfills, and the monaco static
    // copy. Kept in sync with frontend/.storybook/main.ts (rsbuild) so the
    // comparison is apples-to-apples.
    const { mergeConfig } = await import('vite');
    const svgr = (await import('vite-plugin-svgr')).default;
    const { nodePolyfills } = await import('vite-plugin-node-polyfills');
    const { viteStaticCopy } = await import('vite-plugin-static-copy');

    return mergeConfig(config, {
      define: {
        global: 'globalThis',
      },
      envPrefix: 'REACT_APP_',
      plugins: [
        svgr({
          svgrOptions: {
            prettier: false,
            svgo: false,
            svgoConfig: {
              plugins: [
                {
                  name: 'preset-default',
                  params: { overrides: { removeViewBox: false } },
                },
              ],
            },
            titleProp: true,
            ref: true,
          },
        }),
        nodePolyfills({
          include: ['process', 'buffer', 'stream', 'path'],
        }),
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
              src: 'node_modules/monaco-editor/min/vs/language/json',
              dest: 'assets/vs/language/',
            },
            {
              src: 'node_modules/monaco-editor/min/vs/nls.messages.*.js',
              dest: 'assets/vs/',
            },
          ],
        }),
      ],
    });
  },
} satisfies StorybookConfig;
