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

/**
 * Storybook snapshot tests.
 *
 * Parallelized via vitest workspace projects: each project sets a
 * STORYBOOK_SHARD env var so this single file runs a different subset
 * of stories per project. See vitest.config.ts for the workspace config.
 */

import 'vitest-canvas-mock';
import { setProjectAnnotations } from '@storybook/react';
import { render as testingLibraryRender } from '@testing-library/react';
import path from 'path';
import React from 'react';
import * as previewAnnotations from '../.storybook/preview';
import { runStorybookTests, type StoryFile } from './storybook-test-helper';

const annotations = setProjectAnnotations([previewAnnotations, { testingLibraryRender }]);
beforeAll(annotations.beforeAll!);

vi.mock('@iconify/react', () => ({
  Icon: React.forwardRef((props: any, ref: any) => <span ref={ref} data-testid="mock-icon" />),
  InlineIcon: React.forwardRef((props: any, ref: any) => (
    <span ref={ref} data-testid="mock-inline-icon" />
  )),
  addCollection: () => {},
}));

vi.mock('@monaco-editor/react', () => ({
  Editor: () => <div className="mock-monaco-editor" />,
  useMonaco: () => null,
  loader: { config: () => null },
  default: () => <div className="mock-monaco-editor" />,
}));

vi.mock('./components/common/Resource/AuthVisible', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

window.matchMedia = () => ({
  matches: false,
  addListener: () => {},
  removeListener: () => {},
  media: '',
  onchange: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
});

/**
 * Total number of parallel shards for storybook tests.
 * Must match STORYBOOK_SHARD_COUNT in vitest.config.ts.
 */
const STORYBOOK_SHARD_COUNT = 12;

/**
 * Load story files for this shard. Uses lazy glob imports so each shard
 * only loads the story modules it needs (1/12th), avoiding the overhead
 * of eagerly importing all stories in every shard.
 */
async function loadStoryFiles() {
  // Sort entries by path to ensure consistent shard distribution
  // across different systems and glob implementations.
  const lazyStoryFiles = Object.entries(import.meta.glob<StoryFile>('./**/*.stories.tsx')).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  // When running as a shard, only import this shard's subset of stories.
  // STORYBOOK_SHARD is set by vitest.config.ts workspace projects for parallel execution.
  const shardIndex = Number(import.meta.env.STORYBOOK_SHARD ?? -1);
  const filteredEntries =
    shardIndex >= 0
      ? lazyStoryFiles.filter((_, i) => i % STORYBOOK_SHARD_COUNT === shardIndex)
      : lazyStoryFiles;

  // Import only the story files this shard needs
  const allFiles = await Promise.all(
    filteredEntries.map(async ([filePath, importFn]) => {
      const storyFile = await importFn();
      const storyDir = path.dirname(filePath);
      const componentName = path.basename(filePath).replace(/\.(stories|story)\.[^/.]+$/, '');
      return { filePath, storyFile, componentName, storyDir };
    })
  );

  return allFiles;
}

// Load stories then run tests. The top-level await ensures vitest
// collects the dynamically registered test suites.
const storyFiles = await loadStoryFiles();
runStorybookTests(storyFiles);
