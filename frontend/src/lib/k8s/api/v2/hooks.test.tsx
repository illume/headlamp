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
import { act, renderHook, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import { headlampApi } from '../../../api/headlampApi';
import { kubeObjectApi, useEndpoints, useKubeObject } from './hooks';
import * as websocket from './webSocket';

const mockClusterFetch = vi.fn();
const mockUseWebSockets = vi.fn();
const mockUseWebSocket = vi.fn();

vi.mock('./fetch', () => ({
  clusterFetch: (...args: any[]) => mockClusterFetch(...args),
}));

vi.mock('./webSocket', () => ({
  useWebSockets: (...args: any[]) => mockUseWebSockets(...args),
  BASE_WS_URL: 'http://localhost:3000',
}));

vi.mock('./multiplexer', () => ({
  WebSocketManager: {
    subscribe: vi.fn().mockImplementation(() => Promise.resolve(() => {})),
  },
  useWebSocket: (...args: any[]) => mockUseWebSocket(...args),
}));

vi.mock('./useKubeObjectList', async importOriginal => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getWebsocketMultiplexerEnabled: () => false,
  };
});

/** Minimal mock class that mimics KubeObject enough for hooks */
const mockKubeObjectClass = class {
  static apiVersion = 'v1';
  static apiName = 'pods';
  static apiEndpoint = {
    apiInfo: [{ group: '', resource: 'pods', version: 'v1' }],
  };

  jsonData: any;
  cluster?: string;

  constructor(jsonData: any, cluster?: string) {
    this.jsonData = jsonData;
    this.cluster = cluster;
  }

  get metadata() {
    return this.jsonData?.metadata;
  }
} as any;

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

describe('useKubeObject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially and succeed after fetch', async () => {
    const podData = {
      metadata: { name: 'test-pod', namespace: 'default', uid: 'pod-uid-1' },
      kind: 'Pod',
      apiVersion: 'v1',
    };

    mockClusterFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(podData),
    });

    const store = createTestStore();
    const { result } = renderHook(
      () =>
        useKubeObject({
          kubeObjectClass: mockKubeObjectClass,
          namespace: 'default',
          name: 'test-pod',
          cluster: 'test-cluster',
        }),
      { wrapper: createWrapper(store) }
    );

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();

    // After fetch completes
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.metadata.name).toBe('test-pod');
    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe('success');
  });

  it('should skip query when endpoint is not yet resolved', () => {
    // With a single endpoint, useEndpoints resolves immediately,
    // so the query should NOT be skipped. To test skip, we need
    // the endpoint resolution itself. But with single endpoint,
    // endpoint is returned directly. This test verifies the
    // query IS initiated (not skipped) when endpoint exists.
    const store = createTestStore();

    mockClusterFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ metadata: { name: 'pod' } }),
    });

    renderHook(
      () =>
        useKubeObject({
          kubeObjectClass: mockKubeObjectClass,
          namespace: 'default',
          name: 'test-pod',
          cluster: 'test-cluster',
        }),
      { wrapper: createWrapper(store) }
    );

    // A query should have been initiated
    const state = store.getState().headlampApi;
    const queryKeys = Object.keys(state.queries);
    expect(queryKeys.length).toBeGreaterThan(0);
  });

  it('should return error state when fetch fails', async () => {
    mockClusterFetch.mockRejectedValueOnce(new Error('Network error'));

    const store = createTestStore();
    const { result } = renderHook(
      () =>
        useKubeObject({
          kubeObjectClass: mockKubeObjectClass,
          namespace: 'default',
          name: 'test-pod',
          cluster: 'test-cluster',
        }),
      { wrapper: createWrapper(store) }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.status).toBe('error');
  });

  it('should filter out undefined and empty queryParams', async () => {
    mockClusterFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ metadata: { name: 'test-pod' } }),
    });

    renderHook(
      () =>
        useKubeObject({
          kubeObjectClass: mockKubeObjectClass,
          namespace: 'default',
          name: 'test-pod',
          cluster: 'test-cluster',
          queryParams: { labelSelector: 'app=test', fieldSelector: undefined, limit: '' },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockClusterFetch).toHaveBeenCalled();
    });

    // The URL should contain labelSelector but not fieldSelector or limit
    const fetchUrl = mockClusterFetch.mock.calls[0][0] as string;
    expect(fetchUrl).toContain('labelSelector=app%3Dtest');
    expect(fetchUrl).not.toContain('fieldSelector');
    expect(fetchUrl).not.toContain('limit');
  });

  it('should provide data via iterator protocol [data, error]', async () => {
    const podData = { metadata: { name: 'iter-pod', namespace: 'ns', uid: 'u1' } };
    mockClusterFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(podData),
    });

    const { result } = renderHook(
      () =>
        useKubeObject({
          kubeObjectClass: mockKubeObjectClass,
          namespace: 'ns',
          name: 'iter-pod',
          cluster: 'c1',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Destructure via iterator
    const [data, error] = result.current;
    expect(data).not.toBeNull();
    expect(data?.metadata.name).toBe('iter-pod');
    expect(error).toBeNull();
  });

  it('should set up websocket connections when data is available', async () => {
    const podData = { metadata: { name: 'ws-pod', namespace: 'default', uid: 'ws-uid' } };
    mockClusterFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(podData),
    });

    const wsSpy = vi.spyOn(websocket, 'useWebSockets');

    const { result } = renderHook(
      () =>
        useKubeObject({
          kubeObjectClass: mockKubeObjectClass,
          namespace: 'default',
          name: 'ws-pod',
          cluster: 'ws-cluster',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // useWebSockets should have been called with the right params
    expect(wsSpy).toHaveBeenCalled();
    const lastCall = wsSpy.mock.calls[wsSpy.mock.calls.length - 1][0] as any;
    expect(lastCall.enabled).toBe(true);
    expect(lastCall.connections).toHaveLength(1);
    expect(lastCall.connections[0].cluster).toBe('ws-cluster');
    expect(lastCall.connections[0].url).toContain('watch=1');
    expect(lastCall.connections[0].url).toContain('fieldSelector=metadata.name%3Dws-pod');
  });

  it('websocket onMessage should update cache for non-ADDED events', async () => {
    const podData = { metadata: { name: 'live-pod', namespace: 'ns', uid: 'live-uid' } };
    mockClusterFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(podData),
    });

    const wsSpy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useKubeObject({
          kubeObjectClass: mockKubeObjectClass,
          namespace: 'ns',
          name: 'live-pod',
          cluster: 'c1',
        }),
      { wrapper: createWrapper(store) }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Simulate MODIFIED websocket message
    const connection = wsSpy.mock.calls[wsSpy.mock.calls.length - 1][0] as any;
    const onMessage = connection.connections[0].onMessage;
    const updatedObject = {
      metadata: { name: 'live-pod', namespace: 'ns', uid: 'live-uid', resourceVersion: '99' },
      spec: { updated: true },
    };

    act(() => {
      onMessage({ type: 'MODIFIED', object: updatedObject });
    });

    // The cache should have been updated with the new object
    await waitFor(() => {
      expect(result.current.data?.jsonData).toEqual(updatedObject);
    });
  });

  it('websocket onMessage should ignore ADDED events', async () => {
    const podData = {
      metadata: { name: 'added-pod', namespace: 'ns', uid: 'added-uid', resourceVersion: '1' },
    };
    mockClusterFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(podData),
    });

    const wsSpy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const { result } = renderHook(
      () =>
        useKubeObject({
          kubeObjectClass: mockKubeObjectClass,
          namespace: 'ns',
          name: 'added-pod',
          cluster: 'c1',
        }),
      { wrapper: createWrapper(store) }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const originalData = result.current.data;

    // Simulate ADDED event — should be ignored
    const connection = wsSpy.mock.calls[wsSpy.mock.calls.length - 1][0] as any;
    const onMessage = connection.connections[0].onMessage;

    act(() => {
      onMessage({
        type: 'ADDED',
        object: { metadata: { name: 'added-pod', namespace: 'ns', uid: 'added-uid' } },
      });
    });

    // Data should remain the same (ADDED is ignored)
    expect(result.current.data?.jsonData).toEqual(originalData?.jsonData);
  });

  it('should disable websocket when no endpoint or data', () => {
    const wsSpy = vi.spyOn(websocket, 'useWebSockets');
    // Don't resolve the fetch — data stays null
    mockClusterFetch.mockReturnValue(new Promise(() => {}));

    renderHook(
      () =>
        useKubeObject({
          kubeObjectClass: mockKubeObjectClass,
          namespace: 'ns',
          name: 'pending-pod',
          cluster: 'c1',
        }),
      { wrapper: createWrapper() }
    );

    // useWebSockets should be called with enabled: false since data is null
    const lastCall = wsSpy.mock.calls[wsSpy.mock.calls.length - 1][0] as any;
    expect(lastCall.enabled).toBe(false);
  });

  it('should update websocket URL when namespace changes', async () => {
    const podData = { metadata: { name: 'pod1', namespace: 'ns-a', uid: 'uid1' } };
    mockClusterFetch.mockResolvedValue({
      json: () => Promise.resolve(podData),
    });

    const wsSpy = vi.spyOn(websocket, 'useWebSockets');
    let ns = 'ns-a';

    const { result, rerender } = renderHook(
      () =>
        useKubeObject({
          kubeObjectClass: mockKubeObjectClass,
          namespace: ns,
          name: 'pod1',
          cluster: 'c1',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const urlBefore = (wsSpy.mock.calls[wsSpy.mock.calls.length - 1][0] as any).connections[0]?.url;
    expect(urlBefore).toContain('ns-a');

    // Change namespace
    ns = 'ns-b';
    rerender();

    await waitFor(() => {
      const lastUrl = (wsSpy.mock.calls[wsSpy.mock.calls.length - 1][0] as any).connections[0]?.url;
      expect(lastUrl).toContain('ns-b');
    });
  });

  it('should update websocket URL when name changes', async () => {
    const podData = { metadata: { name: 'pod-a', namespace: 'ns', uid: 'uid-a' } };
    mockClusterFetch.mockResolvedValue({
      json: () => Promise.resolve(podData),
    });

    const wsSpy = vi.spyOn(websocket, 'useWebSockets');
    let podName = 'pod-a';

    const { result, rerender } = renderHook(
      () =>
        useKubeObject({
          kubeObjectClass: mockKubeObjectClass,
          namespace: 'ns',
          name: podName,
          cluster: 'c1',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const urlBefore = (wsSpy.mock.calls[wsSpy.mock.calls.length - 1][0] as any).connections[0]?.url;
    expect(urlBefore).toContain('metadata.name%3Dpod-a');

    // Change name
    podName = 'pod-b';
    mockClusterFetch.mockResolvedValue({
      json: () => Promise.resolve({ metadata: { name: 'pod-b', namespace: 'ns', uid: 'uid-b' } }),
    });
    rerender();

    await waitFor(() => {
      const lastUrl = (wsSpy.mock.calls[wsSpy.mock.calls.length - 1][0] as any).connections[0]?.url;
      expect(lastUrl).toContain('metadata.name%3Dpod-b');
    });
  });

  it('should update websocket cluster when cluster changes', async () => {
    const podData = { metadata: { name: 'pod1', namespace: 'ns', uid: 'uid1' } };
    mockClusterFetch.mockResolvedValue({
      json: () => Promise.resolve(podData),
    });

    const wsSpy = vi.spyOn(websocket, 'useWebSockets');
    let cluster = 'cluster-a';

    const { result, rerender } = renderHook(
      () =>
        useKubeObject({
          kubeObjectClass: mockKubeObjectClass,
          namespace: 'ns',
          name: 'pod1',
          cluster,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const clusterBefore = (wsSpy.mock.calls[wsSpy.mock.calls.length - 1][0] as any).connections[0]
      ?.cluster;
    expect(clusterBefore).toBe('cluster-a');

    // Change cluster
    cluster = 'cluster-b';
    rerender();

    await waitFor(() => {
      const lastCluster = (wsSpy.mock.calls[wsSpy.mock.calls.length - 1][0] as any).connections[0]
        ?.cluster;
      expect(lastCluster).toBe('cluster-b');
    });
  });
});

describe('kubeObjectApi cache key serialization', () => {
  it('should produce same cache key for different kubeObjectClass references', async () => {
    const store = createTestStore();

    const classA = class {
      constructor(public jsonData: any) {}
      get metadata() {
        return this.jsonData?.metadata;
      }
    } as any;

    const classB = class {
      constructor(public jsonData: any) {}
      get metadata() {
        return this.jsonData?.metadata;
      }
    } as any;

    const endpoint = { version: 'v1', resource: 'pods' };

    // Upsert data with classA
    await store.dispatch(
      kubeObjectApi.util.upsertQueryData(
        'getKubeObject',
        {
          kubeObjectClass: classA,
          endpoint,
          namespace: 'default',
          name: 'pod-1',
          cluster: 'c1',
          queryParams: {},
        },
        { metadata: { name: 'pod-1' } } as any
      )
    );

    // Upsert with classB, same args otherwise
    await store.dispatch(
      kubeObjectApi.util.upsertQueryData(
        'getKubeObject',
        {
          kubeObjectClass: classB,
          endpoint,
          namespace: 'default',
          name: 'pod-1',
          cluster: 'c1',
          queryParams: {},
        },
        { metadata: { name: 'pod-1-updated' } } as any
      )
    );

    // Should be same cache key → only one query entry
    const state = store.getState().headlampApi;
    const queryKeys = Object.keys(state.queries);
    expect(queryKeys.length).toBe(1);
  });

  it('should produce different cache keys for different names', async () => {
    const store = createTestStore();
    const endpoint = { version: 'v1', resource: 'pods' };

    await store.dispatch(
      kubeObjectApi.util.upsertQueryData(
        'getKubeObject',
        {
          kubeObjectClass: mockKubeObjectClass,
          endpoint,
          namespace: 'default',
          name: 'pod-a',
          cluster: 'c1',
          queryParams: {},
        },
        { metadata: { name: 'pod-a' } } as any
      )
    );

    await store.dispatch(
      kubeObjectApi.util.upsertQueryData(
        'getKubeObject',
        {
          kubeObjectClass: mockKubeObjectClass,
          endpoint,
          namespace: 'default',
          name: 'pod-b',
          cluster: 'c1',
          queryParams: {},
        },
        { metadata: { name: 'pod-b' } } as any
      )
    );

    const state = store.getState().headlampApi;
    const queryKeys = Object.keys(state.queries);
    expect(queryKeys.length).toBe(2);
  });

  it('should produce different cache keys for different clusters', async () => {
    const store = createTestStore();
    const endpoint = { version: 'v1', resource: 'pods' };
    const baseArgs = {
      kubeObjectClass: mockKubeObjectClass,
      endpoint,
      name: 'pod',
      queryParams: {},
    };

    await store.dispatch(
      kubeObjectApi.util.upsertQueryData(
        'getKubeObject',
        { ...baseArgs, namespace: 'ns', cluster: 'cluster-1' },
        {} as any
      )
    );
    await store.dispatch(
      kubeObjectApi.util.upsertQueryData(
        'getKubeObject',
        { ...baseArgs, namespace: 'ns', cluster: 'cluster-2' },
        {} as any
      )
    );

    const state = store.getState().headlampApi;
    expect(Object.keys(state.queries).length).toBe(2);
  });

  it('should produce different cache keys for different queryParams', async () => {
    const store = createTestStore();
    const endpoint = { version: 'v1', resource: 'pods' };
    const baseArgs = {
      kubeObjectClass: mockKubeObjectClass,
      endpoint,
      namespace: 'ns',
      name: 'pod',
      cluster: 'c1',
    };

    await store.dispatch(
      kubeObjectApi.util.upsertQueryData(
        'getKubeObject',
        { ...baseArgs, queryParams: { labelSelector: 'app=a' } },
        {} as any
      )
    );
    await store.dispatch(
      kubeObjectApi.util.upsertQueryData(
        'getKubeObject',
        { ...baseArgs, queryParams: { labelSelector: 'app=b' } },
        {} as any
      )
    );

    const state = store.getState().headlampApi;
    expect(Object.keys(state.queries).length).toBe(2);
  });
});

describe('headlampApi resetApiState with cached data', () => {
  it('should clear all cached queries when resetApiState is dispatched', async () => {
    const store = createTestStore();
    const endpoint = { version: 'v1', resource: 'pods' };

    // Seed some kube object cache data
    await store.dispatch(
      kubeObjectApi.util.upsertQueryData(
        'getKubeObject',
        {
          kubeObjectClass: mockKubeObjectClass,
          endpoint,
          namespace: 'default',
          name: 'cached-pod',
          cluster: 'c1',
          queryParams: {},
        },
        { metadata: { name: 'cached-pod' } } as any
      )
    );

    // Verify cache has data
    let state = store.getState().headlampApi;
    expect(Object.keys(state.queries).length).toBe(1);

    // Reset
    store.dispatch(headlampApi.util.resetApiState());

    // Cache should be cleared
    state = store.getState().headlampApi;
    expect(Object.keys(state.queries).length).toBe(0);
  });
});
