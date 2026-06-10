import { defineConfig, mergeConfig } from 'vitest/config';
// @ts-ignore — headlamp-plugin ships a Vite config, not a Vitest config
import baseConfig from '@kinvolk/headlamp-plugin/config/vite.config.mjs';

export default mergeConfig(baseConfig, defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.e2e.test.*',
      '**/*.pw-spec.*',
    ],
  },
}));
