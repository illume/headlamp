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

/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom/vitest';
import 'vitest-canvas-mock';
import indexeddb from 'fake-indexeddb';

globalThis.indexedDB = indexeddb;

// Fix AbortSignal cross-realm mismatch between jsdom and @mswjs/interceptors.
// nock v14 uses @mswjs/interceptors to patch globalThis.fetch. The interceptor
// creates `new Request(input, init)` with the native Request constructor, which
// rejects jsdom's AbortSignal: "Expected signal to be an instance of AbortSignal".
// This happens because jsdom provides its own AbortController/AbortSignal classes
// that are different from Node.js native ones used by the Request constructor.
// Fix: patch Request constructor to strip the signal before passing to native
// constructor. Abort timeouts aren't needed in tests — all requests are mocked.
{
  const OriginalRequest = globalThis.Request;
  globalThis.Request = class PatchedRequest extends OriginalRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      if (init?.signal) {
        const { signal, ...rest } = init;
        void signal; // stripped — jsdom's AbortSignal fails cross-realm instanceof
        super(input, rest);
      } else {
        super(input, init);
      }
    }
  } as typeof Request;
}

if (typeof TextDecoder === 'undefined' && typeof require !== 'undefined') {
  (global as any).TextDecoder = require('util').TextDecoder;
}
if (typeof TextEncoder === 'undefined' && typeof require !== 'undefined') {
  (global as any).TextEncoder = require('util').TextEncoder;
}
if (typeof ResizeObserver === 'undefined' && typeof require !== 'undefined') {
  (global as any).ResizeObserver = require('resize-observer-polyfill');
}

globalThis.Worker = class {
  postMessage() {}
} as any;

if (globalThis.window) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

if (globalThis.window) {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  // Clears the database and adds some testing data.
  // Jest will wait for this promise to resolve before running tests.
  localStorage.clear();
});

// Suppress noisy console.log messages from IndexedDB kubeconfig operations during tests.
// These are informational messages from kubeconfig persistence that spam test output.
// Restoration is not needed — setupTests.ts runs once per test worker, not per test.
{
  const originalConsoleLog = console.log;
  console.log = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg === 'Kubeconfig added to IndexedDB' ||
      msg === 'Kubeconfig deleted from IndexedDB' ||
      msg === 'Kubeconfig updated in IndexedDB'
    ) {
      return;
    }
    originalConsoleLog(...args);
  };
}

// Suppress noisy console.warn messages that spam test output.
// - react-i18next instance warning: fires when components render before i18n is initialized
// - deprecated Notification constructor: tested intentionally in notificationsSlice.test.ts
// - Emotion SSR pseudo class warnings: not relevant in test environment
// - MUI Autocomplete invalid value: pre-existing in namespace select stories
// - MUI Menu Fragment: pre-existing in ClusterChooser stories
{
  const originalConsoleWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.startsWith('react-i18next::')) return;
    if (msg.includes('Notification constructor with a string arg is deprecated')) return;
    if (msg.includes('potentially unsafe when doing server-side rendering')) return;
    if (msg.includes('The value provided to Autocomplete is invalid')) return;
    if (msg.includes("doesn't accept a Fragment as a child")) return;
    if (msg.includes('Encountered two children with the same key')) return;
    if (msg.includes('not forwarding its props correctly')) return;
    originalConsoleWarn(...args);
  };
}

// Suppress noisy console.error messages that spam test output.
// - Auth component logs rejected promise errors (e.g. { status: 401 }) as expected behavior
// - "Failed to load namespaces" from storage.ts when testing invalid JSON
// - "Error setting cookie token" from auth.ts when testing error paths
// - "Unable to parse error json" from App rendering without backend
// - Non-DOM prop warnings from Icon mock forwarding all props to <span>
// - Emotion SSR pseudo class warnings: emitted via console.error, not relevant in tests
// - MUI Menu Fragment: pre-existing in ClusterChooser stories
// - MUI Autocomplete invalid value: pre-existing in namespace select stories
{
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    // Suppress Auth component's catch(err) { console.error(err) } for test auth failures
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      const obj = args[0] as Record<string, unknown>;
      if (obj.status === 401 && obj.message === 'Unauthorized') return;
    }
    if (msg.includes('Failed to load namespaces from Local Storage')) return;
    if (msg.includes('Error setting cookie token')) return;
    if (msg.includes('Unable to parse error json')) return;
    if (msg.includes('Invalid value for prop') && msg.includes('on <span> tag')) return;
    if (msg.includes('potentially unsafe when doing server-side rendering')) return;
    if (msg.includes("doesn't accept a Fragment as a child")) return;
    if (msg.includes('The value provided to Autocomplete is invalid')) return;
    originalConsoleError(...args);
  };
}

// Suppress noisy console.debug messages that spam test output.
// - tableSettings logs empty tableId debug info intentionally tested in tableSettings.test.ts
// - CronJob cron description failures with mock data
{
  const originalConsoleDebug = console.debug;
  console.debug = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('tableId is empty')) return;
    if (msg.includes('Could not describe cron')) return;
    originalConsoleDebug(...args);
  };
}
