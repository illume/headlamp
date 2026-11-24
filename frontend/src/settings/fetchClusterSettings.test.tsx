/*
 * Copyright 2026 The Kubernetes Authors
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clusterFetch } from '../lib/k8s/api/v2/fetch';
import adminSettingsReducer, { setAdminSettings } from './adminSettingsSlice';
import { useClusterDefinedSettings } from './fetchClusterSettings';
import { applyAdminSettings, parseAdminSettings } from './parseAdminSettings';

vi.mock('../lib/k8s/api/v2/fetch', () => ({ clusterFetch: vi.fn() }));

const queryClients: QueryClient[] = [];
const response = (data: unknown) =>
  new Response(JSON.stringify({ data: { 'settings.json': JSON.stringify(data) } }));

function renderSettings(clusterDefinedSettings: any = ['prod']) {
  const store = configureStore({
    reducer: {
      adminSettings: adminSettingsReducer,
      config: () => ({ clusters: { prod: {}, dev: {} } }),
    },
    preloadedState: {
      adminSettings: applyAdminSettings(parseAdminSettings({ clusterDefinedSettings })),
    },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClients.push(queryClient);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
  const hook = renderHook(() => useClusterDefinedSettings(), { wrapper });
  return { ...hook, store, queryClient };
}

beforeEach(() => vi.mocked(clusterFetch).mockReset());

afterEach(async () => {
  cleanup();
  for (const client of queryClients.splice(0)) {
    await client.cancelQueries();
    client.clear();
  }
  vi.useRealTimers();
});

describe('cluster settings sources', () => {
  it('fetches declared ConfigMaps with cluster credentials and the conventional namespace', async () => {
    vi.mocked(clusterFetch).mockResolvedValue(response({ timezone: 'UTC' }));
    const { store } = renderSettings();

    await waitFor(() =>
      expect(store.getState().adminSettings.clusterSettings).toEqual({ prod: { timezone: 'UTC' } })
    );
    expect(clusterFetch).toHaveBeenCalledExactlyOnceWith(
      '/api/v1/namespaces/headlamp-tools/configmaps/headlamp-settings',
      { cluster: 'prod', method: 'GET' }
    );
  });

  it('decodes UTF-8 Secret settings', async () => {
    const settings = { plugins: { example: { message: '你好 🌍' } } };
    vi.mocked(clusterFetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { 'settings.json': Buffer.from(JSON.stringify(settings)).toString('base64') },
        })
      )
    );
    const { store } = renderSettings({
      prod: [{ name: 'policy', namespace: 'platform', type: 'Secret' }],
    });

    await waitFor(() =>
      expect(store.getState().adminSettings.clusterSettings).toEqual({ prod: settings })
    );
    expect(clusterFetch).toHaveBeenCalledWith('/api/v1/namespaces/platform/secrets/policy', {
      cluster: 'prod',
      method: 'GET',
    });
  });

  it('merges wildcard sources before cluster-specific sources without modifying another cluster', async () => {
    vi.mocked(clusterFetch).mockImplementation(async url =>
      String(url).endsWith('/specific')
        ? response({ plugins: { example: { endpoint: 'prod', list: [2] } } })
        : response({ plugins: { example: { endpoint: 'shared', keep: true, list: [1] } } })
    );
    const { store } = renderSettings({
      '*': [{ name: 'shared' }],
      prod: [{ name: 'specific' }],
    });

    await waitFor(() =>
      expect(store.getState().adminSettings.clusterSettings).toEqual({
        prod: { plugins: { example: { endpoint: 'prod', keep: true, list: [2] } } },
        dev: { plugins: { example: { endpoint: 'shared', keep: true, list: [1] } } },
      })
    );
  });

  it.each([null, [], ['not-settings'], 'not-settings', 42, true])(
    'ignores non-object JSON (%j) without discarding a valid source',
    async invalid => {
      vi.mocked(clusterFetch)
        .mockResolvedValueOnce(response(invalid))
        .mockResolvedValueOnce(response({ timezone: 'UTC' }));
      const { store } = renderSettings({
        prod: [{ name: 'invalid' }, { name: 'valid' }],
      });

      await waitFor(() =>
        expect(store.getState().adminSettings.clusterSettings).toEqual({
          prod: { timezone: 'UTC' },
        })
      );
    }
  );

  it.each([
    new Response(JSON.stringify({ data: {} })),
    new Response(JSON.stringify({ data: { 'settings.json': '{invalid' } })),
  ])('falls back when a ConfigMap has missing or malformed settings', async invalidResponse => {
    vi.mocked(clusterFetch).mockResolvedValue(invalidResponse);
    const { store, queryClient } = renderSettings();

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(store.getState().adminSettings.clusterSettings).toEqual({});
  });

  it('falls back when Secret data is not base64', async () => {
    vi.mocked(clusterFetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { 'settings.json': '!!!invalid!!!' } }))
    );
    const { store, queryClient } = renderSettings({ prod: [{ name: 'policy', type: 'Secret' }] });

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(store.getState().adminSettings.clusterSettings).toEqual({});
  });

  it('continues to later sources after an RBAC denial', async () => {
    vi.mocked(clusterFetch)
      .mockRejectedValueOnce(new Error('Forbidden'))
      .mockResolvedValueOnce(response({ timezone: 'UTC' }));
    const { store } = renderSettings({
      prod: [{ name: 'forbidden' }, { name: 'allowed' }],
    });

    await waitFor(() =>
      expect(store.getState().adminSettings.clusterSettings).toEqual({ prod: { timezone: 'UTC' } })
    );
  });

  it('polls updates and removes settings when a source is deleted', async () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    });
    vi.mocked(clusterFetch)
      .mockResolvedValueOnce(response({ timezone: 'UTC' }))
      .mockResolvedValueOnce(response({ timezone: 'Asia/Tokyo' }))
      .mockRejectedValueOnce(new Error('Not Found'));
    const { store } = renderSettings();

    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(store.getState().adminSettings.clusterSettings).toEqual({ prod: { timezone: 'UTC' } });
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(store.getState().adminSettings.clusterSettings).toEqual({
      prod: { timezone: 'Asia/Tokyo' },
    });
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(store.getState().adminSettings.clusterSettings).toEqual({});
  });

  it('clears fetched values when sources are removed', async () => {
    vi.mocked(clusterFetch).mockResolvedValue(response({ timezone: 'UTC' }));
    const { store } = renderSettings();

    await waitFor(() =>
      expect(store.getState().adminSettings.clusterSettings).toEqual({ prod: { timezone: 'UTC' } })
    );
    act(() => store.dispatch(setAdminSettings(parseAdminSettings({}))));
    await waitFor(() => expect(store.getState().adminSettings.clusterSettings).toEqual({}));
    expect(clusterFetch).toHaveBeenCalledTimes(1);
  });

  it('does not fetch clusters without configured sources', () => {
    renderSettings([]);
    expect(clusterFetch).not.toHaveBeenCalled();
  });
});
