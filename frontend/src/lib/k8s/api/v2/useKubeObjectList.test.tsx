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
import { headlampApi } from '../../../api/headlampApi';
import { ApiError } from './ApiError';
import {
  kubeListApi,
  kubeObjectListQuery,
  makeListRequests,
  useWatchKubeObjectLists,
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
    reducer: { [headlampApi.reducerPath]: headlampApi.reducer },
    middleware: getDefault =>
      getDefault({ serializableCheck: false }).concat(headlampApi.middleware),
  });
}

function createTestWrapper(store?: ReturnType<typeof createTestStore>) {
  const testStore = store ?? createTestStore();
  return ({ children }: PropsWithChildren) => <Provider store={testStore}>{children}</Provider>;
}

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

    // Verify cache was updated with new items
    const state = store.getState().headlampApi;
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

    // Verify the cache was updated
    const state = store.getState().headlampApi;
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

    // Cache should still be empty since we didn't provide queryArgs
    const state = store.getState().headlampApi;
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
    const state = store.getState().headlampApi;
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

    const state = store.getState().headlampApi;
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

    // Verify the update went to draft.lists[2] (cluster-c's position in queryArgs.queries)
    // NOT draft.lists[1] (which would be wrong — that's the null/failed entry)
    const state = store.getState().headlampApi;
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

    // Verify the update went to draft.lists[2] (cluster-c's position in queryArgs.queries)
    const state = store.getState().headlampApi;
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
    const stateBefore = store.getState().headlampApi;
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

    // Cache reference should be unchanged (no-op write skipped by our guard)
    const stateAfter = store.getState().headlampApi;
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

    const state = store.getState().headlampApi;
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

    const state = store.getState().headlampApi;
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

    const stateBefore = store.getState().headlampApi;
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

    // Cache reference should not change
    const stateAfter = store.getState().headlampApi;
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

    const state = store.getState().headlampApi;
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

    // Original cache entry should be unchanged
    const state = store.getState().headlampApi;
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

    // Cache should be unchanged
    const state = store.getState().headlampApi;
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
