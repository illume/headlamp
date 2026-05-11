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

  // Production Storybook (.storybook/main.ts) needs `staticDirs: ['../public']`
  // so msw-storybook-addon's `mockServiceWorker.js` resolves. The bench
  // preview deliberately doesn't initialize MSW, so `staticDirs` is unset
  // here — keeps the comparison purely about bundler perf.

  core: {
    disableTelemetry: true,
  },

  docs: {},

  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },

  viteFinal: async config => {
    // storybook-builder-vite implicitly picks up frontend/vite.config.ts.
    // That config installs `vite-plugin-node-polyfills`, which collides
    // with storybook-builder-vite's OWN polyfill injection (oxc + esbuild
    // banners) and produces `Uncaught SyntaxError: Identifier
    // '__buffer_polyfill' has already been declared` at runtime, so the
    // story never renders. Strip it out before doing anything else.
    if (Array.isArray(config.plugins)) {
      const filterTree = (plugins: any[]): any[] =>
        plugins
          .filter(p => {
            if (!p) return false;
            const name = (Array.isArray(p) ? null : p.name) || '';
            return !/node-polyfills/i.test(name);
          })
          .map(p => (Array.isArray(p) ? filterTree(p) : p));
      config.plugins = filterTree(config.plugins);
    }

    // Mirror the bits of frontend/vite.config.ts that stories need:
    // SVGR (`?react` import suffix) and the monaco static copy. Kept in
    // sync with frontend/.storybook/main.ts (rsbuild) so the comparison
    // is apples-to-apples. Re-add a single nodePolyfills() instance now
    // that we filtered the vite.config.ts copy above — the SectionBox
    // story's import graph pulls in @apidevtools/swagger-parser which
    // references `process` at runtime.
    const { mergeConfig } = await import('vite');
    const svgr = (await import('vite-plugin-svgr')).default;
    const { nodePolyfills } = await import('vite-plugin-node-polyfills');
    const { viteStaticCopy } = await import('vite-plugin-static-copy');

    return mergeConfig(config, {
      define: {
        global: 'globalThis',
      },
      envPrefix: 'REACT_APP_',
      // Vite + Storybook 10 has a known race on cold caches: vite's
      // optimize-deps starts serving requests for one set of dep hashes,
      // discovers more deps from the story import graph, rewrites
      // .vite/deps/ with a new set of hashes, and the browser ends up
      // requesting hashes that no longer exist ("Pre-transform error: file
      // does not exist at .../sb-vite/deps/<hash>.js"). The page never
      // recovers — every reload triggers another discovery cycle. Enumerate
      // the heavy MUI/lab/icons subpaths here so vite optimizes them all
      // up-front and the dep set stays stable.
      //
      // This list mirrors the deps that show up in the vite error log on a
      // cold cache for this codebase. Keeping it explicit rather than
      // setting `optimizeDeps.noDiscovery: true` so future deps are still
      // auto-discovered (just not while the bench is being measured).
      optimizeDeps: {
        include: [
          '@mui/material',
          '@mui/material/styles',
          '@mui/material/AppBar',
          '@mui/material/Toolbar',
          '@mui/material/MenuItem',
          '@mui/material/ListItemIcon',
          '@mui/material/ListItemText',
          '@mui/material/Table',
          '@mui/material/TableBody',
          '@mui/material/TableCell',
          '@mui/material/TableHead',
          '@mui/material/TableRow',
          '@mui/material/Tabs',
          '@mui/material/Tab',
          '@mui/material/Card',
          '@mui/material/CardContent',
          '@mui/material/Tooltip',
          '@mui/material/Typography',
          '@mui/material/Box',
          '@mui/material/Grid',
          '@mui/material/Paper',
          '@mui/material/IconButton',
          '@mui/material/Button',
          '@mui/material/Drawer',
          '@mui/material/AppBar',
          '@mui/material/Dialog',
          '@mui/material/DialogActions',
          '@mui/material/DialogContent',
          '@mui/material/DialogTitle',
          '@mui/material/DialogContentText',
          '@mui/material/CircularProgress',
          '@mui/material/Avatar',
          '@mui/material/Snackbar',
          '@mui/material/Alert',
          '@mui/material/Switch',
          '@mui/material/Chip',
          '@mui/material/Menu',
          '@mui/material/Select',
          '@mui/material/InputBase',
          '@mui/material/InputAdornment',
          '@mui/material/Divider',
          '@mui/material/List',
          '@mui/material/ListItem',
          '@mui/material/ListItemButton',
          '@mui/material/ListSubheader',
          '@mui/material/Collapse',
          '@mui/material/CssBaseline',
          '@mui/material/Stack',
          '@mui/material/Skeleton',
          '@mui/material/Link',
          '@mui/material/FormControl',
          '@mui/material/FormControlLabel',
          '@mui/material/FormLabel',
          '@mui/material/RadioGroup',
          '@mui/material/Radio',
          '@mui/material/Checkbox',
          '@mui/material/TextField',
          '@mui/material/Autocomplete',
          '@mui/material/Pagination',
          '@mui/material/Breadcrumbs',
          '@mui/material/useMediaQuery',
          '@mui/lab',
          '@mui/icons-material',
        ],
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
                  params: { overrides: { removeViewBox: false } },
                },
              ],
            },
            titleProp: true,
            ref: true,
          },
        }),
        // NOTE: vite.config.ts ALSO installs vite-plugin-node-polyfills.
        // We filter that out above (in the `filterTree` pass) and re-add
        // a single instance here so the polyfill banner is injected into
        // module output exactly once. With two instances, the second's
        // `var __buffer_polyfill` re-declaration breaks the iframe with
        // `Identifier '__buffer_polyfill' has already been declared`.
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
