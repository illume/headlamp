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
 * Storybook snapshot tests — part 2 of 4.
 * Tests components: e* through n* (endpoints, endpointSlices, gateway,
 * globalSearch, horizontalPodAutoscaler, ingress, job, lease, limitRange,
 * namespace, networkpolicy, node).
 */

import 'vitest-canvas-mock';
import { render as testingLibraryRender, setProjectAnnotations } from '@storybook/react';
import React from 'react';
import * as previewAnnotations from '../.storybook/preview';
import { getStoryFiles, runStorybookTests, type StoryFile } from './storybook-test-helper';

const annotations = setProjectAnnotations([previewAnnotations, { testingLibraryRender }]);
beforeAll(annotations.beforeAll!);

vi.mock('@iconify/react', () => ({
  Icon: () => null,
  InlineIcon: () => null,
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

const storyFiles = getStoryFiles(
  import.meta.glob<StoryFile>(
    [
      './components/endpoints/**/*.stories.tsx',
      './components/endpointSlices/**/*.stories.tsx',
      './components/gateway/**/*.stories.tsx',
      './components/globalSearch/**/*.stories.tsx',
      './components/horizontalPodAutoscaler/**/*.stories.tsx',
      './components/ingress/**/*.stories.tsx',
      './components/job/**/*.stories.tsx',
      './components/lease/**/*.stories.tsx',
      './components/limitRange/**/*.stories.tsx',
      './components/namespace/**/*.stories.tsx',
      './components/networkpolicy/**/*.stories.tsx',
      './components/node/**/*.stories.tsx',
    ],
    { eager: true }
  )
);

runStorybookTests(storyFiles, 'Storybook Tests');
