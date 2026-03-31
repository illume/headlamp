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
 * The test file (storybook.test.tsx) is run in parallel via vitest workspace
 * projects. Each project sets a STORYBOOK_SHARD env var so the test file
 * selects a different subset of story files. See vitest.config.ts for the
 * workspace configuration.
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
const GENERIC_K8S_NAMES = new Set(['default', 'kube-system', 'kube-public', 'kube-node-lease']);

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

// Recreate similar options to Storyshots. Place your configuration below
const options = {
  storyKindRegex: /^.*?DontTest$/,
  snapshotsDirName: '__snapshots__',
  snapshotExtension: '.stories.storyshot',
};

/**
 * Recursively walks the tree, normalizes non-deterministic attributes,
 * and removes elements that render inconsistently between runs.
 */
export function replaceUseId(node: any) {
  const attributesToReplace = ['id', 'for', 'aria-describedby', 'aria-labelledby', 'aria-controls'];
  if (node.nodeType === Node.ELEMENT_NODE) {
    // Remove MuiTouchRipple elements — they appear non-deterministically
    // depending on React rendering timing, causing snapshot instability.
    if (
      node.className &&
      typeof node.className === 'string' &&
      node.className.includes('MuiTouchRipple-root')
    ) {
      node.remove();
      return;
    }

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

  // Recursively update child nodes (iterate backwards since we may remove nodes)
  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    replaceUseId(node.childNodes[i]);
  }
}

/**
 * Runs storybook snapshot tests for the given story files.
 * Call from the test file after setting up mocks (vi.mock calls must be in the test file).
 *
 * @param storyFiles - Story files to test (already filtered by shard if applicable)
 */
export function runStorybookTests(
  storyFiles: Array<{
    filePath: string;
    storyFile: StoryFile;
    componentName: string;
    storyDir: string;
  }>
) {
  describe('Storybook Tests', () => {
    // Suppress known false-positive console.error patterns that fire in test context.
    // These don't affect snapshot correctness:
    // - React 18 act() warnings from async effects during test teardown
    // - Theme property errors from partial mock stores (headerStyle, etc.)
    // - "Unable to parse error json" from MSW passthrough responses
    // - Redux state selector errors from partial mock stores
    // - React error boundaries catching expected render errors
    let originalConsoleError: typeof console.error;
    let originalConsoleWarn: typeof console.warn;
    beforeEach(() => {
      originalConsoleError = console.error;
      originalConsoleWarn = console.warn;

      // Messages suppressed in both console.error and console.warn because different
      // React/MUI versions emit them through different channels.
      const suppressBoth = [
        'Encountered two children with the same key', // React duplicate key warnings
        'not forwarding its props correctly', // MUI Tooltip prop forwarding
      ];

      console.error = (...args: unknown[]) => {
        const msg = typeof args[0] === 'string' ? args[0] : String(args[0]);
        // Suppress act() warnings — React 18 false positives from async teardown
        if (msg.includes('not wrapped in act(')) return;
        // Suppress theme property errors — partial mock stores lack custom palette
        if (msg.includes("Cannot read properties of undefined (reading 'head')")) return;
        if (msg.includes("Cannot read properties of undefined (reading 'subsection')")) return;
        if (msg.includes("Cannot read properties of undefined (reading 'main')")) return;
        if (msg.includes("Cannot read properties of undefined (reading 'shortcuts')")) return;
        if (msg.includes("Cannot read properties of undefined (reading 'ready')")) return;
        // Suppress "Unable to parse error json" — MSW passthrough responses
        if (msg.includes('Unable to parse error json')) return;
        // Suppress React error boundary reports of above errors
        if (
          msg.includes('The above error occurred in') ||
          msg.includes('Error: Uncaught [TypeError: Cannot read properties of undefined')
        ) {
          return;
        }
        // Suppress "Failed to fetch events for object" — expected in stories without event API mocks
        if (msg.includes('Failed to fetch events for object')) return;
        // Suppress React key warnings — pre-existing in list views with mock data
        if (msg.includes('Each child in a list should have a unique "key" prop')) return;
        // Suppress non-DOM prop warnings — Icon mock forwards all props to <span>,
        // and MUI's sx prop sometimes leaks to DOM elements. React uses format strings
        // with %s placeholders so args[0] has "on <%s> tag" not the actual tag name.
        if (msg.includes('Invalid value for prop')) return;
        if (suppressBoth.some(s => msg.includes(s))) return;
        originalConsoleError(...args);
      };
      console.warn = (...args: unknown[]) => {
        const msg = typeof args[0] === 'string' ? args[0] : String(args[0]);
        // Suppress MUI Menu fragment warning — pre-existing in ClusterChooser
        if (msg.includes("doesn't accept a Fragment as a child")) return;
        // Suppress Emotion SSR pseudo class warning — not relevant in tests
        if (msg.includes('potentially unsafe when doing server-side rendering')) return;
        // Suppress MUI Autocomplete invalid value — pre-existing in namespace select stories
        if (msg.includes('The value provided to Autocomplete is invalid')) return;
        if (suppressBoth.some(s => msg.includes(s))) return;
        originalConsoleWarn(...args);
      };
    });
    afterEach(() => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      vi.restoreAllMocks();
    });

    storyFiles.forEach(({ storyFile, componentName, storyDir }) => {
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
            // Track whether the story has been rendered. Unhandled requests
            // that arrive before story.run() completes are from previous
            // stories' stale React effects and should be ignored.
            let storyRendered = false;
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
              // Skip watch requests — they are long-lived streaming connections
              // that may leak across test boundaries from previous stories.
              const url = new URL(e.request.url, 'http://localhost');
              if (url.searchParams.get('watch') === '1') return;
              // Ignore requests that arrive before the current story is rendered.
              // These are stale requests from previous stories' React effects
              // that fire during the cleanup/mount transition.
              if (!storyRendered) return;
              unhandledRequests.push(e.request.url);
            }
            worker.events.on('request:unhandled', onUnhandledRequest);

            await act(async () => {
              await story.run();
            });
            storyRendered = true;

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

            // Flush remaining React state updates from RTK Query responses
            // and other async effects to suppress act() warnings.
            await act(async () => {});

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

            // Clone the body SYNCHRONOUSLY after cleanup to prevent React's async
            // scheduler from re-adding MuiTouchRipple elements during the awaited
            // snapshot serialization. The clone is disconnected from React's tree.
            const bodyClone = document.body.cloneNode(true) as HTMLElement;

            // Strip MuiTouchRipple from the clone — catches any elements that were
            // present in the DOM at clone time. Since the clone is disconnected from
            // React, no new ripple elements can be added during snapshot serialization.
            bodyClone.querySelectorAll('[class*="MuiTouchRipple"]').forEach(el => el.remove());

            bodyClone.removeAttribute('style');

            await expect(bodyClone).toMatchFileSnapshot(snapshotPath);
          });
        });
      });
    });
  });
}
