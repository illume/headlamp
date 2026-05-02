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

import type { StorybookConfig } from 'storybook-react-rsbuild';

// Please also update: plugins/headlamp-plugin/config/.storybook/main.js

export default {
  framework: 'storybook-react-rsbuild',
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],

  addons: ['@storybook/addon-links', '@storybook/addon-docs'],

  core: {
    disableTelemetry: true,
  },

  docs: {},

  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },

  rsbuildFinal: async config => {
    // Mirror the bits of frontend/rsbuild.config.ts that stories rely on:
    // SVGR (`?react` import suffix), node polyfills, and the `?url`
    // asset/resource rule used by e.g. the elkjs worker.
    const { mergeRsbuildConfig } = await import('@rsbuild/core');
    const { pluginNodePolyfill } = await import('@rsbuild/plugin-node-polyfill');
    const { pluginSvgr } = await import('@rsbuild/plugin-svgr');
    return mergeRsbuildConfig(config, {
      plugins: [
        pluginNodePolyfill({
          include: ['process', 'buffer', 'stream', 'https', 'http', 'require', 'path'],
        }),
        pluginSvgr({
          mixedImport: true,
          svgrOptions: {
            prettier: false,
            svgo: false,
            svgoConfig: {
              plugins: [
                { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
              ],
            },
            titleProp: true,
            ref: true,
          },
        }),
      ],
      tools: {
        rspack: {
          module: {
            rules: [
              {
                resourceQuery: /url/,
                type: 'asset/resource',
              },
            ],
          },
        },
      },
    });
  },
} satisfies StorybookConfig;
