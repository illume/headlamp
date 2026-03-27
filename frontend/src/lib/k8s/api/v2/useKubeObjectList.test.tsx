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

vi.mock('./webSocket', () => ({
  useWebSockets: (...args: any[]) => mockUseWebSockets(...args),
  BASE_WS_URL: 'http://localhost:3000',
}));

vi.mock('./multiplexer', () => ({
  WebSocketManager: {
    subscribe: (...args: any[]) => mockSubscribe(...args),
  },
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

  constructor(public jsonData: any) {}
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
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, [
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
      ] as any)
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
    const cached = state.queries[queryKey]?.data as any[];

    expect(cached).toBeDefined();
    expect(cached).toHaveLength(2);
    expect(cached[0].list.items).toHaveLength(1);
    expect(cached[0].list.items[0].jsonData).toBe(objectA);
    expect(cached[1].list.items).toHaveLength(1);
    expect(cached[1].list.items[0].jsonData).toBe(objectB);
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
      kubeListApi.util.upsertQueryData('getKubeObjectLists', queryArgs, [
        {
          list: { items: [], metadata: { resourceVersion: '0' } },
          cluster: 'cluster-a',
          namespace: 'ns-a',
        },
      ] as any)
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
    const cached = state.queries[queryKey]?.data as any[];

    expect(cached).toBeDefined();
    expect(cached[0].list.items).toHaveLength(1);
    expect(cached[0].list.items[0].jsonData).toBe(newObject);
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
      kubeListApi.util.upsertQueryData('getKubeObjectLists', argsA, [
        {
          list: { items: [{ name: 'pod-1' }], metadata: { resourceVersion: '0' } },
          cluster: 'default',
        },
      ] as any)
    );

    // Upsert data with classB (same serialized key, different class reference)
    await store.dispatch(
      kubeListApi.util.upsertQueryData('getKubeObjectLists', argsB, [
        {
          list: { items: [{ name: 'pod-2' }], metadata: { resourceVersion: '1' } },
          cluster: 'default',
        },
      ] as any)
    );

    // Both should hit the same cache entry since kubeObjectClass is excluded from serialization
    const state = store.getState().headlampApi;
    const queryKeys = Object.keys(state.queries);
    expect(queryKeys.length).toBe(1);

    // The value should be the last upserted one
    const cached = state.queries[queryKeys[0]]?.data as any[];
    expect(cached[0].list.items[0].name).toBe('pod-2');
  });
});
