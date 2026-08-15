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

import { renderHook } from '@testing-library/react';
import { ConfigState } from '../../redux/configSlice';
import { useClustersConf } from './useClustersConf';

const { mockState } = vi.hoisted(() => ({
  mockState: {
    config: {} as ConfigState,
  },
}));

vi.mock('../../redux/hooks', () => ({
  useTypedSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

describe('useClustersConf', () => {
  const cluster = (server: string): NonNullable<ConfigState['allClusters']>[string] => ({
    name: server,
    auth_type: '',
    server,
  });

  beforeEach(() => {
    mockState.config = {
      clusters: {},
      allClusters: {},
      statelessClusters: {},
    } as ConfigState;
  });

  it('memoizes the merged map without cloning cluster values', () => {
    const base = cluster('base');
    const regular = cluster('regular');
    const stateless = cluster('stateless');
    mockState.config = {
      ...mockState.config,
      allClusters: { base, overridden: base },
      clusters: { regular, overridden: regular },
      statelessClusters: { stateless, overridden: stateless },
    };

    const { result, rerender } = renderHook(() => useClustersConf());
    const firstResult = result.current;

    expect(firstResult).toEqual({ base, regular, stateless, overridden: stateless });
    expect(firstResult?.base).toBe(base);
    expect(firstResult?.regular).toBe(regular);
    expect(firstResult?.stateless).toBe(stateless);

    rerender();
    expect(result.current).toBe(firstResult);
  });

  it('updates when cluster values change without changing names', () => {
    mockState.config = {
      ...mockState.config,
      clusters: { cluster: cluster('first') },
    };

    const { result, rerender } = renderHook(() => useClustersConf());
    const firstResult = result.current;

    mockState.config = {
      ...mockState.config,
      clusters: { cluster: cluster('second') },
    };
    rerender();

    expect(result.current).not.toBe(firstResult);
    expect(result.current?.cluster.server).toBe('second');
  });

  it('returns null while clusters are loading', () => {
    mockState.config = {
      ...mockState.config,
      clusters: null,
    };

    const { result } = renderHook(() => useClustersConf());

    expect(result.current).toBeNull();
  });
});
