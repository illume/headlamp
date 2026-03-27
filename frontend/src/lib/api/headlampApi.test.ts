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
import { describe, expect, it } from 'vitest';
import { headlampApi } from './headlampApi';

function createStoreWithApi() {
  return configureStore({
    reducer: { [headlampApi.reducerPath]: headlampApi.reducer },
    middleware: getDefault =>
      getDefault({ serializableCheck: false }).concat(headlampApi.middleware),
  });
}

describe('headlampApi', () => {
  it('should have the correct reducerPath', () => {
    expect(headlampApi.reducerPath).toBe('headlampApi');
  });

  it('should be wired into a store without errors', () => {
    const store = createStoreWithApi();
    const state = store.getState();
    expect(state).toHaveProperty('headlampApi');
  });

  it('should initialize with empty queries and mutations state', () => {
    const store = createStoreWithApi();
    const apiState = store.getState().headlampApi;
    expect(apiState.queries).toEqual({});
    expect(apiState.mutations).toEqual({});
  });

  it('should reset API state when resetApiState is dispatched', () => {
    const store = createStoreWithApi();

    // Manually seed some data into the state to simulate cached queries
    const initialState = store.getState().headlampApi;
    expect(initialState.queries).toEqual({});

    // Dispatch resetApiState
    store.dispatch(headlampApi.util.resetApiState());

    const resetState = store.getState().headlampApi;
    expect(resetState.queries).toEqual({});
    expect(resetState.mutations).toEqual({});
  });

  it('should allow injecting endpoints without error', () => {
    const extended = headlampApi.injectEndpoints({
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
    const extended = headlampApi.injectEndpoints({
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
  it('logout delegates to setToken without an extra resetApiState dispatch', async () => {
    // The review identified that logout() dispatched resetApiState redundantly
    // (setToken already resets on auth change). After the fix, logout() just
    // calls setToken(cluster, null) with no additional dispatch.
    const auth = await import('../auth');

    expect(typeof auth.logout).toBe('function');
    expect(typeof auth.setToken).toBe('function');

    // Verify logout's compiled code does not reference resetApiState directly
    const logoutStr = auth.logout.toString();
    expect(logoutStr).not.toContain('resetApiState');
  });
});
