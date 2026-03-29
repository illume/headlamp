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

import { defineWorkspace } from 'vitest/config';

const STORYBOOK_SHARD_COUNT = 10;

const storybookShards = Array.from({ length: STORYBOOK_SHARD_COUNT }, (_, i) => ({
  extends: './vitest.config.ts',
  test: {
    name: `storybook-${i}`,
    include: ['src/storybook.test.tsx'],
    env: {
      STORYBOOK_SHARD: String(i),
    },
  },
}));

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        'src/storybook.test.tsx',
      ],
    },
  },
  ...storybookShards,
]);
