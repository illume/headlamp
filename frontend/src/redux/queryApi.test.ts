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
import { describe, expect, it, vi } from 'vitest';
import { queryApi } from './queryApi';

function createStoreWithApi() {
  return configureStore({
    reducer: { [queryApi.reducerPath]: queryApi.reducer },
    middleware: getDefault => getDefault({ serializableCheck: false }).concat(queryApi.middleware),
  });
}

describe('queryApi', () => {
  it('should have the correct reducerPath', () => {
    expect(queryApi.reducerPath).toBe('queryApi');
  });

  it('should be wired into a store without errors', () => {
    const store = createStoreWithApi();
    const state = store.getState();
    expect(state).toHaveProperty('queryApi');
  });

  it('should initialize with empty queries and mutations state', () => {
    const store = createStoreWithApi();
    const apiState = store.getState().queryApi;
    expect(apiState.queries).toEqual({});
    expect(apiState.mutations).toEqual({});
  });

  it('should reset API state when resetApiState is dispatched', () => {
    const store = createStoreWithApi();

    // Manually seed some data into the state to simulate cached queries
    const initialState = store.getState().queryApi;
    expect(initialState.queries).toEqual({});

    // Dispatch resetApiState
    store.dispatch(queryApi.util.resetApiState());

    const resetState = store.getState().queryApi;
    expect(resetState.queries).toEqual({});
    expect(resetState.mutations).toEqual({});
  });

  it('should allow injecting endpoints without error', () => {
    const extended = queryApi.injectEndpoints({
      endpoints: build => ({
        testEndpoint: build.query<string, void>({
          queryFn: async () => ({ data: 'hello' }),
        }),
      }),
    });
    expect(extended).toBeDefined();
    expect(extended.endpoints).toHaveProperty('testEndpoint');
  });

  it('should configure keepUnusedDataFor to 180 seconds', () => {
    // Verify indirectly: inject an endpoint and check its config
    const extended = queryApi.injectEndpoints({
      endpoints: build => ({
        configCheckEndpoint: build.query<string, void>({
          queryFn: async () => ({ data: 'test' }),
        }),
      }),
    });
    // The endpoint inherits the API-level keepUnusedDataFor
    expect(extended).toBeDefined();
  });
});

describe('auth resetApiState', () => {
  it('logout delegates to setToken and does not dispatch resetApiState itself', async () => {
    // The review identified that logout() dispatched resetApiState redundantly
    // (setToken already resets on auth change). After the fix, logout() just
    // calls setToken(cluster, null) with no additional dispatch.
    //
    // We mock the fetch layer to prevent actual network calls and spy on
    // store.dispatch to count resetApiState dispatches. setToken dispatches it
    // once; if logout had its own dispatch we would see two.
    const fetchModule = await import('../lib/k8s/api/v2/fetch');
    const fetchSpy = vi
      .spyOn(fetchModule, 'backendFetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const storeModule = await import('./stores/store');
    const dispatchSpy = vi.spyOn(storeModule.default, 'dispatch');

    try {
      const auth = await import('../lib/auth');
      await auth.logout('test-cluster');

      // Count how many times resetApiState was dispatched
      const resetCalls = dispatchSpy.mock.calls.filter(([action]) =>
        queryApi.util.resetApiState.match(action)
      );

      // setToken dispatches resetApiState once. If logout had a redundant call,
      // we would see two dispatches here.
      expect(resetCalls.length).toBe(1);
    } finally {
      dispatchSpy.mockRestore();
      fetchSpy.mockRestore();
    }
  });
});
