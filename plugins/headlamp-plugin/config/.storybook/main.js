const path = require('path');

// Please keep in sync with: frontend/.storybook/main.ts
module.exports = {
  stories: [
    '../../../../../src/**/*.stories.mdx',
    '../../../../../src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: ['@storybook/addon-links', '@storybook/addon-docs'],
  staticDirs: ['./public'],
  core: {
    disableTelemetry: true,
  },
  framework: {
    name: 'storybook-react-rsbuild',
    options: {},
  },

  rsbuildFinal: async config => {
    const { mergeRsbuildConfig } = await import('@rsbuild/core');
    const { pluginNodePolyfill } = await import('@rsbuild/plugin-node-polyfill');
    const { pluginSvgr } = await import('@rsbuild/plugin-svgr');

    return mergeRsbuildConfig(config, {
      plugins: [
        // Replaces webpack's ProvidePlugin({ process: 'process/browser' })
        // and the resolve.fallback for `path`/`process` polyfills.
        pluginNodePolyfill({
          globals: { process: true, Buffer: true },
        }),
        // The headlamp source uses `import Foo from './foo.svg?react'` to
        // load SVGs as React components — same setup as the frontend's
        // rsbuild config.
        pluginSvgr({ mixedImport: true }),
      ],
      source: {
        // Replaces webpack.DefinePlugin({ 'import.meta.env': ... }).
        // Keep the env var list in sync with the original webpack config.
        define: {
          'import.meta.env': JSON.stringify({
            NODE_ENV: process.env.NODE_ENV,
            UNDER_TEST: process.env.UNDER_TEST,
            DEV: process.env.DEV,
            STORYBOOK: process.env.STORYBOOK,
            FLATPAK_ID: process.env.FLATPAK_ID,
            REACT_APP_HEADLAMP_ENABLE_ROW_SELECTION:
              process.env.REACT_APP_HEADLAMP_ENABLE_ROW_SELECTION,
            REACT_APP_MULTI_HOME_ENABLED: process.env.REACT_APP_MULTI_HOME_ENABLED,
            REACT_APP_ENABLE_RECENT_CLUSTERS: process.env.REACT_APP_ENABLE_RECENT_CLUSTERS,
            REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER:
              process.env.REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER,
            REACT_APP_ENABLE_REACT_QUERY_DEVTOOLS:
              process.env.REACT_APP_ENABLE_REACT_QUERY_DEVTOOLS,
            REACT_APP_DEBUG_VERBOSE: process.env.REACT_APP_DEBUG_VERBOSE,
            REACT_APP_HEADLAMP_BACKEND_TOKEN: process.env.REACT_APP_HEADLAMP_BACKEND_TOKEN,
            PUBLIC_URL: process.env.PUBLIC_URL,
            REACT_APP_HEADLAMP_VERSION: process.env.REACT_APP_HEADLAMP_VERSION,
            REACT_APP_HEADLAMP_GIT_VERSION: process.env.REACT_APP_HEADLAMP_GIT_VERSION,
            REACT_APP_HEADLAMP_PRODUCT_NAME: process.env.REACT_APP_HEADLAMP_PRODUCT_NAME,
          }),
        },
        // rsbuild + swc transpiles .tsx by default, but doesn't transpile
        // sources under node_modules. Tell it to also transpile preview.tsx
        // and friends shipped inside the @kinvolk/headlamp-plugin package.
        include: [
          path.resolve(__dirname, '../../../../../node_modules/@kinvolk/headlamp-plugin/config'),
        ],
        // Replaces webpack's resolve.alias.
        alias: {
          '@kinvolk/headlamp-plugin/lib/k8s': path.resolve(
            __dirname,
            '../../../../../node_modules/@kinvolk/headlamp-plugin/lib/lib/k8s'
          ),
        },
      },
    });
  },
};
