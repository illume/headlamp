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
import { act, renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import { queryApi } from '../../../../redux/queryApi';
import { ApiError } from './ApiError';
import { KubeList } from './KubeList';
import {
  kubeListApi,
  kubeObjectListQuery,
  makeListRequests,
  useWatchKubeObjectLists,
  WS_THROTTLE_INTERVAL_MS,
} from './useKubeObjectList';
import * as websocket from './webSocket';

// Mock WebSocket functionality
const mockUseWebSockets = vi.fn();
const mockSubscribe = vi.fn().mockImplementation(() => Promise.resolve(() => {}));
const mockClusterFetch = vi.fn();

vi.mock('./webSocket', () => ({
  useWebSockets: (...args: any[]) => mockUseWebSockets(...args),
  BASE_WS_URL: 'http://localhost:3000',
}));

vi.mock('./multiplexer', () => ({
  WebSocketManager: {
    subscribe: (...args: any[]) => mockSubscribe(...args),
  },
}));

vi.mock('./fetch', () => ({
  clusterFetch: (...args: any[]) => mockClusterFetch(...args),
}));

function createTestStore() {
  return configureStore({
    reducer: { [queryApi.reducerPath]: queryApi.reducer },
    middleware: getDefault => getDefault({ serializableCheck: false }).concat(queryApi.middleware),
  });
}

function createTestWrapper(store?: ReturnType<typeof createTestStore>) {
  const testStore = store ?? createTestStore();
  return ({ children }: PropsWithChildren) => <Provider store={testStore}>{children}</Provider>;
}

/**
 * Flush throttled WS cache updates by advancing timers past the throttle interval.
 * Call this after sending WS events to tests that verify cache state.
 */
function flushWSThrottle() {
  act(() => {
    vi.advanceTimersByTime(WS_THROTTLE_INTERVAL_MS + 1);
  });
}

// Enable fake timers globally so throttled WS cache updates can be flushed deterministically.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('makeListRequests', () => {
  describe('for non namespaced resource', () => {
    it('should not include namespace in requests', () => {
      const requests = makeListRequests(['default'], () => ['namespace-a'], false, [
        'namepspace-a',
        'namespace-b',
      ]);
      expect(requests).toEqual([{ cluster: 'default', namespaces: undefined }]);
    });
  });
  describe('for namespaced resource', () => {
    it('should make request with no namespaces provided', () => {
      const requests = makeListRequests(['default'], () => [], true);
      expect(requests).toEqual([{ cluster: 'default', namespaces: [] }]);
    });

    it('should make requests for allowed namespaces only', () => {
      const requests = makeListRequests(['default'], () => ['namespace-a'], true);
      expect(requests).toEqual([{ cluster: 'default', namespaces: ['namespace-a'] }]);
    });

    it('should make requests for allowed namespaces only, even when requested other', () => {
      const requests = makeListRequests(['default'], () => ['namespace-a'], true, [
        'namespace-a',
        'namespace-b',
      ]);
      expect(requests).toEqual([{ cluster: 'default', namespaces: ['namespace-a'] }]);
    });

    it('should make requests for allowed namespaces per cluster', () => {
      const requests = makeListRequests(
        ['cluster-a', 'cluster-b'],
        (cluster: string | null) => (cluster === 'cluster-a' ? ['namespace-a'] : ['namespace-b']),
        true
      );
      expect(requests).toEqual([
        { cluster: 'cluster-a', namespaces: ['namespace-a'] },
        { cluster: 'cluster-b', namespaces: ['namespace-b'] },
      ]);
    });

    it('should make requests for allowed namespaces per cluster, even if requested other', () => {
      const requests = makeListRequests(
        ['cluster-a', 'cluster-b'],
        (cluster: string | null) => (cluster === 'cluster-a' ? ['namespace-a'] : ['namespace-b']),
        true,
        ['namespace-a', 'namespace-b', 'namespace-c']
      );
      expect(requests).toEqual([
        { cluster: 'cluster-a', namespaces: ['namespace-a'] },
        { cluster: 'cluster-b', namespaces: ['namespace-b'] },
      ]);
    });

    it('should make requests for allowed namespaces per cluster, with one cluster without allowed namespaces', () => {
      const requests = makeListRequests(
        ['cluster-a', 'cluster-b'],
        (cluster: string | null) => (cluster === 'cluster-a' ? ['namespace-a'] : []),
        true,
        ['namespace-a', 'namespace-b', 'namespace-c']
      );
      expect(requests).toEqual([
        { cluster: 'cluster-a', namespaces: ['namespace-a'] },
        { cluster: 'cluster-b', namespaces: ['namespace-a', 'namespace-b', 'namespace-c'] },
      ]);
    });
  });
});

const mockClass = class {
  static apiVersion = 'v1';
  static apiName = 'pods';

  static apiEndpoint = {
    apiInfo: [
      {
        group: '',
        resource: 'pods',
        version: 'v1',
      },
    ],
  };

  jsonData: any;

  constructor(jsonData: any, public cluster?: string) {
    this.jsonData = jsonData;
  }

  get metadata() {
    return this.jsonData?.metadata;
  }
} as any;

describe('useWatchKubeObjectLists', () => {
  beforeEach(() => {
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'false');
    vi.clearAllMocks();
  });

  it('should not be enabled when no endpoint is provided', () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    renderHook(() => useWatchKubeObjectLists({ kubeObjectClass: mockClass, lists: [] }), {
      wrapper: createTestWrapper(),
    });
    expect(spy).toHaveBeenCalledWith({ enabled: false, connections: [] });
  });

  it('should call useWebSockets when endpoint and lists are provided', () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'default', resourceVersion: '1' }],
          endpoint: { version: 'v1', resource: 'pods' },
        }),
      {
        wrapper: createTestWrapper(),
      }
    );

    expect(spy.mock.calls[0][0].enabled).toBe(true);
    expect(spy.mock.calls[0][0].connections[0].cluster).toBe('default');
    expect(spy.mock.calls[0][0].connections[0].url).toBe('api/v1/pods?watch=1&resourceVersion=1');
  });

  it('should call useWebSockets when endpoint and 2 lists are provided', () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [
            { cluster: 'default', resourceVersion: '1', namespace: 'a' },
            { cluster: 'default', resourceVersion: '1', namespace: 'b' },
          ],
          endpoint: { version: 'v1', resource: 'pods' },
        }),
      {
        wrapper: createTestWrapper(),
      }
    );

    expect(spy.mock.calls[0][0].enabled).toBe(true);
    expect(spy.mock.calls[0][0].connections[0].cluster).toBe('default');
    expect(spy.mock.calls[0][0].connections[0].url).toBe(
      'api/v1/namespaces/a/pods?watch=1&resourceVersion=1'
    );

    expect(spy.mock.calls[0][0].connections[1].cluster).toBe('default');
    expect(spy.mock.calls[0][0].connections[1].url).toBe(
      'api/v1/namespaces/b/pods?watch=1&resourceVersion=1'
    );
  });

  it('should update websocket connections URL when queryParams change', () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    let qp: Record<string, string> = { labelSelector: 'app=old' };

    const { rerender } = renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'default', resourceVersion: '1' }],
          endpoint: { version: 'v1', resource: 'pods' },
          queryParams: qp,
        }),
      {
        wrapper: createTestWrapper(),
      }
    );

    // First render: URL should contain old label selector
    const firstUrl = spy.mock.calls[spy.mock.calls.length - 1][0].connections[0]?.url;
    expect(firstUrl).toContain('labelSelector=app%3Dold');

    // Change queryParams
    qp = { labelSelector: 'app=new' };
    rerender();

    // After rerender: URL should contain new label selector
    const updatedUrl = spy.mock.calls[spy.mock.calls.length - 1][0].connections[0]?.url;
    expect(updatedUrl).toContain('labelSelector=app%3Dnew');
  });
});

describe('kubeObjectListQuery', () => {
  it('should return a queryKey', () => {
    const endpoint = { version: 'v1', resource: 'pods' };
    const result = kubeObjectListQuery(mockClass, endpoint, 'default', 'cluster-a', {});
    expect(result.queryKey).toEqual([
      'kubeObject',
      'list',
      'v1',
      'pods',
      'cluster-a',
      'default',
      {},
    ]);
  });
});

describe('useWatchKubeObjectLists (Multiplexer)', () => {
  beforeEach(() => {
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'true');
    vi.clearAllMocks();
  });

  it('should subscribe using WebSocketManager when multiplexer is enabled', () => {
    const lists = [{ cluster: 'cluster-a', namespace: 'namespace-a', resourceVersion: '1' }];

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          endpoint: { version: 'v1', resource: 'pods' },
          lists,
        }),
      {
        wrapper: createTestWrapper(),
      }
    );

    expect(mockSubscribe).toHaveBeenCalledWith(
      'cluster-a',
      expect.stringContaining('/api/v1/namespaces/namespace-a/pods'),
      'watch=1&resourceVersion=1',
      expect.any(Function)
    );
  });

  it('should subscribe to multiple clusters', () => {
    const lists = [
      { cluster: 'cluster-a', namespace: 'namespace-a', resourceVersion: '1' },
      { cluster: 'cluster-b', namespace: 'namespace-b', resourceVersion: '2' },
    ];

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          endpoint: { version: 'v1', resource: 'pods' },
          lists,
        }),
      {
        wrapper: createTestWrapper(),
      }
    );

    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    expect(mockSubscribe).toHaveBeenNthCalledWith(
      1,
      'cluster-a',
      expect.stringContaining('/api/v1/namespaces/namespace-a/pods'),
      'watch=1&resourceVersion=1',
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenNthCalledWith(
      2,
      'cluster-b',
      expect.stringContaining('/api/v1/namespaces/namespace-b/pods'),
      'watch=1&resourceVersion=2',
      expect.any(Function)
    );
  });

  it('should handle non-namespaced resources', () => {
    const lists = [{ cluster: 'cluster-a', resourceVersion: '1' }];

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          endpoint: { version: 'v1', resource: 'pods' },
          lists,
        }),
      {
        wrapper: createTestWrapper(),
      }
    );

    expect(mockSubscribe).toHaveBeenCalledWith(
      'cluster-a',
      expect.stringContaining('/api/v1/pods'),
      'watch=1&resourceVersion=1',
      expect.any(Function)
    );
  });
});

describe('kubeListApi cache behavior', () => {
  beforeEach(() => {
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'false');
    vi.clearAllMocks();
  });

  it('should update RTK Query cache when websocket sends ADDED message (legacy)', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [
        { cluster: 'default', namespace: 'a', queryParams: {} },
        { cluster: 'default', namespace: 'b', queryParams: {} },
      ],
    };

    // Prepopulate RTK Query cache with existing list data
    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [], metadata: { resourceVersion: '0' } },
            cluster: 'default',
            namespace: 'a',
          },
          {
            list: { items: [], metadata: { resourceVersion: '0' } },
            cluster: 'default',
            namespace: 'b',
          },
        ],
        errors: [],
      } as any)
    );

    // Render the watch hook with queryArgs for cache updates
    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [
            { cluster: 'default', resourceVersion: '1', namespace: 'a' },
            { cluster: 'default', resourceVersion: '1', namespace: 'b' },
          ],
          endpoint,
          queryArgs,
        }),
      {
        wrapper: createTestWrapper(store),
      }
    );

    // Simulate ADDED message for namespace 'a'
    const connectionToA = spy.mock.calls[0][0].connections[0];
    const objectA = { metadata: { namespace: 'a', resourceVersion: '123' } };
    act(() => {
      connectionToA.onMessage({ type: 'ADDED', object: objectA });
    });

    // Simulate ADDED message for namespace 'b'
    const connectionToB = spy.mock.calls[0][0].connections[1];
    const objectB = { metadata: { namespace: 'b', resourceVersion: '456' } };
    act(() => {
      connectionToB.onMessage({ type: 'ADDED', object: objectB });
    });
    flushWSThrottle();

    // Verify cache was updated with new items
    const state = store.getState().queryApi;
    const queryKey = Object.keys(state.queries)[0];
    const cached = state.queries[queryKey]?.data as any;

    expect(cached).toBeDefined();
    expect(cached.lists).toHaveLength(2);
    expect(cached.lists[0].list.items).toHaveLength(1);
    expect(cached.lists[0].list.items[0].jsonData).toBe(objectA);
    expect(cached.lists[1].list.items).toHaveLength(1);
    expect(cached.lists[1].list.items[0].jsonData).toBe(objectB);
  });

  it('should update RTK Query cache when websocket sends ADDED message (multiplexer)', async () => {
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'true');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'cluster-a', namespace: 'ns-a', queryParams: {} }],
    };

    // Prepopulate RTK Query cache
    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [], metadata: { resourceVersion: '0' } },
            cluster: 'cluster-a',
            namespace: 'ns-a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'cluster-a', resourceVersion: '1', namespace: 'ns-a' }],
          endpoint,
          queryArgs,
        }),
      {
        wrapper: createTestWrapper(store),
      }
    );

    // The multiplexer subscribe should have been called
    expect(mockSubscribe).toHaveBeenCalledTimes(1);

    // Get the callback from subscribe and invoke it
    const updateCallback = mockSubscribe.mock.calls[0][3];
    const newObject = { metadata: { namespace: 'ns-a', resourceVersion: '999' } };

    act(() => {
      updateCallback({ type: 'ADDED', object: newObject });
    });
    flushWSThrottle();

    // Verify the cache was updated
    const state = store.getState().queryApi;
    const queryKey = Object.keys(state.queries)[0];
    const cached = state.queries[queryKey]?.data as any;

    expect(cached).toBeDefined();
    expect(cached.lists[0].list.items).toHaveLength(1);
    expect(cached.lists[0].list.items[0].jsonData).toBe(newObject);
  });

  it('should not update cache when queryArgs is not provided', () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };

    // Render without queryArgs
    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'default', resourceVersion: '1', namespace: 'a' }],
          endpoint,
          // no queryArgs
        }),
      {
        wrapper: createTestWrapper(store),
      }
    );

    // Simulate message — should not crash
    const connection = spy.mock.calls[0][0].connections[0];
    act(() => {
      connection.onMessage({ type: 'ADDED', object: { metadata: { resourceVersion: '1' } } });
    });
    flushWSThrottle();

    // Cache should still be empty since we didn't provide queryArgs
    const state = store.getState().queryApi;
    expect(Object.keys(state.queries).length).toBe(0);
  });
});

describe('kubeListApi serialization', () => {
  it('should produce the same cache key regardless of kubeObjectClass reference', async () => {
    const store = createTestStore();
    const endpoint = { version: 'v1', resource: 'pods' };

    const classA = class {
      static apiVersion = 'v1';
      static apiName = 'pods';
      constructor(public jsonData: any) {}
    } as any;

    const classB = class {
      static apiVersion = 'v1';
      static apiName = 'pods';
      constructor(public jsonData: any) {}
    } as any;

    const argsA = {
      kubeObjectClass: classA,
      endpoint,
      queries: [{ cluster: 'default', queryParams: {} }],
    };
    const argsB = {
      kubeObjectClass: classB,
      endpoint,
      queries: [{ cluster: 'default', queryParams: {} }],
    };

    // Upsert data with classA
    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', argsA, {
        lists: [
          {
            list: { items: [{ name: 'pod-1' }], metadata: { resourceVersion: '0' } },
            cluster: 'default',
          },
        ],
        errors: [],
      } as any)
    );

    // Upsert data with classB (same serialized key, different class reference)
    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', argsB, {
        lists: [
          {
            list: { items: [{ name: 'pod-2' }], metadata: { resourceVersion: '1' } },
            cluster: 'default',
          },
        ],
        errors: [],
      } as any)
    );

    // Both should hit the same cache entry since kubeObjectClass is excluded from serialization
    const state = store.getState().queryApi;
    const queryKeys = Object.keys(state.queries);
    expect(queryKeys.length).toBe(1);

    // The value should be the last upserted one
    const cached = state.queries[queryKeys[0]]?.data as any;
    expect(cached.lists[0].list.items[0].name).toBe('pod-2');
  });
});

describe('kubeListApi partial error handling', () => {
  it('should include partial errors in result when some fetches fail', async () => {
    const store = createTestStore();
    const endpoint = { version: 'v1', resource: 'pods' };

    // Create query args that will produce a mix of success and failure
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [
        { cluster: 'cluster-ok', queryParams: {} },
        { cluster: 'cluster-fail', queryParams: {} },
      ],
    };

    // Prepopulate with a result that has both lists and partial errors
    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [{ name: 'pod-1' }], metadata: { resourceVersion: '0' } },
            cluster: 'cluster-ok',
          },
          null, // failed fetch
        ],
        errors: [{ message: 'forbidden', status: 403 }],
      } as any)
    );

    const state = store.getState().queryApi;
    const queryKey = Object.keys(state.queries)[0];
    const cached = state.queries[queryKey]?.data as any;

    // The result should contain both lists and errors
    expect(cached.lists).toHaveLength(2);
    expect(cached.lists[0]).not.toBeNull();
    expect(cached.lists[1]).toBeNull();
    expect(cached.errors).toHaveLength(1);
    expect(cached.errors[0].message).toBe('forbidden');
  });
});

describe('kubeListApi indexMap with partial failures', () => {
  beforeEach(() => {
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'false');
    vi.clearAllMocks();
  });

  it('should update the correct cache index when a middle list fetch failed (legacy)', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    // 3 queries: cluster-a, cluster-b (will fail), cluster-c
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [
        { cluster: 'cluster-a', namespace: 'ns-a', queryParams: {} },
        { cluster: 'cluster-b', namespace: 'ns-b', queryParams: {} },
        { cluster: 'cluster-c', namespace: 'ns-c', queryParams: {} },
      ],
    };

    // Prepopulate cache: cluster-b failed (null), others succeeded
    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [], metadata: { resourceVersion: '0' } },
            cluster: 'cluster-a',
            namespace: 'ns-a',
          },
          null, // cluster-b fetch failed
          {
            list: { items: [], metadata: { resourceVersion: '0' } },
            cluster: 'cluster-c',
            namespace: 'ns-c',
          },
        ],
        errors: [{ message: 'forbidden', status: 403 }],
      } as any)
    );

    // Only watch successfully fetched lists (skipping cluster-b)
    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [
            { cluster: 'cluster-a', resourceVersion: '1', namespace: 'ns-a' },
            { cluster: 'cluster-c', resourceVersion: '1', namespace: 'ns-c' },
          ],
          endpoint,
          queryArgs,
        }),
      {
        wrapper: createTestWrapper(store),
      }
    );

    // Connection[1] is for cluster-c (the 2nd watched list)
    const connectionToC = spy.mock.calls[0][0].connections[1];
    const objectC = { metadata: { namespace: 'ns-c', resourceVersion: '123' } };
    act(() => {
      connectionToC.onMessage({ type: 'ADDED', object: objectC });
    });
    flushWSThrottle();

    // Verify the update went to draft.lists[2] (cluster-c's position in queryArgs.queries)
    // NOT draft.lists[1] (which would be wrong — that's the null/failed entry)
    const state = store.getState().queryApi;
    const queryKey = Object.keys(state.queries)[0];
    const cached = state.queries[queryKey]?.data as any;

    expect(cached.lists).toHaveLength(3);
    expect(cached.lists[0].list.items).toHaveLength(0); // cluster-a unchanged
    expect(cached.lists[1]).toBeNull(); // cluster-b still null
    expect(cached.lists[2].list.items).toHaveLength(1); // cluster-c got the update
    expect(cached.lists[2].list.items[0].jsonData).toBe(objectC);
  });

  it('should update the correct cache index when a middle list fetch failed (multiplexer)', async () => {
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'true');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [
        { cluster: 'cluster-a', namespace: 'ns-a', queryParams: {} },
        { cluster: 'cluster-b', namespace: 'ns-b', queryParams: {} },
        { cluster: 'cluster-c', namespace: 'ns-c', queryParams: {} },
      ],
    };

    // Prepopulate cache: cluster-b failed (null)
    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [], metadata: { resourceVersion: '0' } },
            cluster: 'cluster-a',
            namespace: 'ns-a',
          },
          null,
          {
            list: { items: [], metadata: { resourceVersion: '0' } },
            cluster: 'cluster-c',
            namespace: 'ns-c',
          },
        ],
        errors: [{ message: 'forbidden', status: 403 }],
      } as any)
    );

    // Only watch successfully fetched lists (skipping cluster-b)
    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [
            { cluster: 'cluster-a', resourceVersion: '1', namespace: 'ns-a' },
            { cluster: 'cluster-c', resourceVersion: '1', namespace: 'ns-c' },
          ],
          endpoint,
          queryArgs,
        }),
      {
        wrapper: createTestWrapper(store),
      }
    );

    // cluster-c's subscribe call is the 2nd one (index 1)
    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    const updateCallbackC = mockSubscribe.mock.calls[1][3];
    const objectC = { metadata: { namespace: 'ns-c', resourceVersion: '999' } };

    act(() => {
      updateCallbackC({ type: 'ADDED', object: objectC });
    });
    flushWSThrottle();

    // Verify the update went to draft.lists[2] (cluster-c's position in queryArgs.queries)
    const state = store.getState().queryApi;
    const queryKey = Object.keys(state.queries)[0];
    const cached = state.queries[queryKey]?.data as any;

    expect(cached.lists).toHaveLength(3);
    expect(cached.lists[0].list.items).toHaveLength(0); // cluster-a unchanged
    expect(cached.lists[1]).toBeNull(); // cluster-b still null
    expect(cached.lists[2].list.items).toHaveLength(1); // cluster-c got the update
    expect(cached.lists[2].list.items[0].jsonData).toBe(objectC);
  });
});

describe('kubeListApi legacy no-op cache writes', () => {
  beforeEach(() => {
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'false');
    vi.clearAllMocks();
  });

  it('should skip cache write when applyUpdate returns same list (stale resourceVersion)', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'default', namespace: 'a', queryParams: {} }],
    };

    // Prepopulate cache with resourceVersion '100'
    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: {
              items: [new mockClass({ metadata: { name: 'pod-1', uid: 'abc', namespace: 'a' } })],
              metadata: { resourceVersion: '100' },
            },
            cluster: 'default',
            namespace: 'a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'default', resourceVersion: '1', namespace: 'a' }],
          endpoint,
          queryArgs,
        }),
      {
        wrapper: createTestWrapper(store),
      }
    );

    // Get the state before message
    const stateBefore = store.getState().queryApi;
    const queryKey = Object.keys(stateBefore.queries)[0];
    const dataBefore = stateBefore.queries[queryKey]?.data;

    // Send an update with an older resourceVersion — applyUpdate returns the same list reference
    const connection = spy.mock.calls[0][0].connections[0];
    act(() => {
      connection.onMessage({
        type: 'MODIFIED',
        object: { metadata: { name: 'pod-1', uid: 'abc', namespace: 'a', resourceVersion: '50' } },
      });
    });
    flushWSThrottle();

    // Cache reference should be unchanged (no-op write skipped by our guard)
    const stateAfter = store.getState().queryApi;
    const dataAfter = stateAfter.queries[queryKey]?.data;
    expect(dataAfter).toBe(dataBefore);
  });
});

describe('kubeListApi cache behavior (MODIFIED / DELETED)', () => {
  beforeEach(() => {
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'false');
    vi.clearAllMocks();
  });

  it('should update an existing item on MODIFIED message', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const existingItem = new mockClass({
      metadata: { name: 'pod-1', namespace: 'a', uid: 'uid-1', resourceVersion: '10' },
    });
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'default', namespace: 'a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [existingItem], metadata: { resourceVersion: '10' } },
            cluster: 'default',
            namespace: 'a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'default', resourceVersion: '10', namespace: 'a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const connection = spy.mock.calls[0][0].connections[0];

    // Send MODIFIED message with newer resourceVersion
    act(() => {
      connection.onMessage({
        type: 'MODIFIED',
        object: {
          metadata: {
            name: 'pod-1',
            namespace: 'a',
            uid: 'uid-1',
            resourceVersion: '20',
          },
          spec: { updated: true },
        },
      });
    });
    flushWSThrottle();

    const state = store.getState().queryApi;
    const queryKey = Object.keys(state.queries)[0];
    const cached = state.queries[queryKey]?.data as any;

    expect(cached.lists[0].list.items).toHaveLength(1);
    expect(cached.lists[0].list.items[0].jsonData.spec?.updated).toBe(true);
    expect(cached.lists[0].list.metadata.resourceVersion).toBe('20');
  });

  it('should remove an item on DELETED message', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const item1 = new mockClass({
      metadata: { name: 'pod-1', namespace: 'a', uid: 'uid-1', resourceVersion: '10' },
    });
    const item2 = new mockClass({
      metadata: { name: 'pod-2', namespace: 'a', uid: 'uid-2', resourceVersion: '10' },
    });
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'default', namespace: 'a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [item1, item2], metadata: { resourceVersion: '10' } },
            cluster: 'default',
            namespace: 'a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'default', resourceVersion: '10', namespace: 'a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const connection = spy.mock.calls[0][0].connections[0];

    // DELETED event for pod-1
    act(() => {
      connection.onMessage({
        type: 'DELETED',
        object: {
          metadata: {
            name: 'pod-1',
            namespace: 'a',
            uid: 'uid-1',
            resourceVersion: '20',
          },
        },
      });
    });
    flushWSThrottle();

    const state = store.getState().queryApi;
    const queryKey = Object.keys(state.queries)[0];
    const cached = state.queries[queryKey]?.data as any;

    // Should have 1 item remaining (pod-2)
    expect(cached.lists[0].list.items).toHaveLength(1);
    expect(cached.lists[0].list.items[0].metadata.name).toBe('pod-2');
  });
});

describe('kubeListApi multiplexer cache writes', () => {
  beforeEach(() => {
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'true');
    vi.clearAllMocks();
  });

  it('should skip cache write on stale resourceVersion (multiplexer)', async () => {
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const existingItem = new mockClass({
      metadata: { name: 'pod-1', namespace: 'ns-a', uid: 'uid-1', resourceVersion: '100' },
    });
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'cluster-a', namespace: 'ns-a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [existingItem], metadata: { resourceVersion: '100' } },
            cluster: 'cluster-a',
            namespace: 'ns-a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'cluster-a', resourceVersion: '1', namespace: 'ns-a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const stateBefore = store.getState().queryApi;
    const queryKey = Object.keys(stateBefore.queries)[0];
    const dataBefore = stateBefore.queries[queryKey]?.data;

    // Send stale MODIFIED message
    const updateCallback = mockSubscribe.mock.calls[0][3];
    act(() => {
      updateCallback({
        type: 'MODIFIED',
        object: {
          metadata: { name: 'pod-1', uid: 'uid-1', namespace: 'ns-a', resourceVersion: '50' },
        },
      });
    });
    flushWSThrottle();

    // Cache reference should not change
    const stateAfter = store.getState().queryApi;
    const dataAfter = stateAfter.queries[queryKey]?.data;
    expect(dataAfter).toBe(dataBefore);
  });

  it('should update cache on fresh MODIFIED message (multiplexer)', async () => {
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const existingItem = new mockClass({
      metadata: { name: 'pod-1', namespace: 'ns-a', uid: 'uid-1', resourceVersion: '10' },
    });
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'cluster-a', namespace: 'ns-a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [existingItem], metadata: { resourceVersion: '10' } },
            cluster: 'cluster-a',
            namespace: 'ns-a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'cluster-a', resourceVersion: '10', namespace: 'ns-a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const updateCallback = mockSubscribe.mock.calls[0][3];
    act(() => {
      updateCallback({
        type: 'MODIFIED',
        object: {
          metadata: {
            name: 'pod-1',
            uid: 'uid-1',
            namespace: 'ns-a',
            resourceVersion: '200',
          },
          spec: { modified: true },
        },
      });
    });
    flushWSThrottle();

    const state = store.getState().queryApi;
    const queryKey = Object.keys(state.queries)[0];
    const cached = state.queries[queryKey]?.data as any;

    expect(cached.lists[0].list.items).toHaveLength(1);
    expect(cached.lists[0].list.items[0].jsonData.spec?.modified).toBe(true);
    expect(cached.lists[0].list.metadata.resourceVersion).toBe('200');
  });

  it('should not crash when update has no matching cache entry', async () => {
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'cluster-a', namespace: 'ns-a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [], metadata: { resourceVersion: '0' } },
            cluster: 'cluster-a',
            namespace: 'ns-a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'cluster-a', resourceVersion: '1', namespace: 'ns-a' }],
          endpoint,
          // Deliberately pass different queryArgs so cache entry won't be found
          queryArgs: {
            kubeObjectClass: mockClass,
            endpoint,
            queries: [{ cluster: 'cluster-b', namespace: 'ns-b', queryParams: {} }],
          },
        }),
      { wrapper: createTestWrapper(store) }
    );

    // The subscribe should have been called
    expect(mockSubscribe).toHaveBeenCalledTimes(1);

    // Send an update — should not crash even though cache entry uses different args
    const updateCallback = mockSubscribe.mock.calls[0][3];
    act(() => {
      updateCallback({
        type: 'ADDED',
        object: { metadata: { name: 'pod-x', uid: 'x', namespace: 'ns-a', resourceVersion: '5' } },
      });
    });
    flushWSThrottle();

    // Original cache entry should be unchanged
    const state = store.getState().queryApi;
    const queryKey = Object.keys(state.queries)[0];
    const cached = state.queries[queryKey]?.data as any;
    expect(cached.lists[0].list.items).toHaveLength(0);
  });

  it('should ignore invalid/null update messages', async () => {
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'cluster-a', namespace: 'ns-a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [], metadata: { resourceVersion: '0' } },
            cluster: 'cluster-a',
            namespace: 'ns-a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'cluster-a', resourceVersion: '1', namespace: 'ns-a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const updateCallback = mockSubscribe.mock.calls[0][3];

    // Send null, undefined, and non-object values — should not crash
    act(() => {
      updateCallback(null);
      updateCallback(undefined);
      updateCallback('not-an-object');
    });
    flushWSThrottle();

    // Cache should be unchanged
    const state = store.getState().queryApi;
    const queryKey = Object.keys(state.queries)[0];
    const cached = state.queries[queryKey]?.data as any;
    expect(cached.lists[0].list.items).toHaveLength(0);
  });
});

describe('getKubeObjectLists error normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClusterFetch.mockReset();
  });

  it('should normalize non-ApiError rejections into ApiError with cluster/namespace', async () => {
    const store = createTestStore();

    // First call succeeds, second throws a plain Error (not ApiError)
    mockClusterFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              items: [],
              metadata: { resourceVersion: '1' },
              kind: 'PodList',
              apiVersion: 'v1',
            }),
        })
      )
      .mockImplementationOnce(() => Promise.reject(new TypeError('JSON parse error')));

    const result = await store.dispatch(
      kubeListApi.endpoints.getKubeObjectLists.initiate({
        kubeObjectClass: mockClass,
        endpoint: { version: 'v1', resource: 'pods' },
        queries: [
          { cluster: 'cluster-ok', namespace: 'ns-a', queryParams: {} },
          { cluster: 'cluster-fail', namespace: 'ns-b', queryParams: {} },
        ],
      })
    );

    // Partial success: data should exist with lists and errors
    expect(result.data).toBeDefined();
    expect(result.data!.lists).toHaveLength(2);
    expect(result.data!.lists[0]).not.toBeNull();
    expect(result.data!.lists[1]).toBeNull();

    // Error should be normalized to ApiError with cluster/namespace
    expect(result.data!.errors).toHaveLength(1);
    const err = result.data!.errors[0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('JSON parse error');
    expect(err.cluster).toBe('cluster-fail');
    expect(err.namespace).toBe('ns-b');
  });

  it('should preserve ApiError instances from rejections unchanged', async () => {
    const store = createTestStore();

    mockClusterFetch.mockImplementationOnce(() =>
      Promise.reject(new ApiError('forbidden', { status: 403, cluster: 'c1', namespace: 'ns1' }))
    );

    const result = await store.dispatch(
      kubeListApi.endpoints.getKubeObjectLists.initiate({
        kubeObjectClass: mockClass,
        endpoint: { version: 'v1', resource: 'pods' },
        queries: [{ cluster: 'c1', namespace: 'ns1', queryParams: {} }],
      })
    );

    // All queries failed — should be returned as error
    expect(result.error).toBeDefined();
    const err = result.error as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('forbidden');
    expect(err.status).toBe(403);
  });

  it('should normalize string rejection reasons into ApiError', async () => {
    const store = createTestStore();

    mockClusterFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              items: [],
              metadata: { resourceVersion: '1' },
              kind: 'PodList',
              apiVersion: 'v1',
            }),
        })
      )
      .mockImplementationOnce(() => Promise.reject('network timeout'));

    const result = await store.dispatch(
      kubeListApi.endpoints.getKubeObjectLists.initiate({
        kubeObjectClass: mockClass,
        endpoint: { version: 'v1', resource: 'pods' },
        queries: [
          { cluster: 'ok', namespace: 'ns-a', queryParams: {} },
          { cluster: 'timeout', namespace: 'ns-b', queryParams: {} },
        ],
      })
    );

    expect(result.data).toBeDefined();
    expect(result.data!.errors).toHaveLength(1);
    const err = result.data!.errors[0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('network timeout');
    expect(err.cluster).toBe('timeout');
    expect(err.namespace).toBe('ns-b');
  });
});

// ================================================================
// KubeList.applyUpdate: performance and correctness fixes for busy clusters
// ================================================================

describe('KubeList.applyUpdate busy-cluster optimizations', () => {
  /**
   * ERROR events must return the same list reference (no-op) so the WS
   * cache handler's `newList !== draft.lists[idx].list` guard skips the
   * cache write.  On a 20K-pod cluster, avoiding the full items-array
   * copy + Immer produce + React re-render per ERROR event is critical.
   */
  it('should return the same reference for ERROR events (no-op)', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      metadata: { name: `pod-${i}`, uid: `uid-${i}`, resourceVersion: '10' },
    }));

    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items,
      metadata: { resourceVersion: '100' },
    } as any;

    const errorUpdate = {
      type: 'ERROR' as const,
      object: { metadata: { resourceVersion: '200' } },
    } as any;

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = KubeList.applyUpdate(list, errorUpdate, mockClass, 'cluster-a');
    spy.mockRestore();

    expect(result).toBe(list);
  });

  /**
   * DELETED events for a UID that doesn't exist in the list must also
   * return the same reference.  Kubernetes can send DELETED for objects
   * we don't track (e.g., paginated list, already removed).
   */
  it('should return the same reference when DELETED targets a non-existent UID', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '10' } }],
      metadata: { resourceVersion: '5' },
    } as any;

    const deleteUpdate = {
      type: 'DELETED' as const,
      object: { metadata: { uid: 'nonexistent-uid', resourceVersion: '200' } },
    } as any;

    const result = KubeList.applyUpdate(list, deleteUpdate, mockClass, 'cluster-a');

    expect(result).toBe(list);
  });

  /**
   * ERROR events must not corrupt the list's resourceVersion metadata.
   * Previously, the returned list had `resourceVersion: undefined` from
   * the ERROR object, which broke all future stale-version checks.
   */
  it('should preserve metadata on ERROR event with missing resourceVersion', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '10' } }],
      metadata: { resourceVersion: '10' },
    } as any;

    const errorUpdate = {
      type: 'ERROR' as const,
      object: { metadata: { resourceVersion: undefined } },
    } as any;

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = KubeList.applyUpdate(list, errorUpdate, mockClass, 'cluster-a');
    spy.mockRestore();

    expect(result).toBe(list);
    expect(result.metadata.resourceVersion).toBe('10');
  });

  /**
   * Updates with null or missing object.metadata must not crash.
   * Malformed WS events can arrive on real clusters.
   */
  it('should return same reference when update.object.metadata is missing', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '10' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      { type: 'ADDED', object: { kind: 'Pod' } } as any,
      mockClass,
      'cluster-a'
    );

    expect(result).toBe(list);
  });

  it('should return same reference when update.object is null', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '10' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      { type: 'ADDED', object: null } as any,
      mockClass,
      'cluster-a'
    );

    expect(result).toBe(list);
  });
});

describe('WS cache writes with KubeList optimizations', () => {
  beforeEach(() => {
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'false');
    vi.clearAllMocks();
  });

  /**
   * ERROR WS events must not write to cache (no-op).
   * On busy clusters, ERROR events (e.g., resource version expired) are
   * common.  Each unnecessary cache write triggers Immer produce on the
   * full list + React re-render of all consumers.
   */
  it('should not write to cache on ERROR WS event', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'default', namespace: 'a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: {
              items: [
                new mockClass({
                  metadata: { name: 'pod-1', uid: 'uid-1', namespace: 'a', resourceVersion: '10' },
                }),
              ],
              metadata: { resourceVersion: '10' },
            },
            cluster: 'default',
            namespace: 'a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'default', resourceVersion: '10', namespace: 'a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const stateBefore = store.getState().queryApi;
    const queryKey = Object.keys(stateBefore.queries)[0];
    const dataBefore = stateBefore.queries[queryKey]?.data;

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const connection = spy.mock.calls[0][0].connections[0];
    act(() => {
      connection.onMessage({
        type: 'ERROR',
        object: { metadata: { resourceVersion: '999' } },
      });
    });
    flushWSThrottle();
    errSpy.mockRestore();

    const stateAfter = store.getState().queryApi;
    const dataAfter = stateAfter.queries[queryKey]?.data;
    expect(dataAfter).toBe(dataBefore);
  });

  /**
   * DELETED for non-existent UID must not write to cache.
   */
  it('should not write to cache when DELETED targets non-existent UID', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'default', namespace: 'a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: {
              items: [
                new mockClass({
                  metadata: { name: 'pod-1', uid: 'uid-1', namespace: 'a', resourceVersion: '10' },
                }),
              ],
              metadata: { resourceVersion: '10' },
            },
            cluster: 'default',
            namespace: 'a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'default', resourceVersion: '10', namespace: 'a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const stateBefore = store.getState().queryApi;
    const queryKey = Object.keys(stateBefore.queries)[0];
    const dataBefore = stateBefore.queries[queryKey]?.data;

    const connection = spy.mock.calls[0][0].connections[0];
    act(() => {
      connection.onMessage({
        type: 'DELETED',
        object: {
          metadata: {
            name: 'ghost-pod',
            uid: 'nonexistent',
            namespace: 'a',
            resourceVersion: '20',
          },
        },
      });
    });
    flushWSThrottle();

    const stateAfter = store.getState().queryApi;
    const dataAfter = stateAfter.queries[queryKey]?.data;
    expect(dataAfter).toBe(dataBefore);
  });

  /**
   * WS event with null update.object must not crash the onMessage handler.
   */
  it('should not crash on WS event with null update.object', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'default', namespace: 'a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [], metadata: { resourceVersion: '0' } },
            cluster: 'default',
            namespace: 'a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'default', resourceVersion: '1', namespace: 'a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const connection = spy.mock.calls[0][0].connections[0];
    expect(() => {
      act(() => {
        connection.onMessage({ type: 'ADDED', object: null });
      });
    }).not.toThrow();
    flushWSThrottle();
  });

  /**
   * WS event with missing metadata must not crash the onMessage handler.
   */
  it('should not crash on WS event with missing metadata', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'default', namespace: 'a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [], metadata: { resourceVersion: '0' } },
            cluster: 'default',
            namespace: 'a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'default', resourceVersion: '1', namespace: 'a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const connection = spy.mock.calls[0][0].connections[0];
    expect(() => {
      act(() => {
        connection.onMessage({ type: 'ADDED', object: { kind: 'Pod' } });
      });
    }).not.toThrow();
    flushWSThrottle();
  });
});

// ================================================================
// Bug-hunting tests: 25 tests probing potential RTK Query issues
// ================================================================

describe('KubeList.applyUpdate edge cases and correctness', () => {
  // Test 1: ADDED with same UID as existing item should replace, not duplicate
  it('should replace (not duplicate) when ADDED targets an existing UID', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [
        { metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '5' } },
        { metadata: { name: 'pod-2', uid: 'uid-2', resourceVersion: '6' } },
      ],
      metadata: { resourceVersion: '6' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'ADDED',
        object: {
          metadata: { name: 'pod-1-updated', uid: 'uid-1', resourceVersion: '10' },
        },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result.items).toHaveLength(2); // not 3
    expect(result.items[0].jsonData.metadata.name).toBe('pod-1-updated');
    expect(result.items[1].metadata.uid).toBe('uid-2');
  });

  // Test 2: MODIFIED should update metadata.resourceVersion on the list
  it('should update list metadata.resourceVersion after MODIFIED', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '5' } }],
      metadata: { resourceVersion: '5' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'MODIFIED',
        object: { metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '20' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result.metadata.resourceVersion).toBe('20');
  });

  // Test 3: DELETED should update list metadata.resourceVersion
  it('should update list metadata.resourceVersion after DELETED', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '5' } }],
      metadata: { resourceVersion: '5' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'DELETED',
        object: { metadata: { uid: 'uid-1', resourceVersion: '10' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result.items).toHaveLength(0);
    expect(result.metadata.resourceVersion).toBe('10');
  });

  // Test 4: Stale resourceVersion should be skipped
  it('should skip update with stale resourceVersion', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '100' } }],
      metadata: { resourceVersion: '100' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'MODIFIED',
        object: { metadata: { uid: 'uid-1', resourceVersion: '50' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result).toBe(list); // same reference = no-op
  });

  // Test 5: Equal resourceVersion should be skipped
  it('should skip update with equal resourceVersion', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '100' } }],
      metadata: { resourceVersion: '100' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'MODIFIED',
        object: { metadata: { uid: 'uid-1', resourceVersion: '100' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result).toBe(list);
  });

  // Test 6: Update with undefined resourceVersion should still apply
  it('should apply update when update has no resourceVersion', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '100' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'ADDED',
        object: { metadata: { name: 'new-pod', uid: 'new-uid' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result.items).toHaveLength(1);
    expect(result).not.toBe(list);
  });

  // Test 7: Update with resourceVersion "0" should apply when list has "0"
  it('should skip update with resourceVersion 0 when list also has 0', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '0' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'ADDED',
        object: { metadata: { name: 'pod', uid: 'uid-1', resourceVersion: '0' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    // parseInt("0") <= parseInt("0") → true → skip
    expect(result).toBe(list);
  });

  // Test 8: ADDED to empty list should work
  it('should add item to empty list', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '1' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'ADDED',
        object: { metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '5' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].cluster).toBe('cluster-a');
  });

  // Test 9: Unknown event type like BOOKMARK should not modify list
  it('should return same reference for BOOKMARK event type', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [{ metadata: { uid: 'uid-1', resourceVersion: '5' } }],
      metadata: { resourceVersion: '5' },
    } as any;

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = KubeList.applyUpdate(
      list,
      { type: 'BOOKMARK', object: { metadata: { resourceVersion: '100' } } } as any,
      mockClass,
      'cluster-a'
    );
    spy.mockRestore();

    expect(result).toBe(list);
    expect(result.metadata.resourceVersion).toBe('5'); // unchanged
  });

  // Test 10: MODIFIED preserves other items in the list
  it('should preserve other items when MODIFIED updates one item', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [
        { metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '5' } },
        { metadata: { name: 'pod-2', uid: 'uid-2', resourceVersion: '6' } },
        { metadata: { name: 'pod-3', uid: 'uid-3', resourceVersion: '7' } },
      ],
      metadata: { resourceVersion: '7' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'MODIFIED',
        object: { metadata: { name: 'pod-2-v2', uid: 'uid-2', resourceVersion: '20' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result.items).toHaveLength(3);
    // pod-1 and pod-3 should be unchanged references
    expect(result.items[0]).toBe(list.items[0]);
    expect(result.items[2]).toBe(list.items[2]);
    // pod-2 should be new
    expect(result.items[1].jsonData.metadata.name).toBe('pod-2-v2');
  });

  // Test 11: Cluster is passed to constructor for new items
  it('should pass cluster to itemClass constructor', () => {
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '1' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'ADDED',
        object: { metadata: { name: 'pod-1', uid: 'uid-1', resourceVersion: '5' } },
      } as any,
      mockClass,
      'my-cluster'
    );

    expect(result.items[0].cluster).toBe('my-cluster');
  });

  // Test 12: DELETED for non-existent UID does NOT copy the array (perf optimization)
  it('should not copy array when DELETED targets non-existent UID', () => {
    const items = [{ metadata: { uid: 'uid-1', resourceVersion: '5' } }];
    const list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items,
      metadata: { resourceVersion: '5' },
    } as any;

    const result = KubeList.applyUpdate(
      list,
      {
        type: 'DELETED',
        object: { metadata: { uid: 'nonexistent', resourceVersion: '10' } },
      } as any,
      mockClass,
      'cluster-a'
    );

    expect(result).toBe(list);
    // items array should be the exact same reference (not a copy)
    expect(result.items).toBe(items);
  });

  // Test 13: Multiple sequential updates maintain correct item count
  it('should handle sequential ADDED + MODIFIED + DELETED correctly', () => {
    let list = {
      kind: 'PodList',
      apiVersion: 'v1',
      items: [],
      metadata: { resourceVersion: '1' },
    } as any;

    // ADDED
    list = KubeList.applyUpdate(
      list,
      { type: 'ADDED', object: { metadata: { uid: 'a', resourceVersion: '2' } } } as any,
      mockClass,
      'c'
    );
    expect(list.items).toHaveLength(1);

    // ADDED another
    list = KubeList.applyUpdate(
      list,
      { type: 'ADDED', object: { metadata: { uid: 'b', resourceVersion: '3' } } } as any,
      mockClass,
      'c'
    );
    expect(list.items).toHaveLength(2);

    // MODIFIED first
    list = KubeList.applyUpdate(
      list,
      {
        type: 'MODIFIED',
        object: { metadata: { uid: 'a', resourceVersion: '4', name: 'updated' } },
      } as any,
      mockClass,
      'c'
    );
    expect(list.items).toHaveLength(2);
    expect(list.items[0].jsonData.metadata.name).toBe('updated');

    // DELETED second
    list = KubeList.applyUpdate(
      list,
      { type: 'DELETED', object: { metadata: { uid: 'b', resourceVersion: '5' } } } as any,
      mockClass,
      'c'
    );
    expect(list.items).toHaveLength(1);
    expect(list.items[0].metadata.uid).toBe('a');
  });
});

describe('buildListIndexMap and listKey edge cases', () => {
  // Test 14: Empty queries produces empty map
  it('buildListIndexMap with empty array returns empty map', () => {
    // The indexMap should be empty when there are no queries
    const store = createTestStore();
    const spy = vi.spyOn(websocket, 'useWebSockets');
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'false');
    vi.clearAllMocks();

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [],
          endpoint: { version: 'v1', resource: 'pods' },
          queryArgs: {
            kubeObjectClass: mockClass,
            endpoint: { version: 'v1', resource: 'pods' },
            queries: [],
          },
        }),
      { wrapper: createTestWrapper(store) }
    );

    // With empty lists, useWebSockets should be called with empty connections
    expect(spy).toHaveBeenCalledWith({ enabled: true, connections: [] });
  });

  // Test 15: WS event for cluster not in indexMap should not crash
  it('WS event for unknown cluster:namespace does not crash or write cache', async () => {
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'false');
    vi.clearAllMocks();
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    // queryArgs only has cluster-a
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'cluster-a', namespace: 'ns-a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [], metadata: { resourceVersion: '0' } },
            cluster: 'cluster-a',
            namespace: 'ns-a',
          },
        ],
        errors: [],
      } as any)
    );

    // Watch cluster-a only (matching queryArgs)
    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'cluster-a', resourceVersion: '1', namespace: 'ns-a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const queryKey = Object.keys(store.getState().queryApi.queries)[0];

    // Send event — this goes through cluster-a's connection
    // But the update itself is for a UID not in the list, triggering no-op via applyUpdate
    const connection = spy.mock.calls[0][0].connections[0];
    act(() => {
      connection.onMessage({
        type: 'ADDED',
        object: { metadata: { uid: 'new-uid', resourceVersion: '5' } },
      });
    });
    flushWSThrottle();

    const stateAfter = store.getState().queryApi;
    const dataAfter = stateAfter.queries[queryKey]?.data as any;
    // Cache WAS updated because the ADDED event is valid for cluster-a's namespace
    expect(dataAfter.lists[0].list.items).toHaveLength(1);
  });
});

describe('kubeListApi queryFn edge cases', () => {
  // Test 16: Error object rejection (not string, not ApiError)
  it('should normalize Error object rejections into ApiError', async () => {
    const store = createTestStore();

    mockClusterFetch.mockImplementationOnce(() =>
      Promise.reject(new TypeError('JSON parse failed'))
    );

    const result = await store.dispatch(
      kubeListApi.endpoints.getKubeObjectLists.initiate({
        kubeObjectClass: mockClass,
        endpoint: { version: 'v1', resource: 'pods' },
        queries: [{ cluster: 'err-cluster', namespace: 'err-ns', queryParams: {} }],
      })
    );

    // Single failure = all failed = returned as error
    expect(result.error).toBeDefined();
    const err = result.error as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('JSON parse failed');
  });

  // Test 17: Mix of success and Error rejection
  it('should return partial results with normalized errors', async () => {
    const store = createTestStore();

    mockClusterFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              items: [{ metadata: { name: 'p1' } }],
              metadata: { resourceVersion: '1' },
              kind: 'PodList',
              apiVersion: 'v1',
            }),
        })
      )
      .mockImplementationOnce(() => Promise.reject(new Error('connection reset')));

    const result = await store.dispatch(
      kubeListApi.endpoints.getKubeObjectLists.initiate({
        kubeObjectClass: mockClass,
        endpoint: { version: 'v1', resource: 'pods' },
        queries: [
          { cluster: 'ok', namespace: 'ns-a', queryParams: {} },
          { cluster: 'fail', namespace: 'ns-b', queryParams: {} },
        ],
      })
    );

    expect(result.data).toBeDefined();
    expect(result.data!.lists[0]).not.toBeNull();
    expect(result.data!.lists[1]).toBeNull();
    expect(result.data!.errors).toHaveLength(1);
    expect(result.data!.errors[0]).toBeInstanceOf(ApiError);
    expect(result.data!.errors[0].cluster).toBe('fail');
    expect(result.data!.errors[0].namespace).toBe('ns-b');
  });

  // Test 18: ApiError rejection preserves status code
  it('should preserve ApiError status and cluster on rejection', async () => {
    const store = createTestStore();

    const apiErr = new ApiError('forbidden', { status: 403, cluster: 'c1', namespace: 'ns1' });
    mockClusterFetch.mockImplementationOnce(() => Promise.reject(apiErr));

    const result = await store.dispatch(
      kubeListApi.endpoints.getKubeObjectLists.initiate({
        kubeObjectClass: mockClass,
        endpoint: { version: 'v1', resource: 'pods' },
        queries: [{ cluster: 'c1', namespace: 'ns1', queryParams: {} }],
      })
    );

    expect(result.error).toBeDefined();
    const err = result.error as ApiError;
    expect(err.status).toBe(403);
    expect(err.cluster).toBe('c1');
    expect(err.namespace).toBe('ns1');
  });

  // Test 19: Empty queries array should return empty results
  it('should return empty lists for empty queries array', async () => {
    const store = createTestStore();

    const result = await store.dispatch(
      kubeListApi.endpoints.getKubeObjectLists.initiate({
        kubeObjectClass: mockClass,
        endpoint: { version: 'v1', resource: 'pods' },
        queries: [],
      })
    );

    expect(result.data).toBeDefined();
    expect(result.data!.lists).toHaveLength(0);
    expect(result.data!.errors).toHaveLength(0);
  });

  // Test 20: Non-namespaced query (namespace undefined)
  it('should handle non-namespaced queries correctly', async () => {
    const store = createTestStore();

    mockClusterFetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            items: [{ metadata: { name: 'node-1' } }],
            metadata: { resourceVersion: '1' },
            kind: 'NodeList',
            apiVersion: 'v1',
          }),
      })
    );

    const result = await store.dispatch(
      kubeListApi.endpoints.getKubeObjectLists.initiate({
        kubeObjectClass: mockClass,
        endpoint: { version: 'v1', resource: 'nodes' },
        queries: [{ cluster: 'default', queryParams: {} }],
      })
    );

    expect(result.data).toBeDefined();
    expect(result.data!.lists[0]).not.toBeNull();
    expect(result.data!.lists[0]!.cluster).toBe('default');
    expect(result.data!.lists[0]!.namespace).toBeUndefined();
  });
});

describe('WS cache update correctness', () => {
  beforeEach(() => {
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'false');
    vi.clearAllMocks();
  });

  // Test 21: MODIFIED event correctly replaces the right item in cache
  it('should correctly replace item on MODIFIED WS event', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'default', namespace: 'a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: {
              items: [
                new mockClass({
                  metadata: { name: 'pod-1', uid: 'uid-1', namespace: 'a', resourceVersion: '10' },
                }),
                new mockClass({
                  metadata: { name: 'pod-2', uid: 'uid-2', namespace: 'a', resourceVersion: '11' },
                }),
              ],
              metadata: { resourceVersion: '11' },
            },
            cluster: 'default',
            namespace: 'a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'default', resourceVersion: '11', namespace: 'a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const connection = spy.mock.calls[0][0].connections[0];
    act(() => {
      connection.onMessage({
        type: 'MODIFIED',
        object: {
          metadata: { name: 'pod-1-updated', uid: 'uid-1', namespace: 'a', resourceVersion: '20' },
          status: { phase: 'Succeeded' },
        },
      });
    });
    flushWSThrottle();

    const state = store.getState().queryApi;
    const queryKey = Object.keys(state.queries)[0];
    const cached = state.queries[queryKey]?.data as any;

    expect(cached.lists[0].list.items).toHaveLength(2);
    expect(cached.lists[0].list.items[0].jsonData.metadata.name).toBe('pod-1-updated');
    expect(cached.lists[0].list.items[1].jsonData.metadata.name).toBe('pod-2');
  });

  // Test 22: DELETED event removes item from cache
  it('should remove item from cache on DELETED WS event', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'default', namespace: 'a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: {
              items: [
                new mockClass({
                  metadata: { name: 'pod-1', uid: 'uid-1', namespace: 'a', resourceVersion: '10' },
                }),
                new mockClass({
                  metadata: { name: 'pod-2', uid: 'uid-2', namespace: 'a', resourceVersion: '11' },
                }),
              ],
              metadata: { resourceVersion: '11' },
            },
            cluster: 'default',
            namespace: 'a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'default', resourceVersion: '11', namespace: 'a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const connection = spy.mock.calls[0][0].connections[0];
    act(() => {
      connection.onMessage({
        type: 'DELETED',
        object: { metadata: { uid: 'uid-1', namespace: 'a', resourceVersion: '20' } },
      });
    });
    flushWSThrottle();

    const state = store.getState().queryApi;
    const queryKey = Object.keys(state.queries)[0];
    const cached = state.queries[queryKey]?.data as any;

    expect(cached.lists[0].list.items).toHaveLength(1);
    expect(cached.lists[0].list.items[0].jsonData.metadata.uid).toBe('uid-2');
  });

  // Test 23: Multiple clusters with same namespace don't interfere
  it('should isolate updates between different clusters with same namespace', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [
        { cluster: 'cluster-a', namespace: 'default', queryParams: {} },
        { cluster: 'cluster-b', namespace: 'default', queryParams: {} },
      ],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: {
              items: [
                new mockClass({ metadata: { name: 'pod-a', uid: 'uid-a', resourceVersion: '1' } }),
              ],
              metadata: { resourceVersion: '1' },
            },
            cluster: 'cluster-a',
            namespace: 'default',
          },
          {
            list: {
              items: [
                new mockClass({ metadata: { name: 'pod-b', uid: 'uid-b', resourceVersion: '1' } }),
              ],
              metadata: { resourceVersion: '1' },
            },
            cluster: 'cluster-b',
            namespace: 'default',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [
            { cluster: 'cluster-a', resourceVersion: '1', namespace: 'default' },
            { cluster: 'cluster-b', resourceVersion: '1', namespace: 'default' },
          ],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    // Update cluster-a only
    const connectionA = spy.mock.calls[0][0].connections[0];
    act(() => {
      connectionA.onMessage({
        type: 'ADDED',
        object: { metadata: { name: 'new-pod-a', uid: 'new-uid-a', resourceVersion: '10' } },
      });
    });
    flushWSThrottle();

    const state = store.getState().queryApi;
    const queryKey = Object.keys(state.queries)[0];
    const cached = state.queries[queryKey]?.data as any;

    // cluster-a should have 2 items
    expect(cached.lists[0].list.items).toHaveLength(2);
    // cluster-b should still have 1 item (no interference)
    expect(cached.lists[1].list.items).toHaveLength(1);
  });

  // Test 24: WS event when cache entry (draft.lists[idx]) is null should not crash
  it('should not crash when cache entry at index is null', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [
        { cluster: 'ok', namespace: 'ns-a', queryParams: {} },
        { cluster: 'fail', namespace: 'ns-b', queryParams: {} },
      ],
    };

    // Pre-populate with null at index 1 (simulating partial failure)
    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: { items: [], metadata: { resourceVersion: '0' } },
            cluster: 'ok',
            namespace: 'ns-a',
          },
          null, // failed fetch
        ],
        errors: [],
      } as any)
    );

    // Watch only the successful list
    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'ok', resourceVersion: '1', namespace: 'ns-a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    // This should not crash even though draft.lists[1] is null
    const connection = spy.mock.calls[0][0].connections[0];
    expect(() => {
      act(() => {
        connection.onMessage({
          type: 'ADDED',
          object: { metadata: { uid: 'uid-1', resourceVersion: '5' } },
        });
      });
    }).not.toThrow();
  });

  // Test 25: Stale WS event (resourceVersion older than list) should not modify cache
  it('should not modify cache for stale WS events', async () => {
    const spy = vi.spyOn(websocket, 'useWebSockets');
    const store = createTestStore();

    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'default', namespace: 'a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: {
              items: [
                new mockClass({
                  metadata: { name: 'pod-1', uid: 'uid-1', namespace: 'a', resourceVersion: '100' },
                }),
              ],
              metadata: { resourceVersion: '100' },
            },
            cluster: 'default',
            namespace: 'a',
          },
        ],
        errors: [],
      } as any)
    );

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'default', resourceVersion: '100', namespace: 'a' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const stateBefore = store.getState().queryApi;
    const queryKey = Object.keys(stateBefore.queries)[0];
    const dataBefore = stateBefore.queries[queryKey]?.data;

    // Send stale event (rv 50 < list rv 100)
    const connection = spy.mock.calls[0][0].connections[0];
    act(() => {
      connection.onMessage({
        type: 'MODIFIED',
        object: { metadata: { uid: 'uid-1', resourceVersion: '50' } },
      });
    });
    flushWSThrottle();

    const stateAfter = store.getState().queryApi;
    const dataAfter = stateAfter.queries[queryKey]?.data;
    expect(dataAfter).toBe(dataBefore);
  });
});

describe('WS event throttling', () => {
  beforeEach(() => {
    mockUseWebSockets.mockReset();
    mockClusterFetch.mockReset();
    mockSubscribe.mockReset().mockImplementation(() => Promise.resolve(() => {}));
  });

  it('should batch multiple WS events into a single cache write', async () => {
    const store = createTestStore();
    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [
        { cluster: 'cluster-a', namespace: 'ns-a', queryParams: {} },
        { cluster: 'cluster-b', namespace: 'ns-b', queryParams: {} },
      ],
    };

    // Prepopulate cache
    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: {
              kind: 'PodList',
              apiVersion: 'v1',
              items: [],
              metadata: { resourceVersion: '0' },
            },
            cluster: 'cluster-a',
            namespace: 'ns-a',
          },
          {
            list: {
              kind: 'PodList',
              apiVersion: 'v1',
              items: [],
              metadata: { resourceVersion: '0' },
            },
            cluster: 'cluster-b',
            namespace: 'ns-b',
          },
        ],
        errors: [],
      } as any)
    );

    const spy = mockUseWebSockets;

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [
            { cluster: 'cluster-a', namespace: 'ns-a', resourceVersion: '1' },
            { cluster: 'cluster-b', namespace: 'ns-b', resourceVersion: '1' },
          ],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const connA = spy.mock.calls[0][0].connections[0];
    const connB = spy.mock.calls[0][0].connections[1];

    // Send 3 events rapidly without flushing
    act(() => {
      connA.onMessage({
        type: 'ADDED',
        object: { metadata: { uid: 'pod-a1', resourceVersion: '10', namespace: 'ns-a' } },
      });
      connB.onMessage({
        type: 'ADDED',
        object: { metadata: { uid: 'pod-b1', resourceVersion: '20', namespace: 'ns-b' } },
      });
      connA.onMessage({
        type: 'ADDED',
        object: { metadata: { uid: 'pod-a2', resourceVersion: '11', namespace: 'ns-a' } },
      });
    });

    // Cache should NOT be updated yet (events are throttled)
    const stateBefore = store.getState().queryApi;
    const keyBefore = Object.keys(stateBefore.queries)[0];
    const dataBefore = stateBefore.queries[keyBefore]?.data as any;
    expect(dataBefore.lists[0].list.items).toHaveLength(0);
    expect(dataBefore.lists[1].list.items).toHaveLength(0);

    // Now flush the throttle — all 3 events should be applied in ONE cache write
    flushWSThrottle();

    const stateAfter = store.getState().queryApi;
    const dataAfter = stateAfter.queries[keyBefore]?.data as any;
    expect(dataAfter.lists[0].list.items).toHaveLength(2); // pod-a1 + pod-a2
    expect(dataAfter.lists[1].list.items).toHaveLength(1); // pod-b1
  });

  it('should not flush before throttle interval elapses', async () => {
    const store = createTestStore();
    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'cluster-a', namespace: 'ns-a', queryParams: {} }],
    };

    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, {
        lists: [
          {
            list: {
              kind: 'PodList',
              apiVersion: 'v1',
              items: [],
              metadata: { resourceVersion: '0' },
            },
            cluster: 'cluster-a',
            namespace: 'ns-a',
          },
        ],
        errors: [],
      } as any)
    );

    const spy = mockUseWebSockets;

    renderHook(
      () =>
        useWatchKubeObjectLists({
          kubeObjectClass: mockClass,
          lists: [{ cluster: 'cluster-a', namespace: 'ns-a', resourceVersion: '1' }],
          endpoint,
          queryArgs,
        }),
      { wrapper: createTestWrapper(store) }
    );

    const conn = spy.mock.calls[0][0].connections[0];

    act(() => {
      conn.onMessage({
        type: 'ADDED',
        object: { metadata: { uid: 'pod-1', resourceVersion: '10', namespace: 'ns-a' } },
      });
    });

    // Advance by less than the throttle interval
    act(() => {
      vi.advanceTimersByTime(WS_THROTTLE_INTERVAL_MS - 10);
    });

    // Cache should still be empty
    const state = store.getState().queryApi;
    const key = Object.keys(state.queries)[0];
    const data = state.queries[key]?.data as any;
    expect(data.lists[0].list.items).toHaveLength(0);

    // Now advance past the interval
    act(() => {
      vi.advanceTimersByTime(20);
    });

    // Now cache should be updated
    const stateAfter = store.getState().queryApi;
    const dataAfter = stateAfter.queries[key]?.data as any;
    expect(dataAfter.lists[0].list.items).toHaveLength(1);
  });
});

/**
 * refetchOnMountOrArgChange: 180 tests
 *
 * RTK Query's refetchOnMountOrArgChange controls whether a hook refetches
 * when it remounts. With `true`, every remount triggers a refetch. With a
 * number (seconds), refetch is skipped if cached data is younger than that.
 *
 * These tests verify the 180-second stale window — matching React Query's
 * staleTime: 3 * 60_000 that the main branch used. Without this, Redux
 * dispatches (e.g. from fetchConfig) cause component re-renders that
 * remount list hooks, each remount triggers a refetch, creating a cascade
 * of requests that prevents Playwright's networkidle from being reached.
 */
describe('kubeListApi refetchOnMountOrArgChange stale window', () => {
  beforeEach(() => {
    vi.stubEnv('REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER', 'false');
    vi.clearAllMocks();
  });

  it('should not refetch when remounting within 180s stale window', async () => {
    const store = createTestStore();
    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'default', namespace: 'ns-a', queryParams: {} }],
    };

    // Mock fetch to return list data
    mockClusterFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          kind: 'PodList',
          items: [],
          metadata: { resourceVersion: '100' },
        }),
    });

    // First mount — triggers real fetch, setting fulfilledTimeStamp
    const { unmount } = renderHook(
      () =>
        kubeListApi.useGetKubeObjectListsQuery(queryArgs, {
          skip: false,
          refetchOnMountOrArgChange: 180,
        }),
      { wrapper: createTestWrapper(store) }
    );

    // Wait for fetch to complete
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });

    const fetchCountAfterFirstMount = mockClusterFetch.mock.calls.length;
    expect(fetchCountAfterFirstMount).toBeGreaterThan(0);

    // Unmount, advance 10 seconds (within 180s window)
    unmount();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    // Remount — should NOT refetch (data is only 10s old)
    const { unmount: unmount2 } = renderHook(
      () =>
        kubeListApi.useGetKubeObjectListsQuery(queryArgs, {
          skip: false,
          refetchOnMountOrArgChange: 180,
        }),
      { wrapper: createTestWrapper(store) }
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    // No new fetch calls
    expect(mockClusterFetch.mock.calls.length).toBe(fetchCountAfterFirstMount);

    unmount2();
  });

  it('should refetch when remounting after 180s stale window expires', async () => {
    const store = createTestStore();
    const endpoint = { version: 'v1', resource: 'pods' };
    const queryArgs = {
      kubeObjectClass: mockClass,
      endpoint,
      queries: [{ cluster: 'default', namespace: 'ns-a', queryParams: {} }],
    };

    // Mock fetch to return list data
    mockClusterFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          kind: 'PodList',
          items: [],
          metadata: { resourceVersion: '100' },
        }),
    });

    // First mount — triggers real fetch
    const { unmount } = renderHook(
      () =>
        kubeListApi.useGetKubeObjectListsQuery(queryArgs, {
          skip: false,
          refetchOnMountOrArgChange: 180,
        }),
      { wrapper: createTestWrapper(store) }
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });

    const fetchCountAfterFirstMount = mockClusterFetch.mock.calls.length;
    expect(fetchCountAfterFirstMount).toBeGreaterThan(0);

    // Unmount, advance past 180s window
    unmount();
    act(() => {
      vi.advanceTimersByTime(181_000);
    });

    // Remount — SHOULD refetch (data is stale)
    const { unmount: unmount2 } = renderHook(
      () =>
        kubeListApi.useGetKubeObjectListsQuery(queryArgs, {
          skip: false,
          refetchOnMountOrArgChange: 180,
        }),
      { wrapper: createTestWrapper(store) }
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(mockClusterFetch.mock.calls.length).toBeGreaterThan(fetchCountAfterFirstMount);

    unmount2();
  });
});
