import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';

// Dynamically inject REACT_APP_ environment variables
const reactAppEnvVars = Object.entries(process.env)
  .filter(([key, value]) => key.startsWith('REACT_APP_') && value !== undefined)
  .reduce((env, [key, value]) => {
    env[`import.meta.env.${key}`] = JSON.stringify(value);
    return env;
  }, { 'import.meta.env': '{}' });

// Use environment variable for backend port, defaulting to 4466
const backendPort = process.env.HEADLAMP_PORT || '4466';
const backendTarget = `http://localhost:${backendPort}`;

export default defineConfig({
  source: {
    entry: {
      index: './src/index.tsx',
    },
    define: {
      global: 'globalThis',
      'import.meta.env.BASE_URL': JSON.stringify(process.env.BASE_URL || './'), // Define BASE_URL with a default value
      ...reactAppEnvVars, // Inject REACT_APP_ environment variables
    },
  },
  html: {
    template: './index.html',
    templateParameters: {
      BASE_URL: process.env.BASE_URL || '/',
    },
  },
  server: {
    port: 3000,
    cors: true,
    proxy: {
      '/api': { target: backendTarget, changeOrigin: true },
      '/clusters': { target: backendTarget, changeOrigin: true },
      '/plugins': { target: backendTarget, changeOrigin: true },
      '/config': { target: backendTarget, changeOrigin: true },
      '/auth': { target: backendTarget, changeOrigin: true },
      '/oidc': { target: backendTarget, changeOrigin: true },
      '/oidc-callback': { target: backendTarget, changeOrigin: true },
      '/wsMultiplexer': { target: backendTarget, changeOrigin: true, ws: true },
      '/externalproxy': { target: backendTarget, changeOrigin: true },
      '/drain-node': { target: backendTarget, changeOrigin: true },
      '/drain-node-status': { target: backendTarget, changeOrigin: true },
      '/parseKubeConfig': { target: backendTarget, changeOrigin: true },
      '/cluster': { target: backendTarget, changeOrigin: true },
      '/metrics': { target: backendTarget, changeOrigin: true },
    },
  },
  // dev: {
  //   hmr: false,
  // },
  output: {
    distPath: {
      root: 'build',
    },
    overrideBrowserslist: ['>0.2%', 'not dead', 'not op_mini all'],
    // Don't emit `*.LICENSE.txt` sidecars in dev mode; rspack's default
    // (`'linked'`) writes them next to every chunk that contains a license
    // banner, which is noise during local development. Production keeps
    // the default to preserve attribution next to minified chunks.
    legalComments: process.env.NODE_ENV === 'development' ? 'none' : undefined,
    copy: [
      // Headlamp uses Monaco for YAML, JSON, and JavaScript. The Advanced
      // Search editor in `src/components/advancedSearch/ResourceSearch.tsx`
      // calls `monaco.languages.typescript.javascriptDefaults`, which is
      // backed by the `vs/language/typescript` worker bundle, so it must
      // ship with the build. Other basic-languages and the css/html
      // language services are intentionally omitted to keep the served
      // `assets/vs/` slim.
      { from: 'node_modules/monaco-editor/min/vs/loader.js', to: 'assets/vs/loader.js' },
      { from: 'node_modules/monaco-editor/min/vs/base', to: 'assets/vs/base' },
      { from: 'node_modules/monaco-editor/min/vs/editor', to: 'assets/vs/editor' },
      {
        from: 'node_modules/monaco-editor/min/vs/basic-languages/yaml',
        to: 'assets/vs/basic-languages/yaml',
      },
      {
        from: 'node_modules/monaco-editor/min/vs/basic-languages/javascript',
        to: 'assets/vs/basic-languages/javascript',
      },
      {
        from: 'node_modules/monaco-editor/min/vs/basic-languages/typescript',
        to: 'assets/vs/basic-languages/typescript',
      },
      {
        from: 'node_modules/monaco-editor/min/vs/language/json',
        to: 'assets/vs/language/json',
      },
      {
        from: 'node_modules/monaco-editor/min/vs/language/typescript',
        to: 'assets/vs/language/typescript',
      },
      // NLS message files for the locales the loader may request.
      { from: 'node_modules/monaco-editor/min/vs/nls.messages.de.js', to: 'assets/vs/nls.messages.de.js' },
      { from: 'node_modules/monaco-editor/min/vs/nls.messages.es.js', to: 'assets/vs/nls.messages.es.js' },
      { from: 'node_modules/monaco-editor/min/vs/nls.messages.fr.js', to: 'assets/vs/nls.messages.fr.js' },
      { from: 'node_modules/monaco-editor/min/vs/nls.messages.it.js', to: 'assets/vs/nls.messages.it.js' },
      { from: 'node_modules/monaco-editor/min/vs/nls.messages.ja.js', to: 'assets/vs/nls.messages.ja.js' },
      { from: 'node_modules/monaco-editor/min/vs/nls.messages.ko.js', to: 'assets/vs/nls.messages.ko.js' },
      { from: 'node_modules/monaco-editor/min/vs/nls.messages.ru.js', to: 'assets/vs/nls.messages.ru.js' },
      { from: 'node_modules/monaco-editor/min/vs/nls.messages.zh-cn.js', to: 'assets/vs/nls.messages.zh-cn.js' },
      { from: 'node_modules/monaco-editor/min/vs/nls.messages.zh-tw.js', to: 'assets/vs/nls.messages.zh-tw.js' },
    ],
  },
  tools: {
    rspack: {
      module: {
        rules: [
          {
            // Handle ?url imports (e.g. elkjs worker) as asset URLs, matching Vite's ?url behavior
            resourceQuery: /url/,
            type: 'asset/resource',
          },
        ],
      },
      optimization: {
        splitChunks: {
          cacheGroups: {
            vendorLodash: {
              test: /[\\/]node_modules[\\/]lodash[\\/]/,
              name: 'vendor-lodash',
              chunks: 'all',
            },
            vendorMui: {
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/]/,
              name: 'vendor-mui',
              chunks: 'all',
            },
            vendorXterm: {
              test: /[\\/]node_modules[\\/]xterm[\\/]/,
              name: 'vendor-xterm',
              chunks: 'all',
            },
            vendorRecharts: {
              test: /[\\/]node_modules[\\/]recharts[\\/]/,
              name: 'vendor-recharts',
              chunks: 'all',
            },
          },
        },
      },
      externals: {
        '@axe-core/react': 'commonjs @axe-core/react',
        // 'monaco-editor': 'commonjs monaco-editor',
        // 'monaco-editor/esm/vs/editor/common/services/editorSimpleWorker': 'commonjs monaco-editor/esm/vs/editor/common/services/editorSimpleWorker',
      },
    },
  },

  plugins: [
    pluginReact({
      swcReactOptions: {
        throwIfNamespace: false,
      }
    }),
    pluginSvgr({
      svgrOptions: {
        prettier: false,
        svgo: false,
        svgoConfig: {
          plugins: [{ name: 'preset-default', params: { overrides: { removeViewBox: false } } }],
        },
        titleProp: true,
        ref: true,
        // support svg with namespace
      },
    }),
    pluginNodePolyfill({
      include: ['process', 'buffer', 'stream', 'https', 'http', 'require', 'path'],
    }),
    // replaceBaseUrlPlugin(),
  ],
});
