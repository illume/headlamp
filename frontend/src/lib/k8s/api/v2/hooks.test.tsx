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

import { configureStore } from '@reduxjs/toolkit';
import { renderHook, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import { headlampApi } from '../../../api/headlampApi';
import { useEndpoints } from './hooks';

vi.mock('./fetch', () => ({
  clusterFetch: vi.fn(),
}));

vi.mock('./webSocket', () => ({
  useWebSockets: vi.fn(),
  BASE_WS_URL: 'http://localhost:3000',
}));

vi.mock('./multiplexer', () => ({
  WebSocketManager: {
    subscribe: vi.fn().mockImplementation(() => Promise.resolve(() => {})),
  },
  useWebSocket: vi.fn(),
}));

function createTestStore() {
  return configureStore({
    reducer: { [headlampApi.reducerPath]: headlampApi.reducer },
    middleware: getDefault =>
      getDefault({ serializableCheck: false }).concat(headlampApi.middleware),
  });
}

function createWrapper(store?: ReturnType<typeof createTestStore>) {
  const testStore = store ?? createTestStore();
  return ({ children }: PropsWithChildren) => <Provider store={testStore}>{children}</Provider>;
}

describe('useEndpoints', () => {
  it('should return the single endpoint directly when only one is provided', () => {
    const endpoint = { version: 'v1', resource: 'pods' };
    const { result } = renderHook(() => useEndpoints([endpoint], 'default'), {
      wrapper: createWrapper(),
    });

    expect(result.current.endpoint).toEqual(endpoint);
    expect(result.current.error).toBeNull();
  });

  it('should skip the query when there is exactly one endpoint', () => {
    const store = createTestStore();
    const endpoint = { version: 'v1', resource: 'pods' };

    renderHook(() => useEndpoints([endpoint], 'default'), {
      wrapper: createWrapper(store),
    });

    // With a single endpoint the RTK Query hook is skipped:
    // no query should appear in the store
    const state = store.getState().headlampApi;
    const queryKeys = Object.keys(state.queries);
    expect(queryKeys.length).toBe(0);
  });

  it('should initiate a query when multiple endpoints are provided', async () => {
    const store = createTestStore();
    const endpoints = [
      { version: 'v1', resource: 'pods' },
      { version: 'v1beta1', resource: 'pods' },
    ];

    renderHook(() => useEndpoints(endpoints, 'default'), {
      wrapper: createWrapper(store),
    });

    // With multiple endpoints the hook should fire a query
    await waitFor(() => {
      const state = store.getState().headlampApi;
      const queryKeys = Object.keys(state.queries);
      expect(queryKeys.length).toBeGreaterThan(0);
    });
  });
});
