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
 * Shared helper for storybook snapshot tests.
 *
 * The tests are split across multiple test files for vitest parallelism.
 * Each file imports ALL stories (to avoid circular dependency issues from
 * partial globs) but only tests its shard based on `shardIndex`/`totalShards`.
 *
 * Each file must:
 * 1. Call `import.meta.glob('./**\/*.stories.tsx', { eager: true })` (full glob)
 * 2. Set up vi.mock() declarations (must be in each file — hoisted by vitest)
 * 3. Call `runStorybookTests(globResult, shardIndex, totalShards)`
 */

import { composeStories, type Meta, type StoryFn } from '@storybook/react';
import { act, screen, waitFor } from '@testing-library/react';
import { getWorker } from 'msw-storybook-addon';
import path from 'path';

/**
 * Common Kubernetes namespace/system names that are too generic to use as
 * waitForText — they often appear in support handlers (namespace lists, etc.)
 * rather than being the primary data the component renders.
 */
const GENERIC_K8S_NAMES = new Set([
  'default',
  'kube-system',
  'kube-public',
  'kube-node-lease',
]);

/**
 * Try to automatically derive a waitForText value from MSW handler responses.
 *
 * Invokes each GET handler's resolver with a fake Request, parses the JSON
 * response, and looks for `items[0].metadata.name` (Kubernetes list pattern)
 * or `metadata.name` (single-object detail pattern).
 *
 * Heuristics:
 * - Only examines GET handlers (POST/PATCH/PUT are auth checks, mutations)
 * - Prefers `story` handlers over `storyBase`/`baseStory` (primary data first)
 * - Skips generic names like "default", "kube-system"
 * - Skips empty responses and error handlers
 */
async function deriveWaitForTextFromMSW(story: any): Promise<string | undefined> {
  const mswHandlers = story.parameters?.msw?.handlers;
  if (!mswHandlers) return undefined;

  // Build prioritized handler groups: story handlers first, then base handlers.
  // Story handlers contain the primary data the component renders.
  const storyHandlers: any[] = [];
  const baseHandlers: any[] = [];

  if (Array.isArray(mswHandlers)) {
    // Flat array format — treat all as story-level
    storyHandlers.push(...mswHandlers);
  } else if (typeof mswHandlers === 'object') {
    if (Array.isArray(mswHandlers.story)) storyHandlers.push(...mswHandlers.story);
    if (Array.isArray(mswHandlers.storyBase)) baseHandlers.push(...mswHandlers.storyBase);
    if (Array.isArray(mswHandlers.baseStory)) baseHandlers.push(...mswHandlers.baseStory);
  }

  // Try story handlers first (primary data), then base handlers
  for (const handlers of [storyHandlers, baseHandlers]) {
    const result = await extractNameFromHandlers(handlers);
    if (result) return result;
  }

  return undefined;
}

async function extractNameFromHandlers(handlers: any[]): Promise<string | undefined> {
  for (const handler of handlers) {
    try {
      // Only examine GET handlers — POST/PATCH/PUT are mutations or auth checks
      const method = handler?.info?.method;
      if (method && method !== 'GET') continue;

      const url = handler?.info?.path;
      if (!url || typeof url !== 'string') continue;

      // Call the resolver with a minimal Request to get the response
      const fakeRequest = new Request(url, { method: 'GET' });
      const response = await handler.resolver({ request: fakeRequest });
      if (!response || typeof response.json !== 'function') continue;

      const data = await response.clone().json();
      if (!data || typeof data !== 'object') continue;

      // Pattern 1: Kubernetes list with items array (most reliable)
      if (Array.isArray(data.items) && data.items.length > 0) {
        const name = data.items[0]?.metadata?.name;
        if (name && typeof name === 'string' && !GENERIC_K8S_NAMES.has(name)) {
          return name;
        }
      }

      // Pattern 2: Single Kubernetes object with metadata.name
      if (data.metadata?.name && typeof data.metadata.name === 'string') {
        const name = data.metadata.name;
        if (!GENERIC_K8S_NAMES.has(name)) {
          return name;
        }
      }
    } catch {
      // Handler may return an error response or not be JSON — skip it
      continue;
    }
  }

  return undefined;
}

export type StoryFile = {
  default: Meta;
  [name: string]: StoryFn | Meta;
};

const compose = (entry: StoryFile) => {
  try {
    const stories = composeStories(entry);
    return stories;
  } catch (e) {
    throw new Error(
      `There was an issue composing stories for the module: ${JSON.stringify(entry)}, ${e}`
    );
  }
};

export function getStoryFiles(globResult: Record<string, StoryFile>) {
  return Object.entries(globResult).map(([filePath, storyFile]) => {
    const storyDir = path.dirname(filePath);
    const componentName = path.basename(filePath).replace(/\.(stories|story)\.[^/.]+$/, '');
    return { filePath, storyFile, componentName, storyDir };
  });
}

// Recreate similar options to Storyshots. Place your configuration below
const options = {
  storyKindRegex: /^.*?DontTest$/,
  snapshotsDirName: '__snapshots__',
  snapshotExtension: '.stories.storyshot',
};

/**
 * Recursively walks the tree and replaces any usage of useId
 */
export function replaceUseId(node: any) {
  const attributesToReplace = ['id', 'for', 'aria-describedby', 'aria-labelledby', 'aria-controls'];
  if (node.nodeType === Node.ELEMENT_NODE) {
    for (const attr of node.attributes) {
      if (attributesToReplace.includes(attr.name)) {
        if (attr.value.includes(':')) {
          // Handle React useId generated IDs
          node.setAttribute(attr.name, ':mock-test-id:');
        } else if (attr.name === 'id' && attr.value.includes('recharts')) {
          // Handle recharts generated IDs
          node.setAttribute(attr.name, 'recharts-id');
        }
      }
    }

    if (node.className && typeof node.className === 'string') {
      // Replace dynamic xterm owner classes with a fixed value
      node.className = node.className.replace(
        /xterm-dom-renderer-owner-\d+/g,
        'xterm-dom-renderer-owner'
      );
    }

    // Replace dynamic xterm owner IDs in <style> element CSS selectors
    if (node.nodeName === 'STYLE' && node.textContent) {
      node.textContent = node.textContent.replace(
        /xterm-dom-renderer-owner-\d+/g,
        'xterm-dom-renderer-owner'
      );
    }
  }

  // Recursively update child nodes
  for (const child of node.childNodes) {
    replaceUseId(child);
  }
}

/**
 * Runs storybook snapshot tests for the given story files.
 * Call from each test file after setting up mocks (vi.mock calls must be in each file).
 *
 * @param storyFiles - All story files from import.meta.glob
 * @param shardIndex - 0-based shard index for this test file (0..totalShards-1)
 * @param totalShards - Total number of shards (test files)
 */
export function runStorybookTests(
  storyFiles: ReturnType<typeof getStoryFiles>,
  shardIndex: number,
  totalShards: number
) {
  // Filter to only this shard's stories
  const myFiles = storyFiles.filter((_, i) => i % totalShards === shardIndex);
  describe('Storybook Tests', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    myFiles.forEach(({ storyFile, componentName, storyDir }) => {
      const meta = storyFile.default;
      const title = meta.title || componentName;

      if (options.storyKindRegex.test(title) || meta.parameters?.storyshots?.disable) {
        return;
      }

      describe(title, () => {
        const stories = Object.entries(compose(storyFile)).map(([name, story]) => ({
          name,
          story,
        }));

        if (stories.length <= 0) {
          throw new Error(
            `No stories found for this module: ${title}. Make sure there is at least one valid story for this module, without a disable parameter, or add parameters.storyshots.disable in the default export of this file.`
          );
        }

        stories.forEach(({ name, story }) => {
          if (story.parameters?.storyshots?.disable) return;

          test(name, async () => {
            // Track MSW requests to wait for all responses to arrive
            let requestsSent = 0;
            let requestsEnded = 0;
            const worker = getWorker();
            function onStart() {
              requestsSent++;
            }
            function onEnd() {
              requestsEnded++;
            }
            worker.events.on('request:start', onStart);
            worker.events.on('request:end', onEnd);

            const unhandledRequests: Array<string> = [];

            function onUnhandledRequest(e: { request: Request }) {
              unhandledRequests.push(e.request.url);
            }
            worker.events.on('request:unhandled', onUnhandledRequest);

            await act(async () => {
              await story.run();
            });

            // Wait for all MSW requests to complete (real timers — resolves quickly).
            // Use short interval since MSW responds nearly instantly.
            if (requestsSent > 0) {
              await waitFor(
                () => {
                  if (requestsSent !== requestsEnded) {
                    throw new Error('waiting for MSW requests to finish');
                  }
                },
                { timeout: 2000, interval: 10 }
              );
            }

            // Yield to microtask queue to let React process the responses.
            await act(async () => {});

            // If the story specifies waitForText, use waitFor/findByText to
            // wait for specific content to appear — following RTK Query docs
            // recommendation of using waitFor or findBy for async data.
            // If no waitForText is specified but MSW handlers are present,
            // auto-derive text from the first handler's Kubernetes response
            // (items[0].metadata.name or metadata.name). This ensures new
            // stories with MSW handlers automatically wait for data to load.
            const explicitWaitForText = story.parameters?.storyshots?.waitForText;
            let waitForText = explicitWaitForText;
            if (!waitForText && requestsSent > 0) {
              waitForText = await deriveWaitForTextFromMSW(story);
            }
            if (waitForText) {
              try {
                await waitFor(
                  () => {
                    screen.getAllByText(waitForText);
                  },
                  { timeout: 2000, interval: 10 }
                );
              } catch (e) {
                // If the text was explicitly specified by the story author, fail hard.
                // If auto-derived, silently proceed — the component may not render
                // the resource name (e.g., layout stories, error views).
                if (explicitWaitForText) throw e;
              }
            }

            // Fail on unhandled MSW requests — all API calls should have handlers.
            expect(
              unhandledRequests,
              `MSW: ${
                unhandledRequests.length
              } unhandled request(s) in story "${name}": ${unhandledRequests.join(', ')}`
            ).toEqual([]);

            // Cleanup listeners
            worker.events.removeListener('request:start', onStart);
            worker.events.removeListener('request:end', onEnd);
            worker.events.removeListener('request:unhandled', onUnhandledRequest);

            // Put snapshot next to the story
            const snapshotPath = path.join(
              storyDir,
              options.snapshotsDirName,
              `${componentName}.${name}${options.snapshotExtension}`
            );

            // Get rid of random id's in the ouput
            replaceUseId(document);

            document.body.removeAttribute('style');

            await expect(document.body).toMatchFileSnapshot(snapshotPath);
          });
        });
      });
    });
  });
}
