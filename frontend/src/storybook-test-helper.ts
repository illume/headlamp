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
            const waitForText = story.parameters?.storyshots?.waitForText;
            if (waitForText) {
              await waitFor(
                () => {
                  expect(screen.getByText(waitForText)).toBeTruthy();
                },
                { timeout: 2000, interval: 10 }
              );
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
